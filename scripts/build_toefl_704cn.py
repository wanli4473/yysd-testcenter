#!/usr/bin/env python3
"""Build 7.04 China offline TOEFL. Run: python3 scripts/build_toefl_704cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月/7.04-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-07-04/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-07-04"
SET = "7.04"
TITLE = "新托福 7.04 国内线下"
NEED = []


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


def academic(title, module, paras, questions):
    return {
        "type": "academic",
        "module": module,
        "instruction": "Read an academic passage.",
        "title": title,
        "paras": paras,
        "questions": questions,
    }


def lecture(title, module, fname, questions):
    NEED.append(fname)
    return {
        "type": "lecture",
        "module": module,
        "title": title,
        "instruction": "Listen to the recording.",
        "audio": AUDIO + fname,
        "questions": questions,
    }


def paper(pid, skill, zh, modules, tasks):
    return {
        "id": pid,
        "title": TITLE + " · " + zh,
        "set": SET,
        "skill": skill,
        "modules": modules,
        "tasks": tasks,
    }


def email(eid, prompt, bullets, to, subject, sample):
    return {
        "type": "email", "module": 1, "id": eid,
        "instruction": "Write an email. In your email, do the following:",
        "prompt": prompt, "bullets": bullets,
        "to": to, "subject": subject, "sampleSubject": subject, "sample": sample,
    }


def disc(did, klass, prof_name, prof_photo, prof_text, posts, samples):
    return {
        "type": "discussion", "module": 2, "id": did,
        "instruction": (
            "Your professor is teaching a class. Write a post responding to the professor's question.\n"
            "In your response, you should do the following:\n"
            "• Express and support your personal opinion.\n"
            "• Make a contribution to the discussion in your own words.\n"
            "An effective response will contain at least 100 words."
        ),
        "class": klass,
        "professor": {"name": prof_name, "photo": PHOTO + prof_photo, "text": prof_text},
        "posts": posts,
        "samples": samples,
    }


def post(name, photo, text):
    return {"name": name, "photo": PHOTO + photo, "text": text}


def wc(s):
    return len(s.split())


def check_writing(paper):
    for t in paper["tasks"]:
        if t["type"] == "email" and wc(t["sample"]) < 80:
            raise SystemExit("email %s words %s" % (t["id"], wc(t["sample"])))
        if t["type"] == "discussion":
            for s in t["samples"]:
                if wc(s["text"]) < 100:
                    raise SystemExit("disc %s %s words %s" % (t["id"], s["title"], wc(s["text"])))


def build_reading():
    tasks, n = [], 1
    t, n = cw("Coral Reefs", 1, n, [
        "Coral reefs are vibrant underwater ecosystems found in warm, shallow oceans around the world. Coral reefs are ",
        ("prod", "produced"),
        " by ",
        ("colo", "colonies"),
        " of ",
        ("ti", "tiny"),
        " animals ",
        ("cal", "called"),
        " coral polyps, ",
        ("wh", "which"),
        " secrete calcium carbonate ",
        ("t", "to"),
        " build ",
        ("th", "their"),
        " hard ",
        ("skel", "skeletons"),
        ". These ",
        ("nat", "natural"),
        " formations ",
        ("pro", "provide"),
        " critical habitats for a diverse array of marine species, including fish, crustaceans, and mollusks. They also offer protection to coastal areas by reducing the impact of waves and storms. However, coral reefs are facing threats from climate change, pollution, and overfishing.",
    ])
    tasks.append(t)
    t, n = cw("Fungi", 1, n, [
        "Fungi, a group of organisms that include mushrooms and yeast, are not plants but a separate branch of life. They ",
        ("c", "can"),
        " be ",
        ("fo", "found"),
        " in ",
        ("alm", "almost"),
        " every ",
        ("envir", "environment"),
        " and ",
        ("pl", "play"),
        " essential ",
        ("ro", "roles"),
        " in ",
        ("var", "various"),
        " ecosystems. ",
        ("Ma", "Many"),
        " of ",
        ("th", "them"),
        " are decomposers, ",
        ("mea", "meaning"),
        " that they break down organic matter and recycle nutrients back into the soil. Some fungi form symbiotic relationships with plants, helping them absorb water and nutrients. While many fungi are beneficial, others can cause diseases in plants, animals, and humans.",
    ])
    tasks.append(t)
    t, n = cw("Ancient Greece and Rome", 1, n, [
        "Classical civilizations, such as Ancient Greece and Rome, have profoundly influenced modern Western culture. These ",
        ("socie", "societies"),
        " achieved ",
        ("remark", "remarkable"),
        " progress in ",
        ("philo", "philosophy"),
        ", science, and ",
        ("gover", "government"),
        ". The Greeks ",
        ("introd", "introduced"),
        " fundamental ",
        ("id", "ideas"),
        " in ",
        ("demo", "democracy"),
        ", whereas the ",
        ("Rom", "Romans"),
        " created an ",
        ("intri", "intricate"),
        " legal ",
        ("frame", "framework"),
        ". Studying classical civilizations provides insights into the origins of contemporary political systems, literary traditions, and architectural styles, highlighting the enduring legacy of these ancient cultures.",
    ])
    tasks.append(t)
    t, n = cw("Extraterrestrial Life", 1, n, [
        "The discovery of water and volcanic activity on moons like Europa and Enceladus has sparked interest in the potential for extraterrestrial life. These moons, ",
        ("orbi", "orbiting"),
        " the ",
        ("pla", "planets"),
        " Jupiter ",
        ("a", "and"),
        " Saturn, ",
        ("ha", "have"),
        " ice-covered ",
        ("surf", "surfaces"),
        " with ",
        ("oce", "oceans"),
        " lying ",
        ("under", "underneath"),
        ". Volcanic ",
        ("acti", "activity"),
        ", in ",
        ("t", "the"),
        " form ",
        ("o", "of"),
        " hydrothermal vents, provides heat and nutrients, creating environments where microbial life could potentially thrive. Missions by spacecraft such as the Galileo and Cassini have gathered valuable data on these moons.",
    ])
    tasks.append(t)
    if n != 41:
        raise SystemExit("cw expected next 41, got %s" % n)
    tasks.append(academic("Growth Mindset in Education", 2, [
        "The concept of a growth mindset has gained attention in educational psychology. Coined by Carol Dweck, the phrase growth mindset refers to the belief that abilities and intelligence can be developed through dedication and hard work. This contrasts with a fixed mindset, where individuals believe their abilities are static. Research suggests that students with a growth mindset are more likely to embrace challenges, persevere through difficulties, and see effort as a path to mastery. For example, a student who struggles with math but believes they can improve with practice is displaying a growth mindset. This belief encourages resilience and a positive attitude toward learning.",
        "Educators play a crucial role in fostering a growth mindset in their students. Techniques such as praising effort rather than innate ability and providing constructive feedback can help students develop this mindset. Creating a classroom environment that celebrates mistakes as learning opportunities can reinforce the growth mindset philosophy.",
        "However, implementing growth mindset strategies is not without challenges.",
        {"insert": "A", "t": "Some students may find it difficult to change how they view their abilities, especially if they have been accustomed to a fixed mindset for a long time."},
        {"insert": "B", "t": "Additionally, educators themselves must genuinely believe in the growth mindset principles to effectively convey them to their students."},
        {"insert": "C", "t": "A shallow use of growth mindset language without meaningful support may not change students' habits."},
        {"insert": "D"},
    ], [
        q(41, 'The word "persevere" in the passage is closest in meaning to', {
            "A": "hurry.", "B": "change.", "C": "hesitate.", "D": "persist.",
        }, "D"),
        q(42, "According to the passage, which of the following is true about students with a growth mindset?", {
            "A": "They believe their intelligence is unchangeable.",
            "B": "They avoid challenges.",
            "C": "They view effort as a means to improve.",
            "D": "They are naturally talented.",
        }, "C"),
        q(43, "All of the following are mentioned in the passage as ways educators can foster a growth mindset EXCEPT by", {
            "A": "commending students' efforts.",
            "B": "praising students' innate abilities.",
            "C": "giving constructive feedback.",
            "D": "using mistakes as learning opportunities.",
        }, "B"),
        q(44, "According to the passage, the implementation of growth mindset strategies may be challenging because of", {
            "A": "difficulty in changing students' attitudes.",
            "B": "lack of support from students' parents.",
            "C": "insufficient research on growth mindset.",
            "D": "overemphasis on academic performance.",
        }, "A"),
        insert_q(45, "This reluctance can be further compounded by a lack of immediate, visible progress, which may discourage continued effort.", "B"),
    ]))
    tasks.append(academic("Unveiling Earth's Core", 2, [
        "Geophysicists have long been intrigued by Earth's core, the center of Earth. When earthquakes occur, they send seismic waves through the planet, offering rare glimpses into this mysterious world. Interestingly, these waves sometimes slow down in unexpected ways, suggesting that the core's makeup may be more complex than just iron and nickel as previously believed. Some scientists suggest it might not be entirely solid, possibly containing molten layers or unusual elements that create a unique state of matter.",
        "Advanced computer models now depict the core not as a homogeneous sphere, but as a layered structure with distinct regions. These models also propose phenomena like super-rotation, where the inner core spins slightly faster than the rest of the planet, and directional differences in wave behavior, known as anisotropies. Collectively, these findings portray a core in constant motion.",
        "But is this picture complete? Some researchers argue that these models rely on overly simplified assumptions. Truly understanding the inner core demands cutting-edge technology and fresh perspectives. The limitations of current theories remind us that the deeper we explore planetary science, the more we challenge our understanding of it.",
    ], [
        q(46, "Why does the author discuss earthquakes in paragraph 1?", {
            "A": "To demonstrate the fascination of geophysicists with Earth's core.",
            "B": "To explain one way scientists gain insights into Earth's core.",
            "C": "To highlight the destructive effects of seismic waves on Earth's core.",
            "D": "To challenge the idea that Earth's core is a mysterious world.",
        }, "B"),
        q(47, "Why might seismic waves slow down when passing through Earth's core?", {
            "A": "Because of the solid nature of the core.",
            "B": "Because of the presence of iron and nickel.",
            "C": "Because of the possible presence of molten layers or unusual elements.",
            "D": "Because of the strength of the elements that make up the core.",
        }, "C"),
        q(48, 'The word "Collectively" in the passage is closest in meaning to', {
            "A": "generally", "B": "together", "C": "somehow", "D": "interestingly",
        }, "B"),
        q(49, "Advanced computer models suggest all of the following about Earth's core EXCEPT:", {
            "A": "Earth's core has different layers.",
            "B": "The inner part of Earth's core rotates a little faster than other parts of Earth do.",
            "C": "Wave behavior in Earth's core shows directional differences.",
            "D": "The super-rotation of Earth's core is caused by anisotropies.",
        }, "D"),
        q(50, "Which sentence in paragraph 3 describes a specific criticism of computer models of the inner core?", {
            "A": "But is this picture complete?",
            "B": "Some researchers argue that these models rely on overly simplified assumptions.",
            "C": "Truly understanding the inner core demands cutting-edge technology and fresh perspectives.",
            "D": "The limitations of current theories remind us that the deeper we explore planetary science, the more we challenge our understanding of it.",
        }, "B"),
    ]))
    tasks.append(academic("Data Science and the Buildings of Tomorrow", 2, [
        "Once static structures, buildings increasingly function as dynamic systems thanks to applications of data science to the built environment. Building data science uses sensors and Internet of Things (IoT) devices, such as smart thermostats, to collect and interpret data from buildings. This approach enables architects and planners to make informed decisions throughout a building's design, operation, and renovation phases.",
        "Sensors embedded in modern buildings track variables such as energy consumption, temperature, air quality, and occupancy patterns. These insights help optimize energy use, reduce operational costs, and enhance comfort. Smart HVAC (heating, ventilation, and air-conditioning) systems can adjust airflow based on real-time occupancy, improving efficiency. Monitoring space usage may conflict, however, with occupants' privacy concerns and dislike of being tracked without their consent.",
        "Despite high initial costs, building data science offers long-term benefits. Studies show that buildings using these systems can reduce energy consumption by up to 30 percent, making them attractive for sustainable development. As urban populations grow, building data science will be key to creating adaptable spaces. A skyscraper that adjusts its internal climate based on external weather conditions exemplifies this potential. Other applications include optimizing the layouts of hospitals for better patient flow or using occupancy data to redesign underutilized office spaces.",
    ], [
        q(51, 'The word "static" in the passage is closest in meaning to', {
            "A": "impractical.", "B": "unchanging.", "C": "wasteful.", "D": "simple.",
        }, "B"),
        q(52, "The passage indicates all of the following about building data science EXCEPT:", {
            "A": "It uses data collected from Internet of Things devices.",
            "B": "It requires special training in data analysis for architects who use it.",
            "C": "It has an impact on how architects design new buildings.",
            "D": "It can be used as a basis for decisions about a building's operations.",
        }, "B"),
        q(53, "According to the passage, what is one drawback of the use of sensors?", {
            "A": "Sensors lead to greater energy use.",
            "B": "Sensors are known for supplying inaccurate data.",
            "C": "The data collected is frequently hard to interpret.",
            "D": "Some building occupants may not approve of their use.",
        }, "D"),
        q(54, "Why does the author mention \"hospitals\" and \"office spaces\"?", {
            "A": "To give examples of city structures that are often poorly designed.",
            "B": "To demonstrate how building data science can improve urban infrastructure.",
            "C": "To show the limitations of building data science.",
            "D": "To contradict the claim that building data science will be key to creating adaptable spaces.",
        }, "B"),
        q(55, "Based on the passage, building data science can help most with which of the following?", {
            "A": "Increasing a building's office space.",
            "B": "Limiting a building's construction costs.",
            "C": "Reducing a building's environmental impact.",
            "D": "Enhancing a building's visual appeal.",
        }, "C"),
    ]))
    tasks.append(academic("Bird Migration", 2, [
        "Every year, millions of birds travel huge distances to wintering grounds, and then back to breeding grounds when warmer weather returns there. Bird migration evolved in response to climatic changes. During the Ice Age, when average temperatures were frigid, migrating birds had a survival advantage, and the behavior became widespread.",
        "Migration is also linked to resource availability. Arctic terns, which undertake the longest migrations of any animal by flying from their summer breeding grounds in Earth's north polar (Arctic) regions to their wintering grounds in Earth's south polar regions, feed primarily on small fish and other small marine animals. These prey are most abundant when increased sunlight results in the increased availability of algae, the microscopic marine plantlike organisms that are food for the tiny marine animals known as zooplankton, which are in turn consumed by terns' prey.",
        "Not all birds migrate. Rock ptarmigans also live in Arctic and sub-Arctic regions. Instead of flying to warmer climes in winter, they shelter in snow burrows and reduce activity to conserve energy. They feed on plants like birch and willow trees, which are available in their habitat year-round. The divergence between migratory and sedentary species represents different adaptations to environmental pressures.",
    ], [
        q(56, "The passage implies that bird migration began when", {
            "A": "wintering grounds were closer to breeding grounds than they are now.",
            "B": "areas suitable for breeding were smaller than they are now.",
            "C": "there were many more birds than there are now.",
            "D": "climates were generally much colder than they are now.",
        }, "D"),
        q(57, 'What is the passage explaining when it mentions that "increased sunlight results in the increased availability of algae"?', {
            "A": "Why terns' migrations result in increased food availability for them.",
            "B": "Why some tiny marine organisms migrate for long distances.",
            "C": "Why terns depend on sunlight while traveling long distances.",
            "D": "Why terns benefit from the migration of zooplankton.",
        }, "A"),
        q(58, "The passage supports all of the following statements about Arctic terns EXCEPT:", {
            "A": "They take different migration routes depending on resource availability.",
            "B": "They migrate over longer distances than all other birds do.",
            "C": "They spend much of their lives in regions around Earth's poles.",
            "D": "They eat mostly small animals living in sea water.",
        }, "A"),
        q(59, "Why does the passage provide information about rock ptarmigans?", {
            "A": "To emphasize the usefulness of snow burrows in their habitat.",
            "B": "To contrast their behavior to that of Arctic terns.",
            "C": "To show that birch and willow trees provide food to both migratory and sedentary birds.",
            "D": "To provide another example of migratory birds.",
        }, "B"),
        q(60, 'The word "shelter" in the passage is closest in meaning to', {
            "A": "move.", "B": "land.", "C": "seek food.", "D": "take protection.",
        }, "D"),
    ]))
    tasks.append(academic("Understanding Ecological Systems Theory", 2, [
        {"insert": "A", "t": "Ecological Systems Theory, introduced by Urie Bronfenbrenner, revolutionized our perception of human psychological development. It posits that individuals are shaped by interactions among multiple overlapping environmental systems."},
        {"insert": "B", "t": "This theory reshaped developmental research, offering a multifaceted lens that surpasses earlier, linear models."},
        {"insert": "C", "t": "By considering the dynamic interplay between a person and their environment, it highlights the multifactorial nature of psychological growth."},
        {"insert": "D"},
        "The theory delineates several environmental layers, beginning with the microsystem, which refers to the institutions and groups that most directly impact the child's development, such as family and school. The mesosystem encompasses the relationships among the microsystems, such as the impact of a teacher's communication with parents on a child's education. Beyond these, the exosystem consists of indirect influences like a parent's workplace stress subtly affecting the home environment. The macrosystem, encompassing broader cultural and societal contexts, frames these interactions with underlying norms and policies.",
        "While Bronfenbrenner's model offers an intricate framework, it is not without critique. Some argue that the model underestimates the role of technology, which has created virtual microsystems that transcend geographical limits. Despite these critiques, the theory remains influential in fields ranging from education to public policy, prompting continuous exploration of its applications and adaptations.",
    ], [
        q(61, "Why does the author mention a teacher's communication with parents in paragraph 2?", {
            "A": "To illustrate the interactions among microsystems that characterize the mesosystem",
            "B": "To support the claim that the institutions of the microsystem affect children directly",
            "C": "To show that Bronfenbrenner's theory is primarily linear",
            "D": "To suggest that microsystems are more important than the mesosystem",
        }, "A"),
        q(62, 'The phrase "subtly affecting" in the passage is closest in meaning to', {
            "A": "affecting in harmless but unpredictable ways",
            "B": "affecting in long-lasting ways",
            "C": "affecting in ways both positive and negative",
            "D": "affecting in small, barely noticeable ways",
        }, "D"),
        q(63, "The passage suggests that criticisms of Bronfenbrenner's model call for which of the following?", {
            "A": "Its replacement with a less intricate framework",
            "B": "Its modification to include virtual interactions",
            "C": "Its replacement with a model that gives greater consideration to geographical boundaries",
            "D": "Its exclusion from fields such as education and public policy",
        }, "B"),
        q(64, "Which of the following best describes the influence of Ecological Systems Theory?", {
            "A": "It has had little impact on psychology but has unexpectedly affected other fields.",
            "B": "It revolutionized the field of human psychology but is not taken seriously in other fields.",
            "C": "It changed the way human psychology is understood and continues to influence other fields.",
            "D": "It has gone mostly unnoticed among psychologists and has had little impact on other fields.",
        }, "C"),
        insert_q(65, "Each one plays a distinct role in shaping behavior", "B"),
    ]))
    return paper(ID, "reading", "阅读", [
        {"n": 1, "timeSec": 960, "from": 1, "to": 40},
        {"n": 2, "timeSec": 1500, "from": 41, "to": 65},
    ], tasks)


def build_listening():
    return paper(ID, "listening", "听力", [
        {"n": 1, "timeSec": 960, "from": 1, "to": 8},
        {"n": 2, "timeSec": 480, "from": 9, "to": 12},
    ], [
        lecture("Cladh Hallan", 1, "listening_m1_q01_q04_lecture_cladh_hallan.mp3", [
            q(1, "What does the speaker mainly discuss?", {
                "A": "The reasons that Bronze Age people practiced mummification.",
                "B": "The discovery of prehistoric mummies in a surprising location.",
                "C": "The processes that turn mummies into skeletons.",
                "D": "The climate of Bronze Age Scotland.",
            }, "B"),
            q(2, "What does the speaker imply about Scotland?", {
                "A": "Its climate is not favorable for typical methods of preserving bodies.",
                "B": "It makes archaeological research easy.",
                "C": "Its oldest skeletons date back to around 4000 B.C.E.",
                "D": "It may have many Bronze Age sites similar to Cladh Hallan.",
            }, "A"),
            q(3, "According to the speaker, what did radiocarbon dating reveal?", {
                "A": "A pile of bones belonged to two different people.",
                "B": "A man and a woman had died around 1500 B.C.E.",
                "C": "Two objects that looked like skeletons were not made of bone.",
                "D": "Two people were buried long after they had died.",
            }, "D"),
            q(4, "Why does the speaker mention butter?", {
                "A": "To point out an animal fat frequently used to preserve bodies.",
                "B": "To show that ancient people understood a property of peat bogs.",
                "C": "To help illustrate how swamps break down organic material.",
                "D": "To suggest that peat bogs were possibly used to preserve food.",
            }, "B"),
        ]),
        lecture("Sleep and Cognitive Function", 1, "listening_m1_q05_q08_lecture_sleep_cognitive_function.mp3", [
            q(5, "What is the main topic of the talk?", {
                "A": "The effects of caffeine on sleep.",
                "B": "The different stages of deep sleep.",
                "C": "Common sleep disorders and their treatments.",
                "D": "The benefits of sleep for cognitive function.",
            }, "D"),
            q(6, "What does the speaker say about memory consolidation?", {
                "A": "It occurs mainly during deep sleep stages.",
                "B": "It affects problem-solving abilities.",
                "C": "It happens primarily in people with sleep disorders.",
                "D": "It allows the brain to process emotional experiences.",
            }, "A"),
            q(7, "Why does the speaker mention mood swings?", {
                "A": "To highlight common symptoms of stress.",
                "B": "To point out the impact of sleep deprivation on emotional regulation.",
                "C": "To explain the effects of sleep hygiene on problem-solving abilities.",
                "D": "To illustrate the various stages of sleep.",
            }, "B"),
            q(8, "What advice does the speaker give for improving sleep quality?", {
                "A": "Avoid stressful experiences.",
                "B": "Maintain a regular sleep schedule.",
                "C": "Avoid all caffeine consumption.",
                "D": "Spend more time in bed.",
            }, "B"),
        ]),
        lecture("The Renaissance", 2, "listening_m2_q01_q04_lecture_renaissance.mp3", [
            q(9, "What is the talk mainly about?", {
                "A": "The invention of the printing press.",
                "B": "The development of modern astronomy.",
                "C": "The political instability of the Renaissance period.",
                "D": "The Renaissance as a turning point in European history.",
            }, "D"),
            q(10, "Why does the speaker mention classical learning during the Renaissance?", {
                "A": "To explain why ancient texts are difficult to find in Europe.",
                "B": "To argue that classical ideas were no longer relevant.",
                "C": "To describe how printing replaced ancient writing systems.",
                "D": "To show how Renaissance thinkers were influenced by earlier cultures.",
            }, "D"),
            q(11, "According to the speaker, what was one effect of the invention of the printing press?", {
                "A": "It promoted an increase in literacy.",
                "B": "It limited the topics scholars could write about.",
                "C": "It led to the decline of handwritten manuscripts.",
                "D": "It caused a decrease in interest in classical learning.",
            }, "A"),
            q(12, "What does the speaker say about Renaissance astronomy?", {
                "A": "It highlighted Earth's special place in the universe.",
                "B": "It focused mainly on astrology and superstition.",
                "C": "It introduced ideas that challenged earlier beliefs.",
                "D": "It rejected the use of observational tools.",
            }, "C"),
        ]),
    ])


def build_writing():
    p = paper(ID, "writing", "写作", [
        {"n": 1, "timeSec": 1680, "from": 1, "to": 4, "label": "Email"},
        {"n": 2, "timeSec": 3600, "from": 5, "to": 10, "label": "Academic Discussion"},
    ], [
        email(1,
            "You bought an item from a website, but there is a problem with the order. Write an email to customer service to complain.",
            ["Describe the problem.",
             "Explain how it affected you.",
             "Request a solution."],
            "Customer Service", "Problem with online order",
            "Dear Customer Service Team,\n\n"
            "I am writing to report a problem with an item I recently ordered from your website. The package arrived three days later than the expected delivery date, and when I opened it, I found that the product was scratched and missing one accessory listed in the online description.\n\n"
            "This caused an inconvenience because I had planned to use the item for a class project this week. I also spent extra time checking the package and taking photos of the damage.\n\n"
            "Could you please arrange either a replacement or a full refund? I can send my order number, photos, and the delivery receipt if needed. Thank you for your attention to this matter. I look forward to your response.\n\n"
            "Sincerely,\nAlex Chen"),
        email(2,
            "You recently enrolled in an online language course and have enjoyed it. However, you are having some trouble with the online class platform. You need to contact the course instructor, Mrs. White, to resolve this issue.",
            ["Mention what you enjoyed most about the course.",
             "Describe the issue you are having with the online platform.",
             "Propose a solution to resolve this problem."],
            "Mrs. White", "Online class platform issue",
            "Dear Mrs. White,\n\n"
            "I hope you are doing well. I have really enjoyed the online language course, especially the speaking activities and short pronunciation exercises. They have helped me feel more confident using the language in real situations.\n\n"
            "However, I have been having trouble with the class platform. Several times this week, the video lesson stopped loading, and I could not submit my practice recording before the deadline. I tried restarting my computer and using a different browser, but the same problem happened again.\n\n"
            "Would it be possible to send me an alternative link or allow me to submit the recording by email until the platform works properly? I would appreciate any advice you can give.\n\n"
            "Sincerely,\nAlex Chen"),
        email(3,
            "You are a member of a local community club that organizes monthly events, such as neighborhood clean-up days and guest-speaker nights. You attended the local university's workshop on planning large community events and wanted to share what you learned with your local community club president, Ms. Jackson.",
            ["Mention what you enjoyed about the workshop you attended.",
             "Explain how what you learned in the workshop can be applied to future events in your local club.",
             "Request a meeting to discuss further."],
            "Ms. Jackson", "Ideas from the community event workshop",
            "Dear Ms. Jackson,\n\n"
            "I wanted to share some ideas from the university workshop on planning large community events. I especially enjoyed the section about organizing volunteers because it explained how clear roles and simple checklists can make an event run more smoothly.\n\n"
            "I think we could apply these ideas to our future clean-up days and guest-speaker nights. For example, we could create small teams for registration, supplies, publicity, and follow-up communication. This would make responsibilities clearer and help new volunteers participate more confidently.\n\n"
            "Could we meet sometime next week to discuss these ideas in more detail? I would be happy to bring my notes and help prepare a sample plan for our next event.\n\n"
            "Best regards,\nAlex Chen"),
        email(4,
            "You recently visited a restaurant and noticed that its menu could be improved. Write an email to the restaurant manager.",
            ["Explain what you noticed about the menu.",
             "Suggest specific improvements.",
             "Explain how these changes could help customers."],
            "Restaurant Manager", "Suggestions for improving the menu",
            "Dear Restaurant Manager,\n\n"
            "I recently visited your restaurant and enjoyed the food and friendly service. However, I noticed that the menu could be easier for customers to use. Some dishes did not include clear descriptions, and it was difficult to identify vegetarian, spicy, or allergy-friendly options.\n\n"
            "I suggest adding short descriptions under each dish and using simple symbols for common dietary information. It might also help to group popular dishes or seasonal specials in a separate section so customers can make decisions more quickly.\n\n"
            "These changes would make ordering faster and help customers feel more confident about their choices. They could also reduce questions for the servers during busy hours. Thank you for considering my suggestion.\n\n"
            "Sincerely,\nAlex Chen"),
        disc(5, "Urban Culture", "Dr. Diaz", "diaz.png",
             "Some people believe permanent public art installations are the best way to build a community's cultural identity. Others think short-term cultural events and community programs can also bring residents together and shape identity. Which view do you support, and why?",
             [post("Maya", "kelly.png",
                   "Permanent murals and sculptures can become familiar landmarks and give local artists a lasting public platform."),
              post("Daniel", "andrew.png",
                   "Temporary art festivals and cultural programs can involve more residents and make the community feel active and inclusive.")],
             [{"title": "Support Permanent Public Art",
               "text": "While Daniel makes a reasonable point about the energy of temporary events, I agree more with Maya that permanent public art is a stronger way to build community identity. The main reason is that lasting art becomes part of residents' daily environment. For example, a neighborhood mural that reflects local history can be seen by students, workers, visitors, and families every day, not only during a special event. Over time, it can become a shared landmark and a visual reminder of what the community values. Temporary festivals may bring people together for a weekend, but their effect can fade quickly. Permanent art continues to educate people, beautify public spaces, and give local artists a visible platform. Therefore, communities should invest in public art that remains present and meaningful over time."},
              {"title": "Support Temporary Cultural Events",
               "text": "I agree more with Daniel that short-term cultural events and community programs can shape identity more effectively than permanent installations. Maya is right that murals and sculptures can become familiar landmarks, but identity is not only about what people see; it is also about what they do together. For example, an annual art festival can invite residents to watch performances, meet local artists, volunteer, and share food or music from different backgrounds. These activities create direct interaction and help people feel included. Temporary programs can also change from year to year, so they can respond to new interests and social needs. Permanent art may be beautiful, but it can become background scenery. Active cultural events create memories, relationships, and participation, which are often more powerful for community identity."}]),
        disc(6, "Business Communication", "Dr. Diaz", "diaz.png",
             "Should a company keep using a fixed visual design to preserve a stable brand image, or should it update its visual style according to new trends? Why?",
             [post("Claire", "kelly.png",
                   "A stable visual design helps customers recognize a company quickly and builds trust over time."),
              post("Paul", "andrew.png",
                   "Following trends can make a company look modern and help it connect with younger customers.")],
             [{"title": "Keep a Stable Visual Design",
               "text": "I agree more with Claire that a company should keep a stable visual design if it wants to build trust. The main reason is that customers often recognize a business through repeated visual signals, such as colors, logos, packaging, and website style. For example, when consumers see the same clean design across a company's store, advertisements, and app, they can identify the brand quickly and feel that it is reliable. This consistency reduces confusion and supports long-term loyalty. Paul is right that trends can attract attention, especially among younger customers, but constant redesign may make a company look unstable or desperate to follow fashion. A better strategy is to update small details while preserving the core identity. Therefore, stable design should remain the foundation of branding."},
              {"title": "Update Visual Style Thoughtfully",
               "text": "I agree more with Paul that companies should update their visual style according to new trends when the change is thoughtful. A fixed design can help recognition, as Claire notes, but a company also has to show that it understands current consumers. For example, old icons and heavy colors may seem less innovative even if the products are good. By refreshing its design, the company can communicate energy and relevance. This does not mean replacing the entire brand identity every year. The core logo and values can stay stable while colors, images, and digital layouts are modernized. In this way, a company can preserve recognition and still connect with new customers. Therefore, controlled visual updates are often necessary."}]),
        disc(7, "Psychology", "Dr. Diaz", "diaz.png",
             "This week, we are exploring the concept of emotional intelligence in the workplace. Emotional intelligence involves the ability to understand and manage your own emotions, as well as the emotions of others. Some argue that emotional intelligence is more important than technical skills for professional success. What are your thoughts on this?",
             [post("Kelly", "kelly.png",
                   "I think emotional intelligence is crucial for professional success. Being able to manage emotions and build strong relationships can lead to better teamwork and communication, which are essential in any job."),
              post("Andrew", "andrew.png",
                   "I believe that technical skills are more critical for professional success. All jobs require technical skills in at least some ways, such as using statistics to analyze data and guide decision-making.")],
             [{"title": "Prioritize Emotional Intelligence",
               "text": "I agree more with Kelly that emotional intelligence is extremely important for professional success. The main reason is that most workplaces depend on cooperation, not only individual ability. For example, in a hospital, business office, or school, employees must handle pressure, listen to others, and respond calmly when problems occur. A person with strong emotional intelligence can give feedback without causing conflict, understand a client's concern, and keep a team focused during stressful situations. As a result, the workplace becomes more productive and less divided. Andrew is right that technical skills are necessary, but technical knowledge alone does not guarantee effective teamwork. If a skilled worker communicates poorly or reacts angrily, the whole project can suffer. Therefore, emotional intelligence should be treated as a core professional skill."},
              {"title": "Prioritize Technical Skills",
               "text": "I believe technical skills are more important because they are the foundation of professional competence. An engineer designing a bridge, a nurse giving medication, or an accountant preparing financial records must first know the correct procedures. Good communication can make the workplace smoother, but it cannot replace accuracy when the task itself requires expertise. A friendly employee without the necessary skills may still make serious mistakes. Kelly is right that emotional intelligence helps people cooperate, and companies should encourage it through training. However, emotional intelligence works best after workers have the technical ability to do their jobs well. For this reason, technical competence should come first in professional success."}]),
        disc(8, "Community Planning", "Dr. Diaz", "diaz.png",
             "Should a community prioritize permanent public art, such as murals and sculptures, or invest more in temporary cultural events, such as outdoor concerts and art festivals? Why?",
             [post("Lena", "kelly.png",
                   "Permanent art can beautify streets and give local creators a visible place in the neighborhood."),
              post("Omar", "andrew.png",
                   "Temporary events can gather residents, create shared memories, and benefit the community more directly.")],
             [{"title": "Prioritize Permanent Art",
               "text": "I support prioritizing permanent public art because it provides a long-term cultural benefit. Lena's point about beautifying streets is important. For example, a mural, sculpture, or public installation can turn an ordinary square into a recognizable community space. Residents may pass it every day, take visitors there, and connect it with local history or creativity. This repeated exposure helps the artwork become part of the community's identity. Temporary concerts and festivals can be exciting, but they often require repeated funding and disappear after a short period. Permanent art continues to serve the public without needing to be recreated each season. Although communities should still hold events when possible, lasting installations give the neighborhood a stable cultural symbol and support local artists over time."},
              {"title": "Invest in Temporary Events",
               "text": "I agree more with Omar that temporary cultural events may benefit a community more directly. Permanent art can improve the appearance of public spaces, but events create active participation. For example, an outdoor concert or art festival can bring together students, families, older residents, small businesses, and local performers in one shared experience. People do not simply look at culture; they talk, volunteer, learn, and build relationships. These events can also change each year, which allows the community to respond to different interests and include more voices. Permanent art may not appeal to everyone, and once it is installed, it is difficult to adjust. Temporary events are flexible, inclusive, and socially interactive. Therefore, communities should invest more in cultural activities that people can experience together."}]),
        disc(9, "Business Ethics", "Dr. Diaz", "diaz.png",
             "We have been discussing corporate transparency, where businesses are open with employees and the public about their operations. Others argue that certain information should remain confidential to protect competitive advantages. Do you think corporate transparency is essential, or should some information be kept confidential? Why?",
             [post("Kelly", "kelly.png",
                   "I think corporate transparency is essential. It builds trust with consumers and stakeholders and demonstrates a company's commitment to ethical practices."),
              post("Andrew", "andrew.png",
                   "In my opinion, certain information should be kept confidential to protect competitive advantages. Complete transparency could potentially harm a company's position in the market.")],
             [{"title": "Transparency Builds Trust",
               "text": "I believe corporate transparency is essential because it creates long-term trust. Kelly is right that customers, employees, and stakeholders respond well when a company communicates honestly. For example, if a food company clearly explains where its ingredients come from and how it handles safety problems, consumers are more likely to believe that the company is responsible. Transparency can also reduce rumors inside the workplace because employees understand major decisions and feel respected. Andrew is correct that certain trade secrets must be protected, but this does not justify hiding information about safety, ethics, wages, or environmental impact. A balanced but open approach helps businesses maintain credibility and avoid scandals. Therefore, companies should be as transparent as possible on issues that affect public trust."},
              {"title": "Protect Necessary Confidentiality",
               "text": "I think some information should remain confidential because complete transparency can damage a company's ability to compete. Andrew's point about protecting competitive advantages is important. For example, a technology company cannot reveal every product design, research plan, or pricing strategy before launch, because competitors could copy the idea and weaken the business. If this happens, the company may lose revenue and reduce future investment or jobs. Kelly is right that customers and employees deserve honesty, especially about safety and ethical policies. However, transparency should not mean exposing every internal decision. A responsible company can share information that affects fairness, trust, and public welfare while keeping genuine trade secrets confidential. This balance protects both the public and the company's ability to operate."}]),
        disc(10, "Arts Education", "Dr. Diaz", "diaz.png",
             "Some people think communities should place permanent installation art to show artists' talents. Others believe communities should increase concerts and theatrical performances so people can receive better arts education. Which view do you support?",
             [post("Nora", "kelly.png",
                   "Permanent installations help residents encounter art every day and make creative work part of normal public life."),
              post("Ethan", "andrew.png",
                   "Concerts and theater performances teach people through shared experiences and direct interaction with artists.")],
             [{"title": "Permanent Installations as Public Classrooms",
               "text": "I support permanent installation art because it makes art education part of everyday life. Nora's point is persuasive: residents can encounter creative work daily in parks, streets, libraries, or public squares. For example, a sculpture about local history or a mural designed by community artists can encourage students and families to ask questions about style, culture, and meaning even when they are not attending a formal event. This constant exposure lowers the barrier to art education because people do not need tickets or a schedule. Ethan is right that concerts and theater can be powerful, but they are temporary and may reach only people who are available at that time. Permanent installations create an open public classroom, so communities should invest in them."},
              {"title": "Live Performance Teaches More Directly",
               "text": "I agree more with Ethan that concerts and theatrical performances can provide better arts education. Permanent installations are useful, as Nora says, but live performances teach through interaction, emotion, and shared experience. For example, a community theater performance can include discussion with actors afterward, while a concert can introduce different instruments, cultural traditions, and performance techniques. Students and residents can hear explanations, ask questions, and see how artists make decisions in real time. This kind of active learning is often more memorable than simply passing by a sculpture. Permanent art may become familiar, but people can stop noticing it. Concerts and theater create focused attention and direct contact with artists. Therefore, communities should expand live arts programs to strengthen arts education."}]),
    ])
    check_writing(p)
    return p


REPEATS = [
    ("course", "You are working at the university registration office. Your supervisor is training you to help students select courses. Listen to the supervisor and repeat what the supervisor says. Repeat only once.", [
        "Enter your name and student ID number.",
        "Browse the course catalog to choose your classes.",
        "You can use the schedule planner tool to avoid time conflicts.",
        "If a class is already full, a pop-up message will appear.",
        "Contact the instructor to see if more seats can be added.",
        "You can still add or drop classes up until the second week of the new semester.",
        "For your records, print out a list of your classes or email a copy to yourself.",
    ]),
    ("woodworking", "You are volunteering at a community workshop. The leader is training you to guide beginners through basic woodworking steps. Listen to the leader and repeat what the leader says. Repeat only once.", [
        # ponytail: answers OCR for this set was fragmented; samples reconstructed from readable fragments.
        "Measure carefully to avoid mistakes.",
        "Draw a line with a pencil before cutting.",
        "Hammer the nails gently so the wood does not split.",
        "When sawing or using heavy equipment, wear safety glasses for protection.",
        "When drilling into the wood, keep the tool straight so the hole remains neat and smooth.",
        "Lightly sand the edges until they feel smooth and even.",
        "Store the tools safely after you finish the project.",
    ]),
    ("library", "You are working a part-time job at the university library. Your manager is training you to help visitors use library materials. Listen to the manager and repeat what the manager says. Repeat only once.", [
        "Store documents to prevent damage.",
        "Temperature controls help protect papers.",
        "Use the catalog system to organize records expertly.",
        "Carefully use restoration tools to repair damaged items.",
        "We provide a quiet reading area for researchers.",
        "Security cameras are used to monitor sensitive materials.",
        "Researchers can request archived files from the computer screen.",
    ]),
    ("presentation", "You are working at a school as part of an internship. Your supervisor is training you to help students prepare for their presentations. Listen to the supervisor and repeat what the supervisor says. Repeat only once.", [
        "Start by setting up the projector screen.",
        "Use the whiteboard to highlight key points.",
        "Arrange your project materials neatly on the tables.",
        "Check all the equipment to ensure it works properly.",
        "Make sure your computer is set up with your presentation.",
        "It's a good idea to practice delivering your speech in front of some friends.",
        "Take time to review your notes thoroughly so you'll feel confident and prepared.",
    ]),
    ("yoga", "You are volunteering at a campus wellness class. The instructor is training you to guide beginners in yoga practice. Listen to the instructor and repeat what the instructor says. Repeat only once.", [
        "Find a good place to roll out your mat.",
        "Keep some water handy to drink when needed.",
        "Focus on slow breathing to stay relaxed through each pose.",
        "Pay attention to the instructor's words to learn proper form.",
        "A block can help you maintain your balance while holding poses.",
        "During the class, move slowly and listen to your body.",
        "If you have questions about the positions, speak with the teacher.",
    ]),
]

INTERVIEWS = [
    ("history", "You have volunteered for a research study about history education. You will have a short online interview with a researcher.", [
        ("What is one aspect of history that you find particularly interesting?",
         "I find everyday social history especially interesting because it shows how ordinary people lived, worked, and made decisions. Big wars and famous leaders are important, but daily life helps me understand the human side of the past. For example, when I read about old markets, schools, or family routines, I can imagine what people worried about and what they valued. That makes history feel less distant and more connected to real life. It also helps me compare the past with my own community today. So overall, I like this area because it turns history from a list of dates into a story about people."),
        ("Describe a history-related activity or project you enjoyed. What made it engaging?",
         "One history-related project I enjoyed was making a timeline about my city for a class presentation. I chose it because I wanted to understand how the streets around me had changed over time. I compared old photographs with current buildings, looked up newspaper records, and interviewed an older neighbor who had lived there for decades. What made the project engaging was that I could connect historical information with places I actually knew. It felt active, not just like memorizing facts from a textbook. After the project, I paid more attention to old buildings and street names, so it really changed how I saw my city."),
        ("If you were to visit a historical site you've never visited before, which one would you choose and why?",
         "If I could visit a historical site I have never seen before, I would choose Pompeii. The main reason is that it preserves details of ancient daily life in a very powerful way. I would like to see the homes, streets, shops, and public spaces because they would help me imagine how people lived before the disaster. It is different from only reading about ancient Rome in a book. Seeing the actual place would make the history feel concrete and emotional. I would also be interested in how archaeologists protect the site today. So for me, Pompeii would be both educational and memorable."),
        ("Do you think the study of history remains important in today's educational system? Why or why not?",
         "Yes, I think the study of history remains important in education. The main reason is that history helps students understand how societies change and why certain problems repeat. For example, when students learn about economic crises, wars, or social movements, they can see how decisions made by leaders and ordinary citizens created long-term consequences. This can make them more careful when they think about current events. Of course, students also need science, technology, and practical skills. But history gives them context and judgment. Without it, people may only react to the present without understanding where problems came from. So I think history should stay in the curriculum."),
    ]),
    ("renewable", "You are participating in a study about renewable energy sources. The researcher will ask you some questions concerning your opinions on renewable energy and its implementation.", [
        ("Thanks for your participation. I'd like to discuss your views on renewable energy. To start, how important is the issue of renewable energy, such as wind and solar power, to you personally? Why would you say you feel that way?",
         "Renewable energy is important to me because it affects both the environment and everyday health. If a city can use more wind or solar power, it can reduce air pollution and depend less on fossil fuels. That matters because pollution is not just an environmental issue; it also affects people's breathing, outdoor activities, and quality of life. I do not think individual people can solve the energy problem alone, but caring about it changes the choices we support. For example, I would be more willing to support public buildings that use solar panels or transportation systems that run on cleaner power. So yes, I see renewable energy as a practical and long-term issue."),
        ("Now, describe a time when you or someone you know tried to reduce energy use. What actions were taken? What made it easy or difficult?",
         "A few months ago, my family tried to reduce energy use at home because our electricity bill was getting high. We started turning off lights, unplugging chargers, using fans instead of air conditioning when possible, and doing laundry only when we had a full load. The easy part was that these actions were simple and did not require special equipment. The difficult part was keeping the habit consistent, especially during very hot days when everyone wanted to use the air conditioner. Still, the experience made us more aware of waste. It showed me that small actions can help, although bigger systems are also necessary."),
        ("Great. In your daily life, have you noticed any renewable energy initiatives in your community? If yes, what have you seen? How do they impact your area? If not, what's an initiative that might be beneficial for your community?",
         "I have noticed some renewable energy initiatives in my community, especially solar panels on a few public buildings and lights in a park that seem to use solar power. These projects are not huge, but they make clean energy more visible. When people see renewable energy working in normal places like schools, libraries, or parks, it stops feeling like an abstract idea. I think the impact is partly practical and partly educational. It may reduce some electricity use, but it also encourages residents to think about cleaner options. If my community expanded this approach, I would like to see more public facilities using solar energy."),
        ("Many believe that transitioning to renewable energy is crucial for environmental sustainability, while others worry about the costs involved. Do you think the benefits of renewable energy outweigh the drawbacks? Why or why not?",
         "I think the benefits of renewable energy outweigh the drawbacks. It is true that building wind farms, solar panels, or new power systems can be expensive at first. However, the long-term benefits are stronger because renewable energy reduces pollution, protects public health, and makes communities less dependent on limited fossil fuels. For example, once a school or library installs solar panels, it can lower energy costs over time and also teach students about sustainability. Some people worry about reliability, and that is a real concern. But with better storage technology and careful planning, renewable energy can become more practical. So overall, I think it is worth the investment."),
    ]),
    ("environment", "You are participating in a study about environmental practices.", [
        ("First, do you take any specific actions to reduce your environmental impact, such as recycling or conserving energy? Give details in your answer.",
         "Yes, I try to reduce my environmental impact in a few practical ways. I recycle bottles and paper when bins are available, carry a reusable water bottle, and turn off lights or air conditioning when I leave a room. These actions are small, but they are easy to repeat every day, which makes them useful. I also try not to buy things I do not really need, because waste often begins with unnecessary consumption. Of course, I know these habits alone cannot solve climate change. Still, they help me stay aware of my choices and make me more willing to support larger environmental policies."),
        ("Can you describe one or two steps your community or neighborhood takes to be environmentally friendly? For example, are there solar panels on buildings or rainwater barrels available where you live?",
         "My neighborhood has recycling bins in several public areas and a small community garden near the apartment buildings. The garden encourages people to compost food waste and grow vegetables together. It is not a huge project, but it makes environmental protection feel local and practical. For example, children can see how food scraps turn into soil, and older residents often share gardening tips. There are also signs reminding people to save water and sort trash correctly. These steps are simple, but they create a habit of paying attention to waste. I think that kind of daily awareness is important for a community."),
        ("If you had the chance to participate in an ecological or nature-based activity, such as a community cleanup effort or tree planting event, what would you do and why?",
         "If I had the chance to join an ecological activity, I would choose a tree planting event. The main reason is that it has a clear long-term benefit. Trees can provide shade, improve air quality, reduce heat in public spaces, and make a neighborhood more pleasant. I would also enjoy doing something visible and practical with other people. A cleanup activity is useful too, but the effect can disappear quickly if people litter again. A tree, if it is cared for properly, can keep helping the community for years. So I would choose tree planting because it combines teamwork with a lasting environmental result."),
        ("Some people believe that individual actions are not enough to address conservation issues and that significant changes must come from government policies. Do you agree or disagree with this viewpoint? Why or why not?",
         "I partly agree with the idea that major conservation changes must come from government policies. Large environmental problems require large-scale action, such as regulations on pollution, investment in public transportation, and support for clean energy. Individual people cannot control factories or national energy systems by themselves. However, I do not think personal action is meaningless. If citizens recycle, conserve energy, and use public transportation, it becomes easier for governments to pass stronger policies because the public already supports them. Individual behavior also creates social pressure on businesses. So overall, government action is essential, but it works best when ordinary people cooperate and change their habits too."),
    ]),
    ("history2", "You are participating in a research interview about how people study history.", [
        ("Do you mainly gain historical knowledge from school classes or from independent reading outside class?",
         "I mainly gain historical knowledge through independent reading because it lets me choose topics that truly interest me. Classes are useful because they provide structure and help me understand major events in order. However, books, articles, and documentaries allow me to explore details at my own pace. For example, if I become interested in ancient trade or local history, I can read more than a class would normally cover. Independent reading also makes me ask my own questions instead of only following a syllabus. So I think both methods matter, but outside reading gives me more freedom and makes history feel more personal."),
        ("When studying history, which area interests you more: culture, politics, or another topic?",
         "Culture interests me most when I study history because it shows how people expressed their values through language, food, art, religion, and daily customs. Politics is important, of course, because governments and leaders shape major events. But culture often reveals what life felt like for ordinary people. For example, learning about traditional clothing or festivals can show how communities understood family, identity, and social roles. That kind of information makes the past more vivid for me. It also helps me compare different societies without only focusing on wars or rulers. So if I had to choose, I would say culture is my favorite area."),
        ("Have you visited a museum? Can places like museums deepen your understanding of history?",
         "Yes, I have visited a museum, and it did deepen my understanding of history. Seeing real objects, maps, tools, and photographs made the past feel much more concrete. For example, when I saw old household items and handwritten letters, I could imagine how people lived and communicated. A textbook can explain events clearly, but a museum gives a visual and emotional experience. It also organizes objects in a way that shows connections between different periods. Of course, a museum cannot show everything, and visitors still need background knowledge. But overall, I think museums are very helpful because they make history easier to remember."),
        ("Do you agree that studying history can help people avoid repeating past mistakes? Why or why not?",
         "I agree that studying history can help people avoid repeating past mistakes, although it does not guarantee better choices. The main reason is that history shows patterns in conflict, prejudice, economic problems, and poor leadership. For example, when people learn how misinformation or extreme nationalism contributed to past crises, they may become more careful about similar trends today. History also teaches that decisions often have consequences beyond the present moment. Of course, every situation is different, so we cannot simply copy old solutions. Still, understanding the past gives people more perspective. It can make citizens and leaders think before acting too quickly."),
    ]),
    ("gifts", "You will answer a researcher's questions about gift-giving habits and culture.", [
        ("Do you like to give gifts? Why?",
         "Yes, I like giving gifts because it is a simple way to show that I care about someone. I enjoy thinking about what the person actually likes instead of just buying something expensive. For example, if a friend enjoys drawing, I might choose a good sketchbook or a set of pens. The gift does not have to be large, but it should feel personal. I also like the moment when the person opens it and realizes that I remembered a detail about them. So for me, giving gifts is not mainly about money. It is about attention, kindness, and keeping relationships warm."),
        ("What are the factors that you consider when giving gifts to other people?",
         "When I choose a gift, I usually consider the person's interests, age, and current needs. I also think about whether the gift should be practical or more emotional. For example, if someone is moving into a new apartment, a useful household item may be better than a decorative object. But if it is a close friend, I might choose something connected to a shared memory. Price matters, but it is not the most important factor. A very expensive gift can feel awkward if it does not match the person. I think the best gift shows that the giver paid real attention."),
        ("What is one memorable gift you have received, or that you gave to others before?",
         "A memorable gift I received was a notebook from a friend before an important exam. It was not expensive at all, but she wrote a short encouraging message inside the first page. At that time, I was nervous and felt that I was not fully prepared. The message made me feel supported, and I actually used the notebook to organize my review plan. What made the gift special was not the notebook itself, but the timing and the personal note. I kept it afterward because it reminded me that someone believed in me. That gift taught me that thoughtfulness matters more than price."),
        ("Do you prefer to make a wish list and let other people send you gifts on the list, or do you prefer to have surprises?",
         "I prefer surprises because they feel more personal and emotional. A wish list is useful, especially when people do not know each other well, because it prevents waste. However, it can also make gift-giving feel like a transaction. I enjoy it more when someone chooses a surprise carefully based on what they know about me. For example, if a friend remembers a book I mentioned months ago and buys it for me, I would feel really touched. Of course, surprises can sometimes miss the mark. But overall, I like them because they show attention, effort, and a real understanding of the relationship."),
    ]),
]


def build_speaking(pid, title, form, interview=None):
    tasks = []
    modules = []
    if form:
        _key, instruction, samples = REPEATS[form - 1]
        start_q = (form - 1) * 7
        for i, sample in enumerate(samples, 1):
            fname = "speaking_listen_repeat_q%02d.mp3" % (start_q + i)
            NEED.append(fname)
            tasks.append({
                "type": "repeat", "module": 1, "id": i,
                "speakSec": 15 if i < 7 else 18,
                "instruction": instruction,
                "audio": AUDIO + fname,
                "sample": sample,
            })
        modules.append({"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"})
    if interview:
        _ikey, i_instruction, items = INTERVIEWS[interview - 1]
        start = 8 if form else 1
        mod = 2 if form else 1
        start_q = (interview - 1) * 4
        modules.append({"n": mod, "timeSec": 360, "from": start, "to": start + 3, "label": "Take an Interview"})
        for i, (stem, sample) in enumerate(items, 1):
            fname = "speaking_take_interview_q%02d.mp3" % (start_q + i)
            NEED.append(fname)
            tasks.append({
                "type": "interview", "module": mod, "id": start - 1 + i,
                "speakSec": 45, "instruction": i_instruction, "stem": stem,
                "audio": AUDIO + fname,
                "sample": sample,
            })
    return {
        "id": pid, "title": title, "set": SET, "skill": "speaking",
        "modules": modules, "tasks": tasks,
    }


def copy_audio():
    dest = os.path.join(ROOT, AUDIO)
    os.makedirs(dest, exist_ok=True)
    seen = set()
    for fname in NEED:
        if fname in seen:
            continue
        seen.add(fname)
        src = os.path.join(SRC, fname)
        if not os.path.isfile(src):
            raise SystemExit("missing audio " + src)
        out = os.path.join(dest, fname)
        shutil.copy2(src, out)
        os.chmod(out, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
    print("copied", len(seen), "audio files")


if __name__ == "__main__":
    dump("2025-07-04-reading.json", build_reading())
    dump("2025-07-04-listening.json", build_listening())
    dump("2025-07-04-writing.json", build_writing())
    dump("2025-07-04-speaking.json", build_speaking(
        ID, TITLE + " · 口语 Form 1", 1, 1))
    dump("2025-07-04-speaking-f2.json", build_speaking(
        ID + "-s2", TITLE + " · 口语 Form 2", 2, 2))
    dump("2025-07-04-speaking-f3.json", build_speaking(
        ID + "-s3", TITLE + " · 口语 Form 3", 3, 3))
    dump("2025-07-04-speaking-f4.json", build_speaking(
        ID + "-s4", TITLE + " · 口语 Form 4", 4, 4))
    dump("2025-07-04-speaking-f5.json", build_speaking(
        ID + "-s5", TITLE + " · 口语 Form 5", 5, 5))
    copy_audio()
