#!/usr/bin/env python3
"""Generate Cambridge IELTS 5 Test 4 listening, reading, and writing mock pages."""

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
sys.path.insert(0, str(ROOT / "scripts"))
from cambridge_scoring import patch_scoring

TEST_RE = re.compile(r"const TEST = (\{[\s\S]*?\});", re.S)
W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

DOCX = Path("/Users/frankman/Desktop/剑5T4.docx")
RAILWAY_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-03_09.40.11-93010c7e-53e5-40bd-9cdf-ea6220778147.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test4 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test4 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test4 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test4 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-5-test-4.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-5-test-4-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-5-test-4-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-5-test-3.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-5-test-3-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-5-test-3-writing.html"

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
        ("剑桥雅思5 Test 3 听力", "剑桥雅思5 Test 4 听力"),
        ("剑桥雅思5 · Test 3（听力）", "剑桥雅思5 · Test 4（听力）"),
        ("剑桥雅思5 Test 3 听力：", "剑桥雅思5 Test 4 听力："),
        ("Test 3 听力（官方原题 + 官方答案）", "Test 4 听力（官方原题 + 官方答案）"),
        ("剑桥雅思 5 · Test 3", "剑桥雅思 5 · Test 4"),
        ("剑桥雅思5 · Test 3", "剑桥雅思5 · Test 4"),
        ("Test 3", "Test 4"),
        ("test-3", "test-4"),
        ("ielts5_test3", "ielts5_test4"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 3 阅读", "剑桥雅思5 Test 4 阅读"),
        ("剑桥雅思5 · Test 3（阅读）", "剑桥雅思5 · Test 4（阅读）"),
        ("剑桥雅思5 Test 3 学术类阅读", "剑桥雅思5 Test 4 学术类阅读"),
        ("Test 3 阅读（官方原题 + 官方答案）", "Test 4 阅读（官方原题 + 官方答案）"),
        (
            "Early Childhood Education、Nile Delta、The Return of Artificial Intelligence",
            "Wilderness Tourism、Toughened Glass、Effects of Light",
        ),
        ("剑桥雅思 5 · Test 3", "剑桥雅思 5 · Test 4"),
        ("剑桥雅思5 · Test 3", "剑桥雅思5 · Test 4"),
        ("Test 3", "Test 4"),
        ("test-3", "test-4"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 3 写作", "剑桥雅思5 Test 4 写作"),
        ("剑桥雅思5 · Test 3（写作）", "剑桥雅思5 · Test 4（写作）"),
        ("剑桥雅思5 Test 3 学术类写作", "剑桥雅思5 Test 4 学术类写作"),
        (
            "Task 1 Garlsdon supermarket map + Task 2 competition vs cooperation essay",
            "Task 1 underground railway table + Task 2 nature vs nurture essay",
        ),
        ("剑桥雅思 5 · Test 3", "剑桥雅思 5 · Test 4"),
        ("剑桥雅思5 · Test 3", "剑桥雅思5 · Test 4"),
        ("Test 3 写作（官方真题）", "Test 4 写作（官方真题）"),
        ("cambridge-5-test-3-writing-draft", "cambridge-5-test-4-writing-draft"),
        ("【剑桥雅思5 · Test 3 写作】", "【剑桥雅思5 · Test 4 写作】"),
        ("Test 3", "Test 4"),
        ("test-3", "test-4"),
        ("garlsdon-map", "underground-railway"),
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


def para_html(line: str, default_label: str | None = None) -> str:
    if len(line) >= 2 and line[0] in "ABCDEFG" and line[1] == " ":
        return f'<span class="para-label">{line[0]}</span>{line[2:]}'
    if default_label:
        return f'<span class="para-label">{default_label}</span>{line}'
    return line


def reading_passages() -> list[dict]:
    p = extract_docx_paras(DOCX)
    return [
        {
            "id": 1,
            "passage": {
                "title": "Wilderness Tourism",
                "paras": [
                    para_html(p[125]),
                    p[126],
                    para_html(p[127]),
                    p[128],
                    p[129],
                    para_html(p[130]),
                    p[131],
                    p[132],
                    p[133],
                    p[134],
                ],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": "Flawed Beauty: the problem with toughened glass",
                "paras": p[168:179],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": "The effects of light on plant and animal species",
                "paras": p[222:229],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 5, "testNo": 4},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "ielts5_test4_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–10",
                        "instruction": "Complete the form below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "HOST FAMILY APPLICANT",
                        "lines": [
                            {"plain": True, "html": "Example: Name: Jenny Chan"},
                            {"plain": True, "html": "Present address: Sea View Guest House, <Q n=\"1\">"},
                            {"plain": True, "html": "Daytime phone number: 2237676"},
                            {"plain": True, "html": "[NB Best time to contact is <Q n=\"2\">]"},
                            {"plain": True, "html": "Age: 19"},
                            {"plain": True, "html": "Intended length of stay: <Q n=\"3\">"},
                            {"plain": True, "html": "Occupation while in UK: student"},
                            {"plain": True, "html": "General level of English: <Q n=\"4\">"},
                            {"plain": True, "html": "Preferred location: in the <Q n=\"5\">"},
                            {"plain": True, "html": "Special diet: <Q n=\"6\">"},
                            {"h": "Other requirements"},
                            {"bullet": True, "html": "own facilities"},
                            {"bullet": True, "html": "own television"},
                            {"bullet": True, "html": "<Q n=\"7\">"},
                            {"bullet": True, "html": "to be <Q n=\"8\">"},
                            {"plain": True, "html": "Maximum price: £<Q n=\"9\">"},
                            {"plain": True, "html": "Preferred starting date: <Q n=\"10\">"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("14 Hill Road"), "explain": explain("14 Hill Road")},
                            {"id": "L2", "no": 2, "answer": ans("between 9 and 9.30", "9-9.30", "between 9 and 9.30 am"), "explain": explain("between 9 and 9.30", "9-9.30")},
                            {"id": "L3", "no": 3, "answer": ans("1 year", "one year"), "explain": explain("1 year", "one year")},
                            {"id": "L4", "no": 4, "answer": ans("intermediate"), "explain": explain("intermediate")},
                            {"id": "L5", "no": 5, "answer": ans("North-West", "north west", "northwest"), "explain": explain("North-West", "north west")},
                            {"id": "L6", "no": 6, "answer": ans("vegetarian"), "explain": explain("vegetarian")},
                            {"id": "L7", "no": 7, "answer": ans("garden", "real garden", "a garden", "a real garden"), "explain": explain("garden", "real garden", "a real garden")},
                            {"id": "L8", "no": 8, "answer": ans("only guest", "the only guest"), "explain": explain("only guest", "the only guest")},
                            {"id": "L9", "no": 9, "answer": ans("100"), "explain": explain("100")},
                            {"id": "L10", "no": 10, "answer": ans("23rd March", "Monday 23rd March", "23 March", "March 23rd"), "explain": explain("23rd March", "Monday 23rd March")},
                        ],
                    }
                ],
            },
            {
                "id": 2,
                "audio": "ielts5_test4_audio2.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 11–13",
                        "instruction": "Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.",
                        "lines": [
                            {"plain": True, "html": "11 The next meeting of the soccer club will be in the <Q n=\"11\"> in King's Park on 2 July."},
                            {"plain": True, "html": "12 The first event is a <Q n=\"12\">"},
                            {"plain": True, "html": "13 At the final dinner, players receive <Q n=\"13\">"},
                        ],
                        "questions": [
                            {"id": "L11", "no": 11, "answer": ans("clubhouse"), "explain": explain("clubhouse")},
                            {"id": "L12", "no": 12, "answer": ans("picnic"), "explain": explain("picnic")},
                            {"id": "L13", "no": 13, "answer": ans("prizes"), "explain": explain("prizes")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 14–17",
                        "instruction": "Complete the table below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "cols": ["Competition", "Number of Teams", "Games Begin", "Training Session (in King's Park)"],
                        "rows": [
                            ["Junior", "<Q n=\"14\">", "8.30 am", "<Q n=\"15\">"],
                            ["Senior", "<Q n=\"16\">", "2.00 pm", "<Q n=\"17\">"],
                        ],
                        "questions": [
                            {"id": "L14", "no": 14, "answer": ans("10"), "explain": explain("10")},
                            {"id": "L15", "no": 15, "answer": ans("Wednesday afternoon", "Wednesday afternoons"), "explain": explain("Wednesday afternoon", "Wednesday afternoons")},
                            {"id": "L16", "no": 16, "answer": ans("4"), "explain": explain("4")},
                            {"id": "L17", "no": 17, "answer": ans("Sunday afternoon", "Sunday afternoons"), "explain": explain("Sunday afternoon", "Sunday afternoons")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 18–20",
                        "instruction": "Complete the table below. Write NO MORE THAN THREE WORDS for each answer.",
                        "cols": ["Name of Office Bearer", "Responsibility"],
                        "rows": [
                            ["Robert Young", "to manage meetings"],
                            ["Gina Costello", "to <Q n=\"18\">"],
                            ["David West", "to <Q n=\"19\">"],
                            ["Jason Dokic", "to <Q n=\"20\">"],
                        ],
                        "questions": [
                            {"id": "L18", "no": 18, "answer": ans("collect fees", "collect the fees", "collect money", "collect the money"), "explain": explain("collect fees", "collect the fees", "collect money")},
                            {"id": "L19", "no": 19, "answer": ans("send newsletter", "send newsletters", "send out newsletter", "send out newsletters", "send the newsletter"), "explain": explain("send newsletter", "send newsletters", "send out newsletters")},
                            {"id": "L20", "no": 20, "answer": ans("supervise teams", "supervise the teams"), "explain": explain("supervise teams", "supervise the teams")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "ielts5_test4_audio3.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 21–24",
                        "instruction": "Complete the notes below. Write NO MORE THAN THREE WORDS for each answer.",
                        "noteTitle": "Box Telecom",
                        "lines": [
                            {"h": "Problems"},
                            {"bullet": True, "html": "been affected by drop in <Q n=\"21\">"},
                            {"bullet": True, "html": "growing <Q n=\"22\">"},
                            {"bullet": True, "html": "delays due to a strike"},
                            {"h": "Causes of problems"},
                            {"bullet": True, "html": "high <Q n=\"23\">"},
                            {"bullet": True, "html": "lack of good <Q n=\"24\">"},
                        ],
                        "questions": [
                            {"id": "L21", "no": 21, "answer": ans("sales"), "explain": explain("sales")},
                            {"id": "L22", "no": 22, "answer": ans("competition"), "explain": explain("competition")},
                            {"id": "L23", "no": 23, "answer": ans("interest rates", "rates of interest"), "explain": explain("interest rates", "rates of interest")},
                            {"id": "L24", "no": 24, "answer": ans("training"), "explain": explain("training")},
                        ],
                    },
                    {
                        "kind": "mcq",
                        "title": "Questions 25–27",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L25", "no": 25, "q": "What does Karin think the company will do?", "options": {"A": "look for private investors", "B": "accept a takeover offer", "C": "issue some new shares"}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L26", "no": 26, "q": "How does the tutor suggest the company can recover?", "options": {"A": "by appointing a new managing director", "B": "by changing the way it is organised", "C": "by closing some of its retail outlets"}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L27", "no": 27, "q": "The tutor wants Jason and Karin to produce a report which", "options": {"A": "offers solutions to Box Telecom's problems.", "B": "analyses the UK market.", "C": "compares different companies."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "match",
                        "title": "Questions 28–30",
                        "instruction": "Which opinion does each person express about Box Telecom? Choose from the box.",
                        "boxTitle": "Opinions",
                        "box": {
                            "A": "its workers are motivated",
                            "B": "it has too little investment",
                            "C": "it will overcome its problems",
                            "D": "its marketing campaign needs improvement",
                            "E": "it is old-fashioned",
                            "F": "it has strong managers",
                        },
                        "questions": [
                            {"id": "L28", "no": 28, "q": "Karin", "answer": ans("C"), "explain": explain("C")},
                            {"id": "L29", "no": 29, "q": "Jason", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L30", "no": 30, "q": "the tutor", "answer": ans("D"), "explain": explain("D")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "ielts5_test4_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 31–36",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L31", "no": 31, "q": "During the first week of term, students are invited to", "options": {"A": "be shown round the library by the librarian.", "B": "listen to descriptions of library resources.", "C": "do an intensive course in the computer centre."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L32", "no": 32, "q": "The speaker warns the students that", "options": {"A": "internet materials can be unreliable.", "B": "downloaded information must be acknowledged.", "C": "computer access may be limited at times."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L33", "no": 33, "q": "The library is acquiring more CDs as a resource because", "options": {"A": "they are a cheap source of information.", "B": "they take up very little space.", "C": "they are more up to date than the reference books."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L34", "no": 34, "q": "Students are encouraged to use journals online because", "options": {"A": "the articles do not need to be returned to the shelves.", "B": "reading online is cheaper than photocopying articles.", "C": "the stock of printed articles is to be reduced."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L35", "no": 35, "q": "Why might some students continue to use reference books?", "options": {"A": "they can be taken away from the library", "B": "they provide information unavailable elsewhere", "C": "they can be borrowed for an extended loan period"}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L36", "no": 36, "q": "What is the responsibility of the Training Supervisor?", "options": {"A": "to supervise and support library staff", "B": "to provide orientation to the library facilities", "C": "to identify needs and inform section managers"}, "answer": ans("B"), "explain": explain("B")},
                        ],
                    },
                    {
                        "kind": "match",
                        "title": "Questions 37–40",
                        "instruction": "Which section of the university will help postgraduate students with their dissertations in the following ways?",
                        "boxTitle": "Sections",
                        "box": {
                            "A": "the postgraduate's own department or tutor",
                            "B": "library staff",
                            "C": "another section of the university",
                        },
                        "questions": [
                            {"id": "L37", "no": 37, "q": "training in specialised computer programs", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L38", "no": 38, "q": "advising on bibliography presentation", "answer": ans("A"), "explain": explain("A")},
                            {"id": "L39", "no": 39, "q": "checking the draft of the dissertation", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L40", "no": 40, "q": "providing language support", "answer": ans("C"), "explain": explain("C")},
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
            "title": "Questions 1–3",
            "instruction": "Reading Passage 1 has three sections, A–C. Choose the correct heading for each section.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "The expansion of international tourism in recent years",
                "ii": "How local communities can balance their own needs with the demands of wilderness tourism",
                "iii": "Fragile regions and the reasons for the expansion of tourism there",
                "iv": "Traditional methods of food-supply in fragile regions",
                "v": "Some of the disruptive effects of wilderness tourism",
                "vi": "The economic benefits of mass tourism",
            },
            "subTitle": "Sections",
            "questions": [
                {"id": "Q1", "no": 1, "q": "Section A", "answer": ans("iii"), "explain": explain("iii")},
                {"id": "Q2", "no": 2, "q": "Section B", "answer": ans("v"), "explain": explain("v")},
                {"id": "Q3", "no": 3, "q": "Section C", "answer": ans("ii"), "explain": explain("ii")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 4–9",
            "instruction": "Do the following statements reflect the opinion of the writer of Reading Passage 1?",
            "variant": "yn",
            "options": ["YES", "NO", "NOT GIVEN"],
            "questions": [
                {"id": "Q4", "no": 4, "q": "The low financial cost of setting up wilderness tourism makes it attractive to many countries.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q5", "no": 5, "q": "Deserts, mountains and Arctic regions are examples of environments that are both ecologically and culturally fragile.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q6", "no": 6, "q": "Wilderness tourism operates throughout the year in fragile areas.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q7", "no": 7, "q": "The spread of tourism in certain hill-regions has resulted in a fall in the amount of food produced locally.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q8", "no": 8, "q": "Traditional food-gathering in desert societies was distributed evenly over the year.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q9", "no": 9, "q": "Government handouts do more damage than tourism does to traditional patterns of food-gathering.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
        {
            "kind": "table",
            "title": "Questions 10–13",
            "instruction": "Complete the table below. Choose ONE WORD from Reading Passage 1 for each answer.",
            "tableTitle": "The positive ways in which some local communities have responded to tourism",
            "columns": ["People/Location", "Activity"],
            "rows": [
                ["Swiss Pays d'Enhaut", "Revived production of <Q n=\"10\">"],
                ["Arctic communities", "Operate <Q n=\"11\"> business"],
                ["Acoma and San Ildefonso", "Produce and sell <Q n=\"12\">"],
                ["Navajo and Hopi", "Produce and sell <Q n=\"13\">"],
            ],
            "questions": [
                {"id": "Q10", "no": 10, "answer": ans("cheese"), "explain": explain("cheese")},
                {"id": "Q11", "no": 11, "answer": ans("tourism", "tourist", "tour"), "explain": explain("tourism", "tourist", "tour")},
                {"id": "Q12", "no": 12, "answer": ans("pottery"), "explain": explain("pottery")},
                {"id": "Q13", "no": 13, "answer": ans("jewellery", "jewelry"), "explain": explain("jewellery", "jewelry")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–17",
            "instruction": "Look at the following people and the list of statements below. Match each person with the correct statement.",
            "boxTitle": "List of Statements",
            "box": {
                "A": "suggests that publicity about nickel sulphide failure has been suppressed",
                "B": "regularly sees cases of nickel sulphide failure",
                "C": "closely examined all the glass in one building",
                "D": "was involved with the construction of Bishops Walk",
                "E": "recommended the rebuilding of Waterfront Place",
                "F": "thinks the benefits of toughened glass are exaggerated",
                "G": "claims that nickel sulphide failure is very unusual",
                "H": "refers to the most extreme case of delayed failure",
            },
            "questions": [
                {"id": "Q14", "no": 14, "q": "Brian Waldron", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q15", "no": 15, "q": "Trevor Ford", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q16", "no": 16, "q": "Graham Dodd", "answer": ans("H"), "explain": explain("H")},
                {"id": "Q17", "no": 17, "q": "John Barry", "answer": ans("C"), "explain": explain("C")},
            ],
        },
        {
            "kind": "wbank",
            "title": "Questions 18–23",
            "instruction": "Complete the summary with the list of words, A–P.",
            "boxCols": 4,
            "box": {
                "A": "numerous", "B": "detected", "C": "quickly", "D": "agreed",
                "E": "warm", "F": "sharp", "G": "expands", "H": "slowly",
                "I": "unexpectedly", "J": "removed", "K": "contracts", "L": "disputed",
                "M": "cold", "N": "moved", "O": "small", "P": "calculated",
            },
            "noteTitle": "Toughened Glass",
            "lines": [
                {"html": "Toughened glass is favoured by architects because it is much stronger than ordinary glass, and the fragments are not as <Q n=\"18\"> when it breaks. However, it has one disadvantage: it can shatter <Q n=\"19\">. This fault is a result of the manufacturing process. Ordinary glass is first heated, then cooled very <Q n=\"20\">. The outer layer <Q n=\"21\"> before the inner layer, and the tension between the two layers which is created because of this makes the glass stronger. However, if the glass contains nickel sulphide impurities, crystals of nickel sulphide are formed. These are unstable, and can expand suddenly, particularly if the weather is <Q n=\"22\">. If this happens, the pane of glass may break. The frequency with which such problems occur is <Q n=\"23\"> by glass experts. Furthermore, the crystals cannot be detected without sophisticated equipment."},
            ],
            "questions": [
                {"id": "Q18", "no": 18, "answer": ans("F"), "explain": explain("F")},
                {"id": "Q19", "no": 19, "answer": ans("I"), "explain": explain("I")},
                {"id": "Q20", "no": 20, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q21", "no": 21, "answer": ans("K"), "explain": explain("K")},
                {"id": "Q22", "no": 22, "answer": ans("E"), "explain": explain("E")},
                {"id": "Q23", "no": 23, "answer": ans("L"), "explain": explain("L")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 24–26",
            "instruction": "Do the following statements agree with the information given in Reading Passage 2?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q24", "no": 24, "q": "Little doubt was expressed about the reason for the Bishops Walk accident.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q25", "no": 25, "q": "Toughened glass has the same appearance as ordinary glass.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q26", "no": 26, "q": "There is plenty of documented evidence available about the incidence of nickel sulphide failure.", "answer": ans("FALSE"), "explain": explain("FALSE")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "tfng",
            "title": "Questions 27–33",
            "instruction": "Do the following statements agree with the information given in Reading Passage 3?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q27", "no": 27, "q": "There is plenty of scientific evidence to support photoperiodism.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q28", "no": 28, "q": "Some types of bird can be encouraged to breed out of season.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q29", "no": 29, "q": "Photoperiodism is restricted to certain geographic areas.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q30", "no": 30, "q": "Desert annuals are examples of long-day plants.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q31", "no": 31, "q": "Bamboos flower several times during their life cycle.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q32", "no": 32, "q": "Scientists have yet to determine the cue for Chusquea abietifolia's seasonal rhythm.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q33", "no": 33, "q": "Eastern hemlock is a fast-growing plant.", "answer": ans("FALSE"), "explain": explain("FALSE")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 34–40",
            "instruction": "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "34 Day length is a useful cue for breeding in areas where <Q n=\"34\"> are unpredictable."},
                {"plain": True, "html": "35 Plants which do not respond to light levels are referred to as <Q n=\"35\">"},
                {"plain": True, "html": "36 Birds in temperate climates associate longer days with nesting and the availability of <Q n=\"36\">"},
                {"plain": True, "html": "37 Plants that flower when days are long often depend on <Q n=\"37\"> to help them reproduce."},
                {"plain": True, "html": "38 Desert annuals respond to <Q n=\"38\"> as a signal for reproduction."},
                {"plain": True, "html": "39 There is no limit to the photosynthetic rate in plants such as <Q n=\"39\">"},
                {"plain": True, "html": "40 Tolerance to shade is one criterion for the <Q n=\"40\"> of plants in forestry and horticulture."},
            ],
            "questions": [
                {"id": "Q34", "no": 34, "answer": ans("temperatures"), "explain": explain("temperatures")},
                {"id": "Q35", "no": 35, "answer": ans("day-neutral", "day-neutral plants"), "explain": explain("day-neutral", "day-neutral plants")},
                {"id": "Q36", "no": 36, "answer": ans("food", "food resources", "adequate food", "adequate food resources"), "explain": explain("food", "food resources", "adequate food")},
                {"id": "Q37", "no": 37, "answer": ans("insects", "fertilization by insects"), "explain": explain("insects", "fertilization by insects")},
                {"id": "Q38", "no": 38, "answer": ans("rainfall", "suitable rainfall"), "explain": explain("rainfall", "suitable rainfall")},
                {"id": "Q39", "no": 39, "answer": ans("sugarcane"), "explain": explain("sugarcane")},
                {"id": "Q40", "no": 40, "answer": ans("classification"), "explain": explain("classification")},
            ],
        },
    ]
    return {"meta": {"volume": 5, "testNo": 4}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The table below gives information about the underground railway systems in six cities.<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Underground Railway Systems",
                    "image": "cambridge-5-test-4-underground-railway.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Research indicates that the characteristics we are born with have "
                "much more influence on our personality and development than any experiences we may have in our life.<br><br>"
                "Which do you consider to be the major influence?<br><br>"
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
        dst = LISTENING_DIR / f"ielts5_test4_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    dst = WRITING_DIR / "cambridge-5-test-4-underground-railway.png"
    if not RAILWAY_SRC.exists():
        raise FileNotFoundError(RAILWAY_SRC)
    shutil.copy2(RAILWAY_SRC, dst)
    print(f"copied image -> {dst.relative_to(ROOT)}")


def write_page(template: Path, out: Path, test: dict, patch_meta, *, reading: bool = False) -> None:
    html = template.read_text(encoding="utf-8")
    html = replace_test(html, test)
    html = patch_meta(html)
    html = patch_scoring(html, reading=reading)
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
    write_page(TPL_READING, OUT_READING, reading_test(), patch_reading_meta, reading=True)
    write_page(TPL_WRITING, OUT_WRITING, writing_test(), patch_writing_meta)
    return run_checks([OUT_LISTENING, OUT_READING, OUT_WRITING])


if __name__ == "__main__":
    raise SystemExit(main())
