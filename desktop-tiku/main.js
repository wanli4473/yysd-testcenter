"use strict";
var { app, BrowserWindow, ipcMain, session, systemPreferences, Menu } = require("electron");
var crypto = require("crypto");
var fs = require("fs");
var https = require("https");
var os = require("os");
var path = require("path");
var { execFileSync, spawn } = require("child_process");

app.setName("优益思达题库中心");
var START_URL = process.env.YYSD_URL || "https://tiku.youyisida.com/?v=20261027rec1";
var splashWin = null;
var siteWin = null;
var shown = false;
var progress = 0;
var creep = null;
var failTimer = null;

function hardwareId() {
  try {
    if (process.platform === "darwin") {
      var out = execFileSync("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], { encoding: "utf8" });
      var m = /"IOPlatformUUID" = "([^"]+)"/.exec(out);
      return m ? m[1] : "";
    }
    if (process.platform === "win32") {
      var win = execFileSync("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], { encoding: "utf8" });
      var wm = /MachineGuid\s+REG_SZ\s+([A-Fa-f0-9-]+)/i.exec(win);
      return wm ? wm[1].trim() : "";
    }
  } catch (e) {}
  return "";
}

function fileId() {
  var dir = process.platform === "win32"
    ? path.join(os.homedir(), "AppData", "Local", "YYSD")
    : "/Users/Shared/YYSD";
  var file = path.join(dir, "device-id");
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch (e) {
    fs.mkdirSync(dir, { recursive: true });
    var id = crypto.randomUUID();
    fs.writeFileSync(file, id);
    return id;
  }
}

function sendProgress(n) {
  progress = Math.max(progress, n);
  if (splashWin && !splashWin.isDestroyed()) splashWin.webContents.send("splash-progress", progress);
}

function setProgress(n) {
  progress = n;
  if (splashWin && !splashWin.isDestroyed()) splashWin.webContents.send("splash-progress", progress);
}

function splashLabel(text) {
  if (splashWin && !splashWin.isDestroyed()) splashWin.webContents.send("splash-label", text);
}

function appBundlePath() {
  var exe = app.getPath("exe");
  var i = exe.indexOf(".app/");
  return i < 0 ? "" : exe.slice(0, i + 4);
}

function fetchJson(url) {
  return new Promise(function (resolve, reject) {
    https.get(url, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJson(res.headers.location).then(resolve, reject);
        return;
      }
      var body = "";
      res.on("data", function (chunk) { body += chunk; });
      res.on("end", function () {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

function isNewer(remote, local) {
  var a = String(remote || "").trim().split(".");
  var b = String(local || "").trim().split(".");
  for (var i = 0; i < 3; i++) {
    var x = Number(a[i] || 0);
    var y = Number(b[i] || 0);
    if (x !== y) return x > y;
  }
  return false;
}

function downloadFile(url, dest, onProgress) {
  return new Promise(function (resolve, reject) {
    var req = https.get(url, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        clearTimeout(cap);
        downloadFile(res.headers.location, dest, onProgress).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        clearTimeout(cap);
        reject(new Error("download " + res.statusCode));
        return;
      }
      var total = Number(res.headers["content-length"] || 0);
      if (!total) {
        res.resume();
        clearTimeout(cap);
        reject(new Error("download size"));
        return;
      }
      var got = 0;
      var idle = setTimeout(stall, 120000);
      function stall() { req.destroy(new Error("stall")); }
      var file = fs.createWriteStream(dest);
      res.on("data", function (chunk) {
        got += chunk.length;
        clearTimeout(idle);
        idle = setTimeout(stall, 120000);
        onProgress(Math.round(got / total * 100));
      });
      res.pipe(file);
      file.on("finish", function () {
        clearTimeout(idle);
        clearTimeout(cap);
        file.close(function () {
          if (got !== total) reject(new Error("short"));
          else resolve();
        });
      });
      file.on("error", reject);
    });
    var cap = setTimeout(function () { req.destroy(new Error("timeout")); }, 30 * 60 * 1000);
    req.on("error", function (err) {
      clearTimeout(cap);
      reject(err);
    });
  });
}

function installTarget() {
  var running = appBundlePath();
  if (running.indexOf("/Applications/") === 0 && running.indexOf("AppTranslocation") < 0) return running;
  return "/Applications/优益思达国际课程中心.app";
}

function bundleVersion(bundle) {
  try {
    return execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleShortVersionString", path.join(bundle, "Contents/Info.plist")], { encoding: "utf8" }).trim();
  } catch (e) {
    return "";
  }
}

function applyUpdate(zipPath) {
  var dest = installTarget();
  var srcDir = path.join(os.tmpdir(), "yysd-update");
  var bak = dest + ".bak";
  fs.rmSync(srcDir, { recursive: true, force: true });
  fs.mkdirSync(srcDir, { recursive: true });
  var q = function (s) { return JSON.stringify(s); };
  var script = path.join(os.tmpdir(), "yysd-update.sh");
  fs.writeFileSync(script, [
    "#!/bin/bash",
    "set -e",
    "while kill -0 " + process.pid + " 2>/dev/null; do sleep 0.3; done",
    "ditto -x -k " + q(zipPath) + " " + q(srcDir),
    "APP=$(find " + q(srcDir) + " -maxdepth 1 -name '*.app' | head -1)",
    "test -d \"$APP/Contents/MacOS\"",
    "rm -rf " + q(bak),
    "if [ -d " + q(dest) + " ]; then mv " + q(dest) + " " + q(bak) + "; fi",
    "cp -R \"$APP\" " + q(dest),
    "xattr -dr com.apple.quarantine " + q(dest) + " || true",
    "rm -rf " + q(bak),
    "open " + q(dest) + " || true"
  ].join("\n"), "utf8");
  fs.chmodSync(script, 0o755);
  spawn("bash", [script], { detached: true, stdio: "ignore" }).unref();
  app.quit();
}

function checkUpdate() {
  // ponytail: 老师端不走学生桌面自动更新，避免被换成 HIT 客户端
  return Promise.resolve(false);
}

function startCreep() {
  clearInterval(creep);
  creep = setInterval(function () {
    if (progress < 90) sendProgress(progress + 1);
  }, 180);
}

function reveal() {
  if (shown || !siteWin || siteWin.isDestroyed()) return;
  shown = true;
  clearTimeout(failTimer);
  clearInterval(creep);
  sendProgress(100);
  setTimeout(function () {
    if (!siteWin || siteWin.isDestroyed()) return;
    siteWin.show();
    if (splashWin && !splashWin.isDestroyed()) splashWin.close();
  }, 280);
}

function loadSite() {
  shown = false;
  progress = 0;
  splashLabel("系统预加载中");
  sendProgress(6);
  startCreep();
  var url = START_URL + (START_URL.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now();
  session.defaultSession.clearCache().finally(function () {
    siteWin.loadURL(url).catch(function () {
      clearInterval(creep);
      if (splashWin && !splashWin.isDestroyed()) splashWin.webContents.send("splash-fail");
    });
  });
}

ipcMain.on("yysd-device", function (event) {
  event.returnValue = { hw: hardwareId(), file: fileId() };
});

function reloadSite() {
  if (!siteWin || siteWin.isDestroyed()) return;
  siteWin.webContents.reloadIgnoringCache();
}

ipcMain.on("yysd-reload", function () { reloadSite(); });

ipcMain.on("splash-retry", function () {
  loadSite();
});

function createWindow() {
  splashWin = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#f4f1ea",
    webPreferences: {
      preload: path.join(__dirname, "splash-preload.js"),
      contextIsolation: true
    }
  });
  siteWin = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: "#f4f1ea",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });
  splashWin.on("closed", function () {
    if (!shown && siteWin && !siteWin.isDestroyed()) siteWin.close();
  });
  siteWin.webContents.setWindowOpenHandler(function (details) {
    var u = String(details.url || "");
    if (/^https:\/\/([a-z0-9-]+\.)?youyisida\.com(\/|$)/i.test(u) || /^https?:\/\/localhost[:/]/i.test(u)) {
      return { action: "allow" };
    }
    return { action: "deny" };
  });
  siteWin.webContents.on("dom-ready", function () { sendProgress(72); });
  siteWin.webContents.on("did-stop-loading", function () {
    siteWin.webContents.executeJavaScript("document.readyState").then(function (state) {
      if (state === "complete") reveal();
    }).catch(function () { reveal(); });
  });
  siteWin.webContents.on("did-fail-load", function (_e, code, _desc, _url, isMain) {
    if (!isMain || code === -3 || shown) return;
    clearTimeout(failTimer);
    failTimer = setTimeout(function () {
      if (shown || !siteWin || siteWin.isDestroyed()) return;
      var current = siteWin.webContents.getURL() || "";
      if (current.indexOf("youyisida.com") >= 0) return;
      clearInterval(creep);
      if (splashWin && !splashWin.isDestroyed()) splashWin.webContents.send("splash-fail");
    }, 2500);
  });
  splashWin.loadFile(path.join(__dirname, "splash.html")).then(function () {
    return checkUpdate();
  }).then(function (updating) {
    if (!updating) loadSite();
  });
}

function allowMic() {
  session.defaultSession.setPermissionRequestHandler(function (_wc, permission, callback) {
    callback(permission === "media" || permission === "microphone");
  });
  if (session.defaultSession.setPermissionCheckHandler) {
    session.defaultSession.setPermissionCheckHandler(function (_wc, permission) {
      return permission === "media" || permission === "microphone";
    });
  }
  if (process.platform === "darwin" && systemPreferences.askForMediaAccess) {
    systemPreferences.askForMediaAccess("microphone").catch(function () {});
  }
}

app.whenReady().then(function () {
  allowMic();
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: "appMenu" },
    { label: "查看", submenu: [
      { label: "刷新", accelerator: "CmdOrCtrl+R", click: reloadSite },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]},
    { role: "editMenu" },
    { role: "windowMenu" }
  ]));
  createWindow();
});
app.on("window-all-closed", function () { app.quit(); });
