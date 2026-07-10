#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_caie_papers.py — download CAIE A-Level QP + MS (StudyHatch + XtraPapers fallback).

  python3 scripts/fetch_caie_papers.py --year 2025
  python3 scripts/build_alevel_catalog.py
"""

import argparse
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from alevel_subjects import SUBJECTS  # noqa: E402

ROOT = os.path.dirname(HERE)
ALEVEL_ROOT = os.path.join(ROOT, "library", "mock", "alevel")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X) YYSD/1.0"
SH_BASE = "https://studyhatch.com/Past-Papers/PDFs/CIE_AL"
XP_BASE = "https://xtrapapers.co/papers/caie/as-and-a-level"

CAIE_CODES = ["9709", "9231", "9708", "9702", "9701", "9706", "9700"]
XP_SUBJECT = {
    "9709": "mathematics-9709",
    "9231": "further-mathematics-9231",
    "9708": "economics-9708",
    "9702": "physics-9702",
    "9701": "chemistry-9701",
    "9706": "accounting-9706",
    "9700": "biology-9700",
}
SH_SESSION = {"m": "FM", "s": "MJ", "w": "ON"}
XP_SESSION = {
    (y, "m"): f"{y}-march" for y in range(2021, 2026)
}
for y in range(2021, 2026):
    XP_SESSION[(y, "s")] = f"{y}-may-june"
    XP_SESSION[(y, "w")] = f"{y}-oct-nov"

FILE_RE = re.compile(r"([A-Za-z0-9]+_[msw]\d{2}_(?:qp|ms)_\d+\.pdf)", re.I)
XP_LINK_RE = re.compile(
    r'href="(https://xtrapapers\.co/papers/caie/as-and-a-level/[^"]+/([A-Za-z0-9]+_[msw]\d{2}_(?:qp|ms)_\d+)\.pdf)/download"'
)


def slug_for_code(code):
    for slug, meta in SUBJECTS.items():
        if meta["board"] == "caie" and meta["code"] == code:
            return slug
    return None


def http_get(url):
    # ponytail: curl works where urllib gets connection refused on StudyHatch
    r = subprocess.run(
        ["curl", "-fsSL", "-A", UA, "--max-time", "90", url],
        capture_output=True,
    )
    if r.returncode != 0:
        err = r.stderr.decode("utf-8", errors="ignore").strip()
        if "404" in err or r.returncode == 22:
            raise FileNotFoundError(url)
        raise RuntimeError(err or f"curl {r.returncode}")
    return r.stdout, 200


def curl_download(url, dest):
    tmp = dest + ".part"
    r = subprocess.run(
        ["curl", "-fsSL", "--retry", "3", "--retry-delay", "2", "-A", UA, "-o", tmp, url],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or r.stdout.strip() or "curl failed")
    with open(tmp, "rb") as f:
        head = f.read(5)
    if head != b"%PDF-":
        os.remove(tmp)
        raise ValueError("not PDF")
    os.replace(tmp, dest)


def studyhatch_files(code, year, season):
    folder = SH_SESSION[season]
    url = f"{SH_BASE}/{code}/{year}/{folder}/"
    try:
        html, _ = http_get(url)
    except FileNotFoundError:
        return []
    text = html.decode("utf-8", errors="ignore")
    names = set(m.group(1) for m in FILE_RE.finditer(text))
    prefix = f"{code}_{season}{str(year)[-2:]}_"
    out = []
    for name in sorted(names):
        if not name.lower().startswith(prefix.lower()):
            continue
        if "_qp_" in name.lower() or "_ms_" in name.lower():
            out.append((name, f"{url}{name}"))
    return out


def xtrapapers_files(code, year, season):
    xp_sub = XP_SUBJECT.get(code)
    session = XP_SESSION.get((year, season))
    if not xp_sub or not session:
        return []
    url = f"{XP_BASE}/{xp_sub}/{session}"
    try:
        html, _ = http_get(url)
    except FileNotFoundError:
        return []
    text = html.decode("utf-8", errors="ignore")
    seen = set()
    out = []
    for m in XP_LINK_RE.finditer(text):
        dl, fname = m.group(1), m.group(2) + ".pdf"
        if fname in seen:
            continue
        seen.add(fname)
        if "_qp_" in fname or "_ms_" in fname:
            out.append((fname, dl))
    return out


def list_files(code, year, season):
    files = studyhatch_files(code, year, season)
    if files:
        return files, "studyhatch"
    if code == "9708" or not files:
        xp = xtrapapers_files(code, year, season)
        if xp:
            return xp, "xtrapapers"
    return [], ""


def purge_placeholders(papers_dir):
    if not os.path.isdir(papers_dir):
        return 0
    n = 0
    for fname in os.listdir(papers_dir):
        path = os.path.join(papers_dir, fname)
        if fname.endswith(".pdf") and os.path.getsize(path) < 25_000:
            os.remove(path)
            n += 1
    return n


def main():
    parser = argparse.ArgumentParser(description="Download CAIE A-Level past papers")
    parser.add_argument("--year", type=int, default=2025, help="Start year (default: 2025)")
    parser.add_argument("--year-end", type=int, help="End year inclusive (default: same as --year)")
    args = parser.parse_args()
    year_end = args.year_end if args.year_end is not None else args.year
    years = range(args.year, year_end + 1)

    stats = {"downloaded": 0, "skipped": 0, "failed": 0}
    print(f"Years: {args.year}–{year_end}", flush=True)
    for code in CAIE_CODES:
        slug = slug_for_code(code)
        if not slug:
            continue
        papers_dir = os.path.join(ALEVEL_ROOT, "caie", slug, "papers")
        os.makedirs(papers_dir, exist_ok=True)
        print(f"\n=== CAIE {code} ===", flush=True)
        for year in years:
            for season in ("m", "s", "w"):
                try:
                    files, src = list_files(code, year, season)
                except Exception as e:
                    print(f"  ! {year}-{season}: list failed: {e}")
                    time.sleep(2)
                    continue
                if not files:
                    continue
                print(f"  {year} {season} ({src}): {len(files)} files", flush=True)
                for fname, url in files:
                    dest = os.path.join(papers_dir, fname)
                    if os.path.isfile(dest) and os.path.getsize(dest) >= 25_000:
                        stats["skipped"] += 1
                        continue
                    try:
                        curl_download(url, dest)
                        stats["downloaded"] += 1
                    except Exception as e:
                        print(f"    FAIL {fname}: {e}")
                        stats["failed"] += 1
                    time.sleep(0.55)
                time.sleep(1.2)
        purged = purge_placeholders(papers_dir)
        if purged:
            print(f"  purged {purged} placeholder(s)")
    print(
        f"\nDone: downloaded={stats['downloaded']} skipped={stats['skipped']} failed={stats['failed']}",
        flush=True,
    )


if __name__ == "__main__":
    main()
