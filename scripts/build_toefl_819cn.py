#!/usr/bin/env python3
"""Build 8.19 China offline TOEFL. Run: python3 scripts/build_toefl_819cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/8 月/8.19-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-08-19/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-08-19"
SET = "8.19"
TITLE = "新托福 8.19 国内线下"
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
    t, n = cw("Geographic Information Systems (GIS)", 1, n, [
        "Modern geographers employ advanced technologies, including geographic information systems (GIS), to analyze spatial data, enabling them to visualize patterns of urban development, resource allocation, and environmental change. This ",
        ("analy", "analytical"),
        " approach ",
        ("all", "allows"),
        " geographers ",
        ("t", "to"),
        " provide ",
        ("insi", "insights"),
        " into ",
        ("pres", "pressing"),
        " global ",
        ("iss", "issues"),
        " such ",
        ("a", "as"),
        " climate ",
        ("cha", "change"),
        ", migration, ",
        ("a", "and"),
        " sustainable ",
        ("devel", "development"),
        ", offering frameworks for informed decision-making and policy implementation. Understanding the geographic dimensions of these challenges is crucial for fostering resilience and adaptability in a rapidly changing world.",
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
        " as indicators of climate change—rapid melting signals shifts in global temperatures. Studying glaciers helps scientists understand past climate patterns and predict future environmental impacts, making them vital to global research.",
    ])
    tasks.append(t)
    t, n = cw("The Earliest Ancestor of the Modern Bicycle", 1, n, [
        "The earliest ancestor of the modern bicycle is probably a machine used in England in the early 1800s called a hobbyhorse. It ",
        ("h", "had"),
        " two ",
        ("whe", "wheels"),
        " and a ",
        ("pl", "place"),
        " to ",
        ("s", "sit"),
        ", but ",
        ("n", "no"),
        " pedals; ",
        ("rid", "riders"),
        " would ",
        ("pu", "push"),
        " it ",
        ("al", "along"),
        " with ",
        ("th", "their"),
        " feet. ",
        ("La", "Later"),
        ", an inventor added pedals directly to the front wheel, like a modern child's tricycle. This version, with a huge front wheel, was faster, but it was unsafe. Riders were high off the ground, and the two wheels were close together, making both balance and stopping difficult.",
    ])
    tasks.append(t)
    t, n = cw("Pigments", 1, n, [
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
    t, n = cw("The Odyssey", 1, n, [
        "The Odyssey is an ancient Greek epic poem that follows the hero, Odysseus, on his ten-year journey home after the Trojan War. It ",
        ("i", "is"),
        " widely ",
        ("consi", "considered"),
        " one ",
        ("o", "of"),
        " the ",
        ("grea", "greatest"),
        " works ",
        ("i", "in"),
        " the ",
        ("his", "history"),
        " of ",
        ("Euro", "European"),
        " literature. The Odyssey ",
        ("estab", "established"),
        " many ",
        ("narr", "narrative"),
        " structures ",
        ("a", "and"),
        " archetypes—like the hero's journey—that continue to shape storytelling today. It also delves into timeless human experiences. Odysseus's longing to return home, for example, resonates with the universal desire for belonging and stability. He must adapt, disguise, and rediscover himself, reflecting the fluid nature of identity.",
    ])
    tasks.append(t)
    tasks.append(daily("Kintsugi", 2, "Read an article in a student magazine.", {
        "kind": "card",
        "kicker": "STUDENT MAGAZINE",
        "title": "Kintsugi",
        "body": (
            "Originating in the late fifteenth century, kintsugi reflects the philosophy of wabi-sabi, which honors "
            "imperfection and transience. Its message extends beyond ceramics, inspiring personal growth and resilience "
            "by advising people to embrace flaws as part of life's narrative. Rather than viewing damage as failure, "
            "kintsugi reframes it as transformation, symbolizing strength, authenticity, and renewal in a perfection-driven "
            "world. Today, workshops and studios worldwide teach both its technical craft and its profound philosophy, "
            "offering learners not only artistic skills but insights into acceptance, individuality, and creative expression. "
            "Kintsugi stands as a timeless reminder that beauty lies in uniqueness and in the stories our \"cracks\" reveal, "
            "an idea that applies to academic life and beyond."
        ),
    }, [
        q(n, "According to the article, what philosophical perspective does kintsugi promote?", {
            "A": "Minimalism, emphasizing simplicity and the elimination of excess",
            "B": "Ethics, focusing on honor and discipline in craftsmanship",
            "C": "Humility, valuing imperfection and the transient nature of life",
            "D": "Purity, highlighting spiritual cleanliness and ritual renewal",
        }, "C"),
        q(n + 1, "What does the article suggest about the symbolic meaning of repairing pottery with precious metals?", {
            "A": "Wealth and luxury are essential for authentic art.",
            "B": "Flaws can be turned into sources of value and beauty.",
            "C": "Artisans prioritize aesthetics over philosophical significance.",
            "D": "Objects lose their cultural value when restored with cheap materials.",
        }, "B"),
        q(n + 2, 'Why does the author of the article mention "a perfection-driven world"?', {
            "A": "To argue that modern society has completely abandoned traditional art forms",
            "B": "To suggest that flawless craftsmanship is the goal of contemporary design",
            "C": "To contrast kintsugi's philosophical message with a common present-day attitude",
            "D": "To explain why kintsugi techniques are rarely used in professional pottery today",
        }, "C"),
    ]))
    n += 3
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
        q(n + 1, "The discovery of Sinosauropteryx suggested which of the following?", {
            "A": "Not all dinosaurs were relatively small meat-eaters.",
            "B": "Many dinosaurs likely had feathers on their bodies.",
            "C": "Dinosaur fossils are more likely to be found in China than in other parts of the world.",
            "D": "Feathered dinosaurs were generally smaller than those without feathers.",
        }, "B"),
        q(n + 2, "Why does the author provide information about Caudipteryx?", {
            "A": "To show another example of a dinosaur with hairlike feathers",
            "B": "To suggest that Sinosauropteryx likely evolved from Caudipteryx",
            "C": "To make the point that dinosaur feathers likely became more complex over time",
            "D": "To show that there is less variety among types of dinosaur feathers than has been commonly assumed",
        }, "C"),
        q(n + 3, "What is the relationship between paragraphs 2 and 3?", {
            "A": "Paragraph 3 provides an example to support the general point about feathers introduced in paragraph 2.",
            "B": "Paragraph 3 challenges an idea about feathers proposed in paragraph 2.",
            "C": "Paragraph 3 focuses on the roles played by the feathers described in paragraph 2.",
            "D": "Paragraph 3 summarizes the ideas about feathers presented in paragraph 2.",
        }, "C"),
        insert_q(n + 4, "Dinosaurs may have also used their feathers to protect their eggs.", "C"),
    ]))
    n += 5
    tasks.append(academic("Quantum Dots", 2, [
        "Quantum dots are tiny semiconductor particles with unique optical properties, making them valuable in display technology. When exposed to light, these nanoparticles emit bright, pure colors that can be finely tuned by varying their size. This allows for more vibrant and accurate colors in screens, surpassing traditional display technologies.",
        "Their application in displays has revolutionized the consumer electronics industry. For example, quantum dot-enhanced televisions offer a broader color spectrum and energy conservation compared to conventional light-emitting diode (LED) displays because they require less backlighting. Environmental benefits are another advantage. Traditional displays often use harmful heavy metals like cadmium and lead. Quantum dots can be made from less toxic materials, and researchers are working on cadmium-free quantum dots to further reduce environmental impact.",
        "The manufacture of quantum dots requires extreme precision. As a result, challenges remain in scaling up production. However, this is a worthwhile endeavor because quantum dots potentially have many applications outside of electronics, such as in biological research. Their small size and bright emission are ideal for tagging and tracking molecules in living organisms. This allows for long-term observation of dynamic biological processes.",
    ], [
        q(n, "The color of quantum dots can be controlled by changing", {
            "A": "their size after exposure to light",
            "B": "the direction in which they are displayed",
            "C": "the amount of light they are exposed to",
            "D": "the color of the light they are exposed to",
        }, "A"),
        q(n + 1, "What makes quantum dot technology in televisions efficient?", {
            "A": "The vibrancy of the colors",
            "B": "The reduced need for backlighting",
            "C": "The larger color spectrum",
            "D": "The size of the particles",
        }, "B"),
        q(n + 2, "What is identified as an environmental benefit of quantum dots?", {
            "A": "The ability to make cadmium more pure",
            "B": "The ability to remove lead from living organisms",
            "C": "Limiting environmental impacts to small areas",
            "D": "Less use of some poisonous substances",
        }, "D"),
        q(n + 3, 'Why does the passage state that the "manufacture of quantum dots requires extreme precision"?', {
            "A": "To imply that quantum dots' environmental impact might increase",
            "B": "To praise the hard work of quantum dot manufacturers",
            "C": "To challenge the claim that using quantum dots is worthwhile",
            "D": "To explain why the production of quantum dots is difficult to increase",
        }, "D"),
        q(n + 4, "How can biologists use quantum dots?", {
            "A": "For studying very small living organisms",
            "B": "For observing the movement of molecules",
            "C": "For including electronic tools in research",
            "D": "For making some biological processes more dynamic",
        }, "B"),
    ]))
    n += 5
    tasks.append(academic("Unveiling Earth's Core", 2, [
        "Geophysicists have long been intrigued by Earth's core (the center of Earth). When earthquakes occur, they send seismic waves through the planet, offering rare glimpses into this mysterious world. Interestingly, these waves sometimes slow down in unexpected ways, suggesting that the core's makeup may be more complex than just iron and nickel as previously believed. Some scientists suggest it might not be entirely solid, possibly containing molten layers or unusual elements that create a unique state of matter.",
        "Advanced computer models now depict the core not as a homogeneous sphere, but as a layered structure with distinct regions. These models also propose phenomena like super-rotation—where the inner core (the inner part of Earth's core) spins slightly faster than the rest of the planet—and directional differences in wave behavior, known as anisotropies. Collectively, these findings portray a core in constant motion.",
        "But is this picture complete? Some researchers argue that these models rely on overly simplified assumptions. Truly understanding the inner core demands cutting-edge technology and fresh perspectives. The limitations of current theories remind us that the deeper we explore planetary science, the more we challenge our understanding of it.",
    ], [
        q(n, "Why does the author discuss earthquakes in paragraph 1?", {
            "A": "To demonstrate the fascination of geophysicists with Earth's core",
            "B": "To explain one way scientists gain insights into Earth's core",
            "C": "To highlight the destructive effects of seismic waves on Earth's core",
            "D": "To challenge the idea that Earth's core is a mysterious world",
        }, "A"),
        q(n + 1, "Why might seismic waves slow down when passing through Earth's core?", {
            "A": "Because of the solid nature of the core",
            "B": "Because of the presence of iron and nickel",
            "C": "Because of the possible presence of molten layers or unusual elements",
            "D": "Because of the strength of the elements that make up the core",
        }, "C"),
        q(n + 2, 'The word "Collectively" in the passage is closest in meaning to',
          {"A": "generally", "B": "together", "C": "somehow", "D": "interestingly"}, "B"),
        q(n + 3, "All of the following about Earth's core EXCEPT:", {
            "A": "Earth's core has different layers.",
            "B": "The inner part of Earth's core rotates a little faster than other parts of Earth do.",
            "C": "Wave behavior in Earth's core shows directional differences.",
            "D": "The super-rotation of Earth's core is caused by anisotropies.",
        }, "D"),
        # ponytail: player has no sentence-click; official identify-the-sentence → MCQ
        q(n + 4, "Identify the sentence in paragraph 3 that describes a specific criticism of computer models of the inner core.", {
            "A": "But is this picture complete?",
            "B": "Some researchers argue that these models rely on overly simplified assumptions.",
            "C": "Truly understanding the inner core demands cutting-edge technology and fresh perspectives.",
            "D": "The limitations of current theories remind us that the deeper we explore planetary science, the more we challenge our understanding of it.",
        }, "B"),
    ]))
    n += 5
    tasks.append(academic("Circadian Rhythm Disruption", 2, [
        'Circadian rhythms, the internal clocks regulating organisms\' physiological processes, are primarily driven by light exposure. These rhythms may be disrupted by the increased artificial light of urban environments, leading to what scientists call "circadian misalignment." This misalignment not only affects sleep patterns but is linked to a higher prevalence of metabolic disorders. Interestingly, research on nocturnal animals reveals that these creatures have evolved mechanisms, such as unique melatonin production cycles, for thriving in conditions that disrupt human circadian rhythms. Such adaptations could inform potential human therapies.',
        "Recent studies suggest that manipulating light exposure can help reset circadian clocks. Experiments demonstrated that disrupted rhythms can be realigned by the simulation of natural light cycles. However, this approach is not universally effective. Some individuals experience persistent misalignment, suggesting that other environmental or genetic factors may play significant roles.",
        "Moreover, the factors affecting circadian regulation extend beyond light: temperature, diet, and social interactions all influence these rhythms. This complex causal web requires a multidisciplinary approach to develop comprehensive solutions. Cutting-edge research is now exploring therapeutic drugs that can rectify disruptions to the natural circadian rhythmic cycles. Whether these efforts will yield sustainable treatment options remains to be seen.",
    ], [
        q(n, 'Why does the author mention the "higher prevalence of metabolic disorders"?', {
            "A": "To explain why circadian misalignment is increasing in urban environments",
            "B": "To suggest a causal relationship between metabolic illness and sleep disturbances",
            "C": "To support the claim that circadian misalignment affects sleep patterns",
            "D": "To describe one effect of the disruption of circadian rhythms by artificial light",
        }, "D"),
        q(n + 1, "Why might some nocturnal animal adaptations be important for human therapies?", {
            "A": "They provide evidence that light exposure is the greatest driver of circadian rhythms.",
            "B": "They offer clues about thriving in conditions that cause circadian misalignment in people.",
            "C": "They show that melatonin is not always effective in regulating sleep patterns.",
            "D": "They prove that animals' melatonin production cycles closely resemble those of humans.",
        }, "B"),
        q(n + 2, "What does the author suggest about simulating natural light cycles as a way of resetting circadian clocks?", {
            "A": "Most people experiencing circadian misalignment have seen no benefit from the treatment.",
            "B": "Most researchers agree that this treatment is currently the only effective approach.",
            "C": "The approach is most effective for people with a genetic predisposition for sleep disorders.",
            "D": "This approach has been successfully used to help many individuals restore their sleep patterns.",
        }, "D"),
        q(n + 3, "What is the relationship between paragraph 2 and paragraph 3?", {
            "A": "Paragraph 2 defines a concept; paragraph 3 provides more detail by discussing specific examples.",
            "B": "Paragraph 2 evaluates a focused approach; paragraph 3 points to broader challenges and solutions.",
            "C": "Paragraph 2 proposes a theory; paragraph 3 notes potential objections to it and suggests responses.",
            "D": "Paragraph 2 outlines a methodology; paragraph 3 reports the results of applying it to a problem.",
        }, "B"),
        q(n + 4, 'The word "rectify" in the passage is closest in meaning to',
          {"A": "disclose", "B": "approve", "C": "relieve", "D": "document"}, "C"),
    ]))
    n += 5
    tasks.append(academic("Feedback Systems and Their Unintended Effects", 2, [
        "Consider how feedback controls temperature in a home heating system: A thermostat compares the current temperature to a set point and modifies the heating output based on the difference. However, time delays in this loop can cause overcorrections, resulting in temperature fluctuations. If the feedback response is not precisely calibrated, the system may oscillate continuously, failing to stabilize.",
        {"insert": "A", "t": "In more complex systems, such as automated flight control or robotic motion, feedback mechanisms can behave unpredictably under certain conditions."},
        {"insert": "B", "t": "For example, small timing mismatches or overly sensitive sensors may cause a drone to overreact to minor disturbances, leading to erratic flight patterns."},
        {"insert": "C", "t": "This phenomenon, known as chaotic behavior, reveals that feedback is not inherently stabilizing."},
        {"insert": "D", "t": "Instead, it demands careful tuning and predictive modeling."},
        "As control engineering advances, understanding and mitigating this unpredictability will be essential for ensuring reliability and precision, especially in high-stakes fields like aerospace and robotics.",
    ], [
        q(n, "According to the passage, what advantage do closed-loop feedback systems provide?", {
            "A": "They can be easily adjusted using remote controls.",
            "B": "They continuously monitor their own performance.",
            "C": "They are less complicated than other feedback systems.",
            "D": "They assist engineers in creating more stable designs.",
        }, "B"),
        q(n + 1, "What happens when a home heating system is not precisely calibrated as described in paragraph 2?", {
            "A": "The temperature in the house goes up and down rather than remaining at a constant level.",
            "B": "The temperature in the house remains well below the set point.",
            "C": "The thermostat is unable to correctly determine the current temperature in the house.",
            "D": "The home heating system is likely to break down under the stress of frequent oscillations.",
        }, "A"),
        q(n + 2, "Why does the author discuss drones in paragraph 3?", {
            "A": "To argue that drones are so unstable that they pose a safety risk to the public",
            "B": "To suggest that controlling drones is easier than controlling robots",
            "C": "To provide an example of chaotic behavior in a feedback system",
            "D": "To explain how navigational sensors function during flight",
        }, "C"),
        q(n + 3, 'The word "mitigating" in the passage is closest in meaning to',
          {"A": "preventing", "B": "monitoring", "C": "decreasing", "D": "analyzing"}, "C"),
        insert_q(n + 4, "A sudden gust of wind, for instance, might trigger an exaggerated correction, making the drone veer sharply or wobble midair instead of stabilizing smoothly.", "C"),
    ]))
    n += 5
    tasks.append(academic("The Benefits of Music Education", 2, [
        "Studies such as those by the National Association for Music Education (NAfME) and research published in Frontiers in Psychology have shown that children who study music often demonstrate improvements in memory, language acquisition, and spatial-temporal reasoning. These cognitive gains are attributed to the discipline and structured practice inherent in learning music, which strengthens neural pathways associated with attention and processing.",
        "Beyond cognition, music education contributes meaningfully to social development. Participation in an ensemble—a group of musicians performing together—requires active collaboration, listening, and nonverbal communication, fostering empathy and cooperative behavior. This group dynamic differs from traditional classroom settings and can support the development of interpersonal skills.",
        "Moreover, music provides a safe space for emotional exploration. Students engage with complex emotions, both their own and those conveyed by others, through the expressive nature of music itself. This experience can enhance emotional intelligence and serve as a constructive outlet for stress. Despite these documented benefits, music programs in U.S. schools are often viewed as nonessential compared to core academic subjects and thus vulnerable to budget cuts. This reduction may disproportionately affect students who could benefit most from music's holistic contributions, potentially limiting their cognitive, social, and emotional growth.",
    ], [
        q(n, 'Why does the author mention "neural pathways associated with attention and processing"?', {
            "A": "To explain one way in which music might improve certain mental skills",
            "B": "To highlight the parts of the brain used when listening to music",
            "C": "To contradict the results of a study in Frontiers in Psychology",
            "D": "To suggest that music education has little effect on cognitive development",
        }, "A"),
        q(n + 1, "Based on the discussion in the passage, what type of musical activity would be least likely to support social development?", {
            "A": "Playing in an orchestra",
            "B": "Singing in a choir",
            "C": "Calming oneself with peaceful music",
            "D": "Being a band member",
        }, "C"),
        q(n + 2, "According to the passage, music education promotes social development in all of the following ways EXCEPT", {
            "A": "by developing listening skills",
            "B": "by teaching students to communicate non-verbally",
            "C": "by encouraging cooperative behavior",
            "D": "by setting high standards for performance quality",
        }, "D"),
        q(n + 3, "What does the passage suggest about music education in the United States?", {
            "A": "It is acknowledged to be a necessary part of the school curriculum.",
            "B": "It is at greater risk of losing its funding than other school subjects are.",
            "C": "Some parents fear that time and money spent on music programs will limit their children's academic growth.",
            "D": "Some parents want to see further studies done on the benefits of music education.",
        }, "B"),
        q(n + 4, 'The word "holistic" in the passage is closest in meaning to',
          {"A": "documented", "B": "celebrated", "C": "comprehensive", "D": "well-known"}, "C"),
    ]))
    n += 5
    tasks.append(academic("Diane Arbus and the Debate over Portraiture", 2, [
        "Diane Arbus (1923–1971) occupies a singular place in the history of photography, celebrated and criticized for her stark, intimate portraits of a wide range of people, including some of unconventional appearance or marginalized social status. Her work has long provoked debate because it resists easy moral or aesthetic categorization.",
        "Some critics, such as Susan Sontag, argued that Arbus' photographs create a troubling distance between viewer and subject. Sontag claimed that Arbus' images risk turning people into spectacles of oddity, suggesting that her gaze could be predatory in its fascination with difference. Others, however, see Arbus as a profoundly empathetic artist. Writers like Arthur Lubow emphasize her ability to reveal her subjects' complexity and dignity, noting that many of them collaborated willingly and even joyfully in the creation of their portraits.",
        "A further line of debate surrounds Arbus' style: her use of frontal composition, square format, and direct flash has been interpreted negatively—as a cold, clinical approach—and positively—as a method that strips away artifice to expose deeper truths. Ultimately, Arbus' work continues to inspire disagreement because it challenges viewers to confront their own assumptions about normalcy, beauty, and vulnerability. Her photographs remain powerful precisely because they refuse to resolve these tensions.",
    ], [
        q(n, 'The word "stark" in the passage is closest in meaning to',
          {"A": "severe", "B": "graceful", "C": "classic", "D": "natural"}, "A"),
        q(n + 1, "The passage suggests which of the following about Sontag?", {
            "A": "She believed that Arbus called too much attention to her own technique in her portraits.",
            "B": "She admired Arbus's style but criticized her subject matter.",
            "C": "She viewed Arbus's photography as exploitative.",
            "D": "She felt that Arbus misunderstood her subjects.",
        }, "C"),
        q(n + 2, 'The author mentions "complexity and dignity" primarily in order to', {
            "A": "identify traits that Arbus looked for when choosing photographic subjects",
            "B": "illustrate how some viewers of Arbus' work have refuted a negative view of her",
            "C": "highlight one way in which Arbus' photographs are unconventional",
            "D": "explain why Arbus preferred frontal composition to other ways of posing subjects",
        }, "B"),
        q(n + 3, "The passage indicates that Arbus' style", {
            "A": "helps explain why Arbus' subjects often collaborated willingly in the creation of their portraits",
            "B": "reflected Arbus' preference for an unusual type of photographic film",
            "C": "influenced the way in which other photographers approached portraiture",
            "D": "has been viewed by some people as effective in revealing an authentic reality",
        }, "D"),
        q(n + 4, "It can be inferred that the author regards the disagreements created by Arbus' photographs as", {
            "A": "evidence that Arbus has been misunderstood",
            "B": "essential to the photographs' power as works of art",
            "C": "a reflection of the influence of Sontag on Arbus' reputation",
            "D": "arising from false assumptions about Arbus' style",
        }, "B"),
    ]))
    return paper(ID, "reading", "阅读", [
        {"n": 1, "timeSec": 1680, "from": 1, "to": 70},
        {"n": 2, "timeSec": 1440, "from": 71, "to": 108},
    ], tasks)


def build_listening():
    talks = [
        (1, "Indigo Trade", "L01_Indigo_Trade.mp3", "listening_01_indigo_trade.mp3", [
            ("What is the main topic of the talk?", {
                "A": "Advantages and disadvantages of indigo for coloring jeans",
                "B": "The role of indigo in British trade and colonial expansion",
                "C": "The history of the indigo trade and indigo's reappearance as a modern commodity",
                "D": "Qualities that make indigo a viable commercial product"}, "C"),
            ("What factor contributed most to the decline of natural indigo in industrial use?", {
                "A": "The effects of climate change on Indigofera plants",
                "B": "Labor shortages in the British Empire",
                "C": "The invention of synthetic indigo",
                "D": "Trade restrictions"}, "C"),
            ("What explains the appeal of natural indigo in today's market?", {
                "A": "It is seen as good for the environment.",
                "B": "It is the least expensive dye available.",
                "C": "It requires very little processing.",
                "D": "It is used in traditional rituals."}, "A"),
            ("Why does the speaker discuss the labor involved in traditional indigo dye extraction?", {
                "A": "To explain why indigo processing can be interesting for tourists",
                "B": "To support the claim that indigo is good for traditional economies",
                "C": "To challenge the claim that some producers use harsh chemicals",
                "D": "To introduce one problem with using natural indigo"}, "D"),
        ]),
        (1, "Nanoparticles in Everyday Materials", "L02_Nanoparticles_in_Everyday_Materials.mp3", "listening_02_nanoparticles.mp3", [
            ("What is the talk mainly about?", {
                "A": "Recent advances in nanotechnology",
                "B": "A problem with nanotechnology",
                "C": "The physics of nanotechnology",
                "D": "Various uses of nanotechnology"}, "D"),
            ("What advantage of a new sunscreen does the speaker mention?", {
                "A": "It is invisible when applied on skin.",
                "B": "It can be used in any weather.",
                "C": "It does not contain titanium dioxide.",
                "D": "It is effective when used in tiny amounts."}, "A"),
            ("What does the speaker point out about silver?", {
                "A": "It was used in ointments for millennia.",
                "B": "It can stop the growth of harmful microbes.",
                "C": "It can help increase the transparency of glass.",
                "D": "It was considered more valuable than gold in ancient Rome."}, "B"),
            ("Why does the speaker mention the amount of gold nanoparticles in pink tesserae?", {
                "A": "To help explain why most of the tesserae were very expensive",
                "B": "To help people understand what ancient Roman tesserae looked like",
                "C": "To emphasize an effect of heating gold nanoparticles between layers of glass",
                "D": "To argue that the Romans knew how to use tiny particles for coloring tesserae"}, "D"),
        ]),
        (1, "Gift Giving, Reciprocity, and Potlatch", "L03_Gift_Giving_Reciprocity_and_Potlatch.mp3", "listening_03_gift_giving.mp3", [
            ("What is the main topic of the talk?", {
                "A": "How gift giving reflects social status",
                "B": "How gift giving customs have changed over time",
                "C": "How gift giving carries cultural and social meaning",
                "D": "How gift giving affects emotional well-being"}, "C"),
            ("What does the speaker suggest about gift giving in Indigenous communities?", {
                "A": "It is mainly used to distribute wealth evenly.",
                "B": "It is discouraged during formal gatherings.",
                "C": "It is a way to display wealth and status.",
                "D": "It helps maintain social ties within the group."}, "D"),
            ("What point does the speaker make about the continuous loop of gift giving?", {
                "A": "It helps preserve traditional customs.",
                "B": "It encourages people to spend more on gifts over time.",
                "C": "It strengthens relationships through ongoing exchange.",
                "D": "It can sometimes feel excessive or unnecessary."}, "C"),
            ("Why does the speaker mention potted plants?", {
                "A": "To show how eco-friendly gifts are universally accepted",
                "B": "To give an example of a gift that may be misinterpreted",
                "C": "To illustrate how gift giving can reflect personal taste",
                "D": "To compare traditional and modern gift preferences"}, "B"),
        ]),
        (1, "Viral Marketing Strategies", "L04_Viral_Marketing_Strategies.mp3", "listening_04_viral_marketing.mp3", [
            ("What is the talk mainly about?", {
                "A": "The importance of brand reputation for a brand's success",
                "B": "A new method by which brands gain attention",
                "C": "The marketing of a drug for a virus",
                "D": "A cultural effect of social networks"}, "B"),
            ("What does the speaker say about the cost of viral marketing?", {
                "A": "It is cost-effective compared to traditional advertising methods.",
                "B": "It is more expensive than other forms of advertising.",
                "C": "It involves higher costs at first but lower costs later.",
                "D": "Its costs are similar to those of other advertising methods."}, "A"),
            ("What does the speaker say about content that is more likely to become viral?", {
                "A": "It requires a large amount of research to produce.",
                "B": "It is usually produced by young people.",
                "C": "It often includes a powerful moral message.",
                "D": "It can often be risky for a brand."}, "D"),
            ("What will the speaker most likely discuss next?", {
                "A": "Successful examples of viral marketing",
                "B": "The role of traditional media in viral marketing",
                "C": "The future of viral marketing",
                "D": "The impact of viral marketing on consumer behavior"}, "A"),
        ]),
        (1, "Dark Stores", "L05_Dark_Stores.mp3", "listening_05_dark_stores.mp3", [
            ("What aspect of dark stores does the speaker mainly discuss?", {
                "A": "Their influence on the retail market and society",
                "B": "Their architectural design and layout",
                "C": "Their similarities to traditional storefronts",
                "D": "Their role in the history of warehouse development"}, "A"),
            ("According to the talk, why can dark stores offer lower prices?", {
                "A": "Because they sell large quantities of goods",
                "B": "Because they are not focused on making a profit",
                "C": "Because they obtain less expensive products",
                "D": "Because they have lower overhead expenses"}, "D"),
            ("Why does the speaker mention grocery delivery?", {
                "A": "To illustrate how dark stores compete with traditional supermarkets",
                "B": "To compare delivery speeds in urban and nonurban environments",
                "C": "To suggest that dark stores mainly sell perishable items",
                "D": "To explain why consumers are willing to pay higher fees"}, "A"),
            ("What point does the speaker make about dark stores and employment?", {
                "A": "Many temporary employees are needed to set dark stores up.",
                "B": "Employees in dark stores need to be comfortable with technology.",
                "C": "Dark stores do not need many in-store workers.",
                "D": "Dark stores are able to pay their employees more."}, "C"),
        ]),
        (1, "Trilobite Median Eye", "L06_Trilobite_Median_Eye.mp3", "listening_06_trilobite.mp3", [
            ("Why does the speaker mention horseshoe crabs?", {
                "A": "To point out how trilobites adapted to life in the sea",
                "B": "To help explain why trilobites went extinct",
                "C": "To emphasize how hard trilobites' exoskeletons were",
                "D": "To describe what trilobites looked like"}, "D"),
            ("What does the speaker say about eyes with thousands of small lenses?", {
                "A": "They were helpful for producing sharp images.",
                "B": "They were an unusual characteristic in trilobites.",
                "C": "They were effective for seeing movement.",
                "D": "They covered only a small area of the trilobite's head."}, "C"),
            ("What did researchers learn from the fossil in the study?", {
                "A": "Adult trilobites had an eye in the middle of the forehead.",
                "B": "Trilobites had three joints on each of their legs.",
                "C": "Trilobites grew more body segments throughout their lives.",
                "D": "Young trilobites slowly developed hard exoskeletons."}, "A"),
            ("What does the speaker imply about the fossil in the study?", {
                "A": "Its exoskeleton was lighter than expected.",
                "B": "Its poor condition provided a benefit.",
                "C": "It was the first fossil discovered of a trilobite in a larval stage.",
                "D": "It was found near fully-preserved trilobite fossils."}, "B"),
        ]),
        (1, "Delayed Rewards and Positive Reinforcement", "L07_Delayed_Rewards_and_Positive_Reinforcement.mp3", "listening_07_delayed_rewards.mp3", [
            ("What is the main topic of the talk?", {
                "A": "The difficulty of setting goals for animals",
                "B": "The relationship between motivation and long-term behavior",
                "C": "The application of a psychological theory about rewards",
                "D": "The guidelines for identifying problematic behavior"}, "C"),
            ("What is the key assumption behind positive reinforcement?", {
                "A": "Praise is more effective than tangible rewards.",
                "B": "Behaviors are strengthened when followed by rewards.",
                "C": "Animals and humans respond the same way to training.",
                "D": "People are naturally motivated by competition."}, "B"),
            ("What point does the speaker make about animal training?", {
                "A": "Delayed rewards are ineffective for animals.",
                "B": "Animals learn best through observation and imitation.",
                "C": "Emotional bonding is the key to successful animal training.",
                "D": "Animals learn faster when trained in groups."}, "A"),
            ("Why does the speaker mention watering weeds?", {
                "A": "To advocate for gentle parenting techniques",
                "B": "To warn against reinforcing unwanted behavior",
                "C": "To explain how small actions lead to big changes",
                "D": "To describe the consequences of inconsistent feedback"}, "B"),
        ]),
        (1, "Inventor Collaboration: Lewis Latimer and Hiram Maxim", "L08_Inventor_Collaboration_Lewis_Latimer_and_Hiram_Maxim.mp3", "listening_08_latimer_maxim.mp3", [
            ("What does the speaker say is a false belief about nineteenth-century inventors?", {
                "A": "That their inventions were available to the general public",
                "B": "That they were famous in their time",
                "C": "That they worked in laboratories",
                "D": "That they created their inventions alone"}, "D"),
            ("How did Lewis Latimer learn to be a drafter?", {
                "A": "By teaching himself",
                "B": "By studying with a tutor",
                "C": "By receiving help from an inventor",
                "D": "By going to a special school"}, "A"),
            ("Why does the speaker mention that Latimer was a poet?", {
                "A": "To point out why Hiram Maxim was impressed by Latimer at first",
                "B": "To help explain the beauty of Latimer's technical drawings",
                "C": "To introduce Latimer's collaborative project with a musician",
                "D": "To describe how Latimer's career changed after he worked as drafter"}, "B"),
            ("What did Latimer achieve in his work with Hiram Maxim?", {
                "A": "Latimer helped make lightbulbs more available to the public.",
                "B": "Latimer invented a new way of producing electricity.",
                "C": "Latimer created a new drawing style that was useful for inventors.",
                "D": "Latimer made a drawing that helped convince the public of the usefulness of electric lighting."}, "A"),
        ]),
        (1, "The Color Blue", "L09_The_Color_Blue.mp3", "listening_09_color_blue.mp3", [
            ("Why was blue considered a symbol of wealth in ancient art?", {
                "A": "It was associated with the color of high-value coins.",
                "B": "It was easy to produce but hard to preserve.",
                "C": "It was made from a rare and costly mineral.",
                "D": "It was a color only royalty was allowed to wear."}, "C"),
            ("How did the use of blue in painting change during the Renaissance?", {
                "A": "Artists stopped using blue entirely.",
                "B": "Due to new mining techniques, blue became cheaper to acquire.",
                "C": "Oil paints made it easier to mix and layer blue.",
                "D": "Blue was replaced by green as the dominant color."}, "C"),
            ("What impact did the development of Prussian blue have on art?", {
                "A": "It made paintings that used it more valuable.",
                "B": "It made blue more affordable and widely used by artists.",
                "C": "It was associated with paintings made only in Germany.",
                "D": "It had little impact, as most artists disliked it."}, "B"),
            ("According to the speaker, why do some still prefer lapis lazuli over synthetic dyes?", {
                "A": "It dries more quickly.",
                "B": "It is easier to mix with other colors.",
                "C": "It is less likely to fade over time.",
                "D": "It has a deeper, more vibrant appearance."}, "D"),
        ]),
        (2, "Pangolins and Ecosystem Balance", "L10_Pangolins_and_Ecosystem_Balance.mp3", "listening_10_pangolins.mp3", [
            ("What does the speaker mainly discuss?", {
                "A": "The benefits of an animal's unusual behaviors",
                "B": "The environments where scaled animals are found",
                "C": "The efforts to protect an animal from habitat loss",
                "D": "The way an animal developed its feeding habits"}, "A"),
            ("Why does the speaker mention hedgehogs?", {
                "A": "To describe an animal that attacks the Indian pangolin with spikes",
                "B": "To illustrate the technique that the Indian pangolin uses to protect itself",
                "C": "To point out a mammal that is related to the Indian pangolin",
                "D": "To explain the approximate size of the Indian pangolin"}, "B"),
            ("What point does the speaker make about the Indian pangolin's diet?", {
                "A": "The Indian pangolin's diet can cause its ecosystem to become unbalanced.",
                "B": "The Indian pangolin spends the day searching for insects to eat.",
                "C": "The Indian pangolin's diet depends on the environment where it lives.",
                "D": "The Indian pangolin eats a large number of ants and termites."}, "D"),
            ("According to the speaker, what is the effect of Indian pangolin's disturbing the soil?", {
                "A": "The soil becomes healthier for plants to grow in it.",
                "B": "The removed soil covers plants that were growing nearby.",
                "C": "Many local farmers take advantage of the changed soil.",
                "D": "The tunnels help ant colonies connect to each other."}, "A"),
        ]),
        (2, "Soap Bubbles and Thin Films", "L11_Soap_Bubbles_and_Thin_Films.mp3", "listening_11_soap_bubbles.mp3", [
            ("What is the main topic of the talk?", {
                "A": "Chemical reactions that occur within soap bubbles",
                "B": "How light produces shifting colors on certain surfaces",
                "C": "How research on the behavior of light in science has evolved",
                "D": "The drawbacks and benefits of using soap bubbles in experiments"}, "B"),
            ("According to the talk, what must happen to light waves for constructive interference to occur?", {
                "A": "They must cancel each other out.",
                "B": "They must be absorbed by the bubble.",
                "C": "They must align to amplify their effects.",
                "D": "They must reflect only from the outer surface."}, "C"),
            ("According to the talk, why do the colors on a soap bubble keep shifting?", {
                "A": "Because air currents scatter the light unevenly",
                "B": "Because pigments inside the bubble move around",
                "C": "Because the bubble absorbs different colors as it grows larger",
                "D": "Because certain features of the light and the bubble keep changing"}, "D"),
            ("Why does the speaker mention the fragility of soap bubbles?", {
                "A": "To highlight a challenge in mimicking soap bubble designs",
                "B": "To provide an example of the inefficiency of designs in nature",
                "C": "To explain why soap bubbles are used in scientific experiments",
                "D": "To suggest that soap bubbles can actually be used to create durable materials"}, "A"),
        ]),
        (2, "Termite-Inspired Architecture", "L12_Termite-Inspired_Architecture.mp3", "listening_12_termite_architecture.mp3", [
            ("What is the main topic of the talk?", {
                "A": "A type of architecture that combines modern needs with traditional styles",
                "B": "A building project designed to protect local plant and animal life",
                "C": "The use of natural materials in modern construction",
                "D": "A design solution inspired by nature"}, "D"),
            ("What is the Eastgate Centre built to house?", {
                "A": "A research center",
                "B": "An energy production facility",
                "C": "A factory for air conditioners",
                "D": "Offices and stores"}, "D"),
            ("What was the architect's main challenge when designing the Eastgate Centre?", {
                "A": "Designing a tall structure using only brick and concrete",
                "B": "Avoiding the need for conventional air conditioning",
                "C": "Convincing governmental officials to support his project",
                "D": "Creating a structure that could survive in a harsh environment"}, "B"),
            ("What does the speaker imply about vents in the termite mounds?", {
                "A": "They are located primarily below ground level.",
                "B": "They help to protect the termites from predators.",
                "C": "They are much larger than termites' bodies.",
                "D": "Termites use them to actively control the airflow in the mounds."}, "D"),
        ]),
        (2, "Documentary and Ethnographic Films", "L13_Documentary_and_Ethnographic_Films.mp3", "listening_13_documentary_films.mp3", [
            ("What is the main purpose of the talk?", {
                "A": "To introduce a new style of documentary",
                "B": "To outline the process of making a film",
                "C": "To compare two significant documentaries",
                "D": "To contrast two kinds of nonfiction films"}, "D"),
            ("What attitude does the speaker express when she discusses documentaries?", {
                "A": "She is pleased that documentaries inspire viewers to travel to unfamiliar places.",
                "B": "She is disappointed that documentaries are becoming less popular.",
                "C": "She is concerned that viewers are too trusting of documentaries.",
                "D": "She is frustrated that many documentaries try to tell complicated and confusing stories."}, "C"),
            ("Why does the speaker mention Forest of Bliss?", {
                "A": "To give an example of a film with elaborate production",
                "B": "To give an example of an ethnographic film",
                "C": "To illustrate the popularity of films about nature",
                "D": "To illustrate the importance of directors in filmmaking"}, "B"),
            ("According to the speaker, how might researchers prepare to make ethnographic films?", {
                "A": "By coming up with a dramatic story they want to tell",
                "B": "By learning the filming techniques of the culture they are studying",
                "C": "By spending a long time living within a particular culture",
                "D": "By analyzing news footage about a particular culture"}, "C"),
        ]),
        (2, "Keystone Species and Ecosystem Recovery", "L14_Keystone_Species_and_Ecosystem_Recovery.mp3", "listening_14_keystone_species.mp3", [
            ("What was the cause for the near disappearance of sea otters from waters along the United States Pacific coast?", {
                "A": "Disease",
                "B": "Overhunting by humans",
                "C": "Competition from other species",
                "D": "Habitat destruction"}, "B"),
            ("According to the speaker, what happened to kelp forests when sea otters almost disappeared?", {
                "A": "They became overgrown and crowded out other marine life.",
                "B": "They returned to their original size.",
                "C": "They were destroyed by expanding populations of sea urchins.",
                "D": "They began to attract species that the otters had previously preyed on."}, "C"),
            ("How did elk behavior change after wolves were reintroduced to Yellowstone National Park?", {
                "A": "Elk began to be more active at night.",
                "B": "Elk began to form larger groups.",
                "C": "Elk began to feed less near streams.",
                "D": "Elk began to hide among willow and aspen trees."}, "C"),
            ("What does the speaker emphasize about beavers in Yellowstone?", {
                "A": "Their presence benefits many other animal species.",
                "B": "They are often preyed on by wolves.",
                "C": "They often damage vegetation.",
                "D": "They compete with elk for food."}, "A"),
        ]),
        (2, "The Prepared Piano", "L15_The_Prepared_Piano.mp3", "listening_15_prepared_piano.mp3", [
            ("What does the speaker mainly discuss?", {
                "A": "Some imaginative composers of the 1940s",
                "B": "John Cage's innovations involving the prepared piano",
                "C": "Musical traditions that influenced John Cage's piano work",
                "D": "How international music theories influence composers' work"}, "B"),
            ("According to the speaker, how did John Cage change a piano's sound?", {
                "A": "By changing the piano's tuning",
                "B": "By replacing the piano strings",
                "C": "By inserting objects between the piano strings",
                "D": "By adjusting the piano pedals"}, "C"),
            ("Why does the speaker mention seashells on a beach?", {
                "A": "To give an example of items that Cage used",
                "B": "To explain how Cage arranged his instruments on stage",
                "C": "To suggest a sound that Cage tried to create with the piano",
                "D": "To illustrate Cage's approach to finding materials"}, "D"),
            ("What does the speaker imply about Indonesian gamelan music?", {
                "A": "Its sound resembles some of the sounds in Cage's compositions.",
                "B": "Its development was influenced by Hindu theory about essential emotions.",
                "C": "Its techniques are similar to those that Cage used on pianos.",
                "D": "Its sound can be heard in a lot of Western classical music."}, "A"),
        ]),
        (2, "Behavioral Economics and Cognitive Biases", "L16_Behavioral_Economics_and_Cognitive_Biases.mp3", "listening_16_behavioral_economics.mp3", [
            ("What is the main topic of the talk?", {
                "A": "Traditional economic theories",
                "B": "Ways to avoid financial loss",
                "C": "Key concepts in behavioral economics",
                "D": "The impact of cognitive biases on policymaking"}, "C"),
            ("According to the talk, what does loss aversion lead to?", {
                "A": "A preference for acquiring gains",
                "B": "A tendency to avoid risks",
                "C": "Rational decision-making",
                "D": "Increased utility maximization"}, "B"),
            ("Why does the speaker mention saving for retirement?", {
                "A": "To illustrate the concept of loss aversion",
                "B": "To explain confirmation bias",
                "C": "To demonstrate the effect of present bias",
                "D": "To provide an example of rational behavior"}, "C"),
            ("Which behavior best describes someone experiencing confirmation bias?", {
                "A": "Buying a product at a recently reduced price",
                "B": "Seeking objective comparisons of products",
                "C": "Looking for positive reviews of a favored brand",
                "D": "Choosing low cost over reliability in certain products"}, "C"),
        ]),
        (2, "Industrial Revolution and European Cities", "L17_Industrial_Revolution_and_European_Cities.mp3", "listening_17_industrial_cities.mp3", [
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
    ]
    tasks, n = [], 1
    for module, title, src_name, fname, qs in talks:
        items = []
        for stem, options, answer in qs:
            items.append(q(n, stem, options, answer))
            n += 1
        tasks.append(lecture(title, module, fname, src_name, items))
    return paper(ID, "listening", "听力", [
        {"n": 1, "timeSec": 1920, "from": 1, "to": 36},
        {"n": 2, "timeSec": 1680, "from": 37, "to": 68},
    ], tasks)


def build_writing():
    return paper(ID, "writing", "写作", [
        {"n": 1, "timeSec": 1260, "from": 1, "to": 3, "label": "Email"},
        {"n": 2, "timeSec": 3000, "from": 4, "to": 8, "label": "Academic Discussion"},
    ], [
        email(1,
              "You recently visited Mountain View Park. You enjoyed the scenery, the well-maintained walking paths, and the peaceful atmosphere. However, you noticed litter along the paths and found that the park did not have a public drinking-water facility, so visitors had to bring a large amount of water.",
              ["Describe what you liked about the park.",
               "Explain the problems you noticed and how they affected visitors.",
               "Suggest practical improvements, including more trash bins, regular cleanup patrols, and public drinking-water stations."],
              "Ms. Harris", "Park Improvement Suggestions",
              "Dear Ms. Harris,\n\nI recently visited Mountain View Park and especially enjoyed the mountain scenery, the well-maintained walking paths, and the peaceful atmosphere. The park is a pleasant place for residents to walk and relax.\n\nI did notice two problems that made the visit less comfortable. There was litter along several parts of the path, and I could not find a public drinking-water station. As a result, visitors had to carry a large amount of water, while the trash made some otherwise attractive areas look neglected.\n\nCould the park install more trash bins near busy sections and arrange regular cleanup patrols? Adding a few clearly marked drinking-water stations would also help visitors stay hydrated. These changes would make the park cleaner and more convenient.\n\nKind regards,\n[Your Name]"),
        email(2,
              "You are a university student who has recently moved into a new apartment. You have noticed some issues with the apartment. You want to inform your landlord, Mr. Thompson, about these problems.",
              ["Describe the issues you have encountered in the apartment.",
               "Explain how conditions negatively affect your studies.",
               "Request that he make arrangements to address these issues soon."],
              "Mr. Thompson", "Request for apartment repairs",
              "Dear Mr. Thompson,\n\nI am writing to report several problems in my new apartment. The window beside the desk does not close completely, the kitchen faucet leaks continuously, and the ceiling light in the bedroom flickers and sometimes turns off without warning.\n\nThese conditions are beginning to affect my studies. Noise and cold air enter through the window, so it is difficult to concentrate at the desk, especially in the evening. The flickering light makes reading uncomfortable, and I have had to move my books between rooms. The leaking faucet also creates a constant sound at night and has made the cabinet below it damp.\n\nCould you please arrange for the window, faucet, and light to be inspected as soon as possible? I am available after 3:00 p.m. on weekdays. Please let me know the proposed visit time and whether I should take any temporary safety steps before the repairs are completed.\n\nKind regards,\n[Your Name]"),
        email(3,
              "You recently visited a new café that opened near your campus called Sunny Café. Although you generally enjoyed the café, you were disappointed with some issues.",
              ["Describe what you liked about your visit to the café.",
               "Explain why you were disappointed with the limited selection of pastries.",
               "Suggest a few types of pastries that could be added to the menu to improve the selection."],
              "Ms. Garcia", "Suggestions for expanding pastry selection",
              "Dear Ms. Garcia,\n\nI recently visited Sunny Café and enjoyed several parts of the experience. The staff greeted me warmly, my coffee was prepared carefully, and the seating area was bright and comfortable enough for a short study session. I also liked that the menu clearly described the different coffee options.\n\nHowever, I was disappointed by the limited pastry selection. Only two sweet items were available, and both contained dairy, so customers with different tastes or dietary needs had almost no choice. Since many students stop for breakfast or an afternoon snack, a broader selection could make the café more useful throughout the day.\n\nYou might consider adding plain and chocolate croissants, fruit tarts, and a vegan muffin. A savory option, such as a spinach pastry, would also balance the menu. Rotating one seasonal item could keep the display interesting without creating too much waste.\n\nKind regards,\n[Your Name]"),
        disc(4, "The Arts", "Dr. Gupta", "diaz.png",
             "The arts include a variety of fields: literature, painting, and dance, just to name a few. Some people believe the arts play a vital role in human communication and growth, reflecting cultural values and commenting on societal issues. On the other hand, some people believe that the arts are mainly valuable as a source of entertainment and personal enjoyment, with little or no wider significance. Which view on the arts' role in society do you hold? Why?",
             [post("Claire", "kelly.png", "I think the role that the arts play in society is highly significant. Art can convey powerful messages and provoke thought and discussion about important social and cultural issues. It can also preserve history and traditions, allowing future generations to understand and appreciate their heritage."),
              post("Paul", "andrew.png", "I think people like Claire overestimate the impact that the arts have on society. Obviously, the arts can provide a sense of joy and relaxation, offering an escape from the stresses of everyday life. But there are many disciplines and fields that play a much more vital role in promoting communication and growth, such as journalism and psychology.")],
             [{"title": "Arts Shape Understanding",
               "text": "The arts have broad social significance because they allow people to examine experiences that ordinary discussion may simplify or avoid. A novel can place readers inside the choices of someone from another generation, while a play can present conflicting views without reducing the issue to a slogan. This imaginative distance often makes difficult subjects easier to approach. Art also preserves more than facts. A painting, song, or story can carry the emotions, symbols, and everyday details through which a community understands its past. Later audiences are therefore able not only to learn what happened but also to consider how it may have felt. The social value of art does not require every work to deliver a political message. Even a personal story can widen empathy when it reveals an unfamiliar life with precision. Entertainment may attract the audience initially, but reflection can continue after the performance ends. By combining emotional engagement with interpretation, the arts deepen communication and keep cultural questions open for renewed discussion."},
              {"title": "Personal Enjoyment First",
               "text": "The primary value of the arts is personal enjoyment, and that role should not be treated as minor. People often read, dance, or listen to music because these activities offer pleasure, rest, and a temporary change of attention. Those benefits are meaningful even when no social debate follows. In fact, demanding that art always educate the public can narrow creativity. Artists may feel pressure to make an approved statement, while audiences may overlook humor, beauty, technique, or private emotion that does not fit a public cause. Other fields are also better equipped for some social tasks. Journalism can investigate current events directly, and psychology can study behavior through systematic methods; a work of art is open to interpretation and cannot replace either function. Art may occasionally influence public conversations, but such influence is unpredictable. Its most consistent contribution is giving individuals space to imagine, relax, and experience emotion. Protecting that personal freedom allows the arts to remain diverse rather than turning every creation into a lesson."}]),
        disc(5, "Education", "Dr. Gupta", "diaz.png",
             "Over the next few weeks, we are going to discuss recent trends in education. Many universities now let students take classes from home instead of attending in person on campus. What do you think is the most significant impact of online classes? Why does this impact matter?",
             [post("Kelly", "kelly.png", "Online classes make education more accessible. They reduce commuting time and costs, provide flexible schedules, and can help students with disabilities or those who live far from campus."),
              post("Andrew", "andrew.png", "Online classes may reduce learning because students lose the energy and engagement of sharing a physical classroom. In-person courses can make collaboration and relationships easier.")],
             [{"title": "Access Comes First",
               "text": "The most significant impact of online learning is that it changes who can participate consistently. Flexibility is not merely convenient; it can prevent a scheduling or transportation problem from becoming an academic barrier. For example, a student with a part-time job may watch a recorded explanation after work and join a scheduled online discussion on another day. That student still needs deadlines and active participation, but the course no longer depends on being in one place at a fixed hour. Andrew is right that spontaneous classroom interaction can be harder to reproduce online. However, instructors can reduce that weakness through small live discussion groups and prompt feedback. Overall, wider and more reliable access is the greater effect because it allows capable students to continue learning when distance, work, or mobility would otherwise interrupt them."},
              {"title": "Weaker Immediate Feedback",
               "text": "I believe the largest impact of online classes is the loss of immediate social feedback. In a physical classroom, an instructor can notice confusion from students' expressions, pause, and explain a concept differently. Classmates also exchange quick questions before or after class, and those short conversations often prevent small misunderstandings from growing. An online course can offer message boards and video meetings, but students may wait longer for help or remain silent when participation feels optional. Kelly's point about access is important, so universities should keep remote options for students who need them. Still, when a course depends on debate, laboratory teamwork, or rapid coaching, weaker interaction can directly reduce learning quality. Therefore, the main impact is not simply location; it is the change in how quickly students and teachers respond to one another."}]),
        disc(6, "Public Art", "Dr. Gupta", "diaz.png",
             "Public art has been used to respond to social issues throughout history. Cities sometimes commission murals, sculptures, or temporary installations about inequality, migration, or environmental damage. Supporters say such work encourages discussion and community action, while critics argue that publicly funded art should not promote a particular political or social message. Should cities use public art to address social issues? Why or why not?",
             [post("Kelly", "kelly.png", "Cities should use public art to address social issues. A mural or installation in a busy area can reach people who may never visit a museum or attend a public meeting, starting conversations and encouraging involvement."),
              post("Andrew", "andrew.png", "City-sponsored art should not advocate one position on a controversial issue. Public projects are funded by residents with different beliefs, so cities should support art that represents diverse perspectives.")],
             [{"title": "Invite Multiple Voices",
               "text": "Cities can use public art to address social issues, but the process should invite more than one community voice. The strongest public projects do not order residents to accept a conclusion; they make a neglected experience visible and create a place for discussion. For instance, a temporary installation about water waste could include stories from households, local businesses, and maintenance workers, followed by a public forum nearby. This design gives residents concrete information without pretending that one artist speaks for everyone. Andrew's concern about public funding is valid, so the selection process should publish its criteria and include residents with different views. With those safeguards, public art can reach people outside formal meetings and turn an abstract problem into a shared, understandable experience. That educational and conversational role justifies city support."},
              {"title": "Fund a Platform, Not a Message",
               "text": "I would limit city-funded public art on controversial social issues because the government controls both the budget and the location. Even a thoughtful mural can appear to give official approval to one interpretation, while residents who disagree still pay for it. A better approach is for cities to provide neutral exhibition spaces and transparent small grants, then allow independent community groups to propose temporary works. Different groups could present competing perspectives over time, and the city would support access rather than a message. Kelly is right that art reaches people who do not attend meetings, but that visibility also increases the risk of exclusion. By funding an open platform instead of a single position, a city can encourage discussion while respecting the diversity of the public it serves."}]),
        disc(7, "Community Culture", "Professor Diaz", "diaz.png",
             "We've been discussing the role of public art like painted murals on building walls, statues in parks, and sculptures in city squares. Some people believe that these permanent artistic installations enhance neighborhoods and provide spaces for local artists to showcase their talents. Others argue that communities benefit more from funding temporary art events like outdoor concerts, theater performances, and art festivals that gather people together. What is your view? Should communities prioritize permanent public art or temporary cultural events?",
             [post("Andrew", "andrew.png", "Permanent public art installations are more valuable for creating lasting community identity and pride. Colorful murals and interesting sculptures transform boring public spaces into inspiring environments where people enjoy spending time daily, which supports local businesses."),
              post("Kelly", "kelly.png", "I think communities benefit more from funding temporary cultural events like outdoor concerts, theater performances, and art festivals. These events bring people together for shared experiences, support local artists through paid performances, and attract visitors who spend money at nearby businesses.")],
             [{"title": "Keep Art in Daily Life",
               "text": "I agree with Andrew that communities should prioritize permanent public art because it improves the shared environment every day, not only when an event is scheduled. A well-designed mural or sculpture can turn an ignored corner into a recognizable meeting place and help residents describe what is distinctive about their neighborhood. Permanent work also reaches people who cannot afford tickets or attend events at a particular time. Children walking to school, older residents, workers, and visitors all encounter it naturally. The selection process can still create participation if local artists and residents discuss the location, theme, and maintenance plan together. Temporary programs should continue, but their effect often disappears when the stage is removed and the audience goes home. A durable installation keeps generating conversation, photographs, and foot traffic over many years. With careful upkeep and periodic additions, public art becomes a visible record of community creativity and a dependable part of daily public life."},
              {"title": "Events Create Interaction",
               "text": "Kelly's approach provides greater community value because temporary events create interaction rather than only placing an object in a space. At a concert, performance, or festival, residents do something together and can talk directly with artists and one another. Events can also rotate among neighborhoods, themes, and artistic forms, so funding reaches more creators and responds to changing interests. If one program is unsuccessful, organizers can learn from it and redesign the next event without leaving an unpopular structure in place for decades. Accessibility can be protected by making outdoor programs free and scheduling activities at different times. Local businesses benefit from concentrated visits, while artists receive paid opportunities instead of only exposure. Permanent art can become familiar enough that people stop noticing it, and maintenance may consume funds long after the original decision. A varied calendar of temporary events therefore keeps cultural participation active, flexible, and open to new voices throughout the community."}]),
        disc(8, "Community Identity", "Dr. Gupta", "diaz.png",
             "Next week, we will discuss the influence of public art on community identity. Public art, such as murals and sculptures, can enrich a community's cultural landscape and contribute to a sense of shared identity. Do you think public art plays a significant role in shaping community identity? Why or why not?",
             [post("Claire", "kelly.png", "Public art plays a significant role in shaping community identity. It reflects the values and culture of the community, promotes local artists, and provides a sense of pride and unity among residents."),
              post("Paul", "andrew.png", "While public art can enhance a community's aesthetic appeal, its role in shaping community identity may be limited. Other factors, such as social programs and community events, have a more substantial impact on fostering a shared identity.")],
             [{"title": "Visible Shared Memory",
               "text": "Public art can shape community identity because it gives shared memories and values a visible place in everyday life. A mural about a neighborhood's migration history, for example, allows residents to encounter that story while walking to school or work rather than only inside a museum. Its influence becomes stronger when local people help choose the subject and contribute ideas to the design. That process requires them to discuss which experiences represent the community and which voices have been overlooked. The finished work then carries meaning created by residents themselves, not merely decoration selected by an outside sponsor. Public art can also become a meeting point for tours, celebrations, and conversations across generations. Of course, one sculpture cannot solve social divisions. Nevertheless, repeated encounters with an image that residents recognize as their own can strengthen attachment to a place. When creation is participatory and the work reflects local experience, public art turns identity into something people can see, debate, and share."},
              {"title": "Participation Builds Identity",
               "text": "Public art may enrich a neighborhood, but lasting community identity is shaped more by repeated social participation. Residents develop a sense of belonging when they rely on one another, solve practical problems, and build routines together. Imagine an attractive sculpture placed in a square where few local activities occur. People may admire it briefly without forming any new relationship. By contrast, a weekly market, youth sports program, or neighborhood emergency team creates regular contact among people who might otherwise remain strangers. Through cooperation, they learn who contributes, which traditions matter, and how disagreements can be managed. Those experiences produce trust and shared expectations, which are central parts of collective identity. Funding also matters: an expensive installation can create resentment if residents would rather improve a library or community center. Art works best as a record or celebration of relationships that already exist. Therefore, communities should first invest in inclusive programs and events; public art can then express the identity those continuing interactions have actually built."}]),
    ])


REPEATS = [
    ("campus_coffee_shop", "You are being trained to assist in a campus coffee shop. Your supervisor will teach you how to explain key features of the coffee shop to customers. Listen to your supervisor and repeat what the supervisor says. Repeat only once.", [
        "We serve coffee and tea at the main counter.",
        "Our pastries are all made fresh daily.",
        "The menu board lists drinks that include a range of herbal teas.",
        "Milk, cream and sugar are available at this station.",
        "Dispose of trash and recyclables in the bins near the door.",
        "Some tables in the seating area offer excellent views of campus.",
        "Free Wi-Fi is available for campus visitors as well as students.",
    ]),
    ("library_facilities", "You are working a part-time job at the university library. Your manager is training you to help visitors use the library's resources. Listen to the manager and repeat what the manager says. Repeat only once.", [
        "The computer lab has free Wi-Fi access.",
        "The reading room is a quiet space for patrons.",
        "The Children's Section has books and activities for kids.",
        "The reference desk can provide assistance for research projects.",
        "Study rooms can be reserved for group work and other meetings.",
        "Library staff are available for help finding resources here or at other locations.",
        "If you are looking for other specific locations and services, please use our guide.",
    ]),
    ("science_project", "You are working at a school as part of an internship. Your supervisor is training you to help students prepare for their science project presentations. Listen to the supervisor and repeat what the supervisor says. Repeat only once.", [
        "Start by setting up the projector screen.",
        "Use the white board to highlight key points.",
        "Arrange your project materials neatly on the tables.",
        "Check all the equipment to ensure it works properly.",
        "Make sure your computer is set up with your presentation.",
        "It's a good idea to practice delivering your speech in front of some friends.",
        "Take time to review your notes thoroughly so you'll feel confident and prepared.",
    ]),
    ("bicycle_repair", "You have a part-time job working at a bicycle repair workshop near campus. The technician is showing you how to train people to fix a flat tire. Listen to the technician and repeat what the technician says. Repeat only once.", [
        "First, select the right tool to remove the wheel.",
        "Next, deflate the tire completely.",
        "Carefully locate the puncture hole and mark it with a pen.",
        "Select a patch from the repair kit and apply it firmly.",
        "Use the pump to inflate the tire to the correct pressure.",
        "Check for additional leaks by submerging the tube in a bucket of water.",
        "If there are no new problems, reattach the wheel tightly back on the bicycle.",
    ]),
]

INTERVIEWS = [
    ("art_music", "A researcher is studying people's views on art and self-expression. The researcher will ask you some questions about artistic activities.", [
        ("Thanks for speaking with me. I'd like to talk with you about art and music. Do you engage in any artistic activities such as painting or playing music regularly? If so, what do you do? If not, which artistic activity would you like to try if you had the chance?",
         "I regularly do digital drawing. I began by sketching simple objects on a tablet, but now I often create small illustrations of places I visit. The activity is relaxing because it makes me slow down and notice details such as light, color, and proportion. I usually draw for thirty minutes on weekends, so it fits my schedule without becoming another obligation. I am not a professional artist, but seeing gradual improvement keeps me motivated and gives me a personal record of experiences that photographs do not capture in the same way."),
        ("What kind of art or music do you enjoy the most, and how do you typically experience it through creation or appreciation?",
         "I enjoy photography most, mainly through appreciation but sometimes through creation. I like photographs that document ordinary city life because they can reveal emotion in a scene people usually ignore. I follow several photographers online and visit small exhibitions when I can. I also use my phone to photograph markets, streets, and public transportation. Comparing my pictures with professional work teaches me how framing and timing shape a story. Photography is appealing because it is accessible, yet producing a truly thoughtful image still requires patience and judgment."),
        ("If you were creating art or music, would you prefer sharing your work publicly or keeping it private? What influences your decision?",
         "I would share selected work publicly but keep early experiments private. Thoughtful feedback can help me notice weaknesses that I cannot see on my own, and sharing a finished piece may also connect me with people who have similar interests. However, not every sketch or recording represents an idea I am ready to explain. I would first show new work to a few trusted friends, revise it, and then decide whether a wider audience would benefit from seeing it. The main factors are quality, privacy, and the purpose of the work."),
        ("Some people think art and music can be powerful ways to communicate emotions and ideas that are difficult to express with words. Do you agree or disagree? Why?",
         "I agree because art can communicate through mood, image, and rhythm before an audience has to define the feeling in words. For example, a quiet melody may suggest loneliness and hope at the same time, while a photograph can show tension between two people without explaining their history. Different viewers may interpret the work differently, but that ambiguity is often useful rather than confusing. It invites people to reflect on their own experiences. Words remain important, yet art can start an emotional conversation when direct language feels too limited or uncomfortable."),
    ]),
    ("books_reading", "You have signed up for a study run by a university research group that is investigating people's experiences with books and reading. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for your participation. I'd like to learn about your experiences with books and reading. Was there a time in your life when you read more or less than you do now? What changed?",
         "During my college years, I read significantly more than I do now. Back then, I was immersed in academic texts and novels for literature courses, often reading several books a week. After graduation, my reading habits changed because of a busier work schedule and the rise of digital media. I now read less frequently, mostly opting for shorter articles or audiobooks during commutes. What changed was the shift from structured academic demands to a more fast-paced lifestyle, where finding time for deep reading became a challenge. Despite this, I still cherish the occasional novel on weekends to unwind and stay connected to the joy of reading."),
        ("Great. In your opinion, is reading for pleasure a popular way people spend their free time where you live. Why do you think that is?",
         "In my community, reading for pleasure is a fairly popular leisure activity, especially among young adults and professionals. This is primarily due to digital reading platforms, such as e-books and audiobooks, which make it convenient to access a vast range of materials anytime. Additionally, with increasing awareness of mental well-being, many people turn to reading as a way to relax and escape daily stress. Local libraries and book clubs also foster a culture of reading by organizing events and discussions, encouraging social interaction around books. Overall, these factors contribute to making reading a common and enjoyable pastime here."),
        ("Interesting. Do you think reading different types of books helps people understand each other and get along better? Why or why not?",
         "I believe reading diverse books significantly enhances mutual understanding and social harmony. When we immerse ourselves in narratives from various cultures, perspectives, or genres, we gain insights into others' lives, emotions, and challenges. Fiction can foster empathy by allowing readers to step into characters' shoes, while non-fiction provides factual knowledge about different societies. This broadened awareness helps reduce prejudices and encourages more compassionate interactions in daily life. Shared reading experiences can also spark meaningful conversations, bridging gaps between individuals. By exposing ourselves to a wide range of books, we cultivate a deeper appreciation for diversity, which is essential for building stronger communities."),
        ("Good points. I just have one more question. Looking ahead, some people believe that future generations will read less than today's generation. Do you agree or disagree? Why?",
         "I disagree with the idea that future generations will read less. While digital distractions are prevalent, technology also offers new ways to engage with reading, such as e-books and audiobooks, which can make literature more accessible. Educational systems still emphasize literacy skills, and many young people use online platforms to discuss books, fostering a culture of reading. Therefore, I think reading will evolve rather than decline, adapting to modern lifestyles while maintaining its importance for knowledge and entertainment. This view is realistic because reading can still fit into a normal schedule without creating too much pressure."),
    ]),
    ("cultural_festivals", "You have volunteered for a research study at your university about cultural festivals. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about cultural festivals. First, cultural festivals are events that celebrate traditions like food, music, art, or clothing from a certain culture. Have you ever been to one? Or would you like to go to one? Why?",
         "I attended a local Chinese New Year festival last year, and it was an enriching experience. The vibrant dragon dances and traditional music performances captivated me, while the variety of authentic Chinese cuisine offered a delightful taste of the culture. I particularly enjoyed making dumplings with a volunteer and learning why families associate them with good fortune. Such festivals provide a valuable opportunity to immerse oneself in different traditions, fostering cross-cultural understanding and appreciation. Active participation makes the tradition easier to remember than watching from a distance."),
        ("Thank you. If you were to go to a cultural festival, what would you like to see or do there?",
         "If I were to attend a cultural festival, I would focus on exploring traditional crafts and culinary experiences. I would visit artisan booths to observe skilled craftspeople demonstrating techniques like pottery or weaving, because these hands-on activities offer deep insights into a culture's heritage. Engaging in interactive workshops, such as learning a folk dance or trying a craft myself, would make the experience more immersive. This approach allows me to appreciate the festival not just as a spectator but as an active participant, gaining a richer understanding of the culture through its tangible and sensory elements."),
        ("Interesting, if you were to participate in a cultural festival for your own culture, what would you want to share with other people and why?",
         "If I were to participate in a cultural festival representing my own culture, I would focus on sharing traditional tea ceremonies. This practice embodies core values of harmony, respect, and mindfulness that are central to our cultural identity. By demonstrating the precise steps of preparing and serving tea, I could illustrate how everyday rituals foster connection and tranquility. I would also explain the historical significance of tea in our society, highlighting its role in social gatherings and philosophical discussions. Sharing this would allow others to experience a tangible aspect of our heritage while promoting cross-cultural appreciation through a simple, yet profound, activity."),
        ("Great! Some people think cultural festivals are mainly just for fun, while others think they serve an important purpose, like helping to keep traditions alive. What do you think?",
         "Cultural festivals are far more than just entertainment: they play a crucial role in preserving traditions and fostering community identity. While they offer fun and enjoyment, their deeper purpose lies in passing down customs, language, and values to younger generations. Festivals like Diwali or Thanksgiving involve rituals and stories that connect people to their heritage, reinforcing a sense of belonging. These events also promote cultural exchange and understanding among diverse groups, which is vital in a globalized world. Thus, I view cultural festivals as essential for maintaining cultural continuity and social cohesion, making them both enjoyable and meaningful."),
    ]),
    ("learning_hobbies", "You have agreed to participate in a research study about people's experiences with learning new hobbies. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for being involved in this research. I'd like to ask you some questions about hobbies. What hobbies do your friends or family have? Why do you think they enjoy doing them?",
         "My mother enjoys gardening, while one of my closest friends spends weekends cycling. They like these hobbies for different reasons. Gardening gives my mother a quiet routine and the satisfaction of watching something grow over time. Cycling, by contrast, helps my friend stay active and explore places outside the city. Both activities also provide a break from screens and work-related pressure. I think that balance is what makes a hobby sustainable: it should feel personally rewarding while offering a clear change from a person's normal responsibilities."),
        ("Thanks for that. Now, if your school or workplace were to organize after-work hobby clubs, which club do you think would interest the most people?",
         "I think a casual photography club would interest the most people because almost everyone already has a phone camera, so joining would require little money or previous training. The club could organize short walks around campus, teach simple techniques, and let members discuss a few pictures afterward. That format would suit both beginners and experienced photographers. It would also be social without demanding constant conversation, which can make new members more comfortable. Low costs, flexible attendance, and visible results would attract a broad group and keep people involved."),
        ("Great, that's helpful. Next, do you think hobbies should mostly be relaxing, or is it better if they're challenging? Why?",
         "I think a good hobby should be enjoyable first but include a manageable challenge. If it is completely effortless, people may become bored and stop improving. On the other hand, if every session feels like a test, the hobby simply creates more stress. When I learned basic cooking, familiar recipes helped me relax, while trying one new technique each week kept the activity interesting. That balance gave me progress without pressure. In my view, the best challenge is optional and gradual, so people remain curious instead of feeling judged by the result."),
        ("Got it. Now, last question. How important do you think it is for people to keep exploring new hobbies as they grow older? Why?",
         "It is quite important because new hobbies prevent adult life from becoming limited to work and routine. Learning something unfamiliar exercises patience and reminds people that they can still improve. It can also create new social connections, especially after someone moves, retires, or changes jobs. For instance, a community language class could introduce an older adult to both a useful skill and a new group of friends. People do not need to collect hobbies constantly, but remaining open to one new activity can support confidence, curiosity, and emotional well-being."),
    ]),
    ("hobbies", "You have volunteered for a research study at your university about hobbies. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about hobbies. To begin, do you have a hobby or interest that you regularly spend time doing?",
         "My hobby is landscape photography, which I engage in every weekend. I find it rewarding to explore parks and nature reserves, capturing the changing seasons and lighting conditions. This activity not only allows me to connect with the outdoors but also helps me develop technical skills in using my camera and editing software. Over time, I have built a small portfolio of images that I share with friends and family, and it serves as a creative outlet that balances my academic studies. The process of planning shoots and reviewing photos has become a relaxing routine that I look forward to regularly."),
        ("Thank you. If you were to select a new hobby, what would you choose and why?",
         "If I were to pick up a new hobby, I would choose urban sketching. The main reason is that it combines creativity with exploration. I enjoy discovering new places in my city, and sketching would allow me to capture those moments in a personal, artistic way. It is also a relaxing activity that doesn't require expensive equipment—just a sketchbook and pen. Plus, it encourages me to slow down and observe details I might otherwise miss in my daily routine. This hobby would help me unwind while fostering a deeper connection to my surroundings."),
        ("Interesting. Now tell me what might prevent you from starting this new pastime.",
         "There are a few key factors that could hinder me from beginning this new hobby. First, time constraints are a major barrier; as a university student, my schedule is packed with classes, assignments, and part-time work, leaving little room for additional activities. Second, financial considerations might pose a challenge, especially if the hobby requires expensive equipment or materials, which could strain my budget. Lastly, a lack of initial motivation or support from peers could make it difficult to stay committed, as starting something new often feels daunting without encouragement."),
        ("Great. Some people believe it is better to have one interest outside of work or school that you dedicate yourself to rather than multiple smaller ones. Do you agree or disagree? Why?",
         "I believe dedicating oneself to a single primary interest outside of work or school is more beneficial than spreading efforts across multiple smaller ones. Focusing deeply on one hobby allows for mastery and meaningful progress, which can be more satisfying. For example, if someone commits to learning a musical instrument, they can develop advanced skills over time, leading to a sense of accomplishment and stress relief. In contrast, juggling many interests might result in superficial engagement without real depth. This concentrated approach also helps build discipline and can enhance personal growth, making it a more rewarding choice overall."),
    ]),
    ("renewable_energy", "You are participating in a study at your university about renewable energy sources. The researcher will ask you some questions concerning your opinions on renewable energy and its implementation.", [
        ("Thanks for your participation. I'd like to discuss your views on renewable energy. To start, how important is the issue of renewable energy, such as wind and solar power, to you personally? Why would you say you feel that way?",
         "Renewable energy is very important to me because energy choices affect both the climate and everyday living costs. I don't expect one technology to replace every other source immediately, but wind and solar power can reduce pollution without consuming fuel each time electricity is produced. This matters personally because my city often has poor air quality in winter. I also like that homes and schools can generate some of their own power. The transition requires investment and better storage, but I believe developing cleaner sources now will create healthier and more stable communities in the future."),
        ("Now, describe a time when you or someone you know tried to reduce energy use. What actions were taken, and what made it easy or difficult?",
         "Last winter, my family tried to reduce electricity use after our monthly bill increased. We replaced several old light bulbs with LEDs, unplugged chargers when they were not needed, and used the washing machine only with full loads. The easiest change was turning off lights because everyone could see the result immediately. The hardest part was reducing heating, since the weather was unusually cold. We solved that by sealing gaps around one window and wearing warmer clothes indoors. Our next bill was lower, and the experience showed us that several small habits can make a noticeable difference."),
        ("In your daily life, have you noticed any renewable energy initiatives in your community? If yes, what have you seen, and how do they impact your area? If not, what's an initiative that might be beneficial for your community?",
         "I have noticed solar panels on several newer apartment buildings and on the roof of a local school. The school uses a display near the entrance to show how much electricity the panels produce, which makes the project educational as well as practical. These installations probably don't supply all the buildings' energy, but they reduce demand from the regular grid during sunny hours. They also make renewable energy feel visible and realistic to residents. I think the next useful step would be adding panels to public parking areas, where they could produce electricity while providing shade for cars."),
        ("Many believe transitioning to renewable energy is crucial for environmental sustainability, while others worry about the costs involved. Do you think the benefits of renewable energy outweigh the drawbacks? Why or why not?",
         "Yes, I think the long-term benefits of renewable energy outweigh the drawbacks. Building solar farms, wind turbines, and improved power grids can be expensive at first, and some projects require careful planning to protect wildlife and local communities. However, fossil-fuel pollution also creates enormous health and environmental costs that continue every year. Renewable systems use resources that don't run out and usually become cheaper after the initial investment. Governments should support workers and regions affected by the transition, but delaying change would be more costly. With responsible planning, cleaner air and a more stable energy supply justify the short-term difficulties."),
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
    dump("2025-08-19-reading.json", build_reading())
    dump("2025-08-19-listening.json", build_listening())
    dump("2025-08-19-writing.json", build_writing())
    dump("2025-08-19-speaking.json", build_speaking(
        ID, TITLE + " · 口语 Form 1", 1, 1))
    dump("2025-08-19-speaking-f2.json", build_speaking(
        ID + "-s2", TITLE + " · 口语 Form 2", 2, 2))
    dump("2025-08-19-speaking-f3.json", build_speaking(
        ID + "-s3", TITLE + " · 口语 Form 3", 3, 3))
    dump("2025-08-19-speaking-f4.json", build_speaking(
        ID + "-s4", TITLE + " · 口语 Form 4", 4, 4))
    dump("2025-08-19-speaking-f5.json", build_speaking(
        ID + "-s5", TITLE + " · 口语 Form 5", None, 5))
    dump("2025-08-19-speaking-f6.json", build_speaking(
        ID + "-s6", TITLE + " · 口语 Form 6", None, 6))
    copy_audio()
