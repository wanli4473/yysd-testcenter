/* speaking-common.js — shared store, API, report modal for 雅思口语专项练习 */
window.YYSD_SPEAKING = (function () {
  "use strict";

  var RECORDS_KEY = "yysd:speaking-records";
  var PENDING_KEY = "yysd:speaking-pending";
  var PART1_LIMIT_SEC = 270;

  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? (location.protocol + "//" + location.hostname + ":3000")
    : "https://api.youyisida.com";

  function apiUnavailableMsg() {
    return (location.hostname === "localhost" || location.hostname === "127.0.0.1")
      ? "未连接 AI 服务，请运行 ./scripts/start-local-ai.sh 启动 API（端口 3000）"
      : "AI 服务暂不可用，请稍后再试";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function uuid() {
    return "spk-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function loadRecords() {
    try { return JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]"); }
    catch (e) { return []; }
  }

  function saveRecord(rec) {
    var list = loadRecords();
    list.unshift(rec);
    if (list.length > 100) list.length = 100;
    try { localStorage.setItem(RECORDS_KEY, JSON.stringify(list)); } catch (e) {}
    return rec;
  }

  function getRecord(id) {
    return loadRecords().find(function (r) { return r.id === id; }) || null;
  }

  function stats() {
    var list = loadRecords();
    var scores = list.map(function (r) { return r.overallBand; }).filter(function (n) { return typeof n === "number"; });
    var avg = scores.length ? scores.reduce(function (a, b) { return a + b; }, 0) / scores.length : 0;
    var high = scores.length ? Math.max.apply(null, scores) : 0;
    return {
      practiceCount: list.length,
      averageScore: Math.round(avg * 10) / 10,
      highestScore: high
    };
  }

  function setPending(data) {
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function getPending() {
    try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); }
    catch (e) { return null; }
  }

  function clearPending() {
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
  }

  function speak(text, onEnd) {
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (onEnd) onEnd();
    }
    // ponytail: Chrome often never fires onend without user gesture — always use timeout fallback
    var maxMs = Math.min(15000, Math.max(4000, String(text || "").length * 70));
    var timer = setTimeout(function () {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      finish();
    }, maxMs);
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB";
      u.rate = 0.92;
      u.onend = function () { clearTimeout(timer); finish(); };
      u.onerror = function () { clearTimeout(timer); finish(); };
      window.speechSynthesis.speak(u);
    } catch (e) {
      clearTimeout(timer);
      finish();
    }
  }

  var aiReady = null;

  function probeAi() {
    if (!API_BASE) {
      aiReady = false;
      return Promise.resolve({ ok: false, ai: false });
    }
    return fetch(API_BASE + "/api/health", { method: "GET" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        aiReady = !!(d && d.ok && d.ai);
        return { ok: !!(d && d.ok), ai: aiReady };
      })
      .catch(function () {
        aiReady = false;
        return { ok: false, ai: false };
      });
  }

  function mountAiBanner(el) {
    if (!el) return probeAi();
    el.textContent = "正在连接 AI 服务…";
    el.className = "spk-ai-banner spk-ai-banner--wait";
    return probeAi().then(function (r) {
      if (r.ok && r.ai) {
        el.textContent = "✓ AI 已连接，练习中将自动调用智能评分";
        el.className = "spk-ai-banner spk-ai-banner--ok";
      } else if (!API_BASE) {
        el.textContent = apiUnavailableMsg();
        el.className = "spk-ai-banner spk-ai-banner--err";
      } else {
        el.textContent = "AI 连接失败，请检查网络后刷新页面";
        el.className = "spk-ai-banner spk-ai-banner--err";
      }
      return r;
    });
  }

  function isAiReady() { return aiReady === true; }

  function apiHeaders() {
    var h = { "Content-Type": "application/json" };
    try {
      var t = localStorage.getItem("yysd:auth:token") || localStorage.getItem("yysd:teacher:token") || "";
      if (t) h.Authorization = "Bearer " + t;
    } catch (e) {}
    return h;
  }

  function grade(part, topics, answers) {
    if (!API_BASE) return Promise.reject(new Error(apiUnavailableMsg()));
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 90000);
    return fetch(API_BASE + "/api/speaking/grade", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ part: part, topics: topics, answers: answers }),
      signal: ctrl.signal
    }).then(function (r) {
      return r.text().then(function (text) {
        var d = null;
        try { d = text ? JSON.parse(text) : {}; } catch (e) {
          throw new Error("评分失败（" + r.status + "）— 请稍后重试");
        }
        if (r.status === 401) throw new Error("请先登录后再使用 AI 评分");
        if (!r.ok) {
          var msg = (d && d.error) || ("评分失败（" + r.status + "）");
          if (/上限|用完|额度/i.test(msg) && !/明日/.test(msg)) msg = msg.replace(/[。！!]?$/, "") + "，明日再来";
          else if (/失败|稍后|502|503|解析/.test(msg)) msg = msg.replace(/[。！!]?$/, "") + " — 请稍后重试";
          throw new Error(msg);
        }
        if (d.error) throw new Error(d.error);
        if (!d.ok || !d.report) throw new Error("评分返回无效，请稍后重试");
        return d.report;
      });
    })
      .finally(function () { clearTimeout(timer); });
  }

  function criteriaLabel(key) {
    var map = {
      fluencyAndCoherence: "流利度与连贯性",
      lexicalResource: "词汇资源",
      grammaticalRangeAndAccuracy: "语法与准确性",
      pronunciation: "发音"
    };
    return map[key] || key;
  }

  function bandLabel(band) {
    if (band >= 7) return "Good User";
    if (band >= 6) return "Competent User";
    if (band >= 5) return "Modest User";
    return "Limited User";
  }

  function renderReportHTML(rec) {
    var ds = rec.detailedScores || {};
    var critKeys = ["fluencyAndCoherence", "lexicalResource", "grammaticalRangeAndAccuracy", "pronunciation"];
    var critCards = critKeys.map(function (k) {
      var v = ds[k] != null ? ds[k] : "—";
      return '<div class="spk-crit"><span class="spk-crit__label">' + esc(criteriaLabel(k)) + "</span>" +
        '<span class="spk-crit__score">' + esc(String(v)) + " / 9</span></div>";
    }).join("");

    var strengths = (rec.strengths || []).map(function (s) {
      return "<li>" + esc(s) + "</li>";
    }).join("");
    var weaknesses = (rec.weaknesses || []).map(function (s, i) {
      return "<li><span class=\"spk-num\">" + (i + 1) + "</span> " + esc(s) + "</li>";
    }).join("");
    var advice = (rec.generalAdvice || []).map(function (s) {
      return "<li>" + esc(s) + "</li>";
    }).join("");

    var qfb = (rec.questionFeedbacks || []).map(function (q, i) {
      return '<div class="spk-qfb">' +
        '<p class="spk-qfb__q"><b>Q' + (i + 1) + ".</b> " + esc(q.question) + "</p>" +
        '<p class="spk-qfb__a"><span>你的回答</span> ' + esc(q.answer || "—") + "</p>" +
        (q.fixed ? '<p class="spk-qfb__fix"><span>修正</span> ' + esc(q.fixed) + "</p>" : "") +
        (q.feedback ? '<p class="spk-qfb__fb">' + esc(q.feedback) + "</p>" : "") +
        "</div>";
    }).join("");

    return '<div class="spk-report">' +
      '<div class="spk-report__hero">' +
        '<div class="spk-report__band"><span class="spk-report__num">' + esc(String(rec.overallBand)) + '</span><span class="spk-report__of">/ 9.0</span></div>' +
        '<div class="spk-report__meta"><b>' + esc(bandLabel(rec.overallBand)) + "</b>" +
          "<p>口语专项练习 · " + esc((rec.topics || []).join(" · ")) + "</p></div>" +
      "</div>" +
      '<div class="spk-report__crits">' + critCards + "</div>" +
      (strengths ? '<div class="spk-box spk-box--ok"><h4>表现亮点</h4><ul>' + strengths + "</ul></div>" : "") +
      (weaknesses ? '<div class="spk-box spk-box--warn"><h4>改进方向</h4><ul>' + weaknesses + "</ul></div>" : "") +
      (advice ? '<div class="spk-box spk-box--tip"><h4>学习建议</h4><ul>' + advice + "</ul></div>" : "") +
      (qfb ? '<div class="spk-qfb-list"><h4>逐题反馈</h4>' + qfb + "</div>" : "") +
      "</div>";
  }

  function openReportModal(rec) {
    var overlay = document.createElement("div");
    overlay.className = "spk-modal-overlay";
    overlay.innerHTML =
      '<div class="spk-modal" role="dialog" aria-modal="true">' +
        '<button type="button" class="spk-modal__close" aria-label="关闭">×</button>' +
        renderReportHTML(rec) +
      "</div>";
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    function close() {
      overlay.remove();
      document.body.style.overflow = "";
    }
    overlay.querySelector(".spk-modal__close").onclick = close;
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    return close;
  }

  function buildPart1Queue(fixedTopic, selectedTopics) {
    var queue = [];
    fixedTopic.questions.forEach(function (q, i) {
      queue.push({
        topicId: "fixed",
        topicTitle: fixedTopic.topic,
        opener: i === 0 ? fixedTopic.title : null,
        question: q
      });
    });
    selectedTopics.forEach(function (topic) {
      topic.questions.forEach(function (q, i) {
        queue.push({
          topicId: topic.id,
          topicTitle: topic.topic,
          opener: i === 0 ? topic.title : null,
          question: q
        });
      });
    });
    return queue;
  }

  return {
    API_BASE: API_BASE,
    PART1_LIMIT_SEC: PART1_LIMIT_SEC,
    esc: esc,
    uuid: uuid,
    loadRecords: loadRecords,
    saveRecord: saveRecord,
    getRecord: getRecord,
    stats: stats,
    setPending: setPending,
    getPending: getPending,
    clearPending: clearPending,
    speak: speak,
    probeAi: probeAi,
    mountAiBanner: mountAiBanner,
    isAiReady: isAiReady,
    grade: grade,
    renderReportHTML: renderReportHTML,
    openReportModal: openReportModal,
    buildPart1Queue: buildPart1Queue,
    criteriaLabel: criteriaLabel,
    bandLabel: bandLabel
  };
})();
