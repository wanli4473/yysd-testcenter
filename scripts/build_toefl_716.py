#!/usr/bin/env python3
"""Build 7.16 Enhanced TOEFL. Run: python3 scripts/build_toefl_716.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月/7.16/audio/item_level"
AUDIO = "library/toefl/audio/2025-07-16/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-07-16"
SET = "7.16"
TITLE = "新托福 7.16"


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
    t1, n = cw("Oceanography", 1, 1, [
        "Oceanography is the study of the physical, chemical, and biological aspects of the ocean. This ",
        ("fi", "field"),
        " encompasses ",
        ("t", "the"),
        " exploration ",
        ("o", "of"),
        " ocean ",
        ("cur", "currents"),
        ", marine ",
        ("ecosy", "ecosystems"),
        ", and ",
        ("geol", "geological"),
        " seabed ",
        ("struc", "structures"),
        ". Oceanographers ",
        ("u", "use"),
        " satellites ",
        ("a", "and"),
        " other ",
        ("adv", "advanced"),
        " technology to monitor and analyze ocean conditions. By tracking sea surface temperatures, currents, salinity, and other features, researchers contribute to our understanding of climate change. Their work is vital for sustaining ocean health and preserving marine biodiversity.",
    ])
    t2, n = cw("Atmospheric Pressure", 1, n, [
        "Atmospheric pressure plays a critical role in weather systems. High-pressure zones bring clear, calm conditions due to descending air that inhibits cloud formation. In low-pressure systems, warm air rises, cools, and condenses into clouds, ",
        ("wh", "which"),
        " can ",
        ("le", "lead"),
        " to ",
        ("precip", "precipitation"),
        ". Barometric pressure ",
        ("varia", "variations"),
        " help ",
        ("meteor", "meteorologists"),
        " improve ",
        ("fore", "forecasts"),
        ", as ",
        ("rap", "rapid"),
        " fluctuations ",
        ("of", "often"),
        " signal ",
        ("appro", "approaching"),
        " storms. ",
        ("Adv", "Advanced"),
        " models use atmospheric force gradients, temperature, and humidity to predict storm movement and intensity, providing vital information for both short-term weather outlooks and long-term climate assessments.",
    ])
    if n != 21:
        raise SystemExit("m1 cw expected next 21, got %s" % n)
    t3, n = cw("The Industrial Revolution", 2, 36, [
        "The Industrial Revolution profoundly transformed North America, spurring urban growth through technology and immigration. Many advancements boosted connectivity, accelerating commerce and communication. Yet, urbanization brought ",
        ("challe", "challenges"),
        " like ",
        ("overcro", "overcrowding"),
        ", poor ",
        ("infra", "infrastructure"),
        ", and ",
        ("soc", "social"),
        " inequality. ",
        ("His", "Historians"),
        " debate ",
        ("whe", "whether"),
        " these ",
        ("cha", "changes"),
        " fostered ",
        ("mod", "modern"),
        " prosperity ",
        ("o", "or"),
        " deepened ",
        ("divi", "divisions"),
        " in society. The era's complex legacy continues to prompt scholarly inquiry, revealing how industrialization shaped North America's development and raised enduring questions about progress, equity, and the long-term impact of technological and economic transformation.",
    ])
    if n != 46:
        raise SystemExit("m2 cw expected next 46, got %s" % n)
    return paper("reading", "阅读", [
        {"n": 1, "timeSec": 1260, "from": 1, "to": 35},
        {"n": 2, "timeSec": 540, "from": 36, "to": 50},
    ], [
        t1, t2,
        daily("Instructions for Resetting Your Dorm Room Router", 1, "Read instructions.", {
            "kind": "card",
            "title": "Instructions for Resetting Your Dorm Room Router",
            "body": (
                "1. Unplug router from power source.\n"
                "2. Wait 30 seconds.\n"
                "3. Plug router back into power source.\n"
                "4. Push start button.\n"
                "5. Wait for router to fully restart."
            ),
        }, [
            q(21, "What should a resident do first?", {
                "A": "Disconnect the router from electrical power.",
                "B": "Wait for the router to restart automatically.",
                "C": "Plug the router back in and push the start button.",
                "D": "Wait 30 seconds for the router to cool.",
            }, "A"),
            q(22, "What should a resident do last?", {
                "A": "Unplug the router from its power source.",
                "B": "Wait until the router has completely started again.",
                "C": "Wait 30 seconds or until a light flashes.",
                "D": "Plug the router into a different power source.",
            }, "B"),
        ]),
        daily("Physics for Engineers", 1, "Read a course description.", {
            "kind": "card",
            "kicker": "PHYS 121",
            "title": "Physics for Engineers",
            "body": (
                "This course introduces fundamental principles of mechanics, energy conservation, and wave "
                "phenomena with hands-on laboratory sessions. Coursework includes problem-solving workshops, "
                "lab reports, and midterm and final assessments.\n\n"
                "Schedule: Tuesdays and Thursdays, 9:00 A.M.–10:15 A.M.\n"
                "Prerequisite: Calculus\n"
                "Enrollment: Open to engineering majors"
            ),
        }, [
            q(23, "According to the description, the course's weekly schedule includes meetings", {
                "A": "once every week.",
                "B": "every weekday.",
                "C": "on two mornings.",
                "D": "in the afternoons.",
            }, "C"),
            q(24, "Which activity is NOT described as part of this course?", {
                "A": "Taking part in lab work",
                "B": "Completing field research",
                "C": "Practicing problem-solving skills",
                "D": "Submitting written reports",
            }, "B"),
        ]),
        daily("University Photography Club", 1, "Read an event schedule.", {
            "kind": "card",
            "kicker": "Weekend of Learning and Creativity",
            "title": "UNIVERSITY PHOTOGRAPHY CLUB",
            "body": (
                "Student Center Meeting Hall B · Beginners and experienced photographers welcome. "
                "Hands-on sessions, expert tips, and a chance to showcase your work.\n\n"
                "Saturday, October 16\n"
                "9:00–10:30 Registration and Welcome Coffee\n"
                "10:30–12:00 Introduction to Photography\n"
                "12:00–1:30 Lunch break (lunch provided)\n"
                "1:30–3:00 Portrait Photography\n"
                "3:00–4:30 Landscape Photography\n\n"
                "Sunday, October 17\n"
                "9:00–10:30 Photo Editing Workshop\n"
                "10:30–12:00 Street Photography\n"
                "12:00–1:30 Lunch break (lunch provided)\n"
                "1:30–3:00 Advanced Techniques\n"
                "3:00–4:30 Juried Photo Contest\n\n"
                "Register: university.edu/photoclub/register"
            ),
        }, [
            q(25, "What can be inferred about the event?", {
                "A": "People new to photography can benefit from it.",
                "B": "Participants must pay an entrance fee.",
                "C": "Participants will leave campus to take pictures.",
                "D": "Students can learn fashion photography.",
            }, "A"),
            q(26, "What will take place at the end of the event?", {
                "A": "An exhibition of participants' photography",
                "B": "A sale of used equipment",
                "C": "A lecture by a visual arts professor",
                "D": "An opportunity to learn more photography techniques",
            }, "A"),
            q(27, "Which statement is NOT true about the event?", {
                "A": "It includes a photography competition.",
                "B": "It includes instruction in photo editing.",
                "C": "It covers multiple photography genres.",
                "D": "Participants must pay for lunch.",
            }, "D"),
        ]),
        daily("Student Showcase", 1, "Read a poster.", {
            "kind": "card",
            "kicker": "INNOVATION HUB",
            "title": "Student Showcase",
            "body": (
                "Explore hands-on demonstrations, poster galleries, and talks from undergraduate and graduate "
                "student researchers across sustainability, health, the arts, and public policy. Discover projects "
                "with real-world impact, meet potential collaborators, and learn about funding, internships, and "
                "mentorship opportunities.\n\n"
                "When: Wednesday, April 16, 4:00–7:30 P.M.\n"
                "Where: Innovation Hub Atrium\n"
                "Who: Students, faculty, staff, alumni, and community partners\n"
                "Highlights: People's Choice Award · Industry judges · Networking · Refreshments\n\n"
                "Presenting? Submit a 250-word abstract by March 25.\n"
                "Attending? RSVP by April 10. Admission is free.\n"
                "Accommodations are available; note accessibility needs when you RSVP."
            ),
        }, [
            q(28, "Which category of work will be featured at the showcase?", {
                "A": "Student research findings",
                "B": "Professional theater productions",
                "C": "University sports records",
                "D": "Alumni travel reports",
            }, "A"),
            q(29, "When will the Student Showcase take place?", {
                "A": "March 25",
                "B": "April 10",
                "C": "April 15",
                "D": "April 16",
            }, "D"),
            q(30, "What should attendees do if they need accessibility support?", {
                "A": "Contact an industry judge.",
                "B": "Submit a research abstract.",
                "C": "Pay an accommodation fee.",
                "D": "Note their needs when they RSVP.",
            }, "D"),
        ]),
        academic("The Evolving Role of Gestures in Acting", 1, [
            "Gestures have always been integral to acting, serving as silent yet powerful tools for conveying emotions and intentions. Before the advent of sound in cinema, actors relied on exaggerated gestures to communicate, creating a universal language that transcended spoken words. This visual communication was essential in silent films, allowing actors to express complex narratives through movement alone.",
            "In modern theater and film, gestures have evolved into subtler devices, designed to complement spoken dialogue and enhance realism. A nuanced gesture, such as the slight arch of an eyebrow or a lingering touch, can reveal a character's inner conflict or emotional transitions, adding layers of meaning without overt expression. This transformation reflects a broader shift toward naturalism in acting, where authenticity is paramount, and even the smallest gesture is deliberate.",
            "With such great expressive power comes great responsibility: cultural interpretations of gestures add complexity to acting in multicultural contexts. A gesture considered respectful in one culture might be misinterpreted in another as offensive or dismissive. Actors must adapt and modify their gestures to resonate with diverse audiences, a skill that distinguishes adept performers. This adaptability highlights how gestures are not merely physical movements but are deeply rooted in cultural understanding and empathy.",
        ], [
            q(31, "Why were gestures especially important in silent films?", {
                "A": "They made films easier to produce.",
                "B": "They replaced written scripts.",
                "C": "They helped actors speak more clearly.",
                "D": "They communicated meaning without spoken words.",
            }, "D"),
            q(32, 'The word "overt" in the passage is closest in meaning to', {
                "A": "direct.",
                "B": "careful.",
                "C": "gradual.",
                "D": "artistic.",
            }, "A"),
            q(33, "According to paragraph 2, all of the following are true of modern gestures EXCEPT:", {
                "A": "They can reveal inner conflict.",
                "B": "They tend to be subtle.",
                "C": "They support naturalistic acting.",
                "D": "They are usually accidental.",
            }, "D"),
            q(34, "What does the passage suggest about contemporary actors?", {
                "A": "They should avoid physical expression.",
                "B": "They mainly study silent-film techniques.",
                "C": "They must use gestures deliberately and sensitively.",
                "D": "They should use the same gestures for every audience.",
            }, "C"),
            q(35, "According to paragraph 3, what is one skill that theater actors need in multicultural contexts?", {
                "A": "Anticipating audience interpretations across cultures",
                "B": "Maintaining consistency in physical expression",
                "C": "Avoiding gestures that carry emotional intensity",
                "D": "Knowing when words alone cannot convey an emotion",
            }, "A"),
        ]),
        t3,
        academic("Stretching: Benefits and Drawbacks", 2, [
            "Stretching has long been championed as integral to physical fitness, widely believed to enhance flexibility and reduce injury risk. However, research supports a more nuanced picture, with the distinction between dynamic and static stretching being particularly critical.",
            "Dynamic stretching, involving controlled, fluid movements through a range of motion, apparently improves athletic performance by priming muscles for activity. In contrast, static stretching, the holding of a position for an extended period, seems to hinder performance of subsequent exercise. Related studies show that static stretching can temporarily reduce muscle strength, likely due to reduced muscle activation through the nervous system and a decrease in muscle stiffness, both of which can impair the ability to generate force. For example, athletes engaging in static pre-competition stretches often exhibit diminished sprint speed and vertical jump height.",
            {"insert": "A", "t": "There is, however, a key qualification to this contrast: While static stretching may be detrimental before exertion, it remains valuable post-exercise, aiding in recovery and flexibility maintenance."},
            {"insert": "B", "t": "Meanwhile, dynamic stretching not only prepares the body physically but may also enhance coordination and neuromuscular efficiency."},
            {"insert": "C", "t": "The evolving understanding of these techniques challenges the one-size-fits-all approach to stretching, suggesting that timing, context, and type are essential variables in optimizing physical readiness and long-term fitness outcomes."},
            {"insert": "D", "t": ""},
        ], [
            q(46, "According to paragraph 2, dynamic stretching does all of the following EXCEPT:", {
                "A": "Temporarily reduces muscle strength",
                "B": "Primes muscles for activity",
                "C": "Uses controlled movement",
                "D": "Can improve athletic performance",
            }, "A"),
            q(47, 'The word "impair" in the passage is closest in meaning to', {
                "A": "measure.",
                "B": "improve.",
                "C": "explain.",
                "D": "weaken.",
            }, "D"),
            q(48, "When does the passage suggest static stretching is most valuable?", {
                "A": "Immediately before a sprint",
                "B": "During a competitive event",
                "C": "After exercise has been completed",
                "D": "Before strength training begins",
            }, "C"),
            q(49, "Which variables does the passage identify as essential for using stretching effectively?", {
                "A": "Timing, context, and type",
                "B": "Age, weight, and height",
                "C": "Speed, distance, and temperature",
                "D": "Strength, balance, and endurance",
            }, "A"),
            insert_q(50, "Elite swimmers often perform static stretches after intense training sessions to relieve muscle tightness in the shoulders and hips and prevent overuse injuries.", "B"),
        ]),
    ])


def build_listening():
    listen = "Listen to the recording."
    m1 = [
        cr(1, 1, "listening_m1_q01_choose_response.mp3", {
            "A": "Sure, it will be held in the Administration Building.",
            "B": "That movie was great.",
            "C": "The tour ends at the seminary.",
            "D": "I think it's a beautiful day.",
        }, "A"),
        cr(1, 2, "listening_m1_q02_choose_response.mp3", {
            "A": "Yes, I would.",
            "B": "I'd like to be able to see outside.",
            "C": "My seat is in the third row.",
            "D": "Extra blankets are in aisle seven.",
        }, "B"),
        cr(1, 3, "listening_m1_q03_choose_response.mp3", {
            "A": "I saw that the tournament times were changed.",
            "B": "I like to see any home games at the campus stadium.",
            "C": "I got a reminder about the match on my phone.",
            "D": "I heard that the football game is expected to sell out.",
        }, "B"),
        cr(1, 4, "listening_m1_q04_choose_response.mp3", {
            "A": "My basketball skills are quite weak.",
            "B": "It was very competitive.",
            "C": "Most points tend to be scored in the second half.",
            "D": "I haven't yet made any plans to play the game.",
        }, "B"),
        cr(1, 5, "listening_m1_q05_choose_response.mp3", {
            "A": "Because of storm damage.",
            "B": "That's one possible solution.",
            "C": "The quad is open all day tomorrow.",
            "D": "It's usually late in the evening.",
        }, "A"),
        cr(1, 6, "listening_m1_q06_choose_response.mp3", {
            "A": "Internships are valuable.",
            "B": "The program has been around for many years.",
            "C": "That's awfully expensive.",
            "D": "Let me check the application process.",
        }, "D"),
        cr(1, 7, "listening_m1_q07_choose_response.mp3", {
            "A": "I just submitted the science lab report.",
            "B": "That's a good idea.",
            "C": "My tuition is due soon.",
            "D": "I like knowing how things work.",
        }, "D"),
        cr(1, 8, "listening_m1_q08_choose_response.mp3", {
            "A": "I forgot about it.",
            "B": "No, it was due last week.",
            "C": "I had a salad for lunch.",
            "D": "Yes, I prefer Tuesday.",
        }, "A"),
        cr(1, 9, "listening_m1_q09_choose_response.mp3", {
            "A": "Let's decide later.",
            "B": "We'll ask the waiter for a menu.",
            "C": "My uncle was a cook.",
            "D": "He prepared for his cooking class over the weekend.",
        }, "A"),
        cr(1, 10, "listening_m1_q10_choose_response.mp3", {
            "A": "I usually eat dinner at 6 p.m.",
            "B": "It was my first time there.",
            "C": "Was he interesting?",
            "D": "Yes, how about tomorrow?",
        }, "B"),
        cr(1, 11, "listening_m1_q11_choose_response.mp3", {
            "A": "We should leave our dorm early to get there on time.",
            "B": "There is a park near the campus.",
            "C": "That's great, I love hiking in the evening.",
            "D": "What is the nature of your visit?",
        }, "A"),
        cr(1, 12, "listening_m1_q12_choose_response.mp3", {
            "A": "Yes, she was a gracious hostess.",
            "B": "Oh, I wonder if they'll supply the exercise mats.",
            "C": "The climbing gym is on the other side of campus.",
            "D": "Sorry, she wasn't able to make it on time.",
        }, "B"),
        clip("conversation", "Apartment Search", 1, listen,
             "listening_m1_q13_q14_conversation_apartment_search.mp3", [
            q(13, "What problem does the woman have?", {
                "A": "She needs to locate a new place to live.",
                "B": "She has been transferred to Italy.",
                "C": "She cannot find anyone to take care of her dog.",
                "D": "She needs to sell her house as soon as possible.",
            }, "A"),
            q(14, "What does the woman imply when she says, 'Even better—I love dogs'?", {
                "A": "Her current apartment does not allow pets.",
                "B": "She prefers dogs over cats.",
                "C": "She volunteered at a pet shelter when she was younger.",
                "D": "She is eager to accept an offer.",
            }, "D"),
        ]),
        clip("conversation", "Conference Flight", 1, listen,
             "listening_m1_q15_q16_conversation_conference_flight.mp3", [
            q(15, "What is the man confused about?", {
                "A": "The cost of a flight",
                "B": "Whether he is presenting",
                "C": "The woman's travel schedule",
                "D": "The date of an event",
            }, "D"),
            q(16, "Why is the man changing his flight?", {
                "A": "Because he does not want to miss his presentation",
                "B": "Because he wants to travel with the woman",
                "C": "Because the conference schedule has changed",
                "D": "Because traveling on a different day will be less expensive",
            }, "A"),
        ]),
        clip("conversation", "Computer Freezing", 1, listen,
             "listening_m1_q17_q18_conversation_computer_freezing.mp3", [
            q(17, "What problem is the woman experiencing with her computer?", {
                "A": "It won't turn on.",
                "B": "It keeps freezing.",
                "C": "It has a virus.",
                "D": "It makes loud noises.",
            }, "B"),
            q(18, "What will the woman most likely do next?", {
                "A": "Buy new software for her computer",
                "B": "Restart her computer",
                "C": "Take her computer to a professional",
                "D": "Replace her computer's hard drive",
            }, "C"),
        ]),
        clip("announcement", "Technology Help Desk", 1, listen,
             "listening_m1_q19_q20_announcement_technology_help_desk.mp3", [
            q(19, "What does the speaker say about reservations to visit the technology help desk?", {
                "A": "They should be requested on weekdays.",
                "B": "They are recommended for Sundays.",
                "C": "They are not needed anymore.",
                "D": "They can be submitted by email.",
            }, "C"),
            q(20, "What does the speaker request that help desk clients do?", {
                "A": "Follow a new rule",
                "B": "Visit the science center",
                "C": "Share some news",
                "D": "Respond to a survey",
            }, "D"),
        ]),
        clip("announcement", "Weekly Paper", 1, listen,
             "listening_m1_q21_q22_announcement_weekly_paper.mp3", [
            q(21, "What should students do every Friday?", {
                "A": "Begin working on their papers",
                "B": "Upload their papers to be graded",
                "C": "Discuss the reading in groups",
                "D": "Check for assignments on the class portal",
            }, "B"),
            q(22, "What is mentioned as a reason to speak with the professor?", {
                "A": "Requesting an explanation of the grading policy",
                "B": "Requesting an extension for an assignment",
                "C": "Asking a question about some reading material",
                "D": "Asking a question about the topic of a paper",
            }, "B"),
        ]),
        clip("announcement", "Research Workshop", 1, listen,
             "listening_m1_q23_q24_announcement_research_workshop.mp3", [
            q(23, "What is the main purpose of next Tuesday's event?", {
                "A": "To provide information about organizational changes",
                "B": "To share the results of an investigation",
                "C": "To present some new research",
                "D": "To help students with an assignment",
            }, "D"),
            q(24, "What can be concluded about Mr. Reed?", {
                "A": "He has taught journalism courses at a university.",
                "B": "He wants to hire students for some research work.",
                "C": "He is an expert in judging the reliability of academic sources.",
                "D": "He recently published a research paper.",
            }, "C"),
        ]),
        clip("lecture", "Cultural Globalization", 1, listen,
             "listening_m1_q25_q28_lecture_cultural_globalization.mp3", [
            q(25, "What is the main topic of the talk?", {
                "A": "The spreading of culture across international borders and its impact",
                "B": "Reasons for the transmission of Western culture across the world",
                "C": "The role played by modern technology in connecting different cultures",
                "D": "The potentially negative effects of cultural globalization",
            }, "A"),
            q(26, "What does the speaker say about American films?", {
                "A": "They sometimes depict foreign cultures inaccurately.",
                "B": "They frequently include elements of cultures found outside the United States.",
                "C": "They are an example of how a country's culture is spread across the world.",
                "D": "They are more popular outside the United States than within it.",
            }, "C"),
            q(27, "Why does the speaker talk about cultural appropriation?", {
                "A": "To highlight a common benefit of cultural exchange",
                "B": "To present one of the concerns associated with cultural globalization",
                "C": "To emphasize the importance of social media in spreading a country's culture",
                "D": "To explain how people from different cultures come to respect one another",
            }, "B"),
            q(28, "What does the speaker suggest about social media?", {
                "A": "It is widely recognized as a primary driver of the dominance of Western culture.",
                "B": "It can lead to cultural homogenization if not regulated.",
                "C": "It provides a convenient platform for local cultures to gain global exposure.",
                "D": "It is the primary vehicle for spreading movies, music, and fashion from one country to another.",
            }, "C"),
        ]),
        clip("lecture", "Flying Squid", 1, listen,
             "listening_m1_q29_q32_lecture_flying_squid.mp3", [
            q(29, "What is the main focus of the talk?", {
                "A": "The adaptations of various marine mammals",
                "B": "The surprising behavior of a sea creature",
                "C": "The benefit of flying instead of swimming",
                "D": "The ways that animals escape flying predators",
            }, "B"),
            q(30, "What difference between flying squid and flying squirrels does the speaker mention?", {
                "A": "Flying squid can propel themselves upward.",
                "B": "Flying squid benefit from tree branches above the water.",
                "C": "Flying squid can breathe underwater and in the air.",
                "D": "Flying squid can travel long distances in the air.",
            }, "A"),
            q(31, "What does the speaker compare the membranes between the flying squid's tentacles and arms to?", {
                "A": "Fins",
                "B": "Engines",
                "C": "Propellers",
                "D": "Wings",
            }, "D"),
            q(32, "What does the speaker point out about squid migration?", {
                "A": "It can be affected by the presence of ships.",
                "B": "It takes a very long time.",
                "C": "It occurs seasonally.",
                "D": "It is more efficient through the air than through the water.",
            }, "D"),
        ]),
    ]
    m2 = [
        cr(2, 33, "listening_m2_q01_choose_response.mp3", {
            "A": "It was so well-organized and pertinent!",
            "B": "Modern art has always fascinated me.",
            "C": "I think I'm the first to present today.",
            "D": "It has existed for a very long time.",
        }, "A"),
        cr(2, 34, "listening_m2_q02_choose_response.mp3", {
            "A": "Let me take a look at them now.",
            "B": "I never know what to ask.",
            "C": "Every chapter contains a list of questions.",
            "D": "I practice every morning after getting up.",
        }, "A"),
        cr(2, 35, "listening_m2_q03_choose_response.mp3", {
            "A": "I think it's open until midnight.",
            "B": "Yes, the library is very quiet.",
            "C": "Thanks—I'll check online.",
            "D": "I'm planning to stay in tonight.",
        }, "A"),
        clip("conversation", "Chemistry Safety", 2, listen,
             "listening_m2_q04_q05_conversation_chemistry_safety.mp3", [
            q(36, "What are the speakers worried about?", {
                "A": "Not being able to get online",
                "B": "Having a strict professor",
                "C": "Arriving late to class",
                "D": "Making a mistake in a lab",
            }, "D"),
            q(37, "What will the speakers probably spend some time doing?", {
                "A": "Reviewing some rules",
                "B": "Creating a website",
                "C": "Labeling some bottles",
                "D": "Studying for an exam",
            }, "A"),
        ]),
        clip("conversation", "Water Refill Stations", 2, listen,
             "listening_m2_q06_q07_conversation_water_refill_stations.mp3", [
            q(38, "What concern does the woman mention about the new water refill stations?", {
                "A": "Some students may forget to bring bottles.",
                "B": "The locations may not be convenient.",
                "C": "The water quality may be worse than expected.",
                "D": "The dining halls may not have the stations.",
            }, "A"),
            q(39, "Why does the man mention the campus store?", {
                "A": "To point out a concern",
                "B": "To provide a suggestion",
                "C": "To ask for advice",
                "D": "To explain an upcoming change",
            }, "B"),
        ]),
        clip("lecture", "LED Technology", 2, listen,
             "listening_m2_q08_q11_lecture_led_technology.mp3", [
            q(40, "What does the speaker mainly discuss?", {
                "A": "The historical development of incandescent bulbs",
                "B": "The impact and future potential of LED technology",
                "C": "The disadvantages of consumer use of LED lights",
                "D": "The challenges researchers face in improving LEDs",
            }, "B"),
            q(41, "According to the speaker, what is the most significant benefit of LED lights compared to incandescent bulbs?", {
                "A": "LEDs produce more heat than incandescent bulbs.",
                "B": "LEDs are cheaper to manufacture than incandescent bulbs.",
                "C": "LEDs use less energy than incandescent bulbs.",
                "D": "LEDs provide much brighter light than incandescent bulbs.",
            }, "C"),
            q(42, "Why does the speaker mention the small size of LED lights?", {
                "A": "To point out that they are useful for simple household lighting only",
                "B": "To explain why LEDs are not durable",
                "C": "To emphasize the flexibility of LEDs for different uses",
                "D": "To provide a possible reason that they are not more popular",
            }, "C"),
            q(43, "What is the speaker's attitude toward the future of LED technology?", {
                "A": "Doubtful that LEDs will continue to improve",
                "B": "Concerned about the cost of LED development",
                "C": "Encouraged that LED products will become more affordable",
                "D": "Excited about new possibilities for LED applications",
            }, "D"),
        ]),
        clip("lecture", "Poverty Point", 2, listen,
             "listening_m2_q12_q15_lecture_poverty_point.mp3", [
            q(44, "What is the main purpose of the lecture?", {
                "A": "To describe how trade networks developed among ancient societies in North America",
                "B": "To highlight an ancient site that required large-scale planning",
                "C": "To explain why ancient people settled beside rivers",
                "D": "To compare mound-building cultures in several regions",
            }, "B"),
            q(45, "What aspect of the earthen mounds is most impressive to the speaker?", {
                "A": "Their extreme height",
                "B": "Their varying geometric shapes",
                "C": "The artifacts found inside them",
                "D": "The knowledge required to build them",
            }, "D"),
            q(46, "What does the speaker emphasize about how the structures at Poverty Point were built?", {
                "A": "They required advanced knowledge of metal technology.",
                "B": "They depended on materials from distant regions.",
                "C": "They involved a large amount of manual effort.",
                "D": "They were built with the help of domesticated animals.",
            }, "C"),
            q(47, "What does the speaker imply about the Mississippi River?", {
                "A": "It contained resources that were used for construction.",
                "B": "It was the main source of food for people at Poverty Point.",
                "C": "It connected people at Poverty Point to distant areas.",
                "D": "It enabled people from Poverty Point to relocate to other regions.",
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
        sent(1, "Are you planning to attend the conference next month?", "I don't ",
             ["attend", "plans", "to", "any", "have", "it"],
             ["have", "any", "plans", "to", "attend", "it"]),
        sent(2, "What was our classmate complaining about?", "She was ",
             ["what prompted", "exam schedule", "curious about", "the change", "in the"],
             ["curious about", "what prompted", "the change", "in the", "exam schedule"]),
        sent(3, "I just bought a new laptop for school.", "Have ",
             ["all", "the", "updates", "necessary", "software", "you", "installed", "did"],
             ["you", "installed", "all", "the", "necessary", "software", "updates"], "?"),
        sent(4, "The opening event of the new library is scheduled for next month.", "",
             ["there will", "the", "know if", "be", "Do you", "food at"],
             ["Do you", "know if", "there will", "be", "food at", "the"], " event?"),
        sent(5, "Why didn't you attend the seminar yesterday?", "",
             ["Can you", "later viewing", "tell me", "it", "for", "if", "was recorded"],
             ["Can you", "tell me", "if", "it", "was recorded", "for", "later viewing"], "?"),
        sent(6, "The workshop on effective communication skills was very helpful.", "",
             ["know if", "be another", "session next", "Do you", "there will"],
             ["Do you", "know if", "there will", "be another", "session next"], " month?"),
        sent(7, "What did that student ask in the career center?", "He was ",
             ["which internships", "most useful", "experience", "know", "curious to", "provided the"],
             ["curious to", "know", "which internships", "provided the", "most useful", "experience"]),
        sent(8, "Why did the university president make a speech?", "He wanted ",
             ["been", "to announce", "environmental", "what", "goals have", "reached"],
             ["to announce", "what", "environmental", "goals have", "been", "reached"]),
        {
            "type": "sentence", "module": 1, "id": 9,
            "context": "I'm thinking about joining the fitness club on campus.",
            "parts": [{"slot": True}, {"t": " you "}, {"slot": True}, {"slot": True},
                      {"slot": True}, {"slot": True}, {"t": "?"}],
            "bank": ["membership", "the", "check", "fees", "Did"],
            "answer": ["Did", "check", "the", "membership", "fees"],
        },
        sent(10, "What did the teacher say about the homework assignment?", "She wanted ",
             ["if everyone", "to know", "instructions clearly", "understood the"],
             ["to know", "if everyone", "understood the", "instructions clearly"]),
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
            "to": "Emma", "subject": "Request for volunteering at charity event",
            "sampleSubject": "Volunteering at Our Animal Shelter Charity Event",
            "sample": (
                "Dear Emma,\n\n"
                "I hope you're doing well. I'm organizing a charity fair on campus next Saturday to raise money "
                "for the local animal shelter. We will have a bake sale, a small raffle, and an information table "
                "about pet adoption. I need help coordinating volunteers and keeping the activities on schedule.\n\n"
                "Would you be willing to volunteer? Since you have organized events before, you could help assign "
                "people to the registration table, manage the raffle, and solve any scheduling problems during the "
                "afternoon. Your experience would make the event run much more smoothly.\n\n"
                "The money we collect will support food and medical care for the shelter's animals. The event will "
                "also give students and local families a positive way to work together, learn about responsible pet "
                "care, and meet animals that need homes.\n\n"
                "Please let me know if you are available. I would be very grateful for your help.\n\n"
                "Best,\nAlex"
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
            "class": "Economics",
            "professor": {
                "name": "Dr. Diaz", "photo": PHOTO + "diaz.png",
                "text": (
                    "Fast fashion refers to the rapid production of inexpensive clothing for mass-market sales. "
                    "Fast fashion allows consumers to buy trendy items at low prices and provides job opportunities "
                    "in manufacturing countries. But critics argue that fast fashion leads to vast amounts of pollution "
                    "in the form of discarded clothing, which harms the environment, and that workers experience poor "
                    "working conditions. In your view, what would be the most effective solution to the problems "
                    "associated with fast fashion?"
                ),
            },
            "posts": [
                {"name": "Andrew", "photo": PHOTO + "andrew.png",
                 "text": (
                     "I believe that laws should be created to hold fashion brands accountable for the problems their "
                     "products create. This responsibility could push them to innovate and create new, environmentally "
                     "friendly production methods. These innovations might not only reduce environmental damage but "
                     "also improve conditions for workers."
                 )},
                {"name": "Kelly", "photo": PHOTO + "kelly.png",
                 "text": (
                     "Based on my experience, today's consumers demand products that are made in environmentally and "
                     "socially responsible ways. As a result, market forces are effective at getting companies to adopt "
                     "better practices voluntarily. Consumer demand can encourage positive change without the need for "
                     "strict accountability being imposed on clothing makers."
                 )},
            ],
            "samples": [
                {"title": "Regulatory Accountability",
                 "text": (
                     "I agree with Andrew that stronger legal accountability is the most effective solution to the "
                     "problems created by fast fashion. Consumer preferences can influence companies, but voluntary "
                     "change is often uneven because firms still have an incentive to keep prices low. A government "
                     "could require large clothing brands to disclose factory conditions, reduce hazardous waste, and "
                     "finance collection programs for unwanted garments. For example, if every major retailer had to "
                     "accept used clothing and report how much material was recycled, companies would have a reason "
                     "to design products that last longer and are easier to reuse. This would reduce pollution while "
                     "rewarding manufacturers that treat workers responsibly. Kelly is right that consumer demand "
                     "matters, but customers cannot verify every supply chain on their own. Clear standards would give "
                     "shoppers reliable information and ensure that responsible companies are not placed at a cost "
                     "disadvantage. Over time, this shared baseline would make cleaner production a normal business "
                     "requirement rather than an optional promise."
                 )},
                {"title": "Informed Consumer Demand",
                 "text": (
                     "I agree more with Kelly that informed consumer demand can produce faster change than broad new "
                     "regulation. Fashion companies closely track sales, so a consistent shift toward durable and "
                     "ethically produced clothing directly affects what they manufacture. For example, a university "
                     "purchasing program could publish a simple sustainability rating and choose uniforms only from "
                     "brands that disclose wages, materials, and waste practices. When thousands of students and "
                     "employees follow that policy, competing companies gain a financial reason to improve. Andrew is "
                     "correct that accountability is necessary, but detailed laws can take years to negotiate and may "
                     "be difficult to enforce across international supply chains. Consumer pressure can begin immediately "
                     "and can be strengthened through independent certification and public reporting. Visible ratings "
                     "would also help smaller responsible brands compete on quality instead of price alone. In this way, "
                     "market demand rewards better labor and environmental practices without waiting for a complete "
                     "regulatory system."
                 )},
            ],
        },
    ])


def build_speaking():
    instr_r = (
        "You are working in your university's library. Your manager is training you to help other student "
        "workers handle sensitive library materials. Listen to the manager and repeat what the manager says. "
        "Repeat only once."
    )
    instr_i = (
        "You have agreed to participate in a research study about people's experiences with recycling and "
        "waste management. You will have a short online interview with a researcher. "
        "Listen to each question and answer in your own words."
    )
    repeats = [
        (1, 15, "Store documents to prevent damage."),
        (2, 15, "Temperature controls help protect papers."),
        (3, 15, "Use the catalog system to organize records expertly."),
        (4, 15, "Carefully use restoration tools to repair damaged items."),
        (5, 15, "We provide a quiet reading area for researchers."),
        (6, 18, "Security cameras are used to monitor sensitive materials."),
        (7, 18, "If long-term storage is needed, use the special storage boxes over here."),
    ]
    interviews = [
        (8, "Do you regularly recycle items such as paper, plastic, and glass? Why or why not?",
         "Yes, I regularly recycle paper, plastic, glass, and metal when suitable collection bins are available. "
         "I do it because recycling keeps reusable materials out of landfills and reduces the need to extract new "
         "resources. I also find that the habit becomes easy once containers are placed in convenient locations. "
         "At home, I keep a small box for paper and a separate bin for bottles and cans, so sorting does not take "
         "much time. I still check local rules because not every type of plastic is accepted. Recycling is not a "
         "complete solution to waste, but it is a practical daily action that most people can maintain."),
        (9, "Can you describe the recycling practices in your household or community?",
         "In my household, we separate paper, plastic containers, glass bottles, and ordinary trash. We rinse "
         "containers and place the recycling in labeled bins near the kitchen, which makes the system simple for "
         "everyone. Our community collects these materials once a week and provides a separate drop-off point for "
         "electronics and batteries. The local website also explains which items are accepted. This clear guidance "
         "is important because people sometimes place food waste or plastic bags in the wrong bin. Community "
         "volunteers occasionally share reminders and organize collection days. These practices work best when the "
         "rules are visible, collection is reliable, and residents can ask questions easily."),
        (10, "What challenges or difficulties do you face when trying to recycle? And how do you overcome them?",
         "The biggest challenge is uncertainty about what can actually be recycled. Packaging often combines paper, "
         "plastic, and metal, and local programs do not accept every material. Limited storage can also be a problem, "
         "especially when collection occurs only once a week. I overcome these difficulties by checking the recycling "
         "symbol and the local collection website before sorting unfamiliar items. I flatten boxes to save space and "
         "keep batteries or electronics in a separate container until I can take them to a drop-off site. When an item "
         "is not recyclable, I try to reduce waste by reusing it or choosing products with simpler packaging the next "
         "time I shop."),
        (11, "Some people believe that effective recycling programs are crucial for reducing pollution and conserving natural resources and therefore should be mandatory. Do you agree or disagree with this belief? Why or why not?",
         "I agree that basic recycling programs should be mandatory, provided that communities make participation "
         "practical and affordable. Pollution and resource use affect everyone, so a voluntary system often leaves too "
         "many recyclable materials in landfills. A mandatory program could require households and businesses to "
         "separate common items such as paper, glass, metal, and accepted plastics. However, rules alone are not "
         "enough. Local governments should provide clearly labeled bins, frequent collection, and simple instructions "
         "in several languages. They should also begin with education before issuing penalties. With convenient "
         "services and reasonable standards, a mandatory program can create consistent habits, reduce contamination, "
         "and conserve resources without placing an unfair burden on residents."),
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
    dest = os.path.join(ROOT, "library/toefl/audio/2025-07-16")
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
    dump("2025-07-16-reading.json", build_reading())
    dump("2025-07-16-listening.json", build_listening())
    dump("2025-07-16-writing.json", build_writing())
    dump("2025-07-16-speaking.json", build_speaking())
