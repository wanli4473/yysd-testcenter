#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-14-test-1.html");
must(t1.indexOf("breakwater (dam) containing 16 turbines") >= 0, "T1 Q36-37 breakwater");
must(t1.indexOf("rising tide forces water through turbines") >= 0, "T1 Q36-37 rising tide");

var t2 = read("cambridge-14-test-2.html");
must(t2.indexOf("Sports played:") >= 0, "T2 sports heading");
must(t2.indexOf("goes <Q n=\\\"8\\\"> regularly") >= 0, "T2 Q8");
must(t2.indexOf("ielts14_test2_map.png") >= 0, "T2 map png");
must(t2.indexOf("svg\":") < 0 && t2.indexOf("svg:`") < 0, "T2 no svg");
must(fs.existsSync(path.join(root, "ielts14_test2_map.png")), "map file");

var t3 = read("cambridge-14-test-3.html");
must(t3.indexOf("performers and festivals around the world") >= 0, "T3 commissions");
must(t3.indexOf("compositions include music for children") >= 0, "T3 children");
must(t3.indexOf("played cornet then piano") >= 0, "T3 cornet");
must(t3.indexOf("Edward Elgar") >= 0, "T3 Elgar");

var t4 = read("cambridge-14-test-4.html");
must(t4.indexOf("cause of destruction unknown") >= 0, "T4 31-32");
must(t4.indexOf("much easier to use, relatively cheap") >= 0, "T4 latest intro");
must(t4.indexOf("{h:`Underwater internet`}") >= 0, "T4 underwater heading");
must(t4.indexOf("plans for communication with researchers by satellite") >= 0, "T4 satellite");
must(t4.indexOf("to find out more about wrecks of ancient Roman ships") >= 0, "T4 Baratti intro");
console.log("check_c14_teacher: ok");
