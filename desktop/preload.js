"use strict";
var { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("yysdDesktop", {
  device: ipcRenderer.sendSync("yysd-device")
});
