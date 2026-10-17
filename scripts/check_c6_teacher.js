#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-6-test-1.html");
must(t1.indexOf("cambridge-6-test-1-membership.png") < 0, "T1 no membership image");
must(t1.indexOf("from <Q n=\\\"7\\\"><br>to ........................") >= 0, "T1 Q7 to blanks");
must(t1.indexOf("此题请以 ___ to ___ 形式作答") >= 0, "T1 Q7 to hint");
must(t1.indexOf("Royal Hunt of the Sun") >= 0 && t1.indexOf('"Play"') >= 0, "T1 17-20 wide table");
must(t1.indexOf("<Q n=\\\"19\\\"><br>and ........................") >= 0, "T1 Q19 and blanks");
must(t1.indexOf("此题请以 ___ and ___ 形式作答") >= 0, "T1 and hint");
must(t1.indexOf('"<Q n=\\"23\\">"') >= 0, "T1 Q23 first col");
must(t1.indexOf("<Q n=\\\"30\\\"> membership costs") >= 0, "T1 Q30 own line");
must(t1.indexOf("East End of London") >= 0, "T1 S4 East End");
must(t1.indexOf("Monosodium Glutamate") < 0, "T1 no MSG");
must(t1.indexOf("heating problems") >= 0, "T1 Q38-40 C");
must(t1.indexOf("剑桥雅思6 · Test 1 — 听力") >= 0, "T1 title");
must(t1.indexOf("剑桥雅思7 · Test 3") < 0, "T1 no C7 title");

var t2 = read("cambridge-6-test-2.html");
must(t2.indexOf("Workshop title") >= 0, "T2 workshop title col");
must(t2.indexOf("Children advised to wear:") >= 0, "T2 wear col");
must(t2.indexOf("Please bring (if possible):") >= 0, "T2 bring col");
must(t2.indexOf('"(Nothing special)"') >= 0, "T2 nothing special");
must(t2.indexOf("buy at least six days ahead<br>limited numbers<br>") >= 0, "T2 Q17 lines");
must(t2.indexOf("Dissertation Tutorial Record") >= 0, "T2 P3 table");
must(t2.indexOf("called The <Q n=\\\"38\\\">") >= 0, "T2 Q38 The");
must(t2.indexOf("剑桥雅思6 · Test 2 — 听力") >= 0, "T2 title");
must(t2.indexOf("剑桥雅思7 · Test 3") < 0, "T2 no C7 title");

var t3 = read("cambridge-6-test-3.html");
must(t3.indexOf("<Q n=\\\"3\\\"> Exeter") >= 0, "T3 Exeter");
must(t3.indexOf('"html": "Radio"') >= 0, "T3 medium bullets");
must(t3.indexOf("cambridge-6-test-3-ireland.png") >= 0, "T3 ireland map");
must(t3.indexOf("POTTERY MAKING") >= 0, "T3 pottery heading");
must(t3.indexOf("<Q n=\\\"36\\\"> and <Q n=\\\"37\\\">") >= 0, "T3 36 and 37");
must(t3.indexOf("剑桥雅思6 · Test 3 — 听力") >= 0, "T3 title");
must(t3.indexOf("剑桥雅思7 · Test 3") < 0, "T3 no C7 title");

var t4 = read("cambridge-6-test-4.html");
must(t4.indexOf('"h": "Three day cost"') >= 0, "T4 three day heading");
must(t4.indexOf('"h": "Further documents to be sent"') >= 0, "T4 docs heading");
must(t4.indexOf("the blue team") >= 0, "T4 blue team");
must(t4.indexOf("team A") < 0, "T4 no placeholder team");
must(t4.indexOf('"Time"') >= 0 && t4.indexOf("Talk by Anne Smith") >= 0, "T4 14-20 table");

console.log("check_c6_teacher: ok");
