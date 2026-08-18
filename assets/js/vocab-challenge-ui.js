/* vocab-challenge-ui.js — 闯关 hub + A→D quiz + 错题本练习 */
(function () {
  "use strict";
  var Y = window.YYSD;
  var A = window.YYSD_AUTH;
  var root = document.getElementById("vc-root");
  var params = new URLSearchParams(location.search);
  var view = params.get("view") || "hub"; // hub | notebook | practice

  var HP_MAX = 5;
  var session = {
    attemptId: 0,
    phase: "",
    listId: "",
    listNo: 0,
    bookId: "",
    notices: [],
    words: [],
    answers: [], // {word, correct, userAnswer}
    idx: 0,
    selectedMeaning: null,
    answered: false
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

  function shell(inner, badge) {
    root.innerHTML =
      '<div class="vl-app">' +
        '<div class="vl-top-bar">' +
          '<div class="vl-brand">优益思达 · <span>单词闯关</span></div>' +
          '<div class="vl-list-badge">' + esc(badge || "闯关") + "</div>" +
        "</div>" +
        '<div class="vl-info-row"><div id="vc-counter"></div></div>' +
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
    return phase || "";
  }

  function livesLeft() {
    var n = 0;
    for (var i = 0; i < session.answers.length; i++) {
      if (!session.answers[i].correct) n++;
    }
    return Math.max(0, HP_MAX - n);
  }

  function starsHtml() {
    var left = livesLeft();
    var html = '<aside class="vc-hp" aria-label="血量 ' + left + "/" + HP_MAX + '">';
    for (var i = 0; i < HP_MAX; i++) {
      html += '<span class="star' + (i >= left ? " lost" : "") + '" aria-hidden="true">★</span>';
    }
    return html + "</aside>";
  }

  function paintStars() {
    var el = root.querySelector(".vc-hp");
    if (!el) return;
    var left = livesLeft();
    el.setAttribute("aria-label", "血量 " + left + "/" + HP_MAX);
    var stars = el.querySelectorAll(".star");
    for (var i = 0; i < stars.length; i++) {
      stars[i].classList.toggle("lost", i >= left);
    }
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
      var chips = (lists.lists || []).map(function (l) {
        var cls = "vc-list-chip";
        if (l.cleared) cls += " is-cleared is-open";
        else if (l.unlocked) cls += " is-open";
        if (l.current) cls += " is-current";
        return '<div class="' + cls + '"><span>L' + l.listNo + "</span>" +
          "<small>" + (l.cleared ? "已通" : l.current ? "当前" : l.unlocked ? "可闯" : "锁") + "</small></div>";
      }).join("");

      var learnHref = "";
      var cur = (lists.lists || []).filter(function (l) { return l.current; })[0];
      if (cur) {
        learnHref = "vocab-learn.html?book=" + encodeURIComponent(lists.bookId) +
          "&list=" + encodeURIComponent(cur.id);
      }

      shell(
        noticesHtml(["按顺序闯关：新词（错≤5）→ 错词重测 → 补考至全对。"]) +
        '<p class="vc-meta">' + esc(lists.bookLabel || lists.bookId) +
          " · 已通关 List " + (prog.clearedListNo || 0) +
          " · 下一关 List " + (prog.nextListNo || 1) +
          " · 重测配额 " + (lists.retestQuota || 0) + " 题</p>" +
        '<p class="vc-meta">抽测池 ' + (pool.active || 0) +
          " · 顽固词 " + (pool.stubborn || 0) +
          " · 错题本 " + (pool.notebook || 0) + "</p>" +
        '<div class="vc-list-grid">' + chips + "</div>" +
        '<div class="vc-actions">' +
          '<button type="button" class="vl-btn vl-btn-primary" id="vc-start">开始 List ' +
            (prog.nextListNo || 1) + "</button>" +
          (learnHref
            ? '<a class="vl-btn" href="' + esc(learnHref) + '">先学习本 List</a>'
            : "") +
          '<a class="vl-btn" href="vocab-challenge.html?view=notebook">错题本</a>' +
          '<a class="vl-btn" href="zone.html?zone=study">返回</a>' +
        "</div>",
        lists.bookLabel || "闯关"
      );

      document.getElementById("vc-start").onclick = function () {
        startChallenge();
      };
      if (me.activeAttemptId) {
        A.api("/api/vocab-challenge/void", {
          method: "POST",
          body: { attemptId: me.activeAttemptId }
        }).catch(function () {});
      }
    }).catch(function () {
      shell('<p class="vs-empty">网络错误</p>', "错误");
    });
  }

  function startChallenge() {
    shell('<div class="state state--brand"><div class="spinner spinner--brand"></div>准备题目…</div>', "开始");
    A.api("/api/vocab-challenge/start", { method: "POST", body: {} })
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
    session.notices = d.notices || [];
    session.words = (d.items || []).map(parseWord).filter(function (w) { return w.word; });
    session.answers = [];
    session.idx = 0;

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

  function renderQuestion() {
    var w = session.words[session.idx];
    if (!w) {
      finishPhase();
      return;
    }
    session.selectedMeaning = null;
    session.answered = false;
    var opts = meaningOptions(w, session.words, 4);
    var labels = ["A", "B", "C", "D"];
    var showHp = session.phase === "new_words";
    shell(
      '<div class="vc-quiz-row">' +
        '<div class="vc-quiz-main">' +
      noticesHtml(session.idx === 0 ? session.notices : []) +
      '<p class="vl-listen-hint">' + esc(phaseLabel(session.phase)) +
        " · 听发音，先选中文含义，再拼写英文</p>" +
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
        '<button type="button" class="vl-btn" id="vc-abort">退出（作废）</button>' +
        '<button type="button" class="vl-btn vl-btn-primary" id="qnext" disabled>下一题 →</button>' +
      "</div>" +
        "</div>" +
        (showHp ? starsHtml() : "") +
      "</div>",
      "List " + session.listNo
    );
    document.getElementById("vc-counter").innerHTML =
      phaseLabel(session.phase) + " · 第 <strong>" + (session.idx + 1) + "</strong> / " +
      session.words.length;
    document.getElementById("listen").onclick = function () { speak(w.word); };
    setTimeout(function () { speak(w.word); }, 250);

    document.getElementById("opts").onclick = function (e) {
      var b = e.target.closest(".vl-opt");
      if (!b || session.answered) return;
      root.querySelectorAll(".vl-opt").forEach(function (x) { x.classList.remove("selected"); });
      b.classList.add("selected");
      session.selectedMeaning = b.getAttribute("data-v");
      var row = document.getElementById("spellRow");
      row.hidden = false;
      row.classList.add("is-open");
      document.getElementById("submit").disabled = false;
      bindEnglishSpellInput(document.getElementById("spell"));
      document.getElementById("spell").focus();
    };

    function soft(msg) {
      var fb = document.getElementById("fb");
      if (!fb) return;
      fb.className = "vl-feedback show fail";
      fb.textContent = msg;
    }

    function gradeCurrent() {
      if (session.answered) return;
      if (!session.selectedMeaning) { soft("请先选择中文含义"); return; }
      var spellEl = document.getElementById("spell");
      var spell = spellEl ? spellEl.value.trim().toLowerCase() : "";
      if (!spell) { soft("请先拼写英文"); if (spellEl) spellEl.focus(); return; }
      session.answered = true;
      var meaningOk = session.selectedMeaning === quizMeaning(w);
      var spellOk = spell === w.word.toLowerCase();
      var ok = meaningOk && spellOk;
      root.querySelectorAll(".vl-opt").forEach(function (b) {
        if (b.getAttribute("data-v") === quizMeaning(w)) b.classList.add("correct");
        else if (b.getAttribute("data-v") === session.selectedMeaning && !meaningOk) b.classList.add("wrong");
        b.classList.add("disabled");
      });
      if (spellEl) {
        spellEl.disabled = true;
        spellEl.classList.add(spellOk ? "spell-ok" : "spell-bad");
      }
      document.getElementById("submit").disabled = true;
      var fb = document.getElementById("fb");
      fb.className = "vl-feedback show " + (ok ? "ok" : "fail");
      fb.textContent = ok ? "正确" : ("错误 · 答案 " + w.word);
      session.answers.push({ word: w.word, correct: ok, userAnswer: spell });
      if (showHp) paintStars();
      document.getElementById("qnext").disabled = false;
    }

    document.getElementById("submit").onclick = gradeCurrent;
    document.getElementById("spell").onkeydown = function (e) {
      if (e.key === "Enter") gradeCurrent();
    };
    document.getElementById("qnext").onclick = function () {
      if (!session.answered) return;
      session.idx += 1;
      renderQuestion();
    };
    document.getElementById("vc-abort").onclick = function () {
      if (!confirm("退出将作废本次闯关，确定？")) return;
      A.api("/api/vocab-challenge/void", {
        method: "POST",
        body: { attemptId: session.attemptId }
      }).finally(function () {
        session.attemptId = 0;
        renderHub();
      });
    };
  }

  function finishPhase() {
    shell('<div class="state state--brand"><div class="spinner spinner--brand"></div>提交中…</div>', "提交");
    var path = session.phase === "new_words"
      ? "/api/vocab-challenge/submit-new"
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
        A.api("/api/vocab-challenge/me").then(function (me) {
          var bid = (me && me.assignment && me.assignment.bookId) || "";
          var href = session.listId
            ? ("vocab-learn.html?book=" + encodeURIComponent(bid) +
              "&list=" + encodeURIComponent(session.listId))
            : "vocab-challenge.html";
          shell(
            noticesHtml(d.notices || [], true) +
            '<p class="vc-meta">错误 ' + (d.wrongCount || 0) + " 个（超过 5 个上限）</p>" +
            '<div class="vc-actions">' +
              '<button type="button" class="vl-btn vl-btn-primary" id="vc-retry">直接重考</button>' +
              '<a class="vl-btn" href="' + esc(href) + '">先去学习</a>' +
              '<button type="button" class="vl-btn" id="vc-hub">返回进度</button>' +
            "</div>",
            "未通过"
          );
          document.getElementById("vc-retry").onclick = startChallenge;
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
    shell(
      noticesHtml(d.notices || []) +
      (d.stubbornReleased && d.stubbornReleased.length
        ? noticesHtml(["顽固词临时放行：" + d.stubbornReleased.join(", ")], true)
        : "") +
      '<p class="vc-meta">已通关至 List ' + (prog.clearedListNo || session.listNo) +
        " · 下一关 List " + (prog.nextListNo || ((prog.clearedListNo || 0) + 1)) + "</p>" +
      '<div class="vc-actions">' +
        '<button type="button" class="vl-btn vl-btn-primary" id="vc-next">继续下一 List</button>' +
        '<button type="button" class="vl-btn" id="vc-hub">返回进度</button>' +
      "</div>",
      "通关"
    );
    document.getElementById("vc-next").onclick = startChallenge;
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
        session.words = d.words.map(parseWord).filter(function (w) { return w.word; });
        session.answers = [];
        session.idx = 0;
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
    // reuse question UI with local-only grading
    session.selectedMeaning = null;
    session.answered = false;
    var opts = meaningOptions(w, session.words, 4);
    var labels = ["A", "B", "C", "D"];
    shell(
      noticesHtml(session.idx === 0 ? session.notices : []) +
      '<p class="vl-listen-hint">错题本练习 · 先选中文，再拼写</p>' +
      '<button type="button" class="vl-btn" id="listen">🔊 播放发音</button>' +
      '<div class="vl-opts" id="opts">' +
        opts.map(function (o, i) {
          return '<button type="button" class="vl-opt" data-v="' + esc(o) + '"><span class="label">' +
            labels[i] + ".</span> " + esc(o) + "</button>";
        }).join("") +
      "</div>" +
      '<div class="vl-spell-row" id="spellRow" hidden>' +
        '<input type="text" id="spell" lang="en" inputmode="latin" placeholder="拼写英文..." />' +
        '<button type="button" class="vl-btn vl-btn-primary" id="submit" disabled>提交</button>' +
      "</div>" +
      '<div class="vl-feedback" id="fb"></div>' +
      '<div class="vl-nav-row">' +
        '<button type="button" class="vl-btn vl-btn-primary" id="qnext" disabled>下一题 →</button>' +
      "</div>",
      "练习"
    );
    document.getElementById("vc-counter").innerHTML =
      "第 <strong>" + (session.idx + 1) + "</strong> / " + session.words.length;
    document.getElementById("listen").onclick = function () { speak(w.word); };
    setTimeout(function () { speak(w.word); }, 250);
    document.getElementById("opts").onclick = function (e) {
      var b = e.target.closest(".vl-opt");
      if (!b || session.answered) return;
      root.querySelectorAll(".vl-opt").forEach(function (x) { x.classList.remove("selected"); });
      b.classList.add("selected");
      session.selectedMeaning = b.getAttribute("data-v");
      var row = document.getElementById("spellRow");
      row.hidden = false;
      row.classList.add("is-open");
      document.getElementById("submit").disabled = false;
      bindEnglishSpellInput(document.getElementById("spell"));
      document.getElementById("spell").focus();
    };
    function grade() {
      if (session.answered) return;
      if (!session.selectedMeaning) return;
      var spellEl = document.getElementById("spell");
      var spell = spellEl ? spellEl.value.trim().toLowerCase() : "";
      if (!spell) return;
      session.answered = true;
      var ok = session.selectedMeaning === quizMeaning(w) && spell === w.word.toLowerCase();
      session.answers.push({ word: w.word, correct: ok, userAnswer: spell });
      var fb = document.getElementById("fb");
      fb.className = "vl-feedback show " + (ok ? "ok" : "fail");
      fb.textContent = ok ? "正确" : ("错误 · " + w.word);
      if (spellEl) spellEl.disabled = true;
      document.getElementById("submit").disabled = true;
      document.getElementById("qnext").disabled = false;
    }
    document.getElementById("submit").onclick = grade;
    document.getElementById("qnext").onclick = function () {
      session.idx += 1;
      renderPracticeQ();
    };
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
