#!/usr/bin/env python3
"""Build Cambridge 20 jingting: PDF audioscript → sentences → Whisper align → zh JSON.
Usage:
  python scripts/build_cam20_jingting.py --zh
  python scripts/build_cam20_jingting.py --sentences-only
  python scripts/build_cam20_jingting.py --align-only --zh
ponytail: OCR PDF + tiny Whisper; upgrade to base/human QA if timing drifts."""
from __future__ import annotations

import importlib.util
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "library/mock/cambridge-listening"
OUT_DIR = ROOT / "library/practice/jingting/data"
CACHE = ROOT / "scripts/.whisper_cache"
PDF = Path("/Users/frankman/Downloads/剑1-20学术类真题") / "剑雅20 .pdf"
RAW_CACHE = ROOT / "scripts/cam20_scripts_raw.txt"
GOLD_T1P1 = ROOT / "library/practice/jingting/cam20-test1-section1.html"

SPEAKERS = (
    "WOMAN", "MAN", "TAMARA", "DEV", "ROSIE", "COLIN", "MAYA", "FINN",
    "HEATHER", "HAYDEN", "NARRATOR", "SPEAKER",
)


def load_align_mod(model_name: str = "tiny"):
    saved = sys.argv[:]
    sys.argv = ["align_listening_transcript.py", "1", model_name]
    try:
        spec = importlib.util.spec_from_file_location(
            "align_mod", ROOT / "scripts/align_listening_transcript.py"
        )
        mod = importlib.util.module_from_spec(spec)
        src = (ROOT / "scripts/align_listening_transcript.py").read_text()
        src = src.split("\nif __name__")[0]
        exec(compile(src, "align_listening_transcript.py", "exec"), mod.__dict__)
        mod.CACHE = CACHE
        mod.AUDIO_DIR = AUDIO_DIR
        return mod
    finally:
        sys.argv = saved


def load_env():
    env = ROOT / "server" / ".env"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def extract_raw_from_pdf() -> str:
    if RAW_CACHE.exists() and RAW_CACHE.stat().st_size > 10000:
        return RAW_CACHE.read_text()
    from pypdf import PdfReader
    r = PdfReader(str(PDF))
    pages = []
    for i, page in enumerate(r.pages):
        pages.append(f"\n\n===== PAGE {i+1} =====\n{page.extract_text() or ''}")
    full = "".join(pages)
    m = re.search(r"===== PAGE 80 =====\n([\s\S]*?)(?====== PAGE 111 =====)", full)
    if not m:
        raise SystemExit("audioscript pages 80–110 not found in PDF")
    raw = m.group(0)
    RAW_CACHE.write_text(raw)
    return raw


def strip_exam_chrome(text: str) -> str:
    text = re.sub(
        r"Before you hear[\s\S]*?(?:Now listen and answer questions[^\n]*\n?)",
        "\n",
        text,
        flags=re.I,
    )
    text = re.sub(r"Now listen and answer questions[^\n]*\n?", "\n", text, flags=re.I)
    text = re.sub(r"===== PAGE \d+ =====\n?", "\n", text)
    text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.M)
    return text


def normalize_speakers(text: str) -> str:
    names = "|".join(SPEAKERS)
    text = re.sub(rf"\b({names})\s*\n+", r"\1: ", text, flags=re.I)
    text = re.sub(rf"\b({names})\s+(?=[A-Z\"'I])", r"\1: ", text, flags=re.I)
    text = re.sub(rf"\b({names})(?=[A-Z])", r"\1: ", text, flags=re.I)
    return text


def split_sentences(text: str) -> list[str]:
    text = strip_exam_chrome(text)
    text = normalize_speakers(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text).strip()
    names = "|".join(SPEAKERS)
    lines, buf = [], ""
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if re.match(rf"^({names}):", line, re.I) and buf:
            lines.append(buf.strip())
            buf = line
        elif buf and not re.search(r"[.!?…][\"']?$", buf):
            buf = buf + " " + line
        else:
            if buf:
                lines.append(buf.strip())
            buf = line
    if buf:
        lines.append(buf.strip())

    sents = []
    for chunk in lines:
        chunk = chunk.strip()
        if len(chunk) < 2:
            continue
        if re.fullmatch(rf"({names}):?", chunk, re.I):
            continue
        sp = re.match(rf"^((?:{names}):)\s*(.*)$", chunk, re.I | re.S)
        body, prefix = chunk, ""
        if sp:
            prefix = re.sub(rf"^({names}):", lambda m: m.group(1).upper() + ":", sp.group(1), flags=re.I)
            prefix = prefix if prefix.endswith(" ") or prefix.endswith(":") else prefix + " "
            if not prefix.endswith(" "):
                prefix += " "
            body = sp.group(2).strip()
        parts = re.split(r"(?<=[.!?…])\s+(?=[A-Z\"'“])", body) if body else []
        if not parts:
            parts = [body] if body else []
        for i, p in enumerate(parts):
            p = p.strip()
            if not p:
                continue
            sents.append((prefix + p) if i == 0 and prefix else p)

    cleaned = []
    for s in sents:
        s = s.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
        s = re.sub(r"\s+", " ", s).strip()
        if len(s) < 2:
            continue
        if re.search(r"look at questions|answer questions|some time to look", s, re.I):
            continue
        cleaned.append(s)
    return cleaned


def parse_parts(raw: str) -> dict[tuple[int, int], str]:
    parts = {}
    test_starts = [(m.start(), int(m.group(1))) for m in re.finditer(r"(?:^|\n)\s*TEST\s+(\d+)\s*\n", raw)]
    test_starts.append((len(raw), 99))
    for i, (start, test) in enumerate(test_starts[:-1]):
        end = test_starts[i + 1][0]
        block = raw[start:end]
        part_starts = [(m.start(), int(m.group(1))) for m in re.finditer(r"(?:^|\n)\s*PART\s+(\d+)\s*\n", block)]
        part_starts.append((len(block), 99))
        for j, (ps, part) in enumerate(part_starts[:-1]):
            pe = part_starts[j + 1][0]
            body = re.sub(r"^\s*PART\s+\d+\s*\n", "", block[ps:pe], count=1)
            body = re.sub(r"^\s*TEST\s+\d+\s*\n", "", body)
            parts[(test, part)] = body
    return parts


def gold_t1p1_sentences() -> list[str] | None:
    if not GOLD_T1P1.exists():
        return None
    html = GOLD_T1P1.read_text()
    ens = re.findall(r'\{who:"([WM])",en:"((?:\\.|[^"\\])*)"', html)
    if len(ens) < 20:
        return None
    out = []
    for who, en in ens:
        en = en.encode("utf-8").decode("unicode_escape") if "\\" in en else en
        out.append(("WOMAN" if who == "W" else "MAN") + ": " + en)
    return out


def fix_trailing_spans(sentences: list[dict], dur: float) -> list[dict]:
    """When Whisper align collapses the tail to audio end, redistribute into free window."""
    if not sentences:
        return sentences
    sents = [{"en": s.get("text", s.get("en")), "start": float(s["start"]), "end": float(s["end"]),
              **{k: v for k, v in s.items() if k not in ("text", "en", "start", "end")}} for s in sentences]
    last_good = -1
    for i, s in enumerate(sents):
        if s["end"] > s["start"] + 0.05:
            last_good = i
    if last_good < 0 or last_good >= len(sents) - 1:
        return sentences
    # if last_good already eats almost all remaining time, shrink it
    trail = sents[last_good + 1 :]
    if not any(s["end"] <= s["start"] + 0.05 for s in trail):
        return sentences
    words = max(1, len(sents[last_good]["en"].split()))
    est = max(1.0, words * 0.4)
    trail_start = max(float(sents[last_good]["start"]) + est, dur - max(90.0, len(trail) * 1.5))
    if trail_start >= dur - 1:
        trail_start = max(0.0, dur - max(90.0, len(trail) * 1.5))
    sents[last_good]["end"] = round(min(float(sents[last_good]["end"]), trail_start), 2)
    if sents[last_good]["end"] <= sents[last_good]["start"]:
        sents[last_good]["end"] = round(sents[last_good]["start"] + est, 2)
        trail_start = sents[last_good]["end"]
    weights = [max(1, len(s["en"].split())) for s in trail]
    tot = sum(weights) or 1
    cur = trail_start
    for s, w in zip(trail, weights):
        span = (dur - trail_start) * (w / tot)
        s["start"] = round(cur, 2)
        s["end"] = round(cur + max(0.4, span), 2)
        cur += span
    for i in range(1, len(sents)):
        if sents[i]["start"] < sents[i - 1]["end"]:
            sents[i]["start"] = sents[i - 1]["end"]
        if sents[i]["end"] <= sents[i]["start"]:
            sents[i]["end"] = round(min(dur, sents[i]["start"] + 0.5), 2)
    # restore original key shape
    out = []
    for s, orig in zip(sents, sentences):
        o = dict(orig)
        if "text" in o:
            o["text"] = s["en"]
        else:
            o["en"] = s["en"]
        o["start"] = s["start"]
        o["end"] = s["end"]
        out.append(o)
    return out


def write_sentence_files(parts: dict[tuple[int, int], str]):
    # ponytail: don't use over-split gold HTML; PDF split aligns better with Whisper
    for test in range(1, 5):
        obj = {"id": f"cambridge-20-test-{test}", "parts": []}
        for sec in range(1, 5):
            audio = f"ielts20_test{test}_audio{sec}.mp3"
            raw = parts.get((test, sec), "")
            sents = split_sentences(raw)
            print(f"T{test}P{sec}: parsed {len(sents)} sents from {len(raw)} chars")
            obj["parts"].append({
                "section": sec,
                "audio": audio,
                "lines": sents,
                "sentences": sents,
            })
        path = ROOT / f"scripts/cam20_t{test}_sentences.json"
        path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")
        print("wrote", path)


def align_all(model_name: str = "tiny"):
    import whisper

    mod = load_align_mod(model_name)
    need = []
    for test in range(1, 5):
        data = json.loads((ROOT / f"scripts/cam20_t{test}_sentences.json").read_text())
        for part in data["parts"]:
            if not (CACHE / (Path(part["audio"]).stem + ".words.json")).exists():
                need.append(part["audio"])
    model = whisper.load_model(model_name) if need else None
    if need:
        print("loading whisper", model_name, "for", len(need), "audios")

    for test in range(1, 5):
        data = json.loads((ROOT / f"scripts/cam20_t{test}_sentences.json").read_text())
        out_parts = []
        for part in data["parts"]:
            audio = AUDIO_DIR / part["audio"]
            print(f"\n=== T{test}S{part['section']} {audio.name} ===")
            words, _raw = mod.whisper_words(model, audio)
            dur = words[-1]["end"] if words else 0
            print(f"whisper words: {len(words)} dur={dur:.1f}s")
            aligned = mod.align_sentences(part["sentences"], words, audio_dur=dur)
            aligned = fix_trailing_spans(aligned, dur)
            print(f"aligned {len(aligned)} first={aligned[0]['start'] if aligned else None}")
            out_parts.append({"section": part["section"], "audio": part["audio"], "sentences": aligned})
        out = AUDIO_DIR / f"cambridge-20-test-{test}-transcript.json"
        out.write_text(json.dumps({
            "id": f"cambridge-20-test-{test}",
            "source": "audioscript-pdf+whisper-align",
            "parts": out_parts,
        }, ensure_ascii=False, indent=2) + "\n")
        print("wrote", out)


def convert_jingting():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # seed zh from gold HTML for t1p1 where possible
    gold_zh = {}
    if GOLD_T1P1.exists():
        html = GOLD_T1P1.read_text()
        for who, en, zh in re.findall(
            r'\{who:"([WM])",en:"((?:\\.|[^"\\])*)",zh:"((?:\\.|[^"\\])*)"\}', html
        ):
            en2 = en.encode("utf-8").decode("unicode_escape") if "\\" in en else en
            zh2 = zh.encode("utf-8").decode("unicode_escape") if "\\" in zh else zh
            label = "WOMAN" if who == "W" else "MAN"
            gold_zh[f"{label}: {en2}"] = zh2
            gold_zh[en2] = zh2

    for test in range(1, 5):
        tr = json.loads((AUDIO_DIR / f"cambridge-20-test-{test}-transcript.json").read_text())
        for part in tr["parts"]:
            sec = int(part["section"])
            pid = f"cam20-t{test}-p{sec}"
            path = OUT_DIR / f"{pid}.json"
            obj = {
                "id": pid,
                "title": f"剑20 Test {test} Part {sec}",
                "audioUrl": f"library/mock/cambridge-listening/{part['audio']}",
                "examHref": f"library/mock/cambridge-listening/cambridge-20-test-{test}.html",
                "sentences": [],
            }
            old_zh = {}
            if path.exists():
                old = json.loads(path.read_text())
                old_zh = {s["en"]: s.get("zh", "") for s in old.get("sentences", [])}
            for s in part["sentences"]:
                en = s["text"]
                zh = old_zh.get(en) or gold_zh.get(en) or ""
                obj["sentences"].append({
                    "en": en,
                    "zh": zh,
                    "start": float(s["start"]),
                    "end": float(s["end"]),
                })
            path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")
            print(f"wrote {path.name} ({len(obj['sentences'])})")


def qwen_translate_batch(sentences: list[str]) -> list[str]:
    key = os.environ.get("DASHSCOPE_API_KEY") or ""
    if not key:
        raise SystemExit("DASHSCOPE_API_KEY missing")
    model = os.environ.get("DASHSCOPE_MODEL") or "qwen-plus"
    numbered = "\n".join(f"{i+1}. {s}" for i, s in enumerate(sentences))
    body = {
        "model": model,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是雅思听力原文译者。把每句英译中，保留说话人标签（如 WOMAN:/MAN:/TAMARA:）不译。"
                    "只输出 JSON 数组，长度与输入句数相同，元素为中文字符串，不要其它文字。"
                ),
            },
            {"role": "user", "content": numbered},
        ],
    }
    req = urllib.request.Request(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        raw = json.loads(resp.read().decode())
    text = raw["choices"][0]["message"]["content"].strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    arr = json.loads(text)
    if len(arr) != len(sentences):
        raise ValueError(f"length {len(arr)} != {len(sentences)}")
    return [str(x) for x in arr]


def fill_zh(batch_size: int = 20):
    load_env()
    for path in sorted(OUT_DIR.glob("cam20-t*-p*.json")):
        obj = json.loads(path.read_text())
        sents = obj["sentences"]
        missing = [i for i, s in enumerate(sents) if not (s.get("zh") or "").strip()]
        if not missing:
            print(f"{path.name}: zh ok")
            continue
        print(f"{path.name}: translating {len(missing)}…")
        for off in range(0, len(missing), batch_size):
            idxs = missing[off : off + batch_size]
            ens = [sents[i]["en"] for i in idxs]
            try:
                zhs = qwen_translate_batch(ens)
            except Exception as e:
                print("  retry", e)
                time.sleep(2)
                zhs = qwen_translate_batch(ens)
            for i, zh in zip(idxs, zhs):
                sents[i]["zh"] = zh
            path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")
            print(f"  filled {idxs[0]+1}–{idxs[-1]+1}")
            time.sleep(0.35)


def update_manifest():
    man_path = ROOT / "library/manifest.json"
    man = json.loads(man_path.read_text())
    items = man.get("items") or man["exams"]
    items = [
        it for it in items
        if not (
            it.get("subject") == "jingting"
            and (
                str(it.get("id", "")).startswith("cam20-t")
                or it.get("id") == "cam20-test1-section1"
            )
        )
    ]
    new = []
    for t in range(1, 5):
        for p in range(1, 5):
            pid = f"cam20-t{t}-p{p}"
            new.append({
                "id": pid,
                "file": f"practice/jingting/data/{pid}.json",
                "directHref": f"jingting-player.html?id={pid}",
                "title": f"听力精听：剑20 Test {t} Part {p}",
                "zone": "mock",
                "subject": "jingting",
                "duration": 0,
                "description": "全文/逐句精听 + AI 跟读：真音频、句子时间轴、隐文/译文、倍速与单句循环。",
                "added": "2026-07-23",
            })
    last = -1
    for i, it in enumerate(items):
        if str(it.get("id", "")).startswith("cam21-t"):
            last = i
    if last < 0:
        items.extend(new)
    else:
        items = items[: last + 1] + new + items[last + 1 :]
    if "items" in man:
        man["items"] = items
    else:
        man["exams"] = items
    man_path.write_text(json.dumps(man, ensure_ascii=False, indent=2) + "\n")
    print("manifest jingting", sum(1 for it in items if it.get("subject") == "jingting"))


def main():
    args = set(sys.argv[1:])
    if "--align-only" not in args:
        # prefer already-extracted raw if present from earlier probe
        if not RAW_CACHE.exists() or RAW_CACHE.stat().st_size < 10000:
            # seed from /tmp if available
            tmp = Path("/tmp/cam20_scripts_raw.txt")
            if tmp.exists() and tmp.stat().st_size > 10000:
                RAW_CACHE.write_text(tmp.read_text())
        raw = extract_raw_from_pdf()
        parts = parse_parts(raw)
        print("parsed part keys", sorted(parts.keys()))
        write_sentence_files(parts)
        if "--sentences-only" in args:
            return
    align_all("tiny")
    convert_jingting()
    update_manifest()
    if "--zh" in args:
        fill_zh()


if __name__ == "__main__":
    main()
