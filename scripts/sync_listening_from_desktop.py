#!/usr/bin/env python3
"""Copy listening MP3s from Desktop 剑雅 folders into library. Prefer largest/newest."""
import hashlib
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LISTENING = ROOT / "library/mock/cambridge-listening"
DESKTOP = Path("/Users/frankman/Desktop")

EXTRA = [
    # ielts19_test1_audio1: run scripts/splice_cam19_t1p1.sh (intro + dialogue), not a single source
    (DESKTOP / "之昂张张张zzz - 【最新】IELTS20 Text2 Part1.mp3", "ielts20_test2_audio1.mp3"),
]


def md5(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def deployed_name(vol: int, test: int, part: int) -> str:
    if vol in (8, 9):
        return f"cam{vol}_test{test}_audio{part}.mp3"
    if vol == 21:
        return f"cam21_test{test}_audio{part}.mp3"
    return f"ielts{vol}_test{test}_audio{part}.mp3"


def parse_source(name: str):
    name = name.replace("【新】", "")
    m = re.search(r"IELTS\s*(\d+)\s*Test\s*(\d+)\s*(?:Section|Part)\s*(\d+)", name, re.I)
    if not m:
        return None
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def collect_sources():
    by_key: dict[tuple, list[Path]] = {}
    for base in [DESKTOP, DESKTOP / "剑雅"]:
        if not base.exists():
            continue
        for p in base.rglob("*.mp3"):
            key = parse_source(p.name)
            if key:
                by_key.setdefault(key, []).append(p)
    return by_key


def pick_source(paths: list[Path]) -> Path:
    return max(paths, key=lambda p: (p.stat().st_size, p.stat().st_mtime))


def main():
    sources = collect_sources()
    updated = []
    skipped = []

    jobs: list[tuple[Path, Path]] = []
    for src, fn in EXTRA:
        if src.exists():
            jobs.append((src, LISTENING / fn))

    for key, paths in sorted(sources.items()):
        vol, test, part = key
        fn = deployed_name(vol, test, part)
        dst = LISTENING / fn
        if not dst.exists():
            continue
        jobs.append((pick_source(paths), dst))

    seen_dst = set()
    for src, dst in jobs:
        if dst in seen_dst:
            continue
        seen_dst.add(dst)
        if md5(src) == md5(dst):
            skipped.append(dst.name)
            continue
        if src.stat().st_size < dst.stat().st_size - 1000:
            print(f"skip smaller src {src.name} -> {dst.name}")
            continue
        shutil.copy2(src, dst)
        updated.append((dst.name, src.name, dst.stat().st_size))
        print(f"updated {dst.name} <= {src} ({dst.stat().st_size} bytes)")

    print(f"\nupdated {len(updated)}, unchanged {len(skipped)}")
    return 0 if updated or not skipped else 0


if __name__ == "__main__":
    raise SystemExit(main())
