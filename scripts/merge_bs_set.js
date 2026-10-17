"use strict";
/* Merge one W-BSn staging array into bank-bs-writing.json; verify greens.
   Usage: node scripts/merge_bs_set.js N
   Expects .staging/w-bsN-tasks.json and .staging/w-bsN-greens.json
*/
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var n = Number(process.argv[2]);
if (!n) throw new Error("need set number");
var tasksPath = path.join(root, ".staging", "w-bs" + n + "-tasks.json");
var greensPath = path.join(root, ".staging", "w-bs" + n + "-greens.json");
var bankPath = path.join(root, "app/library/toefl/bank-bs-writing.json");
var tasks = JSON.parse(fs.readFileSync(tasksPath, "utf8"));
var greens = JSON.parse(fs.readFileSync(greensPath, "utf8"));
if (!Array.isArray(tasks) || tasks.length < 5) throw new Error("bad tasks count " + (tasks && tasks.length));
function norm(s) { return String(s).replace(/\s+/g, " ").trim().toLowerCase(); }
var fails = [];
tasks.forEach(function (t) {
  var si = 0, s = "";
  (t.parts || []).forEach(function (p) {
    if (p.slot) {
      if (s && !/\s$/.test(s)) s += " ";
      s += t.answer[si++];
    } else s += p.t || "";
  });
  var g = greens[t.set];
  if (!g) fails.push(t.set + " no green");
  else if (norm(s) !== norm(g)) fails.push(t.set + " recon=[" + s + "] green=[" + g + "]");
  var slots = (t.parts || []).filter(function (p) { return p.slot; }).length;
  if (slots !== (t.answer || []).length) fails.push(t.set + " slots");
  (t.answer || []).forEach(function (w) {
    if ((t.bank || []).indexOf(w) < 0) fails.push(t.set + " missing " + w);
  });
  if ((t.bank || []).join("\0") === (t.answer || []).join("\0")) fails.push(t.set + " bank=answer");
});
if (fails.length) { console.error(fails.join("\n")); process.exit(1); }
var paper = JSON.parse(fs.readFileSync(bankPath, "utf8"));
var prefix = "W-BS" + n + "-";
paper.tasks = paper.tasks.filter(function (t) { return String(t.set || "").indexOf(prefix) !== 0; });
paper.tasks = paper.tasks.concat(tasks);
var maxId = 0;
paper.tasks.forEach(function (t, i) {
  t.id = i + 1;
  t.module = 1;
  if (t.id > maxId) maxId = t.id;
});
paper.modules[0].to = maxId;
paper.modules[0].from = 1;
paper.modules[0].timeSec = Math.max(480, maxId * 48);
fs.writeFileSync(bankPath, JSON.stringify(paper, null, 2) + "\n");
console.log("merged W-BS" + n + " tasks=" + tasks.length + " total=" + paper.tasks.length);
