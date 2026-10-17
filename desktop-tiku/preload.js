"use strict";
var { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("yysdDesktop", {
  kind: "tiku",
  device: ipcRenderer.sendSync("yysd-device"),
  reload: function () { ipcRenderer.send("yysd-reload"); }
});
