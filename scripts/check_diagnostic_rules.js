#!/usr/bin/env node
"use strict";
/**
 * Self-check for diagnostic rules (no test framework).
 * Run: node scripts/check_diagnostic_rules.js
 */
var path = require("path");
var diagnostic = require(path.join(__dirname, "..", "server", "diagnostic"));

var failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

// quotas sum to N
[30, 25, 10, 7].forEach(function (n) {
  var q = diagnostic.allocateTypes(n);
  var sum = Object.keys(q).reduce(function (s, k) { return s + q[k]; }, 0);
  assert(sum === n, "allocateTypes(" + n + ") sum=" + sum);
  assert(q.listening_choice >= 0 && q.spelling >= 0, "allocateTypes non-neg " + n);
});

// high school grey zone
var g1 = diagnostic.evaluateStage(0.75, 0.4, "high_school");
assert(!g1.is_passed && g1.rating === "weak", "HS grey + weak spelling → fail");
var g2 = diagnostic.evaluateStage(0.75, 0.5, "high_school");
assert(g2.is_passed && g2.rating === "good", "HS grey + spell>=50% → pass good");
var g3 = diagnostic.evaluateStage(0.88, 0.2, "high_school");
assert(g3.is_passed && g3.is_excellent && g3.rating === "excellent", "HS excellent");
var g4 = diagnostic.evaluateStage(0.7, 1, "high_school");
assert(!g4.is_passed, "HS below grey → fail even with perfect spelling");

// cet4 grey
var c1 = diagnostic.evaluateStage(0.7, 0.4, "cet4");
assert(!c1.is_passed, "CET4 grey + weak spelling → fail");
var c2 = diagnostic.evaluateStage(0.7, 0.6, "cet4");
assert(c2.is_passed, "CET4 grey + spell ok → pass");

// ielts no grey
var i1 = diagnostic.evaluateStage(0.65, 1, "ielts");
assert(!i1.is_passed, "IELTS below pass → fail");
var i2 = diagnostic.evaluateStage(0.68, 0, "ielts");
assert(i2.is_passed, "IELTS at pass line → pass");

// wilson CI
var ci = diagnostic.wilsonCI(26, 30);
assert(ci.lower > 0.6 && ci.upper < 1 && ci.lower < ci.upper, "wilson CI ordered for 26/30");
var ci0 = diagnostic.wilsonCI(0, 0);
assert(ci0.lower === 0 && ci0.upper === 0, "wilson empty");

// recommend start
assert(
  diagnostic.recommendStart({
    high_school: { is_passed: true },
    cet4: { is_passed: false }
  }) === "cet4",
  "recommend first fail = cet4"
);
assert(
  diagnostic.recommendStart({
    high_school: { is_passed: true },
    cet4: { is_passed: true },
    ielts: { is_passed: true }
  }) === "ielts",
  "all pass → ielts"
);
assert(
  diagnostic.recommendStart({
    high_school: { is_passed: false }
  }) === "high_school",
  "fail HS → high_school"
);

// spelling grade
assert(
  diagnostic.gradeAnswer({ question_type: "spelling", correct_answer: "Firm" }, " firm "),
  "spell ignore case/space"
);
assert(
  !diagnostic.gradeAnswer({ question_type: "spelling", correct_answer: "firm" }, "firms"),
  "spell no plural forgiveness"
);

// blankExample must hide lemma + common inflections (not leak answers in context)
[
  ["The police searched the house.", "search", "searched"],
  ["The police arrested the suspect.", "arrest", "arrested"],
  ["The police finally captured the escaped prisoner.", "capture", "captured"],
  ["Please study hard.", "study", "study"],
  ["She is studying now.", "study", "studying"]
].forEach(function (row) {
  var blanked = diagnostic.blankExample(row[0], row[1]);
  assert(blanked.indexOf("______") >= 0, "blank has gap for " + row[1]);
  assert(
    !new RegExp("\\b" + row[2] + "\\b", "i").test(blanked),
    "blank hides " + row[2] + " → " + blanked
  );
  assert(
    !new RegExp("\\b" + row[1] + "\\b", "i").test(blanked),
    "blank hides lemma " + row[1]
  );
});
assert(
  diagnostic.blankExample("The police ______ the house.", "search").indexOf("______") >= 0,
  "already-blanked stays blanked"
);

// early abort: >50% wrong after min sample
assert(!diagnostic.shouldEarlyAbort([]), "abort: empty");
assert(
  !diagnostic.shouldEarlyAbort(
    Array(diagnostic.EARLY_ABORT_MIN - 1).fill({ is_correct: 0 })
  ),
  "abort: below min sample"
);
assert(
  diagnostic.shouldEarlyAbort(
    Array(6).fill({ is_correct: 0 }).concat(Array(4).fill({ is_correct: 1 }))
  ),
  "abort: 6/10 wrong"
);
assert(
  !diagnostic.shouldEarlyAbort(
    Array(5).fill({ is_correct: 0 }).concat(Array(5).fill({ is_correct: 1 }))
  ),
  "no abort: exactly 50% wrong"
);
assert(
  diagnostic.computeStageStats(
    [{ is_correct: 1, question_type: "spelling" }, { is_correct: 0, question_type: "spelling" }],
    "high_school",
    { partial: true, early_aborted: true }
  ).early_aborted,
  "partial stage marks early_aborted"
);

assert(typeof diagnostic.mountRoutes === "function", "mountRoutes exported");

if (failed) {
  console.error("\n" + failed + " assertion(s) failed");
  process.exit(1);
}
console.log("\nall checks passed");
