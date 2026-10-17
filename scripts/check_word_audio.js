#!/usr/bin/env node
/** Stale Youdao/TTS must not replay the previous word. Exit 1 on failure. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var assert = require("assert");
var root = path.join(__dirname, "..");

function FakeAudio() {
  this.src = "";
  this.onended = null;
  this.onerror = null;
  this._paused = true;
  this._loaded = false;
  FakeAudio.instances.push(this);
}
FakeAudio.instances = [];
FakeAudio.prototype.pause = function () { this._paused = true; };
FakeAudio.prototype.removeAttribute = function (name) {
  if (name === "src") this.src = "";
};
FakeAudio.prototype.load = function () { this._loaded = true; };
FakeAudio.prototype.play = function () {
  var self = this;
  this._paused = false;
  return {
    catch: function (fn) {
      self._reject = fn;
      return this;
    }
  };
};

var timers = [];
var spoken = [];
var sandbox = {
  Audio: FakeAudio,
  SpeechSynthesisUtterance: function (text) {
    this.text = text;
    this.lang = "";
    this.rate = 1;
  },
  setTimeout: function (fn) {
    timers.push(fn);
    return timers.length;
  },
  clearTimeout: function (id) {
    if (id) timers[id - 1] = null;
  },
  speechSynthesis: {
    cancel: function () {},
    speak: function (u) { spoken.push(u && u.text); }
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets/js/word-audio.js"), "utf8"),
  sandbox
);
var WA = sandbox.YysdWordAudio;
assert.ok(WA && WA.speakUs, "YysdWordAudio.speakUs");

function lastAudio() {
  return FakeAudio.instances[FakeAudio.instances.length - 1];
}
function flush() {
  var q = timers.slice();
  timers.length = 0;
  q.forEach(function (fn) { if (fn) fn(); });
}

WA.speakUs("apple");
assert.ok(/audio=apple/.test(lastAudio().src), "apple url");
assert.ok(/[?&]_=\d+/.test(lastAudio().src), "cache bust");
var first = lastAudio();

WA.speakUs("banana");
assert.ok(first._paused, "paused previous");
assert.strictEqual(first.src, "", "cleared previous src");
assert.strictEqual(first._loaded, false, "no empty-src load");
assert.ok(/audio=banana/.test(lastAudio().src), "banana url");
assert.notStrictEqual(first.src, lastAudio().src, "new element src");

WA.speakUs("apple");
var appleAgain = lastAudio().src;
WA.speakUs("apple");
assert.notStrictEqual(appleAgain, lastAudio().src, "same word still unique url");

spoken.length = 0;
WA.speakUs("cat");
var cat = lastAudio();
WA.speakUs("dog");
assert.ok(typeof cat._reject === "function", "play() catch hooked");
cat._reject();
flush();
assert.ok(spoken.indexOf("cat") < 0, "stale reject does not tts cat");

spoken.length = 0;
lastAudio()._reject();
assert.strictEqual(spoken.length, 0, "tts not sync after cancel");
flush();
assert.deepStrictEqual(spoken, ["dog"], "tts speaks current word");

spoken.length = 0;
WA.speakUs("one");
lastAudio()._reject();
WA.speakUs("two");
lastAudio()._reject();
flush();
assert.deepStrictEqual(spoken, ["two"], "only latest tts");

var ui = fs.readFileSync(path.join(root, "assets/js/vocab-challenge-ui.js"), "utf8");
assert.ok(ui.indexOf("setTimeout(function () { speak(w.word); }, 250)") < 0, "challenge no delayed auto-speak");
assert.ok(ui.indexOf("speak(w.word)") >= 0, "challenge still auto-speaks");

var quiz = fs.readFileSync(path.join(root, "assets/js/vocab-quiz.js"), "utf8");
assert.ok(quiz.indexOf("setTimeout(function () { speak(w.word); }, 250)") < 0, "quiz no delayed auto-speak");

var html = fs.readFileSync(path.join(root, "vocab-challenge.html"), "utf8");
assert.ok(html.indexOf("word-audio.js?v=20260904speak1") >= 0, "challenge cache-bust word-audio");

console.log("ok");
