#!/usr/bin/env node
"use strict";
/** Dedupe wordData entries in vocab HTML by lowercase headword (keeps first, merges acceptCN). */
var fs = require("fs");
var path = require("path");

var targets = process.argv.slice(2);
if (!targets.length) {
  console.error("usage: node dedupe_vocab_html_lists.js <html files...>");
  process.exit(1);
}

function dedupeFile(abs) {
  var html = fs.readFileSync(abs, "utf8");
  var m = html.match(/((?:const|var|let)\s+wordData\s*=\s*)(\[[\s\S]*?\])(\s*;)/);
  if (!m) {
    console.log("skip (no wordData):", abs);
    return 0;
  }
  var arr = Function('"use strict"; return (' + m[2] + ");")();
  if (!Array.isArray(arr)) throw new Error("not array: " + abs);
  var seen = {};
  var out = [];
  var removed = 0;
  arr.forEach(function (w) {
    var key = String(w.word || "").trim().toLowerCase();
    if (!key) return;
    if (seen[key]) {
      var prev = out[seen[key].idx];
      var ac = prev.acceptCN || [];
      (w.acceptCN || []).forEach(function (s) {
        s = String(s || "").trim();
        if (s && ac.indexOf(s) < 0) ac.push(s);
      });
      prev.acceptCN = ac.slice(0, 6);
      removed++;
      return;
    }
    seen[key] = { idx: out.length };
    out.push(w);
  });
  if (!removed) {
    console.log("ok (no dups):", abs);
    return 0;
  }
  out.forEach(function (w, i) { w.id = i + 1; });
  var json = JSON.stringify(out, null, 2);
  var next = html.slice(0, m.index) + m[1] + json + m[3] + html.slice(m.index + m[0].length);
  fs.writeFileSync(abs, next, "utf8");
  console.log("deduped", removed, "in", path.basename(abs), "→", out.length, "words");
  return removed;
}

var total = 0;
targets.forEach(function (f) {
  total += dedupeFile(path.resolve(f));
});
console.log("total removed:", total);
