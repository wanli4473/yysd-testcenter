#!/usr/bin/env node
"use strict";
/**
 * Minimal self-check for high-school dual-mode rules + enriched LIST1–5.
 */
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var hs = require("../server/hs-vocab");

hs.selfCheck();

assert.strictEqual(hs.clampCount(9), null);
assert.strictEqual(hs.clampCount(10), 10);
assert.strictEqual(hs.clampCount(200), 200);
assert.strictEqual(hs.clampCount(201), null);
assert.strictEqual(hs.formatGroupLabel("2026-01-02", "custom"), "1月2日·自定义");
assert.strictEqual(hs.formatGroupLabel("2026-01-03", "unit:1"), "1月3日·单元1");

var dir = path.join(__dirname, "../library/study/vocab");
for (var n = 1; n <= 5; n++) {
  var fp = path.join(dir, "高中单词LIST" + n + ".html");
  assert.ok(fs.existsSync(fp), "LIST" + n + " missing");
  var html = fs.readFileSync(fp, "utf8");
  var m = html.match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
  assert.ok(m, "wordData LIST" + n);
  var words = Function('"use strict"; return (' + m[1] + ");")();
  assert.ok(words.length > 0, "empty LIST" + n);
  var w = words[0];
  assert.ok(w.paraphrase && w.paraphrase.correct, "paraphrase LIST" + n);
  assert.ok(Array.isArray(w.collocations), "collocations LIST" + n);
  assert.ok(w.root, "root LIST" + n);
  assert.ok(w.examTag, "examTag LIST" + n);
}

["hs-vocab.html", "assets/js/hs-vocab-player.js", "assets/css/hs-vocab-player.css", "server/hs-vocab.js"].forEach(function (f) {
  assert.ok(fs.existsSync(path.join(__dirname, "..", f)), "missing " + f);
});

var vocabJs = fs.readFileSync(path.join(__dirname, "../assets/js/vocab.js"), "utf8");
assert.ok(vocabJs.indexOf("vocab-shelf.html") >= 0, "hub → shelf");
assert.ok(vocabJs.indexOf("view=unit") < 0, "legacy unit hub gone");

var player = fs.readFileSync(path.join(__dirname, "../assets/js/hs-vocab-player.js"), "utf8");
assert.ok(player.indexOf("/api/hs-vocab/") >= 0, "player API");
assert.ok(player.indexOf("vocab-shelf.html") >= 0, "player redirects shelf");

var wrong = fs.readFileSync(path.join(__dirname, "../assets/js/wrong-words.js"), "utf8");
assert.ok(wrong.indexOf("/api/vocab-shelf/wrongbook") >= 0, "unified wrongbook");

var hsHtml = fs.readFileSync(path.join(__dirname, "../hs-vocab.html"), "utf8");
assert.ok(hsHtml.indexOf("vocab-shelf.html") >= 0, "hs-vocab.html redirect");

// lock-batch rule: uncleared active blocks start (logic documented via 409 in server)
var src = fs.readFileSync(path.join(__dirname, "../server/hs-vocab.js"), "utf8");
assert.ok(src.indexOf("当前批次尚未通关") >= 0, "lock batch message");
assert.ok(src.indexOf("MIN_BATCH") >= 0 && src.indexOf("MAX_BATCH") >= 0, "count bounds");

// optional live API smoke (uses server/node_modules when present)
try {
  var Database = require("../server/node_modules/better-sqlite3");
  var express = require("../server/node_modules/express");
  var db = new Database(":memory:");
  hs.ensureSchema(db);
  var app = express();
  app.use(express.json());
  app.use(function (req, res, next) { req.user = { sub: 1 }; next(); });
  hs.mountRoutes(app, { db: db, authMiddleware: function (req, res, next) { next(); } });
  var srv = app.listen(0, function () {
    var port = srv.address().port;
    var base = "http://127.0.0.1:" + port;
    function j(p, o) {
      return fetch(base + p, Object.assign({ headers: { "Content-Type": "application/json" } }, o || {}))
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); });
    }
    j("/api/hs-vocab/custom/start", { method: "POST", body: JSON.stringify({ count: 50, bank_total: 100 }) })
      .then(function (r) {
        assert.strictEqual(r.status, 200);
        var bid = r.d.active_batch.id;
        return j("/api/hs-vocab/custom/start", { method: "POST", body: JSON.stringify({ count: 10, bank_total: 100 }) })
          .then(function (r2) {
            assert.strictEqual(r2.status, 409);
            return j("/api/hs-vocab/custom/finish", {
              method: "POST",
              body: JSON.stringify({ batch_id: bid, passed: true, mistakes: [] })
            });
          });
      })
      .then(function (r3) {
        assert.strictEqual(r3.d.status.cursor_idx, 50);
        srv.close();
        console.log("check_hs_vocab ok");
      })
      .catch(function (e) {
        srv.close();
        console.error(e);
        process.exit(1);
      });
  });
} catch (e) {
  console.log("check_hs_vocab ok (no server deps for live API)");
}
