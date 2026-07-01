/* =========================================================================
   config.js — shared taxonomy + helpers for 优益思达学习中心
   Loaded by the landing page, zone pages, the viewer and results page.
   ========================================================================= */
window.YYSD = (function () {
  "use strict";

  // Homepage display order: 学习区 → 练习区 → 模考区
  var ZONES = ["study", "practice", "mock"];

  var ZONE = {
    study:    { label: "学习区", en: "Study", icon: "📚",
                desc: "语法、单词系统精讲，边学边测，打牢基础。" },
    practice: { label: "练习区", en: "Practice", icon: "✏️",
                desc: "长难句、听力精听等专项训练，针对性提分。" },
    mock:     { label: "模考区", en: "Mock Tests", icon: "🎯",
                desc: "雅思 / A-Level / AP / 托福 / SAT 全真真题，计时模考、自动批改。" }
  };

  // ordered subjects per zone (leaf keys used by the manifest / folder classification)
  var ZONE_SUBJECTS = {
    study:    ["grammar", "vocab", "vocab-cet4",
               "vocab-special-listening", "vocab-special-reading", "vocab-special-writing"],
    practice: ["changnanju", "jingting", "ielts"],
    mock:     ["cambridge-listening", "cambridge-reading", "ielts",
               "ielts-speaking", "ielts-writing", "alevel", "ap", "toefl", "sat"]
  };

  var SUBJECT = {
    "cambridge-listening": { label: "听力", en: "Listening", color: "var(--c-cambridge-listening)" },
    "cambridge-reading":   { label: "阅读", en: "Reading", color: "var(--c-cambridge-reading)" },
    "cambridge-writing":   { label: "写作", en: "Writing", color: "var(--c-cambridge-reading)" },
    "ielts-speaking":      { label: "口语", en: "Speaking", color: "var(--c-ielts)" },
    "ielts-writing":       { label: "写作", en: "Writing", color: "var(--c-ielts)" },
    cambridge: { label: "剑桥真题", en: "Cambridge", color: "var(--c-cambridge)" },
    ielts:   { label: "雅思真题", en: "IELTS", color: "var(--c-ielts)" },
    alevel:  { label: "A-Level 真题", en: "A-Level", color: "var(--c-pte)" },
    ap:      { label: "AP 真题", en: "AP", color: "var(--c-toefl)" },
    toefl:   { label: "托福真题", en: "TOEFL", color: "var(--c-toefl)" },
    sat:     { label: "SAT 真题", en: "SAT", color: "var(--c-grammar)" },
    grammar: { label: "语法", en: "Grammar", color: "var(--c-grammar)" },
    vocab:   { label: "高中词汇", en: "Vocabulary", color: "var(--c-vocab)" },
    "vocab-cet4":    { label: "四级词汇", en: "CET-4", color: "var(--c-vocab)" },
    "vocab-special-listening": { label: "听力专项词汇", en: "Listening Words", color: "var(--c-cambridge-listening)" },
    "vocab-special-reading":   { label: "阅读高频词汇", en: "Reading Words", color: "var(--c-cambridge-reading)" },
    "vocab-special-writing":   { label: "写作短语", en: "Writing Phrases", color: "var(--c-cambridge-reading)" },
    changnanju: { label: "长难句", en: "Complex Sentences", color: "var(--c-zone-practice)" },
    jingting:   { label: "听力精听", en: "Intensive Listening", color: "var(--c-zone-practice)" }
  };

  // Display tree for homepage + zone pages (mirrors the course-centre diagram).
  // Each leaf maps to a manifest `subject`; categories may have `children`.
  var NAV = {
    study: [
      { key: "grammar", label: "语法", subject: "grammar" },
      { key: "vocab", label: "单词", children: [
        { label: "高中词汇", subject: "vocab" },
        { label: "四级词汇", subject: "vocab-cet4" },
        { key: "vocab-special", label: "专项词汇", children: [
          { label: "听力专项词汇", subject: "vocab-special-listening" },
          { label: "阅读高频词汇", subject: "vocab-special-reading" },
          { label: "写作短语", subject: "vocab-special-writing" }
        ] }
      ] }
    ],
    practice: [
      { key: "changnanju", label: "长难句", subject: "changnanju" },
      { key: "jingting", label: "听力精听", subject: "jingting" }
    ],
    mock: [
      { key: "ielts", label: "雅思真题", subject: "ielts", children: [
        { label: "听力", subject: "cambridge-listening" },
        { label: "阅读", subject: "cambridge-reading" },
        { label: "口语", subject: "ielts-speaking" },
        { label: "写作", subject: "cambridge-writing" }
      ] },
      { key: "alevel", label: "A-Level 真题", subject: "alevel" },
      { key: "ap", label: "AP 真题", subject: "ap" },
      { key: "toefl", label: "托福真题", subject: "toefl" },
      { key: "sat", label: "SAT 真题", subject: "sat" }
    ]
  };
  function navOf(zone) { return NAV[zone] || []; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function results() {
    try { return JSON.parse(localStorage.getItem("yysd:results") || "{}"); }
    catch (e) { return {}; }
  }

  // Resolve the manifest path relative to the current page (root or /admin etc.)
  function manifestUrl() {
    // pages at root use "library/...", pages one level deep use "../library/..."
    return (location.pathname.replace(/\/[^/]*$/, "/").endsWith("/admin/") ? "../" : "")
      + "library/manifest.json";
  }

  function load() {
    return fetch(manifestUrl(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("manifest.json HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      var items = (d && (d.items || d.exams)) || [];   // accept old key too
      items.sort(function (a, b) { return String(b.added || "").localeCompare(String(a.added || "")); });
      return items;
    });
  }

  function subjectsOf(zone) { return ZONE_SUBJECTS[zone] || []; }

  function fileHref(item, prefix) {
    return (prefix || "") + "exam.html?id=" + encodeURIComponent(item.id);
  }

  // Render one content card. prefix = path prefix to root pages (e.g. "" or "../")
  function cardHTML(item, prefix) {
    var subj = SUBJECT[item.subject] || { label: "其他", color: "var(--text-muted)" };
    var done = results()[item.id];
    var isStudy = item.zone === "study";
    var meta = isStudy
      ? '<span>📖 学习材料</span>'
      : '<span>⏱️ ' + (item.duration ? item.duration + " 分钟" : "不限时") + '</span>';
    var doneText = done
      ? '已完成' + (done.score != null ? ' · ' + done.score + (done.total ? "/" + done.total : "") : "")
        + (done.band != null ? ' · Band ' + done.band : "")
      : "";
    var cta = isStudy ? "开始学习 →" : (item.zone === "mock" ? "进入考场 →" : "开始练习 →");

    return '' +
      '<a class="exam-card ' + (done ? "is-done" : "") + '" href="' + fileHref(item, prefix) + '">' +
        '<span class="done-flag">' + esc(doneText) + '</span>' +
        '<div class="exam-card__top">' +
          '<span class="badge badge--' + esc(item.subject) + '">' + esc(subj.label) + '</span>' +
          '<span class="tag-cat">' + esc((ZONE[item.zone] || {}).label || "") + '</span>' +
        '</div>' +
        '<h3>' + esc(item.title) + '</h3>' +
        '<p>' + esc(item.description || "点击进入，按要求完成本份内容。") + '</p>' +
        '<div class="exam-card__meta">' + meta +
          (item.added ? '<span>📅 ' + esc(item.added) + '</span>' : '') +
        '</div>' +
        '<div class="exam-card__foot">' +
          '<span class="btn btn--primary btn--sm" style="pointer-events:none">' + cta + '</span>' +
        '</div>' +
      '</a>';
  }

  // ---- Vocabulary book grouping (学习区单词 → vocab.html?book=…) ----
  var VOCAB_BOOKS = {
    gaozhong: { key: "gaozhong", label: "高中词汇", subject: "vocab", tag: "雅思基础", chunk: 10 },
    cet4:     { key: "cet4",     label: "四级词汇", subject: "vocab-cet4", tag: "CET-4", chunk: 10 },
    special:  {
      key: "special", label: "专项词汇", tag: "专题",
      subjects: ["vocab-special-listening", "vocab-special-reading", "vocab-special-writing"]
    }
  };

  function isVocabListSubject(subject) {
    return subject === "vocab" || subject === "vocab-cet4";
  }

  function isVocabSpecial(subject) {
    return String(subject || "").indexOf("vocab-special-") === 0;
  }

  function vocabListNo(item) {
    var t = String((item && item.title) || "");
    var m = t.match(/LIST\s*0*(\d+)/i);
    if (m) return Number(m[1]);
    m = String((item && item.id) || "").match(/list\s*0*(\d+)/i);
    return m ? Number(m[1]) : 0;
  }

  function vocabBookStats(items, bookKey) {
    var book = VOCAB_BOOKS[bookKey];
    if (!book) return null;
    var lists = [];
    if (book.subject) {
      lists = (items || []).filter(function (it) { return it.subject === book.subject; });
    } else if (book.subjects) {
      lists = (items || []).filter(function (it) { return book.subjects.indexOf(it.subject) >= 0; });
    }
    lists.sort(function (a, b) {
      var d = vocabListNo(a) - vocabListNo(b);
      return d || String(a.title).localeCompare(String(b.title), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
    });
    return { book: book, total: lists.length, lists: lists };
  }

  function vocabProgress(lists) {
    var res = results();
    var done = 0, last = null, lastNo = 0;
    (lists || []).forEach(function (it) {
      if (!res[it.id]) return;
      done++;
      var n = vocabListNo(it);
      if (n >= lastNo) { lastNo = n; last = it; }
    });
    var sorted = (lists || []).slice().sort(function (a, b) { return vocabListNo(a) - vocabListNo(b); });
    var next = null, i;
    for (i = 0; i < sorted.length; i++) {
      if (vocabListNo(sorted[i]) > lastNo && !res[sorted[i].id]) { next = sorted[i]; break; }
    }
    if (!next) {
      for (i = 0; i < sorted.length; i++) {
        if (!res[sorted[i].id]) { next = sorted[i]; break; }
      }
    }
    if (!next && sorted.length) next = sorted[0];
    return { done: done, total: sorted.length, last: last, next: next };
  }

  function vocabListRanges(lists, chunkSize) {
    var nums = (lists || []).map(vocabListNo).filter(function (n) { return n > 0; });
    if (!nums.length) return [{ id: "all", label: "全部", start: 0, end: 9999 }];
    var max = Math.max.apply(null, nums);
    var chunk = chunkSize || 10;
    var ranges = [];
    for (var start = 1; start <= max; start += chunk) {
      var end = Math.min(start + chunk - 1, max);
      ranges.push({ id: start + "-" + end, label: "LIST " + start + "–" + end, start: start, end: end });
    }
    return ranges;
  }

  function vocabBooksForZone(items) {
    return ["gaozhong", "cet4", "special"].map(function (k) {
      return vocabBookStats(items, k);
    }).filter(function (s) { return s && s.total > 0; });
  }

  function vocabBookCardHTML(stats, prefix) {
    var book = stats.book;
    var prog = vocabProgress(stats.lists);
    var unit = book.subject ? " LIST" : " 份";
    var cnt = stats.total + unit;
    var progTxt = prog.done ? ("已学 " + prog.done + "/" + stats.total) : cnt;
    var badge = book.key === "gaozhong" ? "GZ" : (book.key === "cet4" ? "4" : "SP");
    var bookIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M8 4v13a3 3 0 0 0 3 3h9V7a3 3 0 0 0-3-3H8Z" stroke="currentColor" stroke-width="2"/></svg>';
    return '' +
      '<a class="vol-card vol-card--vocab" href="' + (prefix || "") + 'vocab.html?book=' + encodeURIComponent(book.key) + '">' +
        '<div class="vol-card__top">' +
          '<span class="vol-card__vol">' + esc(badge) + '</span>' +
          '<span class="vol-card__tag vol-card__tag--mid">' + esc(book.tag) + '</span>' +
        '</div>' +
        '<div class="vol-card__body">' +
          '<span class="vol-card__ico vol-card__ico--vocab">' + bookIcon + '</span>' +
          '<div><h3>' + esc(book.label) + '</h3>' +
          '<div class="vol-card__cnt">' + esc(progTxt) + '</div></div>' +
        '</div>' +
        '<div class="vol-card__foot">' +
          '<span class="vol-card__skills"><span class="vc-skill vc-skill--a">词</span></span>' +
          '<span class="vol-card__go">进入 ›</span>' +
        '</div>' +
      '</a>';
  }

  // ---- Cambridge series grouping (模考区 shows one card per volume) ----
  function isCambridge(subject) {
    return subject === "cambridge-listening" || subject === "cambridge-reading" || subject === "cambridge-writing";
  }

  // Pull the volume number (e.g. "15") out of a title like "剑桥雅思15 · Test 1（听力）".
  function camVolume(item) {
    var m = String((item && item.title) || "").match(/剑(?:桥雅思)?\s*0*(\d+)/);
    return m ? m[1] : "";
  }

  // Summarise cambridge items into [{vol, listening, reading, total}], newest volume first.
  // Pull the test number out of a title like "… · Test 1（听力）".
  function camTestNo(item) {
    var m = String((item && item.title) || "").match(/Test\s*0*(\d+)/i);
    return m ? m[1] : "";
  }

  function camVolumes(items) {
    var map = {};
    (items || []).forEach(function (it) {
      if (!isCambridge(it.subject)) return;
      var v = camVolume(it); if (!v) return;
      if (!map[v]) map[v] = { vol: v, listening: 0, reading: 0, writing: 0, total: 0, _tests: {} };
      if (it.subject === "cambridge-reading") map[v].reading++;
      else if (it.subject === "cambridge-writing") map[v].writing++;
      else map[v].listening++;
      map[v].total++;
      var t = camTestNo(it); if (t) map[v]._tests[t] = 1;
    });
    return Object.keys(map)
      .sort(function (a, b) { return Number(b) - Number(a); })
      .map(function (k) { var o = map[k]; o.tests = Object.keys(o._tests).length || o.total; delete o._tests; return o; });
  }

  // Tag a volume by recency (cosmetic, like the mockup's 最新/进阶/基础).
  function camVolTag(vol) {
    var n = Number(vol);
    if (n >= 19) return { t: "最新", c: "new" };
    if (n >= 13) return { t: "进阶", c: "mid" };
    return { t: "基础", c: "base" };
  }

  // One volume card (clean VOL.NN style) → opens cambridge.html?vol=N
  function camVolumeCardHTML(v, prefix) {
    var tag = camVolTag(v.vol);
    var bookIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M4.5 5.5c2.6 0 4.8.5 6.5 1.6v11.4c-1.7-1.1-3.9-1.6-6.5-1.6V5.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M19.5 5.5c-2.6 0-4.8.5-6.5 1.6v11.4c1.7-1.1 3.9-1.6 6.5-1.6V5.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M12 7.1v11.4" stroke="currentColor" stroke-width="2"/></svg>';
    var skills = '<span class="vc-skill vc-skill--a">A</span><span class="vc-skill vc-skill--b">B</span><span class="vc-skill vc-skill--u">◯</span>';
    return '' +
      '<a class="vol-card" href="' + (prefix || "") + 'cambridge.html?vol=' + encodeURIComponent(v.vol) + '">' +
        '<div class="vol-card__top">' +
          '<span class="vol-card__vol">VOL.' + esc(v.vol) + '</span>' +
          '<span class="vol-card__tag vol-card__tag--' + tag.c + '">' + tag.t + '</span>' +
        '</div>' +
        '<div class="vol-card__body">' +
          '<span class="vol-card__ico">' + bookIcon + '</span>' +
          '<div><h3>剑桥雅思 ' + esc(v.vol) + '</h3>' +
          '<div class="vol-card__cnt">包含 ' + v.tests + ' 套</div></div>' +
        '</div>' +
        '<div class="vol-card__foot">' +
          '<span class="vol-card__skills">' + skills + '</span>' +
          '<span class="vol-card__go">开始练习 ›</span>' +
        '</div>' +
      '</a>';
  }

  // Count manifest items per subject (within an optional zone).
  function countsBySubject(items, zone) {
    var m = {};
    (items || []).forEach(function (it) {
      if (zone && it.zone !== zone) return;
      m[it.subject] = (m[it.subject] || 0) + 1;
    });
    return m;
  }

  return {
    ZONES: ZONES, ZONE: ZONE, ZONE_SUBJECTS: ZONE_SUBJECTS, SUBJECT: SUBJECT,
    NAV: NAV, navOf: navOf,
    esc: esc, results: results, load: load, subjectsOf: subjectsOf,
    fileHref: fileHref, cardHTML: cardHTML, countsBySubject: countsBySubject,
    isCambridge: isCambridge, camVolume: camVolume, camTestNo: camTestNo, camVolumes: camVolumes,
    camVolumeCardHTML: camVolumeCardHTML,
    VOCAB_BOOKS: VOCAB_BOOKS, isVocabListSubject: isVocabListSubject, isVocabSpecial: isVocabSpecial,
    vocabListNo: vocabListNo, vocabBookStats: vocabBookStats, vocabProgress: vocabProgress,
    vocabListRanges: vocabListRanges, vocabBooksForZone: vocabBooksForZone, vocabBookCardHTML: vocabBookCardHTML
  };
})();
