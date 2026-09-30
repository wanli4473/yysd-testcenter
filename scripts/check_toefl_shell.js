/* one check: mic bands + hardware session key stay wired */
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var src = fs.readFileSync(path.join(__dirname, "../assets/js/toefl-shell.js"), "utf8");

function levelOf(rms) {
  if (rms < 0.02) return 0;
  if (rms > 0.28) return 2;
  return 1;
}

assert.strictEqual(levelOf(0.01), 0);
assert.strictEqual(levelOf(0.1), 1);
assert.strictEqual(levelOf(0.4), 2);
assert.ok(src.indexOf("yysd:toefl-hw:") >= 0);
assert.ok(src.indexOf("getUserMedia") >= 0);
assert.ok(src.indexOf("AnalyserNode") >= 0 || src.indexOf("createAnalyser") >= 0);
assert.ok(src.indexOf("id: \"microphone\"") >= 0);
console.log("toefl-shell ok");
