#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Enrich scraped raw word lists with IPA/pos/meaning from Koolearn wd_ pages."""
from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from scrape_koolearn_fenlei import CACHE, OUT, enrich_words  # noqa: E402

# smaller / product-critical first
QUEUE = [
    ("nature__animals.json", 0),
    ("nature__plants.json", 0),
    ("subject__phys.json", 0),
    ("subject__geo.json", 0),
    ("subject__math.json", 0),
    ("subject__chem.json", 0),
    ("life__festivals.json", 0),
    ("life__urban.json", 0),
    ("life__edu.json", 0),
    ("life__travel.json", 0),
    ("media__music.json", 0),
    ("media__film.json", 0),
    ("arts__sports.json", 0),
    ("arts__literature.json", 0),
    ("arts__games.json", 0),
    ("abroad__sat.json", 0),
    ("abroad__toeic.json", 0),
    ("abroad__bec.json", 0),
    ("life__food.json", 0),
    ("life__work.json", 2000),
    ("abroad__gmat.json", 3000),
    ("abroad__ielts.json", 4000),
    ("abroad__toefl.json", 4000),
    ("exam__cet6.json", 2500),
    ("exam__cet4.json", 3000),
    ("k12__senior.json", 2500),
    ("k12__junior.json", 2000),
    ("learning__oxford3000.json", 3000),
    ("abroad__gre.json", 3000),
    ("exam__gaokao.json", 2500),
    ("exam__kaoyan.json", 3000),
]


def main():
    only = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    for name, lim in QUEUE:
        if only and name not in only and name.replace(".json", "") not in only:
            continue
        path = os.path.join(OUT, name)
        if not os.path.isfile(path):
            print("missing", name)
            continue
        data = json.load(open(path, encoding="utf-8"))
        words = data.get("words") or []
        print("==", name, "words", len(words), "limit", lim or "all")
        enrich_words(words, workers=6, limit=lim)
        for w in words:
            p = os.path.join(CACHE, "%d.json" % w["wd_id"])
            if not os.path.isfile(p):
                continue
            d = json.load(open(p, encoding="utf-8"))
            w["ipa"] = d.get("ipa") or ""
            w["pos"] = d.get("pos") or ""
            w["meaning"] = d.get("meaning") or ""
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        have = sum(1 for w in words if w.get("meaning"))
        print("   meanings", have, "/", len(words), "cache", len(os.listdir(CACHE)))


if __name__ == "__main__":
    main()
