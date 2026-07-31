/* ponytail: CDT suite P1 — prompts, time-up hop, draft isolation, calendar cdt */
var fs = require("fs");
function assert(cond, msg) { if (!cond) { console.error("FAIL:", msg); process.exit(1); } }
var bridge = fs.readFileSync("assets/js/exam-bridge.js", "utf8");
var exam = fs.readFileSync("assets/js/exam.js", "utf8");
var cdt = fs.readFileSync("assets/js/exam-cdt.js", "utf8");
var cal = fs.readFileSync("assets/js/student-calendar.js", "utf8");
var server = fs.readFileSync("server/server.js", "utf8");
var report = fs.readFileSync("assets/js/cdt-report.js", "utf8");
var css = fs.readFileSync("assets/css/exam-cdt.css", "utf8");

assert(/writingPrompt1: promptForTask/.test(bridge), "writing score includes prompts");
assert(/writingChartNote: chartNoteFromTest/.test(bridge), "writing score includes chart note");
assert(/clearCdtWritingDraft/.test(bridge) && /if \(cdtShell\) clearCdtWritingDraft/.test(bridge), "CDT clears writing draft on start");
assert(/if \(!cdtWanted\)/.test(exam) && /practiceDraftElapsed/.test(exam), "CDT skips practice elapsed");
assert(/function hopAfterSubmit/.test(cdt) && /timeUpHop/.test(cdt), "time-up hops suite");
assert(/alreadyScoredThisPaper/.test(cdt), "re-Finish skips 12s wait when scored");
assert(/function isSuiteCdtLink/.test(cal), "calendar suite cdt for L/R/W");
assert(/writingPrompt1/.test(server) && /writingChartNote/.test(server), "sanitizeScore keeps prompts");
assert(/event/.test(report) && /rpt-retry/.test(report), "report retry keeps event");
assert(/keep 52px chrome height/.test(css) || /height: 52px/.test(css), "mobile header stays 52px");
console.log("ok: cdt p1 guards");
