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

var reading = load("2025-08-12-reading.json");
var items = T.allItems(reading);
if (items.length !== 65) throw new Error("reading expected 65, got " + items.length);
var fullR = {};
items.forEach(function (it) {
  if (it.type === "complete_words") fullR[it.no] = it.blank.word;
  else fullR[it.no] = it.q.answer;
});
var perfectR = T.scorePaper(reading, fullR);
if (perfectR.score !== 65 || perfectR.band !== 6) throw new Error("full reading " + perfectR.score + " band " + perfectR.band);
if (fullR[1] !== "regions" || fullR[51] !== "B" || fullR[56] !== "C" || fullR[65] !== "B") {
  throw new Error("reading keys " + JSON.stringify({ 1: fullR[1], 51: fullR[51], 56: fullR[56], 65: fullR[65] }));
}

var listening = load("2025-08-12-listening.json");
var lItems = T.allItems(listening);
if (lItems.length !== 20) throw new Error("listening expected 20, got " + lItems.length);
var fullL = {};
lItems.forEach(function (it) { fullL[it.no] = it.q.answer; });
if (T.scorePaper(listening, fullL).score !== 20) throw new Error("full listening");
listening.tasks.forEach(function (task) {
  if (!fs.existsSync(path.join(root, task.audio))) throw new Error("missing " + task.audio);
  if (!T.hideQsUntilHeard(task)) throw new Error(task.title + " must listen first");
});
if (lItems[0].q.answer !== "D" || lItems[19].q.answer !== "C") throw new Error("L keys");

var writing = load("2025-08-12-writing.json");
if (W.screensOf(writing).length !== 9) throw new Error("writing screens " + W.screensOf(writing).length);
writing.tasks.forEach(function (t) {
  if (t.type === "email" && W.wordCount(t.sample) < 80) throw new Error("email sample " + t.id);
  if (t.type === "discussion") {
    t.samples.forEach(function (s) {
      if (W.wordCount(s.text) < 100) throw new Error("discussion sample " + t.id);
    });
    t.posts.concat([t.professor]).forEach(function (p) {
      if (!fs.existsSync(path.join(root, p.photo))) throw new Error("missing " + p.photo);
    });
  }
});

var speaking = load("2025-08-12-speaking.json");
if (S.screensOf(speaking).length !== 11) throw new Error("speaking screens " + S.screensOf(speaking).length);
speaking.tasks.forEach(function (t) {
  if (!fs.existsSync(path.join(root, t.audio))) throw new Error("missing " + t.audio);
  if (!t.sample) throw new Error("sample " + t.id);
});
if (speaking.tasks[0].sample.indexOf("Women's Clothing") < 0) throw new Error("Q1 sample");

if (F.nextHref("2025-08-12", "mock", "reading").indexOf("toefl-listening.html") < 0) {
  throw new Error("812 next");
}
console.log("ok toefl-812cn 65r + 20l + 9w + 11s");
