#!/usr/bin/env node
// ponytail: mirrors server isJunkCdtOverwrite — fails if junk-guard regresses
function isJunkCdtOverwrite(incoming, existing) {
  if (!incoming || !existing || !existing.cdt) return false;
  var inDur = Number(incoming.durationSec);
  var exDur = Number(existing.durationSec);
  if (!isFinite(inDur)) inDur = 0;
  if (!isFinite(exDur)) exDur = 0;
  var inScore = incoming.score != null && isFinite(Number(incoming.score)) ? Number(incoming.score) : 0;
  var exScore = existing.score != null && isFinite(Number(existing.score)) ? Number(existing.score) : 0;
  var exHasEssay = !!(existing.writingTask1 || existing.writingTask2);
  var inHasEssay = !!(incoming.writingTask1 || incoming.writingTask2);
  if (exHasEssay && !inHasEssay && inDur < 60) return true;
  return inDur < 60 && inScore === 0 && exScore > 0 && exDur >= 600;
}

var good = { cdt: true, score: 24, durationSec: 3594 };
var junk = { cdt: true, score: 0, durationSec: 2 };
var retake = { cdt: true, score: 20, durationSec: 3600 };
var goodW = { cdt: true, score: null, durationSec: 3200, writingTask1: "hello world", writingWords: 2 };
var junkW = { cdt: true, score: null, durationSec: 3, writingWords: 0 };

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isJunkCdtOverwrite(junk, good) === true, "junk must not overwrite good CDT");
assert(isJunkCdtOverwrite(retake, good) === false, "real retake allowed");
assert(isJunkCdtOverwrite(junk, { score: 24, durationSec: 3594 }) === false, "non-cdt existing unprotected");
assert(isJunkCdtOverwrite(junk, null) === false, "no existing → allow");
assert(isJunkCdtOverwrite(junkW, goodW) === true, "empty writing abort must not wipe essays");
assert(isJunkCdtOverwrite({ cdt: true, durationSec: 3200, writingTask1: "new" }, goodW) === false, "real writing retake ok");
console.log("ok: cdt score guard");
