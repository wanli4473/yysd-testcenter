"use strict";
var { app, BrowserWindow, ipcMain } = require("electron");
var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var { execFileSync } = require("child_process");

var START_URL = process.env.YYSD_URL || "https://youyisida.com/login.html";

function hardwareId() {
  var out = execFileSync("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], { encoding: "utf8" });
  var m = /"IOPlatformUUID" = "([^"]+)"/.exec(out);
  return m ? m[1] : "";
}

function fileId() {
  var dir = "/Users/Shared/YYSD";
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

ipcMain.on("yysd-device", function (event) {
  event.returnValue = { hw: hardwareId(), file: fileId() };
});

function createWindow() {
  var win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true }
  });
  win.loadURL(START_URL);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", function () { app.quit(); });
