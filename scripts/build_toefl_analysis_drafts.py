#!/usr/bin/env python3
"""给新托福题库离线补解析/译文。写入 *_draft 字段，抽检后再提升为正式字段。

用法：
  python3 scripts/build_toefl_analysis_drafts.py --file app/library/toefl/bank-cw-reading.json --limit 20
  ... --dry-run          只打印，不落盘（人工抽检用）
  ... --review           打印已写入的 *_draft 供抽检
  ... --promote          把 *_draft 复制成正式字段
Key 走仓库既有约定：server/.env（见 build_listen_sidecars.py 的 load_env）。
"""
import argparse
import json
import os
import re
import shutil
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"


def load_env():
    env = ROOT / "server" / ".env"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def qwen_json(system, user):
    key = os.environ.get("DASHSCOPE_API_KEY") or ""
    if not key:
        raise SystemExit("DASHSCOPE_API_KEY missing（server/.env 里也没有）")
    body = {
        "model": os.environ.get("QWEN_MODEL") or "qwen-plus",
        "temperature": 0,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }
    req = urllib.request.Request(
        URL,
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        raw = json.loads(resp.read().decode())
    text = raw["choices"][0]["message"]["content"].strip()
    text = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", text).strip()
    return json.loads(text)


def blanks_of(task):
    return [p for p in (task.get("passage") or []) if p and p.get("id") is not None]


def passage_view(task):
    """还原成填好的整段：模型不必从字母碎片猜词，只解释为什么是这个词这个形式。"""
    out = []
    for p in task.get("passage") or []:
        if not p:
            continue
        if p.get("id") is not None:
            word = p.get("word") or ((p.get("prefix") or "") + (p.get("answer") or ""))
            out.append(f"〔{p['id']}〕{word}")
        else:
            out.append(p.get("t", ""))
    return "".join(out)


SYSTEM = (
    "你是新托福 Complete the Words（首字母/半词填空）的老师。"
    "给定整段原文和每个空的提示，输出：translation（整段中文译文）和 items（每个空一条中文解析）。"
    "translation 要求：连贯的书面中文，不要出现任何编号、方括号、下划线、英文原词或注释；"
    "空格处直接按完整词译出，不要留占位。"
    "analysis 要求：最多两句；先说句法角色决定的词性/形式，再给一条构词或搭配佐证，最后给词义；"
    "只写你有把握的那一条决定性理由；"
    "禁止出现「提示」「____」「截断」「被截」等讨论题面形式的元话语，禁止从考卷给出的部分字母推构词，"
    "禁止复述答案字符串当作理由，禁止写「根据原文」。"
    '只输出 JSON 对象：{"translation":"…","items":[{"id":1,"analysis":"…"}]}，不要其它文字。'
)

BAD_WORDS = ("____", "提示", "截断", "被截", "误截", "缩写形式", "根据原文",
             "干扰项", "实际应填", "应填", "选项")


def clean(zh, got, blanks):
    """小样抽检发现的脏输出：译文带占位、解析讨论题面、把搭配写成跟自己搭配。不合格整篇重来。"""
    if re.search(r"\[\s*\d", zh) or "____" in zh:
        raise ValueError("译文含占位符")
    for p in blanks:
        i, a = p["id"], (got.get(p["id"]) or "")
        if len(a) > 220:
            raise ValueError(f"{i} 号解析过长")
        for w in BAD_WORDS:
            if w in a:
                raise ValueError(f"{i} 号解析含元话语「{w}」")
        word = re.escape(str(p.get("word") or ""))
        if word and re.search(r"与\s*" + word + r"\s*[，,]?\s*构成", a, re.I):
            raise ValueError(f"{i} 号解析把搭配写成与自身构成")



def hint_lines(task):
    """每个空配一句原文锚点，避免模型把解析安到邻居词上。"""
    sents = re.split(r"(?<=[.!?])\s+", passage_view(task))
    out = []
    for p in task.get("passage") or []:
        if not p or p.get("id") is None:
            continue
        word = p.get("word") or ((p.get("prefix") or "") + (p.get("answer") or ""))
        mark = f"〔{p['id']}〕"
        sent = next((s for s in sents if mark in s), "")
        out.append(f"{p['id']}. {word}｜考卷只给 {p.get('prefix', '')}____｜所在句：{sent}")
    return "\n".join(out)


def draft_task(task):
    blanks = blanks_of(task)
    ids = [b["id"] for b in blanks]
    user = (
        f"标题：{task.get('title','')}\n\n整段原文（〔n〕后是第 n 空的完整词）：\n{passage_view(task)}\n\n"
        f"逐空清单（解析只针对该行的完整词，并引用它所在句）：\n{hint_lines(task)}\n\n"
        "请为这些编号逐个出解析，并给整段译文。"
    )
    data = qwen_json(SYSTEM, user)
    got = {int(x.get("id")): (x.get("analysis") or "").strip() for x in data.get("items", [])}
    missing = [i for i in ids if not got.get(i)]
    if missing or not (data.get("translation") or "").strip():
        raise ValueError(f"items 缺 {missing} 或无译文")
    zh = (data["translation"] or "").strip()
    clean(zh, got, blanks)
    return zh, got


def mark(tasks, limit):
    hit = []
    for t in tasks:
        if not blanks_of(t):
            continue
        if blanks_of(t)[0].get("analysis") or blanks_of(t)[0].get("analysis_draft"):
            continue
        hit.append(t)
        if len(hit) >= limit:
            break
    return hit


def promote(tasks):
    n = 0
    for t in tasks:
        if t.get("zh_draft") and not t.get("translation"):
            t["translation"] = t.pop("zh_draft")
        for p in t.get("passage") or []:
            if p and p.get("analysis_draft"):
                p["analysis"] = p.pop("analysis_draft")
                n += 1
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--promote", action="store_true")
    ap.add_argument("--review", action="store_true", help="打印已写入的 *_draft 供人工抽检")
    ap.add_argument("--model", default="", help="默认 qwen-plus；抽检嫌弱可换 qwen-max")
    a = ap.parse_args()

    load_env()
    if a.model:
        os.environ["QWEN_MODEL"] = a.model
    path = (ROOT / a.file).resolve()
    doc = json.loads(path.read_text())
    tasks = doc.get("tasks") or []

    if a.promote:
        print(f"promoted {promote(tasks)} blanks ->", path)
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")
        return

    if a.review:
        n = 0
        for t in tasks:
            bs = blanks_of(t)
            if not bs or not any(p.get("analysis_draft") for p in bs):
                continue
            n += 1
            print(f"\n=== {t.get('title')} ===\n{t.get('zh_draft','')}")
            for p in bs:
                print(f"  {p['id']} {p.get('word') or p.get('answer')}: {p.get('analysis_draft','')}")
        print(f"\n共 {n} 篇待抽检；通过后跑 --promote 提升为正式字段")
        return

    todo = mark(tasks, a.limit)
    print(f"{path.name}: {len(todo)} 篇待补")
    done = 0
    for t in todo:
        for attempt in range(2):
            try:
                zh, got = draft_task(t)
                break
            except Exception as e:  # 单次失败重试一次，仍失败就跳过并如实报
                print("  retry" if attempt == 0 else f"  SKIP {t.get('title')}: {e}")
                time.sleep(2)
                zh, got = None, None
        if got is None:
            continue
        t["zh_draft"] = zh
        for p in t.get("passage") or []:
            if p and p.get("id") is not None:
                p["analysis_draft"] = got[int(p["id"])]
        done += 1
        if a.dry_run:
            print(f"\n=== {t.get('title')} ===\n{zh}")
            for p in t["passage"]:
                if p and p.get("id") is not None:
                    print(f"  {p['id']} {p.get('word') or p.get('answer')}: {p['analysis_draft']}")
        else:
            print(f"  ok {done}/{len(todo)} {t.get('title')}")
        if not a.dry_run and done % 5 == 0:
            save(path, doc)
    if not a.dry_run and done:
        save(path, doc)
    print(f"写入 {done} 篇（draft 字段）" + ("；dry-run 未落盘" if a.dry_run else f"，备份见 {path.parent}/backups"))


BACKED = set()


def save(path, doc):
    if path not in BACKED:
        bdir = path.parent / "backups"
        bdir.mkdir(exist_ok=True)
        dst = bdir / f"{path.stem}.{time.strftime('%Y%m%d-%H%M%S')}.json"
        shutil.copy2(path, dst)
        BACKED.add(path)
        print("备份 ->", dst, file=sys.stderr)
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
