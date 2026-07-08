"""Extract reading passages from Cambridge 21 PDF."""

from __future__ import annotations

import re
from pathlib import Path

import fitz

PDF = Path("/Users/frankman/Desktop/剑21完整/剑桥雅思21（A类）.pdf")

# ponytail: hard-coded page ranges — upgrade path: scan for PASSAGE markers dynamically
PASSAGE_PAGES: dict[int, list[tuple[int, int]]] = {
    1: [(17, 18), (21, 22), (26, 27)],
    2: [(39, 40), (43, 44), (47, 48)],
    3: [(61, 62), (65, 66), (69, 70)],
    4: [(82, 83), (86, 87), (90, 91)],
}

SKIP = re.compile(
    r"^(Test \d|READING|Reading|PASSAGE \d|You should spend|Passage \d below\.?|Questions?\s+\d|\d+$|➔)",
    re.I,
)


def _label_para(p: str) -> str:
    m = re.match(r"^([A-G])\s+(.*)", p, re.S)
    if m:
        return f'<span class="para-label">{m.group(1)}</span>{m.group(2)}'
    return p


def _split_inlined_labels(p: str) -> list[str]:
    parts = re.split(r"(?<=\.)\s+([A-G])\s+", p)
    if len(parts) <= 1:
        return [p]
    out = [parts[0]]
    for i in range(1, len(parts), 2):
        out.append(f"{parts[i]} {parts[i + 1]}")
    return out


def _merge(lines: list[str]) -> list[str]:
    paras: list[str] = []
    cur = ""
    for ln in lines:
        if re.match(r"^[A-G]\s", ln):
            if cur:
                paras.extend(_split_inlined_labels(cur))
            cur = ln
        elif not cur:
            cur = ln
        else:
            cur += " " + ln
    if cur:
        paras.extend(_split_inlined_labels(cur))
    return paras


def passages_for_test(test_no: int) -> list[dict]:
    doc = fitz.open(str(PDF))
    out: list[dict] = []
    for idx, (start, end) in enumerate(PASSAGE_PAGES[test_no], start=1):
        raw: list[str] = []
        for p in range(start - 1, end):
            raw.extend(doc[p].get_text().splitlines())
        lines: list[str] = []
        title = ""
        for ln in raw:
            ln = ln.strip()
            if not ln or SKIP.match(ln):
                continue
            if not title and not ln.startswith(("A ", "B ", "C ", "D ", "E ", "F ", "G ")):
                if len(ln) < 120:
                    title = ln
                    continue
            lines.append(ln)
        if not title and lines:
            title = lines[0]
            lines = lines[1:]
        paras = [_label_para(p) for p in _merge(lines)]
        out.append(
            {
                "id": idx,
                "passage": {
                    "title": title,
                    "byline": f"You should spend about 20 minutes on Questions based on Reading Passage {idx} below.",
                    "paras": paras,
                },
            }
        )
    return out
