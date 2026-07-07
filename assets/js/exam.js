/* =========================================================================
   exam.js — content viewer + timer + score toast
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var id = new URLSearchParams(location.search).get("id");
  var frame = document.getElementById("exam-frame");
  var titleEl = document.getElementById("v-title");
  var metaEl = document.getElementById("v-meta");
  var badgesEl = document.getElementById("v-badges");
  var hintEl = document.getElementById("v-hint");
  var timerEl = document.getElementById("timer");
  var backBtn = document.getElementById("back-btn");
  var toastHost = document.getElementById("score-toast-host");

  var item = null;
  var timerHandle = null;
  var toastTimer = null;

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
      '<h2 style="color:#14213d">😕 ' + Y.esc(msg) + '</h2>' +
      '<p><a href="index.html" style="color:#c8102e">← 返回首页</a></p></div>');
    doc.close();
  }

  function parseBadges(it) {
    var m = (it.id || "").match(/cambridge-(\d+)-test-(\d+)/);
    if (!m) return null;
    return {
      vol: "剑" + m[1],
      test: "Test " + m[2],
      skill: (Y.SUBJECT[it.subject] || {}).label || ""
    };
  }

  function renderBadges(badges) {
    if (!badgesEl || !badges) {
      if (badgesEl) badgesEl.hidden = true;
      return;
    }
    badgesEl.hidden = false;
    badgesEl.innerHTML =
      '<span class="v-badge v-badge--vol">' + Y.esc(badges.vol) + "</span>" +
      '<span class="v-badge v-badge--test">' + Y.esc(badges.test) + "</span>" +
      (badges.skill ? '<span class="v-badge v-badge--skill">' + Y.esc(badges.skill) + "</span>" : "");
  }

  function showScoreToast(record, payload) {
    if (!toastHost) return;
    clearTimeout(toastTimer);

    var isStudy = item.zone === "study";
    var heading = isStudy ? "学习进度已保存" : "成绩已保存";
    var sub = "记录保存在本浏览器，可在「我的成绩」查看";
    var scoreLine = "";
    var wrongN = payload.wrongWords && payload.wrongWords.length;

    if (payload.score != null) {
      scoreLine = String(payload.score);
      if (payload.total != null) scoreLine += " / " + payload.total;
      if (payload.band != null) scoreLine += " · Band " + payload.band;
    } else if (isStudy) {
      scoreLine = "已完成";
    }
    if (wrongN) {
      sub = "本次新增 " + wrongN + " 个错词，可在学习区错题本复习";
    }

    toastHost.innerHTML =
      '<div class="score-toast" role="status">' +
        '<div class="score-toast__icon" aria-hidden="true">✓</div>' +
        '<div class="score-toast__body">' +
          '<b>' + Y.esc(heading) + '</b>' +
          (scoreLine ? '<span class="score-toast__score">' + Y.esc(scoreLine) + '</span>' : '') +
          '<span class="score-toast__sub">' + Y.esc(sub) + '</span>' +
        '</div>' +
        (wrongN
          ? '<a class="score-toast__link" href="wrong-words.html?book=' + encodeURIComponent(payload.book || "gaozhong") + '">错题本 →</a>'
          : '<a class="score-toast__link" href="results.html">查看 →</a>') +
        '<button type="button" class="score-toast__close" aria-label="关闭">×</button>' +
      '</div>';

    toastHost.classList.add("is-visible");

    toastHost.querySelector(".score-toast__close").addEventListener("click", hideToast);
    toastTimer = setTimeout(hideToast, 6000);
  }

  function hideToast() {
    if (!toastHost) return;
    toastHost.classList.remove("is-visible");
    clearTimeout(toastTimer);
  }

  function start() {
    var zoneLabel = (Y.ZONE[item.zone] || {}).label || "";
    var subjLabel = (Y.SUBJECT[item.subject] || {}).label || "";
    var isStudy = item.zone === "study";
    var badges = parseBadges(item);

    titleEl.textContent = item.title;
    document.title = item.title + " · 优益思达学习中心";
    renderBadges(badges);

    if (badges) {
      metaEl.textContent = [
        zoneLabel,
        (!isStudy && item.duration ? item.duration + " 分钟" : "")
      ].filter(Boolean).join(" · ");
    } else {
      metaEl.textContent = [subjLabel, zoneLabel,
        (!isStudy && item.duration ? item.duration + " 分钟" : "")].filter(Boolean).join(" · ");
    }

    if (hintEl && Y.isReadingExam(item)) {
      hintEl.hidden = false;
      hintEl.textContent = "选中文字可高亮 · 右键做笔记";
    }

    backBtn.textContent = isStudy ? "← 返回单词" : "← 退出考场";
    if (isStudy && Y.isVocabListSubject(item.subject)) {
      backBtn.href = "vocab.html?book=" + (item.subject === "vocab" ? "gaozhong" : "cet4");
    } else if (isStudy && Y.isVocabSpecial(item.subject)) {
      backBtn.href = "vocab.html?book=special";
    } else if (isStudy) {
      backBtn.href = "zone.html?zone=study";
      backBtn.textContent = "← 返回学习区";
    } else if (item.zone === "mock") {
      backBtn.href = "zone.html?zone=mock&s=ielts";
    }

    frame.src = "library/" + item.file + "?v=" + encodeURIComponent(Y.CONTENT_VER || "1");

    frame.addEventListener("load", onFrameLoad);

    if (!isStudy && item.duration > 0) startTimer(item.duration * 60);

    backBtn.addEventListener("click", function (e) {
      if (!isStudy && !confirm("确定退出吗？未交卷的作答可能不会被保存。")) e.preventDefault();
    });
  }

  function injectExamShell() {
    var doc = frame.contentDocument;
    if (!doc || !doc.body || doc.getElementById("yysd-exam-shell-css")) return;

    var v = encodeURIComponent(Y.CONTENT_VER || "1");
    var base = new URL("./", location.href).href;

    var link = doc.createElement("link");
    link.id = "yysd-exam-shell-css";
    link.rel = "stylesheet";
    link.href = base + "assets/css/exam-shell.css?v=" + v;
    doc.head.appendChild(link);

    doc.body.classList.add("yysd-embedded");
  }

  function injectReadingTools() {
    if (!item || !Y.isReadingExam(item)) return;
    var doc = frame.contentDocument;
    if (!doc || !doc.body || doc.getElementById("yysd-reading-tools-js")) return;

    var v = encodeURIComponent(Y.CONTENT_VER || "1");
    var base = new URL("./", location.href).href;

    var link = doc.createElement("link");
    link.id = "yysd-reading-tools-css";
    link.rel = "stylesheet";
    link.href = base + "assets/css/reading-tools.css?v=" + v;
    doc.head.appendChild(link);

    var script = doc.createElement("script");
    script.id = "yysd-reading-tools-js";
    script.src = base + "assets/js/reading-tools.js?v=" + v;
    script.dataset.examId = item.id;
    script.dataset.persist = item.zone === "mock" ? "session" : "local";
    doc.body.appendChild(script);
  }

  function injectVocabBridge() {
    if (!item || item.subject !== "vocab") return;
    var doc = frame.contentDocument;
    if (!doc || !doc.body || doc.getElementById("yysd-vocab-bridge-js")) return;

    var v = encodeURIComponent(Y.CONTENT_VER || "1");
    var base = new URL("./", location.href).href;
    var book = Y.vocabBookOfSubject(item.subject) || "gaozhong";

    var script = doc.createElement("script");
    script.id = "yysd-vocab-bridge-js";
    script.src = base + "assets/js/vocab-bridge.js?v=" + v;
    script.dataset.book = book;
    doc.body.appendChild(script);
  }

  function onFrameLoad() {
    injectExamShell();
    injectReadingTools();
    injectVocabBridge();
  }

  function startTimer(seconds) {
    timerEl.hidden = false;
    function tick() {
      var m = Math.floor(seconds / 60), s = seconds % 60;
      timerEl.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
      timerEl.classList.remove("is-warn", "is-low", "is-danger");
      if (seconds <= 60) timerEl.classList.add("is-danger");
      else if (seconds <= 300) timerEl.classList.add("is-low");
      else if (seconds <= 600) timerEl.classList.add("is-warn");
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

    if (d.wrongWords && d.wrongWords.length && item.zone === "study") {
      var book = d.book || Y.vocabBookOfSubject(item.subject);
      if (book) {
        Y.mergeWrongWords(book, d.wrongWords, {
          id: item.id, title: item.title, subject: item.subject
        });
      }
    }

    showScoreToast(store[item.id], d);

    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
      timerEl.classList.remove("is-warn", "is-low", "is-danger");
    }
  });
})();
