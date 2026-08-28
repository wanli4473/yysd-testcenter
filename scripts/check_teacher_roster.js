#!/usr/bin/env node
// ponytail: roster + assign-day grouping must not regress into the mixed score dump
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); process.exit(1); }
}

var html = read("teacher.html");
assert(html.indexOf(">我的学生<") >= 0, "teacher.html title 我的学生");
assert(html.indexOf("stu-home") >= 0, "student home layout");
assert(html.indexOf("data-zone") < 0, "no zone filters");
assert(html.indexOf("teacher-stats") < 0, "no dump stats");

var js = read("assets/js/teacher.js");
assert(js.indexOf("teacher.html?student=") >= 0, "bento links to student page");
assert(js.indexOf("hasOverdue") >= 0, "overdue badge");
assert(js.indexOf("localeCompare") >= 0 && js.indexOf("\"zh\"") >= 0, "name sort");
assert(js.indexOf("dayKeyOf(ev.createdAt)") >= 0, "calendar falls on createdAt");
assert(js.indexOf("latestAssignDay") >= 0, "default latest assign day");

var server = read("server/server.js");
assert(server.indexOf("Number(ev.createdBy) === Number(req.user.sub)") >= 0, "only this teacher's assignments");
assert(server.indexOf("function calendarEventsForStudent") >= 0, "shared calendar mapper");
assert(/hasOverdue:\s*!!overdueSet/.test(server), "roster overdue flag");
assert(!/scores:\s*filtered/.test(server), "roster must not dump scores[]");

var css = read("assets/css/dashboard-premium.css");
assert(css.indexOf(".teacher-student-card.is-overdue") >= 0, "overdue card style");
assert(css.indexOf(".stu-home .cal-month__chip.is-pending") >= 0, "amber pending");
assert(css.indexOf(".stu-home .cal-month__chip.is-done") >= 0, "green done");

assert(read("teacher-calendar.html").indexOf("我的学生") >= 0, "nav calendar");
assert(read("teacher-diagnostic.html").indexOf("我的学生") >= 0, "nav diagnostic");

function pad(n) { return n < 10 ? "0" + n : "" + n; }
function dayKeyOf(iso) {
  var d = new Date(iso);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
var events = [
  { createdAt: "2026-08-28T02:00:00.000Z", eventType: "ASSIGNMENT" },
  { createdAt: "2026-08-27T02:00:00.000Z", eventType: "LESSON" }
];
var day = dayKeyOf(events[0].createdAt);
var onDay = events.filter(function (ev) {
  return ev.eventType === "ASSIGNMENT" && dayKeyOf(ev.createdAt) === day;
});
assert(onDay.length === 1 && onDay[0].eventType === "ASSIGNMENT", "assign-day filter");

var names = [{ displayName: "周周" }, { displayName: "阿明" }, { displayName: "" , phone: "13800000000" }];
names.sort(function (a, b) {
  return (a.displayName || a.phone || "").localeCompare(b.displayName || b.phone || "", "zh");
});
assert(names[0].phone === "13800000000" || names[0].displayName === "阿明", "zh name sort runs");

console.log("ok: teacher roster 我的学生");
