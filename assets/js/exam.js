/* =========================================================================
   exam.js — exam viewer
   - Loads the chosen exam HTML into an iframe
   - Optional countdown timer based on the exam's "duration"
   - Listens for a score message from the exam (postMessage protocol) and
     records the result to localStorage so it appears in "我的成绩"
   ========================================================================= */
(function () {
  "use strict";

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  var id = qs("id");
  var frame = document.getElementById("exam-frame");
  var titleEl = document.getElementById("v-title");
  var metaEl = document.getElementById("v-meta");
  var timerEl = document.getElementById("timer");

  var exam = null;
  var timerHandle = null;

  if (!id) { fail("缺少试卷编号。"); return; }

  fetch("exams/manifest.json", { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var list = (data && data.exams) || [];
      exam = list.filter(function (e) { return e.id === id; })[0];
      if (!exam) { fail("找不到该试卷，可能已被移除。"); return; }
      start();
    })
    .catch(function () {
      if (location.protocol === "file:") {
        fail("请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。");
      } else {
        fail("试卷信息加载失败。");
      }
    });

  function fail(msg) {
    titleEl.textContent = "无法打开试卷";
    frame.removeAttribute("src");
    var doc = frame.contentDocument;
    doc.open();
    doc.write('<div style="font-family:sans-serif;padding:60px;text-align:center;color:#6b7589">' +
      '<h2 style="color:#14213d">😕 ' + msg + '</h2>' +
      '<p><a href="index.html" style="color:#c8102e">← 返回模考列表</a></p></div>');
    doc.close();
  }

  function start() {
    titleEl.textContent = exam.title;
    document.title = exam.title + " · 考场";
    metaEl.textContent = [
      ({ listening: "听力", reading: "阅读", writing: "写作", speaking: "口语", full: "全套" })[exam.type] || "",
      exam.duration ? exam.duration + " 分钟" : ""
    ].filter(Boolean).join(" · ");

    frame.src = "exams/" + exam.file;
    if (exam.duration > 0) startTimer(exam.duration * 60);

    document.getElementById("back-btn").addEventListener("click", function (e) {
      if (!confirm("确定退出考场吗？未交卷的作答可能不会被保存。")) e.preventDefault();
    });
  }

  // ---- timer -------------------------------------------------------------
  function startTimer(seconds) {
    timerEl.hidden = false;
    function tick() {
      var m = Math.floor(seconds / 60), s = seconds % 60;
      timerEl.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
      if (seconds <= 60) timerEl.classList.add("is-low");
      if (seconds <= 0) {
        clearInterval(timerHandle);
        timerEl.textContent = "时间到";
        notifyFrame({ type: "yysd:time-up" });
        alert("⏰ 考试时间到！请尽快交卷。");
        return;
      }
      seconds--;
    }
    tick();
    timerHandle = setInterval(tick, 1000);
  }

  function notifyFrame(msg) {
    try { frame.contentWindow.postMessage(msg, "*"); } catch (e) {}
  }

  // ---- score capture -----------------------------------------------------
  // Exam papers can OPTIONALLY report a score back to the site by calling:
  //   window.parent.postMessage(
  //     { type: "yysd:score", score: 28, total: 40, band: 6.5 }, "*");
  // If they don't, the exam still works — it just won't auto-record a result.
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.type !== "yysd:score" || !exam) return;
    saveResult({
      score: d.score, total: d.total, band: d.band,
      detail: d.detail || null
    });
  });

  function saveResult(r) {
    var store = {};
    try { store = JSON.parse(localStorage.getItem("yysd:results") || "{}"); } catch (e) {}
    store[exam.id] = {
      id: exam.id,
      title: exam.title,
      type: exam.type,
      score: (r.score != null ? r.score : null),
      total: (r.total != null ? r.total : null),
      band: (r.band != null ? r.band : null),
      detail: r.detail,
      date: new Date().toISOString()
    };
    localStorage.setItem("yysd:results", JSON.stringify(store));
  }
})();
