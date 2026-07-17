/* =========================================================================
   exam-bridge.js — injected in mock iframes: draft autosave, writing sync, time-up
   ========================================================================= */
(function () {
  "use strict";

  var script = document.currentScript;
  var bridgeMode = (script && script.dataset.mode) || "exam";
  var examId = (script && script.dataset.examId) || "";
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
        return savedConfirm.apply(window, arguments);
      };
      window.alert = function () {
        pauseVoid(8000);
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
      if (document.hidden) voidExam();
      else clearTimeout(voidCheckTimer);
    }

    function onBlur() {
      if (!on || voided) return;
      scheduleVoidCheck();
    }

    function onFocus() {
      clearTimeout(voidCheckTimer);
    }

    function onPageHide() {
      if (!on || voided) return;
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

    function hookWritingStart() {
      var fn = window.startTest;
      if (typeof fn !== "function" || fn._yysdHooked) return;
      window.startTest = function () {
        examLock.enable();
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
          alert("模考进行中不可返回封面。如需结束，请点「完成并查看报告」。");
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

    function renderGradeHtml(d) {
      var g = d && d.grade;
      var html = "";
      if (g) {
        html += '<div class="yysd-ai-grade__score"><h4>写作评分 · Overall ' + escHtml(g.overall) +
          " <span style=\"font-weight:500;font-size:12px;color:#64748b\">（AI 估分 · 非正式考分）</span></h4><dl>" +
          "<dt>Task</dt><dd>" + escHtml(g.task) + "</dd>" +
          "<dt>Coherence</dt><dd>" + escHtml(g.coherence) + "</dd>" +
          "<dt>Lexical</dt><dd>" + escHtml(g.lexical) + "</dd>" +
          "<dt>Grammar</dt><dd>" + escHtml(g.grammar) + "</dd></dl>" +
          (g.comment ? "<p>" + escHtml(g.comment) + "</p>" : "") + "</div>";
        var cn = g.criteriaNotes || {};
        if (cn.task || cn.coherence || cn.lexical || cn.grammar) {
          html += "<h4>对照官方四项说明</h4><ul>" +
            (cn.task ? "<li><b>Task</b>：" + escHtml(cn.task) + "</li>" : "") +
            (cn.coherence ? "<li><b>Coherence</b>：" + escHtml(cn.coherence) + "</li>" : "") +
            (cn.lexical ? "<li><b>Lexical</b>：" + escHtml(cn.lexical) + "</li>" : "") +
            (cn.grammar ? "<li><b>Grammar</b>：" + escHtml(cn.grammar) + "</li>" : "") +
            "</ul>";
        }
        if (g.paragraphNotes && g.paragraphNotes.length) {
          html += "<h4>逐段批注</h4><ul>" + g.paragraphNotes.map(function (n) {
            return "<li>" + escHtml(n) + "</li>";
          }).join("") + "</ul>";
        }
        if (g.corrections && g.corrections.length) {
          html += "<h4>用词 / 语法纠错</h4><ul>" + g.corrections.map(function (c) {
            return "<li><s>" + escHtml(c.bad) + "</s> → <b>" + escHtml(c.good) + "</b>" +
              (c.why ? "（" + escHtml(c.why) + "）" : "") + "</li>";
          }).join("") + "</ul>";
        }
        if (g.nextSteps && g.nextSteps.length) {
          html += "<h4>提分建议</h4><ul>" + g.nextSteps.map(function (n) {
            return "<li>" + escHtml(n) + "</li>";
          }).join("") + "</ul>";
        }
        if (g.modelEssay) {
          html += "<h4>同题高分范文</h4><pre class=\"yysd-ai-grade__model\">" + escHtml(g.modelEssay) + "</pre>";
        }
      }
      // ponytail: ignore raw LLM dumps that look like failed JSON payloads
      var fb = d && d.feedback ? String(d.feedback).trim() : "";
      if (fb && fb.indexOf("WRITING_JSON") < 0 && fb.charAt(0) !== "{") {
        html += "<div class=\"yysd-ai-grade__feedback\">" + escHtml(fb) + "</div>";
      }
      return html || "<p>未返回结构化评分，请重试</p>";
    }

    function ensureAiPanel() {
      var ra = document.getElementById("resultArea");
      if (!ra || getComputedStyle(ra).display === "none") return null;
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
        delete gradePending[reqId];
        setGradeButtonsBusy(false);
        setGradeHint("无法联系父页面，请刷新重试", true);
      }
    }

    function onWritingGradeRes(d) {
      if (!d || !d.reqId || !gradePending[d.reqId]) return;
      var taskType = gradePending[d.reqId];
      delete gradePending[d.reqId];
      setGradeButtonsBusy(Object.keys(gradePending).length > 0);
      if (d.error) {
        setGradeHint(d.error, true);
        return;
      }
      setGradeHint("");
      var box = document.getElementById("yysd-ai-grade-" + taskType);
      if (!box) return;
      box.hidden = false;
      box.innerHTML = "<h3>" + (taskType === "task1" ? "Task 1" : "Task 2") + " 批改结果</h3>" + renderGradeHtml(d);
      if (d.quota && d.quota.textLeft != null) {
        setGradeHint("今日文字额度剩余 " + d.quota.textLeft + "/" + d.quota.textLimit);
      }
    }

    function onResultVisible() {
      reportWriting();
      ensureAiPanel();
    }

    function reportWriting() {
      if (posted) return;
      var ra = document.getElementById("resultArea");
      if (!ra || getComputedStyle(ra).display === "none") return;
      var r1 = document.getElementById("r1");
      var r2 = document.getElementById("r2");
      var n1 = r1 ? parseInt(r1.textContent, 10) || 0 : 0;
      var n2 = r2 ? parseInt(r2.textContent, 10) || 0 : 0;
      // ponytail: store essays for teacher grading; 8k/task covers IELTS length
      postScore({
        score: null, total: null, writingWords: n1 + n2, completed: true,
        writingTask1: readWritingTask(1),
        writingTask2: readWritingTask(2)
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
        elapsedSec: Math.floor((Date.now() - st) / 1000)
      }, "*");
    } catch (e) { /* ponytail: iframe edge */ }
  }

  function hookStartTest() {
    var fn = window.startTest;
    if (typeof fn !== "function" || fn._yysdHooked) return;
    window.startTest = function (m) {
      ensurePageGlobals();
      if (m === "exam") examLock.enable();
      else examLock.disable();
      // ponytail: auto-restore practice draft — exit copy promises autosave/continue
      if (m === "practice" && !restorePending) {
        var d = loadDraft();
        if (d && d.mode === "practice" && countAnswered(d.answers)) {
          restorePending = d;
          if (d.sections && d.sections.length) {
            document.querySelectorAll(".secbox").forEach(function (cb) {
              cb.checked = d.sections.indexOf(+cb.value) !== -1;
            });
          }
        }
      }
      var ret;
      try {
        ret = fn.apply(this, arguments);
      } finally {
        setTimeout(afterStartRestore, 0);
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
      var ret = fn.apply(this, arguments);
      examLock.disable();
      return ret;
    };
    submitTest._yysdHooked = true;
  }

  function hookBackToCover() {
    var fn = window.backToCover;
    if (typeof fn !== "function" || fn._yysdHooked) return;
    origBackToCover = fn;
    window.backToCover = function () {
      if (examLock.isOn() && !isTestDone() && isTestingLR()) {
        alert("模考进行中不可返回封面。如需结束，请滚动至底部点击「提交并批改」。");
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
