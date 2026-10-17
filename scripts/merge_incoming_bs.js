"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var n = Number(process.argv[2]);
if (!n) throw new Error("need set N");
var packPath = path.join(root, "app/library/toefl/incoming/W-BS" + n + ".json");
var bankPath = path.join(root, "app/library/toefl/bank-bs-writing.json");
var pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
var tasks = Array.isArray(pack) ? pack : pack.tasks;
var greens = pack.greens || {};
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
  var g = greens[t.set] || greens["Q" + (t.set || "").split("-Q")[1]];
  if (g && norm(s) !== norm(g)) fails.push(t.set + " recon=[" + s + "] green=[" + g + "]");
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
paper.tasks.forEach(function (t, i) { t.id = i + 1; t.module = 1; });
var maxId = paper.tasks.length;
paper.modules[0].to = maxId;
paper.modules[0].from = 1;
paper.modules[0].timeSec = Math.max(480, maxId * 48);
fs.writeFileSync(bankPath, JSON.stringify(paper, null, 2) + "\n");
console.log("merged W-BS" + n + " total=" + maxId);
