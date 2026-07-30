#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fill missing Chinese glosses for browse-bank words (INCLUDE raw files only)."""
from __future__ import annotations

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from scrape_koolearn_fenlei import CACHE, OUT, enrich_one, parse_wd, fetch  # noqa: E402
from build_vocab_themes_from_raw import INCLUDE  # noqa: E402

os.makedirs(CACHE, exist_ok=True)


def force_enrich(wd_id: int):
    """Always refetch — empty cached glosses need reparsing."""
    url = "https://www.koolearn.com/dict/wd_%d.html" % wd_id
    try:
        html = fetch(url)
        data = parse_wd(html)
    except Exception as e:
        data = {"ipa": "", "pos": "", "meaning": "", "error": str(e)}
    data["wd_id"] = wd_id
    path = os.path.join(CACHE, "%d.json" % wd_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    return data


def main():
    only_force_empty = "--empty-cache-only" in sys.argv
    limit = 0
    for a in sys.argv[1:]:
        if a.startswith("--limit="):
            limit = int(a.split("=", 1)[1])

    todo = []  # wd_ids
    seen = set()
    for cat, sid, _label in INCLUDE:
        path = os.path.join(OUT, "%s__%s.json" % (cat, sid))
        if not os.path.isfile(path):
            continue
        data = json.load(open(path, encoding="utf-8"))
        for w in data.get("words") or []:
            if (w.get("meaning") or "").strip():
                continue
            wid = w.get("wd_id")
            if not wid or wid in seen:
                continue
            cache = os.path.join(CACHE, "%d.json" % wid)
            if only_force_empty and not os.path.isfile(cache):
                continue
            seen.add(wid)
            todo.append(wid)

    if limit:
        todo = todo[:limit]
    print("to enrich", len(todo), "(empty-cache-only)" if only_force_empty else "")

    done = 0
    got = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(force_enrich, wid): wid for wid in todo}
        for fut in as_completed(futs):
            done += 1
            d = fut.result()
            if (d.get("meaning") or "").strip():
                got += 1
            if done % 100 == 0:
                print("  %d/%d filled=%d" % (done, len(todo), got))
            time.sleep(0.03)
    print("done", done, "newly filled", got)

    # merge into raw INCLUDE files
    filled_words = 0
    for cat, sid, _label in INCLUDE:
        path = os.path.join(OUT, "%s__%s.json" % (cat, sid))
        if not os.path.isfile(path):
            continue
        data = json.load(open(path, encoding="utf-8"))
        for w in data.get("words") or []:
            p = os.path.join(CACHE, "%d.json" % w.get("wd_id", 0))
            if not os.path.isfile(p):
                continue
            d = json.load(open(p, encoding="utf-8"))
            if d.get("meaning"):
                if not (w.get("meaning") or "").strip():
                    filled_words += 1
                w["meaning"] = d["meaning"]
            if d.get("ipa"):
                w["ipa"] = d["ipa"]
            if d.get("pos"):
                w["pos"] = d["pos"]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print("raw slots filled", filled_words)


if __name__ == "__main__":
    main()
