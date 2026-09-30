#!/usr/bin/env python3
"""Build 8.08 Enhanced TOEFL. Run: python3 scripts/build_toefl_808.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/8 月/8.08/audio/item_level"
AUDIO = "library/toefl/audio/2025-08-08/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-08-08"
SET = "8.08"
TITLE = "新托福 8.08"


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
    t1, n = cw("The Louisiana Purchase", 1, 1, [
        "The Louisiana Purchase of 1803 was a landmark diplomatic agreement in which the United States ",
        ("acqui", "acquisition"),
        " approximately 828,000 square miles of territory from France for $15 million. Negotiated under President Thomas Jefferson, the acquisition nearly ",
        ("dou", "doubled"),
        " the ",
        ("la", "land"),
        " area ",
        ("o", "of"),
        " the ",
        ("nat", "nation"),
        " and ",
        ("sec", "secured"),
        " access ",
        ("t", "to"),
        " key ",
        ("inl", "inland"),
        " waterways ",
        ("a", "and"),
        " trade ",
        ("hu", "hubs"),
        " essential for economic expansion. The purchase also affirmed the principle of implied powers within the United States Constitution, setting a precedent for future territorial growth.",
    ])
    t2, n = cw("Climate Change", 1, n, [
        "Global temperatures and weather patterns are experiencing notable shifts, which scientific research strongly associates with human-related factors. Activities ",
        ("su", "such"),
        " as ",
        ("t", "the"),
        " use ",
        ("o", "of"),
        " fossil ",
        ("fu", "fuels"),
        ", changes ",
        ("i", "in"),
        " land ",
        ("u", "use"),
        ", and industrial ",
        ("produ", "production"),
        " contribute ",
        ("t", "to"),
        " the ",
        ("accumu", "accumulation"),
        " of ",
        ("green", "greenhouse"),
        " gases in the atmosphere. These gases retain heat, gradually increasing the Earth's average temperature. If emissions continue at current levels, potential outcomes may include more frequent extreme weather events, rising sea levels, and disruptions to ecosystems. Experts emphasize that timely and coordinated efforts are essential to reduce risks and promote long-term environmental stability.",
    ])
    t3, n = cw("Mughal Painting", 2, 36, [
        "The Mughal Empire, which ruled much of South Asia from 1526 to 1857, was a powerful Islamic dynasty known for its administrative sophistication and cultural patronage. Mughal paintings, particularly miniature illustrations, blended Persian, Indian, and Central Asian artistic traditions. These ",
        ("sma", "small"),
        " works, ",
        ("commis", "commissioned"),
        " by Mughal ",
        ("empe", "emperors"),
        ", often ",
        ("depi", "depicted"),
        " royal ",
        ("li", "life"),
        ", historical ",
        ("eve", "events"),
        ", and ",
        ("sce", "scenes"),
        " from ",
        ("myth", "mythology"),
        " with ",
        ("remar", "remarkable"),
        " detail ",
        ("a", "and"),
        " realism. As court-sponsored art, they reflected imperial wealth, political authority, and cross-cultural exchange, serving both aesthetic and documentary purposes within a thriving economy supported by trade, agriculture, and centralized governance.",
    ])
    if n != 46:
        raise SystemExit("mughal expected next 46, got %s" % n)
    return paper("reading", "阅读", [
        {"n": 1, "timeSec": 1260, "from": 1, "to": 35},
        {"n": 2, "timeSec": 540, "from": 36, "to": 50},
    ], [
        t1, t2,
        daily("Dining Around Campus", 1, "Read a blog post.", {
            "kind": "card",
            "kicker": "Eastwood Campus Life",
            "title": "Dining Around Campus",
            "body": (
                "At Eastwood University, students enjoy diverse dining choices.\n\n"
                "The Green Eatery serves only vegan meals, while The Garden Patch offers vegetarian dishes with dairy and eggs. "
                "Crossroads Kitchen features Asian fusion and is gaining fans. Baxter's Brew remains a campus favorite for coffee and pastries."
            ),
        }, [
            q(21, "What is the main purpose of the post?", {
                "A": "To inform students about campus dining options",
                "B": "To explain the benefits of vegan food",
                "C": "To review restaurants located off campus",
                "D": "To announce the opening of a new restaurant",
            }, "A"),
            q(22, "Which place would most likely NOT offer a full cooked-to-order meal?", {
                "A": "The Green Eatery",
                "B": "The Garden Patch",
                "C": "Crossroads Kitchen",
                "D": "Baxter's Brew",
            }, "D"),
        ]),
        daily("MovieMania", 1, "Read a webpage.", {
            "kind": "card",
            "kicker": "www.moviemania.com",
            "title": "Welcome to MovieMania",
            "body": (
                "Your ultimate source for movie reviews, trailers, and news.\n\n"
                "Discover the latest releases, read in-depth reviews, and watch trailers of upcoming films.\n\n"
                "Join our community to discuss your favorite movies and get recommendations.\n\n"
                "Visit us at www.moviemania.com."
            ),
        }, [
            q(23, "What is the main purpose of the webpage?", {
                "A": "To sell movie tickets",
                "B": "To advertise films",
                "C": "To provide information about movies",
                "D": "To host film competitions",
            }, "C"),
            q(24, "Where can visitors go to talk about their favorite movies?", {
                "A": "In the trailers section",
                "B": "In the community section",
                "C": "In the reviews section",
                "D": "In the news section",
            }, "B"),
        ]),
        daily("Remote-learning assignment", 1, "Read a text-message chain.", {
            "kind": "card",
            "title": "Group chat",
            "body": (
                "Colin · 8:20 P.M.\n"
                "I'm still wrestling with this week's assignment. I get it that we have to evaluate the long-term implications of remote learning, but that feels incredibly broad.\n\n"
                "Priya · 8:22 P.M.\n"
                "I had the same reaction. I think the goal is to show we can take a position and use evidence to back it up, not cover every possible angle.\n\n"
                "Mateo · 8:26 P.M.\n"
                "Agreed. I'm focusing on how online courses affect students' motivation over time. There's plenty of research, but the findings contradict each other, which makes the analysis tricky.\n\n"
                "Colin · 8:29 P.M.\n"
                "Exactly. Every article I read raises a different concern—participation, cognitive load, course design. It's hard to figure out which thread to prioritize.\n\n"
                "Priya · 8:31 P.M.\n"
                "I'd pick the one you can argue most clearly. The professor said clarity matters more than trying to sound comprehensive."
            ),
        }, [
            q(25, "What problem does Colin have with the assignment?", {
                "A": "He cannot find research about remote learning.",
                "B": "He thinks the topic is too general.",
                "C": "He disagrees with the professor's position.",
                "D": "He does not understand the deadline.",
            }, "B"),
            q(26, "What does Priya say is the main purpose of the assignment?", {
                "A": "To summarize every possible issue",
                "B": "To compare all published research",
                "C": "To choose a viewpoint and support it with evidence",
                "D": "To design a new online course",
            }, "C"),
            q(27, "What is Colin struggling to decide?", {
                "A": "Which topic to prioritize",
                "B": "Which professor to interview",
                "C": "Whether to change courses",
                "D": "How to collect student data",
            }, "A"),
        ]),
        daily("Maplewood water notice", 1, "Read a notice.", {
            "kind": "card",
            "title": "ATTENTION RESIDENTS!",
            "subtitle": "Water Service Interruption",
            "body": (
                "Due to necessary maintenance on the main water line, water service will be temporarily interrupted for all residents in Maplewood dormitory.\n\n"
                "Date and Time: Monday, March 15 | 9:00 A.M.–4:00 P.M.\n\n"
                "Preparation: Fill containers with water for drinking and cooking. Store enough water for personal hygiene needs.\n\n"
                "During the Interruption: Do not use faucets, showers, or water appliances. Toilets may not function, so plan accordingly.\n\n"
                "After Service Resumes: Run cold water for a few minutes to clear sediment. Check for leaks and report them to maintenance.\n\n"
                "Contact: Maplewood Maintenance Department | 555-4321\n\n"
                "We apologize for the inconvenience as we improve the community's water infrastructure."
            ),
        }, [
            q(28, "What is the notice primarily about?", {
                "A": "Providing safety tips during a storm",
                "B": "Announcing a disruption to a service",
                "C": "Giving instructions for a new appliance",
                "D": "Promoting a community water park",
            }, "B"),
            q(29, "What are residents advised to do before the interruption?", {
                "A": "Leave the dormitory",
                "B": "Report all existing leaks",
                "C": "Avoid using cold water",
                "D": "Store enough water for the day",
            }, "D"),
            q(30, "What is suggested about the maintenance work?", {
                "A": "It will permanently reduce water service.",
                "B": "It is part of an effort to improve infrastructure.",
                "C": "It affects only the kitchen area.",
                "D": "It was requested by residents.",
            }, "B"),
        ]),
        academic("Polarized Light's Surprising Applications", 1, [
            "Polarized light, characterized by waves vibrating in a single plane, offers applications beyond its familiar use in sunglasses, where it reduces glare from reflective surfaces like water and roads. In certain scientific fields, it is invaluable for revealing hidden properties of materials. For instance, when researchers study the internal structure of crystals, polarized light provides insights that normal light cannot, by interacting differently with the distinct optical paths within the crystal lattice.",
            {"insert": "A", "t": "In biology, polarized light uncovers structural details of cells and tissues, facilitating breakthroughs in understanding cellular organization and disease mechanisms."},
            {"insert": "B", "t": "This is true for birefringent materials, which alter the polarization of light in ways that reveal microstructural patterns such as fiber alignment and intracellular organization, helping scientists assess variations in cell density and composition."},
            {"insert": "C", "t": "Such techniques have been instrumental in identifying amyloid plaques in brain tissue, an indication of Alzheimer's disease."},
            {"insert": "D", "t": "However, the use of polarized light is not universally beneficial. In aviation, pilots may avoid polarized lenses because they can obscure critical visual cues, such as instrument readings, that are essential for navigation. Thus, while polarized light can solve certain visibility issues by reducing glare, it may also interfere with necessary visual information, prompting careful consideration of context before implementation."},
        ], [
            q(31, 'The word "invaluable" in the passage is closest in meaning to', {
                "A": "Expensive",
                "B": "Rare",
                "C": "Extremely useful",
                "D": "Difficult to understand",
            }, "C"),
            q(32, "All of the following are mentioned as uses of polarized light in biology EXCEPT", {
                "A": "Revealing fiber alignment",
                "B": "Identifying amyloid plaques",
                "C": "Altering cell structure",
                "D": "Assessing variations in cell density",
            }, "C"),
            q(33, "What can be inferred about polarized light in medicine?", {
                "A": "It may help diagnose disease.",
                "B": "It replaces conventional microscopes.",
                "C": "It is useful only for brain tissue.",
                "D": "It eliminates the need for laboratory analysis.",
            }, "A"),
            q(34, "Why can polarized lenses be dangerous in aviation?", {
                "A": "They make glare stronger.",
                "B": "They distort the shape of aircraft.",
                "C": "They damage navigation instruments.",
                "D": "They can make instrument readings difficult to see.",
            }, "D"),
            insert_q(35, "Applications are not limited to the inorganic world.", "A"),
        ]),
        t3,
        academic("Antimicrobial Resistance Challenges", 2, [
            "Antimicrobial resistance (AMR)—the ability of microorganisms to withstand drugs that once killed them—threatens to reverse decades of medical advancement, posing an urgent public health challenge globally. In particular, the widespread and often indiscriminate use of antibiotics in medicine and agriculture has accelerated the emergence of resistant bacteria. Recognizing the gravity of AMR, the World Health Organization classifies it among the top global health threats, underscoring the critical need for immediate action.",
            "Bacteria develop resistance through a multitude of mechanisms, including genetic mutations and the sharing of genes, which allow them to survive antibiotic treatment and proliferate. Unfortunately, the pharmaceutical industry has been slow to produce new antibiotics, hampered by both scientific obstacles and economic disincentives. Antibiotics often yield lower financial returns compared to medications for chronic diseases. Therefore, they receive less investment.",
            "Addressing AMR requires a comprehensive and coordinated international strategy. Implementing stringent regulations on antibiotic prescriptions can curb misuse but might not eliminate it completely. Financial incentives for pharmaceutical companies could stimulate the development of novel antibiotics. However, this approach remains contentious due to the varying perspectives on economic feasibility. Public health campaigns aimed at educating communities about judicious antibiotic use are vital, but experts continue to debate the most effective combination of strategies.",
        ], [
            q(46, "What is the main purpose of the passage?", {
                "A": "To compare antibiotic policies in several countries",
                "B": "To explain how chronic diseases are treated",
                "C": "To defend agricultural use of antibiotics",
                "D": "To explain a global health challenge and possible responses",
            }, "D"),
            # ponytail: player has no sentence-click; official “identify the sentence” → MCQ
            q(47, "Identify the sentence in paragraph 2 that explains how bacteria can survive antibiotic treatment.", {
                "A": "Bacteria develop resistance through a multitude of mechanisms, including genetic mutations and the sharing of genes, which allow them to survive antibiotic treatment and proliferate.",
                "B": "Unfortunately, the pharmaceutical industry has been slow to produce new antibiotics, hampered by both scientific obstacles and economic disincentives.",
                "C": "Antibiotics often yield lower financial returns compared to medications for chronic diseases.",
                "D": "Therefore, they receive less investment.",
            }, "A"),
            q(48, "Why has the pharmaceutical industry been slow to develop new antibiotics?", {
                "A": "Antibiotics are too easy to manufacture.",
                "B": "Antibiotics generally offer lower financial returns.",
                "C": "Governments prohibit research on antibiotics.",
                "D": "Resistant bacteria no longer respond to any drug.",
            }, "B"),
            q(49, 'The word "comprehensive" in the passage is closest in meaning to', {
                "A": "Temporary",
                "B": "Controversial",
                "C": "Thorough",
                "D": "Local",
            }, "C"),
            q(50, "Which of the following is NOT mentioned as a strategy for addressing AMR?", {
                "A": "Increasing investment in infection-prevention infrastructure",
                "B": "Regulating antibiotic prescriptions",
                "C": "Offering financial incentives for drug development",
                "D": "Educating the public about responsible antibiotic use",
            }, "A"),
        ]),
    ])


def build_listening():
    listen = "Listen to the recording."
    m1 = [
        cr(1, 1, "listening_m1_q01_choose_response.mp3", {
            "A": "Of course, let's work on it together.",
            "B": "I haven't been to the dining hall yet.",
            "C": "The printer should be connected to the network.",
            "D": "No problem—I'm planning to get there early.",
        }, "D"),
        cr(1, 2, "listening_m1_q02_choose_response.mp3", {
            "A": "Let's reschedule our meeting next week.",
            "B": "I don't advise watching that movie.",
            "C": "They should be at the student union.",
            "D": "We've scheduled a meeting about this.",
        }, "C"),
        cr(1, 3, "listening_m1_q03_choose_response.mp3", {
            "A": "There are many restaurants downtown.",
            "B": "Oh, that's interesting.",
            "C": "Yes, Mondays are good for me.",
            "D": "Our study group meets in the library.",
        }, "B"),
        cr(1, 4, "listening_m1_q04_choose_response.mp3", {
            "A": "Not yet, but I'll check them later.",
            "B": "Actually, we have a good chance of winning.",
            "C": "I think so, but I need to choose a topic first.",
            "D": "Sure, it's important to review your notes after class.",
        }, "A"),
        cr(1, 5, "listening_m1_q05_choose_response.mp3", {
            "A": "Yes, the lecture is almost over.",
            "B": "I already canceled it yesterday.",
            "C": "Oh, I wasn't aware of that.",
            "D": "I didn't know some professors share an office.",
        }, "C"),
        cr(1, 6, "listening_m1_q06_choose_response.mp3", {
            "A": "I enjoy live music.",
            "B": "Yes, the author really wrote a masterpiece.",
            "C": "I've never heard of that play.",
            "D": "Probably on campus somewhere.",
        }, "B"),
        cr(1, 7, "listening_m1_q07_choose_response.mp3", {
            "A": "They have great chemistry as friends.",
            "B": "Classes start at eight A.M.",
            "C": "My roommate is taking chemistry.",
            "D": "You can visit the department's website.",
        }, "D"),
        cr(1, 8, "listening_m1_q08_choose_response.mp3", {
            "A": "The university lunch hall is closed.",
            "B": "I found the weather yesterday to be beautiful.",
            "C": "I found it difficult to follow.",
            "D": "The sports complex is still under construction.",
        }, "C"),
        cr(1, 9, "listening_m1_q09_choose_response.mp3", {
            "A": "I'd love to visit there someday.",
            "B": "I'm too busy with extracurricular activities these days.",
            "C": "Robots could probably build that.",
            "D": "I would look downtown.",
        }, "B"),
        cr(1, 10, "listening_m1_q10_choose_response.mp3", {
            "A": "I haven't seen it yet.",
            "B": "I would prefer not to.",
            "C": "Maybe later in class.",
            "D": "Probably on campus.",
        }, "A"),
        cr(1, 11, "listening_m1_q11_choose_response.mp3", {
            "A": "It's on the third floor.",
            "B": "The train departs every day at 5 P.M.",
            "C": "Increase your distance when running around campus.",
            "D": "I enjoy reading mystery novels.",
        }, "C"),
        cr(1, 12, "listening_m1_q12_choose_response.mp3", {
            "A": "Sounds like a plan.",
            "B": "The discussion we had yesterday.",
            "C": "I was happy to meet him.",
            "D": "I don't have a guess.",
        }, "A"),
        clip("conversation", "Concert Tickets", 1, listen,
             "listening_m1_q13_q14_conversation_concert_tickets.mp3", [
            q(13, "What does the woman ask the man about?", {
                "A": "Whether he will go to a concert",
                "B": "When a concert will begin",
                "C": "Where a concert will take place",
                "D": "What section of a concert hall he will sit in",
            }, "A"),
            q(14, "What does the man imply he will do when he says, \"That sounds like something I can't pass up\"?", {
                "A": "Attend a different concert",
                "B": "Buy a general admission ticket",
                "C": "Purchase a VIP ticket",
                "D": "Call one of his friends",
            }, "C"),
        ]),
        clip("conversation", "Literary Discussion", 1, listen,
             "listening_m1_q15_q16_conversation_literary_discussion.mp3", [
            q(15, "What can be inferred about the speakers?", {
                "A": "They are worried about having enough time to finish an assigned reading.",
                "B": "They disagree about the wisdom of a literary character's actions.",
                "C": "They have different opinions about what is exciting for six-year-olds.",
                "D": "They have memories of visiting lighthouses when they were children.",
            }, "B"),
            q(16, "How does the man most likely feel toward Mr. Ramsay?", {
                "A": "Approving",
                "B": "Confused",
                "C": "Hopeful",
                "D": "Offended",
            }, "A"),
        ]),
        clip("conversation", "Research Fair", 1, listen,
             "listening_m1_q17_q18_conversation_research_fair.mp3", [
            q(17, "What does the woman suggest about the research fair?", {
                "A": "She could not find a project that matched her interests.",
                "B": "She missed most of it due to a prior commitment.",
                "C": "She was impressed by how crowded it was.",
                "D": "She was surprised by how small it was.",
            }, "A"),
            q(18, "What does the woman say about Professor Bennett's project?", {
                "A": "It focuses on a mountain habitat.",
                "B": "It has an extended application deadline.",
                "C": "It involves the type of research she is passionate about.",
                "D": "It requires advanced laboratory skills that she already has.",
            }, "C"),
        ]),
        clip("announcement", "Composting Initiative", 1, listen,
             "listening_m1_q19_q20_announcement_composting_announcement.mp3", [
            q(19, "What will Monday's event include?", {
                "A": "A discussion on ways to preserve food items",
                "B": "A demonstration of peeling fruit and grinding coffee",
                "C": "A tour of composting facilities",
                "D": "A practice session on identifying compostable items",
            }, "D"),
            q(20, "Why does the speaker mention the environmental film festival?", {
                "A": "To explain how students can learn more about composting",
                "B": "To show how the popularity of composting has increased",
                "C": "To announce a prize that will be given out",
                "D": "To highlight the variety of events that occur on campus",
            }, "C"),
        ]),
        clip("announcement", "Student Break", 1, listen,
             "listening_m1_q21_q22_announcement_student_break_announcement.mp3", [
            q(21, "What is the purpose of the event described in the announcement?", {
                "A": "To provide students an enjoyable break",
                "B": "To introduce new faculty members",
                "C": "To showcase student musicians",
                "D": "To provide information about final exams",
            }, "A"),
            q(22, "Why should students contact the activities coordinator?", {
                "A": "To suggest games or activities",
                "B": "To indicate whether they will be attending",
                "C": "To offer to help set up",
                "D": "To donate prizes",
            }, "C"),
        ]),
        clip("announcement", "Office Hours", 1, listen,
             "listening_m1_q23_q24_announcement_office_hours_announcement.mp3", [
            q(23, "What has changed about the professor's office hours?", {
                "A": "They now take place on an additional day.",
                "B": "They are now held online through the course website.",
                "C": "They have been canceled for the next two weeks.",
                "D": "Students must always reserve a time in advance.",
            }, "A"),
            q(24, "Why does the professor have limited availability at certain times?", {
                "A": "She is available only on Wednesdays.",
                "B": "She is attending a conference.",
                "C": "She is working on a book.",
                "D": "She is helping students choose courses.",
            }, "D"),
        ]),
        clip("lecture", "Gift Giving", 1, listen,
             "listening_m1_q25_q28_lecture_gift_giving.mp3", [
            q(25, "What is the main topic of the talk?", {
                "A": "How gift giving reflects social status",
                "B": "How gift giving customs have changed over time",
                "C": "How gift giving carries cultural and social meaning",
                "D": "How gift giving affects emotional well-being",
            }, "C"),
            q(26, "What does the speaker suggest about gift giving in Indigenous communities?", {
                "A": "It is mainly used to distribute wealth evenly.",
                "B": "It is discouraged during formal gatherings.",
                "C": "It is a way to display wealth and status.",
                "D": "It helps maintain social ties within the group.",
            }, "D"),
            q(27, "What point does the speaker make about the continuous loop of gift giving?", {
                "A": "It helps preserve traditional customs.",
                "B": "It encourages people to spend more on gifts over time.",
                "C": "It strengthens relationships through ongoing exchange.",
                "D": "It can sometimes feel excessive or unnecessary.",
            }, "C"),
            q(28, "Why does the speaker mention potted plants?", {
                "A": "To show how eco-friendly gifts are universally accepted",
                "B": "To give an example of a gift that may be misinterpreted",
                "C": "To illustrate how gift giving can reflect personal taste",
                "D": "To compare traditional and modern gift preferences",
            }, "B"),
        ]),
        clip("lecture", "Lean Manufacturing", 1, listen,
             "listening_m1_q29_q32_lecture_lean_manufacturing.mp3", [
            q(29, "The main topic of the talk concerns what aspect of manufacturing?", {
                "A": "Efficiency in the automobile industry",
                "B": "An approach to reducing waste and increasing productivity",
                "C": "The origins of the concept of lean manufacturing",
                "D": "Resistance to innovation by senior management",
            }, "B"),
            q(30, "Why does the speaker mention supermarkets in the United States?", {
                "A": "To argue that industry in the United States perfected lean manufacturing",
                "B": "To show that lean manufacturing has been adopted worldwide",
                "C": "To explain where the Japanese first observed just-in-time inventory management",
                "D": "To support the claim that efficiency requires continuous improvement",
            }, "C"),
            q(31, "What does the speaker say about the organizational culture of companies that do lean manufacturing?", {
                "A": "It must undergo a change if lean manufacturing is to be implemented.",
                "B": "Some companies' cultures do not require much improvement.",
                "C": "Culture change need not affect employees at all levels of an organization.",
                "D": "If lean practices are properly implemented, the company culture will follow.",
            }, "A"),
            q(32, "How does the speaker organize the talk?", {
                "A": "He compares advantages and disadvantages.",
                "B": "He provides a detailed history.",
                "C": "He outlines implementation stages.",
                "D": "He lists and describes the main principles.",
            }, "D"),
        ]),
    ]
    m2 = [
        cr(2, 33, "listening_m2_q01_choose_response.mp3", {
            "A": "Meet me in the lab at 6:30.",
            "B": "It's about a five-minute walk.",
            "C": "The experiment requires that you continue.",
            "D": "Yes, I thought so too.",
        }, "A"),
        cr(2, 34, "listening_m2_q02_choose_response.mp3", {
            "A": "Our vacation was very relaxing, thank you.",
            "B": "I read about that in an article today.",
            "C": "Let's hope it's an easy read.",
            "D": "I haven't watched the movie adaptation.",
        }, "C"),
        cr(2, 35, "listening_m2_q03_choose_response.mp3", {
            "A": "Yes, I think that's what she meant.",
            "B": "Wasn't the professor aware of the schedule change?",
            "C": "We need to choose an essay topic today, right?",
            "D": "I think she implied that we misunderstood the book.",
        }, "A"),
        clip("conversation", "Board Game Development", 2, listen,
             "listening_m2_q04_q05_conversation_board_game_development.mp3", [
            q(36, "Why do board game developers host events at universities?", {
                "A": "University students have free time to attend.",
                "B": "Universities have space to host events.",
                "C": "University students provide helpful feedback.",
                "D": "University students enjoy playing board games.",
            }, "C"),
            q(37, "What does the woman mention about Silverton Studios at the end?", {
                "A": "It sells a board game she finds confusing.",
                "B": "It occasionally hires recent university graduates.",
                "C": "It compensates students for donating their time.",
                "D": "It hosts events at an office in the city.",
            }, "C"),
        ]),
        clip("conversation", "Basketball Game", 2, listen,
             "listening_m2_q06_q07_conversation_basketball_game.mp3", [
            q(38, "Why is the man unable to join the woman?", {
                "A": "He is scheduled to work a shift in the library.",
                "B": "He needs to work on a sociology paper.",
                "C": "He and his roommate are going to a basketball game.",
                "D": "He is helping someone prepare for an exam.",
            }, "D"),
            q(39, "What does the woman suggest about her college's basketball team?", {
                "A": "Its previous season was disappointing.",
                "B": "It is not likely to win tonight's game.",
                "C": "Its game against Summit Tech will be postponed.",
                "D": "It is likely to improve over the course of the season.",
            }, "B"),
        ]),
        clip("lecture", "Geographic Information Systems", 2, listen,
             "listening_m2_q08_q11_lecture_geographic_information_systems.mp3", [
            q(40, "What does the speaker mainly discuss?", {
                "A": "A satellite that improves navigation",
                "B": "A debate about GPS and GIS",
                "C": "Ways GIS can help with informed decisions",
                "D": "Environmental benefits of GIS",
            }, "C"),
            q(41, "Why does the speaker mention phones?", {
                "A": "To distinguish between GPS and GIS",
                "B": "To emphasize GIS convenience",
                "C": "To explain GIS storage",
                "D": "To describe GPS images",
            }, "A"),
            q(42, "Why does the speaker discuss a trucking company?", {
                "A": "To emphasize shipping challenges",
                "B": "To demonstrate uses of location data",
                "C": "To explain environmental effects",
                "D": "To show how GPS changed shipping",
            }, "B"),
            q(43, "What can GIS predict about farms?", {
                "A": "Where farming chemicals will end up",
                "B": "When farmers should plant",
                "C": "Whether streams make fertilizer less useful",
                "D": "What effect a building will have on crops",
            }, "A"),
        ]),
        clip("lecture", "Galápagos Tortoises", 2, listen,
             "listening_m2_q12_q15_lecture_galapagos_tortoises.mp3", [
            q(44, "Why were animals moved from one Galápagos island to another?", {
                "A": "To restore an ecosystem",
                "B": "To increase tourism",
                "C": "To prevent extinction",
                "D": "To provide better living conditions",
            }, "A"),
            q(45, "What difference is noted between Santa Fe and Española Islands?", {
                "A": "One is closer to the mainland.",
                "B": "More tourists visit one.",
                "C": "One has more cactus species.",
                "D": "Tortoises went extinct on one but not the other.",
            }, "D"),
            q(46, "What does the speaker say about a species of cactus?", {
                "A": "Only one tortoise species eats it.",
                "B": "Its fruit is larger.",
                "C": "It benefited from the reintroduction of a tortoise species.",
                "D": "Its seeds are difficult to digest.",
            }, "C"),
            q(47, "What was one result of introducing tortoises to the island?", {
                "A": "The tortoise population disappeared.",
                "B": "Tourism immediately increased.",
                "C": "It was too early to determine the full result.",
                "D": "New plant species became common.",
            }, "C"),
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
        sent(1, "Are you planning to go to the rescheduled class tomorrow?", "I have ",
             ["go", "to", "class", "to", "no plans", "that"],
             ["no plans", "to", "go", "to", "that", "class"]),
        sent(2, "We need to submit the proposal by the end of the week.", "Have you ",
             ["finished", "have", "it", "writing", "you"],
             ["finished", "writing", "it"], " yet?"),
        sent(3, "I need to buy a gift for my classmate's birthday.", "",
             ["of", "your classmate", "does", "kind", "things", "What", "like"],
             ["What", "kind", "of", "things", "does", "your classmate", "like"], "?"),
        sent(4, "A new student was asking about the literature course.", "She wanted ",
             ["was", "which novel", "to know", "assigned"],
             ["to know", "which novel", "was", "assigned"]),
        sent(5, "The language lab software update includes several new features.", "",
             ["bugs", "the previous", "it resolves", "Do you", "know if"],
             ["Do you", "know if", "it resolves", "the previous", "bugs"], "?"),
        sent(6, "There will be a time-management workshop next week.", "",
             ["be conducted", "Do you", "in person", "know if", "it will", "online or"],
             ["Do you", "know if", "it will", "be conducted", "online or", "in person"], "?"),
        sent(7, "Why don't you use the new software?", "",
             ["last month", "has a", "of", "they released", "The version", "lot"],
             ["The version", "they released", "last month", "has a", "lot", "of"], " bugs."),
        sent(8, "Which study method works best for you?", "The ",
             ["tutor recommended", "work", "best", "seems", "to", "technique", "that my"],
             ["technique", "that my", "tutor recommended", "seems", "to", "work", "best"]),
        sent(9, "Why did you miss the class party?", "",
             ["received", "The invitation", "wrong", "had", "I", "the"],
             ["The invitation", "I", "received", "had", "the", "wrong"], " address."),
        sent(10, "Which off-campus gym do you prefer?", "The gym ",
             ["my", "is", "the gym", "equipment", "the latest", "that has"],
             ["that has", "the latest", "equipment", "is", "my"], " favorite."),
        {
            "type": "email", "module": 2, "id": 11,
            "instruction": "Write an email. In your email, do the following:",
            "prompt": (
                "You recently joined the campus gym and have been enjoying the facilities. "
                "However, you have noticed that some of the equipment is not properly maintained. "
                "You need to contact the gym manager, Mr. Adams, to report the issue and suggest improvements."
            ),
            "bullets": [
                "Mention specifically what you like most about the gym.",
                "Describe the issues with the equipment and the potential risks.",
                "Suggest ways to improve the equipment.",
            ],
            "to": "Mr. Adams", "subject": "Concerns About Equipment",
            "sampleSubject": "Concerns About Equipment",
            "sample": (
                "Dear Mr. Adams,\n\n"
                "I recently joined the campus gym, and I especially appreciate the wide range of cardio machines and the clean workout areas. "
                "The treadmills make it easy to exercise between classes, and the staff members are always welcoming.\n\n"
                "However, I have noticed that two treadmills shake at higher speeds, and one exercise bike has a loose seat. "
                "These problems could cause someone to lose balance or become injured, particularly during a busy period when students may use the machines without noticing the warning signs.\n\n"
                "Could the gym temporarily label these machines as unavailable and arrange a professional inspection? "
                "A short weekly maintenance check and a simple QR code for reporting equipment problems would also help the staff respond more quickly.\n\n"
                "Thank you for looking into this matter.\n\n"
                "Sincerely,\nA Student"
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
            "class": "Art History",
            "professor": {
                "name": "Dr. Gupta", "photo": PHOTO + "diaz.png",
                "text": (
                    "Today we'll discuss the dynamic role of art in society. Clearly, art can be a powerful form of expression and communication that can challenge societal norms and help society progress. "
                    "On the other hand, some people believe that art primarily serves as a way to preserve both the history and heritage of a people, a country, or even a civilization. "
                    "Which do you believe plays a larger role in the significance of art in society? Why?"
                ),
            },
            "posts": [
                {"name": "Claire", "photo": PHOTO + "kelly.png",
                 "text": "I think that art can challenge societal norms by presenting alternative perspectives to conventional thinking. For instance, abstract art often provokes critical thinking about established norms and deeply held beliefs. In doing so, it encourages audiences to open their minds to new possibilities and to effect change."},
                {"name": "Paul", "photo": PHOTO + "andrew.png",
                 "text": "I believe that art's role in preserving heritage is its most important role. As the world becomes more globalized, different cultures are losing their identities because they have been forced to adapt to the modern world. The arts have the power to prevent languages from being lost, can preserve important cultural traditions, and remind us of what makes us unique."},
            ],
            "samples": [
                {"title": "Art as Social Change",
                 "text": (
                     "I agree with Claire that art's greatest social significance is its ability to challenge accepted ideas. "
                     "A powerful artwork can make an issue visible before institutions are ready to discuss it. "
                     "For example, a public exhibition about housing inequality could combine photographs, residents' recorded stories, and maps showing displacement. "
                     "Viewers would not receive only statistics; they would confront the human consequences of policy choices. "
                     "That emotional and visual experience could encourage community discussion, influence local journalism, and pressure officials to reconsider harmful practices. "
                     "Paul's point about preserving heritage is important, but preservation alone can turn art into a record of the past. "
                     "Art remains socially vital when it helps people examine the present and imagine alternatives. "
                     "By questioning assumptions and giving marginalized groups a public voice, art can change what a society considers normal or acceptable."
                 )},
                {"title": "Art as Cultural Memory",
                 "text": (
                     "I agree more with Paul that preserving heritage is art's most enduring contribution. "
                     "Social criticism can be powerful, but its influence may depend on a particular moment. "
                     "Cultural works can connect generations long after the original debate has ended. "
                     "For example, a community museum might preserve traditional songs, weaving patterns, oral histories, and festival performances from a minority group. "
                     "Schools could then use those materials to teach younger members the language and values behind the traditions. "
                     "The result would be more than nostalgia: people would retain a shared identity and outsiders would gain a more accurate understanding of the culture. "
                     "Claire is right that art can challenge norms, yet a society also needs a reliable cultural memory from which to evaluate change. "
                     "By protecting stories and practices that might otherwise disappear, art gives future generations the evidence and confidence needed to understand who they are."
                 )},
            ],
        },
    ])


def build_speaking():
    instr_r = (
        "You are volunteering at the local community center near campus. "
        "A chef is training you how to teach children the steps for baking cookies. "
        "Listen to the chef and repeat what the chef says. Repeat only once."
    )
    instr_i = (
        "You have agreed to participate in a research study about people's experiences with weather. "
        "The researcher will ask you some questions. Listen to each question and answer in your own words."
    )
    repeats = [
        (1, 15, "Begin by mixing the butter and sugar."),
        (2, 15, "Spread the dough so the cookies bake evenly."),
        (3, 15, "Preheat the oven to the appropriate temperature."),
        (4, 15, "Evenly space the cookie shapes onto the baking sheet."),
        (5, 15, "Insert the tray and bake until the cookie edges are golden."),
        (6, 18, "After the baking time is complete, cool the cookies on the rack for five minutes."),
        (7, 18, "Pour yourself a glass of milk and enjoy warm cookies fresh out of the oven."),
    ]
    interviews = [
        (8, "Typically, what is the weather like during the year in the place where you live?",
         "The place where I live has four noticeable seasons, although the summers are the longest. "
         "From June through August, the weather is hot and humid, and afternoon temperatures often rise above thirty degrees Celsius. "
         "Spring and autumn are milder, with comfortable temperatures and occasional rain. "
         "Winter is usually cool rather than extremely cold, but windy days can feel much colder. "
         "The weather can also change quickly when a storm approaches, so people often check the forecast before making outdoor plans. "
         "Overall, the climate is manageable, but summer heat and sudden rain are the two conditions that affect daily life most often."),
        (9, "How do you usually prepare for a day when the weather is very hot?",
         "When the forecast predicts a very hot day, I plan my schedule so I can avoid being outdoors during the hottest part of the afternoon. "
         "I wear light, breathable clothing, carry a bottle of water, and use sunscreen if I need to walk across campus. "
         "At home, I close the curtains before noon and use a fan or air conditioner only when necessary. "
         "I also choose lighter meals and avoid intense exercise outside. If I want to run, I go early in the morning or after sunset. "
         "These simple steps help me stay comfortable and prevent dehydration or heat exhaustion."),
        (10, "How do you usually prepare for a day when the weather forecast predicts rain?",
         "When rain is predicted, I first check the hourly forecast because that helps me decide whether I need a small umbrella or a waterproof jacket. "
         "I place important papers and electronics in a sealed section of my bag, and I wear shoes that will not become slippery on wet pavement. "
         "If the rain may be heavy, I leave home earlier because buses and traffic often move more slowly. "
         "I also change outdoor plans when thunderstorms are expected. "
         "Preparing this way takes only a few minutes, but it keeps my belongings dry and reduces the chance that bad weather will make me late."),
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
        {"n": 2, "timeSec": 270, "from": 8, "to": 10, "label": "Take an Interview"},
    ], tasks)


def copy_audio():
    dest = os.path.join(ROOT, "library/toefl/audio/2025-08-08")
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
    q01 = os.path.join(dest, "speaking_take_interview_q01.mp3")
    q02 = os.path.join(dest, "speaking_take_interview_q02.mp3")
    # ponytail: source folder has no q02 clip (only q01/q03). Stem is on screen.
    # Ceiling: student hears Q1 prompt again. Upgrade: slice Speaking.mp3 when ffmpeg exists.
    if os.path.isfile(q01) and not os.path.isfile(q02):
        shutil.copy2(q01, q02)
        os.chmod(q02, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
        n += 1
        print("copied interview q01 → q02 (source missing q02)")
    print("audio", n, "files")


if __name__ == "__main__":
    copy_audio()
    dump("2025-08-08-reading.json", build_reading())
    dump("2025-08-08-listening.json", build_listening())
    dump("2025-08-08-writing.json", build_writing())
    dump("2025-08-08-speaking.json", build_speaking())
