#!/usr/bin/env python3
"""TOEFL 9.13 China Offline speaking. PNG OCR only. python3 extract_speaking.py"""

AUDIO = "library/toefl/audio/2025-09-13/"

REPEAT = {
    1: {
        "instruction": (
            "You are volunteering at a community nature center near campus. "
            "The leader is training you to help beginners learn the basics of birdwatching. "
            "Listen to the leader and repeat what the leader says. Repeat only once."
        ),
        "lines": [
            "Look towards the treetops where you can find nests.",
            "Note details to help identify the bird.",
            "Keep a record of each sighting to share later with the group.",
            "Use proper footwear to keep from slipping while exploring outdoors.",
            "Keep your head covered to protect yourself from the sun on the walk.",
            "When getting ready for a day out be sure to pack essentials to be prepared.",
            "If you spot a bird nearby, avoid sudden movements so it does not fly away.",
        ],
    },
    2: {
        "instruction": (
            "You are volunteering at a community center near campus. "
            "The leader is showing you how to help school children learn how to make a salad. "
            "Listen to the leader and repeat what the leader says. Repeat only once."
        ),
        "lines": [
            "Begin by washing the vegetables.",
            "Carefully chop the salad ingredients.",
            "Collect the chopped vegetables and place them together.",
            "Slowly add the dressing so the salad does not get soggy.",
            "Toss everything together thoroughly so the flavors are mixed.",
            "Put any leftovers in a food container and place in the fridge for later.",
            "When you have finished, be sure to clean up so the kitchen stays neat and clean.",
        ],
    },
    3: {
        "instruction": (
            "You are volunteering at a community cooking class near campus. "
            "The instructor is showing you how to guide beginners in baking a loaf of bread. "
            "Listen to the instructor and repeat what the instructor says. Repeat only once."
        ),
        "lines": [
            "Measure carefully before starting to mix.",
            "Add yeast to a small amount of warm water.",
            "Stir the wet and dry ingredients into a soft dough.",
            "Press and fold repeatedly until the texture feels elastic.",
            "Let the dough rest in a warm place until it doubles in size.",
            "After the loaf rises, bake until the top is browned and the center is firm.",
            "When the bread is done, place it on a raised stand so airflow beneath can cool it down.",
        ],
    },
    4: {
        "instruction": (
            "You are working in the University Library. "
            "Your manager is teaching you how to assist visitors at the library. "
            "Listen to the manager and repeat what the manager says. Repeat only once."
        ),
        "lines": [
            "The library books are located here.",
            "Study rooms can be reserved for group work.",
            "Our computer lab has workstations with internet access.",
            "Seek help at the reference desk for any research assistance.",
            "Find tasty refreshments and healthy snacks at the basement cafe.",
            "For your convenience, we have a map with a list of sections and resources.",
            "If you have general or specific questions, our staff are here to meet your needs.",
        ],
    },
}

INTERVIEW = {
    1: {
        "instruction": (
            "You have signed up for a study run by a university research group that is investigating "
            "public parks and recreation. You will have a short video interview with one of the researchers. "
            "The researcher will ask you some questions."
        ),
        "items": [
            (
                "Thank you for participating in this study. Today, I'd like to ask you some questions about public parks and recreational spaces. First, can you tell me about a memorable visit you or a friend made to a park or recreational space? What made it so memorable?",
                "A memorable visit was a picnic I had with two friends at a riverside park last spring. We had all been busy, so we wanted somewhere we could talk without rushing. We walked along the water, found a quiet patch of grass, and shared food we had brought from home. What made it special was how relaxed the afternoon felt. We were not following a schedule or checking which attraction to see next. We simply had time to catch up properly, and I remember leaving with the feeling that we had really spent the day together.",
            ),
            (
                "I see. Do you think public parks and recreational spaces are more important for adults or for children? Why?",
                "I think parks are especially important for children because they provide room to explore and play outside their usual routines. A child can try climbing, run around, or join a game without needing much equipment. Those activities also create small opportunities to learn how to share space and agree on rules with other children. Adults certainly benefit from parks, but they usually have more freedom to choose where they exercise or spend time with friends. Children depend more on places that are close to home and easy for a parent to supervise, which makes a neighborhood park particularly valuable.",
            ),
            (
                "Interesting. Some people believe that public parks play a crucial role in promoting community health and well-being by offering outdoor areas for relaxing, exercising, or playing. Therefore, local government should spend more money on such places. What are your thoughts on this? Do you agree or disagree? Why?",
                "I agree that local governments should invest more in parks, particularly where residents have few outdoor spaces nearby. A useful park does not have to be elaborate. Safe paths, some shade, and places to sit can make it easier for people to take a short walk during an ordinary day. That matters because an activity is more likely to become a habit when it fits easily into someone's routine. I would also reserve money for maintenance. A new park that is poorly cared for may be less useful than a modest existing space with reliable lighting and clean facilities.",
            ),
            (
                "Finally, in many large cities, there is a tension between building more public parks for residents to relax and play versus using the space to build more housing. Do you think the need for more housing is less important than the need for public parks and recreational spaces? Why?",
                "I would not say housing is less important than parks, especially in a city where people struggle to find a suitable place to live. Housing provides something that residents need every day, so a serious shortage deserves attention. However, I do not think every available site should become a building. A dense neighborhood still needs places where people can spend time outdoors. I would support adding housing while protecting a reasonable amount of shared green space nearby. That approach recognizes the immediate need for homes without making the neighborhood less pleasant for the people who will live there.",
            ),
        ],
    },
    2: {
        "instruction": (
            "You are participating in a research study conducted by your university's Department of "
            "Environmental Science about environmental practices. You will meet online with a researcher "
            "who will ask you some questions."
        ),
        "items": [
            (
                "Thank you for agreeing to participate. I'd like to ask you some questions about your environmental practices. First, do you take any specific actions to reduce your environmental impact, such as recycling or conserving energy? Give details in your answer.",
                "I try to reduce waste through a few habits that are easy to maintain. I carry a reusable bottle to class and keep a shopping bag in my backpack, so I do not have to remember it each time I go out. I also separate recyclable packaging at home after checking the local instructions. None of these actions is complicated, which is important for me. If a habit requires a lot of extra effort, I am less likely to keep doing it during a busy week. Making these choices part of my normal routine helps me stay consistent.",
            ),
            (
                "Thank you. Can you describe one or two steps your community or neighborhood takes to be environmentally friendly? For example, are there solar panels on buildings or rainwater barrels available where you live?",
                "My neighborhood has separate collection bins for different kinds of waste, with signs showing what belongs in each one. That makes recycling much easier because residents do not have to guess where to put an unfamiliar item. There is also a small area where people can leave usable household objects for others to take. I like that idea because something one person no longer needs can still be useful to someone else. These measures are quite simple, but they make environmentally friendly choices more convenient and give residents a clear way to participate in everyday community life.",
            ),
            (
                "Interesting, if you had the chance to participate in an ecological or nature-based activity, such as a community cleanup effort or tree planting event, what would you do, and why?",
                "I would choose a community cleanup because I could see the result of the work immediately. I would like to help clear litter from a walking path or a small public space that people use regularly. Working with other volunteers would also give me a chance to meet neighbors I normally only pass on the street. I would prefer an organized activity with clear instructions about handling waste safely and separating recyclable materials. That way, I could contribute even without special knowledge, and the group would leave the area in a noticeably better condition than we found it.",
            ),
            (
                "Great! Some people believe that individual actions are not enough to address conservation issues, and that significant changes must come from government policies. Do you agree or disagree with this viewpoint? Why or why not?",
                "I agree that government policies are necessary because individual choices depend partly on the systems available to people. Someone may want to use public transportation, for example, but that is difficult if the nearest service is infrequent or does not reach their workplace. Government investment can make the environmentally friendly option practical for many people at once. That does not mean personal actions are pointless. People still need to use the services and follow the rules. I see policy as creating the conditions for change, while individual behavior helps turn that opportunity into a lasting improvement.",
            ),
        ],
    },
    3: {
        "instruction": (
            "You have signed up for a study run by a university research group that is investigating "
            "spending habits and budgeting. You will have a short video interview with one of the researchers. "
            "The researcher will ask you some questions."
        ),
        "items": [
            (
                "Thank you for participating in this study. Today, I'd like to ask you some questions about your spending habits. First, can you tell me about a recent purchase you or someone in your family made and why you decided to buy it?",
                "I recently bought a desk lamp because the lighting where I study was not very comfortable in the evening. I wanted something that I could adjust rather than a bright light that filled the whole room. Before buying it, I checked the size of my desk and compared a few simple models. I chose one with an adjustable arm and straightforward controls. It was not the most expensive option, but it did the job I needed. What mattered to me was making my usual study space more convenient, rather than buying extra features that I probably would not use.",
            ),
            (
                "I see, when you make a purchase do you usually plan ahead or do you buy things spontaneously? Why?",
                "I usually plan purchases, especially when an item costs more than something I buy every day. I like to decide what I actually need before looking at different products. Otherwise, an attractive display or a temporary discount can make an unnecessary item seem useful. For example, I keep a short list on my phone and wait a little before buying things that are not urgent. When I look at the list again, I sometimes realize that I no longer want something. Planning helps me make a clearer decision and reduces the number of unused things at home.",
            ),
            (
                "Interesting. Some people believe that creating a monthly or weekly budget is essential for managing finances effectively. When budgeting your time or money for your next purchase, which is more important, quality for the money or spending less overall, why?",
                "I care more about getting reasonable quality for the money than simply choosing the lowest price. If something breaks quickly or does not work well, replacing it can cost more in the end. I would rather compare products that meet my needs and then choose an affordable one from that group. For example, when buying a backpack, I would check the straps and zippers instead of focusing only on the price tag. Of course, quality does not mean buying the most expensive brand. I want something reliable enough for regular use without paying for features I do not need.",
            ),
            (
                "Good points. For my final question, I'd like to ask about using apps or online tools for managing spending habits. Do you think people will increasingly rely on financial apps and tools to manage their money? Or will people prefer to hire personal financial managers? Explain your thoughts.",
                "I think more people will use financial apps for everyday budgeting because the tools are convenient and easy to check regularly. Someone can record a purchase immediately and see how much remains in a spending category without arranging a meeting. That quick feedback may help people notice patterns before they exceed their plans. Personal financial managers will probably still be useful for complicated decisions, but many ordinary purchases do not require that level of support. The apps will need to protect users' information and explain their features clearly, though, because convenience alone is not enough to make people trust them.",
            ),
        ],
    },
    4: {
        "instruction": (
            "You received an email from your university inviting you to join a research study about "
            "entertainment preferences. You have scheduled a short online interview with a researcher to "
            "answer a few questions."
        ),
        "items": [
            (
                "Today I'd like to ask you some questions about your entertainment preferences. What kind of movies do your family or friends generally like to watch? For example, do they prefer action movies, comedies, dramas, or other types?",
                "Most of my friends prefer comedies, particularly when we watch something together after a demanding week. We want a movie that is easy to enjoy as a group and gives us something to laugh about afterward. My family is a little different. They often choose dramas with interesting characters because they like discussing the choices people make in the story. I enjoy both, so I usually let the group decide. The main thing for me is finding something everyone is willing to watch, rather than insisting on my own favorite genre every time we sit down together.",
            ),
            (
                "I see. When you watch a movie, do you prefer to watch after work or school on weekdays or do you like to watch during the weekends? Why?",
                "I prefer watching movies on weekends because I can give the story my full attention. On a weekday, I am often thinking about an assignment I still need to finish or the time I have to get up the next morning. That makes a long film feel like something I am trying to fit into a gap. At the weekend, I can choose a convenient time, put my phone away, and enjoy the whole movie without rushing. I also like having time afterward to talk about it with a friend instead of immediately moving on to another task.",
            ),
            (
                "Interesting. Next, I'd like to get your opinion. In the past, people mostly watched movies in theaters. Today, many people watch movies at home. Do you think that movie theaters will continue to exist in the future? Why or why not?",
                "I think movie theaters will continue to exist, although people may visit them less often for routine entertainment. Watching at home is convenient, but a large screen and shared audience create a different experience. A visually impressive film can feel more absorbing when it fills your field of view and you are not distracted by household tasks. Going to the theater can also be a planned social outing, much like attending another live event together. Theaters may need to focus on that special experience rather than competing with the convenience of streaming every ordinary movie at home.",
            ),
            (
                "Good points. I just have one more question. Some people believe that movies can be a powerful tool for educating people and raising awareness about important issues. Do you agree with this idea, or do you think there are other, more effective ways to educate people? Explain why you think so.",
                "I agree that movies can help educate people because a story can make an unfamiliar situation easier to imagine. Following a character through a difficult decision may encourage viewers to ask questions they would not have considered after reading a short description. However, a movie should be a starting point rather than the only source of information. A filmmaker selects what to show and may simplify events to keep the story moving. I would combine the film with a discussion or reliable background material so that viewers can separate the dramatic choices from the issue they want to understand.",
            ),
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
        "set": "9.13",
        "skill": "speaking",
        "modules": modules,
        "tasks": tasks,
    }


if __name__ == "__main__":
    paper = build_speaking("2025-09-13", "新托福 9.13 · 口语 Form 1", 1, 1)
    tasks = paper["tasks"]
    assert len(tasks) == 11, len(tasks)
    assert [t["type"] for t in tasks] == ["repeat"] * 7 + ["interview"] * 4
    assert [t["speakSec"] for t in tasks[:7]] == [15, 15, 15, 15, 15, 15, 18]
    assert all(t["speakSec"] == 45 for t in tasks[7:])
    assert paper["modules"] == [
        {"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"},
        {"n": 2, "timeSec": 360, "from": 8, "to": 11, "label": "Take an Interview"},
    ]
    for form in REPEAT:
        assert len(REPEAT[form]["lines"]) == 7, form
    for form in INTERVIEW:
        assert len(INTERVIEW[form]["items"]) == 4, form
        for stem, sample in INTERVIEW[form]["items"]:
            assert len(sample.split()) >= 80, (form, stem[:40], len(sample.split()))
    for t in tasks:
        print(t["id"], t["type"], t["speakSec"], t.get("sample") or t["stem"])
    print(len(tasks), "tasks")
