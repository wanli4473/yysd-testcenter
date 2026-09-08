#!/usr/bin/env python3
"""Build listening transcript sidecars + zh.
  20/21: copy jingting zh onto official-aligned JSON
  16/17: official PDF audioscript → align to whisper segments
  5–15, 18–19: timed whisper segments (PDF scans have no text layer)
Usage:
  python scripts/build_listen_sidecars.py
  python scripts/build_listen_sidecars.py --zh
ponytail: segment fallback until a text-layer PDF exists; then rerun official align."""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "library/mock/cambridge-listening"
JINGTING = ROOT / "library/practice/jingting/data"
CACHE = ROOT / "scripts/.whisper_cache"
PDF_DIR = Path("/Users/frankman/Downloads/剑1-20学术类真题")
AUDIO_RE = re.compile(r"""(?:["']audio["']|audio)\s*:\s*['"]([^'"]+\.(?:mp3|m4a))['"]""", re.I)
CHROME = re.compile(
    r"(this is the ielts|published by cambridge|this recording is copyright|"
    r"you will hear a number of different recordings|the test is in four|"
    r"you will be given ten minutes|now turn to part|first,? you have some time|"
    r"now listen (carefully and )?answer|that is the end of part|"
    r"you now have (one|half) minute|before you hear the rest|"
    r"you will have a chance to check|all the recordings will be played)",
    re.I,
)


def load_env():
    env = ROOT / "server" / ".env"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def paper_audios(vol: int, test: int) -> list[str]:
    html = (AUDIO_DIR / f"cambridge-{vol}-test-{test}.html").read_text()
    i = html.find("TEST")
    chunk = html[i:] if i >= 0 else html
    out = []
    for f in AUDIO_RE.findall(chunk):
        if f not in out:
            out.append(f)
        if len(out) == 4:
            break
    return out


def load_segments(audio: str) -> list[dict]:
    p = CACHE / (audio + ".segments.json")
    if not p.exists():
        return []
    return json.loads(p.read_text()).get("segments") or []


def tok(s: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", s.lower().replace("£", " "))


def words_from_segments(segments: list[dict]) -> list[dict]:
    words = []
    for seg in segments:
        ts = tok(seg.get("text") or "")
        if not ts:
            continue
        a, b = float(seg["start"]), float(seg["end"])
        step = max(0.05, (b - a) / len(ts))
        for i, w in enumerate(ts):
            words.append({"w": w, "start": a + i * step, "end": a + (i + 1) * step})
    return words


def load_align():
    import importlib.util

    spec = importlib.util.spec_from_file_location("align_mod", ROOT / "scripts/align_listening_transcript.py")
    mod = importlib.util.module_from_spec(spec)
    src = (ROOT / "scripts/align_listening_transcript.py").read_text().split("\nif __name__")[0]
    saved = sys.argv[:]
    sys.argv = ["align_listening_transcript.py", "1", "tiny"]
    try:
        exec(compile(src, "align_listening_transcript.py", "exec"), mod.__dict__)
    finally:
        sys.argv = saved
    return mod


def segment_sentences(audio: str) -> list[dict]:
    out = []
    for seg in load_segments(audio):
        text = re.sub(r"\s+", " ", (seg.get("text") or "")).strip()
        if len(text) < 2 or CHROME.search(text):
            continue
        out.append({
            "text": text,
            "start": round(float(seg["start"]), 2),
            "end": round(float(seg["end"]), 2),
            "zh": "",
        })
    return out


def merge_zh_from_jingting(vol: int):
    prefix = f"cam{vol}-t"
    by_en = {}
    for path in sorted(JINGTING.glob(f"{prefix}*-p*.json")):
        obj = json.loads(path.read_text())
        for s in obj.get("sentences") or []:
            en = (s.get("en") or "").strip()
            zh = (s.get("zh") or "").strip()
            if en and zh:
                by_en[en] = zh
    n = 0
    for test in range(1, 5):
        path = AUDIO_DIR / f"cambridge-{vol}-test-{test}-transcript.json"
        if not path.exists():
            continue
        data = json.loads(path.read_text())
        for part in data.get("parts") or []:
            for s in part.get("sentences") or []:
                zh = by_en.get((s.get("text") or "").strip())
                if zh:
                    s["zh"] = zh
                    n += 1
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"cam{vol}: copied {n} zh from jingting")


def repair_times(sents: list[dict]) -> None:
    for i, s in enumerate(sents):
        a, b = float(s["start"]), float(s["end"])
        if b <= a:
            nxt = float(sents[i + 1]["start"]) if i + 1 < len(sents) else a + 0.25
            s["end"] = round(max(a + 0.05, min(a + 0.25, nxt)), 2)


def write_sidecar(vol: int, test: int, parts: list[dict], source: str):
    path = AUDIO_DIR / f"cambridge-{vol}-test-{test}-transcript.json"
    old_zh = {}
    if path.exists():
        old = json.loads(path.read_text())
        for part in old.get("parts") or []:
            for s in part.get("sentences") or []:
                if s.get("zh") and s.get("text"):
                    old_zh[s["text"]] = s["zh"]
    for part in parts:
        repair_times(part.get("sentences") or [])
        for s in part.get("sentences") or []:
            if not s.get("zh"):
                s["zh"] = old_zh.get(s.get("text") or "", "")
    path.write_text(json.dumps(
        {"id": f"cambridge-{vol}-test-{test}", "source": source, "parts": parts},
        ensure_ascii=False, indent=2,
    ) + "\n")
    print("wrote", path.name, "parts", len(parts), "sents", sum(len(p["sentences"]) for p in parts))


def build_from_segments(vol: int):
    for test in range(1, 5):
        audios = paper_audios(vol, test)
        if len(audios) != 4:
            print("skip audio count", vol, test, audios)
            continue
        parts = []
        for i, audio in enumerate(audios, 1):
            parts.append({"section": i, "audio": audio, "sentences": segment_sentences(audio)})
        write_sidecar(vol, test, parts, "whisper-segments")


def repair_pdf_text(t: str) -> str:
    lines = [ln.strip() for ln in t.splitlines() if ln.strip()]
    if lines and sum(1 for ln in lines if len(ln) <= 2) / len(lines) > 0.45:
        return " ".join(lines)
    return "\n".join(lines)


def split_official(text: str) -> list[str]:
    text = re.sub(r"Before you hear[\s\S]*?(?:Now listen[^\n]*\n?)", "\n", text, flags=re.I)
    text = re.sub(r"Now listen and answer[^\n]*\n?", "\n", text, flags=re.I)
    text = re.sub(r"\bQ\s*\d+\b", " ", text)
    text = re.sub(r"(?m)^\s*\d+\s*$", "", text)
    text = re.sub(r"\n{2,}", "\n", text)
    sents = []
    buf = ""
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if re.match(r"^[A-Za-z][A-Za-z'’.\- ]{0,20}:\s*", line) and buf:
            sents.append(buf.strip())
            buf = line
        elif buf and not re.search(r"[.!?…][\"']?$", buf):
            buf = buf + " " + line
        else:
            if buf:
                sents.append(buf.strip())
            buf = line
    if buf:
        sents.append(buf.strip())
    out = []
    for chunk in sents:
        chunk = re.sub(r"\s+", " ", chunk).replace("\u2019", "'").strip()
        if len(chunk) < 3 or CHROME.search(chunk):
            continue
        parts = re.split(r"(?<=[.!?…])\s+(?=[A-Z\"'“])", chunk)
        for p in parts:
            p = p.strip()
            if len(p) >= 3:
                out.append(p)
    return out


def extract_pdf_parts(vol: int) -> dict[tuple[int, int], str]:
    name = f"剑桥雅思{vol}.pdf"
    pdf = PDF_DIR / name
    if not pdf.exists():
        return {}
    from pypdf import PdfReader
    r = PdfReader(str(pdf))
    pages = []
    started = False
    for i, page in enumerate(r.pages):
        t = repair_pdf_text(page.extract_text() or "")
        if not started and re.search(r"audioscripts", t, re.I):
            started = True
        if started:
            pages.append(t)
    raw = "\n".join(pages)
    if len(raw) < 2000:
        return {}
    parts = {}
    tests = [(m.start(), int(m.group(1))) for m in re.finditer(r"(?:^|\n)\s*TEST\s+(\d+)", raw, re.I)]
    tests.append((len(raw), 99))
    for i, (start, test) in enumerate(tests[:-1]):
        block = raw[start:tests[i + 1][0]]
        secs = [(m.start(), int(m.group(1))) for m in re.finditer(r"(?:^|\n)\s*PART\s+(\d+)", block, re.I)]
        secs.append((len(block), 99))
        for j, (ps, part) in enumerate(secs[:-1]):
            body = re.sub(r"^\s*PART\s+\d+\s*", "", block[ps:secs[j + 1][0]], count=1, flags=re.I)
            body = re.sub(r"^\s*TEST\s+\d+\s*", "", body, flags=re.I)
            parts[(test, part)] = body
    return parts


def build_official(vol: int, align_mod) -> bool:
    gold = extract_pdf_parts(vol)
    if len(gold) < 8:
        print(f"cam{vol}: official parts {len(gold)} — skip")
        return False
    for test in range(1, 5):
        audios = paper_audios(vol, test)
        if len(audios) != 4:
            continue
        parts = []
        for sec, audio in enumerate(audios, 1):
            sents = split_official(gold.get((test, sec), ""))
            words = words_from_segments(load_segments(audio))
            if sents and words:
                aligned = align_mod.align_sentences(sents, words, words[-1]["end"] if words else None)
                for s in aligned:
                    s["zh"] = ""
            else:
                aligned = segment_sentences(audio)
            parts.append({"section": sec, "audio": audio, "sentences": aligned})
        write_sidecar(vol, test, parts, "official-audioscript+segment-align")
    return True


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
                    "你是雅思听力原文译者。把每句英译中，保留说话人标签（如 WOMAN:/MAN:）不译。"
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
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = json.loads(resp.read().decode())
    text = raw["choices"][0]["message"]["content"].strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    arr = json.loads(text)
    if len(arr) != len(sentences):
        raise ValueError(f"translate length mismatch {len(arr)} != {len(sentences)}")
    return [str(x) for x in arr]


def translate_safe(ens: list[str]) -> list[str]:
    if not ens:
        return []
    try:
        return qwen_translate_batch(ens)
    except Exception as e:
        print("  batch fail", e, "split" if len(ens) > 1 else "skip")
        time.sleep(1)
        if len(ens) == 1:
            return [""]
        mid = len(ens) // 2
        return translate_safe(ens[:mid]) + translate_safe(ens[mid:])


def fill_zh(vols: list[int], batch_size: int = 40):
    load_env()
    for vol in vols:
        for test in range(1, 5):
            path = AUDIO_DIR / f"cambridge-{vol}-test-{test}-transcript.json"
            if not path.exists():
                continue
            data = json.loads(path.read_text())
            missing = []
            for pi, part in enumerate(data.get("parts") or []):
                for si, s in enumerate(part.get("sentences") or []):
                    if not (s.get("zh") or "").strip():
                        missing.append((pi, si, s.get("text") or s.get("en") or ""))
            if not missing:
                print(f"{path.name}: zh ok")
                continue
            print(f"{path.name}: translating {len(missing)}…")
            for off in range(0, len(missing), batch_size):
                chunk = missing[off:off + batch_size]
                ens = [c[2] for c in chunk]
                zhs = translate_safe(ens)
                for (pi, si, _), zh in zip(chunk, zhs):
                    data["parts"][pi]["sentences"][si]["zh"] = zh
                path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
                print(f"  filled {off+1}–{off+len(chunk)}")
                time.sleep(0.35)


def main():
    do_zh = "--zh" in sys.argv
    zh_only = "--zh-only" in sys.argv
    if not zh_only:
        merge_zh_from_jingting(20)
        merge_zh_from_jingting(21)
        align_mod = load_align()
        official = set()
        # ponytail: C16 PDF is char-per-line + answer-key bleed; segments win
        if build_official(17, align_mod):
            official.add(17)
        for vol in range(19, 4, -1):
            if vol in official or vol in (20, 21):
                continue
            build_from_segments(vol)
    if do_zh or zh_only:
        fill_zh(list(range(5, 22)))


if __name__ == "__main__":
    main()
