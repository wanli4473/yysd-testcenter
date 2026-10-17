#!/usr/bin/env node
// ponytail: Apple dense hub contract
"use strict";

var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

function read(p) {
  return fs.readFileSync(path.join(root, p), "utf8");
}
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

var prem = read("assets/css/dashboard-premium.css");
var zone = read("assets/js/zone.js");
var rules = read("YYSD-DESIGN-RULES.md");

assert(/--background:\s*#f5f5f7/.test(prem), "cool background missing");
assert(/\.yysd-group\s*\{/.test(prem), "yysd-group missing");
assert(/\.yysd-row\s*\{/.test(prem), "yysd-row missing");
assert(/\.yysd-row--primary/.test(prem), "primary row missing");
assert(/ielts-dense/.test(zone), "ielts dense hub missing");
assert(/vocab-dense/.test(zone), "vocab dense hub missing");
assert(/yysd-row--primary/.test(zone), "hub primary CTA missing");
assert(!/ielts-hub__band/.test(zone), "legacy mock band should be gone");
assert(!/vocab-bento__body/.test(zone), "legacy vocab bento collage should be gone");
assert(/Hub 密度/.test(rules), "DESIGN-RULES density section missing");
assert(/is-ielts-hub[\s\S]*minimal-page-head[\s\S]*display:\s*none/.test(prem), "hub page-head hide missing");

console.log("OK: dense hubs");
