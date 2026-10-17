#!/usr/bin/env python3
"""Copy Desktop speaking hand MP3s + crop/reuse scene images into the repo."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HAND_LR = Path("/Users/frankman/Desktop/TOEFL-Hand/04-speaking/01-S-LRP")
HAND_IV = Path("/Users/frankman/Desktop/TOEFL-Hand/04-speaking/02-S-INT")
AUDIO_LR = ROOT / "library/toefl/audio/bank-lr"
AUDIO_IV = ROOT / "library/toefl/audio/bank-iv"
SCENE_DIR = ROOT / "library/toefl/img/scenes"
SCENE_BANK = SCENE_DIR / "bank-lr"
INCOMING = ROOT / "app/library/toefl/incoming"
OCR_SWIFT = ROOT / "scripts/ocr_cols.swift"

# Title slug -> existing scene filename (no ext)
SCENE_MAP = {
    "gym": "gym",
    "university gym": "gym",
    "wood shop": "wood-shop",
    "campus tour": "campus-tour",
    "course system": "course-system",
    "garden center": "garden-center",
    "making coffee": "making-coffee",
    "library": "library",
    "botanical garden": "botanical-garden",
    "weather report": "weather-report",
    "woodworking class": "woodworking-class",
}

IV_SKIP = {57, 58, 59, 60, 61}


def kebab(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def parse_lrp_files():
    by_n: dict[int, dict] = {}
    for f in HAND_LR.iterdir():
        m = re.match(r"^S-LRP(\d+)-(.+)$", f.name)
        if not m:
            continue
        n, rest = int(m.group(1)), m.group(2)
        slot = by_n.setdefault(n, {"n": n, "title": None, "png": None, "intro": None, "qs": {}})
        if rest.endswith(".png"):
            slot["title"] = rest[:-4]
            slot["png"] = f
        elif rest.endswith("-intro.mp3"):
            slot["title"] = rest[: -len("-intro.mp3")]
            slot["intro"] = f
        else:
            qm = re.match(r"^(.+)-(\d)\.mp3$", rest)
            if qm:
                slot["title"] = qm.group(1)
                slot["qs"][int(qm.group(2))] = f
    return by_n


def parse_iv_files():
    by_n: dict[int, dict] = {}
    for f in HAND_IV.iterdir():
        m = re.match(r"^S-INT(\d+)-(.+)$", f.name)
        if not m:
            continue
        n, rest = int(m.group(1)), m.group(2)
        slot = by_n.setdefault(n, {"n": n, "title": None, "png": None, "qs": {}})
        if rest.endswith(".png"):
            slot["title"] = rest[:-4]
            slot["png"] = f
        else:
            qm = re.match(r"^(.+)-(\d)\.mp3$", rest)
            if qm:
                slot["title"] = qm.group(1)
                slot["qs"][int(qm.group(2))] = f
    return by_n


def ensure_dirs():
    AUDIO_LR.mkdir(parents=True, exist_ok=True)
    AUDIO_IV.mkdir(parents=True, exist_ok=True)
    SCENE_BANK.mkdir(parents=True, exist_ok=True)
    INCOMING.mkdir(parents=True, exist_ok=True)


def copy_lrp_audio(n: int, slot: dict) -> dict:
    """Return paths relative to repo root for intro + q1..q7."""
    out = {"qs": {}}
    for q, src in sorted(slot["qs"].items()):
        dest = AUDIO_LR / f"s-lrp{n}-q{q}.mp3"
        if not dest.exists() or dest.stat().st_size != src.stat().st_size:
            shutil.copy2(src, dest)
        out["qs"][q] = f"library/toefl/audio/bank-lr/s-lrp{n}-q{q}.mp3"
    if slot.get("intro"):
        dest = AUDIO_LR / f"s-lrp{n}-intro.mp3"
        if not dest.exists() or dest.stat().st_size != slot["intro"].stat().st_size:
            shutil.copy2(slot["intro"], dest)
        out["intro"] = f"library/toefl/audio/bank-lr/s-lrp{n}-intro.mp3"
    return out


def copy_iv_audio(n: int, slot: dict) -> dict:
    out = {"qs": {}}
    for q, src in sorted(slot["qs"].items()):
        dest = AUDIO_IV / f"s-int{n}-q{q}.mp3"
        if not dest.exists() or dest.stat().st_size != src.stat().st_size:
            shutil.copy2(src, dest)
        out["qs"][q] = f"library/toefl/audio/bank-iv/s-int{n}-q{q}.mp3"
    return out


def scene_for(n: int, title: str, png: Path | None) -> str:
    key = (title or "").strip().lower()
    # strip trailing " 2"
    key2 = re.sub(r"\s+2$", "", key)
    mapped = SCENE_MAP.get(key) or SCENE_MAP.get(key2)
    if mapped:
        for ext in (".jpg", ".png", ".webp"):
            p = SCENE_DIR / f"{mapped}{ext}"
            if p.exists():
                return f"library/toefl/img/scenes/{mapped}{ext}"
    # crop left ~45% of hand PNG as scene
    dest = SCENE_BANK / f"s-lrp{n}.jpg"
    if png and png.exists():
        if not dest.exists():
            try:
                from PIL import Image
            except ImportError:
                subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
                from PIL import Image
            im = Image.open(png).convert("RGB")
            w, h = im.size
            # hand UI: left diagram roughly 12%–48% x, 18%–72% y
            crop = im.crop((int(w * 0.10), int(h * 0.16), int(w * 0.48), int(h * 0.72)))
            crop.save(dest, quality=85)
        return f"library/toefl/img/scenes/bank-lr/s-lrp{n}.jpg"
    # fallback gym
    return "library/toefl/img/scenes/gym.jpg"


def ocr_png(png: Path) -> str:
    if not OCR_SWIFT.exists():
        return ""
    r = subprocess.run(
        ["swift", str(OCR_SWIFT), str(png)],
        capture_output=True,
        text=True,
        timeout=120,
    )
    return r.stdout or ""


def write_manifest():
    ensure_dirs()
    lrp = parse_lrp_files()
    iv = parse_iv_files()
    man = {
        "lrp": [
            {
                "n": n,
                "title": slot["title"],
                "has_intro": bool(slot.get("intro")),
                "q_count": len(slot["qs"]),
                "png": str(slot["png"]) if slot.get("png") else None,
            }
            for n, slot in sorted(lrp.items())
        ],
        "iv": [
            {
                "n": n,
                "title": slot["title"],
                "q_count": len(slot["qs"]),
                "skip": n in IV_SKIP,
                "png": str(slot["png"]) if slot.get("png") else None,
            }
            for n, slot in sorted(iv.items())
        ],
    }
    path = INCOMING / "speaking-manifest.json"
    path.write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n")
    print(f"manifest lrp={len(man['lrp'])} iv={len(man['iv'])} -> {path}")
    return lrp, iv


def sync_assets(kind: str, nums: list[int] | None = None):
    ensure_dirs()
    lrp, iv = write_manifest()
    if kind in ("lrp", "all"):
        items = sorted(lrp.items())
        if nums:
            items = [(n, lrp[n]) for n in nums if n in lrp]
        for n, slot in items:
            if len(slot["qs"]) < 7:
                print(f"WARN S-LRP{n} only {len(slot['qs'])} clips", file=sys.stderr)
            paths = copy_lrp_audio(n, slot)
            scene = scene_for(n, slot.get("title") or "", slot.get("png"))
            print(f"S-LRP{n} audio={len(paths['qs'])} scene={scene}")
    if kind in ("iv", "all"):
        items = sorted(iv.items())
        if nums:
            items = [(n, iv[n]) for n in nums if n in iv]
        for n, slot in items:
            if n in IV_SKIP:
                print(f"skip S-INT{n}")
                continue
            if len(slot["qs"]) < 4:
                print(f"WARN S-INT{n} only {len(slot['qs'])} clips", file=sys.stderr)
                continue
            paths = copy_iv_audio(n, slot)
            print(f"S-INT{n} audio={len(paths['qs'])}")


def main():
    args = sys.argv[1:]
    if not args or args[0] == "manifest":
        write_manifest()
        return
    kind = args[0]
    nums = [int(x) for x in args[1:]] if len(args) > 1 else None
    sync_assets(kind, nums)


if __name__ == "__main__":
    main()
