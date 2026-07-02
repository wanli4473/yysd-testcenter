#!/usr/bin/env python3
"""Generate Cambridge IELTS 6 Test 3 listening, reading, and writing mock pages."""

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

DOCX = Path("/Users/frankman/Desktop/剑6T3.docx")
ROSEWOOD_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-02_15.35.38-495acca4-1ee9-4c3e-8770-9732730e1b92.png"
)
SILKWORM_SRC = Path(
    "/Users/frankman/.cursor/projects/Users-frankman-yysd-test-center/assets/"
    "__2026-07-02_15.36.01-aa2cca35-019b-47bc-8731-85169cde559b.png"
)
AUDIO_SRC = [
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test3 Section1.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test3 Section2.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test3 Section3.mp3"),
    Path("/Users/frankman/Desktop/之昂张张张zzz - IELTS6 Test3 Section4.mp3"),
]

OUT_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-6-test-3.html"
OUT_READING = ROOT / "library/mock/cambridge-reading/cambridge-6-test-3-reading.html"
OUT_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-6-test-3-writing.html"
LISTENING_DIR = ROOT / "library/mock/cambridge-listening"
WRITING_DIR = ROOT / "library/mock/cambridge-writing"

TPL_LISTENING = ROOT / "library/mock/cambridge-listening/cambridge-6-test-2.html"
TPL_READING = ROOT / "library/mock/cambridge-reading/cambridge-6-test-2-reading.html"
TPL_WRITING = ROOT / "library/mock/cambridge-writing/cambridge-6-test-2-writing.html"

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
        ("剑桥雅思6 Test 2 听力", "剑桥雅思6 Test 3 听力"),
        ("剑桥雅思6 · Test 2（听力）", "剑桥雅思6 · Test 3（听力）"),
        ("剑桥雅思6 Test 2 听力：", "剑桥雅思6 Test 3 听力："),
        ("Test 2 听力（官方原题 + 官方答案）", "Test 3 听力（官方原题 + 官方答案）"),
        ("剑桥雅思 6 · Test 2", "剑桥雅思 6 · Test 3"),
        ("剑桥雅思6 · Test 2", "剑桥雅思6 · Test 3"),
        ("test-2", "test-3"),
        ("ielts6_test2", "ielts6_test3"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_reading_meta(html: str) -> str:
    reps = [
        ("剑桥雅思6 Test 2 阅读", "剑桥雅思6 Test 3 阅读"),
        ("剑桥雅思6 · Test 2（阅读）", "剑桥雅思6 · Test 3（阅读）"),
        ("剑桥雅思6 Test 2 学术类阅读", "剑桥雅思6 Test 3 学术类阅读"),
        ("Test 2 阅读（官方原题 + 官方答案）", "Test 3 阅读（官方原题 + 官方答案）"),
        ("剑桥雅思 6 · Test 2", "剑桥雅思 6 · Test 3"),
        ("剑桥雅思6 · Test 2", "剑桥雅思6 · Test 3"),
        ("Test 2", "Test 3"),
        ("test-2", "test-3"),
    ]
    for old, new in reps:
        html = html.replace(old, new)
    return inject_state_vars(html)


def patch_writing_meta(html: str) -> str:
    reps = [
        ("剑桥雅思6 Test 2 写作", "剑桥雅思6 Test 3 写作"),
        ("剑桥雅思6 · Test 2（写作）", "剑桥雅思6 · Test 3（写作）"),
        ("剑桥雅思6 Test 2 学术类写作", "剑桥雅思6 Test 3 学术类写作"),
        (
            "Task 1 travel modes table + Task 2 sports professionals earnings essay",
            "Task 1 silkworm life cycle diagram + Task 2 cultural customs essay",
        ),
        ("剑桥雅思 6 · Test 2", "剑桥雅思 6 · Test 3"),
        ("剑桥雅思6 · Test 2", "剑桥雅思6 · Test 3"),
        ("Test 2 写作（官方真题）", "Test 3 写作（官方真题）"),
        ("cambridge-6-test-2-writing-draft", "cambridge-6-test-3-writing-draft"),
        ("【剑桥雅思6 · Test 2 写作】", "【剑桥雅思6 · Test 3 写作】"),
        ("Test 2", "Test 3"),
        ("test-2", "test-3"),
        ("travel-modes", "silkworm"),
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


def reading_passages() -> list[dict]:
    p = extract_docx_paras(DOCX)
    return [
        {
            "id": 1,
            "passage": {
                "title": "The birth of cinema",
                "paras": [labeled_para(x) for x in p[97:107]],
            },
        },
        {
            "id": 2,
            "passage": {
                "title": p[144],
                "paras": p[145:159],
            },
        },
        {
            "id": 3,
            "passage": {
                "title": p[197],
                "paras": p[198:209],
            },
        },
    ]


def listening_test() -> dict:
    return {
        "meta": {"volume": 6, "testNo": 3},
        "durationMin": 30,
        "sections": [
            {
                "id": 1,
                "audio": "ielts6_test3_audio1.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 1–10",
                        "instruction": "Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.",
                        "noteTitle": "OPENING A BANK ACCOUNT",
                        "lines": [
                            {"plain": True, "html": "Example: Application for a Current bank account"},
                            {"plain": True, "html": "Type of current account: The <Q n=\"1\"> account"},
                            {"plain": True, "html": "Full name of applicant: Pieter Henes"},
                            {"plain": True, "html": "Date of birth: <Q n=\"2\">"},
                            {"plain": True, "html": "Joint account holder(s): No"},
                            {"plain": True, "html": "Current address: <Q n=\"3\">"},
                            {"plain": True, "html": "Time at current address: <Q n=\"4\">"},
                            {"plain": True, "html": "Previous address: Rielsdorf 2, Utrecht, Holland"},
                            {"plain": True, "html": "Telephone: work <Q n=\"5\">; home 796431"},
                            {"plain": True, "html": "Occupation: <Q n=\"6\">"},
                            {"h": "Other information:"},
                            {"bullet": True, "html": "Identification: <Q n=\"7\">'s name and address"},
                            {"bullet": True, "html": "Amount to be transferred: £<Q n=\"8\">"},
                            {"bullet": True, "html": "Statements: every <Q n=\"9\">"},
                            {"bullet": True, "html": "Other services: <Q n=\"10\"> banking"},
                        ],
                        "questions": [
                            {"id": "L1", "no": 1, "answer": ans("Select"), "explain": explain("Select")},
                            {"id": "L2", "no": 2, "answer": ans("27.01.1973", "27/01/1973", "27 January 1973"), "explain": explain("27.01.1973", "27/01/1973")},
                            {"id": "L3", "no": 3, "answer": ans("15 Riverside"), "explain": explain("15 Riverside")},
                            {"id": "L4", "no": 4, "answer": ans("2 weeks", "two weeks"), "explain": explain("2 weeks", "two weeks")},
                            {"id": "L5", "no": 5, "answer": ans("616295"), "explain": explain("616295")},
                            {"id": "L6", "no": 6, "answer": ans("engineer"), "explain": explain("engineer")},
                            {"id": "L7", "no": 7, "answer": ans("mother"), "explain": explain("mother")},
                            {"id": "L8", "no": 8, "answer": ans("2000", "2,000"), "explain": explain("2000", "2,000")},
                            {"id": "L9", "no": 9, "answer": ans("month"), "explain": explain("month")},
                            {"id": "L10", "no": 10, "answer": ans("internet"), "explain": explain("internet")},
                        ],
                    },
                ],
            },
            {
                "id": 2,
                "audio": "ielts6_test3_audio2.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 11–13",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L11", "no": 11, "q": "When the writer Sebastian George first saw Rosewood House, he", "options": {"A": "thought he might rent it.", "B": "felt it was too expensive for him.", "C": "was unsure whether to buy it."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L12", "no": 12, "q": "Before buying the house, George had", "options": {"A": "experienced severe family problems.", "B": "struggled to become a successful author.", "C": "suffered a serious illness."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L13", "no": 13, "q": "According to the speaker, George viewed Rosewood House as", "options": {"A": "a rich source of material for his books.", "B": "a way to escape from his work.", "C": "a typical building of the region."}, "answer": ans("C"), "explain": explain("C")},
                        ],
                    },
                    {
                        "kind": "map",
                        "title": "Questions 14–17",
                        "instruction": "Label the map below. Write the correct letter, A–H, next to questions 14–17.",
                        "mapTitle": "ROSEWOOD HOUSE AND GARDENS",
                        "image": "cambridge-6-test-3-rosewood-map.png",
                        "letters": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
                        "questions": [
                            {"id": "L14", "no": 14, "q": "Pear Alley", "answer": ans("H"), "explain": explain("H")},
                            {"id": "L15", "no": 15, "q": "Mulberry Garden", "answer": ans("F"), "explain": explain("F")},
                            {"id": "L16", "no": 16, "q": "Shop", "answer": ans("B"), "explain": explain("B")},
                            {"id": "L17", "no": 17, "q": "Tea Room", "answer": ans("D"), "explain": explain("D")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 18–20",
                        "instruction": "Complete the sentences below. Write ONE WORD ONLY for each answer.",
                        "noteTitle": "RIVER WALK",
                        "lines": [
                            {"plain": True, "html": "18 You can walk through the <Q n=\"18\"> that goes along the river bank."},
                            {"plain": True, "html": "19 You can go over the <Q n=\"19\"> and then into a wooded area."},
                            {"plain": True, "html": "20 On your way back, you could also go up to the <Q n=\"20\">"},
                        ],
                        "questions": [
                            {"id": "L18", "no": 18, "answer": ans("field"), "explain": explain("field")},
                            {"id": "L19", "no": 19, "answer": ans("footbridge"), "explain": explain("footbridge")},
                            {"id": "L20", "no": 20, "answer": ans("viewpoint"), "explain": explain("viewpoint")},
                        ],
                    },
                ],
            },
            {
                "id": 3,
                "audio": "ielts6_test3_audio3.mp3",
                "groups": [
                    {
                        "kind": "note",
                        "title": "Questions 21–24",
                        "instruction": "Complete the sentences below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
                        "noteTitle": "MARKETING ASSIGNMENT",
                        "lines": [
                            {"plain": True, "html": "21 For their assignment, the students must investigate one part of the <Q n=\"21\">"},
                            {"plain": True, "html": "22 The method the students must use to collect data is <Q n=\"22\">"},
                            {"plain": True, "html": "23 In total, the students must interview <Q n=\"23\"> people."},
                            {"plain": True, "html": "24 Jack thinks the music preferences of <Q n=\"24\"> listeners are similar."},
                        ],
                        "questions": [
                            {"id": "L21", "no": 21, "answer": ans("entertainment industry", "the entertainment industry"), "explain": explain("entertainment industry", "the entertainment industry")},
                            {"id": "L22", "no": 22, "answer": ans("telephone interviews"), "explain": explain("telephone interviews")},
                            {"id": "L23", "no": 23, "answer": ans("30", "thirty"), "explain": explain("30", "thirty")},
                            {"id": "L24", "no": 24, "answer": ans("male and female"), "explain": explain("male and female")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 25–30",
                        "instruction": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                        "noteTitle": "Marketing Survey: Music Preferences",
                        "lines": [
                            {"plain": True, "html": "Age group of interviewee: 25 or under"},
                            {"plain": True, "html": "Music preferences: Pop, <Q n=\"25\">, Folk, Easy listening"},
                            {"plain": True, "html": "Age group of interviewee: 45 or over"},
                            {"plain": True, "html": "Music preferences: <Q n=\"26\">"},
                            {"plain": True, "html": "Medium for listening to music: Radio, CD, TV, <Q n=\"27\">"},
                            {"plain": True, "html": "Source of music: Music shops, <Q n=\"28\">, Internet"},
                            {"plain": True, "html": "Places for listening to music: Disco, Pub, <Q n=\"29\">, Concert hall, <Q n=\"30\">"},
                        ],
                        "questions": [
                            {"id": "L25", "no": 25, "answer": ans("jazz"), "explain": explain("jazz")},
                            {"id": "L26", "no": 26, "answer": ans("classical"), "explain": explain("classical")},
                            {"id": "L27", "no": 27, "answer": ans("concerts"), "explain": explain("concerts")},
                            {"id": "L28", "no": 28, "answer": ans("department stores"), "explain": explain("department stores")},
                            {"id": "L29", "no": 29, "answer": ans("club"), "explain": explain("club")},
                            {"id": "L30", "no": 30, "answer": ans("opera house"), "explain": explain("opera house")},
                        ],
                    },
                ],
            },
            {
                "id": 4,
                "audio": "ielts6_test3_audio4.mp3",
                "groups": [
                    {
                        "kind": "mcq",
                        "title": "Questions 31–34",
                        "instruction": "Choose the correct letter, A, B or C.",
                        "questions": [
                            {"id": "L31", "no": 31, "q": "According to the speaker, it is not clear", "options": {"A": "when the first settlers arrived in Ireland.", "B": "why people began to farm in Ireland.", "C": "where the early Irish farmers came from."}, "answer": ans("C"), "explain": explain("C")},
                            {"id": "L32", "no": 32, "q": "What point does the speaker make about breeding animals in Neolithic Ireland?", "options": {"A": "Their numbers must have been above a certain level.", "B": "They were under threat from wild animals.", "C": "Some species died out during this period."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L33", "no": 33, "q": "What does the speaker say about the transportation of animals?", "options": {"A": "Livestock would have limited the distance the farmers could sail.", "B": "Neolithic boats were too primitive to have been used.", "C": "Probably only a few breeding animals were imported."}, "answer": ans("A"), "explain": explain("A")},
                            {"id": "L34", "no": 34, "q": "What is the main evidence for cereal crops in Neolithic Ireland?", "options": {"A": "the remains of burnt grain in pots", "B": "the marks left on pots by grains", "C": "the patterns painted on the surface of pots"}, "answer": ans("B"), "explain": explain("B")},
                        ],
                    },
                    {
                        "kind": "note",
                        "title": "Questions 35–40",
                        "instruction": "Complete the notes below. Write ONE WORD ONLY for each answer.",
                        "noteTitle": "Neolithic Ireland",
                        "lines": [
                            {"plain": True, "html": "Ploughs could either have been pulled by <Q n=\"35\"> or by cattle."},
                            {"plain": True, "html": "The farmers needed homes which were permanent dwellings."},
                            {"plain": True, "html": "In the final stages of axe-making, <Q n=\"36\"> and <Q n=\"37\"> were necessary for grinding and polishing."},
                            {"plain": True, "html": "Irish axes were exported from Ireland to <Q n=\"38\"> and England."},
                            {"plain": True, "html": "The colonisers used clay to make pots."},
                            {"plain": True, "html": "The <Q n=\"39\"> of the pots was often polished to make them watertight."},
                            {"plain": True, "html": "Clay from local areas was generally used."},
                            {"plain": True, "html": "Decoration was only put around the <Q n=\"40\"> of the earliest pots."},
                        ],
                        "questions": [
                            {"id": "L35", "no": 35, "answer": ans("people"), "explain": explain("people")},
                            {"id": "L36", "no": 36, "answer": ans("water", "sand"), "explain": "答案：water 与 sand，顺序不限。"},
                            {"id": "L37", "no": 37, "answer": ans("sand", "water"), "explain": "答案：water 与 sand，顺序不限。"},
                            {"id": "L38", "no": 38, "answer": ans("Scotland"), "explain": explain("Scotland")},
                            {"id": "L39", "no": 39, "answer": ans("outside"), "explain": explain("outside")},
                            {"id": "L40", "no": 40, "answer": ans("tops"), "explain": explain("tops")},
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
            "title": "Questions 1–5",
            "instruction": "Reading Passage 1 has ten paragraphs, A–J. Which paragraph contains the following information?",
            "boxTitle": "Paragraphs",
            "box": {chr(65 + i): f"Paragraph {chr(65 + i)}" for i in range(10)},
            "questions": [
                {"id": "Q1", "no": 1, "q": "the location of the first cinema", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q2", "no": 2, "q": "how cinema came to focus on stories", "answer": ans("I"), "explain": explain("I")},
                {"id": "Q3", "no": 3, "q": "the speed with which cinema has changed", "answer": ans("J"), "explain": explain("J")},
                {"id": "Q4", "no": 4, "q": "how cinema teaches us about other cultures", "answer": ans("E"), "explain": explain("E")},
                {"id": "Q5", "no": 5, "q": "the attraction of actors in films", "answer": ans("G"), "explain": explain("G")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 6–9",
            "instruction": "Do the following statements agree with the views of the writer in Reading Passage 1?",
            "variant": "yn",
            "options": ["YES", "NO", "NOT GIVEN"],
            "questions": [
                {"id": "Q6", "no": 6, "q": "It is important to understand how the first audiences reacted to the cinema.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q7", "no": 7, "q": "The Lumière Brothers' film about the train was one of the greatest films ever made.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q8", "no": 8, "q": "Cinema presents a biased view of other countries.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q9", "no": 9, "q": "Storylines were important in very early cinema.", "answer": ans("NO"), "explain": explain("NO")},
            ],
        },
        {
            "kind": "mcq",
            "title": "Questions 10–13",
            "instruction": "Choose the correct letter, A, B, C or D.",
            "questions": [
                {"id": "Q10", "no": 10, "q": "The writer refers to the film of the train in order to demonstrate", "options": {"A": "the simplicity of early films.", "B": "the impact of early films.", "C": "how short early films were.", "D": "how imaginative early films were."}, "answer": ans("B"), "explain": explain("B")},
                {"id": "Q11", "no": 11, "q": "In Tarkovsky's opinion, the attraction of the cinema is that it", "options": {"A": "aims to impress its audience.", "B": "tells stories better than books.", "C": "illustrates the passing of time.", "D": "describes familiar events."}, "answer": ans("C"), "explain": explain("C")},
                {"id": "Q12", "no": 12, "q": "When cinema first began, people thought that", "options": {"A": "it would always tell stories.", "B": "it should be used in fairgrounds.", "C": "its audiences were unappreciative.", "D": "its future was uncertain."}, "answer": ans("D"), "explain": explain("D")},
                {"id": "Q13", "no": 13, "q": "What is the best title for this passage?", "options": {"A": "The rise of the cinema star", "B": "Cinema and novels compared", "C": "The domination of Hollywood", "D": "The power of the big screen"}, "answer": ans("D"), "explain": explain("D")},
            ],
        },
    ]
    passages[1]["groups"] = [
        {
            "kind": "match",
            "title": "Questions 14–18",
            "instruction": "Reading Passage 2 contains six Key Points. Choose the correct heading for Key Points TWO to SIX. Example: Key Point One = viii.",
            "boxTitle": "List of Headings",
            "box": {
                "i": "Ensure the reward system is fair",
                "ii": "Match rewards to individuals",
                "iii": "Ensure targets are realistic",
                "iv": "Link rewards to achievement",
                "v": "Encourage managers to take more responsibility",
                "vi": "Recognise changes in employees' performance over time",
                "vii": "Establish targets and give feedback",
                "viii": "Ensure employees are suited to their jobs",
            },
            "questions": [
                {"id": "Q14", "no": 14, "q": "Key Point Two", "answer": ans("vii"), "explain": explain("vii")},
                {"id": "Q15", "no": 15, "q": "Key Point Three", "answer": ans("iii"), "explain": explain("iii")},
                {"id": "Q16", "no": 16, "q": "Key Point Four", "answer": ans("ii"), "explain": explain("ii")},
                {"id": "Q17", "no": 17, "q": "Key Point Five", "answer": ans("iv"), "explain": explain("iv")},
                {"id": "Q18", "no": 18, "q": "Key Point Six", "answer": ans("i"), "explain": explain("i")},
            ],
        },
        {
            "kind": "tfng",
            "title": "Questions 19–24",
            "instruction": "Do the following statements agree with the views of the writer in Reading Passage 2?",
            "variant": "yn",
            "options": ["YES", "NO", "NOT GIVEN"],
            "questions": [
                {"id": "Q19", "no": 19, "q": "A shrinking organisation tends to lose its less skilled employees rather than its more skilled employees.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q20", "no": 20, "q": "It is easier to manage a small business than a large business.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q21", "no": 21, "q": "High achievers are well suited to team work.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q22", "no": 22, "q": "Some employees can feel manipulated when asked to participate in goal-setting.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q23", "no": 23, "q": "The staff appraisal process should be designed by employees.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q24", "no": 24, "q": "Employees' earnings should be disclosed to everyone within the organisation.", "answer": ans("YES"), "explain": explain("YES")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 25–27",
            "instruction": "Look at the following groups of workers and the list of descriptions below. Match each group with the correct description.",
            "boxTitle": "List of Descriptions",
            "box": {
                "A": "They judge promotion to be important.",
                "B": "They have less need of external goals.",
                "C": "They think that the quality of their work is important.",
                "D": "They resist goals which are imposed.",
                "E": "They have limited job options.",
            },
            "subTitle": "Groups of workers",
            "questions": [
                {"id": "Q25", "no": 25, "q": "high achievers", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q26", "no": 26, "q": "clerical workers", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q27", "no": 27, "q": "production workers", "answer": ans("A"), "explain": explain("A")},
            ],
        },
    ]
    passages[2]["groups"] = [
        {
            "kind": "tfng",
            "title": "Questions 28–32",
            "instruction": "Do the following statements agree with the claims of the writer in Reading Passage 3?",
            "variant": "yn",
            "options": ["YES", "NO", "NOT GIVEN"],
            "questions": [
                {"id": "Q28", "no": 28, "q": "Studies show drugs available today can delay the process of growing old.", "answer": ans("NO"), "explain": explain("NO")},
                {"id": "Q29", "no": 29, "q": "There is scientific evidence that eating fewer calories may extend human life.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q30", "no": 30, "q": "Not many people are likely to find a caloric-restricted diet attractive.", "answer": ans("YES"), "explain": explain("YES")},
                {"id": "Q31", "no": 31, "q": "Diet-related diseases are common in older people.", "answer": ans("NOT GIVEN"), "explain": explain("NOT GIVEN")},
                {"id": "Q32", "no": 32, "q": "In experiments, rats who ate what they wanted led shorter lives than rats on a low-calorie diet.", "answer": ans("YES"), "explain": explain("YES")},
            ],
        },
        {
            "kind": "match",
            "title": "Questions 33–37",
            "instruction": "Classify the following descriptions as relating to A caloric-restricted monkeys, B control monkeys, or C neither.",
            "boxTitle": "Categories",
            "box": {
                "A": "caloric-restricted monkeys",
                "B": "control monkeys",
                "C": "neither caloric-restricted monkeys nor control monkeys",
            },
            "questions": [
                {"id": "Q33", "no": 33, "q": "Monkeys were less likely to become diabetic.", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q34", "no": 34, "q": "Monkeys experienced more chronic disease.", "answer": ans("B"), "explain": explain("B")},
                {"id": "Q35", "no": 35, "q": "Monkeys have been shown to experience a longer than average life span.", "answer": ans("C"), "explain": explain("C")},
                {"id": "Q36", "no": 36, "q": "Monkeys enjoyed a reduced chance of heart disease.", "answer": ans("A"), "explain": explain("A")},
                {"id": "Q37", "no": 37, "q": "Monkeys produced greater quantities of insulin.", "answer": ans("B"), "explain": explain("B")},
            ],
        },
        {
            "kind": "note",
            "title": "Questions 38–40",
            "instruction": "Complete the flow-chart below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            "noteTitle": "How a caloric-restriction mimetic works",
            "lines": [
                {"plain": True, "html": "Cells use <Q n=\"38\"> from food to generate ATP."},
                {"plain": True, "html": "Caloric restriction / 2DG reduces ATP production."},
                {"plain": True, "html": "Reduced ATP machinery limits production of <Q n=\"39\">"},
                {"plain": True, "html": "Cells may shift into a mode that emphasises <Q n=\"40\"> of the organism."},
            ],
            "questions": [
                {"id": "Q38", "no": 38, "answer": ans("glucose"), "explain": explain("glucose")},
                {"id": "Q39", "no": 39, "answer": ans("free radicals"), "explain": explain("free radicals")},
                {"id": "Q40", "no": 40, "answer": ans("preservation"), "explain": explain("preservation")},
            ],
        },
    ]
    return {"meta": {"volume": 6, "testNo": 3}, "durationMin": 60, "passages": passages}


def writing_test() -> dict:
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                "The diagrams below show the life cycle of the silkworm and the stages "
                "in the production of silk cloth.<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br>"
                "<strong>Write at least 150 words.</strong>"
            ),
            "charts": [
                {
                    "caption": "Silkworm life cycle and silk cloth production",
                    "image": "cambridge-6-test-3-silkworm.png",
                }
            ],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "<strong>Topic:</strong> Some people believe that visitors to other countries "
                "should follow local customs and behaviour. Others disagree and think that the "
                "host country should welcome cultural differences.<br><br>"
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
        dst = LISTENING_DIR / f"ielts6_test3_audio{i}.mp3"
        shutil.copy2(src, dst)
        print(f"copied audio -> {dst.relative_to(ROOT)}")
    dst = LISTENING_DIR / "cambridge-6-test-3-rosewood-map.png"
    shutil.copy2(ROSEWOOD_SRC, dst)
    print(f"copied image -> {dst.relative_to(ROOT)}")
    chart_dst = WRITING_DIR / "cambridge-6-test-3-silkworm.png"
    shutil.copy2(SILKWORM_SRC, chart_dst)
    print(f"copied image -> {chart_dst.relative_to(ROOT)}")


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
