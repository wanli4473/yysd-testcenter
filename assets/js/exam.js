/* =========================================================================
   exam.js — content viewer + timer + score toast
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var qs = new URLSearchParams(location.search);
  var id = qs.get("id");
  var assignmentEventId = (qs.get("event") || "").replace(/\D/g, "") || "";
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
  var lastScorePushKey = null;
  var sessionStartedMs = null;
  var examLockOn = false;
  var examLockVoided = false;
  var examLockBound = null;
  var parentVoidTimer = null;
  var parentVoidPausedUntil = 0;
  var parentSavedConfirm = null;
  var parentSavedAlert = null;

  if (!id) { fail("缺少内容编号。"); return; }

  var uploadMatch = String(id).match(/^upload-(\d+)$/);
  if (uploadMatch) {
    if (!window.YYSD_AUTH || !YYSD_AUTH.getToken || !YYSD_AUTH.getToken()) {
      location.href = "login.html?next=" + encodeURIComponent(location.pathname + location.search);
      return;
    }
    var eventId = Number(uploadMatch[1]);
    if (!assignmentEventId) assignmentEventId = String(eventId);
    var isTeach = YYSD_AUTH.isTeacher && YYSD_AUTH.isTeacher();
    var metaReq = isTeach
      ? YYSD_AUTH.api("/api/calendar/events/" + eventId)
      : YYSD_AUTH.api("/api/student/assignments/" + eventId + "/meta");
    var htmlPath = isTeach
      ? "/api/calendar/events/" + eventId + "/html"
      : "/api/student/assignments/" + eventId + "/html";
    metaReq
      .then(function (d) {
        var ev = d.event || {};
        item = {
          id: id,
          title: ev.title || ("上传练习 #" + eventId),
          zone: "assignment",
          subject: "teacher-upload",
          duration: 0,
          description: ev.description || "",
          _uploadEventId: eventId,
          _attachmentName: ev.attachmentName || ""
        };
        return YYSD_AUTH.apiHtml(htmlPath);
      })
      .then(function (html) {
        startUpload(html);
      })
      .catch(function (e) {
        fail((e && e.message) || "无法加载老师布置的练习。");
      });
  } else {
    Y.load().then(function (items) {
      item = Y.resolveItem ? Y.resolveItem(items, id) : items.filter(function (e) { return e.id === id; })[0];
      if (!item) { fail("找不到该内容，可能已被移除。"); return; }
      start();
    }).catch(function () {
      fail(location.protocol === "file:"
        ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
        : "内容信息加载失败。");
    });
  }

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

  function isScoredReveal(payload) {
    // ponytail: 听读模考 + 有分数练习；写作另说
    if (payload.score == null || !isFinite(Number(payload.score))) return false;
    if (item.subject === "cambridge-writing" || item.subject === "ielts-writing") return false;
    if (payload.completed && payload.score == null) return false;
    return true;
  }

  function animateScoreNum(el, from, to, ms) {
    if (!el) return;
    var start = performance.now();
    var a = Number(from) || 0;
    var b = Number(to) || 0;
    function frame(now) {
      var t = Math.min(1, (now - start) / (ms || 500));
      var eased = 1 - Math.pow(1 - t, 3);
      var n = Math.round(a + (b - a) * eased);
      el.textContent = String(n);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = String(b);
    }
    requestAnimationFrame(frame);
  }

  function showScoreToast(record, payload, prevScore) {
    if (!toastHost) return;
    clearTimeout(toastTimer);

    var isStudy = item.zone === "study";
    var isWriting = item.subject === "cambridge-writing" || item.subject === "ielts-writing" ||
      (payload.completed && payload.score == null);
    var reveal = isScoredReveal(payload);
    var heading = isStudy ? "学习进度已保存" : (isWriting ? "写作练习已保存" : (reveal ? "成绩揭晓" : "成绩已保存"));
    var sub = payload.syncSub || "已保存在本浏览器，可在「我的成绩」查看";
    var scoreLine = "";
    var wrongN = payload.wrongWords && payload.wrongWords.length;
    var deltaLine = "";

    if (payload.score != null) {
      scoreLine = String(payload.score);
      if (payload.total != null) scoreLine += " / " + payload.total;
      if (payload.band != null) scoreLine += " · Band " + payload.band;
      if (prevScore != null && isFinite(Number(prevScore)) && Number(prevScore) !== Number(payload.score)) {
        var dlt = Number(payload.score) - Number(prevScore);
        deltaLine = dlt > 0 ? "比上次 +" + dlt : (dlt < 0 ? "比上次 " + dlt : "");
      }
    } else if (isWriting) {
      scoreLine = payload.writingWords ? payload.writingWords + " 词" : "已完成";
    } else if (isStudy) {
      scoreLine = "已完成";
    }
    if (wrongN && !payload.syncSub) {
      sub = "本次新增 " + wrongN + " 个错词，可在单词区错题本复习";
    }
    if (deltaLine) sub = deltaLine + (sub ? " · " + sub : "");

    var primaryHref = wrongN
      ? "wrong-words.html?book=" + encodeURIComponent(payload.book || "gaozhong")
      : "results.html";
    var primaryLabel = wrongN ? "看错题 →" : "我的成绩 →";

    if (reveal) {
      toastHost.innerHTML =
        '<div class="score-reveal" role="status">' +
          '<div class="score-reveal__veil" aria-hidden="true">交卷中</div>' +
          '<div class="score-reveal__card">' +
            '<p class="score-reveal__eyebrow">' + Y.esc(heading) + "</p>" +
            '<div class="score-reveal__num" data-score-num>0</div>' +
            (payload.total != null
              ? '<div class="score-reveal__denom">/ ' + Y.esc(String(payload.total)) +
                (payload.band != null ? " · Band " + Y.esc(String(payload.band)) : "") + "</div>"
              : (payload.band != null
                ? '<div class="score-reveal__denom">Band ' + Y.esc(String(payload.band)) + "</div>"
                : "")) +
            (deltaLine ? '<p class="score-reveal__delta">' + Y.esc(deltaLine) + "</p>" : "") +
            '<p class="score-reveal__sub">' + Y.esc(sub) + "</p>" +
            '<div class="score-reveal__acts">' +
              '<a class="btn btn--primary btn--sm" href="' + primaryHref + '">' + primaryLabel + "</a>" +
              '<a class="btn btn--ghost btn--sm" href="dashboard.html">回待办</a>' +
            "</div>" +
            '<button type="button" class="score-toast__close score-reveal__x" aria-label="关闭">×</button>' +
          "</div>" +
        "</div>";
      toastHost.classList.add("is-visible", "is-reveal");
      var veil = toastHost.querySelector(".score-reveal__veil");
      var numEl = toastHost.querySelector("[data-score-num]");
      setTimeout(function () {
        if (veil) veil.classList.add("is-done");
        animateScoreNum(numEl, 0, payload.score, 520);
      }, 380);
      toastHost.querySelector(".score-reveal__x").addEventListener("click", hideToast);
      toastTimer = setTimeout(hideToast, 9000);
      return;
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

    toastHost.classList.remove("is-reveal");
    toastHost.classList.add("is-visible");

    toastHost.querySelector(".score-toast__close").addEventListener("click", hideToast);
    toastTimer = setTimeout(hideToast, 6000);
  }

  function setToastSyncSub(text) {
    if (!toastHost) return;
    var el = toastHost.querySelector(".score-toast__sub, .score-reveal__sub");
    if (el) el.textContent = text;
  }

  function hideToast() {
    if (!toastHost) return;
    toastHost.classList.remove("is-visible", "is-reveal");
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

    if (hintEl && (Y.isReadingExam(item) || item.subject === "cambridge-listening")) {
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
      backBtn.textContent = "← 返回单词区";
    } else if (item.zone === "mock") {
      backBtn.href = "zone.html?zone=mock&s=ielts";
    }

    var src = "library/" + item.file + "?v=" + encodeURIComponent(Y.CONTENT_VER || "1");
    if (item.partNum) {
      src += "&assignPart=" + encodeURIComponent(item.partNum) +
        "&assignKind=" + encodeURIComponent(item.partKind || "s");
    }
    frame.src = src;

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

  function startUpload(html) {
    var zoneLabel = (Y.ZONE[item.zone] || {}).label || "";
    var subjLabel = "老师布置";
    titleEl.textContent = item.title;
    document.title = item.title + " · 优益思达学习中心";
    renderBadges(null);
    metaEl.textContent = [subjLabel, zoneLabel, item._attachmentName || ""].filter(Boolean).join(" · ");
    if (hintEl) {
      hintEl.hidden = false;
      hintEl.textContent = "交卷后成绩会自动同步到「我的成绩」与待办事项";
    }
    backBtn.textContent = "← 返回待办事项";
    backBtn.href = "dashboard.html";

    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    frame.src = url;
    frame.addEventListener("load", function () {
      try { URL.revokeObjectURL(url); } catch (e) {}
      sessionStartedMs = null;
      onFrameLoad();
    }, { once: true });

    backBtn.addEventListener("click", function (e) {
      if (!confirm("确定退出吗？未交卷的作答可能不会被保存。")) e.preventDefault();
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
    if (!item || !(Y.isReadingExam(item) || item.subject === "cambridge-listening")) return;
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
    if (!item || (!Y.needsVocabBridge(item.subject) && item.subject !== "teacher-upload")) return;
    var doc = frame.contentDocument;
    if (!doc || !doc.body || doc.getElementById("yysd-vocab-bridge-js")) return;

    var v = encodeURIComponent(Y.CONTENT_VER || "1");
    var base = new URL("./", location.href).href;
    var book = Y.vocabBookOfSubject(item.subject) || (item.subject === "teacher-upload" ? "assignment" : "gaozhong");

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
    if (item.partNum) {
      script.dataset.assignPart = String(item.partNum);
      script.dataset.assignKind = item.partKind || "s";
    }
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
        // ponytail: bridge owns auto-submit; parent only signals (avoids stacked alerts)
        try { frame.contentWindow.postMessage({ type: "yysd:time-up" }, "*"); } catch (e) {}
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

  // ponytail: scrape iframe result DOM — avoids patching 100+ paper HTML files
  function resolveStartedAt(d) {
    if (d && d.startedAt) {
      var parsed = Date.parse(d.startedAt);
      if (isFinite(parsed)) return new Date(parsed).toISOString();
    }
    try {
      var st = frame.contentWindow && frame.contentWindow.startTime;
      if (!st && frame.contentWindow) {
        st = frame.contentWindow.eval("typeof startTime==='undefined'?0:startTime");
      }
      var n = Number(st);
      if (n > 0) return new Date(n).toISOString();
    } catch (e) { /* ponytail: cross-origin or no startTime */ }
    if (sessionStartedMs) return new Date(sessionStartedMs).toISOString();
    return null;
  }

  function scrapeWrongFromFrame() {
    try {
      var doc = frame.contentDocument;
      if (!doc) return [];
      var out = [];
      var nodes = doc.querySelectorAll(".ritem.wrong");
      for (var i = 0; i < nodes.length && out.length < 80; i++) {
        var el = nodes[i];
        var rq = ((el.querySelector(".rq") || {}).textContent || "").trim();
        var m = rq.match(/第\s*([^\s题]+)\s*题/);
        var yoursEl = el.querySelector(".yours");
        var ansEl = el.querySelector(".correctv");
        var ua = yoursEl ? yoursEl.textContent.trim() : "";
        if (ua === "未作答") ua = "";
        out.push({
          no: m ? m[1] : rq.replace(/^[✘✔]\s*/, ""),
          ua: ua,
          ans: ansEl ? ansEl.textContent.trim() : ""
        });
      }
      return out;
    } catch (err) {
      return [];
    }
  }

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || !frame.contentWindow || e.source !== frame.contentWindow) return;

    if (d.type === "yysd:exam-lock") {
      if (d.active && !sessionStartedMs) sessionStartedMs = Date.now();
      setExamLock(d.active, d.voided);
      return;
    }

    if (d.type === "yysd:timer-sync") {
      if (!sessionStartedMs && d.elapsedSec != null) {
        sessionStartedMs = Date.now() - Math.max(0, Number(d.elapsedSec) || 0) * 1000;
      }
      if (item && item.duration > 0) {
        var remain = Math.max(0, item.duration * 60 - (d.elapsedSec || 0));
        if (timerHandle) clearInterval(timerHandle);
        startTimer(remain);
      }
      return;
    }

    if (d.type === "yysd:exam-action") {
      if (d.action === "exit") forceExitExam();
      else if (d.action === "restart") forceRestartExam();
      return;
    }

    if (d.type === "yysd:writing-grade-req") {
      var reqId = d.reqId;
      function replyGrade(payload) {
        try {
          frame.contentWindow.postMessage(Object.assign({
            type: "yysd:writing-grade-res",
            reqId: reqId
          }, payload), "*");
        } catch (err) { /* iframe gone */ }
      }
      if (!window.YYSD_AUTH || !YYSD_AUTH.getToken || !YYSD_AUTH.getToken()) {
        replyGrade({ error: "请先登录后再使用 AI 批改" });
        return;
      }
      if (YYSD_AUTH.isTeacher && YYSD_AUTH.isTeacher()) {
        replyGrade({ error: "老师账号请在学生端体验 AI 批改" });
        return;
      }
      YYSD_AUTH.api("/api/ai-tutor/writing-grade", {
        method: "POST",
        body: {
          taskType: d.taskType,
          prompt: d.prompt,
          chartNote: d.chartNote || "",
          essay: d.essay
        }
      }).then(function (res) {
        replyGrade({
          grade: res.grade,
          feedback: res.feedback,
          quota: res.quota
        });
      }).catch(function (err) {
        replyGrade({ error: (err && err.message) || "批改失败" });
      });
      return;
    }

    if (d.type !== "yysd:score" || !item) return;

    var key = scoreKeyOf(d);
    // ponytail: in-memory only — blocks same-submit echo; retake reloads exam.html and clears this
    var pushKey = item.id + "|" + key;
    if (lastScorePushKey === pushKey) return;
    lastScorePushKey = pushKey;

    var store = {};
    try { store = JSON.parse(localStorage.getItem("yysd:results") || "{}"); } catch (err) {}
    var prevScore = store[item.id] && store[item.id].score != null ? store[item.id].score : null;
    var attemptAt = new Date().toISOString();
    var startedAt = resolveStartedAt(d);
    var durationSec = null;
    if (d.durationSec != null && isFinite(Number(d.durationSec))) {
      durationSec = Math.max(0, Math.round(Number(d.durationSec)));
    } else if (startedAt) {
      var startMs = Date.parse(startedAt);
      var endMs = Date.parse(attemptAt);
      if (isFinite(startMs) && isFinite(endMs) && endMs >= startMs) {
        durationSec = Math.round((endMs - startMs) / 1000);
      }
    }
    var wrong = Array.isArray(d.wrong) && d.wrong.length ? d.wrong : scrapeWrongFromFrame();
    var record = {
      id: item.id, title: item.title, zone: item.zone, subject: item.subject,
      score: (d.score != null ? d.score : null),
      total: (d.total != null ? d.total : null),
      band: (d.band != null ? d.band : null),
      writingWords: d.writingWords || null,
      writingTask1: d.writingTask1 || null,
      writingTask2: d.writingTask2 || null,
      date: attemptAt,
      startedAt: startedAt,
      durationSec: durationSec,
      assignmentEventId: assignmentEventId || null,
      _scoreKey: key
    };
    store[item.id] = record;
    saveResults(store);

    if (d.wrongWords && d.wrongWords.length && item.zone === "study") {
      var book = d.book || Y.vocabBookOfSubject(item.subject);
      if (book) {
        Y.mergeWrongWords(book, d.wrongWords, {
          id: item.id, title: item.title, subject: item.subject
        });
      }
    }

    if (assignmentEventId) {
      try {
        var seenKey = "yysd:cal-seen-ids";
        var seen = JSON.parse(localStorage.getItem(seenKey) || "[]");
        var eid = Number(assignmentEventId);
        if (eid && seen.indexOf(eid) < 0) {
          seen.push(eid);
          localStorage.setItem(seenKey, JSON.stringify(seen.slice(-200)));
        }
      } catch (err) {}
    }

    showScoreToast(record, d, prevScore);
    if (window.YYSD_AUTH && YYSD_AUTH.pushScoreRecord) {
      YYSD_AUTH.pushScoreRecord(Object.assign({}, record, { attemptAt: attemptAt, wrong: wrong }))
        .then(function (ok) {
          if (ok) setToastSyncSub("已同步至云端，可在「我的成绩」查看");
          else setToastSyncSub("已保存在本浏览器（未登录则不同步云端）");
        })
        .catch(function () {
          setToastSyncSub("本地已保存，云端同步失败");
        });
    }

    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
      timerEl.classList.remove("is-warn", "is-low", "is-danger");
    }

    setExamLock(false);
  });
})();
