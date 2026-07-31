/* ponytail: CDT fullscreen = parent shell only; paper iframe must never FS */
var fs = require("fs");
var bridge = fs.readFileSync("assets/js/exam-bridge.js", "utf8");
var exam = fs.readFileSync("assets/js/exam.js", "utf8");
var css = fs.readFileSync("assets/css/exam-cdt.css", "utf8");
var cdt = fs.readFileSync("assets/js/exam-cdt.js", "utf8");
function assert(cond, msg) { if (!cond) { console.error("FAIL:", msg); process.exit(1); } }

assert(/var cdtShell =/.test(bridge), "exam-bridge defines cdtShell from dataset.cdt");
assert(/function tryFullscreen\(\) \{\s*if \(cdtShell\)/.test(bridge), "iframe tryFullscreen no-ops for CDT");
assert(/dataset\.cdt = "1"/.test(exam), "parent marks bridge as cdt");
assert(/requestFullscreen/.test(exam), "parent still requests fullscreen");
assert(!/if \(!cdtWanted\)[\s\S]{0,80}requestFullscreen/.test(exam), "parent must FS even when cdt");
assert(/bottom:\s*56px/.test(css), "CDT iframe pins bottom under footer");
assert(/calc\(100dvh - 108px\)/.test(css) || /calc\(100vh - 108px\)/.test(css), "CDT iframe has explicit height (replaced el)");
assert(/html:fullscreen[\s\S]*viewer-frame[\s\S]*calc\(100% - 108px\)/.test(css), "fullscreen uses % of FS box");
assert(/function enterParentFullscreen/.test(cdt), "CDT requests parent FS in click stack");
assert(/startExamFromGate[\s\S]{0,200}enterParentFullscreen\(\)/.test(cdt), "Start test enters parent FS");
console.log("ok: cdt parent fullscreen, no iframe fullscreen");
