#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-13-test-1.html");
must(t1.indexOf("ielts13_test1_map.png") >= 0, "T1 map png");
must(t1.indexOf("ielts13_test1_flow.png") >= 0, "T1 flow png");
must(t1.indexOf('"svg":') < 0, "T1 no svg data");
must(t1.indexOf("Select seeds of different") >= 0, "T1 Q26 stem");
must(fs.existsSync(path.join(root, "ielts13_test1_map.png")), "map file");
must(fs.existsSync(path.join(root, "ielts13_test1_flow.png")), "flow file");

var t2 = read("cambridge-13-test-2.html");
must(t2.indexOf("Name of club secretary: Jim Hunter") >= 0, "T2 example");
must(t2.indexOf("participants on the last Digital Inclusion Day") >= 0, "T2 Q17-18");
must(t2.indexOf("Planning a presentation on nanotechnology") >= 0, "T2 P3 heading");
must(t2.indexOf("Episodic memory") >= 0, "T2 P4 title");
must(t2.indexOf("Memory and autism") < 0, "T2 no old P4 title");

var t3 = read("cambridge-13-test-3.html");
must(t3.indexOf("lizards were trying to avoid one another") >= 0, "T3 Q39-40 extra line");
must(t3.indexOf("This may be in order to reduce chances of") >= 0, "T3 Q40 stem");

var t4 = read("cambridge-13-test-4.html");
must(t4.indexOf('qualification from school in <Q n="2">.') >= 0, "T4 Q2 no skills");
must(t4.indexOf('diploma in <Q n="3"> skills.') >= 0, "T4 Q3 keeps skills");
must(t4.indexOf("Labels giving nutritional information on food packaging") >= 0, "T4 P3 heading");
must(t4.indexOf("Project on nutritional food labels") < 0, "T4 no old heading");

console.log("check_c13_teacher: ok");
