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
    timerPaused: false,
    imeBlocked: false,
    imeGatePassed: false,
    imeViolations: 0,
    imeDebounce: null,
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
    if (!w) return "（暂无释义）";
    if (w.acceptCN && w.acceptCN.length) {
      var cn = w.acceptCN.filter(Boolean).join(" / ");
      if (cn) return cn;
    }
    var m = String(w.meaning || "").trim();
    return m || "（暂无释义）";
  }

  function meaningOptions(w, pool, n) {
    n = n || 4;
    var correct = quizMeaning(w);
    var used = {};
    used[correct] = true;
    var distract = [];
    var poolMeanings = shuffle(pool.map(quizMeaning));
    for (var i = 0; i < poolMeanings.length && distract.length < n - 1; i++) {
      var m = poolMeanings[i];
      if (!m || used[m]) continue;
      used[m] = true;
      distract.push(m);
    }
    while (distract.length < n - 1) {
      var filler = "（干扰项）" + (distract.length + 1);
      if (!used[filler]) {
        used[filler] = true;
        distract.push(filler);
      }
    }
    return shuffle([correct].concat(distract));
  }

  function bindEnglishSpellInput(el) {
    if (!window.YYSD_EN_SPELL || !window.YYSD_EN_SPELL.bind) return;
    YYSD_EN_SPELL.bind(el, {
      isLocked: function () { return !!session.answered || !!session.imeBlocked; },
      onImeViolation: onImeViolation
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

  function stageChipSub(plan) {
    if (!plan) return "—";
    var parts = [];
    if (plan.new) parts.push("L" + plan.new);
    if (plan.reviews && plan.reviews.length) parts.push("复" + plan.reviews.join(","));
    return parts.join("·") || "—";
  }

  function stageStatusLabel(st) {
    if (st === "completed") return "已过";
    if (st === "current") return "本关";
    return "锁";
  }

  function stageGridHtml(stagesData, progressDay) {
    var stages = (stagesData && stagesData.stages) || [];
    if (!stages.length) return "";
    return (
      '<div class="vc-stage-grid">' +
        stages.map(function (s) {
          var cls = "vc-stage-chip is-" + s.status;
          if (s.stage === progressDay) cls += " is-progress";
          var attrs = s.practiceable
            ? (' data-stage="' + s.stage + '" tabindex="0" role="button"')
            : "";
          return '<div class="' + cls + '"' + attrs + ' title="第 ' + s.stage + " 关 · " +
            esc(stageChipSub(s.plan)) + '">' +
            "<span>" + s.stage + "</span>" +
            "<small>" + esc(stageStatusLabel(s.status)) + "</small>" +
            "</div>";
        }).join("") +
      "</div>" +
      '<p class="vc-meta vc-stage-hint">共 ' + (stagesData.totalStages || stages.length) +
        " 关 · 点击<strong>已过</strong>的关卡可自主重练（不影响进度）</p>" +
      '<div id="vc-stage-panel" hidden></div>'
    );
  }

  function renderStagePanel(stage, stagesData) {
    var panel = document.getElementById("vc-stage-panel");
    if (!panel) return;
    if (!stage || !stagesData) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }
    var info = (stagesData.stages || []).filter(function (s) { return s.stage === stage; })[0];
    if (!info || !info.practiceable) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    panel.innerHTML =
      '<div class="vc-stage-panel-head">' +
        "<strong>第 " + stage + " 关 · 已通过</strong>" +
        '<button type="button" class="vc-stage-panel-close" id="vc-stage-close" aria-label="关闭">×</button>' +
      "</div>" +
      '<p class="vc-meta">' + esc(stageChipSub(info.plan)) + " · 选择要重练的任务</p>" +
      '<div class="vc-stage-panel-actions">' +
        info.tasks.map(function (t) {
          return '<button type="button" class="vl-btn vl-btn-sm vc-stage-practice" data-list="' + t.listNo +
            '" data-type="' + esc(t.taskType) + '" data-stage="' + stage + '">' +
            "List " + t.listNo + " · " + taskTypeLabel(t.taskType) + " 练习</button>";
        }).join("") +
      "</div>";
    document.getElementById("vc-stage-close").onclick = function () { renderStagePanel(null, null); };
    panel.querySelectorAll(".vc-stage-practice").forEach(function (btn) {
      btn.onclick = function () {
        startListPractice(
          Number(btn.getAttribute("data-list")),
          btn.getAttribute("data-type"),
          Number(btn.getAttribute("data-stage"))
        );
      };
    });
  }

  function formatReviewStages(stages) {
    if (!stages || !stages.length) return "—";
    return stages.map(function (d) { return "第 " + d + " 关"; }).join("、");
  }

  function ebbinghausIntroHtml(plan, progressDay, todayPlan) {
    if (!plan || !plan.dayRows) {
      return noticesHtml(["艾宾浩斯闯关：每关先新词（5 命 · 18 秒）→ 复习（20 题 · 3 命）。"]);
    }
    progressDay = Math.floor(Number(progressDay) || 0) || 1;
    var stageNew = todayPlan && todayPlan.new ? ("List " + todayPlan.new) : "—";
    var stageRev = todayPlan && todayPlan.reviews && todayPlan.reviews.length
      ? todayPlan.reviews.map(function (n) { return "List " + n; }).join("、")
      : "—";

    var listNos = Object.keys(plan.listIndex).sort(function (a, b) {
      return Number(a) - Number(b);
    });
    var listRows = listNos.map(function (no) {
      var li = plan.listIndex[no];
      var cls = "";
      if (todayPlan) {
        if (todayPlan.new === Number(no) || (todayPlan.reviews || []).indexOf(Number(no)) >= 0) {
          cls = " is-today";
        }
      }
      return '<tr class="' + cls + '"><td>List ' + no + "</td><td>第 " + (li.newDay || "—") +
        " 关</td><td>" + formatReviewStages(li.reviewDays) + "</td></tr>";
    }).join("");

    var dayRows = plan.dayRows.map(function (row) {
      var cls = row.day === progressDay ? " is-today" : "";
      var newPart = row.new ? ("新 List " + row.new) : "—";
      var revPart = row.reviews.length
        ? row.reviews.map(function (r) { return "L" + r; }).join("、")
        : "—";
      return '<tr class="' + cls + '"><td>第 ' + row.day + " 关</td><td>" + newPart +
        "</td><td>" + revPart + "</td></tr>";
    }).join("");

    return (
      '<details class="vc-ebb-intro">' +
        '<summary class="vc-ebb-intro-sum">' +
          '<span class="vc-ebb-intro-title">艾宾浩斯科学闯关</span>' +
          '<span class="vc-ebb-intro-teaser">结合记忆曲线安排新词与复习 · 点击展开规则与 ' +
            plan.totalDays + " 关完整计划</span>" +
        "</summary>" +
        '<div class="vc-ebb-intro-body">' +
          '<p class="vc-ebb-intro-lead">本闯关将<strong>艾宾浩斯遗忘曲线</strong>拆成 <strong>' + plan.totalDays +
            " 关</strong>学习任务：在新词学习后的关键节点自动安排复习，帮助你在正确的时间巩固记忆。</p>" +
          '<p class="vc-ebb-intro-note">关数按你<strong>完成任务的进度</strong>推进，与日历日期无关；进度快的话，一天内可以连续完成多关。</p>' +
          '<ul class="vc-ebb-rules">' +
            "<li><strong>每关顺序</strong>：先完成本关<strong>新词闯关</strong>，再做本关<strong>复习检测</strong>。</li>" +
            "<li><strong>新词检测</strong>：听发音 → 选中文义 → 拼写英文；<strong>5 命</strong>，每题 <strong>18 秒</strong>；错词当场重测至全对。</li>" +
            "<li><strong>复习检测</strong>：从已学 List 抽 <strong>20 题</strong>（错题加权）；<strong>3 命</strong>；通过后写入抽测池。</li>" +
            "<li><strong>整体节奏</strong>：" + plan.totalLists + " 个 List 分散在 <strong>" + plan.totalDays +
              " 关</strong>中完成；越往后复习任务越多，请保持学习节奏。</li>" +
          "</ul>" +
          '<div class="vc-ebb-today-plan">' +
            "<strong>你当前进度：第 " + progressDay + " 关</strong>" +
            " · 本关新词 " + stageNew + " · 本关复习 " + stageRev +
          "</div>" +
          '<details class="vc-ebb-sub">' +
            '<summary>按 List 查看：每个 List 的新词关与复习关</summary>' +
            '<div class="vc-ebb-scroll">' +
              '<table class="vc-ebb-table">' +
                "<thead><tr><th>List</th><th>新词关</th><th>复习关</th></tr></thead>" +
                "<tbody>" + listRows + "</tbody>" +
              "</table>" +
            "</div>" +
          "</details>" +
          '<details class="vc-ebb-sub">' +
            '<summary>按关查看：' + plan.totalDays + " 关完整任务表</summary>" +
            '<div class="vc-ebb-scroll vc-ebb-scroll--tall">' +
              '<table class="vc-ebb-table">' +
                "<thead><tr><th>进度关</th><th>本关新词</th><th>本关复习 List</th></tr></thead>" +
                "<tbody>" + dayRows + "</tbody>" +
              "</table>" +
            "</div>" +
          "</details>" +
        "</div>" +
      "</details>"
    );
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

  function tickTimer() {
    session.timerLeft--;
    var num = document.getElementById("timerNum");
    if (num) {
      num.textContent = session.timerLeft;
      num.classList.toggle("warning", session.timerLeft <= 3);
    }
    if (session.timerLeft <= 0) {
      clearTimer();
      if (!session.answered && !session.gameOver && !session.imeBlocked) onTimeout();
    }
  }

  function startTimer() {
    clearTimer();
    session.timerPaused = false;
    session.timerLeft = TIME_SEC;
    var wrap = document.getElementById("timerWrap");
    var num = document.getElementById("timerNum");
    if (wrap) wrap.style.display = "block";
    if (num) {
      num.textContent = session.timerLeft;
      num.className = "num";
    }
    session.timer = setInterval(tickTimer, 1000);
  }

  function pauseTimerForIme() {
    clearTimer();
    session.timerPaused = true;
  }

  function resumeTimerIfNeeded() {
    if (!session.timerPaused || session.answered || session.gameOver || session.imeBlocked) return;
    session.timerPaused = false;
    if (session.timerLeft <= 0) return;
    session.timer = setInterval(tickTimer, 1000);
  }

  function requireImeGate(reason, cb) {
    if (reason === "start" && session.imeGatePassed) {
      cb();
      return;
    }
    session.imeBlocked = true;
    pauseTimerForIme();
    var gate = window.YYSD_IME_GATE;
    var p = gate
      ? gate.require({ reason: reason, strikes: reason === "violation" ? session.imeViolations : 0 })
      : Promise.resolve();
    p.then(function () {
      session.imeBlocked = false;
      session.imeGatePassed = true;
      cb();
    });
  }

  function handleImeCheat() {
    session.gameOver = true;
    session.imeBlocked = true;
    pauseTimerForIme();
    if (window.YYSD_IME_GATE) YYSD_IME_GATE.reset();
    var gate = window.YYSD_IME_GATE;
    var isPractice = session.phase === "practice";
    if (!gate || !gate.showCheat) {
      alert("多次切换中文输入法，本次测试已作废。");
      location.href = isPractice ? "vocab-challenge.html?view=notebook" : "vocab-challenge.html";
      return;
    }
    gate.showCheat({
      onRestart: function () {
        if (isPractice) {
          startPractice();
          return;
        }
        var listNo = session.listNo;
        var taskType = session.taskType;
        var attemptId = session.attemptId;
        var go = function () {
          session.attemptId = 0;
          startChallenge(listNo, taskType);
        };
        if (attemptId) {
          A.api("/api/vocab-challenge/void", {
            method: "POST",
            body: { attemptId: attemptId }
          }).finally(go);
        } else {
          go();
        }
      },
      onExit: function () {
        if (isPractice) {
          location.href = "vocab-challenge.html?view=notebook";
          return;
        }
        if (session.attemptId) {
          A.api("/api/vocab-challenge/void", {
            method: "POST",
            body: { attemptId: session.attemptId }
          }).finally(function () {
            session.attemptId = 0;
            renderHub();
          });
        } else {
          renderHub();
        }
      }
    });
  }

  function onImeViolation() {
    if (session.imeBlocked || session.answered || session.gameOver) return;
    if (window.YYSD_IME_GATE && window.YYSD_IME_GATE.isOpen()) return;
    if (session.imeDebounce) return;
    session.imeDebounce = setTimeout(function () { session.imeDebounce = null; }, 1200);
    session.imeViolations++;
    var limit = (window.YYSD_IME_GATE && YYSD_IME_GATE.CHEAT_LIMIT) || 3;
    if (session.imeViolations > limit) {
      handleImeCheat();
      return;
    }
    requireImeGate("violation", function () {
      resumeTimerIfNeeded();
      var spell = document.getElementById("spell");
      if (spell && !spell.disabled) spell.focus();
    });
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
        var sub = l.cleared || l.clearedNew ? "已通" : l.todayRole === "new" ? "本关新" :
          l.todayRole === "review" ? "本关复习" : l.unlocked ? "已学" : "锁";
        return '<div class="' + cls + '"><span>L' + l.listNo + "</span>" +
          "<small>" + sub + "</small></div>";
      }).join("");

      var passedStages = lists.stages && lists.stages.stages
        ? lists.stages.stages.filter(function (s) { return s.status === "completed"; }).length
        : 0;
      var stageGrid = isEbb ? stageGridHtml(lists.stages, progressDay) : "";

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
          todayHtml = '<p class="vc-notice">艾宾浩斯 78 关计划已全部完成。错题本仍可练习。</p>';
        } else {
          todayHtml =
            '<section class="vc-day-card">' +
              '<h2 class="vc-day-title">第 ' + progressDay + " 关 · 本关任务</h2>" +
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
          " · 进度关 " + progressDay +
          " · 已通过 " + passedStages + " / " + ((lists.stages && lists.stages.totalStages) || 78) + " 关"
        : esc(lists.bookLabel || lists.bookId) +
          " · 已通关 List " + (prog.clearedListNo || 0) +
          " · 下一关 List " + (prog.nextListNo || 1) +
          " · 重测配额 " + (lists.retestQuota || 0) + " 题";

      var noticeLine = isEbb
        ? ""
        : "按顺序闯关：新词（5 命 · 每题 18 秒）→ 错词重测 → 补考至全对。";

      var introHtml = isEbb
        ? ebbinghausIntroHtml(lists.ebbinghausPlan, progressDay, lists.todayPlan)
        : noticesHtml([noticeLine]);

      var resumeHtml = "";
      if (me.activeAttemptId) {
        resumeHtml =
          '<p class="vc-notice vc-notice--warn">你有进行中的闯关，可继续完成或退出作废。</p>' +
          '<div class="vc-actions"><button type="button" class="vl-btn vl-btn-primary" id="vc-resume">继续闯关</button></div>';
      }

      shell(
        introHtml +
        todayHtml +
        resumeHtml +
        '<p class="vc-meta">' + metaLine +
        '</p><p class="vc-meta">抽测池 ' + (pool.active || 0) +
          " · 顽固词 " + (pool.stubborn || 0) +
          " · 错题本 " + (pool.notebook || 0) + "</p>" +
        (isEbb ? stageGrid : ('<div class="vc-list-grid">' + chips + "</div>")) +
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
      if (isEbb && lists.stages) {
        root.querySelectorAll(".vc-stage-chip.is-completed[data-stage]").forEach(function (chip) {
          chip.onclick = function () {
            renderStagePanel(Number(chip.getAttribute("data-stage")), lists.stages);
          };
          chip.onkeydown = function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              chip.click();
            }
          };
        });
      }
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
    }).catch(function (e) {
      var msg = (e && e.message) || "";
      if (msg.indexOf("学生账号") >= 0 || (A.isTeacher && A.isTeacher())) {
        shell(
          '<p class="vc-notice vc-notice--warn">教师账号不能直接闯关。请先在教师端切换到「网站功能区」，再打开本页。</p>' +
          '<div class="vc-actions"><a class="vl-btn vl-btn-primary" href="teacher.html">打开教师端</a></div>',
          "教师预览"
        );
        return;
      }
      shell('<p class="vs-empty">' + esc(msg || "加载失败，请刷新重试") + "</p>", "错误");
    });
  }

  function startChallenge(listNo, taskType) {
    session.imeGatePassed = false;
    session.imeViolations = 0;
    if (session.imeDebounce) {
      clearTimeout(session.imeDebounce);
      session.imeDebounce = null;
    }
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
    // ponytail: submit-new/makeup responses omitted attemptId before fix — keep session id
    session.attemptId = d.attemptId || session.attemptId;
    session.phase = d.phase;
    session.listId = d.listId || session.listId || "";
    session.listNo = d.listNo || session.listNo || 0;
    session.taskType = d.taskType || session.taskType ||
      (d.phase === "scheduled_review" ? "review" : "new");
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

    beginQuestionPhase();
  }

  function beginQuestionPhase() {
    requireImeGate("start", renderQuestion);
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
        '<input type="text" id="spell" lang="en" inputmode="latin" placeholder="英文拼写（请用英文输入法）" ' +
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
    }).catch(function (err) {
      shell(
        '<p class="vc-notice vc-notice--warn">' + esc((err && err.message) || "提交失败") + "</p>" +
        '<div class="vc-actions"><button type="button" class="vl-btn" id="vc-back">返回</button></div>',
        "错误"
      );
      var back = document.getElementById("vc-back");
      if (back) back.onclick = renderHub;
    });
  }

  function renderCleared(d) {
    session.attemptId = 0;
    var prog = d.progress || {};
    var dayNote = d.dayAdvanced ? '<p class="vc-notice">本关任务已全部完成，已进入下一关。</p>' : "";
    shell(
      noticesHtml(d.notices || []) +
      dayNote +
      (d.stubbornReleased && d.stubbornReleased.length
        ? noticesHtml(["顽固词临时放行：" + d.stubbornReleased.join(", ")], true)
        : "") +
      '<p class="vc-meta">' +
        (prog.progressDay
          ? "进度关 " + prog.progressDay + " · 已通新词 List " + (prog.clearedListNo || session.listNo)
          : "已通关至 List " + (prog.clearedListNo || session.listNo) +
            " · 下一关 List " + (prog.nextListNo || ((prog.clearedListNo || 0) + 1))) +
      "</p>" +
      '<div class="vc-actions">' +
        '<button type="button" class="vl-btn vl-btn-primary" id="vc-hub">返回本关任务</button>' +
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

  function startListPractice(listNo, taskType, stageNo) {
    shell('<div class="state state--brand"><div class="spinner spinner--brand"></div>抽题…</div>', "练习");
    A.api(
      "/api/vocab-challenge/list-practice-pool?listNo=" + encodeURIComponent(listNo) +
        "&taskType=" + encodeURIComponent(taskType || "new")
    )
      .then(function (d) {
        if (!d || !d.ok || !(d.words || []).length) {
          shell(
            '<p class="vs-empty">' + esc((d && d.error) || "没有可练习的词") + "</p>" +
            '<div class="vc-actions"><button type="button" class="vl-btn" id="vc-back-hub">返回</button></div>',
            "练习"
          );
          var back = document.getElementById("vc-back-hub");
          if (back) back.onclick = renderHub;
          return;
        }
        session.phase = "practice";
        session.attemptId = 0;
        session.practiceLabel = stageNo
          ? ("第 " + stageNo + " 关 · List " + listNo + " · " + taskTypeLabel(taskType))
          : ("List " + listNo + " · " + taskTypeLabel(taskType));
        session.notices = [d.notice || "已通过关卡练习不影响闯关进度与抽测池。"];
        session.words = shuffle(d.words.map(parseWord).filter(function (w) { return w.word; }));
        session.answers = [];
        session.idx = 0;
        session.lives = HP_MAX;
        session.gameOver = false;
        session.waiting = false;
        session.imeViolations = 0;
        session.imeGatePassed = false;
        if (session.imeDebounce) {
          clearTimeout(session.imeDebounce);
          session.imeDebounce = null;
        }
        requireImeGate("start", renderPracticeQ);
      })
      .catch(function () {
        shell('<p class="vs-empty">加载失败</p><div class="vc-actions"><button type="button" class="vl-btn" id="vc-back-hub">返回</button></div>', "练习");
        var back = document.getElementById("vc-back-hub");
        if (back) back.onclick = renderHub;
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
        session.practiceLabel = "错题本练习";
        session.notices = [d.notice || "错题本练习不影响闯关抽测池。"];
        session.words = shuffle(d.words.map(parseWord).filter(function (w) { return w.word; }));
        session.answers = [];
        session.idx = 0;
        session.lives = HP_MAX;
        session.gameOver = false;
        session.waiting = false;
        session.imeViolations = 0;
        session.imeGatePassed = false;
        if (session.imeDebounce) {
          clearTimeout(session.imeDebounce);
          session.imeDebounce = null;
        }
        requireImeGate("start", renderPracticeQ);
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
      questionInner((session.practiceLabel || "练习") + " · 听发音，先选中文含义，再拼写英文", false),
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
