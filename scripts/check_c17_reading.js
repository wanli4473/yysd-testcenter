#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-reading");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-17-test-1-reading.html");
must(t1.indexOf("contribute to urban heat.`") >= 0, "T1 D ends at urban heat");
must(t1.indexOf('para-label">E</span>But many of today') >= 0, "T1 E starts with But many");
must(t1.indexOf("para-label\">E</span>There's a growing trend") < 0, "T1 E no longer starts at mixed-use");

var t2 = read("cambridge-17-test-2-reading.html");
must(t2.indexOf("para-label\">C</span>Kudla") >= 0, "T2 C Kudla");
must(t2.indexOf("The team in China re-domesticated") >= 0, "T2 China still present");
must(t2.indexOf('para-label">D</span>The team in China') < 0, "T2 China not labelled D");
must(t2.indexOf('para-label">D</span>Meanwhile, Joyce Van Eck') >= 0, "T2 D is Van Eck");
must(t2.indexOf("answer:['C']") >= 0 && t2.indexOf("抗细菌性斑点病") >= 0, "T2 Q14 is C");

var t3 = read("cambridge-17-test-3-reading.html");
must(t3.indexOf("maximize return on investment.`") >= 0, "T3 ch5 para ends at investment");
must(t3.indexOf("Chapter five also has an interesting discussion") >= 0, "T3 ch5 also own para");
must(t3.indexOf("return on investment. Chapter five also") < 0, "T3 no merge ch5+also");

var t4 = read("cambridge-17-test-4-reading.html");
must(t4.indexOf("Findings – diet") < 0, "T4 no Findings-diet garbled labels");
must(t4.indexOf("Findings – attitude") < 0, "T4 no Findings-attitude");
must(t4.indexOf("<strong>Findings</strong>") >= 0, "T4 Findings heading");
must(t4.indexOf("local attitudes to bats are mixed") >= 0, "T4 mixed attitudes");
must(t4.indexOf("were most active in rice fields located on hills") >= 0, "T4 hills finding");

console.log("check_c17_reading: ok");
