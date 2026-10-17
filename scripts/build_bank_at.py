#!/usr/bin/env python3
"""OCR L-AT lecture screenshots into the listening bank."""
import json
import os
import re
import shutil
import statistics
import subprocess
from concurrent.futures import ProcessPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/Users/frankman/Desktop/TOEFL-Hand/02-listening/04-L-AT"
OCR_BIN = "/tmp/ocr_vision"
CACHE = "/tmp/yysd-ocr-at"
OUT_JSON = os.path.join(ROOT, "app/library/toefl/bank-at-listening.json")
OUT_AUDIO = os.path.join(ROOT, "app/library/toefl/audio/bank-l-at")
PAIRS = 6

NAME = re.compile(r"^L-AT(\d+)-(\d+)$")
QHEAD = re.compile(r"Question\s+\d+\b", re.I)
ANSWER = re.compile(r"Correct Answer:\s*([A-D])\b", re.I)
OPT = re.compile(r"^([A-D])\.\s*(.*)$")
CHROME = re.compile(
    r"^(Replay Audio|Your Answer\b|Explanation\b|C\d{2}|0:00\b|Question\s+\d+)",
    re.I,
)


STEM_START = re.compile(
    r"(?:What|Why|How|Where|When|Who|Which|Whose|Do|Does|Did|Is|Are|Was|Were|"
    r"Will|Would|Can|Could|Should|Has|Have)\b",
    re.I,
)
STEM_LEAD = re.compile(
    r"^(?:At the (?:end|beginning) of the (?:conversation|announcement|lecture|talk),\s+"
    r"|According to (?:the )?(?:conversation|speakers|man|woman|announcement|speaker|lecture|talk|professor),\s+"
    r"|Based on the (?:conversation|announcement|lecture|talk),\s+)",
    re.I,
)


def looks_like_stem(t):
    t = re.sub(r"^(?:[a-z]{1,4}\s+)+(?=[A-Z])", "", (t or "").strip())
    if not t.endswith("?") or len(t) > 220 or not englishish(t):
        return False
    if re.search(r"[.!]", t[:-1]):
        return False
    body = STEM_LEAD.sub("", t)
    return bool(STEM_START.match(body))


def englishish(t):
    letters = re.findall(r"[A-Za-z]", t or "")
    if len(letters) < 3:
        return False
    if re.search(r"[#*]|[\u4e00-\u9fff]", t):
        return False
    return True


def card_box(im):
    """Bound the review card by its text. Option rows are pure white, but the
    transcript sits on a gray that a white-run scan skips."""
    w, h = im.size
    px = im.load()
    step = 8
    cols = [0] * (w // step + 1)
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b = px[x, y]
            if r + g + b < 520:
                cols[x // step] += 1
    # Announcement cards are wider than the dense left column; long lines
    # only touch the right edge on a few rows, so close a wider gap.
    active = [v >= 2 for v in cols]
    n = len(active)
    for i in range(n):
        if active[i]:
            continue
        if any(active[max(0, i - 80):i]) and any(active[i + 1:i + 81]):
            active[i] = True
    runs = []
    run = start = 0
    for i, on in enumerate(active):
        if on:
            if run == 0:
                start = i
            run += 1
        else:
            if run > 30:
                runs.append((start * step, i * step))
            run = 0
    if run > 30:
        runs.append((start * step, n * step))
    if not runs:
        return (int(w * 0.25), 0, int(w * 0.75), h - 8)
    left, right = max(runs, key=lambda r: r[1] - r[0])
    left = max(0, left - 16)
    right = min(w, right + 24)
    top = 0
    for y in range(0, h, 4):
        dark = 0
        for x in range(left, right, 12):
            r, g, b = px[x, y]
            if r + g + b < 480:
                dark += 1
        if dark >= 3:
            top = max(0, y - 16)
            break
    return (left, top, right, h - 8)


def visual_lines(rows, y_eps=0.0045):
    rows = sorted(rows, key=lambda r: -r["y"])
    groups = []
    for r in rows:
        if groups and abs(groups[-1][0]["y"] - r["y"]) < y_eps:
            groups[-1].append(r)
        else:
            groups.append([r])
    out = []
    for group in groups:
        group.sort(key=lambda r: r["x"])
        text = re.sub(r"\s+", " ", " ".join(p["t"].strip() for p in group if p["t"].strip())).strip()
        if text:
            out.append(text)
    return out


def parse_options(lines):
    start = 0
    for i, raw in enumerate(lines):
        if looks_like_stem(raw.strip()):
            start = i + 1
    opts = {}
    last = None
    for raw in lines[start:]:
        t = raw.strip()
        if not t or t.startswith("Your Answer") or t.startswith("Correct Answer") or t.lower().startswith("explanation"):
            break
        if QHEAD.search(t):
            continue
        m = OPT.match(t)
        if m:
            last = m.group(1)
            opts[last] = m.group(2).strip()
            continue
        if re.match(r"^[A-D]\.$", t):
            last = t[0]
            opts.setdefault(last, "")
            continue
        if not englishish(t) or len(t) > 140:
            continue
        if not last:
            opts["A"] = t
            last = "A"
            continue
        if not opts.get(last):
            opts[last] = t
            continue
        nxt = chr(ord(last) + 1)
        wrap = t[0].islower() and not re.search(r"[.?!]$", opts[last])
        if wrap or nxt > "D" or nxt in opts:
            opts[last] = (opts[last] + " " + t).strip()
        else:
            opts[nxt] = t
            last = nxt
    return opts


def transcript_of(lines):
    parts = []
    started = False
    for t in lines:
        if OPT.match(t) or re.match(r"^[A-D]\.$", t):
            break
        if looks_like_stem(t) and started:
            break
        low = t.lower()
        if "transcript:" in low or re.match(r"listen(?:ing)? to (?:a |an )?(?:talk|lecture)\b", low):
            started = True
            t = re.sub(r"^.*?transcript:\s*", "", t, flags=re.I)
            if re.fullmatch(r"Listen to an announcement\.?", t.strip(), re.I):
                continue
            if englishish(t):
                parts.append(t)
            continue
        if not started or CHROME.match(t) or QHEAD.search(t) or ANSWER.search(t):
            continue
        if englishish(t):
            parts.append(t)
    if not parts:
        for t in lines:
            if looks_like_stem(t) or OPT.match(t):
                break
            if englishish(t) and len(t) > 40 and not CHROME.match(t) and not QHEAD.search(t):
                parts.append(t)
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def parse_question(lines):
    answer = ""
    for t in lines:
        m = ANSWER.search(t)
        if m:
            answer = m.group(1)
            break
    opts = parse_options(lines)
    if len(opts) < 4 or any(not opts.get(k) for k in "ABCD"):
        return None
    stem = ""
    for t in lines:
        if OPT.match(t) or re.match(r"^[A-D]\.$", t):
            break
        if looks_like_stem(t):
            stem = re.sub(r"^(?:[a-z]{1,4}\s+)+(?=[A-Z])", "", t).strip()
    if not stem or not stem.endswith("?"):
        return None
    return {"stem": stem, "options": {k: opts[k] for k in "ABCD"}, "answer": answer}


def green_answers(stem):
    """The correct choice is the pale-green option bar. One bar per question."""
    from PIL import Image

    cache = os.path.join(CACHE, stem + ".green.json")
    if os.path.exists(cache):
        return json.load(open(cache))
    im = Image.open(os.path.join(SRC, stem + ".png")).convert("RGB")
    w, h = im.size
    px = im.load()
    green_xs = [0] * (w // 20 + 1)
    for y in range(0, h, 8):
        for x in range(0, w, 20):
            r, g, b = px[x, y]
            if g > r + 8 and g > b and g > 190:
                green_xs[x // 20] += 1
    hot = [i for i, v in enumerate(green_xs) if v > 3]
    if not hot:
        json.dump([], open(cache, "w"))
        return []
    x0 = max(0, (min(hot) - 1) * 20)
    x1 = min(w, (max(hot) + 2) * 20)

    def kind(y):
        rs = gs = bs = n = 0
        for x in range(x0, x1, 6):
            r, g, b = px[x, y]
            rs += r
            gs += g
            bs += b
            n += 1
        r, g, b = rs / n, gs / n, bs / n
        if g > r + 8 and g > b and g > 190:
            return "G"
        if r > 252 and g > 252 and b > 252:
            return "W"
        return "."

    kinds = [kind(y) for y in range(h)]
    pills = []
    for y in range(1, h):
        if kinds[y] in "GW" and kinds[y - 1] == ".":
            if pills and y - pills[-1][0] < 70:
                pills[-1][1] = pills[-1][1] or kinds[y] == "G"
            else:
                pills.append([y, kinds[y] == "G"])
    groups = []
    for pill in pills:
        if not groups or pill[0] - groups[-1][-1][0] > 140:
            groups.append([pill])
        else:
            groups[-1].append(pill)
    out = []
    for group in groups:
        if not any(p[1] for p in group) or len(group) != 4:
            continue
        out.append("ABCD"[next(i for i, p in enumerate(group) if p[1])])
    json.dump(out, open(cache, "w"))
    return out


def stitch(lines):
    out = []
    i = 0
    while i < len(lines):
        t = lines[i]
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if (
            not t.endswith("?")
            and looks_like_stem(t + "?")
            and englishish(t)
            and nxt.endswith("?")
            and len(nxt) < 90
            and englishish(nxt)
        ):
            out.append((t + " " + nxt).strip())
            i += 2
            continue
        out.append(t)
        i += 1
    return out


def parse_item(lines, answers=None):
    lines = stitch(lines)
    cuts = [i for i, t in enumerate(lines) if QHEAD.search(t)]
    if not cuts:
        cuts = [i for i, t in enumerate(lines) if looks_like_stem(t)]
    if not cuts:
        return None
    chunks = []
    for n, i in enumerate(cuts):
        end = cuts[n + 1] if n + 1 < len(cuts) else len(lines)
        chunks.append(lines[i:end])
    qs = []
    for chunk in chunks:
        q = parse_question(chunk)
        if not q:
            return None
        qs.append(q)
    transcript = transcript_of(lines[:cuts[0]] + chunks[0])
    if not englishish(transcript):
        return None
    if answers and len(answers) == len(qs):
        for q, a in zip(qs, answers):
            q["answer"] = a
    if any(q["answer"] not in ("A", "B", "C", "D") for q in qs):
        return None
    code = ""
    for t in lines[:cuts[0]]:
        topic = topic_of([t])
        if topic and not code:
            code = topic
            break
    return {"code": code, "transcript": transcript, "questions": qs}


def pill_sets(stem):
    """Read each option bar on its own. The page OCR drops the green row."""
    from PIL import Image

    cache = os.path.join(CACHE, stem + ".pills.json")
    if os.path.exists(cache):
        return json.load(open(cache))
    im = Image.open(os.path.join(SRC, stem + ".png")).convert("RGB")
    w, h = im.size
    px = im.load()
    green_xs = [0] * (w // 20 + 1)
    for y in range(0, h, 8):
        for x in range(0, w, 20):
            r, g, b = px[x, y]
            if g > r + 8 and g > b and g > 190:
                green_xs[x // 20] += 1
    hot = [i for i, v in enumerate(green_xs) if v > 3]
    if not hot:
        json.dump([], open(cache, "w"))
        return []
    x0 = max(0, (min(hot) - 1) * 20)
    x1 = min(w, (max(hot) + 2) * 20)

    def kind(y):
        rs = gs = bs = n = 0
        for x in range(x0, x1, 6):
            r, g, b = px[x, y]
            rs += r
            gs += g
            bs += b
            n += 1
        r, g, b = rs / n, gs / n, bs / n
        if g > r + 8 and g > b and g > 190:
            return "G"
        if r > 252 and g > 252 and b > 252:
            return "W"
        return "."

    kinds = [kind(y) for y in range(h)]
    pills = []
    for y in range(1, h):
        if kinds[y] in "GW" and kinds[y - 1] == ".":
            if pills and y - pills[-1][0] < 70:
                pills[-1][1] = pills[-1][1] or kinds[y] == "G"
            else:
                pills.append([y, kinds[y] == "G"])
    groups = []
    for pill in pills:
        if not groups or pill[0] - groups[-1][-1][0] > 140:
            groups.append([pill])
        else:
            groups[-1].append(pill)
    out = []
    for group in groups:
        if len(group) != 4 or not any(p[1] for p in group):
            continue
        opts = {}
        answer = ""
        for i, (y, is_g) in enumerate(group):
            crop = im.crop((x0, max(0, y - 6), x1, min(h, y + 72)))
            crop = crop.resize((crop.size[0] * 2, crop.size[1] * 2))
            tmp = os.path.join(CACHE, stem + ".pill.png")
            crop.save(tmp, "PNG")
            raw = json.loads(subprocess.check_output([OCR_BIN, tmp]).decode())
            raw.sort(key=lambda r: r["x"])
            text = re.sub(r"\s+", " ", " ".join(r["t"] for r in raw)).strip()
            text = re.sub(r"^[A-D]\.?\s*", "", text).strip()
            opts["ABCD"[i]] = text
            if is_g:
                answer = "ABCD"[i]
        if answer and all(opts.get(k) for k in "ABCD"):
            out.append({"options": opts, "answer": answer})
    try:
        os.remove(os.path.join(CACHE, stem + ".pill.png"))
    except OSError:
        pass
    json.dump(out, open(cache, "w"), ensure_ascii=False)
    return out


def attach_stems(stem, found):
    """Question text sits just above each option group. Read that strip."""
    from PIL import Image

    im = Image.open(os.path.join(SRC, stem + ".png")).convert("RGB")
    w, h = im.size
    px = im.load()
    green_xs = [0] * (w // 20 + 1)
    for y in range(0, h, 8):
        for x in range(0, w, 20):
            r, g, b = px[x, y]
            if g > r + 8 and g > b and g > 190:
                green_xs[x // 20] += 1
    hot = [i for i, v in enumerate(green_xs) if v > 3]
    if not hot:
        return found
    x0 = max(0, (min(hot) - 1) * 20)
    x1 = min(w, (max(hot) + 2) * 20)

    def kind(y):
        rs = gs = bs = n = 0
        for x in range(x0, x1, 6):
            r, g, b = px[x, y]
            rs += r
            gs += g
            bs += b
            n += 1
        r, g, b = rs / n, gs / n, bs / n
        if g > r + 8 and g > b and g > 190:
            return "G"
        if r > 252 and g > 252 and b > 252:
            return "W"
        return "."

    kinds = [kind(y) for y in range(h)]
    pills = []
    for y in range(1, h):
        if kinds[y] in "GW" and kinds[y - 1] == ".":
            if pills and y - pills[-1][0] < 70:
                continue
            pills.append([y, kinds[y] == "G"])
    groups = []
    for pill in pills:
        if not groups or pill[0] - groups[-1][-1][0] > 140:
            groups.append([pill])
        else:
            groups[-1].append(pill)
    tops = [g[0][0] for g in groups if len(g) == 4 and any(p[1] for p in g)]
    if len(tops) != len(found):
        return found
    for pill, y in zip(found, tops):
        crop = im.crop((x0, max(0, y - 120), x1, max(0, y - 2)))
        crop = crop.resize((max(1, crop.size[0] * 2), max(1, crop.size[1] * 2)))
        tmp = os.path.join(CACHE, stem + ".stem.png")
        crop.save(tmp, "PNG")
        raw = json.loads(subprocess.check_output([OCR_BIN, tmp]).decode())
        raw.sort(key=lambda r: (round(r["y"], 2), r["x"]))
        text = re.sub(r"\s+", " ", " ".join(r["t"] for r in raw)).strip()
        pill["stem"] = text
    try:
        os.remove(os.path.join(CACHE, stem + ".stem.png"))
    except OSError:
        pass
    json.dump(found, open(os.path.join(CACHE, stem + ".pills.json"), "w"), ensure_ascii=False)
    return found


def from_pills(lines, stem):
    found = pill_sets(stem)
    if not found:
        return None
    if any(not p.get("stem") for p in found):
        found = attach_stems(stem, found)
    page = [re.sub(r"^(?:[a-z]{1,4}\s+)+(?=[A-Z])", "", t).strip()
            for t in stitch(lines) if looks_like_stem(t)]
    stems = []
    for i, pill in enumerate(found):
        s = clean_stem(pill.get("stem") or "")
        if "?" in s and s.endswith("?"):
            pass
        elif "?" in s:
            s = s[:s.index("?") + 1].strip()
        elif englishish(s) and len(s) > 20:
            s = s.rstrip(" .") + "?"
        if s.endswith("?") and englishish(s):
            stems.append(s)
        elif len(page) == len(found):
            stems.append(page[i])
        else:
            return None
    cuts = [i for i, t in enumerate(stitch(lines)) if QHEAD.search(t)]
    stitched = stitch(lines)
    if not cuts:
        cuts = [i for i, t in enumerate(stitched) if looks_like_stem(t)]
    transcript = transcript_of(stitched[:cuts[0]] + stitched[cuts[0]:]) if cuts else transcript_of(stitched)
    if not englishish(transcript) or len(transcript) < 80:
        transcript = band_transcript(stem)
    if not englishish(transcript):
        return None
    code = ""
    for t in stitched:
        topic = topic_of([t])
        if topic and not code:
            code = topic
            break
    qs = []
    for stem_text, pill in zip(stems, found):
        qs.append({"stem": stem_text, "options": pill["options"], "answer": pill["answer"]})
    return {"code": code, "transcript": transcript, "questions": qs}


def clean_stem(s):
    s = re.sub(r"\s+TA[A-Za-z]{0,3}\s*$", "", (s or "")).strip()
    if "?" in s and not s.endswith("?"):
        pre, post = s.split("?", 1)
        post = re.sub(r"\s+TA\w*$", "", post).strip(" .")
        pre = pre.strip()
        if re.match(r"^(What|Why|How|Where|When|Who|Which|According|At|Based)\b", post, re.I):
            s = (post + " " + pre).strip() + "?"
        else:
            s = pre + "?"
    return re.sub(r"\s+", " ", s).strip()


def topic_of(lines):
    for t in lines:
        m = re.match(r"^Q\d+\s*-\s*(.+)$", (t or "").strip())
        if m and englishish(m.group(1)) and len(m.group(1)) > 3:
            return re.sub(r"\s+", " ", m.group(1)).strip(" .")
    return ""


def sliced_lines(stem, im):
    """OCR the card in short strips. One tall image makes Vision drop the middle."""
    crop = im.crop(card_box(im))
    w, h = crop.size
    step, overlap = 1200, 140
    lines = []
    y = n = 0
    while y < h:
        part = crop.crop((0, y, w, min(h, y + step)))
        tmp = os.path.join(CACHE, "%s.s%d.png" % (stem, n))
        part.save(tmp, "PNG")
        raw = json.loads(subprocess.check_output([OCR_BIN, tmp]).decode())
        for line in visual_lines(raw):
            if line not in lines[-6:]:
                lines.append(line)
        try:
            os.remove(tmp)
        except OSError:
            pass
        if y + step >= h:
            break
        y += step - overlap
        n += 1
    return lines


def band_transcript(stem):
    """Read the transcript from the strip above question 1.

    Full-page OCR drops or scrambles that strip on tall screenshots.
    """
    from PIL import Image

    cache = os.path.join(CACHE, stem + ".band.json")
    if os.path.exists(cache):
        return json.load(open(cache))
    im = Image.open(os.path.join(SRC, stem + ".png")).convert("RGB")
    w, h = im.size
    px = im.load()
    green_xs = [0] * (w // 20 + 1)
    for y in range(0, h, 8):
        for x in range(0, w, 20):
            r, g, b = px[x, y]
            if g > r + 8 and g > b and g > 190:
                green_xs[x // 20] += 1
    hot = [i for i, v in enumerate(green_xs) if v > 3]
    text = ""
    if hot:
        x0 = max(0, (min(hot) - 1) * 20 - 80)
        x1 = min(w, (max(hot) + 2) * 20)

        def kind(y):
            rs = gs = bs = n = 0
            for x in range(x0, x1, 6):
                r, g, b = px[x, y]
                rs += r
                gs += g
                bs += b
                n += 1
            r, g, b = rs / n, gs / n, bs / n
            if g > r + 8 and g > b and g > 190:
                return "G"
            if r > 252 and g > 252 and b > 252:
                return "W"
            return "."

        kinds = [kind(y) for y in range(h)]
        pills = []
        for y in range(1, h):
            if kinds[y] in "GW" and kinds[y - 1] == ".":
                if not pills or y - pills[-1] >= 70:
                    pills.append(y)
        top = None
        for i, y in enumerate(pills):
            grp = [y]
            for z in pills[i + 1:]:
                if z - grp[-1] > 140:
                    break
                grp.append(z)
            if len(grp) >= 4:
                top = grp[0]
                break
        if top:
            # Keep this strip short. A taller crop makes Vision return the page header
            # and drop the transcript. 40px above the options still includes the last line.
            # Lectures run long. A short strip clips the opening; this still
            # stops above the first option so Vision is not given the whole page.
            crop = im.crop((x0, max(0, top - 1500), x1, max(0, top - 40)))
            tmp = os.path.join(CACHE, stem + ".band.png")
            crop.save(tmp, "PNG")
            raw = json.loads(subprocess.check_output([OCR_BIN, tmp]).decode())
            parts = []
            for t in visual_lines(raw, 0.025):
                if QHEAD.search(t):
                    continue
                if looks_like_stem(t) or OPT.match(t):
                    break
                if re.search(r"\d:\d\d\s*/\s*\d:\d\d", t) or re.match(r"^(Replay|Transcript)\b", t, re.I):
                    continue
                if re.fullmatch(r"Listen to an announcement\.?", t.strip(), re.I):
                    continue
                if t == "I" or (englishish(t) and len(t) > 2):
                    parts.append(t)
            text = re.sub(r"\s+", " ", " ".join(parts)).strip()
            text = re.sub(r"^a\s+(?=Listen\b)", "", text)
            text = re.sub(r"\bthe a\b", "the", text)
            try:
                os.remove(tmp)
            except OSError:
                pass
    json.dump(text, open(cache, "w"), ensure_ascii=False)
    return text


def ocr_one(stem):
    from PIL import Image

    cache = os.path.join(CACHE, stem + ".json")
    if os.path.exists(cache) and os.path.getsize(cache) > 2:
        lines = json.load(open(cache, encoding="utf-8"))
    else:
        im = Image.open(os.path.join(SRC, stem + ".png")).convert("RGB")
        lines = sliced_lines(stem, im)
        json.dump(lines, open(cache, "w"), ensure_ascii=False)
    answers = green_answers(stem)
    item = parse_item(lines, answers)
    # One parsed question against two green bars means the second was swallowed.
    if item and len(answers) > len(item["questions"]):
        item = None
    if not item:
        item = from_pills(lines, stem)
    # A full lecture transcript is already in the sliced read. The extra strip
    # is only for items whose transcript came back short.
    if item and len(item["transcript"]) < 350:
        band = band_transcript(stem)
        if englishish(band) and len(band) > len(item["transcript"]) * 0.85:
            item["transcript"] = tidy(band)
        else:
            item["transcript"] = tidy(item["transcript"])
    elif item:
        item["transcript"] = tidy(item["transcript"])
    return stem, item


def tidy(text):
    text = re.sub(r"^a\s+(?=Listen\b)", "", text or "")
    text = re.sub(r"\bthe a\b", "the", text)
    text = re.sub(r"\bto a (provide|make)\b", r"to \1", text)
    text = re.sub(r"(\d(?::\d\d)? a\.m\.)\s+\d+\s+", r"\1 ", text)
    text = re.sub(r"\bhave few important\b", "have a few important", text)
    text = re.sub(r"\bin a safe trip\b", "and a safe trip", text)
    return re.sub(r"\s+", " ", text).strip()


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
            if done % 40 == 0:
                print("ocr", done, "/", len(stems), "ok", len(ok), "bad", len(bad), flush=True)
    print("ocr", len(stems), "ok", len(ok), "bad", len(bad))
    if bad:
        print("BAD", " ".join(bad))
    os.makedirs(OUT_AUDIO, exist_ok=True)
    tasks = []
    qid = 1
    for i, stem in enumerate(stems):
        item = ok.get(stem)
        if not item:
            continue
        n, k = NAME.match(stem).groups()
        audio_name = "l-at%s-%s.mp3" % (n, k)
        shutil.copyfile(os.path.join(SRC, stem + ".mp3"), os.path.join(OUT_AUDIO, audio_name))
        pair = "library/toefl/img/listen/listen-lecture-%d.jpg" % ((i % PAIRS) + 1)
        qs = []
        for q in item["questions"]:
            qs.append({
                "id": qid,
                "stem": q["stem"],
                "options": q["options"],
                "answer": q["answer"],
            })
            qid += 1
        task = {
            "type": "lecture",
            "module": 1,
            "set": "L-AT" + n,
            "title": "L-AT%s-%s" % (n, k),
            "image": pair,
            "titleZh": "学术讲座",
            "code": item["code"] or ("AT%s" % n),
            "instruction": "Listen to a lecture.",
            "audio": "library/toefl/audio/bank-l-at/" + audio_name,
            "transcript": item["transcript"],
            "questions": qs,
        }
        tasks.append(task)
    paper = {
        "id": "bank-at",
        "title": "题块库 · 学术讲座",
        "skill": "listening",
        "source": "bank",
        "modules": [{"n": 1, "timeSec": 0, "from": 1, "to": max(1, qid - 1)}],
        "tasks": tasks,
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(paper, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", len(tasks), OUT_JSON)


if __name__ == "__main__":
    main()
