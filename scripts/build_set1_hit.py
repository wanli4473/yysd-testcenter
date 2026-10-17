#!/usr/bin/env python3
"""Build Set 1 JSON from OCR of 验收样本. User reviews 解析/选项."""
import json
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from toefl_sent import scramble

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "app/library/toefl")
AUD = "library/toefl/audio"


def cr(n, title, stem, opts, ans, tr, analysis):
    letters = "ABCD"
    options = {letters[i]: opts[i] for i in range(4)}
    return {
        "type": "choose_response",
        "module": 1,
        "title": title,
        "code": "LR%02d" % n,
        "instruction": "Choose the best response.",
        "audio": "%s/Set1-L-CR%d.mp3" % (AUD, n),
        "questions": [{
            "id": n, "stem": stem, "options": options, "answer": ans,
            "transcript": tr, "analysis": analysis
        }]
    }


def conv(n, title, audio_n, tr, qs):
    return {
        "type": "conversation",
        "module": 1,
        "title": title,
        "code": "C%02d" % n,
        "instruction": "Listen to a conversation.",
        "audio": "%s/Set1-L-LCN%d.mp3" % (AUD, audio_n),
        "transcript": tr,
        "questions": qs
    }


def sent(i, context, answer, extra=None):
    words = answer.replace("?", "").replace(".", "").split()
    # ponytail: chip each word; ceiling is multi-word chunks if bank feels choppy
    bank = words[:]
    if extra:
        bank.extend(extra)
    return {
        "type": "sentence",
        "module": 1,
        "id": i,
        "context": context,
        "parts": [{"slot": True} for _ in words] + [{"t": "?" if answer.endswith("?") else "."}],
        "bank": scramble(bank, words),
        "answer": words,
        "analysis": "正确顺序：" + answer
    }


def dump(name, obj):
    path = os.path.join(OUT, name)
    with open(path, "w") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(name, "tasks", len(obj["tasks"]))


reading = {
    "id": "set-1",
    "title": "Set 1 · Reading",
    "set": "1",
    "skill": "reading",
    "modules": [{"n": 1, "timeSec": 960, "from": 1, "to": 17}],
    "tasks": [
        {
            "type": "complete_words",
            "module": 1,
            "title": "South Pacific History",
            "instruction": "Fill in the missing letters in the paragraph.",
            "translation": "南太平洋的历史以多元文化和重大事件为标志。土著居民发展了具有丰富传统和社会结构的复杂社会。该地区的政治和经济格局在欧洲人殖民统治后经历了深刻变化。研究这段历史可以更好地理解文化互动及历史事件对当代南太平洋社会的持续影响。利用星辰和海浪的传统导航技术成就了非凡的航行成就，而当代运动则侧重于文化保护、语言复兴和应对气候变化对岛屿国家的影响。",
            "passage": [
                {"t": "The history of the South Pacific is marked by diverse cultures and significant events. Indigenous "},
                {"id": 1, "prefix": "popul", "answer": "ations", "word": "populations"},
                {"t": " developed "},
                {"id": 2, "prefix": "com", "answer": "plex", "word": "complex"},
                {"t": " societies "},
                {"id": 3, "prefix": "wi", "answer": "th", "word": "with"},
                {"t": " rich "},
                {"id": 4, "prefix": "tradi", "answer": "tions", "word": "traditions"},
                {"t": " and "},
                {"id": 5, "prefix": "soc", "answer": "ial", "word": "social"},
                {"t": " structures. "},
                {"id": 6, "prefix": "T", "answer": "he", "word": "The"},
                {"t": " region's "},
                {"id": 7, "prefix": "poli", "answer": "tical", "word": "political"},
                {"t": " and "},
                {"id": 8, "prefix": "econ", "answer": "omic", "word": "economic"},
                {"t": " landscapes "},
                {"id": 9, "prefix": "exper", "answer": "ienced", "word": "experienced"},
                {"t": " profound "},
                {"id": 10, "prefix": "cha", "answer": "nges", "word": "changes"},
                {"t": " following colonization by Europeans. Studying this history allows for a greater understanding of cultural interactions and the ongoing effects of historical events on contemporary South Pacific societies.\n\nTraditional navigation techniques using stars and ocean swells enabled remarkable voyaging achievements, while contemporary movements focus on cultural preservation, language revitalization, and addressing climate change impacts on island nations."}
            ]
        },
        {
            "type": "daily_life",
            "module": 1,
            "title": "Career Fair",
            "instruction": "Read an email.",
            "layout": {
                "kind": "card",
                "kicker": "Email",
                "title": "Career Fair",
                "body": "Hi Team,\n\nBlundin University hosted a career fair yesterday. I was able to speak to several promising candidates for summer internships with our company. See their attached resumes. I'd like everyone to give me their feedback no later than Friday.\n\nThanks,\nRyan"
            },
            "questions": [
                {
                    "id": 1,
                    "stem": "What did Ryan do yesterday?",
                    "options": {
                        "A": "He took a class at a university.",
                        "B": "He attended a job fair.",
                        "C": "He was interviewed by a manager.",
                        "D": "He hired some summer interns."
                    },
                    "answer": "B",
                    "analysis": "邮件写 Blundin University hosted a career fair yesterday，Ryan 去招聘会见了实习生候选人。答案是 B。"
                },
                {
                    "id": 2,
                    "stem": "What does Ryan ask his team to do?",
                    "options": {
                        "A": "Share their opinions of some job candidates.",
                        "B": "Review a summer internship program.",
                        "C": "Update their résumés by Friday.",
                        "D": "Introduce themselves to new interns."
                    },
                    "answer": "A",
                    "analysis": "Ryan 请大家 no later than Friday 给出 feedback，即对候选人发表意见。"
                }
            ]
        },
        {
            "type": "academic",
            "module": 1,
            "title": "The Dynamics of Hollywood's Golden Age",
            "instruction": "Read the passage.",
            "translation": "好莱坞黄金时代（1920 年代至 1960 年代）是电影史的变革期。在制片厂制度下，RKO 等大公司控制制片，以流水线方式打造亨弗莱·鲍嘉、凯瑟琳·赫本等明星。该制度保证稳定产量，却常限制导演和演员的创作自由。正是这种约束促使电影人在既定边界内寻求新的叙事方式。有声电影的出现彻底改变了叙事；默片明星必须适应，音乐剧等新类型则利用声音技术。1948 年最高法院裁决打破制片厂对影院的垄断，独立电影人获得空间。但制片厂制度的效率与造星机制至今仍影响好莱坞。",
            "paras": [
                "Hollywood's Golden Age, from the 1920s to the 1960s, was a transformative period in cinema history. Under the studio system, major companies like RKO controlled film production, creating an efficient assembly-line process that produced stars such as Humphrey Bogart and Katharine Hepburn. While this system ensured a steady output of films, it often limited creative freedom for directors and actors tied to restrictive contracts. Yet this very constraint led to unexpected innovation as filmmakers sought new ways to tell compelling stories within set boundaries.",
                "A pivotal change during this era was the introduction of sound, forever altering cinematic storytelling. Silent film stars had to adapt or risk obsolescence, while new genres like musicals capitalized on sound technology's possibilities. This shift pushed directors to experiment with narrative structures, often blurring the lines between genres to captivate audiences.",
                "The decline of the studio system began with a 1948 Supreme Court ruling that dismantled studios' monopolies over theaters. This ruling opened the door for independent filmmakers, whose diverse and unconventional stories began gaining traction in theaters. However, the legacy of the studio system's efficiency and star-making machinery still influences Hollywood's operations today."
            ],
            "questions": [
                {
                    "id": 1,
                    "stem": "Which aspect of the studio system encouraged filmmakers to innovate?",
                    "options": {
                        "A": "The demand for more silent films",
                        "B": "The freedom to create experimental films",
                        "C": "The inefficiency of film production",
                        "D": "The boundaries imposed by restrictive contracts"
                    },
                    "answer": "D",
                    "analysis": "原文 Yet this very constraint led to unexpected innovation，约束来自 restrictive contracts。"
                },
                {
                    "id": 2,
                    "stem": "The word \"compelling\" in the passage is closest in meaning to",
                    "options": {"A": "modern", "B": "astonishing", "C": "fascinating", "D": "complex"},
                    "answer": "C",
                    "analysis": "compelling stories 意为引人入胜，最接近 fascinating。"
                },
                {
                    "id": 3,
                    "stem": "Why does the author mention the introduction of sound in films?",
                    "options": {
                        "A": "To highlight a development that led to new, creative narrative techniques",
                        "B": "To emphasize the former popularity of silent films",
                        "C": "To discuss how sound renewed the careers of silent film stars",
                        "D": "To identify the event that started the decline of the studio system"
                    },
                    "answer": "A",
                    "analysis": "有声电影推动导演 experiment with narrative structures。"
                },
                {
                    "id": 4,
                    "stem": "What inference can be made about the 1948 Supreme Court ruling?",
                    "options": {
                        "A": "It led to a temporary increase in studio profits.",
                        "B": "It allowed independent films to be seen and become popular.",
                        "C": "It caused studios to develop more large-scale musical productions.",
                        "D": "It had no effect on Hollywood's operations."
                    },
                    "answer": "B",
                    "analysis": "裁决后 independent filmmakers ... gaining traction in theaters。"
                },
                {
                    "id": 5,
                    "stem": "What does the passage imply about the Hollywood film industry today?",
                    "options": {
                        "A": "Modern studios have completely abandoned all practices from the Golden Age period.",
                        "B": "Contemporary films commonly use the storytelling techniques developed during the 1920s–1960s.",
                        "C": "Independent filmmakers have entirely replaced the studio system's influence on cinema.",
                        "D": "The assembly-line process of the studio system still impacts current Hollywood operations."
                    },
                    "answer": "D",
                    "analysis": "末句 still influences Hollywood's operations today。"
                }
            ]
        }
    ]
}

listening = {
    "id": "set-1",
    "title": "Set 1 · Listening",
    "set": "1",
    "skill": "listening",
    "modules": [{"n": 1, "timeSec": 1500, "from": 1, "to": 28}],
    "tasks": [
        cr(1, "LR01", "Choose the best response.",
           ["After my class.", "Check on the class website.", "They are 36 pages long.", "They use the standard format."],
           "B", "W: Where can I find the class notes?",
           "问课堂笔记在哪。B 说去课程网站上看。A 是课后，C 是长度，D 是格式。"),
        cr(2, "LR02", "Choose the best response.",
           ["I'm not sure what the funds will be used for.", "A few candidates are being considered.", "Last year's fundraiser was quite successful.", "The school appreciates the additional support."],
           "B", "W: Who's handling this year's school fundraiser?",
           "问谁负责募款。B 说正在考虑几位人选。"),
        cr(3, "LR03", "Choose the best response.",
           ["The membership dues.", "On the auditorium on the second floor.", "Last night it rained a lot.", "At least five said they would come."],
           "D", "M: I don't know how many people will join us tonight for study group.",
           "问学习小组人数。D 回答至少五人会来。"),
        cr(4, "LR04", "Choose the best response.",
           ["What size did you buy?", "It was a good-looking design.", "I'll give him the list of what we need.", "This year it starts earlier than usual."],
           "C", "M: Peter said he would look for supplies.",
           "Peter 去找物资。C 说把清单给他。"),
        cr(5, "LR05", "Choose the best response.",
           ["Yes, they work every day.", "I'll need to contact maintenance.", "Probably not before work.", "I will be out next week."],
           "B", "W: Why is the air conditioner in the dorm not working?",
           "空调坏了。B 说要联系维修。"),
        cr(6, "LR06", "Choose the best response.",
           ["It's on modern technology.", "Because students requested it.", "It's part of the lecture series.", "A visiting researcher."],
           "D", "W: Who is the guest lecturer today?",
           "问客座讲师是谁。D 说是一位访问研究员。"),
        cr(7, "LR07", "Choose the best response.",
           ["In the main classroom.", "I'll be there.", "Probably the same from last week.", "She didn't take notes."],
           "C", "W: Who is the tutor in the Student Success Center today?",
           "问今天的辅导老师。C 说大概还是上周那位。"),
        cr(8, "LR08", "Choose the best response.",
           ["It's a device that runs on solar power.", "Yes, they usually go out to eat.", "I thought it was a powerful speech.", "It looks like the streetlights outside the dorm are still on."],
           "D", "W: Maybe the power went out for this whole area.",
           "怀疑大面积停电。D 说宿舍外路灯还亮着，说明未必全停。"),
        cr(9, "LR09", "Choose the best response.",
           ["It was cancelled because of the rain.", "The stadium is across campus.", "I prefer indoor sports.", "Tickets go on sale Friday."],
           "A", "W: What happened to this afternoon's outdoor game?",
           "问户外比赛怎么了。A 说因雨取消。"),
        cr(10, "LR10", "Choose the best response.",
           ["Yes, it was very informative.", "Plants improve indoor air quality.", "She waters her garden daily.", "Teachers enjoy seeing students grow."],
           "A", "W: Did you enjoy the gardening class?",
           "问园艺课好不好。A 说很有收获。"),
        cr(11, "LR11", "Choose the best response.",
           ["Yes, I think it is.", "A very noisy concert.", "Sure, sorry about that.", "No, I'm not going to return it."],
           "C", "M: Can you turn down the volume?",
           "请调低音量。C 表示抱歉并答应。"),
        cr(12, "LR12", "Choose the best response.",
           ["The library closes at nine.", "I already returned those books.", "We can meet after my lab.", "Professor Lee assigned extra reading."],
           "A", "W: Do you know when the library closes tonight?",
           "问图书馆几点关。A 直接回答时间。"),
        conv(1, "Conversation C01", 1,
             "Hi, I need to return this sweater. I bought it yesterday, but it's too small for me. Sure, do you have the receipt? Yes, I have it right here. Great! We can process the return. Do you want to exchange it for a larger size or get a refund? I'd like to exchange it, please. No problem. I'll get another in that color for you from our stock. Thank you.",
             [
                 {"id": 1, "stem": "Why is the man returning the sweater?",
                  "options": {"A": "It is damaged.", "B": "It does not fit him.", "C": "He does not like the color.", "D": "He found it cheaper elsewhere."},
                  "answer": "B", "analysis": "男士说 it's too small for me，衣服不合身。"},
                 {"id": 2, "stem": "What will the woman most likely do next?",
                  "options": {"A": "Speak with the store manager.", "B": "Offer the man a store credit.", "C": "Check the stock for a larger size.", "D": "Print a copy of the man's receipt."},
                  "answer": "C", "analysis": "店员说 I'll get another in that color for you from our stock。"}
             ]),
        conv(2, "Conversation C02", 2,
             "Do you have time to do me a favor? I'm about to run to the post office, but I can help you after that. I'm hosting this dinner party tonight and I need to pick up some last-minute groceries. What do you still need? I need vegetables and ingredients for a dessert. Here's a list. No problem. I can swing by the market after I've mailed my package. You're a lifesaver. Thanks a million.",
             [
                 {"id": 1, "stem": "What is the man doing later today?",
                  "options": {"A": "Going to a restaurant", "B": "Hosting a dinner party", "C": "Preparing a meal for his family", "D": "Having a meal at the woman's home"},
                  "answer": "B", "analysis": "男士说 I'm hosting this dinner party tonight。"},
                 {"id": 2, "stem": "What is the woman likely to do next?",
                  "options": {"A": "Make a shopping list for the man", "B": "Buy groceries for the man", "C": "Go to the post office", "D": "Help the man make dessert"},
                  "answer": "C", "analysis": "女士先去邮局，之后再帮他买菜。下一步是去邮局。"}
             ]),
        conv(3, "Conversation C03", 3,
             "Have you heard about the concert that the University Orchestra is putting on in the park? I know you're a big fan of classical music. I am, and I'm already going with a group of friends. You should come with us. Thanks, I'd love to. So how much are tickets? You only have to pay if you sit in the seats up close near the stage. We're all going to bring blankets and just sit on the grass a little farther back. Good idea. I'll bring a blanket too.",
             [
                 {"id": 1, "stem": "What are the man and the woman talking about?",
                  "options": {"A": "The location of a new park", "B": "Their favorite types of music", "C": "Their plans to attend an event", "D": "The best places to listen to music"},
                  "answer": "C", "analysis": "两人在约公园交响乐音乐会。"},
                 {"id": 2, "stem": "What does the man imply when he says, \"I'll bring a blanket, too\"?",
                  "options": {"A": "He is worried that he might get cold.", "B": "He thinks the tickets are too expensive.", "C": "He would like a seat close to the stage.", "D": "He will sit in the grass with the woman's friends."},
                  "answer": "D", "analysis": "草地上坐着听，他也带毯子，表示会和朋友坐草地。"}
             ]),
        conv(4, "Conversation C04", 4,
             "Did you hear about the mural project our university's doing? I really think you should enter. Wait, what mural project? They want to create a mural on the side of the student center. Students will submit paintings, and the judges will select the top five, and then those students will lead the official mural committee. Are you doing it? The paintings you've done in our class are amazing! I already have the newspaper club and student council. Well, it sounds interesting. I'll look into it.",
             [
                 {"id": 1, "stem": "What does the man encourage the woman to do?",
                  "options": {"A": "Enter a contest", "B": "Take an art class", "C": "Speak with a judge", "D": "Go to see a mural"},
                  "answer": "A", "analysis": "男士说 I really think you should enter。"},
                 {"id": 2, "stem": "Why does the man mention the Newspaper Club and Student Council?",
                  "options": {"A": "To identify where he heard about some upcoming events", "B": "To explain why he is unavailable", "C": "To encourage the woman to join new activities", "D": "To point out why he would be a strong candidate"},
                  "answer": "B", "analysis": "他已有两个社团，解释自己没空参加。"}
             ]),
        conv(5, "Cancelled Yoga Class", 5,
             "Wasn't there supposed to be a yoga class in the conference room at noon today? I stopped in right at noon and no one was there. I was really looking forward to it. Didn't you get the email? The instructor had a personal conflict and had to cancel. When did she send it? I don't know, maybe quarter after eleven? Oh, that makes sense. I've been away from my desk since mid-morning and haven't checked my email. Then you probably don't know that she is rescheduled for tomorrow.",
             [
                 {"id": 1, "stem": "What did the man do at noon?",
                  "options": {"A": "He signed up for a yoga class.", "B": "He entered an empty conference room.", "C": "He read an email sent by the yoga instructor.", "D": "He forwarded an email to the woman."},
                  "answer": "B", "analysis": "男士说 I stopped in right at noon and no one was there，中午进了空的会议室。"},
                 {"id": 2, "stem": "What does the woman imply the man can do tomorrow?",
                  "options": {"A": "Check his email more frequently", "B": "Send the yoga instructor an email", "C": "Attend a yoga class", "D": "Attend a meeting in the conference room"},
                  "answer": "C", "analysis": "女士说 she is rescheduled for tomorrow，课改到明天，暗示男士明天可以去上瑜伽课。"}
             ]),
        {
            "type": "announcement",
            "module": 1,
            "title": "Announcement A01",
            "code": "A01",
            "instruction": "Listen to an announcement.",
            "audio": AUD + "/Set1-L-ANO1.mp3",
            "transcript": "Thank you for touring this special collection of paintings we recently acquired from a donor. We're going to begin with 18th century works in the hallway on your left. We'll then proceed to the early 19th century in the next room, and finish with the modern art collection on the next floor. But first, I'll pass out a detailed map of the collection, which includes some artist information on the back.",
            "questions": [
                {"id": 1, "stem": "What is the purpose of the announcement?",
                 "options": {"A": "To ask for volunteers", "B": "To give information about a museum's history", "C": "To explain the plan for a tour", "D": "To request donations"},
                 "answer": "C", "analysis": "讲解参观路线：走廊、下一间、楼上，是游览安排。"},
                {"id": 2, "stem": "What will the speaker probably do next?",
                 "options": {"A": "Take students to the next floor", "B": "Discuss an artist", "C": "Collect feedback from visitors", "D": "Hand out some printed information"},
                 "answer": "D", "analysis": "I'll pass out a detailed map。"}
            ]
        },
        {
            "type": "announcement",
            "module": 1,
            "title": "Announcement A02",
            "code": "A02",
            "instruction": "Listen to an announcement.",
            "audio": AUD + "/Set1-L-ANO2.mp3",
            "transcript": "I'm pleased to announce that we'll have a guest speaker next week as part of our unit on environmental policy. Dr. Maya Chen will join us on Thursday, and she'll be speaking about international climate agreements, the role of youth activism, and current challenges in global sustainability efforts. There will be time for questions at the end, so feel free to prepare some in advance. This talk should give you valuable insights for your upcoming group project, so please make sure you're there.",
            "questions": [
                {"id": 1, "stem": "What field does the guest speaker most likely work in?",
                 "options": {"A": "Climate policy", "B": "Marine biology", "C": "Urban studies", "D": "Public health"},
                 "answer": "A", "analysis": "讲座关于 climate agreements 与 sustainability。"},
                {"id": 2, "stem": "What does the speaker imply about the guest lecturer's talk?",
                 "options": {"A": "It will be useful for an upcoming project.", "B": "It will replace a required assignment.", "C": "It will be recorded and posted online.", "D": "It has been given in other classes."},
                 "answer": "A", "analysis": "valuable insights for your upcoming group project。"}
            ]
        },
        {
            "type": "announcement",
            "module": 1,
            "title": "Business Independent Study",
            "code": "A03",
            "instruction": "Listen to an announcement.",
            "audio": AUD + "/Set1-L-ANO3.mp3",
            "transcript": "As you know, this is the final course required for your business degree. The course will operate as an independent study. You will each select an area of focus that interests you. Some examples are available on my website. Then, every week, you'll be required to submit short essays that respond to questions I give you on this topic. You'll need to refer to what you've learned in your other business courses so you can cite theories or strategies that support your responses.",
            "questions": [
                {"id": 1, "stem": "What is available on the speaker's website?",
                 "options": {"A": "Some topic ideas", "B": "Some examples of essays", "C": "An updated course schedule", "D": "A new degree requirement"},
                 "answer": "A", "analysis": "Some examples are available on my website，网站上是选题示例。"},
                {"id": 2, "stem": "Where should the listeners look for theories and strategies?",
                 "options": {"A": "In books assigned by the speaker", "B": "In work from previous classes", "C": "In the university library", "D": "On an academic website"},
                 "answer": "B", "analysis": "refer to what you've learned in your other business courses，到以往商科课里找理论。"}
            ]
        },
        {
            "type": "lecture",
            "module": 1,
            "title": "Bicycle Turning and Inertia",
            "code": "AT1",
            "instruction": "Listen to a lecture.",
            "audio": AUD + "/Set1-L-AT1.mp3",
            "transcript": "We've been talking about the law of inertia: an object moving in a straight line will continue to move in a straight line unless it is acted upon by another force. When you are on a moving bicycle, inertia will keep you going in a straight line. Why don't you just turn the front wheel in the direction you want to turn? In fact, if you only turn the front wheel, you are likely to end up on the pavement. The wheel will turn, but because of inertia, your body and the rest of the bike keep moving straight ahead. How does a cyclist avoid this? The key is to lean in. Weight needs to shift in the direction of the turn so that the force of gravity can work against the force of inertia. Professional cyclists who move at high speeds lean more to keep their bicycles from sliding out of turns, but not too much. At a certain point too much lean can pull both rider and bicycle down to the ground.",
            "questions": [
                {"id": 1, "stem": "What is the purpose of the talk?",
                 "options": {"A": "To show how easy it is to conduct a physics experiment", "B": "To describe the discovery of a law of physics", "C": "To explain how inertia affects bicycle turning", "D": "To compare walking and cycling"},
                 "answer": "C", "analysis": "用自行车转弯说明惯性。"},
                {"id": 2, "stem": "What does the speaker suggest about turning a bicycle?",
                 "options": {"A": "It is more complicated than it first appears.", "B": "It is the hardest skill to learn.", "C": "It is easier to turn right than left.", "D": "It is important to go slowly."},
                 "answer": "A", "analysis": "只转车把会摔倒，说明比看起来复杂。"},
                {"id": 3, "stem": "What does leaning in help a cyclist to do?",
                 "options": {"A": "Go faster", "B": "Avoid falling down", "C": "Stop more quickly", "D": "See around corners"},
                 "answer": "B", "analysis": "lean in 让重力对抗惯性，避免摔到路面。"},
                {"id": 4, "stem": "What do professional cyclists try to do when turning?",
                 "options": {"A": "Slide out significantly on some turns in the road", "B": "Keep relatively upright at high speeds", "C": "Lean enough to stay in the turn but not so much that they fall", "D": "Turn only the front wheel"},
                 "answer": "C", "analysis": "高速要多倾斜但不能过度，否则人车都会倒。"}
            ]
        }
    ]
}

writing = {
    "id": "set-1",
    "title": "Set 1 · Writing",
    "set": "1",
    "skill": "writing",
    "modules": [
        {"n": 1, "timeSec": 480, "from": 1, "to": 10, "label": "Sentence"},
        {"n": 2, "timeSec": 420, "from": 11, "to": 11, "label": "Email"},
        {"n": 3, "timeSec": 600, "from": 12, "to": 12, "label": "Discussion"}
    ],
    "tasks": [
        sent(1, "I saw a job posting for a part-time position at the student bookstore.", "Have you applied for it yet?"),
        sent(2, "I'm thinking of applying for a scholarship.", "Have you started the application process?"),
        sent(3, "She sent out the meeting notes this morning.", "Do you know if she included the schedule?"),
        sent(4, "Our group is presenting in seminar tomorrow.", "What will you be discussing?"),
        sent(5, "I have a paper due next week.", "What topic are you writing about?"),
        sent(6, "There's a basketball game tonight.", "What time does the game start?"),
        sent(7, "Did you finish the lab report?", "I was not able to complete it before the deadline."),
        sent(8, "The professor might extend the assignment.", "Do you know if the new due date has been announced?"),
        sent(9, "Did you read the article I sent you?", "Sorry, but I have not had time to look at it yet."),
        sent(10, "Why can't you attend the workshop?", "The dates when it is scheduled conflict with my other commitments."),
        {
            "type": "email",
            "module": 2,
            "id": 11,
            "instruction": "Write an email. In your email, do the following:",
            "prompt": "You are part of your school's drama club and have been assigned the role of event coordinator for an upcoming play. You need to arrange for promotional materials, such as posters and flyers, to be printed and distributed. You want to contact a local print shop to discuss this.",
            "bullets": [
                "Describe the event and why the printing is important.",
                "Ask about their services for printing promotional materials.",
                "Inquire about the costs and turnaround time for printing."
            ],
            "to": "Ms. Clark",
            "subject": "Printing Services for Upcoming Play",
            "sample": "Dear Ms. Clark,\n\nI am the event coordinator for our school's drama club. We will stage a play at the end of next month. The play is one of the biggest campus events of the year, and we expect several hundred students and faculty members to attend. To promote it, we need posters and flyers printed and distributed around campus.\n\nCould you tell me whether your shop handles promotional printing for school events? We would also like to know your pricing for about fifty A2 posters and three hundred A4 flyers, as well as your turnaround time, since our publicity campaign starts in two weeks.\n\nThank you for your time, and I look forward to your reply.\n\nBest regards,\nAlex Chen",
            "analysis": "邮件需覆盖三点：活动与印刷重要性、能否做宣传印刷、价格与工期。称呼 Ms. Clark，结尾用 Best regards。"
        },
        {
            "type": "discussion",
            "module": 3,
            "id": 12,
            "class": "History 210",
            "instruction": "Write a discussion response. An effective response contains at least 100 words.",
            "professor": {
                "name": "Professor",
                "text": "Some historians believe that individuals such as political leaders or influential thinkers have a greater impact on historical progress than broader social and economic forces. Others argue that social and economic events are the primary drivers of historical change. In your opinion, which has a greater influence on shaping history: individual actions or broader social and economic forces? Why?"
            },
            "posts": [
                {"name": "Andrew", "text": "Great individuals, such as political leaders or leaders of social movements, create significant changes and leave a lasting legacy."},
                {"name": "Kelly", "text": "In my opinion, broader social and economic events are more significant in shaping history. While individuals can influence events, it is the underlying conditions and trends that drive major changes."}
            ],
            "sample": "I believe individuals and social forces work together, but social and economic forces set the stage. For example, the American civil rights movement did not succeed only because of Martin Luther King's talent; it succeeded because millions of ordinary people were ready for change and the economy and media of the time amplified their voices. Without those social forces, even the most gifted individual would have been ignored. That said, individuals matter at the decisive moment: a leader gives a movement direction and courage at critical points. Social forces create the possibility of change, while influential individuals decide its shape and timing. Neither alone is enough to drive history forward.",
            "analysis": "需表明立场并回应对方。较好答法：社会力量提供条件，关键人物决定时机与方向，并举例。"
        }
    ]
}

speaking = {
    "id": "set-1",
    "title": "Set 1 · Speaking",
    "set": "1",
    "skill": "speaking",
    "modules": [
        {"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"},
        {"n": 2, "timeSec": 360, "from": 8, "to": 11, "label": "Interview"}
    ],
    "tasks": []
}

gym = "You are working at your university's fitness center. Your manager is training you to assist customers at the center. Listen to the manager and repeat what the manager says. Repeat only once."
gym_lines = [
    "Cardio machines and bikes are over here.",
    "The weight room provides dumbbells and benches.",
    "Our yoga studio offers classes for all fitness levels.",
    "Locker rooms contain storage bins and changing facilities.",
    "Enjoy our smoothie bar and sample nutritious drinks and snacks.",
    "Personal trainers are available for individual guidance.",
    "Before you leave, check the gym floor plan for specific areas and equipment."
]
for i, line in enumerate(gym_lines, 1):
    speaking["tasks"].append({
        "type": "repeat",
        "module": 1,
        "id": i,
        "speakSec": 15,
        "instruction": gym,
        "audio": AUD + "/Set1-S-LR1 (Gym).mp3",
        "sample": line,
        "analysis": "复述：" + line
    })

iv = [
    "Do you use any tools or techniques to manage your time effectively? Please give some examples.",
    "Can you describe a typical day's events for you and how you organize your time?",
    "Tell me about a time when you had to manage multiple tasks or responsibilities at once. How did you handle it?",
    "Some people believe that managing your time wisely can lead to higher productivity, while others think it can cause unnecessary stress and prefer a looser schedule. What is your opinion on this? Why?"
]
for i, q in enumerate(iv, 1):
    speaking["tasks"].append({
        "type": "interview",
        "module": 2,
        "id": 7 + i,
        "speakSec": 45,
        "instruction": "Listen to the question, then respond.",
        "audio": "%s/Set1-S-IV1 (Time Management) Q%d.mp3" % (AUD, i),
        "stem": q,
        "sample": q,
        "analysis": "围绕时间管理作答，给出具体例子。"
    })

os.makedirs(OUT, exist_ok=True)
dump("set-1-reading.json", reading)
dump("set-1-listening.json", listening)
dump("set-1-writing.json", writing)
dump("set-1-speaking.json", speaking)

# one check: listening task count and CR answers
assert len(listening["tasks"]) == 21
assert len(reading["tasks"]) == 3
assert len(writing["tasks"]) == 12
assert len(speaking["tasks"]) == 11
print("ok")
