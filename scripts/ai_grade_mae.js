#!/usr/bin/env node
/**
 * Offline MAE for gold set (default). Optional --live re-grades via local API.
 * Usage:
 *   node scripts/ai_grade_mae.js
 *   node scripts/ai_grade_mae.js --assert   # exit 1 if MAE > 0.5
 */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var goldPath = path.join(root, "server", "ai", "gold", "samples.json");
var ieltsGrade = require(path.join(root, "server", "ai", "ielts-grade"));

var assertMode = process.argv.indexOf("--assert") >= 0;
var data = JSON.parse(fs.readFileSync(goldPath, "utf8"));
var pairs = (data.samples || [])
  .filter(function (s) { return s.human && s.human.overall != null && s.aiOverall != null; })
  .map(function (s) { return { id: s.id, human: s.human.overall, ai: s.aiOverall }; });

var stats = ieltsGrade.maeBands(pairs);
var target = data.targetMae != null ? data.targetMae : 0.5;
console.log("promptVersion:", data.promptVersion || ieltsGrade.PROMPT_VERSION);
console.log("n:", stats.n, "mae:", stats.mae, "target:", target, "pass:", stats.mae != null && stats.mae <= target);
pairs.slice(0, 8).forEach(function (p) {
  console.log(" ", p.id, "human", p.human, "ai", p.ai, "Δ", Math.abs(p.human - p.ai));
});

if (assertMode) {
  if (stats.mae == null || stats.mae > target) {
    console.error("FAIL: MAE above target — collect teacher corrections / retune prompts");
    process.exit(1);
  }
  console.log("OK");
}
