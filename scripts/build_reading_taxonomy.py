#!/usr/bin/env python3
"""Build library/reading-taxonomy.json from Desktop Excel + local Cambridge HTML."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_listening_taxonomy import (  # noqa: E402
    dump_preview,
    find_header,
    load_workbook,
    map_row,
    unique_keep_order,
)
from verify_cambridge_mock_pages import load_test  # noqa: E402

TYPE_XLSX = Path("/Users/frankman/Desktop/雅思阅读题目分类.xlsx")
SCENE_XLSX = Path("/Users/frankman/Desktop/雅思阅读场景分类.xlsx")
OUT = ROOT / "library" / "reading-taxonomy.json"
READ_DIR = ROOT / "library" / "mock" / "cambridge-reading"

TYPE_ORDER = ["总结题", "判断题", "单选题", "多选题", "段落匹配题", "细节匹配题", "填空题", "选段意题"]
SCENE_ORDER = [
    "历史发展", "自然科技", "社会人文", "生态环保",
    "语言教育", "生物研究", "财经商业", "医疗健康",
]


def parse_book(path: Path) -> tuple[list[dict], list[str]]:
    sheets = load_workbook(path)
    dump_preview(path, sheets)
    items = []
    notes = []
    for name, rows in sheets.items():
        if not rows:
            continue
        header_i, headers = find_header(rows)
        start = 0 if header_i < 0 else header_i + 1
        notes.append("%s header@%s %s" % (name, header_i + 1, headers[:10]))
        parsed_n = 0
        for row in rows[start:]:
            if not any(str(c).strip() for c in row):
                continue
            rec = map_row(row, headers)
            if not rec:
                continue
            rec["_sheet"] = name
            if name in SCENE_ORDER and not rec["scene"]:
                rec["scene"] = name
            if name in TYPE_ORDER and not rec["qType"]:
                rec["qType"] = name
            items.append(rec)
            parsed_n += 1
        notes.append("%s parsed %s" % (name, parsed_n))
    return items, notes


def html_groups() -> dict[tuple, list[tuple[int, int]]]:
    out = {}
    for path in sorted(READ_DIR.glob("cambridge-*-test-*-reading.html")):
        m = re.search(r"cambridge-(\d+)-test-(\d+)-reading\.html$", path.name)
        if not m:
            continue
        vol, test = m.group(1), m.group(2)
        try:
            data = load_test(path)
        except Exception as e:
            print("WARN html", path.name, e)
            continue
        for sec in data.get("passages") or []:
            sid = int(sec.get("id") or 0)
            ranges = []
            for g in sec.get("groups") or []:
                nos = [int(q["no"]) for q in (g.get("questions") or []) if q.get("no") is not None]
                if nos:
                    ranges.append((min(nos), max(nos)))
            out[(vol, test, sid)] = ranges
    return out


def group_id(vol, test, part, q_from, q_to) -> str:
    return "cambridge-%s-test-%s-reading-p%s-q%s-%s" % (vol, test, part, q_from, q_to)


def part_id(vol, test, part) -> str:
    return "cambridge-%s-test-%s-reading-p%s" % (vol, test, part)


def parent_id(vol, test) -> str:
    return "cambridge-%s-test-%s-reading" % (vol, test)


def main() -> None:
    if not TYPE_XLSX.exists():
        raise SystemExit("missing " + str(TYPE_XLSX))
    if not SCENE_XLSX.exists():
        raise SystemExit("missing " + str(SCENE_XLSX))

    type_rows, type_notes = parse_book(TYPE_XLSX)
    scene_rows, scene_notes = parse_book(SCENE_XLSX)
    print("TYPE notes:", type_notes)
    print("SCENE notes:", scene_notes)
    print("type rows", len(type_rows), "scene rows", len(scene_rows))
    if type_rows:
        print("type sample", {k: type_rows[0][k] for k in type_rows[0] if not k.startswith("_")})
    if scene_rows:
        print("scene sample", {k: scene_rows[0][k] for k in scene_rows[0] if not k.startswith("_")})

    html = html_groups()
    groups = []
    seen_g = set()
    skip_no_html = []
    for rec in type_rows:
        vol, test, part = rec["volume"], rec["test"], rec["part"]
        q_from, q_to = rec["qFrom"], rec["qTo"]
        if not q_from:
            continue
        key = (vol, test, part)
        if key not in html:
            skip_no_html.append("%s T%s P%s" % (vol, test, part))
            continue
        gid = group_id(vol, test, part, q_from, q_to)
        if gid in seen_g:
            continue
        seen_g.add(gid)
        groups.append({
            "id": gid,
            "parentId": parent_id(vol, test),
            "volume": vol,
            "test": test,
            "part": part,
            "qFrom": q_from,
            "qTo": q_to,
            "qType": rec["qType"] or rec.get("_sheet") or "填空题",
            "scene": rec["scene"],
            "diff": rec["diff"],
        })

    scene_of = {}
    for rec in scene_rows:
        key = (rec["volume"], rec["test"], rec["part"])
        sc = rec["scene"]
        # ponytail: first sheet wins; Excel duplicates used to overwrite
        if sc and key not in scene_of:
            scene_of[key] = sc
    for rec in type_rows:
        key = (rec["volume"], rec["test"], rec["part"])
        if rec["scene"] and key not in scene_of:
            scene_of[key] = rec["scene"]
    for g in groups:
        key = (g["volume"], g["test"], g["part"])
        if not g.get("scene") and key in scene_of:
            g["scene"] = scene_of[key]

    parts = []
    seen_p = set()
    for key, sc in scene_of.items():
        vol, test, part = key
        if key not in html:
            continue
        pid = part_id(vol, test, part)
        if pid in seen_p:
            continue
        seen_p.add(pid)
        parts.append({
            "id": pid,
            "parentId": parent_id(vol, test),
            "volume": vol,
            "test": test,
            "part": part,
            "scene": sc,
        })
    parts.sort(key=lambda p: (-int(p["volume"]), int(p["test"]), p["part"]))
    groups.sort(key=lambda g: (-int(g["volume"]), int(g["test"]), g["part"], g["qFrom"]))

    types = unique_keep_order([g["qType"] for g in groups], TYPE_ORDER)
    scenes = unique_keep_order([p["scene"] for p in parts] + [g["scene"] for g in groups], SCENE_ORDER)

    payload = {
        "types": types,
        "scenes": scenes,
        "diffs": ["易", "中", "难"],
        "groups": groups,
        "parts": parts,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT, "groups", len(groups), "parts", len(parts), "types", types, "scenes", scenes)
    if skip_no_html:
        uniq = sorted(set(skip_no_html))
        print("skip no html", len(uniq), uniq[:20])

    # ponytail: fail if Excel parse / id shape broke
    assert groups, "no reading groups"
    assert parts, "no reading scene parts"
    assert groups[0]["id"].startswith("cambridge-") and "-reading-p" in groups[0]["id"]
    assert "-q" in groups[0]["id"]
    assert parts[0]["id"].endswith("-p" + str(parts[0]["part"])) or "-reading-p" in parts[0]["id"]
    assert "判断题" in types or "填空题" in types
    assert "社会人文" in scenes or scenes


if __name__ == "__main__":
    main()
