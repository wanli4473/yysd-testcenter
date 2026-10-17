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
  var spellings = [];
  function addSpell(s) {
    s = String(s || "").trim();
    if (s && spellings.indexOf(s) < 0) spellings.push(s);
  }
  addSpell(word);
  addSpell(w && w.wordUs);
  addSpell(w && w.wordUk);
  if (Array.isArray(w && w.spellings)) w.spellings.forEach(addSpell);
  if (wj) {
    addSpell(wj.word);
    addSpell(wj.wordUs);
    addSpell(wj.wordUk);
    if (Array.isArray(wj.spellings)) wj.spellings.forEach(addSpell);
  }
  return { word: word, meaning: meaning, acceptCN: acceptCN, spellings: spellings, word_json: wj };
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

// ponytail: fold UK/US to one key. Keep in sync with english-spell-input.js
// ceiling: same-meaning Oxford pairs + productive -ise/-re/-our; not tyre/tire, cheque/check, storey/story
var UK_PAIRS = [
  ["neighbourhood", "neighborhood"], ["acknowledgement", "acknowledgment"],
  ["encyclopaedia", "encyclopedia"], ["archaeology", "archeology"],
  ["anaesthetic", "anesthetic"], ["gynaecology", "gynecology"],
  ["haemorrhage", "hemorrhage"], ["manoeuvre", "maneuver"],
  ["jewellery", "jewelry"], ["aeroplane", "airplane"], ["leukaemia", "leukemia"],
  ["speciality", "specialty"], ["instalment", "installment"],
  ["enrolment", "enrollment"], ["fulfilment", "fulfillment"],
  ["honourable", "honorable"], ["favourable", "favorable"],
  ["moustache", "mustache"], ["orientated", "oriented"],
  ["favourite", "favorite"], ["behaviour", "behavior"], ["neighbour", "neighbor"],
  ["jeweller", "jeweler"], ["judgement", "judgment"], ["sceptical", "skeptical"],
  ["aesthetic", "esthetic"], ["artefact", "artifact"], ["yoghurt", "yogurt"],
  ["pyjamas", "pajamas"], ["doughnut", "donut"], ["likeable", "likable"],
  ["sizeable", "sizable"], ["liveable", "livable"], ["moveable", "movable"],
  ["diarrhoea", "diarrhea"], ["oestrogen", "estrogen"], ["paediatric", "pediatric"],
  ["smoulder", "smolder"], ["demeanour", "demeanor"], ["splendour", "splendor"],
  ["aluminium", "aluminum"], ["catalogue", "catalog"], ["dialogue", "dialog"],
  ["analogue", "analog"], ["despatch", "dispatch"], ["licence", "license"],
  ["defence", "defense"], ["offence", "offense"], ["pretence", "pretense"],
  ["practise", "practice"], ["enquiry", "inquiry"], ["enquire", "inquire"],
  ["harbour", "harbor"], ["flavour", "flavor"], ["glamour", "glamor"],
  ["saviour", "savior"], ["tumour", "tumor"], ["parlour", "parlor"],
  ["valour", "valor"], ["fervour", "fervor"], ["candour", "candor"],
  ["rigour", "rigor"], ["vigour", "vigor"], ["succour", "succor"],
  ["clamour", "clamor"], ["colour", "color"], ["favour", "favor"],
  ["honour", "honor"], ["humour", "humor"], ["labour", "labor"],
  ["rumour", "rumor"], ["vapour", "vapor"], ["odour", "odor"],
  ["armour", "armor"], ["ardour", "ardor"], ["sceptic", "skeptic"],
  ["sulphate", "sulfate"], ["sulphide", "sulfide"], ["sulphur", "sulfur"],
  ["ageing", "aging"], ["mould", "mold"], ["plough", "plow"],
  ["foetus", "fetus"], ["anaemia", "anemia"], ["skilful", "skillful"],
  ["wilful", "willful"], ["fulfil", "fulfill"], ["instal", "install"],
  ["enrol", "enroll"], ["appal", "appall"], ["distil", "distill"],
  ["instil", "instill"], ["enthral", "enthrall"], ["focussed", "focused"],
  ["focussing", "focusing"], ["whisky", "whiskey"], ["cosy", "cozy"],
  ["gaol", "jail"], ["grey", "gray"], ["blonde", "blond"], ["axe", "ax"]
];
UK_PAIRS.sort(function (a, b) {
  if (b[0].length !== a[0].length) return b[0].length - a[0].length;
  if (a[0].indexOf(b[0]) === 0) return -1;
  if (b[0].indexOf(a[0]) === 0) return 1;
  return 0;
});
var TRE_STEMS = [
  "millimetre", "centimetre", "kilometre", "centre", "theatre", "metre", "litre", "fibre"
];
var ISE_KEEP = {
  advertise: 1, advise: 1, arise: 1, comprise: 1, compromise: 1, concise: 1,
  cruise: 1, devise: 1, disguise: 1, enterprise: 1, excise: 1, exercise: 1,
  expertise: 1, franchise: 1, improvise: 1, likewise: 1, merchandise: 1,
  otherwise: 1, paradise: 1, practise: 1, praise: 1, precise: 1, premise: 1,
  prize: 1, promise: 1, raise: 1, revise: 1, rise: 1, seize: 1, sunrise: 1,
  supervise: 1, surprise: 1, televise: 1, wise: 1
};
function toUS(s) {
  if (!s) return s;
  var i, uk, us;
  for (i = 0; i < UK_PAIRS.length; i++) {
    uk = UK_PAIRS[i][0];
    us = UK_PAIRS[i][1];
    if (s === uk) { s = us; continue; }
    if (uk.length < 4 || s.indexOf(uk) < 0) continue;
    if (us.indexOf(uk) === 0 && us.length > uk.length && s.indexOf(us) >= 0) continue;
    s = s.split(uk).join(us);
  }
  for (i = 0; i < TRE_STEMS.length; i++) {
    uk = TRE_STEMS[i];
    us = uk.replace(/re$/, "er");
    if (s === uk) { s = us; break; }
    if (s.length > uk.length && s.slice(-uk.length) === uk) {
      s = s.slice(0, -uk.length) + us;
      break;
    }
  }
  s = s.replace(/^(travel|cancel|label|model|signal|rival|equal|counsel|fuel|pencil|unravel|dial|initial|total|jewel)l(ed|ing|er|ers)$/, "$1$2");
  if (/gramme$/.test(s)) s = s.replace(/gramme$/, "gram");
  if (/isation$/.test(s)) s = s.replace(/isation$/, "ization");
  if (/yse$/.test(s)) s = s.replace(/yse$/, "yze");
  if (/ise$/.test(s) && !ISE_KEEP[s]) s = s.replace(/ise$/, "ize");
  if (/ogue$/.test(s) && s !== "rogue" && s !== "vogue" && s !== "synagogue") {
    s = s.replace(/ogue$/, "og");
  }
  return s;
}
function spellingForms(s) {
  s = normalizeSpell(s);
  var out = [];
  function add(x) {
    x = normalizeSpell(x);
    if (!x) return;
    if (out.indexOf(x) < 0) out.push(x);
    var us = toUS(x);
    if (us && out.indexOf(us) < 0) out.push(us);
  }
  add(s);
  if (/\((u|ue|e|l|ll|me)\)/i.test(s)) {
    add(s.replace(/\((u|ue|e|l|ll|me)\)/gi, ""));
    add(s.replace(/\((u|ue|e|l|ll|me)\)/gi, "$1"));
  }
  if (s.indexOf("/") >= 0) {
    var parts = s.split("/");
    var a = parts[0];
    var b = parts[1] || "";
    if (b.indexOf("-") === 0) {
      if (b === "-ise" && /ize$/.test(a)) { add(a); add(a.replace(/ize$/, "ise")); }
      else if (b === "-tre" && /ter$/.test(a)) { add(a); add(a.replace(/ter$/, "tre")); }
      else if (b === "-sation") { add(a); add(a.replace(/zation/, "sation")); }
      else { add(a); add(a + b.slice(1)); }
    } else { add(a); add(b); }
  }
  return out;
}

// ponytail: keep in sync with assets/js/english-spell-input.js matches()
function spellMatches(user, expected) {
  var u = normalizeSpell(user);
  var e = normalizeSpell(expected);
  if (!u || !e) return false;
  if (u === e) return true;
  var uForms = spellingForms(u);
  var eForms = spellingForms(e);
  var i, j;
  for (i = 0; i < uForms.length; i++) {
    for (j = 0; j < eForms.length; j++) {
      if (uForms[i] === eForms[j]) return true;
    }
  }
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

function spellMatchesAny(user, expectedList) {
  var list = Array.isArray(expectedList) ? expectedList : [expectedList];
  for (var i = 0; i < list.length; i++) {
    if (spellMatches(user, list[i])) return true;
  }
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
  var spellOk = spellMatchesAny(userAnswer, meta.spellings && meta.spellings.length ? meta.spellings : [meta.word]);
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
  var dual = { word: "center", spellings: ["center", "centre"], acceptCN: ["中心"] };
  if (!gradeVocabAnswer(dual, { userAnswer: "centre", userMeaning: "中心" })) {
    throw new Error("grade dual UK spelling");
  }
  if (!gradeVocabAnswer({ word: "license", acceptCN: ["执照"] }, { userAnswer: "licence", userMeaning: "执照" })) {
    throw new Error("grade license <- licence");
  }
  if (!gradeVocabAnswer({ word: "licence", acceptCN: ["执照"] }, { userAnswer: "license", userMeaning: "执照" })) {
    throw new Error("grade licence <- license");
  }
  [
    ["organise", "organize"], ["catalogue", "catalog"], ["favourite", "favorite"],
    ["centre", "center"], ["defence", "defense"], ["enrol", "enroll"],
    ["grey", "gray"], ["programme", "program"], ["analyse", "analyze"],
    ["skilful", "skillful"], ["fibre", "fiber"], ["offence", "offense"],
    ["modernisation", "modernization"], ["neighbourhood", "neighborhood"],
    ["dialogue", "dialog"], ["travelling", "traveling"], ["emphasise", "emphasize"],
    ["colonise", "colonize"], ["realise", "realize"], ["behavio(u)r", "behavior"],
    ["jewellery", "jewelry"], ["enquiry", "inquiry"], ["enquire", "inquire"],
    ["judgement", "judgment"], ["cosy", "cozy"], ["sceptical", "skeptical"],
    ["mould", "mold"], ["artefact", "artifact"], ["instalment", "installment"],
    ["aeroplane", "airplane"], ["archaeology", "archeology"],
    ["aesthetic", "esthetic"], ["whisky", "whiskey"], ["gaol", "jail"],
    ["travelled", "traveled"], ["labelled", "labeled"], ["flavour", "flavor"],
    ["ageing", "aging"], ["enrolment", "enrollment"], ["colourful", "colorful"]
  ].forEach(function (p) {
    if (!spellMatches(p[0], p[1]) || !spellMatches(p[1], p[0])) {
      throw new Error("uk/us " + p.join("/"));
    }
  });
  [
    ["four", "for"], ["rise", "rize"], ["doctor", "doctour"],
    ["source", "sorce"], ["hectare", "hectater"], ["willing", "wiling"],
    ["advertise", "advertize"], ["promise", "promize"],
    ["tyre", "tire"], ["cheque", "check"], ["storey", "story"],
    ["waxed", "wxed"], ["taxes", "txs"]
  ].forEach(function (p) {
    if (spellMatches(p[0], p[1]) || spellMatches(p[1], p[0])) {
      throw new Error("false friend " + p.join("/"));
    }
  });
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
  spellMatchesAny: spellMatchesAny,
  gradeVocabAnswer: gradeVocabAnswer,
  gradeChallengeAnswer: gradeChallengeAnswer,
  gradedAnswerMap: gradedAnswerMap,
  gradeQuizResults: gradeQuizResults,
  selfCheck: selfCheck,
  UK_PAIRS: UK_PAIRS
};

if (require.main === module) {
  selfCheck();
  console.log("vocab-grade ok");
}
