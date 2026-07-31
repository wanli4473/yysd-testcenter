#!/usr/bin/env node
/* ponytail: smoke-check for wrong-hub suite bucketing — fails if L+R homework no longer aggregates to mock */
"use strict";

function suiteBase(itemId) {
  return String(itemId || "").replace(/-reading$/, "").replace(/-writing$/, "");
}

function isLR(subject) {
  return subject === "cambridge-listening" || subject === "cambridge-reading";
}

function mockKeys(attempts) {
  var byEventSuite = {};
  attempts.forEach(function (a) {
    if (!isLR(a.subject)) return;
    if (a.cdt) {
      var k = "cdt|" + suiteBase(a.id) + "|" + (a.assignmentEventId || "") + "|" + String(a.date || "").slice(0, 10);
      byEventSuite[k] = byEventSuite[k] || { listening: false, reading: false, cdt: true };
      if (a.subject === "cambridge-listening") byEventSuite[k].listening = true;
      if (a.subject === "cambridge-reading") byEventSuite[k].reading = true;
      return;
    }
    if (!a.assignmentEventId) return;
    var k2 = "ev|" + a.assignmentEventId + "|" + suiteBase(a.id);
    byEventSuite[k2] = byEventSuite[k2] || { listening: false, reading: false, cdt: false };
    if (a.subject === "cambridge-listening") byEventSuite[k2].listening = true;
    if (a.subject === "cambridge-reading") byEventSuite[k2].reading = true;
  });
  var out = {};
  Object.keys(byEventSuite).forEach(function (k) {
    var g = byEventSuite[k];
    if (g.cdt || (g.listening && g.reading)) out[k] = 1;
  });
  return out;
}

function attemptMockKey(a, keys) {
  if (!isLR(a.subject)) return "";
  if (a.cdt) {
    var k = "cdt|" + suiteBase(a.id) + "|" + (a.assignmentEventId || "") + "|" + String(a.date || "").slice(0, 10);
    return keys[k] ? k : "";
  }
  if (!a.assignmentEventId) return "";
  var k2 = "ev|" + a.assignmentEventId + "|" + suiteBase(a.id);
  return keys[k2] ? k2 : "";
}

function bucket(attempts) {
  var keys = mockKeys(attempts);
  var listening = [];
  var reading = [];
  var mockN = 0;
  attempts.forEach(function (a) {
    var mk = attemptMockKey(a, keys);
    if (mk) { mockN++; return; }
    if (a.subject === "cambridge-listening") listening.push(a);
    else if (a.subject === "cambridge-reading") reading.push(a);
  });
  return { listening: listening.length, reading: reading.length, mockAttempts: mockN };
}

var sample = [
  { id: "cambridge-20-test-1", subject: "cambridge-listening", assignmentEventId: "9", wrong: [1], date: "2026-07-01" },
  { id: "cambridge-20-test-1-reading", subject: "cambridge-reading", assignmentEventId: "9", wrong: [1], date: "2026-07-01" },
  { id: "cambridge-21-test-2", subject: "cambridge-listening", assignmentEventId: "10", wrong: [1], date: "2026-07-02" },
  { id: "cambridge-19-test-1", subject: "cambridge-listening", cdt: true, wrong: [1], date: "2026-07-03" },
  { id: "cambridge-19-test-1-reading", subject: "cambridge-reading", cdt: true, wrong: [1], date: "2026-07-03" }
];

var b = bucket(sample);
if (b.listening !== 1) throw new Error("expected 1 standalone listening homework, got " + b.listening);
if (b.reading !== 0) throw new Error("expected 0 standalone reading, got " + b.reading);
if (b.mockAttempts !== 4) throw new Error("expected 4 mock-bucketed attempts, got " + b.mockAttempts);

console.log("ok: wrong-hub bucketing");
