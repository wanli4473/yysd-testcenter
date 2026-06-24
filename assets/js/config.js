/* =========================================================================
   config.js — shared taxonomy + helpers for 优益思达学习中心
   Loaded by the landing page, zone pages, the viewer and results page.
   ========================================================================= */
window.YYSD = (function () {
  "use strict";

  var ZONES = ["mock", "study", "practice"];

  var ZONE = {
    mock:     { label: "模考区", en: "Mock Tests", icon: "🎯",
                desc: "全真模考，计时考场，交卷自动批改出分。" },
    study:    { label: "学习区", en: "Study", icon: "📚",
                desc: "语法、单词系统精讲，边学边测，巩固基础。" },
    practice: { label: "练习区", en: "Practice", icon: "✏️",
                desc: "分科分类专项练习题，查漏补缺，针对提分。" }
  };

  // ordered subjects per zone
  var ZONE_SUBJECTS = {
    mock:     ["cambridge-listening", "cambridge-reading", "ielts", "pte", "toefl"],
    study:    ["grammar", "vocab"],
    practice: ["ielts", "pte", "toefl"]
  };

  var SUBJECT = {
    "cambridge-listening": { label: "剑桥听力", en: "Cambridge Listening", color: "var(--c-cambridge-listening)" },
    "cambridge-reading":   { label: "剑桥阅读", en: "Cambridge Reading", color: "var(--c-cambridge-reading)" },
    cambridge: { label: "剑桥真题", en: "Cambridge", color: "var(--c-cambridge)" },
    ielts:   { label: "雅思", en: "IELTS", color: "var(--c-ielts)" },
    pte:     { label: "PTE",  en: "PTE",   color: "var(--c-pte)" },
    toefl:   { label: "托福", en: "TOEFL", color: "var(--c-toefl)" },
    grammar: { label: "语法", en: "Grammar", color: "var(--c-grammar)" },
    vocab:   { label: "单词", en: "Vocabulary", color: "var(--c-vocab)" }
  };

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

  // ---- Cambridge series grouping (模考区 shows one card per volume) ----
  function isCambridge(subject) {
    return subject === "cambridge-listening" || subject === "cambridge-reading";
  }

  // Pull the volume number (e.g. "15") out of a title like "剑桥雅思15 · Test 1（听力）".
  function camVolume(item) {
    var m = String((item && item.title) || "").match(/剑(?:桥雅思)?\s*0*(\d+)/);
    return m ? m[1] : "";
  }

  // Summarise cambridge items into [{vol, listening, reading, total}], newest volume first.
  function camVolumes(items) {
    var map = {};
    (items || []).forEach(function (it) {
      if (!isCambridge(it.subject)) return;
      var v = camVolume(it); if (!v) return;
      if (!map[v]) map[v] = { vol: v, listening: 0, reading: 0, total: 0 };
      if (it.subject === "cambridge-reading") map[v].reading++;
      else map[v].listening++;
      map[v].total++;
    });
    return Object.keys(map)
      .sort(function (a, b) { return Number(b) - Number(a); })
      .map(function (k) { return map[k]; });
  }

  // A single "series" card for one Cambridge volume → opens cambridge.html?vol=N
  function camVolumeCardHTML(v, prefix) {
    return '' +
      '<a class="exam-card exam-card--series" href="' + (prefix || "") + 'cambridge.html?vol=' + encodeURIComponent(v.vol) + '">' +
        '<div class="exam-card__top">' +
          '<span class="badge badge--cambridge">剑桥真题</span>' +
          '<span class="tag-cat">模考区</span>' +
        '</div>' +
        '<h3>剑桥雅思 ' + esc(v.vol) + '</h3>' +
        '<p>官方真题套卷：听力与学术类阅读，点击进入查看本册全部测试。</p>' +
        '<div class="exam-card__meta">' +
          '<span>🎧 听力 ' + v.listening + ' 套</span>' +
          '<span>📖 阅读 ' + v.reading + ' 套</span>' +
        '</div>' +
        '<div class="exam-card__foot">' +
          '<span class="btn btn--primary btn--sm" style="pointer-events:none">查看全部 →</span>' +
        '</div>' +
      '</a>';
  }

  return {
    ZONES: ZONES, ZONE: ZONE, ZONE_SUBJECTS: ZONE_SUBJECTS, SUBJECT: SUBJECT,
    esc: esc, results: results, load: load, subjectsOf: subjectsOf,
    fileHref: fileHref, cardHTML: cardHTML,
    isCambridge: isCambridge, camVolume: camVolume, camVolumes: camVolumes,
    camVolumeCardHTML: camVolumeCardHTML
  };
})();
