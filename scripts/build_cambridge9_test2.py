#!/usr/bin/env python3
"""Generate Cambridge IELTS 9 Test 2 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑9T2.docx")
CHART_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_14.15.21-1966c33e-431f-4f33-a113-10f77c1a0a33.png"
)
MAP_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_14.15.10-8edf756b-016a-41db-a12d-a66fdccf6379.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test2 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test2 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test2 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test2 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-9-test-2.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-9-test-2-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-9-test-2-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-9-test-1.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-9-test-1-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-9-test-1-writing.html"

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
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
        ("test1", "test2"),
        ("Test 1 听力（官方原题 + 官方答案）", "Test 2 听力（官方原题 + 官方答案）"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    # ponytail: Q12 has two boxes but one scored item — merge L12a/L12b on read
    needle = "function readAns(q){ const el=document.getElementById(q.id);"
    insert = (
        "function readAns(q){ if(q.id==='L12'){"
        "const a=(document.getElementById('L12a')||{}).value||'';"
        "const b=(document.getElementById('L12b')||{}).value||'';"
        "return [a,b].filter(Boolean).join(' ').trim(); }"
        "const el=document.getElementById(q.id);"
    )
    if needle in html and insert not in html:
        html = html.replace(needle, insert, 1)
    return html


def patch_reading_meta(html: str) -> str:
    reps = [
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
        ("Test 1 阅读（官方原题 + 官方答案）", "Test 2 阅读（官方原题 + 官方答案）"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str) -> str:
    reps = [
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
        (
            "Task 1 island before/after maps + Task 2 foreign language at primary school essay",
            "Task 1 UK telephone calls bar chart + Task 2 unpaid community service essay",
        ),
        ("Test 1 写作（官方真题）", "Test 2 写作（官方真题）"),
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
                "title": "Effects of noise on children",
                "byline": p1[1],
                "paras": [labeled_para(x) for x in p1[2:]],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": p2[2],
                "byline": p2[1],
                "paras": [p2[3], *[labeled_para(x) for x in p2[4:]]],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": p3[2],
                "byline": p3[1],
                "paras": p3[3:],
            },
        },
    ]


def listening_test() -> dict:
    q12_dual = (
        '<span class="qnum-badge">12</span><input type="text" id="L12a" autocomplete="off"> '
        'and <span class="qnum-badge">12</span><input type="text" id="L12b" autocomplete="off">'
    )
    return {
        "meta": {"volume": 9, "testNo": 2},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "cam9_test2_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–10",
                        "instruction": "Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "noteTitle": "Accommodation Form – Student Information",
                        "lines": [
                            {"bullet": True, "html": "Example: Type of accommodation: hall of residence"},
                            {"bullet": True, "html": "Name: Anu <Q n=\"1\">"},
                            {"bullet": True, "html": "Date of birth: <Q n=\"2\">"},
                            {"bullet": True, "html": "Country of origin: India"},
                            {"bullet": True, "html": "Course of study: <Q n=\"3\">"},
                            {"bullet": True, "html": "Number of years planned in hall: <Q n=\"4\">"},
                            {"bullet": True, "html": "Preferred catering arrangement: half board"},
                            {"bullet": True, "html": "Special dietary requirements: no <Q n=\"5\"> (red)"},
                            {"bullet": True, "html": "Preferred room type: a single <Q n=\"6\">"},
                            {"bullet": True, "html": "Interests: the <Q n=\"7\">, badminton"},
                            {"plain": True, "html": "<strong>Priorities in choice of hall:</strong>"},
                            {"bullet": True, "html": "to be with other students who are <Q n=\"8\">"},
                            {"bullet": True, "html": "to live outside the <Q n=\"9\">"},
                            {"bullet": True, "html": "<Q n=\"10\">"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("Bhatt"), "explain": explain("Bhatt")},
                            {"id": "L2", "no": 2, "answer": ans("31 March"), "explain": explain("31 March")},
                            {"id": "L3", "no": 3, "answer": ans("nursing"), "explain": explain("nursing")},
                            {"id": "L4", "no": 4, "answer": ans("2"), "explain": explain("2")},
                            {"id": "L5", "no": 5, "answer": ans("meat"), "explain": explain("meat")},
                            {"id": "L6", "no": 6, "answer": ans("bedsit"), "explain": explain("bedsit")},
                            {"id": "L7", "no": 7, "answer": ans("theatre", "theater"), "explain": explain("theatre", "theater")},
                            {"id": "L8", "no": 8, "answer": ans("mature", "older"), "explain": explain("mature", "older")},
                            {"id": "L9", "no": 9, "answer": ans("town"), "explain": explain("town")},
                            {"id": "L10", "no": 10, "answer": ans("shared"), "explain": explain("shared")},
                        ],
                    }
                ],
            },
            {
                "id": 2,
                "audio": "cam9_test2_audio2.mp3",
                "groups": [
                    {
                        "kind": "table",
                        "title": "Questions 11–13",
                        "instruction": "Complete the table below. Write NO MORE THAN THREE WORDS for each answer.",
                        "columns": ["Name of place", "Of particular interest", "Open"],
                        "rows": [
                            ["Halland Common", "source of River Ouse", "24 hours"],
                            ["Holt Island", "many different <Q n=\"11\">", f"between {q12_dual}"],
                            [
                                "Longfield Country Park",
                                "reconstruction of a 2,000-year-old <Q n=\"13\"> with activities for children",
                                "daylight hours",
                            ],
                        ],
                        "questions": [
                            {"id": "L11", "no": 11, "answer": ans("trees"), "explain": explain("trees")},
                            {
                                "id": "L12",
                                "no": 12,
                                "answer": ans("Friday Sunday", "Sunday Friday", "Friday and Sunday"),
                                "explain": explain("Friday", "Sunday"),
                            },
                            {"id": "L13", "no": 13, "answer": ans("farm"), "explain": explain("farm")},
                        ],
                    },
                    {
                        "kind": "mcq",
                        "title": "Questions 14–16",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L14",
                                "no": 14,
                                "q": "As part of Monday's activity, visitors will",
                                "options": {
                                    "A": "prepare food with herbs.",
                                    "B": "meet a well-known herbalist.",
                                    "C": "dye cloth with herbs.",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                            {
                                "id": "L15",
                                "no": 15,
                                "q": "For the activity on Wednesday,",
                                "options": {
                                    "A": "only group bookings are accepted.",
                                    "B": "visitors should book in advance.",
                                    "C": "attendance is free.",
                                },
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L16",
                                "no": 16,
                                "q": "For the activity on Saturday, visitors should",
                                "options": {
                                    "A": "come in suitable clothing.",
                                    "B": "make sure they are able to stay for the whole day.",
                                    "C": "tell the rangers before the event what they wish to do.",
                                },
                                "answer": ans("A"),
                                "explain": explain("A"),
                            },
                        ],
                    },
                    {
                        "kind": "map",
                        "title": "Questions 17–20",
                        "instruction": "Label the map below. Write the correct letter, A–I, next to questions 17–20.",
                        "mapTitle": "Hinchingbrooke Park",
                        "image": "cambridge-9-test-2-park-map.png",
                        "letters": ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
                        "questions": [
                            {"id": "L17", "no": 17, "q": "Ashworthy", "answer": ans("A"), "explain": explain("A")},
                            {"id": "L18", "no": 18, "q": "Lower Marshall", "answer": ans("I"), "explain": explain("I")},
                            {"id": "L19", "no": 19, "q": "The Old Barn", "answer": ans("F"), "explain": explain("F")},
                            {"id": "L20", "no": 20, "q": "The shop", "answer": ans("E"), "explain": explain("E")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "cam9_test2_audio3.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 21–24",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L21",
                                "no": 21,
                                "q": "Students want to keep the Self-Access Centre because",
                                "options": {
                                    "A": "they enjoy the variety of equipment.",
                                    "B": "they like being able to work on their own.",
                                    "C": "it is an important part of their studies.",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                            {
                                "id": "L22",
                                "no": 22,
                                "q": "Some teachers would prefer to",
                                "options": {
                                    "A": "close the Self-Access Centre.",
                                    "B": "move the Self-Access Centre elsewhere.",
                                    "C": "restrict access to the Self-Access Centre.",
                                },
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L23",
                                "no": 23,
                                "q": "The students' main concern about using the library would be",
                                "options": {
                                    "A": "the size of the library.",
                                    "B": "difficulty in getting help.",
                                    "C": "the lack of materials.",
                                },
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L24",
                                "no": 24,
                                "q": "The Director of Studies is concerned about",
                                "options": {
                                    "A": "the cost of upgrading the centre.",
                                    "B": "the lack of space in the centre.",
                                    "C": "the difficulty in supervising the centre.",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 25–30",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Necessary improvements to the existing Self-Access Centre",
                        "lines": [
                            {"plain": True, "html": "<strong>Equipment:</strong>"},
                            {"bullet": True, "html": "Replace computers to create more space."},
                            {"plain": True, "html": "<strong>Resources:</strong>"},
                            {"bullet": True, "html": "The level of the <Q n=\"25\"> materials, in particular, should be more clearly shown."},
                            {"bullet": True, "html": "Update the <Q n=\"26\"> collection."},
                            {"bullet": True, "html": "Buy some <Q n=\"27\"> and divide them up."},
                            {"plain": True, "html": "<strong>Use of the room:</strong>"},
                            {"bullet": True, "html": "Speak to the teachers and organise a <Q n=\"28\"> for supervising the centre."},
                            {"bullet": True, "html": "Install an <Q n=\"29\">"},
                            {"bullet": True, "html": "Restrict personal use of <Q n=\"30\"> on computers."},
                        ],
                        "questions": [
                            {"id": "L25", "no": 25, "answer": ans("reading"), "explain": explain("reading")},
                            {"id": "L26", "no": 26, "answer": ans("CD"), "explain": explain("CD")},
                            {"id": "L27", "no": 27, "answer": ans("workbooks"), "explain": explain("workbooks")},
                            {"id": "L28", "no": 28, "answer": ans("timetable", "schedule"), "explain": explain("timetable", "schedule")},
                            {"id": "L29", "no": 29, "answer": ans("alarm"), "explain": explain("alarm")},
                            {"id": "L30", "no": 30, "answer": ans("email", "emails"), "explain": explain("email", "emails")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "cam9_test2_audio4.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 31–40",
                        "instruction": "Complete the notes below. Write ONE WORD ONLY for each answer.",
                        "noteTitle": "Business Cultures",
                        "lines": [
                            {"plain": True, "html": "<strong>Power culture</strong>"},
                            {"plain": True, "html": "<strong>Characteristics of organisation:</strong>"},
                            {"bullet": True, "html": "small <Q n=\"31\">"},
                            {"bullet": True, "html": "power source"},
                            {"bullet": True, "html": "few rules and procedures"},
                            {"bullet": True, "html": "communication by <Q n=\"32\">"},
                            {"plain": True, "html": "<strong>Advantage:</strong> can act quickly"},
                            {"plain": True, "html": "<strong>Disadvantage:</strong> might not act <Q n=\"33\">"},
                            {"plain": True, "html": "<strong>Suitable employee:</strong>"},
                            {"bullet": True, "html": "not afraid of <Q n=\"34\">"},
                            {"bullet": True, "html": "doesn't need job security"},
                            {"plain": True, "html": "<strong>Role culture</strong>"},
                            {"plain": True, "html": "<strong>Characteristics of organisation:</strong>"},
                            {"bullet": True, "html": "large, many <Q n=\"35\">"},
                            {"bullet": True, "html": "specialised departments"},
                            {"bullet": True, "html": "rules and procedure, e.g. job <Q n=\"36\"> and rules for discipline"},
                            {"plain": True, "html": "<strong>Advantages:</strong>"},
                            {"bullet": True, "html": "economies of scale"},
                            {"bullet": True, "html": "successful when <Q n=\"37\"> ability is important"},
                            {"plain": True, "html": "<strong>Disadvantages:</strong>"},
                            {"bullet": True, "html": "slow to see when <Q n=\"38\"> needed"},
                            {"bullet": True, "html": "slow to react"},
                            {"plain": True, "html": "<strong>Suitable employee:</strong>"},
                            {"bullet": True, "html": "values security"},
                            {"bullet": True, "html": "doesn't want <Q n=\"39\">"},
                            {"plain": True, "html": "<strong>Task culture</strong>"},
                            {"plain": True, "html": "<strong>Characteristics of organisation:</strong>"},
                            {"bullet": True, "html": "project orientated"},
                            {"bullet": True, "html": "in competitive market or making product with short life"},
                            {"bullet": True, "html": "a lot of delegation"},
                            {"plain": True, "html": "<strong>Advantage:</strong> <Q n=\"40\">"},
                            {"plain": True, "html": "<strong>Disadvantages:</strong>"},
                            {"bullet": True, "html": "no economies of scale or special expertise"},
                            {"plain": True, "html": "<strong>Suitable employee:</strong>"},
                            {"bullet": True, "html": "likes to work in groups"},
                        ],
                        "questions": [
                            {"id": "L31", "no": 31, "answer": ans("central"), "explain": explain("central")},
                            {"id": "L32", "no": 32, "answer": ans("conversation", "conversations"), "explain": explain("conversation", "conversations")},
                            {"id": "L33", "no": 33, "answer": ans("effectively"), "explain": explain("effectively")},
                            {"id": "L34", "no": 34, "answer": ans("risk", "risks"), "explain": explain("risk", "risks")},
                            {"id": "L35", "no": 35, "answer": ans("levels"), "explain": explain("levels")},
                            {"id": "L36", "no": 36, "answer": ans("description", "descriptions"), "explain": explain("description", "descriptions")},
                            {"id": "L37", "no": 37, "answer": ans("technical"), "explain": explain("technical")},
                            {"id": "L38", "no": 38, "answer": ans("change"), "explain": explain("change")},
                            {"id": "L39", "no": 39, "answer": ans("responsibility"), "explain": explain("responsibility")},
                            {"id": "L40", "no": 40, "answer": ans("flexible"), "explain": explain("flexible")},
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
            "title": "Questions 1–6",
            "noBox": True,
            "instruction": "Reading Passage 1 has nine sections, A–I. Which section contains the following information?",
            "box": {k: "" for k in "ABCDEFGHI"},
            "questions": [
                {"id": "Q1", "no": 1, "q": "an account of a national policy initiative", "answer": ans("H"), "explain": explain("H")},
                {"id": "Q2", "no": 2, "q": "a description of a global team effort", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q3", "no": 3, "q": "a hypothesis as to one reason behind the growth in classroom noise", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q4", "no": 4, "q": "a demand for suitable worldwide regulations", "answer": ans("I"), "explain": explain("I")},
                {"id": "Q5", "no": 5, "q": "a list of medical conditions which place some children more at risk from noise than others", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q6", "no": 6, "q": "the estimated proportion of children in New Zealand with auditory problems", "answer": ans("A"), "explain": explain("A")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 7–10",
            "instruction": "Answer the questions below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "For what period of time has hearing loss in schoolchildren been studied in New Zealand? <Q n=\"7\">"},
                {"plain": True, "html": "In addition to machinery noise, what other type of noise can upset children with autism? <Q n=\"8\">"},
                {"plain": True, "html": "What term is used to describe the hearing problems of schoolchildren which have not been diagnosed? <Q n=\"9\">"},
                {"plain": True, "html": "What part of the New Zealand Disability Strategy aims to give schoolchildren equal opportunity? <Q n=\"10\">"},
            ],
            "questions": [
                {"id": "Q7", "no": 7, "answer": ans("two decades"), "explain": explain("two decades")},
                {"id": "Q8", "no": 8, "answer": ans("crowd", "crowd noise"), "explain": explain("crowd", "crowd noise")},
                {"id": "Q9", "no": 9, "answer": ans("invisible", "invisible disabilities", "invisible disability"), "explain": explain("invisible", "invisible disabilities", "invisible disability")},
                {"id": "Q10", "no": 10, "answer": ans("Objective 3"), "explain": explain("Objective 3")},
            ],
        },
        {
            "kind": "multi",
            "title": "Questions 11 and 12",
            "instruction": "Choose TWO letters, A–F. Which TWO factors contributing to classroom noise are mentioned by the writer?",
            "box": {
                "A": "current teaching methods",
                "B": "echoing corridors",
                "C": "cooling systems",
                "D": "large class sizes",
                "E": "loud-voiced teachers",
                "F": "playground games",
            },
            "answerSet": ["A", "C"],
            "questions": [
                {"id": "Q11", "no": 11, "explain": "答案：A 与 C，顺序不限。"},
                {"id": "Q12", "no": 12, "explain": "答案：A 与 C，顺序不限。"},
            ],
        },
        {
            "kind": "mcq",
            "title": "Question 13",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {
                    "id": "Q13",
                    "no": 13,
                    "q": "What is the writer's overall purpose in writing this article?",
                    "options": {
                        "A": "to compare different methods of dealing with auditory problems",
                        "B": "to provide solutions for overly noisy learning environments",
                        "C": "to increase awareness of the situation of children with auditory problems",
                        "D": "to promote New Zealand as a model for other countries to follow",
                    },
                    "answer": ans("C"),
                    "explain": explain("C"),
                }
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–17",
            "noBox": True,
            "instruction": "Reading Passage 2 has seven paragraphs, A–G. Which paragraph contains the following information?",
            "box": {k: "" for k in "ABCDEFG"},
            "questions": [
                {"id": "Q14", "no": 14, "q": "examples of different ways in which the parallax principle has been applied", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q15", "no": 15, "q": "a description of an event which prevented a transit observation", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q16", "no": 16, "q": "a statement about potential future discoveries leading on from transit observations", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q17", "no": 17, "q": "a description of physical states connected with Venus which early astronomical instruments failed to overcome", "answer": ans("E"), "explain": explain("E")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 18–21",
            "instruction": "Look at the following statements and the list of people below. Match each statement with the correct person, A–D.",
            "boxTitle": "List of People",
            "box": {
                "A": "Edmond Halley",
                "B": "Johannes Kepler",
                "C": "Guillaume Le Gentil",
                "D": "Johann Franz Encke",
            },
            "questions": [
                {"id": "Q18", "no": 18, "q": "He calculated the distance of the Sun from the Earth based on observations of Venus with a fair degree of accuracy.", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q19", "no": 19, "q": "He understood that the distance of the Sun from the Earth could be worked out by comparing observations of a transit.", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q20", "no": 20, "q": "He realised that the time taken by a planet to go round the Sun depends on its distance from the Sun.", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q21", "no": 21, "q": "He witnessed a Venus transit but was unable to make any calculations.", "answer": ans("C"), "explain": explain("C")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 22–26",
            "instruction": "Do the following statements agree with the information given in Reading Passage 2?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q22", "no": 22, "q": "Halley observed one transit of the planet Venus.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q23", "no": 23, "q": "Le Gentil managed to observe a second Venus transit.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q24", "no": 24, "q": "The shape of Venus appears distorted when it starts to pass in front of the Sun.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q25", "no": 25, "q": "Early astronomers suspected that the atmosphere on Venus was toxic.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q26", "no": 26, "q": "The parallax principle allows astronomers to work out how far away distant stars are from the Earth.", "answer": ans("TRUE"), "explain": explain("TRUE")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "mcq",
            "title": "Questions 27–31",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q27", "no": 27, "q": "Neuroeconomics is a field of study which seeks to", "options": {"A": "cause a change in how scientists understand brain chemistry.", "B": "understand how good decisions are made in the brain.", "C": "understand how the brain is linked to achievement in competitive fields.", "D": "trace the specific firing patterns of neurons in different areas of the brain."}, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q28", "no": 28, "q": "According to the writer, iconoclasts are distinctive because", "options": {"A": "they create unusual brain circuits.", "B": "their brains function differently.", "C": "their personalities are distinctive.", "D": "they make decisions easily."}, "answer": ans("B"), "explain": explain("B")},
                {"id": "Q29", "no": 29, "q": "According to the writer, the brain works efficiently because", "options": {"A": "it uses the eyes quickly.", "B": "it interprets data logically.", "C": "it generates its own energy.", "D": "it relies on previous events."}, "answer": ans("D"), "explain": explain("D")},
                {"id": "Q30", "no": 30, "q": "The writer says that perception is", "options": {"A": "a combination of photons and sound waves.", "B": "a reliable product of what your senses transmit.", "C": "a result of brain processes.", "D": "a process we are usually conscious of."}, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q31", "no": 31, "q": "According to the writer, an iconoclastic thinker", "options": {"A": "centralises perceptual thinking in one part of the brain.", "B": "avoids cognitive traps.", "C": "has a brain that is hardwired for learning.", "D": "has more opportunities than the average person."}, "answer": ans("B"), "explain": explain("B")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 32–37",
            "instruction": "Do the following statements agree with the claims of the writer in Reading Passage 3?",
            "variant": "yn",
            "questions": [
                {"id": "Q32", "no": 32, "q": "Exposure to different events forces the brain to think differently.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q33", "no": 33, "q": "Iconoclasts are unusually receptive to new experiences.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q34", "no": 34, "q": "Most people are too shy to try different things.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q35", "no": 35, "q": "If you think in an iconoclastic way, you can easily overcome fear.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q36", "no": 36, "q": "When concern about embarrassment matters less, other fears become irrelevant.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q37", "no": 37, "q": "Fear of public speaking is a psychological illness.", "answer": ans("NO"), "explain": explain("NO")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 38–40",
            "instruction": "Complete each sentence with the correct ending, A–E, below.",
            "boxTitle": "Endings",
            "box": {
                "A": "requires both perceptual and social intelligence skills.",
                "B": "focuses on how groups decide on an action.",
                "C": "works in many fields, both artistic and scientific.",
                "D": "leaves one open to criticism and rejection.",
                "E": "involves understanding how organisations manage people.",
            },
            "subTitle": "Sentence beginnings",
            "questions": [
                {"id": "Q38", "no": 38, "q": "Thinking like a successful iconoclast is demanding because it", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q39", "no": 39, "q": "The concept of the social brain is useful to iconoclasts because it", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q40", "no": 40, "q": "Iconoclasts are generally an asset because their way of thinking", "answer": ans("C"), "explain": explain("C")},
            ],
        },
    ]
    return {"meta": {"volume": 9, "testNo": 2}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The chart below shows the total number of minutes (in billions) of telephone calls in the UK, "
                "divided into three categories, from 1995–2002.<br><br>"
                "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "UK telephone calls, by category, 1995–2002",
                    "image": "cambridge-9-test-2-phone-calls.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Some people believe that unpaid community service should be a compulsory part of "
                "high school programmes (for example working for a charity, improving the neighbourhood or teaching sports to younger children).<br><br>"
                "To what extent do you agree or disagree?<br><br>"
                "Give reasons for your answer and include any relevant examples from your own knowledge or experience.<br>"
                "<strong>Write at least 250 words.</strong>"
            )
        },
    }


def copy_assets() -> None:
    for i, src in enumerate(AUDIO_SRC, start=1):
        if not src.exists():
            raise FileNotFoundError(src)
        dst = LISTENING_DIR / f"cam9_test2_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    for src, name in ((MAP_SRC, "cambridge-9-test-2-park-map.png"), (CHART_SRC, "cambridge-9-test-2-phone-calls.png")):
        if not src.exists():
            raise FileNotFoundError(src)
        dst = (LISTENING_DIR if "park" in name else WRITING_DIR) / name
        shutil.copy2(src, dst)
        print(f"copied image -> {dst.relative_to(ROOT)}")


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
