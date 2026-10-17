#!/usr/bin/env python3
"""Patch C10 reading TEST blobs from official Cambridge 10 PDF."""
import json
import re
from pathlib import Path

ROOT = Path("/Users/frankman/yysd test center/library/mock/cambridge-reading")


def load_test(path):
    html = path.read_text(encoding="utf-8")
    m = re.search(r"const TEST = (\{.*?\n\});", html, re.S)
    if not m:
        raise SystemExit(f"no TEST in {path}")
    return html, m, json.loads(m.group(1))


def save_test(path, html, m, test):
    blob = json.dumps(test, ensure_ascii=False, indent=2)
    # keep `const TEST = {...};` indent like the file (2 spaces inside object)
    path.write_text(html[: m.start(1)] + blob + html[m.end(1) :], encoding="utf-8")


def q(no, stem, options, ans, extra=None):
    d = {
        "id": f"Q{no}",
        "no": no,
        "q": stem,
        "options": options,
        "answer": [ans],
        "explain": f"答案：{ans}。",
    }
    if extra:
        d.update(extra)
    return d


def yn(no, stem, ans):
    return {
        "id": f"Q{no}",
        "no": no,
        "q": stem,
        "answer": [ans],
        "explain": f"答案：{ans}。",
    }


def match_q(no, stem, ans):
    return {
        "id": f"Q{no}",
        "no": no,
        "q": stem,
        "answer": [ans],
        "explain": f"答案：{ans}。",
    }


def fill_q(no, ans, alts=None):
    a = [ans] + (alts or [])
    return {
        "id": f"Q{no}",
        "no": no,
        "answer": a,
        "explain": f"答案：{', '.join(a)}。",
    }


def patch_tfng_wbank(html):
    html = html.replace(
        "const opts = g.variant==='yn' ? ['YES','NO','NOT GIVEN'] : ['TRUE','FALSE','NOT GIVEN'];",
        "const opts = (g.labels && g.labels.length) ? g.labels : (g.variant==='yn' ? ['YES','NO','NOT GIVEN'] : ['TRUE','FALSE','NOT GIVEN']);",
    )
    old = """    const cols=g.boxCols||2;
    const box=`<div class="match-box wbank-box" style="columns:${cols};">${Object.entries(g.box).map(([k,v])=>`<div class="mb-row"><strong>${k}</strong><span>${v}</span></div>`).join('')}</div>`;
    const letters=Object.keys(g.box);
    const expand=html=>(html==null?'':String(html)).replace(/<Q n="(\\d+)">/g,(m,n)=>`<span class="qnum-badge">${n}</span><select id="Q${n}"><option value="">—</option>${letters.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`);
    const para=(g.noteTitle?`<div class="note-title">${g.noteTitle}</div>`:'')+g.lines.map(l=>`<div class="note-li plain" style="display:block;">${expand(l.html)}</div>`).join('');"""
    new = """    const src=g.box||g.bank||{};
    const cols=g.boxCols||2;
    const box=`<div class="match-box wbank-box" style="columns:${cols};">${Object.entries(src).map(([k,v])=>`<div class="mb-row"><strong>${k}</strong><span>${v}</span></div>`).join('')}</div>`;
    const letters=Object.keys(src);
    const expand=html=>(html==null?'':String(html)).replace(/<Q n="(\\d+)">/g,(m,n)=>`<span class="qnum-badge">${n}</span><select id="Q${n}"><option value="">—</option>${letters.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`);
    const rawLines=g.lines||(g.text?[{html:g.text}]:[]);
    const para=(g.noteTitle?`<div class="note-title">${g.noteTitle}</div>`:'')+rawLines.map(l=>`<div class="note-li plain" style="display:block;">${expand(l.html)}</div>`).join('');"""
    if old not in html:
        raise SystemExit("wbank branch not found")
    return html.replace(old, new)


def patch_t1():
    path = ROOT / "cambridge-10-test-1-reading.html"
    html, m, test = load_test(path)
    p3 = test["passages"][2]
    p3["groups"][0]["questions"] = [
        q(27, "The example of the 'million-dollar quartet' underlines the writer's point about", {
            "A": "recognising talent.",
            "B": "working as a team.",
            "C": "having a shared objective.",
            "D": "being an effective leader.",
        }, "C"),
        q(28, "James Watson suggests that he and Francis Crick won the race to discover the DNA code because they", {
            "A": "were conscious of their own limitations.",
            "B": "brought complementary skills to their partnership.",
            "C": "were determined to outperform their brighter rivals.",
            "D": "encouraged each other to realise their joint ambition.",
        }, "A"),
        q(29, "The writer mentions competitions on breakfast cereal packets as an example of how to", {
            "A": "inspire creative thinking.",
            "B": "generate concise writing.",
            "C": "promote loyalty to a group.",
            "D": "strengthen commitment to an idea.",
        }, "D"),
        q(30, "In the last paragraph, the writer suggests that it is important for employees to", {
            "A": "be aware of their company's goals.",
            "B": "feel that their contributions are valued.",
            "C": "have respect for their co-workers' achievements.",
            "D": "understand why certain management decisions are made.",
        }, "B"),
    ]
    yn_g = p3["groups"][2]
    yn_g["instruction"] = "Do the following statements agree with the claims of the writer in Reading Passage 3? Write YES, NO or NOT GIVEN."
    yn_g["variant"] = "yn"
    yn_g["questions"] = [
        yn(36, "The physical surroundings in which a person works play a key role in determining their creativity.", "NO"),
        yn(37, "Most people have the potential to be creative.", "YES"),
        yn(38, "Teams work best when their members are of equally matched intelligence.", "NOT GIVEN"),
        yn(39, "It is easier for smaller companies to be innovative.", "NOT GIVEN"),
        yn(40, "A manager's approval of an idea is more persuasive than that of a colleague.", "NO"),
    ]
    html = html[: m.start()] + html[m.start():]
    save_test(path, html, m, test)
    html = path.read_text(encoding="utf-8")
    path.write_text(patch_tfng_wbank(html), encoding="utf-8")


def patch_t2():
    path = ROOT / "cambridge-10-test-2-reading.html"
    html, m, test = load_test(path)
    g = test["passages"][2]["groups"][0]
    if "bank" in g:
        g["box"] = g.pop("bank")
    if "text" in g:
        g["lines"] = [{"plain": True, "html": g.pop("text")}]
    g["noteTitle"] = g.get("noteTitle") or ""
    save_test(path, html, m, test)
    html = path.read_text(encoding="utf-8")
    path.write_text(patch_tfng_wbank(html), encoding="utf-8")


def patch_t3():
    path = ROOT / "cambridge-10-test-3-reading.html"
    html, m, test = load_test(path)
    p1 = test["passages"][0]
    p1["passage"]["byline"] = ""
    p1["passage"]["paras"] = [
        "<span class=\"para-label\">A</span>Travel has existed since the beginning of time, when primitive man set out, often traversing great distances in search of game, which provided the food and clothing necessary for his survival. Throughout the course of history, people have travelled for purposes of trade, religious conviction, economic gain, war, migration and other equally compelling motivations. In the Roman era, wealthy aristocrats and high government officials also travelled for pleasure. Seaside resorts located at Pompeii and Herculaneum afforded citizens the opportunity to escape to their vacation villas in order to avoid the summer heat of Rome. Travel, except during the Dark Ages, has continued to grow and, throughout recorded history, has played a vital role in the development of civilisations and their economies.",
        "<span class=\"para-label\">B</span>Tourism in the mass form as we know it today is a distinctly twentieth-century phenomenon. Historians suggest that the advent of mass tourism began in England during the industrial revolution with the rise of the middle class and the availability of relatively inexpensive transportation. The creation of the commercial airline industry following the Second World War and the subsequent development of the jet aircraft in the 1950s signalled the rapid growth and expansion of international travel. This growth led to the development of a major new industry: tourism. In turn, international tourism became the concern of a number of world governments since it not only provided new employment opportunities but also produced a means of earning foreign exchange.",
        "<span class=\"para-label\">C</span>Tourism today has grown significantly in both economic and social importance. In most industrialised countries over the past few years the fastest growth has been seen in the area of services. One of the largest segments of the service industry, although largely unrecognised as an entity in some of these countries, is travel and tourism. According to the World Travel and Tourism Council (1992), 'Travel and tourism is the largest industry in the world on virtually any economic measure including value-added capital investment, employment and tax contributions'. In 1992, the industry's gross output was estimated to be $3.5 trillion, over 12 per cent of all consumer spending. The travel and tourism industry is the world's largest employer with almost 130 million jobs, or almost 7 per cent of all employees. This industry is the world's leading industrial contributor, producing over 6 per cent of the world's gross national product and accounting for capital investment in excess of $422 billion in direct, indirect and personal taxes each year. Thus, tourism has a profound impact both on the world economy and, because of the educative effect of travel and the effects on employment, on society itself.",
        "<span class=\"para-label\">D</span>However, the major problems of the travel and tourism industry that have hidden, or obscured, its economic impact are the diversity and fragmentation of the industry itself. The travel industry includes: hotels, motels and other types of accommodation; restaurants and other food services; transportation services and facilities; amusements, attractions and other leisure facilities; gift shops and a large number of other enterprises. Since many of these businesses also serve local residents, the impact of spending by visitors can easily be overlooked or underestimated. In addition, Meis (1992) points out that the tourism industry involves concepts that have remained amorphous to both analysts and decision makers. Moreover, in all nations this problem has made it difficult for the industry to develop any type of reliable or credible tourism information base in order to estimate the contribution it makes to regional, national and global economies. However, the nature of this very diversity makes travel and tourism ideal vehicles for economic development in a wide variety of countries, regions or communities.",
        "<span class=\"para-label\">E</span>Once the exclusive province of the wealthy, travel and tourism have become an institutionalised way of life for most of the population. In fact, McIntosh and Goeldner (1990) suggest that tourism has become the largest commodity in international trade for many nations and, for a significant number of other countries, it ranks second or third. For example, tourism is the major source of income in Bermuda, Greece, Italy, Spain, Switzerland and most Caribbean countries. In addition, Hawkins and Ritchie, quoting from data published by the American Express Company, suggest that the travel and tourism industry is the number one ranked employer in the Bahamas, Brazil, Canada, France, (the former) West Germany, Hong Kong, Italy, Jamaica, Japan, Singapore, the United Kingdom and the United States. However, because of problems of definition, which directly affect statistical measurement, it is not possible with any degree of certainty to provide precise, valid or reliable data about the extent of world-wide tourism participation or its economic impact. In many cases, similar difficulties arise when attempts are made to measure domestic tourism.",
    ]
    p1["groups"][0] = {
        "kind": "match",
        "title": "Questions 1–4",
        "instruction": "Reading Passage 1 has five paragraphs, A–E. Choose the correct heading for paragraphs B–E from the list of headings below. Example: Paragraph A = viii.",
        "boxTitle": "List of Headings",
        "box": {
            "i": "Economic and social significance of tourism",
            "ii": "The development of mass tourism",
            "iii": "Travel for the wealthy",
            "iv": "Earning foreign exchange through tourism",
            "v": "Difficulty in recognising the economic effects of tourism",
            "vi": "The contribution of air travel to tourism",
            "vii": "The world impact of tourism",
            "viii": "The history of travel",
        },
        "questions": [
            match_q(1, "Paragraph B", "ii"),
            match_q(2, "Paragraph C", "i"),
            match_q(3, "Paragraph D", "v"),
            match_q(4, "Paragraph E", "vii"),
        ],
    }

    p3 = test["passages"][2]
    paras = p3["passage"]["paras"]
    paras[4] = "<span class=\"para-label\">D</span>DNA teased from these human remains may help answer one of the most puzzling questions in Pacific anthropology: did all Pacific islanders spring from one source or many? Was there only one outward migration from a single point in Asia, or several from different points? This represents the best opportunity we've had yet, says Spriggs, 'to find out who the Lapita actually were, where they came from, and who their closest descendants are today.'"
    paras[6] = "<span class=\"para-label\">F</span>'All we can say for certain is that the Lapita had canoes that were capable of ocean voyages, and they had the ability to sail them,' says Geoff Irwin, a professor of archaeology at the University of Auckland. Those sailing skills, he says, were developed and passed down over thousands of years by earlier mariners who worked their way through the archipelagos of the western Pacific, making short crossings to nearby islands. The real adventure didn't begin, however, until their Lapita descendants sailed out of sight of land, with empty horizons on every side. This must have been as difficult for them as landing on the moon is for us today. Certainly it distinguished them from their ancestors, but what gave them the courage to launch out on such risky voyages?"
    last = "However they did it, the Lapita spread themselves a third of the way across the Pacific, then called it quits for reasons known only to them. Ahead lay the vast emptiness of the central Pacific and perhaps they were too thinly stretched to venture farther. They probably never numbered more than a few thousand in total, and in their rapid migration eastward they encountered hundreds of islands – more than 300 in Fiji alone."
    if last not in paras[-1]:
        paras.append(last)

    p3["groups"][0] = {
        "kind": "wbank",
        "title": "Questions 27–31",
        "instruction": "Complete the summary using the list of words and phrases, A–J, below.",
        "noteTitle": "The Éfaté burial site",
        "box": {
            "A": "proof",
            "B": "plantation",
            "C": "harbour",
            "D": "bones",
            "E": "data",
            "F": "archaeological discovery",
            "G": "burial urn",
            "H": "source",
            "I": "animals",
            "J": "maps",
        },
        "lines": [
            {"plain": True, "html": "A 3,000-year-old burial ground of a seafaring people called the Lapita has been found on an abandoned <Q n=\"27\"> on the Pacific island of Éfaté. The cemetery, which is a significant <Q n=\"28\">, was uncovered accidentally by an agricultural worker."},
            {"plain": True, "html": "The Lapita explored and colonised many Pacific islands over several centuries. They took many things with them on their voyages including <Q n=\"29\"> and tools."},
            {"plain": True, "html": "The burial ground increases the amount of information about the Lapita available to scientists. A team of researchers, led by Matthew Spriggs from the Australian National University, are helping with the excavation of the site. Spriggs believes the <Q n=\"30\"> which was found at the site is very important since it confirms that the <Q n=\"31\"> found inside are Lapita."},
        ],
        "questions": [
            fill_q(27, "B"),
            fill_q(28, "F"),
            fill_q(29, "I"),
            fill_q(30, "G"),
            fill_q(31, "D"),
        ],
    }
    save_test(path, html, m, test)
    html = path.read_text(encoding="utf-8")
    path.write_text(patch_tfng_wbank(html), encoding="utf-8")


def patch_t4():
    path = ROOT / "cambridge-10-test-4-reading.html"
    html, m, test = load_test(path)
    p2 = test["passages"][1]
    p2["passage"]["paras"] = [
        "<span class=\"para-label\">A</span>Psychologists have long held that a person's character cannot undergo a transformation in any meaningful way and that the key traits of personality are determined at a very young age. However, researchers have begun looking more closely at ways we can change. Positive psychologists have identified 24 qualities we admire, such as loyalty and kindness, and are studying them to find out why they come so naturally to some people. What they're discovering is that many of these qualities amount to habitual behaviour that determines the way we respond to the world. The good news is that all this can be learned.",
        "Some qualities are less challenging to develop than others, optimism being one of them. However, developing qualities requires mastering a range of skills which are diverse and sometimes surprising. For example, to bring more joy and passion into your life, you must be open to experiencing negative emotions. Cultivating such qualities will help you realise your full potential.",
        "<span class=\"para-label\">B</span>'The evidence is good that most personality traits can be altered,' says Christopher Peterson, professor of psychology at the University of Michigan, who cites himself as an example. Inherently introverted, he realised early on that as an academic, his reticence would prove disastrous in the lecture hall. So he learned to be more outgoing and to entertain his classes. 'Now my extroverted behaviour is spontaneous,' he says.",
        "<span class=\"para-label\">C</span>David Fajgenbaum had to make a similar transition. He was preparing for university, when he had an accident that put an end to his sports career. On campus, he quickly found that beyond ordinary counselling, the university had no services for students who were undergoing physical rehabilitation and suffering from depression like him. He therefore launched a support group to help others in similar situations. He took action despite his own pain - a typical response of an optimist.",
        "<span class=\"para-label\">D</span>Suzanne Segerstrom, professor of psychology at the University of Kentucky, believes that the key to increasing optimism is through cultivating optimistic behaviour, rather than positive thinking. She recommends you train yourself to pay attention to good fortune by writing down three positive things that come about each day. This will help you convince yourself that favourable outcomes actually happen all the time, making it easier to begin taking action.",
        "<span class=\"para-label\">E</span>You can recognise a person who is passionate about a pursuit by the way they are so strongly involved in it. Tanya Streeter's passion is freediving - the sport of plunging deep into the water without tanks or other breathing equipment. Beginning in 1998, she set nine world records and can hold her breath for six minutes. The physical stamina required for this sport is intense but the psychological demands are even more overwhelming. Streeter learned to untangle her fears from her judgment of what her body and mind could do. 'In my career as a competitive freediver, there was a limit to what I could do - but it wasn't anywhere near what I thought it was,' she says.",
        "<span class=\"para-label\">F</span>Finding a pursuit that excites you can improve anyone's life. The secret about consuming passions, though, according to psychologist Paul Silvia of the University of North Carolina, is that 'they require discipline, hard work and ability, which is why they are so rewarding.' Psychologist Todd Kashdan has this advice for those people taking up a new passion: 'As a newcomer, you also have to tolerate and laugh at your own ignorance. You must be willing to accept the negative feelings that come your way,' he says.",
        "<span class=\"para-label\">G</span>In 2004, physician-scientist Mauro Zappaterra began his PhD research at Harvard Medical School. Unfortunately, he was miserable as his research wasn't compatible with his curiosity about healing. He finally took a break and during eight months in Santa Fe, Zappaterra learned about alternative healing techniques not taught at Harvard. When he got back, he switched labs to study how cerebrospinal fluid nourishes the developing nervous system. He also vowed to look for the joy in everything, including failure, as this could help him learn about his research and himself.",
        "One thing that can hold joy back is a person's concentration on avoiding failure rather than their looking forward to doing something well. 'Focusing on being safe might get in the way of your reaching your goals,' explains Kashdan. For example, are you hoping to get through a business lunch without embarrassing yourself, or are you thinking about how fascinating the conversation might be?",
        "<span class=\"para-label\">H</span>Usually, we think of courage in physical terms but ordinary life demands something else. For marketing executive Kenneth Pedeleose, it meant speaking out against something he thought was ethically wrong. The new manager was intimidating staff so Pedeleose carefully recorded each instance of bullying and eventually took the evidence to a senior director, knowing his own job security would be threatened. Eventually the manager was the one to go. According to Cynthia Pury, a psychologist at Clemson University, Pedeleose's story proves the point that courage is not motivated by fearlessness, but by moral obligation. Pury also believes that people can acquire courage. Many of her students said that faced with a risky situation, they first tried to calm themselves down, then looked for a way to mitigate the danger, just as Pedeleose did by documenting his allegations.",
        "Over the long term, picking up a new character trait may help you move toward being the person you want to be. And in the short term, the effort itself could be surprisingly rewarding, a kind of internal adventure.",
    ]
    test["passages"][2]["passage"]["paras"] = [
        "The description of any animal as an 'evolutionary throwback' is controversial. For the better part of a century, most biologists have been reluctant to use those words, mindful of a principle of evolution that says 'evolution cannot run backwards'. But as more and more examples come to light and modern genetics enters the scene, that principle is having to be rewritten. Not only are evolutionary throwbacks possible, they sometimes play an important role in the forward march of evolution.",
        "The technical term for an evolutionary throwback is an 'atavism', from the Latin atavus, meaning forefather. The word has ugly connotations thanks largely to Cesare Lombroso, a 19th-century Italian medic who argued that criminals were born not made and could be identified by certain physical features that were throwbacks to a primitive, sub-human state.",
        "While Lombroso was measuring criminals, a Belgian palaeontologist called Louis Dollo was studying fossil records and coming to the opposite conclusion. In 1890 he proposed that evolution was irreversible: that 'an organism is unable to return, even partially, to a previous stage already realised in the ranks of its ancestors'. Early 20th-century biologists came to a similar conclusion, though they qualified it in terms of probability, stating that there is no reason why evolution cannot run backwards - it is just very unlikely. And so the idea of irreversibility in evolution stuck and came to be known as 'Dollo's law'.",
        "If Dollo's law is right, atavisms should occur only very rarely, if at all. Yet almost since the idea took root, exceptions have been cropping up. In 1919, for example, a humpback whale with a pair of leg-like appendages over a metre long, complete with a full set of limb bones, was caught off Vancouver Island in Canada. Explorer Roy Chapman Andrews argued at the time that the whale must be a throwback to a land-living ancestor. 'I can see no other explanation,' he wrote in 1921.",
        "Since then, so many other examples have been discovered that it no longer makes sense to say that evolution is as good as irreversible. And this poses a puzzle: how can characteristics that disappeared millions of years ago suddenly reappear? In 1994, Rudolf Raff and colleagues at Indiana University in the USA decided to use genetics to put a number on the probability of evolution going into reverse. They reasoned that while some evolutionary changes involve the loss of genes and are therefore irreversible, others may be the result of genes being switched off. If these silent genes are somehow switched back on, they argued, long-lost traits could reappear.",
        "Raff's team went on to calculate the likelihood of it happening. Silent genes accumulate random mutations, they reasoned, eventually rendering them useless. So how long can a gene survive in a species if it is no longer used? The team calculated that there is a good chance of silent genes surviving for up to 6 million years in at least a few individuals in a population, and that some might survive as long as 10 million years. In other words, throwbacks are possible, but only to the relatively recent evolutionary past.",
        "As a possible example, the team pointed to the mole salamanders of Mexico and California. Like most amphibians these begin life in a juvenile 'tadpole' state, then metamorphose into the adult form — except for one species, the axolotl, which famously lives its entire life as a juvenile. The simplest explanation for this is that the axolotl lineage alone lost the ability to metamorphose, while others retained it. From a detailed analysis of the salamanders' family tree, however, it is clear that the other lineages evolved from an ancestor that itself had lost the ability to metamorphose. In other words, metamorphosis in mole salamanders is an atavism. The salamander example fits with Raff's 10-million-year time frame.",
        "More recently, however, examples have been reported that break the time limit, suggesting that silent genes may not be the whole story. In a paper published last year, biologist Gunter Wagner of Yale University reported some work on the evolutionary history of a group of South American lizards called Bachia. Many of these have minuscule limbs; some look more like snakes than lizards and a few have completely lost the toes on their hind limbs. Other species, however, sport up to four toes on their hind legs. The simplest explanation is that the toed lineages never lost their toes, but Wagner begs to differ. According to his analysis of the Bachia family tree, the toed species re-evolved toes from toeless ancestors and, what is more, digit loss and gain has occurred on more than one occasion over tens of millions of years.",
        "So what's going on? One possibility is that these traits are lost and then simply reappear, in much the same way that similar structures can independently arise in unrelated species, such as the dorsal fins of sharks and killer whales. Another more intriguing possibility is that the genetic information needed to make toes somehow survived for tens or perhaps hundreds of millions of years in the lizards and was reactivated. These atavistic traits provided an advantage and spread through the population, effectively reversing evolution.",
        "But if silent genes degrade within 6 to 10 million years, how can long-lost traits be reactivated over longer timescales? The answer may lie in the womb. Early embryos of many species develop ancestral features. Snake embryos, for example, sprout hind limb buds. Later in development these features disappear thanks to developmental programs that say 'lose the leg'. If for any reason this does not happen, the ancestral feature may not disappear, leading to an atavism.",
    ]
    save_test(path, html, m, test)
    html = path.read_text(encoding="utf-8")
    path.write_text(patch_tfng_wbank(html), encoding="utf-8")


if __name__ == "__main__":
    patch_t1()
    patch_t2()
    patch_t3()
    patch_t4()
    print("patched T1–T4")
