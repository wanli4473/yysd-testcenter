#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build browse-only thematic vocab catalog from scraped raw JSON.

ponytail: no lesson HTML / no test shells — catalog + data/*.json only.
"""
from __future__ import annotations

import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "library", "study", "vocab-themes", "raw")
OUT = os.path.join(ROOT, "library", "study", "vocab-themes")
DATA = os.path.join(OUT, "data")

INCLUDE = [
    ("exam", "cet4", "CET-4"),
    ("exam", "cet6", "CET-6"),
    ("exam", "tem", "专四专八"),
    ("exam", "kaoyan", "考研英语"),
    ("exam", "gaokao", "高考英语"),
    ("abroad", "bec", "BEC"),
    ("abroad", "gmat", "GMAT"),
    ("abroad", "gre", "GRE"),
    ("abroad", "sat", "SAT"),
    ("abroad", "toeic", "托业"),
    ("abroad", "toefl", "托福"),
    ("abroad", "ielts", "雅思"),
    ("k12", "primary", "小学词汇"),
    ("k12", "junior", "初中词汇"),
    ("k12", "senior", "高中词汇"),
    ("learning", "nce", "新概念"),
    ("learning", "oxford3000", "牛津3000词"),
    ("learning", "collins", "柯林斯星级"),
    ("learning", "phrases", "常用短语"),
    ("subject", "chem", "化学"),
    ("subject", "geo", "地理学"),
    ("subject", "math", "数学"),
    ("subject", "phys", "物理"),
    ("nature", "animals", "动物世界"),
    ("nature", "plants", "植物王国"),
    ("life", "food", "吃喝玩乐"),
    ("life", "urban", "城市规划"),
    ("life", "travel", "安全出行"),
    ("life", "edu", "科教兴国"),
    ("life", "work", "职业职场"),
    ("life", "festivals", "节日"),
    ("arts", "literature", "文学艺术"),
    ("arts", "sports", "体育"),
    ("arts", "games", "游戏娱乐"),
    ("media", "film", "影视剧"),
    ("media", "music", "音乐广播"),
]

CAT_LABEL = {
    "exam": "英语考试",
    "abroad": "出国留学",
    "k12": "中小学",
    "learning": "英语学习",
    "subject": "学科分类",
    "nature": "动植物",
    "life": "生活日常",
    "arts": "艺术文体",
    "media": "影音视听",
}


def keep(word: str) -> bool:
    w = (word or "").strip()
    if len(w) < 2 or len(w) > 42:
        return False
    if not re.search(r"[A-Za-z]", w):
        return False
    if re.fullmatch(r"[A-Z]{1,4}", w):
        return False
    if re.search(r"\d{3,}", w):
        return False
    return True


def main():
    os.makedirs(DATA, exist_ok=True)
    # wipe old lesson shells
    for name in os.listdir(OUT):
        if re.match(r"^theme-\d+-.*\.html$", name):
            os.remove(os.path.join(OUT, name))
    for name in os.listdir(DATA):
        if name.endswith(".json"):
            os.remove(os.path.join(DATA, name))

    categories = [{"id": "all", "label": "全部"}] + [
        {"id": k, "label": CAT_LABEL[k]}
        for k in ["exam", "abroad", "k12", "learning", "subject", "nature", "life", "arts", "media"]
    ]

    themes = []
    total = 0
    with_meaning = 0

    for cat, sid, label in INCLUDE:
        path = os.path.join(RAW, "%s__%s.json" % (cat, sid))
        if not os.path.isfile(path):
            print("missing", path)
            continue
        data = json.load(open(path, encoding="utf-8"))
        words = []
        seen = set()
        for w in data.get("words") or []:
            word = (w.get("word") or "").strip()
            if not keep(word):
                continue
            k = word.lower()
            if k in seen:
                continue
            seen.add(k)
            meaning = (w.get("meaning") or "").strip()
            if meaning:
                with_meaning += 1
            words.append(
                {
                    "word": word,
                    "ipa": w.get("ipa") or "",
                    "pos": w.get("pos") or "",
                    "meaning": meaning,
                }
            )
        total += len(words)
        browse_path = "study/vocab-themes/data/%s.json" % sid
        with open(os.path.join(DATA, "%s.json" % sid), "w", encoding="utf-8") as f:
            json.dump(
                {"id": sid, "title": label, "category": cat, "count": len(words), "words": words},
                f,
                ensure_ascii=False,
            )
            f.write("\n")

        preview = [w["word"] for w in words[:12]]
        themes.append(
            {
                "id": sid,
                "no": len(themes) + 1,
                "title": label,
                "category": cat,
                "desc": "%s · %d 词（已释义 %d）"
                % (CAT_LABEL[cat], len(words), sum(1 for w in words if w.get("meaning"))),
                "count": len(words),
                "defined": sum(1 for w in words if w.get("meaning")),
                "preview": preview,
                "dataFile": browse_path,
            }
        )
        print("%s/%s %d words" % (cat, sid, len(words)))

    catalog = {
        "sourceNote": "公开分类词表复刻浏览库；暂不含小课/测试。",
        "categories": categories,
        "themes": themes,
    }
    with open(os.path.join(OUT, "themes.json"), "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("themes", len(themes), "words", total, "defined", with_meaning)


if __name__ == "__main__":
    main()
