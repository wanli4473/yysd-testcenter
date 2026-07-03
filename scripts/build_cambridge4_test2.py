#!/usr/bin/env python3
"""Generate Cambridge IELTS 4 Test 2 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑4T2.docx")
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS4 Test2 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS4 Test2 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS4 Test2 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS4 Test2 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-4-test-2.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-4-test-2-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-4-test-2-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-4-test-1.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-4-test-1-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-4-test-1-writing.html"

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


def patch_listening_table_image(html: str) -> str:
    if "tfig=" in html:
        return html
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
    if needle in html:
        html = html.replace(needle, insert, 1)
        html = html.replace(old_body, new_body, 1)
    return html


def patch_listening_match_image(html: str) -> str:
    if "mfig=" in html:
        return html
    needle = "  else if(g.kind==='match'){\n    const box="
    insert = (
        "  else if(g.kind==='match'){\n"
        "    const mfig=(g.image?`<div class=\"map-wrap\" style=\"margin-bottom:16px;\">"
        "<img class=\"map-img\" src=\"${g.image}\" alt=\"${g.boxTitle||'chart'}\" "
        "style=\"max-width:100%;height:auto;\"></div>`:'');\n"
        "    const box="
    )
    if needle in html:
        html = html.replace(needle, insert, 1)
        html = html.replace("body=box+qs;", "body=mfig+box+qs;", 1)
    return html


def patch_reading_passage_image(html: str) -> str:
    if "pp.image?" in html:
        return html
    needle = "${pp.byline?`<div class=\"pp-byline\">${pp.byline}</div>`:''}"
    insert = (
        "${pp.byline?`<div class=\"pp-byline\">${pp.byline}</div>`:''}"
        "${pp.image?`<div style=\"margin:12px 0;text-align:center;\">"
        "<img class=\"map-img\" src=\"${pp.image}\" alt=\"${pp.title}\" "
        "style=\"max-width:100%;height:auto;\"></div>`:''}"
    )
    if needle in html:
        html = html.replace(needle, insert, 1)
    return html


def patch_reading_table_image(html: str) -> str:
    if "tfig=" in html:
        return html
    needle = "  else if(g.kind==='table'){\n    const cols = g.cols || g.columns || [];"
    insert = (
        "  else if(g.kind==='table'){\n"
        "    const tfig=(g.image?`<div style=\"margin:14px auto 20px;max-width:900px;text-align:center;\">"
        "<img class=\"map-img\" src=\"${g.image}\" alt=\"${g.tableTitle||'table'}\" "
        "style=\"max-width:100%;height:auto;\"></div>`:'');\n"
        "    const cols = g.cols || g.columns || [];"
    )
    old_body = "body=`${(g.tableTitle||g.noteTitle)?`<div class=\"note-title\">${g.tableTitle||g.noteTitle}</div>`:''}<table class=\"note-table\">${head}${rows}</table>`;"
    new_body = "body=tfig+`${(g.tableTitle||g.noteTitle)?`<div class=\"note-title\">${g.tableTitle||g.noteTitle}</div>`:''}<table class=\"note-table\">${head}${rows}</table>`;"
    if needle in html:
        html = html.replace(needle, insert, 1)
        html = html.replace(old_body, new_body, 1)
    return html


def patch_listening_meta(html: str) -> str:
    reps = [
        ("剑桥雅思4 Test 1 听力", "剑桥雅思4 Test 2 听力"),
        ("剑桥雅思4 · Test 1（听力）", "剑桥雅思4 · Test 2（听力）"),
        ("剑桥雅思4 Test 1 听力：", "剑桥雅思4 Test 2 听力："),
        ("Test 1 听力（官方原题 + 官方答案）", "Test 2 听力（官方原题 + 官方答案）"),
        ("剑桥雅思 4 · Test 1", "剑桥雅思 4 · Test 2"),
        ("剑桥雅思4 · Test 1", "剑桥雅思4 · Test 2"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
        ("ielts4_test1", "ielts4_test2"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return patch_listening_match_image(patch_listening_table_image(inject_state_vars(html)))


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思4 Test 1 阅读", "剑桥雅思4 Test 2 阅读"),
        ("剑桥雅思4 · Test 1（阅读）", "剑桥雅思4 · Test 2（阅读）"),
        ("剑桥雅思4 Test 1 学术类阅读", "剑桥雅思4 Test 2 学术类阅读"),
        ("Test 1 阅读（官方原题 + 官方答案）", "Test 2 阅读（官方原题 + 官方答案）"),
        (
            "Adults and children — loss o… / What Do Whales Feel? / Visual Symbols and the Blind",
            "Lost for Words / Alternative Medicine in Australia / Play Is a Serious Business",
        ),
        (
            "Rainforests、What Do Whales Feel?、Visual Symbols and the Blind",
            "Lost for Words、Alternative Medicine in Australia、Play Is a Serious Business",
        ),
        ("剑桥雅思 4 · Test 1", "剑桥雅思 4 · Test 2"),
        ("剑桥雅思4 · Test 1", "剑桥雅思4 · Test 2"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return patch_reading_table_image(patch_reading_passage_image(inject_state_vars(html)))


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思4 Test 1 写作", "剑桥雅思4 Test 2 写作"),
        ("剑桥雅思4 · Test 1（写作）", "剑桥雅思4 · Test 2（写作）"),
        ("剑桥雅思4 Test 1 学术类写作", "剑桥雅思4 Test 2 学术类写作"),
        (
            "Task 1 poverty table + Task 2 media for communicating information essay",
            "Task 1 electricity graph & pie chart + Task 2 happiness essay",
        ),
        (
            "Task 1 表格作文 + Task 2 议论文",
            "Task 1 电力图表 + Task 2 幸福话题议论文",
        ),
        ("剑桥雅思 4 · Test 1", "剑桥雅思 4 · Test 2"),
        ("剑桥雅思4 · Test 1", "剑桥雅思4 · Test 2"),
        ("Test 1 写作（官方真题）", "Test 2 写作（官方真题）"),
        ("cambridge-4-test-1-writing-draft", "cambridge-4-test-2-writing-draft"),
        ("【剑桥雅思4 · Test 1 写作】", "【剑桥雅思4 · Test 2 写作】"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
        ("poverty-table", "electricity-charts"),
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
                "title": "Lost for Words",
                "byline": "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.",
                "paras": p[147:156],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": "Alternative Medicine in Australia",
                "byline": "You should spend about 20 minutes on Questions 14–26, which are based on Reading Passage 2 below.",
                "paras": p[181:186],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": "Play Is a Serious Business",
                "byline": "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
                "paras": [
                    "<em>Does play help develop bigger, better brains? Bryant Furlow investigates</em>",
                    *p[214:223],
                ],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 4, "testNo": 2},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "ielts4_test2_audio1.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 1–5",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L1", "no": 1, "q": "What does Peter want to drink?", "options": {"A": "tea", "B": "coffee", "C": "a cold drink"}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L2", "no": 2, "q": "What caused Peter problems at the bank?", "options": {"A": "The exchange rate was down.", "B": "He was late.", "C": "The computers weren't working."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L3", "no": 3, "q": "Who did Peter talk to at the bank?", "options": {"A": "an old friend", "B": "an American man", "C": "a German man"}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L4", "no": 4, "q": "Henry gave Peter a map of", "options": {"A": "the city.", "B": "the bus routes.", "C": "the train system."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L5", "no": 5, "q": "What do Peter and Sally decide to order?", "options": {"A": "food and drinks", "B": "just food", "C": "just drinks"}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 6–8",
                        "instruction": "Complete the notes below using words from the box.",
                        "noteTitle": "Word box: Cathedral · Art Gallery · Gardens · Markets · Castle",
                        "lines": [
                            {"plain": True, "html": "Tourist attractions open all day: <Q n=\"6\"> and Gardens"},
                            {"plain": True, "html": "Tourist attractions NOT open on Mondays: <Q n=\"7\"> and Castle"},
                            {"plain": True, "html": "Tourist attractions which have free entry: <Q n=\"8\"> and Markets"},
                        ],
                        "questions": [
                            {"id": "L6", "no": 6, "answer": ans("Cathedral"), "explain": explain("Cathedral")},
                            {"id": "L7", "no": 7, "answer": ans("Markets"), "explain": explain("Markets")},
                            {"id": "L8", "no": 8, "answer": ans("Gardens"), "explain": explain("Gardens")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 9 and 10",
                        "instruction": "Complete the sentences below. Write NO MORE THAN THREE WORDS for each answer.",
                        "lines": [
                            {"plain": True, "html": "9 The first place Peter and Sally will visit is the <Q n=\"9\">"},
                            {"plain": True, "html": "10 At the Cathedral, Peter really wants to <Q n=\"10\">"},
                        ],
                        "questions": [
                            {"id": "L9", "no": 9, "answer": ans("Art Gallery"), "explain": explain("Art Gallery")},
                            {"id": "L10", "no": 10, "answer": ans("climb the tower", "see the view"), "explain": explain("climb the tower", "see the view")},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "ielts4_test2_audio2.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 11–20",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L11", "no": 11, "q": "The Counselling Service may contact tutors if", "options": {"A": "they are too slow in marking assignments.", "B": "they give students a lot of work.", "C": "they don't inform students about their progress."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L12", "no": 12, "q": "Stress may be caused by", "options": {"A": "new teachers.", "B": "time pressure.", "C": "unfamiliar subject matter."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L13", "no": 13, "q": "International students may find stress difficult to handle because", "options": {"A": "they lack support from family and friends.", "B": "they don't have time to make new friends.", "C": "they find it difficult to socialise."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L14", "no": 14, "q": "A personal crisis may be caused by", "options": {"A": "studying for too long overseas.", "B": "business problems in the student's own country.", "C": "disruptions to personal relationships."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L15", "no": 15, "q": "Students may lose self-esteem if", "options": {"A": "they have to change courses.", "B": "they don't complete a course.", "C": "their family puts too much pressure on them."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L16", "no": 16, "q": "Students should consult Glenda Roberts if", "options": {"A": "their general health is poor.", "B": "their diet is too strict.", "C": "they can't eat the local food."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L17", "no": 17, "q": "Students in financial difficulties can receive", "options": {"A": "assistance to buy books.", "B": "a loan to pay their course fees.", "C": "a no-interest loan to cover study expenses."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L18", "no": 18, "q": "Loans are also available to students who", "options": {"A": "can't pay their rent.", "B": "need to buy furniture.", "C": "can't cover their living expenses."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L19", "no": 19, "q": "The number of students counselled by the service last year was", "options": {"A": "214.", "B": "240.", "C": "2,600."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L20", "no": 20, "q": "The speaker thinks the Counselling Service", "options": {"A": "has been effective in spite of staff shortages.", "B": "is under-used by students.", "C": "has suffered badly because of staff cuts."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    }
                ],
            },
            {
                "id": 3,
                "audio": "ielts4_test2_audio3.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 21–24",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "DETAILS OF ASSIGNMENT",
                        "lines": [
                            {"h": "Part 1: Essay"},
                            {"plain": True, "html": "Title: 'Assess the two main methods of <Q n=\"21\"> in social science research'"},
                            {"plain": True, "html": "Number of words: <Q n=\"22\">"},
                            {"h": "Part 2: Small-scale study"},
                            {"plain": True, "html": "Gather data from at least <Q n=\"23\"> subjects"},
                            {"h": "Part 3: Report on study"},
                            {"plain": True, "html": "Number of words: <Q n=\"24\">"},
                        ],
                        "questions": [
                            {"id": "L21", "no": 21, "answer": ans("collecting data", "gathering data", "data collection"), "explain": explain("collecting data", "gathering data", "data collection")},
                            {"id": "L22", "no": 22, "answer": ans("1500", "1,500"), "explain": explain("1500", "1,500")},
                            {"id": "L23", "no": 23, "answer": ans("5"), "explain": explain("5")},
                            {"id": "L24", "no": 24, "answer": ans("3000-4000", "3000 to 4000", "3,000-4,000"), "explain": explain("3000-4000", "3000 to 4000")},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 25 and 26",
                        "instruction": "Choose TWO letters, A–E. What TWO disadvantages of the questionnaire form of data collection do the students discuss?",
                        "box": {
                            "A": "The data is sometimes invalid.",
                            "B": "Too few people may respond.",
                            "C": "It is less likely to reveal the unexpected.",
                            "D": "It can only be used with literate populations.",
                            "E": "There is a delay between the distribution and return of questionnaires.",
                        },
                        "answerSet": ["B", "C"],
                        "questions": [
                            {"id": "L25", "no": 25, "explain": explain("B", "C")},
                            {"id": "L26", "no": 26, "explain": explain("B", "C")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 27–30",
                        "instruction": "Complete the table below. Write NO MORE THAN THREE WORDS OR A NUMBER for each answer.",
                        "cols": ["Author", "Title", "Publisher", "Year of Publication"],
                        "rows": [
                            ["<Q n=\"27\">", "Sample Surveys in Social Science Research", "", ""],
                            ["Bell", "<Q n=\"28\">", "<Q n=\"29\">", ""],
                            ["Wilson", "Interviews that work", "Oxford University Press", "<Q n=\"30\">"],
                        ],
                        "questions": [
                            {"id": "L27", "no": 27, "answer": ans("Mehta"), "explain": explain("Mehta")},
                            {"id": "L28", "no": 28, "answer": ans("Survey Research"), "explain": explain("Survey Research")},
                            {"id": "L29", "no": 29, "answer": ans("London University", "London University Press"), "explain": explain("London University", "London University Press")},
                            {"id": "L30", "no": 30, "answer": ans("1988"), "explain": explain("1988")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "ielts4_test2_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 31 and 32",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L31", "no": 31, "q": "Corporate crime is generally committed", "options": {"A": "against individuals.", "B": "by groups.", "C": "for companies."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L32", "no": 32, "q": "Corporate crime does NOT include", "options": {"A": "employees stealing from their company.", "B": "unintentional crime by employees.", "C": "fraud resulting from company policy."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 33–38",
                        "instruction": "Complete the notes below. Write NO MORE THAN THREE WORDS for each answer.",
                        "noteTitle": "Corporate Crime",
                        "lines": [
                            {"h": "Corporate crime has been ignored by:"},
                            {"bullet": True, "html": "the <Q n=\"33\"> e.g. films"},
                            {"bullet": True, "html": "<Q n=\"34\">"},
                            {"h": "Reasons:"},
                            {"bullet": True, "html": "often more complex, and needing <Q n=\"35\">"},
                            {"bullet": True, "html": "less human interest than conventional crime"},
                            {"bullet": True, "html": "victims often <Q n=\"36\">"},
                            {"h": "Effects — Economic costs"},
                            {"bullet": True, "html": "may appear unimportant to <Q n=\"37\">"},
                            {"bullet": True, "html": "can make large <Q n=\"38\"> for company"},
                        ],
                        "questions": [
                            {"id": "L33", "no": 33, "answer": ans("mass media", "media"), "explain": explain("mass media", "media")},
                            {"id": "L34", "no": 34, "answer": ans("academic circles", "academics", "researchers"), "explain": explain("academic circles", "academics", "researchers")},
                            {"id": "L35", "no": 35, "answer": ans("specialist knowledge", "specialised knowledge"), "explain": explain("specialist knowledge", "specialised knowledge")},
                            {"id": "L36", "no": 36, "answer": ans("unaware"), "explain": explain("unaware")},
                            {"id": "L37", "no": 37, "answer": ans("individual customers", "individual consumers", "individuals"), "explain": explain("individual customers", "individual consumers", "individuals")},
                            {"id": "L38", "no": 38, "answer": ans("illegal profit", "illegal profits"), "explain": explain("illegal profit", "illegal profits")},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 39 and 40",
                        "instruction": "Choose TWO letters, A–F. The oil tanker explosion was an example of a crime which",
                        "box": {
                            "A": "was no-one's fault.",
                            "B": "was not a corporate crime.",
                            "C": "was intentional.",
                            "D": "was caused by indifference.",
                            "E": "had tragic results.",
                            "F": "made a large profit for the company.",
                        },
                        "answerSet": ["D", "E"],
                        "questions": [
                            {"id": "L39", "no": 39, "explain": explain("D", "E")},
                            {"id": "L40", "no": 40, "explain": explain("D", "E")},
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
            "kind": "note",
            "title": "Questions 1–4",
            "instruction": "Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "lines": [
                {"html": "There are currently approximately 6,800 languages in the world. This great variety of languages came about largely as a result of geographical <Q n=\"1\">. But in today's world, factors such as government initiatives and <Q n=\"2\"> are contributing to a huge decrease in the number of languages. One factor which may help to ensure that some endangered languages do not die out completely is people's increasing appreciation of their <Q n=\"3\">. This has been encouraged through programmes of language classes for children and through 'apprentice' schemes, in which the endangered language is used as the medium of instruction to teach people a <Q n=\"4\">."},
            ],
            "questions": [
                {"id": "Q1", "no": 1, "answer": ans("isolation"), "explain": explain("isolation")},
                {"id": "Q2", "no": 2, "answer": ans("economic globalisation", "economic globalization", "socio-economic pressures", "socioeconomic pressures"), "explain": explain("economic globalisation", "economic globalization")},
                {"id": "Q3", "no": 3, "answer": ans("cultural identity"), "explain": explain("cultural identity")},
                {"id": "Q4", "no": 4, "answer": ans("traditional skill", "traditional skills"), "explain": explain("traditional skill", "traditional skills")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 5–9",
            "instruction": "Look at the following statements and the list of people below. Match each statement with the correct person A–E.",
            "boxTitle": "List of People",
            "box": {
                "A": "Michael Krauss",
                "B": "Salikoko Mufwene",
                "C": "Nicholas Ostler",
                "D": "Mark Pagel",
                "E": "Doug Whalen",
            },
            "questions": [
                {"id": "Q5", "no": 5, "q": "Endangered languages cannot be saved unless people learn to speak more than one language.", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q6", "no": 6, "q": "Saving languages from extinction is not in itself a satisfactory goal.", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q7", "no": 7, "q": "The way we think may be determined by our language.", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q8", "no": 8, "q": "Young people often reject the established way of life in their community.", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q9", "no": 9, "q": "A change of language may mean a loss of traditional culture.", "answer": ans("B"), "explain": explain("B")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 10–13",
            "instruction": "Do the following statements agree with the views of the writer in Reading Passage 1?",
            "variant": "yn",
            "options": ["YES", "NO", "NOT GIVEN"],
            "questions": [
                {"id": "Q10", "no": 10, "q": "The Navajo language will die out because it currently has too few speakers.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q11", "no": 11, "q": "A large number of native speakers fails to guarantee the survival of a language.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q12", "no": 12, "q": "National governments could do more to protect endangered languages.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q13", "no": 13, "q": "The loss of linguistic diversity is inevitable.", "answer": ans("YES"), "explain": explain("YES")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "mcq",
            "title": "Questions 14–15",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {
                    "id": "Q14",
                    "no": 14,
                    "q": "Traditionally, how have Australian doctors differed from doctors in many Western countries?",
                    "options": {
                        "A": "They have worked closely with pharmaceutical companies.",
                        "B": "They have often worked alongside other therapists.",
                        "C": "They have been reluctant to accept alternative therapists.",
                        "D": "They have regularly prescribed alternative remedies.",
                    },
                    "answer": ans("C"),
                    "explain": explain("C"),
                },
                {
                    "id": "Q15",
                    "no": 15,
                    "q": "In 1990, Americans",
                    "options": {
                        "A": "were prescribed more herbal medicines than in previous years.",
                        "B": "consulted alternative therapists more often than doctors.",
                        "C": "spent more on natural therapies than orthodox medicines.",
                        "D": "made more complaints about doctors than in previous years.",
                    },
                    "answer": ans("B"),
                    "explain": explain("B"),
                },
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 16–23",
            "instruction": "Do the following statements agree with the views of the writer in Reading Passage 2?",
            "variant": "yn",
            "options": ["YES", "NO", "NOT GIVEN"],
            "questions": [
                {"id": "Q16", "no": 16, "q": "Australians have been turning to alternative therapies in increasing numbers over the past 20 years.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q17", "no": 17, "q": "Between 1983 and 1990 the numbers of patients visiting alternative therapists rose to include a further 8% of the population.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q18", "no": 18, "q": "The 1990 survey related to 550,000 consultations with alternative therapists.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q19", "no": 19, "q": "In the past, Australians had a higher opinion of doctors than they do today.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q20", "no": 20, "q": "Some Australian doctors are retraining in alternative therapies.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q21", "no": 21, "q": "Alternative therapists earn higher salaries than doctors.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q22", "no": 22, "q": "The 1993 Sydney survey involved 289 patients who visited alternative therapists for acupuncture treatment.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q23", "no": 23, "q": "All the patients in the 1993 Sydney survey had long-term medical complaints.", "answer": ans("YES"), "explain": explain("YES")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 24–26",
            "instruction": "Complete the labels on the chart below. Write NO MORE THAN THREE WORDS for each answer.",
            "image": "cambridge-4-test-2-patient-chart.png",
            "lines": [
                {"plain": True, "html": "24 <Q n=\"24\">"},
                {"plain": True, "html": "25 <Q n=\"25\">"},
                {"plain": True, "html": "26 <Q n=\"26\">"},
            ],
            "questions": [
                {"id": "Q24", "no": 24, "answer": ans("emotional", "emotional problems"), "explain": explain("emotional", "emotional problems")},
                {"id": "Q25", "no": 25, "answer": ans("headache", "headaches"), "explain": explain("headache", "headaches")},
                {"id": "Q26", "no": 26, "answer": ans("general ill health"), "explain": explain("general ill health")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 27–32",
            "instruction": "Reading Passage 3 has nine paragraphs labelled A–I. Which paragraph contains the following information?",
            "boxTitle": "Paragraphs",
            "box": {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "F": "F", "G": "G", "H": "H", "I": "I"},
            "questions": [
                {"id": "Q27", "no": 27, "q": "the way play causes unusual connections in the brain which are beneficial", "answer": ans("H"), "explain": explain("H")},
                {"id": "Q28", "no": 28, "q": "insights from recording how much time young animals spend playing", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q29", "no": 29, "q": "a description of the physical hazards that can accompany play", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q30", "no": 30, "q": "a description of the mental activities which are exercised and developed during play", "answer": ans("H"), "explain": explain("H")},
                {"id": "Q31", "no": 31, "q": "the possible effects that a reduction in play opportunities will have on humans", "answer": ans("I"), "explain": explain("I")},
                {"id": "Q32", "no": 32, "q": "the classes of animals for which play is important", "answer": ans("B"), "explain": explain("B")},
            ],
        },
        {
            "kind": "multi",
            "title": "Questions 33–35",
            "instruction": "Which THREE of the following ways of regarding play are mentioned by the writer?",
            "box": {
                "A": "a rehearsal for later adult activities",
                "B": "a method animals use to prove themselves to their peer group",
                "C": "an activity intended to build up strength for adulthood",
                "D": "a means of communicating feelings",
                "E": "a defensive strategy",
                "F": "an activity assisting organ growth",
            },
            "answerSet": ["A", "C", "F"],
            "questions": [
                {"id": "Q33", "no": 33, "explain": explain("A", "C", "F")},
                {"id": "Q34", "no": 34, "explain": explain("A", "C", "F")},
                {"id": "Q35", "no": 35, "explain": explain("A", "C", "F")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 36–40",
            "instruction": "Match each finding with the correct researcher A–H.",
            "boxTitle": "Findings",
            "box": {
                "A": "There is a link between a specific substance in the brain and playing.",
                "B": "Play provides input concerning physical surroundings.",
                "C": "Varieties of play can be matched to different stages of evolutionary history.",
                "D": "There is a tendency for mammals with smaller brains to play less.",
                "E": "Play is not a form of fitness training for the future.",
                "F": "Some species of larger-brained birds engage in play.",
                "G": "A wide range of activities are combined during play.",
                "H": "Play is a method of teaching survival techniques.",
            },
            "questions": [
                {"id": "Q36", "no": 36, "q": "Robert Barton", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q37", "no": 37, "q": "Marc Bekoff", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q38", "no": 38, "q": "John Byers", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q39", "no": 39, "q": "Sergio Pellis", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q40", "no": 40, "q": "Stephen Siviy", "answer": ans("A"), "explain": explain("A")},
            ],
        },
    ]
    return {"meta": {"volume": 4, "testNo": 2}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The graph below shows the demand for electricity in England during typical days in winter and summer. "
                "The pie chart shows how electricity is used in an average English home.<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {"caption": "Demand for electricity — typical winter and summer days", "image": "cambridge-4-test-2-electricity-demand.png"},
                {"caption": "Electricity use in an average English home", "image": "cambridge-4-test-2-electricity-home.png"},
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Happiness is considered very important in life.<br><br>"
                "Why is it difficult to define?<br>"
                "What factors are important in achieving happiness?<br><br>"
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
        dst = LISTENING_DIR / f"ielts4_test2_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")


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
