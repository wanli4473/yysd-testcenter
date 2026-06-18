/* =========================================================================
   app.js — homepage exam list
   Loads exams/manifest.json, renders cards, handles filtering, marks completed
   ========================================================================= */
(function () {
  "use strict";

  var TYPE_LABEL = {
    listening: "听力", reading: "阅读", writing: "写作",
    speaking: "口语", full: "全套", other: "练习"
  };
  var CAT_LABEL = { academic: "学术类 A", general: "培训类 G", "": "" };

  var container = document.getElementById("exam-container");
  var filtersEl = document.getElementById("filters");
  var allExams = [];
  var activeFilter = "all";

  // ---- helpers -----------------------------------------------------------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function completedMap() {
    try { return JSON.parse(localStorage.getItem("yysd:results") || "{}"); }
    catch (e) { return {}; }
  }

  function typeOf(ex) {
    var t = (ex.type || "other").toLowerCase();
    return TYPE_LABEL[t] ? t : "other";
  }

  // ---- rendering ---------------------------------------------------------
  function cardHTML(ex) {
    var t = typeOf(ex);
    var done = completedMap()[ex.id];
    var cat = CAT_LABEL[(ex.category || "").toLowerCase()] || "";
    var dur = ex.duration ? ex.duration + " 分钟" : "不限时";
    var doneText = done ? '已完成 · ' + (done.score != null ? done.score + (done.total ? "/" + done.total : "") : "✓") : "";

    return '' +
      '<a class="exam-card ' + (done ? "is-done" : "") + '" href="exam.html?id=' + encodeURIComponent(ex.id) + '">' +
        '<span class="done-flag">' + esc(doneText) + '</span>' +
        '<div class="exam-card__top">' +
          '<span class="badge badge--' + t + '">' + TYPE_LABEL[t] + '</span>' +
          (cat ? '<span class="tag-cat">' + esc(cat) + '</span>' : '') +
        '</div>' +
        '<h3>' + esc(ex.title) + '</h3>' +
        '<p>' + esc(ex.description || "点击进入考场，按真实考试要求完成本套试卷。") + '</p>' +
        '<div class="exam-card__meta">' +
          '<span>⏱️ ' + esc(dur) + '</span>' +
          (ex.added ? '<span>📅 ' + esc(ex.added) + '</span>' : '') +
        '</div>' +
        '<div class="exam-card__foot">' +
          '<span class="btn btn--primary btn--sm" style="pointer-events:none">进入考场 →</span>' +
        '</div>' +
      '</a>';
  }

  function render() {
    var list = activeFilter === "all"
      ? allExams
      : allExams.filter(function (e) { return typeOf(e) === activeFilter; });

    if (!list.length) {
      container.innerHTML =
        '<div class="state"><h3>暂无该类别的模考</h3>' +
        '<p>换个筛选条件看看，或等待管理员上传新试卷。</p></div>';
      return;
    }
    container.innerHTML = '<div class="exam-grid">' +
      list.map(cardHTML).join("") + '</div>';
  }

  function updateStats() {
    var total = document.getElementById("stat-total");
    var doneEl = document.getElementById("stat-done");
    if (total) total.textContent = allExams.length;
    if (doneEl) doneEl.textContent = Object.keys(completedMap()).length;
  }

  // ---- filters -----------------------------------------------------------
  if (filtersEl) {
    filtersEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      filtersEl.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
      btn.classList.add("is-active");
      activeFilter = btn.getAttribute("data-filter");
      render();
    });
  }

  // ---- load --------------------------------------------------------------
  function showError(msg) {
    container.innerHTML =
      '<div class="state"><h3>列表加载失败</h3><p>' + esc(msg) + '</p></div>';
  }

  fetch("exams/manifest.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("manifest.json 未找到 (HTTP " + r.status + ")");
      return r.json();
    })
    .then(function (data) {
      allExams = (data && data.exams) || [];
      // newest first if "added" present
      allExams.sort(function (a, b) {
        return String(b.added || "").localeCompare(String(a.added || ""));
      });
      if (!allExams.length) {
        container.innerHTML =
          '<div class="state"><h3>题库还是空的</h3>' +
          '<p>管理员上传第一套试卷后，这里就会显示模考列表。</p>' +
          '<p style="margin-top:14px"><a class="btn btn--ghost btn--sm" href="admin/index.html">前往管理后台 →</a></p></div>';
      } else {
        render();
      }
      updateStats();
    })
    .catch(function (err) {
      // Friendly hint when opened via file:// (fetch blocked by browser)
      if (location.protocol === "file:") {
        showError("请通过网址（http://）访问本站。直接双击打开本地文件时浏览器会拦截数据加载。");
      } else {
        showError(err.message);
      }
    });

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
