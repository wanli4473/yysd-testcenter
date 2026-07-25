#!/usr/bin/env node
/**
 * Build mixed Word-Realm lexicon from all homework vocab LIST HTML + hard-extra.
 * Output: library/practice/word-realm/lexicon.json
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "library/practice/word-realm");
const outFile = path.join(outDir, "lexicon.json");
const hardFile = path.join(outDir, "hard-extra.json");

const TIER = {
  vocab: 1,
  "vocab-cet4": 2,
  "vocab-special-listening": 3,
  "vocab-special-reading": 3,
  "vocab-special-writing": 3
};

const REGION_OF = (i) => {
  if (i <= 8) return "mist";
  if (i <= 16) return "stone";
  if (i <= 24) return "tide";
  if (i <= 32) return "ash";
  if (i <= 40) return "archive";
  return "throne";
};
const SHRINE_COUNT = 48;
const WORDS_PER_SHRINE = 8;

function walkHtml(dir, acc) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkHtml(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
}

function parseWordData(html) {
  const m = html.match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return [];
  try {
    const arr = Function('"use strict"; return (' + m[1] + ");")();
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function subjectFromPath(file) {
  const rel = path.relative(path.join(root, "library/study"), file).replace(/\\/g, "/");
  if (rel.startsWith("vocab-cet4/")) return "vocab-cet4";
  if (rel.startsWith("vocab-special-listening/")) return "vocab-special-listening";
  if (rel.startsWith("vocab-special-reading/")) return "vocab-special-reading";
  if (rel.startsWith("vocab-special-writing/")) return "vocab-special-writing";
  if (rel.startsWith("vocab/")) return "vocab";
  return "";
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleSeeded(arr, seed) {
  const rnd = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function weightsForShrine(n) {
  // 六章难度：前易后难，终章偏学术/高难
  if (n <= 8) return { 1: 0.55, 2: 0.35, 3: 0.08, 4: 0.02 };
  if (n <= 16) return { 1: 0.3, 2: 0.4, 3: 0.22, 4: 0.08 };
  if (n <= 24) return { 1: 0.15, 2: 0.3, 3: 0.35, 4: 0.2 };
  if (n <= 32) return { 1: 0.1, 2: 0.25, 3: 0.35, 4: 0.3 };
  if (n <= 40) return { 1: 0.06, 2: 0.2, 3: 0.34, 4: 0.4 };
  return { 1: 0.04, 2: 0.16, 3: 0.3, 4: 0.5 };
}

function pickTier(weights, rnd) {
  let r = rnd();
  for (const t of [1, 2, 3, 4]) {
    r -= weights[t] || 0;
    if (r <= 0) return t;
  }
  return 2;
}

function main() {
  const files = [];
  walkHtml(path.join(root, "library/study/vocab"), files);
  walkHtml(path.join(root, "library/study/vocab-cet4"), files);
  walkHtml(path.join(root, "library/study/vocab-special-listening"), files);
  walkHtml(path.join(root, "library/study/vocab-special-reading"), files);
  walkHtml(path.join(root, "library/study/vocab-special-writing"), files);

  const byKey = new Map();
  let parsedFiles = 0;
  for (const file of files) {
    const subj = subjectFromPath(file);
    if (!subj) continue;
    const tier = TIER[subj] || 2;
    const words = parseWordData(fs.readFileSync(file, "utf8"));
    if (!words.length) continue;
    parsedFiles++;
    for (const w of words) {
      const word = String(w.word || "").trim();
      const meaning = String(w.meaning || "").trim();
      if (!word || !meaning) continue;
      const key = word.toLowerCase();
      const prev = byKey.get(key);
      if (prev) {
        // keep harder tier / richer fields
        if (tier > prev.tier) prev.tier = tier;
        if (!prev.ipa && w.ipa) prev.ipa = String(w.ipa).trim();
        continue;
      }
      byKey.set(key, {
        word,
        meaning,
        ipa: String(w.ipa || "").trim(),
        pos: String(w.pos || "").trim(),
        acceptCN: Array.isArray(w.acceptCN) ? w.acceptCN.slice(0, 8) : [],
        example: String(w.example || "").trim(),
        tier,
        source: subj
      });
    }
  }

  const hard = JSON.parse(fs.readFileSync(hardFile, "utf8"));
  for (const w of hard) {
    const word = String(w.word || "").trim();
    const meaning = String(w.meaning || "").trim();
    if (!word || !meaning) continue;
    const key = word.toLowerCase();
    const prev = byKey.get(key);
    if (prev) {
      prev.tier = 4;
      prev.source = "hard-extra";
      if (!prev.ipa && w.ipa) prev.ipa = String(w.ipa).trim();
      continue;
    }
    byKey.set(key, {
      word,
      meaning,
      ipa: String(w.ipa || "").trim(),
      pos: String(w.pos || "").trim(),
      acceptCN: [],
      example: "",
      tier: 4,
      source: "hard-extra"
    });
  }

  const words = Array.from(byKey.values()).sort((a, b) =>
    a.word.localeCompare(b.word, "en")
  );
  const byTier = { 1: [], 2: [], 3: [], 4: [] };
  words.forEach((w, i) => {
    w.i = i;
    byTier[w.tier].push(w);
  });

  const used = new Set();
  const shrines = [];
  for (let n = 1; n <= SHRINE_COUNT; n++) {
    const rnd = mulberry32(0xc0ffee ^ (n * 9973));
    const weights = weightsForShrine(n);
    const picked = [];
    let guard = 0;
    while (picked.length < WORDS_PER_SHRINE && guard < 400) {
      guard++;
      const tier = pickTier(weights, rnd);
      const pool = byTier[tier].length ? byTier[tier] : words;
      const cand = pool[Math.floor(rnd() * pool.length)];
      const k = cand.word.toLowerCase();
      if (used.has(k) && used.size < words.length - 20) continue;
      used.add(k);
      picked.push(cand.word);
    }
    // top up if short
    if (picked.length < WORDS_PER_SHRINE) {
      const rest = shuffleSeeded(words.map((w) => w.word), n + 42);
      for (const w of rest) {
        if (picked.length >= WORDS_PER_SHRINE) break;
        if (!picked.includes(w)) picked.push(w);
      }
    }
    const id = "shrine-" + String(n).padStart(2, "0");
    shrines.push({
      id,
      index: n,
      region: REGION_OF(n),
      words: picked
    });
  }

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    stats: {
      files: parsedFiles,
      total: words.length,
      byTier: {
        1: byTier[1].length,
        2: byTier[2].length,
        3: byTier[3].length,
        4: byTier[4].length
      }
    },
    words,
    shrines
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload));
  console.log(
    "lexicon ok · words", words.length,
    "· files", parsedFiles,
    "· tier4", byTier[4].length,
    "· shrines", shrines.length,
    "→", path.relative(root, outFile)
  );
}

main();
