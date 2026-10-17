"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var arg = process.argv[2];
if (!arg) throw new Error("need set N or all");
var bankPath = path.join(root, "app/library/toefl/bank-iv-speaking.json");
var paper = JSON.parse(fs.readFileSync(bankPath, "utf8"));
var SKIP = { 57: 1, 58: 1, 59: 1, 60: 1, 61: 1 };

function mergeOne(n) {
  if (SKIP[n]) throw new Error("S-INT" + n + " skipped (no audio)");
  var packPath = path.join(root, "app/library/toefl/incoming/S-INT" + n + ".json");
  var pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  var tasks = Array.isArray(pack) ? pack : pack.tasks;
  if (!tasks || !tasks.length) throw new Error("S-INT" + n + " empty");
  tasks.forEach(function (t) {
    if (t.type !== "interview") throw new Error((t.set || "?") + " not interview");
    if (!t.audio || !t.stem || !t.instruction) throw new Error((t.set || "?") + " missing fields");
    if (!t.set) throw new Error("missing set");
  });
  var prefix = "S-INT" + n + "-";
  paper.tasks = paper.tasks.filter(function (t) {
    return String(t.set || "").indexOf(prefix) !== 0;
  });
  paper.tasks = paper.tasks.concat(tasks.map(function (t) {
    return Object.assign({}, t, {
      type: "interview",
      module: 1,
      speakSec: t.speakSec != null ? t.speakSec : 45,
      sample: t.sample != null ? t.sample : t.stem,
      title: t.title || ("INT " + n),
      titleZh: t.titleZh || "面试问答",
      analysis: t.analysis || ""
    });
  }));
}

if (String(arg) === "all") {
  var dir = path.join(root, "app/library/toefl/incoming");
  fs.readdirSync(dir).filter(function (f) { return /^S-INT\d+\.json$/.test(f); })
    .map(function (f) { return Number(f.replace(/\D/g, "")); })
    .sort(function (a, b) { return a - b; })
    .forEach(function (n) {
      if (!SKIP[n]) mergeOne(n);
    });
} else {
  mergeOne(Number(arg));
}

paper.tasks.sort(function (a, b) {
  function key(s) {
    var m = /^S-INT(\d+)-Q(\d+)$/.exec(String(s || ""));
    return m ? [Number(m[1]), Number(m[2])] : [9999, 0];
  }
  var ka = key(a.set), kb = key(b.set);
  return ka[0] - kb[0] || ka[1] - kb[1];
});
paper.tasks.forEach(function (t, i) { t.id = i + 1; t.module = 1; });
var maxId = paper.tasks.length;
paper.modules[0].to = maxId;
paper.modules[0].from = maxId ? 1 : 0;
paper.modules[0].timeSec = Math.max(600, maxId * 60);
fs.writeFileSync(bankPath, JSON.stringify(paper, null, 2) + "\n");
console.log("merged iv total=" + maxId);
