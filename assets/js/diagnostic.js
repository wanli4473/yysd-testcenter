/* =========================================================================
   diagnostic.js — adaptive vocab placement test (student session)
   ========================================================================= */
(function () {
  "use strict";

  var A = window.YYSD_AUTH;
  var Y = window.YYSD;
  var contentEl = document.getElementById("content");
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var navLink = document.querySelector('#nav a[data-zone="study"]');
  if (navLink) navLink.classList.add("is-active");

  var TYPE_LABEL = {
    listening_choice: "听音选词",
    english_to_chinese: "看英选中",
    chinese_to_english: "看中选英",
    spelling: "拼写填空"
  };
  var RATING_STAR = {
    excellent: "优秀 ★★★",
    good: "良好 ★★☆",
    weak: "需加强 ★☆☆"
  };
  var LEVEL_NAME = {
    high_school: "高中词汇",
    cet4: "四级词汇",
    ielts: "雅思词汇"
  };

  var state = {
    session: null,
    selected: null,
    feedback: null,
    submitting: false,
    timerStart: null,
    elapsedBase: 0,
    timerId: null,
    qStart: null,
    report: null,
    gate: false,
    earlyAborted: false
  };

  state.gate = new URLSearchParams(location.search).get("gate") === "1";

  function esc(s) {
    return Y && Y.esc ? Y.esc(s) : String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function api(path, opts) {
    if (!A || !A.api) return Promise.reject(new Error("请先登录"));
    return A.api(path, opts);
  }

  function elapsedNow() {
    var base = state.elapsedBase || 0;
    if (!state.timerStart) return base;
    return base + Math.floor((Date.now() - state.timerStart) / 1000);
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function startTimer(base) {
    state.elapsedBase = base || 0;
    state.timerStart = Date.now();
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(function () {
      var el = document.getElementById("diag-timer");
      if (el) el.textContent = formatTime(elapsedNow());
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
    state.elapsedBase = elapsedNow();
    state.timerStart = null;
  }

  function speakWord(text) {
    if (window.YysdWordAudio && window.YysdWordAudio.speak) {
      window.YysdWordAudio.speak(text);
    } else if (window.speechSynthesis) {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB";
      window.speechSynthesis.speak(u);
    }
  }

  function requireLogin() {
    if (!A || !A.getToken || !A.getToken()) {
      var next = state.gate ? "diagnostic.html?gate=1" : "diagnostic.html";
      contentEl.innerHTML =
        '<div class="diag-card"><h1>单词能力诊断</h1>' +
        '<p class="diag-lead">请先登录学生账号后再开始测试。</p>' +
        '<div class="diag-actions"><a class="btn btn--primary" href="login.html?next=' +
        encodeURIComponent(next) +
        '">去登录</a></div></div>';
      return false;
    }
    if (A.isTeacher && A.isTeacher()) {
      contentEl.innerHTML =
        '<div class="diag-card"><h1>单词能力诊断</h1>' +
        '<p class="diag-lead">请使用学生账号参加诊断。教师可在学情看板查看班级总览。</p>' +
        '<div class="diag-actions"><a class="btn btn--ghost" href="teacher.html">打开教师端</a></div></div>';
      return false;
    }
    return true;
  }

  function applyGateChrome() {
    if (!state.gate) return;
    document.title = "首次词汇能力测试 · 优益思达国际课程中心";
    var back = document.querySelector(".minimal-back");
    if (back) {
      back.innerHTML =
        '<span class="minimal-back__link" style="opacity:.7;cursor:default">完成测试后即可进入单词区</span>';
    }
  }

  function renderIntro(resumeSession) {
    applyGateChrome();
    var resumeHtml = "";
    if (resumeSession) {
      resumeHtml =
        '<p class="diag-lead">检测到未完成的测试（' +
        esc(resumeSession.stage_name || "") + " · 已答 " +
        ((resumeSession.stage_progress && resumeSession.stage_progress.answered) || 0) +
        " 题）。是否继续？</p>" +
        '<div class="diag-actions">' +
        '<button type="button" class="btn btn--primary" id="diag-resume">继续上次</button>' +
        '<button type="button" class="btn btn--ghost" id="diag-restart">重新开始</button>' +
        "</div>";
    } else {
      resumeHtml =
        '<div class="diag-actions">' +
        '<button type="button" class="btn btn--primary" id="diag-start">' +
        (state.gate ? "开始首次能力测试" : "开始诊断") +
        "</button>" +
        (state.gate
          ? ""
          : '<a class="btn btn--ghost" href="diagnostic-mistakes.html">诊断错题本</a>') +
        "</div>";
    }
    var gateLead = state.gate
      ? '<p class="diag-lead diag-lead--gate"><strong>首次进入单词区前，需完成一次词汇能力测试。</strong>结束后将生成详细报告与学习建议，并推荐适合你的起始词库。</p>'
      : '<p class="diag-lead">双线自适应：实用推荐线决定能否进入下一阶段；优秀线（87%）评定是否精通。</p>';
    contentEl.innerHTML =
      '<div class="diag-card">' +
      "<h1>" +
      (state.gate ? "首次词汇能力测试" : "单词能力诊断") +
      "</h1>" +
      gateLead +
      (state.gate
        ? '<p class="diag-lead">双线自适应：实用推荐线决定能否进入下一阶段；优秀线（87%）评定是否精通。</p>'
        : "") +
      '<ul class="diag-rules">' +
      "<li><strong>阶段一 · 高中</strong> 30 题，通过线 77%（灰区结合拼写）</li>" +
      "<li><strong>阶段二 · 四级</strong> 30 题，通过线 73%</li>" +
      "<li><strong>阶段三 · 雅思</strong> 25 题，通过线 68%；完成后无论是否通过均结束</li>" +
      "<li>题型：听音选词 / 看英选中 / 看中选英 / 拼写填空（严格匹配，忽略大小写）</li>" +
      "<li>即时反馈对错；产出推荐起始词库、能力报告与错题本</li>" +
      "<li>已答不少于 10 题且错误率超过 50% 时，提前结束并生成报告</li>" +
      "</ul>" +
      resumeHtml +
      '<p class="diag-msg" id="diag-err" hidden></p></div>';

    var err = document.getElementById("diag-err");
    function showErr(msg) {
      if (!err) return;
      err.hidden = !msg;
      err.textContent = msg || "";
    }

    var startBtn = document.getElementById("diag-start");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        startBtn.disabled = true;
        showErr("");
        api("/api/diagnostic/start", { method: "POST", body: {} })
          .then(function (d) {
            if (d.resume_available) {
              renderIntro(d.session);
              return;
            }
            enterSession(d.session);
          })
          .catch(function (e) {
            startBtn.disabled = false;
            showErr(e.message || "无法开始");
          });
      });
    }
    var resumeBtn = document.getElementById("diag-resume");
    if (resumeBtn) {
      resumeBtn.addEventListener("click", function () {
        enterSession(resumeSession);
      });
    }
    var restartBtn = document.getElementById("diag-restart");
    if (restartBtn) {
      restartBtn.addEventListener("click", function () {
        restartBtn.disabled = true;
        api("/api/diagnostic/start", { method: "POST", body: { force: true } })
          .then(function (d) { enterSession(d.session); })
          .catch(function (e) {
            restartBtn.disabled = false;
            showErr(e.message || "无法重新开始");
          });
      });
    }
  }

  function enterSession(session) {
    state.session = session;
    state.selected = null;
    state.feedback = null;
    state.report = null;
    startTimer(session.elapsed_seconds || 0);
    if (session.status === "completed") {
      stopTimer();
      renderComplete(session);
      return;
    }
    if (session.stage_done) {
      renderStageGate();
      return;
    }
    renderQuestion();
  }

  function renderQuestion() {
    var sess = state.session;
    if (!sess || !sess.current_question) {
      if (sess && sess.stage_done) return renderStageGate();
      contentEl.innerHTML = '<div class="diag-card"><p>题目加载失败</p></div>';
      return;
    }
    state.qStart = Date.now();
    state.selected = null;
    state.feedback = null;

    var q = sess.current_question;
    var prog = sess.stage_progress || { answered: 0, total: 1 };
    var pct = prog.total ? Math.round((prog.answered / prog.total) * 100) : 0;

    contentEl.innerHTML =
      '<div class="diag-card">' +
      '<div class="diag-top">' +
      "<span>" + esc(sess.stage_name || "") + "</span>" +
      '<div class="diag-progress-wrap"><div class="diag-progress-fill" style="width:' + pct + '%"></div></div>' +
      "<span>" + (prog.answered + 1) + " / " + prog.total + "</span>" +
      '<span id="diag-timer">' + esc(formatTime(elapsedNow())) + "</span>" +
      "</div>" +
      questionBodyHTML(q) +
      '<div class="diag-feedback" id="diag-fb"></div>' +
      '<div class="diag-actions">' +
      '<button type="button" class="btn btn--primary" id="diag-submit">提交</button>' +
      '<button type="button" class="btn btn--ghost" id="diag-next" hidden>下一题</button>' +
      "</div>" +
      '<p class="diag-msg" id="diag-err" hidden></p></div>';

    bindQuestionControls(q);
  }

  function questionBodyHTML(q) {
    var type = q.question_type;
    var html = '<span class="diag-qtype">' + esc(TYPE_LABEL[type] || type) + "</span>";
    if (type === "listening_choice") {
      html +=
        '<div><button type="button" class="diag-play" id="diag-play" aria-label="播放读音">▶</button>' +
        '<p class="diag-hint">点击播放，选择听到的单词</p></div>';
      html += optionsHTML(q.options || []);
    } else if (type === "english_to_chinese") {
      html += '<p class="diag-prompt">' + esc(q.question_content) + "</p>";
      html += optionsHTML(q.options || []);
    } else if (type === "chinese_to_english") {
      html += '<p class="diag-prompt diag-prompt--cn">' + esc(q.question_content) + "</p>";
      html += optionsHTML(q.options || []);
    } else {
      html +=
        '<p class="diag-ipa">' +
        esc(q.phonetic || (q.question_content && q.question_content.phonetic) || "") +
        "</p>";
      html +=
        '<div class="diag-example">' +
        esc((q.question_content && q.question_content.example) || q.example_sentence || "______") +
        "</div>";
      html +=
        '<p class="diag-hint">请填写英文拼写（忽略大小写；单复数/时态不同视为不同答案）</p>';
      html +=
        '<input class="diag-input" id="diag-spell" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="输入单词拼写">';
    }
    return html;
  }

  function optionsHTML(opts) {
    return (
      '<div class="diag-options" id="diag-opts">' +
      opts.map(function (o, i) {
        return (
          '<button type="button" class="diag-opt" data-opt="' +
          esc(o) +
          '" data-i="' +
          i +
          '">' +
          esc(o) +
          "</button>"
        );
      }).join("") +
      "</div>"
    );
  }

  function bindQuestionControls(q) {
    var play = document.getElementById("diag-play");
    if (play) {
      play.addEventListener("click", function () {
        speakWord(String(q.question_content || ""));
      });
      setTimeout(function () {
        speakWord(String(q.question_content || ""));
      }, 200);
    }
    document.querySelectorAll(".diag-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (state.feedback) return;
        state.selected = btn.getAttribute("data-opt");
        document.querySelectorAll(".diag-opt").forEach(function (b) {
          b.classList.toggle("is-selected", b === btn);
        });
      });
    });
    var submit = document.getElementById("diag-submit");
    var next = document.getElementById("diag-next");
    if (submit) submit.addEventListener("click", function () { submitAnswer(q); });
    if (next) {
      next.addEventListener("click", function () {
        state.feedback = null;
        if (state.earlyAborted || (state.session && state.session.status === "completed")) {
          stopTimer();
          renderComplete(state.session);
          return;
        }
        if (state.session.stage_done) renderStageGate();
        else renderQuestion();
      });
    }
    var spell = document.getElementById("diag-spell");
    if (spell) {
      spell.addEventListener("keydown", function (e) {
        if (e.key === "Enter") submitAnswer(q);
      });
      spell.focus();
    }
  }

  function submitAnswer(q) {
    if (state.submitting || state.feedback) return;
    var ua = state.selected;
    if (q.question_type === "spelling") {
      var input = document.getElementById("diag-spell");
      ua = input ? input.value : "";
    }
    if (ua == null || String(ua).trim() === "") {
      var err = document.getElementById("diag-err");
      if (err) {
        err.hidden = false;
        err.textContent = "请先作答";
      }
      return;
    }
    state.submitting = true;
    var spent = Math.max(1, Math.round((Date.now() - (state.qStart || Date.now())) / 1000));
    var submitBtn = document.getElementById("diag-submit");
    if (submitBtn) submitBtn.disabled = true;

    api("/api/diagnostic/session/" + state.session.session_id + "/answer", {
      method: "POST",
      body: {
        qid: q.qid,
        user_answer: ua,
        time_spent_seconds: spent,
        elapsed_seconds: elapsedNow()
      }
    })
      .then(function (d) {
        state.submitting = false;
        state.session = d.session;
        state.feedback = d.session.last_feedback;
        if (d.early_aborted) {
          state.earlyAborted = true;
          state.report = d.report || null;
        }
        showFeedback(d.is_correct, d.correct_answer, ua, d.early_aborted);
      })
      .catch(function (e) {
        state.submitting = false;
        if (submitBtn) submitBtn.disabled = false;
        var errEl = document.getElementById("diag-err");
        if (errEl) {
          errEl.hidden = false;
          errEl.textContent = e.message || "提交失败";
        }
      });
  }

  function showFeedback(ok, correct, userAnswer, earlyAborted) {
    var fb = document.getElementById("diag-fb");
    if (fb) {
      fb.className = "diag-feedback is-visible " + (ok ? "is-ok" : "is-bad");
      fb.innerHTML = ok
        ? "✓ 正确"
        : ("✗ 错误。正确答案：<strong>" + esc(correct) + "</strong>");
      if (earlyAborted) {
        fb.innerHTML +=
          '<div class="diag-early-abort">错误率已超过 50%，测试提前结束。点「下一题」查看报告。</div>';
      }
    }
    var submit = document.getElementById("diag-submit");
    var next = document.getElementById("diag-next");
    if (submit) submit.hidden = true;
    if (next) {
      next.hidden = false;
      next.focus();
    }

    document.querySelectorAll(".diag-opt").forEach(function (btn) {
      btn.disabled = true;
      var v = btn.getAttribute("data-opt");
      if (v === String(correct)) btn.classList.add("is-correct");
      if (v === String(userAnswer) && !ok) btn.classList.add("is-wrong");
    });
    var spell = document.getElementById("diag-spell");
    if (spell) {
      spell.disabled = true;
      spell.style.borderColor = ok ? "#3a7d5a" : "#c0392b";
      spell.style.background = ok ? "#eaf5ee" : "#fdf0ee";
    }
  }

  function renderStageGate() {
    contentEl.innerHTML =
      '<div class="diag-card"><div class="state state--brand"><div class="spinner spinner--brand"></div>正在结算本阶段…</div></div>';
    api("/api/diagnostic/session/" + state.session.session_id + "/next-stage", {
      method: "POST",
      body: { elapsed_seconds: elapsedNow() }
    })
      .then(function (d) {
        state.session = d.session;
        state.report = d.report || null;
        if (d.next_action === "continue") renderStageTransition(d.stage_result, true);
        else {
          stopTimer();
          renderStageTransition(d.stage_result, false);
        }
      })
      .catch(function (e) {
        contentEl.innerHTML =
          '<div class="diag-card"><p class="diag-msg">' +
          esc(e.message || "结算失败") +
          '</p><button type="button" class="btn btn--primary" id="diag-retry-stage">重试</button></div>';
        document.getElementById("diag-retry-stage").addEventListener("click", renderStageGate);
      });
  }

  function renderStageTransition(result, canContinue) {
    var rating = result.rating || "weak";
    contentEl.innerHTML =
      '<div class="diag-card">' +
      "<h1>" +
      esc(result.name || "") +
      " · 阶段结果</h1>" +
      '<div class="diag-stat-grid">' +
      '<div class="diag-stat"><div class="diag-stat__val">' +
      Math.round(result.accuracy * 100) +
      '%</div><div class="diag-stat__lbl">正确率</div></div>' +
      '<div class="diag-stat"><div class="diag-stat__val">' +
      Math.round(result.spelling_accuracy * 100) +
      '%</div><div class="diag-stat__lbl">拼写正确率</div></div>' +
      '<div class="diag-stat"><div class="diag-stat__val">' +
      result.correct +
      "/" +
      result.total +
      '</div><div class="diag-stat__lbl">答对题数</div></div>' +
      "</div>" +
      '<p class="diag-rating diag-rating--' +
      esc(rating) +
      '">' +
      esc(RATING_STAR[rating] || rating) +
      (result.is_passed ? " · 达标" : " · 未达实用推荐线") +
      "</p>" +
      '<p class="diag-lead" style="margin-top:16px">' +
      (canContinue
        ? "已解锁下一阶段，继续挑战！"
        : "测试结束。可查看能力报告与诊断错题本。") +
      "</p>" +
      '<div class="diag-actions" id="diag-stage-actions"></div></div>';

    var actions = document.getElementById("diag-stage-actions");
    if (canContinue) {
      actions.innerHTML =
        '<button type="button" class="btn btn--primary" id="diag-continue">继续挑战</button>';
      document.getElementById("diag-continue").addEventListener("click", function () {
        renderQuestion();
      });
    } else {
      actions.innerHTML =
        '<button type="button" class="btn btn--primary" id="diag-to-complete">查看结果</button>';
      document.getElementById("diag-to-complete").addEventListener("click", function () {
        renderComplete(state.session);
      });
    }
  }

  function renderComplete(session) {
    var sid = session.session_id;
    var loadReport = state.report
      ? Promise.resolve(state.report)
      : api("/api/diagnostic/session/" + sid + "/report").then(function (d) {
          return d.report;
        });

    contentEl.innerHTML =
      '<div class="diag-card"><div class="state state--brand"><div class="spinner spinner--brand"></div>生成结果…</div></div>';

    loadReport
      .then(function (report) {
        state.report = report;
        var stages = (report && report.stages) || [];
        var answeredStages = stages.filter(Boolean);
        var totalQ = 0;
        var totalC = 0;
        answeredStages.forEach(function (s) {
          totalQ += s.total || 0;
          totalC += s.correct || 0;
        });
        var acc = totalQ ? Math.round((totalC / totalQ) * 100) : 0;
        contentEl.innerHTML =
          '<div class="diag-card">' +
          "<h1>诊断完成</h1>" +
          '<div class="diag-stat-grid">' +
          '<div class="diag-stat"><div class="diag-stat__val">' +
          totalQ +
          '</div><div class="diag-stat__lbl">总题数</div></div>' +
          '<div class="diag-stat"><div class="diag-stat__val">' +
          acc +
          '%</div><div class="diag-stat__lbl">总正确率</div></div>' +
          '<div class="diag-stat"><div class="diag-stat__val">' +
          formatTime((report && report.total_time_seconds) || state.elapsedBase) +
          '</div><div class="diag-stat__lbl">用时</div></div>' +
          "</div>" +
          '<p class="diag-lead">推荐起始词库：<strong>' +
          esc(LEVEL_NAME[report.recommended_start_level] || report.recommended_start_level) +
          "</strong></p>" +
          '<div class="diag-actions">' +
          (state.gate
            ? '<a class="btn btn--primary" href="diagnostic-report.html?session=' +
              sid +
              '&placement=1">查看详细报告与学习建议</a>'
            : '<a class="btn btn--primary" href="diagnostic-report.html?session=' +
              sid +
              '">查看详细能力报告</a>' +
              '<a class="btn btn--ghost" href="diagnostic-mistakes.html">进入错题本</a>' +
              '<a class="btn btn--ghost" href="zone.html?zone=study&s=vocab">返回单词区</a>') +
          "</div></div>";
        if (state.gate) {
          // Force landing on full report after first placement
          setTimeout(function () {
            location.replace(
              "diagnostic-report.html?session=" + sid + "&placement=1"
            );
          }, 600);
        }
      })
      .catch(function (e) {
        contentEl.innerHTML =
          '<div class="diag-card"><p class="diag-msg">' + esc(e.message) + "</p></div>";
      });
  }

  window.YYSD_DIAG = {
    TYPE_LABEL: TYPE_LABEL,
    RATING_STAR: RATING_STAR,
    LEVEL_NAME: LEVEL_NAME,
    esc: esc
  };

  if (!requireLogin()) return;
  api("/api/diagnostic/status")
    .then(function (d) {
      if (d && d.resume_available) renderIntro(d.session);
      else renderIntro(null);
    })
    .catch(function () {
      renderIntro(null);
    });
})();
