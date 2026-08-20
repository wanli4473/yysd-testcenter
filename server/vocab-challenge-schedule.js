"use strict";

var fs = require("fs");
var path = require("path");

var REVIEW_DRAW_SIZE = 20;
var MAX_REVIEW_WRONG = 3;
// ponytail: linear weight bump; raise REVIEW_WEIGHT_FACTOR if weak words under-sampled
var REVIEW_WEIGHT_FACTOR = 3;

var scheduleCache = null;

function loadSchedule(bookId) {
  if (bookId !== "gaozhong") return null;
  if (scheduleCache) return scheduleCache;
  var file = path.join(__dirname, "schedules", "gaozhong-ebbinghaus-schedule.json");
  scheduleCache = JSON.parse(fs.readFileSync(file, "utf8"));
  return scheduleCache;
}

function getDayPlan(bookId, dayNo) {
  var sched = loadSchedule(bookId);
  if (!sched) return null;
  dayNo = Math.floor(Number(dayNo) || 0);
  if (dayNo < 1 || dayNo > sched.totalDays) return null;
  var plan = sched.days[String(dayNo)];
  if (!plan) return null;
  return {
    dayNo: dayNo,
    new: plan.new == null ? null : Math.floor(Number(plan.new) || 0) || null,
    reviews: (plan.reviews || []).map(function (n) { return Math.floor(Number(n) || 0); }).filter(function (n) { return n > 0; })
  };
}

function isEbbinghausBook(bookId) {
  return bookId === "gaozhong";
}

function programComplete(progressDay, bookId) {
  var sched = loadSchedule(bookId);
  if (!sched) return false;
  return Math.floor(Number(progressDay) || 0) > sched.totalDays;
}

/** Lists introduced as new on days 1..progressDay (inclusive). */
function introducedListNos(bookId, progressDay) {
  var sched = loadSchedule(bookId);
  if (!sched) return [];
  progressDay = Math.floor(Number(progressDay) || 0);
  var out = [];
  for (var d = 1; d <= progressDay && d <= sched.totalDays; d++) {
    var plan = sched.days[String(d)];
    if (plan && plan.new != null) out.push(Math.floor(Number(plan.new) || 0));
  }
  return out.filter(function (n) { return n > 0; });
}

function weightedSample(words, statsByWord, count, rng) {
  rng = typeof rng === "function" ? rng : Math.random;
  words = words || [];
  if (!words.length) return [];
  count = Math.max(0, Math.floor(Number(count) || 0));
  if (count >= words.length) return words.slice();

  var pool = words.map(function (w) {
    var word = String(w.word || w);
    var st = statsByWord[word];
    var wrong = st ? Math.max(0, Math.floor(Number(st.wrong_count) || 0)) : 0;
    return { word: w, weight: 1 + wrong * REVIEW_WEIGHT_FACTOR };
  });

  var picked = [];
  var used = {};
  while (picked.length < count && pool.length) {
    var total = 0;
    for (var i = 0; i < pool.length; i++) total += pool[i].weight;
    var r = rng() * total;
    var acc = 0;
    var idx = pool.length - 1;
    for (var j = 0; j < pool.length; j++) {
      acc += pool[j].weight;
      if (r <= acc) { idx = j; break; }
    }
    var choice = pool[idx];
    var key = String(choice.word.word || choice.word);
    if (!used[key]) {
      used[key] = true;
      picked.push(choice.word);
    }
    pool.splice(idx, 1);
  }
  return picked;
}

function drawReviewWords(allWords, statsRows, count, rng) {
  var statsByWord = {};
  (statsRows || []).forEach(function (r) {
    statsByWord[String(r.word)] = r;
  });
  return weightedSample(allWords, statsByWord, count || REVIEW_DRAW_SIZE, rng);
}

/** Client-readable summary: per-day plan + per-list new/review days. */
function buildPlanSummary(bookId) {
  var sched = loadSchedule(bookId);
  if (!sched) return null;
  var listIndex = {};
  var dayRows = [];
  for (var d = 1; d <= sched.totalDays; d++) {
    var plan = sched.days[String(d)];
    if (!plan) continue;
    var newL = plan.new == null ? null : Math.floor(Number(plan.new) || 0) || null;
    var revs = (plan.reviews || []).map(function (n) { return Math.floor(Number(n) || 0); }).filter(function (n) { return n > 0; });
    dayRows.push({ day: d, new: newL, reviews: revs });
    if (newL) {
      if (!listIndex[newL]) listIndex[newL] = { newDay: d, reviewDays: [] };
      listIndex[newL].newDay = d;
    }
    revs.forEach(function (r) {
      if (!listIndex[r]) listIndex[r] = { newDay: null, reviewDays: [] };
      listIndex[r].reviewDays.push(d);
    });
  }
  return {
    bookId: bookId,
    totalDays: sched.totalDays,
    totalLists: Object.keys(listIndex).length,
    dayRows: dayRows,
    listIndex: listIndex
  };
}

module.exports = {
  REVIEW_DRAW_SIZE: REVIEW_DRAW_SIZE,
  MAX_REVIEW_WRONG: MAX_REVIEW_WRONG,
  REVIEW_WEIGHT_FACTOR: REVIEW_WEIGHT_FACTOR,
  loadSchedule: loadSchedule,
  getDayPlan: getDayPlan,
  isEbbinghausBook: isEbbinghausBook,
  programComplete: programComplete,
  introducedListNos: introducedListNos,
  weightedSample: weightedSample,
  drawReviewWords: drawReviewWords,
  buildPlanSummary: buildPlanSummary
};
