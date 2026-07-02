#!/usr/bin/env python3
"""Generate Cambridge IELTS 7 Test 4 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑7T4.docx")
OLYMPIC_MAP_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_17.54.29-fbc5d8c9-bc35-4202-981f-5b06d99b758b.png"
)
ELECTRICITY_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_17.54.38-0b45b026-93f4-4f17-a292-e584fbad44e0.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS7 Test4 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS7 Test4 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS7 Test4 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS7 Test4 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-7-test-4.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-7-test-4-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-7-test-4-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-7-test-3.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-7-test-3-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-7-test-3-writing.html"

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
        ("剑桥雅思7 Test 3 听力", "剑桥雅思7 Test 4 听力"),
        ("剑桥雅思7 · Test 3（听力）", "剑桥雅思7 · Test 4（听力）"),
        ("剑桥雅思7 Test 3 听力：", "剑桥雅思7 Test 4 听力："),
        ("Test 3 听力（官方原题 + 官方答案）", "Test 4 听力（官方原题 + 官方答案）"),
        ("test-3", "test-4"),
        ("ielts7_test3", "ielts7_test4"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    return patch_note_image(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思7 Test 3 阅读", "剑桥雅思7 Test 4 阅读"),
        ("剑桥雅思7 · Test 3（阅读）", "剑桥雅思7 · Test 4（阅读）"),
        ("剑桥雅思7 Test 3 学术类阅读", "剑桥雅思7 Test 4 学术类阅读"),
        ("Test 3 阅读（官方原题 + 官方答案）", "Test 4 阅读（官方原题 + 官方答案）"),
        ("Test 3", "Test 4"),
        ("test-3", "test-4"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思7 Test 3 写作", "剑桥雅思7 Test 4 写作"),
        ("剑桥雅思7 · Test 3（写作）", "剑桥雅思7 · Test 4（写作）"),
        ("剑桥雅思7 Test 3 学术类写作", "剑桥雅思7 Test 4 学术类写作"),
        (
            "Task 1 house prices chart + Task 2 job satisfaction essay",
            "Task 1 electricity production pie charts + Task 2 university function essay",
        ),
        ("Test 3 写作（官方真题）", "Test 4 写作（官方真题）"),
        ("cambridge-7-test-3-writing-draft", "cambridge-7-test-4-writing-draft"),
        ("【剑桥雅思7 · Test 3 写作】", "【剑桥雅思7 · Test 4 写作】"),
        ("Test 3", "Test 4"),
        ("test-3", "test-4"),
        ("house-prices", "electricity-production"),
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
    paras = extract_docx_paras(DOCX)
    return [
        {
            "id": 1,
            "passage": {
                "title": paras[120],
                "byline": paras[121],
                "paras": paras[122:130],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": paras[145],
                "paras": paras[146:155],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": paras[185],
                "paras": paras[186:192],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 7, "testNo": 4},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "ielts7_test4_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–6",
                        "instruction": "Complete the form below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "HOMESTAY APPLICATION",
                        "lines": [
                            {"plain": True, "html": "Example: Surname: Yuichini"},
                            {"plain": True, "html": "First name: <Q n=\"1\">"},
                            {"plain": True, "html": "Sex: female"},
                            {"plain": True, "html": "Passport number: <Q n=\"2\">"},
                            {"plain": True, "html": "Present address: Room 21C, Willow College"},
                            {"plain": True, "html": "Length of homestay: approx <Q n=\"3\">"},
                            {"plain": True, "html": "Course enrolled in: <Q n=\"4\">"},
                            {"plain": True, "html": "Family preferences: no <Q n=\"5\">; no objection to <Q n=\"6\">"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("Keiko"), "explain": explain("Keiko")},
                            {"id": "L2", "no": 2, "answer": ans("JO6337"), "explain": explain("JO6337")},
                            {"id": "L3", "no": 3, "answer": ans("4 months"), "explain": explain("4 months")},
                            {"id": "L4", "no": 4, "answer": ans("Advanced English Studies", "Advanced English", "English Studies"), "explain": explain("Advanced English Studies", "Advanced English")},
                            {"id": "L5", "no": 5, "answer": ans("children", "young children"), "explain": explain("children", "young children")},
                            {"id": "L6", "no": 6, "answer": ans("pets"), "explain": explain("pets")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 7–10",
                        "instruction": "Complete the sentences below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "lines": [
                            {"plain": True, "html": "7 What does the student particularly like to eat? <Q n=\"7\">"},
                            {"plain": True, "html": "8 What sport does the student play? <Q n=\"8\">"},
                            {"plain": True, "html": "9 What mode of transport does the student prefer? <Q n=\"9\">"},
                            {"plain": True, "html": "10 When will the student find out her homestay address? <Q n=\"10\">"},
                        ],
                        "questions": [
                            {"id": "L7", "no": 7, "answer": ans("seafood"), "explain": explain("seafood")},
                            {"id": "L8", "no": 8, "answer": ans("tennis"), "explain": explain("tennis")},
                            {"id": "L9", "no": 9, "answer": ans("trains", "train", "the train"), "explain": explain("trains", "train", "the train")},
                            {"id": "L10", "no": 10, "answer": ans("this afternoon", "that afternoon"), "explain": explain("this afternoon", "that afternoon")},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "ielts7_test4_audio2.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 11–14",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L11", "no": 11, "q": "What kind of tour is Sally leading?", "options": {"A": "a bus tour", "B": "a train tour", "C": "a walking tour"}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L12", "no": 12, "q": "The original buildings on the site were", "options": {"A": "houses.", "B": "industrial buildings.", "C": "shops."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L13", "no": 13, "q": "The local residents wanted to use the site for", "options": {"A": "leisure.", "B": "apartment blocks.", "C": "a sports centre."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L14", "no": 14, "q": "The Tower is at the centre of the", "options": {"A": "nature reserve.", "B": "formal gardens.", "C": "Bicentennial Park."}, "answer": ans("B"), "explain": explain("B")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 15–17",
                        "instruction": "Label the plan below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Olympic Site",
                        "image": "cambridge-7-test-4-olympic-site-map.png",
                        "lines": [
                            {"plain": True, "html": "15 <Q n=\"15\">"},
                            {"plain": True, "html": "16 <Q n=\"16\">"},
                            {"plain": True, "html": "17 <Q n=\"17\">"},
                        ],
                        "questions": [
                            {"id": "L15", "no": 15, "answer": ans("car park", "carpark"), "explain": explain("car park", "carpark")},
                            {"id": "L16", "no": 16, "answer": ans("rose garden"), "explain": explain("rose garden")},
                            {"id": "L17", "no": 17, "answer": ans("café", "cafe"), "explain": explain("café", "cafe")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 18–20",
                        "instruction": "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.",
                        "tableTitle": "Nature Reserve",
                        "cols": ["Area", "Facility", "Activity"],
                        "rows": [
                            ["The Mangroves", "boardwalk", "<Q n=\"18\">"],
                            ["Frog Pond", "outdoor classroom", "<Q n=\"19\">"],
                            ["The Waterbird Refuge", "<Q n=\"20\">", "bird watching"],
                        ],
                        "questions": [
                            {"id": "L18", "no": 18, "answer": ans("cycling"), "explain": explain("cycling")},
                            {"id": "L19", "no": 19, "answer": ans("biology lesson"), "explain": explain("biology lesson")},
                            {"id": "L20", "no": 20, "answer": ans("viewing shelter"), "explain": explain("viewing shelter")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "ielts7_test4_audio3.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 21 and 22",
                        "instruction": "Complete the sentences below. Write NO MORE THAN ONE WORD AND/OR A NUMBER for each answer.",
                        "lines": [
                            {"plain": True, "html": "The presentation will last 15 minutes."},
                            {"plain": True, "html": "There will be <Q n=\"21\"> minutes for questions."},
                            {"plain": True, "html": "The presentation will not be <Q n=\"22\">"},
                        ],
                        "questions": [
                            {"id": "L21", "no": 21, "answer": ans("5"), "explain": explain("5")},
                            {"id": "L22", "no": 22, "answer": ans("assessed"), "explain": explain("assessed")},
                        ],
                    },
                    {
                        "kind": "match",
                        "title": "Questions 23–26",
                        "instruction": "What do the students decide about each topic for the geography presentation? Write the correct letter, A, B or C.",
                        "boxTitle": "Options",
                        "box": {
                            "A": "They will definitely include this topic.",
                            "B": "They might include this topic.",
                            "C": "They will not include this topic.",
                        },
                        "subTitle": "Topics",
                        "questions": [
                            {"id": "L23", "no": 23, "q": "Geographical Location", "answer": ans("A"), "explain": explain("A")},
                            {"id": "L24", "no": 24, "q": "Economy", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L25", "no": 25, "q": "Overview of Education System", "answer": ans("A"), "explain": explain("A")},
                            {"id": "L26", "no": 26, "q": "Role of English Language", "answer": ans("C"), "explain": explain("C")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 27–30",
                        "instruction": "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.",
                        "cols": ["Information/visual aid", "Where from"],
                        "rows": [
                            ["Overhead projector", "the <Q n=\"27\">"],
                            ["Map of West Africa", "the <Q n=\"28\">"],
                            ["Map of the islands", "a tourist brochure"],
                            ["Literacy figures", "the <Q n=\"29\">"],
                            ["<Q n=\"30\"> on school places", "-"],
                        ],
                        "questions": [
                            {"id": "L27", "no": 27, "answer": ans("media room"), "explain": explain("media room")},
                            {"id": "L28", "no": 28, "answer": ans("resources room"), "explain": explain("resources room")},
                            {"id": "L29", "no": 29, "answer": ans("embassy"), "explain": explain("embassy")},
                            {"id": "L30", "no": 30, "answer": ans("statistics", "stats"), "explain": explain("statistics", "stats")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "ielts7_test4_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Question 31",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L31", "no": 31, "q": "The speaker says the main topic of the lecture is", "options": {"A": "the history of monosodium glutamate.", "B": "the way monosodium glutamate works.", "C": "where monosodium glutamate is used."}, "answer": ans("B"), "explain": explain("B")},
                        ],
                    },
                    {
                        "kind": "mcq",
                        "title": "Questions 32 and 33",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L32", "no": 32, "q": "In 1908, scientists in Japan", "options": {"A": "made monosodium glutamate.", "B": "began using kombu.", "C": "identified glutamate."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L33", "no": 33, "q": "What change occurred in the manufacture of glutamate in 1956?", "options": {"A": "It began to be manufactured on a large scale.", "B": "The Japanese began extracting it from natural sources.", "C": "It became much more expensive to produce."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 34–40",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Monosodium Glutamate (MSG)",
                        "lines": [
                            {"plain": True, "html": "MSG contains: glutamate (78.2%); sodium (12.2%); <Q n=\"34\"> (9.6%)"},
                            {"plain": True, "html": "Glutamate is found in foods that contain protein such as <Q n=\"35\"> and <Q n=\"36\">"},
                            {"plain": True, "html": "MSG is used in foods in many different parts of the world."},
                            {"plain": True, "html": "In 1908 Kikunae Ikeda discovered a <Q n=\"37\">"},
                            {"plain": True, "html": "Our ability to detect glutamate makes sense because it is so <Q n=\"38\"> naturally."},
                            {"h": "John Prescott suggests that:"},
                            {"bullet": True, "html": "sweetness tells us that a food contains carbohydrates."},
                            {"bullet": True, "html": "<Q n=\"39\"> tells us that a food contains toxins."},
                            {"bullet": True, "html": "sourness tells us that a food is spoiled."},
                            {"bullet": True, "html": "saltiness tells us that a food contains <Q n=\"40\">"},
                        ],
                        "questions": [
                            {"id": "L34", "no": 34, "answer": ans("water"), "explain": explain("water")},
                            {"id": "L35", "no": 35, "answer": ans("meat", "cheese"), "explain": "答案：meat 与 cheese，顺序不限。"},
                            {"id": "L36", "no": 36, "answer": ans("cheese", "meat"), "explain": "答案：meat 与 cheese，顺序不限。"},
                            {"id": "L37", "no": 37, "answer": ans("new taste", "5th taste", "fifth taste"), "explain": explain("new taste", "5th taste", "fifth taste")},
                            {"id": "L38", "no": 38, "answer": ans("common"), "explain": explain("common")},
                            {"id": "L39", "no": 39, "answer": ans("bitterness"), "explain": explain("bitterness")},
                            {"id": "L40", "no": 40, "answer": ans("minerals"), "explain": explain("minerals")},
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
            "title": "Questions 1–7",
            "instruction": "Do the following statements agree with the information given in Reading Passage 1?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q1", "no": 1, "q": "It is generally believed that large numbers of people were needed to build the pyramids.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q2", "no": 2, "q": "Clemmons found a strange hieroglyph on the wall of an Egyptian monument.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q3", "no": 3, "q": "Gharib had previously done experiments on bird flight.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q4", "no": 4, "q": "Gharib and Graff tested their theory before applying it.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q5", "no": 5, "q": "The success of the actual experiment was due to the high speed of the wind.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q6", "no": 6, "q": "They found that, as the kite flew higher, the wind force got stronger.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q7", "no": 7, "q": "The team decided that it was possible to use kites to raise very heavy stones.", "answer": ans("TRUE"), "explain": explain("TRUE")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 8–13",
            "instruction": "Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "noteTitle": "Additional evidence for theory of kite-lifting",
            "lines": [
                {
                    "plain": True,
                    "html": "The Egyptians had <Q n=\"8\"> which could lift large pieces of <Q n=\"9\"> and they knew how to use the energy of the wind from their skill as <Q n=\"10\">. The discovery on one pyramid of an object which resembled a <Q n=\"11\"> suggests they may have experimented with <Q n=\"12\">. In addition, over two thousand years ago kites were used in China as weapons, as well as for sending <Q n=\"13\">.",
                }
            ],
            "questions": [
                {"id": "Q8", "no": 8, "answer": ans("wooden pulleys", "pulleys"), "explain": explain("wooden pulleys", "pulleys")},
                {"id": "Q9", "no": 9, "answer": ans("stone"), "explain": explain("stone")},
                {"id": "Q10", "no": 10, "answer": ans("accomplished sailors", "sailors"), "explain": explain("accomplished sailors", "sailors")},
                {"id": "Q11", "no": 11, "answer": ans("modern glider", "glider"), "explain": explain("modern glider", "glider")},
                {"id": "Q12", "no": 12, "answer": ans("flight"), "explain": explain("flight")},
                {"id": "Q13", "no": 13, "answer": ans("messages"), "explain": explain("messages")},
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
                {"id": "Q14", "no": 14, "q": "The inhabitants of the Aleutian islands renamed their islands 'Aleyska'.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q15", "no": 15, "q": "Alaska's fisheries are owned by some of the world's largest companies.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q16", "no": 16, "q": "Life in Alaska is dependent on salmon.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q17", "no": 17, "q": "Ninety per cent of all Pacific salmon caught are sockeye or pink salmon.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q18", "no": 18, "q": "More than 320,000 tonnes of salmon were caught in Alaska in 2000.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q19", "no": 19, "q": "Between 1940 and 1959, there was a sharp decrease in Alaska's salmon population.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q20", "no": 20, "q": "During the 1990s, the average number of salmon caught each year was 100 million.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 21–26",
            "instruction": "Look at the following statements and the list of endings A–K. Match each statement with the correct ending.",
            "boxTitle": "Endings",
            "box": {
                "A": "to recognise fisheries that care for the environment.",
                "B": "to be successful.",
                "C": "to stop fish from spawning.",
                "D": "to set up environmental protection laws.",
                "E": "to stop people fishing for sport.",
                "F": "to label their products using the MSC logo.",
                "G": "to ensure that fish numbers are sufficient to permit fishing.",
                "H": "to assist the subsistence communities in the region.",
                "I": "to freeze a huge number of salmon eggs.",
                "J": "to deny certification to the Alaska fisheries.",
                "K": "to close down all fisheries.",
            },
            "questions": [
                {"id": "Q21", "no": 21, "q": "In Alaska, biologists keep a check on adult fish", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q22", "no": 22, "q": "Biologists have the authority", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q23", "no": 23, "q": "In-Season Abundance-Based Management has allowed the Alaska salmon fisheries", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q24", "no": 24, "q": "The Marine Stewardship Council (MSC) was established", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q25", "no": 25, "q": "As a result of the collapse of the salmon runs in 1999, the state decided", "answer": ans("K"), "explain": explain("K")},
                {"id": "Q26", "no": 26, "q": "In September 2000, the MSC allowed seven Alaska salmon companies", "answer": ans("F"), "explain": explain("F")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "mcq",
            "title": "Questions 27–29",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q27", "no": 27, "q": "The writer suggests that people may have difficulty sleeping in the mountains because", "options": {"A": "humans do not prefer peace and quiet to noise.", "B": "they may be exposed to short bursts of very strange sounds.", "C": "humans prefer to hear a certain amount of noise while they sleep.", "D": "they may have adapted to a higher noise level in the city."}, "answer": ans("D"), "explain": explain("D")},
                {"id": "Q28", "no": 28, "q": "In noise experiments, Glass and Singer found that", "options": {"A": "problem-solving is much easier under quiet conditions.", "B": "physiological arousal prevents the ability to work.", "C": "bursts of noise do not seriously disrupt problem-solving in the long term.", "D": "the physiological arousal of control subjects declined quickly."}, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q29", "no": 29, "q": "Researchers discovered that high noise levels are not likely to interfere with the", "options": {"A": "successful performance of a single task.", "B": "tasks of pilots or air traffic controllers.", "C": "ability to repeat numbers while tracking moving lines.", "D": "ability to monitor three dials at once."}, "answer": ans("A"), "explain": explain("A")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 30–34",
            "instruction": "Complete the summary using the list of words and phrases, A–J. NB You may use any letter more than once.",
            "boxTitle": "List of words and phrases",
            "box": {
                "A": "no control over",
                "B": "unexpected",
                "C": "intense",
                "D": "the same amount of",
                "E": "performed better than",
                "F": "performed at about the same level as",
                "G": "no",
                "H": "showed more irritation than",
                "I": "made more mistakes than",
                "J": "different types of",
            },
            "subTitle": "Summary",
            "questions": [
                {"id": "Q30", "no": 30, "q": "situations in which there is intense noise have less effect on performance than circumstances in which ___ noise occurs", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q31", "no": 31, "q": "All groups were exposed to ___ noise", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q32", "no": 32, "q": "The predictable noise group ___ the unpredictable noise group on this task", "answer": ans("F"), "explain": explain("F")},
                {"id": "Q33", "no": 33, "q": "The group which had been exposed to unpredictable noise ___ the group which had been exposed to predictable noise", "answer": ans("I"), "explain": explain("I")},
                {"id": "Q34", "no": 34, "q": "The results suggest that ___ noise produces fatigue but that this manifests itself later", "answer": ans("B"), "explain": explain("B")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 35–40",
            "instruction": "Match each statement with the correct researcher(s), A–E. NB You may use any letter more than once.",
            "boxTitle": "List of Researchers",
            "box": {
                "A": "Glass and Singer",
                "B": "Broadbent",
                "C": "Finkelman and Glass",
                "D": "Cohen et al.",
                "E": "None of the above",
            },
            "questions": [
                {"id": "Q35", "no": 35, "q": "Subjects exposed to noise find it difficult at first to concentrate on problem-solving tasks.", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q36", "no": 36, "q": "Long-term exposure to noise can produce changes in behaviour which can still be observed a year later.", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q37", "no": 37, "q": "The problems associated with exposure to noise do not arise if the subject knows they can make it stop.", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q38", "no": 38, "q": "Exposure to high-pitched noise results in more errors than exposure to low-pitched noise.", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q39", "no": 39, "q": "Subjects find it difficult to perform three tasks at the same time when exposed to noise.", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q40", "no": 40, "q": "Noise affects a subject's capacity to repeat numbers while carrying out another task.", "answer": ans("C"), "explain": explain("C")},
            ],
        },
    ]
    return {"meta": {"volume": 7, "testNo": 4}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The pie charts below show units of electricity production by fuel source "
                "in Australia and France in 1980 and 2000.<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Units of electricity by fuel source — Australia & France (1980 & 2000)",
                    "image": "cambridge-7-test-4-electricity-production.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Some people think that universities should provide graduates "
                "with the knowledge and skills needed in the workplace. Others think that the true "
                "function of a university should be to give access to knowledge for its own sake, "
                "regardless of whether the course is useful to an employer.<br><br>"
                "What, in your opinion, should be the main function of a university?<br><br>"
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
        dst = LISTENING_DIR / f"ielts7_test4_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    map_dst = LISTENING_DIR / "cambridge-7-test-4-olympic-site-map.png"
    shutil.copy2(OLYMPIC_MAP_SRC, map_dst)
    print(f"copied image -> {map_dst.relative_to(ROOT)}")
    chart_dst = WRITING_DIR / "cambridge-7-test-4-electricity-production.png"
    shutil.copy2(ELECTRICITY_SRC, chart_dst)
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
