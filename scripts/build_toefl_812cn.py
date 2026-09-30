#!/usr/bin/env python3
"""Build 8.12 China offline TOEFL. Run: python3 scripts/build_toefl_812cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/8 月/8.12-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-08-12/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-08-12"
SET = "8.12"
TITLE = "新托福 8.12 国内线下"


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


def lecture(title, module, fname, questions):
    return {
        "type": "lecture",
        "module": module,
        "title": title,
        "instruction": "Listen to the recording.",
        "audio": AUDIO + fname,
        "questions": questions,
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


def build_reading():
    t1, n = cw("Black Holes", 1, 1, [
        "The universe is a vast expanse, filled with mysteries that have intrigued humans for centuries. Black holes are ",
        ("reg", "regions"),
        " in ",
        ("sp", "space"),
        " where ",
        ("gra", "gravity"),
        " is ",
        ("s", "so"),
        " strong ",
        ("th", "that"),
        " nothing, ",
        ("n", "not"),
        " even ",
        ("li", "light"),
        ", can ",
        ("esc", "escape"),
        ". Even ",
        ("tho", "though"),
        " they ",
        ("a", "are"),
        " invisible, black holes can be detected by observing their effects on nearby matter. Black holes play a crucial role in astrophysics, influencing galaxy formation and offering insights into the nature of space, time, and gravity.",
    ])
    t2, n = cw("Craftsmanship", 1, n, [
        "Craftsmanship has undergone a profound transformation over the centuries, shifting from a demonstration of manual skill to an expression of artistic vision and communal identity. In medieval Europe, skilled makers—known as artisans—were highly valued not only for their ",
        ("tech", "technical"),
        " expertise ",
        ("b", "but"),
        " also ",
        ("f", "for"),
        " their ",
        ("abi", "ability"),
        " to ",
        ("inf", "infuse"),
        " their ",
        ("crea", "creations"),
        " with ",
        ("mea", "meaning"),
        " and ",
        ("repr", "represent"),
        " deeper ",
        ("spir", "spiritual"),
        " or ",
        ("cult", "cultural"),
        " themes. The intricate details in woodwork, textiles, and pottery served as a testament to the craftsman's mastery and the motifs prevalent during that era.",
    ])
    t3, n = cw("Underwater Robotics", 1, n, [
        "Advancements in underwater robotics are revolutionizing ocean exploration. These robots, known as autonomous underwater vehicles (AUVs), can navigate deep-sea environments independently. Equipped with ",
        ("sen", "sensors"),
        " and ",
        ("cam", "cameras"),
        ", AUVs ",
        ("col", "collect"),
        " data ",
        ("o", "on"),
        " marine ",
        ("li", "life"),
        ", ocean ",
        ("curr", "currents"),
        ", and ",
        ("under", "underwater"),
        " geology. ",
        ("Th", "They"),
        " can ",
        ("re", "reach"),
        " depths ",
        ("th", "that"),
        " are inaccessible to human divers, providing valuable insights into uncharted regions. Researchers use AUVs to study the impact of climate change on ocean ecosystems and to explore underwater archaeological sites, enhancing our understanding of the ocean.",
    ])
    t4, n = cw("Paint as a Medium", 1, n, [
        "The evolution of paint as a medium has significantly impacted the development of visual arts. Early ",
        ("art", "artists"),
        " used ",
        ("nat", "natural"),
        " pigments ",
        ("der", "derived"),
        " from ",
        ("mine", "minerals"),
        ", plants, ",
        ("a", "and"),
        " animal ",
        ("sou", "sources"),
        " to ",
        ("cre", "create"),
        " their ",
        ("wo", "works"),
        ". Advances ",
        ("i", "in"),
        " chemistry ",
        ("resu", "resulted"),
        " in the synthesis of vibrant, durable colors, expanding the artist's palette. Techniques such as oil painting allowed for greater detail and expression. The introduction of acrylic paints offered versatility and fast drying times. Modern painters continue to explore innovative materials and methods, pushing the boundaries of artistic creation.",
    ])
    t5, n = cw("Bone Tools", 1, n, [
        "Using bone for the manufacture of tools and other objects has a long history. Many of the ",
        ("wea", "weapons"),
        " that ",
        ("prehi", "prehistoric"),
        " people ",
        ("us", "used"),
        " for ",
        ("hun", "hunting"),
        " were ",
        ("ma", "made"),
        " from ",
        ("t", "the"),
        " bones ",
        ("o", "of"),
        " the ",
        ("ani", "animals"),
        " they ",
        ("hun", "hunted"),
        ". The ",
        ("phys", "physical"),
        " properties of these materials varied greatly. For example, the strength and flexibility of antler were important to the way these tools were utilized. Many early bone tools show distinctive signs of wear and polishing, revealing how they were handled over time.",
    ])
    if n != 51:
        raise SystemExit("expected next 51 after CW, got %s" % n)
    return paper("reading", "阅读", [
        {"n": 1, "timeSec": 1440, "from": 1, "to": 55},
        {"n": 2, "timeSec": 480, "from": 56, "to": 65},
    ], [
        t1, t2, t3, t4, t5,
        daily("Cooking class registration", 1, "Read an email.", {
            "kind": "card",
            "kicker": "EMAIL",
            "title": "Cooking class",
            "body": (
                "To: Maria Lopez\nSubject: Cooking class\n\n"
                "Thank you for your interest in the Foster Dining Hall cooking class.\n\n"
                "There is currently a waiting list for this popular event. To secure your spot, respond to this email to confirm your registration.\n\n"
                "There is a $10 fee for the use of equipment and ingredients, payable when you arrive.\n\n"
                "Hair nets will be provided and must be worn at all times in the dining hall kitchen. We have aprons for you to borrow, or you can bring your own.\n\n"
                "Best regards,\nMichael Brown"
            ),
        }, [
            q(51, "What can be inferred about Maria Lopez's spot in the class?", {
                "A": "She is currently on the waiting list.",
                "B": "She will lose her spot if she does not respond to this email.",
                "C": "She will secure her spot after she pays a fee.",
                "D": "She has indicated to Michael Brown that she cannot attend.",
            }, "B"),
            q(52, "What must Maria Lopez take to the class?", {
                "A": "A $10 payment",
                "B": "Some ingredients",
                "C": "A hair net",
                "D": "An apron",
            }, "A"),
        ]),
        daily("Winter Student Trek", 1, "Read an advertisement.", {
            "kind": "poster",
            "title": "Winter Student Trek",
            "subtitle": "Alpine Adventures · Swiss Alps",
            "body": (
                "Looking for the ultimate winter break escape? Alpine Adventures invites you to embark on an unforgettable journey through the Swiss Alps—the perfect mix of adventure, culture, and relaxation. Our seven-day Winter Student Trek is designed for both first-time explorers and seasoned adventurers."
            ),
            "fields": [
                {"label": "Highlights", "value": "Snow-dusted valleys, mountain trails, cozy alpine lodges, and wildlife such as ibex and eagles. Each day brings a curated challenge."},
                {"label": "All-inclusive", "value": "Multilingual expert Alpine guides, Swiss meals, comfortable accommodations, and round-trip transportation to the trailhead."},
                {"label": "Group size", "value": "No more than six students. Space is limited."},
                {"label": "Book", "value": "booking@alpineadventures.ch"},
            ],
        }, [
            q(53, "What is indicated about the seven-day Winter Student Trek?", {
                "A": "It provides exclusive access to private ski slopes.",
                "B": "It will be led by professionals with local expertise.",
                "C": "It includes complimentary ski and snowboard rentals.",
                "D": "It offers cooking classes led by professional chefs.",
            }, "B"),
            q(54, "Students should probably avoid participating in the seven-day Winter Student Trek if they", {
                "A": "prefer large groups when joining activities",
                "B": "like to observe wildlife in its natural habitat",
                "C": "enjoy discovering new cultures and places",
                "D": "appreciate customized guidance from experts",
            }, "A"),
            q(55, "Given the description of the seven-day Winter Student Trek, which of the following is true of Alpine Adventures?", {
                "A": "It emphasizes a balance between physical challenge and cultural immersion.",
                "B": "It prioritizes solitary travel experiences over group tour activities.",
                "C": "It primarily targets professional mountaineers seeking extreme adventures.",
                "D": "It offers a range of budget-friendly options for student travelers.",
            }, "A"),
        ]),
        academic("Linguistic Structural Diversity", 2, [
            "Linguistic typology investigates structural features across languages, revealing both universal patterns and language-specific variation. A central area of study is word order—the arrangement of subjects, verbs, and objects. English follows a subject-verb-object (SVO) pattern, while Japanese uses subject-object-verb (SOV). Most languages conform to a limited set of dominant word orders, which may reflect cognitive efficiency: Placing the subject first helps listeners quickly identify the sentence's main actor, aiding comprehension.",
            "Beyond syntax, languages differ in morphological complexity—the degree to which inflection (such as noun or verb endings) marks grammatical relationships. Turkish uses extensive inflection to express subtle distinctions, whereas Mandarin Chinese relies more on word order and context. These contrasts suggest that languages balance morphology and syntax based on communicative needs. Highly inflected languages can afford flexible word order because grammatical roles are marked morphologically. In contrast, languages with minimal inflection often depend on fixed word order to maintain clarity.",
            {"insert": "A", "t": "This trade-off reflects deeper functional pressures."},
            {"insert": "B", "t": "Languages evolve not randomly but in response to cognitive constraints and social factors, including contact with other languages and cultural shifts."},
            {"insert": "C", "t": "Studying this evolution helps linguists understand not only how languages differ but why certain grammatical strategies emerge and persist across communities."},
            {"insert": "D"},
        ], [
            q(56, "Which of the following is NOT mentioned in the passage as an aspect of the study of linguistic typology?", {
                "A": "It has revealed both diversity and universality among structural linguistic features.",
                "B": "It includes the study of word order as a means of aiding comprehension.",
                "C": "It identifies three basic structural patterns across all languages.",
                "D": "It examines differences in morphological complexity among languages.",
            }, "C"),
            q(57, "Why does the author note that placing the subject first in a sentence aids comprehension?", {
                "A": "To provide an example of a structural feature that follows a universal pattern",
                "B": "To suggest that a larger set of available word orders increases cognitive efficiency",
                "C": "To help explain why there is only a small set of dominant word orders across languages",
                "D": "To suggest that languages that follow a different pattern are harder to learn",
            }, "C"),
            q(58, "What is suggested about the morphological complexity of Turkish?", {
                "A": "It is greater than the morphological complexity of Mandarin Chinese.",
                "B": "It is balanced by a relatively simple inflection system.",
                "C": "It developed independently of other elements of Turkish.",
                "D": "It requires Turkish to adhere to a relatively rigid word order.",
            }, "A"),
            q(59, 'The word "pressures" in the passage is closest in meaning to', {
                "A": "difficulties",
                "B": "conflicts",
                "C": "features",
                "D": "influences",
            }, "D"),
            insert_q(60, "Such changes can alter the communicative priorities of a speech community, affecting which features are emphasized or simplified over time.", "C"),
        ]),
        academic("Diane Arbus", 2, [
            "Diane Arbus (1923–1971) occupies a singular place in the history of photography, celebrated and criticized for her stark, intimate portraits of a wide range of people, including some of unconventional appearance or marginalized social status. Her work has long provoked debate because it resists easy moral or aesthetic categorization.",
            "Some critics, such as Susan Sontag, argued that Arbus' photographs create a troubling distance between viewer and subject. Sontag claimed that Arbus' images risk turning people into spectacles of oddity, suggesting that her gaze could be predatory in its fascination with difference. Others, however, see Arbus as a profoundly empathetic artist. Writers like Arthur Lubow emphasize her ability to reveal her subjects' complexity and dignity, noting that many of them collaborated willingly and even joyfully in the creation of their portraits.",
            "A further line of debate surrounds Arbus' style: her use of frontal composition, square format, and direct flash has been interpreted negatively—as a cold, clinical approach—and positively—as a method that strips away artifice to expose deeper truths.",
            "Ultimately, Arbus' work continues to inspire disagreement because it challenges viewers to confront their own assumptions about normalcy, beauty, and vulnerability. Her photographs remain powerful precisely because they refuse to resolve these tensions.",
        ], [
            q(61, 'The word "stark" in the passage is closest in meaning to', {
                "A": "severe",
                "B": "graceful",
                "C": "classic",
                "D": "natural",
            }, "A"),
            q(62, "The passage suggests which of the following about Sontag?", {
                "A": "She believed that Arbus called too much attention to her own technique in her portraits.",
                "B": "She admired Arbus's style but criticized her subject matter.",
                "C": "She viewed Arbus's photography as exploitative.",
                "D": "She felt that Arbus misunderstood her subjects.",
            }, "C"),
            q(63, 'The author mentions "complexity and dignity" primarily in order to', {
                "A": "identify traits that Arbus looked for when choosing photographic subjects",
                "B": "illustrate how some viewers of Arbus' work have refuted a negative view of her",
                "C": "highlight one way in which Arbus' photographs are unconventional",
                "D": "explain why Arbus preferred frontal composition to other ways of posing subjects",
            }, "B"),
            q(64, "The passage indicates that Arbus' style", {
                "A": "helps explain why Arbus' subjects often collaborated willingly in the creation of their portraits",
                "B": "reflected Arbus' preference for an unusual type of photographic film",
                "C": "influenced the way in which other photographers approached portraiture",
                "D": "has been viewed by some people as effective in revealing an authentic reality",
            }, "D"),
            q(65, "It can be inferred that the author regards the disagreements created by Arbus' photographs as", {
                "A": "evidence that Arbus has been misunderstood",
                "B": "essential to the photographs' power as works of art",
                "C": "a reflection of the influence of Sontag on Arbus' reputation",
                "D": "arising from false assumptions about Arbus' style",
            }, "B"),
        ]),
    ])


def build_listening():
    return paper("listening", "听力", [
        {"n": 1, "timeSec": 900, "from": 1, "to": 12},
        {"n": 2, "timeSec": 600, "from": 13, "to": 20},
    ], [
        lecture("Anna Connelly's Fire Escape", 1, "listening_m1_q01_q04_lecture_anna_connelly_fire_escape.mp3", [
            q(1, "What is the main topic of the talk?", {
                "A": "A problem that was solved by a group of women inventors",
                "B": "A safety concern with nineteenth-century firetrucks",
                "C": "A way to prevent fires in tall buildings",
                "D": "An invention that improved safety in cities",
            }, "D"),
            q(2, "Why does the speaker mention a parachute?", {
                "A": "To highlight a problem with some designs",
                "B": "To give an example of a modern solution",
                "C": "To give an example of a patented invention",
                "D": "To emphasize the variety of businesses in cities",
            }, "A"),
            q(3, "What does the speaker like about Anna Connelly's first design?", {
                "A": "It was the least expensive option.",
                "B": "It took into account the origins of most fires.",
                "C": "It had all of the features required by law.",
                "D": "It allowed firefighters to reach higher floors.",
            }, "B"),
            q(4, "What does the speaker indicate about newer buildings?", {
                "A": "They were inspired by Connelly's second design.",
                "B": "They are constructed with iron supports.",
                "C": "They cannot be seen from the outside.",
                "D": "They do not work as well as Connelly's inventions.",
            }, "C"),
        ]),
        lecture("Marine Snow", 1, "listening_m1_q05_q08_lecture_marine_snow_climate.mp3", [
            q(5, "What aspect of marine snow does the speaker mainly discuss?", {
                "A": "Its effects on the atmosphere and ocean life",
                "B": "The way it was discovered",
                "C": "The processes that produce it",
                "D": "How global warming has affected it",
            }, "A"),
            q(6, "According to the speaker, what did scientists once believe about the ocean floor?", {
                "A": "That there were no living organisms there",
                "B": "That seawater froze in the cold, high-pressure conditions there",
                "C": "That only simple, one-celled organisms could survive there",
                "D": "That it was inhabited mainly by creatures like starfish and corals",
            }, "A"),
            q(7, "What does the speaker say that marine snow is made of?", {
                "A": "Ice particles and salt",
                "B": "Organic matter",
                "C": "Microorganisms that thrive near the ocean floor",
                "D": "Dissolved gases",
            }, "B"),
            q(8, "According to the speaker, how does marine snow help regulate Earth's climate?", {
                "A": "By slowing the movement of ocean water",
                "B": "By lowering temperatures in deep ocean water",
                "C": "By transporting carbon to the seafloor",
                "D": "By causing phytoplankton to produce oxygen",
            }, "C"),
        ]),
        lecture("Kandinsky and Schoenberg", 1, "listening_m1_q09_q12_lecture_kandinsky_schoenberg_art.mp3", [
            q(9, "What is the talk mainly about?", {
                "A": "The influence of a musician on an artist",
                "B": "The evolution of twentieth-century musical theory",
                "C": "The historical development of abstract art",
                "D": "The relationship between various performing arts",
            }, "A"),
            q(10, "Why does the speaker mention Schoenberg's disruption of traditional tonal structures?", {
                "A": "To illustrate the inspiration for Kandinsky's artistic approach",
                "B": "To argue for a return to traditional art techniques",
                "C": "To compare the complexity of music with the simplicity of visual art",
                "D": "To provide an example of musical evolution",
            }, "A"),
            q(11, "What does the speaker imply about Kandinsky's use of color and form?", {
                "A": "He used red color to represent musical instruments.",
                "B": "He used color and form to challenge musical traditions.",
                "C": "He wanted to create an emotional response similar to a response to music.",
                "D": "He was primarily influenced by the colors and forms typically used in landscapes.",
            }, "C"),
            q(12, "What does the speaker imply about the relationship between different forms of art?", {
                "A": "Different forms of art are strictly independent.",
                "B": "Music and art can inspire and transform each other.",
                "C": "Visual art has had a minor influence on musical composition.",
                "D": "Abstract painting replaced music as the leading modern art.",
            }, "B"),
        ]),
        lecture("Street Art", 2, "listening_m2_q01_q04_lecture_street_art_evolution.mp3", [
            q(13, "What is the main topic of the talk?", {
                "A": "The history of graffiti in urban environments",
                "B": "The evolution and impact of street art on cities",
                "C": "Different styles of mural painting",
                "D": "Legal issues surrounding public art",
            }, "B"),
            q(14, "Why does the speaker mention marginalized communities?", {
                "A": "To explain the financial challenges faced by street artists",
                "B": "To highlight one of the social issues that street art can address",
                "C": "To discuss the legality of creating murals without permission",
                "D": "To describe the aesthetic qualities of street art",
            }, "B"),
            q(15, "What challenge related to street art does the speaker mention?", {
                "A": "Finding artists to create murals",
                "B": "Securing funding for large projects",
                "C": "Gaining official permission to create artwork",
                "D": "Promoting messages of unity and hope",
            }, "C"),
            q(16, "What is the speaker's attitude toward street art?", {
                "A": "Skeptical that it should be considered art",
                "B": "Mostly negative, because of its legal and practical challenges",
                "C": "Hopeful that some students will begin creating it",
                "D": "Generally positive, with recognition of some drawbacks",
            }, "D"),
        ]),
        lecture("Lightning on Venus", 2, "listening_m2_q05_q08_lecture_venus_lightning.mp3", [
            q(17, "What is the talk mainly about?", {
                "A": "How lightning on Venus was first detected by space missions",
                "B": "The challenges of studying lightning on other planets remotely",
                "C": "Comparisons between lightning on Venus and lightning on Earth",
                "D": "What lightning reveals about conditions in Venus's atmosphere",
            }, "D"),
            q(18, "Why does the speaker mention a science-fiction movie?", {
                "A": "To argue against the realism of scientific models",
                "B": "To illustrate the dramatic nature of Venus's atmosphere",
                "C": "To highlight the challenges of visiting other planets",
                "D": "To contrast weather on Venus and Earth",
            }, "B"),
            q(19, "According to the speaker, what does the presence of lightning on Venus suggest?", {
                "A": "Venus's atmosphere is chemically similar to Earth's.",
                "B": "Venus has stable and predictable weather patterns.",
                "C": "Venus's atmosphere is more active than previously believed.",
                "D": "Venus is likely to support plant life.",
            }, "C"),
            q(20, "What attitude does the speaker express about the findings he discusses?", {
                "A": "He is skeptical about the reliability of the data.",
                "B": "He is concerned about the dangers of studying Venus up close.",
                "C": "He is intrigued by the new research possibilities they raise.",
                "D": "He is disappointed that the findings remain incomplete.",
            }, "C"),
        ]),
    ])


def build_writing():
    return paper("writing", "写作", [
        {"n": 1, "timeSec": 1680, "from": 1, "to": 4, "label": "Email"},
        {"n": 2, "timeSec": 3000, "from": 5, "to": 9, "label": "Academic Discussion"},
    ], [
        email(1,
              "You and your friend, John, are planning a trip to Europe this summer. You have done some research and found some interesting destinations and activities that you would like to include in your itinerary. You want to share your ideas with John and get his opinion.",
              ["Describe the destinations you have researched.",
               "Explain why you think these destinations would be enjoyable.",
               "Ask for his opinion on the suggested itinerary and any additional ideas he might have."],
              "John", "Summer trip itinerary ideas",
              "Hi John,\n\nI researched two destinations for our Europe trip. We could spend three days in Amsterdam visiting museums and exploring the neighborhoods by bicycle. After that, we could take the train to Cologne for two days to visit the cathedral, walk along the Rhine, and try a short river cruise.\n\nI think this route would be enjoyable because it combines art, historic architecture, and outdoor activity without requiring a flight between cities. Amsterdam would give us plenty of choices during the day, while Cologne would provide a slower ending to the trip. Traveling by train would also let us see more of the region and avoid losing much of a day at an airport.\n\nWhat do you think of this five-day itinerary? Would you prefer more time in either city, or would you like to add a smaller town between them? Please send any activities you have found so we can compare priorities before booking.\n\nBest,\n[Your Name]"),
        email(2,
              "You recently purchased a shirt online for the upcoming university gala. When the shirt arrived, you noticed some issues. You need to contact the online store's customer service to report the issue and request a solution.",
              ["Explain what you liked about your online shopping experience.",
               "Describe the issue with the shirt you received.",
               "Suggest a resolution for the issue."],
              "Customer Service", "Recent order",
              "Dear Customer Service,\n\nI recently ordered a navy dress shirt from your website for my university gala. The shopping experience was convenient because the size guide was clear, checkout was simple, and the package arrived on the promised date.\n\nUnfortunately, the shirt does not match my order confirmation. I selected a large, but the item I received is a medium. I also noticed a small tear near the left cuff, so I cannot wear it to the event next week. I have kept the packaging and can provide photographs of both the label and the damaged area.\n\nCould you please send a replacement in size large by expedited shipping and provide a prepaid return label for this shirt? If a replacement cannot arrive before the gala, I would prefer a full refund to my original payment method. Please let me know which option is available.\n\nSincerely,\n[Your Name]"),
        email(3,
              "Your professor, Dr. Smith, recently assigned a group project due in two weeks. You are frustrated because not all of your group members are contributing equally to the project.",
              ["Describe the issue you are facing with your group members.",
               "Describe your specific contribution to the project.",
               "Explain why you and the group have been unable to address this issue."],
              "Dr. Smith", "Issues with group project",
              "Dear Dr. Smith,\n\nI am writing about the group project due in two weeks. Two members have missed our last three planning meetings and have not uploaded the research they agreed to complete. As a result, the remaining members cannot finalize the analysis or divide the presentation fairly.\n\nMy contribution so far includes developing the project outline, locating four core sources, drafting the introduction, and creating a shared schedule with intermediate deadlines. I have also summarized each meeting and sent the notes to the full group so that absent members can see the decisions.\n\nWe have tried to address the problem through messages and two proposed online meetings, but the members have either not responded or said they were unavailable without suggesting another time. Because we do not know whether they intend to complete their sections, we cannot redistribute the work without possibly duplicating it. I would appreciate guidance on how the group should proceed and document individual contributions.\n\nSincerely,\n[Your Name]"),
        email(4,
              "You recently attended a guest lecture about environmental sustainability. You want to thank the lecturer and explain why the topic interested you.",
              ["Thank the lecturer for the presentation.",
               "Describe the part of the lecture that interested you most.",
               "Explain why you want to explore environmental sustainability further."],
              "Guest Lecturer", "Thank you for the sustainability lecture",
              "Dear Guest Lecturer,\n\nThank you for speaking to our class about environmental sustainability. Your presentation made a complex topic practical, and I especially appreciated the examples showing how cities can reduce waste by repairing, reusing, and sharing materials instead of treating them as disposable.\n\nThe discussion of food waste interested me most. I had not realized how planning purchases, improving storage, and redistributing unused food can reduce both unnecessary costs and environmental pressure. The example helped me see that sustainability is not limited to large government projects; ordinary institutions and households can also make measurable changes.\n\nI would like to explore this topic further because I am interested in how universities can apply these ideas on campus. If you have a recommended article, project, or introductory resource about waste reduction programs, I would be grateful for the suggestion.\n\nSincerely,\n[Your Name]"),
        disc(5, "Workplace Productivity", "Dr. Gupta", "diaz.png",
             "This week, we have been discussing strategies to promote workplace productivity and employee performance. One particularly controversial topic that has emerged is multitasking. While some argue that the ability to juggle multiple tasks at once is essential in today's fast-paced work environments, others believe that multitasking actually reduces efficiency and increases the likelihood of errors. Do you believe that managers should promote multitasking in the workplace? Why or why not?",
             [post("Kelly", "kelly.png", "I think managers should promote multitasking. It helps employees handle routine tasks simultaneously and mirrors real-world demands. Even outside of the office, who has the luxury of focusing only on one task? With the right tools and training, multitasking can improve time management and adaptability—key traits in today's dynamic workplaces."),
              post("Andrew", "andrew.png", "I oppose multitasking in the workplace. It increases the chance of mistakes and leads to mental fatigue. For example, when employees answer emails during meetings, they often miss key details or misinterpret information. Deep, focused work is more effective for quality outcomes and long-term employee well-being.")],
             [{"title": "Limited Multitasking",
               "text": "Managers should promote a limited form of multitasking for routine, low-risk activities because workplaces often require employees to monitor several streams of work. A receptionist may need to notice incoming visitors while checking a shared schedule, and a technician may supervise an automated process while recording standard data. These combinations can use waiting time efficiently when neither task demands continuous reasoning. The key is classification. Managers should identify tasks that are predictable, easy to pause, and unlikely to cause serious harm if attention shifts. Employees can then receive tools and practice for managing those combinations, while complex analysis, sensitive communication, and safety decisions remain protected from interruption. Teams should also evaluate error rates and fatigue rather than assuming busyness equals productivity. Promoting every form of multitasking would be reckless, but banning it entirely ignores ordinary workflow. When task pairs are chosen deliberately and workers can return to focused time as soon as complexity rises, controlled multitasking improves responsiveness without sacrificing quality."},
              {"title": "Protect Focused Work",
               "text": "Managers should not promote multitasking because most knowledge work requires repeated switching rather than true simultaneous performance. Each switch carries a hidden cost: employees must recall where they stopped, rebuild the problem in working memory, and check whether a detail was missed. The damage is greatest when tasks involve analysis, writing, or decisions that affect other people. An employee answering messages during a meeting may appear responsive but later spend more time correcting an incorrect assumption. Managers can handle urgent demands without celebrating constant interruption. They should establish response windows for email, assign one person to monitor emergencies, and protect blocks of time for focused production. Shared task boards can make progress visible so employees do not interrupt one another simply to request updates. Some routine monitoring can occur in the background, but it should not define the culture. Productivity should be measured by completed, accurate outcomes rather than the number of activities kept open."}]),
        disc(6, "Business Strategy", "Dr. Gupta", "diaz.png",
             "This week, we are discussing how companies should balance competing business priorities when making strategic decisions. Some business leaders believe that companies should prioritize long-term growth by investing heavily in employee training and development programs, even when these investments reduce short-term profits. Others believe that companies should prioritize keeping their product prices as low as possible by minimizing training expenses and other operational costs. Which approach do you think is more effective for long-term success, and why?",
             [post("Kelly", "kelly.png", "Companies should prioritize long-term growth through substantial investments in employee training and development programs, even when they reduce short-term profits temporarily. When businesses provide comprehensive skill development, professional certifications, and career advancement opportunities, they create more productive workforces, reduce expensive employee turnover, and build institutional knowledge."),
              post("Andrew", "andrew.png", "I think companies should prioritize keeping their product prices as low as possible by minimizing training expenses and other operational costs. When companies reduce spending on training programs, they can offer customers better prices than competitors, which generates higher sales volumes.")],
             [{"title": "Invest in Training",
               "text": "Companies should invest in employee training even when it reduces short-term profit because skill accumulates inside the organization. Training helps workers use new equipment, improve processes, and understand why quality or safety standards matter. It also creates internal career paths, so experienced employees can move into advanced roles instead of leaving when their responsibilities grow. The value is greatest when training connects with actual work. Companies should identify a needed skill, provide protected learning time, and evaluate whether employees can apply it to a real task. Certifications may be useful, but a course that never changes performance is only an expense. Short-term profit may decline, yet constant turnover, repeated recruitment, and preventable mistakes also carry costs. A workforce that can learn and advance gives a company the ability to improve products and respond to change, which supports competitive success beyond one period of low prices."},
              {"title": "Keep Prices Low",
               "text": "Keeping prices low can produce better long-term business success when customers are highly sensitive to affordability and training does not directly improve the product. A company that builds an expensive development program into every item may lose buyers to a simpler competitor, reducing the revenue needed for any future investment. Cost discipline should not mean eliminating all learning. Businesses can use focused instruction for safety, quality, and essential new systems while avoiding broad programs with unclear results. They can also simplify processes, document tasks well, and hire for specialized roles when occasional expertise is needed. Savings should reach customers through stable lower prices rather than becoming a temporary promotion. For standardized products, efficient operations and affordable prices expand the customer base and can generate scale that supports reliability."}]),
        disc(7, "Emotional Intelligence", "Dr. Gupta", "diaz.png",
             "This week, we're exploring the concept of emotional intelligence in the workplace. Emotional intelligence involves the ability to understand and manage your own emotions, as well as the emotions of others. Some argue that emotional intelligence is more important than technical skills for professional success. What are your thoughts on this?",
             [post("Kelly", "kelly.png", "I think emotional intelligence is crucial for professional success. Being able to manage emotions and build strong relationships can lead to better teamwork and communication, which are essential in any job. My job involves frequent interaction with both colleagues and clients, and always requires managing emotions."),
              post("Andrew", "andrew.png", "I believe that technical skills are more critical for professional success. All jobs require technical skills in at least some ways. For example, knowing how to use statistics to analyze data and guide decision-making is usually more important than having emotional intelligence.")],
             [{"title": "Emotional Intelligence First",
               "text": "Emotional intelligence is often more important than technical skill because workplace results depend on how expertise is coordinated among people. A highly capable employee who reacts defensively to feedback, ignores tension, or communicates without considering the audience can slow an entire team. By contrast, someone who recognizes frustration early can ask a clarifying question, separate criticism of an idea from criticism of a person, and keep a disagreement focused on the task. Those abilities protect the flow of information on which technical decisions rely. Emotional intelligence is also crucial in uncertain situations, when no procedure gives a complete answer and employees must negotiate priorities or explain risk. Technical knowledge remains necessary, and no amount of empathy can replace a required professional competence. Yet skills can often be taught through courses or practice, while a workplace that lacks trust prevents existing knowledge from being shared effectively."},
              {"title": "Technical Skill First",
               "text": "Technical skills are more important because they define whether an employee can produce accurate work in the first place. In engineering, accounting, health care, or software, a friendly colleague who lacks the required knowledge may make errors that other people cannot simply communicate away. Expertise also gives teamwork substance. A specialist can explain trade-offs, identify an unrealistic proposal, and offer a workable alternative because that person understands the task deeply. Emotional intelligence improves how this knowledge is shared, but it cannot create correct analysis. Organizations should therefore establish technical competence as the entry requirement and then develop communication, self-awareness, and conflict management through feedback and training. Workplaces function best when both abilities are present, but when a choice must be made, technical skill is the foundation."}]),
        disc(8, "Journalism Major", "Dr. Gupta", "diaz.png",
             "Today, we're discussing the selection of courses offered in schools. With the emergence of technology and evolving employment opportunities, some argue that traditional journalism is becoming less relevant in the digital age. Others believe that journalism remains a critical field for maintaining informed societies. What are your thoughts? Should universities cancel journalism as a major, or is it still an essential area of study?",
             [post("Kelly", "kelly.png", "I think universities should cancel the major of journalism. The rise of digital platforms and social media has fundamentally changed how news is produced and consumed. Many people now get their information from blogs, podcasts, or social media influencers rather than traditional journalists."),
              post("Andrew", "andrew.png", "I strongly disagree. Journalism plays a vital role in society by providing accurate and well-researched information. Universities should adapt journalism programs to include digital skills and new media technologies rather than eliminating the major altogether.")],
             [{"title": "Keep Journalism",
               "text": "Universities should keep journalism as a major because reliable reporting requires more than the ability to post information online. Journalists must verify sources, distinguish evidence from rumor, ask fair questions, and correct errors publicly. These habits are increasingly important when digital platforms reward speed and emotional reactions. A modern program should certainly change: students should learn data analysis, audio and video production, audience engagement, and how algorithms shape distribution. However, those tools should be built on reporting ethics and sustained practice under expert supervision. Eliminating the major would not eliminate the public need for trustworthy information; it would only reduce the number of people trained to meet that need. Updating the curriculum is sensible, but abandoning the field would weaken an essential source of public accountability."},
              {"title": "Fold Journalism into Media",
               "text": "Universities could discontinue journalism as a stand-alone major while preserving its most useful skills in broader digital-media programs. News is now produced through podcasts, newsletters, video channels, data projects, and community platforms, so students may benefit more from combining verification and writing with technology, statistics, design, or a subject field such as science. A separate major can encourage a narrow professional identity even though many graduates will work across several communication roles. The university could require short modules on source evaluation, media law, interviewing, and ethics for all media students, then let them specialize through projects and internships. This approach would not imply that accurate reporting is unimportant. Instead, it would recognize that trustworthy public information depends on interdisciplinary teams and multiple formats."}]),
        disc(9, "School Curriculum", "Professor Diaz", "diaz.png",
             "As the job market evolves rapidly, schools face the challenge of preparing students for future careers. Some argue that high schools should have more flexibility in their curriculum to quickly adapt to these changes, ensuring that students gain relevant skills for job market trends. Others believe that a stable, consistent curriculum that ensures a basic, well-rounded education is the best way to prepare all students for any kind of work. Considering both perspectives, do you think schools should routinely adapt their curriculum to the changing job market? Why or why not?",
             [post("Andrew", "andrew.png", "I believe a stable curriculum that focuses on the traditional basics of education is the best way to prepare students for any change in the job market. Hiring trends can shift faster than schools can shift their curriculum, and students can always specialize in a particular area of demand after high school."),
              post("Kelly", "kelly.png", "Andrew is right about the fast pace of today's job market shifts, but that's just all the more reason for schools to be flexible. Not everyone plans further study after high school, and we need education systems that can quickly adapt and prepare students directly for the modern workforce.")],
             [{"title": "Keep a Stable Core",
               "text": "High schools should maintain a stable, well-rounded curriculum because job trends change faster than an educational program can be redesigned responsibly. Training students for today's specific tool may leave them unprepared when that tool or occupation changes. Strong reading, writing, mathematics, scientific reasoning, history, and civic knowledge provide abilities that transfer across industries and help people learn new systems later. Stability also protects fairness. If each school follows local hiring demands too closely, students in different regions may receive unequal access to higher education and broader career choices. Teachers can still use current examples, digital tools, and career projects within durable subjects, while elective courses offer limited specialization. A curriculum organized around lasting capacities prepares students not for one forecast but for repeated changes throughout working life."},
              {"title": "Adapt a Flexible Portion",
               "text": "Schools should routinely adapt part of the curriculum because many students enter work directly and need experience with current forms of collaboration, information, and technology. Adaptation should not mean replacing mathematics or writing every time a new occupation becomes popular. Instead, schools can review a flexible portion of the program with employers, community organizations, graduates, and teachers. That portion might teach students to analyze data, document a process, manage a team project, evaluate digital tools, or understand workplace rights. These capacities are broader than one job but must be practiced in contemporary settings to remain meaningful. Short modules and partnerships can be revised without disrupting the whole curriculum, and public criteria can prevent one company from controlling what students learn. A stable foundation remains necessary, yet stability without application can leave students unable to show what they know outside an exam."}]),
    ])


def build_speaking():
    # ponytail: source lists Forms B/C but item_level only has Form A audio
    instr_r = "You are working a part-time job at a clothing store near campus. Your manager is training you to assist customers at the store. Listen to the manager and repeat what the manager says. Repeat only once."
    instr_i = "You have signed up for a study run by a university research group that is investigating shopping habits. You will have a short video interview with one of the researchers. The researcher will ask you some questions. Listen to each question and answer in your own words."
    repeats = [
        (1, 15, "The Women's Clothing Section is this way."),
        (2, 15, "Our men's corner has shirts, trousers and jackets."),
        (3, 15, "Our accessories are on display near the entrance."),
        (4, 15, "Fitting rooms are available here for trying on clothes."),
        (5, 15, "The checkout for payment is by the exit."),
        (6, 18, "Ask the store associates if you need help locating specific items."),
        (7, 18, "If you get lost, check the store map for the layout and location of departments."),
    ]
    interviews = [
        (8, "Thank you for taking the time to speak with me. I'd like to ask you some questions about your shopping habits. When was your last shopping trip? And what did you buy? Did you have a good shopping experience?",
         "My last shopping trip was last weekend. I went to a local supermarket to buy groceries and purchased fresh vegetables, fruit, milk, and bread. The experience was quite good because the store was not crowded, and I found everything I needed quickly. The checkout process was also efficient, so I did not have to wait long. Overall, it was a pleasant and convenient shopping trip. Seeing the numbers clearly also helps me choose based on priorities instead of momentary impulse."),
        (9, "When you shop, which do you like better: shopping for yourself or shopping for others? Why?",
         "I prefer shopping for others because it brings me more joy. When I shop for myself, I often feel indecisive or guilty about spending money. But when I pick out gifts for friends or family, I focus on their preferences and happiness. It feels rewarding to see their reactions and know I made them feel special. Shopping for others also reduces the pressure of personal choice, making the experience more relaxed and enjoyable."),
        (10, "In recent years, people's shopping preferences have shifted in various ways. Do you think that in the future, people will continue to change how and where they shop? Why or why not?",
         "Yes, I believe people will continue to change their shopping habits. Technology evolves rapidly, leading to more convenient online platforms and personalized experiences. For example, augmented reality lets customers try products virtually, which can reduce returns. Sustainability concerns are also growing, so shoppers may prefer eco-friendly brands and local stores. Economic factors such as inflation can encourage bargain hunting and second-hand shopping. These shifts will persist as long as innovation and values drive consumer behavior."),
        (11, "Some people believe that buying too many products you do not need harms the environment. Do you agree with this idea? Why or why not?",
         "Yes, I agree that buying unnecessary products harms the environment. Every product requires resources to manufacture, package, and transport, which generates pollution and depletes natural resources. When we buy things we do not need, we waste those resources and contribute to more waste in landfills. Fast-fashion items are often bought impulsively and discarded quickly, leading to massive textile waste. Reducing unnecessary purchases is therefore an important way to protect the planet."),
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
    dest = os.path.join(ROOT, "library/toefl/audio/2025-08-12")
    os.makedirs(dest, exist_ok=True)
    n = 0
    for name in os.listdir(SRC):
        if not name.endswith(".mp3"):
            continue
        dst = os.path.join(dest, name)
        shutil.copy2(os.path.join(SRC, name), dst)
        os.chmod(dst, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
        n += 1
    print("audio", n, "files")


if __name__ == "__main__":
    copy_audio()
    dump("2025-08-12-reading.json", build_reading())
    dump("2025-08-12-listening.json", build_listening())
    dump("2025-08-12-writing.json", build_writing())
    dump("2025-08-12-speaking.json", build_speaking())
