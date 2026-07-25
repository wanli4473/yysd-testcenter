/* =========================================================================
   word-realm-core.js — 混合词库加载、祠进度、训练营抽词（与作业 results 隔离）
   ========================================================================= */
window.YYSD_WORD_REALM = (function () {
  "use strict";
  var PROGRESS_KEY = "yysd:word-realm-progress";
  var LEXICON_URL = "library/practice/word-realm/lexicon.json";
  var cache = null;

  function emptyProgress() {
    return { cleared: {}, chests: {}, dreams: {}, pendingDream: "" };
  }

  function loadProgress() {
    try {
      var s = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
      if (!s || typeof s !== "object") return emptyProgress();
      if (!s.cleared || typeof s.cleared !== "object") s.cleared = {};
      if (!s.chests || typeof s.chests !== "object") s.chests = {};
      if (!s.dreams || typeof s.dreams !== "object") s.dreams = {};
      if (typeof s.pendingDream !== "string") s.pendingDream = "";
      return s;
    } catch (e) {
      return emptyProgress();
    }
  }

  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
  }

  function isCleared(id) {
    return !!loadProgress().cleared[id];
  }

  function markCleared(id) {
    var p = loadProgress();
    if (p.cleared[id]) return false;
    p.cleared[id] = new Date().toISOString();
    saveProgress(p);
    maybeQueueDream();
    return true;
  }

  function maybeQueueDream() {
    var STORY = window.YYSD_WORD_REALM_STORY;
    if (!STORY || !STORY.dreamAt) return;
    var n = clearedCount();
    var dream = STORY.dreamAt(n);
    if (!dream) return;
    var p = loadProgress();
    if (p.dreams[dream.id]) return;
    p.pendingDream = dream.id;
    saveProgress(p);
  }

  function pendingDream() {
    return loadProgress().pendingDream || "";
  }

  function dreamSeen(id) {
    return !!loadProgress().dreams[id];
  }

  function consumeDream(id) {
    var p = loadProgress();
    if (!id) id = p.pendingDream;
    if (!id) return null;
    var STORY = window.YYSD_WORD_REALM_STORY;
    var dream = null;
    if (STORY && STORY.dreams) {
      for (var i = 0; i < STORY.dreams.length; i++) {
        if (STORY.dreams[i].id === id) { dream = STORY.dreams[i]; break; }
      }
    }
    p.dreams[id] = new Date().toISOString();
    if (p.pendingDream === id) p.pendingDream = "";
    saveProgress(p);
    return dream;
  }

  function peekDream(id) {
    var STORY = window.YYSD_WORD_REALM_STORY;
    if (!STORY || !STORY.dreams) return null;
    for (var i = 0; i < STORY.dreams.length; i++) {
      if (STORY.dreams[i].id === id) return STORY.dreams[i];
    }
    return null;
  }

  function clearedCount() {
    return Object.keys(loadProgress().cleared).length;
  }

  function hasChest(chestId) {
    return !!loadProgress().chests[chestId];
  }

  function claimChest(chestId, xp) {
    var p = loadProgress();
    if (p.chests[chestId]) return null;
    p.chests[chestId] = new Date().toISOString();
    saveProgress(p);
    if (window.YYSD_VOCAB_RPG) {
      return window.YYSD_VOCAB_RPG.addXp(xp == null ? 5 : xp, "realm-chest");
    }
    return { gained: xp == null ? 5 : xp };
  }

  function libraryUrl(rel) {
    var base = location.pathname.replace(/\/[^/]*$/, "/");
    return base + String(rel || "").replace(/^\//, "");
  }

  function loadLexicon() {
    if (cache) return Promise.resolve(cache);
    return fetch(libraryUrl(LEXICON_URL)).then(function (r) {
      if (!r.ok) throw new Error("词库加载失败 HTTP " + r.status);
      return r.json();
    }).then(function (data) {
      cache = data;
      return data;
    });
  }

  function wordMap(lex) {
    var m = Object.create(null);
    (lex.words || []).forEach(function (w) {
      m[String(w.word).toLowerCase()] = w;
    });
    return m;
  }

  function shrineById(lex, id) {
    var list = lex.shrines || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function resolveWords(lex, names) {
    var map = wordMap(lex);
    return (names || []).map(function (n) {
      return map[String(n).toLowerCase()] || null;
    }).filter(Boolean);
  }

  function shrineWords(lex, shrineId) {
    var s = shrineById(lex, shrineId);
    if (!s) return [];
    return resolveWords(lex, s.words);
  }

  /** Path nodes for mainline: shrines + chest every 3. */
  function pathNodes(lex) {
    var prog = loadProgress();
    var shrines = (lex.shrines || []).slice().sort(function (a, b) {
      return a.index - b.index;
    });
    var nodes = [];
    var currentSet = false;
    shrines.forEach(function (s, i) {
      var done = !!prog.cleared[s.id];
      var unlocked = i === 0 || !!prog.cleared[shrines[i - 1].id];
      var state;
      if (done) state = "done";
      else if (unlocked && !currentSet) { state = "current"; currentSet = true; }
      else state = "locked";
      nodes.push({ shrine: s, state: state, isChest: false });
      if ((i + 1) % 3 === 0) {
        var ck = "chest-" + s.id;
        var open = done;
        var claimed = !!prog.chests[ck];
        nodes.push({
          shrine: s,
          chestId: ck,
          state: !open ? "chest-locked" : (claimed ? "claimed" : "chest"),
          isChest: true
        });
      }
    });
    if (!currentSet) {
      for (var r = nodes.length - 1; r >= 0; r--) {
        if (!nodes[r].isChest) { nodes[r].state = "current"; break; }
      }
    }
    return nodes;
  }

  function randomCampWords(lex, n, opts) {
    opts = opts || {};
    var tiers = opts.tiers;
    var pool = (lex.words || []).slice();
    if (tiers && tiers.length) {
      var allow = {};
      tiers.forEach(function (t) { allow[t] = true; });
      var filtered = pool.filter(function (w) { return allow[w.tier]; });
      if (filtered.length >= (n || 10)) pool = filtered;
    }
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, Math.min(n || 10, pool.length));
  }

  function weeklyTheme() {
    var STORY = window.YYSD_WORD_REALM_STORY;
    var RPG = window.YYSD_VOCAB_RPG;
    if (!STORY || !STORY.weeklyTheme) return null;
    var wid = RPG && RPG.weekId ? RPG.weekId() : "W0";
    return STORY.weeklyTheme(wid);
  }

  function regionRange(region) {
    var STORY = window.YYSD_WORD_REALM_STORY;
    var reg = STORY && STORY.regions && STORY.regions[region];
    if (reg && reg.range && reg.range.length === 2) {
      return { start: reg.range[0], end: reg.range[1] };
    }
    if (region === "stone") return { start: 9, end: 16 };
    if (region === "tide") return { start: 17, end: 24 };
    if (region === "ash") return { start: 25, end: 32 };
    if (region === "archive") return { start: 33, end: 40 };
    if (region === "throne") return { start: 41, end: 48 };
    return { start: 1, end: 8 };
  }

  function regionUnlocked(regionId) {
    var STORY = window.YYSD_WORD_REALM_STORY;
    if (STORY && typeof STORY.regionUnlocked === "function") {
      return STORY.regionUnlocked(regionId, isCleared);
    }
    return true;
  }

  function shrineTotal() {
    return 48;
  }

  /** 连对 ≥4 暴击 2，否则普攻 1（难度上调） */
  function battleDamage(comboAfterHit) {
    return comboAfterHit >= 4 ? 2 : 1;
  }

  function enemyFor(regionOrCamp) {
    var STORY = window.YYSD_WORD_REALM_STORY;
    var key = regionOrCamp === "camp" ? "camp" : (regionOrCamp || "mist");
    var enemies = (STORY && STORY.enemies) || {};
    return enemies[key] || enemies.mist || {
      id: "fog-tongue", name: "雾舌", title: "噬词者", skin: "mist", glyph: "〰", intro: ""
    };
  }

  /**
   * 开战状态：敌人 HP 可由 opts.enemyMaxHp 指定；勇者 HP = heartsMax。
   * 答对扣敌；答错/超时扣己；敌 HP≤0 击破；己 HP≤0 战败不推进祠。
   */
  function createBattle(opts) {
    opts = opts || {};
    var enemyMax = Math.max(1, Math.floor(opts.enemyMaxHp || opts.queueLen || 1));
    var heroMax = Math.max(1, Math.floor(opts.heroMaxHp || 5));
    var enemy = enemyFor(opts.region || (opts.camp ? "camp" : "mist"));
    return {
      enemy: enemy,
      enemyMaxHp: enemyMax,
      enemyHp: enemyMax,
      heroMaxHp: heroMax,
      heroHp: heroMax,
      lastHit: 0,
      crit: false,
      won: false,
      lost: false,
      defendNext: false,
      itemUsed: false
    };
  }

  /** Boss 噬咬更重 */
  function enemyAttackDamage(isBoss) {
    return isBoss ? 2 : 1;
  }

  return {
    PROGRESS_KEY: PROGRESS_KEY,
    LEXICON_URL: LEXICON_URL,
    loadProgress: loadProgress,
    isCleared: isCleared,
    markCleared: markCleared,
    clearedCount: clearedCount,
    hasChest: hasChest,
    claimChest: claimChest,
    loadLexicon: loadLexicon,
    shrineById: shrineById,
    shrineWords: shrineWords,
    pathNodes: pathNodes,
    randomCampWords: randomCampWords,
    weeklyTheme: weeklyTheme,
    regionRange: regionRange,
    regionUnlocked: regionUnlocked,
    shrineTotal: shrineTotal,
    battleDamage: battleDamage,
    enemyAttackDamage: enemyAttackDamage,
    enemyFor: enemyFor,
    createBattle: createBattle,
    pendingDream: pendingDream,
    dreamSeen: dreamSeen,
    consumeDream: consumeDream,
    peekDream: peekDream,
    maybeQueueDream: maybeQueueDream
  };
})();
