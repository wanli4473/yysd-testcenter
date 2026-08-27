#!/usr/bin/env python3
"""Stamp listening 题型 groups with audioStart/audioEnd (and section.audioClips).

Usage: python3 scripts/mark_listen_group_audio.py --volume 21
       python3 scripts/mark_listen_group_audio.py --volume 20-5
ponytail: Whisper tiny + look-at cues; equal-split when one 口播 covers two 题型组.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "library/mock/cambridge-listening"
TAX = ROOT / "library/listening-taxonomy.json"
CACHE = ROOT / "scripts/.whisper_cache"

# Hand-tuned C9 T4 S2 (pilot). Whisper equal-split would miss the content cut.
OVERRIDES = {
    (9, 4, 2, 11, 13): (0, 161.8),
    (9, 4, 2, 14, 18): (161.8, 292.5),
    (9, 4, 2, 19, 20): (292.5, 378.5),
}

WORDN = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20, "twenty-one": 21, "twenty two": 22, "twenty-two": 22,
    "twenty-three": 23, "twenty-four": 24, "twenty-five": 25, "twenty-six": 26,
    "twenty-seven": 27, "twenty-eight": 28, "twenty-nine": 29, "thirty": 30,
    "thirty-one": 31, "thirty-two": 32, "thirty-three": 33, "thirty-four": 34,
    "thirty-five": 35, "thirty-six": 36, "thirty-seven": 37, "thirty-eight": 38,
    "thirty-nine": 39, "forty": 40,
}

AUDIO_FILE_RE = re.compile(r"""(?:["']audio["']|audio)\s*:\s*['"]([^'"]+)['"]""")
LOOK_RE = re.compile(
    r"(?:now\s+)?(?:please\s+)?(?:look\s+at|listen\s+(?:and\s+)?(?:answer|to))\s+questions?\s+(\d+)(?:\s*(?:to|through|and|-|–)\s*(\d+))?",
    re.I,
)
ANSWER_RE = re.compile(
    r"(?:now\s+)?answer\s+questions?\s+(\d+)(?:\s*(?:to|through|and|-|–)\s*(\d+))?",
    re.I,
)
END_RE = re.compile(r"(?:that\s+is\s+)?(?:the\s+)?end\s+of\s+(?:the\s+)?section", re.I)


def tnum(x: float) -> str:
    x = round(float(x) + 1e-9, 1)
    return str(int(x)) if x == int(x) else str(x)


def words_to_nums(s: str) -> str:
    s = s.lower().replace("—", " ").replace("–", "-").replace("/", " ")
    s = re.sub(r"[^a-z0-9'\- ]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    for w, n in sorted(WORDN.items(), key=lambda kv: -len(kv[0])):
        s = re.sub(r"\b" + re.escape(w) + r"\b", str(n), s)
    return s


def parse_volumes(s: str) -> list[int]:
    if "-" in s:
        a, b = map(int, s.split("-", 1))
        step = -1 if a > b else 1
        return list(range(a, b + step, step))
    return [int(s)]


def to_wav(src: Path) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    wav = CACHE / (src.name.replace(".", "_") + ".16k.wav")
    if wav.exists() and wav.stat().st_mtime >= src.stat().st_mtime:
        return wav
    subprocess.check_call(
        ["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", str(src), str(wav)]
    )
    return wav


def load_wav16(path: Path):
    import numpy as np
    import wave
    with wave.open(str(path), "rb") as w:
        # ponytail: afconvert -c 1 is mono; downmix leftover stereo so timestamps stay real-time
        ch = w.getnchannels()
        sr = w.getframerate()
        raw = w.readframes(w.getnframes())
    audio = np.frombuffer(raw, dtype="<i2").astype("float32") / 32768.0
    if ch == 2:
        audio = audio.reshape(-1, 2).mean(axis=1)
    elif ch != 1:
        raise SystemExit("wav channels %s in %s" % (ch, path))
    if sr != 16000:
        raise SystemExit("expected 16 kHz wav, got %s from %s" % (sr, path))
    return audio


def transcribe(model, src: Path) -> list[dict]:
    cache_file = CACHE / (src.name + ".segments.json")
    if cache_file.exists() and cache_file.stat().st_mtime >= src.stat().st_mtime:
        return json.loads(cache_file.read_text())["segments"]
    wav = to_wav(src)
    audio = load_wav16(wav)
    result = model.transcribe(audio, language="en", verbose=False)
    segs = [
        {"start": float(s["start"]), "end": float(s["end"]), "text": s.get("text") or ""}
        for s in (result.get("segments") or [])
    ]
    cache_file.write_text(json.dumps({"segments": segs}, ensure_ascii=False))
    return segs


def _joined_match(segments, i, rx, max_join=3):
    """Match rx starting at segment i; skip if the later segments already match alone."""
    n = len(segments)
    pieces = []
    for j in range(i, min(n, i + max_join)):
        pieces.append(words_to_nums(segments[j]["text"]))
        blob = " ".join(pieces)
        m = rx.search(blob)
        if not m:
            continue
        if len(pieces) > 1 and rx.search(" ".join(pieces[1:])):
            return None
        return m, float(segments[i]["start"])
    return None


def extract_cues(segments: list[dict]) -> list[dict]:
    cues = []
    for i in range(len(segments)):
        hit = _joined_match(segments, i, LOOK_RE) or _joined_match(segments, i, ANSWER_RE)
        if hit:
            m, start = hit
            q1 = int(m.group(1))
            q2 = int(m.group(2) or q1)
            if q2 < q1:
                q1, q2 = q2, q1
            if 1 <= q1 <= 40 and 1 <= q2 <= 40:
                cues.append({"kind": "look", "start": start, "q1": q1, "q2": q2})
        if _joined_match(segments, i, END_RE):
            cues.append({"kind": "end", "start": float(segments[i]["start"])})
    # earliest per (kind, q1, q2); end cues: earliest
    best = {}
    ends = []
    for c in cues:
        if c["kind"] == "end":
            ends.append(c)
            continue
        key = (c["kind"], c["q1"], c["q2"])
        if key not in best or c["start"] < best[key]["start"]:
            best[key] = c
    out = list(best.values())
    if ends:
        out.append(min(ends, key=lambda c: c["start"]))
    return sorted(out, key=lambda c: c["start"])


def is_subset(a: dict, b: dict) -> bool:
    return a["qFrom"] >= b["qFrom"] and a["qTo"] <= b["qTo"] and (a["qFrom"], a["qTo"]) != (b["qFrom"], b["qTo"])


def map_clips(groups: list[dict], cues: list[dict], duration: float) -> tuple[list[dict], list[str]]:
    flags = []
    looks = [c for c in cues if c["kind"] == "look"]
    end_at = next((c["start"] for c in cues if c["kind"] == "end"), duration)
    if end_at <= 0:
        end_at = duration
    groups = sorted(groups, key=lambda g: (g["qFrom"], -g["qTo"]))
    if not groups:
        return [], flags

    parents = [g for g in groups if not any(is_subset(g, o) for o in groups)]
    nested = [g for g in groups if g not in parents]

    if not looks and len(parents) > 1:
        flags.append("NO_CUES equal-split %d groups" % len(parents))
        step = (end_at / len(parents)) if end_at else 1.0
        parent_windows = [(g, None, step * i, step * (i + 1)) for i, g in enumerate(parents)]
        return _clips_from_windows(groups, parents, nested, parent_windows, duration, end_at, flags)

    def cover(g):
        covering = [c for c in looks if c["q1"] <= g["qFrom"] and c["q2"] >= g["qTo"]]
        if covering:
            return min(covering, key=lambda c: (c["q2"] - c["q1"], c["start"]))
        overlap = [c for c in looks if not (c["q2"] < g["qFrom"] or c["q1"] > g["qTo"])]
        return overlap[0] if overlap else None

    assigned = [(g, cover(g)) for g in parents]
    # next-look / section-end boundaries for each parent
    parent_windows = []
    for i, (g, cue) in enumerate(assigned):
        start = 0.0 if i == 0 else (cue["start"] if cue else None)
        nxt = assigned[i + 1][1] if i + 1 < len(assigned) else None
        end = nxt["start"] if nxt else end_at
        if start is None:
            prev_end = parent_windows[-1][3] if parent_windows else 0.0
            start = prev_end
            flags.append("UNMATCHED %s Q%d-%d (no look-at, chained)" % (g["id"], g["qFrom"], g["qTo"]))
        if cue and (cue["q1"] < g["qFrom"] or cue["q2"] > g["qTo"]):
            flags.append("WIDE %s look-at Q%d-%d covers Q%d-%d" % (g["id"], cue["q1"], cue["q2"], g["qFrom"], g["qTo"]))
        if not cue and i == 0:
            flags.append("UNMATCHED %s Q%d-%d (no look-at, start=0)" % (g["id"], g["qFrom"], g["qTo"]))
        parent_windows.append((g, cue, start, end))

    # disjoint parents sharing one look-at → equal-split that interval
    i = 0
    while i < len(parent_windows):
        g, cue, start, end = parent_windows[i]
        if cue is None:
            i += 1
            continue
        j = i + 1
        while j < len(parent_windows) and parent_windows[j][1] is cue:
            j += 1
        n = j - i
        if n > 1:
            span = parent_windows[j - 1][3] - start
            step = span / n
            for k in range(n):
                gg, cc, _, _ = parent_windows[i + k]
                parent_windows[i + k] = (gg, cc, start + step * k, start + step * (k + 1))
                flags.append("SPLIT %s equal-share of look-at Q%d-%d" % (gg["id"], cue["q1"], cue["q2"]))
        i = j

    return _clips_from_windows(groups, parents, nested, parent_windows, duration, end_at, flags)


def _clips_from_windows(groups, parents, nested, parent_windows, duration, end_at, flags):
    clips = []
    by_id = {}
    for g, cue, start, end in parent_windows:
        if end <= start:
            end = min(duration, start + 1)
            flags.append("BAD %s end<=start, nudged" % g["id"])
        clip = {"id": g["id"], "qFrom": g["qFrom"], "qTo": g["qTo"], "start": start, "end": end}
        clips.append(clip)
        by_id[g["id"]] = clip
    for g in nested:
        parent = next((p for p in parents if is_subset(g, p)), None)
        src = by_id.get(parent["id"]) if parent else None
        if src:
            clips.append({"id": g["id"], "qFrom": g["qFrom"], "qTo": g["qTo"], "start": src["start"], "end": src["end"]})
            flags.append("OVERLAP %s nested in %s" % (g["id"], parent["id"]))
        else:
            flags.append("UNMATCHED nested %s" % g["id"])
            clips.append({"id": g["id"], "qFrom": g["qFrom"], "qTo": g["qTo"], "start": 0.0, "end": end_at})
    if len(groups) >= 3:
        flags.append("MULTI %s (%d groups)" % (groups[0]["id"].rsplit("-q", 1)[0], len(groups)))
    return clips, flags


def apply_overrides(vol: int, test: int, part: int, clips: list[dict]) -> list[dict]:
    out = []
    for c in clips:
        o = OVERRIDES.get((vol, test, part, c["qFrom"], c["qTo"]))
        if o:
            c = dict(c, start=o[0], end=o[1])
        out.append(c)
    return out


def extract_audios(html: str) -> list[str]:
    i = html.find("TEST")
    chunk = html[i:] if i >= 0 else html
    out = []
    for f in AUDIO_FILE_RE.findall(chunk):
        if re.search(r"audio", f, re.I) and f not in out:
            out.append(f)
        if len(out) == 4:
            break
    return out


def fmt_clip_obj(c: dict, json_style: bool) -> str:
    a, b = tnum(c["start"]), tnum(c["end"])
    if json_style:
        return '{"qFrom": %d, "qTo": %d, "audioStart": %s, "audioEnd": %s}' % (c["qFrom"], c["qTo"], a, b)
    return "{qFrom:%d,qTo:%d,audioStart:%s,audioEnd:%s}" % (c["qFrom"], c["qTo"], a, b)


def inject_audio_clips(html: str, audio_file: str, clips: list[dict]) -> str:
    file_re = re.escape(audio_file)
    m = re.search(r"""((?:["']audio["']|audio)\s*:\s*['"]%s['"]\s*,)""" % file_re, html)
    if not m:
        return html
    json_style = bool(re.match(r"""["']audio["']""", m.group(1)))
    arr = ",".join(fmt_clip_obj(c, json_style) for c in clips)
    if json_style:
        block = '\n      "audioClips": [%s],' % arr
    else:
        block = " audioClips:[%s]," % arr
    start = m.end()
    rest = html[start:]
    old = re.match(r"""\s*(?:["']audioClips["']|audioClips)\s*:\s*\[[^\]]*\]\s*,""", rest)
    if old:
        return html[:start] + block + rest[old.end():]
    return html[:start] + block + rest


def inject_group_times(html: str, clip: dict) -> str:
    q1, q2 = clip["qFrom"], clip["qTo"]
    qpat = r"%d\s*(?:[–\-]|and)\s*%d" % (q1, q2)
    title = re.compile(
        r"""((?:["']title["']|title)\s*:\s*['"]Questions?\s+""" + qpat + r"""['"]\s*,)"""
        r"""(?:\s*(?:["']audioStart["']|audioStart)\s*:\s*[\d.]+\s*,\s*(?:["']audioEnd["']|audioEnd)\s*:\s*[\d.]+\s*,)?""",
        re.I,
    )
    m = title.search(html)
    if not m:
        return html
    head = m.group(1)
    json_style = '"title"' in head or "'title'" in head[:8]
    a, b = tnum(clip["start"]), tnum(clip["end"])
    if json_style:
        ins = '%s\n          "audioStart": %s,\n          "audioEnd": %s,' % (head, a, b)
    else:
        ins = "%s audioStart:%s, audioEnd:%s," % (head, a, b)
    return html[: m.start()] + ins + html[m.end():]


def section_of(q_from: int) -> int:
    # ponytail: IELTS parts are Q1-10/11-20/21-30/31-40; ignore taxonomy part typos
    if q_from <= 10:
        return 1
    if q_from <= 20:
        return 2
    if q_from <= 30:
        return 3
    return 4


def load_groups(vol: int) -> dict[tuple[int, int], list[dict]]:
    data = json.loads(TAX.read_text())
    by: dict[tuple[int, int], list[dict]] = {}
    for g in data["groups"]:
        if str(g.get("volume")) != str(vol):
            continue
        if "qFrom" not in g:
            continue
        key = (int(g["test"]), section_of(int(g["qFrom"])))
        by.setdefault(key, []).append(g)
    return by


def duration_of(src: Path, segs: list[dict]) -> float:
    if segs:
        return max(float(s["end"]) for s in segs)
    return 0.0


def process_volume(vol: int, model, dry: bool) -> list[str]:
    by = load_groups(vol)
    report = []
    for test in (1, 2, 3, 4):
        path = AUDIO_DIR / ("cambridge-%d-test-%d.html" % (vol, test))
        if not path.exists():
            report.append("MISSING paper %s" % path.name)
            continue
        html = path.read_text()
        audios = extract_audios(html)
        if len(audios) != 4:
            report.append("AUDIO count %s → %s" % (path.name, audios))
        for part, name in enumerate(audios, 1):
            src = AUDIO_DIR / name
            groups = by.get((test, part), [])
            if not src.exists():
                report.append("MISSING mp3 %s" % name)
                continue
            if not groups:
                continue
            print("  %s T%d S%d %s (%d groups)" % (vol, test, part, name, len(groups)))
            segs = transcribe(model, src)
            dur = duration_of(src, segs)
            cues = extract_cues(segs)
            clips, flags = map_clips(groups, cues, dur)
            clips = apply_overrides(vol, test, part, clips)
            for f in flags:
                print("    !", f)
                report.append("剑%d T%d S%d %s" % (vol, test, part, f))
            looks = [c for c in cues if c["kind"] == "look"]
            print("    looks", [(c["q1"], c["q2"], round(c["start"], 1)) for c in looks], "dur", round(dur, 1))
            if not looks:
                for s in segs[:6]:
                    print("    txt", round(s["start"], 1), (s["text"] or "")[:90])
            for c in clips:
                print("    clip Q%d-%d %s→%s" % (c["qFrom"], c["qTo"], tnum(c["start"]), tnum(c["end"])))
            if dry:
                continue
            html = inject_audio_clips(html, name, clips)
            for c in clips:
                html = inject_group_times(html, c)
        if not dry:
            path.write_text(html)
            print("  wrote", path.name)
    return report


def selfcheck() -> None:
    segs = [
        {"start": 9.6, "end": 12, "text": "Now look at questions 11 to 13"},
        {"start": 80, "end": 82, "text": "hello there"},
        {"start": 162, "end": 165, "text": "Now look at questions 14 to 20"},
        {"start": 378.5, "end": 380, "text": "That is the end of section two"},
    ]
    cues = extract_cues(segs)
    looks = [c for c in cues if c["kind"] == "look"]
    assert looks[0]["q1"] == 11 and looks[0]["q2"] == 13
    assert looks[1]["q1"] == 14 and looks[1]["q2"] == 20
    groups = [
        {"id": "a", "qFrom": 11, "qTo": 13},
        {"id": "b", "qFrom": 14, "qTo": 18},
        {"id": "c", "qFrom": 19, "qTo": 20},
        {"id": "n", "qFrom": 13, "qTo": 14},
    ]
    # nested 13-14 sits inside 11-13? 13-14 is not subset of 11-13. subset of none of 14-18 either.
    # use 11-16 parent instead
    groups = [
        {"id": "a", "qFrom": 11, "qTo": 16},
        {"id": "n", "qFrom": 13, "qTo": 14},
        {"id": "b", "qFrom": 17, "qTo": 20},
    ]
    cues2 = [
        {"kind": "look", "start": 10, "q1": 11, "q2": 16},
        {"kind": "look", "start": 200, "q1": 17, "q2": 20},
        {"kind": "end", "start": 400},
    ]
    clips, flags = map_clips(groups, cues2, 420)
    by = {(c["qFrom"], c["qTo"]): c for c in clips}
    assert by[(11, 16)]["start"] == 0
    assert by[(11, 16)]["end"] == 200
    assert by[(13, 14)]["start"] == 0 and by[(13, 14)]["end"] == 200
    assert by[(17, 20)]["start"] == 200
    assert any("OVERLAP" in f for f in flags)
    # wide equal split
    groups = [
        {"id": "a", "qFrom": 11, "qTo": 13},
        {"id": "b", "qFrom": 14, "qTo": 18},
        {"id": "c", "qFrom": 19, "qTo": 20},
    ]
    clips, flags = map_clips(groups, cues, 409)
    by = {(c["qFrom"], c["qTo"]): c for c in clips}
    assert by[(11, 13)]["start"] == 0
    assert abs(by[(11, 13)]["end"] - 162) < 0.01
    assert any("SPLIT" in f for f in flags)
    assert abs(by[(14, 18)]["end"] - by[(19, 20)]["start"]) < 0.01
    print("ok: mark_listen_group_audio selfcheck")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--volume", required=True, help="21 or 20-5")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--model", default="tiny")
    args = ap.parse_args()
    selfcheck()
    vols = parse_volumes(args.volume)
    import whisper
    model = whisper.load_model(args.model)
    all_report = []
    for vol in vols:
        if vol < 5 or vol > 21:
            print("skip vol", vol)
            continue
        print("\n=== 剑", vol, "===")
        all_report.extend(process_volume(vol, model, args.dry_run))
    print("\n=== 难段清单 (%d) ===" % len(all_report))
    for line in all_report:
        print(line)
    out = CACHE / "hard_cases.txt"
    CACHE.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(all_report) + ("\n" if all_report else ""))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--selfcheck":
        selfcheck()
        sys.exit(0)
    main()
