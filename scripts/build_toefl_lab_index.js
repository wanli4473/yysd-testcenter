#!/usr/bin/env node
/* ponytail: flatten catalogued TOEFL JSON into one lab index; rerun after new papers */
"use strict";

var fs = require("fs");
var path = require("path");
var I18N = require("./toefl_lab_i18n");

var ROOT = path.resolve(__dirname, "..");
var CONFIG = path.join(ROOT, "assets/js/config.js");
var OUT = path.join(ROOT, "library/toefl/lab-index.json");

function catalog(src, name) {
  var m = src.match(new RegExp("var " + name + " = \\[([\\s\\S]*?)\\n  \\];"));
  if (!m) return [];
  var out = [];
  var re = /id:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?file:\s*"([^"]+)"/g;
  var hit;
  while ((hit = re.exec(m[1]))) {
    out.push({ id: hit[1], title: hit[2], file: hit[3] });
  }
  return out;
}

function dateOf(id) {
  var m = String(id).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : id;
}

function titleOf(skill, task) {
  return I18N.titleEn(skill, task);
}

function itemNos(task) {
  if (task.type === "complete_words") {
    return (task.passage || []).filter(function (x) { return x && x.id; }).map(function (x) { return x.id; });
  }
  if (task.questions && task.questions.length) return task.questions.map(function (q) { return q.id; });
  if (task.id != null) return [task.id];
  return [];
}

function normTitle(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+\d+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function genericTitle(s) {
  return /^(choose a response|q\d+|listen and repeat|interview|email|sentence|academic discussion)$/i.test(s);
}

function emitTasks(skill, meta, paper) {
  var tasks = paper.tasks || [];
  var rows = [];
  if (skill === "speaking") {
    var i = 0;
    while (i < tasks.length) {
      var t = tasks[i].type;
      var j = i;
      while (j + 1 < tasks.length && tasks[j + 1].type === t) j += 1;
      var nos = [];
      for (var k = i; k <= j; k++) nos = nos.concat(itemNos(tasks[k]));
      var en = titleOf(skill, tasks[i]);
      rows.push({
        skill: skill,
        type: t,
        paperId: meta.id,
        taskIndex: i,
        taskEnd: j,
        title: en,
        titleEn: en,
        titleZh: I18N.titleZh(en),
        date: dateOf(meta.id),
        formId: meta.id,
        paperTitle: meta.title,
        itemNos: nos,
        itemCount: nos.length
      });
      i = j + 1;
    }
    return rows;
  }
  return tasks.map(function (task, idx) {
    var nos = itemNos(task);
    var en = titleOf(skill, task);
    return {
      skill: skill,
      type: task.type,
      paperId: meta.id,
      taskIndex: idx,
      taskEnd: idx,
      title: en,
      titleEn: en,
      titleZh: I18N.titleZh(en),
      date: dateOf(meta.id),
      formId: meta.id,
      paperTitle: meta.title,
      itemNos: nos,
      itemCount: nos.length
    };
  });
}

var src = fs.readFileSync(CONFIG, "utf8");
var packs = [
  ["reading", catalog(src, "TOEFL_READING")],
  ["listening", catalog(src, "TOEFL_LISTENING")],
  ["writing", catalog(src, "TOEFL_WRITING")],
  ["speaking", catalog(src, "TOEFL_SPEAKING")]
];

var items = [];
packs.forEach(function (pair) {
  pair[1].forEach(function (meta) {
    var abs = path.join(ROOT, meta.file);
    if (!fs.existsSync(abs)) throw new Error("missing " + meta.file);
    var paper = JSON.parse(fs.readFileSync(abs, "utf8"));
    items = items.concat(emitTasks(pair[0], meta, paper));
  });
});

var freq = {};
items.forEach(function (it) {
  var key = it.skill + "|" + it.type + "|" + normTitle(it.title);
  if (genericTitle(normTitle(it.title))) return;
  if (!freq[key]) freq[key] = {};
  freq[key][it.paperId] = 1;
});
items.forEach(function (it) {
  var key = it.skill + "|" + it.type + "|" + normTitle(it.title);
  it.hot = !!(freq[key] && Object.keys(freq[key]).length >= 2);
});
I18N.assignListenCodes(items);

fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), items: items }, null, 2));
console.log("ok toefl-lab-index", items.length, "cards");
if (items.length < 50) throw new Error("lab index too small");
var skills = {};
items.forEach(function (it) { skills[it.skill] = (skills[it.skill] || 0) + 1; });
["reading", "listening", "writing", "speaking"].forEach(function (s) {
  if (!skills[s]) throw new Error("missing skill " + s);
});
function must(cond, msg) { if (!cond) throw new Error(msg); }
must(items.filter(function (it) { return it.titleEn === "Campus Bike Repair"; }).length >= 2, "bike titles");
must(items.some(function (it) { return it.listenCode === "C02" && it.titleEn === "Film Club" && it.titleZh === "电影社"; }), "film set code");
must(items.some(function (it) { return it.titleEn === "University Registration Office" && it.titleZh.indexOf("注册") >= 0; }), "reg office");
must(items.some(function (it) { return it.titleEn === "Coral Reefs" && it.titleZh === "珊瑚礁"; }), "coral");
must(items.some(function (it) { return it.titleEn === "Ancient Greece and Rome" && it.titleZh.indexOf("罗马") >= 0; }), "greece");
must(items.some(function (it) { return it.skill === "writing" && it.titleEn === "New Library Opening" && it.titleZh.indexOf("图书馆") >= 0; }), "library opening");
must(items.some(function (it) { return it.listenCode === "T01" && it.titleZh && it.titleZh !== it.titleEn; }), "lecture zh");
must(items.some(function (it) { return it.type === "announcement" && it.titleZh && it.titleZh !== it.titleEn; }), "announce zh");
