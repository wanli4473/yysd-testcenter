"""Cambridge IELTS 12 Tests 1–4 academic reading data."""

from __future__ import annotations


def ans(*v):
    return list(v)


def explain(*v):
    return "答案：" + " / ".join(v) + "。"


def Q(no, *answers, q=None, options=None):
    item = {"id": f"Q{no}", "no": no, "answer": list(answers), "explain": explain(*answers)}
    if q is not None:
        item["q"] = q
    if options is not None:
        item["options"] = options
    return item


def MQ(no, *letters):
    return {"id": f"Q{no}", "no": no, "explain": explain(*letters)}


def _p(letter, text):
    return f'<span class="para-label">{letter}</span>{text}'


def _byline(lo, hi, n, below=True):
    tail = " below" if below else ""
    return (
        f"You should spend about 20 minutes on Questions {lo}–{hi}, "
        f"which are based on Reading Passage {n}{tail}."
    )


def _test(n, passages):
    return {"meta": {"volume": 12, "testNo": n}, "durationMin": 60, "passages": passages}


def reading_tests():
    return {1: _TEST1, 2: _TEST2, 3: _TEST3, 4: _TEST4}


_TF = (
    "Do the following statements agree with the information given in Reading Passage {n}?<br>"
    "In boxes {lo}–{hi} on your answer sheet, write TRUE if the statement agrees with the "
    "information, FALSE if the statement contradicts the information, or NOT GIVEN if there "
    "is no information on this."
)
_YN = (
    "Do the following statements agree with the {kind} of the writer in Reading Passage {n}?<br>"
    "In boxes {lo}–{hi} on your answer sheet, write YES if the statement agrees with the "
    "{kind} of the writer, NO if the statement contradicts the {kind} of the writer, or "
    "NOT GIVEN if it is impossible to say what the writer thinks about this."
)

_TEST1 = _test(
    1,
    [
        {
            "id": 1,
            "passage": {
                "title": "Cork",
                "byline": _byline(1, 13, 1),
                "paras": [
                    "Cork – the thick bark of the cork oak tree (Quercus suber) – is a remarkable material. It is tough, elastic, buoyant, and fire-resistant, and suitable for a wide range of purposes. It has also been used for millennia: the ancient Egyptians sealed their sarcophagi (stone coffins) with cork, while the ancient Greeks and Romans used it for anything from beehives to sandals.",
                    "And the cork oak itself is an extraordinary tree. Its bark grows up to 20 cm in thickness, insulating the tree like a coat wrapped around the trunk and branches and keeping the inside at a constant 20°C all year round. Developed most probably as a defence against forest fires, the bark of the cork oak has a particular cellular structure – with about 40 million cells per cubic centimetre that technology has never succeeded in replicating. The cells are filled with air, which is why cork is so buoyant. It also has an elasticity that means you can squash it and watch it spring back to its original size and shape when you release the pressure.",
                    "Cork oaks grow in a number of Mediterranean countries, including Portugal, Spain, Italy, Greece and Morocco. They flourish in warm, sunny climates where there is a minimum of 400 millimetres of rain per year, and not more than 800 millimetres. Like grape vines, the trees thrive in poor soil, putting down deep roots in search of moisture and nutrients. Southern Portugal's Alentejo region meets all of these requirements, which explains why, by the early 20th century, this region had become the world's largest producer of cork, and why today it accounts for roughly half of all cork production around the world.",
                    "Most cork forests are family-owned. Many of these family businesses, and indeed many of the trees themselves, are around 200 years old. Cork production is, above all, an exercise in patience. From the planting of a cork sapling to the first harvest takes 25 years, and a gap of approximately a decade must separate harvests from an individual tree. And for top-quality cork, it's necessary to wait a further 15 or 20 years. You even have to wait for the right kind of summer's day to harvest cork. If the bark is stripped on a day when it's too cold – or when the air is damp – the tree will be damaged.",
                    "Cork harvesting is a very specialised profession. No mechanical means of stripping cork bark has been invented, so the job is done by teams of highly skilled workers. First, they make vertical cuts down the bark using small sharp axes, then lever it away in pieces as large as they can manage. The most skilful cork-strippers prise away a semi-circular husk that runs the length of the trunk from just above ground level to the first branches. It is then dried on the ground for about four months, before being taken to factories, where it is boiled to kill any insects that might remain in the cork. Over 60% of cork then goes on to be made into traditional bottle stoppers, with most of the remainder being used in the construction trade. Corkboard and cork tiles are ideal for thermal and acoustic insulation, while granules of cork are used in the manufacture of concrete.",
                    "Recent years have seen the end of the virtual monopoly of cork as the material for bottle stoppers, due to concerns about the effect it may have on the contents of the bottle. This is caused by a chemical compound called 2,4,6-trichloroanisole (TCA), which forms through the interaction of plant phenols, chlorine and mould. The tiniest concentrations – as little as three or four parts to a trillion – can spoil the taste of the product contained in the bottle. The result has been a gradual yet steady move first towards plastic stoppers and, more recently, to aluminium screw caps. These substitutes are cheaper to manufacture and, in the case of screw caps, more convenient for the user.",
                    "The classic cork stopper does have several advantages, however. Firstly, its traditional image is more in keeping with that of the type of high quality goods with which it has long been associated. Secondly – and very importantly – cork is a sustainable product that can be recycled without difficulty. Moreover, cork forests are a resource which support local biodiversity, and prevent desertification in the regions where they are planted. So, given the current concerns about environmental issues, the future of this ancient material once again looks promising.",
                ],
            },
            "groups": [
                {
                    "kind": "tfng",
                    "title": "Questions 1–5",
                    "instruction": _TF.format(n=1, lo=1, hi=5),
                    "questions": [
                        Q(1, "NOT GIVEN", q="The cork oak has the thickest bark of any living tree."),
                        Q(2, "FALSE", q="Scientists have developed a synthetic cork with the same cellular structure as natural cork."),
                        Q(3, "FALSE", q="Individual cork oak trees must be left for 25 years between the first and second harvest."),
                        Q(4, "TRUE", q="Cork bark should be stripped in dry atmospheric conditions."),
                        Q(5, "TRUE", q="The only way to remove the bark from cork oak trees is by hand."),
                    ],
                },
                {
                    "kind": "note",
                    "title": "Questions 6–13",
                    "instruction": "Complete the notes below.<br>Choose ONE WORD ONLY from the passage for each answer.",
                    "noteTitle": "Comparison of aluminium screw caps and cork bottle stoppers",
                    "lines": [
                        {"h": "Advantages of aluminium screw caps"},
                        {"bullet": True, "html": 'do not affect the <Q n="6"> of the bottle contents'},
                        {"bullet": True, "html": 'are <Q n="7"> to produce'},
                        {"bullet": True, "html": 'are <Q n="8"> to use'},
                        {"h": "Advantages of cork bottle stoppers"},
                        {"bullet": True, "html": 'suit the <Q n="9"> of quality products'},
                        {"bullet": True, "html": 'made from a <Q n="10"> material'},
                        {"bullet": True, "html": 'easily <Q n="11">'},
                        {"bullet": True, "html": 'cork forests aid <Q n="12">'},
                        {"bullet": True, "html": 'cork forests stop <Q n="13"> happening'},
                    ],
                    "questions": [
                        Q(6, "taste"),
                        Q(7, "cheaper"),
                        Q(8, "convenient"),
                        Q(9, "image"),
                        Q(10, "sustainable"),
                        Q(11, "recycled"),
                        Q(12, "biodiversity"),
                        Q(13, "desertification"),
                    ],
                },
            ],
        },
        {
            "id": 2,
            "passage": {
                "title": "Collecting as a hobby",
                "byline": _byline(14, 26, 2),
                "paras": [
                    "Collecting must be one of the most varied of human activities, and it's one that many of us psychologists find fascinating. Many forms of collecting have been dignified with a technical name: an archtophilist collects teddy bears, a philatelist collects postage stamps, and a deltologist collects postcards. Amassing hundreds or even thousands of postcards, chocolate wrappers or whatever, takes time, energy and money that could surely be put to much more productive use. And yet there are millions of collectors around the world. Why do they do it?",
                    "There are the people who collect because they want to make money – this could be called an instrumental reason for collecting; that is, collecting as a means to an end. They'll look for, say, antiques that they can buy cheaply and expect to be able to sell at a profit. But there may well be a psychological element, too – buying cheap and selling dear can give the collector a sense of triumph. And as selling online is so easy, more and more people are joining in.",
                    "Many collectors collect to develop their social life, attending meetings of a group of collectors and exchanging information on items. This is a variant on joining a bridge club or a gym, and similarly brings them into contact with like-minded people.",
                    "Another motive for collecting is the desire to find something special, or a particular example of the collected item, such as a rare early recording by a particular singer. Some may spend their whole lives in a hunt for this. Psychologically, this can give a purpose to a life that otherwise feels aimless. There is a danger, though, that if the individual is ever lucky enough to find what they're looking for, rather than celebrating their success, they may feel empty, now that the goal that drove them on has gone.",
                    "If you think about collecting postage stamps, another potential reason for it – or, perhaps, a result of collecting – is its educational value. Stamp collecting opens a window to other countries, and to the plants, animals, or famous people shown on their stamps. Similarly, in the 19th century, many collectors amassed fossils, animals and plants from around the globe, and their collections provided a vast amount of information about the natural world. Without those collections, our understanding would be greatly inferior to what it is.",
                    "In the past – and nowadays, too, though to a lesser extent – a popular form of collecting, particularly among boys and men, was trainspotting. This might involve trying to see every locomotive of a particular type, using published data that identifies each one, and ticking off each engine as it is seen. Trainspotters exchange information, these days often by mobile phone, so they can work out where to go to, to see a particular engine. As a by-product, many practitioners of the hobby become very knowledgeable about railway operations, or the technical specifications of different engine types.",
                    "Similarly, people who collect dolls may go beyond simply enlarging their collection, and develop an interest in the way that dolls are made, or the materials that are used. These have changed over the centuries from the wood that was standard in 16th century Europe, through the wax and porcelain of later centuries, to the plastics of today's dolls. Or collectors might be inspired to study how dolls reflect notions of what children like, or ought to like.",
                    "Not all collectors are interested in learning from their hobby, though, so what we might call a psychological reason for collecting is the need for a sense of control, perhaps as a way of dealing with insecurity. Stamp collectors, for instance, arrange their stamps in albums, usually very neatly, organising their collection according to certain commonplace principles – perhaps by country in alphabetical order, or grouping stamps by what they depict – people, birds, maps, and so on.",
                    "One reason, conscious or not, for what someone chooses to collect is to show the collector's individualism. Someone who decides to collect something as unexpected as dog collars, for instance, may be conveying their belief that they must be interesting themselves. And believe it or not, there is at least one dog collar museum in existence, and it grew out of a personal collection.",
                    "Of course, all hobbies give pleasure, but the common factor in collecting is usually passion: pleasure is putting it far too mildly. More than most other hobbies, collecting can be totally engrossing, and can give a strong sense of personal fulfilment. To non-collectors it may appear an eccentric, if harmless, way of spending time, but potentially, collecting has a lot going for it.",
                ],
            },
            "groups": [
                {
                    "kind": "note",
                    "title": "Questions 14–21",
                    "instruction": "Complete the sentences below.<br>Choose ONE WORD ONLY from the passage for each answer.",
                    "lines": [
                        {"plain": True, "html": 'The writer mentions collecting <Q n="14"> as an example of collecting in order to make money.'},
                        {"plain": True, "html": 'Collectors may get a feeling of <Q n="15"> from buying and selling items.'},
                        {"plain": True, "html": 'Collectors\' clubs provide opportunities to share <Q n="16">.'},
                        {"plain": True, "html": 'Collectors\' clubs offer <Q n="17"> with people who have similar interests.'},
                        {"plain": True, "html": 'Collecting sometimes involves a life-long <Q n="18"> for a special item.'},
                        {"plain": True, "html": 'Searching for something particular may prevent people from feeling their life is completely <Q n="19">.'},
                        {"plain": True, "html": 'Stamp collecting may be <Q n="20"> because it provides facts about different countries.'},
                        {"plain": True, "html": '<Q n="21"> tends to be mostly a male hobby.'},
                    ],
                    "questions": [
                        Q(14, "antiques"),
                        Q(15, "triumph"),
                        Q(16, "information"),
                        Q(17, "contact", "meetings"),
                        Q(18, "hunt", "desire"),
                        Q(19, "aimless", "empty"),
                        Q(20, "educational"),
                        Q(21, "Trainspotting"),
                    ],
                },
                {
                    "kind": "tfng",
                    "title": "Questions 22–26",
                    "instruction": _TF.format(n=2, lo=22, hi=26),
                    "questions": [
                        Q(22, "NOT GIVEN", q="The number of people buying dolls has grown over the centuries."),
                        Q(23, "FALSE", q="Sixteenth century European dolls were normally made of wax and porcelain."),
                        Q(24, "NOT GIVEN", q="Arranging a stamp collection by the size of the stamps is less common than other methods."),
                        Q(25, "TRUE", q="Someone who collects unusual objects may want others to think he or she is also unusual."),
                        Q(26, "TRUE", q="Collecting gives a feeling that other hobbies are unlikely to inspire."),
                    ],
                },
            ],
        },
        {
            "id": 3,
            "passage": {
                "title": "What's the purpose of gaining knowledge?",
                "byline": _byline(27, 40, 3),
                "paras": [
                    _p("A", "'I would found an institution where any person can find instruction in any subject.' That was the founder's motto for Cornell University, and it seems an apt characterization of the different university, also in the USA, where I currently teach philosophy. A student can prepare for a career in resort management, engineering, interior design, accounting, music, law enforcement, you name it. But what would the founders of these two institutions have thought of a course called 'Arson for Profit'? I kid you not: we have it on the books. Any undergraduates who have met the academic requirements can sign up for the course in our program in 'fire science'."),
                    _p("B", "Naturally, the course is intended for prospective arson investigators, who can learn all the tricks of the trade for detecting whether a fire was deliberately set, discovering who did it, and establishing a chain of evidence for effective prosecution in a court of law. But wouldn't this also be the perfect course for prospective arsonists to sign up for? My point is not to criticize academic programs in fire science: they are highly welcome as part of the increasing professionalization of this and many other occupations. However, it's not unknown for a firefighter to torch a building. This example suggests how dishonest and illegal behavior, with the help of higher education, can creep into every aspect of public and business life."),
                    _p("C", "I realized this anew when I was invited to speak before a class in marketing, which is another of our degree programs. The regular instructor is a colleague who appreciates the kind of ethical perspective I can bring as a philosopher. There are endless ways I could have approached this assignment, but I took my cue from the title of the course: 'Principles of Marketing'. It made me think to ask the students, 'Is marketing principled?' After all, a subject matter can have principles in the sense of being codified, having rules, as with football or chess, without being principled in the sense of being ethical. Many of the students immediately assumed that the answer to my question about marketing principles was obvious: no. Just look at the ways in which everything under the sun has been marketed; obviously it need not be done in a principled (=ethical) fashion."),
                    _p("D", "Is that obvious? I made the suggestion, which may sound downright crazy in light of the evidence, that perhaps marketing is by definition principled. My inspiration for this judgement is the philosopher Immanuel Kant, who argued that any body of knowledge consists of an end (or purpose) and a means."),
                    _p("E", "Let us apply both the terms 'means' and 'end' to marketing. The students have signed up for a course in order to learn how to market effectively. But to what end? There seem to be two main attitudes toward that question. One is that the answer is obvious: the purpose of marketing is to sell things and to make money. The other attitude is that the purpose of marketing is irrelevant: Each person comes to the program and course with his or her own plans, and these need not even concern the acquisition of marketing expertise as such. My proposal, which I believe would also be Kant's, is that neither of these attitudes captures the significance of the end to the means for marketing. A field of knowledge or a professional endeavor is defined by both the means and the end; hence both deserve scrutiny. Students need to study both how to achieve X, and also what X is."),
                    _p("F", "It is at this point that 'Arson for Profit' becomes supremely relevant. That course is presumably all about means: how to detect and prosecute criminal activity. It is therefore assumed that the end is good in an ethical sense. When I ask fire science students to articulate the end, or purpose, of their field, they eventually generalize to something like, 'The safety and welfare of society,' which seems right. As we have seen, someone could use the very same knowledge of means to achieve a much less noble end, such as personal profit via destructive, dangerous, reckless activity. But we would not call that firefighting. We have a separate word for it: arson. Similarly, if you employed the 'principles of marketing' in an unprincipled way, you would not be doing marketing. We have another term for it: fraud. Kant gives the example of a doctor and a poisoner, who use the identical knowledge to achieve their divergent ends. We would say that one is practicing medicine, the other, murder."),
                ],
            },
            "groups": [
                {
                    "kind": "match",
                    "title": "Questions 27–32",
                    "instruction": "Reading Passage 3 has six sections, A–F.<br>Choose the correct heading for each section from the list of headings below.<br>Write the correct number, i–viii, in boxes 27–32 on your answer sheet.",
                    "boxTitle": "List of Headings",
                    "box": {
                        "i": "Courses that require a high level of commitment",
                        "ii": "A course title with two meanings",
                        "iii": "The equal importance of two key issues",
                        "iv": "Applying a theory in an unexpected context",
                        "v": "The financial benefits of studying",
                        "vi": "A surprising course title",
                        "vii": "Different names for different outcomes",
                        "viii": "The possibility of attracting the wrong kind of student",
                    },
                    "questions": [
                        Q(27, "vi", q="Section A"),
                        Q(28, "viii", q="Section B"),
                        Q(29, "ii", q="Section C"),
                        Q(30, "iv", q="Section D"),
                        Q(31, "iii", q="Section E"),
                        Q(32, "vii", q="Section F"),
                    ],
                },
                {
                    "kind": "note",
                    "title": "Questions 33–36",
                    "instruction": "Complete the summary below.<br>Choose NO MORE THAN TWO WORDS from the passage for each answer.",
                    "noteTitle": "The 'Arson for Profit' course",
                    "lines": [
                        {
                            "plain": True,
                            "html": 'This is a university course intended for students who are undergraduates and who are studying <Q n="33">. The expectation is that they will become <Q n="34"> specialising in arson. The course will help them to detect cases of arson and find <Q n="35"> of criminal intent, leading to successful <Q n="36"> in the courts.',
                        }
                    ],
                    "questions": [
                        Q(33, "fire science"),
                        Q(34, "investigators"),
                        Q(35, "evidence"),
                        Q(36, "prosecution"),
                    ],
                },
                {
                    "kind": "tfng",
                    "title": "Questions 37–40",
                    "instruction": _YN.format(kind="views", n=3, lo=37, hi=40),
                    "variant": "yn",
                    "questions": [
                        Q(37, "NOT GIVEN", q="It is difficult to attract students onto courses that do not focus on a career."),
                        Q(38, "YES", q="The 'Arson for Profit' course would be useful for people intending to set fire to buildings."),
                        Q(39, "NO", q="Fire science courses are too academic to help people to be good at the job of firefighting."),
                        Q(40, "NO", q="The writer's fire science students provided a detailed definition of the purpose of their studies."),
                    ],
                },
            ],
        },
    ],
)

_TEST2 = _test(
    2,
    [
        {
            "id": 1,
            "passage": {
                "title": "The risks agriculture faces in developing countries",
                "byline": _byline(1, 13, 1),
                "paras": [
                    "<em>Synthesis of an online debate</em>",
                    _p("A", "Two things distinguish food production from all other productive activities: first, every single person needs food each day and has a right to it; and second, it is hugely dependent on nature. These two unique aspects, one political, the other natural, make food production highly vulnerable and different from any other business. At the same time, cultural values are highly entrenched in food and agricultural systems worldwide."),
                    _p("B", "Farmers everywhere face major risks, including extreme weather, long-term climate change, and price volatility in input and product markets. However, smallholder farmers in developing countries must in addition deal with adverse environments, both natural, in terms of soil quality, rainfall, etc., and human, in terms of infrastructure, financial systems, markets, knowledge and technology. Counter-intuitively, hunger is prevalent among many smallholder farmers in the developing world."),
                    _p("C", "Participants in the online debate argued that our biggest challenge is to address the underlying causes of the agricultural system's inability to ensure sufficient food for all, and they identified as drivers of this problem our dependency on fossil fuels and unsupportive government policies."),
                    _p("D", "On the question of mitigating the risks farmers face, most essayists called for greater state intervention. In his essay, Kanayo F. Nwanze, President of the International Fund for Agricultural Development, argued that governments can significantly reduce risks for farmers by providing basic services like roads to get produce more efficiently to markets, or water and food storage facilities to reduce losses. Sophia Murphy, senior advisor to the Institute for Agriculture and Trade Policy, suggested that the procurement and holding of stocks by governments can also help mitigate wild swings in food prices by alleviating uncertainties about market supply."),
                    _p("E", "Shenggen Fan, Director General of the International Food Policy Research Institute, held up social safety nets and public welfare programmes in Ethiopia, Brazil and Mexico as valuable ways to address poverty among farming families and reduce their vulnerability to agriculture shocks. However, some commentators responded that cash transfers to poor families do not necessarily translate into increased food security, as these programmes do not always strengthen food production or raise incomes. Regarding state subsidies for agriculture, Rokeya Kabir, Executive Director of Bangladesh Nari Progati Sangha, commented in her essay that these 'have not compensated for the stranglehold exercised by private traders. In fact, studies show that sixty percent of beneficiaries of subsidies are not poor, but rich landowners and non-farmer traders.'"),
                    _p("F", "Nwanze, Murphy and Fan argued that private risk management tools, like private insurance, commodity futures markets, and rural finance can help small-scale producers mitigate risk and allow for investment in improvements. Kabir warned that financial support schemes often encourage the adoption of high-input agricultural practices, which in the medium term may raise production costs beyond the value of their harvests. Murphy noted that when futures markets become excessively financialised they can contribute to short-term price volatility, which increases farmers' food insecurity. Many participants and commentators emphasised that greater transparency in markets is needed to mitigate the impact of volatility, and make evident whether adequate stocks and supplies are available. Others contended that agribusiness companies should be held responsible for paying for negative side effects."),
                    _p("G", "Many essayists mentioned climate change and its consequences for small-scale agriculture. Fan explained that 'in addition to reducing crop yields, climate change increases the magnitude and the frequency of extreme weather events, which increase smallholder vulnerability.' The growing unpredictability of weather patterns increases farmers' difficulty in managing weather-related risks. According to this author, one solution would be to develop crop varieties that are more resilient to new climate trends and extreme weather patterns. Accordingly, Pat Mooney, co-founder and executive director of the ETC Group, suggested that 'if we are to survive climate change, we must adopt policies that let peasants diversify the plant and animal species and varieties/breeds that make up our menus.'"),
                    _p("H", "Some participating authors and commentators argued in favour of community-based and autonomous risk management strategies through collective action groups, co-operatives or producers' groups. Such groups enhance market opportunities for small-scale producers, reduce marketing costs and synchronise buying and selling with seasonal price conditions. According to Murphy, 'collective action offers an important way for farmers to strengthen their political and economic bargaining power, and to reduce their business risks.' One commentator, Giel Ton, warned that collective action does not come as a free good. It takes time, effort and money to organise, build trust and to experiment. Others, like Marcel Vernooij and Marcel Beukeboom, suggested that in order to 'apply what we already know', all stakeholders, including business, government, scientists and civil society, must work together, starting at the beginning of the value chain."),
                    _p("I", "Some participants explained that market price volatility is often worsened by the presence of intermediary purchasers who, taking advantage of farmers' vulnerability, dictate prices. One commentator suggested farmers can gain greater control over prices and minimise price volatility by selling directly to consumers. Similarly, Sonali Bisht, founder and advisor to the Institute of Himalayan Environmental Research and Education (INHERE), India, wrote that community-supported agriculture, where consumers invest in local farmers by subscription and guarantee producers a fair price, is a risk-sharing model worth more attention. Direct food distribution systems not only encourage small-scale agriculture but also give consumers more control over the food they consume, she wrote."),
                ],
            },
            "groups": [
                {
                    "kind": "match",
                    "title": "Questions 1–3",
                    "instruction": "Reading Passage 1 has nine paragraphs, A–I.<br>Which paragraph contains the following information?<br>Write the correct letter, A–I, in boxes 1–3 on your answer sheet.",
                    "noBox": True,
                    "boxTitle": "Paragraphs",
                    "box": {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "F": "F", "G": "G", "H": "H", "I": "I"},
                    "subTitle": "Information",
                    "questions": [
                        Q(1, "A", q="a reference to characteristics that only apply to food production"),
                        Q(2, "B", q="a reference to challenges faced only by farmers in certain parts of the world"),
                        Q(3, "H", q="a reference to difficulties in bringing about co-operation between farmers"),
                    ],
                },
                {
                    "kind": "match",
                    "title": "Questions 4–9",
                    "instruction": "Look at the following statements (Questions 4–9) and the list of people below.<br>Match each statement with the correct person, A–G.<br>Write the correct letter, A–G, in boxes 4–9 on your answer sheet.<br>NB You may use any letter more than once.",
                    "boxTitle": "List of People",
                    "box": {
                        "A": "Kanayo F. Nwanze",
                        "B": "Sophia Murphy",
                        "C": "Shenggen Fan",
                        "D": "Rokeya Kabir",
                        "E": "Pat Mooney",
                        "F": "Giel Ton",
                        "G": "Sonali Bisht",
                    },
                    "subTitle": "Statements",
                    "questions": [
                        Q(4, "D", q="Financial assistance from the government does not always go to the farmers who most need it."),
                        Q(5, "B", q="Farmers can benefit from collaborating as a group."),
                        Q(6, "C", q="Financial assistance from the government can improve the standard of living of farmers."),
                        Q(7, "G", q="Farmers may be helped if there is financial input by the same individuals who buy from them."),
                        Q(8, "B", q="Governments can help to reduce variation in prices."),
                        Q(9, "A", q="Improvements to infrastructure can have a major impact on risk for farmers."),
                    ],
                },
                {
                    "kind": "multi",
                    "title": "Questions 10 and 11",
                    "instruction": "Choose TWO letters, A–E.<br>Which TWO problems are mentioned which affect farmers with small farms in developing countries?<br>Write the correct letters in boxes 10 and 11 on your answer sheet.",
                    "box": {
                        "A": "lack of demand for locally produced food",
                        "B": "lack of irrigation programmes",
                        "C": "being unable to get insurance",
                        "D": "the effects of changing weather patterns",
                        "E": "having to sell their goods to intermediary buyers",
                    },
                    "answerSet": ["D", "E"],
                    "questions": [MQ(10, "D", "E"), MQ(11, "D", "E")],
                },
                {
                    "kind": "multi",
                    "title": "Questions 12 and 13",
                    "instruction": "Choose TWO letters, A–E.<br>Which TWO actions are recommended for improving conditions for farmers?<br>Write the correct letters in boxes 12 and 13 on your answer sheet.",
                    "box": {
                        "A": "reducing the size of food stocks",
                        "B": "attempting to ensure that prices rise at certain times of the year",
                        "C": "organising co-operation between a wide range of interested parties",
                        "D": "encouraging consumers to take a financial stake in farming",
                        "E": "making customers aware of the reasons for changing food prices",
                    },
                    "answerSet": ["C", "D"],
                    "questions": [MQ(12, "C", "D"), MQ(13, "C", "D")],
                },
            ],
        },
        {
            "id": 2,
            "passage": {
                "title": "The Lost City",
                "byline": _byline(14, 26, 2),
                "paras": [
                    "<em>An explorer's encounter with the ruined city of Machu Picchu, the most famous icon of the Inca civilisation</em>",
                    _p("A", "When the US explorer and academic Hiram Bingham arrived in South America in 1911, he was ready for what was to be the greatest achievement of his life: the exploration of the remote hinterland to the west of Cusco, the old capital of the Inca empire in the Andes mountains of Peru. His goal was to locate the remains of a city called Vitcos, the last capital of the Inca civilisation. Cusco lies on a high plateau at an elevation of more than 3,000 metres, and Bingham's plan was to descend from this plateau along the valley of the Urubamba river, which takes a circuitous route down to the Amazon and passes through an area of dramatic canyons and mountain ranges."),
                    _p("B", "When Bingham and his team set off down the Urubamba in late July, they had an advantage over travellers who had preceded them: a track had recently been blasted down the valley canyon to enable rubber to be brought up by mules from the jungle. Almost all previous travellers had left the river at Ollantaytambo and taken a high pass across the mountains to rejoin the river lower down, thereby cutting a substantial corner, but also therefore never passing through the area around Machu Picchu."),
                    _p("C", "On 24 July they were a few days into their descent of the valley. The day began slowly, with Bingham trying to arrange sufficient mules for the next stage of the trek. His companions showed no interest in accompanying him up the nearby hill to see some ruins that a local farmer, Melchor Arteaga, had told them about the night before. The morning was dull and damp, and Bingham also seems to have been less than keen on the prospect of climbing the hill. In his book Lost City of the Incas, he relates that he made the ascent without having the least expectation that he would find anything at the top."),
                    _p("D", "Bingham writes about the approach in vivid style in his book. First, as he climbs up the hill, he describes the ever-present possibility of deadly snakes, 'capable of making considerable springs when in pursuit of their prey'; not that he sees any. Then there's a sense of mounting discovery as he comes across great sweeps of terraces, then a mausoleum, followed by monumental staircases and, finally, the grand ceremonial buildings of Machu Picchu. 'It seemed like an unbelievable dream ... the sight held me spellbound ...' he wrote."),
                    _p("E", "We should remember, however, that Lost City of the Incas is a work of hindsight, not written until 1948, many years after his journey. His journal entries of the time reveal a much more gradual appreciation of his achievement. He spent the afternoon at the ruins noting down the dimensions of some of the buildings, then descended and rejoined his companions, to whom he seems to have said little about his discovery. At this stage, Bingham didn't realise the extent or the importance of the site, nor did he realise what use he could make of the discovery."),
                    _p("F", "However, soon after returning it occurred to him that he could make a name for himself from this discovery. When he came to write the National Geographic magazine article that broke the story to the world in April 1913, he knew he had to produce a big idea. He wondered whether it could have been the birthplace of the very first Inca, Manco the Great, and whether it could also have been what chroniclers described as 'the last city of the Incas'. This term refers to Vilcabamba, the settlement where the Incas had fled from Spanish invaders in the 1530s. Bingham made desperate attempts to prove this belief for nearly 40 years. Sadly, his vision of the site as both the beginning and end of the Inca civilisation, while a magnificent one, is inaccurate. We now know that Vilcabamba actually lies 65 kilometres away in the depths of the jungle."),
                    _p("G", "One question that has perplexed visitors, historians and archaeologists alike ever since Bingham, is why the site seems to have been abandoned before the Spanish Conquest. There are no references to it by any of the Spanish chroniclers – and if they had known of its existence so close to Cusco they would certainly have come in search of gold. An idea which has gained wide acceptance over the past few years is that Machu Picchu was a moya, a country estate built by an Inca emperor to escape the cold winters of Cusco, where the elite could enjoy monumental architecture and spectacular views. Furthermore, the particular architecture of Machu Picchu suggests that it was constructed at the time of the greatest of all the Incas, the emperor Pachacuti (c. 1438-71). By custom, Pachacuti's descendants built other similar estates for their own use, and so Machu Picchu would have been abandoned after his death, some 50 years before the Spanish Conquest."),
                ],
            },
            "groups": [
                {
                    "kind": "match",
                    "title": "Questions 14–20",
                    "instruction": "Reading Passage 2 has seven paragraphs, A–G.<br>Choose the correct heading for each paragraph from the list of headings below.<br>Write the correct number, i–viii, in boxes 14–20 on your answer sheet.",
                    "boxTitle": "List of Headings",
                    "box": {
                        "i": "Different accounts of the same journey",
                        "ii": "Bingham gains support",
                        "iii": "A common belief",
                        "iv": "The aim of the trip",
                        "v": "A dramatic description",
                        "vi": "A new route",
                        "vii": "Bingham publishes his theory",
                        "viii": "Bingham's lack of enthusiasm",
                    },
                    "questions": [
                        Q(14, "iv", q="Paragraph A"),
                        Q(15, "vi", q="Paragraph B"),
                        Q(16, "viii", q="Paragraph C"),
                        Q(17, "v", q="Paragraph D"),
                        Q(18, "i", q="Paragraph E"),
                        Q(19, "vii", q="Paragraph F"),
                        Q(20, "iii", q="Paragraph G"),
                    ],
                },
                {
                    "kind": "tfng",
                    "title": "Questions 21–24",
                    "instruction": _TF.format(n=2, lo=21, hi=24),
                    "questions": [
                        Q(21, "TRUE", q="Bingham went to South America in search of an Inca city."),
                        Q(22, "FALSE", q="Bingham chose a particular route down the Urubamba valley because it was the most common route used by travellers."),
                        Q(23, "FALSE", q="Bingham understood the significance of Machu Picchu as soon as he saw it."),
                        Q(24, "NOT GIVEN", q="Bingham returned to Machu Picchu in order to find evidence to support his theory."),
                    ],
                },
                {
                    "kind": "note",
                    "title": "Questions 25–26",
                    "instruction": "Complete the sentences below.<br>Choose ONE WORD ONLY from the passage for each answer.",
                    "lines": [
                        {"plain": True, "html": 'The track that took Bingham down the Urubamba valley had been created for the transportation of <Q n="25">.'},
                        {"plain": True, "html": 'Bingham found out about the ruins of Machu Picchu from a <Q n="26"> in the Urubamba valley.'},
                    ],
                    "questions": [Q(25, "rubber"), Q(26, "farmer")],
                },
            ],
        },
        {
            "id": 3,
            "passage": {
                "title": "The Benefits of Being Bilingual",
                "byline": _byline(27, 40, 3),
                "paras": [
                    _p("A", "According to the latest figures, the majority of the world's population is now bilingual or multilingual, having grown up speaking two or more languages. In the past, such children were considered to be at a disadvantage compared with their monolingual peers. Over the past few decades, however, technological advances have allowed researchers to look more deeply at how bilingualism interacts with and changes the cognitive and neurological systems, thereby identifying several clear benefits of being bilingual."),
                    _p("B", "Research shows that when a bilingual person uses one language, the other is active at the same time. When we hear a word, we don't hear the entire word all at once: the sounds arrive in sequential order. Long before the word is finished, the brain's language system begins to guess what that word might be. If you hear 'can', you will likely activate words like 'candy' and 'candle' as well, at least during the earlier stages of word recognition. For bilingual people, this activation is not limited to a single language; auditory input activates corresponding words regardless of the language to which they belong. Some of the most compelling evidence for this phenomenon, called 'language co-activation', comes from studying eye movements. A Russian-English bilingual asked to 'pick up a marker' from a set of objects would look more at a stamp than someone who doesn't know Russian, because the Russian word for 'stamp', marka, sounds like the English word he or she heard, 'marker'. In cases like this, language co-activation occurs because what the listener hears could map onto words in either language."),
                    _p("C", "Having to deal with this persistent linguistic competition can result in difficulties, however. For instance, knowing more than one language can cause speakers to name pictures more slowly, and can increase 'tip-of-the-tongue states', when you can almost, but not quite, bring a word to mind. As a result, the constant juggling of two languages creates a need to control how much a person accesses a language at any given time. For this reason, bilingual people often perform better on tasks that require conflict management. In the classic Stroop Task, people see a word and are asked to name the colour of the word's font. When the colour and the word match (i.e., the word 'red' printed in red), people correctly name the colour more quickly than when the colour and the word don't match (i.e., the word 'red' printed in blue). This occurs because the word itself ('red') and its font colour (blue) conflict. Bilingual people often excel at tasks such as this, which tap into the ability to ignore competing perceptual information and focus on the relevant aspects of the input. Bilinguals are also better at switching between two tasks; for example, when bilinguals have to switch from categorizing objects by colour (red or green) to categorizing them by shape (circle or triangle), they do so more quickly than monolingual people, reflecting better cognitive control when having to make rapid changes of strategy."),
                    _p("D", "It also seems that the neurological roots of the bilingual advantage extend to brain areas more traditionally associated with sensory processing. When monolingual and bilingual adolescents listen to simple speech sounds without any intervening background noise, they show highly similar brain stem responses. When researchers play the same sound to both groups in the presence of background noise, however, the bilingual listeners' neural response is considerably larger, reflecting better encoding of the sound's fundamental frequency, a feature of sound closely related to pitch perception."),
                    _p("E", "Such improvements in cognitive and sensory processing may help a bilingual person to process information in the environment, and help explain why bilingual adults acquire a third language better than monolingual adults master a second language. This advantage may be rooted in the skill of focussing on information about the new language while reducing interference from the languages they already know."),
                    _p("F", "Research also indicates that bilingual experience may help to keep the cognitive mechanisms sharp by recruiting alternate brain networks to compensate for those that become damaged during aging. Older bilinguals enjoy improved memory relative to monolingual people, which can lead to real-world health benefits. In a study of over 200 patients with Alzheimer's disease, a degenerative brain disease, bilingual patients reported showing initial symptoms of the disease an average of five years later than monolingual patients. In a follow-up study, researchers compared the brains of bilingual and monolingual patients matched on the severity of Alzheimer's symptoms. Surprisingly, the bilinguals' brains had more physical signs of disease than their monolingual counterparts, even though their outward behaviour and abilities were the same. If the brain is an engine, bilingualism may help it to go farther on the same amount of fuel."),
                    _p("G", "Furthermore, the benefits associated with bilingual experience seem to start very early. In one study, researchers taught seven-month-old babies growing up in monolingual or bilingual homes that when they heard a tinkling sound, a puppet appeared on one side of a screen. Halfway through the study, the puppet began appearing on the opposite side of the screen. In order to get a reward, the infants had to adjust the rule they'd learned; only the bilingual babies were able to successfully learn the new rule. This suggests that for very young children, as well as for older people, navigating a multilingual environment imparts advantages that transfer far beyond language."),
                ],
            },
            "groups": [
                {
                    "kind": "table",
                    "title": "Questions 27–31",
                    "instruction": "Complete the table below.<br>Choose NO MORE THAN TWO WORDS from the passage for each answer.",
                    "cols": ["Test", "Findings"],
                    "rows": [
                        [
                            'Observing the <Q n="27"> of Russian-English bilingual people when asked to select certain objects',
                            'Bilingual people engage both languages simultaneously: a mechanism known as <Q n="28">',
                        ],
                        [
                            'A test called the <Q n="29">, focusing on naming colours',
                            'Bilingual people are more able to handle tasks involving a skill called <Q n="30">',
                        ],
                        [
                            "A test involving switching between tasks",
                            'When changing strategies, bilingual people have superior <Q n="31">',
                        ],
                    ],
                    "questions": [
                        Q(27, "eye movements"),
                        Q(28, "language co-activation"),
                        Q(29, "Stroop Task"),
                        Q(30, "conflict management"),
                        Q(31, "cognitive control"),
                    ],
                },
                {
                    "kind": "tfng",
                    "title": "Questions 32–36",
                    "instruction": _YN.format(kind="claims", n=3, lo=32, hi=36),
                    "variant": "yn",
                    "questions": [
                        Q(32, "YES", q="Attitudes towards bilingualism have changed in recent years."),
                        Q(33, "NOT GIVEN", q="Bilingual people are better than monolingual people at guessing correctly what words are before they are finished."),
                        Q(34, "NO", q="Bilingual people consistently name images faster than monolingual people."),
                        Q(35, "NO", q="Bilingual people's brains process single sounds more efficiently than monolingual people in all situations."),
                        Q(36, "NOT GIVEN", q="Fewer bilingual people than monolingual people suffer from brain disease in old age."),
                    ],
                },
                {
                    "kind": "match",
                    "title": "Questions 37–40",
                    "instruction": "Reading Passage 3 has seven paragraphs, A–G.<br>Which paragraph contains the following information?<br>Write the correct letter, A–G, in boxes 37–40 on your answer sheet.",
                    "noBox": True,
                    "boxTitle": "Paragraphs",
                    "box": {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "F": "F", "G": "G"},
                    "subTitle": "Information",
                    "questions": [
                        Q(37, "D", q="an example of how bilingual and monolingual people's brains respond differently to a certain type of non-verbal auditory input"),
                        Q(38, "G", q="a demonstration of how a bilingual upbringing has benefits even before we learn to speak"),
                        Q(39, "B", q="a description of the process by which people identify words that they hear"),
                        Q(40, "C", q="reference to some negative consequences of being bilingual"),
                    ],
                },
            ],
        },
    ],
)

_TEST3 = _test(
    3,
    [
        {
            "id": 1,
            "passage": {
                "title": "Flying tortoises",
                "byline": _byline(1, 13, 1, below=False),
                "paras": [
                    "<em>An airborne reintroduction programme has helped conservationists take significant steps to protect the endangered Galapagos tortoise.</em>",
                    _p("A", "Forests of spiny cacti cover much of the uneven lava plains that separate the interior of the Galapagos island of Isabela from the Pacific Ocean. With its five distinct volcanoes, the island resembles a lunar landscape. Only the thick vegetation at the skirt of the often cloud-covered peak of Sierra Negra offers respite from the barren terrain below. This inhospitable environment is home to the giant Galapagos tortoise. Some time after the Galapagos's birth, around five million years ago, the islands were colonised by one or more tortoises from mainland South America. As these ancestral tortoises settled on the individual islands, the different populations adapted to their unique environments, giving rise to at least 14 different subspecies. Island life agreed with them. In the absence of significant predators, they grew to become the largest and longest-living tortoises on the planet, weighing more than 400 kilograms, occasionally exceeding 1.8 metres in length and living for more than a century."),
                    _p("B", "Before human arrival, the archipelago's tortoises numbered in the hundreds of thousands. From the 17th century onwards, pirates took a few on board for food, but the arrival of whaling ships in the 1790s saw this exploitation grow exponentially. Relatively immobile and capable of surviving for months without food or water, the tortoises were taken on board these ships to act as food supplies during long ocean passages. Sometimes, their bodies were processed into high-grade oil. In total, an estimated 200,000 animals were taken from the archipelago before the 20th century. This historical exploitation was then exacerbated when settlers came to the islands. They hunted the tortoises and destroyed their habitat to clear land for agriculture. They also introduced alien species – ranging from cattle, pigs, goats, rats and dogs to plants and ants – that either prey on the eggs and young tortoises or damage or destroy their habitat."),
                    _p("C", "Today, only 11 of the original subspecies survive and of these, several are highly endangered. In 1989, work began on a tortoise-breeding centre just outside the town of Puerto Villamil on Isabela, dedicated to protecting the island's tortoise populations. The centre's captive-breeding programme proved to be extremely successful, and it eventually had to deal with an overpopulation problem."),
                    _p("D", "The problem was also a pressing one. Captive-bred tortoises can't be reintroduced into the wild until they're at least five years old and weigh at least 4.5 kilograms, at which point their size and weight – and their hardened shells – are sufficient to protect them from predators. But if people wait too long after that point, the tortoises eventually become too large to transport. For years, repatriation efforts were carried out in small numbers, with the tortoises carried on the backs of men over weeks of long, treacherous hikes along narrow trails."),
                    _p("E", "But in November 2010, the environmentalist and Galapagos National Park liaison officer Godfrey Merlin, a visiting private motor yacht captain and a helicopter pilot gathered around a table in a small cafe in Puerto Ayora on the island of Santa Cruz to work out more ambitious reintroduction. The aim was to use a helicopter to move 300 of the breeding centre's tortoises to various locations close to Sierra Negra."),
                    _p("F", "This unprecedented effort was made possible by the owners of the 67-metre yacht White Cloud, who provided the Galapagos National Park with free use of their helicopter and its experienced pilot, as well as the logistical support of the yacht, its captain and crew. Originally an air ambulance, the yacht's helicopter has a rear double door and a large internal space that's well suited for cargo, so a custom crate was designed to hold up to 33 tortoises with a total weight of about 150 kilograms. This weight, together with that of the fuel, pilot and four crew, approached the helicopter's maximum payload, and there were times when it was clearly right on the edge of the helicopter's capabilities. During a period of three days, a group of volunteers from the breeding centre worked around the clock to prepare the young tortoises for transport. Meanwhile, park wardens, dropped off ahead of time in remote locations, cleared landing sites within the thick brush, cacti and lava rocks."),
                    _p("G", "Upon their release, the juvenile tortoises quickly spread out over their ancestral territory, investigating their new surroundings and feeding on the vegetation. Eventually, one tiny tortoise came across a fully grown giant who had been lumbering around the island for around a hundred years. The two stood side by side, a powerful symbol of the regeneration of an ancient species."),
                ],
            },
            "groups": [
                {
                    "kind": "match",
                    "title": "Questions 1–7",
                    "instruction": "Reading Passage 1 has seven paragraphs, A–G.<br>Choose the correct heading for each paragraph from the list of headings below.<br>Write the correct number, i–viii, in boxes 1–7 on your answer sheet.",
                    "boxTitle": "List of Headings",
                    "box": {
                        "i": "The importance of getting the timing right",
                        "ii": "Young meets old",
                        "iii": "Developments to the disadvantage of tortoise populations",
                        "iv": "Planning a bigger idea",
                        "v": "Tortoises populate the islands",
                        "vi": "Carrying out a carefully prepared operation",
                        "vii": "Looking for a home for the islands' tortoises",
                        "viii": "The start of the conservation project",
                    },
                    "questions": [
                        Q(1, "v", q="Paragraph A"),
                        Q(2, "iii", q="Paragraph B"),
                        Q(3, "viii", q="Paragraph C"),
                        Q(4, "i", q="Paragraph D"),
                        Q(5, "iv", q="Paragraph E"),
                        Q(6, "vi", q="Paragraph F"),
                        Q(7, "ii", q="Paragraph G"),
                    ],
                },
                {
                    "kind": "note",
                    "title": "Questions 8–13",
                    "instruction": "Complete the notes below.<br>Choose ONE WORD ONLY from the passage for each answer.",
                    "noteTitle": "The decline of the Galapagos tortoise",
                    "lines": [
                        {"plain": True, "html": "Originally from mainland South America"},
                        {"bullet": True, "html": "Numbers on Galapagos islands increased, due to lack of predators"},
                        {"h": "17th century"},
                        {"bullet": True, "html": 'small numbers taken onto ships used by <Q n="8">'},
                        {"h": "1790s"},
                        {"bullet": True, "html": 'very large numbers taken onto whaling ships, kept for <Q n="9"> and also used to produce <Q n="10">'},
                        {"bullet": True, "html": 'Hunted by <Q n="11"> on the islands'},
                        {"bullet": True, "html": 'Habitat destruction: for the establishment of agriculture and by various <Q n="12"> not native to the islands, which also fed on baby tortoises and tortoises\' <Q n="13">'},
                    ],
                    "questions": [
                        Q(8, "pirates"),
                        Q(9, "food"),
                        Q(10, "oil"),
                        Q(11, "settlers"),
                        Q(12, "species"),
                        Q(13, "eggs"),
                    ],
                },
            ],
        },
        {
            "id": 2,
            "passage": {
                "title": "The Intersection of Health Sciences and Geography",
                "byline": _byline(14, 26, 2, below=False),
                "paras": [
                    _p("A", "While many diseases that affect humans have been eradicated due to improvements in vaccinations and the availability of healthcare, there are still areas around the world where certain health issues are more prevalent. In a world that is far more globalised than ever before, people come into contact with one another through travel and living closer and closer to each other. As a result, super-viruses and other infections resistant to antibiotics are becoming more and more common."),
                    _p("B", "Geography can often play a very large role in the health concerns of certain populations. For instance, depending on where you live, you will not have the same health concerns as someone who lives in a different geographical region. Perhaps one of the most obvious examples of this idea is malaria-prone areas, which are usually tropical regions that foster a warm and damp environment in which the mosquitos that can give people this disease can grow. Malaria is much less of a problem in high-altitude deserts, for instance."),
                    _p("C", "In some countries, geographical factors influence the health and well-being of the population in very obvious ways. In many large cities, the wind is not strong enough to clear the air of the massive amounts of smog and pollution that cause asthma, lung problems, eyesight issues and more in the people who live there. Part of the problem is, of course, the massive number of cars being driven, in addition to factories that run on coal power. The rapid industrialisation of some countries in recent years has also led to the cutting down of forests to allow for the expansion of big cities, which makes it even harder to fight the pollution with the fresh air that is produced by plants."),
                    _p("D", "It is in situations like these that the field of health geography comes into its own. It is an increasingly important area of study in a world where diseases like polio are re-emerging, respiratory diseases continue to spread, and malaria-prone areas are still fighting to find a better cure. Health geography is the combination of, on the one hand, knowledge regarding geography and methods used to analyse and interpret geographical information, and on the other, the study of health, diseases and healthcare practices around the world. The aim of this hybrid science is to create solutions for common geography-based health problems. While people will always be prone to illness, the study of how geography affects our health could lead to the eradication of certain illnesses, and the prevention of others in the future. By understanding why and how we get sick, we can change the way we treat illness and disease specific to certain geographical locations."),
                    _p("E", "The geography of disease and ill health analyses the frequency with which certain diseases appear in different parts of the world, and overlays the data with the geography of the region, to see if there could be a correlation between the two. Health geographers also study factors that could make certain individuals or a population more likely to be taken ill with a specific health concern or disease, as compared with the population of another area. Health geographers in this field are usually trained as healthcare workers, and have an understanding of basic epidemiology as it relates to the spread of diseases among the population."),
                    _p("F", "Researchers study the interactions between humans and their environment that could lead to illness (such as asthma in places with high levels of pollution) and work to create a clear way of categorising illnesses, diseases and epidemics into local and global scales. Health geographers can map the spread of illnesses and attempt to identify the reasons behind an increase or decrease in illnesses, as they work to find a way to halt the further spread or re-emergence of diseases in vulnerable populations."),
                    _p("G", "The second subcategory of health geography is the geography of healthcare provision. This group studies the availability (or lack thereof) of healthcare resources to individuals and populations around the world. In both developed and developing nations there is often a very large discrepancy between the options available to people in different social classes, income brackets, and levels of education. Individuals working in the area of the geography of healthcare provision attempt to assess the levels of healthcare in the area (for instance, it may be very difficult for people to get medical attention because there is a mountain between their village and the nearest hospital). These researchers are on the frontline of making recommendations regarding policy to international organisations, local government bodies and others."),
                    _p("H", "The field of health geography is often overlooked, but it constitutes a huge area of need in the fields of geography and healthcare. If we can understand how geography affects our health no matter where in the world we are located, we can better treat disease, prevent illness, and keep people safe and well."),
                ],
            },
            "groups": [
                {
                    "kind": "match",
                    "title": "Questions 14–19",
                    "instruction": "Reading Passage 2 has eight sections, A–H.<br>Which paragraph contains the following information?<br>Write the correct letter, A–H, in boxes 14–19 on your answer sheet.<br>NB You may use any letter more than once.",
                    "noBox": True,
                    "boxTitle": "Paragraphs",
                    "box": {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "F": "F", "G": "G", "H": "H"},
                    "subTitle": "Information",
                    "questions": [
                        Q(14, "D", q="an acceptance that not all diseases can be totally eliminated"),
                        Q(15, "C", q="examples of physical conditions caused by human behaviour"),
                        Q(16, "F", q="a reference to classifying diseases on the basis of how far they extend geographically"),
                        Q(17, "G", q="reasons why the level of access to healthcare can vary within a country"),
                        Q(18, "D", q="a description of health geography as a mixture of different academic fields"),
                        Q(19, "B", q="a description of the type of area where a particular illness is rare"),
                    ],
                },
                {
                    "kind": "note",
                    "title": "Questions 20–26",
                    "instruction": "Complete the sentences below.<br>Choose ONE WORD ONLY from the passage for each answer.",
                    "lines": [
                        {"plain": True, "html": 'Certain diseases have disappeared, thanks to better <Q n="20"> and healthcare.'},
                        {"plain": True, "html": 'Because there is more contact between people, <Q n="21"> are losing their usefulness.'},
                        {"plain": True, "html": 'Disease-causing <Q n="22"> are most likely to be found in hot, damp regions.'},
                        {"plain": True, "html": 'One cause of pollution is that <Q n="23"> burn a particular fuel.'},
                        {"plain": True, "html": 'The growth of cities often has an impact on nearby <Q n="24">'},
                        {"plain": True, "html": '<Q n="25"> is one disease that is growing after having been eradicated.'},
                        {"plain": True, "html": 'A physical barrier such as a <Q n="26"> can prevent people from reaching a hospital.'},
                    ],
                    "questions": [
                        Q(20, "vaccinations"),
                        Q(21, "antibiotics"),
                        Q(22, "mosquitoes", "mosquitos"),
                        Q(23, "factories"),
                        Q(24, "forests"),
                        Q(25, "Polio"),
                        Q(26, "mountain"),
                    ],
                },
            ],
        },
        {
            "id": 3,
            "passage": {
                "title": "Music and the emotions",
                "byline": _byline(27, 40, 3, below=False),
                "paras": [
                    "<em>Neuroscientist Jonah Lehrer considers the emotional power of music</em>",
                    "Why does music make us feel? On the one hand, music is a purely abstract art form, devoid of language or explicit ideas. And yet, even though music says little, it still manages to touch us deeply. When listening to our favourite songs, our body betrays all the symptoms of emotional arousal. The pupils in our eyes dilate, our pulse and blood pressure rise, the electrical conductance of our skin is lowered, and the cerebellum, a brain region associated with bodily movement, becomes strangely active. Blood is even re-directed to the muscles in our legs. In other words, sound stirs us at our biological roots.",
                    "A recent paper in Nature Neuroscience by a research team in Montreal, Canada, marks an important step in revealing the precise underpinnings of 'the potent pleasurable stimulus' that is music. Although the study involves plenty of fancy technology, including functional magnetic resonance imaging (fMRI) and ligand-based positron emission tomography (PET) scanning, the experiment itself was rather straightforward. After screening 217 individuals who responded to advertisements requesting people who experience 'chills' to instrumental music, the scientists narrowed down the subject pool to ten. They then asked the subjects to bring in their playlist of favourite songs – virtually every genre was represented, from techno to tango – and played them the music while their brain activity was monitored. Because the scientists were combining methodologies (PET and fMRI), they were able to obtain an impressively exact and detailed portrait of music in the brain. The first thing they discovered is that music triggers the production of dopamine – a chemical with a key role in setting people's moods – by the neurons (nerve cells) in both the dorsal and ventral regions of the brain. As these two regions have long been linked with the experience of pleasure, this finding isn't particularly surprising.",
                    "What is rather more significant is the finding that the dopamine neurons in the caudate – a region of the brain involved in learning stimulus-response associations, and in anticipating food and other 'reward' stimuli – were at their most active around 15 seconds before the participants' favourite moments in the music. The researchers call this the 'anticipatory phase' and argue that the purpose of this activity is to help us predict the arrival of our favourite part. The question, of course, is what all these dopamine neurons are up to. Why are they so active in the period preceding the acoustic climax? After all, we typically associate surges of dopamine with pleasure, with the processing of actual rewards. And yet, this cluster of cells is most active when the 'chills' have yet to arrive, when the melodic pattern is still unresolved.",
                    "One way to answer the question is to look at the music and not the neurons. While music can often seem (at least to the outsider) like a labyrinth of intricate patterns, it turns out that the most important part of every song or symphony is when the patterns break down, when the sound becomes unpredictable. If the music is too obvious, it is annoyingly boring, like an alarm clock. Numerous studies, after all, have demonstrated that dopamine neurons quickly adapt to predictable rewards. If we know what's going to happen next, then we don't get excited. This is why composers often introduce a key note in the beginning of a song, spend most of the rest of the piece in the studious avoidance of the pattern, and then finally repeat it only at the end. The longer we are denied the pattern we expect, the greater the emotional release when the pattern returns, safe and sound.",
                    "To demonstrate this psychological principle, the musicologist Leonard Meyer, in his classic book Emotion and Meaning in Music (1956), analysed the 5th movement of Beethoven's String Quartet in C-sharp minor, Op. 131. Meyer wanted to show how music is defined by its flirtation with – but not submission to – our expectations of order. Meyer dissected 50 measures (bars) of the masterpiece, showing how Beethoven begins with the clear statement of a rhythmic and harmonic pattern and then, in an ingenious tonal dance, carefully holds off repeating it. What Beethoven does instead is suggest variations of the pattern. He wants to preserve an element of uncertainty in his music, making our brains beg for the one chord he refuses to give us. Beethoven saves that chord for the end.",
                    "According to Meyer, it is the suspenseful tension of music, arising out of our unfulfilled expectations, that is the source of the music's feeling. While earlier theories of music focused on the way a sound can refer to the real world of images and experiences – its 'connotative' meaning – Meyer argued that the emotions we find in music come from the unfolding events of the music itself. This 'embodied meaning' arises from the patterns the symphony invokes and then ignores. It is this uncertainty that triggers the surge of dopamine in the caudate, as we struggle to figure out what will happen next. We can predict some of the notes, but we can't predict them all, and that is what keeps us listening, waiting expectantly for our reward, for the pattern to be completed.",
                ],
            },
            "groups": [
                {
                    "kind": "note",
                    "title": "Questions 27–31",
                    "instruction": "Complete the summary below.<br>Choose NO MORE THAN TWO WORDS from the passage for each answer.",
                    "noteTitle": "The Montreal Study",
                    "lines": [
                        {
                            "plain": True,
                            "html": 'Participants, who were recruited for the study through advertisements, had their brain activity monitored while listening to their favourite music. It was noted that the music stimulated the brain\'s neurons to release a substance called <Q n="27"> in two of the parts of the brain which are associated with feeling <Q n="28">.',
                        },
                        {
                            "plain": True,
                            "html": 'Researchers also observed that the neurons in the area of the brain called the <Q n="29"> were particularly active just before the participants\' favourite moments in the music – the period known as the <Q n="30">. Activity in this part of the brain is associated with the expectation of \'reward\' stimuli such as <Q n="31">.',
                        },
                    ],
                    "questions": [
                        Q(27, "dopamine"),
                        Q(28, "pleasure"),
                        Q(29, "caudate"),
                        Q(30, "anticipatory phase"),
                        Q(31, "food"),
                    ],
                },
                {
                    "kind": "mcq",
                    "title": "Questions 32–36",
                    "instruction": "Choose the correct letter, A, B, C or D.",
                    "questions": [
                        Q(
                            32,
                            "B",
                            q="What point does the writer emphasise in the first paragraph?",
                            options={
                                "A": "how dramatically our reactions to music can vary",
                                "B": "how intense our physical responses to music can be",
                                "C": "how little we know about the way that music affects us",
                                "D": "how much music can tell us about how our brains operate",
                            },
                        ),
                        Q(
                            33,
                            "C",
                            q="What view of the Montreal study does the writer express in the second paragraph?",
                            options={
                                "A": "Its aims were innovative.",
                                "B": "The approach was too simplistic.",
                                "C": "It produced some remarkably precise data.",
                                "D": "The technology used was unnecessarily complex.",
                            },
                        ),
                        Q(
                            34,
                            "A",
                            q="What does the writer find interesting about the results of the Montreal study?",
                            options={
                                "A": "the timing of participants' neural responses to the music",
                                "B": "the impact of the music on participants' emotional state",
                                "C": "the section of participants' brains which was activated by the music",
                                "D": "the type of music which had the strongest effect on participants' brains",
                            },
                        ),
                        Q(
                            35,
                            "B",
                            q="Why does the writer refer to Meyer's work on music and emotion?",
                            options={
                                "A": "to propose an original theory about the subject",
                                "B": "to offer support for the findings of the Montreal study",
                                "C": "to recommend the need for further research into the subject",
                                "D": "to present a view which opposes that of the Montreal researchers",
                            },
                        ),
                        Q(
                            36,
                            "D",
                            q="According to Leonard Meyer, what causes the listener's emotional response to music?",
                            options={
                                "A": "the way that the music evokes poignant memories in the listener",
                                "B": "the association of certain musical chords with certain feelings",
                                "C": "the listener's sympathy with the composer's intentions",
                                "D": "the internal structure of the musical composition",
                            },
                        ),
                    ],
                },
                {
                    "kind": "match",
                    "title": "Questions 37–40",
                    "instruction": "Complete each sentence with the correct ending, A–F, below.<br>Write the correct letter, A–F, in boxes 37–40 on your answer sheet.",
                    "boxTitle": "Endings",
                    "box": {
                        "A": "our response to music depends on our initial emotional state.",
                        "B": "neuron activity decreases if outcomes become predictable.",
                        "C": "emotive music can bring to mind actual pictures and events.",
                        "D": "experiences in our past can influence our emotional reaction to music.",
                        "E": "emotive music delays giving listeners what they expect to hear.",
                        "F": "neuron activity increases prior to key points in a musical piece.",
                    },
                    "subTitle": "Sentence beginnings",
                    "questions": [
                        Q(37, "F", q="The Montreal researchers discovered that"),
                        Q(38, "B", q="Many studies have demonstrated that"),
                        Q(39, "E", q="Meyer's analysis of Beethoven's music shows that"),
                        Q(40, "C", q="Earlier theories of music suggested that"),
                    ],
                },
            ],
        },
    ],
)

_TEST4 = _test(
    4,
    [
        {
            "id": 1,
            "passage": {
                "title": "The History of Glass",
                "byline": _byline(1, 13, 1),
                "paras": [
                    "From our earliest origins, man has been making use of glass. Historians have discovered that a type of natural glass – obsidian – formed in places such as the mouth of a volcano as a result of the intense heat of an eruption melting sand – was first used as tips for spears. Archaeologists have even found evidence of man-made glass which dates back to 4000 BC; this took the form of glazes used for coating stone beads. It was not until 1500 BC, however, that the first hollow glass container was made by covering a sand core with a layer of molten glass.",
                    "Glass blowing became the most common way to make glass containers from the first century BC. The glass made during this time was highly coloured due to the impurities of the raw material. In the first century AD, methods of creating colourless glass were developed, which was then tinted by the addition of colouring materials. The secret of glass making was taken across Europe by the Romans during this century. However, they guarded the skills and technology required to make glass very closely, and it was not until their empire collapsed in 476 AD that glass-making knowledge became widespread throughout Europe and the Middle East. From the 10th century onwards, the Venetians gained a reputation for technical skill and artistic ability in the making of glass bottles, and many of the city's craftsmen left Italy to set up glassworks throughout Europe.",
                    "A major milestone in the history of glass occurred with the invention of lead crystal glass by the English glass manufacturer George Ravenscroft (1632-1683). He attempted to counter the effect of clouding that sometimes occurred in blown glass by introducing lead to the raw materials used in the process. The new glass he created was softer and easier to decorate, and had a higher refractive index, adding to its brilliance and beauty, and it proved invaluable to the optical industry. It is thanks to Ravenscroft's invention that optical lenses, astronomical telescopes, microscopes and the like became possible.",
                    "In Britain, the modern glass industry only really started to develop after the repeal of the Excise Act in 1845. Before that time, heavy taxes had been placed on the amount of glass melted in a glasshouse, and were levied continuously from 1745 to 1845. Joseph Paxton's Crystal Palace at London's Great Exhibition of 1851 marked the beginning of glass as a material used in the building industry. This revolutionary new building encouraged the use of glass in public, domestic and horticultural architecture. Glass manufacturing techniques also improved with the advancement of science and the development of better technology.",
                    "From 1887 onwards, glass making developed from traditional mouth-blowing to a semi-automatic process, after factory-owner HM Ashley introduced a machine capable of producing 200 bottles per hour in Castleford, Yorkshire, England – more than three times quicker than any previous production method. Then in 1907, the first fully automated machine was developed in the USA by Michael Owens – founder of the Owens Bottle Machine Company (later the major manufacturers Owens-Illinois) – and installed in its factory. Owens' invention could produce an impressive 2,500 bottles per hour. Other developments followed rapidly, but it was not until the First World War, when Britain became cut off from essential glass suppliers, that glass became part of the scientific sector. Previous to this, glass had been seen as a craft rather than a precise science.",
                    "Today, glass making is big business. It has become a modern, hi-tech industry operating in a fiercely competitive global market where quality, design and service levels are critical to maintaining market share. Modern glass plants are capable of making millions of glass containers a day in many different colours, with green, brown and clear remaining the most popular. Few of us can imagine modern life without glass. It features in almost every aspect of our lives – in our homes, our cars and whenever we sit down to eat or drink. Glass packaging is used for many products, many beverages are sold in glass, as are numerous foodstuffs, as well as medicines and cosmetics.",
                    "Glass is an ideal material for recycling, and with growing consumer concern for green issues, glass bottles and jars are becoming ever more popular. Glass recycling is good news for the environment. It saves used glass containers being sent to landfill. As less energy is needed to melt recycled glass than to melt down raw materials, this also saves fuel and production costs. Recycling also reduces the need for raw materials to be quarried, thus saving precious resources.",
                ],
            },
            "groups": [
                {
                    "kind": "note",
                    "title": "Questions 1–8",
                    "instruction": "Complete the notes below.<br>Choose ONE WORD ONLY from the passage for each answer.",
                    "noteTitle": "The History of Glass",
                    "lines": [
                        {"bullet": True, "html": 'Early humans used a material called <Q n="1"> to make the sharp points of their <Q n="2">.'},
                        {"bullet": True, "html": '4000 BC: <Q n="3"> made of stone were covered in a coating of man-made glass.'},
                        {"bullet": True, "html": 'First century BC: glass was coloured because of the <Q n="4"> in the material.'},
                        {"bullet": True, "html": 'Until 476 AD: Only the <Q n="5"> knew how to make glass.'},
                        {"bullet": True, "html": "From 10th century: Venetians became famous for making bottles out of glass."},
                        {"bullet": True, "html": '17th century: George Ravenscroft developed a process using <Q n="6"> to avoid the occurrence of <Q n="7"> in blown glass.'},
                        {"bullet": True, "html": 'Mid-19th century: British glass production developed after changes to laws concerning <Q n="8">'},
                    ],
                    "questions": [
                        Q(1, "obsidian"),
                        Q(2, "spears"),
                        Q(3, "beads"),
                        Q(4, "impurities"),
                        Q(5, "Romans"),
                        Q(6, "lead"),
                        Q(7, "clouding"),
                        Q(8, "taxes"),
                    ],
                },
                {
                    "kind": "tfng",
                    "title": "Questions 9–13",
                    "instruction": _TF.format(n=1, lo=9, hi=13),
                    "questions": [
                        Q(9, "TRUE", q="In 1887, HM Ashley had the fastest bottle-producing machine that existed at the time."),
                        Q(10, "FALSE", q="Michael Owens was hired by a large US company to design a fully-automated bottle manufacturing machine for them."),
                        Q(11, "NOT GIVEN", q="Nowadays, most glass is produced by large international manufacturers."),
                        Q(12, "TRUE", q="Concern for the environment is leading to an increased demand for glass containers."),
                        Q(13, "FALSE", q="It is more expensive to produce recycled glass than to manufacture new glass."),
                    ],
                },
            ],
        },
        {
            "id": 2,
            "passage": {
                "title": "Bring back the big cats",
                "byline": _byline(14, 26, 2),
                "paras": [
                    "<em>It's time to start returning vanished native animals to Britain, says John Vesty</em>",
                    "There is a poem, written around 598 AD, which describes hunting a mystery animal called a llewyn. But what was it? Nothing seemed to fit, until 2006, when an animal bone, dating from around the same period, was found in the Kinsey Cave in northern England. Until this discovery, the lynx – a large spotted cat with tasselled ears – was presumed to have died out in Britain at least 6,000 years ago, before the inhabitants of these islands took up farming. But the 2006 find, together with three others in Yorkshire and Scotland, is compelling evidence that the lynx and the mysterious llewyn were in fact one and the same animal. If this is so, it would bring forward the tassel-eared cat's estimated extinction date by roughly 5,000 years.",
                    "However, this is not quite the last glimpse of the animal in British culture. A 9th-century stone cross from the Isle of Eigg shows, alongside the deer, boar and aurochs pursued by a mounted hunter, a speckled cat with tasselled ears. Were it not for the animal's backside having worn away with time, we could have been certain, as the lynx's stubby tail is unmistakable. But even without this key feature, it's hard to see what else the creature could have been. The lynx is now becoming the totemic animal of a movement that is transforming British environmentalism: rewilding.",
                    "Rewilding means the mass restoration of damaged ecosystems. It involves letting trees return to places that have been denuded, allowing parts of the seabed to recover from trawling and dredging, permitting rivers to flow freely again. Above all, it means bringing back missing species. One of the most striking findings of modern ecology is that ecosystems without large predators behave in completely different ways from those that retain them. Some of them drive dynamic processes that resonate through the whole food chain, creating niches for hundreds of species that might otherwise struggle to survive. The killers turn out to be bringers of life.",
                    "Such findings present a big challenge to British conservation, which has often selected arbitrary assemblages of plants and animals and sought, at great effort and expense, to prevent them from changing. It has tried to preserve the living world as if it were a jar of pickles, letting nothing in and nothing out, keeping nature in a state of arrested development. But ecosystems are not merely collections of species; they are also the dynamic and ever-shifting relationships between them. And this dynamism often depends on large predators.",
                    "At sea the potential is even greater: by protecting large areas from commercial fishing, we could once more see what 18th-century literature describes: vast shoals of fish being chased by fin and sperm whales, within sight of the English shore. This policy would also greatly boost catches in the surrounding seas; the fishing industry's insistence on scouring every inch of seabed, leaving no breeding reserves, could not be more damaging to its own interests.",
                    "Rewilding is a rare example of an environmental movement in which campaigners articulate what they are for rather than only what they are against. One of the reasons why the enthusiasm for rewilding is spreading so quickly in Britain is that it helps to create a more inspiring vision than the green movement's usual promise of 'Follow us and the world will be slightly less awful than it would otherwise have been.'",
                    "The lynx presents no threat to human beings: there is no known instance of one preying on people. It is a specialist predator of roe deer, a species that has exploded in Britain in recent decades, holding back, by intensive browsing, attempts to re-establish forests. It will also winkle out sika deer: an exotic species that is almost impossible for human beings to control, as it hides in impenetrable plantations of young trees. The attempt to reintroduce this predator marries well with the aim of bringing forests back to parts of our bare and barren uplands. The lynx requires deep cover, and as such presents little risk to sheep and other livestock, which are supposed, as a condition of farm subsidies, to be kept out of the woods.",
                    "On a recent trip to the Cairngorm Mountains, I heard several conservationists suggest that the lynx could be reintroduced there within 20 years. If trees return to the bare hills elsewhere in Britain, the big cats could soon follow. There is nothing extraordinary about these proposals, seen from the perspective of anywhere else in Europe. The lynx has now been reintroduced to the Jura Mountains, the Alps, the Vosges in eastern France and the Harz mountains in Germany, and has re-established itself in many more places. The European population has tripled since 1970 to roughly 10,000. As with wolves, bears, beavers, boar, bison, moose and many other species, the lynx has been able to spread as farming has left the hills and people discover that it is more lucrative to protect charismatic wildlife than to hunt it, as tourists will pay for the chance to see it. Large-scale rewilding is happening almost everywhere – except Britain.",
                    "Here, attitudes are just beginning to change. Conservationists are starting to accept that the old preservation-jar model is failing, even on its own terms. Already, projects such as Trees for Life in the Highlands provide a hint of what might be coming. An organisation is being set up that will seek to catalyse the rewilding of land and sea across Britain, its aim being to reintroduce that rarest of species to British ecosystems: hope.",
                ],
            },
            "groups": [
                {
                    "kind": "mcq",
                    "title": "Questions 14–18",
                    "instruction": "Choose the correct letter, A, B, C or D.",
                    "questions": [
                        Q(
                            14,
                            "D",
                            q="What did the 2006 discovery of the animal bone reveal about the lynx?",
                            options={
                                "A": "Its physical appearance was very distinctive.",
                                "B": "Its extinction was linked to the spread of farming.",
                                "C": "It vanished from Britain several thousand years ago.",
                                "D": "It survived in Britain longer than was previously thought.",
                            },
                        ),
                        Q(
                            15,
                            "A",
                            q="What point does the writer make about large predators in the third paragraph?",
                            options={
                                "A": "Their presence can increase biodiversity.",
                                "B": "They may cause damage to local ecosystems.",
                                "C": "Their behaviour can alter according to the environment.",
                                "D": "They should be reintroduced only to areas where they were native.",
                            },
                        ),
                        Q(
                            16,
                            "C",
                            q="What does the writer suggest about British conservation in the fourth paragraph?",
                            options={
                                "A": "It has failed to achieve its aims.",
                                "B": "It is beginning to change direction.",
                                "C": "It has taken a misguided approach.",
                                "D": "It has focused on the most widespread species.",
                            },
                        ),
                        Q(
                            17,
                            "A",
                            q="Protecting large areas of the sea from commercial fishing would result in",
                            options={
                                "A": "practical benefits for the fishing industry.",
                                "B": "some short-term losses to the fishing industry.",
                                "C": "widespread opposition from the fishing industry.",
                                "D": "certain changes to techniques within the fishing industry.",
                            },
                        ),
                        Q(
                            18,
                            "C",
                            q="According to the author, what distinguishes rewilding from other environmental campaigns?",
                            options={
                                "A": "Its objective is more achievable.",
                                "B": "Its supporters are more articulate.",
                                "C": "Its positive message is more appealing.",
                                "D": "It is based on sounder scientific principles.",
                            },
                        ),
                    ],
                },
                {
                    "kind": "wbank",
                    "title": "Questions 19–22",
                    "instruction": "Complete the summary using the list of words and phrases A–F below.<br>Write the correct letter, A–F, in boxes 19–22 on your answer sheet.",
                    "noteTitle": "Reintroducing the lynx to Britain",
                    "box": {
                        "A": "trees",
                        "B": "endangered species",
                        "C": "hillsides",
                        "D": "wild animals",
                        "E": "humans",
                        "F": "farm animals",
                    },
                    "lines": [
                        {
                            "html": 'There would be many advantages to reintroducing the lynx to Britain. While there is no evidence that the lynx has ever put <Q n="19"> in danger, it would reduce the numbers of certain <Q n="20"> whose populations have increased enormously in recent decades. It would present only a minimal threat to <Q n="21">, provided these were kept away from lynx habitats. Furthermore, the reintroduction programme would also link efficiently with initiatives to return native <Q n="22"> to certain areas of the country.'
                        }
                    ],
                    "questions": [Q(19, "E"), Q(20, "D"), Q(21, "F"), Q(22, "A")],
                },
                {
                    "kind": "tfng",
                    "title": "Questions 23–26",
                    "instruction": _YN.format(kind="claims", n=2, lo=23, hi=26),
                    "variant": "yn",
                    "questions": [
                        Q(23, "NO", q="Britain could become the first European country to reintroduce the lynx."),
                        Q(24, "NOT GIVEN", q="The large growth in the European lynx population since 1970 has exceeded conservationists' expectations."),
                        Q(25, "YES", q="Changes in agricultural practices have extended the habitat of the lynx in Europe."),
                        Q(26, "YES", q="It has become apparent that species reintroduction has commercial advantages."),
                    ],
                },
            ],
        },
        {
            "id": 3,
            "passage": {
                "title": "UK companies need more effective boards of directors",
                "byline": _byline(27, 40, 3),
                "paras": [
                    _p("A", "After a number of serious failures of governance (that is, how they are managed at the highest level), companies in Britain, as well as elsewhere, should consider radical changes to their directors' roles. It is clear that the role of a board director today is not an easy one. Following the 2008 financial meltdown, which resulted in a deeper and more prolonged period of economic downturn than anyone expected, the search for explanations in the many post-mortems of the crisis has meant blame has been spread far and wide. Governments, regulators, central banks and auditors have all been in the frame. The role of bank directors and management and their widely publicised failures have been extensively picked over and examined in reports, inquiries and commentaries."),
                    _p("B", "The knock-on effect of this scrutiny has been to make the governance of companies in general an issue of intense public debate and has significantly increased the pressures on, and the responsibilities of, directors. At the simplest and most practical level, the time involved in fulfilling the demands of a board directorship has increased significantly, calling into question the effectiveness of the classic model of corporate governance by part-time, independent non-executive directors. Where once a board schedule may have consisted of between eight and ten meetings a year, in many companies the number of events requiring board input and decisions has dramatically risen. Furthermore, the amount of reading and preparation required for each meeting is increasing. Agendas can become overloaded and this can mean the time for constructive debate must necessarily be restricted in favour of getting through the business."),
                    _p("C", "Often, board business is devolved to committees in order to cope with the workload, which may be more efficient but can mean that the board as a whole is less involved in fully addressing some of the most important issues. It is not uncommon for the audit committee meeting to last longer than the main board meeting itself. Process may take the place of discussion and be at the expense of real collaboration, so that boxes are ticked rather than issues tackled."),
                    _p("D", "A radical solution, which may work for some very large companies whose businesses are extensive and complex, is the professional board, whose members would work up to three or four days a week, supported by their own dedicated staff and advisers. There are obvious risks to this and it would be important to establish clear guidelines for such a board to ensure that it did not step on the toes of management by becoming too engaged in the day-to-day running of the company. Problems of recruitment, remuneration and independence could also arise and this structure would not be appropriate for all companies. However, more professional and better-informed boards would have been particularly appropriate for banks where the executives had access to information that part-time non-executive directors lacked, leaving the latter unable to comprehend or anticipate the 2008 crash."),
                    _p("E", "One of the main criticisms of boards and their directors is that they do not focus sufficiently on longer-term matters of strategy, sustainability and governance, but instead concentrate too much on short-term financial metrics. Regulatory requirements and the structure of the market encourage this behaviour. The tyranny of quarterly reporting can distort board decision-making, as directors have to 'make the numbers' every four months to meet the insatiable appetite of the market for more data. This serves to encourage the trading methodology of a certain kind of investor who moves in and out of a stock without engaging in constructive dialogue with the company about strategy or performance, and is simply seeking a short-term financial gain. This effect has been made worse by the changing profile of investors due to the globalisation of capital and the increasing use of automated trading systems. Corporate culture adapts and management teams are largely incentivised to meet financial goals."),
                    _p("F", "Compensation for chief executives has become a combat zone where pitched battles between investors, management and board members are fought, often behind closed doors but increasingly frequently in the full glare of press attention. Many would argue that this is in the interest of transparency and good governance as shareholders use their muscle in the area of pay to pressure boards to remove underperforming chief executives. Their powers to vote down executive remuneration policies increased when binding votes came into force. The chair of the remuneration committee can be an exposed and lonely role, as Alison Carnwath, chair of Barclays Bank's remuneration committee, found when she had to resign, having been roundly criticised for trying to defend the enormous bonus to be paid to the chief executive; the irony being that she was widely understood to have spoken out against it in the privacy of the committee."),
                    _p("G", "The financial crisis stimulated a debate about the role and purpose of the company and a heightened awareness of corporate ethics. Trust in the corporation has been eroded and academics such as Michael Sandel, in his thoughtful and bestselling book What Money Can't Buy, are questioning the morality of capitalism and the market economy. Boards of companies in all sectors will need to widen their perspective to encompass these issues and this may involve a realignment of corporate goals. We live in challenging times."),
                ],
            },
            "groups": [
                {
                    "kind": "match",
                    "title": "Questions 27–33",
                    "instruction": "Reading Passage 3 has seven paragraphs, A–G.<br>Choose the correct heading for each paragraph from the list of headings below.<br>Write the correct number, i–viii, in boxes 27–33 on your answer sheet.",
                    "boxTitle": "List of Headings",
                    "box": {
                        "i": "Disputes over financial arrangements regarding senior managers",
                        "ii": "The impact on companies of being subjected to close examination",
                        "iii": "The possible need for fundamental change in every area of business",
                        "iv": "Many external bodies being held responsible for problems",
                        "v": "The falling number of board members with broad enough experience",
                        "vi": "A risk that not all directors take part in solving major problems",
                        "vii": "Boards not looking far enough ahead",
                        "viii": "A proposal to change the way the board operates",
                    },
                    "questions": [
                        Q(27, "iv", q="Paragraph A"),
                        Q(28, "ii", q="Paragraph B"),
                        Q(29, "vi", q="Paragraph C"),
                        Q(30, "viii", q="Paragraph D"),
                        Q(31, "vii", q="Paragraph E"),
                        Q(32, "i", q="Paragraph F"),
                        Q(33, "iii", q="Paragraph G"),
                    ],
                },
                {
                    "kind": "tfng",
                    "title": "Questions 34–37",
                    "instruction": _YN.format(kind="claims", n=3, lo=34, hi=37),
                    "variant": "yn",
                    "questions": [
                        Q(34, "YES", q="Close scrutiny of the behaviour of boards has increased since the economic downturn."),
                        Q(35, "NOT GIVEN", q="Banks have been mismanaged to a greater extent than other businesses."),
                        Q(36, "NO", q="Board meetings normally continue for as long as necessary to debate matters in full."),
                        Q(37, "NO", q="Using a committee structure would ensure that board members are fully informed about significant issues."),
                    ],
                },
                {
                    "kind": "note",
                    "title": "Questions 38–40",
                    "instruction": "Complete the sentences below.<br>Choose ONE WORD ONLY from the passage for each answer.",
                    "lines": [
                        {"plain": True, "html": 'Before 2008, non-executive directors were at a disadvantage because of their lack of <Q n="38">'},
                        {"plain": True, "html": 'Boards tend to place too much emphasis on <Q n="39"> considerations that are only of short-term relevance.'},
                        {"plain": True, "html": 'On certain matters, such as pay, the board may have to accept the views of <Q n="40">'},
                    ],
                    "questions": [
                        Q(38, "information"),
                        Q(39, "financial"),
                        Q(40, "shareholders", "investors"),
                    ],
                },
            ],
        },
    ],
)


if __name__ == "__main__":
    tests = reading_tests()
    assert list(tests) == [1, 2, 3, 4]
    for n, t in tests.items():
        qs = [q for p in t["passages"] for g in p["groups"] for q in g["questions"]]
        ids = [q["id"] for q in qs]
        assert ids == [f"Q{i}" for i in range(1, 41)], (n, ids)
        titles = [p["passage"]["title"] for p in t["passages"]]
        print(f"Test {n}: {len(qs)} questions — {titles}")
