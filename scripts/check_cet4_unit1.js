#!/usr/bin/env node
/** Check CET-4 rebuild: 35 units, unit1 rich fields, no legacy 55. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const man = JSON.parse(fs.readFileSync(path.join(root, "library/manifest.json"), "utf8"));
const cet = man.items.filter((i) => i.subject === "vocab-cet4");
if (cet.length !== 35) throw new Error("expected 35 cet4 units, got " + cet.length);

const html1 = fs.readFileSync(path.join(root, "library/study/vocab-cet4/四级单词LIST1.html"), "utf8");
const m = html1.match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
if (!m) throw new Error("wordData missing");
const words = Function("return (" + m[1] + ")")();
if (words.length < 70) throw new Error("unit1 too few words: " + words.length);
for (const w of words) {
  if (!w.mnemonic || !w.collocations || !w.example || !Array.isArray(w.acceptCN) || !w.acceptCN.length) {
    throw new Error("unit1 incomplete: " + w.word);
  }
}
if (fs.existsSync(path.join(root, "library/study/vocab-cet4/四级单词LIST55.html"))) {
  throw new Error("legacy LIST55 still in active folder");
}
if (!fs.existsSync(path.join(root, "assets/js/config.js")) ||
    !fs.readFileSync(path.join(root, "assets/js/config.js"), "utf8").includes('id: "high"')) {
  throw new Error("cet4 bands missing in config");
}
console.log("ok cet4 rebuild", cet.length, "units; unit1", words.length, "words");
