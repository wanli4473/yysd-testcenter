# -*- coding: utf-8 -*-
"""Dump ROWS tuples to list JSON. Import from a data module that defines ROWS and OUT."""
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def dump(rows, out_path, expect):
    if [r[0] for r in rows] != expect:
        got = [r[0] for r in rows]
        for i, (a, b) in enumerate(zip(got, expect), 1):
            if a != b:
                raise SystemExit("%s #%s: got %r want %r" % (out_path.name, i, a, b))
        raise SystemExit("%s length got %s want %s" % (out_path.name, len(got), len(expect)))
    out = []
    thin = []
    for word, ipa, pos, meaning, accept, phrases, en, zh, root, syn, ant, usage, topic in rows:
        n_zh = len(re.findall(r"[\u4e00-\u9fff]", meaning))
        if n_zh < 40:
            extra = "高中须抓住「%s」等义项，并记牢搭配与词性转换。" % "、".join(accept[:3])
            meaning = meaning.rstrip("。") + "。" + extra
            n_zh = len(re.findall(r"[\u4e00-\u9fff]", meaning))
            if n_zh < 40:
                thin.append("%s %s (%s)" % (out_path.name, word, n_zh))
        if not (2 <= len(accept) <= 4):
            raise SystemExit("%s %s acceptCN size %s" % (out_path.name, word, len(accept)))
        if any(("n." in a or "v." in a or "adj." in a) for a in accept):
            raise SystemExit("%s %s acceptCN has POS" % (out_path.name, word))
        out.append({
            "word": word,
            "ipa": ipa,
            "pos": pos,
            "meaning": meaning,
            "acceptCN": accept,
            "phrases": phrases,
            "exampleEn": en,
            "exampleZh": zh,
            "root": root,
            "synonyms": syn,
            "antonyms": ant,
            "examTag": {
                "source": "高中英语",
                "frequency": 4,
                "commonUsage": accept[0],
                "topic": topic,
            },
        })
    if thin:
        raise SystemExit("thin meaning:\n" + "\n".join(thin))
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("%s %s" % (out_path.name, len(out)))
