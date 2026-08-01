/* ponytail: CDT suite P1 — prompts, time-up hop, draft isolation, calendar cdt */
var fs = require("fs");
function assert(cond, msg) { if (!cond) { console.error("FAIL:", msg); process.exit(1); } }
var bridge = fs.readFileSync("assets/js/exam-bridge.js", "utf8");
var exam = fs.readFileSync("assets/js/exam.js", "utf8");
var cdt = fs.readFileSync("assets/js/exam-cdt.js", "utf8");
var cal = fs.readFileSync("assets/js/student-calendar.js", "utf8");
var dash = fs.readFileSync("assets/js/dashboard.js", "utf8");
var teach = fs.readFileSync("assets/js/teacher-calendar.js", "utf8");
var cfg = fs.readFileSync("assets/js/config.js", "utf8");
var server = fs.readFileSync("server/server.js", "utf8");
var report = fs.readFileSync("assets/js/cdt-report.js", "utf8");
var css = fs.readFileSync("assets/css/exam-cdt.css", "utf8");
var thtml = fs.readFileSync("teacher-calendar.html", "utf8");

assert(/writingPrompt1: promptForTask/.test(bridge), "writing score includes prompts");
assert(/writingChartNote: chartNoteFromTest/.test(bridge), "writing score includes chart note");
assert(/clearCdtWritingDraft/.test(bridge) && /cdtPack\(\) === "exam"/.test(bridge), "CDT clears writing draft on exam start");
assert(/if \(!cdtWanted\)/.test(exam) && /practiceDraftElapsed/.test(exam), "CDT skips practice elapsed");
assert(/function hopAfterSubmit/.test(cdt) && /timeUpHop/.test(cdt), "time-up hops suite");
assert(/alreadyScoredThisPaper/.test(cdt), "re-Finish skips 12s wait when scored");
assert(/function showSubmitLoading/.test(cdt) && /submitLoadingMsg/.test(cdt), "CDT submit loading helpers");
var examHtml = fs.readFileSync("exam.html", "utf8");
assert(/id="cdt-submit-loading"/.test(examHtml), "exam.html submit loading host");
assert(/cdt-submit-loading/.test(css), "exam-cdt.css submit loading styles");
assert(/cambridgeCdtQs/.test(cal), "calendar uses cambridgeCdtQs");
assert(/cambridgeCdtQs/.test(dash), "dashboard uses cambridgeCdtQs");
assert(/function cambridgeCdtQs/.test(cfg), "config cambridgeCdtQs");
assert(/data-ex-cat="skill"/.test(thtml), "teacher skill mock cat");
assert(/data-ex-cat="part"/.test(thtml) && /补弱练习/.test(thtml), "teacher part cat renamed");
assert(!/data-ex-cat="listening"/.test(thtml), "no listening practice chip");
assert(/exercise-browse|exercise-vol-filter/.test(thtml), "browse cascade hosts");
assert(/cdtPackForCat/.test(teach) && /ensureBrowseDefaults/.test(teach), "teacher cascade browse");
assert(/matchVolTest/.test(teach) && /cambridgeVolumes/.test(teach), "vol/test filter helpers");
assert(/ensureVocabBrowseDefaults/.test(teach) && /data-ex-vbook/.test(teach), "teacher vocab book browse");
assert(/VOCAB_BOOK_OPTS/.test(teach) && /matchVocabBrowse/.test(teach), "vocab range filter");
assert(/cdt_pack/.test(server) && /cdtPack/.test(server), "server cdt_pack");
assert(/writingPrompt1/.test(server) && /writingChartNote/.test(server), "sanitizeScore keeps prompts");
assert(/event/.test(report) && /rpt-retry/.test(report), "report retry keeps event");
assert(/keep 52px chrome height/.test(css) || /height: 52px/.test(css), "mobile header stays 52px");

var start = cfg.indexOf("function cambridgeCdtQs");
var end = cfg.indexOf("\n  function makePartItem");
assert(start > 0 && end > start, "cambridgeCdtQs slice");
var qs = Function(cfg.slice(start, end) + "\nreturn cambridgeCdtQs;")();
assert(qs("cambridge-16-test-4-reading-p3", ["cambridge-16-test-4-reading-p3"]) === "&cdt=1&pack=drill", "part drill cdt");
assert(qs("cambridge-16-test-4-reading", ["cambridge-16-test-4-reading"], "exam") === "&cdt=1&pack=exam", "skill mock exam");
assert(qs("cambridge-16-test-4-s2", ["cambridge-16-test-4-s2"]) === "&cdt=1&pack=drill", "listening section drill");
assert(qs("cambridge-16-test-4", ["cambridge-16-test-4", "cambridge-16-test-4-reading", "cambridge-16-test-4-writing"]) === "&cdt=1&pack=exam&suite=1", "suite cdt");
assert(qs("not-cambridge", []) === "", "non-cam empty");

console.log("ok: cdt p1 guards");
