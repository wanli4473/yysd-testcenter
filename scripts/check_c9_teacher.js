#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t2 = read("cambridge-9-test-2.html");
must(t2.indexOf("to have a <Q n=\\\"10\\\"> area for socialising") >= 0, "T2 Q10 stem");
must(t2.indexOf("Ashworthy") < 0, "T2 no Ashworthy");
must(t2.indexOf('"q": "bird hide"') >= 0, "T2 Q17 bird hide");
must(t2.indexOf('"q": "dog-walking area"') >= 0, "T2 Q18");
must(t2.indexOf('"q": "flower garden"') >= 0, "T2 Q19");
must(t2.indexOf('"q": "wooded area"') >= 0, "T2 Q20");
must(t2.indexOf('"html": "small"') >= 0, "T2 Q31 small own line");
must(t2.indexOf("<Q n=\\\"31\\\"> power source") >= 0, "T2 Q31 blank then power source");
must(t2.indexOf("small <Q n=\\\"31\\\">") < 0, "T2 Q31 not after small");
must(t2.indexOf("when <Q n=\\\"38\\\"> is needed") >= 0, "T2 Q38 is needed");

var t3 = read("cambridge-9-test-3.html");
must(t3.indexOf("Insurance Benefits") >= 0, "T3 insurance header");
must(t3.indexOf("Additional benefit allows a <Q n=\\\"7\\\">") >= 0, "T3 Q7 on Hospital row");
must(t3.indexOf('"Additional benefit"') < 0, "T3 no split Additional benefit row");
must(t3.indexOf("<Q n=\\\"19\\\"> m²") >= 0, "T3 Q19 m²");
must(t3.indexOf("<Q n=\\\"20\\\"> year-olds") >= 0, "T3 Q20 year-olds");
must(t3.indexOf("Possible strategy") >= 0 && t3.indexOf("peer group discussion") >= 0, "T3 24-28 table");
must(t3.indexOf("<strong>Possible strategy:</strong>") < 0, "T3 24-28 not note list");

var t4 = read("cambridge-9-test-4.html");
must(t4.indexOf("electricity indicator") >= 0, "T4 A electricity");
must(t4.indexOf("on/off switch") >= 0, "T4 B switch");
must(t4.indexOf("reset button") >= 0, "T4 C reset");
must(t4.indexOf("time control") >= 0, "T4 D time");
must(t4.indexOf("warning indicator") >= 0, "T4 E warning");
must(t4.indexOf("hot water tap") < 0, "T4 no old boiler A");
must(t4.indexOf("Answer the questions below. Write NO MORE THAN THREE WORDS") >= 0, "T4 26-30 short answer");
must(t4.indexOf("in pairs") < 0, "T4 no MCQ option in pairs");
must(t4.indexOf('"groups"') >= 0, "T4 Q26 groups");

console.log("check_c9_teacher: ok");
