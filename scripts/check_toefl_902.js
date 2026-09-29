"use strict";
var fs = require("fs");
var path = require("path");
var T = require("../assets/js/toefl-reading.js");
var paper = JSON.parse(fs.readFileSync(path.join(__dirname, "../library/toefl/2025-09-02-reading.json"), "utf8"));

var items = T.allItems(paper);
if (items.length !== 50) throw new Error("expected 50 items, got " + items.length);

var empty = T.scorePaper(paper, {});
if (empty.score !== 0 || empty.total !== 50 || empty.band !== 1) {
  throw new Error("empty should be 0/50 band 1, got " + empty.score + " band " + empty.band);
}

var full = {};
items.forEach(function (it) {
  if (it.type === "complete_words") full[it.no] = it.blank.word;
  else full[it.no] = it.q.answer;
});
var perfect = T.scorePaper(paper, full);
if (perfect.score !== 50 || perfect.band !== 6 || perfect.scaled30 !== 30) {
  throw new Error("full should be 50/50 band 6, got " + perfect.score + " band " + perfect.band);
}

var key18 = T.scorePaper(paper, Object.assign({}, full, { 18: "of" }));
if (key18.score !== 50) throw new Error("Q18 answer-key 'of' should count");
var key45 = T.scorePaper(paper, Object.assign({}, full, { 45: "divisions" }));
if (key45.score !== 50) throw new Error("Q45 divisions should count as alt");

if (T.bandFrom30(29) !== 6 || T.bandFrom30(24) !== 5 || T.bandFrom30(18) !== 4) {
  throw new Error("ETS 0-30 concordance broken");
}
if (T.rawTo30(40, 50) !== 24 || T.bandFrom30(T.rawTo30(40, 50)) !== 5) {
  throw new Error("40/50 should map to 24 → 5");
}

var layouts = paper.tasks.filter(function (t) { return t.layout; }).map(function (t) { return t.layout.kind; });
if (layouts.join(",") !== "steps,course,schedule,poster") {
  throw new Error("daily layouts: " + layouts.join(","));
}
var insert = paper.tasks[paper.tasks.length - 1].questions.slice(-1)[0];
if (!T.isInsertQ(insert) || insert.answer !== "B") throw new Error("Q50 insert should be B");

var host = { innerHTML: "" };
T.renderPassage(paper.tasks[2], host, false);
if (host.innerHTML.indexOf("dl-steps") < 0) throw new Error("router card should render steps");

console.log("ok toefl-902 50 items band 1–6");
