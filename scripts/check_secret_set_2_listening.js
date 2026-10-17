#!/usr/bin/env node
// ponytail: assert 听力绝密套卷2 is 40 keyed questions
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function must(cond, msg) { if (!cond) throw new Error(msg); }

var html = fs.readFileSync(path.join(root, "library/mock/cambridge-listening/secret-set-2.html"), "utf8");
must(html.indexOf('exam:title" content="绝密套卷2（听力）"') >= 0, "title meta");
must(html.indexOf("secret-set-2-map.png") >= 0, "map ref");
must(html.indexOf("secret-set-2-audio1.mp3") >= 0, "audio1");
must(html.indexOf("绝密套卷1") < 0, "leftover 套卷1");
["1", "2", "3", "4"].forEach(function (n) {
  must(fs.existsSync(path.join(root, "library/mock/cambridge-listening/secret-set-2-audio" + n + ".mp3")), "audio" + n);
});
must(fs.existsSync(path.join(root, "library/mock/cambridge-listening/secret-set-2-map.png")), "map file");

var m = html.match(/const TEST = (\{[\s\S]*?\n\});\n/);
must(m, "TEST json");
var TEST = JSON.parse(m[1]);
var expect = [
  "620", "3 weeks", "breakfast", "stand", "back", "3000", "pilot", "Farley", "flat", "hat",
  "F", "H", "E", "G", "C", "D", "A", "A", "B", "B",
  "B", "C", "B", "A", "C", "A", "A", "E", "C", "F",
  "flooding", "firewood", "fertilizer", "trash", "sand", "gray", "hot house", "rainwater", "rabbit", "storm"
];
function norm(s) {
  return String(s || "").toLowerCase().replace(/[£$,.;:!?"'’]/g, "").replace(/\s+/g, " ").trim().replace(/^(a|an|the)\s+/, "");
}
var got = [];
TEST.sections.forEach(function (s) {
  s.groups.forEach(function (g) {
    g.questions.forEach(function (q) {
      got.push(q.answer[0]);
      must(q.answer.map(norm).indexOf(norm(q.answer[0])) >= 0, "self-grade Q" + q.no);
      must(q.explain && q.explain.indexOf("定位") >= 0 && q.explain.length > 40, "explain Q" + q.no);
    });
  });
});
must(got.length === 40, "need 40 got " + got.length);
got.forEach(function (a, i) { must(a === expect[i], "Q" + (i + 1) + " " + a + " != " + expect[i]); });

var man = JSON.parse(fs.readFileSync(path.join(root, "library/manifest.json"), "utf8"));
var items = man.items || man;
var hit = (items || []).filter(function (it) { return it.id === "secret-set-2"; });
must(hit.length === 1, "manifest id");
must(hit[0].subject === "cambridge-listening", "manifest subject");
must(/绝密套卷2（听力）/.test(hit[0].title), "manifest title");
must(man.count === items.length, "count " + man.count + " vs " + items.length);

console.log("check_secret_set_2_listening: ok");
