#!/usr/bin/env node
// ponytail: assert 听力绝密套卷1 is 40 keyed questions + calendar cat
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function must(cond, msg) { if (!cond) throw new Error(msg); }

var html = fs.readFileSync(path.join(root, "library/mock/cambridge-listening/secret-set-1.html"), "utf8");
must(html.indexOf('exam:title" content="绝密套卷1（听力）"') >= 0, "title meta");
must(html.indexOf("secret-set-1-map.png") >= 0, "map ref");
must(html.indexOf("secret-set-1-audio1.mp3") >= 0, "audio1");
must(html.indexOf("剑桥雅思12") < 0, "leftover cam12");
["1", "2", "3", "4"].forEach(function (n) {
  must(fs.existsSync(path.join(root, "library/mock/cambridge-listening/secret-set-1-audio" + n + ".mp3")), "audio" + n);
});
must(fs.existsSync(path.join(root, "library/mock/cambridge-listening/secret-set-1-map.png")), "map file");

var m = html.match(/const TEST = (\{[\s\S]*?\n\});\n/);
must(m, "TEST json");
var TEST = JSON.parse(m[1]);
var expect = [
  "SKELLARN", "park", "4.30", "drama", "singing", "artists", "films", "magazines", "number", "maps",
  "A", "A", "B", "B", "E", "I", "J", "A", "C", "G",
  "C", "A", "B", "A", "C", "C", "E", "A", "C", "B",
  "coconut", "mold", "pressed", "machinery", "dried", "traders", "balls", "more elastic", "tires", "Germany"
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

var cal = fs.readFileSync(path.join(root, "teacher-calendar.html"), "utf8");
must(cal.indexOf('data-ex-cat="lsecret"') >= 0, "calendar chip");
var js = fs.readFileSync(path.join(root, "assets/js/teacher-calendar.js"), "utf8");
must(js.indexOf("function isSecretListening") >= 0, "isSecretListening");
must(js.indexOf('cat === "lsecret"') >= 0, "itemInCat lsecret");
must(/cat === "skill" \|\| cat === "suite" \|\| cat === "rsecret" \|\| cat === "lsecret"/.test(js), "exam pack");
must(js.indexOf("it.subject !== \"cambridge-reading\"") >= 0, "reading gated by subject");
function isSecretReading(it) {
  if (!it || it.subject !== "cambridge-reading") return false;
  return /^secret-set-\d+/.test(it.id || "");
}
must(!isSecretReading({ id: "secret-set-1", subject: "cambridge-listening", title: "绝密套卷1 (听力)" }), "listen not in rsecret");
must(isSecretReading({ id: "secret-set-1-reading", subject: "cambridge-reading" }), "read in rsecret");

var man = JSON.parse(fs.readFileSync(path.join(root, "library/manifest.json"), "utf8"));
var items = man.items || man;
var hit = (items || []).filter(function (it) { return it.id === "secret-set-1"; });
must(hit.length === 1, "manifest id");
must(hit[0].subject === "cambridge-listening", "manifest subject");
must(/绝密套卷1（听力）/.test(hit[0].title), "manifest title " + hit[0].title);
must(man.count === items.length, "count " + man.count + " vs " + items.length);

var cfg = fs.readFileSync(path.join(root, "assets/js/config.js"), "utf8");
var re = /^(cambridge-\d+-test-\d+(?:-reading)?|secret-set-\d+(?:-reading)?)-(s|p)(\d+)$/i;
must("secret-set-1-s2".match(re)[1] === "secret-set-1", "s2 parent");
must("secret-set-1".match(re) == null, "full listen paper not a part");

console.log("check_secret_set_1_listening: ok");
