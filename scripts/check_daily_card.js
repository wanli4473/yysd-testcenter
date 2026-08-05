#!/usr/bin/env node
// ponytail: vocab-daily-card 三态 + 满宽 CTA 契约
"use strict";

var fs = require("fs");
var path = require("path");
var zone = fs.readFileSync(path.join(__dirname, "../assets/js/zone.js"), "utf8");
var css = fs.readFileSync(path.join(__dirname, "../assets/css/dashboard-premium.css"), "utf8");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

var core = fs.readFileSync(path.join(__dirname, "../assets/js/daily-word/core.js"), "utf8");
var learn = fs.readFileSync(path.join(__dirname, "../assets/js/daily-word/learn.js"), "utf8");

assert(/is-idle/.test(zone) && /is-resume/.test(zone) && /is-done/.test(zone), "zone.js missing 3 states");
assert(/vocab-daily-card__cta/.test(zone), "zone.js missing full-width CTA");
assert(/vocab-daily-card__ring/.test(zone), "zone.js missing progress ring");
assert(/yysd:daily-word:result/.test(zone), "zone.js must read result for done state");
assert(/vocab-daily-card__picks/.test(zone), "zone.js missing word picks");
assert(/vocab-daily-card__week/.test(zone), "zone.js missing week check-in");
assert(/yysd:daily-word:checkins/.test(zone), "zone.js must read checkins");
assert(/markCheckin/.test(core) && /checkins/.test(core), "core.js missing checkin helpers");
assert(/markCheckin/.test(learn), "learn.js must mark checkin on finish");
assert(/\.vocab-daily-card__cta:active/.test(css), "CTA press style missing");
assert(/conic-gradient/.test(css), "ring conic-gradient missing");
assert(/vocab-daily-pulse/.test(css), "resume badge pulse missing");
assert(/vocab-daily-card__dot/.test(css), "week dot styles missing");
assert(/vocab-daily-card__pick/.test(css), "pick chip styles missing");

console.log("OK: daily card Reme CTA + week/picks contract");
