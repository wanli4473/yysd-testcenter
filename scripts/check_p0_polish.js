/* ponytail: one-shot checks for P0 polish — run: node scripts/check_p0_polish.js */
"use strict";

var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var fails = 0;

function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    fails++;
  } else {
    console.log("ok:", msg);
  }
}

var zone = fs.readFileSync(path.join(root, "assets/js/zone.js"), "utf8");
ok(zone.indexOf("function syncZoneQuery") >= 0, "zone.js has syncZoneQuery");
ok(zone.indexOf("is-ielts-hub") >= 0, "zone.js toggles is-ielts-hub");
ok(/activeCat = next;\s*syncZoneQuery\(\)/.test(zone), "chip change syncs URL");

var css = fs.readFileSync(path.join(root, "assets/css/style.css"), "utf8");
ok(css.indexOf("body.is-ielts-hub .catalog-toolbar") >= 0, "CSS force-hides hub toolbar");

var bridge = fs.readFileSync(path.join(root, "assets/js/exam-bridge.js"), "utf8");
ok(bridge.indexOf("parent.document.hasFocus()") >= 0, "exam-bridge allows parent chrome focus");

var results = fs.readFileSync(path.join(root, "results.html"), "utf8");
ok(results.indexOf('qs.get("event") ? "wrongs"') >= 0, "results ?event= opens wrongs tab");
ok(results.indexOf('hashchange') >= 0, "results listens to hashchange");

var wrongs = fs.readFileSync(path.join(root, "assets/js/results-wrongs.js"), "utf8");
ok(wrongs.indexOf("if (focusEvent) assignmentOnly = true") >= 0, "event deep-link forces 作业 filter");

process.exit(fails ? 1 : 0);
