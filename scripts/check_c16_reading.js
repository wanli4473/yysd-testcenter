#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-reading");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-16-test-1-reading.html");
must(t1.indexOf("build-up of fat under their skin") >= 0, "T1 Q1 official");
must(t1.indexOf("Liu compared different groups of polar bears") < 0, "T1 Q2 not truncated");
must(t1.indexOf("An overview of the external buildings and areas") >= 0, "T1 heading v");
must(t1.indexOf("A pyramid design that others copied") >= 0, "T1 heading vi");
must(t1.indexOf("The answers to some unexpected questions") >= 0, "T1 heading ix");
must(t1.indexOf("unless they knew the <Q n=\"24\"> of the real entrance") >= 0, "T1 Q21-24 full");
must(t1.indexOf("Initially he had to be persuaded to build in stone rather than clay") >= 0, "T1 Q25 A");
must(t1.indexOf("the extent to which AI will alter the nature of the work") >= 0, "T1 Q27 B");
must(t1.indexOf("Greater levels of automation will not result in lower employment") >= 0, "T1 Q35");
must(t1.indexOf("jobs most affected") < 0, "T1 P3 no truncated Q27 A");

var t2 = read("cambridge-16-test-2-reading.html");
must(t2.indexOf("100 BCE") >= 0, "T2 coins dating");
must(t2.indexOf("an emblem to indicate land ownership") >= 0, "T2 emblem");
must(t2.indexOf("formed part of an ancient ritual") >= 0, "T2 ritual");
must(t2.indexOf("protection of horses") >= 0, "T2 Epona protection");

var t3 = read("cambridge-16-test-3-reading.html");
must(t3.indexOf("sailors used landmarks that they knew") >= 0, "T3 Q13 after");
must(t3.indexOf("objects that are of interest to archaeologists") >= 0, "T3 Q22 after");

console.log("check_c16_reading: ok");
