#!/usr/bin/env python3
"""One clip per Listen-and-Repeat sentence + scene image on HIT Sets 1-10."""
import json
import os
import struct
import subprocess
import sys
import tempfile
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "app/library/toefl/audio")
HOP = 0.02
SILENCE_RMS = 350

SCENE = {
    1: ("Gym", "gym"),
    2: ("Wood Shop", "wood-shop"),
    3: ("Library", "library"),
    4: ("Campus Tour", "campus-tour"),
    5: ("Course System", "course-system"),
    6: ("Botanical Garden", "botanical-garden"),
    7: ("Woodworking Class", "woodworking-class"),
    8: ("Garden Center", "garden-center"),
    9: ("Weather Report", "weather-report"),
    10: ("Making Coffee", "making-coffee"),
}
FULL = {
    1: "Set1-S-LR1 (Gym).mp3",
    2: "Set2-S-LR2.mp3",
}


def speech_runs(path):
    w = wave.open(path)
    ch, sw, fr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    raw = w.readframes(n)
    w.close()
    hop = max(1, int(fr * HOP))
    flags = []
    for i in range(0, n, hop):
        sl = raw[i * ch * sw : (i + hop) * ch * sw]
        samples = struct.unpack("<" + "h" * (len(sl) // 2), sl) if sw == 2 else [b - 128 for b in sl]
        if not samples:
            continue
        rms = (sum(s * s for s in samples) / float(len(samples))) ** 0.5
        flags.append((i / float(fr), rms >= SILENCE_RMS))
    runs, start = [], None
    for t, on in flags:
        if on and start is None:
            start = t
        elif (not on) and start is not None:
            runs.append([start, t])
            start = None
    if start is not None:
        runs.append([start, flags[-1][0]])
    return [r for r in runs if r[1] - r[0] > 0.25], n / float(fr)


def merge_to(runs, n):
    groups = [[a, b] for a, b in runs]
    while len(groups) > n:
        gaps = [(groups[i][0] - groups[i - 1][1], i) for i in range(1, len(groups))]
        i = min(gaps)[1]
        groups[i - 1][1] = groups[i][1]
        del groups[i]
    return groups


def intro_then_seven(src):
    """First spoken block is the scene intro; the next 7 are sentences to repeat."""
    tmp = tempfile.mkdtemp(prefix="lr-")
    wav = os.path.join(tmp, "full.wav")
    subprocess.check_call(["afconvert", "-f", "WAVE", "-d", "LEI16", src, wav])
    runs, duration = speech_runs(wav)
    intro_end = None
    for i in range(1, len(runs)):
        gap = runs[i][0] - runs[i - 1][1]
        # ponytail: first pause ≥0.55s after ~6s of talk is the intro/sentence boundary (Set 1 gym)
        if runs[i - 1][1] >= 5.5 and gap >= 0.55:
            intro_end = (runs[i - 1][1] + runs[i][0]) / 2
            break
    if intro_end is None:
        raise SystemExit("no intro boundary in " + src)
    rest = [r for r in runs if r[0] >= intro_end - 0.15]
    sents = merge_to(rest, 7)
    if len(sents) != 7:
        raise SystemExit("%s: expected 7 sentences after intro, got %d" % (src, len(sents)))
    bounds = []
    for i, (a, b) in enumerate(sents):
        left = intro_end if i == 0 else (sents[i - 1][1] + a) / 2
        right = duration if i == 6 else (b + sents[i + 1][0]) / 2
        bounds.append((round(left, 2), round(right, 2)))
    print("%s  intro 0–%.2f  sentences %s" % (os.path.basename(src), intro_end, bounds))
    return round(intro_end, 2), bounds


def say_m4a(text, dest):
    aiff = dest.replace(".m4a", ".aiff")
    subprocess.check_call(["say", "-v", "Samantha", "-r", "170", "-o", aiff, "--", text])
    subprocess.check_call(["afconvert", "-f", "m4af", "-d", "aac", aiff, dest])
    os.remove(aiff)


def slice_m4a(wav, start, end, dest):
    w = wave.open(wav)
    fr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
    a = max(0, int(start * fr))
    b = min(w.getnframes(), int(end * fr))
    w.setpos(a)
    frames = w.readframes(max(0, b - a))
    w.close()
    tmp = dest + ".wav"
    out = wave.open(tmp, "w")
    out.setnchannels(ch)
    out.setsampwidth(sw)
    out.setframerate(fr)
    out.writeframes(frames)
    out.close()
    subprocess.check_call(["afconvert", "-f", "m4af", "-d", "aac", tmp, dest])
    os.remove(tmp)


# Whisper timestamps on Set2-S-LR2.mp3, snapped to mid-silence between
# the 7 应复述 sentences. Silence-split had put "Repeat only once" on Q1.
SET2_CUTS = [
    ("intro", 0.00, 10.54),
    (1, 10.54, 12.57),
    (2, 12.57, 15.96),
    (3, 15.96, 19.35),
    (4, 19.35, 23.69),
    (5, 23.69, 28.10),
    (6, 28.10, 32.78),
    (7, 32.78, 38.33),
]


def recut_set2(paper, repeats, title, image):
    full = os.path.join(AUDIO, FULL[2])
    tmp = tempfile.mkdtemp(prefix="lr-wood-")
    wav = os.path.join(tmp, "full.wav")
    subprocess.check_call(["afconvert", "-f", "WAVE", "-d", "LEI16", full, wav])
    for key, a, b in SET2_CUTS:
        name = "set-2-wood-intro.m4a" if key == "intro" else "set-2-wood-%d.m4a" % key
        slice_m4a(wav, a, b, os.path.join(AUDIO, name))
    for mod in paper.get("modules") or []:
        if mod.get("n") == 1:
            mod["intro"] = {"audio": "library/toefl/audio/set-2-wood-intro.m4a"}
    for i, t in enumerate(repeats):
        t["audio"] = "library/toefl/audio/set-2-wood-%d.m4a" % (i + 1)
        t.pop("fromSec", None)
        t.pop("toSec", None)
        t.pop("repeatSec", None)
        t["speakSec"] = 8
        t["prepSec"] = 3
        t["image"] = image
        t["title"] = title


def patch_set(n):
    path = os.path.join(ROOT, "app/library/toefl/set-%d-speaking.json" % n)
    paper = json.load(open(path))
    title, slug = SCENE[n]
    image = "library/toefl/img/scenes/%s.jpg" % slug
    repeats = [t for t in paper["tasks"] if t.get("type") == "repeat"]
    if len(repeats) != 7:
        raise SystemExit("set %d has %d repeat tasks" % (n, len(repeats)))

    if n == 1:
        # ponytail: Set 1 sentences are the official 7.18 clips; do not re-silence-split the gym reel
        print("skip set 1 (official per-sentence mp3s)")
        return
    if n == 2:
        recut_set2(paper, repeats, title, image)
        json.dump(paper, open(path, "w"), indent=2, ensure_ascii=False)
        open(path, "a").write("\n")
        print("patched", path)
        return
    if n in FULL:
        full = os.path.join(AUDIO, FULL[n])
        tmp = tempfile.mkdtemp(prefix="lr-cut-")
        wav = os.path.join(tmp, "full.wav")
        subprocess.check_call(["afconvert", "-f", "WAVE", "-d", "LEI16", full, wav])
        intro_end, segs = intro_then_seven(full)
        intro_name = "set-%d-s-lr-intro.m4a" % n
        slice_m4a(wav, 0, intro_end, os.path.join(AUDIO, intro_name))
        for mod in paper.get("modules") or []:
            if mod.get("n") == 1:
                mod["intro"] = {"audio": "library/toefl/audio/" + intro_name}
        for i, t in enumerate(repeats):
            name = "set-%d-s-lr-%d.m4a" % (n, i + 1)
            slice_m4a(wav, segs[i][0], segs[i][1], os.path.join(AUDIO, name))
            t["audio"] = "library/toefl/audio/" + name
            t.pop("fromSec", None)
            t.pop("toSec", None)
            t.pop("repeatSec", None)
            t["speakSec"] = 8
            t["prepSec"] = 3
            t["image"] = image
            t["title"] = title
    else:
        # ponytail: Sets 3-10 only shipped one spoken sentence; Q1 keeps that clip, Q2-7 are say(sample).
        real = "library/toefl/audio/Set%d-S-LR1.mp3" % n
        for i, t in enumerate(repeats):
            if i == 0:
                t["audio"] = real
                t.pop("fromSec", None)
                t.pop("toSec", None)
            else:
                name = "set-%d-s-lr-%d.m4a" % (n, i + 1)
                dest = os.path.join(AUDIO, name)
                say_m4a(t.get("sample") or "Please repeat this sentence.", dest)
                t["audio"] = "library/toefl/audio/" + name
                t.pop("fromSec", None)
                t.pop("toSec", None)
            t["speakSec"] = 8
            t["prepSec"] = 3
            t["image"] = image
            t["title"] = title

    json.dump(paper, open(path, "w"), indent=2, ensure_ascii=False)
    open(path, "a").write("\n")
    print("patched", path)


if __name__ == "__main__":
    sets = [int(x) for x in sys.argv[1:]] or list(range(1, 11))
    for n in sets:
        patch_set(n)
