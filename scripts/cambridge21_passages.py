"""Extract reading passages from Cambridge 21 PDF."""

from __future__ import annotations

import re
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.reading_paras import (
    MAX_PARA_CHARS as _MAX_PARA_CHARS,
    clean_para as _clean_para,
    label_para as _label_para,
    resplit_long as _resplit_long,
    to_plain as _to_plain,
)

PDF = Path("/Users/frankman/Desktop/剑21/剑桥雅思21（A类）.pdf")

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

BYLINE = re.compile(r"^A review of .+ book ", re.I)
_FOOTNOTE_LINE = re.compile(r"^[•\*]{1,3}\s|^\*\*\*")

# Section label: A–G + space + word (uppercase + lowercase), not “A I …” / “a single …”
_LABEL = re.compile(r"^([A-G])\s+([A-Z][a-z].*)")

_BODY_START = re.compile(
    r"^(?:Between|Studies|Water hyacinth|The saiga|Located|Ulbe Bosma|In many countries|"
    r"In 2008|Dares Salaam|It is by now|The crowded|"
    r"Between 1908|While there|Gwendoline|Do animals|Studies using)",
    re.I,
)

_CORE_UNLABELED_SPLIT = re.compile(
    r"(?<=\.)\s+(?="
    r"(?:However, I do|Let's |Art also |To say these|In a sense,|One way or another,|"
    r"Perhaps the most |It seems that the more )"
    r")"
)

_EXT_UNLABELED_SPLIT = re.compile(
    r"(?<=\.)\s+(?="
    r"(?:However,|Moreover,|Furthermore,|Nevertheless,|That said,|There's some evidence|While it is |"
    r"Nearly two millennia|If we are to|One of the many|Although |Not everyone|Less is known|"
    r"However, we still|Another non-human|Similarly, a report|The trouble is|It is likely that|"
    r"This is a wonderfully rich|It is now widely consumed|"
    r"Poaching reached|The dramatic decline|Despite these|Recent efforts|Another threat|"
    r"Climate change|Some years ago|For the women|Using solid fuels|In east Africa|"
    r"But sugar production|Where once only|Bosma's discussion|The book provides|"
    r"The World of Sugar is also|This is also a history|"
    r"Bosma's|The book provides|The crowded|A team of|Each year across India|"
    r"In many countries|While it is undeniable|Similarly,|Many researchers|If we are to reap|"
    r"Not one to be|The first surprise|Nearly two millennia|Bellerby came|Even his trips|"
    r"In the process|Having decided|Today, four out of five|It can be longer|"
    r"Even in the middle|Outside the centre|But Dar es Salaam|Unlike many cities|"
    r"That is not the only|Tsimpli and her colleagues|She explains that|"
    r"Having already tested|They intend to look|While the preliminary results|"
    r"The project has already caught|Our findings don't mean|"
    r"Today, the saiga|Legal protection|Male saiga are|Physical barriers|In 2015|"
    r"Experts believe|But finding evidence|That said|But because|"
    r"Mapungubwe|Located|While there|Gwendoline|Between 1908|Studies using|"
    r"Do animals|There's some evidence|But finding evidence|In 2008|"
    r"Water hyacinth|For the women|In east Africa|Some years ago|"
    r"Their religious upbringing|The sisters began to make|The sisters' journals|"
    r"However, it was only|The First World War|Yet on one of numerous|"
    r"Commentators have often|Gwendoline made her final|In 1907, when|Over the next|"
    r"Later in the conflict|Here she acquired|Much is made of|By the early 1920s|"
    r"Whatever the precise|Their initial response|It was tedious"
    r"))"
)


def _split_inlined_labels(p: str) -> list[str]:
    parts = re.split(r"(?<=\.)\s+([A-G])\s+([A-Z][a-z])", p)
    if len(parts) <= 1:
        return [p]
    out = [parts[0]]
    for i in range(1, len(parts), 3):
        out.append(f"{parts[i]} {parts[i + 1]}{parts[i + 2]}")
    return out


def _fix_stuck_label(ln: str) -> str:
    m = re.match(r"^([A-G])([A-Z][a-z].*)", ln)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    return ln


def _normalize_lines(lines: list[str]) -> list[str]:
    out: list[str] = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        if re.fullmatch(r"^[A-G]", ln):
            m = _LABEL.match(ln)
            if m:
                out.append(ln)
                i += 1
                continue
            if re.fullmatch(r"^[A-G]$", ln) and i + 1 < len(lines):
                nxt = lines[i + 1].strip()
                if re.match(r"^[A-Z][a-z]", nxt):
                    out.append(f"{ln} {nxt}")
                    i += 2
                    continue
        out.append(_fix_stuck_label(ln))
        i += 1
    return out


def _clean_title(title: str) -> str:
    title = re.sub(r"Ulbe\s*Bosma", "Ulbe Bosma", title, flags=re.I)
    title = re.sub(r"\s+", " ", title).strip()
    return title


def _extract_title_body(lines: list[str]) -> tuple[str, list[str]]:
    title_parts: list[str] = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        if _is_section_line(ln):
            break
        if BYLINE.match(ln):
            i += 1
            continue
        if _BODY_START.match(ln) or len(ln) > 120:
            break
        if re.match(r"^[A-G]\s+[a-z]", ln):
            break
        if len(ln) < 90:
            title_parts.append(ln)
            i += 1
            if i < len(lines) and len(lines[i]) < 55 and not _BODY_START.match(lines[i]):
                nxt = lines[i]
                cont = (
                    nxt[0].islower()
                    or re.match(r"^(?:of|an|in|by)\b", nxt, re.I)
                    or title_parts[-1].rstrip().endswith((" of", " by", " spread"))
                )
                if cont:
                    title_parts.append(nxt)
                    i += 1
            continue
        break
    title = _clean_title(" ".join(title_parts))
    body = lines[i:]
    while body and BYLINE.match(body[0]):
        body = body[1:]
    return title, body


def _is_section_line(ln: str) -> bool:
    m = _LABEL.match(ln)
    return bool(m and m.group(2))


def _has_section_labels(lines: list[str]) -> bool:
    return any(_is_section_line(ln) for ln in lines)


_NAME_PARA = re.compile(r"^[A-Z][a-z]+\s*\(\d{4}")


def _ends_sentence(cur: str) -> bool:
    return bool(re.search(r"[.!?]['\"]?\s*$", cur.rstrip()))


def _should_start_new_para(cur: str, ln: str) -> bool:
    if not cur or not ln or ln[0].islower() or cur.rstrip().endswith("-"):
        return False
    if _NAME_PARA.match(ln):
        return True
    if not _ends_sentence(cur):
        return False
    norm = re.sub(r"([.!?])['\"]", r"\1", cur.rstrip())
    return len(_EXT_UNLABELED_SPLIT.split(norm + " " + ln)) > 1


def _append_wrapped_line(cur: str, ln: str) -> str:
    if ln[0].islower() or cur.rstrip().endswith("-"):
        if cur.rstrip().endswith("-"):
            return (
                cur.rstrip()[:-1] + " " + ln.lstrip()
                if len(ln.split()[0]) <= 3
                else cur.rstrip() + ln.lstrip()
            )
        return cur + " " + ln
    return cur + " " + ln


def _lines_to_paras(lines: list[str]) -> list[str]:
    chunks: list[str] = []
    cur = ""
    for ln in lines:
        if not cur:
            cur = ln
        elif _should_start_new_para(cur, ln):
            chunks.append(cur)
            cur = ln
        else:
            cur = _append_wrapped_line(cur, ln)
    if cur:
        chunks.append(cur)
    return chunks


def _split_unlabeled(text: str) -> list[str]:
    text = _clean_para(text)
    core = [p.strip() for p in _CORE_UNLABELED_SPLIT.split(text) if p.strip()]
    ext = [p.strip() for p in _EXT_UNLABELED_SPLIT.split(text) if p.strip()]

    def worst(parts: list[str]) -> int:
        return max((len(p) for p in parts), default=0)

    if not core and not ext:
        return [text] if text else []
    if worst(ext) < worst(core) or (worst(core) > _MAX_PARA_CHARS and len(ext) >= len(core)):
        parts = ext
    else:
        parts = core
    return _resplit_long([_clean_para(p) for p in parts])


def _merge_unlabeled(lines: list[str]) -> list[str]:
    out: list[str] = []
    for chunk in _lines_to_paras(lines):
        chunk = _clean_para(chunk)
        if not chunk:
            continue
        sub = _split_unlabeled(chunk)
        out.extend(sub if len(sub) > 1 else [chunk])
    return out


def _merge_labeled(lines: list[str]) -> list[str]:
    paras: list[str] = []
    cur = ""
    for ln in lines:
        if _is_section_line(ln):
            if cur:
                paras.extend(_split_inlined_labels(cur))
            cur = ln
        elif not cur:
            cur = ln
        elif _should_start_new_para(cur, ln):
            paras.extend(_split_inlined_labels(cur))
            cur = ln
        else:
            cur = _append_wrapped_line(cur, ln)
    if cur:
        paras.extend(_split_inlined_labels(cur))
    return paras


def _merge(lines: list[str]) -> list[str]:
    if _has_section_labels(lines):
        return _merge_labeled(lines)
    return _merge_unlabeled(lines)


def passages_for_test(test_no: int) -> list[dict]:
    doc = fitz.open(str(PDF))
    out: list[dict] = []
    for idx, (start, end) in enumerate(PASSAGE_PAGES[test_no], start=1):
        raw: list[str] = []
        for p in range(start - 1, end):
            raw.extend(doc[p].get_text().splitlines())
        lines: list[str] = []
        for ln in raw:
            ln = ln.strip()
            if not ln or SKIP.match(ln) or _FOOTNOTE_LINE.match(ln):
                continue
            lines.append(ln)
        lines = _normalize_lines(lines)
        title, body = _extract_title_body(lines)
        if not title and body:
            title = body[0]
            body = body[1:]
        plain = [_to_plain(p) for p in _merge(body)]
        paras = [_label_para(p) for p in _resplit_long(plain)]
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


# ponytail: runnable self-check — fails if paragraph counts drift from question refs
_MIN_PARAS: dict[tuple[int, int], int] = {
    (1, 2): 7,
    (1, 3): 4,
    (2, 2): 7,
    (2, 3): 4,
    (3, 3): 9,
    (4, 2): 8,
    (4, 3): 7,
}
_EXACT_PARAS: dict[tuple[int, int], int] = {
    (1, 2): 9,
    (2, 1): 10,
    (3, 3): 10,
}


def _self_check() -> None:
    for (test, pid), need in _MIN_PARAS.items():
        got = len(passages_for_test(test)[pid - 1]["passage"]["paras"])
        assert got >= need, f"T{test} P{pid}: {got} paras, need >={need}"
    for (test, pid), need in _EXACT_PARAS.items():
        got = len(passages_for_test(test)[pid - 1]["passage"]["paras"])
        assert got == need, f"T{test} P{pid}: {got} paras, need exactly {need}"
    for test in range(1, 5):
        for p in passages_for_test(test):
            paras = p["passage"]["paras"]
            mx = max(len(_to_plain(x)) for x in paras)
            assert mx <= _MAX_PARA_CHARS, f"T{test} P{p['id']}: max para {mx} chars"


if __name__ == "__main__":
    _self_check()
    for test in range(1, 5):
        for p in passages_for_test(test):
            paras = p["passage"]["paras"]
            labels = sum(1 for t in paras if "para-label" in t)
            print(
                f"T{test} P{p['id']}: {len(paras):2} paras ({labels} labels) — {p['passage']['title'][:50]}"
            )
