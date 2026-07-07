#!/usr/bin/env python3
"""Static sanity checks for self-contained Cambridge mock pages.

This catches the class of bugs where a page opens but question rendering fails
because TEST data and the embedded renderer disagree on field names.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

NODE_HELPER = r"""
const fs = require("fs");
const src = fs.readFileSync(0, "utf8");
function ans(...values) { return values.flat(); }
function explain(...values) { return values.join(" / "); }
try {
  const test = Function("ans", "explain", '"use strict"; return (' + src + ');')(ans, explain);
  process.stdout.write(JSON.stringify(test));
} catch (err) {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
}
"""


def find_node() -> str:
    for key in ("YYSD_NODE", "NODE_BINARY"):
        value = os.environ.get(key)
        if value:
            return value
    node = shutil.which("node")
    if node:
        return node
    raise RuntimeError("node executable not found; install Node.js or set YYSD_NODE")


def extract_test_object(text: str) -> str:
    marker = "const TEST"
    pos = text.find(marker)
    if pos < 0:
        raise ValueError("missing const TEST block")
    eq = text.find("=", pos)
    start = text.find("{", eq)
    if eq < 0 or start < 0:
        raise ValueError("malformed const TEST assignment")

    depth = 0
    state = "code"
    escaped = False
    i = start
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""

        if state == "line_comment":
            if ch == "\n":
                state = "code"
        elif state == "block_comment":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 1
        elif state in {"single", "double", "template"}:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif (
                (state == "single" and ch == "'")
                or (state == "double" and ch == '"')
                or (state == "template" and ch == "`")
            ):
                state = "code"
        else:
            if ch == "/" and nxt == "/":
                state = "line_comment"
                i += 1
            elif ch == "/" and nxt == "*":
                state = "block_comment"
                i += 1
            elif ch == "'":
                state = "single"
            elif ch == '"':
                state = "double"
            elif ch == "`":
                state = "template"
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return text[start : i + 1]
        i += 1

    raise ValueError("unterminated const TEST object")


def load_test(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="ignore")
    obj = extract_test_object(text)
    proc = subprocess.run(
        [find_node(), "-e", NODE_HELPER],
        input=obj,
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode:
        raise ValueError(proc.stderr.strip() or "node failed to evaluate TEST")
    return json.loads(proc.stdout)


def groups(test: dict):
    for section in test.get("sections", []) + test.get("passages", []):
        for group in section.get("groups", []):
            yield section, group


def check_page(path: Path) -> list[str]:
    errors: list[str] = []
    text = path.read_text()
    try:
        test = load_test(path)
    except Exception as exc:  # noqa: BLE001 - report all parse failures
        return [f"{path}: cannot parse TEST block: {exc}"]

    total_questions = 0
    table_groups = []
    for section, group in groups(test):
        kind = group.get("kind")
        qs = group.get("questions", [])
        total_questions += len(qs)
        if kind == "table":
            table_groups.append(group)
            if not (group.get("cols") or group.get("columns")):
                errors.append(f"{path}: table group {group.get('title')} has no cols/columns")
            if not group.get("rows"):
                errors.append(f"{path}: table group {group.get('title')} has no rows")
        elif kind == "note":
            if not group.get("lines"):
                errors.append(f"{path}: note group {group.get('title')} has no lines")
        elif kind in {"mcq", "match", "multi", "wbank", "tfng", "map"}:
            if not qs:
                errors.append(f"{path}: {kind} group {group.get('title')} has no questions")

    is_objective = "cambridge-writing" not in str(path)
    if is_objective and total_questions != 40:
        errors.append(f"{path}: expected 40 objective questions, found {total_questions}")

    if any("columns" in group and "cols" not in group for group in table_groups):
        # Older copies of the renderer only used g.cols, while generated data may
        # use columns. A page with table data must support both names.
        if "g.cols || g.columns" not in text:
            errors.append(f"{path}: table renderer does not support both cols and columns")

    return errors


def main(argv: list[str]) -> int:
    paths = [Path(a) for a in argv[1:]]
    if not paths:
        paths = sorted((ROOT / "library/mock").glob("cambridge-*/*.html"))
    all_errors: list[str] = []
    for path in paths:
        if not path.is_absolute():
            path = ROOT / path
        if path.exists():
            all_errors.extend(check_page(path))
        else:
            all_errors.append(f"{path}: file does not exist")
    if all_errors:
        print("\n".join(all_errors))
        return 1
    print(f"OK: verified {len(paths)} Cambridge mock page(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
