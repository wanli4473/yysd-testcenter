/* =========================================================================
   word-audio.js — Youdao dictionary audio (UK type=1 / US type=2)
   speak(text, onEndOrOpts, accent?) / cancel() / installSpeechPatch()
   ponytail: Youdao CDN; self-host if blocked — swap URL only here
   ========================================================================= */
(function (global) {
  "use strict";
  var audio = null;
  var fallingBack = false;
  var speakGen = 0;
  var ttsTimer = null;
  var cacheBust = 0;
  // 1 = UK, 2 = US
  var defaultAccent = 1;

  function normalizeAccent(accent) {
    if (accent === 2 || accent === "2" || accent === "us" || accent === "US" || accent === "en-US") return 2;
    if (accent === 1 || accent === "1" || accent === "uk" || accent === "UK" || accent === "en-GB") return 1;
    return defaultAccent;
  }

  function youdaoUrl(text, accent) {
    return "https://dict.youdao.com/dictvoice?audio=" +
      encodeURIComponent(text) + "&type=" + normalizeAccent(accent) +
      "&_=" + (++cacheBust);
  }

  function stopAudio() {
    if (!audio) return;
    try {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      // ponytail: skip load() — empty-src load() can replay the last file
    } catch (e) {}
    audio = null;
  }

  function clearTtsTimer() {
    if (!ttsTimer) return;
    clearTimeout(ttsTimer);
    ttsTimer = null;
  }

  function cancel() {
    speakGen++;
    stopAudio();
    clearTtsTimer();
    if (global.speechSynthesis) {
      try { global.speechSynthesis.cancel(); } catch (e) {}
    }
    fallingBack = false;
  }

  function ttsSpeak(text, onEnd, accent) {
    if (!global.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    var gen = speakGen;
    try {
      fallingBack = true;
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = normalizeAccent(accent) === 2 ? "en-US" : "en-GB";
      u.rate = 0.9;
      u.onend = function () {
        if (gen !== speakGen) return;
        fallingBack = false;
        if (onEnd) onEnd();
      };
      u.onerror = function () {
        if (gen !== speakGen) return;
        fallingBack = false;
        if (onEnd) onEnd();
      };
      clearTtsTimer();
      // ponytail: Chrome replays the cancelled utterance if speak() is sync after cancel()
      ttsTimer = setTimeout(function () {
        ttsTimer = null;
        if (gen !== speakGen) return;
        try {
          global.speechSynthesis.speak(u);
        } catch (e) {
          fallingBack = false;
          if (onEnd) onEnd();
        }
      }, 50);
    } catch (e) {
      fallingBack = false;
      if (onEnd) onEnd();
    }
  }

  function playYoudao(text, accent, onOk, onFail) {
    var gen = speakGen;
    var aEl = new Audio();
    aEl.src = youdaoUrl(text, accent);
    audio = aEl;
    var done = false;
    function settle(fn) {
      if (gen !== speakGen || done) return;
      done = true;
      if (audio === aEl) audio = null;
      if (fn) fn();
    }
    aEl.onended = function () { settle(onOk); };
    aEl.onerror = function () { settle(onFail); };
    var p = aEl.play();
    if (p && p.catch) p.catch(function () { settle(onFail); });
  }

  /**
   * speak(text, onEnd)
   * speak(text, accent, onEnd)
   * speak(text, { accent, onEnd })
   */
  function speak(text, a, b) {
    text = String(text || "").trim();
    var onEnd = null;
    var accent = defaultAccent;
    if (a && typeof a === "object") {
      accent = a.accent != null ? a.accent : defaultAccent;
      onEnd = a.onEnd || null;
    } else if (typeof a === "function") {
      onEnd = a;
      if (b != null && typeof b !== "function") accent = b;
    } else if (a != null) {
      accent = a;
      onEnd = typeof b === "function" ? b : null;
    }
    if (!text) { if (onEnd) onEnd(); return; }
    cancel();
    if (/[\u4e00-\u9fff]/.test(text)) {
      ttsSpeak(text, onEnd, accent);
      return;
    }
    playYoudao(text, accent, onEnd, function () {
      ttsSpeak(text, onEnd, accent);
    });
  }

  function speakUk(text, onEnd) { speak(text, 1, onEnd); }
  function speakUs(text, onEnd) { speak(text, 2, onEnd); }

  /** Route iframe LIST speakWord (via speechSynthesis) through Youdao.
   *  utterance.lang en-US → US; else UK. */
  function installSpeechPatch() {
    var synth = global.speechSynthesis;
    if (!synth || synth.__yysdWordAudioPatched) return;
    var origSpeak = synth.speak.bind(synth);
    var origCancel = synth.cancel.bind(synth);

    synth.cancel = function () {
      speakGen++;
      stopAudio();
      clearTtsTimer();
      origCancel();
    };

    synth.speak = function (utterance) {
      if (fallingBack) {
        origSpeak(utterance);
        return;
      }
      var text = String((utterance && utterance.text) || "").trim();
      if (!text || /[\u4e00-\u9fff]/.test(text)) {
        origSpeak(utterance);
        return;
      }
      var accent = /en-US/i.test((utterance && utterance.lang) || "") ? 2 : 1;
      speakGen++;
      stopAudio();
      origCancel();
      function fire(handler) {
        try {
          if (typeof handler === "function") handler.call(utterance);
        } catch (e) {}
      }
      playYoudao(text, accent, function () {
        fire(utterance.onend);
      }, function () {
        fallingBack = true;
        try {
          origSpeak(utterance);
        } finally {
          setTimeout(function () { fallingBack = false; }, 0);
        }
      });
    };

    synth.__yysdWordAudioPatched = true;
  }

  global.YysdWordAudio = {
    speak: speak,
    speakUk: speakUk,
    speakUs: speakUs,
    cancel: cancel,
    installSpeechPatch: installSpeechPatch,
    UK: 1,
    US: 2
  };
})(typeof window !== "undefined" ? window : this);
