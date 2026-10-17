#!/usr/bin/env node
"use strict";
/* Merge incoming/W-BSn.json into bank-bs-writing.json after reconstruct check. */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var incomingDir = path.join(root, "app/library/toefl/incoming");
var paperPath = path.join(root, "app/library/toefl/bank-bs-writing.json");
var check = require("./check_toefl_paper");

function norm(s) {
  return String(s).replace(/\s+/g, " ").trim().toLowerCase();
}

function reconstruct(t) {
  var si = 0;
  var s = "";
  (t.parts || []).forEach(function (p) {
    if (p.slot) {
      if (s && !/\s$/.test(s)) s += " ";
      s += t.answer[si++];
    } else s += p.t || "";
  });
  return s;
}

function titlecaseChip(w) {
  var s = String(w || "");
  if (/^I('|$|\s)/.test(s) || /^[A-Z]{2,}$/.test(s)) return false;
  return /^[A-Z]/.test(s);
}

function verify(pack) {
  var fails = [];
  var setN = pack.set;
  var qMax = setN === 90 ? 5 : 10;
  if (!pack.tasks || pack.tasks.length !== qMax) fails.push("W-BS" + setN + " expected " + qMax + " tasks");
  (pack.tasks || []).forEach(function (t, i) {
    var q = i + 1;
    var id = "W-BS" + setN + "-Q" + q;
    if (t.set !== id) fails.push(id + " bad set " + t.set);
    var g = (pack.greens || {})[id];
    if (!g) fails.push(id + " missing green");
    else if (norm(reconstruct(t)) !== norm(g)) {
      fails.push(id + " reconstruct=[" + reconstruct(t) + "] green=[" + g + "]");
    }
    var slots = (t.parts || []).filter(function (p) { return p.slot; }).length;
    if (slots !== (t.answer || []).length) fails.push(id + " slots");
    (t.answer || []).forEach(function (w) {
      if ((t.bank || []).indexOf(w) < 0) fails.push(id + " missing " + w);
    });
    if (JSON.stringify(t.bank) === JSON.stringify(t.answer)) fails.push(id + " bank=answer");
    (t.bank || []).concat(t.answer || []).forEach(function (w) {
      if (titlecaseChip(w)) fails.push(id + " titlecase " + w);
    });
  });
  if (fails.length) throw new Error(fails.join("\n"));
}

function main() {
  if (!fs.existsSync(incomingDir)) {
    console.log("no incoming");
    return;
  }
  var files = fs.readdirSync(incomingDir).filter(function (n) { return /^W-BS\d+\.json$/.test(n); });
  files.sort(function (a, b) {
    return Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, ""));
  });
  if (!files.length) {
    console.log("no incoming packs");
    return;
  }
  var paper = JSON.parse(fs.readFileSync(paperPath, "utf8"));
  var have = {};
  paper.tasks.forEach(function (t) { have[t.set] = 1; });
  files.forEach(function (n) {
    var pack = JSON.parse(fs.readFileSync(path.join(incomingDir, n), "utf8"));
    verify(pack);
    var skip = pack.tasks.some(function (t) { return have[t.set]; });
    if (skip) {
      fs.unlinkSync(path.join(incomingDir, n));
      console.log("skip duplicate", n);
      return;
    }
    pack.tasks.forEach(function (t) {
      t.type = "sentence";
      t.module = 1;
      t.title = t.title || "Build a Sentence";
      t.titleZh = t.titleZh || "句子构建";
      paper.tasks.push(t);
      have[t.set] = 1;
    });
    fs.unlinkSync(path.join(incomingDir, n));
    console.log("merged", n);
  });
  paper.tasks.sort(function (a, b) {
    var ma = /^W-BS(\d+)-Q(\d+)$/.exec(a.set || "") || [0, 0, 0];
    var mb = /^W-BS(\d+)-Q(\d+)$/.exec(b.set || "") || [0, 0, 0];
    return Number(ma[1]) - Number(mb[1]) || Number(ma[2]) - Number(mb[2]);
  });
  paper.tasks.forEach(function (t, i) { t.id = i + 1; });
  var n = paper.tasks.length;
  paper.modules[0].to = n;
  paper.modules[0].timeSec = 48 * n;
  fs.writeFileSync(paperPath, JSON.stringify(paper, null, 2) + "\n");
  check.checkFile(paperPath);
  console.log("ok", n, "tasks last", paper.tasks[n - 1].set);
}

main();
