"use strict";
var fs = require("fs");
var path = require("path");
var W = require("../assets/js/toefl-writing.js");
var root = path.join(__dirname, "..");
var paper = JSON.parse(fs.readFileSync(path.join(root, "library/toefl/2025-09-02-writing.json"), "utf8"));

var screens = W.screensOf(paper);
if (screens.length !== 12) throw new Error("expected 12 screens, got " + screens.length);

var sents = paper.tasks.filter(function (t) { return t.type === "sentence"; });
if (sents.length !== 10) throw new Error("expected 10 sentences");

sents.forEach(function (t) {
  if (W.slotCount(t) !== t.answer.length) {
    throw new Error("Q" + t.id + " slots " + W.slotCount(t) + " != answer " + t.answer.length);
  }
  t.answer.forEach(function (w) {
    if (t.bank.indexOf(w) < 0) throw new Error("Q" + t.id + " answer missing from bank: " + w);
  });
});

if (sents[2].bank.indexOf("did") < 0) throw new Error("Q3 should keep distractor 'did'");

var empty = W.scorePaper(paper, {});
if (empty.score !== 0 || empty.total !== 10) throw new Error("empty sentences should be 0/10");

var full = {};
sents.forEach(function (t) { full[t.id] = t.answer.slice(); });
var perfect = W.scorePaper(paper, full);
if (perfect.score !== 10) throw new Error("full sentences should be 10/10, got " + perfect.score);

full[1] = ["have", "any", "plans", "to", "attend", "them"];
if (W.scorePaper(paper, full).score !== 9) throw new Error("wrong Q1 should drop to 9");

["diaz.png", "andrew.png", "kelly.png"].forEach(function (n) {
  if (!fs.existsSync(path.join(root, "library/toefl/img/2025-09-02", n))) throw new Error("missing " + n);
});

var email = paper.tasks.filter(function (t) { return t.type === "email"; })[0];
var disc = paper.tasks.filter(function (t) { return t.type === "discussion"; })[0];
if (!email || !email.sample) throw new Error("email sample missing");
if (!disc || disc.samples.length !== 2) throw new Error("discussion needs 2 samples");
if (W.wordCount(disc.samples[0].text) < 100) throw new Error("discussion sample too short");

console.log("ok toefl-902-writing 10 sentences + email + discussion");
