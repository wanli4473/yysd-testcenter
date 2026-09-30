#!/usr/bin/env python3
"""Build 7.29 China offline TOEFL. Run: python3 scripts/build_toefl_729cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月/7.29-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-07-29/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-07-29"
SET = "7.29"
TITLE = "新托福 7.29 国内线下"
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
    t, n = cw("Comparative Advantage", 1, n, [
        "In analyzing global trade dynamics, the principle of comparative advantage plays a foundational role. It suggests that nations should specialize in producing goods they can create most efficiently, thereby enhancing ",
        ("ove", "overall"),
        " economic ",
        ("produc", "productivity"),
        " and ",
        ("fost", "fostering"),
        " international ",
        ("interde", "interdependence"),
        ". However, ",
        ("exce", "excessive"),
        " reliance ",
        ("o", "on"),
        " this ",
        ("mo", "model"),
        " can ",
        ("exp", "expose"),
        " economies ",
        ("t", "to"),
        " significant ",
        ("ri", "risks"),
        ". Countries that concentrate on a limited range of exports may become vulnerable to market volatility, such as shifts in global demand or price fluctuations. While comparative advantage can stimulate growth, it must be strategically managed to ensure long-term economic sustainability.",
    ])
    tasks.append(t)
    t, n = cw("Realism in Theater", 1, n, [
        "Realism in theater is a movement that emerged in the 19th century, aiming to portray everyday life with authenticity and truthfulness. It rejects exaggerated ",
        ("sentime", "sentimentality"),
        " and conventions, ",
        ("ins", "instead"),
        " focusing ",
        ("o", "on"),
        " believable ",
        ("chara", "characters"),
        " and ",
        ("sett", "settings"),
        " that ",
        ("ref", "reflect"),
        " real ",
        ("soc", "social"),
        " environments. ",
        ("Real", "Realism"),
        " plays often explore complex moral and social issues, emphasizing psychological depth and the influence of environment and circumstance on human behavior. Realism continues to influence contemporary ",
        ("theat", "theatrical"),
        " ",
        ("conver", "conversation"),
        " by encouraging honest, nuanced storytelling.",
    ])
    tasks.append(t)
    t, n = cw("Conservation Ecology", 1, n, [
        "Conservation ecology focuses on preserving biodiversity and protecting ecosystems from degradation. This ",
        ("disci", "discipline"),
        " involves ",
        ("stud", "studying"),
        " the ",
        ("intera", "interactions"),
        " between ",
        ("spe", "species"),
        " and ",
        ("th", "their"),
        " environments ",
        ("t", "to"),
        " develop ",
        ("strat", "strategies"),
        " for ",
        ("maint", "maintaining"),
        " ecological ",
        ("bal", "balance"),
        ". Efforts ",
        ("inc", "include"),
        " habitat restoration, sustainable resource management, and the establishment of protected areas. Conservation ecologists work to mitigate the impacts of human activities such as deforestation, pollution, and climate change. Public awareness campaigns and policy advocacy are crucial components of conservation initiatives. By safeguarding natural habitats, conservation ecology aims to ensure the survival of diverse species and the health of the planet.",
    ])
    tasks.append(t)
    t, n = cw("Honeybee Social Structure", 1, n, [
        "Honeybee social structure is a fascinating example of cooperation and division of labor in the animal kingdom. The main role of the queen bee is to lay ",
        ("thou", "thousands"),
        " of ",
        ("eg", "eggs"),
        " to ",
        ("ke", "keep"),
        " the ",
        ("col", "colony"),
        " growing. ",
        ("Wor", "Worker"),
        " bees ",
        ("a", "are"),
        " the ",
        ("bu", "busy"),
        " multitaskers; ",
        ("th", "they"),
        " collect ",
        ("nec", "nectar"),
        " and ",
        ("pol", "pollen"),
        ", feed baby bees, clean the hive, and stand guard against intruders. The only job of the male drones is to mate with a queen from another hive. Each bee plays a unique role, and this organized system of cooperation helps the colony survive and thrive.",
    ])
    tasks.append(t)
    tasks.append(academic("The Mystery of Dark Galaxies", 2, [
        "Ultraviolet (UV) astronomy has unveiled numerous cosmic phenomena. An especially intriguing discovery is that of dark galaxies. Unlike typical galaxies (gravitationally bound systems of stars, gas, and other particles), dark galaxies emit little to no visible light, making them nearly impossible to detect using conventional optical telescopes. However, these galaxies emit UV radiation, providing astronomers with a unique window to study them.",
        {"insert": "A", "t": "Dark galaxies challenge our understanding of galaxy formation."},
        {"insert": "B", "t": "Traditional models suggest that galaxies form through gas accumulation and star formation."},
        {"insert": "C", "t": "But although dark galaxies contain vast amounts of gas, they have few, if any, stars."},
        {"insert": "D"},
        "This raises questions about the processes that inhibit star formation. Some researchers propose that turbulence within the gas clouds might prevent the gas from collapsing to form stars.",
        "Observations from the Hubble Space Telescope and other UV-sensitive instruments have revealed that dark galaxies were more common in the early universe. These findings suggest that dark galaxies may represent a primordial phase in galaxy evolution. One hypothesis is that high levels of UV radiation in the early universe prevented the gas in dark galaxies from cooling and condensing into stars. Observations of regions with high UV radiation support this theory.",
    ], [
        q(n, "The passage suggests that astronomers discovered dark galaxies by", {
            "A": "studying numerous cosmic phenomena caused by them",
            "B": "seeing them through conventional optical telescopes",
            "C": "observing their gravitational effects on other galaxies",
            "D": "detecting UV radiation emitted by them"}, "D"),
        q(n + 1, "What might prevent the formation of stars in dark galaxies?", {
            "A": "The accumulation of too much gas",
            "B": "The turbulence inside gas clouds",
            "C": "The presence of nearby galaxies",
            "D": "The collapse of gas clouds"}, "B"),
        q(n + 2, "Observations from the Hubble Space Telescope and other UV-sensitive instruments indicate that", {
            "A": "the number of dark galaxies in the universe increased over time",
            "B": "dark galaxies contain more gas than previously believed",
            "C": "dark galaxies emit more UV radiation than previously believed",
            "D": "dark galaxies represent an early stage in galaxy development"}, "D"),
        q(n + 3, "Observations of dark-galaxy regions with high UV radiation indicate that", {
            "A": "dark galaxies evolved very slowly",
            "B": "stars in the early universe were fairly cool and dense",
            "C": "UV radiation in the early universe kept gas temperatures high",
            "D": "a traditional theory of how dark galaxies formed is incorrect"}, "C"),
        insert_q(n + 4, "Therefore, one might expect all galaxies to have a significant number of stars.", "C"),
    ]))
    n += 5
    tasks.append(academic("Linguistic Structural Diversity", 2, [
        "Linguistic typology investigates structural features across languages, revealing both universal patterns and language-specific variation. A central area of study is word order—the arrangement of subjects, verbs, and objects. English follows a subject-verb-object (SVO) pattern, while Japanese uses subject-object-verb (SOV). Most languages conform to a limited set of dominant word orders, which may reflect cognitive efficiency: placing the subject first helps listeners quickly identify the sentence's main actor, aiding comprehension.",
        "Beyond syntax, languages differ in morphological complexity—the degree to which inflection (such as noun or verb endings) marks grammatical relationships. Turkish uses extensive inflection to express subtle distinctions, whereas Mandarin Chinese relies more on word order and context. These contrasts suggest that languages balance morphology and syntax based on communicative needs. Highly inflected languages can afford flexible word order because grammatical roles are marked morphologically. In contrast, languages with minimal inflection often depend on fixed word order to maintain clarity.",
        {"insert": "A", "t": "This trade-off reflects deeper functional pressures."},
        {"insert": "B", "t": "Languages evolve not randomly but in response to cognitive constraints and social factors, including contact with other languages and cultural shifts."},
        {"insert": "C", "t": "Studying this evolution helps linguists understand not only how languages differ but why certain grammatical strategies emerge and persist across communities."},
        {"insert": "D"},
    ], [
        q(n, "Which of the following is NOT mentioned in the passage as an aspect of the study of linguistic typology?", {
            "A": "It has revealed both diversity and universality among structural linguistic features.",
            "B": "It includes the study of word order as a means of aiding comprehension.",
            "C": "It identifies three basic structural patterns across all languages.",
            "D": "It examines differences in morphological complexity among languages."}, "C"),
        q(n + 1, "Why does the author note that placing the subject first in a sentence aids comprehension?", {
            "A": "To provide an example of a structural feature that follows a universal pattern",
            "B": "To suggest that a larger set of available word orders increases cognitive efficiency",
            "C": "To help explain why there is only a small set of dominant word orders across languages",
            "D": "To suggest that languages that follow a different pattern are harder to learn"}, "C"),
        q(n + 2, "What is suggested about the morphological complexity of Turkish?", {
            "A": "It is greater than the morphological complexity of Mandarin Chinese.",
            "B": "It is balanced by a relatively simple inflection system.",
            "C": "It developed independently of other elements of Turkish.",
            "D": "It requires Turkish to adhere to a relatively rigid word order."}, "A"),
        q(n + 3, 'The word "pressures" in the passage is closest in meaning to', {
            "A": "difficulties", "B": "conflicts", "C": "features", "D": "influences"}, "D"),
        insert_q(n + 4, "Such changes can alter the communicative priorities of a speech community, affecting which features are emphasized or simplified over time.", "B"),
    ]))
    n += 5
    tasks.append(academic("The Ascent of the Italian Lute Song", 2, [
        "Some historians explain the mid-sixteenth-century surge of Italian lute songs as the product of technological innovation combined with shifting social tastes. Around 1500, Ottavio dei Petrucci developed a groundbreaking movable-type printing technique for music, making it easier and cheaper to produce books of lute music. Suddenly, amateur musicians from Naples to Venice could acquire fashionable arrangements of madrigals, villanellas, and solo ricercars. This ease of access dovetailed with an expanding culture of private performance in aristocratic homes.",
        "Other historians point to a different catalyst: courtly patronage. Alfonso d'Este, the duke of Ferrara, played a decisive role by commissioning virtuosos like Francesco da Milano and Antonio Valente, whose published collections set a high artistic benchmark. Evidence for both theories emerges in extant manuscripts: some contain personalized annotations indicating home practice, while lavish presentation copies bear heraldic emblems of noble households. Furthermore, stylistic borrowings from the Spanish vihuela and French lute idioms suggest a pan-European dialogue that reinforced Italian composers' ambitions. While the printing press democratized repertoire, it was the symbiosis of domestic enthusiasm and aristocratic sponsorship—each reinforcing the other—that, arguably, propelled the Italian lute song to its enduring prominence.",
    ], [
        q(n, "Which of the following best expresses the main idea of the passage?", {
            "A": "Innovations in printing have emerged as the most likely cause of a surge in the composition of sixteenth-century Italian lute songs, replacing older, now disproven theories.",
            "B": "The increased availability of printed lute music, together with courtly patronage, fostered a flourishing culture of lute music in sixteenth-century Italy.",
            "C": "Italian lute songs became more sophisticated in the sixteenth century as a result of Italian musicians' incorporation of foreign influences.",
            "D": "As professional sixteenth-century Italian musicians began to offer more private performances in aristocratic homes, composers altered the kind of music written for the lute."}, "B"),
        q(n + 1, "The passage suggests which of the following about amateur musicians in sixteenth-century Italy?", {
            "A": "Their repertoire prior to the sixteenth century did not include compositions for the lute.",
            "B": "Their musical tastes influenced the types of compositions commissioned for the lute by patrons like Alfonso d'Este.",
            "C": "They performed in private homes alongside professional musicians invited by aristocratic patrons.",
            "D": "The extent to which they performed lute music in private homes was affected by an innovation in the printing industry."}, "D"),
        q(n + 2, 'The word "lavish" in the passage is closest in meaning to', {
            "A": "traditional", "B": "practical", "C": "fancy", "D": "common"}, "C"),
        q(n + 3, 'The author mentions "heraldic emblems" primarily to', {
            "A": "cite evidence of the influence of patronage on Italian lute music",
            "B": "provide evidence that printed lute music grew more complex over time",
            "C": "demonstrate that music written for the lute became very fashionable",
            "D": "indicate one way in which aristocrats personalized books of printed music"}, "A"),
        q(n + 4, "Which of the following is NOT mentioned in the passage as contributing to the mid-sixteenth-century surge of Italian lute songs?", {
            "A": "The availability of printed lute music",
            "B": "Courtly patronage of virtuosos",
            "C": "Improvements in lute construction",
            "D": "Stylistic borrowings from the Spanish vihuela"}, "C"),
    ]))
    n += 5
    if n != 56:
        raise SystemExit("reading expected next id 56, got %s" % n)
    return paper(ID, "reading", "阅读", [
        {"n": 1, "timeSec": 1200, "from": 1, "to": 40},
        {"n": 2, "timeSec": 1080, "from": 41, "to": 55},
    ], tasks)


def build_listening():
    n = 1
    talks = [
        (1, "lecture", "Biohacking", "listening_01_set11_m1_q29-q32_lecture_biohacking_and_self_directed_performance_enhancement.mp3", [
            ("What would be the best title for this podcast talk?", {
                "A": "The Long History of Biohacking",
                "B": "Biohacking Practices: Scientifically Sound?",
                "C": "Improve Your Mood Through Biohacking",
                "D": "Hack Your Way to Better Sleep"}, "B"),
            ("What is the intended purpose of taking green tea extract?", {
                "A": "To improve mental functioning",
                "B": "To strengthen sleep-wake cycles",
                "C": "To lower heart rates",
                "D": "To support metabolic efficiency"}, "A"),
            ("Why does the podcaster talk about ocean waves and forest sounds?", {
                "A": "To identify places where people go to enhance their overall health",
                "B": "To give examples of sounds that can increase metabolic efficiency",
                "C": "To show one method biohackers use to deepen sleep",
                "D": "To recommend a better biohacking method than fasting"}, "C"),
            ("According to the speaker, which type of biohacking is most strongly supported by research?", {
                "A": "Intermittent fasting",
                "B": "Using cognitive enhancers",
                "C": "Soundscapes",
                "D": "Manipulating light exposure"}, "D"),
        ]),
        (2, "lecture", "Nanotechnology", "listening_02_set30_m2_q08-q11_lecture_nanotechnology.mp3", [
            ("What aspect of nanotechnology does the speaker mainly address?", {
                "A": "Its impact on the natural environment",
                "B": "Its potential to improve standards of living",
                "C": "Its original discovery and evolution as a field of study",
                "D": "Its useful applications and possible problems"}, "D"),
            ("Why does the speaker mention drug delivery systems?", {
                "A": "To give an example of a limitation of nanotechnology",
                "B": "To describe the first medical breakthrough using nanotechnology",
                "C": "To suggest that medical professionals are eager to embrace nanotechnology",
                "D": "To illustrate how nanotechnology is used in the field of medicine"}, "D"),
            ("What does the speaker suggest about batteries made using nanotechnology?", {
                "A": "They are more efficient than traditional batteries.",
                "B": "They can be manufactured more cost-effectively than traditional batteries.",
                "C": "They are created primarily for storing renewable energy sources.",
                "D": "They will likely be the only batteries available to consumers in the near future."}, "A"),
            ("What does the speaker say is a potential drawback to nanotechnology?", {
                "A": "The high cost of manufacturing using nanomaterials",
                "B": "The inherent difficulty in working with material that is so small",
                "C": "The ease with which nanoparticles can enter biological systems",
                "D": "The health risks associated with working with nanotechnology"}, "C"),
        ]),
        (2, "lecture", "Industrial Revolution and European Cities", "listening_03_set23_m1_q29-q32_lecture_industrial_revolution_and_european_cities.mp3", [
            ("What is the main topic of the talk?", {
                "A": "Factors contributing to the Industrial Revolution in Europe",
                "B": "How the historic layouts of medieval cities were preserved",
                "C": "How the Industrial Revolution affected European cities",
                "D": "The emergence of the factory system in Europe"}, "C"),
            ("According to the talk, why were city walls removed?", {
                "A": "Newer walls were built farther from the centers as cities grew larger.",
                "B": "Cities were no longer directly threatened by their enemies.",
                "C": "Laws required greater freedom of movement between neighboring cities.",
                "D": "Cities used the walls' bricks to build factories."}, "B"),
            ("What point does the speaker make about industrial workplaces?", {
                "A": "They did not change much from medieval times.",
                "B": "Entire districts were devoted to factories and housing for workers.",
                "C": "They often did not provide good conditions for workers.",
                "D": "Cathedrals were often repurposed as commercial workplaces."}, "B"),
            ("According to the speaker, what was one consequence of street layout changes in industrial cities?", {
                "A": "Property became easier to buy and sell.",
                "B": "Modern forms of transportation became available.",
                "C": "New spaces were created for expanding central markets.",
                "D": "New laws were passed that separated residential and industrial areas."}, "A"),
        ]),
        (2, "lecture", "Honey Bee Foraging", "listening_04_set33_m2_q08-q11_lecture_honey_bee_foraging_nectar_and_pollen.mp3", [
            ("According to the speaker, what question was the first experiment designed to answer?", {
                "A": "Whether a specific percentage of bees in the hive are forager bees",
                "B": "Whether forager bees maintain the same level of activity throughout the day",
                "C": "Whether forager bees are the most active bees in the hive",
                "D": "Whether all forager bees contribute the same amount of work"}, "D"),
            ("According to the speaker, what specific information did the microtransponders provide the researchers?", {
                "A": "The number of trips the forager bees made in and out of the hive",
                "B": "The amount of energy used by the forager bees during foraging",
                "C": "The average flight speed of the forager bees",
                "D": "The total amount of nectar and pollen that the forager bees gathered"}, "A"),
            ("What does the speaker say happened after the researchers removed most of the \"elite foragers\" from the hive?", {
                "A": "The colony collapsed.",
                "B": "Foraging activity increased immediately.",
                "C": "Foraging activity decreased at first and then returned to earlier levels.",
                "D": "Bees that specialized in maintaining the hive became forager bees."}, "C"),
            ("According to the speaker, what do the results of the second experiment suggest?", {
                "A": "That only a small number of bees are capable of foraging",
                "B": "That the population size of beehives is highly variable",
                "C": "That individual bees adjust their behavior in response to the colony's needs",
                "D": "That forager bees play a more important role in the hive than previously assumed"}, "C"),
        ]),
        (2, "lecture", "Tardigrades", "listening_05_set24_m2_q08-q11_lecture_tardigrades_surviving_extreme_conditions_and_space.mp3", [
            ("What makes tardigrades unique among animals?", {
                "A": "The structure of their eyes",
                "B": "The range of their sizes",
                "C": "Their ability to change their body temperature",
                "D": "Their ability to survive in various extreme environments"}, "D"),
            ("What does the speaker emphasize about metabolic activities?", {
                "A": "They all require water.",
                "B": "They occur more quickly at higher temperatures.",
                "C": "Some of them can occur in damaged cells.",
                "D": "Some of them involve special proteins."}, "A"),
            ("What does the speaker say about tardigrades' ability to withstand radiation?", {
                "A": "It was first discovered when tardigrades were sent into space.",
                "B": "It is dependent on the size of a particular tardigrade.",
                "C": "It has resulted in research on the benefits of cryptobiosis.",
                "D": "It has implications for improving an important medical procedure."}, "D"),
            ("Why does the speaker mention a research study that was done in 2007?", {
                "A": "To explain why astronomers are interested in tardigrades",
                "B": "To identify a problem with earlier research on tardigrades",
                "C": "To describe the process that tardigrades use to adapt to the vacuum of space",
                "D": "To suggest that tardigrades would have difficulty surviving on other planets"}, "A"),
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
        {"n": 1, "timeSec": 480, "from": 1, "to": 4},
        {"n": 2, "timeSec": 1440, "from": 5, "to": 20},
    ], tasks)


def build_writing():
    return paper(ID, "writing", "写作", [
        {"n": 1, "timeSec": 840, "from": 1, "to": 2, "label": "Email"},
        {"n": 2, "timeSec": 2400, "from": 3, "to": 6, "label": "Academic Discussion"},
    ], [
        email(1,
              "You recently started going to yoga classes at your university gym. You have been enjoying the sessions overall, but you have experienced some back pain and would like advice from the instructor, Ms. Martinez, on how to modify your practice to avoid further discomfort.",
              ["Mention how much you enjoy the yoga classes.",
               "Describe the back pain you are experiencing.",
               "Ask for advice on how to modify your practice to prevent discomfort."],
              "Ms. Martinez", "Advice on yoga practice",
              "Dear Ms. Martinez,\n\nI wanted to express how much I am enjoying your yoga classes at the university gym. The sessions have been a wonderful way to relax and improve my flexibility, and I truly appreciate your guidance.\n\nHowever, I have been experiencing some back pain recently, particularly in the lower back. It tends to occur during certain poses, like forward bends or twists, and lingers for a while after class. I am concerned that I might be doing something incorrectly, which could lead to further discomfort.\n\nCould you please advise me on how to modify my practice to avoid this pain? I would be grateful for tips on adjusting my posture, avoiding specific poses, or using alternative stretches that might be safer for my back. If possible, I would also appreciate a brief discussion before or after our next class.\n\nThank you for your time and support.\n\nBest regards,\n[Your Name]"),
        email(2,
              "You recently attended a conference at the university where you met Ms. Johnson, who is an expert in your field. You were impressed by her keynote speech and would like to follow up to ask if she would be available for a short interview for an article you are writing for class. You also want to express your admiration for her work.",
              ["Mention what you found impressive about her keynote speech.",
               "Request an interview at her earliest convenience.",
               "Explain the purpose of the interview and how it will be used."],
              "Ms. Johnson", "Request for Interview Following Keynote Speech",
              "Dear Ms. Johnson,\n\nI hope you are doing well. I am writing after your keynote speech at the university conference. Your explanation of ethical data use was impressive because it connected technical decisions with concrete effects on ordinary users, rather than treating ethics as a separate topic.\n\nCould I interview you for twenty minutes at any convenient time next week, either on campus or by video call? I can work around your schedule and will keep the conversation focused.\n\nThe interview will support a class article about responsible technology. I will quote you accurately and send the draft section for confirmation before submitting it. I would appreciate your help and am happy to provide any additional information you may need.\n\nThank you for your time and consideration.\n\nBest regards,\nJordan Lee"),
        disc(3, "Sociology", "Professor Diaz", "diaz.png",
             "We've been exploring how social media platforms influence public opinion in today's connected world. These platforms allow ideas, news, and perspectives to spread quickly, giving individuals and organizations powerful tools to shape conversations. From raising awareness to mobilizing support, social media plays a key role in how people engage with current events. Do you think its influence is mostly beneficial, or should we be more cautious about its reach and impact?",
             [post("Andrew", "andrew.png", "I think social media has a negative impact on public opinion. It can often create echo chambers, where people only hear opinions that reinforce their existing beliefs. For example, if my friends on social media all seem to be saying the same thing, how can we be challenged to think more independently?"),
              post("Claire", "kelly.png", "I believe that the influence of social media is mostly beneficial. It allows people to access a wide range of viewpoints and engage in all kinds of discussions and across languages. This enhances understanding and awareness of different issues.")],
             [{"title": "Caution First",
               "text": "I agree with Andrew that we should be more cautious about social media's influence on public opinion. Platforms often reward the most emotional posts, so a misleading claim can travel farther than a careful correction. Echo chambers make the problem worse because people may never see the later explanation. Claire is right that users can find diverse viewpoints if they search deliberately, and activists have used these tools to raise important issues. Those benefits, however, depend on habits that are not automatic. Until recommendation systems are more transparent and users check sources before sharing, the risks to public conversation remain larger than the gains. Caution does not mean abandoning the platforms; it means slower sharing, clearer labeling, and education that treats virality as a warning rather than as proof."},
              {"title": "Wider Access",
               "text": "While Andrew raises a valid concern about echo chambers, I strongly support Claire's view that social media's influence is mostly beneficial. Its ability to amplify diverse voices and foster global dialogue outweighs the risks. For instance, during recent environmental movements, platforms have enabled activists from remote regions to share firsthand accounts of climate impacts, reaching audiences worldwide and sparking policy discussions. This democratization of information challenges traditional media gatekeepers and encourages critical thinking by exposing users to varied perspectives. Although echo chambers exist, they can be mitigated through algorithmic transparency and user education. Thus, social media serves as a vital public forum when people compare sources instead of remaining inside a single group."}]),
        disc(4, "Communication Studies", "Professor Diaz", "diaz.png",
             "We've been discussing the influence of advertising on consumer behavior. Advertisements can inform consumers about new products and services, such as the latest tech products or new local businesses, potentially boosting sales and driving economic growth. However, some experts argue that advertisements can be deceptive, create unrealistic expectations about products, and promote materialistic values. Reflect on a specific advertisement that influenced your behavior. Do you think its impact was positive or negative? Why?",
             [post("Andrew", "andrew.png", "I think the primary effect of advertising is to inform consumers. Ads provide valuable information about products and services, helping consumers make informed purchasing decisions and boosting economic growth."),
              post("Kelly", "kelly.png", "I believe advertisements mainly manipulate consumer choices. They often create unrealistic expectations and encourage materialism, leading people to buy things they don't need and fostering a culture of overconsumption.")],
             [{"title": "Ads Can Distort",
               "text": "I agree with Kelly that advertising often has a negative effect because it sells a feeling rather than a realistic use. A fitness-tracker campaign I saw used heavily edited images of models with perfect bodies, implying that purchasing the product would lead to similar results. A friend bought the tracker expecting dramatic changes and felt discouraged when ordinary walking did not match the ad. Such ads manipulate choices by appealing to insecurity and equate self-worth with possessions. Andrew is right that ads can also list features and prices, and that information can be useful. The problem is that the emotional frame is usually stronger than the fine print. When an advertisement creates expectations a product cannot meet, its impact on consumer behavior is negative even if some specifications are technically true."},
              {"title": "Ads Can Inform",
               "text": "I think advertising can have a positive impact when it gives people information they would not otherwise compare carefully. I once chose a laptop after watching a manufacturer's video that showed battery tests, port types, and the weight of the machine in a backpack. Those details helped me avoid buying a heavier model that would have been inconvenient on campus. Andrew is right that this kind of information can support a better purchase and keep useful products visible. Kelly's concern about manipulation is fair, especially when ads hide limitations. The solution is not to treat every advertisement as a lie, but to use more than one source and ignore claims that cannot be measured. When an ad is specific, comparable, and honest about trade-offs, it can inform rather than merely create desire, which is a positive influence on consumer behavior."}]),
        disc(5, "Marketing", "Professor Diaz", "diaz.png",
             "We're studying how companies create recognizable identities through logos, colors, slogans, and advertising styles. Consider these two strategies. Some companies keep the same visual design and core advertising message for decades to build strong customer recognition and trust. Others regularly update their appearance, messaging, and marketing approach to match current trends and changing customer preferences. Which strategy do you think works better for building a successful business over many years? Why?",
             [post("Andrew", "andrew.png", "I believe maintaining a consistent brand identity is better for long-term success. When companies keep the same logos, colors, and messaging style, customers develop strong recognition and trust. People feel more comfortable purchasing from brands they can easily identify, which leads to repeat customers and recommendations."),
              post("Claire", "kelly.png", "I think adapting to changing market trends is more important for business growth. The marketplace constantly evolves with new technologies and younger generations, so brands have to update their design and advertising style to stay relevant and attract new customers while keeping existing ones interested.")],
             [{"title": "Keep the Core",
               "text": "I agree more with Andrew that maintaining a consistent brand identity is better for long-term success. Consistent colors, logos, and promises help customers recognize a company and attach past experiences to it. For example, a regional bank that keeps its core colors and service promise while updating digital tools remains familiar across generations. Recognition reduces uncertainty and makes recommendations more effective. Claire raises a valid concern: products and channels must still change. The better method is to adapt the offer without discarding the identity that people already trust. Changing appearance too often wastes accumulated recognition and forces the company to reintroduce itself repeatedly. A stable core with careful updates therefore supports a successful business over many years more reliably than constant reinvention."},
              {"title": "Refresh to Stay Seen",
               "text": "Adapting the brand to changing tastes can work better over many years because customers, especially younger ones, stop noticing a design that never changes. A company that keeps an outdated look may seem inattentive even if its products are sound. Claire is right that technologies and preferences shift, so messaging and visuals should be reviewed. Andrew is also right that trust depends on recognition, so the change should not be random. The stronger long-term strategy is periodic, researched updates: keep a few stable elements, such as a name or a simple symbol, while refreshing colors, photography, and slogans when evidence shows the old style no longer reaches new customers. That balance prevents both invisibility and confusion. A business that can look current without becoming unrecognizable is more likely to keep both loyal buyers and new ones."}]),
        disc(6, "Educational Psychology", "Professor Gupta", "diaz.png",
             "We've been discussing the impact of parental involvement on student achievement. Some studies suggest that active parental involvement, such as helping with homework and attending school events, boosts student performance in both the long term and short term. Other scholars have argued that too much parental involvement can lead to dependency and hinder the development of self-reliance among children. What are your thoughts on this?",
             [post("Claire", "kelly.png", "I believe active parental involvement is beneficial for children in general and student achievement in particular. For myself and for my friends, this has certainly been the case. When parents show interest in their child's education, it can motivate the child to perform better and feel supported."),
              post("Andrew", "andrew.png", "Although I do see the benefits to parents being involved in their children's academic achievement, I think that too much parental involvement can be detrimental. It may prevent students from developing independence and problem-solving skills, which are crucial for their long-term success.")],
             [{"title": "Support, Don't Take Over",
               "text": "I agree with Andrew that excessive parental involvement can be counterproductive. While support is important, over-involvement often prevents students from developing essential skills. For instance, when parents constantly complete homework, children may lack the chance to struggle and learn from mistakes, which builds resilience. In my own experience, classmates whose parents finished projects for them struggled later with independent tasks. Claire is right that interest and encouragement matter; children need to know someone is paying attention. A balanced approach is therefore better than either absence or control. Parents should provide guidance, ask questions, and attend important events, but allow children to take ownership of the work. That combination fosters self-reliance and prepares students for challenges beyond school, which is the more important long-term outcome."},
              {"title": "Show Up Consistently",
               "text": "Active parental involvement is beneficial when it means attention rather than substitution. Children who see a parent ask about school, attend a conference, or help organize a study schedule often feel that the work matters. Claire is right that this support can raise motivation. Andrew's warning is useful: doing the assignment for the child is not involvement, it is replacement. The kind of involvement that helps is structured and limited: a quiet place to work, a regular check that the task was attempted, and help finding a teacher or tutor when the student is stuck. That still leaves the student responsible for the thinking. Over time, consistent adult interest plus independent practice produces both achievement and self-reliance. Withdrawal is not the solution to over-help; clearer boundaries are."}]),
    ])


REPEATS = [
    ("bike",
     "You have a part-time job working at a bicycle repair workshop near campus. The technician is showing you how to train people to fix a flat tire. Listen to the technician and repeat what the technician says. Repeat only once.",
     "speaking_01_set28_repeat_q%02d_bicycle_tire_repair.mp3",
     [
        "First, select the right tool to remove the wheel.",
        "Next, deflate the tire completely.",
        "Carefully locate the puncture hole and mark it with a pen.",
        "Select a patch from the repair kit and apply it firmly.",
        "Use the pump to inflate the tire to the correct pressure.",
        "Check for additional leaks by submerging the tube in a bucket of water.",
        "If there are no new problems, reattach the wheel tightly back on the bicycle.",
     ]),
    ("travel",
     "You are working at a travel agency as part of an internship. Your manager is teaching you how to assist customers with booking vacation packages. Listen to the manager and repeat what the manager says. Repeat only once.",
     "speaking_02_set35_repeat_q%02d_travel_agency_trip_planning.mp3",
     [
        "Start with the customer's travel dates.",
        "Suggest flights that match their traveling times.",
        "Propose lodgings that fit their budget and are close to attractions.",
        "Offer travel insurance options to give clients peace of mind.",
        "Recommend guided tours that highlight the local culture.",
        "Before booking the reservation, go over the details with the client.",
        "When customers are ready to pay, process the payment to confirm their booking.",
     ]),
    ("projector",
     "You are working at a school as part of an internship. Your supervisor is training you to help students prepare for their science project presentations. Listen to the supervisor and repeat what the supervisor says. Repeat only once.",
     "speaking_03_set29_repeat_q%02d_classroom_projector_setup.mp3",
     [
        "Start by setting up the projector screen.",
        "Use the white board to highlight key points.",
        "Arrange your project materials neatly on the tables.",
        "Check all the equipment to ensure it works properly.",
        "Make sure your computer is set up with your presentation.",
        "It's a good idea to practice delivering your speech in front of some friends.",
        "Take time to review your notes thoroughly so you'll feel confident and prepared.",
     ]),
    ("platform",
     "You are being trained to help students use the university's online learning platform. Listen to your trainer and repeat what she says. Repeat only once.",
     "speaking_04_set17_repeat_q%02d_online_learning_platform.mp3",
     [
        "Log into the dashboard with your credentials.",
        "Check the Assignments tab for homework due dates.",
        "Access your course materials to read and download them.",
        "Participate in discussion boards to engage with peers.",
        "Track your progress by viewing your grades regularly online.",
        "Set up your daily notifications to stay updated on any new posts.",
        "Please use the help section we provided if you feel the need to resolve any issues.",
     ]),
]

INTERVIEWS = [
    ("grocery",
     "You have volunteered for a research study about grocery shopping habits. You will have a short online interview with a researcher. The researcher will ask you some questions.",
     "speaking_05_set22_interview_q%02d_grocery_shopping_habits.mp3",
     [
        ("Thank you for taking part in our study. I'd like to ask you some questions about your grocery shopping habits. First, how often do you go grocery shopping each week? Why that often?",
         "I typically go grocery shopping twice a week. I prefer this frequency because it allows me to buy fresh produce and perishables like fruits and vegetables without them spoiling. Shopping twice a week also helps me manage my budget better by avoiding impulse purchases that can happen with more frequent trips. Additionally, it fits well with my work schedule, as I can plan my shopping on weekends and mid-week evenings. This routine ensures I always have healthy food options at home while minimizing food waste."),
        ("Great, thank you. Can you tell me what types of items you usually buy when you go grocery shopping? For example, do you buy fresh produce, dairy products or packaged foods?",
         "When I head to the grocery store, my shopping list is quite varied to ensure a balanced diet. I always prioritize fresh produce like fruits and vegetables, as they are essential for health and can be used in many meals. Dairy products such as milk and yogurt are also regular purchases for their nutritional value. Additionally, I often buy packaged foods like pasta or canned goods for convenience, especially on busy days. This mix helps me maintain a healthy lifestyle while saving time."),
        ("Got it. When you are grocery shopping, how often do you impulse buy? In other words, buy things you did not plan on buying. What types of items do you or might you impulse buy?",
         "I impulse buy occasionally, usually when I am hungry or when a product is displayed near the checkout. The items are often snacks, a new drink, or a discounted bakery product rather than something expensive. I have learned that promotions can make an item feel necessary even when it was not part of my plan. To reduce this, I eat before shopping, use a written list, and wait a few minutes before adding an unplanned product. I do not forbid every extra purchase, but I ask whether I will actually use it that week. That simple question prevents most waste."),
        ("Great, that's helpful. Last question, some people believe that shopping at local farmers markets is better than shopping at large grocery stores. Do you agree or disagree with this opinion? Why?",
         "I generally prefer local farmers' markets for seasonal produce, but I do not think they are better for every purchase. Markets let customers speak directly with growers, learn when food was harvested, and support nearby farms. Produce can be fresher, and the visit feels more connected to the community. Large grocery stores, however, offer lower prices, longer hours, and essentials that local farms may not produce. My ideal routine combines both: I buy seasonal fruit and vegetables at a farmers' market when possible, then use a grocery store for staples. The better choice depends on availability, cost, and the product needed."),
     ]),
]


def build_speaking(pid, title, form, interview=None):
    tasks = []
    modules = []
    if form:
        key, instruction, pattern, samples = REPEATS[form - 1]
        for i, sample in enumerate(samples, 1):
            fname = pattern % i
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
        ikey, i_instruction, pattern, items = INTERVIEWS[interview - 1]
        start = 8 if form else 1
        mod = 2 if form else 1
        modules.append({"n": mod, "timeSec": 360, "from": start, "to": start + 3, "label": "Take an Interview"})
        for i, (stem, sample) in enumerate(items, 1):
            fname = pattern % i
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
    dump("2025-07-29-reading.json", build_reading())
    dump("2025-07-29-listening.json", build_listening())
    dump("2025-07-29-writing.json", build_writing())
    dump("2025-07-29-speaking.json", build_speaking(ID, TITLE + " · 口语 Form 1", 1, 1))
    dump("2025-07-29-speaking-f2.json", build_speaking(ID + "-s2", TITLE + " · 口语 Form 2", 2, None))
    dump("2025-07-29-speaking-f3.json", build_speaking(ID + "-s3", TITLE + " · 口语 Form 3", 3, None))
    dump("2025-07-29-speaking-f4.json", build_speaking(ID + "-s4", TITLE + " · 口语 Form 4", 4, None))
    copy_audio()
