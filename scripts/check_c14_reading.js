#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-reading");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-14-test-1-reading.html");
must(t1.indexOf("the <Q n=\"26\"> took them away. According to Schimmelpennink") >= 0, "T1 Q26 after text");
must(t1.indexOf("The idea was to get people thinking about the issues.") >= 0, "T1 Q26 symbolic sentences");

var t2 = read("cambridge-14-test-2-reading.html");
must(t2.indexOf("We discovered that 19th-century hospital wards") >= 0, "T2 E starts at 24 air changes");
must(t2.indexOf('para-label\\">E</span>Professor Short') < 0, "T2 no E on mindset para");
must(t2.indexOf('para-label\\">G</span>While miasma') < 0, "T2 no G on miasma theory");
must(t2.indexOf("Today, huge amounts of a building") >= 0, "T2 G is Today air conditioning");
must(t2.indexOf("Successful examples of Short's approach") >= 0, "T2 H is Queen's Building");
must(t2.indexOf("He is convinced that sufficiently cooled") >= 0, "T2 I is hybrid buildings");
must(t2.indexOf("H To go forward") < 0 && t2.indexOf("I Short contends") < 0, "T2 no plain H/I prefixes");
must(t2.indexOf('para-label\\">E</span>\'We discovered') >= 0, "T2 E label on We discovered");
must(t2.indexOf('para-label\\">G</span>Today') >= 0, "T2 G label on Today");
must(t2.indexOf('para-label\\">H</span>Successful') >= 0, "T2 H label");
must(t2.indexOf('para-label\\">I</span>He is convinced') >= 0, "T2 I label");

var t4 = read("cambridge-14-test-4-reading.html");
must(t4.indexOf("there was insufficient information on") >= 0, "T4 nested heading");
must(t4.indexOf("numbers of animals which could be affected") >= 0, "T4 animals line");
must(t4.indexOf("the impact on the ecosystem") >= 0, "T4 ecosystem line");
must(t4.indexOf("plastic (not metal or wood) and bits of debris") < 0, "T4 Q34 not mashed into one sentence");

console.log("check_c14_reading: ok");
