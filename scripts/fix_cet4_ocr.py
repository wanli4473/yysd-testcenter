#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Correct OCR headwords against in-house CET-4 theme lexicon."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OCR = ROOT / "library" / "study" / "vocab-cet4-data" / "ocr"
THEME = ROOT / "library" / "study" / "vocab-themes" / "data" / "cet4.json"
# also allow multiword from list1
EXTRA = {"according to"}


def load_lex() -> set[str]:
    raw = json.loads(THEME.read_text(encoding="utf-8"))
    s = {str(w.get("word") or "").strip().lower() for w in raw.get("words") or []}
    s |= EXTRA
    s.discard("")
    return s


def candidates(token: str, lex: set[str]) -> list[str]:
    t = token.strip().lower()
    if not t:
        return []
    if t in lex:
        return [t]
    # strip trailing/leading junk letters
    outs = []
    # missing first letter: "evice" -> "device"
    for ch in "abcdefghijklmnopqrstuvwxyz":
        c = ch + t
        if c in lex:
            outs.append(c)
    # missing last letter
    for ch in "abcdefghijklmnopqrstuvwxyz":
        c = t + ch
        if c in lex:
            outs.append(c)
    # extra leading OCR letter "d interest" already cleaned; try drop first
    if len(t) > 3 and t[1:] in lex:
        outs.append(t[1:])
    if len(t) > 3 and t[:-1] in lex:
        outs.append(t[:-1])
    # space variants already handled
    # unique preserve order
    seen, uniq = set(), []
    for x in outs:
        if x not in seen:
            seen.add(x)
            uniq.append(x)
    return uniq


def fix_list(words: list[str], lex: set[str]) -> list[str]:
    out, seen = [], set()
    for w in words:
        w = w.strip().lower()
        if not w or w in seen:
            continue
        if w in lex:
            seen.add(w)
            out.append(w)
            continue
        opts = candidates(w, lex)
        if len(opts) == 1:
            if opts[0] not in seen:
                seen.add(opts[0])
                out.append(opts[0])
            continue
        # ambiguous or unknown: keep if looks like english word (alpha) for manual later
        if opts:
            # pick shortest edit (prefer adding one letter)
            pick = min(opts, key=lambda x: abs(len(x) - len(w)))
            if pick not in seen:
                seen.add(pick)
                out.append(pick)
            continue
        # keep plausible unknown headwords for human proof (lexicon is incomplete)
        if any(ch.isdigit() for ch in w):
            continue
        if " " in w and w not in lex:
            # allow up to 3-word phrases if each token is alpha
            parts = w.split()
            if not (1 < len(parts) <= 3 and all(p.isalpha() for p in parts)):
                continue
        if re.fullmatch(r"[a-z]+(?:[\-'][a-z]+)*(?:\s+[a-z]+(?:[\-'][a-z]+)*){0,2}", w):
            if w not in seen:
                seen.add(w)
                out.append(w)
    return out


def main(argv: list[str]) -> int:
    want = [int(x) for x in argv[1:]] or list(range(2, 36))
    lex = load_lex()
    print("lex", len(lex))
    for n in want:
        path = OCR / f"list-{n:02d}-headwords.json"
        if not path.exists():
            print("skip missing", path.name)
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        before = data.get("words") or []
        after = fix_list(before, lex)
        data["words"] = after
        data["count"] = len(after)
        data["ocrRawCount"] = len(before)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"list {n}: {len(before)} -> {len(after)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
