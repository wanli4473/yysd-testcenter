#!/usr/bin/env python3
"""Build 9.05 China Offline TOEFL papers from OCR'd PDFs. Run: python3 scripts/build_toefl_905.py"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
AUDIO = "library/toefl/audio/2025-09-05/"
IMG = "library/toefl/img/2025-09-02/"


def dump(name, obj):
    path = os.path.join(ROOT, "library/toefl", name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", name, "tasks", len(obj.get("tasks", [])))


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


def lecture(title, module, instruction, form, questions):
    n = int(form)
    return {
        "type": "lecture",
        "module": module,
        "title": title,
        "instruction": instruction,
        "audio": AUDIO + "listening_form%02d_q01_q04_lecture.mp3" % n,
        "questions": questions,
    }


def build_reading():
    tasks = []
    n = 1
    t, n = cw(
        "Conservation Ecology",
        1,
        n,
        [
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
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Baroque Music",
        1,
        n,
        [
            "The Baroque period in music, spanning from the late sixteenth to the early eighteenth century, introduced dramatic changes in musical composition and performance. Composers ",
            ("su", "such"),
            " as Johann Sebastian Bach, George Frideric Handel, ",
            ("a", "and"),
            " Antonio Vivaldi ",
            ("cre", "created"),
            " intricate ",
            ("wo", "works"),
            " characterized ",
            ("b", "by"),
            " expressive ",
            ("melo", "melodies"),
            ". The ",
            ("inve", "invention"),
            " of ",
            ("n", "new"),
            " musical ",
            ("instr", "instruments"),
            " like ",
            ("th", "the"),
            " harpsichord and early forms of the piano expanded the possibilities for composers and performers. With the use of basso continuo and polyphonic structures, Baroque music often featured contrasts in texture and dynamics.",
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Agriculture",
        1,
        n,
        [
            "Agriculture refers to the systematic cultivation of crops and the domestication of animals to produce food and other essential resources. This ",
            ("prac", "practice"),
            " has ",
            ("sust", "sustained"),
            " human ",
            ("soci", "societies"),
            " for ",
            ("mill", "millennia"),
            ". Farmers ",
            ("emp", "employ"),
            " various ",
            ("techn", "techniques"),
            " such ",
            ("a", "as"),
            " plowing ",
            ("a", "and"),
            " irrigation ",
            ("t", "to"),
            " manage ",
            ("la", "land"),
            " effectively. Additionally, livestock including cattle, poultry, and sheep are raised for products like milk, meat, and wool. Agriculture remains a cornerstone of global food security and plays a vital role in supporting economies and communities worldwide.",
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Kinship in Prehistoric Communities",
        1,
        n,
        [
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
            " contributing ",
            ("t", "to"),
            " a ",
            ("sophis", "sophisticated"),
            " division ",
            ("o", "of"),
            " labor. The intricacy of these social structures is further evidenced by the existence of ceremonial sites, which indicate collective activities and social gatherings.",
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Mountain Glaciers and Meltwater",
        1,
        n,
        [
            "Mountain glaciers contain an upper accumulation zone, where snowfall adds ice over time, and lower areas where seasonal melting removes ice. In the accumulation ",
            ("zo", "zone"),
            ", fresh ",
            ("sn", "snow"),
            " slowly ",
            ("comp", "compresses"),
            " into ",
            ("de", "dense"),
            " ice ",
            ("wh", "while"),
            " warmer ",
            ("condi", "conditions"),
            " may ",
            ("pro", "produce"),
            " surface ",
            ("melt", "meltwater"),
            " channels ",
            ("th", "that"),
            " carry ",
            ("sedi", "sediment"),
            " downslope. These channels can move and change during the melt season as temperatures and water flow vary. Meltwater can transport sand and gravel beyond the glacier, where the material may form outwash deposits. Studying these features helps scientists understand glacier movement, seasonal melting, and landscape change.",
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Industrialization and Urbanization",
        1,
        n,
        [
            "In the early days of industrialization, many cities experienced rapid growth. This ",
            ("w", "was"),
            " due ",
            ("t", "to"),
            " the ",
            ("inf", "influx"),
            " of ",
            ("wor", "workers"),
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
        ],
    )
    tasks.append(t)
    t, n = cw(
        "Black Holes",
        1,
        n,
        [
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
        ],
    )
    tasks.append(t)
    if n != 71:
        raise SystemExit("expected 70 CW blanks, next id %s" % n)

    tasks.append(
        academic(
            "Microseisms: The Earth's Subtle Vibrations",
            2,
            [
                "The Earth is constantly vibrating, even when there are no earthquakes. These subtle vibrations, known as microseisms, are typically caused by ocean waves. When waves collide, they create pressure variations that travel through the water and into the sea floor. This energy transfer generates seismic waves detectable by seismometers worldwide. Interestingly, microseisms are strongest during storms when ocean waves are more powerful.",
                "Researchers have found these vibrations can provide important information about the Earth's interior. Microseisms travel through the Earth's crust and mantle, revealing details about the geological structures they pass through, including variations in rock density and the presence of faults or fractures.",
                "Another compelling use of microseisms is in climate studies. Scientists analyze historical data on these vibrations to reconstruct past ocean conditions and storm activities. This helps improve climate models and understand long-term weather patterns. Additionally, microseisms are used in oil and gas exploration. They identify potential drilling sites by highlighting subsurface structures without more invasive techniques.",
                "Studying microseisms is challenging. The mild signals are easily masked by other seismic noises. Advanced data analysis techniques and state-of-the-art equipment are essential for accurately interpreting microseisms. Researchers often employ filtering methods and cross-referencing data from multiple seismometers.",
            ],
            [
                mcq(71, 'The word "subtle" in the passage is closest in meaning to', {"A": "faint", "B": "quick", "C": "strong", "D": "constant"}, "A"),
                mcq(72, "It can be inferred that microseisms are strongest during ocean storms because", {"A": "the Earth's crust and mantle are more active during such storms", "B": "ocean waves are larger and collide more vigorously during such storms", "C": "seismometers are designed to work most effectively during such storms", "D": "the details of geological structures become more apparent during such storms"}, "B"),
                mcq(73, 'Why does the author mention "variations in rock density and the presence of faults or fractures"?', {"A": "To suggest that more research is needed to understand the relationship between microseisms and earthquakes", "B": "To identify the most important features of Earth's crust and mantle", "C": "To help explain how microseisms can alter the geological structures that they pass through", "D": "To highlight the kinds of information microseisms can provide about Earth's interior"}, "D"),
                mcq(74, "According to the passage, how can microseisms help in oil and gas exploration?", {"A": "By providing historical data on ocean conditions", "B": "By pinpointing potential drilling sites", "C": "By measuring the strength of seismic waves", "D": "By reducing the need for seismometers"}, "B"),
                mcq(75, 'What does the author suggest about "filtering methods and cross-referencing data from multiple seismometers"?', {"A": "They are techniques used to study microseisms.", "B": "They demonstrate the outdatedness of seismometers.", "C": "They are popular ways of studying various types of seismic noises.", "D": "They highlight a flaw in current research methods."}, "A"),
            ],
        )
    )
    tasks.append(
        academic(
            "Stretching: Benefits and Drawbacks",
            2,
            [
                "Stretching has long been championed as integral to physical fitness, widely believed to enhance flexibility and reduce injury risk. However, research supports a more nuanced picture, with the distinction between dynamic and static stretching being particularly critical.",
                "Dynamic stretching, involving controlled, fluid movements through a range of motion, apparently improves athletic performance by priming muscles for activity. In contrast, static stretching, the holding of a position for an extended period, seems to hinder performance of subsequent exercise. Related studies show that static stretching can temporarily reduce muscle strength, likely due to reduced muscle activation through the nervous system and a decrease in muscle stiffness, both of which can impair the ability to generate force. For example, athletes engaging in static pre-competition stretches often exhibit diminished sprint speed and vertical jump height.",
                {"insert": "A", "t": "There is, however, a key qualification to this contrast: While static stretching may be detrimental before exertion, it remains valuable post-exercise, aiding in recovery and flexibility maintenance."},
                {"insert": "B", "t": "Meanwhile, dynamic stretching not only prepares the body physically but may also enhance coordination and neuromuscular efficiency."},
                {"insert": "C", "t": "The evolving understanding of these techniques challenges the one-size-fits-all approach to stretching, suggesting that timing, context, and type are essential variables in optimizing physical readiness and long-term fitness outcomes."},
                {"insert": "D"},
            ],
            [
                mcq(76, "According to the passage, dynamic stretching may result in all of the following EXCEPT", {"A": "decreased range of motion", "B": "better performance in sports", "C": "improved coordination", "D": "more efficient communication between nerves and muscles"}, "A"),
                mcq(77, 'The word "impair" in the passage is closest in meaning to', {"A": "aid", "B": "reinforce", "C": "end", "D": "weaken"}, "D"),
                mcq(78, "The passage implies that competitive athletes may most benefit from static stretching when they", {"A": "need to increase muscle strength", "B": "have issues with muscle activation", "C": "have completed a training session", "D": "are preparing for a sprint"}, "C"),
                mcq(79, 'Why does the author refer to "timing, context, and type" in the passage?', {"A": "To specify factors that must be considered when stretching", "B": "To list the variables that affect an athlete's performance", "C": "To refer to additional kinds of stretching developed by researchers", "D": "To underscore the complexity of factors influencing coordination"}, "A"),
                insert_q(80, "Elite swimmers often perform static stretches after intense training sessions to relieve muscle tightness in the shoulders and hips and prevent overuse injuries.", "B"),
            ],
        )
    )
    tasks.append(
        academic(
            "Navigating Gene Editing Ethics",
            2,
            [
                "Gene editing technologies, particularly CRISPR-Cas9, have transformed agricultural biotechnology by enabling precise modifications to plant genomes (genetic material). This allows scientists to enhance crop traits such as drought tolerance, pest resistance, and nutritional content without introducing foreign DNA (DNA from another species), distinguishing it from traditional genetic modification. For example, researchers have used CRISPR to develop rice varieties with improved yields and resistance to bacterial blight, a plant disease that is a major threat to global food security. In another case, gene-edited soybeans have been engineered to produce oil with reduced saturated fat and increased oleic acid—an unsaturated fat associated with heart health—making them more appealing for both consumers and food manufacturers.",
                {"insert": "A", "t": "Despite its promise, gene editing in agriculture raises important concerns. Unintended off-target effects, where edits occur in nontarget regions of the genome, could potentially alter plant metabolism or reduce resilience to environmental stress."},
                {"insert": "B", "t": "Additionally, widespread adoption of uniform edited traits may diminish genetic diversity, making crops more vulnerable to future pests or diseases."},
                {"insert": "C", "t": "Such outcomes highlight the need for comprehensive field testing and multi-season trials to mitigate risks before commercial release. Scientists must evaluate not just the intended trait but also how gene edits affect overall plant health and adaptability."},
                {"insert": "D"},
            ],
            [
                mcq(81, "According to the passage, how is CRISPR-Cas9 technology superior to traditional genetic modification?", {"A": "It is supported by more extensive research.", "B": "It is easier for scientists to implement.", "C": "Its modifications do not involve foreign DNA.", "D": "Its modifications are only temporary."}, "C"),
                mcq(82, 'Why does the passage mention "soybeans"?', {"A": "To illustrate CRISPR-Cas9's potential to improve the nutritional content of crops", "B": "To show that CRISPR-Cas9 technology works better in soybeans than in rice", "C": "To highlight the role of food manufacturers in agricultural biotechnology", "D": "To explain how crop traits relate to heart health"}, "A"),
                mcq(83, "The passage mentions all of the following potential negative effects of gene editing in agriculture EXCEPT", {"A": "a decreased ability to survive in harsh conditions", "B": "an increased chance of being harmed by pests", "C": "a greater likelihood of suffering from diseases", "D": "a higher risk of harming the wider environment"}, "D"),
                mcq(84, 'The word "diminish" in the passage is closest in meaning to', {"A": "limit", "B": "reduce", "C": "stabilize", "D": "predict"}, "B"),
                insert_q(85, "One study about this danger cited the Irish Potato Famine, in which genetically similar varieties were all susceptible to late blight, causing a major catastrophe.", "C"),
            ],
        )
    )
    tasks.append(
        academic(
            "Person-Centered Therapy: A Shift in Focus",
            2,
            [
                "When American psychologist Carl Rogers first introduced person-centered therapy in the mid-twentieth century, the prevailing view was that therapists should be experts in diagnosis and treatment. Instead, in his new approach, Rogers centered the patient as an individual who is able to discover and take steps toward personal growth. Counseling was viewed as a collaborative interaction between the professional and the patient, with the latter playing a key role in effecting change.",
                "One of Rogers' core beliefs was that a nonjudgmental environment fosters self-discovery. The therapist acts as an empathetic facilitator, listening actively and using reflection—paraphrasing, summarizing, and clarifying the client's words—to elicit the client's feelings. Rogers claimed this approach allows individuals to gain the self-awareness and self-acceptance needed to grow personally and resolve issues. Rogers' research suggested that the most successful patients were those who experienced the highest degree of empathy in therapy.",
                "Unlike Rogers' model, earlier clinical approaches foregrounded issues and behaviors of concern, with the therapist diagnosing them and specifying treatment courses. Critics question the effectiveness of Rogers' approach for patients seeking expert guidance, especially those with severe mental-health challenges who need structured intervention. However, Rogers' theories remain influential: The person-centered paradigm is seen in various therapeutic approaches.",
            ],
            [
                mcq(86, 'The word "prevailing" in the passage is closest in meaning to', {"A": "dominant", "B": "successful", "C": "traditional", "D": "scientific"}, "A"),
                mcq(87, "According to the passage, all of the following were characteristics of Rogers' patient-centered approach EXCEPT", {"A": "relying on each patient's own diagnostic expertise", "B": "creating a supportive context for treatment", "C": "listening carefully to the patient", "D": "promoting self-development by patients"}, "A"),
                mcq(88, 'Why does the author of the passage mention "paraphrasing, summarizing, and clarifying"?', {"A": "To specify the note-taking that therapists do during patient sessions", "B": "To clarify the concept of reflection in patient-centered therapy", "C": "To illustrate some tools patients use to promote personal growth", "D": "To explain how Rogers conducted research on therapeutic models"}, "B"),
                mcq(89, "The passage suggests which of the following about therapeutic approaches in the United States before the mid-twentieth century?", {"A": "They were abandoned after Rogers became influential.", "B": "They were not effective for patients with severe mental-health challenges.", "C": "They were not backed by sufficient clinical research.", "D": "They did not view empathy as a key therapeutic methodology."}, "D"),
                mcq(
                    90,
                    "Identify the sentence in paragraph 2 that best explains the intended outcomes for a patient receiving person-centered therapy.",
                    {
                        "A": "One of Rogers' core beliefs was that a nonjudgmental environment fosters self-discovery.",
                        "B": "The therapist acts as an empathetic facilitator, listening actively and using reflection to elicit the client's feelings.",
                        "C": "Rogers claimed this approach allows individuals to gain the self-awareness and self-acceptance needed to grow personally and resolve issues.",
                        "D": "Rogers' research suggested that the most successful patients were those who experienced the highest degree of empathy in therapy.",
                    },
                    "C",
                ),
            ],
        )
    )
    tasks.append(
        academic(
            "Bird Migration",
            2,
            [
                "Every year, millions of birds travel huge distances to wintering grounds, and then back to breeding grounds when warmer weather returns there. Bird migration evolved in response to climatic changes. During the Ice Age, when average temperatures were frigid, migrating birds had a survival advantage, and the behavior became widespread.",
                "Migration is also linked to resource availability. Arctic terns, which undertake the longest migrations of any animal by flying from their summer breeding grounds in Earth's north polar (Arctic) regions to their wintering grounds in Earth's south polar regions, feed primarily on small fish and other small marine animals. This prey is most abundant when increased sunlight results in the increased availability of algae, the microscopic marine plantlike organisms that are food for the tiny marine animals known as zooplankton, which are in turn consumed by terns' prey.",
                "Not all birds migrate. Rock ptarmigans also live in Arctic and sub-Arctic regions. Instead of flying to warmer climes in winter, they shelter in snow burrows and reduce activity to conserve energy. They feed on plants like birch and willow trees, which are available in their habitat year-round. The divergence between migratory and sedentary species represents different adaptations to environmental pressures.",
            ],
            [
                mcq(91, "The passage implies that bird migration began when", {"A": "wintering grounds were closer to breeding grounds than they are now", "B": "areas suitable for breeding were smaller than they are now", "C": "there were many more birds than there are now", "D": "climates were generally much colder than they are now"}, "D"),
                mcq(92, 'What is the passage explaining when it mentions that "increased sunlight results in the increased availability of algae"?', {"A": "Why terns' migrations result in increased food availability for them", "B": "Why some tiny marine organisms migrate for long distances", "C": "Why terns depend on sunlight while traveling long distances", "D": "Why terns benefit from the migration of zooplankton"}, "A"),
                mcq(93, "The passage supports all of the following statements about Arctic terns EXCEPT:", {"A": "They take different migration routes depending on resource availability.", "B": "They migrate over longer distances than all other birds do.", "C": "They spend much of their lives in regions around Earth's poles.", "D": "They eat mostly small animals living in sea water."}, "A"),
                mcq(94, "Why does the passage provide information about rock ptarmigans?", {"A": "To emphasize the usefulness of snow burrows in their habitat", "B": "To contrast their behavior to that of Arctic terns", "C": "To show that birch and willow trees provide food to both migratory and sedentary birds", "D": "To provide another example of migratory birds"}, "B"),
                mcq(95, 'The word "shelter" in the passage is closest in meaning to', {"A": "move", "B": "land", "C": "seek food", "D": "take protection"}, "D"),
            ],
        )
    )
    tasks.append(
        academic(
            "Understanding Ecological Systems Theory",
            2,
            [
                {"insert": "A", "t": "Ecological Systems Theory, introduced by Urie Bronfenbrenner, revolutionized our perception of human psychological development. It posits that individuals are shaped by interactions among multiple overlapping environmental systems."},
                {"insert": "B", "t": "This theory reshaped developmental research, offering a multifaceted lens that surpasses earlier, linear models."},
                {"insert": "C", "t": "By considering the dynamic interplay between a person and their environment, it highlights the multifactorial nature of psychological growth."},
                {"insert": "D"},
                "The theory delineates several environmental layers, beginning with the microsystem, which refers to the institutions and groups that most directly impact the child's development, such as family and school. The mesosystem encompasses the relationships among the microsystems, such as the impact of a teacher's communication with parents on a child's education. Beyond these, the exosystem consists of indirect influences like a parent's workplace stress subtly affecting the home environment. The macrosystem, encompassing broader cultural and societal contexts, frames these interactions with underlying norms and policies.",
                "While Bronfenbrenner's model offers an intricate framework, it is not without critique. Some argue that the model underestimates the role of technology, which has created virtual microsystems that transcend geographical limits. Despite these critiques, the theory remains influential in fields ranging from education to public policy, prompting continuous exploration of its applications and adaptations.",
            ],
            [
                mcq(96, 'Why does the author mention "a teacher\'s communication with parents" in paragraph 2?', {"A": "To illustrate the interactions among microsystems that characterize the mesosystem", "B": "To support the claim that the institutions of the microsystem affect children directly", "C": "To show that Bronfenbrenner's theory is primarily linear", "D": "To suggest that microsystems are more important than the mesosystem"}, "A"),
                mcq(97, 'The phrase "subtly affecting" in the passage is closest in meaning to', {"A": "affecting in harmless but unpredictable ways", "B": "affecting in long-lasting ways", "C": "affecting in ways both positive and negative", "D": "affecting in small, barely noticeable ways"}, "D"),
                mcq(98, "The passage suggests that criticisms of Bronfenbrenner's model call for which of the following?", {"A": "Its replacement with a less intricate framework", "B": "Its modification to include virtual interactions", "C": "Its replacement with a model that gives greater consideration to geographical boundaries", "D": "Its exclusion from fields such as education and public policy"}, "B"),
                mcq(99, "Which of the following best describes the influence of Ecological Systems Theory?", {"A": "It has had little impact on psychology but has unexpectedly affected other fields.", "B": "It revolutionized the field of human psychology but is not taken seriously in other fields.", "C": "It changed the way human psychology is understood and continues to influence other fields.", "D": "It has gone mostly unnoticed among psychologists and has had little impact on other fields."}, "C"),
                insert_q(100, "Each one plays a distinct role in shaping behavior.", "B"),
            ],
        )
    )
    tasks.append(
        academic(
            "Spider Silk in Medicine",
            2,
            [
                "Spider silk is one of nature's most remarkable materials, known for its strength and elasticity. Stronger than steel and highly stretchable, spider silk has inspired researchers to explore its medical potential.",
                "Researchers have experimented with spider silk as a surgical suture material for use in stitching wounds, praising its strength and biocompatibility—a material's ability to interact with the human body without causing adverse reactions, such as inflammation or rejection. Spider silk meets this criterion exceptionally well. It integrates smoothly with human tissues, minimizing immune response and promoting faster healing. Additionally, its natural elasticity helps the sutures adapt to bodily movements, reducing the risk of sutures rupturing under tension.",
                "Spider silk has been woven into advanced dressings for wounds that accelerate recovery. Spider silk's biocompatibility and ability to retain moisture make it ideal for treating chronic wounds and joint injuries. Spider silk-based bandages can also be infused with medications for localized drug delivery, reducing infection risk and improving treatment outcomes.",
                {"insert": "A", "t": "However, large-scale production is challenging. Spiders are territorial and cannibalistic, making farming them for silk impractical."},
                {"insert": "B", "t": "Scientists have turned to synthetic methods of producing spider silk using genetically modified bacteria and yeast, but scaling up these techniques remains difficult."},
                {"insert": "C", "t": "Researchers continue refining techniques to make spider silk more accessible."},
                {"insert": "D"},
            ],
            [
                mcq(101, 'The word "remarkable" in the passage is closest in meaning to', {"A": "mysterious", "B": "abundant", "C": "analyzed", "D": "extraordinary"}, "D"),
                mcq(
                    102,
                    "Identify the sentence in paragraph 2 that contains the definition of a term.",
                    {
                        "A": "Researchers have experimented with spider silk as a surgical suture material for use in stitching wounds, praising its strength and biocompatibility—a material's ability to interact with the human body without causing adverse reactions, such as inflammation or rejection.",
                        "B": "Spider silk meets this criterion exceptionally well.",
                        "C": "It integrates smoothly with human tissues, minimizing immune response and promoting faster healing.",
                        "D": "Additionally, its natural elasticity helps the sutures adapt to bodily movements, reducing the risk of sutures rupturing under tension.",
                    },
                    "A",
                ),
                mcq(103, "The passage indicates all of the following about spider silk-based sutures EXCEPT:", {"A": "They are less likely to cause inflammation.", "B": "They are easily incorporated into human tissues.", "C": "They are less expensive than traditional sutures.", "D": "They are less likely to fail when placed under stress."}, "C"),
                mcq(104, "All of the following are benefits of wound dressings made from spider silk EXCEPT:", {"A": "They speed up the recovery process.", "B": "They are simple to prepare and apply.", "C": "They do not dry out as quickly as other dressings.", "D": "They make localized drug delivery easy."}, "B"),
                insert_q(105, "By contrast, silkworms, traditionally used for obtaining silk, are domesticated and easy to manage.", "B"),
            ],
        )
    )
    tasks.append(
        academic(
            "Linguistic Structural Diversity",
            2,
            [
                "Linguistic typology investigates structural features across languages, revealing both universal patterns and language-specific variation. A central area of study is word order—the arrangement of subjects, verbs, and objects. English follows a subject-verb-object (SVO) pattern, while Japanese uses subject-object-verb (SOV). Most languages conform to a limited set of dominant word orders, which may reflect cognitive efficiency: Placing the subject first helps listeners quickly identify the sentence's main actor, aiding comprehension.",
                "Beyond syntax, languages differ in morphological complexity—the degree to which inflection (such as noun or verb endings) marks grammatical relationships. Turkish uses extensive inflection to express subtle distinctions, whereas Mandarin Chinese relies more on word order and context. These contrasts suggest that languages balance morphology and syntax based on communicative needs. Highly inflected languages can afford flexible word order because grammatical roles are marked morphologically. In contrast, languages with minimal inflection often depend on fixed word order to maintain clarity.",
                {"insert": "A", "t": "This trade-off reflects deeper functional pressures."},
                {"insert": "B", "t": "Languages evolve not randomly but in response to cognitive constraints and social factors, including contact with other languages and cultural shifts."},
                {"insert": "C", "t": "Studying this evolution helps linguists understand not only how languages differ but why certain grammatical strategies emerge and persist across communities."},
                {"insert": "D"},
            ],
            [
                mcq(106, "Which of the following is NOT mentioned in the passage as an aspect of the study of linguistic typology?", {"A": "It has revealed both diversity and universality among structural linguistic features.", "B": "It includes the study of word order as a means of aiding comprehension.", "C": "It identifies three basic structural patterns across all languages.", "D": "It examines differences in morphological complexity among languages."}, "C"),
                mcq(107, "Why does the author note that placing the subject first in a sentence aids comprehension?", {"A": "To provide an example of a structural feature that follows a universal pattern", "B": "To suggest that a larger set of available word orders increases cognitive efficiency", "C": "To help explain why there is only a small set of dominant word orders across languages", "D": "To suggest that languages that follow a different pattern are harder to learn"}, "C"),
                mcq(108, "What is suggested about the morphological complexity of Turkish?", {"A": "It is greater than the morphological complexity of Mandarin Chinese.", "B": "It is balanced by a relatively simple inflection system.", "C": "It developed independently of other elements of Turkish.", "D": "It requires Turkish to adhere to a relatively rigid word order."}, "A"),
                mcq(109, 'The word "pressures" in the passage is closest in meaning to', {"A": "difficulties", "B": "conflicts", "C": "features", "D": "influences"}, "D"),
                insert_q(110, "Such changes can alter the communicative priorities of a speech community, affecting which features are emphasized or simplified over time.", "C"),
            ],
        )
    )
    return {
        "id": "2025-09-05",
        "title": "新托福 9.05 · 阅读",
        "set": "9.05",
        "modules": [
            {"n": 1, "timeSec": 1680, "from": 1, "to": 70},
            {"n": 2, "timeSec": 1440, "from": 71, "to": 110},
        ],
        "tasks": tasks,
    }


def q4(qid, items):
    out = []
    for i, (stem, opts, ans) in enumerate(items):
        out.append(mcq(qid + i, stem, opts, ans))
    return out


def build_listening():
    talks = [
        (
            "Leonardo da Vinci's Mechanical Knight",
            1,
            "Listen to a talk in an art history class. Then answer the questions.",
            1,
            [
                ("What is the main purpose of the lecture?", {"A": "To review Leonardo da Vinci's most famous artistic works", "B": "To explain how early machines led to modern robotics", "C": "To highlight a lesser-known achievement of Leonardo da Vinci", "D": "To describe technological advances during the Renaissance"}, "C"),
                ("Why does the speaker mention Leonardo's fascination with the human body?", {"A": "To indicate his contributions to medical science", "B": "To point out a key influence on Leonardo's designs", "C": "To explain why he spent more time studying anatomy than engineering", "D": "To emphasize Leonardo's artistic skills"}, "B"),
                ("What does the speaker suggest about Leonardo's mechanical understanding?", {"A": "It depended on help from other scientists.", "B": "It was shown only in his sketches.", "C": "It was advanced for his time.", "D": "It relied mainly on trial and error."}, "C"),
                ('What attitude does the speaker express toward the reconstruction of "Leonardo\'s Robot"?', {"A": "He is relieved that some design flaws were corrected.", "B": "He is happy that Leonardo's sketches were published.", "C": "He is doubtful of the artistic value of the robot.", "D": "He is impressed by what the robot could do."}, "D"),
            ],
        ),
        (
            "Lewis Latimer: Inventor and Innovator",
            1,
            "Listen to a talk on a history podcast. Then answer the questions.",
            2,
            [
                ("What does the speaker say is a false belief about nineteenth-century inventors?", {"A": "That their inventions were available to the general public", "B": "That they were famous in their time", "C": "That they worked in laboratories", "D": "That they created their inventions alone"}, "D"),
                ("How did Lewis Latimer learn to be a drafter?", {"A": "By teaching himself", "B": "By studying with a tutor", "C": "By receiving help from an inventor", "D": "By going to a special school"}, "A"),
                ("Why does the speaker mention that Latimer was a poet?", {"A": "To point out why Hiram Maxim was impressed by Latimer at first", "B": "To help explain the beauty of Latimer's technical drawings", "C": "To introduce Latimer's collaborative project with a musician", "D": "To describe how Latimer's career changed after he worked as a drafter"}, "B"),
                ("What did Latimer achieve in his work with Hiram Maxim?", {"A": "Latimer helped make lightbulbs more available to the public.", "B": "Latimer invented a new way of producing electricity.", "C": "Latimer created a new drawing style that was useful for inventors.", "D": "Latimer made a drawing that helped convince the public of the usefulness of electric lighting."}, "A"),
            ],
        ),
        (
            "Kinetic Art: Motion and Visual Storytelling",
            1,
            "Listen to a talk on an art podcast. Then answer the questions.",
            3,
            [
                ("What is the main topic of the talk?", {"A": "The technical challenges faced by certain artists", "B": "The development and significance of a particular type of art", "C": "The influence of traditional art forms on modern artists", "D": "The popularity of kinetic art among contemporary patrons"}, "B"),
                ("According to the talk, what role did the Hungarian artist László Moholy-Nagy play in the development of kinetic art?", {"A": "He criticized the use of technology in art.", "B": "He advanced the idea of using movement and light in art.", "C": "He was the first to use air and wind to manipulate art.", "D": "He established the first kinetic art museum."}, "B"),
                ("What challenge is associated with kinetic art, as mentioned in the talk?", {"A": "It requires video monitors.", "B": "It can make it difficult for the audience to engage.", "C": "It can involve technical difficulties.", "D": "It is rarely displayed in major galleries."}, "C"),
                ('Why does the speaker describe kinetic art as "a multisensory experience"?', {"A": "To summarize the way kinetic art engages its viewers", "B": "To emphasize that kinetic art is hard to understand", "C": "To highlight an advantage of using video in kinetic art", "D": "To explain the technical requirements of kinetic art installations"}, "A"),
            ],
        ),
        (
            "Social Entrepreneurship",
            1,
            "Listen to a talk on a business podcast. Then answer the questions.",
            4,
            [
                ("What is the main topic of the talk?", {"A": "The impact of social change on new business owners", "B": "A comparison of traditional and modern business professionals", "C": "The evolution of entrepreneurship in the modern world", "D": "People who create businesses that address social problems"}, "D"),
                ("Why does the speaker mention traditional entrepreneurs?", {"A": "To help explain the origin of social entrepreneurship as a business concept", "B": "To suggest that some entrepreneurs have a more difficult time establishing a business than others", "C": "To describe the challenges facing individuals who want to impact society", "D": "To contrast their end goals with those of social entrepreneurs"}, "D"),
                ("Why does the speaker mention sectors such as poverty, health, and the environment?", {"A": "To highlight the areas where social needs are most pressing", "B": "To provide examples of problems that have been addressed through private investment", "C": "To list various challenges faced by traditional businesses", "D": "To suggest that social entrepreneurship is necessary for financial sustainability"}, "A"),
                ("What does the speaker suggest about the task of measuring social impact?", {"A": "It is often required to receive funding for a venture.", "B": "It is difficult to accomplish.", "C": "It can lead to controversial results.", "D": "It is only feasible for environmental endeavors."}, "B"),
            ],
        ),
        (
            "Renaissance Tapestries",
            1,
            "Listen to a talk in an art history class. Then answer the questions.",
            5,
            [
                ("Why does the speaker mention Renaissance paintings and sculptures?", {"A": "To contrast them with a less well-known art form from the same period", "B": "To provide examples of collaborative art forms", "C": "To highlight the religious nature of Renaissance art", "D": "To assert their superiority over other forms of Renaissance art"}, "A"),
                ("According to the talk, what was a key advantage of tapestries over frescoes?", {"A": "They were cheaper to produce.", "B": "They could be displayed in museums.", "C": "They were easier to transport.", "D": "They depicted more complex scenes."}, "C"),
                ("According to the speaker, what sometimes happened to tapestries while being transported from one location to another?", {"A": "They were used as insulation.", "B": "They were stolen.", "C": "They became damaged.", "D": "Their designs were copied by other artists."}, "C"),
                ("What can be inferred about the process of tapestry creation during the Renaissance?", {"A": "It required fewer resources than other art forms.", "B": "It involved a collaborative effort among several artisans.", "C": "It was mainly practiced in religious settings.", "D": "It was more popular than painting."}, "B"),
            ],
        ),
        (
            "Desertification and Its Impact",
            1,
            "Listen to a talk in a geography class. Then answer the questions.",
            6,
            [
                ("What is the main topic of the talk?", {"A": "The effects of excessive rainfall on local ecosystems", "B": "The benefits of sustainable agriculture", "C": "The phenomenon of desertification and its impact", "D": "Climate change and its effects on precipitation"}, "C"),
                ("What does the speaker say about intensive farming practices?", {"A": "They increase soil nutrients.", "B": "They can lead to soil erosion.", "C": "They are a solution to desertification.", "D": "They reduce the need for reforestation."}, "B"),
                ("Why does the speaker mention climate change?", {"A": "To explain its role in accelerating desertification", "B": "To discuss its impact on agricultural productivity", "C": "To highlight the benefits of rising temperatures", "D": "To describe changes in biodiversity"}, "A"),
                ("What can be concluded about the Great Green Wall project?", {"A": "It involves relocating endangered species.", "B": "It will increase agricultural output.", "C": "It is designed to help with reforestation.", "D": "It will increase the size of the African desert."}, "C"),
            ],
        ),
        (
            "Soil Casts and Ancient Agriculture",
            1,
            "Listen to a talk in an archaeology class. Then answer the questions.",
            7,
            [
                ("What is the main focus of the talk?", {"A": "Ways in which ancient peoples supplied nitrogen and moisture to their fields", "B": "Similarities between gardens of ancient Rome and Central America", "C": "A method for studying planting practices of ancient cultures", "D": "An example of how modern agriculture can learn to benefit from ancient knowledge"}, "C"),
                ("Why do researchers inject plaster into soil?", {"A": "To make the soil more stable", "B": "To protect plant roots in the soil", "C": "To replicate an ancient practice that existed in different parts of the world", "D": "To obtain casts that match decayed material in shape"}, "D"),
                ("What does the speaker say is a main feature of the agricultural system practiced in the Maya village in Central America?", {"A": "It takes advantage of plants that do not decay quickly.", "B": "It combines a variety of crops that support each other's growth.", "C": "It relies on a complex irrigation system.", "D": "It changes crops from year to year."}, "B"),
                ("What does the speaker imply about Roman garden designers?", {"A": "They tried to replicate nature.", "B": "They considered roses to be more beautiful than other flowers.", "C": "They valued both beauty and practicality.", "D": "They were interested in foreign plant species."}, "C"),
            ],
        ),
        (
            "Infant Language Learning and the Wug Test",
            2,
            "Listen to a talk in a linguistics class. Then answer the questions.",
            8,
            [
                ("What does the Wug Test show about young children?", {"A": "They can come up with new words.", "B": "Drawings can help them learn language.", "C": "They can remember new words for a long time.", "D": "They understand grammatical rules."}, "D"),
                ("What does the speaker emphasize about spoken language?", {"A": "It is easier to learn than written language.", "B": "It has some highly complex syllables.", "C": "It differs significantly between adults and children.", "D": "It does not clearly mark word boundaries."}, "D"),
                ("What did the head-turn preference experiment indicate about babies?", {"A": "They are very good at recognizing patterns.", "B": "They learn short words before learning longer words.", "C": "They understand some words by the time they are eight months old.", "D": "They benefit from pauses when working to understand language."}, "A"),
                ("What will the speaker discuss next?", {"A": "Ways to learn language effectively", "B": "Ways to improve attention and memory", "C": "Statistical information about different languages", "D": "Research on the connection between language learning and other mental skills"}, "D"),
            ],
        ),
        (
            "Keystone Species and Yellowstone Wolves",
            2,
            "Listen to a talk in a science podcast. Then answer the questions.",
            9,
            [
                ("Why does the speaker talk about arches in architecture?", {"A": "To point out a similarity to rock arches in nature", "B": "To help illustrate an important concept", "C": "To argue against a common comparison", "D": "To show a difference between life science and technology fields"}, "B"),
                ("According to the talk, what is a keystone species?", {"A": "A species that is necessary to maintain balance in an ecosystem", "B": "A species that has no predators within an ecosystem", "C": "A species that is too numerous for a healthy ecosystem", "D": "A species that is negatively affected by environmental changes"}, "A"),
                ("In the early 20th century, what happened to the wolves in Yellowstone National Park?", {"A": "Their population increased dramatically when their prey population increased.", "B": "They became a government-protected species.", "C": "They were eliminated over farming and safety concerns.", "D": "Their population decreased significantly because of disease."}, "C"),
                ("How did an increasing elk population affect the Yellowstone ecosystem?", {"A": "Many species were negatively affected due to the elks' diet.", "B": "Various animals that prey on elk were attracted to the area.", "C": "Some areas developed an overgrowth of plants while others had too little vegetation.", "D": "The population and range of the wolves also increased."}, "A"),
            ],
        ),
        (
            "Cubism and Its Influence",
            2,
            "Listen to a talk in an art history class. Then answer the questions.",
            10,
            [
                ("What is the main focus of the talk?", {"A": "The historical origins of Cubism", "B": "How Cubism changed the world of art", "C": "Some similarities between architecture and Cubist art", "D": "Some examples of Cubist paintings"}, "B"),
                ("Why does the speaker mention a coffee cup?", {"A": "To provide a visual example of Cubist techniques", "B": "To highlight the influence of coffee on European artists", "C": "To identify a painting on which two Cubist artists worked together", "D": "To identify a common subject in many Cubist paintings"}, "A"),
                ("What does the speaker say about the initial reception of Cubism?", {"A": "It quickly became popular among the general public.", "B": "It was not received well by some critics.", "C": "It became a topic in music and literature.", "D": "It was compared to another artistic style."}, "B"),
                ("Why does the speaker mention Modernism?", {"A": "To contrast its conceptual ideas with those of Cubism", "B": "To help students understand Cubists' goals", "C": "To emphasize how influential Cubism was", "D": "To highlight the variety of ways in which Cubist paintings can be understood"}, "C"),
            ],
        ),
        (
            "Isolation in Literary Characters",
            2,
            "Listen to a talk in a literature class. Then answer the questions.",
            11,
            [
                ("What aspect of isolation in literature does the speaker mainly discuss?", {"A": "How it impacts society at large", "B": "How it is represented through characters in novels", "C": "How it impacts readers' perceptions of work", "D": "Why it appears so frequently throughout different works"}, "B"),
                ("What does the speaker say about the creature in Frankenstein?", {"A": "He finds solace only in nature.", "B": "He is considered a tragic figure in literature.", "C": "He is an outcast because of his appearance.", "D": "He is a common subject in studies of isolation in literature."}, "C"),
                ("Why does the speaker mention Moby Dick?", {"A": "To illustrate how isolation can have tragic consequences in literature", "B": "To contrast different literary perspectives on isolation", "C": "To explain why authors may choose isolation as a theme", "D": "To provide an example of isolation presented through a character's thoughts"}, "A"),
                ("What does the speaker suggest about the character Jane Eyre?", {"A": "Jane does not recognize that she has been isolated.", "B": "Jane manages to make friends at boarding school.", "C": "Jane has chosen to isolate herself.", "D": "Jane uses isolation to her advantage."}, "D"),
            ],
        ),
        (
            "The Precautionary Principle",
            2,
            "Listen to a talk in an environmental science class. Then answer the questions.",
            12,
            [
                ("What is the talk mainly about?", {"A": "A method for gathering data to inform decision-making models", "B": "A guideline for making certain kinds of policy decisions", "C": "The unintended consequences of conservation projects", "D": "The importance of research in planning sensitive projects"}, "B"),
                ("What does the speaker say was the main concern with the proposed road project in Tanzania?", {"A": "Increased tourism traffic and pollution", "B": "Uncertainty surrounding the project's funding", "C": "The possibility of disrupting animal migrations", "D": "Opposition from local communities because of land disputes"}, "C"),
                ("According to the speaker, what does the precautionary principle emphasize?", {"A": "Waiting for scientific consensus before making a decision", "B": "Acting decisively as soon as it has been established that harm has occurred", "C": "Avoiding anything that risks serious harm even when the harm is not certain", "D": "Avoiding unnecessary development projects in protected areas"}, "C"),
                ("Why does the speaker mention asbestos?", {"A": "To consider a possible objection to the precautionary principle", "B": "To illustrate the consequences of not applying the precautionary principle", "C": "To describe a simpler version of the precautionary principle", "D": "To explain the origin of the term \"precautionary principle\""}, "B"),
            ],
        ),
        (
            "Soil Microorganisms and Restoration",
            2,
            "Listen to a talk in an environmental science class. Then answer the questions.",
            13,
            [
                ("What is the main purpose of the talk?", {"A": "To contrast two methods of farming", "B": "To describe a method for repairing damaged soil", "C": "To explain differences between several types of ecosystems", "D": "To discuss new research into microorganisms found in soil"}, "B"),
                ("What does the speaker point out about extracellular polymeric substances?", {"A": "They hold soil particles together.", "B": "They indicate that soil is degraded.", "C": "They are an important nutrient source for microbes.", "D": "They can replace chemical fertilizers under certain conditions."}, "A"),
                ("What is a reference site in the work that the speaker describes?", {"A": "A laboratory where microbes are grown.", "B": "A location where restoration efforts have previously failed.", "C": "A degraded area that is used for testing interventions.", "D": "A healthy ecosystem used as a model."}, "D"),
                ("What does the professor say about the California vineyard before the intervention?", {"A": "Its soil contained high numbers of bacteria.", "B": "Its vines were infected with harmful fungi.", "C": "It was surrounded by forested land.", "D": "Its soil was hard and dry."}, "D"),
            ],
        ),
    ]
    tasks = []
    qid = 1
    for title, module, instruction, form, items in talks:
        tasks.append(lecture(title, module, instruction, form, q4(qid, items)))
        qid += 4
    if qid != 53:
        raise SystemExit("expected 52 listening items, next id %s" % qid)
    return {
        "id": "2025-09-05",
        "title": "新托福 9.05 · 听力",
        "set": "9.05",
        "skill": "listening",
        "modules": [
            {"n": 1, "timeSec": 1500, "from": 1, "to": 28},
            {"n": 2, "timeSec": 1200, "from": 29, "to": 52},
        ],
        "tasks": tasks,
    }


def email(eid, module, prompt, bullets, to, subject, sample):
    return {
        "type": "email",
        "module": module,
        "id": eid,
        "instruction": "Write an email. In your email, do the following:",
        "prompt": prompt,
        "bullets": bullets,
        "to": to,
        "subject": subject,
        "sampleSubject": subject,
        "sample": sample,
    }


def discussion(did, module, klass, instruction, professor, posts, samples):
    return {
        "type": "discussion",
        "module": module,
        "id": did,
        "instruction": instruction,
        "class": klass,
        "professor": professor,
        "posts": posts,
        "samples": samples,
    }


def person(name, photo, text):
    return {"name": name, "photo": IMG + photo, "text": text}


DISC_INSTR = (
    "Your professor is teaching a class. Write a post responding to the professor's question.\n"
    "In your response, you should do the following:\n"
    "• Express and support your personal opinion.\n"
    "• Make a contribution to the discussion in your own words.\n"
    "An effective response will contain at least 100 words."
)

def build_writing():
    return {
        "id": "2025-09-05",
        "title": "新托福 9.05 · 写作",
        "set": "9.05",
        "skill": "writing",
        "modules": [
            {"n": 1, "timeSec": 1680, "from": 1, "to": 4, "label": "Email"},
            {"n": 2, "timeSec": 2400, "from": 5, "to": 8, "label": "Academic Discussion"},
        ],
        "tasks": [
            email(
                1,
                1,
                "You are a student who works in the Office of Admissions and have noticed that the office printer frequently malfunctions. You want to report this problem to the university's IT department and suggest a solution.",
                [
                    "Describe the issues you are experiencing with the printer.",
                    "Explain how these issues are affecting your work.",
                    "Suggest a possible solution to the problem.",
                ],
                "Mr. Evans",
                "Printer Malfunction Issues",
                "Dear Mr. Evans,\n\nI am writing to report recurring problems with the printer in the Office of Admissions. It frequently jams when we print several documents, and some pages come out with faded text. Restarting it helps briefly, but the same problems soon return.\n\nThese interruptions make it difficult to prepare application materials on time. We often have to check every page and print missing sections again, which delays other tasks and wastes paper. It is especially inconvenient when several staff members need the printer at once.\n\nCould an IT technician inspect the machine and check whether it needs maintenance or replacement parts? In the meantime, access to another nearby printer would help us keep working. I can provide examples of the damaged pages or demonstrate the problem at a convenient time.\n\nThank you for your help.\n\nBest regards,\n[Your Name]",
            ),
            email(
                2,
                1,
                "You recently visited a popular tourist destination called Sunny Beach Resort. While the experience was partially enjoyable, you noticed that some aspects of the resort are environmentally harmful. You want to suggest some improvements to the resort manager, Mr. Collins.",
                [
                    "Describe what you enjoyed about your stay at the resort.",
                    "Explain your concerns about the resort's environmental impact.",
                    "Suggest some measures that could be implemented to make the resort more environmentally friendly.",
                ],
                "Mr. Collins",
                "Suggestions for eco-friendly practices at the resort",
                "Dear Mr. Collins,\n\nI enjoyed the quiet beach, the helpful activity staff, and the shaded walking paths during my stay at Sunny Beach Resort. The locally prepared breakfast and the easy access to the water were also highlights.\n\nI was concerned, however, by the amount of single-use plastic at drink stations and the daily replacement of towels even when guests left them hanging. Outdoor lights remained on after sunrise, and several garden sprinklers were operating during the hottest part of the afternoon. These practices appear to waste materials, energy, and water.\n\nThe resort could install refill stations and provide reusable cups with a deposit, while keeping disposable items available only when necessary. Housekeeping should follow a clear towel-reuse signal, and guests could choose less frequent linen changes. Timers and light sensors would reduce unnecessary electricity, while early-morning irrigation and routine leak checks would conserve water. Publishing simple progress measures could also encourage staff and guests to participate.\n\nKind regards,\n[Your Name]",
            ),
            email(
                3,
                1,
                "You have booked a flight with Skyline Airlines for your upcoming study abroad trip. Unfortunately, you have received an email notifying you that your flight has been canceled due to unforeseen circumstances. You need to make alternative travel arrangements as soon as possible.",
                [
                    "Explain the issue with your canceled flight.",
                    "Describe how this cancellation affects your travel plans.",
                    "Ask for assistance in booking another flight or provide alternative solutions.",
                ],
                "Ms. Turner",
                "Inquiry Regarding Canceled Flight and Alternative Arrangements",
                "Dear Ms. Turner,\n\nI am contacting you about the cancellation of my Skyline Airlines flight for an upcoming study abroad trip. I received the cancellation notice, but I have not yet received information about an alternative booking.\n\nThe change affects more than my flight. I need to arrive in time to settle into my accommodation and attend the university's introductory activities. A lengthy delay could also mean changing the transportation I planned to take from the airport.\n\nCould you help me find another flight that arrives as close as possible to my original schedule? I would consider a connecting flight or a nearby airport if that would allow me to arrive sooner. Please also let me know whether there would be any additional charges and what information you need to arrange the change.\n\nThank you for your assistance. I would appreciate an update when possible.\n\nKind regards,\n[Your Name]",
            ),
            email(
                4,
                1,
                "You are a student who missed an important lecture in your biology class. You need to catch up on the material and want to ask a classmate, Maria, for her notes and any key information you missed. You also want to thank her in advance for her help.",
                [
                    "Explain why you did not attend the lecture.",
                    "Request her help and ask her if she has time available to help you catch up.",
                    "Thank her in advance for her assistance.",
                ],
                "Maria",
                "Request for Lecture Notes",
                "Hi Maria,\n\nI missed yesterday's biology lecture because I developed a fever in the morning and did not want to attend class while ill. I have checked the course page, but the posted slides contain only diagrams and brief headings, so I am not sure what explanations I missed.\n\nWould you be willing to share your notes and help me identify the main points? If you have time, could we meet for twenty minutes after Thursday's class or have a short video call that evening? I would especially like to know which examples the professor emphasized and whether any assignment instructions or examination topics were announced. I will review the slides and textbook section before we meet so that I can ask focused questions.\n\nThank you in advance for helping me catch up. I can scan and return any handwritten notes immediately, or you can send photographs if that is easier. I really appreciate your time.\n\nBest,\n[Your Name]",
            ),
            discussion(
                5,
                2,
                "Class Discussion",
                DISC_INSTR,
                person(
                    "Professor Diaz",
                    "diaz.png",
                    "We often hear about environmental problems like air pollution from factories, plastic waste in oceans, and forests being cut down for agriculture. People are trying different solutions: switching from coal and oil to solar and wind energy, teaching communities about recycling and conservation, or developing new technologies to clean contaminated water and soil. Which of these approaches do you think would produce the fastest, most measurable improvements to environmental problems? Why?",
                ),
                [
                    person("Paul", "andrew.png", "I believe that switching from coal and oil to solar and wind energy sources would produce the fastest environmental improvements. Power plants that burn coal create most of the air pollution and carbon emissions that cause climate change, so replacing them with clean energy would immediately reduce harmful gases entering the atmosphere and improve air quality in cities."),
                    person("Kelly", "kelly.png", "In my opinion, teaching communities about recycling, conservation, and environmental protection produces the most lasting improvements. When people understand how their daily choices affect air and water quality, they change their purchasing habits, support environmental policies, and teach these practices to their children, creating long-term behavioral changes across entire communities."),
                ],
                [
                    {"title": "Clean Energy Transition", "text": "Switching electricity generation toward solar and wind would produce the fastest measurable environmental improvement because energy systems operate continuously and can be monitored directly. When cleaner generation replaces fuel-based power, changes in emissions, fuel use, and local air pollutants can be measured at the facility and across the grid. The effect also extends to other sectors as transportation and buildings use more electricity. Speed depends on implementation, so governments and utilities should first replace the least efficient sources, improve transmission, and add storage or flexible demand where needed. Workers and communities tied to existing facilities require transition planning rather than abrupt closure without support. Education and cleanup technology remain valuable, but education may take years to change behavior and cleanup addresses damage after it occurs. Energy transition reduces a major source at the point of production and creates data that can be tracked month by month. That combination of scale, direct causation, and measurable performance makes it the strongest route to rapid improvement."},
                    {"title": "Community Education", "text": "Community education can produce the fastest practical improvement because many environmental losses result from repeated local decisions that can change immediately. A program connected to actual services can show residents exactly how to separate waste, reduce contamination in recycling, conserve water, and report illegal dumping. The results are measurable through cleaner collection streams, lower water use, and participation rates, rather than vague awareness surveys. Education is most effective when it removes uncertainty and inconvenience at the same time. Demonstrations should occur where people use the system, instructions should be available in relevant languages, and bins or collection schedules must match the message. Participants can then share the routine within households, schools, and workplaces. Large energy projects may deliver greater total reduction, but planning and construction can take substantial time. Community behavior can begin changing this week and can also build public support for those larger investments. When education is tied to accessible infrastructure and visible feedback, it creates rapid gains while establishing habits that continue."},
                ],
            ),
            discussion(
                6,
                2,
                "Class Discussion",
                DISC_INSTR,
                person(
                    "Professor Dr. Gupta",
                    "diaz.png",
                    "Next week, we will discuss the influence of public art on community identity. Public art, such as murals and sculptures, can enrich a community's cultural landscape and contribute to a sense of shared identity. Do you think public art plays a significant role in shaping community identity? Why or why not?",
                ),
                [
                    person("Claire", "kelly.png", "Public art plays a significant role in shaping community identity. It reflects the values and culture of the community, promotes local artists, and provides a sense of pride and unity among residents."),
                    person("Paul", "andrew.png", "While public art can enhance a community's aesthetic appeal, its role in shaping community identity may be limited. Other factors, such as social programs and community events, have a more substantial impact on fostering a shared identity."),
                ],
                [
                    {"title": "Visible Shared Identity", "text": "Public art can shape community identity because it gives shared memories and values a visible place in everyday life. A mural about a neighborhood's migration history, for example, allows residents to encounter that story while walking to school or work rather than only inside a museum. Its influence becomes stronger when local people help choose the subject and contribute ideas to the design. That process requires them to discuss which experiences represent the community and which voices have been overlooked. The finished work then carries meaning created by residents themselves, not merely decoration selected by an outside sponsor. Public art can also become a meeting point for tours, celebrations, and conversations across generations. Of course, one sculpture cannot solve social divisions. Nevertheless, repeated encounters with an image that residents recognize as their own can strengthen attachment to a place. When creation is participatory and the work reflects local experience, public art turns identity into something people can see, debate, and share."},
                    {"title": "Programs Before Installations", "text": "Public art may enrich a neighborhood, but lasting community identity is shaped more by repeated social participation. Residents develop a sense of belonging when they rely on one another, solve practical problems, and build routines together. Imagine an attractive sculpture placed in a square where few local activities occur. People may admire it briefly without forming any new relationship. By contrast, a weekly market, youth sports program, or neighborhood emergency team creates regular contact among people who might otherwise remain strangers. Through cooperation, they learn who contributes, which traditions matter, and how disagreements can be managed. Those experiences produce trust and shared expectations, which are central parts of collective identity. Funding also matters: an expensive installation can create resentment if residents would rather improve a library or community center. Art works best as a record or celebration of relationships that already exist. Therefore, communities should first invest in inclusive programs and events; public art can then express the identity those continuing interactions have actually built."},
                ],
            ),
            discussion(
                7,
                2,
                "Class Discussion",
                DISC_INSTR,
                person(
                    "Dr. Gupta",
                    "diaz.png",
                    "Today we'll discuss the dynamic role of art in society. Clearly, art can be a powerful form of expression and communication that can challenge societal norms and help society progress. On the other hand, some people believe that art primarily serves as a way to preserve both the history and heritage of a people, a country, or even a civilization. Which do you believe plays a larger role in the significance of art in society? Why?",
                ),
                [
                    person("Kelly", "kelly.png", "I think that art can challenge societal norms by presenting alternative perspectives to conventional thinking. For instance, abstract art often provokes critical thinking about established norms and deeply held beliefs. In doing so, it encourages audiences to open their minds to new possibilities and to effect change."),
                    person("Andrew", "andrew.png", "I believe that art's role in preserving heritage is its most important role. As the world becomes more globalized, different cultures are losing their identities because they have been forced to adapt to the modern world. The arts have the power to prevent languages from being lost, can preserve important cultural traditions, and remind us of what makes us unique."),
                ],
                [
                    {"title": "Challenging Familiar Problems", "text": "Art's greater social significance lies in its ability to make familiar problems feel newly visible. People may understand an issue in the abstract without considering how it affects someone else's daily life. A play about an inaccessible workplace, for example, can show the frustration of a qualified applicant whose opportunities are limited by the building rather than by ability. Following that person's experience gives the audience a concrete reason to question arrangements they previously accepted. This extends Kelly's point: art need not simply present an unusual perspective; it can create a shared starting point for difficult conversations. Schools or community groups could discuss the performance and consider practical changes in their own surroundings. Art cannot replace policy or direct action, but it can influence which experiences receive attention and whose voices are taken seriously. Preserving the past is valuable, yet helping people reconsider the present gives art a particularly active role in society."},
                    {"title": "Preserving Heritage", "text": "Preserving cultural heritage is art's more lasting contribution because it allows experiences to remain accessible after the people who lived them are gone. Historical descriptions can record what happened, but songs, stories, and images also preserve how people understood their lives. Consider a family that no longer speaks its grandparents' language fluently. Performing a traditional song together can create a reason to learn unfamiliar words, ask about their meanings, and hear stories connected with them. The artwork becomes a practical link between generations rather than an object stored away for display. This develops Andrew's argument by showing that preservation requires participation, not simply keeping old materials. A community can also adapt a performance to new circumstances while retaining its distinctive language or themes. Art certainly challenges established ideas, but those challenges often respond to immediate concerns. Its capacity to carry memory across generations gives it a broader and more durable social significance."},
                ],
            ),
            discussion(
                8,
                2,
                "Class Discussion",
                DISC_INSTR,
                person(
                    "Dr. Gupta",
                    "diaz.png",
                    "In this class, we are discussing how social media affects personal communication. It helps people stay connected across distance and meet others with shared interests. However, some people believe online contact replaces deeper conversation and face-to-face interaction. Overall, has social media strengthened or weakened personal communication? Explain your reasoning.",
                ),
                [
                    person("Kelly", "kelly.png", "I think it has strengthened communication. People can easily maintain relationships with relatives or friends who live far away. Messages, photos, and group chats help them stay involved in one another's lives. Social media also helps users form new friendships around shared interests."),
                    person("Andrew", "andrew.png", "I think it has weakened communication. Quick comments and emojis often replace thoughtful conversations. Online messages also lack tone of voice and facial expressions, which makes misunderstandings more likely. Although people may communicate more often, those interactions are not always meaningful or supportive."),
                ],
                [
                    {"title": "Sustained Distant Contact", "text": "Social media has strengthened personal communication because it makes small but meaningful exchanges easier to sustain. Close relationships do not depend only on occasional long conversations; they also grow through ordinary updates that show continued interest. When a student moves away from home, sending a photograph of a newly cooked meal can prompt a parent to share advice or ask how the week is going. Without an easy channel for that small exchange, neither person might arrange a formal call. Kelly emphasizes maintaining distant relationships, and this everyday continuity helps explain why that benefit matters. Online contact can also lead to deeper interaction: a brief message about a difficult day may become a private conversation or an invitation to meet. Andrew is right that emojis alone offer limited support. However, that limitation concerns how the medium is used. When people treat short exchanges as openings for attention and conversation, social media helps relationships remain active."},
                    {"title": "Visible Activity Without Attention", "text": "Overall, social media has weakened personal communication by encouraging people to confuse visible activity with genuine attention. A person can respond to many posts in a few minutes while understanding very little about how any particular friend is doing. This creates a problem that goes beyond the missing facial expressions Andrew mentions: the interaction may end before someone has explained what actually matters. For example, a student who posts about feeling overwhelmed might receive many reassuring reactions but no specific offer to help. Friends may assume they have already provided support and never ask a follow-up question. The student has received responses without receiving much understanding. Distance is a real obstacle, and online platforms can help overcome it, as Kelly argues. Nevertheless, convenience becomes less valuable when it encourages shallow substitutes for listening. Strong communication requires sustained attention, clarification, and an appropriate response. A system that repeatedly interrupts those processes can increase contact while weakening the relationships that contact is meant to support."},
                ],
            ),
        ],
    }


REPEAT = {
    1: {
        "instruction": "You are working at a school as part of an internship. Your supervisor is training you to help students prepare for their science project presentations. Listen to the supervisor and repeat what the supervisor says. Repeat only once.",
        "lines": [
            "Start by setting up the projector screen.",
            "Use the white board to highlight key points.",
            "Arrange your project materials neatly on the tables.",
            "Check all the equipment to ensure it works properly.",
            "Make sure your computer is set up with your presentation.",
            "It's a good idea to practice delivering your speech in front of some friends.",
            "Take time to review your notes thoroughly so you'll feel confident and prepared.",
        ],
    },
    2: {
        "instruction": "You are being trained to assist in a campus coffee shop. Your supervisor will teach you how to explain key features of the coffee shop to customers. Listen to your supervisor and repeat what the supervisor says. Repeat only once.",
        "lines": [
            "We serve coffee and tea at the main counter.",
            "Our pastries are all made fresh daily.",
            "The menu board lists drinks that include a range of herbal teas.",
            "Milk, cream and sugar are available at the station.",
            "Dispose of trash and recyclables in the bins near the door.",
            "Some tables in the seating area offer excellent views of campus.",
            "Free Wi-Fi is available for campus visitors as well as students.",
        ],
    },
    3: {
        "instruction": "You are working in a maritime museum as part of an internship. Your manager is training you to be a tour guide at the museum. Listen to the manager and repeat what the manager says. Repeat only once.",
        "lines": [
            "This area shows early sailing ships.",
            "Some older style boats used steam for power.",
            "These very accurate ship models show how designs have changed.",
            "Before satellites, these tools helped sailors navigate oceans.",
            "Let me explain how trade routes shaped global shipping over time.",
            "Feel free to ask questions if you want to know more about anything you've seen.",
            "For non-fiction books and novels about ships, be sure to visit the gift shop.",
        ],
    },
    4: {
        "instruction": "You are working at a museum near campus. Your manager is teaching you how to assist visitors at the museum. Listen to the manager and repeat what the manager says. Repeat only once.",
        "lines": [
            "Ancient artifacts are in the first section.",
            "Modern art is displayed in this location.",
            "Our learning labs are known to be engaging for all ages.",
            "Visit the cafe for tasty refreshments during your tour.",
            "The gift shop has unique souvenirs for affordable prices.",
            "Guided tours are only available by reservation each weekend.",
            "If you are interested in special events, check the map for more details.",
        ],
    },
    5: {
        "instruction": "You are working at a university's computer lab. Your manager is training you to assist new students. Listen to the manager and repeat what the manager says. Repeat only once.",
        "lines": [
            "Use your e-mail address to log in.",
            "You can print all your documents here.",
            "You can also access the scanners in this corner free of charge.",
            "Visit the help desk to solve any technical problems.",
            "Check to make sure the Wi-Fi connection is stable and secure.",
            "Remember to save your work frequently to avoid data loss or corruption.",
            "If you are unsure when the lab is open, you can check the weekly schedule here.",
        ],
    },
}

INTERVIEW = {
    1: {
        "instruction": "You have volunteered for a research study at your university about hobbies. You will have a short online interview with a researcher. The researcher will ask you some questions.",
        "items": [
            ("Do you have a hobby or interest that you regularly spend time doing?", "Certainly. For example, my hobby is landscape photography, which I engage in every weekend. I find it rewarding to explore parks and nature reserves, capturing the changing seasons and lighting conditions. This activity not only allows me to connect with the outdoors but helps me develop technical skills in using my camera and editing software. Over time, I've built a small portfolio of images that I share with friends and family, and it serves as a creative outlet that balances my academic studies. The process of planning shoots and reviewing photos has become a relaxing routine that I look forward to regularly."),
            ("If you were to select a new hobby, what would you choose and why?", "If I were to pick up a new hobby, I'd choose urban sketching. The main reason is that it combines creativity with exploration. For example, I enjoy discovering new places in my city, and sketching would allow me to capture those moments in a personal, artistic way. It's also a relaxing activity that doesn't require expensive equipment—just a sketchbook and a pen. Plus, it encourages me to slow down and observe details I might otherwise miss in my daily routine. This hobby would help me unwind while fostering a deeper connection to my surroundings."),
            ("Now tell me what might prevent you from starting this new pastime.", "There are a few key factors that could hinder me from beginning this new hobby. For example, first, time constraints are a major barrier; as a university student, my schedule is packed with classes, assignments, and part-time work, leaving little room for additional activities. Second, financial considerations might pose a challenge, especially if the hobby requires expensive equipment or materials, which could strain my budget. Lastly, a lack of initial motivation or support from peers could make it difficult to stay committed, as starting something new often feels daunting without encouragement."),
            ("Some people believe it is better to have one interest outside of work or school that you dedicate yourself to rather than multiple smaller ones. What do you think about that, and why?", "I believe dedicating oneself to a single primary interest outside of work or school is more beneficial than spreading efforts across multiple smaller ones. Focusing deeply on one hobby allows for mastery and meaningful progress, which can be more satisfying. For example, if someone commits to learning a musical instrument, they can develop advanced skills over time, leading to a sense of accomplishment and stress relief. In contrast, juggling many interests might result in superficial engagement without real depth. This concentrated approach also helps build discipline and can enhance personal growth, making it a more rewarding choice overall."),
        ],
    },
    2: {
        "instruction": "You have agreed to participate in a research study about people's experiences with learning new hobbies. You will have a short online interview with a researcher. The researcher will ask you some questions.",
        "items": [
            ("What hobbies do your friends or family have? Why do you think they enjoy doing them?", "My mother enjoys gardening, while one of my closest friends spends weekends cycling. They like these hobbies for different reasons. Gardening gives my mother a quiet routine and the satisfaction of watching something grow over time. Cycling, by contrast, helps my friend stay active and explore places outside the city. Both activities also provide a break from screens and work-related pressure. I think that balance is what makes a hobby sustainable: it should feel personally rewarding while offering a clear change from a person's normal responsibilities."),
            ("If your school or workplace were to organize after-work hobby clubs, which club do you think would interest the most people?", "I think a casual photography club would interest the most people because almost everyone already has a phone camera, so joining would require little money or previous training. For example, the club could organize short walks around campus, teach simple techniques, and let members discuss a few pictures afterward. That format would suit both beginners and experienced photographers. It would also be social without demanding constant conversation, which can make new members more comfortable. Low costs, flexible attendance, and visible results would attract a broad group and keep people involved."),
            ("Do you think hobbies should mostly be relaxing, or is it better if they're challenging? Why?", "I think a good hobby should be enjoyable first but include a manageable challenge. If it is completely effortless, people may become bored and stop improving. On the other hand, if every session feels like a test, the hobby simply creates more stress. When I learned basic cooking, familiar recipes helped me relax, while trying one new technique each week kept the activity interesting. That balance gave me progress without pressure. In my view, the best challenge is optional and gradual, so people remain curious instead of feeling judged by the result."),
            ("How important do you think it is for people to keep exploring new hobbies as they grow older? Why?", "It is quite important because new hobbies prevent adult life from becoming limited to work and routine. Learning something unfamiliar exercises patience and reminds people that they can still improve. It can also create new social connections, especially after someone moves, retires, or changes jobs. For instance, a community language class could introduce an older adult to both a useful skill and a new group of friends. People do not need to collect hobbies constantly, but remaining open to one new activity can support confidence, curiosity, and emotional well-being."),
        ],
    },
    3: {
        "instruction": "A researcher is studying people's views on art and self-expression. The researcher will ask you some questions about artistic activities.",
        "items": [
            ("Do you engage in any artistic activities such as painting or playing music regularly? If so, what do you do? If not, which artistic activity would you like to try if you had the chance?", "I regularly do digital drawing. I began by sketching simple objects on a tablet, but now I often create small illustrations of places I visit. The activity is relaxing because it makes me slow down and notice details such as light, color, and proportion. I usually draw for thirty minutes on weekends, so it fits my schedule without becoming another obligation. I am not a professional artist, but seeing gradual improvement keeps me motivated and gives me a personal record of experiences that photographs do not capture in the same way."),
            ("What kind of art or music do you enjoy the most, and how do you typically experience it through creation or appreciation?", "I enjoy photography most, mainly through appreciation but sometimes through creation. I like photographs that document ordinary city life because they can reveal emotion in a scene people usually ignore. I follow several photographers online and visit small exhibitions when I can. I also use my phone to photograph markets, streets, and public transportation. Comparing my pictures with professional work teaches me how framing and timing shape a story. Photography is appealing because it is accessible, yet producing a truly thoughtful image still requires patience and judgment."),
            ("If you were creating art or music, would you prefer sharing your work publicly or keeping it private? What influences your decision?", "I would share selected work publicly but keep early experiments private. Thoughtful feedback can help me notice weaknesses that I cannot see on my own, and sharing a finished piece may also connect me with people who have similar interests. However, not every sketch or recording represents an idea I am ready to explain. I would first show new work to a few trusted friends, revise it, and then decide whether a wider audience would benefit from seeing it. The main factors are quality, privacy, and the purpose of the work."),
            ("Some people think art and music can be powerful ways to communicate emotions and ideas that are difficult to express with words. Do you agree or disagree? Why?", "I agree because art can communicate through mood, image, and rhythm before an audience has to define the feeling in words. For example, a quiet melody may suggest loneliness and hope at the same time, while a photograph can show tension between two people without explaining their history. Different viewers may interpret the work differently, but that ambiguity is often useful rather than confusing. It invites people to reflect on their own experiences. Words remain important, yet art can start an emotional conversation when direct language feels too limited or uncomfortable."),
        ],
    },
    4: {
        "instruction": "You are participating in a study at your university about renewable energy sources. The researcher will ask you some questions concerning your opinions on renewable energy and its implementation.",
        "items": [
            ("How important is the issue of renewable energy, such as wind and solar power, to you personally? Why would you say you feel that way?", "Renewable energy is very important to me because energy choices affect both the climate and everyday living costs. I don't expect one technology to replace every other source immediately, but wind and solar power can reduce pollution without consuming fuel each time electricity is produced. For example, this matters personally because my city often has poor air quality in winter. I also like that homes and schools can generate some of their own power. The transition requires investment and better storage, but I believe developing cleaner sources now will create healthier and more stable communities in the future."),
            ("Describe a time when you or someone you know tried to reduce energy use. What actions were taken, and what made it easy or difficult?", "Last winter, my family tried to reduce electricity use after our monthly bill increased. For example, we replaced several old light bulbs with LEDs, unplugged chargers when they were not needed, and used the washing machine only with full loads. The easiest change was turning off lights because everyone could see the result immediately. The hardest part was reducing heating, since the weather was unusually cold. We solved that by sealing gaps around one window and wearing warmer clothes indoors. Our next bill was lower, and the experience showed us that several small habits can make a noticeable difference."),
            ("In your daily life, have you noticed any renewable energy initiatives in your community? If yes, what have you seen, and how do they impact your area? If not, what's an initiative that might be beneficial for your community?", "I have noticed solar panels on several newer apartment buildings and on the roof of a local school. The school uses a display near the entrance to show how much electricity the panels produce, which makes the project educational as well as practical. For example, these installations probably don't supply all the buildings' energy, but they reduce demand from the regular grid during sunny hours. They also make renewable energy feel visible and realistic to residents. I think the next useful step would be adding panels to public parking areas, where they could produce electricity while providing shade for cars."),
            ("Many believe transitioning to renewable energy is crucial for environmental sustainability, while others worry about the costs involved. Do you think the benefits of renewable energy outweigh the drawbacks? Why or why not?", "Yes, I think the long-term benefits of renewable energy outweigh the drawbacks. Building solar farms, wind turbines, and improved power grids can be expensive at first, and some projects require careful planning to protect wildlife and local communities. However, fossil-fuel pollution also creates enormous health and environmental costs that continue every year. Renewable systems use resources that don't run out and usually become cheaper after the initial investment. Governments should support workers and regions affected by the transition, but delaying change would be more costly. With responsible planning, cleaner air and a more stable energy supply justify the short-term difficulties."),
        ],
    },
    5: {
        "instruction": "You have volunteered for a research study at your university about cultural festivals. You will have a short online interview with a researcher. The researcher will ask you some questions.",
        "items": [
            ("Have you ever been to a cultural festival? Or would you like to go to one? Why?", "I attended a local Chinese New Year festival last year, and it was an enriching experience. The vibrant dragon dances and traditional music performances captivated me, while the variety of authentic Chinese cuisine offered a delightful taste of the culture. I particularly enjoyed making dumplings with a volunteer and learning why families associate them with good fortune. Such festivals provide a valuable opportunity to immerse oneself in different traditions, fostering cross-cultural understanding and appreciation. For example, I'd definitely recommend attending one to anyone interested in exploring diverse heritages. That active participation makes the tradition easier to remember."),
            ("If you were to go to a cultural festival, what would you like to see or do there?", "If I were to attend a cultural festival, I'd focus on exploring traditional crafts and culinary experiences. For example, I'd visit artisan booths to observe skilled craftspeople demonstrating techniques like pottery or weaving, as these hands-on activities offer deep insights into a culture's heritage. Engaging in interactive workshops, such as learning a folk dance or trying a craft myself, would make the experience more immersive. This approach allows me to appreciate the festival not just as a spectator but as an active participant, gaining a richer understanding of the culture through its tangible and sensory elements."),
            ("If you were to participate in a cultural festival for your own culture, what would you want to share with other people and why?", "If I were to participate in a cultural festival representing my own culture, I'd focus on sharing traditional tea ceremonies. For example, this practice embodies core values of harmony, respect, and mindfulness that are central to our cultural identity. By demonstrating the precise steps of preparing and serving tea, I could illustrate how everyday rituals foster connection and tranquility. Also, I'd explain the historical significance of tea in our society, highlighting its role in social gatherings and philosophical discussions. Sharing this would allow others to experience a tangible aspect of our heritage while promoting cross-cultural appreciation through a simple, yet profound, activity."),
            ("Some people think cultural festivals are mainly just for fun, while others think they serve an important purpose, like helping to keep traditions alive. What do you think?", "Cultural festivals are far more than just entertainment; they play a crucial role in preserving traditions and fostering community identity. While they offer fun and enjoyment, their deeper purpose lies in passing down customs, language, and values to younger generations. For example, festivals like Diwali or Thanksgiving involve rituals and stories that connect people to their heritage, reinforcing a sense of belonging. Also, these events promote cultural exchange and understanding among diverse groups, which is vital in our globalized world. Thus, I view cultural festivals as essential for maintaining cultural continuity and social cohesion, making them both enjoyable and meaningful."),
        ],
    },
    6: {
        "instruction": "As a part of a university project, you have agreed to take part in a short research interview about public transportation. A graduate student conducting the research will ask you some questions online.",
        "items": [
            ("How often do you use public transportation, like buses or trains? Give details to explain your answer.", "I use public transportation about three times a week, primarily for commuting to university. For example, I take the bus every Monday, Wednesday, and Friday because it's convenient and cost-effective. The bus stop is just a five-minute walk from my apartment, and the fare is much cheaper than driving or using ride-sharing services. Also, using public transport allows me to read or study during the commute, which I find very productive. Overall, it fits well into my routine. Checking the timetable first prevents most avoidable delays."),
            ("Can you describe any benefits or disadvantages you might experience from using public transportation?", "Using public transportation offers several benefits, such as reducing traffic congestion and lowering carbon emissions, which helps the environment. For example, it's also cost-effective since you save on gas and parking fees. However, there are disadvantages, like less flexibility in scheduling and potential delays. Crowded conditions can be uncomfortable, and routes may not always be convenient. Overall, the benefits often outweigh the drawbacks for many people. The main tradeoff is convenience versus control over the schedule."),
            ("Would you consider moving in order to have better access to public transportation? Why or why not?", "Absolutely, I'd consider moving for better access to public transportation. For example, currently, I live in a suburban area with limited bus routes, which makes commuting time-consuming and stressful. Relocating to a neighborhood with frequent subway and bus services would significantly reduce my travel time to work and university, allowing me to be more productive. Also, it would lower my carbon footprint, as I could rely less on my car. While moving involves costs and adjustments, the long-term benefits of convenience, efficiency, and environmental impact make it a worthwhile decision for me."),
            ("Some people believe that cities should invest more in public transportation, to reduce traffic congestion, commuting time and pollution. Do you agree or disagree with this idea? Why?", "Yes, I agree with that view. Expanding bus and rail networks reduces traffic congestion by providing efficient alternatives to driving. For example, dedicated bus lanes can move more people per hour than private cars, cutting commute times significantly. Second, improved public transit lowers pollution by decreasing the number of vehicles on the road. Electric buses and trains produce fewer emissions, leading to cleaner air. Although initial costs are high, long-term benefits like reduced healthcare expenses and increased productivity make it worthwhile. Therefore, such investment is essential for sustainable urban development."),
        ],
    },
    7: {
        "instruction": "You have signed up for a study run by a university research group that is investigating people's experiences with books and reading. You will have a short online interview with a researcher. The researcher will ask you some questions.",
        "items": [
            ("Was there a time in your life when you read more or less than you do now? What changed?", "Absolutely. During my college years, I read significantly more than I do now. Back then, I was immersed in academic texts and novels for literature courses, often reading several books a week. For example, now I read less frequently, mostly opting for shorter articles or audiobooks during commutes. What changed was the shift from structured academic demands to a more fast-paced lifestyle, where finding time for deep reading became a challenge. Despite this, I still cherish the occasional novel on weekends to unwind and stay connected to the joy of reading."),
            ("In your opinion, is reading for pleasure a popular way people spend their free time where you live? Why do you think that is?", "In my community, reading for pleasure is indeed a fairly popular leisure activity, especially among young adults and professionals. I believe this is primarily due to the widespread availability of digital reading platforms, such as e-books and audiobooks, which make it convenient to access a vast range of materials anytime, anywhere. Also, with increasing awareness of mental well-being, many people turn to reading as a way to relax and escape daily stress. For example, local libraries and book clubs also foster a culture of reading by organizing events and discussions, encouraging social interaction around books."),
            ("Do you think reading different types of books helps people understand each other and get along better? Why or why not?", "I believe reading diverse books significantly enhances mutual understanding and social harmony. For example, when we immerse ourselves in narratives from various cultures, perspectives, or genres, we gain insights into others' lives, emotions, and challenges. Fiction can foster empathy by allowing readers to step into characters' shoes, while non-fiction provides factual knowledge about different societies. This broadened awareness helps reduce prejudices and encourages more compassionate interactions in daily life. Thus, by exposing ourselves to a wide range of books, we cultivate a deeper appreciation for diversity, which is essential for building stronger, more cohesive communities."),
            ("Looking ahead, some people believe that future generations will read less than today's generation. Do you agree or disagree? Why?", "I disagree with the idea that future generations will read less. For example, while digital distractions are prevalent, technology also offers new ways to engage with reading, such as e-books and audiobooks, which can make literature more accessible. Also, educational systems increasingly emphasize literacy skills, and many young people use online platforms to discuss books, fostering a culture of reading. Therefore, I think reading will evolve rather than decline, adapting to modern lifestyles while maintaining its importance for knowledge and entertainment."),
        ],
    },
}


def build_speaking(paper_id, title, form_repeat, form_interview):
    tasks = []
    modules = []
    n = 1
    if form_repeat:
        r = REPEAT[form_repeat]
        modules.append({"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"})
        for i, line in enumerate(r["lines"], 1):
            tasks.append(
                {
                    "type": "repeat",
                    "module": 1,
                    "id": n,
                    "speakSec": 18 if i == 7 else 15,
                    "instruction": r["instruction"],
                    "audio": AUDIO + "speaking_listen_repeat_form%02d_q%02d.mp3" % (form_repeat, i),
                    "sample": line,
                }
            )
            n += 1
    iv = INTERVIEW[form_interview]
    mod = 2 if form_repeat else 1
    start = n
    modules.append({"n": mod, "timeSec": 360, "from": start, "to": start + 3, "label": "Take an Interview"})
    for i, (stem, sample) in enumerate(iv["items"], 1):
        tasks.append(
            {
                "type": "interview",
                "module": mod,
                "id": n,
                "speakSec": 45,
                "instruction": iv["instruction"],
                "stem": stem,
                "audio": AUDIO + "speaking_take_interview_form%02d_q%02d.mp3" % (form_interview, i),
                "sample": sample,
            }
        )
        n += 1
    return {
        "id": paper_id,
        "title": title,
        "set": "9.05",
        "skill": "speaking",
        "modules": modules,
        "tasks": tasks,
    }


if __name__ == "__main__":
    dump("2025-09-05-reading.json", build_reading())
    dump("2025-09-05-listening.json", build_listening())
    dump("2025-09-05-writing.json", build_writing())
    dump("2025-09-05-speaking.json", build_speaking("2025-09-05", "新托福 9.05 · 口语 Form 1", 1, 1))
    dump("2025-09-05-speaking-f2.json", build_speaking("2025-09-05-s2", "新托福 9.05 · 口语 Form 2", 2, 2))
    dump("2025-09-05-speaking-f3.json", build_speaking("2025-09-05-s3", "新托福 9.05 · 口语 Form 3", 3, 3))
    dump("2025-09-05-speaking-f4.json", build_speaking("2025-09-05-s4", "新托福 9.05 · 口语 Form 4", 4, 4))
    dump("2025-09-05-speaking-f5.json", build_speaking("2025-09-05-s5", "新托福 9.05 · 口语 Form 5", 5, 5))
    dump("2025-09-05-speaking-f6.json", build_speaking("2025-09-05-s6", "新托福 9.05 · 口语 Form 6 面试", None, 6))
    dump("2025-09-05-speaking-f7.json", build_speaking("2025-09-05-s7", "新托福 9.05 · 口语 Form 7 面试", None, 7))
