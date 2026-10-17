#!/usr/bin/env python3
"""Align Listen-and-Repeat clips to 应复述: strip 'Listen and repeat only once' and fix HIT Q1 samples."""
import json
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np
import whisper

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIT = {
    3: "The computer lab has free Wi-Fi access.",
    4: "Welcome to our campus tour.",
    5: "Enter your name and student ID number.",
    6: "You can buy tickets at the entrance.",
    8: "You can use these tools for gardening.",
}
MOCKS = [
    "2025-07-04-speaking.json",
    "2025-07-04-speaking-f2.json",
    "2025-07-04-speaking-f3.json",
    "2025-07-04-speaking-f4.json",
    "2025-07-04-speaking-f5.json",
    "2025-07-05-speaking.json",
    "2025-07-05-speaking-f2.json",
    "2025-07-05-speaking-f3.json",
    "2025-07-05-speaking-f4.json",
]


def resolve(rel):
    for base in (ROOT, os.path.join(ROOT, "app")):
        p = os.path.join(base, rel)
        if os.path.isfile(p):
            return p
    return None


def load16k(src):
    tmp = tempfile.mkdtemp(prefix="wsp-")
    wav = os.path.join(tmp, "a.wav")
    subprocess.check_call(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", src, wav], stdout=subprocess.DEVNULL)
    w = wave.open(wav)
    ch, n = w.getnchannels(), w.getnframes()
    raw = w.readframes(n)
    w.close()
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if ch == 2:
        samples = samples.reshape(-1, 2).mean(axis=1)
    return samples


def slice_m4a(src, start, end, dest):
    tmp = tempfile.mkdtemp(prefix="cut-")
    wav = os.path.join(tmp, "full.wav")
    subprocess.check_call(["afconvert", "-f", "WAVE", "-d", "LEI16", src, wav], stdout=subprocess.DEVNULL)
    w = wave.open(wav)
    fr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
    a = max(0, int(start * fr))
    b = min(w.getnframes(), int(end * fr))
    w.setpos(a)
    frames = w.readframes(max(0, b - a))
    w.close()
    mid = os.path.join(tmp, "cut.wav")
    out = wave.open(mid, "w")
    out.setnchannels(ch)
    out.setsampwidth(sw)
    out.setframerate(fr)
    out.writeframes(frames)
    out.close()
    subprocess.check_call(["afconvert", "-f", "m4af", "-d", "aac", mid, dest], stdout=subprocess.DEVNULL)


def prefix_end(result):
    words = []
    for seg in result.get("segments") or []:
        words.extend(seg.get("words") or [])
    for i, w in enumerate(words):
        token = "".join(c for c in (w.get("word") or "").lower() if c.isalpha())
        if token == "once" and i + 1 < len(words):
            return float(words[i + 1]["start"])
    text = (result.get("text") or "").lower()
    if "repeat only once" in text and (result.get("segments") or []):
        # ponytail: tiny sometimes merges prefix+sentence into one segment
        segs = result["segments"]
        if len(segs) >= 2:
            return float(segs[1]["start"])
    return None


def dump(path, paper):
    json.dump(paper, open(path, "w"), indent=2, ensure_ascii=False)
    open(path, "a").write("\n")


def fix_hit():
    for n, sample in HIT.items():
        path = os.path.join(ROOT, "app/library/toefl/set-%d-speaking.json" % n)
        paper = json.load(open(path))
        t = next(x for x in paper["tasks"] if x.get("type") == "repeat" and x.get("id") == 1)
        t["sample"] = sample
        t["analysis"] = "复述：" + sample
        dump(path, paper)
        print("hit q1 sample", n, sample)


def strip_mocks(model):
    for name in MOCKS:
        path = os.path.join(ROOT, "library/toefl", name)
        paper = json.load(open(path))
        for t in paper["tasks"]:
            if t.get("type") != "repeat":
                continue
            src = resolve(t["audio"])
            if not src:
                raise SystemExit("missing " + t["audio"])
            r = model.transcribe(load16k(src), language="en", word_timestamps=True)
            start = prefix_end(r)
            if start is None:
                print("skip (no prefix)", name, t["id"], (r.get("text") or "")[:80])
                continue
            dur = float(subprocess.check_output(["afinfo", src], text=True).split("estimated duration:")[1].split()[0])
            end = min(dur, max(start + 0.8, dur - 0.05))
            # keep speech tail: last word end + 0.35
            last = 0
            for seg in r.get("segments") or []:
                for w in seg.get("words") or []:
                    last = max(last, float(w.get("end") or 0))
            if last > start:
                end = min(dur, last + 0.35)
            dest_name = os.path.splitext(os.path.basename(src))[0] + "-sent.m4a"
            dest_rel = os.path.join(os.path.dirname(t["audio"]), dest_name)
            dest = os.path.join(ROOT, dest_rel)
            slice_m4a(src, max(0, start - 0.08), end, dest)
            t["audio"] = dest_rel.replace("\\", "/")
            print("cut", name, "Q%s" % t["id"], "%.2f–%.2f" % (start, end), dest_name)
        dump(path, paper)


if __name__ == "__main__":
    fix_hit()
    model = whisper.load_model("tiny")
    strip_mocks(model)
    print("ok lr align")
