#!/usr/bin/env python3
"""Build 7.13 Enhanced TOEFL. Run: python3 scripts/build_toefl_713.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月/7.13/audio/item_level"
AUDIO = "library/toefl/audio/2025-07-13/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-07-13"
SET = "7.13"
TITLE = "新托福 7.13"


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
        "Geography is the study of places, environments, and the relationships between people and their surroundings. Modern geographers use technologies such as geographic information systems (GIS) to collect and analyze spatial data, enabling them to visualize patterns of urban development, resource allocation, and environmental change. This analytical approach ",
        ("allo", "allows"),
        " geographers ",
        ("t", "to"),
        " provide ",
        ("insi", "insights"),
        " into ",
        ("pre", "pressing"),
        " global ",
        ("iss", "issues"),
        " such ",
        ("a", "as"),
        " climate ",
        ("cha", "change"),
        ", ",
        ("migra", "migration"),
        ", ",
        ("a", "and"),
        " sustainable ",
        ("deve", "development"),
        ", offering frameworks for informed decision-making and policy implementation. Understanding the geographic dimensions of these challenges is crucial for fostering resilience and adaptability in a rapidly changing world.",
    ])
    t2, n = cw("Museums", 1, n, [
        "Museums play a crucial role in preserving and showcasing art, history, and culture. They provide a space where ",
        ("peop", "people"),
        " can ",
        ("eng", "engage"),
        " with ",
        ("mult", "multiple"),
        " forms ",
        ("o", "of"),
        " artistic ",
        ("expre", "expression"),
        " and ",
        ("histo", "historical"),
        " artifacts. ",
        ("Ma", "Many"),
        " museums ",
        ("al", "also"),
        " offer educational programs and workshops, fostering a deeper understanding of the subjects they display. In addition, digital innovations have enabled museums to reach global ",
        ("aud", "audiences"),
        " through virtual tours and ",
        ("on", "online"),
        " exhibitions, expanding access to knowledge and contributing to the diversity of the cultural landscape.",
    ])
    if n != 21:
        raise SystemExit("m1 cw expected next 21, got %s" % n)
    t3, n = cw("Animal Behavior", 2, 36, [
        "In studying animal behavior, it becomes apparent that social hierarchies play a significant role in the lives of many terrestrial mammals. These hierarchies, often established through displays of dominance and submission, dictate access to resources such as food, mates, and ",
        ("she", "shelter"),
        ", thereby ",
        ("influ", "influencing"),
        " survival ",
        ("a", "and"),
        " reproductive ",
        ("suc", "success"),
        ". Behavioral ",
        ("ecolo", "ecologists"),
        " have ",
        ("obse", "observed"),
        " that such ",
        ("comp", "complex"),
        " ",
        ("soc", "social"),
        " structures can lead to ",
        ("incre", "increased"),
        " group ",
        ("stab", "stability"),
        ", as roles are clearly defined, reducing the frequency of potentially harmful disputes and promoting cooperation among group members.",
    ])
    if n != 46:
        raise SystemExit("m2 cw expected next 46, got %s" % n)
    return paper("reading", "阅读", [
        {"n": 1, "timeSec": 1260, "from": 1, "to": 35},
        {"n": 2, "timeSec": 540, "from": 36, "to": 50},
    ], [
        t1, t2,
        daily("New Air Purification System Invented", 1, "Read an article.", {
            "kind": "card",
            "kicker": "Campus Science Bulletin",
            "title": "New Air Purification System Invented",
            "body": (
                "Researchers in Williamsville University's Chemistry Department have patented an indoor air purification system "
                "that removes 99 percent of airborne particles within minutes. Lead researcher Akira Inoshita says it could "
                "greatly improve classroom air quality. The Facilities Office plans campus-wide installation by next fall."
            ),
        }, [
            q(21, "What is indicated about the air purification system?", {
                "A": "It was created by Williamsville University together with other universities.",
                "B": "It works quickly and highly effectively.",
                "C": "It is currently used in all areas of the university.",
                "D": "It will be installed throughout campus by Akira Inoshita.",
            }, "B"),
            q(22, "What can be inferred about the impact of the air purification system?", {
                "A": "It will need years more of development before it becomes practical.",
                "B": "It will improve air quality at the outdoor stadium.",
                "C": "It will create healthier classroom environments.",
                "D": "It will reduce the university's overall energy use.",
            }, "C"),
        ]),
        daily("Remote-learning assignment", 1, "Read a text-message chain.", {
            "kind": "card",
            "title": "Group chat",
            "body": (
                "Colin · 8:20 P.M.\n"
                "I'm still wrestling with this week's assignment. I get that we have to evaluate the communications of remote learning, but that feels incredibly broad.\n\n"
                "Priya · 8:22 P.M.\n"
                "I had the same reaction. I think the goal is to show we can take a position and use evidence to back it up, not cover every possible angle.\n\n"
                "Mateo · 8:26 P.M.\n"
                "Agreed. I'm focusing on how online courses affect students' motivation over time. There's plenty of research, but the findings contradict each other, which makes the analysis tricky.\n\n"
                "Colin · 8:29 P.M.\n"
                "Exactly. Every article I read raises a different concern—participation, cognitive load, course design. It's hard to figure out which thread to prioritize.\n\n"
                "Priya · 8:31 P.M.\n"
                "I'd pick the one you can argue most clearly. The professor said clarity matters more than trying to sound \"comprehensive.\""
            ),
        }, [
            q(23, "What is the main problem that Colin expresses about the assignment?", {
                "A": "He believes the topic is unimportant.",
                "B": "He finds the topic too general to approach easily.",
                "C": "He does not understand the assignment.",
                "D": "He believes that the prompt makes false assumptions.",
            }, "B"),
            q(24, "What does Priya suggest is the purpose of the assignment?", {
                "A": "To summarize existing research on remote learning",
                "B": "To criticize existing research on remote learning",
                "C": "To choose a viewpoint and support it with arguments",
                "D": "To analyze one's personal experience with online courses",
            }, "C"),
            q(25, "What does Colin struggle with when reviewing the research?", {
                "A": "It discusses too many topics.",
                "B": "It contradicts his own experience.",
                "C": "It relies too heavily on theory.",
                "D": "It is intended for experts only.",
            }, "A"),
        ]),
        academic("Computational Chemistry in Drug Discovery", 1, [
            "Computational chemistry has transformed drug discovery by providing tools to model and predict molecular behavior. Traditionally, drug discovery involved labor-intensive trial and error. Now, with advanced algorithms and powerful computers, researchers can test interactions between drug candidates and biological targets via computer simulations before moving to the lab.",
            {"insert": "A", "t": "One major advantage of computational methods is their ability to analyze vast chemical spaces. For example, machine learning algorithms can predict the binding affinity of millions of compounds to a target protein, narrowing down candidates for testing. This speeds up the discovery process and reduces costs. In one case, researchers identified a promising compound for treating a rare disease in weeks, a task that would have taken years using traditional methods."},
            {"insert": "B", "t": "Moreover, computational chemistry optimizes drug properties. By simulating different modifications to a molecular structure, researchers can predict changes in a drug's efficacy and safety. Repeating and refining this process fine-tunes drug candidates to achieve optimal therapeutic profiles. For example, modifying a molecule to enhance stability in the bloodstream can prevent it from breaking down too quickly, ensuring it reaches its target."},
            {"insert": "C", "t": "Computational predictions must be validated experimentally, as computer models can sometimes produce false positives."},
            {"insert": "D", "t": "Accurately simulating the human body's complex environment remains a formidable task."},
        ], [
            q(26, "The passage suggests that, unlike traditional drug discovery, drug discovery based on computational chemistry", {
                "A": "is far less time-consuming overall",
                "B": "is significantly more expensive to conduct",
                "C": "eliminates the need for lab work",
                "D": "requires a greater number of researchers",
            }, "A"),
            q(27, "According to the passage, how do machine learning algorithms speed up the drug discovery process?", {
                "A": "By narrowing the size of the chemical spaces that need to be analyzed",
                "B": "By helping to eliminate compounds that are not promising for testing",
                "C": "By increasing the number of proteins that can be targeted by compounds",
                "D": "By providing a comprehensive list of drug candidates",
            }, "B"),
            q(28, "According to the passage, what is the purpose of repeatedly simulating various modifications to a molecular structure?", {
                "A": "To create new biological targets",
                "B": "To reduce the number of simulations needed in the long run",
                "C": "To enhance the therapeutic profiles of drug candidates",
                "D": "To eliminate the need for experimental validation",
            }, "C"),
            q(29, "The word 'formidable' in the passage is closest in meaning to", {
                "A": "very challenging",
                "B": "very exciting",
                "C": "urgent",
                "D": "manageable",
            }, "A"),
            insert_q(30, "Despite these advancements, challenges remain.", "C"),
        ]),
        academic("Social Role Theory", 1, [
            "Social role theory is a significant framework in theoretical sociology, explaining how individuals adopt roles based on societal expectations. Society is structured by roles, each with specific behaviors and norms.",
            {"insert": "A", "t": "A key aspect of social role theory is role conflict, which occurs when the expectations of one role clash with those of another."},
            {"insert": "B", "t": "For instance, a person who is both a parent and an employee might struggle to balance caring for their children and meeting work obligations. This conflict can lead to stress and decreased performance in one or both roles. Another important concept is role strain, which is stress within a single role due to competing demands or insufficient resources."},
            {"insert": "C", "t": "An example is a teacher who feels overwhelmed by the need to manage classroom behavior while also keeping lessons engaging. Social role theory also addresses how roles change over time. As society evolves, the expectations attached to roles can shift."},
            {"insert": "D", "t": "For example, the role of women in the workforce has changed dramatically, with increasing acceptance of women in leadership. Understanding these dynamics is crucial for analyzing how social structures impact individual behavior and societal change."},
        ], [
            q(31, "The word 'norms' in the passage is closest in meaning to", {
                "A": "long histories",
                "B": "hidden benefits",
                "C": "practical effects",
                "D": "unwritten rules",
            }, "D"),
            q(32, "Why does the passage mention 'a person who is both a parent and an employee'?", {
                "A": "To show how a person can balance multiple obligations",
                "B": "To imply that roles are not always rigidly defined",
                "C": "To illustrate the concept of role conflict",
                "D": "To emphasize the importance of good childcare",
            }, "C"),
            q(33, "Why does the passage mention 'a teacher'?", {
                "A": "To support the idea that social role theory is often difficult to understand",
                "B": "To explain how a person might experience competing demands within a role",
                "C": "To imply that the resources provided to teachers are often insufficient",
                "D": "To demonstrate how behavioral issues make learning difficult for everyone",
            }, "B"),
            q(34, "The phrase 'these dynamics' in the passage refers to", {
                "A": "the evolution of social roles over time",
                "B": "competition for leadership positions",
                "C": "interactions between men and women in the workforce",
                "D": "decreasing prestige of some social roles",
            }, "A"),
            insert_q(35, "For example, a parent is expected to offer affection and emotional stability to their children, while a soldier is expected to follow orders.", "A"),
        ]),
        t3,
        academic("Antimicrobial Resistance Challenges", 2, [
            "Antimicrobial resistance (AMR), the ability of microorganisms to withstand drugs that once killed them, threatens to reverse decades of medical advancement, posing an urgent public health challenge globally. In particular, the widespread and often indiscriminate use of antibiotics in medicine and agriculture has accelerated the emergence of resistant bacteria. Recognizing the gravity of AMR, the World Health Organization classifies it among the top global health threats, underscoring the critical need for immediate action.",
            "Bacteria develop resistance through a multitude of mechanisms, including genetic mutations and the sharing of genes, which allow them to survive antibiotic treatment and proliferate. Unfortunately, the pharmaceutical industry has been slow to produce new antibiotics, hampered by both scientific obstacles and economic disincentives. Antibiotics often yield lower financial returns compared to medications for chronic diseases. Therefore, they receive less investment.",
            "Addressing AMR requires a comprehensive and coordinated international strategy. Implementing stringent regulations on antibiotic prescriptions can curb misuse but might not eliminate it completely. Financial incentives for pharmaceutical companies could stimulate the development of novel antibiotics. However, this approach remains contentious due to the varying perspectives on economic feasibility. Public health campaigns aimed at educating communities about judicious antibiotic use are vital, but experts continue to debate the most effective combination of strategies.",
        ], [
            q(46, "Why does the author mention the 'indiscriminate use of antibiotics'?", {
                "A": "To make a distinction between how antibiotics are used in healthcare and agriculture",
                "B": "To argue that the World Health Organization has underestimated the extent of the problem",
                "C": "To suggest that the AMR crisis can be easily solved",
                "D": "To explain why AMR is becoming a global health challenge",
            }, "D"),
            # ponytail: player has no sentence-click; official “identify the sentence” → MCQ
            q(47, "Identify the sentence in paragraph 2 that explains how antimicrobial resistance works.", {
                "A": "Bacteria develop resistance through a multitude of mechanisms, including genetic mutations and the sharing of genes, which allow them to survive antibiotic treatment and proliferate.",
                "B": "Unfortunately, the pharmaceutical industry has been slow to produce new antibiotics, hampered by both scientific obstacles and economic disincentives.",
                "C": "Antibiotics often yield lower financial returns compared to medications for chronic diseases.",
                "D": "Therefore, they receive less investment.",
            }, "A"),
            q(48, "Which obstacle to the development of new antibiotics is mentioned in the passage?", {
                "A": "Insurance companies do not support the necessary investment.",
                "B": "Antibiotics are typically less profitable than some other drugs.",
                "C": "Medications for chronic diseases are less complex to produce.",
                "D": "The pace of bacterial gene mutation is too rapid to keep up with.",
            }, "B"),
            q(49, "The word 'comprehensive' in the passage is closest in meaning to", {
                "A": "understandable",
                "B": "well-researched",
                "C": "thorough",
                "D": "cost-effective",
            }, "C"),
            q(50, "The passage mentions each of the following strategies for addressing antimicrobial resistance EXCEPT", {
                "A": "increasing investment in measures for preventing infections",
                "B": "strengthening regulations that govern antibiotic prescriptions",
                "C": "offering financial incentives to drugmakers to develop new antibiotics",
                "D": "educating people worldwide about limiting the use of antibiotics",
            }, "A"),
        ]),
    ])


def build_listening():
    listen = "Listen to the recording."
    m1 = [
        cr(1, 1, "listening_m1_q01_choose_response.mp3", {
            "A": "We usually walk at a moderate pace.",
            "B": "Yes, the seats are filling up quickly.",
            "C": "I don't know where it is.",
            "D": "Sure, but we only have about fifteen minutes.",
        }, "D"),
        cr(1, 2, "listening_m1_q02_choose_response.mp3", {
            "A": "The results have been projected.",
            "B": "I need to check the project timeline.",
            "C": "Deadlines can be stressful.",
            "D": "It's probably in the conference room.",
        }, "B"),
        cr(1, 3, "listening_m1_q03_choose_response.mp3", {
            "A": "It was so great to be outdoors yesterday.",
            "B": "Does the campus music festival last all weekend?",
            "C": "That sounds relaxing, but I'm not very flexible.",
            "D": "No, I don't often jog in the park by my dorm.",
        }, "C"),
        cr(1, 4, "listening_m1_q04_choose_response.mp3", {
            "A": "It started last Monday at noon.",
            "B": "The seminar is about environmental science.",
            "C": "I just saw the changes this morning.",
            "D": "It's located on the east side of campus.",
        }, "C"),
        cr(1, 5, "listening_m1_q05_choose_response.mp3", {
            "A": "The university lunch hall is closed.",
            "B": "Yes, I found the weather yesterday to be beautiful.",
            "C": "I found it difficult to follow.",
            "D": "No, the sports complex is still under construction.",
        }, "C"),
        cr(1, 6, "listening_m1_q06_choose_response.mp3", {
            "A": "I would love to study there.",
            "B": "It's a great place to get everything.",
            "C": "That book has been really popular.",
            "D": "I recommend online courses.",
        }, "D"),
        cr(1, 7, "listening_m1_q07_choose_response.mp3", {
            "A": "I watched a movie last night.",
            "B": "He plays the guitar well.",
            "C": "I found it very interesting.",
            "D": "There's a concert downtown.",
        }, "C"),
        cr(1, 8, "listening_m1_q08_choose_response.mp3", {
            "A": "Not yet, but I'll check them later.",
            "B": "Actually, we have a good chance of winning.",
            "C": "I think so, but I need to choose a topic first.",
            "D": "Sure, it's important to review your notes after class.",
        }, "A"),
        cr(1, 9, "listening_m1_q09_choose_response.mp3", {
            "A": "I'll need to review the agenda.",
            "B": "We meet often.",
            "C": "Usually in the classroom.",
            "D": "It's scheduled for tomorrow.",
        }, "A"),
        cr(1, 10, "listening_m1_q10_choose_response.mp3", {
            "A": "We should leave our dorm early to get there on time.",
            "B": "There is a park near the campus.",
            "C": "That's great, I love hiking in the evening.",
            "D": "What is the nature of your visit?",
        }, "A"),
        cr(1, 11, "listening_m1_q11_choose_response.mp3", {
            "A": "It's on the third floor.",
            "B": "The train departs every day at 5 p.m.",
            "C": "Increase your distance running around campus.",
            "D": "I enjoy reading mystery novels.",
        }, "C"),
        cr(1, 12, "listening_m1_q12_choose_response.mp3", {
            "A": "Yes, the arguments were so logical.",
            "B": "I don't know why today's lecture is postponed.",
            "C": "Our department has guests visiting from abroad.",
            "D": "No, I didn't think you'd show up so late.",
        }, "A"),
        clip("conversation", "Audition", 1, listen,
             "listening_m1_q13_q14_conversation_audition.mp3", [
            q(13, "What advice does the woman give the man about auditions?", {
                "A": "He should get to know the director before the audition.",
                "B": "He should be sure that he is right for the part he is trying out for.",
                "C": "He should be sure to memorize his lines completely.",
                "D": "He should be confident and handle mistakes well.",
            }, "D"),
            q(14, "Why does the woman mention an audition from last year?", {
                "A": "To support the advice she has given the man",
                "B": "To correct a mistake the man has made",
                "C": "To remind the man not to be late to his own audition",
                "D": "To express surprise over what the man has told her",
            }, "A"),
        ]),
        clip("conversation", "Charity Event", 1, listen,
             "listening_m1_q15_q16_conversation_charity_event.mp3", [
            q(15, "What does the woman need?", {
                "A": "A place for community group meetings",
                "B": "More people to help with a charity event",
                "C": "A donation of running shoes",
                "D": "Contact information for local charity groups",
            }, "B"),
            q(16, "What does the man offer to do?", {
                "A": "Sign up for a charity run",
                "B": "Put up posters around town",
                "C": "Contact an art supply store",
                "D": "Make posters about an event",
            }, "D"),
        ]),
        clip("conversation", "New Store", 1, listen,
             "listening_m1_q17_q18_conversation_new_store.mp3", [
            q(17, "What opinion does the man express about a new store?", {
                "A": "He appreciates the friendly service.",
                "B": "He likes its variety.",
                "C": "He thinks it has a convenient location.",
                "D": "He is impressed by the displays.",
            }, "B"),
            q(18, "Why did the man not get anything from the bakery section?", {
                "A": "The items available did not look fresh.",
                "B": "The prices were too high.",
                "C": "He was in a hurry.",
                "D": "He does not usually eat baked goods.",
            }, "C"),
        ]),
        clip("announcement", "Community Service Awards", 1, listen,
             "listening_m1_q19_q20_announcement_awards.mp3", [
            q(19, "What is the main purpose of the announcement?", {
                "A": "To introduce the university auditorium",
                "B": "To provide details about an awards ceremony",
                "C": "To encourage students to engage in community service",
                "D": "To describe volunteer opportunities at the university",
            }, "B"),
            q(20, "Why does the speaker mention public education?", {
                "A": "To provide students with volunteer opportunities",
                "B": "To explain the timing of the awards ceremony",
                "C": "To provide an example of a new award category",
                "D": "To encourage students to attend an event",
            }, "C"),
        ]),
        clip("announcement", "Lab Training", 1, listen,
             "listening_m1_q21_q22_announcement_lab_training.mp3", [
            q(21, "What does the speaker imply about students who had recent training?", {
                "A": "Their current training is sufficient.",
                "B": "They must conduct training for other students.",
                "C": "They have not been following lab procedures.",
                "D": "They must attend Thursday's training.",
            }, "D"),
            q(22, "Why is the training session being held?", {
                "A": "Safety requirements have changed.",
                "B": "It is a regular annual requirement.",
                "C": "There was a recent lab accident.",
                "D": "It is part of new students' orientation.",
            }, "A"),
        ]),
        clip("announcement", "Classroom Papers", 1, listen,
             "listening_m1_q23_q24_announcement_classroom.mp3", [
            q(23, "What should students do every Friday?", {
                "A": "Begin working on their papers",
                "B": "Upload their papers to be graded",
                "C": "Discuss the reading in groups",
                "D": "Check for assignments on the class portal",
            }, "B"),
            q(24, "What is mentioned as a reason to speak with the professor?", {
                "A": "Requesting an explanation of the grading policy",
                "B": "Requesting an extension for an assignment",
                "C": "Asking a question about some reading material",
                "D": "Asking a question about the topic of a paper",
            }, "B"),
        ]),
        clip("lecture", "LED Technology", 1, listen,
             "listening_m1_q25_q28_lecture_physics_led.mp3", [
            q(25, "What does the speaker mainly discuss?", {
                "A": "The historical development of incandescent bulbs",
                "B": "The impact and future potential of LED technology",
                "C": "The disadvantages of consumer use of LED lights",
                "D": "The challenges researchers face in improving LED technology",
            }, "B"),
            q(26, "According to the speaker, what is the most significant benefit of LED lights compared to incandescent bulbs?", {
                "A": "LEDs produce more heat than incandescent bulbs.",
                "B": "LEDs are cheaper to manufacture than incandescent bulbs.",
                "C": "LEDs use less energy than incandescent bulbs.",
                "D": "LEDs provide much brighter light than incandescent bulbs.",
            }, "C"),
            q(27, "Why does the speaker mention the small size of LED lights?", {
                "A": "To point out that they are useful for simple household lighting only",
                "B": "To explain why LEDs are not durable",
                "C": "To emphasize the flexibility of LEDs for different uses",
                "D": "To provide a possible reason that they are not more popular",
            }, "C"),
            q(28, "What is the speaker's attitude toward the future of LED technology?", {
                "A": "Doubtful that LEDs will continue to improve",
                "B": "Concerned about the cost of LED development",
                "C": "Encouraged that LED products will become more affordable",
                "D": "Excited about new possibilities for LED applications",
            }, "D"),
        ]),
        clip("lecture", "Positive Reinforcement", 1, listen,
             "listening_m1_q29_q32_lecture_psychology_reinforcement.mp3", [
            q(29, "What is the main topic of the talk?", {
                "A": "The difficulty of setting goals for animals",
                "B": "The relationship between motivation and long-term behavior",
                "C": "The application of a psychological theory about rewards",
                "D": "The guidelines for identifying problematic behavior",
            }, "C"),
            q(30, "What is the key assumption behind positive reinforcement?", {
                "A": "Praise is more effective than tangible rewards.",
                "B": "Behaviors are strengthened when followed by rewards.",
                "C": "Animals and humans respond the same way to training.",
                "D": "People are naturally motivated by competition.",
            }, "B"),
            q(31, "What point does the speaker make about animal training?", {
                "A": "Delayed rewards are ineffective for animals.",
                "B": "Animals learn best through observation and imitation.",
                "C": "Emotional bonding is the key to successful animal training.",
                "D": "Animals learn faster when trained in groups.",
            }, "A"),
            q(32, "Why does the speaker mention watering weeds?", {
                "A": "To advocate for gentle parenting techniques",
                "B": "To warn against reinforcing unwanted behavior",
                "C": "To explain how small actions lead to big changes",
                "D": "To describe the consequences of inconsistent feedback",
            }, "B"),
        ]),
    ]
    m2 = [
        cr(2, 33, "listening_m2_q01_choose_response.mp3", {
            "A": "No problem, I'll get two of each.",
            "B": "No, I haven't shared the news yet.",
            "C": "I'm planning to join the Chess Club.",
            "D": "I have a weak sense of orientation.",
        }, "A"),
        cr(2, 34, "listening_m2_q02_choose_response.mp3", {
            "A": "Sure, I'll go over your lines with you.",
            "B": "Yes, I'll pick up the materials.",
            "C": "I think the teaching assistant will do that.",
            "D": "I'm not sure where that is.",
        }, "C"),
        cr(2, 35, "listening_m2_q03_choose_response.mp3", {
            "A": "I'll have some time right after lunch.",
            "B": "Yes, others were waiting to borrow it.",
            "C": "Of course I saw the new movie!",
            "D": "We loaded the heavy items first.",
        }, "A"),
        clip("conversation", "Airport", 2, listen,
             "listening_m2_q04_q05_conversation_airport.mp3", [
            q(36, "Why is the man asking Anne for advice?", {
                "A": "He wants to know the cheapest way to travel around the city.",
                "B": "His visitor needs to catch an early flight.",
                "C": "He's planning a trip to Denver and needs airport information.",
                "D": "He's trying to decide whether to take a taxi or the light rail to Denver.",
            }, "B"),
            q(37, "What does Anne suggest the man do before advising his friend?", {
                "A": "Buy tickets through an online site",
                "B": "Ask her husband for more details",
                "C": "View the train schedule posted online",
                "D": "Call the airport to confirm flight times",
            }, "C"),
        ]),
        clip("conversation", "Career Fair", 2, listen,
             "listening_m2_q06_q07_conversation_career_fair.mp3", [
            q(38, "What about the career fair does the man imply should have been done differently?", {
                "A": "It should have been held in a larger room.",
                "B": "It should have been advertised better.",
                "C": "More employers should have been invited.",
                "D": "Students should have been provided more time to speak with employers.",
            }, "A"),
            q(39, "What attitude does the woman express at the end of the conversation?", {
                "A": "Concern about a change in schedule",
                "B": "Interest in attending a future event",
                "C": "Enthusiasm about a new website",
                "D": "Admiration for the man's resume",
            }, "B"),
        ]),
        clip("lecture", "Viral Marketing", 2, listen,
             "listening_m2_q08_q11_lecture_marketing_viral.mp3", [
            q(40, "What is the talk mainly about?", {
                "A": "The importance of brand reputation for the brand's success",
                "B": "A new method by which brands gain attention",
                "C": "The marketing of a drug for a virus",
                "D": "A cultural effect of social networks",
            }, "B"),
            q(41, "What does the speaker say about the cost of viral marketing?", {
                "A": "It is cost-effective compared to traditional advertising methods.",
                "B": "It is more expensive than other forms of advertising.",
                "C": "It involves higher costs at first but lower costs later.",
                "D": "Its costs are similar to those of other advertising methods.",
            }, "A"),
            q(42, "What does the speaker say about content that is more likely to become viral?", {
                "A": "It requires a large amount of research to produce.",
                "B": "It is usually produced by young people.",
                "C": "It often includes a powerful moral message.",
                "D": "It can often be risky for a brand.",
            }, "D"),
            q(43, "What will the speaker most likely discuss next?", {
                "A": "Successful examples of viral marketing",
                "B": "The role of traditional media in viral marketing",
                "C": "The future of viral marketing",
                "D": "The impact of viral marketing on consumer behavior",
            }, "A"),
        ]),
        clip("lecture", "Social Entrepreneurship", 2, listen,
             "listening_m2_q12_q15_podcast_social_entrepreneurship.mp3", [
            q(44, "What is the main topic of the talk?", {
                "A": "The impact of social change on new business owners",
                "B": "A comparison of traditional and modern business professionals",
                "C": "The evolution of entrepreneurship in the modern world",
                "D": "People who create businesses that address social problems",
            }, "D"),
            q(45, "Why does the speaker mention traditional entrepreneurs?", {
                "A": "To help explain the origin of social entrepreneurship as a business concept",
                "B": "To suggest that some entrepreneurs have a more difficult time establishing a business than others",
                "C": "To describe the challenges facing individuals who want to impact society",
                "D": "To contrast their end goals with those of social entrepreneurs",
            }, "D"),
            q(46, "Why does the speaker mention sectors such as poverty, health, and the environment?", {
                "A": "To highlight the areas where social needs are most pressing",
                "B": "To provide examples of problems that have been addressed through private investment",
                "C": "To list various challenges faced by traditional businesses",
                "D": "To suggest that social entrepreneurship is necessary for financial sustainability",
            }, "A"),
            q(47, "What does the speaker suggest about the task of measuring social impact?", {
                "A": "It is often required to receive funding for a venture.",
                "B": "It is difficult to accomplish.",
                "C": "It can lead to controversial results.",
                "D": "It is only feasible for environmental endeavors.",
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
        sent(1, "Are you excited about the workshop this weekend?", "I have ",
             ["interest", "in", "attending", "the", "workshop", "no"],
             ["no", "interest", "in", "attending", "the", "workshop"]),
        sent(2, "I've been trying to learn how to play the guitar.", "",
             ["taken", "any lessons", "Have you"],
             ["Have you", "taken", "any lessons"], " at the university?"),
        sent(3, "I just got tickets to see the new play this weekend.", "",
             ["do", "the theater", "doors", "open", "What time"],
             ["What time", "do", "the theater", "doors", "open"], "?"),
        sent(4, "Why did the university's admissions representative attend the marketing seminar?", "He was ",
             ["finding out", "what types of campaigns", "proved", "most effective", "interested in"],
             ["interested in", "finding out", "what types of campaigns", "proved", "most effective"]),
        sent(5, "Our group received the new project guidelines yesterday.", "",
             ["if there are", "any changes", "to the", "Do you know"],
             ["Do you know", "if there are", "any changes", "to the"], " deadlines?"),
        sent(6, "There is a workshop on project management next week.", "",
             ["if it will", "cover", "agile", "Do you know"],
             ["Do you know", "if it will", "cover", "agile"], " methodologies?"),
        sent(7, "Why did you pick this topic for your presentation?", "I chose ",
             ["it is the topic", "that has", "the new", "study report", "it because"],
             ["it because", "it is the topic", "that has", "the new", "study report"]),
        sent(8, "Who will be joining us for the Business Club meeting?", "",
             ["who majors", "in marketing", "will", "My classmate"],
             ["My classmate", "who majors", "in marketing", "will"], " attend."),
        sent(9, "Why did you choose that science course?", "It is ",
             ["a professor", "who is", "an expert", "in the field", "taught by"],
             ["taught by", "a professor", "who is", "an expert", "in the field"]),
        sent(10, "What did you have to eat after class?", "I had ",
             ["that was", "filled with", "vegetables", "a sandwich"],
             ["a sandwich", "that was", "filled with", "vegetables"]),
        {
            "type": "email", "module": 2, "id": 11,
            "instruction": "Write an email. In your email, do the following:",
            "prompt": (
                "You are organizing a charity event at your university to raise funds for a local animal shelter. "
                "You need volunteers to help with various tasks. You know that your friend, Emma, has experience "
                "in organizing events and would be a great help."
            ),
            "bullets": [
                "Describe the charity event and explain the type of support you need.",
                "Ask her if she would be willing to volunteer and specify the tasks she could assist with.",
                "Explain how her help would benefit human members of the community as well as animals.",
            ],
            "to": "Emma", "subject": "Volunteer help for charity event",
            "sampleSubject": "Volunteer help for charity event",
            "sample": (
                "Hi Emma,\n\n"
                "I hope you're doing well. I am helping organize a charity event at our university next Saturday "
                "to raise money for a local animal shelter. We need volunteers to welcome guests, hand out flyers, "
                "explain the shelter's work, and help collect donations during the event.\n\n"
                "Would you be willing to volunteer for a few hours? Since you have experience organizing events, "
                "I think you would be especially helpful at the information table or with coordinating the other "
                "volunteers. You could also help us speak with visitors about why the shelter needs support.\n\n"
                "Your help would make the event run more smoothly and encourage more students to participate. "
                "The money we raise will improve conditions for the animals, and the event will also bring people "
                "in our community together for a good cause.\n\n"
                "Best,\nA Student"
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
                    "We often hear about environmental problems like air pollution from factories, plastic waste in oceans, "
                    "and forests being cut down for agriculture. People are trying different solutions: switching from coal "
                    "and oil to solar and wind energy, teaching communities about recycling and conservation, or developing "
                    "new technologies to clean contaminated water and soil. Which of these approaches do you think would "
                    "produce the fastest, most measurable improvements to environmental problems? Why?"
                ),
            },
            "posts": [
                {"name": "Kelly", "photo": PHOTO + "kelly.png",
                 "text": "I believe that switching from coal and oil to solar and wind energy sources would produce the fastest environmental improvements. Power plants that burn coal create most of the air pollution and carbon emissions that cause climate change, so replacing them with clean energy would immediately reduce harmful gases entering the atmosphere and improve air quality in cities."},
                {"name": "Andrew", "photo": PHOTO + "andrew.png",
                 "text": "In my opinion, teaching communities about recycling, conservation, and environmental protection produces the most lasting improvements. When people understand how their daily choices affect air and water quality, they change their purchasing habits, support environmental policies, and teach these practices to their children, creating long-term behavioral changes across entire communities."},
            ],
            "samples": [
                {"title": "Renewable Energy",
                 "text": (
                     "I agree more with Kelly that replacing coal and oil with solar and wind energy would produce the fastest measurable improvement. "
                     "Education is important, as Andrew says, but changes in public habits usually take years to appear in environmental data. "
                     "In contrast, changing the energy source of a power plant can quickly reduce smoke, carbon emissions, and other pollutants released every day. "
                     "For example, if a city replaces several coal-powered facilities with wind or solar energy, air-quality monitors can record lower levels of pollution within a short time. "
                     "New cleanup technologies are also useful, but they often require long testing periods before wide use. "
                     "Overall, renewable energy creates the clearest and fastest impact because it reduces pollution at one of its largest sources."
                 )},
                {"title": "Community Education",
                 "text": (
                     "I would choose community education as the most effective long-term approach because environmental improvement depends on repeated daily choices. "
                     "Solar and wind power can reduce emissions quickly, but people still need to reduce waste, conserve water, and support responsible policies. "
                     "For example, a city that teaches residents how to recycle correctly, avoid single-use plastics, and report pollution can prevent many problems before they become expensive emergencies. "
                     "Education also spreads from adults to children, so the effect can continue for years. "
                     "While the results may not appear overnight, they are measurable through lower waste levels, cleaner neighborhoods, and stronger public support for environmental rules."
                 )},
            ],
        },
    ])


def build_speaking():
    instr_r = (
        "You are volunteering as a tour guide at a maritime museum. "
        "Listen to the speaker and repeat what the speaker says. Repeat only once."
    )
    instr_i = (
        "You have agreed to participate in a research study about people's experiences with public transportation. "
        "The researcher will ask you some questions. Listen to each question and answer in your own words."
    )
    repeats = [
        (1, 15, "This area shows early sailing ships."),
        (2, 15, "Other boats used steam for power."),
        (3, 15, "These very accurate ship models show how designs have changed."),
        (4, 15, "Before satellites, these tools helped sailors navigate oceans."),
        (5, 15, "Let me explain how trade routes shaped global shipping over time."),
        (6, 18, "Feel free to ask questions if you want to know more about anything you have seen."),
        (7, 18, "For nonfiction books and novels about ships, be sure to visit the gift shop."),
    ]
    interviews = [
        (8, "How often do you use public transportation like buses or trains? Give details to explain your answer.",
         "I use public transportation several times a week, mostly buses and the subway. "
         "I take them when I go to school or meet friends because they are cheaper than taking a taxi and I do not need to worry about parking. "
         "For example, when I have classes downtown, the subway is usually faster than driving during rush hour. "
         "I also like that I can read or review notes while I travel. It is not perfect, but it is practical for my daily routine."),
        (9, "Can you describe any benefits or disadvantages you might experience from using public transportation?",
         "One benefit is that public transportation saves money and can be less stressful than driving in traffic. "
         "It also helps reduce pollution because many people share the same vehicle instead of using separate cars. "
         "The main disadvantage is reliability. Buses or trains can be delayed, and during rush hour they may be crowded and uncomfortable. "
         "For instance, if a bus arrives late before an exam, I may feel anxious. So I like public transportation, but I usually leave extra time."),
        (10, "Would you consider moving in order to have better public transportation? Why or why not?",
         "Yes, I would consider moving if the new place had much better public transportation. "
         "A reliable subway or bus system would save time every day and make it easier to get to school, work, and social activities without depending on a car. "
         "For example, living near a direct train line could reduce a one-hour commute to thirty minutes. "
         "I would still consider rent and safety, but transportation would be an important reason to move."),
        (11, "Some people believe that cities should invest more in public transportation to fight congestion, commuting time, and pollution. Do you agree or disagree with this idea? Why?",
         "I agree that cities should invest more in public transportation. "
         "Better buses and trains can reduce the number of cars on the road, which lowers traffic congestion and air pollution. "
         "It also helps students, workers, and older people travel more easily. "
         "For example, if buses arrive frequently and connect to major neighborhoods, fewer people need to drive downtown. "
         "Although building transportation systems costs money, the long-term benefits for the city are worth it."),
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
    dest = os.path.join(ROOT, "library/toefl/audio/2025-07-13")
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
    dump("2025-07-13-reading.json", build_reading())
    dump("2025-07-13-listening.json", build_listening())
    dump("2025-07-13-writing.json", build_writing())
    dump("2025-07-13-speaking.json", build_speaking())
