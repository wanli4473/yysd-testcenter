#!/usr/bin/env node
/** Smoke: HQ-only gate + Mistvale-only chapter pilot. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

const auth = fs.readFileSync(path.join(root, "assets/js/auth.js"), "utf8");
assert(auth.includes("function canWordRealm") && auth.includes("canWordRealm: canWordRealm"), "auth canWordRealm");

const nav = fs.readFileSync(path.join(root, "assets/js/nav.js"), "utf8");
assert(nav.includes("canWordRealm()") && nav.includes("!l.realm || canWordRealm"), "nav filters realm");

const zone = fs.readFileSync(path.join(root, "assets/js/zone.js"), "utf8");
assert(zone.includes("canWordRealm") && zone.includes("vocab-realm-banner"), "zone banner gated");

const realm = fs.readFileSync(path.join(root, "assets/js/word-realm.js"), "utf8");
assert(realm.includes("canWordRealm") && realm.includes('location.replace("zone.html?zone=study&s=vocab")'), "realm hard gate");
assert(realm.includes("雾原试玩") && realm.includes("后续章节尚未开放"), "clear CTA mist-only");
assert(!realm.includes("前往石语峡谷") && !realm.includes("东行 · 石语峡谷 ›"), "no stone launch CTA");

const lesson = fs.readFileSync(path.join(root, "assets/js/vocab-lesson.js"), "utf8");
assert(lesson.includes("canWordRealm") && lesson.includes('shrine.region !== "mist"'), "lesson mist-only");

const story = fs.readFileSync(path.join(root, "assets/js/word-realm-story.js"), "utf8");
assert(story.includes('return regionId === "mist"'), "story mist-only unlock");

console.log("word-realm gate smoke ok");
