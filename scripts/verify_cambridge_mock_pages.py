#!/usr/bin/env python3
"""Static sanity checks for self-contained Cambridge mock pages.

This catches the class of bugs where a page opens but question rendering fails
because TEST data and the embedded renderer disagree on field names.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEST_RE = re.compile(r"const TEST = (\{.*?\n\});", re.S)


def load_test(path: Path) -> dict:
    text = path.read_text()
    match = TEST_RE.search(text)
    if not match:
        raise ValueError("missing const TEST block")
    return json.loads(match.group(1))


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

    if table_groups:
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
