/** Smoke: cet4-lite book + dual IPA + ebbinghaus. Exit 1 on failure. */
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

var dir = path.join(root, "library/study/vocab-cet4-lite");
assert.ok(fs.existsSync(dir), "lite dir");
var files = fs.readdirSync(dir).filter(function (f) { return f.endsWith(".html"); });
assert.strictEqual(files.length, 30, "30 lists");

var shelf = require("../server/vocab-shelf");
var cat = shelf.buildCatalog(root);
assert.ok(cat.byId["cet4-lite"], "catalog book");
assert.strictEqual(cat.byId["cet4-lite"].listCount, 30, "catalog 30");
assert.strictEqual(cat.byId["cet4-lite"].label, "四级词汇（精简版）", "label");

var total = 0;
var dualSpell = 0;
var dualIpa = 0;
cat.byId["cet4-lite"].lists.forEach(function (l) {
  var lesson = shelf.resolveLesson(root, cat.byId["cet4-lite"], l.id);
  assert.ok(lesson && lesson.words.length, "lesson " + l.id);
  total += lesson.words.length;
  lesson.words.forEach(function (w) {
    assert.ok(w.word && w.meaning, "card " + w.word);
    assert.ok(String(w.ipa || "").indexOf(" · ") < 0, "no concatenated ipa " + w.word);
    if (w.wordUk && w.wordUs && w.wordUk !== w.wordUs) dualSpell += 1;
    if (w.ipaUs && w.ipaUk && w.ipaUs !== w.ipaUk) dualIpa += 1;
    assert.ok(w.spellings && w.spellings.length, "spellings " + w.word);
  });
});
assert.strictEqual(total, 1707, "1707 words, got " + total);
assert.ok(dualSpell > 10, "dual spellings present");
assert.ok(dualIpa > 20, "split IPA present");

var l1 = shelf.resolveLesson(root, cat.byId["cet4-lite"], cat.byId["cet4-lite"].lists[0].id);
assert.strictEqual(l1.words.length, 57, "list1 size");
assert.strictEqual(l1.words[0].word, "according to", "list1 order");

var sched = JSON.parse(read("server/schedules/cet4-lite-ebbinghaus-schedule.json"));
assert.strictEqual(sched.totalLists, 30, "sched lists");
assert.ok(sched.totalDays >= 50, "sched days " + sched.totalDays);
assert.strictEqual(sched.days["1"].new, 1, "day1 new");
assert.ok((sched.days["1"].reviews || []).length === 0, "day1 no review");

var schJs = read("server/vocab-challenge-schedule.js");
assert.ok(schJs.indexOf("cet4-lite") >= 0, "schedule wired");
assert.ok(read("assets/js/config.js").indexOf("vocab-cet4-lite") >= 0, "config subject");
assert.ok(read("scripts/build_manifest.py").indexOf('"vocab-cet4-lite"') >= 0, "manifest builder subject");
assert.ok(read("assets/js/teacher-vocab-challenge.js").indexOf("布置四级精简") >= 0, "teacher button");
assert.ok(read("assets/js/teacher-vocab-challenge.js").indexOf("取消布置") >= 0, "unassign");
assert.ok(read("server/vocab-challenge.js").indexOf("unassignBook") >= 0, "unassign api");
assert.ok(read("server/vocab-challenge.js").indexOf("PRIMARY KEY (student_id, book_id)") >= 0, "multi pk");
assert.ok(read("assets/js/vocab-learn.js").indexOf("accentOf") >= 0, "learn split accent");
assert.ok(read("assets/js/english-spell-input.js").indexOf("matchesAny") >= 0, "client dual spell");
assert.ok(read("server/vocab-grade.js").indexOf("spellMatchesAny") >= 0, "server dual spell");

console.log("cet4-lite ok · words=" + total + " dualSpell=" + dualSpell + " dualIpa=" + dualIpa +
  " days=" + sched.totalDays);
