/* =========================================================================
   exam-bridge.js — injected in mock iframes: draft autosave, writing sync, time-up
   ========================================================================= */
(function () {
  "use strict";

  var script = document.currentScript;
  var bridgeMode = (script && script.dataset.mode) || "exam";
  var examId = (script && script.dataset.examId) || "";
  var posted = false;

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

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "yysd:time-up") autoSubmit();
  });

  if (bridgeMode === "writing") {
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
    var ra = document.getElementById("resultArea");
    if (ra) {
      new MutationObserver(reportWriting).observe(ra, {
        attributes: true, attributeFilter: ["style"], childList: true, subtree: true
      });
      reportWriting();
    }
    return;
  }

  /* ---- listening / reading draft autosave ---- */
  if (!examId) {
    var pathMatch = location.pathname.match(/cambridge-\d+-test-\d+(?:-[a-z]+)?\.html$/i);
    if (pathMatch) examId = pathMatch[0].replace(/\.html$/i, "");
  }
  if (!examId) return;

  var DRAFT_KEY = "yysd:draft:" + examId;
  var saveTimer = null;
  var restorePending = null;
  var saveBound = false;

  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { return null; }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  function isTesting() {
    var ta = document.getElementById("testArea");
    return ta && getComputedStyle(ta).display !== "none";
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

  function saveDraft() {
    if (!isTesting()) return;
    if (typeof submitted !== "undefined" && submitted) return;
    var answers = collectAnswers();
    if (!countAnswered(answers)) return;
    var draft = {
      mode: typeof mode !== "undefined" ? mode : "practice",
      sections: typeof selectedSections !== "undefined" ? selectedSections.slice() : [],
      answers: answers,
      startTime: typeof startTime !== "undefined" ? startTime : 0,
      elapsedSec: typeof startTime !== "undefined" && startTime
        ? Math.floor((Date.now() - startTime) / 1000) : 0,
      savedAt: Date.now()
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
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
    if (!restorePending) { bindSaveListeners(); saveDraft(); return; }
    applyAnswers(restorePending.answers);
    if (typeof startTime !== "undefined") {
      if (restorePending.startTime) startTime = restorePending.startTime;
      else if (restorePending.elapsedSec) startTime = Date.now() - restorePending.elapsedSec * 1000;
    }
    restorePending = null;
    bindSaveListeners();
    saveDraft();
  }

  function hookFn(name, after) {
    var fn = window[name];
    if (typeof fn !== "function" || fn._yysdHooked) return;
    window[name] = function () {
      var ret = fn.apply(this, arguments);
      if (after) setTimeout(after, 0);
      return ret;
    };
    window[name]._yysdHooked = true;
  }

  function hookStartTest() {
    hookFn("startTest", afterStartRestore);
  }

  function hookSubmitTest() {
    var fn = window.submitTest;
    if (typeof fn !== "function" || fn._yysdHooked) return;
    window.submitTest = function () {
      clearDraft();
      return fn.apply(this, arguments);
    };
    submitTest._yysdHooked = true;
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
    if (!draft || !countAnswered(draft.answers)) return;
    var cover = document.getElementById("coverArea");
    if (!cover || document.getElementById("yysd-resume-bar")) return;

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
    showResumeBanner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initDraft);
  else initDraft();
  setTimeout(initDraft, 150);
})();
