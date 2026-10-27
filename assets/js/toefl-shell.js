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
    help: {
      reading:
        "<h3>Testing Tools</h3>" +
        "<p>Use <b>Next</b> and <b>Back</b> to move between questions in this module. You may skip questions and return to them later if time remains.</p>" +
        "<p>Use <b>Review</b> to see which questions you have answered. From Review, you may go only to questions you have already seen.</p>" +
        "<p><b>Hide Time</b> hides the clock; the clock does not stop. <b>Help</b> does not stop the clock. <b>Volume</b> adjusts the headset volume. <b>Pause Test</b> pauses the test.</p>" +
        "<h3>Reading the Passage</h3>" +
        "<p>Select text in the passage to highlight it. Vocabulary questions highlight the word in the passage.</p>" +
        "<p>Insert questions show <b>[A] [B] [C] [D]</b> in the passage. Select an option on the right, or select a location in the passage.</p>" +
        "<h3>Section Directions</h3>" +
        "<p>You cannot return to Module 1 after you begin Module 2.</p>",
      listening:
        "<h3>Testing Tools</h3>" +
        "<p>Use <b>Next</b> to move to the next question. You cannot return to a question. <b>Volume</b> stays available while audio plays.</p>" +
        "<p><b>Hide Time</b> hides the clock; the clock does not stop. <b>Help</b> does not stop the clock.</p>" +
        "<h3>Section Directions</h3>" +
        "<p>Choose a Response shows the options with the clip. Conversations, announcements, and lectures play first; questions appear after the recording ends.</p>" +
        "<p>The audio plays once and cannot be replayed. You cannot return to Module 1 after you begin Module 2.</p>",
      writing:
        "<h3>Testing Tools</h3>" +
        "<p>Use <b>Cut</b>, <b>Copy</b>, <b>Paste</b>, <b>Undo</b>, and <b>Redo</b> while you write. <b>Hide Word Count</b> hides the counter.</p>" +
        "<p><b>Hide Time</b> hides the clock; the clock does not stop. <b>Help</b> does not stop the clock.</p>" +
        "<h3>Section Directions</h3>" +
        "<p>Sentence Construction: drag a word into a blank, or tap a word to fill the next blank. Tap a filled blank to return the word.</p>" +
        "<p>You cannot return to an earlier writing task after you leave it.</p>",
      speaking:
        "<h3>Testing Tools</h3>" +
        "<p><b>Volume</b> stays available while audio plays. <b>Help</b> does not stop the clock.</p>" +
        "<h3>Section Directions</h3>" +
        "<p>Listen and Repeat: one sentence, 3 seconds to think, a beep, then time to speak. The sample sentence stays hidden. You record once.</p>" +
        "<p>Interview: the question is not printed. After the prompt you have 45 seconds to speak. You record once.</p>"
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
    var run = "";
    try { run = new URLSearchParams(location.search).get("bank") || ""; } catch (e) {}
    if (run && !seenTask[type]) {
      try { if (sessionStorage.getItem("yysd:toefl-task:" + run + ":" + type) === "1") seenTask[type] = 1; } catch (e) {}
    }
    if (!copy || seenTask[type]) return false;
    seenTask[type] = 1;
    if (run) {
      try { sessionStorage.setItem("yysd:toefl-task:" + run + ":" + type, "1"); } catch (e) {}
    }
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
    if (!id || typeof sessionStorage === "undefined") return false;
    try { return sessionStorage.getItem(hwKey(id)) === "1"; } catch (e) { return false; }
  }

  function markHw(id) {
    if (!id || typeof sessionStorage === "undefined") return;
    try { sessionStorage.setItem(hwKey(id), "1"); } catch (e) {}
  }

  // ponytail: sprint L&R is one bank block per reload; key the speaking hw flag to bank, not paperId
  function speakHwId(opts) {
    var bank = "";
    try { bank = new URLSearchParams(location.search).get("bank") || ""; } catch (e) {}
    return bank || (opts && opts.id) || "speaking";
  }

  function rememberMic() {
    try { return sessionStorage.getItem("yysd:toefl-mic-ok") === "1"; } catch (e) { return false; }
  }

  function markMic() {
    try { sessionStorage.setItem("yysd:toefl-mic-ok", "1"); } catch (e) {}
  }

  // ponytail: RMS bands match the official 3-zone meter; swap for AGC if laptops clip
  function levelOf(rms) {
    if (rms < 0.02) return 0;
    if (rms > 0.28) return 2;
    return 1;
  }

  function applyVol() {
    document.querySelectorAll("audio").forEach(function (a) { a.volume = vol; });
    paintVolMeter();
  }

  function paintVolMeter() {
    var box = $("ets-vol-meter");
    if (!box) return;
    if (!box.childElementCount) {
      var i;
      for (i = 0; i < 16; i++) box.appendChild(document.createElement("i"));
    }
    var n = Math.round(vol * box.childElementCount);
    Array.prototype.forEach.call(box.children, function (el, i) {
      el.className = i < n ? "is-on" : "";
    });
  }

  function bindHelp(skill) {
    var box = $("help-box");
    var btn = $("help-btn");
    if (!box) return;
    var html = (COPY.help && COPY.help[skill]) || COPY.help.reading;
    box.innerHTML = '<div class="ets-help"><h2>Help</h2>' + html +
      '<p><button class="btn" type="button" id="help-close">Return</button></p></div>';
    var close = $("help-close");
    if (close) close.onclick = function () { box.classList.add("hidden"); };
    if (btn) btn.onclick = function () { box.classList.toggle("hidden"); };
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
      if (paused) a.pause();
    });
    if (w.YYSD_TIKU_RUN && YYSD_TIKU_RUN.holdClock) YYSD_TIKU_RUN.holdClock(paused);
  }

  /* 官方：音频播放中只留 Volume */
  function playLock(on) {
    document.body.classList.toggle("ets-playing", !!on);
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

  function liveMic() {
    if (!micStream) return null;
    var track = micStream.getAudioTracks()[0];
    if (!track || track.readyState === "ended") {
      micStream = null;
      return null;
    }
    return micStream;
  }

  function hushMic() {
    // ponytail: leave AudioContext open — closing it while a MediaStreamSource
    // is still wired crashes the Chromium renderer on Electron/macOS
    if (micRaf) cancelAnimationFrame(micRaf);
    micRaf = 0;
  }

  function stopMic() {
    hushMic();
    micPending = null;
    if (micStream) {
      micStream.getTracks().forEach(function (t) { t.stop(); });
      micStream = null;
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

  function desktopMic() {
    var d = w.yysdDesktop;
    if (!d || typeof d.mic !== "function") return Promise.resolve(true);
    return Promise.resolve().then(d.mic).then(function (ok) {
      return ok !== false;
    }, function () { return true; });
  }

  var micOpened = false;

  function askMic(force) {
    var live = liveMic();
    if (live) return Promise.resolve(live);
    if (micPending) return micPending;
    // A failed open used to be retried on the next item, and each retry showed the dialog again.
    if (micOpened && !force) return Promise.reject(new Error("no-mic"));
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error("no-mic"));
    }
    micOpened = true;
    micPending = desktopMic().then(function (ok) {
      if (!ok) throw new Error("no-mic");
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }).then(function (stream) {
      micPending = null;
      micStream = stream;
      markMic();
      return stream;
    }, function (err) {
      micPending = null;
      throw err;
    });
    return micPending;
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
    var live = liveMic();
    if (live) {
      hook(live);
      return;
    }
    if (!micPending) {
      if (msg) msg.textContent = "Microphone permission is required for Speaking. You may Continue and allow it later.";
      return;
    }
    micPending.then(function (stream) {
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
      askMic(true).then(function (stream) { if (!micStream) micStream = stream; }).catch(function () {
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

  /* 成绩单闸门只在一场考完时出现；组卷中途同科/换科都跳过 */
  function reportGate(onView) {
    // 只有模考保留这一屏；真题题库（mode=practice）交卷直接进对错复盘
    var m = "";
    var bank = "";
    try {
      var q = new URLSearchParams(location.search);
      m = q.get("mode") || "";
      bank = q.get("bank") || "";
    } catch (e) {}
    if (m !== "mock") { if (onView) onView(); return; }
    var R = w.YYSD_TIKU_RUN;
    if (bank && R && R.peek) {
      var n = R.peek(bank);
      if (n && !n.end) { if (onView) onView(); return; }
    }
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
    $("ets-gate-go").onclick = function () { if (onView) onView(); };
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

  function confirmSubmit(msg, onYes, lab) {
    lab = lab || {};
    var box = $("ets-exit");
    if (!box) { if (onYes) onYes(); return; }
    var h = box.querySelector("h2");
    var p = box.querySelector("p");
    var yes = $("ets-exit-yes");
    var no = $("ets-exit-no");
    if (h) h.textContent = lab.title || "Submit Section";
    if (p) p.textContent = msg;
    if (yes) yes.textContent = lab.yes || "Submit";
    if (no) no.textContent = lab.no || "Cancel";
    box.classList.add("is-on");
    if (yes) yes.onclick = function () { box.classList.remove("is-on"); if (onYes) onYes(); };
    if (no) no.onclick = function () { box.classList.remove("is-on"); };
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

  function leaveTest(opts) {
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
  }

  function bindExit(opts) {
    var exitBtn = $("exit-btn");
    if (exitBtn) {
      exitBtn.classList.remove("hidden");
      exitBtn.textContent = "Pause Test";
      // ponytail: 顶栏只暂停；离场走暂停层 Exit。墙钟由 holdClock 冻 skillEnds。
      exitBtn.onclick = function () { setPaused(true); };
    }
    var leaveBar = $("leave-btn");
    if (leaveBar) {
      leaveBar.classList.remove("hidden");
      leaveBar.textContent = "Exit Test";
      leaveBar.onclick = function () { leaveTest(opts); };
    }
    var leave = $("ets-pause-exit");
    if (leave) leave.onclick = function () { leaveTest(opts); };
  }

  function boot(opts) {
    opts = opts || {};
    ready = opts.onReady;
    bindExit(opts);
    bindHelp(opts.skill);
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
    } else if (!opts.isFull && opts.skill === "speaking" && !hwDone(speakHwId(opts))) {
      queue.push(COPY.volume, COPY.microphone);
    }
    if (COPY[opts.skill] && !(opts.skill === "speaking" && hwDone(speakHwId(opts)))) {
      queue.push(COPY[opts.skill]);
    }
    if (!queue.length) {
      examMode(true);
      if (opts.skill === "speaking" && rememberMic()) askMic().catch(function () {});
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
      hushMic();
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
    if (next) {
      next.onclick = function () {
        var scr = queue[i];
        if (i < queue.length - 1) {
          i += 1;
          paint();
          return;
        }
        if (opts.isFull && opts.skill === "reading") markHw(opts.id);
        if (!opts.isFull && opts.skill === "speaking") markHw(speakHwId(opts));
        hushMic();
        intro.classList.add("hidden");
        next.onclick = oldNext;
        examMode(true);
        if (ready) ready();
      };
    }
  }

  function bindChrome() {
    bindExit({});
    var resume = $("ets-resume");
    if (resume) resume.onclick = function () { setPaused(false); };
    var volBtn = $("vol-btn");
    var pop = $("ets-vol");
    var slider = $("ets-vol-range");
    if (volBtn && pop && slider) {
      if (!$("ets-vol-meter")) {
        var meter = document.createElement("div");
        meter.id = "ets-vol-meter";
        meter.className = "ets-vol-meter";
        meter.setAttribute("aria-hidden", "true");
        pop.insertBefore(meter, pop.firstChild);
      }
      paintVolMeter();
      volBtn.onclick = function () {
        var on = pop.classList.toggle("hidden") === false;
        if (on) {
          var r = volBtn.getBoundingClientRect();
          pop.style.top = (r.bottom) + "px";
          pop.style.left = Math.max(8, r.right - pop.offsetWidth) + "px";
          paintVolMeter();
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
    playLock: playLock,
    applyVol: applyVol,
    playBeep: playBeep,
    playTone: playTone,
    confirmExit: confirmExit,
    confirmSubmit: confirmSubmit,
    bindHelp: bindHelp,
    reportGate: reportGate,
    showFail: showFail,
    levelOf: levelOf,
    hwKey: hwKey,
    askMic: askMic,
    liveMic: liveMic,
    leaving: function () { return leaving; },
    markLeaving: markLeaving
  };
})(window);
