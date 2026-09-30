#!/usr/bin/env python3
"""Build 7.19 China offline TOEFL. Run: python3 scripts/build_toefl_719cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月/7.19-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-07-19/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-07-19"
SET = "7.19"
TITLE = "新托福 7.19 国内线下"
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
    t, n = cw("Sedimentary Rocks", 1, n, [
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
    t, n = cw("Early Agriculture", 1, n, [
        "At the dawn of civilization, humans relied heavily on their natural surroundings to meet basic needs. Early humans moved often to find food. Over ",
        ("ti", "time"),
        ", they ",
        ("obse", "observed"),
        " natural ",
        ("patt", "patterns"),
        " and ",
        ("be", "began"),
        " planting ",
        ("se", "seeds"),
        ", sparking ",
        ("t", "the"),
        " agricultural ",
        ("revol", "revolution"),
        ". This ",
        ("cha", "change"),
        " allowed ",
        ("perm", "permanent"),
        " settlements ",
        ("a", "and"),
        " growing communities. With larger populations came complex social structures, trade, and specialized crafts.",
    ])
    tasks.append(t)
    t, n = cw("Artificial Intelligence", 1, n, [
        "Understanding the potential and limitations of artificial intelligence is crucial for harnessing its benefits while mitigating associated risks. AI technologies enable computers to ",
        ("mim", "mimic"),
        " human intelligence and ",
        ("cogni", "cognitive"),
        " functions, ",
        ("all", "allowing"),
        " them ",
        ("t", "to"),
        " analyze ",
        ("lar", "large"),
        " datasets and make ",
        ("pred", "predictions"),
        " with ",
        ("spe", "speed"),
        " and ",
        ("accu", "accuracy"),
        ". These ",
        ("capa", "capabilities"),
        " have been particularly beneficial in fields like healthcare, where AI assists in diagnosing diseases by reviewing patterns in medical images. As AI continues to evolve, ",
        ("eth", "ethical"),
        " considerations surrounding data privacy and employment displacement must be addressed.",
    ])
    tasks.append(t)
    t, n = cw("The Gupta Empire", 1, n, [
        "The Gupta Empire, known as the Golden Age of India, thrived from around 320 to 550 C.E. and saw major advancements in science, mathematics, astronomy, literature, and philosophy. Scholars like Aryabhata introduced the concept of zero and approximated pi. ",
        ("Intell", "Intellectual"),
        " achievements ",
        ("flour", "flourished"),
        ", and ",
        ("t", "the"),
        " empire's ",
        ("infl", "influence"),
        " spread ",
        ("thr", "through"),
        " trade, ",
        ("educ", "education"),
        ", and ",
        ("cul", "culture"),
        ". The ",
        ("e", "empire"),
        " also ",
        ("feat", "featured"),
        " architectural ",
        ("struc", "structures"),
        " such as Nalanda University, a renowned center of learning that drew students from across Asia. This left a lasting legacy that shaped neighboring regions and continues to be celebrated today.",
    ])
    tasks.append(t)
    tasks.append(academic("The Role of AI in Diagnosing Diseases", 2, [
        "Artificial Intelligence (AI) is transforming health informatics, particularly in diagnosing diseases. AI algorithms can analyze medical images, detecting abnormalities in X-rays, MRIs, and CT scans with accuracy comparable to trained radiologists. By processing vast amounts of data quickly, AI helps radiologists identify conditions that might be missed during routine examinations.",
        {"insert": "A", "t": "AI predicts disease outbreaks by analyzing data from social media, search engines, and health records."},
        {"insert": "B", "t": "AI systems track the spread of infectious diseases by identifying patterns and trends human analysts might overlook."},
        {"insert": "C", "t": "This predictive capability allows for faster responses and better allocation of medical resources."},
        {"insert": "D"},
        "Moreover, AI personalizes treatment plans. By considering an individual's genetic makeup, lifestyle, and medical history, AI can recommend tailored treatments that improve patient outcomes. This approach is beneficial in managing chronic diseases like diabetes and hypertension.",
        "Despite these advancements, integrating AI into healthcare presents challenges. Concerns about data privacy, the need for large datasets to train algorithms, and the potential for algorithmic bias need to be addressed. Algorithmic bias happens when AI systems learn from data that does not fully represent all groups of people, which can lead to unfair or inaccurate results for some patients. Ensuring the ethical use of AI, particularly in maintaining patient confidentiality and mitigating bias, is crucial.",
    ], [
        q(n, "What is one advantage of using AI in medical diagnostics?", {
            "A": "AI eliminates the need for radiologists.",
            "B": "AI reduces the number of medical images needed for diagnosis.",
            "C": "AI is capable of analyzing large datasets efficiently.",
            "D": "AI can predict patient outcomes based solely on diagnoses."}, "C"),
        q(n + 1, "Why does the author mention social media and search engines?", {
            "A": "To suggest that they are more effective sources of information for AI than health records are.",
            "B": "To help explain how AI gathers the data it needs to predict disease outbreaks.",
            "C": "To show how human analysts identify the patterns that AI systems need to function effectively.",
            "D": "To highlight the growing popularity of AI technologies among users of social media."}, "B"),
        q(n + 2, 'The word "tailored" in the passage is closest in meaning to', {
            "A": "personalized.", "B": "advanced.", "C": "reliable.", "D": "precise."}, "A"),
        q(n + 3, "What does the passage suggest is a potential problem with the datasets used to train algorithms?", {
            "A": "The datasets are extremely expensive to build.",
            "B": "The datasets may not represent all people equally.",
            "C": "The datasets are often procured through unethical means.",
            "D": "The datasets must be manipulated to protect privacy."}, "B"),
        insert_q(n + 4, "AI's capabilities extend beyond image analysis.", "A"),
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
    tasks.append(academic("Data Science and the Buildings of Tomorrow", 2, [
        "Once static structures, buildings increasingly function as dynamic systems thanks to applications of data science to the built environment. Building data science uses sensors and Internet of Things (IoT) devices, such as smart thermostats, to collect and interpret data from buildings. This approach enables architects and planners to make informed decisions throughout a building's design, operation, and renovation phases.",
        "Sensors embedded in modern buildings track variables such as energy consumption, temperature, air quality, and occupancy patterns. These insights help optimize energy use, reduce operational costs, and enhance comfort. Smart HVAC (heating, ventilation, and air-conditioning) systems can adjust airflow based on real-time occupancy, improving efficiency. Monitoring space usage may conflict, however, with occupants' privacy concerns and dislike of being tracked without their consent.",
        "Despite high initial costs, building data science offers long-term benefits. Studies show that buildings using these systems can reduce energy consumption by up to 30 percent, making them attractive for sustainable development. As urban populations grow, building data science will be key to creating adaptable spaces. A skyscraper that adjusts its internal climate based on external weather conditions exemplifies this potential. Other applications include optimizing the layouts of hospitals for better patient flow or using occupancy data to redesign underutilized office spaces.",
    ], [
        q(n, 'The word "static" in the passage is closest in meaning to', {
            "A": "impractical.", "B": "unchanging.", "C": "wasteful.", "D": "simple."}, "B"),
        q(n + 1, "The passage indicates all of the following about building data science EXCEPT:", {
            "A": "It uses data collected from Internet of Things devices.",
            "B": "It requires special training in data analysis for architects who use it.",
            "C": "It has an impact on how architects design new buildings.",
            "D": "It can be used as a basis for decisions about a building's operations."}, "B"),
        q(n + 2, "According to the passage, what is one drawback of the use of sensors?", {
            "A": "Sensors lead to greater energy use.",
            "B": "Sensors are known for supplying inaccurate data.",
            "C": "The data collected is frequently hard to interpret.",
            "D": "Some building occupants may not approve of their use."}, "D"),
        q(n + 3, 'Why does the author mention "hospitals" and "office spaces"?', {
            "A": "To give examples of city structures that are often poorly designed.",
            "B": "To demonstrate how building data science can improve urban infrastructure.",
            "C": "To show the limitations of building data science.",
            "D": "To contradict the claim that building data science will be key to creating adaptable spaces."}, "B"),
        q(n + 4, "Based on the passage, building data science can help most with which of the following?", {
            "A": "Increasing a building's office space.",
            "B": "Limiting a building's construction costs.",
            "C": "Reducing a building's environmental impact.",
            "D": "Enhancing a building's visual appeal."}, "C"),
    ]))
    n += 5
    tasks.append(academic("Hidden Structures in Discrete Geometry", 2, [
        "Discrete geometry is a fascinating branch of mathematics that explores the hidden patterns formed by distinct geometric objects. Unlike continuous geometry—which deals with shapes and structures that are smooth and unbroken, like curves and surfaces—discrete geometry focuses on objects that are finite or countable, like points, lines, and polygons. These distinct components reveal unexpected structures and relationships. Such relations occur particularly in packing and tiling problems.",
        "Packing problems involve finding the most efficient arrangement of objects in a given space. While this might sound like a simple exercise—such as fitting oranges into boxes—it has far-reaching applications in fields like computer-chip design, where components must be arranged to maximize performance and minimize space, and in data storage, where digital information is packed efficiently to save memory and speed up access. Researchers have discovered intriguing connections between the arrangement of shapes and space utilization, challenging assumptions about efficiency.",
        {"insert": "A", "t": "Tiling problems further illustrate the depth of discrete geometry. Arranging figures so they cover a surface without gaps or overlaps creates a pattern with non-repeating order, making underlying symmetries apparent. The tiling derived from such figures may take the form of architectural designs and artworks."},
        {"insert": "B", "t": "For instance, patterns can repeat regularly or follow more complex nonperiodic rules."},
        {"insert": "C", "t": "Mathematicians continue to show how these structures drive innovation across fields."},
        {"insert": "D", "t": "The coloring, abstract nature of discrete geometry can also serve a practical use."},
    ], [
        q(n, "Identify the sentence in paragraph 1 that contrasts two branches of mathematics.", {
            "A": "Discrete geometry is a fascinating branch of mathematics that explores the hidden patterns formed by distinct geometric objects.",
            "B": "Unlike continuous geometry—which deals with shapes and structures that are smooth and unbroken, like curves and surfaces—discrete geometry focuses on objects that are finite or countable, like points, lines, and polygons.",
            "C": "These distinct components reveal unexpected structures and relationships.",
            "D": "Such relations occur particularly in packing and tiling problems."}, "B"),
        q(n + 1, 'Why does the author mention "fitting oranges into boxes"?', {
            "A": "To help describe the historical development of packing problems.",
            "B": "To help communicate the idea that packing problems are not as simple as they sound.",
            "C": "To explain the basic principles of discrete geometry to nonspecialists.",
            "D": "To highlight one of the challenges faced by researchers in discrete geometry."}, "B"),
        q(n + 2, "The study of computer-chip design and data storage has revealed that", {
            "A": "traditional assumptions about efficiency are still valid.",
            "B": "the principles of continuous geometry are surprisingly relevant.",
            "C": "there are interesting connections between how shapes are arranged and how spaces are used.",
            "D": "there are new ways of enhancing the security of digital information."}, "C"),
        q(n + 3, 'The word "challenging" in the passage is closest in meaning to', {
            "A": "hide.", "B": "confirm.", "C": "enhance.", "D": "undermine."}, "D"),
        insert_q(n + 4, "For example, Penrose-inspired patterns have been used in mosaic art and floor designs to create visually striking compositions that evoke mathematical harmony.", "A"),
    ]))
    n += 5
    tasks.append(academic("The Discovery of Vitamins", 2, [
        "The first vitamin discovered was thiamine (vitamin B1). It is found in pork, legumes, and rice bran—the outer layer of brown rice that is removed during the milling process to make white rice.",
        "Around 1900, researchers realized that rice bran could cure a disease called beriberi. In 1912, Casimir Funk isolated an extract from rice bran that he determined to be an amine (a type of nitrogen compound). Funk proposed that the absence of certain amines in the diet can cause beriberi as well as other diseases. Because these amines were essential for life (vita in Latin), Funk coined the term vitamine. The predominant belief about disease at the time was that it was caused by toxins or infections. The idea that disease could arise from the absence of nutrients was revolutionary.",
        "Thiamine was indeed an amine whose absence can cause beriberi, but Funk's extract likely contained a mixture of substances, and his chemical analysis was incomplete.",
        {"insert": "A"},
        {"insert": "B", "t": "Additional life-essential nutrients were soon discovered."},
        {"insert": "C", "t": "The problem was that many of them were not amines."},
        {"insert": "D", "t": "The final e was thus dropped from vitamine to make the term less misleading."},
    ], [
        q(n, "What does the passage imply about white rice?", {
            "A": "It contains more thiamine than brown rice.",
            "B": "It was first produced by Casimir Funk.",
            "C": "It has had its rice bran removed.",
            "D": "It was used to treat infections."}, "C"),
        q(n + 1, "Why was Funk's idea revolutionary?", {
            "A": "It showed that all diseases came from toxins.",
            "B": "It proved that rice bran contained no nutrients.",
            "C": "It replaced the need for laboratory research.",
            "D": "It suggested that disease could result from missing nutrients."}, "D"),
        q(n + 2, "What problem did researchers later find with Funk's term vitamine?", {
            "A": "It referred only to pork and legumes.",
            "B": "It was based on the Latin word for rice.",
            "C": "It was too difficult for scientists to pronounce.",
            "D": "Not all life-essential nutrients were amines."}, "D"),
        q(n + 3, "According to the passage, all of the following are true about thiamine EXCEPT:", {
            "A": "It is also called vitamin B1.",
            "B": "It can be found in rice bran.",
            "C": "It was never isolated in pure form.",
            "D": "Its absence can cause beriberi."}, "C"),
        insert_q(n + 4, "Vitamin C, for example, is an acid and contains no nitrogen at all.", "D"),
    ]))
    n += 5
    if n != 66:
        raise SystemExit("reading expected next id 66, got %s" % n)
    return paper(ID, "reading", "阅读", [
        {"n": 1, "timeSec": 1200, "from": 1, "to": 40},
        {"n": 2, "timeSec": 1200, "from": 41, "to": 65},
    ], tasks)


def build_listening():
    n = 1
    talks = [
        (1, "lecture", "Dark Stores", "listening_m1_q25_q28_lecture_dark_stores.mp3", [
            ("What is the main topic of the talk?", {
                "A": "The retail and social effects of dark stores",
                "B": "The interior design of modern stores",
                "C": "Similarities between stores and warehouses",
                "D": "The history of warehouse construction"}, "A"),
            ("Why can dark stores sometimes offer lower prices?", {
                "A": "They purchase larger quantities.",
                "B": "They operate without making a profit.",
                "C": "They sell cheaper products.",
                "D": "They have lower overhead costs."}, "D"),
            ("Why does the speaker mention grocery delivery in under an hour?", {
                "A": "To illustrate a competitive advantage",
                "B": "To compare urban and rural shopping",
                "C": "To discuss the handling of perishable goods",
                "D": "To explain why delivery fees are higher"}, "A"),
            ("What concern about employment does the speaker mention?", {
                "A": "Most positions are temporary.",
                "B": "Workers need advanced technical skills.",
                "C": "Fewer customer-facing jobs may be available.",
                "D": "Delivery workers must be paid more."}, "C"),
        ]),
        (2, "conversation", "Airport Train", "listening_m2_q04_q05_conversation_airport_train.mp3", [
            ("Why is the man asking Anne for advice?", {
                "A": "He wants to know the cheapest way around the city.",
                "B": "His visitor needs to catch an early flight.",
                "C": "He is planning a trip to Denver.",
                "D": "He is deciding whether to take a taxi to Denver."}, "B"),
            ("What does Anne recommend that the man do?", {
                "A": "Buy the tickets in advance",
                "B": "Ask her husband",
                "C": "Check the train schedule online",
                "D": "Contact the airport"}, "C"),
        ]),
        (2, "lecture", "Remote Controls", "listening_m2_q08_q11_lecture_remote_controls.mp3", [
            ("What is the main topic of the talk?", {
                "A": "How remote controls were adapted for many purposes",
                "B": "The development of remote-control technology through the mid-twentieth century",
                "C": "Why remote controls became less expensive",
                "D": "Modern innovations in smart-device control"}, "B"),
            ("What were some of the earliest remote controls used for?", {
                "A": "Unpiloted military vehicles",
                "B": "Nikola Tesla's laboratory equipment",
                "C": "Wireless television sets",
                "D": "Parking-lot gates"}, "A"),
            ("What is the speaker's opinion of the Lazy Bones remote?", {
                "A": "It encouraged people to watch too much television.",
                "B": "It was too complicated to operate.",
                "C": "Its long wire made it inconvenient and hazardous.",
                "D": "It was too expensive for long-term use."}, "C"),
            ("Why does the speaker mention a light bulb?", {
                "A": "To show that household devices could respond to remotes",
                "B": "To explain the source of the Flashmatic's beam",
                "C": "To describe an improvement in remote-control design",
                "D": "To illustrate a disadvantage of the Flashmatic"}, "D"),
        ]),
        (2, "lecture", "Lois Mailou Jones", "listening_m2_q08_q11_lecture_lois_mailou_jones.mp3", [
            ("Who is the lecture mainly about?", {
                "A": "Lois Mailou Jones.", "B": "Georgia O'Keeffe.", "C": "Jacob Lawrence.", "D": "Frida Kahlo."}, "A"),
            ("What change in the artist's work does the professor describe?", {
                "A": "It became less colorful.",
                "B": "It moved from representational forms toward abstraction.",
                "C": "It focused only on sculpture.",
                "D": "It avoided international influences."}, "B"),
            ("What influenced the artist's use of color and pattern?", {
                "A": "Her work in chemistry.",
                "B": "Her interest in astronomy.",
                "C": "Her dislike of teaching.",
                "D": "Her travels and studies abroad."}, "D"),
            ("What else did Jones do besides create art?", {
                "A": "She directed a museum.",
                "B": "She wrote novels.",
                "C": "She taught and influenced younger artists.",
                "D": "She designed city buildings."}, "C"),
        ]),
        (2, "lecture", "Flying Squid", "listening_m2_q12_q15_lecture_flying_squid.mp3", [
            ("What is the main focus of the talk?", {
                "A": "The adaptations of various marine mammals",
                "B": "The surprising behavior of a sea creature",
                "C": "The benefit of flying instead of swimming",
                "D": "The ways animals escape flying predators"}, "B"),
            ("What difference between flying squid and flying squirrels does the speaker mention?", {
                "A": "Flying squid can propel themselves upward.",
                "B": "Flying squid benefit from tree branches above the water.",
                "C": "Flying squid can breathe underwater and in the air.",
                "D": "Flying squid can travel longer distances in the air."}, "A"),
            ("What does the speaker compare the membranes between the squid's tentacles and arms to?", {
                "A": "Fins", "B": "Engines", "C": "Propellers", "D": "Wings"}, "D"),
            ("What does the speaker point out about squid migration?", {
                "A": "It can be affected by the presence of ships.",
                "B": "It varies with the squid's lifespan.",
                "C": "It occurs seasonally.",
                "D": "It is more efficient through the air than through the water."}, "D"),
        ]),
        (2, "lecture", "Viral Marketing", "listening_m2_q12_q15_lecture_viral_marketing.mp3", [
            ("What is the lecture mainly about?", {
                "A": "How companies set product prices.",
                "B": "How viral marketing spreads through social networks.",
                "C": "Why traditional advertising has disappeared.",
                "D": "How to design a company logo."}, "B"),
            ("Why can viral marketing be inexpensive?", {
                "A": "Users share content with other people.",
                "B": "It requires no planning.",
                "C": "It avoids all online platforms.",
                "D": "Companies do not need products."}, "A"),
            ("What risk does the professor mention?", {
                "A": "The campaign may require too much printing.",
                "B": "Customers may forget the brand name.",
                "C": "The company may have to close its website.",
                "D": "The company may lose control of the message."}, "D"),
            ("What can happen if viewers dislike the content?", {
                "A": "They may criticize or parody it.",
                "B": "They may stop using social media.",
                "C": "They may ask for longer advertisements.",
                "D": "They may prevent the campaign from spreading at all."}, "A"),
        ]),
        (2, "lecture", "Gas Emission Craters", "listening_m2_q12_q15_lecture_gas_emission_craters.mp3", [
            ("Who discovered the first gas emission crater in 2014?", {
                "A": "A pilot", "B": "A scientist", "C": "A local resident", "D": "A gas extraction employee"}, "A"),
            ("What feature of the crater is the speaker most impressed with?", {
                "A": "Its size", "B": "Its shape", "C": "The temperature inside it", "D": "The materials found near it"}, "A"),
            ("Why is the speaker concerned about the explosions?", {
                "A": "They might cause more warming.",
                "B": "They might damage wide areas of permafrost.",
                "C": "They might discourage visitors.",
                "D": "They might be dangerous for pipelines."}, "D"),
            ("What causes empty cavities that fill with gas to form?", {
                "A": "The building of pipelines",
                "B": "The loss of ice from frozen soil",
                "C": "The removal of oil",
                "D": "Pressure from underground gas"}, "B"),
        ]),
        (2, "lecture", "Gut Microbiome", "listening_m2_q08_q11_lecture_gut_microbiome.mp3", [
            ("What is the main topic of the lecture?", {
                "A": "Viruses that affect digestion",
                "B": "The role of the microbiome in human health",
                "C": "The history of microbiome research",
                "D": "Newly discovered types of fungi"}, "B"),
            ("Why does the speaker mention mood swings experienced after eating?", {
                "A": "To introduce a possibly surprising effect of the microbiome",
                "B": "To emphasize the need for strict diets",
                "C": "To challenge current theories of mood regulation",
                "D": "To summarize a recent medical study"}, "A"),
            ("What does the speaker say about serotonin?", {
                "A": "It decreases when the microbiome is diverse.",
                "B": "It is a neurotransmitter that can be synthesized by gut microbes.",
                "C": "It primarily increases digestion.",
                "D": "It acts as a defense against all pathogens."}, "B"),
            ("What future development does the speaker predict?", {
                "A": "Doctors will ignore differences among microbiomes.",
                "B": "Personalized medicine may be influenced by individual microbiome profiles.",
                "C": "Traditional medicines will replace microbiome treatments.",
                "D": "Mood regulation will become the only focus of microbiome research."}, "B"),
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
        {"n": 2, "timeSec": 1440, "from": 5, "to": 30},
    ], tasks)


def build_writing():
    return paper(ID, "writing", "写作", [
        {"n": 1, "timeSec": 840, "from": 1, "to": 2, "label": "Email"},
        {"n": 2, "timeSec": 1800, "from": 3, "to": 5, "label": "Academic Discussion"},
    ], [
        email(1,
              "You recently purchased a new laptop for school, and you are satisfied with the purchase. However, you noticed some issues with its performance. You need to contact customer service to resolve this issue.",
              ["Explain what you liked about the laptop.",
               "Describe the issues with the laptop performance.",
               "Suggest a resolution for this issue."],
              "Customer Service", "Recent Laptop Purchase",
              "Dear Customer Service,\n\nI am writing about a laptop I recently purchased for school. I chose it because of its light weight and long battery life, which make it convenient for classes and library work. Unfortunately, the computer freezes whenever I run a video meeting and a document editor at the same time. The cooling fan also becomes unusually loud, and the battery sometimes drops from 60 percent to 20 percent in less than an hour.\n\nI have installed the latest updates and restarted the device, but the problems continue. Could you arrange a diagnostic test and either repair the laptop or replace it with the same model if the hardware is defective? Please let me know whether I should bring it to a service center or mail it back.\n\nThank you for your assistance.\n\nSincerely,\nAlex Chen"),
        email(2,
              "You are helping plan a surprise farewell party for a colleague who is leaving the university. You need to make arrangements for the celebration and want to contact the university's event coordinator, Ms. Lee.",
              ["Explain the purpose of the event.",
               "Describe the type of venue and decoration options you are looking for.",
               "Request a meeting to finalize the arrangements."],
              "Ms. Lee", "Arrangements for farewell party",
              "Dear Ms. Lee,\n\nI am helping organize a surprise farewell party for our colleague, Maria Santos, who will leave the university at the end of this month. We hope to thank her for supporting our department and give students and staff an opportunity to say goodbye.\n\nWe are looking for an informal indoor venue that can accommodate about forty people and has space for light refreshments and a short presentation. A room with movable tables would be ideal. For decorations, we would like simple university colors, a photo display, and a banner, while keeping the entrance plain so the surprise is not revealed.\n\nCould we meet this week to review available rooms, costs, and setup rules? I am free Wednesday afternoon or Friday morning, but can adjust to your schedule. Thank you for helping us plan the event.\n\nBest regards,\nJordan Kim"),
        disc(3, "Business Management", "Professor Gupta", "diaz.png",
             "This week, we have been discussing strategies to promote workplace productivity and employee performance. One controversial topic is multitasking. Some people argue that juggling several tasks is essential in fast-paced workplaces, while others believe multitasking reduces efficiency and increases errors. Do you believe that managers should promote multitasking in the workplace? Why or why not?",
             [post("Kelly", "kelly.png", "I think managers should promote multitasking. It helps employees handle routine tasks simultaneously and mirror real-world demands. With the right tools and training, multitasking can improve time management and adaptability."),
              post("Andrew", "andrew.png", "I oppose multitasking in the workplace. It increases the chance of mistakes and leads to mental fatigue. Deep, focused work is more effective for quality outcomes and long-term employee well-being.")],
             [{"title": "Protect Focus",
               "text": "Managers should not promote multitasking as a general work method because switching attention increases errors. An employee who answers messages while preparing a financial report may enter a figure in the wrong column. Correcting that mistake can consume more time than the original interruption seemed to save. Kelly correctly notes that workplaces contain overlapping demands, but managers can address them through clear priorities, rotating coverage, and better scheduling rather than continuous task switching. Routine background processes may run together, yet employees need uninterrupted time for decisions that affect customers, safety, or money. A culture that protects focused work will usually produce more reliable results and reduce exhaustion over the long term. It also makes responsibility for each decision easier to trace."},
              {"title": "Train Switching",
               "text": "Managers should promote limited multitasking because many workplaces require people to handle overlapping demands rather than one isolated task. A receptionist, a nurse, or a project coordinator cannot wait until every previous request is complete before noticing a new one. With training, people can group similar tasks, set short check-in times, and keep an explicit list so nothing is forgotten. Kelly is right that this mirrors real conditions. Andrew's concern about fatigue is valid, so managers should not praise constant interruption. They should define which tasks may run together and which require a closed door. When employees know the difference, multitasking becomes a controlled skill instead of chaos. That combination of flexibility and limits is more realistic than insisting every job can be done in perfect isolation."}]),
        disc(4, "Education", "Professor Gupta", "diaz.png",
             "One traditional method of classroom instruction is lecturing, in which the teacher talks about a topic for an extended period and students listen. Some educators believe teachers should limit lectures and use discussions and group work instead, while others still teach primarily by lecturing. Do you believe lecturing is an effective teaching method? Why or why not?",
             [post("Kelly", "kelly.png", "I believe lecturing can be extremely effective when professors have strong communication skills. Engaging lecturers can explain complex topics clearly and show passion for their subject matter."),
              post("Andrew", "andrew.png", "I do not think pure lecturing works well. Without student participation, professors cannot tell whether students understand, and learners can easily become passive or distracted.")],
             [{"title": "Interactive Lecture",
               "text": "I agree with Kelly that lecturing can be effective because a skilled instructor can organize a difficult subject into a coherent path. Students often need a shared foundation before they can discuss a topic productively. For example, in an introductory biology course, a professor can use a short lecture to connect cell structure, energy use, and genetic information. A well-sequenced explanation prevents students from treating those ideas as unrelated facts and allows the class to use its limited time efficiently. Andrew is correct that passive listening alone does not reveal whether students understand. However, that weakness can be solved without abandoning lectures. Professors can pause for prediction questions, quick written summaries, or brief peer explanations. The best approach is therefore an interactive lecture: the teacher supplies expertise and structure, while frequent checks require students to process the material."},
              {"title": "Students Must Use Ideas",
               "text": "I agree with Andrew that lecturing should not be the main teaching method because students learn more when they must use ideas, not merely hear them. A long explanation can feel clear in the moment, yet students may discover later that they cannot apply the concept independently. For example, an economics class might listen to a polished lecture about supply and demand but still struggle to analyze a new market. A group task that asks students to predict price changes would expose misunderstandings immediately and give the instructor a chance to respond. Kelly is right that an excellent lecturer can make complex material accessible. Still, clarity is only the first step; durable learning requires retrieval, discussion, and feedback. Teachers can provide short explanations when needed, but most class time should involve questions, examples, and problem solving."}]),
        disc(5, "Marketing", "Professor Gupta", "diaz.png",
             "Companies increasingly hire social media personalities with large followings to promote products through posts, videos, and reviews. Some marketers believe influencers can increase sales because followers trust their recommendations, while others argue that influencer marketing is expensive and unpredictable. Do you believe social media influencers are an effective marketing strategy or a risky one? Why?",
             [post("Kelly", "kelly.png", "Social media influencers are highly effective because they create authentic connections with their audiences and can reach specific target groups that are genuinely interested in a product."),
              post("Andrew", "andrew.png", "Relying on influencers can be risky and unpredictable. Popularity can change after scandals or trends, and many expensive campaigns fail to produce measurable sales.")],
             [{"title": "Useful When Targeted",
               "text": "I agree with Kelly that influencers can be an effective marketing strategy when companies choose them for audience fit rather than follower count. A trusted creator already understands how to explain products in a style that a particular community finds useful. For example, a small company selling hiking equipment could work with a trail reviewer who shows actual use over several weeks rather than a celebrity with a mixed audience. Followers can ask practical questions, observe limitations, and decide whether the item fits their habits. Companies should disclose sponsorship and measure sales through codes rather than only views. Andrew is right that popularity can collapse, so contracts should be short and no single personality should represent the whole brand. With those limits, influencer marketing can turn relevant expertise into informed demand."},
              {"title": "Own the Reputation",
               "text": "Relying heavily on influencers is risky because a brand gives part of its reputation to a person it cannot fully control. A creator's audience may change, engagement may decline, or unrelated behavior may suddenly dominate public attention. Even a campaign with many views can fail commercially if followers enjoy the content but have little intention or ability to buy the product. This makes costs and results difficult to predict. Companies should build marketing assets they own, such as useful product information, customer relationships, and consistent service channels. Influencers can be used for limited experiments, but contracts should define disclosure, content review, cancellation, and data access. Personalities can provide temporary reach, yet a durable marketing strategy should survive their departure. When identity and measurement depend on unstable external popularity, the apparent authenticity of influencer promotion becomes a major operational and reputational risk."}]),
    ])


REPEATS = [
    ("climbing", "You are working at a university climbing gym. Your manager is training you to assist visitors. Listen to the manager and repeat what the manager says. Repeat only once.", [
        "You can rent climbing shoes at the front desk.",
        "Always wear a helmet when in the gym.",
        "The shorter walls can be used without ropes or a harness.",
        "Just follow the colored marks to stay on the same climbing path.",
        "Also make sure to check out our special strength training.",
        "Use the hang and chin-up bars to increase the power of your upper body.",
        "If you need help, trained instructors are always nearby to guide and advise you.",
    ]),
    ("flowers", "You are volunteering at a community workshop near campus. The leader is training you to guide participants in arranging flowers. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "Cut stems at an angle using shears.",
        "Place pebbles in the bottom for support.",
        "Begin by placing the taller flowers in the center.",
        "Fill gaps with smaller flowers to maintain the visual balance.",
        "Add some greenery to enhance the overall fullness.",
        "You need to change the water regularly to keep everything looking fresh.",
        "Once you are happy with your arrangement, decorate it with a pretty ribbon.",
    ]),
    ("studio", "You are being trained to assist students in a campus media production studio. Listen to the trainer and repeat what the trainer says. Repeat only once.", [
        "Set the camera to record video.",
        "The lighting rig eliminates harsh shadows.",
        "Position the microphone for clear audio capture.",
        "Edit your photos easily using the latest advanced software.",
        "The green screen can help you create special effects.",
        "The master control panel is used to manage all studio equipment.",
        "If you have questions, a staff member can help you finish your project.",
    ]),
    ("birdhouse", "You are volunteering at a community workshop near campus. The leader is training you to guide schoolchildren in building a simple birdhouse. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "Measure each piece carefully before you cut.",
        "Saw slowly to keep the line smooth and straight.",
        "Lightly sand the edges until they all feel smooth and clean.",
        "Make a round hole that the bird will use as the entrance to the house.",
        "Glue each side of the house together and give it some time to dry.",
        "To attach the roof, hammer the nails in gently so the wood doesn't split or crack.",
        "To protect the birdhouse from weather, seal it well so it will last for years.",
    ]),
]

INTERVIEWS = [
    ("fashion", "You have signed up for a study about people's experiences with fashion and clothing. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for signing up for the study. I'd like to ask you some questions about your experiences with fashion and clothing. First, do you enjoy shopping for clothes or is it something you find tedious? Why?",
         "I enjoy shopping for clothes when I have a clear purpose, but I find it tedious when I am only browsing. If I need a jacket or shoes, I like comparing styles and trying several options because the process feels practical. However, crowded stores, long lines, and too many nearly identical choices quickly become tiring. I also dislike buying something simply because it is fashionable. I usually make a short list, set a budget, and visit only a few stores. That approach lets me enjoy finding something useful without spending an entire afternoon making decisions I may later regret."),
        ("Great, noted. Now, what types of clothes do you usually prefer to wear? Do you have a particular style you enjoy?",
         "I usually prefer simple, comfortable clothes in neutral colors. On most days, I wear dark jeans or casual trousers with a plain shirt and comfortable shoes. I like this style because the pieces are easy to combine, so I do not need a large wardrobe. For presentations or formal events, I add a blazer and choose more polished shoes, but I still avoid anything too decorative. My clothes are not meant to attract attention. I want them to fit well, last for several years, and allow me to move comfortably. A practical, understated style suits both my routine and my personality."),
        ("Fair enough. How do you decide what to wear each day? Do you choose your clothes in the morning or the night before?",
         "I normally choose my clothes the night before when I check the weather and review my schedule. If I have a presentation, I prepare something professional; if I will be walking across campus, I choose comfortable shoes and an extra layer. Deciding early saves time in the morning and prevents me from discovering that an item needs ironing. I still make small changes after I wake up, especially if the temperature is different from the forecast. This routine takes only a few minutes, but it reduces stress and helps me arrive on time with clothes that match the day's activities."),
        ("Got it. And finally, some people believe that fashion trends change too quickly and that spending money on new fashions is wasteful. Do you agree or disagree with this viewpoint? Why or why not?",
         "I mostly agree that fashion trends change too quickly and can encourage wasteful spending. Companies release new styles constantly, even when last season's clothes are still useful. People may buy items for a short-lived look, wear them only a few times, and then throw them away. That wastes money and creates environmental problems. However, fashion can also be creative and help people express identity. The solution is not to reject every trend, but to choose carefully. I prefer durable basics and occasionally add one new piece that I will actually wear. That keeps style enjoyable without making constant consumption necessary."),
    ]),
    ("hobbies", "You have volunteered for a research study at your university about hobbies. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about hobbies. To begin, do you have a hobby or interest that you regularly spend time doing?",
         "My main hobby is photography, and I spend a few hours on it most weekends. I usually walk through different neighborhoods and look for interesting light, architecture, or ordinary scenes that people often overlook. Later, I select a small number of photographs and edit them carefully. Photography helps me slow down and pay attention to details, which is a useful contrast to a busy week of study. It also gives me a reason to explore new places. I do not need expensive equipment; using one camera consistently has taught me more about timing and composition than buying new devices would."),
        ("Thank you! If you were to select a new hobby, what would you choose and why?",
         "If I selected a new hobby, I would learn basic woodworking. I like activities that produce something useful, and woodworking combines planning, measurement, and creativity. I would begin with a small project such as a bookshelf or a simple stool, because the result would be easy to evaluate and use at home. The hobby would also teach patience, since careless measurements cannot be fixed by rushing. I would take an introductory class rather than learning entirely online so an instructor could demonstrate safe tool use. Over time, I would like to repair furniture instead of replacing it whenever a small part breaks."),
        ("Interesting. Now tell me what might prevent you from starting this new pastime.",
         "The main things that might prevent me from starting woodworking are limited space, equipment costs, and safety concerns. I live in an apartment, so noise and sawdust would disturb other residents, and I do not have room to store large tools. Good equipment can also be expensive for a beginner who is not yet sure about continuing. I could overcome these problems by joining a community workshop. It would provide shared tools, ventilation, and instructors for a reasonable fee. My schedule could still be a challenge, but reserving one weekend session each month would make the hobby realistic without interfering with schoolwork."),
        ("Great! Some people believe it is better to have one interest outside of work or school that you dedicate yourself to, rather than multiple smaller ones. What do you think about that and why?",
         "I think it is better to have one main interest and a few smaller ones. A serious hobby becomes rewarding only after a person practices long enough to move beyond the beginner stage. Dedication creates skill, confidence, and a community of people with the same interest. However, focusing on only one activity can become repetitive or difficult if circumstances change. Smaller hobbies provide variety and relaxation without requiring the same commitment. For example, I might devote most of my free time to photography while occasionally cooking or hiking. This balance gives me the satisfaction of real progress while preserving curiosity and flexibility."),
    ]),
    ("finance", "You have volunteered for a research study about personal finance habits. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for agreeing to participate. I'd like to ask you some questions about your personal finance habits. First, how often do you review your money management, such as tracking your expenses or budgeting? Do you do this weekly, monthly or less often?",
         "I review my money management once a week. On Sunday evening, I check my bank account, categorize recent expenses, and compare them with the weekly amount I planned. A weekly review is frequent enough to catch problems before they grow, but it does not make budgeting feel like a daily burden. At the end of each month, I also examine larger patterns, such as transportation or food costs, and adjust the next month's plan. This routine takes about fifteen minutes. It helps me avoid late payments, notice unnecessary subscriptions, and make spending decisions based on accurate information rather than a vague impression."),
        ("Thank you. Can you describe one or two methods you or someone you know uses to manage your finances? For example, do you use budgeting apps or keep a written record?",
         "I use a budgeting application and a separate automatic savings transfer. The application connects to my accounts and places purchases into categories, so I can quickly see whether food or entertainment spending is higher than planned. I still review the categories because automatic labels are sometimes wrong. On payday, a fixed amount moves directly into savings before I can spend it. A friend of mine prefers a written record because physically writing each purchase makes the cost feel more real. Both methods work because they create a visible system and reduce the chance that small expenses disappear unnoticed."),
        ("Interesting, tell me about a financial goal you have achieved recently. What motivated you to achieve this goal?",
         "I recently saved enough money to replace an unreliable laptop without borrowing. My old computer was becoming slow, so I set a clear target and divided it into monthly amounts. I reduced restaurant meals, postponed a few nonessential purchases, and transferred money to a separate account immediately after each paycheck. The strongest motivation was independence. I wanted to choose a reliable computer without using a credit balance that would create extra interest. Reaching the goal took several months, but it proved that small, consistent decisions can solve a large problem. It also made me more confident about planning future expenses."),
        ("Great. Some people believe that fiscal responsibility education should be mandatory in schools to help students manage money effectively as adults. Do you agree or disagree with this idea? Why?",
         "I agree that financial responsibility should be mandatory in schools because every student will eventually manage income, bills, credit, and taxes. These decisions have serious consequences, yet many young adults learn only after making costly mistakes. A practical course could explain budgeting, compound interest, student loans, insurance, and common scams through realistic examples. It should not tell students exactly how to spend their money; it should give them tools to compare choices. Families will still influence financial habits, but not every family has the same knowledge. School instruction can provide a basic, equal foundation before students face adult responsibilities."),
    ]),
    ("grocery", "You have volunteered for a research study about grocery shopping habits. You will have a short online interview with a researcher. The researcher will ask you some questions.", [
        ("Thank you for taking part in our study. I'd like to ask you some questions about your grocery shopping habits. First, how often do you go grocery shopping each week? Why that often?",
         "I usually buy groceries twice a week. One trip is a larger planned visit for staple foods, and the second is a short trip for fresh produce or milk. Shopping only once would require me to predict every meal and might cause fresh food to spoil, while going more often would waste time and encourage impulse purchases. Before the main trip, I check what is already in the kitchen and make a list based on several meals. This schedule keeps food fresh, reduces unnecessary buying, and still gives me flexibility if my plans change during the week."),
        ("Great, thank you. Can you tell me what types of items you usually buy when you go grocery shopping? For example, do you buy fresh produce, dairy products, or packaged foods?",
         "I usually buy fresh vegetables, fruit, eggs, yogurt, rice, bread, and a few packaged foods such as pasta or canned beans. I plan meals around produce and a simple source of protein, then add items that can be stored for a busy day. I compare labels on packaged foods, especially for sugar and sodium, but I do not choose products only because the package looks healthy. I also buy household basics when they are running low. Keeping a regular list helps me balance fresh ingredients with convenient foods, so I can cook most meals without needing another unplanned trip."),
        ("Got it. When you are grocery shopping, how often do you impulse buy? In other words, buy things you did not plan on buying. What types of items do you or might you impulse buy?",
         "I impulse buy occasionally, usually when I am hungry or when a product is displayed near the checkout. The items are often snacks, a new drink, or a discounted bakery product rather than something expensive. I have learned that promotions can make an item feel necessary even when it was not part of my plan. To reduce this, I eat before shopping, use a written list, and wait a few minutes before adding an unplanned product. I do not forbid every extra purchase, but I ask whether I will actually use it that week. That simple question prevents most waste."),
        ("Great, that's helpful. Last question, some people believe that shopping at local farmers' markets is better than shopping at large grocery stores. Do you agree or disagree with this opinion? Why?",
         "I generally prefer local farmers' markets for seasonal produce, but I do not think they are better for every purchase. Markets let customers speak directly with growers, learn when food was harvested, and support nearby farms. Produce can be fresher, and the visit feels more connected to the community. Large grocery stores, however, offer lower prices, longer hours, and essentials that local farms may not produce. My ideal routine combines both: I buy seasonal fruit and vegetables at a farmers' market when possible, then use a grocery store for staples. The better choice depends on availability, cost, and the product needed."),
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
    dump("2025-07-19-reading.json", build_reading())
    dump("2025-07-19-listening.json", build_listening())
    dump("2025-07-19-writing.json", build_writing())
    dump("2025-07-19-speaking.json", build_speaking(ID, TITLE + " · 口语 Form 1", 1, 1))
    dump("2025-07-19-speaking-f2.json", build_speaking(ID + "-s2", TITLE + " · 口语 Form 2", 2, 2))
    dump("2025-07-19-speaking-f3.json", build_speaking(ID + "-s3", TITLE + " · 口语 Form 3", 3, 3))
    dump("2025-07-19-speaking-f4.json", build_speaking(ID + "-s4", TITLE + " · 口语 Form 4", 4, 4))
    copy_audio()
