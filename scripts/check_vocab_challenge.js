/** Smoke: vocab challenge UI wiring. Exit 1 on failure. */
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

["vocab-challenge.html", "teacher-vocab-challenge.html",
  "assets/js/vocab-challenge-ui.js", "assets/js/teacher-vocab-challenge.js",
  "server/schedules/gaozhong-ebbinghaus-schedule.json", "server/vocab-challenge-schedule.js"].forEach(function (f) {
  assert.ok(fs.existsSync(path.join(root, f)), "missing " + f);
});

var sched = JSON.parse(read("server/schedules/gaozhong-ebbinghaus-schedule.json"));
assert.strictEqual(sched.totalDays, 78, "schedule 78 days");
assert.strictEqual(sched.days["1"].new, 1, "day1 new");
assert.deepStrictEqual(sched.days["78"].reviews, [40], "day78 review list40");

var html = read("vocab-challenge.html");
assert.ok(html.indexOf("vocab-challenge-ui.js") >= 0, "student page loads ui");
assert.ok(html.indexOf("vocab-learn.css") >= 0, "reuses learn css");
assert.ok(html.indexOf("vc-day-card") >= 0, "day task card styles");

var ui = read("assets/js/vocab-challenge-ui.js");
assert.ok(ui.indexOf("/api/vocab-challenge/start") >= 0, "start api");
assert.ok(ui.indexOf("/api/vocab-challenge/submit-new") >= 0, "submit-new");
assert.ok(fs.existsSync(path.join(root, "assets/js/english-spell-input.js")), "english spell input");
assert.ok(fs.readFileSync(path.join(root, "assets/js/english-spell-input.js"), "utf8").indexOf("insertCompositionText") >= 0, "block IME composition");
assert.ok(fs.existsSync(path.join(root, "assets/js/english-ime-gate.js")), "english ime gate");
assert.ok(html.indexOf("english-ime-gate.js") >= 0, "challenge loads ime gate");
assert.ok(ui.indexOf("requireImeGate") >= 0 && ui.indexOf("onImeViolation") >= 0, "challenge ime gate wired");
var quizHtml = read("vocab-quiz.html");
assert.ok(quizHtml.indexOf("english-ime-gate.js") >= 0, "quiz loads ime gate");
var quizJs = read("assets/js/vocab-quiz.js");
assert.ok(fs.readFileSync(path.join(root, "assets/js/english-ime-gate.js"), "utf8").indexOf("showCheat") >= 0, "ime cheat screen");
assert.ok(quizJs.indexOf("handleImeCheat") >= 0, "quiz ime cheat wired");
assert.ok(ui.indexOf("handleImeCheat") >= 0, "challenge ime cheat wired");
var modeJs = read("assets/js/teacher-mode.js");
assert.ok(modeJs.indexOf("site-mode/enter") >= 0, "teacher site mode enter");
assert.ok(modeJs.indexOf("siteModeNeedsRestore") >= 0, "site mode restore hook");
var teacherAuth = read("assets/js/teacher-auth.js");
assert.ok(teacherAuth.indexOf("STUDENT_TOKEN_KEY, t") < 0, "teacher setToken must not mirror student JWT");
var authJs = read("assets/js/auth.js");
assert.ok(authJs.indexOf("ensureTeacherSiteStudentToken") >= 0, "auth restores site-mode student JWT");
assert.ok(fs.readFileSync(path.join(root, "server/teacher-preview.js"), "utf8").indexOf("gaozhong") >= 0, "preview gaozhong");
assert.ok(ui.indexOf("/api/vocab-challenge/submit-scheduled-review") >= 0, "submit-scheduled-review");
assert.ok(ui.indexOf("先选中文含义，再拼写") >= 0 || ui.indexOf("先选中文") >= 0, "A then D");
assert.ok(ui.indexOf("TIME_SEC") >= 0 && ui.indexOf("= 18") >= 0, "18s timer");
assert.ok(ui.indexOf("vl-lives") >= 0 && ui.indexOf("startTimer") >= 0, "lives+timer like quiz");
assert.ok(ui.indexOf("session.words = shuffle") >= 0, "shuffle question order on enter");
assert.ok(ui.indexOf("HP_REVIEW") >= 0 && ui.indexOf("= 3") >= 0, "review 3 lives");
assert.ok(ui.indexOf("stageGridHtml") >= 0 && ui.indexOf("startListPractice") >= 0, "stage grid practice");
assert.ok(read("server/vocab-challenge.js").indexOf("getStageSummaries") >= 0, "stage summaries api");
assert.ok(read("server/vocab-challenge.js").indexOf("list-practice-pool") >= 0, "list practice pool");
assert.ok(read("server/vocab-challenge-schedule.js").indexOf("buildPlanSummary") >= 0, "ebb plan summary");
assert.ok(read("server/vocab-challenge.js").indexOf("ebbinghausPlan") >= 0, "lists returns ebb plan");
assert.ok(ui.indexOf("scheduled_review") >= 0, "review phase ui");

var teacher = read("assets/js/teacher-vocab-challenge.js");
assert.ok(teacher.indexOf("formatProgress") >= 0, "teacher progress day");
assert.ok(teacher.indexOf("formatTodayTasks") >= 0, "teacher today tasks");

var zone = read("assets/js/zone.js");
assert.ok(zone.indexOf("vocab-challenge.html") >= 0, "zone links challenge");
assert.ok(zone.indexOf("单词闯关") >= 0, "zone label");

var teacherHtml = read("teacher.html");
assert.ok(teacherHtml.indexOf("teacher-vocab-challenge.html") >= 0, "teacher nav");

var eng = read("server/vocab-challenge.js");
assert.ok(eng.indexOf("JSON.stringify(w)") >= 0, "word_json stores full word");
assert.ok(eng.indexOf("PHASE_SCHEDULED_REVIEW") >= 0, "scheduled review phase");
assert.ok(eng.indexOf("getTodayTasks") >= 0, "schedule tasks");

require(path.join(root, "server", "vocab-challenge")).selfCheck();
console.log("check_vocab_challenge ok");
