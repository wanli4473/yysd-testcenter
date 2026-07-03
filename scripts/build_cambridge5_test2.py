#!/usr/bin/env python3
"""Generate Cambridge IELTS 5 Test 2 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑5T2.docx")
BAKELITE_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-03_09.05.19-ff5a4cdb-94d0-4194-9ea1-90fe4c1d4e40.png"
)
BRAIN_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-03_09.05.28-95a3848f-0992-409c-8f71-0bcfbe7b8f70.png"
)
CHARTS_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-03_09.05.37-b53020d1-685e-486c-9e36-5d142a45ef25.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test2 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test2 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test2 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test2 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-5-test-2.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-5-test-2-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-5-test-2-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-5-test-1.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-5-test-1-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-5-test-1-writing.html"

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


def patch_reading_note_image(html: str) -> str:
    old = "  if(g.kind==='note'){\n    body=(g.svg?"
    if "const fig=(g.image?" not in html and old in html:
        html = html.replace(
            old,
            "  if(g.kind==='note'){\n"
            "    const fig=(g.image?`<div style=\"margin:14px auto 20px;max-width:900px;text-align:center;\">"
            "<img class=\"map-img\" src=\"${g.image}\" alt=\"${g.noteTitle||'diagram'}\" "
            "style=\"max-width:100%;height:auto;\"></div>`:'');\n"
            "    body=fig+(g.svg?",
            1,
        )
    return html


def patch_listening_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 1 听力", "剑桥雅思5 Test 2 听力"),
        ("剑桥雅思5 · Test 1（听力）", "剑桥雅思5 · Test 2（听力）"),
        ("剑桥雅思5 Test 1 听力：", "剑桥雅思5 Test 2 听力："),
        ("Test 1 听力（官方原题 + 官方答案）", "Test 2 听力（官方原题 + 官方答案）"),
        ("剑桥雅思 5 · Test 1", "剑桥雅思 5 · Test 2"),
        ("剑桥雅思5 · Test 1", "剑桥雅思5 · Test 2"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
        ("ielts5_test1", "ielts5_test2"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 1 阅读", "剑桥雅思5 Test 2 阅读"),
        ("剑桥雅思5 · Test 1（阅读）", "剑桥雅思5 · Test 2（阅读）"),
        ("剑桥雅思5 Test 1 学术类阅读", "剑桥雅思5 Test 2 学术类阅读"),
        ("Test 1 阅读（官方原题 + 官方答案）", "Test 2 阅读（官方原题 + 官方答案）"),
        ("Johnson Dictionary、Nature or Nurture、The Truth about the Environment", "Bakelite、What's so funny?、The Birth of Scientific English"),
        ("剑桥雅思 5 · Test 1", "剑桥雅思 5 · Test 2"),
        ("剑桥雅思5 · Test 1", "剑桥雅思5 · Test 2"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return patch_reading_note_image(inject_state_vars(html))


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 1 写作", "剑桥雅思5 Test 2 写作"),
        ("剑桥雅思5 · Test 1（写作）", "剑桥雅思5 · Test 2（写作）"),
        ("剑桥雅思5 Test 1 学术类写作", "剑桥雅思5 Test 2 学术类写作"),
        (
            "Task 1 population 65+ graph + Task 2 equal male/female university places essay",
            "Task 1 study reasons/employer support charts + Task 2 gap year essay",
        ),
        ("剑桥雅思 5 · Test 1", "剑桥雅思 5 · Test 2"),
        ("剑桥雅思5 · Test 1", "剑桥雅思5 · Test 2"),
        ("Test 1 写作（官方真题）", "Test 2 写作（官方真题）"),
        ("cambridge-10-test-1-writing-draft", "cambridge-5-test-2-writing-draft"),
        ("【剑桥雅思5 · Test 1 写作】", "【剑桥雅思5 · Test 2 写作】"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
        ("population-65", "study-charts"),
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


def reading_passages() -> list[dict]:
    p = extract_docx_paras(DOCX)
    return [
        {
            "id": 1,
            "passage": {
                "title": "BAKELITE",
                "byline": "The birth of modern plastics",
                "paras": p[99:106],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": "What's so funny?",
                "byline": "John McCrone reviews recent research on humour",
                "paras": p[129:140],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": "The Birth of Scientific English",
                "paras": p[166:176],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 5, "testNo": 2},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "ielts5_test2_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–10",
                        "instruction": "Complete the notes below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "LIBRARY INFORMATION",
                        "lines": [
                            {"plain": True, "html": "Example: Minimum joining age: 18 years"},
                            {"plain": True, "html": "For registration, must take:"},
                            {"bullet": True, "html": "two <Q n=\"1\"> and"},
                            {"bullet": True, "html": "two forms of I.D. e.g. driving licence, <Q n=\"2\">"},
                            {"plain": True, "html": "Cost to join per year (without current student card): <Q n=\"3\">"},
                            {"plain": True, "html": "Number of items allowed: (members of public) <Q n=\"4\">"},
                            {"plain": True, "html": "Loan times: four weeks"},
                            {"plain": True, "html": "Fines start at <Q n=\"5\">"},
                            {"plain": True, "html": "Computers can be booked up to <Q n=\"6\"> hours in advance"},
                            {"plain": True, "html": "Library holds most national papers, all <Q n=\"7\">, and magazines"},
                            {"plain": True, "html": "Need <Q n=\"8\"> to use photocopier"},
                            {"h": "Creative Writing class"},
                            {"bullet": True, "html": "tutor is John <Q n=\"9\">"},
                            {"bullet": True, "html": "held on <Q n=\"10\"> evenings"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("passport photos", "passport photographs", "photos", "photographs"), "explain": explain("passport photos", "passport photographs")},
                            {"id": "L2", "no": 2, "answer": ans("bank statement", "a bank statement"), "explain": explain("bank statement", "a bank statement")},
                            {"id": "L3", "no": 3, "answer": ans("125", "£125"), "explain": explain("125")},
                            {"id": "L4", "no": 4, "answer": ans("8"), "explain": explain("8")},
                            {"id": "L5", "no": 5, "answer": ans("1.50", "£1.50"), "explain": explain("1.50")},
                            {"id": "L6", "no": 6, "answer": ans("48"), "explain": explain("48")},
                            {"id": "L7", "no": 7, "answer": ans("local papers", "local newspapers"), "explain": explain("local papers", "local newspapers")},
                            {"id": "L8", "no": 8, "answer": ans("card", "cards", "a card"), "explain": explain("card", "cards")},
                            {"id": "L9", "no": 9, "answer": ans("Grantingham"), "explain": explain("Grantingham")},
                            {"id": "L10", "no": 10, "answer": ans("Friday"), "explain": explain("Friday")},
                        ],
                    }
                ],
            },
            {
                "id": 2,
                "audio": "ielts5_test2_audio2.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 11–15",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L11", "no": 11, "q": "In 1993 Dan Pearman went to Ecuador", "options": {"A": "as a tourist guide.", "B": "as part of his studies.", "C": "as a voluntary worker."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L12", "no": 12, "q": "Dan's neighbour was successful in business because he", "options": {"A": "employed carpenters from the area.", "B": "was the most skilled craftsman in the town.", "C": "found it easy to reach customers."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L13", "no": 13, "q": "Dan says the charity relies on", "options": {"A": "getting enough bicycles to send regularly.", "B": "finding new areas which need the bicycles.", "C": "charging for the bicycles it sends abroad."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L14", "no": 14, "q": "What does Dan say about the town of Rivas?", "options": {"A": "It has received the greatest number of bikes.", "B": "It has almost as many bikes as Amsterdam.", "C": "Its economy has been totally transformed."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L15", "no": 15, "q": "What problem did the charity face in August 2000?", "options": {"A": "It couldn't meet its overheads.", "B": "It had to delay sending the bikes.", "C": "It was criticised in the British media."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 16–17",
                        "instruction": "Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "lines": [
                            {"plain": True, "html": "16 How much money did the charity receive when it won an award? <Q n=\"16\">"},
                            {"plain": True, "html": "17 What is the charity currently hoping to buy? <Q n=\"17\">"},
                        ],
                        "questions": [
                            {"id": "L16", "no": 16, "answer": ans("£75,000", "75000"), "explain": explain("£75,000")},
                            {"id": "L17", "no": 17, "answer": ans("computers"), "explain": explain("computers")},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 18–20",
                        "instruction": "Choose THREE letters, A–G. Which THREE things can the general public do to help the charity Pedal Power?",
                        "box": {
                            "A": "organise a bicycle collection",
                            "B": "repair the donated bikes",
                            "C": "donate their unwanted tools",
                            "D": "do voluntary work in its office",
                            "E": "hold an event to raise money",
                            "F": "identify areas that need bikes",
                            "G": "write to the government",
                        },
                        "answerSet": ["C", "E", "F"],
                        "questions": [
                            {"id": "L18", "no": 18, "explain": "答案：C、E、F，顺序不限。"},
                            {"id": "L19", "no": 19, "explain": "答案：C、E、F，顺序不限。"},
                            {"id": "L20", "no": 20, "explain": "答案：C、E、F，顺序不限。"},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "ielts5_test2_audio3.mp3",
                "groups": [
                    {
                        "kind": "table",
                        "title": "Questions 21–30",
                        "instruction": "Complete the table below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "tableTitle": "'Student Life' video project",
                        "cols": ["", "Cristina", "Ibrahim"],
                        "rows": [
                            ["Enjoyed", "using the camera; going to a British <Q n=\"21\">", "contact with students doing other courses (has asked some to <Q n=\"22\"> with him)"],
                            ["Most useful language practice", "listening to instructions; learning <Q n=\"23\"> vocabulary", "listening to British students' language — normal speed; large amount of <Q n=\"24\">"],
                            ["General usefulness", "operating video camera; working with other people: learning about <Q n=\"25\">; compromising; <Q n=\"26\">; people who have different views", "the importance of <Q n=\"27\">"],
                            ["Things to do differently in future", "decide when to <Q n=\"28\"> each stage at the beginning; make more effort to <Q n=\"29\"> with the camera", "don't make the film too <Q n=\"30\">"],
                        ],
                        "questions": [
                            {"id": "L21", "no": 21, "answer": ans("home", "student's home", "students home"), "explain": explain("home", "student's home")},
                            {"id": "L22", "no": 22, "answer": ans("have dinner", "come to dinner", "go to dinner", "dinner"), "explain": explain("have dinner", "come to dinner", "go to dinner")},
                            {"id": "L23", "no": 23, "answer": ans("technical"), "explain": explain("technical")},
                            {"id": "L24", "no": 24, "answer": ans("slang"), "explain": explain("slang")},
                            {"id": "L25", "no": 25, "answer": ans("cooperating", "cooperation"), "explain": explain("cooperating", "cooperation")},
                            {"id": "L26", "no": 26, "answer": ans("persuading"), "explain": explain("persuading")},
                            {"id": "L27", "no": 27, "answer": ans("editing"), "explain": explain("editing")},
                            {"id": "L28", "no": 28, "answer": ans("complete"), "explain": explain("complete")},
                            {"id": "L29", "no": 29, "answer": ans("experiment"), "explain": explain("experiment")},
                            {"id": "L30", "no": 30, "answer": ans("long"), "explain": explain("long")},
                        ],
                    }
                ],
            },
            {
                "id": 4,
                "audio": "ielts5_test2_audio4.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 31–40",
                        "instruction": "Complete the notes below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "ANTARCTICA",
                        "lines": [
                            {"h": "GEOGRAPHY"},
                            {"bullet": True, "html": "world's highest, coldest and windiest continent"},
                            {"bullet": True, "html": "more than <Q n=\"31\"> times as big as the UK"},
                            {"bullet": True, "html": "most of the area is classified as <Q n=\"32\">"},
                            {"h": "RESEARCH STATIONS"},
                            {"bullet": True, "html": "international teams work together"},
                            {"bullet": True, "html": "<Q n=\"33\"> is integrated with technical support"},
                            {"bullet": True, "html": "stations contain accommodation, work areas, a kitchen, a <Q n=\"34\"> and a gym"},
                            {"bullet": True, "html": "supplies were brought to Zero One station by sledge from a <Q n=\"35\"> at the edge of the ice 15 km away"},
                            {"bullet": True, "html": "problem of snow build-ups solved by building stations on <Q n=\"36\"> with adjustable legs"},
                            {"h": "FOOD AND DIET"},
                            {"bullet": True, "html": "average daily requirement for an adult in Antarctica is approximately <Q n=\"37\"> kilocalories"},
                            {"bullet": True, "html": "rations for field work prepared by process of freeze-drying"},
                            {"h": "RESEARCH"},
                            {"plain": True, "html": "The most important research focuses on climate change, including:"},
                            {"bullet": True, "html": "measuring changes in the ice-cap (because of effects on sea levels and <Q n=\"38\">)"},
                            {"bullet": True, "html": "monitoring the hole in the ozone layer"},
                            {"bullet": True, "html": "analysing air from bubbles in ice to measure <Q n=\"39\"> caused by human activity"},
                            {"h": "WORK OPPORTUNITIES"},
                            {"plain": True, "html": "Many openings for <Q n=\"40\"> people including:"},
                            {"bullet": True, "html": "research assistants"},
                            {"bullet": True, "html": "administrative and technical positions"},
                        ],
                        "questions": [
                            {"id": "L31", "no": 31, "answer": ans("58"), "explain": explain("58")},
                            {"id": "L32", "no": 32, "answer": ans("desert"), "explain": explain("desert")},
                            {"id": "L33", "no": 33, "answer": ans("science"), "explain": explain("science")},
                            {"id": "L34", "no": 34, "answer": ans("hospital", "small hospital"), "explain": explain("hospital", "small hospital")},
                            {"id": "L35", "no": 35, "answer": ans("slip"), "explain": explain("slip")},
                            {"id": "L36", "no": 36, "answer": ans("platforms"), "explain": explain("platforms")},
                            {"id": "L37", "no": 37, "answer": ans("3500", "3,500"), "explain": explain("3,500")},
                            {"id": "L38", "no": 38, "answer": ans("currents", "ocean currents"), "explain": explain("currents", "ocean currents")},
                            {"id": "L39", "no": 39, "answer": ans("pollution", "the pollution"), "explain": explain("pollution", "the pollution")},
                            {"id": "L40", "no": 40, "answer": ans("young"), "explain": explain("young")},
                        ],
                    }
                ],
            },
        ],
    }


def reading_test() -> dict:
    passages = reading_passages()
    vocab_either = ans("technical vocabulary", "grammatical resources", "grammatical resource")
    passages[0]["groups"] = [
        {
            "kind": "note",
            "title": "Questions 1–3",
            "instruction": "Complete the summary. Choose ONE WORD ONLY from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "Some plastics behave in a similar way to <Q n=\"1\"> in that they melt under heat and can be moulded into new forms. Bakelite was unique because it was the first material to be both entirely <Q n=\"2\"> in origin, and thermosetting."},
                {"plain": True, "html": "There were several reasons for the research into plastics in the nineteenth century, among them the great advances that had been made in the field of <Q n=\"3\"> and the search for alternatives to natural resources like ivory."},
            ],
            "questions": [
                {"id": "Q1", "no": 1, "answer": ans("candlewax"), "explain": explain("candlewax")},
                {"id": "Q2", "no": 2, "answer": ans("synthetic"), "explain": explain("synthetic")},
                {"id": "Q3", "no": 3, "answer": ans("chemistry"), "explain": explain("chemistry")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 4–8",
            "instruction": "Complete the flow-chart. Choose ONE WORD ONLY from the passage for each answer.",
            "noteTitle": "The Production of Bakelite",
            "image": "cambridge-5-test-2-bakelite-flowchart.png",
            "lines": [
                {"plain": True, "html": "4 stage one resin, called <Q n=\"4\">"},
                {"plain": True, "html": "5 <Q n=\"5\"> (e.g. cotton, asbestos)"},
                {"plain": True, "html": "6 <Q n=\"6\">"},
                {"plain": True, "html": "7 <Q n=\"7\"> Bakelite"},
                {"plain": True, "html": "8 apply intense heat and <Q n=\"8\">"},
            ],
            "questions": [
                {"id": "Q4", "no": 4, "answer": ans("Novalak"), "explain": explain("Novalak")},
                {"id": "Q5", "no": 5, "answer": ans("fillers"), "explain": explain("fillers")},
                {"id": "Q6", "no": 6, "answer": ans("hexa"), "explain": explain("hexa")},
                {"id": "Q7", "no": 7, "answer": ans("raw"), "explain": explain("raw")},
                {"id": "Q8", "no": 8, "answer": ans("pressure"), "explain": explain("pressure")},
            ],
        },
        {
            "kind": "multi",
            "title": "Questions 9 and 10",
            "instruction": "Choose TWO letters, A–E. Which TWO of the following factors influencing the design of Bakelite objects are mentioned in the text? (顺序不限)",
            "box": {
                "A": "the function which the object would serve",
                "B": "the ease with which the resin could fill the mould",
                "C": "the facility with which the object could be removed from the mould",
                "D": "the limitations of the materials used to manufacture the mould",
                "E": "the fashionable styles of the period",
            },
            "answerSet": ["B", "C"],
            "questions": [
                {"id": "Q9", "no": 9, "explain": "答案：B 与 C，顺序不限。"},
                {"id": "Q10", "no": 10, "explain": "答案：B 与 C，顺序不限。"},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 11–13",
            "instruction": "Do the following statements agree with the information given in Reading Passage 1?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q11", "no": 11, "q": "Modern-day plastic preparation is based on the same principles as that patented in 1907.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q12", "no": 12, "q": "Bakelite was immediately welcomed as a practical and versatile material.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q13", "no": 13, "q": "Bakelite was only available in a limited range of colours.", "answer": ans("FALSE"), "explain": explain("FALSE")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "tfng",
            "title": "Questions 14–20",
            "instruction": "Do the following statements agree with the information given in Reading Passage 2?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q14", "no": 14, "q": "Arthur Koestler considered laughter biologically important in several ways.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q15", "no": 15, "q": "Plato believed humour to be a sign of above-average intelligence.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q16", "no": 16, "q": "Kant believed that a successful joke involves the controlled release of nervous energy.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q17", "no": 17, "q": "Current thinking on humour has largely ignored Aristotle's view on the subject.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q18", "no": 18, "q": "Graeme Ritchie's work links jokes to artificial intelligence.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q19", "no": 19, "q": "Most comedians use personal situations as a source of humour.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q20", "no": 20, "q": "Chimpanzees make particular noises when they are playing.", "answer": ans("TRUE"), "explain": explain("TRUE")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 21–23",
            "instruction": "Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "image": "cambridge-5-test-2-brain-humour.png",
            "lines": [
                {"plain": True, "html": "21 Right prefrontal cortex — area linked to <Q n=\"21\">"},
                {"plain": True, "html": "22 <Q n=\"22\"> become active too"},
                {"plain": True, "html": "23 Orbital prefrontal cortex — involved with <Q n=\"23\">"},
            ],
            "questions": [
                {"id": "Q21", "no": 21, "answer": ans("problem solving"), "explain": explain("problem solving")},
                {"id": "Q22", "no": 22, "answer": ans("temporal lobes"), "explain": explain("temporal lobes")},
                {"id": "Q23", "no": 23, "answer": ans("evaluating information"), "explain": explain("evaluating information")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 24–27",
            "instruction": "Complete each sentence with the correct ending, A–G.",
            "boxTitle": "List of endings",
            "box": {
                "A": "react to their own thoughts.",
                "B": "helped create language in humans.",
                "C": "respond instantly to whatever is happening.",
                "D": "may provide valuable information about the operation of the brain.",
                "E": "cope with difficult situations.",
                "F": "relate to a person's subjective views.",
                "G": "led our ancestors to smile and then laugh.",
            },
            "questions": [
                {"id": "Q24", "no": 24, "q": "One of the brain's most difficult tasks is to", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q25", "no": 25, "q": "Because of the language they have developed, humans", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q26", "no": 26, "q": "Individual responses to humour", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q27", "no": 27, "q": "Peter Derks believes that humour", "answer": ans("D"), "explain": explain("D")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "note",
            "title": "Questions 28–34",
            "instruction": "Complete the summary. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "In Europe, modern science emerged at the same time as the nation state. At first, the scientific language of choice remained <Q n=\"28\">. It allowed scientists to communicate with other socially privileged thinkers while protecting their work from unwanted exploitation. Sometimes the desire to protect ideas seems to have been stronger than the desire to communicate them, particularly in the case of mathematicians and <Q n=\"29\">. In Britain, moreover, scientists worried that English had neither the <Q n=\"30\"> nor the <Q n=\"31\"> to express their ideas. This situation only changed after 1660 when scientists associated with the <Q n=\"32\"> set about developing English. An early scientific journal fostered a new kind of writing based on short descriptions of specific experiments. Although English was then overtaken by <Q n=\"33\">, it developed again in the 19th century as a direct result of the <Q n=\"34\">."},
            ],
            "questions": [
                {"id": "Q28", "no": 28, "answer": ans("Latin"), "explain": explain("Latin")},
                {"id": "Q29", "no": 29, "answer": ans("doctors"), "explain": explain("doctors")},
                # ponytail: either-order pair — both answers accepted on Q30/Q31
                {"id": "Q30", "no": 30, "answer": vocab_either, "explain": explain("technical vocabulary", "grammatical resources")},
                {"id": "Q31", "no": 31, "answer": vocab_either, "explain": explain("technical vocabulary", "grammatical resources")},
                {"id": "Q32", "no": 32, "answer": ans("Royal Society"), "explain": explain("Royal Society")},
                {"id": "Q33", "no": 33, "answer": ans("German"), "explain": explain("German")},
                {"id": "Q34", "no": 34, "answer": ans("industrial revolution"), "explain": explain("industrial revolution")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 35–37",
            "instruction": "Do the following statements agree with the information given in Reading Passage 3?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q35", "no": 35, "q": "There was strong competition between scientists in Renaissance Europe.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q36", "no": 36, "q": "The most important scientific development of the Renaissance period was the discovery of magnetism.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q37", "no": 37, "q": "In 17th-century Britain, leading thinkers combined their interest in science with an interest in how to express ideas.", "answer": ans("TRUE"), "explain": explain("TRUE")},
            ],
        },
        {
            "kind": "table",
            "title": "Questions 38–40",
            "instruction": "Complete the table. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "columns": ["Language used", "Type of science", "Examples", "Target audience"],
            "rows": [
                ["Latin", "Original", "<Q n=\"38\">", "International scholars"],
                ["English", "<Q n=\"39\">", "Encyclopaedias", "<Q n=\"40\">"],
            ],
            "questions": [
                {"id": "Q38", "no": 38, "answer": ans("Principia", "the Principia", "Newton's Principia", "mathematical treatise"), "explain": explain("Principia", "the Principia", "Newton's Principia", "mathematical treatise")},
                {"id": "Q39", "no": 39, "answer": ans("popular"), "explain": explain("popular")},
                {"id": "Q40", "no": 40, "answer": ans("local", "more local", "local audience"), "explain": explain("local", "more local", "local audience")},
            ],
        },
    ]
    return {"meta": {"volume": 5, "testNo": 2}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The charts below show the main reasons for study among students of different age groups "
                "and the amount of support they received from employers.<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Reasons for study by age group and employer support",
                    "image": "cambridge-5-test-2-study-charts.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> In some countries young people are encouraged to work or travel "
                "for a year between finishing high school and starting university studies.<br><br>"
                "Discuss the advantages and disadvantages for young people who decide to do this.<br><br>"
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
        dst = LISTENING_DIR / f"ielts5_test2_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    for src, dst in (
        (BAKELITE_SRC, READING_DIR / "cambridge-5-test-2-bakelite-flowchart.png"),
        (BRAIN_SRC, READING_DIR / "cambridge-5-test-2-brain-humour.png"),
        (CHARTS_SRC, WRITING_DIR / "cambridge-5-test-2-study-charts.png"),
    ):
        if not src.exists():
            raise FileNotFoundError(src)
        shutil.copy2(src, dst)
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
