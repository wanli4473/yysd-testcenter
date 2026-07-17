/* =========================================================================
   vocab-bridge.js — injected into vocab LIST iframes by exam.js
   Posts score + wrong words when the test results panel becomes visible.
   Also enforces per-question 20s limit (after audio) + 2s feedback auto-next.
   ponytail: DOM scrape — works for new LISTs that follow template hooks;
   upgrade path: add ids/classes listed in scripts/verify_vocab_wrongword_hooks.py
   ========================================================================= */
(function () {
  "use strict";
  var script = document.currentScript;
  var book = (script && script.dataset.book) || "gaozhong";
  var posted = false;
  var testStartedMs = 0;

  // --- timed question (20s after audio / on show; 2s feedback then next) ---
  var QUESTION_SECS = 20;
  var FEEDBACK_MS = 2000;
  var tickTimer = null;
  var autoNextTimer = null;
  var remaining = 0;
  var playWatchersReady = false;
  // ponytail: one countdown per question — replay must not refresh the 20s
  var countdownStarted = false;

  function resultsPanel() {
    return document.getElementById("testResults") ||
      document.querySelector(".test-results");
  }

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

  function parseGaozhongRow(tr) {
    var cells = tr.querySelectorAll("td");
    if (cells.length < 4) return null;
    var wordCell = cells[1];
    var strong = wordCell.querySelector("strong");
    var word = strong ? strong.textContent.trim() : "";
    if (!word) {
      var line = wordCell.textContent.trim().split("\n")[0].trim();
      word = line.split(/\s+/)[0] || "";
    }
    if (!word) return null;
    var spans = wordCell.querySelectorAll("span");
    var ipa = spans[0] ? spans[0].textContent.trim() : "";
    var meaning = spans[1] ? spans[1].textContent.trim() : "";
    if (!meaning && spans.length === 1) meaning = "";
    if (!meaning) {
      var parts = wordCell.textContent.trim().split("\n");
      if (parts.length > 1) meaning = parts[parts.length - 1].trim();
    }
    var userSpelling = cells[2].textContent.trim();
    var userMeaning = cells[3].textContent.trim();
    if (userSpelling === "—") userSpelling = "";
    if (userMeaning === "—") userMeaning = "";
    var spellColor = cells[2].style.color || "";
    var meanColor = cells[3].style.color || "";
    return {
      word: word, ipa: ipa, meaning: meaning, acceptCN: [],
      userSpelling: userSpelling, userMeaning: userMeaning,
      spellingCorrect: spellColor.indexOf("3a7d5a") >= 0,
      meaningCorrect: meanColor.indexOf("3a7d5a") >= 0
    };
  }

  function collectFromGaozhongTable(tbody) {
    var out = [];
    tbody.querySelectorAll("tr.row-wrong").forEach(function (tr) {
      var row = parseGaozhongRow(tr);
      if (row) out.push(row);
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

    var panel = resultsPanel();
    if (!panel) return [];

    var merged = [];
    panel.querySelectorAll("table.results-table tbody, #resultsTableBody").forEach(function (tb) {
      merged = merged.concat(collectFromGaozhongTable(tb));
    });
    if (merged.length) return merged;

    return collectFromSpecialTables(panel);
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

  function timingPayload() {
    if (!testStartedMs) return {};
    return {
      startedAt: new Date(testStartedMs).toISOString(),
      durationSec: Math.max(0, Math.round((Date.now() - testStartedMs) / 1000))
    };
  }

  function postScore() {
    var wrongWords = collectWrongWordsFromData();
    if (!wrongWords) wrongWords = collectWrongWordsFromDom();
    var parsed = parseScore();
    try {
      window.parent.postMessage(Object.assign({
        type: "yysd:score",
        score: parsed.score,
        total: parsed.total,
        book: book,
        wrongWords: wrongWords
      }, timingPayload()), "*");
    } catch (e) { /* ponytail: iframe edge — parent may be unreachable */ }
  }

  function onResultsVisible() {
    if (posted) return;
    posted = true;
    setTimeout(postScore, 0);
  }

  function watchResultsPanel() {
    var panel = resultsPanel();
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

  function hookStartTest() {
    if (typeof startTest !== "function" || startTest.__yysdHooked) return false;
    var orig = startTest;
    startTest = function () {
      testStartedMs = Date.now();
      return orig.apply(this, arguments);
    };
    startTest.__yysdHooked = true;
    return true;
  }

  function activeRoot() {
    return document.getElementById("testActiveArea") ||
      document.getElementById("testActive");
  }

  function isTestRunning() {
    var root = activeRoot();
    var results = resultsPanel();
    return !!(root && root.classList.contains("visible") &&
      !(results && results.classList.contains("visible")));
  }

  function elSubmit() { return document.getElementById("btnSubmit"); }
  function elNext() { return document.getElementById("btnNext"); }

  function playButtons() {
    return [
      document.getElementById("btnPlayTest"),
      document.getElementById("btnPlayDict")
    ].filter(Boolean);
  }

  function submitReady() {
    var sub = elSubmit();
    if (!sub) return false;
    if (sub.disabled) return false;
    if (sub.style.display === "none") return false;
    return true;
  }

  function visiblePlayButtons() {
    return playButtons().filter(function (b) { return b.offsetParent !== null; });
  }

  function ensureTimerUI() {
    if (document.getElementById("yysd-vocab-timer-style")) return;
    var style = document.createElement("style");
    style.id = "yysd-vocab-timer-style";
    style.textContent =
      "#yysd-vocab-timer{display:none;margin:10px auto 0;max-width:280px;font:600 0.95rem/1.3 system-ui,sans-serif;color:#1a3a5c;text-align:center}" +
      "#yysd-vocab-timer.is-on{display:block}" +
      "#yysd-vocab-timer .yysd-vocab-timer__secs{font-variant-numeric:tabular-nums;font-size:1.35rem}" +
      "#yysd-vocab-timer.is-low{color:#c0392b}" +
      "#yysd-vocab-timer-bar{height:4px;margin-top:6px;border-radius:2px;background:#e8eef4;overflow:hidden}" +
      "#yysd-vocab-timer-bar>i{display:block;height:100%;width:100%;background:#3a7d5a;transform-origin:left center;transition:transform .2s linear}" +
      "#yysd-vocab-timer.is-low #yysd-vocab-timer-bar>i{background:#c0392b}" +
      "#yysd-vocab-timer.is-wait{color:#888;font-weight:500}";
    document.head.appendChild(style);
  }

  function timerEl() {
    var el = document.getElementById("yysd-vocab-timer");
    if (el) return el;
    ensureTimerUI();
    el = document.createElement("div");
    el.id = "yysd-vocab-timer";
    el.setAttribute("aria-live", "polite");
    el.innerHTML =
      '<div><span class="yysd-vocab-timer__label">剩余 </span>' +
      '<span class="yysd-vocab-timer__secs">20</span>' +
      '<span class="yysd-vocab-timer__unit"> 秒</span></div>' +
      '<div id="yysd-vocab-timer-bar"><i></i></div>';
    var root = activeRoot();
    var progress = root && root.querySelector(".test-progress");
    if (progress) progress.insertAdjacentElement("afterend", el);
    else if (root) root.insertBefore(el, root.firstChild);
    else document.body.appendChild(el);
    return el;
  }

  function clearTick() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    remaining = 0;
    countdownStarted = false;
    var el = document.getElementById("yysd-vocab-timer");
    if (el) {
      el.classList.remove("is-on", "is-low", "is-wait");
      el.style.display = "none";
    }
  }

  function clearAutoNext() {
    if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
  }

  function renderTimer(secs, waiting) {
    var el = timerEl();
    var secsEl = el.querySelector(".yysd-vocab-timer__secs");
    var label = el.querySelector(".yysd-vocab-timer__label");
    var unit = el.querySelector(".yysd-vocab-timer__unit");
    var bar = el.querySelector("#yysd-vocab-timer-bar > i");
    el.classList.add("is-on");
    el.style.display = "block";
    if (waiting) {
      el.classList.add("is-wait");
      el.classList.remove("is-low");
      if (label) label.textContent = "";
      if (secsEl) secsEl.textContent = "听读音中…";
      if (unit) unit.textContent = "";
      if (bar) bar.style.transform = "scaleX(1)";
      return;
    }
    el.classList.remove("is-wait");
    if (label) label.textContent = "剩余 ";
    if (secsEl) secsEl.textContent = String(secs);
    if (unit) unit.textContent = " 秒";
    el.classList.toggle("is-low", secs <= 5);
    if (bar) bar.style.transform = "scaleX(" + Math.max(0, secs / QUESTION_SECS) + ")";
  }

  function startCountdown() {
    if (!isTestRunning() || !submitReady()) return;
    if (countdownStarted) return;
    countdownStarted = true;
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    remaining = QUESTION_SECS;
    renderTimer(remaining, false);
    tickTimer = setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        remaining = 0;
        var el = document.getElementById("yysd-vocab-timer");
        if (el) {
          el.classList.remove("is-on", "is-low", "is-wait");
          el.style.display = "none";
        }
        onQuestionTimeout();
        return;
      }
      renderTimer(remaining, false);
    }, 1000);
  }

  function onQuestionTimeout() {
    if (!isTestRunning() || !submitReady()) return;
    window.__vocabTestTimedOut = true;
    try {
      elSubmit().click();
    } finally {
      setTimeout(function () { window.__vocabTestTimedOut = false; }, 0);
    }
  }

  function scheduleAutoNext() {
    clearAutoNext();
    autoNextTimer = setTimeout(function () {
      autoNextTimer = null;
      var next = elNext();
      if (next && next.classList.contains("visible") && isTestRunning()) next.click();
    }, FEEDBACK_MS);
  }

  function maybeStartWithoutAudio() {
    if (!isTestRunning() || !submitReady()) return;
    if (visiblePlayButtons().length) {
      if (!countdownStarted) renderTimer(QUESTION_SECS, true);
      return;
    }
    startCountdown();
  }

  function onPlayClassChange(btn) {
    if (!isTestRunning()) return;
    if (btn.classList.contains("playing")) {
      // First play of this question: show waiting. Replay: leave countdown alone.
      if (!countdownStarted && submitReady()) renderTimer(QUESTION_SECS, true);
      return;
    }
    if (submitReady()) startCountdown();
  }

  function watchPlayButtons() {
    if (playWatchersReady) return;
    var btns = playButtons();
    if (!btns.length) return;
    playWatchersReady = true;
    btns.forEach(function (btn) {
      new MutationObserver(function () { onPlayClassChange(btn); })
        .observe(btn, { attributes: true, attributeFilter: ["class"] });
    });
  }

  function watchNextButton() {
    var next = elNext();
    if (!next || next.__yysdTimerWatched) return;
    next.__yysdTimerWatched = true;
    new MutationObserver(function () {
      if (next.classList.contains("visible")) {
        clearTick();
        scheduleAutoNext();
      } else {
        clearAutoNext();
        watchPlayButtons();
        setTimeout(maybeStartWithoutAudio, 50);
      }
    }).observe(next, { attributes: true, attributeFilter: ["class"] });
  }

  function watchActiveRoot() {
    var root = activeRoot();
    if (!root || root.__yysdTimerWatched) return;
    root.__yysdTimerWatched = true;
    new MutationObserver(function () {
      if (!root.classList.contains("visible")) {
        clearTick();
        clearAutoNext();
        return;
      }
      testStartedMs = testStartedMs || Date.now();
      watchPlayButtons();
      watchNextButton();
      setTimeout(maybeStartWithoutAudio, 80);
    }).observe(root, { attributes: true, attributeFilter: ["class"] });
  }

  function bootTimer() {
    ensureTimerUI();
    watchActiveRoot();
    watchPlayButtons();
    watchNextButton();
    // #btnStartTest may reveal active area without class mutation if already wired
    var startBtn = document.getElementById("btnStartTest");
    if (startBtn && !startBtn.__yysdTimerHook) {
      startBtn.__yysdTimerHook = true;
      startBtn.addEventListener("click", function () {
        testStartedMs = Date.now();
        setTimeout(function () {
          watchPlayButtons();
          watchNextButton();
          maybeStartWithoutAudio();
        }, 500);
      });
    }
  }

  function boot() {
    hookStartTest();
    watchResultsPanel();
    hookShowFinalResults();
    hookShowResults();
    bootTimer();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
