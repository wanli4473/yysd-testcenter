#!/usr/bin/env python3
"""Replace wordData in 高中单词LISTn.html and fix counts/titles. Excel order is caller’s job."""
import json, re, sys
from pathlib import Path

DIR = Path(__file__).resolve().parents[1] / "library/study/vocab"


def inject(n, words):
    path = DIR / ("高中单词LIST%s.html" % n)
    html = path.read_text(encoding="utf-8")
    m = re.search(r"const wordData = \[[\s\S]*?\];", html)
    if not m:
        raise SystemExit("wordData not found: %s" % path)
    payload = "const wordData = %s;" % json.dumps(words, ensure_ascii=False, separators=(",", ":"))
    html = html[: m.start()] + payload + html[m.end() :]
    count = len(words)
    html = re.sub(r"<title>.*?</title>", "<title>高中单词 LIST %s (1-%s) - 英式女声</title>" % (n, count), html, count=1)
    html = re.sub(r"(IELTS LIST %s|高中 LIST %s)" % (n, n), "高中 LIST %s" % n, html)
    html = re.sub(r"共 \d+ 词", "共 %s 词" % count, html)
    html = re.sub(r"全部<strong>\d+个单词</strong>", "全部<strong>%s个单词</strong>" % count, html)
    html = re.sub(r"开始检测 \(\d+题\)", "开始检测 (%s题)" % count, html)
    html = re.sub(r"第 1 / \d+ 题", "第 1 / %s 题" % count, html)
    html = re.sub(r"const TOTAL_QUESTIONS = \d+;", "const TOTAL_QUESTIONS = %s;" % count, html)
    path.write_text(html, encoding="utf-8")
    order = [w["word"] for w in words]
    print("LIST%s %s words · %s … %s" % (n, count, order[0], order[-1]))


if __name__ == "__main__":
    n = int(sys.argv[1])
    words = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    inject(n, words)
