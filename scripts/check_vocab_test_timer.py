#!/usr/bin/env python3
"""Self-check: vocab timed-test hooks stay wired.

Fails if vocab-bridge loses the 20s/2s timer, or special LIST empty-answer
guards no longer allow timeout auto-submit via window.__vocabTestTimedOut.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRIDGE = ROOT / "assets/js/vocab-bridge.js"
SPECIAL = ROOT / "library/study"


def main() -> int:
    bridge = BRIDGE.read_text(encoding="utf-8")
    errors: list[str] = []

    if "QUESTION_SECS = 20" not in bridge:
        errors.append("vocab-bridge.js missing QUESTION_SECS = 20")
    if "FEEDBACK_MS = 2000" not in bridge:
        errors.append("vocab-bridge.js missing FEEDBACK_MS = 2000")
    if "__vocabTestTimedOut" not in bridge:
        errors.append("vocab-bridge.js missing __vocabTestTimedOut timeout flag")
    if "bootTimer" not in bridge:
        errors.append("vocab-bridge.js missing bootTimer")

    need = 0
    missing = 0
    for p in sorted(SPECIAL.glob("vocab-special-*/**/*.html")):
        text = p.read_text(encoding="utf-8")
        if not any(
            s in text
            for s in ("请先选择一个选项", "请同时填写英文拼写", "请输入英文短语")
        ):
            continue
        need += 1
        if "__vocabTestTimedOut" not in text:
            missing += 1
            errors.append(f"missing timeout guard: {p.relative_to(ROOT)}")
        if re.search(
            r"if \(selected === null\) \{\n\s*alert\('请先选择一个选项！'\)",
            text,
        ):
            errors.append(f"unpatched selected guard: {p.relative_to(ROOT)}")

    if need < 30:
        errors.append(f"expected ~32 special files with empty guards, found {need}")

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1

    print(f"OK — timer in bridge; {need} special files allow timeout empty submit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
