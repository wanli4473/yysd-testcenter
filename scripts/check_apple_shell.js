#!/usr/bin/env node
// ponytail: A/B/C chrome + type + confirm contract
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
var ui = read("assets/js/ui.js");

assert(/--chrome-bg:/.test(css), "chrome token missing");
assert(/--chrome-blur:/.test(css), "chrome blur token missing");
assert(/prefers-reduced-transparency/.test(css), "reduced-transparency missing");
assert(/\.minimal-topbar[\s\S]*backdrop-filter:\s*blur\(var\(--chrome-blur\)/.test(css), "topbar frost missing");
assert(/font-optical-sizing:\s*auto/.test(css), "optical sizing missing");
assert(/\.cal-modal--confirm/.test(css), "confirm modal CSS missing");

assert(/window\.YYSD_CONFIRM\s*=/.test(ui), "YYSD_CONFIRM missing");
assert(/window\.YYSD_ALERT\s*=/.test(ui), "YYSD_ALERT missing");
assert(/window\.YYSD_ASK\s*=/.test(ui), "YYSD_ASK missing");
assert(/yysd-confirm-css/.test(ui), "injected confirm CSS missing");
assert(/YYSD_BIND_SHEET/.test(ui), "sheet drag binder missing");
assert(/function projectY/.test(ui), "velocity projection missing");

var silk = read("assets/js/page-transit.js");
assert(/light:\s*100/.test(silk), "silk light should be ~100ms");
assert(silk.indexOf("filter:blur") < 0, "silk must not use blur");
assert(silk.indexOf("pointer-events:none") < 0, "silk must not lock pointer");
assert(/hover:\s*none/.test(css), "touch hover gate missing");
assert(/cal-sheet-grip/.test(css), "sheet grip missing");
assert(/minimal-topbar::after/.test(css), "topbar scroll-edge fade missing");
assert(/mobile-tabs::before/.test(css), "tabs scroll-edge fade missing");
assert(/filter:\s*blur\(2px\)/.test(css), "sheet materialize blur missing");
assert(/is-surface-source/.test(css), "source highlight missing");
assert(/anchorPanel/.test(ui), "spatial anchor helper missing");
assert(/lastPtr/.test(ui), "pointer origin tracking missing");

assert(!/Inter/.test(read("assets/css/dashboard-premium.css")), "Inter still in dashboard-premium");
assert(!/family=Inter/.test(read("zone.html")), "Inter font still on zone.html");
assert(/assets\/js\/ui\.js/.test(read("exam.html")), "exam.html must load ui.js");
assert(/YYSD_ASK/.test(read("assets/js/exam.js")), "exam.js must use YYSD_ASK");
assert(/YYSD_ASK/.test(read("assets/js/vocab-lesson.js")), "vocab-lesson must use YYSD_ASK");

console.log("OK: apple shell A+B+C");
