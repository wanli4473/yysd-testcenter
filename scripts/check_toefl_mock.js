"use strict";
var assert = require("assert");
var M = require("../app/assets/js/mock.js");
var F = require("../assets/js/toefl-full.js");

var list = [
  { id: "2025-07-04", title: "口语 Form 1" },
  { id: "2025-07-04-s2", title: "口语 Form 2" },
  { id: "2025-07-04-s3", title: "口语 Form 3" },
  { id: "2025-07-05", title: "口语 Form 1" }
];
var forms = M.speakingForms("2025-07-04", list);
assert.strictEqual(forms.length, 3);
assert.strictEqual(forms[0].id, "2025-07-04");
assert.strictEqual(M.formLabel(forms[1], "2025-07-04"), "Form 2");
assert.strictEqual(M.speakingForms("2025-07-05", list).length, 1);

var cfg = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/config.js"), "utf8");
var fullBlock = cfg.split("var TOEFL_FULL = [")[1].split("];")[0];
assert.deepStrictEqual(fullBlock.match(/id: "([^"]+)"/g), [
  'id: "2025-07-16"', 'id: "2025-09-02"', 'id: "2025-09-19"'
]);

assert.strictEqual(F.mockHubHref("full"), "app/mock.html?kind=full");
assert.ok(F.skillHref("2025-07-04", "mock", "reading").indexOf("full=1") >= 0);
assert.ok(F.listBack("reading").indexOf("zone.html") >= 0);

var fs = require("fs");
var path = require("path");
var ngx = fs.readFileSync(path.join(__dirname, "../server/deploy/nginx-app.conf"), "utf8");
assert.ok(ngx.indexOf("try_files $uri @web_toefl") >= 0, "app set library must win before web dated papers");
assert.ok(ngx.indexOf("location @web_toefl") >= 0);
assert.ok(fs.readFileSync(path.join(__dirname, "../app/assets/js/toefl-speaking.js"), "utf8").indexOf("encodeURI(") >= 0);
assert.ok(fs.readFileSync(path.join(__dirname, "../app/listening.html"), "utf8").indexOf("encodeURI(task.audio") >= 0);
var play = fs.readFileSync(path.join(__dirname, "../app/assets/js/play.js"), "utf8");
assert.ok(play.indexOf("showLoadError(") >= 0 && play.indexOf("Unable to load this set") >= 0, "load failure must surface a visible panel");

["reading", "listening", "writing", "speaking"].forEach(function (skill) {
  var html = fs.readFileSync(path.join(__dirname, "../app/" + skill + ".html"), "utf8");
  assert.ok(/assets\/js\/play\.js\?v=/.test(html), "app/" + skill + ".html must cache-bust play.js (stale cache = dead Submit buttons)");
});

require("./check_toefl_paper").checkLive();

console.log("ok toefl mock picker");
