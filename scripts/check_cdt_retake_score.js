#!/usr/bin/env node
/* ponytail: retake must not treat localStorage yysd:results as already-scored */
var fs = require("fs");
var path = require("path");
var cdt = fs.readFileSync(path.join(__dirname, "..", "assets/js/exam-cdt.js"), "utf8");
var exam = fs.readFileSync(path.join(__dirname, "..", "assets/js/exam.js"), "utf8");
var bridge = fs.readFileSync(path.join(__dirname, "..", "assets/js/exam-bridge.js"), "utf8");
var fail = 0;
function must(ok, label) {
  if (!ok) { fail++; console.error("FAIL", label); }
  else console.log("ok", label);
}
var fn = cdt.match(/function alreadyScoredThisPaper\(\)\{[\s\S]*?\n  \}/);
must(fn && !/yysd:results/.test(fn[0]), "alreadyScored ignores localStorage results");
must(fn && /scoredThisSession/.test(fn[0]), "alreadyScored uses session flag");
must(/stopTimer:\s*function/.test(exam), "YYSD_EXAM.stopTimer");
must(/stopParentTimer\(\)/.test(cdt) && /enterReviewMode/.test(cdt), "review stops parent timer");
must(/if \(!cdtShell && getComputedStyle\(ra\)\.display === "none"\)/.test(bridge), "AI panel under CDT");
process.exit(fail ? 1 : 0);
