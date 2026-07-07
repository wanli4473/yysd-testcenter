/* =========================================================================
   vocab-bridge.js — injected into vocab LIST iframes by exam.js
   Posts score + wrong words when #testResults becomes visible.
   ponytail: DOM scrape — test state lives inside IIFEs.
   ========================================================================= */
(function () {
  "use strict";
  var script = document.currentScript;
  var book = (script && script.dataset.book) || "gaozhong";
  var posted = false;

  function collectWrongWordsFromData() {
    if (typeof testResultsData === "undefined" || !Array.isArray(testResultsData)) return null;
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

  function collectFromGaozhongTable(tbody) {
    var out = [];
    tbody.querySelectorAll("tr.row-wrong").forEach(function (tr) {
      var cells = tr.querySelectorAll("td");
      if (cells.length < 4) return;
      var wordCell = cells[1];
      var strong = wordCell.querySelector("strong");
      var word = strong ? strong.textContent.trim() : "";
      if (!word) return;
      var spans = wordCell.querySelectorAll("span");
      var ipa = spans[0] ? spans[0].textContent.trim() : "";
      var meaning = spans[1] ? spans[1].textContent.trim() : "";
      var userSpelling = cells[2].textContent.trim();
      var userMeaning = cells[3].textContent.trim();
      if (userSpelling === "—") userSpelling = "";
      if (userMeaning === "—") userMeaning = "";
      var spellColor = cells[2].style.color || "";
      var meanColor = cells[3].style.color || "";
      out.push({
        word: word, ipa: ipa, meaning: meaning, acceptCN: [],
        userSpelling: userSpelling, userMeaning: userMeaning,
        spellingCorrect: spellColor.indexOf("3a7d5a") >= 0,
        meaningCorrect: meanColor.indexOf("3a7d5a") >= 0
      });
    });
    return out;
  }

  function parseSpecialWrongRow(question, correct, userAnswer) {
    question = String(question || "").replace(/<[^>]+>/g, "").trim();
    correct = String(correct || "").trim();
    userAnswer = String(userAnswer || "").trim();
    if (userAnswer === "未作答") userAnswer = "";

    var word = "";
    var meaning = "";
    var dict = question.match(/听写[：:]\s*(.+)/);
    if (dict) word = dict[1].trim();

    var correctParts = correct.split(/\s*[—–]\s*/);
    if (!word && correctParts[0]) word = correctParts[0].trim();
    if (correctParts.length > 1) meaning = correctParts.slice(1).join(" — ").trim();

    if (!meaning) {
      var meanM = question.match(/[「『](.+?)[」』]/);
      if (meanM) meaning = meanM[1];
    }

    var userSpelling = "";
    var userMeaning = "";
    var spellM = userAnswer.match(/拼写[：:]\s*([^/]+)/);
    var meanM2 = userAnswer.match(/含义[：:]\s*(.+)/);
    if (spellM) userSpelling = spellM[1].trim();
    if (meanM2) userMeaning = meanM2[1].trim();
    if (!userSpelling && !userMeaning && userAnswer) userSpelling = userAnswer;

    if (!word) word = (correctParts[0] || correct).trim();
    if (!meaning) meaning = question.replace(/^辨析[：:]\s*/, "");

    if (!word) return null;

    return {
      word: word, ipa: "", meaning: meaning, acceptCN: [],
      userSpelling: userSpelling, userMeaning: userMeaning,
      spellingCorrect: false, meaningCorrect: false
    };
  }

  function collectFromSpecialTables(root) {
    var out = [];
    var seen = {};
    root.querySelectorAll("tr.row-wrong, tr.row-unanswered").forEach(function (tr) {
      if (tr.querySelector("td[colspan]")) return;
      var cells = tr.querySelectorAll("td");
      if (cells.length < 4) return;
      var parsed = parseSpecialWrongRow(cells[1].textContent, cells[3].textContent, cells[2].textContent);
      if (!parsed) return;
      var key = parsed.word.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(parsed);
    });
    return out;
  }

  function collectWrongWordsFromDom() {
    var tbody = document.getElementById("resultsTableBody");
    if (tbody) return collectFromGaozhongTable(tbody);
    var stage = document.getElementById("stageResults");
    if (stage) return collectFromSpecialTables(stage);
    return [];
  }

  function parseScore() {
    var summary = document.getElementById("summary");
    if (summary) {
      var num = summary.querySelector(".item .num");
      if (num) {
        var sm = String(num.textContent || "").match(/(\d+)\s*\/\s*(\d+)/);
        if (sm) return { score: Number(sm[1]), total: Number(sm[2]) };
      }
    }
    var scoreEl = document.getElementById("resultsScore");
    if (scoreEl) {
      var m = String(scoreEl.textContent || "").match(/(\d+)\s*\/\s*(\d+)/);
      if (m) return { score: Number(m[1]), total: Number(m[2]) };
    }
    if (typeof testResultsData !== "undefined" && Array.isArray(testResultsData)) {
      var earned = testResultsData.reduce(function (s, r) { return s + (r.earned || 0); }, 0);
      var total = typeof TOTAL_QUESTIONS !== "undefined" ? TOTAL_QUESTIONS : testResultsData.length;
      return { score: earned, total: total };
    }
    return { score: 0, total: 0 };
  }

  function postScore() {
    var wrongWords = collectWrongWordsFromData();
    if (!wrongWords) wrongWords = collectWrongWordsFromDom();
    var parsed = parseScore();
    try {
      window.parent.postMessage({
        type: "yysd:score",
        score: parsed.score,
        total: parsed.total,
        book: book,
        wrongWords: wrongWords
      }, "*");
    } catch (e) { /* ponytail: iframe edge — parent may be unreachable */ }
  }

  function onResultsVisible() {
    if (posted) return;
    posted = true;
    setTimeout(postScore, 0);
  }

  function watchResultsPanel() {
    var panel = document.getElementById("testResults");
    if (!panel) return false;
    if (panel.classList.contains("visible")) onResultsVisible();
    new MutationObserver(function () {
      if (panel.classList.contains("visible")) onResultsVisible();
      else posted = false;
    }).observe(panel, { attributes: true, attributeFilter: ["class"] });
    return true;
  }

  function hookShowFinalResults() {
    if (typeof showFinalResults !== "function" || showFinalResults.__yysdHooked) return false;
    var orig = showFinalResults;
    showFinalResults = function () {
      var ret = orig.apply(this, arguments);
      onResultsVisible();
      return ret;
    };
    showFinalResults.__yysdHooked = true;
    return true;
  }

  function hookShowResults() {
    if (typeof showResults !== "function" || showResults.__yysdHooked) return false;
    var orig = showResults;
    showResults = function () {
      var ret = orig.apply(this, arguments);
      onResultsVisible();
      return ret;
    };
    showResults.__yysdHooked = true;
    return true;
  }

  function boot() {
    watchResultsPanel();
    hookShowFinalResults();
    hookShowResults();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
