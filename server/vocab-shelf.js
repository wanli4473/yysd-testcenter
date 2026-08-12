"use strict";

/**
 * Unified vocab catalog + student bookshelf.
 * Main books from library/manifest.json; theme books from themes.json (50-word lists).
 * ponytail: remove book clears learn progress only; quiz/mistakes stay for later phases.
 */

var fs = require("fs");
var path = require("path");

var THEME_PREFIX = "theme:";
var THEME_CHUNK = 50;
var QUIZ_RATIO = 0.6;
var QUIZ_MAX_LIVES = 5;
var QUIZ_TIME_SEC = 20;

function todayDate() {
  var d = new Date();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
}

function quizSampleSize(total) {
  total = Math.floor(Number(total) || 0);
  if (total < 1) return 0;
  return Math.max(1, Math.min(total, Math.round(total * QUIZ_RATIO)));
}

function shuffleInPlace(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

function sampleWords(words, ratio) {
  var pool = (words || []).slice();
  var n = quizSampleSize(pool.length);
  if (!n) return [];
  shuffleInPlace(pool);
  return pool.slice(0, n);
}

var MAIN_BOOKS = [
  { id: "gaozhong", label: "高中词汇", tag: "雅思基础", subjects: ["vocab"] },
  { id: "cet4", label: "四级词汇", tag: "CET-4", subjects: ["vocab-cet4"] },
  {
    id: "special",
    label: "雅思专项词汇",
    tag: "专题",
    subjects: ["vocab-special-listening", "vocab-special-reading", "vocab-special-writing"]
  }
];

function themeBookId(themeId) {
  return THEME_PREFIX + String(themeId || "");
}

function isThemeBookId(bookId) {
  return String(bookId || "").indexOf(THEME_PREFIX) === 0;
}

function themeIdOf(bookId) {
  return isThemeBookId(bookId) ? String(bookId).slice(THEME_PREFIX.length) : "";
}

function listNoFromItem(item) {
  var t = String((item && item.title) || "");
  var m = t.match(/LIST\s*0*(\d+)/i);
  if (m) return Number(m[1]);
  m = t.match(/单元\s*0*(\d+)/);
  if (m) return Number(m[1]);
  m = String((item && item.id) || "").match(/(?:writing|listening|reading)-vocab-0*(\d+)/i);
  if (m) return Number(m[1]);
  m = String((item && item.file) || "").match(/(?:LIST|list|vocab-)0*(\d+)/i);
  return m ? Number(m[1]) : 0;
}

function listLabel(item, bookId) {
  var n = listNoFromItem(item);
  var s = (item && item.subject) || "";
  if (!n) return (item && item.title) || item.id;
  if (bookId === "gaozhong" || s === "vocab") return "List " + n;
  if (bookId === "cet4" || s === "vocab-cet4") return "List " + n;
  if (s === "vocab-special-listening") return "听力 List " + n;
  if (s === "vocab-special-reading") return "阅读 List " + n;
  if (s === "vocab-special-writing") return "写作 List " + n;
  return "List " + n;
}

/** Split flat word count into List 1..N of THEME_CHUNK (last may be shorter). */
function chunkLists(wordCount, chunk) {
  chunk = chunk || THEME_CHUNK;
  var total = Math.max(0, Math.floor(Number(wordCount) || 0));
  if (total < 1) return [];
  var lists = [];
  var i = 0;
  while (i < total) {
    var n = lists.length + 1;
    var count = Math.min(chunk, total - i);
    lists.push({
      id: String(n),
      label: "List " + n,
      wordCount: count,
      offset: i
    });
    i += count;
  }
  return lists;
}

function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, "utf8"));
}

function buildCatalog(repoRoot) {
  var manifestPath = path.join(repoRoot, "library", "manifest.json");
  var themesPath = path.join(repoRoot, "library", "study", "vocab-themes", "themes.json");
  var manifest = readJson(manifestPath);
  var themesCat = readJson(themesPath);
  var items = manifest.items || [];
  var books = [];

  MAIN_BOOKS.forEach(function (def) {
    var lists = items.filter(function (it) {
      return def.subjects.indexOf(it.subject) >= 0;
    });
    lists.sort(function (a, b) {
      var ai = def.subjects.indexOf(a.subject);
      var bi = def.subjects.indexOf(b.subject);
      if (ai !== bi) return ai - bi;
      var d = listNoFromItem(a) - listNoFromItem(b);
      return d || String(a.id).localeCompare(String(b.id), "en");
    });
    books.push({
      id: def.id,
      label: def.label,
      tag: def.tag,
      kind: "main",
      wordCount: null,
      listCount: lists.length,
      lists: lists.map(function (it) {
        return {
          id: String(it.id),
          label: listLabel(it, def.id),
          listNo: listNoFromItem(it),
          subject: it.subject,
          file: it.file,
          wordCount: null
        };
      })
    });
  });

  (themesCat.themes || []).forEach(function (t) {
    if (!t || !t.id) return;
    var wc = Number(t.count) || 0;
    var lists = chunkLists(wc, THEME_CHUNK);
    books.push({
      id: themeBookId(t.id),
      label: t.title || t.id,
      tag: t.category || "theme",
      kind: "theme",
      themeId: t.id,
      dataFile: t.dataFile || null,
      wordCount: wc,
      listCount: lists.length,
      lists: lists
    });
  });

  var byId = {};
  books.forEach(function (b) { byId[b.id] = b; });
  return { books: books, byId: byId };
}

// ponytail: prod layout is /opt/yysd/server + /opt/yysd/web/library (not ../library)
function resolveContentRoot(explicit) {
  var candidates = [];
  if (explicit) candidates.push(explicit);
  candidates.push(
    path.join(__dirname, ".."),
    path.join(__dirname, "..", "web"),
    path.join(__dirname, "..", "repo"),
    process.env.YYSD_WEB_ROOT || "",
    process.env.REPO_ROOT || ""
  );
  for (var i = 0; i < candidates.length; i++) {
    var root = candidates[i];
    if (!root) continue;
    if (fs.existsSync(path.join(root, "library", "manifest.json"))) return root;
  }
  return explicit || path.join(__dirname, "..");
}

function createCatalogLoader(repoRoot) {
  var cache = { sig: "", data: null };
  function sig() {
    var m = path.join(repoRoot, "library", "manifest.json");
    var t = path.join(repoRoot, "library", "study", "vocab-themes", "themes.json");
    var ms = fs.statSync(m).mtimeMs;
    var ts = fs.statSync(t).mtimeMs;
    return ms + ":" + ts;
  }
  return function load() {
    var s = sig();
    if (!cache.data || cache.sig !== s) {
      cache.data = buildCatalog(repoRoot);
      cache.sig = s;
    }
    return cache.data;
  };
}

function ensureSchema(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS vocab_bookshelf (" +
      "student_id INTEGER NOT NULL," +
      "book_id TEXT NOT NULL," +
      "added_at TEXT NOT NULL," +
      "PRIMARY KEY (student_id, book_id)" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_vocab_shelf_stu ON vocab_bookshelf(student_id);" +
    "CREATE TABLE IF NOT EXISTS vocab_learn_progress (" +
      "student_id INTEGER NOT NULL," +
      "book_id TEXT NOT NULL," +
      "list_id TEXT NOT NULL," +
      "word_idx INTEGER NOT NULL DEFAULT 0," +
      "done INTEGER NOT NULL DEFAULT 0," +
      "updated_at TEXT NOT NULL," +
      "PRIMARY KEY (student_id, book_id, list_id)" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_vocab_learn_stu_book ON vocab_learn_progress(student_id, book_id);" +
    "CREATE TABLE IF NOT EXISTS vocab_quiz_sessions (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "student_id INTEGER NOT NULL," +
      "book_id TEXT NOT NULL," +
      "list_ids TEXT NOT NULL," +
      "list_labels TEXT," +
      "quiz_date TEXT NOT NULL," +
      "total INTEGER NOT NULL DEFAULT 0," +
      "correct INTEGER NOT NULL DEFAULT 0," +
      "wrong_count INTEGER NOT NULL DEFAULT 0," +
      "passed INTEGER NOT NULL DEFAULT 0," +
      "is_removed INTEGER NOT NULL DEFAULT 0," +
      "created_at TEXT NOT NULL" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_vocab_quiz_stu ON vocab_quiz_sessions(student_id, quiz_date DESC, id DESC);" +
    "CREATE TABLE IF NOT EXISTS vocab_quiz_mistakes (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "session_id INTEGER NOT NULL," +
      "student_id INTEGER NOT NULL," +
      "book_id TEXT NOT NULL," +
      "list_id TEXT," +
      "word TEXT NOT NULL," +
      "ipa TEXT," +
      "meaning TEXT," +
      "word_json TEXT," +
      "user_answer TEXT," +
      "is_removed INTEGER NOT NULL DEFAULT 0," +
      "created_at TEXT NOT NULL" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_vocab_quiz_mist_sess ON vocab_quiz_mistakes(session_id, is_removed);" +
    "CREATE INDEX IF NOT EXISTS idx_vocab_quiz_mist_stu ON vocab_quiz_mistakes(student_id, is_removed, created_at DESC);" +
    "CREATE TABLE IF NOT EXISTS vocab_migrate_flags (" +
      "student_id INTEGER NOT NULL," +
      "flag TEXT NOT NULL," +
      "done_at TEXT NOT NULL," +
      "PRIMARY KEY (student_id, flag)" +
    ");"
  );
  // ponytail: older DBs created sessions without is_removed
  try {
    db.exec("ALTER TABLE vocab_quiz_sessions ADD COLUMN is_removed INTEGER NOT NULL DEFAULT 0");
  } catch (e) {}
}

function formatQuizDate(date) {
  var parts = String(date || "").split("-");
  if (parts.length !== 3) return String(date || "");
  return Number(parts[1]) + "月" + Number(parts[2]) + "日";
}

function legacyHsSourceLabel(source) {
  if (source === "custom") return "自定义";
  var m = String(source || "").match(/^unit:(\d+)$/);
  if (m) return "单元" + m[1];
  if (String(source).indexOf("wrong") === 0) return "错题再测";
  return String(source || "旧检测");
}

function sessionTitle(date, bookLabel, listLabels) {
  var lists = (listLabels || []).filter(Boolean);
  var listPart = lists.length ? lists.join("、") : "若干 List";
  return formatQuizDate(date) + " · " + (bookLabel || "词书") + " · " + listPart;
}

function parseWordData(html) {
  var m = String(html || "").match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return [];
  try {
    var arr = Function('"use strict"; return (' + m[1] + ");")();
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function normalizeWord(w) {
  if (!w) return null;
  var word = String(w.word || w.en || "").trim();
  var meaning = String(w.meaning || "").trim();
  if (!word || !meaning) return null;
  var ex = String(w.example || "");
  var em = ex.match(/^(.+?)[（(](.+)[）)]\s*$/);
  var coll = w.collocations;
  if (typeof coll === "string") {
    coll = coll.split(/[,，]/).map(function (s) {
      s = s.trim();
      var cm = s.match(/^(.+?)[（(](.+?)[）)]$/);
      return cm ? { phrase: cm[1].trim(), meaning: cm[2].trim() } : { phrase: s, meaning: "" };
    }).filter(function (c) { return c.phrase; });
  }
  if (!Array.isArray(coll)) coll = [];
  return {
    word: word,
    ipa: String(w.ipa || w.phonetic || "").trim(),
    pos: String(w.pos || "").trim(),
    meaning: meaning,
    exampleEn: w.exampleEn || (em ? em[1].trim() : ex),
    exampleZh: w.exampleZh || (em ? em[2].trim() : ""),
    collocations: coll,
    root: w.root || "",
    synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
    antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
    examTag: w.examTag || null
  };
}

var fileWordCache = Object.create(null);

function loadWordsFromHtml(absPath) {
  var st = fs.statSync(absPath);
  var hit = fileWordCache[absPath];
  if (hit && hit.mtime === st.mtimeMs) return hit.words;
  var html = fs.readFileSync(absPath, "utf8");
  var words = parseWordData(html).map(normalizeWord).filter(Boolean);
  fileWordCache[absPath] = { mtime: st.mtimeMs, words: words };
  return words;
}

function loadWordsFromThemeJson(absPath, offset, count) {
  var st = fs.statSync(absPath);
  var hit = fileWordCache[absPath];
  var all;
  if (hit && hit.mtime === st.mtimeMs) {
    all = hit.words;
  } else {
    var data = readJson(absPath);
    all = (data.words || []).map(normalizeWord).filter(Boolean);
    fileWordCache[absPath] = { mtime: st.mtimeMs, words: all };
  }
  offset = Math.max(0, Math.floor(Number(offset) || 0));
  count = Math.max(0, Math.floor(Number(count) || 0));
  return all.slice(offset, offset + count);
}

function resolveLesson(repoRoot, book, listId) {
  if (!book || !listId) return null;
  var list = null;
  for (var i = 0; i < (book.lists || []).length; i++) {
    if (String(book.lists[i].id) === String(listId)) {
      list = book.lists[i];
      break;
    }
  }
  if (!list) return null;
  var words;
  if (book.kind === "theme") {
    if (!book.dataFile) return null;
    var themePath = path.join(repoRoot, "library", book.dataFile);
    if (!fs.existsSync(themePath)) return null;
    words = loadWordsFromThemeJson(themePath, list.offset, list.wordCount);
  } else {
    if (!list.file) return null;
    var htmlPath = path.join(repoRoot, "library", list.file);
    if (!fs.existsSync(htmlPath)) return null;
    words = loadWordsFromHtml(htmlPath);
  }
  return { list: list, words: words };
}

function mountRoutes(app, opts) {
  var db = opts.db;
  var authMiddleware = opts.authMiddleware;
  var repoRoot = resolveContentRoot(opts.repoRoot);
  ensureSchema(db);
  var loadCatalog = createCatalogLoader(repoRoot);

  var stmts = {
    listShelf: db.prepare(
      "SELECT book_id, added_at FROM vocab_bookshelf WHERE student_id = ? ORDER BY added_at DESC"
    ),
    findShelf: db.prepare(
      "SELECT book_id, added_at FROM vocab_bookshelf WHERE student_id = ? AND book_id = ?"
    ),
    addShelf: db.prepare(
      "INSERT OR IGNORE INTO vocab_bookshelf (student_id, book_id, added_at) VALUES (?, ?, ?)"
    ),
    removeShelf: db.prepare(
      "DELETE FROM vocab_bookshelf WHERE student_id = ? AND book_id = ?"
    ),
    clearLearn: db.prepare(
      "DELETE FROM vocab_learn_progress WHERE student_id = ? AND book_id = ?"
    ),
    listProgress: db.prepare(
      "SELECT list_id, word_idx, done, updated_at FROM vocab_learn_progress WHERE student_id = ? AND book_id = ?"
    ),
    upsertProgress: db.prepare(
      "INSERT INTO vocab_learn_progress (student_id, book_id, list_id, word_idx, done, updated_at) " +
      "VALUES (?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(student_id, book_id, list_id) DO UPDATE SET " +
      "word_idx = excluded.word_idx, done = excluded.done, updated_at = excluded.updated_at"
    ),
    insertSession: db.prepare(
      "INSERT INTO vocab_quiz_sessions " +
      "(student_id, book_id, list_ids, list_labels, quiz_date, total, correct, wrong_count, passed, is_removed, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)"
    ),
    insertQuizMistake: db.prepare(
      "INSERT INTO vocab_quiz_mistakes " +
      "(session_id, student_id, book_id, list_id, word, ipa, meaning, word_json, user_answer, is_removed, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)"
    ),
    listSessions: db.prepare(
      "SELECT * FROM vocab_quiz_sessions WHERE student_id = ? AND is_removed = 0 " +
      "ORDER BY quiz_date DESC, id DESC"
    ),
    findSession: db.prepare(
      "SELECT * FROM vocab_quiz_sessions WHERE id = ? AND student_id = ? AND is_removed = 0"
    ),
    removeSession: db.prepare(
      "UPDATE vocab_quiz_sessions SET is_removed = 1 WHERE id = ? AND student_id = ?"
    ),
    softRemoveSessionMistakes: db.prepare(
      "UPDATE vocab_quiz_mistakes SET is_removed = 1 WHERE session_id = ? AND student_id = ? AND is_removed = 0"
    ),
    listSessionMistakes: db.prepare(
      "SELECT * FROM vocab_quiz_mistakes WHERE session_id = ? AND student_id = ? AND is_removed = 0 ORDER BY id ASC"
    ),
    countSessionMistakes: db.prepare(
      "SELECT COUNT(*) AS n FROM vocab_quiz_mistakes WHERE session_id = ? AND is_removed = 0"
    ),
    updateSessionWrongCount: db.prepare(
      "UPDATE vocab_quiz_sessions SET wrong_count = ? WHERE id = ? AND student_id = ?"
    ),
    getMigrateFlag: db.prepare(
      "SELECT flag FROM vocab_migrate_flags WHERE student_id = ? AND flag = ?"
    ),
    setMigrateFlag: db.prepare(
      "INSERT OR IGNORE INTO vocab_migrate_flags (student_id, flag, done_at) VALUES (?, ?, ?)"
    )
  };

  function parseJsonArr(raw) {
    try {
      var v = JSON.parse(raw || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function bookLabelOf(cat, bookId) {
    var b = cat.byId[bookId];
    if (b) return b.label;
    if (bookId === "gaozhong") return "高中词汇";
    if (bookId === "cet4") return "四级词汇";
    if (bookId === "special") return "雅思专项词汇";
    return bookId;
  }

  function migrateHsMistakes(studentId) {
    if (stmts.getMigrateFlag.get(studentId, "hs_mistakes")) return;
    var has;
    try {
      has = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='hs_vocab_mistakes'"
      ).get();
    } catch (e) {
      has = null;
    }
    if (!has) {
      stmts.setMigrateFlag.run(studentId, "hs_mistakes", new Date().toISOString());
      return;
    }
    var rows = db.prepare(
      "SELECT * FROM hs_vocab_mistakes WHERE student_id = ? AND is_removed = 0 ORDER BY id ASC"
    ).all(studentId);
    var groups = {};
    rows.forEach(function (r) {
      var key = r.mistake_date + "|" + r.source;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    var now = new Date().toISOString();
    var tx = db.transaction(function () {
      Object.keys(groups).forEach(function (key) {
        var items = groups[key];
        if (!items.length) return;
        var date = items[0].mistake_date;
        var source = items[0].source;
        var label = legacyHsSourceLabel(source);
        var info = stmts.insertSession.run(
          studentId,
          "gaozhong",
          JSON.stringify(["legacy:" + source]),
          JSON.stringify([label]),
          date,
          items.length,
          0,
          items.length,
          0,
          items[0].created_at || now
        );
        var sid = info.lastInsertRowid;
        items.forEach(function (m) {
          stmts.insertQuizMistake.run(
            sid,
            studentId,
            "gaozhong",
            "legacy:" + source,
            String(m.word),
            m.ipa || null,
            m.meaning || null,
            m.word_json || null,
            m.user_answer != null ? String(m.user_answer) : null,
            m.created_at || now
          );
        });
      });
      stmts.setMigrateFlag.run(studentId, "hs_mistakes", now);
    });
    tx();
  }

  function bookSummary(book) {
    if (!book) return null;
    return {
      id: book.id,
      label: book.label,
      tag: book.tag,
      kind: book.kind,
      wordCount: book.wordCount,
      listCount: book.listCount
    };
  }

  function progressMap(studentId, bookId) {
    var map = {};
    stmts.listProgress.all(studentId, bookId).forEach(function (r) {
      map[r.list_id] = {
        wordIdx: r.word_idx,
        done: !!r.done,
        updatedAt: r.updated_at
      };
    });
    return map;
  }

  app.get("/api/vocab-shelf/catalog", authMiddleware, function (req, res) {
    var cat = loadCatalog();
    res.json({
      ok: true,
      themeChunk: THEME_CHUNK,
      books: cat.books.map(function (b) {
        return {
          id: b.id,
          label: b.label,
          tag: b.tag,
          kind: b.kind,
          wordCount: b.wordCount,
          listCount: b.listCount,
          lists: b.lists
        };
      })
    });
  });

  app.get("/api/vocab-shelf/bookshelf", authMiddleware, function (req, res) {
    var cat = loadCatalog();
    var rows = stmts.listShelf.all(req.user.sub);
    res.json({
      ok: true,
      books: rows.map(function (r) {
        var meta = bookSummary(cat.byId[r.book_id]);
        var prog = progressMap(req.user.sub, r.book_id);
        var doneLists = 0;
        Object.keys(prog).forEach(function (k) { if (prog[k].done) doneLists++; });
        return {
          bookId: r.book_id,
          addedAt: r.added_at,
          book: meta || { id: r.book_id, label: r.book_id, kind: "unknown", listCount: 0 },
          doneLists: doneLists
        };
      })
    });
  });

  app.post("/api/vocab-shelf/add", authMiddleware, function (req, res) {
    var bookId = String((req.body && req.body.bookId) || "").trim();
    if (!bookId) return res.status(400).json({ error: "缺少 bookId" });
    var cat = loadCatalog();
    if (!cat.byId[bookId]) return res.status(404).json({ error: "词书不存在" });
    var now = new Date().toISOString();
    stmts.addShelf.run(req.user.sub, bookId, now);
    var row = stmts.findShelf.get(req.user.sub, bookId);
    res.json({
      ok: true,
      bookId: bookId,
      addedAt: row && row.added_at,
      book: bookSummary(cat.byId[bookId])
    });
  });

  app.post("/api/vocab-shelf/remove", authMiddleware, function (req, res) {
    var bookId = String((req.body && req.body.bookId) || "").trim();
    if (!bookId) return res.status(400).json({ error: "缺少 bookId" });
    var row = stmts.findShelf.get(req.user.sub, bookId);
    if (!row) return res.status(404).json({ error: "书架上没有这本词书" });
    var tx = db.transaction(function () {
      stmts.removeShelf.run(req.user.sub, bookId);
      stmts.clearLearn.run(req.user.sub, bookId);
    });
    tx();
    res.json({ ok: true, bookId: bookId, clearedLearnProgress: true });
  });

  // Book detail: lists + per-list learn progress (must be on shelf)
  app.get("/api/vocab-shelf/book", authMiddleware, function (req, res) {
    var bookId = String(req.query.bookId || "").trim();
    if (!bookId) return res.status(400).json({ error: "缺少 bookId" });
    if (!stmts.findShelf.get(req.user.sub, bookId)) {
      return res.status(403).json({ error: "请先将词书加入书架" });
    }
    var cat = loadCatalog();
    var book = cat.byId[bookId];
    if (!book) return res.status(404).json({ error: "词书不存在" });
    var prog = progressMap(req.user.sub, bookId);
    res.json({
      ok: true,
      book: bookSummary(book),
      lists: book.lists.map(function (l) {
        var p = prog[l.id] || { wordIdx: 0, done: false };
        return {
          id: l.id,
          label: l.label,
          wordCount: l.wordCount,
          wordIdx: p.wordIdx || 0,
          done: !!p.done
        };
      })
    });
  });

  app.get("/api/vocab-shelf/lesson", authMiddleware, function (req, res) {
    var bookId = String(req.query.bookId || "").trim();
    var listId = String(req.query.listId || "").trim();
    if (!bookId || !listId) return res.status(400).json({ error: "缺少 bookId 或 listId" });
    if (!stmts.findShelf.get(req.user.sub, bookId)) {
      return res.status(403).json({ error: "请先将词书加入书架" });
    }
    var cat = loadCatalog();
    var book = cat.byId[bookId];
    if (!book) return res.status(404).json({ error: "词书不存在" });
    var lesson = resolveLesson(repoRoot, book, listId);
    if (!lesson) return res.status(404).json({ error: "List 不存在或词表缺失" });
    var prog = progressMap(req.user.sub, bookId)[listId] || { wordIdx: 0, done: false };
    var idx = Math.max(0, Math.min(Number(prog.wordIdx) || 0, Math.max(0, lesson.words.length - 1)));
    res.json({
      ok: true,
      book: bookSummary(book),
      list: { id: lesson.list.id, label: lesson.list.label, wordCount: lesson.words.length },
      progress: { wordIdx: idx, done: !!prog.done },
      words: lesson.words
    });
  });

  app.post("/api/vocab-shelf/progress", authMiddleware, function (req, res) {
    var body = req.body || {};
    var bookId = String(body.bookId || "").trim();
    var listId = String(body.listId || "").trim();
    var wordIdx = Math.max(0, Math.floor(Number(body.wordIdx) || 0));
    var done = body.done ? 1 : 0;
    if (!bookId || !listId) return res.status(400).json({ error: "缺少 bookId 或 listId" });
    if (!stmts.findShelf.get(req.user.sub, bookId)) {
      return res.status(403).json({ error: "请先将词书加入书架" });
    }
    var cat = loadCatalog();
    var book = cat.byId[bookId];
    if (!book) return res.status(404).json({ error: "词书不存在" });
    var found = false;
    for (var i = 0; i < book.lists.length; i++) {
      if (String(book.lists[i].id) === listId) { found = true; break; }
    }
    if (!found) return res.status(404).json({ error: "List 不存在" });
    var now = new Date().toISOString();
    stmts.upsertProgress.run(req.user.sub, bookId, listId, wordIdx, done, now);
    res.json({ ok: true, bookId: bookId, listId: listId, wordIdx: wordIdx, done: !!done });
  });

  function parseListIds(raw) {
    if (Array.isArray(raw)) {
      return raw.map(function (x) { return String(x || "").trim(); }).filter(Boolean);
    }
    return String(raw || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function buildPool(book, listIds) {
    var seen = Object.create(null);
    var words = [];
    var labels = [];
    listIds.forEach(function (lid) {
      var lesson = resolveLesson(repoRoot, book, lid);
      if (!lesson) return;
      labels.push(lesson.list.label || lid);
      lesson.words.forEach(function (w) {
        var key = String(w.word || "").toLowerCase();
        if (!key || seen[key]) return;
        seen[key] = true;
        words.push(Object.assign({}, w, { listId: lid }));
      });
    });
    return { words: words, labels: labels };
  }

  // Merged word pool for selected lists (60% random sample)
  app.get("/api/vocab-shelf/quiz-pool", authMiddleware, function (req, res) {
    var bookId = String(req.query.bookId || "").trim();
    var listIds = parseListIds(req.query.listIds);
    if (!bookId || !listIds.length) return res.status(400).json({ error: "缺少 bookId 或 listIds" });
    if (!stmts.findShelf.get(req.user.sub, bookId)) {
      return res.status(403).json({ error: "请先将词书加入书架" });
    }
    var cat = loadCatalog();
    var book = cat.byId[bookId];
    if (!book) return res.status(404).json({ error: "词书不存在" });
    var known = {};
    book.lists.forEach(function (l) { known[l.id] = true; });
    for (var i = 0; i < listIds.length; i++) {
      if (!known[listIds[i]]) return res.status(404).json({ error: "List 不存在: " + listIds[i] });
    }
    var pool = buildPool(book, listIds);
    if (!pool.words.length) return res.status(400).json({ error: "所选 List 没有可测单词" });
    var sampled = sampleWords(pool.words, QUIZ_RATIO);
    res.json({
      ok: true,
      book: bookSummary(book),
      listIds: listIds,
      listLabels: pool.labels,
      poolTotal: pool.words.length,
      quizCount: sampled.length,
      maxLives: QUIZ_MAX_LIVES,
      timeLimitSec: QUIZ_TIME_SEC,
      words: sampled
    });
  });

  app.post("/api/vocab-shelf/quiz/finish", authMiddleware, function (req, res) {
    var body = req.body || {};
    var bookId = String(body.bookId || "").trim();
    var listIds = parseListIds(body.listIds);
    var listLabels = Array.isArray(body.listLabels)
      ? body.listLabels.map(function (x) { return String(x || ""); })
      : [];
    var total = Math.max(0, Math.floor(Number(body.total) || 0));
    var correct = Math.max(0, Math.floor(Number(body.correct) || 0));
    var wrongCount = Math.max(0, Math.floor(Number(body.wrong) || 0));
    var passed = body.passed ? 1 : 0;
    var mistakes = Array.isArray(body.mistakes) ? body.mistakes : [];
    if (!bookId || !listIds.length) return res.status(400).json({ error: "缺少 bookId 或 listIds" });
    if (!stmts.findShelf.get(req.user.sub, bookId)) {
      return res.status(403).json({ error: "请先将词书加入书架" });
    }
    var cat = loadCatalog();
    if (!cat.byId[bookId]) return res.status(404).json({ error: "词书不存在" });
    var now = new Date().toISOString();
    var date = todayDate();
    var sid;
    var tx = db.transaction(function () {
      var info = stmts.insertSession.run(
        req.user.sub,
        bookId,
        JSON.stringify(listIds),
        JSON.stringify(listLabels),
        date,
        total,
        correct,
        wrongCount,
        passed,
        now
      );
      sid = info.lastInsertRowid;
      mistakes.forEach(function (m) {
        if (!m || !m.word) return;
        stmts.insertQuizMistake.run(
          sid,
          req.user.sub,
          bookId,
          m.listId != null ? String(m.listId) : null,
          String(m.word),
          m.ipa || null,
          m.meaning || null,
          m.word_json ? JSON.stringify(m.word_json) : null,
          m.userAnswer != null ? String(m.userAnswer) : (m.user_answer != null ? String(m.user_answer) : null),
          now
        );
      });
    });
    tx();
    res.json({
      ok: true,
      sessionId: sid,
      quizDate: date,
      mistakeCount: mistakes.filter(function (m) { return m && m.word; }).length
    });
  });

  function serializeSession(row, cat, mistakeCount) {
    var listIds = parseJsonArr(row.list_ids);
    var listLabels = parseJsonArr(row.list_labels);
    var bookLabel = bookLabelOf(cat, row.book_id);
    return {
      id: row.id,
      bookId: row.book_id,
      bookLabel: bookLabel,
      listIds: listIds,
      listLabels: listLabels,
      quizDate: row.quiz_date,
      title: sessionTitle(row.quiz_date, bookLabel, listLabels),
      total: row.total,
      correct: row.correct,
      wrongCount: mistakeCount != null ? mistakeCount : row.wrong_count,
      passed: !!row.passed,
      createdAt: row.created_at
    };
  }

  app.get("/api/vocab-shelf/wrongbook", authMiddleware, function (req, res) {
    migrateHsMistakes(req.user.sub);
    var cat = loadCatalog();
    var rows = stmts.listSessions.all(req.user.sub);
    var sessions = rows.map(function (r) {
      var n = stmts.countSessionMistakes.get(r.id).n;
      return serializeSession(r, cat, n);
    });
    var totalMistakes = sessions.reduce(function (s, x) { return s + (x.wrongCount || 0); }, 0);
    res.json({ ok: true, sessions: sessions, totalMistakes: totalMistakes });
  });

  app.get("/api/vocab-shelf/wrongbook/session", authMiddleware, function (req, res) {
    migrateHsMistakes(req.user.sub);
    var id = Number(req.query.id || 0);
    if (!id) return res.status(400).json({ error: "缺少 session id" });
    var row = stmts.findSession.get(id, req.user.sub);
    if (!row) return res.status(404).json({ error: "记录不存在" });
    var cat = loadCatalog();
    var mistakes = stmts.listSessionMistakes.all(id, req.user.sub).map(function (m) {
      var wj = null;
      try { wj = m.word_json ? JSON.parse(m.word_json) : null; } catch (e) {}
      return {
        id: m.id,
        word: m.word,
        ipa: m.ipa,
        meaning: m.meaning,
        listId: m.list_id,
        userAnswer: m.user_answer,
        word_json: wj
      };
    });
    res.json({
      ok: true,
      session: serializeSession(row, cat, mistakes.length),
      mistakes: mistakes,
      words: mistakes.map(function (m) {
        var base = m.word_json && typeof m.word_json === "object" ? m.word_json : {};
        return {
          word: m.word,
          ipa: m.ipa || base.ipa || "",
          pos: base.pos || "",
          meaning: m.meaning || base.meaning || "",
          listId: m.listId,
          exampleEn: base.exampleEn || "",
          exampleZh: base.exampleZh || "",
          collocations: base.collocations || [],
          root: base.root || "",
          synonyms: base.synonyms || [],
          antonyms: base.antonyms || [],
          examTag: base.examTag || null
        };
      }).filter(function (w) { return w.word && w.meaning; })
    });
  });

  app.post("/api/vocab-shelf/wrongbook/session/remove", authMiddleware, function (req, res) {
    var id = Number(req.body && req.body.sessionId);
    if (!id) return res.status(400).json({ error: "缺少 sessionId" });
    var row = stmts.findSession.get(id, req.user.sub);
    if (!row) return res.status(404).json({ error: "记录不存在" });
    var tx = db.transaction(function () {
      stmts.removeSession.run(id, req.user.sub);
      stmts.softRemoveSessionMistakes.run(id, req.user.sub);
    });
    tx();
    res.json({ ok: true, sessionId: id });
  });

  // Retest finish: replace this session's active mistake list (keep session row)
  app.post("/api/vocab-shelf/wrongbook/retest-finish", authMiddleware, function (req, res) {
    var body = req.body || {};
    var id = Number(body.sessionId);
    var mistakes = Array.isArray(body.mistakes) ? body.mistakes : [];
    if (!id) return res.status(400).json({ error: "缺少 sessionId" });
    var row = stmts.findSession.get(id, req.user.sub);
    if (!row) return res.status(404).json({ error: "记录不存在" });
    var now = new Date().toISOString();
    var kept = 0;
    var tx = db.transaction(function () {
      stmts.softRemoveSessionMistakes.run(id, req.user.sub);
      mistakes.forEach(function (m) {
        if (!m || !m.word) return;
        kept++;
        stmts.insertQuizMistake.run(
          id,
          req.user.sub,
          row.book_id,
          m.listId != null ? String(m.listId) : null,
          String(m.word),
          m.ipa || null,
          m.meaning || null,
          m.word_json ? JSON.stringify(m.word_json) : null,
          m.userAnswer != null ? String(m.userAnswer) : (m.user_answer != null ? String(m.user_answer) : null),
          now
        );
      });
      stmts.updateSessionWrongCount.run(kept, id, req.user.sub);
    });
    tx();
    res.json({ ok: true, sessionId: id, mistakeCount: kept });
  });

  // One-shot import of localStorage wrong-words (cet4/special/etc.)
  app.post("/api/vocab-shelf/wrongbook/import-local", authMiddleware, function (req, res) {
    if (stmts.getMigrateFlag.get(req.user.sub, "local_wrong")) {
      return res.json({ ok: true, imported: 0, skipped: true });
    }
    var books = Array.isArray(req.body && req.body.books) ? req.body.books : [];
    var now = new Date().toISOString();
    var date = todayDate();
    var imported = 0;
    var tx = db.transaction(function () {
      books.forEach(function (b) {
        if (!b || !b.bookId || !Array.isArray(b.words) || !b.words.length) return;
        var bookId = String(b.bookId);
        var words = b.words.filter(function (w) { return w && w.word; });
        if (!words.length) return;
        var info = stmts.insertSession.run(
          req.user.sub,
          bookId,
          JSON.stringify(["legacy:local"]),
          JSON.stringify(["本机旧错题"]),
          date,
          words.length,
          0,
          words.length,
          0,
          now
        );
        var sid = info.lastInsertRowid;
        words.forEach(function (m) {
          imported++;
          stmts.insertQuizMistake.run(
            sid,
            req.user.sub,
            bookId,
            "legacy:local",
            String(m.word),
            m.ipa || null,
            m.meaning || null,
            null,
            null,
            now
          );
        });
      });
      stmts.setMigrateFlag.run(req.user.sub, "local_wrong", now);
    });
    tx();
    res.json({ ok: true, imported: imported });
  });
}

function selfCheck() {
  var lists = chunkLists(120, 50);
  if (lists.length !== 3) throw new Error("chunkLists length");
  if (lists[0].wordCount !== 50 || lists[0].offset !== 0) throw new Error("chunk 0");
  if (lists[1].wordCount !== 50 || lists[1].offset !== 50) throw new Error("chunk 1");
  if (lists[2].wordCount !== 20 || lists[2].offset !== 100) throw new Error("chunk 2");
  if (chunkLists(50, 50).length !== 1) throw new Error("exact chunk");
  if (chunkLists(0, 50).length !== 0) throw new Error("empty");
  if (themeBookId("toeic") !== "theme:toeic") throw new Error("theme id");
  if (!isThemeBookId("theme:toeic") || isThemeBookId("cet4")) throw new Error("isTheme");
  if (themeIdOf("theme:toeic") !== "toeic") throw new Error("themeIdOf");
  if (quizSampleSize(10) !== 6) throw new Error("60% of 10");
  if (quizSampleSize(1) !== 1) throw new Error("min 1");
  if (sampleWords([{ word: "a" }, { word: "b" }, { word: "c" }, { word: "d" }, { word: "e" }], 0.6).length !== 3) {
    throw new Error("sample 5→3");
  }
  return true;
}

module.exports = {
  THEME_PREFIX: THEME_PREFIX,
  THEME_CHUNK: THEME_CHUNK,
  QUIZ_RATIO: QUIZ_RATIO,
  themeBookId: themeBookId,
  isThemeBookId: isThemeBookId,
  themeIdOf: themeIdOf,
  chunkLists: chunkLists,
  quizSampleSize: quizSampleSize,
  sampleWords: sampleWords,
  formatQuizDate: formatQuizDate,
  sessionTitle: sessionTitle,
  legacyHsSourceLabel: legacyHsSourceLabel,
  buildCatalog: buildCatalog,
  resolveLesson: resolveLesson,
  normalizeWord: normalizeWord,
  ensureSchema: ensureSchema,
  mountRoutes: mountRoutes,
  selfCheck: selfCheck
};

if (require.main === module) {
  selfCheck();
  var root = resolveContentRoot();
  var cat = buildCatalog(root);
  if (cat.books.length < 4) throw new Error("catalog too small");
  if (!cat.byId.gaozhong || cat.byId.gaozhong.listCount < 1) throw new Error("gaozhong lists");
  if (!cat.byId["theme:toeic"]) throw new Error("missing theme:toeic");
  var toeic = cat.byId["theme:toeic"];
  var expect = Math.ceil((toeic.wordCount || 0) / THEME_CHUNK);
  if (toeic.listCount !== expect) throw new Error("toeic listCount");
  var gz = resolveLesson(root, cat.byId.gaozhong, cat.byId.gaozhong.lists[0].id);
  if (!gz || !gz.words.length) throw new Error("gaozhong lesson empty");
  var tl = resolveLesson(root, toeic, "1");
  if (!tl || tl.words.length !== 50) throw new Error("theme list1 size");
  console.log("vocab-shelf self-check ok · books=" + cat.books.length);
}
