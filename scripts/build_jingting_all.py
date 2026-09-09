#!/usr/bin/env python3
"""Build jingting JSON from official Cambridge audioscripts.
  python scripts/build_jingting_all.py              # convert official transcripts already on disk
  python scripts/build_jingting_all.py --extract 16 17 21
  python scripts/build_jingting_all.py --ocr 5
  python scripts/build_jingting_all.py --zh
ponytail: Whisper only for timing; student text must come from PDF audioscripts."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "library/mock/cambridge-listening"
OUT_DIR = ROOT / "library/practice/jingting/data"
CACHE = ROOT / "scripts/.whisper_cache"
OCR_DIR = ROOT / "scripts/.ocr_cache"
PDF_DIR = Path("/Users/frankman/Desktop/剑1-21学术类真题")
OCR_BIN = ROOT / "scripts/ocr_page"

sys.path.insert(0, str(ROOT / "scripts"))
import build_listen_sidecars as side  # noqa: E402

side.AUDIO_DIR = AUDIO_DIR
side.JINGTING = OUT_DIR
side.CACHE = CACHE
side.PDF_DIR = PDF_DIR

PDF_NAMES = {
    14: "剑桥真题14.pdf",
    20: "剑20.pdf",
    21: "剑桥雅思21（A类）.pdf",
}


def load_env():
    side.load_env()


def pdf_path(vol: int) -> Path:
    name = PDF_NAMES.get(vol, f"剑桥雅思{vol}.pdf")
    p = PDF_DIR / name
    if not p.exists():
        raise SystemExit(f"missing PDF {p}")
    return p


def paper_audios(vol: int, test: int) -> list[str]:
    return side.paper_audios(vol, test)


def official_source(src: str) -> bool:
    s = (src or "").lower()
    return "official" in s or "audioscript" in s


def extract_script_pages(vol: int) -> str:
    import fitz

    doc = fitz.open(pdf_path(vol))
    pages = []
    started = False
    for i, page in enumerate(doc):
        t = page.get_text() or ""
        head = t[:80]
        if re.search(r"audioscripts", head, re.I) and len(t) > 800:
            started = True
        if started:
            if re.search(r"listening and reading answer keys", t, re.I) and i > 0:
                break
            pages.append(t)
    doc.close()
    raw = "\n".join(pages)
    raw = re.sub(r"更多雅思[^\n]*", "\n", raw)
    raw = re.sub(r"@IELTS\w+", "\n", raw)
    return raw


def preprocess_script(raw: str) -> str:
    """Drop running headers like 'Test 2'; fill bare 'TEST' before PART."""
    lines = []
    last = 0
    seen_header = set()
    for line in raw.splitlines():
        hm = re.match(r"Test\s+([1-4])\s*$", line.strip())
        if hm:
            n = int(hm.group(1))
            if n not in seen_header:
                seen_header.add(n)
                last = n
                lines.append(f"TEST {n}")
            continue
        m = re.match(r"\s*TEST\s+(\d+)\s*$", line)
        if m:
            n = int(m.group(1))
            if n > 4:
                continue
            last = n
            lines.append(f"TEST {n}")
            continue
        if re.match(r"\s*TEST\s*$", line):
            if last >= 4:
                continue
            last = last + 1 if last else 1
            lines.append(f"TEST {last}")
            continue
        lines.append(line)
    return "\n".join(lines)


def parse_parts(raw: str) -> dict[tuple[int, int], str]:
    parts: dict[tuple[int, int], str] = {}
    raw = preprocess_script(raw)
    first_part = re.search(r"(?:^|\n)\s*(?:PART|SECTION)\s+[1-4]\b", raw)
    first_test = re.search(r"(?:^|\n)\s*TEST\s+\d+\b", raw)
    if first_part and (not first_test or first_part.start() < first_test.start()):
        raw = "TEST 1\n" + raw
    tests = [(m.start(), int(m.group(1))) for m in re.finditer(
        r"(?:^|\n)\s*TEST\s+(\d+)\b", raw)]
    if not tests:
        return parts
    tests.append((len(raw), 99))
    for i, (start, test) in enumerate(tests[:-1]):
        block = raw[start:tests[i + 1][0]]
        secs = [(m.start(), int(m.group(1))) for m in re.finditer(
            r"(?:^|\n)\s*(?:PART|SECTION)\s+(\d+)\b", block)]
        secs.append((len(block), 99))
        for j, (ps, part) in enumerate(secs[:-1]):
            if part < 1 or part > 4:
                continue
            body = re.sub(r"^\s*(?:PART|SECTION)\s+\d+\s*", "", block[ps:secs[j + 1][0]], count=1)
            body = re.sub(r"^\s*TEST\s+\d+\s*", "", body)
            parts[(test, part)] = body
        # fill a missing middle section from the gap between neighbors
        for part in range(1, 5):
            if (test, part) in parts:
                continue
            prev = next((p for p in range(part - 1, 0, -1) if (test, p) in parts), None)
            nxt = next((p for p in range(part + 1, 5) if (test, p) in parts), None)
            if prev and nxt:
                # ponytail: OCR often drops a SECTION header; steal nothing, leave empty
                pass
        if (test, 1) not in parts:
            pre = re.split(r"(?:^|\n)\s*(?:PART|SECTION)\s+[2-4]\b", block, maxsplit=1)[0]
            pre = re.sub(r"^\s*TEST\s+\d+\s*", "", pre).strip()
            if len(pre) > 80:
                parts[(test, 1)] = pre
        if (test, 3) not in parts and (test, 2) in parts and (test, 4) in parts:
            # text of part 4 start is already split; cannot recover gap here
            pass
    return parts


def ensure_ocr_bin():
    if OCR_BIN.exists():
        return
    src = ROOT / "scripts/ocr_page.swift"
    subprocess.check_call(["swiftc", "-O", "-o", str(OCR_BIN), str(src)])


def ocr_image(png: Path) -> str:
    ensure_ocr_bin()
    out = subprocess.check_output([str(OCR_BIN), str(png)], stderr=subprocess.DEVNULL)
    return out.decode("utf-8", "ignore")


def extract_ocr_pages(vol: int, last_n: int = 80) -> str:
    import fitz

    OCR_DIR.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path(vol))
    start = max(0, doc.page_count - last_n)
    chunks = []
    started = False
    last_sec = None
    filled_gap = False
    for i in range(start, doc.page_count):
        cache = OCR_DIR / f"cam{vol}-p{i+1:03d}.txt"
        if cache.exists() and cache.stat().st_size > 20:
            text = cache.read_text()
        else:
            pix = doc[i].get_pixmap(matrix=fitz.Matrix(2, 2))
            png = OCR_DIR / f"cam{vol}-p{i+1:03d}.png"
            pix.save(str(png))
            text = ocr_image(png)
            cache.write_text(text)
            print(f"  ocr cam{vol} p{i+1}/{doc.page_count} {len(text)} chars")
        if not started and len(text) > 200 and (
            re.search(r"audioscripts|tapescripts", text, re.I)
            or re.search(r"(?:^|\n)\s*TEST\s+1\s*\n\s*(?:SECTION|PART)\s+1\b", text)
        ):
            started = True
        if started and re.search(
            r"listening and reading answer keys|sample writing answers|ielts listening answer sheet|\nTEST\s+[5-9]\b",
            text,
            re.I,
        ):
            if chunks:
                break
        if started:
            sec_m = re.search(r"(?:^|\n)\s*(?:PART|SECTION)\s+([1-4])\b", text)
            if sec_m:
                last_sec = int(sec_m.group(1))
                if last_sec != 2:
                    filled_gap = False
            elif last_sec == 2 and not filled_gap:
                text = "SECTION 3\n" + text
                last_sec = 3
                filled_gap = True
            chunks.append(text)
    doc.close()
    return "\n".join(chunks)


def write_official_transcripts(vol: int, gold: dict[tuple[int, int], str], source: str) -> bool:
    align_mod = side.load_align()
    ok = True
    for test in range(1, 5):
        audios = paper_audios(vol, test)
        if len(audios) != 4:
            print("skip audio count", vol, test, audios)
            ok = False
            continue
        parts = []
        for sec, audio in enumerate(audios, 1):
            sents = side.split_official(gold.get((test, sec), ""))
            words = side.words_from_segments(side.load_segments(audio))
            if not sents:
                print(f"  cam{vol} t{test}p{sec}: 0 official sents")
                ok = False
                aligned = []
            elif words:
                aligned = align_mod.align_sentences(sents, words, words[-1]["end"] if words else None)
                for s in aligned:
                    s["zh"] = s.get("zh") or ""
            else:
                print(f"  cam{vol} t{test}p{sec}: no whisper cache")
                ok = False
                aligned = [{"text": s, "start": 0.0, "end": 1.0, "zh": ""} for s in sents]
            parts.append({"section": sec, "audio": audio, "sentences": aligned})
        side.write_sidecar(vol, test, parts, source)
    return ok


def convert_vol(vol: int) -> int:
    n = 0
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for test in range(1, 5):
        path = AUDIO_DIR / f"cambridge-{vol}-test-{test}-transcript.json"
        if not path.exists():
            continue
        data = json.loads(path.read_text())
        if not official_source(data.get("source") or ""):
            print(f"skip whisper-only {path.name}")
            continue
        for part in data.get("parts") or []:
            sec = int(part["section"])
            pid = f"cam{vol}-t{test}-p{sec}"
            dest = OUT_DIR / f"{pid}.json"
            old_zh = {}
            if dest.exists():
                old = json.loads(dest.read_text())
                old_zh = {s["en"]: s.get("zh", "") for s in old.get("sentences") or []}
            obj = {
                "id": pid,
                "title": f"剑{vol} Test {test} Part {sec}",
                "audioUrl": f"library/mock/cambridge-listening/{part['audio']}",
                "examHref": f"library/mock/cambridge-listening/cambridge-{vol}-test-{test}.html",
                "sentences": [],
            }
            for s in part.get("sentences") or []:
                en = s.get("text") or s.get("en") or ""
                obj["sentences"].append({
                    "en": en,
                    "zh": (s.get("zh") or old_zh.get(en) or "").strip(),
                    "start": float(s["start"]),
                    "end": float(s["end"]),
                })
            if len(obj["sentences"]) < 8:
                print(f"skip thin {dest.name} ({len(obj['sentences'])} sents)")
                if dest.exists() and not official_source((json.loads(dest.read_text()) or {}).get("id") or "x"):
                    pass
                continue
            dest.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")
            n += 1
            print(f"wrote {dest.name} ({len(obj['sentences'])} sents)")
    return n


def fill_zh(vols: list[int], batch_size: int = 40):
    load_env()
    for vol in vols:
        for path in sorted(OUT_DIR.glob(f"cam{vol}-t*-p*.json")):
            obj = json.loads(path.read_text())
            missing = [i for i, s in enumerate(obj["sentences"]) if not (s.get("zh") or "").strip()]
            if not missing:
                print(f"{path.name}: zh ok")
                continue
            print(f"{path.name}: translating {len(missing)}…")
            for off in range(0, len(missing), batch_size):
                idxs = missing[off:off + batch_size]
                ens = [obj["sentences"][i]["en"] for i in idxs]
                zhs = side.translate_safe(ens)
                for i, zh in zip(idxs, zhs):
                    obj["sentences"][i]["zh"] = zh
                path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")
                print(f"  filled {idxs[0]+1}–{idxs[-1]+1}")
                time.sleep(0.35)


def argv_vols(flag: str) -> list[int]:
    if flag not in sys.argv:
        return []
    i = sys.argv.index(flag)
    out = []
    for a in sys.argv[i + 1:]:
        if a.startswith("--"):
            break
        out.append(int(a))
    return out


def main():
    extract_vols = argv_vols("--extract")
    ocr_vols = argv_vols("--ocr")
    do_zh = "--zh" in sys.argv
    convert_only = "--extract" not in sys.argv and "--ocr" not in sys.argv and "--zh" not in sys.argv

    for vol in extract_vols:
        raw = extract_script_pages(vol)
        gold = parse_parts(raw)
        print(f"cam{vol} text parts {sorted(gold)} chars={len(raw)}")
        if len(gold) < 8:
            raise SystemExit(f"cam{vol}: official parts {len(gold)}")
        write_official_transcripts(vol, gold, "official-audioscript+whisper-align")
        convert_vol(vol)

    for vol in ocr_vols:
        raw = extract_ocr_pages(vol)
        gold = parse_parts(raw)
        print(f"cam{vol} ocr parts {sorted(gold)} chars={len(raw)}")
        missing = [(t, p) for t in range(1, 5) for p in range(1, 5) if (t, p) not in gold]
        if missing:
            raise SystemExit(f"cam{vol}: OCR missing {missing} — not shipping")
        write_official_transcripts(vol, gold, "official-audioscript-ocr+whisper-align")
        convert_vol(vol)

    if convert_only or (not extract_vols and not ocr_vols):
        for vol in range(5, 22):
            convert_vol(vol)

    if do_zh:
        vols = extract_vols or ocr_vols or list(range(5, 22))
        fill_zh(vols)


if __name__ == "__main__":
    if "--selfcheck" in sys.argv:
        assert official_source("official-audioscript+whisper-align")
        assert official_source("audioscript-pdf+whisper-align")
        assert not official_source("whisper-segments")
        gold = parse_parts("TEST 1\nPART 1\nHello there.\nSECTION 2\nWelcome.\nTEST 2\nPART 1\nHi.\n")
        assert (1, 1) in gold and (1, 2) in gold and (2, 1) in gold
        gold2 = parse_parts("PART 1\nHello there.\nTEST 2\nPART 1\nHi.\n")
        assert (1, 1) in gold2 and (2, 1) in gold2
        gold3 = parse_parts("TEST 3\nPART 4\nHi.\nTest 3\nTEST\nPART 1\nHello.\nTEST 5\nSECTION 1\nGT only.\n")
        assert (3, 4) in gold3 and (4, 1) in gold3
        assert (5, 1) not in gold3
        print("build_jingting_all selfcheck ok")
        raise SystemExit(0)
    main()
