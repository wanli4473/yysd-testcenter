#!/usr/bin/env python3
"""Generate Cambridge IELTS 8 Test 3 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑8T3.docx")
CEMENT_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_16.14.35-08827b9e-1d93-4434-930d-76e00fa86d2b.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test3 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test3 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test3 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test3 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-8-test-3.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-8-test-3-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-8-test-3-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-8-test-2.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-8-test-2-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-8-test-2-writing.html"

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
    needle = "  if(g.kind==='note'){\n    const fig="
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
        ("剑桥雅思8 Test 2 听力", "剑桥雅思8 Test 3 听力"),
        ("剑桥雅思8 · Test 2（听力）", "剑桥雅思8 · Test 3（听力）"),
        ("剑桥雅思8 Test 2 听力：", "剑桥雅思8 Test 3 听力："),
        ("Test 2 听力（官方原题 + 官方答案）", "Test 3 听力（官方原题 + 官方答案）"),
        ("test-2", "test-3"),
        ("cam8_test2", "cam8_test3"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    return patch_note_image(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思8 Test 2 阅读", "剑桥雅思8 Test 3 阅读"),
        ("剑桥雅思8 · Test 2（阅读）", "剑桥雅思8 · Test 3（阅读）"),
        ("剑桥雅思8 Test 2 学术类阅读", "剑桥雅思8 Test 3 学术类阅读"),
        ("Test 2 阅读（官方原题 + 官方答案）", "Test 3 阅读（官方原题 + 官方答案）"),
        ("Test 2", "Test 3"),
        ("test-2", "test-3"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思8 Test 2 写作", "剑桥雅思8 Test 3 写作"),
        ("剑桥雅思8 · Test 2（写作）", "剑桥雅思8 · Test 3（写作）"),
        ("剑桥雅思8 Test 2 学术类写作", "剑桥雅思8 Test 3 学术类写作"),
        (
            "Task 1 UK school spending pie charts + Task 2 technology and relationships essay",
            "Task 1 cement and concrete production diagrams + Task 2 petrol price traffic pollution essay",
        ),
        ("Test 2 写作（官方真题）", "Test 3 写作（官方真题）"),
        ("cambridge-8-test-2-writing-draft", "cambridge-8-test-3-writing-draft"),
        ("【剑桥雅思8 · Test 2 写作】", "【剑桥雅思8 · Test 3 写作】"),
        ("Test 2", "Test 3"),
        ("test-2", "test-3"),
        ("school-spending", "cement-concrete"),
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
                "paras": p2[3:],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": "Ageing and life span",
                "byline": p3[1],
                "paras": [labeled_para(x) for x in p3[2:]],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 8, "testNo": 3},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "cam8_test3_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–3",
                        "instruction": "Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "noteTitle": "Rented Properties Customer's Requirements",
                        "lines": [
                            {"plain": True, "html": "Example: Name: Steven Godfrey"},
                            {"plain": True, "html": "No. of bedrooms: four"},
                            {"plain": True, "html": "Preferred location: in the <Q n=\"1\"> area of town"},
                            {"plain": True, "html": "Maximum monthly rent: £<Q n=\"2\">"},
                            {"plain": True, "html": "Length of let required: <Q n=\"3\">"},
                            {"plain": True, "html": "Starting: September 1st"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("central"), "explain": explain("central")},
                            {"id": "L2", "no": 2, "answer": ans("600"), "explain": explain("600")},
                            {"id": "L3", "no": 3, "answer": ans("2 years", "2 year", "two years"), "explain": explain("2 years", "2 year")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 4–8",
                        "instruction": "Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "columns": ["Address", "Rooms", "Monthly rent", "Problem"],
                        "rows": [
                            ["Oakington Avenue", "living/dining room, separate kitchen", "£550", "no <Q n=\"4\">"],
                            ["Mead Street", "large living room and kitchen, bathroom and a cloakroom", "£580", "the <Q n=\"5\"> is too large"],
                            ["Hamilton Road", "living room, kitchen-diner, and a <Q n=\"6\">", "£550", "too <Q n=\"7\">"],
                            ["Devon Close", "living room, dining room, small kitchen", "£<Q n=\"8\">", "none"],
                        ],
                        "questions": [
                            {"id": "L4", "no": 4, "answer": ans("garage"), "explain": explain("garage")},
                            {"id": "L5", "no": 5, "answer": ans("garden"), "explain": explain("garden")},
                            {"id": "L6", "no": 6, "answer": ans("study"), "explain": explain("study")},
                            {"id": "L7", "no": 7, "answer": ans("noisy"), "explain": explain("noisy")},
                            {"id": "L8", "no": 8, "answer": ans("595"), "explain": explain("595")},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 9 and 10",
                        "instruction": "Choose TWO letters, A–E. Which TWO facilities in the district of Devon Close are open to the public at the moment?",
                        "box": {
                            "A": "museum",
                            "B": "concert hall",
                            "C": "cinema",
                            "D": "sports centre",
                            "E": "swimming pool",
                        },
                        "answerSet": ["B", "E"],
                        "questions": [
                            {"id": "L9", "no": 9, "explain": "答案：B 与 E，顺序不限。"},
                            {"id": "L10", "no": 10, "explain": "答案：B 与 E，顺序不限。"},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "cam8_test3_audio2.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 11–16",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "THE NATIONAL ARTS CENTRE",
                        "lines": [
                            {"plain": True, "html": "Well known for: <Q n=\"11\">"},
                            {"plain": True, "html": "<strong>Complex consists of:</strong> concert rooms, theatres, cinemas, art galleries, public library, restaurants, a <Q n=\"12\">"},
                            {"plain": True, "html": "<strong>Historical background:</strong>"},
                            {"bullet": True, "html": "1940 – area destroyed by bombs"},
                            {"bullet": True, "html": "1960s–1970s – Centre was <Q n=\"13\"> and built"},
                            {"bullet": True, "html": "in <Q n=\"14\"> – opened to public"},
                            {"plain": True, "html": "Managed by: the <Q n=\"15\">"},
                            {"plain": True, "html": "Open: <Q n=\"16\"> days per year"},
                        ],
                        "questions": [
                            {"id": "L11", "no": 11, "answer": ans("classical music", "classical music concerts", "music concerts", "concerts"), "explain": explain("classical music", "classical music concerts")},
                            {"id": "L12", "no": 12, "answer": ans("bookshop", "bookstore"), "explain": explain("bookshop", "bookstore")},
                            {"id": "L13", "no": 13, "answer": ans("planned"), "explain": explain("planned")},
                            {"id": "L14", "no": 14, "answer": ans("1983", "the 1980s"), "explain": explain("1983", "the 1980s")},
                            {"id": "L15", "no": 15, "answer": ans("City Council"), "explain": explain("City Council")},
                            {"id": "L16", "no": 16, "answer": ans("363"), "explain": explain("363")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 17–20",
                        "instruction": "Complete the table below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "columns": ["Day", "Time", "Event", "Venue", "Ticket price"],
                        "rows": [
                            ["Monday and Tuesday", "7.30 p.m.", "'The Magic Flute' (opera by Mozart)", "<Q n=\"17\">", "from £8.00"],
                            ["Wednesday", "8.00 p.m.", "<Q n=\"18\"> (Canadian film)", "Cinema 2", "£<Q n=\"19\">"],
                            ["Saturday and Sunday", "11 a.m. to 10 p.m.", "<Q n=\"20\"> (art exhibition)", "Gallery 1", "free"],
                        ],
                        "questions": [
                            {"id": "L17", "no": 17, "answer": ans("Garden Hall", "the Garden Hall"), "explain": explain("Garden Hall", "the Garden Hall")},
                            {"id": "L18", "no": 18, "answer": ans("Three Lives"), "explain": explain("Three Lives")},
                            {"id": "L19", "no": 19, "answer": ans("1.60"), "explain": explain("1.60")},
                            {"id": "L20", "no": 20, "answer": ans("Faces of China"), "explain": explain("Faces of China")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "cam8_test3_audio3.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 21–26",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L21", "no": 21, "q": "Paul decided to get work experience in South America because he wanted", "options": {"A": "to teach English there.", "B": "to improve his Spanish.", "C": "to learn about Latin American life."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L22", "no": 22, "q": "What project work did Paul originally intend to get involved in?", "options": {"A": "construction", "B": "agriculture", "C": "tourism"}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L23", "no": 23, "q": "Why did Paul change from one project to another?", "options": {"A": "His first job was not well organised.", "B": "He found doing the routine work very boring.", "C": "The work was too physically demanding."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L24", "no": 24, "q": "In the village community, he learnt how important it was to", "options": {"A": "respect family life.", "B": "develop trust.", "C": "use money wisely."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L25", "no": 25, "q": "What does Paul say about his project manager?", "options": {"A": "He let Paul do most of the work.", "B": "His plans were too ambitious.", "C": "He was very supportive of Paul."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L26", "no": 26, "q": "Paul was surprised to be given", "options": {"A": "a computer to use.", "B": "so little money to live on.", "C": "an extension to his contract."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "match",
                        "title": "Questions 27–30",
                        "instruction": "What does Paul decide about each of the following modules? Write the correct letter, A, B or C, next to questions 27–30.",
                        "boxTitle": "Decision",
                        "box": {
                            "A": "He will do this.",
                            "B": "He might do this.",
                            "C": "He won't do this.",
                        },
                        "subTitle": "Module",
                        "questions": [
                            {"id": "L27", "no": 27, "q": "Gender Studies in Latin America", "answer": ans("C"), "explain": explain("C")},
                            {"id": "L28", "no": 28, "q": "Second Language Acquisition", "answer": ans("A"), "explain": explain("A")},
                            {"id": "L29", "no": 29, "q": "Indigenous Women's Lives", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L30", "no": 30, "q": "Portuguese Language Studies", "answer": ans("C"), "explain": explain("C")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "cam8_test3_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 31–34",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L31", "no": 31, "q": "Compared to introducing new business processes, attempts to copy existing processes are", "options": {"A": "more attractive.", "B": "more frequent.", "C": "more straightforward."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L32", "no": 32, "q": "Most research into the repetition of success in business has", "options": {"A": "been done outside the United States.", "B": "produced consistent findings.", "C": "related to only a few contexts."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L33", "no": 33, "q": "What does the speaker say about consulting experts?", "options": {"A": "Too few managers ever do it.", "B": "It can be useful in certain circumstances.", "C": "Experts are sometimes unwilling to give advice."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L34", "no": 34, "q": "An expert's knowledge about a business system may be incomplete because", "options": {"A": "some details are difficult for workers to explain.", "B": "workers choose not to mention certain details.", "C": "details are sometimes altered by workers."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 35–40",
                        "instruction": "Complete the notes below. Write ONE WORD ONLY for each answer.",
                        "noteTitle": "Setting up systems based on an existing process",
                        "lines": [
                            {"h": "Two mistakes"},
                            {"plain": True, "html": "Manager tries to: improve on the original process; create an ideal <Q n=\"35\"> from the best parts of several processes"},
                            {"h": "Cause of problems"},
                            {"bullet": True, "html": "information was inaccurate"},
                            {"bullet": True, "html": "comparison between the business settings was invalid"},
                            {"bullet": True, "html": "disadvantages were overlooked, e.g. effect of changes on <Q n=\"36\">"},
                            {"h": "Solution"},
                            {"bullet": True, "html": "change <Q n=\"37\">"},
                            {"bullet": True, "html": "impose rigorous <Q n=\"38\">"},
                            {"bullet": True, "html": "copy original very closely: physical features of the <Q n=\"39\">; the <Q n=\"40\"> of original employees"},
                        ],
                        "questions": [
                            {"id": "L35", "no": 35, "answer": ans("combination", "system"), "explain": explain("combination", "system")},
                            {"id": "L36", "no": 36, "answer": ans("safety"), "explain": explain("safety")},
                            {"id": "L37", "no": 37, "answer": ans("attitude", "attitudes"), "explain": explain("attitude", "attitudes")},
                            {"id": "L38", "no": 38, "answer": ans("control", "controls"), "explain": explain("control", "controls")},
                            {"id": "L39", "no": 39, "answer": ans("factory", "factories"), "explain": explain("factory", "factories")},
                            {"id": "L40", "no": 40, "answer": ans("skills"), "explain": explain("skills")},
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
            "kind": "mcq",
            "title": "Questions 1–3",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q1", "no": 1, "q": "The main topic discussed in the text is", "options": {"A": "the damage caused to US golf courses and golf players by lightning strikes.", "B": "the effect of lightning on power supplies in the US and in Japan.", "C": "a variety of methods used in trying to control lightning strikes.", "D": "a laser technique used in trying to control lightning strikes."}, "answer": ans("D"), "explain": explain("D")},
                {"id": "Q2", "no": 2, "q": "According to the text, every year lightning", "options": {"A": "does considerable damage to buildings during thunderstorms.", "B": "kills or injures mainly golfers in the United States.", "C": "kills or injures around 500 people throughout the world.", "D": "damages more than 100 American power companies."}, "answer": ans("A"), "explain": explain("A")},
                {"id": "Q3", "no": 3, "q": "Researchers at the University of Florida and at the University of New Mexico", "options": {"A": "receive funds from the same source.", "B": "are using the same techniques.", "C": "are employed by commercial companies.", "D": "are in opposition to each other."}, "answer": ans("A"), "explain": explain("A")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 4–6",
            "instruction": "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "EPRI receives financial support from <Q n=\"4\">"},
                {"plain": True, "html": "The advantage of the technique being developed by Diels is that it can be used <Q n=\"5\">"},
                {"plain": True, "html": "The main difficulty associated with using the laser equipment is related to its <Q n=\"6\">"},
            ],
            "questions": [
                {"id": "Q4", "no": 4, "answer": ans("power companies"), "explain": explain("power companies")},
                {"id": "Q5", "no": 5, "answer": ans("safely"), "explain": explain("safely")},
                {"id": "Q6", "no": 6, "answer": ans("size"), "explain": explain("size")},
            ],
        },
        {
            "kind": "wbank",
            "title": "Questions 7–10",
            "instruction": "Complete the summary using the list of words, A–I, below.",
            "box": {
                "A": "cloud-zappers",
                "B": "atoms",
                "C": "storm clouds",
                "D": "mirrors",
                "E": "technique",
                "F": "ions",
                "G": "rockets",
                "H": "conductors",
                "I": "thunder",
            },
            "boxCols": 2,
            "lines": [
                {
                    "html": (
                        "In this method, a laser is used to create a line of ionisation by removing electrons from <Q n=\"7\">. "
                        "This laser is then directed at <Q n=\"8\"> in order to control electrical charges, a method which is less "
                        "dangerous than using <Q n=\"9\">. As a protection for the lasers, the beams are aimed firstly at <Q n=\"10\">."
                    )
                }
            ],
            "questions": [
                {"id": "Q7", "no": 7, "answer": ans("B"), "explain": explain("B")},
                {"id": "Q8", "no": 8, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q9", "no": 9, "answer": ans("G"), "explain": explain("G")},
                {"id": "Q10", "no": 10, "answer": ans("D"), "explain": explain("D")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 11–13",
            "instruction": "Do the following statements agree with the information given in Reading Passage 1?",
            "variant": "yn",
            "questions": [
                {"id": "Q11", "no": 11, "q": "Power companies have given Diels enough money to develop his laser.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q12", "no": 12, "q": "Obtaining money to improve the lasers will depend on tests in real storms.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q13", "no": 13, "q": "Weather forecasters are intensely interested in Diels's system.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "multi",
            "title": "Questions 14–18",
            "instruction": "Choose FIVE letters, A–K. Which FIVE of these beliefs about genius and giftedness are reported by the writer?",
            "box": {
                "A": "Truly gifted people are talented in all areas.",
                "B": "The talents of geniuses are soon exhausted.",
                "C": "Gifted people should use their gifts.",
                "D": "A genius appears once in every generation.",
                "E": "Genius can be easily destroyed by discouragement.",
                "F": "Genius is inherited.",
                "G": "Gifted people are very hard to live with.",
                "H": "People never appreciate true genius.",
                "I": "Geniuses are natural leaders.",
                "J": "Gifted people develop their greatness through difficulties.",
                "K": "Genius will always reveal itself.",
            },
            "answerSet": ["B", "C", "F", "H", "J"],
            "questions": [
                {"id": "Q14", "no": 14, "explain": "答案：B、C、F、H、J，顺序不限。"},
                {"id": "Q15", "no": 15, "explain": "答案：B、C、F、H、J，顺序不限。"},
                {"id": "Q16", "no": 16, "explain": "答案：B、C、F、H、J，顺序不限。"},
                {"id": "Q17", "no": 17, "explain": "答案：B、C、F、H、J，顺序不限。"},
                {"id": "Q18", "no": 18, "explain": "答案：B、C、F、H、J，顺序不限。"},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 19–26",
            "instruction": "Do the following statements agree with the information given in Reading Passage 2?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q19", "no": 19, "q": "Nineteenth-century studies of the nature of genius failed to take into account the uniqueness of the person's upbringing.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q20", "no": 20, "q": "Nineteenth-century studies of genius lacked both objectivity and a proper scientific approach.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q21", "no": 21, "q": "A true genius has general powers capable of excellence in any area.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q22", "no": 22, "q": "The skills of ordinary individuals are in essence the same as the skills of prodigies.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q23", "no": 23, "q": "The ease with which truly great ideas are accepted and taken for granted fails to lessen their significance.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q24", "no": 24, "q": "Giftedness and genius deserve proper scientific research into their true nature so that all talent may be retained for the human race.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q25", "no": 25, "q": "Geniuses often pay a high price to achieve greatness.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q26", "no": 26, "q": "To be a genius is worth the high personal cost.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 27–32",
            "instruction": "Reading Passage 3 has seven paragraphs, A–G. Choose the correct heading for paragraphs B–G from the list below. Example: Paragraph A = v.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "The biological clock",
                "ii": "Why dying is beneficial",
                "iii": "The ageing process of men and women",
                "iv": "Prolonging your life",
                "v": "Limitations of life span",
                "vi": "Modes of development of different species",
                "vii": "A stable life span despite improvements",
                "viii": "Energy consumption",
                "ix": "Fundamental differences in ageing of objects and organisms",
                "x": "Repair of genetic material",
            },
            "questions": [
                {"id": "Q27", "no": 27, "q": "Paragraph B", "answer": ans("ix"), "explain": explain("ix")},
                {"id": "Q28", "no": 28, "q": "Paragraph C", "answer": ans("ii"), "explain": explain("ii")},
                {"id": "Q29", "no": 29, "q": "Paragraph D", "answer": ans("vii"), "explain": explain("vii")},
                {"id": "Q30", "no": 30, "q": "Paragraph E", "answer": ans("i"), "explain": explain("i")},
                {"id": "Q31", "no": 31, "q": "Paragraph F", "answer": ans("viii"), "explain": explain("viii")},
                {"id": "Q32", "no": 32, "q": "Paragraph G", "answer": ans("iv"), "explain": explain("iv")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 33–36",
            "instruction": "Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "Objects age in accordance with principles of <Q n=\"33\"> and of <Q n=\"34\">"},
                {"plain": True, "html": "Through mutations, organisms can <Q n=\"35\"> better to the environment"},
                {"plain": True, "html": "<Q n=\"36\"> would pose a serious problem for the theory of evolution"},
            ],
            "questions": [
                {"id": "Q33", "no": 33, "answer": ans("physical chemistry", "thermodynamics"), "explain": explain("physical chemistry", "thermodynamics")},
                {"id": "Q34", "no": 34, "answer": ans("thermodynamics", "physical chemistry"), "explain": explain("thermodynamics", "physical chemistry")},
                {"id": "Q35", "no": 35, "answer": ans("adapt"), "explain": explain("adapt")},
                {"id": "Q36", "no": 36, "answer": ans("immortality"), "explain": explain("immortality")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 37–40",
            "instruction": "Do the following statements agree with the views of the writer in Reading Passage 3?",
            "variant": "yn",
            "questions": [
                {"id": "Q37", "no": 37, "q": "The wear and tear theory applies to both artificial objects and biological systems.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q38", "no": 38, "q": "In principle, it is possible for a biological system to become older without ageing.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q39", "no": 39, "q": "Within seven years, about 90 per cent of a human body is replaced as new.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q40", "no": 40, "q": "Conserving energy may help to extend a human's life.", "answer": ans("YES"), "explain": explain("YES")},
            ],
        },
    ]
    return {"meta": {"volume": 8, "testNo": 3}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The diagrams below show the stages and equipment used in the cement-making process, "
                "and how cement is used to produce concrete for building purposes.<br><br>"
                "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Cement production and concrete production",
                    "image": "cambridge-8-test-3-cement-concrete.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Increasing the price of petrol is the best way to solve growing traffic and pollution problems.<br><br>"
                "To what extent do you agree or disagree?<br>"
                "What other measures do you think might be effective?<br><br>"
                "Give reasons for your answer and include any relevant examples from your own knowledge or experience.<br>"
                "<strong>Write at least 250 words.</strong>"
            )
        },
    }


def copy_assets() -> None:
    for i, src in enumerate(AUDIO_SRC, start=1):
        if not src.exists():
            raise FileNotFoundError(src)
        dst = LISTENING_DIR / f"cam8_test3_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    cement_dst = WRITING_DIR / "cambridge-8-test-3-cement-concrete.png"
    shutil.copy2(CEMENT_SRC, cement_dst)
    print(f"copied image -> {cement_dst.relative_to(ROOT)}")


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
