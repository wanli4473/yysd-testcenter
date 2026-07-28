#!/usr/bin/env node
"use strict";
/** E2E: run full diagnostic via API using DB for correct answers. */
var path = require("path");
var fs = require("fs");
var serverDir = path.join(__dirname, "..", "server");
var Database = require(path.join(serverDir, "node_modules", "better-sqlite3"));

var API = "http://127.0.0.1:3000";
var phone = "13800138001";
var password = "test1234";

function req(method, p, body, token) {
  var headers = { "Content-Type": "application/json", "X-Tenant-Slug": "yysd" };
  if (token) headers.Authorization = "Bearer " + token;
  return fetch(API + p, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined
  }).then(function (r) {
    return r.json().then(function (d) {
      if (!r.ok) throw new Error((d && d.error) || r.status);
      return d;
    });
  });
}

function parseJson(s, fb) {
  try { return s ? JSON.parse(s) : fb; } catch (e) { return fb; }
}

async function main() {
  var login = await req("POST", "/api/auth/login", { phone: phone, password: password });
  var token = login.token;
  console.log("logged in", login.user && login.user.phone);

  var start = await req("POST", "/api/diagnostic/start", { force: true }, token);
  var sid = start.session.session_id;
  console.log("session", sid);

  var db = new Database(path.join(serverDir, "data", "yysd.db"));
  var stagesDone = [];

  while (true) {
    var row = db.prepare("SELECT * FROM diagnostic_sessions WHERE id = ?").get(sid);
    if (!row || row.status !== "in_progress") break;
    var stage = row.current_stage;
    if (stage === "finished") break;
    var questions = parseJson(row.questions, {});
    var list = questions[stage] || [];
    var answered = db.prepare(
      "SELECT COUNT(*) AS n FROM diagnostic_answers WHERE session_id = ? AND stage = ?"
    ).get(sid, stage).n;

    var passRate = stage === "ielts" ? 0.72 : 0.9;
    for (var i = answered; i < list.length; i++) {
      var q = list[i];
      var correct = Math.random() < passRate;
      var ua = correct
        ? q.correct_answer
        : (q.question_type === "spelling" ? "zzzzwrong" : "___wrong___");
      if (!correct && q.options && q.options.length) {
        ua = q.options.find(function (o) { return o !== q.correct_answer; }) || ua;
      }
      await req("POST", "/api/diagnostic/session/" + sid + "/answer", {
        qid: q.qid,
        user_answer: ua,
        time_spent_seconds: 2,
        elapsed_seconds: (i + 1) * 3
      }, token);
    }

    var next = await req("POST", "/api/diagnostic/session/" + sid + "/next-stage", {
      elapsed_seconds: list.length * 3
    }, token);
    stagesDone.push({
      stage: stage,
      result: next.stage_result,
      next_action: next.next_action
    });
    console.log(
      stage,
      "acc=" + Math.round(next.stage_result.accuracy * 100) + "%",
      next.stage_result.rating,
      "passed=" + next.stage_result.is_passed,
      "→",
      next.next_action
    );
    if (next.next_action === "finish") {
      console.log("REPORT", JSON.stringify(next.report, null, 2));
      console.log("SESSION_ID", sid);
      fs.writeFileSync("/tmp/diag_e2e.json", JSON.stringify({
        session_id: sid,
        report: next.report,
        stages: stagesDone
      }, null, 2));
      break;
    }
  }

  var mistakes = await req("GET", "/api/diagnostic/mistakes", null, token);
  console.log("mistakes", (mistakes.mistakes || []).length);
  db.close();
}

main().catch(function (e) {
  console.error("E2E FAIL", e.message || e);
  process.exit(1);
});
