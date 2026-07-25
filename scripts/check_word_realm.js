#!/usr/bin/env node
/** Smoke: mixed lexicon + dual path (mainline shrine vs camp) + homework untouched. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

const lexPath = path.join(root, "library/practice/word-realm/lexicon.json");
assert(fs.existsSync(lexPath), "lexicon.json exists");
const lex = JSON.parse(fs.readFileSync(lexPath, "utf8"));
assert(lex.words && lex.words.length > 1000, "mixed pool size");
assert(lex.stats && lex.stats.byTier && lex.stats.byTier[4] >= 80, "tier4 hard words");
assert(Array.isArray(lex.shrines) && lex.shrines.length === 48, "48 shrines");
assert(lex.shrines[0].region === "mist" && lex.shrines[23].region === "tide", "early region map");
assert(lex.shrines[24].region === "ash" && lex.shrines[32].region === "archive" && lex.shrines[47].region === "throne", "late region map");
assert(lex.shrines[0].words.length === 8, "8 words per shrine");

const keys = new Set(lex.words.map((w) => w.word.toLowerCase()));
assert(keys.size === lex.words.length, "deduped words");

const hard = JSON.parse(fs.readFileSync(path.join(root, "library/practice/word-realm/hard-extra.json"), "utf8"));
assert(hard.length >= 80, "hard-extra size");

const build = fs.readFileSync(path.join(root, "scripts/build_realm_lexicon.js"), "utf8");
assert(build.includes("hard-extra") && build.includes("SHRINE_COUNT = 48"), "build script 48");

const store = {};
const sandbox = {
  window: {},
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  location: { pathname: "/word-realm.html" },
  fetch: () => Promise.reject(new Error("no fetch in smoke"))
};
sandbox.window = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/vocab-rpg.js"), "utf8"), sandbox);
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/word-realm-story.js"), "utf8"), sandbox);
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/word-realm-core.js"), "utf8"), sandbox);
const CORE = sandbox.window.YYSD_WORD_REALM;
const STORY = sandbox.window.YYSD_WORD_REALM_STORY;
assert(CORE, "YYSD_WORD_REALM");
assert(STORY && STORY.enemies, "story enemies");
assert(STORY.chapters && STORY.chapters.length === 6, "six chapters");
assert(Object.keys(STORY.regions).length === 6, "six regions");
assert(STORY.isBossShrine("shrine-48") && STORY.isBossShrine("shrine-32"), "late bosses");

const nodes0 = CORE.pathNodes(lex);
assert(nodes0[0].state === "current" && !nodes0[0].isChest, "first shrine current");
assert(nodes0.some((n) => n.isChest), "has chests");
assert(CORE.markCleared("shrine-01") === true, "mark cleared");
assert(CORE.markCleared("shrine-01") === false, "no double clear");
assert(CORE.clearedCount() === 1, "cleared count");
const nodes1 = CORE.pathNodes(lex);
const cur = nodes1.find((n) => !n.isChest && n.state === "current");
assert(cur && cur.shrine.id === "shrine-02", "progress unlocks next");

const camp = CORE.randomCampWords(lex, 10);
assert(camp.length === 10, "camp sample");
assert(CORE.clearedCount() === 1, "camp sampling does not clear shrines");

const claim = CORE.claimChest("chest-shrine-03", 5);
assert(claim && claim.gained === 5, "chest xp");
assert(!CORE.claimChest("chest-shrine-03", 5), "no double chest");

assert(CORE.regionUnlocked("mist") === true, "mist open");
assert(CORE.regionUnlocked("stone") === false, "stone locked (pilot mist-only)");
assert(CORE.regionUnlocked("ash") === false, "ash locked (pilot mist-only)");
assert(CORE.shrineTotal() === 48, "shrineTotal 48");
assert(CORE.regionRange("throne").start === 41 && CORE.regionRange("throne").end === 48, "throne range");

const realmJs = fs.readFileSync(path.join(root, "assets/js/word-realm.js"), "utf8");
assert(realmJs.includes("星屑修炼场") && realmJs.includes("mode=camp"), "camp CTA");
assert(realmJs.includes("region=") && !realmJs.includes("vocabBooksForZone"), "story regions not books");
assert(realmJs.includes("from=realm&shrine="), "shrine lesson link");
assert(realmJs.includes("renderHub") && realmJs.includes("renderMap") && realmJs.includes("renderCodex"), "hub/map/codex");
assert(realmJs.includes("wr-pin") && realmJs.includes("pinLayout"), "pin map");
assert(realmJs.includes("view=map") || realmJs.includes('"map"'), "map view");
assert(!realmJs.includes("wr-path"), "vertical path retired");
assert(realmJs.includes("renderDream") && realmJs.includes("wr-ella") && realmJs.includes("任务板"), "ella+dream");
assert(realmJs.includes("wr-weekly") && realmJs.includes("wr-saga") && realmJs.includes("wr-fog-clear"), "juice+saga ui");
assert(realmJs.includes("boardHTML") && realmJs.includes("bindMute"), "board+mute");
assert(realmJs.includes("ash") && realmJs.includes("archive") && realmJs.includes("throne"), "six region UI");
assert(realmJs.includes("sagaProgressHTML"), "saga progress");

const sfxSrc = fs.readFileSync(path.join(root, "assets/js/word-realm-sfx.js"), "utf8");
assert(sfxSrc.includes("YYSD_WORD_REALM_SFX") && sfxSrc.includes("AudioContext"), "sfx module");
assert(fs.readFileSync(path.join(root, "word-realm.html"), "utf8").includes("word-realm-sfx.js"), "realm loads sfx");
assert(fs.readFileSync(path.join(root, "vocab-lesson.html"), "utf8").includes("word-realm-sfx.js"), "lesson loads sfx");

const story = fs.readFileSync(path.join(root, "assets/js/word-realm-story.js"), "utf8");
assert(story.includes("weeklyThemes") && story.includes("深渊潮汐"), "weekly themes");
assert(story.includes("灰烬群岛") && story.includes("镜书图书馆") && story.includes("遗忘王座"), "late chapter names");
assert(!story.includes("chapter2Preview"), "ch2 teaser retired");
assert(story.includes("prologue") && story.includes("acts") && story.includes("星屑以前"), "novel prologue");
assert(story.includes("第一次遗忘战争") || story.includes("分崩离析"), "prologue lore beats");
assert(STORY.prologue && Array.isArray(STORY.prologue.acts) && STORY.prologue.acts.length >= 8, "8+ prologue acts");
assert(STORY.chronicle && STORY.chronicle.volumes && STORY.chronicle.volumes.length >= 8, "chronicle volumes");
assert(realmJs.includes("renderPrologue") && realmJs.includes("renderLore") && realmJs.includes("prologue-v3"), "prologue UI");
assert(realmJs.includes("playVnScript") && realmJs.includes("YYSD_WORD_REALM_VN"), "vn wired");
const theme = STORY.weeklyTheme("2026-W30");
assert(theme && theme.name && Array.isArray(theme.tiers), "weeklyTheme()");
const campSample = CORE.randomCampWords(lex, 10, { tiers: [4] });
assert(campSample.length === 10, "camp tier filter size");

assert(story.includes("mist") && story.includes("stone") && story.includes("tide"), "story regions");
assert(!story.includes("gaozhong"), "no homework book keys in story");
assert(story.includes("enemies") && story.includes("fog-tongue") && story.includes("drill-dummy"), "enemy roster");
assert(story.includes("ash-doubt") && story.includes("blank-folio") && story.includes("unsayer"), "late enemies");
assert(story.includes("pinLayout") && story.includes("cast") && story.includes("transit"), "hub/map story data");
assert(story.includes("chapters") && story.includes("bosses") && story.includes("dreams"), "story spine");
assert(story.includes("shrine-08") && story.includes("shrine-32") && story.includes("shrine-48"), "boss shrines");
assert(story.includes("dream-4") && story.includes("dream-48") && story.includes("isBossShrine"), "dreams + helpers");
assert(story.includes("frag-13") && story.includes("eaterKing"), "full fragment + cast");

const lesson = fs.readFileSync(path.join(root, "assets/js/vocab-lesson.js"), "utf8");
assert(lesson.includes("mode=camp") && lesson.includes("buildCampExercises"), "camp engine");
assert(lesson.includes("markCleared") && lesson.includes("startShrine"), "shrine clear");
assert(lesson.includes('camp ? "camp"'), "camp xp reason");
assert(lesson.includes("if (state.shrineId && CORE && !state.camp) CORE.markCleared"), "only shrine marks progress");
assert(lesson.includes("createBattle") && lesson.includes("battleDamage") && lesson.includes("showDefeat"), "battle skin");
assert(lesson.includes("vl-battle-hud") && lesson.includes("击破"), "battle HUD");
assert(lesson.includes("showCutscene") && lesson.includes("Boss 战前") && lesson.includes("view=dream"), "boss cutscene + dream exit");

// dream queue on clear
assert(CORE.markCleared("shrine-01") === true || CORE.isCleared("shrine-01"), "clear 1");
["shrine-02", "shrine-03", "shrine-04"].forEach(function (id) { CORE.markCleared(id); });
assert(CORE.pendingDream() === "dream-4" || CORE.dreamSeen("dream-4"), "dream-4 queued at 4 clears");
const d = CORE.consumeDream("dream-4");
assert(d && d.id === "dream-4" && !CORE.pendingDream(), "consume dream");
assert(STORY.isBossShrine("shrine-08") && !STORY.isBossShrine("shrine-01"), "boss detect");

// pilot: mist-only — clearing bosses does not open later regions
for (var i = 5; i <= 8; i++) CORE.markCleared("shrine-" + String(i).padStart(2, "0"));
assert(CORE.regionUnlocked("stone") === false, "stone stays locked after 08 (pilot)");
assert(CORE.regionUnlocked("mist") === true, "mist still open after boss");
for (var j = 9; j <= 16; j++) CORE.markCleared("shrine-" + String(j).padStart(2, "0"));
assert(CORE.regionUnlocked("tide") === false, "tide stays locked (pilot)");
for (var k = 17; k <= 24; k++) CORE.markCleared("shrine-" + String(k).padStart(2, "0"));
assert(CORE.regionUnlocked("ash") === false, "ash stays locked (pilot)");

// battle formula (no DOM)
assert(CORE.battleDamage(1) === 1 && CORE.battleDamage(3) === 1 && CORE.battleDamage(4) === 2, "crit at combo 4");
assert(CORE.enemyAttackDamage(false) === 1 && CORE.enemyAttackDamage(true) === 2, "enemy bite");
const b = CORE.createBattle({ queueLen: 12, enemyMaxHp: 8, heroMaxHp: 5, region: "mist" });
assert(b.enemyMaxHp === 8 && b.heroHp === 5 && b.enemy.name && b.defendNext === false, "createBattle");
["mist", "stone", "tide", "ash", "archive", "throne", "camp"].forEach(function (r) {
  assert(CORE.enemyFor(r).skin === r, "skin " + r);
});

assert(lesson.includes("function showDefeat") && lesson.includes("祠未点亮"), "defeat copy");
const defeatSlice = lesson.slice(lesson.indexOf("function showDefeat"), lesson.indexOf("function campHrefSafe"));
assert(!defeatSlice.includes("markCleared"), "defeat does not clear shrine");

const lessonHtml = fs.readFileSync(path.join(root, "vocab-lesson.html"), "utf8");
assert(lessonHtml.includes("word-realm-core.js"), "lesson loads core");

const realmHtml = fs.readFileSync(path.join(root, "word-realm.html"), "utf8");
assert(realmHtml.includes("word-realm-core.js") && realmHtml.includes("word-realm.js"), "realm shell");

const zone = fs.readFileSync(path.join(root, "assets/js/zone.js"), "utf8");
assert(zone.includes("高中") || zone.includes("vocab-entry"), "homework bento");
assert(zone.includes("vocab.html?book=") && zone.includes("word-realm.html"), "dual entry intact");

const css = fs.readFileSync(path.join(root, "assets/css/word-realm.css"), "utf8");
assert(css.includes("wr-map-board--ash") && css.includes("wr-map-board--throne") && css.includes("wr-saga"), "map tones + saga css");
assert(css.includes("has-art") && css.includes("wr-map-art"), "map art css");
const vlCss = fs.readFileSync(path.join(root, "assets/css/vocab-lesson.css"), "utf8");
assert(vlCss.includes("vl-enemy--ash") && vlCss.includes("vl-enemy--throne"), "battle skins late");

const artDir = path.join(root, "assets/img/word-realm");
const artFiles = [
  "hero.png", "ella.png",
  "map-mist.png", "map-stone.png", "map-tide.png",
  "map-ash.png", "map-archive.png", "map-throne.png"
];
artFiles.forEach(function (f) {
  assert(fs.existsSync(path.join(artDir, f)), "art " + f);
});
assert(STORY.cast.hero.portrait && STORY.cast.ella.portrait, "cast portraits");
assert(STORY.regions.mist.mapImage && STORY.regions.throne.mapImage, "region mapImage");
assert(realmJs.includes("portraitHTML") && realmJs.includes("has-art") && realmJs.includes("wr-map-art"), "portrait + map art UI");

console.log("word-realm mix smoke ok · words", lex.words.length, "· shrines", lex.shrines.length, "· chapters", STORY.chapters.length, "· art", artFiles.length);
