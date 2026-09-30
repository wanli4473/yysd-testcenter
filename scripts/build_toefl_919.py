#!/usr/bin/env python3
"""Build 9.19 overseas offline TOEFL. Run: python3 scripts/build_toefl_919.py"""
import json
import os
import shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/9月/9.19-海外线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-09-19/"
PHOTO = "library/toefl/img/2025-09-02/"


def dump(name, obj):
    path = os.path.join(ROOT, "library/toefl", name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", name, "tasks", len(obj.get("tasks", [])))


def blank(n, prefix, word):
    if prefix and not word.startswith(prefix) and not word.lower().startswith(prefix.lower()):
        raise SystemExit("prefix %r not in %r" % (prefix, word))
    return {"id": n, "prefix": prefix, "answer": word[len(prefix) :], "word": word}


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


def build_reading():
    tasks, n = [], 1
    t, n = cw("Deserts", 1, n, [
        "Deserts, often characterized by aridity and extreme temperatures, have long been dismissed as barren wastelands. However, this ",
        ("perce", "perception"),
        " overlooks ",
        ("th", "the"),
        " critical ",
        ("ecolo", "ecological"),
        " significance ",
        ("a", "and"),
        " the ",
        ("remar", "remarkable"),
        " adaptations ",
        ("o", "of"),
        " the ",
        ("orga", "organisms"),
        " they ",
        ("ho", "host"),
        ". These ",
        ("sev", "severe"),
        " environments ",
        ("req", "require"),
        " resilience and innovation, with plants and animals developing unique survival strategies. Moreover, deserts play a vital role in global carbon cycles, and their vast landscapes offer unparalleled opportunities for research into climate change impacts. Thus, recognizing the intrinsic value of deserts is essential for fostering a deeper appreciation and commitment to desert conservation.",
    ])
    tasks.append(t)
    t, n = cw("3D Printing", 1, n, [
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
    tasks.append(t)
    tasks.append(daily("Gym membership", 1, "Read an email.", {
        "kind": "card", "title": "Gym membership", "kicker": "EMAIL",
        "body": "From: Jessica Martin\nTo: Mr. Taylor\nSubject: Gym membership\n\nDear Mr. Taylor,\nYour membership at Gym World was successfully renewed on March 3. Your new membership card will arrive within five business days. Wait two business days to contact us if the card is delayed. Download our mobile app to learn about new weekly promotions.\nRegards,\nJessica Martin",
    }, [
        q(21, "When will Mr. Taylor receive his new membership card?", {
            "A": "Within two business days", "B": "Within three business days",
            "C": "Within five business days", "D": "Within seven business days",
        }, "C"),
        q(22, "How can Mr. Taylor learn about new weekly promotions?", {
            "A": "By using the mobile app", "B": "By visiting the gym website",
            "C": "By calling the gym", "D": "By waiting for a mailed notice",
        }, "A"),
    ]))
    tasks.append(daily("Foundations of Graphic Design", 1, "Read a course description.", {
        "kind": "course",
        "title": "FOUNDATIONS OF GRAPHIC DESIGN",
        "body": "An introduction to design principles, color theory, layout, and industry-standard software.",
        "fields": [
            {"label": "Who May Enroll", "value": "First-year students and art majors."},
            {"label": "Meeting Time", "value": "Tuesdays and Thursdays, 3:00–4:00 p.m."},
            {"label": "Location", "value": "College Design Studio"},
            {"label": "Availability", "value": "Fall semester only"},
        ],
    }, [
        q(23, "Which student is most likely eligible to enroll in the course?", {
            "A": "A graduate student in engineering", "B": "A high-school student visiting campus",
            "C": "A first-year student majoring in art", "D": "A senior majoring in biology",
        }, "C"),
        q(24, "Students will learn all of the following EXCEPT", {
            "A": "applying color theory", "B": "adding animation to a slide deck",
            "C": "arranging page layouts", "D": "using design software",
        }, "B"),
    ]))
    tasks.append(daily("Maplewood water notice", 1, "Read a notice.", {
        "kind": "card", "title": "ATTENTION MAPLEWOOD RESIDENTS!",
        "body": "Due to necessary maintenance on the main water line, water service will be interrupted on Monday, March 15, from 9:00 a.m. to 4:00 p.m.\n\nBefore the interruption: Fill containers with water for drinking and cooking. Store enough water for personal hygiene needs.\nDuring the interruption: Do not use faucets, showers, or water-dependent appliances. Toilets may not function properly; plan accordingly.\nAfter service resumes: Run cold water through all faucets for a few minutes. Check for leaks and report them to maintenance.\n\nQuestions? Contact the Maplewood Maintenance Department at 555-4321.",
    }, [
        q(25, "What is the notice primarily about?", {
            "A": "Providing safety tips during a storm", "B": "Announcing a disruption to a service",
            "C": "Explaining a new water appliance", "D": "Promoting a community water park",
        }, "B"),
        q(26, "What should residents do before the interruption?", {
            "A": "Turn off the building's main water line", "B": "Report leaks to the city",
            "C": "Move to another dormitory", "D": "Store enough water for the day",
        }, "D"),
        q(27, "What can be inferred about the maintenance work?", {
            "A": "It is optional and may be canceled", "B": "It is required to improve the infrastructure",
            "C": "It will affect only one resident", "D": "It will permanently reduce water pressure",
        }, "B"),
    ]))
    tasks.append(daily("Study Smarter workshop", 1, "Read a flyer.", {
        "kind": "poster", "title": "STUDY SMARTER", "subtitle": "Academic Success Workshop",
        "body": "A practical 60-minute workshop covering time management, effective note-taking, active recall, interval study, and exam preparation.",
        "fields": [
            {"label": "You will leave with", "value": "A weekly study plan, a prioritized assignment list, and a list of campus resources"},
            {"label": "Who", "value": "All registered students"},
            {"label": "When", "value": "September 10, 7:00–8:00 p.m."},
            {"label": "Where", "value": "Jasper Hall, Room 404"},
            {"label": "Register", "value": "universitysuccess.edu/workshops"},
        ],
    }, [
        q(28, "Who may attend the workshop?", {
            "A": "Only faculty members", "B": "Registered students who sign up online",
            "C": "Only students in Jasper Hall", "D": "Members of the tutoring staff",
        }, "B"),
        q(29, "The workshop covers all of the following EXCEPT", {
            "A": "time management", "B": "note-taking", "C": "exam preparation", "D": "critical-thinking theory",
        }, "D"),
        q(30, "What will participants take away from the workshop?", {
            "A": "A university course credit", "B": "A free textbook",
            "C": "A personalized study plan", "D": "A guaranteed examination score",
        }, "C"),
    ]))
    tasks.append(academic("Evolutionary Trends in Graphic Design", 1, [
        "Graphic design has transformed significantly across centuries. During the Middle Ages, illuminated manuscripts combined text and decorative imagery, but the invention of the printing press enabled mass production and wider public access. This development changed both how designs were produced and how audiences perceived visual information.",
        "By the mid-twentieth century, Swiss design emerged in response to an increasingly chaotic visual landscape, emphasizing minimalism and functionality.",
        {"insert": "A", "t": "Influenced by the Bauhaus, designers such as Josef Müller-Brockmann advocated for simplicity and rationality."},
        {"insert": "B", "t": "Their grid-based approach created order and improved readability."},
        {"insert": "C", "t": "However, critics argued that this rigid structure limited individual expression and emotional resonance."},
        {"insert": "D"},
        "Today, graphic design exists at the intersection of tradition and innovation. Digital tools have democratized design, while debates continue over artistic integrity. Contemporary designers often seek to balance precision with warmth, showing that the field continues to evolve through disagreement as well as invention.",
    ], [
        q(31, "What is one effect of the printing press mentioned in the passage?", {
            "A": "It made visual information available to a wider audience.",
            "B": "It ended the use of decorative imagery.",
            "C": "It required all designers to use a grid.",
            "D": "It made manuscripts more expensive.",
        }, "A"),
        q(32, "The phrase \"advocated for\" in the passage is closest in meaning to", {
            "A": "rejected", "B": "promoted", "C": "concealed", "D": "questioned",
        }, "B"),
        q(33, "Why does the author mention the \"grid-based approach\"?", {
            "A": "To show why printing presses became obsolete",
            "B": "To explain how medieval artists decorated books",
            "C": "To illustrate how Swiss designers created order and readability",
            "D": "To argue that all modern design should be identical",
        }, "C"),
        q(34, "What criticism of Swiss design is mentioned?", {
            "A": "It was too expensive to reproduce.",
            "B": "It relied too heavily on decorative manuscripts.",
            "C": "It prevented information from being organized.",
            "D": "Its rigid structure could restrict expression.",
        }, "D"),
        insert_q(35, "However, this clarity sometimes came at the cost of creativity.", "C"),
    ]))
    t, n = cw("Color in Art", 2, 36, [
        "Color usage in art is a powerful tool that conveys emotion, creates depth, and guides the viewer's attention. Artists use color theory to combine hues in ways that ",
        ("eli", "elicit"),
        " specific ",
        ("mo", "moods"),
        ". By ",
        ("care", "carefully"),
        " selecting ",
        ("comple", "complementary"),
        " or ",
        ("contr", "contrasting"),
        " colors, ",
        ("th", "they"),
        " can ",
        ("heig", "heighten"),
        " visual ",
        ("imp", "impact"),
        " and ",
        ("cre", "create"),
        " dynamic ",
        ("compo", "compositions"),
        ". Warm colors, like red and orange, can suggest energy or passion. Cool tones, like blue and green, can evoke calm or melancholy. Through deliberate choices, artists shape the visual and emotional impact of their work.",
    ])
    tasks.append(t)
    tasks.append(academic("Beyond Philosophy's Borders", 2, [
        "Metaphilosophy is a field that looks critically at whether philosophical inquiry can truly transcend cultural and linguistic boundaries. While traditional philosophy often aims to uncover universal truths, metaphilosophy questions whether such truths are even accessible across diverse contexts. Language, far from being a neutral vessel, shapes and limits how ideas are expressed and understood. A concept that resonates deeply in one culture may carry entirely different connotations—or none at all—in another. This raises concerns about the global applicability of philosophical frameworks developed in specific cultural milieus. Are we uncovering truths, or merely reinforcing culturally contingent assumptions?",
        "Some insist that despite linguistic and cultural variation, certain philosophical concerns—like suffering, justice, or mortality—are shared across societies, suggesting a basis for universality. Yet even these themes may be interpreted through culturally specific lenses. Metaphilosophy doesn't deny the possibility of cross-cultural dialogue but cautions against assuming it is seamless. It encourages philosophers to examine how their methods and assumptions travel—or fail to—across contexts.",
        "Critics worry this reflexivity may stall progress, but others see it as essential for avoiding intellectual overreach. By foregrounding these tensions, metaphilosophy aims not to dilute philosophy's aims, but to sharpen them through greater self-awareness and methodological rigor.",
    ], [
        q(46, "What is the main purpose of the passage?", {
            "A": "To prove that all philosophical truths are universal",
            "B": "To reject cross-cultural philosophical dialogue",
            "C": "To compare philosophy with linguistics",
            "D": "To examine whether philosophy can cross cultural and linguistic boundaries",
        }, "D"),
        q(47, "What concern does the passage raise about language?", {
            "A": "It makes philosophical writing unnecessarily long.",
            "B": "It prevents people from learning foreign languages.",
            "C": "It shapes and limits how ideas are expressed and understood.",
            "D": "It guarantees that concepts have the same meaning everywhere.",
        }, "C"),
        q(48, "The word \"milieus\" in the passage is closest in meaning to", {
            "A": "environments", "B": "arguments", "C": "translations", "D": "institutions",
        }, "A"),
        q(49, "Which sentence best supports the idea that some philosophical concerns may be universal?", {
            "A": "The first sentence of paragraph 1",
            "B": "The first sentence of paragraph 2",
            "C": "The last sentence of paragraph 2",
            "D": "The first sentence of paragraph 3",
        }, "B"),
        q(50, "What is the author's attitude toward metaphilosophical self-examination?", {
            "A": "It should replace philosophy entirely.",
            "B": "It can improve philosophy by increasing self-awareness and rigor.",
            "C": "It makes philosophical progress impossible.",
            "D": "It matters only for translation studies.",
        }, "B"),
    ]))
    if n != 46:
        raise SystemExit("reading blanks ended at %s" % n)
    return {
        "id": "2025-09-19",
        "title": "新托福 9.19 · 阅读",
        "set": "9.19",
        "skill": "reading",
        "modules": [
            {"n": 1, "timeSec": 1260, "from": 1, "to": 35},
            {"n": 2, "timeSec": 540, "from": 36, "to": 50},
        ],
        "tasks": tasks,
    }


def build_listening():
    m1 = [
        cr(1, 1, "listening_m1_q01_choose_response.mp3", {
            "A": "The website would probably be the best resource.",
            "B": "It's been a while since I went hiking with the outdoor adventure club.",
            "C": "Do you think camping is a good way to relax?",
            "D": "I've been taking swimming lessons in the morning before classes.",
        }, "A"),
        cr(1, 2, "listening_m1_q02_choose_response.mp3", {
            "A": "Have you checked the conference agenda?",
            "B": "Amy moved to Michigan last year.",
            "C": "I think it's casual, but you'd better double-check.",
            "D": "I didn't take any notes during our professor's speech.",
        }, "A"),
        cr(1, 3, "listening_m1_q03_choose_response.mp3", {
            "A": "In the auditorium.", "B": "The presenters are ready.",
            "C": "It started late.", "D": "It was very informative.",
        }, "A"),
        cr(1, 4, "listening_m1_q04_choose_response.mp3", {
            "A": "The clouds are getting darker.", "B": "The concert begins at eight.",
            "C": "I'm thinking about it.", "D": "I read it yesterday.",
        }, "C"),
        cr(1, 5, "listening_m1_q05_choose_response.mp3", {
            "A": "I had to leave early.", "B": "The battery needs charging.",
            "C": "I learned several useful techniques.", "D": "It is located downtown.",
        }, "C"),
        cr(1, 6, "listening_m1_q06_choose_response.mp3", {
            "A": "She is studying abroad.", "B": "A guest lecturer.",
            "C": "It starts at four o'clock.", "D": "All students may attend.",
        }, "B"),
        cr(1, 7, "listening_m1_q07_choose_response.mp3", {
            "A": "I would love to join.", "B": "The team already has six players.",
            "C": "Her research is quite innovative.", "D": "We went to the river last year.",
        }, "A"),
        cr(1, 8, "listening_m1_q08_choose_response.mp3", {
            "A": "It was held last semester.", "B": "It offered valuable insights.",
            "C": "The speaker was informative.", "D": "When does it begin?",
        }, "B"),
        cr(1, 9, "listening_m1_q09_choose_response.mp3", {
            "A": "The teams play tomorrow.", "B": "The decision came from the top down.",
            "C": "That sounds like a good plan.", "D": "I never thought about the topic.",
        }, "C"),
        cr(1, 10, "listening_m1_q10_choose_response.mp3", {
            "A": "The seminar is on Monday.", "B": "I liked the topic.",
            "C": "Yes, I saw the changes.", "D": "It is on the east side of campus.",
        }, "C"),
        cr(1, 11, "listening_m1_q11_choose_response.mp3", {
            "A": "It was on the corner.", "B": "The meeting lasts fifteen minutes.",
            "C": "I was extremely busy.", "D": "I signed the form.",
        }, "C"),
        cr(1, 12, "listening_m1_q12_choose_response.mp3", {
            "A": "I usually study at the library.", "B": "The fish are in the pond.",
            "C": "It was too expensive.", "D": "The store closes at six.",
        }, "A"),
        clip("conversation", "Walking Shoes", 1, "Listen to a conversation. Then answer the questions.",
             "listening_m1_q13_q14_conversation_walking_shoes.mp3", [
                 q(13, "What is the man most likely preparing for?", {
                     "A": "A ski holiday", "B": "A camping trip",
                     "C": "A vacation at the beach", "D": "A hike in the mountains",
                 }, "D"),
                 q(14, "What does the woman offer to do?", {
                     "A": "Visit the store with the man", "B": "Lend the man a pair of shoes",
                     "C": "Join the man on his adventure", "D": "Introduce the man to the store owner",
                 }, "A"),
             ]),
        clip("conversation", "Health Food Store", 1, "Listen to a conversation. Then answer the questions.",
             "listening_m1_q15_q16_conversation_health_food_store.mp3", [
                 q(15, "What is the man's opinion of the new store?", {
                     "A": "It has especially friendly service.",
                     "B": "It offers an impressive variety of products.",
                     "C": "It is conveniently located.", "D": "Its displays are attractive.",
                 }, "B"),
                 q(16, "Why did the man not buy anything from the bakery?", {
                     "A": "The products were not fresh.", "B": "The prices were too high.",
                     "C": "He was in a hurry.", "D": "The bakery had no baked goods.",
                 }, "C"),
             ]),
        clip("conversation", "Ecology Presentation", 1, "Listen to a conversation. Then answer the questions.",
             "listening_m1_q17_q18_conversation_ecology_presentation.mp3", [
                 q(17, "What can be inferred about the man?", {
                     "A": "He is confident about speaking to groups.",
                     "B": "He has decided to quit his job.",
                     "C": "He is unprepared for his presentation.",
                     "D": "He is not interested in ecology.",
                 }, "A"),
                 q(18, "What is the woman's attitude toward the internship?", {
                     "A": "She is nervous about her colleagues.",
                     "B": "She is concerned that she may not be offered it.",
                     "C": "She is confident it will fit her schedule.",
                     "D": "She is happy that it is close to campus.",
                 }, "B"),
             ]),
        clip("announcement", "Online Platform", 1, "Listen to an announcement in a classroom. Then answer the questions.",
             "listening_m1_q19_q20_announcement_online_platform.mp3", [
                 q(19, "What is the speaker's opinion of the change?", {
                     "A": "It will make course materials more convenient to access.",
                     "B": "It will create more exciting field trips.",
                     "C": "Its success is uncertain.", "D": "It will frustrate most students.",
                 }, "A"),
                 q(20, "What are students most likely expected to do by Friday?", {
                     "A": "Submit an essay outline",
                     "B": "Create an account on the new platform",
                     "C": "Complete a group project", "D": "Answer a system survey",
                 }, "B"),
             ]),
        clip("announcement", "Student Awards", 1, "Listen to a school radio announcement. Then answer the questions.",
             "listening_m1_q21_q22_announcement_student_awards.mp3", [
                 q(21, "What will attendees hear at the ceremony?", {
                     "A": "Speeches or stories about the award recipients",
                     "B": "A debate between student groups",
                     "C": "Presentations of research proposals", "D": "A lecture on local history",
                 }, "A"),
                 q(22, "What will happen after the ceremony?", {
                     "A": "A group photograph", "B": "A reception with refreshments",
                     "C": "A campus tour", "D": "A book signing",
                 }, "B"),
             ]),
        clip("announcement", "Volunteer Gala", 1, "Listen to an announcement at a school event. Then answer the questions.",
             "listening_m1_q23_q24_announcement_volunteer_gala.mp3", [
                 q(23, "What kind of event is being announced?", {
                     "A": "A music performance", "B": "A sports competition",
                     "C": "A club meeting", "D": "A fundraising event",
                 }, "D"),
                 q(24, "What will students receive when they arrive?", {
                     "A": "A seating assignment", "B": "A name badge",
                     "C": "A printed program", "D": "A discount coupon",
                 }, "B"),
             ]),
        clip("lecture", "Dark Stores", 1, "Listen to a talk in a business class. Then answer the questions.",
             "listening_m1_q25_q28_lecture_dark_stores.mp3", [
                 q(25, "What is the main topic of the talk?", {
                     "A": "The retail and social effects of dark stores",
                     "B": "The interior design of modern stores",
                     "C": "Similarities between stores and warehouses",
                     "D": "The history of warehouse construction",
                 }, "A"),
                 q(26, "Why can dark stores sometimes offer lower prices?", {
                     "A": "They purchase larger quantities.",
                     "B": "They operate without making a profit.",
                     "C": "They sell cheaper products.",
                     "D": "They have lower overhead costs.",
                 }, "D"),
                 q(27, "Why does the speaker mention grocery delivery in under an hour?", {
                     "A": "To illustrate a competitive advantage",
                     "B": "To compare urban and rural shopping",
                     "C": "To discuss the handling of perishable goods",
                     "D": "To explain why delivery fees are higher",
                 }, "A"),
                 q(28, "What concern about employment does the speaker mention?", {
                     "A": "Most positions are temporary.",
                     "B": "Workers need advanced technical skills.",
                     "C": "Fewer customer-facing jobs may be available.",
                     "D": "Delivery workers must be paid more.",
                 }, "C"),
             ]),
        clip("lecture", "Storage Furniture", 1, "Listen to a talk in a history class. Then answer the questions.",
             "listening_m1_q29_q32_lecture_storage_furniture.mp3", [
                 q(29, "What is the talk mainly about?", {
                     "A": "Why modern homes imitate Roman houses",
                     "B": "The evolution of storage furniture and closets in Europe and the United States",
                     "C": "The usefulness of wood in military equipment",
                     "D": "Why storage furniture was popular only with wealthy people",
                 }, "B"),
                 q(30, "How did French armoires differ from Roman armariums?", {
                     "A": "They were used to store a different category of items.",
                     "B": "They were larger and heavier.",
                     "C": "They were made from a different type of wood.",
                     "D": "They were mainly decorative.",
                 }, "A"),
                 q(31, "Why does the speaker mention playing a guitar?", {
                     "A": "To give an example of a breakable item",
                     "B": "To describe a common activity of soldiers",
                     "C": "To explain why armoires needed to be large",
                     "D": "To illustrate one purpose of an early English closet",
                 }, "D"),
                 q(32, "What was a main advantage of built-in closets in the United States in the mid-1800s?", {
                     "A": "They could hold more clothing.",
                     "B": "They included coat hangers.",
                     "C": "They were less expensive than armoires.",
                     "D": "They provided greater privacy.",
                 }, "C"),
             ]),
    ]
    m2 = [
        cr(2, 33, "listening_m2_q01_choose_response.mp3", {
            "A": "I haven't finished it yet.", "B": "The team welcomes new players.",
            "C": "Sure, we work well together.", "D": "No one was there.",
        }, "C"),
        cr(2, 34, "listening_m2_q02_choose_response.mp3", {
            "A": "Yes, but it was canceled at the last minute.",
            "B": "The session was delightful.",
            "C": "She wants it included in the project.", "D": "Lunch is included.",
        }, "A"),
        cr(2, 35, "listening_m2_q03_choose_response.mp3", {
            "A": "I'll have time after lunch.", "B": "Other students are waiting for the book.",
            "C": "I saw that movie last year.", "D": "The truck was loaded with supplies.",
        }, "A"),
        clip("conversation", "Film Festival", 2, "Listen to a conversation. Then answer the questions.",
             "listening_m2_q04_q05_conversation_film_festival.mp3", [
                 q(36, "What does the woman imply when she mentions a research paper?", {
                     "A": "She cannot attend the event this weekend.",
                     "B": "She will not complete the paper on time.",
                     "C": "She prefers to watch documentaries.",
                     "D": "She is surprised by her grade.",
                 }, "A"),
                 q(37, "What does the woman imply she might do?", {
                     "A": "Help the man with his paper", "B": "Make a documentary",
                     "C": "Apply for a job at the theater",
                     "D": "Tell a friend about a future event",
                 }, "D"),
             ]),
        clip("conversation", "Ambassador Program", 2, "Listen to a conversation. Then answer the questions.",
             "listening_m2_q06_q07_conversation_ambassador_program.mp3", [
                 q(38, "Why does the man speak to the woman?", {
                     "A": "To inform her about a program change",
                     "B": "To ask for her opinion about the program",
                     "C": "To recommend that she apply", "D": "To invite her to an event",
                 }, "B"),
                 q(39, "What does the woman imply about the ambassador program?", {
                     "A": "She disliked the information session.",
                     "B": "It now requires more meetings.",
                     "C": "The time commitment is flexible.",
                     "D": "It requires a serious full-time commitment.",
                 }, "C"),
             ]),
        clip("lecture", "Venus Lightning", 2, "Listen to a talk in an astronomy class. Then answer the questions.",
             "listening_m2_q08_q11_lecture_venus_lightning.mp3", [
                 q(40, "What is the talk mainly about?", {
                     "A": "When lightning was first detected on Earth",
                     "B": "How remote instruments are designed",
                     "C": "Comparisons between science fiction movies",
                     "D": "What lightning may reveal about conditions on Venus",
                 }, "D"),
                 q(41, "Why does the speaker mention a science fiction movie?", {
                     "A": "To explain how scientific models are created",
                     "B": "To emphasize the dramatic appearance of Venus's atmosphere",
                     "C": "To describe the difficulties of visiting Venus",
                     "D": "To contrast two research methods",
                 }, "B"),
                 q(42, "What does the presence of lightning on Venus suggest?", {
                     "A": "Its atmospheric chemistry is identical to Earth's.",
                     "B": "Its weather is stable.",
                     "C": "Its atmosphere is more active than previously believed.",
                     "D": "It may support plant life.",
                 }, "C"),
                 q(43, "What is the speaker's attitude toward future research?", {
                     "A": "Skeptical", "B": "Concerned",
                     "C": "Intrigued by new possibilities", "D": "Disappointed",
                 }, "C"),
             ]),
        clip("lecture", "Honey Bees", 2, "Listen to part of a lecture in a biology class. Then answer the questions.",
             "listening_m2_q12_q15_lecture_honey_bees.mp3", [
                 q(44, "What question did the first experiment investigate?", {
                     "A": "What percentage of bees became foragers",
                     "B": "Whether bees performed the same activity each day",
                     "C": "Which time of day bees were most active",
                     "D": "Whether all foragers contributed equally to the workload",
                 }, "D"),
                 q(45, "What information did the microtransponders provide?", {
                     "A": "The number of trips each bee made into and out of the hive",
                     "B": "The amount of energy each bee used",
                     "C": "The speed of each flight", "D": "The amount of nectar carried",
                 }, "A"),
                 q(46, "What happened after most elite foragers were removed?", {
                     "A": "The colony collapsed.",
                     "B": "Foraging activity immediately increased.",
                     "C": "Activity dropped and then returned when less active bees increased their work.",
                     "D": "Hive workers permanently became foragers.",
                 }, "C"),
                 q(47, "What do the results of the second experiment suggest?", {
                     "A": "Only a few bees are capable of foraging.",
                     "B": "The forager population is fixed.",
                     "C": "Individual bees adjust their behavior to the colony's needs.",
                     "D": "Foragers are more important than other workers.",
                 }, "C"),
             ]),
    ]
    return {
        "id": "2025-09-19",
        "title": "新托福 9.19 · 听力",
        "set": "9.19",
        "skill": "listening",
        "modules": [
            {"n": 1, "timeSec": 1500, "from": 1, "to": 32},
            {"n": 2, "timeSec": 660, "from": 33, "to": 47},
        ],
        "tasks": m1 + m2,
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


def build_writing():
    return {
        "id": "2025-09-19",
        "title": "新托福 9.19 · 写作",
        "set": "9.19",
        "skill": "writing",
        "modules": [
            {"n": 1, "timeSec": 480, "from": 1, "to": 10, "label": "Sentence Construction"},
            {"n": 2, "timeSec": 420, "from": 11, "to": 11, "label": "Email"},
            {"n": 3, "timeSec": 600, "from": 12, "to": 12, "label": "Academic Discussion"},
        ],
        "tasks": [
            sent(1, "What are you planning to discuss with your professor?", "",
                 ["She", "wants to", "know", "when", "my", "art exhibition", "will be", "held"],
                 ["She", "wants to", "know", "when", "my", "art exhibition", "will be", "held"]),
            sent(2, "I just got a new job at the cafeteria on campus.", "",
                 ["Have you met", "your", "new colleagues"],
                 ["Have you met", "your", "new colleagues"], " yet?"),
            sent(3, "Have you decided which book to read for the literature class assignment?", "",
                 ["The novel", "that won", "the award", "last year", "seems", "interesting"],
                 ["The novel", "that won", "the award", "last year", "seems", "interesting"]),
            sent(4, "What feedback did the class give about our presentation?", "They were ",
                 ["curious to", "find out", "which websites", "provide", "additional information"],
                 ["curious to", "find out", "which websites", "provide", "additional information"]),
            sent(5, "We have a team-building activity planned at school on Friday.", "",
                 ["Do you", "know whether", "it will", "be indoors", "or outdoors"],
                 ["Do you", "know whether", "it will", "be indoors", "or outdoors"], "?"),
            sent(6, "Did you see Emily at the class event yesterday?", "",
                 ["No,", "she wasn't", "able", "to make it"],
                 ["No,", "she wasn't", "able", "to make it"]),
            sent(7, "Did you bring your notes in preparation for today's class?", "I ",
                 ["have", "nothing", "prepared", "for", "class"],
                 ["have", "nothing", "prepared", "for", "class"]),
            sent(8, "What did Jane need to know about the next class meeting?", "She asked ",
                 ["me", "when and", "where it", "would be", "held"],
                 ["me", "when and", "where it", "would be", "held"]),
            sent(9, "Why were they asking about the upcoming alumni fundraising event?", "They were ",
                 ["interested in", "knowing", "which location", "has been", "chosen"],
                 ["interested in", "knowing", "which location", "has been", "chosen"]),
            sent(10, "There's a new art exhibit at the university gallery this week.", "",
                 ["Do you", "know whether", "it", "features", "contemporary", "artists"],
                 ["Do you", "know whether", "it", "features", "contemporary", "artists"], "?"),
            {
                "type": "email", "module": 2, "id": 11,
                "instruction": "Write an email. In your email, do the following:",
                "prompt": "You and your friend Alex have been discussing taking a vacation together during your university's spring break. You recently discovered a great travel package to a nearby city. You think this trip would be perfect for both of you.",
                "bullets": [
                    "Explain why the travel package would be a fun vacation for both of you.",
                    "Describe what the package includes.",
                    "Invite Alex to book the trip with you.",
                ],
                "to": "Alex", "subject": "Exciting travel opportunity",
                "sampleSubject": "Exciting travel opportunity",
                "sample": "Dear Alex,\n\nI found a spring-break travel package to Harbor City that seems perfect for us. We have both wanted a short trip that combines sightseeing with time to relax, and this city has museums, a lively waterfront, and several inexpensive restaurants within walking distance. The package includes round-trip train tickets, three nights at a centrally located hotel, daily breakfast, and a guided harbor tour. It also includes a flexible museum pass, so we could choose activities according to the weather instead of following a rigid schedule. The current student price is available only until Friday. Would you like to book the trip with me this evening? I can send you the itinerary and reservation link, and we can choose our departure time together.\n\nBest,\nJordan",
            },
            {
                "type": "discussion", "module": 3, "id": 12,
                "instruction": "Your professor is teaching a class. Write a post responding to the professor's question.\nIn your response, you should do the following:\n• Express and support your personal opinion.\n• Make a contribution to the discussion in your own words.\nAn effective response will contain at least 100 words.",
                "class": "Arts as Social Communication",
                "professor": {
                    "name": "Dr. Gupta", "photo": PHOTO + "diaz.png",
                    "text": "The arts include a variety of fields: literature, painting, and dance, just to name a few. Some people believe the arts play a vital role in human communication and growth, reflecting cultural values and commenting on societal issues. On the other hand, some people believe that the arts are mainly valuable as a source of entertainment and personal enjoyment, with little or no wider significance. Which view on the arts' role in society do you hold? Why?",
                },
                "posts": [
                    {"name": "Claire", "photo": PHOTO + "kelly.png",
                     "text": "I think the role that the arts play in society is highly significant. Art can convey powerful messages and provoke thought and discussion about important social and cultural issues. It can also preserve history and traditions, allowing future generations to understand and appreciate their heritage."},
                    {"name": "Paul", "photo": PHOTO + "andrew.png",
                     "text": "I think people like Claire overestimate the impact that the arts have on society. Obviously, the arts can provide a sense of joy and relaxation, offering an escape from the stresses of everyday life. But there are many disciplines and fields that play a much more vital role in promoting communication and growth, such as journalism and psychology."},
                ],
                "samples": [
                    {"title": "Arts as Social Communication",
                     "text": "I agree with Claire that the arts play a significant social role because they preserve shared experience and make difficult issues easier to discuss. A painting, novel, or performance can present an unfamiliar perspective without requiring an audience to accept a formal argument first. For example, a city museum might record an exhibition about migration that combines family photographs, recorded memories, and contemporary artwork. Visitors would not only learn historical facts but also understand how relocation affects identity and community. That emotional connection can encourage more thoughtful public conversation and help younger generations appreciate experiences that are absent from textbooks. Paul is right that journalism and psychology contribute directly to communication and growth, but the arts complement those fields by giving information a memorable human form. When artistic work is grounded in evidence and context, it does more than entertain. It preserves culture, invites reflection, and creates a common space in which people can examine social values."},
                    {"title": "Arts Mainly as Personal Value",
                     "text": "I agree more with Paul that the arts are primarily valuable for enjoyment and personal expression, while other fields usually have a more direct effect on social communication and growth. Artistic works can inspire reflection, but their meanings are often ambiguous and may be interpreted very differently by different audiences. For example, when a community must respond to a public-health problem, clear reporting and psychological research can explain risks, identify effective behavior, and measure whether a policy is working. A play or painting about the same issue may attract attention, but it cannot replace reliable data or practical guidance. Claire is correct that art can preserve traditions, yet historical archives, education, and journalism can preserve them more systematically and make the evidence easier to verify. The arts still deserve support because recreation, beauty, and creative expression improve people's lives. However, their wider social influence should not be overstated when more specialized disciplines provide clearer tools for solving collective problems."},
                ],
            },
        ],
    }


def build_speaking():
    instr_r = "You are learning how to give new students a tutorial on how to register for classes at the university. Listen to the speaker and repeat what she says. Repeat only once."
    instr_i = "You are taking part in an interview about setting personal goals. Listen to each question and answer in your own words."
    repeats = [
        (1, 15, "It's time for us to begin our lesson."),
        (2, 15, "First, please click on the course catalog."),
        (3, 15, "Update your student profile information in the system."),
        (4, 15, "You can then check your timetable to avoid scheduling conflicts."),
        (5, 15, "To enroll in a class, select the registration button."),
        (6, 15, "Be sure to review your schedule before your classes officially start."),
        (7, 18, "If you have questions, please refer to the help section for quick and easy answers."),
    ]
    interviews = [
        (8, "Thank you for agreeing to participate. I'd like to ask you some questions about your experiences with setting personal goals. First, think of a time, recent or not, when you had something you wanted to achieve. What was it?",
         "A goal I recently set was to complete a professional certificate while working full time. I wanted to improve my skills, but I knew that simply saying I would study was not enough. I divided the course into weekly units and reserved forty minutes after dinner on four weekdays. I also completed one practice task every Saturday. The schedule was demanding at first, especially when work became busy, but the smaller milestones kept the goal manageable. After two months, I finished the course and passed the final assessment. More importantly, the experience taught me that a clear plan and steady habits are more useful than waiting until I feel especially motivated."),
        (9, "In general, how do you handle difficulties or obstacles that come up while working toward what you want to achieve?",
         "When I face an obstacle, I first identify whether the problem is caused by time, knowledge, or resources. Then I adjust one part of my plan instead of abandoning the whole goal. For example, if I cannot understand a difficult topic, I look for a simpler explanation, ask someone with more experience, and schedule a short review session the next day. I also track small improvements because they show that the effort is working. If the original deadline becomes unrealistic, I revise it honestly but keep a specific new date. This approach helps me stay calm. Obstacles become information about what needs to change, rather than proof that I should stop."),
        (10, "In your opinion, how important is goal setting for personal growth?",
         "I think goal setting is extremely important for personal growth because it gives effort a clear direction and makes progress visible. Without a goal, people may stay busy but repeat the same habits. A useful goal forces us to decide what matters, identify the skills we need, and measure whether our actions are effective. It also builds confidence when we complete small steps. However, goals should be flexible. If circumstances change or new information shows that a plan is unsuitable, revising the goal is a sign of good judgment, not failure. In my view, the best goals are specific enough to guide daily decisions but flexible enough to support learning and long-term development."),
        (11, "Do you think children should be taught to set personal goals from an early age? Why or why not?",
         "Yes, children should learn to set personal goals from an early age, as long as adults keep the process supportive and age-appropriate. A young child might choose to read a short book independently, practice a musical passage, or keep a room organized for one week. The purpose is not to create pressure or competition. It is to teach planning, patience, and reflection. Parents and teachers can help children break a goal into small actions and then discuss what worked. Children should also learn that changing a goal is acceptable when the plan is unrealistic. This balanced approach can build responsibility and confidence while preventing goal setting from becoming a source of unnecessary stress."),
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
    return {
        "id": "2025-09-19",
        "title": "新托福 9.19 · 口语",
        "set": "9.19",
        "skill": "speaking",
        "modules": [
            {"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"},
            {"n": 2, "timeSec": 360, "from": 8, "to": 11, "label": "Take an Interview"},
        ],
        "tasks": tasks,
    }


def copy_audio():
    dest = os.path.join(ROOT, "library/toefl/audio/2025-09-19")
    os.makedirs(dest, exist_ok=True)
    for name in os.listdir(SRC):
        if name.endswith(".mp3"):
            shutil.copy2(os.path.join(SRC, name), os.path.join(dest, name))
    print("audio", len([n for n in os.listdir(dest) if n.endswith(".mp3")]), "files")


if __name__ == "__main__":
    copy_audio()
    dump("2025-09-19-reading.json", build_reading())
    dump("2025-09-19-listening.json", build_listening())
    dump("2025-09-19-writing.json", build_writing())
    dump("2025-09-19-speaking.json", build_speaking())
