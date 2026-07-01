#!/usr/bin/env python3
"""Generate Cambridge IELTS 8 Test 2 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑8T2.docx")
PARK_MAP_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_15.38.32-c3b5ac66-f0c8-4ee9-8f2a-cb918fe8a441.png"
)
SCHOOL_SPENDING_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_15.38.40-efe3e7b6-2b5d-4583-8ca7-ea4ad6b9d09b.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test2 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test2 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test2 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test2 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-8-test-2.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-8-test-2-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-8-test-2-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-8-test-1.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-8-test-1-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-8-test-1-writing.html"

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
    needle = "  if(g.kind==='note'){\n    body=`"
    insert = (
        "  if(g.kind==='note'){\n"
        "    const fig=(g.image?`<div class=\"map-wrap\" style=\"margin-bottom:16px;\">"
        "<img class=\"map-img\" src=\"${g.image}\" alt=\"${g.noteTitle||'map'}\" "
        "style=\"max-width:100%;height:auto;\"></div>`:'');\n"
        "    body=fig+`"
    )
    if needle in html and "const fig=" not in html.split("if(g.kind==='note')")[1][:250]:
        html = html.replace(needle, insert, 1)
    return html


def patch_listening_meta(html: str) -> str:
    reps = [
        ("剑桥雅思8 Test 1 听力", "剑桥雅思8 Test 2 听力"),
        ("剑桥雅思8 · Test 1（听力）", "剑桥雅思8 · Test 2（听力）"),
        ("剑桥雅思8 Test 1 听力：", "剑桥雅思8 Test 2 听力："),
        ("Test 1 听力（官方原题 + 官方答案）", "Test 2 听力（官方原题 + 官方答案）"),
        ("test-1", "test-2"),
        ("cam8_test1", "cam8_test2"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    return patch_note_image(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思8 Test 1 阅读", "剑桥雅思8 Test 2 阅读"),
        ("剑桥雅思8 · Test 1（阅读）", "剑桥雅思8 · Test 2（阅读）"),
        ("剑桥雅思8 Test 1 学术类阅读", "剑桥雅思8 Test 2 学术类阅读"),
        ("Test 1 阅读（官方原题 + 官方答案）", "Test 2 阅读（官方原题 + 官方答案）"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思8 Test 1 写作", "剑桥雅思8 Test 2 写作"),
        ("剑桥雅思8 · Test 1（写作）", "剑桥雅思8 · Test 2（写作）"),
        ("剑桥雅思8 Test 1 学术类写作", "剑桥雅思8 Test 2 学术类写作"),
        (
            "Task 1 land degradation pie chart + Task 2 parents vs school citizenship essay",
            "Task 1 UK school spending pie charts + Task 2 technology and relationships essay",
        ),
        ("Test 1 写作（官方真题）", "Test 2 写作（官方真题）"),
        ("cambridge-8-test-1-writing-draft", "cambridge-8-test-2-writing-draft"),
        ("【剑桥雅思8 · Test 1 写作】", "【剑桥雅思8 · Test 2 写作】"),
        ("Test 1", "Test 2"),
        ("test-1", "test-2"),
        ("land-degradation", "school-spending"),
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
                "title": "The Little Ice Age",
                "byline": p2[1],
                "paras": [labeled_para(x) for x in p2[2:]],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": "The sense of smell",
                "byline": p3[1],
                "paras": [p3[2], *[labeled_para(x) for x in p3[3:]]],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 8, "testNo": 2},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "cam8_test2_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–3",
                        "instruction": "Complete the form below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "TOTAL INSURANCE INCIDENT REPORT",
                        "lines": [
                            {"plain": True, "html": "Example: Name: Michael Alexander"},
                            {"plain": True, "html": "Address: 24 Manly Street, <Q n=\"1\"> Sydney"},
                            {"plain": True, "html": "Shipping agent: <Q n=\"2\">"},
                            {"plain": True, "html": "Place of origin: China"},
                            {"plain": True, "html": "Date of arrival: <Q n=\"3\">"},
                            {"plain": True, "html": "Reference number: 601 ACK"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("Milperra"), "explain": explain("Milperra")},
                            {"id": "L2", "no": 2, "answer": ans("First Class Movers"), "explain": explain("First Class Movers")},
                            {"id": "L3", "no": 3, "answer": ans("28 November"), "explain": explain("28 November")},
                        ],
                    },
                    {
                        "kind": "table",
                        "title": "Questions 4–10",
                        "instruction": "Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "columns": ["Item", "Damage", "Cost to repair/replace"],
                        "rows": [
                            ["Television", "The <Q n=\"4\"> needs to be replaced", "not known"],
                            [
                                "The <Q n=\"5\"> cabinet",
                                "The <Q n=\"6\"> of the cabinet is damaged",
                                "£<Q n=\"7\">",
                            ],
                            ["Dining room table", "A <Q n=\"8\"> is split", "£200"],
                            ["Set of china", "Six <Q n=\"9\"> were broken", "about £<Q n=\"10\"> in total"],
                        ],
                        "questions": [
                            {"id": "L4", "no": 4, "answer": ans("screen"), "explain": explain("screen")},
                            {"id": "L5", "no": 5, "answer": ans("bathroom"), "explain": explain("bathroom")},
                            {"id": "L6", "no": 6, "answer": ans("door"), "explain": explain("door")},
                            {"id": "L7", "no": 7, "answer": ans("140"), "explain": explain("140")},
                            {"id": "L8", "no": 8, "answer": ans("leg"), "explain": explain("leg")},
                            {"id": "L9", "no": 9, "answer": ans("plates"), "explain": explain("plates")},
                            {"id": "L10", "no": 10, "answer": ans("60"), "explain": explain("60")},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "cam8_test2_audio2.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Question 11",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L11",
                                "no": 11,
                                "q": "According to the speaker, the main purposes of the park are",
                                "options": {
                                    "A": "education and entertainment.",
                                    "B": "research and education.",
                                    "C": "research and entertainment.",
                                },
                                "answer": ans("B"),
                                "explain": explain("B"),
                            }
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 12–14",
                        "instruction": "Label the plan below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Agricultural Park",
                        "image": "cambridge-8-test-2-park-map.png",
                        "lines": [
                            {"plain": True, "html": "12 <Q n=\"12\"> Area"},
                            {"plain": True, "html": "13 The <Q n=\"13\"> (in the Lake)"},
                            {"plain": True, "html": "14 <Q n=\"14\"> Area"},
                        ],
                        "questions": [
                            {"id": "L12", "no": 12, "answer": ans("Forest", "the Forest"), "explain": explain("Forest", "the Forest")},
                            {"id": "L13", "no": 13, "answer": ans("Fish Farm", "Fish Farms"), "explain": explain("Fish Farm", "Fish Farms")},
                            {"id": "L14", "no": 14, "answer": ans("Market Garden"), "explain": explain("Market Garden")},
                        ],
                    },
                    {
                        "kind": "mcq",
                        "title": "Questions 15–20",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L15", "no": 15, "q": "When are the experimental areas closed to the public?", "options": {"A": "all the year round", "B": "almost all the year", "C": "a short time every year"}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L16", "no": 16, "q": "How can you move around the park?", "options": {"A": "by tram, walking or bicycle", "B": "by solar car or bicycle", "C": "by bicycle, walking or bus"}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L17", "no": 17, "q": "The rare breed animals kept in the park include", "options": {"A": "hens and horses.", "B": "goats and cows.", "C": "goats and hens."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L18", "no": 18, "q": "What is the main purpose of having the Rare Breeds Section?", "options": {"A": "to save unusual animals", "B": "to keep a variety of breeds", "C": "to educate the public"}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L19", "no": 19, "q": "What can you see in the park at the present time?", "options": {"A": "the arrival of wild birds", "B": "fruit tree blossom", "C": "a demonstration of fishing"}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L20", "no": 20, "q": "The shop contains books about", "options": {"A": "animals.", "B": "local traditions.", "C": "the history of the park."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "cam8_test2_audio3.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 21–24",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L21", "no": 21, "q": "Where in Australia have Asian honey bees been found in the past?", "options": {"A": "Queensland", "B": "New South Wales", "C": "several states"}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L22", "no": 22, "q": "A problem with Asian honey bees is that they", "options": {"A": "attack native bees.", "B": "carry parasites.", "C": "damage crops."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L23", "no": 23, "q": "What point is made about Australian bees?", "options": {"A": "Their honey varies in quality.", "B": "Their size stops them from pollinating some flowers.", "C": "They are sold to customers abroad."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L24", "no": 24, "q": "Grant Freeman says that if Asian honey bees got into Australia,", "options": {"A": "the country's economy would be affected.", "B": "they could be used in the study of allergies.", "C": "certain areas of agriculture would benefit."}, "answer": ans("A"), "explain": explain("A")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 25–30",
                        "instruction": "Complete the summary below. Write ONE WORD ONLY for each answer.",
                        "noteTitle": "Looking for Asian honey bees",
                        "lines": [
                            {"plain": True, "html": "Birds called Rainbow Bee Eaters eat only <Q n=\"25\"> and cough up small bits of skeleton and other products in a pellet."},
                            {"plain": True, "html": "Researchers go to the locations the bee eaters like to use for <Q n=\"26\">. They collect the pellets and take them to a <Q n=\"27\"> for analysis. Here <Q n=\"28\"> is used to soften them, and the researchers look for the <Q n=\"29\"> of Asian bees in the pellets."},
                            {"plain": True, "html": "The benefit of this research is that the result is more <Q n=\"30\"> than searching for live Asian bees."},
                        ],
                        "questions": [
                            {"id": "L25", "no": 25, "answer": ans("insects"), "explain": explain("insects")},
                            {"id": "L26", "no": 26, "answer": ans("feeding", "eating"), "explain": explain("feeding", "eating")},
                            {"id": "L27", "no": 27, "answer": ans("laboratory"), "explain": explain("laboratory")},
                            {"id": "L28", "no": 28, "answer": ans("water"), "explain": explain("water")},
                            {"id": "L29", "no": 29, "answer": ans("wings"), "explain": explain("wings")},
                            {"id": "L30", "no": 30, "answer": ans("reliable", "accurate"), "explain": explain("reliable", "accurate")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "cam8_test2_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 31–36",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L31", "no": 31, "q": "In order to set up her research programme, Shona got", "options": {"A": "advice from personal friends in other countries.", "B": "help from students in other countries.", "C": "information from her tutor's contacts in other countries."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L32", "no": 32, "q": "What types of people were included in the research?", "options": {"A": "young people in their first job", "B": "men who were working", "C": "women who were unemployed"}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L33", "no": 33, "q": "Shona says that in her questionnaire her aim was", "options": {"A": "to get a wide range of data.", "B": "to limit people's responses.", "C": "to guide people through interviews."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L34", "no": 34, "q": "What do Shona's initial results show about medical services in Britain?", "options": {"A": "Current concerns are misrepresented by the press.", "B": "Financial issues are critical to the government.", "C": "Reforms within hospitals have been unsuccessful."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L35", "no": 35, "q": "Shona needs to do further research in order to", "options": {"A": "present the government with her findings.", "B": "decide the level of extra funding needed.", "C": "identify the preferences of the public."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L36", "no": 36, "q": "Shona has learnt from the research project that", "options": {"A": "it is important to plan projects carefully.", "B": "people do not like answering questions.", "C": "colleagues do not always agree."}, "answer": ans("C"), "explain": explain("C")},
                        ],
                    },
                    {
                        "kind": "match",
                        "title": "Questions 37–40",
                        "instruction": "Which statement applies to each of the following people who were interviewed by Shona? Choose FOUR answers from the box.",
                        "boxTitle": "Statements",
                        "box": {
                            "A": "gave false data",
                            "B": "decided to stop participating",
                            "C": "refused to tell Shona about their job",
                            "D": "kept changing their mind about participating",
                            "E": "became very angry with Shona",
                            "F": "was worried about confidentiality",
                        },
                        "subTitle": "People interviewed by Shona",
                        "questions": [
                            {"id": "L37", "no": 37, "q": "a person interviewed in the street", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L38", "no": 38, "q": "an undergraduate at the university", "answer": ans("F"), "explain": explain("F")},
                            {"id": "L39", "no": 39, "q": "a colleague in her department", "answer": ans("D"), "explain": explain("D")},
                            {"id": "L40", "no": 40, "q": "a tutor in a foreign university", "answer": ans("C"), "explain": explain("C")},
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
            "kind": "note",
            "title": "Questions 1–8",
            "instruction": "Complete the table and diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "noteTitle": "Early methods of producing flat glass",
            "lines": [
                {"plain": True, "html": "Method: <Q n=\"1\">"},
                {"plain": True, "html": "Advantages: Glass remained <Q n=\"2\">"},
                {"plain": True, "html": "Disadvantages: Slow; <Q n=\"3\">"},
                {"h": "Method: Ribbon"},
                {"plain": True, "html": "Advantages: Could produce glass sheets of varying <Q n=\"4\">; non-stop process"},
                {"plain": True, "html": "Disadvantages: Glass was <Q n=\"5\">; 20% of glass rubbed away; machines were expensive"},
                {"h": "Pilkington's float process (diagram labels)"},
                {"plain": True, "html": "<Q n=\"6\">"},
                {"plain": True, "html": "<Q n=\"7\">"},
                {"plain": True, "html": "<Q n=\"8\">"},
            ],
            "questions": [
                {"id": "Q1", "no": 1, "answer": ans("spinning"), "explain": explain("spinning")},
                {"id": "Q2", "no": 2, "answer": ans("perfectly unblemished", "unblemished"), "explain": explain("perfectly unblemished", "unblemished")},
                {"id": "Q3", "no": 3, "answer": ans("labour-intensive", "labor-intensive", "labour intensive", "labor intensive"), "explain": explain("labour-intensive", "labor-intensive")},
                {"id": "Q4", "no": 4, "answer": ans("thickness"), "explain": explain("thickness")},
                {"id": "Q5", "no": 5, "answer": ans("marked"), "explain": explain("marked")},
                {"id": "Q6", "no": 6, "answer": ans("molten glass", "glass"), "explain": explain("molten glass", "glass")},
                {"id": "Q7", "no": 7, "answer": ans("molten tin", "molten metal", "tin", "metal"), "explain": explain("molten tin", "molten metal")},
                {"id": "Q8", "no": 8, "answer": ans("rollers"), "explain": explain("rollers")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 9–13",
            "instruction": "Do the following statements agree with the information given in Reading Passage 1?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q9", "no": 9, "q": "The metal used in the float process had to have specific properties.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q10", "no": 10, "q": "Pilkington invested some of his own money in his float plant.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q11", "no": 11, "q": "Pilkington's first full-scale plant was an instant commercial success.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q12", "no": 12, "q": "The process invented by Pilkington has now been improved.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q13", "no": 13, "q": "Computers are better than humans at detecting faults in glass.", "answer": ans("TRUE"), "explain": explain("TRUE")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–17",
            "instruction": "Reading Passage 2 has six paragraphs, A–F. Choose the correct heading for paragraphs B and D–F from the list below. Example: Paragraph A = viii. Example: Paragraph C = v.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "Predicting climatic changes",
                "ii": "The relevance of the Little Ice Age today",
                "iii": "How cities contribute to climate change",
                "iv": "Human impact on the climate",
                "v": "How past climatic conditions can be determined",
                "vi": "A growing need for weather records",
                "vii": "A study covering a thousand years",
                "viii": "People have always responded to climate change",
                "ix": "Enough food at last",
            },
            "questions": [
                {"id": "Q14", "no": 14, "q": "Paragraph B", "answer": ans("ii"), "explain": explain("ii")},
                {"id": "Q15", "no": 15, "q": "Paragraph D", "answer": ans("vii"), "explain": explain("vii")},
                {"id": "Q16", "no": 16, "q": "Paragraph E", "answer": ans("ix"), "explain": explain("ix")},
                {"id": "Q17", "no": 17, "q": "Paragraph F", "answer": ans("iv"), "explain": explain("iv")},
            ],
        },
        {
            "kind": "wbank",
            "title": "Questions 18–22",
            "instruction": "Complete the summary using the list of words, A–I, below.",
            "noteTitle": "Weather during the Little Ice Age",
            "box": {
                "A": "climatic shifts",
                "B": "ice cores",
                "C": "tree rings",
                "D": "glaciers",
                "E": "interactions",
                "F": "weather observations",
                "G": "heat waves",
                "H": "storms",
                "I": "written accounts",
            },
            "boxCols": 2,
            "lines": [
                {
                    "html": (
                        "Documentation of past weather conditions is limited: our main sources of knowledge of conditions "
                        "in the distant past are <Q n=\"18\"> and <Q n=\"19\">. We can deduce that the Little Ice Age was a time of "
                        "<Q n=\"20\">, rather than of consistent freezing. Within it there were some periods of very cold winters, "
                        "others of <Q n=\"21\"> and heavy rain, and yet others that saw <Q n=\"22\"> with no rain at all."
                    )
                }
            ],
            "questions": [
                {"id": "Q18", "no": 18, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q19", "no": 19, "answer": ans("B"), "explain": explain("B")},
                {"id": "Q20", "no": 20, "answer": ans("A"), "explain": explain("A")},
                {"id": "Q21", "no": 21, "answer": ans("H"), "explain": explain("H")},
                {"id": "Q22", "no": 22, "answer": ans("G"), "explain": explain("G")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 23–26",
            "instruction": "Classify the following events as occurring during the period stated below.",
            "boxTitle": "Periods",
            "box": {
                "A": "Medieval Warm Period",
                "B": "Little Ice Age",
                "C": "Modern Warm Period",
            },
            "questions": [
                {"id": "Q23", "no": 23, "q": "Many Europeans started farming abroad.", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q24", "no": 24, "q": "The cutting down of trees began to affect the climate.", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q25", "no": 25, "q": "Europeans discovered other lands.", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q26", "no": 26, "q": "Changes took place in fishing patterns.", "answer": ans("B"), "explain": explain("B")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 27–32",
            "instruction": "Reading Passage 3 has six paragraphs, A–F. Choose the correct heading for each paragraph from the list of headings below.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "The difficulties of talking about smells",
                "ii": "The role of smell in personal relationships",
                "iii": "Future studies into smell",
                "iv": "The relationship between the brain and the nose",
                "v": "The interpretation of smells as a factor in defining groups",
                "vi": "Why our sense of smell is not appreciated",
                "vii": "Smell is our superior sense",
                "viii": "The relationship between smell and feelings",
            },
            "questions": [
                {"id": "Q27", "no": 27, "q": "Paragraph A", "answer": ans("viii"), "explain": explain("viii")},
                {"id": "Q28", "no": 28, "q": "Paragraph B", "answer": ans("ii"), "explain": explain("ii")},
                {"id": "Q29", "no": 29, "q": "Paragraph C", "answer": ans("vi"), "explain": explain("vi")},
                {"id": "Q30", "no": 30, "q": "Paragraph D", "answer": ans("i"), "explain": explain("i")},
                {"id": "Q31", "no": 31, "q": "Paragraph E", "answer": ans("iii"), "explain": explain("iii")},
                {"id": "Q32", "no": 32, "q": "Paragraph F", "answer": ans("v"), "explain": explain("v")},
            ],
        },
        {
            "kind": "mcq",
            "title": "Questions 33–36",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q33", "no": 33, "q": "According to the introduction, we become aware of the importance of smell when", "options": {"A": "we discover a new smell.", "B": "we experience a powerful smell.", "C": "our ability to smell is damaged.", "D": "we are surrounded by odours."}, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q34", "no": 34, "q": "The experiment described in paragraph B", "options": {"A": "shows how we make use of smell without realising it.", "B": "demonstrates that family members have a similar smell.", "C": "proves that a sense of smell is learnt.", "D": "compares the sense of smell in males and females."}, "answer": ans("A"), "explain": explain("A")},
                {"id": "Q35", "no": 35, "q": "What is the writer doing in paragraph C?", "options": {"A": "supporting other research", "B": "making a proposal", "C": "rejecting a common belief", "D": "describing limitations"}, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q36", "no": 36, "q": "What does the writer suggest about the study of smell in the atmosphere in paragraph E?", "options": {"A": "The measurement of smell is becoming more accurate.", "B": "Researchers believe smell is a purely physical reaction.", "C": "Most smells are inoffensive.", "D": "Smell is yet to be defined."}, "answer": ans("D"), "explain": explain("D")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 37–40",
            "instruction": "Complete the sentences below. Choose ONE WORD ONLY from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "Tests have shown that odours can help people recognise the <Q n=\"37\"> belonging to their husbands and wives."},
                {"plain": True, "html": "Certain linguistic groups may have difficulty describing smell because they lack the appropriate <Q n=\"38\">"},
                {"plain": True, "html": "The sense of smell may involve response to <Q n=\"39\"> which do not smell, in addition to obvious odours."},
                {"plain": True, "html": "Odours regarded as unpleasant in certain <Q n=\"40\"> are not regarded as unpleasant in others."},
            ],
            "questions": [
                {"id": "Q37", "no": 37, "answer": ans("clothing"), "explain": explain("clothing")},
                {"id": "Q38", "no": 38, "answer": ans("vocabulary"), "explain": explain("vocabulary")},
                {"id": "Q39", "no": 39, "answer": ans("chemicals"), "explain": explain("chemicals")},
                {"id": "Q40", "no": 40, "answer": ans("cultures"), "explain": explain("cultures")},
            ],
        },
    ]
    return {"meta": {"volume": 8, "testNo": 2}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The three pie charts below show the changes in annual spending by a particular UK school "
                "in 1981, 1991 and 2001.<br><br>"
                "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Total school spending in 1981, 1991 and 2001",
                    "image": "cambridge-8-test-2-school-spending.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Nowadays the way many people interact with each other has changed because of technology.<br><br>"
                "In what ways has technology affected the types of relationships people make?<br>"
                "Has this become a positive or negative development?<br><br>"
                "Give reasons for your answer and include any relevant examples from your own knowledge or experience.<br>"
                "<strong>Write at least 250 words.</strong>"
            )
        },
    }


def copy_assets() -> None:
    for i, src in enumerate(AUDIO_SRC, start=1):
        if not src.exists():
            raise FileNotFoundError(src)
        dst = LISTENING_DIR / f"cam8_test2_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    park_dst = LISTENING_DIR / "cambridge-8-test-2-park-map.png"
    shutil.copy2(PARK_MAP_SRC, park_dst)
    print(f"copied image -> {park_dst.relative_to(ROOT)}")
    spending_dst = WRITING_DIR / "cambridge-8-test-2-school-spending.png"
    shutil.copy2(SCHOOL_SPENDING_SRC, spending_dst)
    print(f"copied image -> {spending_dst.relative_to(ROOT)}")


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
