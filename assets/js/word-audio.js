/* =========================================================================
   word-audio.js — Youdao dictionary audio (UK type=1 / US type=2)
   speak(text, onEndOrOpts, accent?) / cancel() / installSpeechPatch()
   ponytail: Youdao CDN; self-host if blocked — swap URL only here
   ========================================================================= */
(function (global) {
  "use strict";
  var audio = null;
  var fallingBack = false;
  // 1 = UK, 2 = US
  var defaultAccent = 1;

  function normalizeAccent(accent) {
    if (accent === 2 || accent === "2" || accent === "us" || accent === "US" || accent === "en-US") return 2;
    if (accent === 1 || accent === "1" || accent === "uk" || accent === "UK" || accent === "en-GB") return 1;
    return defaultAccent;
  }

  function youdaoUrl(text, accent) {
    return "https://dict.youdao.com/dictvoice?audio=" +
      encodeURIComponent(text) + "&type=" + normalizeAccent(accent);
  }

  function stopAudio() {
    if (!audio) return;
    try {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch (e) {}
    audio = null;
  }

  function ttsSpeak(text, onEnd, accent) {
    if (!global.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    try {
      fallingBack = true;
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = normalizeAccent(accent) === 2 ? "en-US" : "en-GB";
      u.rate = 0.9;
      u.onend = function () { fallingBack = false; if (onEnd) onEnd(); };
      u.onerror = function () { fallingBack = false; if (onEnd) onEnd(); };
      global.speechSynthesis.speak(u);
    } catch (e) {
      fallingBack = false;
      if (onEnd) onEnd();
    }
  }

  function cancel() {
    stopAudio();
    if (global.speechSynthesis) {
      try { global.speechSynthesis.cancel(); } catch (e) {}
    }
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
    var aEl = new Audio(youdaoUrl(text, accent));
    audio = aEl;
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (audio === aEl) audio = null;
      if (onEnd) onEnd();
    }
    aEl.onended = finish;
    aEl.onerror = function () {
      if (audio === aEl) audio = null;
      ttsSpeak(text, onEnd, accent);
    };
    var p = aEl.play();
    if (p && p.catch) {
      p.catch(function () {
        if (done) return;
        if (audio === aEl) audio = null;
        ttsSpeak(text, onEnd, accent);
      });
    }
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
      stopAudio();
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
      stopAudio();
      origCancel();
      var aEl = new Audio(youdaoUrl(text, accent));
      audio = aEl;
      var settled = false;
      function fire(handler) {
        try {
          if (typeof handler === "function") handler.call(utterance);
        } catch (e) {}
      }
      function fallback() {
        if (settled) return;
        settled = true;
        if (audio === aEl) audio = null;
        fallingBack = true;
        try {
          origSpeak(utterance);
        } finally {
          setTimeout(function () { fallingBack = false; }, 0);
        }
      }
      aEl.onended = function () {
        if (settled) return;
        settled = true;
        if (audio === aEl) audio = null;
        fire(utterance.onend);
      };
      aEl.onerror = fallback;
      var p = aEl.play();
      if (p && p.catch) p.catch(fallback);
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
