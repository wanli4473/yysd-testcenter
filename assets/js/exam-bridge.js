/* =========================================================================
   exam-bridge.js — injected in mock iframes: writing sync + time-up submit
   ========================================================================= */
(function () {
  "use strict";

  var mode = (document.currentScript && document.currentScript.dataset.mode) || "exam";
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

  if (mode === "writing") {
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
  }
})();
