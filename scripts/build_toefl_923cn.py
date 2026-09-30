#!/usr/bin/env python3
"""Build 9.23 China offline TOEFL. Run: python3 scripts/build_toefl_923cn.py"""
import json
import os
import shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/9月/9.23-国内线下/audio"
AUDIO = "library/toefl/audio/2025-09-23/"
PHOTO = "library/toefl/img/2025-09-02/"
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
        + sentence
        + "\n\nSelect the best location in the passage.",
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


def lecture(title, module, instruction, fname, questions):
    NEED.append(fname)
    return {
        "type": "lecture",
        "module": module,
        "title": title,
        "instruction": instruction,
        "audio": AUDIO + fname,
        "questions": questions,
    }


def email(eid, prompt, bullets, to, subject, sample):
    return {
        "type": "email",
        "module": 1,
        "id": eid,
        "instruction": "Write an email. In your email, do the following:",
        "prompt": prompt,
        "bullets": bullets,
        "to": to,
        "subject": subject,
        "sampleSubject": subject,
        "sample": sample,
    }


def disc(did, klass, prof, posts, samples):
    return {
        "type": "discussion",
        "module": 2,
        "id": did,
        "instruction": (
            "Your professor is teaching a class. Write a post responding to the professor's question.\n"
            "In your response, you should do the following:\n"
            "• Express and support your personal opinion.\n"
            "• Make a contribution to the discussion in your own words.\n"
            "An effective response will contain at least 100 words."
        ),
        "class": klass,
        "professor": prof,
        "posts": posts,
        "samples": samples,
    }


def person(name, photo, text):
    return {"name": name, "photo": PHOTO + photo, "text": text}


def build_reading():
    tasks, n = [], 1
    t, n = cw("Art and Religion", 1, n, [
        "Throughout history, art and religion have been deeply intertwined. Religious ",
        ("bel", "beliefs"),
        " often ",
        ("ins", "inspire"),
        " artistic ",
        ("crea", "creations"),
        ", from ",
        ("anc", "ancient"),
        " cave ",
        ("pain", "paintings"),
        " to ",
        ("elab", "elaborate"),
        " cathedral ",
        ("archit", "architecture"),
        ". Throughout ",
        ("his", "history"),
        ", artists ",
        ("ha", "have"),
        " used ",
        ("vis", "visual"),
        " imagery to express spiritual ideas and convey religious stories. Iconography, the study of symbols and images in art, helps us understand the meaning behind religious artwork. Churches, temples, and other places of worship are often adorned with intricate designs that reflect the convictions and practices of their communities.",
    ])
    tasks.append(t)
    t, n = cw("Economics and Resource Allocation", 1, n, [
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
    t, n = cw("Archaeology", 1, n, [
        "Archaeology is the study of past human cultures through the excavation and analysis of artifacts, structures, and other physical remains. This ",
        ("disci", "discipline"),
        " helps ",
        ("unc", "uncover"),
        " the ",
        ("da", "daily"),
        " lives, ",
        ("bel", "beliefs"),
        ", and ",
        ("techno", "technologies"),
        " of ",
        ("anc", "ancient"),
        " civilizations. ",
        ("Archaeo", "Archaeologists"),
        " often ",
        ("wo", "work"),
        " at dig ",
        ("si", "sites"),
        ", carefully ",
        ("unear", "unearthing"),
        " and documenting finds. Techniques such as carbon dating and soil analysis provide information about the age and context of discoveries. Collaborative efforts with historians and anthropologists enrich our understanding of past civilizations, revealing information about their religious practices, the tools they used, and many other aspects of how they lived.",
    ])
    tasks.append(t)
    t, n = cw("Language Development in Children", 1, n, [
        "Language development in children is a complex process influenced by both genetics and environment. From ",
        ("bi", "birth"),
        ", infants ",
        ("be", "begin"),
        " to recognize ",
        ("sou", "sounds"),
        " and ",
        ("patt", "patterns"),
        " in ",
        ("spe", "speech"),
        ". By ",
        ("o", "one"),
        " year ",
        ("o", "of"),
        " age, ",
        ("mo", "most"),
        " ",
        ("s", "say"),
        " simple ",
        ("wo", "words"),
        ' like "mama" or "dada." As they grow, their vocabulary expands rapidly. Interacting with caregivers and peers plays a crucial role in this development. Reading to children and engaging in conversations are effective ways to support language acquisition.',
    ])
    tasks.append(t)
    t, n = cw("Urban Industrialization", 1, n, [
        "In the early days of industrialization, many cities experienced rapid growth. This ",
        ("w", "was"),
        " due ",
        ("t", "to"),
        " the ",
        ("inf", "influx"),
        " of ",
        ("w", "workers"),
        " seeking ",
        ("emplo", "employment"),
        " in ",
        ("fact", "factories"),
        ". Urbanization ",
        ("l", "led"),
        " to ",
        ("signi", "significant"),
        " changes ",
        ("i", "in"),
        " the ",
        ("soc", "social"),
        " fabric, as people from diverse backgrounds came to live and work in close quarters. Industrialization also brought about various challenges, including the environmental problems caused by increased pollution and the need for improved infrastructure to house and transport the new city residents.",
    ])
    tasks.append(t)
    t, n = cw("Climate and Weather", 1, n, [
        "Climate change has become one of the most pressing current issues of our time, sparking global conversations. When discussing climate, it is often confused with weather. Climate ",
        ("specif", "specifically"),
        " refers ",
        ("t", "to"),
        " long-term ",
        ("tre", "trends"),
        " in ",
        ("tempe", "temperature"),
        ", humidity, ",
        ("wi", "wind"),
        ", and ",
        ("precip", "precipitation"),
        " that ",
        ("def", "define"),
        " typical ",
        ("condi", "conditions"),
        " for a ",
        ("reg", "region"),
        "—not ",
        ("ju", "just"),
        " the daily forecast. While weather can shift dramatically from one day to the next, the climate of an area describes what is normal over decades.",
    ])
    tasks.append(t)
    t, n = cw("Glaciers and the Last Ice Age", 1, n, [
        "The last Ice Age sculpted the face of Earth, leaving behind majestic glaciers that continue to shape the landscape even today. These ",
        ("mas", "massive"),
        " ice ",
        ("riv", "rivers"),
        " flow ",
        ("slo", "slowly"),
        ", grinding ",
        ("do", "down"),
        " mountains ",
        ("a", "and"),
        " carving ",
        ("val", "valleys"),
        " over ",
        ("mill", "millennia"),
        ". Compared ",
        ("t", "to"),
        " other ",
        ("geolo", "geological"),
        " phenomena, ",
        ("th", "the"),
        " movement of glaciers is imperceptible on a human timescale, yet their impact is undeniably profound. Glaciers serve as natural archives of Earth's climatic history, preserving atmospheric data in layers of ice that have accumulated over thousands of years. Studying glaciers allows scientists to analyze past temperature patterns and environmental changes over time.",
    ])
    tasks.append(t)
    t, n = cw("Animal Communication Signals", 1, n, [
        "Animal behavior encompasses a rich tapestry of communication signals, from the melodic complexity of birdsong and ultrasonic echolocation to the visual brilliance of courtship displays and color signals. Chemical cues guide social bonding and mating, while tactile gestures like grooming convey group ",
        ("affi", "affiliation"),
        ". Electric ",
        ("disch", "discharges"),
        " within ",
        ("aqu", "aquatic"),
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
        ("evo", "evolved"),
        " in ",
        ("resp", "response"),
        " to evolutionary pressures. By studying these signals with ethological rigor, researchers unravel the cognitive and ecological contexts underlying social interactions.",
    ])
    tasks.append(t)
    tasks.append(academic("Dinosaur Feathers", 2, [
        "Paleontologists once thought dinosaurs were completely covered in scales. Recent discoveries have overturned this idea. Fossils found in China reveal some dinosaurs had feathers. These fossils, dating back approximately 126 million years, show traces of feathers around skeletons. The feathers were not for flight but likely for insulation or display.",
        "One significant find was the feathered dinosaur Sinosauropteryx. This small, meat-eating dinosaur had simple, hairlike feathers on its body. This discovery showed that feathers were more common among dinosaurs than previously thought. Another discovery involved the larger, more complex feathers of Caudipteryx. These feathers were similar to those of modern birds, suggesting that feathers evolved in stages, becoming more sophisticated over time.",
        {"insert": "A", "t": "Researchers are now studying how feathered dinosaurs might have used their plumage."},
        {"insert": "B", "t": "Some theories suggest that feathers helped regulate body temperature, while other theories propose that feathers were used for mating displays or camouflage."},
        {"insert": "C", "t": "Understanding feather function in dinosaurs provides insights into their behavior and evolution."},
        {"insert": "D"},
        "The idea that birds are direct descendants of dinosaurs has gained support from the findings about feathers. Fossil evidence reveals that many theropod dinosaurs, such as Velociraptor, had feathers similar to those of modern birds. These similarities in feather structures, including quill knobs and complex branching patterns, strengthen the theory that birds evolved from theropod dinosaurs.",
    ], [
        q(n, 'The word "traces" in the passage is closest in meaning to',
          {"A": "development", "B": "signs", "C": "copies", "D": "shadows"}, "B"),
        q(n + 1, "The discovery of Sinosauropteryx suggested which of the following?",
          {"A": "Not all dinosaurs were relatively small meat-eaters.",
           "B": "Many dinosaurs likely had feathers on their bodies.",
           "C": "Dinosaur fossils are more likely to be found in China than in other parts of the world.",
           "D": "Feathered dinosaurs were generally smaller than those without feathers."}, "B"),
        q(n + 2, "Why does the author provide information about Caudipteryx?",
          {"A": "To show another example of a dinosaur with hairlike feathers",
           "B": "To suggest that Sinosauropteryx likely evolved from Caudipteryx",
           "C": "To make the point that dinosaur feathers likely became more complex over time",
           "D": "To show that there is less variety among types of dinosaur feathers than has been commonly assumed"}, "C"),
        q(n + 3, "What is the relationship between paragraphs 2 and 3?",
          {"A": "Paragraph 3 provides an example to support the general point about feathers introduced in paragraph 2.",
           "B": "Paragraph 3 challenges an idea about feathers proposed in paragraph 2.",
           "C": "Paragraph 3 focuses on the roles played by the feathers described in paragraph 2.",
           "D": "Paragraph 3 summarizes the ideas about feathers presented in paragraph 2."}, "C"),
        insert_q(n + 4, "Dinosaurs may have also used their feathers to protect their eggs.", "C"),
    ]))
    n += 5
    tasks.append(academic("Space Debris: A Growing Concern", 2, [
        "The Kessler Syndrome, proposed by NASA scientist Donald J. Kessler in 1978, hypothesizes a cascading effect in low Earth orbit (LEO) in which collisions between satellites and debris—defunct satellites, spent rocket stages, and fragments from earlier collisions—generate more fragments, exponentially increasing the likelihood of further collisions. This feedback loop could render certain orbital regions unusable for decades.",
        "While the model is compelling, some assumptions merit scrutiny. For instance, it presumes a uniform distribution of debris and constant collision probability, yet orbital mechanics suggest that debris clusters in specific altitudes and orbital paths, potentially limiting the scope of cascading events.",
        "Moreover, technological advancements in debris tracking and active removal may mitigate the risk more effectively than Kessler originally envisioned. Critics argue that the syndrome underestimates the resilience of orbital infrastructure and overstates the inevitability of runaway collisions. Alternative explanations for observed debris growth include a greater number of satellite launches and fragmentation from aging spacecraft, rather than a self-sustaining cascade.",
        "Nonetheless, the Kessler Syndrome remains a valuable heuristic for space policy, emphasizing the need for international cooperation and sustainable orbital practices. Its cautionary implications are profound—especially as commercial constellations dramatically increase the number of active satellites in LEO.",
    ], [
        q(n, "The passage suggests that one impact of the Kessler Syndrome would be",
          {"A": "an increase in NASA space research",
           "B": "a limitation on where satellites could safely orbit",
           "C": "a greater number of satellite launches",
           "D": "an increased risk of debris falling to Earth"}, "B"),
        q(n + 1, 'Why does the author mention the assertion that "debris clusters in specific altitudes and orbital paths"?',
          {"A": "To provide a reason for an increase in collisions between satellites and debris",
           "B": "To illustrate a part of the feedback loop",
           "C": "To explain an objection to the Kessler Syndrome hypothesis",
           "D": "To emphasize the need for better debris tracking"}, "C"),
        q(n + 2, 'The word "resilience" in the passage is closest in meaning to',
          {"A": "strength", "B": "threat", "C": "knowledge", "D": "supervision"}, "A"),
        q(n + 3, "According to the passage, some argue that the Kessler Syndrome will not occur for all of the following reasons EXCEPT:",
          {"A": "Space debris may not be spread out as evenly as the theory assumes.",
           "B": "New technology means that the removal of debris may be possible.",
           "C": "NASA has since developed new orbital infrastructure for avoiding collisions.",
           "D": "There may be other explanations for the observed growth in debris."}, "C"),
        q(n + 4, 'What does "Its cautionary implications" refer to in the passage?',
          {"A": "The idea that one must assess the Kessler Syndrome carefully before accepting its predictions",
           "B": "The idea that there will be cascading collisions in LEO, making it difficult for satellites to remain intact",
           "C": "The suggestion that international cooperation will be more difficult to achieve as space becomes more cluttered",
           "D": "The suggestion that debris tracking and active removal may pose additional risks to satellites"}, "B"),
    ]))
    n += 5
    tasks.append(academic("Quantum Dots", 2, [
        "Quantum dots are tiny semiconductor particles with unique optical properties, making them valuable in display technology. When exposed to light, these nanoparticles emit bright, pure colors that can be finely tuned by varying their size. This allows for more vibrant and accurate colors in screens, surpassing traditional display technologies. Their application in displays has revolutionized the consumer electronics industry. For example, quantum dot-enhanced televisions offer a broader color spectrum and energy conservation compared to conventional light-emitting diode (LED) displays because they require less backlighting.",
        "Environmental benefits are another advantage. Traditional displays often use harmful heavy metals like cadmium and lead. Quantum dots can be made from less toxic materials, and researchers are working on cadmium-free quantum dots to further reduce environmental impact.",
        "The manufacture of quantum dots requires extreme precision. As a result, challenges remain in scaling up production. However, this is a worthwhile endeavor because quantum dots potentially have many applications outside of electronics, such as in biological research. Their small size and bright emission are ideal for tagging and tracking molecules in living organisms. This allows for long-term observation of dynamic biological processes.",
    ], [
        q(n, "The color of quantum dots can be controlled by changing",
          {"A": "their size", "B": "the direction in which they are displayed",
           "C": "the amount of light they are exposed to", "D": "the color of the light they are exposed to"}, "A"),
        q(n + 1, "What makes quantum dot technology in televisions efficient?",
          {"A": "The vibrancy of the colors", "B": "The reduced need for backlighting",
           "C": "The larger color spectrum", "D": "The size of the particles"}, "B"),
        q(n + 2, "What is identified as an environmental benefit of quantum dots?",
          {"A": "The ability to make cadmium more pure", "B": "The ability to remove lead from living organisms",
           "C": "Limiting environmental impacts to small areas", "D": "Less use of some poisonous substances"}, "D"),
        q(n + 3, 'Why does the passage state that the "manufacture of quantum dots requires extreme precision"?',
          {"A": "To imply that quantum dots' environmental impact might increase",
           "B": "To praise the hard work of quantum dot manufacturers",
           "C": "To challenge the claim that using quantum dots is worthwhile",
           "D": "To explain why the production of quantum dots is difficult to increase"}, "D"),
        q(n + 4, "How can biologists use quantum dots?",
          {"A": "For studying very small living organisms", "B": "For observing the movement of molecules",
           "C": "For including electronic tools in research", "D": "For making some biological processes more dynamic"}, "B"),
    ]))
    n += 5
    tasks.append(academic("Social Networks and Influence", 2, [
        "In today's digital age, social networks play a significant role in shaping opinions and behaviors. The influence of these networks is not merely about the number of connections one might have, but about the quality and nature of those interactions. Sociologists have long been interested in how individuals within a network can influence the group's overall dynamics. This concept is sometimes referred to as social capital.",
        {"insert": "A", "t": "The structure of a network can determine the flow of information."},
        {"insert": "B", "t": "An individual positioned at the intersection of various groups, known as a bridge, often plays a crucial role in disseminating information."},
        {"insert": "C", "t": "This person can introduce new ideas and perspectives to different parts of the network, thereby influencing opinions and possibly altering behaviors."},
        {"insert": "D"},
        "Another factor is homophily, where individuals are more likely to form connections with others who are similar to themselves in terms of opinions, values, or social status. While homophily can reinforce existing beliefs, it can also create echo chambers, limiting exposure to diverse perspectives. The presence of influential individuals, often termed opinion leaders, can amplify or mitigate the effects of network structures by means of their social skills or charisma. Sociologists aim to uncover the nuanced ways social networks shape collective behavior.",
    ], [
        q(n, "According to the passage, social capital refers to",
          {"A": "how networks shape social interactions in the digital age",
           "B": "the number of social connections an individual has",
           "C": "the impact that individuals have on social networks",
           "D": "the data sociologists use to make claims about digital networks"}, "C"),
        q(n + 1, "What does the passage imply about homophily?",
          {"A": "It ensures the dissemination of diverse ideas.",
           "B": "It promotes similarity and continuity within groups.",
           "C": "It emphasizes opinion leaders over network structures.",
           "D": "It makes it unnecessary to have bridges across networks."}, "B"),
        q(n + 2, 'Why does the author mention "echo chambers"?',
          {"A": "To highlight the risks of networks composed of like-minded individuals",
           "B": "To introduce the role of opinion leaders in amplifying network structures",
           "C": "To elaborate on the role of bridges in altering behaviors",
           "D": "To identify one advantage of networks that connect various social classes"}, "A"),
        q(n + 3, 'The word "nuanced" in the passage is closest in meaning to',
          {"A": "many", "B": "complex", "C": "powerful", "D": "general"}, "B"),
        insert_q(n + 4, "However, spreading information is not the only way to exert influence.", "D"),
    ]))
    return {
        "id": "2025-09-23",
        "title": "新托福 9.23 国内线下 · 阅读",
        "set": "9.23",
        "skill": "reading",
        "modules": [
            {"n": 1, "timeSec": 1920, "from": 1, "to": 80},
            {"n": 2, "timeSec": 960, "from": 81, "to": 100},
        ],
        "tasks": tasks,
    }


def build_listening():
    talks = [
        (1, "Dark Stores", "Listen to a talk in a business class. Then answer the questions.",
         "listening_01_dark_stores.mp3", [
            ("What aspect of dark stores does the speaker mainly discuss?",
             {"A": "Their influence on the retail market and society",
              "B": "Their architectural design and layout",
              "C": "Their similarities to traditional storefronts",
              "D": "Their role in the history of warehouse development"}, "A"),
            ("According to the talk, why can dark stores offer lower prices?",
             {"A": "Because they sell large quantities of goods",
              "B": "Because they are not focused on making a profit",
              "C": "Because they obtain less expensive products",
              "D": "Because they have lower overhead expenses"}, "D"),
            ("Why does the speaker mention grocery delivery?",
             {"A": "To illustrate how dark stores compete with traditional supermarkets",
              "B": "To compare delivery speeds in urban and nonurban environments",
              "C": "To suggest that dark stores mainly sell perishable items",
              "D": "To explain why consumers are willing to pay higher fees"}, "A"),
            ("What point does the speaker make about dark stores and employment?",
             {"A": "Many temporary employees are needed to set dark stores up.",
              "B": "Employees in dark stores need to be comfortable with technology.",
              "C": "Dark stores do not need many in-store workers.",
              "D": "Dark stores are able to pay their employees more."}, "C"),
        ]),
        (1, "Poverty Point", "Listen to a talk in an archaeology class. Then answer the questions.",
         "listening_02_poverty_point.mp3", [
            ("What is the main purpose of the lecture?",
             {"A": "To describe how trade networks developed among ancient societies in North America",
              "B": "To highlight an ancient site that required large-scale planning",
              "C": "To explain the role of metal tools in ancient construction",
              "D": "To compare different types of prehistoric earthen mounds"}, "B"),
            ("What aspect of the earthen mounds is most impressive to the speaker?",
             {"A": "Their extreme height", "B": "Their varying geometric shapes",
              "C": "The artifacts found inside them", "D": "The knowledge required to build them"}, "D"),
            ("What does the speaker emphasize about how the structures at Poverty Point were built?",
             {"A": "They required advanced knowledge of metal technology.",
              "B": "They depended on materials from distant regions.",
              "C": "They involved a large amount of manual effort.",
              "D": "They were completed in a short period of time."}, "C"),
            ("What does the speaker imply about the Mississippi River?",
             {"A": "It contained resources that were used for construction.",
              "B": "It was the main source of food for people at Poverty Point.",
              "C": "It connected people at Poverty Point to distant areas.",
              "D": "It enabled people from Poverty Point to relocate to other regions."}, "C"),
        ]),
        (1, "Egyptian Mummies", "Listen to a talk in an archaeology class. Then answer the questions.",
         "listening_03_egyptian_mummies.mp3", [
            ("What does the speaker mainly discuss?",
             {"A": "The differences between Egyptian and Scottish mummies",
              "B": "The discovery of prehistoric mummies in a surprising location",
              "C": "The processes that gradually turn mummies into skeletons",
              "D": "The reasons that Bronze Age people practiced mummification"}, "B"),
            ("What does the speaker imply about Scotland?",
             {"A": "Its climate is not favorable for typical methods of preserving bodies.",
              "B": "Its rainy weather makes archaeological research challenging.",
              "C": "Its oldest skeletons date back to around 4000 B.C.E.",
              "D": "It may have many Bronze Age sites similar to Cladh Hallan."}, "A"),
            ("According to the speaker, what did radiocarbon dating reveal?",
             {"A": "A pile of bones belonged to two different people.",
              "B": "A man and a woman had died around 1500 B.C.E.",
              "C": "Two objects that looked like skeletons were not made of bone.",
              "D": "Two people were buried long after they had died."}, "D"),
            ("Why does the speaker mention butter?",
             {"A": "To point out an animal fat frequently used to preserve bodies",
              "B": "To show that ancient people understood a property of peat bogs",
              "C": "To help illustrate how swamps break down organic material",
              "D": "To suggest an ingredient possibly used in a prehistoric burial ritual"}, "B"),
        ]),
        (1, "LEDs and Incandescent Light", "Listen to a talk in a physiology class. Then answer the questions.",
         "listening_04_leds_and_incandescent_light.mp3", [
            ("What is the talk mainly about?",
             {"A": "Research into the health benefits of a modern technology",
              "B": "The unintended consequences of a technological innovation",
              "C": "Differences between artificial lighting and natural sunlight",
              "D": "How different types of light are seen by the human eye"}, "B"),
            ("What benefit of LED bulbs does the speaker emphasize?",
             {"A": "Low cost of bulb production", "B": "Low energy use",
              "C": "Brightness", "D": "Stress reduction for humans"}, "B"),
            ("What comparison does the speaker make between the light from incandescent bulbs and the light from LEDs?",
             {"A": "Incandescent bulbs emit less near-infrared light.",
              "B": "Incandescent bulbs emit light from a broader range of the spectrum.",
              "C": "LEDs emit a steadier light that is not subject to flickering.",
              "D": "LEDs emit light that is more similar to natural sunlight."}, "B"),
            ("What is the professor's concern about the advanced LED systems that some experts like?",
             {"A": "They might have negative effects on mood.",
              "B": "They are unsuitable for use in medical settings.",
              "C": "Their high cost might prevent their widespread use.",
              "D": "They produce almost no near-infrared light."}, "C"),
        ]),
        (1, "Sleep and Cognitive Function", "Listen to a talk. Then answer the questions.",
         "listening_05_sleep_and_cognitive_function.mp3", [
            ("What is the main topic of the talk?",
             {"A": "The effects of caffeine on sleep", "B": "The different stages of deep sleep",
              "C": "Common sleep disorders and their treatments",
              "D": "The benefits of sleep for cognitive function"}, "D"),
            ("What does the speaker say about memory consolidation?",
             {"A": "It occurs mainly during deep sleep stages.",
              "B": "It affects problem-solving abilities.",
              "C": "It happens primarily in people with sleep disorders.",
              "D": "It allows the brain to process emotional experiences."}, "A"),
            ("Why does the speaker mention mood swings?",
             {"A": "To highlight common symptoms of stress",
              "B": "To point out the impact of sleep deprivation on emotional regulation",
              "C": "To explain the effects of sleep hygiene on problem-solving abilities",
              "D": "To illustrate the various stages of sleep"}, "B"),
            ("What advice does the speaker give for improving sleep quality?",
             {"A": "Avoid stressful experiences", "B": "Maintain a regular sleep schedule",
              "C": "Avoid all caffeine consumption", "D": "Spend more time in bed"}, "B"),
        ]),
        (1, "Keystone Species and Yellowstone Wolves", "Listen to a talk in a science podcast. Then answer the questions.",
         "listening_06_keystone_species_and_yellowstone_wolves.mp3", [
            ("Why does the speaker talk about arches in architecture?",
             {"A": "To point out a similarity to rock arches in nature",
              "B": "To help illustrate an important concept",
              "C": "To argue against a common comparison",
              "D": "To show a difference between life science and technology fields"}, "B"),
            ("According to the talk, what is a keystone species?",
             {"A": "A species that is necessary to maintain balance in an ecosystem",
              "B": "A species that has no predators within an ecosystem",
              "C": "A species that is too numerous for a healthy ecosystem",
              "D": "A species that is negatively affected by environmental changes"}, "A"),
            ("In the early 20th century, what happened to the wolves in Yellowstone National Park?",
             {"A": "Their population increased dramatically when their prey population increased.",
              "B": "They became a government-protected species.",
              "C": "They were eliminated over farming and safety concerns.",
              "D": "Their population decreased significantly because of disease."}, "C"),
            ("How did an increasing elk population affect the Yellowstone ecosystem?",
             {"A": "Many species were negatively affected due to the elk's diet.",
              "B": "Various animals that prey on elk were attracted to the area.",
              "C": "Some areas developed an overgrowth of plants while others had too little vegetation.",
              "D": "The population and range of the wolves also increased."}, "A"),
        ]),
        (1, "Pluto and New Horizons", "Listen to a talk on an astronomy podcast. Then answer the questions.",
         "listening_07_pluto_and_new_horizons.mp3", [
            ("Why does the speaker discuss the Kuiper Belt at the beginning of the talk?",
             {"A": "To explain why Pluto's status changed", "B": "To illustrate Pluto's size",
              "C": "To emphasize how far Pluto is from the Sun", "D": "To make a point about Pluto's shape"}, "A"),
            ("How did new data change scientists' understanding of Pluto?",
             {"A": "It has a longer orbit than previously thought.",
              "B": "It has a wider variety of features than previously thought.",
              "C": "It used to be larger in the past than previously thought.",
              "D": "It has larger amounts of rainfall than previously thought."}, "B"),
            ("What point does the speaker make about convection in Pluto's ice basin?",
             {"A": "It is making the surface of the ice basin grow larger.",
              "B": "It suggests that volcanoes exist on Pluto.",
              "C": "It continuously moves warmer ice to the basin's surface.",
              "D": "It creates strong winds that blow across Pluto's surface."}, "C"),
            ("According to the speaker, what could the presence of an ocean on Pluto mean?",
             {"A": "Pluto orbits closer to the Sun than expected.",
              "B": "A huge amount of salt exists throughout Pluto.",
              "C": "Objects in the Kuiper Belt could support life.",
              "D": "Pluto's ice might be melting."}, "C"),
        ]),
        (2, "Lois Mailou Jones", "Listen to a talk in an art history class. Then answer the questions.",
         "listening_08_lois_mailou_jones.mp3", [
            ("How did Lois Mailou Jones' parents support her artistic development?",
             {"A": "By providing the materials she needed", "B": "By paying for her travel to Paris",
              "C": "By teaching her how to paint", "D": "By taking her to museums"}, "A"),
            ("What does the speaker imply about Indian Shops?",
             {"A": "It depicts a street scene Jones often saw while studying in Paris.",
              "B": "It was influenced by Jones' early memories and her studies in Paris.",
              "C": "It is more geometric than most Impressionist paintings.",
              "D": "It showed how human-made structures negatively affect nature."}, "B"),
            ("How did Jones' style change later in her career?",
             {"A": "Her artworks became more focused on nature.",
              "B": "Her artworks began to depict more human-made structures.",
              "C": "Her artworks began to include a wider variety of colors.",
              "D": "Her artworks became more abstract."}, "D"),
            ("What point does the speaker make about Moon Masque?",
             {"A": "It was more realistic than Jones' earlier work.",
              "B": "It was one of Jones' last artistic creations.",
              "C": "It showed Jones' powerful connection to African art.",
              "D": "It included an object that Jones had brought from Paris."}, "C"),
        ]),
        (2, "Stained Glass", "Listen to a talk in an art history class. Then answer the questions.",
         "listening_09_stained_glass.mp3", [
            ("Why does the speaker mention churches?",
             {"A": "To explain how a traditional technique of making stained glass was developed",
              "B": "To emphasize the religious significance of stained glass",
              "C": "To illustrate an effect of stained glass on large spaces",
              "D": "To point out a use of stained glass that he expects listeners to be familiar with"}, "D"),
            ("Why does the speaker mention the Arts and Crafts movement?",
             {"A": "To identify the inspiration for Louis Comfort Tiffany's stained glass designs",
              "B": "To emphasize the natural beauty of stained glass",
              "C": "To describe the origins of the copper foil technique for making stained glass",
              "D": "To explain how stained glass became popular in homes"}, "D"),
            ("According to the professor, what was a disadvantage of using stained glass in homes?",
             {"A": "It required frequent maintenance.", "B": "It was expensive to produce.",
              "C": "It resulted in a loss of heat.", "D": "It could break easily during transportation."}, "C"),
            ("What does the speaker indicate about the methods of creating stained glass?",
             {"A": "They have changed greatly over time.", "B": "They tend to yield consistent results.",
              "C": "They depend on the desired color.", "D": "They often include both lead and copper."}, "A"),
        ]),
        (2, "Environmentally Friendly Building Materials", "Listen to a talk in an architecture class. Then answer the questions.",
         "listening_10_environmentally_friendly_building_materials.mp3", [
            ("What is the main topic of the talk?",
             {"A": "The renewed use of an old construction material",
              "B": "Recent advances in sustainable building materials",
              "C": "The challenges faced by ancient adobe brick builders",
              "D": "Modern alternatives to adobe bricks"}, "A"),
            ("What does the speaker say about a new building in Amsterdam?",
             {"A": "It was inspired by adobe construction.",
              "B": "It is made from very common natural materials.",
              "C": "It removes carbon from the atmosphere.",
              "D": "It involves technology that improves insulation."}, "C"),
            ("What point does the speaker make about conditions in places in the southwestern United States?",
             {"A": "Major changes in temperature occur there.",
              "B": "Air there has recently become polluted.",
              "C": "Not all materials for adobe production are available there.",
              "D": "More clay for construction is available there than in other places."}, "A"),
            ("What does the speaker emphasize about transportation for construction projects?",
             {"A": "Calculating its costs takes a long time.",
              "B": "It requires special technology when concrete is used.",
              "C": "The need for it depends mostly on the location of the project.",
              "D": "Using adobe bricks helps reduce the need for it."}, "D"),
        ]),
        (2, "Solar Power", "Listen to a talk on a science podcast. Then answer the questions.",
         "listening_11_solar_power.mp3", [
            ("How does the speaker organize the talk on solar power?",
             {"A": "She outlines solar power's history as an alternative energy resource.",
              "B": "She lists the technologies involved in generating solar energy.",
              "C": "She offers case studies of successful solar power projects.",
              "D": "She compares and contrasts the benefits and challenges of solar power."}, "D"),
            ("Why does the speaker mention photovoltaic cells?",
             {"A": "To describe how solar panels convert solar energy into electricity",
              "B": "To discuss innovations in the storage of solar energy",
              "C": "To explain the cost of installing solar electric systems",
              "D": "To explain the difficulty and expense of recycling solar panels"}, "A"),
            ("Why does the speaker note that all industries produce some carbon dioxide?",
             {"A": "To provide context for a discussion of the solar industry's low carbon footprint",
              "B": "To suggest that there are reasons for skepticism of the solar industry",
              "C": "To introduce a discussion about the harmful pollutants given off by solar panels",
              "D": "To support the claim that solar power provides energy to underserved areas"}, "A"),
            ("According to the speaker, what is causing a rapid increase in waste from used solar panels?",
             {"A": "Solar panels produced in the last decade cannot be recycled.",
              "B": "Solar panels in regions with heavy cloud cover are scrapped due to disuse.",
              "C": "Improvements in panel efficiency are leading to frequent replacement.",
              "D": "Overuse of solar power is overwhelming panel-recycling systems."}, "C"),
        ]),
        (2, "Leonardo da Vinci's Mechanical Knight", "Listen to a talk in an art history class. Then answer the questions.",
         "listening_12_leonardo_da_vinci_mechanical_knight.mp3", [
            ("What is the main purpose of the lecture?",
             {"A": "To review Leonardo da Vinci's most famous artistic works",
              "B": "To explain how early machines led to modern robotics",
              "C": "To highlight a lesser-known achievement of Leonardo da Vinci",
              "D": "To describe technological advances during the Renaissance"}, "C"),
            ("Why does the speaker mention Leonardo's fascination with the human body?",
             {"A": "To indicate his contributions to medical science",
              "B": "To point out a key influence on Leonardo's designs",
              "C": "To explain why he spent more time studying anatomy than engineering",
              "D": "To emphasize Leonardo's artistic skills"}, "B"),
            ("What does the speaker suggest about Leonardo's mechanical understanding?",
             {"A": "It depended on help from other scientists.",
              "B": "It was shown only in his sketches.",
              "C": "It was advanced for his time.",
              "D": "It relied mainly on trial and error."}, "C"),
            ('What attitude does the speaker express toward the reconstruction of "Leonardo\'s Robot"?',
             {"A": "He is relieved that some design flaws were corrected.",
              "B": "He is happy that Leonardo's sketches were published.",
              "C": "He is doubtful of the artistic value of the robot.",
              "D": "He is impressed by what the robot could do."}, "D"),
        ]),
        (2, "Documentary and Ethnographic Films", "Listen to a talk in a film class. Then answer the questions.",
         "listening_13_documentary_and_ethnographic_films.mp3", [
            ("What is the main purpose of the talk?",
             {"A": "To introduce a new style of documentary",
              "B": "To outline the process of making a film",
              "C": "To compare two significant documentaries",
              "D": "To contrast two kinds of nonfiction films"}, "D"),
            ("What attitude does the speaker express when she discusses documentaries?",
             {"A": "She is pleased that documentaries inspire viewers to travel to unfamiliar places.",
              "B": "She is disappointed that documentaries are becoming less popular.",
              "C": "She is concerned that viewers are too trusting of documentaries.",
              "D": "She is frustrated that many documentaries try to tell complicated and confusing stories."}, "C"),
            ("Why does the speaker mention Forest of Bliss?",
             {"A": "To give an example of film with elaborate production",
              "B": "To give an example of an ethnographic film",
              "C": "To illustrate the popularity of films about nature",
              "D": "To illustrate the importance of directors in filmmaking"}, "B"),
            ("According to the speaker, how might researchers prepare to make ethnographic films?",
             {"A": "By coming up with a dramatic story they want to tell",
              "B": "By learning the filming techniques of the culture they are studying",
              "C": "By spending a long time living within a particular culture",
              "D": "By analyzing news footage about a particular culture"}, "C"),
        ]),
    ]
    tasks, n = [], 1
    for module, title, instruction, fname, qs in talks:
        items = []
        for stem, options, answer in qs:
            items.append(q(n, stem, options, answer))
            n += 1
        tasks.append(lecture(title, module, instruction, fname, items))
    return {
        "id": "2025-09-23",
        "title": "新托福 9.23 国内线下 · 听力",
        "set": "9.23",
        "skill": "listening",
        "modules": [
            {"n": 1, "timeSec": 1500, "from": 1, "to": 28},
            {"n": 2, "timeSec": 1200, "from": 29, "to": 52},
        ],
        "tasks": tasks,
    }


def build_writing():
    tasks = [
        email(1, "You recently attended a technology conference where you met Mr. Smith, a prominent industry expert. You found his presentation helpful and informative. You want to thank Mr. Smith for his presentation and request additional information on a topic he discussed.",
              ["Mention what you found useful about his presentation.",
               "Request additional information about one of the topics he discussed.",
               "Express your appreciation for his time and insights."],
              "Mr. Smith", "Your Presentation",
              "Dear Mr. Smith,\n\nThank you for your presentation at the technology conference. I found your explanation of how teams can evaluate new tools before adopting them especially useful. The comparison among a limited pilot, a full launch, and a review stage gave me a practical framework for separating genuine value from excitement about a new product.\n\nI would appreciate additional information about the data-governance checklist you briefly mentioned. In particular, how should a small organization decide which data are necessary for a pilot, who should be allowed to access them, and when they should be deleted? If you have an article, sample checklist, or case example suitable for a student, I would be grateful if you could recommend it.\n\nI know your time is valuable, and I appreciate the clarity and balance of your insights. The presentation gave me several questions I can apply to my own research rather than simply accepting technology as automatically beneficial.\n\nSincerely,\n[Your Name]"),
        email(2, "Your classmate Emma recently hosted a charity event on campus to raise funds for a local animal shelter. The event was successful overall, but there were some issues with the catering service, including delayed food delivery and incorrect orders. You need to address these concerns to the catering manager, Ms. Johnson.",
              ["Thank her for the service provided.",
               "Describe the issues that occurred during the event.",
               "Suggest how these issues could be resolved in future events."],
              "Ms. Johnson", "Catering service issues",
              "Dear Ms. Johnson,\n\nThank you for providing the catering for our campus charity event. The serving staff were courteous, and the food that arrived was well presented. We appreciate the work your team did during a busy event.\n\nHowever, the delivery arrived almost forty minutes after the agreed setup time, so guests were waiting when the event began. In addition, several vegetarian meals were replaced with chicken dishes, and the labels on two trays did not match their contents. Volunteers had to check individual orders and find emergency alternatives, which interrupted registration.\n\nFor future events, it would help to confirm the final order and dietary categories in writing the day before delivery. Each tray could be labeled at the kitchen and checked against a numbered list before the driver leaves. A contact number for the delivery team would also let organizers report a delay early and adjust the schedule.\n\nThank you for considering these suggestions.\n\nKind regards,\n[Your Name]"),
        email(3, "You recently attended a guest lecture on environmental sustainability at your university. You found the lecture highly informative and would like to ask the speaker, Dr. Roberts, for recommendations on further reading materials and resources. You also want to express your appreciation for the lecture.",
              ["Mention what you found informative about the lecture.",
               "Ask for recommendations on further reading materials and resources on environmental sustainability.",
               "Suggest that you meet to discuss the topic further."],
              "Dr. Roberts", "Request for Further Reading on Environmental Sustainability",
              "Dear Dr. Roberts,\n\nThank you for your guest lecture on environmental sustainability. Your explanation of how everyday choices affect resource use helped me connect a broad environmental issue with decisions I can actually make. I particularly appreciated the practical examples, which made the topic easier to understand without requiring much prior knowledge.\n\nI would like to explore this subject further. Could you recommend an introductory book or a reliable website that explains how to compare the environmental effects of different products? A resource with examples or suggested activities would be especially useful.\n\nIf your schedule permits, could we arrange a brief meeting to discuss what I read and ask a few follow-up questions? I would be happy to meet at a time convenient for you.\n\nBest regards,\n[Your Name]"),
        email(4, "You are organizing a charity event at your university to raise funds for a local animal shelter. You need volunteers to help with various tasks. You know that your friend, Emma, has experience in organizing events and would be a great help.",
              ["Describe the charity event and explain the type of support you need.",
               "Ask her if she would be willing to volunteer and specify the tasks she could assist with.",
               "Explain how her help would benefit human members of the community as well as animals."],
              "Emma", "Request for volunteering at charity event",
              "Hi Emma,\n\nI'm organizing a campus charity event to raise money for our local animal shelter, and I'd love your help. We need volunteers to welcome visitors, explain the purpose of the fundraiser, and keep the activities running smoothly. Your experience organizing events would be particularly valuable.\n\nWould you be willing to join us? You could help plan the volunteer assignments and show newcomers where they are needed. If you prefer a smaller role, greeting visitors would also make a real difference.\n\nThe money we collect could help the shelter provide food and care for animals. The event would also give students and neighbors a chance to meet and contribute to a shared cause. Please let me know what responsibilities would suit you, and we can discuss the arrangements together.\n\nThanks,\n[Your Name]"),
        email(5, "You are having a scheduling conflict with your chemistry laboratory. There are many laboratory sessions, but the one you are assigned to meets on Wednesday afternoons. Unfortunately, your favorite student club's weekly meeting is also on Wednesdays. You need to ask your chemistry professor, Dr. Nguyen, for a schedule change.",
              ["Explain the scheduling conflict you are having.",
               "Explain why the student club meetings are so important to you.",
               "Request a schedule change for your chemistry laboratory session."],
              "Dr. Nguyen", "Request for chemistry laboratory change",
              "Dear Dr. Nguyen,\n\nI am writing to ask whether I could move to a different chemistry laboratory session. My assigned laboratory meets on Wednesday afternoons, which overlaps with the weekly meeting of my favorite student club. Attending one currently means missing the other.\n\nThe club is important to me because its meetings give me regular opportunities to work with other students on shared projects. Participating has also helped me feel more connected to campus life, and I would like to continue contributing without neglecting my coursework.\n\nWould it be possible to transfer to another laboratory section with an available place? I can review the alternative times and choose one that fits my other classes. I understand that space may be limited and will keep attending my assigned session unless a change is approved.\n\nThank you for considering my request.\n\nBest regards,\n[Your Name]"),
        email(6, "You received stationery ordered from an online store, but there is a problem with the products.",
              ["Describe the problem with the products.", "Propose a solution.", "Give feedback on your online shopping experience."],
              "Customer Service", "Problem with stationery order",
              "Dear Customer Service Team,\n\nI am contacting you about a problem with the stationery I recently ordered from your store. Several pens do not write consistently, making them difficult to use for taking notes. I expected the items to be ready for normal use when they arrived.\n\nCould you please arrange replacements for the defective pens? If replacements are unavailable, I would appreciate a refund for those items instead. Please let me know whether you need photographs or would like me to return them before processing the request.\n\nThe ordering process was straightforward, but receiving unusable products has made the overall experience disappointing. Checking the items before dispatch would help prevent similar problems for other customers. I hope we can resolve this and restore my confidence in ordering from your store.\n\nKind regards,\n[Your Name]"),
        email(7, "You recently attended a seminar about finding a job after graduation. Write an email to the instructor. In your email, thank the instructor for the seminar and ask for the materials used during the session.",
              ["Thank the instructor for the seminar.", "Ask for the materials used during the session."],
              "Seminar Instructor", "Request for career seminar materials",
              "Dear Professor,\n\nThank you for leading the recent seminar on finding a job after graduation. Your discussion of how to approach the search gave me a clearer way to organize my next steps. I appreciated having the chance to think about the process before I need to make decisions under pressure.\n\nCould you please share the materials you used during the seminar, if they are available to students? I would especially like to review the presentation or any recommended resources so I can check my notes and put the advice into practice. If the materials are already posted on a course page, a link would be very helpful.\n\nThank you again for your time and for sharing your experience with us.\n\nBest regards,\n[Your Name]"),
        disc(8, "Psychology",
             person("Professor Diaz", "diaz.png", "We've been talking about the role of emotional intelligence in personal and professional settings. Emotional intelligence involves the ability to recognize, understand, and manage our own emotions and the emotions of others. Do you think emotional intelligence is more important than technical skills in the workplace? Why or why not?"),
             [person("Andrew", "andrew.png", "I think emotional intelligence is more important than technical skills in the workplace. Being able to communicate effectively, manage stress, and work well in teams can lead to better collaboration and a healthier work environment."),
              person("Paul", "kelly.png", "In my opinion, technical skills are more important in the workplace. Without the necessary technical expertise, employees wouldn't be able to perform their tasks efficiently. Emotional intelligence is valuable, but technical skills are essential for job performance.")],
             [{"title": "Coordinate Expertise", "text": "Emotional intelligence is often more important than technical skill because workplace results depend on how expertise is coordinated among people. A highly capable employee who reacts defensively to feedback, ignores tension, or communicates without considering the audience can slow an entire team. By contrast, someone who recognizes frustration early can ask a clarifying question, separate criticism of an idea from criticism of a person, and keep a disagreement focused on the task. Those abilities protect the flow of information on which technical decisions rely. Emotional intelligence is also crucial in uncertain situations, when no procedure gives a complete answer and employees must negotiate priorities or explain risk. Technical knowledge remains necessary, and no amount of empathy can replace a required professional competence. Yet skills can often be taught through courses or practice, while a workplace that lacks trust prevents existing knowledge from being shared effectively."},
              {"title": "Competence First", "text": "Technical skills are more important because they define whether an employee can produce accurate work in the first place. In engineering, accounting, health care, or software, a friendly colleague who lacks the required knowledge may make errors that other people cannot simply communicate away. Expertise also gives teamwork substance. A specialist can explain trade-offs, identify an unrealistic proposal, and offer a workable alternative because that person understands the task deeply. Emotional intelligence improves how this knowledge is shared, but it cannot create correct analysis. Organizations should therefore establish technical competence as the entry requirement and then develop communication, self-awareness, and conflict management through feedback and training. When a choice must be made, technical skill is the foundation: without it, cooperation may be pleasant while the actual product remains unreliable."}]),
        disc(9, "Sociology",
             person("Professor Diaz", "diaz.png", "This week we are exploring the concept of social norms and their influence on behavior. Social norms are unwritten rules that dictate how individuals should act. For example, norms can include dressing appropriately for different occasions or greeting others politely. Some sociologists argue that social norms help maintain order and predictability, while others believe they can restrict personal freedom and creativity. Are the effects of social norms mostly positive, or are they mostly negative? Explain your views."),
             [person("Kelly", "kelly.png", "I believe social norms help maintain order and predictability. They provide guidelines for acceptable behavior, which can make it easier for people to understand what is expected of them in various social situations. These expectations are helpful to guide interactions that are at times unclear."),
              person("Paul", "andrew.png", "I, personally, believe that social norms can sometimes restrict personal freedom as well as creativity. They often pressure individuals to conform to what the majority thinks is appropriate behavior. Breaking free from these norms can help people to express themselves more easily.")],
             [{"title": "Useful Structure", "text": "Social norms are mostly positive because they reduce the number of decisions and negotiations required for ordinary cooperation. People can enter a classroom, public line, shared kitchen, or conversation with some expectation about turn-taking, noise, and respect for space. This predictability allows attention to move from basic coordination to the actual purpose of the activity. Norms can also express care before a formal rule is needed. Lowering one's voice near someone who is resting or acknowledging a new participant helps a group function without enforcement. The danger is that unwritten expectations can become rigid or exclude people who do not know them. Healthy communities should therefore make important norms explainable, allow respectful questions, and revise practices that impose unequal burdens without a clear benefit."},
              {"title": "Pressure to Conform", "text": "Social norms are often more harmful because their unwritten nature makes pressure difficult to challenge. A person who rejects a formal rule can point to its wording, but someone who dresses, speaks, or chooses a career differently may face ridicule without any standard that can be debated. Norms are especially restrictive when one group's habits are presented as neutral behavior for everyone. People then spend energy hiding accents, interests, family roles, or creative styles in order to appear acceptable. This conformity reduces experimentation, and society loses alternatives that might improve existing practices. Basic expectations against direct harm are useful, yet they should be expressed as clear principles rather than broad demands to seem normal. When acceptance depends on resemblance instead of conduct, social order comes at the cost of authenticity and fair participation."}]),
        disc(10, "Education",
             person("Professor Gupta", "diaz.png", "Some educators believe traditional lectures are the most effective learning method because instructors can present information in a structured way. Others advocate interactive approaches such as group discussions, peer teaching, and hands-on activities. Which method is more effective for student learning, and why?"),
             [person("Kelly", "kelly.png", "Interactive approaches actively engage students. Small-group work can make difficult concepts easier to understand and remember while helping students take responsibility for learning."),
              person("Andrew", "andrew.png", "Traditional lectures provide a structured presentation by experts and ensure that all students receive the same knowledge, especially in complex subjects requiring detailed explanations.")],
             [{"title": "Practice Beats Coverage", "text": "Interactive methods are more effective for lasting learning because they force students to use an idea before they have fully mastered it. When a group has to explain a concept, choose an example, or solve a problem together, gaps become visible immediately. A student who only heard a lecture may recognize a definition later without being able to apply it. Kelly is right that small-group work also builds responsibility: each person has to contribute rather than wait for the instructor to finish. Lectures still matter for introducing a framework, but they should be short enough to leave time for practice. I would use a brief explanation, then ask students to apply the idea and report what was confusing. That sequence keeps Andrew's concern about shared knowledge while making sure the knowledge can actually be used."},
              {"title": "Shared Foundation First", "text": "A structured lecture is more effective when students need a shared foundation before they can discuss anything useful. In a complex subject, an expert can present the sequence of ideas, warn against common mistakes, and keep the class from spending time on inaccurate guesses. Andrew's point is practical: if each group invents its own explanation, later work becomes harder to compare. Interactive activities can still follow a lecture, but they work better after students have heard the same account of the material. Kelly is right that engagement matters, yet engagement with an incomplete idea can produce confidence without accuracy. I would keep lectures for the first pass through a difficult topic and reserve discussion for checking understanding. That order protects both coverage and participation."}]),
        disc(11, "Business Ethics",
             person("Professor Diaz", "diaz.png", "This week, we are discussing how companies should balance competing business priorities when making strategic decisions. Some business leaders believe that companies should prioritize long-term growth by investing heavily in employee training and development programs, even when these investments reduce short-term profits. Others believe that companies should prioritize keeping their product prices as low as possible by minimizing training expenses and other operational costs. What approach do you think leads to better long-term business success?"),
             [person("Paul", "andrew.png", "Companies should prioritize long-term growth through substantial investments in employee training and development programs, even when they reduce short-term profits temporarily. When businesses provide comprehensive skill development, professional certifications, and career advancement opportunities, they create more productive workforces, reduce expensive employee turnover, and build institutional knowledge that gives them competitive advantages over companies with less skilled workers in the marketplace."),
              person("Kelly", "kelly.png", "I think companies should keep their product prices as low as possible by minimizing training expenses and other operational costs. When companies reduce spending on training programs, they can offer customers better prices than competitors, which generates higher sales volumes. Low prices help businesses gain new customers and keep existing customers from switching to other companies.")],
             [{"title": "Train for Retention", "text": "Investing in employee training leads to better long-term success because a company cannot keep offering a cheap product if it cannot keep the people who know how to make it. Paul is right that turnover is expensive: each departure takes away knowledge that new staff must learn again, often while customers wait. Training also makes later decisions cheaper. A team that understands the product can fix a problem without hiring outside help or repeating the same mistake. Kelly's concern about price is real, but a low price that depends on undertrained staff often produces delays, errors, and refunds that erase the savings. I would treat training as a way to protect both quality and cost over several years, not as an optional extra after prices have been cut. Customers stay when the product remains reliable, not only when it is briefly cheaper."},
              {"title": "Price Keeps Demand", "text": "Keeping prices low can be the stronger long-term strategy when customers can easily switch to another supplier. Kelly's point is that training costs are recovered only if people stay and if the extra skill actually improves the product they buy. In a market where buyers compare price first, a company that spends heavily on programs may lose the sales that would have paid for those programs. Paul is right that skilled workers matter, but not every role needs a certification before the company can operate. Targeted on-the-job training for the tasks that cause errors can protect quality without a large formal budget. I would cut spending that does not change what customers receive, keep essential instruction, and use the savings to remain competitive. A company that loses its customers while building an impressive training catalog has not succeeded in the long term."}]),
        disc(12, "Business Management",
             person("Professor Achebe", "diaz.png", "This week we have been discussing strategies to promote workplace productivity and employee performance. One particularly controversial topic that has emerged is multitasking. While some argue that the ability to juggle multiple tasks at once is essential in today's fast-paced work environments, others believe that multitasking actually reduces efficiency and increases the likelihood of errors. Do you believe that managers should promote multitasking in the workplace? Why or why not?"),
             [person("Paul", "andrew.png", "I think managers should promote multitasking. It helps employees handle routine tasks simultaneously and mirrors real-world demands. Even outside of the office, who has the luxury of focusing only on one task? With the right tools and training, multitasking can improve time management and adaptability—key traits in today's dynamic workplaces."),
              person("Kelly", "kelly.png", "I oppose multitasking in the workplace. It increases the chance of mistakes and leads to mental fatigue. For example, when employees answer emails during meetings, they often miss key details or misinterpret information. Deep, focused work is more effective for quality outcomes and long-term employee well-being.")],
             [{"title": "Protect Focused Work", "text": "Managers should not promote multitasking as a general habit because most demanding work suffers when attention is split. Kelly's example of answering email during a meeting is familiar: the person appears busy, yet later has to ask for information that was already explained. That wasted time is the opposite of productivity. Routine tasks can be batched, but a report, a calculation, or a conversation with a client usually needs an uninterrupted stretch. Paul is right that workplaces are busy, yet busyness is not the same as finishing accurate work. A manager can still expect people to handle several responsibilities across a day. The useful instruction is to finish one demanding task, then switch, rather than keep several half-done. Protecting focus also reduces fatigue, which makes later work faster instead of slower."},
              {"title": "Train Switching", "text": "Managers should promote a limited form of multitasking because many jobs already require people to respond to more than one demand. A receptionist, a nurse, or a project coordinator cannot pretend that only one person will need help at a time. Paul's point about real-world conditions is therefore practical. The mistake is to treat every role as if it were writing a research paper. What managers should teach is how to switch cleanly: finish a sentence, write down the next step, then take the interruption. Tools that gather messages into set times also help. Kelly is right that answering mail during a meeting is a poor example, so I would ban that specific habit while still expecting staff to manage overlapping routine tasks. Promoted this way, multitasking means organized switching, not constant distraction."}]),
        disc(13, "Literature",
             person("Dr. Gupta", "diaz.png", "We've been discussing the role of literature in shaping societal values. Literature, which includes plays, poetry, and novels, can reflect and influence the beliefs and behaviors of society. Some argue that literature is a powerful tool that can be used to inspire positive social change. But critics believe that literature's impact is limited compared to other forms of media. Do you think literature plays a significant role in shaping societal values? Why or why not?"),
             [person("Kelly", "kelly.png", "Literature plays a significant role in shaping societal values because it gives people a unique opportunity to perceive and think about the feelings of others. Through storytelling, it can inspire empathy and provoke critical thinking about social issues. Books have historically influenced movements and brought awareness to important causes."),
              person("Andrew", "andrew.png", "While literature has some impact, other forms of media like television and social media are more influential in shaping societal values today. These platforms reach a broader audience and can quickly spread ideas and trends. Most people prefer these newer forms of media because they are less challenging than literary works are.")],
             [{"title": "Slow Influence Matters", "text": "Literature still shapes values because it asks a reader to stay with another person's situation longer than a short video usually allows. Kelly is right that a novel or play can make an injustice feel specific rather than abstract. A reader who follows a character through a decision has time to notice motives, costs, and contradictions. That kind of attention can change what someone considers fair, even if the change is quiet. Andrew is correct that television and social media reach more people more quickly. Speed, however, is not the same as lasting influence. A clip can spread a slogan; a book can leave a reader with a question that returns later. Literature's smaller audience does not make it insignificant. It remains one of the few common ways people practice imagining lives they have not lived, which is part of how values are formed."},
              {"title": "Reach Comes First", "text": "Literature has less power to shape values today than faster media do, mainly because fewer people spend time with it. Andrew's point about reach is decisive: a television series or a widely shared post can set the terms of a public argument before a novel is even discussed in a classroom. People form opinions from the stories they actually encounter, and those stories are now more often short, visual, and repeated. Kelly is right that literature can build empathy, but that benefit is limited to readers who already choose demanding texts. For most of society, values are now rehearsed in comments, clips, and news. Literature can still matter for students and for later writers who borrow its ideas, yet that is an indirect path. If the question is what currently shapes ordinary beliefs, newer media are the stronger force."}]),
    ]
    return {
        "id": "2025-09-23",
        "title": "新托福 9.23 国内线下 · 写作",
        "set": "9.23",
        "skill": "writing",
        "modules": [
            {"n": 1, "timeSec": 2940, "from": 1, "to": 7, "label": "Email"},
            {"n": 2, "timeSec": 3600, "from": 8, "to": 13, "label": "Academic Discussion"},
        ],
        "tasks": tasks,
    }


REPEATS = [
    ("fitness_center", "You are working at your university's fitness center. Your manager is training you to assist customers at the center. Listen to the manager and repeat what the manager says. Repeat only once.", [
        "Cardio machines and bikes are over here.",
        "The weight room provides dumbbells and benches.",
        "Our yoga studio offers classes for all fitness levels.",
        "Locker rooms contain storage bins and changing facilities.",
        "Enjoy the juice bar and sample nutritious drinks and snacks.",
        "Personal trainers are available for individual guidance.",
        "Before you leave, check the gym floor plan for specific areas and equipment.",
    ]),
    ("bookstore_assistance", "You are working at your university's bookstore. Your supervisor is training you to assist customers in the bookstore. Listen to the supervisor and repeat what the supervisor says. Repeat only once.", [
        "All our books are located on these shelves.",
        "Bring your purchases to the cash register.",
        "Use the inventory to search for available items.",
        "Our staff provides a monthly list of recommendations.",
        "Information about membership benefits is displayed here.",
        "We have many interesting store events that we recommend you attend.",
        "We value customer feedback, so please consider leaving a store review.",
    ]),
    ("birdwatching", "You are volunteering at a community nature center near campus. The leader is training you to help beginners learn the basics of birdwatching. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "Look towards the treetops where you can find nests.",
        "Note details to help identify the bird.",
        "Keep a record of each sighting to share later with the group.",
        "Use proper footwear to keep from slipping while exploring outdoors.",
        "Keep your head covered to protect yourself from the sun on the walk.",
        "When getting ready for a day out be sure to pack essentials to be prepared.",
        "If you spot a bird nearby, avoid sudden movements so it does not fly away.",
    ]),
    ("library_facilities", "You are working in the University Library. Your manager is teaching you how to assist visitors at the library. Listen to the manager and repeat what the manager says. Repeat only once.", [
        "The library books are located here.",
        "Study rooms can be reserved for group work.",
        "Our computer lab has workstations with internet access.",
        "Seek help at the reference desk for any research assistance.",
        "Find tasty refreshments and healthy snacks at the basement cafe.",
        "For your convenience, we have a map with a list of sections and resources.",
        "If you have general or specific questions, our staff are here to meet your needs.",
    ]),
    ("woodworking", "You are an art student assisting your professor in a community woodworking class. Your professor is training you to show others how to complete simple woodworking steps. Listen to the instructor and repeat what the instructor says. Repeat only once.", [
        "Measure carefully to avoid mistakes.",
        "Draw a line with a pencil before cutting.",
        "Hammer the nails gently so the wood does not split apart.",
        "Hold your work firmly in place to avoid accidents while cutting.",
        "Sand the surface evenly until the board feels smooth to the touch.",
        "When drilling into the wood, keep the tool straight so the hole remains neat and smooth.",
        "When sawing or using heavy equipment, wear safety glasses for protection.",
    ]),
    ("baking_bread", "You are volunteering at a community cooking class near campus. The instructor is showing you how to guide beginners in baking a loaf of bread. Listen to the instructor and repeat what the instructor says. Repeat only once.", [
        "Measure carefully before starting to mix.",
        "Add yeast to a small amount of warm water.",
        "Stir the wet and dry ingredients into a soft dough.",
        "Press and fold repeatedly until the texture feels elastic.",
        "Let the dough rest in a warm place until it doubles in size.",
        "After the loaf rises, bake until the top is browned and the center is firm.",
        "When the bread is done, place it on a raised stand so airflow beneath can cool it down.",
    ]),
]

INTERVIEWS = [
    ("spending_and_budgeting", "You have signed up for a study run by a university research group that is investigating spending habits and budgeting. You will have a short video interview with one of the researchers. The researcher will ask you some questions.", [
        ("Thank you for participating in this study. Today, I'd like to ask you some questions about your spending habits. First, can you tell me about a recent purchase you or someone in your family made and why you decided to buy it?",
         "Recently, my family purchased a high-efficiency air purifier for our living room. We decided to buy it because my younger brother has seasonal allergies, and indoor air quality was affecting his symptoms. After researching online and reading reviews, we chose a model with HEPA filters and smart sensors. This purchase was motivated by health concerns and a desire to create a more comfortable home environment. It fit our budget because we saved for it over a few months, prioritizing well-being over other nonessential purchases."),
        ("I see, when you make a purchase do you usually plan ahead or do you buy things spontaneously? Why?",
         "When it comes to making purchases, I generally plan ahead rather than buying things spontaneously. I value financial responsibility and want my spending to align with longer-term goals. By planning, I can set a budget, research options, and avoid impulse buys that might lead to regret. For example, before buying electronics or booking travel, I compare prices and read reviews. This approach helps me save money and feel more satisfied with the purchase afterward."),
        ("Interesting. Some people believe that creating a monthly or weekly budget is essential for managing finances effectively. When budgeting your time or money for your next purchase, which is more important, quality for the money or spending less overall, why?",
         "I believe quality for the money is more important when budgeting for a purchase. If I am buying a laptop for school, a cheaper model might save money at first, but a more durable one with better performance will serve me for years and reduce replacements. Focusing only on the lowest price can lead to repairs or dissatisfaction, which wastes both time and money. Investing in quality supports smarter financial management over time."),
        ("Good points. For my final question, I'd like to ask about using apps or online tools for managing spending habits. Do you think people will increasingly rely on financial apps and tools to manage their money? Or will people prefer to hire personal financial managers? Explain your thoughts.",
         "I believe people will increasingly rely on financial apps and tools rather than hiring personal financial managers. Apps offer real-time tracking, automated budgeting, and personalized insights at a low cost, which makes everyday management more efficient. As the tools become more sophisticated, they can replace many routine services that used to require an appointment. That shift reflects a broader move toward self-service in personal finance, while a manager would still make sense mainly for unusually complex situations."),
    ]),
    ("public_parks_and_recreation", "You have signed up for a study run by a university research group that is investigating public parks and recreation. You will have a short video interview with one of the researchers. The researcher will ask you some questions.", [
        ("Thank you for participating in this study. Today, I'd like to ask you some questions about public parks and recreational spaces. First, can you tell me about a memorable visit you or a friend made to a park or recreational space? What made it so memorable?",
         "A memorable visit was a spring afternoon I spent at a lakeside park with two friends. We followed a wooded trail, rented bicycles, and then ate a simple picnic near the water. The visit was special because of the open space, mild weather, and unhurried conversation, not any expensive attraction. We had all been busy with exams, so the park gave us room to recover without planning a complicated trip."),
        ("I see. Do you think public parks and recreational spaces are more important for adults or for children? Why?",
         "If I had to choose, I would say they are more important for children. Parks provide space for active play, exploration, and informal social learning. A playground lets children meet others outside class and practice sharing or solving small disagreements. Adults benefit from green space too, but they usually have more control over where they exercise or relax. Many children depend on nearby public facilities because their families may not have private yards."),
        ("Interesting. Some people believe that public parks play a crucial role in promoting community health and well-being by offering outdoor areas for relaxing, exercising, or playing. Therefore, local government should spend more money on such places. What are your thoughts on this? Do you agree or disagree? Why?",
         "I agree, provided that the money supports both maintenance and fair access. A neglected park with broken lights or unsafe paths will not improve public health. Local governments should repair existing facilities, add shade and walking routes, and make sure lower-income neighborhoods are not overlooked. These investments serve many residents at once and provide free opportunities for exercise and rest."),
        ("Finally, in many large cities, there is a tension between building more public parks for residents to relax and play versus using the space to build more housing. Do you think the need for more housing is less important than the need for public parks and recreational spaces? Why?",
         "I would not say housing is less important than parks, especially where people struggle to find a suitable place to live. Housing is needed every day, so a serious shortage deserves attention. However, not every available site should become a building. A dense neighborhood still needs places where people can spend time outdoors. I would support adding housing while protecting a reasonable amount of shared green space nearby."),
    ]),
    ("environmental_practices", "You are participating in a research study conducted by your university's Department of Environmental Science about environmental practices. You will meet online with a researcher who will ask you some questions.", [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about your environmental practices. First, do you take any specific actions to reduce your environmental impact, such as recycling or conserving energy? Give details in your answer.",
         "I recycle paper, plastic, and glass at home, using separate bins so the materials can be sorted. I also conserve energy by turning off lights and unplugging devices when they are not in use, and I switched to LED bulbs in my apartment. I carry a reusable water bottle and shopping bag to avoid single-use plastics. These are small daily actions, but they are realistic because they do not require giving up convenience."),
        ("Thank you. Can you describe one or two steps your community or neighborhood takes to be environmentally friendly? For example, are there solar panels on buildings or rainwater barrels available where you live?",
         "Many residential buildings in my community have solar panels on the rooftops, which reduces reliance on non-renewable energy. The neighborhood association also encourages residents to use rainwater barrels for gardening. Those steps lower the local footprint and make the greener choice easier to repeat. The strongest approach combines convenient daily habits with support at the community level."),
        ("Interesting, if you had the chance to participate in an ecological or nature-based activity, such as a community cleanup effort or tree planting event, what would you do, and why?",
         "I would choose a tree-planting event. Planting trees contributes directly to cleaner air and shade in a neighborhood, and the result remains after the event is over. A cleanup is also useful, but a tree can keep helping for years if it is cared for. I would join a group that also explains how to water and protect the trees afterward, so the work does not end on the same afternoon."),
        ("Great! Some people believe that individual actions are not enough to address conservation issues, and that significant changes must come from government policies. Do you agree or disagree with this viewpoint? Why or why not?",
         "I partly agree. Individual actions matter, but they cannot replace rules that change what companies produce or how cities are designed. A person can recycle carefully and still live in a place where public transport is weak and packaging is wasteful. Government policy can set standards, fund infrastructure, and make the better choice cheaper. Individuals still need to use those systems, so the two levels work together rather than one replacing the other."),
    ]),
]


def build_speaking(pid, title, form, interview=None):
    key, instruction, samples = REPEATS[form - 1]
    tasks = []
    for i, sample in enumerate(samples, 1):
        fname = "repeats_%02d_%s_q%02d.mp3" % (form, key, i)
        NEED.append(fname)
        tasks.append({
            "type": "repeat",
            "module": 1,
            "id": i,
            "speakSec": 15 if i < 7 else 18,
            "instruction": instruction,
            "audio": AUDIO + fname,
            "sample": sample,
        })
    modules = [{"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"}]
    if interview:
        ikey, i_instruction, items = INTERVIEWS[interview - 1]
        modules.append({"n": 2, "timeSec": 360, "from": 8, "to": 11, "label": "Take an Interview"})
        for i, (stem, sample) in enumerate(items, 1):
            fname = "interviews_%02d_%s_q%02d.mp3" % (interview, ikey, i)
            NEED.append(fname)
            tasks.append({
                "type": "interview",
                "module": 2,
                "id": 7 + i,
                "speakSec": 45,
                "instruction": i_instruction,
                "stem": stem,
                "audio": AUDIO + fname,
                "sample": sample,
            })
    return {
        "id": pid,
        "title": title,
        "set": "9.23",
        "skill": "speaking",
        "modules": modules,
        "tasks": tasks,
    }


def copy_audio():
    dest = os.path.join(ROOT, AUDIO)
    os.makedirs(dest, exist_ok=True)
    for name in NEED:
        src = os.path.join(SRC, name)
        if not os.path.isfile(src):
            raise SystemExit("missing audio " + src)
        out = os.path.join(dest, name)
        shutil.copy2(src, out)
        os.chmod(out, 0o644)
    print("copied", len(NEED), "audio files")


if __name__ == "__main__":
    dump("2025-09-23-reading.json", build_reading())
    dump("2025-09-23-listening.json", build_listening())
    dump("2025-09-23-writing.json", build_writing())
    dump("2025-09-23-speaking.json", build_speaking(
        "2025-09-23", "新托福 9.23 国内线下 · 口语 Form 1", 1, 1))
    dump("2025-09-23-speaking-f2.json", build_speaking(
        "2025-09-23-s2", "新托福 9.23 国内线下 · 口语 Form 2", 2, 2))
    dump("2025-09-23-speaking-f3.json", build_speaking(
        "2025-09-23-s3", "新托福 9.23 国内线下 · 口语 Form 3", 3, 3))
    dump("2025-09-23-speaking-f4.json", build_speaking(
        "2025-09-23-s4", "新托福 9.23 国内线下 · 口语 Form 4", 4))
    dump("2025-09-23-speaking-f5.json", build_speaking(
        "2025-09-23-s5", "新托福 9.23 国内线下 · 口语 Form 5", 5))
    dump("2025-09-23-speaking-f6.json", build_speaking(
        "2025-09-23-s6", "新托福 9.23 国内线下 · 口语 Form 6", 6))
    copy_audio() 