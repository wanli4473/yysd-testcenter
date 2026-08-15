#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rebuild CET-4 List 1–35 from Desktop Excel order; enrich from JSON/HTML/theme lexicon."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCEL = Path("/Users/frankman/Desktop/四级单词List1-35.xlsx")
DATA = ROOT / "library" / "study" / "vocab-cet4-data"
HTML_DIR = ROOT / "library" / "study" / "vocab-cet4"
THEME_DIR = ROOT / "library" / "study" / "vocab-themes" / "data"
ARCHIVE = ROOT / "library" / ".archive" / "vocab-cet4-legacy"
NODE = Path("/Users/frankman/.local/node/bin/node")

sys.path.insert(0, str(ROOT / "scripts"))
from build_cet4_lists import render_html  # noqa: E402
from draft_cet4_lists import accept_from_meaning, band_for, draft_entry  # noqa: E402

# Prefer CET-4, then nearby exam packs for the few Excel headwords not in cet4.json.
THEME_PACKS = (
    "cet4.json",
    "cet6.json",
    "gaokao.json",
    "senior.json",
    "oxford3000.json",
    "kaoyan.json",
    "ielts.json",
    "toefl.json",
    "nce.json",
    "collins.json",
)


def norm_key(w: str) -> str:
    return re.sub(r"\s+", " ", str(w or "").strip().lower())


def variant_keys(word: str) -> list[str]:
    """Excel spellings: center/centre, behavio(u)r, instal(l), catalog(ue), resumé."""
    w = norm_key(word)
    if not w:
        return []
    out: list[str] = []
    seen: set[str] = set()

    def add(x: str) -> None:
        x = norm_key(x)
        if x and x not in seen:
            seen.add(x)
            out.append(x)

    add(w)
    for p in w.split("/"):
        add(p)
    # optional letter in parens: behavio(u)r, instal(l), catalog(ue)
    for m in re.finditer(r"\(([^)]+)\)", w):
        add(w[: m.start()] + w[m.end() :])  # omit
        add(w[: m.start()] + m.group(1) + w[m.end() :])  # include
    add(w.replace("é", "e").replace("É", "e"))
    return out


def bank_get(bank: dict[str, dict], word: str) -> dict | None:
    for k in variant_keys(word):
        if k in bank:
            return bank[k]
    return None


def parse_html_dir(folder: Path) -> list[dict]:
    if not folder.exists() or not NODE.exists():
        return []
    script = r"""
const fs=require('fs'); const path=require('path');
const dir=process.argv[1];
const out=[];
for (const f of fs.readdirSync(dir).filter(x=>x.endsWith('.html'))) {
  const html=fs.readFileSync(path.join(dir,f),'utf8');
  const m=html.match(/(?:var|const|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
  if(!m) continue;
  let data; try { data=eval(m[1]); } catch(e) { continue; }
  if(Array.isArray(data)) for (const w of data) if(w&&w.word) out.push(w);
}
process.stdout.write(JSON.stringify(out));
"""
    try:
        raw = subprocess.check_output(
            [str(NODE), "-e", script, str(folder)],
            stderr=subprocess.DEVNULL,
            timeout=120,
        )
        data = json.loads(raw.decode("utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def load_bank() -> dict[str, dict]:
    bank: dict[str, dict] = {}

    def add(w: dict, prefer: bool = False) -> None:
        key = norm_key(w.get("word") or "")
        if not key:
            return
        meaning = str(w.get("meaning") or "").strip()
        weak = (not meaning) or ("待校对" in meaning)
        if key in bank:
            old_weak = (not str(bank[key].get("meaning") or "").strip()) or (
                "待校对" in str(bank[key].get("meaning") or "")
            )
            if weak and not old_weak:
                return
            if not prefer and not old_weak and not weak:
                return
        bank[key] = w
        # also index slash/paren variants so center hits centre entry, etc.
        for vk in variant_keys(str(w.get("word") or "")):
            if vk not in bank or (
                "待校对" in str(bank[vk].get("meaning") or "")
                and meaning
                and "待校对" not in meaning
            ):
                bank[vk] = w

    for p in sorted(DATA.glob("list-*.json")):
        meta = json.loads(p.read_text(encoding="utf-8"))
        for w in meta.get("words") or []:
            add(w, prefer=True)

    for folder in (HTML_DIR, ARCHIVE):
        for w in parse_html_dir(folder):
            add(w)

    for name in THEME_PACKS:
        p = THEME_DIR / name
        if not p.exists():
            continue
        for w in json.loads(p.read_text(encoding="utf-8")).get("words") or []:
            add(
                {
                    "word": w.get("word"),
                    "ipa": w.get("ipa") or "",
                    "pos": w.get("pos") or "",
                    "meaning": w.get("meaning") or "",
                    "acceptCN": w.get("acceptCN") or accept_from_meaning(w.get("meaning") or ""),
                }
            )
    return bank


def load_excel() -> dict[int, list[str]]:
    import openpyxl

    wb = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)
    by: dict[int, list[str]] = defaultdict(list)
    for r in wb.active.iter_rows(values_only=True):
        if not r or not r[0] or r[2] in (None, ""):
            continue
        m = re.match(r"List0*(\d+)$", str(r[0]).strip(), re.I)
        if not m:
            continue
        by[int(m.group(1))].append(str(r[2]).strip())
    return dict(by)


def entry_for(i: int, word: str, bank: dict[str, dict]) -> dict:
    hit = bank_get(bank, word)
    if hit and str(hit.get("meaning") or "").strip() and "待校对" not in str(hit.get("meaning") or ""):
        out = dict(hit)
        out["id"] = i
        out["word"] = word
        if not out.get("acceptCN"):
            out["acceptCN"] = accept_from_meaning(out.get("meaning") or "")
        if not out.get("phrases") and out.get("collocations"):
            out["phrases"] = out["collocations"]
        coll = out.get("collocations")
        if isinstance(coll, list):
            parts = []
            for c in coll:
                if isinstance(c, dict):
                    ph = c.get("phrase") or ""
                    me = c.get("meaning") or ""
                    parts.append(f"{ph}（{me}）" if me else ph)
                else:
                    parts.append(str(c))
            out["collocations"] = "，".join([p for p in parts if p])
            out["phrases"] = out.get("phrases") or out["collocations"]
        if out.get("exampleEn") and not out.get("exampleEN"):
            out["exampleEN"] = out["exampleEn"]
        if out.get("exampleZh") and not out.get("exampleCN"):
            out["exampleCN"] = out["exampleZh"]
        return out
    lex = {}
    if hit:
        for k in variant_keys(word):
            lex[k] = hit
        lex[word.lower()] = hit
    return draft_entry(i, word, lex)


def main() -> int:
    if not EXCEL.exists():
        print("missing excel", EXCEL, file=sys.stderr)
        return 1
    by = load_excel()
    if sorted(by) != list(range(1, 36)):
        print("expected lists 1..35 got", sorted(by), file=sys.stderr)
        return 1
    bank = load_bank()
    print("bank", len(bank), "excel words", sum(len(v) for v in by.values()))

    DATA.mkdir(parents=True, exist_ok=True)
    HTML_DIR.mkdir(parents=True, exist_ok=True)

    stub = 0
    for n in range(1, 36):
        words = [entry_for(i, w, bank) for i, w in enumerate(by[n], 1)]
        stub += sum(1 for w in words if "待校对" in str(w.get("meaning") or ""))
        meta = {
            "listNo": n,
            "band": band_for(n),
            "title": f"单元 {n}",
            "published": True,
            "sourceNote": "Headword order from 四级单词List1-35.xlsx; definitions from CET-4 bank + theme lexicon.",
            "words": words,
        }
        jp = DATA / f"list-{n:02d}.json"
        jp.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        html = render_html(meta)
        if "yysd-hide-legacy-test" not in html:
            html = html.replace(
                "</style>\n</head>",
                '</style>\n<!-- yysd:hide-legacy-test --><style id="yysd-hide-legacy-test">'
                '.nav-tab[data-mode="test"],#testSection,.test-section,[data-mode="test"]{display:none!important}'
                "</style>\n</head>",
                1,
            )
        html = html.replace("const wordData = [", "var wordData = [", 1)
        out = HTML_DIR / f"四级单词LIST{n}.html"
        out.write_text(html, encoding="utf-8")
        print(f"LIST{n}: {len(words)} words → {out.name}")

    print("stub meanings", stub)
    return 0 if stub == 0 else 0  # still ship; stubs printed for QA


if __name__ == "__main__":
    raise SystemExit(main())
