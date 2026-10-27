/* Gate: Mac speaking must not re-prompt getUserMedia after Allow */
var assert = require("assert");
var fs = require("fs");
var path = require("path");

function read(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

var shell = read("assets/js/toefl-shell.js");
var page = read("toefl-speaking.html");
var desktop = read("desktop/main.js");
var desktopPkg = read("desktop/package.json");
var desktopEnt = read("desktop/build/entitlements.mac.plist");
var tiku = read("desktop-tiku/main.js");
var tikuPkg = read("desktop-tiku/package.json");
var tikuEnt = read("desktop-tiku/build/entitlements.mac.plist");

assert.ok(shell.indexOf("function acquireMic") >= 0, "shell must own one page-level mic stream");
assert.ok(shell.indexOf("function releaseMic") >= 0, "shell must release mic only on leave");
assert.ok(shell.indexOf("function stopMicMeter") >= 0, "meter teardown must not kill tracks");
assert.ok(/function stopMic\(\) \{\s*stopMicMeter\(\);/.test(shell), "stopMic is meter-only");
assert.ok(shell.indexOf("scr.id === \"microphone\"") >= 0, "Continue on mic screen must acquire");
assert.ok(shell.indexOf("acquireMic().then(beginExam") >= 0, "Begin exam must reuse the live stream");
assert.ok(shell.indexOf("pagehide") >= 0 && shell.indexOf("releaseMic()") >= 0, "page leave releases the stream");

assert.ok(page.indexOf("acquireMic()") >= 0, "speaking exam must reuse YYSD_TOEFL_SHELL.acquireMic");
assert.ok(page.indexOf("recBusy") >= 0, "speaking must not stack getUserMedia while a prompt is open");
assert.ok(!/onstop = function \(\) \{[\s\S]{0,500}stopTracks\(/.test(page), "recorder.onstop must not stop tracks");
assert.ok(page.indexOf("stopTracks()") >= 0, "leave/void still releases the mic");

function hasDesktopFix(src, label) {
  assert.ok(src.indexOf("use-fake-ui-for-media-stream") >= 0, label + " must suppress Chromium mic bubble");
  assert.ok(src.indexOf("getMediaAccessStatus") >= 0, label + " must read macOS TCC before asking");
  assert.ok(src.indexOf("function grantOsMic") >= 0, label + " must wait for askForMediaAccess");
  assert.ok(src.indexOf("audioCapture") >= 0, label + " must grant audioCapture as well as media");
  assert.ok(!/allowMic\(\)[\s\S]{0,400}askForMediaAccess\("microphone"\)\.catch/.test(src),
    label + " must not fire-and-forget TCC at startup");
}
hasDesktopFix(desktop, "desktop");
hasDesktopFix(tiku, "desktop-tiku");

assert.ok(desktopPkg.indexOf("NSMicrophoneUsageDescription") >= 0);
assert.ok(tikuPkg.indexOf("NSMicrophoneUsageDescription") >= 0);
assert.ok(desktopPkg.indexOf("entitlements.mac.plist") >= 0);
assert.ok(tikuPkg.indexOf("entitlements.mac.plist") >= 0);
assert.ok(desktopEnt.indexOf("com.apple.security.device.audio-input") >= 0);
assert.ok(tikuEnt.indexOf("com.apple.security.device.audio-input") >= 0);

console.log("toefl-mic ok");
