#!/usr/bin/env python3
"""Generate Cambridge IELTS 12 Tests 1–4 listening, reading, and writing mock pages."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.cambridge12_data import listening_test, reading_test, writing_test

TEST_RE = re.compile(r"const TEST = (\{[\s\S]*?\});", re.S)

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-20-test-1.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-20-test-1-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-20-test-4-writing.html"

LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

STATE_VARS = (
    "let currentPaper=[], selectedSections=[], mode='practice', "
    "startTime=0, timerInterval=null, submitted=false;\n"
)

WRITING_BLURBS = {
    1: "Task 1 Australian physical activity bar chart + Task 2 sharing information essay",
    2: "Task 1 Islip town maps + Task 2 young population essay",
    3: "Task 1 US fast-food frequency chart + Task 2 high-speed rail essay",
    4: "Task 1 geothermal electricity diagram + Task 2 children making choices essay",
}


def replace_test(html: str, test: dict) -> str:
    block = "const TEST = " + json.dumps(test, ensure_ascii=False, indent=2) + ";"
    return TEST_RE.sub(block, html, count=1)


def inject_state_vars(html: str) -> str:
    needle = "const allQs = sec => sec.groups.flatMap(g=>g.questions);"
    if STATE_VARS.strip() not in html and needle in html:
        html = html.replace(needle, STATE_VARS + needle, 1)
    return html


def patch_listening_meta(html: str, n: int) -> str:
    reps = [
        ("剑桥雅思20", "剑桥雅思12"),
        ("剑桥雅思 20", "剑桥雅思 12"),
        ('<div class="num">20</div>', '<div class="num">12</div>'),
        ("Test 1", f"Test {n}"),
        ("test-1", f"test-{n}"),
        ("test1", f"test{n}"),
        ("ielts20_test1", f"ielts12_test{n}"),
        ("剑桥雅思20 Test 1 听力", f"剑桥雅思12 Test {n} 听力"),
        ("剑桥雅思15 Test 1 听力", f"剑桥雅思12 Test {n} 听力"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_reading_meta(html: str, n: int) -> str:
    reps = [
        ("剑桥雅思20", "剑桥雅思12"),
        ("剑桥雅思 20", "剑桥雅思 12"),
        ('<div class="num">20</div>', '<div class="num">12</div>'),
        ("Test 1", f"Test {n}"),
        ("test-1", f"test-{n}"),
        ("剑桥雅思20 Test 1 阅读", f"剑桥雅思12 Test {n} 阅读"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str, n: int) -> str:
    reps = [
        ("剑桥雅思20", "剑桥雅思12"),
        ("剑桥雅思 20", "剑桥雅思 12"),
        ('<div class="num">20</div>', '<div class="num">12</div>'),
        ("Test 4", f"Test {n}"),
        ("test-4", f"test-{n}"),
        ("Test 1", f"Test {n}"),
        ("test-1", f"test-{n}"),
        ("cambridge-20-test-4-writing", f"cambridge-12-test-{n}-writing"),
        ("cambridge-20-test-1-writing", f"cambridge-12-test-{n}-writing"),
        (
            "Task 1 Yemen/Italy population pie charts + Task 2 sports facilities and public health essay",
            WRITING_BLURBS[n],
        ),
        ("Test 1 写作（官方真题）", f"Test {n} 写作（官方真题）"),
        ("Test 4 写作（官方真题）", f"Test {n} 写作（官方真题）"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def write_page(template: Path, out: Path, test: dict, patch_meta) -> None:
    html = template.read_text(encoding="utf-8")
    html = replace_test(html, test)
    html = patch_meta(html)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")


def outputs_for_test(n: int) -> list[Path]:
    return [
        LISTENING_DIR / f"cambridge-12-test-{n}.html",
        READING_DIR / f"cambridge-12-test-{n}-reading.html",
        WRITING_DIR / f"cambridge-12-test-{n}-writing.html",
    ]


def run_checks(paths: list[Path]) -> int:
    cmd = [sys.executable, str(ROOT / "scripts/build_manifest.py")]
    print("running:", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=ROOT)
    verify = ROOT / "scripts/verify_cambridge_mock_pages.py"
    cmd = [sys.executable, str(verify), *[str(p) for p in paths]]
    print("running:", " ".join(cmd))
    return subprocess.run(cmd, cwd=ROOT).returncode


def main() -> int:
    tests = [int(x) for x in sys.argv[1:]] if len(sys.argv) > 1 else list(range(1, 5))
    if any(n not in range(1, 5) for n in tests):
        raise SystemExit("usage: build_cambridge12.py [1 2 3 4]")
    all_paths: list[Path] = []
    for n in tests:
        write_page(
            TPL_LISTENING,
            LISTENING_DIR / f"cambridge-12-test-{n}.html",
            listening_test(n),
            lambda html, tn=n: patch_listening_meta(html, tn),
        )
        write_page(
            TPL_READING,
            READING_DIR / f"cambridge-12-test-{n}-reading.html",
            reading_test(n),
            lambda html, tn=n: patch_reading_meta(html, tn),
        )
        write_page(
            TPL_WRITING,
            WRITING_DIR / f"cambridge-12-test-{n}-writing.html",
            writing_test(n),
            lambda html, tn=n: patch_writing_meta(html, tn),
        )
        all_paths.extend(outputs_for_test(n))
    return run_checks(all_paths)


if __name__ == "__main__":
    raise SystemExit(main())
