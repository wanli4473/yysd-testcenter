#!/usr/bin/env python3
"""Build jingting part JSON from Cam21 timed transcripts + optional zh via DashScope.
Usage:
  python scripts/build_jingting_cam21.py          # convert only (zh="")
  python scripts/build_jingting_cam21.py --zh     # convert + translate missing zh
ponytail: batch LLM translate; re-run --zh to fill blanks; upgrade to human QA later."""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = "library/mock/cambridge-listening"
OUT_DIR = ROOT / "library/practice/jingting/data"
def transcript_path(t: int) -> Path:
    return ROOT / AUDIO_DIR / f"cambridge-21-test-{t}-transcript.json"


def load_env():
    env_path = ROOT / "server" / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def part_id(test: int, section: int) -> str:
    return f"cam21-t{test}-p{section}"


def convert_one(test: int, part: dict) -> dict:
    sec = int(part["section"])
    audio = part["audio"]
    return {
        "id": part_id(test, sec),
        "title": f"剑21 Test {test} Part {sec}",
        "audioUrl": f"{AUDIO_DIR}/{audio}",
        "examHref": f"{AUDIO_DIR}/cambridge-21-test-{test}.html",
        "sentences": [
            {
                "en": s["text"],
                "zh": "",
                "start": float(s["start"]),
                "end": float(s["end"]),
            }
            for s in part["sentences"]
        ],
    }


def convert_all() -> list[Path]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written = []
    for t in range(1, 5):
        data = json.loads(transcript_path(t).read_text())
        for part in data["parts"]:
            obj = convert_one(t, part)
            path = OUT_DIR / f"{obj['id']}.json"
            # preserve existing zh if re-running
            if path.exists():
                old = json.loads(path.read_text())
                old_zh = {s["en"]: s.get("zh", "") for s in old.get("sentences", [])}
                for s in obj["sentences"]:
                    if old_zh.get(s["en"]):
                        s["zh"] = old_zh[s["en"]]
            path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")
            written.append(path)
            print(f"wrote {path.name} ({len(obj['sentences'])} sents)")
    return written


def qwen_translate_batch(sentences: list[str]) -> list[str]:
    key = os.environ.get("DASHSCOPE_API_KEY") or ""
    if not key:
        raise SystemExit("DASHSCOPE_API_KEY missing")
    model = os.environ.get("DASHSCOPE_MODEL") or "qwen-plus"
    numbered = "\n".join(f"{i+1}. {s}" for i, s in enumerate(sentences))
    body = {
        "model": model,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是雅思听力原文译者。把每句英译中，保留说话人标签（如 WOMAN:/MAN:）不译。"
                    "只输出 JSON 数组，长度与输入句数相同，元素为中文字符串，不要其它文字。"
                ),
            },
            {"role": "user", "content": numbered},
        ],
    }
    req = urllib.request.Request(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = json.loads(resp.read().decode())
    text = raw["choices"][0]["message"]["content"].strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    arr = json.loads(text)
    if len(arr) != len(sentences):
        raise ValueError(f"translate length mismatch {len(arr)} != {len(sentences)}")
    return [str(x) for x in arr]


def fill_zh(batch_size: int = 20):
    load_env()
    for path in sorted(OUT_DIR.glob("cam21-t*-p*.json")):
        obj = json.loads(path.read_text())
        sents = obj["sentences"]
        missing = [i for i, s in enumerate(sents) if not (s.get("zh") or "").strip()]
        if not missing:
            print(f"{path.name}: zh ok")
            continue
        print(f"{path.name}: translating {len(missing)} sentences…")
        for off in range(0, len(missing), batch_size):
            idxs = missing[off : off + batch_size]
            ens = [sents[i]["en"] for i in idxs]
            try:
                zhs = qwen_translate_batch(ens)
            except Exception as e:
                print(f"  batch failed at {idxs[0]}: {e}; retry once")
                time.sleep(2)
                zhs = qwen_translate_batch(ens)
            for i, zh in zip(idxs, zhs):
                sents[i]["zh"] = zh
            path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")
            print(f"  filled {idxs[0]+1}–{idxs[-1]+1}")
            time.sleep(0.4)
        print(f"{path.name}: done")


def main():
    do_zh = "--zh" in sys.argv
    convert_all()
    if do_zh:
        fill_zh()


if __name__ == "__main__":
    main()
