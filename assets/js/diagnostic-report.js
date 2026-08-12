/* diagnostic-report.js */
(function () {
  "use strict";
  var A = window.YYSD_AUTH;
  var Y = window.YYSD;
  var Charts = window.YYSD_DIAG_CHARTS || {};
  var contentEl = document.getElementById("content");
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var RATING_STAR = {
    excellent: "优秀 ★★★",
    good: "良好 ★★☆",
    weak: "需加强 ★☆☆"
  };
  var LEVEL_NAME = {
    high_school: "高中词汇",
    cet4: "四级词汇",
    ielts: "雅思词汇"
  };

  function esc(s) {
    return Y && Y.esc ? Y.esc(s) : String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function thermoHTML(stage) {
    if (!stage) {
      return '<p class="diag-lead">未参加本阶段</p>';
    }
    var pct = Math.round((stage.accuracy || 0) * 100);
    var lo = Math.round((stage.ci_lower || 0) * 100);
    var hi = Math.round((stage.ci_upper || 0) * 100);
    var rating = stage.rating || "weak";
    return (
      '<div class="diag-thermo">' +
      '<div class="diag-thermo__label"><span>' +
      esc(stage.name || LEVEL_NAME[stage.level] || "") +
      " · " +
      pct +
      "%</span><span class=\"diag-rating diag-rating--" +
      esc(rating) +
      '">' +
      esc(RATING_STAR[rating] || "") +
      "</span></div>" +
      '<div class="diag-thermo__track">' +
      '<div class="diag-thermo__fill diag-thermo__fill--' +
      esc(rating) +
      '" style="width:' +
      pct +
      '%"></div>' +
      '<div class="diag-thermo__ci" style="left:' +
      lo +
      "%;width:" +
      Math.max(2, hi - lo) +
      '%" title="95% CI"></div>' +
      "</div>" +
      '<p class="diag-mist-meta">95% 置信区间 ' +
      lo +
      "% – " +
      hi +
      "% · 拼写 " +
      Math.round((stage.spelling_accuracy || 0) * 100) +
      "%（" +
      (stage.spelling_correct || 0) +
      "/" +
      (stage.spelling_total || 0) +
      "）</p></div>"
    );
  }

  if (!A || !A.getToken || !A.getToken()) {
    contentEl.innerHTML =
      '<div class="diag-card"><p class="diag-lead">请先登录</p><a class="btn btn--primary" href="login.html">去登录</a></div>';
    return;
  }

  var params = new URLSearchParams(location.search);
  var sid = params.get("session");
  var isPlacement = params.get("placement") === "1";
  if (!sid) {
    contentEl.innerHTML =
      '<div class="diag-card"><p class="diag-lead">缺少会话参数</p><a href="diagnostic.html">返回诊断</a></div>';
    return;
  }

  A.api("/api/diagnostic/session/" + encodeURIComponent(sid) + "/report")
    .then(function (d) {
      var report = d.report || {};
      var stages = report.stages || [];
      var vals = { high_school: 0, cet4: 0, ielts: 0 };
      var any = false;
      stages.forEach(function (s) {
        if (s && s.level) {
          vals[s.level] = s.accuracy || 0;
          any = true;
        }
      });
      var stageHtml = ["high_school", "cet4", "ielts"]
        .map(function (lv) {
          var found = (stages || []).find(function (x) { return x && x.level === lv; });
          return (
            '<section style="margin:20px 0">' +
            (found ? thermoHTML(found) : '<p class="diag-lead">' + esc(LEVEL_NAME[lv]) + " · 未参加</p>") +
            "</section>"
          );
        })
        .join("");

      var radar =
        any && Charts.radarSVG
          ? '<div class="diag-report-radar"><h2 class="diag-h2">能力雷达</h2>' +
            Charts.radarSVG(vals) +
            "</div>"
          : "";

      var bookKey =
        window.YYSD_DIAG_GATE && window.YYSD_DIAG_GATE.bookForLevel
          ? window.YYSD_DIAG_GATE.bookForLevel(report.recommended_start_level)
          : report.recommended_start_level === "cet4"
            ? "cet4"
            : report.recommended_start_level === "ielts"
              ? "special"
              : "gaozhong";
      var bookLabel =
        LEVEL_NAME[report.recommended_start_level] ||
        report.recommended_start_level ||
        "推荐词库";

      var actions = isPlacement
        ? '<a class="btn btn--primary" href="vocab-shelf.html?view=catalog">进入词库书架 · ' +
          esc(bookLabel) +
          "</a>" +
          '<a class="btn btn--ghost" href="diagnostic-mistakes.html">查看诊断错题</a>' +
          '<a class="btn btn--ghost" href="zone.html?zone=study&s=vocab">打开单词区</a>'
        : '<a class="btn btn--primary" href="diagnostic-mistakes.html">进入错题本</a>' +
          '<a class="btn btn--ghost" href="diagnostic.html">再测一次</a>';

      contentEl.innerHTML =
        '<div class="diag-card">' +
        "<h1>" +
        (isPlacement ? "首次测评报告" : "能力报告") +
        "</h1>" +
        '<p class="diag-lead">推荐起始：<strong>' +
        esc(LEVEL_NAME[report.recommended_start_level] || report.recommended_start_level || "—") +
        "</strong> · 用时 " +
        Math.round((report.total_time_seconds || 0) / 60) +
        " 分钟</p>" +
        radar +
        stageHtml +
        '<div class="diag-advice">' +
        (isPlacement ? "<h2 class=\"diag-h2\">学习建议</h2>" : "") +
        esc(report.advice_text || "") +
        "</div>" +
        '<div class="diag-actions">' +
        actions +
        "</div></div>";
    })
    .catch(function (e) {
      contentEl.innerHTML =
        '<div class="diag-card"><p class="diag-msg">' +
        esc(e.message || "加载失败") +
        '</p><a href="diagnostic.html">返回</a></div>';
    });
})();
