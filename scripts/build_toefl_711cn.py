#!/usr/bin/env python3
"""Build 7.11 China offline TOEFL. Run: python3 scripts/build_toefl_711cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月/7.11-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-07-11/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-07-11"
SET = "7.11"
TITLE = "新托福 7.11 国内线下"
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


def academic(title, module, paras, questions):
    return {
        "type": "academic",
        "module": module,
        "instruction": "Read an academic passage.",
        "title": title,
        "paras": paras,
        "questions": questions,
    }


def lecture(title, module, fname, questions):
    NEED.append(fname)
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


def wc(s):
    return len(s.split())


def check_writing(paper):
    for t in paper["tasks"]:
        if t["type"] == "email" and wc(t["sample"]) < 80:
            raise SystemExit("email %s words %s" % (t["id"], wc(t["sample"])))
        if t["type"] == "discussion":
            for s in t["samples"]:
                if wc(s["text"]) < 100:
                    raise SystemExit("disc %s %s words %s" % (t["id"], s["title"], wc(s["text"])))


def build_reading():
    tasks, n = [], 1
    t, n = cw("3D Printing", 1, n, [
        "The advancement of 3D printing technology has revolutionized manufacturing by enabling ",
        ("pre", "precise"),
        ", layer-by-layer fabrication of complex objects. 3D printing can use ",
        ("div", "diverse"),
        " materials ",
        ("s", "such"),
        " as ",
        ("pla", "plastics"),
        ", metals, ceramics, and even biomaterials. ",
        ("Eng", "Engineers"),
        " are able to ",
        ("fab", "fabricate"),
        " lightweight, ",
        ("str", "strong"),
        " components ",
        ("w", "with"),
        " internal structures that are impossible to produce using traditional methods. In the medical field, 3D printing facilitates the production of patient-specific implants and prosthetics tailored to anatomical data from imaging scans. 3D printing promotes faster manufacturing ",
        ("effi", "efficiency"),
        " by streamlining prototyping and reducing ",
        ("mat", "material"),
        " waste.",
    ])
    tasks.append(t)
    t, n = cw("Critical Thinking", 1, n, [
        "Logical reasoning is a cornerstone of academic methodology, providing a structured approach to analyzing arguments and evidence. Deductive ",
        ("reas", "reasoning"),
        " starts ",
        ("wi", "with"),
        " general ",
        ("princ", "principles"),
        " and ",
        ("der", "derived"),
        " specific ",
        ("concl", "conclusions"),
        ", while ",
        ("indu", "inductive"),
        " thinking ",
        ("invo", "involves"),
        " drawing ",
        ("br", "broad"),
        " generalizations ",
        ("fr", "from"),
        " specific ",
        ("observ", "observations"),
        ". Critical thinking skills enable scholars to identify logical fallacies, assess the credibility of sources, and construct coherent arguments. Developing proficiency in logical reasoning enhances the ability to solve complex problems and communicate effectively, fostering intellectual rigor and innovation.",
    ])
    tasks.append(t)
    t, n = cw("Cognition", 2, n, [
        "The field of philosophy of mind delves into the nature of consciousness, thought processes, and the intricate relationship between the mind and body. ",
        ("I", "It"),
        " addresses ",
        ("funda", "fundamental"),
        " questions ",
        ("ab", "about"),
        " perception, ",
        ("iden", "identity"),
        ", self-awareness, ",
        ("a", "and"),
        " subjective ",
        ("exper", "experience"),
        ". The ",
        ("disci", "discipline"),
        " explores ",
        ("h", "how"),
        " and ",
        ("w", "why"),
        " we ",
        ("perc", "perceive"),
        " the world as we do, examining the mechanisms behind thought, emotion, and awareness. This field is a deeply interdisciplinary one that intersects with psychology, neuroscience, and cognitive science, providing a comprehensive approach to understanding human cognition and consciousness.",
    ])
    tasks.append(t)
    if n != 31:
        raise SystemExit("cw expected next 31, got %s" % n)
    return paper(ID, "reading", "阅读", [
        {"n": 1, "timeSec": 720, "from": 1, "to": 20},
        {"n": 2, "timeSec": 360, "from": 21, "to": 30},
    ], tasks)


def build_listening():
    return paper(ID, "listening", "听力", [
        {"n": 1, "timeSec": 480, "from": 1, "to": 4},
        {"n": 2, "timeSec": 480, "from": 5, "to": 8},
    ], [
        lecture("Ant Mandibles", 1, "listening_m1_q25_q28_lecture_ant_mandibles.mp3", [
            q(1, "What does the speaker mainly discuss?", {
                "A": "A recent discovery about the way ants use their mandibles",
                "B": "A robot gripper improvement as an example of biomimicry",
                "C": "A research project inspired by the weight that ants can carry",
                "D": "A way to package items to make them easier for robot grippers to pick up",
            }, "B"),
            q(2, "Why does the speaker mention human fingers?", {
                "A": "To illustrate ants' strength",
                "B": "To point out what inspired the design of a robot gripper",
                "C": "To explain how a research study was performed",
                "D": "To describe how ants' mandibles work",
            }, "B"),
            q(3, "What point does the speaker make about three-plated robot grippers?", {
                "A": "They are not very easy to use.",
                "B": "They are mostly useful for picking up and carrying flat items.",
                "C": "Their design is based on an activity observed in ants.",
                "D": "Their plates usually have at least one curved edge.",
            }, "A"),
            q(4, "What attitude does the speaker express about the researchers' experiment?", {
                "A": "Unsure about why they used artificial hair",
                "B": "Impressed by the number of items they tested",
                "C": "Eager to see additional results in the future",
                "D": "Pleased with how fast their robot grippers picked up items",
            }, "B"),
        ]),
        lecture("Cultural Globalization", 2, "listening_m2_q08_q11_lecture_cultural_globalization.mp3", [
            q(5, "What is the main topic of the talk?", {
                "A": "The spreading of culture across international borders and its impact",
                "B": "Reasons for the transmission of Western culture across the world",
                "C": "The role played by modern technology in connecting different cultures",
                "D": "The potentially negative effects of cultural globalization",
            }, "A"),
            q(6, "What does the speaker say about American films?", {
                "A": "They sometimes depict foreign cultures inaccurately.",
                "B": "They frequently include elements of cultures found outside the United States.",
                "C": "They are an example of how a country's culture is spread across the world.",
                "D": "They are more popular outside the United States than within it.",
            }, "C"),
            q(7, "Why does the speaker talk about cultural appropriation?", {
                "A": "To highlight a common benefit of cultural exchange",
                "B": "To present one of the concerns associated with cultural globalization",
                "C": "To emphasize the importance of social media in spreading a country's culture",
                "D": "To explain how people from different cultures come to respect one another",
            }, "B"),
            q(8, "What does the speaker suggest about social media?", {
                "A": "It is widely recognized as a primary driver of the dominance of Western culture.",
                "B": "It can lead to cultural homogenization if not regulated.",
                "C": "It provides a convenient platform for local cultures to gain global exposure.",
                "D": "It is the primary vehicle for spreading movies, music, and fashion from one country to another.",
            }, "C"),
        ]),
    ])


def build_writing():
    p = paper(ID, "writing", "写作", [
        {"n": 1, "timeSec": 1680, "from": 1, "to": 4, "label": "Email"},
        {"n": 2, "timeSec": 600, "from": 5, "to": 5, "label": "Academic Discussion"},
    ], [
        email(1,
            "You and your friend, John, are planning a trip to Europe this summer. You have researched several destinations and activities that you would like to include in your itinerary.",
            ["Describe the destinations you have researched.",
             "Explain why you think these destinations would be enjoyable.",
             "Ask for John's opinion on the suggested itinerary and any additional ideas he may have."],
            "John", "Summer trip itinerary ideas",
            "Hi John,\n\n"
            "I have been researching places for our Europe trip, and I think Amsterdam, Prague, and Vienna would make a great route. In Amsterdam, we could explore the canals and visit the Van Gogh Museum. Prague offers an impressive old town, a historic castle, and affordable local food. Vienna would be a good final stop because we could tour its palaces and attend a classical music concert.\n\n"
            "These destinations seem enjoyable because they combine art, history, architecture, and relaxed outdoor activities. They are also connected by convenient train routes, so we would not lose too much time traveling between cities.\n\n"
            "What do you think of this itinerary? Please tell me which city interests you most and whether there are other destinations or activities you would like to add.\n\n"
            "Best,\nAlex"),
        email(2,
            "You recently stayed at Sunny Beach Resort during your semester break. You enjoyed the overall experience, but you encountered some issues and want to provide feedback to the resort manager, Ms. Garcia.",
            ["Mention what you enjoyed about your stay.",
             "Describe the issues you had.",
             "Suggest ways to improve the service."],
            "Ms. Garcia", "Feedback on my stay at Sunny Beach Resort",
            "Dear Ms. Garcia,\n\n"
            "I recently stayed at Sunny Beach Resort during my semester break. I especially enjoyed the ocean view, the friendly front desk staff, and the fresh breakfast served each morning. Those features made the resort a relaxing place to visit after a busy term.\n\n"
            "However, I noticed two problems. The recycling bins near the beach were often full, and disposable plastic cups were used throughout the dining area. In addition, the air conditioner in my room was noisy at night, which made it difficult to sleep.\n\n"
            "I suggest emptying the recycling bins more frequently and replacing disposable cups with reusable ones. It may also help to inspect room equipment before guests arrive and provide a quick maintenance contact. These changes would make future stays more comfortable and environmentally responsible.\n\n"
            "Sincerely,\nAlex Chen"),
        email(3,
            "You work part-time at the school library and appreciate your teacher's support, but your library shifts now conflict with your study schedule.",
            ["Explain why you are thankful for the teacher's help.",
             "Describe the conflict between your shifts and study time.",
             "Request an adjustment and state suitable times."],
            "Professor", "Request to adjust my library work hours",
            "Dear Professor,\n\n"
            "Thank you for recommending me for the part-time position at the school library. The job has helped me gain useful experience, and the income has made it easier for me to cover my study expenses. I truly appreciate your support.\n\n"
            "Recently, however, my Tuesday and Thursday evening shifts have begun to conflict with a required study group and my preparation time for a difficult statistics course. I have tried to manage both responsibilities, but I am now falling behind on weekly assignments.\n\n"
            "Would it be possible to adjust my work schedule? I am available on Monday, Wednesday, and Friday afternoons after 2:00 p.m., as well as Saturday mornings. I would be grateful if one of these options could replace my current evening shifts.\n\n"
            "Thank you for considering my request.\n\n"
            "Sincerely,\nAlex Chen"),
        email(4,
            "You have attended training sessions at a local sports club for several months. You appreciate your coach's guidance but have faced difficulties during training.",
            ["State what you appreciate about the coach's teaching and the club's training.",
             "Describe the difficulties you have encountered.",
             "Ask for practical suggestions."],
            "Coach", "Request for advice about my training",
            "Dear Coach,\n\n"
            "Thank you for the clear instruction and encouragement you have given me during the past several months. I particularly appreciate the way you demonstrate each exercise and correct our technique individually. The club's structured sessions have helped me become stronger and more confident.\n\n"
            "Lately, I have had difficulty maintaining my energy during the final part of training. I also feel some stiffness in my knees after repeated jumping exercises, so I worry that my form may be incorrect.\n\n"
            "Could you suggest a safer warm-up routine and a few exercises that would improve my endurance without placing too much stress on my knees? I would also appreciate your advice on how often I should rest between sessions. Your practical guidance would help me continue training consistently and avoid injury.\n\n"
            "Best regards,\nAlex Chen"),
        disc(5, "Cultural Studies", "Dr. Gupta", "diaz.png",
             "Next week, we will be discussing the importance of preserving indigenous cultures that were present a long time ago and survive today. Indigenous cultures face numerous challenges, including globalization and environmental changes. Some experts argue that preserving these cultures is vital. Others believe that adapting to modern society is equally important for the survival and prosperity of indigenous peoples. What are your thoughts on this issue?",
             [post("Kelly", "kelly.png",
                   "Preserving indigenous cultures is essential for maintaining cultural diversity and historical knowledge. These cultures offer unique perspectives and wisdom that contribute to the richness of human heritage. Efforts should be made to protect their traditions and languages because the history of civilizations is often preserved by cultures with a long, storied past."),
              post("Andrew", "andrew.png",
                   "While preserving cultural heritage is important, adapting to modern society is also crucial for the survival and prosperity of indigenous peoples. Integration into modern systems can provide additional resources for education, healthcare, and economic development. Indigenous peoples can be part of modern society without sacrificing their history and culture.")],
             [{"title": "Prioritize Preservation",
               "text": "I agree with Kelly that preservation should be the first priority because cultural knowledge can disappear permanently once a language or tradition stops being practiced. A useful general example is a community whose traditional ecological knowledge explains how to manage forests, water, or local crops. If younger members lose the language in which that knowledge is taught, future generations may lose both a cultural identity and practical methods that took centuries to develop. Preservation does not mean refusing every modern service. Communities can use digital archives, bilingual education, and community-led museums while still choosing healthcare and technology that improve daily life. Andrew is right that economic opportunity matters, but adaptation should occur on terms set by the indigenous community rather than by outside institutions. When preservation leads the process, modernization can add useful resources without replacing local values. Therefore, governments and universities should fund language programs and cultural institutions while giving communities authority over how their heritage is recorded and shared."},
              {"title": "Prioritize Adaptation",
               "text": "I agree more with Andrew that adaptation is essential because a culture is most likely to survive when its members have access to education, healthcare, and stable employment. For example, bilingual schools can teach national subjects while also preserving a local language and history. Students then gain skills needed for university or professional work without being forced to abandon their identity. Economic development can also give communities the resources to maintain cultural centers, festivals, and archives. Kelly correctly emphasizes the danger of losing historical knowledge, but strict preservation can become harmful if it limits people's choices or keeps essential services away. The better approach is community-directed adaptation: indigenous leaders should decide which traditions must be protected and which modern systems can be incorporated. This approach treats culture as living rather than frozen. By combining modern opportunities with local control, communities can improve their quality of life and keep their heritage meaningful for younger generations."}]),
    ])
    check_writing(p)
    return p


REPEATS = [
    ("set01", "You are volunteering at a university art exhibition. The coordinator is training you to guide visitors. Listen to the coordinator and repeat what the coordinator says. Repeat only once.", [
        "Artwork can be seen in the East Wing.",
        "Pieces are placed along the main corridor.",
        "Interactive displays are set up near the front entrance.",
        "Pick up printed materials at the information desk.",
        "Incredible photos tell unique stories about campus life.",
        "If you need to relax for a moment, there are places to sit and take a break.",
        "Tours are given daily every hour, but you need to sign up one day prior.",
    ]),
    ("set02", "You are volunteering at a city visitor center. The leader is training you to describe local landmarks. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "This castle is famous for its towers.",
        "The statue celebrates important events.",
        "Visit the market to buy local goods and fresh produce.",
        "The park is perfect for relaxing and outdoor activities.",
        "See art displays and historical relics at the museum.",
        "Guided city tours can provide detailed information about each landmark.",
        "When needed, check out the city map for directions and transportation options.",
    ]),
    ("set03", "You are working at the university student center. Your supervisor is training you to explain the center's resources. Listen to the supervisor and repeat what the supervisor says. Repeat only once.", [
        "The resource desk is near the entrance.",
        "The lounge is a quiet place for studying.",
        "You can access free printing and internet in the lab.",
        "Our multi-purpose room is used for workshops and events.",
        "Please do not bring food from the cafe to other places.",
        "Check the bulletin board for daily announcements and activity schedules.",
        "If anyone has questions, feel free to stop by the help desk near the exit.",
    ]),
    ("set04", "You are working at an art gallery. The manager is training you to assist visitors. Listen to the manager and repeat what the manager says. Repeat only once.", [
        "Visitors should enter through the front.",
        "Tickets can be purchased at reception.",
        "You can leave your belongings in the coat check room free of charge.",
        "Each piece in the Modern Art Hall is labeled with details.",
        "Our photography exhibit features work by student artists.",
        "Restrooms are located in the corner of the gallery near the exit.",
        "Our cafe offers coffee, tea, and a variety of sandwiches and treats.",
    ]),
]

INTERVIEWS = [
    ("set01", "You will have a short online interview with a researcher about climate and weather.", [
        ("What is the climate like in the city where you live?",
         "The city where I live has a humid subtropical climate. Summers are long, hot, and rainy, while winters are fairly short and mild. Spring is pleasant, but the temperature can change quickly from one day to the next. The rainy season usually arrives in early summer, so the air often feels heavy and damp. I enjoy the green scenery that comes with the rain, but the heat can be uncomfortable when I need to travel across the city. Overall, the climate is manageable because extremely cold weather is rare, although I always check the forecast before making outdoor plans."),
        ("How do you prepare when the weather forecast says it will rain?",
         "When rain is expected, I first check when it will begin and how heavy it may be. I carry a compact umbrella and wear shoes that will not be damaged by water. If the forecast predicts a storm, I leave home earlier because traffic and public transportation may be delayed. I also put my laptop and important papers in a waterproof bag. For outdoor activities, I either move them indoors or choose another day. These small preparations make the day much easier because I do not have to rush or worry about protecting my belongings once the rain starts."),
        ("Would you prefer to live in a city with a mild, consistent climate or a city with four distinct seasons? Explain your preference.",
         "I would prefer a city with four distinct seasons. Each season creates a different atmosphere and gives people new activities to enjoy. In spring, I could spend more time outdoors, while summer would be good for travel and sports. Autumn offers comfortable temperatures and beautiful scenery, and winter makes indoor gatherings feel special. A consistent mild climate might be convenient, but I think it would eventually feel repetitive. Seasonal changes also help me organize the year and appreciate different kinds of weather. As long as the winters are not dangerously cold, the variety would make daily life more interesting for me."),
        ("What measures should governments take to mitigate the effects of extreme weather?",
         "Governments should focus on preparation, infrastructure, and clear public communication. First, cities need drainage systems, flood barriers, cooling centers, and stronger electrical networks that can continue operating during emergencies. Second, weather warnings should be sent quickly through phones, television, and community organizations, with clear instructions in several languages. Governments should also identify vulnerable residents, such as older adults, and provide transportation or temporary shelter when necessary. Finally, building standards should be updated for local risks. These measures cannot prevent extreme weather, but they can reduce injuries, protect essential services, and help communities recover much faster afterward."),
    ]),
    ("set02", "You will have a short online interview with a researcher about living arrangements and daily habits.", [
        ("Could you tell me about your current living arrangements? Do you live alone, or do you share your home with others?",
         "I currently share an apartment with one roommate near my workplace. We each have a private bedroom, but we share the kitchen, living room, and bathroom. Living with someone else helps reduce rent and utility costs, which is important in a large city. We also divide household responsibilities, so one person does not have to manage everything. At the same time, we try to respect each other's schedules and need for quiet. I sometimes miss the privacy of living alone, but overall the arrangement works well because my roommate is responsible, friendly, and easy to communicate with."),
        ("Is there a household chore that you dislike doing regularly? What is it, and why does it bother you?",
         "The household chore I dislike most is cleaning the bathroom. It takes more time than other tasks because every surface needs attention, including the sink, mirror, shower, and floor. I also dislike the strong smell of many cleaning products, so I have to keep the window open and wear gloves. Even though it is not enjoyable, I clean the bathroom every week because a clean shared space is important. I make the task easier by keeping supplies together and cleaning small areas during the week. That prevents the job from becoming overwhelming on the weekend."),
        ("What modern invention has changed the way you handle household tasks, and why is it essential?",
         "The washing machine is the household invention I find most essential. Without it, washing clothes and bedding by hand would take several hours and require a great deal of physical effort. With a washing machine, I can start a load, complete other work, and return when the cycle finishes. Modern machines also offer settings for delicate clothes, heavy fabrics, and water-saving cycles, so they protect clothing and reduce waste. This invention is especially valuable in a busy household because clean clothes are a constant need. It saves time every week and makes an important routine task much more manageable."),
    ]),
    ("set03", "You will have a short online interview with a researcher about online shopping.", [
        ("How often do you shop online: weekly, monthly, or less frequently?",
         "I shop online about once or twice a month rather than every week. I usually wait until I need several items, then place one order so I can compare prices and avoid unnecessary delivery fees. Shopping less frequently also prevents me from making impulsive purchases simply because an advertisement appears on my phone. I still browse online when I need information, but I add products to a list and think about them before buying. This routine is convenient because I can order essential items without spending too much time, while still keeping my budget under control."),
        ("What types of products are you most likely to buy online?",
         "I am most likely to buy books, basic electronics, and household supplies online. These products are easy to compare because stores provide clear specifications, customer reviews, and prices. For example, when I need a charger or computer accessory, I can check whether it is compatible with my device before ordering. I also buy books online because the selection is wider than in many local stores. However, I usually avoid buying expensive clothing or fresh groceries online. I prefer to inspect those items in person because size, quality, and freshness can be difficult to judge from a picture."),
        ("Some people prefer physical stores, while others think online shopping is worse because it lacks human interaction. What is your opinion?",
         "I think online shopping is more convenient for routine purchases, but physical stores provide a better experience when advice or careful inspection matters. Online stores save travel time and make it easy to compare products. However, a knowledgeable employee can answer detailed questions, and customers can see the actual size, color, and quality of an item. That is especially useful for clothing, furniture, or expensive equipment. Therefore, I do not see one method as completely superior. I use online shopping for familiar products and physical stores for purchases that require personal assistance. The best choice depends on the product and the amount of uncertainty involved."),
        ("Do you think physical stores will eventually disappear because of online shopping?",
         "I do not think physical stores will disappear, although their role will continue to change. People still want to try on clothing, test electronics, see furniture, and receive immediate help from employees. Stores can also provide services that websites cannot, such as repairs, demonstrations, and community events. However, many retailers will probably use smaller locations and connect them closely with online systems. Customers may research a product online, examine it in a store, and choose either delivery or pickup. This combination is efficient and flexible. Physical stores that offer useful experiences will remain, while stores that only display common products may become less numerous."),
    ]),
]


def build_speaking(pid, title, form, interview=None):
    tasks = []
    modules = []
    if form:
        key, instruction, samples = REPEATS[form - 1]
        for i, sample in enumerate(samples, 1):
            fname = "speaking_listen_repeat_%s_q%02d.mp3" % (key, i)
            NEED.append(fname)
            tasks.append({
                "type": "repeat", "module": 1, "id": i,
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
        modules.append({"n": mod, "timeSec": 360, "from": start, "to": start + len(items) - 1, "label": "Take an Interview"})
        for i, (stem, sample) in enumerate(items, 1):
            fname = "speaking_take_interview_%s_q%02d.mp3" % (ikey, i)
            NEED.append(fname)
            tasks.append({
                "type": "interview", "module": mod, "id": start - 1 + i,
                "speakSec": 45, "instruction": i_instruction, "stem": stem,
                "audio": AUDIO + fname,
                "sample": sample,
            })
    return {
        "id": pid, "title": title, "set": SET, "skill": "speaking",
        "modules": modules, "tasks": tasks,
    }


def copy_audio():
    dest = os.path.join(ROOT, AUDIO)
    os.makedirs(dest, exist_ok=True)
    seen = set()
    for fname in NEED:
        if fname in seen:
            continue
        seen.add(fname)
        src = os.path.join(SRC, fname)
        if not os.path.isfile(src):
            raise SystemExit("missing audio " + src)
        out = os.path.join(dest, fname)
        shutil.copy2(src, out)
        os.chmod(out, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
    print("copied", len(seen), "audio files")


if __name__ == "__main__":
    dump("2025-07-11-reading.json", build_reading())
    dump("2025-07-11-listening.json", build_listening())
    dump("2025-07-11-writing.json", build_writing())
    dump("2025-07-11-speaking.json", build_speaking(
        ID, TITLE + " · 口语 Form 1", 1, 1))
    dump("2025-07-11-speaking-f2.json", build_speaking(
        ID + "-s2", TITLE + " · 口语 Form 2", 2, 2))
    dump("2025-07-11-speaking-f3.json", build_speaking(
        ID + "-s3", TITLE + " · 口语 Form 3", 3, 3))
    dump("2025-07-11-speaking-f4.json", build_speaking(
        ID + "-s4", TITLE + " · 口语 Form 4", 4, None))
    copy_audio()
