#!/usr/bin/env node
/** Smoke check: vocab lesson player + wordData bridge. Exit 1 on failure. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

function parseWordData(html) {
  const m = html.match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
  assert(m, "wordData literal");
  const arr = Function('"use strict"; return (' + m[1] + ");")();
  assert(Array.isArray(arr) && arr.length >= 8, "wordData length");
  assert(arr.every(w => w.word && w.meaning), "word+meaning");
  return arr;
}

const listPath = path.join(root, "library/study/vocab/高中单词LIST1.html");
assert(fs.existsSync(listPath), "LIST1 exists");
const words = parseWordData(fs.readFileSync(listPath, "utf8"));
assert(words[0].word === "firm", "first word firm");

const cet4 = path.join(root, "library/study/vocab-cet4/四级单词LIST1.html");
assert(fs.existsSync(cet4), "cet4 LIST1");
parseWordData(fs.readFileSync(cet4, "utf8"));

const special = path.join(root, "library/study/vocab-special-listening/listening-vocab-01-leisure-sports.html");
assert(fs.existsSync(special), "special listening 01");
parseWordData(fs.readFileSync(special, "utf8"));

const files = [
  "vocab-lesson.html",
  "assets/js/vocab-lesson.js",
  "assets/css/vocab-lesson.css"
];
files.forEach(f => assert(fs.existsSync(path.join(root, f)), f));

const js = fs.readFileSync(path.join(root, "assets/js/vocab-lesson.js"), "utf8");
[
  "meaning_to_word",
  "word_to_meaning",
  "listen_meaning",
  "scramble",
  "type_spell",
  "错题重练",
  "免费重新注入",
  "parseWordData",
  "mergeWrongWords",
  "yysd:vocab-lesson-streak"
].forEach(s => assert(js.includes(s), "engine has " + s));

const html = fs.readFileSync(path.join(root, "vocab-lesson.html"), "utf8");
assert(html.includes("vocab-lesson.js") && html.includes("vl-root"), "lesson shell");

const zone = fs.readFileSync(path.join(root, "assets/js/zone.js"), "utf8");
assert(zone.includes("vocab-realm-banner") && zone.includes("word-realm.html"), "zone dual-entry promo");
assert(zone.includes("开始背单词") || zone.includes("开始 ›"), "zone homework CTA");

const vocab = fs.readFileSync(path.join(root, "assets/js/vocab.js"), "utf8");
assert(vocab.includes("vocabLessonHref") && vocab.includes("开始小课"), "vocab hub CTA");

const realm = fs.readFileSync(path.join(root, "assets/js/word-realm.js"), "utf8");
assert(realm.includes("from=realm") && realm.includes("vocab-lesson.html"), "realm → lesson");
assert(realm.includes("mode=camp") && realm.includes("shrine="), "camp + shrine links");

const lessonBoot = fs.readFileSync(path.join(root, "assets/js/vocab-lesson.js"), "utf8");
assert(lessonBoot.includes("bootRealm") && lessonBoot.includes("startCamp"), "realm/camp boot");

const cfg = fs.readFileSync(path.join(root, "assets/js/config.js"), "utf8");
assert(cfg.includes("function vocabLessonHref") && cfg.includes("vocabLessonHref: vocabLessonHref"), "config export");

console.log("vocab-lesson smoke ok · sample words:", words.length);
