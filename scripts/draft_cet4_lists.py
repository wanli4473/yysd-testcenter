#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Draft rewritten CET-4 list JSON from OCR headwords + theme lexicon meanings."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "library" / "study" / "vocab-cet4-data"
OCR = DATA / "ocr"
THEME = ROOT / "library" / "study" / "vocab-themes" / "data" / "cet4.json"


def band_for(n: int) -> str:
    if n <= 10:
        return "high"
    if n <= 20:
        return "mid"
    if n <= 28:
        return "low"
    return "zero"


def load_lexicon() -> dict:
    raw = json.loads(THEME.read_text(encoding="utf-8"))
    out = {}
    for w in raw.get("words") or []:
        key = str(w.get("word") or "").strip().lower()
        if key and key not in out:
            out[key] = w
    return out


def accept_from_meaning(meaning: str) -> list[str]:
    parts = re.split(r"[；;，,/、]", meaning or "")
    out = []
    for p in parts:
        p = re.sub(r"[（(].*?[）)]", "", p).strip()
        p = re.sub(r"^(to |a |an |the )", "", p, flags=re.I).strip()
        if 1 <= len(p) <= 12 and re.search(r"[\u4e00-\u9fff]", p):
            out.append(p)
    # dedupe
    seen, uniq = set(), []
    for x in out:
        if x not in seen:
            seen.add(x)
            uniq.append(x)
    return uniq[:6] or ([meaning[:8]] if meaning else [])


def draft_entry(i: int, word: str, lex: dict) -> dict:
    hit = lex.get(word.lower()) or {}
    meaning = (hit.get("meaning") or "").strip() or f"（待校对）{word}"
    ipa = (hit.get("ipa") or "").strip() or ""
    pos = (hit.get("pos") or "").strip() or "n."
    # original-ish helpers (not copied from green book)
    mnemonic = f"联想：结合词形与释义记住「{meaning.split('；')[0].split('，')[0][:12]}」"
    core = meaning.split("；")[0].split("，")[0].strip()[:10] or word
    collo = f"{word} skills（{core}相关能力）, use {word}（使用/运用该词）"
    if " " in word:
        collo = f"phrases with {word}（含 {word} 的表达）"
    ex_en = f"Students should learn how to use \"{word}\" in real contexts."
    ex_cn = f"学生应学会在真实语境中使用 “{word}”。"
    if hit.get("meaning"):
        ex_en = f"It is useful to understand the meaning of {word} in this sentence."
        ex_cn = f"理解这句话中 {word} 的含义很有帮助。"
    return {
        "id": i,
        "word": word,
        "ipa": ipa,
        "pos": pos,
        "meaning": meaning,
        "mnemonic": mnemonic,
        "collocations": collo,
        "phrases": collo,
        "example": f"{ex_en}（{ex_cn}）",
        "exampleEN": ex_en,
        "exampleCN": ex_cn,
        "derivatives": "",
        "distinguish": "",
        "acceptCN": accept_from_meaning(meaning),
    }


def draft_list(n: int, force: bool = False) -> Path | None:
    out = DATA / f"list-{n:02d}.json"
    if out.exists() and not force and n == 1:
        print("keep handcrafted", out.name)
        return out
    if out.exists() and not force and n != 1:
        # allow rebuild for 2+
        pass
    ocr_path = OCR / f"list-{n:02d}-headwords.json"
    if not ocr_path.exists():
        print("missing OCR", ocr_path.name, file=sys.stderr)
        return None
    head = json.loads(ocr_path.read_text(encoding="utf-8"))
    words = head.get("words") or []
    # prefer curated list-01 order file if regenerating 1 with force
    lex = load_lexicon()
    entries = [draft_entry(i, w, lex) for i, w in enumerate(words, 1)]
    meta = {
        "listNo": n,
        "band": band_for(n),
        "title": f"单元 {n}",
        "published": True,
        "sourceNote": "Headword order from frequency-list OCR; definitions from in-house lexicon + rewritten helpers.",
        "words": entries,
    }
    if n == 1 and out.exists() and not force:
        return out
    out.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"drafted list {n}: {len(entries)} words")
    return out


def main(argv: list[str]) -> int:
    force = "--force" in argv
    args = [a for a in argv[1:] if a != "--force"]
    want = [int(x) for x in args] or list(range(1, 36))
    # preload lexicon once
    _ = load_lexicon()
    print("lexicon ready")
    for n in want:
        if n == 1 and not force:
            print("keep handcrafted list-01.json")
            continue
        draft_list(n, force=force)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
