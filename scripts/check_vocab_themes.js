#!/usr/bin/env node
/* ponytail: browse-only thematic lexicon check */
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var dir = path.join(root, "library/study/vocab-themes");
var cat = JSON.parse(fs.readFileSync(path.join(dir, "themes.json"), "utf8"));
var fail = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); fail++; }
  else console.log("ok:", msg);
}
assert(cat.categories && cat.categories.length >= 8, "categories");
assert(cat.themes && cat.themes.length >= 20, "themes");
var shells = fs.readdirSync(dir).filter(function (n) { return /^theme-\d+-.*\.html$/.test(n); });
assert(shells.length === 0, "no lesson HTML shells");
cat.themes.forEach(function (t) {
  assert(!!t.dataFile, t.id + " dataFile");
  var p = path.join(root, "library", t.dataFile);
  assert(fs.existsSync(p), t.dataFile);
  var data = JSON.parse(fs.readFileSync(p, "utf8"));
  assert(Array.isArray(data.words) && data.words.length >= 4, t.id + " words");
});
var man = JSON.parse(fs.readFileSync(path.join(root, "library/manifest.json"), "utf8"));
var n = (man.items || []).filter(function (i) { return i.subject === "vocab-themes"; }).length;
assert(n === 0, "manifest has no vocab-themes lessons");
process.exit(fail ? 1 : 0);
