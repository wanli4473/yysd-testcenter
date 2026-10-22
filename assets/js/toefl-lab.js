/* ponytail: one store + clip helper for lab list and ETS bookmark */
(function (w) {
  "use strict";

  var FAV_KEY = "yysd:toefl-favs";
  // 一套本地键：三套旧键只做一次性只读迁移，旧键不删也不再写
  var STATE_KEY = "yysd:toefl-item-state";
  var LEGACY = { done: "yysd:toefl-lab-done", res: "yysd:toefl-lab-results", app: "yysd:app-toefl-done" };

  var TYPES = {
    reading: [
      { key: "complete_words", label: "填词" },
      { key: "daily_life", label: "日常" },
      { key: "academic", label: "学术" }
    ],
    listening: [
      { key: "choose_response", label: "01 Choose a Response 听句选回应" },
      { key: "conversation", label: "02 Conversation 对话" },
      { key: "announcement", label: "03 Announcement 通知" },
      { key: "lecture", label: "04 Academic Talk 讲座" }
    ],
    writing: [
      { key: "sentence", label: "组句" },
      { key: "email", label: "邮件" },
      { key: "discussion", label: "讨论" }
    ],
    speaking: [
      { key: "repeat", label: "听后复述" },
      { key: "interview", label: "面试" }
    ]
  };
  var SKILLS = [
    { key: "reading", label: "阅读" },
    { key: "listening", label: "听力" },
    { key: "writing", label: "写作" },
    { key: "speaking", label: "口语" }
  ];
  var PAGES = {
    reading: "toefl-reading.html",
    listening: "toefl-listening.html",
    writing: "toefl-writing.html",
    speaking: "toefl-speaking.html"
  };
  var FILTERS = [
    { key: "all", label: "全部" },
    { key: "todo", label: "未做" },
    { key: "hot", label: "高频" },
    { key: "fav", label: "已收藏" }
  ];
  var FILTERS_LISTEN = [
    { key: "all", label: "全部" },
    { key: "todo", label: "未做" }
  ];

  function parse(raw, fallback) {
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function favs() {
    var d = parse(w.localStorage.getItem(FAV_KEY) || "", null);
    if (!d || !Array.isArray(d.tasks)) d = { tasks: [], items: [] };
    if (!Array.isArray(d.items)) d.items = [];
    return d;
  }
  function saveFavs(d) { w.localStorage.setItem(FAV_KEY, JSON.stringify(d)); }
  function canon(skill, set, taskIndex) {
    var s = String(set == null || set === "" ? "set-1" : set);
    if (/^\d+$/.test(s)) s = "set-" + s;
    return skill + "|" + s + "|" + Number(taskIndex);
  }
  function migrate() {
    var out = {};
    var res = parse(w.localStorage.getItem(LEGACY.res) || "{}", {}) || {};
    Object.keys(res).forEach(function (k) { out[k] = res[k]; });
    var done = parse(w.localStorage.getItem(LEGACY.done) || "{}", {}) || {};
    Object.keys(done).forEach(function (k) { if (!out[k]) out[k] = { at: 0 }; });
    var app = parse(w.localStorage.getItem(LEGACY.app) || "{}", {}) || {};
    Object.keys(app).forEach(function (k) {
      var p = k.split("|");
      if (p.length < 2) return;
      var key = p.length === 2 ? canon(p[0], "set-1", p[1]) : canon(p[0], p[1], p[2]);
      out[key] = Object.assign({}, app[k] || {}, out[key] || {});
    });
    w.localStorage.setItem(STATE_KEY, JSON.stringify(out));
    return out;
  }
  function state() {
    var raw = w.localStorage.getItem(STATE_KEY);
    return raw === null ? migrate() : parse(raw, {}) || {};
  }
  function writeState(map) { w.localStorage.setItem(STATE_KEY, JSON.stringify(map)); }
  function markState(skill, set, taskIndex, rec) {
    var m = state();
    m[canon(skill, set, taskIndex)] = rec || { at: Date.now() };
    writeState(m);
  }
  function doneMap() { return state(); }
  function doneKey(skill, paperId, taskIndex) {
    return canon(skill, paperId, taskIndex);
  }
  function sameTask(a, skill, paperId, taskIndex) {
    return a.skill === skill && a.paperId === paperId && Number(a.taskIndex) === Number(taskIndex);
  }
  function sameItem(a, skill, paperId, taskIndex, no) {
    return sameTask(a, skill, paperId, taskIndex) && String(a.no) === String(no);
  }
  function inCard(x, card) {
    var i = Number(x.taskIndex);
    return x.skill === card.skill && x.paperId === card.paperId && i >= card.taskIndex && i <= card.taskEnd;
  }

  function isDone(card) { return !!doneMap()[doneKey(card.skill, card.paperId, card.taskIndex)]; }
  function markDone(skill, paperId, taskIndex) {
    var m = doneMap();
    m[doneKey(skill, paperId, taskIndex)] = { at: Date.now() };
    writeState(m);
  }
  function markSessionDone(skill, paperId, paper, taskStart, taskEnd, type) {
    var tasks = (paper && paper.tasks) || [];
    if (type) {
      tasks.forEach(function (t, i) { if (t.type === type) markDone(skill, paperId, i); });
      return;
    }
    var a = taskStart === "" || taskStart == null ? 0 : Number(taskStart);
    var b = taskStart === "" || taskStart == null
      ? tasks.length - 1
      : (taskEnd === "" || taskEnd == null ? a : Number(taskEnd));
    for (var i = a; i <= b; i++) markDone(skill, paperId, i);
  }

  function resultsMap() { return state(); }
  function resultKey(skill, paperId, taskIndex) {
    return canon(skill, paperId, taskIndex);
  }
  function findTaskIndex(paper, no) {
    var tasks = (paper && paper.tasks) || [];
    var n = String(no);
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.type === "complete_words" && (t.passage || []).some(function (x) { return x && String(x.id) === n; })) return i;
      if ((t.questions || []).some(function (q) { return String(q.id) === n; })) return i;
      if (t.id != null && String(t.id) === n) return i;
    }
    return -1;
  }
  function saveScore(skill, paperId, paper, detail) {
    if (!detail || !detail.length) return;
    var map = resultsMap();
    detail.forEach(function (d) {
      var idx = findTaskIndex(paper, d.id);
      if (idx < 0) return;
      var k = resultKey(skill, paperId, idx);
      if (!map[k]) map[k] = { items: [], at: Date.now() };
      if (!Array.isArray(map[k].items)) map[k].items = [];
      map[k].items = map[k].items.filter(function (x) { return String(x.no) !== String(d.id); });
      map[k].items.push({ no: d.id, ok: !!d.ok, ua: d.ua || "", expect: d.expect || "" });
      map[k].at = Date.now();
    });
    writeState(map);
  }
  function saveSpeakingResults(skill, paperId, paper, screens, recs) {
    var map = resultsMap();
    var tasks = (paper && paper.tasks) || [];
    (screens || []).forEach(function (s) {
      var idx = tasks.indexOf(s.task);
      if (idx < 0) return;
      var rec = recs && recs[s.task.id];
      map[resultKey(skill, paperId, idx)] = {
        items: [{ no: s.task.id, ok: !!(rec && rec.blob), ua: rec && rec.blob ? "recorded" : "", expect: "recorded" }],
        at: Date.now()
      };
    });
    writeState(map);
  }
  /* 模考历史：一次交卷追加一条 attempt，MyBest 按科取最高档，不回写旧记录 */
  var ATT_KEY = "yysd:toefl-attempts";
  var SID = Date.now();
  function attempts() {
    var list = parse(w.localStorage.getItem(ATT_KEY) || "[]", []) || [];
    return Array.isArray(list) ? list : [];
  }
  function logAttempt(skill, paperId, title, r) {
    if (!r || !r.total) return null;
    var detail = r.detail || [];
    var correct = 0, blank = 0;
    detail.forEach(function (d) {
      if (d.ok) correct += 1;
      if (!String(d.ua == null ? "" : d.ua).trim()) blank += 1;
    });
    var F = w.YYSD_TOEFL_FULL;
    var entry = {
      sid: (F && F.currentSid && F.currentSid()) || SID, at: Date.now(),
      skill: skill, paperId: paperId, title: title || "",
      correct: correct, wrong: detail.length - correct - blank, blank: blank,
      total: detail.length, band: r.band
    };
    var list = attempts();
    list.push(entry);
    try { w.localStorage.setItem(ATT_KEY, JSON.stringify(list.slice(-200))); } catch (e) {}
    return entry;
  }
  function bestAttempts() {
    var out = {};
    attempts().forEach(function (a) {
      if (!a || a.band == null) return;
      if (!out[a.skill] || a.band > out[a.skill].band) out[a.skill] = a;
    });
    return out;
  }
  function cardResults(card) {
    var map = resultsMap();
    var items = [];
    for (var i = card.taskIndex; i <= card.taskEnd; i++) {
      var row = map[resultKey(card.skill, card.paperId, i)];
      if (row && row.items) items = items.concat(row.items);
    }
    var ok = 0;
    items.forEach(function (x) { if (x.ok) ok += 1; });
    var total = (card.itemNos && card.itemNos.length) || items.length;
    return { items: items, ok: ok, done: items.length, total: total, attempted: items.length > 0 };
  }
  function setResults(cards) {
    var ok = 0, done = 0, total = 0, items = [];
    (cards || []).forEach(function (c) {
      var s = cardResults(c);
      ok += s.ok; done += s.done; total += s.total; items = items.concat(s.items);
    });
    return { items: items, ok: ok, done: done, total: total, attempted: done > 0 };
  }

  function isFavTask(skill, paperId, taskIndex) {
    return favs().tasks.some(function (x) { return sameTask(x, skill, paperId, taskIndex); });
  }
  function isFavItem(skill, paperId, taskIndex, no) {
    return favs().items.some(function (x) { return sameItem(x, skill, paperId, taskIndex, no); });
  }
  function isFavCard(card) {
    var d = favs();
    return d.tasks.some(function (x) { return inCard(x, card); }) ||
      d.items.some(function (x) { return inCard(x, card); });
  }
  function toggleFavTask(skill, paperId, taskIndex, taskEnd) {
    var d = favs();
    if (isFavTask(skill, paperId, taskIndex)) {
      d.tasks = d.tasks.filter(function (x) { return !sameTask(x, skill, paperId, taskIndex); });
    } else {
      d.tasks.push({ skill: skill, paperId: paperId, taskIndex: Number(taskIndex), taskEnd: taskEnd == null ? Number(taskIndex) : Number(taskEnd) });
    }
    saveFavs(d);
  }
  function toggleFavItem(skill, paperId, taskIndex, no) {
    var d = favs();
    if (isFavItem(skill, paperId, taskIndex, no)) {
      d.items = d.items.filter(function (x) { return !sameItem(x, skill, paperId, taskIndex, no); });
    } else {
      d.items.push({ skill: skill, paperId: paperId, taskIndex: Number(taskIndex), no: no });
    }
    saveFavs(d);
  }
  function favJumpQ(card) {
    var hit = favs().items.filter(function (x) { return inCard(x, card); })[0];
    return hit ? hit.no : "";
  }

  function slicePaper(paper, taskStart, taskEnd, type) {
    if (!paper) return paper;
    var tasks = paper.tasks || [];
    if (type) tasks = tasks.filter(function (t) { return t.type === type; });
    else if (taskStart !== "" && taskStart != null) {
      var a = Number(taskStart);
      var b = taskEnd === "" || taskEnd == null ? a : Number(taskEnd);
      tasks = tasks.slice(a, b + 1);
    }
    return { tasks: tasks, modules: paper.modules, title: paper.title, id: paper.id };
  }
  function cursorOf(paper, screens, si, labClip, taskQ, taskEndQ) {
    var scr = screens[si];
    if (!scr) return {};
    var idx = ((paper && paper.tasks) || []).indexOf(scr.task);
    var hideItem = !scr.q && scr.nos && scr.nos.length > 1;
    var no = scr.q ? scr.q.id : (hideItem ? null : (scr.nos && scr.nos[0]));
    return {
      taskIndex: labClip ? Number(taskQ) : idx,
      taskEnd: labClip && taskEndQ !== "" && taskEndQ != null ? Number(taskEndQ) : idx,
      no: no,
      hideItem: hideItem
    };
  }
  function clipScreens(paper, screens, taskStart, taskEnd, type) {
    var out = screens || [];
    if (type) out = out.filter(function (s) { return s.task && s.task.type === type; });
    if (taskStart === "" || taskStart == null) return out;
    var a = Number(taskStart);
    var b = taskEnd === "" || taskEnd == null ? a : Number(taskEnd);
    var tasks = (paper && paper.tasks) || [];
    return out.filter(function (s) {
      var idx = tasks.indexOf(s.task);
      return idx >= a && idx <= b;
    });
  }
  function modulesOf(screens) {
    var seen = {};
    (screens || []).forEach(function (s) { if (s.module != null) seen[s.module] = 1; });
    return Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
  }
  function firstModule(screens) { return modulesOf(screens)[0] || 1; }
  function moduleBase(screens, mod) {
    var base;
    (screens || []).forEach(function (s) {
      if (s.module === mod && (base == null || s.from < base)) base = s.from;
    });
    return base == null ? 1 : base;
  }
  function localQ(screens, scr, n) {
    return (n != null ? n : scr.from) - moduleBase(screens, scr.module) + 1;
  }
  function localQRange(screens, scr) {
    var a = localQ(screens, scr, scr.from);
    var b = localQ(screens, scr, scr.to);
    return a === b ? String(a) : (a + "–" + b);
  }
  function qLabel(screens, scr) {
    var range = localQRange(screens, scr);
    var total = 0;
    (screens || []).forEach(function (s) {
      if (scr && s.module !== scr.module) return;
      total += (s.nos && s.nos.length) || 1;
    });
    return (range.indexOf("–") >= 0 ? "Questions " : "Question ") + range + " of " + total;
  }
  function nextModule(screens, current) {
    var mods = modulesOf(screens);
    for (var i = 0; i < mods.length; i++) if (mods[i] > current) return mods[i];
    return 0;
  }
  function screenIndexForQ(screens, q) {
    if (q == null || q === "") return 0;
    var n = String(q);
    for (var i = 0; i < screens.length; i++) {
      var nos = screens[i].nos || [];
      for (var j = 0; j < nos.length; j++) if (String(nos[j]) === n) return i;
      if (String(screens[i].from) === n) return i;
    }
    return 0;
  }

  var paintFav = null;
  function bindBar(ctx) {
    var taskBtn = document.getElementById("fav-task-btn");
    var itemBtn = document.getElementById("fav-item-btn");
    paintFav = function () {
      var cur = ctx.getCursor ? ctx.getCursor() : {};
      var tIdx = cur.taskIndex != null ? cur.taskIndex : ctx.taskStart;
      var tOn = tIdx != null && tIdx !== "" && isFavTask(ctx.skill, ctx.paperId, tIdx);
      var iOn = cur.no != null && cur.no !== "" && isFavItem(ctx.skill, ctx.paperId, tIdx, cur.no);
      if (taskBtn) {
        taskBtn.textContent = tOn ? "Bookmarked" : "Bookmark";
        taskBtn.classList.toggle("is-on", tOn);
      }
      if (itemBtn) {
        var showItem = cur.no != null && cur.no !== "" && !cur.hideItem;
        itemBtn.classList.toggle("hidden", !showItem);
        itemBtn.textContent = iOn ? "Question Saved" : "Bookmark Question";
        itemBtn.classList.toggle("is-on", iOn);
      }
    };
    if (taskBtn) {
      taskBtn.onclick = function () {
        var cur = ctx.getCursor ? ctx.getCursor() : {};
        var tIdx = cur.taskIndex != null ? cur.taskIndex : Number(ctx.taskStart || 0);
        toggleFavTask(ctx.skill, ctx.paperId, tIdx, cur.taskEnd != null ? cur.taskEnd : tIdx);
        paintFav();
      };
    }
    if (itemBtn) {
      itemBtn.onclick = function () {
        var cur = ctx.getCursor ? ctx.getCursor() : {};
        if (cur.no == null || cur.no === "") return;
        var tIdx = cur.taskIndex != null ? cur.taskIndex : Number(ctx.taskStart || 0);
        toggleFavItem(ctx.skill, ctx.paperId, tIdx, cur.no);
        paintFav();
      };
    }
  }

  function typeLabel(skill, type) {
    var row = (TYPES[skill] || []).filter(function (t) { return t.key === type; })[0];
    return row ? row.label : type;
  }
  function hrefOf(card, mode) {
    var u = PAGES[card.skill] + "?id=" + encodeURIComponent(card.paperId) +
      "&mode=" + (mode || "practice") +
      "&task=" + encodeURIComponent(card.taskIndex);
    if (card.taskEnd != null && card.taskEnd !== card.taskIndex) u += "&taskEnd=" + encodeURIComponent(card.taskEnd);
    var q = favJumpQ(card);
    if (q !== "" && q != null) u += "&q=" + encodeURIComponent(q);
    return u;
  }
  function hrefSet(skill, paperId, type, mode) {
    return PAGES[skill] + "?id=" + encodeURIComponent(paperId) +
      "&mode=" + (mode || "practice") +
      "&type=" + encodeURIComponent(type);
  }
  function displayTitle(it) {
    var en = it.titleEn || it.title || "";
    var zh = it.titleZh || "";
    if (zh && zh !== en) return en + " / " + zh;
    return en;
  }

  w.YYSD_TOEFL_LAB = {
    TYPES: TYPES,
    SKILLS: SKILLS,
    state: state,
    canon: canon,
    doneKey: doneKey,
    markDone: markDone,
    markState: markState,
    resultsMap: resultsMap,
    FILTERS: FILTERS,
    FILTERS_LISTEN: FILTERS_LISTEN,
    PAGES: PAGES,
    typeLabel: typeLabel,
    hrefOf: hrefOf,
    hrefSet: hrefSet,
    displayTitle: displayTitle,
    isDone: isDone,
    isFavCard: isFavCard,
    markSessionDone: markSessionDone,
    saveScore: saveScore,
    logAttempt: logAttempt,
    attempts: attempts,
    bestAttempts: bestAttempts,
    saveSpeakingResults: saveSpeakingResults,
    cardResults: cardResults,
    setResults: setResults,
    clipScreens: clipScreens,
    slicePaper: slicePaper,
    cursorOf: cursorOf,
    firstModule: firstModule,
    moduleBase: moduleBase,
    localQ: localQ,
    localQRange: localQRange,
    qLabel: qLabel,
    nextModule: nextModule,
    screenIndexForQ: screenIndexForQ,
    bindBar: bindBar,
    get paintFav() { return paintFav; }
  };
})(window);
