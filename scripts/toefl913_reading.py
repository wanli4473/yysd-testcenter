#!/usr/bin/env python3
"""Extract 9.13 China Offline TOEFL reading from PNG source. Run: python3 extract_reading.py"""


def blank(n, prefix, word, alts=None):
    if prefix and not word.lower().startswith(prefix.lower()):
        raise SystemExit("prefix %r not in %r" % (prefix, word))
    item = {"id": n, "prefix": prefix, "answer": word[len(prefix) :], "word": word}
    if alts:
        item["alts"] = alts
    return item


def cw(title, module, start, parts):
    passage = []
    n = start
    for p in parts:
        if isinstance(p, str):
            passage.append({"t": p})
        else:
            item = blank(n, p[0], p[1], p[2] if len(p) > 2 else None)
            passage.append(item)
            n += 1
    return {
        "type": "complete_words",
        "module": module,
        "title": title,
        "instruction": "Fill in the missing letters in the paragraph.",
        "passage": passage,
    }, n


def mcq(qid, stem, options, answer, **extra):
    q = {"id": qid, "stem": stem, "options": options, "answer": answer}
    q.update(extra)
    return q


def insert_q(qid, sentence, answer):
    return {
        "id": qid,
        "kind": "insert",
        "insert": True,
        "stem": (
            "There are four locations [A]–[D] in the passage. Where would the following sentence best fit?\n\n"
            + sentence
            + "\n\nSelect the best location in the passage."
        ),
        "options": {"A": "[A]", "B": "[B]", "C": "[C]", "D": "[D]"},
        "answer": answer,
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


def last_qid(paper):
    last = 0
    for t in paper["tasks"]:
        if t["type"] == "complete_words":
            last = max(last, max(p["id"] for p in t["passage"] if "id" in p))
        else:
            last = max(last, max(q["id"] for q in t["questions"]))
    return last


def build_reading():
    tasks = []
    n = 1
    t, n = cw(
        "Shadow Puppetry",
        1,
        n,
        [
            "Shadow puppetry is an ancient form of storytelling that uses flat, articulated (movable) figures cast onto a screen by a light source. Shadow puppetry ",
            ("comb", "combines"),
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
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Music and Social Change",
        1,
        n,
        [
            "Music has long served as a powerful tool for cultural expression and social change. ",
            ("Comp", "Composers"),
            " and ",
            ("music", "musicians"),
            " have ",
            ("us", "used"),
            " their ",
            ("wo", "work"),
            " to ",
            ("chal", "challenge"),
            " norms ",
            ("a", "and"),
            " reflect ",
            ("poli", "political"),
            " realities. Beethoven's ",
            ("symph", "symphonies"),
            ", for ",
            ("exa", "example"),
            ", echoed ",
            ("t", "the"),
            " revolutionary spirit of his time. In the twentieth century, protest songs became anthems for civil rights and anti-war movements, helping to mobilize public sentiment. These examples show how music can influence thought and action. Studying these intersections reveals music's lasting role in shaping cultural and ideological shifts throughout history.",
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Prehistoric Bone Tools and Weapons",
        1,
        n,
        [
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
            " properties of these materials varied greatly. For example, the strength and flexibility of antler were important to the way these tools were utilized. Many early bone tools show distinctive signs of wear and polishing, revealing how they were handled and over time.",
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Deserts and Extreme Environments",
        1,
        n,
        [
            "Deserts and extreme environments pose unique challenges for the organisms that inhabit them. These ",
            ("ar", "areas"),
            " are ",
            ("charac", "characterized"),
            " by ",
            ("ha", "harsh"),
            " conditions ",
            ("su", "such"),
            " as ",
            ("int", "intense"),
            " temperatures, ",
            ("sca", "scarce"),
            " water, ",
            ("a", "and"),
            " limited ",
            ("veget", "vegetation"),
            ". Specialized ",
            ("adapt", "adaptations"),
            " have ",
            ("evo", "evolved"),
            " in both plants and animals to increase survival. Studying these traits provides insights into the resilience of life and helps in understanding how ecosystems function under stress. Desert cacti store water in specialized tissues, while fennec foxes have enlarged ears for heat dissipation.",
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Human Cognition",
        1,
        n,
        [
            "Human cognition refers to the mental processes involved in acquiring, processing, storing, and using knowledge. These ",
            ("inc", "include"),
            " the ",
            ("wa", "ways"),
            " that ",
            ("peo", "people"),
            " interpret sensory ",
            ("sig", "signals"),
            " (perception), ",
            ("h", "how"),
            " we ",
            ("st", "store"),
            " and ",
            ("retr", "retrieve"),
            " information (",
            ("mem", "memory"),
            "), how ",
            ("lang", "language"),
            " is ",
            ("prod", "produced"),
            " (speech), and how humans analyze and solve problems. Researchers study cognitive functions to uncover how the brain processes information and how these processes influence behavior. Insights from cognitive science can improve educational methods and help develop interventions for cognitive disorders.",
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Stomata and Water Conservation",
        1,
        n,
        [
            "Plants have tiny holes called stomata on their leaves and stems that allow them to take in carbon dioxide from the air and release oxygen into the air. ",
            ("How", "However"),
            ", stomata ",
            ("c", "can"),
            " also ",
            ("l", "let"),
            " water vapor ",
            ("esc", "escape"),
            ", which ",
            ("cau", "causes"),
            " problems ",
            ("i", "in"),
            " dry ",
            ("enviro", "environments"),
            ". To ",
            ("man", "manage"),
            " this, ",
            ("dur", "during"),
            " hot ",
            ("per", "periods"),
            " when water loss is especially severe, some plants close their stomata temporarily. Another special adaptation is thick, waxy coatings on plant leaves that help conserve water.",
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Theater",
        1,
        n,
        [
            "Unlike literature or visual arts, theater engages audiences through live performances, creating an immediate emotional connection. The ",
            ("collab", "collaborative"),
            " nature ",
            ("o", "of"),
            " theater ",
            ("fos", "fosters"),
            " a ",
            ("dyn", "dynamic"),
            " exchange ",
            ("am", "among"),
            " professionals ",
            ("t", "that"),
            " spurs ",
            ("creat", "creativity"),
            ". Theater ",
            ("c", "can"),
            " challenge ",
            ("precon", "preconceived"),
            " notions ",
            ("an", "and"),
            " invite audiences to consider diverse perspectives. Its ephemeral quality—existing only in the moment of performance—heightens the impact, forcing both performers and viewers to engage with the present, ultimately transforming their understanding of human experiences.",
        ],
    )
    tasks.append(t)
    if n != 71:
        raise SystemExit("expected 70 CW blanks, next id %s" % n)

    tasks.append(
        {
            "type": "daily_life",
            "module": 2,
            "instruction": "Read a newspaper article.",
            "title": "CAMPUS RESEARCHERS 'CRACK' THE CONCRETE CODE",
            "layout": {
                "kind": "card",
                "title": "CAMPUS RESEARCHERS 'CRACK' THE CONCRETE CODE",
                "body": (
                    "Researchers at the university have developed an affordable self-healing concrete. "
                    "When cracks form, embedded microcapsules release a gap-sealing mineral solution. "
                    "The prototype has already survived 50 freeze-thaw cycles in the lab, and now real-world testing is beginning on campus walkways, although students and faculty probably will not notice anything unusual beneath their feet. "
                    "Researchers predict huge benefits. \"Our goal is to reduce costly repairs and extend building lifespans,\" said lead researcher Dr. Elena Vargas. "
                    "\"Imagine bridges that fix themselves after storms.\" Civil engineering professor Mark Chen called the innovation both practical and environmentally responsible. "
                    "\"This could revolutionize construction,\" he said. \"By minimizing waste and extending the life of materials, we're saving money and reducing the environmental footprint.\" "
                    "Larger trials are in the works, but for now campus walkways are a living laboratory, offering a glimpse into a future where concrete is resilient enough to heal itself."
                ),
            },
            "questions": [
                mcq(
                    71,
                    "What is the main topic of the article?",
                    {
                        "A": "How students are learning about environmental responsibility",
                        "B": "A debate over campus maintenance budgets",
                        "C": "Campus research on a better building material",
                        "D": "A plan to ban concrete use in new building projects",
                    },
                    "C",
                ),
                mcq(
                    72,
                    "What is indicated about self-healing concrete?",
                    {
                        "A": "It is activated by alternating exposure to heat and cold.",
                        "B": "It uses liquid to reverse the effects of damage.",
                        "C": "It was the product of a collaboration between two universities.",
                        "D": "It is only suitable for indoor applications.",
                    },
                    "B",
                ),
                mcq(
                    73,
                    "What can be inferred about the potential impact of self-healing concrete?",
                    {
                        "A": "It will change the way bridges are designed.",
                        "B": "It could significantly reduce costs for the maintenance of public infrastructure.",
                        "C": "Its ultimate success will be determined by current trials on campus walkways.",
                        "D": "It will have its greatest impact as a construction material for university buildings.",
                    },
                    "B",
                ),
            ],
        }
    )
    tasks.append(
        {
            "type": "daily_life",
            "module": 2,
            "instruction": "Read an announcement.",
            "title": "Momentum Meet-up: Networking Mixer for Students",
            "layout": {
                "kind": "poster",
                "title": "Momentum Meet-up: Networking Mixer for Students",
                "body": (
                    "Build real-world connections with peers, alumni, and local employers at our campus-wide mixer! "
                    "The evening features fast-paced speed-networking rounds, a short alumni insights panel, and open mingling—perfect for practicing introductions and discovering internships."
                ),
                "fields": [
                    {"label": "When", "value": "Tuesday, April 14, 5:00–7:00 P.M."},
                    {"label": "Where", "value": "Student Center Ballroom"},
                    {"label": "Arrive", "value": "4:45 P.M. for a quick networking primer led by Career Services"},
                    {"label": "Bring", "value": "Five to ten copies of your résumé"},
                    {"label": "Attire", "value": "Smart casual attire is encouraged"},
                    {"label": "Who", "value": "All majors and class years welcome, including graduate students"},
                ],
                "notes": [
                    "Light refreshments provided.",
                    "Name tags and conversation starters will be provided at check-in.",
                    "Hosted by Career Services and Student Government, Momentum Meet-up is a friendly, low-pressure space to grow your professional network and learn how to follow up the right way. Come for the conversation; leave with contacts.",
                    "RSVP by April 10 at www.momentummeetup.dreyer.edu/",
                ],
            },
            "questions": [
                mcq(
                    74,
                    "What is Momentum Meet-up primarily designed to help students do?",
                    {
                        "A": "Choose an academic major",
                        "B": "Get help writing their résumés",
                        "C": "Establish professional contacts",
                        "D": "Discover volunteer opportunities",
                    },
                    "C",
                ),
                mcq(
                    75,
                    "What are attendees asked to bring to the event?",
                    {
                        "A": "At least 100 business cards",
                        "B": "Multiple copies of their résumé",
                        "C": "Money to pay for refreshments",
                        "D": "A name tag and discussion topics",
                    },
                    "B",
                ),
                mcq(
                    76,
                    "What should attendees do to receive tips about networking before the mixer?",
                    {
                        "A": "Download a PDF document",
                        "B": "Join an online FAQ session",
                        "C": "Attend an orientation the day before",
                        "D": "Arrive at the event early",
                    },
                    "D",
                ),
            ],
        }
    )

    tasks.append(
        academic(
            "Urban Green Spaces",
            2,
            [
                "Urban green spaces, such as parks and community gardens, enhance city life for residents.",
                {
                    "insert": "A",
                    "t": "The contrast between green spaces and the surrounding concrete and glass structures can be a visual respite; such spaces also provide residents with a place to relax and connect with nature, which can significantly improve mental health, reduce stress, and encourage physical activity.",
                },
                {"insert": "B"},
                "Urban green spaces also contribute to environmental sustainability.",
                {
                    "insert": "C",
                    "t": "They provide a cooler spot within the concrete heat traps surrounding them, absorb rainwater and reduce flooding, and increase biodiversity by providing habitats for various species.",
                },
                {"insert": "D"},
                "Recent initiatives have focused on creating more green spaces in underserved areas. Some cities are converting abandoned lots into community gardens or small parks. These projects not only provide green spaces but also involve community members in the planning and maintenance of them, fostering a sense of ownership and responsibility.",
                "While urban green spaces offer a host of benefits, they are not without drawbacks. When parks and gardens are added in city neighborhoods, they often increase the value of nearby properties. This can unintentionally lead to the displacement of longtime residents who can no longer afford rising rents or property taxes. Another challenge is preserving these spaces—it can be difficult to secure the funding necessary to maintain them.",
            ],
            [
                mcq(77, 'The word "respite" in the passage is closest in meaning to', {"A": "break", "B": "addition", "C": "symbol", "D": "surprise"}, "A"),
                mcq(
                    78,
                    "What is the relationship between paragraphs 1 and 2?",
                    {
                        "A": "Paragraph 2 describes a new benefit beyond what is mentioned in paragraph 1.",
                        "B": "Paragraph 2 contradicts the ideas presented in paragraph 1.",
                        "C": "Paragraph 2 gives a solution to a problem discussed in paragraph 1.",
                        "D": "Paragraph 2 provides a summary of the detailed information offered in paragraph 1.",
                    },
                    "A",
                ),
                mcq(
                    79,
                    "How can cities improve neighborhood residents' sense of responsibility to local green spaces?",
                    {
                        "A": "By asking residents to help find funding for them",
                        "B": "By asking professional gardeners to plant vegetation",
                        "C": "By inviting area residents to help maintain them",
                        "D": "By arranging for residents to own the land used for them",
                    },
                    "C",
                ),
                mcq(
                    80,
                    "Why does the author mention rising rents for neighborhood residents?",
                    {
                        "A": "To illustrate how urban green spaces increase a neighborhood's desirability",
                        "B": "To explain where the funding for building green spaces comes from",
                        "C": "To show that green spaces are especially needed in underserved urban areas",
                        "D": "To point out one of the disadvantages of urban green spaces",
                    },
                    "D",
                ),
                insert_q(
                    81,
                    "Some even integrate playgrounds, sports fields, and exercise stations, making such activity accessible and fun for local residents.",
                    "B",
                ),
            ],
        )
    )
    tasks.append(
        academic(
            "Expert Systems",
            2,
            [
                "Expert systems are a branch of artificial intelligence designed to mimic the decision-making abilities of human experts. These systems are built to solve complex problems by applying a set of rules to solve specific problems. Their goal is to replicate the expertise and reasoning of professionals in fields like medicine and engineering.",
                "An early expert system is MYCIN, developed in the 1970s to diagnose bacterial infections and recommend antibiotics. MYCIN worked by asking a series of questions about a patient's data, inferring diagnoses and suggesting treatments. MYCIN often performed as well as human specialists; however, MYCIN's system needed constant updates, requiring extensive input from medical professionals.",
                {
                    "insert": "A",
                    "t": "Despite their potential, expert systems have limitations, since they rely on pre-programmed rules and cannot adapt without ongoing input from human experts. The process of updating the system can be labor-intensive.",
                },
                {"insert": "B", "t": "Advancements in machine learning and natural language processing could address these issues."},
                {
                    "insert": "C",
                    "t": "By integrating these technologies, expert systems could learn from new data and adapt, improving accuracy and relevance. Researchers are optimistic that these advancements will transform expert systems, enabling them to tackle a wider range of challenges and operate more independently.",
                },
                {"insert": "D"},
            ],
            [
                mcq(82, 'The word "mimic" in the passage is closest in meaning to', {"A": "replace", "B": "combine", "C": "imitate", "D": "challenge"}, "C"),
                mcq(
                    83,
                    "How did MYCIN diagnose bacterial infections?",
                    {
                        "A": "It used a human specialist to evaluate patient data.",
                        "B": "It applied set rules to analyze patient data.",
                        "C": "It used an infection rates to infer the probability of a particular type of bacteria.",
                        "D": "It relied on information provided directly by the patients.",
                    },
                    "B",
                ),
                mcq(
                    84,
                    "What is a major limitation of current expert systems mentioned in the passage?",
                    {
                        "A": "They are unable to process large datasets.",
                        "B": "They often provide incorrect results.",
                        "C": "They need frequent updating.",
                        "D": "They use databases that are always changing.",
                    },
                    "C",
                ),
                mcq(
                    85,
                    "What can be inferred about the future of expert systems?",
                    {
                        "A": "They will probably be limited to use in medical applications.",
                        "B": "They may learn from new data and operate with less ongoing human input.",
                        "C": "They will become less accurate as the amount of new data increases.",
                        "D": "They will soon be replaced by more relevant technologies.",
                    },
                    "B",
                ),
                insert_q(
                    86,
                    "Additionally, their performance may decline in unfamiliar or rapidly changing environments where new information is constantly emerging.",
                    "B",
                ),
            ],
        )
    )
    tasks.append(
        academic(
            "Growth Mindset in Education",
            2,
            [
                'The concept of a growth mindset has gained attention in educational psychology. Coined by Carol Dweck, the phrase "growth mindset" refers to the belief that abilities and intelligence can be developed through dedication and hard work. This contrasts with a fixed mindset, where individuals believe their abilities are static.',
                "Research suggests that students with a growth mindset are more likely to embrace challenges, persevere through difficulties, and see effort as a path to mastery. For example, a student who struggles with math but believes they can improve with practice is displaying a growth mindset. This belief encourages resilience and a positive attitude towards learning.",
                "Educators play a crucial role in fostering a growth mindset in their students. Techniques such as praising effort rather than innate ability and providing constructive feedback can help students develop this mindset. Creating a classroom environment that celebrates mistakes as learning opportunities can reinforce the growth mindset philosophy.",
                {"insert": "A", "t": "However, implementing growth mindset strategies is not without challenges."},
                {
                    "insert": "B",
                    "t": "Some students may find it difficult to change how they view their abilities, especially if they have been accustomed to a fixed mindset for a long time.",
                },
                {
                    "insert": "C",
                    "t": "Additionally, educators themselves must genuinely believe in the growth mindset principles to effectively convey them to their students.",
                },
                {"insert": "D"},
            ],
            [
                mcq(87, 'The word "persevere" in the passage is closest in meaning to', {"A": "hurry", "B": "change", "C": "hesitate", "D": "persist"}, "D"),
                mcq(
                    88,
                    "According to the passage, which of the following is true about students with a growth mindset?",
                    {
                        "A": "They believe their intelligence is unchangeable.",
                        "B": "They avoid challenges.",
                        "C": "They view effort as a means to improve.",
                        "D": "They are naturally talented.",
                    },
                    "C",
                ),
                mcq(
                    89,
                    "All of the following are mentioned in the passage as ways educators can foster a growth mindset EXCEPT by",
                    {
                        "A": "commending students' efforts",
                        "B": "praising students' innate abilities",
                        "C": "giving constructive feedback",
                        "D": "using mistakes as learning opportunities",
                    },
                    "B",
                ),
                mcq(
                    90,
                    "According to the passage, the implementation of growth mindset strategies may be challenging because of",
                    {
                        "A": "difficulty in changing students' attitudes",
                        "B": "lack of support from students' parents",
                        "C": "insufficient research on growth mindset",
                        "D": "overemphasis on academic performance",
                    },
                    "A",
                ),
                insert_q(
                    91,
                    "This reluctance can be further compounded by a lack of immediate, visible progress, which may discourage continued effort.",
                    "C",
                ),
            ],
        )
    )
    tasks.append(
        academic(
            "Evolutionary Trends in Graphic Design",
            2,
            [
                "Graphic design has transformed repeatedly throughout history, influenced by both cultural shifts and technological advancements. In Europe, during the Middle Ages (the fifth to fifteenth centuries), the creation of intricate manuscripts was predominant. The advent of the printing press in the fifteenth century altered these dynamics, facilitating mass production and broadening public access to designed materials. Such technological shifts not only changed the way art was produced but also how it was perceived.",
                "By the mid-twentieth century, Swiss design emerged as a response to the chaotic visual landscape, introducing principles of minimalism and functionality.",
                {
                    "insert": "A",
                    "t": "Heavily influenced by the Bauhaus movement, designers like Josef Müller-Brockmann advocated for simplicity and rationality.",
                },
                {
                    "insert": "B",
                    "t": "Their grid-based approach brought order and readability to what often seemed to be overwhelming visuals.",
                },
                {
                    "insert": "C",
                    "t": "Some critics argue that the rigid structure, while effective, limited expressive possibilities and emotional resonance in design.",
                },
                {"insert": "D"},
                "Today, graphic design stands at the intersection of tradition and innovation. While digital tools democratize access and encourage experimentation, designers grapple with preserving artistic integrity. The challenge lies in blending the precision of technology with the warmth of human creativity. Thus, graphic design continues to evolve, reflecting broader cultural debates about art and technology.",
            ],
            [
                mcq(
                    92,
                    "What can be inferred about intricate manuscripts during the Middle Ages?",
                    {
                        "A": "They were individually made.",
                        "B": "They were produced using the printing press.",
                        "C": "They were widely available to the general public.",
                        "D": "They depicted mostly landscapes.",
                    },
                    "A",
                ),
                mcq(93, 'The phrase "advocated for" in the passage is closest in meaning to', {"A": "mentioned", "B": "promoted", "C": "debated", "D": "inspired"}, "B"),
                mcq(
                    94,
                    'Why does the author discuss the "grid-based approach"?',
                    {
                        "A": "To argue that the approach should be adopted more widely",
                        "B": "To question the relevance of the approach in modern design",
                        "C": "To show how the principles of minimalism and functionality were used by Swiss designers",
                        "D": "To indicate how Swiss designers differed from the majority of Bauhaus designers",
                    },
                    "C",
                ),
                mcq(
                    95,
                    "It can be inferred that many of today's graphic designers are concerned that digital tools",
                    {
                        "A": "undermine the democratization of the arts",
                        "B": "are not responsive to public debates in the arts",
                        "C": "are not precise enough to be useful in the design process",
                        "D": "do not always reflect the warmth of human creativity",
                    },
                    "D",
                ),
                insert_q(96, "However, this clarity sometimes came at the cost of creativity.", "C"),
            ],
        )
    )
    tasks.append(
        academic(
            "The Ascent of the Italian Lute Song",
            2,
            [
                "Some historians explain the mid-sixteenth-century surge of Italian lute songs as the product of technological innovation combined with shifting social tastes. Around 1500, Ottavio dei Petrucci developed a groundbreaking movable-type printing technique for music, making it easier and cheaper to produce books of lute music. Suddenly, amateur musicians from Naples to Venice could acquire fashionable arrangements of madrigals, villanellas, and solo ricercars. This ease of access dovetailed with an expanding culture of private performance in aristocratic homes. Other historians point to a different catalyst: courtly patronage. Alfonso d'Este, the duke of Ferrara, played a decisive role by commissioning virtuosos like Francesco da Milano and Antonio Valente, whose published collections set a high artistic benchmark.",
                "Evidence for both theories emerges in extant manuscripts: Some contain personalized annotations indicating home practice, while lavish presentation copies bear heraldic emblems of noble households. Furthermore, stylistic borrowings from the Spanish vihuela and French lute idioms suggest a pan-European dialogue that reinforced Italian composers' ambitions. While the printing press democratized repertoire, it was the symbiosis of domestic enthusiasm and aristocratic sponsorship—each reinforcing the other—that, arguably, propelled the Italian lute song to its enduring prominence.",
            ],
            [
                mcq(
                    97,
                    "Which of the following best expresses the main idea of the passage?",
                    {
                        "A": "Innovations in printing have emerged as the most likely cause of a surge in the composition of sixteenth-century Italian lute songs, replacing older, now disproven theories.",
                        "B": "The increased availability of printed lute music, together with courtly patronage, fostered a flourishing culture of lute music in sixteenth-century Italy.",
                        "C": "Italian lute songs became more sophisticated in the sixteenth century as a result of Italian musicians' incorporation of foreign influences.",
                        "D": "As professional sixteenth-century Italian musicians began to offer more private performances in aristocratic homes, composers altered the kind of music written for the lute.",
                    },
                    "B",
                ),
                mcq(
                    98,
                    "The passage suggests which of the following about amateur musicians in sixteenth-century Italy?",
                    {
                        "A": "Their repertoire prior to the sixteenth-century did not include compositions for the lute.",
                        "B": "Their musical tastes influenced the types of compositions commissioned for the lute by patrons like Alfonso d'Este.",
                        "C": "They performed in private homes alongside professional musicians invited by aristocratic patrons.",
                        "D": "The extent to which they performed lute music in private homes was affected by an innovation in the printing industry.",
                    },
                    "D",
                ),
                mcq(99, 'The word "lavish" in the passage is closest in meaning to', {"A": "traditional", "B": "practical", "C": "fancy", "D": "common"}, "C"),
                mcq(
                    100,
                    'The author mentions "heraldic emblems" primarily to',
                    {
                        "A": "cite evidence of the influence of patronage on Italian lute music",
                        "B": "provide evidence that printed lute music grew more complex over time",
                        "C": "demonstrate that music written for the lute became very fashionable",
                        "D": "indicate one way in which aristocrats personalized books of printed music",
                    },
                    "A",
                ),
                mcq(
                    101,
                    "Which of the following is NOT mentioned in the passage as contributing to the mid-sixteenth-century surge of Italian lute songs?",
                    {
                        "A": "The availability of printed lute music",
                        "B": "Courtly patronage of virtuosos",
                        "C": "Improvements in lute construction",
                        "D": "Stylistic borrowings from the Spanish vihuela",
                    },
                    "C",
                ),
            ],
        )
    )
    tasks.append(
        academic(
            "Computational Chemistry in Drug Discovery",
            2,
            [
                "Computational chemistry has transformed drug discovery by providing tools to model and predict molecular behavior. Traditionally, drug discovery involved labor-intensive trial and error. Now, with advanced algorithms and powerful computers, researchers can test interactions between drug candidates and biological targets via computer simulations before moving to the lab.",
                "One major advantage of computational methods is their ability to analyze vast chemical spaces. For example, machine learning algorithms can predict the binding affinity of millions of compounds to a target protein, narrowing down candidates for testing. This speeds up the discovery process and reduces costs. In one case, researchers identified a promising compound for treating a rare disease in weeks, a task that would have taken years using traditional methods.",
                "Moreover, computational chemistry optimizes drug properties. By simulating different modifications to a molecular structure, researchers can predict changes in a drug's efficacy and safety. Repeating and refining this process fine-tunes drug candidates to achieve optimal therapeutic profiles.",
                {
                    "insert": "A",
                    "t": "For example, modifying a molecule to enhance stability in the bloodstream can prevent it from breaking down too quickly, ensuring it reaches its target.",
                },
                {
                    "insert": "B",
                    "t": "Computational predictions must be validated experimentally, as computer models can sometimes produce false positives.",
                },
                {
                    "insert": "C",
                    "t": "Accurately simulating the human body's complex environment remains a formidable task.",
                },
                {"insert": "D"},
            ],
            [
                mcq(
                    102,
                    "The passage suggests that, unlike traditional drug discovery, drug discovery based on computational chemistry",
                    {
                        "A": "is far less time-consuming overall",
                        "B": "is significantly more expensive to conduct",
                        "C": "eliminates the need for lab work",
                        "D": "requires a greater number of researchers",
                    },
                    "A",
                ),
                mcq(
                    103,
                    "According to the passage, how do machine learning algorithms speed up the drug discovery process?",
                    {
                        "A": "By narrowing the size of the chemical spaces that need to be analyzed",
                        "B": "By helping to eliminate compounds that are not promising for testing",
                        "C": "By increasing the number of proteins that can be targeted by compounds",
                        "D": "By providing a comprehensive list of drug candidates",
                    },
                    "B",
                ),
                mcq(
                    104,
                    "According to the passage, what is the purpose of repeatedly simulating various modifications to a molecular structure?",
                    {
                        "A": "To create new biological targets",
                        "B": "To reduce the number of simulations needed in the long run",
                        "C": "To enhance the therapeutic profiles of drug candidates",
                        "D": "To eliminate the need for experimental validation",
                    },
                    "C",
                ),
                mcq(
                    105,
                    'The word "formidable" in the passage is closest in meaning to',
                    {"A": "very challenging", "B": "very exciting", "C": "urgent", "D": "manageable"},
                    "A",
                ),
                insert_q(106, "Despite these advancements, challenges remain.", "B"),
            ],
        )
    )
    tasks.append(
        academic(
            "Social Networks and Influence",
            2,
            [
                "In today's digital age, social networks play a significant role in shaping opinions and behaviors. The influence of these networks is not merely about the number of connections one might have, but about the quality and nature of those interactions. Sociologists have long been interested in how individuals within a network can influence the group's overall dynamics. This concept is sometimes referred to as social capital.",
                {"insert": "A", "t": "The structure of a network can determine the flow of information."},
                {
                    "insert": "B",
                    "t": "An individual positioned at the intersection of various groups, known as a bridge, often plays a crucial role in disseminating information.",
                },
                {
                    "insert": "C",
                    "t": "This person can introduce new ideas and perspectives to different parts of the network, thereby influencing opinions and possibly altering behaviors.",
                },
                {
                    "insert": "D",
                    "t": "Another factor is homophily, where individuals are more likely to form connections with others who are similar to themselves in terms of opinions, values, or social status. While homophily can reinforce existing beliefs, it can also create echo chambers, limiting exposure to diverse perspectives. The presence of influential individuals, often termed opinion leaders, can amplify or mitigate the effects of network structures by means of their social skills or charisma. Sociologists aim to uncover the nuanced ways social networks shape collective behavior.",
                },
            ],
            [
                mcq(
                    107,
                    "According to the passage, social capital refers to",
                    {
                        "A": "how networks shape social interactions in the digital age",
                        "B": "the number of social connections an individual has",
                        "C": "the impact that individuals have on social networks",
                        "D": "the data sociologists use to make claims about digital networks",
                    },
                    "C",
                ),
                mcq(
                    108,
                    "What does the passage imply about homophily?",
                    {
                        "A": "It ensures the dissemination of diverse ideas.",
                        "B": "It promotes similarity and continuity within groups.",
                        "C": "It emphasizes opinion leaders over network structures.",
                        "D": "It makes it unnecessary to have bridges across networks.",
                    },
                    "B",
                ),
                mcq(
                    109,
                    'Why does the author mention "echo chambers"?',
                    {
                        "A": "To highlight the risks of networks composed of like-minded individuals",
                        "B": "To introduce the role of opinion leaders in amplifying network structures",
                        "C": "To elaborate on the role of bridges in altering behaviors",
                        "D": "To identify one advantage of networks that connect various social classes",
                    },
                    "A",
                ),
                mcq(110, 'The word "nuanced" in the passage is closest in meaning to', {"A": "many", "B": "complex", "C": "powerful", "D": "general"}, "B"),
                insert_q(111, "However, spreading information is not the only way to exert influence.", "D"),
            ],
        )
    )

    return {
        "id": "2025-09-13",
        "title": "新托福 9.13 · 阅读",
        "set": "9.13",
        "skill": "reading",
        "modules": [
            {"n": 1, "timeSec": 1680, "from": 1, "to": 70},
            {"n": 2, "timeSec": 1440, "from": 71, "to": 111},
        ],
        "tasks": tasks,
    }


if __name__ == "__main__":
    paper = build_reading()
    print(len(paper["tasks"]), last_qid(paper))
