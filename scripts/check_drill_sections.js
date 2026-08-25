#!/usr/bin/env node
/* ponytail: fails if drill section-gate wiring regresses */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var fail = 0;
function must(file, re, label) {
  var t = fs.readFileSync(path.join(root, file), "utf8");
  if (!re.test(t)) {
    fail++;
    console.error("FAIL", label);
  } else console.log("ok", label);
}
must("exam.html", /id="cdt-gate-sections"/, "gate panel in exam.html");
must("assets/js/exam-cdt.js", /function showSectionsGate/, "showSectionsGate");
must("assets/js/exam-cdt.js", /bridge\.dataset\.sections/, "pass sections to bridge");
must("assets/js/exam-cdt.js", /function applyDrillPartsFilter/, "footer filter");
must("assets/js/exam-bridge.js", /function parseSectionsAttr/, "bridge parseSectionsAttr");
must("assets/js/exam-cdt.js", /function isAssignedStudentDrill/, "assigned student drill skip");
must("assets/js/exam-cdt.js", /skipAssignedGatesToStart/, "skip assigned gates");
must("assets/js/exam-bridge.js", /if \(!range\) return s/, "clip whole part when no q range");
// tighter: bootAssignedPart early-return under cdtShell
var bridge = fs.readFileSync(path.join(root, "assets/js/exam-bridge.js"), "utf8");
if (!/function bootAssignedPart\(\)[\s\S]{0,200}if \(cdtShell\) return;/.test(bridge)) {
  fail++;
  console.error("FAIL bootAssignedPart must no-op under cdtShell");
} else console.log("ok bootAssignedPart cdtShell guard");
process.exit(fail ? 1 : 0);
