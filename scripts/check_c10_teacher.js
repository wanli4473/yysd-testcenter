#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-10-test-1.html");
must(t1.indexOf("12 days") >= 0, "T1 12 days");
must(t1.indexOf("9 days") >= 0, "T1 9 days");
must(t1.indexOf("• accommodation") >= 0, "T1 includes bullets");
must(t1.indexOf("one <Q n=\\\"8\\\">") >= 0, "T1 Q8");
must(t1.indexOf("accommodation, car, one") < 0, "T1 no comma includes");

var t2 = read("cambridge-10-test-2.html");
must(t2.indexOf("New city developments") >= 0, "T2 P2 heading");
must(t2.indexOf("Brackenside pool") >= 0, "T2 Q12");
must(t2.indexOf("The play area will be available") < 0, "T2 no old P2");
must(t2.indexOf("changes influenced by") >= 0, "T2 Q39 under management");
must(t2.indexOf("more and more <Q n=\\\"40\\\"> workers") >= 0, "T2 Q40 wording");
must(t2.indexOf("growth in") < 0, "T2 no extra Q40 line");
must(t2.indexOf("in senior roles") < 0, "T2 no old Q39 line");

console.log("check_c10_teacher: ok");
