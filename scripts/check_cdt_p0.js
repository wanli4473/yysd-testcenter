/* ponytail: P0 suite-mock guards — writing post, no false void, junk score */
var fs = require("fs");
var bridge = fs.readFileSync("assets/js/exam-bridge.js", "utf8");
var exam = fs.readFileSync("assets/js/exam.js", "utf8");
var cdt = fs.readFileSync("assets/js/exam-cdt.js", "utf8");
var server = fs.readFileSync("server/server.js", "utf8");
function assert(cond, msg) { if (!cond) { console.error("FAIL:", msg); process.exit(1); } }

assert(/if \(cdtShell\) reportWriting\(\)/.test(bridge), "CDT finishTest posts writing score");
assert(/!cdtShell && \(!ra \|\| getComputedStyle\(ra\)\.display === "none"\)/.test(bridge), "CDT skips resultArea visibility gate");
assert(/if \(cdtShell\) return !!document\.hidden/.test(bridge), "CDT void only on tab hide");
assert(/if \(cdtShell\) return;\s*scheduleVoidCheck/.test(bridge) || /if \(cdtShell\) return;\n\s*scheduleVoidCheck/.test(bridge), "CDT skips blur void");
assert(/yysd:exam-dialog/.test(bridge) && /pauseVoid: pauseVoid/.test(bridge), "bridge accepts dialog pause");
assert(/pauseVoid: parentPauseVoid/.test(exam), "parent exposes pauseVoid");
assert(/YYSD_EXAM\.pauseVoid/.test(cdt) && /yysd:exam-dialog/.test(cdt), "CDT masks pause void");
assert(/function isJunkCdtOverwrite/.test(server), "server has junk CDT guard");
assert(/junk-cdt-overwrite/.test(server), "PUT skips junk overwrite");
assert(/if \(body\.cdt\) out\.cdt = true/.test(server), "sanitizeScore keeps cdt flag");
assert(/getScore:/.test(server), "server has getScore stmt");
console.log("ok: cdt p0 guards");
