#!/usr/bin/env python3
"""Build 8.22 China offline TOEFL. Run: python3 scripts/build_toefl_822cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/8 月/8.22-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-08-22/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-08-22"
SET = "8.22"
TITLE = "新托福 8.22 国内线下"
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


def lecture(title, module, fname, src_name, questions):
    NEED.append((fname, "listening/" + src_name))
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
    t, n = cw("Atmospheric Pressure", 1, n, [
        "Atmospheric pressure plays a critical role in weather systems. High-pressure zones bring clear, calm conditions due to descending air that inhibits cloud formation. In low-pressure systems, warm air rises, cools, and condenses into clouds, ",
        ("wh", "which"),
        " can ",
        ("le", "lead"),
        " to ",
        ("precip", "precipitation"),
        ". Barometric pressure ",
        ("varia", "variations"),
        " help ",
        ("meteoro", "meteorologists"),
        " improve ",
        ("fore", "forecasts"),
        ", as ",
        ("ra", "rapid"),
        " fluctuations ",
        ("of", "often"),
        " signal ",
        ("appro", "approaching"),
        " storms. ",
        ("Adva", "Advanced"),
        " models use atmospheric force gradients, temperature, and humidity to predict storm movement and intensity, providing vital information for both short-term weather outlooks and long-term climate assessments.",
    ])
    tasks.append(t)
    t, n = cw("Biochemistry", 1, n, [
        "Rooted in both biology and chemistry, modern biochemistry has grown into a foundational science that explores the molecular basis of life. ",
        ("I", "It"),
        " emerged ",
        ("fr", "from"),
        " early ",
        ("investi", "investigations"),
        " into ",
        ("nat", "natural"),
        " processes ",
        ("li", "like"),
        " fermentation ",
        ("a", "and"),
        " digestion and ",
        ("n", "now"),
        " encompasses ",
        ("t", "the"),
        " study ",
        ("o", "of"),
        " biomolecules ",
        ("su", "such"),
        " as proteins, carbohydrates, and nucleic acids. Biochemistry plays a vital role in diverse fields including agriculture, environmental science, and pharmacology, contributing to innovations in areas like crop improvement, pollution control, and drug design, for example. Its broad applications continue to shape our understanding of living systems and support solutions to global challenges.",
    ])
    tasks.append(t)
    t, n = cw("The Circulatory System", 1, n, [
        "Human anatomy is the scientific study of human structure. Anatomy ",
        ("rev", "reveals"),
        " how different ",
        ("pa", "parts"),
        " of ",
        ("t", "the"),
        " body ",
        ("inte", "interact"),
        " and ",
        ("func", "function"),
        " together ",
        ("t", "to"),
        " maintain ",
        ("li", "life"),
        ". For ",
        ("exa", "example"),
        ", the circulatory ",
        ("sys", "system"),
        " transports ",
        ("bl", "blood"),
        " throughout the body, carrying oxygen and nutrients to cells while removing waste products. Anatomists must also understand the organization of organs, tissues, and cells. Medical professionals use anatomical knowledge to diagnose and treat illnesses, improving patient care and health outcomes.",
    ])
    tasks.append(t)
    t, n = cw("Rock Formations and Fossils", 1, n, [
        "Rock formations offer valuable insights into Earth's history. Sedimentary layers, for example, reveal past environments. By analyzing their composition and arrangement, geologists can determine if an area was once underwater or exposed. Over time, pressure ",
        ("trans", "transforms"),
        " sediments ",
        ("in", "into"),
        " solid ",
        ("ro", "rock"),
        ", preserving ",
        ("evid", "evidence"),
        " of ",
        ("anc", "ancient"),
        " climates ",
        ("a", "and"),
        " geological ",
        ("eve", "events"),
        ". Fossils ",
        ("wit", "within"),
        " layers ",
        ("sh", "show"),
        " what ",
        ("orga", "organisms"),
        " once lived there. Through such studies, scientists reconstruct Earth's past and gain a deeper understanding of the dynamic processes that continue to shape the planet's surface.",
    ])
    tasks.append(t)
    t, n = cw("The Human Nervous System", 1, n, [
        "The human nervous system is responsible for coordinating actions and processing sensory information by transmitting signals between different parts of the body. This ",
        ("com", "complex"),
        " network ",
        ("ena", "enables"),
        " essential ",
        ("func", "functions"),
        " such ",
        ("a", "as"),
        " sensation, ",
        ("move", "movement"),
        ", and ",
        ("tho", "thought"),
        ". The ",
        ("ce", "cells"),
        " in ",
        ("t", "the"),
        " nervous ",
        ("sys", "system"),
        " (neurons) ",
        ("commu", "communicate"),
        " through electrical impulses and chemical signals. This system controls voluntary actions like movement by sending messages from the brain to muscles, and it also controls involuntary functions such as heart rate, breathing, and digestion.",
    ])
    tasks.append(t)
    t, n = cw("Microfinance", 1, n, [
        "The concept of microfinance has transformed the way people access financial services. Microfinance institutions provide small loans to individuals or groups who lack access to traditional banking. These loans empower ",
        ("recip", "recipients"),
        " to ",
        ("st", "start"),
        " or ",
        ("exp", "expand"),
        " small ",
        ("busin", "businesses"),
        ", improving ",
        ("th", "their"),
        " living ",
        ("condi", "conditions"),
        " and ",
        ("commu", "communities"),
        ". By ",
        ("encou", "encouraging"),
        " financial ",
        ("lite", "literacy"),
        " and ",
        ("adva", "advancing"),
        " financial inclusion, microfinance helps reduce poverty, foster economic development, and build long-term stability at the grassroots level. Understanding this system helps design effective financial inclusion strategies.",
    ])
    tasks.append(t)
    t, n = cw("Ocean Currents", 1, n, [
        "Oceanography is the study of the physical, chemical, and biological aspects of the ocean. This ",
        ("fi", "field"),
        " encompasses ",
        ("t", "the"),
        " exploration ",
        ("o", "of"),
        " ocean ",
        ("curr", "currents"),
        ", marine ",
        ("ecosy", "ecosystems"),
        ", and ",
        ("geolo", "geological"),
        " seabed ",
        ("struc", "structures"),
        ". Oceanographers ",
        ("u", "use"),
        " satellites ",
        ("a", "and"),
        " other ",
        ("adva", "advanced"),
        " technology to monitor and analyze ocean conditions. By tracking sea surface temperatures, currents, salinity, and other features, researchers contribute to our understanding of climate change. Their work is vital for sustaining ocean health and preserving marine biodiversity.",
    ])
    tasks.append(t)
    t, n = cw("Pigments and the Evolution of Paint", 1, n, [
        "Color perception has fascinated scientists and artists alike for centuries. The study of pigments, ",
        ("substa", "substances"),
        " that ",
        ("g", "give"),
        " color ",
        ("t", "to"),
        " materials, ",
        ("rev", "reveals"),
        " complex ",
        ("intera", "interactions"),
        " with ",
        ("li", "light"),
        ". Pigments ",
        ("abs", "absorb"),
        " certain ",
        ("wavel", "wavelengths"),
        " and ",
        ("ref", "reflect"),
        " others, ",
        ("wh", "which"),
        " is why objects appear to have color. Synthetic pigments have expanded the color palette available to artists and industries. The development of pigments requires knowledge of chemistry and physics, as their properties influence durability and appearance. Understanding how pigments behave is crucial in various fields, from art restoration to manufacturing.",
    ])
    tasks.append(t)
    t, n = cw("Public Health", 1, n, [
        "Public health is a field that looks at the overall well-being of communities, focusing on how society and individual health are connected. Over ",
        ("ti", "time"),
        ", public health ",
        ("prog", "programs"),
        " have ",
        ("gr", "grown"),
        " from ",
        ("ba", "basic"),
        " efforts ",
        ("li", "like"),
        " improving ",
        ("sanit", "sanitation"),
        " to ",
        ("inc", "include"),
        " many ",
        ("strat", "strategies"),
        " that ",
        ("de", "deal"),
        " with ",
        ("soc", "social"),
        " factors affecting health. This history shows the ongoing challenge of deciding how to use limited resources while facing more and more health problems, such as new diseases and long-term conditions linked to lifestyle. As leaders work to solve these issues, they are realizing the importance of teamwork across different fields.",
    ])
    tasks.append(t)
    t, n = cw("The Potential of Artificial Intelligence", 1, n, [
        "Understanding the potential and limitations of artificial intelligence (AI) is crucial for harnessing its benefits while mitigating associated risks. AI technologies enable computers to ",
        ("mi", "mimic"),
        " human ",
        ("cogn", "cognitive"),
        " functions, ",
        ("allo", "allowing"),
        " them ",
        ("t", "to"),
        " analyze ",
        ("la", "large"),
        " datasets ",
        ("a", "and"),
        " make ",
        ("predi", "predictions"),
        " with ",
        ("sp", "speed"),
        " and ",
        ("accu", "accuracy"),
        ". These ",
        ("capabi", "capabilities"),
        " have been particularly beneficial in fields like healthcare, where AI assists in diagnosing diseases by recognizing patterns in medical images. As AI continues to evolve, ethical considerations surrounding data privacy and employment displacement must be addressed.",
    ])
    tasks.append(t)
    t, n = cw("The Renaissance", 1, n, [
        "Medieval European history encompasses the time period from the fall of the Roman Empire to the onset of the Renaissance. This era lasted around 900 years and is also called the Middle Ages. ",
        ("Dur", "During"),
        " these ",
        ("cent", "centuries"),
        ", feudalism ",
        ("w", "was"),
        " the ",
        ("domi", "dominant"),
        " social ",
        ("stru", "structure"),
        ", shaping ",
        ("t", "the"),
        " political, ",
        ("econ", "economic"),
        ", and ",
        ("cult", "cultural"),
        " landscape. ",
        ("Da", "Daily"),
        " life ",
        ("a", "and"),
        " governance were strongly influenced by the Catholic Church. Studying medieval history reveals the foundations of modern European society and the profound changes that occurred over time. It also helps students understand how people lived, worked, and believed during this important time in history.",
    ])
    tasks.append(t)
    t, n = cw("Oceanography and Hydrology", 1, n, [
        "Oceanography and hydrology are fields that study the dynamics of water on Earth, encompassing aspects like ocean currents, tides, and the hydrological cycle. Ocean currents, ",
        ("influ", "influenced"),
        " by ",
        ("fac", "factors"),
        " such ",
        ("a", "as"),
        " wind ",
        ("patt", "patterns"),
        " and Earth's ",
        ("rota", "rotation"),
        ", play a ",
        ("cru", "crucial"),
        " role ",
        ("i", "in"),
        " regulating ",
        ("glo", "global"),
        " climate ",
        ("si", "since"),
        " they ",
        ("redist", "redistribute"),
        " heat across the planet. The hydrological cycle, on the other hand, describes the continuous movement of water between the Earth's surface and atmosphere, involving processes such as evaporation, condensation, and precipitation. Together, these phenomena illustrate the interconnected nature of Earth's water systems.",
    ])
    tasks.append(t)

    tasks.append(daily("New Winter Term Writing Seminar", 2, "Read a course description.", {
        "kind": "course",
        "kicker": "COURSE DESCRIPTION",
        "title": "New Winter Term Writing Seminar",
        "body": "Please consider registering for the newly developed Creative Writing Seminar, designed to help you enhance your writing skills and unleash your creativity. Led by professors from our Creative Writing Department, this seminar-style class will help you hone your writing by giving tips on narrative structure, character development, and dialogue crafting. Students will engage in interactive exercises and group readings to refine their writing abilities. Please bring your laptop for writing activities.",
        "fields": [
            {"label": "When", "value": "Tuesdays and Thursdays from 10:00 A.M. to 12:00 P.M."},
            {"label": "Where", "value": "Conference room, fifth floor of the library"},
            {"label": "Eligibility", "value": "Completed one first-year-level course in Creative Writing or English"},
            {"label": "Contact", "value": "admin@creativewriting.edu/winterterm"},
        ],
    }, [
        q(n, "What is the main purpose of the announcement?", {
            "A": "To introduce a course that has not been taught before",
            "B": "To encourage students to attend an English Department event",
            "C": "To demonstrate the high quality of the Creative Writing program",
            "D": "To ask for contributions to the Creating Writing Quarterly Journal"}, "A"),
        q(n + 1, "Which of the following would most likely NOT be a major focus of the seminar?", {
            "A": "Making a list of plot elements for use in fiction writing",
            "B": "Writing drafts of conversations between characters",
            "C": "Developing arguments to respond to prompts",
            "D": "Reading a section of one's own work to class members"}, "C"),
        q(n + 2, "To register for the Creative Writing seminar, a student must", {
            "A": "submit a writing sample for evaluation",
            "B": "have completed one introductory Creative Writing or English course",
            "C": "be a first-year student",
            "D": "be pursuing a degree in Creative Writing"}, "B"),
    ]))
    n += 3
    tasks.append(daily("Campus Historical Society", 2, "Read a poster.", {
        "kind": "poster",
        "title": "Join the Campus Historical Society!",
        "subtitle": "Explore history with us through lectures, trips, and workshops. All are welcome!",
        "body": "Upcoming Event: \"Architecture of the University\" Walking Tour",
        "fields": [
            {"label": "Date", "value": "October 14"},
            {"label": "Time", "value": "3:00 P.M."},
            {"label": "Location", "value": "Main Library"},
            {"label": "Contact", "value": "historicalsociety@campus.edu"},
        ],
    }, [
        q(n, "What is suggested about the Campus Historical Society?", {
            "A": "It focuses primarily on the history of foreign countries.",
            "B": "Anyone in the campus community can join its events.",
            "C": "History majors are required to participate in it.",
            "D": "It charges a fee for event attendance."}, "B"),
        q(n + 1, "What does the poster suggest about the upcoming walking tour?", {
            "A": "Participants must register in advance.",
            "B": "It will begin with a lecture and a workshop.",
            "C": "Participants will learn about campus landmarks.",
            "D": "It will take place weekly."}, "C"),
    ]))
    n += 2
    tasks.append(daily("Library Hours", 2, "Read a sign.", {
        "kind": "schedule",
        "kicker": "LIBRARY HOURS",
        "title": "Library Hours",
        "columns": [
            {"title": "Mon–Fri", "lines": ["8 A.M.–7 P.M."]},
            {"title": "Saturday", "lines": ["9 A.M.–5 P.M."]},
            {"title": "Sunday", "lines": ["Closed"]},
        ],
        "notes": [
            "Reserve study rooms online.",
            "Printing limit: 20 pages/day.",
            "Bottled water allowed in designated zones.",
            "Silence phones.",
            "Use computers for research only.",
            "Lockers are available near the front desk for stowing personal belongings.",
        ],
    }, [
        q(n, "Which activity is not permitted at the library?", {
            "A": "Making online purchases using a library computer",
            "B": "Studying for exams",
            "C": "Bringing personal belongings",
            "D": "Drinking water in designated zones"}, "A"),
        q(n + 1, "What can be inferred about the library?", {
            "A": "It has a designated room for cell phone use.",
            "B": "It has printers available for the public.",
            "C": "It hosts special events on Saturdays.",
            "D": "It allows food and drinks."}, "B"),
    ]))
    n += 2
    tasks.append(daily("University Bike-Sharing Program", 2, "Read an article.", {
        "kind": "card",
        "kicker": "CAMPUS NEWS",
        "title": "University Bike-Sharing Program",
        "body": "Harrison University recently launched a bike-sharing program to promote sustainable transportation and reduce parking congestion. Students can now rent bikes from racks located near residence halls, academic buildings, and the student center. The program offers free rentals for an hour and charges a small fee afterward, making it affordable for short trips across campus. Each bike is equipped with a GPS tracker to ensure security and ease of locating. \"This is about giving students greener options,\" said transportation coordinator Alex Nguyen. \"We sent out a survey last semester, and students were overwhelmingly in favor of the program. They see it as making a difference environmentally.\" The initiative was funded through a partnership with Benny's Cyclery, which sells the bikes at a discount and provides maintenance. Early feedback has been positive, with students praising the convenience and environmental benefits. The university plans to expand the program next semester by adding electric bikes.",
    }, [
        q(n, "What is the main topic of the article?", {
            "A": "The results of a recent student survey",
            "B": "A new transportation option at a university",
            "C": "The history of sustainability at Harrison University",
            "D": "A review of local bike shops near a college campus"}, "B"),
        q(n + 1, "What can be concluded about students at Harrison University?", {
            "A": "They mostly live off campus.",
            "B": "They are not in favor of electric bikes.",
            "C": "They prefer riding bikes to class over walking.",
            "D": "They are concerned with protecting the environment."}, "D"),
        q(n + 2, "What is suggested about Benny's Cyclery?", {
            "A": "It specializes in electric bikes.",
            "B": "It is located on Harrison University's campus.",
            "C": "It will ensure that the shared bikes are in good condition.",
            "D": "It has a long-standing relationship with Harrison University."}, "C"),
    ]))
    n += 3

    tasks.append(academic("Data Visualization in Action", 2, [
        "Data visualization is transforming how we interpret complex datasets, moving beyond traditional charts, such as static charts and graphs, to dynamic graphical representations, such as heat maps, time-lapse animations, and network graphs. This shift allows for the discovery of patterns and anomalies otherwise hidden in raw data. For example, when studying climate change impacts, a time-lapse heat map might reveal unexpected temperature shifts over decades that spreadsheets alone could not capture.",
        "A significant development in this field is the use of interactive dashboards. These tools not only display data but also allow users to manipulate variables to explore different scenarios. In the business sector, decision-makers use dashboards to simulate market conditions, adjusting factors like demand and supply to forecast outcomes. However, the effectiveness of these dashboards often hinges on the user's ability to interpret complex visual cues, which can be overwhelming.",
        "In the realm of public health, data visualization has proven invaluable in tracking disease spread.",
        {"insert": "A", "t": "The combination of geographical maps and timelines helps analysts predict outbreak hot spots."},
        {"insert": "B", "t": "Nonetheless, this predictive power depends heavily on the quality of data inputs."},
        {"insert": "C", "t": "Still, data visualization tools help public health officials to act before a situation becomes unmanageable."},
        {"insert": "D"},
    ], [
        q(n, 'The word "anomalies" in the passage is closest in meaning to',
          {"A": "irregularities", "B": "indications", "C": "solutions", "D": "links"}, "A"),
        q(n + 1, "What does the passage suggest about traditional data charts?", {
            "A": "They reveal some important features hidden in raw data.",
            "B": "They are limited in how effectively they convey complex information.",
            "C": "They are especially helpful in capturing data related to climate change.",
            "D": "They include heat maps, time-lapse animations, and network graphs."}, "B"),
        q(n + 2, "Identify the sentence in paragraph 2 that highlights a limitation of interactive dashboards.", {
            "A": "A significant development in this field is the use of interactive dashboards.",
            "B": "These tools not only display data but also allow users to manipulate variables to explore different scenarios.",
            "C": "In the business sector, decision-makers use dashboards to simulate market conditions, adjusting factors like demand and supply to forecast outcomes.",
            "D": "However, the effectiveness of these dashboards often hinges on the user's ability to interpret complex visual cues, which can be overwhelming."}, "D"),
        q(n + 3, "The passage mentions all the following about interactive dashboards EXCEPT:", {
            "A": "They represent an important development in data analysis tools.",
            "B": "They let users change variables to see different outcomes.",
            "C": "They can be used to explore how markets might behave.",
            "D": "They help business leaders interact more effectively with one another."}, "D"),
        insert_q(n + 4, "Incomplete or biased data can lead to misleading conclusions, potentially hampering response efforts.", "C"),
    ]))
    n += 5
    tasks.append(academic("Floating Wind Turbines", 2, [
        "Wind turbines are large devices with long blades that capture wind energy and convert it into electricity. Floating wind turbines are a special type of wind turbines because they are not fixed to the seabed but are anchored using advanced mooring systems, allowing placement in deeper waters where winds are more consistent. In this context, anchoring refers to securing the turbine in place using cables or chains connected to weighted structures or anchors on the ocean floor, ensuring stability despite the lack of a fixed foundation. The deeper placement means the wind turbines can harness untapped wind resources that traditional turbines cannot access.",
        "Engineering floating turbines involves unique challenges. They rely on buoyancy principles rather than on solid ground, making their design and maintenance complex. Despite the increased costs, their ability to reduce visual and noise pollution makes them an attractive option for distant offshore locations.",
        "However, their long-term viability is threatened by harsh marine conditions that can accelerate wear and tear.",
        {"insert": "A", "t": "Research continues to explore solutions for these problems."},
        {"insert": "B", "t": "Some experts are investigating materials and designs to enhance durability."},
        {"insert": "C", "t": "As efforts to capitalize on deeper offshore wind resources persist, floating turbines represent both a promising opportunity and a complex engineering puzzle."},
        {"insert": "D"},
    ], [
        q(n, 'The word "harness" in the passage is closest in meaning to',
          {"A": "limit", "B": "distribute", "C": "release", "D": "exploit"}, "D"),
        q(n + 1, "What unique advantage do floating wind turbines have over traditional turbines?", {
            "A": "They are larger in size and have longer blades.",
            "B": "They require less maintenance.",
            "C": "They can be placed in deeper waters.",
            "D": "They are easier to design."}, "C"),
        q(n + 2, 'Why does the author mention "buoyancy principles"?', {
            "A": "To point out a challenge of creating floating turbines",
            "B": "To suggest a new area for future research into floating turbines",
            "C": "To emphasize the greater flexibility of floating turbines compared with traditional turbines",
            "D": "To provide an example of cost-saving measures related to floating turbines"}, "A"),
        q(n + 3, 'What can be inferred about the acceleration of "wear and tear" in floating turbines?', {
            "A": "Any attempts to reduce it will likely prove to be unsuccessful.",
            "B": "Scientists are working to control it through better designs and materials.",
            "C": "It is prompting engineers to place floating wind turbines closer to shore.",
            "D": "It makes floating turbines especially unattractive to look at."}, "B"),
        insert_q(n + 4, "Others assess economic models that might offset higher initial expenses.", "C"),
    ]))
    n += 5
    tasks.append(academic("Genetically Modified Foods", 2, [
        "The use of genetically modified organisms (GMOs) in foods has raised a number of concerns, yet genetic modification (GM) technology can provide solutions to many persistent problems facing humanity. For instance, by engineering crops to resist pests, tolerate drought, or grow in nutrient-poor soil, farmers can produce more food with fewer resources. This can be especially valuable in regions facing food insecurity or harsh environmental conditions. GM technology can also enhance nutritional content. Rice, for example, can be enriched with vitamin A to combat malnutrition. Furthermore, reduced reliance on chemical pesticides benefits both the environment and farm workers. Yet some critics anticipate harm from GMOs. One major issue is ecological impact. Genetically modified plants may crossbreed with wild species, potentially disrupting ecosystems or reducing biodiversity. GM critics also worry about long-term health effects, even though current scientific consensus finds GM foods safe to eat. Additionally, GM technology has economic effects: Patented GM seeds can increase farmers' dependence on large biotech companies, raising questions about fairness and control within the food system. Public skepticism remains strong, fueled by limited transparency and the rapid pace of technological change. If GM foods are to serve the public good, thoughtful regulation, candid communication, and ongoing research will be essential.",
    ], [
        q(n, "The primary purpose of the passage is to", {
            "A": "outline some benefits of GM technology and advocate for its adoption",
            "B": "argue that GM technology is too dangerous and should be discontinued",
            "C": "summarize some potential benefits and drawbacks related to the use of GM technology",
            "D": "propose a set of steps toward resolving the debate over the use of GM technology"}, "C"),
        q(n + 1, 'The word "persistent" in the passage is closest in meaning to',
          {"A": "disastrous", "B": "long-lasting", "C": "inconvenient", "D": "technical"}, "B"),
        q(n + 2, "According to the author, GM technology can do all of the following EXCEPT", {
            "A": "improve the fertility of soil",
            "B": "boost agricultural productivity",
            "C": "improve human nutrition",
            "D": "protect the health of agricultural workers"}, "A"),
        q(n + 3, 'The passage suggests which of the following about "Patented GM seeds"?', {
            "A": "They can sometimes alter the nutrients in crops in ways that harm human health.",
            "B": "Their use can benefit farmers when profits are shared by biotech companies.",
            "C": "Their adoption could potentially subject farmers to unfair control by businesses.",
            "D": "Their widespread use in agriculture could help to expand and protect biodiversity."}, "C"),
        q(n + 4, 'The author mentions "the rapid pace of technological change" in order to', {
            "A": "acknowledge the promise that GM technology holds for farmers",
            "B": "suggest why research on the health effects of GM technology has lagged",
            "C": "question one argument used to advocate for expanded use of GM technology",
            "D": "explain some of the resistance to implementation of GM technology"}, "D"),
    ]))
    n += 5
    tasks.append(academic("Person-Centered Therapy: A Shift in Focus", 2, [
        "When American psychologist Carl Rogers first introduced person-centered therapy in the mid-twentieth century, the prevailing view was that therapists should be experts in diagnosis and treatment. Instead, in his new approach, Rogers centered the patient as an individual who is able to discover and take steps toward personal growth. Counseling was viewed as a collaborative interaction between the professional and the patient, with the latter playing a key role in effecting change.",
        "One of Rogers' core beliefs was that a nonjudgmental environment fosters self-discovery. The therapist acts as an empathetic facilitator, listening actively and using reflection—paraphrasing, summarizing, and clarifying the client's words—to elicit the client's feelings. Rogers claimed this approach allows individuals to gain the self-awareness and self-acceptance needed to grow personally and resolve issues. Rogers' research suggested that the most successful patients were those who experienced the highest degree of empathy in therapy.",
        "Unlike Rogers' model, earlier clinical approaches foregrounded issues and behaviors of concern, with the therapist diagnosing them and specifying treatment courses. Critics question the effectiveness of Rogers' approach for patients seeking expert guidance, especially those with severe mental health challenges who need structured intervention.",
    ], [
        q(n, 'The word "prevailing" in the passage is closest in meaning to',
          {"A": "dominant", "B": "successful", "C": "traditional", "D": "scientific"}, "A"),
        q(n + 1, "According to the passage, all of the following were characteristics of Rogers' patient-centered approach EXCEPT", {
            "A": "relying on each patient's own diagnostic expertise",
            "B": "creating a supportive context for treatment",
            "C": "listening carefully to the patient",
            "D": "promoting self-development by patients"}, "A"),
        q(n + 2, 'Why does the author of the passage mention "paraphrasing, summarizing, and clarifying"?', {
            "A": "To specify the note-taking that therapists do during patient sessions",
            "B": "To clarify the concept of reflection in patient-centered therapy",
            "C": "To illustrate some tools patients use to promote personal growth",
            "D": "To explain how Rogers conducted research on therapeutic models"}, "B"),
        q(n + 3, "The passage suggests which of the following about therapeutic approaches in the United States before the mid-twentieth century?", {
            "A": "They were abandoned after Rogers became influential.",
            "B": "They were not effective for patients with severe mental-health challenges.",
            "C": "They were not backed by sufficient clinical research.",
            "D": "They did not view empathy as a key therapeutic methodology."}, "D"),
        q(n + 4, "Identify the sentence in paragraph 2 that best explains the intended outcomes for a patient receiving person-centered therapy.", {
            "A": "One of Rogers' core beliefs was that a nonjudgmental environment fosters self-discovery.",
            "B": "The therapist acts as an empathetic facilitator, listening actively and using reflection—paraphrasing, summarizing, and clarifying the client's words—to elicit the client's feelings.",
            "C": "Rogers claimed this approach allows individuals to gain the self-awareness and self-acceptance needed to grow personally and resolve issues.",
            "D": "Rogers' research suggested that the most successful patients were those who experienced the highest degree of empathy in therapy."}, "C"),
    ]))
    n += 5
    tasks.append(academic("Stretching: Benefits and Drawbacks", 2, [
        "Stretching has long been championed as integral to physical fitness, widely believed to enhance flexibility and reduce injury risk. However, research supports a more nuanced picture, with the distinction between dynamic and static stretching being particularly critical. Dynamic stretching, involving controlled, fluid movements through a range of motion, apparently improves athletic performance by priming muscles for activity. In contrast, static stretching, the holding of a position for an extended period, seems to hinder performance of subsequent exercise. Related studies show that static stretching can temporarily reduce muscle strength, likely due to reduced muscle activation through the nervous system and a decrease in muscle stiffness, both of which can impair the ability to generate force. For example, athletes engaging in static pre-competition stretches often exhibit diminished sprint speed and vertical jump height.",
        {"insert": "A", "t": "There is, however, a key qualification to this contrast: While static stretching may be detrimental before exertion, it remains valuable post-exercise, aiding in recovery and flexibility maintenance."},
        {"insert": "B", "t": "Meanwhile, dynamic stretching not only prepares the body physically but may also enhance coordination and neuromuscular efficiency."},
        {"insert": "C", "t": "The evolving understanding of these techniques challenges the one-size-fits-all approach to stretching, suggesting that timing, context, and type are essential variables in optimizing physical readiness and long-term fitness outcomes."},
        {"insert": "D"},
    ], [
        q(n, "According to the passage, dynamic stretching may result in all of the following EXCEPT", {
            "A": "decreased range of motion",
            "B": "better performance in sports",
            "C": "improved coordination",
            "D": "more efficient communication between nerves and muscles"}, "A"),
        q(n + 1, 'The word "impair" in the passage is closest in meaning to',
          {"A": "aid", "B": "reinforce", "C": "end", "D": "weaken"}, "D"),
        q(n + 2, "The passage implies that competitive athletes may most benefit from static stretching when they", {
            "A": "need to increase muscle strength",
            "B": "have issues with muscle activation",
            "C": "have completed a training session",
            "D": "are preparing for a sprint"}, "C"),
        q(n + 3, 'Why does the author refer to "timing, context, and type" in the passage?', {
            "A": "To specify factors that must be considered when stretching",
            "B": "To list the variables that affect an athlete's performance",
            "C": "To refer to additional kinds of stretching developed by researchers",
            "D": "To underscore the complexity of factors influencing coordination"}, "A"),
        insert_q(n + 4, "Elite swimmers often perform static stretches after intense training sessions to relieve muscle tightness in the shoulders and hips and prevent overuse injuries.", "B"),
    ]))
    n += 5
    tasks.append(academic("Veganism in the United States", 2, [
        "Veganism, a dietary approach that excludes all animal-based foods, has experienced notable shifts in popularity in the United States. A study conducted in 2020 showed a dramatic increase in the number of Americans adopting a plant-based diet between 2004 and 2019.",
        "This growth was fueled by expanding awareness of animal welfare, environmental concerns linked to industrial agriculture, and increased emphasis on healthy eating. During the 2010s, companies began to market plant-based meat alternatives that became highly popular with both restaurants and home cooks.",
        "By the mid-2020s, however, momentum began to level off. Surveys in 2025 indicated that only about three to four percent of Americans identified as vegan. Several factors contributed to this plateau. Preparing vegan meals can be more involved than preparing meat-based meals.",
        "For example, a vegan cheese substitute can be made with nuts, but the process is time-consuming. And while home cooks can buy commercially manufactured vegan foods, those foods are highly processed, raising concerns about their healthfulness.",
        "Additionally, some social media influencers have begun to promote increased protein consumption, sparking increased consumer demand for meat. American food trends come and go, but while some consumers adopt extreme diets, Americans overall seem to be favoring more flexibility in their eating habits.",
    ], [
        q(n, "The main purpose of this passage is to", {
            "A": "describe the birth of veganism in the United States",
            "B": "list the benefits of a vegan diet",
            "C": "analyze some changes in Americans' attitudes toward veganism",
            "D": "identify trends in American consumer preferences"}, "C"),
        q(n + 1, "The author notes all of the following as factors driving the popularity of veganism EXCEPT", {
            "A": "concern for animals",
            "B": "considerations about health",
            "C": "the high cost of consuming meat",
            "D": "a desire to protect the environment"}, "C"),
        q(n + 2, 'The word "involved" in the passage is closest in meaning to',
          {"A": "unsatisfying", "B": "expensive", "C": "unpleasant", "D": "complicated"}, "D"),
        q(n + 3, 'The author mentions "a vegan cheese substitute" primarily in order to', {
            "A": "note a challenge inherent in preparing vegan meals",
            "B": "identify a popular item used in many vegan recipes",
            "C": "contrast the healthfulness of vegan and animal-based foods",
            "D": "describe a cooking process popularized by vegans"}, "A"),
        q(n + 4, "The passage suggests which of the following about commercial meat-alternative products?", {
            "A": "They became increasingly popular with home cooks during the mid-2020s.",
            "B": "They are produced in a way that causes some people to doubt their healthfulness.",
            "C": "They are not popular with Americans concerned about food allergies.",
            "D": "They have greatly improved in flavor since their introduction."}, "B"),
    ]))
    n += 5
    tasks.append(academic("Navigating Gene Editing Ethics", 2, [
        "Gene editing technologies, particularly CRISPR-Cas9, have transformed agricultural biotechnology by enabling precise modifications to plant genomes. This allows scientists to enhance crop traits such as drought tolerance, pest resistance, and nutritional content without introducing foreign DNA, distinguishing it from traditional genetic modification. For example, researchers have used CRISPR to develop rice varieties with improved yields and resistance to bacterial blight, a plant disease that is a major threat to global food security. In another case, gene-edited soybeans have been engineered to produce oil with reduced saturated fat and increased oleic acid, making them more appealing to consumers and food manufacturers.",
        "Despite its promise, gene editing in agriculture raises important concerns.",
        {"insert": "A", "t": "Unintended off-target effects, where edits occur in nontarget regions of the genome, could potentially alter plant metabolism or reduce resilience to environmental stress."},
        {"insert": "B", "t": "Additionally, widespread adoption of uniform edited traits may diminish genetic diversity, making crops more vulnerable to future pests or diseases."},
        {"insert": "C", "t": "Such outcomes highlight the need for comprehensive field testing and multi-season trials to mitigate risks before commercial release. Scientists must evaluate not just the intended trait but also how gene edits affect overall plant health and adaptability."},
        {"insert": "D"},
    ], [
        q(n, "According to the passage, how is CRISPR-Cas9 technology superior to traditional genetic modification?", {
            "A": "It is supported by more extensive research.",
            "B": "It is easier for scientists to implement.",
            "C": "Its modifications do not involve foreign DNA.",
            "D": "Its modifications are only temporary."}, "C"),
        q(n + 1, 'Why does the passage mention "soybeans"?', {
            "A": "To illustrate CRISPR-Cas9's potential to improve the nutritional content of crops",
            "B": "To show that CRISPR-Cas9 technology works better in soybeans than in rice",
            "C": "To highlight the role of food manufacturers in agricultural biotechnology",
            "D": "To explain how crop traits relate to heart health"}, "A"),
        q(n + 2, "The passage mentions all of the following potential negative effects of gene editing in agriculture EXCEPT", {
            "A": "a decreased ability to survive in harsh conditions",
            "B": "an increased chance of being harmed by pests",
            "C": "a greater likelihood of suffering from diseases",
            "D": "a higher risk of harming the wider environment"}, "D"),
        q(n + 3, 'The word "mitigate" in the passage is closest in meaning to',
          {"A": "determine", "B": "lessen", "C": "describe", "D": "warn about"}, "B"),
        insert_q(n + 4, "One study about this danger cited the Irish Potato Famine, in which genetically similar varieties were all susceptible to late blight, causing a major catastrophe.", "C"),
    ]))
    n += 5
    if n != 166:
        raise SystemExit("reading expected next id 166, got %s" % n)
    return paper(ID, "reading", "阅读", [
        {"n": 1, "timeSec": 2880, "from": 1, "to": 120},
        {"n": 2, "timeSec": 1680, "from": 121, "to": 165},
    ], tasks)


def build_listening():
    talks = [
        (1, "Kinship Systems and Kinship Charts", "L01_Kinship_Systems_and_Kinship_Charts.mp3", "listening_01_kinship.mp3", [
            ("What is the main focus of the talk?", {
                "A": "The impact of modern society on kinship roles",
                "B": "The concept of kinship and how it is studied",
                "C": "Why kinship systems vary widely across cultures",
                "D": "Differences between kinship systems and social structures"}, "B"),
            ("What does the speaker say about consanguineal relationships?", {
                "A": "They are formed through marriage.",
                "B": "They are based on \"blood\" ties.",
                "C": "They are a special feature of patrilineal societies.",
                "D": "They are less significant than affinal relationships."}, "B"),
            ("Why does the speaker mention maternal uncles in a matrilineal society?", {
                "A": "To illustrate how anthropologists might study kinship systems",
                "B": "To illustrate modern family structures",
                "C": "To highlight challenges in kinship roles",
                "D": "To discuss the importance of extended family"}, "A"),
            ("According to the speaker, how do kinship charts differ from family trees?", {
                "A": "Kinship charts are generally used to trace biological ancestry.",
                "B": "Kinship charts contain less detail than family trees.",
                "C": "Kinship charts account for cultural relationships in addition to biological ones.",
                "D": "Kinship charts do not include marriage ties."}, "C"),
        ]),
        (1, "Desertification: Causes and Responses", "L02_Desertification_Causes_and_Responses.mp3", "listening_02_desertification.mp3", [
            ("What is the main topic of the talk?", {
                "A": "The effects of excessive rainfall on local ecosystems",
                "B": "The benefits of sustainable agriculture",
                "C": "The phenomenon of desertification and its impact",
                "D": "Climate change and its effects on precipitation"}, "C"),
            ("What does the speaker say about intensive farming practices?", {
                "A": "They increase soil nutrients.",
                "B": "They can lead to soil erosion.",
                "C": "They are a solution to desertification.",
                "D": "They reduce the need for reforestation."}, "B"),
            ("Why does the speaker mention climate change?", {
                "A": "To explain its role in accelerating desertification",
                "B": "To discuss its impact on agricultural productivity",
                "C": "To highlight the benefits of rising temperatures",
                "D": "To describe changes in biodiversity"}, "A"),
            ("What can be concluded about the Great Green Wall project?", {
                "A": "It involves relocating endangered species.",
                "B": "It will increase agricultural output.",
                "C": "It is designed to help with reforestation.",
                "D": "It will increase the size of the African desert."}, "C"),
        ]),
        (1, "Understanding Opportunity Cost", "L03_Understanding_Opportunity_Cost.mp3", "listening_03_opportunity_cost.mp3", [
            ("Why does the speaker ask listeners to imagine a situation at the start of the talk?", {
                "A": "To help explain a potentially unfamiliar concept",
                "B": "To encourage listeners to take her perspective",
                "C": "To describe a situation she has experienced",
                "D": "To compare two different methods for making a decision"}, "A"),
            ("Why does the speaker talk about investing in new equipment?", {
                "A": "To suggest that not all business decisions include an opportunity cost",
                "B": "To provide an example of a decision made by most businesses",
                "C": "To illustrate how businesses take opportunity cost into consideration",
                "D": "To highlight the importance of weighing all options before investing"}, "C"),
            ("What does the speaker identify as a challenge related to identifying opportunity costs?", {
                "A": "Calculating non-monetary costs",
                "B": "Comparing unrelated activities",
                "C": "Choosing which factors to consider in making a decision",
                "D": "Deciding whether to borrow money to cover the costs"}, "A"),
            ("What does the speaker ask listeners to do at the end of the talk?", {
                "A": "Create their own definition of opportunity cost",
                "B": "Reflect on their own decision-making experiences",
                "C": "Break up into small groups for discussion",
                "D": "Share any experiences they have had making investments"}, "B"),
        ]),
        (1, "Kinetic Art", "L04_Kinetic_Art.mp3", "listening_04_kinetic_art.mp3", [
            ("What is the main topic of the talk?", {
                "A": "The technical challenges faced by certain artists",
                "B": "The development and significance of a particular type of art",
                "C": "The influence of traditional art forms on modern artists",
                "D": "The popularity of kinetic art among contemporary patrons"}, "B"),
            ("According to the talk, what role did the Hungarian artist Laszlo Moholy-Nagy play in the development of kinetic art?", {
                "A": "He criticized the use of technology in art.",
                "B": "He advanced the idea of using movement and light in art.",
                "C": "He was the first to use air and wind to manipulate art.",
                "D": "He established the first kinetic art museum."}, "B"),
            ("What challenge is associated with kinetic art, as mentioned in the talk?", {
                "A": "It requires video monitors.",
                "B": "It can make it difficult for the audience to engage.",
                "C": "It can involve technical difficulties.",
                "D": "It is rarely displayed in major galleries."}, "C"),
            ("Why does the speaker describe kinetic art as a multisensory experience?", {
                "A": "To summarize the way kinetic art engages its viewers",
                "B": "To emphasize that kinetic art is hard to understand",
                "C": "To highlight an advantage of using video in kinetic art",
                "D": "To explain the technical requirements of kinetic art installations"}, "A"),
        ]),
        (1, "Public Spaces and the Public Sphere", "L05_Public_Spaces_and_the_Public_Sphere.mp3", "listening_05_public_spaces.mp3", [
            ("What aspect of public spaces is the speaker mostly talking about?", {
                "A": "How they have increased in social importance over time",
                "B": "How they reflect what is important to a community",
                "C": "How they impact the job of urban planners",
                "D": "How they have evolved from a physical entity to a virtual concept"}, "B"),
            ("What does the speaker say about public spaces that are welcoming?", {
                "A": "They are a sign of increased economic activity in a community.",
                "B": "They positively impact the cultural heritage of a city.",
                "C": "They reflect societal progress and unity in a city.",
                "D": "They pose significant challenges for urban planners."}, "C"),
            ("Why does the speaker mention social media platforms?", {
                "A": "To propose a way of making physical spaces more inclusive",
                "B": "To point out a way of resolving issues of privacy and security",
                "C": "To provide an example of how city planners adapt to modern needs",
                "D": "To highlight a new kind of public sphere"}, "D"),
            ("Why does the speaker talk about access to computers?", {
                "A": "To describe a limitation of virtual public spaces",
                "B": "To explain why virtual public spaces are becoming increasingly popular",
                "C": "To illustrate the need for government funding for digital infrastructure",
                "D": "To point out that privacy cannot be protected in a public space"}, "A"),
        ]),
        (2, "Choosing a Waterfront Seafood Restaurant", "L06_Choosing_a_Waterfront_Seafood_Restaurant.mp3", "listening_06_seafood_restaurant.mp3", [
            ("Where is the restaurant that the woman mentions most likely located?", {
                "A": "In the city center",
                "B": "Inside the art museum",
                "C": "Far from the botanical gardens",
                "D": "By the sea"}, "D"),
            ("What possible problem with the restaurant does the woman mention?", {
                "A": "It has a limited dinner menu.",
                "B": "Its food is sometimes not very fresh.",
                "C": "It is often crowded.",
                "D": "It does not accept reservations."}, "C"),
        ]),
        (2, "Social Entrepreneurship", "L07_Social_Entrepreneurship.mp3", "listening_07_social_entrepreneurship.mp3", [
            ("What is the main topic of the talk?", {
                "A": "The impact of social change on new business owners",
                "B": "A comparison of traditional and modern business professionals",
                "C": "The evolution of entrepreneurship in the modern world",
                "D": "People who create businesses that address social problems"}, "D"),
            ("Why does the speaker mention traditional entrepreneurs?", {
                "A": "To help explain the origin of social entrepreneurship as a business concept",
                "B": "To suggest that some entrepreneurs have a more difficult time establishing a business than others",
                "C": "To describe the challenges facing individuals who want to impact society",
                "D": "To contrast their end goals with those of social entrepreneurs"}, "D"),
            ("Why does the speaker mention sectors such as poverty, health, and the environment?", {
                "A": "To highlight the areas where social needs are most pressing",
                "B": "To provide examples of problems that have been addressed through private investment",
                "C": "To list various challenges faced by traditional businesses",
                "D": "To suggest that social entrepreneurship is necessary for financial sustainability"}, "A"),
            ("What does the speaker suggest about the task of measuring social impact?", {
                "A": "It is often required to receive funding for a venture.",
                "B": "It is difficult to accomplish.",
                "C": "It can lead to controversial results.",
                "D": "It is only feasible for environmental endeavors."}, "B"),
        ]),
        (2, "Work-Study Applications and New Jobs", "L08_Work-Study_Applications_and_New_Jobs.mp3", "listening_08_work_study.mp3", [
            ("According to the announcement, what should students do with some applications?", {
                "A": "Revise them to include personal recommendations",
                "B": "Resubmit them through a new system",
                "C": "Have them reviewed by university staff",
                "D": "Hold onto them until further notice"}, "B"),
            ("What new opportunity is being offered by the center?", {
                "A": "Résumé-writing workshops",
                "B": "Internships with local businesses",
                "C": "Extended hours for career counseling",
                "D": "Some additional jobs on campus"}, "D"),
        ]),
        (2, "Considering a Psychology Major", "L09_Considering_a_Psychology_Major.mp3", "listening_09_psychology_major.mp3", [
            ("Why is the man unable to take a class with Professor Berman next semester?", {
                "A": "The man already has a full class schedule.",
                "B": "The man has not fulfilled the requirements necessary for taking the class.",
                "C": "Professor Berman will not be teaching any classes.",
                "D": "Professor Berman has asked him to assist with her research instead."}, "C"),
            ("Why does the woman mention Dr. Wilson?", {
                "A": "To try to find out more about him",
                "B": "To express an opinion about him",
                "C": "To identify the head of the Psychology Department",
                "D": "To suggest an alternative to Professor Berman"}, "D"),
        ]),
    ]
    tasks, n = [], 1
    for module, title, src_name, fname, qs in talks:
        items = []
        for stem, options, answer in qs:
            items.append(q(n, stem, options, answer))
            n += 1
        tasks.append(lecture(title, module, fname, src_name, items))
    return paper(ID, "listening", "听力", [
        {"n": 1, "timeSec": 1440, "from": 1, "to": 20},
        {"n": 2, "timeSec": 960, "from": 21, "to": 30},
    ], tasks)


def build_writing():
    return paper(ID, "writing", "写作", [
        {"n": 1, "timeSec": 3360, "from": 1, "to": 8, "label": "Email"},
        {"n": 2, "timeSec": 4200, "from": 9, "to": 15, "label": "Academic Discussion"},
    ], [
        email(1,
              "You are a regular customer at a local bakery and have always enjoyed their products. Recently, you bought a cake for your favorite professor, but it did not meet your expectations. You want to provide feedback to the bakery owner, Ms. Lopez, and suggest improvements.",
              ["Explain what you usually enjoy about their products.",
               "Describe the issues you had with your recent cake purchase.",
               "Suggest how they could improve the quality of their cakes."],
              "Ms. Lopez", "Feedback on Recent Cake Purchase",
              "Dear Ms. Lopez,\n\nI am a regular customer and usually enjoy the bakery's fresh bread, fruit pastries, and cakes with light, balanced frosting. The staff have also been helpful whenever I have placed an order for a special occasion.\n\nLast week, however, I purchased a chocolate cake for my professor, and it did not meet the usual standard. The cake was noticeably dry at the edges, the filling was uneven, and the frosting tasted much sweeter than the sample I had tried. The message on top was also difficult to read because several letters had blended together. I was disappointed because the cake was meant to be a thoughtful gift.\n\nFor future orders, it may help to check moisture and filling distribution before decorating and to confirm the written message against the order form. Offering a final photograph for custom cakes could catch lettering problems before collection. I hope this feedback helps maintain the quality I normally appreciate.\n\nBest regards,\n[Your Name]"),
        email(2,
              "You work part-time at the school library and are grateful for your teacher's support for this job. Nevertheless, your working hours have recently clashed with your study schedule.",
              ["Mention why you are thankful for the teacher's help regarding your library part-time job.",
               "Explain the conflicts between your library shifts and your study time.",
               "Ask whether it is possible to adjust your working hours and state suitable time options."],
              "Your teacher", "Request to adjust my library work schedule",
              "Dear Teacher,\n\nThank you for recommending me for the part-time position at the school library. The job has helped me become more organized and has also given me useful experience assisting other students.\n\nRecently, however, my evening shifts have begun to overlap with a required study group and the hours I normally use to prepare for two demanding classes. I have tried studying later at night, but I am often too tired to work effectively.\n\nWould it be possible to adjust my schedule? I am available on Tuesday and Thursday afternoons after 2:00, as well as Saturday mornings. I could also take an earlier shift on Friday if that is more convenient for the library. I would appreciate any arrangement that preserves my work hours while avoiding the academic conflict.\n\nKind regards,\n[Your Name]"),
        email(3,
              "You recently purchased a new kitchen appliance from a store called 'Home Essentials.' After using it for a few days, you noticed some problems with it. You want to inform the customer service representative, Ms. Parker, about the issue.",
              ["Describe the issue you are experiencing with the kitchen appliance.",
               "Explain why this issue is problematic for you.",
               "Request a replacement or repair for the appliance."],
              "Ms. Parker", "Kitchen appliance problem",
              "Dear Ms. Parker,\n\nI am writing about a blender I recently purchased from Home Essentials. During the first few days, the motor stopped several times even when the container was only half full. Yesterday, liquid also began leaking from the base of the container, although the lid and blade assembly were secured according to the instructions.\n\nThis problem is important because I bought the blender to prepare meals before early classes. I can no longer use it safely, and stopping repeatedly has already made food preparation take much longer. I have cleaned and reassembled the removable parts, but the leaking and motor problem continue.\n\nCould you please arrange a replacement? I can bring the blender, receipt, packaging, and all accessories to the store this week. If replacement is not possible, I would appreciate a repair at no additional cost and an estimate of how long it will take. Please let me know the correct return procedure.\n\nSincerely,\n[Your Name]"),
        email(4,
              "You recently attended a technology conference where you met Mr. Smith, a prominent industry expert. You found his presentation helpful and informative. You want to thank Mr. Smith for his presentation and request additional information on a topic he discussed.",
              ["Mention what you found useful about his presentation.",
               "Request additional information about one of the topics he discussed.",
               "Express your appreciation for his time and insights."],
              "Mr. Smith", "Follow-up on your conference presentation",
              "Dear Mr. Smith,\n\nThank you for your presentation at the technology conference. I found your explanation of how teams can evaluate new tools before adopting them especially useful. The comparison among a limited pilot, a full launch, and a review stage gave me a practical framework for separating genuine value from excitement about a new product.\n\nI would appreciate additional information about the data-governance checklist you briefly mentioned. In particular, how should a small organization decide which data are necessary for a pilot, who should be allowed to access them, and when they should be deleted? If you have an article, sample checklist, or case example suitable for a student, I would be grateful if you could recommend it.\n\nI know your time is valuable, and I appreciate the clarity and balance of your insights. The presentation gave me several questions I can apply to my own research rather than simply accepting technology as automatically beneficial.\n\nSincerely,\n[Your Name]"),
        email(5,
              "You recently attended a photography workshop led by Mr. Chen and found it both informative and engaging.",
              ["Express your gratitude for the workshop experience.",
               "Describe which aspects of the workshop you found most valuable and explain why.",
               "Ask for extra tips or advice on portrait photography, which particularly interests you."],
              "Mr. Chen", "Portrait photography advice",
              "Dear Mr. Chen,\n\nThank you for leading such an informative and engaging photography workshop. I especially valued your demonstration of how changing the direction of natural light can create a different mood. The short practice activity was also helpful because I could immediately compare several compositions instead of only hearing a technical explanation.\n\nI am particularly interested in portrait photography and would appreciate a little additional advice. When a subject feels uncomfortable in front of the camera, how do you help the person relax while still keeping the pose natural? I would also like to know whether you recommend starting with a fixed focal length or a zoom lens for indoor portraits.\n\nThank you again for sharing your experience. Your guidance has made me more confident about practicing intentionally.\n\nBest regards,\n[Your Name]"),
        email(6,
              "Your friend, Alex, has been feeling overwhelmed with university assignments. You have noticed that he is struggling to keep up with his workload and is not taking proper care of his health. You want to offer some helpful advice.",
              ["Describe to Alex what you have recently noticed about him.",
               "Explain why it is important to maintain good health.",
               "Suggest some specific strategies Alex can use to manage his stress and workload."],
              "Alex", "Managing workload and health",
              "Hi Alex,\n\nI have noticed that you have been staying in the library very late, skipping meals, and looking exhausted in class. You also mentioned that several assignments feel equally urgent, which seems to be making it hard for you to begin any of them.\n\nProtecting your health is important because sleep, regular food, and movement support concentration and memory. Working longer while exhausted can actually create more mistakes and make each task take longer. Your well-being also matters beyond grades, and this level of pressure should not become your normal routine.\n\nTry listing every deadline and dividing each assignment into one-hour steps. Choose the two most urgent steps for each day, schedule short breaks, and stop work at a fixed time. You could also ask a professor whether a difficult task can be clarified and visit the academic support office for planning help. If you want, we can make the schedule together tonight.\n\nBest,\n[Your Name]"),
        email(7,
              "You are a college student taking a biology course. You have been struggling with some recent assignments and have decided to seek help from your professor, Dr. Smith. You want to understand the topics better and improve your grades.",
              ["Mention the specific topics you are struggling with.",
               "Ask for suggestions on how to improve your understanding.",
               "Request a meeting with Dr. Smith to discuss further."],
              "Dr. Smith", "Request for help with biology assignments",
              "Dear Dr. Smith,\n\nI am having difficulty with two topics in the recent biology assignments: interpreting genetic crosses with linked genes and explaining how enzyme activity changes under different conditions. I can follow the examples in class, but I often choose the wrong relationships when I solve a new problem independently.\n\nCould you recommend a way to check my reasoning before I look at the answer? I would also appreciate suggestions for practice problems or diagrams that show the steps between the data and the final conclusion. I have reviewed my notes and marked the points where my calculations or explanations begin to go wrong.\n\nWould you be available for a twenty-minute meeting on Wednesday after 2:00 p.m. or Thursday morning? I can bring two completed assignments so that we can identify the pattern in my mistakes. If neither time works, I am happy to attend your next office hour.\n\nSincerely,\n[Your Name]"),
        email(8,
              "You recently started a job on campus. Your academic advisor, Professor Patel, has been helpful in guiding you through your studies. However, you are finding it difficult to balance your work schedule with your academic commitments.",
              ["Thank her for the support and guidance she has provided.",
               "Discuss why you are having difficulty completing your academic commitments.",
               "Explain how you plan to balance your academic commitments and work plans."],
              "Professor Patel", "Balancing my work and academic schedule",
              "Dear Professor Patel,\n\nThank you for the guidance you have given me this semester, especially your help in planning my course sequence and identifying academic support resources. Your advice has made it easier to set realistic goals.\n\nSince starting my campus job, I have struggled to complete reading and assignments on time. Two of my work shifts end shortly before evening classes, and I often begin studying when I am already tired. I also accepted extra hours without comparing them carefully with major deadlines, so several commitments have accumulated in the same week.\n\nI plan to limit my job to three fixed shifts, share my examination and project calendar with my supervisor, and reserve two mornings for uninterrupted coursework. I will review the schedule each Sunday and request changes before conflicts become urgent. Could we discuss whether this plan is realistic and which academic deadlines should receive priority? I would value your feedback.\n\nSincerely,\n[Your Name]"),
        disc(9, "Community Studies", "Professor Gupta", "diaz.png",
             "We are studying how communities benefit when people from different cultural backgrounds live and work together. Some researchers believe that cultural diversity helps communities by bringing new foods, languages, art forms, and business ideas that create economic opportunities and enrich daily life. Others believe that shared cultural traditions and common languages make it easier for people to communicate and cooperate effectively. Which factor do you think contributes more to building strong, successful communities?",
             [post("Kelly", "kelly.png", "Cultural diversity contributes more because people with different experiences can introduce new services, ideas, and perspectives that help a community adapt."),
              post("Andrew", "andrew.png", "Shared traditions contribute more because common expectations and language make cooperation easier and strengthen trust among neighbors.")],
             [{"title": "Diversity Builds Capacity",
               "text": "Cultural diversity contributes more to a community's long-term strength because it expands the range of solutions residents can create. When people bring different professional experiences, languages, and customs, they often notice needs that an established group may overlook. For example, a multilingual resident might help a local clinic explain appointments to families who previously avoided the service because instructions were unclear. That change improves access while also building trust between institutions and new residents. Andrew is right that shared expectations can make cooperation faster at first. However, communities can develop common civic rules without requiring everyone to share the same background. In fact, working together on practical goals can gradually create new shared traditions. Diversity is therefore the stronger foundation because it supports innovation and allows a community to respond effectively as its population and challenges change."},
              {"title": "Shared Habits First",
               "text": "Shared traditions and a common language contribute more when the goal is reliable everyday cooperation. A community depends on residents understanding basic expectations about public spaces, local meetings, and mutual assistance. If those expectations are widely understood, neighbors can organize quickly during a storm, resolve small conflicts, or coordinate a volunteer event without spending most of their time clarifying procedures. Kelly's point about new ideas is valuable, and diversity can certainly enrich local businesses and culture. Still, those benefits are easier to realize after people have a common framework for communication and trust. Shared traditions do not need to erase anyone's identity; they can be inclusive civic habits, such as an annual neighborhood service day. For that reason, a limited set of shared practices is the more important factor in turning a diverse population into a stable and successful community."}]),
        disc(10, "Urban Planning", "Professor Achebe", "diaz.png",
             "We've been discussing strategies for managing urban growth. One approach is to focus on expanding public transportation to reduce traffic congestion and pollution. Another approach is to create more green spaces like parks and gardens to improve residents' quality of life. Which strategy do you think is more effective in managing urban growth? Why?",
             [post("Andrew", "andrew.png", "I believe expanding public transportation is the most effective approach. It reduces traffic congestion in growing cities and neighborhoods and provides residents with a convenient way to travel around. For example, in my town, it's easy to catch a bus or a tram to access shopping and cultural events, and it's affordable."),
              post("Kelly", "kelly.png", "I think creating green spaces is the best response to the harmful side-effects of urban growth. Parks and gardens make urban areas more attractive and livable. My town is currently renovating its park system. Not only are green spaces more attractive than busy streets and sidewalks, they are more interesting and pleasant, too.")],
             [{"title": "Transit Shapes Growth",
               "text": "Expanding public transportation is the more effective growth strategy because it changes how residents reach jobs, education, and services across the entire city. New housing alone cannot reduce congestion if every added household must drive. Frequent buses or rail connections allow growth to occur around shared routes, using street space more efficiently and giving people who cannot drive genuine access to opportunity. The service must be reliable enough to shape decisions. Cities should prioritize dedicated lanes, safe walking connections to stops, simple fares, and schedules that cover evenings as well as peak commuting hours. Development rules can then encourage homes and businesses near those routes. Green space remains important, but isolated parks do not solve movement between expanding neighborhoods. Transportation links the parts of a growing city and can reduce the pressure to build more roads and parking. By guiding where development occurs and making daily travel more efficient, public transit manages both the form and consequences of urban expansion."},
              {"title": "Protect Livability Early",
               "text": "Green spaces are more effective for managing urban growth because they preserve environmental and social functions that are difficult to recover after land is fully developed. Connected parks, trees, and gardens can absorb rain, reduce heat around buildings, provide habitat, and give dense neighborhoods places for exercise and informal contact. These benefits occur near where people live and improve daily quality of life even for residents who do not travel far. Cities should plan a network rather than isolated decorative areas. Small neighborhood spaces can connect with larger parks through shaded walking routes, and development can be required to preserve access instead of placing all greenery at the edge of the city. Public transportation addresses movement, but growth is not successful if destinations become crowded, hot, and unhealthy. Green infrastructure sets limits on development and makes density more livable. By protecting land early, cities avoid the much higher difficulty of rebuilding natural and communal space after expansion has consumed it."}]),
        disc(11, "Literature", "Professor Gupta", "diaz.png",
             "Literature includes novels, poems, plays, and stories that express ideas and emotions. Some writers aim to inspire change by showing problems like inequality or injustice. Others focus on entertaining readers through exciting plots or imaginative worlds. Both types of literature influence readers in different ways. Think about how stories can shape how people think or feel. Which do you believe is the main purpose of literature: to inspire change or to entertain? Give reasons to support your view.",
             [post("Claire", "kelly.png", "The main purpose of literature is to inspire social change. Many stories explore serious topics like historical conflicts, unfair treatment, or climate problems. When people read about these issues, they develop an understanding of other people's viewpoints and want to make improvements. Literature can open minds and help readers care about what others think and experience."),
              post("Kelly", "kelly.png", "Literature's primary goal is to entertain. It allows readers to enter new worlds, meet fictional characters, and enjoy surprising events. Even stories with serious themes often include exciting moments. Entertainment helps readers relax, imagine new possibilities, and appreciate creativity, which are also important benefits for individuals and society.")],
             [{"title": "Change Through Attention",
               "text": "Literature's main purpose is to inspire change because stories allow readers to experience the consequences of an issue through individual lives. An argument may explain inequality, but a novel can show how a rule shapes a person's choices, relationships, and sense of possibility over time. That sustained perspective can challenge a reader's assumptions more deeply than a brief statement. Literature rarely tells everyone to take the same action, and that is a strength. By creating empathy and ambiguity, it encourages readers to examine how they participate in a problem and what alternatives they can imagine. Entertainment helps people enter the story, but engagement becomes socially meaningful when it changes what they notice outside the book. Writers cannot guarantee reform, and literature should not be reduced to propaganda. Still, works that make neglected experience visible can alter conversations, values, and eventually behavior. The deepest literary change begins with attention: readers become willing to see a life or injustice they had previously ignored."},
              {"title": "Pleasure Comes First",
               "text": "Literature's primary purpose is to entertain because the pleasure of narrative is what invites readers to continue. Suspense, humor, rhythm, character, and imaginative worlds create an experience that is valuable before any social lesson is identified. Entertainment is not empty. By giving readers mental rest and a space to explore possibilities without real-world consequences, stories support curiosity and emotional renewal. Requiring literature to inspire change can narrow both writing and reading. Authors may feel pressured to deliver an approved message, while readers may ignore craft in order to search for a moral conclusion. Serious themes can still appear, but their impact often depends on the story first being compelling. A reader who cares about a fictional character may reflect on a problem naturally, whereas a work written only to instruct may be abandoned. Protecting entertainment as the central purpose preserves creative freedom and the voluntary attention from which any broader insight must grow."}]),
        disc(12, "Technology Ethics", "Professor Achebe", "diaz.png",
             "This week, we are examining the ethical implications of artificial intelligence. Some technology advocates argue that AI can greatly benefit society by improving efficiency, reducing human errors, and solving complex problems like medical diagnosis and climate prediction. Others worry about serious ethical concerns, such as widespread job displacement, privacy violations through data collection, and potential bias in automated decision-making systems. What do you think are the most significant ethical concerns related to AI development and implementation?",
             [post("Claire", "kelly.png", "I believe the most significant ethical concern about artificial intelligence is widespread job displacement. When AI systems automate tasks previously performed by humans, millions of workers in manufacturing, customer service, transportation, and even professional fields like accounting may lose their employment opportunities permanently, creating economic instability and requiring massive retraining programs that society may not be prepared to provide effectively."),
              post("Kelly", "kelly.png", "I think privacy violations and data misuse represent the most serious ethical concerns related to artificial intelligence. AI systems collect vast amounts of personal information about our daily activities, purchasing habits, location data, and online behavior, often without clear consent or transparency about how this sensitive information will be stored, shared, or potentially used against individuals in the future.")],
             [{"title": "Protect the Transition",
               "text": "Job displacement is the most significant ethical concern because the benefits of artificial intelligence may arrive long before affected workers can adapt. Automation does not merely remove individual tasks; it can change an entire occupation's entry path. If routine junior work disappears, new employees may have fewer chances to gain the experience required for advanced roles. The burden is also uneven. A company can adopt a system quickly, while a worker may need months of training and still lack access to a comparable job nearby. Ethical implementation therefore requires more than announcing that technology will create different opportunities eventually. Employers should identify which roles will change before deployment, provide paid training, and share part of the productivity gain through transition support or redesigned jobs. Governments and schools can coordinate portable credentials that match real openings. AI may improve services, but progress is unjust if people who made an organization successful are treated as disposable costs. Managing the path from old work to new work is therefore a central test of responsible development."},
              {"title": "Keep Data Controllable",
               "text": "Privacy and data misuse are the most serious AI concerns because people can lose control without knowing that a decision is being made about them. An automated system may combine location, purchases, messages, or browsing behavior to infer sensitive traits that a person never chose to disclose. Even if each piece of data was collected separately, the combined profile can affect access to employment, insurance, credit, or public services. Consent is weak when users cannot understand the future uses of information or refuse collection without losing an essential service. Responsible AI should therefore minimize data at the point of collection, separate information gathered for different purposes, and give individuals access to meaningful explanations and correction procedures. Independent reviewers must also be able to test whether data are used beyond the stated purpose. Efficiency cannot justify invisible surveillance. When personal information shapes important decisions, people need the ability to know, challenge, and limit that use; otherwise, automated convenience can quietly undermine autonomy across many parts of life."}]),
        disc(13, "Marketing", "Professor Achebe", "diaz.png",
             "We've been discussing how companies hire popular social media personalities with thousands of followers to promote their products through posts, videos, and reviews on social media platforms. Some marketers believe these influencers can effectively increase sales because their followers trust their personal recommendations and view them as friends rather than advertisers. Others argue that hiring influencers is expensive and unpredictable since their popularity can decline suddenly. Which view about using social media personalities for marketing do you agree with?",
             [post("Claire", "kelly.png", "Social media influencers are highly effective for marketing because they create authentic connections with their audiences. When popular personalities share reviews and demonstrate products in their daily lives, followers trust these recommendations more than traditional advertisements. Influencers also reach specific target groups like young adults, helping companies connect with customers who are genuinely interested in their products."),
              post("Paul", "andrew.png", "I think relying on influencers for marketing can be risky and unpredictable for business success. Their popularity can change quickly due to scandals or changing trends, potentially damaging the brand's reputation. Additionally, many influencer campaigns fail to generate actual sales despite high costs, making it difficult for companies to measure whether their investment produced profitable results and increased revenue.")],
             [{"title": "Useful When Targeted",
               "text": "Social media personalities can increase sales effectively when a product benefits from repeated demonstration and a clearly defined audience. A creator who regularly discusses home cooking, for example, can show how a kitchen tool performs across several recipes rather than displaying it once in a polished advertisement. Followers can ask practical questions, observe limitations, and decide whether the item fits their habits. This extended exposure is valuable because purchase decisions often require more than awareness. Companies should select partners based on audience relevance and past credibility, not follower totals alone. Compensation and sponsorship must be disclosed, and campaign links or codes can help the company distinguish attention from actual purchasing behavior. Brands should also test a small collaboration before committing a large budget. Popularity may change, but that risk can be managed through several well-matched creators and short agreements. When the partnership is measurable, transparent, and useful to the audience, influencer marketing can turn trusted expertise into informed demand."},
              {"title": "Own the Reputation",
               "text": "Relying heavily on influencers is risky because a brand gives part of its reputation to a person it cannot fully control. A creator's audience may change, engagement may decline, or unrelated behavior may suddenly dominate public attention. Even a campaign with many views can fail commercially if followers enjoy the content but have little intention or ability to buy the product. This makes costs and results difficult to predict. Companies should build marketing assets they own, such as useful product information, customer relationships, and consistent service channels. Influencers can be used for limited experiments, but contracts should define disclosure, content review, cancellation, and data access, and no single personality should represent the whole brand. The business must compare sales quality and repeat customers, not only clicks or comments. Personalities can provide temporary reach, yet a durable marketing strategy should survive their departure. When identity and measurement depend on unstable external popularity, the apparent authenticity of influencer promotion becomes a major operational and reputational risk."}]),
        disc(14, "Environmental Science", "Professor Gupta", "diaz.png",
             "We're studying the benefits of different approaches to protecting wildlife and natural environments. Some experts argue that creating parks and wildlife reserves where no human development is allowed is the most effective way to protect animals and ecosystems. Others believe that teaching farmers to reduce pesticide use and preserve soil quality is more important because agriculture affects much larger land areas where both wildlife and food production must coexist. Which approach do you think produces better environmental protection results?",
             [post("Claire", "kelly.png", "Parks and wildlife preserves offer better environmental protection results because endangered species can reproduce there without human interference. When large areas of forests, wetlands, and grasslands remain completely undeveloped, they maintain natural water cycles, prevent soil erosion, and preserve complex food webs that support hundreds of different plant and animal species that cannot survive in agricultural or urban environments."),
              post("Paul", "andrew.png", "Ecologically-friendly agriculture is better for the environment because farmland covers much larger areas than parks and wildlife preserves. When farmers reduce harmful pesticides and plant trees along field borders, they create wildlife habitats and cleaner water systems. These farming practices also allow continued food production while protecting the environment, which is more realistic than converting all land to wilderness areas.")],
             [{"title": "Keep a Protected Core",
               "text": "I agree with Claire that protected parks produce stronger environmental results when the main goal is preventing irreversible loss. Some species need large, connected habitats and cannot survive if every part of the landscape is repeatedly planted, harvested, or exposed to people. A reserve can protect breeding sites, migration routes, and water sources at the same time, so one boundary supports an entire ecological system instead of treating each problem separately. Parks also create reference areas where scientists can observe how an ecosystem functions with limited disturbance. That knowledge can later improve restoration and farming practices elsewhere. Agriculture should certainly become cleaner, but even careful farms are designed primarily for food production and must change crops or methods when economic conditions shift. A legally protected reserve gives vulnerable habitats a stable purpose over many years. Therefore, parks provide the essential core of protection, while sustainable farming should serve as a supporting strategy around them."},
              {"title": "Improve Working Land",
               "text": "Paul's approach would create broader environmental improvement because agriculture shapes everyday conditions across enormous areas. Wildlife does not remain inside park boundaries; animals move through fields, streams, and communities, while polluted water also travels beyond a single farm. If farmers reduce pesticides, protect soil with cover crops, and preserve vegetation beside waterways, many connected habitats improve at once. These methods can also prevent erosion and keep chemicals out of downstream wetlands. Most importantly, farmers can continue producing food, which gives communities a practical reason to maintain the changes instead of viewing conservation as a competing use of land. Parks are indispensable for highly sensitive species, but isolated reserves cannot compensate for harmful practices across the surrounding landscape. Teaching and supporting farmers therefore combines ecological protection with daily economic activity. When sustainable practices become normal on working land, environmental benefits extend beyond a few protected islands and become part of the whole region."}]),
        disc(15, "Everyday Environment", "Professor Gupta", "diaz.png",
             "This week, we're exploring ways people can reduce their environmental impact through daily choices. Consider these specific actions: Choosing to walk, bike, or take public transportation instead of driving; buying fewer new items and repairing them instead of replacing them; reducing energy use by unplugging devices. Which of these actions (or another specific action you can think of) do you believe would have the greatest positive impact on the environment? Why?",
             [post("Claire", "kelly.png", "I believe reducing energy use is the most important thing we can do to protect the environment. If each person consumes a little bit less energy every day by unplugging devices, the result will be lower carbon emissions overall. And reducing carbon emissions helps combat climate change."),
              post("Andrew", "andrew.png", "Personally, I think the most crucial action people can take to help the environment is to recycle and reuse materials instead of throwing them away in the trash. By minimizing the amount of waste they create, individuals can significantly reduce their environmental footprint and conserve natural resources.")],
             [{"title": "Cut Repeated Waste",
               "text": "Reducing everyday energy use can have the greatest impact because it addresses consumption that occurs repeatedly and often without any benefit. Many devices continue drawing power or operating when nobody needs them. Individuals can connect frequently used electronics to switchable power strips, choose sleep settings for computers, and turn off unnecessary lighting before leaving a room. Each action is small, but its advantage is frequency: it can be repeated at home, in classrooms, and at work every day. This approach can also influence purchasing decisions. Once people notice how much energy their routines require, they may prefer efficient appliances or avoid leaving heating and cooling systems at extreme settings. Transportation and material reuse remain important, but they may depend on local services or occasional purchases. Basic energy habits are available in many ordinary situations and can spread easily when families or offices adopt shared routines. By removing waste from recurring activities, people reduce their environmental impact without giving up essential needs."},
              {"title": "Extend Product Life",
               "text": "Reusing and repairing materials should be the priority because this choice reduces demand at both ends of a product's life. Keeping a phone, chair, or jacket in service longer means that fewer replacements need to be manufactured, packaged, and transported. It also prevents usable materials from entering the waste stream too early. A practical repair culture would make this behavior easier. Community workshops could lend tools and teach basic skills, while shops could clearly state whether replacement parts are available. Consumers can contribute by choosing durable products, maintaining them, and donating items they no longer need. This action has an educational effect as well: people begin to evaluate whether a purchase solves a real need or merely replaces something unfashionable. Recycling remains useful when an item cannot be repaired, but reuse preserves more of the labor and material already invested in it. Extending product life therefore changes consumption itself, rather than only managing the waste created afterward."}]),
    ])


REPEATS = [
    ("campus_tour", "You are learning to assist visitors at a university open house. Listen to the speaker and repeat what she says. Repeat only once.", [
        "Welcome to our campus tour.",
        "The enrollment office is straight ahead.",
        "Next door you will see the library.",
        "The cafeteria has many meal options available.",
        "The university lecture halls are located over here.",
        "If you have any questions, please stop by the information desk.",
        "Lastly, please also remember to check the event schedule at the entrance.",
    ]),
    ("travel_agency", "You are working at a travel agency as part of an internship. Your manager is teaching you how to assist customers with booking vacation packages. Listen to the manager and repeat what the manager says. Repeat only once.", [
        "Start with the customer's travel dates.",
        "Suggest flights that match their traveling times.",
        "Propose lodgings that fit their budget and are close to attractions.",
        "Offer travel insurance options to give clients peace of mind.",
        "Recommend guided tours that highlight the local culture.",
        "Before booking the reservation, go over the details with the client.",
        "When customers are ready to pay, process the payment to confirm their booking.",
    ]),
    ("art_gallery", "You are being trained to assist visitors at a university art gallery. Listen to the guide and repeat what the guide says. Repeat only once.", [
        "Sculptures are located in the central hall.",
        "We highlight paintings from local artists.",
        "Visitors can use the touchscreen display to plan their day.",
        "Brochures about new exhibits are available free of charge.",
        "Guests can check in or purchase tickets at the entrance desk.",
        "For additional information, read the wall labels next to each piece of art.",
        "Use the audio device to hear an expert talk about our collection.",
    ]),
]

INTERVIEWS = [
    ("music", "You have agreed to participate in a research study about people's experiences with music. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for agreeing to take part in the study. I'd like to ask you some questions about your experiences with music. First, how important is music in your life? Why?",
         "Music is a meaningful part of my daily life because it helps me regulate my mood and focus. I usually listen to calm instrumental music while commuting or reviewing notes, and that routine makes stressful days feel more manageable. Music also connects me with people. For example, my friends and I exchange playlists, which often leads to conversations about memories and culture. I could live without constant background music, but life would feel less expressive and less emotionally balanced without it."),
        ("Great, that's interesting. Now, if you had to choose, would you rather create music yourself or listen to music created by others? Why?",
         "I would rather listen to music created by others. I do not have enough technical training to compose confidently, whereas listening lets me explore many styles immediately. On a typical week, I might hear jazz while studying, pop music at the gym, and traditional music recommended by a classmate. Each style offers a different mood and perspective. Creating music can be rewarding, but as a listener I can appreciate the skill of many artists and keep discovering sounds I would never produce on my own."),
        ("Okay, noted. Do you think music should be a required part of children's education? Why or why not?",
         "Yes, I think basic music education should be required, although students should not be forced into advanced performance. Learning rhythm, singing, or a simple instrument develops careful listening and persistence. It also gives children a creative way to express feelings that may be difficult to explain directly. In group performances, they must watch one another and cooperate, which strengthens teamwork. Schools should therefore provide an accessible introductory course, while allowing students who are especially interested to continue with more demanding musical training."),
        ("Fair enough. Final question. Some people believe that live music has a stronger impact than recorded music. Do you agree or disagree with that? Why or why not?",
         "I generally agree that live music has a stronger impact. At a concert, the performers react to the audience, and everyone experiences the same unrepeatable moment. I once heard a student orchestra perform a familiar piece, and the energy in the room made it far more moving than the recording I already knew. Recorded music is more convenient and often technically cleaner, so I value it too. Still, the shared atmosphere and small variations in a live performance create a deeper and more memorable emotional response."),
    ]),
    ("gardening", "You have volunteered for a research study at your university about gardening. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about your experiences with gardening. First, do you have a garden or any plants that you take care of? If so, how often do you spend time gardening, and if not, why?",
         "Yes, I have a small garden on my balcony where I grow herbs like basil and mint, as well as some succulents. I spend about twenty minutes each morning watering and checking the plants, and a bit more time on weekends for pruning and repotting. It's a relaxing routine that helps me start my day calmly. I find gardening rewarding because I can see the plants grow and even use the herbs in cooking. It also connects me with nature despite living in the city. Because the routine is short, I can maintain it even during a busy semester."),
        ("Thank you! What kinds of plants or gardens have you seen or heard about that you found interesting or appealing? Describe them and talk about why you found them interesting or appealing.",
         "I find vertical gardens fascinating because they turn bare walls into living art. For example, I saw one in a city park, with ferns and flowering vines cascading down. It's appealing because it maximizes limited space and improves air quality. Herb gardens are also practical and lovely. My neighbor grows basil and mint, which smell wonderful and are used in cooking. These gardens show how plants can blend beauty with function, making urban life greener and more sustainable. That change is realistic because people can see the environmental benefit without giving up convenience."),
        ("Interesting! What challenges do you think people face when trying to grow plants or maintain a garden?",
         "I think one major challenge is dealing with pests and diseases. Insects like aphids or fungal infections can quickly damage plants if not managed properly. Another issue is maintaining the right soil conditions, such as pH balance and nutrients, which requires regular testing and amendments. Weather unpredictability, like unexpected frosts or droughts, can also harm plants. Finally, time commitment is a challenge; gardens need consistent watering, weeding, and pruning, which can be demanding for busy individuals. Checking the plants every few days helps people catch small problems before they damage the whole garden."),
        ("Great! Some people believe that gardening can have positive effects on personal mental health and well-being. Do you agree or disagree with this viewpoint? Why?",
         "Yes, I agree that gardening positively impacts mental health. It reduces stress by connecting us with nature, and it provides a sense of accomplishment when plants thrive, which can boost self-esteem. Gardening also encourages mindfulness, because focusing on tasks like watering or weeding helps clear the mind. These benefits collectively improve well-being, making gardening a valuable therapeutic activity. That routine is simple enough to continue even during a demanding school week. A practical health habit matters more to me than a plan that looks impressive but never lasts."),
    ]),
    ("sleep", "You have volunteered for a research study about sleep habits. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for your time. I'd like to ask you some questions about your sleep habits. First, do you usually go to bed early or late?",
         "I usually go to bed late, around midnight or even later. This habit started in college when I had to study late for exams, and it stuck with me. I find that I'm more productive at night because it's quieter and I can focus better. However, I do try to ensure I get at least seven hours of sleep to function well the next day. Sometimes I regret staying up late when I feel tired in the morning, but overall it works for my schedule. Reviewing the plan each evening also lets me adjust calmly when something unexpected happens."),
        ("Okay, thanks. What is your typical routine before bedtime? What do you usually do before going to bed?",
         "My typical bedtime routine starts around 10 p.m. First, I brush my teeth and wash my face to feel refreshed. Then I change into comfortable pajamas. I often read a book for about twenty minutes to unwind, avoiding screens to help me fall asleep faster. Finally, I set my alarm and do some light stretching before getting into bed. This routine helps me relax and supports a better night's rest, even when the day has been busy."),
        ("Great. Now, some people have trouble sleeping when they stay overnight at a hotel or at a friend's house. Are you able to sleep well in unfamiliar places? Why or why not?",
         "I generally have no trouble sleeping in unfamiliar places, as long as the environment is reasonably quiet and comfortable. I think my ability to adapt comes from years of traveling for work and leisure, which has trained me to relax even in new settings. I also bring a familiar pillow or use a sleep mask to create a sense of normalcy. However, if the place is too noisy or the bed is very uncomfortable, I might struggle a bit. Overall, I can sleep well most of the time."),
        ("Many parents worry about their teenage children getting enough sleep. Some high schools have considered starting later in the morning to allow teenage students more time to sleep each night. What do you think of this idea? Explain why.",
         "I strongly support the idea of starting high school later in the morning. Teenagers have a natural biological shift that makes it hard to fall asleep early, so later start times align with their sleep cycles. This change can improve their health, academic performance, and mood. Studies show that schools with later start times report fewer absences and better grades. Although adjusting schedules might be challenging, the benefits outweigh the drawbacks. Ultimately, prioritizing teenagers' sleep needs is crucial for their development."),
    ]),
    ("musical_experiences", "You are participating in a research study about musical experiences. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thanks for participating. I'd like to ask you some questions about your musical experiences. Do you play a musical instrument or sing? If not, what would you choose to learn how to do?",
         "I play basic guitar. I started with online lessons because I wanted to accompany simple songs rather than perform professionally. At first, changing chords smoothly was frustrating, so I practiced for fifteen minutes a day instead of attempting long sessions. After several months, I could play a few complete songs for friends. The instrument has taught me patience because improvement is easy to hear but cannot be rushed. I still make mistakes, yet playing provides a satisfying break from academic work and helps me appreciate the structure of the music I listen to."),
        ("Can you describe one memorable experience you have had with music? What made it special?",
         "One memorable experience was attending a student concert in which a close friend performed a piano solo. I had heard the piece during rehearsals, but the formal performance felt completely different. The hall became silent, and I could see how carefully my friend controlled each phrase despite being nervous. When the final note ended, the audience paused before applauding, which made the moment feel unusually sincere. It was special because I understood the effort behind the performance. The concert turned months of private practice into a shared emotional experience."),
        ("I see. When you listen to music, do you prefer listening by yourself or with others?",
         "I usually prefer listening by myself because I can choose music that matches my exact mood and pay attention without conversation. During a commute, for example, I might listen to an entire album and notice how one song connects to the next. That kind of focused listening is difficult in a group. I still enjoy sharing music with friends at gatherings, especially when the purpose is to create energy. However, when I want to understand a new artist or use music to relax, listening alone gives me more freedom and a deeper experience."),
        ("Fascinating. Some people believe that music education should be an important part of the school curriculum. Do you agree or disagree with this viewpoint? Please explain your reasons.",
         "I agree that music education should be an important part of the curriculum. It develops careful listening, coordination, and persistence in ways that complement academic subjects. When students perform together, they also learn to follow a shared structure while responding to other people. Schools do not need to train everyone for professional performance; a basic course can include rhythm, singing, simple instruments, and exposure to different traditions. Making that instruction available at school is especially valuable for children whose families cannot afford private lessons or musical equipment."),
    ]),
]


def build_speaking(pid, title, form, interview=None):
    tasks = []
    modules = []
    if form:
        key, instruction, samples = REPEATS[form - 1]
        for i, sample in enumerate(samples, 1):
            fname = "repeats_%02d_%s_q%02d.mp3" % (form, key, i)
            NEED.append((fname, "speaking/S-R%02d_q%d.mp3" % (form, i)))
            tasks.append({
                "type": "repeat",
                "module": 1,
                "id": i,
                "speakSec": 15 if i < 7 else 18,
                "instruction": instruction,
                "audio": AUDIO + fname,
                "sample": sample,
            })
        modules.append({"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"})
    if interview:
        ikey, i_instruction, items = INTERVIEWS[interview - 1]
        start = 8 if form else 1
        mod = 2 if form else 1
        modules.append({"n": mod, "timeSec": 360, "from": start, "to": start + 3, "label": "Take an Interview"})
        for i, (stem, sample) in enumerate(items, 1):
            fname = "interviews_%02d_%s_q%02d.mp3" % (interview, ikey, i)
            NEED.append((fname, "speaking/S-I%02d_q%d.mp3" % (interview, i)))
            tasks.append({
                "type": "interview",
                "module": mod,
                "id": start - 1 + i,
                "speakSec": 45,
                "instruction": i_instruction,
                "stem": stem,
                "audio": AUDIO + fname,
                "sample": sample,
            })
    return {
        "id": pid,
        "title": title,
        "set": SET,
        "skill": "speaking",
        "modules": modules,
        "tasks": tasks,
    }


def copy_audio():
    dest = os.path.join(ROOT, AUDIO)
    os.makedirs(dest, exist_ok=True)
    seen = set()
    for fname, rel in NEED:
        if fname in seen:
            continue
        seen.add(fname)
        src = os.path.join(SRC, rel)
        if not os.path.isfile(src):
            raise SystemExit("missing audio " + src)
        out = os.path.join(dest, fname)
        shutil.copy2(src, out)
        os.chmod(out, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
    print("copied", len(seen), "audio files")


if __name__ == "__main__":
    dump("2025-08-22-reading.json", build_reading())
    dump("2025-08-22-listening.json", build_listening())
    dump("2025-08-22-writing.json", build_writing())
    dump("2025-08-22-speaking.json", build_speaking(
        ID, TITLE + " · 口语 Form 1", 1, 1))
    dump("2025-08-22-speaking-f2.json", build_speaking(
        ID + "-s2", TITLE + " · 口语 Form 2", 2, 2))
    dump("2025-08-22-speaking-f3.json", build_speaking(
        ID + "-s3", TITLE + " · 口语 Form 3", 3, 3))
    dump("2025-08-22-speaking-f4.json", build_speaking(
        ID + "-s4", TITLE + " · 口语 Form 4", None, 4))
    copy_audio()
