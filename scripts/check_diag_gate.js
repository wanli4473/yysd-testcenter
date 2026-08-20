/* smoke: first-vocab gate wiring */
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var fails = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function must(cond, msg) {
  if (!cond) fails.push(msg);
}

var gate = read("assets/js/diagnostic-gate.js");
must(gate.indexOf("GATE_ENABLED") >= 0, "gate has enable switch");
must(gate.indexOf("placement_done") >= 0, "gate checks placement_done");
must(gate.indexOf("diagnostic.html?gate=1") >= 0, "gate redirects to gate=1");
must(gate.indexOf("bookForLevel") >= 0, "gate exports bookForLevel");

var statusApi = read("server/diagnostic.js");
must(statusApi.indexOf("placement_done") >= 0, "status API returns placement_done");

["vocab.html", "vocab-shelf.html", "vocab-lesson.html", "wrong-words.html", "zone.html", "word-realm.html", "diagnostic-report.html"].forEach(function (f) {
  must(read(f).indexOf("diagnostic-gate.js") >= 0, f + " includes diagnostic-gate.js");
});

var diag = read("assets/js/diagnostic.js");
must(diag.indexOf('get("gate") === "1"') >= 0, "diagnostic reads gate=1");
must(diag.indexOf("placement=1") >= 0, "diagnostic completes to placement report");
must(diag.indexOf("开始测试") >= 0 && diag.indexOf("首次词汇能力测试") >= 0, "gate intro CTA");

var report = read("assets/js/diagnostic-report.js");
must(report.indexOf('placement") === "1"') >= 0, "report placement mode");
must(report.indexOf("学习建议") >= 0, "report shows 学习建议");
must(report.indexOf("vocab-shelf.html") >= 0, "report CTA to shelf");

var zone = read("assets/js/zone.js");
must(zone.indexOf("YYSD_DIAG_GATE") >= 0, "zone uses gate");
must(zone.indexOf('next === "vocab"') >= 0, "zone gates vocab chip click");

var shelfUi = read("assets/js/vocab-shelf-ui.js");
must(shelfUi.indexOf("YYSD_DIAG_GATE") >= 0, "shelf UI gated boot");

var vocab = read("assets/js/vocab.js");
must(vocab.indexOf("vocab-shelf.html") >= 0, "vocab.js redirects to shelf");

if (fails.length) {
  console.error("FAIL\n" + fails.join("\n"));
  process.exit(1);
}
console.log("OK diag gate smoke (" + [
  "gate", "api", "html", "diagnostic", "report", "zone", "shelf"
].join(", ") + ")");
