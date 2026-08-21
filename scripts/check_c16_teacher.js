#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-16-test-1.html");
must(t1.indexOf("drop it from a height without breaking") >= 0, "T1 Q1");
must(t1.indexOf("Take part in a competition to build the tallest") >= 0, "T1 Q2");
must(t1.indexOf("so they can move") >= 0, "T1 Q4");
must(t1.indexOf("Cost for a five-week block") >= 0, "T1 Q8 cost");
must(t1.indexOf("Jess and Tom decide to change") >= 0, "T1 Q23 stem");
must(t1.indexOf("by giving a rationale for their action plans") >= 0, "T1 Q23 A");

var t2 = read("cambridge-16-test-2.html");
must(t2.indexOf("ielts16_test2_flow.png") >= 0, "T2 flowchart png");
must(t2.indexOf("Twelve students from the") >= 0, "T2 Q25 stem");
must(t2.indexOf("American Journal of Health Behavior") >= 0, "T2 Q39 heading");
must(fs.existsSync(path.join(root, "ielts16_test2_flow.png")), "flow file");

var t4 = read("cambridge-16-test-4.html");
must(t4.indexOf("Local council report on traffic and highways") >= 0, "T4 P2 heading");
must(t4.indexOf("ielts16_test4_map.png") >= 0, "T4 map png");
must(t4.indexOf("svg:`<svg") < 0, "T4 no svg map");
must(fs.existsSync(path.join(root, "ielts16_test4_map.png")), "map file");
console.log("check_c16_teacher: ok");
