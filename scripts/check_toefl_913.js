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

var reading = load("2025-09-13-reading.json");
var items = T.allItems(reading);
if (items.length !== 111) throw new Error("reading expected 111, got " + items.length);
var emptyR = T.scorePaper(reading, {});
if (emptyR.score !== 0 || emptyR.total !== 111 || emptyR.band !== 1) {
  throw new Error("empty reading " + emptyR.score + "/" + emptyR.total + " band " + emptyR.band);
}
var fullR = {};
items.forEach(function (it) {
  if (it.type === "complete_words") fullR[it.no] = it.blank.word;
  else fullR[it.no] = it.q.answer;
});
var perfectR = T.scorePaper(reading, fullR);
if (perfectR.score !== 111 || perfectR.band !== 6 || perfectR.scaled30 !== 30) {
  throw new Error("full reading " + perfectR.score + " band " + perfectR.band);
}
if (fullR[1] !== "combines" || fullR[71] !== "C" || fullR[76] !== "D") {
  throw new Error("reading keys Q1/Q71/Q76");
}
var inserts = items.filter(function (it) { return it.q && T.isInsertQ(it.q); });
if (inserts.length < 1) throw new Error("expected insert questions");

var listening = load("2025-09-13-listening.json");
var lItems = T.allItems(listening);
if (lItems.length !== 58) throw new Error("listening expected 58, got " + lItems.length);
var fullL = {};
lItems.forEach(function (it) { fullL[it.no] = it.q.answer; });
var perfectL = T.scorePaper(listening, fullL);
if (perfectL.score !== 58 || perfectL.band !== 6) throw new Error("full listening " + perfectL.score);
listening.tasks.forEach(function (task) {
  if (!fs.existsSync(path.join(root, task.audio))) throw new Error("missing " + task.audio);
  if (!T.hideQsUntilHeard(task)) throw new Error(task.title + " must listen first");
});
if (listening.tasks[14].type !== "announcement") throw new Error("form 15 announcement");
if (lItems[0].q.answer !== "B" || lItems[57].q.answer !== "A") throw new Error("L1Q1 / Ann Q2 keys");

var writing = load("2025-09-13-writing.json");
var wScreens = W.screensOf(writing);
if (wScreens.length !== 7) throw new Error("writing screens " + wScreens.length);
if (writing.tasks.filter(function (t) { return t.type === "email"; }).length !== 4) throw new Error("need 4 emails");
if (writing.tasks.filter(function (t) { return t.type === "discussion"; }).length !== 3) throw new Error("need 3 discussions");
var emptyW = W.scorePaper(writing, {});
if (emptyW.total !== 0) throw new Error("9.13 has no sentences, total " + emptyW.total);
writing.tasks.forEach(function (t) {
  if (t.type === "email" && W.wordCount(t.sample) < 80) throw new Error("email " + t.id + " sample short");
  if (t.type === "discussion") {
    if (!t.samples || t.samples.length !== 2) throw new Error("discussion " + t.id + " samples");
    t.samples.forEach(function (s) {
      if (W.wordCount(s.text) < 100) throw new Error("discussion " + t.id + " sample too short");
    });
    (t.posts || []).concat([t.professor]).forEach(function (p) {
      if (!fs.existsSync(path.join(root, p.photo))) throw new Error("missing photo " + p.photo);
    });
  }
});

function checkSpeak(name, repeats, interviews) {
  var paper = load(name);
  var screens = S.screensOf(paper);
  if (screens.length !== repeats + interviews) throw new Error(name + " screens " + screens.length);
  paper.tasks.forEach(function (t) {
    if (!fs.existsSync(path.join(root, t.audio))) throw new Error("missing " + t.audio);
    if (!t.sample) throw new Error(name + " Q" + t.id + " missing sample");
  });
  return paper;
}
var s1 = checkSpeak("2025-09-13-speaking.json", 7, 4);
if (s1.tasks[0].sample !== "Look towards the treetops where you can find nests.") {
  throw new Error("form1 Q1 sample");
}
checkSpeak("2025-09-13-speaking-f2.json", 7, 4);
checkSpeak("2025-09-13-speaking-f3.json", 7, 4);
checkSpeak("2025-09-13-speaking-f4.json", 7, 4);

if (F.nextHref("2025-09-13", "mock", "reading").indexOf("toefl-listening.html") < 0) {
  throw new Error("913 next listening");
}
["reading", "listening", "writing", "speaking"].forEach(function (skill) {
  if (!fs.existsSync(path.join(root, "library/toefl/2025-09-13-" + skill + ".json"))) {
    throw new Error("missing " + skill);
  }
});

console.log("ok toefl-913 111r + 58l + 7w + 4 speaking forms");
