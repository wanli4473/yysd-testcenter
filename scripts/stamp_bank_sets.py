#!/usr/bin/env python3
"""Stamp R-CW / R-RDL set ids from Desktop filenames; append HIT-skipped items."""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CW_DIR = os.environ.get("YYSD_CW_DIR", "/Users/frankman/Desktop/01-R-CW")
RDL_DIR = os.environ.get("YYSD_RDL_DIR", "/Users/frankman/Desktop/02-R-RDL")
OUT_CW = os.path.join(ROOT, "app/library/toefl/bank-cw-reading.json")
OUT_RDL = os.path.join(ROOT, "app/library/toefl/bank-rdl-reading.json")


def norm(s):
    s = re.sub(r"[&＋]", " and ", str(s or "").lower())
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def files(folder, kind):
    pat = re.compile(r"^R-%s(\d+)-(.+)\.png$" % kind, re.I)
    out = {}
    for name in os.listdir(folder):
        m = pat.match(name)
        if not m:
            continue
        title = m.group(2).replace("\uf022", ":").replace("’", "'").replace("‘", "'").strip()
        out[int(m.group(1))] = title
    return out


def hit_of(kind):
    out = {}
    lib = os.path.join(ROOT, "app/library/toefl")
    want = "complete_words" if kind == "CW" else "daily_life"
    for name in os.listdir(lib):
        if not re.match(r"set-\d+-reading\.json$", name):
            continue
        paper = json.load(open(os.path.join(lib, name)))
        for t in paper.get("tasks") or []:
            if t.get("type") != want:
                continue
            out[norm(t.get("title") or "")] = t
    return out


def clone(src, set_id, title, zh):
    t = json.loads(json.dumps(src))
    t["title"] = title
    t["titleZh"] = zh or t.get("titleZh") or title
    t["set"] = set_id
    t.pop("module", None)
    return t


def stamp(kind, folder, out_path):
    paper = json.load(open(out_path))
    listing = files(folder, kind)
    hit = hit_of(kind)
    by_title = {}
    for t in paper.get("tasks") or []:
        by_title.setdefault(norm(t.get("title") or ""), []).append(t)
    files_by_title = {}
    for n, title in listing.items():
        files_by_title.setdefault(norm(title), []).append((n, title))
    stamped = 0
    added = 0
    for key, items in files_by_title.items():
        items.sort()
        tasks = by_title.get(key) or []
        src = hit.get(key)
        zh = (src or {}).get("titleZh") or ""
        while len(tasks) < len(items):
            n, title = items[len(tasks)]
            if not src:
                raise SystemExit("no HIT clone for R-%s%s %s" % (kind, n, title))
            extra = clone(src, "R-%s%s" % (kind, n), title, zh)
            paper["tasks"].append(extra)
            tasks.append(extra)
            added += 1
        for (n, title), task in zip(items, tasks):
            task["set"] = "R-%s%s" % (kind, n)
            if zh and (not task.get("titleZh") or task.get("titleZh") == task.get("title")):
                task["titleZh"] = zh
            stamped += 1
    missing = [t.get("title") for t in paper["tasks"] if not t.get("set")]
    json.dump(paper, open(out_path, "w"), ensure_ascii=False, indent=2)
    print(kind, "stamped", stamped, "added", added, "total", len(paper["tasks"]), "no-set", missing)


if __name__ == "__main__":
    stamp("CW", CW_DIR, OUT_CW)
    stamp("RDL", RDL_DIR, OUT_RDL)
