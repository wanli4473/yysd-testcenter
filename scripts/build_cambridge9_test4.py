#!/usr/bin/env python3
"""Generate Cambridge IELTS 9 Test 4 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑9T4.docx")
BOILER_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_14.23.29-fa96a46c-8f4e-42c8-9c38-ad3d72d6e6e7.png"
)
ENERGY_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_14.23.46-6b92bad3-c869-4193-a62e-50817c5e89e4.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test4 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test4 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test4 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test4 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-9-test-4.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-9-test-4-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-9-test-4-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-9-test-3.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-9-test-3-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-9-test-3-writing.html"

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
        ("Test 3", "Test 4"),
        ("test-3", "test-4"),
        ("test3", "test4"),
        ("Test 3 听力（官方原题 + 官方答案）", "Test 4 听力（官方原题 + 官方答案）"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    # Remove test3-only patches inherited from template
    html = html.replace(
        "function readAns(q){ if(q.id==='L12'){"
        "const a=(document.getElementById('L12a')||{}).value||'';"
        "const b=(document.getElementById('L12b')||{}).value||'';"
        "return [a,b].filter(Boolean).join(' ').trim(); }"
        "const el=document.getElementById(q.id);",
        "function readAns(q){ const el=document.getElementById(q.id);",
    )
    match_needle = "else if(g.kind==='match'){\n    const box="
    match_insert = (
        "else if(g.kind==='match'){\n"
        "    const fig=(g.image?`<div class=\"map-wrap\" style=\"margin-bottom:16px;\">"
        "<img class=\"map-img\" src=\"${g.image}\" alt=\"diagram\" style=\"max-width:100%;height:auto;\"></div>`:'');\n"
        "    const box="
    )
    if match_needle in html and "const fig=" not in html.split("else if(g.kind==='match')")[1][:200]:
        html = html.replace(match_needle, match_insert, 1)
    if "body=box+qs;" in html and "body=fig+box+qs;" not in html:
        html = html.replace(
            "    body=box+qs;\n  }\n  else if(g.kind==='multi')",
            "    body=fig+box+qs;\n  }\n  else if(g.kind==='multi')",
            1,
        )
    return html


def patch_reading_meta(html: str) -> str:
    reps = [
        ("Test 3", "Test 4"),
        ("test-3", "test-4"),
        ("Test 3 阅读（官方原题 + 官方答案）", "Test 4 阅读（官方原题 + 官方答案）"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    html = html.replace(
        "function readAns(q){ if(q.id==='Q36'){"
        "const a=(document.getElementById('Q36a')||{}).value||'';"
        "const b=(document.getElementById('Q36b')||{}).value||'';"
        "return [a,b].filter(Boolean).join(' ').trim(); }"
        "const el=document.getElementById(q.id);",
        "function readAns(q){ const el=document.getElementById(q.id);",
    )
    return html


def patch_writing_meta(html: str) -> str:
    reps = [
        ("Test 3", "Test 4"),
        ("test-3", "test-4"),
        (
            "Task 1 Yemen/Italy population pie charts + Task 2 sports facilities and public health essay",
            "Task 1 US energy consumption graph + Task 2 languages dying out essay",
        ),
        ("Test 3 写作（官方真题）", "Test 4 写作（官方真题）"),
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
                "paras": [labeled_para(x) for x in p2[3:]],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": p3[2],
                "byline": p3[1],
                "paras": [labeled_para(x) for x in p3[3:]],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 9, "testNo": 4},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "cam9_test4_audio1.mp3",
                "groups": [
                    {
                        "kind": "table",
                        "title": "Questions 1–4",
                        "instruction": "Complete the table below. Write ONE WORD ONLY for each answer.",
                        "tableTitle": "Health Centres",
                        "columns": ["Name of centre", "Doctor's name", "Advantage"],
                        "rows": [
                            [
                                "The Harvey Clinic",
                                "Example — Dr Green",
                                "especially good with <Q n=\"1\">",
                            ],
                            [
                                "The <Q n=\"2\"> Health Practice",
                                "Dr Fuller",
                                "offers <Q n=\"3\"> appointments",
                            ],
                            [
                                "The Shore Lane Health Centre",
                                "Dr <Q n=\"4\">",
                                "—",
                            ],
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("babies"), "explain": explain("babies")},
                            {"id": "L2", "no": 2, "answer": ans("Eshcol"), "explain": explain("Eshcol")},
                            {"id": "L3", "no": 3, "answer": ans("evening"), "explain": explain("evening")},
                            {"id": "L4", "no": 4, "answer": ans("Gormley"), "explain": explain("Gormley")},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 5 and 6",
                        "instruction": "Which TWO of the following are offered free of charge at Shore Lane Health Centre?",
                        "box": {
                            "A": "acupuncture",
                            "B": "employment medicals",
                            "C": "sports injury therapy",
                            "D": "travel advice",
                            "E": "vaccinations",
                        },
                        "answerSet": ["B", "E"],
                        "questions": [
                            {"id": "L5", "no": 5, "explain": "答案：B 与 E，顺序不限。"},
                            {"id": "L6", "no": 6, "explain": "答案：B 与 E，顺序不限。"},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 7–10",
                        "instruction": "Complete the table below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "tableTitle": "Talks for patients at Shore Lane Health Centre",
                        "columns": ["Subject of talk", "Date/Time", "Location", "Notes"],
                        "rows": [
                            [
                                "Giving up smoking",
                                "25th February at 7pm",
                                "room 4",
                                "useful for people with asthma or <Q n=\"7\"> problems",
                            ],
                            [
                                "Healthy eating",
                                "1st March at 5pm",
                                "the <Q n=\"8\"> (Shore Lane)",
                                "anyone welcome",
                            ],
                            [
                                "Avoiding injuries during exercise",
                                "9th March at <Q n=\"9\">",
                                "room 6",
                                "for all <Q n=\"10\">",
                            ],
                        ],
                        "questions": [
                            {"id": "L7", "no": 7, "answer": ans("heart"), "explain": explain("heart")},
                            {"id": "L8", "no": 8, "answer": ans("primary school"), "explain": explain("primary school")},
                            {"id": "L9", "no": 9, "answer": ans("4.30"), "explain": explain("4.30")},
                            {"id": "L10", "no": 10, "answer": ans("ages"), "explain": explain("ages")},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "cam9_test4_audio2.mp3",
                "groups": [
                    {
                        "kind": "match",
                        "title": "Questions 11–13",
                        "instruction": "Label the diagram below. Choose THREE answers from the box and write the correct letter, A–E, next to questions 11–13.",
                        "image": "cambridge-9-test-4-boiler.png",
                        "boxTitle": "Parts of the boiler",
                        "box": {
                            "A": "hot water tap",
                            "B": "warning indicator",
                            "C": "programmer",
                            "D": "cold water inlet",
                            "E": "boiler",
                        },
                        "subTitle": "Diagram labels",
                        "questions": [
                            {"id": "L11", "no": 11, "q": "11", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L12", "no": 12, "q": "12", "answer": ans("C"), "explain": explain("C")},
                            {"id": "L13", "no": 13, "q": "13", "answer": ans("E"), "explain": explain("E")},
                        ],
                    },
                    {
                        "kind": "match",
                        "title": "Questions 14–18",
                        "instruction": "Where can each of the following items be found? Choose FIVE answers from the box.",
                        "boxTitle": "Locations",
                        "box": {
                            "A": "in box on washing machine",
                            "B": "in cupboard on landing",
                            "C": "in chest of drawers",
                            "D": "next to window in living room",
                            "E": "on shelf by back door",
                            "F": "on top of television",
                            "G": "under kitchen sink",
                        },
                        "subTitle": "Items",
                        "questions": [
                            {"id": "L14", "no": 14, "q": "pillows", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L15", "no": 15, "q": "washing powder", "answer": ans("E"), "explain": explain("E")},
                            {"id": "L16", "no": 16, "q": "key", "answer": ans("D"), "explain": explain("D")},
                            {"id": "L17", "no": 17, "q": "light bulbs", "answer": ans("A"), "explain": explain("A")},
                            {"id": "L18", "no": 18, "q": "map", "answer": ans("C"), "explain": explain("C")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 19 and 20",
                        "instruction": "Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "lines": [
                            {"bullet": True, "html": "The best place to park in town — next to the station"},
                            {"bullet": True, "html": "Phone number for takeaway pizzas — <Q n=\"19\">"},
                            {"bullet": True, "html": "Railway museum closed on <Q n=\"20\">"},
                        ],
                        "questions": [
                            {"id": "L19", "no": 19, "answer": ans("732281"), "explain": explain("732281")},
                            {"id": "L20", "no": 20, "answer": ans("Thursday", "Thursdays"), "explain": explain("Thursday", "Thursdays")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "cam9_test4_audio3.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 21–22",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L21",
                                "no": 21,
                                "q": "In her home country, Kira had",
                                "options": {
                                    "A": "completed a course.",
                                    "B": "done two years of a course.",
                                    "C": "found her course difficult.",
                                },
                                "answer": ans("A"),
                                "explain": explain("A"),
                            },
                            {
                                "id": "L22",
                                "no": 22,
                                "q": "To succeed with assignments, Kira had to",
                                "options": {
                                    "A": "read faster.",
                                    "B": "write faster.",
                                    "C": "change her way of thinking.",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 23–25",
                        "instruction": "Complete the sentences below. Write ONE WORD ONLY for each answer.",
                        "lines": [
                            {"plain": True, "html": "Kira says that lecturers are easier to <Q n=\"23\"> than those in her home country."},
                            {"plain": True, "html": "Paul suggests that Kira may be more <Q n=\"24\"> than when she was studying before."},
                            {"plain": True, "html": "Kira says that students want to discuss things that worry them or that <Q n=\"25\"> them very much."},
                        ],
                        "questions": [
                            {"id": "L23", "no": 23, "answer": ans("approach"), "explain": explain("approach")},
                            {"id": "L24", "no": 24, "answer": ans("mature"), "explain": explain("mature")},
                            {"id": "L25", "no": 25, "answer": ans("interest"), "explain": explain("interest")},
                        ],
                    },
                    {
                        "kind": "mcq",
                        "title": "Questions 26–30",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L26",
                                "no": 26,
                                "q": "How did the students do their practical sessions?",
                                "options": {"A": "in pairs", "B": "in small groups", "C": "individually"},
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L27",
                                "no": 27,
                                "q": "In the second semester how often did Kira work in a hospital?",
                                "options": {"A": "every day", "B": "every 2 days", "C": "every week"},
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L28",
                                "no": 28,
                                "q": "How much full-time work did Kira do during the year?",
                                "options": {"A": "none", "B": "2 weeks", "C": "6 weeks"},
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L29",
                                "no": 29,
                                "q": "Having completed the year, how does Kira feel?",
                                "options": {"A": "stressed", "B": "confident", "C": "tired"},
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L30",
                                "no": 30,
                                "q": "In addition to the language, what do overseas students need to become familiar with?",
                                "options": {
                                    "A": "the teaching methods",
                                    "B": "the timetable",
                                    "C": "the education system",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "cam9_test4_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 31–36",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L31",
                                "no": 31,
                                "q": "What led the group to choose their topic?",
                                "options": {
                                    "A": "They were concerned about the decline of one species.",
                                    "B": "They were interested in the effects of city growth.",
                                    "C": "They wanted to investigate a recent phenomenon.",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                            {
                                "id": "L32",
                                "no": 32,
                                "q": "The exact proportion of land devoted to private gardens was confirmed by",
                                "options": {
                                    "A": "consulting some official documents.",
                                    "B": "taking large-scale photos.",
                                    "C": "discussions with town surveyors.",
                                },
                                "answer": ans("A"),
                                "explain": explain("A"),
                            },
                            {
                                "id": "L33",
                                "no": 33,
                                "q": "The group asked garden owners to",
                                "options": {
                                    "A": "take part in formal interviews.",
                                    "B": "keep a record of animals they saw.",
                                    "C": "get in contact when they saw a rare species.",
                                },
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L34",
                                "no": 34,
                                "q": "The group made their observations in gardens",
                                "options": {
                                    "A": "which had a large number of animal species.",
                                    "B": "which they considered to be representative.",
                                    "C": "which had stable populations of rare animals.",
                                },
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L35",
                                "no": 35,
                                "q": "The group did extensive reading on",
                                "options": {
                                    "A": "wildlife problems in rural areas.",
                                    "B": "urban animal populations.",
                                    "C": "current gardening practices.",
                                },
                                "answer": ans("B"),
                                "explain": explain("B"),
                            },
                            {
                                "id": "L36",
                                "no": 36,
                                "q": "The speaker focuses on three animal species because",
                                "options": {
                                    "A": "a lot of data has been obtained about them.",
                                    "B": "the group were most interested in them.",
                                    "C": "they best indicated general trends.",
                                },
                                "answer": ans("C"),
                                "explain": explain("C"),
                            },
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 37–40",
                        "instruction": "Complete the table below. Write ONE WORD ONLY for each answer.",
                        "columns": ["Animal", "Reason for population increase in gardens", "Comments"],
                        "rows": [
                            [
                                "<Q n=\"37\">",
                                "suitable stretches of water",
                                "massive increase in urban population",
                            ],
                            [
                                "Hedgehogs",
                                "safer from <Q n=\"38\"> when in cities",
                                "easy to <Q n=\"39\"> them accurately",
                            ],
                            [
                                "Song thrushes",
                                "a variety of <Q n=\"40\"> to eat; more nesting places available",
                                "large survey starting soon",
                            ],
                        ],
                        "questions": [
                            {"id": "L37", "no": 37, "answer": ans("frog", "frogs"), "explain": explain("frog", "frogs")},
                            {"id": "L38", "no": 38, "answer": ans("predators"), "explain": explain("predators")},
                            {"id": "L39", "no": 39, "answer": ans("count"), "explain": explain("count")},
                            {"id": "L40", "no": 40, "answer": ans("seed", "seeds"), "explain": explain("seed", "seeds")},
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
            "title": "Questions 1–6",
            "instruction": "Do the following statements agree with the information given in Reading Passage 1?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q1", "no": 1, "q": "Marie Curie's husband was a joint winner of both Marie's Nobel Prizes.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q2", "no": 2, "q": "Marie became interested in science when she was a child.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q3", "no": 3, "q": "Marie was able to attend the Sorbonne because of her sister's financial contribution.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q4", "no": 4, "q": "Marie stopped doing research for several years when her children were born.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q5", "no": 5, "q": "Marie took over the teaching position her husband had held.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q6", "no": 6, "q": "Marie's sister Bronia studied the medical uses of radioactivity.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 7–13",
            "instruction": "Complete the notes below. Choose ONE WORD from the passage for each answer.",
            "noteTitle": "Marie Curie's research on radioactivity",
            "lines": [
                {"plain": True, "html": "When uranium was discovered to be radioactive, Marie Curie found that the element called <Q n=\"7\"> had the same property."},
                {"plain": True, "html": "Marie and Pierre Curie's research into the radioactivity of the mineral known as <Q n=\"8\"> led to the discovery of two new elements."},
                {"plain": True, "html": "In 1911, Marie Curie received recognition for her work on the element <Q n=\"9\">"},
                {"plain": True, "html": "Marie and Irene Curie developed X-radiography which was used as a medical technique for <Q n=\"10\">"},
                {"plain": True, "html": "Marie Curie saw the importance of collecting radioactive material both for research and for cases of <Q n=\"11\">"},
                {"plain": True, "html": "The radioactive material stocked in Paris contributed to the discoveries in the 1930s of the <Q n=\"12\"> and of what was known as artificial radioactivity."},
                {"plain": True, "html": "During her research, Marie Curie was exposed to radiation and as a result she suffered from <Q n=\"13\">"},
            ],
            "questions": [
                {"id": "Q7", "no": 7, "answer": ans("thorium"), "explain": explain("thorium")},
                {"id": "Q8", "no": 8, "answer": ans("pitchblende"), "explain": explain("pitchblende")},
                {"id": "Q9", "no": 9, "answer": ans("radium"), "explain": explain("radium")},
                {"id": "Q10", "no": 10, "answer": ans("soldiers"), "explain": explain("soldiers")},
                {"id": "Q11", "no": 11, "answer": ans("illness"), "explain": explain("illness")},
                {"id": "Q12", "no": 12, "answer": ans("neutron"), "explain": explain("neutron")},
                {"id": "Q13", "no": 13, "answer": ans("leukaemia", "leukemia"), "explain": explain("leukaemia", "leukemia")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–19",
            "noBox": True,
            "instruction": "Reading Passage 2 has eight paragraphs, A–H. Which paragraph contains the following information?",
            "box": {k: "" for k in "ABCDEFGH"},
            "questions": [
                {"id": "Q14", "no": 14, "q": "an account of the method used by researchers in a particular study", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q15", "no": 15, "q": "the role of imitation in developing a sense of identity", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q16", "no": 16, "q": "the age at which children can usually identify a static image of themselves", "answer": ans("G"), "explain": explain("G")},
                {"id": "Q17", "no": 17, "q": "a reason for the limitations of scientific research into 'self-as-subject'", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q18", "no": 18, "q": "reference to a possible link between culture and a particular form of behaviour", "answer": ans("H"), "explain": explain("H")},
                {"id": "Q19", "no": 19, "q": "examples of the wide range of features that contribute to the sense of 'self-as-object'", "answer": ans("E"), "explain": explain("E")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 20–23",
            "instruction": "Look at the following findings and the list of researchers below. Match each finding with the correct researcher or researchers, A–E.",
            "boxTitle": "List of Researchers",
            "box": {
                "A": "James",
                "B": "Cooley",
                "C": "Lewis and Brooks-Gunn",
                "D": "Mead",
                "E": "Bronson",
            },
            "questions": [
                {"id": "Q20", "no": 20, "q": "A sense of identity can never be formed without relationships with other people.", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q21", "no": 21, "q": "A child's awareness of self is related to a sense of mastery over things and people.", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q22", "no": 22, "q": "At a certain age, children's sense of identity leads to aggressive behaviour.", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q23", "no": 23, "q": "Observing their own reflection contributes to children's self awareness.", "answer": ans("C"), "explain": explain("C")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 24–26",
            "instruction": "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.",
            "noteTitle": "How children acquire a sense of identity",
            "lines": [
                {
                    "plain": True,
                    "html": (
                        "First, children come to realise that they can have an effect on the world around them, for example by handling objects, "
                        "or causing the image to move when they face a <Q n=\"24\">. "
                        "This aspect of self-awareness is difficult to research directly, because of <Q n=\"25\"> problems. "
                        "Secondly, children start to become aware of how they are viewed by others. One important stage in this process is the visual recognition of themselves "
                        "which usually occurs when they reach the age of two. In Western societies at least, the development of self awareness is often linked to a sense of <Q n=\"26\">, "
                        "and can lead to disputes."
                    ),
                }
            ],
            "questions": [
                {"id": "Q24", "no": 24, "answer": ans("mirror"), "explain": explain("mirror")},
                {"id": "Q25", "no": 25, "answer": ans("communication"), "explain": explain("communication")},
                {"id": "Q26", "no": 26, "answer": ans("ownership"), "explain": explain("ownership")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 27–30",
            "instruction": "Reading Passage 3 has six paragraphs, A–F. Choose the correct heading for paragraphs B–E from the list below. Example: Paragraph A = v.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "Commercial pressures on people in charge",
                "ii": "Mixed views on current changes to museums",
                "iii": "Interpreting the facts to meet visitor expectations",
                "iv": "The international dimension",
                "v": "Collections of factual evidence",
                "vi": "Fewer differences between public attractions",
                "vii": "Current reviews and suggestions",
            },
            "questions": [
                {"id": "Q27", "no": 27, "q": "Paragraph B", "answer": ans("ii"), "explain": explain("ii")},
                {"id": "Q28", "no": 28, "q": "Paragraph C", "answer": ans("vi"), "explain": explain("vi")},
                {"id": "Q29", "no": 29, "q": "Paragraph D", "answer": ans("i"), "explain": explain("i")},
                {"id": "Q30", "no": 30, "q": "Paragraph E", "answer": ans("iii"), "explain": explain("iii")},
            ],
        },
        {
            "kind": "mcq",
            "title": "Questions 31–36",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q31", "no": 31, "q": "Compared with today's museums, those of the past", "options": {"A": "did not present history in a detailed way.", "B": "were not primarily intended for the public.", "C": "were more clearly organised.", "D": "preserved items with greater care."}, "answer": ans("B"), "explain": explain("B")},
                {"id": "Q32", "no": 32, "q": "According to the writer, current trends in the heritage industry", "options": {"A": "emphasise personal involvement.", "B": "have their origins in York and London.", "C": "rely on computer images.", "D": "reflect minority tastes."}, "answer": ans("A"), "explain": explain("A")},
                {"id": "Q33", "no": 33, "q": "The writer says that museums, heritage sites and theme parks", "options": {"A": "often work in close partnership.", "B": "try to preserve separate identities.", "C": "have similar exhibits.", "D": "are less easy to distinguish than before."}, "answer": ans("D"), "explain": explain("D")},
                {"id": "Q34", "no": 34, "q": "The writer says that in preparing exhibits for museums, experts", "options": {"A": "should pursue a single objective.", "B": "have to do a certain amount of language translation.", "C": "should be free from commercial constraints.", "D": "have to balance conflicting priorities."}, "answer": ans("D"), "explain": explain("D")},
                {"id": "Q35", "no": 35, "q": "In paragraph E, the writer suggests that some museum exhibits", "options": {"A": "fail to match visitor expectations.", "B": "are based on the false assumptions of professionals.", "C": "reveal more about present beliefs than about the past.", "D": "allow visitors to make more use of their imagination."}, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q36", "no": 36, "q": "The passage ends by noting that our view of history is biased because", "options": {"A": "we fail to use our imagination.", "B": "only very durable objects remain from the past.", "C": "we tend to ignore things that displease us.", "D": "museum exhibits focus too much on the local area."}, "answer": ans("B"), "explain": explain("B")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 37–40",
            "instruction": "Do the following statements agree with the information given in Reading Passage 3?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q37", "no": 37, "q": "Consumers prefer theme parks which avoid serious issues.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q38", "no": 38, "q": "More people visit museums than theme parks.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q39", "no": 39, "q": "The boundaries of Leyden have changed little since the seventeenth century.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q40", "no": 40, "q": "Museums can give a false impression of how life used to be.", "answer": ans("TRUE"), "explain": explain("TRUE")},
            ],
        },
    ]
    return {"meta": {"volume": 9, "testNo": 4}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The graph below gives information from a 2008 report about consumption of energy in the USA "
                "since 1980 with projections until 2030.<br><br>"
                "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "U.S. Energy Consumption by Fuel (1980–2030)",
                    "image": "cambridge-9-test-4-energy.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Every year several languages die out. Some people think that this is not important "
                "because life will be easier if there are fewer languages in the world.<br><br>"
                "To what extent do you agree or disagree with this opinion?<br><br>"
                "Give reasons for your answer and include any relevant examples from your own knowledge or experience.<br>"
                "<strong>Write at least 250 words.</strong>"
            )
        },
    }


def copy_assets() -> None:
    for i, src in enumerate(AUDIO_SRC, start=1):
        if not src.exists():
            raise FileNotFoundError(src)
        dst = LISTENING_DIR / f"cam9_test4_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    if not BOILER_SRC.exists():
        raise FileNotFoundError(BOILER_SRC)
    boiler_dst = LISTENING_DIR / "cambridge-9-test-4-boiler.png"
    shutil.copy2(BOILER_SRC, boiler_dst)
    print(f"copied image -> {boiler_dst.relative_to(ROOT)}")
    if not ENERGY_SRC.exists():
        raise FileNotFoundError(ENERGY_SRC)
    energy_dst = WRITING_DIR / "cambridge-9-test-4-energy.png"
    shutil.copy2(ENERGY_SRC, energy_dst)
    print(f"copied image -> {energy_dst.relative_to(ROOT)}")


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
