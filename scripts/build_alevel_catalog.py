#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_alevel_catalog.py — scan library/mock/alevel/**/papers/*.pdf → alevel-catalog.json

Filename: {code}_{session}{yy}_{qp|ms}_{paper}.pdf
  e.g. 9709_s24_qp_12.pdf  |  9MA0_s24_qp_01.pdf  |  7367_w23_ms_02.pdf
"""

import json
import os
import re
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from alevel_subjects import BOARDS, BOARD_ORDER, SUBJECTS  # noqa: E402

ROOT = os.path.dirname(HERE)
ALEVEL_ROOT = os.path.join(ROOT, "library", "mock", "alevel")
CATALOG_PATH = os.path.join(ROOT, "library", "alevel-catalog.json")

FILE_RE = re.compile(
    r"^([A-Za-z0-9]+)_([msw])(\d{2})_(qp|ms)_(\d+)\.pdf$",
    re.I,
)

SEASON_LABEL = {
    "m": {"en": "Feb/Mar", "zh": "春季 (Feb/Mar)"},
    "s": {"en": "May/Jun", "zh": "夏季 (May/Jun)"},
    "w": {"en": "Oct/Nov", "zh": "冬季 (Oct/Nov)"},
}


def norm_code(code):
    return str(code).upper()


def parse_pdf_name(fname, meta):
    m = FILE_RE.match(fname)
    if not m:
        return None
    code_raw, season, yy, kind, paper = m.groups()
    code_key = norm_code(code_raw)
    if code_key != norm_code(meta["code"]):
        return None
    season, kind = season.lower(), kind.lower()
    year = 2000 + int(yy)
    board_id = meta["board"]
    board_label = BOARDS[board_id]["label"]
    code = meta["code"]
    sid = f"{board_id}-{code_key.lower()}-{year}-{season}-{paper}-{kind}"
    season_info = SEASON_LABEL.get(season, {"en": season, "zh": season})
    type_zh = "真题" if kind == "qp" else "官方答案"
    title = (
        f"{board_label} {code} {meta['nameZh']} · {year} {season_info['zh']} · "
        f"Paper {paper} · {type_zh}"
    )
    return {
        "id": sid,
        "board": board_id,
        "code": code,
        "slug": None,
        "year": year,
        "season": season,
        "seasonLabel": season_info["en"],
        "seasonLabelZh": season_info["zh"],
        "paper": paper,
        "type": kind,
        "typeLabel": "Question Paper" if kind == "qp" else "Mark Scheme",
        "typeLabelZh": type_zh,
        "title": title,
        "access": "free",
        "file": None,
    }


def board_subjects(board_id, items):
    out = []
    for slug, meta in SUBJECTS.items():
        if meta["board"] != board_id:
            continue
        code = meta["code"]
        out.append({
            "slug": slug,
            "code": code,
            "name": meta["name"],
            "nameZh": meta["nameZh"],
            "icon": meta["icon"],
            "board": board_id,
            "paperCount": sum(
                1 for it in items
                if it["board"] == board_id and norm_code(it["code"]) == norm_code(code) and it["type"] == "qp"
            ),
            "updatedYear": max(
                (it["year"] for it in items
                 if it["board"] == board_id and norm_code(it["code"]) == norm_code(code) and it["type"] == "qp"),
                default=None,
            ),
        })
    out.sort(key=lambda s: s["nameZh"])
    return out


def scan():
    items = []
    for slug, meta in SUBJECTS.items():
        board = meta["board"]
        papers_dir = os.path.join(ALEVEL_ROOT, board, slug, "papers")
        if not os.path.isdir(papers_dir):
            continue
        for fname in sorted(os.listdir(papers_dir)):
            if not fname.lower().endswith(".pdf"):
                continue
            parsed = parse_pdf_name(fname, meta)
            if not parsed:
                continue
            parsed["slug"] = slug
            parsed["file"] = f"mock/alevel/{board}/{slug}/papers/{fname}"
            items.append(parsed)
    items.sort(key=lambda x: (
        x["board"], x["code"], -x["year"], x["season"], x["paper"], x["type"]
    ))
    return items


def build_catalog():
    items = scan()
    boards = []
    for board_id in BOARD_ORDER:
        if board_id not in BOARDS:
            continue
        meta = BOARDS[board_id]
        subjects = board_subjects(board_id, items)
        boards.append({
            "id": board_id,
            "label": meta["label"],
            "labelZh": meta["labelZh"],
            "subjects": subjects,
        })
    return {
        "version": 1,
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "boards": boards,
        "items": items,
    }


def main():
    catalog = build_catalog()
    os.makedirs(os.path.dirname(CATALOG_PATH), exist_ok=True)
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
        f.write("\n")
    qp = sum(1 for it in catalog["items"] if it["type"] == "qp")
    print(f"Wrote {CATALOG_PATH} — {len(catalog['boards'])} boards, {qp} QPs, {len(catalog['items'])} files")


if __name__ == "__main__":
    main()
