#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var t = fs.readFileSync(path.join(__dirname, "..", "library", "mock", "cambridge-reading", "cambridge-19-test-1-reading.html"), "utf8");
function must(cond, msg) { if (!cond) throw new Error(msg); }
must(t.indexOf("types of <Q n=\"8\">") >= 0, "Q8 types of");
must(t.indexOf("changed the <Q n=\"13\"> on his racket handles") >= 0, "Q13 handles");
must(t.indexOf("Thucydides") >= 0, "P2 E Thucydides");
must(t.indexOf("Julius Caesar") >= 0 && t.indexOf("rising power of ancient Rome") >= 0, "P2 F Rome");
must(t.indexOf("demanding a <Q n=\"26\">") >= 0, "Q26 a ransom");
must(t.indexOf("The persistence and peril of misinformation") >= 0, "P3 title");
must(t.indexOf("both deliberately promoted and accidentally shared") >= 0, "P3 para1");
must(t.indexOf("〔注：") < 0, "no reconstruction notes");
must(t.indexOf("G:`frequent exposure`") >= 0, "Q31-36 option G");
must(t.indexOf("J:`different ideas`") >= 0, "Q31-36 option J");
must(t.indexOf("answer:['G']") >= 0 && t.indexOf("answer:['J']") >= 0, "Q31 G Q32 J");
must(t.indexOf("Campaigns designed to correct misinformation") >= 0, "Q37 official");
must(t.indexOf("hugely exaggerated in today's world") >= 0, "Q40 official");
console.log("check_c19_reading: ok");
