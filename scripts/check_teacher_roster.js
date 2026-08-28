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
assert(html.indexOf("teacher-shell.js") >= 0, "fixed sidebar shell script");
assert(html.indexOf("data-teacher-nav-toggle") >= 0, "mobile hamburger");
assert(html.indexOf("id=\"teacher-side\"") >= 0, "sidebar id for drawer");
assert(html.indexOf("assets/js/teacher.js") >= 0, "same teacher.js (no data rewrite)");

var desk = read("assets/css/teacher-desk.css");
assert(desk.indexOf(".teacher-student-card__late") >= 0, "overdue badge desk style");
assert(html.indexOf("crumb-sep\" aria-hidden=\"true\">★") < 0, "no gold star crumb");
assert(html.indexOf("Playfair") < 0, "no Playfair on teacher.html");
assert(read("dashboard.html").indexOf("teacher-desk.css") < 0, "student dashboard unskinned");
assert(read("server/server.js").indexOf("hasOverdue") >= 0, "roster API intact");
assert(html.indexOf("data-zone") < 0, "no zone filters");
assert(html.indexOf("teacher-stats") < 0, "no dump stats");

var js = read("assets/js/teacher.js");
assert(js.indexOf("teacher.html?student=") >= 0, "bento links to student page");
assert(js.indexOf("hasOverdue") >= 0, "overdue badge");
assert(js.indexOf("localeCompare") >= 0 && js.indexOf("\"zh\"") >= 0, "name sort");
assert(js.indexOf("dayKeyOf(ev.createdAt)") >= 0, "calendar falls on createdAt");
assert(js.indexOf("practicesOnDay") < 0, "calendar is assignment-only");
assert(js.indexOf("latestAssignDay") >= 0, "default latest assign day");
assert(js.indexOf("linkedExerciseIds") >= 0, "assigned attempt matched without event id");
assert(js.indexOf("data-cal-year") >= 0 && js.indexOf("data-cal-month") >= 0, "year/month selects");

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

assert(html.indexOf("id=\"report-month\"") >= 0, "report month select");
assert(html.indexOf("id=\"report-export\"") >= 0, "report export button");

assert(js.indexOf("fillReportMonths") >= 0, "last 12 months");
assert(js.indexOf("teacher-student-report.html?student=") >= 0, "export opens print page");

assert(server.indexOf("/api/teacher/students/:userId/report") >= 0, "report API");
assert(server.indexOf("function monthKeyOf") >= 0, "month bucket helper");
assert(read("assets/js/teacher-student-report.js").indexOf("本月无记录") >= 0, "empty month copy");
assert(read("teacher-student-report.html").indexOf("打印 / 存 PDF") >= 0, "print to PDF");
assert(read("assets/js/teacher-auth.js").indexOf("teacher-student-report.html") >= 0, "report page gated");
assert(read("assets/js/tenant-boot.js").indexOf("teacher-student-report.html") >= 0, "tenant boot allows report");

function monthKeyOf(iso) {
  var d = new Date(iso);
  var m = d.getMonth() + 1;
  return d.getFullYear() + "-" + (m < 10 ? "0" + m : String(m));
}
var ym = "2026-08";
var allMine = [
  { id: 1, createdAt: "2026-08-05T12:00:00", status: "COMPLETED" },
  { id: 2, createdAt: "2026-07-20T12:00:00", status: "COMPLETED" }
];
var scores = [
  { assignmentEventId: "1", date: "2026-08-06T12:00:00", score: 30, total: 40, subject: "cambridge-listening" },
  { assignmentEventId: "2", date: "2026-08-10T12:00:00", score: 20, total: 40, subject: "cambridge-reading" },
  { date: "2026-08-20T12:00:00", zone: "mock", score: 25, total: 40, subject: "cambridge-writing" }
];
var monthAssign = allMine.filter(function (ev) { return monthKeyOf(ev.createdAt) === ym; });
assert(monthAssign.length === 1 && monthAssign[0].id === 1, "assignments bucket by createdAt");
var myIds = {};
allMine.forEach(function (ev) { myIds[String(ev.id)] = 1; });
var practices = scores.filter(function (s) {
  return monthKeyOf(s.date) === ym && !(s.assignmentEventId && myIds[String(s.assignmentEventId)]);
});
assert(practices.length === 1 && practices[0].zone === "mock", "July homework done in Aug is not Aug self-practice");
assert(monthAssign.filter(function (a) { return a.status === "COMPLETED"; }).length === 1, "completion only counts assigned homework");
assert(practices[0].zone === "mock", "mocks counted separately");

var ev = { id: 9, linkedExerciseIds: ["cambridge-12-test-1"] };
var attemptRows = [
  { assignmentEventId: "9", id: "other", title: "by-event" },
  { id: "cambridge-12-test-1", title: "legacy-linked" }
];
function scoreForEvent(event, list) {
  var i, j;
  for (i = 0; i < list.length; i++) {
    if (String(list[i].assignmentEventId || "") === String(event.id)) return list[i];
  }
  for (j = 0; j < (event.linkedExerciseIds || []).length; j++) {
    for (i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(event.linkedExerciseIds[j])) return list[i];
    }
  }
  return null;
}
assert(scoreForEvent(ev, attemptRows).title === "by-event", "prefer assignmentEventId");
assert(scoreForEvent(ev, attemptRows.slice(1)).title === "legacy-linked", "legacy assigned attempt still attaches");

console.log("ok: teacher roster 我的学生");
