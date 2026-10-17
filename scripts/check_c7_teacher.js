#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-7-test-1.html");
must(t1.indexOf('"html": "Greyhound bus"') >= 0, "T1 Greyhound heading");
must(t1.indexOf("direct to the <Q n=\\\"2\\\">") >= 0, "T1 Q2 own line");
must(t1.indexOf("Greyhound bus — $15") < 0, "T1 no one-line Greyhound");
must(t1.indexOf("Airport Shuttle —") < 0, "T1 no one-line Shuttle");
must(t1.indexOf("need to <Q n=\\\"5\\\">") >= 0, "T1 Q5");
must(t1.indexOf("Rock art in Namibia may be paintings or engravings") < 0, "T1 P4 not one sentence");
must(t1.indexOf('"html": "paintings"') >= 0, "T1 paintings bullet");
must(t1.indexOf('"html": "engravings"') >= 0, "T1 engravings bullet");

var t2 = read("cambridge-7-test-2.html");
must(t2.indexOf("Contact number: 730453") >= 0, "T2 contact given");
must(t2.indexOf(", Greendale") >= 0, "T2 Greendale after Q1");
must(t2.indexOf("Size of car engine: 1200cc") >= 0, "T2 engine size");
must(t2.indexOf('"html": "Year: 1997"') >= 0, "T2 year line");
var yearAt = t2.indexOf('"html": "Year: 1997"');
var coAt = t2.indexOf("Previous insurance company: <Q n=\\\"4\\\">");
must(yearAt > 0 && coAt > yearAt, "T2 year before Q4");
must(t2.indexOf('"html": "Uses of car:"') >= 0, "T2 uses heading");
must(t2.indexOf("Uses of car: social;") < 0, "T2 Q8 not one line");
must(t2.indexOf("STOP A") >= 0 && t2.indexOf("STOP D") >= 0, "T2 stop column");
must(t2.indexOf("bookshop specialising in the <Q n=\\\"17\\\">") >= 0, "T2 Q17 stem");
must(t2.indexOf("Entertainment Complex") >= 0, "T2 Q18 attraction");
must(t2.indexOf("<Q n=\\\"18\\\"> cinema") >= 0, "T2 Q18 in info col");
must(t2.indexOf("<Q n=\\\"27\\\"><br>to ........................") >= 0, "T2 Q27 to blanks");
must(t2.indexOf("此题请以 ___ to ___ 形式作答") >= 0, "T2 Q27 format hint");

var t3 = read("cambridge-7-test-3.html");
must(t3.indexOf("Room No. <Q n=\\\"7\\\">") >= 0, "T3 Q7 under Address");
must(t3.indexOf('"Room No."') < 0, "T3 no split Room No row");
must(t3.indexOf("at the English") >= 0, "T3 Q8 English");
must(t3.indexOf("(Language Centre)") < 0, "T3 no paren Language Centre");
must(t3.indexOf("<Q n=\\\"10\\\"> a.m.") >= 0, "T3 Q10 a.m.");
must(t3.indexOf("At present") >= 0, "T3 Q26-30 A");
must(t3.indexOf("In the long-term future") >= 0, "T3 Q26-30 C");
must(t3.indexOf("will not be used in this field") < 0, "T3 no old C option");

var t4 = read("cambridge-7-test-4.html");
must(t4.indexOf("Nationality: Japanese") >= 0, "T4 nationality");
must(t4.indexOf("Age: 28 years") >= 0, "T4 age");
must(t4.indexOf("Answer the questions below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER") >= 0, "T4 Q7-10 instruction");
must(t4.indexOf("Complete the sentences below. Write NO MORE THAN THREE WORDS") < 0, "T4 no old 7-10 instruction");
must(t4.indexOf("MSG contains: glutamate") < 0, "T4 Q34 not one line");
must(t4.indexOf('"html": "MSG contains"') >= 0, "T4 MSG heading");
must(t4.indexOf("<Q n=\\\"34\\\"> (9.6%)") >= 0, "T4 Q34 blank");

console.log("check_c7_teacher: ok");
