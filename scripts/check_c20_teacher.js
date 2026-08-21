#!/usr/bin/env node
// ponytail: teacher C20 doc = left wrong / right target
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t2 = read("cambridge-20-test-2.html");
must(t2.indexOf("Help for carers") >= 0, "T2 title");
must(t2.indexOf("Local councils can arrange") >= 0, "T2 intro");
must(t2.indexOf("time for other responsibilities") < t2.indexOf('a <Q n="1">'), "T2 Q1 order");
must(t2.indexOf("Assessment of mother") >= 0, "T2 Q2 heading");
must(t2.indexOf("This may include discussion of") >= 0, "T2 Q2 sentence");

var t3 = read("cambridge-20-test-3.html");
must(/Rentals`,`See the <Q n="9">/.test(t3), "T3 Q9 middle col");
must(t3.indexOf("Bidcaster Community Archaeology Project") >= 0, "T3 heading");
must(t3.indexOf("A community archaeology project") < 0, "T3 old heading gone");

var t4 = read("cambridge-20-test-4.html");
must(t4.indexOf("Clacton Market:") >= 0 && t4.indexOf("good for <Q n=\"7\">") >= 0, "T4 nested market");
must(t4.indexOf("Clacton Market: a good place for") < 0, "T4 old one-liner gone");

console.log("check_c20_teacher: ok");
