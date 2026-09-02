#!/usr/bin/env node
// ponytail: assert 绝密套卷1 is 40 keyed questions + calendar cat
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function must(cond, msg) { if (!cond) throw new Error(msg); }

var html = fs.readFileSync(path.join(root, "library/mock/cambridge-reading/secret-set-1-reading.html"), "utf8");
must(html.indexOf('exam:title" content="绝密套卷1（阅读）"') >= 0, "title meta");
must(html.indexOf("secret-set-1-coaster.png") >= 0, "diagram ref");
must(html.indexOf("const fig=(g.image") >= 0, "note image render");
must(fs.existsSync(path.join(root, "library/mock/cambridge-reading/secret-set-1-coaster.png")), "diagram file");

var m = html.match(/const TEST = (\{[\s\S]*?\n\});\n/);
must(m, "TEST json");
var TEST = JSON.parse(m[1]);
var expect = [
  "clay","goddesses","limbs","wax","plaster","composition",
  "FALSE","TRUE","FALSE","TRUE","TRUE","FALSE","NOT GIVEN",
  "chain","gear","motor","ice","waxed","wheels","coal","steam engines",
  "TRUE","FALSE","NOT GIVEN","TRUE","TRUE",
  "D","C","B","A","C","YES","NOT GIVEN","NO","YES","F","A","H","G","I"
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
    });
  });
});
must(got.length === 40, "need 40 got " + got.length);
got.forEach(function (a, i) { must(a === expect[i], "Q" + (i + 1) + " " + a + " != " + expect[i]); });
TEST.passages.forEach(function (p) {
  p.groups.forEach(function (g) {
    g.questions.forEach(function (q) {
      must(q.explain && q.explain.indexOf("定位") >= 0 && q.explain.length > 40, "explain Q" + q.no);
    });
  });
});

var cal = fs.readFileSync(path.join(root, "teacher-calendar.html"), "utf8");
must(cal.indexOf('data-ex-cat="rsecret"') >= 0, "calendar chip");
var js = fs.readFileSync(path.join(root, "assets/js/teacher-calendar.js"), "utf8");
must(js.indexOf("function isSecretReading") >= 0, "isSecretReading");
must(js.indexOf('cat === "rsecret"') >= 0, "itemInCat rsecret");
must(/cat === "skill" \|\| cat === "suite" \|\| cat === "rsecret"/.test(js), "exam pack");

var man = JSON.parse(fs.readFileSync(path.join(root, "library/manifest.json"), "utf8"));
var items = man.items || man;
if (!Array.isArray(items)) items = man.exams || man.catalog || Object.values(man).filter(Array.isArray)[0];
var hit = (items || []).filter(function (it) { return it.id === "secret-set-1-reading"; });
must(hit.length === 1, "manifest id");
must(/绝密套卷/.test(hit[0].title), "manifest title " + hit[0].title);

var cfg = fs.readFileSync(path.join(root, "assets/js/config.js"), "utf8");
var partRe = /secret-set-\\d\+-reading/;
must(partRe.test(cfg), "parsePartId accepts secret-set");
var m1 = "secret-set-1-reading-p2".match(/^(cambridge-\d+-test-\d+(?:-reading)?|secret-set-\d+-reading)-(s|p)(\d+)$/i);
must(m1 && m1[1] === "secret-set-1-reading" && m1[3] === "2", "p2 parent");
must("secret-set-1-reading".match(/^(cambridge-\d+-test-\d+(?:-reading)?|secret-set-\d+-reading)-(s|p)(\d+)$/i) == null, "full paper not a part");
must("cambridge-12-test-1-reading-p1".match(/^(cambridge-\d+-test-\d+(?:-reading)?|secret-set-\d+-reading)-(s|p)(\d+)$/i), "cam part still parses");

console.log("check_secret_set_1: ok");
