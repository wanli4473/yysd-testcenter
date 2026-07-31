/* =========================================================================
   exam-cdt.js — IELTS CDT chrome for suite mock (exam.html?cdt=1)
   ponytail: footer nav is visual + best-effort iframe focus; deep paper sync later
   ========================================================================= */
(function () {
  "use strict";

  var state = {
    active: false,
    started: false,
    frameReady: false,
    item: null,
    frame: null,
    current: 0,
    total: 0,
    parts: [],
    review: {},
    answered: {},
    textSize: "standard",
    seconds: 0,
    onStart: null,
    gateStep: "confirm",
    audioCtx: null,
    paperBound: false,
    parentTimerStarted: false
  };

  var SIZE_MAP = {
    small: "14px",
    standard: "16px",
    large: "18px",
    "extra-large": "20px"
  };

  function $(id) { return document.getElementById(id); }

  function isWriting(item) {
    return item && item.subject === "cambridge-writing";
  }

  function isListening(item) {
    return item && item.subject === "cambridge-listening";
  }

  function isReading(item) {
    return item && item.subject === "cambridge-reading";
  }

  function suiteTitle(item) {
    var Y = window.YYSD;
    var vol = Y && Y.camVolume ? Y.camVolume(item) : "";
    var test = Y && Y.camTestNo ? Y.camTestNo(item) : "";
    if (vol && test) return "剑桥雅思真题" + vol + " - Test " + test;
    return (item && item.title) || "IELTS Mock Test";
  }

  function buildParts(item) {
    if (isWriting(item)) {
      return [
        { label: "Part 1", nums: [1] },
        { label: "Part 2", nums: [2] }
      ];
    }
    if (isReading(item)) {
      return [
        { label: "Part 1", nums: range(1, 13) },
        { label: "Part 2", nums: range(14, 26) },
        { label: "Part 3", nums: range(27, 40) }
      ];
    }
    return [
      { label: "Part 1", nums: range(1, 10) },
      { label: "Part 2", nums: range(11, 20) },
      { label: "Part 3", nums: range(21, 30) },
      { label: "Part 4", nums: range(31, 40) }
    ];
  }

  function range(a, b) {
    var out = [];
    for (var i = a; i <= b; i++) out.push(i);
    return out;
  }

  function flattenNums(parts) {
    var out = [];
    parts.forEach(function (p) {
      p.nums.forEach(function (n) { out.push(n); });
    });
    return out;
  }

  function candidateName() {
    try {
      var u = JSON.parse(localStorage.getItem("yysd:auth:user") || "null");
      if (u && (u.displayName || u.name)) return u.displayName || u.name;
    } catch (e) { /* ignore */ }
    return "Candidate";
  }

  function infoHtml(item) {
    if (isListening(item)) {
      return '<h2 class="cdt-gate__info-title">IELTS Listening</h2>' +
        '<p class="cdt-gate__info-time">Time: Approximately 32 minutes</p>' +
        '<div class="cdt-gate__info-h">Instructions to candidates</div>' +
        '<ul class="cdt-gate__info-list">' +
        "<li>Answer all the questions.</li>" +
        "<li>You can change your answers at any time during the test.</li>" +
        "</ul>" +
        '<div class="cdt-gate__info-h">Information for candidates</div>' +
        '<ul class="cdt-gate__info-list">' +
        "<li>There are 40 questions in this test.</li>" +
        "<li>Each question carries one mark.</li>" +
        "<li>There are four parts to the test.</li>" +
        "<li>You will hear each part once only.</li>" +
        "<li>The test clock will show you when there are 10 minutes and 5 minutes remaining.</li>" +
        "</ul>";
    }
    if (isReading(item)) {
      return '<h2 class="cdt-gate__info-title">IELTS Academic Reading</h2>' +
        '<p class="cdt-gate__info-time">Time: 1 hour</p>' +
        '<div class="cdt-gate__info-h">Instructions to candidates</div>' +
        '<ul class="cdt-gate__info-list">' +
        "<li>Answer all the questions.</li>" +
        "<li>You can change your answers at any time during the test.</li>" +
        "</ul>" +
        '<div class="cdt-gate__info-h">Information for candidates</div>' +
        '<ul class="cdt-gate__info-list">' +
        "<li>There are 40 questions in this test.</li>" +
        "<li>Each question carries one mark.</li>" +
        "<li>The test clock will show you when there are 10 minutes and 5 minutes remaining.</li>" +
        "</ul>";
    }
    return '<h2 class="cdt-gate__info-title">IELTS Academic Writing</h2>' +
      '<p class="cdt-gate__info-time">Time: 1 hour</p>' +
      '<div class="cdt-gate__info-h">Instructions to candidates</div>' +
      '<ul class="cdt-gate__info-list">' +
      "<li>Answer both tasks.</li>" +
      "<li>You can change your answers at any time during the test.</li>" +
      "</ul>" +
      '<div class="cdt-gate__info-h">Information for candidates</div>' +
      '<ul class="cdt-gate__info-list">' +
      "<li>There are two tasks in this test.</li>" +
      "<li>Task 2 contributes twice as much as Task 1 to the Writing score.</li>" +
      "<li>The test clock will show you when there are 10 minutes and 5 minutes remaining.</li>" +
      "</ul>";
  }

  function showGatePanel(step) {
    state.gateStep = step;
    var confirm = $("cdt-gate-confirm");
    var sound = $("cdt-gate-sound");
    var info = $("cdt-gate-info");
    if (confirm) confirm.hidden = step !== "confirm";
    if (sound) sound.hidden = step !== "sound";
    if (info) info.hidden = step !== "info";
  }

  function openGates() {
    document.body.classList.add("viewer--cdt-gating");
    var gate = $("cdt-gate");
    if (gate) gate.removeAttribute("hidden");
    var footer = $("cdt-footer");
    if (footer) footer.setAttribute("hidden", "");

    var nameEl = $("cdt-gate-name");
    if (nameEl) nameEl.textContent = candidateName();

    var infoBody = $("cdt-gate-info-body");
    if (infoBody) infoBody.innerHTML = infoHtml(state.item);

    showGatePanel("confirm");
    syncStartEnabled();
  }

  function closeGates() {
    document.body.classList.remove("viewer--cdt-gating");
    var gate = $("cdt-gate");
    if (gate) gate.setAttribute("hidden", "");
  }

  function syncStartEnabled() {
    var btn = $("cdt-gate-start");
    if (btn) btn.disabled = !state.frameReady;
  }

  function playTestSound() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!state.audioCtx) state.audioCtx = new Ctx();
      var ctx = state.audioCtx;
      if (ctx.state === "suspended") ctx.resume();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      var t0 = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    } catch (e) { /* ponytail: no WebAudio — skip */ }
  }

  function listeningPaperCss() {
    return [
      "body.yysd-cdt-listening{background:#d9e1ec!important}",
      "body.yysd-cdt-listening .test-topbar{display:none!important}",
      "body.yysd-cdt-listening .submit-btn{display:none!important}",
      "body.yysd-cdt-listening .listen-here{display:none!important}",
      "body.yysd-cdt-listening .audio-note{display:none!important}",
      "body.yysd-cdt-listening .sb-meta{display:none!important}",
      "body.yysd-cdt-listening .container{max-width:960px}",
      "body.yysd-cdt-listening .audio-bar{",
      "position:sticky;top:0;z-index:40;margin:0 0 14px;padding:8px 14px;",
      "background:#e8eef6;border:1px solid #b7c4d6;border-radius:0;box-shadow:none}",
      "body.yysd-cdt-listening .audio-play{",
      "width:34px;height:34px;font-size:14px;border-radius:50%;background:#4a90c2}",
      "body.yysd-cdt-listening #questionsHolder{",
      "background:#fff;border:1px solid #9aabbf;border-radius:2px;",
      "padding:18px 26px 28px;box-shadow:none}",
      "body.yysd-cdt-listening .section-banner{",
      "background:transparent;border:0;box-shadow:none;padding:14px 0 6px;margin:0}",
      "body.yysd-cdt-listening .sb-title{font-size:22px;font-weight:700;color:#111}",
      "body.yysd-cdt-listening .sb-top{justify-content:flex-start}",
      "body.yysd-cdt-listening .qgroup{margin:12px 0 22px}",
      "body.yysd-cdt-listening .qgroup h4{font-size:15px;font-weight:700;color:#111;margin:0 0 6px}",
      "body.yysd-cdt-listening .instruction{font-style:italic;color:#222;margin:0 0 12px}",
      "body.yysd-cdt-listening .qnum-badge{",
      "background:transparent;color:#111;border-radius:0;min-width:0;height:auto;",
      "padding:0 4px 0 0;font-size:15px;font-weight:700}",
      "body.yysd-cdt-listening input[type=text]{",
      "border:0!important;border-bottom:1.5px dotted #333!important;border-radius:0!important;",
      "background:transparent!important;box-shadow:none!important;min-width:110px;",
      "padding:2px 4px!important;font:700 15px/1.4 Arial,sans-serif!important}",
      "body.yysd-cdt-listening input[type=text]:focus{",
      "outline:none;border-bottom-color:#1a6fb5!important;background:#f3f8fd!important}",
      "body.yysd-cdt-listening .note-table th{background:#eef2f7;font-weight:700}",
      "body.yysd-cdt-listening .note-table td,body.yysd-cdt-listening .note-table th{",
      "border-color:#b0bccb;padding:8px 10px}"
    ].join("");
  }

  function readingPaperCss() {
    return [
      "html,body.yysd-cdt-reading{height:100%;margin:0;background:#d9e1ec!important;overflow:hidden}",
      "body.yysd-cdt-reading .header,body.yysd-cdt-reading .test-topbar,",
      "body.yysd-cdt-reading .submit-btn,body.yysd-cdt-reading .section-banner{display:none!important}",
      "body.yysd-cdt-reading #coverArea,body.yysd-cdt-reading #resultArea{display:none!important}",
      "body.yysd-cdt-reading #testArea.container{",
      "display:block!important;max-width:none!important;width:100%!important;height:100%!important;",
      "padding:0!important;margin:0!important}",
      "body.yysd-cdt-reading #questionsHolder{height:100%}",
      "body.yysd-cdt-reading .reading-cols{",
      "display:none;gap:0;height:100%;align-items:stretch;margin:0}",
      "body.yysd-cdt-reading .reading-cols.yysd-cdt-part-on{display:flex!important}",
      "body.yysd-cdt-reading .passage-pane,body.yysd-cdt-reading .qcol{",
      "flex:1 1 50%;min-width:0;max-height:none;height:100%;overflow:auto;",
      "position:static;border-radius:0;box-shadow:none;background:#fff;",
      "padding:20px 24px;border:0;border-right:1px solid #9aabbf}",
      "body.yysd-cdt-reading .qcol{border-right:0;background:#f7f9fc}",
      "body.yysd-cdt-reading .passage-pane .pp-kicker{",
      "font-size:12px;letter-spacing:1px;color:#555;font-weight:700}",
      "body.yysd-cdt-reading .passage-pane .ptitle{",
      "margin:6px 0 10px;font-size:20px;font-weight:700;color:#111}",
      "body.yysd-cdt-reading .passage-pane .pp-byline{color:#444;font-size:13px}",
      "body.yysd-cdt-reading .passage-pane p{",
      "margin:0 0 12px;font-size:15px;line-height:1.55;color:#111;text-align:justify}",
      "body.yysd-cdt-reading .passage-pane .para-label{color:#111;font-weight:800}",
      "body.yysd-cdt-reading .qgroup{",
      "background:transparent;border:0;border-radius:0;padding:8px 4px 18px;margin:0 0 8px;",
      "box-shadow:none}",
      "body.yysd-cdt-reading .qgroup h4{font-size:15px;font-weight:700;color:#111;margin:0 0 6px}",
      "body.yysd-cdt-reading .instruction{font-style:italic;color:#222;margin:0 0 12px}",
      "body.yysd-cdt-reading .qnum-badge{",
      "background:transparent;color:#111;border-radius:0;min-width:0;height:auto;",
      "padding:0 4px 0 0;font-size:15px;font-weight:700}",
      "body.yysd-cdt-reading input[type=text]{",
      "border:0!important;border-bottom:1.5px dotted #333!important;border-radius:0!important;",
      "background:transparent!important;box-shadow:none!important;min-width:110px;",
      "padding:2px 4px!important;font:700 15px/1.4 Arial,sans-serif!important}",
      "body.yysd-cdt-reading input[type=text]:focus{",
      "outline:none;border-bottom-color:#1a6fb5!important;background:#f3f8fd!important}",
      "body.yysd-cdt-reading .note-box{",
      "border:1px solid #b0bccb;border-radius:2px;background:#fff;padding:14px 16px}",
      "body.yysd-cdt-reading .note-table th{background:#eef2f7}",
      "body.yysd-cdt-reading .mcq label:hover{background:#e8eef6}"
    ].join("");
  }

  function writingPaperCss() {
    return [
      "html,body.yysd-cdt-writing{height:100%;margin:0;background:#d9e1ec!important;overflow:hidden}",
      "body.yysd-cdt-writing .header,body.yysd-cdt-writing .test-topbar,",
      "body.yysd-cdt-writing .submit-btn{display:none!important}",
      "body.yysd-cdt-writing #coverArea,body.yysd-cdt-writing #resultArea{display:none!important}",
      "body.yysd-cdt-writing #testArea.container{",
      "display:block!important;max-width:none!important;width:100%!important;height:100%!important;",
      "padding:0!important;margin:0!important}",
      "body.yysd-cdt-writing .task{",
      "display:none;height:100%;margin:0;padding:0;border:0;border-radius:0;background:transparent}",
      "body.yysd-cdt-writing .task.yysd-cdt-part-on{display:block!important}",
      "body.yysd-cdt-writing .yysd-cdt-wcols{",
      "display:flex;height:100%;align-items:stretch}",
      "body.yysd-cdt-writing .yysd-cdt-wprompt,body.yysd-cdt-writing .yysd-cdt-wanswer{",
      "flex:1 1 50%;min-width:0;height:100%;overflow:auto;padding:20px 24px}",
      "body.yysd-cdt-writing .yysd-cdt-wprompt{",
      "background:#fff;border-right:1px solid #9aabbf}",
      "body.yysd-cdt-writing .yysd-cdt-wanswer{",
      "background:#f7f9fc;display:flex;flex-direction:column}",
      "body.yysd-cdt-writing .task__head{margin:0 0 10px}",
      "body.yysd-cdt-writing .task__head h3{",
      "margin:0;font:700 18px/1.3 Arial,sans-serif;color:#111}",
      "body.yysd-cdt-writing .task__time{display:none!important}",
      "body.yysd-cdt-writing .prompt{",
      "margin:0 0 14px;padding:0;border:0;border-radius:0;background:transparent;",
      "font:15px/1.55 Arial,sans-serif;color:#111}",
      "body.yysd-cdt-writing .wtables{margin:0 0 8px}",
      "body.yysd-cdt-writing .wplan{",
      "border:0;border-radius:0;padding:0;background:transparent;text-align:left}",
      "body.yysd-cdt-writing .wplan figcaption{",
      "font:700 13px/1.4 Arial,sans-serif;color:#333;margin:0 0 8px}",
      "body.yysd-cdt-writing .wplan-img{max-width:100%;height:auto;border-radius:0}",
      "body.yysd-cdt-writing .yysd-cdt-wanswer textarea{",
      "flex:1 1 auto;min-height:0;width:100%;resize:none;border:1px solid #9aabbf;",
      "border-radius:2px;background:#fff;padding:14px 16px;",
      "font:15px/1.6 Arial,sans-serif;color:#111;box-shadow:none}",
      "body.yysd-cdt-writing .yysd-cdt-wanswer textarea:focus{",
      "outline:none;border-color:#1a6fb5;box-shadow:none}",
      "body.yysd-cdt-writing .wc{",
      "margin:10px 0 0;font:13px/1.4 Arial,sans-serif;color:#333;",
      "justify-content:flex-start;gap:12px}",
      "body.yysd-cdt-writing .wc .n{font-weight:700;font-size:14px;color:#111}",
      "body.yysd-cdt-writing .wc .n.low{color:#b42318}",
      "body.yysd-cdt-writing .wc .saved{display:none!important}"
    ].join("");
  }

  function ensureWritingSplit(doc) {
    if (!doc) return;
    var tasks = doc.querySelectorAll("#testArea .task");
    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];
      if (task.querySelector(".yysd-cdt-wcols")) continue;
      var ta = task.querySelector("textarea");
      var wc = task.querySelector(".wc");
      if (!ta) continue;
      var cols = doc.createElement("div");
      cols.className = "yysd-cdt-wcols";
      var left = doc.createElement("div");
      left.className = "yysd-cdt-wprompt";
      var right = doc.createElement("div");
      right.className = "yysd-cdt-wanswer";
      while (task.firstChild) {
        var ch = task.firstChild;
        if (ch === ta || ch === wc) right.appendChild(ch);
        else left.appendChild(ch);
      }
      cols.appendChild(left);
      cols.appendChild(right);
      task.appendChild(cols);
      // Word count label → CDT English
      if (wc) {
        var nEl = wc.querySelector(".n");
        var n = nEl ? nEl.textContent : "0";
        var id = nEl ? nEl.id : "";
        wc.innerHTML = 'Word count: <span class="n' +
          (nEl && /low/.test(nEl.className) ? " low" : "") + '"' +
          (id ? ' id="' + id + '"' : "") + ">" + n + "</span>";
      }
    }
  }

  function syncWritingPartView(partNo) {
    if (!isWriting(state.item)) return;
    try {
      var doc = state.frame && state.frame.contentDocument;
      if (!doc) return;
      var part = partNo === 2 ? 2 : 1;
      var tasks = doc.querySelectorAll("#testArea .task");
      for (var i = 0; i < tasks.length; i++) {
        var on = i + 1 === part;
        tasks[i].classList.toggle("yysd-cdt-part-on", on);
        tasks[i].style.display = on ? "block" : "none";
      }
    } catch (e) { /* ignore */ }
  }

  function applyCdtPaperSkin() {
    try {
      var doc = state.frame && state.frame.contentDocument;
      if (!doc || !doc.head || !doc.body) return;
      doc.body.classList.add("yysd-embedded");
      if (isListening(state.item)) doc.body.classList.add("yysd-cdt-listening");
      else if (isReading(state.item)) doc.body.classList.add("yysd-cdt-reading");
      else if (isWriting(state.item)) doc.body.classList.add("yysd-cdt-writing");

      var style = doc.getElementById("yysd-cdt-paper-css");
      if (!style) {
        style = doc.createElement("style");
        style.id = "yysd-cdt-paper-css";
        doc.head.appendChild(style);
      }
      style.textContent =
        "body.yysd-embedded > .header,body.yysd-embedded > header.header{display:none!important}" +
        "body.yysd-embedded .test-topbar .timer,body.yysd-embedded #timer.timer{display:none!important}" +
        "body.yysd-embedded #modeModal{display:none!important}" +
        "body.yysd-embedded{background:#d9e1ec!important}" +
        (isListening(state.item) ? listeningPaperCss() : "") +
        (isReading(state.item) ? readingPaperCss() : "") +
        (isWriting(state.item) ? writingPaperCss() : "");
      if (isWriting(state.item)) {
        ensureWritingSplit(doc);
        syncWritingPartView(state.current + 1);
      }
    } catch (e) { /* ignore */ }
  }

  function syncReadingPartView(qNo) {
    if (!isReading(state.item)) return;
    try {
      var doc = state.frame && state.frame.contentDocument;
      if (!doc) return;
      var part = 1;
      var el = controlForQuestion(doc, qNo);
      if (el) {
        var cols = el.closest(".reading-cols");
        if (cols) {
          var banner = cols.previousElementSibling;
          var id = banner && banner.id ? Number(String(banner.id).replace(/\D/g, "")) : 0;
          if (id) part = id;
          else {
            var all = doc.querySelectorAll(".reading-cols");
            for (var i = 0; i < all.length; i++) {
              if (all[i] === cols) { part = i + 1; break; }
            }
          }
        }
      } else {
        part = qNo <= 13 ? 1 : qNo <= 26 ? 2 : 3;
      }
      var banners = doc.querySelectorAll(".section-banner");
      for (var b = 0; b < banners.length; b++) {
        var ban = banners[b];
        var pid = Number(String(ban.id || "").replace(/\D/g, "")) || (b + 1);
        var on = pid === part;
        var pair = ban.nextElementSibling;
        if (pair && pair.classList.contains("reading-cols")) {
          pair.classList.toggle("yysd-cdt-part-on", on);
          pair.style.display = on ? "flex" : "none";
        }
      }
      // ponytail: if no banners matched, show first cols
      var shown = doc.querySelector(".reading-cols.yysd-cdt-part-on");
      if (!shown) {
        var first = doc.querySelector(".reading-cols");
        if (first) {
          first.classList.add("yysd-cdt-part-on");
          first.style.display = "flex";
        }
      }
    } catch (e) { /* ignore */ }
  }

  function autoplayListening() {
    if (!isListening(state.item)) return;
    // must stay on Start-test user gesture — setTimeout loses autoplay permission
    try {
      var win = state.frame && state.frame.contentWindow;
      if (!win) return;
      if (typeof win.loadSection === "function" && win.curAudioSec) {
        win.loadSection(win.curAudioSec, true);
        var playBtn = state.frame.contentDocument && state.frame.contentDocument.getElementById("aPlay");
        if (playBtn) playBtn.textContent = "⏸";
      } else if (win.player && win.player.play) {
        win.player.play().catch(function () { /* still blocked */ });
      }
    } catch (e) { /* ignore */ }
  }

  function controlForQuestion(doc, n) {
    if (!doc) return null;
    var byId = doc.getElementById("L" + n) || doc.getElementById("Q" + n);
    if (byId) return byId;
    var badges = doc.querySelectorAll(".qnum-badge");
    for (var i = 0; i < badges.length; i++) {
      if (String(badges[i].textContent || "").trim() !== String(n)) continue;
      var root = badges[i].closest(".mcq, .match-q, td, tr, .fill-row, .qgroup, div");
      if (!root) continue;
      var text = root.querySelector("input[type='text'], select");
      if (text) return text;
      var radio = root.querySelector("input[type='radio']");
      if (radio) return radio;
    }
    return null;
  }

  function isControlAnswered(el) {
    if (!el) return false;
    if (el.tagName === "SELECT") return !!el.value;
    if (el.type === "radio") {
      var group = el.form
        ? el.form.querySelectorAll('input[type="radio"][name="' + el.name + '"]')
        : el.ownerDocument.querySelectorAll('input[type="radio"][name="' + el.name + '"]');
      for (var i = 0; i < group.length; i++) if (group[i].checked) return true;
      return false;
    }
    return !!(el.value && String(el.value).trim());
  }

  function questionNoFromControl(el) {
    if (!el) return 0;
    var id = el.id || "";
    var m = id.match(/^[LQ](\d+)$/i);
    if (m) return Number(m[1]);
    var badge = null;
    var root = el.closest(".mcq, .match-q, td, .qgroup, div");
    if (root) badge = root.querySelector(".qnum-badge");
    if (badge) {
      var n = parseInt(String(badge.textContent || "").trim(), 10);
      if (n) return n;
    }
    return 0;
  }

  function writingControl(doc, n) {
    if (!doc) return null;
    return doc.getElementById(n === 2 ? "t2" : "t1");
  }

  function refreshAnsweredFlags() {
    try {
      var doc = state.frame && state.frame.contentDocument;
      if (!doc) return;
      for (var n = 1; n <= state.total; n++) {
        var el = isWriting(state.item) ? writingControl(doc, n) : controlForQuestion(doc, n);
        if (isControlAnswered(el)) state.answered[n] = true;
        else delete state.answered[n];
      }
    } catch (e) { /* ignore */ }
  }

  function bindPaperNav() {
    if (state.paperBound) return;
    if (!isListening(state.item) && !isReading(state.item) && !isWriting(state.item)) return;
    try {
      var doc = state.frame && state.frame.contentDocument;
      if (!doc || !doc.body) return;
      state.paperBound = true;
      doc.body.addEventListener("focusin", function (e) {
        if (isWriting(state.item)) {
          var id = e.target && e.target.id;
          if (id === "t1" || id === "t2") {
            state.current = id === "t2" ? 1 : 0;
            syncWritingPartView(state.current + 1);
            renderPages();
          }
          return;
        }
        var n = questionNoFromControl(e.target);
        if (!n) return;
        state.current = n - 1;
        syncReadingPartView(n);
        renderPages();
      });
      doc.body.addEventListener("input", function (e) {
        if (isWriting(state.item)) {
          var id = e.target && e.target.id;
          if (id !== "t1" && id !== "t2") return;
          var wn = id === "t2" ? 2 : 1;
          if (isControlAnswered(e.target)) state.answered[wn] = true;
          else delete state.answered[wn];
          state.current = wn - 1;
          syncWritingPartView(wn);
          renderPages();
          return;
        }
        var n = questionNoFromControl(e.target);
        if (!n) return;
        if (isControlAnswered(e.target)) state.answered[n] = true;
        else delete state.answered[n];
        state.current = n - 1;
        syncReadingPartView(n);
        renderPages();
      });
      doc.body.addEventListener("change", function (e) {
        if (isWriting(state.item)) return;
        var n = questionNoFromControl(e.target);
        if (!n) return;
        if (isControlAnswered(e.target)) state.answered[n] = true;
        else delete state.answered[n];
        state.current = n - 1;
        syncReadingPartView(n);
        renderPages();
      });
      refreshAnsweredFlags();
      syncReadingPartView(state.current + 1);
      syncWritingPartView(state.current + 1);
      renderPages();
    } catch (e) { /* ignore */ }
  }

  function beginIframeExam() {
    try {
      var win = state.frame && state.frame.contentWindow;
      if (!win || typeof win.startTest !== "function") return false;
      if (isWriting(state.item)) win.startTest();
      else win.startTest("exam");
      applyCdtPaperSkin();
      bindPaperNav();
      syncReadingPartView(state.current + 1);
      syncWritingPartView(state.current + 1);
      autoplayListening();
      return true;
    } catch (e) {
      return false;
    }
  }

  function startParentTimer() {
    if (state.parentTimerStarted) return;
    if (typeof state.onStart !== "function") return;
    state.parentTimerStarted = true;
    state.onStart(state.seconds);
  }

  function enterParentFullscreen() {
    // ponytail: must run in click stack; postMessage→setExamLock is too late for gesture
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      var el = document.documentElement;
      var fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (fn) fn.call(el).catch(function () {});
    } catch (e) { /* denied */ }
  }

  function startExamFromGate() {
    if (state.started) return;
    if (!state.frameReady) return;
    state.started = true;
    enterParentFullscreen();
    beginIframeExam();
    closeGates();
    var footer = $("cdt-footer");
    if (footer) footer.removeAttribute("hidden");
    refreshAnsweredFlags();
    renderPages();
    // ponytail: listening waits for iframe yysd:audio-ready / timer-sync (MP3 may still buffer)
    if (!isListening(state.item)) startParentTimer();
    applyTextSize(state.textSize);
    var vol = $("cdt-vol-range");
    if (vol && isListening(state.item)) setVolume(Number(vol.value));
  }

  function afterDetails() {
    enterParentFullscreen();
    if (isListening(state.item)) showGatePanel("sound");
    else showGatePanel("info");
  }

  function afterSound() {
    showGatePanel("info");
  }

  function renderPages() {
    var host = $("cdt-pages");
    if (!host) return;
    var html;
    if (isWriting(state.item)) {
      // CDT Writing: Part tabs, not 1–40 squares
      html = state.parts.map(function (p) {
        var n = p.nums[0];
        var idx = n - 1;
        var cls = "cdt-q cdt-q--part";
        if (idx === state.current) cls += " is-current";
        if (state.review[n]) cls += " is-review";
        if (state.answered[n]) cls += " is-answered";
        return '<div class="cdt-part"><div class="cdt-part__nums">' +
          '<button type="button" class="' + cls + '" data-q="' + n + '">' + p.label +
          "</button></div></div>";
      }).join("");
    } else {
      html = state.parts.map(function (p) {
        var nums = p.nums.map(function (n) {
          var idx = n - 1;
          var cls = "cdt-q";
          if (idx === state.current) cls += " is-current";
          if (state.review[n]) cls += " is-review";
          if (state.answered[n]) cls += " is-answered";
          return '<button type="button" class="' + cls + '" data-q="' + n + '">' + n + "</button>";
        }).join("");
        return '<div class="cdt-part"><span class="cdt-part__label">' + p.label +
          '</span><div class="cdt-part__nums">' + nums + "</div></div>";
      }).join("");
    }
    host.innerHTML = html;
    updateArrows();
    syncReviewCheckbox();
  }

  function updateArrows() {
    var prev = $("cdt-prev");
    var next = $("cdt-next");
    if (prev) prev.disabled = state.current <= 0;
    if (next) next.disabled = state.current >= state.total - 1;
  }

  function syncReviewCheckbox() {
    var cb = $("cdt-review");
    if (!cb) return;
    cb.checked = !!state.review[state.current + 1];
  }

  function setCurrent(idx) {
    if (!state.started || idx < 0 || idx >= state.total) return;
    state.current = idx;
    syncReadingPartView(idx + 1);
    syncWritingPartView(idx + 1);
    renderPages();
    focusFrameQuestion(idx);
  }

  function focusFrameQuestion(idx) {
    try {
      var doc = state.frame && state.frame.contentDocument;
      if (!doc) return;
      if (isWriting(state.item)) {
        syncWritingPartView(idx + 1);
        var ta = doc.getElementById(idx === 0 ? "t1" : "t2");
        if (ta) ta.focus();
        return;
      }
      var n = idx + 1;
      var el = controlForQuestion(doc, n);
      if (!el) {
        var inputs = doc.querySelectorAll(
          'input[type="text"], input.blank, input.qinput, select, textarea.blank'
        );
        el = inputs[idx];
      }
      if (el) {
        if (el.type === "radio") {
          var host = el.closest(".mcq, .match-q") || el;
          host.scrollIntoView({ block: "center", behavior: "smooth" });
        } else {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          el.focus();
        }
      }
    } catch (e) { /* ponytail: iframe not ready */ }
  }

  function applyTextSize(size) {
    state.textSize = size || "standard";
    try {
      var doc = state.frame && state.frame.contentDocument;
      if (doc && doc.documentElement) {
        doc.documentElement.style.fontSize = SIZE_MAP[state.textSize] || SIZE_MAP.standard;
      }
    } catch (e) { /* ignore */ }
  }

  function setVolume(v) {
    try {
      var doc = state.frame && state.frame.contentDocument;
      if (!doc) return;
      var audios = doc.querySelectorAll("audio");
      for (var i = 0; i < audios.length; i++) audios[i].volume = v;
    } catch (e) { /* ignore */ }
  }

  function showMask(id, on) {
    var el = $(id);
    if (!el) return;
    if (on) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

  function updateTimer(seconds) {
    var el = $("cdt-timer");
    if (!el || !state.active) return;
    if (seconds <= 0) {
      el.textContent = "0 minutes left";
      el.classList.add("is-danger");
      return;
    }
    var mins = Math.max(1, Math.ceil(seconds / 60));
    el.textContent = mins + (mins === 1 ? " minute left" : " minutes left");
    el.classList.toggle("is-low", seconds <= 300 && seconds > 60);
    el.classList.toggle("is-danger", seconds <= 60);
  }

  function finishSection() {
    var txt = $("cdt-finish-text");
    if (txt) {
      txt.textContent = suiteNextId(state.item)
        ? "You have selected to end this section of the test, click OK to progress to the next section or Cancel to return to the test. This function is not available in the real computer-delivered IELTS test."
        : "You have selected to end this test. Click OK to submit your Writing and view the three-skill report, or Cancel to return to the test.";
    }
    showMask("cdt-finish-mask", true);
  }

  function suiteNextId(item) {
    if (!item || !item.id) return "";
    if (item.subject === "cambridge-listening") return item.id + "-reading";
    if (item.subject === "cambridge-reading") {
      return String(item.id).replace(/-reading$/, "") + "-writing";
    }
    return "";
  }

  function suiteBaseId(item) {
    if (!item || !item.id) return "";
    return String(item.id).replace(/-reading$/, "").replace(/-writing$/, "");
  }

  function releaseLock() {
    if (window.YYSD_EXAM && typeof YYSD_EXAM.releaseLock === "function") {
      YYSD_EXAM.releaseLock();
    } else {
      document.body.classList.remove("is-exam-locked");
    }
  }

  function submitPaperThen(done) {
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      window.removeEventListener("message", onScore);
      done();
    }
    function afterScoreSynced() {
      // ponytail: exam.js registers first — its push already started when we see yysd:score
      var wait = (window.YYSD_EXAM && typeof YYSD_EXAM.waitScorePush === "function")
        ? YYSD_EXAM.waitScorePush(8000)
        : Promise.resolve(false);
      wait.then(function () { finish(); });
    }
    function onScore(e) {
      // ponytail: only accept score from the exam iframe
      if (state.frame && e.source !== state.frame.contentWindow) return;
      if (!e.data || e.data.type !== "yysd:score") return;
      afterScoreSynced();
    }
    window.addEventListener("message", onScore);
    try {
      var win = state.frame && state.frame.contentWindow;
      if (!win) { finish(); return; }
      // ponytail: CDT already confirmed — skip paper's second Chinese confirm
      if (typeof win.submitTest === "function") win.submitTest();
      else if (typeof win.finishTest === "function") win.finishTest();
      else if (typeof win.confirmFinish === "function") win.confirmFinish();
      else if (typeof win.confirmSubmit === "function") win.confirmSubmit();
      else win.postMessage({ type: "yysd:time-up" }, "*");
    } catch (e) { /* ignore */ }
    // ponytail: longer fallback if paper never posts score — still hop so student isn't stuck
    setTimeout(finish, 12000);
  }

  function eventQuery() {
    try {
      var e = new URLSearchParams(location.search).get("event");
      if (e && /^\d+$/.test(String(e))) return "&event=" + encodeURIComponent(e);
    } catch (err) { /* ignore */ }
    return "";
  }

  function confirmFinish() {
    showMask("cdt-finish-mask", false);
    var nextId = suiteNextId(state.item);
    var evQs = eventQuery();
    if (nextId) {
      // L→R / R→W — submit so scores land in yysd:results, then hop
      submitPaperThen(function () {
        releaseLock();
        (window.YYSD_GO || function (h) { location.href = h; })("exam.html?id=" + encodeURIComponent(nextId) + "&cdt=1" + evQs);
      });
      return;
    }
    // Writing end → independent 3-skill CDT report
    submitPaperThen(function () {
      releaseLock();
      var base = suiteBaseId(state.item);
      (window.YYSD_GO || function (h) { location.href = h; })("cdt-report.html?suite=" + encodeURIComponent(base || state.item.id) + evQs);
    });
  }

  function bindOnce() {
    if (bindOnce.done) return;
    bindOnce.done = true;

    var detailsOk = $("cdt-gate-details-ok");
    if (detailsOk) detailsOk.addEventListener("click", afterDetails);

    var playSound = $("cdt-gate-play-sound");
    if (playSound) playSound.addEventListener("click", playTestSound);

    var soundContinue = $("cdt-gate-sound-continue");
    if (soundContinue) soundContinue.addEventListener("click", afterSound);

    var startBtn = $("cdt-gate-start");
    if (startBtn) startBtn.addEventListener("click", startExamFromGate);

    var finish = $("cdt-finish");
    if (finish) finish.addEventListener("click", finishSection);

    var finishOk = $("cdt-finish-ok");
    if (finishOk) finishOk.addEventListener("click", confirmFinish);
    var finishCancel = $("cdt-finish-cancel");
    if (finishCancel) finishCancel.addEventListener("click", function () {
      showMask("cdt-finish-mask", false);
    });

    var hide = $("cdt-hide");
    if (hide) hide.addEventListener("click", function () {
      showMask("cdt-hide-screen", true);
    });
    var resume = $("cdt-resume");
    if (resume) resume.addEventListener("click", function () {
      showMask("cdt-hide-screen", false);
    });

    var setting = $("cdt-setting");
    if (setting) setting.addEventListener("click", function () {
      var radios = document.querySelectorAll('input[name="cdt-text-size"]');
      for (var i = 0; i < radios.length; i++) {
        radios[i].checked = radios[i].value === state.textSize;
      }
      showMask("cdt-setting-mask", true);
    });
    var settingOk = $("cdt-setting-ok");
    if (settingOk) settingOk.addEventListener("click", function () {
      var picked = document.querySelector('input[name="cdt-text-size"]:checked');
      applyTextSize(picked ? picked.value : "standard");
      showMask("cdt-setting-mask", false);
    });
    var settingX = $("cdt-setting-x");
    if (settingX) settingX.addEventListener("click", function () {
      showMask("cdt-setting-mask", false);
    });

    var help = $("cdt-help");
    if (help) help.addEventListener("click", function () {
      showMask("cdt-help-mask", true);
    });
    var helpX = $("cdt-help-x");
    if (helpX) helpX.addEventListener("click", function () {
      showMask("cdt-help-mask", false);
    });
    document.querySelectorAll(".cdt-help-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var key = tab.getAttribute("data-help");
        document.querySelectorAll(".cdt-help-tab").forEach(function (t) {
          t.classList.toggle("is-active", t === tab);
        });
        document.querySelectorAll(".cdt-help-panel").forEach(function (p) {
          if (p.getAttribute("data-help") === key) p.removeAttribute("hidden");
          else p.setAttribute("hidden", "");
        });
      });
    });

    var pages = $("cdt-pages");
    if (pages) pages.addEventListener("click", function (e) {
      var btn = e.target.closest(".cdt-q");
      if (!btn) return;
      setCurrent(Number(btn.getAttribute("data-q")) - 1);
    });

    var prev = $("cdt-prev");
    if (prev) prev.addEventListener("click", function () { setCurrent(state.current - 1); });
    var next = $("cdt-next");
    if (next) next.addEventListener("click", function () { setCurrent(state.current + 1); });

    var review = $("cdt-review");
    if (review) review.addEventListener("change", function () {
      var q = state.current + 1;
      if (review.checked) state.review[q] = true;
      else delete state.review[q];
      renderPages();
    });

    var vol = $("cdt-vol-range");
    if (vol) vol.addEventListener("input", function () {
      setVolume(Number(vol.value));
    });

    window.addEventListener("message", function (e) {
      if (!state.active || !state.frame || e.source !== state.frame.contentWindow) return;
      var d = e.data;
      if (!d || !state.started || !isListening(state.item)) return;
      if (d.type === "yysd:audio-ready" || d.type === "yysd:timer-sync") startParentTimer();
    });
  }

  function activate(opts) {
    opts = opts || {};
    state.active = true;
    state.started = false;
    state.frameReady = false;
    state.parentTimerStarted = false;
    state.item = opts.item;
    state.frame = opts.frame;
    state.seconds = opts.seconds || 0;
    state.onStart = opts.onStart || null;
    state.parts = buildParts(opts.item);
    state.total = flattenNums(state.parts).length;
    state.current = 0;
    state.review = {};
    state.answered = {};
    state.paperBound = false;

    document.body.classList.add("viewer--cdt");
    bindOnce();
    // ponytail: only drop leftover iframe :fullscreen (covers CDT chrome); keep parent FS
    try {
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl && String(fsEl.tagName || "").toUpperCase() === "IFRAME") {
        (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
      }
    } catch (e) { /* ignore */ }

    var header = $("cdt-header");
    if (header) header.removeAttribute("hidden");

    var title = $("cdt-title");
    if (title) title.textContent = suiteTitle(opts.item);

    var volWrap = $("cdt-vol");
    if (volWrap) {
      if (isListening(opts.item)) volWrap.removeAttribute("hidden");
      else volWrap.setAttribute("hidden", "");
    }

    updateTimer(state.seconds || 0);
    openGates();
  }

  function onFrameReady() {
    if (!state.active) return;
    state.frameReady = true;
    syncStartEnabled();
    applyTextSize(state.textSize);
    if (state.started) {
      applyCdtPaperSkin();
      bindPaperNav();
      var vol = $("cdt-vol-range");
      if (vol && isListening(state.item)) setVolume(Number(vol.value));
    }
  }

  window.YYSD_CDT = {
    activate: activate,
    updateTimer: updateTimer,
    onFrameReady: onFrameReady,
    isActive: function () { return state.active; },
    hasStarted: function () { return state.started; }
  };
})();
