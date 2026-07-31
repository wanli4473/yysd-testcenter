#!/usr/bin/env python3
"""Fix mock-zone manifest durations and sync exam metadata in HTML files."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "library/manifest.json"
TEST_RE = re.compile(r"const TEST = (\{.*?\n\});", re.S)
DESC_RE = re.compile(r'(<meta name="exam:description" content=")([^"]*)(">)')
DUR_RE = re.compile(r'(<meta name="exam:duration" content=")([^"]*)(">)')
STRAY_DURATION_RE = re.compile(r'(?m)^X">$')
SUBJECT_RE = re.compile(r'(<meta name="exam:subject" content="[^"]+">\n)')
FILE_RE = re.compile(r"cambridge-(\d+)-test-(\d+)")


def load_test(path: Path) -> dict | None:
    text = path.read_text(encoding="utf-8", errors="ignore")
    m = TEST_RE.search(text)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def reading_description(vol: str, test: str, test_data: dict | None) -> str:
    topics = ""
    if test_data:
        titles = []
        for p in test_data.get("passages", []):
            t = (p.get("passage") or {}).get("title") or ""
            if t:
                titles.append(t.strip())
        if len(titles) >= 3:
            short = " / ".join(titles[:3])
            if len(short) > 80:
                short = " / ".join(t[:28] + "…" if len(t) > 28 else t for t in titles[:3])
            topics = f"（{short}）"
    return (
        f"剑桥雅思{vol} Test {test} 学术类阅读（官方真题）：3 篇文章共 40 题{topics}，"
        "可单篇练习或完整模考，自动批改、解析与雅思预估分。"
    )


def writing_description(vol: str, test: str, test_data: dict | None) -> str:
    task1 = "Task 1"
    if test_data and test_data.get("task1"):
        prompt = (test_data["task1"].get("prompt") or "").lower()
        if "map" in prompt:
            task1 = "Task 1 地图对比作文"
        elif "diagram" in prompt or "process" in prompt or "流程" in prompt:
            task1 = "Task 1 流程图作文"
        elif "table" in prompt:
            task1 = "Task 1 表格作文"
        elif "graph" in prompt or "chart" in prompt:
            task1 = "Task 1 图表作文"
        else:
            task1 = "Task 1 图表作文"
    return (
        f"剑桥雅思{vol} Test {test} 学术类写作（官方真题）：{task1} + Task 2 议论文，"
        "限时 60 分钟，自带字数统计、草稿自动保存与官方评分标准自评。"
    )


def mock_duration(item: dict) -> int:
    subj = item.get("subject", "")
    item_id = item.get("id", "")
    if subj == "cambridge-listening":
        return 32
    if subj == "cambridge-reading":
        return 60
    if subj == "cambridge-writing":
        return 60
    if subj == "ielts" and "junior" in item_id:
        return 75
    if subj == "ielts":
        return 180
    return item.get("duration") or 0


def patch_html(path: Path, description: str, duration: int) -> bool:
    text = path.read_text(encoding="utf-8", errors="ignore")
    orig = text
    if DESC_RE.search(text):
        text = DESC_RE.sub(lambda m: m.group(1) + description + m.group(3), text, count=1)
    if DUR_RE.search(text):
        text = DUR_RE.sub(lambda m: m.group(1) + str(duration) + m.group(3), text, count=1)
    elif STRAY_DURATION_RE.search(text):
        text = STRAY_DURATION_RE.sub(
            f'<meta name="exam:duration" content="{duration}">', text, count=1
        )
    elif duration and SUBJECT_RE.search(text):
        text = SUBJECT_RE.sub(
            lambda m: m.group(1) + f'<meta name="exam:duration" content="{duration}">\n',
            text,
            count=1,
        )
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> int:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    by_file: dict[str, dict] = {it["file"]: it for it in data["items"]}
    html_changed = manifest_changed = 0

    for item in data["items"]:
        if item.get("zone") != "mock":
            continue
        dur = mock_duration(item)
        if item.get("duration") != dur:
            item["duration"] = dur
            manifest_changed += 1

        path = ROOT / "library" / item["file"]
        if not path.exists():
            continue

        m = FILE_RE.search(item["file"])
        desc = item.get("description") or ""
        if m and "cambridge-reading" in item["file"]:
            desc = reading_description(m.group(1), m.group(2), load_test(path))
        elif m and "cambridge-writing" in item["file"]:
            desc = writing_description(m.group(1), m.group(2), load_test(path))

        if desc and item.get("description") != desc:
            item["description"] = desc
            manifest_changed += 1

        if patch_html(path, desc or item.get("description", ""), dur):
            html_changed += 1

    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"manifest fields updated: {manifest_changed}")
    print(f"html files patched: {html_changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
