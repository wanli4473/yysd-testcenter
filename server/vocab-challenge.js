"use strict";

/**
 * Vocab challenge (闯关) — schema + draw + engine + HTTP API.
 */

var MAX_NEW_WRONG = 5;
var PARDON_STREAK = 5;
var STUBBORN_MAKEUP_FAILS = 3;
var PILOT_BOOK_ID = "gaozhong";
var MS_PER_DAY = 86400000;

/** Retest draw size by List number (1-based). */
function retestQuota(listNo) {
  listNo = Math.floor(Number(listNo) || 0);
  if (listNo < 1) return 0;
  if (listNo <= 10) return 10;
  if (listNo <= 20) return 20;
  if (listNo <= 30) return 30;
  return 40;
}

/**
 * Days since last retest answer. null/invalid date → null (caller treats as oldest).
 */
function daysSinceReview(lastReviewDate, now) {
  if (lastReviewDate == null || lastReviewDate === "") return null;
  var t = Date.parse(String(lastReviewDate));
  if (isNaN(t)) return null;
  var n = now instanceof Date ? now.getTime() : Date.parse(now);
  if (isNaN(n)) n = Date.now();
  return Math.max(0, Math.floor((n - t) / MS_PER_DAY));
}

/**
 * Composite score after priority-1 fill (spec Q26).
 * daysSinceReview: null last_review_date → treat as very large (oldest).
 */
function drawScore(daysSinceReviewVal, failCount, stubborn) {
  var days = daysSinceReviewVal == null ? 1e9 : Math.max(0, Number(daysSinceReviewVal) || 0);
  var fails = Math.max(0, Math.floor(Number(failCount) || 0));
  var mult = stubborn ? 2 : 1;
  return days * 1 + fails * 10 * mult;
}

function isPendingUncorrected(row) {
  return !!(row && (row.pending_uncorrected === 1 || row.pending_uncorrected === true));
}

function isActivePoolRow(row) {
  if (!row || !row.word) return false;
  var st = row.status == null || row.status === "" ? "active" : String(row.status);
  return st === "active";
}

/** Higher score first; tie → word asc (stable, deterministic). */
function compareByDrawScore(a, b, now) {
  var sa = drawScore(daysSinceReview(a.last_review_date, now), a.fail_count, a.stubborn);
  var sb = drawScore(daysSinceReview(b.last_review_date, now), b.fail_count, b.stubborn);
  if (sb !== sa) return sb - sa;
  return String(a.word).localeCompare(String(b.word), "en");
}

/**
 * Pick up to retestQuota(listNo) active pool rows.
 * 1) pending_uncorrected first (sorted by composite score)
 * 2) remaining by composite score desc
 * Fewer than quota → return all; empty → [].
 */
function selectDrawWords(rows, listNo, now) {
  now = now instanceof Date ? now : now ? new Date(now) : new Date();
  var quota = retestQuota(listNo);
  if (quota < 1) return [];

  var active = (rows || []).filter(isActivePoolRow);
  var p1 = [];
  var rest = [];
  for (var i = 0; i < active.length; i++) {
    if (isPendingUncorrected(active[i])) p1.push(active[i]);
    else rest.push(active[i]);
  }
  p1.sort(function (a, b) { return compareByDrawScore(a, b, now); });
  rest.sort(function (a, b) { return compareByDrawScore(a, b, now); });

  var merged = p1.concat(rest);
  if (merged.length <= quota) return merged;
  return merged.slice(0, quota);
}

/** Load active draw-pool rows for selectDrawWords. */
function loadActivePool(db, studentId, bookId) {
  return db
    .prepare(
      "SELECT * FROM vocab_challenge_draw_pool " +
        "WHERE student_id = ? AND book_id = ? AND status = 'active'"
    )
    .all(studentId, bookId);
}

function selectDrawWordsFromDb(db, studentId, bookId, listNo, now) {
  return selectDrawWords(loadActivePool(db, studentId, bookId), listNo, now);
}

// ---- Phase 3: pass engine -------------------------------------------------

var PHASE_NEW = "new_words";
var PHASE_RETEST = "retest";
var PHASE_MAKEUP = "makeup";
var STATUS_IN_PROGRESS = "in_progress";
var STATUS_COMMITTED = "committed";
var STATUS_VOIDED = "voided";
var STATUS_FAILED = "failed"; // new-words >5 wrongs; no pool writes

var NOTICE = {
  enterList: "已进入本 List 闯关：先完成新词测试。",
  newFail: "新词错误超过 5 个，本 List 闯关失败，请重学或重考（未记入错题）。",
  enterRetest: "新词已通过，进入历史错词重测。",
  emptyRetest: "暂无错题，完成本阶段后即可通关。",
  enterMakeup: "重测有错，进入补考循环：已对的词已锁定，只重做错词。",
  stubborn: "该词在补考中累计答错 3 次，已临时放行并标记为顽固词。",
  cleared: "本 List 已通关，下一 List 已解锁。"
};

function isoNow(now) {
  if (now instanceof Date) return now.toISOString();
  if (now) {
    var d = new Date(now);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function parseDraft(raw) {
  if (!raw) return emptyDraft();
  try {
    var d = JSON.parse(raw);
    if (!d || typeof d !== "object") return emptyDraft();
    d.poolByWord = d.poolByWord || {};
    d.notebookUpserts = d.notebookUpserts || {};
    d.wordMeta = d.wordMeta || {};
    d.remaining = Array.isArray(d.remaining) ? d.remaining : [];
    d.notices = Array.isArray(d.notices) ? d.notices : [];
    return d;
  } catch (e) {
    return emptyDraft();
  }
}

function emptyDraft() {
  return { poolByWord: {}, notebookUpserts: {}, wordMeta: {}, remaining: [], notices: [] };
}

function clonePoolRow(r) {
  return {
    word: String(r.word),
    ipa: r.ipa != null ? String(r.ipa) : null,
    meaning: r.meaning != null ? String(r.meaning) : null,
    word_json: r.word_json != null ? String(r.word_json) : null,
    source_list_id: r.source_list_id != null ? String(r.source_list_id) : null,
    consecutive_correct: Math.max(0, Math.floor(Number(r.consecutive_correct) || 0)),
    fail_count: Math.max(0, Math.floor(Number(r.fail_count) || 0)),
    stubborn: r.stubborn ? 1 : 0,
    last_review_date: r.last_review_date || null,
    pending_uncorrected: r.pending_uncorrected ? 1 : 0,
    makeup_fail_streak: Math.max(0, Math.floor(Number(r.makeup_fail_streak) || 0)),
    status: r.status === "graduated" ? "graduated" : "active",
    entered_at: r.entered_at || null,
    graduated_at: r.graduated_at || null,
    _touched: !!r._touched
  };
}

function loadPoolMap(db, studentId, bookId) {
  var rows = db
    .prepare("SELECT * FROM vocab_challenge_draw_pool WHERE student_id = ? AND book_id = ?")
    .all(studentId, bookId);
  var map = {};
  rows.forEach(function (r) {
    map[String(r.word)] = clonePoolRow(r);
  });
  return map;
}

function getProgress(db, studentId, bookId) {
  var row = db
    .prepare(
      "SELECT cleared_list_no, updated_at FROM vocab_challenge_progress " +
        "WHERE student_id = ? AND book_id = ?"
    )
    .get(studentId, bookId);
  var cleared = row ? Math.max(0, Math.floor(Number(row.cleared_list_no) || 0)) : 0;
  return {
    clearedListNo: cleared,
    nextListNo: cleared + 1,
    updatedAt: row ? row.updated_at : null
  };
}

function rememberMeta(draft, w) {
  if (!w || !w.word) return;
  var key = String(w.word);
  var wj =
    w.word_json != null
      ? typeof w.word_json === "string"
        ? w.word_json
        : JSON.stringify(w.word_json)
      : JSON.stringify(w);
  draft.wordMeta[key] = {
    word: key,
    ipa: w.ipa != null ? String(w.ipa) : (draft.wordMeta[key] && draft.wordMeta[key].ipa) || null,
    meaning: w.meaning != null ? String(w.meaning) : (draft.wordMeta[key] && draft.wordMeta[key].meaning) || null,
    word_json: wj
  };
}

function ensureDraftPoolEntry(draft, word, listId, nowIso) {
  var key = String(word);
  var meta = draft.wordMeta[key] || { word: key };
  var cur = draft.poolByWord[key];
  if (cur) {
    if (cur.status === "graduated") {
      cur.status = "active";
      cur.graduated_at = null;
      cur.consecutive_correct = 0;
    }
    cur._touched = true;
    return cur;
  }
  cur = {
    word: key,
    ipa: meta.ipa || null,
    meaning: meta.meaning || null,
    word_json: meta.word_json || null,
    source_list_id: listId != null ? String(listId) : null,
    consecutive_correct: 0,
    fail_count: 0,
    stubborn: 0,
    last_review_date: null,
    pending_uncorrected: 0,
    makeup_fail_streak: 0,
    status: "active",
    entered_at: nowIso,
    graduated_at: null,
    _touched: true
  };
  draft.poolByWord[key] = cur;
  return cur;
}

function notebookTouch(draft, word, listId, nowIso) {
  var key = String(word);
  var meta = draft.wordMeta[key] || { word: key };
  var prev = draft.notebookUpserts[key];
  draft.notebookUpserts[key] = {
    word: key,
    ipa: meta.ipa || null,
    meaning: meta.meaning || null,
    word_json: meta.word_json || null,
    source_list_id: listId != null ? String(listId) : null,
    at: nowIso,
    add: prev ? prev.add + 1 : 1
  };
}

/** New-word miss: enter/re-enter pool + notebook; does not set last_review_date (not 抽测). */
function applyNewWordMiss(draft, word, listId, nowIso) {
  var e = ensureDraftPoolEntry(draft, word, listId, nowIso);
  e.consecutive_correct = 0;
  e.fail_count += 1;
  e.status = "active";
  e.graduated_at = null;
  e._touched = true;
  notebookTouch(draft, word, listId, nowIso);
}

/** Retest/makeup correct. */
function applyReviewCorrect(draft, word, listId, nowIso) {
  var e = ensureDraftPoolEntry(draft, word, listId, nowIso);
  e.consecutive_correct += 1;
  e.pending_uncorrected = 0;
  e.stubborn = 0;
  e.makeup_fail_streak = 0;
  e.last_review_date = nowIso;
  e._touched = true;
  if (e.consecutive_correct >= PARDON_STREAK) {
    e.status = "graduated";
    e.graduated_at = nowIso;
  }
  return e;
}

/** Retest/makeup wrong. Returns {entry, stubbornRelease}. */
function applyReviewWrong(draft, word, listId, nowIso, inMakeup) {
  var e = ensureDraftPoolEntry(draft, word, listId, nowIso);
  e.consecutive_correct = 0;
  e.fail_count += 1;
  e.pending_uncorrected = 1;
  e.last_review_date = nowIso;
  e.status = "active";
  e.graduated_at = null;
  e._touched = true;
  var stubbornRelease = false;
  if (inMakeup) {
    e.makeup_fail_streak += 1;
    if (e.makeup_fail_streak >= STUBBORN_MAKEUP_FAILS) {
      e.stubborn = 1;
      e.makeup_fail_streak = 0;
      stubbornRelease = true;
    }
  }
  return { entry: e, stubbornRelease: stubbornRelease };
}

function answerMap(answers) {
  var map = {};
  (answers || []).forEach(function (a) {
    if (!a || a.word == null) return;
    map[String(a.word)] = {
      correct: !!a.correct,
      userAnswer: a.userAnswer != null ? String(a.userAnswer) : null
    };
  });
  return map;
}

function stmtsFor(db) {
  return {
    voidInProgress: db.prepare(
      "UPDATE vocab_challenge_attempt SET status = ?, updated_at = ? " +
        "WHERE student_id = ? AND book_id = ? AND status = ?"
    ),
    insertAttempt: db.prepare(
      "INSERT INTO vocab_challenge_attempt " +
        "(student_id, book_id, list_id, list_no, phase, status, draft_json, " +
        "new_wrong_count, retest_quota, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)"
    ),
    getAttempt: db.prepare("SELECT * FROM vocab_challenge_attempt WHERE id = ? AND student_id = ?"),
    getAttemptById: db.prepare("SELECT * FROM vocab_challenge_attempt WHERE id = ?"),
    updateAttempt: db.prepare(
      "UPDATE vocab_challenge_attempt SET phase = ?, status = ?, draft_json = ?, " +
        "new_wrong_count = ?, retest_quota = ?, updated_at = ? WHERE id = ?"
    ),
    deleteItems: db.prepare("DELETE FROM vocab_challenge_attempt_item WHERE attempt_id = ?"),
    insertItem: db.prepare(
      "INSERT INTO vocab_challenge_attempt_item " +
        "(attempt_id, word, sort_ord, locked, is_correct, user_answer, answered_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?)"
    ),
    listItems: db.prepare(
      "SELECT * FROM vocab_challenge_attempt_item WHERE attempt_id = ? ORDER BY sort_ord ASC"
    ),
    upsertProgress: db.prepare(
      "INSERT INTO vocab_challenge_progress (student_id, book_id, cleared_list_no, updated_at) " +
        "VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(student_id, book_id) DO UPDATE SET " +
        "cleared_list_no = excluded.cleared_list_no, updated_at = excluded.updated_at"
    ),
    upsertPool: db.prepare(
      "INSERT INTO vocab_challenge_draw_pool " +
        "(student_id, book_id, word, ipa, meaning, word_json, source_list_id, " +
        "consecutive_correct, fail_count, stubborn, last_review_date, pending_uncorrected, " +
        "makeup_fail_streak, status, entered_at, graduated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(student_id, book_id, word) DO UPDATE SET " +
        "ipa = excluded.ipa, meaning = excluded.meaning, word_json = excluded.word_json, " +
        "source_list_id = COALESCE(excluded.source_list_id, vocab_challenge_draw_pool.source_list_id), " +
        "consecutive_correct = excluded.consecutive_correct, fail_count = excluded.fail_count, " +
        "stubborn = excluded.stubborn, last_review_date = excluded.last_review_date, " +
        "pending_uncorrected = excluded.pending_uncorrected, " +
        "makeup_fail_streak = excluded.makeup_fail_streak, status = excluded.status, " +
        "entered_at = COALESCE(vocab_challenge_draw_pool.entered_at, excluded.entered_at), " +
        "graduated_at = excluded.graduated_at"
    ),
    upsertNotebook: db.prepare(
      "INSERT INTO vocab_challenge_notebook " +
        "(student_id, book_id, word, ipa, meaning, word_json, source_list_id, " +
        "first_missed_at, last_missed_at, miss_count) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(student_id, book_id, word) DO UPDATE SET " +
        "ipa = excluded.ipa, meaning = excluded.meaning, word_json = excluded.word_json, " +
        "source_list_id = COALESCE(excluded.source_list_id, vocab_challenge_notebook.source_list_id), " +
        "last_missed_at = excluded.last_missed_at, " +
        "miss_count = vocab_challenge_notebook.miss_count + excluded.miss_count"
    )
  };
}

function replaceItems(db, s, attemptId, words, opts) {
  opts = opts || {};
  s.deleteItems.run(attemptId);
  (words || []).forEach(function (w, i) {
    var word = typeof w === "string" ? w : w.word;
    s.insertItem.run(
      attemptId,
      String(word),
      i,
      opts.locked ? 1 : 0,
      opts.isCorrect != null ? (opts.isCorrect ? 1 : 0) : null,
      null,
      null
    );
  });
}

function publicItems(rows, draft) {
  return (rows || []).map(function (r) {
    var meta = (draft && draft.wordMeta && draft.wordMeta[r.word]) || {};
    return {
      word: r.word,
      sortOrd: r.sort_ord,
      locked: !!r.locked,
      isCorrect: r.is_correct == null ? null : !!r.is_correct,
      userAnswer: r.user_answer,
      ipa: meta.ipa || null,
      meaning: meta.meaning || null,
      word_json: meta.word_json || null
    };
  });
}

function commitDraft(db, s, attempt, draft, nowIso) {
  var studentId = attempt.student_id;
  var bookId = attempt.book_id;
  Object.keys(draft.poolByWord).forEach(function (word) {
    var e = draft.poolByWord[word];
    if (!e || !e._touched) return;
    s.upsertPool.run(
      studentId,
      bookId,
      e.word,
      e.ipa,
      e.meaning,
      e.word_json,
      e.source_list_id,
      e.consecutive_correct,
      e.fail_count,
      e.stubborn ? 1 : 0,
      e.last_review_date,
      e.pending_uncorrected ? 1 : 0,
      e.makeup_fail_streak,
      e.status,
      e.entered_at || nowIso,
      e.graduated_at
    );
  });
  Object.keys(draft.notebookUpserts).forEach(function (word) {
    var n = draft.notebookUpserts[word];
    s.upsertNotebook.run(
      studentId,
      bookId,
      n.word,
      n.ipa,
      n.meaning,
      n.word_json,
      n.source_list_id,
      n.at,
      n.at,
      n.add || 1
    );
  });
  var prog = getProgress(db, studentId, bookId);
  var cleared = Math.max(prog.clearedListNo, Math.floor(Number(attempt.list_no) || 0));
  s.upsertProgress.run(studentId, bookId, cleared, nowIso);
}

/**
 * Start List challenge (phase new_words). Voids any in-progress attempt on this book.
 * words: [{word, ipa?, meaning?, word_json?}, ...]
 */
function startListChallenge(db, opts) {
  opts = opts || {};
  var studentId = opts.studentId;
  var bookId = String(opts.bookId || "");
  var listId = String(opts.listId || "");
  var listNo = Math.floor(Number(opts.listNo) || 0);
  var words = Array.isArray(opts.words) ? opts.words : [];
  var nowIso = isoNow(opts.now);
  if (!studentId || !bookId || !listId || listNo < 1) {
    return { ok: false, error: "缺少 studentId / bookId / listId / listNo" };
  }
  if (!words.length) return { ok: false, error: "词表为空" };

  var prog = getProgress(db, studentId, bookId);
  if (listNo !== prog.nextListNo) {
    return {
      ok: false,
      error: "请先通关 List " + prog.nextListNo,
      nextListNo: prog.nextListNo,
      clearedListNo: prog.clearedListNo
    };
  }

  var s = stmtsFor(db);
  var draft = emptyDraft();
  draft.poolByWord = loadPoolMap(db, studentId, bookId);
  words.forEach(function (w) { rememberMeta(draft, w); });
  draft.notices = [NOTICE.enterList];

  var attemptId;
  var tx = db.transaction(function () {
    s.voidInProgress.run(STATUS_VOIDED, nowIso, studentId, bookId, STATUS_IN_PROGRESS);
    var info = s.insertAttempt.run(
      studentId,
      bookId,
      listId,
      listNo,
      PHASE_NEW,
      STATUS_IN_PROGRESS,
      JSON.stringify(draft),
      retestQuota(listNo),
      nowIso,
      nowIso
    );
    attemptId = info.lastInsertRowid;
    replaceItems(db, s, attemptId, words);
  });
  tx();

  var attempt = s.getAttempt.get(attemptId, studentId);
  return {
    ok: true,
    attemptId: attemptId,
    phase: PHASE_NEW,
    status: STATUS_IN_PROGRESS,
    listNo: listNo,
    listId: listId,
    notices: draft.notices.slice(),
    items: publicItems(s.listItems.all(attemptId), draft),
    progress: prog
  };
}

function voidAttempt(db, attemptId, studentId, now) {
  var s = stmtsFor(db);
  var row = s.getAttempt.get(attemptId, studentId);
  if (!row) return { ok: false, error: "尝试不存在" };
  if (row.status !== STATUS_IN_PROGRESS) {
    return { ok: false, error: "当前尝试不可作废", status: row.status };
  }
  var nowIso = isoNow(now);
  s.updateAttempt.run(
    row.phase,
    STATUS_VOIDED,
    row.draft_json,
    row.new_wrong_count,
    row.retest_quota,
    nowIso,
    attemptId
  );
  return { ok: true, attemptId: attemptId, status: STATUS_VOIDED };
}

function finishClear(db, s, attempt, draft, nowIso, notices) {
  commitDraft(db, s, attempt, draft, nowIso);
  draft.notices = (notices || []).concat([NOTICE.cleared]);
  s.updateAttempt.run(
    attempt.phase,
    STATUS_COMMITTED,
    JSON.stringify(draft),
    attempt.new_wrong_count,
    attempt.retest_quota,
    nowIso,
    attempt.id
  );
  s.deleteItems.run(attempt.id);
  return {
    ok: true,
    attemptId: attempt.id,
    phase: "cleared",
    status: STATUS_COMMITTED,
    cleared: true,
    notices: draft.notices.slice(),
    progress: getProgress(db, attempt.student_id, attempt.book_id),
    items: []
  };
}

/**
 * Submit new-word answers: [{word, correct, userAnswer?}].
 * >5 wrong → failed (no writes). ≤5 → draft wrongs, enter retest (may be empty).
 */
function submitNewWords(db, attemptId, studentId, answers, now) {
  var s = stmtsFor(db);
  var attempt = s.getAttempt.get(attemptId, studentId);
  if (!attempt) return { ok: false, error: "尝试不存在" };
  if (attempt.status !== STATUS_IN_PROGRESS) return { ok: false, error: "尝试已结束" };
  if (attempt.phase !== PHASE_NEW) return { ok: false, error: "当前不是新词阶段" };

  var items = s.listItems.all(attemptId);
  var map = answerMap(answers);
  var nowIso = isoNow(now);
  var draft = parseDraft(attempt.draft_json);
  var wrongs = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var a = map[it.word];
    if (!a) return { ok: false, error: "缺少作答: " + it.word };
    if (!a.correct) wrongs.push(it.word);
  }

  if (wrongs.length > MAX_NEW_WRONG) {
    s.updateAttempt.run(
      PHASE_NEW,
      STATUS_FAILED,
      JSON.stringify(emptyDraft()),
      wrongs.length,
      attempt.retest_quota,
      nowIso,
      attemptId
    );
    return {
      ok: true,
      passed: false,
      failed: true,
      wrongCount: wrongs.length,
      status: STATUS_FAILED,
      notices: [NOTICE.newFail],
      items: []
    };
  }

  wrongs.forEach(function (w) {
    applyNewWordMiss(draft, w, attempt.list_id, nowIso);
  });

  // Merge draft pool with DB for draw (draft already has full map + touches)
  var poolRows = Object.keys(draft.poolByWord).map(function (k) {
    return draft.poolByWord[k];
  });
  var drawn = selectDrawWords(poolRows, attempt.list_no, nowIso);
  var quota = retestQuota(attempt.list_no);
  draft.remaining = [];
  draft.notices = [NOTICE.enterRetest];
  if (!drawn.length) draft.notices.push(NOTICE.emptyRetest);

  var out;
  var tx = db.transaction(function () {
    attempt.new_wrong_count = wrongs.length;
    attempt.retest_quota = quota;
    attempt.phase = PHASE_RETEST;
    s.updateAttempt.run(
      PHASE_RETEST,
      STATUS_IN_PROGRESS,
      JSON.stringify(draft),
      wrongs.length,
      quota,
      nowIso,
      attemptId
    );
    replaceItems(db, s, attemptId, drawn);
    out = {
      ok: true,
      passed: true,
      wrongCount: wrongs.length,
      phase: PHASE_RETEST,
      status: STATUS_IN_PROGRESS,
      retestQuota: quota,
      drawnCount: drawn.length,
      notices: draft.notices.slice(),
      items: publicItems(s.listItems.all(attemptId), draft)
    };
  });
  tx();
  return out;
}

/**
 * Submit retest or makeup answers.
 * Retest all-correct / empty → commit clear.
 * Retest with wrongs → makeup.
 * Makeup: lock corrects; stubborn after 3 fails in makeup; until remaining empty → clear.
 */
function submitReview(db, attemptId, studentId, answers, now) {
  var s = stmtsFor(db);
  var attempt = s.getAttempt.get(attemptId, studentId);
  if (!attempt) return { ok: false, error: "尝试不存在" };
  if (attempt.status !== STATUS_IN_PROGRESS) return { ok: false, error: "尝试已结束" };
  if (attempt.phase !== PHASE_RETEST && attempt.phase !== PHASE_MAKEUP) {
    return { ok: false, error: "当前不是重测/补考阶段" };
  }

  var nowIso = isoNow(now);
  var draft = parseDraft(attempt.draft_json);
  var items = s.listItems.all(attemptId);
  var map = answerMap(answers);
  var inMakeup = attempt.phase === PHASE_MAKEUP;
  var stillWrong = [];
  var stubbornWords = [];
  var notices = [];

  // Empty retest → clear
  if (!items.length && attempt.phase === PHASE_RETEST) {
    var clearedEmpty;
    var txEmpty = db.transaction(function () {
      clearedEmpty = finishClear(db, s, attempt, draft, nowIso, [NOTICE.emptyRetest]);
    });
    txEmpty();
    return clearedEmpty;
  }

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.locked) continue;
    var a = map[it.word];
    if (!a) return { ok: false, error: "缺少作答: " + it.word };
    if (a.correct) {
      applyReviewCorrect(draft, it.word, attempt.list_id, nowIso);
    } else {
      var wr = applyReviewWrong(draft, it.word, attempt.list_id, nowIso, inMakeup);
      if (wr.stubbornRelease) {
        stubbornWords.push(it.word);
        notices.push(NOTICE.stubborn + "（" + it.word + "）");
      } else {
        stillWrong.push(it.word);
      }
    }
  }

  var result;
  var tx = db.transaction(function () {
    if (!stillWrong.length) {
      result = finishClear(db, s, attempt, draft, nowIso, notices);
      result.stubbornReleased = stubbornWords.slice();
      return;
    }

    draft.remaining = stillWrong.slice();
    if (attempt.phase === PHASE_RETEST) {
      notices = [NOTICE.enterMakeup].concat(notices);
    }
    draft.notices = notices;
    s.updateAttempt.run(
      PHASE_MAKEUP,
      STATUS_IN_PROGRESS,
      JSON.stringify(draft),
      attempt.new_wrong_count,
      attempt.retest_quota,
      nowIso,
      attemptId
    );
    replaceItems(db, s, attemptId, stillWrong);
    result = {
      ok: true,
      cleared: false,
      phase: PHASE_MAKEUP,
      status: STATUS_IN_PROGRESS,
      remainingCount: stillWrong.length,
      stubbornReleased: stubbornWords.slice(),
      notices: notices.slice(),
      items: publicItems(s.listItems.all(attemptId), draft)
    };
  });
  tx();
  return result;
}

function getAttemptView(db, attemptId, studentId) {
  var s = stmtsFor(db);
  var attempt = s.getAttempt.get(attemptId, studentId);
  if (!attempt) return { ok: false, error: "尝试不存在" };
  var draft = parseDraft(attempt.draft_json);
  return {
    ok: true,
    attemptId: attempt.id,
    bookId: attempt.book_id,
    listId: attempt.list_id,
    listNo: attempt.list_no,
    phase: attempt.phase,
    status: attempt.status,
    newWrongCount: attempt.new_wrong_count,
    retestQuota: attempt.retest_quota,
    notices: draft.notices || [],
    remaining: draft.remaining || [],
    items: publicItems(s.listItems.all(attemptId), draft),
    progress: getProgress(db, attempt.student_id, attempt.book_id)
  };
}

function ensureSchema(db) {
  db.exec(
    // Current book only (one row per student). History rows keep archived assignments.
    "CREATE TABLE IF NOT EXISTS vocab_challenge_assignment (" +
      "student_id INTEGER NOT NULL PRIMARY KEY," +
      "book_id TEXT NOT NULL," +
      "teacher_id INTEGER NOT NULL," +
      "assigned_at TEXT NOT NULL" +
    ");" +
    "CREATE TABLE IF NOT EXISTS vocab_challenge_assignment_history (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "student_id INTEGER NOT NULL," +
      "book_id TEXT NOT NULL," +
      "teacher_id INTEGER NOT NULL," +
      "assigned_at TEXT NOT NULL," +
      "archived_at TEXT NOT NULL" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_vch_assign_hist " +
      "ON vocab_challenge_assignment_history(student_id, archived_at DESC);" +

    // cleared_list_no = highest List fully cleared; next playable = cleared_list_no + 1
    "CREATE TABLE IF NOT EXISTS vocab_challenge_progress (" +
      "student_id INTEGER NOT NULL," +
      "book_id TEXT NOT NULL," +
      "cleared_list_no INTEGER NOT NULL DEFAULT 0," +
      "updated_at TEXT NOT NULL," +
      "PRIMARY KEY (student_id, book_id)" +
    ");" +

    // 抽测池
    "CREATE TABLE IF NOT EXISTS vocab_challenge_draw_pool (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "student_id INTEGER NOT NULL," +
      "book_id TEXT NOT NULL," +
      "word TEXT NOT NULL," +
      "ipa TEXT," +
      "meaning TEXT," +
      "word_json TEXT," +
      "source_list_id TEXT," +
      "consecutive_correct INTEGER NOT NULL DEFAULT 0," +
      "fail_count INTEGER NOT NULL DEFAULT 0," +
      "stubborn INTEGER NOT NULL DEFAULT 0," +
      "last_review_date TEXT," +
      "pending_uncorrected INTEGER NOT NULL DEFAULT 0," +
      "makeup_fail_streak INTEGER NOT NULL DEFAULT 0," +
      "status TEXT NOT NULL DEFAULT 'active'," +
      "entered_at TEXT NOT NULL," +
      "graduated_at TEXT," +
      "UNIQUE(student_id, book_id, word)" +
    ");" +
    // Spec: (user_id, last_review_date, status) — student_id is the user key here
    "CREATE INDEX IF NOT EXISTS idx_vch_pool_draw " +
      "ON vocab_challenge_draw_pool(student_id, book_id, status, last_review_date);" +
    "CREATE INDEX IF NOT EXISTS idx_vch_pool_pending " +
      "ON vocab_challenge_draw_pool(student_id, book_id, status, pending_uncorrected);" +

    // 错题本（永久；主动练习不改 draw_pool）
    "CREATE TABLE IF NOT EXISTS vocab_challenge_notebook (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "student_id INTEGER NOT NULL," +
      "book_id TEXT NOT NULL," +
      "word TEXT NOT NULL," +
      "ipa TEXT," +
      "meaning TEXT," +
      "word_json TEXT," +
      "source_list_id TEXT," +
      "first_missed_at TEXT NOT NULL," +
      "last_missed_at TEXT NOT NULL," +
      "miss_count INTEGER NOT NULL DEFAULT 1," +
      "UNIQUE(student_id, book_id, word)" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_vch_nb_stu_book " +
      "ON vocab_challenge_notebook(student_id, book_id, last_missed_at DESC);" +

    // 通关尝试：中途退出 → status=voided，副作用不提交进 pool
    "CREATE TABLE IF NOT EXISTS vocab_challenge_attempt (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "student_id INTEGER NOT NULL," +
      "book_id TEXT NOT NULL," +
      "list_id TEXT NOT NULL," +
      "list_no INTEGER NOT NULL," +
      "phase TEXT NOT NULL," +
      "status TEXT NOT NULL DEFAULT 'in_progress'," +
      "draft_json TEXT," +
      "new_wrong_count INTEGER NOT NULL DEFAULT 0," +
      "retest_quota INTEGER NOT NULL DEFAULT 0," +
      "created_at TEXT NOT NULL," +
      "updated_at TEXT NOT NULL" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_vch_attempt_active " +
      "ON vocab_challenge_attempt(student_id, book_id, status);" +

    "CREATE TABLE IF NOT EXISTS vocab_challenge_attempt_item (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "attempt_id INTEGER NOT NULL," +
      "word TEXT NOT NULL," +
      "sort_ord INTEGER NOT NULL," +
      "locked INTEGER NOT NULL DEFAULT 0," +
      "is_correct INTEGER," +
      "user_answer TEXT," +
      "answered_at TEXT," +
      "UNIQUE(attempt_id, word)" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_vch_attempt_item " +
      "ON vocab_challenge_attempt_item(attempt_id, sort_ord);"
  );
}

function tableNames(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'vocab_challenge_%' ORDER BY name")
    .all()
    .map(function (r) { return r.name; });
}

function selfCheck() {
  var Database = require("better-sqlite3");
  var db = new Database(":memory:");
  ensureSchema(db);
  var names = tableNames(db);
  var need = [
    "vocab_challenge_assignment",
    "vocab_challenge_assignment_history",
    "vocab_challenge_progress",
    "vocab_challenge_draw_pool",
    "vocab_challenge_notebook",
    "vocab_challenge_attempt",
    "vocab_challenge_attempt_item"
  ];
  need.forEach(function (n) {
    if (names.indexOf(n) < 0) throw new Error("missing table " + n);
  });
  var idx = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name IN " +
        "('idx_vch_pool_draw','idx_vch_nb_stu_book','idx_vch_assign_hist')"
    )
    .all();
  if (idx.length < 3) throw new Error("missing indexes");

  // smoke: unique word per student×book; null last_review ok
  db.prepare(
    "INSERT INTO vocab_challenge_draw_pool " +
      "(student_id, book_id, word, consecutive_correct, fail_count, stubborn, " +
      "pending_uncorrected, makeup_fail_streak, status, entered_at) " +
      "VALUES (1, 'gaozhong', 'include', 0, 1, 0, 0, 0, 'active', ?)"
  ).run(new Date().toISOString());
  try {
    db.prepare(
      "INSERT INTO vocab_challenge_draw_pool " +
        "(student_id, book_id, word, consecutive_correct, fail_count, stubborn, " +
        "pending_uncorrected, makeup_fail_streak, status, entered_at) " +
        "VALUES (1, 'gaozhong', 'include', 0, 0, 0, 0, 0, 'active', ?)"
    ).run(new Date().toISOString());
    throw new Error("expected UNIQUE(student_id, book_id, word)");
  } catch (e) {
    if (String(e.message).indexOf("UNIQUE") < 0 && String(e.message).indexOf("unique") < 0) {
      throw e;
    }
  }

  if (retestQuota(1) !== 10 || retestQuota(11) !== 20 || retestQuota(21) !== 30 || retestQuota(40) !== 40) {
    throw new Error("retestQuota ladder");
  }
  if (drawScore(null, 2, 1) <= drawScore(3, 2, 1)) throw new Error("null date should rank oldest");
  // stubborn doubles fail term: 1 + 2*10*2 = 41 vs 1 + 2*10 = 21
  if (drawScore(1, 2, 0) !== 21 || drawScore(1, 2, 1) !== 41) throw new Error("stubborn weight");

  // --- draw algorithm ---
  var now = new Date("2026-08-15T12:00:00.000Z");
  function row(o) {
    return Object.assign({
      status: "active",
      pending_uncorrected: 0,
      fail_count: 0,
      stubborn: 0,
      last_review_date: "2026-08-14T00:00:00.000Z"
    }, o);
  }
  // empty → []
  if (selectDrawWords([], 5, now).length !== 0) throw new Error("empty pool");
  // graduated ignored; fewer than quota → all
  var few = selectDrawWords([
    row({ word: "a", fail_count: 1 }),
    row({ word: "b", status: "graduated", fail_count: 99 }),
    row({ word: "c", fail_count: 2 })
  ], 5, now);
  if (few.length !== 2 || few[0].word !== "c" || few[1].word !== "a") {
    throw new Error("filter+score order: " + few.map(function (w) { return w.word; }).join(","));
  }
  // priority-1 before high-score rest; quota truncates
  var picked = selectDrawWords([
    row({ word: "old", last_review_date: null, fail_count: 9 }),
    row({ word: "pend_b", pending_uncorrected: 1, fail_count: 0, last_review_date: "2026-08-14" }),
    row({ word: "pend_a", pending_uncorrected: 1, fail_count: 1, last_review_date: "2026-08-14" }),
    row({ word: "fresh", last_review_date: "2026-08-15T00:00:00.000Z", fail_count: 0 })
  ], 1, now); // list 1 → quota 10, take all 3 active non-grad… wait 4 active
  if (picked.length !== 4) throw new Error("quota 10 should take all 4");
  if (picked[0].word !== "pend_a" || picked[1].word !== "pend_b") {
    throw new Error("p1 first: " + picked.map(function (w) { return w.word; }).join(","));
  }
  if (picked[2].word !== "old" || picked[3].word !== "fresh") {
    throw new Error("rest by score: " + picked.map(function (w) { return w.word; }).join(","));
  }
  // quota truncates after p1
  var trunc = selectDrawWords([
    row({ word: "p1", pending_uncorrected: 1 }),
    row({ word: "x", last_review_date: null, fail_count: 50 }),
    row({ word: "y", last_review_date: null, fail_count: 40 })
  ], 1, now);
  // list1 quota=10, still all 3 — need more rows or mock quota via list that… 
  // force truncate: build 12 words, listNo=1 quota=10
  var many = [];
  many.push(row({ word: "p1a", pending_uncorrected: 1, fail_count: 0 }));
  many.push(row({ word: "p1b", pending_uncorrected: 1, fail_count: 0 }));
  for (var i = 0; i < 12; i++) {
    many.push(row({
      word: "w" + (i < 10 ? "0" : "") + i,
      last_review_date: null,
      fail_count: 12 - i
    }));
  }
  trunc = selectDrawWords(many, 1, now);
  if (trunc.length !== 10) throw new Error("truncate to 10 got " + trunc.length);
  if (trunc[0].word !== "p1a" || trunc[1].word !== "p1b") throw new Error("p1 kept under quota");
  if (trunc[2].word !== "w00") throw new Error("highest fail next: " + trunc[2].word);

  // stubborn boosts over equal days
  var stubOrder = selectDrawWords([
    row({ word: "plain", fail_count: 2, stubborn: 0, last_review_date: "2026-08-10" }),
    row({ word: "stub", fail_count: 2, stubborn: 1, last_review_date: "2026-08-10" })
  ], 5, now);
  if (stubOrder[0].word !== "stub") throw new Error("stubborn should rank higher");

  // DB path
  db.prepare("DELETE FROM vocab_challenge_draw_pool").run();
  var ins = db.prepare(
    "INSERT INTO vocab_challenge_draw_pool " +
      "(student_id, book_id, word, fail_count, stubborn, last_review_date, " +
      "pending_uncorrected, consecutive_correct, makeup_fail_streak, status, entered_at) " +
      "VALUES (1, 'gaozhong', ?, ?, 0, NULL, ?, 0, 0, 'active', ?)"
  );
  var entered = now.toISOString();
  ins.run("pend", 0, 1, entered);
  ins.run("hi", 5, 0, entered);
  ins.run("lo", 1, 0, entered);
  var fromDb = selectDrawWordsFromDb(db, 1, "gaozhong", 5, now);
  if (fromDb.length !== 3 || fromDb[0].word !== "pend" || fromDb[1].word !== "hi") {
    throw new Error("fromDb: " + fromDb.map(function (w) { return w.word; }).join(","));
  }

  // --- pass engine ---
  db.prepare("DELETE FROM vocab_challenge_draw_pool").run();
  function wordsOf() {
    return [
      { word: "alpha", meaning: "a" },
      { word: "bravo", meaning: "b" },
      { word: "charlie", meaning: "c" },
      { word: "delta", meaning: "d" },
      { word: "echo", meaning: "e" },
      { word: "foxtrot", meaning: "f" },
      { word: "golf", meaning: "g" }
    ];
  }
  function ans(list, wrongSet) {
    return list.map(function (w) {
      return { word: w.word || w, correct: !wrongSet[w.word || w] };
    });
  }

  // gate: cannot skip to list 2
  var bad = startListChallenge(db, {
    studentId: 1, bookId: "gaozhong", listId: "L2", listNo: 2, words: wordsOf(), now: now
  });
  if (bad.ok) throw new Error("should block list 2");

  var start = startListChallenge(db, {
    studentId: 1, bookId: "gaozhong", listId: "L1", listNo: 1, words: wordsOf(), now: now
  });
  if (!start.ok || start.phase !== PHASE_NEW) throw new Error("start");

  // >5 wrongs → fail, no pool
  var fail = submitNewWords(
    db, start.attemptId, 1,
    ans(wordsOf(), { alpha: 1, bravo: 1, charlie: 1, delta: 1, echo: 1, foxtrot: 1 }),
    now
  );
  if (!fail.failed || fail.wrongCount !== 6) throw new Error("fail>5");
  if (loadActivePool(db, 1, "gaozhong").length !== 0) throw new Error("fail must not write pool");

  // pass with 2 wrongs → retest includes them
  start = startListChallenge(db, {
    studentId: 1, bookId: "gaozhong", listId: "L1", listNo: 1, words: wordsOf(), now: now
  });
  var pass = submitNewWords(
    db, start.attemptId, 1,
    ans(wordsOf(), { alpha: 1, bravo: 1 }),
    now
  );
  if (!pass.passed || pass.phase !== PHASE_RETEST || pass.wrongCount !== 2) throw new Error("pass→retest");
  if (loadActivePool(db, 1, "gaozhong").length !== 0) throw new Error("draft only before clear");

  // void → still no pool
  var voided = voidAttempt(db, start.attemptId, 1, now);
  if (!voided.ok) throw new Error("void");
  if (loadActivePool(db, 1, "gaozhong").length !== 0) throw new Error("void rollback");

  // full clear via empty-ish: 0 new wrongs, empty pool
  start = startListChallenge(db, {
    studentId: 1, bookId: "gaozhong", listId: "L1", listNo: 1, words: wordsOf(), now: now
  });
  pass = submitNewWords(db, start.attemptId, 1, ans(wordsOf(), {}), now);
  if (pass.drawnCount !== 0) throw new Error("expect empty retest");
  var cleared = submitReview(db, start.attemptId, 1, [], now);
  if (!cleared.cleared || getProgress(db, 1, "gaozhong").clearedListNo !== 1) {
    throw new Error("empty retest clear");
  }

  // list2 with prior pool word + new miss → makeup + stubborn
  db.prepare(
    "INSERT INTO vocab_challenge_draw_pool " +
      "(student_id, book_id, word, fail_count, stubborn, last_review_date, " +
      "pending_uncorrected, consecutive_correct, makeup_fail_streak, status, entered_at) " +
      "VALUES (1, 'gaozhong', 'legacy', 1, 0, NULL, 1, 0, 0, 'active', ?)"
  ).run(entered);

  start = startListChallenge(db, {
    studentId: 1, bookId: "gaozhong", listId: "L2", listNo: 2, words: wordsOf(), now: now
  });
  pass = submitNewWords(db, start.attemptId, 1, ans(wordsOf(), { alpha: 1 }), now);
  if (pass.phase !== PHASE_RETEST || pass.drawnCount < 1) throw new Error("list2 retest draw");

  // miss all retest items once → makeup
  var retestItems = pass.items.map(function (it) { return it.word; });
  var review1 = submitReview(
    db, start.attemptId, 1,
    retestItems.map(function (w) { return { word: w, correct: false }; }),
    now
  );
  if (review1.phase !== PHASE_MAKEUP || !review1.remainingCount) throw new Error("enter makeup");

  // fail same remaining twice more on first word to hit stubborn (already 1 fail in retest... 
  // makeup_fail_streak only counts in makeup. Need 3 makeup fails.
  var target = review1.items[0].word;
  var others = review1.items.slice(1).map(function (it) { return it.word; });
  function makeupRound(correctTarget, correctOthers) {
    var a = [{ word: target, correct: correctTarget }];
    others.forEach(function (w) { a.push({ word: w, correct: correctOthers }); });
    return submitReview(db, start.attemptId, 1, a, now);
  }
  // round1 wrong target, correct others
  var m1 = makeupRound(false, true);
  if (m1.cleared) throw new Error("not yet");
  others = []; // only target remains if others correct
  if (m1.remainingCount !== 1 || m1.items[0].word !== target) {
    // others may still be in remaining if we only correct in map for present items
    others = m1.items.filter(function (it) { return it.word !== target; }).map(function (it) { return it.word; });
  }
  var m2 = makeupRound(false, true);
  var m3 = makeupRound(false, true);
  if (!m3.cleared && !(m3.stubbornReleased && m3.stubbornReleased.length)) {
    // after 3rd makeup fail on target → stubborn release; if no other remaining → cleared
    if (m3.phase === PHASE_MAKEUP && m3.remainingCount === 0) throw new Error("should clear or stubborn");
  }
  // ensure we get clear: if still in makeup, correct remaining
  var final = m3;
  if (!final.cleared) {
    final = submitReview(
      db, start.attemptId, 1,
      final.items.map(function (it) { return { word: it.word, correct: true }; }),
      now
    );
  }
  if (!final.cleared) throw new Error("makeup should clear");
  if (getProgress(db, 1, "gaozhong").clearedListNo !== 2) throw new Error("progress 2");

  var pool = loadActivePool(db, 1, "gaozhong");
  var alpha = pool.filter(function (r) { return r.word === "alpha"; })[0];
  if (!alpha || alpha.fail_count < 1) throw new Error("alpha in pool after commit");
  var nb = db.prepare(
    "SELECT miss_count FROM vocab_challenge_notebook WHERE student_id=1 AND book_id='gaozhong' AND word='alpha'"
  ).get();
  if (!nb || nb.miss_count < 1) throw new Error("notebook alpha");

  // pardon streak: 5 corrects graduate
  db.prepare("DELETE FROM vocab_challenge_draw_pool").run();
  db.prepare("DELETE FROM vocab_challenge_notebook").run();
  // reset progress to list 3
  db.prepare(
    "UPDATE vocab_challenge_progress SET cleared_list_no=2 WHERE student_id=1 AND book_id='gaozhong'"
  ).run();
  db.prepare(
    "INSERT INTO vocab_challenge_draw_pool " +
      "(student_id, book_id, word, fail_count, stubborn, last_review_date, " +
      "pending_uncorrected, consecutive_correct, makeup_fail_streak, status, entered_at) " +
      "VALUES (1, 'gaozhong', 'alpha', 1, 0, NULL, 0, 4, 0, 'active', ?)"
  ).run(entered);
  start = startListChallenge(db, {
    studentId: 1, bookId: "gaozhong", listId: "L3", listNo: 3, words: wordsOf(), now: now
  });
  pass = submitNewWords(db, start.attemptId, 1, ans(wordsOf(), {}), now);
  cleared = submitReview(
    db, start.attemptId, 1,
    pass.items.map(function (it) { return { word: it.word, correct: true }; }),
    now
  );
  if (!cleared.cleared) throw new Error("list3 clear");
  var grad = db.prepare(
    "SELECT status, consecutive_correct FROM vocab_challenge_draw_pool " +
      "WHERE student_id=1 AND book_id='gaozhong' AND word='alpha'"
  ).get();
  if (!grad || grad.status !== "graduated" || grad.consecutive_correct < 5) {
    throw new Error("pardon graduate");
  }

  // stubborn: one word wrong 3× in makeup → release + flag
  db.prepare("DELETE FROM vocab_challenge_draw_pool").run();
  db.prepare(
    "UPDATE vocab_challenge_progress SET cleared_list_no=3 WHERE student_id=1 AND book_id='gaozhong'"
  ).run();
  db.prepare(
    "INSERT INTO vocab_challenge_draw_pool " +
      "(student_id, book_id, word, fail_count, stubborn, last_review_date, " +
      "pending_uncorrected, consecutive_correct, makeup_fail_streak, status, entered_at) " +
      "VALUES (1, 'gaozhong', 'stubonly', 0, 0, NULL, 1, 0, 0, 'active', ?)"
  ).run(entered);
  start = startListChallenge(db, {
    studentId: 1, bookId: "gaozhong", listId: "L4", listNo: 4,
    words: [{ word: "only" }], now: now
  });
  pass = submitNewWords(db, start.attemptId, 1, [{ word: "only", correct: true }], now);
  if (pass.drawnCount !== 1 || pass.items[0].word !== "stubonly") throw new Error("draw stubonly");
  review1 = submitReview(db, start.attemptId, 1, [{ word: "stubonly", correct: false }], now);
  if (review1.phase !== PHASE_MAKEUP) throw new Error("stub→makeup");
  m1 = submitReview(db, start.attemptId, 1, [{ word: "stubonly", correct: false }], now);
  m2 = submitReview(db, start.attemptId, 1, [{ word: "stubonly", correct: false }], now);
  m3 = submitReview(db, start.attemptId, 1, [{ word: "stubonly", correct: false }], now);
  if (!m3.cleared || !m3.stubbornReleased || m3.stubbornReleased.indexOf("stubonly") < 0) {
    throw new Error("stubborn release clear");
  }
  var stubRow = db.prepare(
    "SELECT stubborn, pending_uncorrected FROM vocab_challenge_draw_pool " +
      "WHERE student_id=1 AND book_id='gaozhong' AND word='stubonly'"
  ).get();
  if (!stubRow || !stubRow.stubborn || !stubRow.pending_uncorrected) {
    throw new Error("stubborn+pending persisted");
  }

  // assign + switch archives
  require("./vocab-shelf").ensureSchema(db);
  var a1 = assignBook(db, { studentId: 9, bookId: "gaozhong", teacherId: 2, now: now });
  if (!a1.ok) throw new Error("assign");
  var a2 = assignBook(db, { studentId: 9, bookId: "cet4", teacherId: 2, now: now });
  if (!a2.ok || !a2.switched) throw new Error("switch");
  var hist = db.prepare(
    "SELECT book_id FROM vocab_challenge_assignment_history WHERE student_id=9"
  ).get();
  if (!hist || hist.book_id !== "gaozhong") throw new Error("history");
  if (getAssignment(db, 9).book_id !== "cet4") throw new Error("current book");

  db.close();
  return true;
}

function findActiveAttempt(db, studentId, bookId) {
  return db
    .prepare(
      "SELECT id FROM vocab_challenge_attempt " +
        "WHERE student_id = ? AND book_id = ? AND status = ? ORDER BY id DESC LIMIT 1"
    )
    .get(studentId, bookId, STATUS_IN_PROGRESS);
}

function getAssignment(db, studentId) {
  return db
    .prepare(
      "SELECT student_id, book_id, teacher_id, assigned_at FROM vocab_challenge_assignment " +
        "WHERE student_id = ?"
    )
    .get(studentId);
}

/**
 * Teacher assigns current book. Switching archives previous assignment row into history.
 * Also ensures vocab_bookshelf has the book (for learn pages).
 */
function assignBook(db, opts) {
  opts = opts || {};
  var studentId = opts.studentId;
  var bookId = String(opts.bookId || "").trim();
  var teacherId = opts.teacherId;
  var nowIso = isoNow(opts.now);
  if (!studentId || !bookId || !teacherId) {
    return { ok: false, error: "缺少 studentId / bookId / teacherId" };
  }
  var cur = getAssignment(db, studentId);
  if (cur && cur.book_id === bookId) {
    return { ok: true, unchanged: true, bookId: bookId, assignedAt: cur.assigned_at };
  }

  var tx = db.transaction(function () {
    if (cur) {
      db.prepare(
        "INSERT INTO vocab_challenge_assignment_history " +
          "(student_id, book_id, teacher_id, assigned_at, archived_at) VALUES (?, ?, ?, ?, ?)"
      ).run(cur.student_id, cur.book_id, cur.teacher_id, cur.assigned_at, nowIso);
      db.prepare(
        "UPDATE vocab_challenge_attempt SET status = ?, updated_at = ? " +
          "WHERE student_id = ? AND book_id = ? AND status = ?"
      ).run(STATUS_VOIDED, nowIso, studentId, cur.book_id, STATUS_IN_PROGRESS);
    }
    db.prepare(
      "INSERT INTO vocab_challenge_assignment (student_id, book_id, teacher_id, assigned_at) " +
        "VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(student_id) DO UPDATE SET " +
        "book_id = excluded.book_id, teacher_id = excluded.teacher_id, assigned_at = excluded.assigned_at"
    ).run(studentId, bookId, teacherId, nowIso);
    // ponytail: reuse shelf so learn/quiz pages keep working
    db.prepare(
      "INSERT OR IGNORE INTO vocab_bookshelf (student_id, book_id, added_at) VALUES (?, ?, ?)"
    ).run(studentId, bookId, nowIso);
    db.prepare(
      "INSERT OR IGNORE INTO vocab_challenge_progress " +
        "(student_id, book_id, cleared_list_no, updated_at) VALUES (?, ?, 0, ?)"
    ).run(studentId, bookId, nowIso);
  });
  try {
    tx();
  } catch (e) {
    // bookshelf table may be missing if shelf schema not mounted yet
    if (String(e.message).indexOf("vocab_bookshelf") >= 0) {
      db.transaction(function () {
        if (cur) {
          db.prepare(
            "INSERT INTO vocab_challenge_assignment_history " +
              "(student_id, book_id, teacher_id, assigned_at, archived_at) VALUES (?, ?, ?, ?, ?)"
          ).run(cur.student_id, cur.book_id, cur.teacher_id, cur.assigned_at, nowIso);
        }
        db.prepare(
          "INSERT INTO vocab_challenge_assignment (student_id, book_id, teacher_id, assigned_at) " +
            "VALUES (?, ?, ?, ?) " +
            "ON CONFLICT(student_id) DO UPDATE SET " +
            "book_id = excluded.book_id, teacher_id = excluded.teacher_id, assigned_at = excluded.assigned_at"
        ).run(studentId, bookId, teacherId, nowIso);
        db.prepare(
          "INSERT OR IGNORE INTO vocab_challenge_progress " +
            "(student_id, book_id, cleared_list_no, updated_at) VALUES (?, ?, 0, ?)"
        ).run(studentId, bookId, nowIso);
      })();
    } else {
      throw e;
    }
  }
  return { ok: true, bookId: bookId, assignedAt: nowIso, switched: !!(cur && cur.book_id !== bookId) };
}

function poolOverview(db, studentId, bookId) {
  var row = db
    .prepare(
      "SELECT " +
        "SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_n, " +
        "SUM(CASE WHEN status='graduated' THEN 1 ELSE 0 END) AS graduated_n, " +
        "SUM(CASE WHEN status='active' AND stubborn=1 THEN 1 ELSE 0 END) AS stubborn_n, " +
        "SUM(CASE WHEN status='active' AND pending_uncorrected=1 THEN 1 ELSE 0 END) AS pending_n " +
        "FROM vocab_challenge_draw_pool WHERE student_id = ? AND book_id = ?"
    )
    .get(studentId, bookId);
  var nb = db
    .prepare(
      "SELECT COUNT(*) AS n FROM vocab_challenge_notebook WHERE student_id = ? AND book_id = ?"
    )
    .get(studentId, bookId);
  return {
    active: (row && row.active_n) || 0,
    graduated: (row && row.graduated_n) || 0,
    stubborn: (row && row.stubborn_n) || 0,
    pending: (row && row.pending_n) || 0,
    notebook: (nb && nb.n) || 0
  };
}

function studentChallengeSummary(db, studentId) {
  var asg = getAssignment(db, studentId);
  if (!asg) {
    return { ok: true, assigned: false, assignment: null, progress: null, pool: null };
  }
  var prog = getProgress(db, studentId, asg.book_id);
  var active = findActiveAttempt(db, studentId, asg.book_id);
  return {
    ok: true,
    assigned: true,
    assignment: {
      bookId: asg.book_id,
      teacherId: asg.teacher_id,
      assignedAt: asg.assigned_at
    },
    progress: prog,
    pool: poolOverview(db, studentId, asg.book_id),
    activeAttemptId: active ? active.id : null
  };
}

function findListByNo(book, listNo) {
  listNo = Math.floor(Number(listNo) || 0);
  var lists = (book && book.lists) || [];
  for (var i = 0; i < lists.length; i++) {
    var l = lists[i];
    if (Number(l.listNo) === listNo) return l;
    if (String(l.id) === String(listNo)) return l;
  }
  return null;
}

function requireStudent(req, res) {
  if (req.user.role === "teacher") {
    res.status(403).json({ error: "请使用学生账号" });
    return false;
  }
  return true;
}

function requireTeacher(req, res) {
  if (req.user.role !== "teacher") {
    res.status(403).json({ error: "请使用教师账号" });
    return false;
  }
  return true;
}

function mountRoutes(app, opts) {
  var db = opts.db;
  var authMiddleware = opts.authMiddleware;
  var repoRoot = opts.repoRoot;
  var canManageStudent = opts.canManageStudent || function () { return false; };
  ensureSchema(db);

  var shelf = require("./vocab-shelf");
  if (typeof shelf.ensureSchema === "function") {
    try { shelf.ensureSchema(db); } catch (e) { /* ignore */ }
  }
  var resolveRoot = shelf.resolveContentRoot
    ? shelf.resolveContentRoot(repoRoot)
    : repoRoot || require("path").join(__dirname, "..");
  var loadCatalog = shelf.createCatalogLoader
    ? shelf.createCatalogLoader(resolveRoot)
    : function () { return shelf.buildCatalog(resolveRoot); };

  function catalog() {
    return typeof loadCatalog === "function" ? loadCatalog() : loadCatalog;
  }

  // ---- student ----

  app.get("/api/vocab-challenge/me", authMiddleware, function (req, res) {
    if (!requireStudent(req, res)) return;
    res.json(studentChallengeSummary(db, req.user.sub));
  });

  app.get("/api/vocab-challenge/lists", authMiddleware, function (req, res) {
    if (!requireStudent(req, res)) return;
    var asg = getAssignment(db, req.user.sub);
    if (!asg) return res.status(400).json({ error: "老师尚未布置词册" });
    var cat = catalog();
    var book = cat.byId[asg.book_id];
    if (!book) return res.status(404).json({ error: "词册不存在" });
    var prog = getProgress(db, req.user.sub, asg.book_id);
    var lists = (book.lists || []).map(function (l) {
      var no = Number(l.listNo) || 0;
      var unlocked = no > 0 && no <= prog.nextListNo;
      var cleared = no > 0 && no <= prog.clearedListNo;
      return {
        id: l.id,
        listNo: no,
        label: l.label,
        unlocked: unlocked,
        cleared: cleared,
        current: no === prog.nextListNo
      };
    });
    res.json({
      ok: true,
      bookId: asg.book_id,
      bookLabel: book.label,
      progress: prog,
      retestQuota: retestQuota(prog.nextListNo),
      lists: lists
    });
  });

  app.post("/api/vocab-challenge/start", authMiddleware, function (req, res) {
    if (!requireStudent(req, res)) return;
    var asg = getAssignment(db, req.user.sub);
    if (!asg) return res.status(400).json({ error: "老师尚未布置词册" });
    var prog = getProgress(db, req.user.sub, asg.book_id);
    var listNo = Math.floor(Number((req.body && req.body.listNo) || prog.nextListNo) || 0);
    if (listNo !== prog.nextListNo) {
      return res.status(400).json({
        error: "请先通关 List " + prog.nextListNo,
        nextListNo: prog.nextListNo
      });
    }
    var cat = catalog();
    var book = cat.byId[asg.book_id];
    if (!book) return res.status(404).json({ error: "词册不存在" });
    var list = findListByNo(book, listNo);
    if (!list) return res.status(404).json({ error: "List 不存在" });
    var lesson = shelf.resolveLesson(resolveRoot, book, list.id);
    if (!lesson || !lesson.words.length) {
      return res.status(404).json({ error: "词表缺失" });
    }
    var result = startListChallenge(db, {
      studentId: req.user.sub,
      bookId: asg.book_id,
      listId: String(list.id),
      listNo: listNo,
      words: lesson.words
    });
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  });

  app.post("/api/vocab-challenge/submit-new", authMiddleware, function (req, res) {
    if (!requireStudent(req, res)) return;
    var body = req.body || {};
    var attemptId = Number(body.attemptId);
    if (!attemptId) return res.status(400).json({ error: "缺少 attemptId" });
    var result = submitNewWords(db, attemptId, req.user.sub, body.answers || []);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  });

  app.post("/api/vocab-challenge/submit-review", authMiddleware, function (req, res) {
    if (!requireStudent(req, res)) return;
    var body = req.body || {};
    var attemptId = Number(body.attemptId);
    if (!attemptId) return res.status(400).json({ error: "缺少 attemptId" });
    var result = submitReview(db, attemptId, req.user.sub, body.answers || []);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  });

  app.post("/api/vocab-challenge/void", authMiddleware, function (req, res) {
    if (!requireStudent(req, res)) return;
    var attemptId = Number((req.body && req.body.attemptId) || 0);
    if (!attemptId) return res.status(400).json({ error: "缺少 attemptId" });
    var result = voidAttempt(db, attemptId, req.user.sub);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  });

  app.get("/api/vocab-challenge/attempt", authMiddleware, function (req, res) {
    if (!requireStudent(req, res)) return;
    var attemptId = Number(req.query.id || 0);
    if (!attemptId) return res.status(400).json({ error: "缺少 id" });
    var result = getAttemptView(db, attemptId, req.user.sub);
    if (!result.ok) return res.status(404).json(result);
    res.json(result);
  });

  app.get("/api/vocab-challenge/notebook", authMiddleware, function (req, res) {
    if (!requireStudent(req, res)) return;
    var asg = getAssignment(db, req.user.sub);
    var bookId = String(req.query.bookId || (asg && asg.book_id) || "").trim();
    if (!bookId) return res.status(400).json({ error: "缺少 bookId" });
    var rows = db
      .prepare(
        "SELECT id, word, ipa, meaning, word_json, source_list_id, first_missed_at, " +
          "last_missed_at, miss_count FROM vocab_challenge_notebook " +
          "WHERE student_id = ? AND book_id = ? ORDER BY last_missed_at DESC, id DESC"
      )
      .all(req.user.sub, bookId);
    res.json({
      ok: true,
      bookId: bookId,
      words: rows.map(function (r) {
        var wj = null;
        if (r.word_json) {
          try { wj = JSON.parse(r.word_json); } catch (e) { wj = null; }
        }
        return {
          id: r.id,
          word: r.word,
          ipa: r.ipa,
          meaning: r.meaning,
          wordJson: wj,
          sourceListId: r.source_list_id,
          firstMissedAt: r.first_missed_at,
          lastMissedAt: r.last_missed_at,
          missCount: r.miss_count
        };
      })
    });
  });

  // Voluntary practice pool — does not touch draw_pool (spec Q24)
  app.get("/api/vocab-challenge/notebook/practice-pool", authMiddleware, function (req, res) {
    if (!requireStudent(req, res)) return;
    var asg = getAssignment(db, req.user.sub);
    var bookId = String(req.query.bookId || (asg && asg.book_id) || "").trim();
    var limit = Math.max(1, Math.min(100, Math.floor(Number(req.query.limit) || 20)));
    if (!bookId) return res.status(400).json({ error: "缺少 bookId" });
    var rows = db
      .prepare(
        "SELECT word, ipa, meaning, word_json, source_list_id FROM vocab_challenge_notebook " +
          "WHERE student_id = ? AND book_id = ? ORDER BY last_missed_at DESC, id DESC LIMIT ?"
      )
      .all(req.user.sub, bookId, limit);
    res.json({
      ok: true,
      bookId: bookId,
      notice: "错题本练习不影响闯关抽测池。",
      words: rows.map(function (r) {
        var wj = null;
        if (r.word_json) {
          try { wj = JSON.parse(r.word_json); } catch (e) { wj = null; }
        }
        return {
          word: r.word,
          ipa: r.ipa,
          meaning: r.meaning,
          word_json: wj,
          listId: r.source_list_id
        };
      })
    });
  });

  // ---- teacher ----

  app.post("/api/vocab-challenge/teacher/assign", authMiddleware, function (req, res) {
    if (!requireTeacher(req, res)) return;
    var body = req.body || {};
    var studentId = Number(body.studentId);
    var bookId = String(body.bookId || PILOT_BOOK_ID).trim();
    if (!studentId) return res.status(400).json({ error: "缺少 studentId" });
    if (!canManageStudent(req, studentId)) {
      return res.status(403).json({ error: "无权布置该学生" });
    }
    var cat = catalog();
    if (!cat.byId[bookId]) return res.status(404).json({ error: "词册不存在" });
    // V1 pilot: prefer gaozhong; still allow catalog books for forward-compat
    var result = assignBook(db, {
      studentId: studentId,
      bookId: bookId,
      teacherId: req.user.sub
    });
    if (!result.ok) return res.status(400).json(result);
    res.json(Object.assign({ ok: true }, result, studentChallengeSummary(db, studentId)));
  });

  app.get("/api/vocab-challenge/teacher/student", authMiddleware, function (req, res) {
    if (!requireTeacher(req, res)) return;
    var studentId = Number(req.query.studentId);
    if (!studentId) return res.status(400).json({ error: "缺少 studentId" });
    if (!canManageStudent(req, studentId)) {
      return res.status(403).json({ error: "无权查看该学生" });
    }
    var summary = studentChallengeSummary(db, studentId);
    if (summary.assigned && summary.assignment) {
      var poolRows = db
        .prepare(
          "SELECT word, fail_count, consecutive_correct, stubborn, pending_uncorrected, " +
            "status, last_review_date FROM vocab_challenge_draw_pool " +
            "WHERE student_id = ? AND book_id = ? AND status = 'active' " +
            "ORDER BY pending_uncorrected DESC, fail_count DESC, word ASC LIMIT 50"
        )
        .all(studentId, summary.assignment.bookId);
      summary.drawPoolSample = poolRows;
    }
    res.json(summary);
  });

  app.get("/api/vocab-challenge/teacher/roster", authMiddleware, function (req, res) {
    if (!requireTeacher(req, res)) return;
    var ids = Array.isArray(opts.listManagedStudentIds)
      ? opts.listManagedStudentIds(req)
      : [];
    if (opts.listManagedStudentIds && ids === null) {
      // org admin: optional ?studentIds=1,2,3
      var raw = String(req.query.studentIds || "");
      ids = raw
        .split(",")
        .map(function (x) { return Number(x); })
        .filter(function (n) { return n > 0; });
    }
    var students = (ids || []).map(function (id) {
      var u = db.prepare(
        "SELECT id, phone, display_name FROM users WHERE id = ?"
      ).get(id);
      var sum = studentChallengeSummary(db, id);
      return {
        studentId: id,
        phone: u ? u.phone : null,
        displayName: u ? u.display_name : null,
        assignment: sum.assignment,
        progress: sum.progress,
        pool: sum.pool,
        activeAttemptId: sum.activeAttemptId
      };
    });
    res.json({ ok: true, students: students });
  });
}

module.exports = {
  MAX_NEW_WRONG: MAX_NEW_WRONG,
  PARDON_STREAK: PARDON_STREAK,
  STUBBORN_MAKEUP_FAILS: STUBBORN_MAKEUP_FAILS,
  PILOT_BOOK_ID: PILOT_BOOK_ID,
  PHASE_NEW: PHASE_NEW,
  PHASE_RETEST: PHASE_RETEST,
  PHASE_MAKEUP: PHASE_MAKEUP,
  NOTICE: NOTICE,
  retestQuota: retestQuota,
  daysSinceReview: daysSinceReview,
  drawScore: drawScore,
  selectDrawWords: selectDrawWords,
  loadActivePool: loadActivePool,
  selectDrawWordsFromDb: selectDrawWordsFromDb,
  getProgress: getProgress,
  getAssignment: getAssignment,
  assignBook: assignBook,
  studentChallengeSummary: studentChallengeSummary,
  startListChallenge: startListChallenge,
  submitNewWords: submitNewWords,
  submitReview: submitReview,
  voidAttempt: voidAttempt,
  getAttemptView: getAttemptView,
  ensureSchema: ensureSchema,
  mountRoutes: mountRoutes,
  selfCheck: selfCheck
};

if (require.main === module) {
  selfCheck();
  console.log("vocab-challenge self-check ok");
}
