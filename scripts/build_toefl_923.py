#!/usr/bin/env python3
"""Build 2026-09-23 China Offline TOEFL papers. Run: python3 scripts/build_toefl_923.py"""
import json
import os
import shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/全套/2026-09-23"
AUDIO = "library/toefl/audio/2026-09-23/"
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
    passage = []
    n = start
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


def mcq(qid, stem, options, answer):
    return {"id": qid, "stem": stem, "options": options, "answer": answer}


def lecture(title, module, instruction, audio, questions):
    return {
        "type": "lecture",
        "module": module,
        "title": title,
        "instruction": instruction,
        "audio": AUDIO + audio,
        "questions": questions,
    }


def build_reading():
    tasks = []
    n = 1
    t, n = cw("Glorious Revolution", 1, n, [
        "England's Glorious Revolution of 1688 began when King James II lost the confidence of political elites because of his Catholicism and governing practices. Concerned about religious policy and centralized authority, influential figures invited a Protestant Dutch prince, William of Orange, to intervene. Rather ",
        ("th", "than"),
        " producing ",
        ("pro", "prolonged"),
        " conflict, the ",
        ("tran", "transfer"),
        " of ",
        ("po", "power"),
        " occurred ",
        ("wi", "with"),
        " limited ",
        ("resis", "resistance"),
        ", as shifting ",
        ("alli", "alliances"),
        " and ",
        ("uncer", "uncertainty"),
        " over ",
        ("legitim", "legitimate"),
        " authority ",
        ("weak", "weakened"),
        " support for James II. The settlement, whereby William and his wife Mary were established as joint monarchs of England, emphasized limits on royal authority and strengthened the role of representative institutions.",
    ])
    tasks.append(t)
    t, n = cw("River Ecosystem Services", 1, n, [
        "Rivers are vital geographical features that shape landscapes and support life. They ",
        ("sup", "supply"),
        " water ",
        ("f", "for"),
        " drinking, ",
        ("agric", "agriculture"),
        ", and ",
        ("indu", "industry"),
        ", which ",
        ("ma", "makes"),
        " them ",
        ("essen", "essential"),
        " for ",
        ("hu", "human"),
        " communities. ",
        ("Pla", "Plants"),
        " and ",
        ("ani", "animals"),
        " also ",
        ("f", "find"),
        " a habitat in the generally fertile soil along rivers. Periodic flooding by rivers deposits nutrient-rich sediments, making the soil ideal for farming. Understanding river dynamics helps manage water resources and protect ecosystems. Waterways play an important role in sustaining life and shaping human history.",
    ])
    tasks.append(t)
    t, n = cw("Animal Communication Signals", 1, n, [
        "Animal behavior encompasses a rich tapestry of communication signals, from the melodic complexity of birdsong and ultrasonic echolocation to the visual brilliance of courtship displays and color signals. Chemical cues guide social bonding and mating, while tactile gestures like grooming convey group ",
        ("aff", "affiliation"),
        ". Electric ",
        ("disch", "discharges"),
        " within ",
        ("aqua", "aquatic"),
        " environments ",
        ("a", "and"),
        " vibrational ",
        ("mess", "messages"),
        " transmitted ",
        ("thr", "through"),
        " underwater ",
        ("surf", "surfaces"),
        " illustrate ",
        ("strat", "strategies"),
        " that ",
        ("evo", "evolve"),
        " in ",
        ("resp", "response"),
        " to evolutionary pressures. By studying these signals with ethological rigor, researchers unravel the cognitive and ecological contexts underlying social interactions.",
    ])
    tasks.append(t)
    t, n = cw("Fossil Evolution", 1, n, [
        "Fossils provide invaluable evidence of evolutionary history, documenting species that lived millions of years ago. Paleontologists examine these remains to understand how organisms have changed over time. Natural selection ",
        ("exp", "explains"),
        " how ",
        ("advant", "advantageous"),
        " traits ",
        ("incr", "increase"),
        " in ",
        ("frequ", "frequency"),
        " in a ",
        ("popul", "population"),
        ". Species ",
        ("ad", "adapt"),
        " to ",
        ("th", "their"),
        " environments, ",
        ("wh", "which"),
        " leads ",
        ("t", "to"),
        " incredible ",
        ("dive", "diversity"),
        " observed in the biological world today through the mechanism of natural selection. The ongoing study of evolution continues to reveal how life on Earth has developed and diversified.",
    ])
    tasks.append(t)
    t, n = cw("Archaeological Fieldwork", 2, n, [
        "Archaeology is the study of past human cultures through the excavation and analysis of artifacts, structures, and other physical remains. This ",
        ("discip", "discipline"),
        " helps ",
        ("unc", "uncover"),
        " the ",
        ("da", "daily"),
        " lives, ",
        ("beli", "beliefs"),
        ", and ",
        ("techno", "technologies"),
        " of ",
        ("anc", "ancient"),
        " civilizations. ",
        ("Archaeo", "Archaeologists"),
        " often ",
        ("wor", "work"),
        " at ",
        ("si", "sites"),
        ", carefully ",
        ("unear", "unearthing"),
        " and documenting finds. Techniques such as carbon dating and soil analysis provide information about the age and context of discoveries. Collaborative efforts with historians and anthropologists enrich our understanding of past civilizations, revealing information about their religious practices, the tools they used, and many other aspects of how they lived.",
    ])
    tasks.append(t)
    t, n = cw("Mountain Glacier Meltwater", 2, n, [
        "Mountain glaciers contain an upper accumulation zone, where snowfall adds ice over time, and lower areas where seasonal melting removes ice. In the accumulation ",
        ("zo", "zone"),
        ", fresh ",
        ("sn", "snow"),
        " slowly ",
        ("comp", "compresses"),
        " into ",
        ("de", "dense"),
        " ice ",
        ("wh", "while"),
        " warmer ",
        ("condi", "conditions"),
        " may ",
        ("pro", "produce"),
        " surface ",
        ("melt", "meltwater"),
        " channels ",
        ("th", "that"),
        " carry ",
        ("sedi", "sediment"),
        " downslope. These channels can move and change during the melt season as temperatures and water flow vary. Meltwater can transport sand and gravel beyond the glacier, where the material may form outwash deposits. Studying these features helps scientists understand glacier movement, seasonal melting, and landscape change.",
    ])
    tasks.append(t)
    t, n = cw("Glacier Landscapes", 2, n, [
        "Glaciers are massive, slow-moving bodies of ice that form in areas where snow accumulates over time and compresses into ice. ",
        ("Th", "They"),
        " can ",
        ("cha", "change"),
        " landscapes ",
        ("thr", "through"),
        " processes ",
        ("li", "like"),
        " erosion ",
        ("a", "and"),
        " deposition. ",
        ("A", "As"),
        " glaciers ",
        ("mo", "move"),
        ", they ",
        ("ca", "carve"),
        " out ",
        ("val", "valleys"),
        " and fjords, ",
        ("lea", "leaving"),
        " behind distinct geological features. Scientists study glaciers to understand past climate conditions and predict future changes. Glaciers are of particular concern today because their melting contributes to rising sea levels, impacting coastal communities worldwide.",
    ])
    tasks.append(t)
    t, n = cw("Resource Allocation", 2, n, [
        "Economics is the social science that studies the production, distribution, and consumption of goods and services. It ",
        ("exam", "examines"),
        " how ",
        ("indiv", "individuals"),
        ", households, ",
        ("busin", "businesses"),
        ", and ",
        ("gover", "governments"),
        " make ",
        ("cho", "choices"),
        " about ",
        ("reso", "resource"),
        " allocation ",
        ("a", "and"),
        " how ",
        ("su", "such"),
        " decisions ",
        ("aff", "affect"),
        " overall ",
        ("stab", "stability"),
        " and growth in the economy. Through the application of theoretical models and the collection of empirical data, economists can help policymakers formulate strategies to address issues such as inflation, unemployment, and trade imbalances, thereby improving societal well-being.",
    ])
    tasks.append(t)
    if n != 81:
        raise SystemExit("reading expected 80 blanks, next id %s" % n)
    return {
        "id": "2026-09-23",
        "title": "新托福 9.23 · 阅读",
        "set": "9.23",
        "skill": "reading",
        "modules": [
            {"n": 1, "timeSec": 960, "from": 1, "to": 40},
            {"n": 2, "timeSec": 960, "from": 41, "to": 80},
        ],
        "tasks": tasks,
    }


def build_listening():
    return {
        "id": "2026-09-23",
        "title": "新托福 9.23 · 听力",
        "set": "9.23",
        "skill": "listening",
        "modules": [
            {"n": 1, "timeSec": 600, "from": 1, "to": 8},
            {"n": 2, "timeSec": 600, "from": 9, "to": 16},
        ],
        "tasks": [
            lecture(
                "Keystone Species Effects", 1,
                "Listen to a talk in a biology class. Then answer the questions.",
                "listening_keystone.mp3",
                [
                    mcq(1, "Why does the speaker talk about arches in architecture?", {
                        "A": "To point out a similarity to rock arches in nature",
                        "B": "To help illustrate an important concept",
                        "C": "To argue against a common comparison",
                        "D": "To show a difference between life science and technology fields",
                    }, "B"),
                    mcq(2, "According to the talk, what is a keystone species?", {
                        "A": "A species that is necessary to maintain balance in an ecosystem",
                        "B": "A species that has no predators within an ecosystem",
                        "C": "A species that is too numerous for a healthy ecosystem",
                        "D": "A species that is negatively affected by environmental changes",
                    }, "A"),
                    mcq(3, "In the early 20th century, what happened to the wolves in Yellowstone National Park?", {
                        "A": "Their population increased dramatically when their prey population increased.",
                        "B": "They became a government-protected species.",
                        "C": "They were eliminated over farming and safety concerns.",
                        "D": "Their population decreased significantly because of disease.",
                    }, "C"),
                    mcq(4, "How did an increasing elk population affect the Yellowstone ecosystem?", {
                        "A": "Many species were negatively affected due to the elk's diet.",
                        "B": "Various animals that prey on elk were attracted to the area.",
                        "C": "Some areas developed an overgrowth of plants while others had too little vegetation.",
                        "D": "The population and range of the wolves also increased.",
                    }, "A"),
                ],
            ),
            lecture(
                "Dark Stores and Retail Tradeoffs", 1,
                "Listen to a talk in a business class. Then answer the questions.",
                "listening_dark_stores.mp3",
                [
                    mcq(5, "What aspect of dark stores does the speaker mainly discuss?", {
                        "A": "Their influence on the retail market and society",
                        "B": "Their architectural design and layout",
                        "C": "Their similarities to traditional storefronts",
                        "D": "Their role in the history of warehouse development",
                    }, "A"),
                    mcq(6, "According to the talk, why can dark stores offer lower prices?", {
                        "A": "Because they sell large quantities of goods",
                        "B": "Because they are not focused on making a profit",
                        "C": "Because they obtain less expensive products",
                        "D": "Because they have lower overhead expenses",
                    }, "D"),
                    mcq(7, "Why does the speaker mention grocery delivery?", {
                        "A": "To illustrate how dark stores compete with traditional supermarkets",
                        "B": "To compare delivery speeds in urban and nonurban environments",
                        "C": "To suggest that dark stores mainly sell perishable items",
                        "D": "To explain why grocery delivery has become less popular",
                    }, "A"),
                    mcq(8, "What point does the speaker make about dark stores and employment?", {
                        "A": "Many temporary employees are needed to set dark stores up.",
                        "B": "Employees in dark stores need to be comfortable with technology.",
                        "C": "Dark stores do not need many in-store workers.",
                        "D": "Dark stores are able to pay their employees more.",
                    }, "C"),
                ],
            ),
            lecture(
                "Sustainable Adobe Construction", 2,
                "Listen to a talk in an architecture class. Then answer the questions.",
                "listening_adobe.mp3",
                [
                    mcq(9, "What is the main topic of the talk?", {
                        "A": "The renewed use of an old construction material",
                        "B": "Recent advances in sustainable building materials",
                        "C": "The challenges faced by ancient adobe brick builders",
                        "D": "Modern alternatives to adobe bricks",
                    }, "A"),
                    mcq(10, "What does the speaker say about a new building in Amsterdam?", {
                        "A": "It was inspired by adobe construction.",
                        "B": "It is made from very common natural materials.",
                        "C": "It removes carbon from the atmosphere.",
                        "D": "It involves technology that improves insulation.",
                    }, "C"),
                    mcq(11, "What point does the speaker make about conditions in places in the southwestern United States?", {
                        "A": "Major changes in temperature occur there.",
                        "B": "Air there has recently become polluted.",
                        "C": "Not all materials for adobe production are available there.",
                        "D": "More clay for construction is available there than in other places.",
                    }, "A"),
                    mcq(12, "What does the speaker emphasize about transportation for construction projects?", {
                        "A": "Calculating its costs takes a long time.",
                        "B": "It requires special technology when concrete is used.",
                        "C": "The need for it depends mostly on the location of the project.",
                        "D": "Using adobe bricks helps reduce the need for it.",
                    }, "D"),
                ],
            ),
            lecture(
                "Poverty Point Engineering and Trade Networks", 2,
                "Listen to a talk in an archaeology class. Then answer the questions.",
                "listening_poverty_point.mp3",
                [
                    mcq(13, "What is the main purpose of the lecture?", {
                        "A": "To describe how trade networks developed among ancient societies in North America",
                        "B": "To highlight an ancient site that required large-scale planning",
                        "C": "To explain the role of metal tools in ancient construction",
                        "D": "To compare different types of prehistoric earthen mounds",
                    }, "B"),
                    mcq(14, "What aspect of the earthen mounds is most impressive to the speaker?", {
                        "A": "Their extreme height",
                        "B": "Their varying geometric shapes",
                        "C": "The artifacts found inside them",
                        "D": "The knowledge required to build them",
                    }, "D"),
                    mcq(15, "What does the speaker emphasize about how the structures at Poverty Point were built?", {
                        "A": "They required advanced knowledge of metal technology.",
                        "B": "They depended on materials from distant regions.",
                        "C": "They involved a large amount of manual effort.",
                        "D": "They were completed in a short period of time.",
                    }, "C"),
                    mcq(16, "What does the speaker imply about the Mississippi River?", {
                        "A": "It contained resources that were used for construction.",
                        "B": "It was the main source of food for people at Poverty Point.",
                        "C": "It connected people at Poverty Point to distant areas.",
                        "D": "It enabled people from Poverty Point to relocate to other regions.",
                    }, "C"),
                ],
            ),
        ],
    }


EMAIL_INSTR = "Write an email. In your email, do the following:"
DISC_INSTR = (
    "Your professor is teaching a class. Write a post responding to the professor's question.\n"
    "In your response, you should do the following:\n"
    "• Express and support your personal opinion.\n"
    "• Make a contribution to the discussion in your own words.\n"
    "An effective response will contain at least 100 words."
)


def email(eid, to, subject, prompt, bullets, sample):
    return {
        "type": "email",
        "module": 1,
        "id": eid,
        "instruction": EMAIL_INSTR,
        "prompt": prompt,
        "bullets": bullets,
        "to": to,
        "subject": subject,
        "sampleSubject": subject,
        "sample": sample,
    }


def discussion(did, topic, professor, posts, samples):
    return {
        "type": "discussion",
        "module": 2,
        "id": did,
        "instruction": DISC_INSTR,
        "class": topic,
        "professor": professor,
        "posts": posts,
        "samples": samples,
    }


def person(name, photo, text):
    return {"name": name, "photo": PHOTO + photo, "text": text}


def build_writing():
    return {
        "id": "2026-09-23",
        "title": "新托福 9.23 · 写作",
        "set": "9.23",
        "skill": "writing",
        "modules": [
            {"n": 1, "timeSec": 1260, "from": 1, "to": 3, "label": "Email"},
            {"n": 2, "timeSec": 1200, "from": 4, "to": 5, "label": "Academic Discussion"},
        ],
        "tasks": [
            email(
                1, "Dr. Roberts", "Your recent lecture on environmental sustainability",
                "You recently attended a guest lecture at your university on environmental sustainability. You found the lecture highly informative and would like to ask the speaker, Dr. Roberts, for recommendations on further reading materials and resources. You also want to know if she offers lectures on other topics that interest you.",
                [
                    "Mention what you found informative about her lecture.",
                    "Request recommendations for further reading materials and resources on environmental sustainability.",
                    "Ask her if she gives lectures on other topics that interest you.",
                ],
                "Dear Dr. Roberts,\n\nThank you for yesterday's guest lecture on environmental sustainability. I found your explanation of how everyday campus choices affect energy use especially useful, particularly the examples of lighting, heating, and food waste. Those concrete cases made the larger argument much easier to apply.\n\nCould you recommend further reading or other resources on this topic? I would welcome a short list of articles, books, or recorded talks that a non-specialist could follow after the lecture. I am also interested in whether you give talks on related subjects, such as sustainable transport or campus waste reduction, and whether any of those sessions are open to students.\n\nThank you again for a clear and practical lecture. I would be grateful for any suggestions you can share.\n\nKind regards,\n[Your Name]",
            ),
            email(
                2, "Mr. Smith", "Your presentation",
                "You recently attended a technology conference where you met Mr. Smith, a prominent industry expert. You found his presentation helpful and informative. You want to thank Mr. Smith for his presentation and request additional information on a topic he discussed.",
                [
                    "Mention what you found useful about his presentation.",
                    "Request additional information about one of the topics he discussed.",
                    "Express your appreciation for his time and insight.",
                ],
                "Dear Mr. Smith,\n\nI attended your presentation at the technology conference last week and wanted to thank you for a clear and useful talk. The section on how smaller companies can introduce new tools without disrupting daily work was especially helpful. Your examples made the process easier to picture than a general overview would have done.\n\nI would like to learn more about the training approach you mentioned near the end. If you have a short article, slide, or other material you can share, I would be glad to read it. I am trying to understand how teams decide what to teach first when time is limited.\n\nThank you again for your time and for answering questions after the session. I appreciated the practical focus of your remarks.\n\nBest regards,\n[Your Name]",
            ),
            email(
                3, "Ms. Johnson", "Catering service issues",
                "Your classmate Emma recently hosted a charity event on campus to raise funds for a local animal shelter. The event was successful overall, but there were some issues with the catering service, including delayed food delivery and incorrect orders. You need to address these concerns to the catering manager, Ms. Johnson.",
                [
                    "Thank her for the service provided.",
                    "Describe the issues that occurred during the event.",
                    "Suggest how these issues could be resolved in future events.",
                ],
                "Dear Ms. Johnson,\n\nThank you for catering Emma's campus charity event for the local animal shelter. The food that did arrive was well received, and several guests commented that they were glad a local service had been used.\n\nI am writing because two problems affected the afternoon. The delivery arrived later than the agreed time, so guests waited before they could eat. In addition, several orders did not match what had been confirmed, which made it difficult to serve people with specific requests.\n\nFor future events, it would help if the kitchen confirmed the final order in writing the day before and called when the driver left. A short checklist at delivery would also reduce mix-ups. I hope these changes are possible, because we would like to work with you again.\n\nKind regards,\n[Your Name]",
            ),
            discussion(
                4, "Storytelling Communication",
                person("Dr. Gupta", "diaz.png",
                       "We've been discussing the role of storytelling in effective communication. Storytelling can be a powerful tool to convey messages and connect with audiences emotionally. Some experts argue that storytelling is essential for engaging presentations, while others believe that factual, straightforward communication is more effective. What is your opinion on the use of storytelling in communication?"),
                [
                    person("Kelly", "kelly.png",
                           "Storytelling is essential for successful communication during, for instance, presentations. It helps to connect with the audience on an emotional level, making the message more memorable and impactful. Stories can illustrate points more vividly than plain facts and keep the audience engaged from start to finish."),
                    person("Paul", "andrew.png",
                           "Factual, straightforward communication is more effective. Clear and concise information ensures that the audience understands the message without any ambiguity. While stories can be engaging, they may sometimes distract from the main points. Successful communication is determined more by its ability to convey a message than it is to entertain an audience."),
                ],
                [
                    {
                        "title": "A Story Makes the Point Stick",
                        "text": "I agree with Kelly that storytelling is often essential, especially when the audience has to remember an idea after the talk ends. A short, relevant story can show why a fact matters, not only what the fact is. For example, a presenter explaining workplace safety could describe one near-accident before listing the new rules. Listeners are then more likely to recall the rule because they can picture the situation it prevents. Paul is right that stories should not replace the point or wander away from it. A story that is only entertaining can waste time and leave people unsure what they were supposed to take away. The most effective talks therefore use a brief story to introduce or illustrate a claim, then state the claim plainly. That combination keeps the message clear while giving the audience a reason to care about it.",
                    },
                    {
                        "title": "Facts First",
                        "text": "Paul's view is closer to mine when the purpose of the communication is to inform or to support a decision. In those situations, listeners need the main claim, the evidence, and the limits of that evidence. A story may hold attention, but it can also make a weak argument feel stronger than it is. Consider a budget meeting: a memorable anecdote about one delayed project does not tell the group how often delays occur or what they cost. Kelly is right that people remember images more easily than lists, so a single example can help after the facts are clear. I would still begin with a direct statement of the issue and the recommended action. Once the audience knows what is being asked, a short illustration can make the recommendation easier to apply. The story should serve the facts, not compete with them for the audience's attention.",
                    },
                ],
            ),
            discussion(
                5, "Classroom Participation",
                person("Dr. Gupta", "diaz.png",
                       "We've been discussing whether students learn better through active participation or passive listening during class instruction. Some educators believe that students retain information more effectively when they actively engage through discussion, problem-solving activities, and hands-on practice rather than simply listening to lectures. Others argue that well-structured lectures allow teachers to present information efficiently and systematically, helping students build foundational knowledge before attempting practical applications. Do you think educators should prioritize active student participation or structured lecture-based instruction?"),
                [
                    person("Andrew", "andrew.png",
                           "Educators should prioritize active participation because it helps students retain information more effectively and develop critical thinking skills. When students engage in discussions, solve problems collaboratively, and practice applying concepts immediately, they create stronger memory connections and better understand how to use their knowledge in real situations. Active participation also keeps students focused and motivated throughout the learning process."),
                    person("Kelly", "kelly.png",
                           "I think structured lecture-based instruction is more effective for building solid foundational knowledge that students need before attempting complex applications. Well-organized lectures allow teachers to present information systematically, ensure all students receive the same essential content, and cover curriculum requirements efficiently. Students can then apply this foundational knowledge through homework assignments and later practical exercises outside of class time."),
                ],
                [
                    {
                        "title": "Participation Reveals Understanding",
                        "text": "Educators should prioritize active participation because it gives them better evidence of what students actually understand. During a lecture, a quiet class may appear attentive even when several students have misunderstood the same idea. A short discussion or problem-solving activity makes those misunderstandings visible while there is still time to address them. For example, after introducing a scientific concept, a teacher could ask pairs of students to predict what would happen in a simple experiment and explain their reasoning. Different predictions would reveal which assumptions need clarification. This adds to Andrew's point about retention: participation improves the teacher's next instructional decision as well as the student's learning. Kelly is right that beginners need a clear foundation, so a brief explanation should come before the activity. However, that foundation becomes more useful when students immediately test their understanding and receive feedback, rather than discovering their confusion alone during homework later that evening.",
                    },
                    {
                        "title": "Lectures First",
                        "text": "Structured lectures deserve priority when students are first encountering a complex subject. Before they can discuss an issue productively, they need a shared framework that distinguishes central principles from supporting details. Without it, an activity may reward confident guessing rather than careful understanding. Consider an introductory economics lesson: a teacher can first explain how a simple model works and demonstrate the consequences of changing one assumption. Students then have a common basis for evaluating examples instead of talking past one another. Kelly's argument about systematic presentation is therefore important, particularly in classes where students arrive with different levels of prior knowledge. Andrew is right that participation helps students apply ideas, and I would include opportunities to ask questions and practice afterward. Still, the initial lecture should organize those opportunities. A clear explanation can reduce unnecessary confusion and make subsequent discussion more focused, so active learning becomes a purposeful extension of instruction rather than a substitute for it.",
                    },
                ],
            ),
        ],
    }


SPEAK = [
    {
        "form": 1,
        "sid": "2026-09-23",
        "title": "新托福 9.23 · 口语 Form 1",
        "folder": "20260923-T1-001 - 2026-09-23 Library Tour",
        "instruction": "You are learning how to show new students around the university library. Listen to the speaker and repeat what the speaker says. Repeat only once.",
        "items": [
            (8, "The library books are located here."),
            (8, "Study rooms can be reserved for group work."),
            (8, "Our computer lab has workstations with internet access."),
            (10, "Seek help at the reference desk for any research assistance."),
            (10, "Find tasty refreshments and healthy snacks at the basement cafe."),
            (12, "For your convenience, we have a map with a list of sections and resources."),
            (15, "If you have general or specific questions, our staff are here to meet your needs."),
        ],
    },
    {
        "form": 2,
        "sid": "2026-09-23-s2",
        "title": "新托福 9.23 · 口语 Form 2",
        "folder": "20260923-T1-002 - 2026-09-23 Woodworking Basics",
        "instruction": "You are an art student assisting your professor in a community woodworking class. Your professor is training you to show others how to complete simple woodworking steps. Listen to the instructor and repeat what the instructor says. Repeat only once.",
        "items": [
            (8, "Measure carefully to avoid mistakes."),
            (8, "Draw a line with a pencil before cutting."),
            (10, "Hammer the nails gently so the wood does not split apart."),
            (10, "Hold your work firmly in place to avoid accidents while cutting."),
            (12, "Sand the surface evenly until the board feels smooth to the touch."),
            (15, "When drilling into the wood, keep the tool straight so the hole remains neat and smooth."),
            (10, "When sawing or using heavy equipment, wear safety glasses for protection."),
        ],
    },
    {
        "form": 3,
        "sid": "2026-09-23-s3",
        "title": "新托福 9.23 · 口语 Form 3",
        "folder": "20260923-T1-003 - 2026-09-23 Birdwatching Basics",
        "instruction": "You are volunteering at a community nature center near campus. The leader is training you to help beginners learn the basics of birdwatching. Listen to the leader and repeat what the leader says. Repeat only once.",
        "items": [
            (8, "Look towards the treetops where you can find nests."),
            (8, "Note details to help identify the bird."),
            (12, "Keep a record of each sighting to share later with the group."),
            (10, "Use proper footwear to keep from slipping while exploring outdoors."),
            (12, "Keep your head covered to protect yourself from the sun on the walk."),
            (15, "When getting ready for a day out, be sure to pack essentials to be prepared."),
            (15, "If you spot a bird nearby, avoid sudden movements so it does not fly away."),
        ],
    },
    {
        "form": 4,
        "sid": "2026-09-23-s4",
        "title": "新托福 9.23 · 口语 Form 4",
        "folder": "20260923-T1-004 - 2026-09-23 Smoothie Making",
        "instruction": "You are volunteering at a community center near campus. The instructor is showing you how to guide beginners in making a smoothie. Listen to the instructor and repeat what the instructor says. Repeat only once.",
        "items": [
            (8, "Peel and slice a banana for sweetness."),
            (8, "Add berries for color and vitamins."),
            (10, "You can add flavored yogurt if you want additional flavor."),
            (8, "Slowly add milk until you achieve the desired consistency."),
            (10, "Blend until no chunks remain and the ingredients are mixed."),
            (12, "Optionally, add several pieces of ice if you prefer a colder drink."),
            (12, "Once everything looks good, slowly pour the smoothie into a chilled glass and serve."),
        ],
    },
]


def build_speaking(spec):
    tasks = []
    for i, (sec, sample) in enumerate(spec["items"], 1):
        tasks.append({
            "type": "repeat",
            "module": 1,
            "id": i,
            "speakSec": sec,
            "instruction": spec["instruction"],
            "audio": AUDIO + "speaking_form%02d_q%02d.mp3" % (spec["form"], i),
            "sample": sample,
        })
    return {
        "id": spec["sid"],
        "title": spec["title"],
        "set": "9.23",
        "skill": "speaking",
        "modules": [{"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"}],
        "tasks": tasks,
    }


def copy_audio():
    dest = os.path.join(ROOT, "library/toefl/audio/2026-09-23")
    os.makedirs(dest, exist_ok=True)
    pairs = [
        (os.path.join(SRC, "听力/T4_01_2026-09-23 Keystone Species Effects/audio.mp3"), "listening_keystone.mp3"),
        (os.path.join(SRC, "听力/T4_02_2026-09-23 Dark Stores and Retail Tradeoffs/audio.mp3"), "listening_dark_stores.mp3"),
        (os.path.join(SRC, "听力/T4_03_2026-09-23 Sustainable Adobe Construction/audio.mp3"), "listening_adobe.mp3"),
        (os.path.join(SRC, "听力/T4_04_2026-09-23 Poverty Point Engineering and Trade Networks/audio.mp3"), "listening_poverty_point.mp3"),
    ]
    for src, name in pairs:
        shutil.copy2(src, os.path.join(dest, name))
        print("audio", name)
    for spec in SPEAK:
        folder = os.path.join(SRC, "口语", spec["folder"])
        for i in range(1, 8):
            src = os.path.join(folder, "Q%02d_audio.mp3" % i)
            name = "speaking_form%02d_q%02d.mp3" % (spec["form"], i)
            shutil.copy2(src, os.path.join(dest, name))
        print("audio speaking form", spec["form"])


if __name__ == "__main__":
    copy_audio()
    dump("2026-09-23-reading.json", build_reading())
    dump("2026-09-23-listening.json", build_listening())
    dump("2026-09-23-writing.json", build_writing())
    for spec in SPEAK:
        name = "2026-09-23-speaking.json" if spec["form"] == 1 else "2026-09-23-speaking-f%s.json" % spec["form"]
        dump(name, build_speaking(spec))
