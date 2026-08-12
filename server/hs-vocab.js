"use strict";

/**
 * High-school vocab dual-mode progress + mistakes (account-synced).
 * ponytail: append-only mistakes (manual remove only); custom batch locked until clear.
 */

var MIN_BATCH = 10;
var MAX_BATCH = 200;

function todayDate() {
  var d = new Date();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
}

function ensureSchema(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS hs_vocab_progress (" +
      "student_id INTEGER PRIMARY KEY," +
      "cursor_idx INTEGER NOT NULL DEFAULT 0," +
      "active_batch_id INTEGER," +
      "updated_at TEXT NOT NULL" +
    ");" +
    "CREATE TABLE IF NOT EXISTS hs_vocab_batches (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "student_id INTEGER NOT NULL," +
      "batch_date TEXT NOT NULL," +
      "start_idx INTEGER NOT NULL," +
      "count INTEGER NOT NULL," +
      "cleared INTEGER NOT NULL DEFAULT 0," +
      "created_at TEXT NOT NULL," +
      "cleared_at TEXT" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_hs_batches_stu ON hs_vocab_batches(student_id, id DESC);" +
    "CREATE TABLE IF NOT EXISTS hs_vocab_unit_clears (" +
      "student_id INTEGER NOT NULL," +
      "list_no INTEGER NOT NULL," +
      "cleared_at TEXT NOT NULL," +
      "PRIMARY KEY (student_id, list_no)" +
    ");" +
    "CREATE TABLE IF NOT EXISTS hs_vocab_mistakes (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "student_id INTEGER NOT NULL," +
      "mistake_date TEXT NOT NULL," +
      "source TEXT NOT NULL," +
      "word TEXT NOT NULL," +
      "ipa TEXT," +
      "meaning TEXT," +
      "word_json TEXT," +
      "user_answer TEXT," +
      "is_removed INTEGER NOT NULL DEFAULT 0," +
      "created_at TEXT NOT NULL" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_hs_mist_stu ON hs_vocab_mistakes(student_id, is_removed, mistake_date DESC);"
  );
}

function clampCount(n) {
  n = Number(n);
  if (!Number.isFinite(n)) return null;
  n = Math.floor(n);
  if (n < MIN_BATCH || n > MAX_BATCH) return null;
  return n;
}

function mountRoutes(app, opts) {
  var db = opts.db;
  var authMiddleware = opts.authMiddleware;
  ensureSchema(db);

  var stmts = {
    getProgress: db.prepare("SELECT * FROM hs_vocab_progress WHERE student_id = ?"),
    upsertProgress: db.prepare(
      "INSERT INTO hs_vocab_progress (student_id, cursor_idx, active_batch_id, updated_at) VALUES (?, ?, ?, ?) " +
      "ON CONFLICT(student_id) DO UPDATE SET cursor_idx = excluded.cursor_idx, active_batch_id = excluded.active_batch_id, updated_at = excluded.updated_at"
    ),
    insertBatch: db.prepare(
      "INSERT INTO hs_vocab_batches (student_id, batch_date, start_idx, count, cleared, created_at) VALUES (?, ?, ?, ?, 0, ?)"
    ),
    findBatch: db.prepare("SELECT * FROM hs_vocab_batches WHERE id = ? AND student_id = ?"),
    listBatches: db.prepare(
      "SELECT * FROM hs_vocab_batches WHERE student_id = ? ORDER BY id DESC LIMIT 100"
    ),
    clearBatch: db.prepare(
      "UPDATE hs_vocab_batches SET cleared = 1, cleared_at = ? WHERE id = ? AND student_id = ?"
    ),
    listUnitClears: db.prepare(
      "SELECT list_no, cleared_at FROM hs_vocab_unit_clears WHERE student_id = ?"
    ),
    upsertUnitClear: db.prepare(
      "INSERT INTO hs_vocab_unit_clears (student_id, list_no, cleared_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(student_id, list_no) DO UPDATE SET cleared_at = excluded.cleared_at"
    ),
    insertMistake: db.prepare(
      "INSERT INTO hs_vocab_mistakes (student_id, mistake_date, source, word, ipa, meaning, word_json, user_answer, is_removed, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)"
    ),
    listMistakes: db.prepare(
      "SELECT * FROM hs_vocab_mistakes WHERE student_id = ? AND is_removed = 0 ORDER BY id DESC"
    ),
    findMistake: db.prepare(
      "SELECT * FROM hs_vocab_mistakes WHERE id = ? AND student_id = ?"
    ),
    removeMistake: db.prepare(
      "UPDATE hs_vocab_mistakes SET is_removed = 1 WHERE id = ? AND student_id = ?"
    ),
    listMistakesByGroup: db.prepare(
      "SELECT * FROM hs_vocab_mistakes WHERE student_id = ? AND is_removed = 0 AND mistake_date = ? AND source = ? ORDER BY id ASC"
    )
  };

  function ensureProgress(studentId) {
    var row = stmts.getProgress.get(studentId);
    if (row) return row;
    var now = new Date().toISOString();
    stmts.upsertProgress.run(studentId, 0, null, now);
    return stmts.getProgress.get(studentId);
  }

  function activeBatch(studentId, prog) {
    if (!prog || !prog.active_batch_id) return null;
    var b = stmts.findBatch.get(prog.active_batch_id, studentId);
    if (!b || b.cleared) return null;
    return b;
  }

  function progressPayload(studentId) {
    var prog = ensureProgress(studentId);
    var batch = activeBatch(studentId, prog);
    var clears = stmts.listUnitClears.all(studentId);
    var clearMap = {};
    clears.forEach(function (c) { clearMap[c.list_no] = c.cleared_at; });
    return {
      ok: true,
      cursor_idx: prog.cursor_idx,
      active_batch: batch
        ? {
            id: batch.id,
            batch_date: batch.batch_date,
            start_idx: batch.start_idx,
            count: batch.count,
            cleared: !!batch.cleared
          }
        : null,
      batches: stmts.listBatches.all(studentId).map(function (b) {
        return {
          id: b.id,
          batch_date: b.batch_date,
          start_idx: b.start_idx,
          count: b.count,
          cleared: !!b.cleared,
          cleared_at: b.cleared_at
        };
      }),
      unit_clears: clearMap
    };
  }

  function insertMistakes(studentId, source, mistakes) {
    if (!Array.isArray(mistakes) || !mistakes.length) return 0;
    var now = new Date().toISOString();
    var date = todayDate();
    var n = 0;
    var tx = db.transaction(function (list) {
      list.forEach(function (m) {
        if (!m || !m.word) return;
        stmts.insertMistake.run(
          studentId,
          date,
          source,
          String(m.word),
          m.ipa || null,
          m.meaning || null,
          m.word_json ? JSON.stringify(m.word_json) : null,
          m.user_answer != null ? String(m.user_answer) : null,
          now
        );
        n++;
      });
    });
    tx(mistakes);
    return n;
  }

  app.get("/api/hs-vocab/status", authMiddleware, function (req, res) {
    res.json(progressPayload(req.user.sub));
  });

  // Start a new custom batch (blocked if uncleared active batch exists)
  app.post("/api/hs-vocab/custom/start", authMiddleware, function (req, res) {
    var count = clampCount(req.body && req.body.count);
    if (count == null) {
      return res.status(400).json({ error: "数量须在 " + MIN_BATCH + "–" + MAX_BATCH + " 之间" });
    }
    var bankTotal = Number(req.body && req.body.bank_total);
    if (!Number.isFinite(bankTotal) || bankTotal <= 0) {
      return res.status(400).json({ error: "缺少词库总量 bank_total" });
    }
    var prog = ensureProgress(req.user.sub);
    var cur = activeBatch(req.user.sub, prog);
    if (cur) {
      return res.status(409).json({
        error: "当前批次尚未通关，请先完成检测",
        active_batch: {
          id: cur.id,
          batch_date: cur.batch_date,
          start_idx: cur.start_idx,
          count: cur.count,
          cleared: false
        }
      });
    }
    if (prog.cursor_idx >= bankTotal) {
      return res.status(400).json({ error: "词库已学完" });
    }
    var start = prog.cursor_idx;
    var actual = Math.min(count, bankTotal - start);
    if (actual < 1) return res.status(400).json({ error: "没有可学的单词" });
    // ponytail: allow last slice < MIN_BATCH when bank remainder is small
    if (actual < MIN_BATCH && start + actual < bankTotal) {
      return res.status(400).json({ error: "数量须在 " + MIN_BATCH + "–" + MAX_BATCH + " 之间" });
    }
    var now = new Date().toISOString();
    var info = stmts.insertBatch.run(req.user.sub, todayDate(), start, actual, now);
    stmts.upsertProgress.run(req.user.sub, prog.cursor_idx, info.lastInsertRowid, now);
    res.json(progressPayload(req.user.sub));
  });

  // Finish custom quiz: pass → clear batch + advance cursor; fail → mistakes only
  app.post("/api/hs-vocab/custom/finish", authMiddleware, function (req, res) {
    var body = req.body || {};
    var batchId = Number(body.batch_id);
    var passed = !!body.passed;
    var batch = stmts.findBatch.get(batchId, req.user.sub);
    if (!batch) return res.status(404).json({ error: "批次不存在" });
    insertMistakes(req.user.sub, "custom", body.mistakes || []);
    if (!passed) {
      return res.json({ ok: true, passed: false, status: progressPayload(req.user.sub) });
    }
    if (batch.cleared) {
      return res.json({ ok: true, passed: true, status: progressPayload(req.user.sub) });
    }
    var now = new Date().toISOString();
    stmts.clearBatch.run(now, batchId, req.user.sub);
    var newCursor = batch.start_idx + batch.count;
    stmts.upsertProgress.run(req.user.sub, newCursor, null, now);
    res.json({ ok: true, passed: true, status: progressPayload(req.user.sub) });
  });

  app.post("/api/hs-vocab/unit/finish", authMiddleware, function (req, res) {
    var body = req.body || {};
    var listNo = Number(body.list_no);
    var passed = !!body.passed;
    if (!listNo || listNo < 1) return res.status(400).json({ error: "无效单元号" });
    insertMistakes(req.user.sub, "unit:" + listNo, body.mistakes || []);
    if (passed) {
      stmts.upsertUnitClear.run(req.user.sub, listNo, new Date().toISOString());
    }
    res.json({ ok: true, passed: passed, status: progressPayload(req.user.sub) });
  });

  app.get("/api/hs-vocab/mistakes", authMiddleware, function (req, res) {
    var rows = stmts.listMistakes.all(req.user.sub);
    var groups = {};
    rows.forEach(function (r) {
      var key = r.mistake_date + "|" + r.source;
      if (!groups[key]) {
        groups[key] = {
          key: key,
          mistake_date: r.mistake_date,
          source: r.source,
          label: formatGroupLabel(r.mistake_date, r.source),
          items: []
        };
      }
      var wj = null;
      try { wj = r.word_json ? JSON.parse(r.word_json) : null; } catch (e) {}
      groups[key].items.push({
        id: r.id,
        word: r.word,
        ipa: r.ipa,
        meaning: r.meaning,
        word_json: wj,
        user_answer: r.user_answer,
        created_at: r.created_at
      });
    });
    var list = Object.keys(groups).map(function (k) { return groups[k]; });
    list.sort(function (a, b) {
      if (a.mistake_date !== b.mistake_date) return a.mistake_date < b.mistake_date ? 1 : -1;
      return a.source < b.source ? -1 : 1;
    });
    res.json({ ok: true, groups: list, total: rows.length });
  });

  app.post("/api/hs-vocab/mistakes/remove", authMiddleware, function (req, res) {
    var id = Number(req.body && req.body.id);
    if (!id) return res.status(400).json({ error: "缺少错题 id" });
    var row = stmts.findMistake.get(id, req.user.sub);
    if (!row || row.is_removed) return res.status(404).json({ error: "错题不存在" });
    stmts.removeMistake.run(id, req.user.sub);
    res.json({ ok: true });
  });

  app.get("/api/hs-vocab/mistakes/group", authMiddleware, function (req, res) {
    var date = String(req.query.date || "");
    var source = String(req.query.source || "");
    if (!date || !source) return res.status(400).json({ error: "需要 date 与 source" });
    var rows = stmts.listMistakesByGroup.all(req.user.sub, date, source);
    res.json({
      ok: true,
      label: formatGroupLabel(date, source),
      items: rows.map(function (r) {
        var wj = null;
        try { wj = r.word_json ? JSON.parse(r.word_json) : null; } catch (e) {}
        return {
          id: r.id,
          word: r.word,
          ipa: r.ipa,
          meaning: r.meaning,
          word_json: wj
        };
      })
    });
  });

  // wrong-book retest finish: mistakes stay (append-only); optional new mistakes from retest
  app.post("/api/hs-vocab/mistakes/retest-finish", authMiddleware, function (req, res) {
    var body = req.body || {};
    var source = String(body.source || "wrong-retest");
    insertMistakes(req.user.sub, source, body.mistakes || []);
    res.json({ ok: true });
  });
}

function formatGroupLabel(date, source) {
  var parts = String(date).split("-");
  var nice = parts.length === 3
    ? (Number(parts[1]) + "月" + Number(parts[2]) + "日")
    : date;
  if (source === "custom") return nice + "·自定义";
  var m = String(source).match(/^unit:(\d+)$/);
  if (m) return nice + "·单元" + m[1];
  if (source.indexOf("wrong") === 0) return nice + "·错题再测";
  return nice + "·" + source;
}

function selfCheck() {
  // ponytail: pure rule checks, no DB
  console.assert(clampCount(9) === null);
  console.assert(clampCount(10) === 10);
  console.assert(clampCount(200) === 200);
  console.assert(clampCount(201) === null);
  console.assert(formatGroupLabel("2026-01-02", "custom") === "1月2日·自定义");
  console.assert(formatGroupLabel("2026-01-03", "unit:1") === "1月3日·单元1");
  return true;
}

module.exports = {
  MIN_BATCH: MIN_BATCH,
  MAX_BATCH: MAX_BATCH,
  clampCount: clampCount,
  formatGroupLabel: formatGroupLabel,
  ensureSchema: ensureSchema,
  mountRoutes: mountRoutes,
  selfCheck: selfCheck
};

if (require.main === module) {
  selfCheck();
  console.log("hs-vocab self-check ok");
}
