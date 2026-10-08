/* one check: Set 1 JSON matches HIT catalog task indexes */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "app", "library", "toefl");
function load(n) { return JSON.parse(fs.readFileSync(path.join(root, n), "utf8")); }
var R = load("set-1-reading.json");
var L = load("set-1-listening.json");
var W = load("set-1-writing.json");
var S = load("set-1-speaking.json");
function ok(c, m) { if (!c) throw new Error(m); }
ok(R.tasks.length === 3 && R.tasks[0].type === "complete_words", "reading");
ok(R.tasks[0].passage.filter(function (p) { return p.id; }).length === 10, "cw blanks");
ok(L.tasks.length === 21, "listening 21");
ok(L.tasks[0].type === "choose_response" && L.tasks[12].type === "conversation", "listen order");
ok(L.tasks[17].type === "announcement" && L.tasks[20].type === "lecture", "listen tail");
ok(W.tasks.length === 12 && W.tasks[0].type === "sentence" && W.tasks[10].type === "email", "writing");
ok(S.tasks.length === 11 && S.tasks[0].type === "repeat" && S.tasks[7].type === "interview", "speaking");
ok(fs.existsSync(path.join(root, "audio", "Set1-L-CR1.mp3")), "audio");
console.log("set1 hit ok");
