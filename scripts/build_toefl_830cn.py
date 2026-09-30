#!/usr/bin/env python3
"""Build 8.30 China offline TOEFL. Run: python3 scripts/build_toefl_830cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/8 月/8.30-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-08-30/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-08-30"
SET = "8.30"
TITLE = "新托福 8.30 国内线下"


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


def build_reading():
    tasks, n = [], 1
    t, n = cw("Craftsmanship", 1, n, [
        "Craftsmanship blends art with functional design through a meticulous process requiring creativity and precision. Artisans ",
        ("wo", "work"),
        " with ",
        ("mater", "materials"),
        " like ",
        ("me", "metal"),
        ", wood, ",
        ("a", "and"),
        " fabric ",
        ("t", "to"),
        " create ",
        ("prod", "products"),
        " ",
        ("tha", "that"),
        " ",
        ("a", "are"),
        " both ",
        ("use", "useful"),
        " and ",
        ("beau", "beautiful"),
        ". Each ",
        ("pi", "piece"),
        " shows the maker's skill, attention to detail, and personal style. Beyond utility, handcrafted items carry cultural significance. Even as societies modernize, the value of tradition and quality endures, highlighting a lasting appreciation for the uniqueness and care embedded in artisanal work.",
    ])
    tasks.append(t)
    t, n = cw("Prehistoric Art and Religion", 1, n, [
        "Prehistoric art and religion provide invaluable insights into the spiritual life of early humans. Cave paintings and carvings often depict animals and symbolic figures, reflecting the beliefs and rituals of ancient communities. These artworks ",
        ("se", "serve"),
        " as a ",
        ("win", "window"),
        " into ",
        ("t", "the"),
        " social ",
        ("struc", "structures"),
        " and ",
        ("cult", "cultural"),
        " practices ",
        ("o", "of"),
        " prehistoric ",
        ("ti", "times"),
        ". By ",
        ("stud", "studying"),
        " them, ",
        ("resea", "researchers"),
        " can ",
        ("bet", "better"),
        " understand the evolution of human thought and spirituality. These early forms of art show that even long ago, people had deep feelings, ideas, and questions about life and the world around them.",
    ])
    tasks.append(t)
    t, n = cw("Animal Behavior", 1, n, [
        "The study of animal behavior, specifically that of insects, provides insight into the complex interactions within ecosystems. Insects ",
        ("exh", "exhibit"),
        " a ",
        ("br", "broad"),
        " range ",
        ("o", "of"),
        " behaviors ",
        ("fr", "from"),
        " foraging ",
        ("a", "and"),
        " mating ",
        ("t", "to"),
        " complex ",
        ("soc", "social"),
        " organization. ",
        ("F", "For"),
        " instance, ",
        ("be", "bees"),
        " perform ",
        ("intr", "intricate"),
        " dances to communicate the location of food sources. Ants communicate using chemical signals called pheromones, which help coordinate complex tasks like defending the colony and locating resources. This cooperative behavior ensures the survival and efficiency of their communities.",
    ])
    tasks.append(t)
    t, n = cw("Moon Phases", 1, n, [
        "Observing the moon's phases has been important for many cultures throughout history, influencing calendars, navigation, and mythology. Lunar cycles formed the basis of early timekeeping systems, such as the Islamic Hijri calendar and the traditional Chinese lunisolar calendar. Seafarers ",
        ("us", "used"),
        " the ",
        ("posi", "position"),
        " of ",
        ("t", "the"),
        " moon ",
        ("t", "to"),
        " make ",
        ("predi", "predictions"),
        " about ",
        ("oc", "ocean"),
        " levels ",
        ("a", "and"),
        " its ",
        ("illumi", "illumination"),
        " to ",
        ("gu", "guide"),
        " their ",
        ("voy", "voyages"),
        ", especially during night travel. In mythology, the moon often embodied powerful deities or symbols, shaping rituals, stories, and seasonal festivals. Across continents, the waxing and waning of the moon has remained a universal clock and an inspiration for human imagination.",
    ])
    tasks.append(t)
    t, n = cw("Mughal Paintings", 1, n, [
        "The Mughal Empire, which ruled much of South Asia from 1526 to 1857, was a powerful Islamic dynasty known for its administrative sophistication and cultural patronage. Mughal paintings, particularly miniature illustrations, blended Persian, Indian, and Central Asian artistic traditions. These ",
        ("sm", "small"),
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
    tasks.append(t)
    t, n = cw("Geographic Education", 1, n, [
        "Geographic education equips students with the tools to understand global issues through a spatial lens. For example, studying how rising sea levels affect coastal communities helps learners connect physical geography with human impact. This ",
        ("know", "knowledge"),
        " is ",
        ("esse", "essential"),
        " for ",
        ("plan", "planning"),
        " disaster ",
        ("respo", "response"),
        ", managing ",
        ("reso", "resources"),
        ", and ",
        ("addre", "addressing"),
        " climate ",
        ("cha", "change"),
        ". Geographic ",
        ("lite", "literacy"),
        " also ",
        ("fos", "fosters"),
        " critical ",
        ("thin", "thinking"),
        " about migration, urban development, and environmental sustainability. By teaching students to analyze maps, data, and patterns, geography empowers them to make informed decisions in an increasingly interconnected and environmentally challenged world.",
    ])
    tasks.append(t)
    t, n = cw("Sodium-Ion Batteries", 1, n, [
        "Sodium-ion batteries are gaining attention as a potential alternative to lithium-ion batteries. Sodium is more accessible than lithium because it can be extracted from seawater, while lithium typically requires mining methods that can ",
        ("ha", "harm"),
        " the ",
        ("envir", "environment"),
        ". Sodium-ion ",
        ("techn", "technology"),
        " is ",
        ("consi", "considered"),
        " more ",
        ("susta", "sustainable"),
        " in ",
        ("t", "the"),
        " long ",
        ("te", "term"),
        ". However, ",
        ("sev", "several"),
        " challenges ",
        ("li", "limit"),
        " its ",
        ("wides", "widespread"),
        " use. Sodium-ion batteries often store less energy than lithium-ion batteries, reducing their efficiency for certain applications. Researchers continue to study sodium-ion batteries in order to improve their performance and determine their role in future energy systems.",
    ])
    tasks.append(t)
    t, n = cw("Terrestrial Mammal Adaptations", 1, n, [
        "Terrestrial mammals exhibit a fascinating array of adaptations that help them survive and thrive in diverse environments. From ",
        ("com", "complex"),
        " social ",
        ("intera", "interactions"),
        " that ",
        ("imp", "improve"),
        " group ",
        ("surv", "survival"),
        " to ",
        ("ingen", "ingeniously"),
        " designed ",
        ("lu", "lungs"),
        " that ",
        ("enh", "enhance"),
        " oxygen ",
        ("absor", "absorption"),
        ", these ",
        ("crea", "creatures"),
        " are ",
        ("bu", "built"),
        " for resilience. Some have evolved powerful limbs for digging deep burrows, while others have agile bodies perfect for scaling trees or sprinting across open plains. Their sharp senses and stealthy movements are often the result of a high-stakes evolutionary arms race between predator and prey.",
    ])
    tasks.append(t)
    t, n = cw("Theater Lighting", 1, n, [
        "Theater lighting evolved in the nineteenth century from flickering candlelight to gas lighting, allowing for more nuanced lighting effects. This innovation enabled directors to manipulate light and ",
        ("sha", "shadows"),
        ", adding ",
        ("de", "depth"),
        " to ",
        ("perfor", "performances"),
        " and ",
        ("crea", "creating"),
        " moods ",
        ("th", "that"),
        " reflected ",
        ("t", "the"),
        " narrative's ",
        ("emot", "emotional"),
        " content. ",
        ("Su", "Such"),
        " advancements ",
        ("n", "not"),
        " only ",
        ("trans", "transformed"),
        " stagecraft but also heightened the audience's engagement, drawing them deeper into the world portrayed on stage. The interplay of brightness and darkness became its own narrative tool.",
    ])
    tasks.append(t)
    t, n = cw("Ecological Footprints", 1, n, [
        "The concept of ecological footprints is used to analyze an individual's or a nation's environmental impacts. This measure accounts for the resources consumed as well as waste created and compares them to Earth's ability to regenerate those resources. Because ",
        ("consu", "consumption"),
        " patterns ",
        ("va", "vary"),
        " globally, ",
        ("signi", "significant"),
        " disparities ",
        ("eme", "emerge"),
        " between ",
        ("reg", "regions"),
        ". In ",
        ("deve", "developed"),
        " countries, ",
        ("lar", "larger"),
        " footprints ",
        ("res", "result"),
        " from ",
        ("gre", "greater"),
        " per ",
        ("cap", "capita"),
        " resource use and greater reliance on technology. Understanding these patterns is crucial for developing sustainable policies that aim to reduce human demands on the planet's ecosystems, ensuring long-term environmental and economic viability.",
    ])
    tasks.append(t)
    t, n = cw("Shadow Puppetry", 1, n, [
        "Shadow puppetry is an ancient form of storytelling that uses flat, articulated (movable) figures cast onto a screen by a light source. Shadow puppetry ",
        ("comb", "combined"),
        " visual ",
        ("arti", "artistry"),
        " with ",
        ("dram", "dramatic"),
        " narration, ",
        ("crea", "creating"),
        " engaging ",
        ("perfor", "performances"),
        " that ",
        ("con", "convey"),
        " traditional ",
        ("ta", "tales"),
        " and ",
        ("mo", "moral"),
        " lessons. ",
        ("Th", "This"),
        " art ",
        ("fo", "form"),
        " originated in Asia and spread to various cultures around the world. The puppets are typically made of leather or paper and manipulated by sticks or strings. Performers narrate stories, often accompanied by music or sound effects.",
    ])
    tasks.append(t)
    t, n = cw("Industrialization and Factories", 1, n, [
        "The rise of industrialization in the eighteenth and nineteenth centuries brought about a dramatic shift in how goods were made, leading to the widespread development of factories. These centralized ",
        ("workp", "workplaces"),
        " replaced ",
        ("tradi", "traditional"),
        " handcrafting ",
        ("a", "and"),
        " cottage ",
        ("indus", "industries"),
        " with mechanized ",
        ("produ", "production"),
        " systems ",
        ("pow", "powered"),
        " by ",
        ("st", "steam"),
        ", water, ",
        ("o", "or"),
        " electricity, ",
        ("allo", "allowing"),
        " for ",
        ("gre", "greater"),
        " efficiency in the manufacturing of goods. Factories not only transformed economies and labor systems but also reshaped urban landscapes, contributing to population growth, environmental changes, and new social dynamics.",
    ])
    tasks.append(t)
    t, n = cw("Color Perception and Pigments", 1, n, [
        "Color perception has fascinated scientists and artists alike for centuries. The study of ",
        ("pigm", "pigments"),
        ", ",
        ("substa", "substances"),
        " that ",
        ("g", "give"),
        " color to materials. ",
        ("T", "The"),
        " ",
        ("comp", "complex"),
        " interactions ",
        ("wi", "with"),
        " light. Pigments ",
        ("abs", "absorb"),
        " ",
        ("cer", "certain"),
        " wavelengths and ",
        ("ref", "reflect"),
        " others, ",
        ("wh", "which"),
        " is why objects appear to have color. Synthetic pigments have expanded the color palette available to artists and industries. The development of pigments requires knowledge of chemistry and physics, as their properties influence durability and appearance. Understanding how pigments behave is crucial in various fields, from art to restoration to manufacturing.",
    ])
    tasks.append(t)
    t, n = cw("Mountains and Orographic Rainfall", 1, n, [
        "Geographical features such as mountains shape the landscape and climate of a region. Mountains ",
        ("c", "can"),
        " act ",
        ("a", "as"),
        " natural ",
        ("barr", "barriers"),
        ". The Himalayas, ",
        ("f", "for"),
        " example, ",
        ("bl", "block"),
        " cold ",
        ("wi", "winds"),
        " coming ",
        ("fr", "from"),
        " Central Asia, ",
        ("kee", "keeping"),
        " the Indian subcontinent ",
        ("war", "warmer"),
        ". They ",
        ("al", "also"),
        " cause orographic rainfall, where moist air rises, cools, and precipitates on the windward side, creating lush forests, while the leeward side remains dry. Mountain ranges like the Andes and the Rockies host unique flora and fauna adapted to high altitudes.",
    ])
    tasks.append(t)
    t, n = cw("Glaciers", 1, n, [
        "Glaciers play a crucial role in Earth's climate and ecosystems. They store about 70% of the planet's freshwater and help regulate global temperatures by reflecting sunlight. As they move, glaciers shape ",
        ("lands", "landscapes"),
        ", carving ",
        ("val", "valleys"),
        " and ",
        ("transp", "transporting"),
        " sediment. ",
        ("Th", "Their"),
        " seasonal ",
        ("mel", "melting"),
        " feeds ",
        ("riv", "rivers"),
        " and ",
        ("la", "lakes"),
        ", supporting ",
        ("agric", "agriculture"),
        " and ",
        ("wild", "wildlife"),
        ". Glaciers ",
        ("se", "serve"),
        " as indicators of climate change: rapid melting signals shifts in global temperatures. Studying glaciers helps scientists understand past climate patterns and predict future environmental impacts, making them vital to global research.",
    ])
    tasks.append(t)
    t, n = cw("Film Sound", 1, n, [
        "The evolution of the film industry has been shaped by major technological shifts, especially the move from silent films to movies with sound. In the silent era, filmmakers relied entirely on visual storytelling, using expressive acting and title cards to convey dialogue and emotion. The ",
        ("intro", "introduction"),
        " of synchronized ",
        ("so", "sound"),
        ", where ",
        ("au", "audio"),
        " was ",
        ("mat", "matched"),
        " precisely ",
        ("wi", "with"),
        " the ",
        ("mov", "moving"),
        " ",
        ("im", "image"),
        ", ",
        ("all", "allowed"),
        " audiences ",
        ("t", "to"),
        " hear ",
        ("act", "actors"),
        " speak for the first time, transforming the cinematic experience. This breakthrough laid the foundation for later innovations like CGI and immersive sound design, expanding how stories could be told onscreen.",
    ])
    tasks.append(t)
    if n != 162:
        raise SystemExit("cw expected next 162, got %s" % n)
    tasks.append(academic("Biofertilizer Dynamics in Agrochemistry", 2, [
        "One of the latest inventions in agrochemistry is biofertilizers. This innovation aims to provide an environmentally friendly alternative to traditional fertilizers, which are infamous for causing soil and water pollution. Biofertilizers use living microorganisms to improve soil fertility by fixing nutrients such as nitrogen, ensuring that these nutrients remain available for plant uptake. Unlike conventional fertilizers that simply release nutrients into the soil, biofertilizers enhance the soil's own biological activity, creating a more sustainable agricultural practice.",
        "Increased bioactivity results in improved soil structure. Microorganisms in biofertilizers produce substances that bind soil particles together, enhancing aeration and water retention. This mechanism is particularly vital in arid regions, where soil degradation poses a significant challenge. Yet, this ability makes the effectiveness of biofertilizers depend on specific soil types and crops, introducing complexities into their use.",
        "Despite their potential, biofertilizers face hurdles, including skepticism from farmers accustomed to chemical fertilizers. Concerns about cost, availability, and the need for new agricultural knowledge contribute to their slow adoption. Moreover, the regulatory landscape for biofertilizers is still developing, affecting their market presence. Still, some regions have started to implement subsidies and educational programs to encourage the transition to these sustainable options, hinting at a shift in agricultural practices.",
    ], [
        q(162, 'The word "uptake" in the passage is closest in meaning to', {
            "A": "evolution", "B": "harvest", "C": "absorption", "D": "diversity",
        }, "C"),
        q(163, "What is one difference between biofertilizers and traditional fertilizers?", {
            "A": "Biofertilizers are less expensive to produce.",
            "B": "Biofertilizers contain living microorganisms.",
            "C": "Biofertilizers require synthetic chemicals to work.",
            "D": "Biofertilizers are used only in arid regions.",
        }, "B"),
        q(164, "According to the passage, what makes biofertilizers particularly effective?", {
            "A": "They are compatible with multiple soil types.",
            "B": "They prevent soil particles from binding together.",
            "C": "They improve the movement of air through soil.",
            "D": "They begin to release nutrients immediately.",
        }, "C"),
        q(165, "What does the author suggest about biofertilizers in the last paragraph?", {
            "A": "Many farmers are already familiar with them.",
            "B": "Governmental rules affect their use in some areas.",
            "C": "They are readily available to farmers.",
            "D": "They do not work as well as chemical fertilizers.",
        }, "B"),
        q(166, "What is the main focus of the last paragraph?", {
            "A": "It describes new scientific research supporting biofertilizers.",
            "B": "It compares the effectiveness of different types of fertilizers.",
            "C": "It discusses barriers to adoption of biofertilizers by farmers.",
            "D": "It offers advice to farmers on best agricultural practices.",
        }, "C"),
    ]))
    return paper(ID, "reading", "阅读", [
        {"n": 1, "timeSec": 1920, "from": 1, "to": 161},
        {"n": 2, "timeSec": 480, "from": 162, "to": 166},
    ], tasks)


def build_listening():
    return paper(ID, "listening", "听力", [
        {"n": 1, "timeSec": 1500, "from": 1, "to": 24},
        {"n": 2, "timeSec": 1320, "from": 25, "to": 46},
    ], [
        lecture("Dark Stores", 1, "listening_form01_q01_q04_lecture_dark_stores.mp3", [
            q(1, "What aspect of dark stores does the speaker mainly discuss?", {
                "A": "Their influence on the retail market and society",
                "B": "Their architectural design and layout",
                "C": "Their similarities to traditional storefronts",
                "D": "Their role in the history of warehouse development",
            }, "A"),
            q(2, "According to the talk, why can dark stores offer lower prices?", {
                "A": "Because they sell large quantities of goods",
                "B": "Because they are not focused on making a profit",
                "C": "Because they obtain less expensive products",
                "D": "Because they have lower overhead expenses",
            }, "D"),
            q(3, "Why does the speaker mention grocery delivery?", {
                "A": "To illustrate how dark stores compete with traditional supermarkets",
                "B": "To compare delivery speeds in urban and nonurban environments",
                "C": "To suggest that dark stores mainly sell perishable items",
                "D": "To explain why consumers are willing to pay higher fees",
            }, "A"),
            q(4, "What point does the speaker make about dark stores and employment?", {
                "A": "Many temporary employees are needed to set dark stores up.",
                "B": "Employees in dark stores need to be comfortable with technology.",
                "C": "Dark stores do not need many in-store workers.",
                "D": "Dark stores are able to pay their employees more.",
            }, "C"),
        ]),
        lecture("Creative Class and Urban Development", 1, "listening_form02_q01_q04_lecture_creative_class_and_urban_development.mp3", [
            q(5, 'According to the lecture, what is the main idea behind Richard Florida\'s "creative class" theory?', {
                "A": "Cities with strong government infrastructure tend to grow faster than others.",
                "B": "Creative projects in urban areas should be primarily funded by government investments.",
                "C": "A concentration of innovative professionals can stimulate urban revitalization.",
                "D": "Neighborhoods with low property values attract more creative individuals.",
            }, "C"),
            q(6, "According to the lecture, what is one unintended consequence of the creative-class strategy?", {
                "A": "Increased traffic congestion",
                "B": "A decline in tourism",
                "C": "The displacement of long-term local residents",
                "D": "A reduced demand for community activities",
            }, "C"),
            q(7, 'Why does the speaker mention infrastructure such as "galleries and performance spaces"?', {
                "A": "To suggest that cities are neglecting science and technology infrastructure",
                "B": "To contrast it with the lack of these cultural spaces in rural areas",
                "C": "To argue for more city funding of such infrastructure",
                "D": "To illustrate investments that cities use to attract professionals",
            }, "D"),
            q(8, "What concern do critics raise about the creative-class approach?", {
                "A": "It leads to excessive government spending on public transportation.",
                "B": "It may neglect the needs of less affluent community members.",
                "C": "It encourages suburban sprawl.",
                "D": "It reduces the number of small businesses.",
            }, "B"),
        ]),
        lecture("Indian Pangolin", 1, "listening_form03_q01_q04_lecture_indian_pangolin.mp3", [
            q(9, "According to the speaker, when does the Indian pangolin perform volvation?", {
                "A": "When it hunts its prey",
                "B": "When it swallows its meal",
                "C": "When it faces a predator",
                "D": "When it digs for food",
            }, "C"),
            q(10, "According to the speaker, what does the Indian pangolin mainly eat?", {
                "A": "Crops and other plants",
                "B": "Small birds and reptiles",
                "C": "Ants and termites",
                "D": "Rodents and other small mammals",
            }, "C"),
            q(11, "What does the speaker point out about the keratin plates inside the Indian pangolin's stomach?", {
                "A": "They are replaced from time to time.",
                "B": "They make the animal undesirable to potential predators.",
                "C": "They produce chemicals that digest food.",
                "D": "They function like teeth do in other animals.",
            }, "D"),
            q(12, "According to the speaker, what is the primary threat to the Indian pangolin's survival as a species?", {
                "A": "Large predators, such as tigers and leopards",
                "B": "Diseases spread by humans",
                "C": "Competition for food resources",
                "D": "Illegal hunting and habitat loss",
            }, "D"),
        ]),
        lecture("The Accidental Discovery of PTFE", 1, "listening_form04_q01_q04_lecture_the_accidental_discovery_of_ptfe.mp3", [
            q(13, "What is the main topic of the talk?", {
                "A": "The production process of two refrigerants",
                "B": "The life and career of an important chemist",
                "C": "An electronic device that led to medical innovations",
                "D": "The invention of a substance that has many practical uses",
            }, "D"),
            q(14, "What problem was Roy Plunkett trying to solve?", {
                "A": "Refrigerants were unable to cool industrial systems.",
                "B": "Refrigerants were unsafe to use.",
                "C": "Refrigerants could not be stored effectively.",
                "D": "Refrigerants could not be used in multiple applications.",
            }, "B"),
            q(15, "What makes PTFE special?", {
                "A": "It is available in gas and liquid form.",
                "B": "It can be used in medicines that cure poisoning.",
                "C": "It is unusually stable.",
                "D": "It can be mixed with TFE.",
            }, "C"),
            q(16, "At the end of the talk, why does the speaker mention X-rays and penicillin?", {
                "A": "To point out medical uses of PTFE",
                "B": "To emphasize the importance of research",
                "C": "To contrast PTFE with other advancements",
                "D": "To support a general point about many scientific discoveries",
            }, "D"),
        ]),
        lecture("Trilobites", 1, "listening_form05_q01_q04_lecture_trilobites.mp3", [
            q(17, "Why does the speaker mention horseshoe crabs?", {
                "A": "To point out how trilobites adapted to life in the sea",
                "B": "To help explain why trilobites went extinct",
                "C": "To emphasize how hard trilobites' exoskeletons were",
                "D": "To describe what trilobites looked like",
            }, "D"),
            q(18, "What does the speaker say about eyes with thousands of small lenses?", {
                "A": "They were helpful for producing sharp images.",
                "B": "They were an unusual characteristic in trilobites.",
                "C": "They were effective for seeing movement.",
                "D": "They covered only a small area of the trilobite's head.",
            }, "C"),
            q(19, "What did researchers learn from the fossil in the study?", {
                "A": "Adult trilobites had an eye in the middle of the forehead.",
                "B": "Trilobites had three joints on each of their legs.",
                "C": "Trilobites grew more body segments throughout their lives.",
                "D": "Young trilobites slowly developed hard exoskeletons.",
            }, "A"),
            q(20, "What does the speaker imply about the fossil in the study?", {
                "A": "Its exoskeleton was lighter than expected.",
                "B": "Its poor condition provided a benefit.",
                "C": "It was the first fossil discovered of a trilobite in a larval stage.",
                "D": "It was found near fully-preserved trilobite fossils.",
            }, "B"),
        ]),
        lecture("Documentaries and Ethnographic Films", 1, "listening_form06_q01_q04_lecture_documentaries_and_ethnographic_films.mp3", [
            q(21, "What is the main purpose of the talk?", {
                "A": "To introduce a new style of documentary",
                "B": "To outline the process of making a film",
                "C": "To compare two significant documentaries",
                "D": "To contrast two kinds of nonfiction films",
            }, "D"),
            q(22, "What attitude does the speaker express when she discusses documentaries?", {
                "A": "She is pleased that documentaries inspire viewers to travel to unfamiliar places.",
                "B": "She is disappointed that documentaries are becoming less popular.",
                "C": "She is concerned that viewers are too trusting of documentaries.",
                "D": "She is frustrated that many documentaries try to tell complicated and confusing stories.",
            }, "C"),
            q(23, "Why does the speaker mention Forest of Bliss?", {
                "A": "To give an example of a film with elaborate production",
                "B": "To give an example of an ethnographic film",
                "C": "To illustrate the popularity of films about nature",
                "D": "To illustrate the importance of directors in filmmaking",
            }, "B"),
            q(24, "According to the speaker, how might researchers prepare to make ethnographic films?", {
                "A": "By coming up with a dramatic story they want to tell",
                "B": "By learning the filming techniques of the culture they are studying",
                "C": "By spending a long time living within a particular culture",
                "D": "By analyzing news footage about a particular culture",
            }, "C"),
        ]),
        lecture("Pluto: From Planet to Complex Dwarf Planet", 2, "listening_form07_q01_q04_lecture_pluto_from_planet_to_complex_dwarf_planet.mp3", [
            q(25, "Why does the speaker discuss the Kuiper Belt at the beginning of the talk?", {
                "A": "To explain why Pluto's status changed",
                "B": "To illustrate Pluto's size",
                "C": "To emphasize how far Pluto is from the Sun",
                "D": "To make a point about Pluto's shape",
            }, "A"),
            q(26, "How did new data change scientists' understanding of Pluto?", {
                "A": "It has a longer orbit than previously thought.",
                "B": "It has a wider variety of features than previously thought.",
                "C": "It used to be larger in the past than previously thought.",
                "D": "It has larger amounts of rainfall than previously thought.",
            }, "B"),
            q(27, "What point does the speaker make about convection in Pluto's ice basin?", {
                "A": "It is making the surface of the ice basin grow larger.",
                "B": "It suggests that volcanoes exist on Pluto.",
                "C": "It continuously moves warmer ice to the basin's surface.",
                "D": "It creates strong winds that blow across Pluto's surface.",
            }, "C"),
            q(28, "According to the speaker, what could the presence of an ocean on Pluto mean?", {
                "A": "Pluto orbits closer to the Sun than expected.",
                "B": "A huge amount of salt exists throughout Pluto.",
                "C": "Objects in the Kuiper Belt could support life.",
                "D": "Pluto's ice might be melting.",
            }, "C"),
        ]),
        lecture("Keystone Species", 2, "listening_form08_q01_q04_lecture_keystone_species.mp3", [
            q(29, "Why does the speaker talk about arches in architecture?", {
                "A": "To point out a similarity to rock arches in nature",
                "B": "To help illustrate an important concept",
                "C": "To argue against a common comparison",
                "D": "To show a difference between life science and technology fields",
            }, "B"),
            q(30, "According to the talk, what is a keystone species?", {
                "A": "A species that is necessary to maintain balance in an ecosystem",
                "B": "A species that has no predators within an ecosystem",
                "C": "A species that is too numerous for a healthy ecosystem",
                "D": "A species that is negatively affected by environmental changes",
            }, "A"),
            q(31, "In the early 20th century, what happened to the wolves in Yellowstone National Park?", {
                "A": "Their population increased dramatically when their prey population increased.",
                "B": "They became a government-protected species.",
                "C": "They were eliminated over farming and safety concerns.",
                "D": "Their population decreased significantly because of disease.",
            }, "C"),
            q(32, "How did an increasing elk population affect the Yellowstone ecosystem?", {
                "A": "Many species were negatively affected due to the elks' diet.",
                "B": "Various animals that prey on elk were attracted to the area.",
                "C": "Some areas developed an overgrowth of plants while others had too little vegetation.",
                "D": "The population and range of the wolves also increased.",
            }, "A"),
        ]),
        lecture("Musical Borrowing", 2, "listening_form09_q01_q04_lecture_musical_borrowing.mp3", [
            q(33, "How does the speaker begin the lecture?", {
                "A": "By introducing his favorite music genre",
                "B": "By pointing out an advantage of hearing local music live",
                "C": "By describing possible reactions to listening to certain kinds of music",
                "D": "By encouraging students to visit places where famous styles of music originated",
            }, "C"),
            q(34, "Why does the speaker mention bossa nova?", {
                "A": "To emphasize the importance of rhythmic pulse in music",
                "B": "To provide an example of a style that mixes musical styles from different places",
                "C": "To identify a style that influenced jazz music",
                "D": "To explain the popularity of Brazilian music",
            }, "B"),
            q(35, "What does the speaker emphasize about the music of Tan Dun?", {
                "A": "It reflects the composer's own emotional experience.",
                "B": "It is more popular among Western audiences than among Chinese audiences.",
                "C": "It was inspired by a Chinese novel.",
                "D": "It shows a deep understanding of Chinese culture.",
            }, "D"),
            q(36, "According to the talk, what is one challenge of musical borrowing?", {
                "A": "The difficulty of combining different types of music well",
                "B": "The high cost of using traditional instruments",
                "C": "The limited interest from international audiences",
                "D": "The lack of available resources for composers",
            }, "A"),
        ]),
        lecture("The Indigo Trade", 2, "listening_form10_q01_q04_lecture_the_indigo_trade.mp3", [
            q(37, "What is the main topic of the talk?", {
                "A": "Advantages and disadvantages of indigo for coloring jeans",
                "B": "The role of indigo in British trade and colonial expansion",
                "C": "The history of the indigo trade and indigo's reappearance as a modern commodity",
                "D": "Qualities that make indigo a viable commercial product",
            }, "C"),
            q(38, "What factor contributed most to the decline of natural indigo in industrial use?", {
                "A": "The effects of climate change on Indigofera plants",
                "B": "Labor shortages in the British Empire",
                "C": "The invention of synthetic indigo",
                "D": "Trade restrictions",
            }, "C"),
            q(39, "What explains the appeal of natural indigo in today's market?", {
                "A": "It is seen as good for the environment.",
                "B": "It is the least expensive dye available.",
                "C": "It requires very little processing.",
                "D": "It is used in traditional rituals.",
            }, "A"),
            q(40, "Why does the speaker discuss the labor involved in traditional indigo dye extraction?", {
                "A": "To explain why indigo processing can be interesting for tourists",
                "B": "To support the claim that indigo is good for traditional economies",
                "C": "To challenge the claim that some producers use harsh chemicals",
                "D": "To introduce one problem with using natural indigo",
            }, "D"),
        ]),
        lecture("Adobe Bricks", 2, "listening_form11_q01_q04_lecture_adobe_bricks.mp3", [
            q(41, "What is the main topic of the talk?", {
                "A": "The renewed use of an old construction material",
                "B": "Recent advances in sustainable building materials",
                "C": "The challenges faced by ancient adobe brick builders",
                "D": "Modern alternatives to adobe bricks",
            }, "A"),
            q(42, "What does the speaker say about a new building in Amsterdam?", {
                "A": "It was inspired by adobe construction.",
                "B": "It is made from very common natural materials.",
                "C": "It removes carbon from the atmosphere.",
                "D": "It involves technology that improves insulation.",
            }, "C"),
            q(43, "What point does the speaker make about conditions in places in the southwestern United States?", {
                "A": "Major changes in temperature occur there.",
                "B": "Air there has recently become polluted.",
                "C": "Not all materials for adobe production are available there.",
                "D": "More clay for construction is available there than in other places.",
            }, "A"),
            q(44, "What does the speaker emphasize about transportation for construction projects?", {
                "A": "Calculating its costs takes a long time.",
                "B": "It requires special technology when concrete is used.",
                "C": "The need for it depends mostly on the location of the project.",
                "D": "Using adobe bricks helps reduce the need for it.",
            }, "D"),
        ]),
        {
            "type": "announcement",
            "module": 2,
            "title": "New Computer Lab",
            "instruction": "Listen to the recording.",
            "audio": AUDIO + "listening_form12_q01_q02_announcement_new_computer_lab.mp3",
            "questions": [
            q(45, "What is the main purpose of the announcement?", {
                "A": "To inform students about updated printing fees",
                "B": "To create awareness of a new printing procedure",
                "C": "To announce changes to computer lab hours",
                "D": "To discuss various waste-reduction initiatives",
            }, "B"),
            q(46, "What will student workers likely do next week?", {
                "A": "Attend a training session",
                "B": "Log in to a printing website",
                "C": "Replace their student IDs",
                "D": "Scan pictures for a project",
            }, "A"),
            ],
        },
    ])


def build_writing():
    return paper(ID, "writing", "写作", [
        {"n": 1, "timeSec": 2100, "from": 1, "to": 5, "label": "Email"},
        {"n": 2, "timeSec": 3000, "from": 6, "to": 10, "label": "Academic Discussion"},
    ], [
        email(1,
            "You recently purchased a new coffeemaker for your dorm room from an online store, and you are satisfied with its performance in general. However, you are having one issue with the product that is a problem for you. You need to contact customer service to report the issue and request a resolution.",
            ["Mention your satisfaction with the appliance's performance in general.",
             "Describe the issue you are having with the product.",
             "Request a resolution."],
            "Customer Service", "Issue with coffeemaker",
            "Dear Customer Service,\n\n"
            "I am writing about the coffeemaker I recently purchased for my dorm room. Overall, I am pleased with it because it heats quickly, is easy to clean, and makes coffee that tastes much better than the instant coffee I used before.\n\n"
            "However, the machine sometimes stops halfway through the brewing cycle. The power light stays on, but water remains in the reservoir and I have to restart the machine. I have already checked that the lid and filter basket are positioned correctly, so the problem does not seem to be caused by ordinary setup.\n\n"
            "Could you please advise me whether there is a safe troubleshooting step I should try? If the unit is defective, I would appreciate a replacement or instructions for returning it at no additional cost. I can provide the order number and photographs if needed.\n\n"
            "Sincerely,\nA Student"),
        email(2,
            "You are a member of a local community club that organizes monthly events, such as neighborhood clean-up days and guest-speaker nights. You attended the local university's workshop on planning large community events and want to share what you learned with your local community club president, Ms. Jackson.",
            ["Mention what you enjoyed about the workshop you attended.",
             "Explain how what you learned in the workshop can be applied to future events in your local club.",
             "Request a meeting to discuss further."],
            "Ms. Jackson", "Suggestions for enhancing future events",
            "Dear Ms. Jackson,\n\n"
            "I recently attended the university's workshop on planning large community events, and I especially enjoyed the case study about a neighborhood festival. The presenter showed how a small planning team coordinated volunteers, vendors, and last-minute weather changes without losing track of its main goals.\n\n"
            "Several ideas could improve our club's future events. We could create a simple timeline that assigns one person to each major task, send volunteers a short briefing before the event, and prepare a backup plan for outdoor activities. For our next clean-up day, for example, one team could handle supplies while another records attendance and communicates with residents. This would reduce confusion and help new volunteers participate confidently.\n\n"
            "Could we meet sometime next week to discuss these suggestions? I am available Tuesday evening or Saturday morning and can bring my workshop notes.\n\n"
            "Best regards,\nA Student"),
        email(3,
            "You have recently discovered a beautiful park for long walks near your university campus. You think your friend Alex would enjoy the experience and you want to invite them to join you on an upcoming weekend.",
            ["Describe the park and what makes it special.",
             "Invite Alex to join you for a walk in the park during an upcoming weekend.",
             "Suggest to Alex what they should prepare for the trip."],
            "Alex", "Weekend adventure",
            "Hi Alex,\n\n"
            "I recently found a beautiful park about twenty minutes from campus. A long path follows a small lake, then enters a wooded area with several quiet viewpoints. What makes the park special is the contrast between open water and shaded trails; it feels far from the city even though it is easy to reach by bus.\n\n"
            "Would you like to join me for a walk there next Saturday morning? I am thinking of leaving campus around 9:30 and following the six-kilometer loop, which should give us time to stop for photographs and lunch. If the weather is poor, we can choose Sunday instead.\n\n"
            "Please wear comfortable shoes with good grip because part of the path may be muddy. Bring water, a light rain jacket, and a snack. I will carry a small first-aid kit and download the trail map. Let me know whether you prefer a relaxed pace or a longer route.\n\n"
            "Best,\nA Student"),
        email(4,
            "You are a university student living in a residence hall. For the past week, the heating system in your room has not been working properly, and the temperature has sometimes become especially uncomfortable at night. You have tried adjusting the thermostat, but the problem has continued.",
            ["Describe the problem and explain what you have already done to address it.",
             "Explain how the cold temperature is affecting you.",
             "Ask when the heating system can be inspected and request a temporary solution if the repair cannot be completed soon."],
            "Ms. Ramirez", "Heating problem in my residence hall room",
            "Dear Ms. Ramirez,\n\n"
            "I am writing because the heating system in my residence hall room has not worked properly for the past week. The room remains cold even when I raise the thermostat, and the unit sometimes turns on briefly before shutting off again. I have checked the thermostat settings and kept the area around the vent clear, but the problem continues.\n\n"
            "The low temperature is especially uncomfortable at night. It has been difficult to sleep well, and I often have to study in the common room because my room is too cold for me to concentrate.\n\n"
            "Could you please let me know when the heating system can be inspected? If the repair cannot be completed soon, I would appreciate a safe temporary heater or another short-term room arrangement. I am available after 3:00 p.m. on weekdays if maintenance staff need access.\n\n"
            "Sincerely,\nA Student"),
        email(5,
            "You are organizing a university theater production and need to rent costumes for the cast. You want to contact a local costume shop to inquire about their rental options, prices, and availability. You also need to know if they offer fitting services for the actors.",
            ["Explain the purpose of the university theater production.",
             "Ask about rental options, prices, and availability for costumes.",
             "Invite them to the production."],
            "Ms. Parker", "Inquiry about costume rentals for community theater production",
            "Dear Ms. Parker,\n\n"
            "I am organizing a university production of a historical comedy, and we are looking for costumes that can create a convincing period setting while still allowing the actors to move comfortably onstage. The cast includes twelve performers with several quick costume changes.\n\n"
            "Could you let me know which period costumes are available for our rehearsal and performance dates, as well as the rental price per item or per complete outfit? We would also appreciate information about deposits, cleaning charges, and discounts for a larger order. Do you provide fittings or alterations, and how far in advance would the actors need to visit your shop? A preliminary catalog with size ranges would help us plan.\n\n"
            "We would be delighted to invite you and your staff to the production as our guests. Once the schedule is confirmed, I can send the performance date, venue, and ticket details. Thank you for considering our request.\n\n"
            "Kind regards,\nA Student"),
        disc(6, "Environmental Studies", "Dr. Diaz", "diaz.png",
             "We often hear about environmental problems like air pollution from factories, plastic waste in oceans, and forests being cut down for agriculture. People are trying different solutions: switching from coal and oil to solar and wind energy, teaching communities about recycling and conservation, or developing new technologies to clean contaminated water and soil. Which of these approaches do you think would produce the fastest, most measurable improvements to environmental problems? Why?",
             [post("Paul", "andrew.png",
                   "I believe that switching from coal and oil to solar and wind energy sources would produce the fastest environmental improvements. Power plants that burn coal create most of the air pollution and carbon emissions that cause climate change, so replacing them with clean energy would immediately reduce harmful gases entering the atmosphere and improve air quality in cities."),
              post("Kelly", "kelly.png",
                   "In my opinion, teaching communities about recycling, conservation, and environmental protection produces the most lasting improvements. When people understand how their daily choices affect air and water quality, they change their purchasing habits, support environmental policies, and teach these practices to their children, creating long-term behavioral changes across entire communities.")],
             [{"title": "Switch to Renewable Energy",
               "text": "Switching electricity generation toward solar and wind would produce the fastest measurable environmental improvement because energy systems operate continuously and can be monitored directly. When cleaner generation replaces fuel-based power, changes in emissions, fuel use, and local air pollutants can be measured at the facility and across the grid. The effect also extends to other sectors as transportation and buildings use more electricity. Speed depends on implementation, so governments and utilities should first replace the least efficient sources, improve transmission, and add storage or flexible demand where needed. Workers and communities tied to existing facilities require transition planning rather than abrupt closure without support. Education and cleanup technology remain valuable, but education may take years to change behavior and cleanup addresses damage after it occurs. Energy transition reduces a major source at the point of production and creates data that can be tracked month by month. That combination of scale, direct causation, and measurable performance makes it the strongest route to rapid improvement."},
              {"title": "Expand Community Environmental Education",
               "text": "Community education can produce the fastest practical improvement because many environmental losses result from repeated local decisions that can change immediately. A program connected to actual services can show residents exactly how to separate waste, reduce contamination in recycling, conserve water, and report illegal dumping. The results are measurable through cleaner collection streams, lower water use, and participation rates, rather than vague awareness surveys. Education is most effective when it removes uncertainty and inconvenience at the same time. Demonstrations should occur where people use the system, instructions should be available in relevant languages, and collection schedules must match the message. Participants can then share the routine within households, schools, and workplaces. Large energy projects may deliver greater total reduction, but planning and construction can take substantial time. Community behavior can begin changing this week and can also build public support for those larger investments. When education is tied to accessible infrastructure and visible feedback, it creates rapid gains while establishing habits that continue."}]),
        disc(7, "Career Studies", "Dr. Diaz", "diaz.png",
             "We've been discussing what factors people consider most important when choosing a career field. Some career counselors believe that financial considerations, such as high salaries and job security, are the primary factors that influence people's career decisions. Others argue that non-financial factors, like personal fulfillment, work-life balance, and opportunities to help others, are more important for long-term career satisfaction. Which factors do you think are more important when choosing a career field?",
             [post("Andrew", "andrew.png",
                   "Financial considerations are the most important because high salaries and job security provide stability for supporting a family and building savings."),
              post("Kelly", "kelly.png",
                   "Non-financial factors are more important because personal interests, work-life balance, and meaningful contributions determine long-term motivation and satisfaction.")],
             [{"title": "Prioritize Financial Stability",
               "text": "Financial considerations should receive slightly more weight when people choose a career, especially at the beginning of adult life. A reliable salary and reasonable job security make it possible to pay for housing, manage emergencies, and plan for future training. For example, a recent graduate may enjoy two different fields equally, but one position offers stable hours and enough income to avoid taking a second job. That stability gives the person time to improve professional skills and make thoughtful career decisions instead of reacting to immediate financial pressure. Kelly is right that fulfillment and balance matter for long-term satisfaction. However, those benefits are difficult to enjoy when basic expenses create constant stress. I would therefore use financial stability as the first screening criterion, then compare the remaining jobs on meaning, workplace culture, and opportunities to help others. This approach protects essential needs without treating salary as the only measure of success."},
              {"title": "Prioritize Meaning and Balance",
               "text": "Non-financial factors are more important because they determine whether a person can sustain a career rather than merely enter it. Work that matches someone's interests and values usually encourages deeper effort, while a reasonable schedule leaves enough energy for family, health, and continued learning. Imagine an employee who accepts a highly paid position but faces unpredictable overtime and performs tasks that feel pointless. Even with a good salary, that person may lose motivation and leave, which creates both personal stress and another job search. By contrast, a moderately paid role with supportive management and meaningful responsibilities can produce stronger skills and a more stable professional record. Andrew's concern about financial security is valid, so applicants should reject jobs that cannot cover essential needs. Once that minimum is met, however, fulfillment, balance, and social contribution should guide the final choice because they shape satisfaction every working day."}]),
        disc(8, "Climate Policy", "Dr. Gupta", "diaz.png",
             "We've been exploring strategies to address climate change, especially the effects of carbon-based energy sources, which are causing global warming. Some experts emphasize the importance of individual actions, like reducing energy use and minimizing waste. Others argue that systemic change through government policy and corporate accountability is more impactful. Which approach do you believe is most effective in combating climate change, and why? Support your view with reasoning.",
             [post("Paul", "andrew.png",
                   "Individual actions are essential because they foster environmental awareness and personal responsibility. When people adopt sustainable habits like conserving energy, reducing plastic use, and supporting green initiatives, they influence cultural norms and consumer demand. These shifts can pressure institutions to adopt eco-friendly policies. Personal choices, multiplied across populations, can drive meaningful environmental change."),
              post("Kelly", "kelly.png",
                   "Policy reform and corporate accountability are more effective for addressing climate change at scale. Governments can enforce emissions limits, invest in renewable energy, and regulate industries. Corporations control vast resources and supply chains, so their sustainability efforts have global impact. While individual actions matter, systemic change is necessary to meet climate goals.")],
             [{"title": "Prioritize Individual Action",
               "text": "Individual action is most effective when it changes market signals rather than remaining a private symbol. Households choose transportation, energy providers, food, and durable goods repeatedly, and companies watch which options gain or lose demand. If consumers favor repairable products, lower-energy services, and transparent environmental information, businesses have a reason to redesign offerings before a regulation requires them to do so. Individuals can strengthen the signal by acting together through purchasing groups, workplace policies, and community campaigns. They should also communicate why an option is unavailable or unaffordable instead of treating every failure as personal guilt. The direct emissions reduction from one household is limited, but consumer patterns can influence investment and make cleaner choices more common. Policy remains necessary for infrastructure and minimum standards. Still, institutional change becomes easier when people have already demonstrated demand and practiced new routines. Coordinated individual behavior links everyday choices with economic pressure, turning personal responsibility into a practical force for wider climate action."},
              {"title": "Prioritize Systemic Policy",
               "text": "Policy and corporate accountability are more effective because they can change the default conditions faced by every individual. A building code can improve thousands of homes during construction, while one efficient resident cannot correct poor insulation in a rented apartment. A supply-chain requirement can alter materials and transport before products reach consumers, who otherwise choose only among existing options. Systemic measures also create measurable responsibility. Governments can establish a clear target, require comparable reporting, and impose consequences when major emitters fail to meet it. Corporations should publish transition plans linked to investment and executive decisions, not only distant promises. Citizens remain important as voters, workers, and customers who demand enforcement, but climate success should not depend on perfect private behavior. Rules are most effective when they reward early improvement, protect lower-income households from unfair costs, and close loopholes that shift pollution elsewhere. By changing infrastructure and production at their source, systemic action makes lower-impact behavior available and normal at a scale personal choice cannot reach."}]),
        disc(9, "Communication", "Dr. Diaz", "diaz.png",
             "Digital communication includes texting, video chats, and social media. Some people say these tools help relationships by allowing instant messages, sharing photos, and staying in touch over long distances. Others believe they cause problems—like misunderstandings and less eye contact—because people rely less on talking in person. Think about how you communicate with family, friends, or classmates. Do you believe digital communication makes your relationships stronger or weaker? Share specific examples and explain your opinion clearly.",
             [post("Claire", "kelly.png",
                   "I think digital communication strengthens relationships. It allows people to maintain bonds with family members who live far away. For example, my brothers work in another country, but we can stay in touch and remain a loving family thanks to various digital communication platforms."),
              post("Kelly", "andrew.png",
                   "I think digital communication can weaken relationships. People may text instead of talking face-to-face, which makes conversations shorter and less personal. It's easy to miss feelings or misunderstand someone's meaning. When people rely too much on phones or apps, they may feel distant from others even when they're constantly connected. Real conversations matter more.")],
             [{"title": "Digital Communication Strengthens Relationships",
               "text": "Digital communication makes my relationships stronger because it allows shared routines to continue even when people live far apart. My family, for example, keeps a small group chat where we exchange ordinary photographs and short voice messages during the week. Those details mean that our weekend video call does not begin with formal updates; we already know what happened and can discuss how everyone felt about it. The tools also let us support one another at the right moment. A relative can ask for advice before an important decision instead of waiting until the next visit. This connection requires more than sending symbols or forwarding content. We ask follow-up questions, schedule calls when a topic becomes complex, and put our phones away when we meet in person. Digital contact works best as a bridge among richer conversations. Because it preserves context, availability, and a sense of everyday presence, it has made distance less damaging to my closest relationships."},
              {"title": "Digital Communication Weakens Relationships",
               "text": "Digital communication can make relationships weaker when a stream of brief contact replaces genuine attention. I noticed this during a group assignment: my classmates exchanged dozens of messages, but unclear replies created different assumptions about responsibilities. A ten-minute conversation eventually solved a problem that had occupied the chat for an entire evening. The same pattern can affect friendships. People may send frequent reactions to photographs yet avoid asking a difficult question or listening without interruption. Because messages can be delayed, edited, or ignored, each person controls how much emotion is visible, and misunderstandings may remain hidden. I now use text mainly for simple updates and arrangements. When a friend seems upset or a decision matters, I suggest a call or an in-person meeting. The number of messages can create an impression of closeness, but strong relationships require moments in which both people are fully present, respond in real time, and accept the discomfort of honest conversation."}]),
        disc(10, "Sociology", "Dr. Diaz", "diaz.png",
             "This semester, we are exploring the concept of social mobility. Social mobility refers to the ability of individuals or families to move up or down the social ladder over time, especially by growing wealthier. Some sociologists argue that education is the key to improving social mobility, while others believe that economic policies and government intervention play a larger role. What do you think is the most effective way to enhance social mobility, and why?",
             [post("Andrew", "andrew.png",
                   "Education is most effective because it gives people the knowledge and skills needed to pursue better jobs and improve their socioeconomic status."),
              post("Kelly", "kelly.png",
                   "Economic policies and government intervention are more effective because they can reduce inequality, provide financial support, and create job opportunities.")],
             [{"title": "Expand Practical Education",
               "text": "Education is the most effective long-term route to social mobility when it is connected to real employment opportunities. Knowledge alone is not enough; programs should combine affordable instruction with practical skills, career guidance, and access to internships. For example, a community college could offer evening courses in health technology for adults who already work during the day. If local clinics also provide supervised placements, students can gain both a recognized qualification and experience that employers can evaluate. This changes their access to higher-paying work rather than giving only temporary assistance. Kelly correctly notes that public support can reduce immediate inequality, but those policies work best when they remove barriers to education, such as tuition costs, transportation, or childcare. By helping people build portable skills that remain useful across employers, education can raise income over many years and allow the benefits to extend to the next generation."},
              {"title": "Remove Structural Economic Barriers",
               "text": "Economic policy and government intervention can improve social mobility more directly because individuals cannot use their abilities when stable jobs and basic support are unavailable. Education may prepare someone for work, but it cannot create affordable transportation, childcare, or fair access to vacancies by itself. Consider a qualified parent who turns down a better job because the commute is expensive and the working hours conflict with childcare. A targeted transit subsidy and reliable childcare program could make that position immediately possible, raising the family's income and future savings. Andrew's emphasis on education is important, and training should remain part of the solution. Still, public policy controls many of the conditions that determine whether training leads to opportunity. Policies that lower practical barriers, support job creation, and make hiring more accessible can help a wider range of people move upward, including those who already possess useful skills but remain excluded from better employment."}]),
    ])


REPEATS = [
    ("form01", "You are volunteering at a community workshop near campus. The leader is training you to guide participants in arranging flowers. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "Cut stems at an angle using shears.",
        "Place pebbles in the bottom for support.",
        "Begin by placing the taller flowers in the center.",
        "Fill gaps with smaller flowers to maintain the visual balance.",
        "Add some greenery to enhance the overall fullness.",
        "You need to change the water regularly to keep everything looking fresh.",
        "Once you are happy with your arrangement, decorate it with a pretty ribbon.",
    ]),
    ("form02", "You are volunteering at a community workshop near campus. The leader is training you to guide schoolchildren in building a simple birdhouse. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "Measure each piece carefully before you cut.",
        "Saw slowly to keep the line smooth and straight.",
        "Lightly sand the edges until they all feel smooth and clean.",
        "Make a round hole that the bird will use as the entrance to the house.",
        "Glue each side of the house together and give it some time to dry.",
        "To attach the roof, hammer the nails in gently so the wood doesn't split or crack.",
        "To protect the birdhouse from weather, seal it well so it will last for years.",
    ]),
    ("form03", "You are working a part-time job at a clothing store near campus. Your manager is training you to assist customers at the store. Listen to the manager and repeat what the manager says. Repeat only once.", [
        "The Women's Clothing Section is this way.",
        "Our men's corner has shirts, trousers and jackets.",
        "Our accessories are on display near the entrance.",
        "Fitting rooms are available here for trying on clothes.",
        "The checkout for payment is by the exit when you're ready.",
        "Ask the store associates if you need help locating specific items.",
        "If you get lost, check the store map for the layout and location of departments.",
    ]),
    ("form04", "You are volunteering at a community nature center near campus. The leader is training you to help beginners learn the basics of birdwatching. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "Look towards the treetops where you can find nests.",
        "Note details to help identify the bird.",
        "Keep a record of each sighting to share later with the group.",
        "Use proper footwear to keep from slipping while exploring outdoors.",
        "Keep your head covered to protect yourself from the sun on the walk.",
        "When getting ready for a day out, be sure to pack essentials to be prepared.",
        "If you spot a bird nearby, avoid sudden movements so it does not fly away.",
    ]),
]

INTERVIEWS = [
    ("form01", "As part of a university project, you have agreed to take part in a short research interview about online learning experiences. A graduate student conducting the research will ask you some questions online.", [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about your online learning experiences. First, have you or someone you know ever taken an online course? If so, what was the subject?",
         "Yes, I have taken several online courses myself. For example, last year, I completed a comprehensive course on data science through a popular online platform. The subject covered fundamental concepts like statistical analysis, machine learning algorithms, and data visualization techniques. I found it incredibly convenient because I could study at my own schedule from home, and the flexibility allowed me to balance it with my full-time job. The course also provided access to a community forum where I could discuss topics with peers and instructors, which enhanced my learning experience significantly."),
        ("Thank you. Can you describe what you think are some of the advantages or disadvantages of an online course over an in-person course?",
         "Online courses offer significant advantages, such as flexibility and accessibility. For example, students can learn at their own pace and from anywhere, which is especially beneficial for those with busy schedules or in remote areas. This often makes education more inclusive and cost-effective by reducing travel and accommodation expenses. This can lead to feelings of isolation and reduced engagement, as it's harder to build relationships with peers and instructors. Also, online learning requires strong self-discipline and time-management skills, which some students may struggle with, potentially affecting their motivation and academic performance."),
        ("Interesting, online courses often let students work at their own pace. How do you feel about learning when there is no set class time?",
         "I find learning without set class times to be a double-edged sword. For example, on one hand, it offers great flexibility, allowing me to manage my schedule around other commitments like work or personal interests. This self-paced approach can reduce stress and let me delve deeper into topics I'm passionate about. On the other hand, it requires strong self-discipline; without fixed deadlines, I might procrastinate or struggle to stay motivated. To succeed, I need to set personal goals and use tools like calendars to stay on track. Overall, while it empowers learners, it demands responsibility to be effective."),
        ("Great, one of the concerns with online learning is online assessment, with some people believing that you cannot trust the results of an online test. What do you think about that issue?",
         "I think the issue of trusting online assessment results is complex but manageable. While it's true that online tests can be vulnerable to cheating, such as using unauthorized resources or getting help from others, I believe that with proper measures, their reliability can be ensured. For example, many institutions now use proctoring software that monitors students through webcams and restricts browser access during exams. From my experience, online learning often includes diverse evaluation methods like projects and discussions, which complement tests and provide a more holistic view of student performance."),
    ]),
    ("form02", "You have signed up for a study run by a university research group that is investigating shopping habits. You will have a short video interview with one of the researchers. The researcher will ask you some questions.", [
        ("Thank you for taking the time to speak with me. I'd like to ask you some questions about your shopping habits. When was your last shopping trip? And what did you buy? Did you have a good shopping experience?",
         "My last shopping trip was last weekend. For example, I went to a local supermarket to buy groceries. I purchased some fresh vegetables, fruits, milk, and bread. The experience was quite good because the store was not crowded, and I found everything I needed quickly. The checkout process was also efficient, so I didn't have to wait long. Overall, it was a pleasant and convenient shopping trip. That simple check keeps my spending aligned with my priorities. Seeing the numbers clearly helps me choose based on priorities instead of a momentary impulse."),
        ("I see. When you shop, which do you like better: shopping for yourself or shopping for others? Why?",
         "I prefer shopping for others because it brings me more joy. For example, when I shop for myself, I often feel indecisive or guilty about spending money. But when I pick out gifts for friends or family, I focus on their preferences and happiness. It feels rewarding to see their reactions and know I made them feel special. Shopping for others also reduces the pressure of personal choice, making the experience more relaxed and enjoyable. That habit leaves room for occasional treats while protecting the money I need for larger goals."),
        ("Interesting. Next, I'd like to get your opinion. In recent years, people's shopping preferences have shifted in various ways. Do you think that in the future, people will continue to change how and where they shop? Why? Or why not?",
         "Absolutely, I believe people will continue to change their shopping habits. First, technology evolves rapidly, leading to more convenient online platforms and personalized experiences, which attract consumers. For example, augmented reality lets customers try products virtually, reducing returns. Second, sustainability concerns are growing; shoppers prefer eco-friendly brands and local stores to reduce carbon footprints. Finally, economic factors like inflation encourage bargain hunting and second-hand shopping. Therefore, these shifts will persist as long as innovation and values drive consumer behavior. I still check important information myself, so convenience does not replace independent judgment."),
        ("Good points. I just have one more question. Some people believe that buying too many products you do not need harms the environment. Do you agree with this idea? Why or why not?",
         "Yes, I agree with that view. I strongly agree that buying unnecessary products harms the environment. Every product we purchase requires resources to manufacture, package, and transport, which generates pollution and depletes natural resources. For example, when we buy things we don't need, we waste those resources and contribute to more waste in landfills. Fast fashion items are often bought impulsively and discarded quickly, leading to massive textile waste. Also, overconsumption drives demand for more production, which increases carbon emissions and environmental degradation. Therefore, I believe reducing unnecessary purchases is crucial for protecting our planet."),
    ]),
]


def build_speaking(pid, title, form, interview=None):
    tasks = []
    modules = []
    if form:
        key, instruction, samples = REPEATS[form - 1]
        for i, sample in enumerate(samples, 1):
            tasks.append({
                "type": "repeat", "module": 1, "id": i,
                "speakSec": 15 if i < 7 else 18,
                "instruction": instruction,
                "audio": AUDIO + "speaking_repeat_%s_q%02d.mp3" % (key, i),
                "sample": sample,
            })
        modules.append({"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"})
    if interview:
        ikey, i_instruction, items = INTERVIEWS[interview - 1]
        start = 8 if form else 1
        mod = 2 if form else 1
        modules.append({"n": mod, "timeSec": 360, "from": start, "to": start + 3, "label": "Take an Interview"})
        for i, (stem, sample) in enumerate(items, 1):
            tasks.append({
                "type": "interview", "module": mod, "id": start - 1 + i,
                "speakSec": 45, "instruction": i_instruction, "stem": stem,
                "audio": AUDIO + "speaking_interview_%s_q%02d.mp3" % (ikey, i),
                "sample": sample,
            })
    return {
        "id": pid, "title": title, "set": SET, "skill": "speaking",
        "modules": modules, "tasks": tasks,
    }


def copy_audio():
    dest = os.path.join(ROOT, "library/toefl/audio/2025-08-30")
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
    dump("2025-08-30-reading.json", build_reading())
    dump("2025-08-30-listening.json", build_listening())
    dump("2025-08-30-writing.json", build_writing())
    dump("2025-08-30-speaking.json", build_speaking(
        ID, TITLE + " · 口语 Form 1", 1, 1))
    dump("2025-08-30-speaking-f2.json", build_speaking(
        ID + "-s2", TITLE + " · 口语 Form 2", 2, 2))
    dump("2025-08-30-speaking-f3.json", build_speaking(
        ID + "-s3", TITLE + " · 口语 Form 3", 3, None))
    dump("2025-08-30-speaking-f4.json", build_speaking(
        ID + "-s4", TITLE + " · 口语 Form 4", 4, None))
