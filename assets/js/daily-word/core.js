/* =========================================================================
   daily-word/core.js — 每日单词：存储、抽词、拼写、LIST 解析、API 助手
   ========================================================================= */
(function (global) {
  "use strict";

  var KEYS = {
    plan: "yysd:daily-word:plan",
    task: "yysd:daily-word:task",
    records: "yysd:daily-word:records",
    images: "yysd:daily-word:images",
    result: "yysd:daily-word:result",
    checkins: "yysd:daily-word:checkins"
  };

  var PRESETS = [10, 30, 50, 100, 200, 300];
  var DEFAULT_COUNT = 50;
  var COUNT_MIN = 10;
  var COUNT_MAX = 300;
  var COUNT_STEP = 5;

  // ponytail: tiny UK/US map — expand if students hit more variants
  var UK_US = {
    colour: "color", favor: "favour", honour: "honor", humour: "humor",
    labour: "labor", neighbour: "neighbor", behaviour: "behavior",
    centre: "center", metre: "meter", theatre: "theater",
    organise: "organize", realise: "realize", recognise: "recognize",
    analyse: "analyze", defence: "defense", licence: "license",
    travelling: "traveling", cancelled: "canceled"
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  function getPlan() {
    return readJson(KEYS.plan, null);
  }

  function savePlan(plan) {
    writeJson(KEYS.plan, plan);
  }

  function getTask() {
    return readJson(KEYS.task, null);
  }

  function saveTask(task) {
    writeJson(KEYS.task, task);
  }

  function clearTask() {
    try { localStorage.removeItem(KEYS.task); } catch (e) {}
  }

  // ponytail: date[] only — month calendar later if needed
  function getCheckins() {
    var arr = readJson(KEYS.checkins, []);
    return Array.isArray(arr) ? arr : [];
  }

  function markCheckin(date) {
    date = String(date || todayStr());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return getCheckins();
    var arr = getCheckins();
    if (arr.indexOf(date) < 0) arr.push(date);
    if (arr.length > 60) arr = arr.slice(-60);
    writeJson(KEYS.checkins, arr);
    return arr;
  }

  function getRecords() {
    return readJson(KEYS.records, {});
  }

  function saveRecords(recs) {
    writeJson(KEYS.records, recs || {});
  }

  function getImages() {
    return readJson(KEYS.images, {});
  }

  function saveImage(cacheKey, url) {
    var imgs = getImages();
    imgs[cacheKey] = absMediaUrl(url);
    writeJson(KEYS.images, imgs);
  }

  function imageKey(bookId, word) {
    return String(bookId || "") + ":" + String(word || "").toLowerCase();
  }

  function absMediaUrl(url) {
    if (!url) return "";
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    var A = global.YYSD_AUTH;
    var base = (A && A.API_BASE) || "";
    if (!base) return url;
    return String(base).replace(/\/$/, "") + (url.charAt(0) === "/" ? url : "/" + url);
  }

  function clampCount(n) {
    n = Math.round(Number(n) || DEFAULT_COUNT);
    if (n < COUNT_MIN) n = COUNT_MIN;
    if (n > COUNT_MAX) n = COUNT_MAX;
    n = Math.round(n / COUNT_STEP) * COUNT_STEP;
    if (n < COUNT_MIN) n = COUNT_MIN;
    return n;
  }

  function libraryUrl(file) {
    var base = location.pathname.replace(/\/[^/]*$/, "/");
    return base + "library/" + String(file || "").replace(/^\//, "");
  }

  // ponytail: trusted local LIST HTML only — same approach as vocab-lesson
  function parseWordData(html) {
    var m = html.match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
    if (!m) return [];
    try {
      var arr = Function('"use strict"; return (' + m[1] + ");")();
      if (!Array.isArray(arr)) return [];
      return arr.map(function (w) {
        var word = String(w.word || "").trim();
        var meaning = String(w.meaning || "").trim();
        if (!word || !meaning) return null;
        return {
          id: String(w.id != null ? w.id : word),
          word: word,
          meaning: meaning,
          ipa: String(w.ipa || "").trim(),
          acceptCN: Array.isArray(w.acceptCN) ? w.acceptCN : [],
          example: String(w.example || "").trim(),
          phrases: String(w.phrases || "").trim(),
          pos: String(w.pos || "").trim()
        };
      }).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function normalizeWord(s) {
    return String(s || "").toLowerCase().replace(/[^a-z']/g, "").trim();
  }

  function usVariant(s) {
    var n = normalizeWord(s);
    if (UK_US[n]) return UK_US[n];
    for (var k in UK_US) {
      if (UK_US[k] === n) return k;
    }
    return n;
  }

  /** @returns {{ ok: boolean, marks?: boolean[] }} */
  function spellCheck(input, target) {
    var a = normalizeWord(input);
    var b = normalizeWord(target);
    if (!a || !b) return { ok: false, marks: [] };
    if (a === b || a === usVariant(b) || usVariant(a) === b) return { ok: true };
    var marks = [];
    var max = Math.max(a.length, b.length);
    for (var i = 0; i < max; i++) {
      marks.push(a.charAt(i) === b.charAt(i));
    }
    return { ok: false, marks: marks };
  }

  // ponytail: same idea as wrong-words.meaningCorrect — accept partial / acceptCN
  function meaningCheck(input, wordObj) {
    var userCN = String(input || "").replace(/\s+/g, "");
    if (!userCN) return { ok: false };
    var accepts = [];
    var i;
    var list = (wordObj && wordObj.acceptCN) || [];
    for (i = 0; i < list.length; i++) {
      if (list[i]) accepts.push(String(list[i]).replace(/\s+/g, ""));
    }
    String((wordObj && wordObj.meaning) || "").split(/[；;，,、\/|]/).forEach(function (p) {
      p = String(p || "").replace(/\s+/g, "").replace(/（[^）]*）|\([^)]*\)/g, "");
      if (p) accepts.push(p);
    });
    for (i = 0; i < accepts.length; i++) {
      var a = accepts[i];
      if (!a) continue;
      if (userCN === a || userCN.indexOf(a) >= 0 || a.indexOf(userCN) >= 0) return { ok: true };
    }
    var meaningClean = String((wordObj && wordObj.meaning) || "").replace(/[；;，,、\s]/g, "");
    if (!meaningClean) return { ok: false };
    var head = meaningClean.substring(0, Math.min(2, meaningClean.length));
    if (userCN.length >= 2 && (userCN.indexOf(head) >= 0 || meaningClean.indexOf(userCN) >= 0)) {
      return { ok: true };
    }
    return { ok: false };
  }

  function lev(a, b) {
    a = String(a); b = String(b);
    var m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    var dp = [];
    var i, j;
    for (i = 0; i <= m; i++) {
      dp[i] = [i];
      for (j = 1; j <= n; j++) dp[i][j] = i === 0 ? j : 0;
    }
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }

  /** ASR heard vs target → pass/fail (lenient for STT) */
  function speakPass(heard, target) {
    var h = normalizeWord(heard);
    var t = normalizeWord(target);
    if (!h || !t) return false;
    if (h === t || h.indexOf(t) >= 0 || t.indexOf(h) >= 0) return true;
    if (h === usVariant(t) || usVariant(h) === t) return true;
    var maxDist = t.length <= 4 ? 1 : 2;
    return lev(h, t) <= maxDist;
  }

  function wordKey(bookId, word) {
    // keep digits/spaces for stable ids (normalizeWord strips them for ASR only)
    return String(bookId || "") + ":" + String(word || "").toLowerCase().trim();
  }

  function recordOf(recs, bookId, word) {
    return recs[wordKey(bookId, word)] || null;
  }

  /**
   * Fully random daily pick from pool. ~30% weak/review when available, rest new;
   * final study order is always shuffled (never LIST order).
   */
  function pickDaily(pool, bookId, count, recs) {
    count = clampCount(count);
    pool = pool || [];
    recs = recs || {};

    var newOnes = [];
    var review = [];
    pool.forEach(function (w) {
      var r = recordOf(recs, bookId, w.word);
      if (!r || r.status === "new") newOnes.push(w);
      else if (r.speakingWrong || r.spellingWrong || r.meaningWrong || r.status === "learning") review.push(w);
    });

    var picked = [];
    var used = {};
    function take(w) {
      var key = String(w.word || "").toLowerCase().trim();
      if (!key || used[key]) return false;
      used[key] = true;
      picked.push(w);
      return true;
    }

    var reviewShuf = shuffle(review);
    var reviewN = Math.min(reviewShuf.length, Math.round(count * 0.3));
    reviewShuf.slice(0, reviewN).forEach(take);
    shuffle(newOnes).forEach(function (w) {
      if (picked.length < count) take(w);
    });
    shuffle(pool).forEach(function (w) {
      if (picked.length < count) take(w);
    });
    return shuffle(picked).slice(0, count);
  }

  function upsertRecord(bookId, word, patch) {
    var recs = getRecords();
    var key = wordKey(bookId, word);
    var cur = recs[key] || {
      wordId: key,
      word: word,
      bookId: bookId,
      status: "new",
      correctCount: 0,
      wrongCount: 0,
      speakingWrong: false,
      spellingWrong: false,
      meaningWrong: false,
      lastReviewTime: 0
    };
    Object.keys(patch || {}).forEach(function (p) { cur[p] = patch[p]; });
    cur.lastReviewTime = Date.now();
    if (cur.speakingWrong || cur.spellingWrong || cur.meaningWrong) cur.status = "learning";
    else if (cur.correctCount >= 1 && !cur.speakingWrong && !cur.spellingWrong && !cur.meaningWrong) {
      cur.status = "learning";
    }
    recs[key] = cur;
    saveRecords(recs);
    return cur;
  }

  function apiBase() {
    var A = global.YYSD_AUTH;
    if (A && A.API_BASE) return A.API_BASE;
    return "";
  }

  function api(path, body) {
    var headers = { "Content-Type": "application/json" };
    var A = global.YYSD_AUTH;
    if (A && A.getToken) {
      var t = A.getToken();
      if (t) headers.Authorization = "Bearer " + t;
    }
    return fetch(apiBase() + path, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.text().then(function (text) {
        var d = null;
        try { d = text ? JSON.parse(text) : {}; } catch (e) {
          throw new Error("服务器返回异常（" + r.status + "）");
        }
        if (!r.ok) throw new Error((d && d.error) || "请求失败");
        return d;
      });
    });
  }

  function speakWord(text) {
    var WA = global.YYSD_WORD_AUDIO;
    if (WA && WA.speak) {
      WA.speak(text);
      return;
    }
    if (!global.speechSynthesis) return;
    try {
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB";
      u.rate = 0.9;
      global.speechSynthesis.speak(u);
    } catch (e) {}
  }

  var THEME_PREFIX = "theme:";

  function isThemeBook(bookKey) {
    return String(bookKey || "").indexOf(THEME_PREFIX) === 0;
  }

  function themeIdOf(bookKey) {
    return isThemeBook(bookKey) ? String(bookKey).slice(THEME_PREFIX.length) : "";
  }

  function fetchThemesCatalog() {
    return fetch(libraryUrl("study/vocab-themes/themes.json")).then(function (r) {
      if (!r.ok) throw new Error("分类词库目录加载失败");
      return r.json();
    });
  }

  function mapThemeWords(words, bookKey, themeId) {
    var seen = {};
    var out = [];
    (words || []).forEach(function (w) {
      var word = String(w.word || "").trim();
      var key = word.toLowerCase();
      if (!word || seen[key]) return;
      seen[key] = true;
      out.push({
        id: String(w.id != null ? w.id : word),
        word: word,
        meaning: String(w.meaning || "").trim(),
        ipa: String(w.ipa || "").trim(),
        acceptCN: Array.isArray(w.acceptCN) ? w.acceptCN : [],
        example: String(w.example || "").trim(),
        phrases: String(w.phrases || "").trim(),
        pos: String(w.pos || "").trim(),
        sourceId: "theme:" + themeId,
        bookId: bookKey
      });
    });
    return out;
  }

  function fetchThemePool(bookKey) {
    var themeId = themeIdOf(bookKey);
    if (!themeId) return Promise.reject(new Error("分类词库无效"));
    return fetchThemesCatalog().then(function (cat) {
      var t = null;
      var i;
      for (i = 0; i < (cat.themes || []).length; i++) {
        if (cat.themes[i].id === themeId) { t = cat.themes[i]; break; }
      }
      if (!t || !t.dataFile) throw new Error("分类词库不存在");
      var catLabel = "";
      for (i = 0; i < (cat.categories || []).length; i++) {
        if (cat.categories[i].id === t.category) {
          catLabel = cat.categories[i].label || "";
          break;
        }
      }
      return fetch(libraryUrl(t.dataFile)).then(function (r) {
        if (!r.ok) throw new Error("分类词库加载失败");
        return r.json();
      }).then(function (detail) {
        var pool = mapThemeWords((detail && detail.words) || [], bookKey, themeId)
          .filter(function (w) { return w.word; });
        if (!pool.length) throw new Error("分类词库暂无可用单词");
        return {
          book: {
            key: bookKey,
            label: t.title || themeId,
            tag: catLabel || "分类词库"
          },
          pool: pool,
          listCount: 1
        };
      });
    });
  }

  function fetchBookPool(bookKey, maxLists) {
    if (isThemeBook(bookKey)) return fetchThemePool(bookKey);
    var Y = global.YYSD;
    // 0 / null / undefined → whole book (needed for true random)
    return Y.load().then(function (items) {
      var stats = Y.vocabBookStats(items, bookKey);
      if (!stats || !stats.lists.length) throw new Error("词书为空或不存在");
      var lists = stats.lists;
      if (maxLists > 0) lists = lists.slice(0, maxLists);
      // ponytail: parallel fetch; ceiling = whole book (~40 LISTs)
      return Promise.all(lists.map(function (item) {
        return fetch(libraryUrl(item.file)).then(function (r) {
          if (!r.ok) return [];
          return r.text().then(function (html) {
            return parseWordData(html).map(function (w) {
              w.sourceId = item.id;
              w.bookId = bookKey;
              return w;
            });
          });
        }).catch(function () { return []; });
      })).then(function (chunks) {
        var seen = {};
        var out = [];
        chunks.forEach(function (arr) {
          (arr || []).forEach(function (w) {
            var k = String(w.word || "").toLowerCase().trim();
            if (!k || seen[k]) return;
            seen[k] = true;
            out.push(w);
          });
        });
        return { book: stats.book, pool: out, listCount: lists.length };
      });
    });
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function estimateMinutes(count) {
    // ~30s/word for 5 stages (incl. meaning)
    return Math.max(5, Math.round(clampCount(count) * 0.5));
  }

  var API = {
    KEYS: KEYS,
    PRESETS: PRESETS,
    DEFAULT_COUNT: DEFAULT_COUNT,
    COUNT_MIN: COUNT_MIN,
    COUNT_MAX: COUNT_MAX,
    COUNT_STEP: COUNT_STEP,
    esc: esc,
    getPlan: getPlan,
    savePlan: savePlan,
    getTask: getTask,
    saveTask: saveTask,
    clearTask: clearTask,
    getCheckins: getCheckins,
    markCheckin: markCheckin,
    getRecords: getRecords,
    saveRecords: saveRecords,
    getImages: getImages,
    saveImage: saveImage,
    imageKey: imageKey,
    absMediaUrl: absMediaUrl,
    clampCount: clampCount,
    libraryUrl: libraryUrl,
    parseWordData: parseWordData,
    spellCheck: spellCheck,
    meaningCheck: meaningCheck,
    speakPass: speakPass,
    pickDaily: pickDaily,
    upsertRecord: upsertRecord,
    api: api,
    speakWord: speakWord,
    fetchBookPool: fetchBookPool,
    fetchThemesCatalog: fetchThemesCatalog,
    isThemeBook: isThemeBook,
    THEME_PREFIX: THEME_PREFIX,
    todayStr: todayStr,
    estimateMinutes: estimateMinutes,
    normalizeWord: normalizeWord,
    wordKey: wordKey
  };

  global.YYSD_DAILY_WORD = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : global);
