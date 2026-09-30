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
  var toneCtx = null;

  var COPY = {
    general: {
      title: "General Test Information",
      html:
        "<p>This test measures your ability to use English in both everyday and academic contexts. It includes four sections: Reading, Listening, Writing, and Speaking.</p>" +
        "<p>Reading and Listening begin with a mix of everyday and academic materials. The difficulty and number of questions may adjust based on your performance.</p>" +
        "<p>Writing and Speaking tasks reflect real-life communication in personal, academic, or professional settings. When answering questions in the Writing and Speaking sections, be sure to use your own words. Do not include memorized reasons or examples in your responses.</p>" +
        "<p>There will be directions before each section. You may dismiss these directions at any time by selecting <b>Continue</b>.</p>" +
        "<p>During this practice test, you may select <b>Pause Test</b> at any time. This will stop the test until you decide to continue. You may resume the test at any time during the period your test is activated.</p>" +
        "<p><b>Note:</b> On the actual TOEFL iBT, pausing the test during a section is not allowed.</p>" +
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
        '<p id="ets-mic-msg">Select Record, then speak the paragraph. Continue unlocks after your voice stays in the Good range.</p>' +
        "</div></div>"
    },
    reading: {
      title: "Reading Section Directions",
      html:
        "<p>In this section, you will read passages and answer questions about them. Some questions ask you to complete missing letters in a paragraph. Other questions are about everyday notices or academic passages.</p>" +
        "<p>You may return to previous questions in this module if time remains. You cannot return to Module 1 after you begin Module 2.</p>" +
        "<p>Select <b>Continue</b> to begin the Reading section.</p>"
    },
    listening: {
      title: "Listening Section Directions",
      html:
        "<p>In this section, you will hear conversations, announcements, and lectures. For conversations, announcements, and lectures, questions appear after the recording ends. Choose a Response shows the options with the clip.</p>" +
        "<p>In a mock test the audio plays once. Practice mode lets you play again.</p>" +
        "<p>Select <b>Continue</b> to begin the Listening section.</p>"
    },
    writing: {
      title: "Writing Section Directions",
      html:
        "<p>In this section, you will write emails and academic discussion posts. Use your own words. An effective discussion response contains at least 100 words.</p>" +
        "<p>Select <b>Continue</b> to begin the Writing section.</p>"
    },
    speaking: {
      title: "Speaking Section Directions",
      html:
        "<p>In this section, you will repeat what you hear and answer interview questions. Speak in your normal voice. Recordings stay on this device until you export them.</p>" +
        "<p>Select <b>Continue</b> to begin the Speaking section.</p>"
    }
  };

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
      if (paused) a.pause();
    });
  }

  function stopMic() {
    if (micRaf) cancelAnimationFrame(micRaf);
    micRaf = 0;
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

  function startMicListen(msg) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (msg) msg.textContent = "This browser cannot access the microphone.";
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      micStream = stream;
      var Ctx = w.AudioContext || w.webkitAudioContext;
      var ctx = new Ctx();
      var src = ctx.createMediaStreamSource(stream);
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      var data = new Uint8Array(analyser.fftSize);
      function tick() {
        analyser.getByteTimeDomainData(data);
        var sum = 0;
        var i;
        for (i = 0; i < data.length; i++) {
          var v = (data[i] - 128) / 128;
          sum += v * v;
        }
        var rms = Math.sqrt(sum / data.length);
        var lv = levelOf(rms);
        paintMeter(Math.min(20, Math.round(rms * 70)));
        if (lv === 1) {
          micOk = true;
          var next = $("next-btn");
          if (next) next.disabled = false;
          if (msg) msg.textContent = "Good. Select Continue to begin the test.";
        }
        micRaf = requestAnimationFrame(tick);
      }
      tick();
    }).catch(function () {
      if (msg) msg.textContent = "Microphone permission is required. Continue stays locked until the microphone works.";
    });
  }

  function bindMic() {
    var rec = $("ets-record");
    var msg = $("ets-mic-msg");
    var next = $("next-btn");
    micOk = false;
    paintMeter(0);
    if (next) next.disabled = true;
    if (!rec) return;
    rec.onclick = function () {
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

  function confirmExit(onYes) {
    var box = $("ets-exit");
    if (!box) { if (onYes) onYes(); return; }
    box.classList.add("is-on");
    var yes = $("ets-exit-yes");
    var no = $("ets-exit-no");
    if (yes) yes.onclick = function () { box.classList.remove("is-on"); if (onYes) onYes(); };
    if (no) no.onclick = function () { box.classList.remove("is-on"); };
  }

  function boot(opts) {
    opts = opts || {};
    ready = opts.onReady;
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
    }
    if (COPY[opts.skill]) queue.push(COPY[opts.skill]);
    if (!queue.length) {
      examMode(true);
      if (ready) ready();
      return;
    }

    var intro = $("ets-intro");
    var next = $("next-btn");
    var pause = $("pause-btn");
    var volBtn = $("vol-btn");
    var exitBtn = $("exit-btn");
    var i = 0;
    examBtns = [$("hide-time"), $("help-btn"), $("review-btn"), $("back-btn"), $("clock"), exitBtn];
    examMode(false);
    if (pause) {
      pause.classList.toggle("hidden", opts.mode !== "practice");
      pause.onclick = function () { setPaused(true); };
    }
    if (volBtn) {
      volBtn.classList.toggle("hidden", opts.skill !== "listening" && opts.skill !== "speaking" && !opts.isFull);
    }
    if (exitBtn) {
      exitBtn.onclick = function () { confirmExit(opts.onExit); };
    }
    if (intro) intro.classList.remove("hidden");
    if (next) next.textContent = "Continue";

    function paint() {
      var scr = queue[i];
      if (!scr || !intro) return;
      stopMic();
      intro.innerHTML = "<h2>" + scr.title + "</h2>" + scr.html;
      if (next) next.disabled = false;
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
        if (scr && scr.id === "microphone" && !micOk) return;
        if (i < queue.length - 1) {
          i += 1;
          paint();
          return;
        }
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

  w.YYSD_TOEFL_SHELL = {
    boot: boot,
    paused: function () { return paused; },
    applyVol: applyVol,
    playBeep: playBeep,
    playTone: playTone,
    confirmExit: confirmExit,
    levelOf: levelOf,
    hwKey: hwKey
  };
})(window);
