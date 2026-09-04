#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function must(cond, msg) { if (!cond) throw new Error(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

must(fs.existsSync(path.join(root, "assets/img/maintenance-dog.png")), "dog image");
var html = read("maintenance.html");
must(html.indexOf("网站更新中，别急啊，在弄了") >= 0, "copy");
must(html.indexOf("maintenance-dog.png") >= 0, "img src");

var boot = read("assets/js/tenant-boot.js");
must(boot.indexOf("/api/maintenance") >= 0, "tenant-boot fetches status");
must(boot.indexOf('"maintenance.html": 1') >= 0, "teacher gate allows dog page");

var server = read("server/server.js");
must(server.indexOf("function readMaintOn") >= 0, "flag helper");
must(server.indexOf("15901754473") >= 0 && server.indexOf("18956023079") >= 0, "allow phones");
must(server.indexOf('app.get("/api/maintenance"') >= 0, "GET");
must(server.indexOf('app.post("/api/maintenance"') >= 0, "POST");
must(server.indexOf("网站更新中，别急啊，在弄了") >= 0, "api copy");

var plat = read("platform.html");
must(plat.indexOf("id=\"maint-toggle\"") >= 0, "platform toggle");
must(read("assets/js/platform.js").indexOf("/api/maintenance") >= 0, "platform js");

console.log("check_maintenance: ok");
