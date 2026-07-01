#!/usr/bin/env python3
"""Generate Cambridge IELTS 9 Test 1 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑9T1.docx")
ISLAND_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_13.37.48-8d201a8d-0101-46f4-bd09-ecf94995d939.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test1 Section1 (1).mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test1 Section2 (1).mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test1 Section3 (1).mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS9 Test1 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-9-test-1.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-9-test-1-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-9-test-1-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-10-test-1.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-14-test-2-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-10-test-1-writing.html"


def ans(*values: str) -> list[str]:
    return list(values)


def explain(*values: str) -> str:
    return "答案：" + " / ".join(values) + "。"


def replace_test(html: str, test: dict) -> str:
    block = "const TEST = " + json.dumps(test, ensure_ascii=False, indent=2) + ";"
    return TEST_RE.sub(block, html, count=1)


def patch_listening_meta(html: str) -> str:
    reps = [
        ("剑桥雅思10 Test 1 听力", "剑桥雅思9 Test 1 听力"),
        ("剑桥雅思10 · Test 1（听力）", "剑桥雅思9 · Test 1（听力）"),
        ("剑桥雅思10 Test 1 听力：", "剑桥雅思9 Test 1 听力："),
        ('<div class="num">10</div>', '<div class="num">9</div>'),
        ("剑桥雅思 10 · Test 1", "剑桥雅思 9 · Test 1"),
        ("剑桥雅思10 · Test 1", "剑桥雅思9 · Test 1"),
        ("剑桥雅思10 Test 1 听力（官方原题 + 官方答案）", "剑桥雅思9 Test 1 听力（官方原题 + 官方答案）"),
        ("ielts10_test1", "cam9_test1"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return html


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思14 Test 2 阅读", "剑桥雅思9 Test 1 阅读"),
        ("剑桥雅思14 · Test 2（阅读）", "剑桥雅思9 · Test 1（阅读）"),
        ("剑桥雅思14 Test 2 学术类阅读", "剑桥雅思9 Test 1 学术类阅读"),
        ('<div class="num">14</div>', '<div class="num">9</div>'),
        ("剑桥雅思 14 · Test 2", "剑桥雅思 9 · Test 1"),
        ("剑桥雅思14 · Test 2", "剑桥雅思9 · Test 1"),
        ("剑桥雅思14 Test 2 阅读（官方原题 + 官方答案）", "剑桥雅思9 Test 1 阅读（官方原题 + 官方答案）"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return html


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思10 Test 1 写作", "剑桥雅思9 Test 1 写作"),
        ("剑桥雅思10 · Test 1（写作）", "剑桥雅思9 · Test 1（写作）"),
        ("剑桥雅思10 Test 1 学术类写作", "剑桥雅思9 Test 1 学术类写作"),
        ("Task 1 Australian household energy pie charts + Task 2 punishment for children essay", "Task 1 island before/after maps + Task 2 foreign language at primary school essay"),
        ('<div class="num">10</div>', '<div class="num">9</div>'),
        ("剑桥雅思 10 · Test 1", "剑桥雅思 9 · Test 1"),
        ("剑桥雅思10 · Test 1", "剑桥雅思9 · Test 1"),
        ("剑桥雅思10 Test 1 写作（官方真题）", "剑桥雅思9 Test 1 写作（官方真题）"),
        ("cambridge-10-test-1-writing-draft", "cambridge-9-test-1-writing-draft"),
        ("【剑桥雅思10 · Test 1 写作】", "【剑桥雅思9 · Test 1 写作】"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return html


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


def reading_passages_from_docx() -> list[dict]:
    paras = extract_docx_paras(DOCX)
    starts = [i for i, p in enumerate(paras) if p.startswith("READING PASSAGE")]
    chunks: list[list[str]] = []
    for si, start in enumerate(starts):
        end = starts[si + 1] if si + 1 < len(starts) else len(paras)
        chunk = paras[start:end]
        qidx = next(
            (i for i, p in enumerate(chunk) if p.startswith("Questions ") or p.startswith("Question 40")),
            len(chunk),
        )
        chunks.append(chunk[:qidx])

    p1 = chunks[0]
    p2 = chunks[1]
    p3 = chunks[2]

    return [
        {
            "id": 1,
            "passage": {
                "title": "William Henry Perkin",
                "byline": p1[1],
                "paras": [p1[3], *p1[4:]],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": p2[2],
                "byline": p2[1],
                "paras": [
                    p2[3],
                    f'<span class="para-label">A</span>{p2[4][1:].strip()}',
                    f'<span class="para-label">B</span>{p2[5][1:].strip()}',
                    f'<span class="para-label">C</span>{p2[6][1:].strip()}',
                    f'<span class="para-label">D</span>{p2[7][1:].strip()}',
                    f'<span class="para-label">E</span>{p2[8][1:].strip()}',
                ],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": "The history of the tortoise",
                "byline": p3[1],
                "paras": p3[3:],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 9, "testNo": 1},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "cam9_test1_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–10",
                        "instruction": "Complete the notes below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "JOB ENQUIRY",
                        "lines": [
                            {"bullet": True, "html": "Example: Work at: a restaurant."},
                            {"bullet": True, "html": "Type of work: <Q n=\"1\">"},
                            {"bullet": True, "html": "Number of hours per week: 12 hours"},
                            {"bullet": True, "html": "Would need work permit"},
                            {"bullet": True, "html": "Work in the: <Q n=\"2\"> branch"},
                            {"bullet": True, "html": "Nearest bus stop: next to <Q n=\"3\">"},
                            {"bullet": True, "html": "Pay: £<Q n=\"4\"> an hour"},
                            {"plain": True, "html": "<strong>Extra benefits:</strong>"},
                            {"bullet": True, "html": "a free dinner"},
                            {"bullet": True, "html": "extra pay when you work on <Q n=\"5\">"},
                            {"bullet": True, "html": "transport home when you work <Q n=\"6\">"},
                            {"plain": True, "html": "<strong>Qualities required:</strong>"},
                            {"bullet": True, "html": "<Q n=\"7\">"},
                            {"bullet": True, "html": "ability to <Q n=\"8\">"},
                            {"bullet": True, "html": "Interview arranged for: Thursday <Q n=\"9\"> at 6 p.m."},
                            {"bullet": True, "html": "Bring the names of two referees"},
                            {"bullet": True, "html": "Ask for: Samira <Q n=\"10\">"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("answering phone", "answer phone", "answering the phone"), "explain": explain("answering phone", "answer phone", "answering the phone")},
                            {"id": "L2", "no": 2, "answer": ans("Hillsdunne Road"), "explain": explain("Hillsdunne Road")},
                            {"id": "L3", "no": 3, "answer": ans("library"), "explain": explain("library")},
                            {"id": "L4", "no": 4, "answer": ans("4.45"), "explain": explain("4.45")},
                            {"id": "L5", "no": 5, "answer": ans("national holidays"), "explain": explain("national holidays")},
                            {"id": "L6", "no": 6, "answer": ans("after 11", "after 11 o'clock"), "explain": explain("after 11", "after 11 o'clock")},
                            {"id": "L7", "no": 7, "answer": ans("clear voice"), "explain": explain("clear voice")},
                            {"id": "L8", "no": 8, "answer": ans("think quickly"), "explain": explain("think quickly")},
                            {"id": "L9", "no": 9, "answer": ans("22 October"), "explain": explain("22 October")},
                            {"id": "L10", "no": 10, "answer": ans("Manuja"), "explain": explain("Manuja")},
                        ],
                    }
                ],
            },
            {
                "id": 2,
                "audio": "cam9_test1_audio2.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 11–16",
                        "instruction": "Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "noteTitle": "SPORTS WORLD",
                        "lines": [
                            {"bullet": True, "html": "a new <Q n=\"11\"> of an international sports goods company"},
                            {"bullet": True, "html": "located in the shopping centre to the <Q n=\"12\"> of Bradcaster"},
                            {"bullet": True, "html": "has sports <Q n=\"13\"> and equipment on floors 1–3"},
                            {"bullet": True, "html": "can get you any item within <Q n=\"14\"> days"},
                            {"bullet": True, "html": "shop specialises in equipment for <Q n=\"15\">"},
                            {"bullet": True, "html": "has a special section which just sells <Q n=\"16\">"},
                        ],
                        "questions": [
                            {"id": "L11", "no": 11, "answer": ans("branch"), "explain": explain("branch")},
                            {"id": "L12", "no": 12, "answer": ans("west"), "explain": explain("west")},
                            {"id": "L13", "no": 13, "answer": ans("clothing"), "explain": explain("clothing")},
                            {"id": "L14", "no": 14, "answer": ans("10"), "explain": explain("10")},
                            {"id": "L15", "no": 15, "answer": ans("running"), "explain": explain("running")},
                            {"id": "L16", "no": 16, "answer": ans("bags"), "explain": explain("bags")},
                        ],
                    },
                    {
                        "kind": "mcq",
                        "title": "Questions 17–18",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {
                                "id": "L17",
                                "no": 17,
                                "q": "A champion athlete will be in the shop",
                                "options": {
                                    "A": "on Saturday morning only.",
                                    "B": "all day Saturday.",
                                    "C": "for the whole weekend.",
                                },
                                "answer": ans("A"),
                                "explain": explain("A"),
                            },
                            {
                                "id": "L18",
                                "no": 18,
                                "q": "The first person to answer 20 quiz questions correctly will win",
                                "options": {
                                    "A": "gym membership.",
                                    "B": "a video.",
                                    "C": "a calendar.",
                                },
                                "answer": ans("A"),
                                "explain": explain("A"),
                            },
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 19 and 20",
                        "instruction": "Choose TWO letters, A–E. Which TWO pieces of information does the speaker give about the fitness test?",
                        "box": {
                            "A": "You need to reserve a place.",
                            "B": "It is free to account holders.",
                            "C": "You get advice on how to improve your health.",
                            "D": "It takes place in a special clinic.",
                            "E": "It is cheaper this month.",
                        },
                        "answerSet": ["A", "E"],
                        "questions": [
                            {"id": "L19", "no": 19, "explain": "答案：A 与 E，顺序不限。"},
                            {"id": "L20", "no": 20, "explain": "答案：A 与 E，顺序不限。"},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "cam9_test1_audio3.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 21–30",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L21", "no": 21, "q": "One reason why Spiros felt happy about his marketing presentation was that", "options": {"A": "he was not nervous.", "B": "his style was good.", "C": "the presentation was the best in his group."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L22", "no": 22, "q": "What surprised Hiroko about the other students' presentations?", "options": {"A": "Their presentations were not interesting.", "B": "They found their presentations stressful.", "C": "They didn't look at the audience enough."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L23", "no": 23, "q": "After she gave her presentation, Hiroko felt", "options": {"A": "delighted.", "B": "dissatisfied.", "C": "embarrassed."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L24", "no": 24, "q": "How does Spiros feel about his performance in tutorials?", "options": {"A": "not very happy", "B": "really pleased", "C": "fairly confident"}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L25", "no": 25, "q": "Why can the other students participate so easily in discussions?", "options": {"A": "They are polite to each other.", "B": "They agree to take turns in speaking.", "C": "They know each other well."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L26", "no": 26, "q": "Why is Hiroko feeling more positive about tutorials now?", "options": {"A": "She finds the other students' opinions more interesting.", "B": "She is making more of a contribution.", "C": "The tutor includes her in the discussion."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L27", "no": 27, "q": "To help her understand lectures, Hiroko", "options": {"A": "consulted reference materials.", "B": "had extra tutorials with her lecturers.", "C": "borrowed lecture notes from other students."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L28", "no": 28, "q": "What does Spiros think of his reading skills?", "options": {"A": "He reads faster than he used to.", "B": "It still takes him a long time to read.", "C": "He tends to struggle with new vocabulary."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L29", "no": 29, "q": "What is Hiroko's subject area?", "options": {"A": "environmental studies", "B": "health education", "C": "engineering"}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L30", "no": 30, "q": "Hiroko thinks that in the reading classes the students should", "options": {"A": "learn more vocabulary.", "B": "read more in their own subject areas.", "C": "develop better reading strategies."}, "answer": ans("B"), "explain": explain("B")},
                        ],
                    }
                ],
            },
            {
                "id": 4,
                "audio": "cam9_test1_audio4.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 31–40",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Mass Strandings of Whales and Dolphins",
                        "lines": [
                            {"plain": True, "html": "Mass strandings: situations where groups of whales, dolphins, etc. swim onto the beach and die"},
                            {"bullet": True, "html": "Common in areas where the <Q n=\"31\"> can change quickly"},
                            {"plain": True, "html": "<strong>Several other theories:</strong>"},
                            {"plain": True, "html": "<strong>Parasites</strong>"},
                            {"bullet": True, "html": "e.g. some parasites can affect marine animals' <Q n=\"32\">, which they depend on for navigation"},
                            {"plain": True, "html": "<strong>Toxins</strong>"},
                            {"bullet": True, "html": "Poisons from <Q n=\"33\"> are commonly consumed by whales"},
                            {"bullet": True, "html": "e.g. Cape Cod (1988) – whales were killed by saxitoxin"},
                            {"plain": True, "html": "<strong>Accidental Strandings</strong>"},
                            {"bullet": True, "html": "Animals may follow prey ashore, e.g. Thurston (1995)"},
                            {"bullet": True, "html": "Unlikely because the majority of animals were not <Q n=\"34\"> when they stranded"},
                            {"plain": True, "html": "<strong>Human Activity</strong>"},
                            {"bullet": True, "html": "<Q n=\"35\"> from military tests are linked to some recent strandings"},
                            {"bullet": True, "html": "The Bahamas (2000) stranding was unusual because the whales were all <Q n=\"36\"> and were not in a <Q n=\"37\">"},
                            {"plain": True, "html": "<strong>Group Behaviour</strong>"},
                            {"bullet": True, "html": "More strandings in the most <Q n=\"38\"> species of whales"},
                            {"bullet": True, "html": "1994 dolphin stranding – only the <Q n=\"39\"> was ill"},
                            {"plain": True, "html": "<strong>Further Reading</strong>"},
                            {"bullet": True, "html": "Marine Mammals Ashore (Connor) – gives information about stranding <Q n=\"40\">"},
                        ],
                        "questions": [
                            {"id": "L31", "no": 31, "answer": ans("tides"), "explain": explain("tides")},
                            {"id": "L32", "no": 32, "answer": ans("hearing", "ears"), "explain": explain("hearing", "ears")},
                            {"id": "L33", "no": 33, "answer": ans("plants animals", "plants and animals", "plants fish", "plants and fish", "animals plants", "animals and plants", "fish plants"), "explain": explain("plants and animals", "plants and fish")},
                            {"id": "L34", "no": 34, "answer": ans("feeding"), "explain": explain("feeding")},
                            {"id": "L35", "no": 35, "answer": ans("noise", "noises"), "explain": explain("noise", "noises")},
                            {"id": "L36", "no": 36, "answer": ans("healthy"), "explain": explain("healthy")},
                            {"id": "L37", "no": 37, "answer": ans("group"), "explain": explain("group")},
                            {"id": "L38", "no": 38, "answer": ans("social"), "explain": explain("social")},
                            {"id": "L39", "no": 39, "answer": ans("leader"), "explain": explain("leader")},
                            {"id": "L40", "no": 40, "answer": ans("network", "networks"), "explain": explain("network", "networks")},
                        ],
                    }
                ],
            },
        ],
    }


def reading_test() -> dict:
    passages = reading_passages_from_docx()
    passages[0]["groups"] = [
        {
            "kind": "tfng",
            "title": "Questions 1–7",
            "instruction": "Do the following statements agree with the information given in Reading Passage 1?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q1", "no": 1, "q": "Michael Faraday was the first person to recognise Perkin's ability as a student of chemistry.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q2", "no": 2, "q": "Michael Faraday suggested Perkin should enrol in the Royal College of Chemistry.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q3", "no": 3, "q": "Perkin employed August Wilhelm Hofmann as his assistant.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q4", "no": 4, "q": "Perkin was still young when he made the discovery that made him rich and famous.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q5", "no": 5, "q": "The trees from which quinine is derived grow only in South America.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q6", "no": 6, "q": "Perkin hoped to manufacture a drug from a coal tar waste product.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q7", "no": 7, "q": "Perkin was inspired by the discoveries of the famous scientist Louis Pasteur.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 8–13",
            "instruction": "Answer the questions below. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "Before Perkin's discovery, with what group in society was the colour purple associated? <Q n=\"8\">"},
                {"plain": True, "html": "What potential did Perkin immediately understand that his new dye had? <Q n=\"9\">"},
                {"plain": True, "html": "What was the name finally used to refer to the first colour Perkin invented? <Q n=\"10\">"},
                {"plain": True, "html": "What was the name of the person Perkin consulted before setting up his own dye works? <Q n=\"11\">"},
                {"plain": True, "html": "In what country did Perkin's newly invented colour first become fashionable? <Q n=\"12\">"},
                {"plain": True, "html": "According to the passage, which disease is now being targeted by researchers using synthetic dyes? <Q n=\"13\">"},
            ],
            "questions": [
                {"id": "Q8", "no": 8, "answer": ans("rich", "the rich", "only rich"), "explain": explain("rich", "the rich", "only rich")},
                {"id": "Q9", "no": 9, "answer": ans("commercial possibilities"), "explain": explain("commercial possibilities")},
                {"id": "Q10", "no": 10, "answer": ans("mauve"), "explain": explain("mauve")},
                {"id": "Q11", "no": 11, "answer": ans("Robert Pullar", "Pullar"), "explain": explain("Robert Pullar", "Pullar")},
                {"id": "Q12", "no": 12, "answer": ans("France"), "explain": explain("France")},
                {"id": "Q13", "no": 13, "answer": ans("malaria"), "explain": explain("malaria")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–17",
            "instruction": "Reading Passage 2 has five paragraphs, A–E. Choose the correct heading for paragraphs B–E from the list of headings below. Example: Paragraph A = v.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "Seeking the transmission of radio signals from planets",
                "ii": "Appropriate responses to signals from other civilisations",
                "iii": "Vast distances to Earth's closest neighbours",
                "iv": "Assumptions underlying the search for extra-terrestrial intelligence",
                "v": "Reasons for the search for extra-terrestrial intelligence",
                "vi": "Knowledge of extra-terrestrial life forms",
                "vii": "Likelihood of life on other planets",
            },
            "questions": [
                {"id": "Q14", "no": 14, "q": "Paragraph B", "answer": ans("iv"), "explain": explain("iv")},
                {"id": "Q15", "no": 15, "q": "Paragraph C", "answer": ans("vii"), "explain": explain("vii")},
                {"id": "Q16", "no": 16, "q": "Paragraph D", "answer": ans("i"), "explain": explain("i")},
                {"id": "Q17", "no": 17, "q": "Paragraph E", "answer": ans("ii"), "explain": explain("ii")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 18–20",
            "instruction": "Answer the questions below. Choose NO MORE THAN THREE WORDS AND/OR A NUMBER from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "What is the life expectancy of Earth? <Q n=\"18\">"},
                {"plain": True, "html": "What kind of signals from other intelligent civilisations are SETI scientists searching for? <Q n=\"19\">"},
                {"plain": True, "html": "How many stars are the world's most powerful radio telescopes searching? <Q n=\"20\">"},
            ],
            "questions": [
                {"id": "Q18", "no": 18, "answer": ans("several billion years"), "explain": explain("several billion years")},
                {"id": "Q19", "no": 19, "answer": ans("radio waves", "radio signals", "radio"), "explain": explain("radio waves", "radio signals", "radio")},
                {"id": "Q20", "no": 20, "answer": ans("1000", "1000 stars"), "explain": explain("1000", "1000 stars")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 21–26",
            "instruction": "Do the following statements agree with the views of the writer in Reading Passage 2?",
            "variant": "yn",
            "questions": [
                {"id": "Q21", "no": 21, "q": "Alien civilisations may be able to help the human race to overcome serious problems.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q22", "no": 22, "q": "SETI scientists are trying to find a life form that resembles humans in many ways.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q23", "no": 23, "q": "The Americans and Australians have co-operated on joint research projects.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q24", "no": 24, "q": "So far SETI scientists have picked up radio signals from several stars.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q25", "no": 25, "q": "The NASA project attracted criticism from some members of Congress.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q26", "no": 26, "q": "If a signal from outer space is received, it will be important to respond promptly.", "answer": ans("NO"), "explain": explain("NO")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "note",
            "title": "Questions 27–30",
            "instruction": "Answer the questions below. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
            "lines": [
                {"plain": True, "html": "What had to transfer from sea to land before any animals could migrate? <Q n=\"27\">"},
                {"plain": True, "html": "Which TWO processes are mentioned as those in which animals had to make big changes as they moved onto land? <Q n=\"28\">"},
                {"plain": True, "html": "Which physical feature, possessed by their ancestors, do whales lack? <Q n=\"29\">"},
                {"plain": True, "html": "Which animals might ichthyosaurs have resembled? <Q n=\"30\">"},
            ],
            "questions": [
                {"id": "Q27", "no": 27, "answer": ans("plants"), "explain": explain("plants")},
                {"id": "Q28", "no": 28, "answer": ans("breathing and reproduction", "breathing reproduction", "breathing, reproduction", "reproduction and breathing"), "explain": explain("breathing and reproduction")},
                {"id": "Q29", "no": 29, "answer": ans("gills"), "explain": explain("gills")},
                {"id": "Q30", "no": 30, "answer": ans("dolphins"), "explain": explain("dolphins")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 31–33",
            "instruction": "Do the following statements agree with the information given in Reading Passage 3?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q31", "no": 31, "q": "Turtles were among the first group of animals to migrate back to the sea.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q32", "no": 32, "q": "It is always difficult to determine where an animal lived when its fossilised remains are incomplete.", "answer": ans("FALSE"), "explain": explain("FALSE")},
                {"id": "Q33", "no": 33, "q": "The habitat of ichthyosaurs can be determined by the appearance of their fossilised remains.", "answer": ans("TRUE"), "explain": explain("TRUE")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 34–39",
            "instruction": "Complete the flow-chart below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer.",
            "noteTitle": "Method of determining where the ancestors of turtles and tortoises come from",
            "lines": [
                {"plain": True, "html": "<strong>Step 1:</strong>"},
                {"plain": True, "html": "71 species of living turtles and tortoises were examined and a total of <Q n=\"34\"> were taken from the bones of their forelimbs."},
                {"plain": True, "html": "<strong>Step 2:</strong>"},
                {"plain": True, "html": "The data was recorded on a <Q n=\"35\"> (necessary for comparing the information)."},
                {"plain": True, "html": "<strong>Outcome:</strong> Land tortoises were represented by a dense <Q n=\"36\"> of points towards the top. Sea turtles were grouped together in the bottom part."},
                {"plain": True, "html": "<strong>Step 3:</strong>"},
                {"plain": True, "html": "The same data was collected from some living <Q n=\"37\"> species and added to the other results."},
                {"plain": True, "html": "<strong>Outcome:</strong> The points for these species turned out to be positioned about <Q n=\"38\"> up the triangle between the land tortoises and the sea turtles."},
                {"plain": True, "html": "<strong>Step 4:</strong>"},
                {"plain": True, "html": "Bones of P. quenstedtii and P. talampayensis were examined in a similar way and the results added."},
                {"plain": True, "html": "<strong>Outcome:</strong> The position of the points indicated that both these ancient creatures were <Q n=\"39\">"},
            ],
            "questions": [
                {"id": "Q34", "no": 34, "answer": ans("3 measurements"), "explain": explain("3 measurements")},
                {"id": "Q35", "no": 35, "answer": ans("triangular graph", "graph"), "explain": explain("triangular graph", "graph")},
                {"id": "Q36", "no": 36, "answer": ans("cluster"), "explain": explain("cluster")},
                {"id": "Q37", "no": 37, "answer": ans("amphibious"), "explain": explain("amphibious")},
                {"id": "Q38", "no": 38, "answer": ans("half way", "halfway"), "explain": explain("half way", "halfway")},
                {"id": "Q39", "no": 39, "answer": ans("dry-land tortoises", "dry land tortoises"), "explain": explain("dry-land tortoises", "dry land tortoises")},
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
                    "q": "According to the writer, the most significant thing about tortoises is that",
                    "options": {
                        "A": "they are able to adapt to life in extremely dry environments.",
                        "B": "their original life form was a kind of primeval bacteria.",
                        "C": "they have so much in common with sea turtles.",
                        "D": "they have made the transition from sea to land more than once.",
                    },
                    "answer": ans("D"),
                    "explain": explain("D"),
                }
            ],
        },
    ]
    return {"meta": {"volume": 9, "testNo": 1}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The two maps below show an island, before and after the construction of some tourist facilities.<br><br>"
                "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Island before and after tourist development",
                    "image": "cambridge-9-test-1-island.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Some experts believe that it is better for children to begin learning a foreign language at primary school rather than secondary school.<br><br>"
                "Do the advantages of this outweigh the disadvantages?<br><br>"
                "Give reasons for your answer and include any relevant examples from your own knowledge or experience.<br>"
                "<strong>Write at least 250 words.</strong>"
            )
        },
    }


def copy_assets() -> None:
    for i, src in enumerate(AUDIO_SRC, start=1):
        if not src.exists():
            raise FileNotFoundError(src)
        dst = LISTENING_DIR / f"cam9_test1_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    if not ISLAND_SRC.exists():
        raise FileNotFoundError(ISLAND_SRC)
    island_dst = WRITING_DIR / "cambridge-9-test-1-island.png"
    shutil.copy2(ISLAND_SRC, island_dst)
    print(f"copied image -> {island_dst.relative_to(ROOT)}")


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
