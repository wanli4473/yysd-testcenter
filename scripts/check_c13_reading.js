#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-reading");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-13-test-1-reading.html");
must(t1.indexOf("Section of website") >= 0, "T1 Q1-7 table col");
must(t1.indexOf("information regularly") >= 0, "T1 Q1 after blank");
must(t1.indexOf("information regularly updated") < 0, "T1 no extra updated bullet");
must(t1.indexOf("Peter Toohey") >= 0, "T1 Q20 person");
must(t1.indexOf("Levels of boredom may fall in the future") >= 0, "T1 extra idea C");
must(t1.indexOf("Boredom may cause us to avoid") < 0, "T1 Q20 not inverted stem");

var t2 = read("cambridge-13-test-2-reading.html");
must(t2.indexOf("The Early History of Cinnamon") >= 0, "T2 P1 notes title");
must(t2.indexOf("genus Cinnamomum") >= 0, "T2 P1 official opening");
must(t2.indexOf("giant birds") < 0, "T2 P1 not rewritten bird tale");
must(t2.indexOf("Alexandria") >= 0 && t2.indexOf("camels") >= 0, "T2 P1 official notes");
must(t2.indexOf("The Portuguese had control over the cinnamon trade") >= 0, "T2 Q10 official");
must(t2.indexOf("prairie voles") >= 0, "T2 P2 official A");
must(t2.indexOf("Markus Heinrichs") >= 0, "T2 P2 researchers");
must(t2.indexOf("unapproved oxytocin consumer goods") < 0, "T2 P2 not rewritten Q14");
must(t2.indexOf("The earliest findings about oxytocin and bonding") >= 0, "T2 Q21-26 official");
must(t2.indexOf("Making the most of trends") >= 0, "T2 P3 kept");

console.log("check_c13_reading: ok");
