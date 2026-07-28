#!/usr/bin/env node
/* check_vocab_cloze.js — smoke for collocation / example_cloze helpers + coverage */
"use strict";
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var lesson = fs.readFileSync(path.join(root, "assets/js/vocab-lesson.js"), "utf8");
["parsePhrasePairs", "blankWord", "englishOnly", "tryCollocation", "tryExampleCloze",
  "collocation", "example_cloze", "补全常见搭配", "vl-cloze"].forEach(function (k) {
  if (lesson.indexOf(k) < 0) throw new Error("vocab-lesson.js missing " + k);
});
var css = fs.readFileSync(path.join(root, "assets/css/vocab-lesson.css"), "utf8");
if (css.indexOf(".vl-cloze") < 0) throw new Error("css missing .vl-cloze");

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function parsePhrasePairs(phrases) {
  var raw = String(phrases || "").trim();
  if (!raw) return [];
  return raw.split(/[,，]/).map(function (part) {
    part = part.trim();
    if (!part) return null;
    var m = part.match(/^(.+?)\s*[（(]\s*(.+?)\s*[）)]\s*$/);
    if (!m) return null;
    return { en: m[1].trim(), zh: m[2].trim() };
  }).filter(Boolean);
}
function englishOnly(example) {
  var s = String(example || "").trim();
  if (!s) return "";
  var cut = s.search(/[（(]/);
  if (cut >= 0) s = s.slice(0, cut);
  return s.trim();
}
function blankWord(text, word) {
  word = String(word || "").trim();
  text = String(text || "");
  if (!word || !text) return null;
  var parts = word.split(/\s+/).map(escapeRe);
  var re = new RegExp("\\b" + parts.join("\\s+") + "\\b", "i");
  if (!re.test(text)) return null;
  return text.replace(re, "____");
}
function parseWordData(html) {
  var m = html.match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return [];
  var arr = Function('"use strict"; return (' + m[1] + ");")();
  return arr.map(function (w) {
    var word = String(w.word || "").trim();
    var meaning = String(w.meaning || "").trim();
    if (!word || !meaning) return null;
    return {
      word: word,
      meaning: meaning,
      phrases: String(w.phrases || "").trim(),
      example: String(w.example || "").trim()
    };
  }).filter(Boolean);
}

// unit asserts
var pairs = parsePhrasePairs("firm belief（坚定的信念）, law firm（律师事务所）, stand firm（坚定不移）");
if (pairs.length !== 3) throw new Error("parsePhrasePairs count");
if (blankWord("stand firm", "firm") !== "stand ____") throw new Error("blank collocation");
if (blankWord(englishOnly("She has a firm belief in justice.（她对正义有着坚定的信念。）"), "firm")
  !== "She has a ____ belief in justice.") throw new Error("blank example");
if (blankWord("nope", "firm") !== null) throw new Error("blank miss should be null");
if (blankWord("Beach volleyball is fun", "Beach volleyball") !== "____ is fun") {
  throw new Error("multi-word blank");
}

function tryCollocation(w) {
  var list = parsePhrasePairs(w.phrases);
  for (var i = 0; i < list.length; i++) {
    var b = blankWord(list[i].en, w.word);
    if (b) return { blank: b, hintZh: list[i].zh };
  }
  return null;
}
function tryExampleCloze(w) {
  var b = blankWord(englishOnly(w.example), w.word);
  return b ? { blank: b } : null;
}

function cover(dir, label) {
  var files = fs.readdirSync(path.join(root, dir)).filter(function (f) {
    return f.endsWith(".html");
  }).slice(0, 6);
  var words = 0, colo = 0, cloze = 0;
  files.forEach(function (f) {
    var html = fs.readFileSync(path.join(root, dir, f), "utf8");
    parseWordData(html).forEach(function (w) {
      words++;
      if (tryCollocation(w)) colo++;
      if (tryExampleCloze(w)) cloze++;
    });
  });
  console.log(label + ": words=" + words + " collocation=" + colo + " example_cloze=" + cloze);
  if (words < 10) throw new Error(label + " too few words");
  if (cloze < words * 0.5) throw new Error(label + " example_cloze coverage too low");
  return { words: words, colo: colo, cloze: cloze };
}

var gz = cover("library/study/vocab", "gaozhong");
if (gz.colo < gz.words * 0.5) throw new Error("gaozhong collocation coverage too low");
cover("library/study/vocab-cet4", "cet4");
var listen = cover("library/study/vocab-special-listening", "listen");
// listening often has no phrases — collocation should degrade (low ok)
if (listen.colo > listen.words * 0.2) {
  console.log("(listen unexpectedly has phrases — ok)");
}

console.log("check_vocab_cloze: ok");
