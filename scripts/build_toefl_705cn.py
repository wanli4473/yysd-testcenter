#!/usr/bin/env python3
"""Build 7.05 China offline TOEFL. Run: python3 scripts/build_toefl_705cn.py"""
import json
import os
import shutil
import stat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月/7.05-国内线下/audio/item_level"
AUDIO = "library/toefl/audio/2025-07-05/"
PHOTO = "library/toefl/img/2025-09-02/"
ID = "2025-07-05"
SET = "7.05"
TITLE = "新托福 7.05 国内线下"
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
    t, n = cw("Medieval European History", 1, n, [
        "Medieval European history, lasting approximately from 500 C.E. to 1500 C.E., is marked by ",
        ("signi", "significant"),
        " ",
        ("cult", "cultural"),
        ", political, and economic changes. Feudalism dominated the social structure, ",
        ("wi", "with"),
        " lords ",
        ("gover", "governing"),
        " lands ",
        ("a", "and"),
        " vassals ",
        ("provid", "providing"),
        " military ",
        ("serv", "services"),
        ". The Church ",
        ("exer", "exerted"),
        " substantial ",
        ("influ", "influence"),
        " over ",
        ("da", "daily"),
        " life and governance. Trade routes expanded, facilitating the exchange of goods and ideas. Art and architecture flourished, exemplified by Gothic cathedrals and illuminated manuscripts. Studying this era involves analyzing historical documents, artifacts, and architectural remains to understand the complexities of medieval society.",
    ])
    tasks.append(t)
    t, n = cw("Deserts and Extreme Environments", 1, n, [
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
    ])
    tasks.append(t)
    t, n = cw("Oceanography", 2, n, [
        "Oceanography is the study of the physical, chemical, and biological aspects of the ocean. This ",
        ("fi", "field"),
        " encompasses ",
        ("t", "the"),
        " exploration ",
        ("o", "of"),
        " ocean ",
        ("curr", "currents"),
        ", marine ",
        ("ecosy", "ecosystems"),
        ", and ",
        ("geolo", "geological"),
        " seabed ",
        ("struc", "structures"),
        ". Oceanographers ",
        ("u", "use"),
        " satellites ",
        ("a", "and"),
        " other ",
        ("adva", "advanced"),
        " technology to monitor and analyze ocean conditions. By tracking sea surface temperatures, currents, salinity, and other features, researchers contribute to our understanding of climate change. Their work is vital for sustaining ocean health and preserving marine biodiversity.",
    ])
    tasks.append(t)
    t, n = cw("Weather Forecasting", 2, n, [
        "Weather patterns are influenced by a variety of factors, including atmospheric pressure, temperature, and humidity. Meteorologists ",
        ("st", "study"),
        " these ",
        ("fac", "factors"),
        " to ",
        ("pre", "predict"),
        " weather ",
        ("condi", "conditions"),
        " and ",
        ("under", "understand"),
        " climate ",
        ("cha", "change"),
        ". Tools ",
        ("li", "like"),
        " satellites ",
        ("a", "and"),
        " radar ",
        ("al", "allow"),
        " meteorologists ",
        ("t", "to"),
        " monitor weather systems in great detail. Accurate weather forecasting is crucial for agriculture, disaster preparedness, and daily planning. It should be noted, however, that despite technological advancements, weather is inherently unpredictable due to the numerous atmospheric variables that can change rapidly.",
    ])
    tasks.append(t)
    if n != 41:
        raise SystemExit("cw expected next 41, got %s" % n)
    tasks.append(academic("Expert Systems", 2, [
        "Expert systems are a branch of artificial intelligence designed to mimic the decision-making abilities of human experts. These systems are built to solve complex problems by applying a set of rules to specific problems. Their goal is to replicate the expertise and reasoning of professionals in fields like medicine and engineering.",
        "An early expert system is MYCIN, developed in the 1970s to diagnose bacterial infections and recommend antibiotics. MYCIN worked by asking a series of questions about a patient's data, inferring diagnoses and suggesting treatments. MYCIN often performed as well as human specialists; however, MYCIN's system needed constant updates, requiring extensive input from medical professionals.",
        {"insert": "A", "t": "Despite their potential, expert systems have limitations because they rely on pre-programmed rules and cannot adapt without ongoing input from human experts. The process of updating the system can be labor-intensive."},
        {"insert": "B", "t": "Advancements in machine learning and natural language processing could address these issues."},
        {"insert": "C", "t": "By integrating these technologies, expert systems could learn from new data and adapt, improving accuracy and relevance. Researchers are optimistic that these advancements will transform expert systems, enabling them to tackle a wider range of challenges and operate more independently."},
        {"insert": "D"},
    ], [
        q(41, 'The word "mimic" in the passage is closest in meaning to', {
            "A": "replace.", "B": "combine.", "C": "imitate.", "D": "challenge.",
        }, "C"),
        q(42, "According to the passage, how did MYCIN diagnose infections?", {
            "A": "By consulting directly with human specialists.",
            "B": "By applying a set of rules to patient data.",
            "C": "By comparing infection rates in different hospitals.",
            "D": "By collecting information directly from patients.",
        }, "B"),
        q(43, "What limitation of expert systems is mentioned?", {
            "A": "They cannot process large datasets.",
            "B": "They often make incorrect decisions.",
            "C": "They need frequent updating by human experts.",
            "D": "They always require changing databases.",
        }, "C"),
        q(44, "What does the passage suggest about future expert systems?", {
            "A": "They will remain limited to medical diagnosis.",
            "B": "They may be able to update themselves more independently.",
            "C": "They will become less accurate over time.",
            "D": "They will be replaced entirely by human specialists.",
        }, "B"),
        insert_q(45, "Additionally, their performance may decline in unfamiliar or rapidly changing environments where new information is constantly emerging.", "B"),
    ]))
    return paper(ID, "reading", "阅读", [
        {"n": 1, "timeSec": 720, "from": 1, "to": 20},
        {"n": 2, "timeSec": 900, "from": 21, "to": 45},
    ], tasks)


def build_listening():
    return paper(ID, "listening", "听力", [
        {"n": 1, "timeSec": 480, "from": 1, "to": 4},
        {"n": 2, "timeSec": 480, "from": 5, "to": 8},
    ], [
        lecture("Hero's Journey", 1, "listening_m1_q01_q04_lecture_hero_journey.mp3", [
            q(1, "What is the main topic of the talk?", {
                "A": "How mythology has shaped cultural traditions.",
                "B": "Joseph Campbell's influence on storytelling techniques.",
                "C": "The structure and significance of the hero's journey.",
                "D": "Criticism of modern storytelling practices.",
            }, "C"),
            q(2, "What point does the speaker make about Joseph Campbell?", {
                "A": "He invented the hero's journey as a new storytelling model.",
                "B": "He examined why readers are drawn to heroic actions in stories.",
                "C": "He was best known for writing fiction based on ancient stories.",
                "D": "He found that stories from different cultures share a similar pattern.",
            }, "D"),
            q(3, "Why does the speaker mention a gift?", {
                "A": "To show appreciation for storytellers' creative talents.",
                "B": "To point out what makes the hero's journey meaningful.",
                "C": "To describe what the hero receives from a mentor.",
                "D": "To highlight the hero's motivation for starting the journey.",
            }, "B"),
            q(4, "What is the speaker's opinion about the hero's journey in storytelling?", {
                "A": "It is outdated and no longer relevant.",
                "B": "It limits creativity by focusing only on action and adventure.",
                "C": "It is influential because it reflects shared human experiences.",
                "D": "It has become more popular due to its use in film and media.",
            }, "C"),
        ]),
        lecture("Viral Marketing", 2, "listening_m2_q01_q04_lecture_viral_marketing.mp3", [
            q(5, "What is the talk mainly about?", {
                "A": "The importance of brand reputation for the brand's success.",
                "B": "A new method by which brands gain attention.",
                "C": "The marketing of a drug for a virus.",
                "D": "A cultural effect of social networks.",
            }, "B"),
            q(6, "What does the speaker say about the cost of viral marketing?", {
                "A": "It is cost-effective compared to traditional advertising methods.",
                "B": "It is more expensive than other forms of advertising.",
                "C": "It involves higher costs at first but lower costs later.",
                "D": "Its costs are similar to those of other advertising methods.",
            }, "A"),
            q(7, "What does the speaker say about content that is more likely to become viral?", {
                "A": "It requires a large amount of research to produce.",
                "B": "It is usually produced by young people.",
                "C": "It often includes a powerful moral message.",
                "D": "It can often be risky for a brand.",
            }, "D"),
            q(8, "What will the speaker most likely discuss next?", {
                "A": "Successful examples of viral marketing.",
                "B": "The role of traditional media in viral marketing.",
                "C": "The future of viral marketing.",
                "D": "The impact of viral marketing on consumer behavior.",
            }, "A"),
        ]),
    ])


def build_writing():
    p = paper(ID, "writing", "写作", [
        {"n": 1, "timeSec": 2100, "from": 1, "to": 5, "label": "Email"},
        {"n": 2, "timeSec": 2400, "from": 6, "to": 9, "label": "Academic Discussion"},
    ], [
        email(1,
            "You are interested in a summer internship program at a company. Write an email to the HR manager.",
            ["Express appreciation for being considered.",
             "Describe the part of the program that interests you most.",
             "Ask what documents you need to submit."],
            "HR Manager", "Summer internship application",
            "Dear HR Manager,\n\n"
            "Thank you very much for considering my application for the summer internship program. I appreciate the opportunity to learn more about the position and the company. I am especially interested in the project-based part of the program, because it would allow me to apply what I have learned in class to real workplace situations. I also hope to observe how experienced employees solve problems and communicate with clients.\n\n"
            "Could you please let me know what documents I should submit at this stage? I can provide my resume, transcript, recommendation letter, or any other materials you require. I would be glad to send them as soon as possible.\n\n"
            "Thank you again for your time and consideration. I look forward to hearing from you.\n\n"
            "Sincerely,\nAlex Chen"),
        email(2,
            "You recently bought a coffee machine, but it has stopped working. Write an email to customer service.",
            ["Mention that you were satisfied at first.",
             "Describe the problems with the machine.",
             "Suggest a solution you would like."],
            "Customer Service", "Issue with coffee machine",
            "Dear Customer Service Team,\n\n"
            "I am writing about the coffee machine I purchased from your store last week. At first, I was very satisfied with it because it was easy to use and made coffee quickly. However, after only a few days, the machine began to shut off while brewing. It also makes a loud noise, and sometimes water leaks from the bottom. I have followed the instructions in the manual, but the problem still continues.\n\n"
            "Could you please arrange a replacement or repair for me? If neither option is available, I would like to request a refund. I have attached a copy of my receipt and can send photos or a short video if needed. Thank you for your help.\n\n"
            "Sincerely,\nAlex Chen"),
        email(3,
            "The heating system in your room is not working properly. Write an email to the housing office.",
            ["Describe the problem.",
             "Explain how it affects your daily life.",
             "Request a repair as soon as possible."],
            "Housing Office", "Heating problem in my room",
            "Dear Housing Office,\n\n"
            "I am writing to report a problem with the heating system in my room. For the past two nights, the heater has not produced enough warm air, and the room has become very cold, especially early in the morning. I tried adjusting the temperature setting, but it did not help.\n\n"
            "This situation is affecting my daily life because it is difficult to sleep comfortably or study in the evening. I am also worried that the cold room may make me sick if the problem continues.\n\n"
            "Could you please send someone to check and repair the heating system as soon as possible? I would be available tomorrow afternoon or any time on Friday. Thank you for your assistance.\n\n"
            "Sincerely,\nAlex Chen"),
        email(4,
            "You made a hotel reservation and found that some information is incorrect. Write an email to the hotel.",
            ["Explain what is wrong with the reservation.",
             "Ask the hotel to confirm the corrected information.",
             "Ask about the hotel's services and facilities."],
            "Hotel Manager", "Correction to my hotel reservation",
            "Dear Hotel Manager,\n\n"
            "I am writing about my reservation for next weekend. I recently checked the confirmation email and noticed that the arrival date is listed as July 15, but I actually booked the room for July 16. The number of guests is also incorrect; it should be two adults, not one.\n\n"
            "Could you please correct this information and send me an updated confirmation? I would like to make sure there will be no problem when we check in.\n\n"
            "I also have a few questions about your services and facilities. Does the hotel provide airport pickup, and is breakfast included in the room rate? I would also like to know whether guests can use the fitness center for free. Thank you for your help.\n\n"
            "Sincerely,\nAlex Chen"),
        email(5,
            "A furniture item you received was damaged. Write an email to the store.",
            ["Describe the damaged item.",
             "Explain how the damage affects your use of it.",
             "Request a replacement or repair."],
            "Customer Service", "Damaged desk from my order",
            "Dear Customer Service Team,\n\n"
            "I am writing about a desk I ordered from your store and received yesterday. Unfortunately, one corner of the desk is cracked, and one of the legs is loose. The box did not look badly damaged, so I did not notice the problem until I opened it and started assembling the desk.\n\n"
            "Because of the loose leg, the desk is unstable and cannot be used safely for studying or placing my computer on it. I am concerned that it may break further if I try to use it.\n\n"
            "Could you please arrange a replacement, or send someone to repair it? I can provide photos of the damage and a copy of the order confirmation. Thank you for your attention to this matter.\n\n"
            "Sincerely,\nAlex Chen"),
        disc(6, "Communication", "Dr. Gupta", "diaz.png",
             "In today's communication class, we are discussing ways speakers can make their ideas effective. Some people believe speakers should use storytelling because vivid stories can hold the audience's attention and make ideas easier to remember. Others believe direct communication is better because it presents the main message clearly and efficiently. Which approach do you think is more effective in speeches? Why?",
             [post("Paul", "andrew.png",
                   "I think storytelling is more effective because people remember concrete experiences better than abstract ideas. A well-chosen story can make a speech more emotional and persuasive."),
              post("Claire", "kelly.png",
                   "I prefer direct communication. In many situations, listeners mainly want the key information, so too many stories may distract them from the speaker's main point.")],
             [{"title": "Use Storytelling",
               "text": "I believe storytelling is generally more effective in speeches because it helps listeners connect emotionally with the message. Paul makes a strong point that concrete experiences are easier to remember than abstract ideas. For example, if a speaker wants to encourage students to volunteer, a short story about one student helping a local family can make the message feel real and meaningful. As a result, the audience is more likely to understand why the issue matters and remember the speaker's main idea after the speech ends. Claire is right that speeches should not become confusing, but this does not mean stories should be avoided. A speaker can use one focused story and then explain the lesson clearly. In that way, storytelling supports the main point instead of distracting from it."},
              {"title": "Prefer Direct Communication",
               "text": "I think direct communication is more effective, especially when the speaker needs to deliver important information quickly. Claire's argument is convincing because audiences often have limited time and attention. For example, in a safety presentation, the speaker should clearly state what people need to do, when they need to do it, and why it matters. If the speaker spends too much time telling stories, listeners may miss the key instructions. Paul is right that stories can be memorable, but they can also make a speech longer and less focused. A clear structure, direct language, and specific examples can still keep the audience engaged without reducing efficiency. Therefore, I believe direct communication is usually the better choice for a speech that needs to be practical and easy to follow."}]),
        disc(7, "Economics", "Dr. Gupta", "diaz.png",
             "Today in our economics class, we are discussing minimum wage laws, which require employers to pay workers at least a certain hourly rate. Supporters argue that these laws help reduce poverty and improve workers' quality of life. Critics, however, worry that higher wages may increase business costs and reduce job opportunities, especially for young or low-skilled workers. Do you believe minimum wage laws are good for the economy? Why or why not?",
             [post("Paul", "andrew.png",
                   "I believe minimum wage laws are generally good for the economy because they give workers more spending power. For example, if low-income workers earn more, they may buy more food, clothing, and services, which helps local businesses. A fair wage can also reduce stress and improve worker productivity."),
              post("Claire", "kelly.png",
                   "I disagree because minimum wage laws can hurt small businesses. If a restaurant must pay every worker more, it might raise prices, reduce hours, or hire fewer people. This could make it harder for inexperienced workers to find jobs.")],
             [{"title": "Support Minimum Wage Laws",
               "text": "I believe minimum wage laws are generally beneficial for the economy because they can improve both workers' lives and consumer demand. Paul makes a persuasive point that workers with higher pay are likely to spend more money in local businesses. For example, when low-wage employees can afford transportation, food, and basic services more easily, that spending returns to the community and supports economic activity. Higher wages may also reduce employee turnover, because workers are less likely to leave jobs that provide stable income. Claire is right that some small businesses may feel pressure from higher costs. However, governments can introduce wage increases gradually or provide support for small employers. Overall, a reasonable minimum wage can create a healthier labor market and a stronger economy."},
              {"title": "Caution on Broad Wage Hikes",
               "text": "I think minimum wage laws can create serious problems for the economy, especially for small businesses and inexperienced workers. Claire's concern is important because many small employers operate with limited budgets. For example, if a local cafe suddenly has to pay much higher wages, it may reduce workers' hours, raise prices, or avoid hiring new staff. This could hurt teenagers or entry-level workers who need their first job experience. Paul is right that higher wages can increase spending power, but that benefit may disappear if fewer people are hired. A better policy might be targeted assistance, job training, or tax support for low-income workers. Therefore, I do not think broad minimum wage increases are always the best way to strengthen the economy."}]),
        disc(8, "Environmental Studies", "Dr. Gupta", "diaz.png",
             "We have been exploring strategies to address climate change, especially the effects of carbon-based energy sources, which are causing global warming. Some experts emphasize the importance of individual actions, like reducing energy use and minimizing waste. Others argue that systemic change through government policy and corporate accountability is more impactful. Which approach do you believe is most effective in combating climate change, and why?",
             [post("Paul", "andrew.png",
                   "Individual actions are essential because they foster environmental awareness and personal responsibility. When people adopt sustainable habits like conserving energy, reducing plastic use, and supporting green initiatives, they influence cultural norms and consumer demand."),
              post("Kelly", "kelly.png",
                   "Policy reform and corporate accountability are more effective for addressing climate change at scale. Governments can enforce emission limits, invest in renewable energy, and regulate industries. Corporations control vast resources and supply chains, so their sustainability efforts have global impact.")],
             [{"title": "Prioritize Systemic Policy",
               "text": "I believe government policy and corporate accountability are the most effective ways to address climate change because they can create change on a much larger scale. Kelly's point is strong because major industries produce a large share of emissions, and individual consumers cannot control those systems alone. For example, if a government requires power companies to shift toward renewable energy, millions of people benefit even if they do not personally install solar panels. Strong rules can also push companies to redesign supply chains and reduce waste. Paul is right that individual habits matter, especially because they build public support for environmental action. However, personal choices are limited unless institutions provide cleaner options. Therefore, systemic change should be the main strategy."},
              {"title": "Start With Individual Action",
               "text": "I think individual action is still the most effective starting point for environmental protection because social change often begins with people's daily choices. Paul is right that personal habits can influence cultural norms and consumer demand. For example, if many consumers avoid wasteful products and support companies with better environmental practices, businesses will have a financial reason to change. Individual action also makes people more willing to vote for environmental policies and participate in community projects. Kelly is correct that governments and corporations have greater power, but large institutions often respond slowly unless public pressure is strong. Therefore, individual behavior is not separate from systemic change; it creates the demand and political support that make broader reform possible."}]),
        disc(9, "Environmental Science", "Dr. Gupta", "diaz.png",
             "Today in our environmental science class, we are discussing ways to protect wildlife. Some people believe endangered animals should be protected in environments with little or no human activity, so they can live and reproduce without disturbance. Others believe that eco-friendly farming and consumer products can also protect wildlife by reducing harm from agriculture and human development. Which approach do you think is more effective for protecting wildlife? Why?",
             [post("Paul", "andrew.png",
                   "I support creating protected areas with very limited human activity. Many animals are sensitive to noise, pollution, and human presence, so they need safe habitats where they can behave naturally."),
              post("Kelly", "kelly.png",
                   "I think eco-friendly farming and consumer choices are more practical. Humans already use a lot of land, so making farms and products less harmful can protect wildlife while still supporting people's needs.")],
             [{"title": "Expand Protected Habitats",
               "text": "I believe protected areas with very limited human activity are more effective for protecting wildlife. Paul's view is persuasive because many endangered animals need quiet, stable habitats in order to reproduce and find food. For example, if a forest is constantly visited by tourists or disturbed by farming, animals may abandon nesting areas or change their natural behavior. A protected reserve can give them space to recover without direct human pressure. Kelly is right that eco-friendly farming is useful, especially in places where people and animals share land. However, it may not be enough for species that are extremely sensitive or already close to extinction. Therefore, human-free or low-human habitats should be the priority."},
              {"title": "Make Everyday Land Use Safer",
               "text": "I think eco-friendly farming and consumer products are more effective because they address the reality that humans and wildlife often share the same land. Kelly makes an important point that people already use large areas for agriculture, housing, and transportation. For example, farms that avoid harmful chemicals, protect water sources, and leave space for native plants can reduce damage to birds, insects, and small animals. This approach can protect wildlife across many ordinary landscapes, not only in isolated reserves. Paul is correct that some species need strict protected areas, but those areas are limited and expensive to manage. If everyday human activities become less harmful, wildlife protection can happen on a much broader scale."}]),
    ])
    check_writing(p)
    return p


REPEATS = [
    ("s01", "You are being trained to assist in a campus coffee shop. Your supervisor will teach you how to explain key features of the coffee shop to customers. Listen to your supervisor and repeat what the supervisor says. Repeat only once.", [
        "We serve coffee and tea at the main counter.",
        "Our pastries are all made fresh daily.",
        "The menu board lists drinks that include a range of herbal teas.",
        "Milk, cream, and sugar are available at this station.",
        "Dispose of trash and recyclables in the bins near the door.",
        "Some tables in the seating area offer excellent views of campus.",
        "Free Wi-Fi is available for campus visitors as well as students.",
    ]),
    ("s02", "You are volunteering at a community workshop. The leader is training you to show beginners how to sew on a button. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "First, thread the needle and tie a knot.",
        "Position the button on the fabric.",
        "Push the needle gently through the fabric and the button.",
        "Sew tightly through each of the holes between three and five times.",
        "Tie a strong knot at the back to firmly secure your work.",
        "Cut any extra thread, then repeat the same steps if there are other buttons.",
        "If your fingers are sensitive, use a thimble for protection while sewing.",
    ]),
    ("s03", "You are volunteering at a community kitchen. The leader is training you to help beginners make bread. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "Measure carefully before starting to mix.",
        "Add yeast to a small amount of warm water.",
        "Stir the wet and dry ingredients into a soft dough.",
        "Press and fold repeatedly until the texture feels elastic.",
        "Let the dough rest in a warm place until it doubles in size.",
        "After the loaf has risen, bake until the top is browned and the center is firm.",
        "When the bread is done, place it on a raised stand so airflow beneath can cool it down.",
    ]),
    ("s04", "You are volunteering at a community recycling center. The leader is training you to explain garbage classification. Listen to the leader and repeat what the leader says. Repeat only once.", [
        "Put all paper items into the blue bin.",
        "Glass bottles belong in the green container.",
        "The yellow receptacle is only for plastic bottles.",
        "Non-recyclable materials must go into the trash.",
        "Compost leftover food to help reduce waste in landfills.",
        "Always read the posted signs to make sure you sort all items correctly.",
        "You can download our app for updates about policy or procedure changes.",
    ]),
]

INTERVIEWS = [
    ("s01", "You have volunteered for a research study about sleep habits. You will have a short online interview with a researcher.", [
        ("Do you usually go to bed early or stay up late? Why?",
         "I usually stay up a little late, mostly because I study better at night. During the day, I have classes, errands, and messages from friends, so it is harder for me to focus. At night, everything is quieter, and I can finish reading or review notes without many interruptions. However, I try not to stay up too late before an important class or test, because I know lack of sleep can hurt my concentration. Ideally, I would like to sleep earlier, but in my current routine, late evening is the most productive time for me."),
        ("What is one routine you usually follow before going to sleep?",
         "Before going to sleep, I usually put my phone away and make a short plan for the next day. This routine helps me relax because I do not keep thinking about unfinished tasks while I am lying in bed. I write down the most important things I need to do, like assignments, appointments, or emails. After that, I wash my face, drink some water, and sometimes read a few pages of a book. Keeping this routine makes bedtime feel more predictable, so I can fall asleep more easily."),
        ("Do you have trouble sleeping in an unfamiliar place, such as a hotel or a friend's home? Why or why not?",
         "Yes, I sometimes have trouble sleeping in an unfamiliar place. I think the main reason is that small differences in the environment become very noticeable at night. For example, the bed may feel different, the room temperature may not be comfortable, or there may be sounds from the hallway. Even if the place is safe, my body needs time to adjust. When I stay in a hotel, I usually bring something familiar, like my own pillowcase or a small notebook, because it helps me feel more settled and relaxed."),
        ("Some people think high schools should start later so teenagers can get more sleep. Do you agree or disagree?",
         "I agree that high schools should start later. Teenagers often have heavy homework, after-school activities, and long commutes, so an early start can make them sleep-deprived. If school began later, students would probably be more alert in morning classes and perform better on tests. It could also improve their mood and reduce stress. Some people may worry that a later schedule would affect sports or family routines, but schools could adjust after-school activities slightly. Overall, I think better sleep would make students healthier and more productive."),
    ]),
    ("s02", "You have signed up for a study about parks and recreational spaces. You will have a short video interview with a researcher.", [
        ("Describe a memorable visit to a park or recreational area. What made it special?",
         "A memorable visit for me was a weekend trip to a large riverside park with my classmates. It was special because the park had open lawns, bike paths, and a small outdoor stage where students were playing music. We did not have a strict plan, so we just walked around, talked, and enjoyed the fresh air. What I remember most is that everyone seemed more relaxed than usual. We were busy with exams at that time, and the park gave us a chance to step away from school pressure. That visit made me realize how useful public spaces can be for students."),
        ("Are public recreational spaces more important for adults or for children? Why?",
         "I think public recreational spaces are slightly more important for children, although adults also benefit from them. Children need safe places where they can run, play, and interact with others. If they spend too much time indoors, they may become less active and less confident socially. A park gives them room to develop both physically and emotionally. Adults can exercise or relax in parks too, but they usually have more choices, such as gyms or cafes. Children depend more on community spaces that are free, safe, and close to home. For that reason, parks are especially valuable for them."),
        ("Do you agree that parks improve community health and well-being and that local governments should invest more money in them?",
         "I agree that parks improve community health and well-being, so local governments should invest more money in them. Parks encourage people to walk, exercise, and spend time outdoors, which can reduce stress and improve physical health. They also create places where neighbors can meet, so communities feel more connected. For example, a park with sports fields, trees, and benches can serve children, elderly people, and working adults at the same time. Some people may argue that parks are expensive to maintain, but the long-term health and social benefits are worth the cost. A city with good parks is usually a better place to live."),
        ("In large cities, should land be used mainly for new housing or for more parks and recreational spaces?",
         "I think cities need both housing and parks, but if I had to choose, I would prioritize housing in areas with serious housing shortages. People need affordable places to live before they can enjoy other parts of city life. If rent becomes too high, students and workers may be pushed far away from schools and jobs. However, housing projects should still include green areas, small playgrounds, or shared courtyards. That way, the city does not completely sacrifice recreation. Large parks are important, but a city also has to solve practical problems. Balanced planning is best, but urgent housing needs should come first."),
    ]),
    ("s03", "You have volunteered for a research study about daily routines. The researcher will ask you some questions.", [
        ("How do you usually arrange your time during the day?",
         "I usually arrange my day around my most important tasks. In the morning, I try to do work that requires concentration, such as reading, writing, or reviewing notes. In the afternoon, I handle easier tasks like messages, errands, or group discussions. I also leave some time in the evening for exercise or rest, because I do not want my whole day to be only about work. This schedule is not perfect, but it helps me use my energy wisely. I have learned that I am more productive when difficult tasks are done earlier."),
        ("Do you make a daily plan? Why or why not?",
         "Yes, I usually make a daily plan, but I keep it simple. I write down three or four important tasks instead of filling every hour with detailed activities. This helps me stay focused without feeling too controlled by the schedule. If I make a very strict plan, I often feel stressed when something unexpected happens. A short plan gives me direction and flexibility at the same time. For example, I may list an assignment, a meeting, and a workout. As long as I finish those main items, I feel the day has been successful."),
        ("What do you do if your day does not go according to plan?",
         "If my day does not go according to plan, I first decide which tasks are truly urgent. Sometimes an unexpected problem takes more time than I expected, so I cannot finish everything. In that situation, I move less important tasks to the next day and focus on what has a deadline. I also try not to blame myself too much, because plans are only tools, not promises. For example, if a group meeting takes longer than expected, I may shorten my study session but still review the most important material. Flexibility keeps me calm."),
        ("Do you think good daily planning affects work or study efficiency?",
         "Yes, I think good daily planning can strongly affect work or study efficiency. A plan helps people avoid wasting time deciding what to do next. It also makes large tasks feel more manageable, because they can be divided into smaller steps. For example, if I have a research paper, I can plan one day for collecting sources, another day for outlining, and another for writing. Without a plan, I might delay the work until the last minute. Planning does not guarantee success, but it makes it easier to stay organized and use time well."),
    ]),
    ("s04", "A researcher is studying people's views on art and music. The researcher will ask you some questions.", [
        ("Do you usually participate in art activities? What kind of art would you like to try?",
         "I do not participate in art activities very often, but I would like to try photography. I think photography is interesting because it helps people notice details in ordinary life, such as light, color, and facial expressions. It also feels more accessible than some other art forms because I can practice with a phone or a simple camera. If I had more time, I would join a beginner photography club and learn how to take better pictures of people and city scenes. I like the idea of using images to tell small stories."),
        ("What is your favorite kind of art or music?",
         "My favorite kind of music is acoustic pop because it feels warm and relaxing. I like songs that have clear melodies and simple instruments, especially guitar or piano. This kind of music is easy to listen to when I am studying, walking, or taking a break after a busy day. I also enjoy lyrics that describe common experiences in a sincere way. I do not need music to be very dramatic or complicated. For me, good music should create a mood and help me feel calm, focused, or understood."),
        ("Do you prefer creating art or appreciating art? Why?",
         "I prefer appreciating art rather than creating it, mainly because I do not have strong technical skills. When I look at a painting, listen to music, or watch a performance, I can enjoy the emotion and meaning without worrying about whether my own work is good enough. Appreciating art also teaches me how other people see the world. However, I still think creating art is valuable because it allows people to express themselves directly. For now, though, I feel more comfortable as an audience member than as an artist."),
        ("Can art and music express emotions and ideas better than language?",
         "Yes, I think art and music can sometimes express emotions better than language. Words are useful for explaining ideas clearly, but they may not capture complex feelings like nostalgia, loneliness, or excitement. A piece of music can make people feel something immediately, even if there are no lyrics. A painting can also show mood through color and shape. For example, a sad melody can communicate grief to people from different countries, even when they do not share the same language. Language is powerful, but art often reaches people in a more direct emotional way."),
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
        modules.append({"n": mod, "timeSec": 360, "from": start, "to": start + 3, "label": "Take an Interview"})
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
    dump("2025-07-05-reading.json", build_reading())
    dump("2025-07-05-listening.json", build_listening())
    dump("2025-07-05-writing.json", build_writing())
    dump("2025-07-05-speaking.json", build_speaking(
        ID, TITLE + " · 口语 Form 1", 1, 1))
    dump("2025-07-05-speaking-f2.json", build_speaking(
        ID + "-s2", TITLE + " · 口语 Form 2", 2, 2))
    dump("2025-07-05-speaking-f3.json", build_speaking(
        ID + "-s3", TITLE + " · 口语 Form 3", 3, 3))
    dump("2025-07-05-speaking-f4.json", build_speaking(
        ID + "-s4", TITLE + " · 口语 Form 4", 4, 4))
    copy_audio()
