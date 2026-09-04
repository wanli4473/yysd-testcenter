/* =========================================================================
   config.js — shared taxonomy + helpers for 优益思达学习中心
   Loaded by the landing page, zone pages, the viewer and results page.
   ========================================================================= */
window.YYSD = (function () {
  "use strict";

  // Bump when library HTML changes so exam iframe skips stale browser cache.
  var CONTENT_VER = "20260904fix1";
  var WRONG_WORDS_KEY = "yysd:wrong-words";
  var SAVED_WORDS_KEY = "yysd:saved-words";

  // Homepage display order: 单词区 → 练习区 → 真题区
  var ZONES = ["study", "practice", "mock"];

  var ZONE = {
    study:    { label: "单词区", en: "Words", icon: "📚",
                desc: "词书、错题本与 AI 查词，边学边测，打牢基础。" },
    practice: { label: "练习区", en: "Practice", icon: "✏️",
                desc: "长难句、数字听写等专项训练，针对性提分。" },
    mock:     { label: "雅思真题", en: "IELTS Past Papers", icon: "🎯",
                desc: "剑桥雅思听力 / 阅读 / 写作历年真题，在线练习。" }
  };

  // ordered subjects per zone (leaf keys used by the manifest / folder classification)
  var ZONE_SUBJECTS = {
    study:    ["grammar", "vocab", "vocab-cet4", "vocab-cet4-lite",
               "vocab-special-listening", "vocab-special-reading", "vocab-special-writing",
               "vocab-themes"],
    practice: ["changnanju", "shuzi-tingxie", "ielts-speaking", "ielts"],
    mock:     ["cambridge-listening", "cambridge-reading", "cambridge-writing", "ielts",
               "ielts-speaking", "ielts-writing", "jingting"]
  };

  var SUBJECT = {
    "cambridge-listening": { label: "听力", en: "Listening", color: "var(--c-cambridge-listening)" },
    "cambridge-reading":   { label: "阅读", en: "Reading", color: "var(--c-cambridge-reading)" },
    "cambridge-writing":   { label: "写作", en: "Writing", color: "var(--c-writing)" },
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
    "vocab-cet4-lite": { label: "四级词汇（精简版）", en: "CET-4 Compact", color: "var(--c-vocab)" },
    "vocab-special-listening": { label: "听力专项词汇", en: "Listening Words", color: "var(--c-cambridge-listening)" },
    "vocab-special-reading":   { label: "阅读专项词汇", en: "Reading Words", color: "var(--c-cambridge-reading)" },
    "vocab-special-writing":   { label: "写作专项词汇", en: "Writing Vocabulary", color: "var(--c-writing)" },
    "vocab-themes": { label: "分类词库", en: "Thematic Vocab", color: "var(--c-vocab)" },
    changnanju: { label: "长难句", en: "Complex Sentences", color: "var(--c-zone-practice)" },
    "shuzi-tingxie": { label: "数字听写", en: "Number Dictation", color: "var(--c-zone-practice)" },
    jingting:   { label: "听力精听", en: "Intensive Listening", color: "var(--c-listening)" }
  };

  // Display tree for homepage + zone pages (mirrors the course-centre diagram).
  // Each leaf maps to a manifest `subject`; categories may have `children`.
  var NAV = {
    study: [
      { key: "vocab", label: "单词", children: [
        { label: "高中词汇", subject: "vocab" },
        { label: "四级词汇", subject: "vocab-cet4" },
        { label: "四级词汇（精简版）", subject: "vocab-cet4-lite" },
        { key: "vocab-special", label: "雅思专项词汇", children: [
          { label: "听力专项词汇", subject: "vocab-special-listening" },
          { label: "阅读专项词汇", subject: "vocab-special-reading" },
          { label: "写作专项词汇", subject: "vocab-special-writing" }
        ] },
        { label: "分类词库", subject: "vocab-themes", href: "vocab-shelf.html?view=catalog" }
      ] }
    ],
    practice: [
      { key: "changnanju", label: "长难句", subject: "changnanju" },
      { key: "shuzi-tingxie", label: "数字听写", subject: "shuzi-tingxie" },
      { key: "ielts-speaking", label: "雅思口语", subject: "ielts-speaking" }
    ],
    mock: [
      { key: "listening", label: "听力", subject: "cambridge-listening", desc: "听力真题顺序练习", skill: "listening",
        links: [
          { label: "听力真题顺序练习", href: "zone.html?zone=mock&s=listening" },
          { label: "听力真题精听", href: "zone.html?zone=mock&s=jingting" }
        ] },
      { key: "reading", label: "阅读", subject: "cambridge-reading", desc: "阅读真题顺序练习", skill: "reading" },
      { key: "speaking", label: "口语", subject: "ielts-speaking", desc: "AI口语练习/模考", href: "speaking.html" },
      { key: "writing", label: "写作", subject: "cambridge-writing", desc: "写作真题顺序练习", skill: "writing",
        links: [
          { label: "写作真题顺序练习", href: "zone.html?zone=mock&s=writing" },
          { label: "AI写作批改", href: "ai-tutor.html?track=writing" }
        ] },
      { key: "mock", label: "模考", subject: "ielts", desc: "剑桥套题模考" },
      // ponytail: under 听力 links only — excluded from hub columns/chips in zone.js
      { key: "jingting", label: "听力精听", subject: "jingting", desc: "听力真题精听" }
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

  function wrongWordsStore() {
    try { return JSON.parse(localStorage.getItem(WRONG_WORDS_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function vocabBookOfSubject(subject) {
    if (subject === "vocab") return "gaozhong";
    if (subject === "vocab-cet4") return "cet4";
    if (subject === "vocab-cet4-lite") return "cet4-lite";
    if (isVocabSpecial(subject)) return "special";
    return null;
  }

  function wrongWords(book) {
    var bucket = wrongWordsStore()[book] || {};
    return Object.keys(bucket).map(function (k) { return bucket[k]; })
      .sort(function (a, b) { return String(b.lastWrongAt || "").localeCompare(String(a.lastWrongAt || "")); });
  }

  function wrongWordCount(book) {
    return Object.keys(wrongWordsStore()[book] || {}).length;
  }

  function mergeWrongWords(book, words, source) {
    if (!book || !words || !words.length) return 0;
    var store = wrongWordsStore();
    if (!store[book]) store[book] = {};
    var bucket = store[book];
    var now = new Date().toISOString();
    var n = 0;
    words.forEach(function (w) {
      var key = String(w.word || "").toLowerCase();
      if (!key) return;
      if (!bucket[key]) {
        bucket[key] = {
          word: w.word, ipa: w.ipa || "", meaning: w.meaning || "",
          acceptCN: w.acceptCN || [], sources: [], wrongCount: 0,
          lastWrongAt: now, lastAttempt: null
        };
      }
      var entry = bucket[key];
      entry.wrongCount = (entry.wrongCount || 0) + 1;
      entry.lastWrongAt = now;
      entry.lastAttempt = {
        userSpelling: w.userSpelling || "",
        userMeaning: w.userMeaning || "",
        spellingCorrect: !!w.spellingCorrect,
        meaningCorrect: !!w.meaningCorrect
      };
      if (w.acceptCN && w.acceptCN.length) entry.acceptCN = w.acceptCN;
      if (source && source.id) {
        var seen = entry.sources.some(function (s) { return s.id === source.id; });
        if (!seen) entry.sources.push({ id: source.id, title: source.title || "", subject: source.subject || "" });
      }
      n++;
    });
    try { localStorage.setItem(WRONG_WORDS_KEY, JSON.stringify(store)); } catch (e) {}
    return n;
  }

  function removeWrongWord(book, wordKey) {
    var store = wrongWordsStore();
    if (!store[book]) return;
    delete store[book][String(wordKey || "").toLowerCase()];
    try { localStorage.setItem(WRONG_WORDS_KEY, JSON.stringify(store)); } catch (e) {}
  }

  function clearWrongWords(book) {
    var store = wrongWordsStore();
    delete store[book];
    try { localStorage.setItem(WRONG_WORDS_KEY, JSON.stringify(store)); } catch (e) {}
  }

  function savedWordsStore() {
    try { return JSON.parse(localStorage.getItem(SAVED_WORDS_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function savedWords() {
    var store = savedWordsStore();
    return Object.keys(store).map(function (k) { return store[k]; })
      .sort(function (a, b) { return String(b.savedAt || "").localeCompare(String(a.savedAt || "")); });
  }

  function savedWordCount() {
    return Object.keys(savedWordsStore()).length;
  }

  function addSavedWord(entry) {
    var word = String((entry && entry.word) || "").trim();
    if (!word) return false;
    var key = word.toLowerCase();
    var store = savedWordsStore();
    var now = new Date().toISOString();
    if (store[key]) {
      store[key].ipa = entry.ipa || store[key].ipa || "";
      store[key].meaning = entry.meaning || store[key].meaning || "";
      store[key].note = entry.note || store[key].note || "";
      store[key].savedAt = now;
    } else {
      store[key] = {
        word: word,
        ipa: (entry && entry.ipa) || "",
        meaning: (entry && entry.meaning) || "",
        note: (entry && entry.note) || "",
        savedAt: now
      };
    }
    try { localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(store)); } catch (e) { return false; }
    return true;
  }

  function removeSavedWord(wordKey) {
    var store = savedWordsStore();
    delete store[String(wordKey || "").toLowerCase()];
    try { localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(store)); } catch (e) {}
  }

  function clearSavedWords() {
    try { localStorage.removeItem(SAVED_WORDS_KEY); } catch (e) {}
  }

  function savedWordsStripHTML(prefix) {
    var p = prefix || "";
    var n = savedWordCount();
    return '<div class="wrong-notebook-strip" aria-label="生词本">' +
      '<div class="wrong-notebook-strip__head"><h3>生词本</h3>' +
      '<span class="wrong-notebook-strip__hint">AI 查词后可一键收藏，便于复习</span></div>' +
      '<div class="wrong-notebook-strip__grid">' +
        '<a class="wrong-notebook-card' + (n ? " has-items" : "") + '" href="' + p + 'saved-words.html">' +
          '<span class="wrong-notebook-card__ico" aria-hidden="true">📘</span>' +
          '<span class="wrong-notebook-card__body">' +
            '<b>AI 生词本</b>' +
            '<span>' + (n ? n + " 个生词待复习" : "暂无生词，查词后可加入") + "</span>" +
          "</span>" +
          (n ? '<span class="wrong-notebook-card__badge">' + n + "</span>" : '<span class="wrong-notebook-card__go">进入 ›</span>') +
        "</a>" +
      "</div></div>";
  }

  function wrongWordsStripHTML(prefix) {
    var p = prefix || "";
    var n = ["gaozhong", "cet4", "cet4-lite", "special"].reduce(function (sum, k) {
      return sum + (wrongWordCount(k) || 0);
    }, 0);
    return '<div class="wrong-notebook-strip" aria-label="单词错题本">' +
      '<div class="wrong-notebook-strip__head"><h3>单词错题本</h3>' +
      '<span class="wrong-notebook-strip__hint">检测错词按场次收录 · 日期 + 词书 + List</span></div>' +
      '<div class="wrong-notebook-strip__grid">' +
        '<a class="wrong-notebook-card' + (n ? " has-items" : "") + '" href="' + p + 'wrong-words.html">' +
          '<span class="wrong-notebook-card__ico" aria-hidden="true">📕</span>' +
          '<span class="wrong-notebook-card__body">' +
            "<b>统一错题本</b>" +
            "<span>" + (n ? n + " 个本机旧错词待同步/复习" : "完成单词检测后自动收录") + "</span>" +
          "</span>" +
          (n ? '<span class="wrong-notebook-card__badge">' + n + "</span>" : '<span class="wrong-notebook-card__go">进入 ›</span>') +
        "</a>" +
      "</div></div>";
  }

  // Resolve the manifest path relative to the current page (root or /admin etc.)
  function manifestUrl() {
    // pages at root use "library/...", pages one level deep use "../library/..."
    return (location.pathname.replace(/\/[^/]*$/, "/").endsWith("/admin/") ? "../" : "")
      + "library/manifest.json?v=" + encodeURIComponent(CONTENT_VER);
  }

  var _manifestPromise;
  var _taxPromises = {};
  var _taxById = {};

  function rememberTaxonomy(data) {
    if (!data) return data;
    (data.groups || []).concat(data.parts || []).forEach(function (row) {
      if (row && row.id) _taxById[row.id] = row;
    });
    return data;
  }

  function drillKindLabel(id) {
    var row = _taxById[String(id || "")];
    if (!row) return "";
    var bits = [];
    if (row.qType) bits.push("题型：" + row.qType);
    if (row.scene) bits.push("场景：" + row.scene);
    return bits.join(" · ");
  }

  function loadTaxonomyJson(file) {
    if (_taxPromises[file]) return _taxPromises[file];
    _taxPromises[file] = fetch(manifestUrl().replace("manifest.json", file)).then(function (r) {
      if (!r.ok) throw new Error(file + " HTTP " + r.status);
      return r.json();
    }).then(rememberTaxonomy).catch(function (err) {
      _taxPromises[file] = null;
      throw err;
    });
    return _taxPromises[file];
  }

  function loadListeningTaxonomy() {
    return loadTaxonomyJson("listening-taxonomy.json");
  }

  function loadReadingTaxonomy() {
    return loadTaxonomyJson("reading-taxonomy.json");
  }

  function load() {
    if (_manifestPromise) return _manifestPromise;
    _manifestPromise = fetch(manifestUrl()).then(function (r) {
      if (!r.ok) throw new Error("manifest.json HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      var items = (d && (d.items || d.exams)) || [];   // accept old key too
      items.sort(function (a, b) { return String(b.added || "").localeCompare(String(a.added || "")); });
      return items;
    }).catch(function (err) {
      _manifestPromise = null;
      throw err;
    });
    return _manifestPromise;
  }

  function subjectsOf(zone) { return ZONE_SUBJECTS[zone] || []; }

  function fileHref(item, prefix) {
    // ponytail: lyric 精听直链播放器，不套 exam iframe
    if (item && item.directHref) return (prefix || "") + item.directHref;
    return (prefix || "") + "exam.html?id=" + encodeURIComponent(item.id);
  }

  /** Immersive vocab lesson player (Duolingo-style short lesson). */
  function vocabLessonHref(item, prefix) {
    if (!item || !item.id) return (prefix || "") + "vocab-lesson.html";
    return (prefix || "") + "vocab-lesson.html?id=" + encodeURIComponent(item.id);
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
    var cta = isStudy ? "开始学习 →"
      : (item.subject === "jingting" ? "开始精听 →"
        : (item.zone === "mock" ? "进入考场 →" : "开始练习 →"));

    return '' +
      '<a class="exam-card ' + (done ? "is-done" : "") + '" href="' + fileHref(item, prefix) + '">' +
        '<span class="done-flag">' + esc(doneText) + '</span>' +
        '<div class="exam-card__top">' +
          '<span class="badge badge--' + esc(item.subject) + '">' + esc(subj.label) + '</span>' +
          '<span class="tag-cat">' + esc((ZONE[item.zone] || {}).label || "") + '</span>' +
        '</div>' +
        '<h3>' + esc(displayTitle(item)) + '</h3>' +
        '<p>' + esc(item.description || "点击进入，按要求完成本份内容。") + '</p>' +
        '<div class="exam-card__meta">' + meta +
          (item.added ? '<span>📅 ' + esc(item.added) + '</span>' : '') +
        '</div>' +
        '<div class="exam-card__foot">' +
          '<span class="btn btn--primary btn--sm" style="pointer-events:none">' + cta + '</span>' +
        '</div>' +
      '</a>';
  }

  // ---- Vocabulary book grouping (单词区 → vocab-shelf.html?book=…) ----
  var VOCAB_BOOKS = {
    gaozhong: { key: "gaozhong", label: "高中词汇", subject: "vocab", tag: "雅思基础", chunk: 10 },
    cet4: {
      key: "cet4", label: "四级词汇", subject: "vocab-cet4", tag: "CET-4", chunk: 10,
      // ponytail: frequency bands replace 10-unit chunks for cet4 hub tabs
      bands: [
        { id: "high", label: "高频", start: 1, end: 10 },
        { id: "mid", label: "中频", start: 11, end: 20 },
        { id: "low", label: "低频", start: 21, end: 28 },
        { id: "zero", label: "零频", start: 29, end: 35 }
      ]
    },
    "cet4-lite": {
      key: "cet4-lite", label: "四级词汇（精简版）", subject: "vocab-cet4-lite", tag: "CET-4 精简", chunk: 10
    },
    special:  {
      key: "special", label: "雅思专项词汇", tag: "专题",
      subjects: ["vocab-special-listening", "vocab-special-reading", "vocab-special-writing"]
    }
    // ponytail: themes live in shelf catalog (vocab-shelf.html?view=catalog)
  };

  function isVocabListSubject(subject) {
    return subject === "vocab" || subject === "vocab-cet4" || subject === "vocab-cet4-lite";
  }

  function isVocabSpecial(subject) {
    return String(subject || "").indexOf("vocab-special-") === 0;
  }

  function needsVocabBridge(subject) {
    return isVocabListSubject(subject) || isVocabSpecial(subject);
  }

  function vocabListNo(item) {
    var t = String((item && item.title) || "");
    var m = t.match(/LIST\s*0*(\d+)/i);
    if (m) return Number(m[1]);
    m = t.match(/单元\s*0*(\d+)/);
    if (m) return Number(m[1]);
    m = t.match(/第\s*0*(\d+)\s*篇/);
    if (m) return Number(m[1]);
    m = String((item && item.id) || "").match(/(?:writing|listening|reading)-vocab-0*(\d+)/i);
    if (m) return Number(m[1]);
    m = String((item && item.file) || "").match(/theme-0*(\d+)/i);
    if (m) return Number(m[1]);
    m = String((item && item.id) || "").match(/theme-0*(\d+)/i);
    if (m) return Number(m[1]);
    m = String((item && item.file) || "").match(/(?:LIST|list|vocab-)0*(\d+)/i);
    return m ? Number(m[1]) : 0;
  }

  // Clear catalog titles for search + UI (manifest keeps raw LIST titles).
  function vocabDisplayTitle(item) {
    var n = vocabListNo(item);
    var s = (item && item.subject) || "";
    if (!n) return (item && item.title) || "";
    if (s === "vocab") return "高中词汇单元" + n;
    if (s === "vocab-cet4") return "单元 " + n;
    if (s === "vocab-cet4-lite") return "精简 List " + n;
    if (s === "vocab-special-listening") return "听力词汇单元" + n;
    if (s === "vocab-special-reading") return "阅读词汇单元" + n;
    if (s === "vocab-special-writing") return "写作词汇单元" + n;
    if (isVocabSpecial(s)) return "雅思词汇单元" + n;
    return (item && item.title) || "";
  }

  function displayTitle(item) {
    if (!item) return "";
    if (isVocabListSubject(item.subject) || isVocabSpecial(item.subject)) {
      return vocabDisplayTitle(item);
    }
    return item.title || "";
  }

  // Assignable part ids: cambridge-20-test-1-s1 / cambridge-20-test-1-reading-p1 / secret-set-1-reading-p1
  function parsePartId(id) {
    var m = String(id || "").match(/^(cambridge-\d+-test-\d+(?:-reading)?|secret-set-\d+-reading)-(s|p)(\d+)$/i);
    if (!m) return null;
    return { parentId: m[1], kind: m[2].toLowerCase(), num: Number(m[3]) };
  }

  // 题型练习: cambridge-21-test-1-s1-q1-6 / cambridge-21-test-1-reading-p1-q1-7 / secret-set-1-reading-p1-q1-13
  function parseGroupId(id) {
    var m = String(id || "").match(/^(cambridge-\d+-test-\d+(?:-reading)?|secret-set-\d+-reading)-(s|p)(\d+)-q(\d+)-(\d+)$/i);
    if (!m) return null;
    return { parentId: m[1], kind: m[2].toLowerCase(), num: Number(m[3]), qFrom: Number(m[4]), qTo: Number(m[5]) };
  }

  // Calendar / dashboard: Cambridge L/R/W (full or part) → CDT chrome query
  // cdtPack from teacher assign: drill | exam | "" (infer)
  function cambridgeCdtQs(itemId, linkedIds, cdtPack) {
    var id = String(itemId || "");
    if (!/^(cambridge-\d+-test-\d+(-reading(-p\d+(-q\d+-\d+)?)?|-writing|-s\d+(-q\d+-\d+)?)?|secret-set-\d+(-reading(-p\d+(-q\d+-\d+)?)?|-s\d+(-q\d+-\d+)?)?)$/.test(id)) return "";
    var base = "";
    if (/^cambridge-\d+-test-\d+$/.test(id) || /^secret-set-\d+$/.test(id)) base = id;
    else {
      var m = id.match(/^(cambridge-\d+-test-\d+|secret-set-\d+)(?:-reading(?:-p\d+(?:-q\d+-\d+)?)?|-writing|-s\d+(?:-q\d+-\d+)?)$/);
      if (m) base = m[1];
    }
    var ids = linkedIds || [];
    if (base && ids.indexOf(base) >= 0 &&
        ids.indexOf(base + "-reading") >= 0 &&
        ids.indexOf(base + "-writing") >= 0) {
      return "&cdt=1&pack=exam&suite=1";
    }
    var pack = String(cdtPack || "").toLowerCase();
    if (pack === "exam") return "&cdt=1&pack=exam";
    return "&cdt=1&pack=drill";
  }

  function makePartItem(parent, kind, num) {
    if (!parent || !num) return null;
    var label = kind === "s" ? ("Section " + num) : ("Passage " + num);
    var base = String(parent.title || "").replace(/（[^）]*）\s*$/, "").replace(/\s+$/, "");
    return Object.assign({}, parent, {
      id: parent.id + "-" + kind + num,
      title: base + " · " + label,
      partKind: kind,
      partNum: num,
      parentId: parent.id,
      duration: kind === "s" ? 10 : 20
    });
  }

  function makeGroupItem(parent, num, qFrom, qTo) {
    if (!parent || !num || !qFrom || !qTo) return null;
    var kind = parent.subject === "cambridge-reading" ? "p" : "s";
    var part = makePartItem(parent, kind, num);
    if (!part) return null;
    part.id = parent.id + "-" + kind + num + "-q" + qFrom + "-" + qTo;
    part.title = part.title + " Q" + qFrom + "–" + qTo;
    part.qFrom = qFrom;
    part.qTo = qTo;
    return part;
  }

  function resolveItem(items, id) {
    var list = items || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    var group = parseGroupId(id);
    if (group) {
      var gParent = null;
      for (var gi = 0; gi < list.length; gi++) {
        if (list[gi].id === group.parentId) { gParent = list[gi]; break; }
      }
      return gParent ? makeGroupItem(gParent, group.num, group.qFrom, group.qTo) : null;
    }
    var part = parsePartId(id);
    if (!part) return null;
    var parent = null;
    for (var j = 0; j < list.length; j++) {
      if (list[j].id === part.parentId) { parent = list[j]; break; }
    }
    return parent ? makePartItem(parent, part.kind, part.num) : null;
  }

  // Teacher assignment picker: full paper + each listening section / reading passage
  function expandAssignableParts(items) {
    var out = [];
    (items || []).forEach(function (it) {
      out.push(it);
      if (it.subject === "cambridge-listening") {
        for (var s = 1; s <= 4; s++) out.push(makePartItem(it, "s", s));
      } else if (it.subject === "cambridge-reading") {
        for (var p = 1; p <= 3; p++) out.push(makePartItem(it, "p", p));
      }
    });
    return out;
  }

  function partSearchText(item) {
    if (!item || !item.partNum) return "";
    var v = camVolume(item);
    var t = camTestNo(item);
    var k = item.partKind === "s" ? "s" : "p";
    var skill = item.subject === "cambridge-listening" ? "听力" : "阅读";
    return [
      "c" + v, "c" + v + skill,
      "t" + t + k + item.partNum,
      "t" + t + (item.partKind === "s" ? "section" : "passage") + item.partNum,
      (item.partKind === "s" ? "section" : "passage") + item.partNum,
      skill + "t" + t + k + item.partNum
    ].join(" ");
  }

  // Topic after "·" for special units (secondary line only).
  function vocabTopic(item) {
    var t = String((item && item.title) || "");
    var m = t.match(/[·•]\s*(.+)$/);
    return m ? m[1].replace(/\s*-\s*.*$/, "").trim() : "";
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
      if (book.subjects) {
        var ai = book.subjects.indexOf(a.subject);
        var bi = book.subjects.indexOf(b.subject);
        if (ai !== bi) return ai - bi;
      }
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
      ranges.push({ id: start + "-" + end, label: "单元 " + start + "–" + end, start: start, end: end });
    }
    return ranges;
  }

  function vocabBooksForZone(items) {
    return ["gaozhong", "cet4", "cet4-lite", "special"].map(function (k) {
      return vocabBookStats(items, k);
    }).filter(function (s) { return s && s.total > 0; });
  }

  function vocabBookCardHTML(stats, prefix) {
    var book = stats.book;
    var prog = vocabProgress(stats.lists);
    var unit = book.subject ? " 单元" : " 份";
    var cnt = stats.total + unit;
    var progTxt = prog.done ? ("已学 " + prog.done + "/" + stats.total) : cnt;
    var shortLabel = book.key === "gaozhong" ? "高中"
      : (book.key === "cet4" ? "四级" : (book.key === "cet4-lite" ? "精简" : "雅思"));
    var tagTier = book.key === "special" ? "new" : (book.key === "cet4" ? "mid" : "base");
    var shieldIcon = '<svg class="vol-card__shield" viewBox="0 0 14 16" aria-hidden="true"><path d="M7 1.2 12 3v5.2c0 3.4-2.1 5.9-5 7.3-2.9-1.4-5-3.9-5-7.3V3L7 1.2Z" fill="currentColor"/></svg>';
    var bookIcon = '<svg class="vol-card__book" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path class="vol-card__book-l" d="M4.5 5.5c2.6 0 4.8.5 6.5 1.6v11.4c-1.7-1.1-3.9-1.6-6.5-1.6V5.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      '<path class="vol-card__book-r" d="M19.5 5.5c-2.6 0-4.8.5-6.5 1.6v11.4c1.7-1.1 3.9-1.6 6.5-1.6V5.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M12 7.1v11.4" stroke="currentColor" stroke-width="2"/></svg>';
    return '' +
      '<a class="vol-card vol-card--vocab vol-card--tier-' + tagTier + '" href="' + (prefix || "") + 'vocab-shelf.html?book=' + encodeURIComponent(book.key) + '">' +
        '<div class="vol-card__main">' +
        '<div class="vol-card__top">' +
          '<span class="vol-card__vol">' + shieldIcon + ' ' + esc(shortLabel) + '</span>' +
          '<span class="vol-card__tag vol-card__tag--' + tagTier + '">' + esc(book.tag) + '</span>' +
        '</div>' +
        '<div class="vol-card__body">' +
          '<span class="vol-card__ico">' + bookIcon + '</span>' +
          '<div><h3>' + esc(book.label) + '</h3>' +
          '<div class="vol-card__cnt">' + esc(progTxt) + '</div></div>' +
        '</div>' +
        '<div class="vol-card__foot">' +
          '<span class="vol-card__skills"><span class="vc-skill vc-skill--a">词</span></span>' +
          '<span class="vol-card__go">进入 ›</span>' +
        '</div>' +
        '</div>' +
      '</a>';
  }

  // ---- Cambridge series grouping (真题区 shows one card per volume) ----
  function isCambridge(subject) {
    return subject === "cambridge-listening" || subject === "cambridge-reading" || subject === "cambridge-writing";
  }

  // Reading exams that show passage text (Cambridge, practice reading, placement tests, etc.)
  function isReadingExam(item) {
    if (!item) return false;
    if (item.subject === "cambridge-reading") return true;
    var blob = (item.file || "") + (item.title || "") + (item.description || "");
    return /reading|阅读/i.test(blob);
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

  /* ponytail: one glyph set for hub / vol-card / skill-panel */
  function skillGlyph(key) {
    var k = key || "mock";
    var map = {
      listening: '<svg class="skill-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M4 11a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
        '<path d="M5.5 11v3.2a2.3 2.3 0 0 0 2.3 2.3h.7V11H5.5Zm13 0h-2.5v5.5h.7a2.3 2.3 0 0 0 2.3-2.3V11Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M12 17.5v1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      reading: '<svg class="skill-glyph skill-glyph--book" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path class="vol-card__book-l" d="M4.5 5.5c2.6 0 4.8.5 6.5 1.6v11.4c-1.7-1.1-3.9-1.6-6.5-1.6V5.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path class="vol-card__book-r" d="M19.5 5.5c-2.6 0-4.8.5-6.5 1.6v11.4c1.7-1.1 3.9-1.6 6.5-1.6V5.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M12 7.1v11.4" stroke="currentColor" stroke-width="1.8"/></svg>',
      writing: '<svg class="skill-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M14.2 4.8 19.2 9.8 9 20H4v-5L14.2 4.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M12.5 6.5 17.5 11.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      speaking: '<svg class="skill-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M12 3.8a3.2 3.2 0 0 0-3.2 3.2v5.2a3.2 3.2 0 1 0 6.4 0V7A3.2 3.2 0 0 0 12 3.8Z" stroke="currentColor" stroke-width="1.8"/>' +
        '<path d="M6.2 11.2a5.8 5.8 0 0 0 11.6 0M12 17v3.2M9.2 20.2h5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      mock: '<svg class="skill-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M12 3.2 19 5.4v6.1c0 4.2-2.8 7.4-7 9.1-4.2-1.7-7-4.9-7-9.1V5.4L12 3.2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M9.2 12.1 11.1 14l3.7-4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    return map[k] || map.mock;
  }

  // One volume card (clean VOL.NN style) → opens cambridge.html?vol=N
  function camVolumeProgress(items, vol) {
    var cam = (items || []).filter(function (it) {
      return isCambridge(it.subject) && camVolume(it) === String(vol);
    });
    var res = results();
    var done = cam.filter(function (it) { return res[it.id]; }).length;
    return { done: done, total: cam.length };
  }

  function camVolumeCardHTML(v, prefix, items, opts) {
    opts = opts || {};
    var skill = opts.skill || "";
    var accent = skill === "listening" || skill === "reading" || skill === "writing" ? skill : "mock";
    var tag = camVolTag(v.vol);
    var prog = items ? camVolumeProgress(items, v.vol) : null;
    var cntText = prog && prog.done
      ? "已完成 " + prog.done + "/" + prog.total + " 份 · " + v.tests + " 套"
      : "包含 " + v.tests + " 套";
    var doneClass = prog && prog.total && prog.done >= prog.total ? " vol-card--done" : "";
    var markIcon = '<svg class="vol-card__shield" viewBox="0 0 14 16" aria-hidden="true"><path d="M7 1.2 12 3v5.2c0 3.4-2.1 5.9-5 7.3-2.9-1.4-5-3.9-5-7.3V3L7 1.2Z" fill="currentColor"/></svg>';
    var skills = accent === "mock"
      ? '<span class="vc-skill vc-skill--l">L</span><span class="vc-skill vc-skill--r">R</span><span class="vc-skill vc-skill--w">W</span>'
      : accent === "listening"
        ? '<span class="vc-skill vc-skill--l">1</span><span class="vc-skill vc-skill--l">2</span><span class="vc-skill vc-skill--l">3</span><span class="vc-skill vc-skill--l">4</span>'
        : accent === "reading"
          ? '<span class="vc-skill vc-skill--r">P1</span><span class="vc-skill vc-skill--r">P2</span><span class="vc-skill vc-skill--r">P3</span>'
          : '<span class="vc-skill vc-skill--w">T1</span><span class="vc-skill vc-skill--w">T2</span>';
    var href = (prefix || "") + "cambridge.html?vol=" + encodeURIComponent(v.vol) +
      (skill ? "&skill=" + encodeURIComponent(skill) : "");
    var goLabel = skill ? "开始练习 ›" : "开始模考 ›";
    return '' +
      '<a class="vol-card vol-card--' + accent + ' vol-card--tier-' + tag.c + doneClass + '" href="' + href + '" data-skill="' + accent + '">' +
        '<div class="vol-card__main">' +
        '<div class="vol-card__top">' +
          '<span class="vol-card__vol">' + markIcon + ' VOL.' + esc(v.vol) + '</span>' +
          '<span class="vol-card__tag vol-card__tag--' + tag.c + '">' + tag.t + '</span>' +
        '</div>' +
        '<div class="vol-card__body">' +
          '<span class="vol-card__ico">' + skillGlyph(accent) + '</span>' +
          '<div><h3>剑桥雅思 ' + esc(v.vol) + '</h3>' +
          '<div class="vol-card__cnt">' + cntText + '</div></div>' +
        '</div>' +
        '<div class="vol-card__foot">' +
          '<span class="vol-card__skills">' + skills + '</span>' +
          '<span class="vol-card__go">' + goLabel + '</span>' +
        '</div>' +
        '</div>' +
      '</a>';
  }

  // Cambridge catalog: tier filter, search, collapsible legacy volumes.
  function cambridgeCatalogHTML(volumes, items, prefix, opts) {
    opts = opts || {};
    var q = String(opts.query || "").toLowerCase().trim();
    var tier = opts.tier || "all";
    var collapseLegacy = opts.collapseLegacy !== false;
    var legacyBefore = opts.legacyBefore != null ? opts.legacyBefore : 13;

    var filtered = (volumes || []).filter(function (v) {
      var n = Number(v.vol);
      if (tier === "new" && n < 19) return false;
      if (tier === "mid" && (n < 13 || n > 18)) return false;
      if (tier === "base" && n >= 13) return false;
      if (q) {
        var hay = ("剑桥雅思 vol " + v.vol + " cambridge " + v.vol).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });

    if (!filtered.length) {
      return '<div class="soon-box">没有匹配的册数，试试其他筛选条件。</div>';
    }

    function cards(vols) {
      return vols.map(function (v) {
        return camVolumeCardHTML(v, prefix, items, { skill: opts.skill || "" });
      }).join("");
    }

    if (tier !== "all" || q || !collapseLegacy) {
      return '<div class="vol-grid">' + cards(filtered) + '</div>';
    }

    var recent = filtered.filter(function (v) { return Number(v.vol) >= legacyBefore; });
    var legacy = filtered.filter(function (v) { return Number(v.vol) < legacyBefore; });
    var html = '<div class="vol-grid">' + cards(recent) + "</div>";
    if (legacy.length) {
      html += '<details class="catalog-collapse">' +
        '<summary><span class="catalog-collapse__label">更多基础册</span>' +
        '<span class="catalog-collapse__meta">' + legacy.length + " 册 · Vol." +
        legacy[legacy.length - 1].vol + "–" + legacy[0].vol + "</span></summary>" +
        '<div class="vol-grid">' + cards(legacy) + "</div></details>";
    }
    return html;
  }

  // 听力精听：按册折叠，默认只露最新册（剑21）；册内再按 Test 折叠
  function jingtingVol(item) {
    var m = String((item && item.title) || "").match(/剑(?:雅|桥雅思)?\s*0*(\d+)/);
    if (m) return m[1];
    m = String((item && item.id) || "").match(/cam(\d+)/i);
    return m ? m[1] : "";
  }

  function jingtingTestNo(item) {
    var m = String((item && item.id) || "").match(/-t(\d+)/i);
    if (m) return m[1];
    return camTestNo(item);
  }

  function jingtingPartNo(item) {
    var m = String((item && item.id) || "").match(/-p(\d+)/i);
    if (m) return m[1];
    m = String((item && item.title) || "").match(/Part\s*0*(\d+)/i);
    if (m) return m[1];
    m = String((item && item.title) || "").match(/Section\s*0*(\d+)/i);
    return m ? m[1] : "";
  }

  function jingtingPartRowHTML(item, prefix) {
    var done = results()[item.id];
    var t = jingtingTestNo(item);
    var p = jingtingPartNo(item);
    var label = (t && p) ? ("Test " + t + " · Part " + p) : displayTitle(item);
    return '<a class="catalog-row' + (done ? " is-done" : "") + '" href="' + fileHref(item, prefix) + '">' +
      '<span class="catalog-row__badge badge badge--jingting">Part ' + esc(p || "?") + "</span>" +
      '<span class="catalog-row__title">' + esc(label) + "</span>" +
      (done ? '<span class="catalog-row__status">已完成</span>' : '<span class="catalog-row__go">开始精听 ›</span>') +
      "</a>";
  }

  function jingtingCatalogHTML(items, prefix) {
    var groups = {};
    (items || []).forEach(function (it) {
      var v = jingtingVol(it) || "other";
      if (!groups[v]) groups[v] = [];
      groups[v].push(it);
    });
    var vols = Object.keys(groups).sort(function (a, b) {
      if (a === "other") return 1;
      if (b === "other") return -1;
      return Number(b) - Number(a);
    });
    if (!vols.length) return '<div class="soon-box">暂无精听内容。</div>';

    // ponytail: newest vol open with Test folds closed; older vols fully collapsed
    return vols.map(function (v, vi) {
      var list = groups[v].slice().sort(function (a, b) {
        return (Number(jingtingTestNo(a)) - Number(jingtingTestNo(b))) ||
          (Number(jingtingPartNo(a)) - Number(jingtingPartNo(b))) ||
          String(a.title).localeCompare(String(b.title), "zh");
      });
      var byTest = {};
      list.forEach(function (it) {
        var t = jingtingTestNo(it) || "0";
        if (!byTest[t]) byTest[t] = [];
        byTest[t].push(it);
      });
      var tests = Object.keys(byTest).sort(function (a, b) { return Number(a) - Number(b); });
      var isLegacy = v === "other" || Number(v) < 21;
      var volLabel = v === "other" ? "其它 / 旧版" : ("剑" + v);
      var openAttr = vi === 0 && !isLegacy ? " open" : "";
      var inner;
      if (tests.length <= 1 && tests[0] === "0") {
        inner = '<div class="catalog-rows jt-fold__rows">' + list.map(function (it) {
          return jingtingPartRowHTML(it, prefix);
        }).join("") + "</div>";
      } else {
        inner = '<div class="jt-fold__tests">' + tests.map(function (t) {
          var parts = byTest[t];
          return '<details class="catalog-collapse catalog-collapse--jt catalog-collapse--nested">' +
            '<summary>' +
              '<span class="catalog-collapse__lead">' +
                '<span class="catalog-collapse__chev" aria-hidden="true"></span>' +
                '<span class="catalog-collapse__label">Test ' + esc(t) + "</span>" +
              "</span>" +
              '<span class="catalog-collapse__meta">' + parts.length + " Part</span>" +
            "</summary>" +
            '<div class="catalog-collapse__body"><div class="catalog-collapse__inner">' +
              '<div class="catalog-rows jt-fold__rows">' + parts.map(function (it) {
                return jingtingPartRowHTML(it, prefix);
              }).join("") + "</div>" +
            "</div></div></details>";
        }).join("") + "</div>";
      }
      return '<details class="catalog-collapse catalog-collapse--jt"' + openAttr + ">" +
        '<summary>' +
          '<span class="catalog-collapse__lead">' +
            '<span class="catalog-collapse__chev" aria-hidden="true"></span>' +
            '<span class="catalog-collapse__label">' + esc(volLabel) + " · 听力精听</span>" +
          "</span>" +
          '<span class="catalog-collapse__meta">' + list.length + " Part</span>" +
        "</summary>" +
        '<div class="catalog-collapse__body"><div class="catalog-collapse__inner">' + inner + "</div></div></details>";
    }).join("");
  }

  function relativeWhen(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    var time = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
    if (sameDay) return "今天 " + time;
    if (d.toDateString() === yest.toDateString()) return "昨天 " + time;
    return d.toLocaleString("zh-CN", { hour12: false });
  }

  function subjectPillLabel(subject) {
    if (subject === "cambridge-listening") return "听力";
    if (subject === "cambridge-reading") return "阅读";
    if (subject === "cambridge-writing") return "写作";
    var s = SUBJECT[subject];
    return (s && s.label) || "练习";
  }

  function resultsInsightLine(rows) {
    var listen = rows.filter(function (r) { return r.subject === "cambridge-listening" && r.band != null; }).slice(0, 3);
    var wrongN = 0;
    rows.forEach(function (r) {
      if (r.wrong && r.wrong.length) wrongN += r.wrong.length;
    });
    var parts = [];
    if (listen.length) {
      var avg = listen.reduce(function (s, r) { return s + Number(r.band); }, 0) / listen.length;
      parts.push("听力最近 " + listen.length + " 次均 Band " + (Math.round(avg * 10) / 10));
    }
    if (wrongN) parts.push("待复习错题 " + wrongN);
    else parts.push("累计 " + rows.length + " 次练习");
    return parts.join(" · ");
  }

  function resultsSummaryHTML(rows, prefix) {
    if (!rows.length) return "";
    var latest = rows[0];
    var bandRows = rows.filter(function (r) { return r.band != null; });
    var latestBand = bandRows.length ? bandRows[0].band : null;
    var scoreTxt = latest.score != null
      ? latest.score + (latest.total != null ? " / " + latest.total : "")
      : "—";
    var wrongN = (latest.wrong && latest.wrong.length) || 0;
    if (!wrongN && latest.score != null && latest.total != null && latest.score < latest.total) {
      wrongN = Math.max(0, latest.total - latest.score);
    }
    var hasWrong = !!(latest.wrong && latest.wrong.length);
    var mayHaveWrong = hasWrong || (
      (latest.subject === "cambridge-listening" || latest.subject === "cambridge-reading") &&
      latest.score != null && latest.total != null && latest.score < latest.total
    );
    var wrongBtn = mayHaveWrong
      ? '<button type="button" class="btn btn--ghost btn--sm" data-results-tab="wrongs">查看错题</button>'
      : '<span class="results-hero__soon btn btn--ghost btn--sm is-disabled" title="本次无错题或尚未收录">查看错题</span>';
    var pill = subjectPillLabel(latest.subject);
    var insight = resultsInsightLine(rows);
    return '<section class="results-hero reveal" aria-label="成绩概览">' +
      '<div class="results-hero__main">' +
        '<span class="results-hero__eyebrow">LATEST RESULT</span>' +
        '<div class="results-hero__title-row">' +
          '<h2>' + esc(latest.title) + "</h2>" +
          '<span class="results-pill">' + esc(pill) + "</span>" +
        "</div>" +
        '<p class="results-hero__meta">最近完成 · ' + esc(relativeWhen(latest.date)) +
          " · 共 " + rows.length + " 次记录</p>" +
        '<div class="results-hero__actions">' +
          '<a class="btn btn--primary btn--sm" href="exam.html?id=' + encodeURIComponent(latest.id) + '">再练一次</a>' +
          wrongBtn +
          '<button type="button" class="results-hero__ghost-link" data-results-tab="archive">全部记录</button>' +
        "</div></div>" +
      '<div class="results-hero__stats">' +
        '<div class="results-hero__stat"><b>' + esc(scoreTxt) + '</b><span>最近得分</span></div>' +
        '<div class="results-hero__stat' + (latestBand != null ? " results-hero__stat--band" : "") + '">' +
          '<b>' + (latestBand != null ? esc(String(latestBand)) : "—") + '</b><span>Band 预估</span></div>' +
        '<div class="results-hero__stat"><b>' + wrongN + '</b><span>本卷错题</span></div>' +
      "</div>" +
      (insight ? '<p class="results-insight">' + esc(insight) + "</p>" : "") +
      "</section>";
  }

  function searchItems(items, query) {
    var q = String(query || "").toLowerCase().trim();
    if (!q) return items || [];
    return (items || []).filter(function (it) {
      var hay = (displayTitle(it) + " " + it.title + " " + (it.description || "") + " " +
        it.subject + " " + it.id).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function recentActivity(items, limit) {
    var store = results();
    var byId = {};
    (items || []).forEach(function (it) { byId[it.id] = it; });
    return Object.keys(store).map(function (k) { return store[k]; })
      .filter(function (r) { return byId[r.id]; })
      .sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); })
      .slice(0, limit || 3)
      .map(function (r) { return { item: byId[r.id], result: r }; });
  }

  function continueStripHTML(activities, prefix) {
    if (!activities.length) return "";
    return homeDashboardHTML([], activities, prefix);
  }

  function journeyStats(items) {
    var store = results();
    var byId = {};
    (items || []).forEach(function (it) { byId[it.id] = it; });
    var counts = { study: 0, practice: 0, mock: 0, total: 0 };
    Object.keys(store).forEach(function (k) {
      var it = byId[k];
      if (!it || !counts.hasOwnProperty(it.zone)) return;
      counts[it.zone]++;
      counts.total++;
    });
    return counts;
  }

  function homeIeltsHTML(items, prefix) {
    var p = prefix || "";
    var zones = [
      { step: "01", label: "单词区", sub: "词汇 · 语法 · 课程资料", href: p + "zone.html?zone=study" },
      { step: "02", label: "练习区", sub: "长难句 · 专项训练", href: p + "zone.html?zone=practice" },
      { step: "03", label: "真题区", sub: "剑桥雅思真题", href: p + "zone.html?zone=mock&s=ielts" }
    ];
    var zoneCards = zones.map(function (z) {
      return '<a class="home-ielts__zone pressable" href="' + z.href + '">' +
        '<span class="home-ielts__zone-step">' + z.step + "</span>" +
        "<b>" + esc(z.label) + "</b>" +
        '<span class="home-ielts__zone-sub">' + esc(z.sub) + "</span>" +
        '<span class="home-ielts__zone-go" aria-hidden="true">→</span></a>';
    }).join("");

    return '<section class="home-ielts reveal" aria-label="雅思备考">' +
      '<div class="home-ielts__inner">' +
        '<div class="home-ielts__head">' +
          "<div>" +
            '<span class="home-ielts__eyebrow">IELTS PREPARATION</span>' +
            "<h2>雅思备考</h2>" +
            "<p>单词 · 练习 · 真题一站完成 · 剑桥雅思真题 · 词汇语法系统精讲</p>" +
          "</div>" +
          '<div class="home-ielts__actions">' +
            '<a class="btn btn--primary pressable" href="' + p + 'zone.html?zone=study">进入单词区</a>' +
            '<a class="btn btn--gold pressable" href="' + p + 'zone.html?zone=mock&s=ielts">开始真题</a>' +
          "</div>" +
        "</div>" +
        '<div class="home-ielts__zones">' + zoneCards + "</div>" +
      "</div></section>";
  }

  function homeJourneyHTML(items, prefix) {
    var counts = journeyStats(items);
    var steps = [
      { zone: "study", step: "01", label: "单词", sub: "词汇 · 语法", href: (prefix || "") + "zone.html?zone=study" },
      { zone: "practice", step: "02", label: "练习", sub: "长难句 · 专项", href: (prefix || "") + "zone.html?zone=practice" },
      { zone: "mock", step: "03", label: "真题", sub: "剑桥真题", href: (prefix || "") + "zone.html?zone=mock" }
    ];
    var current = "study";
    if (counts.mock) current = "mock";
    else if (counts.practice) current = "practice";
    else if (counts.study) current = "study";

    var nodes = steps.map(function (s) {
      var n = counts[s.zone] || 0;
      var cls = "home-journey__node";
      if (n) cls += " is-done";
      if (s.zone === current && counts.total) cls += " is-current";
      return '<a class="' + cls + '" href="' + s.href + '">' +
        '<span class="home-journey__step">' + s.step + '</span>' +
        '<span class="home-journey__label">' + esc(s.label) + '</span>' +
        '<span class="home-journey__sub">' + esc(s.sub) + '</span>' +
        (n ? '<span class="home-journey__count">' + n + ' 份</span>' : "") +
        "</a>";
    }).join("");

    return '<section class="home-journey reveal" aria-label="备考路径">' +
      '<div class="home-journey__head">' +
        '<span class="home-journey__eyebrow">LEARNING PATH</span>' +
        '<h2>你的备考路径</h2>' +
        '<p>学习打基础 → 练习强技能 → 模考验真章</p>' +
      "</div>" +
      '<div class="home-journey__track">' + nodes + "</div>" +
      "</section>";
  }

  function homeDashboardHTML(items, activities, prefix) {
    var counts = journeyStats(items || []);
    var acts = activities || [];
    var p = prefix || "";

    if (!acts.length) {
      return '<section class="home-dashboard home-dashboard--empty reveal" aria-label="备考仪表盘">' +
        '<div class="home-dashboard__inner">' +
          '<span class="home-dashboard__eyebrow">YOUR COCKPIT</span>' +
          "<h2>开始你的备考路径</h2>" +
          "<p>从单词区或真题区任选入口，进度会保存在本浏览器。</p>" +
          '<div class="home-dashboard__actions">' +
            '<a class="btn btn--gold btn--sm" href="' + p + 'zone.html?zone=mock">开始真题</a>' +
            '<a class="btn btn--ghost-dark btn--sm" href="' + p + 'zone.html?zone=study">进入单词区</a>' +
          "</div></div></section>";
    }

    var rows = acts.map(function (a) {
      var r = a.result;
      var zone = (ZONE[a.item.zone] || {}).label || "";
      var meta = r.score != null ? r.score + (r.total ? "/" + r.total : "") : "继续";
      if (r.band != null) meta += " · Band " + r.band;
      return '<a class="home-dashboard__row" href="' + fileHref(a.item, p) + '">' +
        '<span class="home-dashboard__row-zone">' + esc(zone) + "</span>" +
        '<span class="home-dashboard__row-title">' + esc(displayTitle(a.item)) + "</span>" +
        '<span class="home-dashboard__row-meta">' + esc(meta) + " ›</span></a>";
    }).join("");

    return '<section class="home-dashboard reveal" aria-label="备考仪表盘">' +
      '<div class="home-dashboard__inner">' +
        '<div class="home-dashboard__top">' +
          '<div><span class="home-dashboard__eyebrow">YOUR COCKPIT</span>' +
          "<h2>继续备考</h2>" +
          "<p>从上次停下的地方接着学</p></div>" +
          '<div class="home-dashboard__metrics">' +
            '<div class="home-dashboard__metric"><b>' + counts.total + '</b><span>已做</span></div>' +
            '<div class="home-dashboard__metric"><b>' + counts.mock + '</b><span>模考</span></div>' +
            '<div class="home-dashboard__metric"><b>' + counts.study + '</b><span>学习</span></div>' +
          "</div></div>" +
        '<div class="home-dashboard__list">' + rows + "</div>" +
        '<a class="home-dashboard__all" href="' + p + 'results.html">查看全部成绩 →</a>' +
      "</div></section>";
  }

  function compactItemRowHTML(item, prefix) {
    var done = results()[item.id];
    var subj = SUBJECT[item.subject] || { label: "其他" };
    return '<a class="catalog-row' + (done ? " is-done" : "") + '" href="' + fileHref(item, prefix) + '">' +
      '<span class="catalog-row__badge badge badge--' + esc(item.subject) + '">' + esc(subj.label) + "</span>" +
      '<span class="catalog-row__title">' + esc(displayTitle(item)) + "</span>" +
      (done ? '<span class="catalog-row__status">已完成</span>' : '<span class="catalog-row__go">进入 ›</span>') +
      "</a>";
  }

  function searchResultsHTML(items, prefix) {
    if (!items.length) {
      return '<div class="soon-box">没有找到匹配的内容，试试其他关键词。</div>';
    }
    var bySubject = {};
    items.forEach(function (it) {
      (bySubject[it.subject] = bySubject[it.subject] || []).push(it);
    });
    return Object.keys(bySubject).sort().map(function (subj) {
      var label = (SUBJECT[subj] || {}).label || subj;
      var its = bySubject[subj].slice().sort(function (a, b) {
        if (isVocabListSubject(subj)) return vocabListNo(a) - vocabListNo(b);
        return String(a.title).localeCompare(String(b.title), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
      });
      var body = its.length > 8 && isVocabListSubject(subj)
        ? '<div class="catalog-rows">' + its.map(function (it) { return compactItemRowHTML(it, prefix); }).join("") + "</div>"
        : '<div class="exam-grid exam-grid--compact">' + its.map(function (it) { return cardHTML(it, prefix); }).join("") + "</div>";
      return '<div class="catalog-section">' +
        '<div class="catalog-section__head"><h3>' + esc(label) + '</h3><span class="cnt">' + its.length + " 份</span></div>" +
        body + "</div>";
    }).join("");
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

  function resultsBandTimelineHTML(rows) {
    var pts = (rows || []).filter(function (r) { return r.band != null; }).slice(0, 10);
    if (!pts.length) return "";
    pts = pts.slice().reverse();
    var maxBand = 9;
    var bars = pts.map(function (r, i) {
      var h = Math.max(12, Math.round((Number(r.band) / maxBand) * 100));
      var d = r.date ? new Date(r.date) : null;
      var dateLabel = d && !isNaN(d.getTime())
        ? (d.getMonth() + 1) + "/" + d.getDate()
        : "";
      var isLatest = i === pts.length - 1;
      return '<div class="band-timeline__item' + (isLatest ? " is-latest" : "") +
        '" style="--h:' + h + '%;--i:' + i + '">' +
        '<div class="band-timeline__bar-wrap"><span class="band-timeline__bar"></span></div>' +
        '<span class="band-timeline__val">' + esc(String(r.band)) + '</span>' +
        (dateLabel ? '<span class="band-timeline__date">' + esc(dateLabel) + '</span>' : "") +
        "</div>";
    }).join("");
    var latest = pts[pts.length - 1].band;
    return '<section class="band-timeline results-panel reveal" aria-label="Band 轨迹">' +
      '<div class="band-timeline__head">' +
        '<span class="band-timeline__eyebrow">BAND TRAJECTORY</span>' +
        "<h2>Band 轨迹</h2>" +
        "<p>最近 " + pts.length + " 次有 Band 的练习 · 最新 Band " + esc(String(latest)) + "</p>" +
      "</div>" +
      '<div class="band-timeline__chart">' + bars + "</div>" +
      "</section>";
  }

  return {
    CONTENT_VER: CONTENT_VER,
    ZONES: ZONES, ZONE: ZONE, ZONE_SUBJECTS: ZONE_SUBJECTS, SUBJECT: SUBJECT,
    NAV: NAV, navOf: navOf,
    esc: esc, results: results, load: load, subjectsOf: subjectsOf,
    fileHref: fileHref, vocabLessonHref: vocabLessonHref, cardHTML: cardHTML, countsBySubject: countsBySubject,
    isCambridge: isCambridge, isReadingExam: isReadingExam, camVolume: camVolume, camTestNo: camTestNo, camVolumes: camVolumes,
    skillGlyph: skillGlyph,
    camVolumeCardHTML: camVolumeCardHTML, camVolumeProgress: camVolumeProgress,
    cambridgeCatalogHTML: cambridgeCatalogHTML, jingtingCatalogHTML: jingtingCatalogHTML,
    searchItems: searchItems,
    recentActivity: recentActivity, continueStripHTML: continueStripHTML,
    journeyStats: journeyStats, homeIeltsHTML: homeIeltsHTML, homeJourneyHTML: homeJourneyHTML, homeDashboardHTML: homeDashboardHTML,
    resultsSummaryHTML: resultsSummaryHTML,
    resultsBandTimelineHTML: resultsBandTimelineHTML,
    searchResultsHTML: searchResultsHTML, compactItemRowHTML: compactItemRowHTML,
    VOCAB_BOOKS: VOCAB_BOOKS, isVocabListSubject: isVocabListSubject, isVocabSpecial: isVocabSpecial,
    needsVocabBridge: needsVocabBridge,
    vocabListNo: vocabListNo, vocabDisplayTitle: vocabDisplayTitle,     displayTitle: displayTitle,
    parsePartId: parsePartId, parseGroupId: parseGroupId,
    makePartItem: makePartItem, makeGroupItem: makeGroupItem, resolveItem: resolveItem,
    cambridgeCdtQs: cambridgeCdtQs,
    expandAssignableParts: expandAssignableParts, partSearchText: partSearchText,
    loadListeningTaxonomy: loadListeningTaxonomy,
    loadReadingTaxonomy: loadReadingTaxonomy,
    drillKindLabel: drillKindLabel,
    vocabTopic: vocabTopic,
    vocabBookStats: vocabBookStats, vocabProgress: vocabProgress,
    vocabListRanges: vocabListRanges, vocabBooksForZone: vocabBooksForZone, vocabBookCardHTML: vocabBookCardHTML,
    vocabBookOfSubject: vocabBookOfSubject,
    wrongWords: wrongWords, wrongWordCount: wrongWordCount, mergeWrongWords: mergeWrongWords,
    removeWrongWord: removeWrongWord, clearWrongWords: clearWrongWords, wrongWordsStripHTML: wrongWordsStripHTML,
    savedWords: savedWords, savedWordCount: savedWordCount, addSavedWord: addSavedWord,
    removeSavedWord: removeSavedWord, clearSavedWords: clearSavedWords, savedWordsStripHTML: savedWordsStripHTML
  };
})();
