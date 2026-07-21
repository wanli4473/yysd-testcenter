#!/usr/bin/env python3
"""Align official IELTS audioscript sentences to MP3 via Whisper word timestamps.
Usage: python scripts/align_listening_transcript.py [test] [model]
  test: 1-4 (default 1); model: whisper size (default tiny)
ponytail: strict sequential token align + linear fill; upgrade to WhisperX if needed."""
import json, re, sys
from pathlib import Path

import whisper

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "library/mock/cambridge-listening"
CACHE = ROOT / "scripts/.whisper_cache"

# argv: [test] [model]  — also accept legacy: python align.py tiny  (test=1)
_args = sys.argv[1:]
if _args and _args[0].isdigit():
    TEST = int(_args[0])
    MODEL = _args[1] if len(_args) > 1 else "tiny"
elif _args:
    TEST = 1
    MODEL = _args[0]
else:
    TEST = 1
    MODEL = "tiny"

SCRIPTS = ROOT / f"scripts/cam21_t{TEST}_sentences.json"
OUT = AUDIO_DIR / f"cambridge-21-test-{TEST}-transcript.json"
TEST_ID = f"cambridge-21-test-{TEST}"


def tok(s):
    return re.findall(r"[a-z0-9']+", s.lower().replace("£", " ").replace("–", " ").replace("—", " "))


def align_sentences(sentences, words, audio_dur=None):
    skip = {"woman", "man", "phil", "lucy"}
    script_tokens = []
    for si, sent in enumerate(sentences):
        for t in tok(sent):
            if t not in skip:
                script_tokens.append((si, t))

    if not script_tokens or not words:
        return [{"text": s, "start": 0.0, "end": 1.0} for s in sentences]

    dur = float(audio_dur if audio_dur is not None else words[-1]["end"])

    # skip exam preamble: find first content token
    first = script_tokens[0][1]
    wi0 = next((j for j, w in enumerate(words) if w["w"] == first), 0)

    # strict sequential: exact token match, whisper may insert extras
    matched = [None] * len(script_tokens)
    wi = wi0
    for i, (_, st) in enumerate(script_tokens):
        hit = None
        # search ahead; longer words get wider window
        window = 40 if len(st) >= 4 else 18
        limit = min(len(words), wi + window)
        for j in range(wi, limit):
            if words[j]["w"] == st:
                hit = j
                break
        if hit is None and len(st) >= 5:
            # one soft pass for plural/stem noise
            for j in range(wi, min(len(words), wi + 60)):
                ww = words[j]["w"]
                if ww.startswith(st) or st.startswith(ww):
                    hit = j
                    break
        matched[i] = hit
        if hit is not None:
            wi = hit + 1

    spans = {i: [None, None] for i in range(len(sentences))}
    for (si, _), widx in zip(script_tokens, matched):
        if widx is None:
            continue
        if spans[si][0] is None:
            spans[si][0] = widx
        spans[si][1] = widx

    # coverage: require >=40% of tokens matched else treat as unmatched
    counts = {i: [0, 0] for i in range(len(sentences))}  # matched, total
    for (si, _), widx in zip(script_tokens, matched):
        counts[si][1] += 1
        if widx is not None:
            counts[si][0] += 1
    for i in list(spans):
        m, t = counts[i]
        if t and m / t < 0.4:
            spans[i] = [None, None]

    out = []
    for i, sent in enumerate(sentences):
        a, b = spans[i]
        if a is not None and b is not None:
            out.append(
                {
                    "text": sent,
                    "start": round(words[a]["start"], 2),
                    "end": round(min(words[b]["end"], dur), 2),
                    "_hit": True,
                }
            )
        else:
            out.append({"text": sent, "start": None, "end": None, "_hit": False})

    # linear fill unmatched runs between anchored sentences
    n = len(out)
    i = 0
    while i < n:
        if out[i]["_hit"]:
            i += 1
            continue
        j = i
        while j < n and not out[j]["_hit"]:
            j += 1
        t0 = out[i - 1]["end"] if i > 0 and out[i - 1]["end"] is not None else (words[wi0]["start"] if words else 0.0)
        t1 = out[j]["start"] if j < n and out[j]["start"] is not None else dur
        if t1 <= t0:
            t1 = min(dur, t0 + (j - i) * 1.5)
        weights = [max(1, len(tok(out[k]["text"]))) for k in range(i, j)]
        total_w = sum(weights) or 1
        cursor = t0
        for k, w in zip(range(i, j), weights):
            span = (t1 - t0) * (w / total_w)
            out[k]["start"] = round(cursor, 2)
            out[k]["end"] = round(cursor + span, 2)
            cursor += span
        i = j

    for s in out:
        s["start"] = round(max(0.0, min(float(s["start"]), dur - 0.05)), 2)
        s["end"] = round(max(s["start"] + 0.2, min(float(s["end"]), dur)), 2)
        s.pop("_hit", None)

    for i in range(1, n):
        if out[i]["start"] < out[i - 1]["start"]:
            out[i]["start"] = out[i - 1]["end"]
        if out[i - 1]["end"] > out[i]["start"]:
            out[i - 1]["end"] = out[i]["start"]
        if out[i]["end"] <= out[i]["start"]:
            out[i]["end"] = round(min(dur, out[i]["start"] + 0.8), 2)
    return out


def whisper_words(model, audio_path):
    CACHE.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE / (audio_path.stem + ".words.json")
    if cache_file.exists():
        data = json.loads(cache_file.read_text())
        return data["words"], data.get("text", "")

    result = model.transcribe(str(audio_path), word_timestamps=True, language="en", verbose=False)
    words = []
    for seg in result.get("segments") or []:
        for w in seg.get("words") or []:
            t = tok(w.get("word") or "")
            if not t:
                continue
            words.append({"w": t[0], "start": float(w["start"]), "end": float(w["end"])})
    text = result.get("text", "")
    cache_file.write_text(json.dumps({"words": words, "text": text}, ensure_ascii=False))
    return words, text


def main():
    if not SCRIPTS.exists():
        sys.exit(f"missing sentences file: {SCRIPTS}")
    data = json.loads(SCRIPTS.read_text())
    # prefer cache; only load model if any missing
    need_model = any(not (CACHE / Path(p["audio"]).stem).with_suffix(".words.json").exists() for p in data["parts"])
    model = whisper.load_model(MODEL) if need_model else None
    if need_model:
        print("loading model", MODEL)
    out_parts = []
    for part in data["parts"]:
        audio = AUDIO_DIR / part["audio"]
        print(f"\n=== Section {part['section']} {audio.name} ===")
        words, raw = whisper_words(model, audio)
        dur = words[-1]["end"] if words else 0
        print(f"whisper words: {len(words)} dur={dur:.1f}s")
        sents = part.get("sentences") or part["lines"]
        aligned = align_sentences(sents, words, audio_dur=dur)
        over = sum(1 for s in aligned if s["end"] > dur + 0.2)
        print(f"aligned {len(aligned)} over={over}")
        if aligned:
            print(" first:", aligned[0]["start"], aligned[0]["text"][:60])
            print(" last:", aligned[-1]["start"], aligned[-1]["text"][:60])
        out_parts.append({"section": part["section"], "audio": part["audio"], "sentences": aligned})
    OUT.write_text(
        json.dumps(
            {"id": TEST_ID, "source": "official-audioscript+whisper-align", "parts": out_parts},
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    print("wrote", OUT)


if __name__ == "__main__":
    main()
