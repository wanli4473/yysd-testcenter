#!/usr/bin/env python3
"""Build 7.25 China offline TOEFL. Run: python3 scripts/build_toefl_725cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月/7.25国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-07-25/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-07-25"
SET = "7.25"
TITLE = "新托福 7.25 国内线下"
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


def sent(sid, module, context, lead, bank, answer, tail="."):
    parts = [{"t": lead}] if lead else []
    parts += [{"slot": True} for _ in answer]
    if tail:
        parts.append({"t": tail})
    return {
        "type": "sentence", "module": module, "id": sid,
        "context": context, "parts": parts, "bank": bank, "answer": answer,
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
        "type": "email", "module": 2, "id": eid,
        "instruction": "Write an email. In your email, do the following:",
        "prompt": prompt, "bullets": bullets,
        "to": to, "subject": subject, "sampleSubject": subject, "sample": sample,
    }


def disc(did, klass, prof_name, prof_photo, prof_text, posts, samples):
    return {
        "type": "discussion", "module": 3, "id": did,
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
    t, n = cw("Geological Formations", 1, n, [
        "The study of geological formations provides insights into Earth's dynamic processes. Metamorphic rocks are rocks that have been transformed by heat and pressure. Sedimentary rocks ",
        ("fo", "form"),
        " as ",
        ("lay", "layers"),
        " of ",
        ("mate", "material"),
        " build ",
        ("u", "up"),
        " over ",
        ("ti", "time"),
        " and ",
        ("a", "are"),
        " eventually ",
        ("pre", "pressed"),
        " and ",
        ("fu", "fused"),
        " together ",
        ("t", "to"),
        " create ",
        ("so", "solid"),
        " rock. The strata inside these formations serve as historical records of environmental conditions, revealing changes in climate, sea levels, and biological evolution. Analyzing rocks allows geologists to reconstruct past geological events.",
    ])
    tasks.append(t)
    t, n = cw("Terrestrial Mammals", 2, n, [
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
    t, n = cw("Glaciers", 2, n, [
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
    tasks.append(academic("Dinosaur Feathers", 1, [
        "Paleontologists once thought dinosaurs were completely covered in scales. Recent discoveries have overturned this idea. Fossils found in China reveal some dinosaurs had feathers. These fossils, dating back approximately 126 million years, show traces of feathers around skeletons. The feathers were not for flight but likely for insulation or display.",
        "One significant find was the feathered dinosaur Sinosauropteryx. This small, meat-eating dinosaur had simple, hairlike feathers on its body. This discovery showed that feathers were more common among dinosaurs than previously thought. Another discovery involved the larger, more complex feathers of Caudipteryx. These feathers were similar to those of modern birds, suggesting that feathers evolved in stages, becoming more sophisticated over time.",
        {"insert": "A", "t": "Researchers are now studying how feathered dinosaurs might have used their plumage."},
        {"insert": "B", "t": "Some theories suggest that feathers helped regulate body temperature, while other theories propose that feathers were used for mating displays or camouflage."},
        {"insert": "C", "t": "Understanding feather function in dinosaurs provides insights into their behavior and evolution."},
        {"insert": "D"},
        "The idea that birds are direct descendants of dinosaurs has gained support from the findings about feathers. Fossil evidence reveals that many theropod dinosaurs, such as Velociraptor, had feathers similar to those of modern birds. These similarities in feather structures, including quill knobs and complex branching patterns, strengthen the theory that birds evolved from theropod dinosaurs.",
    ], [
        q(n, 'The word "traces" in the passage is closest in meaning to', {
            "A": "development", "B": "signs", "C": "copies", "D": "shadows"}, "B"),
        q(n + 1, "The discovery of Sinosauropteryx suggested which of the following?", {
            "A": "Not all dinosaurs were relatively small meat-eaters.",
            "B": "Many dinosaurs likely had feathers on their bodies.",
            "C": "Dinosaur fossils are more likely to be found in China than in other parts of the world.",
            "D": "Feathered dinosaurs were generally smaller than those without feathers."}, "B"),
        q(n + 2, "Why does the author provide information about Caudipteryx?", {
            "A": "To show another example of a dinosaur with hairlike feathers",
            "B": "To suggest that Sinosauropteryx likely evolved from Caudipteryx",
            "C": "To make the point that dinosaur feathers likely became more complex over time",
            "D": "To show that there is less variety among types of dinosaur feathers than has been commonly assumed"}, "C"),
        q(n + 3, "What is the relationship between paragraphs 2 and 3?", {
            "A": "Paragraph 3 provides an example to support the general point about feathers introduced in paragraph 2.",
            "B": "Paragraph 3 challenges an idea about feathers proposed in paragraph 2.",
            "C": "Paragraph 3 focuses on the roles played by the feathers described in paragraph 2.",
            "D": "Paragraph 3 summarizes the ideas about feathers presented in paragraph 2."}, "C"),
        insert_q(n + 4, "Dinosaurs may have also used their feathers to protect their eggs.", "C"),
    ]))
    n += 5
    tasks.append(academic("Circadian Rhythm Disruption", 2, [
        "Circadian rhythms, the internal clocks regulating organisms' physiological processes, are primarily driven by light exposure. These rhythms may be disrupted by the increased artificial light of urban environments, leading to what scientists call \"circadian misalignment.\" This misalignment not only affects sleep patterns but is linked to a higher prevalence of metabolic disorders. Interestingly, research on nocturnal animals reveals that these creatures have evolved mechanisms, such as unique melatonin production cycles, for thriving in conditions that disrupt human circadian rhythms. Such adaptations could inform potential human therapies.",
        "Recent studies suggest that manipulating light exposure can help reset circadian clocks. Experiments demonstrated that disrupted rhythms can be realigned by the simulation of natural light cycles. However, this approach is not universally effective. Some individuals experience persistent misalignment, suggesting that other environmental or genetic factors may play significant roles.",
        "Moreover, the factors affecting circadian regulation extend beyond light: temperature, diet, and social interactions all influence these rhythms. This complex causal web requires a multidisciplinary approach to develop comprehensive solutions. Cutting-edge research is now exploring therapeutic drugs that can rectify disruptions to the natural circadian rhythmic cycles. Whether these efforts will yield sustainable treatment options remains to be seen.",
    ], [
        q(n, 'Why does the author mention the "higher prevalence of metabolic disorders"?', {
            "A": "To explain why circadian misalignment is increasing in urban environments",
            "B": "To suggest a causal relationship between metabolic illness and sleep disturbances",
            "C": "To support the claim that circadian misalignment affects sleep patterns",
            "D": "To describe one effect of the disruption of circadian rhythms by artificial light"}, "D"),
        q(n + 1, "Why might some nocturnal animal adaptations be important for human therapies?", {
            "A": "They provide evidence that light exposure is the greatest driver of circadian rhythms.",
            "B": "They offer clues about thriving in conditions that cause circadian misalignment in people.",
            "C": "They show that melatonin is not always effective in regulating sleep patterns.",
            "D": "They prove that animals' melatonin production cycles closely resemble those of humans."}, "B"),
        q(n + 2, "What does the author suggest about simulating natural light cycles as a way of resetting circadian clocks?", {
            "A": "Most people experiencing circadian misalignment have seen no benefit from the treatment.",
            "B": "Most researchers agree that this treatment is currently the only effective approach.",
            "C": "The approach is most effective for people with a genetic predisposition for sleep disorders.",
            "D": "This approach has been successfully used to help many individuals restore their sleep patterns."}, "D"),
        q(n + 3, "What is the relationship between paragraph 2 and paragraph 3?", {
            "A": "Paragraph 2 defines a concept; paragraph 3 provides more detail by discussing specific examples.",
            "B": "Paragraph 2 evaluates a focused approach; paragraph 3 points to broader challenges and solutions.",
            "C": "Paragraph 2 proposes a theory; paragraph 3 notes potential objections to it and suggests responses.",
            "D": "Paragraph 2 outlines a methodology; paragraph 3 reports the results of applying it to a problem."}, "B"),
        q(n + 4, 'The word "rectify" in the passage is closest in meaning to', {
            "A": "disclose", "B": "approve", "C": "relieve", "D": "document"}, "C"),
    ]))
    n += 5
    if n != 41:
        raise SystemExit("reading expected next id 41, got %s" % n)
    return paper(ID, "reading", "阅读", [
        {"n": 1, "timeSec": 600, "from": 1, "to": 10},
        {"n": 2, "timeSec": 1200, "from": 11, "to": 40},
    ], tasks)


def build_listening():
    n = 1
    talks = [
        (2, "lecture", "LED Lighting Technology", "listening_01_set36_m2_q29-q32_lecture_led_lighting_technology.mp3", [
            ("What does the speaker mainly discuss?", {
                "A": "The historical development of incandescent bulbs",
                "B": "The impact and future potential of LED technology",
                "C": "The disadvantages of consumer use of LED lights",
                "D": "The challenges researchers face in improving LED technology"}, "B"),
            ("According to the speaker, what is the most significant benefit of LED lights compared to incandescent bulbs?", {
                "A": "LEDs produce more heat than incandescent bulbs.",
                "B": "LEDs are cheaper to manufacture than incandescent bulbs.",
                "C": "LEDs use less energy than incandescent bulbs.",
                "D": "LEDs provide much brighter light than incandescent bulbs."}, "C"),
            ("Why does the speaker mention the small size of LED lights?", {
                "A": "To point out that they are useful for simple household lighting only",
                "B": "To explain why LEDs are not durable",
                "C": "To emphasize the flexibility of LEDs for different uses",
                "D": "To provide a possible reason that they are not more popular"}, "C"),
            ("What is the speaker's attitude toward the future of LED technology?", {
                "A": "Doubtful that LEDs will continue to improve",
                "B": "Concerned about the cost of LED development",
                "C": "Encouraged that LED products will become more affordable",
                "D": "Excited about new possibilities for LED applications"}, "D"),
        ]),
        (2, "lecture", "Sustainable Building Materials", "listening_02_set28_m2_q08-q11_lecture_sustainable_building_materials_adobe.mp3", [
            ("What is the main topic of the talk?", {
                "A": "The renewed use of an old construction material",
                "B": "Recent advances in sustainable building materials",
                "C": "The challenges faced by ancient adobe brick builders",
                "D": "Modern alternatives to adobe bricks"}, "A"),
            ("What does the speaker say about a new building in Amsterdam?", {
                "A": "It was inspired by adobe construction.",
                "B": "It is made from very common natural materials.",
                "C": "It removes carbon from the atmosphere.",
                "D": "It involves technology that improves insulation."}, "C"),
            ("What point does the speaker make about conditions in places in the southwestern United States?", {
                "A": "Major changes in temperature occur there.",
                "B": "Air there has recently become polluted.",
                "C": "Not all materials for adobe production are available there.",
                "D": "More clay for construction is available there than in other places."}, "A"),
            ("What does the speaker emphasize about transportation for construction projects?", {
                "A": "Calculating its costs takes a long time.",
                "B": "It requires special technology when concrete is used.",
                "C": "The need for it depends mostly on the location of the project.",
                "D": "Using adobe bricks helps reduce the need for it."}, "D"),
        ]),
        (2, "lecture", "GIS: Making Informed Decisions", "listening_03_set38_m2_q08-q11_lecture_gis_making_informed_decisions.mp3", [
            ("What does the speaker mainly discuss?", {
                "A": "A type of satellite that improves the accuracy of navigation systems",
                "B": "A debate about whether GPS or GIS is more useful to geographers",
                "C": "Ways that GIS can help with making informed decisions",
                "D": "Studies that have shown the environmental benefits of using GIS"}, "C"),
            ("Why does the speaker mention phones?", {
                "A": "To distinguish between GPS and GIS",
                "B": "To emphasize the convenience of GIS applications",
                "C": "To explain the amount of data that GIS can store",
                "D": "To describe the kinds of images taken by GPS"}, "A"),
            ("Why does the speaker discuss a trucking company?", {
                "A": "To emphasize the challenges of shipping heavy items",
                "B": "To demonstrate different ways that companies can use location data",
                "C": "To explain some ways that shipping affects the environment",
                "D": "To show how the use of GPS has recently changed"}, "B"),
            ("According to the speaker, what can GIS predict about farms?", {
                "A": "Where the chemicals used in farming will end up",
                "B": "When farmers should plant their crops",
                "C": "Whether streams will make fertilizer less useful",
                "D": "What effect a new building will have on crops"}, "A"),
        ]),
        (2, "lecture", "The Human Microbiome", "listening_04_set40_m2_q25-q28_lecture_the_human_microbiome.mp3", [
            ("What is the talk mainly about?", {
                "A": "The complex relationship among different types of viruses",
                "B": "The role of the microbiome in influencing human health",
                "C": "The historical context of microbiome research",
                "D": "The discovery of a new species of fungi"}, "B"),
            ("Why does the speaker mention mood swings experienced after eating?", {
                "A": "To introduce what may be a surprising idea about the microbiome",
                "B": "To argue for the necessity of nutrient-rich diets for participants of microbiome studies",
                "C": "To highlight the main challenge in achieving mood regulation through diet",
                "D": "To summarize the focus of his recent research study"}, "A"),
            ("What does the speaker say about serotonin?", {
                "A": "It typically decreases when a microbiome becomes more diverse.",
                "B": "It is a neurotransmitter that can be synthesized by the microbiome.",
                "C": "It often increases during the digestion of a meal.",
                "D": "It acts as a defense mechanism for the immune system."}, "B"),
            ("What does the speaker imply about the future of medicine?", {
                "A": "Microscopic inhabitants will likely be ignored in future treatments.",
                "B": "Personalized medicine may be influenced by individual microbiome profiles.",
                "C": "Traditional medications will overshadow probiotic-based therapies.",
                "D": "Mood regulation will be the primary focus of microbiome-related advancements."}, "B"),
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
        {"n": 2, "timeSec": 1440, "from": 1, "to": 16},
    ], tasks)


def build_writing():
    return paper(ID, "writing", "写作", [
        {"n": 1, "timeSec": 480, "from": 1, "to": 2, "label": "Sentence Construction"},
        {"n": 2, "timeSec": 840, "from": 3, "to": 4, "label": "Email"},
        {"n": 3, "timeSec": 1800, "from": 5, "to": 7, "label": "Academic Discussion"},
    ], [
        sent(1, 1, "Where is your favorite place to take a walk?", "My ",
             ["favorite spot", "is", "the park", "near the", "campus", "that", "library"],
             ["favorite spot", "is", "the park", "near the", "campus"]),
        sent(2, 1, "Why didn't you go to one of the school libraries yesterday?", "The library ",
             ["that", "was supposed", "to be", "open", "was", "closed for", "renovations", "yesterday"],
             ["that", "was supposed", "to be", "open", "was", "closed for", "renovations"]),
        email(3,
              "You recently purchased a piece of furniture for your dorm room from an online store called 'Home Comforts.' When the item arrived, you discovered that it was damaged during shipping. You are disappointed because you were looking forward to using the new furniture. You need to contact customer service to resolve the issue.",
              ["Describe the item you purchased and the damage it sustained.",
               "Explain why you are disappointed with the situation.",
               "Request a replacement or a refund for the damaged item."],
              "Ms. Brown", "Damaged furniture item",
              "Dear Ms. Brown,\n\nI am writing about a wooden desk I purchased from Home Comforts for my dorm room. When the package arrived yesterday, one of the legs was cracked and the surface had a long scratch, so I cannot assemble or use the desk safely.\n\nI am disappointed because I chose this desk specifically for evening study and had already moved my old table out of the room. I checked the packing list and all parts were included, so the damage appears to have occurred during shipping rather than because of a missing piece.\n\nCould you please arrange a replacement of the same model, or a full refund if a replacement is not available this week? I can send photographs, the order number, and the damaged parts. I would appreciate instructions for return shipping at no additional cost.\n\nSincerely,\n[Your Name]"),
        email(4,
              "You recently rented a car for a weekend trip with your dorm mate and were satisfied with the vehicle's performance. However, you had a bad experience with the customer service at the rental office. You want to provide feedback to the rental company manager, Ms. Turner.",
              ["Explain what features of the car you liked most.",
               "Describe the issues that occurred during your customer service experience.",
               "Suggest ways to improve the pick-up and drop-off process."],
              "Ms. Turner", "Feedback on Car Rental Experience",
              "Dear Ms. Turner,\n\nI recently rented a compact car for a weekend trip and was satisfied with the vehicle itself. It was clean, easy to park, and used less fuel than I expected, which made the trip more comfortable.\n\nUnfortunately, the customer service at the rental office was not as reliable. At pick-up we waited more than forty minutes, and the staff could not find our reservation until we showed the confirmation email. At drop-off, nobody was available to inspect the car, so we were unsure whether the return had been recorded.\n\nA simple check-in list, a visible queue number, and a short drop-off confirmation would prevent this confusion. I hope this feedback helps the office match the quality of the cars you provide.\n\nSincerely,\n[Your Name]"),
        disc(5, "Business Ethics", "Professor Diaz", "diaz.png",
             "We've been discussing strategic growth in corporations. Businesses may often choose to expand globally or prefer instead to deepen local roots. Global growth offers access to new markets and new resources, but can dilute brand identity and strain resources. A local focus, on the other hand, builds community trust, adapts to regional needs, and strengthens customer loyalty. Do you think corporations should concentrate more on expansion or local business? Why?",
             [post("Claire", "kelly.png", "I think global expansion is vital for businesses. It unlocks opportunities, like broader talent pools and increased innovation. Most companies that I know seek to stay competitive in a connected world. While local focus has its strengths, going global builds resilience and relevance across cultures and economies."),
              post("Paul", "andrew.png", "Focusing on local business practices supports regional economies and allows companies to tailor offerings to local needs. It builds trust, loyalty, and authenticity—qualities that global strategies can struggle to replicate. Sometimes, deep roots in one place can create more lasting impact than a broad reach across many.")],
             [{"title": "Expand With Care",
               "text": "Corporations should concentrate more on careful global expansion because isolated local markets can shrink quickly when technology, suppliers, or customers move. Access to a wider talent pool and more than one economy reduces the risk that a single region's downturn will close the business. Claire is right that innovation often appears when teams compare different customer problems. Paul is also right that a company can lose its identity if it copies every market at once. The better path is therefore sequential expansion: keep a strong home operation, then enter a few related markets with products adapted to local rules rather than a generic brand. That approach uses global reach without abandoning the trust built nearby. Over time, a company that can sell and hire in more than one place is more resilient than one that depends entirely on a single community, even a loyal one."},
              {"title": "Deepen Local Roots",
               "text": "I agree with Paul that deepening local business is the stronger strategy for most companies. A firm that knows its city's suppliers, workers, and customers can adjust quickly, keep quality visible, and earn trust that advertising cannot buy. Global expansion looks attractive, but it often stretches management, dilutes the brand, and creates products that fit no place particularly well. Claire's point about talent and resilience is fair, yet a company can hire specialists and use online tools without opening offices everywhere. Local concentration also keeps money circulating in the community, which supports the very customers the business needs. After a local base is genuinely strong, selective export or a single overseas partnership can follow. Until then, expansion is more likely to consume attention than to create durable advantage. Lasting impact usually comes from doing one place exceptionally well."}]),
        disc(6, "Communication Studies", "Professor Diaz", "diaz.png",
             "We've been discussing the rise of digital communication and its impact on face-to-face interactions. Some people believe digital communication enhances relationships by making it easier to stay in touch, while others argue it diminishes the quality of personal interactions. What do you think is the impact of digital communication on personal relationships?",
             [post("Kelly", "kelly.png", "I believe digital communication enhances relationships. It allows people to stay connected regardless of distance and time. Tools like video calls and instant messaging make it possible to maintain close relationships with friends and family who live far away."),
              post("Andrew", "andrew.png", "In my opinion, digital communication diminishes the quality of personal interactions. It often lacks the emotional depth and non-verbal cues of face-to-face conversations. People may feel more isolated and less emotionally connected despite frequent digital interactions.")],
             [{"title": "Distance Needs Tools",
               "text": "Digital communication enhances relationships when distance or schedules would otherwise end them. A short video call can show a parent a child's face; a message can keep a friend included in daily news that would be forgotten if people waited for a yearly visit. Kelly is right that these tools make contact possible across time zones. Andrew's concern about missing tone and body language is real, so digital contact should not replace every meeting that can still happen in person. The harm appears when people sit together and look only at screens, or when a difficult conversation is reduced to a one-line text. Used as a supplement—planning a visit, sharing photographs, checking on someone quickly—digital tools protect relationships that geography would otherwise weaken. The impact is therefore positive if people treat online contact as a bridge rather than a complete substitute for being present."},
              {"title": "Presence Still Matters",
               "text": "I agree with Andrew that digital communication often reduces the quality of personal relationships even when it increases their frequency. Messages are easy to send, so people may feel they have stayed in touch after a few emojis, while never having a conversation long enough to notice that a friend is struggling. Video calls help, but they still omit shared physical context and are easy to interrupt. Kelly is right that distance sometimes leaves no other option, and in those cases a call is better than silence. The problem is treating the easier option as equally good when a walk, a meal, or an unhurried talk is available. Relationships depend on attention, not only on contact counts. If digital tools become the default, people can become simultaneously reachable and lonely. Protecting regular face-to-face time, and using messages mainly to arrange it, keeps the technology from flattening the relationship."}]),
        disc(7, "Environmental Science", "Professor Diaz", "diaz.png",
             "We often hear about environmental problems like air pollution from factories, plastic waste in oceans, and forests being cut down for agriculture. People are trying different solutions: switching from coal and oil to solar and wind energy, teaching communities about recycling and conservation, or developing new technologies to clean contaminated water and soil. Which of these approaches do you think would produce the fastest, most measurable improvements to environmental problems? Why?",
             [post("Paul", "andrew.png", "I believe that switching from coal and oil to solar and wind energy sources would produce the fastest environmental improvements. Power plants that burn coal create most of the air pollution and carbon emissions that cause climate change, so replacing them with clean energy would immediately reduce harmful gases entering the atmosphere and improve air quality in cities."),
              post("Kelly", "kelly.png", "In my opinion, teaching communities about recycling and conservation would produce the most lasting improvements. When people understand how their daily choices affect air and water quality, they change their purchasing habits, support environmental policies, and teach these practices to their children, creating long-term behavioral changes across entire communities.")],
             [{"title": "Change the Power Source",
               "text": "Switching from coal and oil to solar and wind would produce the fastest measurable improvement because a relatively small number of power plants and vehicle fleets account for a large share of emissions. When a coal plant closes or a bus fleet becomes electric, air-quality monitors and carbon inventories can show the change within months rather than decades of individual persuasion. Paul is right that this is a concentrated source of harm. Kelly's education work remains valuable, but teaching recycling does not quickly reduce the smoke from a plant that still burns fossil fuel every hour. Clean energy also makes later conservation easier: people can heat homes and travel with less damage. Governments can measure megawatts installed, coal retired, and pollution reduced. That measurability is exactly what the question asks for. Education should continue, yet the fastest environmental gain comes from replacing the dirtiest energy sources first."},
              {"title": "Change Daily Habits",
               "text": "Teaching communities about recycling and conservation can produce faster lasting results than waiting for every power system to be rebuilt. Energy transitions require huge capital, permits, and years of construction, while people can change purchasing, waste, and transport habits as soon as they understand the cost of the current routine. Kelly is right that children then carry those habits forward, multiplying the effect. Measurement is possible too: landfill weight, household electricity use, and local plastic collected can be tracked by a city within a year. Paul is correct that coal plants matter, and they should still be replaced. That replacement, however, will stall if voters and consumers do not support it. Education creates the political and market demand that makes clean energy possible. For a community that needs visible improvement soon, changing millions of daily choices is the approach that can start immediately and keep working after a single infrastructure project is finished."}]),
    ])


REPEATS = [
    ("career",
     "You are working at a university. Your manager is teaching you how to assist visitors at a university career fair. Listen to the manager and repeat what the manager says. Repeat only once.",
     "speaking_01_set39_repeat_q%02d_university_career_fair.mp3",
     [
        "Visit employers to learn about jobs.",
        "Career workshops offer tools and guidance.",
        "Use this space to build relationships and exchange information.",
        "Get feedback from specialists on how to write your resume.",
        "Feel free to take a break and recharge with some refreshments.",
        "If you're unsure where to begin, follow the group tour that explores key areas.",
        "If you are trying to make the most of your time, consult the map in advance.",
     ]),
    ("museum",
     "You are working at a museum near campus. Your manager is teaching you how to assist visitors at the museum. Listen to the manager and repeat what the manager says. Repeat only once.",
     "speaking_02_set31_repeat_q%02d_assist_visitors_at_the_museum.mp3",
     [
        "Ancient artifacts are in the first section.",
        "Modern art is displayed in this location.",
        "Our learning labs are known to be engaging for all ages.",
        "Visit the cafe for tasty refreshments during your tour.",
        "The gift shop has unique souvenirs for affordable prices.",
        "Guided tours are only available by reservation each weekend.",
        "If you are interested in special events, check the map for more details.",
     ]),
    ("festival",
     "You are working at a university. Your manager is teaching you how to assist visitors at the university's cultural festival. Listen to the manager and repeat what the manager says. Repeat only once.",
     "speaking_03_set22_repeat_q%02d_university_cultural_festival.mp3",
     [
        "Dance acts are featured throughout the day.",
        "Try different cuisines from around the world.",
        "Discover creative works by international artists.",
        "Join a session to learn about various traditions firsthand.",
        "Friendly staff are ready to answer any questions you might have.",
        "Use the map to find a specific event or to help you prioritize.",
        "For a deeper look at the exhibits, join a walk led by a certified guide.",
     ]),
]

INTERVIEWS = [
    ("transit",
     "As part of a university project, you have agreed to take part in a short research interview about public transportation. A graduate student conducting the research will ask you some questions online.",
     "speaking_04_set31_interview_q%02d_public_transportation.mp3",
     [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about your use of public transportation. First, how often do you use public transportation, like buses or trains? Give details to explain your answer.",
         "I use public transportation about three times a week, primarily for commuting to university. For instance, I take the bus every Monday, Wednesday, and Friday because it is convenient and cost-effective. The bus stop is just a five-minute walk from my apartment, and the fare is much cheaper than driving or using ride-sharing services. Additionally, using public transport allows me to read or study during the commute, which I find very productive. Overall, it fits well into my routine."),
        ("Thank you. Can you describe any benefits or disadvantages you might experience from using public transportation?",
         "Using public transportation offers several benefits, such as reducing traffic congestion and lowering carbon emissions, which helps the environment. It is also cost-effective since I save on gas and parking fees. However, there are disadvantages, like less flexibility in scheduling and potential delays. Crowded conditions can be uncomfortable, and routes may not always be convenient. Overall, the benefits often outweigh the drawbacks for many people, especially students who need a reliable weekday commute."),
        ("Interesting. Would you consider moving in order to have better access to public transportation? Why or why not?",
         "I would consider moving for better access to public transportation. Currently, I live in a suburban area with limited bus routes, which makes commuting time-consuming and stressful. Relocating to a neighborhood with frequent subway and bus services would significantly reduce my travel time to work and university, allowing me to be more productive. Additionally, it would lower my carbon footprint, as I could rely less on a car. While moving involves costs and adjustments, the long-term benefits of convenience, efficiency, and environmental impact make it a worthwhile decision for me."),
        ("Great. Some people believe that cities should invest more in public transportation, to reduce traffic congestion, commuting time and pollution. Do you agree or disagree with this idea? Why?",
         "I agree that cities should invest more in public transportation. Expanding bus and rail networks reduces traffic congestion by providing efficient alternatives to driving. For example, dedicated bus lanes can move more people per hour than private cars, cutting commute times significantly. Improved public transit also lowers pollution by decreasing the number of vehicles on the road. Electric buses and trains produce fewer emissions, leading to cleaner air. Although initial costs are high, long-term benefits like reduced healthcare expenses and increased productivity make it worthwhile. Therefore, such investment is essential for sustainable urban development."),
     ]),
    ("movies",
     "You received an email from your university inviting you to join a research study about entertainment preferences. You have scheduled a short online interview with a researcher to answer a few questions.",
     "speaking_05_set07_interview_q%02d_entertainment_preferences.mp3",
     [
        ("Today I'd like to ask you some questions about your entertainment preferences. What kind of movies do your family or friends generally like to watch? For example, do they prefer action movies, comedies, dramas, or other types?",
         "My family and friends have quite diverse tastes in movies, but some patterns emerge. My parents often enjoy historical dramas and documentaries, finding them both educational and engaging. In contrast, my siblings and close friends tend to prefer action-packed films and comedies, as they provide an exciting escape and laughter after a long day. We occasionally watch science fiction together, which sparks interesting discussions. Overall, while preferences vary, we all value movies that offer entertainment and opportunities for shared experiences, making movie nights a cherished part of our social interactions."),
        ("I see. When you watch a movie, do you prefer to watch after work or school on weekdays or do you like to watch during the weekends? Why?",
         "I usually prefer watching movies on weekends rather than on weekdays after work or school. On weekdays, I am often tired from daily responsibilities, so I might not fully enjoy the film or could even fall asleep. Weekends offer more relaxed, uninterrupted time, allowing me to immerse myself in the story without distractions. This makes the experience more enjoyable and memorable, as I can appreciate the plot, characters, and cinematography better. Additionally, watching on weekends often fits better with social plans, like going out with friends or family, which adds to the fun."),
        ("Interesting. Next, I'd like to get your opinion. In the past, people mostly watched movies in theaters. Today, many people watch movies at home. Do you think that movie theaters will continue to exist in the future? Why or why not?",
         "While home streaming offers convenience, I think movie theaters will continue to exist. The primary reason is the unique social and immersive experience they provide. Watching a film in a theater with others creates a shared emotional journey, enhancing enjoyment through collective reactions like laughter or suspense. Additionally, theaters offer superior audiovisual technology, such as large screens and surround sound, which cannot be fully replicated at home, making blockbuster films more impactful. Although home viewing is popular for casual entertainment, theaters still cater to people seeking a special outing or premium quality, which should keep them relevant."),
        ("Good points. I just have one more question. Some people believe that movies can be a powerful tool for educating people and raising awareness about important issues. Do you agree with this idea, or do you think there are other, more effective ways to educate people? Explain why you think so.",
         "I agree that movies can be a powerful educational tool. Films often present complex issues in an engaging, visual format that resonates emotionally with audiences, making topics like social justice or environmental concerns more accessible and memorable. Documentaries have raised public awareness about climate change, for example. However, other methods can be more effective in certain contexts. Interactive workshops or community discussions allow for direct participation and deeper understanding, which movies alone might not achieve. Thus, while movies are valuable for sparking interest, combining them with interactive approaches likely offers the most comprehensive education."),
     ]),
    ("festivals",
     "You have volunteered for a research study at your university about cultural festivals. You will have a short online interview with a researcher. The researcher will ask you some questions.",
     "speaking_06_set05_interview_q%02d_cultural_festivals.mp3",
     [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about cultural festivals. First, cultural festivals are events that celebrate traditions like food, music, art, or clothing from a certain culture. Have you ever been to one? Or would you like to go to one? Why?",
         "I attended a local Chinese New Year festival last year, and it was an enriching experience. The vibrant dragon dances and traditional music performances captivated me, while the variety of authentic Chinese cuisine offered a delightful taste of the culture. I particularly enjoyed making dumplings with a volunteer and learning why families associate them with good fortune. Such festivals provide a valuable opportunity to immerse oneself in different traditions, fostering cross-cultural understanding and appreciation. Active participation makes the tradition easier to remember than watching from a distance."),
        ("Thank you. If you were to go to a cultural festival, what would you like to see or do there?",
         "If I were to attend a cultural festival, I would focus on exploring traditional crafts and culinary experiences. I would visit artisan booths to observe skilled craftspeople demonstrating techniques like pottery or weaving, because these hands-on activities offer deep insights into a culture's heritage. Engaging in interactive workshops, such as learning a folk dance or trying a craft myself, would make the experience more immersive. This approach allows me to appreciate the festival not just as a spectator but as an active participant, gaining a richer understanding of the culture through its tangible and sensory elements."),
        ("Interesting, if you were to participate in a cultural festival for your own culture, what would you want to share with other people and why?",
         "If I were to participate in a cultural festival representing my own culture, I would focus on sharing traditional tea ceremonies. This practice embodies core values of harmony, respect, and mindfulness that are central to our cultural identity. By demonstrating the precise steps of preparing and serving tea, I could illustrate how everyday rituals foster connection and tranquility. I would also explain the historical significance of tea in our society, highlighting its role in social gatherings and philosophical discussions. Sharing this would allow others to experience a tangible aspect of our heritage while promoting cross-cultural appreciation through a simple, yet profound, activity."),
        ("Great! Some people think cultural festivals are mainly just for fun, while others think they serve an important purpose, like helping to keep traditions alive. What do you think?",
         "Cultural festivals are far more than just entertainment: they play a crucial role in preserving traditions and fostering community identity. While they offer fun and enjoyment, their deeper purpose lies in passing down customs, language, and values to younger generations. Festivals like Diwali or Thanksgiving involve rituals and stories that connect people to their heritage, reinforcing a sense of belonging. These events also promote cultural exchange and understanding among diverse groups, which is vital in a globalized world. Thus, I view cultural festivals as essential for maintaining cultural continuity and social cohesion, making them both enjoyable and meaningful."),
     ]),
    ("school",
     "You have volunteered for a research study at your university about childhood education. You will have a short online interview with a researcher. The researcher will ask you some questions.",
     "speaking_07_set08_interview_q%02d_childhood_education.mp3",
     [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about your thoughts on childhood education. First, did you enjoy your school experience as a child?",
         "My school experience as a child was largely positive. I attended a public elementary school where teachers fostered a supportive environment, encouraging curiosity through hands-on activities like science experiments and group projects. While some subjects were challenging, this taught me perseverance and problem-solving skills. I also remember classmates who made ordinary days feel safer and more interesting. Overall, I look back fondly on those years because they laid a strong foundation for my academic and social development."),
        ("Thank you. Tell me about a school project or activity you participated in. What made that project or activity special?",
         "One memorable project was organizing a community reading program for elementary students. Our team designed interactive story sessions and paired university volunteers with children to foster a love for reading. What made it special was witnessing the children's enthusiasm grow each week. One shy student, who initially struggled with reading aloud, gained confidence and started eagerly sharing stories with the group. This experience highlighted how personalized attention and creative engagement can transform educational activities, making learning both effective and joyful for young learners."),
        ("Interesting. Tell me a little about the technology you use during your childhood education. Do you feel like that technology prepared you for life after school? Why or why not?",
         "During my childhood education, the primary technology we used was basic desktop computers with educational software and early internet access for research. This technology was foundational, teaching me essential digital literacy skills like typing, navigating software, and finding information online. While it did not cover advanced tools like current coding environments, learning to troubleshoot computer issues and evaluate online sources helped me develop critical thinking that I still apply in university and daily tasks. Overall, it provided a solid base for further technological learning by fostering problem-solving abilities and adaptability."),
        ("Great! Some people believe that the current education system needs significant changes to better prepare children for the future, focusing more on skills like problem solving and teamwork instead of mainly teaching facts. Do you agree or disagree with this viewpoint? Why?",
         "I agree that education should evolve to emphasize skills like problem-solving and teamwork. While factual knowledge is important, it is often quickly outdated in a fast-changing world. In contrast, skills such as critical thinking and collaboration are timeless and directly applicable to real-life challenges. For example, in a workplace, employees rarely work in isolation; they must solve problems together. By shifting focus to these competencies, schools can better equip students for future careers and societal roles, fostering adaptability and innovation. This approach does not discard facts but integrates them into practical, skill-based learning, making education more relevant and effective."),
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
    dump("2025-07-25-reading.json", build_reading())
    dump("2025-07-25-listening.json", build_listening())
    dump("2025-07-25-writing.json", build_writing())
    dump("2025-07-25-speaking.json", build_speaking(ID, TITLE + " · 口语 Form 1", 1, 1))
    dump("2025-07-25-speaking-f2.json", build_speaking(ID + "-s2", TITLE + " · 口语 Form 2", 2, 2))
    dump("2025-07-25-speaking-f3.json", build_speaking(ID + "-s3", TITLE + " · 口语 Form 3", 3, 3))
    dump("2025-07-25-speaking-f4.json", build_speaking(ID + "-s4", TITLE + " · 口语 Form 4", None, 4))
    copy_audio()
