/* ponytail: sidecar shape for 详解原文条 — fails if a volume is missing or windows invert */
var fs = require("fs");
var path = require("path");
function assert(cond, msg) { if (!cond) { console.error("FAIL:", msg); process.exit(1); } }
var dir = "library/mock/cambridge-listening";
function load(vol, test) {
  return JSON.parse(fs.readFileSync(path.join(dir, "cambridge-" + vol + "-test-" + test + "-transcript.json"), "utf8"));
}
var t21 = load(21, 1);
assert(t21.parts && t21.parts.length === 4, "c21 t1 4 parts");
assert(t21.parts[0].sentences.some(function (s) { return s.zh; }), "c21 t1 has zh");
var t17 = load(17, 1);
assert(t17.parts[0].sentences.some(function (s) { return s.zh; }), "c17 t1 has zh");
var w = { start: 118, end: 160 };
var n = t21.parts[0].sentences.filter(function (s) { return s.end > w.start && s.start < w.end; }).length;
assert(n > 3 && n < t21.parts[0].sentences.length, "c21 window ⊂ section");
for (var vol = 5; vol <= 21; vol++) {
  for (var test = 1; test <= 4; test++) {
    var p = path.join(dir, "cambridge-" + vol + "-test-" + test + "-transcript.json");
    assert(fs.existsSync(p), "missing " + p);
    var data = JSON.parse(fs.readFileSync(p, "utf8"));
    assert((data.parts || []).length === 4, vol + " t" + test + " parts");
    data.parts.forEach(function (part) {
      (part.sentences || []).forEach(function (s, i) {
        assert(Number(s.end) > Number(s.start), vol + " t" + test + " s" + part.section + " #" + i);
      });
    });
  }
}
console.log("ok: listen sidecars 5–21");
