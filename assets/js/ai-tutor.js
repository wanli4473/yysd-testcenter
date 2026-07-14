/* ai-tutor.js — AI 雅思老师 / 机经考官 */
(function () {
  "use strict";

  var A = window.YYSD_AUTH;
  if (!A || !A.requireLogin || !A.requireLogin()) return;

  var API_BASE = A.API_BASE;
  var mode = "teacher";
  var examMode = "practice";
  var sessionId = null;
  var examPack = null;
  var bank = null;
  var busy = false;
  var recorder = null;
  var chunks = [];
  var recStartedAt = 0;
  var mediaStream = null;
  var prepTimer = null;
  var prepLeft = 0;

  var elList = document.getElementById("session-list");
  var elMsgs = document.getElementById("messages");
  var elQuota = document.getElementById("quota-box");
  var elHint = document.getElementById("status-hint");
  var elInput = document.getElementById("input");
  var elExam = document.getElementById("exam-opts");
  var elPicker = document.getElementById("topic-picker");
  var elPrep = document.getElementById("prep-bar");
  var elMic = document.getElementById("btn-mic");
  var elSend = document.getElementById("btn-send");
  var elAdmin = document.getElementById("admin-upload");
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c];
    });
  }

  function hint(msg, kind) {
    elHint.textContent = msg || "";
    elHint.className = "ai-tutor__hint" + (kind ? " is-" + kind : "");
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || { "Content-Type": "application/json" };
    var t = A.getToken();
    if (t) headers.Authorization = "Bearer " + t;
    return fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.rawBody != null ? opts.rawBody : (opts.body != null ? JSON.stringify(opts.body) : undefined)
    }).then(function (r) {
      return r.text().then(function (text) {
        var d = null;
        try { d = text ? JSON.parse(text) : {}; } catch (e) {
          throw new Error("服务器返回异常（" + r.status + "）");
        }
        if (!r.ok) {
          var err = new Error((d && d.error) || "请求失败");
          err.quota = d && d.quota;
          throw err;
        }
        return d;
      });
    });
  }

  function renderQuota(q) {
    if (!q) { elQuota.textContent = "额度加载失败"; return; }
    elQuota.innerHTML =
      "今日剩余<br>" +
      "文字 <b>" + q.textLeft + "</b>/" + q.textLimit + " · " +
      "语音 <b>" + Math.floor(q.voiceSecLeft / 60) + ":" + String(q.voiceSecLeft % 60).padStart(2, "0") + "</b> · " +
      "模考 <b>" + q.fullMockLeft + "</b>/" + q.fullMockLimit;
  }

  function packCardHTML(pack) {
    if (!pack) return "";
    var p1 = (pack.part1 || []).map(function (t) { return t.topic; }).join("、");
    return '<div class="ai-pack"><b>本场考题 · ' + esc(pack.examMode === "mock" ? "机经模考" : "机经练习") + "</b>" +
      "Part 1：" + esc(p1) + "<br>Part 2：" + esc(pack.part2 && pack.part2.title) + "</div>";
  }

  function emptyState() {
    elMsgs.innerHTML =
      '<div class="ai-tutor__empty">' +
      (mode === "examiner"
        ? (examMode === "mock"
          ? "选择「机经模考」后点下方「开始模考」，系统将随机抽题，全程按真考流程进行。"
          : "在下方勾选 Part 1 话题与一道 Part 2，点「开始练习」。")
        : "点左侧「新建辅导」开始与老师对话；写作可直接粘贴作文。") +
      "</div>";
  }

  function scoreCardHTML(score) {
    if (!score) return "";
    return '<div class="ai-score">' +
      "<h3>口语评分 · Overall " + esc(score.overall) + "</h3>" +
      "<dl>" +
      "<dt>Fluency</dt><dd>" + esc(score.fluency) + "</dd>" +
      "<dt>Lexical</dt><dd>" + esc(score.lexical) + "</dd>" +
      "<dt>Grammar</dt><dd>" + esc(score.grammar) + "</dd>" +
      "<dt>Pronunciation</dt><dd>" + esc(score.pronunciation) + "</dd>" +
      "</dl>" +
      (score.comment ? "<p>" + esc(score.comment) + "</p>" : "") +
      "</div>";
  }

  function appendMsg(role, content, meta) {
    var empty = elMsgs.querySelector(".ai-tutor__empty");
    if (empty) empty.remove();
    var div = document.createElement("div");
    div.className = "ai-msg ai-msg--" + (role === "assistant" ? "assistant" : "user");
    var body = document.createElement("div");
    body.textContent = content;
    div.appendChild(body);
    if (role === "assistant" && content) {
      var actions = document.createElement("div");
      actions.className = "ai-msg__actions";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--ghost btn--sm";
      btn.textContent = "播放语音";
      btn.addEventListener("click", function () { playTts(content, btn); });
      actions.appendChild(btn);
      div.appendChild(actions);
      if (/one minute to prepare|You should say/i.test(content)) {
        elPrep.hidden = false;
      }
    }
    elMsgs.appendChild(div);
    if (meta && meta.score) {
      var wrap = document.createElement("div");
      wrap.innerHTML = scoreCardHTML(meta.score);
      if (wrap.firstChild) elMsgs.appendChild(wrap.firstChild);
    }
    elMsgs.scrollTop = elMsgs.scrollHeight;
  }

  function fallbackSpeak(text) {
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = /[\u4e00-\u9fff]/.test(text) ? "zh-CN" : "en-GB";
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function playTts(text, btn) {
    if (!text) return;
    if (btn) { btn.disabled = true; btn.textContent = "合成中…"; }
    api("/api/ai-tutor/tts", { method: "POST", body: { text: text.slice(0, 600) } })
      .then(function (d) {
        var audio = new Audio(d.url);
        audio.play().catch(function () { fallbackSpeak(text); });
      })
      .catch(function () { fallbackSpeak(text); })
      .then(function () {
        if (btn) { btn.disabled = false; btn.textContent = "播放语音"; }
      });
  }

  function renderSessions(sessions) {
    elList.innerHTML = "";
    if (!sessions || !sessions.length) {
      elList.innerHTML = '<li style="padding:8px;color:#5a6b7d;font-size:0.85rem">暂无历史</li>';
      return;
    }
    sessions.forEach(function (s) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = s.id === sessionId ? "is-active" : "";
      btn.innerHTML = "<span>" + esc(s.title || "会话") + '</span><span class="meta">' +
        esc((s.mode === "examiner" ? "考官" : "老师") + " · " + String(s.updated_at || "").slice(0, 16).replace("T", " ")) +
        "</span>";
      btn.addEventListener("click", function () { openSession(s.id); });
      li.appendChild(btn);
      elList.appendChild(li);
    });
  }

  function renderBankLists() {
    if (!bank) return;
    document.getElementById("bank-title").textContent = (bank.title || "机经题库") +
      (bank.source ? " · " + bank.source : "");
    var p1 = document.getElementById("part1-list");
    var p2 = document.getElementById("part2-list");
    p1.innerHTML = (bank.part1 || []).map(function (t) {
      return '<label><input type="checkbox" name="p1" value="' + esc(t.id) + '"> <span>' +
        esc(t.topic) + "（" + t.questionCount + "）</span></label>";
    }).join("");
    p2.innerHTML = (bank.part2 || []).map(function (t) {
      return '<label><input type="radio" name="p2" value="' + esc(t.id) + '"> <span>' +
        esc(t.title) + "</span></label>";
    }).join("");
  }

  function syncModeUI() {
    document.querySelectorAll(".ai-tutor__modes .chip").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-mode") === mode);
    });
    elExam.hidden = mode !== "examiner";
    document.querySelectorAll("[data-exam-mode]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-exam-mode") === examMode);
    });
    var showPicker = mode === "examiner" && !sessionId;
    elPicker.hidden = !showPicker;
    document.getElementById("btn-start-practice").hidden = !(showPicker && examMode === "practice");
    document.getElementById("btn-start-mock").hidden = !(showPicker && examMode === "mock");
    document.getElementById("part1-list").parentElement.hidden = examMode !== "practice";
    document.getElementById("part2-list").parentElement.hidden = examMode !== "practice";
    elPrep.hidden = !(mode === "examiner" && examPack);
    if (mode === "examiner" && showPicker && !bank) loadBank();
  }

  function loadQuota() {
    return api("/api/ai-tutor/quota").then(function (d) { renderQuota(d.quota); })
      .catch(function () { elQuota.textContent = "额度加载失败"; });
  }

  function loadSessions() {
    return api("/api/ai-tutor/sessions").then(function (d) {
      renderSessions(d.sessions || []);
    });
  }

  function loadBank() {
    return api("/api/ai-tutor/bank").then(function (d) {
      bank = d.bank;
      renderBankLists();
    }).catch(function (e) {
      hint(e.message || "题库加载失败", "error");
    });
  }

  function openSession(id) {
    if (busy) return Promise.resolve();
    sessionId = id;
    hint("");
    return api("/api/ai-tutor/sessions/" + encodeURIComponent(id)).then(function (d) {
      var s = d.session;
      mode = s.mode === "examiner" ? "examiner" : "teacher";
      examMode = s.exam_mode === "mock" ? "mock" : (s.exam_mode === "practice" ? "practice" : examMode);
      examPack = d.examPack || null;
      syncModeUI();
      elMsgs.innerHTML = "";
      if (examPack) {
        var wrap = document.createElement("div");
        wrap.innerHTML = packCardHTML(examPack);
        if (wrap.firstChild) elMsgs.appendChild(wrap.firstChild);
      }
      var msgs = d.messages || [];
      if (!msgs.length) emptyState();
      msgs.forEach(function (m) { appendMsg(m.role, m.content, m.meta); });
      return loadSessions();
    }).catch(function (e) {
      hint(e.message || "加载失败", "error");
    });
  }

  function createTeacherSession() {
    if (busy) return Promise.resolve();
    busy = true;
    hint("正在创建会话…");
    mode = "teacher";
    syncModeUI();
    return api("/api/ai-tutor/sessions", { method: "POST", body: { mode: "teacher" } })
      .then(function (d) {
        if (d.quota) renderQuota(d.quota);
        sessionId = d.session.id;
        examPack = null;
        elMsgs.innerHTML = "";
        if (d.opener) appendMsg("assistant", d.opener);
        else emptyState();
        hint("直接提问或粘贴作文即可。");
        syncModeUI();
        return loadSessions();
      }).catch(function (e) {
        if (e.quota) renderQuota(e.quota);
        hint(e.message || "创建失败", "error");
      }).then(function () { busy = false; });
  }

  function startExaminer(payload) {
    if (busy) return;
    busy = true;
    hint("正在组卷…");
    api("/api/ai-tutor/sessions", {
      method: "POST",
      body: Object.assign({ mode: "examiner" }, payload)
    }).then(function (d) {
      if (d.quota) renderQuota(d.quota);
      sessionId = d.session.id;
      examPack = d.examPack || null;
      elMsgs.innerHTML = "";
      if (examPack) {
        var wrap = document.createElement("div");
        wrap.innerHTML = packCardHTML(examPack);
        if (wrap.firstChild) elMsgs.appendChild(wrap.firstChild);
      }
      if (d.opener) appendMsg("assistant", d.opener);
      hint(examMode === "mock" ? "模考已开始，请用英文作答。" : "练习已开始，请用英文作答。");
      syncModeUI();
      elPrep.hidden = false;
      return loadSessions();
    }).catch(function (e) {
      if (e.quota) renderQuota(e.quota);
      hint(e.message || "开始失败", "error");
    }).then(function () { busy = false; });
  }

  function sendMessage(text, audioSec) {
    text = String(text || "").trim();
    if (!text || busy) return;
    if (!sessionId) {
      hint(mode === "examiner" ? "请先开始练习或模考" : "请先点「新建辅导」", "error");
      return;
    }
    busy = true;
    elSend.disabled = true;
    hint("思考中…");
    appendMsg("user", text);
    elInput.value = "";
    api("/api/ai-tutor/chat", {
      method: "POST",
      body: { sessionId: sessionId, content: text, audioSec: audioSec || 0 }
    }).then(function (d) {
      if (d.quota) renderQuota(d.quota);
      appendMsg("assistant", d.reply || "", d.score ? { score: d.score } : null);
      hint("");
      loadSessions();
      if (mode === "examiner" && d.reply) playTts(d.reply);
    }).catch(function (e) {
      if (e.quota) renderQuota(e.quota);
      hint(e.message || "发送失败", "error");
    }).then(function () {
      busy = false;
      elSend.disabled = false;
    });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  function stopRec() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function startRec() {
    if (busy || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      hint("当前浏览器不支持录音，请用文字输入", "error");
      return;
    }
    if (!sessionId) {
      hint("请先开始会话", "error");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      mediaStream = stream;
      chunks = [];
      var mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = function () {
        elMic.classList.remove("is-on");
        elMic.setAttribute("aria-pressed", "false");
        hint("识别中…");
        var sec = Math.max(1, Math.round((Date.now() - recStartedAt) / 1000));
        var blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (mediaStream) {
          mediaStream.getTracks().forEach(function (t) { t.stop(); });
          mediaStream = null;
        }
        blobToDataUrl(blob).then(function (dataUrl) {
          return api("/api/ai-tutor/asr", {
            method: "POST",
            body: { audio: dataUrl, audioSec: sec }
          }).then(function (d) {
            if (d.quota) renderQuota(d.quota);
            sendMessage(d.text, sec);
          });
        }).catch(function (e) {
          if (e.quota) renderQuota(e.quota);
          hint(e.message || "语音识别失败", "error");
        });
      };
      recorder.start();
      recStartedAt = Date.now();
      elMic.classList.add("is-on");
      elMic.setAttribute("aria-pressed", "true");
      hint("录音中…再点麦克风结束", "rec");
    }).catch(function () {
      hint("无法使用麦克风，请检查权限", "error");
    });
  }

  function formatPrep(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function startPrepCountdown() {
    if (prepTimer) clearInterval(prepTimer);
    prepLeft = 60;
    document.getElementById("prep-time").textContent = formatPrep(prepLeft);
    document.getElementById("btn-prep").disabled = true;
    hint("Part 2 准备中，可看题卡做笔记…", "rec");
    prepTimer = setInterval(function () {
      prepLeft -= 1;
      document.getElementById("prep-time").textContent = formatPrep(Math.max(0, prepLeft));
      if (prepLeft <= 0) {
        clearInterval(prepTimer);
        prepTimer = null;
        document.getElementById("btn-prep").disabled = false;
        hint("准备结束，请开始作答（1–2 分钟）。");
        sendMessage("I am ready to begin my Part 2 talk.", 0);
      }
    }, 1000);
  }

  document.querySelector(".ai-tutor__modes").addEventListener("click", function (e) {
    var b = e.target.closest("[data-mode]");
    if (!b) return;
    mode = b.getAttribute("data-mode");
    sessionId = null;
    examPack = null;
    elMsgs.innerHTML = "";
    emptyState();
    syncModeUI();
  });

  elExam.addEventListener("click", function (e) {
    var b = e.target.closest("[data-exam-mode]");
    if (!b) return;
    examMode = b.getAttribute("data-exam-mode");
    sessionId = null;
    examPack = null;
    elMsgs.innerHTML = "";
    emptyState();
    syncModeUI();
  });

  document.getElementById("btn-new").addEventListener("click", createTeacherSession);
  document.getElementById("btn-start-practice").addEventListener("click", function () {
    var p1 = Array.prototype.map.call(document.querySelectorAll('input[name="p1"]:checked'), function (el) {
      return el.value;
    });
    var p2el = document.querySelector('input[name="p2"]:checked');
    if (!p1.length) { hint("请至少选择 1 个 Part 1 话题", "error"); return; }
    if (!p2el) { hint("请选择 1 个 Part 2 话题", "error"); return; }
    startExaminer({ examMode: "practice", part1Ids: p1, part2Id: p2el.value });
  });
  document.getElementById("btn-start-mock").addEventListener("click", function () {
    startExaminer({ examMode: "mock" });
  });
  document.getElementById("btn-prep").addEventListener("click", startPrepCountdown);

  elSend.addEventListener("click", function () { sendMessage(elInput.value, 0); });
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(elInput.value, 0);
    }
  });
  elMic.addEventListener("click", function () {
    if (elMic.classList.contains("is-on")) stopRec();
    else startRec();
  });

  if (A.isAdmin && A.isAdmin()) elAdmin.hidden = false;
  else if (A.isTeacher && A.isTeacher()) elAdmin.hidden = false;

  document.getElementById("btn-upload-jiijing").addEventListener("click", function () {
    var file = document.getElementById("jiijing-file").files[0];
    var uh = document.getElementById("upload-hint");
    if (!file) { uh.textContent = "请先选择 PDF"; return; }
    uh.textContent = "上传解析中…";
    var fr = new FileReader();
    fr.onload = function () {
      api("/api/admin/jiijing/upload", {
        method: "POST",
        body: { pdfBase64: fr.result, title: file.name.replace(/\.pdf$/i, "") }
      }).then(function (d) {
        bank = d.bank;
        renderBankLists();
        uh.textContent = "已切换题库：" + (bank.title || bank.id) +
          "（P1 " + bank.part1.length + " / P2 " + bank.part2.length + "）";
      }).catch(function (e) {
        uh.textContent = e.message || "上传失败";
      });
    };
    fr.readAsDataURL(file);
  });

  syncModeUI();
  emptyState();
  Promise.all([loadQuota(), loadSessions()]).then(function () {
    return api("/api/ai-tutor/sessions").then(function (d) {
      renderSessions(d.sessions || []);
      // teacher default: reopen latest teacher chat if any; else stay empty
      var latest = (d.sessions || []).filter(function (s) { return s.mode === "teacher"; })[0];
      if (latest) return openSession(latest.id);
    });
  }).catch(function (e) {
    hint(e.message || "初始化失败", "error");
  });
})();
