#!/usr/bin/env python3
"""Generate Cambridge IELTS 7 Test 2 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑7T2.docx")
BOAT_MAP_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_17.35.32-04893f4a-4454-4636-bba9-f36196120dbc.png"
)
MEAT_GRAPH_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_17.35.43-a1c6e5ac-0814-49e6-9d5a-236a489bcd08.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS7 Test2 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS7 Test2 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS7 Test2 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS7 Test2 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-7-test-2.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-7-test-2-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-7-test-2-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-7-test-1.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-7-test-1-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-7-test-1-writing.html"

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
    if "if(g.kind==='note'){\n    body=`" in html:
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
        ("剑桥雅思7 Test 1 听力", "剑桥雅思7 Test 2 听力"),
        ("剑桥雅思7 · Test 1（听力）", "剑桥雅思7 · Test 2（听力）"),
        ("剑桥雅思7 Test 1 听力：", "剑桥雅思7 Test 2 听力："),
        ("Test 1 听力（官方原题 + 官方答案）", "Test 2 听力（官方原题 + 官方答案）"),
        ("test-1", "test-2"),
        ("ielts7_test1", "ielts7_test2"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    return patch_note_image(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思7 Test 1 阅读", "剑桥雅思7 Test 2 阅读"),
        ("剑桥雅思7 · Test 1（阅读）", "剑桥雅思7 · Test 2（阅读）"),
        ("剑桥雅思7 Test 1 学术类阅读", "剑桥雅思7 Test 2 学术类阅读"),
        ("Test 1 阅读（官方原题 + 官方答案）", "Test 2 阅读（官方原题 + 官方答案）"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思7 Test 1 写作", "剑桥雅思7 Test 2 写作"),
        ("剑桥雅思7 · Test 1（写作）", "剑桥雅思7 · Test 2（写作）"),
        ("剑桥雅思7 Test 1 学术类写作", "剑桥雅思7 Test 2 学术类写作"),
        (
            "Task 1 consumer expenditure table + Task 2 talent and training essay",
            "Task 1 fish and meat consumption graph + Task 2 fixed punishments essay",
        ),
        ("Test 1 写作（官方真题）", "Test 2 写作（官方真题）"),
        ("cambridge-7-test-1-writing-draft", "cambridge-7-test-2-writing-draft"),
        ("【剑桥雅思7 · Test 1 写作】", "【剑桥雅思7 · Test 2 写作】"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
        ("expenditure", "fish-meat"),
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


def section_para(letter: str, *chunks: str) -> str:
    text = " ".join(c.strip() for c in chunks if c.strip())
    if text.startswith(f"{letter} "):
        text = text[2:]
    return f'<span class="para-label">{letter}</span>{text}'


def reading_passages() -> list[dict]:
    paras = extract_docx_paras(DOCX)
    p1_paras = paras[138:147]
    p2_paras = [labeled_para(x) for x in paras[185:192]]
    p3_paras = [
        section_para("A", paras[210], paras[211]),
        section_para("B", paras[212], paras[213]),
        section_para("C", paras[214], paras[215], paras[216], paras[217], paras[218]),
        section_para("D", paras[219], paras[220], paras[221], paras[222], paras[223], paras[224]),
        section_para("E", paras[225]),
        section_para("F", paras[226], paras[227]),
    ]
    return [
        {"id": 1, "passage": {"title": paras[137], "paras": p1_paras}},
        {"id": 2, "passage": {"title": paras[184], "paras": p2_paras}},
        {"id": 3, "passage": {"title": paras[209], "paras": p3_paras}},
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 7, "testNo": 2},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "ielts7_test2_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–10",
                        "instruction": "Complete the form below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "CAR INSURANCE",
                        "lines": [
                            {"plain": True, "html": "Example: Name: Patrick Jones"},
                            {"plain": True, "html": "Address: <Q n=\"1\">"},
                            {"plain": True, "html": "Occupation: <Q n=\"2\">"},
                            {"plain": True, "html": "Type of car:"},
                            {"bullet": True, "html": "Manufacturer: Hewton"},
                            {"bullet": True, "html": "Model: <Q n=\"3\">"},
                            {"plain": True, "html": "Previous insurance company: <Q n=\"4\">"},
                            {"bullet": True, "html": "Year: 1997"},
                            {"plain": True, "html": "Any insurance claims in the last five years? Yes"},
                            {"plain": True, "html": "If yes, give brief details: Car was <Q n=\"5\"> in 1999"},
                            {"plain": True, "html": "Name(s) of other driver(s): Simon <Q n=\"6\">"},
                            {"plain": True, "html": "Relationship to main driver: <Q n=\"7\">"},
                            {"plain": True, "html": "Uses of car: social; <Q n=\"8\">"},
                            {"plain": True, "html": "Start date: 31 January"},
                            {"h": "Recommended Insurance arrangement"},
                            {"bullet": True, "html": "Name of company: <Q n=\"9\">"},
                            {"bullet": True, "html": "Annual cost: £<Q n=\"10\">"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("27 Bank Road"), "explain": explain("27 Bank Road")},
                            {"id": "L2", "no": 2, "answer": ans("dentist", "a dentist"), "explain": explain("dentist", "a dentist")},
                            {"id": "L3", "no": 3, "answer": ans("Sable"), "explain": explain("Sable")},
                            {"id": "L4", "no": 4, "answer": ans("Northern Star"), "explain": explain("Northern Star")},
                            {"id": "L5", "no": 5, "answer": ans("stolen"), "explain": explain("stolen")},
                            {"id": "L6", "no": 6, "answer": ans("Paynter"), "explain": explain("Paynter")},
                            {"id": "L7", "no": 7, "answer": ans("brother-in-law", "brother in law"), "explain": explain("brother-in-law")},
                            {"id": "L8", "no": 8, "answer": ans("travelling to work", "traveling to work", "travelling to work", "travel to work"), "explain": explain("travelling to work", "traveling to work")},
                            {"id": "L9", "no": 9, "answer": ans("Red Flag"), "explain": explain("Red Flag")},
                            {"id": "L10", "no": 10, "answer": ans("450"), "explain": explain("450")},
                        ],
                    }
                ],
            },
            {
                "id": 2,
                "audio": "ielts7_test2_audio2.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 11 and 12",
                        "instruction": "Label the map below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Boat Trip",
                        "image": "cambridge-7-test-2-boat-trip-map.png",
                        "lines": [
                            {"plain": True, "html": "STOP B: <Q n=\"11\">"},
                            {"plain": True, "html": "STOP D: <Q n=\"12\">"},
                        ],
                        "questions": [
                            {"id": "L11", "no": 11, "answer": ans("City Bridge"), "explain": explain("City Bridge")},
                            {"id": "L12", "no": 12, "answer": ans("Newtown"), "explain": explain("Newtown")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 13–18",
                        "instruction": "Complete the table below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "cols": ["Attraction", "Further Information"],
                        "rows": [
                            ["Main Booking Office", "First boat: 8 a.m.; Last boat: <Q n=\"13\"> p.m."],
                            ["Palace", "has lovely <Q n=\"14\">"],
                            ["<Q n=\"15\">", "has good <Q n=\"16\"> of city centre"],
                            ["<Q n=\"17\">", "history"],
                            ["<Q n=\"18\">", "cinema, bowling alley, video games arcade"],
                        ],
                        "questions": [
                            {"id": "L13", "no": 13, "answer": ans("6.30", "6:30"), "explain": explain("6.30", "6:30")},
                            {"id": "L14", "no": 14, "answer": ans("formal garden", "formal gardens"), "explain": explain("formal garden", "formal gardens")},
                            {"id": "L15", "no": 15, "answer": ans("Tower Restaurant", "the Tower Restaurant"), "explain": explain("Tower Restaurant", "the Tower Restaurant")},
                            {"id": "L16", "no": 16, "answer": ans("view", "views"), "explain": explain("view", "views")},
                            {"id": "L17", "no": 17, "answer": ans("history"), "explain": explain("history")},
                            {"id": "L18", "no": 18, "answer": ans("7 screen", "seven screen"), "explain": explain("7 screen", "seven screen")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 19 and 20",
                        "instruction": "Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "lines": [
                            {"plain": True, "html": "19 How often do the Top Bus Company tours run? <Q n=\"19\">"},
                            {"plain": True, "html": "20 Where can you catch a Number One Sightseeing Tour from? <Q n=\"20\">"},
                        ],
                        "questions": [
                            {"id": "L19", "no": 19, "answer": ans("every 20 minutes", "20 minutes"), "explain": explain("every 20 minutes", "20 minutes")},
                            {"id": "L20", "no": 20, "answer": ans("Central Station", "the Central Station", "from the Central Station"), "explain": explain("Central Station", "the Central Station")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "ielts7_test2_audio3.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 21–26",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L21", "no": 21, "q": "The Antarctic Centre was established in Christchurch because", "options": {"A": "New Zealand is a member of the Antarctic Treaty.", "B": "Christchurch is geographically well positioned.", "C": "the climate of Christchurch is suitable."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L22", "no": 22, "q": "One role of the Antarctic Centre is to", "options": {"A": "provide expeditions with suitable equipment.", "B": "provide researchers with financial assistance.", "C": "ensure that research is internationally relevant."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L23", "no": 23, "q": "The purpose of the Visitors' Centre is to", "options": {"A": "provide accommodation.", "B": "run training sessions.", "C": "show people what Antarctica is like."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L24", "no": 24, "q": "Dr Merrywhether says that Antarctica is", "options": {"A": "unlike any other country.", "B": "extremely beautiful.", "C": "too cold for tourists."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L25", "no": 25, "q": "According to Dr Merrywhether, Antarctica is very cold because", "options": {"A": "of the shape of the continent.", "B": "it is surrounded by a frozen sea.", "C": "it is an extremely dry continent."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L26", "no": 26, "q": "Dr Merrywhether thinks Antarctica was part of another continent because", "options": {"A": "he has done his own research in the area.", "B": "there is geological evidence of this.", "C": "it is very close to South America."}, "answer": ans("B"), "explain": explain("B")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 27 and 28",
                        "instruction": "Complete the table below. Write ONE WORD AND/OR TWO NUMBERS for each answer.",
                        "tableTitle": "ANTARCTIC TREATY",
                        "cols": ["Date", "Event"],
                        "rows": [
                            ["1870", "Polar Research meeting"],
                            ["<Q n=\"27\">", "1st International Polar Year"],
                            ["1957", "Antarctic Treaty was proposed"],
                            ["1959", "Antarctic Treaty was <Q n=\"28\">"],
                        ],
                        "questions": [
                            {"id": "L27", "no": 27, "answer": ans("1882 to 1883", "1882-1883", "1882 and 1883"), "explain": explain("1882 to 1883", "1882-1883")},
                            {"id": "L28", "no": 28, "answer": ans("signed"), "explain": explain("signed")},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 29 and 30",
                        "instruction": "Choose TWO letters, A–E. Which TWO achievements of the Antarctic Treaty are mentioned by the speakers?",
                        "box": {
                            "A": "no military use",
                            "B": "animals protected",
                            "C": "historic sites preserved",
                            "D": "no nuclear testing",
                            "E": "fishing rights protected",
                        },
                        "answerSet": ["A", "D"],
                        "questions": [
                            {"id": "L29", "no": 29, "explain": "答案：A 与 D，顺序不限。"},
                            {"id": "L30", "no": 30, "explain": "答案：A 与 D，顺序不限。"},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "ielts7_test2_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 31–35",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L31", "no": 31, "q": "Anita first felt the Matthews article was of value when she realised", "options": {"A": "how it would help her difficulties with left-handedness.", "B": "the relevance of connections he made with music.", "C": "the impressive size of his research project."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L32", "no": 32, "q": "Anita feels that the findings on handedness will be of value in", "options": {"A": "helping sportspeople identify their weaknesses.", "B": "aiding sportspeople as they plan tactics for each game.", "C": "developing suitable training programmes for sportspeople."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L33", "no": 33, "q": "Anita feels that most sports coaches", "options": {"A": "know nothing about the influence of handedness.", "B": "focus on the wrong aspects of performance.", "C": "underestimate what science has to offer sport."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L34", "no": 34, "q": "A German study showed there was greater 'mixed handedness' in musicians who", "options": {"A": "started playing instruments in early youth.", "B": "play a string instrument such as the violin.", "C": "practise a great deal on their instrument."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L35", "no": 35, "q": "Studies on ape behaviour show that", "options": {"A": "apes which always use the same hand to get food are most successful.", "B": "apes have the same proportion of left- and right-handers as humans.", "C": "more apes are left-handed than right-handed."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 36–40",
                        "instruction": "Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "cols": ["Sport", "Best laterality", "Comments"],
                        "rows": [
                            ["Hockey", "mixed laterality", "hockey stick has to be used in <Q n=\"36\">; mixed-handed players found to be much more <Q n=\"37\"> than others"],
                            ["Tennis", "single laterality", "gives a larger relevant field of <Q n=\"38\">; cross-lateral players make <Q n=\"39\"> late"],
                            ["Gymnastics", "cross laterality", "gymnasts' <Q n=\"40\"> is important for performances"],
                        ],
                        "questions": [
                            {"id": "L36", "no": 36, "answer": ans("2 directions", "two directions"), "explain": explain("2 directions", "two directions")},
                            {"id": "L37", "no": 37, "answer": ans("confident"), "explain": explain("confident")},
                            {"id": "L38", "no": 38, "answer": ans("vision"), "explain": explain("vision")},
                            {"id": "L39", "no": 39, "answer": ans("corrections"), "explain": explain("corrections")},
                            {"id": "L40", "no": 40, "answer": ans("balance"), "explain": explain("balance")},
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
            "kind": "tfng",
            "title": "Questions 1–4",
            "instruction": "Do the following statements agree with the claims of the writer in Reading Passage 1?",
            "variant": "yn",
            "questions": [
                {"id": "Q1", "no": 1, "q": "Only two Japanese pagodas have collapsed in 1400 years.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q2", "no": 2, "q": "The Hanshin earthquake of 1995 destroyed the pagoda at the Toji temple.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q3", "no": 3, "q": "The other buildings near the Toji pagoda had been built in the last 30 years.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q4", "no": 4, "q": "The builders of pagodas knew how to absorb some of the power produced by severe weather conditions.", "answer": ans("YES"), "explain": explain("YES")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 5–10",
            "instruction": "Classify the following as typical of A both Chinese and Japanese pagodas, B only Chinese pagodas, or C only Japanese pagodas.",
            "boxTitle": "Pagoda types",
            "box": {
                "A": "both Chinese and Japanese pagodas",
                "B": "only Chinese pagodas",
                "C": "only Japanese pagodas",
            },
            "questions": [
                {"id": "Q5", "no": 5, "q": "easy interior access to top", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q6", "no": 6, "q": "tiles on eaves", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q7", "no": 7, "q": "use as observation post", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q8", "no": 8, "q": "size of eaves up to half the width of the building", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q9", "no": 9, "q": "original religious purpose", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q10", "no": 10, "q": "floors fitting loosely over each other", "answer": ans("C"), "explain": explain("C")},
            ],
        },
        {
            "kind": "mcq",
            "title": "Questions 11–13",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q11", "no": 11, "q": "In a Japanese pagoda, the shinbashira", "options": {"A": "bears the full weight of the building.", "B": "bends under pressure like a tree.", "C": "connects the floors with the foundations.", "D": "stops the floors moving too far."}, "answer": ans("D"), "explain": explain("D")},
                {"id": "Q12", "no": 12, "q": "Shuzo Ishida performs experiments in order to", "options": {"A": "improve skyscraper design.", "B": "be able to build new pagodas.", "C": "learn about the dynamics of pagodas.", "D": "understand ancient mathematics."}, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q13", "no": 13, "q": "The storeys of a Japanese pagoda are", "options": {"A": "linked only by wood.", "B": "fastened only to the central pillar.", "C": "fitted loosely on top of each other.", "D": "joined by special weights."}, "answer": ans("C"), "explain": explain("C")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–17",
            "instruction": "Reading Passage 2 has seven paragraphs, A–G. Which paragraph contains the following information? NB You may use any letter more than once.",
            "boxTitle": "Paragraphs",
            "box": {
                "A": "Paragraph A",
                "B": "Paragraph B",
                "C": "Paragraph C",
                "D": "Paragraph D",
                "E": "Paragraph E",
                "F": "Paragraph F",
                "G": "Paragraph G",
            },
            "questions": [
                {"id": "Q14", "no": 14, "q": "a cost involved in purifying domestic water", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q15", "no": 15, "q": "the stages in the development of the farming industry", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q16", "no": 16, "q": "the term used to describe hidden costs", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q17", "no": 17, "q": "one effect of chemicals on water sources", "answer": ans("B"), "explain": explain("B")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 18–21",
            "instruction": "Do the following statements agree with the claims of the writer in Reading Passage 2?",
            "variant": "yn",
            "questions": [
                {"id": "Q18", "no": 18, "q": "Several species of wildlife in the British countryside are declining.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q19", "no": 19, "q": "The taste of food has deteriorated in recent years.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q20", "no": 20, "q": "The financial costs of environmental damage are widely recognised.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q21", "no": 21, "q": "One of the costs calculated by Professor Pretty was illness caused by food.", "answer": ans("YES"), "explain": explain("YES")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 22–26",
            "instruction": "Complete the summary below. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
            "noteTitle": "The true cost of food",
            "lines": [
                {
                    "plain": True,
                    "html": "Professor Pretty concludes that our <Q n=\"22\"> are higher than most people realise, because we make three different types of payment. He feels it is realistic to suggest that Britain should reduce its reliance on <Q n=\"23\">. Although most farmers would be unable to adapt to <Q n=\"24\">, Professor Pretty wants the government to initiate change by establishing what he refers to as a <Q n=\"25\">. He feels this would help to change the attitudes of both <Q n=\"26\"> (farmers and consumers).",
                }
            ],
            "questions": [
                {"id": "Q22", "no": 22, "answer": ans("food bills"), "explain": explain("food bills")},
                {"id": "Q23", "no": 23, "answer": ans("industrial agriculture"), "explain": explain("industrial agriculture")},
                {"id": "Q24", "no": 24, "answer": ans("organic farming"), "explain": explain("organic farming")},
                {"id": "Q25", "no": 25, "answer": ans("Greener Food Standard"), "explain": explain("Greener Food Standard")},
                {"id": "Q26", "no": 26, "answer": ans("farmers", "consumers", "farmers and consumers"), "explain": explain("farmers", "consumers")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 27–30",
            "instruction": "Reading Passage 3 has six sections, A–F. Choose the correct heading for sections B, C, E and F. Example: Section A = vi; Section D = ix.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "MIRTP as a future model",
                "ii": "Identifying the main transport problems",
                "iii": "Preference for motorised vehicles",
                "iv": "Government authorities' instructions",
                "v": "Initial improvements in mobility and transport modes",
                "vi": "Request for improved transport in Makete",
                "vii": "Transport improvements in the northern part of the district",
                "viii": "Improvements in the rail network",
                "ix": "Effects of initial MIRTP measures",
                "x": "Co-operation of district officials",
                "xi": "Role of wheelbarrows and donkeys",
            },
            "questions": [
                {"id": "Q27", "no": 27, "q": "Section B", "answer": ans("ii"), "explain": explain("ii")},
                {"id": "Q28", "no": 28, "q": "Section C", "answer": ans("v"), "explain": explain("v")},
                {"id": "Q29", "no": 29, "q": "Section E", "answer": ans("x"), "explain": explain("x")},
                {"id": "Q30", "no": 30, "q": "Section F", "answer": ans("i"), "explain": explain("i")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 31–35",
            "instruction": "Do the following statements agree with the claims of the writer in Reading Passage 3?",
            "variant": "yn",
            "questions": [
                {"id": "Q31", "no": 31, "q": "MIRTP was divided into five phases.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q32", "no": 32, "q": "Prior to the start of MIRTP the Makete district was almost inaccessible during the rainy season.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q33", "no": 33, "q": "Phase I of MIRTP consisted of a survey of household expenditure on transport.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q34", "no": 34, "q": "The survey concluded that one-fifth or 20% of the household transport requirement was outside the local area.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q35", "no": 35, "q": "MIRTP hoped to improve the movement of goods from Makete district to the country's capital.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 36–39",
            "instruction": "Look at the following statements and the list of statements A–J. Match each statement with the correct letter.",
            "boxTitle": "List of Statements",
            "box": {
                "A": "provided the people of Makete with experience in running bus and truck services.",
                "B": "was especially successful in the northern part of the district.",
                "C": "differed from earlier phases in that the community became less actively involved.",
                "D": "improved paths used for transport up and down hillsides.",
                "E": "was no longer a problem once the roads had been improved.",
                "F": "cost less than locally made wheelbarrows.",
                "G": "was done only at the request of local people who were willing to lend a hand.",
                "H": "was at first considered by MIRTP to be affordable for the people of the district.",
                "I": "hindered attempts to make the existing transport services more efficient.",
                "J": "was thought to be the most important objective of Phase III.",
            },
            "questions": [
                {"id": "Q36", "no": 36, "q": "Construction of footbridges, steps and handrails", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q37", "no": 37, "q": "Frequent breakdown of buses and trucks in Makete", "answer": ans("I"), "explain": explain("I")},
                {"id": "Q38", "no": 38, "q": "The improvement of secondary roads and paths", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q39", "no": 39, "q": "The isolation of Makete for part of the year", "answer": ans("E"), "explain": explain("E")},
            ],
        },
        {
            "kind": "mcq",
            "title": "Question 40",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q40", "no": 40, "q": "Which of the following phrases best describes the main aim of Reading Passage 3?", "options": {"A": "to suggest that projects such as MIRTP are needed in other countries", "B": "to describe how MIRTP was implemented and how successful it was", "C": "to examine how MIRTP promoted the use of donkeys", "D": "to warn that projects such as MIRTP are likely to have serious problems"}, "answer": ans("B"), "explain": explain("B")},
            ],
        },
    ]
    return {"meta": {"volume": 7, "testNo": 2}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The graph below shows the consumption of fish and some different kinds of meat "
                "in a European country between 1979 and 2004.<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Fish and meat consumption (1979–2004)",
                    "image": "cambridge-7-test-2-fish-meat.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Some people believe that there should be fixed punishments "
                "for each type of crime. Others, however, argue that the circumstances of an individual "
                "crime, and the motivation for committing it, should always be taken into account "
                "when deciding on the punishment.<br><br>"
                "Discuss both these views and give your own opinion.<br><br>"
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
        dst = LISTENING_DIR / f"ielts7_test2_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    map_dst = LISTENING_DIR / "cambridge-7-test-2-boat-trip-map.png"
    shutil.copy2(BOAT_MAP_SRC, map_dst)
    print(f"copied image -> {map_dst.relative_to(ROOT)}")
    graph_dst = WRITING_DIR / "cambridge-7-test-2-fish-meat.png"
    shutil.copy2(MEAT_GRAPH_SRC, graph_dst)
    print(f"copied image -> {graph_dst.relative_to(ROOT)}")


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
