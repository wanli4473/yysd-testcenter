#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-18-test-1.html");
must(t1.indexOf("shopping and visit to the") >= 0, "T1 Q3");
must(t1.indexOf("too high") >= 0, "T1 Q4");
must(t1.indexOf("Street") >= 0, "T1 Q5");
must(t1.indexOf("frequency of buses") >= 0, "T1 Q7");
must(t1.indexOf("by car") >= 0, "T1 Q8");
must(t1.indexOf("<Q n=\"2\"> April") < 0, "T1 Q2 no printed April");

var t2 = read("cambridge-18-test-2.html");
must(t2.indexOf("ielts18_test2_map.png") >= 0, "T2 map png");
must(t2.indexOf("svg:`<svg") < 0, "T2 no svg map");

var t4 = read("cambridge-18-test-4.html");
must(t4.indexOf("further opportunities may be available") >= 0, "T4 Q8");
must(t4.indexOf("Romantic movement") >= 0, "T4 Q32 bullet");
must(t4.indexOf("in his house") >= 0, "T4 Q39");
must(fs.existsSync(path.join(root, "ielts18_test2_map.png")), "map file");
console.log("check_c18_teacher: ok");
