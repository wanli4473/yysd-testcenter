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

var reading = load("2025-07-04-reading.json");
var items = T.allItems(reading);
if (items.length !== 65) throw new Error("reading expected 65, got " + items.length);
var fullR = {};
items.forEach(function (it) {
  if (it.type === "complete_words") fullR[it.no] = it.blank.word;
  else fullR[it.no] = it.q.answer;
});
var perfectR = T.scorePaper(reading, fullR);
if (perfectR.score !== 65 || perfectR.band !== 6) {
  throw new Error("full reading " + perfectR.score + " band " + perfectR.band);
}
if (fullR[1] !== "produced" || fullR[11] !== "can" || fullR[21] !== "societies" || fullR[31] !== "orbiting" || fullR[40] !== "of" || fullR[41] !== "D" || fullR[45] !== "B" || fullR[46] !== "B" || fullR[65] !== "B") {
  throw new Error("reading keys " + JSON.stringify({ 1: fullR[1], 11: fullR[11], 21: fullR[21], 31: fullR[31], 40: fullR[40], 41: fullR[41], 45: fullR[45], 46: fullR[46], 65: fullR[65] }));
}
if (!items.filter(function (it) { return it.q && T.isInsertQ(it.q); }).length) {
  throw new Error("expected insert");
}

var listening = load("2025-07-04-listening.json");
var lItems = T.allItems(listening);
if (lItems.length !== 12) throw new Error("listening expected 12, got " + lItems.length);
var fullL = {};
lItems.forEach(function (it) { fullL[it.no] = it.q.answer; });
if (T.scorePaper(listening, fullL).score !== 12) throw new Error("full listening");
listening.tasks.forEach(function (task) {
  if (!fs.existsSync(path.join(root, task.audio))) throw new Error("missing " + task.audio);
  if (!T.hideQsUntilHeard(task)) throw new Error(task.title + " must listen first");
});
if (lItems[0].q.answer !== "B" || lItems[11].q.answer !== "C") throw new Error("L keys");

var writing = load("2025-07-04-writing.json");
if (W.screensOf(writing).length !== 10) throw new Error("writing screens");
if (writing.tasks.filter(function (t) { return t.type === "email"; }).length !== 4) throw new Error("4 emails");
if (writing.tasks.filter(function (t) { return t.type === "discussion"; }).length !== 6) throw new Error("6 discussions");
writing.tasks.forEach(function (t) {
  if (t.type === "email" && W.wordCount(t.sample) < 80) throw new Error("email " + t.id);
  if (t.type === "discussion") {
    t.samples.forEach(function (s) {
      if (W.wordCount(s.text) < 100) throw new Error("discussion " + t.id + " " + s.title);
    });
    t.posts.concat([t.professor]).forEach(function (p) {
      if (!fs.existsSync(path.join(root, p.photo))) throw new Error("missing " + p.photo);
    });
  }
});

function checkSpeak(name, n) {
  var paper = load(name);
  if (S.screensOf(paper).length !== n) throw new Error(name + " screens " + S.screensOf(paper).length);
  paper.tasks.forEach(function (t) {
    if (!fs.existsSync(path.join(root, t.audio))) throw new Error("missing " + t.audio);
    if (!t.sample) throw new Error(name + " Q" + t.id);
  });
  return paper;
}
var s1 = checkSpeak("2025-07-04-speaking.json", 11);
if (s1.tasks[0].sample.indexOf("student ID") < 0) throw new Error("form1 Q1");
checkSpeak("2025-07-04-speaking-f2.json", 11);
checkSpeak("2025-07-04-speaking-f3.json", 11);
checkSpeak("2025-07-04-speaking-f4.json", 11);
checkSpeak("2025-07-04-speaking-f5.json", 11);

if (F.nextHref("2025-07-04", "mock", "reading").indexOf("toefl-listening.html") < 0) {
  throw new Error("704cn next");
}
console.log("ok toefl-704cn 65r + 12l + 10w + 5 speaking forms");
