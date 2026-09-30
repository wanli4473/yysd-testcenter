"use strict";
var fs = require("fs");
var path = require("path");
var T = require("../app/assets/js/reading.js");
var paper = JSON.parse(fs.readFileSync(path.join(__dirname, "../app/library/toefl/set-58-reading.json"), "utf8"));

var items = T.allItems(paper);
if (items.length !== 50) throw new Error("expected 50 items, got " + items.length);
if (T.screensOf(paper).length !== 23) throw new Error("expected 23 screens");

var empty = T.scorePaper(paper, {});
if (empty.score !== 0 || empty.total !== 50 || empty.wrong.length !== 50) {
  throw new Error("empty should be 0/50 with 50 wrongs");
}

var full = {};
items.forEach(function (it) {
  if (it.type === "complete_words") full[it.no] = it.blank.word;
  else full[it.no] = it.q.answer;
});
var byWord = T.scorePaper(paper, full);
if (byWord.score !== 50 || byWord.wrong.length) throw new Error("full words should be 50, got " + byWord.score);

var miss = {};
items.forEach(function (it) {
  if (it.type === "complete_words") miss[it.no] = it.blank.answer;
  else miss[it.no] = it.q.answer;
});
if (T.scorePaper(paper, miss).score !== 50) throw new Error("missing-letter answers should be 50");

var mixed = Object.assign({}, miss, { 1: "GENERAL", 4: " t ", 36: "SUCH" });
if (T.scorePaper(paper, mixed).score !== 50) throw new Error("case/space should still match");

var wrong = Object.assign({}, full, { 3: "observe", 21: "A", 50: "B" });
var w = T.scorePaper(paper, wrong);
if (w.score !== 47) throw new Error("three wrongs should be 47, got " + w.score);
if (w.wrong.length !== 3) throw new Error("wrong[] length");
if (!w.wrong[0].stem || !w.wrong[0].ans) throw new Error("wrong rows need stem/ans");

var film = paper.tasks[1];
var prefixes = T.blanksOf(film).map(function (b) { return b.prefix; });
if (prefixes.join(",") !== "introd,so,au,mat,wi,mov,all,t,act,f") {
  throw new Error("film prefixes changed: " + prefixes.join(","));
}
var baroque = paper.tasks.filter(function (t) { return t.title === "The Baroque Period"; })[0];
var bpre = T.blanksOf(baroque).map(function (b) { return b.prefix + "+" + b.answer; });
if (bpre.join(",") !== "su+ch,a+nd,cre+ated,wo+rks,b+y,melo+dies,inve+ntion,n+ew,instr+uments,t+he") {
  throw new Error("baroque blanks: " + bpre.join(","));
}

var host = { innerHTML: "" };
T.renderPassage({ title: "T", paras: ["Hello world"] }, host, false);
if (host.innerHTML.indexOf("hl-body") < 0) throw new Error("passage should wrap text for highlight");

var ets = fs.readFileSync(path.join(__dirname, "../assets/js/toefl-reading.js"), "utf8");
if (ets.indexOf("function removeSelectionHighlight") < 0) throw new Error("remove highlight missing");
if (ets.indexOf("function selectionHitsHighlight") < 0) throw new Error("hit highlight missing");

console.log("ok toefl-58-reading 50 items");
