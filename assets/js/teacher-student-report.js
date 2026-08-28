/* teacher-student-report.js — printable monthly 学情报告 */
(function () {
  "use strict";
  var T = window.YYSD_TEACHER;
  var Y = window.YYSD;
  var STATUS = { PENDING: "待完成", COMPLETED: "已完成", OVERDUE: "已逾期" };
  var SKILL = { listening: "听力", reading: "阅读", writing: "写作", speaking: "口语" };
  var q = new URLSearchParams(location.search);
  var studentId = Number(q.get("student") || 0);
  var month = q.get("month") || "";
  var root = document.getElementById("rpt-root");
  var back = document.getElementById("rpt-back");
  var printBtn = document.getElementById("rpt-print");

  function esc(s) { return Y ? Y.esc(s) : String(s == null ? "" : s); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function monthLabel(ym) {
    var p = String(ym || "").split("-");
    if (p.length !== 2) return ym || "";
    return Number(p[0]) + "年" + Number(p[1]) + "月";
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso).slice(0, 10);
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    } catch (e) { return String(iso).slice(0, 10); }
  }
  function fmtDuration(sec) {
    if (sec == null || sec === "" || !isFinite(Number(sec))) return "—";
    var n = Math.max(0, Math.round(Number(sec)));
    var h = Math.floor(n / 3600);
    var m = Math.floor((n % 3600) / 60);
    var s = n % 60;
    if (h > 0) return h + "小时" + (m ? m + "分" : "");
    if (m > 0) return m + "分" + (s ? s + "秒" : "");
    return s + "秒";
  }
  function fmtScore(row) {
    if (!row) return "—";
    if (row.score == null && row.band == null) return "—";
    var s = "";
    if (row.score != null) {
      s = String(row.score);
      if (row.total != null) s += " / " + row.total;
    }
    if (row.band != null) s += (s ? " · " : "") + "Band " + row.band;
    return s || "—";
  }
  function meter(pct) {
    var n = pct == null ? 0 : Math.max(0, Math.min(100, Number(pct)));
    return '<div class="rpt-meter" aria-hidden="true"><i style="width:' + n + '%"></i></div>';
  }
  function nameOf(d) {
    return (d.student && d.student.displayName) || (d.student && d.student.phone) || "学生";
  }
  function teacherOf(d) {
    return (d.teacher && d.teacher.name) || (d.teacher && d.teacher.phone) || "教师";
  }
  function rowsOf(d) {
    return (d.assignments || []).concat(d.practices || []).concat(d.diagnostics || []);
  }
  function wrongBlock(item) {
    if (item.writingTask1 || item.writingTask2) {
      return (item.writingTask1 ? "<h4>Task 1</h4><pre class=\"rpt-essay\">" + esc(item.writingTask1) + "</pre>" : "") +
        (item.writingTask2 ? "<h4>Task 2</h4><pre class=\"rpt-essay\">" + esc(item.writingTask2) + "</pre>" : "");
    }
    var wrong = item.wrong || [];
    var mistakes = item.mistakes || [];
    if (wrong.length) {
      return "<ul class=\"rpt-wrong\">" + wrong.map(function (w) {
        return "<li><b>第 " + esc(String(w.no)) + " 题</b>　作答 " + esc(w.ua || "未作答") +
          "　正确 " + esc(w.ans || "—") +
          (w.stem ? "<div>" + esc(w.stem) + "</div>" : "") +
          (w.explain ? "<div>" + esc(w.explain) + "</div>" : "") +
          "</li>";
      }).join("") + "</ul>";
    }
    if (mistakes.length) {
      return "<ul class=\"rpt-wrong\">" + mistakes.map(function (m) {
        return "<li><b>" + esc(m.word || "") + "</b> " + esc(m.meaning || "") +
          "　作答 " + esc(m.ua || "未作答") + "　正确 " + esc(m.ans || "—") + "</li>";
      }).join("") + "</ul>";
    }
    return "";
  }

  function render(d) {
    document.title = nameOf(d) + " · " + monthLabel(d.month) + "学情报告";
    if (back) back.href = "teacher.html?student=" + (d.student && d.student.id || studentId);
    var s = d.summary || {};
    var cover =
      '<header class="rpt-cover">' +
        '<p class="eyebrow">MONTHLY REPORT</p>' +
        "<h1>" + esc(nameOf(d)) + " · " + esc(monthLabel(d.month)) + "学情报告</h1>" +
        "<p>导出教师 " + esc(teacherOf(d)) +
        (d.student && d.student.phone ? "　学生 " + esc(d.student.phone) : "") + "</p>" +
      "</header>";
    if (d.empty) {
      root.innerHTML = cover + '<p class="rpt-empty">本月无记录</p>';
      return;
    }
    var rate = s.completionRate == null ? "—" : s.completionRate + "%";
    var kpis =
      '<div class="rpt-kpis">' +
        "<div class=\"rpt-kpi\"><b>" + (s.assigned || 0) + "</b><span>布置作业</span></div>" +
        "<div class=\"rpt-kpi\"><b>" + esc(String(rate)) + "</b><span>作业完成率</span></div>" +
        "<div class=\"rpt-kpi\"><b>" + (s.practiceCount || 0) + "</b><span>自练 / 模考 / 单词</span></div>" +
        "<div class=\"rpt-kpi\"><b>" + (s.practiceAvgPercent == null ? "—" : s.practiceAvgPercent + "%") +
          "</b><span>自练平均得分率</span></div>" +
      "</div>";
    var charts = "<h2>图表</h2><p>作业完成率</p>" + meter(s.completionRate == null ? 0 : s.completionRate);
    var skills = d.skills || {};
    charts += Object.keys(SKILL).map(function (k) {
      var sk = skills[k] || {};
      if (!sk.n) return "";
      var label = sk.avgPercent != null ? sk.avgPercent + "%" : (sk.avgBand != null ? "Band " + sk.avgBand : "—");
      return '<div class="rpt-skill"><span>' + SKILL[k] + "</span>" +
        meter(sk.avgPercent) + "<span>" + esc(label) + "</span></div>";
    }).join("");
    if (s.practiceAvgBand != null) {
      charts += "<p>自练平均 Band " + esc(String(s.practiceAvgBand)) + "</p>";
    }
    var listRows = rowsOf(d).map(function (item) {
      return "<tr><td>" + esc(item.title) + "</td><td>" + esc(item.kind) + "</td><td>" +
        esc(STATUS[item.status] || item.status || "—") + "</td><td>" + esc(fmtScore(item)) +
        "</td><td>" + esc(fmtDuration(item.durationSec)) + "</td><td>" + esc(fmtDate(item.date)) + "</td></tr>";
    }).join("");
    var list = "<h2>本月记录</h2><table><thead><tr><th>名称</th><th>类型</th><th>状态</th><th>成绩</th><th>用时</th><th>日期</th></tr></thead><tbody>" +
      listRows + "</tbody></table>";
    var detailItems = rowsOf(d).filter(function (item) {
      return (item.wrong && item.wrong.length) || item.writingTask1 || item.writingTask2 || (item.mistakes && item.mistakes.length);
    });
    var details = "<h2>错题与作文</h2>" + (detailItems.length ? detailItems.map(function (item) {
      return '<article class="rpt-item"><h3>' + esc(item.title) + " · " + esc(item.kind) + "</h3>" +
        '<p class="rpt-meta">' + esc(fmtDate(item.date)) + " · " + esc(fmtScore(item)) + "</p>" +
        wrongBlock(item) + "</article>";
    }).join("") : "<p>本月没有上报的错题或作文。</p>");
    root.innerHTML = cover + kpis + charts + list + details;
  }

  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
  if (!studentId) {
    root.innerHTML = '<p class="err">缺少学生</p>';
    return;
  }
  T.api("/api/teacher/students/" + studentId + "/report" + (month ? "?month=" + encodeURIComponent(month) : ""))
    .then(function (d) {
      render(d || {});
    })
    .catch(function (e) {
      root.innerHTML = '<p class="err">' + esc(e.message || "加载失败") + "</p>";
    });
})();
