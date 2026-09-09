#!/usr/bin/env node
/** Smoke check for jingting lyric player. Exit 1 on failure. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

const data = JSON.parse(fs.readFileSync(
  path.join(root, "library/practice/jingting/data/cam21-t1-p1.json"), "utf8"));
assert(data.sentences.length === 70, "t1p1 70 sentences");
assert(data.sentences[0].start > 100, "preamble offset");
assert(data.sentences.every(s => s.zh && s.en && s.end > s.start), "zh/en/timing");
assert(fs.existsSync(path.join(root, data.audioUrl)), "audio file");

const man = JSON.parse(fs.readFileSync(path.join(root, "library/manifest.json"), "utf8"));
const items = man.items || man.exams;
const jt = items.filter(i => i.subject === "jingting" && i.directHref);
assert(jt.filter(i => i.directHref && i.id.startsWith("cam21-")).length === 16, "16 cam21");
assert(jt.filter(i => i.directHref && i.id.startsWith("cam20-")).length === 16, "16 cam20");

const cam20 = JSON.parse(fs.readFileSync(
  path.join(root, "library/practice/jingting/data/cam20-t1-p1.json"), "utf8"));
assert(cam20.sentences.length >= 50, "cam20 t1p1 sentences");
assert(cam20.sentences.every(s => s.zh && s.en && s.end > s.start), "cam20 zh/en/timing");
assert(fs.existsSync(path.join(root, cam20.audioUrl)), "cam20 audio");

const js = fs.readFileSync(path.join(root, "assets/js/jingting-player.js"), "utf8");
assert(js.includes("/api/jingting/gloss"), "gloss API");
assert(js.includes("jt-w"), "LightPeek spans");
assert(js.includes("ArrowLeft") && js.includes("Space"), "hotkeys");
assert(!js.includes("/api/jingting/shadow"), "no shadow in player");

const html = fs.readFileSync(path.join(root, "jingting-player.html"), "utf8");
assert(html.includes("全文精听") && html.includes("逐句精听"), "modes UI");
assert(!html.includes("AI 跟读"), "no shadow tab");

const cfg = fs.readFileSync(path.join(root, "assets/js/config.js"), "utf8");
assert(/JINGTING_OPEN\s*=\s*true/.test(cfg), "student entrance open");
assert(cfg.includes("开始精听 ›"), "jingting vol card CTA");
assert(cfg.includes("zone.html?zone=mock&s=jingting&vol="), "jingting vol card href");

function indexAtTime(t) {
  const sents = data.sentences; let best = 0;
  for (let i = 0; i < sents.length; i++) {
    if (t >= sents[i].start - 0.05) best = i;
    if (t < sents[i].end) return i;
  }
  return best;
}
assert(indexAtTime(118.5) === 0 && indexAtTime(120.5) === 1, "indexAtTime");

console.log("jingting smoke ok");
