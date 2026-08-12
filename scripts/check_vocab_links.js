#!/usr/bin/env node
"use strict";
/**
 * Phase 5: dead-link / nav unify smoke for the three vocab modules.
 */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var fails = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function must(cond, msg) {
  if (!cond) fails.push(msg);
}

["vocab-shelf.html", "vocab-learn.html", "vocab-quiz.html", "wrong-words.html"].forEach(function (f) {
  must(fs.existsSync(path.join(root, f)), "missing " + f);
});

var vocab = read("assets/js/vocab.js");
must(vocab.indexOf("vocab-shelf.html") >= 0, "vocab.js redirects to shelf");
must(vocab.indexOf("view=unit") < 0 && vocab.indexOf("bootVocab") < 0, "legacy hub UI gone");

var themes = read("vocab-themes.html");
must(themes.indexOf("vocab-shelf.html?view=catalog") >= 0, "themes → catalog");

var hs = read("hs-vocab.html");
must(hs.indexOf("vocab-shelf.html") >= 0, "hs-vocab → shelf");
must(hs.indexOf("vocab-quiz.html") >= 0 || hs.indexOf("wrong-words.html") >= 0, "hs-vocab modes covered");

var zone = read("assets/js/zone.js");
must(zone.indexOf("vocab-shelf.html") >= 0, "zone → shelf");
must(zone.indexOf("vocab-quiz.html") >= 0, "zone → quiz");
must(zone.indexOf("wrong-words.html") >= 0, "zone → wrongbook");
must(zone.indexOf("vocab.html?book=") < 0, "zone no legacy vocab hub cards");

var config = read("assets/js/config.js");
must(config.indexOf("vocab-shelf.html?view=catalog") >= 0, "study tree → catalog");
must(config.indexOf("vocab-shelf.html?book=") >= 0, "book cards → shelf");
must(config.indexOf('href="wrong-words.html"') >= 0 || config.indexOf("wrong-words.html") >= 0, "unified wrongbook link");

var exam = read("assets/js/exam.js");
must(exam.indexOf("wrong-words.html?book=") < 0, "exam no book-scoped wrongbook");
must(exam.indexOf("vocab-shelf.html?book=") >= 0, "exam back → shelf");

var report = read("assets/js/diagnostic-report.js");
must(report.indexOf("vocab-shelf.html") >= 0, "diag report → shelf");
must(report.indexOf("vocab.html?book=") < 0, "diag report no legacy hub");

var lesson = read("assets/js/vocab-lesson.js");
must(lesson.indexOf("vocab-shelf.html?book=") >= 0, "realm lesson back → shelf");

var nav = read("assets/js/nav.js");
must(nav.indexOf("vocab-shelf.html") >= 0 && nav.indexOf("vocab-quiz.html") >= 0, "nav knows shelf/quiz");

var mascot = read("assets/js/mascot.js");
must(mascot.indexOf("vocab-shelf.html") >= 0, "mascot page detect shelf");

if (fails.length) {
  console.error("FAIL\n" + fails.join("\n"));
  process.exit(1);
}
console.log("OK vocab links smoke");
