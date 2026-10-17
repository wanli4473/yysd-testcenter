#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var t = fs.readFileSync(path.join(__dirname, "..", "library", "mock", "cambridge-reading", "cambridge-12-test-3-reading.html"), "utf8");
function must(cond, msg) { if (!cond) throw new Error(msg); }
must(t.indexOf("too large to transport") >= 0, "D timing");
must(t.indexOf("For years, repatriation efforts") >= 0, "E starts For years");
must(!/para-label\\">D<\/span>[^"]*For years, repatriation/.test(t), "D does not include For years");
must(/para-label\\">E<\/span>For years, repatriation/.test(t) || t.indexOf('para-label">E</span>For years, repatriation') >= 0, "E label on For years");
must(t.indexOf('para-label">E</span>But in November') < 0 && t.indexOf('para-label\\">E</span>But in November') < 0, "E not on November");
console.log("check_c12_reading: ok");
