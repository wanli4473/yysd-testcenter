# -*- coding: utf-8 -*-
"""Write CET-4 list JSON + HTML. Excel order is caller's job."""
import json
from pathlib import Path

from build_cet4_lists import render_html
from draft_cet4_lists import band_for

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "library" / "study" / "vocab-cet4-data"
HTML_DIR = ROOT / "library" / "study" / "vocab-cet4"
HIDE = (
    '</style>\n<!-- yysd:hide-legacy-test --><style id="yysd-hide-legacy-test">'
    '.nav-tab[data-mode="test"],#testSection,.test-section,[data-mode="test"]{display:none!important}'
    "</style>\n</head>"
)


def polish(words):
    out = []
    for w in words:
        w = dict(w)
        tag = dict(w.get("examTag") or {})
        tag["source"] = "大学英语四级"
        w["examTag"] = tag
        w["mnemonic"] = w.get("root") or w.get("mnemonic") or ""
        w["exampleEN"] = w.get("exampleEn") or w.get("exampleEN") or ""
        w["exampleCN"] = w.get("exampleZh") or w.get("exampleCN") or ""
        if len(w.get("acceptCN") or []) < 2:
            raise SystemExit("acceptCN < 2: %s" % w.get("word"))
        if len(str(w.get("meaning") or "")) < 24:
            raise SystemExit("thin meaning: %s" % w.get("word"))
        if not w.get("exampleEn") or not w.get("exampleZh"):
            raise SystemExit("missing example: %s" % w.get("word"))
        if not w.get("ipa") or "/" not in str(w.get("ipa")):
            raise SystemExit("ipa: %s" % w.get("word"))
        out.append(w)
    return out


def write_list(n, words, excel=None):
    ws = polish(words)
    got = [w["word"] for w in ws]
    if excel is not None and got != list(excel):
        diff = [(a, b) for a, b in zip(got, excel) if a != b][:5]
        raise SystemExit("order mismatch: %s" % (diff or "len %s/%s" % (len(got), len(excel))))
    meta = {
        "listNo": n,
        "band": band_for(n),
        "title": "单元 %s" % n,
        "published": True,
        "sourceNote": "Headword order from 四级单词List1-35.xlsx; cards rewritten to gaozhong field standard.",
        "words": ws,
    }
    DATA.mkdir(parents=True, exist_ok=True)
    HTML_DIR.mkdir(parents=True, exist_ok=True)
    jp = DATA / ("list-%02d.json" % n)
    jp.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    html = render_html(meta).replace("const wordData = [", "var wordData = [", 1)
    if "yysd-hide-legacy-test" not in html:
        html = html.replace("</style>\n</head>", HIDE, 1)
    out = HTML_DIR / ("四级单词LIST%s.html" % n)
    out.write_text(html, encoding="utf-8")
    print("LIST%s %s words → %s" % (n, len(ws), out.name))
    return out
