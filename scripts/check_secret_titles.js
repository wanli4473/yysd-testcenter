#!/usr/bin/env node
// ponytail: secret-set picker titles stay bilingual and searchable
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function must(cond, msg) { if (!cond) throw new Error(msg); }

var cfg = fs.readFileSync(path.join(root, "assets/js/config.js"), "utf8");
var cal = fs.readFileSync(path.join(root, "assets/js/teacher-calendar.js"), "utf8");
var ids = [
  "secret-set-1-s1", "secret-set-1-s4", "secret-set-1-reading-p1",
  "secret-set-2-s1", "secret-set-2-reading-p3",
  "secret-set-3-reading-p1", "secret-set-3-reading-p3",
  "secret-set-4-reading-p1", "secret-set-4-reading-p3"
];
ids.forEach(function (id) {
  must(cfg.indexOf('"' + id + '"') >= 0, "missing title " + id);
});
must(cfg.indexOf("图书馆服务") >= 0 && cfg.indexOf("Library services") >= 0, "set1 s1 zh/en");
must(cfg.indexOf("历代玩偶") >= 0 && cfg.indexOf("Dolls through the ages") >= 0, "set1 p1 zh/en");
must(cfg.indexOf("悉尼歌剧院") >= 0 && cfg.indexOf("Sydney Opera House") >= 0, "set3 p1 zh/en");
must(cfg.indexOf("当人们对音乐失聪") >= 0, "set3 p3 zh");
must(cfg.indexOf("澳大利亚空中牙医") >= 0 && cfg.indexOf("Australia's Airborne Dentists") >= 0, "set4 p1 zh/en");
must(cfg.indexOf("塔斯马尼亚虎") >= 0, "set4 p2 zh");
must(cal.indexOf("secretTopicLine") >= 0, "calendar uses topic line");
must(cal.indexOf("secretSearchText") >= 0, "calendar searches topics");
must(cal.indexOf("cal-check-list--lsecret") >= 0, "lsecret 5-col class");
must(cal.indexOf("cal-check-list--rsecret") >= 0, "rsecret 4-col class");
must(cal.indexOf("secret-set-(\\d+)") >= 0, "secret numeric sort");
var css = fs.readFileSync(path.join(root, "assets/css/dashboard-premium.css"), "utf8");
must(css.indexOf("repeat(5, minmax(0, 1fr))") >= 0, "lsecret 5-col css");
must(css.indexOf("repeat(4, minmax(0, 1fr))") >= 0, "rsecret 4-col css");
must(cfg.indexOf("function ensureSecretCatChips") >= 0, "config injects secret chips");
must(cal.indexOf("ensureSecretCatChips") >= 0, "calendar calls chip inject");
var html = fs.readFileSync(path.join(root, "teacher-calendar.html"), "utf8");
must(html.indexOf('data-ex-cat="lsecret"') >= 0, "html lsecret chip");
must(html.indexOf('data-ex-cat="rsecret"') >= 0, "html rsecret chip");
// ponytail: catalog already lists these; missing files = assigned homework 404
[
  "library/mock/cambridge-listening/secret-set-1.html",
  "library/mock/cambridge-listening/secret-set-1-audio1.mp3",
  "library/mock/cambridge-listening/secret-set-2.html",
  "library/mock/cambridge-listening/secret-set-2-audio1.mp3",
  "library/mock/cambridge-reading/secret-set-3-reading.html",
  "library/mock/cambridge-reading/secret-set-4-reading.html"
].forEach(function (rel) {
  must(fs.existsSync(path.join(root, rel)), "missing " + rel);
});
console.log("check_secret_titles: ok");
