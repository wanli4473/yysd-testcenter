#!/usr/bin/env python3
"""OCR CW / daily-life screenshots into tiku bank papers. Skip titles already in HIT sets."""
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OCR_BIN = "/tmp/ocr_vision"
CACHE = "/tmp/yysd-ocr"
CW_DIR = "/Users/frankman/Desktop/01-R-CW"
RDL_DIR = "/Users/frankman/Desktop/02-R-RDL"
OUT_CW = os.path.join(ROOT, "app/library/toefl/bank-cw-reading.json")
OUT_RDL = os.path.join(ROOT, "app/library/toefl/bank-rdl-reading.json")

# short table words Vision drops; filled from the screenshot answer column
CW_WORDS = {
    "the odyssey": ["is", "considered", "of", "greatest", "in", "history", "European", "established", "narrative", "and"],
    "piano": ["modern", "was", "around", "by", "who", "new", "that", "it", "for", "to"],
}

CHROME = {
    "hang in there", "home", "reading", "listening", "speaking", "writing",
    "history", "mock", "practice hub", "complete", "complete the words",
    "read in daily life",
}

TWO = set("of to in on or an as at be by do he we me my if is it so no us up am".split())
HUD = re.compile(
    r"\s+(?:\d{2,4}:\d/\d{1,2}|COMPLETE\s*THE\s*WORDS|[O0]T-+\d|53[FT]-0|43T-0|BUT-0|ROT-E|0/\d{2,3}).*$",
    re.I,
)
_WORDS = None
_FREQ = None


def load_lexicon():
    global _WORDS, _FREQ
    if _WORDS is not None:
        return _WORDS, _FREQ
    words = set(TWO)
    words.update(
        "a i ai adu adus covid paleogene cretaceous yangtze baiji montmartre taos "
        "biodiversity spacetime freshwater groundwater rainforest interdenominational".split()
    )
    dict_path = "/usr/share/dict/words"
    if os.path.exists(dict_path):
        for line in open(dict_path):
            w = line.strip().lower()
            if w.isalpha() and 3 <= len(w) <= 22:
                words.add(w)
    extra = set()
    for w in list(words):
        if len(w) < 4:
            continue
        extra.add(w + "s")
        extra.add(w + "es")
        extra.add(w + "ed")
        extra.add(w + "ly")
        extra.add(w + "ing")
        if w.endswith("e"):
            extra.add(w + "d")
            extra.add(w[:-1] + "ing")
        if w.endswith("y"):
            extra.add(w[:-1] + "ies")
            extra.add(w[:-1] + "ied")
    words.update(extra)
    freq = {}
    for folder, pat in (
        (os.path.join(ROOT, "app/library/toefl"), r"set-\d+-reading\.json$"),
        (os.path.join(ROOT, "library/toefl"), r"^\d{4}-\d{2}-\d{2}-reading\.json$"),
    ):
        if not os.path.isdir(folder):
            continue
        for name in os.listdir(folder):
            if not re.search(pat, name):
                continue
            raw = open(os.path.join(folder, name), encoding="utf-8").read()
            for w in re.findall(r"[A-Za-z]+", raw):
                lw = w.lower()
                if lw in words or lw in TWO or lw in ("a", "i"):
                    freq[lw] = freq.get(lw, 0) + 1
    _WORDS, _FREQ = words, freq
    return words, freq


def is_lex(w, words):
    if len(w) == 1:
        return w in ("a", "i")
    if len(w) == 2:
        return w in TWO
    return w in words


def rest_ok(rest, words, freq):
    if not rest:
        return True
    if rest in freq or rest in TWO or rest in ("a", "i"):
        return True
    for L in range(min(22, len(rest)), 3, -1):
        w = rest[:L]
        if is_lex(w, words) and (L >= 4 or w in freq):
            return True
    return False


def segment_run(run, words, freq):
    # ponytail: longest lexicon match; DP over-split on rare 3–4 letter words
    s = run.lower()
    n = len(s)
    if n == 0 or is_lex(s, words):
        return [run]
    parts = []
    i = 0
    while i < n:
        take = 0
        rare = 0
        for L in range(min(22, n - i), 0, -1):
            w = s[i : i + L]
            if not is_lex(w, words):
                continue
            if L < 4 and w not in freq and w not in TWO and w not in ("a", "i"):
                continue
            if L >= 7 and rest_ok(s[i + L :], words, freq):
                take = L
                break
            if (w in freq or w in TWO or w in ("a", "i")) and rest_ok(s[i + L :], words, freq):
                take = L
                break
            if not rare:
                rare = L
        take = take or rare
        if not take:
            take = 1
        parts.append(run[i : i + take])
        i += take
    # glue leftover 1–2 letter crumbs into a neighbor if that makes a word
    out = []
    for p in parts:
        if out and len(p) <= 2:
            combo = out[-1] + p
            if is_lex(combo.lower(), words) and (len(combo) >= 5 or combo.lower() in freq):
                out[-1] = combo
                continue
        if out and len(out[-1]) <= 2:
            combo = out[-1] + p
            if is_lex(combo.lower(), words) and (len(combo) >= 5 or combo.lower() in freq):
                out[-1] = combo
                continue
        out.append(p)
    return out


def unjam(text):
    words, freq = load_lexicon()
    text = re.sub(r"\b(\d)([Dd])(?=[A-Za-z])", r"\1\2 ", text)
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"([A-Za-z])(\d)", r"\1 \2", text)
    text = re.sub(r"(\d)([A-Za-z]{2,})", r"\1 \2", text)

    def repl(m):
        run = m.group(0)
        if len(run) < 8 or is_lex(run.lower(), words):
            return run
        return " ".join(segment_run(run, words, freq))

    text = re.sub(r"[A-Za-z]{8,}", repl, text)
    text = re.sub(r"([,;:])([A-Za-z])", r"\1 \2", text)
    text = re.sub(r"([.!?])([A-Za-z])", r"\1 \2", text)
    text = re.sub(r"\b(\d) ([Dd])\b", r"\1\2", text)
    return re.sub(r" {2,}", " ", text).strip()


def strip_hud(text):
    return HUD.sub("", text).strip()


def clean_passage(text):
    return unjam(strip_hud(text or ""))


def clean_option(text):
    s = str(text or "")
    s = re.split(r"\s+ARtF\b", s, flags=re.I)[0]
    s = re.split(r"\s+A#\S", s)[0]
    s = re.split(r"\s+#", s)[0]
    s = re.sub(r"\s+\d{2,4}\s+[A-Z0-9.*]{4,}.*$", "", s)
    m = re.search(r"\s+(?:[A-Za-z]*[A-Z]{3,}[^a-zA-Z]{0,6}){2,}", s)
    if m:
        s = s[: m.start()]
    return s.strip(" .")


def still_jammed(text):
    words, _ = load_lexicon()
    for m in re.findall(r"[A-Za-z]{16,}", text or ""):
        if not is_lex(m.lower(), words):
            return True
    return False


def norm(s):
    s = re.sub(r"[&＋]", " and ", str(s or "").lower())
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def hit_titles():
    cw, rdl = set(), set()
    lib = os.path.join(ROOT, "app/library/toefl")
    for name in os.listdir(lib):
        if not re.match(r"set-\d+-reading\.json$", name):
            continue
        paper = json.load(open(os.path.join(lib, name)))
        for t in paper.get("tasks") or []:
            title = norm(t.get("title") or "")
            if t.get("type") == "complete_words":
                cw.add(title)
            if t.get("type") == "daily_life":
                rdl.add(title)
    return cw, rdl


def title_of(path):
    base = os.path.splitext(os.path.basename(path))[0]
    m = re.match(r"R-(?:CW|RDL)\d+-(.+)$", base, re.I)
    return (m.group(1) if m else base).replace("\uf022", ":").strip()


def ocr_one(path):
    os.makedirs(CACHE, exist_ok=True)
    key = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(path))
    cache = os.path.join(CACHE, key + ".json")
    if os.path.exists(cache) and os.path.getsize(cache) > 2:
        return json.load(open(cache))
    raw = subprocess.check_output([OCR_BIN, path])
    data = json.loads(raw.decode())
    json.dump(data, open(cache, "w"), ensure_ascii=False)
    return data


def is_green(rgb):
    r, g, b = rgb
    return g > r + 20 and g > b + 10 and g > 80


def is_word(s):
    return bool(re.match(r"^[A-Za-z][A-Za-z''\-]*$", s or ""))


def parse_cw(path, lines):
    title = title_of(path)
    nums = []
    wds = []
    for row in lines:
        if row["y"] > 0.63 or row["x"] > 0.35:
            continue
        t = row["t"].strip()
        if re.match(r"^\d{1,2}$", t) and 1 <= int(t) <= 10:
            nums.append((row["y"], int(t)))
        elif is_word(t) and row["x"] >= 0.18:
            wds.append((row["y"], t))
    words = []
    used = set()
    for y, n in sorted(nums, key=lambda x: x[1]):
        unused = [(wy, w) for wy, w in wds if (wy, w) not in used]
        if not unused:
            break
        cand = min(unused, key=lambda item: abs(item[0] - y))
        if abs(cand[0] - y) < 0.025:
            words.append(cand[1])
            used.add(cand)
    if len(words) < 8:
        words = [w for _, w in sorted(wds, key=lambda x: -x[0]) if norm(w) not in CHROME][:10]
    forced = CW_WORDS.get(norm(title))
    if forced:
        words = forced
    def is_hud_line(t):
        t = (t or "").strip()
        return bool(
            re.match(r"^\d{2,4}:\s*\d/\d", t)
            or re.match(r"^(OT--|COMPLETE|0/\d{2}|03M)", t, re.I)
            or re.fullmatch(r"[0O]{3,}", t)
            or re.fullmatch(r"[\dA-Z\s]{1,6}", t)
        )

    passage_rows = [r for r in lines if 0.68 <= r["y"] <= 0.88 and r["x"] < 0.75 and not is_hud_line(r["t"])]
    passage_rows.sort(key=lambda r: (-round(r["y"], 2), r["x"]))
    tokens = []
    for r in passage_rows:
        tokens.extend(re.findall(r"[A-Za-z]+|\s+|[^\sA-Za-z]+", r["t"]))
        tokens.append(" ")
    used = [False] * len(tokens)
    blanks = []
    wi = 0
    for i, tok in enumerate(tokens):
        if wi >= len(words) or not re.match(r"^[A-Za-z]+$", tok):
            continue
        w = words[wi]
        if w.lower().startswith(tok.lower()) and 1 <= len(tok) < len(w):
            blanks.append((i, tok, w))
            used[i] = True
            wi += 1
    leftover = words[wi:]
    for w in leftover:
        pre = w[:1]
        blanks.append((None, pre, w))
    parts = []
    buf = []
    blank_at = {i: (pre, w) for i, pre, w in blanks if i is not None}

    def flush():
        text = "".join(buf)
        text = re.sub(r"\s+", " ", text).strip()
        if still_jammed(text):
            text = clean_passage(text)
        else:
            text = strip_hud(text)
        if text:
            parts.append({"t": text if text.endswith((" ", ".", "!", "?", ":", ";")) else text + " "})
        buf.clear()

    for i, tok in enumerate(tokens):
        if i in blank_at:
            flush()
            pre, w = blank_at[i]
            parts.append({"id": len([p for p in parts if p.get("id")]) + 1, "prefix": pre, "answer": w[len(pre):], "word": w})
        else:
            buf.append(tok)
    flush()
    for pre, w in ((pre, w) for i, pre, w in blanks if i is None):
        parts.append({"id": len([p for p in parts if p.get("id")]) + 1, "prefix": pre, "answer": w[len(pre):], "word": w})
    n = 0
    for i, p in enumerate(parts):
        if p.get("t"):
            if i and parts[i - 1].get("id") and p["t"][0] not in " \n.,;:!?)]}":
                p["t"] = " " + p["t"]
            if i + 1 < len(parts) and parts[i + 1].get("id") and not p["t"].endswith((" ", "-", "(")):
                p["t"] += " "
        if p.get("id"):
            n += 1
            p["id"] = n
            if not re.match(r"^[A-Za-z]+$", p["answer"] or ""):
                p["answer"] = (p.get("word") or "x")[len(p.get("prefix") or ""):] or "x"
    if n < 8:
        return None
    return {
        "type": "complete_words",
        "title": title,
        "titleZh": title,
        "instruction": "Fill in the missing letters in the paragraph.",
        "passage": parts,
    }


def col_of(x):
    if x < 0.25:
        return 0
    if x < 0.55:
        return 1
    return 2


def parse_rdl(path, lines):
    title = title_of(path)
    cols = {0: [], 1: [], 2: []}
    for r in lines:
        if r["y"] > 0.82:
            continue
        cols[col_of(r["x"])].append(r)
    for c in cols.values():
        c.sort(key=lambda r: (-r["y"], r["x"]))

    def text_of(rows, skip_green=False):
        rows = sorted(rows, key=lambda r: (-round(r["y"], 2), r["x"]))
        out = []
        for r in rows:
            t = r["t"].strip()
            if not t:
                continue
            if skip_green and is_green(r["rgb"]):
                continue
            out.append(t)
        return out

    left = text_of(cols[0])
    instruction = "Read the text."
    body_lines = []
    for t in left:
        low = t.lower()
        if low.startswith("read an") or low.startswith("read a ") or low.startswith("read the"):
            instruction = t.rstrip(".") + "."
            continue
        if norm(t) in CHROME or norm(t) == norm(title):
            continue
        body_lines.append(t)
    body = "\n".join(clean_passage(x) if still_jammed(x) else strip_hud(x) for x in body_lines).strip()
    if not body:
        return None
    kind = "card"
    hint = instruction.lower()
    if "email" in hint:
        kind = "email"
    elif "notice" in hint or "announcement" in hint:
        kind = "notice"
    elif "schedule" in hint:
        kind = "schedule"

    def parse_q(rows):
        stem = ""
        options = {}
        answer = ""
        analysis = ""
        opt_buf = {}
        for r in sorted(rows, key=lambda x: (-x["y"], x["x"])):
            t = r["t"].strip()
            m = re.match(r"^(?:[a-z]\s+)?([A-D])\.\s*(.*)$", t)
            if m:
                k, rest = m.group(1), m.group(2).strip()
                options[k] = rest
                opt_buf[k] = [rest]
                if is_green(r["rgb"]):
                    answer = k
                continue
            if re.match(r"^Question\s+\d+", t, re.I) or t in ("解析",) or t.startswith("##"):
                continue
            last = next(reversed(options), None)
            if last and col_of(r["x"]) == col_of(rows[0]["x"]) and not re.match(r"^Question\s+\d+", t, re.I):
                if re.search(r"[\u4e00-\u9fff]", t):
                    analysis += t
                    continue
                if is_green(r["rgb"]):
                    answer = last
                opt_buf[last].append(t)
                options[last] = " ".join(x for x in opt_buf[last] if x)
                continue
            if re.search(r"[\u4e00-\u9fff]", t):
                analysis += t
                continue
            if re.match(r"^What |^Where |^Why |^Who |^When |^How |^Which |^According", t):
                stem = (stem + " " + t).strip() if stem else t
                continue
            if not options:
                stem = (stem + " " + t).strip()
        if not answer:
            scored = []
            for r in rows:
                m = re.match(r"^(?:[a-z]\s+)?([A-D])\.\s*", r["t"].strip())
                if not m:
                    continue
                r0, g0, b0 = r["rgb"]
                scored.append((g0 - r0, m.group(1)))
            if scored:
                scored.sort(reverse=True)
                if scored[0][0] >= 15:
                    answer = scored[0][1]
        if len(options) < 2 or not answer:
            return None
        options = {k: clean_option(v) for k, v in options.items() if clean_option(v)}
        if len(options) < 2:
            return None
        q = {"stem": clean_passage(stem) if still_jammed(stem) else stem or "Choose the best answer.", "options": options, "answer": answer}
        if analysis and len(re.findall(r"[\u4e00-\u9fff]", analysis)) >= 6:
            q["analysis"] = analysis
        return q

    qs = []
    for col in (1, 2):
        q = parse_q(cols[col])
        if q:
            q["id"] = len(qs) + 1
            qs.append(q)
    if not qs:
        return None
    return {
        "type": "daily_life",
        "title": title,
        "titleZh": title,
        "instruction": instruction,
        "layout": {"kind": kind, "kicker": instruction.replace("Read an ", "").replace("Read a ", "").strip(" .").title(), "title": title, "body": body},
        "questions": qs,
    }


def walk_fix(obj):
    if isinstance(obj, dict):
        if obj.get("t") and not obj.get("id"):
            obj["t"] = clean_passage(obj["t"]) if still_jammed(obj["t"]) else strip_hud(obj["t"])
            if obj["t"] and not obj["t"].endswith((" ", ".", "!", "?", ":", ";")):
                obj["t"] += " "
        if isinstance(obj.get("body"), str):
            obj["body"] = clean_passage(obj["body"]) if still_jammed(obj["body"]) else strip_hud(obj["body"])
        if isinstance(obj.get("stem"), str) and still_jammed(obj["stem"]):
            obj["stem"] = clean_passage(obj["stem"])
        if isinstance(obj.get("options"), dict):
            obj["options"] = {k: clean_option(v) for k, v in obj["options"].items() if clean_option(v)}
        for v in obj.values():
            walk_fix(v)
    elif isinstance(obj, list):
        for v in obj:
            walk_fix(v)


def jam_report(paper):
    bad = []
    tasks = paper.get("tasks") or []
    for t in tasks:
        chunks = []
        for p in t.get("passage") or []:
            if p and p.get("t"):
                chunks.append(p["t"])
        L = t.get("layout") or {}
        if L.get("body"):
            chunks.append(L["body"])
        for q in t.get("questions") or []:
            chunks.append(q.get("stem") or "")
            for v in (q.get("options") or {}).values():
                chunks.append(v)
        blob = " ".join(chunks)
        if still_jammed(blob):
            bad.append(t.get("title") or "?")
    return bad


def fix_bank():
    for path in (OUT_CW, OUT_RDL):
        paper = json.load(open(path))
        walk_fix(paper)
        json.dump(paper, open(path, "w"), ensure_ascii=False, indent=2)
        bad = jam_report(paper)
        print("fixed", os.path.basename(path), "tasks", len(paper.get("tasks") or []), "still-jammed", len(bad))
        for t in bad[:8]:
            print(" jam", t)


def calibrate():
    hit_cw, _ = hit_titles()
    p = ocr_one(os.path.join(CW_DIR, "R-CW1-South Pacific History.png"))
    task = parse_cw(os.path.join(CW_DIR, "R-CW1-South Pacific History.png"), p)
    words = [x.get("word") for x in task["passage"] if x.get("id")]
    want = ["populations", "complex", "with", "traditions", "social", "The", "political", "economic", "experienced", "changes"]
    assert words == want, words
    r = ocr_one(os.path.join(RDL_DIR, "R-RDL1-Career Fair.png"))
    daily = parse_rdl(os.path.join(RDL_DIR, "R-RDL1-Career Fair.png"), r)
    assert daily["questions"][0]["answer"] == "B", daily["questions"][0]
    assert daily["questions"][1]["answer"] == "A", daily["questions"][1]
    assert "Hi Team" in daily["layout"]["body"]
    spaced = "The history of the South Pacific is marked by diverse cultures and significant events."
    assert unjam(spaced) == spaced
    mass = unjam("MassextinctionshaveperiodicallyreshapedthediversityoflifeonEarth")
    assert "Mass extinctions have" in mass, mass
    assert "diversity of life" in mass, mass
    if os.path.exists(OUT_CW) and os.path.exists(OUT_RDL):
        leftover = jam_report(json.load(open(OUT_CW))) + jam_report(json.load(open(OUT_RDL)))
        assert not leftover, leftover[:8]
    print("ok bank-ocr-calibrate", len(hit_cw), "hit cw titles")


def paper(pid, title, tasks):
    return {
        "id": pid,
        "title": title,
        "skill": "reading",
        "source": "bank",
        "tasks": tasks,
    }


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        calibrate()
        return
    if len(sys.argv) > 1 and sys.argv[1] == "fix":
        fix_bank()
        return
    if not os.path.exists(OCR_BIN):
        subprocess.check_call(["swiftc", "-O", "-o", OCR_BIN, os.path.join(ROOT, "scripts/ocr_vision.swift")])
    skip_cw, skip_rdl = hit_titles()
    jobs = []
    for folder, kind, skip in ((CW_DIR, "cw", skip_cw), (RDL_DIR, "rdl", skip_rdl)):
        for name in sorted(os.listdir(folder), key=lambda n: [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", n)]):
            if not name.lower().endswith(".png"):
                continue
            path = os.path.join(folder, name)
            if norm(title_of(path)) in skip:
                continue
            jobs.append((kind, path))
    print("ocr", len(jobs), "images", file=sys.stderr)
    parsed = {"cw": [], "rdl": []}
    failed = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(ocr_one, path): (kind, path) for kind, path in jobs}
        done = 0
        for fut in as_completed(futs):
            kind, path = futs[fut]
            done += 1
            if done % 25 == 0:
                print("ocr", done, "/", len(jobs), file=sys.stderr)
            try:
                lines = fut.result()
                task = parse_cw(path, lines) if kind == "cw" else parse_rdl(path, lines)
                if not task:
                    failed.append(path)
                    continue
                parsed[kind].append(task)
            except Exception as e:
                failed.append(path + " " + str(e))
    parsed["cw"].sort(key=lambda t: t["title"].lower())
    parsed["rdl"].sort(key=lambda t: t["title"].lower())
    json.dump(paper("bank-cw", "题块库 · 单词填空", parsed["cw"]), open(OUT_CW, "w"), ensure_ascii=False, indent=2)
    json.dump(paper("bank-rdl", "题块库 · 生活阅读", parsed["rdl"]), open(OUT_RDL, "w"), ensure_ascii=False, indent=2)
    for path in (OUT_CW, OUT_RDL):
        bad = jam_report(json.load(open(path)))
        if bad:
            print("jam leftover", os.path.basename(path), bad[:8], file=sys.stderr)
    print("wrote", len(parsed["cw"]), "cw", len(parsed["rdl"]), "rdl", "failed", len(failed))
    for f in failed[:20]:
        print("fail", f, file=sys.stderr)
    if failed:
        sys.exit(2)


if __name__ == "__main__":
    main()
