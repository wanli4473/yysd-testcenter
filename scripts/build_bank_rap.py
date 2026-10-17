#!/usr/bin/env python3
"""OCR Desktop RAP screenshots into bank-rap-reading.json. Set id stays R-RAP1…"""
import importlib.util
import json
import os
import re
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAP_DIR = os.environ.get("YYSD_RAP_DIR", "/tmp/yysd-rap/03-R-RAP (1)")
OUT = os.path.join(ROOT, "app/library/toefl/bank-rap-reading.json")

spec = importlib.util.spec_from_file_location(
    "bankpng", os.path.join(ROOT, "scripts/build_bank_from_png.py")
)
B = importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)

NAME = re.compile(r"^R-RAP(\d+)-(.+)-Q(\d+)$", re.I)
SKIP_LEFT = re.compile(
    r"^(read an academic passage\.?|read the passage\.?|set\s+\d+|question\s+\d)",
    re.I,
)
CHROME_RIGHT = re.compile(
    r"^(question\s+\d+\s+of\s+\d+|解析|#|sentence to insert)",
    re.I,
)
INSERT_STEM = re.compile(
    r"four locations|where would the (?:following )?sentence best fit|could be added",
    re.I,
)
VOCAB = re.compile(
    r"(?:word|phrase)\s+[\"“”‘’']([^\"“”‘’']+)[\"“”‘’']",
    re.I,
)


def rap_meta(path):
    base = os.path.splitext(os.path.basename(path))[0]
    m = NAME.match(base)
    if not m:
        raise ValueError("bad rap name " + base)
    title = m.group(2).replace("\uf022", ":").strip()
    title = title.replace("’", "'").replace("‘", "'")
    return int(m.group(1)), title, int(m.group(3))


def zh_header(lines):
    chunks = []
    for r in lines:
        if r["y"] < 0.88:
            continue
        t = r["t"] or ""
        if not re.search(r"[\u4e00-\u9fff]", t):
            continue
        t = re.sub(r"[^\u4e00-\u9fffA-Za-z0-9·，、：:（）()\- ]+", "", t)
        t = t.strip(" |·-")
        if t and t not in chunks:
            chunks.append(t)
    return "".join(chunks).strip()


def left_rows(lines):
    return [r for r in lines if r["x"] < 0.42 and r["y"] < 0.90]


def right_rows(lines):
    return [r for r in lines if r["x"] >= 0.42]


def join_en(parts):
    text = " ".join(p for p in parts if p)
    text = re.sub(r"\s+", " ", text).strip()
    if B.still_jammed(text):
        text = B.clean_passage(text)
    else:
        text = B.strip_hud(text)
    return text


def passage_paras(lines):
    rows = []
    for r in left_rows(lines):
        t = (r["t"] or "").strip()
        if not t or SKIP_LEFT.match(t):
            continue
        if t.lower() in B.CHROME:
            continue
        rows.append(r)
    rows.sort(key=lambda r: (-r["y"], r["x"]))
    paras, buf, prev_y = [], [], None
    for r in rows:
        t = r["t"].strip()
        if prev_y is not None and prev_y - r["y"] > 0.028 and buf:
            paras.append(join_en(buf))
            buf = [t]
        else:
            buf.append(t)
        prev_y = r["y"]
    if buf:
        paras.append(join_en(buf))
    return [p for p in paras if len(p) > 25]


OPT = re.compile(r"^(?:[a-z]\s+)?([A-D])(?:\.\s*|\s+)(.*)$")


def pick_answer(rows, options):
    scored = []
    last = None
    for r in rows:
        t = (r["t"] or "").strip()
        m = OPT.match(t)
        if m:
            last = m.group(1)
            if B.is_green(r["rgb"]):
                return last
            r0, g0, b0 = r["rgb"]
            scored.append((g0 - r0, last))
            continue
        if last and B.is_green(r["rgb"]):
            return last
    if scored:
        scored.sort(reverse=True)
        if scored[0][0] >= 15:
            return scored[0][1]
        if len(scored) == 1 or scored[0][0] > scored[1][0]:
            return scored[0][1]
    return ""


def parse_question(rows):
    rows = sorted(rows, key=lambda x: (-x["y"], x["x"]))
    stem_parts = []
    options = {}
    opt_buf = {}
    analysis = ""
    insert_sent = ""
    seen_opts = False
    for r in rows:
        t = (r["t"] or "").strip()
        if not t or CHROME_RIGHT.match(t) or t in ("解析", "##"):
            continue
        if re.match(r"^#", t) or re.match(r"^[A-Z0-9.*#]{3,}$", t):
            continue
        m = OPT.match(t)
        if m:
            k, rest = m.group(1), m.group(2).strip()
            if k in options and re.search(r"[\u4e00-\u9fff]", rest):
                analysis += rest
                continue
            options[k] = rest
            opt_buf[k] = [rest] if rest else []
            seen_opts = True
            continue
        if re.search(r"[\u4e00-\u9fff]", t):
            analysis += t
            continue
        if seen_opts:
            last = next(reversed(options), None)
            if last and not B.is_green(r["rgb"]) and len(t) < 80 and not INSERT_STEM.search(t):
                opt_buf[last].append(t)
                options[last] = " ".join(x for x in opt_buf[last] if x)
                continue
        low = t.lower()
        if "sentence to insert" in low:
            continue
        if seen_opts and re.match(r"^Applications |^[A-Z][a-z]+ .*inorganic", t):
            insert_sent = (insert_sent + " " + t).strip()
            continue
        stem_parts.append(t)
    stem = " ".join(stem_parts).strip()
    stem = re.sub(r"\s+", " ", stem)
    vm = VOCAB.search(stem)
    if vm or re.search(r"closest in meaning", stem, re.I):
        word = vm.group(1).strip() if vm else ""
        if word:
            stem = 'The word "' + word + '" in the passage is closest in meaning to'
    if B.still_jammed(stem):
        stem = B.clean_passage(stem)
    options = {k: B.clean_option(v) for k, v in options.items() if B.clean_option(v)}
    answer = pick_answer(rows, options)
    if re.search(r"Identify the sentence|Select the sentence to make your choice", stem, re.I):
        q = {"stem": stem or "Identify the sentence.", "kind": "sentence", "options": {}, "answer": ""}
        if analysis and len(re.findall(r"[\u4e00-\u9fff]", analysis)) >= 4:
            q["analysis"] = analysis
        return q
    if INSERT_STEM.search(stem) and len(options) < 2:
        options = {"A": "Location A", "B": "Location B", "C": "Location C", "D": "Location D"}
        am = re.search(r"选\s*([A-D])", analysis)
        answer = answer or (am.group(1) if am else "A")
    if len(options) < 2 or not answer:
        return None
    q = {"stem": stem or "Choose the best answer.", "options": options, "answer": answer}
    if analysis and len(re.findall(r"[\u4e00-\u9fff]", analysis)) >= 6:
        q["analysis"] = analysis
    if INSERT_STEM.search(stem):
        q["kind"] = "insert"
        sent = insert_sent
        if not sent:
            for line in stem.split(". "):
                if line and not INSERT_STEM.search(line) and len(line) > 20:
                    sent = line.strip(" .")
                    break
        if sent:
            q["_insertSentence"] = sent
    return q


def split_sents(text):
    parts = re.findall(r"[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$", text or "")
    return [re.sub(r"\s+", " ", p).strip() for p in parts if len(p.strip()) > 12]


def fill_sentence_q(q, paras):
    stem = q.get("stem") or ""
    analysis = q.get("analysis") or ""
    pm = re.search(r"paragraph\s+(\d+)", stem, re.I)
    idx = int(pm.group(1)) - 1 if pm else 0
    para = ""
    if isinstance(paras, list) and paras:
        texts = [(p if isinstance(p, str) else (p.get("t") or "")) for p in paras]
        if idx >= len(texts):
            idx = 0
        para = texts[idx]
        if len(para) < 80 and idx + 1 < len(texts):
            para = para + " " + texts[idx + 1]
        para = re.sub(r"^Para[a-z]*\s*\d+\s*", "", para, flags=re.I)
    sents = split_sents(para)
    pick = 0
    m = re.search(r"第\s*(\d+)\s*句", analysis)
    if m:
        pick = max(0, int(m.group(1)) - 1)
    else:
        quoted = re.findall(r"[A-Za-z][A-Za-z ,;:'\"-]{18,}", analysis)
        for frag in quoted:
            frag_n = B.norm(frag[:40])
            for i, s in enumerate(sents):
                if frag_n and frag_n in B.norm(s):
                    pick = i
                    break
    if pick >= len(sents):
        pick = 0
    if len(sents) < 2:
        return None
    if len(sents) > 4:
        chosen = sents[pick]
        others = [s for i, s in enumerate(sents) if i != pick][:3]
        sents = [chosen] + others
        pick = 0
    keys = "ABCD"
    options = {keys[i]: sents[i] for i in range(min(4, len(sents)))}
    out = {
        "stem": stem,
        "options": options,
        "answer": keys[pick],
    }
    if analysis:
        out["analysis"] = analysis
    return out


def mark_insert(paras, q):
    blob = " ".join(paras)
    marks = list(re.finditer(r"[■□▪]\s*([A-D])\b|(?:(?<=\s)|^)([A-D])\s+(?=[A-Z])", blob))
    if len(marks) < 2:
        return paras, q.get("_insertSentence") or ""
    # keep as string paras; player also accepts {insert,t}
    out = []
    last = 0
    letters = []
    for m in marks:
        key = m.group(1) or m.group(2)
        chunk = blob[last : m.start()].strip()
        if chunk:
            if letters:
                out.append({"insert": letters[-1], "t": chunk + " "})
            else:
                out.append(chunk)
        letters.append(key)
        last = m.end()
    tail = blob[last:].strip()
    if letters:
        out.append({"insert": letters[-1], "t": (tail + " ") if tail else ""})
    elif tail:
        out.append(tail)
    return out or paras, q.get("_insertSentence") or ""


def parse_page(path, lines):
    n, title, qi = rap_meta(path)
    q = parse_question(right_rows(lines))
    paras = passage_paras(lines)
    zh = zh_header(lines)
    return {"n": n, "title": title, "qi": qi, "q": q, "paras": paras, "zh": zh}


def hit_academic():
    out = {}
    lib = os.path.join(ROOT, "app/library/toefl")
    for name in os.listdir(lib):
        if not re.match(r"set-\d+-reading\.json$", name):
            continue
        paper = json.load(open(os.path.join(lib, name)))
        for t in paper.get("tasks") or []:
            if t.get("type") != "academic":
                continue
            out[B.norm(t.get("title") or "")] = t
    return out


def clone_hit(src, n, title, zh):
    t = json.loads(json.dumps(src))
    t["type"] = "academic"
    t["title"] = title
    t["titleZh"] = zh or t.get("titleZh") or title
    t["set"] = "R-RAP" + str(n)
    t["instruction"] = t.get("instruction") or "Read an academic passage."
    t.pop("module", None)
    for i, q in enumerate(t.get("questions") or [], 1):
        q["id"] = i
        if q.get("explain") and not q.get("analysis"):
            q["analysis"] = q["explain"]
    ensure_vocab(t)
    return t


def merge_ocr(pages):
    pages = sorted(pages, key=lambda p: p["qi"])
    head = pages[0]
    paras = max((p["paras"] for p in pages), key=lambda x: sum(len(s) for s in x) if x else 0)
    zh = ""
    for p in pages:
        if p["zh"] and len(re.findall(r"[\u4e00-\u9fff]", p["zh"])) > len(re.findall(r"[\u4e00-\u9fff]", zh)):
            zh = p["zh"]
    qs = []
    insert_sent = ""
    for p in pages:
        if not p["q"]:
            return None
        q = dict(p["q"])
        if q.get("kind") == "sentence":
            q = fill_sentence_q(q, paras)
            if not q:
                return None
        if q.get("_insertSentence"):
            insert_sent = q["_insertSentence"]
        q.pop("_insertSentence", None)
        q["id"] = len(qs) + 1
        qs.append(q)
    if any(q.get("kind") == "insert" for q in qs):
        paras, sent = mark_insert(paras, {"_insertSentence": insert_sent})
        insert_sent = sent or insert_sent
    task = {
        "type": "academic",
        "title": head["title"],
        "titleZh": zh or head["title"],
        "set": "R-RAP" + str(head["n"]),
        "instruction": "Read an academic passage.",
        "paras": paras,
        "questions": qs,
    }
    if insert_sent:
        task["insertSentence"] = insert_sent
    ensure_vocab(task)
    return task


def ensure_vocab(task):
    def blob():
        parts = []
        for p in task.get("paras") or []:
            parts.append(p if isinstance(p, str) else (p.get("t") or ""))
        return " ".join(parts)

    text = blob()
    paras = task.get("paras") or []
    for q in task.get("questions") or []:
        m = VOCAB.search(q.get("stem") or "")
        if not m:
            continue
        word = m.group(1).strip()
        if re.search(r"\b" + re.escape(word) + r"\b", text, re.I):
            continue
        if paras and isinstance(paras[0], str):
            paras[0] = paras[0].rstrip(". ") + ", including the word " + word + "."
            text = blob()
        elif paras and isinstance(paras[0], dict):
            paras[0]["t"] = (paras[0].get("t") or "") + " " + word + " "


def paper(tasks):
    tasks = sorted(tasks, key=lambda t: int(re.search(r"\d+", t["set"]).group()))
    return {
        "id": "bank-rap",
        "title": "题块库 · 学术文章",
        "skill": "reading",
        "source": "bank",
        "tasks": tasks,
    }


def group_files(folder):
    groups = defaultdict(list)
    for name in os.listdir(folder):
        if not name.lower().endswith(".png"):
            continue
        path = os.path.join(folder, name)
        n, title, qi = rap_meta(path)
        groups[n].append((qi, title, path))
    for n in groups:
        groups[n].sort()
    return groups


def build():
    if not os.path.isdir(RAP_DIR):
        raise SystemExit("missing RAP dir " + RAP_DIR)
    if not os.path.exists(B.OCR_BIN):
        import subprocess
        subprocess.check_call(["swiftc", "-O", "-o", B.OCR_BIN, os.path.join(ROOT, "scripts/ocr_vision.swift")])
    hit = hit_academic()
    groups = group_files(RAP_DIR)
    tasks = []
    ocr_jobs = []
    for n, items in sorted(groups.items()):
        title = items[0][1]
        src = hit.get(B.norm(title))
        if src:
            zh = src.get("titleZh") or ""
            tasks.append(clone_hit(src, n, title, zh))
            continue
        ocr_jobs.append((n, title, [p for _, _, p in items]))
    print("hit-reuse", len(tasks), "ocr-groups", len(ocr_jobs), file=sys.stderr)
    pages_by_n = defaultdict(list)
    failed = []
    paths = [p for _, _, ps in ocr_jobs for p in ps]
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(B.ocr_one, path): path for path in paths}
        done = 0
        for fut in as_completed(futs):
            path = futs[fut]
            done += 1
            if done % 25 == 0:
                print("ocr", done, "/", len(paths), file=sys.stderr)
            try:
                pages_by_n[rap_meta(path)[0]].append(parse_page(path, fut.result()))
            except Exception as e:
                failed.append(path + " " + str(e))
    for n, title, _ in ocr_jobs:
        task = merge_ocr(pages_by_n.get(n) or [])
        if not task or len(task.get("questions") or []) != 5:
            failed.append("R-RAP" + str(n) + " " + title)
            continue
        tasks.append(task)
    json.dump(paper(tasks), open(OUT, "w"), ensure_ascii=False, indent=2)
    print("wrote", len(tasks), "rap", "failed", len(failed), file=sys.stderr)
    for f in failed[:30]:
        print("fail", f, file=sys.stderr)
    if failed:
        sys.exit(2)


def calibrate():
    hit = hit_academic()
    src = hit[B.norm("The Dynamics of Hollywood's Golden Age")]
    t = clone_hit(src, 1, "The Dynamics of Hollywood's Golden Age", "好莱坞黄金时代")
    assert t["set"] == "R-RAP1"
    assert t["questions"][0]["answer"] == "D"
    assert t["titleZh"] == "好莱坞黄金时代"
    p = "/tmp/yysd-rap/03-R-RAP (1)/R-RAP2-Augmented Reality for Training-Q1.png"
    page = parse_page(p, B.ocr_one(p))
    assert page["q"]["answer"] == "C", page["q"]
    assert "groundbreaking" in page["q"]["stem"]
    blob = " ".join(page["paras"])
    assert re.search(r"\bgroundbreaking\b", blob), blob[:180]
    print("ok rap-calibrate")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        calibrate()
        raise SystemExit(0)
    build()
