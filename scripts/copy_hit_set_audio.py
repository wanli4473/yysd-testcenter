#!/usr/bin/env python3
"""Copy set2-10 HIT audio to app/library/toefl/audio with ASCII names."""
import os
import shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MEDIA = os.path.expanduser(
    "~/Library/Application Support/Cursor/AgentStores/"
    "cursor_agent_stores/bc-8889b4e3-21e7-4b1d-a4d7-55413f739096/files/media"
)
OUT = os.path.join(ROOT, "app/library/toefl/audio")


def find_skill(set_n, skill):
    base = os.path.join(MEDIA, "set%d" % set_n, "Set %d" % set_n)
    if not os.path.isdir(base):
        return None
    for name in os.listdir(base):
        if name.upper().endswith("-" + skill.upper()):
            return os.path.join(base, name)
    return None


def copy(src, dest_name):
    dest = os.path.join(OUT, dest_name)
    if os.path.exists(dest) and os.path.getsize(dest) == os.path.getsize(src):
        return dest
    shutil.copy2(src, dest)
    return dest


def main():
    os.makedirs(OUT, exist_ok=True)
    n_ok = 0
    for set_n in range(2, 11):
        listen = find_skill(set_n, "Listening")
        speak = find_skill(set_n, "Speaking")
        if listen:
            for fn in os.listdir(listen):
                if not fn.endswith(".mp3"):
                    continue
                src = os.path.join(listen, fn)
                if fn.startswith("LR-"):
                    k = int(fn.split("-")[1])
                    copy(src, "Set%d-L-CR%d.mp3" % (set_n, k))
                    n_ok += 1
                elif fn.startswith("C-"):
                    k = int(fn.split("-")[1])
                    copy(src, "Set%d-L-LCN%d.mp3" % (set_n, k))
                    n_ok += 1
                elif fn.startswith("A-"):
                    k = int(fn.split("-")[1])
                    copy(src, "Set%d-L-ANO%d.mp3" % (set_n, k))
                    n_ok += 1
                elif fn.startswith("AT-"):
                    copy(src, "Set%d-L-AT1.mp3" % set_n)
                    n_ok += 1
        if speak:
            for fn in os.listdir(speak):
                if not fn.endswith(".mp3"):
                    continue
                src = os.path.join(speak, fn)
                if fn.startswith("LNR-"):
                    copy(src, "Set%d-S-LR1.mp3" % set_n)
                    n_ok += 1
                elif fn.startswith("INT-"):
                    copy(src, "Set%d-S-IV1.mp3" % set_n)
                    n_ok += 1
    print("copied", n_ok, "audio files ->", OUT)


if __name__ == "__main__":
    main()
