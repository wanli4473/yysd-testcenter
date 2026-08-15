/** Smoke: vocab challenge UI wiring. Exit 1 on failure. */
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

["vocab-challenge.html", "teacher-vocab-challenge.html",
  "assets/js/vocab-challenge-ui.js", "assets/js/teacher-vocab-challenge.js"].forEach(function (f) {
  assert.ok(fs.existsSync(path.join(root, f)), "missing " + f);
});

var html = read("vocab-challenge.html");
assert.ok(html.indexOf("vocab-challenge-ui.js") >= 0, "student page loads ui");
assert.ok(html.indexOf("vocab-learn.css") >= 0, "reuses learn css");

var ui = read("assets/js/vocab-challenge-ui.js");
assert.ok(ui.indexOf("/api/vocab-challenge/start") >= 0, "start api");
assert.ok(ui.indexOf("/api/vocab-challenge/submit-new") >= 0, "submit-new");
assert.ok(ui.indexOf("/api/vocab-challenge/submit-review") >= 0, "submit-review");
assert.ok(ui.indexOf("/api/vocab-challenge/notebook") >= 0, "notebook");
assert.ok(ui.indexOf("先选中文含义，再拼写") >= 0 || ui.indexOf("先选中文") >= 0, "A then D");

var zone = read("assets/js/zone.js");
assert.ok(zone.indexOf("vocab-challenge.html") >= 0, "zone links challenge");
assert.ok(zone.indexOf("单词闯关") >= 0, "zone label");

var teacher = read("teacher.html");
assert.ok(teacher.indexOf("teacher-vocab-challenge.html") >= 0, "teacher nav");

var eng = read("server/vocab-challenge.js");
assert.ok(eng.indexOf("JSON.stringify(w)") >= 0, "word_json stores full word");

require(path.join(root, "server", "vocab-challenge")).selfCheck();
console.log("check_vocab_challenge ok");
