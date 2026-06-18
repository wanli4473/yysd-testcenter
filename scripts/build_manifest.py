#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_manifest.py
=================
Scans the `exams/` folder for exam HTML files and regenerates
`exams/manifest.json`, the index the website reads to show the exam list.

This runs automatically via GitHub Actions every time a file is added to or
removed from the `exams/` folder, so the admin never has to edit JSON by hand.

How metadata is determined for each exam (in priority order):
  1. <meta name="exam:title|type|category|duration|description" content="...">
     tags embedded in the HTML file (recommended — added by the admin tool).
  2. Fallbacks:
       title       -> the <title> of the HTML, else a prettified filename
       type        -> guessed from filename keywords, else "other"
       category    -> guessed from filename keywords, else ""
       duration    -> default per type (reading/listening 30-60, writing 60...)
       added date  -> first git commit date of the file, else file mtime

No third-party dependencies — uses only the Python standard library.
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
EXAMS_DIR = os.path.join(ROOT, "exams")
MANIFEST = os.path.join(EXAMS_DIR, "manifest.json")

VALID_TYPES = {"listening", "reading", "writing", "speaking", "full", "other"}

# Default duration (minutes) when the exam does not declare one.
DEFAULT_DURATION = {
    "listening": 40, "reading": 60, "writing": 60,
    "speaking": 15, "full": 165, "other": 0,
}

TYPE_KEYWORDS = [
    ("listening", ["listening", "听力"]),
    ("reading",   ["reading", "阅读"]),
    ("writing",   ["writing", "写作"]),
    ("speaking",  ["speaking", "口语"]),
    ("full",      ["full", "complete", "全套", "全真", "套卷"]),
]
CAT_KEYWORDS = [
    ("academic", ["academic", "学术", "-a-", "_a_"]),
    ("general",  ["general", "培训", "-g-", "_g_", "gt"]),
]


def read_text(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def find_meta(html, name):
    """Return content of <meta name="exam:NAME" content="..."> if present."""
    pattern = re.compile(
        r'<meta[^>]*name=["\']exam:%s["\'][^>]*content=["\']([^"\']*)["\']' % re.escape(name),
        re.IGNORECASE,
    )
    m = pattern.search(html)
    if m:
        return m.group(1).strip()
    # also support attribute order: content first, name second
    pattern2 = re.compile(
        r'<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']exam:%s["\']' % re.escape(name),
        re.IGNORECASE,
    )
    m = pattern2.search(html)
    return m.group(1).strip() if m else None


def find_title_tag(html):
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else None


def guess_from_keywords(haystack, table, default):
    low = haystack.lower()
    for value, words in table:
        for w in words:
            if w.lower() in low:
                return value
    return default


def slugify(name):
    s = name.lower()
    s = re.sub(r"[^a-z0-9一-鿿]+", "-", s)
    return s.strip("-") or "exam"


def git_added_date(path):
    try:
        out = subprocess.check_output(
            ["git", "log", "--diff-filter=A", "--follow", "--format=%cs", "-1", "--", path],
            cwd=ROOT, stderr=subprocess.DEVNULL,
        ).decode().strip()
        if out:
            return out  # YYYY-MM-DD
    except Exception:
        pass
    ts = os.path.getmtime(path)
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")


def prettify(filename_stem):
    return re.sub(r"[-_]+", " ", filename_stem).strip().title()


def build_entry(filename):
    path = os.path.join(EXAMS_DIR, filename)
    stem = os.path.splitext(filename)[0]
    html = read_text(path)
    hint = stem + " " + (find_title_tag(html) or "")

    etype = (find_meta(html, "type") or "").lower()
    if etype not in VALID_TYPES:
        etype = guess_from_keywords(hint, TYPE_KEYWORDS, "other")

    category = (find_meta(html, "category") or "").lower()
    if category not in ("academic", "general", ""):
        category = ""
    if not category:
        category = guess_from_keywords(hint, CAT_KEYWORDS, "")

    title = find_meta(html, "title") or find_title_tag(html) or prettify(stem)

    dur_raw = find_meta(html, "duration")
    try:
        duration = int(dur_raw)
    except (TypeError, ValueError):
        duration = DEFAULT_DURATION.get(etype, 0)

    return {
        "id": slugify(stem),
        "file": filename,
        "title": title,
        "type": etype,
        "category": category,
        "duration": duration,
        "description": find_meta(html, "description") or "",
        "added": git_added_date(path),
    }


def main():
    if not os.path.isdir(EXAMS_DIR):
        print("exams/ folder not found", file=sys.stderr)
        sys.exit(1)

    files = sorted(
        f for f in os.listdir(EXAMS_DIR)
        if f.lower().endswith((".html", ".htm")) and not f.startswith(".")
    )

    exams = []
    seen_ids = set()
    for f in files:
        try:
            entry = build_entry(f)
        except Exception as e:
            print("Skipping %s: %s" % (f, e), file=sys.stderr)
            continue
        # ensure unique ids
        base_id = entry["id"]
        n = 2
        while entry["id"] in seen_ids:
            entry["id"] = "%s-%d" % (base_id, n)
            n += 1
        seen_ids.add(entry["id"])
        exams.append(entry)

    manifest = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(exams),
        "exams": exams,
    }

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("Wrote %s with %d exam(s)." % (os.path.relpath(MANIFEST, ROOT), len(exams)))
    for e in exams:
        print("  - [%s] %s  (%s)" % (e["type"], e["title"], e["file"]))


if __name__ == "__main__":
    main()
