#!/usr/bin/env python3
"""Generate Cambridge IELTS 6 Test 2 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑6T2.docx")
PROGRESS_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-02_14.31.55-e58e9bb4-7787-4995-a14f-790cebe6b2dc.png"
)
TRAVEL_MODES_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-02_14.32.06-7c4c87ed-1aa4-4642-ba7f-2df3276f83b3.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test2 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test2 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test2 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test2 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-6-test-2.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-6-test-2-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-6-test-2-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-6-test-1.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-6-test-1-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-6-test-1-writing.html"

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
        ("剑桥雅思6 Test 1 听力", "剑桥雅思6 Test 2 听力"),
        ("剑桥雅思6 · Test 1（听力）", "剑桥雅思6 · Test 2（听力）"),
        ("剑桥雅思6 Test 1 听力：", "剑桥雅思6 Test 2 听力："),
        ("Test 1 听力（官方原题 + 官方答案）", "Test 2 听力（官方原题 + 官方答案）"),
        ("剑桥雅思 6 · Test 1", "剑桥雅思 6 · Test 2"),
        ("剑桥雅思6 · Test 1", "剑桥雅思6 · Test 2"),
        ("test-1", "test-2"),
        ("ielts6_test1", "ielts6_test2"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思6 Test 1 阅读", "剑桥雅思6 Test 2 阅读"),
        ("剑桥雅思6 · Test 1（阅读）", "剑桥雅思6 · Test 2（阅读）"),
        ("剑桥雅思6 Test 1 学术类阅读", "剑桥雅思6 Test 2 学术类阅读"),
        ("Test 1 阅读（官方原题 + 官方答案）", "Test 2 阅读（官方原题 + 官方答案）"),
        ("剑桥雅思 6 · Test 1", "剑桥雅思 6 · Test 2"),
        ("剑桥雅思6 · Test 1", "剑桥雅思6 · Test 2"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思6 Test 1 写作", "剑桥雅思6 Test 2 写作"),
        ("剑桥雅思6 · Test 1（写作）", "剑桥雅思6 · Test 2（写作）"),
        ("剑桥雅思6 Test 1 学术类写作", "剑桥雅思6 Test 2 学术类写作"),
        (
            "Task 1 global water use graph + Task 2 consumer goods and advertising essay",
            "Task 1 travel modes table + Task 2 sports professionals earnings essay",
        ),
        ("剑桥雅思 6 · Test 1", "剑桥雅思 6 · Test 2"),
        ("剑桥雅思6 · Test 1", "剑桥雅思6 · Test 2"),
        ("Test 1 写作（官方真题）", "Test 2 写作（官方真题）"),
        ("cambridge-6-test-1-writing-draft", "cambridge-6-test-2-writing-draft"),
        ("【剑桥雅思6 · Test 1 写作】", "【剑桥雅思6 · Test 2 写作】"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
        ("water-use", "travel-modes"),
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


def para_label(letter: str, text: str) -> str:
    return f'<span class="para-label">{letter}</span>{text}'


def reading_passages() -> list[dict]:
    p = extract_docx_paras(DOCX)
    return [
        {
            "id": 1,
            "passage": {
                "title": "Public transport efficiency",
                "paras": [
                    para_label("A", " ".join(p[93:95])),
                    para_label("B", p[95]),
                    para_label("C", " ".join(p[96:98])),
                    para_label("D", " ".join(p[98:101])),
                    para_label("E", " ".join(p[101:105])),
                ],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": "Greying population",
                "paras": p[142:154],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": p[190],
                "paras": p[191:198],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 6, "testNo": 2},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "ielts6_test2_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–5",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "CHILDREN'S ART AND CRAFT WORKSHOPS",
                        "lines": [
                            {"plain": True, "html": "Example: Workshops organised every: Saturday"},
                            {"plain": True, "html": "Adults must accompany children under <Q n=\"1\">"},
                            {"plain": True, "html": "Cost: £2.50"},
                            {"plain": True, "html": "Workshops held in: Winter House, <Q n=\"2\"> Street"},
                            {"plain": True, "html": "Security device: must push the <Q n=\"3\"> to open door"},
                            {"plain": True, "html": "Should leave car behind the <Q n=\"4\">"},
                            {"plain": True, "html": "Book workshops by phoning the <Q n=\"5\"> (on 200765)"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("8"), "explain": explain("8")},
                            {"id": "L2", "no": 2, "answer": ans("Tamer"), "explain": explain("Tamer")},
                            {"id": "L3", "no": 3, "answer": ans("green button", "the green button"), "explain": explain("green button", "the green button")},
                            {"id": "L4", "no": 4, "answer": ans("library"), "explain": explain("library")},
                            {"id": "L5", "no": 5, "answer": ans("education department", "the education department"), "explain": explain("education department", "the education department")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 6–10",
                        "instruction": "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.",
                        "tableTitle": "Next two workshops",
                        "cols": ["Date", "Workshop", "Materials needed", "Comments"],
                        "rows": [
                            ["16/11", "'Building <Q n=\"6\">'", "<Q n=\"7\">", "<Q n=\"8\">"],
                            ["23/11", "<Q n=\"9\">", "<Q n=\"10\">", "(Nothing special)"],
                        ],
                        "questions": [
                            {"id": "L6", "no": 6, "answer": ans("castles"), "explain": explain("castles")},
                            {"id": "L7", "no": 7, "answer": ans("old clothes"), "explain": explain("old clothes")},
                            {"id": "L8", "no": 8, "answer": ans("bottle tops", "bottle tops"), "explain": explain("bottle tops")},
                            {"id": "L9", "no": 9, "answer": ans("Undersea Worlds"), "explain": explain("Undersea Worlds")},
                            {"id": "L10", "no": 10, "answer": ans("silver paper"), "explain": explain("silver paper")},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "ielts6_test2_audio2.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 11–14",
                        "instruction": "Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "TRAIN INFORMATION",
                        "lines": [
                            {"plain": True, "html": "11 Local services depart from <Q n=\"11\"> railway station."},
                            {"plain": True, "html": "12 National services depart from the <Q n=\"12\"> railway station."},
                            {"plain": True, "html": "13 Trains for London depart every <Q n=\"13\"> each day during the week."},
                            {"plain": True, "html": "14 The price of a first class ticket includes <Q n=\"14\">"},
                        ],
                        "questions": [
                            {"id": "L11", "no": 11, "answer": ans("King Street"), "explain": explain("King Street")},
                            {"id": "L12", "no": 12, "answer": ans("central"), "explain": explain("central")},
                            {"id": "L13", "no": 13, "answer": ans("half hour", "30 minutes", "half an hour"), "explain": explain("half hour", "30 minutes", "half an hour")},
                            {"id": "L14", "no": 14, "answer": ans("refreshments"), "explain": explain("refreshments")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 15–17",
                        "instruction": "Complete the table below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "cols": ["Type of ticket", "Details"],
                        "rows": [
                            ["Standard open", "no restrictions"],
                            ["Supersave", "travel after 8.45"],
                            ["Special", "travel after <Q n=\"15\"> and at weekends"],
                            ["<Q n=\"16\">", "buy at least six days ahead; limited numbers; <Q n=\"17\"> essential"],
                        ],
                        "questions": [
                            {"id": "L15", "no": 15, "answer": ans("10.15"), "explain": explain("10.15")},
                            {"id": "L16", "no": 16, "answer": ans("Advance"), "explain": explain("Advance")},
                            {"id": "L17", "no": 17, "answer": ans("reservations", "seat reservations"), "explain": explain("reservations", "seat reservations")},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 18–20",
                        "instruction": "Choose THREE letters, A–G. Which THREE attractions can you visit at present by train from Trebirch?",
                        "box": {
                            "A": "a science museum",
                            "B": "a theme park",
                            "C": "a climbing wall",
                            "D": "a mining museum",
                            "E": "an aquarium",
                            "F": "a castle",
                            "G": "a zoo",
                        },
                        "answerSet": ["C", "D", "G"],
                        "questions": [
                            {"id": "L18", "no": 18, "explain": "答案：C、D、G，顺序不限。"},
                            {"id": "L19", "no": 19, "explain": "答案：C、D、G，顺序不限。"},
                            {"id": "L20", "no": 20, "explain": "答案：C、D、G，顺序不限。"},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "ielts6_test2_audio3.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 21–30",
                        "instruction": "Complete the tables below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "Progress Review / Future Planning",
                        "image": "cambridge-6-test-2-progress-review.png",
                        "lines": [
                            {"h": "Progress Review"},
                            {"plain": True, "html": "Investigate software — Read IT <Q n=\"21\">"},
                            {"plain": True, "html": "Spoken to Jane Prince, Head of the <Q n=\"22\">"},
                            {"plain": True, "html": "Prepare a <Q n=\"23\"> for survey"},
                            {"plain": True, "html": "Add questions in section three on <Q n=\"24\">"},
                            {"plain": True, "html": "Ericsson's essays on managing the <Q n=\"25\">"},
                            {"h": "Future Planning"},
                            {"plain": True, "html": "Chapter 1 title: Context <Q n=\"26\">"},
                            {"plain": True, "html": "Add statistics on the <Q n=\"27\"> in various zones"},
                            {"plain": True, "html": "Include references to works dated after <Q n=\"28\">"},
                            {"plain": True, "html": "Timing: by the <Q n=\"29\">"},
                            {"plain": True, "html": "Before starting the <Q n=\"30\">"},
                        ],
                        "questions": [
                            {"id": "L21", "no": 21, "answer": ans("catalogs", "catalogues", "catalog(ue)s"), "explain": explain("catalogs", "catalogues", "catalog(ue)s")},
                            {"id": "L22", "no": 22, "answer": ans("computer centre", "computer center"), "explain": explain("computer centre", "computer center")},
                            {"id": "L23", "no": 23, "answer": ans("checklist"), "explain": explain("checklist")},
                            {"id": "L24", "no": 24, "answer": ans("teaching experience"), "explain": explain("teaching experience")},
                            {"id": "L25", "no": 25, "answer": ans("classroom"), "explain": explain("classroom")},
                            {"id": "L26", "no": 26, "answer": ans("review"), "explain": explain("review")},
                            {"id": "L27", "no": 27, "answer": ans("schools"), "explain": explain("schools")},
                            {"id": "L28", "no": 28, "answer": ans("2000", "the year 2000"), "explain": explain("2000", "the year 2000")},
                            {"id": "L29", "no": 29, "answer": ans("end of term"), "explain": explain("end of term")},
                            {"id": "L30", "no": 30, "answer": ans("research"), "explain": explain("research")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "ielts6_test2_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 31–37",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L31", "no": 31, "q": "Some photographs of a horse running showed", "options": {"A": "all feet off the ground.", "B": "at least one foot on the ground.", "C": "two feet off the ground."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L32", "no": 32, "q": "The Scotsman employed by Edison", "options": {"A": "designed a system to use the technology Edison had invented.", "B": "used available technology to make a new system.", "C": "was already an expert in motion picture technology."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L33", "no": 33, "q": "One major problem with the first system was that", "options": {"A": "only one person could be filmed.", "B": "people could only see very short films.", "C": "the camera was very heavy."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L34", "no": 34, "q": "Rival systems started to appear in Europe after people had", "options": {"A": "been told about the American system.", "B": "seen the American system.", "C": "used the American system."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L35", "no": 35, "q": "In 1895, a famous new system was developed by", "options": {"A": "a French team working alone.", "B": "a French and German team working together.", "C": "a German team who invented the word 'cinema'."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L36", "no": 36, "q": "Longer films were not made at the time because of problems involving", "options": {"A": "the subject matter.", "B": "the camera.", "C": "the film projector."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L37", "no": 37, "q": "The 'Lantham Loop' invention relied on", "options": {"A": "removing tension between the film reels.", "B": "adding three more film reels to the system.", "C": "making one of the film reels more effective."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 38–40",
                        "instruction": "Complete the sentences below. Write NO MORE THAN THREE WORDS for each answer.",
                        "lines": [
                            {"plain": True, "html": "38 The first motion picture was called <Q n=\"38\">"},
                            {"plain": True, "html": "39 <Q n=\"39\"> were used for the first time on film in 1926."},
                            {"plain": True, "html": "40 Subtitles were added to The Lights of New York because of its <Q n=\"40\">"},
                        ],
                        "questions": [
                            {"id": "L38", "no": 38, "answer": ans("Great Train Robbery", "The Great Train Robbery"), "explain": explain("Great Train Robbery", "The Great Train Robbery")},
                            {"id": "L39", "no": 39, "answer": ans("Sound effects"), "explain": explain("Sound effects")},
                            {"id": "L40", "no": 40, "answer": ans("poor sound quality"), "explain": explain("poor sound quality")},
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
            "title": "Questions 1–5",
            "instruction": "Reading Passage 1 has five marked paragraphs, A–E. Choose the correct heading for each paragraph from the list below.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "Avoiding an overcrowded centre",
                "ii": "A successful exercise in people power",
                "iii": "The benefits of working together in cities",
                "iv": "Higher incomes need not mean more cars",
                "v": "Economic arguments fail to persuade",
                "vi": "The impact of telecommunications on population distribution",
                "vii": "Increases in travelling time",
                "viii": "Responding to arguments against public transport",
            },
            "questions": [
                {"id": "Q1", "no": 1, "q": "Paragraph A", "answer": ans("ii"), "explain": explain("ii")},
                {"id": "Q2", "no": 2, "q": "Paragraph B", "answer": ans("vii"), "explain": explain("vii")},
                {"id": "Q3", "no": 3, "q": "Paragraph C", "answer": ans("iv"), "explain": explain("iv")},
                {"id": "Q4", "no": 4, "q": "Paragraph D", "answer": ans("i"), "explain": explain("i")},
                {"id": "Q5", "no": 5, "q": "Paragraph E", "answer": ans("iii"), "explain": explain("iii")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 6–10",
            "instruction": "Do the following statements agree with the information given in Reading Passage 1?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q6", "no": 6, "q": "The ISTP study examined public and private systems in every city of the world.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q7", "no": 7, "q": "Efficient cities can improve the quality of life for their inhabitants.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q8", "no": 8, "q": "An inner-city tram network is dangerous for car drivers.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q9", "no": 9, "q": "In Melbourne, people prefer to live in the outer suburbs.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q10", "no": 10, "q": "Cities with high levels of bicycle usage can be efficient even when public transport is only averagely good.", "answer": ans("TRUE"), "explain": explain("TRUE")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 11–13",
            "instruction": "Look at the following cities and the list of descriptions below. Match each city with the correct description.",
            "boxTitle": "List of Descriptions",
            "box": {
                "A": "successfully uses a light rail transport system in hilly environment",
                "B": "successful public transport system despite cold winters",
                "C": "profitably moved from road to light rail transport system",
                "D": "hilly and inappropriate for rail transport system",
                "E": "heavily dependent on cars despite widespread poverty",
                "F": "inefficient due to a limited public transport system",
            },
            "subTitle": "Cities",
            "questions": [
                {"id": "Q11", "no": 11, "q": "Perth", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q12", "no": 12, "q": "Auckland", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q13", "no": 13, "q": "Portland", "answer": ans("C"), "explain": explain("C")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–22",
            "instruction": "Complete the summary using the list of words, A–Q.",
            "boxTitle": "List of words",
            "box": {
                "A": "cost",
                "B": "falling",
                "C": "technology",
                "D": "undernourished",
                "E": "earlier",
                "F": "later",
                "G": "disabled",
                "H": "more",
                "I": "increasing",
                "J": "nutrition",
                "K": "education",
                "L": "constant",
                "M": "medicine",
                "N": "pollution",
                "O": "environmental",
                "P": "health",
                "Q": "independent",
            },
            "subTitle": "Research on elderly Americans",
            "questions": [
                {"id": "Q14", "no": 14, "q": "the proportion of people over 65 suffering from the most common age-related medical problems is ___", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q15", "no": 15, "q": "the speed of this change is ___", "answer": ans("I"), "explain": explain("I")},
                {"id": "Q16", "no": 16, "q": "these diseases are affecting people ___ in life than they did in the past", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q17", "no": 17, "q": "This is largely due to developments in ___", "answer": ans("M"), "explain": explain("M")},
                {"id": "Q18", "no": 18, "q": "other factors such as improved ___ may also be playing a part", "answer": ans("J"), "explain": explain("J")},
                {"id": "Q19", "no": 19, "q": "Increases in some other illnesses may be due to changes in personal habits and to ___", "answer": ans("N"), "explain": explain("N")},
                {"id": "Q20", "no": 20, "q": "The research establishes a link between levels of ___ and life expectancy", "answer": ans("K"), "explain": explain("K")},
                {"id": "Q21", "no": 21, "q": "there has been a considerable reduction in the number of elderly people who are ___", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q22", "no": 22, "q": "the ___ involved in supporting this section of the population may be less than previously predicted", "answer": ans("A"), "explain": explain("A")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 23–26",
            "instruction": "Match each finding with the correct statement, A–H.",
            "boxTitle": "Statements",
            "box": {
                "A": "may cause heart disease.",
                "B": "can be helped by hormone treatment.",
                "C": "may cause rises in levels of stress hormones.",
                "D": "have cost the United States government more than $200 billion.",
                "E": "may help prevent mental decline.",
                "F": "may get stronger at night.",
                "G": "allow old people to be more independent.",
                "H": "can reduce stress in difficult situations.",
            },
            "subTitle": "Findings",
            "questions": [
                {"id": "Q23", "no": 23, "q": "Home medical aids", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q24", "no": 24, "q": "Regular amounts of exercise", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q25", "no": 25, "q": "Feelings of control over life", "answer": ans("H"), "explain": explain("H")},
                {"id": "Q26", "no": 26, "q": "Feelings of loneliness", "answer": ans("C"), "explain": explain("C")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 27–31",
            "instruction": "Match each statement with the correct description, A–G.",
            "boxTitle": "Descriptions",
            "box": {
                "A": "was necessary in order to fulfil a civic role.",
                "B": "was necessary when people began farming.",
                "C": "was necessary for the development of arithmetic.",
                "D": "persists in all societies.",
                "E": "was used when the range of number words was restricted.",
                "F": "can be traced back to early European languages.",
                "G": "was a characteristic of early numeration systems.",
            },
            "questions": [
                {"id": "Q27", "no": 27, "q": "A developed system of numbering", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q28", "no": 28, "q": "An additional hand signal", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q29", "no": 29, "q": "In seventh-century Europe, the ability to count to a certain number", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q30", "no": 30, "q": "Thinking about numbers as concepts separate from physical objects", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q31", "no": 31, "q": "Expressing number differently according to class of item", "answer": ans("G"), "explain": explain("G")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 32–40",
            "instruction": "Do the following statements agree with the information given in Reading Passage 3?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q32", "no": 32, "q": "For the earliest tribes, the concept of sufficiency was more important than the concept of quantity.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q33", "no": 33, "q": "Indigenous Tasmanians used only four terms to indicate numbers of objects.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q34", "no": 34, "q": "Some peoples with simple number systems use body language to prevent misunderstanding of expressions of number.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q35", "no": 35, "q": "All cultures have been able to express large numbers clearly.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q36", "no": 36, "q": "The word 'thousand' has Anglo-Saxon origins.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q37", "no": 37, "q": "In general, people in seventh-century Europe had poor counting ability.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q38", "no": 38, "q": "In the Tsimshian language, the number for long objects and canoes is expressed with the same word.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q39", "no": 39, "q": "The Tsimshian language contains both older and newer systems of counting.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q40", "no": 40, "q": "Early peoples found it easier to count by using their fingers rather than a group of pebbles.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
    ]
    return {"meta": {"volume": 6, "testNo": 2}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The table below gives information about changes in modes of travel in England "
                "between 1985 and 2000.<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Average distance in miles travelled per person per year, by mode of travel (1985 vs 2000)",
                    "image": "cambridge-6-test-2-travel-modes.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Successful sports professionals can earn a great deal more money "
                "than people in other important professions. Some people think this is fully justified "
                "while others think it is unfair.<br><br>"
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
        dst = LISTENING_DIR / f"ielts6_test2_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    dst = LISTENING_DIR / "cambridge-6-test-2-progress-review.png"
    shutil.copy2(PROGRESS_SRC, dst)
    print(f"copied image -> {dst.relative_to(ROOT)}")
    chart_dst = WRITING_DIR / "cambridge-6-test-2-travel-modes.png"
    shutil.copy2(TRAVEL_MODES_SRC, chart_dst)
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
