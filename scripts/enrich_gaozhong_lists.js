#!/usr/bin/env node
"use strict";
/**
 * Enrich 高中单词 LIST1–5 wordData with boss-case fields.
 * ponytail: heuristic enrichment for sample; 教研抽查后再精修.
 */
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var DIR = path.join(ROOT, "library/study/vocab");

function listPath(n) {
  var a = path.join(DIR, "高中单词LIST" + n + ".html");
  if (fs.existsSync(a)) return a;
  var b = path.join(DIR, "高中词汇LIST" + n + ".html");
  if (fs.existsSync(b)) return b;
  return null;
}

function parseWordData(html) {
  var m = html.match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error("wordData not found");
  return Function('"use strict"; return (' + m[1] + ");")();
}

function splitPhrases(phrases) {
  if (!phrases) return [];
  return String(phrases).split(/[,，]/).map(function (s) {
    s = s.trim();
    if (!s) return null;
    var m = s.match(/^(.+?)[（(](.+?)[）)]$/);
    if (m) return { phrase: m[1].trim(), meaning: m[2].trim() };
    return { phrase: s, meaning: "" };
  }).filter(Boolean).slice(0, 4);
}

function splitExample(example) {
  var s = String(example || "");
  var m = s.match(/^(.+?)[（(](.+)[）)]\s*$/);
  if (m) return { en: m[1].trim(), zh: m[2].trim() };
  return { en: s, zh: "" };
}

function makeParaphrase(w, enEx) {
  var word = w.word;
  var meaning = String(w.meaning || "").split(/[；;]/)[0].trim();
  var original = enEx || ("Students should learn the word " + word + " carefully.");
  var correct = original.replace(new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i"), meaning) ||
    ("The idea is related to " + meaning + ".");
  if (correct === original) {
    correct = "This sentence is about " + meaning + ".";
  }
  return {
    original: original,
    correct: correct,
    distractors: [
      "This sentence has nothing to do with the topic.",
      "The speaker completely rejects the idea of " + meaning + ".",
      "The meaning here is the opposite of " + meaning + "."
    ],
    explanation: word + " ≈ " + meaning
  };
}

function enrich(w) {
  var ex = splitExample(w.example);
  var coll = Array.isArray(w.collocations) && w.collocations.length && typeof w.collocations[0] === "object"
    ? w.collocations
    : splitPhrases(w.phrases || w.collocations);
  var out = Object.assign({}, w);
  out.collocations = coll;
  if (!out.root) {
    out.root = "（样板）结合词形与语境理解「" + w.word + "」→ " + String(w.meaning || "").split(/[；;]/)[0];
  }
  if (!out.synonyms) out.synonyms = [];
  if (!out.antonyms) out.antonyms = [];
  if (!out.examTag) {
    out.examTag = {
      source: "高中英语",
      frequency: 3,
      commonUsage: String(w.meaning || "").split(/[；;]/)[0] || "基础词汇",
      topic: "通用"
    };
  }
  if (!out.exampleEn && ex.en) out.exampleEn = ex.en;
  if (!out.exampleZh && ex.zh) out.exampleZh = ex.zh;
  if (!out.paraphrase) out.paraphrase = makeParaphrase(w, out.exampleEn || ex.en);
  // keep acceptCN / phrases for graders
  return out;
}

function stringifyWordData(arr) {
  return "const wordData = " + JSON.stringify(arr, null, 0)
    .replace(/\{\n/g, "{")
    .replace(/\n\}/g, "}");
}

function run() {
  var changed = 0;
  for (var n = 1; n <= 5; n++) {
    var fp = listPath(n);
    if (!fp) {
      console.warn("skip LIST" + n + ": missing");
      continue;
    }
    var html = fs.readFileSync(fp, "utf8");
    var words = parseWordData(html);
    var enriched = words.map(enrich);
    var m = html.match(/(?:const|var|let)\s+wordData\s*=\s*\[[\s\S]*?\];/);
    if (!m) throw new Error("replace failed LIST" + n);
    var next = html.replace(m[0], "const wordData = " + JSON.stringify(enriched, null, 0) + ";");
    fs.writeFileSync(fp, next);
    changed++;
    console.log("enriched LIST" + n + " (" + enriched.length + " words) → " + path.basename(fp));
  }
  console.assert(changed === 5, "expected 5 lists");
  console.log("done", changed);
}

run();
