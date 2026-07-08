#!/usr/bin/env python3
"""Generate Cambridge IELTS 21 Tests 1-4 listening, reading, and writing mock pages."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.cambridge21_data import listening_test, reading_test, writing_test
TEST_RE = re.compile(r"const TEST = (\{[\s\S]*?\});", re.S)

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-20-test-1.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-20-test-1-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-20-test-4-writing.html"

LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

AUDIO_ZIP = Path("/Users/frankman/Desktop/C21音频.zip")

STATE_VARS = (
    "let currentPaper=[], selectedSections=[], mode='practice', "
    "startTime=0, timerInterval=null, submitted=false;\n"
)

WRITING_BLURBS = {
    1: "Task 1 US jobs graph + Task 2 tall apartment blocks essay",
    2: "Task 1 college cafe plans + Task 2 theatres and cinemas essay",
    3: "Task 1 rain-shadow desert diagram + Task 2 study abroad essay",
    4: "Task 1 library survey chart + Task 2 primary school learning essay",
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
        ("剑桥雅思20", "剑桥雅思21"),
        ("剑桥雅思 20", "剑桥雅思 21"),
        ("CAMBRIDGE IELTS", "CAMBRIDGE IELTS"),
        ("<div class=\"num\">20</div>", f"<div class=\"num\">21</div>"),
        ("Test 1", f"Test {n}"),
        ("test-1", f"test-{n}"),
        ("test1", f"test{n}"),
        ("ielts20_test1", f"cam21_test{n}"),
        ("剑桥雅思20 Test 1 听力", f"剑桥雅思21 Test {n} 听力"),
        ("Test 1 听力（官方原题 + 官方答案）", f"Test {n} 听力（官方原题 + 官方答案）"),
        ("剑桥雅思15 Test 1 听力", f"剑桥雅思21 Test {n} 听力"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_reading_meta(html: str, n: int) -> str:
    reps = [
        ("剑桥雅思20", "剑桥雅思21"),
        ("剑桥雅思 20", "剑桥雅思 21"),
        ("<div class=\"num\">20</div>", f"<div class=\"num\">21</div>"),
        ("Test 1", f"Test {n}"),
        ("test-1", f"test-{n}"),
        ("剑桥雅思20 Test 1 阅读", f"剑桥雅思21 Test {n} 阅读"),
        ("Test 1 阅读（官方原题 + 官方答案）", f"Test {n} 阅读（官方原题 + 官方答案）"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str, n: int) -> str:
    reps = [
        ("剑桥雅思20", "剑桥雅思21"),
        ("剑桥雅思 20", "剑桥雅思 21"),
        ("<div class=\"num\">20</div>", f"<div class=\"num\">21</div>"),
        ("Test 4", f"Test {n}"),  # template is cambridge-20-test-4-writing
        ("test-4", f"test-{n}"),
        ("Test 1", f"Test {n}"),
        ("test-1", f"test-{n}"),
        ("cambridge-20-test-4-writing", f"cambridge-21-test-{n}-writing"),
        ("cambridge-20-test-1-writing", f"cambridge-21-test-{n}-writing"),
        (
            "Task 1 Yemen/Italy population pie charts + Task 2 sports facilities and public health essay",
            WRITING_BLURBS[n],
        ),
        (
            "Task 1（约 20 分钟，≥150 词）+ Task 2（约 40 分钟，≥250 词）",
            "Task 1（约 20 分钟，≥150 词）+ Task 2（约 40 分钟，≥250 词）",
        ),
        ("Test 1 写作（官方真题）", f"Test {n} 写作（官方真题）"),
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


def prepare_audio() -> None:
    if not AUDIO_ZIP.exists():
        raise FileNotFoundError(AUDIO_ZIP)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        with zipfile.ZipFile(AUDIO_ZIP) as zf:
            zf.extractall(tmp_path)
        for n in range(1, 5):
            for sec in range(1, 5):
                dst = LISTENING_DIR / f"cam21_test{n}_audio{sec}.mp3"
                parts = sorted(
                    p
                    for p in tmp_path.glob(f"C21T{n}P{sec}*.mp3")
                    if "__MACOSX" not in str(p)
                )
                if not parts:
                    single = tmp_path / f"C21T{n}P{sec}.mp3"
                    if single.exists():
                        parts = [single]
                if not parts:
                    raise FileNotFoundError(f"missing audio for test {n} section {sec}")
                if len(parts) == 1:
                    shutil.copy2(parts[0], dst)
                else:
                    # ponytail: cat merge — no ffmpeg on this machine
                    with dst.open("wb") as out_f:
                        for part in parts:
                            out_f.write(part.read_bytes())
                print(f"audio -> {dst.relative_to(ROOT)} ({len(parts)} part(s))")


def rename_map_image() -> None:
    src = LISTENING_DIR / "cambridge-21-t2_map.png"
    dst = LISTENING_DIR / "cambridge-21-test-2-map.png"
    if src.exists() and not dst.exists():
        shutil.copy2(src, dst)
        print(f"copied map -> {dst.relative_to(ROOT)}")


def outputs_for_test(n: int) -> list[Path]:
    return [
        LISTENING_DIR / f"cambridge-21-test-{n}.html",
        READING_DIR / f"cambridge-21-test-{n}-reading.html",
        WRITING_DIR / f"cambridge-21-test-{n}-writing.html",
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
    if len(tests) == 4 and tests == list(range(1, 5)):
        prepare_audio()
        rename_map_image()
    elif any(n not in range(1, 5) for n in tests):
        raise SystemExit("usage: build_cambridge21.py [1 2 3 4]")
    all_paths: list[Path] = []
    for n in tests:
        write_page(
            TPL_LISTENING,
            LISTENING_DIR / f"cambridge-21-test-{n}.html",
            listening_test(n),
            lambda html, tn=n: patch_listening_meta(html, tn),
        )
        write_page(
            TPL_READING,
            READING_DIR / f"cambridge-21-test-{n}-reading.html",
            reading_test(n),
            lambda html, tn=n: patch_reading_meta(html, tn),
        )
        write_page(
            TPL_WRITING,
            WRITING_DIR / f"cambridge-21-test-{n}-writing.html",
            writing_test(n),
            lambda html, tn=n: patch_writing_meta(html, tn),
        )
        all_paths.extend(outputs_for_test(n))
    return run_checks(all_paths)


if __name__ == "__main__":
    raise SystemExit(main())
