#!/usr/bin/env node
// ponytail: assert 绝密套卷2 is 40 keyed questions + catalog id
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function must(cond, msg) { if (!cond) throw new Error(msg); }

var html = fs.readFileSync(path.join(root, "library/mock/cambridge-reading/secret-set-2-reading.html"), "utf8");
must(html.indexOf('exam:title" content="绝密套卷2（阅读）"') >= 0, "title meta");
must(html.indexOf("绝密套卷1") < 0, "leftover 套卷1");

var m = html.match(/const TEST = (\{[\s\S]*?\n\});\n/);
must(m, "TEST json");
var TEST = JSON.parse(m[1]);
var expect = [
  "TRUE","NOT GIVEN","FALSE","NOT GIVEN","TRUE","FALSE","TRUE",
  "camouflage","hands","birth","veins","heart","signals",
  "iv","vii","i","viii","vi","ii",
  "C","D",
  "truth","journalists","nurses","dedication","documents",
  "C","B","C","B",
  "NO","NO","NOT GIVEN","NOT GIVEN","YES",
  "F","E","C","A","D"
];
function norm(s) {
  return String(s || "").toLowerCase().replace(/[£$,.;:!?"'’]/g, "").replace(/\s+/g, " ").trim().replace(/^(a|an|the)\s+/, "");
}
var got = [];
TEST.passages.forEach(function (p) {
  p.groups.forEach(function (g) {
    g.questions.forEach(function (q) {
      got.push(q.answer[0]);
      must(q.answer.map(norm).indexOf(norm(q.answer[0])) >= 0, "self-grade Q" + q.no);
      must(q.explain && q.explain.indexOf("定位") >= 0 && q.explain.length > 40, "explain Q" + q.no);
    });
  });
});
must(got.length === 40, "need 40 got " + got.length);
got.forEach(function (a, i) { must(a === expect[i], "Q" + (i + 1) + " " + a + " != " + expect[i]); });
must(TEST.passages[1].groups[1].answerSet.join("") === "CD", "multi C+D");

var man = JSON.parse(fs.readFileSync(path.join(root, "library/manifest.json"), "utf8"));
var items = man.items || man;
var hit = (items || []).filter(function (it) { return it.id === "secret-set-2-reading"; });
must(hit.length === 1, "manifest id");
must(/绝密套卷2/.test(hit[0].title), "manifest title");

console.log("check_secret_set_2: ok");
