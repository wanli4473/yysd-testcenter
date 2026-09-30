"use strict";
var fs = require("fs");
var path = require("path");
var T = require("../assets/js/toefl-reading.js");
var W = require("../assets/js/toefl-writing.js");
var S = require("../assets/js/toefl-speaking.js");
var F = require("../assets/js/toefl-full.js");
var root = path.join(__dirname, "..");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(root, "library/toefl", name), "utf8"));
}

var reading = load("2025-07-16-reading.json");
var items = T.allItems(reading);
if (items.length !== 50) throw new Error("reading expected 50, got " + items.length);
var fullR = {};
items.forEach(function (it) {
  if (it.type === "complete_words") fullR[it.no] = it.blank.word;
  else fullR[it.no] = it.q.answer;
});
var perfectR = T.scorePaper(reading, fullR);
if (perfectR.score !== 50 || perfectR.band !== 6) throw new Error("full reading " + perfectR.score);
if (fullR[1] !== "field" || fullR[21] !== "A" || fullR[23] !== "C" || fullR[30] !== "D" || fullR[35] !== "A" || fullR[50] !== "B") {
  throw new Error("reading keys " + JSON.stringify({ 1: fullR[1], 21: fullR[21], 23: fullR[23], 30: fullR[30], 35: fullR[35], 50: fullR[50] }));
}
if (!items.filter(function (it) { return it.q && T.isInsertQ(it.q); }).length) {
  throw new Error("expected insert");
}

var listening = load("2025-07-16-listening.json");
var lItems = T.allItems(listening);
if (lItems.length !== 47) throw new Error("listening expected 47, got " + lItems.length);
var fullL = {};
lItems.forEach(function (it) { fullL[it.no] = it.q.answer; });
if (T.scorePaper(listening, fullL).score !== 47) throw new Error("full listening");
listening.tasks.forEach(function (task) {
  if (!fs.existsSync(path.join(root, task.audio))) throw new Error("missing " + task.audio);
  var hide = T.hideQsUntilHeard(task);
  if (task.type === "choose_response" && hide) throw new Error(task.title + " should keep options");
  if (task.type !== "choose_response" && !hide) throw new Error(task.title + " must listen first");
});
if (lItems[0].q.answer !== "A" || lItems[46].q.answer !== "C") throw new Error("L keys");

var writing = load("2025-07-16-writing.json");
if (W.screensOf(writing).length !== 12) throw new Error("writing screens");
if (writing.tasks.filter(function (t) { return t.type === "sentence"; }).length !== 10) throw new Error("10 sentences");
writing.tasks.forEach(function (t) {
  if (t.type === "email" && W.wordCount(t.sample) < 80) throw new Error("email sample");
  if (t.type === "discussion") {
    t.samples.forEach(function (s) {
      if (W.wordCount(s.text) < 100) throw new Error("discussion sample");
    });
    t.posts.concat([t.professor]).forEach(function (p) {
      if (!fs.existsSync(path.join(root, p.photo))) throw new Error("missing " + p.photo);
    });
  }
});

var speaking = load("2025-07-16-speaking.json");
if (S.screensOf(speaking).length !== 11) throw new Error("speaking screens " + S.screensOf(speaking).length);
speaking.tasks.forEach(function (t) {
  if (!fs.existsSync(path.join(root, t.audio))) throw new Error("missing " + t.audio);
  if (!t.sample) throw new Error("sample " + t.id);
});
if (speaking.tasks[0].sample.indexOf("Store documents") < 0) throw new Error("Q1 sample");

if (F.nextHref("2025-07-16", "mock", "reading").indexOf("toefl-listening.html") < 0) {
  throw new Error("716 next");
}
console.log("ok toefl-716 50r + 47l + 12w + 11s");
