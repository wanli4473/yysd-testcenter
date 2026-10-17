#!/usr/bin/env node
// ponytail: glanceable shell contract — fails if type/chrome/band tokens drift
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

var css = read("assets/css/style.css");
var prem = read("assets/css/dashboard-premium.css");
var zone = read("assets/js/zone.js");
var rules = read("YYSD-DESIGN-RULES.md");

assert(/--type-display:/.test(css), "type-display token missing");
assert(/--chrome-h:/.test(css), "chrome-h token missing");
assert(/--paper-rule:/.test(css), "paper-rule token missing");
assert(/--band-ivory:/.test(css), "band-ivory token missing");
assert(/\.home-market__brand/.test(css), "landing brand hero missing");
assert(/\.ielts-hub__band/.test(css), "ielts mock band missing");
assert(/\.ielts-hub__rail/.test(css), "ielts skill rail missing");
assert(!/\.ielts-hub__grid/.test(css), "old five-card grid CSS should be gone");
assert(/ielts-hub__band/.test(zone), "zone.js must render mock band");
assert(/ielts-hub__rail/.test(zone), "zone.js must render skill rails");
assert(/--bento-shadow:\s*none/.test(prem), "bento shadow should be none");
assert(/Glanceable/.test(rules), "DESIGN-RULES glanceable section missing");
assert(/优益思达国际课程中心/.test(read("index.html")), "index brand hero copy missing");
assert(/home-market__brand/.test(read("index.html")), "index brand class missing");

console.log("OK: glanceable shell");
