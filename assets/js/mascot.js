/* =========================================================================
   mascot.js — Sida companion (Duolingo-style contextual reactions)
   ponytail: mock exams stay silent until score; study/practice get live hints
   ========================================================================= */
(function () {
  "use strict";

  if (document.body.dataset.noMascot != null) return;

  var ONBOARD_KEY = "yysd:mascot-onboarded";
  var OFF_KEY = "yysd:mascot-off";
  var IDLE_MS = 45000;
  var ONBOARD_STEPS = [
    "你好，我是思达，你的错题本陪练。",
    "学习区背单词、练习区精听长难句、模考区剑桥真题——点我都能给建议。",
    "做题时我会实时反馈；模考完我会帮你复盘 Band。"
  ];

  var examPage = /exam\.html/.test(location.pathname);
  var examZone = null;
  var examSubject = null;
  var examTitle = null;
  var mounted = false;
  var onboardStep = 0;
  var onboardActive = false;

  function isOff() {
    try { return localStorage.getItem(OFF_KEY) === "1"; } catch (e) { return false; }
  }

  function enableMascot() {
    try { localStorage.removeItem(OFF_KEY); } catch (e) {}
    location.reload();
  }

  function mountRestore() {
    if (document.querySelector(".yysd-mascot-restore")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "yysd-mascot-restore";
    btn.textContent = "召唤思达";
    btn.setAttribute("aria-label", "重新启用思达学习助手");
    btn.addEventListener("click", enableMascot);
    document.body.appendChild(btn);
  }

  if (isOff()) {
    window.YYSD_MASCOT = { enable: enableMascot, say: function () {}, configure: function () {} };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mountRestore);
    } else {
      mountRestore();
    }
    return;
  }

  function sidaSvg(p) {
    var g = p + "b";
    var ink = "#5A7A8F";
    var brow = "#9BB5C4";
    var blush = "#FFB8C8";

    function blushPair(op) {
      op = op != null ? op : ".45";
      return '<ellipse class="sida-blush" cx="70" cy="124" rx="11" ry="6.5" fill="' + blush + '" opacity="' + op + '"/>' +
        '<ellipse class="sida-blush" cx="130" cy="124" rx="11" ry="6.5" fill="' + blush + '" opacity="' + op + '"/>';
    }

    function roundEye(cx, cy, opts) {
      opts = opts || {};
      var side = cx < 100 ? "l" : "r";
      var py = opts.py != null ? opts.py : cy + 1;
      var px = opts.px != null ? opts.px : cx;
      var pr = opts.pr != null ? opts.pr : 4.5;
      var hx = opts.hx != null ? opts.hx : cx + (cx < 100 ? 2.5 : -2.5);
      var hy = opts.hy != null ? opts.hy : cy - 2;
      return '<circle cx="' + cx + '" cy="' + cy + '" r="9" fill="#fff"/>' +
        '<circle class="sida-pupil sida-pupil-' + side + '" cx="' + px + '" cy="' + py + '" r="' + pr + '" fill="' + ink + '"/>' +
        '<circle cx="' + hx + '" cy="' + hy + '" r="1.8" fill="#fff"/>';
    }

    var body =
      '<ellipse class="sida-shadow" cx="100" cy="208" rx="40" ry="6" fill="#4AB5D8" opacity=".14"/>' +
      '<g class="sida-body">' +
        '<rect x="48" y="62" width="104" height="130" rx="24" fill="url(#' + g + ')"/>' +
        '<rect x="48" y="62" width="104" height="130" rx="24" fill="none" stroke="#fff" stroke-width="1.5" opacity=".28"/>' +
        '<rect x="48" y="182" width="104" height="10" rx="4" fill="#3A9CC4" opacity=".35"/>' +
        '<g class="sida-pages">' +
          '<path d="M138 58 L154 52 L156 88 L140 94 Z" fill="#F0EBE0"/>' +
          '<path d="M142 56 L158 50 L160 82 L144 88 Z" fill="#F7F3EA"/>' +
          '<line x1="146" y1="62" x2="154" y2="60" stroke="#D8E8F0" stroke-width="1"/>' +
          '<line x1="147" y1="68" x2="155" y2="66" stroke="#D8E8F0" stroke-width="1"/>' +
          '<line x1="148" y1="74" x2="156" y2="72" stroke="#D8E8F0" stroke-width="1"/>' +
          '<text class="sida-page-mark" x="150" y="80" font-size="9" fill="#C5D5DE" opacity=".7">×</text>' +
        '</g>' +
        '<g class="sida-note">' +
          '<rect x="136" y="44" width="24" height="24" rx="6" fill="#FFB4A2" transform="rotate(10 148 56)"/>' +
          '<text x="148" y="60" text-anchor="middle" font-size="13" font-weight="600" fill="#E89A88" transform="rotate(10 148 56)">?</text>' +
        '</g>' +
      '</g>';

    var faces =
      '<g class="sida-expr sida-expr--default">' +
        blushPair() +
        '<path class="sida-brow" d="M72 108 Q82 102 92 108" fill="none" stroke="' + brow + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path class="sida-brow" d="M108 108 Q118 102 128 108" fill="none" stroke="' + brow + '" stroke-width="2" stroke-linecap="round"/>' +
        '<g class="sida-eye-wrap">' + roundEye(82, 118) + roundEye(118, 118) + '</g>' +
        '<path class="sida-mouth sida-mouth-line" d="M90 132 Q100 137 110 132" fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '</g>' +
      '<g class="sida-expr sida-expr--happy">' +
        blushPair(".55") +
        '<path class="sida-brow" d="M70 106 Q82 98 94 106" fill="none" stroke="' + brow + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path class="sida-brow" d="M106 106 Q118 98 130 106" fill="none" stroke="' + brow + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path class="sida-eye-l" d="M74 118 Q82 110 90 118" fill="none" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path class="sida-eye-r" d="M110 118 Q118 110 126 118" fill="none" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path class="sida-mouth" d="M86 130 Q100 142 114 130" fill="none" stroke="' + ink + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '</g>' +
      '<g class="sida-expr sida-expr--comfort">' +
        blushPair(".4") +
        '<path class="sida-brow" d="M72 110 Q82 106 90 112" fill="none" stroke="' + brow + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path class="sida-brow" d="M110 112 Q118 106 128 110" fill="none" stroke="' + brow + '" stroke-width="2" stroke-linecap="round"/>' +
        roundEye(82, 120, { py: 122, pr: 4 }) +
        roundEye(118, 120, { py: 122, pr: 4 }) +
        '<path class="sida-mouth" d="M90 134 Q100 138 110 134" fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '</g>';

    return '<svg class="sida-v4" viewBox="0 0 200 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="' + g + '" x1="100" y1="62" x2="100" y2="192" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" stop-color="#C5EFFA"/><stop offset=".5" stop-color="#8ECAE6"/><stop offset="1" stop-color="#4AB5D8"/></linearGradient></defs>' +
      body + faces +
    '</svg>';
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pageCtx() {
    var p = location.pathname;
    var q = new URLSearchParams(location.search);
    if (examPage) return { page: "exam", zone: examZone, subject: examSubject, title: examTitle };
    if (p.indexOf("zone.html") >= 0) return { page: "zone", zone: q.get("zone") || "mock" };
    if (p.indexOf("vocab.html") >= 0) return { page: "vocab", book: q.get("book") || "gaozhong" };
    if (p.indexOf("results.html") >= 0) return { page: "results" };
    if (p.indexOf("index.html") >= 0 || p.endsWith("/") || p === "") return { page: "home" };
    return { page: "other" };
  }

  var TIPS = {
    home: [
      "学习打基础，练习强技能，模考验真章——三步走最稳。",
      "首页 A-Level 专区可直接选考试局和科目，真题免费预览下载。",
      "雅思专项词汇按听说读写分册，比盲目刷词效率高。",
      "剑桥真题从 Vol.19+ 最新册开始模考，感受最接近考场。"
    ],
    study: [
      "高中词汇和四级词汇分开刷，别混在一个 LIST 里。",
      "背单词要同时过关拼写和释义，两个都记牢才算会。",
      "语法精讲做完随堂小测，错题回头再看一遍解析。",
      "听力/阅读/写作专项词汇，对应你接下来要攻的科目。",
      "不会的词会自动进错题本，记得去复习。"
    ],
    practice: [
      "练习区有长难句拆解和听力精听，专项提分最快。",
      "精听跟读要逐句过关，注意连读、弱读和吞音。",
      "长难句先找主干，再拆定语、状语和同位语。",
      "阅读练习卷交卷后可以看得分，非模考也能练手感。"
    ],
    mock: [
      "模考区剑桥雅思听力阅读支持计时，尽量按真考节奏。",
      "阅读题可高亮、做笔记，和机考习惯保持一致。",
      "交卷后 Band 和成绩会记在「我的成绩」。",
      "同一套题可以二刷，对比两次得分看进步。",
      "除了雅思，A-Level / AP / 托福 / SAT 真题也在模考区。"
    ],
    vocab: {
      gaozhong: [
        "高中词汇按 LIST 推进，完成一个勾一个。",
        "测试模式会同时考拼写和中文释义。",
        "错词自动收入错题本，隔天复习效果最好。"
      ],
      cet4: [
        "四级词汇量和雅思有重叠，打好底子两头受益。",
        "释义写关键词即可，不用背完整词典例句。",
        "今天目标：稳稳记住 15 个，比贪多更有效。"
      ],
      special: [
        "专项词汇按听说读写分单元，哪科弱就先刷哪科。",
        "这些词在剑桥真题里出现频率高，值得精读。",
        "配合同科目的模考/练习，记得更牢。"
      ]
    },
    results: [
      "成绩保存在本浏览器，换设备需要重新模考。",
      "Band 轨迹能看最近几次模考走势。",
      "得分低的科目，去练习区做专项往往比硬刷题管用。"
    ],
    general: [
      "每天精听 15 分钟，比盲目刷三套阅读更有效。",
      "阅读先看题干再定位，别从第一段读到尾。",
      "听力填空注意单复数、大小写和词性变形。",
      "写作留 5 分钟检查拼写、时态和主谓一致。",
      "口语不是背答案，是练流利度和观点展开。"
    ]
  };

  var HINT_LINES = {
    correct: [
      "对了！继续保持。",
      "准确！这个掌握了。",
      "漂亮，下一题稳住。",
      "就是这个感觉，节奏很好。"
    ],
    "partial-spelling": [
      "含义对了！拼写再核对一下字母顺序。",
      "意思掌握了，写法记一记就满分。",
      "释义过关，拼写差一点点，再看一眼。"
    ],
    "partial-meaning": [
      "拼写对了！中文释义再想想。",
      "写法没问题，含义再巩固一下。",
      "字母全对，意思还差一口气。"
    ],
    partial: [
      "接近了，看看反馈里的细节。",
      "一半对了，离全对不远。",
      "方向对了，再调整一下。"
    ],
    wrong: [
      "这题值得进错题本，晚点再刷一遍。",
      "没关系，搞懂比蒙对更重要。",
      "先标记，等会儿回头复盘。",
      "错了就记住了，下次注意。"
    ],
    pass: [
      "过关！这句跟读到位了。",
      "精听通过，继续保持这个语速。",
      "结构提交成功，对照参考完善一下。",
      "语法小测这题拿下了。"
    ],
    fail: [
      "再听一遍，注意连读和弱读。",
      "没达标，放慢语速逐词跟读。",
      "长难句别急，先圈出主干再找从句。",
      "再看看解析，下次会更好。"
    ]
  };

  var STREAK_CELEBRATE = [
    "三连对！状态来了。",
    "厉害，连续答对！",
    "节奏很好，保持这个手感。",
    "连对三道，今天词汇手感不错。"
  ];

  var GREET_DEFAULTS = {
    home: [
      "你好，我是思达。学习、练习、模考，我都在。",
      "欢迎来到优益思达。备考路上，有事点我就行。"
    ],
    study: [
      "学习区到了。词汇、语法、专项词——稳扎稳打。",
      "先学好词汇语法，模考才能稳。"
    ],
    practice: [
      "练习区！精听、长难句、阅读卷，专项提分。",
      "针对性练习比盲目刷题更有效，选一个开始吧。"
    ],
    mock: [
      "模考区。剑桥真题计时练，交卷自动估 Band。",
      "全真环境练一次，比刷十套碎片题管用。"
    ],
    results: [
      "来看看战绩。每次模考都值得记录。",
      "Band 轨迹在这，进步一目了然。"
    ],
    vocab: {
      gaozhong: "高中词汇 LIST 到了。拼写和释义都要过关。",
      cet4: "四级词汇练习。今天先稳拿一批核心词。",
      special: "雅思专项词汇。按科目刷，效率更高。"
    }
  };

  function contextTips() {
    var ctx = pageCtx();
    if (ctx.page === "vocab") return TIPS.vocab[ctx.book] || TIPS.vocab.gaozhong;
    if (ctx.page === "zone" && TIPS[ctx.zone]) return TIPS[ctx.zone];
    if (ctx.page === "results") return TIPS.results;
    if (ctx.page === "home") return TIPS.home;
    if (ctx.page === "exam" && ctx.zone === "study") return TIPS.study;
    if (ctx.page === "exam" && ctx.zone === "practice") return TIPS.practice;
    return TIPS.general;
  }

  var host, bubble, state = "default";
  var queue = [], busy = false, idleTimer, lastAct = Date.now();
  var lastHintAt = 0;
  var correctStreak = 0;

  function mount() {
    if (mounted) return;
    mounted = true;
    host = document.createElement("div");
    host.className = "yysd-mascot";
    host.setAttribute("role", "complementary");
    host.setAttribute("aria-label", "思达学习助手");
    host.dataset.state = "default";
    host.innerHTML =
      '<div class="yysd-mascot__bubble" id="sida-bubble" hidden>' +
        '<button type="button" class="yysd-mascot__min" aria-label="收起气泡">—</button>' +
        '<button type="button" class="yysd-mascot__close" aria-label="关闭思达">×</button>' +
        '<div class="yysd-mascot__head">' +
          '<b>思达</b><span class="yysd-mascot__streak" id="sida-streak" hidden></span>' +
        '</div>' +
        '<p id="sida-text"></p>' +
        '<button type="button" class="yysd-mascot__next" id="sida-next" hidden>下一步</button>' +
      '</div>' +
      '<button type="button" class="yysd-mascot__figure" id="sida-figure" aria-expanded="false" aria-label="展开思达提示">' +
        sidaSvg("widget") +
      '</button>';
    document.body.appendChild(host);
    bubble = host.querySelector("#sida-bubble");
    if (window.YYSD && YYSD.touchStreak) YYSD.touchStreak();
    updateStreakBadge();
    host.querySelector("#sida-figure").addEventListener("click", onTap);
    host.querySelector(".yysd-mascot__close").addEventListener("click", dismiss);
    host.querySelector(".yysd-mascot__min").addEventListener("click", closeBubble);
    host.querySelector("#sida-next").addEventListener("click", advanceOnboard);
    ["mousemove", "keydown", "scroll", "touchstart"].forEach(function (ev) {
      document.addEventListener(ev, poke, { passive: true });
    });
    resetIdle();
  }

  function updateStreakBadge() {
    if (!host) return;
    var el = host.querySelector("#sida-streak");
    if (!el) return;
    var Y = window.YYSD;
    if (!Y || !Y.touchStreak) { el.hidden = true; return; }
    var s = Y.touchStreak();
    if (s.visit >= 2) {
      el.textContent = "\uD83D\uDD25 " + s.visit;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function setState(s) {
    state = s || "default";
    if (!host) return;
    host.dataset.state = state;
    host.classList.toggle("is-expressive", state !== "default");
  }

  function bumpFigure() {
    if (!host) return;
    host.classList.remove("is-tapped");
    void host.offsetWidth;
    host.classList.add("is-tapped");
    clearTimeout(bumpFigure._t);
    bumpFigure._t = setTimeout(function () { host.classList.remove("is-tapped"); }, 360);
  }

  function closeBubble() {
    if (!host || !bubble) return;
    bubble.hidden = true;
    host.classList.remove("is-bubble-open", "is-minimized", "is-onboarding", "is-speaking");
    clearTimeout(drain._t);
    busy = false;
    queue.length = 0;
    setState("default");
    syncFigureAria();
    var nextBtn = host.querySelector("#sida-next");
    if (nextBtn) nextBtn.hidden = true;
  }

  function syncFigureAria() {
    var fig = host && host.querySelector("#sida-figure");
    if (!fig) return;
    var open = !bubble.hidden;
    fig.setAttribute("aria-expanded", open ? "true" : "false");
    fig.setAttribute("aria-label", open ? "收起思达提示" : "展开思达提示");
  }

  function show(text, opts) {
    if (!mounted) mount();
    opts = opts || {};
    queue.push({
      text: text,
      state: opts.state || "default",
      ms: opts.ms != null ? opts.ms : 5000,
      pinned: !!opts.pinned,
      onboard: !!opts.onboard
    });
    if (!busy) drain();
  }

  function drain() {
    if (!queue.length) { busy = false; return; }
    busy = true;
    var item = queue.shift();
    setState(item.state);
    bubble.hidden = false;
    host.classList.remove("is-minimized");
    if (item.pinned) host.classList.add("is-bubble-open");
    else host.classList.remove("is-bubble-open");
    if (item.onboard) host.classList.add("is-onboarding");
    else host.classList.remove("is-onboarding");
    host.classList.toggle("is-speaking", !item.pinned && !item.onboard);
    host.querySelector("#sida-text").textContent = item.text;
    var nextBtn = host.querySelector("#sida-next");
    if (nextBtn) nextBtn.hidden = !item.onboard;
    syncFigureAria();
    clearTimeout(drain._t);
    if (item.pinned || item.onboard) { busy = false; return; }
    drain._t = setTimeout(function () {
      if (!queue.length) closeBubble();
      else setState("default");
      drain();
    }, item.ms);
  }

  function poke() { lastAct = Date.now(); resetIdle(); }

  function resetIdle() {
    if (examZone === "mock" || onboardActive) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (Date.now() - lastAct < IDLE_MS - 500) return;
      show(idleLine(), { state: "wave", ms: 6000 });
    }, IDLE_MS);
  }

  function idleLine() {
    var ctx = pageCtx();
    var sub = ctx.subject || "";
    if (ctx.page === "exam") {
      if (ctx.zone === "study") {
        if (sub.indexOf("grammar") >= 0) return "语法题慢慢想，吃透一道是一道。";
        if (sub.indexOf("vocab") >= 0) return "还在背单词？错词会自动进错题本。";
        return pick(["词汇练习别赶，拼写和释义都要稳。", "学习区进度会保存，做完记得看错题本。"]);
      }
      if (ctx.zone === "practice") {
        if (sub === "jingting") return "精听卡住了？退回半速再跟一遍。";
        if (sub === "changnanju") return "长难句先找主谓宾，别被修饰成分吓到。";
        return "专项练习贵在坚持，再练一句？";
      }
    }
    if (ctx.page === "zone") {
      if (ctx.zone === "mock") return pick(["搜「剑19」「Test 1」能快速找到卷子。", "模考记得开计时，习惯真考节奏。"]);
      if (ctx.zone === "practice") return "精听和长难句都在这，选一个专项开始。";
      if (ctx.zone === "study") return "高中词、四级词、专项词——今天想攻哪块？";
    }
    if (ctx.page === "vocab") {
      if (ctx.book === "cet4") return "四级 LIST 推进中？今天记住 15 个就很棒。";
      if (ctx.book === "special") return "专项词汇配合同科目练习，记得更牢。";
      return "高中词汇稳扎稳打，错题本记得复习。";
    }
    if (ctx.page === "results") return "可以挑一套分低的卷子，去练习区补专项。";
    return pick(["还在吗？点我获取一条备考小贴士。", "学习·练习·模考，有事随时点我。"]);
  }

  function onTap() {
    poke();
    bumpFigure();
    if (onboardActive) { advanceOnboard(); return; }
    if (!bubble.hidden) {
      closeBubble();
      return;
    }
    show(pick(contextTips()), { state: "happy", pinned: true });
  }

  function finishOnboard() {
    onboardActive = false;
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch (e) {}
    host.classList.remove("is-onboarding");
    var nextBtn = host.querySelector("#sida-next");
    if (nextBtn) nextBtn.hidden = true;
  }

  function advanceOnboard() {
    onboardStep++;
    if (onboardStep >= ONBOARD_STEPS.length) {
      finishOnboard();
      closeBubble();
      greet();
      return;
    }
    showOnboardStep(onboardStep);
  }

  function showOnboardStep(i) {
    onboardActive = true;
    var nextBtn = host.querySelector("#sida-next");
    if (nextBtn) {
      nextBtn.textContent = i >= ONBOARD_STEPS.length - 1 ? "知道了" : "下一步 (" + (i + 1) + "/" + ONBOARD_STEPS.length + ")";
    }
    show(ONBOARD_STEPS[i], { state: i === 0 ? "wave" : "happy", pinned: true, onboard: true });
  }

  function needsOnboard() {
    if (examPage) return false;
    try { return !localStorage.getItem(ONBOARD_KEY); } catch (e) { return false; }
  }

  function runOnboard(done) {
    if (!needsOnboard()) { if (done) done(); return; }
    onboardStep = 0;
    showOnboardStep(0);
    runOnboard._done = done;
  }

  function dismiss() {
    if (onboardActive) finishOnboard();
    try { localStorage.setItem(OFF_KEY, "1"); } catch (e) {}
    host.classList.add("is-hidden");
    setTimeout(function () { host.remove(); mounted = false; mountRestore(); }, 400);
  }

  function streakMsg() {
    var Y = window.YYSD;
    if (!Y || !Y.touchStreak) return "";
    var s = Y.touchStreak();
    if (s.visit >= 7) return pick(["连续 " + s.visit + " 天，你是备考钉子户！", "第 " + s.visit + " 天打卡，习惯已经养成了。"]);
    if (s.visit >= 3) return pick(["连续 " + s.visit + " 天，保持！", "连续 " + s.visit + " 天来了，节奏很好。"]);
    if (s.visit === 2) return "连续 2 天来了，好习惯！";
    return "";
  }

  function greetDefault(key, book) {
    if (key === "vocab") {
      var v = GREET_DEFAULTS.vocab[book || "gaozhong"] || GREET_DEFAULTS.vocab.gaozhong;
      return typeof v === "string" ? v : pick(v);
    }
    return pick(GREET_DEFAULTS[key] || GREET_DEFAULTS.home);
  }

  function greet() {
    if (onboardActive) return;
    var ctx = pageCtx();
    var zone = ctx.zone || "mock";
    var key = ctx.page === "zone" ? (GREET_DEFAULTS[zone] ? zone : "mock") : ctx.page;
    if (key === "other") return;
    var st = { home: "wave", study: "default", practice: "default", mock: "default", results: "happy", vocab: "happy", zone: "default" };
    var stKey = key === "zone" ? zone : key;

    function deliver(line) {
      updateStreakBadge();
      var s = streakMsg();
      if (s) line = s + " " + line;
      show(line, { state: st[stKey] || "default", ms: stKey === "home" ? 6500 : 6000 });
    }

    var Y = window.YYSD;
    if (Y && Y.load && (key === "home" || key === "zone" || key === "results")) {
      var ctxPromise = key === "results"
        ? Promise.resolve().then(function () {
            return Y.mascotResultsLine(Object.keys(Y.results()).map(function (k) { return Y.results()[k]; }));
          })
        : Y.load().then(function (items) {
            return Y.mascotSmartLine ? Y.mascotSmartLine(items, key === "home" ? null : zone) : Y.mascotPathLine(items);
          });
      ctxPromise.then(function (ctxLine) {
        deliver(ctxLine || greetDefault(stKey, ctx.book));
      }).catch(function () { deliver(greetDefault(stKey, ctx.book)); });
      return;
    }
    deliver(greetDefault(stKey, ctx.book));
  }

  function examStartLine(zone, subject, title) {
    var sub = subject || "";
    var t = title ? "「" + title + "」" : "";
    if (zone === "study") {
      if (sub === "grammar") return "语法精讲" + t + "开始了，随堂小测我帮你盯。";
      if (sub === "vocab-cet4") return "四级词汇" + t + "，拼写和释义都要过关。";
      if (sub.indexOf("vocab-special") === 0) return "专项词汇" + t + "，结合科目记更牢。";
      if (sub.indexOf("vocab") >= 0) return "词汇" + t + "开练，错词会自动进错题本。";
      return pick(["学习模式启动，我陪你一道一道来。", "边学边测，不会的记下来。"]);
    }
    if (zone === "practice") {
      if (sub === "jingting") return "精听" + t + "，跟读过关要反复练，别急。";
      if (sub === "changnanju") return "长难句" + t + "，先拆主干再对译文。";
      if (sub === "ielts") return "阅读练习" + t + "，按题干定位，别通读全文。";
      return "专项练习" + t + "，量变才能质变。";
    }
    return "";
  }

  function greetExamZone(zone) {
    var line = examStartLine(zone, examSubject, examTitle);
    if (!line) return;
    var st = zone === "practice" ? "think" : "happy";
    if (examSubject === "jingting") st = "think";
    show(line, { state: st, ms: 5500 });
  }

  function onHint(result) {
    if (examZone === "mock" || !result) return;
    var now = Date.now();
    if (now - lastHintAt < 1200) return;
    lastHintAt = now;

    var isCorrect = result === "correct" || result === "pass";
    if (isCorrect) {
      correctStreak++;
      if (correctStreak >= 3) {
        correctStreak = 0;
        show(STREAK_CELEBRATE[Math.floor(Math.random() * STREAK_CELEBRATE.length)],
          { state: "celebrate", ms: 3800 });
        return;
      }
    } else {
      correctStreak = 0;
    }

    var lines = HINT_LINES[result];
    if (!lines) return;
    var st = isCorrect ? "happy"
      : (result === "wrong" || result === "fail") ? "confused" : "think";
    show(lines[Math.floor(Math.random() * lines.length)], { state: st, ms: 3200 });
  }

  function onStudyScore(d) {
    if (d.wrongWords && d.wrongWords.length) {
      var n = d.wrongWords.length;
      show(pick([
        "完成！有 " + n + " 个错词已收入错题本，去复习一下吧。",
        n + " 个词进了错题本，隔天再刷一遍记得更牢。",
        "本轮有 " + n + " 个错词，错题本已更新。"
      ]), { state: "happy", ms: 6500 });
      return;
    }
    onScore(d);
  }

  function onScore(d) {
    if (d.score == null || d.total == null || !d.total) {
      show(pick(["完成了！成绩已保存。", "交卷成功，去「我的成绩」看看吧。"]), { state: "celebrate", ms: 6000 });
      return;
    }
    var ratio = d.score / d.total;
    var s = d.score + "/" + d.total;
    if (ratio >= 0.85) {
      show(pick([
        "太棒了！" + s + "，保持这个状态。",
        s + "，几乎全对！可以挑战更难的内容了。",
        s + "，漂亮！错题再过一遍就稳了。"
      ]), { state: "celebrate", ms: 7000 });
    } else if (ratio >= 0.6) {
      show(pick([
        s + "，不错。看看错题再巩固一下。",
        s + "，及格线以上了，查漏补缺还能再涨。",
        s + "，有基础了，专项练习能再推一把。"
      ]), { state: "happy", ms: 6500 });
    } else {
      show(pick([
        s + "，别灰心。搞懂错题比分数更重要。",
        s + "，先复盘错题，比急着刷下一套管用。",
        s + "，薄弱点找到了，去练习区补专项试试。"
      ]), { state: "confused", ms: 7000 });
    }
  }

  function mockSkillTip(d, band, ratio) {
    var sub = String(d.subject || "");
    var low = (band != null && !isNaN(band) && band < 6.5) || (ratio != null && ratio < 0.65);
    if (sub.indexOf("listening") >= 0) {
      return pick(low ? [
        "听力：拼写和单复数是失分重灾区，精听跟读很有用。",
        "听力：Section 4 学术词多听几遍，去练习区精听补一下。"
      ] : [
        "听力：节奏不错，保持预判下一题题型。",
        "听力：拼写稳住了，下次试试更高册的剑桥题。"
      ]);
    }
    if (sub.indexOf("reading") >= 0) {
      return pick(low ? [
        "阅读：错题定位词再找一遍，别通读全文。",
        "阅读：时间紧就先保简单题，判断/填空优先。"
      ] : [
        "阅读：定位准确，注意 Passage 3 的时间分配。",
        "阅读：发挥不错，试试限时刷下一套保持手感。"
      ]);
    }
    if (sub.indexOf("writing") >= 0) {
      return pick(low ? [
        "写作：检查段落结构和衔接词，比堆词更重要。",
        "写作：Task 2 先列提纲再动笔，逻辑比辞藻要紧。"
      ] : [
        "写作：结构清晰，下次试试更高阶的论证。",
        "写作：表达稳住了，注意字数和段落均衡。"
      ]);
    }
    if (sub.indexOf("speaking") >= 0) {
      return low ? "口语：流利度优先，观点展开用 because / for example 串联。"
        : "口语：表达流畅，下次试试更复杂的话题词汇。";
    }
    return "";
  }

  function onMockScore(d) {
    mount();
    var line, st = "happy", tip = "";
    var band = d.band != null ? Number(d.band) : null;
    var ratio = (d.score != null && d.total) ? d.score / d.total : null;

    if (band != null && !isNaN(band)) {
      if (band >= 7.5) { line = pick(["Band " + band + "，非常出色！", "Band " + band + "，稳了！保持节奏。"]); st = "celebrate"; }
      else if (band >= 6.5) { line = pick(["Band " + band + "，达标了。", "Band " + band + "，不错，继续巩固弱项。"]); st = "happy"; }
      else if (band >= 5.5) { line = pick(["Band " + band + "，有进步空间。", "Band " + band + "，弱项找准了就能再涨。"]); st = "default"; }
      else { line = pick(["Band " + band + "，别灰心，复盘比刷题重要。", "Band " + band + "，先搞懂错题，分数会跟上。"]); st = "confused"; }
    } else if (d.score != null && d.total) {
      line = d.score + "/" + d.total + " 完成。";
      if (ratio >= 0.85) { line += pick([" 表现很好！", " 接近满分手感！"]); st = "celebrate"; }
      else if (ratio >= 0.6) { line += pick([" 不错，继续巩固。", " 有基础，专项还能再推。"]); st = "happy"; }
      else { line += pick([" 看看错题解析。", " 去练习区补一下薄弱项。"]); st = "confused"; }
    } else {
      line = pick(["模考完成，成绩已保存。", "交卷成功！去「我的成绩」看详情。"]);
      st = "celebrate";
    }

    tip = mockSkillTip(d, band, ratio);
    if (tip) line += " " + tip;
    else line += pick([" 去「我的成绩」查看详情。", " 成绩在「我的成绩」里，随时能复盘。"]);

    show(line, { state: st, ms: 10000 });
  }

  function onTimer(level) {
    if (examZone === "mock") return;
    if (level === "danger") {
      show(pick([
        "时间不多了！抓紧检查答题卡。",
        "最后 1 分钟！没写的先猜上，别留空。",
        "快交卷了，确认题号有没有涂错行。"
      ]), { state: "panic", ms: 5000 });
    } else if (level === "low") {
      show(pick([
        "还剩不到 5 分钟，留意一下节奏。",
        "时间偏紧，优先做有把握的题目。",
        "5 分钟倒计时，阅读题别在一道难题上耗太久。"
      ]), { state: "confused", ms: 4500 });
    }
  }

  function configure(detail) {
    examZone = (detail && detail.zone) || null;
    examSubject = (detail && detail.subject) || null;
    examTitle = (detail && detail.title) || null;
    if (examZone === "mock") return;
    mount();
    greetExamZone(examZone);
    resetIdle();
  }

  function revealMockScore(d) {
    examZone = "mock";
    mount();
    if (host) {
      host.classList.add("is-ceremony");
      setTimeout(function () { host.classList.remove("is-ceremony"); }, 900);
    }
    onMockScore(d || {});
  }

  function boot() {
    mount();
    if (needsOnboard()) {
      runOnboard(greet);
    } else {
      greet();
    }
  }

  window.YYSD_MASCOT = {
    say: show,
    enable: enableMascot,
    configure: configure,
    revealScore: revealMockScore,
    react: function (type, data) {
      if (type === "score") {
        if (examZone === "mock" || (data && data.zone === "mock")) revealMockScore(data);
        else if (examZone === "study") onStudyScore(data || {});
        else onScore(data || {});
      } else if (type === "timer") onTimer(data);
      else if (type === "hint") onHint(data);
      else if (type === "tip") onTap();
    }
  };

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d) return;
    if (d.type === "yysd:mascot-hint") { onHint(d.result); return; }
    if (d.type !== "yysd:score") return;
    if (examPage && examZone === "mock") return;
    else if (examPage && examZone === "study") onStudyScore(d);
    else if (examPage) onScore(d);
    else onScore(d);
  });

  document.addEventListener("yysd:mascot", function (e) {
    var d = e.detail || {};
    if (d.type === "config") configure(d);
    else if (d.type === "reveal") revealMockScore(d);
    else if (d.type === "hint") onHint(d.result);
    else if (d.type === "score") {
      if (examZone === "mock") revealMockScore(d);
      else if (examZone === "study") onStudyScore(d);
      else onScore(d);
    } else if (d.type === "timer") onTimer(d.level);
    else if (d.text) show(d.text, d);
  });

  document.addEventListener("yysd:mascot-config", function (e) { configure(e.detail || {}); });
  document.addEventListener("yysd:mascot-reveal", function (e) { revealMockScore(e.detail || {}); });

  if (!examPage) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})();
