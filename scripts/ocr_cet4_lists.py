#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""OCR Word List headwords from the scanned CET-4 green-book PDF (footers)."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import fitz
from PIL import Image

PDF = Path("/Users/frankman/Desktop/2024四级词汇2024版新东方绿宝书乱序.pdf")
OCR_BIN = Path("/tmp/ocr_vision")
OUT_DIR = Path(__file__).resolve().parents[1] / "library" / "study" / "vocab-cet4-data" / "ocr"
TMP = Path("/tmp/lvbaoshu_ocr")

# book page ranges from TOC (inclusive)
LIST_PAGES = {
    1: (1, 13), 2: (14, 25), 3: (26, 37), 4: (38, 48), 5: (49, 60),
    6: (61, 72), 7: (73, 84), 8: (85, 95), 9: (96, 107), 10: (108, 117),
    11: (118, 128), 12: (129, 140), 13: (141, 151), 14: (152, 161), 15: (162, 171),
    16: (172, 182), 17: (183, 193), 18: (194, 203), 19: (204, 214), 20: (215, 225),
    21: (226, 235), 22: (236, 245), 23: (246, 255), 24: (256, 264), 25: (265, 272),
    26: (273, 281), 27: (282, 291), 28: (292, 300),
    29: (301, 308), 30: (309, 316), 31: (317, 323), 32: (324, 330), 33: (331, 337),
    34: (338, 345), 35: (346, 353),
}

# PDF page index = book_page + 11 (book p1 -> PDF p13 -> index 12)
BOOK_TO_PDF_OFFSET = 12

WORD_RE = re.compile(
    r"^[a-z]+(?:[\-'][a-z]+)*(?:\s+[a-z]+(?:[\-'][a-z]+)*){0,2}$"
)
NOISE = {
    "word", "list", "high", "the", "and", "for", "with", "from", "that", "this",
    "page", "cet", "prep", "adj", "adv", "noun", "verb",
}


def band_for(n: int) -> str:
    if n <= 10:
        return "high"
    if n <= 20:
        return "mid"
    if n <= 28:
        return "low"
    return "zero"


def clean_line(ln: str) -> str:
    ln = ln.strip().lower()
    ln = re.sub(r"^[o0udl\[\]•·□◼▪○◯\-–—\d\.\s]+", "", ln)
    ln = ln.strip()
    # strip leading OCR letter leftovers like "d interest"
    ln = re.sub(r"^[a-z]\s+(?=[a-z]{3,})", "", ln)
    return ln.strip()


def extract_words(text: str) -> list[str]:
    out = []
    for ln in text.splitlines():
        w = clean_line(ln)
        if not w or w in NOISE or not WORD_RE.fullmatch(w):
            continue
        if len(w) <= 2:
            continue
        out.append(w)
    return out


HEAD_RE = re.compile(
    r"^\*?([A-Za-z][A-Za-z\-']+(?:\s+[A-Za-z\-']+){0,2})\s*[\[/]"
)


def ocr_page(doc: fitz.Document, book_page: int) -> list[str]:
    """Prefer headword+[ipa] lines; fall back to footer checklist words."""
    pdf_i = book_page + BOOK_TO_PDF_OFFSET - 1
    if pdf_i < 0 or pdf_i >= doc.page_count:
        return []
    TMP.mkdir(parents=True, exist_ok=True)
    pix = doc[pdf_i].get_pixmap(matrix=fitz.Matrix(2.2, 2.2), alpha=False)
    full = TMP / f"p{book_page:03d}.png"
    pix.save(str(full))
    r = subprocess.run([str(OCR_BIN), str(full)], capture_output=True, text=True)
    text = r.stdout or ""
    heads = []
    for ln in text.splitlines():
        m = HEAD_RE.match(ln.strip())
        if m:
            heads.append(m.group(1).lower())
    if heads:
        return heads
    # footer fallback
    im = Image.open(full)
    w, h = im.size
    foot = im.crop((0, int(h * 0.86), w, h))
    fp = TMP / f"f{book_page:03d}.png"
    foot.save(fp)
    r2 = subprocess.run([str(OCR_BIN), str(fp)], capture_output=True, text=True)
    return extract_words(r2.stdout or "")


def ocr_list(doc: fitz.Document, n: int) -> list[str]:
    a, b = LIST_PAGES[n]
    words, seen = [], set()
    for bp in range(a, b + 1):
        for w in ocr_page(doc, bp):
            w = clean_line(w) if " " not in w else w.strip().lower()
            if not w or w in seen or w in NOISE:
                continue
            if not WORD_RE.fullmatch(w):
                continue
            seen.add(w)
            words.append(w)
    return words


def main(argv: list[str]) -> int:
    if not OCR_BIN.exists():
        print("missing", OCR_BIN, "- compile ocr_vision first", file=sys.stderr)
        return 1
    want = [int(x) for x in argv[1:]] or list(range(1, 36))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(str(PDF))
    for n in want:
        words = ocr_list(doc, n)
        payload = {
            "listNo": n,
            "band": band_for(n),
            "title": f"单元 {n}",
            "words": words,
            "count": len(words),
        }
        out = OUT_DIR / f"list-{n:02d}-headwords.json"
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"list {n}: {len(words)} words -> {out.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
