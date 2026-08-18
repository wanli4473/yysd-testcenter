/* vocab-challenge-ui.js — 闯关 hub + A→D quiz + 错题本练习 */
(function () {
  "use strict";
  var Y = window.YYSD;
  var A = window.YYSD_AUTH;
  var root = document.getElementById("vc-root");
  var params = new URLSearchParams(location.search);
  var view = params.get("view") || "hub"; // hub | notebook | practice

  var HP_MAX = 5;
  var HP_REVIEW = 3;
  var TIME_SEC = 18;
  var session = {
    attemptId: 0,
    phase: "",
    taskType: "new",
    listId: "",
    listNo: 0,
    bookId: "",
    notices: [],
    words: [],
    answers: [],
    idx: 0,
    selectedMeaning: null,
    answered: false,
    waiting: false,
    lives: HP_MAX,
    livesMax: HP_MAX,
    timer: null,
    timerLeft: TIME_SEC,
    gameOver: false,
    pendingStart: null
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

  function speak(word) {
    var WA = window.YysdWordAudio;
    if (WA && WA.speakUs) { WA.speakUs(word); return; }
    if (WA && WA.speak) { WA.speak(word, 2); return; }
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

  function parseWord(it) {
    var wj = it.word_json || it.wordJson || null;
    if (typeof wj === "string") {
      try { wj = JSON.parse(wj); } catch (e) { wj = null; }
    }
    var accept = (wj && Array.isArray(wj.acceptCN)) ? wj.acceptCN.filter(Boolean) : [];
    return {
      word: String(it.word || (wj && wj.word) || ""),
      ipa: it.ipa || (wj && wj.ipa) || "",
      meaning: it.meaning || (wj && wj.meaning) || "",
      acceptCN: accept,
      listId: it.listId || it.sourceListId || null
    };
  }

  function quizMeaning(w) {
    if (w.acceptCN && w.acceptCN.length) return w.acceptCN.join(" / ");
    return String(w.meaning || "");
  }

  function meaningOptions(w, pool, n) {
    n = n || 4;
    var correct = quizMeaning(w);
    var distract = pool.map(quizMeaning).filter(function (m) { return m && m !== correct; });
    distract = shuffle(distract).slice(0, n - 1);
    while (distract.length < n - 1) distract.push("（干扰项）" + (distract.length + 1));
    return shuffle([correct].concat(distract));
  }

  function asciiSpell(s) {
    return String(s || "").replace(/[^a-zA-Z'-]/g, "");
  }

  function bindEnglishSpellInput(el) {
    if (!el || el.__yysdEnSpell) return;
    el.__yysdEnSpell = true;
    el.setAttribute("lang", "en");
    el.setAttribute("inputmode", "latin");
    el.setAttribute("autocomplete", "off");
    el.setAttribute("autocorrect", "off");
    el.setAttribute("autocapitalize", "off");
    el.setAttribute("spellcheck", "false");
    var composing = false;
    el.addEventListener("compositionstart", function () { composing = true; });
    el.addEventListener("compositionend", function () {
      composing = false;
      var next = asciiSpell(el.value);
      if (next !== el.value) el.value = next;
    });
    el.addEventListener("beforeinput", function (e) {
      if (composing) return;
      if (e.inputType && e.inputType.indexOf("delete") === 0) return;
      if (e.data != null && /[^a-zA-Z'-]/.test(e.data)) e.preventDefault();
    });
    el.addEventListener("input", function () {
      if (composing) return;
      var next = asciiSpell(el.value);
      if (next !== el.value) el.value = next;
    });
  }

  function shell(inner, badge, opts) {
    opts = opts || {};
    clearTimer();
    var livesHtml = "";
    if (opts.showLives) {
      var maxL = session.livesMax || HP_MAX;
      for (var i = 0; i < maxL; i++) {
        livesHtml += '<span class="heart' + (i >= session.lives ? " lost" : "") + '">❤️</span>';
      }
    }
    root.innerHTML =
      '<div class="vl-app">' +
        '<div class="vl-top-bar">' +
          '<div class="vl-brand">优益思达 · <span>单词闯关</span></div>' +
          '<div class="vl-list-badge">' + esc(badge || "闯关") + "</div>" +
          (opts.showLives ? '<div class="vl-lives" id="lives">' + livesHtml + "</div>" : "") +
        "</div>" +
        '<div class="vl-info-row">' +
          '<div id="vc-counter"></div>' +
          (opts.showTimer
            ? '<div class="vl-timer" id="timerWrap" style="display:none">⏱ <span class="num" id="timerNum">' +
              TIME_SEC + "</span>s</div>"
            : "") +
        "</div>" +
        '<div id="vc-panel">' + inner + "</div>" +
      "</div>";
  }

  function noticesHtml(list, warn) {
    if (!list || !list.length) return "";
    return list.map(function (n) {
      return '<p class="vc-notice' + (warn ? " vc-notice--warn" : "") + '">' + esc(n) + "</p>";
    }).join("");
  }

  function phaseLabel(phase) {
    if (phase === "new_words") return "新词测试";
    if (phase === "retest") return "错词重测";
    if (phase === "makeup") return "补考循环";
    if (phase === "scheduled_review") return "复习检测";
    return phase || "";
  }

  function taskStatusLabel(st) {
    if (st === "completed") return "已通过";
    if (st === "failed") return "需重测";
    if (st === "pending") return "待做";
    return st || "";
  }

  function taskTypeLabel(t) {
    return t === "review" ? "复习" : "新词";
  }

  function updateLives() {
    var el = document.getElementById("lives");
    if (!el) return;
    var h = "";
    var maxL = session.livesMax || HP_MAX;
    for (var i = 0; i < maxL; i++) {
      h += '<span class="heart' + (i >= session.lives ? " lost" : "") + '">❤️</span>';
    }
    el.innerHTML = h;
  }

  function clearTimer() {
    if (session.timer) {
      clearInterval(session.timer);
      session.timer = null;
    }
  }

  function startTimer() {
    clearTimer();
    session.timerLeft = TIME_SEC;
    var wrap = document.getElementById("timerWrap");
    var num = document.getElementById("timerNum");
    if (wrap) wrap.style.display = "block";
    if (num) {
      num.textContent = session.timerLeft;
      num.className = "num";
    }
    session.timer = setInterval(function () {
      session.timerLeft--;
      if (num) {
        num.textContent = session.timerLeft;
        num.classList.toggle("warning", session.timerLeft <= 3);
      }
      if (session.timerLeft <= 0) {
        clearTimer();
        if (!session.answered && !session.gameOver) onTimeout();
      }
    }, 1000);
  }

  // ---- hub ----

  function renderHub() {
    shell('<div class="state state--brand"><div class="spinner spinner--brand"></div>加载进度…</div>', "进度");
    Promise.all([
      A.api("/api/vocab-challenge/me"),
      A.api("/api/vocab-challenge/lists").catch(function (e) { return e; })
    ]).then(function (pair) {
      var me = pair[0];
      var lists = pair[1];
      if (!me || !me.ok) {
        shell('<p class="vs-empty">加载失败，请刷新重试。</p>', "错误");
        return;
      }
      if (!me.assigned) {
        shell(
          '<p class="vc-notice vc-notice--warn">老师尚未为你布置闯关词册。布置后即可从 List 1 开始逐级解锁。</p>' +
          '<div class="vc-actions"><a class="vl-btn" href="zone.html?zone=study">返回单词区</a></div>',
          "待布置"
        );
        return;
      }
      if (!lists || !lists.ok) {
        shell('<p class="vs-empty">' + esc((lists && lists.error) || "无法加载 List") + "</p>", "错误");
        return;
      }
      var prog = lists.progress || me.progress || {};
      var pool = me.pool || {};
      var isEbb = !!(lists.progressDay || (me.todayTasks && me.todayTasks.length));
      var todayTasks = lists.todayTasks || me.todayTasks || [];
      var programComplete = !!(lists.programComplete || me.programComplete);
      var progressDay = lists.progressDay || me.progressDay || (prog.progressDay || 1);

      var chips = (lists.lists || []).map(function (l) {
        var cls = "vc-list-chip";
        if (l.cleared || l.clearedNew) cls += " is-cleared is-open";
        else if (l.unlocked) cls += " is-open";
        if (l.current) cls += " is-current";
        if (l.todayRole === "new") cls += " is-today-new";
        if (l.todayRole === "review") cls += " is-today-review";
        if (l.todayStatus === "completed") cls += " is-done-today";
        var sub = l.cleared || l.clearedNew ? "已通" : l.todayRole === "new" ? "今日新" :
          l.todayRole === "review" ? "今日复习" : l.unlocked ? "已学" : "锁";
        return '<div class="' + cls + '"><span>L' + l.listNo + "</span>" +
          "<small>" + sub + "</small></div>";
      }).join("");

      var learnHref = "";
      var cur = (lists.lists || []).filter(function (l) {
        return l.todayRole === "new" && l.todayStatus !== "completed";
      })[0];
      if (!cur) {
        cur = (lists.lists || []).filter(function (l) { return l.current; })[0];
      }
      if (cur) {
        learnHref = "vocab-learn.html?book=" + encodeURIComponent(lists.bookId) +
          "&list=" + encodeURIComponent(cur.id);
      }

      var todayHtml = "";
      if (isEbb) {
        if (programComplete) {
          todayHtml = '<p class="vc-notice">艾宾浩斯 78 天计划已全部完成。错题本仍可练习。</p>';
        } else {
          todayHtml =
            '<section class="vc-day-card">' +
              '<h2 class="vc-day-title">第 ' + progressDay + " 天 · 今日任务</h2>" +
              '<p class="vc-meta">先完成新词，再做复习 · 新词 5 命 · 复习 20 题 3 命</p>' +
              '<ul class="vc-day-tasks">' +
              todayTasks.map(function (t) {
                var btn = "";
                if (t.canStart && t.status !== "completed") {
                  btn = '<button type="button" class="vl-btn vl-btn-sm vc-task-start" data-list="' +
                    t.listNo + '" data-type="' + esc(t.taskType) + '">' +
                    (t.status === "failed" ? "重测" : "开始") + "</button>";
                }
                return '<li class="vc-day-task vc-day-task--' + esc(t.status) + '">' +
                  "<span>List " + t.listNo + " · " + taskTypeLabel(t.taskType) +
                  " · " + taskStatusLabel(t.status) + "</span>" + btn + "</li>";
              }).join("") +
              "</ul></section>";
        }
      }

      var metaLine = isEbb
        ? esc(lists.bookLabel || lists.bookId) +
          " · 进度日 " + progressDay +
          " · 已通新词 List " + (prog.clearedListNo || 0)
        : esc(lists.bookLabel || lists.bookId) +
          " · 已通关 List " + (prog.clearedListNo || 0) +
          " · 下一关 List " + (prog.nextListNo || 1) +
          " · 重测配额 " + (lists.retestQuota || 0) + " 题";

      var noticeLine = isEbb
        ? "艾宾浩斯闯关：每日先新词（5 命 · 18 秒）→ 复习（20 题 · 3 命）。"
        : "按顺序闯关：新词（5 命 · 每题 18 秒）→ 错词重测 → 补考至全对。";

      var resumeHtml = "";
      if (me.activeAttemptId) {
        resumeHtml =
          '<p class="vc-notice vc-notice--warn">你有进行中的闯关，可继续完成或退出作废。</p>' +
          '<div class="vc-actions"><button type="button" class="vl-btn vl-btn-primary" id="vc-resume">继续闯关</button></div>';
      }

      shell(
        noticesHtml([noticeLine]) +
        todayHtml +
        resumeHtml +
        '<p class="vc-meta">' + metaLine +
        '</p><p class="vc-meta">抽测池 ' + (pool.active || 0) +
          " · 顽固词 " + (pool.stubborn || 0) +
          " · 错题本 " + (pool.notebook || 0) + "</p>" +
        '<div class="vc-list-grid">' + chips + "</div>" +
        '<div class="vc-actions">' +
          (!isEbb
            ? '<button type="button" class="vl-btn vl-btn-primary" id="vc-start">开始 List ' +
              (prog.nextListNo || 1) + "</button>"
            : "") +
          (learnHref
            ? '<a class="vl-btn" href="' + esc(learnHref) + '">先学习本 List</a>'
            : "") +
          '<a class="vl-btn" href="vocab-challenge.html?view=notebook">错题本</a>' +
          '<a class="vl-btn" href="zone.html?zone=study">返回</a>' +
        "</div>",
        lists.bookLabel || "闯关"
      );

      root.querySelectorAll(".vc-task-start").forEach(function (btn) {
        btn.onclick = function () {
          startChallenge(
            Number(btn.getAttribute("data-list")),
            btn.getAttribute("data-type") || "new"
          );
        };
      });
      var startBtn = document.getElementById("vc-start");
      if (startBtn) {
        startBtn.onclick = function () {
          startChallenge(prog.nextListNo || 1, "new");
        };
      }
      var resumeBtn = document.getElementById("vc-resume");
      if (resumeBtn) {
        resumeBtn.onclick = function () {
          A.api("/api/vocab-challenge/attempt?id=" + encodeURIComponent(me.activeAttemptId))
            .then(function (d) {
              if (d && d.ok) enterPhase(d);
              else renderHub();
            })
            .catch(function () { renderHub(); });
        };
      }
    }).catch(function () {
      shell('<p class="vs-empty">网络错误</p>', "错误");
    });
  }

  function startChallenge(listNo, taskType) {
    session.pendingStart = { listNo: listNo, taskType: taskType || "new" };
    shell('<div class="state state--brand"><div class="spinner spinner--brand"></div>准备题目…</div>', "开始");
    var body = {};
    if (listNo) body.listNo = listNo;
    if (taskType) body.taskType = taskType;
    A.api("/api/vocab-challenge/start", { method: "POST", body: body })
      .then(function (d) {
        if (!d || !d.ok) {
          shell(
            '<p class="vc-notice vc-notice--warn">' + esc((d && d.error) || "无法开始") + "</p>" +
            '<div class="vc-actions"><button type="button" class="vl-btn" id="vc-back">返回</button></div>',
            "错误"
          );
          document.getElementById("vc-back").onclick = renderHub;
          return;
        }
        enterPhase(d);
      })
      .catch(function () {
        shell('<p class="vs-empty">开始失败</p>', "错误");
      });
  }

  function enterPhase(d) {
    session.attemptId = d.attemptId;
    session.phase = d.phase;
    session.listId = d.listId || "";
    session.listNo = d.listNo || 0;
    session.taskType = d.taskType || (d.phase === "scheduled_review" ? "review" : "new");
    session.notices = d.notices || [];
    session.words = shuffle((d.items || []).map(parseWord).filter(function (w) { return w.word; }));
    session.answers = [];
    session.idx = 0;
    session.livesMax = d.livesMax || (session.taskType === "review" ? HP_REVIEW : HP_MAX);
    session.lives = session.livesMax;
    session.gameOver = false;
    session.waiting = false;

    if (d.cleared || d.phase === "cleared") {
      renderCleared(d);
      return;
    }

    if (session.phase === "retest" && !session.words.length) {
      shell(
        noticesHtml(session.notices) +
        '<p class="vc-meta">本阶段无需作答。</p>' +
        '<div class="vc-actions">' +
          '<button type="button" class="vl-btn vl-btn-primary" id="vc-empty-pass">确认通关</button>' +
        "</div>",
        "重测"
      );
      document.getElementById("vc-empty-pass").onclick = function () {
        A.api("/api/vocab-challenge/submit-review", {
          method: "POST",
          body: { attemptId: session.attemptId, answers: [] }
        }).then(function (r) {
          if (r && r.cleared) renderCleared(r);
          else enterPhase(r);
        });
      };
      return;
    }

    renderQuestion();
  }

  function revealSpellRow(focus) {
    var row = document.getElementById("spellRow");
    if (!row) return;
    if (!row.classList.contains("is-open")) {
      row.hidden = false;
      void row.offsetWidth;
      row.classList.add("is-open");
    }
    var submit = document.getElementById("submit");
    if (submit) submit.disabled = false;
    var spell = document.getElementById("spell");
    bindEnglishSpellInput(spell);
    if (focus && spell && !spell.disabled) spell.focus();
  }

  function lockQuizControls() {
    var spell = document.getElementById("spell");
    var submit = document.getElementById("submit");
    if (spell) spell.disabled = true;
    if (submit) submit.disabled = true;
    root.querySelectorAll(".vl-opt").forEach(function (b) { b.classList.add("disabled"); });
  }

  function paintMeaningResult(w, meaningOk) {
    root.querySelectorAll(".vl-opt").forEach(function (b) {
      b.classList.remove("selected");
      if (b.getAttribute("data-v") === quizMeaning(w)) b.classList.add("correct");
      else if (b.getAttribute("data-v") === session.selectedMeaning && !meaningOk) b.classList.add("wrong");
    });
  }

  function paintSpellResult(spellOk) {
    var spell = document.getElementById("spell");
    if (!spell) return;
    spell.classList.remove("spell-ok", "spell-bad");
    spell.classList.add(spellOk ? "spell-ok" : "spell-bad");
  }

  function padUnansweredWrong() {
    var seen = {};
    session.answers.forEach(function (a) { seen[a.word] = true; });
    session.words.forEach(function (w) {
      if (!seen[w.word]) {
        session.answers.push({ word: w.word, correct: false, userAnswer: "(lives)" });
      }
    });
  }

  function afterAnswer() {
    session.waiting = true;
    var nextBtn = document.getElementById("qnext");
    var isPractice = session.phase === "practice";
    var depletes = session.phase === "new_words" || session.phase === "scheduled_review" || isPractice;
    if (depletes && session.lives <= 0) {
      if (nextBtn) nextBtn.disabled = true;
      session.gameOver = true;
      setTimeout(function () {
        if (isPractice) {
          session.idx = session.words.length;
          renderPracticeQ();
        } else {
          padUnansweredWrong();
          finishPhase();
        }
      }, 900);
      return;
    }
    if (session.idx >= session.words.length - 1) {
      if (nextBtn) nextBtn.disabled = true;
      setTimeout(function () {
        if (isPractice) {
          session.idx += 1;
          renderPracticeQ();
        } else {
          finishPhase();
        }
      }, 900);
      return;
    }
    if (nextBtn) nextBtn.disabled = false;
  }

  function applyGrade(w, timeout) {
    if (session.answered || session.gameOver) return;
    var spellEl = document.getElementById("spell");
    var spellRaw = spellEl ? spellEl.value.trim() : "";
    var spell = spellRaw.toLowerCase();
    var meaningOk = !!(session.selectedMeaning && session.selectedMeaning === quizMeaning(w));
    var spellOk = !!(spell && spell === w.word.toLowerCase());
    var ok = meaningOk && spellOk;
    if (!timeout) {
      if (!session.selectedMeaning) return "needMeaning";
      if (!spell) return "needSpell";
    }
    session.answered = true;
    clearTimer();
    revealSpellRow(false);
    lockQuizControls();
    paintMeaningResult(w, meaningOk);
    paintSpellResult(spellOk);
    var fb = document.getElementById("fb");
    if (ok) {
      fb.className = "vl-feedback show ok";
      fb.textContent = timeout ? "✅ 时间到，但作答正确！" : "✅ 完全正确！";
    } else {
      session.lives = Math.max(0, session.lives - 1);
      updateLives();
      fb.className = "vl-feedback show " + (timeout ? "timeout" : "fail");
      fb.textContent = timeout
        ? ("⏰ 时间到！答案：" + w.word + "（" + quizMeaning(w) + "）")
        : ("❌ 正确答案：" + w.word + "（" + quizMeaning(w) + "）");
    }
    session.answers.push({
      word: w.word,
      correct: ok,
      userAnswer: timeout ? (spellRaw || "(timeout)") : spell
    });
    afterAnswer();
    return "ok";
  }

  function onTimeout() {
    var w = session.words[session.idx];
    if (!w) return;
    applyGrade(w, true);
  }

  function bindQuizQuestion(w) {
    document.getElementById("listen").onclick = function () { speak(w.word); };
    setTimeout(function () { speak(w.word); }, 250);
    document.getElementById("opts").onclick = function (e) {
      var b = e.target.closest(".vl-opt");
      if (!b || session.answered) return;
      root.querySelectorAll(".vl-opt").forEach(function (x) { x.classList.remove("selected"); });
      b.classList.add("selected");
      session.selectedMeaning = b.getAttribute("data-v");
      var fb = document.getElementById("fb");
      if (fb && !session.answered) {
        fb.className = "vl-feedback";
        fb.textContent = "";
      }
      revealSpellRow(true);
    };
    function submitQuiz() {
      var r = applyGrade(w, false);
      if (r === "needMeaning") {
        var fb = document.getElementById("fb");
        if (fb) { fb.className = "vl-feedback show fail"; fb.textContent = "请先选择中文含义"; }
      } else if (r === "needSpell") {
        var fb = document.getElementById("fb");
        if (fb) { fb.className = "vl-feedback show fail"; fb.textContent = "请先拼写英文"; }
        var spellEl = document.getElementById("spell");
        if (spellEl) spellEl.focus();
      }
    }
    document.getElementById("submit").onclick = submitQuiz;
    bindEnglishSpellInput(document.getElementById("spell"));
    document.getElementById("spell").onkeydown = function (e) {
      if (e.key === "Enter") submitQuiz();
    };
    document.getElementById("qnext").onclick = function () {
      if (session.gameOver || !session.waiting) return;
      session.idx += 1;
      if (session.phase === "practice") renderPracticeQ();
      else renderQuestion();
    };
    var abort = document.getElementById("vc-abort");
    if (abort) {
      abort.onclick = function () {
        if (!confirm("退出将作废本次闯关，确定？")) return;
        clearTimer();
        A.api("/api/vocab-challenge/void", {
          method: "POST",
          body: { attemptId: session.attemptId }
        }).finally(function () {
          session.attemptId = 0;
          renderHub();
        });
      };
    }
    startTimer();
  }

  function questionInner(hint, showAbort) {
    var w = session.words[session.idx];
    var opts = meaningOptions(w, session.words, 4);
    var labels = ["A", "B", "C", "D"];
    return noticesHtml(session.idx === 0 ? session.notices : []) +
      '<p class="vl-listen-hint">' + esc(hint) + "</p>" +
      '<button type="button" class="vl-btn" id="listen">🔊 播放发音</button>' +
      '<div class="vl-opts" id="opts">' +
        opts.map(function (o, i) {
          return '<button type="button" class="vl-opt" data-v="' + esc(o) + '"><span class="label">' +
            labels[i] + ".</span> " + esc(o) + "</button>";
        }).join("") +
      "</div>" +
      '<div class="vl-spell-row" id="spellRow" hidden>' +
        '<input type="text" id="spell" lang="en" inputmode="latin" placeholder="拼写英文..." ' +
          'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />' +
        '<button type="button" class="vl-btn vl-btn-primary" id="submit" disabled>提交</button>' +
      "</div>" +
      '<div class="vl-feedback" id="fb"></div>' +
      '<div class="vl-nav-row">' +
        (showAbort ? '<button type="button" class="vl-btn" id="vc-abort">退出（作废）</button>' : "") +
        '<button type="button" class="vl-btn vl-btn-primary" id="qnext" disabled>下一题 →</button>' +
      "</div>";
  }

  function renderQuestion() {
    var w = session.words[session.idx];
    if (!w) {
      finishPhase();
      return;
    }
    session.selectedMeaning = null;
    session.answered = false;
    session.waiting = false;
    shell(
      questionInner(phaseLabel(session.phase) + " · 听发音，先选中文含义，再拼写英文", true),
      "List " + session.listNo,
      { showLives: true, showTimer: true }
    );
    document.getElementById("vc-counter").innerHTML =
      phaseLabel(session.phase) + " · 第 <strong>" + (session.idx + 1) + "</strong> / " +
      session.words.length + " · 剩余生命 " + session.lives;
    bindQuizQuestion(w);
  }

  function finishPhase() {
    shell('<div class="state state--brand"><div class="spinner spinner--brand"></div>提交中…</div>', "提交");
    var path = session.phase === "new_words"
      ? "/api/vocab-challenge/submit-new"
      : session.phase === "scheduled_review"
        ? "/api/vocab-challenge/submit-scheduled-review"
        : "/api/vocab-challenge/submit-review";
    A.api(path, {
      method: "POST",
      body: { attemptId: session.attemptId, answers: session.answers }
    }).then(function (d) {
      if (!d || !d.ok) {
        shell(
          '<p class="vc-notice vc-notice--warn">' + esc((d && d.error) || "提交失败") + "</p>" +
          '<div class="vc-actions"><button type="button" class="vl-btn" id="vc-back">返回</button></div>',
          "错误"
        );
        document.getElementById("vc-back").onclick = renderHub;
        return;
      }
      if (d.failed) {
        var isReviewFail = session.phase === "scheduled_review";
        var maxL = session.livesMax || HP_MAX;
        A.api("/api/vocab-challenge/me").then(function (me) {
          var bid = (me && me.assignment && me.assignment.bookId) || "";
          var href = session.listId
            ? ("vocab-learn.html?book=" + encodeURIComponent(bid) +
              "&list=" + encodeURIComponent(session.listId))
            : "vocab-challenge.html";
          shell(
            noticesHtml(d.notices || [], true) +
            '<p class="vc-meta">生命耗尽 · 错误 ' + (d.wrongCount || 0) + " 个（" + maxL +
              " 命用尽" + (isReviewFail ? "，将重新抽题" : "，未记入错题") + "）</p>" +
            '<div class="vc-actions">' +
              '<button type="button" class="vl-btn vl-btn-primary" id="vc-retry">直接重考</button>' +
              (!isReviewFail
                ? '<a class="vl-btn" href="' + esc(href) + '">先去学习</a>'
                : "") +
              '<button type="button" class="vl-btn" id="vc-hub">返回进度</button>' +
            "</div>",
            "未通过"
          );
          document.getElementById("vc-retry").onclick = function () {
            var ps = session.pendingStart || {};
            startChallenge(ps.listNo || session.listNo, ps.taskType || session.taskType);
          };
          document.getElementById("vc-hub").onclick = renderHub;
        });
        return;
      }
      if (d.cleared) {
        renderCleared(d);
        return;
      }
      enterPhase(d);
    }).catch(function () {
      shell('<p class="vs-empty">提交失败</p>', "错误");
    });
  }

  function renderCleared(d) {
    session.attemptId = 0;
    var prog = d.progress || {};
    var dayNote = d.dayAdvanced ? '<p class="vc-notice">今日任务已全部完成，已进入下一天。</p>' : "";
    shell(
      noticesHtml(d.notices || []) +
      dayNote +
      (d.stubbornReleased && d.stubbornReleased.length
        ? noticesHtml(["顽固词临时放行：" + d.stubbornReleased.join(", ")], true)
        : "") +
      '<p class="vc-meta">' +
        (prog.progressDay
          ? "进度日 " + prog.progressDay + " · 已通新词 List " + (prog.clearedListNo || session.listNo)
          : "已通关至 List " + (prog.clearedListNo || session.listNo) +
            " · 下一关 List " + (prog.nextListNo || ((prog.clearedListNo || 0) + 1))) +
      "</p>" +
      '<div class="vc-actions">' +
        '<button type="button" class="vl-btn vl-btn-primary" id="vc-hub">返回今日任务</button>' +
      "</div>",
      "通关"
    );
    document.getElementById("vc-hub").onclick = renderHub;
  }

  // ---- notebook ----

  function renderNotebook() {
    shell('<div class="state state--brand"><div class="spinner spinner--brand"></div>加载错题本…</div>', "错题本");
    A.api("/api/vocab-challenge/notebook")
      .then(function (d) {
        if (!d || !d.ok) {
          shell('<p class="vs-empty">' + esc((d && d.error) || "加载失败") + "</p>", "错题本");
          return;
        }
        var rows = d.words || [];
        var body = rows.length
          ? rows.map(function (r) {
              return '<div class="vc-nb-row"><div><b>' + esc(r.word) + "</b> " +
                '<span class="vc-meta">' + esc(r.ipa || "") + "</span><br>" +
                '<span class="vc-meta">' + esc(r.meaning || "") + "</span></div>" +
                "<div class=\"vc-meta\">错 " + (r.missCount || 1) + " 次</div></div>";
            }).join("")
          : '<p class="vs-empty">错题本还是空的。</p>';
        shell(
          '<p class="vc-notice">错题本永久保留；此处主动练习不影响闯关抽测池。</p>' +
          body +
          '<div class="vc-actions">' +
            (rows.length
              ? '<button type="button" class="vl-btn vl-btn-primary" id="vc-practice">开始错词测试</button>'
              : "") +
            '<a class="vl-btn" href="vocab-challenge.html">返回闯关</a>' +
          "</div>",
          "错题本 · " + (rows.length || 0)
        );
        var btn = document.getElementById("vc-practice");
        if (btn) btn.onclick = startPractice;
      })
      .catch(function () {
        shell('<p class="vs-empty">加载失败</p>', "错题本");
      });
  }

  function startPractice() {
    shell('<div class="state state--brand"><div class="spinner spinner--brand"></div>抽题…</div>', "练习");
    A.api("/api/vocab-challenge/notebook/practice-pool?limit=20")
      .then(function (d) {
        if (!d || !d.ok || !(d.words || []).length) {
          shell('<p class="vs-empty">没有可练习的词</p>', "练习");
          return;
        }
        session.phase = "practice";
        session.attemptId = 0;
        session.notices = [d.notice || "错题本练习不影响闯关抽测池。"];
        session.words = shuffle(d.words.map(parseWord).filter(function (w) { return w.word; }));
        session.answers = [];
        session.idx = 0;
        session.lives = HP_MAX;
        session.gameOver = false;
        session.waiting = false;
        renderPracticeQ();
      });
  }

  function renderPracticeQ() {
    var w = session.words[session.idx];
    if (!w) {
      var wrong = session.answers.filter(function (a) { return !a.correct; }).length;
      shell(
        noticesHtml(session.notices) +
        '<p class="vc-meta">练习结束 · 对 ' + (session.answers.length - wrong) +
          " / 错 " + wrong + "（未计入抽测池）</p>" +
        '<div class="vc-actions">' +
          '<a class="vl-btn vl-btn-primary" href="vocab-challenge.html?view=notebook">返回错题本</a>' +
          '<a class="vl-btn" href="vocab-challenge.html">闯关首页</a>' +
        "</div>",
        "练习结果"
      );
      return;
    }
    session.selectedMeaning = null;
    session.answered = false;
    session.waiting = false;
    shell(
      questionInner("错题本练习 · 听发音，先选中文含义，再拼写英文", false),
      "练习",
      { showLives: true, showTimer: true }
    );
    document.getElementById("vc-counter").innerHTML =
      "第 <strong>" + (session.idx + 1) + "</strong> / " + session.words.length;
    bindQuizQuestion(w);
  }

  // ---- boot ----

  if (!needAuth()) return;
  if (view === "notebook" || view === "practice") {
    if (view === "practice") startPractice();
    else renderNotebook();
  } else {
    renderHub();
  }
})();
