#!/usr/bin/env node
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.resolve(__dirname, "..");
var idx = JSON.parse(fs.readFileSync(path.join(ROOT, "library/toefl/lab-index.json"), "utf8"));
var items = idx.items || [];
if (items.length < 50) throw new Error("index too small");
var byTitle = {};
items.filter(function (i) { return i.skill === "speaking"; }).forEach(function (i) {
  (byTitle[i.title] = byTitle[i.title] || []).push(i);
});
var dups = 0;
Object.keys(byTitle).forEach(function (k) {
  var group = byTitle[k];
  if (group.length < 2) return;
  dups += 1;
  var forms = {};
  group.forEach(function (i) { forms[i.formId] = 1; });
  if (Object.keys(forms).length !== group.length) {
    throw new Error("same speaking title must stay one card per form: " + k);
  }
});
if (dups < 5) throw new Error("expected repeated speaking titles across dates/forms");
var paper = JSON.parse(fs.readFileSync(path.join(ROOT, "library/toefl/2025-07-04-speaking.json"), "utf8"));
var screens = paper.tasks.map(function (task) { return { task: task, module: task.module, nos: [task.id], from: task.id }; });
var clipped = screens.filter(function (s) {
  var idx = paper.tasks.indexOf(s.task);
  return idx >= 0 && idx <= 6;
});
if (clipped.length !== 7) throw new Error("clip speaking repeat group");
var genericHot = items.some(function (i) { return i.hot && /^choose a response$/i.test(i.title); });
if (genericHot) throw new Error("generic titles must not be hot");
var labSrc = fs.readFileSync(path.join(ROOT, "assets/js/toefl-lab.js"), "utf8");
["function leftOf", "function saveLeft", "function dropLeft", "function limitSec", "function mockRemain"].forEach(function (fn) {
  if (labSrc.indexOf(fn) < 0) throw new Error("toefl-lab missing " + fn);
});
var listen = fs.readFileSync(path.join(ROOT, "toefl-listening.html"), "utf8");
if (listen.indexOf("armQuestionClock") < 0 || listen.indexOf("Lab.leftOf") < 0) {
  throw new Error("listening must keep per-question countdown");
}
if (listen.indexOf("confirmSubmit") < 0 || listen.indexOf("leave-btn") < 0) {
  throw new Error("listening must keep Submit confirm + Exit Test");
}
var vm = require("vm");
var labCtx = { localStorage: { getItem: function () { return null; }, setItem: function () {} } };
labCtx.window = labCtx;
vm.runInNewContext(labSrc, labCtx);
var L = labCtx.YYSD_TOEFL_LAB;
if (L.limitSec("choose_response") !== 20 || L.limitSec("lecture") !== 30) throw new Error("listening limits");
if (L.leftOf("x", 20) !== 20) throw new Error("leftOf empty starts full");
if (L.mockRemain("listening") !== 29 * 60) throw new Error("mockRemain listening");
var paper = { tasks: [{ type: "choose_response", questions: [{ id: 1 }] }] };
L.markSessionDone("listening", "set-6", paper, 0, 0);
L.saveScore("listening", "set-6", paper, [{ id: 1, ok: true, ua: "A", expect: "A" }]);
console.log("ok toefl-lab-check", items.length, "cards", dups, "repeated speaking titles split per form");
