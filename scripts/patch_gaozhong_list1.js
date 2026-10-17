#!/usr/bin/env node
"use strict";
/** List 1 sample: deepen meaning; keep Excel order. */
var fs = require("fs");
var path = require("path");

var HTML = path.join(__dirname, "../library/study/vocab/高中单词LIST1.html");
var EXCEL_ORDER = [
  "include","videophone","alcohol","ought","memorial","crazy","challenging","exact","translate","dizzy",
  "sure","welfare","ordinary","apply","lecture","grateful","feel","congratulate","position","component",
  "never","accuracy","illegal","victory","survive","biography","satisfaction","memory","former","rule",
  "virtue","suitable","botanical","remark","telescope","copy","fantastic","whom","differ","accident",
  "hear","portable","still","change","garbage","disappoint","will","promote","settle","explanation",
  "date","howl","match","conference","float","neighbour","microwave"
];

var overlay = {
  include: {
    pos: "v.",
    meaning: "v. ①包括，包含（把某人或某物算作整体的一部分）；②算入，计入。常用 include sb/sth in；including（包括…在内，后接被包括部分）；included（包括在内，常后置，如 tax included）。反义 exclude。",
    acceptCN: ["包括", "包含", "算入"]
  },
  videophone: {
    pos: "n.",
    meaning: "n. 可视电话，视频电话（可同时传送声音与影像的电话）。也可指用可视电话进行的通话。",
    acceptCN: ["可视电话", "视频电话"]
  },
  alcohol: {
    pos: "n.",
    meaning: "n. ①酒精，乙醇；②酒，含酒精饮料。常见：drink alcohol（饮酒）、alcohol abuse（酗酒）、alcohol-free（无酒精的）。",
    acceptCN: ["酒精", "酒", "乙醇"]
  },
  ought: {
    pos: "modal v.",
    meaning: "情态动词 应当，应该（表义务、责任或劝告，语气常比 must 弱）。结构：ought to do；对过去：ought to have done（本应做而未做）。口语里常被 should 替代。",
    acceptCN: ["应该", "应当", "理应"]
  },
  memorial: {
    pos: "n. / adj.",
    meaning: "n. 纪念碑，纪念馆，纪念物；追悼会（memorial service）。adj. 纪念的，追悼的。常见：war memorial（战争纪念碑）、in memory / memorial of（为纪念…）。",
    acceptCN: ["纪念碑", "纪念的", "追悼会"]
  },
  crazy: {
    pos: "adj.",
    meaning: "adj. ①疯狂的，精神失常的；②狂热的，着迷的（be crazy about）；③荒唐的，不理智的（crazy idea）；④口语：极好的、令人兴奋的。go crazy / drive sb crazy。",
    acceptCN: ["疯狂的", "狂热的", "荒唐的"]
  },
  challenging: {
    pos: "adj.",
    meaning: "adj. 有挑战性的，考验能力/毅力的；困难但值得做的。来自 challenge。常见：challenging task / job；mentally challenging。",
    acceptCN: ["有挑战性的", "考验人的"]
  },
  exact: {
    pos: "adj. / v.",
    meaning: "adj. 精确的，确切的，刚好的（exact time / number；to be exact 确切地说；the exact opposite 截然相反）。v. 强求，索取（较正式，exact a promise / revenge）。",
    acceptCN: ["精确的", "确切的", "强求"]
  },
  translate: {
    pos: "v.",
    meaning: "v. ①翻译（translate sth into / from）；②转化，变为（ideas translate into action）；③可解释为，相当于。名词 translation。",
    acceptCN: ["翻译", "转化", "译成"]
  },
  dizzy: {
    pos: "adj.",
    meaning: "adj. 头晕的，眩晕的；使人发晕的（dizzy heights 令人眩晕的高度）。feel dizzy；a dizzy spell（一阵眩晕）。",
    acceptCN: ["头晕的", "眩晕的"]
  },
  sure: {
    pos: "adj. / adv.",
    meaning: "adj. 确定的，有把握的；一定会发生的。make sure（确保）；be sure of / that；for sure（肯定地）；be sure to（一定要）。adv. 当然，的确（口语应答）。",
    acceptCN: ["确定的", "当然", "确信"]
  },
  welfare: {
    pos: "n.",
    meaning: "n. ①福利，社会保障（social welfare / welfare system）；②安康，福祉（child / animal welfare）；③救济金（尤美）。well + fare → 良好处境。",
    acceptCN: ["福利", "安康", "福祉"]
  },
  ordinary: {
    pos: "adj.",
    meaning: "adj. 普通的，平常的，平凡的，一般的。ordinary people / life；out of the ordinary（不寻常）。反义 extraordinary。",
    acceptCN: ["普通的", "平常的", "平凡的"]
  },
  apply: {
    pos: "v.",
    meaning: "v. ①申请（apply for a job / scholarship；apply to a university）；②应用，运用（apply theory to practice）；③适用（the rule applies to everyone）；④涂抹（apply cream）；⑤专心致力于（apply oneself to）。名词 application。",
    acceptCN: ["申请", "应用", "适用", "涂抹"]
  },
  lecture: {
    pos: "n. / v.",
    meaning: "n. 讲座，讲课，演讲（give / attend a lecture；lecture hall）。v. 讲课，讲授（lecture on）；训斥，教训（lecture sb about）。",
    acceptCN: ["讲座", "讲课", "训斥"]
  },
  grateful: {
    pos: "adj.",
    meaning: "adj. 感激的，感谢的。be grateful for sth；be grateful to sb；I would be grateful if…（正式请求）。反义 ungrateful。名词 gratitude。",
    acceptCN: ["感激的", "感谢的"]
  },
  feel: {
    pos: "v. / n.",
    meaning: "v. ①感觉，觉得（feel tired / feel that）；②触摸（feel the fabric）；③感受到（feel the heat）。feel like（想要；感觉像）；feel free（请随意）。n. 手感，气氛（the feel of）。不规则：feel–felt–felt。",
    acceptCN: ["感觉", "觉得", "触摸"]
  },
  congratulate: {
    pos: "v.",
    meaning: "v. 祝贺，恭喜。congratulate sb on sth；congratulate oneself（庆幸自己）。名词 congratulation(s)。",
    acceptCN: ["祝贺", "恭喜"]
  },
  position: {
    pos: "n. / v.",
    meaning: "n. ①位置，方位（in position 就位）；②职位，岗位（a senior position）；③立场，态度（take a position）；④处境（in a difficult position）。v. 放置，安置。",
    acceptCN: ["位置", "职位", "立场", "放置"]
  },
  component: {
    pos: "n. / adj.",
    meaning: "n. 组成部分，部件，元件，成分（key component；electronic component）。adj. 组成的，构成的。com-(一起) + pon(放)。",
    acceptCN: ["组成部分", "部件", "元件"]
  },
  never: {
    pos: "adv.",
    meaning: "adv. 从不，绝不，从未。常与完成时连用（have never done）。never mind（没关系）；never ever（绝不）；never before。反义 always。",
    acceptCN: ["从不", "绝不", "从未"]
  },
  accuracy: {
    pos: "n.",
    meaning: "n. 准确性，精确，准确度。with accuracy；high / improve accuracy。形容词 accurate；反义 inaccuracy。",
    acceptCN: ["准确性", "精确", "准确度"]
  },
  illegal: {
    pos: "adj.",
    meaning: "adj. 非法的，违法的，不合法的。it is illegal to do；illegal activity / parking。il-(不) + legal。名词 illegality；反义 legal。",
    acceptCN: ["非法的", "违法的", "不合法的"]
  },
  victory: {
    pos: "n.",
    meaning: "n. 胜利，获胜，成功。win a victory；narrow victory（险胜）；victory over。vict(征服)。反义 defeat / loss。",
    acceptCN: ["胜利", "获胜", "成功"]
  },
  survive: {
    pos: "v.",
    meaning: "v. ①幸存，活下来（survive an accident）；②存活，维持（survive on）；③比…活得长；④挺过，艰难度过。名词 survival；形容词 surviving。",
    acceptCN: ["幸存", "存活", "挺过"]
  },
  biography: {
    pos: "n.",
    meaning: "n. 传记，生平记述。write a biography of sb；autobiography（自传）。bio(生命) + graphy(书写)。",
    acceptCN: ["传记", "生平"]
  },
  satisfaction: {
    pos: "n.",
    meaning: "n. 满意，满足，称心。with satisfaction；to one's satisfaction；customer / job satisfaction。动词 satisfy；形容词 satisfied / satisfactory。",
    acceptCN: ["满意", "满足", "称心"]
  },
  memory: {
    pos: "n.",
    meaning: "n. ①记忆力，记性（have a good memory）；②回忆（childhood memories；in memory of 为纪念）；③存储器，内存（计算机）。动词 memorize；形容词 memorable。",
    acceptCN: ["记忆", "回忆", "内存"]
  },
  former: {
    pos: "adj. / n.",
    meaning: "adj. 以前的，从前的，前任的（former teacher / president）。n. the former（前者，与 the latter 相对）。in former times。",
    acceptCN: ["以前的", "前者", "前任"]
  },
  rule: {
    pos: "n. / v.",
    meaning: "n. ①规则，规定，惯例（school rules；as a rule 通常）；②统治，统治期。v. 统治，管理；裁定（rule that）；rule out（排除）。",
    acceptCN: ["规则", "统治", "裁定"]
  },
  virtue: {
    pos: "n.",
    meaning: "n. ①美德，德行（patience is a virtue）；②优点，长处；③贞操（旧义）。by virtue of（凭借，由于）。反义 vice。",
    acceptCN: ["美德", "优点", "德行"]
  },
  suitable: {
    pos: "adj.",
    meaning: "adj. 合适的，适宜的，适当的。be suitable for；a suitable candidate。suit + -able。反义 unsuitable。",
    acceptCN: ["合适的", "适宜的", "适当的"]
  },
  botanical: {
    pos: "adj.",
    meaning: "adj. 植物学的，与植物有关的。botanical garden（植物园）；botanical name（植物学名）。名词 botany / botanist。",
    acceptCN: ["植物学的", "植物的"]
  },
  remark: {
    pos: "n. / v.",
    meaning: "n. 评论，言论，讲话（make a remark；opening remarks 开场白）。v. 评论，谈到（remark on / upon）；注意到（较正式）。",
    acceptCN: ["评论", "讲话", "注意到"]
  },
  telescope: {
    pos: "n. / v.",
    meaning: "n. 望远镜（look through a telescope；space / radio telescope）。v. 叠缩，缩短（使套叠；时间/事件压缩）。tele-(远) + scope(看)。",
    acceptCN: ["望远镜", "叠缩"]
  },
  copy: {
    pos: "n. / v.",
    meaning: "n. ①副本，复印件；②一本、一份（报刊书籍）；③拷贝。v. 复制，抄写，模仿。a copy of；copy down；hard copy（纸质件）。反义 original。",
    acceptCN: ["复制", "副本", "抄写"]
  },
  fantastic: {
    pos: "adj.",
    meaning: "adj. ①极好的，了不起的（口语）；②奇异的，荒诞的，不切实际的（fantastic story / idea）。与 fantasy 相关。",
    acceptCN: ["极好的", "奇异的", "荒诞的"]
  },
  whom: {
    pos: "pron.",
    meaning: "pron. 谁（宾格，作动词或介词宾语）。to / with / for / of whom。正式语体常用；口语多用 who。",
    acceptCN: ["谁（宾格）", "何人"]
  },
  differ: {
    pos: "v.",
    meaning: "v. ①不同，有差异（differ from；differ in）；②意见不合（opinions differ；agree to differ 求同存异）。名词 difference；形容词 different。",
    acceptCN: ["不同", "有差异", "意见不合"]
  },
  accident: {
    pos: "n.",
    meaning: "n. ①事故，意外事件（traffic / car accident；have an accident）；②偶然（by accident 偶然，无意中）。注意与 incident（事件）区分。",
    acceptCN: ["事故", "意外", "偶然"]
  },
  hear: {
    pos: "v.",
    meaning: "v. ①听见（强调结果，listen 强调动作）；②听说（hear of / about）；③收到消息（hear from）。hear–heard–heard。",
    acceptCN: ["听见", "听说", "听到"]
  },
  portable: {
    pos: "adj. / n.",
    meaning: "adj. 便携的，手提的，可携带的（portable device / charger）。n. 便携设备。port(携带) + -able。",
    acceptCN: ["便携的", "手提的", "可携带的"]
  },
  still: {
    pos: "adv. / adj. / n. / v.",
    meaning: "adv. 仍然，还是；尽管如此（更强调“持续/出乎意料”）。adj. 静止的，平静的（stand still；still water）。n. 静物画（still life）；蒸馏器。v. 使平静。",
    acceptCN: ["仍然", "静止的", "平静"]
  },
  change: {
    pos: "n. / v.",
    meaning: "v. 改变，变化，更换，兑换。n. ①改变，变化（climate change）；②零钱，找零；③更换（for a change 换换样）。change into。",
    acceptCN: ["改变", "变化", "零钱"]
  },
  garbage: {
    pos: "n.",
    meaning: "n. 垃圾，废物（美式常用；英式多用 rubbish）。也可指废话、劣质内容。garbage can；take out the garbage。",
    acceptCN: ["垃圾", "废物"]
  },
  disappoint: {
    pos: "v.",
    meaning: "v. 使失望，使扫兴。disappoint sb；be disappointed at / with / in。形容词 disappointed / disappointing；名词 disappointment。",
    acceptCN: ["使失望", "扫兴"]
  },
  will: {
    pos: "modal v. / n. / v.",
    meaning: "情态动词 将要；愿意。n. ①意志，意愿（free will；against one's will；Where there is a will…）；②遗嘱。v. 用意志驱使；立遗嘱把…赠与。won't = will not。",
    acceptCN: ["将要", "愿意", "意志", "遗嘱"]
  },
  promote: {
    pos: "v.",
    meaning: "v. ①促进，推动（promote health / awareness）；②晋升（promote sb to）；③推销，宣传（promote a product）。名词 promotion。反义 demote / hinder。",
    acceptCN: ["促进", "晋升", "推销"]
  },
  settle: {
    pos: "v.",
    meaning: "v. ①解决，了结（settle a dispute）；②定居，安顿（settle in / settle down）；③平静下来；④结算，支付。词义随语境变化。",
    acceptCN: ["解决", "定居", "安顿", "结算"]
  },
  explanation: {
    pos: "n.",
    meaning: "n. 解释，说明，讲解。give an explanation；in explanation of；detailed explanation。动词 explain。",
    acceptCN: ["解释", "说明", "讲解"]
  },
  date: {
    pos: "n. / v.",
    meaning: "n. ①日期，年代（What's the date today?）；②约会；③枣。out of date（过时）；up to date（最新的）。v. 注明日期；与…约会；追溯到（date from / back to）。",
    acceptCN: ["日期", "约会", "枣"]
  },
  howl: {
    pos: "v. / n.",
    meaning: "v. / n. 嚎叫，怒号，哀号；狂笑（howl with laughter）。风、野兽、人皆可用。拟声词。",
    acceptCN: ["嚎叫", "怒号", "哀号"]
  },
  match: {
    pos: "n. / v.",
    meaning: "n. ①比赛（football match）；②相配的人或物（a good match）；③火柴（strike a match）。v. 匹配，相配，比得上（match with / match the requirements）。",
    acceptCN: ["比赛", "匹配", "火柴"]
  },
  conference: {
    pos: "n.",
    meaning: "n. 会议，讨论会，大会（较正式，规模常大于 meeting）。attend a conference；press conference（新闻发布会）；video conference。",
    acceptCN: ["会议", "讨论会", "大会"]
  },
  float: {
    pos: "v. / n.",
    meaning: "v. 漂浮，浮动，飘；提出想法试探（float an idea）。n. 漂浮物；游行彩车（parade float）；浮标。反义 sink。",
    acceptCN: ["漂浮", "浮动", "彩车"]
  },
  neighbour: {
    pos: "n.",
    meaning: "n. 邻居，邻人；邻国（neighbourhood 街区）。英式拼写 neighbour；美式 neighbor。next-door neighbour。",
    acceptCN: ["邻居", "邻人"]
  },
  microwave: {
    pos: "n. / v.",
    meaning: "n. 微波炉；微波。v. 用微波炉加热。microwave oven；heat sth in the microwave。micro(微) + wave(波)。",
    acceptCN: ["微波炉", "微波"]
  }
};

var html = fs.readFileSync(HTML, "utf8");
var m = html.match(/const wordData = (\[[\s\S]*?\]);/);
if (!m) throw new Error("wordData not found");
var words = Function("return (" + m[1] + ");")();
if (words.length !== EXCEL_ORDER.length) throw new Error("count " + words.length);
words.forEach(function (w, i) {
  if (w.word !== EXCEL_ORDER[i]) throw new Error("order @" + i + " " + w.word + " != " + EXCEL_ORDER[i]);
  var o = overlay[w.word];
  if (!o) throw new Error("missing overlay " + w.word);
  w.meaning = o.meaning;
  w.acceptCN = o.acceptCN;
  w.pos = o.pos;
  if (w.acceptCN.length < 2 || w.acceptCN.length > 4) throw new Error("acceptCN size " + w.word);
});
var next = html.replace(m[0], "const wordData = " + JSON.stringify(words) + ";");
fs.writeFileSync(HTML, next);
console.log("patched LIST1 ·", words.length, "words");
