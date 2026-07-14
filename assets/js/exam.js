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
  var examLockOn = false;
  var examLockVoided = false;
  var examLockBound = null;
  var parentVoidTimer = null;
  var parentVoidPausedUntil = 0;
  var parentSavedConfirm = null;
  var parentSavedAlert = null;

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
    try {
      var doc = frame.contentDocument;
      doc.open();
      doc.write('<div style="font-family:sans-serif;padding:60px;text-align:center;color:#6b7589">' +
        '<h2 style="color:#14213d">😕 ' + Y.esc(msg) + '</h2>' +
        '<p><a href="index.html" style="color:#c8102e">← 返回首页</a></p></div>');
      doc.close();
    } catch (e) {
      metaEl.textContent = msg;
    }
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
    var isWriting = item.subject === "cambridge-writing" || payload.completed;
    var heading = isStudy ? "学习进度已保存" : (isWriting ? "写作练习已保存" : "成绩已保存");
    var sub = "已同步至云端，可在「我的成绩」查看";
    var scoreLine = "";
    var wrongN = payload.wrongWords && payload.wrongWords.length;

    if (payload.score != null) {
      scoreLine = String(payload.score);
      if (payload.total != null) scoreLine += " / " + payload.total;
      if (payload.band != null) scoreLine += " · Band " + payload.band;
    } else if (isWriting) {
      scoreLine = payload.writingWords ? payload.writingWords + " 词" : "已完成";
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

  function parentPauseVoid(ms) {
    parentVoidPausedUntil = Date.now() + ms;
    clearTimeout(parentVoidTimer);
  }

  function parentPatchDialogs() {
    if (parentSavedConfirm) return;
    parentSavedConfirm = window.confirm;
    parentSavedAlert = window.alert;
    window.confirm = function () {
      parentPauseVoid(12000);
      return parentSavedConfirm.apply(window, arguments);
    };
    window.alert = function () {
      parentPauseVoid(8000);
      return parentSavedAlert.apply(window, arguments);
    };
  }

  function parentUnpatchDialogs() {
    if (parentSavedConfirm) window.confirm = parentSavedConfirm;
    if (parentSavedAlert) window.alert = parentSavedAlert;
    parentSavedConfirm = parentSavedAlert = null;
  }

  function parentFocusLost() {
    if (!examLockOn || examLockVoided || Date.now() < parentVoidPausedUntil) return false;
    return document.hidden || !document.hasFocus();
  }

  function scheduleParentVoidCheck() {
    clearTimeout(parentVoidTimer);
    parentVoidTimer = setTimeout(function () {
      if (parentFocusLost()) triggerParentVoid();
    }, 400);
  }

  function showParentVoidLock() {
    var el = document.getElementById("yysd-parent-exam-lock");
    if (!el) {
      el = document.createElement("div");
      el.id = "yysd-parent-exam-lock";
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<div><h2>模考已中止</h2>' +
      '<p>检测到切换页面或离开考试窗口，本次模考无效，无法继续作答。</p>' +
      '<div class="yysd-exam-lock-actions">' +
      '<button type="button" class="yysd-exam-lock-exit">强制退出</button>' +
      '<button type="button" class="yysd-exam-lock-restart">重新开始</button>' +
      '</div></div>';
    el.querySelector(".yysd-exam-lock-exit").onclick = forceExitExam;
    el.querySelector(".yysd-exam-lock-restart").onclick = forceRestartExam;
    el.classList.add("is-visible");
  }

  function hideParentExamLock() {
    var el = document.getElementById("yysd-parent-exam-lock");
    if (el) el.classList.remove("is-visible");
  }

  function forceExitExam() {
    setExamLock(false);
    location.href = backBtn.href || "zone.html?zone=mock&s=ielts";
  }

  function forceRestartExam() {
    setExamLock(false);
    try { frame.contentWindow.postMessage({ type: "yysd:exam-restart" }, "*"); } catch (e) {}
  }

  function triggerParentVoid() {
    examLockVoided = true;
    document.body.classList.remove("is-exam-locked");
    showParentVoidLock();
    try { frame.contentWindow.postMessage({ type: "yysd:exam-void" }, "*"); } catch (e) {}
  }

  function bindParentExamLock() {
    if (examLockBound) return;
    function onVis() {
      if (!examLockOn || examLockVoided) return;
      if (document.hidden) triggerParentVoid();
      else clearTimeout(parentVoidTimer);
    }
    function onBlur() {
      if (!examLockOn || examLockVoided) return;
      scheduleParentVoidCheck();
    }
    function onFocus() {
      clearTimeout(parentVoidTimer);
    }
    function onPageHide() {
      if (!examLockOn || examLockVoided) return;
      triggerParentVoid();
    }
    function onUnload(e) {
      if (!examLockOn || examLockVoided) return;
      e.preventDefault();
      e.returnValue = "";
    }
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onUnload);
    parentPatchDialogs();
    examLockBound = { onVis: onVis, onBlur: onBlur, onFocus: onFocus, onPageHide: onPageHide, onUnload: onUnload };
  }

  function unbindParentExamLock() {
    if (!examLockBound) return;
    document.removeEventListener("visibilitychange", examLockBound.onVis);
    window.removeEventListener("blur", examLockBound.onBlur);
    window.removeEventListener("focus", examLockBound.onFocus);
    window.removeEventListener("pagehide", examLockBound.onPageHide);
    window.removeEventListener("beforeunload", examLockBound.onUnload);
    clearTimeout(parentVoidTimer);
    parentUnpatchDialogs();
    examLockBound = null;
  }

  function setExamLock(active, voided) {
    if (voided) examLockVoided = true;
    else if (!active) examLockVoided = false;
    examLockOn = !!active && !examLockVoided;
    document.body.classList.toggle("is-exam-locked", examLockOn);
    if (voided) {
      unbindParentExamLock();
      showParentVoidLock();
      return;
    }
    if (examLockOn) {
      bindParentExamLock();
      hideParentExamLock();
      try {
        document.documentElement.requestFullscreen().catch(function () {});
      } catch (e) { /* ponytail: fullscreen denied */ }
    } else {
      unbindParentExamLock();
      hideParentExamLock();
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    }
  }

  function start() {
    var zoneLabel = (Y.ZONE[item.zone] || {}).label || "";
    var subjLabel = (Y.SUBJECT[item.subject] || {}).label || "";
    var isStudy = item.zone === "study";
    var badges = parseBadges(item);

    var shown = Y.displayTitle(item);
    titleEl.textContent = shown;
    document.title = shown + " · 优益思达学习中心";
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

    if (!isStudy && item.duration > 0) {
      var left = item.duration * 60;
      var elapsed = practiceDraftElapsed();
      if (elapsed) left = Math.max(0, left - elapsed);
      startTimer(left);
    }

    backBtn.addEventListener("click", function (e) {
      if (examLockVoided) {
        e.preventDefault();
        return;
      }
      if (examLockOn) {
        alert("模考进行中，请先提交试卷并查看成绩后再退出。");
        e.preventDefault();
        return;
      }
      if (!isStudy && item.zone === "mock" && item.subject === "cambridge-writing") {
        if (!confirm("确定退出吗？写作内容已自动保存草稿。")) e.preventDefault();
      } else if (!isStudy && item.zone === "mock") {
        if (!confirm("确定退出吗？已作答的内容会自动保存，下次打开可继续练习。")) e.preventDefault();
      } else if (!isStudy) {
        if (!confirm("确定退出吗？未交卷的作答可能不会被保存。")) e.preventDefault();
      }
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
    if (!item || !Y.needsVocabBridge(item.subject)) return;
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

  function injectExamBridge() {
    if (!item || item.zone !== "mock") return;
    var doc = frame.contentDocument;
    if (!doc || !doc.body || doc.getElementById("yysd-exam-bridge-js")) return;

    var v = encodeURIComponent(Y.CONTENT_VER || "1");
    var base = new URL("./", location.href).href;

    var script = doc.createElement("script");
    script.id = "yysd-exam-bridge-js";
    script.src = base + "assets/js/exam-bridge.js?v=" + v;
    script.dataset.mode = item.subject === "cambridge-writing" ? "writing" : "exam";
    script.dataset.examId = item.id;
    doc.body.appendChild(script);
  }

  function onFrameLoad() {
    injectExamShell();
    injectReadingTools();
    injectVocabBridge();
    injectExamBridge();
  }

  function practiceDraftElapsed() {
    if (!item || item.zone !== "mock") return 0;
    try {
      var d = JSON.parse(localStorage.getItem("yysd:draft:" + item.id) || "null");
      if (d && d.mode === "practice" && d.elapsedSec) return d.elapsedSec;
    } catch (e) { /* ponytail: corrupt draft */ }
    return 0;
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

  function scoreKeyOf(d) {
    return [d.score, d.total, d.band, d.completed, d.writingWords].join("|");
  }

  function saveResults(store) {
    try { localStorage.setItem("yysd:results", JSON.stringify(store)); } catch (err) {}
  }

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || !frame.contentWindow || e.source !== frame.contentWindow) return;

    if (d.type === "yysd:exam-lock") {
      setExamLock(d.active, d.voided);
      return;
    }

    if (d.type === "yysd:timer-sync" && item && item.duration > 0) {
      var remain = Math.max(0, item.duration * 60 - (d.elapsedSec || 0));
      if (timerHandle) clearInterval(timerHandle);
      startTimer(remain);
      return;
    }

    if (d.type === "yysd:exam-action") {
      if (d.action === "exit") forceExitExam();
      else if (d.action === "restart") forceRestartExam();
      return;
    }

    if (d.type !== "yysd:score" || !item) return;

    var key = scoreKeyOf(d);
    var store = {};
    try { store = JSON.parse(localStorage.getItem("yysd:results") || "{}"); } catch (err) {}
    var prev = store[item.id];
    var isDup = prev && prev._scoreKey === key;

    if (!isDup) {
      store[item.id] = {
        id: item.id, title: item.title, zone: item.zone, subject: item.subject,
        score: (d.score != null ? d.score : null),
        total: (d.total != null ? d.total : null),
        band: (d.band != null ? d.band : null),
        writingWords: d.writingWords || null,
        date: new Date().toISOString(),
        _scoreKey: key
      };
      saveResults(store);
      if (window.YYSD_AUTH && YYSD_AUTH.pushScoreRecord) YYSD_AUTH.pushScoreRecord(store[item.id]);

      if (d.wrongWords && d.wrongWords.length && item.zone === "study") {
        var book = d.book || Y.vocabBookOfSubject(item.subject);
        if (book) {
          Y.mergeWrongWords(book, d.wrongWords, {
            id: item.id, title: item.title, subject: item.subject
          });
        }
      }
    }

    if (!isDup) {
      showScoreToast(store[item.id], d);
    }

    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
      timerEl.classList.remove("is-warn", "is-low", "is-danger");
    }

    setExamLock(false);
  });
})();
