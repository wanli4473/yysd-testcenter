#!/usr/bin/env python3
"""Generate Cambridge IELTS 5 Test 3 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑5T3.docx")
FEEDBACK_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-03_09.16.15-73f21af1-6151-427b-a0e0-eb94fdaaf7ac.png"
)
RECYCLE_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-03_09.16.23-f6ad89bc-f551-4f21-98d1-0119cc9d4873.png"
)
NILE_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-03_09.16.34-038acfd5-67fa-4d6e-b903-e6b93b2a7022.png"
)
GARLSDON_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-03_09.16.44-1d5b12b6-5a06-4e67-a587-f396f7494d30.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test3 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test3 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test3 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS5 Test3 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-5-test-3.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-5-test-3-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-5-test-3-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-5-test-2.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-5-test-2-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-5-test-2-writing.html"

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


def patch_reading_passage_image(html: str) -> str:
    needle = "${pp.byline?`<div class=\"pp-byline\">${pp.byline}</div>`:''}"
    insert = (
        "${pp.byline?`<div class=\"pp-byline\">${pp.byline}</div>`:''}"
        "${pp.image?`<div style=\"margin:12px 0;text-align:center;\">"
        "<img class=\"map-img\" src=\"${pp.image}\" alt=\"${pp.title}\" "
        "style=\"max-width:100%;height:auto;\"></div>`:''}"
    )
    if "pp.image?" not in html and needle in html:
        html = html.replace(needle, insert, 1)
    return html


def patch_listening_table_image(html: str) -> str:
    needle = "  else if(g.kind==='table'){\n    const cols = g.cols || g.columns || [];"
    insert = (
        "  else if(g.kind==='table'){\n"
        "    const tfig=(g.image?`<div class=\"map-wrap\" style=\"margin-bottom:16px;\">"
        "<img class=\"map-img\" src=\"${g.image}\" alt=\"${g.tableTitle||'table'}\" "
        "style=\"max-width:100%;height:auto;\"></div>`:'');\n"
        "    const cols = g.cols || g.columns || [];"
    )
    old_body = "body=`${(g.tableTitle||g.noteTitle)?`<div class=\"note-title\">${g.tableTitle||g.noteTitle}</div>`:''}<table class=\"note-table\">${head}${rows}</table>`;"
    new_body = "body=tfig+`${(g.tableTitle||g.noteTitle)?`<div class=\"note-title\">${g.tableTitle||g.noteTitle}</div>`:''}<table class=\"note-table\">${head}${rows}</table>`;"
    if "tfig=" not in html and needle in html:
        html = html.replace(needle, insert, 1)
        html = html.replace(old_body, new_body, 1)
    return html


def patch_listening_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 2 听力", "剑桥雅思5 Test 3 听力"),
        ("剑桥雅思5 · Test 2（听力）", "剑桥雅思5 · Test 3（听力）"),
        ("剑桥雅思5 Test 2 听力：", "剑桥雅思5 Test 3 听力："),
        ("Test 2 听力（官方原题 + 官方答案）", "Test 3 听力（官方原题 + 官方答案）"),
        ("剑桥雅思 5 · Test 2", "剑桥雅思 5 · Test 3"),
        ("剑桥雅思5 · Test 2", "剑桥雅思5 · Test 3"),
        ("Test 2", "Test 3"),
        ("test-2", "test-3"),
        ("ielts5_test2", "ielts5_test3"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return patch_listening_table_image(inject_state_vars(html))


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 2 阅读", "剑桥雅思5 Test 3 阅读"),
        ("剑桥雅思5 · Test 2（阅读）", "剑桥雅思5 · Test 3（阅读）"),
        ("剑桥雅思5 Test 2 学术类阅读", "剑桥雅思5 Test 3 学术类阅读"),
        ("Test 2 阅读（官方原题 + 官方答案）", "Test 3 阅读（官方原题 + 官方答案）"),
        ("Bakelite、What's so funny?、The Birth of Scientific English", "Early Childhood Education、Nile Delta、The Return of Artificial Intelligence"),
        ("剑桥雅思 5 · Test 2", "剑桥雅思 5 · Test 3"),
        ("剑桥雅思5 · Test 2", "剑桥雅思5 · Test 3"),
        ("Test 2", "Test 3"),
        ("test-2", "test-3"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return patch_reading_passage_image(inject_state_vars(html))


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 2 写作", "剑桥雅思5 Test 3 写作"),
        ("剑桥雅思5 · Test 2（写作）", "剑桥雅思5 · Test 3（写作）"),
        ("剑桥雅思5 Test 2 学术类写作", "剑桥雅思5 Test 3 学术类写作"),
        (
            "Task 1 study reasons/employer support charts + Task 2 gap year essay",
            "Task 1 Garlsdon supermarket map + Task 2 competition vs cooperation essay",
        ),
        ("剑桥雅思 5 · Test 2", "剑桥雅思 5 · Test 3"),
        ("剑桥雅思5 · Test 2", "剑桥雅思5 · Test 3"),
        ("Test 2 写作（官方真题）", "Test 3 写作（官方真题）"),
        ("cambridge-5-test-2-writing-draft", "cambridge-5-test-3-writing-draft"),
        ("【剑桥雅思5 · Test 2 写作】", "【剑桥雅思5 · Test 3 写作】"),
        ("Test 2", "Test 3"),
        ("test-2", "test-3"),
        ("study-charts", "garlsdon-map"),
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
                "title": "Early Childhood Education",
                "byline": p[88],
                "paras": [para_html(x) for x in p[89:98]],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": "Disappearing delta",
                "image": "cambridge-5-test-3-nile-map.png",
                "paras": [
                    para_html(p[124], "A"),
                    para_html(p[125]),
                    para_html(p[126]),
                    para_html(p[127]),
                    para_html(p[128]),
                    " ".join(p[129:130]),
                    para_html(p[130]),
                ],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": "The Return of Artificial Intelligence",
                "paras": [para_html(x) for x in p[170:177]],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 5, "testNo": 3},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "ielts5_test3_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–10",
                        "instruction": "Complete the form below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "MINTONS CAR MART — Customer Enquiry",
                        "lines": [
                            {"plain": True, "html": "Example: Make: Lida"},
                            {"plain": True, "html": "Engine size: <Q n=\"1\">"},
                            {"plain": True, "html": "Model: Max"},
                            {"plain": True, "html": "Type of gears: <Q n=\"2\">"},
                            {"plain": True, "html": "Preferred colour: <Q n=\"3\"> blue"},
                            {"h": "FINANCE"},
                            {"plain": True, "html": "Customer wishes to arrange <Q n=\"4\">"},
                            {"plain": True, "html": "Part exchange? yes"},
                            {"h": "PERSONAL DETAILS"},
                            {"plain": True, "html": "Name: Wendy <Q n=\"5\">"},
                            {"plain": True, "html": "Title: <Q n=\"6\">"},
                            {"plain": True, "html": "Address: 20, Green Banks, <Q n=\"7\">, Hampshire"},
                            {"plain": True, "html": "Postcode: GU8 9EW"},
                            {"plain": True, "html": "Contact number: <Q n=\"8\"> (for messages only) 0798 257643"},
                            {"h": "CURRENT CAR"},
                            {"plain": True, "html": "Make: Conti"},
                            {"plain": True, "html": "Model name: <Q n=\"9\">"},
                            {"plain": True, "html": "Year: 1994 · Mileage: maximum 70,000 · Colour: metallic grey"},
                            {"plain": True, "html": "Condition: <Q n=\"10\">"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("1.4 litres", "1.4 liters"), "explain": explain("1.4 litres", "1.4 liters")},
                            {"id": "L2", "no": 2, "answer": ans("automatic"), "explain": explain("automatic")},
                            {"id": "L3", "no": 3, "answer": ans("light", "sky"), "explain": explain("light", "sky")},
                            {"id": "L4", "no": 4, "answer": ans("credit"), "explain": explain("credit")},
                            {"id": "L5", "no": 5, "answer": ans("Harries"), "explain": explain("Harries")},
                            {"id": "L6", "no": 6, "answer": ans("Dr", "Doctor"), "explain": explain("Dr", "Doctor")},
                            {"id": "L7", "no": 7, "answer": ans("Alton"), "explain": explain("Alton")},
                            {"id": "L8", "no": 8, "answer": ans("messages"), "explain": explain("messages")},
                            {"id": "L9", "no": 9, "answer": ans("Lion"), "explain": explain("Lion")},
                            {"id": "L10", "no": 10, "answer": ans("reasonable"), "explain": explain("reasonable")},
                        ],
                    }
                ],
            },
            {
                "id": 2,
                "audio": "ielts5_test3_audio2.mp3",
                "groups": [
                    {
                        "kind": "multi",
                        "title": "Questions 11 and 12",
                        "instruction": "Choose TWO letters, A–E. What TWO advantages does the speaker say Rexford University has for the students he is speaking to?",
                        "box": {
                            "A": "higher than average results in examinations",
                            "B": "good transport links with central London",
                            "C": "near London Airport",
                            "D": "special government funding",
                            "E": "good links with local industry",
                        },
                        "answerSet": ["C", "E"],
                        "questions": [
                            {"id": "L11", "no": 11, "explain": "答案：C 与 E，顺序不限。"},
                            {"id": "L12", "no": 12, "explain": "答案：C 与 E，顺序不限。"},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 13–15",
                        "instruction": "Complete the notes below. Write NO MORE THAN ONE WORD for each answer.",
                        "lines": [
                            {"plain": True, "html": "When application is received, confirmation will be sent."},
                            {"plain": True, "html": "Application processing may be slowed down by postal problems or delays in sending <Q n=\"13\">"},
                            {"plain": True, "html": "University tries to put international applicants in touch with a student from the same <Q n=\"14\"> who can give information and advice on academic atmosphere, leisure facilities, English <Q n=\"15\"> and food, and what to pack."},
                        ],
                        "questions": [
                            {"id": "L13", "no": 13, "answer": ans("references"), "explain": explain("references")},
                            {"id": "L14", "no": 14, "answer": ans("country"), "explain": explain("country")},
                            {"id": "L15", "no": 15, "answer": ans("weather"), "explain": explain("weather")},
                        ],
                    },
                    {
                        "kind": "mcq",
                        "title": "Questions 16–20",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L16", "no": 16, "q": "The speaker says international students at UK universities will be", "options": {"A": "offered accommodation with local families.", "B": "given special help by their lecturers.", "C": "expected to work independently."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L17", "no": 17, "q": "What does the speaker say about university accommodation on campus?", "options": {"A": "Most places are given to undergraduates.", "B": "No places are available for postgraduates with families.", "C": "A limited number of places are available for new postgraduates."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L18", "no": 18, "q": "Students wishing to live off-campus should apply", "options": {"A": "several months in advance.", "B": "two or three weeks in advance.", "C": "at the beginning of term."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L19", "no": 19, "q": "The university accommodation officer will", "options": {"A": "send a list of agents for students to contact.", "B": "contact accommodation agencies for students.", "C": "ensure that students have suitable accommodation."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L20", "no": 20, "q": "With regard to their English, the speaker advises the students to", "options": {"A": "tell their lecturers if they have problems understanding.", "B": "have private English lessons when they arrive.", "C": "practise their spoken English before they arrive."}, "answer": ans("C"), "explain": explain("C")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "ielts5_test3_audio3.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 21–30",
                        "instruction": "Complete the form below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "Feedback Form — Communication in Business (CB162)",
                        "image": "cambridge-5-test-3-feedback-form.png",
                        "lines": [
                            {"plain": True, "html": "Dates: from <Q n=\"21\"> to <Q n=\"22\">"},
                            {"h": "Course organisation — Good Points"},
                            {"bullet": True, "html": "<Q n=\"23\">"},
                            {"bullet": True, "html": "useful to have <Q n=\"24\"> at beginning of course"},
                            {"plain": True, "html": "Suggestion: too much work in <Q n=\"25\"> of the course"},
                            {"h": "Course delivery — Good Points"},
                            {"plain": True, "html": "good <Q n=\"26\">"},
                            {"plain": True, "html": "Suggestion: some <Q n=\"27\"> sessions went on too long"},
                            {"h": "Materials and equipment — Good Points"},
                            {"plain": True, "html": "good <Q n=\"28\">"},
                            {"h": "Testing and evaluation — Suggestions"},
                            {"plain": True, "html": "too much <Q n=\"29\">"},
                            {"h": "Other comments — Good Points"},
                            {"plain": True, "html": "excellent <Q n=\"30\">"},
                        ],
                        "questions": [
                            {"id": "L21", "no": 21, "answer": ans("5th May", "May 5th", "5 May"), "explain": explain("5th May")},
                            {"id": "L22", "no": 22, "answer": ans("16th July", "Friday 16th July", "July 16th"), "explain": explain("16th July", "Friday 16th July")},
                            {"id": "L23", "no": 23, "answer": ans("clear", "was clear"), "explain": explain("clear", "was clear")},
                            {"id": "L24", "no": 24, "answer": ans("outline", "course outline", "an outline", "the outline", "the course outline"), "explain": explain("outline", "course outline")},
                            {"id": "L25", "no": 25, "answer": ans("2nd half", "second half", "the 2nd half", "the second half"), "explain": explain("2nd half", "second half")},
                            {"id": "L26", "no": 26, "answer": ans("teaching", "teachers", "standard of teaching", "standard of teachers"), "explain": explain("teaching", "teachers", "standard of teaching")},
                            {"id": "L27", "no": 27, "answer": ans("discussion", "group discussion"), "explain": explain("discussion", "group discussion")},
                            {"id": "L28", "no": 28, "answer": ans("handouts"), "explain": explain("handouts")},
                            {"id": "L29", "no": 29, "answer": ans("written work"), "explain": explain("written work")},
                            {"id": "L30", "no": 30, "answer": ans("student support", "support for students"), "explain": explain("student support", "support for students")},
                        ],
                    }
                ],
            },
            {
                "id": 4,
                "audio": "ielts5_test3_audio4.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 31–35",
                        "instruction": "Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "HOUSEHOLD WASTE RECYCLING",
                        "lines": [
                            {"plain": True, "html": "31 By 2008, carbon dioxide emissions need to be <Q n=\"31\"> lower than in 1990."},
                            {"plain": True, "html": "32 Recycling saves energy and reduces emissions from landfill sites and <Q n=\"32\">"},
                            {"plain": True, "html": "33 People say that one problem is a lack of <Q n=\"33\"> sites for household waste."},
                            {"plain": True, "html": "34 Glass designed to be utilised for <Q n=\"34\"> cannot be recycled with other types of glass."},
                            {"plain": True, "html": "35 In the UK, <Q n=\"35\"> tons of glass is recycled each year."},
                        ],
                        "questions": [
                            {"id": "L31", "no": 31, "answer": ans("12.5%", "12.5 percent"), "explain": explain("12.5%")},
                            {"id": "L32", "no": 32, "answer": ans("incineration plants"), "explain": explain("incineration plants")},
                            {"id": "L33", "no": 33, "answer": ans("drop-off", "drop off"), "explain": explain("drop-off")},
                            {"id": "L34", "no": 34, "answer": ans("cooking"), "explain": explain("cooking")},
                            {"id": "L35", "no": 35, "answer": ans("500,000", "500000"), "explain": explain("500,000")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 36–40",
                        "instruction": "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.",
                        "tableTitle": "Companies working with recycled materials",
                        "image": "cambridge-5-test-3-recycled-materials.png",
                        "cols": ["Material", "Company", "Product that the company manufactures"],
                        "rows": [
                            ["glass", "CLF Aggregates", "material used for making <Q n=\"36\">"],
                            ["paper", "Martin's", "office stationery"],
                            ["paper", "Papersave", "<Q n=\"37\"> for use on farms"],
                            ["plastic", "Pacrite", "<Q n=\"38\"> for collecting waste"],
                            ["plastic", "Waterford", "<Q n=\"39\">"],
                            ["plastic", "Johnson & Jones", "<Q n=\"40\">"],
                        ],
                        "questions": [
                            {"id": "L36", "no": 36, "answer": ans("roads"), "explain": explain("roads")},
                            {"id": "L37", "no": 37, "answer": ans("soil conditioner"), "explain": explain("soil conditioner")},
                            {"id": "L38", "no": 38, "answer": ans("containers"), "explain": explain("containers")},
                            {"id": "L39", "no": 39, "answer": ans("pencils"), "explain": explain("pencils")},
                            {"id": "L40", "no": 40, "answer": ans("business cards"), "explain": explain("business cards")},
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
            "title": "Questions 1–4",
            "instruction": "Reading Passage 1 has six sections, A–F. Which paragraph contains the following information?",
            "boxTitle": "Paragraphs",
            "box": {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "F": "F"},
            "questions": [
                {"id": "Q1", "no": 1, "q": "details of the range of family types involved in an education programme", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q2", "no": 2, "q": "reasons why a child's early years are so important", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q3", "no": 3, "q": "reasons why an education programme failed", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q4", "no": 4, "q": "a description of the positive outcomes of an education programme", "answer": ans("E"), "explain": explain("E")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 5–10",
            "instruction": "Classify the following features as characterising A the 'Headstart' programme, B the 'Missouri' programme, C both, or D neither.",
            "boxTitle": "Categories",
            "box": {
                "A": "the 'Headstart' programme",
                "B": "the 'Missouri' programme",
                "C": "both the 'Headstart' and the 'Missouri' programmes",
                "D": "neither the 'Headstart' nor the 'Missouri' programme",
            },
            "questions": [
                {"id": "Q5", "no": 5, "q": "was administered to a variety of poor and wealthy families", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q6", "no": 6, "q": "continued with follow-up assistance in elementary schools", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q7", "no": 7, "q": "did not succeed in its aim", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q8", "no": 8, "q": "supplied many forms of support and training to parents", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q9", "no": 9, "q": "received insufficient funding", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q10", "no": 10, "q": "was designed to improve pre-schoolers' educational development", "answer": ans("C"), "explain": explain("C")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 11–13",
            "instruction": "Do the following statements agree with the information given in Reading Passage 1?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q11", "no": 11, "q": "Most 'Missouri' programme three-year-olds scored highly in areas such as listening, speaking, reasoning and interacting with others.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q12", "no": 12, "q": "'Missouri' programme children of young, uneducated, single parents scored less highly on the tests.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q13", "no": 13, "q": "The richer families in the 'Missouri' programme had higher stress levels.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–17",
            "instruction": "Reading Passage 2 has six paragraphs, A–F. Choose the correct heading for paragraphs B and D–F.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "Effects of irrigation on sedimentation",
                "ii": "The danger of flooding the Cairo area",
                "iii": "Causing pollution in the Mediterranean",
                "iv": "Interrupting a natural process",
                "v": "The threat to food production",
                "vi": "Less valuable sediment than before",
                "vii": "Egypt's disappearing coastline",
                "viii": "Looking at the long-term impact",
            },
            "subTitle": "Paragraphs (Example: A = vii, C = vi)",
            "questions": [
                {"id": "Q14", "no": 14, "q": "Paragraph B", "answer": ans("iv"), "explain": explain("iv")},
                {"id": "Q15", "no": 15, "q": "Paragraph D", "answer": ans("i"), "explain": explain("i")},
                {"id": "Q16", "no": 16, "q": "Paragraph E", "answer": ans("v"), "explain": explain("v")},
                {"id": "Q17", "no": 17, "q": "Paragraph F", "answer": ans("viii"), "explain": explain("viii")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 18–23",
            "instruction": "Do the following statements reflect the claims of the writer in Reading Passage 2?",
            "variant": "yn",
            "options": ["YES", "NO", "NOT GIVEN"],
            "questions": [
                {"id": "Q18", "no": 18, "q": "Coastal erosion occurred along Egypt's Mediterranean coast before the building of the Aswan dams.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q19", "no": 19, "q": "Some people predicted that the Aswan dams would cause land loss before they were built.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q20", "no": 20, "q": "The Aswan dams were built to increase the fertility of the Nile delta.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q21", "no": 21, "q": "Stanley found that the levels of sediment in the river water in Cairo were relatively high.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q22", "no": 22, "q": "Sediment in the irrigation canals on the Nile delta causes flooding.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q23", "no": 23, "q": "Water is pumped from the irrigation canals into the lagoons.", "answer": ans("YES"), "explain": explain("YES")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 24–26",
            "instruction": "Complete the summary of paragraphs E and F with the list of words, A–H.",
            "boxTitle": "List of words",
            "box": {
                "A": "artificial floods",
                "B": "desalination",
                "C": "delta waterways",
                "D": "natural floods",
                "E": "nutrients",
                "F": "pollutants",
                "G": "population control",
                "H": "sediment",
            },
            "subTitle": "Summary",
            "questions": [
                {"id": "Q24", "no": 24, "q": "In addition to coastal erosion, there has been a marked increase in the level of ___ contained in the silt deposited in the Nile delta.", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q25", "no": 25, "q": "Stanley suggests the use of ___ in the short term.", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q26", "no": 26, "q": "Increasing the amount of water available through ___ in the longer term.", "answer": ans("B"), "explain": explain("B")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 27–31",
            "instruction": "Reading Passage 3 has seven paragraphs, A–G. Which paragraph contains the following information? (You may use any letter more than once.)",
            "boxTitle": "Paragraphs",
            "box": {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "F": "F", "G": "G"},
            "questions": [
                {"id": "Q27", "no": 27, "q": "how AI might have a military impact", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q28", "no": 28, "q": "the fact that AI brings together a range of separate research areas", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q29", "no": 29, "q": "the reason why AI has become a common topic of conversation again", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q30", "no": 30, "q": "how AI could help deal with difficulties related to the amount of information available electronically", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q31", "no": 31, "q": "where the expression AI was first used", "answer": ans("B"), "explain": explain("B")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 32–37",
            "instruction": "Do the following statements agree with the information given in Reading Passage 3?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q32", "no": 32, "q": "The researchers who launched the field of AI had worked together on other projects in the past.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q33", "no": 33, "q": "In 1985, AI was at its lowest point.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q34", "no": 34, "q": "Research into agent technology was more costly than research into neural networks.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q35", "no": 35, "q": "Applications of AI have already had a degree of success.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q36", "no": 36, "q": "The problems waiting to be solved by AI have not changed since 1967.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q37", "no": 37, "q": "The film 2001: A Space Odyssey reflected contemporary ideas about the potential of AI computers.", "answer": ans("TRUE"), "explain": explain("TRUE")},
            ],
        },
        {
            "kind": "mcq",
            "title": "Questions 38–40",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q38", "no": 38, "q": "According to researchers, in the late 1980s there was a feeling that", "options": {"A": "a general theory of AI would never be developed.", "B": "original expectations of AI may not have been justified.", "C": "a wide range of applications was close to fruition.", "D": "more powerful computers were the key to further progress."}, "answer": ans("B"), "explain": explain("B")},
                {"id": "Q39", "no": 39, "q": "In Dr Leake's opinion, the reputation of AI suffered as a result of", "options": {"A": "changing perceptions.", "B": "premature implementation.", "C": "poorly planned projects.", "D": "commercial pressures."}, "answer": ans("A"), "explain": explain("A")},
                {"id": "Q40", "no": 40, "q": "The prospects for AI may benefit from", "options": {"A": "existing AI applications.", "B": "new business models.", "C": "orders from internet-only companies.", "D": "new investment priorities."}, "answer": ans("D"), "explain": explain("D")},
            ],
        },
    ]
    return {"meta": {"volume": 5, "testNo": 3}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The map below is of the town of Garlsdon. A new supermarket (S) is planned for the town. "
                "The map shows two possible sites for the supermarket.<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Garlsdon — two possible supermarket sites (S1 and S2)",
                    "image": "cambridge-5-test-3-garlsdon-map.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Some people think that a sense of competition in children should be "
                "encouraged. Others believe that children who are taught to co-operate rather than compete "
                "become more useful adults.<br><br>"
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
        dst = LISTENING_DIR / f"ielts5_test3_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    for src, dst in (
        (FEEDBACK_SRC, LISTENING_DIR / "cambridge-5-test-3-feedback-form.png"),
        (RECYCLE_SRC, LISTENING_DIR / "cambridge-5-test-3-recycled-materials.png"),
        (NILE_SRC, READING_DIR / "cambridge-5-test-3-nile-map.png"),
        (GARLSDON_SRC, WRITING_DIR / "cambridge-5-test-3-garlsdon-map.png"),
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
