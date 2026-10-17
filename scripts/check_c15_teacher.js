#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-15-test-1.html");
must(t1.indexOf("Pay is usually £ <Q n=\"5\">") >= 0, "T1 Q5 pound before blank");
must(t1.indexOf("<Q n=\"5\"> £ per hour") < 0, "T1 Q5 no pound after blank");

var t4 = read("cambridge-15-test-4.html");
must(t4.indexOf("ielts15_test4_map.png") >= 0, "T4 map png");
must(t4.indexOf("svg\":") < 0 && t4.indexOf("svg:`") < 0, "T4 no svg map");
must(t4.indexOf("Industrial Revolution") >= 0, "T4 P4 title");
must(t4.indexOf("History of advertising") < 0, "T4 P4 no advertising");
must(t4.indexOf("A–H, next to Questions 11–16") >= 0, "T4 map A-H");
must(fs.existsSync(path.join(root, "ielts15_test4_map.png")), "map file");
console.log("check_c15_teacher: ok");
