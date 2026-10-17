#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-reading");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t3 = read("cambridge-15-test-3-reading.html");
must(t3.indexOf('para-label">C</span>Janssen') < 0, "T3 P2 no C on Janssen");
must(t3.indexOf('para-label">C</span>The Desolenator can produce 15 litres') >= 0, "T3 C is 15 litres");
must(t3.indexOf('para-label">D</span>A recent analysis found') >= 0, "T3 D is water scarcity");
must(t3.indexOf('para-label">G</span>The company itself is based at Imperial College London') >= 0, "T3 G is Imperial");
must(t3.indexOf("answer:['iii']") >= 0 && t3.indexOf("answer:['vi']") >= 0, "T3 Q14-15");
must(t3.indexOf("q:'Section G',answer:['i']") >= 0, "T3 Q20 i");

var t4 = read("cambridge-15-test-4-reading.html");
must(t4.indexOf('"Part of tree"') >= 0, "T4 table col");
must(t4.indexOf('"Traditional use"') >= 0, "T4 table col use");
must(t4.indexOf('"branches"') >= 0, "T4 Q6 branches");
must(t4.indexOf('"leaves and bark"') >= 0, "T4 Q7 leaves and bark");
must(t4.indexOf('"trunk"') >= 0, "T4 Q8 trunk");
must(t4.indexOf('"answer": ["fuel"') < 0, "T4 Q6 not fuel");

console.log("check_c15_reading: ok");
