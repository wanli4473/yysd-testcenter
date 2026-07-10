/* =========================================================================
   alevel-view.js — PDF preview + download
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var A = window.YYSD_ALEVEL;
  var P = window.YYSD_ALEVEL_PAPERS;
  var id = (new URLSearchParams(location.search).get("id") || "").trim();
  var contentEl = document.getElementById("content");

  document.getElementById("year").textContent = new Date().getFullYear();
  var navLink = document.querySelector('#nav a[data-zone="mock"]');
  if (navLink) navLink.classList.add("is-active");

  if (!id) {
    contentEl.innerHTML = '<div class="state state--brand"><h3>缺少试卷 ID</h3>' +
      '<p><a href="alevel.html">返回 A-Level 首页</a></p></div>';
    return;
  }

  A.loadCatalog().then(function (catalog) {
    var item = A.itemById(catalog, id);
    if (!item) {
      contentEl.innerHTML = '<div class="state state--brand"><h3>未找到该试卷</h3>' +
        '<p><a href="alevel.html">返回 A-Level 首页</a></p></div>';
      return;
    }
    document.title = item.title + " · 优益思达";

    document.getElementById("view-title").textContent = item.title;
    var comp = P.componentMeta(item.code, item.paper);
    var off = P.officialCode(item.code, item.paper);
    document.getElementById("view-meta").textContent =
      off + " · " + comp.short + " " + comp.nameZh + " · " +
      item.year + " · " + (item.seasonLabelZh || item.season) + " · " +
      (item.typeLabelZh || item.type);

    document.getElementById("back-subject").setAttribute("href", A.subjectHref(item.board, item.code, ""));

    var pdfUrl = A.fileHref(item, "");
    document.getElementById("btn-download").setAttribute("href", pdfUrl);
    document.getElementById("pdf-frame").src = pdfUrl;
    document.getElementById("pdf-frame").title = item.title;

    document.getElementById("view-shell").hidden = false;
    var loading = contentEl.querySelector(".state");
    if (loading) loading.remove();
  }).catch(function (err) {
    contentEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + Y.esc(err.message) + "</p></div>";
  });
})();
