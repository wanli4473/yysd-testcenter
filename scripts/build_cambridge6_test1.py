#!/usr/bin/env python3
"""Generate Cambridge IELTS 6 Test 1 listening, reading, and writing mock pages."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST_RE = re.compile(r"const TEST = (\{[\s\S]*?\});", re.S)
W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

DOCX = Path("/Users/frankman/Desktop/剑6T1.docx")
SPORTS_CLUB_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-02_14.22.37-3b7dfd8d-bcfd-47f2-a907-072abd1b124c.png"
)
MEMBERSHIP_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-02_14.22.47-2bb7aedc-3c39-4a8a-bd22-032324f4be8d.png"
)
WATER_USE_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-02_14.22.58-7c41d64f-997e-4b06-bad9-0b72670a13c9.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test1 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test1 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test1 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test1 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-6-test-1.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-6-test-1-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-6-test-1-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-7-test-4.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-7-test-4-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-7-test-4-writing.html"

STATE_VARS = (
    "let currentPaper=[], selectedSections=[], mode='practice', "
    "startTime=0, timerInterval=null, submitted=false;\n"
)


def ans(*values: str) -> list[str]:
    return list(values)


def explain(*values: str) -> str:
    return "答案：" + " / ".join(values) + "。"


def replace_test(html: str, test: dict) -> str:
    block = "const TEST = " + json.dumps(test, ensure_ascii=False, indent=2) + ";"
    return TEST_RE.sub(block, html, count=1)


def inject_state_vars(html: str) -> str:
    needle = "const allQs = sec => sec.groups.flatMap(g=>g.questions);"
    if STATE_VARS.strip() not in html and needle in html:
        html = html.replace(needle, STATE_VARS + needle, 1)
    return html


def patch_note_image(html: str) -> str:
    if "const fig=(g.image?" not in html and "if(g.kind==='note'){\n    body=`" in html:
        insert = (
            "  if(g.kind==='note'){\n"
            "    const fig=(g.image?`<div class=\"map-wrap\" style=\"margin-bottom:16px;\">"
            "<img class=\"map-img\" src=\"${g.image}\" alt=\"${g.noteTitle||'map'}\" "
            "style=\"max-width:100%;height:auto;\"></div>`:'');\n"
            "    body=fig+`"
        )
        html = html.replace("  if(g.kind==='note'){\n    body=`", insert, 1)
    return html


def patch_listening_meta(html: str) -> str:
    reps = [
        ("剑桥雅思7 Test 4 听力", "剑桥雅思6 Test 1 听力"),
        ("剑桥雅思7 · Test 4（听力）", "剑桥雅思6 · Test 1（听力）"),
        ("剑桥雅思7 Test 4 听力：", "剑桥雅思6 Test 1 听力："),
        ("Test 4 听力（官方原题 + 官方答案）", "Test 1 听力（官方原题 + 官方答案）"),
        ('<div class="num">7</div>', '<div class="num">6</div>'),
        ("剑桥雅思 7 · Test 4", "剑桥雅思 6 · Test 1"),
        ("剑桥雅思7 · Test 4", "剑桥雅思6 · Test 1"),
        ("test-4", "test-1"),
        ("ielts7_test4", "ielts6_test1"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    return patch_note_image(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思7 Test 4 阅读", "剑桥雅思6 Test 1 阅读"),
        ("剑桥雅思7 · Test 4（阅读）", "剑桥雅思6 · Test 1（阅读）"),
        ("剑桥雅思7 Test 4 学术类阅读", "剑桥雅思6 Test 1 学术类阅读"),
        ('<div class="num">7</div>', '<div class="num">6</div>'),
        ("剑桥雅思 7 · Test 4", "剑桥雅思 6 · Test 1"),
        ("剑桥雅思7 · Test 4", "剑桥雅思6 · Test 1"),
        ("Test 4 阅读（官方原题 + 官方答案）", "Test 1 阅读（官方原题 + 官方答案）"),
        ("Test 4", "Test 1"),
        ("test-4", "test-1"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思7 Test 4 写作", "剑桥雅思6 Test 1 写作"),
        ("剑桥雅思7 · Test 4（写作）", "剑桥雅思6 · Test 1（写作）"),
        ("剑桥雅思7 Test 4 学术类写作", "剑桥雅思6 Test 1 学术类写作"),
        (
            "Task 1 electricity production pie charts + Task 2 university function essay",
            "Task 1 global water use graph + Task 2 consumer goods and advertising essay",
        ),
        ('<div class="num">7</div>', '<div class="num">6</div>'),
        ("剑桥雅思 7 · Test 4", "剑桥雅思 6 · Test 1"),
        ("剑桥雅思7 · Test 4", "剑桥雅思6 · Test 1"),
        ("Test 4 写作（官方真题）", "Test 1 写作（官方真题）"),
        ("cambridge-7-test-4-writing-draft", "cambridge-6-test-1-writing-draft"),
        ("【剑桥雅思7 · Test 4 写作】", "【剑桥雅思6 · Test 1 写作】"),
        ("Test 4", "Test 1"),
        ("test-4", "test-1"),
        ("electricity-production", "water-use"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def extract_docx_paras(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    paras: list[str] = []
    for p in root.iter(W_NS + "p"):
        parts: list[str] = []
        for t in p.iter(W_NS + "t"):
            if t.text:
                parts.append(t.text)
            if t.tail:
                parts.append(t.tail)
        line = "".join(parts).strip()
        if line:
            paras.append(line)
    return paras


def labeled_para(line: str) -> str:
    if len(line) >= 2 and line[0] in "ABCDEFGHIJ" and line[1] == " ":
        return f'<span class="para-label">{line[0]}</span>{line[2:].strip()}'
    return line


def reading_passages() -> list[dict]:
    paras = extract_docx_paras(DOCX)
    return [
        {
            "id": 1,
            "passage": {
                "title": "Australia's sporting success",
                "paras": [labeled_para(x) for x in paras[92:98]],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": "The vast expansion in international trade",
                "byline": paras[123],
                "paras": [labeled_para(x) for x in paras[124:133]],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": paras[163],
                "byline": paras[164],
                "paras": [labeled_para(x) for x in paras[165:172]],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 6, "testNo": 1},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "ielts6_test1_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–4",
                        "instruction": "Complete the notes below. Write NO MORE THAN THREE WORDS for each answer.",
                        "noteTitle": "Notes on sports club",
                        "image": "cambridge-6-test-1-sports-club.png",
                        "lines": [
                            {"plain": True, "html": "Example: Name of club — Kingswell"},
                            {"h": "Facilities available:"},
                            {"bullet": True, "html": "Golf"},
                            {"bullet": True, "html": "<Q n=\"1\">"},
                            {"bullet": True, "html": "<Q n=\"2\">"},
                            {"h": "Classes available:"},
                            {"bullet": True, "html": "Kick-boxing"},
                            {"bullet": True, "html": "<Q n=\"3\">"},
                            {"h": "Additional facility:"},
                            {"bullet": True, "html": "<Q n=\"4\"> (restaurant opening soon)"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("keep-fit studio", "a keep-fit studio", "keep fit studio"), "explain": explain("keep-fit studio", "a keep-fit studio")},
                            {"id": "L2", "no": 2, "answer": ans("swimming"), "explain": explain("swimming")},
                            {"id": "L3", "no": 3, "answer": ans("yoga", "yoga classes"), "explain": explain("yoga", "yoga classes")},
                            {"id": "L4", "no": 4, "answer": ans("salad bar", "a salad bar"), "explain": explain("salad bar", "a salad bar")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 5–8",
                        "instruction": "Complete the table below. Write NO MORE THAN TWO NUMBERS for each answer.",
                        "noteTitle": "MEMBERSHIP SCHEMES",
                        "image": "cambridge-6-test-1-membership.png",
                        "lines": [
                            {"plain": True, "html": "GOLD — Annual subscription fee: £<Q n=\"5\">"},
                            {"plain": True, "html": "SILVER — Cost of classes: £<Q n=\"6\">; Times: <Q n=\"7\">"},
                            {"plain": True, "html": "BRONZE — Annual subscription fee: £<Q n=\"8\">"},
                        ],
                        "questions": [
                            {"id": "L5", "no": 5, "answer": ans("500"), "explain": explain("500")},
                            {"id": "L6", "no": 6, "answer": ans("1"), "explain": explain("1")},
                            {"id": "L7", "no": 7, "answer": ans("10 to 4.30", "10 am to 4.30 pm", "10, 4.30", "10 4.30"), "explain": explain("10 to 4.30", "10 am to 4.30 pm")},
                            {"id": "L8", "no": 8, "answer": ans("180"), "explain": explain("180")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 9 and 10",
                        "instruction": "Complete the sentences below. Write ONE WORD ONLY for each answer.",
                        "lines": [
                            {"plain": True, "html": "9 To join the centre, you need to book an instructor's <Q n=\"9\">"},
                            {"plain": True, "html": "10 To book a trial session, speak to <Q n=\"10\"> (0458 95311)."},
                        ],
                        "questions": [
                            {"id": "L9", "no": 9, "answer": ans("assessment"), "explain": explain("assessment")},
                            {"id": "L10", "no": 10, "answer": ans("Kynchley"), "explain": explain("Kynchley")},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "ielts6_test1_audio2.mp3",
                "groups": [
                    {
                        "kind": "match",
                        "title": "Questions 11–16",
                        "instruction": "What change has been made to each part of the theatre? Write the correct letter, A–G.",
                        "boxTitle": "RIVENDEN CITY THEATRE",
                        "box": {
                            "A": "doubled in number",
                            "B": "given separate entrance",
                            "C": "reduced in number",
                            "D": "increased in size",
                            "E": "replaced",
                            "F": "strengthened",
                            "G": "temporarily closed",
                        },
                        "subTitle": "Part of the theatre",
                        "questions": [
                            {"id": "L11", "no": 11, "q": "box office", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L12", "no": 12, "q": "shop", "answer": ans("G"), "explain": explain("G")},
                            {"id": "L13", "no": 13, "q": "ordinary seats", "answer": ans("C"), "explain": explain("C")},
                            {"id": "L14", "no": 14, "q": "seats for wheelchair users", "answer": ans("A"), "explain": explain("A")},
                            {"id": "L15", "no": 15, "q": "lifts", "answer": ans("E"), "explain": explain("E")},
                            {"id": "L16", "no": 16, "q": "dressing rooms", "answer": ans("D"), "explain": explain("D")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 17–20",
                        "instruction": "Complete the table below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "tableTitle": "Royal Hunt of the Sun",
                        "cols": ["Item", "Details"],
                        "rows": [
                            ["Dates", "October 13th to <Q n=\"17\">"],
                            ["Starting time", "<Q n=\"18\">"],
                            ["Tickets available", "for <Q n=\"19\">"],
                            ["Price", "£<Q n=\"20\">"],
                        ],
                        "questions": [
                            {"id": "L17", "no": 17, "answer": ans("19th", "October 19th", "the 19th", "October the 19th"), "explain": explain("19th", "October 19th")},
                            {"id": "L18", "no": 18, "answer": ans("7", "7 pm", "7.00"), "explain": explain("7", "7 pm")},
                            {"id": "L19", "no": 19, "answer": ans("Monday and Thursday", "Monday, Thursday", "Monday Thursday"), "explain": explain("Monday and Thursday", "Monday, Thursday")},
                            {"id": "L20", "no": 20, "answer": ans("18"), "explain": explain("18")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "ielts6_test1_audio3.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Question 21",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L21", "no": 21, "q": "What is Brian going to do before the course starts?", "options": {"A": "attend a class", "B": "write a report", "C": "read a book"}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 22–25",
                        "instruction": "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.",
                        "cols": ["Service", "Details"],
                        "rows": [
                            ["Refectory", "inform them <Q n=\"22\"> about special dietary requirements"],
                            ["", "<Q n=\"23\">: long waiting list, apply now"],
                            ["Careers advice", "drop-in centre for information"],
                            ["Fitness centre", "reduced <Q n=\"24\"> for students"],
                            ["Library", "includes books, journals, equipment room containing audio-visual materials"],
                            ["Computers", "ask your <Q n=\"25\"> to arrange a password with the technical support team"],
                        ],
                        "questions": [
                            {"id": "L22", "no": 22, "answer": ans("in advance"), "explain": explain("in advance")},
                            {"id": "L23", "no": 23, "answer": ans("nursery"), "explain": explain("nursery")},
                            {"id": "L24", "no": 24, "answer": ans("annual fee"), "explain": explain("annual fee")},
                            {"id": "L25", "no": 25, "answer": ans("tutor"), "explain": explain("tutor")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 26–30",
                        "instruction": "Complete the summary below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Business Centre",
                        "lines": [
                            {"plain": True, "html": "The Business Resource Centre contains materials such as books and manuals to be used for training. It is possible to hire <Q n=\"26\"> and <Q n=\"27\">. There are materials for working on study skills (e.g. <Q n=\"28\">) and other subjects include finance and <Q n=\"29\">. <Q n=\"30\"> membership costs £50 per year."},
                        ],
                        "questions": [
                            {"id": "L26", "no": 26, "answer": ans("laptops", "printers"), "explain": "答案：laptops 与 printers，顺序不限。"},
                            {"id": "L27", "no": 27, "answer": ans("printers", "laptops"), "explain": "答案：laptops 与 printers，顺序不限。"},
                            {"id": "L28", "no": 28, "answer": ans("report writing"), "explain": explain("report writing")},
                            {"id": "L29", "no": 29, "answer": ans("marketing"), "explain": explain("marketing")},
                            {"id": "L30", "no": 30, "answer": ans("Individual"), "explain": explain("Individual")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "ielts6_test1_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Question 31",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L31", "no": 31, "q": "The speaker says the main topic of the lecture is", "options": {"A": "the history of monosodium glutamate.", "B": "the way monosodium glutamate works.", "C": "where monosodium glutamate is used."}, "answer": ans("B"), "explain": explain("B")},
                        ],
                    },
                    {
                        "kind": "mcq",
                        "title": "Questions 32 and 33",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L32", "no": 32, "q": "In 1908, scientists in Japan", "options": {"A": "made monosodium glutamate.", "B": "began using kombu.", "C": "identified glutamate."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L33", "no": 33, "q": "What change occurred in the manufacture of glutamate in 1956?", "options": {"A": "It began to be manufactured on a large scale.", "B": "The Japanese began extracting it from natural sources.", "C": "It became much more expensive to produce."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 34–40",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Monosodium Glutamate (MSG)",
                        "lines": [
                            {"plain": True, "html": "MSG contains: glutamate (78.2%); sodium (12.2%); <Q n=\"34\"> (9.6%)"},
                            {"plain": True, "html": "Glutamate is found in foods that contain protein such as <Q n=\"35\"> and <Q n=\"36\">"},
                            {"plain": True, "html": "In 1908 Kikunae Ikeda discovered a <Q n=\"37\">"},
                            {"plain": True, "html": "Our ability to detect glutamate makes sense because it is so <Q n=\"38\"> naturally."},
                            {"h": "John Prescott suggests that:"},
                            {"bullet": True, "html": "sweetness tells us that a food contains carbohydrates."},
                            {"bullet": True, "html": "<Q n=\"39\"> tells us that a food contains toxins."},
                            {"bullet": True, "html": "sourness tells us that a food is spoiled."},
                            {"bullet": True, "html": "saltiness tells us that a food contains <Q n=\"40\">"},
                        ],
                        "questions": [
                            {"id": "L34", "no": 34, "answer": ans("water"), "explain": explain("water")},
                            {"id": "L35", "no": 35, "answer": ans("meat", "cheese"), "explain": "答案：meat 与 cheese，顺序不限。"},
                            {"id": "L36", "no": 36, "answer": ans("cheese", "meat"), "explain": "答案：meat 与 cheese，顺序不限。"},
                            {"id": "L37", "no": 37, "answer": ans("new taste", "5th taste", "fifth taste"), "explain": explain("new taste", "5th taste", "fifth taste")},
                            {"id": "L38", "no": 38, "answer": ans("common"), "explain": explain("common")},
                            {"id": "L39", "no": 39, "answer": ans("bitterness"), "explain": explain("bitterness")},
                            {"id": "L40", "no": 40, "answer": ans("minerals"), "explain": explain("minerals")},
                        ],
                    },
                ],
            },
        ],
    }


def reading_test() -> dict:
    passages = reading_passages()
    passages[0]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 1–7",
            "instruction": "Reading Passage 1 has six paragraphs, A–F. Which paragraph contains the following information? NB You may use any letter more than once.",
            "boxTitle": "Paragraphs",
            "box": {
                "A": "Paragraph A",
                "B": "Paragraph B",
                "C": "Paragraph C",
                "D": "Paragraph D",
                "E": "Paragraph E",
                "F": "Paragraph F",
            },
            "questions": [
                {"id": "Q1", "no": 1, "q": "a reference to the exchange of expertise between different sports", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q2", "no": 2, "q": "an explanation of how visual imaging is employed in investigations", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q3", "no": 3, "q": "a reason for narrowing the scope of research activity", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q4", "no": 4, "q": "how some AIS ideas have been reproduced", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q5", "no": 5, "q": "how obstacles to optimum achievement can be investigated", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q6", "no": 6, "q": "an overview of the funded support of athletes", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q7", "no": 7, "q": "how performance requirements are calculated before an event", "answer": ans("E"), "explain": explain("E")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 8–11",
            "instruction": "Classify the following techniques according to whether the writer states they A are currently exclusively used by Australians, B will be used in the future by Australians, or C are currently used by both Australians and their rivals.",
            "boxTitle": "Techniques",
            "box": {
                "A": "currently exclusively used by Australians",
                "B": "will be used in the future by Australians",
                "C": "currently used by both Australians and their rivals",
            },
            "questions": [
                {"id": "Q8", "no": 8, "q": "cameras", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q9", "no": 9, "q": "sensors", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q10", "no": 10, "q": "protein tests", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q11", "no": 11, "q": "altitude tents", "answer": ans("C"), "explain": explain("C")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 12 and 13",
            "instruction": "Answer the questions below. Choose NO MORE THAN THREE WORDS AND/OR A NUMBER from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "12 What is produced to help an athlete plan their performance in an event? <Q n=\"12\">"},
                {"plain": True, "html": "13 By how much did some cyclists' performance improve at the 1996 Olympic Games? <Q n=\"13\">"},
            ],
            "questions": [
                {"id": "Q12", "no": 12, "answer": ans("competition model", "a competition model"), "explain": explain("competition model", "a competition model")},
                {"id": "Q13", "no": 13, "answer": ans("2%", "2 per cent", "2 percent", "by 2%", "by 2 per cent"), "explain": explain("2%", "2 per cent", "by 2%")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–17",
            "instruction": "Reading Passage 2 has nine paragraphs, A–I. Which paragraph contains the following information?",
            "boxTitle": "Paragraphs",
            "box": {
                "A": "Paragraph A",
                "B": "Paragraph B",
                "C": "Paragraph C",
                "D": "Paragraph D",
                "E": "Paragraph E",
                "F": "Paragraph F",
                "G": "Paragraph G",
                "H": "Paragraph H",
                "I": "Paragraph I",
            },
            "questions": [
                {"id": "Q14", "no": 14, "q": "a suggestion for improving trade in the future", "answer": ans("I"), "explain": explain("I")},
                {"id": "Q15", "no": 15, "q": "the effects of the introduction of electronic delivery", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q16", "no": 16, "q": "the similar cost involved in transporting a product from abroad or from a local supplier", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q17", "no": 17, "q": "the weakening relationship between the value of goods and the cost of their delivery", "answer": ans("D"), "explain": explain("D")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 18–22",
            "instruction": "Do the following statements agree with the information given in Reading Passage 2?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q18", "no": 18, "q": "International trade is increasing at a greater rate than the world economy.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q19", "no": 19, "q": "Cheap labour guarantees effective trade conditions.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q20", "no": 20, "q": "Japan imports more meat and steel than France.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q21", "no": 21, "q": "Most countries continue to prefer to trade with nearby nations.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q22", "no": 22, "q": "Small computer components are manufactured in Germany.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 23–26",
            "instruction": "Complete the summary using the list of words, A–K.",
            "boxTitle": "List of words",
            "box": {
                "A": "tariffs",
                "B": "components",
                "C": "container ships",
                "D": "output",
                "E": "employees",
                "F": "insurance costs",
                "G": "trade",
                "H": "freight",
                "I": "fares",
                "J": "software",
                "K": "international standards",
            },
            "subTitle": "THE TRANSPORT REVOLUTION",
            "questions": [
                {"id": "Q23", "no": 23, "q": "Modern cargo-handling methods have had a significant effect on ___", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q24", "no": 24, "q": "Manufacturers of computers are able to import ___ from overseas", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q25", "no": 25, "q": "The introduction of ___ has meant that bulk cargo can be safely moved", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q26", "no": 26, "q": "Governments need to reduce ___ to free up the domestic cargo sector", "answer": ans("A"), "explain": explain("A")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 27–32",
            "instruction": "Reading Passage 3 has seven paragraphs, A–G. Choose the correct heading for paragraphs B–G. Example: Paragraph A = viii.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "The reaction of the Inuit community to climate change",
                "ii": "Understanding of climate change remains limited",
                "iii": "Alternative sources of essential supplies",
                "iv": "Respect for Inuit opinion grows",
                "v": "A healthier choice of food",
                "vi": "A difficult landscape",
                "vii": "Negative effects on well-being",
                "viii": "Alarm caused by unprecedented events in the Arctic",
                "ix": "The benefits of an easier existence",
            },
            "questions": [
                {"id": "Q27", "no": 27, "q": "Paragraph B", "answer": ans("i"), "explain": explain("i")},
                {"id": "Q28", "no": 28, "q": "Paragraph C", "answer": ans("vi"), "explain": explain("vi")},
                {"id": "Q29", "no": 29, "q": "Paragraph D", "answer": ans("iii"), "explain": explain("iii")},
                {"id": "Q30", "no": 30, "q": "Paragraph E", "answer": ans("vii"), "explain": explain("vii")},
                {"id": "Q31", "no": 31, "q": "Paragraph F", "answer": ans("iv"), "explain": explain("iv")},
                {"id": "Q32", "no": 32, "q": "Paragraph G", "answer": ans("ii"), "explain": explain("ii")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 33–40",
            "instruction": "Complete the summary of paragraphs C and D. Choose NO MORE THAN TWO WORDS from paragraphs C and D for each answer.",
            "noteTitle": "The Canadian Arctic",
            "lines": [
                {
                    "plain": True,
                    "html": "If you visit the Canadian Arctic, you immediately appreciate the problems faced by people for whom this is home. It would clearly be impossible for the people to engage in <Q n=\"33\"> as a means of supporting themselves. For thousands of years they have had to rely on catching <Q n=\"34\"> and <Q n=\"35\"> as a means of sustenance. The harsh surroundings saw many who tried to settle there pushed to their limits, although some were successful. The <Q n=\"36\"> people were an example of the latter and for them the environment did not prove unmanageable. For the present inhabitants, life continues to be a struggle. The territory of Nunavut consists of little more than ice, rock and a few <Q n=\"37\">. In recent years, many of them have been obliged to give up their <Q n=\"38\"> lifestyle, but they continue to depend mainly on <Q n=\"39\"> for their food and clothes. <Q n=\"40\"> produce is particularly expensive.",
                }
            ],
            "questions": [
                {"id": "Q33", "no": 33, "answer": ans("farming"), "explain": explain("farming")},
                {"id": "Q34", "no": 34, "answer": ans("sea mammals", "fish"), "explain": "答案：sea mammals 与 fish，顺序不限。"},
                {"id": "Q35", "no": 35, "answer": ans("fish", "sea mammals"), "explain": "答案：sea mammals 与 fish，顺序不限。"},
                {"id": "Q36", "no": 36, "answer": ans("Thule"), "explain": explain("Thule")},
                {"id": "Q37", "no": 37, "answer": ans("islands"), "explain": explain("islands")},
                {"id": "Q38", "no": 38, "answer": ans("nomadic"), "explain": explain("nomadic")},
                {"id": "Q39", "no": 39, "answer": ans("nature"), "explain": explain("nature")},
                {"id": "Q40", "no": 40, "answer": ans("Imported"), "explain": explain("Imported")},
            ],
        },
    ]
    return {"meta": {"volume": 6, "testNo": 1}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The graph and table below give information about water use worldwide "
                "and water consumption in two different countries.<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Global water use and consumption in Brazil and Congo (2000)",
                    "image": "cambridge-6-test-1-water-use.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Today, the high sales of popular consumer goods reflect "
                "the power of advertising and not the real needs of the society in which they are sold.<br><br>"
                "To what extent do you agree or disagree?<br><br>"
                "Give reasons for your answer and include any relevant examples from your own "
                "knowledge or experience.<br>"
                "<strong>Write at least 250 words.</strong>"
            )
        },
    }


def copy_assets() -> None:
    for i, src in enumerate(AUDIO_SRC, start=1):
        if not src.exists():
            raise FileNotFoundError(src)
        dst = LISTENING_DIR / f"ielts6_test1_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    for src, name in (
        (SPORTS_CLUB_SRC, "cambridge-6-test-1-sports-club.png"),
        (MEMBERSHIP_SRC, "cambridge-6-test-1-membership.png"),
    ):
        dst = LISTENING_DIR / name
        shutil.copy2(src, dst)
        print(f"copied image -> {dst.relative_to(ROOT)}")
    chart_dst = WRITING_DIR / "cambridge-6-test-1-water-use.png"
    shutil.copy2(WATER_USE_SRC, chart_dst)
    print(f"copied image -> {chart_dst.relative_to(ROOT)}")


def write_page(template: Path, out: Path, test: dict, patch_meta) -> None:
    html = template.read_text(encoding="utf-8")
    html = replace_test(html, test)
    html = patch_meta(html)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")


def run_checks(paths: list[Path]) -> int:
    verify = ROOT / "scripts/verify_cambridge_mock_pages.py"
    cmd = [sys.executable, str(ROOT / "scripts/build_manifest.py")]
    print("running:", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=ROOT)
    cmd = [sys.executable, str(verify), *[str(p) for p in paths]]
    print("running:", " ".join(cmd))
    return subprocess.run(cmd, cwd=ROOT).returncode


def main() -> int:
    copy_assets()
    write_page(TPL_LISTENING, OUT_LISTENING, listening_test(), patch_listening_meta)
    write_page(TPL_READING, OUT_READING, reading_test(), patch_reading_meta)
    write_page(TPL_WRITING, OUT_WRITING, writing_test(), patch_writing_meta)
    return run_checks([OUT_LISTENING, OUT_READING, OUT_WRITING])


if __name__ == "__main__":
    raise SystemExit(main())
