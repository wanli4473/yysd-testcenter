/* Windows students must not be forced onto a new exe by a Mac-only ship */
var assert = require("assert");
var fs = require("fs");
var path = require("path");

var desktop = fs.readFileSync(path.join(__dirname, "../desktop/main.js"), "utf8");
var info = JSON.parse(fs.readFileSync(path.join(__dirname, "../desktop/version.json"), "utf8"));
var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../desktop/package.json"), "utf8"));

assert.ok(/if \(process\.platform !== "darwin"\) return Promise\.resolve\(false\);/.test(desktop),
  "Windows desktop must skip auto-update");
assert.ok(pkg.build && pkg.build.mac && String(pkg.build.mac.artifactName || "").indexOf("YouYiSiDa-mac-") >= 0,
  "Mac artifact name must stay Mac-only");
assert.ok(String(pkg.scripts && pkg.scripts.dist || "").indexOf("--win") < 0,
  "npm run dist must not build a Windows exe");
assert.strictEqual(pkg.version, info.version, "package version and version.json must match");
assert.ok(String(info.url || "").indexOf("YouYiSiDa-mac-") >= 0, "auto-update url must be the Mac zip");
assert.ok(String(info.win || "").indexOf("YouYiSiDa-1.0.19.exe") >= 0,
  "version.json win must keep pointing at the already-shipped Windows exe");
assert.notEqual(String(info.url || "").indexOf(".exe") >= 0, true, "Mac update url must not be an exe");

console.log("desktop-win-untouched ok");
