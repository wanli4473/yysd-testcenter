/* =========================================================================
   vocab.js — vocabulary book hub (Plan A)
   Opened from 学习区: vocab.html?book=gaozhong | cet4 | special
   Optional: &range=11-20 for initial LIST tab
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var params = new URLSearchParams(location.search);
  var bookKey = (params.get("book") || "").trim();
  var rangeParam = (params.get("range") || "").trim();
  var contentEl = document.getElementById("content");

  var navLink = document.querySelector('#nav a[data-zone="study"]');
  if (navLink) navLink.classList.add("is-active");
  document.getElementById("year").textContent = new Date().getFullYear();

  var SPECIAL_SECTIONS = [
    { subject: "vocab-special-listening", label: "听力专项词汇" },
    { subject: "vocab-special-reading", label: "阅读高频词汇" },
    { subject: "vocab-special-writing", label: "写作短语" }
  ];

  function fail(msg) {
    contentEl.innerHTML = '<div class="state"><h3>无法打开</h3><p>' + Y.esc(msg) +
      '</p><p><a href="zone.html?zone=study&s=vocab">返回学习区</a></p></div>';
  }

  function heroHTML(book, stats, prog) {
    var badge = book.key === "gaozhong" ? "GZ" : (book.key === "cet4" ? "CET4" : "SP");
    var sub = stats.total + (book.subject ? " 个 LIST" : " 份专题");
    var progLine = prog.done
      ? "已学 " + prog.done + " / " + stats.total + (prog.last ? " · 上次 LIST " + Y.vocabListNo(prog.last) : "")
      : "边学边测 · 点击 LIST 进入";

    var actions = "";
    if (prog.next && book.subject) {
      actions = '<div class="vocab-hero__actions">' +
        '<a class="btn btn--primary btn--sm" href="' + Y.fileHref(prog.next, "") + '">继续学习 · LIST ' +
        Y.vocabListNo(prog.next) + '</a>' +
        '<a class="btn btn--ghost btn--sm" href="' + Y.fileHref(stats.lists[0], "") + '">从 LIST 1 开始</a>' +
        '</div>';
    }

    return '<div class="cam-hero vocab-hero">' +
      '<div class="cam-hero__badge"><div class="lbl">VOCAB</div><div class="num">' + Y.esc(badge) + '</div></div>' +
      '<div><h1>' + Y.esc(book.label) + '</h1>' +
      '<div class="meta">' + Y.esc(sub) + ' · ' + Y.esc(progLine) + '</div>' +
      actions +
      '</div></div>';
  }

  function listRowHTML(item) {
    var no = Y.vocabListNo(item);
    var done = Y.results()[item.id];
    return '<a class="vocab-list-row' + (done ? " is-done" : "") + '" href="' + Y.fileHref(item, "") + '">' +
      '<span class="vocab-list-row__no">' + (no ? "LIST " + no : "#") + '</span>' +
      '<span class="vocab-list-row__title">' + Y.esc(item.title) + '</span>' +
      (done
        ? '<span class="vocab-list-row__badge">已学</span>'
        : '<span class="vocab-list-row__go">进入 ›</span>') +
      '</a>';
  }

  function renderListBook(stats) {
    var book = stats.book;
    var chunk = book.chunk || 10;
    var tabs = Y.vocabListRanges(stats.lists, chunk);
    var activeId = rangeParam;
    if (!activeId && tabs.length) activeId = tabs[0].id;

    document.title = book.label + " · 优益思达国际课程中心";

    var prog = Y.vocabProgress(stats.lists);
    var chips = tabs.map(function (t) {
      return '<button type="button" class="chip vocab-range-chip' + (t.id === activeId ? " is-active" : "") +
        '" data-range="' + Y.esc(t.id) + '">' + Y.esc(t.label) + '</button>';
    }).join("");

    var panels = tabs.map(function (t) {
      var rows = stats.lists.filter(function (it) {
        var n = Y.vocabListNo(it);
        return n >= t.start && n <= t.end;
      }).map(listRowHTML).join("");
      return '<div class="vocab-range-panel' + (t.id === activeId ? " is-active" : "") +
        '" data-range="' + Y.esc(t.id) + '"><div class="vocab-list-grid">' + rows + '</div></div>';
    }).join("");

    contentEl.innerHTML = heroHTML(book, stats, prog) +
      '<div class="vocab-range-wrap">' +
      '<div class="vocab-range-chips">' + chips + '</div>' +
      panels +
      '</div>';

    contentEl.querySelector(".vocab-range-chips").addEventListener("click", function (e) {
      var btn = e.target.closest(".vocab-range-chip");
      if (!btn) return;
      var id = btn.getAttribute("data-range");
      contentEl.querySelectorAll(".vocab-range-chip").forEach(function (c) {
        c.classList.toggle("is-active", c.getAttribute("data-range") === id);
      });
      contentEl.querySelectorAll(".vocab-range-panel").forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-range") === id);
      });
      history.replaceState(null, "", "vocab.html?book=" + encodeURIComponent(bookKey) + "&range=" + encodeURIComponent(id));
    });
  }

  function renderSpecial(stats) {
    var book = stats.book;
    document.title = book.label + " · 优益思达国际课程中心";

    var prog = Y.vocabProgress(stats.lists);
    var blocks = SPECIAL_SECTIONS.map(function (sec) {
      var its = stats.lists.filter(function (it) { return it.subject === sec.subject; });
      its.sort(function (a, b) {
        return String(a.title).localeCompare(String(b.title), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
      });
      var body = its.length
        ? '<div class="exam-grid exam-grid--compact">' + its.map(function (it) { return Y.cardHTML(it, ""); }).join("") + '</div>'
        : '<div class="soon-box">该板块即将上线，敬请期待。</div>';
      return '<div class="test-block"><h2>' + Y.esc(sec.label) + ' <span class="cnt">' + its.length + ' 份</span></h2>' + body + '</div>';
    }).join("");

    contentEl.innerHTML = heroHTML(book, stats, prog) + blocks;
  }

  Y.load().then(function (items) {
    var study = items.filter(function (it) { return it.zone === "study"; });
    var stats = Y.vocabBookStats(study, bookKey);

    if (!stats || !stats.total) {
      fail("未找到该单词书内容，请从<a href=\"zone.html?zone=study&s=vocab\">学习区</a>重新进入。");
      return;
    }

    if (bookKey === "special") renderSpecial(stats);
    else renderListBook(stats);
  }).catch(function (err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : err.message;
    fail(msg);
  });
})();
