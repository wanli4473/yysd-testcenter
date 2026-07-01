/* =========================================================================
   exam.js — content viewer (mock exam / study material / practice set)
   - Loads the chosen HTML into an iframe
   - Optional countdown timer (only for timed mock/practice items)
   - Records a score reported via postMessage to "我的成绩"
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var id = new URLSearchParams(location.search).get("id");
  var frame = document.getElementById("exam-frame");
  var titleEl = document.getElementById("v-title");
  var metaEl = document.getElementById("v-meta");
  var timerEl = document.getElementById("timer");
  var backBtn = document.getElementById("back-btn");

  var item = null;
  var timerHandle = null;

  if (!id) { fail("缺少内容编号。"); return; }

  Y.load().then(function (items) {
    item = items.filter(function (e) { return e.id === id; })[0];
    if (!item) { fail("找不到该内容，可能已被移除。"); return; }
    start();
  }).catch(function () {
    fail(location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : "内容信息加载失败。");
  });

  function fail(msg) {
    titleEl.textContent = "无法打开";
    frame.removeAttribute("src");
    var doc = frame.contentDocument;
    doc.open();
    doc.write('<div style="font-family:sans-serif;padding:60px;text-align:center;color:#6b7589">' +
      '<h2 style="color:#14213d">😕 ' + msg + '</h2>' +
      '<p><a href="index.html" style="color:#c8102e">← 返回首页</a></p></div>');
    doc.close();
  }

  function start() {
    var zoneLabel = (Y.ZONE[item.zone] || {}).label || "";
    var subjLabel = (Y.SUBJECT[item.subject] || {}).label || "";
    var isStudy = item.zone === "study";

    titleEl.textContent = item.title;
    document.title = item.title + " · 优益思达学习中心";
    metaEl.textContent = [subjLabel, zoneLabel,
      (!isStudy && item.duration ? item.duration + " 分钟" : "")].filter(Boolean).join(" · ");
    backBtn.textContent = isStudy ? "← 返回单词" : "← 退出考场";
    if (isStudy && Y.isVocabListSubject(item.subject)) {
      backBtn.href = "vocab.html?book=" + (item.subject === "vocab" ? "gaozhong" : "cet4");
    } else if (isStudy && Y.isVocabSpecial(item.subject)) {
      backBtn.href = "vocab.html?book=special";
    } else if (isStudy) {
      backBtn.href = "zone.html?zone=study";
      backBtn.textContent = "← 返回学习区";
    }

    frame.src = "library/" + item.file;

    if (!isStudy && item.duration > 0) startTimer(item.duration * 60);

    backBtn.addEventListener("click", function (e) {
      if (!isStudy && !confirm("确定退出吗？未交卷的作答可能不会被保存。")) e.preventDefault();
    });
  }

  function startTimer(seconds) {
    timerEl.hidden = false;
    function tick() {
      var m = Math.floor(seconds / 60), s = seconds % 60;
      timerEl.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
      if (seconds <= 60) timerEl.classList.add("is-low");
      if (seconds <= 0) {
        clearInterval(timerHandle);
        timerEl.textContent = "时间到";
        try { frame.contentWindow.postMessage({ type: "yysd:time-up" }, "*"); } catch (e) {}
        alert("⏰ 时间到！请尽快交卷。");
        return;
      }
      seconds--;
    }
    tick();
    timerHandle = setInterval(tick, 1000);
  }

  // ---- score capture -----------------------------------------------------
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.type !== "yysd:score" || !item) return;
    var store = {};
    try { store = JSON.parse(localStorage.getItem("yysd:results") || "{}"); } catch (err) {}
    store[item.id] = {
      id: item.id, title: item.title, zone: item.zone, subject: item.subject,
      score: (d.score != null ? d.score : null),
      total: (d.total != null ? d.total : null),
      band: (d.band != null ? d.band : null),
      date: new Date().toISOString()
    };
    localStorage.setItem("yysd:results", JSON.stringify(store));
  });
})();
