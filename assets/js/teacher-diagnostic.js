/* teacher-diagnostic.js — class vocab diagnostic overview + hot words */
(function () {
  "use strict";
  var T = window.YYSD_TEACHER;
  var root = document.getElementById("diag-overview");
  var hotRoot = document.getElementById("diag-hot");
  var logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", function () { T.logout(); });

  var LEVEL = { high_school: "高中", cet4: "四级", ielts: "雅思" };
  var RATING = { excellent: "优秀", good: "良好", weak: "需加强" };
  var students = [];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function cell(stage) {
    if (!stage) return "—";
    return (
      Math.round((stage.accuracy || 0) * 100) +
      "% · " +
      (RATING[stage.rating] || stage.rating || "")
    );
  }

  function render() {
    var filt = (document.getElementById("filt-rec") || {}).value || "";
    var rows = students.filter(function (s) {
      if (!filt) return true;
      return s.recommended_start_level === filt;
    });
    rows.sort(function (a, b) {
      var ra = (a.high_school && a.high_school.rating) || "zzz";
      var rb = (b.high_school && b.high_school.rating) || "zzz";
      return ra.localeCompare(rb);
    });

    if (!rows.length) {
      root.innerHTML = '<p class="diag-lead">暂无诊断数据。</p>';
      return;
    }

    root.innerHTML =
      '<table class="diag-table"><thead><tr>' +
      "<th>学生</th><th>高中</th><th>四级</th><th>雅思</th><th>推荐起始</th><th>最近测试</th>" +
      "</tr></thead><tbody>" +
      rows
        .map(function (s) {
          var name = s.displayName || s.phone || "#" + s.id;
          var when = s.tested_at
            ? new Date(s.tested_at).toLocaleString("zh-CN")
            : "未测";
          return (
            '<tr class="' +
            (s.alert ? "is-alert" : "") +
            '"><td><a href="teacher-student-diagnostic.html?id=' +
            s.id +
            '">' +
            esc(name) +
            "</a></td><td>" +
            esc(cell(s.high_school)) +
            "</td><td>" +
            esc(cell(s.cet4)) +
            "</td><td>" +
            esc(cell(s.ielts)) +
            "</td><td>" +
            esc(LEVEL[s.recommended_start_level] || s.recommended_start_level || "—") +
            "</td><td>" +
            esc(when) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table>";
  }

  function renderHot(words) {
    if (!hotRoot) return;
    if (!words || !words.length) {
      hotRoot.innerHTML = '<p class="diag-lead">班级暂无未掌握错词。</p>';
      return;
    }
    var max = words[0].cnt || 1;
    hotRoot.innerHTML =
      '<ol class="diag-hot-list">' +
      words
        .map(function (w, i) {
          var bar = Math.round(((w.cnt || 0) / max) * 100);
          return (
            "<li><span class=\"diag-hot-list__rank\">" +
            (i + 1) +
            "</span><div class=\"diag-hot-list__main\">" +
            "<strong>" +
            esc(w.word || w.word_id) +
            "</strong>" +
            '<span class="diag-mist-meta">' +
            esc(LEVEL[w.level] || w.level || "") +
            " · " +
            esc(w.meaning || "") +
            "</span>" +
            '<div class="diag-hot-list__bar"><i style="width:' +
            bar +
            '%"></i></div></div>' +
            '<span class="diag-hot-list__cnt">' +
            w.cnt +
            "</span></li>"
          );
        })
        .join("") +
      "</ol>";
  }

  function load() {
    root.innerHTML =
      '<div class="state state--brand"><div class="spinner spinner--brand"></div></div>';
    if (hotRoot) {
      hotRoot.innerHTML =
        '<div class="state state--brand"><div class="spinner spinner--brand"></div></div>';
    }
    Promise.all([
      T.api("/api/teacher/diagnostic-overview"),
      T.api("/api/teacher/diagnostic-hot-words")
    ])
      .then(function (res) {
        students = res[0].students || [];
        render();
        renderHot((res[1] && res[1].words) || []);
      })
      .catch(function (e) {
        root.innerHTML = '<p class="diag-msg">' + esc(e.message || "加载失败") + "</p>";
        if (hotRoot) hotRoot.innerHTML = "";
      });
  }

  var filt = document.getElementById("filt-rec");
  if (filt) filt.addEventListener("change", render);
  var refresh = document.getElementById("refresh-btn");
  if (refresh) refresh.addEventListener("click", load);

  if (!T.getToken || !T.getToken()) {
    location.replace("teacher-login.html?next=" + encodeURIComponent(location.pathname));
    return;
  }
  load();
})();
