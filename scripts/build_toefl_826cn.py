#!/usr/bin/env python3
"""Build 8.26 China offline TOEFL (Enhanced shape). Run: python3 scripts/build_toefl_826cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/8 月/8.26-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-08-26/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-08-26"
SET = "8.26"
TITLE = "新托福 8.26 国内线下"


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
    t1, n = cw("Exoplanets", 1, 1, [
        "The study of exoplanets has rapidly advanced in recent years, redefining our understanding of the universe. Astronomers have identified thousands of planets beyond our solar system, some of which orbit close enough to their stars to support life. These ",
        ("find", "findings"),
        " challenge ",
        ("prev", "previous"),
        " notions ",
        ("ab", "about"),
        " planetary ",
        ("form", "formation"),
        " and ",
        ("t", "the"),
        " potential ",
        ("f", "for"),
        " life ",
        ("else", "elsewhere"),
        ". The ",
        ("dete", "detection"),
        " of ",
        ("atmos", "atmospheric"),
        " components ",
        ("li", "like"),
        " water vapor and methane in these distant worlds offers exciting clues about their suitability for hosting life.",
    ])
    t2, n = cw("3D Printing", 1, n, [
        "The advancement of 3D printing technology has revolutionized manufacturing by enabling precise, layer-by-layer fabrication of complex objects. 3D printing can use ",
        ("div", "diverse"),
        " materials ",
        ("su", "such"),
        " as ",
        ("plas", "plastics"),
        ", metals, ",
        ("a", "and"),
        " ceramics. ",
        ("Engi", "Engineers"),
        " are ",
        ("ab", "able"),
        " to ",
        ("fabr", "fabricate"),
        " lightweight, ",
        ("str", "strong"),
        " components ",
        ("wi", "with"),
        " internal ",
        ("struc", "structures"),
        " that are impossible to produce using traditional methods. In the medical field, 3D printing facilitates the production of patient-specific implants and prosthetics tailored to anatomical data from imaging scans. 3D printing enhances design flexibility and production efficiency by streamlining prototyping and reducing material waste.",
    ])
    if n != 21:
        raise SystemExit("m1 cw expected next 21, got %s" % n)
    t3, n = cw("Philosophy of Mind", 2, 36, [
        "In philosophy of mind, questions about consciousness and self-awareness focus on mental capacities like thoughts, beliefs, and desires that shape behavior. Thinkers such as Descartes and Locke examined the nature of inner experience and recognized the limits of understanding other minds. Over ",
        ("ti", "time"),
        ", this ",
        ("philos", "philosophical"),
        " idea ",
        ("w", "was"),
        " adopted ",
        ("b", "by"),
        " cognitive ",
        ("scien", "scientists"),
        " who ",
        ("be", "began"),
        " studying ",
        ("h", "how"),
        " we ",
        ("iden", "identify"),
        " and ",
        ("inte", "interpret"),
        " mental ",
        ("sta", "states"),
        " in ourselves and others. This shift enabled deeper insights into empathy, communication, and social understanding, offering a bridge between abstract thought and observable human behavior.",
    ])
    if n != 46:
        raise SystemExit("m2 cw expected next 46, got %s" % n)
    return paper("reading", "阅读", [
        {"n": 1, "timeSec": 1260, "from": 1, "to": 35},
        {"n": 2, "timeSec": 540, "from": 36, "to": 50},
    ], [
        t1, t2,
        daily("Gym membership renewal", 1, "Read an email.", {
            "kind": "card",
            "kicker": "Membership Services",
            "title": "Gym Membership Renewal",
            "subtitle": "To: Mr. Taylor  ·  Subject: Your membership has been renewed",
            "body": (
                "Dear Mr. Taylor,\n\n"
                "Your gym membership was renewed on March 3. Your new membership card will arrive within five business days. "
                "If it has not arrived, please wait two additional business days before contacting us.\n\n"
                "Download our mobile app to learn about weekly promotions.\n\n"
                "Sincerely,\nMembership Services"
            ),
        }, [
            q(21, "When should Mr. Taylor expect to receive his new membership card?", {
                "A": "Within two business days",
                "B": "Within three business days",
                "C": "Within five business days",
                "D": "Within seven business days",
            }, "C"),
            q(22, "How can Mr. Taylor learn about weekly promotions?", {
                "A": "By downloading the mobile app",
                "B": "By calling Membership Services",
                "C": "By waiting for a mailed notice",
                "D": "By visiting the gym in person",
            }, "A"),
        ]),
        daily("ENGL 101", 1, "Read a course description.", {
            "kind": "card",
            "kicker": "Course catalog",
            "title": "ENGL 101: Introduction to Literature",
            "body": (
                "Instructor: Dr. Maya Colton\n\n"
                "Course focus: Poetry, drama, and fiction\n\n"
                "Themes: Personal identity and cultural intersections\n\n"
                "Learning activities: Class discussions and written assignments\n\n"
                "Assignment formats: Both group and individual work"
            ),
        }, [
            q(23, "What will students do in this course?", {
                "A": "Study only one literary genre",
                "B": "Engage with literature from a variety of genres",
                "C": "Focus mainly on public speaking",
                "D": "Complete laboratory experiments",
            }, "B"),
            q(24, "What is indicated about the assignments?", {
                "A": "All assignments are completed individually.",
                "B": "Students complete both group and individual assignments.",
                "C": "There are no written assignments.",
                "D": "Assignments focus only on poetry.",
            }, "B"),
        ]),
        daily("North Avenue transportation notice", 1, "Read a transportation notice.", {
            "kind": "card",
            "title": "North Avenue Transportation Notice",
            "subtitle": "November 6  ·  7:00 A.M. to 7:00 P.M., Monday through Saturday",
            "body": (
                "Purpose: Infrastructure improvements. One traffic lane will remain open in each direction.\n\n"
                "Campus shuttles will operate every 15 minutes instead of every 20 minutes.\n"
                "Stops: East Hall, West Commons, and Central Library.\n\n"
                "Parking on North Avenue will be suspended. Use the Pemberton overflow lot.\n\n"
                "Expect temporary noise and dust. Visit the infrastructure website for updates."
            ),
        }, [
            q(25, "What is the main purpose of the notice?", {
                "A": "To announce a new bus route",
                "B": "To explain temporary transportation changes during road work",
                "C": "To promote a parking garage",
                "D": "To cancel all campus shuttles",
            }, "B"),
            q(26, "Where should drivers park while North Avenue parking is suspended?", {
                "A": "East Hall",
                "B": "West Commons",
                "C": "Central Library",
                "D": "The Pemberton overflow lot",
            }, "D"),
            q(27, "What change will be made to the shuttle schedule?", {
                "A": "Shuttles will arrive more frequently.",
                "B": "Shuttles will stop running on Saturdays.",
                "C": "Shuttles will use only one stop.",
                "D": "Shuttles will operate only in the evening.",
            }, "A"),
        ]),
        daily("Maplewood water notice", 1, "Read a notice.", {
            "kind": "card",
            "title": "Attention Residents!",
            "subtitle": "Water Service Interruption",
            "body": (
                "Due to maintenance on the main water line, water service will be interrupted on Monday, March 15, from 9:00 A.M. to 4:00 P.M.\n\n"
                "Before the interruption: Fill containers with water for drinking and cooking. Store enough water for personal hygiene.\n\n"
                "During the interruption: Do not use faucets, showers, or appliances that require water. Toilets may not function properly.\n\n"
                "After service resumes: Run cold water through all faucets for a few minutes. Check for leaks and report them immediately.\n\n"
                "Questions: Contact the Maplewood Maintenance Department at 555-4321."
            ),
        }, [
            q(28, "What is the notice primarily about?", {
                "A": "Providing safety tips during a storm",
                "B": "Announcing a disruption to water service",
                "C": "Installing a new appliance",
                "D": "Opening a community water park",
            }, "B"),
            q(29, "What should residents avoid doing during the interruption?", {
                "A": "Contacting the maintenance department",
                "B": "Storing water for drinking",
                "C": "Using faucets, showers, or water-dependent appliances",
                "D": "Checking the building schedule",
            }, "C"),
            q(30, "What should residents do after service resumes?", {
                "A": "Boil all water for a week",
                "B": "Run cold water and check for leaks",
                "C": "Replace every faucet",
                "D": "Contact the city immediately",
            }, "B"),
        ]),
        academic("Demographic Dynamics", 1, [
            "The demographic transition model illustrates how birth and death rates shift as societies move from agrarian to industrialized economies. In the earliest stage, both rates remain high, so population growth is slow because healthcare and sanitation are limited. As medical care and living conditions improve, death rates decline while birth rates remain high. The resulting rapid growth can strain resources and make it difficult for institutions to meet growing needs.",
            "Later, birth rates decline as education expands and cultural norms change. Having fewer children may offer families economic and personal advantages. Over time, however, persistently low birth rates can produce an aging population and workforce shortages.",
            {"insert": "A", "t": "The later stages therefore require societies to balance personal aspirations with long-term demographic needs."},
            {"insert": "B", "t": "Some researchers describe a fifth stage in which birth rates remain below replacement level and the population begins to contract."},
            {"insert": "C", "t": "This contraction can encourage economic innovation, but it can also strain social institutions and intergenerational support systems."},
            {"insert": "D", "t": "Understanding these demographic shifts helps governments and communities plan for housing, healthcare, employment, and retirement systems. The model does not predict every society perfectly, but it provides a useful framework for considering how population structures change over time."},
        ], [
            q(31, "What is the main purpose of the passage?", {
                "A": "To argue that all societies follow identical population patterns",
                "B": "To explain stages in the relationship between birth rates, death rates, and social development",
                "C": "To show that industrialization always reduces population",
                "D": "To compare healthcare systems in different countries",
            }, "B"),
            q(32, "According to the passage, what happens when death rates fall while birth rates remain high?", {
                "A": "Population growth stops.",
                "B": "Families immediately choose to have fewer children.",
                "C": "Population grows rapidly and may strain resources.",
                "D": "The workforce becomes older at once.",
            }, "C"),
            q(33, 'The word "aspirations" in the passage is closest in meaning to', {
                "A": "goals",
                "B": "restrictions",
                "C": "traditions",
                "D": "conflicts",
            }, "A"),
            q(34, "Which of the following is NOT mentioned about low birth rates?", {
                "A": "Sustained low birth rates can result in negative population growth.",
                "B": "Demographic changes caused by low birth rates can lead to societal tensions.",
                "C": "Persistently low birth rates typically lead to economic decline.",
                "D": "Understanding demographic changes helps societies plan for the future.",
            }, "C"),
            insert_q(35, "As societies navigate this demographic shift, proactive policies and innovations become essential to sustain economic growth and promote well-being among older adults.", "D"),
        ]),
        t3,
        academic("The Ascent of the Italian Lute Song", 2, [
            "The Italian lute song rose to prominence around 1500, when music printing and private performance expanded at the same time. Ottavio dei Petrucci's printed collections made music available to a broader public, while the lute's intimate sound suited domestic performance. These developments helped transform a courtly genre into a form practiced by skilled amateurs as well as professional musicians.",
            "Courtly patronage also played a decisive role. Alfonso d'Este and other noble sponsors commissioned virtuosos such as Francesco da Milano and Antonio Valente, whose published collections established a high artistic standard. Surviving manuscripts support both explanations: some contain personalized annotations that indicate home practice, while lavish presentation copies bear heraldic emblems associated with noble households.",
            "Stylistic borrowings from the Spanish vihuela and French lute idioms reveal a wider European dialogue that strengthened Italian composers' ambitions. The printing press democratized access to the repertoire, but the continuing interaction between domestic enthusiasm and aristocratic sponsorship ultimately propelled the Italian lute song to lasting prominence.",
        ], [
            q(46, "What is the main purpose of the passage?", {
                "A": "To compare the lute with modern instruments",
                "B": "To explain several factors behind the rise of the Italian lute song",
                "C": "To argue that printing harmed court music",
                "D": "To describe only the career of Petrucci",
            }, "B"),
            q(47, "What does the passage suggest about printed collections?", {
                "A": "They were used only by noble families.",
                "B": "They eliminated the need for private performance.",
                "C": "They focused mainly on Spanish music.",
                "D": "They helped make lute music available to a broader public.",
            }, "D"),
            q(48, 'The word "lavish" in the passage is closest in meaning to', {
                "A": "damaged",
                "B": "ordinary",
                "C": "elaborate",
                "D": "incomplete",
            }, "C"),
            q(49, "Which evidence most directly supports the importance of courtly patronage?", {
                "A": "Presentation copies display the emblems of noble households.",
                "B": "Some manuscripts contain private annotations.",
                "C": "The lute had an intimate sound.",
                "D": "Petrucci printed music around 1500.",
            }, "A"),
            q(50, "Which of the following is NOT mentioned as contributing to the Italian lute song's rise?", {
                "A": "Improvements in the physical construction of the lute",
                "B": "Music printing",
                "C": "Domestic enthusiasm",
                "D": "Aristocratic sponsorship",
            }, "A"),
        ]),
    ])


def build_listening():
    m1 = [
        cr(1, 1, "listening_m1_q01_choose_response.mp3", {
            "A": "No, the event wasn't as successful as they hoped it would be.",
            "B": "You should check the student union website.",
            "C": "The campus library just extended its hours.",
            "D": "I read a book about event planning.",
        }, "B"),
        cr(1, 2, "listening_m1_q02_choose_response.mp3", {
            "A": "Yes, the seminar was held on the fourth floor of Building A.",
            "B": "Oh, I won't be able to attend.",
            "C": "No, I forgot my math notebook.",
            "D": "Yes, they provided me with a lot of good information.",
        }, "D"),
        cr(1, 3, "listening_m1_q03_choose_response.mp3", {
            "A": "In the main auditorium.",
            "B": "I heard that there will be three presenters.",
            "C": "I'm running late.",
            "D": "Yes, all of the lectures were informative.",
        }, "A"),
        cr(1, 4, "listening_m1_q04_choose_response.mp3", {
            "A": "The auditorium was very crowded.",
            "B": "Yes, I'm planning to be there.",
            "C": "I'm parked a few blocks off campus.",
            "D": "Don't worry, he'll come around.",
        }, "B"),
        cr(1, 5, "listening_m1_q05_choose_response.mp3", {
            "A": "Sure, let's go for a swim at the recreation center.",
            "B": "No, campus doesn't have many covered parking spaces.",
            "C": "We should be able to buy the concert tickets.",
            "D": "I try to go every week.",
        }, "D"),
        cr(1, 6, "listening_m1_q06_choose_response.mp3", {
            "A": "It's about studying abroad.",
            "B": "A guest lecturer.",
            "C": "At 4 p.m.",
            "D": "It's for all students.",
        }, "B"),
        cr(1, 7, "listening_m1_q07_choose_response.mp3", {
            "A": "I study in the library.",
            "B": "My fiancée and I got engaged last night.",
            "C": "The auditorium is a little too small.",
            "D": "I use interactive activities.",
        }, "D"),
        cr(1, 8, "listening_m1_q08_choose_response.mp3", {
            "A": "I'm going to submit my art portfolio next week.",
            "B": "I think the gallery is open until six p.m.",
            "C": "What time do you plan to go?",
            "D": "Many believe it's difficult to earn a living as an artist.",
        }, "C"),
        cr(1, 9, "listening_m1_q09_choose_response.mp3", {
            "A": "Yes, I like the local teams.",
            "B": "Start at the top, and work your way down.",
            "C": "Let's plan to do that.",
            "D": "I've never thought of it like that.",
        }, "C"),
        cr(1, 10, "listening_m1_q10_choose_response.mp3", {
            "A": "I need to check the website.",
            "B": "Those students already graduated.",
            "C": "The playground is pretty small.",
            "D": "The teachers are amazing.",
        }, "A"),
        cr(1, 11, "listening_m1_q11_choose_response.mp3", {
            "A": "Go around the corner.",
            "B": "In about fifteen minutes.",
            "C": "I was very busy.",
            "D": "I signed my name.",
        }, "C"),
        cr(1, 12, "listening_m1_q12_choose_response.mp3", {
            "A": "Apply it to a brush first.",
            "B": "The meeting will begin soon.",
            "C": "Likely during class at some point.",
            "D": "I need more time to finish it.",
        }, "D"),
        clip("conversation", "Psychology class", 1, "Listen to a conversation.",
             "listening_m1_q13_q14_conversation_psychology_class.mp3", [
            q(13, "Why is the man unable to take a class with Professor Berman next semester?", {
                "A": "The man already has a full class schedule.",
                "B": "The man has not fulfilled the requirements for the class.",
                "C": "Professor Berman will not be teaching any classes.",
                "D": "Professor Berman has asked him to assist with her research.",
            }, "C"),
            q(14, "Why does the woman mention Dr. Wilson?", {
                "A": "To try to find out more about him",
                "B": "To express an opinion about him",
                "C": "To identify the head of the Psychology Department",
                "D": "To suggest an alternative to Professor Berman",
            }, "D"),
        ]),
        clip("conversation", "Guest lecture", 1, "Listen to a conversation.",
             "listening_m1_q15_q16_conversation_guest_lecture.mp3", [
            q(15, "Why is the woman unsure about attending a lecture?", {
                "A": "She will be busy working on a paper on urban sustainability.",
                "B": "She is not interested in the topic.",
                "C": "She is meeting Professor Gale at the time of the lecture.",
                "D": "She did not enjoy the last lecture in the series.",
            }, "D"),
            q(16, "How does the man persuade the woman to attend the lecture?", {
                "A": "He tells her the name of the guest lecturer.",
                "B": "He tells her that he is majoring in urban sustainability.",
                "C": "He offers to help her with her city-planning project.",
                "D": "He promises to save her a seat at the lecture.",
            }, "A"),
        ]),
        clip("conversation", "Health food store", 1, "Listen to a conversation.",
             "listening_m1_q17_q18_conversation_health_food_store.mp3", [
            q(17, "What opinion does the man express about a new store?", {
                "A": "He appreciates the friendly service.",
                "B": "He likes its variety.",
                "C": "He thinks it has a convenient location.",
                "D": "He is impressed by the displays.",
            }, "B"),
            q(18, "Why did the man not get anything from the bakery section?", {
                "A": "The items did not look fresh.",
                "B": "The prices were too high.",
                "C": "He was in a hurry.",
                "D": "He does not usually eat baked goods.",
            }, "C"),
        ]),
        clip("announcement", "Dormitory regulations", 1, "Listen to an announcement.",
             "listening_m1_q19_q20_announcement_dormitory_regulations.mp3", [
            q(19, "What is one purpose of some new regulations?", {
                "A": "To limit access to a dormitory",
                "B": "To encourage more social events",
                "C": "To provide more freedom when decorating dorm rooms",
                "D": "To allow for undisturbed study",
            }, "D"),
            q(20, "What are students encouraged to do at a meeting?", {
                "A": "Vote on new dormitory leaders",
                "B": "Provide feedback about a new policy",
                "C": "Help clean a space",
                "D": "Provide snacks",
            }, "B"),
        ]),
        clip("announcement", "Online platform", 1, "Listen to an announcement.",
             "listening_m1_q21_q22_announcement_online_platform.mp3", [
            q(21, "What is the speaker's opinion of the change he describes?", {
                "A": "He believes it will make things more convenient for students.",
                "B": "He thinks it will be exciting to take more field trips.",
                "C": "He is not sure that it will be successful.",
                "D": "He is frustrated by recent changes.",
            }, "A"),
            q(22, "What will students likely do by Friday?", {
                "A": "Submit an essay outline",
                "B": "Create a new account",
                "C": "Sign up for a group project",
                "D": "Complete a system survey",
            }, "B"),
        ]),
        clip("announcement", "Composting", 1, "Listen to an announcement.",
             "listening_m1_q23_q24_announcement_composting.mp3", [
            q(23, "What will Monday's event include?", {
                "A": "A discussion on preserving food",
                "B": "A demonstration of peeling fruit and grinding coffee",
                "C": "A tour of composting facilities",
                "D": "A practice session on identifying compostable items",
            }, "D"),
            q(24, "Why does the speaker mention the environmental film festival?", {
                "A": "To explain how students can learn more about composting",
                "B": "To show how composting has increased",
                "C": "To announce a prize that will be given out",
                "D": "To highlight other campus events",
            }, "C"),
        ]),
        clip("lecture", "Ice floats", 1, "Listen to the recording.",
             "listening_m1_q25_q28_lecture_ice_floats.mp3", [
            q(25, "What is the talk mainly about?", {
                "A": "The structure of some molecules",
                "B": "The causes and consequences of a natural phenomenon",
                "C": "A survival strategy of animals in winter",
                "D": "A common result of climate change",
            }, "B"),
            q(26, "What difference between water and most other substances does the speaker discuss?", {
                "A": "Scientists understand water molecules well.",
                "B": "Water requires much heat to change temperature.",
                "C": "Water expands when it changes from liquid to solid.",
                "D": "Liquid water reflects much sunlight.",
            }, "C"),
            q(27, "Why does the speaker mention aquatic life?", {
                "A": "To contrast lakes where ice forms and does not form",
                "B": "To explain the insulating effect of surface ice",
                "C": "To show a harmful effect of warmer water",
                "D": "To identify a scientific curiosity",
            }, "B"),
            q(28, "What difference between liquid water and ice does the speaker discuss at the end?", {
                "A": "Ice temperatures change more quickly.",
                "B": "Ice can absorb more energy.",
                "C": "Ice is easier to see from space.",
                "D": "Ice reflects more light.",
            }, "D"),
        ]),
        clip("lecture", "Dark stores", 1, "Listen to the recording.",
             "listening_m1_q29_q32_lecture_dark_stores.mp3", [
            q(29, "What aspect of dark stores does the speaker mainly discuss?", {
                "A": "Their influence on the retail market and society",
                "B": "Their architectural design",
                "C": "Their similarities to storefronts",
                "D": "Their role in warehouse history",
            }, "A"),
            q(30, "Why can dark stores offer lower prices?", {
                "A": "They sell large quantities.",
                "B": "They are not focused on profit.",
                "C": "They obtain less expensive products.",
                "D": "They have lower overhead expenses.",
            }, "D"),
            q(31, "Why does the speaker mention grocery delivery?", {
                "A": "To illustrate how dark stores compete with supermarkets",
                "B": "To compare urban and nonurban delivery",
                "C": "To suggest dark stores mainly sell perishables",
                "D": "To explain higher delivery fees",
            }, "A"),
            q(32, "What point does the speaker make about employment?", {
                "A": "Many temporary employees are needed to set up dark stores.",
                "B": "Employees need to be comfortable with technology.",
                "C": "Dark stores do not need many in-store workers.",
                "D": "Dark stores pay employees more.",
            }, "C"),
        ]),
    ]
    m2 = [
        cr(2, 33, "listening_m2_q01_choose_response.mp3", {
            "A": "Do you need help setting up the projector?",
            "B": "Class presentations started last week.",
            "C": "I was impressed by the students' ideas.",
            "D": "One solution could be that we each take turns presenting.",
        }, "C"),
        cr(2, 34, "listening_m2_q02_choose_response.mp3", {
            "A": "Keep all of your materials sorted by subject.",
            "B": "Biology 101 is the best class the school has to offer.",
            "C": "The school day starts at eight a.m. and ends at three thirty p.m.",
            "D": "Yes, the organization is currently hiring interns in the business sector.",
        }, "A"),
        cr(2, 35, "listening_m2_q03_choose_response.mp3", {
            "A": "It was great we could get student tickets.",
            "B": "I can't believe you still haven't finished your homework.",
            "C": "She'll call you in a minute.",
            "D": "The cinema is closed for renovations.",
        }, "A"),
        clip("conversation", "Postcards", 2, "Listen to a conversation.",
             "listening_m2_q04_q05_conversation_postcards.mp3", [
            q(36, "What can be inferred about the woman's postcards?", {
                "A": "They depict places she has traveled to.",
                "B": "They were a gift from a relative.",
                "C": "She values them for their historical significance.",
                "D": "She started collecting them for a school project.",
            }, "C"),
            q(37, "What does the woman imply about finding postcards?", {
                "A": "It is not always easy.",
                "B": "It is an expensive hobby.",
                "C": "She buys postcards mainly online.",
                "D": "She collects only European postcards.",
            }, "A"),
        ]),
        clip("conversation", "Housing suite", 2, "Listen to a conversation.",
             "listening_m2_q06_q07_conversation_housing_suite.mp3", [
            q(38, "Why does the woman ask about the man's housing situation?", {
                "A": "She wants his opinion of four-person suites.",
                "B": "She has a friend looking for a roommate.",
                "C": "She wants advice about off-campus housing.",
                "D": "She needs advice on sharing space.",
            }, "A"),
            q(39, "What is the man's attitude toward his current living arrangement?", {
                "A": "He is unhappy it is far from campus.",
                "B": "He dislikes sharing his living space with others.",
                "C": "He enjoys having a single dorm room.",
                "D": "He likes the amount of space.",
            }, "B"),
        ]),
        clip("lecture", "Multispecies anthropology", 2, "Listen to the recording.",
             "listening_m2_q08_q11_lecture_multispecies_anthropology.mp3", [
            q(40, "What is the main purpose of the talk?", {
                "A": "To contrast two approaches to anthropology",
                "B": "To emphasize the importance of anthropology",
                "C": "To explore only the distinction between culture and nature",
                "D": "To argue plants are less important than animals",
            }, "A"),
            q(41, "What does the speaker imply about a study related to seals?", {
                "A": "It led to multispecies anthropology.",
                "B": "It was the first study of Arctic hunting rituals.",
                "C": "It challenged common views about rituals.",
                "D": "Its view of animal-human relationships was too simple.",
            }, "D"),
            q(42, "What point does the speaker make about mushroom foragers in Siberia?", {
                "A": "The studies were initially rejected.",
                "B": "They emphasize interdependence among living organisms.",
                "C": "They focus on mushrooms in rituals.",
                "D": "They show the symbolic meaning of mushrooms.",
            }, "B"),
            q(43, "What will the speaker discuss next?", {
                "A": "How a study was influenced by a researcher's background",
                "B": "How culture influences human foraging",
                "C": "How humans damaged the environment",
                "D": "How research methods have changed",
            }, "D"),
        ]),
        clip("lecture", "Gas emission craters", 2, "Listen to the recording.",
             "listening_m2_q12_q15_lecture_gas_emission_craters.mp3", [
            q(44, "Who discovered the first gas emission crater in 2014?", {
                "A": "A pilot",
                "B": "A scientist",
                "C": "A local resident",
                "D": "A gas extraction employee",
            }, "A"),
            q(45, "What feature of the crater is the speaker most impressed with?", {
                "A": "Its size",
                "B": "Its shape",
                "C": "The temperature inside it",
                "D": "The materials found near it",
            }, "A"),
            q(46, "Why is the speaker concerned about the explosions?", {
                "A": "They might cause more warming.",
                "B": "They might damage wide areas of permafrost.",
                "C": "They might discourage visitors.",
                "D": "They might be dangerous for pipelines.",
            }, "D"),
            q(47, "What causes empty cavities that fill with gas to form?", {
                "A": "The building of pipelines",
                "B": "The loss of ice from frozen soil",
                "C": "The removal of oil",
                "D": "Pressure from underground gas",
            }, "B"),
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
        sent(1, "Do you need to borrow my notes from class?", "No, I ",
             ["took", "notes", "no", "my", "own"],
             ["took", "my", "own", "notes"]),
        sent(2, "Where did you leave your books?", "They are ",
             ["walls", "has", "blue", "room that", "in the"],
             ["in the", "room that", "has", "blue", "walls"]),
        sent(3, "Did you enjoy the movie produced by the school's drama club?", "",
             ["were", "characters", "me", "none of the", "interesting to"],
             ["none of the", "characters", "were", "interesting to", "me"]),
        sent(4, "Did you attend the team meeting after class yesterday?", "",
             ["able to", "to the", "I wasn't", "meeting", "make it"],
             ["I wasn't", "able to", "make it", "to the", "meeting"]),
        sent(5, "What was the conference organizer asking you after class?", "She was ",
             ["was", "are", "who the keynote speakers", "asking"],
             ["asking", "who the keynote speakers", "are"]),
        sent(6, "I just joined the school gym last week.", "",
             ["classes", "what", "they offer", "do"],
             ["what", "classes", "do", "they offer"], "?"),
        sent(7, "Why didn't you attend the seminar last week?", "",
             ["commitments", "scheduled last", "that was", "week conflicted", "the seminar", "with my other"],
             ["the seminar", "that was", "scheduled last", "week conflicted", "with my other", "commitments"]),
        sent(8, "Are you planning to join us for the make-up class tomorrow?", "I ",
             ["have no", "intention", "class", "tomorrow's", "of attending"],
             ["have no", "intention", "of attending", "tomorrow's", "class"]),
        sent(9, "Are you going to the class cultural event this weekend?", "No, I ",
             ["won't", "able", "no", "be", "to", "go"],
             ["won't", "be", "able", "to", "go"]),
        sent(10, "I heard that the school band is playing a concert downtown next week.", "",
             ["do you", "tickets are still available", "know if"],
             ["do you", "know if", "tickets are still available"], "?"),
        {
            "type": "email", "module": 2, "id": 11,
            "instruction": "Write an email. In your email, do the following:",
            "prompt": (
                "You recently attended a cooking class and thoroughly enjoyed the experience. "
                "You found the instructor, Ms. Baker, very helpful and want to thank her for the enjoyable class."
            ),
            "bullets": [
                "Mention why you enjoyed the class.",
                "Request advice and resources to improve your cooking skills.",
                "Thank her for the class.",
            ],
            "to": "Ms. Baker", "subject": "Request for additional cooking tips",
            "sampleSubject": "Request for additional cooking tips",
            "sample": (
                "Dear Ms. Baker,\n\n"
                "Thank you for the cooking class. I especially enjoyed the way you demonstrated each technique before giving us time to practice it. "
                "Your explanations were clear, and the relaxed atmosphere made it easy to ask questions. "
                "I was particularly pleased that I learned how to control heat more carefully instead of simply following a recipe.\n\n"
                "I would like to continue improving at home. Could you recommend a beginner-friendly cookbook or reliable website that explains basic knife skills, sauces, and meal planning? "
                "I would also appreciate any advice on choosing a few essential tools without buying expensive equipment. "
                "If you offer another class for returning students, please let me know.\n\n"
                "Thank you again for making the class both practical and enjoyable.\n\n"
                "Best regards,\nA Student"
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
            "class": "Technology",
            "professor": {
                "name": "Dr. Diaz", "photo": PHOTO + "diaz.png",
                "text": (
                    "Many believe that social media platforms, where users exchange information and ideas in virtual communities, have potential for use in education. "
                    "They can foster collaboration and engagement among students and offer real-time interaction and access to a wide array of resources. "
                    "However, concerns about misinformation and privacy issues raise questions about their appropriateness in educational settings. "
                    "What do you think? Can social media be used effectively as a tool for educational purposes? Why or why not?"
                ),
            },
            "posts": [
                {"name": "Kelly", "photo": PHOTO + "kelly.png",
                 "text": "I don't think we should be relying on social media for learning. It can alienate students who lack access to these platforms. Many students simply do not have the luxury of constant Internet or social media access."},
                {"name": "Paul", "photo": PHOTO + "andrew.png",
                 "text": "Using social media for educational purposes offers the advantage of real-time feedback and communication. It allows students to interact with their instructors outside of regular class times."},
            ],
            "samples": [
                {"title": "Effective With Safeguards",
                 "text": (
                     "I agree with Paul that social media can be an effective educational tool when teachers use it within clear boundaries. "
                     "Its greatest advantage is speed: students can exchange questions, examples, and feedback while a topic is still fresh. "
                     "For example, a biology class could use a private course group to share photographs of local plants and compare observations before the next lesson. "
                     "The teacher could correct mistakes immediately and direct students to reliable sources. "
                     "Kelly is right that unequal access can exclude some learners, so participation should never depend on a personal social-media account or expensive device. "
                     "Schools should provide an accessible platform and offer an equivalent option for students who cannot connect regularly. "
                     "Privacy settings and source-checking rules are also necessary. With these safeguards, social media does not replace instruction; it extends classroom discussion and helps students collaborate more consistently."
                 )},
                {"title": "Keep Core Learning Off Social Media",
                 "text": (
                     "I agree more with Kelly that social media should not become a central educational tool. "
                     "Even when access is available, these platforms are designed to capture attention rather than support careful learning. "
                     "Notifications, short posts, and unverified claims can interrupt concentration and make weak information appear credible. "
                     "For example, students researching a public-health issue might repeatedly encounter a popular but inaccurate video, while a reliable report receives less attention because it is less entertaining. "
                     "Paul is correct that social media enables quick communication, but schools already have learning-management systems that provide messages, discussion boards, and file sharing without the same public exposure. "
                     "Teachers can still offer timely feedback through those systems. In my view, social media may be useful for optional announcements, but core lessons and assessed discussion should remain on platforms designed for education, privacy, and dependable access."
                 )},
            ],
        },
    ])


def build_speaking():
    # ponytail: source missing listen-repeat q01–q02 audio (answer key also says 答案缺失).
    # Ceiling: paper ships the 5 clips that exist. Upgrade: recover q01–q02 from a full Speaking.mp3 if it appears.
    instr_r = (
        "You are being trained to assist guests during a campus career fair. "
        "Listen to the event coordinator and repeat what the coordinator says. Repeat only once."
    )
    instr_i = (
        "You have agreed to participate in a research study about people's experiences with hobbies. "
        "You will have a short online interview with a researcher. The researcher will ask you some questions."
    )
    repeats = [
        (1, 15, "speaking_listen_repeat_q03.mp3",
         "When you check in, pick up a printed schedule and a site map."),
        (2, 15, "speaking_listen_repeat_q04.mp3",
         "We'll be hosting presentations on resume writing at noon."),
        (3, 15, "speaking_listen_repeat_q05.mp3",
         "If attendees need a quiet meeting area, it's upstairs."),
        (4, 15, "speaking_listen_repeat_q06.mp3",
         "Computers are available to connect with company representatives."),
        (5, 18, "speaking_listen_repeat_q07.mp3",
         "You should monitor your email closely for messages from employers."),
    ]
    interviews = [
        (6, "What kinds of hobbies do you think are especially popular today? Why?",
         "I think fitness activities and creative hobbies are especially popular today. "
         "Many people go running, practice yoga, or follow short exercise programs because these activities improve health and can fit into a busy schedule. "
         "Creative hobbies such as photography, cooking, and digital drawing are also common. "
         "Social media makes them easier to learn because beginners can watch demonstrations and share their progress. "
         "In addition, people want a break from work and study, so hobbies that produce a visible result feel rewarding. "
         "A person can finish a meal, edit a photograph, or complete a workout and immediately feel that the time was meaningful."),
        (7, "What role do you think friends, family, or community play in encouraging someone to take up a hobby?",
         "Friends, family, and community can make it much easier for someone to begin a hobby. "
         "A friend may invite a person to a running group, lend basic equipment, or explain what to expect at the first meeting. "
         "Family members can provide encouragement and protect time for regular practice. "
         "Community centers are also important because they offer affordable classes and introduce beginners to people with similar interests. "
         "This support reduces the fear of being inexperienced. It also creates accountability, since people are more likely to continue when others notice their progress and expect them to participate. "
         "In this way, social support turns a private interest into a sustainable routine."),
        (8, "Many people start hobbies but don't continue. What leads people to give up on their hobbies?",
         "People often give up hobbies because their expectations are unrealistic. "
         "A beginner may expect rapid improvement, buy too much equipment, or choose a schedule that is impossible to maintain. "
         "When progress is slower than expected, the activity begins to feel like another obligation. Cost and lack of social support can also be factors. "
         "For example, someone may stop playing tennis if court fees are high and no partner is available. "
         "I think the best solution is to begin with a small, specific goal and inexpensive materials. "
         "Short practice sessions and a supportive group make improvement visible, so the hobby remains enjoyable instead of becoming a source of pressure."),
        (9, "Some people believe spending time on hobbies is essential, while others see it as a luxury. What is your opinion?",
         "I believe hobbies are essential rather than a luxury because they support mental health, curiosity, and social connection. "
         "People need time that is not measured only by work or academic performance. "
         "A hobby such as gardening, music, or hiking can reduce stress and give a person a sense of progress that is separate from a job. "
         "Hobbies can also create friendships across age and professional background. "
         "Of course, not everyone has the same amount of free time or money, so hobbies should not become another expensive obligation. "
         "However, many meaningful activities require very little equipment. Even reading, walking, or sketching for twenty minutes can improve daily life and help people return to their responsibilities with more energy."),
    ]
    tasks = []
    for i, sec, fname, sample in repeats:
        tasks.append({
            "type": "repeat", "module": 1, "id": i, "speakSec": sec,
            "instruction": instr_r, "audio": AUDIO + fname, "sample": sample,
        })
    for i, stem, sample in interviews:
        tasks.append({
            "type": "interview", "module": 2, "id": i, "speakSec": 45,
            "instruction": instr_i, "stem": stem,
            "audio": AUDIO + "speaking_take_interview_q%02d.mp3" % (i - 5),
            "sample": sample,
        })
    return paper("speaking", "口语", [
        {"n": 1, "timeSec": 180, "from": 1, "to": 5, "label": "Listen and Repeat"},
        {"n": 2, "timeSec": 360, "from": 6, "to": 9, "label": "Take an Interview"},
    ], tasks)


def copy_audio():
    dest = os.path.join(ROOT, "library/toefl/audio/2025-08-26")
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
    dump("2025-08-26-reading.json", build_reading())
    dump("2025-08-26-listening.json", build_listening())
    dump("2025-08-26-writing.json", build_writing())
    dump("2025-08-26-speaking.json", build_speaking())
