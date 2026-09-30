/* Official-like TOEFL chrome: intro screens, pause, volume */
(function (w) {
  "use strict";

  var paused = false;
  var vol = 1;
  var ready = null;
  var examBtns = [];

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
      title: "Adjusting the Volume",
      html:
        "<p>To adjust the volume, select the <b>Volume</b> icon at the top of the screen. The volume control will appear. Move the volume indicator to the left or the right to change the volume.</p>" +
        "<p>To close the volume control, select the <b>Volume</b> icon again.</p>" +
        "<p>You will be able to change the volume during the test if you need to.</p>" +
        "<p>You now have the option to adjust the volume.</p>"
    },
    microphone: {
      title: "Adjusting the Microphone",
      html:
        "<p>In order to check your microphone volume, you will speak into the microphone using your normal tone and volume. For best recording results, your voice level should remain generally within the <b>Good</b> range.</p>" +
        '<div class="ets-mic-row"><div class="ets-record" aria-hidden="true">RECORD</div><div>' +
        "<p>Select the <b>Record</b> button. A timer will count down until the system is ready to record.</p>" +
        "<p>To check your microphone level, you will record the following paragraph using your normal tone and volume.</p>" +
        "<p>There are several reasons why I would prefer to live in a large city. Some of the greatest advantages would include the number of job opportunities and career options, public transportation, greater diversity, and a wealth of entertainment. Also, large cities typically have a great deal to offer in terms of history, art and culture.</p>" +
        "<p>On this practice system, select <b>Continue</b> when you are ready. You will not be able to adjust the microphone during the test.</p>" +
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

  function applyVol() {
    document.querySelectorAll("audio").forEach(function (a) { a.volume = vol; });
  }

  function setPaused(on) {
    paused = !!on;
    var box = $("ets-pause");
    if (box) box.classList.toggle("is-on", paused);
    document.querySelectorAll("audio").forEach(function (a) {
      if (paused) a.pause();
    });
  }

  function examMode(on) {
    examBtns.forEach(function (el) {
      if (!el) return;
      el.classList.toggle("hidden", !on);
    });
    var next = $("next-btn");
    if (next && on) next.textContent = "Next";
    document.body.classList.toggle("ets-booting", !on);
    var pop = $("ets-vol");
    if (on && pop) pop.classList.add("hidden");
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
    if (opts.isFull && opts.skill === "reading") {
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
    var i = 0;
    examBtns = [$("hide-time"), $("help-btn"), $("review-btn"), $("back-btn"), $("clock")];
    examMode(false);
    if (pause) {
      pause.classList.toggle("hidden", opts.mode !== "practice");
      pause.onclick = function () { setPaused(true); };
    }
    if (volBtn) {
      volBtn.classList.toggle("hidden", opts.skill !== "listening" && opts.skill !== "speaking" && !opts.isFull);
    }
    if (intro) intro.classList.remove("hidden");
    if (next) next.textContent = "Continue";

    function paint() {
      var scr = queue[i];
      if (!scr || !intro) return;
      intro.innerHTML = "<h2>" + scr.title + "</h2>" + scr.html;
    }
    paint();

    var oldNext = next && next.onclick;
    if (next) {
      next.onclick = function () {
        if (i < queue.length - 1) {
          i += 1;
          paint();
          return;
        }
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
    if (w.MutationObserver) {
      new MutationObserver(applyVol).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindChrome);
  else bindChrome();

  w.YYSD_TOEFL_SHELL = {
    boot: boot,
    paused: function () { return paused; },
    applyVol: applyVol
  };
})(window);
