#!/usr/bin/env node
/* Self-check: daily-word spell + pick + speakPass (no network) */
"use strict";

var path = require("path");
var DW = require(path.join(__dirname, "../assets/js/daily-word/core.js"));
var assert = require("assert");

assert.strictEqual(DW.spellCheck("colour", "color").ok, true);
assert.strictEqual(DW.spellCheck("organize", "organise").ok, true);
assert.strictEqual(DW.spellCheck("firm", "firm").ok, true);
assert.strictEqual(DW.spellCheck("farm", "firm").ok, false);

assert.strictEqual(DW.speakPass("television", "television"), true);
assert.strictEqual(DW.speakPass("the television", "television"), true);
assert.strictEqual(DW.speakPass("radio", "television"), false);

var pool = [];
for (var i = 0; i < 40; i++) {
  pool.push({ word: "w" + i, meaning: "义" + i });
}
var first = DW.pickDaily(pool, "gaozhong", 10, {});
assert.strictEqual(first.length, 10);
// random order — must not always be LIST head
var alwaysHead = true;
for (var t = 0; t < 8; t++) {
  var sample = DW.pickDaily(pool, "gaozhong", 10, {});
  if (sample[0].word !== "w0") { alwaysHead = false; break; }
}
assert.strictEqual(alwaysHead, false);

var recs = {};
recs[DW.wordKey("gaozhong", "w5")] = {
  status: "learning", speakingWrong: true, spellingWrong: false, wrongCount: 3, correctCount: 0
};
recs[DW.wordKey("gaozhong", "w6")] = {
  status: "learning", speakingWrong: false, spellingWrong: true, wrongCount: 2, correctCount: 0
};
var mixed = DW.pickDaily(pool, "gaozhong", 10, recs);
assert.strictEqual(mixed.length, 10);

assert.strictEqual(DW.isThemeBook("theme:nce"), true);
assert.strictEqual(DW.isThemeBook("gaozhong"), false);
assert.strictEqual(DW.THEME_PREFIX + "nce", "theme:nce");
console.log("check_daily_word: ok");
