/* Official-like TOEFL chrome: intro, pause, volume tone, mic gate, exit */
(function (w) {
  "use strict";

  var paused = false;
  var vol = 1;
  var ready = null;
  var examBtns = [];
  var micOk = false;
  var micStream = null;
  var micRaf = 0;
  var micCtx = null;
  var micPending = null;
  var toneCtx = null;
  var leaving = false;

  var COPY = {
    general: {
      title: "General Test Information",
      html:
        "<p>This test measures your ability to use English in both everyday and academic contexts. It includes four sections: Reading, Listening, Writing, and Speaking.</p>" +
        "<p>Reading and Listening begin with a mix of everyday and academic materials. The difficulty and number of questions may adjust based on your performance.</p>" +
        "<p>Writing and Speaking tasks reflect real-life communication in personal, academic, or professional settings. When answering questions in the Writing and Speaking sections, be sure to use your own words. Do not include memorized reasons or examples in your responses.</p>" +
        "<p>There will be directions before each section. You may dismiss these directions at any time by selecting <b>Continue</b>.</p>" +
        "<p>Select <b>Continue</b> to begin the test.</p>"
    },
    hardware: {
      title: "Hardware Check",
      html:
        "<p>Before the test begins, we will check the microphone and headset volume.</p>" +
        '<div class="ets-hw" aria-hidden="true">' +
        '<svg viewBox="0 0 48 48"><path d="M24 4a8 8 0 0 0-8 8v10a8 8 0 1 0 16 0V12a8 8 0 0 0-8-8zm-2 32.1V40h-4v4h12v-4h-4v-3.9A14 14 0 0 0 38 22h-4a10 10 0 1 1-20 0h-4a14 14 0 0 0 12 14.1z"/></svg>' +
        '<svg viewBox="0 0 48 48"><path d="M8 22a16 16 0 1 1 32 0v10a5 5 0 0 1-5 5h-3V24h6v-2a14 14 0 1 0-28 0v2h6v13H13a5 5 0 0 1-5-5V22z"/></svg>' +
        '<svg viewBox="0 0 48 48"><path d="M8 20v8h6l10 8V12L14 20H8zm22 4a8 8 0 0 0-4-6.9v13.8A8 8 0 0 0 30 24zm4 0a12 12 0 0 0-6-10.4v20.8A12 12 0 0 0 34 24z"/></svg>' +
        "</div>" +
        "<p>Please make sure your headset is on. Follow the instructions on each screen. Be sure that your microphone is properly positioned and adjusted to allow for the best possible recording. Speak directly into the microphone and in your normal speaking voice.</p>"
    },
    volume: {
      id: "volume",
      title: "Adjusting the Volume",
      html:
        "<p>To adjust the volume, select the <b>Volume</b> icon at the top of the screen. The volume control will appear. Move the volume indicator to the left or the right to change the volume.</p>" +
        "<p>To close the volume control, select the <b>Volume</b> icon again.</p>" +
        "<p>You will be able to change the volume during the test if you need to.</p>" +
        "<p>Select <b>Play sample</b> to hear a tone at the current volume. Select <b>Continue</b> when you are ready.</p>" +
        '<p><button type="button" class="btn" id="ets-tone">Play sample</button></p>'
    },
    microphone: {
      id: "microphone",
      title: "Adjusting the Microphone",
      html:
        "<p>In order to check your microphone volume, you will speak into the microphone using your normal tone and volume. For best recording results, your voice level should remain generally within the <b>Good</b> range.</p>" +
        '<div class="ets-mic-row"><button type="button" class="ets-record" id="ets-record">RECORD</button><div>' +
        "<p>Select the <b>Record</b> button. A timer will count down until the system is ready to record.</p>" +
        "<p>To check your microphone level, you will record the following paragraph using your normal tone and volume.</p>" +
        "<p>There are several reasons why I would prefer to live in a large city. Some of the greatest advantages would include the number of job opportunities and career options, public transportation, greater diversity, and a wealth of entertainment. Also, large cities typically have a great deal to offer in terms of history, art and culture.</p>" +
        '<div class="ets-meter" id="ets-meter" aria-hidden="true"></div>' +
        '<p class="ets-meter-lab"><span>Too Quiet</span><span>Good</span><span>Too Loud</span></p>' +
        '<p id="ets-mic-msg">Select Record, then speak the paragraph. You may select Continue after you try.</p>' +
        "</div></div>"
    },
    reading: {
      title: "Reading Section",
      html:
        "<p>In the Reading section, you will answer 35–48 questions to demonstrate how well you understand academic and non-academic texts in English. There are three types of tasks.</p>" +
        '<table class="ets-dir-table"><thead><tr><th>Type of Task</th><th>Description</th></tr></thead><tbody>' +
        "<tr><td>Complete the Words</td><td>Fill in the missing letters in a paragraph.</td></tr>" +
        "<tr><td>Read in Daily Life</td><td>Answer questions about everyday reading material.</td></tr>" +
        "<tr><td>Read an Academic Passage</td><td>Answer questions about academic passages.</td></tr>" +
        "</tbody></table>" +
        "<p>Select <b>Begin</b> to go on.</p>"
    },
    listening: {
      title: "Listening Section",
      html:
        "<p>In the Listening section, you will answer 35–45 questions to demonstrate how well you understand spoken English. There are three types of tasks.</p>" +
        '<table class="ets-dir-table"><thead><tr><th>Type of Task</th><th>Description</th></tr></thead><tbody>' +
        "<tr><td>Listen and Choose a Response</td><td>Select the best response to the question or statement.</td></tr>" +
        "<tr><td>Conversations</td><td>Answer questions about short conversations.</td></tr>" +
        "<tr><td>Announcements and Academic Talks</td><td>Answer questions about announcements and academic talks.</td></tr>" +
        "</tbody></table>" +
        "<p>You will not be able to return to previous questions.</p>" +
        "<p>Select <b>Begin</b> to go on.</p>"
    },
    writing: {
      title: "Writing Section",
      html:
        "<p>In the Writing section, you will demonstrate how well you can write in English. There are three types of tasks.</p>" +
        '<table class="ets-dir-table"><thead><tr><th>Type of Task</th><th>Description</th></tr></thead><tbody>' +
        "<tr><td>Build a Sentence</td><td>Complete a sentence by moving the words into the response.</td></tr>" +
        "<tr><td>Write an Email</td><td>Write an email for an everyday situation. Use your own words.</td></tr>" +
        "<tr><td>Write for an Academic Discussion</td><td>Post in a discussion. An effective response contains at least 100 words.</td></tr>" +
        "</tbody></table>" +
        "<p>Select <b>Begin</b> to go on.</p>"
    },
    speaking: {
      title: "Speaking Section",
      html:
        "<p>In the Speaking section, you will repeat what you hear and answer interview questions. Speak in your normal voice.</p>" +
        '<table class="ets-dir-table"><thead><tr><th>Type of Task</th><th>Description</th></tr></thead><tbody>' +
        "<tr><td>Listen and Repeat</td><td>Listen, then repeat the sentence in your normal voice.</td></tr>" +
        "<tr><td>Take an Interview</td><td>Answer the question you hear. The question is spoken, not printed.</td></tr>" +
        "</tbody></table>" +
        "<p>Recordings stay on this device until you export them.</p>" +
        "<p>Select <b>Begin</b> to go on.</p>"
    }
  };

  var TASK = {
    complete_words: { title: "Complete the Words", html: "<p>Fill in the missing letters in the paragraph.</p>" },
    daily_life: { title: "Read in Daily Life", html: "<p>Answer questions about everyday reading material.</p>" },
    academic: { title: "Read an Academic Passage", html: "<p>Answer questions about the academic passage.</p>" },
    choose_response: { title: "Listen and Choose a Response", html: "<p>Select the best response to the question or statement.</p>" },
    conversation: { title: "Conversations", html: "<p>Listen to the conversation, then answer the questions. You will hear the audio only once.</p>" },
    announcement: { title: "Announcements", html: "<p>Listen to the announcement, then answer the questions. You will hear the audio only once.</p>" },
    lecture: { title: "Academic Talks", html: "<p>Listen to the talk, then answer the questions. You will hear the audio only once.</p>" },
    sentence: { title: "Build a Sentence", html: "<p>Move the words into the sentence.</p>" },
    email: { title: "Write an Email", html: "<p>Write an email for an everyday situation. Use your own words.</p>" },
    discussion: { title: "Write for an Academic Discussion", html: "<p>Write a post that contributes to the discussion. An effective response contains at least 100 words.</p>" },
    repeat: { title: "Listen and Repeat", html: "<p>Listen to the sentence, then repeat it. You will have 3 seconds to prepare and 8 seconds to speak.</p>" },
    interview: { title: "Take an Interview", html: "<p>Answer the question you hear. The question is spoken, not printed. You will have 45 seconds to speak.</p>" }
  };
  var seenTask = {};

  function gateTask(type, resume) {
    var copy = TASK[type];
    if (!copy || seenTask[type]) return false;
    seenTask[type] = 1;
    var intro = $("ets-intro");
    var next = $("next-btn");
    if (!intro || !next) return false;
    ["exam", "review", "rest", "done"].forEach(function (id) {
      var n = $(id);
      if (n) n.classList.add("hidden");
    });
    intro.classList.remove("hidden");
    intro.innerHTML = "<h2>" + copy.title + "</h2>" + copy.html + "<p>Select <b>Begin</b> to go on.</p>";
    var prev = next.onclick;
    next.disabled = false;
    next.textContent = "Begin";
    next.onclick = function () {
      intro.classList.add("hidden");
      next.onclick = prev;
      if (resume) resume();
    };
    return true;
  }

  function $(id) { return document.getElementById(id); }

  function hwKey(id) { return "yysd:toefl-hw:" + id; }

  function hwDone(id) {
    if (!id) return false;
    try { if (typeof localStorage !== "undefined" && localStorage.getItem(hwKey(id)) === "1") return true; } catch (e) {}
    try { if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(hwKey(id)) === "1") return true; } catch (e2) {}
    return false;
  }

  function markHw(id) {
    if (!id) return;
    try { if (typeof localStorage !== "undefined") localStorage.setItem(hwKey(id), "1"); } catch (e) {}
    try { if (typeof sessionStorage !== "undefined") sessionStorage.setItem(hwKey(id), "1"); } catch (e2) {}
  }

  // ponytail: RMS bands match the official 3-zone meter; swap for AGC if laptops clip
  function levelOf(rms) {
    if (rms < 0.02) return 0;
    if (rms > 0.28) return 2;
    return 1;
  }

  function applyVol() {
    document.querySelectorAll("audio").forEach(function (a) { a.volume = vol; });
  }

  function playTone() {
    var Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    if (toneCtx) { try { toneCtx.close(); } catch (e) {} }
    toneCtx = new Ctx();
    var osc = toneCtx.createOscillator();
    var g = toneCtx.createGain();
    osc.frequency.value = 440;
    g.gain.value = 0.12 * vol;
    osc.connect(g);
    g.connect(toneCtx.destination);
    osc.start();
    osc.stop(toneCtx.currentTime + 1.2);
  }

  function playBeep() {
    var Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    var ctx = new Ctx();
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.frequency.value = 880;
    g.gain.value = 0.18 * vol;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    osc.onended = function () { try { ctx.close(); } catch (e) {} };
  }

  function setPaused(on) {
    paused = !!on;
    var box = $("ets-pause");
    if (box) box.classList.toggle("is-on", paused);
    document.querySelectorAll("audio").forEach(function (a) {
      if (paused) {
        if (!a.paused && !a.ended) a.setAttribute("data-resume", "1");
        a.pause();
        return;
      }
      if (a.getAttribute("data-resume") === "1") {
        a.removeAttribute("data-resume");
        var p = a.play();
        if (p && p.catch) p.catch(function () {});
      }
    });
  }

  function ensureMicCtx() {
    var Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return null;
    if (!micCtx || micCtx.state === "closed") micCtx = new Ctx();
    if (micCtx.state === "suspended") {
      try { micCtx.resume(); } catch (e) {}
    }
    return micCtx;
  }

  function stopMic() {
    if (micRaf) cancelAnimationFrame(micRaf);
    micRaf = 0;
    micPending = null;
    if (micStream) {
      micStream.getTracks().forEach(function (t) { t.stop(); });
      micStream = null;
    }
    if (micCtx) {
      try { micCtx.close(); } catch (e) {}
      micCtx = null;
    }
  }

  function paintMeter(n) {
    var box = $("ets-meter");
    if (!box) return;
    if (!box.childElementCount) {
      var i;
      for (i = 0; i < 20; i++) box.appendChild(document.createElement("i"));
    }
    Array.prototype.forEach.call(box.children, function (el, i) {
      el.className = i < n ? (i < 7 ? "is-quiet" : (i < 15 ? "is-good" : "is-loud")) : "";
    });
  }

  function askMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error("no-mic"));
    }
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true }
    });
  }

  function startMicListen(msg) {
    function hook(stream) {
      var ctx = ensureMicCtx();
      if (!ctx) {
        if (msg) msg.textContent = "This browser cannot access the microphone. You may still Continue.";
        return;
      }
      var track = stream.getAudioTracks()[0];
      if (!track || track.readyState === "ended") {
        if (msg) msg.textContent = "Microphone is not available. You may still Continue.";
        return;
      }
      var src = ctx.createMediaStreamSource(stream);
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      var mute = ctx.createGain();
      mute.gain.value = 0;
      analyser.connect(mute);
      mute.connect(ctx.destination);
      var wave = new Uint8Array(analyser.fftSize);
      var freq = new Uint8Array(analyser.frequencyBinCount);
      function tick() {
        if (ctx.state === "suspended") ctx.resume().catch(function () {});
        analyser.getByteTimeDomainData(wave);
        analyser.getByteFrequencyData(freq);
        var sum = 0;
        var i;
        for (i = 0; i < wave.length; i++) {
          var v = (wave[i] - 128) / 128;
          sum += v * v;
        }
        var rms = Math.sqrt(sum / wave.length);
        var peak = 0;
        for (i = 0; i < freq.length; i++) if (freq[i] > peak) peak = freq[i];
        paintMeter(Math.min(20, Math.max(Math.round(rms * 90), Math.round(peak / 12))));
        if (rms >= 0.008 || peak > 18) {
          if (msg) msg.textContent = "Good. Select Continue to begin the test.";
        }
        micRaf = requestAnimationFrame(tick);
      }
      if (ctx.state === "suspended") ctx.resume().then(tick).catch(tick);
      else tick();
    }
    if (micStream) {
      hook(micStream);
      return;
    }
    (micPending || askMic()).then(function (stream) {
      micStream = stream;
      hook(stream);
    }).catch(function () {
      if (msg) msg.textContent = "Microphone permission is required for Speaking. You may Continue and allow it later.";
    });
  }

  function bindMic() {
    var rec = $("ets-record");
    var msg = $("ets-mic-msg");
    var next = $("next-btn");
    micOk = true;
    paintMeter(0);
    if (next) next.disabled = false;
    if (!rec) return;
    rec.onclick = function () {
      ensureMicCtx();
      micPending = askMic();
      micPending.then(function (stream) { if (!micStream) micStream = stream; }).catch(function () {
        if (msg) msg.textContent = "Microphone permission is required for Speaking. You may Continue and allow it later.";
      });
      var n = 3;
      rec.disabled = true;
      rec.textContent = String(n);
      var t = setInterval(function () {
        n -= 1;
        if (n > 0) { rec.textContent = String(n); return; }
        clearInterval(t);
        rec.textContent = "REC";
        if (msg) msg.textContent = "Speak the paragraph now.";
        startMicListen(msg);
      }, 1000);
    };
  }

  function examMode(on) {
    examBtns.forEach(function (el) {
      if (!el) return;
      el.classList.toggle("hidden", !on);
    });
    var next = $("next-btn");
    if (next && on) {
      next.textContent = "Next";
      next.disabled = false;
    }
    document.body.classList.toggle("ets-booting", !on);
    var pop = $("ets-vol");
    if (on && pop) pop.classList.add("hidden");
  }

  /* wofo: 交卷后先停在「生成成绩单」屏，点 View 才把答卷交给复盘页 */
  function reportGate(onView) {
    examMode(false);
    document.body.classList.add("ets-gate-on");
    var next = $("next-btn");
    if (next) next.classList.add("hidden");
    var box = $("ets-gate");
    if (!box) {
      box = document.createElement("div");
      box.id = "ets-gate";
      box.className = "ets-gate";
      box.innerHTML = '<div class="ets-gate-in"><p>Generate your score report when you are ready.</p>' +
        '<p><button type="button" id="ets-gate-go">View Score Report</button></p></div>';
      (document.querySelector(".ets-frame") || document.body).appendChild(box);
    }
    box.classList.remove("hidden");
    var gateGo = $("ets-gate-go");
    if (gateGo) {
      gateGo.disabled = false;
      gateGo.onclick = function () {
        if (gateGo.disabled) return;
        gateGo.disabled = true;
        gateGo.onclick = null;
        if (onView) onView();
      };
    }
  }

  // ponytail: confirmExit 与 confirmSubmit 共用 #ets-exit 浮层，每次全量写文案防止上一次的残留
  function confirmExit(onYes, mock) {
    var box = $("ets-exit");
    if (!box) { if (onYes) onYes(); return; }
    var h = box.querySelector("h2");
    var p = box.querySelector("p");
    var yes = $("ets-exit-yes");
    var no = $("ets-exit-no");
    if (h) h.textContent = mock ? "Exit Test" : "Exit Section";
    if (p) p.textContent = mock
      ? "This ends the mock test and returns you to the mock list. This attempt will not be scored."
      : "If you exit this section, unanswered questions will not be scored and you cannot return.";
    if (yes) yes.textContent = mock ? "Exit Test" : "Exit Section";
    if (no) no.textContent = "Return";
    box.classList.add("is-on");
    if (yes) yes.onclick = function () { box.classList.remove("is-on"); if (onYes) onYes(); };
    if (no) no.onclick = function () { box.classList.remove("is-on"); };
  }

  function confirmSubmit(msg, onYes) {
    var box = $("ets-exit");
    if (!box) { if (onYes) onYes(); return; }
    var h = box.querySelector("h2");
    var p = box.querySelector("p");
    var yes = $("ets-exit-yes");
    var no = $("ets-exit-no");
    if (h) h.textContent = "Submit Section";
    if (p) p.textContent = msg;
    if (yes) yes.textContent = "Submit";
    if (no) no.textContent = "Cancel";
    box.classList.add("is-on");
    if (yes) {
      yes.disabled = false;
      yes.onclick = function () {
        if (yes.disabled) return;
        yes.disabled = true;
        box.classList.remove("is-on");
        if (onYes) onYes();
      };
    }
    if (no) no.onclick = function () { box.classList.remove("is-on"); if (yes) yes.disabled = false; };
  }

  function showFail(msg, backHref) {
    var box = $("ets-exit");
    if (!box) return false;
    var h = box.querySelector("h2");
    var p = box.querySelector("p");
    var yes = $("ets-exit-yes");
    var no = $("ets-exit-no");
    if (h) h.textContent = "Unable to load this test";
    if (p) p.textContent = msg;
    if (yes) {
      yes.textContent = "Retry";
      yes.onclick = function () { location.reload(); };
    }
    if (no) {
      no.textContent = "Return";
      no.onclick = backHref ? function () { location.href = backHref; } : null;
    }
    box.classList.add("is-on");
    return true;
  }

  function markLeaving() { leaving = true; }

  function bindExit(opts) {
    var exitBtn = $("exit-btn");
    if (!exitBtn) return;
    exitBtn.classList.remove("hidden");
    exitBtn.onclick = function () {
      var F = w.YYSD_TOEFL_FULL;
      var mock = !!(opts.isFull || opts.mode === "mock");
      confirmExit(function () {
        markLeaving();
        var preview = false;
        try { preview = new URLSearchParams(location.search).get("preview") === "1"; } catch (e) {}
        if (preview) {
          try { w.close(); } catch (e2) {}
          if (w.closed) return;
        }
        if (mock && F && F.quitPack && opts.id) F.quitPack(opts.id);
        var href = "home.html";
        if (F && F.listBack) href = F.listBack(opts.skill, { mock: mock });
        location.href = href;
      }, mock);
    };
  }

  function boot(opts) {
    opts = opts || {};
    ready = opts.onReady;
    bindExit(opts);
    var titleEl = $("set-title");
    if (titleEl) {
      var label = opts.title || "";
      if (opts.isFull) {
        var hit = ((w.YYSD && w.YYSD.TOEFL_FULL) || []).filter(function (p) {
          return p.id === opts.id;
        })[0];
        if (hit && hit.title) label = hit.title;
      }
      if (label) titleEl.textContent = label;
    }
    var queue = [];
    if (opts.isFull && opts.skill === "reading" && !hwDone(opts.id)) {
      queue.push(COPY.general, COPY.hardware, COPY.volume, COPY.microphone);
    } else if (!opts.isFull && opts.skill === "listening") {
      queue.push(COPY.volume);
    } else if (!opts.isFull && opts.skill === "speaking") {
      queue.push(COPY.volume, COPY.microphone);
    }
    if (COPY[opts.skill]) queue.push(COPY[opts.skill]);
    if (!queue.length) {
      examMode(true);
      if (ready) ready();
      return;
    }

    var intro = $("ets-intro");
    var next = $("next-btn");
    var volBtn = $("vol-btn");
    var i = 0;
    examBtns = [$("hide-time"), $("help-btn"), $("review-btn"), $("back-btn"), $("clock")];
    examMode(false);
    if (volBtn) {
      volBtn.classList.toggle("hidden", opts.skill !== "listening" && opts.skill !== "speaking" && !opts.isFull);
    }
    if (intro) intro.classList.remove("hidden");
    if (next) next.textContent = "Continue";

    function paint() {
      var scr = queue[i];
      if (!scr || !intro) return;
      stopMic();
      intro.innerHTML = "<h2>" + scr.title + "</h2>" + scr.html;
      if (next) {
        next.disabled = false;
        next.textContent = i === queue.length - 1 ? "Begin" : "Continue";
      }
      if (scr.id === "volume") {
        var tone = $("ets-tone");
        if (tone) tone.onclick = playTone;
      }
      if (scr.id === "microphone") bindMic();
    }
    paint();

    var oldNext = next && next.onclick;
    var begun = false;
    if (next) {
      next.onclick = function () {
        var scr = queue[i];
        if (i < queue.length - 1) {
          i += 1;
          paint();
          return;
        }
        if (begun) return;
        begun = true;
        if (opts.isFull && opts.skill === "reading") markHw(opts.id);
        stopMic();
        intro.classList.add("hidden");
        next.onclick = oldNext;
        examMode(true);
        if (ready) ready();
      };
    }
  }

  function bindChrome() {
    var resume = $("ets-resume");
    if (resume) resume.onclick = function () { setPaused(false); };
    var volBtn = $("vol-btn");
    var pop = $("ets-vol");
    var slider = $("ets-vol-range");
    if (volBtn && pop && slider) {
      volBtn.onclick = function () {
        var on = pop.classList.toggle("hidden") === false;
        if (on) {
          var r = volBtn.getBoundingClientRect();
          pop.style.top = r.bottom + 8 + "px";
          pop.style.left = Math.max(8, r.right - 220) + "px";
        }
      };
      slider.oninput = function () {
        vol = Number(slider.value) || 0;
        applyVol();
      };
    }
    var sample = $("ets-vol-tone");
    if (sample) sample.onclick = playTone;
    if (w.MutationObserver) {
      new MutationObserver(applyVol).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindChrome);
  else bindChrome();

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderReview(detail) {
    return (detail || []).map(function (d) {
      var ua = d.ua ? escHtml(d.ua) : "无";
      var mark = d.ok === true ? "is-correct" : (d.ok === false ? "is-incorrect" : "");
      var stem = d.stem ? " · " + escHtml(d.stem) : "";
      var explain = d.explain
        ? '<p class="rv-explain"><b>解析</b> ' + escHtml(d.explain) + "</p>"
        : "";
      return '<article class="rv-item"><p class="rv-stem">Q' + escHtml(d.id) + stem + "</p>" +
        '<p class="rv-line"><span class="rv-k">我的答案：</span><span class="' + mark + '">' + ua + "</span></p>" +
        '<p class="rv-line"><span class="rv-k">正确答案：</span><span class="is-correct">' + escHtml(d.expect || "") + "</span></p>" +
        explain + "</article>";
    }).join("");
  }

  w.YYSD_TOEFL_SHELL = {
    boot: boot,
    gateTask: gateTask,
    renderReview: renderReview,
    paused: function () { return paused; },
    applyVol: applyVol,
    playBeep: playBeep,
    playTone: playTone,
    confirmExit: confirmExit,
    confirmSubmit: confirmSubmit,
    reportGate: reportGate,
    showFail: showFail,
    levelOf: levelOf,
    hwKey: hwKey,
    leaving: function () { return leaving; },
    markLeaving: markLeaving,
    directing: function () {
      var intro = $("ets-intro");
      return !!(intro && !intro.classList.contains("hidden"));
    }
  };
})(window);
