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
var spellSrc = fs.readFileSync(path.join(root, "assets/js/english-spell-input.js"), "utf8");
assert.ok(spellSrc.indexOf("insertCompositionText") >= 0, "block IME composition");
assert.ok(spellSrc.indexOf("[^a-zA-Z0-9' ()-]") >= 0, "spell input allows digits/parens/space");
assert.ok(spellSrc.indexOf("function matches") >= 0, "spell matches helper");
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
assert.ok(modeJs.indexOf("function enterViaApi") >= 0, "enter always hits teacher api");
assert.ok(modeJs.indexOf("d && d.redirect") >= 0, "guard missing redirect");
assert.ok(modeJs.indexOf("teacher-mode-picker.html") >= 0 || modeJs.indexOf("hasChosenMode") >= 0, "teacher mode picker guard");
assert.ok(modeJs.indexOf("教室管理区") >= 0, "admin mode label");
var authJs = read("assets/js/auth.js");
assert.ok(authJs.indexOf('localStorage.getItem("yysd:teacher:mode") !== "site"') >= 0, "no auto site-mode on student pages");
assert.ok(ui.indexOf("网站功能区") >= 0, "teacher hub hint");
var zone = read("assets/js/zone.js");
assert.ok(modeJs.indexOf("writeStudentSession") >= 0, "picker writes student token without auth.js");
assert.ok(modeJs.indexOf("clearStudentSession") >= 0, "exit site mode drops student token");
assert.ok(modeJs.indexOf("闯关进行中") >= 0, "confirm before leaving quiz");
var teacherAuth = read("assets/js/teacher-auth.js");
assert.ok(teacherAuth.indexOf("localStorage.getItem(TOKEN_KEY) || localStorage.getItem(STUDENT_TOKEN_KEY)") < 0, "teacher getToken no student fallback");
assert.ok(ui.indexOf('requireImeGate("start"') >= 0 && ui.indexOf("准备题目") > ui.indexOf('requireImeGate("start"'), "ime before start api");
assert.ok(ui.indexOf("闯关中") >= 0, "in-progress task copy");
assert.ok(ui.indexOf("teacher-mode-picker.html") >= 0, "teacher blocked link to picker");
assert.ok(zone.indexOf("查看进度") >= 0, "zone complete cta");
assert.ok(zone.indexOf("词书学习") >= 0, "zone rail not 词库进度");
var previewJs = read("server/teacher-preview.js");
assert.ok(previewJs.indexOf("function isPreviewUser") >= 0, "preview filter helper");
var eng = read("server/vocab-challenge.js");
assert.ok(eng.indexOf("resolveRosterStudentIds") >= 0, "roster null ids");
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
assert.ok(ui.indexOf("（干扰项）") < 0, "no fake distractor labels");
assert.ok(ui.indexOf("saveQuizDraft") >= 0, "resume draft");
assert.ok(ui.indexOf("displayProgressDay") >= 0, "cap progress day at 78");
assert.ok(ui.indexOf("vl-btn-abort") >= 0, "abort is secondary");
assert.ok(read("server/vocab-challenge.js").indexOf("resumeSameAttempt") >= 0, "resume same attempt");

var teacher = read("assets/js/teacher-vocab-challenge.js");
assert.ok(teacher.indexOf("formatProgress") >= 0, "teacher progress day");
assert.ok(teacher.indexOf("formatTodayTasks") >= 0, "teacher today tasks");

assert.ok(zone.indexOf("vocab-challenge.html") >= 0, "zone links challenge");
assert.ok(zone.indexOf("单词闯关") >= 0, "zone label");

assert.ok(read("teacher.html").indexOf("teacher-vocab-challenge.html") >= 0, "teacher nav");
assert.ok(read("teacher.html").indexOf('id="nav-auth">个人中心') >= 0, "teacher header 个人中心");
assert.ok(read("teacher.html").indexOf('href="profile.html"') < 0, "teacher pages skip student profile");
assert.ok(read("teacher-student-diagnostic.html").indexOf("zone.html") < 0, "teacher diag has no student zone links");
assert.ok(teacher.indexOf("联系管理员绑定") >= 0, "empty roster tells non-admin to ask");
assert.ok(teacher.indexOf('href="admin-assign.html"') >= 0, "empty roster admin link");
assert.ok(read("assets/js/tenant-boot.js").indexOf('mode !== "site"') >= 0, "tenant-boot blocks student pages");

var eng = read("server/vocab-challenge.js");
assert.ok(eng.indexOf("JSON.stringify(w)") >= 0, "word_json stores full word");
assert.ok(eng.indexOf("PHASE_SCHEDULED_REVIEW") >= 0, "scheduled review phase");
assert.ok(eng.indexOf("getTodayTasks") >= 0, "schedule tasks");

function listWords(n) {
  var html = read("library/study/vocab/高中单词LIST" + n + ".html");
  var m = html.match(/const wordData\s*=\s*(\[[\s\S]*?\]);/);
  assert.ok(m, "list " + n + " wordData");
  return JSON.parse(m[1]).map(function (w) { return String(w.word); });
}
assert.ok(listWords(30).indexOf("zero") >= 0 && listWords(30).indexOf("0") < 0, "list30 zero not 0");
assert.ok(listWords(11).indexOf("eastward") >= 0 && listWords(11).indexOf("eastward(s)") < 0, "list11 eastward");
assert.ok(listWords(17).indexOf("afterward") >= 0, "list17 afterward");
assert.ok(listWords(19).indexOf("toward") >= 0, "list19 toward");

require(path.join(root, "server", "vocab-challenge")).selfCheck();
console.log("check_vocab_challenge ok");
