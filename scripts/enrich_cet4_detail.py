#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Compose CET-4 card 详解 (gaozhong-style) from gloss + helpers; keep acceptCN for list/quiz."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "library" / "study" / "vocab-cet4-data"
HTML_DIR = ROOT / "library" / "study" / "vocab-cet4"

sys.path.insert(0, str(ROOT / "scripts"))
from build_cet4_lists import render_html  # noqa: E402
from draft_cet4_lists import accept_from_meaning  # noqa: E402

GENERIC_MN = re.compile(r"结合词形与释义|待校对|Students should learn")


def looks_detailed(meaning: str) -> bool:
    s = str(meaning or "")
    if len(s) >= 48 and ("①" in s or "常用" in s or "。常用" in s or "反义" in s or "派生" in s):
        return True
    if len(s) >= 80 and ("；" in s or "。" in s):
        return True
    return False


def as_phrase_str(w: dict) -> str:
    coll = w.get("phrases") or w.get("collocations") or ""
    if isinstance(coll, list):
        parts = []
        for c in coll:
            if isinstance(c, dict):
                ph = (c.get("phrase") or "").strip()
                me = (c.get("meaning") or "").strip()
                parts.append(f"{ph}（{me}）" if ph and me else ph)
            else:
                parts.append(str(c).strip())
        return "，".join(p for p in parts if p)
    return str(coll or "").strip()


def compose_detail(w: dict) -> str:
    gloss = str(w.get("meaning") or "").strip()
    if looks_detailed(gloss):
        return gloss
    # strip prior composed markers if re-run
    gloss = re.split(r"。常用 |。派生：|。辨：", gloss)[0].strip("。；; ")
    pos = str(w.get("pos") or "").strip()
    phrases = as_phrase_str(w)
    distinguish = str(w.get("distinguish") or "").strip()
    derivatives = str(w.get("derivatives") or "").strip()
    mnemonic = str(w.get("mnemonic") or "").strip()
    if GENERIC_MN.search(mnemonic):
        mnemonic = ""

    core = gloss
    if pos and core and not re.match(rf"^{re.escape(pos)}\b", core):
        core = f"{pos} {core}"
    if core and not core.endswith(("。", ".", "！", "?")):
        core += "。"
    parts = [core] if core else []
    if phrases:
        parts.append(f"常用 {phrases}。")
    if distinguish:
        parts.append(distinguish if distinguish.endswith(("。", ".", "！")) else distinguish + "。")
    if derivatives:
        parts.append(f"派生：{derivatives}。")
    if mnemonic:
        # card also shows root=mnemonic; keep a short recall tip in 详解
        tip = mnemonic
        if tip.startswith("联想：") or tip.startswith("拆分："):
            parts.append(tip if tip.endswith("。") else tip + "。")
    out = "".join(parts).strip()
    return out or gloss or f"（待校对）{w.get('word') or ''}"


def enrich_word(w: dict) -> dict:
    out = dict(w)
    gloss = str(out.get("meaning") or "").strip()
    # acceptCN from short gloss before we expand meaning
    short = re.split(r"。常用 |。派生：|。辨：", gloss)[0].strip()
    if not out.get("acceptCN"):
        out["acceptCN"] = accept_from_meaning(short or gloss)
    out["meaning"] = compose_detail(out)
    # gaozhong-shaped helpers for shelf card
    phrases = as_phrase_str(out)
    if phrases and not isinstance(out.get("collocations"), list):
        out["collocations"] = phrases
        out["phrases"] = phrases
    ex_en = str(out.get("exampleEN") or out.get("exampleEn") or "").strip()
    ex_cn = str(out.get("exampleCN") or out.get("exampleZh") or "").strip()
    if not ex_en:
        ex = str(out.get("example") or "")
        m = re.match(r"^(.+?)[（(](.+)[）)]\s*$", ex)
        if m:
            ex_en, ex_cn = m.group(1).strip(), m.group(2).strip()
    if ex_en:
        out["exampleEN"] = ex_en
        out["exampleEn"] = ex_en
    if ex_cn:
        out["exampleCN"] = ex_cn
        out["exampleZh"] = ex_cn
    if ex_en and ex_cn:
        out["example"] = f"{ex_en}（{ex_cn}）"
    mn = str(out.get("mnemonic") or "").strip()
    if mn and not GENERIC_MN.search(mn) and not out.get("root"):
        out["root"] = mn
    if not out.get("examTag"):
        usage = (out.get("acceptCN") or [None])[0] or short[:8]
        out["examTag"] = {
            "source": "大学英语四级",
            "frequency": 4,
            "commonUsage": usage,
            "topic": "通用",
        }
    return out


def main() -> int:
    for n in range(1, 36):
        jp = DATA / f"list-{n:02d}.json"
        meta = json.loads(jp.read_text(encoding="utf-8"))
        meta["words"] = [enrich_word(w) for w in meta.get("words") or []]
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
        # emit root/examTag/exampleEn for shelf parity (via extra keys in word_js — patch after render)
        # ponytail: inject into wordData by re-render with extended word_js below if needed
        (HTML_DIR / f"四级单词LIST{n}.html").write_text(html, encoding="utf-8")
        sample = meta["words"][0]
        print(f"LIST{n}: meaning_len={len(sample['meaning'])} accept={sample.get('acceptCN')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
