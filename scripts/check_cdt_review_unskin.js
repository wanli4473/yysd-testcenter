#!/usr/bin/env node
/* ponytail: review must drop yysd-cdt-* skin or #resultArea stays display:none */
var fs = require("fs");
var path = require("path");
var cdt = fs.readFileSync(path.join(__dirname, "..", "assets/js/exam-cdt.js"), "utf8");
var fail = 0;
function must(re, label) {
  if (!re.test(cdt)) { fail++; console.error("FAIL", label); }
  else console.log("ok", label);
}
must(/function enterReviewMode/, "enterReviewMode exists");
must(/classList\.remove\(\s*"yysd-cdt-reading"/, "drops reading skin");
must(/classList\.remove\([\s\S]*?yysd-cdt-listening/, "drops listening skin");
must(/classList\.remove\([\s\S]*?yysd-cdt-writing/, "drops writing skin");
must(/yysd-cdt-review/, "adds review class");
// skin hide must not win forever without unskin
must(/#resultArea\{display:none!important\}/, "exam skin still hides result during test");
process.exit(fail ? 1 : 0);
