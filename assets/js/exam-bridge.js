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

  function postScore(payload) {
    if (posted) return;
    posted = true;
    try {
      window.parent.postMessage(Object.assign({ type: "yysd:score" }, payload), "*");
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

    function reportWriting() {
      if (posted) return;
      var ra = document.getElementById("resultArea");
      if (!ra || getComputedStyle(ra).display === "none") return;
      var r1 = document.getElementById("r1");
      var r2 = document.getElementById("r2");
      var n1 = r1 ? parseInt(r1.textContent, 10) || 0 : 0;
      var n2 = r2 ? parseInt(r2.textContent, 10) || 0 : 0;
      postScore({ score: null, total: null, writingWords: n1 + n2, completed: true });
    }

    function initWriting() {
      hookWritingStart();
      hookWritingFinish();
      hookWritingBack();
      var ra = document.getElementById("resultArea");
      if (ra) {
        new MutationObserver(reportWriting).observe(ra, {
          attributes: true, attributeFilter: ["style"], childList: true, subtree: true
        });
        reportWriting();
      }
    }

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

  function initDraft() {
    hookStartTest();
    hookSubmitTest();
    hookBackToCover();
    showResumeBanner();
    window.addEventListener("pagehide", saveDraftNow);
    window.addEventListener("beforeunload", saveDraftNow);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initDraft);
  else initDraft();
  setTimeout(initDraft, 150);
})();
