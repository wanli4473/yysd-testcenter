#!/usr/bin/env python3
"""Generate Cambridge IELTS 8 Test 4 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑8T4.docx")
MAP_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_16.47.48-4e48c589-51ef-400b-82a9-01c1cf98d6cb.png"
)
ANT_TRAP_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_16.48.05-c85c9439-5232-48b5-a489-0a4b76961ba6.png"
)
TRANSPORT_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-01_16.48.11-adbd29ce-b181-4960-9373-582f4325b9a8.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test4 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test4 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test4 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS8 Test4 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-8-test-4.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-8-test-4-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-8-test-4-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
READING_DIR = ROOT / "library/mock/cambridge-reading"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-8-test-3.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-8-test-3-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-8-test-3-writing.html"

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
        ("剑桥雅思8 Test 3 听力", "剑桥雅思8 Test 4 听力"),
        ("剑桥雅思8 · Test 3（听力）", "剑桥雅思8 · Test 4（听力）"),
        ("剑桥雅思8 Test 3 听力：", "剑桥雅思8 Test 4 听力："),
        ("Test 3 听力（官方原题 + 官方答案）", "Test 4 听力（官方原题 + 官方答案）"),
        ("test-3", "test-4"),
        ("cam8_test3", "cam8_test4"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    html = inject_state_vars(html)
    return patch_note_image(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思8 Test 3 阅读", "剑桥雅思8 Test 4 阅读"),
        ("剑桥雅思8 · Test 3（阅读）", "剑桥雅思8 · Test 4（阅读）"),
        ("剑桥雅思8 Test 3 学术类阅读", "剑桥雅思8 Test 4 学术类阅读"),
        ("Test 3 阅读（官方原题 + 官方答案）", "Test 4 阅读（官方原题 + 官方答案）"),
        ("Test 3", "Test 4"),
        ("test-3", "test-4"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思8 Test 3 写作", "剑桥雅思8 Test 4 写作"),
        ("剑桥雅思8 · Test 3（写作）", "剑桥雅思8 · Test 4（写作）"),
        ("剑桥雅思8 Test 3 学术类写作", "剑桥雅思8 Test 4 学术类写作"),
        (
            "Task 1 cement and concrete production diagrams + Task 2 petrol price traffic pollution essay",
            "Task 1 UK goods transport graph + Task 2 weight and fitness essay",
        ),
        ("Test 3 写作（官方真题）", "Test 4 写作（官方真题）"),
        ("cambridge-8-test-3-writing-draft", "cambridge-8-test-4-writing-draft"),
        ("【剑桥雅思8 · Test 3 写作】", "【剑桥雅思8 · Test 4 写作】"),
        ("Test 3", "Test 4"),
        ("test-3", "test-4"),
        ("cement-concrete", "goods-transport"),
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
    p1_paras = [p1[2], *[labeled_para(x) for x in p1[3:]]]
    return [
        {
            "id": 1,
            "passage": {
                "title": "Mathematical attainment in Japan and England",
                "byline": p1[1],
                "paras": p1_paras,
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
                "title": p3[2],
                "byline": p3[1],
                "paras": p3[3:],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 8, "testNo": 4},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "cam8_test4_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–10",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "West Bay Hotel – details of job",
                        "lines": [
                            {"plain": True, "html": "Example: Newspaper advert for temporary staff"},
                            {"plain": True, "html": "Vacancies for <Q n=\"1\">"},
                            {"plain": True, "html": "Two shifts – can choose your <Q n=\"2\"> (must be the same each week)"},
                            {"plain": True, "html": "Pay: £5.50 per hour, including a <Q n=\"3\">"},
                            {"plain": True, "html": "A <Q n=\"4\"> is provided in the hotel"},
                            {"plain": True, "html": "Total weekly pay: £231"},
                            {"plain": True, "html": "Dress: a white shirt and <Q n=\"5\"> trousers (not supplied); a <Q n=\"6\"> (supplied)"},
                            {"plain": True, "html": "Starting date: <Q n=\"7\">"},
                            {"plain": True, "html": "Call Jane <Q n=\"8\"> (Service Manager) before <Q n=\"9\"> tomorrow (Tel: 832009)"},
                            {"plain": True, "html": "She'll require a <Q n=\"10\">"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("waiter", "waiters"), "explain": explain("waiter", "waiters")},
                            {"id": "L2", "no": 2, "answer": ans("day off"), "explain": explain("day off")},
                            {"id": "L3", "no": 3, "answer": ans("5.50"), "explain": explain("5.50")},
                            {"id": "L4", "no": 4, "answer": ans("meal", "free meal"), "explain": explain("meal", "free meal")},
                            {"id": "L5", "no": 5, "answer": ans("dark", "dark coloured", "dark colored"), "explain": explain("dark", "dark coloured")},
                            {"id": "L6", "no": 6, "answer": ans("jacket"), "explain": explain("jacket")},
                            {"id": "L7", "no": 7, "answer": ans("28 June"), "explain": explain("28 June")},
                            {"id": "L8", "no": 8, "answer": ans("Urwin"), "explain": explain("Urwin")},
                            {"id": "L9", "no": 9, "answer": ans("12.00", "12", "noon", "mid-day", "midday"), "explain": explain("12.00", "noon", "mid-day")},
                            {"id": "L10", "no": 10, "answer": ans("reference"), "explain": explain("reference")},
                        ],
                    }
                ],
            },
            {
                "id": 2,
                "audio": "cam8_test4_audio2.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 11–13",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L11", "no": 11, "q": "Community groups are mainly concerned about", "options": {"A": "pedestrian safety.", "B": "traffic jams.", "C": "increased pollution."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L12", "no": 12, "q": "It has been decided that the overhead power lines will be", "options": {"A": "extended.", "B": "buried.", "C": "repaired."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L13", "no": 13, "q": "The expenses related to the power lines will be paid for by", "options": {"A": "the council.", "B": "the power company.", "C": "local businesses."}, "answer": ans("B"), "explain": explain("B")},
                        ],
                    },
                    {
                        "kind": "map",
                        "title": "Questions 14–20",
                        "instruction": "Label the map below. Write the correct letter, A–I, next to questions 14–20.",
                        "mapTitle": "Red Hill Improvement Plan",
                        "image": "cambridge-8-test-4-red-hill-map.png",
                        "letters": ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
                        "questions": [
                            {"id": "L14", "no": 14, "q": "trees", "answer": ans("C"), "explain": explain("C")},
                            {"id": "L15", "no": 15, "q": "wider footpaths", "answer": ans("D"), "explain": explain("D")},
                            {"id": "L16", "no": 16, "q": "coloured road surface", "answer": ans("G"), "explain": explain("G")},
                            {"id": "L17", "no": 17, "q": "new sign", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L18", "no": 18, "q": "traffic lights", "answer": ans("F"), "explain": explain("F")},
                            {"id": "L19", "no": 19, "q": "artwork", "answer": ans("A"), "explain": explain("A")},
                            {"id": "L20", "no": 20, "q": "children's playground", "answer": ans("E"), "explain": explain("E")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "cam8_test4_audio3.mp3",
                "groups": [
                    {
                        "kind": "multi",
                        "title": "Questions 21 and 22",
                        "instruction": "Choose TWO letters, A–E. In which TWO ways is Dan financing his course?",
                        "box": {
                            "A": "He is receiving money from the government.",
                            "B": "His family are willing to help him.",
                            "C": "The college is giving him a small grant.",
                            "D": "His local council is supporting him for a limited period.",
                            "E": "A former employer is providing partial funding.",
                        },
                        "answerSet": ["B", "E"],
                        "questions": [
                            {"id": "L21", "no": 21, "explain": "答案：B 与 E，顺序不限。"},
                            {"id": "L22", "no": 22, "explain": "答案：B 与 E，顺序不限。"},
                        ],
                    },
                    {
                        "kind": "multi",
                        "title": "Questions 23 and 24",
                        "instruction": "Choose TWO letters, A–E. Which TWO reasons does Jeannie give for deciding to leave some college clubs?",
                        "box": {
                            "A": "She is not sufficiently challenged.",
                            "B": "The activity interferes with her studies.",
                            "C": "She does not have enough time.",
                            "D": "The activity is too demanding physically.",
                            "E": "She does not think she is any good at the activity.",
                        },
                        "answerSet": ["A", "C"],
                        "questions": [
                            {"id": "L23", "no": 23, "explain": "答案：A 与 C，顺序不限。"},
                            {"id": "L24", "no": 24, "explain": "答案：A 与 C，顺序不限。"},
                        ],
                    },
                    {
                        "kind": "mcq",
                        "title": "Questions 25 and 26",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L25", "no": 25, "q": "What does Dan say about the seminars on the course?", "options": {"A": "The other students do not give him a chance to speak.", "B": "The seminars make him feel inferior to the other students.", "C": "The preparation for seminars takes too much time."}, "answer": ans("B"), "explain": explain("B")},
                            {"id": "L26", "no": 26, "q": "What does Jeannie say about the tutorials on the course?", "options": {"A": "They are an inefficient way of providing guidance.", "B": "They are more challenging than she had expected.", "C": "They are helping her to develop her study skills."}, "answer": ans("C"), "explain": explain("C")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 27–30",
                        "instruction": "Complete the flow-chart below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "Planning an essay",
                        "lines": [
                            {"plain": True, "html": "Work out your <Q n=\"27\"> and write them down"},
                            {"plain": True, "html": "Draw up a <Q n=\"28\">"},
                            {"plain": True, "html": "Break the work down into (small) <Q n=\"29\">"},
                            {"plain": True, "html": "Write a (single) <Q n=\"30\"> at a time"},
                        ],
                        "questions": [
                            {"id": "L27", "no": 27, "answer": ans("priorities"), "explain": explain("priorities")},
                            {"id": "L28", "no": 28, "answer": ans("timetable"), "explain": explain("timetable")},
                            {"id": "L29", "no": 29, "answer": ans("tasks", "small tasks"), "explain": explain("tasks", "small tasks")},
                            {"id": "L30", "no": 30, "answer": ans("paragraph", "single paragraph"), "explain": explain("paragraph", "single paragraph")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "cam8_test4_audio4.mp3",
                "groups": [
                    {
                        "kind": "match",
                        "title": "Questions 31–36",
                        "instruction": "Australian Aboriginal Rock Paintings – Which painting styles have the following features? Write the correct letter, A, B or C.",
                        "boxTitle": "Painting Styles",
                        "box": {
                            "A": "Dynamic",
                            "B": "Yam",
                            "C": "Modern",
                        },
                        "subTitle": "Features",
                        "questions": [
                            {"id": "L31", "no": 31, "q": "figures revealing bones", "answer": ans("C"), "explain": explain("C")},
                            {"id": "L32", "no": 32, "q": "rounded figures", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L33", "no": 33, "q": "figures with parts missing", "answer": ans("C"), "explain": explain("C")},
                            {"id": "L34", "no": 34, "q": "figures smaller than life size", "answer": ans("A"), "explain": explain("A")},
                            {"id": "L35", "no": 35, "q": "sea creatures", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L36", "no": 36, "q": "plants", "answer": ans("B"), "explain": explain("B")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 37–40",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Rainbow Serpent Project",
                        "lines": [
                            {"plain": True, "html": "Aim of project: to identify the <Q n=\"37\"> used as the basis for the Rainbow Serpent"},
                            {"h": "Yam Period"},
                            {"bullet": True, "html": "environmental changes led to higher <Q n=\"38\">"},
                            {"bullet": True, "html": "traditional activities were affected, especially <Q n=\"39\">"},
                            {"bullet": True, "html": "<Q n=\"40\">"},
                        ],
                        "questions": [
                            {"id": "L37", "no": 37, "answer": ans("animal", "creature"), "explain": explain("animal", "creature")},
                            {"id": "L38", "no": 38, "answer": ans("sea level", "sea levels", "water level", "water levels"), "explain": explain("sea level", "water level")},
                            {"id": "L39", "no": 39, "answer": ans("hunting"), "explain": explain("hunting")},
                            {"id": "L40", "no": 40, "answer": ans("40"), "explain": explain("40")},
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
            "kind": "match",
            "title": "Questions 1–5",
            "instruction": "Reading Passage 1 has six sections, A–F. Choose the correct heading for sections B–F from the list below. Example: Section A = iv.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "The influence of Monbusho",
                "ii": "Helping less successful students",
                "iii": "The success of compulsory education",
                "iv": "Research findings concerning achievements in maths",
                "v": "The typical format of a maths lesson",
                "vi": "Comparative expenditure on maths education",
                "vii": "Background to middle-years education in Japan",
                "viii": "The key to Japanese successes in maths education",
                "ix": "The role of homework correction",
            },
            "questions": [
                {"id": "Q1", "no": 1, "q": "Section B", "answer": ans("vii"), "explain": explain("vii")},
                {"id": "Q2", "no": 2, "q": "Section C", "answer": ans("i"), "explain": explain("i")},
                {"id": "Q3", "no": 3, "q": "Section D", "answer": ans("v"), "explain": explain("v")},
                {"id": "Q4", "no": 4, "q": "Section E", "answer": ans("ii"), "explain": explain("ii")},
                {"id": "Q5", "no": 5, "q": "Section F", "answer": ans("viii"), "explain": explain("viii")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 6–9",
            "instruction": "Do the following statements agree with the claims of the writer in Reading Passage 1?",
            "variant": "yn",
            "questions": [
                {"id": "Q6", "no": 6, "q": "There is a wider range of achievement amongst English pupils studying maths than amongst their Japanese counterparts.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q7", "no": 7, "q": "The percentage of Gross National Product spent on education generally reflects the level of attainment in mathematics.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q8", "no": 8, "q": "Private schools in Japan are more modern and spacious than state-run lower secondary schools.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q9", "no": 9, "q": "Teachers mark homework in Japanese schools.", "answer": ans("NO"), "explain": explain("NO")},
            ],
        },
        {
            "kind": "mcq",
            "title": "Questions 10–13",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q10", "no": 10, "q": "Maths textbooks in Japanese schools are", "options": {"A": "cheap for pupils to buy.", "B": "well organised and adapted to the needs of the pupils.", "C": "written to be used in conjunction with TV programmes.", "D": "not very popular with many Japanese teachers."}, "answer": ans("B"), "explain": explain("B")},
                {"id": "Q11", "no": 11, "q": "When a new maths topic is introduced,", "options": {"A": "students answer questions on the board.", "B": "students rely entirely on the textbook.", "C": "it is carefully and patiently explained to the students.", "D": "it is usual for students to use extra worksheets."}, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q12", "no": 12, "q": "How do schools deal with students who experience difficulties?", "options": {"A": "They are given appropriate supplementary tuition.", "B": "They are encouraged to copy from other pupils.", "C": "They are forced to explain their slow progress.", "D": "They are placed in a mixed-ability class."}, "answer": ans("A"), "explain": explain("A")},
                {"id": "Q13", "no": 13, "q": "Why do Japanese students tend to achieve relatively high rates of success in maths?", "options": {"A": "It is a compulsory subject in Japan.", "B": "They are used to working without help from others.", "C": "Much effort is made and correct answers are emphasised.", "D": "There is a strong emphasis on repetitive learning."}, "answer": ans("C"), "explain": explain("C")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "mcq",
            "title": "Questions 14–17",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q14", "no": 14, "q": "The use of pesticides has contributed to", "options": {"A": "a change in the way ecologies are classified by agroecologists.", "B": "an imbalance in many ecologies around the world.", "C": "the prevention of ecological disasters in some parts of the world.", "D": "an increase in the range of ecologies which can be usefully farmed."}, "answer": ans("B"), "explain": explain("B")},
                {"id": "Q15", "no": 15, "q": "The Food and Agriculture Organisation has counted more than 300 agricultural pests which", "options": {"A": "are no longer responding to most pesticides in use.", "B": "can be easily controlled through the use of pesticides.", "C": "continue to spread disease in a wide range of crops.", "D": "may be used as part of bio-control's replacement of pesticides."}, "answer": ans("A"), "explain": explain("A")},
                {"id": "Q16", "no": 16, "q": "Cotton farmers in Central America began to use pesticides", "options": {"A": "because of an intensive government advertising campaign.", "B": "in response to the appearance of new varieties of pest.", "C": "as a result of changes in the seasons and the climate.", "D": "to ensure more cotton was harvested from each crop."}, "answer": ans("D"), "explain": explain("D")},
                {"id": "Q17", "no": 17, "q": "By the mid-1960s, cotton farmers in Central America found that pesticides", "options": {"A": "were wiping out 50% of the pests plaguing the crops.", "B": "were destroying 50% of the crops they were meant to protect.", "C": "were causing a 50% increase in the number of new pests reported.", "D": "were costing 50% of the total amount they spent on their crops."}, "answer": ans("D"), "explain": explain("D")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 18–21",
            "instruction": "Do the following statements agree with the claims of the writer in Reading Passage 2?",
            "variant": "yn",
            "questions": [
                {"id": "Q18", "no": 18, "q": "Disease-spreading pests respond more quickly to pesticides than agricultural pests do.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q19", "no": 19, "q": "A number of pests are now born with an innate immunity to some pesticides.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q20", "no": 20, "q": "Biological control entails using synthetic chemicals to try and change the genetic make-up of the pests' offspring.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q21", "no": 21, "q": "Bio-control is free from danger under certain circumstances.", "answer": ans("YES"), "explain": explain("YES")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 22–26",
            "instruction": "Complete each sentence with the correct ending, A–I, below.",
            "boxTitle": "Endings",
            "box": {
                "A": "forage grass.",
                "B": "rice fields.",
                "C": "coconut trees.",
                "D": "fruit trees.",
                "E": "water hyacinth.",
                "F": "parthenium weed.",
                "G": "Brazilian beetles.",
                "H": "grass-scale insects.",
                "I": "larval parasites.",
            },
            "subTitle": "Sentence beginnings",
            "questions": [
                {"id": "Q22", "no": 22, "q": "Dispine scale insects feed on", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q23", "no": 23, "q": "Neodumetia sangawani ate", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q24", "no": 24, "q": "Leaf-mining hispides blighted", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q25", "no": 25, "q": "An Argentinian weevil may be successful in wiping out", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q26", "no": 26, "q": "Salvinia molesta plagues", "answer": ans("B"), "explain": explain("B")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "tfng",
            "title": "Questions 27–30",
            "instruction": "Do the following statements agree with the information given in Reading Passage 3?",
            "options": ["TRUE", "FALSE", "NOT GIVEN"],
            "questions": [
                {"id": "Q27", "no": 27, "q": "Taxonomic research involves comparing members of one group of ants.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q28", "no": 28, "q": "New species of ant are frequently identified by taxonomists.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q29", "no": 29, "q": "Range is the key criterion for ecological collections.", "answer": ans("TRUE"), "explain": explain("TRUE")},
                {"id": "Q30", "no": 30, "q": "A single collection of ants can generally be used for both taxonomic and ecological purposes.", "answer": ans("FALSE"), "explain": explain("FALSE")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 31–36",
            "instruction": "Classify the following statements as referring to A hand collecting, B using bait, C sampling ground litter, or D using a pitfall trap.",
            "boxTitle": "Methods",
            "box": {
                "A": "hand collecting",
                "B": "using bait",
                "C": "sampling ground litter",
                "D": "using a pitfall trap",
            },
            "questions": [
                {"id": "Q31", "no": 31, "q": "It is preferable to take specimens from groups of ants.", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q32", "no": 32, "q": "It is particularly effective for wet habitats.", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q33", "no": 33, "q": "It is a good method for species which are hard to find.", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q34", "no": 34, "q": "Little time and effort is required.", "answer": ans("D"), "explain": explain("D")},
                {"id": "Q35", "no": 35, "q": "Separate containers are used for individual specimens.", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q36", "no": 36, "q": "Non-alcoholic preservative should be used.", "answer": ans("D"), "explain": explain("D")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 37–40",
            "instruction": "Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "noteTitle": "One method of collecting ants",
            "image": "cambridge-8-test-4-ant-trap.png",
            "lines": [
                {"plain": True, "html": "some <Q n=\"37\">"},
                {"plain": True, "html": "<Q n=\"38\">"},
                {"plain": True, "html": "a <Q n=\"39\">"},
                {"plain": True, "html": "<Q n=\"40\">"},
            ],
            "questions": [
                {"id": "Q37", "no": 37, "answer": ans("heat"), "explain": explain("heat")},
                {"id": "Q38", "no": 38, "answer": ans("leaf litter"), "explain": explain("leaf litter")},
                {"id": "Q39", "no": 39, "answer": ans("screen"), "explain": explain("screen")},
                {"id": "Q40", "no": 40, "answer": ans("alcohol"), "explain": explain("alcohol")},
            ],
        },
    ]
    return {"meta": {"volume": 8, "testNo": 4}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The graph below shows the quantities of goods transported in the UK between 1974 and 2002 "
                "by four different modes of transport.<br><br>"
                "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Goods transported in UK (1974–2002)",
                    "image": "cambridge-8-test-4-goods-transport.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> In some countries the average weight of people is increasing and their levels "
                "of health and fitness are decreasing.<br><br>"
                "What do you think are the causes of these problems and what measures could be taken to solve them?<br><br>"
                "Give reasons for your answer and include any relevant examples from your own knowledge or experience.<br>"
                "<strong>Write at least 250 words.</strong>"
            )
        },
    }


def copy_assets() -> None:
    for i, src in enumerate(AUDIO_SRC, start=1):
        if not src.exists():
            raise FileNotFoundError(src)
        dst = LISTENING_DIR / f"cam8_test4_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    map_dst = LISTENING_DIR / "cambridge-8-test-4-red-hill-map.png"
    shutil.copy2(MAP_SRC, map_dst)
    print(f"copied image -> {map_dst.relative_to(ROOT)}")
    ant_dst = READING_DIR / "cambridge-8-test-4-ant-trap.png"
    shutil.copy2(ANT_TRAP_SRC, ant_dst)
    print(f"copied image -> {ant_dst.relative_to(ROOT)}")
    transport_dst = WRITING_DIR / "cambridge-8-test-4-goods-transport.png"
    shutil.copy2(TRANSPORT_SRC, transport_dst)
    print(f"copied image -> {transport_dst.relative_to(ROOT)}")


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
