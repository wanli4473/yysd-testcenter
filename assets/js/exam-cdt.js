/* =========================================================================
   exam-cdt.js — IELTS CDT chrome (exam.html?cdt=1)
   B1: one shell, pack=drill|exam; suite=1 hops L→R→W
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
    bgColor: "white",
    seconds: 0,
    onStart: null,
    gateStep: "pack",
    pack: "", // drill | exam
    suite: false,
    resumeDraft: false,
    drillSections: null, // number[] | null = all (exam / writing / resume)
    autoStartAssigned: false,
    audioCtx: null,
    paperBound: false,
    parentTimerStarted: false,
    hopping: false,
    timeUpHop: false,
    listeningPhase: "" // "" | "audio" | "review"
  };

  var LISTEN_REVIEW_SECS = 120;

  /** Pure hop matrix — also used by ?cdtCheck=1 self-check */
  function resolveAfterSubmit(pack, suite, item) {
    if (pack === "drill") return { action: "review" };
    if (suite) {
      var next = suiteNextId(item);
      if (next) return { action: "hop", id: next };
      return { action: "report", suite: suiteBaseId(item) };
    }
    return { action: "review" };
  }

  var BG_MAP = {
    white: "#ffffff",
    cream: "#f7f1e3",
    blue: "#e7eef8"
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
    // B5/C18: in-exam chrome English only
    if (vol && test) return "Cambridge IELTS " + vol + " · Test " + test;
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
        "<li>At the end of the test you will have two minutes to check your answers.</li>" +
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
    var map = {
      pack: "cdt-gate-pack",
      resume: "cdt-gate-resume",
      sections: "cdt-gate-sections",
      confirm: "cdt-gate-confirm",
      sound: "cdt-gate-sound",
      info: "cdt-gate-info"
    };
    var onId = map[step] || "";
    Object.keys(map).forEach(function (k) {
      var el = $(map[k]);
      if (!el) return;
      if (map[k] === onId) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
  }

  /** Listening sections / reading passages from iframe TEST, else Part count */
  function discoverDrillParts() {
    var reading = isReading(state.item);
    var fallbackN = reading ? 3 : 4;
    var label = reading ? "Passage" : "Section";
    try {
      var win = state.frame && state.frame.contentWindow;
      var test = win && win.TEST;
      var list = test && (reading ? test.passages : test.sections);
      if (list && list.length) {
        return list.map(function (s) {
          return { id: +s.id, label: label + " " + s.id };
        });
      }
    } catch (e) { /* ignore */ }
    var out = [];
    for (var i = 1; i <= fallbackN; i++) out.push({ id: i, label: label + " " + i });
    return out;
  }

  function urlAssignPart() {
    try {
      return Number(new URLSearchParams(location.search).get("assignPart") || 0) || 0;
    } catch (e) { return 0; }
  }

  function assignedPartNum() {
    return urlAssignPart() || (state.item && state.item.partNum) || 0;
  }

  function assignedQRange() {
    var it = state.item || {};
    var from = Number(it.qFrom || 0);
    var to = Number(it.qTo || 0);
    if (from && to) return { from: from, to: to };
    try {
      var qs = new URLSearchParams(location.search);
      from = Number(qs.get("qFrom") || 0);
      to = Number(qs.get("qTo") || 0);
    } catch (e) { return null; }
    return (from && to) ? { from: from, to: to } : null;
  }

  // ponytail: student calendar homework (?event=) + drill slice; self-study / teacher try has no event
  function isAssignedStudentDrill() {
    try {
      if (!(new URLSearchParams(location.search).get("event") || "").replace(/\D/g, "")) return false;
    } catch (e) { return false; }
    if (state.pack !== "drill") return false;
    if (isWriting(state.item)) return false;
    return assignedPartNum() > 0;
  }

  function lockAssignedDrillSlice() {
    var part = assignedPartNum();
    if (part) state.drillSections = [part];
  }

  function skipAssignedGatesToStart() {
    if (state.started) return;
    var gate = $("cdt-gate");
    if (gate) gate.setAttribute("hidden", "");
    document.body.classList.remove("viewer--cdt-gating");
    if (state.frameReady) startExamFromGate();
    else state.autoStartAssigned = true;
  }

  function populateSectionsPanel() {
    var host = $("cdt-gate-sec-list");
    if (!host) return;
    var parts = discoverDrillParts();
    var prefer = urlAssignPart();
    var lead = $("cdt-gate-sections-lead");
    var lab = $("cdt-gate-sec-label");
    if (isReading(state.item)) {
      if (lead) lead.textContent = "适合分项突破，可只练某几篇文章；正向计时不施加额外压力。";
      if (lab) lab.textContent = "选择练习文章：";
    } else {
      if (lead) lead.textContent = "适合分项突破，可只练某几个部分；正向计时不施加额外压力。";
      if (lab) lab.textContent = "选择练习部分：";
    }
    host.innerHTML = parts.map(function (p) {
      var on = !prefer || prefer === p.id;
      return '<label><input type="checkbox" class="cdt-gate-secbox" value="' + p.id + '"' +
        (on ? " checked" : "") + "> " + p.label + "</label>";
    }).join("");
    syncSecToggleLabel();
    var err = $("cdt-gate-sec-err");
    if (err) err.setAttribute("hidden", "");
  }

  function syncSecToggleLabel() {
    var boxes = document.querySelectorAll(".cdt-gate-secbox");
    var btn = $("cdt-gate-sec-toggle");
    if (!btn || !boxes.length) return;
    var allOn = true;
    for (var i = 0; i < boxes.length; i++) {
      if (!boxes[i].checked) { allOn = false; break; }
    }
    btn.textContent = allOn ? "取消全选" : "全选";
  }

  function selectedGateSections() {
    var ids = [];
    document.querySelectorAll(".cdt-gate-secbox:checked").forEach(function (cb) {
      ids.push(+cb.value);
    });
    return ids;
  }

  function showSectionsGate() {
    if (isWriting(state.item)) {
      state.drillSections = null;
      enterDrillGates();
      return;
    }
    populateSectionsPanel();
    showGatePanel("sections");
  }

  function confirmSectionsGate() {
    var ids = selectedGateSections();
    var err = $("cdt-gate-sec-err");
    if (!ids.length) {
      if (err) err.removeAttribute("hidden");
      return;
    }
    if (err) err.setAttribute("hidden", "");
    state.drillSections = ids;
    enterDrillGates();
  }

  /** Footer Parts follow selected sections (Q numbers stay absolute) */
  function applyDrillPartsFilter() {
    if (state.pack !== "drill" || !state.drillSections || !state.drillSections.length) return;
    if (isWriting(state.item)) return;
    var ids = state.drillSections;
    state.parts = buildParts(state.item).filter(function (p, idx) {
      return ids.indexOf(idx + 1) !== -1;
    });
    var q = assignedQRange();
    if (q) {
      state.parts = state.parts.map(function (p) {
        return { label: p.label, nums: p.nums.filter(function (n) { return n >= q.from && n <= q.to; }) };
      }).filter(function (p) { return p.nums.length; });
    }
    if (!state.parts.length) state.parts = buildParts(state.item);
    state.total = flattenNums(state.parts).length;
    state.current = 0;
  }

  function draftAnswerCount(item) {
    if (!item || !item.id) return 0;
    try {
      var d = JSON.parse(localStorage.getItem("yysd:draft:" + item.id) || "null");
      if (!d || d.mode === "exam") return 0;
      var a = d.answers || {};
      var n = 0;
      Object.keys(a).forEach(function (k) {
        if (a[k] != null && String(a[k]).trim() !== "") n++;
      });
      if (!n && (d.writingTask1 || d.writingTask2)) n = 1;
      return n;
    } catch (e) { return 0; }
  }

  function writingDraftExists(item) {
    if (!item || !item.id) return false;
    try {
      if (localStorage.getItem(item.id + "-draft")) return true;
    } catch (e) { /* ignore */ }
    return draftAnswerCount(item) > 0;
  }

  function syncPackToUrl() {
    try {
      var u = new URL(location.href);
      if (state.pack) u.searchParams.set("pack", state.pack);
      if (state.suite) u.searchParams.set("suite", "1");
      else u.searchParams.delete("suite");
      u.searchParams.set("cdt", "1");
      u.searchParams.delete("pick");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch (e) { /* ignore */ }
  }

  function proceedAfterPack() {
    syncPackToUrl();
    if (state.pack === "drill") {
      var has = isWriting(state.item) ? writingDraftExists(state.item) : draftAnswerCount(state.item) > 0;
      if (has) {
        var t = $("cdt-gate-resume-text");
        var n = draftAnswerCount(state.item);
        if (t) {
          t.textContent = n
            ? ("Saved progress found (" + n + " answered). Continue or start over?")
            : "A saved draft was found for this paper. Continue or start over?";
        }
        showGatePanel("resume");
        return;
      }
      if (isAssignedStudentDrill()) {
        lockAssignedDrillSlice();
        skipAssignedGatesToStart();
        return;
      }
      showSectionsGate();
      return;
    }
    state.drillSections = null;
    showGatePanel("confirm");
  }

  function enterDrillGates() {
    if (isListening(state.item)) showGatePanel("sound");
    else showGatePanel("info");
  }

  function clearDrillDraft() {
    var id = state.item && state.item.id;
    if (!id) return;
    try { localStorage.removeItem("yysd:draft:" + id); } catch (e) { /* ignore */ }
    try { localStorage.removeItem(id + "-draft"); } catch (e2) { /* ignore */ }
    state.resumeDraft = false;
  }

  function openGates() {
    document.body.classList.add("viewer--cdt-gating");
    document.body.classList.remove("viewer--after-cdt");
    var gate = $("cdt-gate");
    if (gate) gate.removeAttribute("hidden");
    var footer = $("cdt-footer");
    if (footer) footer.setAttribute("hidden", "");

    var nameEl = $("cdt-gate-name");
    if (nameEl) nameEl.textContent = candidateName();

    var infoBody = $("cdt-gate-info-body");
    if (infoBody) infoBody.innerHTML = infoHtml(state.item);

    if (!state.pack) showGatePanel("pack");
    else proceedAfterPack();
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
      "body.yysd-cdt-listening #coverArea,body.yysd-cdt-listening #modeModal,",
      "body.yysd-cdt-listening #resultArea{display:none!important}",
      "body.yysd-cdt-listening #testArea{display:block!important}",
      "body.yysd-cdt-listening .test-topbar{display:none!important}",
      "body.yysd-cdt-listening .submit-btn{display:none!important}",
      "body.yysd-cdt-listening .listen-here{display:none!important}",
      "body.yysd-cdt-listening .audio-note{display:none!important}",
      "body.yysd-cdt-listening .sb-meta{display:none!important}",
      "body.yysd-cdt-listening .container{max-width:960px}",
      "body.yysd-cdt-listening .audio-bar{",
      "position:sticky;top:0;z-index:40;margin:0 0 14px;padding:8px 14px;",
      "background:#e8eef6;border:1px solid #b7c4d6;border-radius:0;box-shadow:none}",
      "body.yysd-cdt-listening.yysd-cdt-listen-locked #aProg{",
      "pointer-events:none!important;cursor:default;opacity:.85}",
      "body.yysd-cdt-listening.yysd-cdt-listen-locked .audio-play{",
      "pointer-events:none!important;opacity:.5;cursor:default}",
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
      "border-color:#b0bccb;padding:8px 10px}",
      "body.yysd-cdt-listening .map-wrap{margin:8px 0 18px;padding:10px 8px 14px}",
      "body.yysd-cdt-listening .map-img{width:100%;max-width:920px;height:auto;margin:0 auto;display:block;cursor:zoom-in}",
      "body.yysd-cdt-listening .map-wrap.is-zoom .map-img{max-width:none;width:min(1400px,96vw);cursor:zoom-out}",
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
      "padding:20px 24px;border:0;border-right:0}",
      "body.yysd-cdt-reading .qcol{background:#f7f9fc}",
      "body.yysd-cdt-reading .yysd-cdt-split{",
      "flex:0 0 5px;cursor:col-resize;background:#c5d0de;align-self:stretch}",
      "body.yysd-cdt-reading .yysd-cdt-split:hover,body.yysd-cdt-reading .yysd-cdt-split.is-drag{",
      "background:#7a90a8}",
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
      // B5/C18: English placeholder (papers ship Chinese)
      if (i === 0) {
        ta.placeholder = "Write your answer for Task 1 here (at least 150 words).";
      } else {
        ta.placeholder = "Write your answer for Task 2 here (at least 250 words).";
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
        // B4: real CDT writing has no spellcheck
        doc.querySelectorAll("textarea").forEach(function (ta) {
          ta.setAttribute("spellcheck", "false");
          ta.spellcheck = false;
          ta.setAttribute("autocapitalize", "off");
          ta.setAttribute("autocorrect", "off");
        });
      }
      if (isReading(state.item)) installReadingSplitter(doc);
      applyBgColor(state.bgColor);
    } catch (e) { /* ignore */ }
  }

  function installReadingSplitter(doc) {
    if (!doc) return;
    var colsList = doc.querySelectorAll(".reading-cols");
    for (var i = 0; i < colsList.length; i++) {
      var col = colsList[i];
      if (col.querySelector(".yysd-cdt-split")) continue;
      var left = col.querySelector(".passage-pane, .pcol");
      var right = col.querySelector(".qcol");
      if (!left || !right) continue;
      var split = doc.createElement("div");
      split.className = "yysd-cdt-split";
      split.setAttribute("role", "separator");
      split.setAttribute("aria-orientation", "vertical");
      split.title = "Drag to resize";
      col.insertBefore(split, right);
      (function (colEl, leftEl, rightEl, handle) {
        var dragging = false;
        handle.addEventListener("mousedown", function (e) {
          dragging = true;
          handle.classList.add("is-drag");
          e.preventDefault();
        });
        doc.addEventListener("mousemove", function (e) {
          if (!dragging) return;
          var rect = colEl.getBoundingClientRect();
          if (!rect.width) return;
          var pct = Math.min(72, Math.max(28, ((e.clientX - rect.left) / rect.width) * 100));
          leftEl.style.flex = "0 0 " + pct + "%";
          rightEl.style.flex = "1 1 0";
        });
        doc.addEventListener("mouseup", function () {
          if (!dragging) return;
          dragging = false;
          handle.classList.remove("is-drag");
        });
      })(col, left, right, split);
    }
  }

  function pinReadingDocScroll(doc) {
    // ponytail: scrollIntoView leaks onto documentElement → Part 2/3 looks blank
    if (!doc) return;
    if (doc.documentElement) doc.documentElement.scrollTop = 0;
    if (doc.body) doc.body.scrollTop = 0;
    try {
      var win = doc.defaultView;
      if (win && win.scrollTo) win.scrollTo(0, 0);
    } catch (e) { /* ignore */ }
  }

  function scrollHostInPane(host) {
    if (!host) return;
    var pane = host.closest(".qcol, .passage-pane");
    if (!pane) {
      try { host.scrollIntoView({ block: "nearest" }); } catch (e) { /* ignore */ }
      return;
    }
    // reset first — leftover scrollTop + stale rects overshoot past the target
    pane.scrollTop = 0;
    var delta =
      host.getBoundingClientRect().top -
      pane.getBoundingClientRect().top -
      Math.max(24, pane.clientHeight * 0.25);
    if (delta > 0) pane.scrollTop = delta;
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
      pinReadingDocScroll(doc);
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
      // ponytail: no bare `div` — .qtext wins over .mcq and misses radios
      var root = badges[i].closest(".mcq, .match-q, td, tr, .fill-row, .qgroup");
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
    var root = el.closest(".mcq, .match-q, td, .qgroup");
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
      // pack may be chosen after bridge inject — sync before startTest
      try {
        var bridge = state.frame.contentDocument &&
          state.frame.contentDocument.getElementById("yysd-exam-bridge-js");
        if (bridge) {
          bridge.dataset.pack = state.pack || "exam";
          // resume uses draft.sections; fresh drill uses gate selection
          if (state.pack === "drill" && state.drillSections && state.drillSections.length && !state.resumeDraft) {
            bridge.dataset.sections = state.drillSections.join(",");
          } else {
            delete bridge.dataset.sections;
          }
        }
      } catch (e0) { /* ignore */ }
      // drill → paper "practice" (draft/no void); exam → paper "exam" (lock)
      // UI chrome is identical either way
      if (isWriting(state.item)) win.startTest();
      else win.startTest(state.pack === "drill" ? "practice" : "exam");
      applyDrillPartsFilter();
      applyCdtPaperSkin();
      bindPaperNav();
      syncReadingPartView(state.current + 1);
      syncWritingPartView(state.current + 1);
      autoplayListening();
      // B3: after bridge draft restore (same tick queue, scheduled first inside startTest)
      setTimeout(function () {
        try {
          if (win.YYSD_CDT_QUX && typeof win.YYSD_CDT_QUX.enhance === "function") {
            win.YYSD_CDT_QUX.enhance();
          }
        } catch (e1) { /* ignore */ }
      }, 0);
      return true;
    } catch (e) {
      return false;
    }
  }

  function startParentTimer(overrideSecs) {
    if (overrideSecs != null) state.seconds = overrideSecs;
    if (state.parentTimerStarted && overrideSecs == null) return;
    if (typeof state.onStart !== "function") return;
    state.parentTimerStarted = true;
    state.onStart(state.seconds);
  }

  function enterListeningReview() {
    if (!state.active || !state.started || !isListening(state.item)) return;
    if (state.listeningPhase === "review" || state.hopping) return;
    state.listeningPhase = "review";
    state.timeUpHop = false;
    state.parentTimerStarted = false;
    document.body.classList.add("viewer--cdt-listen-review");
    var banner = $("cdt-listen-review");
    if (banner) banner.removeAttribute("hidden");
    var title = $("cdt-title");
    if (title) {
      title.setAttribute("data-prev", title.textContent || "");
      title.textContent = "Listening review";
    }
    startParentTimer(LISTEN_REVIEW_SECS);
    updateTimer(LISTEN_REVIEW_SECS);
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
    applyBgColor(state.bgColor);
    loadNotepad();
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
        var host = el.type === "radio" ? (el.closest(".mcq, .match-q") || el) : el;
        if (isReading(state.item)) {
          pinReadingDocScroll(doc);
          scrollHostInPane(host);
          pinReadingDocScroll(doc);
        } else {
          try { host.scrollIntoView({ block: "nearest" }); } catch (eS) { /* ignore */ }
        }
        if (el.type !== "radio") {
          try { el.focus({ preventScroll: true }); } catch (eF) { try { el.focus(); } catch (eF2) {} }
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

  function applyBgColor(color) {
    state.bgColor = BG_MAP[color] ? color : "white";
    var hex = BG_MAP[state.bgColor];
    document.documentElement.style.setProperty("--cdt-paper-bg", hex);
    document.body.setAttribute("data-cdt-bg", state.bgColor);
    try {
      var doc = state.frame && state.frame.contentDocument;
      if (!doc || !doc.body) return;
      doc.documentElement.style.setProperty("--cdt-paper-bg", hex);
      doc.body.style.setProperty("--cdt-paper-bg", hex);
      // paper panels that are white by default
      var style = doc.getElementById("yysd-cdt-bg-css");
      if (!style) {
        style = doc.createElement("style");
        style.id = "yysd-cdt-bg-css";
        doc.head.appendChild(style);
      }
      style.textContent =
        "body.yysd-embedded #testArea," +
        "body.yysd-cdt-listening .note-box," +
        "body.yysd-cdt-listening .match-box," +
        "body.yysd-cdt-listening .mcq," +
        "body.yysd-cdt-reading .pcol," +
        "body.yysd-cdt-reading .qcol," +
        "body.yysd-cdt-writing .yysd-cdt-wprompt," +
        "body.yysd-cdt-writing .yysd-cdt-wanswer," +
        "body.yysd-cdt-writing .yysd-cdt-wanswer textarea{" +
        "background:" + hex + "!important}";
    } catch (e) { /* ignore */ }
  }

  function notepadKey() {
    return "yysd:cdt-notepad:" + ((state.item && state.item.id) || "local");
  }

  function loadNotepad() {
    var ta = $("cdt-notepad-ta");
    if (!ta) return;
    try { ta.value = sessionStorage.getItem(notepadKey()) || ""; } catch (e) { ta.value = ""; }
  }

  function saveNotepad() {
    var ta = $("cdt-notepad-ta");
    if (!ta) return;
    try { sessionStorage.setItem(notepadKey(), ta.value); } catch (e) { /* ignore */ }
  }

  function toggleNotepad(force) {
    var panel = $("cdt-notepad-panel");
    if (!panel) return;
    var on = force != null ? !!force : panel.hasAttribute("hidden");
    if (on) {
      loadNotepad();
      panel.removeAttribute("hidden");
      var ta = $("cdt-notepad-ta");
      if (ta) ta.focus();
    } else {
      saveNotepad();
      panel.setAttribute("hidden", "");
    }
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
    if (on) {
      el.removeAttribute("hidden");
      // ponytail: parent masks steal iframe focus — pause void while dialog open
      try {
        if (window.YYSD_EXAM && typeof YYSD_EXAM.pauseVoid === "function") {
          YYSD_EXAM.pauseVoid(15000);
        }
        if (state.frame && state.frame.contentWindow) {
          state.frame.contentWindow.postMessage({ type: "yysd:exam-dialog", ms: 15000 }, "*");
        }
      } catch (e) { /* ignore */ }
    } else {
      el.setAttribute("hidden", "");
    }
  }

  function showSubmitLoading(msg) {
    var text = $("cdt-submit-loading-text");
    if (text) text.textContent = msg || "正在加载成绩报告…";
    showMask("cdt-submit-loading", true);
  }

  function hideSubmitLoading() {
    showMask("cdt-submit-loading", false);
  }

  function submitLoadingMsg(plan) {
    if (!plan) return "正在加载成绩报告…";
    if (plan.action === "hop") return "正在进入下一科…";
    if (plan.action === "report") return "正在加载成绩报告…";
    return "正在生成成绩单…";
  }

  function updateTimer(seconds) {
    var el = $("cdt-timer");
    if (!el || !state.active) return;
    if (seconds <= 0) {
      el.textContent = "0 minutes left";
      el.classList.add("is-danger");
      el.classList.remove("is-flash", "is-low");
      // ponytail: parent clock owns after-submit — don't leave student stuck on timed-out section
      if (state.started && !state.timeUpHop) {
        state.timeUpHop = true;
        setTimeout(function () { hopAfterSubmit(); }, 600);
      }
      return;
    }
    var mins = Math.max(1, Math.ceil(seconds / 60));
    if (state.listeningPhase === "review") {
      // review shows clearer seconds in the last minute
      if (seconds < 60) el.textContent = seconds + (seconds === 1 ? " second left" : " seconds left");
      else el.textContent = mins + (mins === 1 ? " minute left" : " minutes left");
    } else {
      el.textContent = mins + (mins === 1 ? " minute left" : " minutes left");
    }
    // official CDT: clock flashes at 10 and 5 minutes remaining
    el.classList.toggle("is-flash", seconds <= 600);
    el.classList.toggle("is-low", seconds <= 300 && seconds > 60);
    el.classList.toggle("is-danger", seconds <= 60);
  }

  function finishSection() {
    var txt = $("cdt-finish-text");
    if (txt) {
      var plan = resolveAfterSubmit(state.pack, state.suite, state.item);
      if (plan.action === "hop") {
        txt.textContent = "You have selected to end this section of the test, click OK to progress to the next section or Cancel to return to the test. This function is not available in the real computer-delivered IELTS test.";
      } else if (plan.action === "report") {
        txt.textContent = "You have selected to end this test. Click OK to submit your Writing and view the three-skill report, or Cancel to return to the test.";
      } else {
        txt.textContent = "You have selected to end this test. Click OK to submit and view your answers, or Cancel to return to the test.";
      }
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

  function stopParentTimer() {
    try {
      if (window.YYSD_EXAM && typeof YYSD_EXAM.stopTimer === "function") YYSD_EXAM.stopTimer();
    } catch (e) { /* ignore */ }
  }

  /** This page-load only — never treat prior localStorage scores as "already submitted" */
  function alreadyScoredThisPaper() {
    if (state.scoredThisSession) return true;
    try {
      var win = state.frame && state.frame.contentWindow;
      if (win && win.submitted) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function submitPaperThen(done) {
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      window.removeEventListener("message", onScore);
      done();
    }
    // ponytail: time-up / double Finish — paper won't re-post yysd:score
    if (alreadyScoredThisPaper()) {
      finish();
      return;
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
      state.scoredThisSession = true;
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

  function reviewCssHref() {
    // iframe base is /library/... — must be origin-absolute, not relative
    try {
      return location.origin + "/assets/css/cdt-review.css?v=20260801rev1";
    } catch (e) {
      return "/assets/css/cdt-review.css?v=20260801rev1";
    }
  }

  function injectReviewStyles(doc, unlockAudio) {
    if (!doc || !doc.head) return;
    if (!doc.getElementById("yysd-cdt-review-link")) {
      var link = doc.createElement("link");
      link.id = "yysd-cdt-review-link";
      link.rel = "stylesheet";
      link.href = reviewCssHref();
      doc.head.appendChild(link);
    }
    var style = doc.getElementById("yysd-cdt-review-css");
    if (!style) {
      style = doc.createElement("style");
      style.id = "yysd-cdt-review-css";
      doc.head.appendChild(style);
    }
    // display toggles only — look-and-feel lives in cdt-review.css
    style.textContent =
      (unlockAudio
        ? "body.yysd-cdt-review #testArea{display:block!important}" +
          "body.yysd-cdt-review #questionsHolder,.submit-btn,.header,.test-topbar{display:none!important}" +
          "body.yysd-cdt-review .audio-bar{display:block!important}" +
          "body.yysd-cdt-review .audio-play,body.yysd-cdt-review #aProg{" +
            "pointer-events:auto!important;opacity:1!important}"
        : "body.yysd-cdt-review #testArea,.test-area,#questionsHolder{display:none!important}");
  }

  function polishResultDom(doc) {
    if (!doc) return;
    var ra = doc.getElementById("resultArea") || doc.querySelector(".result-area");
    if (!ra) return;
    var card = ra.querySelector(".res-card");
    if (card && !card.getAttribute("data-yysd-res")) {
      card.setAttribute("data-yysd-res", "1");
      var nodes = card.children;
      var i, el, t;
      for (i = 0; i < nodes.length; i++) {
        el = nodes[i];
        if (el.children && el.children.length) continue;
        t = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (/批改报告|写作完成/.test(t)) {
          el.className = "yysd-res-eyebrow";
          el.textContent = /写作/.test(t) ? "Writing report" : "Practice result";
          break;
        }
      }
    }
    ra.querySelectorAll(".ritem .rex").forEach(function (ex) {
      var raw = ex.textContent || "";
      if (raw.indexOf("💡") >= 0) ex.textContent = raw.split("💡").join("").replace(/^\s+/, "");
    });
    ra.querySelectorAll(".sec-result").forEach(function (sec) {
      sec.classList.add("open");
    });
  }

  function enterReviewMode() {
    showMask("cdt-finish-mask", false);
    hideSubmitLoading();
    stopParentTimer();
    document.body.classList.remove("viewer--cdt", "viewer--cdt-gating", "viewer--cdt-listen-review");
    document.body.classList.add("viewer--after-cdt");
    var header = $("cdt-header");
    var footer = $("cdt-footer");
    var gate = $("cdt-gate");
    var banner = $("cdt-listen-review");
    if (header) header.setAttribute("hidden", "");
    if (footer) footer.setAttribute("hidden", "");
    if (gate) gate.setAttribute("hidden", "");
    if (banner) banner.setAttribute("hidden", "");
    state.active = false;
    try {
      var doc = state.frame && state.frame.contentDocument;
      if (!doc) return;
      // ponytail: exam skin uses body.yysd-cdt-* #resultArea{display:none!important}
      // which beats plain #resultArea{display:block!important} — drop skin classes first
      if (doc.body) {
        doc.body.classList.remove("yysd-cdt-reading", "yysd-cdt-listening", "yysd-cdt-writing");
        doc.body.classList.add("yysd-cdt-review");
      }
      var unlockAudio = state.pack === "drill" && isListening(state.item);
      injectReviewStyles(doc, unlockAudio);
      if (unlockAudio && state.frame.contentWindow) {
        state.frame.contentWindow.postMessage({ type: "yysd:unlock-listening" }, "*");
      }
      var ra = doc.getElementById("resultArea") || doc.querySelector(".result-area");
      if (ra) {
        try { ra.style.setProperty("display", "block", "important"); } catch (e0) { ra.style.display = "block"; }
        polishResultDom(doc);
        // detail rows may paint a tick later via MutationObserver in papers — re-polish once
        try {
          var mo = new MutationObserver(function () { polishResultDom(doc); });
          mo.observe(ra, { childList: true, subtree: true });
          setTimeout(function () { try { mo.disconnect(); } catch (e2) {} }, 2500);
        } catch (e3) { /* ignore */ }
        ra.scrollIntoView({ block: "start" });
      }
      var ta = doc.getElementById("testArea");
      if (ta && !unlockAudio) {
        try { ta.style.setProperty("display", "none", "important"); } catch (e1) { ta.style.display = "none"; }
      }
    } catch (e) { /* ignore */ }
    var hint = document.getElementById("v-hint");
    if (hint) {
      hint.hidden = false;
      hint.textContent = state.pack === "drill"
        ? (isListening(state.item)
          ? "练习已交卷 · 成绩单与解析如下；可用顶部播放器回放听力。"
          : "练习已交卷 · 成绩单与解析如下。")
        : "模考已交卷 · 下方为本次作答与解析。";
    }
  }

  function hopAfterSubmit() {
    if (state.hopping) return;
    state.hopping = true;
    showMask("cdt-finish-mask", false);
    var plan = resolveAfterSubmit(state.pack, state.suite, state.item);
    showSubmitLoading(submitLoadingMsg(plan));
    var evQs = eventQuery();
    submitPaperThen(function () {
      stopParentTimer();
      releaseLock();
      if (plan.action === "hop") {
        (window.YYSD_GO || function (h) { location.href = h; })(
          "exam.html?id=" + encodeURIComponent(plan.id) +
            "&cdt=1&pack=exam&suite=1" + evQs
        );
        return;
      }
      if (plan.action === "report") {
        (window.YYSD_GO || function (h) { location.href = h; })(
          "cdt-report.html?suite=" + encodeURIComponent(plan.suite || state.item.id) + evQs
        );
        return;
      }
      enterReviewMode();
    });
  }

  function confirmFinish() {
    hopAfterSubmit();
  }

  function bindOnce() {
    if (bindOnce.done) return;
    bindOnce.done = true;

    var packDrill = $("cdt-pack-drill");
    if (packDrill) packDrill.addEventListener("click", function () {
      state.pack = "drill";
      state.suite = false;
      proceedAfterPack();
    });
    var packExam = $("cdt-pack-exam");
    if (packExam) packExam.addEventListener("click", function () {
      state.pack = "exam";
      // single-skill mock stays single unless URL already said suite=1
      proceedAfterPack();
    });

    var resumeOk = $("cdt-gate-resume-ok");
    if (resumeOk) resumeOk.addEventListener("click", function () {
      state.resumeDraft = true;
      // footer filter; paper restore still uses draft.sections via bridge
      try {
        var d = JSON.parse(localStorage.getItem("yysd:draft:" + state.item.id) || "null");
        state.drillSections = d && Array.isArray(d.sections) && d.sections.length ? d.sections : null;
      } catch (e) { state.drillSections = null; }
      if (isAssignedStudentDrill()) {
        if (!state.drillSections || !state.drillSections.length) lockAssignedDrillSlice();
        skipAssignedGatesToStart();
      } else {
        enterDrillGates();
      }
    });
    var resumeNew = $("cdt-gate-resume-new");
    if (resumeNew) resumeNew.addEventListener("click", function () {
      clearDrillDraft();
      if (isAssignedStudentDrill()) {
        lockAssignedDrillSlice();
        skipAssignedGatesToStart();
      } else {
        showSectionsGate();
      }
    });

    var secToggle = $("cdt-gate-sec-toggle");
    if (secToggle) secToggle.addEventListener("click", function () {
      var boxes = document.querySelectorAll(".cdt-gate-secbox");
      var off = false;
      for (var i = 0; i < boxes.length; i++) {
        if (!boxes[i].checked) { off = true; break; }
      }
      boxes.forEach(function (cb) { cb.checked = off; });
      syncSecToggleLabel();
      var err = $("cdt-gate-sec-err");
      if (err) err.setAttribute("hidden", "");
    });
    var secList = $("cdt-gate-sec-list");
    if (secList) secList.addEventListener("change", function () {
      syncSecToggleLabel();
      var err = $("cdt-gate-sec-err");
      if (err) err.setAttribute("hidden", "");
    });
    var secOk = $("cdt-gate-sec-ok");
    if (secOk) secOk.addEventListener("click", confirmSectionsGate);

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
      var bgs = document.querySelectorAll('input[name="cdt-bg-color"]');
      for (var j = 0; j < bgs.length; j++) {
        bgs[j].checked = bgs[j].value === state.bgColor;
      }
      showMask("cdt-setting-mask", true);
    });
    var settingOk = $("cdt-setting-ok");
    if (settingOk) settingOk.addEventListener("click", function () {
      var picked = document.querySelector('input[name="cdt-text-size"]:checked');
      applyTextSize(picked ? picked.value : "standard");
      var bg = document.querySelector('input[name="cdt-bg-color"]:checked');
      applyBgColor(bg ? bg.value : "white");
      showMask("cdt-setting-mask", false);
    });
    var settingX = $("cdt-setting-x");
    if (settingX) settingX.addEventListener("click", function () {
      showMask("cdt-setting-mask", false);
    });

    var notepadBtn = $("cdt-notepad");
    if (notepadBtn) notepadBtn.addEventListener("click", function () {
      toggleNotepad();
    });
    var notepadX = $("cdt-notepad-x");
    if (notepadX) notepadX.addEventListener("click", function () {
      toggleNotepad(false);
    });
    var notepadTa = $("cdt-notepad-ta");
    if (notepadTa) {
      notepadTa.addEventListener("input", saveNotepad);
      notepadTa.addEventListener("blur", saveNotepad);
    }

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
      if (d.type === "yysd:audio-ready" || d.type === "yysd:timer-sync") {
        if (state.listeningPhase !== "review") {
          state.listeningPhase = "audio";
          startParentTimer();
        }
      }
      if (d.type === "yysd:listening-ended") enterListeningReview();
    });
  }

  function activate(opts) {
    opts = opts || {};
    state.active = true;
    state.started = false;
    state.frameReady = false;
    state.parentTimerStarted = false;
    state.hopping = false;
    state.timeUpHop = false;
    state.listeningPhase = "";
    state.item = opts.item;
    state.frame = opts.frame;
    state.seconds = opts.seconds || 0;
    state.onStart = opts.onStart || null;
    state.pack = opts.pack === "drill" || opts.pack === "exam" ? opts.pack : "";
    state.suite = !!opts.suite && state.pack !== "drill";
    if (state.suite && !state.pack) state.pack = "exam";
    state.resumeDraft = false;
    state.drillSections = null;
    state.scoredThisSession = false;
    var listenBanner = $("cdt-listen-review");
    if (listenBanner) listenBanner.setAttribute("hidden", "");
    document.body.classList.remove("viewer--cdt-listen-review");
    state.parts = buildParts(opts.item);
    state.total = flattenNums(state.parts).length;
    state.current = 0;
    state.review = {};
    state.answered = {};
    state.paperBound = false;

    document.body.classList.add("viewer--cdt");
    document.body.classList.remove("viewer--after-cdt");
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
    loadNotepad();
    openGates();
  }

  function onFrameReady() {
    if (!state.active) return;
    state.frameReady = true;
    syncStartEnabled();
    applyTextSize(state.textSize);
    applyBgColor(state.bgColor);
    // refresh section list once TEST is available in iframe
    if (state.gateStep === "sections" && !state.started) populateSectionsPanel();
    if (state.autoStartAssigned && !state.started) skipAssignedGatesToStart();
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
    enterListeningReview: enterListeningReview,
    isActive: function () { return state.active; },
    hasStarted: function () { return state.started; },
    getPack: function () { return state.pack; },
    isSuite: function () { return !!state.suite; },
    listeningPhase: function () { return state.listeningPhase; },
    resolveAfterSubmit: resolveAfterSubmit,
    LISTEN_REVIEW_SECS: LISTEN_REVIEW_SECS
  };

  // ponytail: B1/B5 — open exam.html?cdtCheck=1 to verify hop matrix + chrome presence
  if (/(?:^|[?&])cdtCheck=1(?:&|$)/.test(location.search)) {
    var fake = { id: "cambridge-20-test-1", subject: "cambridge-listening" };
    var cases = [
      [resolveAfterSubmit("drill", false, fake), { action: "review" }],
      [resolveAfterSubmit("exam", false, fake), { action: "review" }],
      [resolveAfterSubmit("exam", true, fake), { action: "hop", id: "cambridge-20-test-1-reading" }],
      [resolveAfterSubmit("exam", true, { id: "cambridge-20-test-1-writing", subject: "cambridge-writing" }),
        { action: "report", suite: "cambridge-20-test-1" }]
    ];
    var fail = 0;
    cases.forEach(function (pair, i) {
      if (JSON.stringify(pair[0]) !== JSON.stringify(pair[1])) {
        fail++;
        console.error("[CDT hop #" + i + "]", pair[0], "!=", pair[1]);
      } else {
        console.log("[CDT hop #" + i + "] ok");
      }
    });
    // B5 chrome inventory (DOM present)
    var need = [
      "cdt-header", "cdt-timer", "cdt-finish", "cdt-notepad", "cdt-setting",
      "cdt-help", "cdt-hide", "cdt-footer", "cdt-listen-review",
      "cdt-setting-mask", "cdt-help-mask", "cdt-notepad-panel",
      "cdt-gate-sections", "cdt-gate-sec-list", "cdt-gate-sec-ok"
    ];
    need.forEach(function (id) {
      if (!document.getElementById(id)) {
        fail++;
        console.error("[CDT chrome] missing #" + id);
      } else {
        console.log("[CDT chrome] #" + id + " ok");
      }
    });
    if (!document.querySelector('input[name="cdt-bg-color"]')) {
      fail++;
      console.error("[CDT chrome] missing bg colour radios");
    }
    console.log(fail ? ("[CDT B5] FAIL " + fail) : "[CDT B5] PASS hops+chrome");
  }
})();
