/* diagnostic-mistakes.js — server-side diagnostic mistake book + retest */
(function () {
  "use strict";
  var A = window.YYSD_AUTH;
  var Y = window.YYSD;
  var contentEl = document.getElementById("content");
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var TYPE_LABEL = {
    listening_choice: "听音选词",
    english_to_chinese: "看英选中",
    chinese_to_english: "看中选英",
    spelling: "拼写填空"
  };
  var LEVEL_NAME = {
    high_school: "高中词汇",
    cet4: "四级词汇",
    ielts: "雅思词汇"
  };

  var mistakes = [];
  var retestQs = [];
  var retestIdx = 0;
  var selected = null;

  function esc(s) {
    return Y && Y.esc ? Y.esc(s) : String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function speakWord(text) {
    if (window.YysdWordAudio && window.YysdWordAudio.speak) {
      window.YysdWordAudio.speak(text);
    }
  }

  if (!A || !A.getToken || !A.getToken()) {
    contentEl.innerHTML =
      '<div class="diag-card"><p class="diag-lead">请先登录</p><a class="btn btn--primary" href="login.html">去登录</a></div>';
    return;
  }

  function loadList() {
    var level = (document.getElementById("filt-level") || {}).value || "";
    var qtype = (document.getElementById("filt-type") || {}).value || "";
    var q = [];
    if (level) q.push("level=" + encodeURIComponent(level));
    if (qtype) q.push("question_type=" + encodeURIComponent(qtype));
    return A.api("/api/diagnostic/mistakes" + (q.length ? "?" + q.join("&") : "")).then(function (d) {
      mistakes = d.mistakes || [];
      renderList();
    });
  }

  function renderList() {
    var rows = mistakes
      .map(function (m) {
        return (
          "<li>" +
          '<label><input type="checkbox" class="mist-cb" value="' +
          m.id +
          '"></label>' +
          "<div><strong>" +
          esc(m.word || m.correct_answer) +
          "</strong> · " +
          esc(m.meaning || "") +
          '<div class="diag-mist-meta">' +
          esc(LEVEL_NAME[m.level] || m.level) +
          " · " +
          esc(TYPE_LABEL[m.question_type] || m.question_type) +
          "</div>" +
          '<div>你的答案：<span class="diag-ua">' +
          esc(m.user_answer || "（空）") +
          '</span> · 正确：<span class="diag-ca">' +
          esc(m.correct_answer) +
          "</span></div></div></li>"
        );
      })
      .join("");

    contentEl.innerHTML =
      '<div class="diag-card">' +
      "<h1>诊断错题本</h1>" +
      '<p class="diag-lead">来自能力诊断的错题；重练答对后自动移出。</p>' +
      '<div class="diag-mistakes-toolbar">' +
      '<select id="filt-level"><option value="">全部词库</option>' +
      '<option value="high_school">高中</option><option value="cet4">四级</option><option value="ielts">雅思</option></select>' +
      '<select id="filt-type"><option value="">全部题型</option>' +
      '<option value="listening_choice">听音选词</option>' +
      '<option value="english_to_chinese">看英选中</option>' +
      '<option value="chinese_to_english">看中选英</option>' +
      '<option value="spelling">拼写填空</option></select>' +
      '<button type="button" class="btn btn--ghost btn--sm" id="btn-filter">筛选</button>' +
      '<button type="button" class="btn btn--primary btn--sm" id="btn-retest">重练选中</button>' +
      '<a class="btn btn--ghost btn--sm" href="diagnostic.html">去诊断</a>' +
      "</div>" +
      (mistakes.length
        ? '<ul class="diag-mist-list">' + rows + "</ul>"
        : '<p class="diag-lead">暂无错题。</p>') +
      '<p class="diag-msg" id="mist-err" hidden></p></div>';

    document.getElementById("btn-filter").addEventListener("click", function () {
      loadList().catch(showErr);
    });
    document.getElementById("btn-retest").addEventListener("click", startRetest);
  }

  function showErr(e) {
    var el = document.getElementById("mist-err");
    if (el) {
      el.hidden = false;
      el.textContent = (e && e.message) || String(e);
    }
  }

  function startRetest() {
    var ids = [];
    document.querySelectorAll(".mist-cb:checked").forEach(function (cb) {
      ids.push(Number(cb.value));
    });
    if (!ids.length) {
      showErr(new Error("请先勾选错题"));
      return;
    }
    A.api("/api/diagnostic/mistakes/retest", { method: "POST", body: { ids: ids } })
      .then(function (d) {
        retestQs = d.questions || [];
        retestIdx = 0;
        if (!retestQs.length) throw new Error("无法生成重练题");
        renderRetest();
      })
      .catch(showErr);
  }

  function renderRetest() {
    if (retestIdx >= retestQs.length) {
      contentEl.innerHTML =
        '<div class="diag-card"><h1>重练完成</h1><p class="diag-lead">答对的题目已移出错题本。</p>' +
        '<div class="diag-actions"><button type="button" class="btn btn--primary" id="back-list">返回错题本</button></div></div>';
      document.getElementById("back-list").addEventListener("click", function () {
        loadList().catch(showErr);
      });
      return;
    }
    selected = null;
    var q = retestQs[retestIdx];
    var body = "";
    var type = q.question_type;
    body += '<span class="diag-qtype">' + esc(TYPE_LABEL[type] || type) + "</span>";
    if (type === "listening_choice") {
      body +=
        '<div><button type="button" class="diag-play" id="rt-play">▶</button></div>' +
        optionsHTML(q.options || []);
    } else if (type === "english_to_chinese") {
      body += '<p class="diag-prompt">' + esc(q.question_content) + "</p>" + optionsHTML(q.options || []);
    } else if (type === "chinese_to_english") {
      body +=
        '<p class="diag-prompt diag-prompt--cn">' +
        esc(q.question_content) +
        "</p>" +
        optionsHTML(q.options || []);
    } else {
      body +=
        '<p class="diag-ipa">' +
        esc(q.phonetic || "") +
        '</p><div class="diag-example">' +
        esc((q.question_content && q.question_content.example) || q.example_sentence || "") +
        '</div><input class="diag-input" id="rt-spell" type="text" autocomplete="off">';
    }

    contentEl.innerHTML =
      '<div class="diag-card">' +
      "<h1>错题重练 " +
      (retestIdx + 1) +
      "/" +
      retestQs.length +
      "</h1>" +
      body +
      '<div class="diag-feedback" id="rt-fb"></div>' +
      '<div class="diag-actions">' +
      '<button type="button" class="btn btn--primary" id="rt-submit">提交</button>' +
      '<button type="button" class="btn btn--ghost" id="rt-next" hidden>下一题</button>' +
      "</div></div>";

    var play = document.getElementById("rt-play");
    if (play) {
      play.addEventListener("click", function () {
        speakWord(String(q.question_content || ""));
      });
      speakWord(String(q.question_content || ""));
    }
    document.querySelectorAll(".diag-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selected = btn.getAttribute("data-opt");
        document.querySelectorAll(".diag-opt").forEach(function (b) {
          b.classList.toggle("is-selected", b === btn);
        });
      });
    });
    document.getElementById("rt-submit").addEventListener("click", function () {
      submitRetest(q);
    });
  }

  function optionsHTML(opts) {
    return (
      '<div class="diag-options">' +
      opts
        .map(function (o) {
          return (
            '<button type="button" class="diag-opt" data-opt="' + esc(o) + '">' + esc(o) + "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function submitRetest(q) {
    var ua = selected;
    if (q.question_type === "spelling") {
      var input = document.getElementById("rt-spell");
      ua = input ? input.value : "";
    }
    if (ua == null || String(ua).trim() === "") return;
    A.api("/api/diagnostic/mistakes/retest/answer", {
      method: "POST",
      body: { mistake_id: q.mistake_id, user_answer: ua }
    }).then(function (d) {
      var fb = document.getElementById("rt-fb");
      fb.className = "diag-feedback is-visible " + (d.is_correct ? "is-ok" : "is-bad");
      fb.innerHTML = d.is_correct
        ? "✓ 正确" + (d.removed ? " · 已移出错题本" : "")
        : "✗ 错误。正确答案：<strong>" + esc(d.correct_answer) + "</strong>";
      document.getElementById("rt-submit").hidden = true;
      var next = document.getElementById("rt-next");
      next.hidden = false;
      next.onclick = function () {
        retestIdx += 1;
        renderRetest();
      };
      document.querySelectorAll(".diag-opt").forEach(function (btn) {
        btn.disabled = true;
        if (btn.getAttribute("data-opt") === String(d.correct_answer)) btn.classList.add("is-correct");
      });
    });
  }

  loadList().catch(function (e) {
    contentEl.innerHTML =
      '<div class="diag-card"><p class="diag-msg">' + esc(e.message) + "</p></div>";
  });
})();
