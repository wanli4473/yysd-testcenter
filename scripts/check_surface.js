#!/usr/bin/env node
// ponytail: YYSD_SURFACE open/close contract — fails if helper regresses
"use strict";

var fs = require("fs");
var path = require("path");
var ui = fs.readFileSync(path.join(__dirname, "../assets/js/ui.js"), "utf8");
var css = fs.readFileSync(path.join(__dirname, "../assets/css/style.css"), "utf8");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

assert(/window\.YYSD_SURFACE\s*=\s*function/.test(ui), "YYSD_SURFACE helper missing");
assert(/classList\.add\("is-open"\)/.test(ui), "open must add is-open");
assert(/classList\.remove\("is-open"\)/.test(ui), "close must remove is-open");
assert(/el\.hidden\s*=\s*true/.test(ui), "close must eventually set hidden");
assert(/prefers-reduced-motion/.test(ui), "reduced-motion must be honored");

assert(/\.cal-modal\.is-open\s+\.cal-modal__panel/.test(css), "cal-modal open panel style missing");
assert(/\.nav-drawer\.is-open/.test(css), "nav-drawer open style missing");
assert(/--press-scale:/.test(css), "press token missing");
assert(/\.exam-card:active/.test(css), "exam-card press missing");

assert(
  fs.readFileSync(path.join(__dirname, "../assets/js/nav.js"), "utf8").indexOf("YYSD_SURFACE") >= 0,
  "nav.js must use YYSD_SURFACE"
);
assert(
  fs.readFileSync(path.join(__dirname, "../assets/js/teacher.js"), "utf8").indexOf("YYSD_SURFACE") >= 0,
  "teacher.js must use YYSD_SURFACE"
);

console.log("OK: surface + press contract");
