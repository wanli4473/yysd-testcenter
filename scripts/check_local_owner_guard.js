#!/usr/bin/env node
/* ponytail: assert shared-PC local-store owner guard still exists */
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var auth = fs.readFileSync(path.join(root, "assets/js/auth.js"), "utf8");
var server = fs.readFileSync(path.join(root, "server/server.js"), "utf8");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

assert(auth.indexOf("LOCAL_OWNER_KEY") >= 0, "auth.js missing LOCAL_OWNER_KEY");
assert(auth.indexOf("adoptLocalStores") >= 0, "auth.js missing adoptLocalStores");
assert(auth.indexOf("clearLocalLearningStores") >= 0, "auth.js missing clearLocalLearningStores");
assert(/clearSession\([\s\S]*clearLocalLearningStores/.test(auth), "logout must clear local learning stores");
assert(/applyLogin\([\s\S]*adoptLocalStores/.test(auth), "login must adopt local stores");
assert(/syncScoresFromCloud\([\s\S]*adoptLocalStores/.test(auth), "sync must adopt local stores");
assert(/syncScoresFromCloud\([\s\S]*mergeScoreStores\(local, cloud\)/.test(auth), "sync must merge local+cloud");
assert(/syncScoresFromCloud\([\s\S]*pushes\.push/.test(auth), "sync must re-push local-newer scores");
assert(auth.indexOf("push local-newer only") >= 0, "sync must keep owner-safe local-newer push");
assert(server.indexOf("attempts_backfill_v1") >= 0, "server backfill must be gated once");
assert(server.indexOf("_yysd_meta") >= 0, "server missing _yysd_meta gate table");
assert(server.indexOf("attempt-required") >= 0, "PUT /api/scores must require attemptAt");
assert(/syncScoresFromCloud\(\)\.then\((boot|render)\)/.test(fs.readFileSync(path.join(root, "results.html"), "utf8")),
  "results.html must re-render after cloud sync");
assert(server.indexOf("/api/student/score-attempts") >= 0, "missing student score-attempts API");
console.log("ok local-owner guard + merge recover push");
