"use strict";
var { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("yysdSplash", {
  onProgress: function (fn) { ipcRenderer.on("splash-progress", function (_e, n) { fn(n); }); },
  onLabel: function (fn) { ipcRenderer.on("splash-label", function (_e, text) { fn(text); }); },
  onFail: function (fn) { ipcRenderer.on("splash-fail", function () { fn(); }); },
  retry: function () { ipcRenderer.send("splash-retry"); }
});
