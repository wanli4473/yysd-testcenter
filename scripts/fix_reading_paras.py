#!/usr/bin/env python3
"""Resplit oversized paragraphs in all Cambridge reading mock HTML files."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
READING_DIR = ROOT / "library/mock/cambridge-reading"

sys.path.insert(0, str(ROOT))
from scripts.reading_paras import MAX_PARA_CHARS, max_para_len, normalize_passages

PARAS_START = re.compile(r'("paras"|paras)\s*:\s*\[')
STRING_RE = re.compile(
    r'"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\'(?:\\.|[^\'\\])*\'',
    re.S,
)


def decode_js_string(raw: str) -> str:
    q = raw[0]
    if q == '"':
        return json.loads(raw)
    inner = raw[1:-1]
    if q == "`":
        return inner.replace("\\`", "`").replace("\\\\", "\\")
    return inner.replace("\\'", "'").replace("\\\\", "\\")


def detect_quote_style(blob: str) -> str:
    m = STRING_RE.search(blob)
    return m.group(0)[0] if m else '"'


def encode_para(s: str, quote: str, indent: str) -> str:
    if quote == "`":
        esc = s.replace("\\", "\\\\").replace("`", "\\`")
        return f"{indent}`{esc}`"
    if quote == "'":
        esc = s.replace("\\", "\\\\").replace("'", "\\'")
        return f"{indent}'{esc}'"
    return indent + json.dumps(s, ensure_ascii=False)


def format_paras(paras: list[str], blob: str) -> str:
    quote = detect_quote_style(blob)
    indent = "          "
    if "\n" in blob:
        for ln in blob.splitlines():
            if ln.strip():
                indent = re.match(r"^(\s*)", ln).group(1)
                break
    lines = [encode_para(p, quote, indent) for p in paras]
    close = indent[:-2] if len(indent) >= 2 else indent
    return "[\n" + ",\n".join(lines) + "\n" + close + "]"


def find_paras_blocks(text: str) -> list[tuple[int, int, str]]:
    """Return (start, end, inner_blob) for each paras array, inner excludes brackets."""
    blocks: list[tuple[int, int, str]] = []
    for m in PARAS_START.finditer(text):
        open_bracket = m.end() - 1
        depth = 1
        i = m.end()
        while i < len(text) and depth:
            ch = text[i]
            if ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
            i += 1
        if depth:
            continue
        blocks.append((open_bracket, i, text[m.end() : i - 1]))
    return blocks


def parse_paras(blob: str) -> list[str]:
    return [decode_js_string(x) for x in STRING_RE.findall(blob)]


def fix_file(path: Path) -> tuple[bool, int]:
    text = path.read_text(encoding="utf-8")
    blocks = find_paras_blocks(text)
    if not blocks:
        return False, 0

    changed = False
    fixes = 0
    # ponytail: replace from end so indices stay valid
    for open_i, close_i, blob in reversed(blocks):
        old = parse_paras(blob)
        if not old:
            continue
        new = normalize_passages(old)
        if new == old:
            continue
        changed = True
        fixes += 1
        text = text[: open_i + 1] + format_paras(new, blob)[1:-1] + text[close_i - 1 :]

    if changed:
        path.write_text(text, encoding="utf-8")
    return changed, fixes


def audit() -> list[tuple[str, int, int]]:
    bad: list[tuple[str, int, int]] = []
    for path in sorted(READING_DIR.glob("cambridge-*-reading.html")):
        text = path.read_text(encoding="utf-8")
        for n, (_, _, blob) in enumerate(find_paras_blocks(text), 1):
            paras = parse_paras(blob)
            mx = max_para_len(paras)
            if mx > MAX_PARA_CHARS:
                bad.append((path.name, n, mx))
    return bad


def main() -> int:
    updated = 0
    for path in sorted(READING_DIR.glob("cambridge-*-reading.html")):
        changed, nblocks = fix_file(path)
        if changed:
            updated += 1
            print(f"fixed {path.name} ({nblocks} passage blocks)")

    remaining = audit()
    print(f"\nUpdated {updated} files.")
    if remaining:
        print(f"Still over {MAX_PARA_CHARS} chars: {len(remaining)} passage blocks")
        for row in remaining[:20]:
            print(f"  {row[0]} P{row[1]}: max={row[2]}")
        return 1
    print("All passages within limit.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
