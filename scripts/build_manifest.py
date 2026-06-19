#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_manifest.py
=================
Scans the `library/` folder for content HTML files (mock exams, study
materials, practice sets) and regenerates `library/manifest.json`, the index
the website reads to build the 模考区 / 学习区 / 练习区 sections.

Runs automatically via GitHub Actions whenever a file changes in `library/`,
so the admin never edits JSON by hand.

Metadata per file (priority order):
  1. <meta name="exam:title|zone|subject|duration|description" content="...">
     embedded in the HTML (recommended — set by the admin upload tool).
  2. Fallbacks:
       title    -> <title> of the HTML, else a prettified filename
       zone     -> guessed from filename/title keywords, else "mock"
       subject  -> guessed from keywords, else first valid subject of the zone
       duration -> declared value, else 0 (untimed)
       added    -> first git commit date of the file, else file mtime

Standard library only — no third-party dependencies.
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LIB_DIR = os.path.join(ROOT, "library")
MANIFEST = os.path.join(LIB_DIR, "manifest.json")

# zone -> list of valid subjects (first = default for that zone)
ZONE_SUBJECTS = {
    "mock":     ["ielts", "pte", "toefl"],
    "practice": ["ielts", "pte", "toefl"],
    "study":    ["grammar", "vocab"],
}
VALID_ZONES = set(ZONE_SUBJECTS.keys())

ZONE_KEYWORDS = [
    ("study",    ["study", "lesson", "grammar", "vocab", "语法", "单词", "词汇", "学习", "讲解", "精讲"]),
    ("practice", ["practice", "exercise", "drill", "练习", "习题", "专项"]),
    ("mock",     ["mock", "test", "full", "exam", "模考", "模拟", "全真", "套卷", "入学测试"]),
]
SUBJECT_KEYWORDS = [
    ("ielts",   ["ielts", "雅思"]),
    ("pte",     ["pte"]),
    ("toefl",   ["toefl", "托福"]),
    ("grammar", ["grammar", "语法"]),
    ("vocab",   ["vocab", "word", "单词", "词汇"]),
]


def read_text(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def find_meta(html, name):
    p1 = re.compile(r'<meta[^>]*name=["\']exam:%s["\'][^>]*content=["\']([^"\']*)["\']' % re.escape(name), re.I)
    m = p1.search(html)
    if m:
        return m.group(1).strip()
    p2 = re.compile(r'<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']exam:%s["\']' % re.escape(name), re.I)
    m = p2.search(html)
    return m.group(1).strip() if m else None


def find_title_tag(html):
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else None


def guess(haystack, table, default):
    low = haystack.lower()
    for value, words in table:
        for w in words:
            if w.lower() in low:
                return value
    return default


def slugify(name):
    s = re.sub(r"[^a-z0-9一-鿿]+", "-", name.lower())
    return s.strip("-") or "item"


def git_added_date(path):
    try:
        out = subprocess.check_output(
            ["git", "log", "--diff-filter=A", "--follow", "--format=%cs", "-1", "--", path],
            cwd=ROOT, stderr=subprocess.DEVNULL,
        ).decode().strip()
        if out:
            return out
    except Exception:
        pass
    return datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc).strftime("%Y-%m-%d")


def prettify(stem):
    return re.sub(r"[-_]+", " ", stem).strip().title()


def build_entry(filename):
    path = os.path.join(LIB_DIR, filename)
    stem = os.path.splitext(filename)[0]
    html = read_text(path)
    hint = stem + " " + (find_title_tag(html) or "")

    zone = (find_meta(html, "zone") or "").lower()
    if zone not in VALID_ZONES:
        zone = guess(hint, ZONE_KEYWORDS, "mock")

    subject = (find_meta(html, "subject") or "").lower()
    if subject not in ZONE_SUBJECTS[zone]:
        subject = guess(hint, SUBJECT_KEYWORDS, "")
        if subject not in ZONE_SUBJECTS[zone]:
            subject = ZONE_SUBJECTS[zone][0]

    title = find_meta(html, "title") or find_title_tag(html) or prettify(stem)

    try:
        duration = int(find_meta(html, "duration"))
    except (TypeError, ValueError):
        duration = 0

    return {
        "id": slugify(stem),
        "file": filename,
        "title": title,
        "zone": zone,
        "subject": subject,
        "duration": duration,
        "description": find_meta(html, "description") or "",
        "added": git_added_date(path),
    }


def main():
    if not os.path.isdir(LIB_DIR):
        print("library/ folder not found", file=sys.stderr)
        sys.exit(1)

    files = sorted(
        f for f in os.listdir(LIB_DIR)
        if f.lower().endswith((".html", ".htm")) and not f.startswith(".")
    )

    items, seen = [], set()
    for f in files:
        try:
            e = build_entry(f)
        except Exception as ex:
            print("Skipping %s: %s" % (f, ex), file=sys.stderr)
            continue
        base = e["id"]
        n = 2
        while e["id"] in seen:
            e["id"] = "%s-%d" % (base, n)
            n += 1
        seen.add(e["id"])
        items.append(e)

    manifest = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(items),
        "items": items,
    }
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("Wrote %s with %d item(s)." % (os.path.relpath(MANIFEST, ROOT), len(items)))
    for e in items:
        print("  - [%s/%s] %s  (%s)" % (e["zone"], e["subject"], e["title"], e["file"]))


if __name__ == "__main__":
    main()
