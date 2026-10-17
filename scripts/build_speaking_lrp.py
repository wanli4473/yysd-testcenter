#!/usr/bin/env python3
"""Build incoming S-LRP{N}.json from Desktop PNG OCR + copied audio."""
from __future__ import annotations

import glob
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from speaking_hand_assets import (  # noqa: E402
    HAND_LR,
    copy_lrp_audio,
    ensure_dirs,
    parse_lrp_files,
    scene_for,
)

INCOMING = ROOT / "app/library/toefl/incoming"
OCR_PLAIN = ROOT / "scripts/ocr_plain.swift"
OCR_PNG = ROOT / "scripts/ocr_png"


def load_hit_by_title() -> dict[str, list[str]]:
    by: dict[str, list[str]] = {}
    for f in glob.glob(str(ROOT / "app/library/toefl/set-*-speaking.json")):
        p = json.load(open(f))
        cur = None
        samples: list[str] = []
        for t in p.get("tasks") or []:
            if t.get("type") != "repeat":
                continue
            title = (t.get("title") or "").lower()
            if title != cur:
                if cur and len(samples) == 7:
                    by.setdefault(cur, samples)
                cur = title
                samples = []
            samples.append(t.get("sample") or "")
        if cur and len(samples) == 7:
            by.setdefault(cur, samples)
    return by


HIT = load_hit_by_title()
DEFAULT_INSTR = "Listen to the speaker and repeat what the speaker says. Repeat only once."


def load_hit_instr() -> dict[str, str]:
    by: dict[str, str] = {}
    for f in glob.glob(str(ROOT / "app/library/toefl/set-*-speaking.json")):
        p = json.load(open(f))
        for t in p.get("tasks") or []:
            if t.get("type") != "repeat":
                continue
            title = (t.get("title") or "").lower()
            instr = (t.get("instruction") or "").strip()
            if title and instr and title not in by:
                by[title] = instr
    return by


HIT_INSTR = load_hit_instr()
_whisper_model = None


def sanitize_instruction(instr: str, sample: str = "") -> str:
    s = re.sub(r"\s+", " ", instr or "").strip()
    s = re.split(
        r"\s+(?:Play instructions|Sentence['’\s]*\d|\d+\)\s*Play|\bPlay\b|Hide text)",
        s,
        maxsplit=1,
        flags=re.I,
    )[0].strip()
    if sample:
        cut = sample[:24]
        if cut and cut in s:
            s = s.split(cut)[0].strip()
    s = re.sub(r"\s+(SIN|ANTONIN|Ent)\.?.*$", "", s, flags=re.I).strip()
    if s and s[-1] not in ".!?":
        s += "."
    if "Listen" not in s or "repeat" not in s.lower() or len(s.split()) < 8:
        return DEFAULT_INSTR
    return s


def whisper_samples(audio_paths: dict[int, str]) -> list[str]:
    """Transcribe q1..q7 from repo-relative audio paths."""
    global _whisper_model
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return []
    if _whisper_model is None:
        _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    out = []
    for q in range(1, 8):
        rel = audio_paths.get(q)
        if not rel:
            return []
        path = ROOT / rel
        segs, _ = _whisper_model.transcribe(str(path), language="en")
        text = " ".join(s.text for s in segs).strip()
        text = re.sub(r"\s+", " ", text).strip()
        if text and text[-1] not in ".?!":
            text += "."
        # whisper often lowercases first letter — restore from first alpha
        if text and text[0].islower():
            text = text[0].upper() + text[1:]
        out.append(text)
    return out


def clean_sample(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    s = re.split(r"[\u4e00-\u9fff]", s, 1)[0].strip()
    s = re.sub(r"^(?:\d+\s+)?Play\s+", "", s, flags=re.I)
    s = re.sub(r"^(?:Record|Hide text|>\s*Play)\s+", "", s, flags=re.I)
    # drop OCR garbage after a full stop
    m = re.search(r"^(.+?[.!?])(?:\s|$)", s)
    if m:
        return m.group(1).strip()
    s = re.sub(r"\s+[A-Z]{2,}[A-Za-z0-9./]*([.\s].*)?$", "", s).strip()
    s = re.sub(r"\s+(Hide|Record|Play|mine|Lit|Score|Eit|ay).*$", "", s, flags=re.I).strip()
    return s


def ocr_right_panel(png: Path) -> str:
    try:
        from PIL import Image
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
        from PIL import Image
    im = Image.open(png).convert("RGB")
    w, h = im.size
    crop = im.crop((int(w * 0.46), int(h * 0.10), int(w * 0.99), int(h * 0.92)))
    tmp = Path("/tmp") / f"lrp-right-{png.stem}.png"
    crop.save(tmp)
    if OCR_PLAIN.exists():
        r = subprocess.run(
            ["swift", str(OCR_PLAIN), str(tmp), "0"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if r.stdout.strip():
            return r.stdout
    if OCR_PNG.exists():
        r = subprocess.run([str(OCR_PNG), str(png)], capture_output=True, text=True, timeout=120)
        return r.stdout
    return ""


def parse_samples_from_ocr(text: str) -> tuple[str, list[str]]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    junk_line = re.compile(
        r"^(Speed|Play|Record|Hide|Score|Clear|Start|Automatic|Vocabulary|Show vocabulary|"
        r"Play instructions|Hide text|\.?Play mine|y mine|/ mine|ay mine|Eit|text|mine)$",
        re.I,
    )
    # split into instruction + sentence blocks by "Sentence N"
    blocks: list[tuple[str, list[str]]] = [("instr", [])]
    for ln in lines:
        m = re.match(r"^Sentence\s*(\d+)\s*$", ln, re.I)
        if m:
            blocks.append((m.group(1), []))
            continue
        blocks[-1][1].append(ln)

    instr_parts: list[str] = []
    for ln in blocks[0][1]:
        if junk_line.match(ln) or re.search(r"[\u4e00-\u9fff]", ln):
            continue
        if re.search(
            r"(Listen to the|Repeat only|You are|Your manager|Listen to the speaker|Listen to your)",
            ln,
        ):
            instr_parts.append(ln)
        elif instr_parts and re.search(r"[A-Za-z]", ln) and not ln.startswith("Start"):
            instr_parts.append(ln)

    samples: list[str] = []
    for label, blines in blocks[1:]:
        parts = []
        for ln in blines:
            if junk_line.match(ln):
                continue
            if re.search(r"[\u4e00-\u9fff]", ln):
                continue
            if re.match(r"^(Play|Record|Hide|mine)", ln, re.I):
                continue
            if re.fullmatch(r"[A-Z]{2,}[a-z]*[A-Z0-9./]{2,}\.?", ln):
                continue
            if re.search(r"[A-Za-z]", ln):
                parts.append(re.sub(r"^(?:\d+\s+)?Play\s+", "", ln, flags=re.I))
        s = clean_sample(" ".join(parts))
        if s and s[-1] not in ".?!":
            s = s + "."
        samples.append(s)

    instruction = re.sub(r"\s+", " ", " ".join(instr_parts)).strip()
    return instruction, samples


def build_one(n: int) -> Path:
    ensure_dirs()
    slots = parse_lrp_files()
    if n not in slots:
        raise SystemExit(f"missing S-LRP{n}")
    slot = slots[n]
    if len(slot["qs"]) < 7:
        raise SystemExit(f"S-LRP{n} incomplete audio {sorted(slot['qs'])}")
    audio = copy_lrp_audio(n, slot)
    title = slot.get("title") or f"LRP {n}"
    scene = scene_for(n, title, slot.get("png"))
    title_zh = "听后跟读"

    key = title.lower().strip()
    key2 = re.sub(r"\s+2$", "", key)
    if key in HIT:
        samples = HIT[key][:]
    elif key2 in HIT:
        samples = HIT[key2][:]
    else:
        samples = []

    ocr = ""
    if slot.get("png"):
        if OCR_PNG.exists():
            r = subprocess.run(
                [str(OCR_PNG), str(slot["png"])],
                capture_output=True,
                text=True,
                timeout=120,
            )
            ocr = r.stdout or ""
        if ocr.count("Sentence") < 7:
            ocr2 = ocr_right_panel(slot["png"])
            if ocr2.count("Sentence") >= ocr.count("Sentence"):
                ocr = ocr2
    (INCOMING / "ocr").mkdir(exist_ok=True)
    (INCOMING / "ocr" / f"S-LRP{n}.txt").write_text(ocr)
    o_instr, o_samples = parse_samples_from_ocr(ocr)

    if len(samples) != 7:
        samples = [s for s in o_samples if s and len(s.split()) >= 2]
    if len(samples) != 7:
        # audio STT fallback (source of truth for what to repeat)
        stt = whisper_samples(audio["qs"])
        if len(stt) == 7 and all(len(s.split()) >= 2 for s in stt):
            samples = stt
            print(f"S-LRP{n} used whisper STT")
    if len(samples) != 7:
        raise SystemExit(f"S-LRP{n} got {len(samples)} samples, need 7")

    instruction = HIT_INSTR.get(key) or HIT_INSTR.get(key2) or sanitize_instruction(
        o_instr, samples[0] if samples else ""
    )

    tasks = []
    for q in range(1, 8):
        sample = samples[q - 1]
        tasks.append(
            {
                "type": "repeat",
                "module": 1,
                "id": q,
                "set": f"S-LRP{n}-Q{q}",
                "speakSec": 8,
                "prepSec": 3,
                "instruction": instruction,
                "audio": audio["qs"][q],
                "sample": sample,
                "analysis": f"复述：{sample}",
                "title": title,
                "titleZh": title_zh,
                "image": scene,
            }
        )
    out = {"set": n, "title": title, "tasks": tasks}
    if audio.get("intro"):
        out["intro"] = audio["intro"]
    path = INCOMING / f"S-LRP{n}.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path}")
    return path


def main():
    args = sys.argv[1:]
    if not args:
        raise SystemExit("usage: build_speaking_lrp.py N [N...] | all")
    nums = sorted(parse_lrp_files().keys()) if args[0] == "all" else [int(x) for x in args]
    fails = []
    for n in nums:
        try:
            build_one(n)
        except SystemExit as e:
            fails.append(str(e))
            print(e, file=sys.stderr)
    if fails:
        print(f"FAILED {len(fails)}", file=sys.stderr)
        for f in fails:
            print(f, file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
