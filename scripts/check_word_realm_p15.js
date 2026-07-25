#!/usr/bin/env node
/** Phase 1.5 smoke: chapter clear + camp menu + mid VN + turn commands. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

const script = fs.readFileSync(path.join(root, "assets/js/word-realm-vn-script.js"), "utf8");
const sandbox = { window: {} };
sandbox.window = sandbox;
vm.runInNewContext(script, sandbox);
const S = sandbox.window.YYSD_WORD_REALM_VN_SCRIPT;
["mist_event_04", "mist_event_06", "mist_revisit", "mist_boss_post"].forEach(function (k) {
  assert(S[k] && S[k].nodes && S[k].nodes.length, "script " + k);
});
assert(S.mist_event_04.nodes.some((n) => n.type === "choice"), "mid choice");

const story = fs.readFileSync(path.join(root, "assets/js/word-realm-story.js"), "utf8");
assert(story.includes("questLine") && story.includes("recLevel"), "chapter quest meta");

const realm = fs.readFileSync(path.join(root, "assets/js/word-realm.js"), "utf8");
assert(realm.includes('view === "clear"') && realm.includes("renderChapterClear"), "settle view");
assert(realm.includes("wr-camp-menu") && realm.includes("mist_event_04"), "camp + mid hooks");
assert(realm.includes("mist_revisit") && realm.includes("next=clear"), "revisit + clear next");

const lesson = fs.readFileSync(path.join(root, "assets/js/vocab-lesson.js"), "utf8");
assert(!lesson.includes("showCommandGate") && lesson.includes("startAnswerTimer"), "quiz flow + timer");
assert(lesson.includes("vl-defeat--boss") && lesson.includes("next=clear"), "boss defeat + settle exit");

const css = fs.readFileSync(path.join(root, "assets/css/word-realm.css"), "utf8");
assert(css.includes("wr-clear") && css.includes("wr-camp-menu"), "clear/camp css");

const html = fs.readFileSync(path.join(root, "word-realm.html"), "utf8");
assert(html.includes("word-realm-vn.js"), "cache bump");

console.log("word-realm phase1.5 smoke ok");
