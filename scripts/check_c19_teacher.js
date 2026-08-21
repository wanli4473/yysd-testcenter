#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-19-test-1.html");
must(t1.indexOf("to use a <Q n=\"4\">") >= 0, "T1 Q4 a");
must(t1.indexOf("svg:`<svg") < 0, "T1 no inline svg map");
must(t1.indexOf("bread reuse project") >= 0, "T1 Q21 stem");
must(t1.indexOf("touch-sensitive sensors") >= 0, "T1 Q23 stem");
must(t1.indexOf("food trends project") < 0, "T1 old Q21 gone");
must(t1.indexOf("<Q n=\"39\"> quality") >= 0, "T1 Q39 quality");
must(t1.indexOf("utility") < 0, "T1 utility gone");

var t3 = read("cambridge-19-test-3.html");
must(t3.indexOf("ielts19_test3_flow.png") >= 0, "T3 flowchart");
must(t3.indexOf("body=img+box+qs") >= 0, "T3 match shows image");

var t4 = read("cambridge-19-test-4.html");
must(t4.indexOf("to collect <Q n=\"4\">") >= 0, "T4 collect Q4");
must(t4.indexOf("on <Q n=\"5\"> floor") >= 0, "T4 floor only");
must(t4.indexOf("'Task 2','Notes'") >= 0 || t4.indexOf("'Task 2','Notes'") >= 0 || t4.indexOf("Task 2','Notes") >= 0, "T4 split cols");
must(t4.indexOf("Task 2 / Notes") < 0, "T4 old merged col gone");

must(fs.existsSync(path.join(root, "ielts19_test1_map.png")), "map png");
must(fs.existsSync(path.join(root, "ielts19_test3_flow.png")), "flow png");
console.log("check_c19_teacher: ok");
