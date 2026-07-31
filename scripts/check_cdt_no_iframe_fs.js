/* ponytail: CDT suite must not fullscreen the paper iframe (hides parent chrome) */
var fs = require("fs");
var bridge = fs.readFileSync("assets/js/exam-bridge.js", "utf8");
var exam = fs.readFileSync("assets/js/exam.js", "utf8");
function assert(cond, msg) { if (!cond) { console.error("FAIL:", msg); process.exit(1); } }

assert(/var cdtShell =/.test(bridge), "exam-bridge defines cdtShell from dataset.cdt");
assert(/function tryFullscreen\(\) \{\s*if \(cdtShell\)/.test(bridge), "tryFullscreen no-ops for CDT");
assert(/cdtWanted \? "cdt13"/.test(exam) || /dataset\.cdt = "1"/.test(exam), "parent still marks bridge as cdt");
assert(/if \(!cdtWanted\)/.test(exam) && /requestFullscreen/.test(exam), "parent still skips fullscreen when cdt");
console.log("ok: cdt no iframe fullscreen");
