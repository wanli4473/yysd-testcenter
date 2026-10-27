/* HIT hub shell — 顶栏/首页/个人页 + 真题题库一屏列表 */
(function (w) {
  "use strict";
  var LINKS = [
    { href: "home.html", key: "home", zh: "首页" },
    { href: "practice.html", key: "practice", zh: "真题题库" },
    { href: "mock.html", key: "mock", zh: "考前冲刺包" },
    { href: "profile.html", key: "profile", zh: "个人" }
  ];
  var SUBJECTS = [
    { skill: "reading", zh: "阅读", chips: ["单词填空", "日常阅读", "学术文章"] },
    { skill: "listening", zh: "听力", chips: ["听句选回应", "对话", "讲座"] },
    { skill: "speaking", zh: "口语", chips: ["听力复述", "模拟面试"] },
    { skill: "writing", zh: "写作", chips: ["句子构建", "邮件", "学术讨论"] }
  ];
  var SKILL_ZH = { reading: "阅读", listening: "听力", speaking: "口语", writing: "写作" };

  function parse(raw, fallback) {
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  // 进度存储只有一套：assets/js/toefl-lab.js 的 yysd:toefl-item-state
  function L() { return w.YYSD_TOEFL_LAB; }
  function doneMap() { return L().state(); }
  function lookup(skill, task, set, records) {
    return (records || doneMap())[L().canon(skill, set, task)] || null;
  }
  function isDone(skill, task, set, records) { return !!lookup(skill, task, set, records); }
  function markDone(skill, task, rec) { L().markState(skill, rec && rec.set, task, rec); }

  function initial(name) {
    var s = String(name || "").trim();
    return s ? s.charAt(0) : "U";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function avatarBox(u, cls) {
    var A = w.YYSD_APP;
    var src = A && A.avatarSrc ? A.avatarSrc(u.avatarUrl) : "";
    var name = u.displayName || u.phone || "";
    if (src) {
      return '<span class="hit-avatar' + (cls ? " " + cls : "") + ' has-img"><img src="' +
        esc(src) + '" alt=""></span>';
    }
    return '<span class="hit-avatar' + (cls ? " " + cls : "") + '" aria-hidden="true">' +
      esc(initial(name)) + "</span>";
  }

  function refreshChrome() {
    var A = w.YYSD_APP;
    var u = A && A.user ? A.user() : {};
    var who = document.getElementById("hit-who");
    if (who) who.textContent = u.displayName || u.phone || "";
    var av = document.querySelector(".hit-top .hit-avatar");
    if (!av) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = avatarBox(u, "");
    av.replaceWith(wrap.firstChild);
  }

  function navHTML(active) {
    var A = w.YYSD_APP;
    var u = A && A.user ? A.user() : {};
    var name = u.displayName || u.phone || "";
    var labOn = /^(reading|listening|speaking|writing)$/.test(active);
    var pills = LINKS.map(function (l) {
      var on = l.key === active || (l.key === "practice" && labOn);
      return '<a href="' + l.href + '" class="hit-tab' + (on ? " is-on" : "") + '"' + (on ? ' aria-current="page"' : '') + '><b>' +
        l.zh + "</b></a>";
    }).join("");
    return '<header class="hit-top">' +
      '<a class="hit-brand" href="home.html"><span class="hit-logo-mark" aria-hidden="true">优</span>' +
      '<span>优益思达<small>TOEFL 学习系统</small></span></a>' +
      '<nav class="hit-pills" aria-label="主导航">' + pills + "</nav>" +
      '<div class="hit-user">' + avatarBox({ displayName: name, phone: u.phone, avatarUrl: u.avatarUrl }, "") +
      '<span class="hit-who" id="hit-who">' + esc(name) + "</span>" +
      '<button type="button" class="hit-out" id="hit-reload">刷新</button>' +
      '<button type="button" class="hit-out" id="hit-out">退出</button></div></header>';
  }

  function hardReload() {
    if (w.yysdDesktop && typeof w.yysdDesktop.reload === "function") {
      w.yysdDesktop.reload();
      return;
    }
    var u = new URL(location.href);
    u.searchParams.set("_r", String(Date.now()));
    location.replace(u.pathname + u.search + u.hash);
  }

  function mount(active) {
    var A = w.YYSD_APP;
    if (A && !A.requireLogin(location.pathname.split("/").pop() + location.search)) return false;
    document.body.insertAdjacentHTML("afterbegin", '<a class="hit-skip" href="#hit-content">跳至主要内容</a>' + navHTML(active));
    var main = document.querySelector("main");
    if (main) {
      if (!main.id) main.id = "hit-content";
      main.tabIndex = -1;
      document.querySelector(".hit-skip").href = "#" + main.id;
      document.querySelector(".hit-skip").onclick = function (ev) { ev.preventDefault(); main.focus(); };
    }
    document.body.insertAdjacentHTML("beforeend", '<footer class="hit-footer"><span>优益思达国际课程中心</span><span>TOEFL 学习系统</span></footer>');
    var out = document.getElementById("hit-out");
    if (out) out.onclick = function () { A.logout(); location.replace("login.html"); };
    var reload = document.getElementById("hit-reload");
    if (reload) reload.onclick = hardReload;
    return true;
  }

  /* ---------- 真题题库：科目 tab + 题型 segmented + 题目列表，一屏到底 ----------
     版式与文案照 hanginthere：idx 决定序号写法，cells 决定行式题号格，其余走大卡；皮肤瑞士黑红、圆角 0。 */
  var LIB = {
    reading: [
      { type: "complete_words", en: "Complete the Words", zh: "单词填空", idx: "set" },
      { type: "daily_life", en: "Read in Daily Life", zh: "生活阅读", idx: "set", count: 1 },
      { type: "academic", en: "Academic Passage", head: "Read an Academic Passage", zh: "学术文章", idx: "set" }
    ],
    listening: [
      { type: "choose_response", en: "Choose a Response", head: "Listen and Choose a Response", zh: "听句选回应", idx: "set", prog: 1 },
      { type: "conversation", en: "Conversation", zh: "对话", idx: "set", prog: 1 },
      { type: "announcement", en: "Announcement", zh: "通知", idx: "set", prog: 1 },
      { type: "lecture", en: "Academic Talk", zh: "学术讲座", idx: "set" }
    ],
    speaking: [
      { type: "repeat", en: "Listen and Repeat", zh: "听后跟读", idx: "hash", sub: 1 },
      { type: "interview", en: "Take an Interview", zh: "面试问答", idx: "hash", sub: 1 }
    ],
    writing: [
      { type: "sentence", en: "Build a Sentence", zh: "句子构建", idx: "set" },
      { type: "email", en: "Write an Email", zh: "邮件写作", idx: "pad", sub: 1 },
      { type: "discussion", en: "Academic Discussion", zh: "学术讨论", idx: "pad", sub: 1 }
    ]
  };
  var LIB_SKILLS = ["reading", "listening", "speaking", "writing"];
  var LIB_FILTERS = [{ key: "all", zh: "全部" }, { key: "todo", zh: "未做" }, { key: "hot", zh: "高频" }];
  var LIB_HEAD = {
    reading: { kicker: "TOEFL READING LAB", zh: "阅读练习", lead: "先选择题型，再点击题号进入练习。" },
    listening: { kicker: "TOEFL LISTENING LAB", zh: "听力练习", lead: "先选择题型，再点击题目进入练习。" },
    speaking: { kicker: "TOEFL SPEAKING LAB", zh: "口语练习", lead: "先选择题型，再点击题目进入练习。" },
    writing: { kicker: "TOEFL WRITING LAB", zh: "写作练习", lead: "按题型练习真题，草稿会自动保存在本机。" }
  };
  var libCatalog = {};
  var libHost = null;
  var libView = { skill: "reading", type: "", filter: "all", query: "", records: null };

  function libMeta(skill, type) {
    return (LIB[skill] || []).filter(function (m) { return m.type === type; })[0] ||
      { type: type, en: type, zh: type, idx: "set" };
  }
  function libGroups(skill, type) {
    return (libCatalog[skill] || []).filter(function (g) { return g.type === type; });
  }
  function itemHref(skill, paperId, task, end) {
    return skill + ".html?id=" + encodeURIComponent(paperId) + "&mode=practice&task=" + encodeURIComponent(task) +
      (end > task ? "&taskEnd=" + encodeURIComponent(end) : "");
  }
  // 一次列表只解析一遍进度表
  function doneInSpan(skill, paperId, from, to, records) {
    var d = records || doneMap();
    var n = 0;
    for (var i = from; i <= to; i++) if (d[L().canon(skill, paperId, i)]) n++;
    return n;
  }
  function libStateOf(skill, g, records) {
    var total = g.end - g.task + 1;
    var done = doneInSpan(skill, g.paperId, g.task, g.end, records);
    return { total: total, done: done, cls: done >= total ? "done" : (done ? "mid" : "todo") };
  }
  function stateLabel(st) {
    return st.cls === "done" ? "已完成" : (st.cls === "mid" ? "进行中 " + st.done + "/" + st.total : "未开始");
  }
  function hotChip(g) {
    if (!g.hot) return "";
    var tier = g.hot > 1 ? ["🔥🔥", "超高频题"] : ["🔥", "高频题"];
    return '<span class="hit-lib-hot" role="img" title="' + tier[1] + '">' + tier[0] + "</span>";
  }
  function idxLabel(meta, g, i) {
    var n = g.sort || i + 1;
    if (meta.idx === "hash") return "#" + n;
    if (meta.idx === "pad") return (n < 10 ? "0" : "") + n;
    return "Set " + n;
  }
  function cardHTML(skill, meta, g, i, records) {
    var st = libStateOf(skill, g, records);
    return '<a class="hit-lib-card is-' + st.cls + '" href="' + itemHref(skill, g.paperId, g.task, g.end) + '">' +
      '<div class="hit-lib-meta"><span class="hit-lib-idx">' + idxLabel(meta, g, i) + "</span>" +
      (meta.count ? '<span class="hit-lib-n" lang="en">' + g.n + " question" + (g.n > 1 ? "s" : "") + "</span>" : "") + hotChip(g) + "</div>" +
      '<h3 class="hit-lib-title" lang="en">' + esc(g.title || meta.en) + "</h3>" +
      (meta.sub ? '<p class="hit-lib-sub">' + esc(g.zh || meta.zh) + "</p>" : "") +
      '<div class="hit-lib-foot">' + stateLabel(st) + "</div></a>";
  }
  // 题号格只进这一道。一整套（task..end）要单独的入口，否则 Windows 同学只能一题一题点。
  function setStartHTML(skill, g) {
    if (!(Number(g.end) > Number(g.task))) return "";
    return '<a class="hit-lib-start" href="' + itemHref(skill, g.paperId, g.task, g.end) + '">开始做题</a>';
  }
  function rowHTML(skill, meta, g, i, records) {
    var cells = g.cells || [];
    var d = records || doneMap();
    var done = 0;
    var nums = cells.map(function (c) {
      var on = !!d[L().canon(skill, g.paperId, c.task)];
      if (on) done++;
      return '<a class="hit-lib-num' + (on ? " is-done" : "") + '" href="' +
        itemHref(skill, g.paperId, c.task, c.end) + '" title="' + esc(c.label) + '">' + esc(c.label) + "</a>";
    }).join("");
    var st = libStateOf(skill, g, records);
    return '<div class="hit-lib-row is-' + st.cls + '">' +
      '<div class="hit-lib-meta"><span class="hit-lib-idx">' + idxLabel(meta, g, i) + "</span>" + hotChip(g) +
      setStartHTML(skill, g) + "</div>" +
      '<div class="hit-lib-foot">' + (meta.prog ? "完成 " + st.done + "/" + st.total : stateLabel(st)) + "</div>" +
      '<div class="hit-lib-nums">' + nums + "</div></div>";
  }
  function libKept(skill, groups, records, hit) {
    var keep = [];
    groups.forEach(function (g, i) {
      if (hit && !hit(g)) return;
      if (libView.filter === "todo" && libStateOf(skill, g, records).cls === "done") return;
      if (libView.filter === "hot" && !g.hot) return;
      keep.push({ g: g, i: i });
    });
    return keep;
  }
  function libBody(skill, meta, keep, records) {
    var rows = keep.some(function (x) { return x.g.cells; });
    return '<div class="' + (rows ? "hit-lib-rows" : "hit-lib-grid") + '">' + keep.map(function (x) {
      return (rows ? rowHTML : cardHTML)(skill, meta, x.g, x.i, records);
    }).join("") + "</div>";
  }
  function filterHTML(groups) {
    var filters = LIB_FILTERS.filter(function (f) {
      return f.key !== "hot" || groups.some(function (g) { return g.hot; });
    });
    return '<div class="hit-filter" role="group" aria-label="题目筛选">' + filters.map(function (f) {
      return '<button type="button" data-filter="' + f.key + '"' +
        (libView.filter === f.key ? ' class="is-on" aria-pressed="true"' : ' aria-pressed="false"') + ">" + f.zh + "</button>";
    }).join("") + "</div>";
  }
  function panelHTML(skill, meta, groups, records) {
    var keep = libKept(skill, groups, records);
    var body = keep.length ? libBody(skill, meta, keep, records) :
      '<div class="hit-empty"><b>这个筛选下没有题目</b><p>切回「全部」看看其他题。</p></div>';
    return '<div class="hit-lib-panelhead"><h2 lang="en">' + esc(meta.head || meta.en) + "</h2>" + filterHTML(groups) + "</div>" + body;
  }
  // 搜索跨该科目全部题型：题目名只记得住中文或英文，不该先逼用户猜题型
  function libSearchHTML(skill, query, records) {
    var t = query.trim().toLocaleLowerCase();
    var parts = [];
    var total = 0;
    (LIB[skill] || []).forEach(function (meta) {
      var keep = libKept(skill, libGroups(skill, meta.type), records, function (g) {
        return [g.title, g.zh, g.code].join(" ").toLocaleLowerCase().indexOf(t) >= 0;
      });
      if (!keep.length) return;
      total += keep.length;
      parts.push('<h2 class="hit-lib-searchtype">' + esc(meta.zh) + '<span lang="en">' + esc(meta.en) + "</span></h2>" +
        libBody(skill, meta, keep, records));
    });
    var body = total ? parts.join("") :
      '<div class="hit-empty"><b>题库里没有「' + esc(query.trim()) + '」</b><p>换个关键词，或清空搜索框浏览全部题目。</p>' +
      '<button type="button" class="hit-go" data-clear>清空搜索</button></div>';
    return '<div class="hit-lib-panelhead"><h2>搜索「' + esc(query.trim()) + '」<span class="hit-lib-count">命中 ' +
      total + " 组</span></h2>" + filterHTML(libCatalog[skill] || []) + "</div>" + body;
  }
  function segHTML(skill) {
    return (LIB[skill] || []).map(function (m, i) {
      return '<button type="button" role="tab" data-type="' + m.type + '">' +
        '<span class="hit-lib-segnum">' + (i < 9 ? "0" : "") + (i + 1) + "</span>" +
        '<span class="hit-lib-segname"><strong lang="en">' + esc(m.en) + "</strong><small>" + esc(m.zh) + "</small></span></button>";
    }).join("");
  }
  function paintLib() {
    if (!libHost) return;
    var skill = libView.skill;
    var types = LIB[skill] || [];
    if (!libView.type || !types.some(function (m) { return m.type === libView.type; })) libView.type = types[0].type;
    var meta = libMeta(skill, libView.type);
    libHost.querySelectorAll("[data-skill]").forEach(function (b) {
      var on = b.getAttribute("data-skill") === skill;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
    });
    libHost.querySelectorAll("[data-type]").forEach(function (b) {
      var on = b.getAttribute("data-type") === libView.type && !libView.query.trim();
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
    });
    var panel = libHost.querySelector(".hit-lib-panel");
    var hc = LIB_HEAD[skill];
    libHost.querySelector(".hit-lib-head").innerHTML = '<p class="hit-kicker">' + hc.kicker + "</p><h1>" +
      hc.zh + '</h1><p class="hit-lead">' + hc.lead + "</p>";
    var searching = !!libView.query.trim();
    panel.setAttribute("aria-label", searching ? "搜索结果" : meta.zh);
    if (!libCatalog[skill]) {
      panel.innerHTML = '<p class="hit-lib-note">正在载入题库目录…</p>';
      return;
    }
    libView.records = doneMap();
    panel.innerHTML = searching ? libSearchHTML(skill, libView.query, libView.records) :
      panelHTML(skill, meta, libGroups(skill, libView.type), libView.records);
  }
  function loadCatalog(skill) {
    if (libCatalog[skill]) { paintLib(); return Promise.resolve(libCatalog[skill]); }
    return fetch("library/toefl/bank-catalog-" + skill + ".json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        libCatalog[skill] = (d && d.groups) || [];
        paintLib();
        return libCatalog[skill];
      })
      .catch(function () {
        libCatalog[skill] = [];
        paintLib();
        return [];
      });
  }
  function paintBankPapers(host, papers) {
    if (!papers || !papers.length) return;
    host.querySelector(".hit-lib-extra").innerHTML = '<h2 class="hit-minor-heading">老师组卷</h2><div class="hit-set-list">' +
      papers.map(function (p) {
        return '<a class="hit-set-row" href="bank.html?id=' + encodeURIComponent(p.id) + '"><div class="hit-set-info"><h4>' +
          esc(p.title || p.id) + "</h4><p>" + esc((p.makerName ? p.makerName + " · " : "") + "练习") + "</p></div></a>";
      }).join("") + "</div>";
  }
  function clearQuery() {
    libView.query = "";
    var el = libHost && libHost.querySelector('[name="query"]');
    if (el) el.value = "";
  }
  function paintPractice(host) {
    libHost = host;
    var q = new URLSearchParams(location.search).get("skill");
    if (LIB_SKILLS.indexOf(q) >= 0) libView.skill = q;
    host.innerHTML = '<section class="hit-lib">' +
      '<div class="hit-lib-head"></div>' +
      '<nav class="hit-lib-skills" role="tablist" aria-label="科目">' + LIB_SKILLS.map(function (s) {
        return '<button type="button" role="tab" data-skill="' + s + '">' + SKILL_ZH[s] +
          '<small lang="en">' + s.toUpperCase() + "</small></button>";
      }).join("") + "</nav>" +
      '<div class="hit-lib-seg" role="tablist" aria-label="题型">' + segHTML(libView.skill) + "</div>" +
      '<form class="hit-search" role="search"><label>搜索题目<input type="search" name="query" autocomplete="off" placeholder="输入中文或英文题目名称"></label></form>' +
      '<div class="hit-lib-panel" role="tabpanel"></div>' +
      '<div class="hit-lib-extra"></div></section>';
    host.addEventListener("click", function (ev) {
      var sk = ev.target.closest("[data-skill]");
      if (sk) {
        libView.skill = sk.getAttribute("data-skill");
        libView.type = "";
        clearQuery();
        libHost.querySelector(".hit-lib-seg").innerHTML = segHTML(libView.skill);
        try {
          var q = new URLSearchParams(location.search);
          q.set("skill", libView.skill);
          history.replaceState(null, "", "?" + q);
        } catch (e) {}
        loadCatalog(libView.skill);
        return;
      }
      var tp = ev.target.closest("[data-type]");
      if (tp) {
        libView.type = tp.getAttribute("data-type");
        paintLib();
        return;
      }
      var ft = ev.target.closest("[data-filter]");
      if (ft) {
        libView.filter = ft.getAttribute("data-filter");
        paintLib();
        return;
      }
      if (ev.target.closest("[data-clear]")) {
        clearQuery();
        paintLib();
      }
    });
    host.addEventListener("submit", function (ev) { ev.preventDefault(); });
    host.addEventListener("input", function (ev) {
      if (ev.target.name !== "query") return;
      libView.query = ev.target.value;
      paintLib();
    });
    paintLib();
    loadCatalog(libView.skill);
    var A = w.YYSD_APP;
    if (A && A.api) {
      A.api("/api/tiku/catalog?kind=practice").then(function (d) {
        paintBankPapers(host, d.catalog && d.catalog.papers);
      }).catch(function () {});
    }
  }

  function dayKey(t) {
    var d = new Date(t);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function stats() {
    var d = doneMap();
    var keys = Object.keys(d);
    var score = 0;
    var total = 0;
    var recs = [];
    var days = {};
    keys.forEach(function (k) {
      var rec = d[k] || {};
      if (rec.total) { score += Number(rec.score) || 0; total += Number(rec.total) || 0; }
      if (rec.at) days[dayKey(rec.at)] = 1;
      var parts = k.split("|");
      recs.push({
        at: rec.at || 0,
        skill: SKILL_ZH[parts[0]] || parts[0] || "—",
        set: String(parts[1] || "1").replace(/^set-/, ""),
        pct: rec.total ? Math.round((Number(rec.score) || 0) / rec.total * 100) + "%" : (rec.ok === false ? "—" : "ok")
      });
    });
    recs.sort(function (a, b) { return b.at - a.at; });
    var streak = 0;
    var cursor = new Date();
    for (;;) {
      if (!days[dayKey(cursor.getTime())]) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return {
      n: keys.length,
      avg: total ? Math.round(score / total * 100) + "%" : "—",
      streak: streak,
      recs: recs.slice(0, 6)
    };
  }

  function fmtWhen(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    return (d.getMonth() + 1) + "月" + d.getDate() + "日 " + p2(d.getHours()) + ":" + p2(d.getMinutes());
  }

  function paintProfile(host) {
    var A = w.YYSD_APP;
    var acc = null;
    function permHTML() {
      var row = function (name, label, ok) {
        return '<div class="hit-perm"><span>' + name + '</span><span class="' +
          (ok ? "hit-perm-on" : "hit-perm-off") + '">' + label + "</span></div>";
      };
      var practiceRow;
      if (acc && acc.staff) {
        practiceRow = row("真题题库", "已开通", true);
      } else if (acc && acc.failed) {
        practiceRow = row("真题题库", "查询失败", false);
      } else {
        var p = acc || { on: false, reason: "none" };
        var label = "未开通";
        if (p.on) label = p.expireAt ? fmtWhen(p.expireAt) + " 到期" : "已开通";
        else if (p.reason === "expired") label = "已到期";
        else if (p.reason === "scheduled") label = fmtWhen(p.startAt) + " 开启";
        else if (p.reason === "off") label = "已停用";
        practiceRow = row("真题题库", label, !!p.on);
      }
      return practiceRow + row("免费题库", "已开通", true);
    }
    function draw() {
      var u = A && A.user ? A.user() : {};
      var name = u.displayName || u.phone || "同学";
      var teacher = u.role === "teacher";
      var s = stats();
      var perms = permHTML();
      var rows = s.recs.length ? s.recs.map(function (r) {
        var when = r.at ? dayKey(r.at) : "—";
        var setLabel = /^\d+$/.test(r.set) ? "第 " + r.set + " 套" : "免费题库";
        return "<tr><td>" + when + "</td><td>" + r.skill + "</td><td>" + setLabel + '</td><td class="hit-score">' + r.pct + "</td></tr>";
      }).join("") : '<tr><td colspan="4">还没有记录。</td></tr>';
      var nameBlock = teacher
        ? '<div class="hit-profile-name">' + esc(name) + "</div>"
        : '<form class="hit-name-form" id="hit-name-form">' +
          '<input id="hit-display-name" maxlength="20" value="' + esc(u.displayName || "") +
          '" placeholder="用户名" aria-label="用户名" autocomplete="nickname">' +
          '<button type="submit" class="hit-save">保存</button></form>';
      host.innerHTML =
        '<div class="hit-profile">' +
          '<div class="hit-profile-card">' +
            '<label class="hit-avatar-edit">' + avatarBox(u, "is-lg") +
            '<input type="file" id="hit-avatar-file" class="hit-file-input" accept="image/jpeg,image/png,image/webp">' +
            '<span class="hit-avatar-hint">更换头像</span></label>' +
            nameBlock +
            '<p class="hit-profile-msg" id="hit-profile-msg" role="status" aria-live="polite"></p>' +
            '<div class="hit-profile-role">练习账号</div>' +
            '<div class="hit-perm-list">' + perms + "</div>" +
            '<div class="hit-profile-links">' +
              '<a href="soon.html?p=wordbook">生词本</a>' +
              '<a href="soon.html?p=history">练习记录</a>' +
            "</div>" +
          "</div>" +
          "<div>" +
            '<div class="hit-stat-grid">' +
              "<div class=\"hit-stat\"><strong>" + s.n + "</strong><span>已做题</span></div>" +
              "<div class=\"hit-stat\"><strong>" + s.avg + "</strong><span>平均正确率</span></div>" +
              "<div class=\"hit-stat\"><strong>—</strong><span>剩余模考</span></div>" +
              "<div class=\"hit-stat\"><strong>" + s.streak + "</strong><span>连续天数</span></div>" +
            "</div>" +
            '<div class="hit-profile-card">' +
              "<h3>最近练习</h3>" +
              '<table class="hit-table"><thead><tr><th>日期</th><th>科目</th><th>套卷</th><th>成绩</th></tr></thead><tbody>' +
              rows + "</tbody></table></div>" +
          "</div>" +
        "</div>";
      bindProfile(host);
    }
    function msg(text, ok) {
      var el = document.getElementById("hit-profile-msg");
      if (!el) return;
      el.textContent = text || "";
      el.className = "hit-profile-msg" + (text ? (ok ? " is-ok" : " is-err") : "");
    }
    function bindProfile() {
      var file = document.getElementById("hit-avatar-file");
      if (file) file.onchange = function () {
        var f = this.files && this.files[0];
        this.value = "";
        if (!f || !A || !A.uploadAvatar) return;
        msg("上传中…");
        A.uploadAvatar(f).then(function () {
          draw();
          refreshChrome();
          msg("头像已更新", true);
        }).catch(function (e) { msg(e.message || "上传失败"); });
      };
      var form = document.getElementById("hit-name-form");
      if (form) form.onsubmit = function (ev) {
        ev.preventDefault();
        var name = (document.getElementById("hit-display-name") || {}).value || "";
        name = String(name).trim();
        msg("");
        A.api("/api/auth/profile", { method: "PATCH", body: { displayName: name } })
          .then(function (d) {
            var u = d.user || {};
            A.setUser({ displayName: u.displayName || name, avatarUrl: u.avatarUrl || A.user().avatarUrl || "" });
            draw();
            refreshChrome();
            msg("用户名已保存", true);
          })
          .catch(function (e) { msg(e.message || "保存失败"); });
      };
    }
    draw();
    if (A && A.api) {
      A.api("/api/toefl/access").then(function (d) {
        var ac = d && d.access;
        acc = ac && ac.staff ? { staff: true } : ((ac && ac.practice) || null);
        draw();
      }).catch(function () {
        acc = { failed: true };
        draw();
      });
      A.api("/api/auth/me").then(function (d) {
        var u = d.user || {};
        A.setUser({
          displayName: u.displayName || u.name || "",
          avatarUrl: u.avatarUrl || "",
          role: u.role || ""
        });
        draw();
        refreshChrome();
      }).catch(function () {});
    }
  }

  function paintHome(host) {
    var A = w.YYSD_APP;
    var u = A && A.user ? A.user() : {};
    var name = u.displayName || u.phone || "";
    var s = stats();
    host.innerHTML =
      '<section class="hit-hero" aria-labelledby="home-heading"><div>' +
        '<p class="hit-greeting">欢迎回来' + (name ? "，" + esc(name) : "") + '</p>' +
        '<h1 id="home-heading">专注练习。<br><span>稳步向前。</span></h1>' +
        '<p class="hit-lead">选一套完整模考，或从一个题型开始。</p></div>' +
        '<aside class="hit-overview"><div class="hit-minor-heading"><h2>你的学习概览</h2><span>本机学习记录</span></div>' +
        '<dl class="hit-hero-stats"><div><dt>已完成练习</dt><dd>' + s.n + '<small>题</small></dd></div>' +
        '<div><dt>平均正确率</dt><dd>' + s.avg + '</dd></div>' +
        '<div><dt>连续学习</dt><dd>' + s.streak + '<small>天</small></dd></div></dl>' +
        '<a class="hit-resume" href="profile.html"><span><small>每次练习，都有记录</small><strong>查看你的学习进度</strong></span><span>学习记录 ↗</span></a></aside></section>' +
      '<section class="hit-study-modes" aria-label="选择学习方式">' +
        '<article class="hit-home-mock"><div><p class="hit-mode-label">Full-length practice</p><h2>全真模考</h2>' +
        '<p>阅读、听力、写作、口语。<br>在完整考试中，找到自己的节奏。</p>' +
        '<a class="hit-go" href="official.html">查看模考入口 <span aria-hidden="true">↗</span></a></div>' +
        '<div class="hit-mode-number">15<span>套完整模考</span></div></article>' +
        '<a class="hit-home-practice" href="free.html"><div><p class="hit-mode-label">Focused practice</p><h2>题库分类练习</h2>' +
        '<p>按科目、按题型，<br>把每一个薄弱点练扎实。</p></div><span class="hit-mode-bottom">进入题库 <span aria-hidden="true">↗</span></span></a></section>' +
      '<section class="hit-home-subjects"><div class="hit-section-heading"><h2>从一个科目开始</h2><span>专项练习，逐个突破</span></div>' +
        '<div class="hit-subject-strip">' + SUBJECTS.map(function (subject) {
          return '<a href="free.html?skill=' + subject.skill + '"><span>' + subject.zh + '<span aria-hidden="true">↗</span></span><h3 lang="en">' +
            subject.skill.charAt(0).toUpperCase() + subject.skill.slice(1) + '</h3><p>' + subject.chips.join(" / ") + '</p></a>';
        }).join("") + '</div></section>' +
      '<section class="hit-recent"><div class="hit-section-heading"><h2>最近练习</h2><a href="profile.html">查看记录 ↗</a></div>' +
        (s.recs.length ? s.recs.slice(0, 3).map(function (r) {
          return '<a class="hit-recent-row" href="profile.html"><span>' + esc(r.skill) + '</span><strong>' +
            (/^\d+$/.test(r.set) ? '第 ' + esc(r.set) + ' 套' : '免费题库') + '</strong><span>' +
            (r.at ? esc(dayKey(r.at)) : '—') + '</span><span>' + esc(r.pct) + '</span><span aria-hidden="true">↗</span></a>';
        }).join("") : '<div class="hit-empty"><b>从第一组练习开始</b><p>完成练习后，你的学习记录会显示在这里。</p></div>') + '</section>';
  }

  w.YYSD_HIT = {
    mount: mount,
    doneMap: doneMap,
    isDone: isDone,
    markDone: markDone,
    paintPractice: paintPractice,
    paintProfile: paintProfile,
    paintHome: paintHome
  };
})(window);
