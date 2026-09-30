#!/usr/bin/env python3
"""Build 7.18 China offline TOEFL. Run: python3 scripts/build_toefl_718cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月/7.18-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-07-18/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-07-18"
SET = "7.18"
TITLE = "新托福 7.18 国内线下"
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


def clip(typ, title, module, fname, questions):
    NEED.append((fname, fname))
    return {
        "type": typ,
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
    t, n = cw("Craftsmanship as Art", 1, n, [
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
    tasks.append(t)
    t, n = cw("Rock Formations", 1, n, [
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
    t, n = cw("Prehistoric Kinship", 1, n, [
        "The role of kinship was central to the social structure of prehistoric communities. Kinship not only structured family relationships but also shaped how resources were shared, labor was organized, and social hierarchies were maintained within the group. ",
        ("Archaeo", "Archaeological"),
        " evidence ",
        ("sugg", "suggests"),
        " that ",
        ("indiv", "individuals"),
        " held ",
        ("spec", "specific"),
        " roles ",
        ("ba", "based"),
        " on ",
        ("a", "age"),
        " and ",
        ("gen", "gender"),
        ", contributing ",
        ("t", "to"),
        " a ",
        ("sophis", "sophisticated"),
        " division ",
        ("o", "of"),
        " labor. The intricacy of these social structures is further evidenced by the existence of ceremonial sites, which indicate collective activities and social gatherings.",
    ])
    tasks.append(t)
    t, n = cw("Price Elasticity", 1, n, [
        "Supply and demand are fundamental concepts in economics because they determine the price and availability of goods or services. When ",
        ("the", "there"),
        " is ",
        ("mo", "more"),
        " demand ",
        ("f", "for"),
        " a ",
        ("pro", "product"),
        ", suppliers ",
        ("m", "may"),
        " make ",
        ("i", "it"),
        " more ",
        ("expe", "expensive"),
        " to ",
        ("incr", "increase"),
        " profits. ",
        ("Conve", "Conversely"),
        ", an ",
        ("exc", "excess"),
        " supply can lead to price reductions. Market equilibrium occurs when supply matches demand, resulting in stable prices. The real world, however, is rarely as simple as this. Various factors influence these dynamics, including consumer preferences, production costs, and external events.",
    ])
    tasks.append(t)
    t, n = cw("Color in Art", 1, n, [
        "Pigments are substances that provide color to materials, and they can be derived from various natural sources, such as minerals and plants. It ",
        ("w", "was"),
        " once ",
        ("com", "common"),
        " for ",
        ("art", "artists"),
        " to ",
        ("cre", "create"),
        " their ",
        ("o", "own"),
        " paints ",
        ("b", "by"),
        " mixing ",
        ("sev", "several"),
        " pigments ",
        ("toge", "together"),
        ". This ",
        ("pro", "process"),
        " was ",
        ("ti", "time"),
        "-consuming and required detailed knowledge of pigments—their chemical properties, how they interact with different media, and their durability over time. But it also allowed painters to give their artworks a truly unique color palette.",
    ])
    tasks.append(t)
    t, n = cw("Neolithic Pottery", 1, n, [
        "Pottery is an ancient craft that involves shaping and firing clay in special wood-fired ovens (kilns) to create functional and decorative objects. Early ",
        ("po", "pots"),
        " were ",
        ("sha", "shaped"),
        " by ",
        ("ha", "hand"),
        " and ",
        ("hea", "heated"),
        " in ",
        ("sim", "simple"),
        " kilns, ",
        ("prod", "producing"),
        " ceramics ",
        ("th", "that"),
        " lasted ",
        ("lon", "longer"),
        ". As ",
        ("soci", "societies"),
        " developed, ",
        ("techn", "techniques"),
        " became more refined, with different cultures creating distinct styles. Over time, pottery evolved into both a practical craft and a significant form of artistic and cultural expression. Pottery has been practiced by cultures worldwide, reflecting their unique artistic traditions and functional needs.",
    ])
    tasks.append(t)
    t, n = cw("Ocean Currents", 1, n, [
        "Ocean currents are critical components of Earth's climate system, influencing weather patterns and marine ecosystems. Driven ",
        ("b", "by"),
        " wind, ",
        ("temper", "temperatures"),
        " changes, ",
        ("a", "and"),
        " differences ",
        ("i", "in"),
        " salinity, ocean currents ",
        ("distr", "distribute"),
        " heat ",
        ("acr", "across"),
        " the ",
        ("gl", "globe"),
        ". The Gulf Stream, ",
        ("f", "for"),
        " instance, ",
        ("wa", "warms"),
        " the North Atlantic Current, ",
        ("affe", "affecting"),
        " climate in Europe. Deep ocean currents, known as thermohaline circulation, play a role in regulating global temperatures and carbon dioxide levels. Research in oceanography continues to reveal the complexities of these dynamic systems.",
    ])
    tasks.append(t)
    tasks.append(daily("Kintsugi", 1, "Read an article in a student magazine.", {
        "kind": "card",
        "kicker": "Student Magazine",
        "title": "Kintsugi",
        "body": (
            "Kintsugi, an ancient Japanese art, transforms broken pottery into objects of beauty by highlighting, not hiding, their cracks. "
            "Artisans use lacquer mixed with powdered gold, silver, or platinum to repair fractures, creating pieces that often become more valued than their original form.\n\n"
            "Originating in the late fifteenth century, kintsugi reflects the philosophy of wabi-sabi, which honors imperfection and transience. "
            "Its message extends beyond ceramics, inspiring personal growth and resilience by advising people to embrace flaws as part of life's narrative. "
            "Rather than viewing damage as failure, kintsugi reframes it as transformation, symbolizing strength, authenticity, and renewal in a perfection-driven world.\n\n"
            "Today, workshops and studios worldwide teach both its technical craft and its profound philosophy, offering learners not only artistic skills but insights into acceptance, individuality, and creative expression. "
            "Kintsugi stands as a timeless reminder that beauty lies in uniqueness and in the stories our cracks reveal, an idea that applies to academic life and beyond."
        ),
    }, [
        q(n, "According to the article, what philosophical perspective does kintsugi promote?", {
            "A": "Minimalism, emphasizing simplicity and the elimination of excess",
            "B": "Ethics, focusing on honor and discipline in craftsmanship",
            "C": "Humility, valuing imperfection and the transient nature of life",
            "D": "Purity, highlighting spiritual cleanliness and ritual renewal"}, "C"),
        q(n + 1, "What does the article suggest about the symbolic meaning of repairing pottery with precious metals?", {
            "A": "Wealth and luxury are essential for authentic art.",
            "B": "Flaws can be turned into sources of value and beauty.",
            "C": "Artisans prioritize aesthetics over philosophical significance.",
            "D": "Objects lose their cultural value when restored with cheap materials."}, "B"),
        q(n + 2, "Why does the author mention a perfection-driven world?", {
            "A": "To argue that modern society has completely abandoned traditional art forms",
            "B": "To suggest that flawless craftsmanship is the goal of contemporary design",
            "C": "To contrast kintsugi's philosophical message with a common present-day attitude",
            "D": "To explain why kintsugi techniques are rarely used in professional pottery today"}, "C"),
    ]))
    n += 3
    tasks.append(academic("Carthage's Trade Network", 2, [
        "Carthage, founded by Phoenician merchants around 814 B.C.E., became a powerful city-state due to its strategic location on the Mediterranean. This position allowed Carthage to establish a vast trade network that extended across the Mediterranean and into Africa, Europe, and Asia. Carthaginian traders dealt in goods such as silver, gold, tin, and textiles.",
        "The Carthaginians excelled in maritime technology, constructing advanced ships for long-distance journeys and bulky cargo transport. They developed efficient trade routes and set up colonies, expanding their economic reach. Their prowess in navigation and trade transformed Carthage into one of the wealthiest cities in the ancient world. Carthage's wealth was also built on innovations in agriculture. Carthaginian farmers employed advanced irrigation techniques and crop rotation, leading to abundant harvests that supported both local consumption and export.",
        "However, Carthage's rise did not come without challenges. Its growing wealth and dominance in trade led to rivalry with Rome. The Punic Wars, a series of three wars fought against Rome from 264 to 146 B.C.E., were rooted in competition for control of Mediterranean trade routes. Despite initial successes, Carthage was ultimately defeated. The final blow came when the Romans launched a brutal siege on Carthage, culminating in the city's destruction.",
    ], [
        q(n, "All of the following contributed to the status of Carthage as a wealthy and powerful city-state EXCEPT", {
            "A": "its geographic position.",
            "B": "its trade network across three continents.",
            "C": "its large fishing industry.",
            "D": "its ship-building technology."}, "C"),
        q(n + 1, "The passage indicates which of the following about Carthage's maritime technology?", {
            "A": "Carthage's ships were designed primarily for small items of high value.",
            "B": "Carthage's ships were not as advanced as Roman ships.",
            "C": "Carthaginians developed a system of switching ships at colonial ports.",
            "D": "Carthaginians were skilled at navigating over long distances."}, "D"),
        q(n + 2, "What can be concluded from the passage about Carthaginian agriculture?", {
            "A": "It was far inferior to Carthaginian maritime technology.",
            "B": "It produced more than enough food to feed the Carthaginians.",
            "C": "Its innovations borrowed much from Roman technical knowledge.",
            "D": "It was transformed by farmers from Africa, Europe, and Asia."}, "B"),
        q(n + 3, "What can be inferred about the consequences of Carthage's success?", {
            "A": "It led to mutually beneficial relations with Rome.",
            "B": "It caused internal strife among Carthaginian traders.",
            "C": "It led to a neglect of the military.",
            "D": "It contributed to external conflicts."}, "D"),
        q(n + 4, 'The phrase "culminating in" in the final sentence is closest in meaning to', {
            "A": "revealing.", "B": "ending with.", "C": "coinciding with.", "D": "following."}, "B"),
    ]))
    n += 5
    tasks.append(academic("Social Networks and Influence", 2, [
        "Computational sociology studies how social networks—like friendships, professional connections, or online communities—affect how people think and act. Instead of just drawing diagrams of who is connected to whom, researchers now look more closely at how frequent interactions shape behavior. If someone regularly chats with a group of friends who share strong opinions about climate change, they may gradually adopt similar views. These influences are especially strong when the conversations are emotionally charged or align with the person's values.",
        {"insert": "A", "t": "Interestingly, it is not always the most famous or powerful people who have the biggest impact."},
        {"insert": "B", "t": "Everyday conversations—like repeated exchanges between coworkers—can be more influential than a single message from a celebrity or expert. Researchers use computational models to analyze how messages spread."},
        {"insert": "C", "t": "An accurate model can predict which types of messages are likely to spread widely."},
        {"insert": "D"},
        "Still, predicting human behavior is incredibly complex. People are shaped by their culture, social norms, and personal experiences, which makes it hard to build models that work universally. For example, a message that spreads quickly in one country might fall flat in another due to different cultural values. The real challenge lies in understanding how all these subtle factors interact to drive large-scale changes in behavior.",
    ], [
        q(n, "Identify the sentence in paragraph 1 that describes how repeated interaction can influence a person's beliefs.", {
            "A": "Computational sociology studies how social networks—like friendships, professional connections, or online communities—affect how people think and act.",
            "B": "Instead of just drawing diagrams of who is connected to whom, researchers now look more closely at how frequent interactions shape behavior.",
            "C": "If someone regularly chats with a group of friends who share strong opinions about climate change, they may gradually adopt similar views.",
            "D": "These influences are especially strong when the conversations are emotionally charged or align with the person's values."}, "C"),
        q(n + 1, "What do computational sociologists study?", {
            "A": "How shared opinions strengthen friendship",
            "B": "Why complex diagrams are difficult to draw",
            "C": "Why emotional conversations are ineffective",
            "D": "How human behavior is affected by frequent interactions"}, "D"),
        q(n + 2, 'The word "incredibly" in the passage is closest in meaning to', {
            "A": "generally", "B": "extremely", "C": "somewhat", "D": "often"}, "B"),
        q(n + 3, "What makes human behavior difficult to model?", {
            "A": "The interaction of many cultural, social, and personal factors",
            "B": "The rapid spread of all messages",
            "C": "The movement of people among countries",
            "D": "A lack of cooperation among researchers"}, "A"),
        insert_q(n + 4, "In fact, influence often emerges from the bottom up, rather than being imposed from the top down.", "B"),
    ]))
    n += 5
    tasks.append(academic("Quantum Dots", 2, [
        "Quantum dots are tiny semiconductor particles with unique optical properties, making them valuable in display technology. When exposed to light, these nanoparticles emit bright, pure colors that can be finely tuned by varying their size. This allows for more vibrant and accurate colors in screens, surpassing traditional display technologies. Their application in displays has revolutionized the consumer electronics industry. For example, quantum dot-enhanced televisions offer a broader color spectrum and energy conservation compared to conventional light-emitting diode (LED) displays because they require less backlighting.",
        "Environmental benefits are another advantage. Traditional displays often use harmful heavy metals like cadmium and lead. Quantum dots can be made from less toxic materials, and researchers are working on cadmium-free quantum dots to further reduce environmental impact.",
        "The manufacture of quantum dots requires extreme precision. As a result, challenges remain in scaling up production. However, this is a worthwhile endeavor because quantum dots potentially have many applications outside of electronics, such as in biological research. Their small size and bright emission are ideal for tagging and tracking molecules in living organisms. This allows for long-term observation of dynamic biological processes.",
    ], [
        q(n, "The color of quantum dots can be controlled by changing", {
            "A": "their size after exposure to light.",
            "B": "the direction in which they are displayed.",
            "C": "the amount of light they are exposed to.",
            "D": "the color of the light they are exposed to."}, "A"),
        q(n + 1, "What makes quantum dot technology in televisions efficient?", {
            "A": "The vibrancy of the colors.",
            "B": "The reduced need for backlighting.",
            "C": "The larger color spectrum.",
            "D": "The size of the particles."}, "B"),
        q(n + 2, "What is identified as an environmental benefit of quantum dots?", {
            "A": "The ability to make cadmium more pure.",
            "B": "The ability to remove lead from living organisms.",
            "C": "Limiting environmental impacts to small areas.",
            "D": "Less use of some poisonous substances."}, "D"),
        q(n + 3, 'Why does the passage state that the "manufacture of quantum dots requires extreme precision"?', {
            "A": "To imply that quantum dots' environmental impact might increase.",
            "B": "To praise the hard work of quantum dot manufacturers.",
            "C": "To challenge the claim that using quantum dots is worthwhile.",
            "D": "To explain why the production of quantum dots is difficult to increase."}, "D"),
        q(n + 4, "How can biologists use quantum dots?", {
            "A": "For studying very small living organisms.",
            "B": "For observing the movement of molecules.",
            "C": "For including electronic tools in research.",
            "D": "For making some biological processes more dynamic."}, "B"),
    ]))
    n += 5
    tasks.append(academic("Understanding Ecological Systems Theory", 2, [
        "Ecological Systems Theory, introduced by Urie Bronfenbrenner, revolutionized our perception of human psychological development.",
        {"insert": "A", "t": "It posits that individuals are shaped by interactions among multiple overlapping environmental systems."},
        {"insert": "B", "t": "This theory reshaped developmental research, offering a multifaceted lens that surpasses earlier, linear models."},
        {"insert": "C", "t": "By considering the dynamic interplay between a person and their environment, it highlights the multifactorial nature of psychological growth."},
        {"insert": "D"},
        "The theory delineates several environmental layers, beginning with the microsystem, which refers to the institutions and groups that most directly impact the child's development, such as family and school. The mesosystem encompasses the relationships among the microsystems, such as the impact of a teacher's communication with parents on a child's education. Beyond these, the exosystem consists of indirect influences like a parent's workplace stress subtly affecting the home environment. The macrosystem, encompassing broader cultural and societal contexts, frames these interactions with underlying norms and policies.",
        "While Bronfenbrenner's model offers an intricate framework, it is not without critique. Some argue that the model underestimates the role of technology, which has created virtual microsystems that transcend geographical limits. Despite these critiques, the theory remains influential in fields ranging from education to public policy, prompting continuous exploration of its applications and adaptations.",
    ], [
        q(n, "Why does the author mention a teacher's communication with parents in paragraph 2?", {
            "A": "To illustrate the interactions among microsystems that characterize the mesosystem",
            "B": "To support the claim that the institutions of the microsystem affect children directly",
            "C": "To show that Bronfenbrenner's theory is primarily linear",
            "D": "To suggest that microsystems are more important than the mesosystem"}, "A"),
        q(n + 1, 'The phrase "subtly affecting" in the passage is closest in meaning to', {
            "A": "affecting in harmless but unpredictable ways",
            "B": "affecting in long-lasting ways",
            "C": "affecting in ways both positive and negative",
            "D": "affecting in small, barely noticeable ways"}, "D"),
        q(n + 2, "The passage suggests that criticisms of Bronfenbrenner's model call for which of the following?", {
            "A": "Its replacement with a less intricate framework",
            "B": "Its modification to include virtual interactions",
            "C": "Its replacement with a model that gives greater consideration to geographical boundaries",
            "D": "Its exclusion from fields such as education and public policy"}, "B"),
        q(n + 3, "Which of the following best describes the influence of Ecological Systems Theory?", {
            "A": "It has had little impact on psychology but has unexpectedly affected other fields.",
            "B": "It revolutionized the field of human psychology but is not taken seriously in other fields.",
            "C": "It changed the way human psychology is understood and continues to influence other fields.",
            "D": "It has gone mostly unnoticed among psychologists and has had little impact on other fields."}, "C"),
        insert_q(n + 4, "Each one plays a distinct role in shaping behavior.", "B"),
    ]))
    n += 5
    tasks.append(academic("Bird Migration", 2, [
        "Every year, millions of birds travel huge distances to wintering grounds, and then back to breeding grounds when warmer weather returns there. Bird migration evolved in response to climatic changes. During the Ice Age, when average temperatures were frigid, migrating birds had a survival advantage, and the behavior became widespread.",
        "Migration is also linked to resource availability. Arctic terns, which undertake the longest migrations of any animal by flying from their summer breeding grounds in Earth's north polar (Arctic) regions to their wintering grounds in Earth's south polar regions, feed primarily on small fish and other small marine animals. These prey are most abundant when increased sunlight results in the increased availability of algae, the microscopic marine plantlike organisms that are food for the tiny marine animals known as zooplankton, which are in turn consumed by terns' prey.",
        "Not all birds migrate. Rock ptarmigans also live in Arctic and sub-Arctic regions. Instead of flying to warmer climes in winter, they shelter in snow burrows and reduce activity to conserve energy. They feed on plants like birch and willow trees, which are available in their habitat year-round. The divergence between migratory and sedentary species represents different adaptations to environmental pressures.",
    ], [
        q(n, "The passage implies that bird migration began when", {
            "A": "wintering grounds were closer to breeding grounds than they are now.",
            "B": "areas suitable for breeding were smaller than they are now.",
            "C": "there were many more birds than there are now.",
            "D": "climates were generally much colder than they are now."}, "D"),
        q(n + 1, 'What is the passage explaining when it mentions that "increased sunlight results in the increased availability of algae"?', {
            "A": "Why terns' migrations result in increased food availability for them.",
            "B": "Why some tiny marine organisms migrate for long distances.",
            "C": "Why terns depend on sunlight while traveling long distances.",
            "D": "Why terns benefit from the migration of zooplankton."}, "A"),
        q(n + 2, "The passage supports all of the following statements about Arctic terns EXCEPT:", {
            "A": "They take different migration routes depending on resource availability.",
            "B": "They migrate over longer distances than all other birds do.",
            "C": "They spend much of their lives in regions around Earth's poles.",
            "D": "They eat mostly small animals living in sea water."}, "A"),
        q(n + 3, "Why does the passage provide information about rock ptarmigans?", {
            "A": "To emphasize the usefulness of snow burrows in their habitat.",
            "B": "To contrast their behavior to that of Arctic terns.",
            "C": "To show that birch and willow trees provide food to both migratory and sedentary birds.",
            "D": "To provide another example of migratory birds."}, "B"),
        q(n + 4, 'The word "shelter" in the passage is closest in meaning to', {
            "A": "move.", "B": "land.", "C": "seek food.", "D": "take protection."}, "D"),
    ]))
    n += 5
    tasks.append(academic("Ancient Air in Glaciers", 2, [
        "Glaciers, repositories of ancient ice, serve as frozen libraries of Earth's climatic history. As snow accumulates and compresses over centuries, it traps air bubbles that create tiny atmospheric snapshots. These bubbles are crucial for understanding climate evolution. By analyzing the gases within the bubbles, researchers are able to reconstruct past concentrations of greenhouse gases like carbon dioxide and methane, revealing both natural climate cycles and the escalating impact of human activity.",
        "Though many glaciers are retreating due to rising temperatures, surviving ones offer a window into the past. Scientists drill deep into the ice to extract cylindrical cores, whose layers, much like tree rings, correspond to distinct time periods. These layers contain more than just gases: they hold chemical and physical markers of past environmental events. Ice cores can reveal data about volcanic eruptions via ash and sulfate layers, solar activity via isotopic changes, and forest fires via trapped particulates and black carbon.",
        "Recent studies underscore the precarious future of these icy archives. As glaciers melt, they contribute to rising sea levels and the risk that invaluable climate data will be lost increases. The urgency to study and preserve these records grows. While scientists race against time, the question remains: what secrets do these frozen giants still hold?",
    ], [
        q(n, "Identify the sentence in paragraph 1 that explains the natural process by which climate data is preserved.", {
            "A": "Glaciers, repositories of ancient ice, serve as frozen libraries of Earth's climatic history.",
            "B": "As snow accumulates and compresses over centuries, it traps air bubbles that create tiny atmospheric snapshots.",
            "C": "These bubbles are crucial for understanding climate evolution.",
            "D": "By analyzing the gases within the bubbles, researchers are able to reconstruct past concentrations of greenhouse gases like carbon dioxide and methane, revealing both natural climate cycles and the escalating impact of human activity."}, "B"),
        q(n + 1, 'The word "escalating" in the passage is closest in meaning to', {
            "A": "increasing.", "B": "continuing.", "C": "powerful.", "D": "damaging."}, "A"),
        q(n + 2, "According to the passage, all of the following are true about ice cores EXCEPT:", {
            "A": "Ice cores are obtained by drilling far down into glaciers.",
            "B": "Each layer in an ice core formed at a different point in time.",
            "C": "Ice core layers are sometimes destroyed by severe environmental events.",
            "D": "Ice cores can be used to identify when volcanoes erupted in the past."}, "C"),
        q(n + 3, 'Why does the author mention "tree rings"?', {
            "A": "To compare the usefulness of trees and ice cores for studying past climates.",
            "B": "To highlight the extreme age of some layers of ice cores.",
            "C": "To illustrate the layering that exists in ice cores.",
            "D": "To contrast the physical markers present in tree rings with the chemical markers found in ice cores."}, "C"),
        q(n + 4, "The passage implies that scientists should", {
            "A": "look quickly for other sources of valuable climate data.",
            "B": "increase the size of the ice cores they drill.",
            "C": "find ways to limit the rise of sea levels.",
            "D": "work as quickly as possible to collect more ice cores."}, "D"),
    ]))
    n += 5
    if n != 114:
        raise SystemExit("reading expected next id 114, got %s" % n)
    return paper(ID, "reading", "阅读", [
        {"n": 1, "timeSec": 2100, "from": 1, "to": 83},
        {"n": 2, "timeSec": 1080, "from": 84, "to": 113},
    ], tasks)


def build_listening():
    n = 1
    talks = [
        (1, "lecture", "Sleep and Cognitive Function", "listening_q01_q04_lecture_sleep_cognition.mp3", [
            ("What is the main topic of the lecture?", {
                "A": "How dreams influence creativity",
                "B": "Why sleep schedules vary among cultures",
                "C": "The causes of common sleep disorders",
                "D": "The benefits of sleep for cognitive function"}, "D"),
            ("According to the lecture, when does important memory consolidation occur?", {
                "A": "During deep sleep",
                "B": "Immediately after waking",
                "C": "Only during short naps",
                "D": "While consuming caffeine"}, "A"),
            ("What can result from sleep deprivation?", {
                "A": "Improved emotional control",
                "B": "Mood swings",
                "C": "Stronger long-term memory",
                "D": "Lower sensitivity to stress"}, "B"),
            ("What does the professor recommend as part of good sleep hygiene?", {
                "A": "Exercising immediately before bed",
                "B": "Maintaining a regular sleep schedule",
                "C": "Using electronic screens until bedtime",
                "D": "Drinking coffee in the evening"}, "B"),
        ]),
        (1, "lecture", "Nanotechnology", "listening_q05_q08_lecture_nanotechnology.mp3", [
            ("What is the main purpose of the lecture?", {
                "A": "To compare two methods of producing nanoparticles",
                "B": "To explain why nanoparticles are difficult to observe",
                "C": "To argue that nanoparticles should be restricted",
                "D": "To describe several uses of nanoparticles"}, "D"),
            ("Why are titanium dioxide nanoparticles useful in sunscreen?", {
                "A": "They can block ultraviolet light while remaining transparent on the skin.",
                "B": "They make the sunscreen visible after application.",
                "C": "They prevent the sunscreen from mixing with water.",
                "D": "They increase the temperature of the skin."}, "A"),
            ("What property of silver nanoparticles does the professor mention?", {
                "A": "They reflect all visible light.",
                "B": "They can stop the growth of harmful microbes.",
                "C": "They make glass more flexible.",
                "D": "They dissolve easily in water."}, "B"),
            ("Why does the professor discuss Roman pink tesserae?", {
                "A": "To show that Roman glass was stronger than modern glass",
                "B": "To identify the first scientific study of nanotechnology",
                "C": "To explain why Romans avoided using metals",
                "D": "To show that people unknowingly used nanoparticles to color glass long ago"}, "D"),
        ]),
        (2, "lecture", "Expressionism", "listening_q09_q12_lecture_expressionism.mp3", [
            ("What does the professor mainly discuss?", {
                "A": "The commercial success of modernist artists",
                "B": "The main characteristics and influence of Expressionism",
                "C": "The development of realistic painting",
                "D": "The history of theater technology"}, "B"),
            ("What did Expressionist artists seek to represent?", {
                "A": "Precise physical reality",
                "B": "Historical events without interpretation",
                "C": "Inner feelings and perceptions",
                "D": "Only pleasant emotional experiences"}, "C"),
            ("Why does the professor mention The Adding Machine?", {
                "A": "To show that Expressionism was limited to painting",
                "B": "To compare two methods of stage design",
                "C": "To give an example of Expressionist ideas in theater",
                "D": "To explain why large machines became popular on stage"}, "C"),
            ("What criticism of Expressionism does the professor mention?", {
                "A": "It focused too heavily on subjective personal experience.",
                "B": "It depended too much on realistic detail.",
                "C": "It avoided emotional subjects.",
                "D": "It had no influence outside visual art."}, "A"),
        ]),
        (2, "lecture", "Industrial Revolution and Cities", "listening_q13_q16_lecture_industrial_cities.mp3", [
            ("What is the main topic of the lecture?", {
                "A": "The decline of rural farming",
                "B": "The invention of new factory machines",
                "C": "How industrialization affected urban life",
                "D": "Why European cities stopped growing"}, "C"),
            ("What happened when factories attracted workers from rural areas?", {
                "A": "Cities became smaller.",
                "B": "Cities grew rapidly.",
                "C": "Factory employment declined.",
                "D": "Pollution disappeared."}, "B"),
            ("Which problems accompanied rapid urban growth?", {
                "A": "Fewer jobs and lower production",
                "B": "Overcrowding and pollution",
                "C": "A shortage of factories",
                "D": "Reduced public transportation"}, "B"),
            ("What does the professor imply about reform efforts?", {
                "A": "They developed in response to difficult urban conditions.",
                "B": "They caused workers to return to rural areas.",
                "C": "They were intended to close all factories.",
                "D": "They began before cities experienced rapid growth."}, "A"),
        ]),
    ]
    tasks = []
    for module, typ, title, fname, qs in talks:
        items = []
        for stem, options, answer in qs:
            items.append(q(n, stem, options, answer))
            n += 1
        tasks.append(clip(typ, title, module, fname, items))
    return paper(ID, "listening", "听力", [
        {"n": 1, "timeSec": 720, "from": 1, "to": 8},
        {"n": 2, "timeSec": 720, "from": 9, "to": 16},
    ], tasks)


def build_writing():
    return paper(ID, "writing", "写作", [
        {"n": 1, "timeSec": 1680, "from": 1, "to": 4, "label": "Email"},
        {"n": 2, "timeSec": 3600, "from": 5, "to": 10, "label": "Academic Discussion"},
    ], [
        email(1,
              "Your professor, Dr. Smith, recently assigned a group project due in two weeks. You are frustrated because not all of your group members are contributing equally to the project.",
              ["Describe the issue you are facing with your group members.",
               "Describe your specific contribution to the project.",
               "Explain why you and the group have been unable to address this issue."],
              "Dr. Smith", "Unequal Participation in Group Project",
              "Dear Dr. Smith,\n\nI am writing about the group project due in two weeks. Two members have not completed the research tasks they accepted, so the rest of us created the outline, gathered five academic sources, and drafted the introduction and methods on schedule. I have completed the literature review and the first data table, and I have also booked a meeting room twice so that we could combine our sections.\n\nWe have tried to solve the problem ourselves. I sent a shared checklist, reminded the missing members by email, and offered to divide their remaining work into smaller tasks. They either did not reply or promised to catch up and then missed the next deadline. With so little time left, we cannot wait any longer without putting the whole group at risk.\n\nCould you advise us on how to proceed, or meet briefly so that roles can be reassigned fairly? I want the project to meet the course standard, and I would appreciate your guidance.\n\nSincerely,\n[Your Name]"),
        email(2,
              "You recently attended a photography workshop led by Mr. Chen and found it both informative and engaging.",
              ["Express your gratitude for the workshop experience.",
               "Describe which aspects of the workshop you found most valuable and explain why.",
               "Ask for extra tips or advice on portrait photography, which particularly interests you."],
              "Mr. Chen", "Thank You and Portrait Photography Advice",
              "Dear Mr. Chen,\n\nThank you for leading such an informative and engaging photography workshop. I especially valued your demonstration of how changing the direction of natural light can create a different mood. The short practice activity was also helpful because I could immediately compare several compositions instead of only hearing a technical explanation.\n\nI am particularly interested in portrait photography and would appreciate a little additional advice. When a subject feels uncomfortable in front of the camera, how do you help the person relax while still keeping the pose natural? I would also like to know whether you recommend starting with a fixed focal length or a zoom lens for indoor portraits.\n\nThank you again for sharing your experience. Your guidance has made me more confident about practicing intentionally.\n\nBest regards,\n[Your Name]"),
        email(3,
              "You recently completed a cooking class taught by Ms. Baker. You were very satisfied with the experience and would like to thank her. You are also eager to keep improving your cooking skills and would like her guidance.",
              ["Explain why you enjoyed the class and why you are writing to thank her.",
               "Ask for her advice on how to further improve your cooking skills and request recommendations for learning resources.",
               "Express your gratitude to her."],
              "Ms. Baker", "Thank You for the Cooking Class",
              "Dear Ms. Baker,\n\nI am writing to thank you for the cooking class I recently completed. I enjoyed the course because the demonstrations were clear, the practice time was well organized, and you explained not only the steps but also why each technique matters. I left each session able to repeat a recipe at home with more confidence than before.\n\nI would like to keep improving and would appreciate your advice. Could you recommend a few reliable books, videos, or follow-up classes for a beginner who wants stronger knife skills and more control over seasoning? I would also welcome suggestions for simple weekly practice dishes that build on what we learned without requiring expensive equipment.\n\nThank you again for your patience and encouragement. The class made cooking feel practical rather than intimidating, and I am grateful for the time you gave us.\n\nSincerely,\n[Your Name]"),
        email(4,
              "You recently started a new job on campus and need to complete several onboarding tasks, including setting direct deposit for your monthly paychecks. You need to contact the HR department to report an issue with this task. You also want to express your excitement about joining the team.",
              ["Express your excitement for joining the team.",
               "Explain the problem you are having with setting the direct deposit.",
               "Inquire about the timing of your first paycheck."],
              "Ms. Davis", "Direct Deposit Information",
              "Dear Ms. Davis,\n\nI am very excited to have joined the campus events team, and I appreciate how welcoming everyone has been during my first week. I am writing because I have been unable to finish the direct-deposit step in the employee portal. After I enter my bank information and select Save, the page displays an error and does not confirm that the details were stored. I have tried a different browser and checked that the account and routing numbers match my bank letter, but the same message appears.\n\nCould you please tell me how to complete this step, or whether I should submit a paper form instead? I would also like to know when the first paycheck is expected and whether it will still arrive on time if direct deposit is confirmed later this week. I can provide a screenshot of the error if that would help.\n\nThank you for your assistance.\n\nSincerely,\n[Your Name]"),
        disc(5, "Business Management", "Professor Gupta", "diaz.png",
             "We've been discussing various leadership styles in business management. Some leaders are known for their authoritative approach, making decisions independently and expecting compliance from their team. Others prefer a collaborative approach, involving team members in decision-making and encouraging feedback. Which leadership style do you think is more effective in a business setting? Why?",
             [post("Kelly", "kelly.png", "I believe a collaborative leadership style is more effective in a business setting. Involving team members in decision-making can foster a sense of team cohesion and produce better results."),
              post("Andrew", "andrew.png", "I think an authoritative leadership style is typically more effective. It ensures clear guidance from one person, which can be helpful in high-pressure situations.")],
             [{"title": "Share the Decision",
               "text": "A collaborative leadership style is usually more effective because it uses the knowledge already present in a team. When people who do the work can raise problems early, a manager is less likely to choose a plan that looks efficient on paper but fails in practice. Collaboration also increases commitment. Employees who understand why a decision was made are more willing to carry it out carefully. Andrew is right that emergencies sometimes require a single person to give clear orders. That is a useful exception, not a complete model. In ordinary project work, a leader can still set deadlines and standards while asking for evidence and alternatives. The result is not slower work for its own sake; it is fewer costly reversals later. For that reason, collaborative leadership produces stronger results in most business settings while still leaving room for decisive action when time is extremely limited."},
              {"title": "Decide Then Explain",
               "text": "An authoritative style can be more effective when speed and coordination matter more than generating many options. A team under a tight deadline or a safety constraint needs one person to choose a direction so that effort is not split among competing plans. Clear guidance also reduces anxiety: people know what is expected and who is responsible if the plan fails. Kelly's point about cohesion is important, and an authoritarian leader who never explains a choice will lose trust. The more durable version of authority is therefore not silence but a firm decision followed by a brief reason and a chance to report obstacles. In high-pressure business settings, that combination keeps work moving while still treating team members as competent. Collaboration can come after the immediate problem is contained. When the cost of delay is high, decisive leadership is the more effective default."}]),
        disc(6, "Media Studies", "Professor Gupta", "diaz.png",
             "We've been exploring how social media platforms influence public opinion in today's connected world. These platforms allow ideas, news, and perspectives to spread quickly, giving individuals and organizations powerful tools to shape conversations. Do you think their influence is mostly beneficial, or should we be more cautious about their reach and impact?",
             [post("Kelly", "kelly.png", "I think social media has a negative impact on public opinion because it can create echo chambers that reinforce existing beliefs."),
              post("Andrew", "andrew.png", "I believe the influence of social media is mostly beneficial because people can access a wide range of viewpoints and discussions.")],
             [{"title": "Caution First",
               "text": "I agree with Kelly that society should be more cautious about social media's influence. The problem is not simply that false information exists; platforms can reward the most emotional content because outrage keeps users engaged. As a result, a misleading claim may spread farther than a careful correction. Consider a local election in which an edited video is shared thousands of times before journalists can check the source. People who saw the first version may never see the later explanation. Andrew is right that users can find diverse viewpoints if they search deliberately. Many people, however, stay inside familiar groups, and recommendation systems often make that easier. Caution does not require abandoning the tools. It requires slower sharing, clearer labeling of uncertain claims, and education that treats virality as a warning rather than proof. Until those habits are common, the risks to public opinion remain larger than the benefits."},
              {"title": "Wider Access",
               "text": "Social media is mostly beneficial because it lets people hear voices that traditional outlets might ignore. A student, a small business, or a community group can publish evidence, ask questions, and reach others without waiting for a newspaper to notice. That access can expose corruption, share scientific updates, and connect people across languages. Kelly's concern about echo chambers is real, but isolation is not automatic. Users can follow several sources, read comments from opponents, and check original documents that would once have been difficult to obtain. The same speed that spreads error also spreads correction when people demand sources. The better response is therefore not retreat but more skilled use: compare accounts, look for primary evidence, and reward careful posts. Used that way, social media expands public conversation rather than shrinking it, which is a net gain for informed opinion."}]),
        disc(7, "Education", "Professor Gupta", "diaz.png",
             "Today we'll discuss the role of technology in modern education. Technology can enhance learning by providing access to information and interactive tools, but it can also distract students and hinder traditional learning methods. In general, has technology had a positive or negative effect on modern education?",
             [post("Kelly", "kelly.png", "I think technology enhances learning by making information more accessible and engaging and by supporting different learning styles."),
              post("Andrew", "andrew.png", "Overreliance on technology can prevent learners from developing critical thinking skills and solving problems independently.")],
             [{"title": "Access With Design",
               "text": "Technology has had a positive effect when it is used as a tool rather than a substitute for thinking. Students can watch a difficult demonstration more than once, practice with immediate feedback, and read sources they could not obtain in a small library. Kelly is right that this access supports different learning styles: a diagram, a simulation, or a captioned video can make the same idea clearer to different people. Andrew's warning about distraction is fair, but distraction is a design problem, not proof that the tools are harmful. A course that hides phones during discussion and then uses software for homework can keep attention while still expanding practice. Critical thinking grows when students must compare sources, explain a result, and notice when an automated hint is wrong. Used that way, technology increases the amount of useful practice rather than replacing independent thought. The overall effect on education is therefore positive if teachers set limits and ask for reasoning, not only clicks."},
              {"title": "Protect Hard Thinking",
               "text": "I share Andrew's concern that technology has often had a negative effect because it makes unfinished thinking too easy to skip. When a student can search for an answer in seconds, the habit of sitting with a problem and testing a first attempt may never form. Notifications, multiple tabs, and autoplay videos also split attention, so reading and laboratory work become shallower. Kelly is right that access to information can help, but access is useful only if students still have to select, evaluate, and apply what they find. In many classrooms the extra screens arrive faster than those demands. A better approach would treat devices as optional support after a student has attempted a task without them. Schools should protect periods of focused work, handwritten planning, and discussion that cannot be completed by copying a generated paragraph. Without those limits, technology tends to increase activity while reducing the independent problem-solving that education is supposed to build."}]),
        disc(8, "Business", "Professor Gupta", "diaz.png",
             "Some business leaders believe that companies should prioritize long-term growth by investing heavily in employee training and development, even when these investments reduce short-term profits. Others believe companies should keep product prices as low as possible by minimizing training expenses and other costs. What approach leads to better long-term business success?",
             [post("Kelly", "kelly.png", "Companies should invest in employee training because skilled workers improve productivity, reduce turnover, and build institutional knowledge."),
              post("Andrew", "andrew.png", "Companies should minimize training expenses so they can offer lower prices, attract customers, and increase sales.")],
             [{"title": "Train to Keep Value",
               "text": "Investing in employee training leads to better long-term success because skill and retention compound. A worker who understands the product, the safety rules, and the customer's actual problem makes fewer expensive mistakes and can train the next person. That institutional knowledge is hard for a competitor to copy quickly. Lower prices can win a first sale, but they do not keep customers if service is slow or quality is uneven. Andrew's concern about cost is real, so training should be targeted: teach the tasks that prevent defects, delays, and resignation rather than funding every optional seminar. Even a modest program can reduce turnover, which is itself a large hidden cost. Over several years, a company that can rely on experienced staff will innovate more steadily and protect its reputation. Price competition without capability eventually becomes a race that no one can win for long. Training is therefore the stronger investment in durable success."},
              {"title": "Win on Price First",
               "text": "Keeping prices accessible by controlling training and other costs can be the more successful long-term strategy when customers compare similar products mainly on price. People can afford its products. Consider a basic household-goods company competing in a crowded market. By simplifying operations and limiting training to essential safety and quality procedures, it can reduce costs, sell at an accessible price, and gain the sales volume needed to survive. Larger volume can then finance targeted improvements without placing the entire burden on customers. Kelly is right that skilled workers matter, but a company that prices itself out of the market will not keep those workers anyway. The better sequence is to remain competitive first, then add training where it clearly raises quality or speed. For many ordinary goods, customers will not pay extra for an elaborate development program they cannot see. Controlled costs and lower prices therefore create the volume on which later training can rest."}]),
        disc(9, "Community Studies", "Professor Gupta", "diaz.png",
             "A central debate about modern communities is whether a society composed of people from different cultural and ethnic backgrounds is more beneficial, or whether a community with shared cultural roots and a common national background can achieve harmony more easily. Which kind of community offers greater advantages?",
             [post("Paul", "andrew.png", "A culturally diverse community encourages creativity and understanding and can help reduce prejudice among residents."),
              post("Claire", "kelly.png", "A community with shared cultural roots can foster stronger trust and cooperation, making it easier to organize and solve local issues together.")],
             [{"title": "Diversity Builds Capacity",
               "text": "A culturally diverse community offers greater advantages because it expands the range of skills, languages, and ideas available for solving local problems. Residents who grew up with different food, work habits, and family structures notice needs that a more uniform group may miss. A clinic that can explain appointments in more than one language, for example, reaches families who previously avoided care. Diversity also makes prejudice harder to maintain when people cooperate on practical tasks such as schools, shops, and emergency response. Claire is right that shared expectations can make organizing faster at first. Those expectations, however, can be civic rather than ethnic: traffic rules, meeting times, and a common public language can be learned. The community then keeps the trust of cooperation without requiring everyone to share the same ancestry. Over time, diversity plus a few shared civic habits produces both creativity and workable harmony, which is a stronger combination than similarity alone."},
              {"title": "Shared Roots Help",
               "text": "A community with shared cultural roots can have greater practical advantages because everyday cooperation depends on unspoken expectations. People who already understand the same holidays, language, and norms can organize a neighborhood repair, a school event, or help after a storm without spending most of their energy explaining procedures. That speed builds trust: residents believe others will show up and follow through. Paul is right that diversity can reduce prejudice and add new ideas, and those benefits should not be dismissed. They are easier to realize, however, after a community has a stable core of common practices. Shared roots need not mean excluding newcomers; they can mean a recognizable civic culture that new residents can join. When that core exists, people argue about how to improve a plan rather than about what the plan even is. For solving local issues reliably, that common ground is the more important advantage."}]),
        disc(10, "Literature", "Professor Gupta", "diaz.png",
             "Literature includes novels, poems, plays, and stories that express ideas and emotions. Some writers aim to inspire social change by showing inequality or injustice, while others focus on entertaining readers through exciting plots or imaginative worlds. Which is the main purpose of literature: to inspire change or to entertain?",
             [post("Kelly", "kelly.png", "The main purpose of literature is to inspire social change by helping readers understand serious issues and other people's viewpoints."),
              post("Andrew", "andrew.png", "Literature's primary goal is to entertain by allowing readers to enter new worlds, meet fictional characters, and enjoy surprising events.")],
             [{"title": "Change Through Attention",
               "text": "I agree with Kelly that literature's most important purpose is to inspire change because stories make abstract problems emotionally understandable. Statistics can show that inequality exists, but a novel can place readers inside the daily choices and limitations created by that inequality. For example, a fictional worker's week can reveal how a rule about hours, rent, or schooling shapes a person's future. That sustained attention can alter what readers notice outside the book and, eventually, what they are willing to question. Entertainment helps people enter the story, but engagement becomes socially meaningful when it changes sympathy and judgment. Literature should not become propaganda; ambiguity and character still matter. Still, the deepest literary effect is not distraction. It is a shift in attention: readers become willing to see a life or injustice they had previously ignored, and that shift is how stories begin to inspire change."},
              {"title": "Pleasure Comes First",
               "text": "Literature's primary purpose is to entertain because the pleasure of narrative is what invites readers to continue. Suspense, humor, rhythm, character, and imaginative worlds create an experience that is valuable before any social lesson is identified. Entertainment is not empty. By giving readers mental rest and a space to explore possibilities without real-world consequences, stories support curiosity and emotional renewal. Requiring literature to inspire change can narrow both writing and reading. Authors may feel pressured to deliver an approved message, while readers may ignore craft in order to search for a moral conclusion. Serious themes can still appear, but their impact often depends on the story first being compelling. A reader who cares about a fictional character may reflect on a problem naturally, whereas a work written only to instruct may be abandoned. Protecting entertainment as the central purpose preserves creative freedom and the voluntary attention from which any broader insight must grow."}]),
    ])


REPEATS = [
    ("gym", "You are working at your university's fitness center. Your manager is training you to assist customers at the center. Listen to the manager and repeat what the manager says. Repeat only once.", [
        "Cardio machines and bikes are over here.",
        "The weight room provides dumbbells and benches.",
        "Our yoga studio offers classes for all fitness levels.",
        "Locker rooms contain storage bins and changing facilities.",
        "Enjoy our smoothie bar and sample nutritious drinks and snacks.",
        "Personal trainers are available for individual guidance.",
        "Before you leave, check the gym floor plan for specific areas and equipment.",
    ]),
    ("hiking", "You are volunteering at a community nature center near campus. The leader is training you to help visitors enjoy the outdoor trails. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "Our hiking trails offer scenic routes.",
        "Make a stop at the visitor center.",
        "Rest areas provide water and shade along the way.",
        "Picnic areas are great for family gatherings.",
        "Wildlife viewing spots are located along the river.",
        "Guided tours highlight native plants and animals.",
        "As always, be sure to take the map with you on your nature walks and adventures.",
    ]),
    ("ships", "You are being trained to assist visitors at a maritime museum. Listen to the guide and repeat what the guide says. Repeat only once.", [
        "This area shows early sailing ships.",
        "Some older style boats use steam for power.",
        "These very accurate ship models show how designs have changed.",
        "Before satellites, these tools helped sailors navigate oceans.",
        "Let me explain how trade routes shaped global shipping over time.",
        "Feel free to ask questions if you want to know more about anything you've seen.",
        "For nonfiction books and novels about ships, be sure to visit the gift shop.",
    ]),
    ("zoo", "You are being trained to assist visitors at a university wildlife park. Listen to the guide and repeat what the guide says. Repeat only once.", [
        "You will see birds living in their treetop homes.",
        "This space houses animals from Africa.",
        "Many reptiles live here, including snakes, lizards and turtles.",
        "Brightly colored butterflies are found in this garden.",
        "Staff are available to explain the displays in more detail.",
        "Guides lead nature walks, highlighting native species and protected habitats.",
        "To explore locations, trail paths and key exhibits, check the park map.",
    ]),
    ("library", "You are working in the university library. Your manager is teaching you how to assist students with digital resources. Listen to the manager and repeat what the manager says. Repeat only once.", [
        "Use keywords to look for any books.",
        "Download materials to read when you are offline.",
        "There are digital books available to borrow.",
        "Access databases for scholarly articles and reports.",
        "Use citation tools to format your references correctly.",
        "Contact a librarian through the chat for any help you need.",
        "For the smoothest access, make sure your student ID is registered.",
    ]),
    ("garden", "You are volunteering at a community garden near campus. The leader is training you to help visitors care for the plants. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "Water the trees daily to help them grow.",
        "Add nutrients to the flower bed dirt.",
        "Manage temperature and humidity inside the greenhouse.",
        "Do not use chemicals near the pond to protect the creatures there.",
        "Recycle waste in the compost pile to create rich soil.",
        "After you finish gardening, put the tools in the shed so others can use them.",
        "When guests arrive, show them to the visitor center to learn about the garden.",
    ]),
]

INTERVIEWS = [
    ("social_media", "You have agreed to participate in a research study about people's experiences with social media. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("How often do you use social media platforms and for what purposes? Or if you don't use them, why not?",
         "I use social media every day, but I try to keep it purposeful. I mainly use messaging apps to stay in touch with friends who live in other cities, and follow a few news and language-learning accounts. I also check a university group where students share deadlines and campus events. I rarely post personal updates because I prefer private conversations. To keep social media from taking over my time, I turn off most notifications and check it during two short breaks. That way, it remains useful for communication and information without interrupting my study schedule or face-to-face relationships."),
        ("In your opinion, what makes social media either enjoyable or difficult to deal with?",
         "Social media is enjoyable when it helps me discover useful ideas and communicate with people I would not meet otherwise. For example, I have found study methods and book recommendations through small online communities. The difficult part is the constant pressure to react immediately. Notifications, arguments, and highly edited images can make the experience tiring, especially when a platform keeps showing the same kind of content. I enjoy it most when I choose specific accounts and limit my time. I find it hardest when the algorithm, rather than my own purpose, determines what I see and how long I stay online."),
        ("What kinds of things do you think are appropriate to share on social media, and why?",
         "I think it is appropriate to share information that is useful, respectful, and safe. People can post achievements, creative work, travel advice, or links to reliable community resources because those items can encourage or help others. However, private details about another person should not be shared without permission. That includes photographs, health information, locations, or complaints that identify someone. I also avoid posting emotional reactions before checking the facts. A simple rule is to ask whether the post could cause harm if it reached a teacher, employer, or stranger. If the answer is yes, it belongs in a private conversation instead."),
        ("Some people believe that social media has more negative effects than positive ones on society in general. Do you agree or disagree with this viewpoint? Explain why.",
         "I agree that social media currently creates more negative effects than positive ones, although the technology itself can be useful. The biggest problem is that platforms reward attention, so extreme claims and emotional arguments spread faster than careful explanations. This can increase anxiety and make public discussion more hostile. Social media does help families stay connected and allows small organizations to reach supporters. However, those benefits do not remove the risks of misinformation, comparison, and lost privacy. Platforms need clearer rules and more transparent recommendation systems, while users need stronger media-literacy skills. Until those changes become common, the negative social effects are likely to remain greater."),
    ]),
    ("online_shopping", "You have volunteered for a research study about online shopping. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about online shopping. First, how often do you shop online? Weekly, monthly, or less frequently?",
         "I shop online about two or three times a month. I usually wait until I have several items to order so that I can compare prices and avoid unnecessary shipping. Most of my purchases are practical, such as books, replacement cables, or household supplies that are difficult to find near campus. I do not browse shopping sites every day because that encourages impulse buying. Before placing an order, I read the return policy and compare reviews from several sources. Shopping at this frequency gives me the convenience of online stores, but it still makes each purchase deliberate rather than turning shopping into a routine form of entertainment."),
        ("If you shop online, what types of products are you likely to buy? For example, would you buy clothes, electronics, or groceries?",
         "I am most likely to buy books and electronics online. Books are easy to identify by title and edition, so I know exactly what will arrive, and online stores usually offer a wider selection. Small electronic items, such as headphones or chargers, are also convenient because I can compare specifications and prices. I am less willing to buy clothes because size and fabric are difficult to judge from photographs. I also avoid ordering fresh groceries unless delivery is necessary, since I prefer choosing produce myself. In general, I buy standardized products online and visit a physical store when fit, texture, or freshness matters."),
        ("Some people believe shopping in physical stores is more convenient, while others think online shopping is a worse experience because it lacks the human interaction of in-person shopping. What is your opinion, and why?",
         "For routine purchases, I think online shopping is more convenient because it saves travel time and allows quick comparison. However, physical stores provide a better experience when I need advice or want to inspect a product. A salesperson can answer a follow-up question immediately, and I can test the size or quality before paying. The lack of human interaction online does not make every purchase worse, because reviews and clear product information are often enough. My preference depends on risk: I buy familiar, inexpensive items online, but I visit a store for clothing, expensive equipment, or products that may require service after the sale."),
        ("Some people believe physical stores might one day disappear because of online shopping. What is your opinion on this?",
         "I do not think physical stores will disappear completely. Online shopping will probably handle more routine purchases, but stores offer services that websites cannot fully replace. Customers may want to try clothing, examine furniture, receive a demonstration, or solve a problem with a real employee. Stores can also function as pickup and return centers for online orders. I expect the two systems to become more integrated rather than one eliminating the other. Successful retailers may keep smaller showrooms while holding more inventory in regional warehouses. In that model, customers gain online convenience but still have a physical place for advice, testing, and immediate support."),
    ]),
    ("music", "You have agreed to participate in a research study about music preferences. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about your music preferences. First, how often do you listen to music? Do you listen daily, weekly, or less often?",
         "I listen to music every day. In the morning, I usually play calm instrumental music while getting ready because it helps me begin the day without feeling rushed. During my commute, I listen to more energetic songs, and in the evening I sometimes use quiet music while reading. I do not normally listen when I am writing something difficult, because lyrics can interrupt my concentration. On weekends, I spend more time exploring new artists or complete albums. Music is therefore part of my daily routine, but I choose different styles depending on whether I need energy, relaxation, or a pleasant background."),
        ("What genres or types of music do you usually enjoy listening to? For example, do you prefer classical, rock, or jazz music? Give details to explain your answer.",
         "I most often listen to jazz and acoustic music. I like jazz because the musicians respond to one another in real time, so a familiar piece can sound different in every performance. Acoustic music appeals to me because individual instruments and voices are easy to hear without heavy production. When I study, I choose slower instrumental jazz because it creates energy without distracting lyrics. When I relax with friends, I prefer acoustic songs that are easy to enjoy and discuss. I also listen to rock occasionally during exercise, but jazz remains my favorite because it combines structure with improvisation and rewards careful listening."),
        ("Can you tell me about a concert or live music event you would like to attend? Why would you make that particular choice?",
         "I would like to attend an outdoor jazz festival with several small stages. That setting would let me hear both established performers and younger musicians in one day. I would choose a festival rather than a large arena concert because jazz depends on interaction, and a smaller audience makes the performance feel more immediate. I would especially enjoy seeing a group improvise around a familiar melody and watching how the musicians signal changes to one another. The event would also be a good opportunity to discover artists whose recordings I have never heard. Live jazz would make the creativity of the music visible as well as audible."),
        ("Some people believe that music can have a powerful effect on our emotions and moods. Do you agree or disagree with this viewpoint? Why?",
         "I strongly agree that music affects emotions and moods. Rhythm, volume, and melody can change a person's energy even before the listener pays attention to the words. Fast music can make exercise feel easier, while a slow, familiar song can reduce stress after a difficult day. Music also becomes connected with memories, so hearing a particular piece may bring back the feelings associated with an important event. The effect is not identical for everyone because personal experience and cultural background matter. Still, people often use playlists deliberately to concentrate, celebrate, or relax, which shows that music is a practical tool for managing emotion."),
    ]),
    ("environment", "You have volunteered for a research study about environmental practices. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about your environmental practices. First, do you take any specific actions to reduce your environmental impact, such as recycling or conserving energy? Give details in your answer.",
         "I take several small actions to reduce my environmental impact. I separate recyclable paper, plastic, and metal, and carry a reusable bottle and shopping bag. At home, I turn off lights when leaving a room and avoid running the air conditioner when an open window is comfortable. For short trips, I usually walk or use public transportation instead of taking a car. None of these actions is dramatic, but they are easy to repeat every day. I also try to buy durable items and repair them before replacing them, because reducing waste at the beginning is often more effective than recycling it later."),
        ("Can you describe one or two steps your community or neighborhood takes to be environmentally friendly? For example, are there solar panels on buildings or rainwater barrels available where you live?",
         "My neighborhood has improved recycling and transportation. Different bins are placed near apartment buildings, and each bin has clear pictures showing what belongs inside. This makes recycling easier for residents who speak different languages. The community has also added protected bicycle lanes along the main road and installed bicycle racks near shops. As a result, more people can make short trips without driving. A few public buildings use solar panels, but that program is still small. The recycling system and bicycle lanes have had the clearest effect because residents can use them every day without buying special equipment."),
        ("If you had the chance to participate in an ecological or nature-based activity, such as a community cleanup effort or tree planting event, what would you do and why?",
         "I would choose a tree-planting event along a local river. Trees would improve the area for many years by stabilizing soil, providing shade, and creating habitat for birds and insects. I would like the event to include instruction from an environmental organization so volunteers learn which native species belong there and how to care for them after planting. A one-day activity is useful only if the trees survive, so I would also volunteer for follow-up watering and monitoring. This project combines immediate physical work with a long-term result, and it would help residents understand how river health, wildlife, and neighborhood comfort are connected."),
        ("Some people believe that individual actions are not enough to address conservation issues and that significant changes must come from government policies. Do you agree or disagree with this viewpoint? Why or why not?",
         "I agree that major conservation changes require government policy, but individual action still matters. Governments can set emissions standards, protect habitats, and invest in public transportation at a scale that one person cannot match. A household cannot require a factory to reduce pollution or create a regional recycling system. However, citizens influence which policies are politically possible through voting, purchasing, and community participation. Individual habits also determine whether public programs succeed. For example, a city can provide recycling bins, but residents must use them correctly. Government action should lead because it controls the largest systems, while informed personal choices support those policies and hold institutions accountable."),
    ]),
]


def build_speaking(pid, title, form, interview=None):
    tasks = []
    modules = []
    if form:
        key, instruction, samples = REPEATS[form - 1]
        start_q = (form - 1) * 7
        for i, sample in enumerate(samples, 1):
            fname = "speaking_listen_repeat_q%02d.mp3" % (start_q + i)
            NEED.append((fname, fname))
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
            fname = "speaking_take_interview_q%02d.mp3" % ((interview - 1) * 4 + i)
            NEED.append((fname, fname))
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
    dump("2025-07-18-reading.json", build_reading())
    dump("2025-07-18-listening.json", build_listening())
    dump("2025-07-18-writing.json", build_writing())
    dump("2025-07-18-speaking.json", build_speaking(ID, TITLE + " · 口语 Form 1", 1, 1))
    dump("2025-07-18-speaking-f2.json", build_speaking(ID + "-s2", TITLE + " · 口语 Form 2", 2, 2))
    dump("2025-07-18-speaking-f3.json", build_speaking(ID + "-s3", TITLE + " · 口语 Form 3", 3, 3))
    dump("2025-07-18-speaking-f4.json", build_speaking(ID + "-s4", TITLE + " · 口语 Form 4", 4, 4))
    dump("2025-07-18-speaking-f5.json", build_speaking(ID + "-s5", TITLE + " · 口语 Form 5", 5, None))
    dump("2025-07-18-speaking-f6.json", build_speaking(ID + "-s6", TITLE + " · 口语 Form 6", 6, None))
    copy_audio()
