/* =========================================================================
   wrong-record.js — 错题详情 + 按需 AI 分析/追问
   ========================================================================= */
(function () {
  "use strict";

  var Y = window.YYSD;
  var AUTH = window.YYSD_AUTH;
  var qs = new URLSearchParams(location.search);
  var content = document.getElementById("wr-content");
  var titleEl = document.getElementById("wr-title");
  var metaEl = document.getElementById("wr-meta");
  var quotaEl = document.getElementById("wr-quota");
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var chatByNo = {};

  function esc(s) {
    return Y && Y.esc ? Y.esc(s) : String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function fmtDate(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("zh-CN"); } catch (e) { return String(d); }
  }

  function localByItem(itemId) {
    var store = (Y && Y.results && Y.results()) || {};
    var r = store[itemId];
    if (!r) return null;
    return {
      id: r.id || itemId,
      title: r.title || itemId,
      subject: r.subject || "",
      score: r.score,
      total: r.total,
      band: r.band,
      date: r.date,
      assignmentEventId: r.assignmentEventId || null,
      cdt: !!r.cdt,
      wrong: Array.isArray(r.wrong) ? r.wrong : [],
      attemptId: null
    };
  }

  function setQuota(q) {
    if (!quotaEl) return;
    if (!q || q.unlimited) {
      quotaEl.hidden = true;
      return;
    }
    quotaEl.hidden = false;
    quotaEl.textContent = "今日 AI 文字额度剩余 " + (q.textLeft != null ? q.textLeft : "—") +
      (q.textLimit != null ? "/" + q.textLimit : "");
  }

  function analysisHTML(a) {
    if (!a) return "";
    return '<div class="wrong-ai-card">' +
      (a.whyWrong ? "<p><b>错因</b> " + esc(a.whyWrong) + "</p>" : "") +
      (a.evidence ? "<p><b>考点</b> " + esc(a.evidence) + "</p>" : "") +
      (a.strategy ? "<p><b>策略</b> " + esc(a.strategy) + "</p>" : "") +
      (a.keyVocab ? "<p><b>词汇</b> " + esc(a.keyVocab) + "</p>" : "") +
    "</div>";
  }

  function itemCard(attempt, w, idx) {
    var key = String(attempt.id) + "|" + String(w.no) + "|" + idx;
    var explain = (w.explain || "").trim();
    var explainNote = explain
      ? '<p class="wrong-item__explain">' + esc(explain) + "</p>"
      : '<p class="wrong-item__hint">暂无卷面讲解（历史记录可能未收录）。重做该卷交卷后会更新。</p>';
    return '<article class="wrong-item" data-key="' + esc(key) + '">' +
      "<header><h3>第 " + esc(String(w.no)) + " 题</h3>" +
        (attempt.title ? '<span class="wrong-item__paper">' + esc(attempt.title) + "</span>" : "") +
      "</header>" +
      (w.stem ? '<p class="wrong-item__stem">' + esc(w.stem) + "</p>" : "") +
      '<dl class="wrong-item__ans">' +
        "<div><dt>你的答案</dt><dd>" + esc(w.ua || "未作答") + "</dd></div>" +
        "<div><dt>正确答案</dt><dd>" + esc(w.ans || "—") + "</dd></div>" +
      "</dl>" +
      explainNote +
      '<div class="wrong-item__ai" data-ai="' + esc(key) + '">' +
        '<button type="button" class="btn btn--ghost btn--sm" data-analyze="' + esc(key) + '">AI 分析本题</button>' +
        '<div class="wrong-item__ai-out" hidden></div>' +
        '<div class="wrong-item__ask" hidden>' +
          '<input type="text" class="wrong-ask-input" placeholder="继续追问…" maxlength="500" data-ask-input="' + esc(key) + '">' +
          '<button type="button" class="btn btn--primary btn--sm" data-ask="' + esc(key) + '">提问</button>' +
        "</div>" +
        '<p class="wrong-item__ai-err" hidden></p>' +
      "</div>" +
    "</article>";
  }

  function findWrongMeta(key) {
    var parts = key.split("|");
    var itemId = parts[0];
    var no = parts[1];
    var idx = parseInt(parts[2], 10);
    var attempt = (window.__WR_ATTEMPTS || []).filter(function (a) { return a.id === itemId; })[0];
    if (!attempt && (window.__WR_ATTEMPTS || []).length === 1) attempt = window.__WR_ATTEMPTS[0];
    if (!attempt) {
      (window.__WR_ATTEMPTS || []).forEach(function (a) {
        if (!attempt && a.wrong && a.wrong[idx] && String(a.wrong[idx].no) === no) attempt = a;
      });
    }
    var w = null;
    if (attempt && attempt.wrong) {
      if (attempt.wrong[idx] && String(attempt.wrong[idx].no) === no) w = attempt.wrong[idx];
      else {
        for (var i = 0; i < attempt.wrong.length; i++) {
          if (String(attempt.wrong[i].no) === no) { w = attempt.wrong[i]; break; }
        }
      }
    }
    return { attempt: attempt, w: w, key: key };
  }

  function runAnalyze(key, followUp) {
    var meta = findWrongMeta(key);
    var box = content.querySelector('[data-ai="' + key + '"]');
    if (!box || !meta.w) return;
    var out = box.querySelector(".wrong-item__ai-out");
    var ask = box.querySelector(".wrong-item__ask");
    var err = box.querySelector(".wrong-item__ai-err");
    var btn = box.querySelector('[data-analyze="' + key + '"]');
    err.hidden = true;
    if (!AUTH || !AUTH.analyzeWrongItem) {
      err.hidden = false;
      err.textContent = "请先登录学生账号后再使用 AI 分析";
      return;
    }
    if (btn) btn.disabled = true;
    var hist = chatByNo[key] || [];
    AUTH.analyzeWrongItem({
      itemId: meta.attempt && meta.attempt.id,
      title: meta.attempt && meta.attempt.title,
      subject: meta.attempt && meta.attempt.subject,
      no: meta.w.no,
      ua: meta.w.ua,
      ans: meta.w.ans,
      explain: meta.w.explain,
      stem: meta.w.stem,
      followUp: followUp || "",
      history: hist
    }).then(function (d) {
      setQuota(d.quota);
      var text = analysisHTML(d.analysis);
      out.hidden = false;
      out.innerHTML = (out.innerHTML || "") + (followUp
        ? '<div class="wrong-ai-turn"><p class="wrong-ai-q">问：' + esc(followUp) + "</p>" + text + "</div>"
        : text);
      ask.hidden = false;
      var reply = [d.analysis.whyWrong, d.analysis.evidence, d.analysis.strategy].filter(Boolean).join("\n");
      hist.push({ role: "user", content: followUp || ("分析第 " + meta.w.no + " 题") });
      hist.push({ role: "assistant", content: reply });
      chatByNo[key] = hist.slice(-8);
    }).catch(function (e) {
      err.hidden = false;
      err.textContent = (e && e.message) || "分析失败";
      if (e && e.quota) setQuota(e.quota);
    }).then(function () {
      if (btn) btn.disabled = false;
    });
  }

  function bindAi() {
    content.addEventListener("click", function (e) {
      var a = e.target.closest("[data-analyze]");
      if (a) {
        runAnalyze(a.getAttribute("data-analyze"), "");
        return;
      }
      var q = e.target.closest("[data-ask]");
      if (q) {
        var key = q.getAttribute("data-ask");
        var input = content.querySelector('[data-ask-input="' + key + '"]');
        var text = input ? String(input.value || "").trim() : "";
        if (!text) return;
        input.value = "";
        runAnalyze(key, text);
      }
    });
  }

  function renderAttempts(attempts) {
    attempts = (attempts || []).filter(function (a) {
      return a && Array.isArray(a.wrong) && a.wrong.length;
    });
    window.__WR_ATTEMPTS = attempts;
    if (!attempts.length) {
      titleEl.textContent = "暂无错题";
      metaEl.textContent = "这次作答没有错题，或记录尚未同步。";
      content.innerHTML = '<div class="state state--brand results-empty premium-empty">' +
        "<h3>没有可查看的错题</h3>" +
        '<p>完成作业并交卷后，错题会出现在「我的成绩 · 错题记录」。</p>' +
        '<a class="btn btn--primary" href="results.html#tab=wrongs">返回错题记录</a></div>';
      return;
    }
    var titles = attempts.map(function (a) { return a.title || a.id; });
    var uniq = titles.filter(function (t, i) { return titles.indexOf(t) === i; });
    titleEl.textContent = uniq.length === 1 ? uniq[0] : "模考错题合集";
    var totalWrong = attempts.reduce(function (n, a) { return n + a.wrong.length; }, 0);
    metaEl.textContent = "共 " + totalWrong + " 道错题 · " + fmtDate(attempts[0].date);
    var retryId = attempts[0].id;
    var html = '<div class="wrong-detail-acts">' +
      '<a class="btn btn--ghost btn--sm" href="exam.html?id=' + encodeURIComponent(retryId) + '">再做本卷</a>' +
      '</div><div class="wrong-detail-list">';
    attempts.forEach(function (a) {
      a.wrong.forEach(function (w, idx) {
        html += itemCard(a, w, idx);
      });
    });
    html += "</div>";
    content.innerHTML = html;
    bindAi();
  }

  function load() {
    var attemptId = qs.get("attempt");
    var attemptsParam = qs.get("attempts");
    var itemId = qs.get("item");
    var itemsParam = qs.get("items");
    var local = qs.get("local") === "1";
    var suite = qs.get("suite");

    if (attemptId && AUTH && AUTH.fetchScoreAttempt) {
      AUTH.fetchScoreAttempt(attemptId).then(function (d) {
        renderAttempts(d.attempt ? [d.attempt] : []);
      }).catch(function (e) {
        content.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' +
          esc((e && e.message) || "请稍后重试") + "</p></div>";
      });
      return;
    }

    if (attemptsParam && AUTH && AUTH.fetchScoreAttempt) {
      var ids = attemptsParam.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      Promise.all(ids.map(function (id) {
        return AUTH.fetchScoreAttempt(id).then(function (d) { return d.attempt; }).catch(function () { return null; });
      })).then(function (list) {
        renderAttempts(list.filter(Boolean));
      });
      return;
    }

    if (itemsParam && local) {
      renderAttempts(itemsParam.split(",").map(function (id) {
        return localByItem(id.trim());
      }).filter(Boolean));
      return;
    }

    if (itemId) {
      if (local || !AUTH || !AUTH.getToken || !AUTH.getToken()) {
        renderAttempts([localByItem(itemId)].filter(Boolean));
        return;
      }
      AUTH.fetchScoreAttempts({ itemId: itemId, limit: 20 }).then(function (d) {
        var list = (d.attempts || []).filter(function (a) {
          return a.wrong && a.wrong.length;
        });
        if (list.length) renderAttempts([list[0]]);
        else renderAttempts([localByItem(itemId)].filter(Boolean));
      }).catch(function () {
        renderAttempts([localByItem(itemId)].filter(Boolean));
      });
      return;
    }

    if (suite && AUTH && AUTH.fetchScoreAttempts) {
      AUTH.fetchScoreAttempts({ limit: 80 }).then(function (d) {
        var base = suite.replace(/-reading$/, "").replace(/-writing$/, "");
        var list = (d.attempts || []).filter(function (a) {
          var id = String(a.id || "");
          return (id === base || id === base + "-reading") && a.wrong && a.wrong.length;
        }).slice(0, 4);
        renderAttempts(list);
      });
      return;
    }

    content.innerHTML = '<div class="state state--brand"><h3>缺少参数</h3>' +
      '<p>请从「我的成绩 · 错题记录」进入。</p>' +
      '<a class="btn btn--primary" href="results.html#tab=wrongs">返回</a></div>';
  }

  load();
})();
