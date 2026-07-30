#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build IELTS themed vocab bank (Koolearn-inspired taxonomy, original lists).

Writes:
  library/study/vocab-themes/themes.json
  library/study/vocab-themes/theme-NN-<id>.html  (thin wordData shells for vocab-lesson)
"""
from __future__ import annotations

import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "library", "study", "vocab-themes")


def W(word, ipa, pos, meaning, *alts, example=""):
    accept = [meaning] + list(alts)
    # dedupe preserve order
    seen, acc = set(), []
    for a in accept:
        a = str(a).strip()
        if a and a not in seen:
            seen.add(a)
            acc.append(a)
    return {
        "word": word,
        "ipa": ipa,
        "pos": pos,
        "meaning": meaning,
        "acceptCN": acc,
        "example": example or ("The word '%s' is useful in IELTS topics." % word),
    }


CATEGORIES = [
    {"id": "all", "label": "全部"},
    {"id": "topics", "label": "雅思话题"},
    {"id": "academic", "label": "学科知识"},
    {"id": "life", "label": "生活场景"},
    {"id": "society", "label": "社会人文"},
    {"id": "nature", "label": "自然生态"},
]

# ponytail: curated IELTS topic lists — taxonomy pattern from Koolearn, not their copy
THEMES = [
    {
        "id": "environment",
        "no": 1,
        "title": "环境与生态",
        "category": "topics",
        "desc": "污染、气候、能源与生态保护",
        "words": [
            W("climate change", "/ˈklaɪ.mət ˌtʃeɪndʒ/", "n.", "气候变化", example="Climate change affects coastal cities."),
            W("greenhouse gas", "/ˈɡriːn.haʊs ˌɡæs/", "n.", "温室气体", example="Carbon dioxide is a major greenhouse gas."),
            W("carbon emission", "/ˈkɑː.bən ɪˈmɪʃ.ən/", "n.", "碳排放", "二氧化碳排放", example="Governments aim to cut carbon emissions."),
            W("fossil fuel", "/ˈfɒs.əl ˌfjuː.əl/", "n.", "化石燃料", example="Fossil fuels still power many factories."),
            W("renewable energy", "/rɪˈnjuː.ə.bəl ˈen.ə.dʒi/", "n.", "可再生能源", example="Solar power is a renewable energy source."),
            W("deforestation", "/diːˌfɒr.ɪˈsteɪ.ʃən/", "n.", "滥伐森林", "森林砍伐", example="Deforestation threatens wildlife habitats."),
            W("biodiversity", "/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/", "n.", "生物多样性", example="Biodiversity is declining in many regions."),
            W("pollution", "/pəˈluː.ʃən/", "n.", "污染", example="Air pollution is severe in megacities."),
            W("recycle", "/ˌriːˈsaɪ.kəl/", "v.", "回收利用", "回收", example="We should recycle plastic bottles."),
            W("landfill", "/ˈlænd.fɪl/", "n.", "垃圾填埋场", "填埋场", example="Landfills are filling up quickly."),
            W("conservation", "/ˌkɒn.səˈveɪ.ʃən/", "n.", "保护", "保育", example="Wildlife conservation needs funding."),
            W("sustainable", "/səˈsteɪ.nə.bəl/", "adj.", "可持续的", example="Sustainable farming protects the soil."),
            W("ecosystem", "/ˈiː.kəʊˌsɪs.təm/", "n.", "生态系统", example="Coral reefs are fragile ecosystems."),
            W("habitat", "/ˈhæb.ɪ.tæt/", "n.", "栖息地", example="Urban sprawl destroys animal habitats."),
            W("endangered", "/ɪnˈdeɪn.dʒəd/", "adj.", "濒危的", example="Pandas are still endangered."),
            W("emission", "/ɪˈmɪʃ.ən/", "n.", "排放", example="Vehicle emissions worsen smog."),
            W("drought", "/draʊt/", "n.", "干旱", example="The drought ruined the harvest."),
            W("flood", "/flʌd/", "n.", "洪水", example="Heavy rain caused serious floods."),
            W("erosion", "/ɪˈrəʊ.ʒən/", "n.", "侵蚀", "水土流失", example="Soil erosion reduces farm yields."),
            W("contaminate", "/kənˈtæm.ɪ.neɪt/", "v.", "污染", "弄脏", example="Chemicals can contaminate rivers."),
            W("ozone layer", "/ˈəʊ.zəʊn ˌleɪ.ə/", "n.", "臭氧层", example="The ozone layer filters UV radiation."),
            W("global warming", "/ˌɡləʊ.bəl ˈwɔː.mɪŋ/", "n.", "全球变暖", example="Global warming raises sea levels."),
            W("waste disposal", "/weɪst dɪˈspəʊ.zəl/", "n.", "废物处理", "垃圾处理", example="Waste disposal is a city challenge."),
            W("organic", "/ɔːˈɡæn.ɪk/", "adj.", "有机的", example="Organic food avoids synthetic pesticides."),
            W("smog", "/smɒɡ/", "n.", "雾霾", example="Smog reduces visibility downtown."),
            W("preserve", "/prɪˈzɜːv/", "v.", "保护", "保存", example="Laws help preserve forests."),
            W("resource", "/rɪˈzɔːs/", "n.", "资源", example="Water is a scarce resource here."),
            W("toxic", "/ˈtɒk.sɪk/", "adj.", "有毒的", example="Toxic waste must be handled carefully."),
            W("eco-friendly", "/ˌiː.kəʊˈfrend.li/", "adj.", "环保的", example="Eco-friendly packaging is popular."),
            W("carbon footprint", "/ˈkɑː.bən ˌfʊt.prɪnt/", "n.", "碳足迹", example="Flying increases your carbon footprint."),
        ],
    },
    {
        "id": "education",
        "no": 2,
        "title": "教育与学习",
        "category": "topics",
        "desc": "学校、课程、考试与学习方法",
        "words": [
            W("curriculum", "/kəˈrɪk.jə.ləm/", "n.", "课程", "课程体系", example="The curriculum includes science and arts."),
            W("tuition", "/tjuˈɪʃ.ən/", "n.", "学费", example="Tuition fees have risen sharply."),
            W("scholarship", "/ˈskɒl.ə.ʃɪp/", "n.", "奖学金", example="She won a full scholarship."),
            W("assignment", "/əˈsaɪn.mənt/", "n.", "作业", "任务", example="The assignment is due on Friday."),
            W("lecture", "/ˈlek.tʃə/", "n.", "讲座", "讲课", example="The lecture lasted two hours."),
            W("seminar", "/ˈsem.ɪ.nɑː/", "n.", "研讨课", "研讨会", example="Students present ideas in seminars."),
            W("dissertation", "/ˌdɪs.əˈteɪ.ʃən/", "n.", "学位论文", "论文", example="He is writing his dissertation."),
            W("literacy", "/ˈlɪt.ər.ə.si/", "n.", "读写能力", "识字", example="Digital literacy is essential today."),
            W("motivate", "/ˈməʊ.tɪ.veɪt/", "v.", "激励", "激发", example="Good teachers motivate learners."),
            W("discipline", "/ˈdɪs.ə.plɪn/", "n.", "纪律", "学科", example="Classroom discipline matters."),
            W("assessment", "/əˈses.mənt/", "n.", "评估", "测评", example="Continuous assessment replaces one big exam."),
            W("enrol", "/ɪnˈrəʊl/", "v.", "注册", "入学", example="Students enrol in September."),
            W("campus", "/ˈkæm.pəs/", "n.", "校园", example="The campus has a new library."),
            W("undergraduate", "/ˌʌn.dəˈɡrædʒ.u.ət/", "n.", "本科生", example="Undergraduates take core modules."),
            W("postgraduate", "/ˌpəʊstˈɡrædʒ.u.ət/", "n.", "研究生", example="She is a postgraduate in law."),
            W("critical thinking", "/ˌkrɪt.ɪ.kəl ˈθɪŋ.kɪŋ/", "n.", "批判性思维", example="Essays require critical thinking."),
            W("plagiarism", "/ˈpleɪ.dʒər.ɪ.zəm/", "n.", "抄袭", example="Plagiarism leads to penalties."),
            W("deadline", "/ˈded.laɪn/", "n.", "截止日期", example="Meet the project deadline."),
            W("mentor", "/ˈmen.tɔː/", "n.", "导师", "指导者", example="A mentor guides new students."),
            W("vocational", "/vəʊˈkeɪ.ʃən.əl/", "adj.", "职业的", example="Vocational training prepares workers."),
            W("boarding school", "/ˈbɔː.dɪŋ ˌskuːl/", "n.", "寄宿学校", example="He attended a boarding school."),
            W("distance learning", "/ˈdɪs.təns ˌlɜː.nɪŋ/", "n.", "远程学习", example="Distance learning suits busy adults."),
            W("peer pressure", "/ˈpɪə ˌpreʃ.ə/", "n.", "同辈压力", example="Peer pressure can affect choices."),
            W("revise", "/rɪˈvaɪz/", "v.", "复习", "修改", example="Revise before the final exam."),
            W("timetable", "/ˈtaɪmˌteɪ.bəl/", "n.", "课程表", "时间表", example="Check the exam timetable."),
            W("faculty", "/ˈfæk.əl.ti/", "n.", "院系", "教员", example="The science faculty is large."),
            W("internship", "/ˈɪn.tɜːn.ʃɪp/", "n.", "实习", example="An internship builds experience."),
            W("dropout", "/ˈdrɒp.aʊt/", "n.", "辍学者", example="The school reduced dropout rates."),
            W("compulsory", "/kəmˈpʌl.sər.i/", "adj.", "必修的", "强制的", example="Maths is compulsory in year one."),
            W("elective", "/ɪˈlek.tɪv/", "n.", "选修课", example="Choose one elective each term."),
        ],
    },
    {
        "id": "technology",
        "no": 3,
        "title": "科技与网络",
        "category": "topics",
        "desc": "互联网、人工智能与数字生活",
        "words": [
            W("artificial intelligence", "/ˌɑː.tɪˌfɪʃ.əl ɪnˈtel.ɪ.dʒəns/", "n.", "人工智能", example="Artificial intelligence powers chatbots."),
            W("algorithm", "/ˈæl.ɡə.rɪ.ðəm/", "n.", "算法", example="Social apps use ranking algorithms."),
            W("automation", "/ˌɔː.təˈmeɪ.ʃən/", "n.", "自动化", example="Automation replaces routine jobs."),
            W("cybersecurity", "/ˌsaɪ.bə.sɪˈkjʊə.rə.ti/", "n.", "网络安全", example="Cybersecurity protects user data."),
            W("database", "/ˈdeɪ.tə.beɪs/", "n.", "数据库", example="Customer records sit in a database."),
            W("digital", "/ˈdɪdʒ.ɪ.təl/", "adj.", "数字的", example="Digital payment is widespread."),
            W("innovation", "/ˌɪn.əˈveɪ.ʃən/", "n.", "创新", example="Innovation drives tech startups."),
            W("interface", "/ˈɪn.tə.feɪs/", "n.", "界面", example="The app interface is simple."),
            W("network", "/ˈnet.wɜːk/", "n.", "网络", example="The network was briefly offline."),
            W("privacy", "/ˈprɪv.ə.si/", "n.", "隐私", example="Online privacy concerns users."),
            W("software", "/ˈsɒft.weə/", "n.", "软件", example="Update the software regularly."),
            W("hardware", "/ˈhɑːd.weə/", "n.", "硬件", example="New hardware improves speed."),
            W("smartphone", "/ˈsmɑːt.fəʊn/", "n.", "智能手机", example="Smartphones changed daily habits."),
            W("broadband", "/ˈbrɔːd.bænd/", "n.", "宽带", example="Rural broadband is expanding."),
            W("cloud computing", "/klaʊd kəmˈpjuː.tɪŋ/", "n.", "云计算", example="Cloud computing stores files online."),
            W("virtual reality", "/ˌvɜː.tʃu.əl riˈæl.ə.ti/", "n.", "虚拟现实", example="Virtual reality is used in training."),
            W("robotics", "/rəʊˈbɒt.ɪks/", "n.", "机器人技术", example="Robotics transforms manufacturing."),
            W("surveillance", "/səˈveɪ.ləns/", "n.", "监控", "监视", example="CCTV surveillance covers the street."),
            W("encryption", "/ɪnˈkrɪp.ʃən/", "n.", "加密", example="Encryption keeps messages safe."),
            W("download", "/ˌdaʊnˈləʊd/", "v.", "下载", example="Download the file before class."),
            W("upload", "/ˌʌpˈləʊd/", "v.", "上传", example="Upload your essay to the portal."),
            W("browse", "/braʊz/", "v.", "浏览", example="Students browse academic journals."),
            W("gadget", "/ˈɡædʒ.ɪt/", "n.", "小装置", "小玩意", example="Wearable gadgets track fitness."),
            W("outdated", "/ˌaʊtˈdeɪ.tɪd/", "adj.", "过时的", example="The software is outdated."),
            W("breakthrough", "/ˈbreɪk.θruː/", "n.", "突破", example="The research is a breakthrough."),
            W("tech-savvy", "/ˈtek ˌsæv.i/", "adj.", "精通科技的", example="Tech-savvy teens learn apps fast."),
            W("bandwidth", "/ˈbænd.wɪdθ/", "n.", "带宽", example="Low bandwidth slows video calls."),
            W("malware", "/ˈmæl.weə/", "n.", "恶意软件", example="Malware can steal passwords."),
            W("user-friendly", "/ˌjuː.zəˈfrend.li/", "adj.", "用户友好的", example="The design is user-friendly."),
            W("e-commerce", "/ˈiːˌkɒm.ɜːs/", "n.", "电子商务", example="E-commerce grew during lockdowns."),
        ],
    },
    {
        "id": "health",
        "no": 4,
        "title": "健康与医疗",
        "category": "topics",
        "desc": "疾病、医疗、饮食与心理健康",
        "words": [
            W("nutrition", "/njuˈtrɪʃ.ən/", "n.", "营养", example="Good nutrition supports growth."),
            W("obesity", "/əʊˈbiː.sə.ti/", "n.", "肥胖", example="Childhood obesity is rising."),
            W("vaccine", "/ˈvæk.siːn/", "n.", "疫苗", example="The vaccine prevents infection."),
            W("symptom", "/ˈsɪmp.təm/", "n.", "症状", example="Fever is a common symptom."),
            W("diagnosis", "/ˌdaɪ.əɡˈnəʊ.sɪs/", "n.", "诊断", example="Early diagnosis improves outcomes."),
            W("treatment", "/ˈtriːt.mənt/", "n.", "治疗", example="Treatment may include physiotherapy."),
            W("prescription", "/prɪˈskrɪp.ʃən/", "n.", "处方", example="Collect your prescription at the pharmacy."),
            W("chronic", "/ˈkrɒn.ɪk/", "adj.", "慢性的", example="Diabetes is a chronic condition."),
            W("epidemic", "/ˌep.ɪˈdem.ɪk/", "n.", "流行病", example="The epidemic spread rapidly."),
            W("hygiene", "/ˈhaɪ.dʒiːn/", "n.", "卫生", example="Hand hygiene reduces infection."),
            W("immune system", "/ɪˈmjuːn ˌsɪs.təm/", "n.", "免疫系统", example="Sleep strengthens the immune system."),
            W("mental health", "/ˈmen.təl helθ/", "n.", "心理健康", example="Mental health needs open discussion."),
            W("stress", "/stres/", "n.", "压力", example="Exam stress is common among students."),
            W("therapy", "/ˈθer.ə.pi/", "n.", "疗法", "治疗", example="Talking therapy helps anxiety."),
            W("surgery", "/ˈsɜː.dʒər.i/", "n.", "手术", example="He recovered well after surgery."),
            W("patient", "/ˈpeɪ.ʃənt/", "n.", "病人", example="The patient waited for results."),
            W("clinic", "/ˈklɪn.ɪk/", "n.", "诊所", example="Book an appointment at the clinic."),
            W("protein", "/ˈprəʊ.tiːn/", "n.", "蛋白质", example="Eggs are rich in protein."),
            W("calorie", "/ˈkæl.ər.i/", "n.", "卡路里", example="Track daily calorie intake."),
            W("sedentary", "/ˈsed.ən.tər.i/", "adj.", "久坐的", example="A sedentary lifestyle harms health."),
            W("addiction", "/əˈdɪk.ʃən/", "n.", "成瘾", example="Phone addiction affects sleep."),
            W("prevention", "/prɪˈven.ʃən/", "n.", "预防", example="Prevention is cheaper than cure."),
            W("allergy", "/ˈæl.ə.dʒi/", "n.", "过敏", example="Peanut allergy can be serious."),
            W("blood pressure", "/ˈblʌd ˌpreʃ.ə/", "n.", "血压", example="High blood pressure needs monitoring."),
            W("rehabilitation", "/ˌriː.həˌbɪl.ɪˈteɪ.ʃən/", "n.", "康复", example="Rehabilitation followed the injury."),
            W("pandemic", "/pænˈdem.ɪk/", "n.", "大流行病", example="The pandemic disrupted travel."),
            W("well-being", "/ˌwelˈbiː.ɪŋ/", "n.", "福祉", "身心健康", example="Exercise improves well-being."),
            W("insomnia", "/ɪnˈsɒm.ni.ə/", "n.", "失眠", example="Insomnia affects concentration."),
            W("outbreak", "/ˈaʊt.breɪk/", "n.", "爆发", example="An outbreak of flu hit the school."),
            W("healthcare", "/ˈhelθ.keə/", "n.", "医疗保健", example="Public healthcare varies by country."),
        ],
    },
    {
        "id": "work",
        "no": 5,
        "title": "工作与职场",
        "category": "life",
        "desc": "就业、职场技能与工作模式",
        "words": [
            W("career", "/kəˈrɪə/", "n.", "职业", "生涯", example="She plans a career in design."),
            W("colleague", "/ˈkɒl.iːɡ/", "n.", "同事", example="Ask a colleague for feedback."),
            W("deadline", "/ˈded.laɪn/", "n.", "截止日期", example="The team met every deadline."),
            W("promotion", "/prəˈməʊ.ʃən/", "n.", "晋升", example="Hard work led to promotion."),
            W("resign", "/rɪˈzaɪn/", "v.", "辞职", example="He decided to resign last month."),
            W("recruit", "/rɪˈkruːt/", "v.", "招聘", example="Firms recruit graduates each year."),
            W("salary", "/ˈsæl.ər.i/", "n.", "薪水", example="The salary includes benefits."),
            W("wage", "/weɪdʒ/", "n.", "工资", "时薪", example="The minimum wage rose again."),
            W("freelance", "/ˈfriː.lɑːns/", "adj.", "自由职业的", example="Freelance writers set their hours."),
            W("remote work", "/rɪˈməʊt wɜːk/", "n.", "远程办公", example="Remote work became common after 2020."),
            W("commute", "/kəˈmjuːt/", "v.", "通勤", example="Many people commute by train."),
            W("overtime", "/ˈəʊ.və.taɪm/", "n.", "加班", example="Staff receive overtime pay."),
            W("workload", "/ˈwɜːk.ləʊd/", "n.", "工作量", example="The workload peaks in June."),
            W("productivity", "/ˌprɒd.ʌkˈtɪv.ə.ti/", "n.", "生产力", "效率", example="Better tools raise productivity."),
            W("entrepreneur", "/ˌɒn.trə.prəˈnɜː/", "n.", "企业家", example="The entrepreneur launched an app."),
            W("interview", "/ˈɪn.tə.vjuː/", "n.", "面试", example="Prepare answers before the interview."),
            W("CV", "/ˌsiːˈviː/", "n.", "简历", example="Update your CV with new skills."),
            W("redundant", "/rɪˈdʌn.dənt/", "adj.", "被裁员的", example="Workers were made redundant."),
            W("shift", "/ʃɪft/", "n.", "轮班", example="Nurses work night shifts."),
            W("bonus", "/ˈbəʊ.nəs/", "n.", "奖金", example="Staff received a year-end bonus."),
            W("negotiate", "/nɪˈɡəʊ.ʃi.eɪt/", "v.", "谈判", "协商", example="Negotiate a fair contract."),
            W("hierarchy", "/ˈhaɪə.rɑː.ki/", "n.", "等级制度", example="The company has a flat hierarchy."),
            W("collaborate", "/kəˈlæb.ə.reɪt/", "v.", "合作", example="Teams collaborate across offices."),
            W("expertise", "/ˌek.spɜːˈtiːz/", "n.", "专长", "专业知识", example="She has expertise in marketing."),
            W("apprenticeship", "/əˈpren.tɪ.ʃɪp/", "n.", "学徒制", example="An apprenticeship combines work and study."),
            W("part-time", "/ˌpɑːtˈtaɪm/", "adj.", "兼职的", example="Students take part-time jobs."),
            W("full-time", "/ˌfʊlˈtaɪm/", "adj.", "全职的", example="He found a full-time role."),
            W("workplace", "/ˈwɜːk.pleɪs/", "n.", "工作场所", example="Safety rules protect the workplace."),
            W("ambition", "/æmˈbɪʃ.ən/", "n.", "抱负", example="Ambition drives career growth."),
            W("burnout", "/ˈbɜːn.aʊt/", "n.", "职业倦怠", example="Burnout follows long overtime."),
        ],
    },
    {
        "id": "media",
        "no": 6,
        "title": "媒体与广告",
        "category": "society",
        "desc": "新闻、社交平台与广告传播",
        "words": [
            W("broadcast", "/ˈbrɔːd.kɑːst/", "v.", "播出", "广播", example="Channels broadcast live news."),
            W("headline", "/ˈhed.laɪn/", "n.", "标题", example="The headline attracted clicks."),
            W("journalist", "/ˈdʒɜː.nə.lɪst/", "n.", "记者", example="Journalists verify their sources."),
            W("editorial", "/ˌed.ɪˈtɔː.ri.əl/", "n.", "社论", example="The editorial criticised the policy."),
            W("censorship", "/ˈsen.sə.ʃɪp/", "n.", "审查", example="Censorship limits free speech."),
            W("propaganda", "/ˌprɒp.əˈɡæn.də/", "n.", "宣传", "鼓吹", example="Wartime propaganda shaped opinions."),
            W("advertisement", "/ədˈvɜː.tɪs.mənt/", "n.", "广告", example="The advertisement targets teens."),
            W("commercial", "/kəˈmɜː.ʃəl/", "n.", "商业广告", example="TV commercials interrupt programmes."),
            W("influencer", "/ˈɪn.flu.ən.sə/", "n.", "网红", "影响者", example="Influencers promote products online."),
            W("social media", "/ˌsəʊ.ʃəl ˈmiː.di.ə/", "n.", "社交媒体", example="Social media spreads news fast."),
            W("viral", "/ˈvaɪə.rəl/", "adj.", "病毒式传播的", example="The video went viral overnight."),
            W("bias", "/ˈbaɪ.əs/", "n.", "偏见", example="Media bias can mislead readers."),
            W("audience", "/ˈɔː.di.əns/", "n.", "观众", "受众", example="The show attracts a young audience."),
            W("coverage", "/ˈkʌv.ər.ɪdʒ/", "n.", "报道", "覆盖", example="Storm coverage dominated the news."),
            W("tabloid", "/ˈtæb.lɔɪd/", "n.", "小报", example="Tabloids favour celebrity stories."),
            W("documentary", "/ˌdɒk.jəˈmen.tər.i/", "n.", "纪录片", example="The documentary explores climate."),
            W("podcast", "/ˈpɒd.kɑːst/", "n.", "播客", example="She listens to education podcasts."),
            W("subscribe", "/səbˈskraɪb/", "v.", "订阅", example="Subscribe to the channel for updates."),
            W("clickbait", "/ˈklɪk.beɪt/", "n.", "标题党", example="Clickbait titles exaggerate claims."),
            W("publicity", "/pʌbˈlɪs.ə.ti/", "n.", "宣传", "公众注意", example="The campaign gained free publicity."),
            W("slogan", "/ˈsləʊ.ɡən/", "n.", "口号", "标语", example="A short slogan is memorable."),
            W("brand", "/brænd/", "n.", "品牌", example="Strong brands earn trust."),
            W("consumer", "/kənˈsjuː.mə/", "n.", "消费者", example="Consumers compare prices online."),
            W("target", "/ˈtɑː.ɡɪt/", "v.", "瞄准", "针对", example="Ads target specific age groups."),
            W("reputation", "/ˌrep.jəˈteɪ.ʃən/", "n.", "声誉", example="Fake news harms reputation."),
            W("sensational", "/senˈseɪ.ʃən.əl/", "adj.", "耸人听闻的", example="Sensational stories sell papers."),
            W("freedom of the press", "/ˌfriː.dəm əv ðə ˈpres/", "n.", "新闻自由", example="Freedom of the press supports democracy."),
            W("misinformation", "/ˌmɪs.ɪn.fəˈmeɪ.ʃən/", "n.", "错误信息", example="Misinformation spreads on apps."),
            W("streaming", "/ˈstriː.mɪŋ/", "n.", "流媒体", example="Streaming replaced DVDs."),
            W("rating", "/ˈreɪ.tɪŋ/", "n.", "收视率", "评分", example="High ratings keep shows on air."),
        ],
    },
    {
        "id": "travel",
        "no": 7,
        "title": "旅游与交通",
        "category": "life",
        "desc": "出行、交通方式与旅游产业",
        "words": [
            W("destination", "/ˌdes.tɪˈneɪ.ʃən/", "n.", "目的地", example="Paris is a popular destination."),
            W("itinerary", "/aɪˈtɪn.ər.ər.i/", "n.", "行程", example="Check the tour itinerary carefully."),
            W("accommodation", "/əˌkɒm.əˈdeɪ.ʃən/", "n.", "住宿", example="Book accommodation in advance."),
            W("reservation", "/ˌrez.əˈveɪ.ʃən/", "n.", "预订", example="Confirm your hotel reservation."),
            W("sightseeing", "/ˈsaɪtˌsiː.ɪŋ/", "n.", "观光", example="Sightseeing filled the afternoon."),
            W("souvenir", "/ˌsuː.vəˈnɪə/", "n.", "纪念品", example="She bought a local souvenir."),
            W("passport", "/ˈpɑːs.pɔːt/", "n.", "护照", example="Keep your passport safe."),
            W("visa", "/ˈviː.zə/", "n.", "签证", example="Apply for a tourist visa early."),
            W("luggage", "/ˈlʌɡ.ɪdʒ/", "n.", "行李", example="Airline luggage limits apply."),
            W("delay", "/dɪˈleɪ/", "n.", "延误", example="Fog caused a flight delay."),
            W("commuter", "/kəˈmjuː.tə/", "n.", "通勤者", example="Commuters packed the platform."),
            W("congestion", "/kənˈdʒes.tʃən/", "n.", "拥堵", example="Road congestion wastes time."),
            W("infrastructure", "/ˈɪn.frəˌstrʌk.tʃə/", "n.", "基础设施", example="Rail infrastructure needs investment."),
            W("public transport", "/ˌpʌb.lɪk ˈtræn.spɔːt/", "n.", "公共交通", example="Public transport cuts emissions."),
            W("pedestrian", "/pəˈdes.tri.ən/", "n.", "行人", example="Pedestrians use the zebra crossing."),
            W("highway", "/ˈhaɪ.weɪ/", "n.", "高速公路", example="The highway links two cities."),
            W("ferry", "/ˈfer.i/", "n.", "渡船", example="Take the ferry to the island."),
            W("cruise", "/kruːz/", "n.", "邮轮旅行", example="They booked a Mediterranean cruise."),
            W("backpacker", "/ˈbækˌpæk.ə/", "n.", "背包客", example="Backpackers prefer hostels."),
            W("eco-tourism", "/ˈiː.kəʊ ˌtʊə.rɪ.zəm/", "n.", "生态旅游", example="Eco-tourism protects local habitats."),
            W("attraction", "/əˈtræk.ʃən/", "n.", "景点", "吸引力", example="The castle is the main attraction."),
            W("departure", "/dɪˈpɑː.tʃə/", "n.", "出发", "离港", example="Departure is at 9 a.m."),
            W("arrival", "/əˈraɪ.vəl/", "n.", "到达", example="Arrival boards show gate changes."),
            W("customs", "/ˈkʌs.təmz/", "n.", "海关", example="Declare goods at customs."),
            W("jet lag", "/ˈdʒet ˌlæɡ/", "n.", "时差反应", example="Jet lag makes sleep difficult."),
            W("scenic", "/ˈsiː.nɪk/", "adj.", "风景优美的", example="Drive the scenic coastal road."),
            W("overcrowded", "/ˌəʊ.vəˈkraʊ.dɪd/", "adj.", "过度拥挤的", example="Trains are overcrowded at rush hour."),
            W("timetable", "/ˈtaɪmˌteɪ.bəl/", "n.", "时刻表", example="Check the bus timetable."),
            W("fare", "/feə/", "n.", "车费", "票价", example="The subway fare is cheap."),
            W("hospitality", "/ˌhɒs.pɪˈtæl.ə.ti/", "n.", "酒店业", "好客", example="Hospitality jobs rise in summer."),
        ],
    },
    {
        "id": "culture",
        "no": 8,
        "title": "文化与艺术",
        "category": "society",
        "desc": "艺术、传统、节庆与文化遗产",
        "words": [
            W("heritage", "/ˈher.ɪ.tɪdʒ/", "n.", "遗产", example="The temple is cultural heritage."),
            W("tradition", "/trəˈdɪʃ.ən/", "n.", "传统", example="The festival keeps old traditions."),
            W("ceremony", "/ˈser.ɪ.mə.ni/", "n.", "仪式", example="Graduation is a formal ceremony."),
            W("exhibition", "/ˌek.sɪˈbɪʃ.ən/", "n.", "展览", example="The exhibition opens next week."),
            W("gallery", "/ˈɡæl.ər.i/", "n.", "画廊", example="Local artists show work in the gallery."),
            W("sculpture", "/ˈskʌlp.tʃə/", "n.", "雕塑", example="The sculpture stands in the square."),
            W("architecture", "/ˈɑː.kɪ.tek.tʃə/", "n.", "建筑", example="Modern architecture uses glass."),
            W("literature", "/ˈlɪt.ər.ə.tʃə/", "n.", "文学", example="She studies English literature."),
            W("folklore", "/ˈfəʊk.lɔː/", "n.", "民间传说", example="Folklore explains local customs."),
            W("ritual", "/ˈrɪtʃ.u.əl/", "n.", "仪式", "惯例", example="Tea drinking is a daily ritual."),
            W("multicultural", "/ˌmʌl.tiˈkʌl.tʃər.əl/", "adj.", "多元文化的", example="London is a multicultural city."),
            W("identity", "/aɪˈden.tə.ti/", "n.", "身份", "认同", example="Language shapes cultural identity."),
            W("custom", "/ˈkʌs.təm/", "n.", "风俗", example="Bowing is a Japanese custom."),
            W("festival", "/ˈfes.tɪ.vəl/", "n.", "节日", "音乐节", example="The film festival attracts tourists."),
            W("performance", "/pəˈfɔː.məns/", "n.", "演出", "表现", example="The dance performance was brilliant."),
            W("audience", "/ˈɔː.di.əns/", "n.", "观众", example="The audience applauded loudly."),
            W("masterpiece", "/ˈmɑː.stə.piːs/", "n.", "杰作", example="The painting is a masterpiece."),
            W("preserve", "/prɪˈzɜːv/", "v.", "保存", "保护", example="Museums preserve ancient objects."),
            W("contemporary", "/kənˈtem.pər.ər.i/", "adj.", "当代的", example="Contemporary art can be abstract."),
            W("aesthetic", "/esˈθet.ɪk/", "adj.", "审美的", "美学的", example="The design has aesthetic appeal."),
            W("craftsmanship", "/ˈkrɑːfts.mən.ʃɪp/", "n.", "工艺", example="Fine craftsmanship takes years."),
            W("orchestra", "/ˈɔː.kɪ.strə/", "n.", "管弦乐队", example="The orchestra played Mozart."),
            W("cinema", "/ˈsɪn.ə.mə/", "n.", "电影", "电影院", example="Independent cinema needs support."),
            W("drama", "/ˈdrɑː.mə/", "n.", "戏剧", example="School drama builds confidence."),
            W("mythology", "/mɪˈθɒl.ə.dʒi/", "n.", "神话", example="Greek mythology inspires writers."),
            W("artefact", "/ˈɑː.tɪ.fækt/", "n.", "文物", "人工制品", example="The artefact was found in a tomb."),
            W("renaissance", "/rɪˈneɪ.səns/", "n.", "文艺复兴", example="The Renaissance changed European art."),
            W("calligraphy", "/kəˈlɪɡ.rə.fi/", "n.", "书法", example="Chinese calligraphy is taught in schools."),
            W("costume", "/ˈkɒs.tjuːm/", "n.", "服装", "戏服", example="Traditional costumes appear in parades."),
            W("diversity", "/daɪˈvɜː.sə.ti/", "n.", "多样性", example="Cultural diversity enriches cities."),
        ],
    },
    {
        "id": "crime",
        "no": 9,
        "title": "犯罪与法律",
        "category": "society",
        "desc": "治安、司法与社会秩序",
        "words": [
            W("crime", "/kraɪm/", "n.", "犯罪", example="Street crime fell last year."),
            W("criminal", "/ˈkrɪm.ɪ.nəl/", "n.", "罪犯", example="The criminal was arrested."),
            W("offence", "/əˈfens/", "n.", "违法行为", "冒犯", example="Speeding is a traffic offence."),
            W("punishment", "/ˈpʌn.ɪʃ.mənt/", "n.", "惩罚", example="Fair punishment deters crime."),
            W("prison", "/ˈprɪz.ən/", "n.", "监狱", example="He spent two years in prison."),
            W("sentence", "/ˈsen.təns/", "n.", "判决", "句子", example="The judge passed a long sentence."),
            W("trial", "/ˈtraɪ.əl/", "n.", "审判", example="The trial lasted three weeks."),
            W("jury", "/ˈdʒʊə.ri/", "n.", "陪审团", example="The jury reached a verdict."),
            W("witness", "/ˈwɪt.nəs/", "n.", "证人", example="A witness saw the accident."),
            W("evidence", "/ˈev.ɪ.dəns/", "n.", "证据", example="Police collected DNA evidence."),
            W("suspect", "/ˈsʌs.pekt/", "n.", "嫌疑人", example="Police questioned the suspect."),
            W("victim", "/ˈvɪk.tɪm/", "n.", "受害者", example="Support centres help victims."),
            W("theft", "/θeft/", "n.", "盗窃", example="Bike theft is common on campus."),
            W("burglary", "/ˈbɜː.ɡlər.i/", "n.", "入室盗窃", example="Burglary rates dropped after cameras."),
            W("fraud", "/frɔːd/", "n.", "诈骗", example="Online fraud targets the elderly."),
            W("corruption", "/kəˈrʌp.ʃən/", "n.", "腐败", example="Anti-corruption laws were tightened."),
            W("legislation", "/ˌledʒ.ɪˈsleɪ.ʃən/", "n.", "立法", "法规", example="New legislation bans plastic bags."),
            W("enforce", "/ɪnˈfɔːs/", "v.", "执行", "强制实施", example="Police enforce traffic rules."),
            W("illegal", "/ɪˈliː.ɡəl/", "adj.", "非法的", example="Illegal parking blocks exits."),
            W("justice", "/ˈdʒʌs.tɪs/", "n.", "司法", "公正", example="Equal justice protects citizens."),
            W("rehabilitation", "/ˌriː.həˌbɪl.ɪˈteɪ.ʃən/", "n.", "改造", "康复", example="Rehabilitation reduces reoffending."),
            W("deterrent", "/dɪˈter.ənt/", "n.", "威慑", example="Cameras act as a deterrent."),
            W("surveillance", "/səˈveɪ.ləns/", "n.", "监控", example="City surveillance covers stations."),
            W("convict", "/kənˈvɪkt/", "v.", "定罪", example="The court convicted the thief."),
            W("innocent", "/ˈɪn.ə.sənt/", "adj.", "无辜的", example="Evidence proved he was innocent."),
            W("guilty", "/ˈɡɪl.ti/", "adj.", "有罪的", example="The defendant pleaded guilty."),
            W("bail", "/beɪl/", "n.", "保释", example="He was released on bail."),
            W("prosecute", "/ˈprɒs.ɪ.kjuːt/", "v.", "起诉", example="Authorities prosecute serious crimes."),
            W("law-abiding", "/ˈlɔː.əˌbaɪ.dɪŋ/", "adj.", "守法的", example="Most citizens are law-abiding."),
            W("juvenile", "/ˈdʒuː.vən.aɪl/", "adj.", "青少年的", example="Juvenile crime needs special care."),
        ],
    },
    {
        "id": "animals",
        "no": 10,
        "title": "动植物",
        "category": "nature",
        "desc": "生物、栖息地与自然保护",
        "words": [
            W("species", "/ˈspiː.ʃiːz/", "n.", "物种", example="Many species face extinction."),
            W("mammal", "/ˈmæm.əl/", "n.", "哺乳动物", example="Whales are marine mammals."),
            W("reptile", "/ˈrep.taɪl/", "n.", "爬行动物", example="Snakes are cold-blooded reptiles."),
            W("insect", "/ˈɪn.sekt/", "n.", "昆虫", example="Bees are vital pollinating insects."),
            W("predator", "/ˈpred.ə.tə/", "n.", "捕食者", example="Lions are apex predators."),
            W("prey", "/preɪ/", "n.", "猎物", example="Gazelles are prey for big cats."),
            W("migrate", "/maɪˈɡreɪt/", "v.", "迁徙", example="Birds migrate south in winter."),
            W("habitat", "/ˈhæb.ɪ.tæt/", "n.", "栖息地", example="Wetlands are rich habitats."),
            W("extinct", "/ɪkˈstɪŋkt/", "adj.", "灭绝的", example="Dodos are extinct."),
            W("endangered", "/ɪnˈdeɪn.dʒəd/", "adj.", "濒危的", example="Tigers remain endangered."),
            W("breed", "/briːd/", "v.", "繁殖", example="Pandas breed slowly in the wild."),
            W("vegetation", "/ˌvedʒ.əˈteɪ.ʃən/", "n.", "植被", example="Dense vegetation covers the hills."),
            W("photosynthesis", "/ˌfəʊ.təʊˈsɪn.θə.sɪs/", "n.", "光合作用", example="Leaves use photosynthesis for energy."),
            W("pollinate", "/ˈpɒl.ə.neɪt/", "v.", "授粉", example="Bees pollinate fruit trees."),
            W("wildlife", "/ˈwaɪld.laɪf/", "n.", "野生动物", example="National parks protect wildlife."),
            W("domestic", "/dəˈmes.tɪk/", "adj.", "家养的", "国内的", example="Cats are domestic animals."),
            W("livestock", "/ˈlaɪv.stɒk/", "n.", "牲畜", example="Drought harms livestock farms."),
            W("flora", "/ˈflɔː.rə/", "n.", "植物群", example="Island flora is unique."),
            W("fauna", "/ˈfɔː.nə/", "n.", "动物群", example="Desert fauna adapts to heat."),
            W("organism", "/ˈɔː.ɡən.ɪ.zəm/", "n.", "生物", "有机体", example="Microscopic organisms live in soil."),
            W("evolution", "/ˌiː.vəˈluː.ʃən/", "n.", "进化", example="Evolution explains species change."),
            W("adaptation", "/ˌæd.əpˈteɪ.ʃən/", "n.", "适应", example="Camels show desert adaptation."),
            W("camouflage", "/ˈkæm.ə.flɑːʒ/", "n.", "伪装", example="Chameleons use camouflage."),
            W("hibernation", "/ˌhaɪ.bəˈneɪ.ʃən/", "n.", "冬眠", example="Bears enter hibernation in winter."),
            W("rainforest", "/ˈreɪnˌfɒr.ɪst/", "n.", "雨林", example="Rainforests store huge carbon."),
            W("coral reef", "/ˈkɒr.əl ˌriːf/", "n.", "珊瑚礁", example="Warming damages coral reefs."),
            W("conservationist", "/ˌkɒn.səˈveɪ.ʃən.ɪst/", "n.", "环保人士", "保护主义者", example="Conservationists lobby for parks."),
            W("captivity", "/kæpˈtɪv.ə.ti/", "n.", "圈养", example="Breeding in captivity can help."),
            W("food chain", "/ˈfuːd ˌtʃeɪn/", "n.", "食物链", example="Pollution enters the food chain."),
            W("ecosystem", "/ˈiː.kəʊˌsɪs.təm/", "n.", "生态系统", example="Forests are complex ecosystems."),
        ],
    },
    {
        "id": "business",
        "no": 11,
        "title": "经济与商业",
        "category": "academic",
        "desc": "市场、贸易、公司与消费",
        "words": [
            W("economy", "/ɪˈkɒn.ə.mi/", "n.", "经济", example="The economy grew by two percent."),
            W("inflation", "/ɪnˈfleɪ.ʃən/", "n.", "通货膨胀", example="Inflation raises living costs."),
            W("recession", "/rɪˈseʃ.ən/", "n.", "经济衰退", example="Jobs fall during a recession."),
            W("investment", "/ɪnˈvest.mənt/", "n.", "投资", example="Foreign investment creates factories."),
            W("profit", "/ˈprɒf.ɪt/", "n.", "利润", example="The firm reported higher profit."),
            W("revenue", "/ˈrev.ən.juː/", "n.", "收入", "营收", example="Online sales boost revenue."),
            W("budget", "/ˈbʌdʒ.ɪt/", "n.", "预算", example="Families set a monthly budget."),
            W("tax", "/tæks/", "n.", "税", example="Income tax funds public services."),
            W("trade", "/treɪd/", "n.", "贸易", example="Global trade links markets."),
            W("export", "/ˈek.spɔːt/", "n.", "出口", example="Coffee is a key export."),
            W("import", "/ˈɪm.pɔːt/", "n.", "进口", example="The country imports oil."),
            W("supply", "/səˈplaɪ/", "n.", "供给", example="Supply cannot meet demand."),
            W("demand", "/dɪˈmɑːnd/", "n.", "需求", example="Demand for housing is high."),
            W("competition", "/ˌkɒm.pəˈtɪʃ.ən/", "n.", "竞争", example="Competition lowers prices."),
            W("monopoly", "/məˈnɒp.əl.i/", "n.", "垄断", example="A monopoly can hurt consumers."),
            W("startup", "/ˈstɑːt.ʌp/", "n.", "初创公司", example="The startup raised new funds."),
            W("shareholder", "/ˈʃeəˌhəʊl.də/", "n.", "股东", example="Shareholders vote at the AGM."),
            W("bankruptcy", "/ˈbæŋ.kr.rəpt.si/", "n.", "破产", example="Poor cash flow caused bankruptcy."),
            W("interest rate", "/ˈɪn.trəst ˌreɪt/", "n.", "利率", example="Low interest rates encourage borrowing."),
            W("currency", "/ˈkʌr.ən.si/", "n.", "货币", example="Tourists exchange currency at banks."),
            W("transaction", "/trænˈzæk.ʃən/", "n.", "交易", example="Online transactions need security."),
            W("marketing", "/ˈmɑː.kɪ.tɪŋ/", "n.", "市场营销", example="Marketing targets young buyers."),
            W("brand", "/brænd/", "n.", "品牌", example="The brand expanded overseas."),
            W("retail", "/ˈriː.teɪl/", "n.", "零售", example="Retail shops face online rivals."),
            W("wholesale", "/ˈhəʊl.seɪl/", "n.", "批发", example="Wholesale prices fell this quarter."),
            W("entrepreneurship", "/ˌɒn.trə.prəˈnɜː.ʃɪp/", "n.", "创业精神", example="Schools teach entrepreneurship."),
            W("outsourcing", "/ˈaʊtˌsɔː.sɪŋ/", "n.", "外包", example="Outsourcing cuts labour costs."),
            W("globalisation", "/ˌɡləʊ.bəl.aɪˈzeɪ.ʃən/", "n.", "全球化", example="Globalisation links distant markets."),
            W("subsidy", "/ˈsʌb.sɪ.di/", "n.", "补贴", example="Farmers receive a government subsidy."),
            W("debt", "/det/", "n.", "债务", example="Student debt worries graduates."),
        ],
    },
    {
        "id": "urban",
        "no": 12,
        "title": "城市与建筑",
        "category": "topics",
        "desc": "城市化、住房与公共空间",
        "words": [
            W("urbanisation", "/ˌɜː.bən.aɪˈzeɪ.ʃən/", "n.", "城市化", example="Urbanisation accelerates in Asia."),
            W("metropolis", "/məˈtrɒp.əl.ɪs/", "n.", "大都市", example="Tokyo is a vast metropolis."),
            W("suburb", "/ˈsʌb.ɜːb/", "n.", "郊区", example="Families move to quieter suburbs."),
            W("skyscraper", "/ˈskaɪˌskreɪ.pə/", "n.", "摩天大楼", example="Skyscrapers define the skyline."),
            W("infrastructure", "/ˈɪn.frəˌstrʌk.tʃə/", "n.", "基础设施", example="Aging infrastructure needs repair."),
            W("housing", "/ˈhaʊ.zɪŋ/", "n.", "住房", example="Affordable housing is scarce."),
            W("rent", "/rent/", "n.", "租金", example="City rent keeps rising."),
            W("mortgage", "/ˈmɔː.ɡɪdʒ/", "n.", "按揭", "抵押借款", example="They took a 30-year mortgage."),
            W("construction", "/kənˈstrʌk.ʃən/", "n.", "建筑施工", example="Construction noise starts early."),
            W("demolish", "/dɪˈmɒl.ɪʃ/", "v.", "拆除", example="They will demolish the old factory."),
            W("renovation", "/ˌren.əˈveɪ.ʃən/", "n.", "翻新", example="Home renovation costs money."),
            W("landmark", "/ˈlænd.mɑːk/", "n.", "地标", example="The tower is a city landmark."),
            W("district", "/ˈdɪs.trɪkt/", "n.", "区域", "行政区", example="The business district is crowded."),
            W("residential", "/ˌrez.ɪˈden.ʃəl/", "adj.", "住宅的", example="Residential streets need slower traffic."),
            W("commercial", "/kəˈmɜː.ʃəl/", "adj.", "商业的", example="Commercial zones allow shops."),
            W("overpopulation", "/ˌəʊ.vəˌpɒp.jəˈleɪ.ʃən/", "n.", "人口过剩", example="Overpopulation strains water supplies."),
            W("slum", "/slʌm/", "n.", "贫民窟", example="Slums lack basic services."),
            W("amenities", "/əˈmiː.nə.tiz/", "n.", "便利设施", example="Parks are important amenities."),
            W("pavement", "/ˈpeɪv.mənt/", "n.", "人行道", example="Keep bicycles off the pavement."),
            W("traffic jam", "/ˈtræf.ɪk ˌdʒæm/", "n.", "交通堵塞", example="A traffic jam delayed the bus."),
            W("green space", "/ɡriːn speɪs/", "n.", "绿地", example="Cities need more green space."),
            W("zoning", "/ˈzəʊ.nɪŋ/", "n.", "分区规划", example="Zoning separates factories from homes."),
            W("high-rise", "/ˈhaɪ.raɪz/", "n.", "高层建筑", example="High-rises house thousands."),
            W("underground", "/ˌʌn.dəˈɡraʊnd/", "n.", "地铁", example="Take the underground to the museum."),
            W("crowded", "/ˈkraʊ.dɪd/", "adj.", "拥挤的", example="Stations are crowded at 8 a.m."),
            W("sprawl", "/sprɔːl/", "n.", "无序扩张", example="Urban sprawl eats farmland."),
            W("facilities", "/fəˈsɪl.ə.tiz/", "n.", "设施", example="Sports facilities serve residents."),
            W("architecture", "/ˈɑː.kɪ.tek.tʃə/", "n.", "建筑风格", "建筑", example="Historic architecture draws tourists."),
            W("planning", "/ˈplæn.ɪŋ/", "n.", "规划", example="City planning balances growth and nature."),
            W("neighbourhood", "/ˈneɪ.bə.hʊd/", "n.", "社区", "街坊", example="The neighbourhood feels safe."),
        ],
    },
]


def js_escape(s: str) -> str:
    return (
        str(s)
        .replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("\n", "\\n")
        .replace("\r", "")
    )


def word_js(w: dict) -> str:
    alts = ", ".join("'" + js_escape(a) + "'" for a in w["acceptCN"])
    return (
        "{ word:'%(word)s', ipa:'%(ipa)s', pos:'%(pos)s', meaning:'%(meaning)s', "
        "acceptCN:[%(alts)s], example:'%(example)s' }"
        % {
            "word": js_escape(w["word"]),
            "ipa": js_escape(w["ipa"]),
            "pos": js_escape(w["pos"]),
            "meaning": js_escape(w["meaning"]),
            "alts": alts,
            "example": js_escape(w["example"]),
        }
    )


def html_for(theme: dict) -> str:
    title = "第%d篇 · %s" % (theme["no"], theme["title"])
    words_js = ",\n    ".join(word_js(w) for w in theme["words"])
    return """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="exam:zone" content="study">
  <meta name="exam:subject" content="vocab-themes">
  <meta name="exam:title" content="%(title)s">
  <meta name="exam:description" content="分类词库 · %(desc)s">
  <title>%(title)s</title>
</head>
<body>
<!-- ponytail: thin shell — vocab-lesson.html parses wordData -->
<script>
const wordData = [
    %(words)s
];
</script>
</body>
</html>
""" % {
        "title": title,
        "desc": theme["desc"],
        "words": words_js,
    }


def filename(theme: dict) -> str:
    return "theme-%02d-%s.html" % (theme["no"], theme["id"])


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    # wipe previous theme-*.html
    for name in os.listdir(OUT):
        if re.match(r"^theme-\d+-.*\.html$", name):
            os.remove(os.path.join(OUT, name))

    catalog_themes = []
    for theme in THEMES:
        path = os.path.join(OUT, filename(theme))
        with open(path, "w", encoding="utf-8") as f:
            f.write(html_for(theme))
        preview = [w["word"] for w in theme["words"][:8]]
        catalog_themes.append(
            {
                "id": theme["id"],
                "no": theme["no"],
                "title": theme["title"],
                "category": theme["category"],
                "desc": theme["desc"],
                "file": "study/vocab-themes/" + filename(theme),
                "count": len(theme["words"]),
                "preview": preview,
                "words": theme["words"],
            }
        )
        print("wrote", path, "(%d words)" % len(theme["words"]))

    catalog = {
        "sourceNote": "YYSD 原创雅思话题词库；信息架构借鉴常见分类词典（侧栏大类→主题→词条），非第三方词表复制。",
        "categories": CATEGORIES,
        "themes": catalog_themes,
    }
    cat_path = os.path.join(OUT, "themes.json")
    with open(cat_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", cat_path)
    print("themes:", len(THEMES), "words:", sum(len(t["words"]) for t in THEMES))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
