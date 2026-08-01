/* =========================================================================
   exam-bridge.js — injected in mock iframes: draft autosave, writing sync, time-up
   ========================================================================= */
(function () {
  "use strict";

  /** 客户站 iframe 卷面白标：读父页 YYSD_AUTH，替换 title / brandtag / 页头 */
  function applyTenantPaperBrand() {
    var A;
    try { A = window.parent && window.parent.YYSD_AUTH; } catch (e) { return; }
    if (!A || !A.isHqSite || A.isHqSite()) return;
    var org = (A.getOrg && A.getOrg()) || null;
    var name = (A.brandName && A.brandName(org)) || (org && org.name) || "";
    if (!name) return;
    var replacers = [
      [/优益思达国际课程中心/g, name],
      [/优益思达备考/g, name],
      [/优益思达学习中心/g, name],
      [/优益思达/g, name],
      [/YYSD International Course Center/gi, name],
      [/\bYYSD\b/g, name]
    ];
    if (document.title) {
      var t = document.title;
      replacers.forEach(function (pair) { t = t.replace(pair[0], pair[1]); });
      document.title = t;
    }
    document.querySelectorAll(".brandtag").forEach(function (el) {
      var bt = el.textContent || "";
      if (bt.indexOf("优益思达") >= 0 || bt.indexOf("YYSD") >= 0) el.textContent = name;
    });
    document.querySelectorAll(".header h1, h1 .brandtag").forEach(function (el) {
      var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var node;
      while ((node = walk.nextNode())) {
        var txt = node.nodeValue;
        if (!txt || txt.indexOf("优益思达") < 0) continue;
        var next = txt;
        replacers.forEach(function (pair) { next = next.replace(pair[0], pair[1]); });
        if (next !== txt) node.nodeValue = next;
      }
    });
  }

  applyTenantPaperBrand();

  var script = document.currentScript;
  var bridgeMode = (script && script.dataset.mode) || "exam";
  var examId = (script && script.dataset.examId) || "";
  // ponytail: parent CDT chrome is outside this iframe — fullscreen here hides timer/Finish/footer
  var cdtShell = !!(script && script.dataset && script.dataset.cdt === "1");
  function cdtPack() {
    var p = (script && script.dataset && script.dataset.pack) || "";
    return p === "drill" ? "drill" : "exam";
  }
  var posted = false;

  function resolveExamId() {
    if (examId) return examId;
    var m = location.pathname.match(/cambridge-\d+-test-\d+(?:-[a-z]+)?\.html$/i);
    return m ? m[0].replace(/\.html$/i, "") : "";
  }

  function clearAnyDraft() {
    var id = resolveExamId();
    if (!id) return;
    try { localStorage.removeItem("yysd:draft:" + id); } catch (e) {}
    try { localStorage.removeItem(id + "-draft"); } catch (e) {}
  }

  function isTesting() {
    var ta = document.getElementById("testArea");
    return ta && getComputedStyle(ta).display !== "none";
  }

  function pageGet(name) {
    try { return window.eval("typeof " + name + "==='undefined'?undefined:" + name); } catch (e) { return undefined; }
  }

  function pageSet(name, value) {
    try {
      window.eval("var __yysd_v=" + JSON.stringify(value) + ";" + name + "=__yysd_v");
      return true;
    } catch (e) { return false; }
  }

  function isTestDone() {
    var s = pageGet("submitted");
    if (s !== undefined) return !!s;
    var f = pageGet("finished");
    if (f !== undefined) return !!f;
    return false;
  }

  /* ---- mock exam lock (模考模式：一切页即作废) ---- */
  var origBackToCover = null;
  var examLock = (function () {
    var on = false, voided = false, bound = null;
    var voidCheckTimer = null, voidPausedUntil = 0;
    var savedConfirm = null, savedAlert = null;

    function notifyParent() {
      try {
        window.parent.postMessage({
          type: "yysd:exam-lock",
          active: on || voided,
          voided: voided
        }, "*");
      } catch (e) { /* ponytail: iframe edge */ }
    }

    function freezeTest() {
      if (typeof timerInterval !== "undefined" && timerInterval) clearInterval(timerInterval);
      if (typeof player !== "undefined" && player && player.pause) try { player.pause(); } catch (e) {}
      var root = document.getElementById("testArea");
      if (!root) return;
      root.querySelectorAll("input, select, textarea, button").forEach(function (el) { el.disabled = true; });
      root.style.pointerEvents = "none";
      root.style.opacity = "0.55";
    }

    function unfreezeTest() {
      var root = document.getElementById("testArea");
      if (!root) return;
      root.querySelectorAll("input, select, textarea, button").forEach(function (el) { el.disabled = false; });
      root.style.pointerEvents = "";
      root.style.opacity = "";
    }

    function pauseVoid(ms) {
      voidPausedUntil = Date.now() + ms;
      clearTimeout(voidCheckTimer);
    }

    function patchDialogs() {
      if (savedConfirm) return;
      savedConfirm = window.confirm;
      savedAlert = window.alert;
      window.confirm = function () {
        pauseVoid(12000);
        try { window.parent.postMessage({ type: "yysd:exam-dialog", ms: 12000 }, "*"); } catch (e) {}
        return savedConfirm.apply(window, arguments);
      };
      window.alert = function () {
        pauseVoid(8000);
        try { window.parent.postMessage({ type: "yysd:exam-dialog", ms: 8000 }, "*"); } catch (e) {}
        return savedAlert.apply(window, arguments);
      };
    }

    function unpatchDialogs() {
      if (savedConfirm) window.confirm = savedConfirm;
      if (savedAlert) window.alert = savedAlert;
      savedConfirm = savedAlert = null;
    }

    function focusLost() {
      if (!on || voided || Date.now() < voidPausedUntil) return false;
      // ponytail: CDT chrome is on parent — Finish/Help/nav blur this iframe; only void on tab hide
      if (cdtShell) return !!document.hidden;
      return document.hidden || !document.hasFocus();
    }

    function scheduleVoidCheck() {
      clearTimeout(voidCheckTimer);
      voidCheckTimer = setTimeout(function () {
        if (focusLost()) voidExam();
      }, 400);
    }

    function voidExam() {
      if (voided || !on) return;
      voided = true;
      on = false;
      clearAnyDraft();
      freezeTest();
      unbind();
      notifyParent();
    }

    function onVis() {
      if (!on || voided) return;
      // ponytail: confirm()/fullscreen flicker can set hidden; honor pauseVoid
      if (document.hidden) {
        if (Date.now() < voidPausedUntil) return;
        voidExam();
      } else clearTimeout(voidCheckTimer);
    }

    function onBlur() {
      if (!on || voided) return;
      if (cdtShell) return;
      scheduleVoidCheck();
    }

    function onFocus() {
      clearTimeout(voidCheckTimer);
    }

    function onPageHide() {
      if (!on || voided) return;
      // ponytail: confirm() on some mobile browsers fires pagehide — honor pauseVoid
      if (Date.now() < voidPausedUntil) return;
      voidExam();
    }

    function onUnload(e) {
      if (!on || voided) return;
      e.preventDefault();
      e.returnValue = "";
    }

    function bind() {
      if (bound) return;
      bound = { onVis: onVis, onUnload: onUnload, onBlur: onBlur, onFocus: onFocus, onPageHide: onPageHide };
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("beforeunload", onUnload);
      window.addEventListener("blur", onBlur);
      window.addEventListener("focus", onFocus);
      window.addEventListener("pagehide", onPageHide);
      patchDialogs();
    }

    function unbind() {
      if (!bound) return;
      document.removeEventListener("visibilitychange", bound.onVis);
      window.removeEventListener("beforeunload", bound.onUnload);
      window.removeEventListener("blur", bound.onBlur);
      window.removeEventListener("focus", bound.onFocus);
      window.removeEventListener("pagehide", bound.onPageHide);
      clearTimeout(voidCheckTimer);
      unpatchDialogs();
      bound = null;
    }

    function tryFullscreen() {
      if (cdtShell) {
        var fs = document.fullscreenElement || document.webkitFullscreenElement;
        if (fs) {
          (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
        }
        return;
      }
      var el = document.documentElement;
      var fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (fn) fn.call(el).catch(function () {});
    }

    function doRestart() {
      voided = false;
      on = false;
      unbind();
      clearAnyDraft();
      unfreezeTest();
      var el = document.getElementById("yysd-exam-lock-overlay");
      if (el) el.style.display = "none";
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
      }
      if (origBackToCover) origBackToCover();
      else if (typeof backToCover === "function") backToCover();
      notifyParent();
    }

    return {
      enable: function () {
        voided = false;
        on = true;
        pauseVoid(5000);
        bind();
        tryFullscreen();
        notifyParent();
      },
      disable: function () {
        on = false;
        voided = false;
        unbind();
        var el = document.getElementById("yysd-exam-lock-overlay");
        if (el) el.style.display = "none";
        notifyParent();
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
        }
      },
      voidExam: voidExam,
      pauseVoid: pauseVoid,
      isOn: function () { return on && !voided; },
      isVoided: function () { return voided; },
      restart: doRestart
    };
  })();

  window.addEventListener("message", function (e) {
    if (!e.data) return;
    if (e.data.type === "yysd:time-up") autoSubmit();
    if (e.data.type === "yysd:exam-void") examLock.voidExam();
    if (e.data.type === "yysd:exam-restart") examLock.restart();
    if (e.data.type === "yysd:exam-dialog") examLock.pauseVoid(e.data.ms || 12000);
    if (e.data.type === "yysd:unlock-listening") unlockCdtListening();
  });

  function scoreStartedAt() {
    var st = pageGet("startTime");
    var n = Number(st);
    if (!n || n <= 0) return null;
    try { return new Date(n).toISOString(); } catch (e) { return null; }
  }

  function postScore(payload) {
    if (posted) return;
    posted = true;
    try {
      var startedAt = scoreStartedAt();
      var msg = Object.assign({ type: "yysd:score" }, payload);
      if (startedAt && !msg.startedAt) msg.startedAt = startedAt;
      window.parent.postMessage(msg, "*");
    } catch (e) { /* ponytail: iframe edge */ }
  }

  function autoSubmit() {
    // B5/C18: CDT never shows Chinese confirmFinish dialogs on time-up
    if (cdtShell) {
      if (typeof finishTest === "function") { finishTest(); return; }
      if (typeof submitTest === "function") { submitTest(); return; }
    }
    if (typeof finishTest === "function") { finishTest(); return; }
    if (typeof confirmFinish === "function") { confirmFinish(); return; }
    if (typeof submitTest === "function") { submitTest(); return; }
    var btn = document.querySelector(".submit-btn, #submitBtn, #submit-btn");
    if (btn && !btn.disabled) btn.click();
  }

  if (bridgeMode === "writing") {
    examId = resolveExamId();
    var writingObserved = false;
    var gradeReqSeq = 0;
    var gradePending = {};
    var gradeTimers = {};

    function clearCdtWritingDraft() {
      // ponytail: paper restores practice SKEY on load; wipe before suite writing starts
      var id = resolveExamId();
      if (id) {
        try { localStorage.removeItem(id + "-draft"); } catch (e) {}
        try { localStorage.removeItem("yysd:draft:" + id); } catch (e) {}
      }
      ["t1", "t2"].forEach(function (tid) {
        var ta = document.getElementById(tid);
        if (ta) {
          ta.value = "";
          try { ta.dispatchEvent(new Event("input", { bubbles: true })); } catch (e2) {}
        }
      });
      ["wc1", "wc2"].forEach(function (tid) {
        var el = document.getElementById(tid);
        if (el) el.textContent = "0";
      });
    }

    function hookWritingStart() {
      var fn = window.startTest;
      if (typeof fn !== "function" || fn._yysdHooked) return;
      window.startTest = function () {
        // B1: suite/exam CDT wipes draft; drill keeps draft for continue
        if (cdtShell && cdtPack() === "exam") {
          clearCdtWritingDraft();
          examLock.enable();
        } else if (cdtShell && cdtPack() === "drill") {
          examLock.disable();
        } else {
          examLock.enable();
        }
        return fn.apply(this, arguments);
      };
      startTest._yysdHooked = true;
    }

    function hookWritingFinish() {
      var fn = window.finishTest;
      if (typeof fn !== "function" || fn._yysdHooked) return;
      window.finishTest = function () {
        clearAnyDraft();
        var ret = fn.apply(this, arguments);
        // ponytail: CDT hides #resultArea with !important — MutationObserver never posts
        if (cdtShell) reportWriting();
        examLock.disable();
        return ret;
      };
      finishTest._yysdHooked = true;
    }

    function hookWritingBack() {
      var fn = window.backToCover;
      if (typeof fn !== "function" || fn._yysdHooked) return;
      origBackToCover = fn;
      window.backToCover = function () {
        if (examLock.isOn() && !isTestDone() && isTesting()) {
          alert(cdtShell
            ? "You cannot leave during a mock test. Use Finish section to end this part."
            : "模考进行中不可返回封面。如需结束，请点「完成并查看报告」。");
          return;
        }
        examLock.disable();
        return origBackToCover.apply(this, arguments);
      };
      backToCover._yysdHooked = true;
    }

    function readWritingTask(n) {
      var ta = document.getElementById("t" + n);
      if (ta && ta.value) return ta.value;
      var dump = document.getElementById("dump" + n);
      if (dump && dump.textContent && dump.textContent !== "（未作答）") return dump.textContent;
      return "";
    }

    function plainPrompt(html) {
      return String(html || "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    function escHtml(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function chartNoteFromTest() {
      var test = pageGet("TEST");
      if (test && test.task1) {
        var charts = test.task1.charts || test.task1.tables || [];
        if (Array.isArray(charts) && charts.length) {
          var fromTest = charts.map(function (c) {
            return (c && (c.caption || c.title)) || "";
          }).filter(Boolean).join("\n");
          if (fromTest) return fromTest;
        }
      }
      var caps = [];
      document.querySelectorAll("#task1Tables figcaption").forEach(function (el) {
        var t = (el.textContent || "").trim();
        if (t) caps.push(t);
      });
      return caps.join("\n");
    }

    function promptForTask(taskType) {
      var test = pageGet("TEST");
      if (test) {
        var block = taskType === "task1" ? test.task1 : test.task2;
        var fromTest = plainPrompt(block && block.prompt);
        if (fromTest) return fromTest;
      }
      var el = document.getElementById(taskType === "task1" ? "task1Prompt" : "task2Prompt");
      return el ? plainPrompt(el.innerHTML) : "";
    }

    function looksLikeJsonLeak(s) {
      s = String(s || "").trim();
      return !s ? false : (s.indexOf("WRITING_JSON") >= 0 || s.charAt(0) === "{" || s.charAt(0) === "[");
    }

    function renderGradeHtml(d) {
      var g = d && d.grade;
      var html = "";
      if (g && !looksLikeJsonLeak(g.overall)) {
        html += '<div class="yysd-ai-grade__score"><h4>写作评分 · Overall ' + escHtml(g.overall) +
          " <span style=\"font-weight:500;font-size:12px;color:#64748b\">（AI 估分 · 非正式考分）</span></h4><dl>" +
          "<dt>Task</dt><dd>" + escHtml(g.task) + "</dd>" +
          "<dt>Coherence</dt><dd>" + escHtml(g.coherence) + "</dd>" +
          "<dt>Lexical</dt><dd>" + escHtml(g.lexical) + "</dd>" +
          "<dt>Grammar</dt><dd>" + escHtml(g.grammar) + "</dd></dl>" +
          (g.comment && !looksLikeJsonLeak(g.comment) ? "<p>" + escHtml(g.comment) + "</p>" : "") + "</div>";
        var cn = g.criteriaNotes || {};
        if (cn.task || cn.coherence || cn.lexical || cn.grammar) {
          html += "<h4>对照官方四项说明</h4><ul>" +
            (cn.task && !looksLikeJsonLeak(cn.task) ? "<li><b>Task</b>：" + escHtml(cn.task) + "</li>" : "") +
            (cn.coherence && !looksLikeJsonLeak(cn.coherence) ? "<li><b>Coherence</b>：" + escHtml(cn.coherence) + "</li>" : "") +
            (cn.lexical && !looksLikeJsonLeak(cn.lexical) ? "<li><b>Lexical</b>：" + escHtml(cn.lexical) + "</li>" : "") +
            (cn.grammar && !looksLikeJsonLeak(cn.grammar) ? "<li><b>Grammar</b>：" + escHtml(cn.grammar) + "</li>" : "") +
            "</ul>";
        }
        if (g.paragraphNotes && g.paragraphNotes.length) {
          html += "<h4>逐段批注</h4><ul>" + g.paragraphNotes.filter(function (n) { return !looksLikeJsonLeak(n); }).map(function (n) {
            return "<li>" + escHtml(n) + "</li>";
          }).join("") + "</ul>";
        }
        if (g.corrections && g.corrections.length) {
          html += "<h4>用词 / 语法纠错</h4><ul>" + g.corrections.filter(function (c) {
            return c && !looksLikeJsonLeak(c.bad) && !looksLikeJsonLeak(c.good);
          }).map(function (c) {
            return "<li><s>" + escHtml(c.bad) + "</s> → <b>" + escHtml(c.good) + "</b>" +
              (c.why ? "（" + escHtml(c.why) + "）" : "") + "</li>";
          }).join("") + "</ul>";
        }
        if (g.nextSteps && g.nextSteps.length) {
          html += "<h4>提分建议</h4><ul>" + g.nextSteps.filter(function (n) { return !looksLikeJsonLeak(n); }).map(function (n) {
            return "<li>" + escHtml(n) + "</li>";
          }).join("") + "</ul>";
        }
        if (g.modelEssay && !looksLikeJsonLeak(g.modelEssay)) {
          html += "<h4>同题高分范文</h4><pre class=\"yysd-ai-grade__model\">" + escHtml(g.modelEssay) + "</pre>";
        }
      }
      // ponytail: ignore raw LLM dumps that look like failed JSON payloads
      var fb = d && d.feedback ? String(d.feedback).trim() : "";
      if (fb && !looksLikeJsonLeak(fb)) {
        html += "<div class=\"yysd-ai-grade__feedback\">" + escHtml(fb) + "</div>";
      }
      return html || "<p>未返回结构化评分，请再点上方按钮重试</p>";
    }

    function ensureAiPanel() {
      var ra = document.getElementById("resultArea");
      // ponytail: CDT skin keeps resultArea display:none until parent unskins — still inject
      if (!ra) return null;
      if (!cdtShell && getComputedStyle(ra).display === "none") return null;
      var panel = document.getElementById("yysd-ai-grade");
      if (panel) return panel;
      panel = document.createElement("div");
      panel.id = "yysd-ai-grade";
      panel.className = "yysd-ai-grade";
      panel.innerHTML =
        '<style>' +
        ".yysd-ai-grade{margin:18px 0;padding:16px 18px;border:1px solid #c7d2fe;border-radius:12px;background:#eef2ff;}" +
        ".yysd-ai-grade h3{margin:0 0 8px;font-size:16px;color:#312e81;}" +
        ".yysd-ai-grade__note{font-size:13px;color:#4338ca;margin:0 0 12px;line-height:1.5;}" +
        ".yysd-ai-grade__actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;}" +
        ".yysd-ai-grade__actions button{appearance:none;border:0;border-radius:8px;padding:8px 14px;font-size:14px;font-weight:600;cursor:pointer;background:#4f46e5;color:#fff;}" +
        ".yysd-ai-grade__actions button:disabled{opacity:.55;cursor:not-allowed;}" +
        ".yysd-ai-grade__hint{font-size:13px;color:#445;min-height:1.2em;margin:0 0 8px;}" +
        ".yysd-ai-grade__hint.is-error{color:#b91c1c;}" +
        ".yysd-ai-grade__block{margin-top:12px;padding-top:12px;border-top:1px solid #c7d2fe;}" +
        ".yysd-ai-grade__block h4{margin:12px 0 6px;font-size:14px;color:#312e81;}" +
        ".yysd-ai-grade__score dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:8px 0;font-size:14px;}" +
        ".yysd-ai-grade__score dt{color:#64748b;} .yysd-ai-grade__score dd{margin:0;font-weight:700;}" +
        ".yysd-ai-grade__model{white-space:pre-wrap;font-size:13px;line-height:1.55;background:#fff;padding:10px;border-radius:8px;border:1px solid #e2e8f0;}" +
        ".yysd-ai-grade__feedback{font-size:13px;white-space:pre-wrap;color:#334155;margin-top:8px;}" +
        ".yysd-ai-grade ul{margin:6px 0 0;padding-left:1.2em;font-size:13px;line-height:1.5;}" +
        "</style>" +
        "<h3>AI 考官批改</h3>" +
        '<p class="yysd-ai-grade__note">按雅思四项标准估分，并给出点评、纠错与范文。' +
        "<b>AI 估分仅供练习参考，非正式考分</b>。Task 1 本版不读原图，仅依据题干与图表说明文字。" +
        "每次批改消耗 1 次当日 AI 文字额度。</p>" +
        '<div class="yysd-ai-grade__actions">' +
        '<button type="button" data-task="task1">AI 批改 Task 1</button>' +
        '<button type="button" data-task="task2">AI 批改 Task 2</button>' +
        "</div>" +
        '<p class="yysd-ai-grade__hint" id="yysd-ai-grade-hint"></p>' +
        '<div class="yysd-ai-grade__block" id="yysd-ai-grade-task1" hidden></div>' +
        '<div class="yysd-ai-grade__block" id="yysd-ai-grade-task2" hidden></div>';
      var crit = ra.querySelector(".crit");
      if (crit) ra.insertBefore(panel, crit);
      else ra.appendChild(panel);
      panel.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-task]");
        if (!btn || btn.disabled) return;
        requestWritingGrade(btn.getAttribute("data-task"));
      });
      return panel;
    }

    function setGradeHint(msg, isError) {
      var el = document.getElementById("yysd-ai-grade-hint");
      if (!el) return;
      el.textContent = msg || "";
      el.className = "yysd-ai-grade__hint" + (isError ? " is-error" : "");
    }

    function setGradeButtonsBusy(busy) {
      var panel = document.getElementById("yysd-ai-grade");
      if (!panel) return;
      panel.querySelectorAll("button[data-task]").forEach(function (b) { b.disabled = !!busy; });
    }

    function requestWritingGrade(taskType) {
      if (Object.keys(gradePending).length) {
        setGradeHint("上一题仍在批改中，请稍候…");
        return;
      }
      var essay = readWritingTask(taskType === "task1" ? 1 : 2).trim();
      if (!essay || essay.length < 80) {
        setGradeHint(taskType === "task1" ? "Task 1 作文过短或未作答" : "Task 2 作文过短或未作答", true);
        return;
      }
      var prompt = promptForTask(taskType);
      if (!prompt) {
        setGradeHint("未能读取本题题干", true);
        return;
      }
      var reqId = "wg-" + (++gradeReqSeq);
      gradePending[reqId] = taskType;
      setGradeButtonsBusy(true);
      setGradeHint("批改中…");
      gradeTimers[reqId] = setTimeout(function () {
        if (!gradePending[reqId]) return;
        delete gradePending[reqId];
        delete gradeTimers[reqId];
        setGradeButtonsBusy(Object.keys(gradePending).length > 0);
        setGradeHint("批改超时，请再点按钮重试", true);
      }, 120000);
      try {
        window.parent.postMessage({
          type: "yysd:writing-grade-req",
          reqId: reqId,
          taskType: taskType,
          prompt: prompt,
          chartNote: taskType === "task1" ? chartNoteFromTest() : "",
          essay: essay
        }, "*");
      } catch (e) {
        clearTimeout(gradeTimers[reqId]);
        delete gradeTimers[reqId];
        delete gradePending[reqId];
        setGradeButtonsBusy(false);
        setGradeHint("无法联系父页面，请刷新重试", true);
      }
    }

    function onWritingGradeRes(d) {
      if (!d || !d.reqId || !gradePending[d.reqId]) return;
      var taskType = gradePending[d.reqId];
      delete gradePending[d.reqId];
      if (gradeTimers[d.reqId]) {
        clearTimeout(gradeTimers[d.reqId]);
        delete gradeTimers[d.reqId];
      }
      setGradeButtonsBusy(Object.keys(gradePending).length > 0);
      if (d.error) {
        var err = String(d.error || "批改失败");
        if (/上限|用完|额度/i.test(err) && !/明日|明天/.test(err)) {
          err = err.replace(/[。！!]?$/, "") + "，明日再来";
        } else if (/解析|失败|稍后/i.test(err)) {
          err = err.replace(/[。！!]?$/, "") + " — 可再点按钮重试";
        }
        setGradeHint(err, true);
        return;
      }
      setGradeHint("");
      var box = document.getElementById("yysd-ai-grade-" + taskType);
      if (!box) return;
      box.hidden = false;
      box.innerHTML = "<h3>" + (taskType === "task1" ? "Task 1" : "Task 2") + " 批改结果</h3>" + renderGradeHtml(d);
      if (d.quota && d.quota.textLeft != null) {
        var qHint = "今日文字额度剩余 " + d.quota.textLeft + "/" + d.quota.textLimit;
        if (d.quota.textLeft <= 0) qHint += "（已用完，明日再来）";
        setGradeHint(qHint);
      }
    }

    function onResultVisible() {
      reportWriting();
      ensureAiPanel();
    }

    function reportWriting() {
      if (posted) return;
      var ra = document.getElementById("resultArea");
      // ponytail: CDT skin forces resultArea display:none !important — still post
      if (!cdtShell && (!ra || getComputedStyle(ra).display === "none")) return;
      var r1 = document.getElementById("r1");
      var r2 = document.getElementById("r2");
      var n1 = r1 ? parseInt(r1.textContent, 10) || 0 : 0;
      var n2 = r2 ? parseInt(r2.textContent, 10) || 0 : 0;
      if (!n1 && !n2) {
        n1 = (readWritingTask(1).trim().match(/\S+/g) || []).length;
        n2 = (readWritingTask(2).trim().match(/\S+/g) || []).length;
      }
      // ponytail: store essays + prompts for cdt-report AI grade; 8k/task covers IELTS length
      postScore({
        score: null, total: null, writingWords: n1 + n2, completed: true,
        writingTask1: readWritingTask(1),
        writingTask2: readWritingTask(2),
        writingPrompt1: promptForTask("task1"),
        writingPrompt2: promptForTask("task2"),
        writingChartNote: chartNoteFromTest()
      });
    }

    function initWriting() {
      hookWritingStart();
      hookWritingFinish();
      hookWritingBack();
      if (writingObserved) {
        onResultVisible();
        return;
      }
      var ra = document.getElementById("resultArea");
      if (!ra) return;
      writingObserved = true;
      new MutationObserver(onResultVisible).observe(ra, {
        attributes: true, attributeFilter: ["style"], childList: true, subtree: true
      });
      onResultVisible();
    }

    window.addEventListener("message", function (e) {
      if (!e.data || e.data.type !== "yysd:writing-grade-res") return;
      onWritingGradeRes(e.data);
    });

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initWriting);
    else initWriting();
    setTimeout(initWriting, 150);
    return;
  }

  /* ---- listening / reading draft autosave ---- */
  examId = resolveExamId();
  if (!examId) return;

  // ponytail: older Cam7–15 papers call lookupBand/levelLabel but omit the defs — submit then throws after locking `submitted`
  function ensureBandHelpers() {
    if (typeof window.lookupBand === "function" && typeof window.levelLabel === "function") return;
    var isReading = /reading/i.test(examId);
    var bands = isReading
      ? [[39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5], [30, 7.0], [27, 6.5], [23, 6.0], [19, 5.5], [15, 5.0], [13, 4.5], [10, 4.0], [8, 3.5], [6, 3.0], [4, 2.5], [0, 2.0]]
      : [[39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5], [30, 7.0], [26, 6.5], [23, 6.0], [18, 5.5], [16, 5.0], [13, 4.5], [10, 4.0], [6, 3.5], [4, 3.0], [0, 2.5]];
    var levels = [[8.5, "Expert / Very good user"], [7.0, "Good user"], [6.0, "Competent user"], [5.0, "Modest user"], [4.0, "Limited user"], [0, "Basic user"]];
    if (!window.BAND_TABLE) window.BAND_TABLE = bands;
    if (!window.LEVEL_LABEL) window.LEVEL_LABEL = levels;
    if (typeof window.lookupBand !== "function") {
      window.lookupBand = function (correct, total) {
        var scaled = total === 40 ? correct : Math.round(correct / Math.max(1, total) * 40);
        var table = window.BAND_TABLE || bands;
        for (var i = 0; i < table.length; i++) if (scaled >= table[i][0]) return table[i][1];
        return isReading ? 2.0 : 2.5;
      };
    }
    if (typeof window.levelLabel !== "function") {
      window.levelLabel = function (b) {
        var table = window.LEVEL_LABEL || levels;
        for (var i = 0; i < table.length; i++) if (b >= table[i][0]) return table[i][1];
        return "";
      };
    }
  }

  var DRAFT_KEY = "yysd:draft:" + examId;
  var saveTimer = null;
  var restorePending = null;
  var saveBound = false;

  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { return null; }
  }

  function clearDraft() {
    clearAnyDraft();
  }

  function isTestingLR() {
    return isTesting();
  }

  function collectAnswers() {
    var ans = {};
    var root = document.getElementById("testArea");
    if (!root) return ans;
    root.querySelectorAll('input[type="text"]').forEach(function (el) {
      if (el.id && el.value.trim()) ans[el.id] = el.value;
    });
    root.querySelectorAll("select").forEach(function (el) {
      if (el.id && el.value) ans[el.id] = el.value;
    });
    root.querySelectorAll('input[type="radio"]:checked').forEach(function (el) {
      if (el.name) ans["@" + el.name] = el.value;
    });
    return ans;
  }

  function countAnswered(answers) {
    return Object.keys(answers || {}).length;
  }

  function ensurePageGlobals() {
    // ponytail: some papers omit `let timerInterval=null` — clearInterval then throws and skips restore
    ["timerInterval", "startTime", "submitted", "mode", "selectedSections", "currentPaper"].forEach(function (n) {
      if (pageGet(n) !== undefined) return;
      if (n === "selectedSections" || n === "currentPaper") pageSet(n, []);
      else if (n === "mode") pageSet(n, "practice");
      else if (n === "submitted") pageSet(n, false);
      else pageSet(n, n === "timerInterval" ? null : 0);
    });
  }

  function saveDraft() {
    if (!isTesting()) return;
    if (pageGet("submitted")) return;
    if (pageGet("mode") === "exam") return;
    var answers = collectAnswers();
    if (!countAnswered(answers)) return;
    var st = pageGet("startTime") || 0;
    var sections = pageGet("selectedSections");
    var draft = {
      mode: pageGet("mode") || "practice",
      sections: Array.isArray(sections) ? sections.slice() : [],
      answers: answers,
      startTime: st,
      elapsedSec: st ? Math.floor((Date.now() - st) / 1000) : 0,
      savedAt: Date.now()
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
  }

  function saveDraftNow() {
    clearTimeout(saveTimer);
    saveDraft();
  }

  function debouncedSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 400);
  }

  function bindSaveListeners() {
    if (saveBound) return;
    var root = document.getElementById("testArea");
    if (!root) return;
    saveBound = true;
    root.addEventListener("input", debouncedSave, true);
    root.addEventListener("change", debouncedSave, true);
    setInterval(saveDraft, 3000);
  }

  function applyAnswers(answers) {
    if (!answers) return;
    Object.keys(answers).forEach(function (key) {
      if (key.charAt(0) === "@") {
        var name = key.slice(1);
        var val = answers[key];
        document.querySelectorAll('#testArea input[name="' + name + '"]').forEach(function (r) {
          r.checked = r.value === val;
        });
      } else {
        var el = document.getElementById(key);
        if (el) el.value = answers[key];
      }
    });
  }

  function afterStartRestore() {
    if (!restorePending) { bindSaveListeners(); saveDraft(); syncParentTimer(); return; }
    applyAnswers(restorePending.answers);
    if (restorePending.startTime) pageSet("startTime", restorePending.startTime);
    else if (restorePending.elapsedSec) pageSet("startTime", Date.now() - restorePending.elapsedSec * 1000);
    restorePending = null;
    bindSaveListeners();
    saveDraft();
    syncParentTimer();
  }

  function syncParentTimer() {
    var st = pageGet("startTime");
    if (!st) return;
    try {
      window.parent.postMessage({
        type: "yysd:timer-sync",
        mode: pageGet("mode") || "",
        elapsedSec: Math.floor((Date.now() - st) / 1000)
      }, "*");
    } catch (e) { /* ponytail: iframe edge */ }
  }

  /* ---- B2: CDT listening iron rules (no seek / pause / section pick) ---- */
  var cdtListenOrig = null;
  var cdtListenEndedBound = false;

  function paperMode() {
    try {
      if (typeof mode !== "undefined" && mode) return mode;
    } catch (e) { /* ignore */ }
    return pageGet("mode") || "";
  }

  function installCdtListeningIron() {
    if (!cdtShell || !isListeningPaper()) return;
    if (!cdtListenOrig) {
      cdtListenOrig = {
        seekAudio: window.seekAudio,
        togglePlay: window.togglePlay,
        playSection: window.playSection
      };
    }
    window.seekAudio = function () { /* B2 locked */ };
    window.togglePlay = function () { /* B2 locked — autoplay only */ };
    window.playSection = function () { /* B2 locked */ };

    var prog = document.getElementById("aProg");
    if (prog) {
      prog.onclick = null;
      prog.removeAttribute("onclick");
      prog.style.pointerEvents = "none";
    }
    var playBtn = document.getElementById("aPlay");
    if (playBtn) {
      playBtn.onclick = null;
      playBtn.removeAttribute("onclick");
      playBtn.disabled = true;
      playBtn.style.pointerEvents = "none";
      playBtn.setAttribute("aria-disabled", "true");
    }
    document.body.classList.remove("yysd-cdt-listen-unlocked");
    document.body.classList.add("yysd-cdt-listen-locked");

    var player = document.getElementById("player");
    if (!player || cdtListenEndedBound) return;
    cdtListenEndedBound = true;
    // capture: must read curAudioSec BEFORE paper's bubble handler advances it via loadSection
    player.addEventListener("ended", function () {
      try {
        var paper = typeof currentPaper !== "undefined" ? currentPaper : null;
        var cur = typeof curAudioSec !== "undefined" ? curAudioSec : null;
        if (!paper || !paper.length) {
          window.parent.postMessage({ type: "yysd:listening-ended" }, "*");
          return;
        }
        var idx = -1;
        for (var i = 0; i < paper.length; i++) {
          if (paper[i].id === cur) { idx = i; break; }
        }
        if (idx < 0) return;
        var isLast = idx >= paper.length - 1;
        // exam mode: paper already auto-chains; practice under CDT must chain here
        if (!isLast && paperMode() !== "exam" && typeof loadSection === "function") {
          loadSection(paper[idx + 1].id, true);
          var ap = document.getElementById("aPlay");
          if (ap) ap.textContent = "⏸";
          return;
        }
        if (isLast) {
          setTimeout(function () {
            try { window.parent.postMessage({ type: "yysd:listening-ended" }, "*"); } catch (e2) { /* ignore */ }
          }, 80);
        }
      } catch (err) { /* ignore */ }
    }, true);
  }

  function unlockCdtListening() {
    if (!cdtListenOrig) return;
    if (typeof cdtListenOrig.seekAudio === "function") window.seekAudio = cdtListenOrig.seekAudio;
    if (typeof cdtListenOrig.togglePlay === "function") window.togglePlay = cdtListenOrig.togglePlay;
    if (typeof cdtListenOrig.playSection === "function") window.playSection = cdtListenOrig.playSection;
    var prog = document.getElementById("aProg");
    if (prog) {
      prog.style.pointerEvents = "";
      prog.onclick = function (e) { if (typeof window.seekAudio === "function") window.seekAudio(e); };
    }
    var playBtn = document.getElementById("aPlay");
    if (playBtn) {
      playBtn.disabled = false;
      playBtn.style.pointerEvents = "";
      playBtn.removeAttribute("aria-disabled");
      playBtn.onclick = function () { if (typeof window.togglePlay === "function") window.togglePlay(); };
    }
    document.body.classList.remove("yysd-cdt-listen-locked");
    document.body.classList.add("yysd-cdt-listen-unlocked");
  }

  function forceListeningExamMins() {
    // ponytail: listening mock = 32 min (audio + transfer); mutate even if TEST is const
    try {
      window.eval("if(typeof TEST!=='undefined'&&TEST)TEST.durationMin=32");
    } catch (e) { /* ignore */ }
  }

  function isListeningPaper() {
    var p = document.getElementById("player");
    return !!(p && p.tagName === "AUDIO");
  }

  // ponytail: wall-clock must not run while MP3 still buffering — start on `playing`
  var audioWaitGen = 0;
  function armListeningTimerOnPlay() {
    if (!isListeningPaper() || !isTesting()) return;
    var player = document.getElementById("player");
    if (!player) return;
    var gen = ++audioWaitGen;

    var iv = pageGet("timerInterval");
    if (iv != null) clearInterval(iv);
    pageSet("timerInterval", null);
    pageSet("startTime", 0);
    var tEl = document.getElementById("timer");
    var tt = document.getElementById("timerText");
    if (tEl) tEl.classList.add("show");
    if (tt) tt.textContent = "等待播放";

    var oldOverlay = document.getElementById("yysd-audio-wait");
    if (oldOverlay) oldOverlay.remove();

    var done = false;
    var timeoutId = null;
    var overlay = null;
    var isCdt = document.body.classList.contains("yysd-cdt-listening");

    function finish() {
      if (done || gen !== audioWaitGen) return;
      done = true;
      player.removeEventListener("playing", onPlaying);
      player.removeEventListener("error", onFail);
      if (timeoutId) clearTimeout(timeoutId);
      if (overlay) { overlay.remove(); overlay = null; }
      forceListeningExamMins();
      if (typeof setupTimer === "function") setupTimer();
      syncParentTimer();
      try { window.parent.postMessage({ type: "yysd:audio-ready" }, "*"); } catch (e) { /* ignore */ }
    }

    function onPlaying() { finish(); }

    function ensureOverlay() {
      if (overlay || !isCdt || gen !== audioWaitGen) return;
      overlay = document.createElement("div");
      overlay.id = "yysd-audio-wait";
      overlay.setAttribute("role", "status");
      overlay.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.48);display:flex;align-items:center;justify-content:center;padding:20px;";
      overlay.innerHTML =
        '<div style="background:#fff;border-radius:12px;padding:22px 24px;max-width:320px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.18);">' +
        '<p id="yysd-audio-wait-msg" style="margin:0 0 6px;font-weight:700;color:#0f172a;">Loading listening audio…</p>' +
        '<p style="margin:0;font-size:13px;color:#64748b;line-height:1.45;">The timer will start when the recording begins.</p>' +
        '<button type="button" id="yysd-audio-retry" style="display:none;margin-top:14px;background:#1d4ed8;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;">Retry</button>' +
        "</div>";
      document.body.appendChild(overlay);
      var btn = overlay.querySelector("#yysd-audio-retry");
      if (btn) btn.addEventListener("click", retryPlay);
    }

    function showRetry(msg) {
      if (gen !== audioWaitGen) return;
      ensureOverlay();
      if (!overlay) return;
      var msgEl = overlay.querySelector("#yysd-audio-wait-msg");
      if (msgEl) msgEl.textContent = msg || "Audio failed to load";
      var btn = overlay.querySelector("#yysd-audio-retry");
      if (btn) btn.style.display = "inline-block";
    }

    function retryPlay() {
      if (done || gen !== audioWaitGen) return;
      var msgEl = overlay && overlay.querySelector("#yysd-audio-wait-msg");
      if (msgEl) msgEl.textContent = "Loading listening audio…";
      var btn = overlay && overlay.querySelector("#yysd-audio-retry");
      if (btn) btn.style.display = "none";
      try {
        var sec = pageGet("curAudioSec");
        if (typeof loadSection === "function" && sec) loadSection(sec, true);
        else if (player.play) player.play().catch(function () { showRetry(); });
      } catch (e) { showRetry(); }
    }

    function onFail() { showRetry(); }

    player.addEventListener("playing", onPlaying);
    player.addEventListener("error", onFail);

    if (!player.paused && player.readyState >= 2) {
      finish();
      return;
    }

    if (isCdt) {
      ensureOverlay();
      // ponytail: 45s ceiling — after that student can retry; no infinite spinner
      timeoutId = setTimeout(function () {
        if (!done && gen === audioWaitGen) showRetry("Network is slow. Audio has not started.");
      }, 45000);
    }
  }

  // CDT drill → startTest("practice") but papers only build .secbox inside openMode()
  function parseSectionsAttr() {
    var raw = (script && script.dataset && script.dataset.sections) || "";
    if (!raw) return null;
    var ids = raw.split(",").map(function (s) { return +s; }).filter(function (n) { return n > 0; });
    return ids.length ? ids : null;
  }

  function ensureCdtPracticeSections(draftSections) {
    if (!cdtShell) return;
    if (typeof openMode === "function") openMode();
    var boxes = document.querySelectorAll(".secbox");
    if (!boxes.length) return;
    var pick = (draftSections && draftSections.length) ? draftSections : parseSectionsAttr();
    if (pick && pick.length) {
      boxes.forEach(function (cb) {
        cb.checked = pick.indexOf(+cb.value) !== -1;
      });
    } else {
      boxes.forEach(function (cb) { cb.checked = true; });
    }
    if (typeof closeMode === "function") closeMode();
  }

  function hookStartTest() {
    var fn = window.startTest;
    if (typeof fn !== "function" || fn._yysdHooked) return;
    window.startTest = function (m) {
      ensurePageGlobals();
      if (m === "exam") examLock.enable();
      else examLock.disable();
      // ponytail: auto-restore practice draft — exit copy promises autosave/continue
      var draftSections = null;
      if (m === "practice" && !restorePending) {
        var d = loadDraft();
        if (d && d.mode === "practice" && countAnswered(d.answers)) {
          restorePending = d;
          draftSections = d.sections || null;
        }
      } else if (restorePending && restorePending.sections) {
        draftSections = restorePending.sections;
      }
      // CDT + teacher Section/Passage assign: papers ignore .secbox in exam mode
      var assignPart = Number((script && script.dataset.assignPart) || 0) || 0;
      if (cdtShell && assignPart > 0 && m === "exam") {
        m = "practice";
        arguments[0] = "practice";
        examLock.disable();
        ensureCdtPracticeSections([assignPart]);
      } else if (m === "practice") {
        ensureCdtPracticeSections(draftSections || (assignPart > 0 ? [assignPart] : null));
      }
      var resuming = !!restorePending;
      var ret;
      try {
        ret = fn.apply(this, arguments);
      } finally {
        setTimeout(function () {
          // B2: CDT listening (drill or exam) waits for real audio + iron lock
          if (!resuming && isListeningPaper() && (m === "exam" || cdtShell)) {
            forceListeningExamMins();
            armListeningTimerOnPlay();
            if (cdtShell) installCdtListeningIron();
          }
          // B5/C18: parent CDT owns the clock — kill paper alert('时间到…')
          if (cdtShell) {
            try {
              var iv = pageGet("timerInterval");
              if (iv) clearInterval(iv);
              pageSet("timerInterval", null);
            } catch (eT) { /* ignore */ }
          }
          afterStartRestore();
        }, 0);
      }
      return ret;
    };
    window.startTest._yysdHooked = true;
  }

  function hookSubmitTest() {
    var fn = window.submitTest;
    if (typeof fn !== "function" || fn._yysdHooked) return;
    window.submitTest = function () {
      clearDraft();
      ensureBandHelpers();
      try {
        var ret = fn.apply(this, arguments);
        examLock.disable();
        return ret;
      } catch (err) {
        // ponytail: papers set submitted=true before scoring — unlock so student can retry
        pageSet("submitted", false);
        console.error("[yysd] submitTest failed", err);
        try {
          alert(cdtShell
            ? "Submit failed. Please try again or tell your invigilator."
            : "交卷失败，请再试一次。若仍不行请联系老师。");
        } catch (e) {}
        return;
      }
    };
    submitTest._yysdHooked = true;
  }

  function hookBackToCover() {
    var fn = window.backToCover;
    if (typeof fn !== "function" || fn._yysdHooked) return;
    origBackToCover = fn;
    window.backToCover = function () {
      if (examLock.isOn() && !isTestDone() && isTestingLR()) {
        alert(cdtShell
          ? "You cannot leave during a mock test. Use Finish section to end this part."
          : "模考进行中不可返回封面。如需结束，请滚动至底部点击「提交并批改」。");
        return;
      }
      examLock.disable();
      saveDraftNow();
      var ret = origBackToCover.apply(this, arguments);
      setTimeout(showResumeBanner, 0);
      return ret;
    };
    backToCover._yysdHooked = true;
  }

  function continueDraft(draft) {
    restorePending = draft;
    if (draft.mode === "practice") {
      if (typeof openMode === "function") openMode();
      setTimeout(function () {
        document.querySelectorAll(".secbox").forEach(function (cb) {
          cb.checked = draft.sections.indexOf(+cb.value) !== -1;
        });
        if (typeof startTest === "function") startTest("practice");
      }, 0);
    } else if (typeof startTest === "function") {
      startTest("exam");
    }
  }

  function showResumeBanner() {
    var draft = loadDraft();
    if (!draft || draft.mode === "exam" || !countAnswered(draft.answers)) return;
    var cover = document.getElementById("coverArea");
    if (!cover) return;
    var old = document.getElementById("yysd-resume-bar");
    if (old) old.remove();

    var n = countAnswered(draft.answers);
    var when = draft.savedAt ? new Date(draft.savedAt).toLocaleString("zh-CN") : "";
    var bar = document.createElement("div");
    bar.id = "yysd-resume-bar";
    bar.style.cssText = "margin-top:16px;padding:14px 18px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;text-align:center;";
    bar.innerHTML =
      '<p style="margin:0 0 10px;color:#065f46;font-weight:600;">发现未完成进度（已保存 ' + n + " 道题" +
      (when ? "，" + when : "") + "）</p>" +
      '<button type="button" id="yysd-resume-btn" style="background:#059669;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;margin-right:8px;">继续上次练习</button>' +
      '<button type="button" id="yysd-discard-btn" style="background:#fff;color:#64748b;border:1px solid #cbd5e1;padding:10px 16px;border-radius:8px;cursor:pointer;">重新开始</button>';
    bar.querySelector("#yysd-resume-btn").addEventListener("click", function () { bar.remove(); continueDraft(draft); });
    bar.querySelector("#yysd-discard-btn").addEventListener("click", function () { clearDraft(); bar.remove(); });
    cover.appendChild(bar);
  }

  var draftListenersBound = false;
  var assignedBooted = false;
  function bootAssignedPart() {
    if (assignedBooted) return;
    // ponytail: CDT parent gate owns start + section pick; don't auto-start under shell
    if (cdtShell) return;
    var part = Number((script && script.dataset.assignPart) || 0);
    if (!part) {
      try {
        part = Number(new URLSearchParams(location.search).get("assignPart") || 0);
      } catch (e) { part = 0; }
    }
    if (!part) return;
    function go() {
      if (assignedBooted || typeof startTest !== "function") return false;
      if (typeof openMode === "function") openMode();
      var boxes = document.querySelectorAll(".secbox");
      if (!boxes.length) return false;
      var found = false;
      boxes.forEach(function (cb) {
        var on = Number(cb.value) === part;
        cb.checked = on;
        if (on) found = true;
      });
      if (!found) return false;
      assignedBooted = true;
      startTest("practice");
      return true;
    }
    if (!go()) setTimeout(go, 80);
  }

  function initDraft() {
    ensureBandHelpers();
    hookStartTest();
    hookSubmitTest();
    hookBackToCover();
    bootAssignedPart();
    if (!script || !script.dataset.assignPart) showResumeBanner();
    if (draftListenersBound) return;
    draftListenersBound = true;
    window.addEventListener("pagehide", saveDraftNow);
    window.addEventListener("beforeunload", saveDraftNow);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initDraft);
  else initDraft();
  setTimeout(initDraft, 150);
})();
