#!/usr/bin/env node
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var auth = fs.readFileSync(path.join(root, "assets/js/auth.js"), "utf8");
var server = fs.readFileSync(path.join(root, "server/server.js"), "utf8");
function assert(c, m) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
assert(/app\.get\("\/api\/scores"[\s\S]*Cache-Control", "private, no-store"/.test(server), "GET /api/scores must no-store");
assert(/app\.set\("etag", false\)/.test(server), "API must disable etag (304 empty body wipe)");
assert(/cache:\s*"no-store"/.test(auth), "api() fetch must cache:no-store");
assert(auth.indexOf("成绩同步失败") >= 0, "api() must reject empty/304 body");
console.log("ok scores no-store guard");
