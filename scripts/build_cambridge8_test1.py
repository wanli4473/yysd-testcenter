#!/usr/bin/env python3
"""Generate Cambridge IELTS 8 Test 1 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑8T1.docx")
ESCAPEMENT_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_15.20.14-d9853908-0004-47ea-a001-ed48a15163e1.png"
)
LAND_DEGRADATION_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_15.20.22-90ce9b86-d8c0-4804-9642-8f688d802865.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test1 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test1 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test1 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test1 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-8-test-1.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-8-test-1-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-8-test-1-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-9-test-1.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-9-test-3-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-9-test-3-writing.html"

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


def patch_listening_meta(html: str) -> str:
    reps = [
        ("剑桥雅思9 Test 1 听力", "剑桥雅思8 Test 1 听力"),
        ("剑桥雅思9 · Test 1（听力）", "剑桥雅思8 · Test 1（听力）"),
        ("剑桥雅思9 Test 1 听力：", "剑桥雅思8 Test 1 听力："),
        ('<div class="num">9</div>', '<div class="num">8</div>'),
        ("剑桥雅思 9 · Test 1", "剑桥雅思 8 · Test 1"),
        ("剑桥雅思9 · Test 1", "剑桥雅思8 · Test 1"),
        ("剑桥雅思9 Test 1 听力（官方原题 + 官方答案）", "剑桥雅思8 Test 1 听力（官方原题 + 官方答案）"),
        ("ielts9_test1", "cam8_test1"),
        ("cam9_test1", "cam8_test1"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思9 Test 3 阅读", "剑桥雅思8 Test 1 阅读"),
        ("剑桥雅思9 · Test 3（阅读）", "剑桥雅思8 · Test 1（阅读）"),
        ("剑桥雅思9 Test 3 学术类阅读", "剑桥雅思8 Test 1 学术类阅读"),
        ('<div class="num">9</div>', '<div class="num">8</div>'),
        ("剑桥雅思 9 · Test 3", "剑桥雅思 8 · Test 1"),
        ("剑桥雅思9 · Test 3", "剑桥雅思8 · Test 1"),
        ("剑桥雅思9 Test 3 阅读（官方原题 + 官方答案）", "剑桥雅思8 Test 1 阅读（官方原题 + 官方答案）"),
        ("Test 3", "Test 1"),
        ("test-3", "test-1"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    html = html.replace(
        "function readAns(q){ if(q.id==='Q36'){"
        "const a=(document.getElementById('Q36a')||{}).value||'';"
        "const b=(document.getElementById('Q36b')||{}).value||'';"
        "return [a,b].filter(Boolean).join(' ').trim(); }"
        "const el=document.getElementById(q.id);",
        "function readAns(q){ const el=document.getElementById(q.id);",
    )
    return html


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思9 Test 3 写作", "剑桥雅思8 Test 1 写作"),
        ("剑桥雅思9 · Test 3（写作）", "剑桥雅思8 · Test 1（写作）"),
        ("剑桥雅思9 Test 3 学术类写作", "剑桥雅思8 Test 1 学术类写作"),
        (
            "Task 1 Yemen/Italy population pie charts + Task 2 sports facilities and public health essay",
            "Task 1 land degradation pie chart + Task 2 parents vs school citizenship essay",
        ),
        ('<div class="num">9</div>', '<div class="num">8</div>'),
        ("剑桥雅思 9 · Test 3", "剑桥雅思 8 · Test 1"),
        ("剑桥雅思9 · Test 3", "剑桥雅思8 · Test 1"),
        ("剑桥雅思9 Test 3 写作（官方真题）", "剑桥雅思8 Test 1 写作（官方真题）"),
        ("cambridge-9-test-3-writing-draft", "cambridge-8-test-1-writing-draft"),
        ("【剑桥雅思9 · Test 3 写作】", "【剑桥雅思8 · Test 1 写作】"),
        ("Test 3", "Test 1"),
        ("test-3", "test-1"),
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


def reading_passages_from_docx() -> list[dict]:
    paras = extract_docx_paras(DOCX)
    starts = [i for i, p in enumerate(paras) if p.startswith("READING PASSAGE")]
    chunks: list[list[str]] = []
    for si, start in enumerate(starts):
        end = starts[si + 1] if si + 1 < len(starts) else len(paras)
        chunk = paras[start:end]
        qidx = next(
            (i for i, p in enumerate(chunk) if p.startswith("Questions ") or p.startswith("Question ")),
            len(chunk),
        )
        chunks.append(chunk[:qidx])

    p1, p2, p3 = chunks
    return [
        {
            "id": 1,
            "passage": {
                "title": p1[2],
                "byline": p1[1],
                "paras": [labeled_para(x) for x in p1[3:]],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": "Air traffic control in the USA",
                "byline": p2[1],
                "paras": [labeled_para(x) for x in p2[2:]],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": "Can human beings communicate by thought alone?",
                "byline": p3[1],
                "paras": p3[2:],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 8, "testNo": 1},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "cam8_test1_audio1.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 1 and 2",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L1",
                                "no": 1,
                                "q": "In the lobby of the library George saw",
                                "options": {
                                    "A": "a group playing music.",
                                    "B": "a display of instruments.",
                                    "C": "a video about the festival.",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                            {
                                "id": "L2",
                                "no": 2,
                                "q": "George wants to sit at the back so they can",
                                "options": {
                                    "A": "see well.",
                                    "B": "hear clearly.",
                                    "C": "pay less.",
                                },
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 3–10",
                        "instruction": "Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "SUMMER MUSIC FESTIVAL BOOKING FORM",
                        "lines": [
                            {"plain": True, "html": "NAME: George O'Neill"},
                            {"plain": True, "html": "ADDRESS: <Q n=\"3\"> Westsea"},
                            {"plain": True, "html": "POSTCODE: <Q n=\"4\">"},
                            {"plain": True, "html": "TELEPHONE: <Q n=\"5\">"},
                            {"plain": True, "html": "<strong>Date:</strong> 5 June &nbsp;|&nbsp; <strong>Event:</strong> Instrumental group – Guitarrini"},
                            {"plain": True, "html": "Price per ticket: £7.50 &nbsp;|&nbsp; No. of tickets: 2"},
                            {"plain": True, "html": "<strong>Date:</strong> 17 June &nbsp;|&nbsp; <strong>Event:</strong> Singer (price includes <Q n=\"6\"> in the garden)"},
                            {"plain": True, "html": "Price per ticket: £6 &nbsp;|&nbsp; No. of tickets: 2"},
                            {"plain": True, "html": "<strong>Date:</strong> 22 June &nbsp;|&nbsp; <strong>Event:</strong> <Q n=\"7\"> (Anna Ventura)"},
                            {"plain": True, "html": "Price per ticket: £7.00 &nbsp;|&nbsp; No. of tickets: 1"},
                            {"plain": True, "html": "<strong>Date:</strong> 23 June &nbsp;|&nbsp; <strong>Event:</strong> Spanish Dance &amp; Guitar Concert"},
                            {"plain": True, "html": "Price per ticket: £<Q n=\"8\"> &nbsp;|&nbsp; No. of tickets: <Q n=\"9\">"},
                            {"plain": True, "html": "NB Children / Students / Senior Citizens have <Q n=\"10\"> discount on all tickets."},
                        ],
                        "questions": [
                            {"id": "L3", "no": 3, "answer": ans("48 North Avenue"), "explain": explain("48 North Avenue")},
                            {"id": "L4", "no": 4, "answer": ans("WS6 2YH"), "explain": explain("WS6 2YH")},
                            {"id": "L5", "no": 5, "answer": ans("01674 553242"), "explain": explain("01674 553242")},
                            {"id": "L6", "no": 6, "answer": ans("drink", "drinks", "refreshment", "refreshments", "free drink", "free drinks"), "explain": explain("drink", "refreshment")},
                            {"id": "L7", "no": 7, "answer": ans("pianist", "piano player", "the pianist", "a pianist"), "explain": explain("pianist", "piano player")},
                            {"id": "L8", "no": 8, "answer": ans("10.50"), "explain": explain("10.50")},
                            {"id": "L9", "no": 9, "answer": ans("4"), "explain": explain("4")},
                            {"id": "L10", "no": 10, "answer": ans("50%"), "explain": explain("50%")},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "cam8_test1_audio2.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 11–15",
                        "instruction": "Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "The Dinosaur Museum",
                        "lines": [
                            {"plain": True, "html": "The museum closes at <Q n=\"11\"> p.m. on Mondays."},
                            {"plain": True, "html": "The museum is not open on <Q n=\"12\">"},
                            {"plain": True, "html": "School groups are met by tour guides in the <Q n=\"13\">"},
                            {"plain": True, "html": "The whole visit takes 90 minutes, including <Q n=\"14\"> minutes for the guided tour."},
                            {"plain": True, "html": "There are <Q n=\"15\"> behind the museum where students can have lunch."},
                        ],
                        "questions": [
                            {"id": "L11", "no": 11, "answer": ans("1.30"), "explain": explain("1.30")},
                            {"id": "L12", "no": 12, "answer": ans("25 December", "Christmas Day"), "explain": explain("25 December", "Christmas Day")},
                            {"id": "L13", "no": 13, "answer": ans("car-park", "car park", "parking lot"), "explain": explain("car-park", "parking lot")},
                            {"id": "L14", "no": 14, "answer": ans("45"), "explain": explain("45")},
                            {"id": "L15", "no": 15, "answer": ans("tables", "some tables"), "explain": explain("tables", "some tables")},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 16–18",
                        "instruction": "Choose THREE letters, A–G. Which THREE things can students have with them in the museum?",
                        "box": {
                            "A": "food",
                            "B": "water",
                            "C": "cameras",
                            "D": "books",
                            "E": "bags",
                            "F": "pens",
                            "G": "worksheets",
                        },
                        "answerSet": ["C", "F", "G"],
                        "questions": [
                            {"id": "L16", "no": 16, "explain": "答案：C、F、G，顺序不限。"},
                            {"id": "L17", "no": 17, "explain": "答案：C、F、G，顺序不限。"},
                            {"id": "L18", "no": 18, "explain": "答案：C、F、G，顺序不限。"},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 19 and 20",
                        "instruction": "Choose TWO letters, A–E. Which TWO activities can students do after the tour at present?",
                        "box": {
                            "A": "build model dinosaurs",
                            "B": "watch films",
                            "C": "draw dinosaurs",
                            "D": "find dinosaur eggs",
                            "E": "play computer games",
                        },
                        "answerSet": ["B", "E"],
                        "questions": [
                            {"id": "L19", "no": 19, "explain": "答案：B 与 E，顺序不限。"},
                            {"id": "L20", "no": 20, "explain": "答案：B 与 E，顺序不限。"},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "cam8_test1_audio3.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 21–24",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L21", "no": 21, "q": "The tutor thinks that Sandra's proposal", "options": {"A": "should be re-ordered in some parts.", "B": "needs a contents page.", "C": "ought to include more information."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L22", "no": 22, "q": "The proposal would be easier to follow if Sandra", "options": {"A": "inserted subheadings.", "B": "used more paragraphs.", "C": "shortened her sentences."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L23", "no": 23, "q": "What was the problem with the formatting on Sandra's proposal?", "options": {"A": "Separate points were not clearly identified.", "B": "The headings were not always clear.", "C": "Page numbering was not used in an appropriate way."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L24", "no": 24, "q": "Sandra became interested in visiting the Navajo National Park through", "options": {"A": "articles she read.", "B": "movies she saw as a child.", "C": "photographs she found on the internet."}, "answer": ans("B"), "explain": explain("B")},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 25–27",
                        "instruction": "Choose THREE letters, A–G. Which THREE topics does Sandra agree to include in the proposal?",
                        "box": {
                            "A": "climate change",
                            "B": "field trip activities",
                            "C": "geographical features",
                            "D": "impact of tourism",
                            "E": "myths and legends",
                            "F": "plant and animal life",
                            "G": "social history",
                        },
                        "answerSet": ["B", "C", "F"],
                        "questions": [
                            {"id": "L25", "no": 25, "explain": "答案：B、C、F，顺序不限。"},
                            {"id": "L26", "no": 26, "explain": "答案：B、C、F，顺序不限。"},
                            {"id": "L27", "no": 27, "explain": "答案：B、C、F，顺序不限。"},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 28–30",
                        "instruction": "Complete the sentences below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "lines": [
                            {"plain": True, "html": "The tribal park covers <Q n=\"28\"> hectares."},
                            {"plain": True, "html": "Sandra suggests that they share the <Q n=\"29\"> for transport."},
                            {"plain": True, "html": "She says they could also explore the local <Q n=\"30\">"},
                        ],
                        "questions": [
                            {"id": "L28", "no": 28, "answer": ans("12000", "12,000"), "explain": explain("12000", "12,000")},
                            {"id": "L29", "no": 29, "answer": ans("horses"), "explain": explain("horses")},
                            {"id": "L30", "no": 30, "answer": ans("caves"), "explain": explain("caves")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "cam8_test1_audio4.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 31–40",
                        "instruction": "Complete the notes below. Write ONE WORD ONLY for each answer.",
                        "noteTitle": "Geography",
                        "lines": [
                            {"plain": True, "html": "<strong>Studying geography helps us to understand:</strong>"},
                            {"bullet": True, "html": "the effects of different processes on the <Q n=\"31\"> of the Earth"},
                            {"bullet": True, "html": "the dynamic between <Q n=\"32\"> and population"},
                            {"plain": True, "html": "<strong>Two main branches of study:</strong>"},
                            {"bullet": True, "html": "physical features"},
                            {"bullet": True, "html": "human lifestyles and their <Q n=\"33\">"},
                            {"plain": True, "html": "Specific study areas: biophysical, topographic, political, social, economic, historical and <Q n=\"34\"> geography, and also cartography"},
                            {"plain": True, "html": "<strong>Key point:</strong> geography helps us to understand our surroundings and the associated <Q n=\"35\">"},
                            {"plain": True, "html": "<strong>What do geographers do?</strong>"},
                            {"bullet": True, "html": "find data – e.g. conduct censuses, collect information in the form of <Q n=\"36\"> using computer and satellite technology"},
                            {"bullet": True, "html": "analyse data – identify <Q n=\"37\"> e.g. cause and effect"},
                            {"plain": True, "html": "<strong>publish findings in form of:</strong>"},
                            {"bullet": True, "html": "a) maps – easy to carry; can show physical features of large and small areas; BUT a two-dimensional map will always have some <Q n=\"38\">"},
                            {"bullet": True, "html": "b) aerial photos – can show vegetation problems, <Q n=\"39\"> density, ocean floor etc."},
                            {"bullet": True, "html": "c) Landsat pictures sent to receiving stations – used for monitoring <Q n=\"40\"> conditions etc."},
                        ],
                        "questions": [
                            {"id": "L31", "no": 31, "answer": ans("surface"), "explain": explain("surface")},
                            {"id": "L32", "no": 32, "answer": ans("environment"), "explain": explain("environment")},
                            {"id": "L33", "no": 33, "answer": ans("impact", "impacts", "effect", "effects"), "explain": explain("impact", "effect")},
                            {"id": "L34", "no": 34, "answer": ans("urban"), "explain": explain("urban")},
                            {"id": "L35", "no": 35, "answer": ans("problems"), "explain": explain("problems")},
                            {"id": "L36", "no": 36, "answer": ans("images"), "explain": explain("images")},
                            {"id": "L37", "no": 37, "answer": ans("patterns"), "explain": explain("patterns")},
                            {"id": "L38", "no": 38, "answer": ans("disruption", "disruptions"), "explain": explain("disruption", "disruptions")},
                            {"id": "L39", "no": 39, "answer": ans("traffic"), "explain": explain("traffic")},
                            {"id": "L40", "no": 40, "answer": ans("weather"), "explain": explain("weather")},
                        ],
                    }
                ],
            },
        ],
    }


def reading_test() -> dict:
    passages = reading_passages_from_docx()
    passages[0]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 1–4",
            "noBox": True,
            "instruction": "Reading Passage 1 has eight paragraphs, A–H. Which paragraph contains the following information?",
            "box": {k: "" for k in "ABCDEFGH"},
            "questions": [
                {"id": "Q1", "no": 1, "q": "a description of an early timekeeping invention affected by cold temperatures", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q2", "no": 2, "q": "an explanation of the importance of geography in the development of the calendar in farming communities", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q3", "no": 3, "q": "a description of the origins of the pendulum clock", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q4", "no": 4, "q": "details of the simultaneous efforts of different societies to calculate time using uniform hours", "answer": ans("E"), "explain": explain("E")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 5–8",
            "instruction": "Look at the following events (Questions 5–8) and the list of nationalities below. Match each event with the correct nationality, A–F.",
            "boxTitle": "List of Nationalities",
            "box": {
                "A": "Babylonians",
                "B": "Egyptians",
                "C": "Greeks",
                "D": "English",
                "E": "Germans",
                "F": "French",
            },
            "questions": [
                {"id": "Q5", "no": 5, "q": "They devised a civil calendar in which the months were equal in length.", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q6", "no": 6, "q": "They divided the day into two equal halves.", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q7", "no": 7, "q": "They developed a new cabinet shape for a type of timekeeper.", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q8", "no": 8, "q": "They created a calendar to organise public events and work schedules.", "answer": ans("A"), "explain": explain("A")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 9–13",
            "instruction": "Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "noteTitle": "How the 1670 lever-based device worked",
            "image": "cambridge-8-test-1-escapement.png",
            "lines": [
                {"plain": True, "html": "escapement (resembling a <Q n=\"9\">)"},
                {"plain": True, "html": "the <Q n=\"10\">"},
                {"plain": True, "html": "the <Q n=\"11\">"},
                {"plain": True, "html": "a <Q n=\"12\"> which beats each <Q n=\"13\">"},
            ],
            "questions": [
                {"id": "Q9", "no": 9, "answer": ans("anchor", "ship's anchor", "ships anchor", "an anchor", "the anchor"), "explain": explain("anchor")},
                {"id": "Q10", "no": 10, "answer": ans("wheel", "escape wheel"), "explain": explain("wheel", "escape wheel")},
                {"id": "Q11", "no": 11, "answer": ans("tooth"), "explain": explain("tooth")},
                {"id": "Q12", "no": 12, "answer": ans("pendulum", "long pendulum"), "explain": explain("pendulum", "long pendulum")},
                {"id": "Q13", "no": 13, "answer": ans("second"), "explain": explain("second")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–19",
            "instruction": "Reading Passage 2 has seven paragraphs, A–G. Choose the correct heading for paragraphs A and C–G from the list below. Example: Paragraph B = x.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "Disobeying FAA regulations",
                "ii": "Aviation disaster prompts action",
                "iii": "Two coincidental developments",
                "iv": "Setting altitude zones",
                "v": "An oversimplified view",
                "vi": "Controlling pilots' licences",
                "vii": "Defining airspace categories",
                "viii": "Setting rules to weather conditions",
                "ix": "Taking off safely",
                "x": "First steps towards ATC",
            },
            "questions": [
                {"id": "Q14", "no": 14, "q": "Paragraph A", "answer": ans("ii"), "explain": explain("ii")},
                {"id": "Q15", "no": 15, "q": "Paragraph C", "answer": ans("iii"), "explain": explain("iii")},
                {"id": "Q16", "no": 16, "q": "Paragraph D", "answer": ans("v"), "explain": explain("v")},
                {"id": "Q17", "no": 17, "q": "Paragraph E", "answer": ans("iv"), "explain": explain("iv")},
                {"id": "Q18", "no": 18, "q": "Paragraph F", "answer": ans("viii"), "explain": explain("viii")},
                {"id": "Q19", "no": 19, "q": "Paragraph G", "answer": ans("vii"), "explain": explain("vii")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 20–26",
            "instruction": "Do the following statements agree with the information given in Reading Passage 2?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q20", "no": 20, "q": "The FAA was created as a result of the introduction of the jet engine.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q21", "no": 21, "q": "Air Traffic Control started after the Grand Canyon crash in 1956.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q22", "no": 22, "q": "Beacons and flashing lights are still used by ATC today.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q23", "no": 23, "q": "Some improvements were made in radio communication during World War II.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q24", "no": 24, "q": "Class F airspace is airspace which is below 365m and not near airports.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q25", "no": 25, "q": "All aircraft in Class E airspace must use IFR.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q26", "no": 26, "q": "A pilot entering Class C airspace is flying over an average-sized city.", "answer": ans("TRUE"), "explain": explain("TRUE")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 27–30",
            "instruction": "Complete each sentence with the correct ending, A–G, below.",
            "boxTitle": "Endings",
            "box": {
                "A": "the discovery of a mechanism for telepathy.",
                "B": "the need to create a suitable environment for telepathy.",
                "C": "their claims of a high success rate.",
                "D": "a solution to the problem posed by random guessing.",
                "E": "the significance of the ganzfeld experiments.",
                "F": "a more careful selection of subjects.",
                "G": "a need to keep altering conditions.",
            },
            "subTitle": "Sentence beginnings",
            "questions": [
                {"id": "Q27", "no": 27, "q": "Researchers with differing attitudes towards telepathy agree on", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q28", "no": 28, "q": "Reports of experiences during meditation indicated", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q29", "no": 29, "q": "Attitudes to parapsychology would alter drastically with", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q30", "no": 30, "q": "Recent autoganzfeld trials suggest that success rates will improve with", "answer": ans("F"), "explain": explain("F")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 31–40",
            "instruction": "Complete the table below. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
            "noteTitle": "Telepathy Experiments",
            "lines": [
                {"h": "Ganzfeld studies 1982"},
                {"plain": True, "html": "<strong>Description:</strong> Involved a person acting as a <Q n=\"31\">, who picked out one <Q n=\"32\"> from a random selection of four, and a <Q n=\"33\">, who then tried to identify it."},
                {"plain": True, "html": "<strong>Result:</strong> Hit-rates were higher than with random guessing."},
                {"plain": True, "html": "<strong>Flaw:</strong> Positive results could be produced by factors such as <Q n=\"34\"> or <Q n=\"35\">"},
                {"h": "Autoganzfeld studies 1987"},
                {"plain": True, "html": "<strong>Description:</strong> <Q n=\"36\"> were used for key tasks to limit the amount of <Q n=\"37\"> in carrying out the tests."},
                {"plain": True, "html": "<strong>Result:</strong> The results were then subjected to a <Q n=\"38\">"},
                {"plain": True, "html": "<strong>Flaw:</strong> The <Q n=\"39\"> between different test results was put down to the fact that sample groups were not <Q n=\"40\"> (as with most ganzfeld studies)."},
            ],
            "questions": [
                {"id": "Q31", "no": 31, "answer": ans("sender"), "explain": explain("sender")},
                {"id": "Q32", "no": 32, "answer": ans("picture", "image"), "explain": explain("picture", "image")},
                {"id": "Q33", "no": 33, "answer": ans("receiver"), "explain": explain("receiver")},
                {"id": "Q34", "no": 34, "answer": ans("sensory leakage"), "explain": explain("sensory leakage")},
                {"id": "Q35", "no": 35, "answer": ans("fraud", "outright fraud"), "explain": explain("fraud", "outright fraud")},
                {"id": "Q36", "no": 36, "answer": ans("computers"), "explain": explain("computers")},
                {"id": "Q37", "no": 37, "answer": ans("human involvement"), "explain": explain("human involvement")},
                {"id": "Q38", "no": 38, "answer": ans("meta-analysis"), "explain": explain("meta-analysis")},
                {"id": "Q39", "no": 39, "answer": ans("lack of consistency"), "explain": explain("lack of consistency")},
                {"id": "Q40", "no": 40, "answer": ans("big enough", "large enough"), "explain": explain("big enough", "large enough")},
            ],
        },
    ]
    return {"meta": {"volume": 8, "testNo": 1}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The pie chart below shows the main reasons why agricultural land becomes less productive. "
                "The table shows how these causes affected three regions in the 1990s.<br><br>"
                "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Causes of worldwide land degradation and regional breakdown",
                    "image": "cambridge-8-test-1-land-degradation.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Some people think that parents should teach children how to be good members of society. "
                "Others, however, believe that school is the place to learn this.<br><br>"
                "Discuss both these views and give your own opinion.<br><br>"
                "Give reasons for your answer and include any relevant examples from your own knowledge or experience.<br>"
                "<strong>Write at least 250 words.</strong>"
            )
        },
    }


def copy_assets() -> None:
    for i, src in enumerate(AUDIO_SRC, start=1):
        if not src.exists():
            raise FileNotFoundError(src)
        dst = LISTENING_DIR / f"cam8_test1_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    if not ESCAPEMENT_SRC.exists():
        raise FileNotFoundError(ESCAPEMENT_SRC)
    escapement_dst = READING_DIR / "cambridge-8-test-1-escapement.png"
    shutil.copy2(ESCAPEMENT_SRC, escapement_dst)
    print(f"copied image -> {escapement_dst.relative_to(ROOT)}")
    if not LAND_DEGRADATION_SRC.exists():
        raise FileNotFoundError(LAND_DEGRADATION_SRC)
    land_dst = WRITING_DIR / "cambridge-8-test-1-land-degradation.png"
    shutil.copy2(LAND_DEGRADATION_SRC, land_dst)
    print(f"copied image -> {land_dst.relative_to(ROOT)}")


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
