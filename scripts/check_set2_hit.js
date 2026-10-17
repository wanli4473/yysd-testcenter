/* one check: Set 2 JSON + catalog indexes */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "app", "library", "toefl");
function load(n) { return JSON.parse(fs.readFileSync(path.join(root, n), "utf8")); }
var R = load("set-2-reading.json");
var L = load("set-2-listening.json");
var W = load("set-2-writing.json");
var S = load("set-2-speaking.json");
function ok(c, m) { if (!c) throw new Error(m); }
ok(R.tasks.length === 3 && R.tasks[0].type === "complete_words", "reading");
ok(R.tasks[0].passage.filter(function (p) { return p.id; }).length === 10, "cw blanks");
ok(R.tasks[0].titleZh === "老虎", "reading zh");
ok(L.tasks.length === 21, "listening 21");
ok(L.tasks[0].type === "choose_response" && L.tasks[12].type === "conversation", "listen order");
ok(L.tasks[17].type === "announcement" && L.tasks[20].type === "lecture", "listen tail");
ok(L.tasks[12].titleZh && L.tasks[20].titleZh, "listen zh titles");
ok(W.tasks.length === 12 && W.tasks[0].type === "sentence" && W.tasks[10].type === "email" && W.tasks[11].type === "discussion", "writing");
ok(S.tasks.length === 11 && S.tasks[0].type === "repeat" && S.tasks[7].type === "interview", "speaking");
ok(S.tasks[0].titleZh === "木工坊" && S.tasks[7].titleZh === "交通习惯", "speak zh");
ok(S.modules[0].intro && /set-2-wood-intro/.test(S.modules[0].intro.audio), "lr intro file");
ok(/set-2-wood-1\.m4a$/.test(S.tasks[0].audio) && S.tasks[0].audio !== S.modules[0].intro.audio, "q1 is not the intro file");
ok(fs.existsSync(path.join(root, "audio", "Set2-L-CR1.mp3")), "cr audio");
ok(fs.statSync(path.join(root, "audio", "Set2-L-LCN2.mp3")).size === 227276, "c02 not shifted onto c01");
ok(fs.statSync(path.join(root, "audio", "Set2-L-AT1.mp3")).size === 952460, "lecture is official clip");
ok(fs.existsSync(path.join(root, "audio", "Set2-S-LR2.mp3")), "speak audio");
ok(fs.existsSync(path.join(root, "audio", "Set2-S-IV2-Q1.mp3")), "iv audio");
console.log("set2 hit ok");
