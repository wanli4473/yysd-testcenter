# -*- coding: utf-8 -*-
"""Compact high-school vocab entries → full wordData objects."""
import re


def entry(i, word, ipa, pos, meaning, accept, phrases, ex_en, ex_zh, root, syn, ant, usage, topic, freq=4):
    coll = []
    for part in re.split(r"[,，]", phrases):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"^(.+?)[（(](.+?)[）)]$", part)
        if m:
            coll.append({"phrase": m.group(1).strip(), "meaning": m.group(2).strip()})
        elif len(coll) < 3:
            coll.append({"phrase": part, "meaning": ""})
    accept = [x.strip() for x in accept if str(x).strip()][:4]
    return {
        "id": i,
        "word": word,
        "ipa": ipa,
        "pos": pos,
        "meaning": meaning,
        "phrases": phrases,
        "example": "%s（%s）" % (ex_en, ex_zh),
        "acceptCN": accept,
        "collocations": coll[:4],
        "root": root,
        "synonyms": syn or [],
        "antonyms": ant or [],
        "examTag": {
            "source": "高中英语",
            "frequency": freq,
            "commonUsage": usage,
            "topic": topic,
        },
        "exampleEn": ex_en,
        "exampleZh": ex_zh,
    }


def numbered(rows):
    out = []
    for i, row in enumerate(rows, 1):
        out.append(entry(i, *row))
    return out
