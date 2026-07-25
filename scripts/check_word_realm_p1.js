#!/usr/bin/env node
/** Phase 1 smoke: mist art + VN chapter beats + boss wire. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

const art = [
  "enemy-fog-tongue.png", "boss-fog-tongue.png",
  "cut-mist-boss.png", "cut-mist-clear.png", "cut-mist-village.png"
];
art.forEach(function (f) {
  assert(fs.existsSync(path.join(root, "assets/img/word-realm", f)), "art " + f);
});

const script = fs.readFileSync(path.join(root, "assets/js/word-realm-vn-script.js"), "utf8");
const sandbox = { window: {} };
sandbox.window = sandbox;
vm.runInNewContext(script, sandbox);
const S = sandbox.window.YYSD_WORD_REALM_VN_SCRIPT;
["mist_enter", "mist_after_01", "mist_after_03", "mist_after_07", "mist_boss_pre", "mist_boss_post"].forEach(function (k) {
  assert(S[k] && S[k].nodes && S[k].nodes.length, "script " + k);
});
assert(S.mist_boss_pre.nodes.some((n) => n.type === "cutscene"), "boss cutscene");
assert(S.mist_boss_post.nodes.some((n) => n.type === "cutscene"), "clear cutscene");
const vn = fs.readFileSync(path.join(root, "assets/js/word-realm-vn.js"), "utf8");
assert(vn.includes("isSceneKey") && vn.includes("wr-vn__scene-stage"), "cinematic scene stage");

const story = fs.readFileSync(path.join(root, "assets/js/word-realm-story.js"), "utf8");
assert(story.includes("enemy-fog-tongue.png") && story.includes("boss-fog-tongue.png"), "story portraits");
assert(story.includes("vnPre") && story.includes("mist_boss_pre"), "boss vn hooks");

const realm = fs.readFileSync(path.join(root, "assets/js/word-realm.js"), "utf8");
assert(realm.includes("view=vn") && realm.includes("mist_enter") && realm.includes("resolveVnNext"), "vn route");

const lesson = fs.readFileSync(path.join(root, "assets/js/vocab-lesson.js"), "utf8");
assert(lesson.includes("vl-enemy--portrait") && lesson.includes("mist_after_") && lesson.includes("vnAlreadySeen"), "lesson portraits+after");

const html = fs.readFileSync(path.join(root, "word-realm.html"), "utf8");
assert(html.includes("20260725myth") || html.includes("word-realm-vn.js"), "cache bump");

console.log("word-realm phase1 smoke ok · mist scripts", Object.keys(S).filter((k) => k.indexOf("mist") === 0).length);
