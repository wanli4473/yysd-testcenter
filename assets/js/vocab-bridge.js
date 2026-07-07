/* =========================================================================
   vocab-bridge.js — injected into vocab LIST iframes by exam.js
   Wraps showFinalResults() to post wrong words + score to parent shell.
   ========================================================================= */
(function () {
  "use strict";
  var script = document.currentScript;
  var book = (script && script.dataset.book) || "gaozhong";

  function collectWrongWords() {
    if (typeof testResultsData === "undefined" || !Array.isArray(testResultsData)) return [];
    var out = [];
    testResultsData.forEach(function (r) {
      if (r.earned !== 0) return;
      var acceptCN = [];
      if (typeof wordData !== "undefined" && Array.isArray(wordData)) {
        for (var i = 0; i < wordData.length; i++) {
          if (String(wordData[i].word).toLowerCase() === String(r.word).toLowerCase()) {
            acceptCN = wordData[i].acceptCN || [];
            break;
          }
        }
      }
      out.push({
        word: r.word, ipa: r.ipa, meaning: r.meaning, acceptCN: acceptCN,
        userSpelling: r.userSpelling, userMeaning: r.userMeaning,
        spellingCorrect: r.spellingCorrect, meaningCorrect: r.meaningCorrect
      });
    });
    return out;
  }

  function postScore() {
    var earnedTotal = 0;
    if (typeof testResultsData !== "undefined" && Array.isArray(testResultsData)) {
      earnedTotal = testResultsData.reduce(function (s, r) { return s + (r.earned || 0); }, 0);
    }
    var total = typeof TOTAL_QUESTIONS !== "undefined"
      ? TOTAL_QUESTIONS
      : (testResultsData ? testResultsData.length : 0);
    try {
      window.parent.postMessage({
        type: "yysd:score",
        score: earnedTotal,
        total: total,
        book: book,
        wrongWords: collectWrongWords()
      }, "*");
    } catch (e) { /* ponytail: iframe edge — parent may be unreachable */ }
  }

  function hook() {
    if (typeof showFinalResults !== "function" || showFinalResults.__yysdHooked) return false;
    var orig = showFinalResults;
    showFinalResults = function () {
      postScore();
      return orig.apply(this, arguments);
    };
    showFinalResults.__yysdHooked = true;
    return true;
  }

  if (!hook()) {
    var tries = 0;
    var timer = setInterval(function () {
      if (hook() || ++tries > 60) clearInterval(timer);
    }, 100);
  }
})();
