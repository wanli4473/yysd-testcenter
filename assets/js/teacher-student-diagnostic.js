/* teacher-student-diagnostic.js */
(function () {
  "use strict";
  var T = window.YYSD_TEACHER;
  var Charts = window.YYSD_DIAG_CHARTS || {};
  var root = document.getElementById("stu-root");
  var logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", function () { T.logout(); });

  var LEVEL = { high_school: "高中", cet4: "四级", ielts: "雅思" };
  var RATING = { excellent: "优秀", good: "良好", weak: "需加强" };
  var COLORS = { high_school: "#2c3e6b", cet4: "#c8963e", ielts: "#3a7d5a" };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function pct(x) {
    return Math.round((Number(x) || 0) * 100) + "%";
  }

  if (!T.getToken || !T.getToken()) {
    location.replace("teacher-login.html?next=" + encodeURIComponent(location.pathname + location.search));
    return;
  }

  var id = Number(new URLSearchParams(location.search).get("id") || 0);
  if (!id) {
    root.innerHTML = '<p class="diag-msg">缺少学生 ID</p><a href="teacher-diagnostic.html">返回总览</a>';
    return;
  }

  function stageCells(stages) {
    var map = {};
    (stages || []).forEach(function (s) {
      if (s && s.level) map[s.level] = s;
    });
    return ["high_school", "cet4", "ielts"].map(function (lv) {
      var s = map[lv];
      if (!s) return "<td>—</td>";
      return (
        "<td>" +
        esc(pct(s.accuracy)) +
        " · " +
        esc(RATING[s.rating] || "") +
        "</td>"
      );
    }).join("");
  }

  function mistakesTable(mistakes) {
    if (!mistakes || !mistakes.length) {
      return '<p class="diag-lead">本次无错题记录</p>';
    }
    return (
      '<div class="diag-table-wrap"><table class="diag-table"><thead><tr>' +
      "<th>单词</th><th>词库</th><th>题型</th><th>作答</th><th>正确</th></tr></thead><tbody>" +
      mistakes
        .map(function (m) {
          return (
            "<tr><td><strong>" +
            esc(m.word || m.correct_answer) +
            "</strong><div class=\"diag-mist-meta\">" +
            esc(m.meaning || "") +
            "</div></td><td>" +
            esc(LEVEL[m.level] || m.level) +
            "</td><td>" +
            esc(m.question_type || "") +
            '</td><td class="diag-ua">' +
            esc(m.user_answer || "（空）") +
            '</td><td class="diag-ca">' +
            esc(m.correct_answer) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }

  function render(data) {
    var stu = data.student || {};
    var name = stu.displayName || stu.phone || "#" + stu.id;
    document.getElementById("stu-title").textContent = name + " · 词汇诊断";
    document.getElementById("stu-sub").textContent =
      "共 " + (data.sessions || []).length + " 次已完成测试";

    var trend = data.trend || {};
    var series = ["high_school", "cet4", "ielts"].map(function (lv) {
      return {
        label: LEVEL[lv],
        color: COLORS[lv],
        points: (trend[lv] || []).map(function (p) {
          return {
            y: p.accuracy,
            xLabel: p.at ? new Date(p.at).toLocaleDateString("zh-CN") : ""
          };
        })
      };
    }).filter(function (s) { return s.points.length; });

    var chartHtml = series.length
      ? (Charts.lineChartSVG
        ? Charts.lineChartSVG(series)
        : '<p class="diag-lead">图表脚本未加载</p>')
      : '<p class="diag-lead">暂无多次测试，无法绘制趋势</p>';

    var timeline = (data.sessions || [])
      .map(function (s, idx) {
        var open = idx === 0 ? " is-open" : "";
        return (
          '<details class="diag-timeline__item' +
          open +
          '"' +
          (idx === 0 ? " open" : "") +
          ">" +
          "<summary>" +
          esc(s.tested_at ? new Date(s.tested_at).toLocaleString("zh-CN") : "—") +
          " · 推荐 " +
          esc(LEVEL[s.recommended_start_level] || s.recommended_start_level || "—") +
          " · 错题 " +
          ((s.mistakes && s.mistakes.length) || 0) +
          "</summary>" +
          '<div class="diag-timeline__body">' +
          '<div class="diag-table-wrap"><table class="diag-table"><thead><tr>' +
          "<th>高中</th><th>四级</th><th>雅思</th></tr></thead><tbody><tr>" +
          stageCells(s.stages) +
          "</tr></tbody></table></div>" +
          (s.advice_text
            ? '<p class="diag-advice">' + esc(s.advice_text) + "</p>"
            : "") +
          "<h3 class=\"diag-h3\">错题明细</h3>" +
          mistakesTable(s.mistakes) +
          "</div></details>"
        );
      })
      .join("");

    root.innerHTML =
      '<section class="diag-card diag-card--wide">' +
      "<h2 class=\"diag-h2\">能力变化</h2>" +
      '<p class="diag-lead">同一词库多次测试正确率趋势</p>' +
      chartHtml +
      "</section>" +
      '<section class="diag-card diag-card--wide" style="margin-top:16px">' +
      "<h2 class=\"diag-h2\">测试时间轴</h2>" +
      (timeline || '<p class="diag-lead">尚无完成的诊断记录</p>') +
      "</section>" +
      '<p style="margin-top:16px"><a class="btn btn--ghost btn--sm" href="teacher-diagnostic.html">← 返回总览</a></p>';
  }

  T.api("/api/teacher/student-diagnostic/" + id)
    .then(render)
    .catch(function (e) {
      root.innerHTML =
        '<p class="diag-msg">' +
        esc(e.message || "加载失败") +
        '</p><a href="teacher-diagnostic.html">返回</a>';
    });
})();
