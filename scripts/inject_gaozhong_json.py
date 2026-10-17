#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Load scripts/gaozhong_json/listN.json (array of word objects) and inject HTML."""
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gaozhong_entry import entry
from inject_gaozhong_html import inject

EXCEL = Path(__file__).resolve().parent / "gaozhong_excel_8_40.json"
JSON_DIR = Path(__file__).resolve().parent / "gaozhong_json"


def collocations_from_phrases(phrases):
    coll = []
    for part in re.split(r"[,，]", phrases or ""):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"^(.+?)[（(](.+?)[）)]$", part)
        if m:
            coll.append({"phrase": m.group(1).strip(), "meaning": m.group(2).strip()})
        elif len(coll) < 3:
            coll.append({"phrase": part, "meaning": ""})
    return coll[:4]


def normalize_item(i, raw, expect_word):
    word = str(raw.get("word") or "").strip()
    if word != expect_word:
        raise SystemExit("order mismatch #%s: json %r excel %r" % (i, word, expect_word))
    accept = raw.get("acceptCN") or []
    if isinstance(accept, str):
        accept = re.split(r"[/／、;；]", accept)
    accept = [str(x).strip() for x in accept if str(x).strip()][:4]
    if len(accept) < 2:
        raise SystemExit("%s acceptCN < 2: %r" % (word, accept))
    meaning = str(raw.get("meaning") or "").strip()
    if len(meaning) < 24:
        raise SystemExit("%s meaning too thin" % word)
    phrases = str(raw.get("phrases") or "").strip()
    ex_en = str(raw.get("exampleEn") or "").strip()
    ex_zh = str(raw.get("exampleZh") or "").strip()
    if not ex_en or not ex_zh:
        raise SystemExit("%s missing example" % word)
    ipa = str(raw.get("ipa") or "").strip() or ("/" + word + "/")
    pos = str(raw.get("pos") or "n. / v.")
    w = entry(
        i,
        word,
        ipa,
        pos,
        meaning,
        accept,
        phrases,
        ex_en,
        ex_zh,
        str(raw.get("root") or ""),
        list(raw.get("synonyms") or []),
        list(raw.get("antonyms") or []),
        str((raw.get("examTag") or {}).get("commonUsage") or accept[0]),
        str((raw.get("examTag") or {}).get("topic") or "通用"),
        int((raw.get("examTag") or {}).get("frequency") or 4),
    )
    if raw.get("collocations"):
        w["collocations"] = raw["collocations"][:4]
    elif not w["collocations"]:
        w["collocations"] = collocations_from_phrases(phrases)
    return w


def load_list(n, excel_words):
    path = JSON_DIR / ("list%s.json" % n)
    if not path.exists():
        raise SystemExit("missing %s" % path)
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit("%s is not a list" % path)
    if len(data) != len(excel_words):
        raise SystemExit("LIST%s json %s excel %s" % (n, len(data), len(excel_words)))
    return [normalize_item(i + 1, data[i], excel_words[i]) for i in range(len(excel_words))]


def main(ns):
    excel = json.loads(EXCEL.read_text(encoding="utf-8"))
    for n in ns:
        words = load_list(n, excel[str(n)])
        inject(n, words)


if __name__ == "__main__":
    ns = [int(x) for x in sys.argv[1:]] or list(range(8, 41))
    main(ns)
