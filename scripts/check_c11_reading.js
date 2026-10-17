#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-reading");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-11-test-1-reading.html");
must(t1.indexOf("ielts11_test1_falkirk.png") >= 0, "T1 official diagram");
must(t1.indexOf("Hydraulic motors drive") >= 0, "T1 Q22 official stem");
must(t1.indexOf("A hydraulic <Q n=\"21\"> is removed") < 0, "T1 no rewritten Q21");
must(fs.existsSync(path.join(root, "ielts11_test1_falkirk.png")), "png exists");

var t2 = read("cambridge-11-test-2-reading.html");
must(t2.indexOf("clearing land for") >= 0, "T2 Q21");
must(t2.indexOf("Twentieth-century discoveries of pollen") >= 0, "T2 summary line 2");
must(t2.indexOf("a great deal of") >= 0, "T2 Q24");

var t3 = read("cambridge-11-test-3-reading.html");
must(t3.indexOf("Around 3000 BC, according to legend") >= 0, "T3 Q1-9 legend heading");
must(t3.indexOf("farmers' taxes consisted partly of silk") >= 0, "T3 missing taxes line");
must(t3.indexOf("Silk production spreads across Middle East and Europe") >= 0, "T3 missing Europe line");
must(t3.indexOf("where they go to avoid the danger presented by the snow") >= 0, "T3 Q24 after text");
must(t3.indexOf('"At one of the bottlenecks') < 0, "T3 P2 bottleneck not a separate para");

console.log("check_c11_reading: ok");
