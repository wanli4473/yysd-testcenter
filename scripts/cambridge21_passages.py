"""Extract reading passages from Cambridge 21 PDF."""

from __future__ import annotations

import re
from pathlib import Path

import fitz

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
_INLINE_FOOTNOTE = re.compile(
    r"\s*[•\*]{1,3}\s*(?:philanthropic|Old Master|Impressionist)[^A-Z]*(?=[A-Z]|\Z)",
    re.I,
)

# ponytail: cap para length for readability — upgrade path: PDF block geometry
_MAX_PARA_CHARS = 1100

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
    r"(?:However,|Moreover,|Furthermore,|That said,|There's some evidence|While it is |"
    r"Nearly two millennia|If we are to|One of the many|Although |Not everyone|"
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

_LONG_SPLIT = re.compile(
    r"(?<=\.)\s+(?="
    r"(?:Their |The sisters|The First World War|Yet on one|Commentators have|"
    r"Gwendoline made|However, it was|While there was|Although they|In 1907|"
    r"Over the next|Later in the|Here she |Much is made|By the early|Whatever the|"
    r"Their initial response|It was tedious|For example,|In contrast|That said|"
    r"But finding|Poaching reached|Another threat|Climate change|Some years ago|"
    r"For the women|In east Africa|Using solid fuels|Not one to be|The first surprise|"
    r"Nearly two millennia|Even his trips|Having already tested|They intend to look|"
    r"The project has already|Our findings don't|However, I do|Let's |Art also |"
    r"To say these|In a sense|One way or another|Perhaps the most |It seems that the more |"
    r"Bosma's discussion|The book provides|The World of Sugar is also|This is also a history|"
    r"But sugar production|Where once only|The crowded|A team of|Each year across India|"
    r"Tsimpli and her colleagues|She explains that|While the preliminary results|"
    r"Although the findings|While the preliminary results show|"
    r"In many countries|While it is undeniable|Similarly,|Many researchers|If we are to reap|"
    r"Water hyacinth|For the women who|In east Africa the|Some years ago, on|"
    r"Even his trips|In the process|Having decided|At the same time|"
    r"Today, the saiga|Legal protection|Male saiga are|Physical barriers|In 2015|Experts believe"
    r"))"
)


def _label_para(p: str) -> str:
    m = _LABEL.match(p)
    if m and m.group(2):
        return f'<span class="para-label">{m.group(1)}</span>{m.group(2)}'
    return p


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


def _join_wrapped(lines: list[str]) -> str:
    cur = ""
    for ln in lines:
        if not cur:
            cur = ln
        elif ln[0].islower() or cur.rstrip().endswith("-"):
            if cur.rstrip().endswith("-"):
                cur = (
                    cur.rstrip()[:-1] + " " + ln.lstrip()
                    if len(ln.split()[0]) <= 3
                    else cur.rstrip() + ln.lstrip()
                )
            else:
                cur += " " + ln
        else:
            cur += " " + ln
    return cur


def _clean_para(p: str) -> str:
    p = _INLINE_FOOTNOTE.sub(" ", p)
    return re.sub(r"\s+", " ", p).strip()


def _to_plain(p: str) -> str:
    p = re.sub(r'<span class="para-label">([A-G])</span>\s*', r"\1 ", p)
    return _clean_para(p)


def _chunk_sentences(p: str, max_len: int = _MAX_PARA_CHARS) -> list[str]:
    sents = re.split(r"(?<=\.)\s+(?=[A-Z\"'])", p)
    chunks: list[str] = []
    buf = ""
    for s in sents:
        if not buf:
            buf = s
        elif len(buf) + 1 + len(s) <= max_len:
            buf += " " + s
        else:
            chunks.append(buf.strip())
            buf = s
    if buf.strip():
        chunks.append(buf.strip())
    return chunks if chunks else [p]


def _resplit_long(paras: list[str], max_len: int = _MAX_PARA_CHARS) -> list[str]:
    out: list[str] = []
    for p in paras:
        p = _clean_para(p)
        if not p:
            continue
        if len(p) <= max_len:
            out.append(p)
            continue
        parts = [x.strip() for x in _LONG_SPLIT.split(p) if x.strip()]
        if len(parts) <= 1:
            parts = _chunk_sentences(p, max_len)
        else:
            parts = _resplit_long(parts, max_len)
        out.extend(parts)
    return out


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
    text = _join_wrapped(lines)
    out = _split_unlabeled(text)
    return out if len(out) > 1 else ([text] if text else [])


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
        else:
            cur += " " + ln
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
    (1, 2): 7,
    (3, 3): 9,
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
