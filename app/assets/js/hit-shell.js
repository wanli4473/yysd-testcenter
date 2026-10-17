/* ponytail: HIT hub shell — template nav, one row per set */
(function (w) {
  "use strict";
  var DONE = "yysd:app-toefl-done";
  var LINKS = [
    { href: "home.html", key: "home", zh: "首页" },
    { href: "practice.html", key: "practice", zh: "真题题库" },
    { href: "mock.html", key: "mock", zh: "考前冲刺包" },
    { href: "profile.html", key: "profile", zh: "个人" }
  ];
  var SUBJECTS = [
    { skill: "reading", href: "reading-lab.html", zh: "阅读", cls: "read",
      chips: ["单词填空", "日常阅读", "学术文章"], total: 30 },
    { skill: "listening", href: "listening-lab.html", zh: "听力", cls: "listen",
      chips: ["听句选回应", "对话", "讲座"], total: 210 },
    { skill: "speaking", href: "speaking-lab.html", zh: "口语", cls: "speak",
      chips: ["听力复述", "模拟面试"], total: 110 },
    { skill: "writing", href: "writing-lab.html", zh: "写作", cls: "write",
      chips: ["句子构建", "邮件", "学术讨论"], total: 120 }
  ];
  var SKILL_ZH = { reading: "阅读", listening: "听力", speaking: "口语", writing: "写作" };

  function parse(raw, fallback) {
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function doneMap() { return parse(w.localStorage.getItem(DONE) || "{}", {}) || {}; }
  // set 可为数字套号或字符串来源（如 free-<qid> 免费题库卷）
  function doneKey(skill, task, set) { return skill + "|" + (set == null || set === "" ? "1" : String(set)) + "|" + Number(task); }
  function legacyKey(skill, task) { return skill + "|" + Number(task); }
  function lookup(skill, task, set, records) {
    var d = records || doneMap();
    return d[doneKey(skill, task, set)] || ((Number(set || 1) === 1 && d[legacyKey(skill, task)]) || null);
  }
  function isDone(skill, task, set, records) { return !!lookup(skill, task, set, records); }
  function markDone(skill, task, rec) {
    var d = doneMap();
    d[doneKey(skill, task, rec && rec.set)] = rec || { at: Date.now() };
    w.localStorage.setItem(DONE, JSON.stringify(d));
  }
  function resultOf(skill, task, set) { return lookup(skill, task, set); }

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

  function examHref(page, it) {
    var href = page + "?set=" + encodeURIComponent(it.set || 1) + "&task=" + encodeURIComponent(it.task) + "&mode=practice";
    if (it.end != null) href += "&end=" + encodeURIComponent(it.end);
    return href;
  }

  var CAT = {
    reading: [
      { key: "complete_words", en: "Complete the Words", zh: "单词填空",
        items: [
          { set: 1, task: 0, title: "South Pacific History", titleZh: "南太平洋历史", meta: "10 blanks" },
          { set: 2, task: 0, title: "Tigers", titleZh: "老虎", meta: "10 blanks" }
        ] },
      { key: "daily_life", en: "Read in Daily Life", zh: "生活阅读",
        items: [
          { set: 1, task: 1, title: "Career Fair", titleZh: "招聘会", meta: "2 questions" },
          { set: 2, task: 1, title: "Introduction to Glassblowing", titleZh: "玻璃吹制入门", meta: "2 questions" }
        ] },
      { key: "academic", en: "Academic Passage", zh: "学术文章",
        items: [
          { set: 1, task: 2, title: "The Dynamics of Hollywood's Golden Age", titleZh: "好莱坞黄金时代", meta: "5 questions" },
          { set: 2, task: 2, title: "Augmented Reality in Training", titleZh: "增强现实培训", meta: "5 questions" }
        ] }
    ],
    listening: [
      { key: "choose_response", en: "Choose a Response", zh: "听句选回应",
        items: [
          { set: 1, task: 0, end: 11, title: "Choose a Response", meta: "12 questions" },
          { set: 2, task: 0, end: 11, title: "Choose a Response", meta: "12 questions" }
        ] },
      { key: "conversation", en: "Conversation", zh: "对话",
        items: [
          { set: 1, task: 12, end: 16, title: "Conversation", meta: "5 conversations" },
          { set: 2, task: 12, end: 16, title: "Conversation", meta: "5 conversations" }
        ] },
      { key: "announcement", en: "Announcement", zh: "通知",
        items: [
          { set: 1, task: 17, end: 19, title: "Announcement", meta: "3 announcements" },
          { set: 2, task: 17, end: 19, title: "Announcement", meta: "3 announcements" }
        ] },
      { key: "lecture", en: "Academic Talk", zh: "学术讲座",
        items: [
          { set: 1, task: 20, title: "Bicycle Turning and Inertia", titleZh: "自行车转弯与惯性", meta: "4 questions" },
          { set: 2, task: 20, title: "Lean Startup and MVP", titleZh: "精益创业与最小可行产品", meta: "4 questions" }
        ] }
    ],
    writing: [
      { key: "sentence", en: "Build a Sentence", zh: "句子构建",
        items: [
          { set: 1, task: 0, end: 9, title: "Build a Sentence", meta: "10 sentences" }
        ] },
      { key: "email", en: "Write an Email", zh: "邮件写作",
        items: [
          { set: 1, task: 10, title: "Printing Services", titleZh: "印刷服务", meta: "1 email" },
          { set: 2, task: 10, title: "Car Rental Feedback", titleZh: "租车反馈", meta: "1 email" }
        ] },
      { key: "discussion", en: "Academic Discussion", zh: "学术讨论",
        items: [
          { set: 1, task: 11, title: "The Driving Force of History", titleZh: "历史的推动力", meta: "1 discussion" },
          { set: 2, task: 11, title: "Brand Loyalty", titleZh: "品牌忠诚度", meta: "1 discussion" }
        ] }
    ],
    speaking: [
      { key: "repeat", en: "Listen and Repeat", zh: "听力复述",
        items: [
          { set: 1, task: 0, end: 6, title: "Gym", titleZh: "健身房", meta: "7 sentences" },
          { set: 2, task: 0, end: 6, title: "Wood Shop", titleZh: "木工坊", meta: "7 sentences" }
        ] },
      { key: "interview", en: "Take an Interview", zh: "模拟面试",
        items: [
          { set: 1, task: 7, end: 10, title: "Time Management", titleZh: "时间管理", meta: "4 questions" },
          { set: 2, task: 7, end: 10, title: "Transportation Habits", titleZh: "交通习惯", meta: "4 questions" }
        ] }
    ]
  };

  function spanOf(it) {
    var from = it.task != null ? Number(it.task) : 0;
    var end = it.end != null ? Number(it.end) : from;
    return { from: from, end: end, n: end - from + 1 };
  }

  function doneInSpan(skill, it, records) {
    var sp = spanOf(it);
    var d = records || doneMap();
    var n = 0;
    for (var i = sp.from; i <= sp.end; i++) if (isDone(skill, i, it.set, d)) n++;
    return n;
  }

  function filterLabItems(items, skill, status, query, records) {
    var text = query.trim().toLocaleLowerCase();
    var d = records || doneMap();
    return items.filter(function (it) {
      var done = doneInSpan(skill, it, d);
      var count = spanOf(it).n;
      return (status === "all" || (status === "todo" && !done) ||
        (status === "progress" && done > 0 && done < count) || (status === "done" && done >= count)) &&
        [it.title, it.titleZh, it.groupZh].join(" ").toLocaleLowerCase().indexOf(text) >= 0;
    });
  }

  function rowHTML(skill, page, it, records) {
    var sp = spanOf(it);
    var doneN = doneInSpan(skill, it, records);
    var st = doneN >= sp.n ? "已完成" : (doneN ? "进行中 " + doneN + "/" + sp.n : "未开始");
    var cls = doneN >= sp.n ? "is-done" : (doneN ? "is-mid" : "");
    var setLabel = "第 " + (it.set || 1) + " 套";
    var main = it.title || it.titleZh || setLabel;
    var meta = it.meta || (sp.n + " 题");
    var line = [it.titleZh, it.groupZh, meta].filter(Boolean).join(" / ");
    return '<a class="hit-set-row ' + cls + '" href="' + examHref(page, { set: it.set, task: sp.from, end: sp.end }) + '">' +
      '<span class="hit-set-num">' + esc(String(it.set || 1).padStart(2, "0")) + "</span>" +
      '<div class="hit-set-info"><h4>' + esc(main) + "</h4><p>" + esc(line) + "</p></div>" +
      '<span class="hit-set-st">' + st + '</span><span class="hit-row-arrow" aria-hidden="true">↗</span></a>';
  }

  var TABS = {
    reading: [
      { key: "complete_words", en: "Complete the Words", zh: "单词填空", type: "complete_words", meta: "10 空" },
      { key: "daily_life", en: "Read in Daily Life", zh: "生活阅读", type: "daily_life", meta: "2 题" },
      { key: "academic", en: "Academic Passage", zh: "学术文章", type: "academic", meta: "5 题" }
    ],
    listening: [
      { key: "choose_response", en: "Choose a Response", zh: "听句选回应", type: "choose_response", meta: "12 题" },
      { key: "conversation", en: "Conversation", zh: "对话", type: "conversation", meta: "5 段对话" },
      { key: "announcement", en: "Announcement", zh: "通知", type: "announcement", meta: "3 则通知" },
      { key: "lecture", en: "Academic Talk", zh: "学术讲座", type: "lecture", meta: "4 题" }
    ],
    writing: [
      { key: "sentence", en: "Build a Sentence", zh: "句子构建", type: "sentence", meta: "10 句" },
      { key: "email", en: "Write an Email", zh: "邮件写作", type: "email", meta: "1 封邮件" },
      { key: "discussion", en: "Academic Discussion", zh: "学术讨论", type: "discussion", meta: "1 篇讨论" }
    ],
    speaking: [
      { key: "repeat", en: "Listen and Repeat", zh: "听力复述", type: "repeat", meta: "7 句" },
      { key: "interview", en: "Take an Interview", zh: "模拟面试", type: "interview", meta: "4 题" }
    ]
  };

  function groupsFromPapers(skill, papers) {
    return (TABS[skill] || []).map(function (tab) {
      var items = [];
      papers.forEach(function (paper, i) {
        if (!paper || !paper.tasks) return;
        var set = Number(paper.set || i + 1);
        var idxs = [];
        paper.tasks.forEach(function (t, ti) {
          if (t.type === tab.type) idxs.push(ti);
        });
        if (!idxs.length) return;
        var t0 = paper.tasks[idxs[0]];
        var item = {
          set: set,
          task: idxs[0],
          end: idxs[idxs.length - 1],
          title: t0.title || tab.en,
          titleZh: t0.titleZh || tab.zh,
          meta: tab.meta || (idxs.length + " items")
        };
        // ponytail: grouped listen types are a set, not the first clip's title
        if (tab.type === "choose_response" || tab.type === "conversation" ||
            tab.type === "announcement" || tab.type === "sentence") {
          item.title = "Set " + set;
          item.titleZh = "第 " + set + " 套";
        }
        items.push(item);
      });
      return { key: tab.key, en: tab.en, zh: tab.zh, items: items };
    }).filter(function (g) { return g.items.length; });
  }

  function bindLab(skill, page, host) {
    var groups = CAT[skill] || [];
    var tab = "all";
    var status = "all";
    var query = "";
    var paintedGroups = null;
    host.innerHTML = '<div class="hit-library">' +
      '<aside class="hit-sidebar"><h2>练习科目</h2><nav aria-label="练习科目">' + SUBJECTS.map(function (s) {
        return '<a href="' + s.href + '"' + (s.skill === skill ? ' aria-current="page"' : '') +
          '><span><strong>' + s.zh + '</strong><small lang="en">' + s.skill.charAt(0).toUpperCase() + s.skill.slice(1) +
          '</small></span><span aria-hidden="true">↗</span></a>';
      }).join("") + '</nav><p>先选科目，再选题型。<br>交卷后查看答案与解析。</p><a class="hit-back" href="practice.html">← 返回真题题库</a></aside>' +
      '<section class="hit-library-results" aria-label="' + SKILL_ZH[skill] + '练习">' +
      '<div class="hit-row"><h2>' + SKILL_ZH[skill] + ' <small lang="en">' + skill.charAt(0).toUpperCase() + skill.slice(1) + '</small></h2></div>' +
      '<div class="hit-tabs" data-lab-tabs role="group" aria-label="筛选题型"></div>' +
      '<form class="hit-search" role="search"><label>搜索题目<input type="search" name="query" autocomplete="off" placeholder="输入中文或英文题目名称"></label>' +
      '<label>练习进度<select name="status"><option value="all">全部进度</option><option value="todo">未开始</option><option value="progress">进行中</option><option value="done">已完成</option></select></label></form>' +
      '<div class="hit-list-summary"><span data-lab-count role="status" aria-live="polite"></span><button type="button" class="hit-out" data-reset>重置筛选</button></div>' +
      '<div class="hit-list-columns" aria-hidden="true"><span>套号</span><span>练习内容</span><span>进度</span><span></span></div>' +
      '<div class="hit-set-list" data-lab-list></div></section></div>';
    var loads = [];
    for (var n = 1; n <= 10; n++) {
      loads.push(fetch("library/toefl/set-" + n + "-" + skill + ".json", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; }));
    }
    Promise.all(loads).then(function (papers) {
      var A = w.YYSD_APP;
      var apply = function (stockSets) {
        var filtered = papers.slice();
        if (stockSets && stockSets.length) {
          filtered = papers.map(function (p, i) {
            var set = Number((p && p.set) || i + 1);
            return stockSets.indexOf(set) >= 0 ? p : null;
          });
        }
        var live = groupsFromPapers(skill, filtered);
        if (live.length) {
          groups = live;
          if (!groups.some(function (g) { return g.key === tab; })) tab = "all";
        }
        paint();
      };
      if (A && A.api) {
        A.api("/api/tiku/catalog").then(function (d) {
          apply(d.catalog && d.catalog.stock && d.catalog.stock.sets);
        }).catch(function () { apply(null); });
      } else apply(null);
    });
    function paint() {
      var tabHost = host.querySelector("[data-lab-tabs]");
      if (paintedGroups !== groups) {
        var focused = tabHost.contains(document.activeElement) ? document.activeElement.getAttribute("data-tab") : null;
        var tabs = [{ key: "all", zh: "全部题型" }].concat(groups);
        tabHost.innerHTML = tabs.map(function (g) {
          return '<button type="button" data-tab="' + esc(g.key) + '">' + esc(g.zh) + '</button>';
        }).join("");
        paintedGroups = groups;
        if (focused) (tabHost.querySelector('[data-tab="' + focused + '"]') || tabHost.querySelector("button")).focus();
      }
      tabHost.querySelectorAll("[data-tab]").forEach(function (button) {
        var active = button.getAttribute("data-tab") === tab;
        button.classList.toggle("is-on", active);
        button.setAttribute("aria-pressed", String(active));
      });
      var items = [];
      groups.forEach(function (g) {
        if (tab !== "all" && tab !== g.key) return;
        (g.items || []).forEach(function (it) { items.push(Object.assign({}, it, { groupZh: g.zh })); });
      });
      var records = doneMap();
      items = filterLabItems(items, skill, status, query, records);
      host.querySelector("[data-lab-count]").textContent = "共 " + items.length + " 组练习";
      host.querySelector("[data-lab-list]").innerHTML = items.length ? items.map(function (it) {
        return rowHTML(skill, page, it, records);
      }).join("") : '<div class="hit-empty"><b>没有符合条件的练习</b><p>试试其他关键词，或清除筛选查看全部题目。</p><button type="button" class="hit-go" data-reset>清除筛选</button></div>';
    }
    host.addEventListener("click", function (ev) {
      var t = ev.target.closest("[data-tab]");
      if (t) {
        tab = t.getAttribute("data-tab");
        paint();
        host.querySelector('[data-tab="' + tab + '"]').focus();
      }
      if (ev.target.closest("[data-reset]")) {
        tab = "all"; status = "all"; query = "";
        host.querySelector('[name="query"]').value = "";
        host.querySelector('[name="status"]').value = "all";
        paint();
        host.querySelector('[name="query"]').focus();
      }
    });
    host.querySelector("form").addEventListener("submit", function (ev) { ev.preventDefault(); });
    host.querySelector('[name="query"]').addEventListener("input", function (ev) { query = ev.target.value; paint(); });
    host.querySelector('[name="status"]').addEventListener("change", function (ev) { status = ev.target.value; paint(); });
    paint();
  }

  function skillProgress(skill, total) {
    var d = doneMap();
    var n = 0;
    Object.keys(d).forEach(function (k) {
      if (k.indexOf(skill + "|") !== 0) return;
      if (!/^\d+$/.test(k.split("|")[1] || "")) return; // 免费题库记录不进练习进度
      n++;
    });
    return { n: n, total: total, pct: total ? Math.min(100, Math.round(n / total * 100)) : 0 };
  }

  function paintBankPapers(host, papers) {
    if (!papers || !papers.length) return;
    var box = document.createElement("div");
    box.innerHTML = '<h2 style="margin:1.4rem 0 .5rem">老师组卷</h2><div class="hit-set-list">' +
      papers.map(function (p) {
        return '<a class="hit-set-row" href="bank.html?id=' + encodeURIComponent(p.id) + '"><div class="hit-set-info"><h4>' +
          (p.title || p.id) + "</h4><p>" + (p.makerName ? p.makerName + " · " : "") + "练习</p></div></a>";
      }).join("") + "</div>";
    host.appendChild(box);
  }

  function paintPractice(host) {
    host.innerHTML = '<div class="hit-subject-grid">' + SUBJECTS.map(function (s) {
      var p = skillProgress(s.skill, s.total);
      return '<a class="hit-subject" href="' + s.href + '">' +
        '<div class="hit-subject-head"><span class="hit-subject-icon ' + s.cls + '" aria-hidden="true"></span>' +
        "<div><h3>" + s.zh + "</h3><span class=\"hit-sub\">" + s.chips.length + " 个模块</span></div></div>" +
        '<div class="hit-chips">' + s.chips.map(function (c) { return '<span class="hit-chip">' + c + "</span>"; }).join("") + "</div>" +
        '<div class="hit-prog"><div class="hit-prog-bar"><i style="width:' + p.pct + '%"></i></div>' +
        "<span>" + p.pct + "%</span></div></a>";
    }).join("") + "</div>";
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
        set: parts[1] || "1",
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
    resultOf: resultOf,
    bindLab: bindLab,
    examHref: examHref,
    paintPractice: paintPractice,
    paintProfile: paintProfile,
    paintHome: paintHome,
    CAT: CAT
  };
})(window);
