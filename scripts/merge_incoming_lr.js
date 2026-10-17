"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var arg = process.argv[2];
if (!arg) throw new Error("need set N or all");
var bankPath = path.join(root, "app/library/toefl/bank-lr-speaking.json");
var paper = JSON.parse(fs.readFileSync(bankPath, "utf8"));

function mergeOne(n) {
  var packPath = path.join(root, "app/library/toefl/incoming/S-LRP" + n + ".json");
  var pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  var tasks = Array.isArray(pack) ? pack : pack.tasks;
  if (!tasks || !tasks.length) throw new Error("S-LRP" + n + " empty");
  tasks.forEach(function (t) {
    if (t.type !== "repeat") throw new Error((t.set || "?") + " not repeat");
    if (!t.audio || !t.sample || !t.instruction) throw new Error((t.set || "?") + " missing fields");
    if (!t.set) throw new Error("missing set");
  });
  var prefix = "S-LRP" + n + "-";
  paper.tasks = paper.tasks.filter(function (t) {
    return String(t.set || "").indexOf(prefix) !== 0;
  });
  paper.tasks = paper.tasks.concat(tasks.map(function (t) {
    return Object.assign({}, t, {
      type: "repeat",
      module: 1,
      prepSec: t.prepSec != null ? t.prepSec : 3,
      speakSec: t.speakSec != null ? t.speakSec : 8,
      title: t.title || ("LRP " + n),
      titleZh: t.titleZh || "听后跟读",
      analysis: t.analysis || ("复述：" + t.sample)
    });
  }));
}

if (String(arg) === "all") {
  var dir = path.join(root, "app/library/toefl/incoming");
  fs.readdirSync(dir).filter(function (f) { return /^S-LRP\d+\.json$/.test(f); })
    .map(function (f) { return Number(f.replace(/\D/g, "")); })
    .sort(function (a, b) { return a - b; })
    .forEach(mergeOne);
} else {
  mergeOne(Number(arg));
}

paper.tasks.sort(function (a, b) {
  function key(s) {
    var m = /^S-LRP(\d+)-Q(\d+)$/.exec(String(s || ""));
    return m ? [Number(m[1]), Number(m[2])] : [9999, 0];
  }
  var ka = key(a.set), kb = key(b.set);
  return ka[0] - kb[0] || ka[1] - kb[1];
});
paper.tasks.forEach(function (t, i) { t.id = i + 1; t.module = 1; });
var maxId = paper.tasks.length;
paper.modules[0].to = maxId;
paper.modules[0].from = maxId ? 1 : 0;
paper.modules[0].timeSec = Math.max(600, maxId * 20);
fs.writeFileSync(bankPath, JSON.stringify(paper, null, 2) + "\n");
console.log("merged lr total=" + maxId);
