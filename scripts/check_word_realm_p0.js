#!/usr/bin/env node
/** Phase 0 vertical slice smoke: VN + DQ commands + mist3 hook. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

const vn = fs.readFileSync(path.join(root, "assets/js/word-realm-vn.js"), "utf8");
const script = fs.readFileSync(path.join(root, "assets/js/word-realm-vn-script.js"), "utf8");
const realmJs = fs.readFileSync(path.join(root, "assets/js/word-realm.js"), "utf8");
const lesson = fs.readFileSync(path.join(root, "assets/js/vocab-lesson.js"), "utf8");
const html = fs.readFileSync(path.join(root, "word-realm.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/css/word-realm.css"), "utf8");
const vlCss = fs.readFileSync(path.join(root, "assets/css/vocab-lesson.css"), "utf8");

assert(vn.includes("YYSD_WORD_REALM_VN") && vn.includes("function play"), "vn engine");
assert(script.includes("prologue") && script.includes("mist_clear3"), "vn scripts");
assert(script.includes('"zh"') || script.includes("zh:"), "zh subtitles");
assert(html.includes("word-realm-vn.js") && html.includes("word-realm-vn-script.js"), "html loads vn");
assert(realmJs.includes("playVnScript") && realmJs.includes("prologue-v3"), "realm uses vn");
assert(realmJs.includes("maybePlayMist3Vn"), "mist3 hook");
assert(!lesson.includes("vl-cmd-attack") && !lesson.includes("showCommandGate"), "no command menu");
assert(lesson.includes("applyEnemyAttack") && lesson.includes("startAnswerTimer") && lesson.includes("fleeHref"), "timer+bite");
assert(lesson.includes("buildRealmExercises") && lesson.includes("REALM_WORDS_MIN"), "harder realm queue");
assert(lesson.includes("vl-levelup") && lesson.includes("LEVEL UP"), "levelup banner");
assert(css.includes("wr-vn__zh") && css.includes("wr-vn--cut"), "vn css");
assert(vlCss.includes("vl-levelup") && vlCss.includes("vl-timer"), "timer/level css");

const sandbox = { window: {}, document: { createElement: () => ({}) } };
sandbox.window = sandbox;
vm.runInNewContext(script, sandbox);
const S = sandbox.window.YYSD_WORD_REALM_VN_SCRIPT;
assert(S.prologue.nodes.length >= 8, "prologue length");
assert(S.prologue.nodes.some((n) => n.type === "cutscene"), "has cutscene");
assert(S.prologue.nodes.some((n) => n.type === "choice"), "has choice");
S.prologue.nodes.forEach(function (n) {
  if (n.type === "end") return;
  if (n.type === "cutscene") {
    assert(n.panels && n.panels.every(function (p) { return p.en && p.zh; }), "cutscene zh " + n.id);
    return;
  }
  if (n.type === "choice") {
    assert(n.en && n.zh && n.options.every(function (o) { return o.en && o.zh; }), "choice zh " + n.id);
    return;
  }
  assert(n.en && n.zh, "line zh " + n.id);
});

console.log("word-realm phase0 smoke ok · prologue nodes", S.prologue.nodes.length);
