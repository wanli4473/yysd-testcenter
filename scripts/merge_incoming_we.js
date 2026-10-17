"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var n = Number(process.argv[2]);
if (!n) throw new Error("need set N (or pass 'all')");
var bankPath = path.join(root, "app/library/toefl/bank-we-writing.json");
var paper = JSON.parse(fs.readFileSync(bankPath, "utf8"));

function mergeOne(n) {
  var packPath = path.join(root, "app/library/toefl/incoming/W-WE" + n + ".json");
  var pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  var tasks = Array.isArray(pack) ? pack : pack.tasks;
  if (!tasks || !tasks.length) throw new Error("W-WE" + n + " empty");
  tasks.forEach(function (t) {
    if (t.type !== "email") throw new Error(t.set + " not email");
    if (!t.prompt || !t.bullets || !t.bullets.length || !t.to || !t.subject) {
      throw new Error(t.set + " missing fields");
    }
    if (!t.set) throw new Error("missing set");
  });
  var prefix = "W-WE" + n;
  // replace exact set id W-WEn only (one task per WE number)
  paper.tasks = paper.tasks.filter(function (t) { return String(t.set || "") !== prefix; });
  paper.tasks = paper.tasks.concat(tasks.map(function (t) {
    return Object.assign({}, t, {
      type: "email",
      set: prefix,
      title: t.title || "Write an Email",
      titleZh: t.titleZh || "邮件写作",
      sample: t.sample || "",
      analysis: t.analysis || "",
      instruction: t.instruction || "Write an email. In your email, do the following:"
    });
  }));
}

if (String(process.argv[2]) === "all") {
  var dir = path.join(root, "app/library/toefl/incoming");
  fs.readdirSync(dir).filter(function (f) { return /^W-WE\d+\.json$/.test(f); })
    .map(function (f) { return Number(f.replace(/\D/g, "")); })
    .sort(function (a, b) { return a - b; })
    .forEach(mergeOne);
} else {
  mergeOne(n);
}

paper.tasks.sort(function (a, b) {
  return Number(String(a.set).replace(/\D/g, "")) - Number(String(b.set).replace(/\D/g, ""));
});
paper.tasks.forEach(function (t, i) { t.id = i + 1; t.module = 1; });
var maxId = paper.tasks.length;
paper.modules[0].to = maxId;
paper.modules[0].from = maxId ? 1 : 0;
paper.modules[0].timeSec = Math.max(600, maxId * 420);
fs.writeFileSync(bankPath, JSON.stringify(paper, null, 2) + "\n");
console.log("merged we total=" + maxId);
