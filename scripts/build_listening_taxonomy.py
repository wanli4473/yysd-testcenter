#!/usr/bin/env python3
"""Build library/listening-taxonomy.json from Desktop Excel + local Cambridge HTML."""
from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from verify_cambridge_mock_pages import load_test  # noqa: E402

TYPE_XLSX = Path("/Users/frankman/Desktop/雅思听力题目分类.xlsx")
SCENE_XLSX = Path("/Users/frankman/Desktop/雅思听力题目场景分类.xlsx")
OUT = ROOT / "library" / "listening-taxonomy.json"
LISTEN_DIR = ROOT / "library" / "mock" / "cambridge-listening"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}

TYPE_ORDER = ["填空题", "配对题", "单选题", "多选题", "地图题", "流程题", "简答题"]
SCENE_ORDER = [
    "求职", "经营管理", "地理", "旅游", "日常生活", "建筑环境", "健康医疗",
    "住宿", "运动", "图书馆", "保险", "新生入学", "作业讨论", "人文社科",
    "生物", "课题研究",
]
TYPE_ALIASES = {
    "填空": "填空题", "填空题": "填空题", "form": "填空题", "notes": "填空题", "table": "填空题",
    "配对": "配对题", "配对题": "配对题", "matching": "配对题",
    "单选": "单选题", "单选题": "单选题", "选择题": "单选题",
    "多选": "多选题", "多选题": "多选题",
    "地图": "地图题", "地图题": "地图题", "map": "地图题",
    "流程": "流程题", "流程题": "流程题", "flowchart": "流程题", "flow chart": "流程题",
    "简答": "简答题", "简答题": "简答题", "sentence": "简答题",
}
DIFF_ALIASES = {"易": "易", "中": "中", "难": "难", "easy": "易", "medium": "中", "hard": "难"}


def col_row(ref: str):
    col, row = "", ""
    for ch in ref:
        if ch.isdigit():
            row += ch
        else:
            col += ch
    return col, int(row) if row else 0


def col_index(col: str) -> int:
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n - 1


def load_workbook(path: Path) -> dict[str, list[list[str]]]:
    with zipfile.ZipFile(path) as z:
        ss = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                ss.append("".join(t.text or "" for t in si.findall(".//m:t", NS)))
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rid_to_target = {}
        for rel in rels:
            rid = rel.attrib.get("Id") or rel.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
            target = rel.attrib.get("Target")
            if rid and target:
                rid_to_target[rid] = target.lstrip("/")
        sheets = {}
        for sh in wb.findall("m:sheets/m:sheet", NS):
            name = sh.attrib.get("name") or "Sheet"
            rid = sh.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
            target = rid_to_target.get(rid, "")
            if not target:
                continue
            if not target.startswith("xl/"):
                target = "xl/" + target
            xml = ET.fromstring(z.read(target))
            cells = defaultdict(dict)
            max_row, max_col = 0, 0
            for c in xml.findall(".//m:c", NS):
                ref = c.attrib.get("r", "")
                col, row = col_row(ref)
                if not row:
                    continue
                t = c.attrib.get("t")
                if t == "inlineStr":
                    val = "".join(x.text or "" for x in c.findall(".//m:t", NS))
                else:
                    v = c.find("m:v", NS)
                    if v is None or v.text is None:
                        val = ""
                    elif t == "s":
                        val = ss[int(v.text)] if v.text.isdigit() and int(v.text) < len(ss) else v.text
                    else:
                        val = v.text
                ci = col_index(col)
                cells[row][ci] = str(val).strip()
                max_row = max(max_row, row)
                max_col = max(max_col, ci)
            rows = []
            for r in range(1, max_row + 1):
                rows.append([cells[r].get(c, "") for c in range(max_col + 1)])
            sheets[name] = rows
    return sheets


def dump_preview(path: Path, sheets: dict) -> None:
    print("===", path.name, "===")
    for name, rows in sheets.items():
        print(" sheet", repr(name), "rows", len(rows))
        for i, row in enumerate(rows[:6]):
            print("  ", i + 1, row[:12])


def norm_header(h: str) -> str:
    return re.sub(r"\s+", "", (h or "").lower())


def pick_col(headers: list[str], *needles: str) -> int | None:
    nh = [norm_header(h) for h in headers]
    for needle in needles:
        n = norm_header(needle)
        for i, h in enumerate(nh):
            if n and n in h:
                return i
    return None


def parse_volume(raw: str) -> str:
    s = str(raw or "").strip()
    m = re.search(r"(?:剑桥?|cam(?:bridge)?|c)\s*(\d{1,2})", s, re.I)
    if m:
        return str(int(m.group(1)))
    m = re.search(r"^(\d{1,2})(?:\.0)?$", s)
    return str(int(m.group(1))) if m else ""


def parse_test(raw: str) -> str:
    s = str(raw or "").strip()
    m = re.search(r"(?:test|t)\s*(\d)", s, re.I)
    if m:
        return m.group(1)
    m = re.search(r"^(\d)(?:\.0)?$", s)
    return m.group(1) if m else ""


def parse_part(raw: str) -> int:
    s = str(raw or "").strip()
    m = re.search(r"(?:part|section|s|p)\s*(\d)", s, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r"^(\d)(?:\.0)?$", s)
    return int(m.group(1)) if m else 0


def parse_q_range(a: str, b: str = "") -> tuple[int, int]:
    blob = " ".join([str(a or ""), str(b or "")])
    # ponytail: require Q so "Test 1 Part 2" is not Q1–2
    m = re.search(r"Q\s*(\d+)\s*[-–—~到至]\s*(\d+)", blob, re.I)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.search(r"Q\s*(\d+)\b", blob, re.I)
    if m:
        n = int(m.group(1))
        return n, n
    return 0, 0


def parse_q_from_row(row: list[str], i_from, i_to, i_range, i_title) -> tuple[int, int]:
    if i_from is not None and i_to is not None:
        a, b = parse_q_range(row[i_from], row[i_to])
        if a:
            return a, b or a
    if i_range is not None:
        a, b = parse_q_range(row[i_range])
        if a:
            return a, b or a
    if i_title is not None:
        a, b = parse_q_range(row[i_title])
        if a:
            return a, b or a
    blob = " ".join(row)
    return parse_q_range(blob)


def norm_type(raw: str) -> str:
    s = str(raw or "").strip()
    if not s:
        return ""
    key = re.sub(r"\s+", "", s).lower()
    if key in TYPE_ALIASES:
        return TYPE_ALIASES[key]
    for k, v in TYPE_ALIASES.items():
        if k in key or k in s:
            return v
    return s if s.endswith("题") else (s + "题" if s else "")


def norm_scene(raw: str) -> str:
    s = re.sub(r"\s+", "", str(raw or "").strip())
    return s


def norm_diff(raw: str) -> str:
    s = str(raw or "").strip()
    if not s:
        return ""
    key = re.sub(r"\s+", "", s).lower()
    return DIFF_ALIASES.get(key) or DIFF_ALIASES.get(s) or (s if s in ("易", "中", "难") else "")


def find_header(rows: list[list[str]]) -> tuple[int, list[str]]:
    for i, row in enumerate(rows[:8]):
        joined = "".join(row)
        if "剑桥系列" in joined or "题型" in joined or ("科目" in joined and "题号" in joined):
            return i, row
    return -1, ["科目", "题号", "剑桥系列"]


def map_row(row: list[str], headers: list[str]) -> dict | None:
    i_vol = pick_col(headers, "册", "剑桥", "volume", "book", "cam")
    i_test = pick_col(headers, "test", "套题", "试卷")
    i_part = pick_col(headers, "part", "section", "部分")
    i_from = pick_col(headers, "起始", "题号起", "from", "qfrom", "开始题")
    i_to = pick_col(headers, "结束", "题号止", "to", "qto", "结束题")
    i_range = pick_col(headers, "题号", "题目", "范围", "questions")
    i_title = pick_col(headers, "标题", "名称", "练习")
    i_type = pick_col(headers, "题型", "题类", "type")
    i_scene = pick_col(headers, "场景", "scene", "话题", "主题")
    i_diff = pick_col(headers, "难度", "难易", "diff")

    vol = parse_volume(row[i_vol] if i_vol is not None and i_vol < len(row) else "")
    test = parse_test(row[i_test] if i_test is not None and i_test < len(row) else "")
    part = parse_part(row[i_part] if i_part is not None and i_part < len(row) else "")
    if not vol or not test:
        # try whole row, e.g. "剑21 Test1 Part1 Q1-6"
        blob = " ".join(row)
        vol = vol or parse_volume(blob)
        test = test or parse_test(blob)
        part = part or parse_part(blob)
    if not vol or not test or not part:
        return None
    q_from, q_to = parse_q_from_row(
        row,
        i_from if i_from is not None else None,
        i_to if i_to is not None else None,
        i_range if i_range is not None else None,
        i_title if i_title is not None else None,
    )
    qtype = norm_type(row[i_type] if i_type is not None and i_type < len(row) else "")
    scene = norm_scene(row[i_scene] if i_scene is not None and i_scene < len(row) else "")
    diff = norm_diff(row[i_diff] if i_diff is not None and i_diff < len(row) else "")
    return {
        "volume": vol,
        "test": test,
        "part": part,
        "qFrom": q_from,
        "qTo": q_to or q_from,
        "qType": qtype,
        "scene": scene,
        "diff": diff,
    }


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
    for path in sorted(LISTEN_DIR.glob("cambridge-*-test-*.html")):
        m = re.search(r"cambridge-(\d+)-test-(\d+)\.html$", path.name)
        if not m:
            continue
        vol, test = m.group(1), m.group(2)
        try:
            data = load_test(path)
        except Exception as e:
            print("WARN html", path.name, e)
            continue
        for sec in data.get("sections") or []:
            sid = int(sec.get("id") or 0)
            ranges = []
            for g in sec.get("groups") or []:
                nos = [int(q["no"]) for q in (g.get("questions") or []) if q.get("no") is not None]
                if nos:
                    ranges.append((min(nos), max(nos)))
            out[(vol, test, sid)] = ranges
    return out


def group_id(vol, test, part, q_from, q_to) -> str:
    return "cambridge-%s-test-%s-s%s-q%s-%s" % (vol, test, part, q_from, q_to)


def part_id(vol, test, part) -> str:
    return "cambridge-%s-test-%s-s%s" % (vol, test, part)


def unique_keep_order(items: list[str], preferred: list[str]) -> list[str]:
    seen = set()
    out = []
    for x in preferred:
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    for x in items:
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    return out


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
        print("type sample", {k: type_rows[0][k] for k in type_rows[0] if k != "_headers"})
    if scene_rows:
        print("scene sample", {k: scene_rows[0][k] for k in scene_rows[0] if k != "_headers"})

    html = html_groups()
    groups = []
    seen_g = set()
    skip_no_html = []
    for rec in type_rows:
        vol, test, part = rec["volume"], rec["test"], rec["part"]
        q_from, q_to = rec["qFrom"], rec["qTo"]
        if not q_from:
            # 题型练习 must have a range; skip empty
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
            "parentId": "cambridge-%s-test-%s" % (vol, test),
            "volume": vol,
            "test": test,
            "part": part,
            "qFrom": q_from,
            "qTo": q_to,
            "qType": rec["qType"] or "填空题",
            "scene": rec["scene"],
            "diff": rec["diff"],
        })

    # scene map: part-level. Prefer scene workbook; fill from type rows if missing.
    scene_of = {}
    for rec in scene_rows:
        key = (rec["volume"], rec["test"], rec["part"])
        sc = rec["scene"]
        if sc:
            scene_of[key] = sc
    for rec in type_rows:
        key = (rec["volume"], rec["test"], rec["part"])
        if rec["scene"] and key not in scene_of:
            scene_of[key] = rec["scene"]
        # also stamp scene onto groups
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
            "parentId": "cambridge-%s-test-%s" % (vol, test),
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


if __name__ == "__main__":
    main()
