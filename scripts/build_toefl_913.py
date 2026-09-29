#!/usr/bin/env python3
"""Build 9.13 China Offline TOEFL papers. Run: python3 scripts/build_toefl_913.py"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from toefl913_listening import build_listening
from toefl913_reading import build_reading
from toefl913_speaking import build_speaking
from toefl913_writing import build_writing

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def dump(name, obj):
    path = os.path.join(ROOT, "library/toefl", name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", name, "tasks", len(obj.get("tasks", [])))


if __name__ == "__main__":
    dump("2025-09-13-reading.json", build_reading())
    dump("2025-09-13-listening.json", build_listening())
    dump("2025-09-13-writing.json", build_writing())
    dump("2025-09-13-speaking.json", build_speaking("2025-09-13", "新托福 9.13 · 口语 Form 1", 1, 1))
    dump("2025-09-13-speaking-f2.json", build_speaking("2025-09-13-s2", "新托福 9.13 · 口语 Form 2", 2, 2))
    dump("2025-09-13-speaking-f3.json", build_speaking("2025-09-13-s3", "新托福 9.13 · 口语 Form 3", 3, 3))
    dump("2025-09-13-speaking-f4.json", build_speaking("2025-09-13-s4", "新托福 9.13 · 口语 Form 4", 4, 4))
