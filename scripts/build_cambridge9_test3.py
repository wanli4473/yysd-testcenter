#!/usr/bin/env python3
"""Generate Cambridge IELTS 9 Test 3 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑9T3.docx")
TURBINE_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_14.22.37-73c096bc-ffb7-4d11-988d-cf41f52f7a04.png"
)
PIE_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_14.22.48-47fde20d-71f9-4eb0-9605-0aac679d041a.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test3 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test3 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test3 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test3 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-9-test-3.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-9-test-3-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-9-test-3-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-9-test-2.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-9-test-2-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-9-test-2-writing.html"

STATE_VARS = (
    "let currentPaper=[], selectedSections=[], mode='practice', "
    "startTime=0, timerInterval=null, submitted=false;\n"
)

Q36_DUAL = (
    '<span class="qnum-badge">36</span><input type="text" id="Q36a" autocomplete="off"> '
    'and <span class="qnum-badge">36</span><input type="text" id="Q36b" autocomplete="off">'
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
        ("Test 2", "Test 3"),
        ("test-2", "test-3"),
        ("test2", "test3"),
        ("Test 2 听力（官方原题 + 官方答案）", "Test 3 听力（官方原题 + 官方答案）"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    # drop test2-only L12 merge if inherited from template
    html = html.replace(
        "function readAns(q){ if(q.id==='L12'){"
        "const a=(document.getElementById('L12a')||{}).value||'';"
        "const b=(document.getElementById('L12b')||{}).value||'';"
        "return [a,b].filter(Boolean).join(' ').trim(); }"
        "const el=document.getElementById(q.id);",
        "function readAns(q){ const el=document.getElementById(q.id);",
    )
    return inject_state_vars(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("Test 2", "Test 3"),
        ("test-2", "test-3"),
        ("Test 2 阅读（官方原题 + 官方答案）", "Test 3 阅读（官方原题 + 官方答案）"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    note_needle = "if(g.kind==='note'){\n    body=`<div class=\"note-box\">"
    note_insert = (
        "if(g.kind==='note'){\n"
        "    const fig=(g.image?`<div style=\"margin:14px auto 20px;max-width:900px;text-align:center;\">"
        "<img class=\"map-img\" src=\"${g.image}\" alt=\"${g.noteTitle||'diagram'}\" style=\"max-width:100%;height:auto;\"></div>`"
        ":(g.svg?`<div style=\"margin:14px auto 20px;max-width:900px;\">${g.svg}</div>`:''));\n"
        "    body=fig+`<div class=\"note-box\">"
    )
    if note_needle in html and "const fig=" not in html:
        html = html.replace(note_needle, note_insert, 1)
    read_needle = "function readAns(q){ const el=document.getElementById(q.id);"
    read_insert = (
        "function readAns(q){ if(q.id==='Q36'){"
        "const a=(document.getElementById('Q36a')||{}).value||'';"
        "const b=(document.getElementById('Q36b')||{}).value||'';"
        "return [a,b].filter(Boolean).join(' ').trim(); }"
        "const el=document.getElementById(q.id);"
    )
    if read_needle in html and "Q36a" not in html:
        html = html.replace(read_needle, read_insert, 1)
    return html


def patch_writing_meta(html: str) -> str:
    reps = [
        ("Test 2", "Test 3"),
        ("test-2", "test-3"),
        (
            "Task 1 UK telephone calls bar chart + Task 2 unpaid community service essay",
            "Task 1 Yemen/Italy population pie charts + Task 2 sports facilities and public health essay",
        ),
        ("Test 2 写作（官方真题）", "Test 3 写作（官方真题）"),
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
                "paras": p1[3:],
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
                "paras": [p3[3], *[labeled_para(x) for x in p3[4:]]],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 9, "testNo": 3},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "cam9_test3_audio1.mp3",
                "groups": [
                    {
                        "kind": "table",
                        "title": "Questions 1–5",
                        "instruction": "Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "tableTitle": "Apartments",
                        "columns": ["Apartments", "Facilities", "Other information", "Cost"],
                        "rows": [
                            [
                                "Rose Garden Apartments",
                                "studio flat",
                                "Example: entertainment programme: Greek dancing",
                                "£219",
                            ],
                            [
                                "Blue Bay Apartments",
                                "large salt-water swimming pool",
                                "just <Q n=\"1\"> metres from beach; near shops",
                                "£275",
                            ],
                            [
                                "<Q n=\"2\"> Apartments",
                                "terrace, watersports",
                                "",
                                "£490",
                            ],
                            [
                                "The Grand",
                                "Greek paintings; <Q n=\"3\">",
                                "overlooking <Q n=\"4\">; near a supermarket and a disco",
                                "£<Q n=\"5\">",
                            ],
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("300"), "explain": explain("300")},
                            {"id": "L2", "no": 2, "answer": ans("Sunshade"), "explain": explain("Sunshade")},
                            {"id": "L3", "no": 3, "answer": ans("balcony"), "explain": explain("balcony")},
                            {"id": "L4", "no": 4, "answer": ans("forest", "forests"), "explain": explain("forest", "forests")},
                            {"id": "L5", "no": 5, "answer": ans("319"), "explain": explain("319")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 6–10",
                        "instruction": "Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "tableTitle": "GREEK ISLAND HOLIDAYS — Insurance Benefits",
                        "columns": ["Benefit", "Details"],
                        "rows": [
                            ["Cancellation", "£<Q n=\"6\">"],
                            ["Hospital", "£600"],
                            ["Additional benefit", "allows a <Q n=\"7\"> to travel to resort"],
                            ["<Q n=\"8\"> departure", "Up to £1000. Depends on reason"],
                            ["Personal belongings", "Up to £3000; £500 for one <Q n=\"9\">"],
                            ["Name of Assistant Manager", "Ben <Q n=\"10\">"],
                            ["Direct phone line", "081260 543216"],
                        ],
                        "questions": [
                            {"id": "L6", "no": 6, "answer": ans("10000", "10,000"), "explain": explain("10000", "10,000")},
                            {"id": "L7", "no": 7, "answer": ans("relative"), "explain": explain("relative")},
                            {"id": "L8", "no": 8, "answer": ans("missed"), "explain": explain("missed")},
                            {"id": "L9", "no": 9, "answer": ans("item"), "explain": explain("item")},
                            {"id": "L10", "no": 10, "answer": ans("Ludlow"), "explain": explain("Ludlow")},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "cam9_test3_audio2.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 11–13",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L11",
                                "no": 11,
                                "q": "Simon's idea for a theme park came from",
                                "options": {
                                    "A": "his childhood hobby.",
                                    "B": "his interest in landscape design.",
                                    "C": "his visit to another park.",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                            {
                                "id": "L12",
                                "no": 12,
                                "q": "When they started, the family decided to open the park only when",
                                "options": {
                                    "A": "the weather was expected to be good.",
                                    "B": "the children weren't at school.",
                                    "C": "there were fewer farming commitments.",
                                },
                                "answer": ans("A"),
                                "explain": explain("A"),
                            },
                            {
                                "id": "L13",
                                "no": 13,
                                "q": "Since opening, the park has had",
                                "options": {
                                    "A": "50,000 visitors.",
                                    "B": "1,000,000 visitors.",
                                    "C": "1,500,000 visitors.",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                        ],
                    },
                    {
                        "kind": "match",
                        "title": "Questions 14–18",
                        "instruction": "What is currently the main area of work of each of the following people? Choose FIVE answers from the box.",
                        "boxTitle": "Area of work",
                        "box": {
                            "A": "advertising",
                            "B": "animal care",
                            "C": "building",
                            "D": "educational links",
                            "E": "engine maintenance",
                            "F": "food and drink",
                            "G": "sales",
                            "H": "staffing",
                        },
                        "subTitle": "People",
                        "questions": [
                            {"id": "L14", "no": 14, "q": "Simon (the speaker)", "answer": ans("E"), "explain": explain("E")},
                            {"id": "L15", "no": 15, "q": "Liz", "answer": ans("H"), "explain": explain("H")},
                            {"id": "L16", "no": 16, "q": "Sarah", "answer": ans("F"), "explain": explain("F")},
                            {"id": "L17", "no": 17, "q": "Duncan", "answer": ans("C"), "explain": explain("C")},
                            {"id": "L18", "no": 18, "q": "Judith", "answer": ans("G"), "explain": explain("G")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 19 and 20",
                        "instruction": "Complete the table below. Write ONE WORD AND/OR NUMBERS for each answer.",
                        "columns": ["Feature", "Size", "Biggest challenge", "Target age group"],
                        "rows": [
                            ["Railway", "1.2 km", "Making tunnels", "—"],
                            [
                                "Go-Kart arena",
                                "<Q n=\"19\">",
                                "Removing mounds on the track",
                                "<Q n=\"20\">",
                            ],
                        ],
                        "questions": [
                            {"id": "L19", "no": 19, "answer": ans("120"), "explain": explain("120")},
                            {"id": "L20", "no": 20, "answer": ans("5 to 12"), "explain": explain("5 to 12")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "cam9_test3_audio3.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 21–30",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "Study Skills Tutorial — Caroline Benning",
                        "lines": [
                            {"plain": True, "html": "Dissertation topic: the <Q n=\"21\">"},
                            {"plain": True, "html": "<strong>Strengths:</strong> <Q n=\"22\">, computer modelling"},
                            {"plain": True, "html": "<strong>Weaknesses:</strong> lack of background information, poor <Q n=\"23\"> skills"},
                            {"plain": True, "html": "<strong>Possible strategy:</strong> peer group discussion"},
                            {"plain": True, "html": "<strong>Benefits:</strong> increases <Q n=\"24\">"},
                            {"plain": True, "html": "<strong>Problems:</strong> dissertations tend to contain the same <Q n=\"25\">"},
                            {"plain": True, "html": "<strong>Possible strategy:</strong> use the <Q n=\"26\"> service"},
                            {"plain": True, "html": "<strong>Benefits:</strong> provides structured programme"},
                            {"plain": True, "html": "<strong>Problems:</strong> limited <Q n=\"27\">"},
                            {"plain": True, "html": "<strong>Possible strategy:</strong> consult study skills books"},
                            {"plain": True, "html": "<strong>Benefits:</strong> are a good source of reference"},
                            {"plain": True, "html": "<strong>Problems:</strong> can be too <Q n=\"28\">"},
                            {"plain": True, "html": "<strong>Recommendations:</strong>"},
                            {"bullet": True, "html": "use a card index"},
                            {"bullet": True, "html": "read all notes <Q n=\"29\">"},
                            {"plain": True, "html": "Next tutorial date: <Q n=\"30\"> January"},
                        ],
                        "questions": [
                            {"id": "L21", "no": 21, "answer": ans("fishing industry"), "explain": explain("fishing industry")},
                            {"id": "L22", "no": 22, "answer": ans("statistics"), "explain": explain("statistics")},
                            {"id": "L23", "no": 23, "answer": ans("note-taking", "note taking"), "explain": explain("note-taking", "note taking")},
                            {"id": "L24", "no": 24, "answer": ans("confidence"), "explain": explain("confidence")},
                            {"id": "L25", "no": 25, "answer": ans("ideas"), "explain": explain("ideas")},
                            {"id": "L26", "no": 26, "answer": ans("student support"), "explain": explain("student support")},
                            {"id": "L27", "no": 27, "answer": ans("places"), "explain": explain("places")},
                            {"id": "L28", "no": 28, "answer": ans("general"), "explain": explain("general")},
                            {"id": "L29", "no": 29, "answer": ans("3 times"), "explain": explain("3 times")},
                            {"id": "L30", "no": 30, "answer": ans("25"), "explain": explain("25")},
                        ],
                    }
                ],
            },
            {
                "id": 4,
                "audio": "cam9_test3_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 31–32",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L31",
                                "no": 31,
                                "q": "The owners of the underground house",
                                "options": {
                                    "A": "had no experience of living in a rural area.",
                                    "B": "were interested in environmental issues.",
                                    "C": "wanted a professional project manager.",
                                },
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L32",
                                "no": 32,
                                "q": "What does the speaker say about the site of the house?",
                                "options": {
                                    "A": "The land was quite cheap.",
                                    "B": "Stone was being extracted nearby.",
                                    "C": "It was in a completely unspoilt area.",
                                },
                                "answer": ans("A"),
                                "explain": explain("A"),
                            },
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 33–40",
                        "instruction": "Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "noteTitle": "The Underground House",
                        "lines": [
                            {"plain": True, "html": "<strong>Design</strong>"},
                            {"bullet": True, "html": "Built in the earth, with two floors"},
                            {"bullet": True, "html": "The south-facing side was constructed of two layers of <Q n=\"33\">"},
                            {"bullet": True, "html": "Photovoltaic tiles were attached"},
                            {"bullet": True, "html": "A layer of foam was used to improve the <Q n=\"34\"> of the building"},
                            {"plain": True, "html": "<strong>Special features</strong>"},
                            {"bullet": True, "html": "To increase the light, the building has many internal mirrors and <Q n=\"35\">"},
                            {"bullet": True, "html": "In future, the house may produce more <Q n=\"36\"> than it needs"},
                            {"bullet": True, "html": "Recycled wood was used for the <Q n=\"37\"> of the house"},
                            {"bullet": True, "html": "The system for processing domestic <Q n=\"38\"> is organic"},
                            {"plain": True, "html": "<strong>Environmental issues</strong>"},
                            {"bullet": True, "html": "The use of large quantities of <Q n=\"39\"> in construction was environmentally harmful"},
                            {"bullet": True, "html": "But the house will have paid its 'environmental debt' within <Q n=\"40\">"},
                        ],
                        "questions": [
                            {"id": "L33", "no": 33, "answer": ans("glass"), "explain": explain("glass")},
                            {"id": "L34", "no": 34, "answer": ans("insulation"), "explain": explain("insulation")},
                            {"id": "L35", "no": 35, "answer": ans("windows"), "explain": explain("windows")},
                            {"id": "L36", "no": 36, "answer": ans("electricity"), "explain": explain("electricity")},
                            {"id": "L37", "no": 37, "answer": ans("floor", "floors"), "explain": explain("floor", "floors")},
                            {"id": "L38", "no": 38, "answer": ans("waste"), "explain": explain("waste")},
                            {"id": "L39", "no": 39, "answer": ans("concrete"), "explain": explain("concrete")},
                            {"id": "L40", "no": 40, "answer": ans("15 years"), "explain": explain("15 years")},
                        ],
                    },
                ],
            },
        ],
    }


def reading_test() -> dict:
    passages = reading_passages_from_docx()
    passages[0]["groups"] = [
        {
            "kind": "tfng",
            "title": "Questions 1–8",
            "instruction": "Do the following statements agree with the claims of the writer in Reading Passage 1?",
            "variant": "yn",
            "questions": [
                {"id": "Q1", "no": 1, "q": "There are understandable reasons why arguments occur about language.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q2", "no": 2, "q": "People feel more strongly about language education than about small differences in language usage.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q3", "no": 3, "q": "Our assessment of a person's intelligence is affected by the way he or she uses language.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q4", "no": 4, "q": "Prescriptive grammar books cost a lot of money to buy in the 18th century.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q5", "no": 5, "q": "Prescriptivism still exists today.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q6", "no": 6, "q": "According to descriptivists it is pointless to try to stop language change.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q7", "no": 7, "q": "Descriptivism only appeared after the 18th century.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q8", "no": 8, "q": "Both descriptivists and prescriptivists have been misrepresented.", "answer": ans("YES"), "explain": explain("YES")},
            ],
        },
        {
            "kind": "wbank",
            "title": "Questions 9–12",
            "instruction": "Complete the summary using the list of words, A–I, below.",
            "noteTitle": "The language debate",
            "box": {
                "A": "descriptivists",
                "B": "language experts",
                "C": "popular speech",
                "D": "formal language",
                "E": "evaluation",
                "F": "rules",
                "G": "modern linguists",
                "H": "prescriptivists",
                "I": "change",
            },
            "boxCols": 2,
            "lines": [
                {
                    "html": "According to <Q n=\"9\">, there is only one correct form of language. Linguists who take this approach to language place great importance on grammatical <Q n=\"10\">. Conversely, the view of <Q n=\"11\">, such as Joseph Priestley, is that grammar should be based on <Q n=\"12\">."
                }
            ],
            "questions": [
                {"id": "Q9", "no": 9, "answer": ans("H"), "explain": explain("H")},
                {"id": "Q10", "no": 10, "answer": ans("F"), "explain": explain("F")},
                {"id": "Q11", "no": 11, "answer": ans("A"), "explain": explain("A")},
                {"id": "Q12", "no": 12, "answer": ans("C"), "explain": explain("C")},
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
                    "q": "What is the writer's purpose in Reading Passage 1?",
                    "options": {
                        "A": "to argue in favour of a particular approach to writing dictionaries and grammar books",
                        "B": "to present a historical account of differing views of language",
                        "C": "to describe the differences between spoken and written language",
                        "D": "to show how a certain view of language has been discredited",
                    },
                    "answer": ans("B"),
                    "explain": explain("B"),
                }
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–17",
            "noBox": True,
            "instruction": "Reading Passage 2 has six paragraphs, A–F. Which paragraph contains the following information?",
            "box": {k: "" for k in "ABCDEF"},
            "questions": [
                {"id": "Q14", "no": 14, "q": "the location of the first test site", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q15", "no": 15, "q": "a way of bringing the power produced on one site back into Britain", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q16", "no": 16, "q": "a reference to a previous attempt by Britain to find an alternative source of energy", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q17", "no": 17, "q": "mention of the possibility of applying technology from another industry", "answer": ans("C"), "explain": explain("C")},
            ],
        },
        {
            "kind": "multi",
            "title": "Questions 18–22",
            "instruction": "Choose FIVE letters, A–J. Which FIVE of the following claims about tidal power are made by the writer?",
            "box": {
                "A": "It is a more reliable source of energy than wind power.",
                "B": "It would replace all other forms of energy in Britain.",
                "C": "Its introduction has come as a result of public pressure.",
                "D": "It would cut down on air pollution.",
                "E": "It could contribute to the closure of many existing power stations in Britain.",
                "F": "It could be a means of increasing national income.",
                "G": "It could face a lot of resistance from other fuel industries.",
                "H": "It could be sold more cheaply than any other type of fuel.",
                "I": "It could compensate for the shortage of inland sites for energy production.",
                "J": "It is best produced in the vicinity of coastlines with particular features.",
            },
            "answerSet": ["A", "D", "E", "F", "J"],
            "questions": [
                {"id": "Q18", "no": 18, "explain": "答案：A、D、E、F、J，顺序不限。"},
                {"id": "Q19", "no": 19, "explain": "答案：A、D、E、F、J，顺序不限。"},
                {"id": "Q20", "no": 20, "explain": "答案：A、D、E、F、J，顺序不限。"},
                {"id": "Q21", "no": 21, "explain": "答案：A、D、E、F、J，顺序不限。"},
                {"id": "Q22", "no": 22, "explain": "答案：A、D、E、F、J，顺序不限。"},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 23–26",
            "instruction": "Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "noteTitle": "An Undersea Turbine",
            "image": "cambridge-9-test-3-turbine.png",
            "lines": [
                {"plain": True, "html": "Whole tower can be raised for <Q n=\"23\"> and the extraction of seaweed from the blades"},
                {"plain": True, "html": "Sea life not in danger due to the fact that blades are comparatively <Q n=\"24\">"},
                {"plain": True, "html": "Air bubbles result from the <Q n=\"25\"> behind blades"},
                {"plain": True, "html": "This is known as <Q n=\"26\">"},
            ],
            "questions": [
                {"id": "Q23", "no": 23, "answer": ans("maintenance"), "explain": explain("maintenance")},
                {"id": "Q24", "no": 24, "answer": ans("slow-turning", "slow turning"), "explain": explain("slow-turning", "slow turning")},
                {"id": "Q25", "no": 25, "answer": ans("low pressure"), "explain": explain("low pressure")},
                {"id": "Q26", "no": 26, "answer": ans("cavitation"), "explain": explain("cavitation")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 27–32",
            "noBox": True,
            "instruction": "Reading Passage 3 has six paragraphs, A–F. Which paragraph contains the following information?",
            "box": {k: "" for k in "ABCDEF"},
            "questions": [
                {"id": "Q27", "no": 27, "q": "an explanation of the factors affecting the transmission of information", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q28", "no": 28, "q": "an example of how unnecessary information can be omitted", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q29", "no": 29, "q": "a reference to Shannon's attitude to fame", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q30", "no": 30, "q": "details of a machine capable of interpreting incomplete information", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q31", "no": 31, "q": "a detailed account of an incident involving information theory", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q32", "no": 32, "q": "a reference to what Shannon initially intended to achieve in his research", "answer": ans("C"), "explain": explain("C")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 33–37",
            "instruction": "Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "noteTitle": "The Voyager 1 Space Probe",
            "lines": [
                {
                    "plain": True,
                    "html": (
                        "The probe transmitted pictures of both <Q n=\"33\"> and <Q n=\"34\"> and then left the <Q n=\"35\">. "
                        f"The freezing temperatures were found to have a negative effect on parts of the space probe. "
                        f"Scientists feared that both the {Q36_DUAL} were about to stop working. "
                        "The only hope was to tell the probe to replace them with <Q n=\"37\"> but distance made communication with the probe difficult."
                    ),
                }
            ],
            "questions": [
                {"id": "Q33", "no": 33, "answer": ans("Jupiter"), "explain": explain("Jupiter")},
                {"id": "Q34", "no": 34, "answer": ans("Saturn"), "explain": explain("Saturn")},
                {"id": "Q35", "no": 35, "answer": ans("Solar System"), "explain": explain("Solar System")},
                {
                    "id": "Q36",
                    "no": 36,
                    "answer": ans("sensors circuits", "circuits sensors", "sensors and circuits", "circuits and sensors"),
                    "explain": explain("sensors", "circuits"),
                },
                {"id": "Q37", "no": 37, "answer": ans("spares"), "explain": explain("spares")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 38–40",
            "instruction": "Do the following statements agree with the information given in Reading Passage 3?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q38", "no": 38, "q": "The concept of describing something as true or false was the starting point for Shannon in his attempts to send messages over distances.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q39", "no": 39, "q": "The amount of information that can be sent in a given time period is determined with reference to the signal strength and noise level.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q40", "no": 40, "q": "Products have now been developed which can convey more information than Shannon had anticipated as possible.", "answer": ans("FALSE"), "explain": explain("FALSE")},
            ],
        },
    ]
    return {"meta": {"volume": 9, "testNo": 3}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The charts below give information on the ages of the populations of Yemen and Italy in 2000 "
                "and projections for 2050.<br><br>"
                "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Population age distribution: Yemen and Italy (2000 and 2050)",
                    "image": "cambridge-9-test-3-population-pies.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Some people say that the best way to improve public health is by increasing the number of sports facilities. "
                "Others, however, say that this would have little effect on public health and that other measures are required.<br><br>"
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
        dst = LISTENING_DIR / f"cam9_test3_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    if not TURBINE_SRC.exists():
        raise FileNotFoundError(TURBINE_SRC)
    turbine_dst = READING_DIR / "cambridge-9-test-3-turbine.png"
    shutil.copy2(TURBINE_SRC, turbine_dst)
    print(f"copied image -> {turbine_dst.relative_to(ROOT)}")
    if not PIE_SRC.exists():
        raise FileNotFoundError(PIE_SRC)
    pie_dst = WRITING_DIR / "cambridge-9-test-3-population-pies.png"
    shutil.copy2(PIE_SRC, pie_dst)
    print(f"copied image -> {pie_dst.relative_to(ROOT)}")


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
