/* =========================================================================
   word-realm-sfx.js — 零素材 SFX（Web Audio 合成），可静音
   localStorage: yysd:word-realm-mute = "1"
   ========================================================================= */
window.YYSD_WORD_REALM_SFX = (function () {
  "use strict";
  var MUTE_KEY = "yysd:word-realm-mute";
  var ctx = null;

  function muted() {
    try { return localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { return false; }
  }

  function setMuted(on) {
    try { localStorage.setItem(MUTE_KEY, on ? "1" : "0"); } catch (e) {}
  }

  function ac() {
    if (muted()) return null;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") {
      try { ctx.resume(); } catch (e) {}
    }
    return ctx;
  }

  function beep(freq, dur, type, gain) {
    var c = ac();
    if (!c) return;
    var t0 = c.currentTime;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain == null ? 0.04 : gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function hit(crit) {
    // slash whoosh + cut
    beep(crit ? 220 : 180, 0.05, "sawtooth", 0.03);
    setTimeout(function () {
      beep(crit ? 720 : 560, 0.07, "square", 0.05);
    }, 30);
    if (crit) setTimeout(function () { beep(990, 0.08, "triangle", 0.04); }, 70);
  }

  function hurt() {
    beep(180, 0.12, "sawtooth", 0.05);
  }

  function win() {
    beep(523, 0.1, "triangle", 0.04);
    setTimeout(function () { beep(659, 0.1, "triangle", 0.04); }, 90);
    setTimeout(function () { beep(784, 0.16, "triangle", 0.045); }, 180);
  }

  function lose() {
    beep(220, 0.15, "sawtooth", 0.04);
    setTimeout(function () { beep(165, 0.22, "triangle", 0.035); }, 120);
  }

  function ui() {
    beep(440, 0.04, "sine", 0.025);
  }

  return {
    MUTE_KEY: MUTE_KEY,
    muted: muted,
    setMuted: setMuted,
    hit: hit,
    hurt: hurt,
    win: win,
    lose: lose,
    ui: ui
  };
})();
