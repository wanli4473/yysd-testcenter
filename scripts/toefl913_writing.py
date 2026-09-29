#!/usr/bin/env python3
"""TOEFL 9.13 China Offline writing. Source: writing-01..07.png, answers-13..16.png."""

IMG = "library/toefl/img/2025-09-02/"


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
        "id": "2025-09-13",
        "title": "新托福 9.13 · 写作",
        "set": "9.13",
        "skill": "writing",
        "modules": [
            {"n": 1, "timeSec": 1680, "from": 1, "to": 4, "label": "Email"},
            {"n": 2, "timeSec": 1800, "from": 5, "to": 7, "label": "Academic Discussion"},
        ],
        "tasks": [
            email(
                1,
                1,
                "The final exam in your chemistry class is coming soon. You want to organize a study session with your classmates to prepare for the exam. You need to invite your classmates and also provide some ideas about how to make the study session effective.",
                [
                    "Invite them to join the study session.",
                    "Suggest a time and place for the meeting.",
                    "Provide some suggestions for an effective study session.",
                ],
                "Chemistry Class",
                "Let's study for the final exam",
                "Hi Classmates,\n\nI'd like to invite you to a study session for our chemistry final. Working through difficult questions together could help us identify gaps that we might overlook when studying alone. Would Saturday from two to four in the afternoon work for you? I suggest meeting in a library group study room, where we can explain solutions without disturbing other students.\n\nPlease review your notes beforehand and bring two problems you found challenging. We could take turns explaining our methods, then compare the steps and discuss any disagreements. It would also help if everyone brought the course formula sheet so we could check which equations apply.\n\nLet me know whether you can attend and which topics you would most like to review. If Saturday is inconvenient, please suggest another time.\n\nBest,\n[Your Name]",
            ),
            email(
                2,
                1,
                "You are a member of a local gym called Fitness Zone. Recently, you have noticed that some of the exercise equipment is problematic. You want to suggest this to the gym manager, Ms. Taylor.",
                [
                    "Describe the issues you have noticed with the current equipment.",
                    "Provide reasons for why adding new equipment would improve the gym experience.",
                    "Explain the consequences on membership of not improving the services.",
                ],
                "Ms. Taylor",
                "Suggestion for updating gym equipment",
                "Dear Ms. Taylor,\n\nI am writing to suggest some equipment improvements at Fitness Zone. I have noticed that one treadmill sometimes stops unexpectedly, and the resistance control on an exercise bike does not respond consistently. These problems interrupt workouts and make it difficult to use the equipment confidently.\n\nReplacing unreliable machines and adding another adjustable bike would improve the experience. Members could follow their planned routines more easily instead of waiting for the few machines that work properly. Equipment with clear controls would also be helpful for people who are new to the gym.\n\nIf these issues continue, some members may decide that their membership is no longer worthwhile and look elsewhere. Could you arrange an inspection and let members know what improvements are planned?\n\nThank you for considering this feedback.\n\nKind regards,\n[Your Name]",
            ),
            email(
                3,
                1,
                "You attended a seminar on communication skills.",
                [
                    "Explain why the seminar was valuable.",
                    "Ask for additional communication resources.",
                    "Thank her.",
                ],
                "Ms. Johnson",
                "",
                "Dear Ms. Johnson,\n\nThank you for the communication seminar. I particularly appreciated the opportunity to think about how a message might sound to its listener, rather than focusing only on what the speaker intends to say. That distinction will be useful when I discuss responsibilities with classmates during group projects.\n\nThe seminar also encouraged me to ask a clarifying question before responding to something I do not understand. I sometimes start giving my opinion too quickly, so this is a practical habit I would like to develop.\n\nCould you recommend additional resources for practicing these skills? A short guide with sample conversations or exercises would be especially helpful because I could work through it with a partner.\n\nI appreciate the time and effort you put into the seminar. Thank you again for making the material relevant to everyday situations.\n\nSincerely,\n[Your Name]",
            ),
            email(
                4,
                1,
                "The cooking club's Wednesday evening meeting conflicts with your schedule. Write an email to Lily, the club president, asking her to adjust the meeting time.",
                [],
                "Lily",
                "",
                "Hi Lily,\n\nI am writing about the cooking club's Wednesday evening meetings. I would really like to participate, but that time conflicts with another commitment on my schedule. I cannot attend the full session, and arriving halfway through would mean missing the preparation steps that the rest of the group has already completed.\n\nWould it be possible to consider a different meeting time? Tuesday or Thursday evening would work better for me. I realize the schedule needs to suit the other members as well, so perhaps we could ask everyone about their availability before making a change. I would be happy to help collect their responses.\n\nIf changing the regular time is not practical, could we occasionally hold a session on another evening? I would appreciate any option that allows me to join more fully.\n\nThanks,\n[Your Name]",
            ),
            discussion(
                5,
                2,
                "Class Discussion",
                DISC_INSTR,
                person(
                    "Professor Gupta",
                    "diaz.png",
                    "We've been discussing the impact of parental involvement on student achievement. Some studies suggest that active parental involvement, such as helping with homework and attending school events, boosts student performance in both the long term and short term. Other scholars have argued that too much parental involvement can lead to dependency and hinder the development of self-reliance among children. What are your thoughts on this?",
                ),
                [
                    person(
                        "Claire",
                        "kelly.png",
                        "I believe active parental involvement is beneficial for children in general and student achievement in particular. For myself and for my friends, this has certainly been the case. When parents show interest in their child's education, it can motivate the child to perform better and feel supported.",
                    ),
                    person(
                        "Andrew",
                        "andrew.png",
                        "Although I do see the benefits to parents being involved in their children's academic achievement, I think that too much parental involvement can be detrimental. It may prevent students from developing independence and problem-solving skills, which are crucial for their long-term success.",
                    ),
                ],
                [
                    {
                        "title": "Guiding, Not Completing",
                        "text": "Parental involvement is valuable when it helps students learn how to manage their own work. Claire emphasizes motivation, but parents can also teach practical routines that children have not yet developed. For instance, a parent could help a child divide a large assignment into manageable stages and decide when to complete each one. The child would still choose the ideas, write the response, and check the result. Over time, the parent could reduce these reminders as the child becomes more confident. This approach addresses Andrew's concern because support gradually transfers responsibility instead of taking it away. The important distinction is between guiding a process and completing a task on a child's behalf. Schools could make that distinction clearer by suggesting questions parents can ask at home, rather than encouraging them to correct every error. Involvement organized this way can strengthen achievement while also preparing students to work independently.",
                    },
                    {
                        "title": "Limit Homework Control",
                        "text": "I would place greater emphasis on limiting parental involvement in the actual completion of schoolwork. A student needs opportunities to notice a mistake, decide what to try next, and experience the result of that decision. If a parent immediately provides the solution, the assignment may look better without producing much learning. Consider a child who forgets to include evidence in a written response. Receiving teacher feedback and revising the paragraph can build a useful checking habit. Having a parent rewrite it before submission removes that opportunity. Claire is right that children benefit from knowing their parents care, but emotional support does not require close control of every task. Parents can provide a quiet place to work and show interest in what a child is learning while leaving the intellectual decisions to the child. This separation makes it easier for teachers to identify genuine learning needs and for students to develop confidence in their own abilities.",
                    },
                ],
            ),
            discussion(
                6,
                2,
                "Class Discussion",
                DISC_INSTR,
                person(
                    "Professor Gupta",
                    "diaz.png",
                    "Storytelling can convey messages and connect with audiences emotionally. Some experts consider it essential for engaging presentations, while others believe factual, straightforward communication is more effective. What is your opinion on the use of storytelling in communication?",
                ),
                [
                    person(
                        "Kelly",
                        "kelly.png",
                        "Storytelling connects with an audience emotionally, makes a message memorable, illustrates points vividly, and keeps listeners engaged.",
                    ),
                    person(
                        "Paul",
                        "andrew.png",
                        "Factual, straightforward communication conveys information clearly and concisely without ambiguity. Successful communication depends more on conveying a message than entertaining an audience.",
                    ),
                ],
                [
                    {
                        "title": "Stories Give Facts Context",
                        "text": "Storytelling is especially useful when an audience understands the facts but does not yet see why they matter. A carefully chosen example can connect an abstract message to a decision that listeners recognize. Suppose a speaker wants a student club to improve how it welcomes new members. Listing attendance procedures would explain the process, but describing a newcomer who arrives without knowing whom to approach would reveal a problem the group might otherwise overlook. The speaker could then connect that situation to a simple proposal, such as assigning someone to greet visitors. This develops Kelly's point about engagement into a practical reason for using stories: they help audiences imagine the consequences of their choices. Paul is right that communication should remain clear, so the story should be brief and directly connected to the recommendation. Used this way, storytelling gives the facts a meaningful context without replacing them or distracting from the purpose of the presentation.",
                    },
                    {
                        "title": "Facts First",
                        "text": "Factual, straightforward communication should take priority when listeners need to act accurately. A story can be memorable, but it may also encourage an audience to focus on an unusual example rather than the information that applies generally. For instance, someone explaining how to submit an application should clearly state the documents required, the sequence of steps, and the deadline. A long account of another applicant's experience could obscure those instructions or make listeners assume that the same circumstances apply to them. This is why I agree with Paul's emphasis on clarity. The speaker can still keep people engaged by organizing the information around their likely questions and using a short example where a step is confusing. Kelly's approach may be useful for inspiring an audience, but engagement is not the only measure of successful communication. In a practical setting, the more important question is whether people leave knowing exactly what they need to do.",
                    },
                ],
            ),
            discussion(
                7,
                2,
                "Class Discussion",
                DISC_INSTR,
                person(
                    "Doctor Achebe",
                    "diaz.png",
                    "We've been discussing whether students learn better through active participation or passive listening during class instruction. Some educators believe that students retain information more effectively when they actively engage through discussion, problem-solving activities, and hands-on practice rather than simply listening to lectures. Others argue that well-structured lectures allow teachers to present information efficiently and systematically, helping students build foundational knowledge before attempting practical applications. Do you think educators should prioritize active student participation or structured lecture-based instruction?",
                ),
                [
                    person(
                        "Andrew",
                        "andrew.png",
                        "Educators should prioritize active participation because it helps students retain information more effectively and develop critical thinking skills. When students engage in discussions, solve problems collaboratively, and practice applying concepts immediately, they create stronger memory connections and better understand how to use their knowledge in real situations. Active participation also keeps students focused and motivated throughout the learning process.",
                    ),
                    person(
                        "Claire",
                        "kelly.png",
                        "I think structured lecture-based instruction is more effective for building solid foundational knowledge that students need before attempting complex applications. Well-organized lectures allow teachers to present information systematically, ensure all students receive the same essential content, and cover curriculum requirements efficiently. Students can then apply this foundational knowledge through homework assignments and later practical exercises outside of class time.",
                    ),
                ],
                [
                    {
                        "title": "Participation Reveals Understanding",
                        "text": "Educators should prioritize active participation because it gives them better evidence of what students actually understand. During a lecture, a quiet class may appear attentive even when several students have misunderstood the same idea. A short discussion or problem-solving activity makes those misunderstandings visible while there is still time to address them. For example, after introducing a scientific concept, a teacher could ask pairs of students to predict what would happen in a simple experiment and explain their reasoning. Different predictions would reveal which assumptions need clarification. This adds to Andrew's point about retention: participation improves the teacher's next instructional decision as well as the student's learning. Claire is right that beginners need a clear foundation, so a brief explanation should come before the activity. However, that foundation becomes more useful when students immediately test their understanding and receive feedback, rather than discovering their confusion alone during homework later that evening.",
                    },
                    {
                        "title": "Lectures First",
                        "text": "Structured lectures deserve priority when students are first encountering a complex subject. Before they can discuss an issue productively, they need a shared framework that distinguishes central principles from supporting details. Without it, an activity may reward confident guessing rather than careful understanding. Consider an introductory economics lesson: a teacher can first explain how a simple model works and demonstrate the consequences of changing one assumption. Students then have a common basis for evaluating examples instead of talking past one another. Claire's argument about systematic presentation is therefore important, particularly in classes where students arrive with different levels of prior knowledge. Andrew is right that participation helps students apply ideas, and I would include opportunities to ask questions and practice afterward. Still, the initial lecture should organize those opportunities. A clear explanation can reduce unnecessary confusion and make subsequent discussion more focused, so active learning becomes a purposeful extension of instruction rather than a substitute for it.",
                    },
                ],
            ),
        ],
    }


if __name__ == "__main__":
    w = build_writing()
    emails = [t for t in w["tasks"] if t["type"] == "email"]
    discs = [t for t in w["tasks"] if t["type"] == "discussion"]
    print(f"{len(emails)} emails + {len(discs)} discussions")
    for t in emails:
        n = len(t["sample"].split())
        print(f"email {t['id']} to={t['to']!r} words={n}")
        assert n >= 80, t["id"]
    for t in discs:
        for s in t["samples"]:
            n = len(s["text"].split())
            print(f"discussion {t['id']} {s['title']} words={n}")
            assert n >= 100, (t["id"], s["title"])
