#!/usr/bin/env python3
"""Build Set 2 JSON from No.2 OCR. Sentence Q1–Q9 from 答案 contexts; Q10 from visible chips."""
import json
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from toefl_sent import scramble

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "app/library/toefl")
AUD = "library/toefl/audio"


def sent(i, context, answer, extra=None):
    words = answer.replace("?", "").replace(".", "").split()
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


def cr(n, stem, opts, ans, tr, analysis):
    letters = "ABCD"
    options = {letters[i]: opts[i] for i in range(4)}
    return {
        "type": "choose_response",
        "module": 1,
        "title": "LR%02d" % n,
        "titleZh": "听句选回应 %02d" % n,
        "code": "LR%02d" % n,
        "instruction": "Choose the best response.",
        "audio": "%s/Set2-L-CR%d.mp3" % (AUD, n),
        "questions": [{
            "id": n, "stem": stem, "options": options, "answer": ans,
            "transcript": tr, "analysis": analysis
        }]
    }


def conv(n, title, title_zh, audio_n, tr, qs):
    return {
        "type": "conversation",
        "module": 1,
        "title": title,
        "titleZh": title_zh,
        "code": "C%02d" % n,
        "instruction": "Listen to a conversation.",
        "audio": "%s/Set2-L-LCN%d.mp3" % (AUD, audio_n),
        "transcript": tr,
        "questions": qs
    }


def dump(name, obj):
    path = os.path.join(OUT, name)
    with open(path, "w") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(name, "tasks", len(obj["tasks"]))


reading = {
    "id": "set-2",
    "title": "Set 2 · Reading",
    "set": "2",
    "skill": "reading",
    "modules": [{"n": 1, "timeSec": 960, "from": 1, "to": 17}],
    "tasks": [
        {
            "type": "complete_words",
            "module": 1,
            "title": "Tigers",
            "titleZh": "老虎",
            "instruction": "Fill in the missing letters in the paragraph.",
            "translation": "老虎是独居动物，以领地行为著称；雄性用气味标记和叫声划定领地。每只雄虎控制着数平方英里的大片领地，并定期巡视以寻找猎物、维持主导地位。这种行为有助于减少因猎物产生的冲突，但必要时老虎会猛烈抵御入侵者。它们常在夜间狩猎，借助隐蔽和出色的夜视能力。",
            "passage": [
                {"t": "Tigers are solitary animals known for their territorial behavior; males use scent markings and vocalizations to define their territories. Each "},
                {"id": 1, "prefix": "ma", "answer": "le", "word": "male"},
                {"t": " tiger "},
                {"id": 2, "prefix": "estab", "answer": "lishes", "word": "establishes"},
                {"t": " control "},
                {"id": 3, "prefix": "ov", "answer": "er", "word": "over"},
                {"t": " a "},
                {"id": 4, "prefix": "la", "answer": "rge", "word": "large"},
                {"t": " territory "},
                {"id": 5, "prefix": "span", "answer": "ning", "word": "spanning"},
                {"t": " several "},
                {"id": 6, "prefix": "squ", "answer": "are", "word": "square"},
                {"t": " miles "},
                {"id": 7, "prefix": "a", "answer": "nd", "word": "and"},
                {"t": " patrols "},
                {"id": 8, "prefix": "t", "answer": "he", "word": "the"},
                {"t": " area "},
                {"id": 9, "prefix": "regu", "answer": "larly", "word": "regularly"},
                {"t": " to "},
                {"id": 10, "prefix": "lo", "answer": "ok", "word": "look"},
                {"t": " for prey and maintain dominance. This behavior helps reduce conflicts over prey, but tigers are known to fiercely defend their territory from intruders when necessary. Often hunting at night, tigers use stealth and their excellent night vision to their advantage."}
            ]
        },
        {
            "type": "daily_life",
            "module": 1,
            "title": "Introduction to Glassblowing",
            "titleZh": "玻璃吹制入门",
            "instruction": "Read a course description.",
            "layout": {
                "kind": "card",
                "kicker": "Course",
                "title": "Introduction to Glassblowing",
                "body": "This hands-on class introduces adults (18+) to the art of glassblowing. You'll learn safety, shaping, and design techniques while crafting your own unique work of glass art.\n\nNo experience needed — just curiosity and closed-toe shoes! Other safety-related equipment will be provided by the instructor.\n\nRegister now — spaces are limited!\nVisit www.alburcommunitycenter.com/glassblowing."
            },
            "questions": [
                {
                    "id": 1,
                    "stem": "Who can register for the course?",
                    "options": {
                        "A": "Anyone who is at least 18 years old",
                        "B": "Anyone who has worked with glass before",
                        "C": "Anyone who has read a book on glass art",
                        "D": "Anyone who is registered for classes at a university"
                    },
                    "answer": "A",
                    "analysis": "课程写 adults (18+)，年满 18 岁即可报名。"
                },
                {
                    "id": 2,
                    "stem": "It can be inferred that students should wear closed-toe shoes because",
                    "options": {
                        "A": "they are preferred by the instructor",
                        "B": "they offer protection during the process",
                        "C": "they are unique to the Albur community",
                        "D": "they help reduce the risk of falling"
                    },
                    "answer": "B",
                    "analysis": "与 safety-related equipment 并列，闭口鞋是保护。"
                }
            ]
        },
        {
            "type": "academic",
            "module": 1,
            "title": "Augmented Reality in Training",
            "titleZh": "增强现实培训",
            "instruction": "Read the passage.",
            "translation": "增强现实（AR）已成为人类绩效技术、尤其是培训领域的突破性工具。AR 将数字信息叠加到现实世界，提供沉浸式体验，促进学习与技能习得。例如，AR 可模拟复杂机械操作，让学员像亲临现场一样与虚拟部件互动。这种动手方式帮助学习者理解复杂流程，同时避免真实操作的风险。AR 的适应性使其适用于多个行业。医学中可投射人体解剖三维模型，引导外科医生完成复杂手术；航空中飞行员用 AR 练习应急程序，获得安全而真实的训练环境。研究表明这些应用显著提高记忆保持与表现。AR 还能按个人需求定制场景。但把 AR 纳入培训也面临挑战：硬件与软件投入巨大，制作准确、响应迅速的内容需要许多机构尚不具备的专业能力。尽管如此，AR 对提升人类绩效的益处毋庸置疑。随着技术演进，它有望提供更精密有效的培训方案。",
            "paras": [
                "Augmented reality (AR) has emerged as a groundbreaking tool in the field of human performance technology, particularly in training environments. AR overlays digital information on the real world, providing immersive experiences that enhance learning and skill acquisition. For example, AR can simulate complex machinery operations, allowing trainees to interact with virtual components as if they were physically present. This hands-on approach helps learners understand intricate processes without the risks associated with real-world practice.",
                "The adaptability of AR makes it suitable for various industries. In medicine, AR can project 3D models of human anatomy, guiding surgeons through complex procedures. In aviation, pilots use AR to practice emergency protocols, offering a safe yet realistic training environment. Studies have shown that these AR applications significantly improve retention rates and performance outcomes. Moreover, AR's ability to customize training scenarios based on individual needs further enhances its effectiveness.",
                "However, integrating AR into training programs presents challenges. The technology requires substantial investment in hardware and software development. Additionally, creating accurate and responsive AR content demands expertise that many organizations may lack. Despite these hurdles, the benefits of AR in boosting human performance are undeniable. As the technology continues to evolve, it promises even more sophisticated and effective training solutions."
            ],
            "questions": [
                {
                    "id": 1,
                    "stem": "The word \"groundbreaking\" in the passage is closest in meaning to",
                    "options": {"A": "educational", "B": "practical", "C": "revolutionary", "D": "interesting"},
                    "answer": "C",
                    "analysis": "groundbreaking 意为开创性，最接近 revolutionary。"
                },
                {
                    "id": 2,
                    "stem": "What is the function of AR as described in the passage?",
                    "options": {
                        "A": "AR artificially enhances human performance.",
                        "B": "AR produces realistic experiences in a learning environment.",
                        "C": "AR enables unskilled humans to interact with complex machines.",
                        "D": "AR produces a digital record of real-world content."
                    },
                    "answer": "B",
                    "analysis": "原文 providing immersive experiences that enhance learning。"
                },
                {
                    "id": 3,
                    "stem": "AR reduces which of the following problems associated with traditional training environments?",
                    "options": {
                        "A": "Their inability to simulate authentic experiences",
                        "B": "Their physical dangers",
                        "C": "Their inaccessibility to many learners",
                        "D": "Their high financial costs"
                    },
                    "answer": "B",
                    "analysis": "without the risks associated with real-world practice。"
                },
                {
                    "id": 4,
                    "stem": "Why does the author cite studies showing that AR improves retention rates?",
                    "options": {
                        "A": "To demonstrate its usefulness when practicing emergency protocols",
                        "B": "To provide an example of its adaptability",
                        "C": "To explain why fields outside medicine and aviation are slower to adopt it",
                        "D": "To support the claim that it is useful to industries"
                    },
                    "answer": "D",
                    "analysis": "研究用来支撑 these AR applications 对行业培训有效。"
                },
                {
                    "id": 5,
                    "stem": "What is one problem the passage mentions related to the use of AR?",
                    "options": {
                        "A": "The costs associated with making it useful to particular clients",
                        "B": "Disagreement among experts regarding its accuracy",
                        "C": "A lack of measurable benefits in its present stage of development",
                        "D": "The absence of existing training programs into which it may be integrated"
                    },
                    "answer": "A",
                    "analysis": "substantial investment in hardware and software；定制内容也费钱费人。"
                }
            ]
        }
    ]
}

listening = {
    "id": "set-2",
    "title": "Set 2 · Listening",
    "set": "2",
    "skill": "listening",
    "modules": [{"n": 1, "timeSec": 1500, "from": 1, "to": 28}],
    "tasks": [
        cr(1, "Choose the best response.",
           ["Let's see what's on the agenda first.", "We need to send invitations.", "The club room is more spacious.", "Friday is better."],
           "A", "W: Should we invite the whole club or just the officers?",
           "问请全员还是只请干部。A 说先看议程再定。"),
        cr(2, "Choose the best response.",
           ["I need to clean them up first.", "I don't think Tim took notes either.", "Class ran long.", "I didn't expect so many people to be there."],
           "A", "W: Would you mind forwarding me the notes from yesterday's class?",
           "请转发笔记。A 说先整理一下再发。"),
        cr(3, "Choose the best response.",
           ["Yes, I need them immediately.", "I have no idea where I left them.", "No, it's actually quite far from here.", "You can put them in here."],
           "B", "W: Can I borrow your headphones to listen to the recorded lecture?",
           "借耳机。B 说不知道耳机放哪了。"),
        cr(4, "Choose the best response.",
           ["I enjoyed our conversation.", "I had a meeting yesterday.", "What time is lunch?", "Yes, the forecast states clear skies."],
           "D", "It should be nice weather for the hiking club's trip today.",
           "说徒步天气不错。D 说预报是晴天。"),
        cr(5, "Choose the best response.",
           ["Friday is casual day.", "Most students are home for the break.", "The calendar is shared with all students.", "The air conditioning is very loud."],
           "B", "Why is campus so quiet today?",
           "问校园为何安静。B 说多数学生放假回家了。"),
        cr(6, "Choose the best response.",
           ["We grabbed dinner before the concert.", "I will see my friends there.", "The band played some great songs.", "Ticket prices will go up next month."],
           "C", "Did the campus concert meet your expectations?",
           "问音乐会是否达预期。C 说乐队演奏很好。"),
        cr(7, "Choose the best response.",
           ["They're not in this section.", "Yes, she prefers fiction.", "The Second World War.", "I'm in the library."],
           "A", "Where can I find the books on history?",
           "问历史书在哪。A 说不在这个区域。"),
        cr(8, "Choose the best response.",
           ["There's a good Thai restaurant near campus.", "I had to eat my lunch during class.", "I haven't eaten there.", "I had leftovers for dinner yesterday."],
           "A", "Which restaurant do you recommend for dinner?",
           "请推荐餐厅。A 推荐校园附近的泰国餐馆。"),
        cr(9, "Choose the best response.",
           ["Yes, sometimes I do.", "You should update before you run into problems.", "The new version has been out for just a month or so I think.", "I'm having trouble getting used to the new one, honestly."],
           "D", "Do you prefer the new or old version of our course website?",
           "问更喜欢新旧版课程网站。D 说还不习惯新版。"),
        cr(10, "Choose the best response.",
           ["Two blocks over, why?", "It's on campus.", "I move in next week.", "I'll give them a call."],
           "B", "Why did you select this dorm?",
           "问为何选这栋宿舍。B 说因为它在校内。"),
        cr(11, "Choose the best response.",
           ["I left my yoga mat in the car.", "I downloaded a fitness app.", "I look forward to going to all of the classes now.", "They make delicious health shakes at the gym cafe."],
           "C", "How's your new yoga instructor?",
           "问新瑜伽老师怎么样。C 说现在很期待每节课。"),
        cr(12, "Choose the best response.",
           ["No, I don't mind if you borrow it.", "They purchased the new printer last week.", "We should receive our grades tomorrow.", "Yes, it was very insightful."],
           "D", "Did you find the leadership seminar impactful?",
           "问领导力讲座是否有收获。D 说很有启发。"),
        conv(1, "Getting in Shape", "健身动力", 1,
             "I've been trying to get in shape, but I'm not having much success. You know a lot about fitness. What am I doing wrong? The most important thing is staying motivated. Yes, that's been a problem for me. You should set small, achievable goals. Seeing your progress can be very motivating. I see what you're saying. Have you thought about joining a class? Working out with others can keep you motivated and accountable. It's a great idea. I'll go online now and see what's available.",
             [
                 {"id": 1, "stem": "What is the man's problem?",
                  "options": {"A": "He lacks the incentive to exercise regularly.", "B": "He cannot find a gym he likes.", "C": "A class he wanted to join has been canceled.", "D": "He set a goal he could not achieve."},
                  "answer": "A", "analysis": "他说 that's been a problem 指 staying motivated，缺少持续锻炼的动力。"},
                 {"id": 2, "stem": "What will the man most likely do next?",
                  "options": {"A": "Invite the woman to work out with him", "B": "Review his list of fitness goals", "C": "Make an appointment with a personal trainer", "D": "Choose from a list of fitness classes"},
                  "answer": "D", "analysis": "I'll go online now and see what's available，去网上看课程。"}
             ]),
        conv(2, "Campus Chess Club", "校园棋社", 2,
             "I heard you joined the Campus Chess Club. How's it going? Great! I'm learning a lot and meeting new people. I've always wanted to learn to play, but I've never tried. Is everyone pretty advanced? No, not necessarily. There are members of all skill levels. When do they meet? Every Saturday afternoon at the Student Center. I work at the library then. But they're very flexible, so I'm sure I could make it work.",
             [
                 {"id": 1, "stem": "What can be inferred about the Chess Club?",
                  "options": {"A": "It is run by the man.", "B": "It requires a small fee to join.", "C": "It accepts beginners.", "D": "It has very few members."},
                  "answer": "C", "analysis": "members of all skill levels，接受初学者。"},
                 {"id": 2, "stem": "Based on the conversation, what will the woman most likely do?",
                  "options": {"A": "Change her schedule", "B": "Volunteer with the man", "C": "Help the man get a job at the library", "D": "Return a book"},
                  "answer": "A", "analysis": "周六下午要在图书馆上班，但社团灵活，她会调整时间参加。"}
             ]),
        conv(3, "Dormitory Fees", "宿舍涨价", 3,
             "I just interviewed the director of campus housing for the University newspaper and she confirmed the rumors. The cost to live in the dormitories will increase 10 percent. I don't know if it makes sense to stay. I'm looking for an apartment or something that's not on campus. That's what I'm planning to do. If I come across any good ones while I'm looking, I'll pass them along to you. Awesome, thanks.",
             [
                 {"id": 1, "stem": "What information did the man just learn about?",
                  "options": {"A": "A price increase", "B": "A newspaper club meeting", "C": "A new dormitory building", "D": "A new housing director"},
                  "answer": "A", "analysis": "宿舍费用将上涨 10%。"},
                 {"id": 2, "stem": "What is the man planning to do?",
                  "options": {"A": "Speak with a university official", "B": "Make a payment", "C": "Read a newspaper article", "D": "Find off-campus housing"},
                  "answer": "D", "analysis": "That's what I'm planning to do 指找校外公寓。"}
             ]),
        conv(4, "Tutoring Appointment", "辅导预约", 4,
             "Hi, this is Sarah calling from the Campus Tutoring Center. I just wanted to confirm your biology session with Raoul tomorrow at noon. I'm glad you called. My manager at work needs me to go in tomorrow. I get off at three. Hmm, okay, let me check the schedule. Raoul's not available at that time, but I can put you in with Kara at 3:30. That'd be perfect. I worked with her before, and she's great. Thank you.",
             [
                 {"id": 1, "stem": "Why is the woman calling the man?",
                  "options": {"A": "To provide a reminder", "B": "To cancel an appointment", "C": "To review a work schedule", "D": "To discuss a job opportunity"},
                  "answer": "A", "analysis": "Sarah 打电话确认明天中午的生物辅导。"},
                 {"id": 2, "stem": "Why does the man say that he gets off at 3:00?",
                  "options": {"A": "To confirm a request", "B": "To suggest an alternative", "C": "To ask a question", "D": "To clarify a misunderstanding"},
                  "answer": "B", "analysis": "他中午去不了，提出三点下班后再约，是在给替代时间。"}
             ]),
        conv(5, "Broken Laptop", "电脑故障", 5,
             "I was just typing my paper and my computer suddenly shut down. You've had a lot of problems with that laptop, haven't you? Yeah. Have you tried holding down the power button for a few seconds? I did, but nothing happened. I'd rather not take it to a repair shop, but I don't know what else to do. How about I get in touch with my ex-roommate, Monica? She's a real tech whiz. Oh, that's an idea. Could you give me her number? I'm not sure I have it anymore.",
             [
                 {"id": 1, "stem": "What is the man's problem?",
                  "options": {"A": "He does not know what to write about in his paper.", "B": "An item he wants to buy is too expensive.", "C": "He has a disagreement with his roommate.", "D": "His computer is not working."},
                  "answer": "D", "analysis": "电脑突然关机，按电源键也没用。"},
                 {"id": 2, "stem": "At the end of the conversation, what is the man's attitude toward the woman's idea?",
                  "options": {"A": "Confused", "B": "Annoyed", "C": "Hopeful", "D": "Doubtful"},
                  "answer": "C", "analysis": "Oh, that's an idea. Could you give me her number? 对找 Monica 抱有希望。"}
             ]),
        {
            "type": "announcement",
            "module": 1,
            "title": "Student Organization Policy",
            "titleZh": "社团活动审批",
            "code": "A01",
            "instruction": "Listen to an announcement.",
            "audio": AUD + "/Set2-L-ANO1.mp3",
            "transcript": "The university is making some changes to the policies governing student organizations. One of these changes pertains to scheduling events at the last minute. This creates extra work for the student affairs office, and so, effective immediately, all student events must receive approval a week in advance. Failure to comply with this rule may result in the cancellation of events. If you have questions, please contact the student affairs office.",
            "questions": [
                {"id": 1, "stem": "What can be inferred about the new policy?",
                 "options": {"A": "It aims to reduce the number of student events.", "B": "It is designed to ensure proper event planning.", "C": "It will be enforced starting next semester.", "D": "It was implemented because of budget cuts."},
                 "answer": "B", "analysis": "针对 last-minute 安排，要求提前一周审批，是为了规范筹备。"},
                {"id": 2, "stem": "What can be concluded about previously held events?",
                 "options": {"A": "They were sometimes submitted for approval at the last minute.", "B": "They were often canceled because of poor planning.", "C": "They did not involve the Student Affairs Office.", "D": "They usually created extra work for student clubs."},
                 "answer": "A", "analysis": "新规针对临时申报，说明以前常有最后一刻才报批的活动。"}
            ]
        },
        {
            "type": "announcement",
            "module": 1,
            "title": "Fashion Design Internship",
            "titleZh": "服装设计实习",
            "code": "A02",
            "instruction": "Listen to an announcement.",
            "audio": AUD + "/Set2-L-ANO2.mp3",
            "transcript": "I have an exciting opportunity for all fashion design majors. We'll be working with an up-and-coming business downtown that focuses solely on young adult clothing. If you're in your second year or higher, you can apply for an internship with them, with the possibility of being hired once you graduate. They're also accepting design submissions for their company logo. Visit their website for details.",
            "questions": [
                {"id": 1, "stem": "What can we infer about the business mentioned by the speaker?",
                 "options": {"A": "It has been open for many years.", "B": "It was started by a fashion design student at the university.", "C": "It targets a narrow market.", "D": "It is moving to a new location."},
                 "answer": "C", "analysis": "focuses solely on young adult clothing，面向窄市场。"},
                {"id": 2, "stem": "Why should listeners visit the website?",
                 "options": {"A": "To purchase young adult clothing", "B": "To view a new logo", "C": "To learn about a contest", "D": "To provide some feedback"},
                 "answer": "C", "analysis": "还在征集公司 logo 设计，网站有比赛详情。"}
            ]
        },
        {
            "type": "announcement",
            "module": 1,
            "title": "Fitness Center Closing",
            "titleZh": "健身中心关闭",
            "code": "A03",
            "instruction": "Listen to an announcement.",
            "audio": AUD + "/Set2-L-ANO3.mp3",
            "transcript": "Attention! The fitness center will be closing in two minutes. Please wrap up your workouts. Remember to return all dumbbells, bars, and other items to their proper places. As a reminder, we'll be closed for our clean-up day tomorrow. But we'll see you again Saturday morning. Have a good night and a safe trip home.",
            "questions": [
                {"id": 1, "stem": "What are visitors asked to do?",
                 "options": {"A": "Clean any items they have used", "B": "Renew their fitness membership", "C": "Prepare for a workout in two minutes", "D": "Put exercise equipment in the correct locations"},
                 "answer": "D", "analysis": "return all dumbbells, bars, and other items to their proper places。"},
                {"id": 2, "stem": "What is mentioned about tomorrow?",
                 "options": {"A": "The fitness center will be closed.", "B": "The fitness center will hire additional employees.", "C": "The dumbbells in the fitness center will be replaced.", "D": "A new morning class will begin at the fitness center."},
                 "answer": "A", "analysis": "closed for our clean-up day tomorrow。"}
            ]
        },
        {
            "type": "lecture",
            "module": 1,
            "title": "Lean Startup and MVP",
            "titleZh": "精益创业与最小可行产品",
            "code": "AT1",
            "instruction": "Listen to a lecture.",
            "audio": AUD + "/Set2-L-AT1.mp3",
            "transcript": "When launching a new business, entrepreneurs face countless decisions, from choosing a target market to deciding which features to include in their first product. These choices can be overwhelming, especially when resources are limited and customer feedback is scarce. To address these challenges, some startups adopt a strategy that emphasizes speed, experimentation, and customer feedback. This approach, known as the Lean Startup methodology, was popularized by Eric Ries and has gained traction in the tech world and beyond. One of its core practices is building a Minimum Viable Product, or MVP. This is a basic version of a new product released quickly to gather feedback from early users. The goal is to learn what works and what doesn't, so that future development is guided by actual user experience rather than assumptions. Another key idea is validated learning: teams test their ideas by putting the product out in the real world. This helps them figure out whether their product actually meets the needs of their customers. In all fairness, I should point out that this approach isn't perfect. Rapid iteration and constant change can sometimes lead to confusion or a lack of clear direction, and in the pursuit of efficiency, some teams may cut corners which could affect product quality. Still, many entrepreneurs find the lean startup methodology helpful for navigating the uncertainties of launching a new product.",
            "questions": [
                {"id": 1, "stem": "What is the main topic of the talk?",
                 "options": {"A": "The benefits of traditional market research", "B": "The principles of the lean start-up methodology", "C": "An approach to making business decisions", "D": "The challenges of product development"},
                 "answer": "B", "analysis": "整段在讲 Lean Startup 方法及其核心做法。"},
                {"id": 2, "stem": "According to the talk, what is a minimum viable product, or MVP?",
                 "options": {"A": "A concept created to attract funding before product development", "B": "A version of a product used for internal testing only", "C": "A basic version of a product that can be released quickly", "D": "A product with complete features designed for final release"},
                 "answer": "C", "analysis": "a basic version of a new product released quickly to gather feedback。"},
                {"id": 3, "stem": "What does the speaker imply about validated learning?",
                 "options": {"A": "It helps ensure that the product meets buyers' needs.", "B": "It is less effective than traditional methods.", "C": "It involves surveying a large number of customers.", "D": "It relies on extensive market research."},
                 "answer": "A", "analysis": "把产品放到真实市场检验，看是否满足顾客需求。"},
                {"id": 4, "stem": "Why does the speaker mention the drawbacks of the lean start-up approach?",
                 "options": {"A": "To show that the approach is not suitable for all businesses", "B": "To contrast the approach with traditional product-development methods", "C": "To provide a balanced view of the approach", "D": "To suggest that drawbacks should be addressed from an early stage"},
                 "answer": "C", "analysis": "In all fairness ... isn't perfect，补充局限以保持平衡。"}
            ]
        }
    ]
}

writing = {
    "id": "set-2",
    "title": "Set 2 · Writing",
    "set": "2",
    "skill": "writing",
    "modules": [
        {"n": 1, "timeSec": 480, "from": 1, "to": 10, "label": "Sentence"},
        {"n": 2, "timeSec": 420, "from": 11, "to": 11, "label": "Email"},
        {"n": 3, "timeSec": 600, "from": 12, "to": 12, "label": "Discussion"}
    ],
    "tasks": [
        sent(1, "I've been studying French for a few months now.", "How is it going so far?"),
        sent(2, "Where did you buy those shoes for gym class?", "I got them at the campus store."),
        sent(3, "You missed the first part of the lecture this morning.", "Can you tell me what I missed?"),
        sent(4, "Are you coming to the biology seminar tomorrow?", "Yes, I plan to be there."),
        sent(5, "Why did you choose that science course?", "It seemed like a good fit for my major."),
        sent(6, "Did you see anyone in the lecture hall for the review session?", "No, the room was completely empty."),
        sent(7, "I'm going to visit the new library on campus.", "Would you like me to go with you?"),
        sent(8, "What did Williams say about the project?", "He wants us to submit it next week."),
        sent(9, "Where did you put the class notes?", "I left them on the kitchen table."),
        {
            "type": "sentence",
            "module": 1,
            "id": 10,
            "context": "Did you attend the class picnic last weekend?",
            "parts": [{"slot": True}] * 6 + [{"t": "."}],
            "bank": ["it", "I", "make", "to", "able", "wasn't"],
            "answer": ["I", "wasn't", "able", "to", "make", "it"],
            "analysis": "正确顺序：I wasn't able to make it."
        },
        {
            "type": "email",
            "module": 2,
            "id": 11,
            "title": "Car Rental Feedback",
            "titleZh": "租车反馈",
            "instruction": "Write an email. In your email, do the following:",
            "prompt": "You recently rented a car for a weekend trip with your dorm mate and were satisfied with the vehicle's performance. However, you had a bad experience with the customer service at the rental office. You want to provide feedback to the rental company manager, Ms. Turner.",
            "bullets": [
                "Explain what features of the car you liked most.",
                "Describe the issues that occurred during your customer service experience.",
                "Suggest ways to improve the pick-up and drop-off process."
            ],
            "to": "Ms. Turner",
            "subject": "Feedback on Car Rental Experience",
            "sample": "Dear Ms. Turner,\n\nI recently rented a compact car for a weekend trip and was satisfied with the vehicle itself. It was clean, easy to park, and used less fuel than I expected, which made the trip more comfortable.\n\nUnfortunately, the customer service at the rental office was not as reliable. At pick-up we waited more than forty minutes, and the staff could not find our reservation until we showed the confirmation email. At drop-off, nobody was available to inspect the car, so we were unsure whether the return had been recorded.\n\nA simple check-in list, a visible queue number, and a short drop-off confirmation would prevent this confusion. I hope this feedback helps the office match the quality of the cars you provide.\n\nSincerely,\n[Your Name]",
            "analysis": "邮件需覆盖三点：喜欢的车况、客服问题、取还车改进。称呼 Ms. Turner。"
        },
        {
            "type": "discussion",
            "module": 3,
            "id": 12,
            "title": "Brand Loyalty",
            "titleZh": "品牌忠诚度",
            "class": "Marketing 210",
            "instruction": "Write a discussion response. An effective response contains at least 100 words.",
            "professor": {
                "name": "Dr. Gupta",
                "text": "We've been discussing various strategies to build brand loyalty. One effective strategy is offering personalized services and products to customers. Personalization can make customers feel valued and understood. Do you think personalization is the key to building strong brand loyalty? Why or why not?"
            },
            "posts": [
                {"name": "Claire", "text": "Personalization makes customers feel valued and more likely to stick with the brand. It creates a unique customer experience that sets the brand apart from competitors."},
                {"name": "Andrew", "text": "In my opinion, while personalization is important, it's not the only factor in building brand loyalty. Other aspects like customer service, product quality, and pricing also play a significant role. A balanced approach is needed to maintain strong brand loyalty."}
            ],
            "sample": "I agree with Andrew that personalization helps, but it is not the only key to brand loyalty. Personalized recommendations can make a customer feel recognized, as Claire says, and streaming services show how that unique experience keeps people subscribed. Still, if the product is unreliable or the price jumps without warning, even a perfectly tailored homepage will not keep buyers. In my experience, loyalty lasts when personalization is paired with consistent quality and responsive service. A store that remembers my size but ships damaged goods will lose me; a brand that gets both right is much harder to leave. So personalization is a strong tool, not the whole strategy.",
            "analysis": "需表态并回应对方。较好答法：个性化有用，但质量、服务、价格同样关键，并举例。"
        }
    ]
}

speaking = {
    "id": "set-2",
    "title": "Set 2 · Speaking",
    "set": "2",
    "skill": "speaking",
    "modules": [
        {"n": 1, "timeSec": 240, "from": 1, "to": 7, "label": "Listen and Repeat"},
        {"n": 2, "timeSec": 360, "from": 8, "to": 11, "label": "Interview"}
    ],
    "tasks": []
}

wood = "You are learning to guide new students on how to use tools in a woodworking class. Listen to the speaker and repeat what she says. Repeat only once."
wood_lines = [
    "Welcome to the wood shop.",
    "This tool box contains everything you should need.",
    "You will learn to use your saw in our classes.",
    "Your screwdriver can be used with all of our carpentry machines.",
    "All wood will need to be smooth, so use the sand paper provided.",
    "Use only what is needed so that your supplies last all quarter.",
    "Before you leave the classroom, be sure you put all your tools back into the tool box."
]
for i, line in enumerate(wood_lines, 1):
    speaking["tasks"].append({
        "type": "repeat",
        "module": 1,
        "id": i,
        "title": "Wood Shop",
        "titleZh": "木工坊",
        "speakSec": 15,
        "instruction": wood,
        "audio": AUD + "/Set2-S-LR2.mp3",
        "sample": line,
        "analysis": "复述：" + line
    })

iv = [
    "What kind of transportation do your family or friends generally prefer when they travel? For example, do they like boats, buses, trains, cars, or planes?",
    "What do you think of the public transportation system in the place you live? Tell me one thing you especially like or dislike.",
    "In recent years, there has been a push toward working from home instead of in an office building. Do you think that in the future more people will work from home? Why or why not?",
    "Some people believe that improving public transportation systems is essential for reducing traffic congestion and pollution in cities. Do you agree, or do you think there are other solutions? Explain why."
]
for i, q in enumerate(iv, 1):
    speaking["tasks"].append({
        "type": "interview",
        "module": 2,
        "id": 7 + i,
        "title": "Transportation Habits",
        "titleZh": "交通习惯",
        "speakSec": 45,
        "instruction": "Listen to the question, then respond.",
        "audio": "%s/Set2-S-IV2-Q%d.mp3" % (AUD, i),
        "stem": q,
        "sample": q,
        "analysis": "围绕交通习惯作答，给出具体例子。"
    })

os.makedirs(OUT, exist_ok=True)
dump("set-2-reading.json", reading)
dump("set-2-listening.json", listening)
dump("set-2-writing.json", writing)
dump("set-2-speaking.json", speaking)

assert len(listening["tasks"]) == 21
assert len(reading["tasks"]) == 3
assert len(writing["tasks"]) == 12
assert len(speaking["tasks"]) == 11
print("ok")
