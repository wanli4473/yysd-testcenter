"""Shared reading passage paragraph normalization (split oversized blocks)."""

from __future__ import annotations

import re

MAX_PARA_CHARS = 1100

_LABEL = re.compile(r"^([A-G])\s+([A-Z][a-z].*)")
_INLINE_FOOTNOTE = re.compile(
    r"\s*[•\*]{1,3}\s*(?:philanthropic|Old Master|Impressionist)[^A-Z]*(?=[A-Z]|\Z)",
    re.I,
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
    r"Today, the saiga|Legal protection|Male saiga are|Physical barriers|In 2015|Experts believe|"
    r"However,|Moreover,|Furthermore,|Nevertheless,|Meanwhile,|Instead,|"
    r"In addition,|That said,|There's some evidence|If we are to|One of the many|"
    r"Although |Not everyone|Despite these|Recent efforts|Another threat|"
    r"Some years ago|For the women|Using solid fuels|But sugar production|"
    r"Where once only|Mapungubwe|Located|While there|Between 1908|Studies using|"
    r"Do animals|In 2008|Dares Salaam|It is by now|The crowded|"
    r"Their religious upbringing|The sisters began to make|The sisters' journals|"
    r"However, it was only|Yet on one of numerous|Commentators have often|"
    r"Gwendoline made her final|Later in the conflict|Much is made of|"
    r"By the early 1920s|Whatever the precise|Their initial response|"
    r"Today, four out of five|It can be longer|Even in the middle|Outside the centre|"
    r"But Dar es Salaam|Unlike many cities|That is not the only|"
    r"Having already tested|The project has already caught|Our findings don't mean|"
    r"Not one to be|The first surprise|Bellerby came|Even his trips|"
    r"In the process|Having decided|At the same time|Experts believe|But because|"
    r"But finding evidence|Each year across India|She explains that|"
    r"One way or another|Perhaps the most |It seems that the more |Art also |To say these|"
    r"In a sense,|However, I do|Let's "
    r"))"
)


def clean_para(p: str) -> str:
    p = _INLINE_FOOTNOTE.sub(" ", p)
    return re.sub(r"\s+", " ", p).strip()


def to_plain(p: str) -> str:
    p = re.sub(r'<span class="para-label">([A-G])</span>\s*', r"\1 ", p)
    return clean_para(p)


def label_para(p: str) -> str:
    m = _LABEL.match(p)
    if m and m.group(2):
        return f'<span class="para-label">{m.group(1)}</span>{m.group(2)}'
    return p


def chunk_sentences(p: str, max_len: int = MAX_PARA_CHARS) -> list[str]:
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


def resplit_long(paras: list[str], max_len: int = MAX_PARA_CHARS) -> list[str]:
    out: list[str] = []
    for p in paras:
        p = clean_para(p)
        if not p:
            continue
        if len(p) <= max_len:
            out.append(p)
            continue
        parts = [x.strip() for x in _LONG_SPLIT.split(p) if x.strip()]
        if len(parts) <= 1:
            parts = chunk_sentences(p, max_len)
        else:
            parts = resplit_long(parts, max_len)
        out.extend(parts)
    return out


def normalize_passages(paras: list[str]) -> list[str]:
    """Resplit any paragraph over MAX_PARA_CHARS; re-apply A–G labels."""
    out: list[str] = []
    for raw in paras:
        p = to_plain(raw)
        if not p:
            continue
        if len(p) <= MAX_PARA_CHARS:
            out.append(p)
        else:
            out.extend(resplit_long([p]))
    return [label_para(p) for p in out]


def max_para_len(paras: list[str]) -> int:
    return max((len(to_plain(p)) for p in paras), default=0)
