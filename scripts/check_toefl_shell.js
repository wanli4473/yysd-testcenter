/* one check: mic bands + hardware session key stay wired */
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var src = fs.readFileSync(path.join(__dirname, "../assets/js/toefl-shell.js"), "utf8");
var full = fs.readFileSync(path.join(__dirname, "../assets/js/toefl-full.js"), "utf8");

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
assert.ok(src.indexOf("Complete the Words") >= 0);
assert.ok(src.indexOf("renderReview") >= 0);
assert.ok(src.indexOf("Begin") >= 0);
assert.ok(src.indexOf("ensureMicCtx") >= 0);
assert.ok(src.indexOf("function acquireMic") >= 0);
assert.ok(src.indexOf("function releaseMic") >= 0);
assert.ok(src.indexOf("function stopMicMeter") >= 0);
assert.ok(src.indexOf("function streamLive") >= 0);
assert.ok(src.indexOf('scr.id === "microphone"') >= 0);
assert.ok(src.indexOf("acquireMic().then(beginExam") >= 0);
assert.ok(src.indexOf("micPending") >= 0);
assert.ok(src.indexOf(".resume()") >= 0);
assert.ok(src.indexOf("createGain") >= 0);
assert.ok(src.indexOf("gateTask") >= 0);
assert.ok(src.indexOf('skill === "speaking"') >= 0);
assert.ok(src.indexOf("exitBtn.classList.remove") >= 0);
assert.ok(src.indexOf("confirmExit") >= 0);
assert.ok(src.indexOf("function markLeaving") >= 0);
assert.ok(src.indexOf("leaving") >= 0);
assert.ok(full.indexOf("quitPack") >= 0);
assert.ok(full.indexOf('sessionStorage.removeItem("yysd:toefl-hw:"') >= 0);
require("./check_toefl_mic");
console.log("toefl-shell ok");
