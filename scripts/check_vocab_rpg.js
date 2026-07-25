#!/usr/bin/env node
/** Smoke: vocab RPG store + dual-entry split (作业区 / 词境远征). Exit 1 on failure. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

const rpgSrc = fs.readFileSync(path.join(root, "assets/js/vocab-rpg.js"), "utf8");
const store = {};
const sandbox = {
  window: {},
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  }
};
sandbox.window = sandbox;
vm.runInNewContext(rpgSrc, sandbox);
const RPG = sandbox.window.YYSD_VOCAB_RPG;
assert(RPG, "YYSD_VOCAB_RPG");

const p0 = RPG.progressFromXp(0);
assert(p0.level === 1 && p0.title === "词芽", "level 1 词芽");
const g1 = RPG.addXp(30, "t");
assert(g1.gained === 30 && g1.after.totalXp === 30, "addXp");
assert(g1.leveledUp === true && g1.after.level >= 2, "level up from 30");
const snap = RPG.snapshot();
assert(snap.weekXp === 30, "week xp");

sandbox.window.YYSD = {
  vocabListNo: (it) => {
    const m = String(it.title || it.id || "").match(/(\d+)/);
    return m ? +m[1] : 0;
  }
};
const lists = [
  { id: "a1", title: "单元1" },
  { id: "a2", title: "单元2" },
  { id: "a3", title: "单元3" },
  { id: "a4", title: "单元4" }
];
const nodes0 = RPG.pathNodes(lists, {}, "gaozhong");
assert(nodes0[0].state === "current", "first current");
assert(nodes0.some(n => n.isChest), "has chest");
const nodes1 = RPG.pathNodes(lists, { a1: { score: 1 } }, "gaozhong");
const cur = nodes1.find(n => !n.isChest && n.state === "current");
assert(cur && cur.item.id === "a2", "second current after a1 done");

const chest = nodes1.find(n => n.isChest && n.state === "chest-locked");
assert(chest, "chest locked until trio done");
const nodes3 = RPG.pathNodes(lists, { a1: 1, a2: 1, a3: 1 }, "gaozhong");
const openChest = nodes3.find(n => n.isChest && n.state === "chest");
assert(openChest, "chest open after 3 done");
const claim = RPG.claimChest("gaozhong", openChest.chestId, 5);
assert(claim && claim.gained === 5, "claim chest");
assert(!RPG.claimChest("gaozhong", openChest.chestId, 5), "no double claim");

const zone = fs.readFileSync(path.join(root, "assets/js/zone.js"), "utf8");
assert(zone.includes("vocab-realm-banner") && zone.includes("word-realm.html"), "zone promo to realm");
assert(zone.includes("作业模式") && zone.includes("vocabBentoHTML"), "homework bento restored");
assert(!zone.includes("bindVocabRpgPath") && !zone.includes("vocab-bento--rpg"), "rpg path removed from zone");

const zoneHtml = fs.readFileSync(path.join(root, "zone.html"), "utf8");
assert(!zoneHtml.includes("vocab-rpg.js"), "zone does not load rpg");

const realmHtml = fs.readFileSync(path.join(root, "word-realm.html"), "utf8");
assert(realmHtml.includes("word-realm.js") && realmHtml.includes("word-realm-story.js"), "realm shell");
assert(realmHtml.includes("vocab-rpg.js") && realmHtml.includes("word-realm-core.js"), "realm loads rpg+core");

const story = fs.readFileSync(path.join(root, "assets/js/word-realm-story.js"), "utf8");
assert(story.includes("YYSD_WORD_REALM_STORY") && story.includes("prologue") && story.includes("shrineBeat"), "story spine");
assert(story.includes("晨雾平原") && story.includes("石语峡谷") && story.includes("潮声海域"), "regions");
assert(story.includes("mist") && !story.includes("gaozhong"), "story regions not books");

const realm = fs.readFileSync(path.join(root, "assets/js/word-realm.js"), "utf8");
assert(realm.includes("from=realm") && realm.includes("renderPrologue") && realm.includes("mode=camp"), "realm map+camp");
assert(realm.includes("renderHub") && realm.includes("renderCodex"), "hub+codex");

const lesson = fs.readFileSync(path.join(root, "assets/js/vocab-lesson.js"), "utf8");
assert(lesson.includes("YYSD_VOCAB_RPG") && (lesson.includes("升级了") || lesson.includes("LEVEL UP")), "lesson xp wire");
assert(lesson.includes("word-realm.html") && lesson.includes("shrineParam"), "celebrate → realm / shrine");

const nav = fs.readFileSync(path.join(root, "assets/js/nav.js"), "utf8");
assert(nav.includes('key: "realm"') && nav.includes("word-realm.html"), "nav entry");

console.log("vocab-rpg dual-entry smoke ok · Lv." + RPG.snapshot().level, RPG.snapshot().title);
