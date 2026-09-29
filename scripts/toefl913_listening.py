#!/usr/bin/env python3
"""9.13 China Offline TOEFL listening. Source: listening-01.png … listening-15.png."""

AUDIO = "library/toefl/audio/2025-09-13/"
INSTR = {
    1: "Listen to a talk on a physics podcast. Then answer the questions.",
    2: "Listen to a talk in an art history class. Then answer the questions.",
    3: "Listen to a talk on a science podcast. Then answer the questions.",
    4: "Listen to a talk in an art history class. Then answer the questions.",
    5: "Listen to a talk in a psychology class. Then answer the questions.",
    6: "Listen to a talk in an art history class. Then answer the questions.",
    7: "Listen to a talk in a biology class. Then answer the questions.",
    8: "Listen to a talk on a music podcast. Then answer the questions.",
    9: "Listen to a talk in an archaeology class. Then answer the questions.",
    10: "Listen to a talk in a business class. Then answer the questions.",
    11: "Listen to a talk in a literature class. Then answer the questions.",
    12: "Listen to a talk on a history podcast. Then answer the questions.",
    13: "Listen to a talk in a biology class. Then answer the questions.",
    14: "Listen to a talk in an art history class. Then answer the questions.",
}
INSTR_ANN = "Listen to an announcement in a university dormitory. Then answer the questions."


def mcq(qid, stem, options, answer):
    return {"id": qid, "stem": stem, "options": options, "answer": answer}


def q4(qid, items):
    return [mcq(qid + i, stem, opts, ans) for i, (stem, opts, ans) in enumerate(items)]


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


def announcement(title, module, instruction, questions):
    return {
        "type": "announcement",
        "module": module,
        "title": title,
        "instruction": instruction,
        "audio": AUDIO + "listening_form15_q01_q02_announcement.mp3",
        "questions": questions,
    }


def build_listening():
    talks = [
        (
            "Why Ice Floats",
            1,
            1,
            [
                (
                    "What is the talk mainly about?",
                    {
                        "A": "The structure of some molecules",
                        "B": "The causes and consequences of a natural phenomenon",
                        "C": "A survival strategy of animals in winter",
                        "D": "A common result of climate change",
                    },
                    "B",
                ),
                (
                    "What difference between water and most other substances does the speaker discuss?",
                    {
                        "A": "Scientists understand the structure of water molecules well.",
                        "B": "Water requires a lot of heat to change its temperature.",
                        "C": "Water expands when it changes from liquid to solid.",
                        "D": "Liquid water reflects a lot of sunlight.",
                    },
                    "C",
                ),
                (
                    "Why does the speaker mention aquatic life?",
                    {
                        "A": "To emphasize a difference between lakes where ice forms and lakes where it does not.",
                        "B": "To explain the importance of the insulating effect of ice at the top of bodies of water.",
                        "C": "To provide an example of a harmful effect of warming water temperatures.",
                        "D": "To identify a curiosity that has puzzled scientists for centuries.",
                    },
                    "B",
                ),
                (
                    "What difference between liquid water and ice does the speaker discuss at the end of the talk?",
                    {
                        "A": "Ice temperatures change more quickly.",
                        "B": "Ice can absorb more energy.",
                        "C": "Ice is easier to see from space.",
                        "D": "Ice reflects more light.",
                    },
                    "D",
                ),
            ],
        ),
        (
            "Leonardo da Vinci's Mechanical Knight",
            1,
            2,
            [
                (
                    "What is the main purpose of the lecture?",
                    {
                        "A": "To review Leonardo da Vinci's most famous artistic works",
                        "B": "To explain how early machines led to modern robotics",
                        "C": "To highlight a lesser-known achievement of Leonardo da Vinci",
                        "D": "To describe technological advances during the Renaissance",
                    },
                    "C",
                ),
                (
                    "Why does the speaker mention Leonardo's fascination with the human body?",
                    {
                        "A": "To indicate his contributions to medical science",
                        "B": "To point out a key influence on Leonardo's designs",
                        "C": "To explain why he spent more time studying anatomy than engineering",
                        "D": "To emphasize Leonardo's artistic skills",
                    },
                    "B",
                ),
                (
                    "What does the speaker suggest about Leonardo's mechanical understanding?",
                    {
                        "A": "It depended on help from other scientists.",
                        "B": "It was shown only in his sketches.",
                        "C": "It was advanced for his time.",
                        "D": "It relied mainly on trial and error.",
                    },
                    "C",
                ),
                (
                    'What attitude does the speaker express toward the reconstruction of "Leonardo\'s Robot"?',
                    {
                        "A": "He is relieved that some design flaws were corrected.",
                        "B": "He is happy that Leonardo's sketches were published.",
                        "C": "He is doubtful of the artistic value of the robot.",
                        "D": "He is impressed by what the robot could do.",
                    },
                    "D",
                ),
            ],
        ),
        (
            "Bird Migration",
            1,
            3,
            [
                (
                    "What is the main topic of the talk?",
                    {
                        "A": "The impact of light pollution on different bird species",
                        "B": "A comparison of navigational cues used by migratory birds",
                        "C": "The impact of climate change on bird habitats",
                        "D": "Bird migration and its associated challenges",
                    },
                    "D",
                ),
                (
                    "How does a special protein in the eyes of some birds help them navigate?",
                    {
                        "A": "It helps them determine the position of the stars.",
                        "B": "It helps them look toward the Sun without injury.",
                        "C": "It helps them see Earth's magnetic field.",
                        "D": "It helps them sleep with their eyes open.",
                    },
                    "C",
                ),
                (
                    "What does the speaker warn may cause imbalances in food webs?",
                    {
                        "A": "A decrease in the population of migrating birds",
                        "B": "Slight changes in the migratory paths of birds",
                        "C": "Increases in the distances traveled by migrating birds",
                        "D": "Decreases in the population of pests along migratory paths",
                    },
                    "A",
                ),
                (
                    "According to the speaker, what is a measure people can take to protect migrating birds?",
                    {
                        "A": "Producing fewer carbon emissions during the migration season",
                        "B": "Turning off unnecessary lights at night",
                        "C": "Making food available to migrating birds",
                        "D": "Offering shelter to migrating birds during harsh weather",
                    },
                    "B",
                ),
            ],
        ),
        (
            "Cubism",
            1,
            4,
            [
                (
                    "What is the main focus of the talk?",
                    {
                        "A": "The historical origins of Cubism",
                        "B": "How Cubism changed the world of art",
                        "C": "Some similarities between architecture and Cubist art",
                        "D": "Some examples of Cubist paintings",
                    },
                    "B",
                ),
                (
                    "Why does the speaker mention a coffee cup?",
                    {
                        "A": "To provide a visual example of Cubist techniques",
                        "B": "To highlight the influence of coffee on European artists",
                        "C": "To identify a painting on which two Cubist artists worked together",
                        "D": "To identify a common subject in many Cubist paintings",
                    },
                    "A",
                ),
                (
                    "What does the speaker say about the initial reception of Cubism?",
                    {
                        "A": "It quickly became popular among the general public.",
                        "B": "It was not received well by some critics.",
                        "C": "It became a topic in music and literature.",
                        "D": "It was compared to another artistic style.",
                    },
                    "B",
                ),
                (
                    "Why does the speaker mention Modernism?",
                    {
                        "A": "To contrast its conceptual ideas with those of Cubism",
                        "B": "To help students understand Cubists' goals",
                        "C": "To emphasize how influential Cubism was",
                        "D": "To highlight the variety of ways in which Cubist paintings can be understood",
                    },
                    "C",
                ),
            ],
        ),
        (
            "The Psychology of Flow",
            1,
            5,
            [
                (
                    "What is the main topic of the talk?",
                    {
                        "A": "The benefits of achieving flow",
                        "B": "The role of feedback in flow",
                        "C": "The challenges of finding flow-inducing activities",
                        "D": "The concept and characteristics of flow",
                    },
                    "D",
                ),
                (
                    "Why does the speaker mention athletes and artists?",
                    {
                        "A": "To explain the role of feedback in achieving flow",
                        "B": "To suggest that not everyone can achieve flow",
                        "C": "To highlight the connection of flow to success",
                        "D": "To provide examples of individuals who often experience flow",
                    },
                    "D",
                ),
                (
                    "What does the speaker say about people who regularly experience flow?",
                    {
                        "A": "They often work in jobs that include easy tasks.",
                        "B": "They enjoy a variety of activities.",
                        "C": "They are often happier and more fulfilled.",
                        "D": "They earn more money than people who do not experience flow.",
                    },
                    "C",
                ),
                (
                    "What does the speaker say is a challenge to achieving flow?",
                    {
                        "A": "Finding individuals to provide feedback",
                        "B": "Identifying activities that are a proper match with skill level",
                        "C": "Avoiding boredom when a task becomes too easy",
                        "D": "Working on multiple things at the same time",
                    },
                    "B",
                ),
            ],
        ),
        (
            "Renaissance Tapestry Weaving",
            1,
            6,
            [
                (
                    "Why does the speaker mention Renaissance paintings and sculptures?",
                    {
                        "A": "To contrast them with a less well-known art form from the same period",
                        "B": "To provide examples of collaborative art forms",
                        "C": "To highlight the religious nature of Renaissance art",
                        "D": "To assert their superiority over other forms of Renaissance art",
                    },
                    "A",
                ),
                (
                    "According to the talk, what was a key advantage of tapestries over frescoes?",
                    {
                        "A": "They were cheaper to produce.",
                        "B": "They could be displayed in museums.",
                        "C": "They were easier to transport.",
                        "D": "They depicted more complex scenes.",
                    },
                    "C",
                ),
                (
                    "According to the speaker, what sometimes happened to tapestries while being transported from one location to another?",
                    {
                        "A": "They were used as insulation.",
                        "B": "They were stolen.",
                        "C": "They became damaged.",
                        "D": "Their designs were copied by other artists.",
                    },
                    "C",
                ),
                (
                    "What can be inferred about the process of tapestry creation during the Renaissance?",
                    {
                        "A": "It required fewer resources than other art forms.",
                        "B": "It involved a collaborative effort among several artisans.",
                        "C": "It was mainly practiced in religious settings.",
                        "D": "It was more popular than painting.",
                    },
                    "B",
                ),
            ],
        ),
        (
            "Dynamic Mimicry",
            1,
            7,
            [
                (
                    "What is the main topic of the talk?",
                    {
                        "A": "The ways that a sea creature changes its appearance",
                        "B": "The ways that predators react to surprising behaviors",
                        "C": "The ways that different animals capture prey",
                        "D": "The ways that different species use dynamic mimicry",
                    },
                    "A",
                ),
                (
                    "Why does the speaker discuss the owl butterfly?",
                    {
                        "A": "To point out a limitation of dynamic mimicry",
                        "B": "To highlight a hunting technique used by owls",
                        "C": "To distinguish between two kinds of mimicry",
                        "D": "To explain how mimicry can confuse experienced researchers",
                    },
                    "C",
                ),
                (
                    "What does the speaker say is a limitation of changing shape?",
                    {
                        "A": "It sometimes does not result in the intended shape.",
                        "B": "It is not enough by itself to protect an animal from a predator.",
                        "C": "It requires a significant amount of time.",
                        "D": "It can quickly make muscles become tired.",
                    },
                    "B",
                ),
                (
                    "Why does the speaker mention balloons?",
                    {
                        "A": "To describe the pattern on a butterfly's wing",
                        "B": "To show how camera equipment was raised and lowered",
                        "C": "To explain how certain cells function in the mimic octopus",
                        "D": "To emphasize how flexible the flatfish's muscles are",
                    },
                    "C",
                ),
            ],
        ),
        (
            "Music and Eating",
            1,
            8,
            [
                (
                    "What does the speaker imply about the tempo of music during meals?",
                    {
                        "A": "The tempo should be adjusted with the type of food being eaten.",
                        "B": "More research is needed on the effects of the tempo on digestion.",
                        "C": "Fast music can improve taste perception.",
                        "D": "Eating with slow music is better for health than eating with fast music.",
                    },
                    "D",
                ),
                (
                    "What does the speaker say about the pitch of music?",
                    {
                        "A": "The pitch can be used to emphasize specific aspects of the taste of food.",
                        "B": "The perception of the pitch can be affected by the type of food being eaten.",
                        "C": "Higher-pitched music can cause people to eat more quickly.",
                        "D": "Doctors recommend listening to high-pitched music while eating.",
                    },
                    "A",
                ),
                (
                    "What is a criticism of using music to influence food perception?",
                    {
                        "A": "It can reduce the quality of the dining experience.",
                        "B": "It can increase the cost of dining.",
                        "C": "It can have unpredictable results because of varying individual tastes.",
                        "D": "It can reduce people's ability to judge food accurately.",
                    },
                    "D",
                ),
                (
                    "What caused the increase of diners' ratings of some food at the restaurant mentioned by the speaker?",
                    {
                        "A": "Playing popular music",
                        "B": "A decrease in music volume",
                        "C": "Ocean sounds",
                        "D": "A change in the food's taste",
                    },
                    "C",
                ),
            ],
        ),
        (
            "Underwater Archaeology",
            2,
            9,
            [
                (
                    "What is the talk mainly about?",
                    {
                        "A": "An archaeological subfield",
                        "B": "Artifacts found from Ancient Rome and Ancient Greece",
                        "C": "The challenges of excavating Roman ruins",
                        "D": "Preservation techniques for artifacts",
                    },
                    "A",
                ),
                (
                    "What point does the speaker emphasize about the archaeological site at Ephesus?",
                    {
                        "A": "It is located in present-day Greece.",
                        "B": "Its artifacts are mostly pottery and jewelry.",
                        "C": "It was partly conducted using underwater archaeology.",
                        "D": "It contains artifacts from different civilizations.",
                    },
                    "D",
                ),
                (
                    "What does the speaker say about wood and textiles?",
                    {
                        "A": "They don't deteriorate as quickly when submerged in water.",
                        "B": "They are difficult to recover.",
                        "C": "They were carried on ships from Europe to Africa.",
                        "D": "They are more commonly found at Roman sites than Greek sites.",
                    },
                    "A",
                ),
                (
                    "What did archaeologists learn from studying the Uluburun shipwreck?",
                    {
                        "A": "Information about Greek boatbuilding techniques",
                        "B": "Information about ancient excavation methods",
                        "C": "Information about ancient trading",
                        "D": "Information about the evolution of jewelry making",
                    },
                    "C",
                ),
            ],
        ),
        (
            "Organizational Agility",
            2,
            10,
            [
                (
                    "What does the speaker say about a streaming media company?",
                    {
                        "A": "It did not perform as well as expected.",
                        "B": "It did not hire many employees.",
                        "C": "It advertised its products online.",
                        "D": "It achieved success by changing what it offered.",
                    },
                    "D",
                ),
                (
                    "What does the speaker say about a clothing retailer?",
                    {
                        "A": "It hired a celebrity to help design its products.",
                        "B": "It made several risky decisions.",
                        "C": "Its supply chain adapts to new fashions quickly.",
                        "D": "Its stores are spread across a wide variety of locations.",
                    },
                    "C",
                ),
                (
                    "What agile practice adopted by an industrial firm does the speaker mention?",
                    {
                        "A": "Designing buildings that could serve many different functions",
                        "B": "Changing strategic goals based on new research",
                        "C": "Quickly responding to customer concerns",
                        "D": "Having people from different departments work together",
                    },
                    "D",
                ),
                (
                    "How did the industrial firm's employees react to the introduction of agile practices?",
                    {
                        "A": "They opposed the loss of familiar roles.",
                        "B": "They began to work harder.",
                        "C": "They resisted rigid hierarchies.",
                        "D": "They were enthusiastic about new training opportunities.",
                    },
                    "A",
                ),
            ],
        ),
        (
            "Isolation in Literature",
            2,
            11,
            [
                (
                    "What aspect of isolation in literature does the speaker mainly discuss?",
                    {
                        "A": "How it impacts society at large",
                        "B": "How it is represented through characters in novels",
                        "C": "How it impacts readers' perceptions of a work",
                        "D": "Why it appears so frequently throughout different works",
                    },
                    "B",
                ),
                (
                    "What does the speaker say about the creature in Frankenstein?",
                    {
                        "A": "He finds solace only in nature.",
                        "B": "He is considered a tragic figure in literature.",
                        "C": "He is an outcast because of his appearance.",
                        "D": "He is a common subject in studies of isolation in literature.",
                    },
                    "C",
                ),
                (
                    "Why does the speaker mention Moby Dick?",
                    {
                        "A": "To illustrate how isolation can have tragic consequences in literature",
                        "B": "To contrast different literary perspectives on isolation",
                        "C": "To explain why authors may choose isolation as a theme",
                        "D": "To provide an example of isolation presented through a character's thoughts",
                    },
                    "A",
                ),
                (
                    "What does the speaker suggest about the character Jane Eyre?",
                    {
                        "A": "Jane does not recognize that she has been isolated.",
                        "B": "Jane manages to make friends at boarding school.",
                        "C": "Jane has chosen to isolate herself.",
                        "D": "Jane uses isolation to her advantage.",
                    },
                    "D",
                ),
            ],
        ),
        (
            "Roman Urban Planning",
            2,
            12,
            [
                (
                    "What is the main topic of the talk?",
                    {
                        "A": "The engineering marvels of the Roman Empire",
                        "B": "The social life of Roman citizens",
                        "C": "The urban planning of Roman cities",
                        "D": "The influence of Roman culture on modern life",
                    },
                    "C",
                ),
                (
                    "What can be inferred about cities before the Roman Empire?",
                    {
                        "A": "Their buildings were not constructed with durable stone walls.",
                        "B": "Their streets were difficult to navigate.",
                        "C": "Their residential quarters were kept in areas outside the forum.",
                        "D": "Their marketplaces were usually in the center of the city.",
                    },
                    "B",
                ),
                (
                    "According to the speaker, what was a drawback of Roman urban planning?",
                    {
                        "A": "The lack of public gathering places",
                        "B": "The inadequacy of zoning practices",
                        "C": "The overcrowding in less wealthy districts",
                        "D": "The high costs of planning and construction",
                    },
                    "C",
                ),
                (
                    "Why does the speaker mention modern city designs?",
                    {
                        "A": "To indicate that Roman principles are still relevant today",
                        "B": "To contrast the visual style of modern and ancient Roman cities",
                        "C": "To highlight the differences in how cities are designed to function",
                        "D": "To criticize the complexity of contemporary urban planning",
                    },
                    "A",
                ),
            ],
        ),
        (
            "Blue-Ringed Octopus and Tetrodotoxin",
            2,
            13,
            [
                (
                    "What similarity between the horseshoe crab and the blue-ringed octopus does the speaker point out?",
                    {
                        "A": "Both produce compounds with medical uses.",
                        "B": "Both depend on bacteria to survive.",
                        "C": "They have nervous systems.",
                        "D": "They exhibit similar survival behaviors.",
                    },
                    "A",
                ),
                (
                    "What does the speaker explain by mentioning sodium channels in nerve cells?",
                    {
                        "A": "How the blood of the blue-ringed octopus is adapted to the animal's environment",
                        "B": "How a venom works",
                        "C": "How bacterial contamination can affect some products",
                        "D": "How the blue-ringed octopus moves",
                    },
                    "B",
                ),
                (
                    "How does the venom of the blue-ringed octopus affect its prey?",
                    {
                        "A": "It causes the prey to lose blood.",
                        "B": "It makes the prey confused.",
                        "C": "It prevents the prey from feeling pain.",
                        "D": "It makes the prey unable to move.",
                    },
                    "D",
                ),
                (
                    "Why does the speaker discuss spiders?",
                    {
                        "A": "To contrast neurotoxic venoms with other types of venoms",
                        "B": "To point out another example of protection from one's own venom",
                        "C": "To clarify how electrical signals travel across nerve cells",
                        "D": "To identify a discovery that was made by accident",
                    },
                    "B",
                ),
            ],
        ),
        (
            "Jacob Lawrence and the Migration Series",
            2,
            14,
            [
                (
                    "What about Jacob Lawrence does the speaker mainly discuss?",
                    {
                        "A": "The difficulties he faced during the Great Migration",
                        "B": "A series of paintings that is representative of his work",
                        "C": "How he was influenced by other African American painters",
                        "D": "How his style changed during his career",
                    },
                    "B",
                ),
                (
                    "What is the speaker's attitude toward The Migration Series?",
                    {
                        "A": "Disappointed that it is not widely known today",
                        "B": "Confused about the purpose of including many panels",
                        "C": "Impressed by this accomplishment early in Lawrence's career",
                        "D": "Surprised by the information that Lawrence provided in the captions",
                    },
                    "C",
                ),
                (
                    "Why does the speaker mention Harriet Tubman?",
                    {
                        "A": "To describe a method that Lawrence used to paint human figures",
                        "B": "To emphasize Lawrence's involvement in social activism",
                        "C": "To introduce a point about African Americans in Northern cities",
                        "D": "To provide an example of an important African American figure that Lawrence painted",
                    },
                    "D",
                ),
                (
                    "What does the speaker imply about Jacob Lawrence's critics?",
                    {
                        "A": "They thought a child had painted some of his artworks.",
                        "B": "They believed that The Migration Series was his best work.",
                        "C": "They did not value work that seemed less artistically advanced.",
                        "D": "They did not appreciate his earliest paintings as much as his later ones.",
                    },
                    "C",
                ),
            ],
        ),
    ]
    tasks = []
    qid = 1
    for title, module, form, items in talks:
        tasks.append(lecture(title, module, INSTR[form], form, q4(qid, items)))
        qid += 4
    tasks.append(
        announcement(
            "Dormitory Quiet Hours and Laundry",
            2,
            INSTR_ANN,
            q4(
                qid,
                [
                    (
                        "What does the speaker imply about quiet hours?",
                        {
                            "A": "They change depending on the day of the week.",
                            "B": "They were recently adjusted based on students' feedback.",
                            "C": "Not all residents have been mindful of them.",
                            "D": "Not everyone should be expected to know about them.",
                        },
                        "C",
                    ),
                    (
                        "What can be inferred about the laundry facilities in the dormitory?",
                        {
                            "A": "The machines have been broken by objects in students' clothes.",
                            "B": "The machines are available for use between eleven p.m. and eight a.m.",
                            "C": "Students have complained about the machines' noise.",
                            "D": "Students rarely have trouble finding a free machine.",
                        },
                        "A",
                    ),
                ],
            ),
        )
    )
    qid += 2
    if qid != 59:
        raise SystemExit("expected 58 listening items, next id %s" % qid)
    return {
        "id": "2025-09-13",
        "title": "新托福 9.13 · 听力",
        "set": "9.13",
        "skill": "listening",
        "modules": [
            {"n": 1, "timeSec": 1500, "from": 1, "to": 32},
            {"n": 2, "timeSec": 1320, "from": 33, "to": 58},
        ],
        "tasks": tasks,
    }


if __name__ == "__main__":
    paper = build_listening()
    n_items = sum(len(t["questions"]) for t in paper["tasks"])
    print("tasks", len(paper["tasks"]), "items", n_items)
