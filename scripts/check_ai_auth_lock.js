#!/usr/bin/env node
// ponytail: AI cost routes must require auth; backup retention >= 7d hourly
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function assert(c, m) { if (!c) { console.error("FAIL:", m); process.exit(1); } }

var server = read("server/server.js");
["shadow", "judge", "translate"].forEach(function (name) {
  var re = new RegExp("app\\.post\\(\"/api/jingting/" + name + "\",\\s*authMiddleware");
  assert(re.test(server), "jingting/" + name + " auth");
});
assert(/app\.post\("\/api\/speaking\/grade",\s*authMiddleware/.test(server), "speaking/grade auth");
assert(/已下线/.test(server) && /\/test\/jingting/.test(server), "test jingting closed");

var speaking = read("assets/js/speaking-common.js");
assert(speaking.indexOf("Authorization") >= 0, "speaking sends token");
assert(speaking.indexOf("请先登录后再使用 AI 评分") >= 0, "speaking 401 copy");

var bak = read("server/deploy/backup-yysd-db.sh");
var m = bak.match(/KEEP=(\d+)/);
assert(m && Number(m[1]) >= 168, "backup KEEP >= 168");

console.log("ok: ai auth lock + backup retention");
