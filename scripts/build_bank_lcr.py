#!/usr/bin/env python3
"""OCR L-CR screenshots into the listening choose-response bank."""
import json
import os
import re
import shutil
import statistics
import subprocess
from concurrent.futures import ProcessPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/Users/frankman/Desktop/TOEFL-Hand/02-listening/01-L-CR"
OCR_BIN = "/tmp/ocr_vision"
CACHE = "/tmp/yysd-ocr-cr"
OUT_JSON = os.path.join(ROOT, "app/library/toefl/bank-cr-listening.json")
OUT_AUDIO = os.path.join(ROOT, "app/library/toefl/audio/bank-l-cr")

NAME = re.compile(r"^L-CR(\d+)-(\d+)$")
ANSWER = re.compile(r"Correct Answer:\s*([A-D])\b", re.I)
OPT = re.compile(r"^([A-D])\.\s*(.*)$")
SKIP = re.compile(
    r"^(Replay Audio|Question\b|Item\b|Score\b|Not answered|Your Answer\b|"
    r"Explanation\b|Transcript:?|Choose the best response\.?|LR\d+\b.*)$",
    re.I,
)


def englishish(t):
    letters = re.findall(r"[A-Za-z]", t or "")
    if len(letters) < 3:
        return False
    if re.search(r"[#*]|[\u4e00-\u9fff]", t):
        return False
    return True


def card_box(im):
    w, h = im.size
    px = im.load()
    rows = []
    for y in range(0, h, 10):
        run = 0
        best = 0
        start = 0
        bstart = 0
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if r > 252 and g > 252 and b > 252:
                if run == 0:
                    start = x
                run += 2
                if run > best:
                    best, bstart = run, start
            else:
                run = 0
        if 900 <= best <= 1700:
            rows.append((y, bstart, bstart + best))
    if not rows:
        return (int(w * 0.15), int(h * 0.12), int(w * 0.7), h - 40)
    left = int(statistics.median(r[1] for r in rows)) - 16
    right = int(statistics.median(r[2] for r in rows)) + 16
    top = max(0, rows[0][0] - 12)
    bot = rows[-1][0]
    y = bot
    miss = 0
    # a green answer bar is one dark row; stop only after the card actually ends
    while y + 12 < h - 30:
        y += 12
        light = 0
        total = 0
        for x in range(max(0, left), min(w, right), 8):
            total += 1
            r, g, b = px[x, y]
            if r > 240 and g > 240 and b > 240:
                light += 1
        if total and light / total < 0.45:
            miss += 1
            if miss >= 8:
                break
        else:
            miss = 0
            bot = y
    return (max(0, left), max(0, top), min(w, right), min(h, bot + 8))


def visual_lines(rows):
    rows = sorted(rows, key=lambda r: -r["y"])
    groups = []
    for r in rows:
        if groups and abs(groups[-1][0]["y"] - r["y"]) < 0.014:
            groups[-1].append(r)
        else:
            groups.append([r])
    out = []
    for group in groups:
        group.sort(key=lambda r: r["x"])
        text = " ".join(p["t"].strip() for p in group if p["t"].strip())
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            out.append(text)
    return out


def parse_options(lines):
    opts = {}
    last = None
    for raw in lines:
        t = raw.strip()
        if not t or t.startswith("Transcript") or t.startswith("Your Answer") or t.startswith("Correct Answer"):
            break
        if t.lower().startswith("explanation"):
            break
        m = OPT.match(t)
        if m:
            last = m.group(1)
            opts[last] = m.group(2).strip()
            continue
        if re.match(r"^[A-D]\.$", t):
            last = t[0]
            opts.setdefault(last, "")
            continue
        if not englishish(t):
            continue
        if not last:
            opts["A"] = t
            last = "A"
            continue
        if not opts.get(last):
            opts[last] = t
            continue
        nxt = chr(ord(last) + 1)
        if nxt <= "D" and nxt not in opts and re.search(r"[.?!]$", opts[last]):
            opts[nxt] = t
            last = nxt
        else:
            opts[last] = (opts[last] + " " + t).strip()
    return opts


def parse_item(lines):
    answer = ""
    for t in lines:
        m = ANSWER.search(t)
        if m:
            answer = m.group(1)
            break
    try:
        choose = next(i for i, t in enumerate(lines) if t.lower().startswith("choose the"))
    except StopIteration:
        return None
    opts = parse_options(lines[choose + 1:])
    if len(opts) < 4 or any(not opts.get(k) for k in "ABCD") or answer not in ("A", "B", "C", "D"):
        return None
    def heard(t):
        t = re.sub(r"^transcript:?\s*", "", t, flags=re.I)
        t = re.sub(r"\s*transcript:?\s*$", "", t, flags=re.I)
        return re.sub(r"^[WM]:\s*", "", t).strip()

    before = []
    for t in lines[:choose]:
        if SKIP.match(t) or re.match(r"^\d", t) or re.match(r"^0:00", t) or re.search(r"\bItem\b|\bResponse\b", t):
            continue
        body = heard(t)
        if englishish(body):
            before.append(body)
    after = []
    seen_tr = False
    for t in lines[choose + 1:]:
        if t.lower().startswith("your answer") or t.lower().startswith("correct answer") or t.lower().startswith("explanation"):
            break
        if "transcript" in t.lower():
            seen_tr = True
            body = heard(t)
            if englishish(body):
                after.append(body)
            continue
        if not seen_tr:
            continue
        body = heard(t)
        if englishish(body):
            after.append(body)
    prompt = " ".join(after) if after else " ".join(before)
    prompt = re.sub(r"^[WM]:\s*", "", prompt).strip()
    if not englishish(prompt):
        prompt = " ".join(before)
        prompt = re.sub(r"^[WM]:\s*", "", prompt).strip()
    if not englishish(prompt):
        return None
    return {"prompt": prompt, "options": {k: opts[k] for k in "ABCD"}, "answer": answer}


def ocr_one(stem):
    from PIL import Image

    png = os.path.join(SRC, stem + ".png")
    cache = os.path.join(CACHE, stem + ".json")
    if os.path.exists(cache) and os.path.getsize(cache) > 2:
        lines = json.load(open(cache, encoding="utf-8"))
    else:
        im = Image.open(png).convert("RGB")
        crop = im.crop(card_box(im))
        tmp = os.path.join(CACHE, stem + ".crop.png")
        crop.save(tmp, "PNG")
        raw = subprocess.check_output([OCR_BIN, tmp])
        rows = json.loads(raw.decode())
        lines = visual_lines(rows)
        json.dump(lines, open(cache, "w"), ensure_ascii=False)
        try:
            os.remove(tmp)
        except OSError:
            pass
    item = parse_item(lines)
    if not item:
        return stem, None
    return stem, item


def main():
    os.makedirs(CACHE, exist_ok=True)
    stems = []
    for name in os.listdir(SRC):
        stem, ext = os.path.splitext(name)
        if ext.lower() == ".png" and NAME.match(stem):
            stems.append(stem)
    stems.sort(key=lambda s: tuple(int(x) for x in NAME.match(s).groups()))
    ok = {}
    bad = []
    with ProcessPoolExecutor(max_workers=6) as pool:
        futs = [pool.submit(ocr_one, s) for s in stems]
        done = 0
        for fut in as_completed(futs):
            stem, item = fut.result()
            done += 1
            if item:
                ok[stem] = item
            else:
                bad.append(stem)
            if done % 100 == 0:
                print("ocr", done, "/", len(stems), "ok", len(ok), "bad", len(bad), flush=True)
    print("ocr", len(stems), "ok", len(ok), "bad", len(bad))
    if bad:
        print("BAD", " ".join(bad[:40]))
    os.makedirs(OUT_AUDIO, exist_ok=True)
    tasks = []
    qid = 1
    for stem in stems:
        item = ok.get(stem)
        if not item:
            continue
        n, k = NAME.match(stem).groups()
        audio_name = "l-cr%s-%s.mp3" % (n, k)
        shutil.copyfile(os.path.join(SRC, stem + ".mp3"), os.path.join(OUT_AUDIO, audio_name))
        tasks.append({
            "type": "choose_response",
            "module": 1,
            "set": "L-CR" + n,
            "title": "L-CR%s-%s" % (n, k),
            "titleZh": "听句选回应",
            "code": "L-CR%s-%s" % (n, k),
            "instruction": "Choose the best response.",
            "audio": "library/toefl/audio/bank-l-cr/" + audio_name,
            "questions": [{
                "id": qid,
                "stem": "Choose the best response.",
                "options": item["options"],
                "answer": item["answer"],
                "transcript": item["prompt"],
            }],
        })
        qid += 1
    paper = {
        "id": "bank-cr",
        "title": "题块库 · 听句选回应",
        "skill": "listening",
        "source": "bank",
        "modules": [{"n": 1, "timeSec": 0, "from": 1, "to": len(tasks)}],
        "tasks": tasks,
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(paper, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", len(tasks), OUT_JSON)


if __name__ == "__main__":
    main()
