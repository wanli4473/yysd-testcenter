/* =========================================================================
   alevel.js — exam board hub (CAIE / Edexcel / Oxford AQA)
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var A = window.YYSD_ALEVEL;
  var contentEl = document.getElementById("content");
  var board = (new URLSearchParams(location.search).get("board") || "caie").trim();

  document.title = "A-Level 真题库 · 优益思达国际课程中心";
  var navLink = document.querySelector('#nav a[data-zone="mock"]');
  if (navLink) navLink.classList.add("is-active");
  document.getElementById("year").textContent = new Date().getFullYear();

  function render(catalog) {
    var qp = A.qpCount(catalog);
    var current = A.boardOf(catalog, board) || catalog.boards[0];
    if (current && current.id !== board) {
      board = current.id;
    }
    var boardLabel = current ? (current.labelZh || current.label) : "A-Level";

    var crumb = '<div class="minimal-crumb cam-crumb">' +
      '<a href="index.html">首页</a> <span class="crumb-sep" aria-hidden="true">★</span> ' +
      '<a href="zone.html?zone=mock&s=alevel">真题区</a> <span class="crumb-sep" aria-hidden="true">★</span> ' +
      "A-Level 真题库</div>";

    var hero = '<div class="cam-hero alevel-hero">' +
      '<div class="cam-hero__badge alevel-hero__badge"><div class="lbl">A-LEVEL</div><div class="num">📚</div></div>' +
      "<div><h1>A-Level 历年真题</h1>" +
      '<div class="meta">CAIE · Edexcel · Oxford AQA · 已收录 ' + qp + " 套真题 · 免费预览下载</div></div></div>";

    var tabs = (catalog.boards || []).map(function (b) {
      var active = b.id === board;
      var empty = !b.subjects || !b.subjects.length;
      return '<button type="button" class="alevel-board-tab' + (active ? " is-active" : "") +
        (empty ? " is-soon" : "") + '" data-board="' + Y.esc(b.id) + '"' +
        (empty ? ' disabled title="筹备中"' : "") + ">" +
        Y.esc(b.labelZh || b.label) + "</button>";
    }).join("");

    contentEl.innerHTML = crumb + hero +
      '<div class="alevel-board-tabs" role="tablist">' + tabs + "</div>" +
      '<div class="alevel-board-heading"><span class="subject-dot"></span><h2>' + Y.esc(boardLabel) + "</h2></div>" +
      A.hubBoardHTML(catalog, board, "") +
      '<p class="alevel-footnote">解析与逐步详解将在后续版本开放付费解锁；当前真题与 Mark Scheme 均可免费使用。</p>';
  }

  contentEl.addEventListener("click", function (e) {
    var tab = e.target.closest(".alevel-board-tab:not(.is-soon)");
    if (!tab) return;
    var next = tab.getAttribute("data-board");
    if (next && next !== board) {
      location.href = "alevel.html?board=" + encodeURIComponent(next);
    }
  });

  A.loadCatalog().then(render).catch(function (err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : err.message;
    contentEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + Y.esc(msg) + "</p></div>";
  });
})();
