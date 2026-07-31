#!/usr/bin/env python3
"""
Optional GradCafe public results scraper skeleton.
Default: do NOT run in production pipelines — respect robots.txt / ToS.

Usage (manual):
  python scripts/scrape_gradcafe.py --query "computer science" --pages 2 --out /tmp/gradcafe.json

Maps loosely to Case fields; still needs human review before DB insert.
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
import urllib.request

BASE = "https://www.thegradcafe.com/survey/"


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "youyisida-admission-research/0.1 (educational; contact admin)"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_rows(html: str) -> list[dict]:
    # ponytail: fragile HTML scrape — GradCafe markup changes often
    rows = []
    for m in re.finditer(
        r"(?is)<tr[^>]*>.*?</tr>",
        html,
    ):
        cell = re.sub(r"<[^>]+>", " ", m.group(0))
        cell = re.sub(r"\s+", " ", cell).strip()
        if len(cell) < 20:
            continue
        if "Accept" not in cell and "Reject" not in cell:
            continue
        gpa_m = re.search(r"GPA[:\s]*([0-4]\.\d{1,2})", cell, re.I)
        rows.append(
            {
                "raw": cell[:500],
                "gpa": float(gpa_m.group(1)) if gpa_m else None,
                "admission_result": "Accept" in cell,
            }
        )
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", default="computer science")
    ap.add_argument("--pages", type=int, default=1)
    ap.add_argument("--out", default="gradcafe_sample.json")
    args = ap.parse_args()

    all_rows: list[dict] = []
    for page in range(1, args.pages + 1):
        q = urllib.parse.urlencode({"q": args.query, "page": page})
        url = f"{BASE}?{q}"
        print("GET", url)
        html = fetch(url)
        all_rows.extend(parse_rows(html))
        time.sleep(1.5)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, ensure_ascii=False, indent=2)
    print(f"wrote {len(all_rows)} rows → {args.out}")


if __name__ == "__main__":
    main()
