#!/usr/bin/env python3
"""Build incoming S-INT{N}.json from Desktop PNG/HIT/Whisper + copied audio.

Skips 57–61 (PNG only, no audio). sample = stem (HIT habit). No invented essays.
"""
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
    HAND_IV,
    IV_SKIP,
    copy_iv_audio,
    ensure_dirs,
    parse_iv_files,
)

INCOMING = ROOT / "app/library/toefl/incoming"
OCR_PLAIN = ROOT / "scripts/ocr_plain.swift"
DEFAULT_INSTR = "Listen to the question, then respond."


def load_hit_by_title() -> dict[str, list[str]]:
    by: dict[str, list[str]] = {}
    for f in glob.glob(str(ROOT / "app/library/toefl/set-*-speaking.json")):
        p = json.load(open(f))
        cur = None
        stems: list[str] = []
        for t in p.get("tasks") or []:
            if t.get("type") != "interview":
                continue
            title = (t.get("title") or "").lower()
            if title != cur:
                if cur and len(stems) == 4:
                    by.setdefault(cur, stems)
                cur = title
                stems = []
            stems.append(t.get("stem") or "")
        if cur and len(stems) == 4:
            by.setdefault(cur, stems)
    return by


HIT = load_hit_by_title()
_whisper_model = None


def whisper_stems(audio_paths: dict[int, str]) -> list[str]:
    global _whisper_model
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return []
    if _whisper_model is None:
        _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    out = []
    for q in range(1, 5):
        rel = audio_paths.get(q)
        if not rel:
            return []
        path = ROOT / rel
        segs, _ = _whisper_model.transcribe(str(path), language="en")
        text = " ".join(s.text for s in segs).strip()
        text = re.sub(r"\s+", " ", text).strip()
        if text and text[-1] not in ".?!":
            text += "?" if "?" not in text else ""
        if text and text[0].islower():
            text = text[0].upper() + text[1:]
        out.append(text)
    return out


def clean_stem(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    s = re.split(r"[\u4e00-\u9fff]", s, 1)[0].strip()
    s = re.sub(r"^(?:\d+\s+)?(?:Play|Q\d+|Question\s*\d+)\s*", "", s, flags=re.I)
    s = re.sub(r"\s+(Hide|Record|Play|Score|Clear).*$", "", s, flags=re.I).strip()
    return strip_interview_stem(s)


def strip_interview_stem(s: str) -> str:
    """Drop exam/research-study intros so stem/sample is the question (HIT habit)."""
    s = re.sub(r"\s+", " ", s or "").strip()
    for _ in range(4):
        nxt = re.sub(
            r"^An interviewer will ask you questions\b.*?No time for preparation will be provided\.\s*",
            "",
            s,
            flags=re.I,
        )
        nxt = re.sub(
            r"^You have (?:agreed to participate|volunteered|signed up)\b.*?"
            r"(?:The researcher will ask you some questions|who will ask you a few questions)\.\s*",
            "",
            nxt,
            flags=re.I,
        )
        nxt = re.sub(
            r"^You(?:'re| are) (?:taking part|participating)\b.*?"
            r"(?:questions|implementation)\.\s*",
            "",
            nxt,
            flags=re.I,
        )
        nxt = re.sub(
            r"^A researcher is studying\b.*?questions about[^.]*\.\s*",
            "",
            nxt,
            flags=re.I,
        )
        nxt = re.sub(
            r"^Thanks?(?: you)? (?:for|in advance)[^.]*\.\s*",
            "",
            nxt,
            flags=re.I,
        )
        nxt = re.sub(
            r"^(?:Today )?I(?:'d| would)? like to (?:ask you some questions|talk with you|discuss|learn)[^.]*\.\s*",
            "",
            nxt,
            flags=re.I,
        )
        nxt = nxt.strip()
        if nxt == s:
            break
        s = nxt
    s = re.sub(r"^(?:First|To start),?\s+", "", s, flags=re.I).strip()
    if s and s[0].islower():
        s = s[0].upper() + s[1:]
    return s


def ocr_questions(png: Path) -> tuple[str, list[str]]:
    """Return (instruction, stems) from hand PNG right panel."""
    if not png or not png.exists():
        return "", []
    try:
        from PIL import Image
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
        from PIL import Image
    im = Image.open(png).convert("RGB")
    w, h = im.size
    crop = im.crop((int(w * 0.42), int(h * 0.08), int(w * 0.99), int(h * 0.95)))
    tmp = Path("/tmp") / f"int-right-{png.stem}.png"
    crop.save(tmp)
    text = ""
    if OCR_PLAIN.exists():
        r = subprocess.run(
            ["swift", str(OCR_PLAIN), str(tmp), "0"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        text = r.stdout or ""
    if not text:
        return "", []

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    junk = re.compile(
        r"^(Speed|Play|Record|Hide|Score|Clear|Start|Automatic|Vocabulary|"
        r"Show vocabulary|Play instructions|Hide text|mine|text)$",
        re.I,
    )
    instr_parts: list[str] = []
    stems: list[str] = []
    cur: list[str] = []
    in_q = False
    for ln in lines:
        if junk.match(ln) or re.search(r"[\u4e00-\u9fff]", ln):
            continue
        if re.match(r"^(?:Question|Q)\s*\d+", ln, re.I) or re.match(r"^\d+\s*$", ln):
            if cur:
                stems.append(clean_stem(" ".join(cur)))
                cur = []
            in_q = True
            rest = re.sub(r"^(?:Question|Q)\s*\d+\s*[:.]?\s*", "", ln, flags=re.I).strip()
            if rest and re.search(r"[A-Za-z]", rest):
                cur.append(rest)
            continue
        if re.search(r"Listen to the question|then respond|Interview", ln, re.I):
            instr_parts.append(ln)
            continue
        if in_q and re.search(r"[A-Za-z]", ln):
            cur.append(ln)
        elif not in_q and re.search(r"Listen|respond|question", ln, re.I):
            instr_parts.append(ln)
    if cur:
        stems.append(clean_stem(" ".join(cur)))
    stems = [s for s in stems if s and len(s.split()) >= 3]
    instruction = re.sub(r"\s+", " ", " ".join(instr_parts)).strip()
    return instruction, stems


def title_zh_for(title: str) -> str:
    if re.search(r"[\u4e00-\u9fff]", title or ""):
        return title
    return "面试问答"


def build_one(n: int) -> Path:
    ensure_dirs()
    if n in IV_SKIP:
        raise SystemExit(f"S-INT{n} skipped (no audio)")
    slots = parse_iv_files()
    if n not in slots:
        raise SystemExit(f"missing S-INT{n}")
    slot = slots[n]
    if len(slot["qs"]) < 4:
        raise SystemExit(f"S-INT{n} incomplete audio {sorted(slot['qs'])}")
    audio = copy_iv_audio(n, slot)
    title = slot.get("title") or f"INT {n}"
    title_zh = title_zh_for(title)

    key = title.lower().strip()
    key2 = re.sub(r"\s+2$", "", key)
    stems: list[str] = []
    if key in HIT:
        stems = HIT[key][:]
    elif key2 in HIT:
        stems = HIT[key2][:]

    o_instr, o_stems = "", []
    if slot.get("png"):
        o_instr, o_stems = ocr_questions(slot["png"])
        (INCOMING / "ocr").mkdir(exist_ok=True)
        (INCOMING / "ocr" / f"S-INT{n}.txt").write_text(
            (o_instr or "") + "\n---\n" + "\n".join(o_stems)
        )

    if len(stems) != 4:
        stems = o_stems[:4] if len(o_stems) >= 4 else []
    if len(stems) != 4:
        stt = whisper_stems(audio["qs"])
        if len(stt) == 4 and all(len(s.split()) >= 3 for s in stt):
            stems = stt
            print(f"S-INT{n} used whisper STT")
    if len(stems) != 4:
        raise SystemExit(f"S-INT{n} got {len(stems)} stems, need 4")
    stems = [strip_interview_stem(s) for s in stems]
    if any(len(s.split()) < 3 for s in stems):
        raise SystemExit(f"S-INT{n} stem too short after intro strip")

    instruction = o_instr if o_instr and "Listen" in o_instr else DEFAULT_INSTR

    tasks = []
    for q in range(1, 5):
        stem = stems[q - 1]
        tasks.append(
            {
                "type": "interview",
                "module": 1,
                "id": q,
                "set": f"S-INT{n}-Q{q}",
                "speakSec": 45,
                "instruction": instruction,
                "audio": audio["qs"][q],
                "stem": stem,
                "sample": stem,
                "analysis": f"围绕「{title}」作答。",
                "title": title,
                "titleZh": title_zh,
            }
        )
    out = {"set": n, "title": title, "tasks": tasks}
    path = INCOMING / f"S-INT{n}.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path}")
    return path


def main():
    args = sys.argv[1:]
    if not args:
        raise SystemExit("usage: build_speaking_iv.py N [N...] | all")
    all_nums = sorted(n for n in parse_iv_files() if n not in IV_SKIP)
    nums = all_nums if args[0] == "all" else [int(x) for x in args]
    fails = []
    for n in nums:
        if n in IV_SKIP:
            print(f"skip S-INT{n}")
            continue
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
