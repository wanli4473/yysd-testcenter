#!/usr/bin/env python3
"""Parse New Oriental IELTS speaking 机经 PDF (纯题目版) into jiijing JSON bank."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from pypdf import PdfReader

NOISE = {
    "必备话题",
    "本季新题",
    "保留旧题",
    "雅思教研中心",
    "雅思研发中心",
    "People:",
    "Place:",
    "Event:",
    "Object:",
    "Things:",
}


def slug(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.strip().lower()).strip("-")
    return (s[:48] or "x")


def extract_text(pdf: Path) -> str:
    reader = PdfReader(str(pdf))
    parts = []
    for p in reader.pages:
        parts.append(p.extract_text() or "")
    full = "\n".join(parts).replace("\r", "\n")
    return re.sub(r"[ \t]+", " ", full)


def parse_part1(full: str) -> list[dict]:
    m1 = re.search(r"1 Topic Pool——Part One", full)
    m2 = re.search(r"3 Topic Pool——Part 2&3|2 Topic Pool", full)
    if not m1 or not m2:
        return []
    part1_text = full[m1.end() : m2.start()]
    lines = [ln.strip() for ln in part1_text.split("\n") if ln.strip()]
    lines = [ln for ln in lines if not re.fullmatch(r"\d{1,2}", ln)]

    i = 0
    while i < len(lines) and lines[i] not in ("Study", "Work"):
        i += 1

    part1: list[dict] = []
    current = None
    while i < len(lines):
        ln = lines[i]
        if ln in NOISE or ln.startswith("•") or "Topic Pool" in ln:
            i += 1
            continue
        qm = re.match(r"^(\d{1,2})\s+(.+)$", ln)
        if qm and current is not None:
            q = qm.group(2).strip()
            while i + 1 < len(lines):
                nxt = lines[i + 1]
                if re.match(r"^\d{1,2}\s+", nxt) or nxt in NOISE or re.fullmatch(r"\d{1,2}", nxt):
                    break
                if (
                    "?" not in nxt
                    and len(nxt) < 40
                    and not nxt[0].islower()
                    and not re.match(r"^\d", nxt)
                    and not nxt.startswith("(")
                    and current["questions"]
                    and (current["questions"][-1].endswith("?") or current["questions"][-1].endswith(")"))
                ):
                    break
                if "?" in nxt or nxt.startswith("(") or nxt[0].islower() or len(nxt) > 40:
                    q = current["questions"][-1] + " " + nxt if False else q  # noqa keep structure
                    # append to last after we push q once
                    pass
                break
            current["questions"].append(q)
            # merge wraps onto last question
            while i + 1 < len(lines):
                nxt = lines[i + 1]
                if re.match(r"^\d{1,2}\s+", nxt) or nxt in NOISE or re.fullmatch(r"\d{1,2}", nxt):
                    break
                looks_topic = (
                    "?" not in nxt
                    and len(nxt) < 40
                    and not nxt[0].islower()
                    and not re.match(r"^\d", nxt)
                    and not nxt.startswith("(")
                )
                if looks_topic and (current["questions"][-1].endswith("?") or current["questions"][-1].endswith(")")):
                    break
                if "?" in nxt or nxt.startswith("(") or nxt[0].islower() or len(nxt) > 40:
                    current["questions"][-1] += " " + nxt
                    i += 1
                    continue
                break
            i += 1
            continue
        if (
            len(ln) <= 45
            and not ln.endswith("?")
            and not ln.startswith("Describe")
            and not re.match(r"^\d", ln)
            and ln not in NOISE
            and re.match(r"^[A-Za-z]", ln)
        ):
            if current and current["questions"]:
                part1.append(current)
            current = {"id": "p1-" + slug(ln), "topic": ln, "questions": []}
            i += 1
            continue
        i += 1
    if current and current["questions"]:
        part1.append(current)

    seen: dict[str, dict] = {}
    for t in part1:
        key = t["topic"].lower()
        if key not in seen or len(t["questions"]) > len(seen[key]["questions"]):
            seen[key] = t
    return list(seen.values())


def join_describe_title(prev: str) -> str | None:
    """Rebuild Describe title from end of previous chunk, joining wrapped lines."""
    lines = [ln.strip() for ln in prev.split("\n") if ln.strip()]
    # find last line that starts with Describe (possibly mid-wrap earlier)
    start = None
    for idx in range(len(lines) - 1, -1, -1):
        if lines[idx].startswith("Describe") or lines[idx].startswith("• Describe"):
            start = idx
            break
    if start is None:
        # maybe Describe started earlier and continued
        for idx in range(len(lines) - 1, -1, -1):
            if "Describe" in lines[idx]:
                # walk back to Describe start
                j = idx
                while j > 0 and not lines[j].lstrip("• ").startswith("Describe"):
                    j -= 1
                start = j
                break
    if start is None:
        return None
    parts = []
    for ln in lines[start:]:
        ln = ln.lstrip("• ").strip()
        if ln in NOISE:
            break
        if ln.lower().startswith("you should say"):
            break
        parts.append(ln)
    title = re.sub(r"\s+", " ", " ".join(parts)).strip()
    title = re.sub(r"^(•\s*)+", "", title)
    title = re.sub(r"\s*(本季新题|保留旧题)\s*$", "", title).strip()
    if not title.lower().startswith("describe"):
        return None
    return title


def parse_part2(full: str) -> list[dict]:
    m2 = re.search(r"3 Topic Pool——Part 2&3|2 Topic Pool", full)
    section = full[m2.start() :] if m2 else full
    chunks = re.split(r"(?i)You should say:\s*", section)
    part2: list[dict] = []
    for ci in range(1, len(chunks)):
        title = join_describe_title(chunks[ci - 1])
        if not title:
            continue
        body = chunks[ci]
        bullets: list[str] = []
        part3: list[str] = []
        blines = [ln.strip() for ln in body.split("\n") if ln.strip()]
        mode = "bullets"
        for ln in blines:
            if re.match(r"(?i)^part\s*3\b", ln):
                mode = "part3"
                continue
            if ln in NOISE:
                continue
            if re.fullmatch(r"\d{1,2}", ln):
                continue
            if ln.lstrip("• ").lower().startswith("describe"):
                break
            if mode == "bullets":
                qm = re.match(r"^(\d{1,2})\s+(.+)$", ln)
                if qm:
                    mode = "part3"
                    part3.append(qm.group(2).strip())
                    continue
                bullets.append(ln)
                if ln.lower().startswith("and explain") or len(bullets) >= 5:
                    if ln.lower().startswith("and explain"):
                        mode = "wait_part3"
                continue
            if mode == "wait_part3":
                if re.match(r"(?i)^part\s*3\b", ln) or re.match(r"^\d{1,2}\s+", ln):
                    mode = "part3"
                    if re.match(r"(?i)^part\s*3\b", ln):
                        continue
                else:
                    continue
            qm = re.match(r"^(\d{1,2})\s+(.+)$", ln)
            if qm:
                part3.append(qm.group(2).strip())
            elif part3 and not part3[-1].endswith("?"):
                part3[-1] += " " + ln
            elif ln.endswith("?"):
                part3.append(ln)

        clean_b = []
        for b in bullets:
            if b.lstrip("• ").lower().startswith("describe"):
                break
            if re.match(r"(?i)^part\s*3", b):
                break
            clean_b.append(b)
            if b.lower().startswith("and explain"):
                break
        if len(clean_b) < 2:
            continue
        h = hashlib.md5(title.encode()).hexdigest()[:6]
        part2.append(
            {
                "id": f"p2-{h}-{slug(title)[:30]}",
                "title": title,
                "bullets": clean_b[:5],
                "part3": part3[:8],
            }
        )

    seen: dict[str, dict] = {}
    for t in part2:
        key = re.sub(r"\s+", " ", t["title"].lower())
        if key not in seen or len(t["part3"]) > len(seen[key]["part3"]):
            seen[key] = t
    return list(seen.values())


def parse_pdf(pdf: Path, bank_id: str, title: str) -> dict:
    full = extract_text(pdf)
    return {
        "id": bank_id,
        "title": title,
        "source": "新东方在线雅思研发中心 · 纯题目版",
        "part1": parse_part1(full),
        "part2": parse_part2(full),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--bank-id", default="2026-q2")
    ap.add_argument("--title", default="2026年第二季度雅思口语机经")
    ap.add_argument(
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "speaking" / "jiijing-banks",
    )
    args = ap.parse_args()
    bank = parse_pdf(args.pdf, args.bank_id, args.title)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    out = args.out_dir / f"{args.bank_id}.json"
    out.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    active = args.out_dir.parent / "jiijing-active.json"
    active.write_text(json.dumps({"bankId": args.bank_id}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"part1={len(bank['part1'])} part2={len(bank['part2'])} -> {out}")
    assert bank["part1"], "part1 empty"
    assert bank["part2"], "part2 empty"
    # titles should not end mid-word like '(e.g. a'
    bad = [t["title"] for t in bank["part2"] if t["title"].endswith(" a") or t["title"].endswith(" the")]
    print("truncated_titles", len(bad))
    if bank["part2"]:
        print("sample:", bank["part2"][0]["title"][:120])


if __name__ == "__main__":
    main()
