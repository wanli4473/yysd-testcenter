#!/usr/bin/env python3
"""Build 7.08 Enhanced TOEFL. Run: python3 scripts/build_toefl_708.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月/7.8-问题已经修复/audio/item_level"
AUDIO = "library/toefl/audio/2025-07-08/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-07-08"
SET = "7.08"
TITLE = "新托福 7.08"


def dump(name, obj):
    path = os.path.join(ROOT, "library/toefl", name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", name, "tasks", len(obj.get("tasks", [])))


def blank(n, prefix, word):
    if prefix and not word.startswith(prefix) and not word.lower().startswith(prefix.lower()):
        raise SystemExit("prefix %r not in %r" % (prefix, word))
    return {"id": n, "prefix": prefix, "answer": word[len(prefix):], "word": word}


def cw(title, module, start, parts):
    passage, n = [], start
    for p in parts:
        if isinstance(p, str):
            passage.append({"t": p})
        else:
            passage.append(blank(n, p[0], p[1]))
            n += 1
    return {
        "type": "complete_words",
        "module": module,
        "title": title,
        "instruction": "Fill in the missing letters in the paragraph.",
        "passage": passage,
    }, n


def q(qid, stem, options, answer, **extra):
    item = {"id": qid, "stem": stem, "options": options, "answer": answer}
    item.update(extra)
    return item


def insert_q(qid, sentence, answer):
    return q(
        qid,
        "There are four locations [A]–[D] in the passage. Where would the following sentence best fit?\n\n"
        + sentence + "\n\nSelect the best location in the passage.",
        {"A": "[A]", "B": "[B]", "C": "[C]", "D": "[D]"},
        answer,
        kind="insert",
        insert=True,
    )


def daily(title, module, instruction, layout, questions):
    return {
        "type": "daily_life",
        "module": module,
        "instruction": instruction,
        "title": title,
        "layout": layout,
        "questions": questions,
    }


def academic(title, module, paras, questions):
    return {
        "type": "academic",
        "module": module,
        "instruction": "Read an academic passage.",
        "title": title,
        "paras": paras,
        "questions": questions,
    }


def cr(module, qid, fname, options, answer):
    return {
        "type": "choose_response",
        "module": module,
        "title": "Choose a Response %s" % qid,
        "instruction": "Choose the best response.",
        "audio": AUDIO + fname,
        "questions": [q(qid, "Choose the best response.", options, answer)],
    }


def clip(typ, title, module, instruction, fname, questions):
    return {
        "type": typ,
        "module": module,
        "title": title,
        "instruction": instruction,
        "audio": AUDIO + fname,
        "questions": questions,
    }


def sent(sid, context, lead, bank, answer, tail="."):
    parts = [{"t": lead}] if lead else []
    parts += [{"slot": True} for _ in answer]
    if tail:
        parts.append({"t": tail})
    return {
        "type": "sentence", "module": 1, "id": sid,
        "context": context, "parts": parts, "bank": bank, "answer": answer,
    }


def paper(skill, zh, modules, tasks):
    return {
        "id": ID,
        "title": TITLE + " · " + zh,
        "set": SET,
        "skill": skill,
        "modules": modules,
        "tasks": tasks,
    }


def build_reading():
    t1, n = cw("Geography", 1, 1, [
        "Modern geographers employ advanced technologies, including geographic information systems (GIS), to analyze spatial data, enabling them to visualize patterns of urban development, resource allocation, and environmental change. This ",
        ("analy", "analytical"),
        " approach ",
        ("all", "allows"),
        " geographers ",
        ("t", "to"),
        " provide ",
        ("insi", "insights"),
        " into ",
        ("pres", "pressing"),
        " global ",
        ("iss", "issues"),
        " such ",
        ("a", "as"),
        " climate ",
        ("cha", "change"),
        ", migration, ",
        ("a", "and"),
        " sustainable ",
        ("devel", "development"),
        ", offering frameworks for informed decision-making and policy implementation. Understanding the geographic dimensions of these challenges is crucial for fostering resilience and adaptability in a rapidly changing world.",
    ])
    t2, n = cw("Medieval European History", 1, n, [
        "Medieval European history encompasses the time period from the fall of the Roman Empire to the onset of the Renaissance. This era lasted around 900 years and is also called the Middle Ages. ",
        ("Duri", "during"),
        " these ",
        ("cent", "centuries"),
        ", feudalism ",
        ("w", "was"),
        " the ",
        ("domi", "dominant"),
        " social ",
        ("stru", "structure"),
        ", shaping ",
        ("t", "the"),
        " political, ",
        ("econ", "economic"),
        ", and ",
        ("cult", "cultural"),
        " landscape. ",
        ("Da", "daily"),
        " life ",
        ("a", "and"),
        " governance were strongly influenced by the Catholic Church. Studying medieval history reveals the foundations of modern European society and the profound changes that occurred over time. It also helps students understand how people lived, worked, and believed during this important time in history.",
    ])
    if n != 21:
        raise SystemExit("m1 cw expected next 21, got %s" % n)
    t3, n = cw("Public Health", 2, 36, [
        "Public health is a field that looks at the overall well-being of communities, focusing on how society and individual health are connected. Over ",
        ("ti", "time"),
        ", public health ",
        ("prog", "programs"),
        " have ",
        ("gr", "grown"),
        " from ",
        ("ba", "basic"),
        " efforts ",
        ("li", "like"),
        " improving ",
        ("sanit", "sanitation"),
        " to ",
        ("inc", "include"),
        " many ",
        ("strat", "strategies"),
        " that ",
        ("de", "deal"),
        " with ",
        ("soc", "social"),
        " factors affecting health. This history shows the ongoing challenge of deciding how to use limited resources while facing more and more health problems, such as new diseases and long-term conditions linked to lifestyle. As leaders work to solve these issues, they are realizing the importance of teamwork across different fields.",
    ])
    if n != 46:
        raise SystemExit("m2 cw expected next 46, got %s" % n)
    return paper("reading", "阅读", [
        {"n": 1, "timeSec": 1260, "from": 1, "to": 35},
        {"n": 2, "timeSec": 540, "from": 36, "to": 50},
    ], [
        t1, t2,
        daily("Café Bonjour", 1, "Read a review.", {
            "kind": "card",
            "kicker": "4/5 stars",
            "title": "Café Bonjour",
            "body": (
                "I recently visited Café Bonjour near the college campus. The atmosphere is inviting, "
                "with vibrant colors and plush seating.\n\n"
                "I ordered the signature French toast, made from fresh brioche. The food was served "
                "promptly by friendly staff and tasted great.\n\n"
                "This popular café can be quite loud on weekends."
            ),
        }, [
            q(21, "The review mentions all of the following about Cafe Bonjour EXCEPT", {
                "A": "Its appearance",
                "B": "Its service",
                "C": "Its prices",
                "D": "Its food",
            }, "C"),
            q(22, "Who would most likely want to avoid Cafe Bonjour on a Saturday afternoon?", {
                "A": "Friends who want a lively place to meet",
                "B": "A student who needs to concentrate on a book",
                "C": "Someone who wants to try French toast",
                "D": "A professor who lives near campus",
            }, "B"),
        ]),
        daily("Momentum Meet-up", 1, "Read an event notice.", {
            "kind": "card",
            "kicker": "Networking Mixer for Students",
            "title": "MOMENTUM MEET-UP",
            "body": (
                "Build real-world connections with peers, alumni, and local employers at our campus-wide mixer!\n\n"
                "Tuesday, April 14 · 5:00–7:00 P.M. · Student Center Ballroom\n\n"
                "The evening features fast-paced speed-networking rounds, a short alumni insights panel, and open "
                "mingling perfect for practicing introductions and discovering internships.\n\n"
                "Arrive at 4:45 P.M. for a quick networking primer led by Career Services. "
                "Be prepared to share five to ten copies of your résumé. Smart casual attire is encouraged. "
                "Light refreshments provided. Name tags and conversation starters will be provided at check-in.\n\n"
                "All majors and class years welcome, including graduate students. "
                "Come for the conversation; leave with contacts.\n"
                "RSVP by April 10 at www.momentummeetup.dreyer.edu"
            ),
        }, [
            q(23, "What is the main purpose of the Momentum Meet-up?", {
                "A": "To help students select a major",
                "B": "To schedule resume appointments",
                "C": "To help students build professional contacts",
                "D": "To recruit volunteers for campus events",
            }, "C"),
            q(24, "What should students bring to the event?", {
                "A": "Business cards",
                "B": "Multiple copies of their resume",
                "C": "Money for refreshments",
                "D": "A name tag and a list of discussion topics",
            }, "B"),
            q(25, "What are students advised to do before the mixer?", {
                "A": "Read the event guide",
                "B": "Review the frequently asked questions",
                "C": "Attend an orientation the day before",
                "D": "Arrive early for a short networking primer",
            }, "D"),
        ]),
        academic("Expert Systems", 1, [
            "Expert systems are a branch of artificial intelligence designed to mimic the decision-making abilities of human experts. These systems use a knowledge base of specialized information and rules to solve specific problems. Their goal is to replicate the expertise and reasoning of professionals in fields like medicine and engineering.",
            "An early expert system is MYCIN, developed in the 1970s to diagnose bacterial infections and recommend antibiotics. MYCIN used rules provided by medical experts to analyze patient data, infer diagnoses, and suggest treatments. MYCIN often performed as well as human specialists; however, MYCIN's system needed constant updates, requiring extensive input from medical professionals.",
            {"insert": "A", "t": "Despite their usefulness, traditional expert systems are labor-intensive to maintain."},
            {"insert": "B", "t": "Advancements in machine learning and natural language processing may allow future systems to learn from new information and update their knowledge bases."},
            {"insert": "C", "t": "By integrating these technologies, expert systems may become more adaptable and capable of operating independently."},
            {"insert": "D", "t": ""},
        ], [
            q(26, 'The word "mimic" in the passage is closest in meaning to', {
                "A": "replace",
                "B": "combine",
                "C": "imitate",
                "D": "challenge",
            }, "C"),
            q(27, "How did MYCIN make recommendations?", {
                "A": "By consulting a physician for every case",
                "B": "By applying expert rules to patient information",
                "C": "By comparing national infection rates",
                "D": "By collecting data without human input",
            }, "B"),
            q(28, "What limitation of traditional expert systems is mentioned?", {
                "A": "They require enormous storage capacity.",
                "B": "They regularly produce incorrect diagnoses.",
                "C": "They require frequent human updates.",
                "D": "Their databases change too quickly.",
            }, "C"),
            q(29, "What does the passage suggest about future expert systems?", {
                "A": "They will be limited to medicine.",
                "B": "They may learn and update themselves.",
                "C": "They will become less accurate.",
                "D": "They will be replaced by natural language processing.",
            }, "B"),
            insert_q(30, "Additionally, their performance may decline in unfamiliar or rapidly changing environments where new information is constantly emerging.", "B"),
        ]),
        academic("Feedback Systems and Their Unintended Effects", 1, [
            "In control engineering, feedback systems allow machines to monitor their output and adjust their input. This ability can improve accuracy and stability because the system continually compares its actual performance with a desired target.",
            "A thermostat is a simple example. It measures room temperature and turns heating or cooling equipment on or off. If the system is not precisely calibrated, however, it may overcorrect and create temperature fluctuations instead of maintaining a steady environment.",
            {"insert": "A", "t": "In more complex systems, feedback can create unexpected behavior when a correction is too strong or arrives too late."},
            {"insert": "B", "t": "For example, a drone may respond too aggressively to a small change in wind."},
            {"insert": "C", "t": "This phenomenon can produce erratic flight patterns rather than smooth stabilization."},
            {"insert": "D", "t": "Engineers reduce such risks by mitigating excessive responses through careful calibration, testing, and control limits."},
        ], [
            q(31, "What is one advantage of feedback systems?", {
                "A": "They can always be controlled remotely.",
                "B": "They can monitor and adjust their own performance.",
                "C": "They are simpler than systems without feedback.",
                "D": "They always remain stable.",
            }, "B"),
            q(32, "What may happen if a thermostat is not precisely calibrated?", {
                "A": "The temperature may fluctuate.",
                "B": "The temperature will stay below the target.",
                "C": "The thermostat will stop measuring temperature.",
                "D": "The heating equipment will break.",
            }, "A"),
            q(33, "What can happen when a drone overcorrects?", {
                "A": "It becomes dangerous to operate.",
                "B": "Its robotics become easier to control.",
                "C": "It may display chaotic or erratic behavior.",
                "D": "It compares too many sensor readings.",
            }, "C"),
            q(34, 'The word "mitigating" in the passage is closest in meaning to', {
                "A": "preventing",
                "B": "monitoring",
                "C": "reducing",
                "D": "analyzing",
            }, "C"),
            insert_q(35, "A sudden gust of wind, for instance, might trigger an exaggerated correction, making the drone veer sharply or wobble midair instead of stabilizing smoothly.", "C"),
        ]),
        t3,
        academic("The Domestication of Maize", 2, [
            "Maize, also known as corn, is one of the world's most important crops. Scholars studying its domestication have debated about how a wild grass with limited utility transformed into a globally significant staple. The dominant theory, supported by genetic and archaeological evidence, posits that maize was domesticated from wild teosinte (a species that, like modern maize, belongs to the Zea genus) in southwestern Mexico roughly 9,000 years ago. Proponents argue that early cultivators selectively bred plants exhibiting desirable traits—larger kernels, reduced seed casings, and more robust cobs—thereby accelerating the cultivated plants' divergence from teosinte. This model is reinforced by analyses demonstrating a close genetic relationship between modern maize and specific southwest Mexican teosinte populations.",
            "Alternative accounts have also been suggested. Some researchers propose a multiregional model, suggesting that while initial domestication occurred in Mexico, subsequent hybridization with other species of the Zea genus across Central America contributed to maize's eventual diversity. Another hypothesis highlights the possibility of protracted domestication, in which early foragers managed wild-growing teosinte long before fully domesticated maize emerged, blurring the boundary between cultivation and wild harvesting. Although consensus increasingly favors a single primary domestication event, ongoing discoveries continue to refine our understanding of one of the world's most transformative crops.",
        ], [
            q(46, 'Why does the author mention that wild teosinte had "limited utility"?', {
                "A": "To identify a shortcoming of modern maize",
                "B": "To explain why maize was not domesticated earlier",
                "C": "To show that wild teosinte had no nutritional importance",
                "D": "To emphasize how remarkable maize's transformation was",
            }, "D"),
            q(47, "What can be inferred about early teosinte?", {
                "A": "It grew more slowly than modern maize.",
                "B": "It had smaller kernels than modern maize.",
                "C": "It had thinner seed casings than modern maize.",
                "D": "It left no archaeological trace.",
            }, "B"),
            q(48, "How does the dominant theory differ from the multiregional model?", {
                "A": "It rejects selective breeding of desirable traits.",
                "B": "It proposes a much earlier date for domestication.",
                "C": "It emphasizes one primary ancestral population.",
                "D": "It places the first domestication in Central America.",
            }, "C"),
            q(49, 'The word "subsequent" in the passage is closest in meaning to', {
                "A": "rapid",
                "B": "later",
                "C": "steady",
                "D": "frequent",
            }, "B"),
            q(50, "What is suggested by the protracted-domestication hypothesis?", {
                "A": "Maize domestication was unlikely to succeed.",
                "B": "The dominant theory has been disproved.",
                "C": "Central American hybridization explains all maize diversity.",
                "D": "The boundary between wild harvesting and domestication may be gradual.",
            }, "D"),
        ]),
    ])


def build_listening():
    listen = "Listen to the recording."
    m1 = [
        cr(1, 1, "listening_m1_q01_choose_response.mp3", {
            "A": "I'm not sure when the meeting is.",
            "B": "I haven't read the syllabus.",
            "C": "I'm sure that won't be an issue.",
            "D": "I was assigned to a different team.",
        }, "C"),
        cr(1, 2, "listening_m1_q02_choose_response.mp3", {
            "A": "It started last Monday at noon.",
            "B": "It is about environmental science.",
            "C": "Yes, I saw the changes this morning.",
            "D": "It is on the east side of campus.",
        }, "C"),
        cr(1, 3, "listening_m1_q03_choose_response.mp3", {
            "A": "Let's go for a run.",
            "B": "Where can I buy one?",
            "C": "It complements your face.",
            "D": "I agree-we should trust our instincts.",
        }, "D"),
        cr(1, 4, "listening_m1_q04_choose_response.mp3", {
            "A": "I have an extra notebook.",
            "B": "The professor didn't mention it.",
            "C": "Sure, I'd be happy to share mine.",
            "D": "The lecture hall was full.",
        }, "C"),
        cr(1, 5, "listening_m1_q05_choose_response.mp3", {
            "A": "I registered yesterday.",
            "B": "It lasts about two hours.",
            "C": "It is in the auditorium.",
            "D": "Friday morning.",
        }, "D"),
        cr(1, 6, "listening_m1_q06_choose_response.mp3", {
            "A": "He didn't say anything.",
            "B": "I haven't written it yet.",
            "C": "The topic is too long.",
            "D": "I hope we can find a better one.",
        }, "D"),
        cr(1, 7, "listening_m1_q07_choose_response.mp3", {
            "A": "The interview went well.",
            "B": "A lot of people attended.",
            "C": "It's a presentation about urban planning.",
            "D": "I'd be happy to help.",
        }, "C"),
        cr(1, 8, "listening_m1_q08_choose_response.mp3", {
            "A": "How many hours are there?",
            "B": "Would you like me to come along?",
            "C": "We have the same professor.",
            "D": "You should email the professor.",
        }, "D"),
        cr(1, 9, "listening_m1_q09_choose_response.mp3", {
            "A": "Sure, let's take advantage of it.",
            "B": "I like my new job.",
            "C": "The crowd didn't like it.",
            "D": "The event wasn't crowded.",
        }, "A"),
        cr(1, 10, "listening_m1_q10_choose_response.mp3", {
            "A": "I study there every day.",
            "B": "That's the place to get everything.",
            "C": "The book is very popular.",
            "D": "There are several good online courses.",
        }, "D"),
        cr(1, 11, "listening_m1_q11_choose_response.mp3", {
            "A": "Sure, I'll make sure it's ready.",
            "B": "I double-checked the data.",
            "C": "I'll be free at the library.",
            "D": "That should be an easy fix.",
        }, "A"),
        cr(1, 12, "listening_m1_q12_choose_response.mp3", {
            "A": "Let's meet at the cafe.",
            "B": "I played there last week.",
            "C": "Yes, I'd love to work together.",
            "D": "You should ask someone else about it.",
        }, "C"),
        clip("conversation", "Computer Shutdown", 1, listen,
             "listening_m1_q13_q14_conversation_computer_shutdown.mp3", [
            q(13, "What problem does the man have?", {
                "A": "He has no idea how to organize his paper.",
                "B": "A repair shop gave him an expensive estimate.",
                "C": "He disagrees with his roommate.",
                "D": "His computer is not working.",
            }, "D"),
            q(14, "What is the man's attitude at the end of the conversation?", {
                "A": "Confused",
                "B": "Annoyed",
                "C": "Hopeful",
                "D": "Doubtful",
            }, "C"),
        ]),
        clip("conversation", "Film Club", 1, listen,
             "listening_m1_q15_q16_conversation_film_club.mp3", [
            q(15, "Why did the woman miss the film club meeting?", {
                "A": "She had to attend a film class.",
                "B": "She had to work an extra shift.",
                "C": "She forgot where the club met.",
                "D": "Her manager invited her to a house.",
            }, "B"),
            q(16, "What will the woman probably do next?", {
                "A": "Complete the online forms.",
                "B": "Contact the club president.",
                "C": "Ask for another work shift.",
                "D": "Watch a classic film.",
            }, "A"),
        ]),
        clip("conversation", "Vegetarian Diet", 1, listen,
             "listening_m1_q17_q18_conversation_vegetarian_diet.mp3", [
            q(17, "What is the man thinking about doing?", {
                "A": "Starting an exercise program",
                "B": "Changing his diet",
                "C": "Taking a cooking class",
                "D": "Growing vegetables",
            }, "B"),
            q(18, "Which foods does the woman recommend as sources of protein?", {
                "A": "Chicken and fish",
                "B": "Cheese and yogurt",
                "C": "Beans and nuts",
                "D": "Carrots and spinach",
            }, "C"),
        ]),
        clip("announcement", "Weekly Papers", 1, listen,
             "listening_m1_q19_q20_announcement_weekly_papers.mp3", [
            q(19, "What is the purpose of the announcement?", {
                "A": "To explain how to choose research topics",
                "B": "To remind students about weekly response papers",
                "C": "To organize student reading groups",
                "D": "To announce changes to the class portal",
            }, "B"),
            q(20, "What does the professor say about late papers?", {
                "A": "They will not be graded.",
                "B": "They lose one letter grade per day without an approved extension.",
                "C": "They are accepted only on Monday.",
                "D": "They must be uploaded to a different system.",
            }, "B"),
        ]),
        clip("announcement", "Student Union", 1, listen,
             "listening_m1_q21_q22_announcement_student_union.mp3", [
            q(21, "What is the main reason for the Student Union renovation?", {
                "A": "Damage caused by winter weather",
                "B": "A plan to repaint the entire campus",
                "C": "A need for more meeting rooms",
                "D": "Expansion of the cafeteria",
            }, "A"),
            q(22, "What does the speaker imply about the dining area in Emerson Hall?", {
                "A": "It will become permanent.",
                "B": "It is also being renovated.",
                "C": "It has limited seating.",
                "D": "It has the best view on campus.",
            }, "C"),
        ]),
        clip("announcement", "Service Awards", 1, listen,
             "listening_m1_q23_q24_announcement_service_awards.mp3", [
            q(23, "What is the main purpose of the announcement?", {
                "A": "To introduce a new auditorium",
                "B": "To provide details about an awards ceremony",
                "C": "To encourage students to begin community service",
                "D": "To describe a volunteer program",
            }, "B"),
            q(24, "What is said about public education?", {
                "A": "It is a new volunteer opportunity.",
                "B": "It determines the ceremony time.",
                "C": "It is represented by a new award category.",
                "D": "All students must attend its event.",
            }, "C"),
        ]),
        clip("lecture", "Hero's Journey", 1, listen,
             "listening_m1_q25_q28_lecture_heros_journey.mp3", [
            q(25, "What is the main topic of the talk?", {
                "A": "How mythology shaped cultural traditions",
                "B": "Joseph Campbell's influence on storytelling techniques",
                "C": "The structure and significance of the hero's journey",
                "D": "Criticism of modern storytelling practices",
            }, "C"),
            q(26, "What did Joseph Campbell conclude after studying myths across cultures?", {
                "A": "He invented the hero's journey.",
                "B": "Myths appeal mainly to young readers.",
                "C": "Most fiction follows identical events.",
                "D": "Many myths share a common narrative pattern.",
            }, "D"),
            q(27, "Why is the hero's return with a gift important?", {
                "A": "It shows the hero appreciates the mentor.",
                "B": "It makes the journey meaningful to the community.",
                "C": "It proves the mentor gave the hero a reward.",
                "D": "It motivates the hero to begin the journey.",
            }, "B"),
            q(28, "What is the speaker's opinion of the hero's-journey model?", {
                "A": "It is outdated and should be replaced.",
                "B": "It prevents cultural differences from being studied.",
                "C": "It remains influential because it reflects shared human experience.",
                "D": "It is more useful for film than literature.",
            }, "C"),
        ]),
        clip("lecture", "LED Lighting", 1, listen,
             "listening_m1_q29_q32_lecture_led_lighting.mp3", [
            q(29, "What is the main topic of the talk?", {
                "A": "The history of candles and oil lamps",
                "B": "The impact and future possibilities of LED lighting",
                "C": "The manufacture of semiconductors",
                "D": "The disadvantages of smart lighting",
            }, "B"),
            q(30, "What is a major benefit of LEDs?", {
                "A": "They produce more heat.",
                "B": "They are cheaper to manufacture than every other light.",
                "C": "They use less energy than incandescent bulbs.",
                "D": "They are always brighter than other lights.",
            }, "C"),
            q(31, "Why does the speaker mention the small size of LEDs?", {
                "A": "It limits LEDs to household use.",
                "B": "It makes LEDs less durable.",
                "C": "It allows flexible and varied applications.",
                "D": "It explains why LEDs are not popular.",
            }, "C"),
            q(32, "What is the speaker's attitude toward the future of LED technology?", {
                "A": "Doubtful",
                "B": "Concerned about cost",
                "C": "Confident that it will become affordable",
                "D": "Excited about new possibilities",
            }, "D"),
        ]),
    ]
    m2 = [
        cr(2, 33, "listening_m2_q01_choose_response.mp3", {
            "A": "They used to, but right now they don't.",
            "B": "I volunteer at the library.",
            "C": "I need more hours for tutoring.",
            "D": "You should check the seminar schedule.",
        }, "A"),
        cr(2, 34, "listening_m2_q02_choose_response.mp3", {
            "A": "Yes, I'll let everyone know.",
            "B": "Here it is.",
            "C": "My shift starts tomorrow.",
            "D": "I haven't begun the essay.",
        }, "A"),
        cr(2, 35, "listening_m2_q03_choose_response.mp3", {
            "A": "I can make time later this evening.",
            "B": "Include the first section of the chapter.",
            "C": "The session will be recorded.",
            "D": "I'll pay you back next week.",
        }, "A"),
        clip("conversation", "Psychology Course", 2, listen,
             "listening_m2_q04_q05_conversation_psychology_course.mp3", [
            q(36, "Why can the man not take Professor Berman's class next semester?", {
                "A": "The course is already full.",
                "B": "The class conflicts with another course.",
                "C": "Professor Berman will not be teaching any classes.",
                "D": "He has not completed a prerequisite.",
            }, "C"),
            q(37, "Why does the woman mention Professor Wilson?", {
                "A": "To help the man learn more about Professor Berman",
                "B": "To give her opinion of the psychology department",
                "C": "To identify the head of the department",
                "D": "To suggest an alternative instructor",
            }, "D"),
        ]),
        clip("conversation", "Sociology Major", 2, listen,
             "listening_m2_q06_q07_conversation_sociology_major.mp3", [
            q(38, "What does the woman imply when the man mentions Professor Wilson?", {
                "A": "The man is already used to a demanding course.",
                "B": "The man does not want a heavy reading load.",
                "C": "She is worried Professor Wilson will be unavailable.",
                "D": "She prefers Professor Wilson to Professor Ames.",
            }, "A"),
            q(39, "What does the man say about choosing sociology as his major?", {
                "A": "He has already officially declared it.",
                "B": "He is leaning toward it but has not decided.",
                "C": "He will decide before the semester begins.",
                "D": "He no longer thinks it is a good choice.",
            }, "B"),
        ]),
        clip("lecture", "Remote Controls", 2, listen,
             "listening_m2_q08_q11_lecture_remote_controls.mp3", [
            q(40, "What is the main topic of the talk?", {
                "A": "How remote controls were adapted for many purposes",
                "B": "The development of remote-control technology through the mid-twentieth century",
                "C": "Why remote controls became less expensive",
                "D": "Modern innovations in smart-device control",
            }, "B"),
            q(41, "What were some of the earliest remote controls used for?", {
                "A": "Unpiloted military vehicles",
                "B": "Nikola Tesla's laboratory equipment",
                "C": "Wireless television sets",
                "D": "Parking-lot gates",
            }, "A"),
            q(42, "What is the speaker's opinion of the Lazy Bones remote?", {
                "A": "It encouraged people to watch too much television.",
                "B": "It was too complicated to operate.",
                "C": "Its long wire made it inconvenient and hazardous.",
                "D": "It was too expensive for long-term use.",
            }, "C"),
            q(43, "Why does the speaker mention a light bulb?", {
                "A": "To show that household devices could respond to remotes",
                "B": "To explain the source of the Flashmatic's beam",
                "C": "To describe an improvement in remote-control design",
                "D": "To illustrate a disadvantage of the Flashmatic",
            }, "D"),
        ]),
        clip("lecture", "Tardigrades", 2, listen,
             "listening_m2_q12_q15_lecture_tardigrades.mp3", [
            q(44, "What is unique about tardigrades?", {
                "A": "They have unusually complex eyes.",
                "B": "They grow to many different sizes.",
                "C": "They can control their body temperature.",
                "D": "They can survive an exceptional range of extreme conditions.",
            }, "D"),
            q(45, "What happens during cryptobiosis?", {
                "A": "Tardigrades lose nearly all their water and metabolism stops.",
                "B": "Their body temperature rises rapidly.",
                "C": "They reproduce before conditions improve.",
                "D": "They travel through the vacuum of space.",
            }, "A"),
            q(46, "Why does the speaker mention radiation therapy?", {
                "A": "To explain how tardigrades were discovered in space",
                "B": "To compare the size of animal cells",
                "C": "To show that cryptobiosis benefits only animals",
                "D": "To identify a possible medical application of tardigrade research",
            }, "D"),
            q(47, "Why does the speaker discuss the 2007 space study?", {
                "A": "To demonstrate why astronomers are interested in tardigrades",
                "B": "To identify a problem in an earlier experiment",
                "C": "To explain how tardigrades adapt before launch",
                "D": "To describe the difficulty of exploring other planets",
            }, "A"),
        ]),
    ]
    return paper("listening", "听力", [
        {"n": 1, "timeSec": 1500, "from": 1, "to": 32},
        {"n": 2, "timeSec": 660, "from": 33, "to": 47},
    ], m1 + m2)


def build_writing():
    return paper("writing", "写作", [
        {"n": 1, "timeSec": 480, "from": 1, "to": 10, "label": "Sentence Construction"},
        {"n": 2, "timeSec": 420, "from": 11, "to": 11, "label": "Email"},
        {"n": 3, "timeSec": 600, "from": 12, "to": 12, "label": "Academic Discussion"},
    ], [
        sent(1, "Do you plan to participate in the school marathon next month?", "I have ",
             ["of", "the", "no intention", "in", "marathon", "running"],
             ["no intention", "of", "running", "in", "the", "marathon"]),
        sent(2, "Where should we go for lunch today after class?", "How about ",
             ["serve organic", "the cafe", "where they", "food"],
             ["the cafe", "where they", "serve organic", "food"], "?"),
        sent(3, "I'm excited about the school's book club meeting next week.", "",
             ["What is", "book", "the", "selection", "this", "for"],
             ["What is", "the", "book", "selection", "for", "this"], " month?"),
        {
            "type": "sentence", "module": 1, "id": 4,
            "context": "Why was the class rescheduled?",
            "parts": [{"slot": True}, {"t": " wanted "}, {"slot": True}, {"slot": True},
                      {"slot": True}, {"slot": True}, {"slot": True}, {"t": "."}],
            "bank": ["was postponed", "it", "to", "I also", "know", "why"],
            "answer": ["I also", "to", "know", "why", "it", "was postponed"],
        },
        sent(5, "I attended a webinar on digital marketing strategies yesterday.", "Can ",
             ["me whether", "social media", "trends", "you", "tell", "it covered"],
             ["you", "tell", "me whether", "it covered", "social media", "trends"], "?"),
        sent(6, "I start my new job as professor's assistant next Monday.", "Did ",
             ["sign", "contract", "the", "you"],
             ["you", "sign", "the", "contract"], "?"),
        {
            "type": "sentence", "module": 1, "id": 7,
            "context": "Where is the best place to study on campus?",
            "parts": [{"slot": True}, {"slot": True}, {"slot": True}, {"t": " 24 hours "},
                      {"slot": True}, {"t": "."}],
            "bank": ["is the most convenient", "is open", "The library", "that"],
            "answer": ["The library", "that", "is open", "is the most convenient"],
        },
        {
            "type": "sentence", "module": 1, "id": 8,
            "context": "Who did you ask to help with the event planning?",
            "parts": [{"slot": True}, {"slot": True}, {"slot": True}, {"slot": True},
                      {"slot": True}, {"t": " time "}, {"slot": True}, {"t": "."}],
            "bank": ["I was", "to see if", "planning", "Sam", "would have", "to assist"],
            "answer": ["I was", "planning", "to see if", "Sam", "would have", "to assist"],
        },
        sent(9, "Which laptop are you planning to buy?", "",
             ["processor will fit", "has", "that", "the one", "the fastest", "my needs"],
             ["the one", "that", "has", "the fastest", "processor will fit", "my needs"],
             " perfectly."),
        sent(10, "Where do you plan to buy your school uniform?", "",
             ["the required", "that", "is", "has", "downtown", "the boutique"],
             ["the boutique", "that", "is", "downtown", "has", "the required"],
             " clothing items."),
        {
            "type": "email", "module": 2, "id": 11,
            "instruction": "Write an email. In your email, do the following:",
            "prompt": (
                "You are a student who recently applied for a summer internship at a company. "
                "You have received an email from the personnel manager, Mr. Davis, asking you to "
                "provide additional documents and information to complete your application."
            ),
            "bullets": [
                "Thank him for considering your application.",
                "Explain what interests you most about the job for which you are applying.",
                "List the additional documents and information you are sending.",
            ],
            "to": "Mr. Davis", "subject": "Summer internship application - additional documents",
            "sampleSubject": "Summer internship application - additional documents",
            "sample": (
                "Dear Mr. Davis,\n\n"
                "Thank you for considering my application for the summer internship and for giving me "
                "the opportunity to complete the remaining materials. I am especially interested in this "
                "position because it would allow me to apply what I have learned in class to real projects "
                "while gaining experience from professionals. I am also eager to learn how the company "
                "organizes teamwork and communicates with clients.\n\n"
                "Attached are my updated resume, current academic transcript, and a brief writing sample. "
                "I have also included the contact information for two references and a copy of my student "
                "identification. My available internship dates are June 15 through August 20, and I can "
                "work Monday through Friday.\n\n"
                "Please let me know if you need another document or any additional information. I appreciate "
                "your time and look forward to hearing from you.\n\n"
                "Sincerely,\nA student applicant"
            ),
        },
        {
            "type": "discussion", "module": 3, "id": 12,
            "instruction": (
                "Your professor is teaching a class. Write a post responding to the professor's question.\n"
                "In your response, you should do the following:\n"
                "• Express and support your personal opinion.\n"
                "• Make a contribution to the discussion in your own words.\n"
                "An effective response will contain at least 100 words."
            ),
            "class": "Environmental Science",
            "professor": {
                "name": "Dr. Gupta", "photo": PHOTO + "diaz.png",
                "text": (
                    "We're studying the benefits of different approaches to protecting wildlife and natural "
                    "environments. Some experts argue that creating parks and wildlife reserves where no human "
                    "development is allowed is the most effective way to protect animals and ecosystems. Others "
                    "believe that teaching farmers to reduce pesticide use and preserve soil quality is more "
                    "important because agriculture affects much larger land areas where both wildlife and food "
                    "production must coexist. Which approach do you think produces better environmental protection and why?"
                ),
            },
            "posts": [
                {"name": "Claire", "photo": PHOTO + "kelly.png",
                 "text": (
                     "Parks and wildlife preserves offer better environmental protection results because endangered "
                     "species can reproduce there without human interference. When large areas of forests, wetlands, "
                     "and grasslands remain completely undeveloped, they maintain natural water cycles, prevent soil "
                     "erosion, and preserve complex food webs that support hundreds of different plant and animal "
                     "species that cannot survive in agricultural or urban environments."
                 )},
                {"name": "Paul", "photo": PHOTO + "andrew.png",
                 "text": (
                     "Ecologically-friendly agriculture is better for the environment because farmland covers much "
                     "larger areas than parks and wildlife preserves. When farmers reduce harmful pesticides and plant "
                     "trees along field borders, they create wildlife habitats and cleaner water systems. These farming "
                     "practices also allow continued food production while protecting the environment, which is more "
                     "realistic than converting all land to wilderness areas."
                 )},
            ],
            "samples": [
                {"title": "Protected Reserves",
                 "text": (
                     "I agree with Claire that protected parks and wildlife reserves generally provide stronger "
                     "environmental protection. A reserve gives an ecosystem enough uninterrupted space for species "
                     "to reproduce, migrate, and interact naturally. For example, when a wetland is protected from "
                     "construction, it can continue filtering water, storing floodwater, and supporting birds, fish, "
                     "and insects at the same time. These connected benefits are difficult to preserve on land whose "
                     "main purpose is agricultural production. Paul is right that environmentally friendly farming can "
                     "improve a much larger area. However, farms still require regular planting, harvesting, roads, "
                     "and machinery, so some sensitive species cannot survive there even when pesticide use is reduced. "
                     "Agriculture should certainly become cleaner, but it works best as a buffer around truly protected "
                     "habitats. Therefore, governments should first secure large reserves and then encourage sustainable "
                     "farming nearby. This combination protects complete ecosystems while reducing damage across the "
                     "surrounding landscape."
                 )},
                {"title": "Sustainable Agriculture",
                 "text": (
                     "I agree with Paul that improving agricultural practices can produce broader environmental "
                     "protection. Farmland occupies enormous areas and directly affects soil, rivers, insects, and "
                     "nearby wildlife. If farmers reduce pesticides, rotate crops, preserve hedgerows, and plant "
                     "vegetation beside streams, they can protect many species while continuing to produce food. "
                     "A regional program that helps hundreds of farms adopt these methods may improve water quality "
                     "across an entire watershed, not only inside one reserve. Claire correctly notes that parks are "
                     "essential for species that need undisturbed habitat. Still, parks can become isolated islands "
                     "if the land around them is heavily polluted or degraded. Wildlife often moves beyond reserve "
                     "boundaries, and water flowing into a park may carry chemicals from distant fields. For that "
                     "reason, environmental policy should focus more resources on making working farmland safer. "
                     "Well-managed agriculture connects protected areas, reduces pollution at its source, and makes "
                     "conservation compatible with the food needs of local communities."
                 )},
            ],
        },
    ])


def build_speaking():
    instr_r = (
        "You are volunteering at a community cooking class near campus. "
        "The instructor is showing you how to guide beginners in baking a loaf of bread. "
        "Listen to the instructor and repeat what the instructor says. Repeat only once."
    )
    # ponytail: Speaking.docx prints no interview stems; reconstructed from official samples
    instr_i = (
        "You have agreed to participate in a research study about people's experiences with public parks. "
        "The researcher will ask you some questions. Listen to each question and answer in your own words."
    )
    repeats = [
        (1, 15, "Measure carefully before starting to mix."),
        (2, 15, "Add yeast to a small amount of warm water."),
        (3, 15, "Stir the wet and dry ingredients into a soft dough."),
        (4, 15, "Press and fold repeatedly until the texture feels elastic."),
        (5, 15, "Let the dough rest in a warm place until it doubles in size."),
        (6, 18, "After the loaf rises, bake until the top is browned and the center is firm."),
        (7, 18, "When the bread is done, place it on a raised stand so airflow beneath can cool it down."),
    ]
    interviews = [
        (8, "Describe a memorable visit to a public park. Give details to explain your answer.",
         "A memorable park visit happened last spring when I went to a riverside park with two classmates after our "
         "final exams. The weather was cool, and the path followed the water through a quiet wooded area. We rented "
         "bicycles, stopped at a small garden, and later sat on the grass to share lunch. What made the visit special "
         "was not any expensive activity. It was the feeling of having open space after several stressful weeks indoors. "
         "We could talk without rushing, exercise a little, and enjoy a view that was completely different from campus. "
         "I left feeling calmer and more energetic, so that visit showed me how valuable a well-designed public park can be."),
        (9, "Are public parks more important for adults or for children? Explain your answer.",
         "I think public parks are equally important for adults and children, although the benefits are different. "
         "Children need safe places to run, play games, and explore nature because those activities support physical and "
         "social development. Adults also need parks because many people work indoors and have few affordable places to "
         "exercise or relax. A parent, for example, can walk around a track while a child uses the playground, so one "
         "space supports the whole family. If I had to choose, I would say adults are slightly more likely to overlook "
         "their need for outdoor time. Parks give them an easy way to reduce stress, meet neighbors, and stay active "
         "without paying a membership fee."),
        (10, "Some people believe that local governments should invest more in public parks. Do you agree or disagree? Why?",
         "I agree that local governments should invest more in public parks because these spaces improve health in "
         "several practical ways. A park gives residents a free place to walk, exercise, or simply sit away from traffic "
         "and noise. This is especially important for people who cannot afford a gym or travel outside the city. Parks "
         "also encourage social contact. When neighbors see one another regularly, they are more likely to feel connected "
         "and look after the area. Of course, governments must still fund schools, transportation, and safety, so park "
         "spending should be planned responsibly. However, money used for trees, paths, lighting, and basic maintenance "
         "can prevent health problems and make daily life better for thousands of residents."),
        (11, "In cities with limited land, should housing be prioritized over creating additional parks? Why or why not?",
         "In cities with a serious shortage, I think housing is slightly more important than creating additional large "
         "parks because people need a stable place to live before they can enjoy other public amenities. High rents can "
         "force families far from work and school, and homelessness creates immediate health and safety problems. However, "
         "choosing housing should not mean eliminating every green space. City planners can build taller apartment buildings, "
         "include small courtyards, protect existing neighborhood parks, and add trees or rooftop gardens. This approach uses "
         "limited land efficiently while preserving some recreational space. Therefore, I would prioritize well-designed "
         "affordable housing, but I would require each new development to contribute to nearby public space rather than "
         "treating parks and housing as completely separate goals."),
    ]
    tasks = []
    for i, sec, sample in repeats:
        tasks.append({
            "type": "repeat", "module": 1, "id": i, "speakSec": sec,
            "instruction": instr_r,
            "audio": AUDIO + "speaking_listen_repeat_q%02d.mp3" % i,
            "sample": sample,
        })
    for i, stem, sample in interviews:
        tasks.append({
            "type": "interview", "module": 2, "id": i, "speakSec": 45,
            "instruction": instr_i, "stem": stem,
            "audio": AUDIO + "speaking_take_interview_q%02d.mp3" % (i - 7),
            "sample": sample,
        })
    return paper("speaking", "口语", [
        {"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"},
        {"n": 2, "timeSec": 360, "from": 8, "to": 11, "label": "Take an Interview"},
    ], tasks)


def copy_audio():
    dest = os.path.join(ROOT, "library/toefl/audio/2025-07-08")
    os.makedirs(dest, exist_ok=True)
    n = 0
    for name in os.listdir(SRC):
        if not name.endswith(".mp3"):
            continue
        src = os.path.join(SRC, name)
        dst = os.path.join(dest, name)
        shutil.copy2(src, dst)
        os.chmod(dst, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
        n += 1
    print("audio", n, "files")


if __name__ == "__main__":
    copy_audio()
    dump("2025-07-08-reading.json", build_reading())
    dump("2025-07-08-listening.json", build_listening())
    dump("2025-07-08-writing.json", build_writing())
    dump("2025-07-08-speaking.json", build_speaking())
