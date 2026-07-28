"use strict";

/**
 * Vocab diagnostic: bank build, stage rules, question gen, API routes.
 * Levels: high_school ← gaozhong LIST HTML, cet4, ielts ← special subjects.
 */
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var STAGES = {
  high_school: {
    level: "high_school",
    name: "高中词汇",
    total: 30,
    passThreshold: 0.9,
    excellentThreshold: 0.95,
    greyLow: null,
    greyHigh: null
  },
  cet4: {
    level: "cet4",
    name: "四级词汇",
    total: 30,
    passThreshold: 0.8,
    excellentThreshold: 0.9,
    greyLow: null,
    greyHigh: null
  },
  ielts: {
    level: "ielts",
    name: "雅思词汇",
    total: 25,
    passThreshold: 0.8,
    excellentThreshold: 0.9,
    greyLow: null,
    greyHigh: null
  }
};

var STAGE_ORDER = ["high_school", "cet4", "ielts"];

var TYPE_RATIOS = [
  ["listening_choice", 0.2],
  ["english_to_chinese", 0.25],
  ["chinese_to_english", 0.25],
  ["spelling", 0.3]
];

var LEVEL_DIRS = {
  high_school: ["library/study/vocab"],
  cet4: ["library/study/vocab-cet4"],
  ielts: [
    "library/study/vocab-special-listening",
    "library/study/vocab-special-reading",
    "library/study/vocab-special-writing"
  ]
};

var LEVEL_LABEL = {
  high_school: "高中词汇",
  cet4: "四级词汇",
  ielts: "雅思词汇"
};

function allocateTypes(n) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  var floors = TYPE_RATIOS.map(function (pair) {
    var exact = n * pair[1];
    return { type: pair[0], floor: Math.floor(exact), rem: exact - Math.floor(exact) };
  });
  var sum = floors.reduce(function (s, x) { return s + x.floor; }, 0);
  var left = n - sum;
  floors.sort(function (a, b) { return b.rem - a.rem; });
  for (var i = 0; i < left; i++) floors[i % floors.length].floor += 1;
  var out = {};
  TYPE_RATIOS.forEach(function (pair) { out[pair[0]] = 0; });
  floors.forEach(function (x) { out[x.type] = x.floor; });
  return out;
}

function evaluateStage(accuracy, spellingAcc, stageLevel) {
  var stage = STAGES[stageLevel];
  if (!stage) return { is_passed: false, is_excellent: false, rating: "weak" };
  var acc = Number(accuracy) || 0;
  var spell = Number(spellingAcc);
  if (!isFinite(spell)) spell = 0;
  var passed = acc >= stage.passThreshold;
  if (!passed && stage.greyLow != null && acc >= stage.greyLow && acc < stage.greyHigh) {
    passed = spell >= 0.5;
  }
  var excellent = acc >= stage.excellentThreshold;
  var rating = excellent ? "excellent" : (passed ? "good" : "weak");
  return { is_passed: passed, is_excellent: excellent, rating: rating };
}

/** Wilson score interval, 95% z≈1.96 */
function wilsonCI(correct, total, z) {
  z = z == null ? 1.96 : z;
  total = Math.max(0, Math.floor(Number(total) || 0));
  correct = Math.max(0, Math.min(total, Math.floor(Number(correct) || 0)));
  if (total === 0) return { lower: 0, upper: 0 };
  var phat = correct / total;
  var z2 = z * z;
  var denom = 1 + z2 / total;
  var center = phat + z2 / (2 * total);
  var margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total);
  return {
    lower: Math.max(0, (center - margin) / denom),
    upper: Math.min(1, (center + margin) / denom)
  };
}

function recommendStart(stageResults) {
  for (var i = 0; i < STAGE_ORDER.length; i++) {
    var lv = STAGE_ORDER[i];
    var row = stageResults && stageResults[lv];
    if (!row || !row.is_passed) return lv;
  }
  return "ielts";
}

function pctStr(x) {
  return Math.round((Number(x) || 0) * 100) + "%";
}

function ratingLabel(r) {
  if (r === "excellent") return "优秀";
  if (r === "good") return "良好";
  return "需加强";
}

function buildAdvice(stageResults, recommended) {
  var parts = [];
  STAGE_ORDER.forEach(function (lv) {
    var row = stageResults && stageResults[lv];
    if (!row) return;
    parts.push(
      LEVEL_LABEL[lv] + "正确率 " + pctStr(row.accuracy) +
      "（" + ratingLabel(row.rating) + "）"
    );
  });
  var tip = "建议从" + (LEVEL_LABEL[recommended] || recommended) + "开始学习。";
  var last = stageResults && stageResults[recommended];
  if (last && last.spelling_accuracy != null && last.spelling_accuracy < 0.6) {
    tip += "重点加强拼写填空。";
  }
  if (recommended === "ielts" && last && !last.is_passed) {
    tip += "报告注明：需重点加强基础。";
  }
  return (parts.length ? parts.join("；") + "。" : "") + tip;
}

function parseWordData(html) {
  var m = String(html || "").match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return [];
  try {
    var arr = Function('"use strict"; return (' + m[1] + ");")();
    if (!Array.isArray(arr)) return [];
    return arr.map(function (w) {
      var word = String(w.word || "").trim();
      var meaning = String(w.meaning || "").trim();
      if (!word || !meaning) return null;
      return {
        word: word,
        meaning: meaning,
        ipa: String(w.ipa || "").trim(),
        acceptCN: Array.isArray(w.acceptCN) ? w.acceptCN : [],
        example: String(w.example || "").trim(),
        pos: String(w.pos || "").trim()
      };
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function walkHtmlFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(function (ent) {
    var full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtmlFiles(full, out);
    else if (ent.isFile() && /\.html$/i.test(ent.name)) out.push(full);
  });
}

function wordId(level, word) {
  return level + ":" + String(word).toLowerCase();
}

function ensureSchema(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS vocab_bank (" +
    "id TEXT PRIMARY KEY," +
    "level TEXT NOT NULL," +
    "word TEXT NOT NULL," +
    "ipa TEXT," +
    "meaning TEXT NOT NULL," +
    "example TEXT," +
    "pos TEXT," +
    "accept_cn TEXT," +
    "source_file TEXT" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_vocab_bank_level ON vocab_bank(level);" +
    "CREATE TABLE IF NOT EXISTS diagnostic_sessions (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "student_id INTEGER NOT NULL," +
    "status TEXT NOT NULL DEFAULT 'in_progress'," +
    "current_stage TEXT NOT NULL DEFAULT 'high_school'," +
    "start_time TEXT," +
    "end_time TEXT," +
    "elapsed_seconds INTEGER DEFAULT 0," +
    "stage_results TEXT," +
    "final_report TEXT," +
    "questions TEXT," +
    "created_at TEXT NOT NULL" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_diag_sess_student ON diagnostic_sessions(student_id, status);" +
    "CREATE TABLE IF NOT EXISTS diagnostic_answers (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "session_id INTEGER NOT NULL," +
    "stage TEXT NOT NULL," +
    "word_id TEXT NOT NULL," +
    "question_type TEXT," +
    "user_answer TEXT," +
    "correct_answer TEXT NOT NULL," +
    "is_correct INTEGER NOT NULL," +
    "time_spent_seconds INTEGER," +
    "question_index INTEGER," +
    "FOREIGN KEY (session_id) REFERENCES diagnostic_sessions(id)" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_diag_ans_sess ON diagnostic_answers(session_id, stage);" +
    "CREATE TABLE IF NOT EXISTS diagnostic_mistakes (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "student_id INTEGER NOT NULL," +
    "test_session_id INTEGER," +
    "word_id TEXT NOT NULL," +
    "level TEXT NOT NULL," +
    "question_type TEXT," +
    "user_answer TEXT," +
    "correct_answer TEXT," +
    "word TEXT," +
    "meaning TEXT," +
    "ipa TEXT," +
    "example TEXT," +
    "is_removed INTEGER NOT NULL DEFAULT 0," +
    "created_at TEXT NOT NULL" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_diag_mist_student ON diagnostic_mistakes(student_id, is_removed);"
  );
}

function rebuildVocabBank(db, repoRoot) {
  var insert = db.prepare(
    "INSERT OR REPLACE INTO vocab_bank (id, level, word, ipa, meaning, example, pos, accept_cn, source_file) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  var clear = db.prepare("DELETE FROM vocab_bank");
  var counts = { high_school: 0, cet4: 0, ielts: 0 };
  var tx = db.transaction(function () {
    clear.run();
    Object.keys(LEVEL_DIRS).forEach(function (level) {
      var seen = {};
      LEVEL_DIRS[level].forEach(function (rel) {
        var dir = path.join(repoRoot, rel);
        var files = [];
        walkHtmlFiles(dir, files);
        files.forEach(function (file) {
          var html = fs.readFileSync(file, "utf8");
          var words = parseWordData(html);
          var relFile = path.relative(repoRoot, file).replace(/\\/g, "/");
          words.forEach(function (w) {
            var id = wordId(level, w.word);
            if (seen[id]) return;
            seen[id] = 1;
            insert.run(
              id, level, w.word, w.ipa, w.meaning, w.example, w.pos,
              JSON.stringify(w.acceptCN || []), relFile
            );
            counts[level] += 1;
          });
        });
      });
    });
  });
  tx();
  return counts;
}

function ensureVocabBank(db, repoRoot) {
  ensureSchema(db);
  var row = db.prepare("SELECT COUNT(*) AS n FROM vocab_bank").get();
  if (row && row.n > 0) return { rebuilt: false, count: row.n };
  var counts = rebuildVocabBank(db, repoRoot);
  var total = counts.high_school + counts.cet4 + counts.ielts;
  return { rebuilt: true, count: total, counts: counts };
}

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function pickDistractors(pool, excludeId, key, n) {
  var others = pool.filter(function (w) { return w.id !== excludeId; });
  return shuffle(others).slice(0, n).map(function (w) { return w[key]; });
}

function blankExample(example, word) {
  // Blank lemma + common English inflections (search→searched, capture→captured).
  var ex = String(example || "").replace(/（[^）]*）|\([^)]*\)/g, "").trim();
  var w = String(word || "").trim();
  if (!ex || !w) return "______";
  var esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // underscore is \w in JS — don't use \b around ______
  if (/_{2,}/.test(ex) && !new RegExp("(?:^|[^A-Za-z])" + esc + "(?:[^A-Za-z]|$)", "i").test(ex)) {
    return ex;
  }

  var forms = [esc];
  if (/e$/i.test(w)) {
    forms.push(esc + "d", esc + "s", esc.slice(0, -1) + "ing", esc + "r", esc + "st");
  } else if (/[^aeiou]y$/i.test(w) && w.length > 2) {
    var ybase = esc.slice(0, -1);
    forms.push(ybase + "ies", ybase + "ied", esc + "ing");
  } else if (/(?:s|x|z|ch|sh)$/i.test(w)) {
    forms.push(esc + "es", esc + "ed", esc + "ing");
  } else {
    forms.push(esc + "s", esc + "es", esc + "ed", esc + "ing", esc + "er", esc + "est");
    if (/[aeiou][bcdfghjklmnpqrstvwxyz]$/i.test(w) && w.length >= 3) {
      var last = esc.charAt(esc.length - 1);
      forms.push(esc + last + "ed", esc + last + "ing");
    }
  }
  var re = new RegExp("\\b(?:" + forms.join("|") + ")\\b", "gi");
  var out = ex.replace(re, "______");
  if (out !== ex) return out;

  // Fallback: same stem family (handles odd forms we didn't list)
  var stem = w.toLowerCase().replace(/(?:ing|ies|ied|ers|est|ed|es|s)$/i, "");
  if (stem.length >= 4) {
    out = ex.replace(/\b[A-Za-z']+\b/g, function (tok) {
      var t = tok.toLowerCase();
      if (t === w.toLowerCase()) return "______";
      var ts = t.replace(/(?:ing|ies|ied|ers|est|ed|es|s)$/i, "");
      if (ts === stem || t.indexOf(stem) === 0) return "______";
      return tok;
    });
    if (out !== ex) return out;
  }

  // Still contains lemma letters as a word fragment — hide context entirely
  if (new RegExp(esc, "i").test(ex)) return "______";
  return ex || "______";
}

function generateStageQuestions(db, stageLevel) {
  var stage = STAGES[stageLevel];
  if (!stage) throw new Error("unknown stage");
  var pool = db.prepare(
    "SELECT id, word, ipa, meaning, example, pos FROM vocab_bank WHERE level = ?"
  ).all(stageLevel);
  if (pool.length < stage.total + 3) {
    throw new Error(stage.name + "词库不足（需至少 " + (stage.total + 3) + " 词，现有 " + pool.length + "）");
  }
  var picked = shuffle(pool).slice(0, stage.total);
  var quotas = allocateTypes(stage.total);
  var types = [];
  Object.keys(quotas).forEach(function (t) {
    for (var i = 0; i < quotas[t]; i++) types.push(t);
  });
  types = shuffle(types);
  return picked.map(function (w, idx) {
    var qtype = types[idx];
    var q = {
      qid: stageLevel + ":" + idx,
      word_id: w.id,
      question_type: qtype,
      phonetic: w.ipa || "",
      example_sentence: blankExample(w.example, w.word),
      question_content: null,
      correct_answer: null,
      options: null,
      word: w.word,
      meaning: w.meaning
    };
    if (qtype === "listening_choice") {
      q.question_content = w.word;
      q.correct_answer = w.word;
      q.options = shuffle([w.word].concat(pickDistractors(pool, w.id, "word", 3)));
    } else if (qtype === "english_to_chinese") {
      q.question_content = w.word;
      q.correct_answer = w.meaning;
      q.options = shuffle([w.meaning].concat(pickDistractors(pool, w.id, "meaning", 3)));
    } else if (qtype === "chinese_to_english") {
      q.question_content = w.meaning;
      q.correct_answer = w.word;
      q.options = shuffle([w.word].concat(pickDistractors(pool, w.id, "word", 3)));
    } else {
      q.question_content = { phonetic: w.ipa || "", example: q.example_sentence };
      q.correct_answer = w.word;
      q.options = null;
    }
    return q;
  });
}

function publicQuestion(q, answered) {
  // Re-blank at serve time so in-progress sessions pick up inflection fixes
  var lemma = q.word || q.correct_answer || "";
  var example = blankExample(
    (q.question_content && q.question_content.example) || q.example_sentence || "",
    lemma
  );
  var content = q.question_content;
  if (content && typeof content === "object") {
    content = Object.assign({}, content, { example: example });
  }
  var out = {
    qid: q.qid,
    word_id: q.word_id,
    question_type: q.question_type,
    question_content: content,
    phonetic: q.phonetic,
    example_sentence: example,
    options: q.options
  };
  if (answered) {
    out.correct_answer = q.correct_answer;
    out.word = q.word;
    out.meaning = q.meaning;
  }
  return out;
}

function normalizeSpell(s) {
  return String(s || "").trim().toLowerCase();
}

function gradeAnswer(q, userAnswer) {
  var ua = String(userAnswer == null ? "" : userAnswer).trim();
  var ca = String(q.correct_answer || "");
  if (q.question_type === "spelling") {
    return normalizeSpell(ua) === normalizeSpell(ca);
  }
  if (q.question_type === "english_to_chinese") {
    return ua === ca;
  }
  return normalizeSpell(ua) === normalizeSpell(ca);
}

function nowIso() {
  return new Date().toISOString();
}

function parseJson(s, fallback) {
  try {
    return s ? JSON.parse(s) : fallback;
  } catch (e) {
    return fallback;
  }
}

function computeStageStats(answers, stageLevel, opts) {
  opts = opts || {};
  var stage = STAGES[stageLevel];
  var total = opts.partial ? answers.length : (stage ? stage.total : answers.length);
  var correct = answers.filter(function (a) { return a.is_correct; }).length;
  var spellAns = answers.filter(function (a) { return a.question_type === "spelling"; });
  var spellOk = spellAns.filter(function (a) { return a.is_correct; }).length;
  var accuracy = total ? correct / total : 0;
  var spelling_accuracy = spellAns.length ? spellOk / spellAns.length : 0;
  var ev = evaluateStage(accuracy, spelling_accuracy, stageLevel);
  var ci = wilsonCI(correct, total);
  return {
    level: stageLevel,
    name: stage ? stage.name : stageLevel,
    total: total,
    correct: correct,
    accuracy: accuracy,
    ci_lower: ci.lower,
    ci_upper: ci.upper,
    spelling_accuracy: spelling_accuracy,
    spelling_total: spellAns.length,
    spelling_correct: spellOk,
    is_passed: ev.is_passed,
    is_excellent: ev.is_excellent,
    rating: ev.rating,
    early_aborted: !!opts.early_aborted
  };
}

/** Error rate > 50% with enough sample → abort whole test. */
var EARLY_ABORT_MIN = 10; // ponytail: ceiling — don't abort on first few answers; raise if too twitchy
function shouldEarlyAbort(answers) {
  var n = answers.length;
  if (n < EARLY_ABORT_MIN) return false;
  var wrong = 0;
  for (var i = 0; i < n; i++) if (!answers[i].is_correct) wrong += 1;
  return wrong / n > 0.5;
}

function finalizeReport(session, stageMap, elapsed) {
  var recommended = recommendStart(stageMap);
  var stages = STAGE_ORDER.map(function (lv) {
    return stageMap[lv] || null;
  });
  var early = stages.some(function (s) { return s && s.early_aborted; });
  var advice = buildAdvice(stageMap, recommended);
  if (early) advice += "因错误率超过50%已提前结束测试。";
  return {
    total_time_seconds: elapsed || 0,
    stages: stages,
    recommended_start_level: recommended,
    advice_text: advice,
    early_aborted: early
  };
}

function mountRoutes(app, opts) {
  var db = opts.db;
  var authMiddleware = opts.authMiddleware;
  var teacherAuthMiddleware = opts.teacherAuthMiddleware;
  var allowedStudentIdsForTeacher = opts.allowedStudentIdsForTeacher;
  var isOrgAdminReq = opts.isOrgAdminReq;
  var listStudentsByOrg = opts.listStudentsByOrg;
  var repoRoot = opts.repoRoot;

  ensureVocabBank(db, repoRoot);

  var stmts = {
    findProgress: db.prepare(
      "SELECT * FROM diagnostic_sessions WHERE student_id = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1"
    ),
    findSession: db.prepare("SELECT * FROM diagnostic_sessions WHERE id = ?"),
    insertSession: db.prepare(
      "INSERT INTO diagnostic_sessions (student_id, status, current_stage, start_time, elapsed_seconds, stage_results, questions, created_at) " +
      "VALUES (?, 'in_progress', 'high_school', ?, 0, '{}', ?, ?)"
    ),
    abandonSession: db.prepare(
      "UPDATE diagnostic_sessions SET status = 'abandoned', end_time = ? WHERE id = ? AND status = 'in_progress'"
    ),
    updateSession: db.prepare(
      "UPDATE diagnostic_sessions SET current_stage = ?, elapsed_seconds = ?, stage_results = ?, questions = ?, status = ?, end_time = ?, final_report = ? WHERE id = ?"
    ),
    insertAnswer: db.prepare(
      "INSERT INTO diagnostic_answers (session_id, stage, word_id, question_type, user_answer, correct_answer, is_correct, time_spent_seconds, question_index) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ),
    listAnswers: db.prepare(
      "SELECT * FROM diagnostic_answers WHERE session_id = ? AND stage = ? ORDER BY question_index ASC"
    ),
    listAllAnswers: db.prepare(
      "SELECT * FROM diagnostic_answers WHERE session_id = ? ORDER BY id ASC"
    ),
    findAnswer: db.prepare(
      "SELECT id FROM diagnostic_answers WHERE session_id = ? AND stage = ? AND question_index = ?"
    ),
    insertMistake: db.prepare(
      "INSERT INTO diagnostic_mistakes (student_id, test_session_id, word_id, level, question_type, user_answer, correct_answer, word, meaning, ipa, example, is_removed, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)"
    ),
    listMistakes: db.prepare(
      "SELECT * FROM diagnostic_mistakes WHERE student_id = ? AND is_removed = 0 ORDER BY id DESC"
    ),
    findMistake: db.prepare(
      "SELECT * FROM diagnostic_mistakes WHERE id = ? AND student_id = ?"
    ),
    removeMistake: db.prepare(
      "UPDATE diagnostic_mistakes SET is_removed = 1 WHERE id = ? AND student_id = ?"
    ),
    latestCompleted: db.prepare(
      "SELECT * FROM diagnostic_sessions WHERE student_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1"
    ),
    listCompleted: db.prepare(
      "SELECT * FROM diagnostic_sessions WHERE student_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 30"
    ),
    listSessionMistakes: db.prepare(
      "SELECT id, word_id, level, question_type, user_answer, correct_answer, word, meaning, ipa, created_at " +
      "FROM diagnostic_mistakes WHERE test_session_id = ? AND student_id = ? ORDER BY id ASC"
    ),
    findWord: db.prepare("SELECT * FROM vocab_bank WHERE id = ?")
  };

  // allow abandoned status column — status TEXT already flexible
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_diag_sess_completed ON diagnostic_sessions(student_id, status)");
  } catch (e) { /* ignore */ }

  function ownSession(req, res) {
    var id = Number(req.params.sessionId || req.params.id);
    if (!id) {
      res.status(400).json({ error: "无效会话" });
      return null;
    }
    var row = stmts.findSession.get(id);
    if (!row || row.student_id !== req.user.sub) {
      res.status(404).json({ error: "会话不存在" });
      return null;
    }
    return row;
  }

  function sessionPayload(row, opts2) {
    opts2 = opts2 || {};
    var questions = parseJson(row.questions, {});
    var stage = row.current_stage;
    var list = questions[stage] || [];
    var answers = stmts.listAnswers.all(row.id, stage);
    var answeredMap = {};
    answers.forEach(function (a) { answeredMap[a.question_index] = a; });
    var nextIdx = answers.length;
    var current = null;
    if (stage !== "finished" && list[nextIdx]) {
      var answered = !!answeredMap[nextIdx];
      // current unanswered question — hide correct
      current = publicQuestion(list[nextIdx], false);
    }
    var lastFeedback = null;
    if (opts2.feedbackIndex != null && list[opts2.feedbackIndex]) {
      var fa = answeredMap[opts2.feedbackIndex];
      lastFeedback = {
        question: publicQuestion(list[opts2.feedbackIndex], true),
        user_answer: fa ? fa.user_answer : "",
        is_correct: fa ? !!fa.is_correct : false
      };
    }
    var stageDone = stage !== "finished" && list.length > 0 && answers.length >= list.length;
    return {
      session_id: row.id,
      status: row.status,
      current_stage: row.current_stage,
      elapsed_seconds: row.elapsed_seconds || 0,
      stage_progress: {
        answered: answers.length,
        total: list.length,
        correct: answers.filter(function (a) { return a.is_correct; }).length
      },
      stage_done: stageDone,
      current_question: current,
      last_feedback: lastFeedback,
      stage_results: parseJson(row.stage_results, {}),
      stage_name: STAGES[stage] ? STAGES[stage].name : stage
    };
  }

  function startNewSession(studentId) {
    var qs = {};
    qs.high_school = generateStageQuestions(db, "high_school");
    var info = stmts.insertSession.run(
      studentId, nowIso(), JSON.stringify(qs), nowIso()
    );
    return stmts.findSession.get(info.lastInsertRowid);
  }

  function persistMistakes(sessionId, studentId, questions) {
    var allAns = stmts.listAllAnswers.all(sessionId);
    allAns.forEach(function (a) {
      if (a.is_correct) return;
      var q = (questions[a.stage] || []).find(function (x) {
        return x.word_id === a.word_id && x.question_type === a.question_type;
      });
      stmts.insertMistake.run(
        studentId, sessionId, a.word_id, a.stage, a.question_type,
        a.user_answer, a.correct_answer,
        q ? q.word : a.correct_answer,
        q ? q.meaning : "",
        q ? q.phonetic : "",
        q && q.example_sentence ? q.example_sentence : "",
        nowIso()
      );
    });
  }

  function completeSession(row, questions, stageResults, elapsed) {
    var finalReport = finalizeReport(row, stageResults, elapsed);
    persistMistakes(row.id, row.student_id, questions);
    stmts.updateSession.run(
      "finished",
      elapsed,
      JSON.stringify(stageResults),
      JSON.stringify(questions),
      "completed",
      nowIso(),
      JSON.stringify(finalReport),
      row.id
    );
    return {
      report: finalReport,
      row: stmts.findSession.get(row.id)
    };
  }

  app.get("/api/diagnostic/bank-status", authMiddleware, function (req, res) {
    var counts = {};
    STAGE_ORDER.forEach(function (lv) {
      counts[lv] = db.prepare("SELECT COUNT(*) AS n FROM vocab_bank WHERE level = ?").get(lv).n;
    });
    res.json({ ok: true, counts: counts });
  });

  app.get("/api/diagnostic/status", authMiddleware, function (req, res) {
    var existing = stmts.findProgress.get(req.user.sub);
    var done = stmts.latestCompleted.get(req.user.sub);
    res.json({
      ok: true,
      resume_available: !!existing,
      session: existing ? sessionPayload(existing) : null,
      placement_done: !!done,
      latest_session_id: done ? done.id : null
    });
  });

  app.post("/api/diagnostic/rebuild-bank", authMiddleware, function (req, res) {
    // ponytail: any logged-in user can rebuild; bank is public content
    var counts = rebuildVocabBank(db, repoRoot);
    res.json({ ok: true, counts: counts });
  });

  app.post("/api/diagnostic/start", authMiddleware, function (req, res) {
    try {
      var body = req.body || {};
      if (body.dry_run) {
        var probe = stmts.findProgress.get(req.user.sub);
        if (probe) {
          return res.json({ ok: true, resume_available: true, session: sessionPayload(probe) });
        }
        return res.json({ ok: true, resume_available: false, session: null });
      }
      var force = !!body.force;
      var existing = stmts.findProgress.get(req.user.sub);
      if (existing && !force) {
        return res.json({
          ok: true,
          resume_available: true,
          session: sessionPayload(existing)
        });
      }
      if (existing && force) {
        stmts.abandonSession.run(nowIso(), existing.id);
      }
      var row = startNewSession(req.user.sub);
      res.json({ ok: true, resume_available: false, session: sessionPayload(row) });
    } catch (e) {
      console.error("[diagnostic] start", e);
      res.status(500).json({ error: e.message || "无法开始测试" });
    }
  });

  app.get("/api/diagnostic/session/:sessionId", authMiddleware, function (req, res) {
    var row = ownSession(req, res);
    if (!row) return;
    res.json({ ok: true, session: sessionPayload(row) });
  });

  app.post("/api/diagnostic/session/:sessionId/answer", authMiddleware, function (req, res) {
    var row = ownSession(req, res);
    if (!row) return;
    if (row.status !== "in_progress") {
      return res.status(400).json({ error: "测试已结束" });
    }
    var body = req.body || {};
    var qid = String(body.qid || "");
    var userAnswer = body.user_answer != null ? body.user_answer : body.answer;
    var timeSpent = Math.max(0, Math.min(600, Number(body.time_spent_seconds) || 0));
    var elapsed = Math.max(row.elapsed_seconds || 0, Number(body.elapsed_seconds) || 0);

    var questions = parseJson(row.questions, {});
    var stage = row.current_stage;
    var list = questions[stage] || [];
    var idx = list.findIndex(function (q) { return q.qid === qid; });
    if (idx < 0) return res.status(400).json({ error: "题目不存在" });

    var answers = stmts.listAnswers.all(row.id, stage);
    if (answers.length !== idx) {
      return res.status(400).json({ error: "请按顺序答题" });
    }
    if (stmts.findAnswer.get(row.id, stage, idx)) {
      return res.status(400).json({ error: "本题已作答" });
    }

    var q = list[idx];
    var ok = gradeAnswer(q, userAnswer);
    stmts.insertAnswer.run(
      row.id, stage, q.word_id, q.question_type,
      String(userAnswer == null ? "" : userAnswer).slice(0, 255),
      q.correct_answer, ok ? 1 : 0, timeSpent, idx
    );

    stmts.updateSession.run(
      row.current_stage, elapsed, row.stage_results, row.questions,
      row.status, row.end_time, row.final_report, row.id
    );
    row = stmts.findSession.get(row.id);

    var allAns = stmts.listAllAnswers.all(row.id);
    if (shouldEarlyAbort(allAns)) {
      var stageAnswers = stmts.listAnswers.all(row.id, stage);
      var stageResults = parseJson(row.stage_results, {});
      stageResults[stage] = computeStageStats(stageAnswers, stage, {
        partial: true,
        early_aborted: true
      });
      // Capture feedback while stage is still current, then finalize
      var payload = sessionPayload(row, { feedbackIndex: idx });
      var done = completeSession(row, questions, stageResults, elapsed);
      payload.status = "completed";
      payload.current_stage = "finished";
      payload.stage_done = true;
      return res.json({
        ok: true,
        is_correct: ok,
        correct_answer: q.correct_answer,
        early_aborted: true,
        report: done.report,
        session: payload
      });
    }

    var payload = sessionPayload(row, { feedbackIndex: idx });
    res.json({
      ok: true,
      is_correct: ok,
      correct_answer: q.correct_answer,
      session: payload
    });
  });

  app.post("/api/diagnostic/session/:sessionId/next-stage", authMiddleware, function (req, res) {
    var row = ownSession(req, res);
    if (!row) return;
    if (row.status !== "in_progress") {
      return res.status(400).json({ error: "测试已结束" });
    }
    var elapsed = Math.max(
      row.elapsed_seconds || 0,
      Number((req.body || {}).elapsed_seconds) || 0
    );
    var stage = row.current_stage;
    if (stage === "finished") {
      return res.json({ ok: true, session: sessionPayload(row), report: parseJson(row.final_report, null) });
    }
    var questions = parseJson(row.questions, {});
    var list = questions[stage] || [];
    var answers = stmts.listAnswers.all(row.id, stage);
    if (answers.length < list.length) {
      return res.status(400).json({ error: "本阶段题目尚未答完" });
    }

    var stats = computeStageStats(answers, stage);
    var stageResults = parseJson(row.stage_results, {});
    stageResults[stage] = stats;

    var nextAction = "finish";
    var nextStage = "finished";
    if (stats.is_passed && stage !== "ielts") {
      nextStage = stage === "high_school" ? "cet4" : "ielts";
      nextAction = "continue";
      try {
        questions[nextStage] = generateStageQuestions(db, nextStage);
      } catch (e) {
        return res.status(500).json({ error: e.message || "无法生成下一阶段题目" });
      }
    }

    var finalReport = null;
    var status = "in_progress";
    var endTime = null;
    if (nextAction === "finish") {
      var done = completeSession(row, questions, stageResults, elapsed);
      return res.json({
        ok: true,
        next_action: nextAction,
        stage_result: stats,
        session: sessionPayload(done.row),
        report: done.report
      });
    }

    stmts.updateSession.run(
      nextStage, elapsed, JSON.stringify(stageResults), JSON.stringify(questions),
      status, endTime, finalReport, row.id
    );
    row = stmts.findSession.get(row.id);
    res.json({
      ok: true,
      next_action: nextAction,
      stage_result: stats,
      session: sessionPayload(row),
      report: finalReport
    });
  });

  app.get("/api/diagnostic/session/:sessionId/report", authMiddleware, function (req, res) {
    var row = ownSession(req, res);
    if (!row) return;
    if (row.status !== "completed") {
      return res.status(400).json({ error: "测试尚未完成" });
    }
    res.json({ ok: true, report: parseJson(row.final_report, null), session_id: row.id });
  });

  app.get("/api/diagnostic/mistakes", authMiddleware, function (req, res) {
    var level = String(req.query.level || "").trim();
    var qtype = String(req.query.question_type || "").trim();
    var rows = stmts.listMistakes.all(req.user.sub).filter(function (r) {
      if (level && r.level !== level) return false;
      if (qtype && r.question_type !== qtype) return false;
      return true;
    });
    res.json({ ok: true, mistakes: rows });
  });

  app.post("/api/diagnostic/mistakes/retest", authMiddleware, function (req, res) {
    var ids = (req.body && req.body.ids) || [];
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: "请选择错题" });
    }
    var questions = [];
    ids.forEach(function (id) {
      var m = stmts.findMistake.get(Number(id), req.user.sub);
      if (!m || m.is_removed) return;
      var bank = stmts.findWord.get(m.word_id);
      var word = bank ? bank.word : (m.word || m.correct_answer);
      var meaning = bank ? bank.meaning : (m.meaning || "");
      var ipa = bank ? bank.ipa : (m.ipa || "");
      var example = bank ? bank.example : (m.example || "");
      var pool = db.prepare(
        "SELECT id, word, meaning FROM vocab_bank WHERE level = ?"
      ).all(m.level);
      var qtype = m.question_type || "spelling";
      var q = {
        mistake_id: m.id,
        word_id: m.word_id,
        question_type: qtype,
        phonetic: ipa,
        example_sentence: blankExample(example, word),
        word: word,
        meaning: meaning,
        correct_answer: null,
        options: null,
        question_content: null
      };
      if (qtype === "listening_choice") {
        q.question_content = word;
        q.correct_answer = word;
        q.options = shuffle([word].concat(pickDistractors(
          pool.map(function (p) { return { id: p.id, word: p.word }; }),
          m.word_id, "word", 3
        )));
      } else if (qtype === "english_to_chinese") {
        q.question_content = word;
        q.correct_answer = meaning;
        q.options = shuffle([meaning].concat(pickDistractors(
          pool.map(function (p) { return { id: p.id, meaning: p.meaning }; }),
          m.word_id, "meaning", 3
        )));
      } else if (qtype === "chinese_to_english") {
        q.question_content = meaning;
        q.correct_answer = word;
        q.options = shuffle([word].concat(pickDistractors(
          pool.map(function (p) { return { id: p.id, word: p.word }; }),
          m.word_id, "word", 3
        )));
      } else {
        q.question_type = "spelling";
        q.question_content = { phonetic: ipa, example: q.example_sentence };
        q.correct_answer = word;
      }
      questions.push(q);
    });
    questions = shuffle(questions);
    res.json({
      ok: true,
      retest_id: crypto.randomBytes(8).toString("hex"),
      questions: questions.map(function (q) {
        return {
          mistake_id: q.mistake_id,
          word_id: q.word_id,
          question_type: q.question_type,
          question_content: q.question_content,
          phonetic: q.phonetic,
          example_sentence: q.example_sentence,
          options: q.options
        };
      })
    });
  });

  // ponytail: retest answers graded by looking up mistake row + bank word (no pack store)
  app.post("/api/diagnostic/mistakes/retest/answer", authMiddleware, function (req, res) {
    var body = req.body || {};
    var mistakeId = Number(body.mistake_id);
    var userAnswer = body.user_answer != null ? body.user_answer : body.answer;
    var m = stmts.findMistake.get(mistakeId, req.user.sub);
    if (!m || m.is_removed) return res.status(404).json({ error: "错题不存在" });
    var bank = stmts.findWord.get(m.word_id);
    var word = bank ? bank.word : (m.word || m.correct_answer);
    var meaning = bank ? bank.meaning : (m.meaning || "");
    var qtype = m.question_type || "spelling";
    var correct = qtype === "english_to_chinese" ? meaning : word;
    var fakeQ = { question_type: qtype, correct_answer: correct };
    var ok = gradeAnswer(fakeQ, userAnswer);
    if (ok) stmts.removeMistake.run(mistakeId, req.user.sub);
    res.json({
      ok: true,
      is_correct: ok,
      correct_answer: correct,
      removed: ok
    });
  });

  var teacherCanManageStudent = opts.teacherCanManageStudent;
  var findUserById = opts.findUserById;

  app.get("/api/teacher/diagnostic-overview", teacherAuthMiddleware, function (req, res) {
    var allowed = allowedStudentIdsForTeacher(req);
    var allowedSet = null;
    if (allowed) {
      allowedSet = {};
      allowed.forEach(function (id) { allowedSet[id] = 1; });
    }
    var orgId = req.user.orgId;
    var rows = (orgId && listStudentsByOrg ? listStudentsByOrg(orgId) : []) || [];
    var students = rows.filter(function (row) {
      return !allowedSet || allowedSet[row.id];
    }).map(function (row) {
      var sess = stmts.latestCompleted.get(row.id);
      var report = sess ? parseJson(sess.final_report, null) : null;
      var stages = {};
      if (report && report.stages) {
        report.stages.forEach(function (s) {
          if (s && s.level) stages[s.level] = s;
        });
      }
      var hs = stages.high_school || null;
      return {
        id: row.id,
        displayName: row.display_name || "",
        phone: String(row.phone || "").replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2"),
        high_school: hs,
        cet4: stages.cet4 || null,
        ielts: stages.ielts || null,
        recommended_start_level: report ? report.recommended_start_level : null,
        tested_at: sess ? (sess.end_time || sess.created_at) : null,
        alert: !!(hs && hs.accuracy < 0.6)
      };
    });
    res.json({ ok: true, students: students, isAdmin: isOrgAdminReq(req) });
  });

  app.get("/api/teacher/student-diagnostic/:studentId", teacherAuthMiddleware, function (req, res) {
    var studentId = Number(req.params.studentId);
    if (!studentId) return res.status(400).json({ error: "无效的学生 ID" });
    if (teacherCanManageStudent && !teacherCanManageStudent(req, studentId)) {
      return res.status(403).json({ error: "该学生未分配给你" });
    }
    var user = findUserById ? findUserById(studentId) : null;
    if (!user || (req.user.orgId && user.org_id !== req.user.orgId)) {
      return res.status(404).json({ error: "学生不存在" });
    }
    var sessions = stmts.listCompleted.all(studentId).map(function (sess) {
      var report = parseJson(sess.final_report, null) || {};
      return {
        id: sess.id,
        tested_at: sess.end_time || sess.created_at,
        recommended_start_level: report.recommended_start_level || null,
        total_time_seconds: report.total_time_seconds || sess.elapsed_seconds || 0,
        advice_text: report.advice_text || "",
        stages: report.stages || [],
        mistakes: stmts.listSessionMistakes.all(sess.id, studentId)
      };
    });
    var trend = { high_school: [], cet4: [], ielts: [] };
    // chronological for charts
    sessions.slice().reverse().forEach(function (s) {
      (s.stages || []).forEach(function (st) {
        if (!st || !st.level || !trend[st.level]) return;
        trend[st.level].push({
          session_id: s.id,
          at: s.tested_at,
          accuracy: st.accuracy,
          rating: st.rating
        });
      });
    });
    res.json({
      ok: true,
      student: {
        id: user.id,
        displayName: user.display_name || "",
        phone: String(user.phone || "").replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2")
      },
      sessions: sessions,
      trend: trend
    });
  });

  app.get("/api/teacher/diagnostic-hot-words", teacherAuthMiddleware, function (req, res) {
    var allowed = allowedStudentIdsForTeacher(req);
    var orgId = req.user.orgId;
    var rows = (orgId && listStudentsByOrg ? listStudentsByOrg(orgId) : []) || [];
    var ids = rows.map(function (r) { return r.id; }).filter(function (id) {
      return !allowed || allowed.indexOf(id) >= 0;
    });
    if (!ids.length) return res.json({ ok: true, words: [] });
    // ponytail: IN-list for class size; upgrade to temp table if roster >> 200
    var placeholders = ids.map(function () { return "?"; }).join(",");
    var sql =
      "SELECT word_id, MAX(word) AS word, MAX(meaning) AS meaning, MAX(level) AS level, COUNT(*) AS cnt " +
      "FROM diagnostic_mistakes WHERE is_removed = 0 AND student_id IN (" + placeholders + ") " +
      "GROUP BY word_id ORDER BY cnt DESC, word_id ASC LIMIT 20";
    var stmt = db.prepare(sql);
    var words = stmt.all.apply(stmt, ids);
    res.json({ ok: true, words: words });
  });
}

module.exports = {
  STAGES: STAGES,
  STAGE_ORDER: STAGE_ORDER,
  LEVEL_LABEL: LEVEL_LABEL,
  allocateTypes: allocateTypes,
  evaluateStage: evaluateStage,
  wilsonCI: wilsonCI,
  recommendStart: recommendStart,
  buildAdvice: buildAdvice,
  parseWordData: parseWordData,
  blankExample: blankExample,
  ensureSchema: ensureSchema,
  rebuildVocabBank: rebuildVocabBank,
  ensureVocabBank: ensureVocabBank,
  generateStageQuestions: generateStageQuestions,
  gradeAnswer: gradeAnswer,
  computeStageStats: computeStageStats,
  shouldEarlyAbort: shouldEarlyAbort,
  EARLY_ABORT_MIN: EARLY_ABORT_MIN,
  mountRoutes: mountRoutes
};
