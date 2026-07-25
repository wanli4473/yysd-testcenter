#!/usr/bin/env node
/** Mist chapter polish: expressions, new cuts, slash VFX. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

const art = [
  "ella-smile.png", "ella-worry.png", "ella-fierce.png",
  "hero-determined.png", "hero-hurt.png",
  "cut-mist-road.png", "cut-mist-sky.png", "cut-mist-shrine.png", "cut-mist-names.png"
];
art.forEach(function (f) {
  assert(fs.existsSync(path.join(root, "assets/img/word-realm", f)), "art " + f);
});

const script = fs.readFileSync(path.join(root, "assets/js/word-realm-vn-script.js"), "utf8");
const sandbox = { window: {} };
sandbox.window = sandbox;
vm.runInNewContext(script, sandbox);
const S = sandbox.window.YYSD_WORD_REALM_VN_SCRIPT;
assert(S.portraits["ella-smile"] && S.portraits["cut-road"], "portrait map");
assert(S.mist_enter.nodes.some((n) => n.type === "cutscene"), "enter cutscene");
assert(S.mist_boss_post.nodes.some((n) => n.type === "cutscene" && n.panels && n.panels.length >= 3), "clear panels");
assert(S.mist_boss_pre.nodes.every((n) => !JSON.stringify(n).includes("command menu")), "no cmd menu copy");

const lesson = fs.readFileSync(path.join(root, "assets/js/vocab-lesson.js"), "utf8");
assert(lesson.includes("playSlashFx") && lesson.includes("斩击"), "slash fx");
const css = fs.readFileSync(path.join(root, "assets/css/vocab-lesson.css"), "utf8");
assert(css.includes("vl-slash") && css.includes("vl-slash-cut"), "slash css");

console.log("word-realm mist polish smoke ok · art", art.length);
