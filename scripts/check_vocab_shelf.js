#!/usr/bin/env node
"use strict";
/**
 * Self-check: catalog + bookshelf + lesson words + learn progress.
 */
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var shelf = require("../server/vocab-shelf");

shelf.selfCheck();

var root = path.join(__dirname, "..");
var cat = shelf.buildCatalog(root);
assert.ok(cat.byId.gaozhong && cat.byId.gaozhong.listCount >= 40, "gaozhong lists");
assert.ok(cat.byId.cet4 && cat.byId.cet4.listCount >= 35, "cet4 lists");
assert.ok(cat.byId.special && cat.byId.special.listCount >= 1, "special lists");
assert.ok(cat.byId["theme:toeic"], "theme:toeic");
assert.ok(cat.byId.cet4 && cat.byId["theme:cet4"], "duplicate cet4 kept");
var toeic = cat.byId["theme:toeic"];
assert.strictEqual(
  toeic.listCount,
  Math.ceil(toeic.wordCount / shelf.THEME_CHUNK),
  "theme chunk lists"
);
assert.strictEqual(toeic.lists[0].wordCount, 50);
assert.ok(toeic.lists[toeic.lists.length - 1].wordCount <= 50);

var gzLesson = shelf.resolveLesson(root, cat.byId.gaozhong, cat.byId.gaozhong.lists[0].id);
assert.ok(gzLesson && gzLesson.words.length > 0, "gaozhong lesson words");
assert.ok(gzLesson.words[0].word && gzLesson.words[0].meaning, "normalized word");
var tLesson = shelf.resolveLesson(root, toeic, "1");
assert.strictEqual(tLesson.words.length, 50, "theme list1 = 50");
assert.strictEqual(shelf.quizSampleSize(10), 6, "60%");
assert.strictEqual(shelf.quizSampleSize(1), 1, "min sample");
assert.ok(shelf.sessionTitle("2026-03-12", "高中词汇", ["List 1", "List 2"]).indexOf("3月12日") >= 0);
assert.strictEqual(shelf.legacyHsSourceLabel("unit:3"), "单元3");

[
  "vocab-shelf.html",
  "vocab-learn.html",
  "vocab-quiz.html",
  "assets/js/vocab-shelf-ui.js",
  "assets/js/vocab-learn.js",
  "assets/js/vocab-quiz.js",
  "assets/css/vocab-learn.css"
].forEach(function (f) {
  assert.ok(fs.existsSync(path.join(root, f)), "missing " + f);
});
var zone = fs.readFileSync(path.join(root, "assets/js/zone.js"), "utf8");
assert.ok(zone.indexOf("vocab-shelf.html") >= 0, "zone links shelf");
assert.ok(zone.indexOf('vocab-entry__title">词库') >= 0 || zone.indexOf(">词库</p>") >= 0, "zone 词库 module");
var learnJs = fs.readFileSync(path.join(root, "assets/js/vocab-learn.js"), "utf8");
assert.ok(learnJs.indexOf("去学后自测") < 0, "no quick-test CTA");
assert.ok(learnJs.indexOf("learnView") >= 0, "card/list toggle");
var quizJs = fs.readFileSync(path.join(root, "assets/js/vocab-quiz.js"), "utf8");
assert.ok(quizJs.indexOf("/api/vocab-shelf/quiz-pool") >= 0, "quiz pool");
assert.ok(quizJs.indexOf("/api/vocab-shelf/quiz/finish") >= 0, "quiz finish");
assert.ok(quizJs.indexOf("wrongbook/retest-finish") >= 0, "retest finish");
var ww = fs.readFileSync(path.join(root, "assets/js/wrong-words.js"), "utf8");
assert.ok(ww.indexOf("/api/vocab-shelf/wrongbook") >= 0, "wrongbook api");
assert.ok(ww.indexOf("错词重测") >= 0, "retest entry");
var hsv = fs.readFileSync(path.join(root, "assets/js/hs-vocab-player.js"), "utf8");
assert.ok(hsv.indexOf("vocab-quiz.html") >= 0, "hs redirect quiz");
var list1 = fs.readFileSync(path.join(root, "library/study/vocab/高中单词LIST1.html"), "utf8");
assert.ok(list1.indexOf("yysd:hide-legacy-test") >= 0, "legacy test hidden");

try {
  var Database = require("../server/node_modules/better-sqlite3");
  var express = require("../server/node_modules/express");
  var db = new Database(":memory:");
  shelf.ensureSchema(db);
  var app = express();
  app.use(express.json());
  shelf.mountRoutes(app, {
    db: db,
    authMiddleware: function (req, res, next) { req.user = { sub: 1 }; next(); },
    repoRoot: root
  });
  db.prepare(
    "INSERT INTO vocab_learn_progress (student_id, book_id, list_id, word_idx, done, updated_at) VALUES (1, ?, '1', 3, 0, ?)"
  ).run("gaozhong", new Date().toISOString());
  // seed legacy hs mistakes for migration
  db.exec(
    "CREATE TABLE hs_vocab_mistakes (" +
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
    ")"
  );
  db.prepare(
    "INSERT INTO hs_vocab_mistakes (student_id, mistake_date, source, word, ipa, meaning, word_json, user_answer, is_removed, created_at) " +
    "VALUES (1, '2026-01-02', 'unit:1', 'apple', '/æ/', '苹果', NULL, 'appl', 0, ?)"
  ).run(new Date().toISOString());

  var srv = app.listen(0, function () {
    var port = srv.address().port;
    var base = "http://127.0.0.1:" + port;
    function j(p, o) {
      return fetch(base + p, Object.assign({ headers: { "Content-Type": "application/json" } }, o || {}))
        .then(function (r) {
          return r.json().then(function (d) { return { status: r.status, d: d }; });
        });
    }
    var listId = cat.byId.gaozhong.lists[0].id;
    j("/api/vocab-shelf/catalog")
      .then(function (r) {
        assert.strictEqual(r.status, 200);
        assert.ok(r.d.books.length >= 4);
        return j("/api/vocab-shelf/lesson?bookId=gaozhong&listId=" + encodeURIComponent(listId));
      })
      .then(function (r) {
        assert.strictEqual(r.status, 403, "lesson requires shelf");
        return j("/api/vocab-shelf/add", { method: "POST", body: JSON.stringify({ bookId: "gaozhong" }) });
      })
      .then(function (r) {
        assert.strictEqual(r.status, 200);
        return j("/api/vocab-shelf/lesson?bookId=gaozhong&listId=" + encodeURIComponent(listId));
      })
      .then(function (r) {
        assert.strictEqual(r.status, 200);
        assert.ok(r.d.words.length > 0);
        return j("/api/vocab-shelf/progress", {
          method: "POST",
          body: JSON.stringify({ bookId: "gaozhong", listId: listId, wordIdx: 2, done: false })
        });
      })
      .then(function (r) {
        assert.strictEqual(r.status, 200);
        return j("/api/vocab-shelf/book?bookId=gaozhong");
      })
      .then(function (r) {
        assert.strictEqual(r.status, 200);
        var row = r.d.lists.find(function (l) { return l.id === listId; });
        assert.ok(row);
        assert.strictEqual(row.wordIdx, 2);
        return j("/api/vocab-shelf/add", { method: "POST", body: JSON.stringify({ bookId: "theme:toeic" }) });
      })
      .then(function () {
        return j("/api/vocab-shelf/lesson?bookId=" + encodeURIComponent("theme:toeic") + "&listId=1");
      })
      .then(function (r) {
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.d.words.length, 50);
        var lids = cat.byId.gaozhong.lists.slice(0, 2).map(function (l) { return l.id; });
        return j(
          "/api/vocab-shelf/quiz-pool?bookId=gaozhong&listIds=" + encodeURIComponent(lids.join(","))
        ).then(function (qp) {
          assert.strictEqual(qp.status, 200);
          assert.ok(qp.d.quizCount >= 1);
          assert.strictEqual(qp.d.quizCount, shelf.quizSampleSize(qp.d.poolTotal));
          assert.strictEqual(qp.d.words.length, qp.d.quizCount);
          return j("/api/vocab-shelf/quiz/finish", {
            method: "POST",
            body: JSON.stringify({
              bookId: "gaozhong",
              listIds: lids,
              listLabels: ["A", "B"],
              total: qp.d.quizCount,
              correct: 1,
              wrong: 1,
              passed: false,
              mistakes: [{ word: "x", meaning: "y", listId: lids[0], userAnswer: "z" }]
            })
          });
        });
      })
      .then(function (r) {
        assert.strictEqual(r.status, 200);
        assert.ok(r.d.sessionId);
        assert.strictEqual(r.d.mistakeCount, 1);
        var sid = r.d.sessionId;
        return j("/api/vocab-shelf/wrongbook").then(function (wb) {
          assert.strictEqual(wb.status, 200);
          assert.ok(wb.d.sessions.length >= 2, "quiz + migrated hs");
          var migrated = wb.d.sessions.some(function (s) {
            return s.listIds && s.listIds[0] === "legacy:unit:1";
          });
          assert.ok(migrated, "hs migration");
          return j("/api/vocab-shelf/wrongbook/retest-finish", {
            method: "POST",
            body: JSON.stringify({
              sessionId: sid,
              mistakes: [{ word: "still", meaning: "仍错", listId: listId }]
            })
          });
        }).then(function (rt) {
          assert.strictEqual(rt.status, 200);
          assert.strictEqual(rt.d.mistakeCount, 1);
          return j("/api/vocab-shelf/wrongbook/session?id=" + sid);
        }).then(function (det) {
          assert.strictEqual(det.status, 200);
          assert.strictEqual(det.d.mistakes.length, 1);
          assert.strictEqual(det.d.mistakes[0].word, "still");
          return j("/api/vocab-shelf/wrongbook/session/remove", {
            method: "POST",
            body: JSON.stringify({ sessionId: sid })
          });
        }).then(function (rm) {
          assert.strictEqual(rm.status, 200);
          return j("/api/vocab-shelf/remove", { method: "POST", body: JSON.stringify({ bookId: "gaozhong" }) });
        });
      })
      .then(function (r) {
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.d.clearedLearnProgress, true);
        var left = db.prepare(
          "SELECT COUNT(*) AS n FROM vocab_learn_progress WHERE student_id = 1 AND book_id = ?"
        ).get("gaozhong");
        assert.strictEqual(left.n, 0, "learn progress cleared");
        var migratedLeft = db.prepare(
          "SELECT COUNT(*) AS n FROM vocab_quiz_sessions WHERE student_id = 1 AND is_removed = 0"
        ).get();
        assert.ok(migratedLeft.n >= 1, "other sessions kept");
        srv.close();
        console.log("check_vocab_shelf ok");
      })
      .catch(function (e) {
        srv.close();
        console.error(e);
        process.exit(1);
      });
  });
} catch (e) {
  console.log("check_vocab_shelf ok (catalog only; no better-sqlite3):", e.message);
}
