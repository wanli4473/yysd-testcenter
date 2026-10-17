#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-11-test-1.html");
must(t1.indexOf("ielts11_test1_map.png") >= 0, "T1 map png");
must(t1.split("function groupHtml")[0].indexOf("svg:`") < 0, "T1 no svg data");
must(fs.existsSync(path.join(root, "ielts11_test1_map.png")), "T1 map file");

var t2 = read("cambridge-11-test-2.html");
must(t2.indexOf("On Youth Council, wants to work with young people who are") >= 0, "T2 Q8");
must(t2.indexOf("Elections Officer next Monday at") >= 0, "T2 Q9");
must(t2.indexOf("Mobile number:") >= 0 && t2.indexOf("<Q n=\\\"10\\\">") >= 0, "T2 Q10");
must(t2.indexOf("ielts11_test2_map.png") >= 0, "T2 map png");
must(t2.split("function groupHtml")[0].indexOf('"svg"') < 0, "T2 no svg data");
must(fs.existsSync(path.join(root, "ielts11_test2_map.png")), "T2 map file");

var t3 = read("cambridge-11-test-3.html");
must(t3.indexOf("The caller wants to find out about events on") >= 0, "T3 P1 example");
must(t3.indexOf("Changes in Barford over the last 50 years") >= 0, "T3 P2 heading");
must(t3.indexOf("The theatre has had problems with") < 0, "T3 no old P2");
must(t3.indexOf("In Uganda, customers paid to use the cell phones of entrepreneurs") >= 0, "T3 Uganda line");
must(t3.indexOf("The researcher does not start off with a hypothesis") >= 0, "T3 hypothesis");
must(t3.indexOf("The interview is guided by the participant") >= 0, "T3 interview");
must(t3.indexOf("Researchers look for a meaningful pattern in the data") >= 0, "T3 pattern");

var t4 = read("cambridge-11-test-4.html");
must(t4.indexOf("ielts11_test4_map.png") >= 0, "T4 map png");
must(t4.split("function groupHtml")[0].indexOf("svg:`") < 0, "T4 no svg data");
must(fs.existsSync(path.join(root, "ielts11_test4_map.png")), "T4 map file");

console.log("check_c11_teacher: ok");
