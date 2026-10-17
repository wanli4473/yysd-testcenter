#!/usr/bin/env python3
"""Rebuild R-CW bank from TOEFL-Hand answer-key screenshots."""
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from build_bank_from_png import unjam, still_jammed  # noqa: E402

OCR_BIN = "/tmp/ocr_vision"
CACHE = "/tmp/yysd-ocr-hand"
HAND = os.environ.get(
    "YYSD_CW_HAND",
    "/Users/frankman/Desktop/TOEFL-Hand/01-reading/01-R-CW",
)
OUT = os.path.join(ROOT, "app/library/toefl/bank-cw-reading.json")
FILE_RE = re.compile(r"^R-CW(\d+)-(.+)\.png$", re.I)
ANS_RE = re.compile(r"^(\d{1,2})\)\s*([A-Za-z][A-Za-z''\-]*)$")


def ocr_one(path):
    os.makedirs(CACHE, exist_ok=True)
    key = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(path))
    cache = os.path.join(CACHE, key + ".json")
    if os.path.exists(cache) and os.path.getsize(cache) > 2:
        return json.load(open(cache))
    raw = subprocess.check_output([OCR_BIN, path])
    data = json.loads(raw.decode())
    json.dump(data, open(cache, "w"), ensure_ascii=False)
    return data


def reading_order(rows, gap=0.018):
    rows = sorted(rows, key=lambda r: -r["y"])
    clusters = []
    for r in rows:
        if clusters and abs(clusters[-1][0]["y"] - r["y"]) < gap:
            clusters[-1].append(r)
        else:
            clusters.append([r])
    out = []
    for c in clusters:
        c.sort(key=lambda r: r["x"])
        out.extend(c)
    return out


def glue_lines(rows):
    out = []
    for r in reading_order(rows):
        t = (r.get("t") or "").strip()
        if t:
            out.append(t)
    return " ".join(out)


def normalize_blanks(s):
    s = s.replace("\u2014", "-").replace("\u2013", "-")
    s = re.sub(r"(?:_|\s){0,3}(?:\s_+)+\s*", "__", s)
    s = re.sub(r"([A-Za-z])\s+_+\s*", r"\1__", s)
    s = re.sub(r"_{3,}", "__", s)
    s = re.sub(r" {2,}", " ", s)
    return s.strip()


def extract_answers(lines):
    found = {}
    for r in lines:
        if r["y"] > 0.52 or r["y"] < 0.28:
            continue
        t = (r.get("t") or "").strip()
        m = ANS_RE.match(t)
        if m:
            found[int(m.group(1))] = m.group(2)
        else:
            for m in re.finditer(r"(\d{1,2})\)\s*([A-Za-z][A-Za-z''\-]*)", t):
                found[int(m.group(1))] = m.group(2)
    words = [found[i] for i in range(1, 11) if i in found]
    return words


def extract_passage(lines):
    rows = [r for r in lines if 0.54 <= r["y"] < 0.86]
    text = glue_lines(rows)
    text = re.sub(r"\b(?:答案|全文翻译)\b", " ", text)
    return normalize_blanks(text)


def extract_title(lines, fallback):
    top = [r for r in lines if r["y"] >= 0.86]
    if not top:
        return fallback
    t = glue_lines(top)
    t = re.sub(r"\s+", " ", t).strip()
    return t or fallback


def extract_zh(lines):
    rows = [r for r in lines if r["y"] < 0.26]
    text = glue_lines(rows)
    zh = "".join(re.findall(r"[\u4e00-\u9fff]+", text))
    return zh if len(zh) >= 12 else ""


def match_one(text, pos, word):
    rest = text[pos:]
    if not rest or not word:
        return None
    cands = []
    for k in range(len(word) - 1, 0, -1):
        pre = re.escape(word[:k])
        pats = [re.compile(r"\b" + pre + r"_+", re.I), re.compile(r"\b" + pre + r"\b", re.I)]
        # glued "Speciesad__" — only for 2+ letter prefixes so "of" cannot eat "lo__"
        if k >= 2:
            pats.insert(1, re.compile(pre + r"_+", re.I))
        for pat in pats:
            m = pat.search(rest)
            if not m:
                continue
            letters = re.sub(r"[^A-Za-z]", "", m.group(0))
            if not letters or not word.lower().startswith(letters.lower()):
                continue
            cands.append((m.start(), -k, 0 if "_" in m.group(0) else 1, m.end(), letters))
    # OCR reads o_ / i_ as 0 / 1
    low = word.lower()
    if low in ("of", "on", "or", "to"):
        m = re.search(r"0_?", rest)
        if m:
            cands.append((m.start(), -1, 0, m.end(), word[:1]))
    if low in ("in", "it", "if", "is"):
        m = re.search(r"1_?", rest)
        if m:
            cands.append((m.start(), -1, 0, m.end(), word[:1]))
    if not cands:
        m = re.search(r"\b" + re.escape(word) + r"\b", rest, re.I)
        if m:
            cands.append((m.start(), -len(word), 1, m.end(), m.group(0)[: max(1, len(word) - 2)]))
    if not cands:
        return None
    cands.sort()
    start, _k, _u, end, letters = cands[0]
    return pos + start, pos + end, letters


def place(text, answers):
    hits = []
    pos = 0
    for word in answers:
        hit = match_one(text, pos, word)
        if not hit:
            return None
        start, end, letters = hit
        hits.append((start, end, letters, word))
        pos = end
    return hits


def clean_text(s):
    s = re.sub(r"_+", "", s or "")
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    s = re.sub(r" {2,}", " ", s)
    if still_jammed(s):
        s = unjam(s)
    return s.strip()


def to_parts(text, hits):
    parts = []
    last = 0
    n = 0
    for start, end, letters, word in hits:
        before = clean_text(text[last:start])
        if before:
            if parts and parts[-1].get("id") and before[0] not in " \n.,;:!?)]}-":
                before = " " + before
            if not before.endswith((" ", "-", "(")):
                before += " "
            parts.append({"t": before})
        n += 1
        prefix = word[: len(letters)]
        answer = word[len(prefix) :]
        if not answer:
            # matched too much; keep last 2 letters as the blank
            prefix, answer = word[:-2], word[-2:]
        parts.append({"id": n, "prefix": prefix, "answer": answer, "word": word})
        last = end
    after = clean_text(text[last:])
    if after:
        if after[0] not in " \n.,;:!?)]}-":
            after = " " + after
        parts.append({"t": after})
    return parts


def from_marked(set_id, title, zh, trans, marked):
    parts, n = [], 0
    for m in re.finditer(r"\{([^|]+)\|([^}]+)\}|([^{]+)", marked):
        if m.group(3) is not None:
            parts.append({"t": m.group(3)})
        else:
            n += 1
            pre, rest = m.group(1), m.group(2)
            parts.append({"id": n, "prefix": pre, "answer": rest, "word": pre + rest})
    task = {
        "type": "complete_words",
        "title": title,
        "titleZh": zh or title,
        "instruction": "Fill in the missing letters in the paragraph.",
        "passage": parts,
        "set": set_id,
    }
    if trans:
        task["translation"] = trans
    return task


# OCR leftovers: glued prefixes / 0-for-o / dropped underscores. Hand-marked from the same PNGs.
OVERRIDE = {
    "R-CW25": from_marked(
        "R-CW25", "Stomata", "气孔",
        "植物的叶子和茎上有称为气孔的小孔，使它们能够从空气中吸收二氧化碳并向空气中释放氧气。然而，气孔也会让水蒸气逸出，这在干燥环境中会引起问题。为了解决这个问题，在水分流失特别严重的时期，一些植物会暂时关闭气孔。另一种特殊的适应是植物叶子上厚厚的蜡质层，有助于保存水分。",
        "Plants have tiny holes called stomata on their leaves and stems that allow them to take in carbon dioxide from the air and release oxygen into the air. {How|ever}, stomata {c|an} also {l|et} water vapor {esc|ape}, which {cau|ses} problems {i|n} dry {enviro|nments}. To {man|age} this, {dur|ing} hot {per|iods} when water loss is especially severe, some plants close their stomata temporarily. Another special adaptation is thick, waxy coatings on plant leaves that help conserve water.",
    ),
    "R-CW30": from_marked(
        "R-CW30", "Ocean Currents", "洋流",
        "洋流是地球气候系统的重要组成部分，影响天气模式和海洋生态系统。在风、温度变化和盐度差异的驱动下，洋流将热量分布到全球各地。例如，墨西哥湾流使北大西洋变暖，影响欧洲的气候。深洋流，亦称为温盐环流，在调节全球温度和二氧化碳水平方面发挥着作用。海洋学研究不断揭示这些动态系统的复杂性。",
        "Ocean currents are critical components of Earth's climate system, influencing weather patterns and marine ecosystems. Driven {b|y} wind, {tempe|rature} changes, {a|nd} differences {i|n} salinity, ocean currents {distr|ibute} heat {acr|oss} the {gl|obe}. The Gulf Stream, {f|or} instance, {wa|rms} the North Atlantic, {affe|cting} climate in Europe. Deep ocean currents, known as thermohaline circulation, play a role in regulating global temperatures and carbon dioxide levels. Research in oceanography continues to reveal the complexities of these dynamic systems.",
    ),
    "R-CW46": from_marked(
        "R-CW46", "The Ottoman Empire", "奥斯曼帝国",
        "奥斯曼帝国存续于1299年至1922年，是一股强大的力量，重塑了欧洲、中东和北非的政治与文化格局。该帝国以军事实力和战略征服著称，在苏莱曼大帝统治时期达到鼎盛，其间艺术与建筑蓬勃发展。奥斯曼人还在全球贸易中发挥了关键作用，控制着连接亚洲香料市场与欧洲商业中心的重要贸易路线。",
        "The Ottoman Empire, which lasted from 1299 to 1922, was a formidable force that reshaped the political and cultural landscapes of Europe, the Middle East, and North Africa. Renowned for its {mili|tary} prowess {a|nd} strategic {conq|uests}, the {emp|ire} reached {i|ts} zenith {un|der} the {re|ign} of Suleyman the Magnificent, {dur|ing} which {ar|ts} and {archit|ecture} flourished. The Ottomans also played a pivotal role in global commerce, controlling key trade routes that linked the spice markets of Asia with the merchant hubs of Europe.",
    ),
    "R-CW63": from_marked(
        "R-CW63", "River Delta Formation", "河流三角洲形成",
        "河流三角洲的形成是一种地理过程，体现了陆地与水体之间的动态相互作用。当河流流入海洋或大海等水体时，流速会减慢，将上游携带的物质沉积下来。沉积物逐渐堆积，形成了三角洲，这是向水中延伸的肥沃地貌。三角洲不仅支撑着多样的生态系统，还提供了丰富的农业用地。",
        "The formation of river deltas is a geographical process that illustrates the dynamic interaction between land and water. When a river reaches a body of water, such as an {oc|ean} or {s|ea}, it {sl|ows} down, {depos|iting} the {mate|rials} it has {car|ried} from {upst|ream}. Gradually, {t|he} sediments {accum|ulate} to {cre|ate} deltas, which are fertile landforms that extend into the water. Deltas not only support diverse ecosystems but also provide rich agricultural land.",
    ),
    "R-CW89": from_marked(
        "R-CW89", "Exoplanets", "系外行星",
        "近年来，系外行星研究迅速发展，重新定义了我们对宇宙的理解。天文学家已经确认了数千颗太阳系外的行星，其中一些行星与其恒星的轨道离得足够近，可能支持生命存在。这些发现挑战了此前关于行星形成以及别处存在生命可能性的观念。在这些遥远世界上探测到水蒸气和甲烷等大气成分，为它们是否适合孕育生命提供了令人兴奋的线索。",
        "The study of exoplanets has rapidly advanced in recent years, redefining our understanding of the universe. Astronomers have identified thousands of planets beyond our solar system, some of which orbit close enough to their stars to support life. These {find|ings} challenge {prev|ious} notions {ab|out} planetary {form|ation} and {t|he} potential {f|or} life {else|where}. The {dete|ction} of {atmos|pheric} components {li|ke} water vapor and methane in these distant worlds offers exciting clues about their suitability for hosting life.",
    ),
    "R-CW107": from_marked(
        "R-CW107", "Underwater Robotics", "水下机器人",
        "水下机器人技术的进步正在彻底改变海洋探索。这些机器人被称为自主水下航行器（AUV），可以独立在深海环境中航行。AUV配备传感器和摄像头，可收集有关海洋生物、洋流和水下地质的数据。它们可以到达人类潜水员无法到达的深度，为未知区域提供宝贵的见解。研究人员利用AUV来研究气候变化对海洋生态系统的影响并探索水下考古遗址，增强我们对海洋的了解。",
        "Advancements in underwater robotics are revolutionizing ocean exploration. These robots, known as autonomous underwater vehicles (AUVs), can navigate deep-sea environments independently. Equipped with {sen|sors} and {cam|eras}, AUVs {col|lect} data {o|n} marine {li|fe}, ocean {curr|ents}, and {under|water} geology. {Th|ey} can {re|ach} depths {th|at} are inaccessible to human divers, providing valuable insights into uncharted regions. Researchers use AUVs to study the impact of climate change on ocean ecosystems and to explore underwater archaeological sites, enhancing our understanding of the ocean.",
    ),
    "R-CW109": from_marked(
        "R-CW109", "Language Development", "语言发展",
        "儿童语言发展是一个复杂的过程，受到遗传和环境的影响。从出生起，婴儿就开始识别声音和言语模式。到一岁的时候，大多数人都能说“妈妈”或“爸爸”等简单的单词。随着他们的成长，他们的词汇量迅速扩大。与护理人员和同龄人的互动在这一发展中起着至关重要的作用。给孩子读书和参与对话是支持语言习得的有效方法。",
        "Language development in children is a complex process influenced by both genetics and environment. From {bi|rth} infants {be|gin} to recognize {sou|nds} and {patt|erns} in {spe|ech}. By {o|ne} year {o|f} age, {mo|st} can {sp|eak} simple {wo|rds} like \"mama\" or \"dada.\" As they grow, their vocabulary expands rapidly. Interacting with caregivers and peers plays a crucial role in this development. Reading to children and engaging in conversations are effective ways to support language acquisition.",
    ),
    "R-CW121": from_marked(
        "R-CW121", "Color Perception and Pigments", "颜色感知与颜料",
        "几个世纪以来，颜色感知一直吸引着科学家和艺术家。颜料是赋予材料颜色的物质；对颜料的研究揭示了它们与光的复杂相互作用。颜料吸收某些波长并反射其他波长，这正是物体呈现颜色的原因。合成颜料扩大了艺术家和工业可用的色彩范围。研发颜料需要化学和物理知识，因为其性质影响耐久性和外观。理解颜料的行为对艺术修复、制造等多个领域都至关重要。",
        "Color perception has fascinated scientists and artists alike for centuries. The study of pigments, {subst|ances} that {gi|ve} color {t|o} materials, {rev|eals} complex {intera|ctions} with {li|ght}. Pigments {abs|orb} certain {wavel|engths} and {ref|lect} others, {wh|ich} is why objects appear to have color. Synthetic pigments have expanded the color palette available to artists and industries. The development of pigments requires knowledge of chemistry and physics, as their properties influence durability and appearance. Understanding how pigments behave is crucial in various fields, from art restoration to manufacturing.",
    ),
    "R-CW128": from_marked(
        "R-CW128", "Sodium-Ion Batteries", "钠离子电池",
        "钠离子电池作为锂电池的潜在替代品正日益受到关注。钠比锂更易获取，因为它可以从海水中提取，而锂通常需要采用可能危害环境的开采方法。从长远来看，钠离子技术被认为更具可持续性。然而，若干挑战限制了它的广泛应用。钠离子电池的储能往往低于锂电池，从而降低了其在某些应用中的效率。研究人员持续研究钠离子电池，以提升其性能并确定其在未来能源系统中的作用。",
        "Sodium-ion batteries are gaining attention as a potential alternative to lithium-ion batteries. Sodium is more accessible than lithium because it can be extracted from seawater, while lithium typically requires mining methods that can {ha|rm} the {envir|onment}. Sodium-ion {techn|ology} is {consi|dered} more {susta|inable} in {t|he} long {te|rm}. However, {sev|eral} challenges {li|mit} its {wides|pread} use. Sodium-ion batteries often store less energy than lithium-ion batteries, reducing their efficiency for certain applications. Researchers continue to study sodium-ion batteries in order to improve their performance and determine their role in future energy systems.",
    ),
    "R-CW129": from_marked(
        "R-CW129", "Human Anatomy", "人体解剖学",
        "人体解剖学是对人体结构的科学研究。解剖学揭示了身体的不同部分如何相互作用和共同发挥作用以维持生命。例如，循环系统将血液输送到全身，将氧气和营养物质送到细胞，同时清除废物。解剖学家还必须了解器官、组织和细胞的组织。医疗专业人员利用解剖学知识来诊断和治疗疾病，改善患者护理和健康结果。",
        "Human anatomy is the scientific study of human structure. Anatomy {rev|eals} how different {pa|rts} of {t|he} body {inte|ract} and {func|tion} together {t|o} maintain {li|fe}. For {exa|mple}, the circulatory {sys|tem} transports {bl|ood} throughout the body, carrying oxygen and nutrients to cells while removing waste products. Anatomists must also understand the organization of organs, tissues, and cells. Medical professionals use anatomical knowledge to diagnose and treat illnesses, improving patient care and health outcomes.",
    ),
    "R-CW133": from_marked(
        "R-CW133", "Prehistoric Tools", "史前工具",
        "最初，人类使用自然物体作为工具（例如，锋利的石头或分叉的棍子）。后来，人们开始有目的地将木头和石头塑造成工具。由于木材易腐烂的性质，现代关于史前时代如何使用木材的知识很大程度上只能靠推断。然而，有了石器工具，考古学家就有了更坚实的基础。有大量幸存的文物。在全世界范围内，燧石因其不寻常的物理特性而成为一种受欢迎的材料。",
        "Initially, humans used naturally occurring objects as tools (for instance, a sharp stone or a forked stick). Later, {peo|ple} began {purpos|efully} to {sh|ape} wood {a|nd} stone {in|to} tools. {Bec|ause} of {t|he} perishable {nat|ure} of {wo|od}, modern {know|ledge} of how it was used in prehistoric times is largely a matter of inference. With tools of stone, however, archaeologists are on firmer ground; there are a vast number of surviving artifacts. Throughout the world, flint was a favored material because of its unusual physical properties.",
    ),
    "R-CW140": from_marked(
        "R-CW140", "Black Holes", "黑洞",
        "宇宙浩瀚无垠，充满了几个世纪以来一直吸引着人类的谜团。黑洞是太空中的一个区域，那里的引力非常强大，任何东西都无法逃脱，甚至连光也无法逃脱。尽管黑洞是看不见的，但可以通过观察它们对附近物质的影响来探测它们。黑洞在天体物理学中发挥着至关重要的作用，影响星系的形成并提供对空间、时间和重力本质的见解。",
        "The universe is a vast expanse, filled with mysteries that have intrigued humans for centuries. Black holes are {reg|ions} in {sp|ace} where {gra|vity} is {s|o} strong {th|at} nothing, {n|ot} even {li|ght}, can {esc|ape}. Even {tho|ugh} they {a|re} invisible, black holes can be detected by observing their effects on nearby matter. Black holes play a crucial role in astrophysics, influencing galaxy formation and offering insights into the nature of space, time, and gravity.",
    ),
    "R-CW141": from_marked(
        "R-CW141", "Industrialization and Urbanization", "工业化与城市化",
        "在工业化初期，许多城市经历了快速发展。这是由于大量工人涌入工厂寻找工作。城市化导致社会结构发生重大变化，来自不同背景的人们开始近距离生活和工作。工业化也带来了各种挑战，包括污染加剧造成的环境问题以及改善新城市居民住房和交通基础设施的需要。",
        "In the early days of industrialization, many cities experienced rapid growth. This {w|as} due {t|o} the {inf|lux} of {wor|kers} seeking {emplo|yment} in {fact|ories}. Urbanization {l|ed} to {signi|ficant} changes {i|n} the {soc|ial} fabric, as people from diverse backgrounds came to live and work in close quarters. Industrialization also brought about various challenges, including the environmental problems caused by increased pollution and the need for improved infrastructure to house and transport the new city residents.",
    ),
    "R-CW146": from_marked(
        "R-CW146", "Environmental Geology", "环境地质学",
        "地质学涉及对地球物理结构和物质、作用于它们的过程以及地球及其生命形式的历史的研究。环境地质学特别关注地质过程如何影响人类活动和环境。它涵盖自然灾害评估、资源管理和土地利用规划等领域。通过了解影响环境条件的地质因素，地质学家可以帮助减轻自然灾害的影响并促进可持续发展。",
        "Geology involves the study of Earth's physical structure and substances, the processes that act upon them, and the history of the planet and its life forms. Environmental geology {specif|ically} focuses {o|n} how {geolo|gical} processes {aff|ect} human {activ|ities} and {t|he} environment. {I|t} encompasses {ar|eas} such {a|s} natural {haz|ard} assessment, resource management, and land-use planning. By understanding the geological factors that influence environmental conditions, geologists can help mitigate the impacts of natural disasters and promote sustainable development.",
    ),
    "R-CW197": from_marked(
        "R-CW197", "Public Health Initiatives", "公共卫生倡议",
        "公共卫生倡议旨在促进全体人群的福祉并预防疾病。这些策略往往既关注对突发事件的短期应对，也关注对基础设施的长期投资。具体工作包括疫苗接种计划、教育宣传活动，以及制定确保人们获得清洁用水和营养食品的政策。政府、非营利组织与社区之间的协作，对于有效的公共卫生干预至关重要。理解健康的社会决定因素，如经济稳定和教育，有助于量身定制各项倡议，以满足不同人群的具体需求。",
        "Public health initiatives aim to promote well-being and prevent disease across populations. These {strateg|ies} often {fo|cus} on {bo|th} short-term {resp|onses} to {emerg|encies} and long-{t|erm} investments {i|n} infrastructure. {Eff|orts} include {vacci|nation} programs, {educ|ational} campaigns, and the development of policies that ensure access to clean water and nutritious food. Collaboration between governments, nonprofit organizations, and communities is essential for effective public health interventions. Understanding the social determinants of health, such as economic stability and education, helps tailor initiatives to address the specific needs of different populations.",
    ),
    "R-CW207": from_marked(
        "R-CW207", "Moon Phases and Navigation", "月相与航海",
        "观察月相对于历史上的许多文化都很重要，影响着日历、航海和神话。月相周期构成了早期计时系统的基础，例如伊斯兰回历和中国传统的阴阳历。航海员利用月球的位置来预测海平面及其亮度，以指导他们的航行，特别是在夜间旅行时。在神话中，月亮通常象征着强大的神灵或象征，塑造仪式、古故事和季节性节日。跨越各大洲，月亮的盈亏一直是通用的时钟，也是人类想象力的灵感来源。",
        "Observing the moon's phases has been important for many cultures throughout history, influencing calendars, navigation, and mythology. Lunar cycles formed the basis of early timekeeping systems, such as the Islamic Hijri calendar and the traditional Chinese lunisolar calendar. Seafarers {us|ed} the {posi|tion} of {t|he} moon {t|o} make {predi|ctions} about {o|cean} levels {an|d} its {illumi|nation} to {gu|ide} their {voy|ages} especially during night travel. In mythology, the moon often embodied powerful deities or symbols, shaping rituals, stories, and seasonal festivals. Across continents, the waxing and waning of the moon has remained a universal clock and an inspiration for human imagination.",
    ),
    "R-CW214": from_marked(
        "R-CW214", "Earth's Axial Tilt and Seasons", "地球轴倾与季节",
        "我们的行星在围绕太阳运行时，地轴倾斜约23.5度。因此，到达地球不同部分的阳光量并不完全相同，从而形成了季节。当太阳直射某一区域时，该区域往往气温更高、白昼更长。季节的变化影响生活的许多方面，包括农业、野生动物行为和人类活动。",
        "Our planet's axis is tilted at an angle of about 23.5 degrees as it orbits the Sun. {A|s} a {res|ult} the {amo|unt} of {sun|light} that {hi|ts} different {pa|rts} of {Ea|rth} is {n|ot} all {t|he} same, {crea|ting} seasons. When the Sun shines directly on a region, that region tends to have higher temperatures and longer days. The changing seasons affect many aspects of life, including agriculture, wildlife behavior, and human activities.",
    ),
    "R-CW224": from_marked(
        "R-CW224", "Photoperiodism in Trees", "树木的光周期现象",
        "光周期现象对生物的生存至关重要。就树木而言，光周期现象指的是对昼夜长短的生理反应。这种反应影响着落叶、开花等季节性行为。随着白昼变短、黑夜变长，一些树木开始通过落叶为季节的变更做准备。这能在冬季的几个月里保存水分与能量，并保护树木敏感的组织免受冻害。",
        "Photoperiodism is crucial for the survival of organisms. In trees, photoperiodism refers to the physiological response to the length of day and night. This response influences {seas|onal} behaviors {li|ke} leaf {shed|ding} and {flow|ering}. As {t|he} days {gr|ow} shorter {a|nd} the {nig|hts} longer, {so|me} trees {be|gin} to prepare for the changing seasons by dropping their leaves. This conserves water and energy during the winter months and protects the sensitive tissues of the tree from cold damage.",
    ),
    "R-CW236": from_marked(
        "R-CW236", "Paleontology", "古生物学",
        "古生物学是通过分析化石记录来研究生命历史的科学。这一领域需要考察化石——即保存在岩石中的生物残骸——以了解古代生命形式如何演化并适应其环境。古生物学家还利用化石来了解古代的环境条件。例如，在内陆地区发现的海洋化石表明，这些地区很可能曾经处于水下。",
        "Paleontology is the scientific study that deals with the history of life through the analysis of fossil records. This {fi|eld} involves {exam|ining} fossils—{rem|ains} of {orga|nisms} preserved {i|n} rock—{t|o} understand {h|ow} ancient {li|fe} forms {evo|lved} and {ada|pted} to their surroundings. Paleontologists also use fossils to learn about ancient environmental conditions. Finding marine fossils in landlocked areas, for example, suggests that these regions were very likely underwater once upon a time.",
    ),
}


def parse(path, lines):
    base = os.path.splitext(os.path.basename(path))[0]
    m = FILE_RE.match(os.path.basename(path))
    set_id = "R-CW%s" % m.group(1) if m else base
    fallback = (m.group(2) if m else base).replace("\uf022", ":").strip()
    if set_id in OVERRIDE:
        return OVERRIDE[set_id]
    answers = extract_answers(lines)
    passage = extract_passage(lines)
    if len(answers) < 8 or not passage:
        return None
    hits = place(passage, answers)
    if not hits:
        return None
    parts = to_parts(passage, hits)
    if len([p for p in parts if p.get("id")]) < 8:
        return None
    title = extract_title(lines, fallback)
    zh = extract_zh(lines)
    task = {
        "type": "complete_words",
        "title": fallback,
        "titleZh": zh[:40] if zh else fallback,
        "instruction": "Fill in the missing letters in the paragraph.",
        "passage": parts,
        "set": set_id,
    }
    if zh:
        task["translation"] = zh
    return task


def paper(tasks):
    return {
        "id": "bank-cw",
        "title": "题块库 · 单词填空",
        "skill": "reading",
        "source": "bank",
        "tasks": tasks,
    }


def set_num(s):
    m = re.search(r"(\d+)", str(s or ""))
    return int(m.group(1)) if m else 0


def calibrate():
    if not os.path.exists(OCR_BIN):
        subprocess.check_call(
            ["swiftc", "-O", "-o", OCR_BIN, os.path.join(ROOT, "scripts/ocr_vision.swift")]
        )
    gold = {
        "R-CW1-South Pacific History.png": [
            "populations", "complex", "with", "traditions", "social",
            "The", "political", "economic", "experienced", "changes",
        ],
        "R-CW21-Academic Skills.png": [
            "thinking", "students", "approach", "systematically", "information",
            "make", "between", "Also", "are", "like",
        ],
        "R-CW26-Biochemistry.png": [
            "It", "from", "investigations", "natural", "like",
            "and", "now", "the", "of", "such",
        ],
        "R-CW14-Fossils.png": [
            "explains", "advantageous", "increase", "frequency", "population",
            "adapt", "their", "which", "to", "diversity",
        ],
        "R-CW235-Golden Toad.png": [
            "believe", "decline", "due", "habitat", "changing",
            "patterns", "disease", "by", "type", "that",
        ],
        "R-CW7-Spix's Macaw.png": [
            "population", "this", "blue", "declined", "of",
            "loss", "illegal", "for", "abroad", "private",
        ],
        "R-CW245-Plate Tectonic Theory.png": [
            "Driven", "geothermal", "and", "the", "collide",
            "slide", "one", "steadily", "continents", "ocean",
        ],
    }
    for name, want in gold.items():
        path = os.path.join(HAND, name)
        task = parse(path, ocr_one(path))
        assert task, "parse fail " + name
        got = [p["word"] for p in task["passage"] if p.get("id")]
        assert got == want, "%s %s != %s" % (name, got, want)
        blob = " ".join(p.get("t") or "" for p in task["passage"])
        assert not re.search(r"\b(?:HEREVE|BEREXE|OT-U|OF-0|57T-0)\b", blob), name
        print("ok", task["set"], " ".join(got))
    print("ok cw-hand-calibrate")


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        calibrate()
        return
    if not os.path.exists(OCR_BIN):
        subprocess.check_call(
            ["swiftc", "-O", "-o", OCR_BIN, os.path.join(ROOT, "scripts/ocr_vision.swift")]
        )
    jobs = []
    for name in os.listdir(HAND):
        if FILE_RE.match(name):
            jobs.append(os.path.join(HAND, name))
    jobs.sort(key=lambda p: set_num(os.path.basename(p)))
    print("ocr", len(jobs), file=sys.stderr)
    tasks, failed = [], []
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(ocr_one, p): p for p in jobs}
        done = 0
        for fut in as_completed(futs):
            path = futs[fut]
            done += 1
            if done % 25 == 0:
                print("ocr", done, "/", len(jobs), file=sys.stderr)
            try:
                task = parse(path, fut.result())
                if not task:
                    failed.append(os.path.basename(path))
                    continue
                tasks.append(task)
            except Exception as e:
                failed.append(os.path.basename(path) + " " + str(e))
    tasks.sort(key=lambda t: set_num(t["set"]))
    json.dump(paper(tasks), open(OUT, "w"), ensure_ascii=False, indent=2)
    print("wrote", len(tasks), "failed", len(failed))
    for f in failed:
        print("fail", f, file=sys.stderr)
    if failed:
        sys.exit(2)


if __name__ == "__main__":
    main()
