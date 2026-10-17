import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STORE = "server/data/toefl-prediction-2026-10-17"
KINDS = {
    "toefl-pred-reading-cloze": ("reading", "complete_words"),
    "toefl-pred-reading-academic": ("reading", "academic"),
    "toefl-pred-listening-lecture": ("listening", "lecture"),
    "toefl-pred-writing-email": ("writing", "email"),
    "toefl-pred-writing-discussion": ("writing", "discussion"),
    "toefl-pred-speaking-repeat": ("speaking", "repeat"),
    "toefl-pred-speaking-interview": ("speaking", "interview"),
}


def text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip().casefold()


def signature(tasks):
    rows = []
    for task in tasks:
        kind = task["type"]
        if kind == "complete_words":
            row = (kind, [(text(re.sub(r"(?<!\d)[.,]|[.,](?!\d)", "", p.get("t", ""))), text(p.get("prefix")), text(p.get("answer"))) for p in task["passage"]])
        elif kind in ("academic", "daily_life", "lecture", "conversation", "announcement"):
            paras = [(text(p if isinstance(p, str) else p.get("t")), "" if isinstance(p, str) else p.get("insert", "")) for p in task.get("paras", [])]
            questions = [(text(q["stem"]), q.get("kind", ""), [text(v) for v in q.get("options", {}).values()], text(q.get("options", {}).get(q.get("answer")))) for q in task.get("questions", [])]
            row = (kind, paras, text(task.get("insertSentence")), text(task.get("transcript")), questions)
        elif kind in ("repeat", "interview"):
            row = (kind, text(task.get("instruction")), text(task.get("sample") if kind == "repeat" else task.get("stem")))
        elif kind == "email":
            row = (kind, text(task.get("prompt")), [text(v) for v in task.get("bullets", [])], text(task.get("to")), text(task.get("subject")))
        elif kind == "discussion":
            row = (kind, text(task.get("professor")), [(text(p.get("name")), text(p.get("text"))) for p in task.get("posts", [])])
        else:
            row = (kind, task)
        rows.append(row)
    return json.dumps(rows, ensure_ascii=False, sort_keys=True)


def questions(item, start):
    out = []
    for index, q in enumerate(item.get("questions", []), start):
        choices = sorted(q["choices"], key=lambda c: c["order"])
        mapping = {c["key"]: chr(65 + i) for i, c in enumerate(choices)}
        assert q["correctKey"] in mapping, q["questionId"]
        explanations = q.get("explanations", {})
        result = {
            "id": index, "stem": q["stem"],
            "options": {mapping[c["key"]]: c["label"] for c in choices},
            "answer": mapping[q["correctKey"]],
            "analysis": "\n".join(mapping[k] + ": " + v for k, v in explanations.items() if k in mapping and v),
        }
        if q.get("readingSubtype") == "insertion":
            result["kind"] = "insert"
        out.append(result)
    return out


def convert(key, item, start):
    skill, kind = KINDS[key]
    title = item.get("titleEn") or item.get("articleTitle") or item.get("title") or item.get("mediaTitle")
    base = {"type": kind, "module": item["num"], "title": title, "titleZh": item.get("titleZh") or item.get("title") or title}
    if kind == "complete_words":
        passage, pos = [], 0
        for index, slot in enumerate(item["slots"], start):
            word = slot["prefix"] + slot["answer"]
            assert re.fullmatch(r"[A-Za-z]+", slot["answer"]), slot
            assert not slot.get("visibleSuffix"), "Suffix blanks require an explicit conversion"
            match = re.search(r"\b" + re.escape(word) + r"\b", item["full"][pos:], re.I)
            assert match, (item["num"], word)
            a, b = pos + match.start(), pos + match.end()
            passage.append({"t": item["full"][pos:a]})
            passage.append({"id": index, "prefix": slot["prefix"], "answer": slot["answer"], "word": item["full"][a:b], "analysis": slot.get("explanation", "")})
            pos = b
        passage.append({"t": item["full"][pos:]})
        base["passage"] = passage
        return [base], len(item["slots"])
    if kind in ("academic", "lecture"):
        base["questions"] = questions(item, start)
        if kind == "academic":
            base["paras"] = item["paragraphs"]
            insertion = [q for q in item["questions"] if q.get("readingSubtype") == "insertion"]
            assert len(insertion) <= 1
            if insertion:
                base["insertSentence"] = insertion[0]["insertSentenceText"]
                paras = []
                for para in insertion[0]["questionParagraphs"]:
                    pieces = re.split(r"\{\{MARK:(\d+)\}\}", para)
                    if pieces[0]:
                        paras.append({"t": pieces[0]})
                    for i in range(1, len(pieces), 2):
                        paras.append({"t": pieces[i + 1], "insert": chr(64 + int(pieces[i]))})
                base["paras"] = paras
        else:
            base.update(audio=item["audio"], image=item.get("image", ""), transcript=item["transcript"], instruction="Listen to a lecture.")
        return [base], len(base["questions"])
    if kind in ("email", "discussion"):
        base.update(id=start, prompt="\n".join(item["prompt"]), sample="\n\n".join(item.get("essay", [])))
        if kind == "discussion":
            base["professor"] = "\n".join(item["prompt"])
            base["posts"] = []
        return [base], 1
    out = []
    image = item.get("scenarioAsset") or item.get("scenarioVisual", {}).get("stimulus", {}).get("src", "")
    for index, q in enumerate(item["qs"], start):
        task = dict(base, id=index, instruction=item["scenario"], audio=q["audio"], image=image, speakSec=8 if kind == "repeat" else 45)
        if kind == "repeat":
            task.update(sample=q["sentence"], prepSec=3)
        else:
            task.update(stem=q["sentence"], sample=q.get("modelAnswerText", ""), prepSec=0)
        out.append(task)
    return out, len(out)


def media_paths(value):
    if isinstance(value, dict):
        return {p for v in value.values() for p in media_paths(v)}
    if isinstance(value, list):
        return {p for v in value for p in media_paths(v)}
    if isinstance(value, str) and value.startswith("/toefl/"):
        return {value}
    return set()


def main():
    blank = {"type": "complete_words", "passage": [{"t": "Words, matter."}, {"prefix": "popul", "answer": "ations"}]}
    assert signature([blank]) == signature([dict(blank, passage=[{"t": "Words matter"}, {"prefix": "popul", "answer": "ations"}])])
    assert signature([blank]) != signature([dict(blank, passage=[{"t": "Words, matter."}, {"prefix": "popu", "answer": "lations"}])])
    assert signature([dict(blank, passage=[{"t": "1.5"}])]) != signature([dict(blank, passage=[{"t": "15"}])])
    insert = {"type": "academic", "paras": [{"t": "Text", "insert": "A"}], "insertSentence": "New sentence", "questions": []}
    assert signature([insert]) != signature([dict(insert, paras=[{"t": "Text", "insert": "B"}])])
    assert signature([insert]) != signature([dict(insert, insertSentence="Different sentence")])
    parser = argparse.ArgumentParser()
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("existing", type=Path)
    parser.add_argument("media_manifest", type=Path)
    parser.add_argument("media_dir", type=Path)
    args = parser.parse_args()
    snapshot = json.loads(args.snapshot.read_text())
    existing = json.loads(args.existing.read_text())
    assets = json.loads(args.media_manifest.read_text())["resources"]
    assert snapshot["courseId"] == "toefl-prediction-1"
    assert snapshot["structure"]["accessMode"] == "owned"
    assert set(snapshot["sections"]) == set(KINDS)
    expected = {x["meta"]["taskKey"]: x["meta"].get("itemCount", x["meta"].get("setCount")) for day in snapshot["structure"]["days"] for x in day}
    for key, section in snapshot["sections"].items():
        assert section["ok"] and len(section["items"]) == expected[key], key
        refs = next(x["meta"]["itemRefs"] for day in snapshot["structure"]["days"] for x in day if x["meta"]["taskKey"] == key)
        assert {x.get("groupId", x.get("itemId")) for x in section["items"]} == {x["id"] for x in refs}, key
    paths = media_paths(snapshot["sections"])
    asset_index = {x["path"]: x for x in assets}
    assert set(asset_index) == paths and len(asset_index) == len(assets), "Incomplete media manifest"
    for asset in assets:
        filename = asset["filename"]
        assert re.fullmatch(r"[a-f0-9]{24}\.[a-z0-9]+", filename), filename
        if asset["error"]:
            assert asset.get("unavailable") is True and asset.get("downloadMethod") == "authorized-browser" and "403" in asset["error"], asset
            assert asset["bytes"] == 0 and asset["sha256"] is None, asset
            continue
        data = (args.media_dir / filename).read_bytes()
        assert len(data) == asset["bytes"] and hashlib.sha256(data).hexdigest() == asset["sha256"], filename
        if asset["type"] == "image":
            assert data[:4] == b"RIFF" and data[8:12] == b"WEBP" and int.from_bytes(data[4:8], "little") + 8 == len(data), filename
            assert asset["contentType"] == "image/webp", filename
        elif data[4:8] == b"ftyp":
            assert asset["contentType"] == "audio/mp4" and b"mdat" in data and b"moov" in data, filename
        elif data[:4] == b"OggS":
            assert asset["contentType"] == "audio/ogg" and (b"vorbis" in data[:200] or b"OpusHead" in data[:200]), filename
        else:
            assert data[:3] == b"ID3" or (data[0] == 255 and data[1] & 224 == 224), filename
            assert asset["contentType"] == "audio/mpeg", filename
    index = {}
    for block in existing["pool"]:
        paper = existing["papers"][block["source"] + "|" + block["skill"] + "|" + str(block.get("paperId") or block["set"])]
        tasks = paper["tasks"][block["task"]:block["end"] + 1]
        index.setdefault(signature(tasks), block)
    papers = {skill: {"id": "prediction-2026-10-17", "skill": skill, "title": "预测包 · 2026-10-17", "source": "prediction", "modules": [], "tasks": []} for skill in {x[0] for x in KINDS.values()}}
    members, counters = [], {skill: 1 for skill in papers}
    for key in KINDS:
        skill, kind = KINDS[key]
        for item in snapshot["sections"][key]["items"]:
            tasks, count = convert(key, item, counters[skill])
            counters[skill] += count
            reuse = index.get(signature(tasks))
            member = {"key": key, "num": item["num"], "sourceId": item.get("groupId", item.get("itemId")), "questionCount": count, "reused": bool(reuse)}
            if reuse:
                member["blockId"] = reuse["id"]
            else:
                paper = papers[skill]
                start = len(paper["tasks"])
                block_id = "prediction-2026-10-17-" + kind + "-" + str(item["num"])
                member.update(blockId=block_id, block={"id": block_id, "source": "prediction", "sources": ["prediction"], "skill": skill, "type": kind, "title": tasks[0]["title"], "titleZh": tasks[0]["titleZh"], "set": "prediction-2026-10-17", "paperId": "prediction-2026-10-17", "task": start, "end": start + len(tasks) - 1, "n": count})
                for task in tasks:
                    task["module"] = len(paper["modules"]) + 1
                module = {"n": len(paper["modules"]) + 1, "timeSec": 0, "from": counters[skill] - count, "to": counters[skill] - 1}
                intro = next((v for v in item.get("scenarioVisual", {}).get("mediaCues", []) if v.get("kind") == "audio"), None)
                if intro:
                    module["intro"] = {"audio": intro["src"]}
                paper["modules"].append(module)
                paper["tasks"].extend(tasks)
            members.append(member)
    assert len(members) == 67 and sum(m["questionCount"] for m in members) == 317
    target = ROOT / STORE
    (target / "media").mkdir(parents=True, exist_ok=True)
    for asset in assets:
        if not asset["error"]:
            shutil.copyfile(args.media_dir / asset["filename"], target / "media" / asset["filename"])
    mapping = {a["path"]: STORE + "/media/" + a["filename"] for a in assets}
    def localize(value):
        if isinstance(value, dict):
            return {k: localize(v) for k, v in value.items()}
        if isinstance(value, list):
            return [localize(v) for v in value]
        return mapping.get(value, value) if isinstance(value, str) else value
    for skill, paper in papers.items():
        (target / (skill + ".json")).write_text(json.dumps(localize(paper), ensure_ascii=False, indent=2) + "\n")
    (target / "snapshot.json").write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n")
    manifest = {"courseId": snapshot["courseId"], "examDate": "2026-10-17", "capturedAt": snapshot["capturedAt"], "members": members, "assets": assets, "questionCount": 317}
    (target / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"groups": len(members), "questions": 317, "reused": sum(m["reused"] for m in members), "new": sum(not m["reused"] for m in members), "assets": len(assets)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
