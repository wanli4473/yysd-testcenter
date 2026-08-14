#!/usr/bin/env node
// ponytail: smoke — multi-book refs wiring stays intact
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

var shelf = read("server/vocab-shelf.js");
assert(shelf.indexOf("buildPoolFromRefs") >= 0, "buildPoolFromRefs");
assert(shelf.indexOf("parseVocabRefs") >= 0, "parseVocabRefs");
assert(/req\.query\.refs/.test(shelf), "quiz-pool reads refs");
assert(!/insertCalendarEvent[\s\S]{0,800}vocab-learn/.test(
  read("server/server.js").slice(
    read("server/server.js").indexOf("var created = db.transaction"),
    read("server/server.js").indexOf("var created = db.transaction") + 900
  )
), "create event must not seed vocab-learn twin");

var quiz = read("assets/js/vocab-quiz.js");
assert(quiz.indexOf('params.get("refs")') >= 0, "quiz reads refs");
assert(quiz.indexOf("quiz-pool?refs=") >= 0, "quiz calls refs pool");

var dash = read("assets/js/dashboard.js");
assert(dash.indexOf("refs=") >= 0 && dash.indexOf("vocab-quiz.html?refs=") >= 0, "dashboard refs href");

var stu = read("assets/js/student-calendar.js");
assert(stu.indexOf("vocab-quiz.html?refs=") >= 0, "student-calendar refs href");

var teach = read("assets/js/teacher-calendar.js");
assert(teach.indexOf("可跨词书勾选多个 List") >= 0, "teacher multi-book hint");
assert(teach.indexOf("请至少勾选 1 个 List") >= 0, "teacher multi validate");
assert(teach.indexOf("含同 List 列表学习") < 0, "no learn twin copy");

assert(quiz.indexOf("renderAssignPicker") >= 0, "assign picker");
assert(quiz.indexOf("本 List 通过") >= 0 || quiz.indexOf("assignPartial") >= 0, "partial pass UX");

var server = read("server/server.js");
assert(server.indexOf("partial: true") >= 0, "partial complete");
assert(server.indexOf("passedLists") >= 0, "passedLists progress");

console.log("ok: vocab quiz multi-book refs + per-list assign");
