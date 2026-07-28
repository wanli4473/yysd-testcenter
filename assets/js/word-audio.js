/* =========================================================================
   word-audio.js — dictionary human audio for vocab words (Youdao UK)
   speak(text, onEnd) / cancel() / installSpeechPatch()
   ponytail: Youdao CDN; self-host if blocked — swap URL only here
   ========================================================================= */
(function (global) {
  "use strict";
  var audio = null;
  var fallingBack = false;

  function youdaoUrl(text) {
    return "https://dict.youdao.com/dictvoice?audio=" +
      encodeURIComponent(text) + "&type=1";
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

  function ttsSpeak(text, onEnd) {
    if (!global.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    try {
      fallingBack = true;
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB";
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

  function speak(text, onEnd) {
    text = String(text || "").trim();
    if (!text) { if (onEnd) onEnd(); return; }
    cancel();
    // Chinese → system TTS (no Youdao English clip)
    if (/[\u4e00-\u9fff]/.test(text)) {
      ttsSpeak(text, onEnd);
      return;
    }
    var a = new Audio(youdaoUrl(text));
    audio = a;
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (audio === a) audio = null;
      if (onEnd) onEnd();
    }
    a.onended = finish;
    a.onerror = function () {
      if (audio === a) audio = null;
      ttsSpeak(text, onEnd);
    };
    var p = a.play();
    if (p && p.catch) {
      p.catch(function () {
        if (done) return;
        if (audio === a) audio = null;
        ttsSpeak(text, onEnd);
      });
    }
  }

  /** Route iframe LIST speakWord (via speechSynthesis) through Youdao. */
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
      stopAudio();
      origCancel();
      var a = new Audio(youdaoUrl(text));
      audio = a;
      var settled = false;
      function fire(handler) {
        try {
          if (typeof handler === "function") handler.call(utterance);
        } catch (e) {}
      }
      function fallback() {
        if (settled) return;
        settled = true;
        if (audio === a) audio = null;
        fallingBack = true;
        try {
          origSpeak(utterance);
        } finally {
          setTimeout(function () { fallingBack = false; }, 0);
        }
      }
      a.onended = function () {
        if (settled) return;
        settled = true;
        if (audio === a) audio = null;
        fire(utterance.onend);
      };
      a.onerror = fallback;
      var p = a.play();
      if (p && p.catch) p.catch(fallback);
    };

    synth.__yysdWordAudioPatched = true;
  }

  global.YysdWordAudio = {
    speak: speak,
    cancel: cancel,
    installSpeechPatch: installSpeechPatch
  };
})(typeof window !== "undefined" ? window : this);
