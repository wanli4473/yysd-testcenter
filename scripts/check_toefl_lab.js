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
console.log("ok toefl-lab-check", items.length, "cards", dups, "repeated speaking titles split per form");
