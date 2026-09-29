"use strict";
var fs = require("fs");
var path = require("path");
var T = require("../assets/js/toefl-reading.js");
var root = path.join(__dirname, "..");
var paper = JSON.parse(fs.readFileSync(path.join(root, "library/toefl/2025-09-02-listening.json"), "utf8"));

var items = T.allItems(paper);
if (items.length !== 47) throw new Error("expected 47 items, got " + items.length);

var screens = T.screensOf(paper);
if (screens.length !== 47) throw new Error("expected 47 screens, got " + screens.length);
if (screens.filter(function (s) { return s.module === 1; }).length !== 32) {
  throw new Error("module 1 should have 32 screens");
}
if (screens.filter(function (s) { return s.module === 2; }).length !== 15) {
  throw new Error("module 2 should have 15 screens");
}

var empty = T.scorePaper(paper, {});
if (empty.score !== 0 || empty.total !== 47 || empty.band !== 1) {
  throw new Error("empty should be 0/47 band 1, got " + empty.score + " band " + empty.band);
}

var full = {};
items.forEach(function (it) { full[it.no] = it.q.answer; });
var perfect = T.scorePaper(paper, full);
if (perfect.score !== 47 || perfect.band !== 6 || perfect.scaled30 !== 30) {
  throw new Error("full should be 47/47 band 6, got " + perfect.score + " band " + perfect.band);
}

var key = {
  1: "A", 2: "B", 3: "B", 4: "B", 5: "A", 6: "D", 7: "D", 8: "A", 9: "A", 10: "B",
  11: "A", 12: "B", 13: "A", 14: "D", 15: "D", 16: "A", 17: "B", 18: "C", 19: "C", 20: "D",
  21: "B", 22: "B", 23: "D", 24: "C", 25: "A", 26: "C", 27: "B", 28: "C", 29: "B", 30: "A",
  31: "D", 32: "D", 33: "A", 34: "A", 35: "A", 36: "D", 37: "A", 38: "A", 39: "B", 40: "B",
  41: "C", 42: "D", 43: "C", 44: "B", 45: "D", 46: "C", 47: "C"
};
Object.keys(key).forEach(function (n) {
  var it = items.filter(function (x) { return String(x.no) === n; })[0];
  if (!it || it.q.answer !== key[n]) throw new Error("Q" + n + " should be " + key[n]);
});

paper.tasks.forEach(function (task) {
  var audio = path.join(root, task.audio);
  if (!fs.existsSync(audio)) throw new Error("missing audio " + task.audio);
});

if (T.rawTo30(38, 47) !== 24 || T.bandFrom30(24) !== 5) {
  throw new Error("38/47 should map to 24 → 5");
}

console.log("ok toefl-902-listening 47 items band 1–6");
