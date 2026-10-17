"use strict";
/* Merge all ready .staging/w-bsN-{tasks,greens}.json into bank, gate, optionally rsync.
   Usage: node scripts/ship_bs_ready.js [--rsync]
*/
var fs = require("fs");
var path = require("path");
var { execSync } = require("child_process");
var root = path.join(__dirname, "..");
var staging = path.join(root, ".staging");
var doRsync = process.argv.indexOf("--rsync") >= 0;
var merge = path.join(__dirname, "merge_bs_set.js");
var names = fs.readdirSync(staging).filter(function (n) { return /^w-bs\d+-tasks\.json$/.test(n); });
var nums = names.map(function (n) { return Number(n.match(/\d+/)[0]); }).sort(function (a, b) { return a - b; });
var ok = [];
var fail = [];
nums.forEach(function (n) {
  var g = path.join(staging, "w-bs" + n + "-greens.json");
  if (!fs.existsSync(g)) { fail.push(n + " missing greens"); return; }
  try {
    execSync("node " + JSON.stringify(merge) + " " + n, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    ok.push(n);
  } catch (e) {
    fail.push("W-BS" + n + ": " + String(e.stderr || e.message).slice(0, 400));
  }
});
if (ok.length) {
  execSync("node scripts/check_toefl_paper.js app/library/toefl/bank-bs-writing.json", { cwd: root, stdio: "inherit" });
  execSync("node scripts/check_tiku.js", { cwd: root, stdio: "inherit" });
  if (doRsync) {
    var key = 'ssh -i ~/.ssh/yysd_ecs_deploy -o StrictHostKeyChecking=accept-new';
    execSync('rsync -az -e "' + key + '" app/library/toefl/bank-bs-writing.json root@8.159.129.88:/opt/yysd/app/library/toefl/', { cwd: root, stdio: "inherit" });
    execSync('rsync -az -e "' + key + '" app/library/toefl/bank-bs-writing.json root@8.159.129.88:/opt/yysd/repo/app/library/toefl/', { cwd: root, stdio: "inherit" });
    execSync('rsync -az -e "' + key + '" scripts/check_tiku.js root@8.159.129.88:/opt/yysd/repo/scripts/', { cwd: root, stdio: "inherit" });
  }
}
console.log("merged", ok.join(","), "fail", fail.length ? fail.join(" | ") : "none");
if (fail.length) process.exit(1);
