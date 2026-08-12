/* vocab-quiz.js — bookshelf book → multi-list → template 闯关 (60% / 5 lives / 20s) */
(function () {
  "use strict";
  var Y = window.YYSD;
  var A = window.YYSD_AUTH;
  var root = document.getElementById("vq-root");
  var params = new URLSearchParams(location.search);
  var retestSessionId = Number(params.get("session") || 0);

  var MAX_LIVES = 5;
  var TIME_SEC = 20;
  var meta = { bookId: "", bookLabel: "", listIds: [], listLabels: [], sessionId: 0 };
  var words = [];
  var state = {
    phase: "setup", // setup | quiz | done
    quizOrder: [],
    quizIdx: 0,
    lives: MAX_LIVES,
    correct: 0,
    wrong: 0,
    mistakes: [],
    selectedMeaning: null,
    answered: false,
    waiting: false,
    gameOver: false,
    timer: null,
    timerLeft: TIME_SEC,
    poolTotal: 0
  };

  function esc(s) {
    return Y && Y.esc ? Y.esc(String(s == null ? "" : s)) : String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function needAuth() {
    if (!A || !A.getToken || !A.getToken()) {
      location.href = "login.html?next=" + encodeURIComponent(location.pathname + location.search);
      return false;
    }
    return true;
  }

  // ponytail: quiz defaults to Youdao US (type=2)
  function speak(word) {
    var WA = window.YysdWordAudio;
    if (WA && WA.speakUs) {
      WA.speakUs(word);
      return;
    }
    if (WA && WA.speak) {
      WA.speak(word, 2);
      return;
    }
    if (!window.speechSynthesis || !word) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function meaningOptions(correct, n) {
    n = n || 4;
    var pool = words.map(function (w) { return w.meaning; }).filter(function (m) { return m !== correct; });
    pool = shuffle(pool).slice(0, n - 1);
    while (pool.length < n - 1) pool.push("（干扰项）" + (pool.length + 1));
    return shuffle([correct].concat(pool));
  }

  function shell(inner, opts) {
    opts = opts || {};
    var livesHtml = "";
    if (opts.showLives) {
      for (var i = 0; i < MAX_LIVES; i++) {
        livesHtml += '<span class="heart' + (i >= state.lives ? " lost" : "") + '">❤️</span>';
      }
    }
    root.innerHTML =
      '<div class="vl-app">' +
        '<div class="vl-top-bar">' +
          '<div class="vl-brand">优益思达 · <span>单词检测</span></div>' +
          '<div class="vl-list-badge">' + esc(meta.bookLabel || "检测") + "</div>" +
          (opts.showLives ? '<div class="vl-lives" id="lives">' + livesHtml + "</div>" : "") +
        "</div>" +
        '<div class="vl-info-row">' +
          '<div id="counter"></div>' +
          '<div class="vl-timer" id="timerWrap" style="display:none">⏱ <span class="num" id="timerNum">20</span>s</div>' +
        "</div>" +
        '<div id="panel">' + inner + "</div>" +
        '<div class="vl-overlay" id="overlay"><div class="vl-result-box" id="resultBox"></div></div>' +
      "</div>";
  }

  function renderSetup(shelf, bookDetail) {
    state.phase = "setup";
    var books = (shelf.books || []).map(function (b) { return b.book || { id: b.bookId, label: b.bookId }; });
    var bookId = meta.bookId || (books[0] && books[0].id) || "";
    var lists = (bookDetail && bookDetail.lists) || [];
    var bookOpts = books.map(function (b) {
      return '<option value="' + esc(b.id) + '"' + (b.id === bookId ? " selected" : "") + ">" +
        esc(b.label) + "</option>";
    }).join("");

    var listRows = lists.map(function (l) {
      var wc = l.wordCount != null ? l.wordCount + " 词" : "";
      return '<label class="vq-check">' +
        '<input type="checkbox" name="list" value="' + esc(l.id) + '">' +
        "<span><b>" + esc(l.label) + "</b> · " + esc(wc || "List") + "</span></label>";
    }).join("");

    root.innerHTML =
      '<div class="vs-hero bento-panel">' +
        '<h1 class="bento-panel__title">单词检测</h1>' +
        '<p class="bento-panel__desc">选书架词书 → 多选 List → 合并抽 60% · 听音选义 + 拼写 · 5 命 · 每题 20 秒</p>' +
        '<div class="vs-actions">' +
          '<a class="btn btn--ghost btn--sm" href="zone.html?zone=study&s=vocab">← 单词区</a>' +
          '<a class="btn btn--ghost btn--sm" href="vocab-shelf.html">词库书架</a>' +
        "</div>" +
      "</div>" +
      (books.length
        ? '<div class="bento-panel vq-setup">' +
            '<label class="vq-field">词书' +
              '<select id="vq-book">' + bookOpts + "</select></label>" +
            '<div class="vq-lists-head">' +
              '<span>选择 List（可多选）</span>' +
              '<button type="button" class="btn btn--ghost btn--sm" id="vq-all">全选</button>' +
            "</div>" +
            '<div class="vq-lists" id="vq-lists">' +
              (listRows || '<p class="vs-empty">该词书暂无 List</p>') +
            "</div>" +
            '<button type="button" class="btn btn--primary" id="vq-start" disabled>开始检测</button>' +
          "</div>"
        : '<div class="bento-panel"><p class="vs-empty">书架还是空的，请先<a href="vocab-shelf.html?view=catalog">添加词书</a>。</p></div>');

    if (!books.length) return;

    function refreshStart() {
      var n = root.querySelectorAll('input[name="list"]:checked').length;
      var btn = document.getElementById("vq-start");
      if (btn) btn.disabled = n < 1;
    }

    function loadBook(id) {
      meta.bookId = id;
      A.api("/api/vocab-shelf/book?bookId=" + encodeURIComponent(id))
        .then(function (d) { renderSetup(shelf, d); })
        .catch(function (e) { alert((e && e.message) || "加载失败"); });
    }

    document.getElementById("vq-book").onchange = function () {
      loadBook(this.value);
    };
    document.getElementById("vq-all").onclick = function () {
      root.querySelectorAll('input[name="list"]').forEach(function (c) { c.checked = true; });
      refreshStart();
    };
    document.getElementById("vq-lists").onchange = refreshStart;
    document.getElementById("vq-start").onclick = function () {
      var ids = [];
      root.querySelectorAll('input[name="list"]:checked').forEach(function (c) { ids.push(c.value); });
      if (!ids.length) return;
      startQuiz(meta.bookId || bookId, ids);
    };
    refreshStart();
  }

  function beginWithWords(d, opts) {
    opts = opts || {};
    words = d.words || [];
    if (!words.length) throw new Error("没有可测单词");
    meta.bookId = d.bookId || (d.book && d.book.id) || meta.bookId;
    meta.bookLabel = d.bookLabel || (d.book && d.book.label) || meta.bookId;
    meta.listIds = d.listIds || meta.listIds || [];
    meta.listLabels = d.listLabels || meta.listLabels || [];
    meta.sessionId = opts.sessionId || 0;
    MAX_LIVES = d.maxLives || MAX_LIVES || 5;
    TIME_SEC = d.timeLimitSec || TIME_SEC || 20;
    state.poolTotal = d.poolTotal != null ? d.poolTotal : words.length;
    state.quizOrder = shuffle(words.map(function (_, i) { return i; }));
    state.quizIdx = 0;
    state.lives = MAX_LIVES;
    state.correct = 0;
    state.wrong = 0;
    state.mistakes = [];
    state.gameOver = false;
    state.phase = "quiz";
    document.title = (opts.sessionId ? "错词重测 · " : "检测 · ") + meta.bookLabel + " · 优益思达";
    renderQuizActive();
  }

  function startQuiz(bookId, listIds) {
    root.innerHTML = '<div class="vl-state">正在组卷…</div>';
    A.api("/api/vocab-shelf/quiz-pool?bookId=" + encodeURIComponent(bookId) +
      "&listIds=" + encodeURIComponent(listIds.join(",")))
      .then(function (d) {
        beginWithWords(d, {});
      })
      .catch(function (e) {
        alert((e && e.message) || "组卷失败");
        boot();
      });
  }

  function startRetest(sessionId) {
    root.innerHTML = '<div class="vl-state">正在加载错词…</div>';
    A.api("/api/vocab-shelf/wrongbook/session?id=" + encodeURIComponent(sessionId))
      .then(function (d) {
        var s = d.session || {};
        beginWithWords({
          words: d.words || [],
          bookId: s.bookId,
          bookLabel: s.bookLabel,
          listIds: s.listIds,
          listLabels: s.listLabels,
          poolTotal: (d.words || []).length,
          maxLives: 5,
          timeLimitSec: 20
        }, { sessionId: sessionId });
      })
      .catch(function (e) {
        alert((e && e.message) || "加载失败");
        location.href = "wrong-words.html?session=" + encodeURIComponent(sessionId);
      });
  }

  function updateLives() {
    var el = document.getElementById("lives");
    if (!el) return;
    var h = "";
    for (var i = 0; i < MAX_LIVES; i++) {
      h += '<span class="heart' + (i >= state.lives ? " lost" : "") + '">❤️</span>';
    }
    el.innerHTML = h;
  }

  function currentWord() {
    return words[state.quizOrder[state.quizIdx]];
  }

  function pushMistake(w, userAnswer) {
    if (!w) return;
    var exists = state.mistakes.some(function (m) { return m.word === w.word; });
    if (exists) return;
    state.mistakes.push({
      word: w.word,
      ipa: w.ipa,
      meaning: w.meaning,
      listId: w.listId || null,
      userAnswer: userAnswer,
      word_json: w
    });
  }

  function startTimer() {
    clearInterval(state.timer);
    state.timerLeft = TIME_SEC;
    var wrap = document.getElementById("timerWrap");
    var num = document.getElementById("timerNum");
    if (wrap) wrap.style.display = "block";
    if (num) { num.textContent = state.timerLeft; num.className = "num"; }
    state.timer = setInterval(function () {
      state.timerLeft--;
      if (num) {
        num.textContent = state.timerLeft;
        num.classList.toggle("warning", state.timerLeft <= 3);
      }
      if (state.timerLeft <= 0) {
        clearInterval(state.timer);
        if (!state.answered && !state.gameOver) onTimeout();
      }
    }, 1000);
  }

  function renderQuizActive() {
    var w = currentWord();
    var opts = meaningOptions(w.meaning, 4);
    var labels = ["A", "B", "C", "D"];
    state.answered = false;
    state.waiting = false;
    state.selectedMeaning = null;
    shell(
      '<p class="vl-listen-hint">听发音，选择正确中文，再拼写英文</p>' +
      '<button type="button" class="vl-btn" id="listen">🔊 播放发音</button>' +
      '<div class="vl-spell-row">' +
        '<input type="text" id="spell" placeholder="拼写英文..." autocomplete="off" />' +
        '<button type="button" class="vl-btn vl-btn-primary" id="submit" disabled>提交</button>' +
      "</div>" +
      '<div class="vl-opts" id="opts">' +
        opts.map(function (o, i) {
          return '<button type="button" class="vl-opt" data-v="' + esc(o) + '"><span class="label">' +
            labels[i] + ".</span> " + esc(o) + "</button>";
        }).join("") +
      "</div>" +
      '<div class="vl-feedback" id="fb"></div>' +
      '<div class="vl-nav-row"><button type="button" class="vl-btn vl-btn-primary" id="qnext" disabled>下一题 →</button></div>',
      { showLives: true }
    );
    document.getElementById("counter").innerHTML =
      (meta.sessionId ? "错词重测 · " : "") +
      "第 <strong>" + (state.quizIdx + 1) + "</strong> / " + state.quizOrder.length +
      " · 正确 " + state.correct +
      (meta.sessionId
        ? ""
        : ' <span style="color:#8a9e96">（选自 ' + state.poolTotal + " 词的 60%）</span>");
    document.getElementById("listen").onclick = function () { speak(w.word); };
    setTimeout(function () { speak(w.word); }, 250);
    document.getElementById("opts").onclick = function (e) {
      var b = e.target.closest(".vl-opt");
      if (!b || state.answered) return;
      root.querySelectorAll(".vl-opt").forEach(function (x) { x.classList.remove("correct"); });
      b.classList.add("correct");
      state.selectedMeaning = b.getAttribute("data-v");
      document.getElementById("submit").disabled = false;
      document.getElementById("spell").focus();
    };
    document.getElementById("submit").onclick = submitQuiz;
    document.getElementById("spell").onkeydown = function (e) {
      if (e.key === "Enter") submitQuiz();
    };
    document.getElementById("qnext").onclick = nextQuizQ;
    startTimer();
  }

  function submitQuiz() {
    if (state.answered || state.gameOver || !state.selectedMeaning) return;
    var spell = document.getElementById("spell").value.trim().toLowerCase();
    if (!spell) {
      var fb0 = document.getElementById("fb");
      fb0.className = "vl-feedback show fail";
      fb0.textContent = "请拼写英文单词";
      return;
    }
    state.answered = true;
    clearInterval(state.timer);
    document.getElementById("spell").disabled = true;
    document.getElementById("submit").disabled = true;
    root.querySelectorAll(".vl-opt").forEach(function (b) { b.classList.add("disabled"); });
    var w = currentWord();
    var meaningOk = state.selectedMeaning === w.meaning;
    var spellOk = spell === w.word.toLowerCase();
    var ok = meaningOk && spellOk;
    root.querySelectorAll(".vl-opt").forEach(function (b) {
      if (b.getAttribute("data-v") === w.meaning) b.classList.add("correct");
      else if (b.getAttribute("data-v") === state.selectedMeaning && !meaningOk) b.classList.add("wrong");
    });
    var fb = document.getElementById("fb");
    if (ok) {
      fb.className = "vl-feedback show ok";
      fb.textContent = "✅ 完全正确！";
      state.correct++;
    } else {
      state.lives--;
      state.wrong++;
      pushMistake(w, spell);
      fb.className = "vl-feedback show fail";
      fb.textContent = "❌ 正确答案：" + w.word + "（" + w.meaning + "）";
      updateLives();
    }
    afterAnswer();
  }

  function onTimeout() {
    state.answered = true;
    state.waiting = true;
    var w = currentWord();
    pushMistake(w, "(timeout)");
    state.lives--;
    state.wrong++;
    updateLives();
    var fb = document.getElementById("fb");
    fb.className = "vl-feedback show timeout";
    fb.textContent = "⏰ 时间到！答案：" + w.word + "（" + w.meaning + "）";
    document.getElementById("spell").disabled = true;
    document.getElementById("submit").disabled = true;
    root.querySelectorAll(".vl-opt").forEach(function (b) {
      b.classList.add("disabled");
      if (b.getAttribute("data-v") === w.meaning) b.classList.add("correct");
    });
    afterAnswer();
  }

  function afterAnswer() {
    state.waiting = true;
    var nextBtn = document.getElementById("qnext");
    if (state.lives <= 0) {
      nextBtn.disabled = true;
      setTimeout(function () { endQuiz(false); }, 900);
      return;
    }
    if (state.quizIdx >= state.quizOrder.length - 1) {
      nextBtn.disabled = true;
      setTimeout(function () { endQuiz(true); }, 900);
      return;
    }
    nextBtn.disabled = false;
  }

  function nextQuizQ() {
    if (state.gameOver || !state.waiting) return;
    state.quizIdx++;
    renderQuizActive();
  }

  function endQuiz(finishedAll) {
    var passed = !!(finishedAll && state.lives > 0);
    if (state.lives <= 0) passed = false;
    state.gameOver = true;
    state.phase = "done";
    clearInterval(state.timer);
    var finishReq = meta.sessionId
      ? A.api("/api/vocab-shelf/wrongbook/retest-finish", {
          method: "POST",
          body: { sessionId: meta.sessionId, mistakes: state.mistakes }
        })
      : A.api("/api/vocab-shelf/quiz/finish", {
          method: "POST",
          body: {
            bookId: meta.bookId,
            listIds: meta.listIds,
            listLabels: meta.listLabels,
            total: state.quizOrder.length,
            correct: state.correct,
            wrong: state.wrong,
            passed: passed,
            mistakes: state.mistakes
          }
        });
    finishReq.catch(function () {});

    var ov = document.getElementById("overlay");
    var box = document.getElementById("resultBox");
    var isRetest = !!meta.sessionId;
    box.innerHTML =
      '<div style="font-size:40px">' + (passed ? "🎉" : "💪") + "</div>" +
      "<h2>" + (isRetest ? "重测结束" : (passed ? "闯关成功！" : "闯关失败")) + "</h2>" +
      '<div style="color:#4d625b;font-size:14px;margin-top:6px">' +
        (isRetest
          ? ("本场错词列表已更新为仍错的 " + state.mistakes.length + " 个（记录保留，可手动删除）。")
          : (passed ? "已通关。错词已写入错题本。" : "生命耗尽，可重试。错词已收录。")) +
      "</div>" +
      '<div class="vl-score">' + state.correct + "<span> / " + state.quizOrder.length + "</span></div>" +
      '<div style="color:#4d625b;font-size:14px">错误 ' + state.wrong +
        " · 剩余生命 " + Math.max(0, state.lives) + "</div>" +
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:16px">' +
        '<button type="button" class="vl-btn vl-btn-primary" id="retry">' +
          (isRetest ? "再测错词" : "重新检测") + "</button>" +
        '<a class="vl-btn" href="wrong-words.html' +
          (isRetest ? ("?session=" + meta.sessionId) : "") +
          '">错题本</a>' +
        (isRetest
          ? ""
          : '<button type="button" class="vl-btn" id="backSetup">重选 List</button>') +
      "</div>";
    ov.classList.add("show");
    document.getElementById("retry").onclick = function () {
      ov.classList.remove("show");
      if (meta.sessionId) startRetest(meta.sessionId);
      else startQuiz(meta.bookId, meta.listIds);
    };
    var back = document.getElementById("backSetup");
    if (back) {
      back.onclick = function () {
        ov.classList.remove("show");
        boot();
      };
    }
  }

  function boot() {
    if (!needAuth()) return;
    root.innerHTML = '<div class="state state--brand"><div class="spinner spinner--brand"></div>正在加载…</div>';
    if (retestSessionId) {
      startRetest(retestSessionId);
      return;
    }
    var preBook = (params.get("book") || "").trim();
    meta.bookId = preBook;
    A.api("/api/vocab-shelf/bookshelf")
      .then(function (shelf) {
        if (!shelf.books || !shelf.books.length) {
          renderSetup(shelf, null);
          return null;
        }
        var id = preBook || shelf.books[0].bookId;
        meta.bookId = id;
        return A.api("/api/vocab-shelf/book?bookId=" + encodeURIComponent(id))
          .then(function (detail) { renderSetup(shelf, detail); });
      })
      .catch(function (e) {
        root.innerHTML = '<div class="state"><p>' + esc((e && e.message) || "加载失败") + "</p></div>";
      });
  }

  boot();
})();
