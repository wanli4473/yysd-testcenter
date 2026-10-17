#!/usr/bin/env python3
"""Compare live HIT Sets 1-10 + catalog papers against official Hang-in-There media and local audio."""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MEDIA = os.path.expanduser(
    "~/Library/Application Support/Cursor/AgentStores/"
    "cursor_agent_stores/bc-8889b4e3-21e7-4b1d-a4d7-55413f739096/files/media"
)
CACHE = os.path.join(ROOT, "scripts/.ocr_cache/hit-answers")
BIN = os.path.join(os.path.dirname(__file__), ".ocr_png")
SWIFT = os.path.join(os.path.dirname(__file__), "ocr_png.swift")


def load(rel):
    return json.loads(open(os.path.join(ROOT, rel), encoding="utf-8").read())


def skill_dir(set_n, skill):
    base = os.path.join(MEDIA, "set%d" % set_n, "Set %d" % set_n)
    if not os.path.isdir(base):
        return None
    want = skill.upper()
    for name in os.listdir(base):
        if name.upper().endswith("-" + want):
            return os.path.join(base, name)
    return None


def compile_ocr():
    if os.path.exists(BIN) and os.path.getmtime(BIN) >= os.path.getmtime(SWIFT):
        return
    subprocess.check_call(["swiftc", "-O", "-o", BIN, SWIFT])


def ocr(path):
    os.makedirs(CACHE, exist_ok=True)
    key = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.relpath(path, MEDIA))
    dest = os.path.join(CACHE, key + ".txt")
    if os.path.exists(dest) and os.path.getsize(dest):
        return open(dest, encoding="utf-8").read()
    compile_ocr()
    text = subprocess.check_output([BIN, path], text=True, errors="replace")
    open(dest, "w", encoding="utf-8").write(text)
    return text


def letters_from_ocr(text):
    hits = []
    for line in text.splitlines():
        m = re.search(r"(?:Correct\s*Answer|正确答案)\s*[:：]?\s*([A-D])\b", line, re.I)
        if m:
            hits.append(m.group(1).upper())
            continue
        m = re.search(r"^([A-D])\.\s+\S+", line.strip())
        # highlighted-only pages often still print "Correct Answer: B"
    return hits


def our_answers(task):
    out = []
    if task.get("type") == "complete_words":
        for p in task.get("passage") or []:
            if p and p.get("id"):
                out.append((str(p["id"]), (p.get("prefix") or "") + (p.get("answer") or "")))
        return out
    if task.get("type") == "sentence":
        return [("sent", " ".join(task.get("answer") or []))]
    for q in task.get("questions") or []:
        out.append((str(q.get("id")), str(q.get("answer") or "")))
    return out


def audio_path(rel):
    if not rel:
        return None
    for p in (os.path.join(ROOT, rel), os.path.join(ROOT, "app", rel)):
        if os.path.exists(p):
            return p
    return None


def duration(path):
    try:
        out = subprocess.check_output(
            ["afinfo", "-i", path], text=True, errors="replace"
        )
        m = re.search(r"estimated duration: ([0-9.]+)", out)
        return float(m.group(1)) if m else None
    except Exception:
        return None


def catalog_files():
    cfg = open(os.path.join(ROOT, "assets/js/config.js"), encoding="utf-8").read()
    files = []
    for m in re.finditer(r'file:\s*"(library/toefl/[^"]+\.json)"', cfg):
        files.append(m.group(1))
    return files


def official_audio(set_n, kind, n):
    d = skill_dir(set_n, "Listening" if kind != "S" else "Speaking")
    if not d:
        return None
    names = {
        "CR": "LR-%02d-音频.mp3" % n,
        "C": "C-%02d-音频.mp3" % n,
        "A": "A-%02d-音频.mp3" % n,
        "AT": "AT-%02d-音频.mp3" % n,
        "S-LR": "LNR-01-音频.mp3",
        "S-IV": "INT-01-音频.mp3",
    }
    p = os.path.join(d, names[kind])
    return p if os.path.exists(p) else None


def main():
    errs = []
    notes = []

    print("== HIT Sets 1-10 vs official media ==")
    for n in range(1, 11):
        for skill in ("reading", "listening", "writing", "speaking"):
            rel = "app/library/toefl/set-%d-%s.json" % (n, skill)
            paper = load(rel)
            tasks = paper.get("tasks") or []
            odir = skill_dir(n, skill.capitalize() if skill != "reading" else "Reading")
            if skill == "reading":
                odir = skill_dir(n, "Reading")
            if not odir:
                errs.append("set%d %s missing official folder" % (n, skill))
                continue

            official_ans = sorted(
                f for f in os.listdir(odir) if f.endswith("答案.png")
            )
            official_q = sorted(
                f for f in os.listdir(odir) if f.endswith("题目.png")
            )
            official_mp3 = sorted(
                f for f in os.listdir(odir) if f.endswith(".mp3")
            )

            if skill == "listening":
                if len(tasks) != 21:
                    errs.append("set%d listening tasks=%d want 21" % (n, len(tasks)))
                want_mp3 = 12 + 5 + 3 + 1
                if len(official_mp3) != want_mp3:
                    notes.append("set%d official listen mp3=%d" % (n, len(official_mp3)))

            if skill == "speaking":
                repeats = [t for t in tasks if t.get("type") == "repeat"]
                for t in repeats:
                    ap = audio_path(t.get("audio"))
                    if not ap:
                        errs.append("set%d speaking Q%s missing %s" % (n, t.get("id"), t.get("audio")))
                    elif "/set-%d-s-lr-" % n in (t.get("audio") or "") and t.get("audio", "").endswith(".m4a"):
                        notes.append("set%d speaking Q%s TTS stand-in %s" % (n, t.get("id"), os.path.basename(t.get("audio"))))
                    if "TODO-TRANSCRIBE" in str(t.get("analysis") or ""):
                        notes.append("set%d speaking Q%s analysis is TODO-TRANSCRIBE" % (n, t.get("id")))
                if official_mp3 and len(official_mp3) < 2:
                    notes.append("set%d official speak mp3=%s" % (n, official_mp3))

            for t in tasks:
                a = t.get("audio")
                if a:
                    ap = audio_path(a)
                    if not ap:
                        errs.append("set%d %s missing audio %s" % (n, skill, a))
                    else:
                        sec = duration(ap)
                        if sec is not None and sec < 0.8 and t.get("type") != "choose_response":
                            errs.append("set%d %s short audio %.2fs %s" % (n, skill, sec, a))
                        if t.get("type") == "choose_response" and sec is not None and sec > 20:
                            notes.append("set%d CR suspiciously long %.1fs %s" % (n, sec, a))

            # answer-key OCR for listening choose_response + lecture
            if skill == "listening":
                cr = [t for t in tasks if t.get("type") == "choose_response"]
                for i, t in enumerate(cr, 1):
                    png = os.path.join(odir, "LR-%02d-答案.png" % i)
                    if not os.path.exists(png):
                        errs.append("set%d missing official LR-%02d-答案.png" % (n, i))
                        continue
                    text = ocr(png)
                    keys = letters_from_ocr(text)
                    ours = [ans for _, ans in our_answers(t) if ans in "ABCD"]
                    if keys and ours and keys[0] != ours[0]:
                        errs.append("set%d LR%02d official=%s ours=%s" % (n, i, keys[0], ours[0]))
                    stem_bits = re.findall(r"[A-Za-z][A-Za-z'’ ,-]{8,}", text)
                    opt_line = None
                    for line in text.splitlines():
                        if re.match(r"^[A-D]\.", line.strip()):
                            opt_line = line
                            break
                    our_opts = " ".join((t.get("questions") or [{}])[0].get("options") or {}.values())
                    if opt_line:
                        first_opt = re.sub(r"^[A-D]\.\s*", "", opt_line.strip())
                        words = [w for w in re.findall(r"[A-Za-z]{4,}", first_opt) if w.lower() not in ("your", "correct", "answer")]
                        if words and words[0].lower() not in our_opts.lower():
                            notes.append("set%d LR%02d option-A wording drift official~%r" % (n, i, first_opt[:60]))

                lec = [t for t in tasks if t.get("type") == "lecture"]
                png = os.path.join(odir, "AT-01-答案.png")
                if lec and os.path.exists(png):
                    text = ocr(png)
                    title_line = ""
                    for line in text.splitlines():
                        if re.search(r"[A-Za-z]{5,}", line) and "Listening" not in line:
                            title_line = line.strip()
                            break
                    keys = letters_from_ocr(text)
                    ours = [ans for _, ans in our_answers(lec[0]) if ans in "ABCD"]
                    if keys and ours and keys != ours[: len(keys)]:
                        errs.append("set%d lecture keys official=%s ours=%s title~%s" % (n, keys, ours, title_line[:80]))
                    our_title = lec[0].get("title") or ""
                    if title_line and our_title:
                        ot = re.sub(r"[^A-Za-z]+", "", title_line).lower()
                        yt = re.sub(r"[^A-Za-z]+", "", our_title).lower()
                        if yt and ot and yt not in ot and ot not in yt and not set(yt) & set(ot) or (
                            yt and ot and not any(w in ot for w in yt.split() if len(w) > 4)
                        ):
                            # softer: shared long token
                            our_toks = [w for w in re.findall(r"[A-Za-z]{4,}", our_title)]
                            if our_toks and not any(w.lower() in title_line.lower() for w in our_toks):
                                notes.append("set%d lecture title official~%r ours=%r" % (n, title_line[:90], our_title))

            if skill == "reading":
                daily = [t for t in tasks if t.get("type") == "daily_life"]
                png = os.path.join(odir, "RDL-01-答案.png")
                if daily and os.path.exists(png):
                    text = ocr(png)
                    keys = letters_from_ocr(text)
                    ours = [ans for _, ans in our_answers(daily[0]) if ans in "ABCD"]
                    if keys and ours and keys[: len(ours)] != ours[: len(keys)]:
                        errs.append("set%d daily keys official=%s ours=%s" % (n, keys, ours))
                acad = [t for t in tasks if t.get("type") == "academic"]
                png = os.path.join(odir, "RAP-01-答案.png")
                if acad and os.path.exists(png):
                    text = ocr(png)
                    keys = letters_from_ocr(text)
                    ours = [ans for _, ans in our_answers(acad[0]) if ans in "ABCD"]
                    if keys and ours and keys[: len(ours)] != ours[: len(keys)]:
                        errs.append("set%d academic keys official=%s ours=%s" % (n, keys, ours))

    print("== catalog dated papers: audio + gate-shaped checks ==")
    for rel in catalog_files():
        abs_p = os.path.join(ROOT, rel)
        if not os.path.exists(abs_p):
            errs.append("catalog missing " + rel)
            continue
        paper = load(rel)
        for i, t in enumerate(paper.get("tasks") or []):
            if t.get("audio"):
                if not audio_path(t["audio"]):
                    errs.append("%s task[%d] missing audio %s" % (rel, i, t["audio"]))
            elif t.get("type") in (
                "choose_response", "conversation", "announcement", "lecture", "repeat", "interview"
            ):
                errs.append("%s task[%d] no audio field" % (rel, i))
            if t.get("type") == "sentence" and t.get("bank") and t.get("answer") and t["bank"] == t["answer"]:
                errs.append("%s task[%d] bank is answer order" % (rel, i))

    print("NOTES")
    for x in notes:
        print("  -", x)
    print("ERRORS", len(errs))
    for x in errs:
        print("  !", x)
    if errs:
        sys.exit(1)
    print("ok audit")


if __name__ == "__main__":
    main()
