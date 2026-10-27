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

var vm = require("vm");
var gumCalls = 0;
var track = {
  readyState: "live",
  stop: function () { track.readyState = "ended"; },
  addEventListener: function () {}
};
var fakeStream = {
  getAudioTracks: function () { return [track]; },
  getTracks: function () { return [track]; }
};
var sandbox = {
  window: null,
  AudioContext: function () {},
  webkitAudioContext: function () {},
  MutationObserver: null,
  document: {
    readyState: "complete",
    getElementById: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    body: { classList: { toggle: function () {}, add: function () {} } }
  },
  navigator: {
    mediaDevices: {
      getUserMedia: function () {
        gumCalls += 1;
        track.readyState = "live";
        return Promise.resolve(fakeStream);
      }
    }
  },
  console: console
};
sandbox.window = sandbox;
sandbox.addEventListener = function () {};
vm.runInNewContext(shell, sandbox, { filename: "toefl-shell.js" });
var Mic = sandbox.YYSD_TOEFL_SHELL;
assert.ok(Mic && Mic.acquireMic, "shell exports acquireMic");

Mic.acquireMic().then(function (a) {
  return Mic.acquireMic().then(function (b) {
    assert.strictEqual(a, b, "second acquire must reuse the same stream");
    assert.strictEqual(gumCalls, 1, "getUserMedia must run once while the track is live");
    Mic.releaseMic();
    return Mic.acquireMic();
  });
}).then(function () {
  assert.strictEqual(gumCalls, 2, "only a real release may request the mic again");
  console.log("toefl-mic ok");
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
