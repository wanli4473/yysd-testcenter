/* ponytail: one shell for HIT labs + done dots */
(function (w) {
  "use strict";
  var DONE = "yysd:app-toefl-done";
  var LINKS = [
    { href: "home.html", key: "home", label: "Home" },
    { href: "reading-lab.html", key: "reading", label: "Reading" },
    { href: "listening-lab.html", key: "listening", label: "Listening" },
    { href: "speaking-lab.html", key: "speaking", label: "Speaking" },
    { href: "writing-lab.html", key: "writing", label: "Writing" },
    { href: "soon.html?p=wordbook", key: "wordbook", label: "生词本" },
    { href: "soon.html?p=history", key: "history", label: "History" },
    { href: "soon.html?p=mock", key: "mock", label: "Mock Test" }
  ];

  function parse(raw, fallback) {
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function doneMap() { return parse(w.localStorage.getItem(DONE) || "{}", {}) || {}; }
  function doneKey(skill, task) { return skill + "|" + Number(task); }
  function isDone(skill, task) { return !!doneMap()[doneKey(skill, task)]; }
  function markDone(skill, task, rec) {
    var d = doneMap();
    d[doneKey(skill, task)] = rec || { at: Date.now() };
    w.localStorage.setItem(DONE, JSON.stringify(d));
  }
  function resultOf(skill, task) { return doneMap()[doneKey(skill, task)] || null; }

  function navHTML(active) {
    var A = w.YYSD_APP;
    var u = A && A.user ? A.user() : {};
    var name = u.displayName || u.phone || "";
    var pills = LINKS.map(function (l) {
      return '<a href="' + l.href + '" class="' + (l.key === active ? "is-on" : "") + '">' + l.label + "</a>";
    }).join("");
    return '<header class="hit-top">' +
      '<a class="hit-brand" href="home.html">优益思达机考系统<small>TOEFL PRACTICE HUB</small></a>' +
      '<nav class="hit-pills">' + pills + "</nav>" +
      '<span class="hit-who" id="hit-who">' + (name || "") + "</span>" +
      '<button type="button" class="hit-out" id="hit-out">退出</button></header>';
  }

  function mount(active) {
    var A = w.YYSD_APP;
    if (A && !A.requireLogin(location.pathname.split("/").pop() + location.search)) return false;
    document.body.insertAdjacentHTML("afterbegin", navHTML(active));
    var out = document.getElementById("hit-out");
    if (out) out.onclick = function () { A.logout(); location.replace("login.html"); };
    return true;
  }

  function examHref(page, task) {
    return page + "?task=" + encodeURIComponent(task) + "&mode=practice";
  }

  var CAT = {
    reading: [
      { key: "complete_words", en: "Complete the Words", zh: "单词填空", layout: "cards",
        items: [{ task: 0, title: "South Pacific History", meta: "10 blanks" }] },
      { key: "daily_life", en: "Read in Daily Life", zh: "生活阅读", layout: "cards",
        items: [{ task: 1, title: "Career Fair", meta: "2 questions" }] },
      { key: "academic", en: "Academic Passage", zh: "学术文章", layout: "cards",
        items: [{ task: 2, title: "The Dynamics of Hollywood's Golden Age", meta: "5 questions" }] }
    ],
    listening: [
      { key: "choose_response", en: "Choose a Response", zh: "听句选回应",
        codes: ["LR01","LR02","LR03","LR04","LR05","LR06","LR07","LR08","LR09","LR10","LR11","LR12"], from: 0 },
      { key: "conversation", en: "Conversation", zh: "对话",
        codes: ["C01","C02","C03","C04","C05"], from: 12 },
      { key: "announcement", en: "Announcement", zh: "通知",
        codes: ["A01","A02","A03"], from: 17 },
      { key: "lecture", en: "Academic Talk", zh: "学术讲座",
        codes: ["AT1"], from: 20 }
    ],
    writing: [
      { key: "sentence", en: "Build a Sentence", zh: "句子构建",
        codes: ["1","2","3","4","5","6","7","8","9","10"], from: 0 },
      { key: "email", en: "Write an Email", zh: "邮件写作", layout: "cards",
        items: [{ task: 10, title: "Printing Services", meta: "1 email" }] },
      { key: "discussion", en: "Academic Discussion", zh: "学术讨论", layout: "cards",
        items: [{ task: 11, title: "The Driving Force of History", meta: "1 discussion" }] }
    ],
    speaking: [
      { key: "repeat", en: "Listen and Repeat", zh: "听力复述", layout: "cards",
        items: [{ task: 0, title: "Gym", meta: "7 sentences", end: 6 }] },
      { key: "interview", en: "Take an Interview", zh: "模拟面试",
        codes: ["Q1","Q2","Q3","Q4"], from: 7 }
    ]
  };

  function filterTodo(items, skill) {
    return items.filter(function (it) { return !isDone(skill, it.task); });
  }

  function cardHTML(skill, page, it) {
    var rec = resultOf(skill, it.task);
    var st = rec ? ("已完成" + (rec.score != null ? " · " + rec.score + "/" + rec.total : "")) : "未开始";
    var href = examHref(page, it.task) + (it.end != null ? "&end=" + it.end : "");
    return '<a class="hit-card" href="' + href + '"><div class="meta"><span>Set 1</span><span>' +
      (it.meta || "") + '</span></div><h3>' + it.title + '</h3><div class="hit-status">' + st + "</div></a>";
  }

  function setHTML(skill, page, group) {
    var dots = group.codes.map(function (code, i) {
      var task = group.from + i;
      var rec = resultOf(skill, task);
      var cls = rec ? (rec.ok === false || (rec.total && rec.score < rec.total) ? "is-bad" : "is-done") : "";
      return '<a class="' + cls + '" href="' + examHref(page, task) + '">' + code + "</a>";
    }).join("");
    var doneN = group.codes.filter(function (_, i) { return isDone(skill, group.from + i); }).length;
    return '<article class="hit-set"><div class="meta"><div><strong>Set 1</strong>' +
      '<div class="hit-status">完成 ' + doneN + "/" + group.codes.length + '</div></div>' +
      '<span>' + group.en + " · " + group.codes.length + " questions</span></div>" +
      '<div class="hit-dots">' + dots + "</div></article>";
  }

  function bindLab(skill, page, host) {
    var groups = CAT[skill] || [];
    var tab = 0;
    var onlyTodo = false;
    function paint() {
      var g = groups[tab];
      var tabs = groups.map(function (x, i) {
        return '<button type="button" class="' + (i === tab ? "is-on" : "") + '" data-tab="' + i + '"><b>' +
          String(i + 1).padStart(2, "0") + " " + x.en + "</b><span>" + x.zh + "</span></button>";
      }).join("");
      var body = "";
      if (g.layout === "cards") {
        var items = onlyTodo ? filterTodo(g.items, skill) : g.items;
        body = items.length ? '<div class="hit-grid">' + items.map(function (it) { return cardHTML(skill, page, it); }).join("") + "</div>"
          : '<p class="hit-status">没有未做的题目。</p>';
      } else {
        var show = !onlyTodo || g.codes.some(function (_, i) { return !isDone(skill, g.from + i); });
        body = show ? setHTML(skill, page, g) : '<p class="hit-status">没有未做的题目。</p>';
      }
      host.innerHTML =
        '<div class="hit-tabs">' + tabs + "</div>" +
        '<div class="hit-row"><h2>' + g.en + '</h2><div class="hit-filter">' +
        '<button type="button" class="' + (!onlyTodo ? "is-on" : "") + '" data-f="all">全部</button>' +
        '<button type="button" class="' + (onlyTodo ? "is-on" : "") + '" data-f="todo">未做</button></div></div>' +
        body;
    }
    host.addEventListener("click", function (ev) {
      var t = ev.target.closest("[data-tab]");
      if (t) { tab = Number(t.getAttribute("data-tab")); paint(); }
      var f = ev.target.closest("[data-f]");
      if (f) { onlyTodo = f.getAttribute("data-f") === "todo"; paint(); }
    });
    paint();
  }

  w.YYSD_HIT = {
    mount: mount,
    isDone: isDone,
    markDone: markDone,
    resultOf: resultOf,
    bindLab: bindLab,
    examHref: examHref,
    CAT: CAT
  };
})(window);
