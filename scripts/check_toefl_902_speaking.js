"use strict";
var fs = require("fs");
var path = require("path");
var S = require("../assets/js/toefl-speaking.js");
var root = path.join(__dirname, "..");
var paper = JSON.parse(fs.readFileSync(path.join(root, "library/toefl/2025-09-02-speaking.json"), "utf8"));

var screens = S.screensOf(paper);
if (screens.length !== 11) throw new Error("expected 11 screens, got " + screens.length);
if (screens.filter(function (s) { return s.type === "repeat"; }).length !== 7) throw new Error("need 7 repeats");
if (screens.filter(function (s) { return s.type === "interview"; }).length !== 4) throw new Error("need 4 interview");

paper.tasks.forEach(function (t) {
  var audio = path.join(root, t.audio);
  if (!fs.existsSync(audio)) throw new Error("missing " + t.audio);
  if (!t.sample) throw new Error("Q" + t.id + " missing sample");
  if (!t.speakSec) throw new Error("Q" + t.id + " missing speakSec");
});

if (paper.tasks[0].sample !== "Store documents to prevent damage.") {
  throw new Error("Q1 sample mismatch");
}
if (paper.tasks[7].stem.indexOf("recycle") < 0) throw new Error("interview Q1 stem");

var notes = S.notesText(paper, {});
if (notes.indexOf("Your audio: (none)") < 0) throw new Error("notes should mark missing audio");
if (S.extOf("audio/webm") !== "webm" || S.extOf("audio/mp4") !== "m4a") throw new Error("extOf");

console.log("ok toefl-902-speaking 7 repeat + 4 interview");
