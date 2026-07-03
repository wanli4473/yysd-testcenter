#!/usr/bin/env python3
"""Generate Cambridge IELTS 4 Test 1 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑4T1.docx")
ASSETS = Path("/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets")
SOCIAL_SRC = ASSETS / "__2026-07-03_11.44.45-516f5392-b8df-4845-9095-a7b2562e537c.png"
TRIPS_SRC = ASSETS / "__2026-07-03_11.44.51-88fa0c1d-050c-4bca-ad35-7bb7ce45789d.png"
MAP_SRC = ASSETS / "__2026-07-03_11.44.59-2603994b-96dd-4876-8a89-1d75424a1f0f.png"
CHART_SRC = ASSETS / "__2026-07-03_11.45.06-a3aa3ba5-6617-4fab-a20d-f3609af0e29a.png"
WHALE_SRC = ASSETS / "__2026-07-03_11.45.16-cc484cfa-09a7-4cf9-8b37-2d9a0f923679.png"
CIRCLE_SRC = ASSETS / "__2026-07-03_11.45.27-1831a803-1fda-4e05-9362-46508accf830.png"
POVERTY_SRC = ASSETS / "__2026-07-03_11.45.37-ec51ae85-23b7-4a17-bfc3-d4de8b7d9c56.png"
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS4 Test1 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS4 Test1 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS4 Test1 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS4 Test1 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-4-test-1.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-4-test-1-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-4-test-1-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-5-test-4.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-5-test-4-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-5-test-4-writing.html"

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


def patch_listening_match_image(html: str) -> str:
    needle = "  else if(g.kind==='match'){\n    const box="
    insert = (
        "  else if(g.kind==='match'){\n"
        "    const mfig=(g.image?`<div class=\"map-wrap\" style=\"margin-bottom:16px;\">"
        "<img class=\"map-img\" src=\"${g.image}\" alt=\"${g.boxTitle||'chart'}\" "
        "style=\"max-width:100%;height:auto;\"></div>`:'');\n"
        "    const box="
    )
    old = "body=box+qs;"
    new = "body=mfig+box+qs;"
    if "mfig=" not in html and needle in html:
        html = html.replace(needle, insert, 1)
        html = html.replace(old, new, 1)
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


def patch_reading_table_image(html: str) -> str:
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
    if "tfig=" not in html and needle in html:
        html = html.replace(needle, insert, 1)
        html = html.replace(old_body, new_body, 1)
    return html


def patch_listening_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 4 听力", "剑桥雅思4 Test 1 听力"),
        ("剑桥雅思5 · Test 4（听力）", "剑桥雅思4 · Test 1（听力）"),
        ("剑桥雅思5 Test 4 听力：", "剑桥雅思4 Test 1 听力："),
        ("Test 4 听力（官方原题 + 官方答案）", "Test 1 听力（官方原题 + 官方答案）"),
        ("剑桥雅思 5 · Test 4", "剑桥雅思 4 · Test 1"),
        ("剑桥雅思5 · Test 4", "剑桥雅思4 · Test 1"),
        ("Test 4", "Test 1"),
        ("test-4", "test-1"),
        ("ielts5_test4", "ielts4_test1"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = patch_listening_match_image(patch_listening_table_image(inject_state_vars(html)))
    return html


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 4 阅读", "剑桥雅思4 Test 1 阅读"),
        ("剑桥雅思5 · Test 4（阅读）", "剑桥雅思4 · Test 1（阅读）"),
        ("剑桥雅思5 Test 4 学术类阅读", "剑桥雅思4 Test 1 学术类阅读"),
        ("Test 4 阅读（官方原题 + 官方答案）", "Test 1 阅读（官方原题 + 官方答案）"),
        (
            "Wilderness Tourism、Toughened Glass、Effects of Light",
            "Rainforests、What Do Whales Feel?、Visual Symbols and the Blind",
        ),
        ("剑桥雅思 5 · Test 4", "剑桥雅思 4 · Test 1"),
        ("剑桥雅思5 · Test 4", "剑桥雅思4 · Test 1"),
        ("Test 4", "Test 1"),
        ("test-4", "test-1"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = patch_reading_table_image(patch_reading_passage_image(inject_state_vars(html)))
    return html


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思5 Test 4 写作", "剑桥雅思4 Test 1 写作"),
        ("剑桥雅思5 · Test 4（写作）", "剑桥雅思4 · Test 1（写作）"),
        ("剑桥雅思5 Test 4 学术类写作", "剑桥雅思4 Test 1 学术类写作"),
        (
            "Task 1 underground railway table + Task 2 nature vs nurture essay",
            "Task 1 poverty table + Task 2 media for communicating information essay",
        ),
        ("剑桥雅思 5 · Test 4", "剑桥雅思 4 · Test 1"),
        ("剑桥雅思5 · Test 4", "剑桥雅思4 · Test 1"),
        ("Test 4 写作（官方真题）", "Test 1 写作（官方真题）"),
        ("cambridge-5-test-4-writing-draft", "cambridge-4-test-1-writing-draft"),
        ("【剑桥雅思5 · Test 4 写作】", "【剑桥雅思4 · Test 1 写作】"),
        ("Test 4", "Test 1"),
        ("test-4", "test-1"),
        ("underground-railway", "poverty-table"),
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
                "title": "Adults and children — loss of tropical rainforests",
                "byline": "You should spend about 20 minutes on Questions 1–14, which are based on Reading Passage 1 below.",
                "paras": p[82:93],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": "What Do Whales Feel?",
                "byline": "You should spend about 20 minutes on Questions 15–26, which are based on Reading Passage 2 below.",
                "paras": [
                    "<em>An examination of the functioning of the senses in cetaceans, the group of mammals comprising whales, dolphins and porpoises</em>",
                    *p[138:144],
                ],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": "Visual Symbols and the Blind",
                "byline": "You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.",
                "image": "cambridge-4-test-1-circle-square.png",
                "paras": [
                    *p[156:161],
                    *p[162:164],
                    "When we tested four totally blind volunteers using the same list, we found that their choices closely resembled those made by the sighted subjects. One man, who had been blind since birth, scored extremely well. He made only one match differing from the consensus, assigning 'far' to square and 'near' to circle. In fact, only a small majority of sighted subjects — 53% — had paired far and near to the opposite partners. Thus, we concluded that the blind interpret abstract shapes as sighted people do.",
                ],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 4, "testNo": 1},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "ielts4_test1_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–4",
                        "instruction": "Complete the notes below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "NOTES ON SOCIAL PROGRAMME",
                        "image": "cambridge-4-test-1-social-programme.png",
                        "lines": [
                            {"plain": True, "html": "Example: Number of trips per month: 5"},
                            {"h": "Visit places which have:"},
                            {"bullet": True, "html": "historical interest"},
                            {"bullet": True, "html": "good <Q n=\"1\">"},
                            {"bullet": True, "html": "<Q n=\"2\">"},
                            {"plain": True, "html": "Cost: between £5.00 and £15.00 per person"},
                            {"plain": True, "html": "special trips organised for groups of <Q n=\"3\"> people"},
                            {"plain": True, "html": "departure – 8.30 a.m. · return – 6.00 p.m."},
                            {"plain": True, "html": "To reserve a seat: sign name on the <Q n=\"4\"> 3 days in advance"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("shopping", "variety of shopping"), "explain": explain("shopping", "variety of shopping")},
                            {"id": "L2", "no": 2, "answer": ans("guided tours"), "explain": explain("guided tours")},
                            {"id": "L3", "no": 3, "answer": ans("more than 12", "over 12"), "explain": explain("more than 12", "over 12")},
                            {"id": "L4", "no": 4, "answer": ans("notice board"), "explain": explain("notice board")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 5–10",
                        "instruction": "Complete the table below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "tableTitle": "WEEKEND TRIPS",
                        "image": "cambridge-4-test-1-weekend-trips.png",
                        "cols": ["Place", "Date", "Number of seats", "Optional extra"],
                        "rows": [
                            ["St Ives", "<Q n=\"5\">", "16", "Hepworth Museum"],
                            ["London", "16th February", "45", "<Q n=\"6\">"],
                            ["<Q n=\"7\">", "3rd March", "18", "S.S. Great Britain"],
                            ["Salisbury", "18th March", "50", "Stonehenge"],
                            ["Bath", "23rd March", "16", "<Q n=\"8\">"],
                        ],
                        "questions": [
                            {"id": "L5", "no": 5, "answer": ans("13th February", "13 February"), "explain": explain("13th February", "13 February")},
                            {"id": "L6", "no": 6, "answer": ans("Tower of London"), "explain": explain("Tower of London")},
                            {"id": "L7", "no": 7, "answer": ans("Bristol"), "explain": explain("Bristol")},
                            {"id": "L8", "no": 8, "answer": ans("American Museum"), "explain": explain("American Museum")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 9–10",
                        "instruction": "Complete the notes below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "lines": [
                            {"plain": True, "html": "For further information: read the <Q n=\"9\"> or see Social Assistant: Jane <Q n=\"10\">"},
                        ],
                        "questions": [
                            {"id": "L9", "no": 9, "answer": ans("student newspaper"), "explain": explain("student newspaper")},
                            {"id": "L10", "no": 10, "answer": ans("Yentob"), "explain": explain("Yentob")},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "ielts4_test1_audio2.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 11–14",
                        "instruction": "Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "lines": [
                            {"plain": True, "html": "11 Riverside Village was a good place to start an industry because it had water, raw materials and fuels such as <Q n=\"11\"> and <Q n=\"12\">"},
                            {"plain": True, "html": "12 The metal industry was established at Riverside Village by <Q n=\"13\"> who lived in the area."},
                            {"plain": True, "html": "13 There were over <Q n=\"14\"> water-powered mills in the area in the eighteenth century."},
                        ],
                        "questions": [
                            {"id": "L11", "no": 11, "answer": ans("coal"), "explain": explain("coal")},
                            {"id": "L12", "no": 12, "answer": ans("firewood"), "explain": explain("firewood")},
                            {"id": "L13", "no": 13, "answer": ans("local craftsmen"), "explain": explain("local craftsmen")},
                            {"id": "L14", "no": 14, "answer": ans("160"), "explain": explain("160")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 15–20",
                        "instruction": "Label the plan below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Riverside Industrial Village",
                        "image": "cambridge-4-test-1-riverside-map.png",
                        "lines": [
                            {"plain": True, "html": "15 <Q n=\"15\"> Road"},
                            {"plain": True, "html": "16 The <Q n=\"16\">"},
                            {"plain": True, "html": "17 The <Q n=\"17\">"},
                            {"plain": True, "html": "18 The <Q n=\"18\">"},
                            {"plain": True, "html": "19 The <Q n=\"19\">"},
                            {"plain": True, "html": "20 The <Q n=\"20\"> for the workers"},
                        ],
                        "questions": [
                            {"id": "L15", "no": 15, "answer": ans("Woodside"), "explain": explain("Woodside")},
                            {"id": "L16", "no": 16, "answer": ans("Ticket Office"), "explain": explain("Ticket Office")},
                            {"id": "L17", "no": 17, "answer": ans("Gift Shop"), "explain": explain("Gift Shop")},
                            {"id": "L18", "no": 18, "answer": ans("main Workshop", "Workshop"), "explain": explain("main Workshop", "Workshop")},
                            {"id": "L19", "no": 19, "answer": ans("Showroom"), "explain": explain("Showroom")},
                            {"id": "L20", "no": 20, "answer": ans("Cafe", "Café"), "explain": explain("Cafe", "Café")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "ielts4_test1_audio3.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 21 and 22",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L21",
                                "no": 21,
                                "q": "Melanie says she has not started the assignment because",
                                "options": {
                                    "A": "she was doing work for another course.",
                                    "B": "it was a really big assignment.",
                                    "C": "she hasn't spent time in the library.",
                                },
                                "answer": ans("A"),
                                "explain": explain("A"),
                            },
                            {
                                "id": "L22",
                                "no": 22,
                                "q": "The lecturer says that reasonable excuses for extensions are",
                                "options": {
                                    "A": "planning problems.",
                                    "B": "problems with assignment deadlines.",
                                    "C": "personal illness or accident.",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                        ],
                    },
                    {
                        "kind": "match",
                        "title": "Questions 23–27",
                        "instruction": "What recommendations does Dr Johnson make about the journal articles? Choose your answers from the box and write the letters A–G next to questions 23–27.",
                        "boxTitle": "Recommendations",
                        "box": {
                            "A": "must read",
                            "B": "useful",
                            "C": "limited value",
                            "D": "read first section",
                            "E": "read research methods",
                            "F": "read conclusion",
                            "G": "don't read",
                        },
                        "subTitle": "Articles",
                        "questions": [
                            {"id": "L23", "no": 23, "q": "Jackson", "answer": ans("E"), "explain": explain("E")},
                            {"id": "L24", "no": 24, "q": "Roberts", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L25", "no": 25, "q": "Morris", "answer": ans("G"), "explain": explain("G")},
                            {"id": "L26", "no": 26, "q": "Cooper", "answer": ans("F"), "explain": explain("F")},
                            {"id": "L27", "no": 27, "q": "Forster", "answer": ans("C"), "explain": explain("C")},
                        ],
                    },
                    {
                        "kind": "match",
                        "title": "Questions 28–30",
                        "instruction": "Label the chart below. Choose your answers from the box and write the letters A–H next to questions 28–30.",
                        "boxTitle": "Reasons for changing accommodation",
                        "image": "cambridge-4-test-1-population-chart.png",
                        "box": {
                            "A": "proximity to work",
                            "B": "other people's recommendations",
                            "C": "suitable accommodation",
                            "D": "family and friends",
                            "E": "space",
                            "F": "low rent",
                            "G": "quiet area",
                            "H": "local facilities",
                        },
                        "subTitle": "Chart labels",
                        "questions": [
                            {"id": "L28", "no": 28, "q": "Reason 28", "answer": ans("D"), "explain": explain("D")},
                            {"id": "L29", "no": 29, "q": "Reason 29", "answer": ans("A"), "explain": explain("A")},
                            {"id": "L30", "no": 30, "q": "Reason 30", "answer": ans("B"), "explain": explain("B")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "ielts4_test1_audio4.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 31–40",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "THE URBAN LANDSCAPE",
                        "lines": [
                            {"h": "Two areas of focus:"},
                            {"bullet": True, "html": "the effect of vegetation on the urban climate"},
                            {"bullet": True, "html": "way of planning our <Q n=\"31\"> better"},
                            {"h": "Large-scale impact of trees:"},
                            {"bullet": True, "html": "they can make cities more or less <Q n=\"32\">"},
                            {"bullet": True, "html": "in summer they can make cities cooler"},
                            {"bullet": True, "html": "they can make inland cities more <Q n=\"33\">"},
                            {"h": "Local impact of trees:"},
                            {"bullet": True, "html": "they can make local areas more <Q n=\"34\">"},
                            {"bullet": True, "html": "cooler · more humid · less windy · less <Q n=\"35\">"},
                            {"h": "Comparing trees and buildings"},
                            {"plain": True, "html": "Temperature regulation: trees evaporate water through their <Q n=\"36\">"},
                            {"plain": True, "html": "Wind force: tall buildings cause more wind at <Q n=\"37\"> level; trees <Q n=\"38\"> the wind force"},
                            {"plain": True, "html": "Noise: <Q n=\"39\"> frequency noise passes through trees"},
                            {"h": "Important points to consider:"},
                            {"bullet": True, "html": "trees require a lot of sunlight, water and <Q n=\"40\"> to grow"},
                        ],
                        "questions": [
                            {"id": "L31", "no": 31, "answer": ans("cities", "environment"), "explain": explain("cities", "environment")},
                            {"id": "L32", "no": 32, "answer": ans("windy"), "explain": explain("windy")},
                            {"id": "L33", "no": 33, "answer": ans("humid"), "explain": explain("humid")},
                            {"id": "L34", "no": 34, "answer": ans("shady", "shaded"), "explain": explain("shady", "shaded")},
                            {"id": "L35", "no": 35, "answer": ans("dangerous"), "explain": explain("dangerous")},
                            {"id": "L36", "no": 36, "answer": ans("leaves"), "explain": explain("leaves")},
                            {"id": "L37", "no": 37, "answer": ans("ground"), "explain": explain("ground")},
                            {"id": "L38", "no": 38, "answer": ans("considerably reduce", "decrease", "filter"), "explain": explain("considerably reduce", "decrease", "filter")},
                            {"id": "L39", "no": 39, "answer": ans("low"), "explain": explain("low")},
                            {"id": "L40", "no": 40, "answer": ans("space", "room"), "explain": explain("space", "room")},
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
            "title": "Questions 1–8",
            "instruction": "Do the following statements agree with the information given in Reading Passage 1?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q1", "no": 1, "q": "The plight of the rainforests has largely been ignored by the media.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q2", "no": 2, "q": "Children only accept opinions on rainforests that they encounter in their classrooms.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q3", "no": 3, "q": "It has been suggested that children hold mistaken views about the 'pure' science that they study at school.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q4", "no": 4, "q": "The fact that children's ideas about science form part of a larger framework of ideas means that it is easier to change them.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q5", "no": 5, "q": "The study involved asking children a number of yes/no questions such as 'Are there any rainforests in Africa?'", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q6", "no": 6, "q": "Girls are more likely than boys to hold mistaken views about the rainforests' destruction.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q7", "no": 7, "q": "The study reported here follows on from a series of studies that have looked at children's understanding of rainforests.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q8", "no": 8, "q": "A second study has been planned to investigate primary school children's ideas about rainforests.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 9–13",
            "instruction": "Answer the following questions by choosing the correct responses A–P.",
            "boxTitle": "Responses",
            "box": {
                "A": "There is a complicated combination of reasons for the loss of the rainforests.",
                "B": "The rainforests are being destroyed by the same things that are destroying the forests of Western Europe.",
                "C": "Rainforests are located near the Equator.",
                "D": "Brazil is home to the rainforests.",
                "E": "Without rainforests some animals would have nowhere to live.",
                "F": "Rainforests are important habitats for a lot of plants.",
                "G": "People are responsible for the loss of the rainforests.",
                "H": "The rainforests are a source of oxygen.",
                "I": "Rainforests are of consequence for a number of different reasons.",
                "J": "As the rainforests are destroyed, the world gets warmer.",
                "K": "Without rainforests there would not be enough oxygen in the air.",
                "L": "There are people for whom the rainforests are home.",
                "M": "Rainforests are found in Africa.",
                "N": "Rainforests are not really important to human life.",
                "O": "The destruction of the rainforests is the direct result of logging activity.",
                "P": "Humans depend on the rainforests for their continuing existence.",
            },
            "questions": [
                {"id": "Q9", "no": 9, "q": "What was the children's most frequent response when asked where the rainforests were?", "answer": ans("M"), "explain": explain("M")},
                {"id": "Q10", "no": 10, "q": "What was the most common response to the question about the importance of the rainforests?", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q11", "no": 11, "q": "What did most children give as the reason for the loss of the rainforests?", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q12", "no": 12, "q": "Why did most children think it important for the rainforests to be protected?", "answer": ans("P"), "explain": explain("P")},
                {"id": "Q13", "no": 13, "q": "Which of the responses is cited as unexpectedly uncommon, given the amount of time spent on the issue by the newspapers and television?", "answer": ans("J"), "explain": explain("J")},
            ],
        },
        {
            "kind": "mcq",
            "title": "Question 14",
            "instruction": "Choose the correct letter, A, B, C, D or E.",
            "questions": [
                {
                    "id": "Q14",
                    "no": 14,
                    "q": "Which of the following is the most suitable title for Reading Passage 1?",
                    "options": {
                        "A": "The development of a programme in environmental studies within a science curriculum",
                        "B": "Children's ideas about the rainforests and the implications for course design",
                        "C": "The extent to which children have been misled by the media concerning the rainforests",
                        "D": "How to collect, collate and describe the ideas of secondary school children",
                        "E": "The importance of the rainforests and the reasons for their destruction",
                    },
                    "answer": ans("B"),
                    "explain": explain("B"),
                }
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "table",
            "title": "Questions 15–21",
            "instruction": "Complete the table below. Choose NO MORE THAN THREE WORDS from Reading Passage 2 for each answer.",
            "image": "cambridge-4-test-1-whale-senses.png",
            "cols": ["Sense", "Species", "Ability", "Comments"],
            "rows": [
                ["Taste", "some types", "poor", "nerves linked to <Q n=\"15\"> are underdeveloped"],
                ["Vision", "<Q n=\"16\">", "yes", "probably do not have stereoscopic vision"],
                ["Vision", "dolphins, porpoises", "yes", "stereoscopic vision <Q n=\"17\"> and <Q n=\"18\">"],
                ["Vision", "<Q n=\"19\">", "yes", "stereoscopic vision forward and upward"],
                ["Hearing", "most large baleen", "yes", "usually use <Q n=\"20\">; repertoire limited"],
                ["Hearing", "<Q n=\"21\"> whales and humpback whales", "yes", "song-like"],
            ],
            "questions": [
                {"id": "Q15", "no": 15, "answer": ans("taste buds"), "explain": explain("taste buds")},
                {"id": "Q16", "no": 16, "answer": ans("baleen", "the baleen whales", "baleen whales"), "explain": explain("baleen", "the baleen whales")},
                {"id": "Q17", "no": 17, "answer": ans("forward"), "explain": explain("forward")},
                {"id": "Q18", "no": 18, "answer": ans("downward"), "explain": explain("downward")},
                {"id": "Q19", "no": 19, "answer": ans("freshwater dolphin", "freshwater dolphins", "the freshwater dolphin", "the freshwater dolphins"), "explain": explain("freshwater dolphin(s)")},
                {"id": "Q20", "no": 20, "answer": ans("water"), "explain": explain("water")},
                {"id": "Q21", "no": 21, "answer": ans("bowhead"), "explain": explain("bowhead")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 22–26",
            "instruction": "Answer the questions below. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "22 Which of the senses is described here as being involved in mating? <Q n=\"22\">"},
                {"plain": True, "html": "23 Which species swims upside down while eating? <Q n=\"23\">"},
                {"plain": True, "html": "24 What can bottlenose dolphins follow from under the water? <Q n=\"24\">"},
                {"plain": True, "html": "25 Which type of habitat is related to good visual ability? <Q n=\"25\">"},
                {"plain": True, "html": "26 Which of the senses is best developed in cetaceans? <Q n=\"26\">"},
            ],
            "questions": [
                {"id": "Q22", "no": 22, "answer": ans("touch", "sense of touch"), "explain": explain("touch", "sense of touch")},
                {"id": "Q23", "no": 23, "answer": ans("freshwater dolphin", "freshwater dolphins"), "explain": explain("freshwater dolphin(s)")},
                {"id": "Q24", "no": 24, "answer": ans("airborne flying fish"), "explain": explain("airborne flying fish")},
                {"id": "Q25", "no": 25, "answer": ans("clear water", "clear waters", "clear open water", "clear open waters"), "explain": explain("clear water(s)", "clear open water(s)")},
                {"id": "Q26", "no": 26, "answer": ans("acoustic sense", "the acoustic sense"), "explain": explain("acoustic sense", "the acoustic sense")},
            ],
        },
    ]
    word_box = {
        "associations": "associations",
        "blind": "blind",
        "deep": "deep",
        "hard": "hard",
        "hundred": "hundred",
        "identical": "identical",
        "pairs": "pairs",
        "shapes": "shapes",
        "sighted": "sighted",
        "similar": "similar",
        "shallow": "shallow",
        "soft": "soft",
        "words": "words",
    }
    passages[2]["groups"] = [
        {
            "kind": "mcq",
            "title": "Questions 27–29",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {
                    "id": "Q27",
                    "no": 27,
                    "q": "In the first paragraph the writer makes the point that blind people",
                    "options": {
                        "A": "may be interested in studying art.",
                        "B": "can draw outlines of different objects and surfaces.",
                        "C": "can recognise conventions such as perspective.",
                        "D": "can draw accurately.",
                    },
                    "answer": ans("C"),
                    "explain": explain("C"),
                },
                {
                    "id": "Q28",
                    "no": 28,
                    "q": "The writer was surprised because the blind woman",
                    "options": {
                        "A": "drew a circle on her own initiative.",
                        "B": "did not understand what a wheel looked like.",
                        "C": "included a symbol representing movement.",
                        "D": "was the first person to use lines of motion.",
                    },
                    "answer": ans("C"),
                    "explain": explain("C"),
                },
                {
                    "id": "Q29",
                    "no": 29,
                    "q": "From the experiment described in Part 1, the writer found that the blind subjects",
                    "options": {
                        "A": "had good understanding of symbols representing movement.",
                        "B": "could control the movement of wheels very accurately.",
                        "C": "worked together well as a group in solving problems.",
                        "D": "got better results than the sighted undergraduates.",
                    },
                    "answer": ans("A"),
                    "explain": explain("A"),
                },
            ],
        },
        {
            "kind": "match",
            "title": "Questions 30–32",
            "instruction": "Match each diagram to the type of movement A–E generally assigned to it in the experiment.",
            "boxTitle": "Types of movement",
            "box": {
                "A": "steady spinning",
                "B": "jerky movement",
                "C": "rapid spinning",
                "D": "wobbling movement",
                "E": "use of brakes",
            },
            "questions": [
                {"id": "Q30", "no": 30, "q": "Diagram 30 — wavy spokes", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q31", "no": 31, "q": "Diagram 31 — dashed spokes", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q32", "no": 32, "q": "Diagram 32 — bent spokes", "answer": ans("A"), "explain": explain("A")},
            ],
        },
        {
            "kind": "wbank",
            "title": "Questions 33–39",
            "instruction": "Complete the summary below using words from the box. You may use any word more than once.",
            "boxCols": 3,
            "box": word_box,
            "lines": [
                {"html": "In the experiment described in Part 2, a set of word <Q n=\"33\"> was used to investigate whether blind and sighted people perceived the symbolism in abstract <Q n=\"34\"> in the same way. Subjects were asked which word fitted best with a circle and which with a square. From the <Q n=\"35\"> volunteers, everyone thought a circle fitted 'soft' while a square fitted 'hard'. However, only 51% of the <Q n=\"36\"> volunteers assigned a circle to <Q n=\"37\">. When the test was later repeated with <Q n=\"38\"> volunteers, it was found that they made <Q n=\"39\"> choices."},
            ],
            "questions": [
                {"id": "Q33", "no": 33, "answer": ans("pairs"), "explain": explain("pairs")},
                {"id": "Q34", "no": 34, "answer": ans("shapes"), "explain": explain("shapes")},
                {"id": "Q35", "no": 35, "answer": ans("sighted"), "explain": explain("sighted")},
                {"id": "Q36", "no": 36, "answer": ans("sighted"), "explain": explain("sighted")},
                {"id": "Q37", "no": 37, "answer": ans("deep"), "explain": explain("deep")},
                {"id": "Q38", "no": 38, "answer": ans("blind"), "explain": explain("blind")},
                {"id": "Q39", "no": 39, "answer": ans("similar"), "explain": explain("similar")},
            ],
        },
        {
            "kind": "mcq",
            "title": "Question 40",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {
                    "id": "Q40",
                    "no": 40,
                    "q": "Which of the following statements best summarises the writer's general conclusion?",
                    "options": {
                        "A": "The blind represent some aspects of reality differently from sighted people.",
                        "B": "The blind comprehend visual metaphors in similar ways to sighted people.",
                        "C": "The blind may create unusual and effective symbols to represent reality.",
                        "D": "The blind may be successful artists if given the right training.",
                    },
                    "answer": ans("B"),
                    "explain": explain("B"),
                }
            ],
        },
    ]
    return {"meta": {"volume": 4, "testNo": 1}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The table below shows the proportion of different categories of families living in poverty "
                "in Australia in 1999.<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [{"caption": "Family types living in poverty — Australia 1999", "image": "cambridge-4-test-1-poverty-table.png"}],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Compare the advantages and disadvantages of three of the following "
                "as media for communicating information. State which you consider to be the most effective.<br><br>"
                "comics · books · radio · television · film · theatre<br><br>"
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
        dst = LISTENING_DIR / f"ielts4_test1_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    for src, dst in (
        (SOCIAL_SRC, LISTENING_DIR / "cambridge-4-test-1-social-programme.png"),
        (TRIPS_SRC, LISTENING_DIR / "cambridge-4-test-1-weekend-trips.png"),
        (MAP_SRC, LISTENING_DIR / "cambridge-4-test-1-riverside-map.png"),
        (CHART_SRC, LISTENING_DIR / "cambridge-4-test-1-population-chart.png"),
        (WHALE_SRC, READING_DIR / "cambridge-4-test-1-whale-senses.png"),
        (CIRCLE_SRC, READING_DIR / "cambridge-4-test-1-circle-square.png"),
        (POVERTY_SRC, WRITING_DIR / "cambridge-4-test-1-poverty-table.png"),
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
