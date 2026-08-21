"use strict";
/**
 * Server-side vocab quiz grading (mirrors vocab-challenge-ui / vocab-quiz client rules).
 */

function parseWordJson(raw) {
  if (raw == null) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    return null;
  }
}

function metaFromWord(w) {
  if (!w) return { word: "", meaning: "", acceptCN: [] };
  if (typeof w === "string") return { word: w, meaning: "", acceptCN: [] };
  var wj = w.word_json != null ? parseWordJson(w.word_json) : w;
  if (wj && typeof wj === "object" && !wj.word && w.word) wj = Object.assign({}, wj, { word: w.word });
  var word = String((w && w.word) || (wj && wj.word) || "").trim();
  var acceptCN = [];
  if (Array.isArray(w.acceptCN)) acceptCN = w.acceptCN;
  else if (wj && Array.isArray(wj.acceptCN)) acceptCN = wj.acceptCN;
  acceptCN = acceptCN.map(function (s) { return String(s || "").trim(); }).filter(Boolean);
  var meaning = String((w && w.meaning) || (wj && wj.meaning) || "").trim();
  return { word: word, meaning: meaning, acceptCN: acceptCN, word_json: wj };
}

function quizMeaning(meta) {
  if (!meta) return "（暂无释义）";
  if (meta.acceptCN && meta.acceptCN.length) {
    var cn = meta.acceptCN.filter(Boolean).join(" / ");
    if (cn) return cn;
  }
  var m = String(meta.meaning || "").trim();
  return m || "（暂无释义）";
}

function normalizeSpell(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// ponytail: keep in sync with assets/js/english-spell-input.js matches()
function spellMatches(user, expected) {
  var u = normalizeSpell(user);
  var e = normalizeSpell(expected);
  if (!u || !e) return false;
  if (u === e) return true;
  var optS = e.replace(/\s*\(s\)\s*$/i, "");
  if (optS !== e && (u === optS || u === optS + "s")) return true;
  if (/wards?$/.test(e)) {
    var stem = e.replace(/s$/, "");
    if (u === stem || u === stem + "s") return true;
  }
  var compactU = u.replace(/[\s'-]/g, "");
  var compactE = e.replace(/[\s'()-]/g, "");
  if (compactU && compactU === compactE) return true;
  if (e === "0" && (u === "zero" || u === "nought" || u === "nil")) return true;
  if (e === "zero" && (u === "0" || u === "o")) return true;
  return false;
}

function isSkipAnswer(userAnswer) {
  var u = String(userAnswer || "").trim();
  return u === "(lives)" || u === "(timeout)" || u === "(skipped)";
}

/** Match client: meaning exact string + spell exact lowercase. */
function gradeVocabAnswer(meta, ans) {
  ans = ans || {};
  var userAnswer = ans.userAnswer != null ? String(ans.userAnswer) : "";
  if (isSkipAnswer(userAnswer)) return false;
  var spellOk = spellMatches(userAnswer, meta.word);
  var expected = quizMeaning(meta);
  var userMeaning = ans.userMeaning != null ? String(ans.userMeaning).trim() : "";
  var meaningOk = !!userMeaning && userMeaning === expected;
  return spellOk && meaningOk;
}

function gradeChallengeAnswer(draft, word, ans) {
  var key = String(word);
  var meta = metaFromWord((draft && draft.wordMeta && draft.wordMeta[key]) || { word: key });
  var wj = parseWordJson(meta.word_json);
  if (wj && Array.isArray(wj.acceptCN)) meta.acceptCN = wj.acceptCN;
  if (wj && wj.meaning && !meta.meaning) meta.meaning = String(wj.meaning);
  return gradeVocabAnswer(meta, ans);
}

function gradedAnswerMap(draft, answers) {
  var map = {};
  (answers || []).forEach(function (a) {
    if (!a || a.word == null) return;
    var word = String(a.word);
    map[word] = {
      userAnswer: a.userAnswer != null ? String(a.userAnswer) : null,
      userMeaning: a.userMeaning != null ? String(a.userMeaning) : null,
      correct: gradeChallengeAnswer(draft, word, a)
    };
  });
  return map;
}

function gradeQuizResults(words, results, maxLives) {
  words = Array.isArray(words) ? words : [];
  results = Array.isArray(results) ? results : [];
  maxLives = Math.max(1, Math.floor(Number(maxLives) || 5));
  var wordSet = {};
  words.forEach(function (w) {
    var m = metaFromWord(w);
    if (m.word) wordSet[m.word] = m;
  });
  var byWord = {};
  results.forEach(function (r) {
    if (!r || !r.word) return;
    byWord[String(r.word)] = r;
  });
  var graded = [];
  var wrong = 0;
  var correct = 0;
  var lives = maxLives;
  var finishedAll = true;
  for (var i = 0; i < words.length; i++) {
    var meta = metaFromWord(words[i]);
    var ans = byWord[meta.word];
    if (!ans) {
      finishedAll = false;
      break;
    }
    var ok = gradeVocabAnswer(meta, ans);
    graded.push({ word: meta.word, correct: ok });
    if (ok) correct++;
    else {
      wrong++;
      lives--;
      if (lives <= 0) {
        finishedAll = false;
        break;
      }
    }
  }
  var passed = finishedAll && lives > 0;
  return {
    total: words.length,
    correct: correct,
    wrong: wrong,
    passed: passed,
    finishedAll: finishedAll,
    graded: graded
  };
}

function selfCheck() {
  var m = metaFromWord({ word: "include", acceptCN: ["包括", "包含"], meaning: "v. 包括" });
  if (quizMeaning(m) !== "包括 / 包含") throw new Error("quizMeaning acceptCN");
  if (!gradeVocabAnswer(m, { userAnswer: "include", userMeaning: "包括 / 包含" })) {
    throw new Error("grade ok");
  }
  if (gradeVocabAnswer(m, { userAnswer: "include", userMeaning: "包括" })) {
    throw new Error("grade meaning exact");
  }
  if (gradeVocabAnswer(m, { userAnswer: "wrong", userMeaning: "包括 / 包含" })) {
    throw new Error("grade spell");
  }
  var east = { word: "eastward(s)", acceptCN: ["向东"] };
  if (!gradeVocabAnswer(east, { userAnswer: "eastward", userMeaning: "向东" })) {
    throw new Error("grade eastward(s) -> eastward");
  }
  if (!gradeVocabAnswer(east, { userAnswer: "eastwards", userMeaning: "向东" })) {
    throw new Error("grade eastward(s) -> eastwards");
  }
  if (!gradeVocabAnswer({ word: "0", acceptCN: ["零"] }, { userAnswer: "zero", userMeaning: "零" })) {
    throw new Error("grade 0 -> zero");
  }
  if (!gradeVocabAnswer({ word: "zero", acceptCN: ["零"] }, { userAnswer: "0", userMeaning: "零" })) {
    throw new Error("grade zero -> 0");
  }
  if (!gradeVocabAnswer({ word: "used to", acceptCN: ["过去常常"] }, { userAnswer: "used  to", userMeaning: "过去常常" })) {
    throw new Error("grade used to spaces");
  }
  var draft = { wordMeta: { alpha: { word: "alpha", meaning: "a", word_json: null } } };
  var map = gradedAnswerMap(draft, [{ word: "alpha", userAnswer: "alpha", userMeaning: "a", correct: true }]);
  if (!map.alpha || !map.alpha.correct) throw new Error("gradedAnswerMap");
  var gq = gradeQuizResults(
    [{ word: "a", acceptCN: ["甲"] }, { word: "b", acceptCN: ["乙"] }],
    [
      { word: "a", userAnswer: "a", userMeaning: "甲" },
      { word: "b", userAnswer: "x", userMeaning: "乙" }
    ],
    5
  );
  if (gq.correct !== 1 || gq.wrong !== 1 || !gq.passed) throw new Error("gradeQuizResults partial");
  var gqFail = gradeQuizResults(
    [{ word: "a", acceptCN: ["甲"] }, { word: "b", acceptCN: ["乙"] }, { word: "c", acceptCN: ["丙"] }],
    [
      { word: "a", userAnswer: "x", userMeaning: "甲" },
      { word: "b", userAnswer: "x", userMeaning: "乙" }
    ],
    2
  );
  if (gqFail.passed || gqFail.finishedAll) throw new Error("gradeQuizResults lives out");
  return true;
}

module.exports = {
  parseWordJson: parseWordJson,
  metaFromWord: metaFromWord,
  quizMeaning: quizMeaning,
  normalizeSpell: normalizeSpell,
  spellMatches: spellMatches,
  gradeVocabAnswer: gradeVocabAnswer,
  gradeChallengeAnswer: gradeChallengeAnswer,
  gradedAnswerMap: gradedAnswerMap,
  gradeQuizResults: gradeQuizResults,
  selfCheck: selfCheck
};

if (require.main === module) {
  selfCheck();
  console.log("vocab-grade ok");
}
