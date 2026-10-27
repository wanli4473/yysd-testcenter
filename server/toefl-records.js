"use strict";
/**
 * 新托福做题记录：学生交卷写入，教师在题库中心「学生做题记录」读取。
 * 一条记录 = 一次交卷里的一个题块（练习）或一模考场次的一科。
 */
var fs = require("fs");
var path = require("path");

var KINDS = { practice: 1, mock: 1 };
var SKILLS = { reading: 1, listening: 1, writing: 1, speaking: 1 };
var AUDIO_MIME = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav"
};
var MAX_AUDIO = 2.5 * 1024 * 1024;
var MAX_PAYLOAD = 80 * 1024;
var MAX_BATCH = 40;

function nowIso() {
  return new Date().toISOString();
}

function clip(s, n) {
  s = String(s == null ? "" : s);
  return s.length > n ? s.slice(0, n) : s;
}

function ensureSchema(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS toefl_records (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "user_id INTEGER NOT NULL," +
      "kind TEXT NOT NULL," +
      "client_key TEXT NOT NULL," +
      "item_key TEXT NOT NULL," +
      "skill TEXT," +
      "paper_id TEXT," +
      "package_id TEXT," +
      "task_type TEXT," +
      "task_index INTEGER," +
      "sid TEXT," +
      "title TEXT," +
      "stem TEXT," +
      "payload TEXT NOT NULL," +
      "audio_rel TEXT," +
      "audio_mime TEXT," +
      "submitted_at TEXT NOT NULL," +
      "created_at TEXT NOT NULL," +
      "updated_at TEXT NOT NULL" +
    ");" +
    "CREATE UNIQUE INDEX IF NOT EXISTS toefl_records_user_client ON toefl_records (user_id, client_key);" +
    "CREATE INDEX IF NOT EXISTS toefl_records_user_kind ON toefl_records (user_id, kind, submitted_at);" +
    "CREATE INDEX IF NOT EXISTS toefl_records_user_item ON toefl_records (user_id, item_key, submitted_at);"
  );
}

function itemKeyOf(row) {
  var idx = String(row.taskIndex != null ? row.taskIndex : row.task_index);
  if (row.kind === "mock") {
    return "mock|" + String(row.packageId || row.package_id || "") + "|" + String(row.skill || "") + "|" + idx;
  }
  return "practice|" + String(row.skill || "") + "|" + String(row.paperId || row.paper_id || "") + "|" + idx;
}

function clientKeyOf(row) {
  return itemKeyOf(row) + "|" + String(row.sid || "");
}

function parsePayload(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
}

function sanitizeRecord(raw) {
  raw = raw || {};
  var kind = raw.kind === "mock" ? "mock" : "practice";
  var skill = SKILLS[raw.skill] ? raw.skill : "";
  if (kind === "mock" && !skill) return { error: "模考记录缺少科目" };
  if (kind === "practice" && !skill) return { error: "练习记录缺少科目" };
  var paperId = clip(raw.paperId || raw.paper_id, 80);
  var packageId = clip(raw.packageId || raw.package_id, 80);
  if (kind === "mock" && !packageId) packageId = paperId;
  var taskIndex = raw.taskIndex != null ? Number(raw.taskIndex) : (raw.task_index != null ? Number(raw.task_index) : 0);
  if (!isFinite(taskIndex)) taskIndex = 0;
  var sid = clip(raw.sid, 40) || String(Date.now());
  var submittedAt = raw.submittedAt || raw.submitted_at || nowIso();
  if (isNaN(Date.parse(submittedAt))) return { error: "交卷时间无效" };
  var items = Array.isArray(raw.items) ? raw.items.slice(0, 80).map(function (it) {
    it = it || {};
    return {
      no: it.no,
      ok: it.ok === true || it.ok === false ? it.ok : null,
      ua: clip(it.ua, 8000),
      expect: clip(it.expect, 4000),
      stem: clip(it.stem, 800),
      words: it.words != null && isFinite(Number(it.words)) ? Number(it.words) : undefined
    };
  }) : [];
  var payload = {
    items: items,
    score: raw.score != null && isFinite(Number(raw.score)) ? Number(raw.score) : null,
    total: raw.total != null && isFinite(Number(raw.total)) ? Number(raw.total) : null,
    band: raw.band != null && isFinite(Number(raw.band)) ? Number(raw.band) : null,
    recorded: raw.recorded != null ? !!raw.recorded : undefined,
    image: clip(raw.image, 240),
    titleZh: clip(raw.titleZh, 160)
  };
  var json = JSON.stringify(payload);
  if (json.length > MAX_PAYLOAD) return { error: "作答内容过长" };
  var row = {
    kind: kind,
    skill: skill,
    paperId: paperId,
    packageId: packageId,
    taskType: clip(raw.taskType || raw.task_type, 40),
    taskIndex: taskIndex,
    sid: sid,
    title: clip(raw.title, 160),
    stem: clip(raw.stem, 800),
    submittedAt: new Date(Date.parse(submittedAt)).toISOString(),
    payload: payload
  };
  row.itemKey = itemKeyOf(row);
  row.clientKey = clip(raw.clientKey || raw.client_key || clientKeyOf(row), 180);
  return { row: row };
}

function upsertRecords(db, userId, list) {
  if (!userId) return { error: "未登录" };
  if (!Array.isArray(list) || !list.length) return { error: "没有记录" };
  if (list.length > MAX_BATCH) return { error: "一次最多 " + MAX_BATCH + " 条" };
  var ins = db.prepare(
    "INSERT INTO toefl_records (user_id, kind, client_key, item_key, skill, paper_id, package_id, task_type, task_index, sid, title, stem, payload, submitted_at, created_at, updated_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
    "ON CONFLICT(user_id, client_key) DO UPDATE SET " +
      "title = excluded.title, stem = excluded.stem, payload = excluded.payload, " +
      "submitted_at = excluded.submitted_at, updated_at = excluded.updated_at " +
    "WHERE excluded.submitted_at >= toefl_records.submitted_at"
  );
  var out = [];
  var now = nowIso();
  var tx = db.transaction(function () {
    list.forEach(function (raw) {
      var got = sanitizeRecord(raw);
      if (got.error) throw new Error(got.error);
      var r = got.row;
      ins.run(
        userId, r.kind, r.clientKey, r.itemKey, r.skill, r.paperId, r.packageId,
        r.taskType, r.taskIndex, r.sid, r.title, r.stem, JSON.stringify(r.payload),
        r.submittedAt, now, now
      );
      var saved = db.prepare("SELECT id, client_key FROM toefl_records WHERE user_id = ? AND client_key = ?")
        .get(userId, r.clientKey);
      if (saved) out.push({ id: saved.id, clientKey: saved.client_key });
    });
  });
  try { tx(); } catch (e) { return { error: e.message || "写入失败" }; }
  return { ok: true, records: out };
}

function rowView(row, opts) {
  opts = opts || {};
  var payload = parsePayload(row.payload);
  var view = {
    id: row.id,
    kind: row.kind,
    clientKey: row.client_key,
    itemKey: row.item_key,
    skill: row.skill || "",
    paperId: row.paper_id || "",
    packageId: row.package_id || "",
    taskType: row.task_type || "",
    taskIndex: row.task_index,
    sid: row.sid || "",
    title: row.title || "",
    stem: row.stem || "",
    submittedAt: row.submitted_at,
    score: payload.score,
    total: payload.total,
    band: payload.band,
    recorded: payload.recorded,
    image: payload.image || "",
    hasAudio: !!row.audio_rel,
    ok: 0,
    wrong: 0,
    blank: 0
  };
  var items = payload.items || [];
  items.forEach(function (it) {
    if (it.ok === true) view.ok += 1;
    else if (it.ok === false) view.wrong += 1;
    else if (!String(it.ua || "").trim()) view.blank += 1;
  });
  if (opts.detail) {
    view.items = items;
    view.titleZh = payload.titleZh || "";
  }
  return view;
}

function listStudentRecords(db, userId, q) {
  q = q || {};
  var sql = "SELECT * FROM toefl_records WHERE user_id = ?";
  var args = [userId];
  if (q.kind && KINDS[q.kind]) {
    sql += " AND kind = ?";
    args.push(q.kind);
  }
  if (q.from) {
    sql += " AND submitted_at >= ?";
    args.push(q.from);
  }
  if (q.to) {
    sql += " AND submitted_at <= ?";
    args.push(q.to);
  }
  sql += " ORDER BY submitted_at DESC, id DESC";
  var stmt = db.prepare(sql);
  return stmt.all.apply(stmt, args).map(function (row) {
    return rowView(row, { detail: !!q.detail });
  });
}

function getRecord(db, id) {
  var row = db.prepare("SELECT * FROM toefl_records WHERE id = ?").get(id);
  return row || null;
}

function userStats(db, userId) {
  var rows = db.prepare(
    "SELECT kind, item_key, package_id, sid, submitted_at FROM toefl_records WHERE user_id = ?"
  ).all(userId);
  var practice = {};
  var mock = {};
  var lastAt = "";
  rows.forEach(function (r) {
    if (r.submitted_at && r.submitted_at > lastAt) lastAt = r.submitted_at;
    if (r.kind === "mock") mock[String(r.package_id || "") + "|" + String(r.sid || "")] = 1;
    else practice[r.item_key] = 1;
  });
  return {
    practiceCount: Object.keys(practice).length,
    mockCount: Object.keys(mock).length,
    lastAt: lastAt
  };
}

function attachStats(db, students) {
  return (students || []).map(function (s) {
    var st = userStats(db, s.id);
    return {
      id: s.id,
      displayName: s.displayName || s.display_name || "",
      phone: s.phone || "",
      lastLoginAt: s.lastLoginAt || s.last_login_at || null,
      lastAt: st.lastAt,
      practiceCount: st.practiceCount,
      mockCount: st.mockCount
    };
  });
}

function rangeFrom(key, nowMs) {
  nowMs = nowMs || Date.now();
  if (key === "7") return new Date(nowMs - 7 * 86400000).toISOString();
  if (key === "30") return new Date(nowMs - 30 * 86400000).toISOString();
  return "";
}

function pickDefaultKind(rows) {
  var latest = null;
  (rows || []).forEach(function (r) {
    if (!latest || String(r.submittedAt || "") > String(latest.submittedAt || "")) latest = r;
  });
  return latest && latest.kind === "mock" ? "mock" : "practice";
}

function latestByItem(rows) {
  var map = {};
  (rows || []).forEach(function (r) {
    var k = r.itemKey;
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  Object.keys(map).forEach(function (k) {
    map[k].sort(function (a, b) {
      return String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")) || (b.id - a.id);
    });
  });
  return map;
}

function groupMockSessions(rows) {
  var map = {};
  (rows || []).filter(function (r) { return r.kind === "mock"; }).forEach(function (r) {
    var k = String(r.packageId || "") + "|" + String(r.sid || "");
    if (!map[k]) {
      map[k] = {
        key: k,
        packageId: r.packageId,
        sid: r.sid,
        title: r.title || r.packageId,
        submittedAt: r.submittedAt,
        sections: {}
      };
    }
    map[k].sections[r.skill] = r;
    if (r.submittedAt > map[k].submittedAt) {
      map[k].submittedAt = r.submittedAt;
      if (r.title) map[k].title = r.title;
    }
  });
  return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
    return String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""));
  });
}

function decodeAudio(data, mime) {
  mime = String(mime || "").split(";")[0].trim().toLowerCase();
  var ext = AUDIO_MIME[mime];
  if (!ext) return { error: "不支持的音频格式" };
  var raw = String(data || "");
  var comma = raw.indexOf(",");
  if (raw.indexOf("data:") === 0 && comma > 0) raw = raw.slice(comma + 1);
  var buf;
  try { buf = Buffer.from(raw, "base64"); } catch (e) { return { error: "音频无法解码" }; }
  if (!buf.length) return { error: "音频是空的" };
  if (buf.length > MAX_AUDIO) return { error: "录音超过大小限制" };
  return { buf: buf, mime: mime, ext: ext };
}

function saveAudio(db, dataDir, userId, clientKey, mime, data) {
  var rec = db.prepare("SELECT * FROM toefl_records WHERE user_id = ? AND client_key = ?").get(userId, clientKey);
  if (!rec) return { error: "先交卷再传录音" };
  var dec = decodeAudio(data, mime || rec.audio_mime);
  if (dec.error) return dec;
  var dir = path.join(dataDir, "toefl-audio", String(userId));
  fs.mkdirSync(dir, { recursive: true });
  var rel = String(userId) + "/" + rec.id + "." + dec.ext;
  fs.writeFileSync(path.join(dataDir, "toefl-audio", rel), dec.buf);
  db.prepare("UPDATE toefl_records SET audio_rel = ?, audio_mime = ?, updated_at = ? WHERE id = ?")
    .run(rel, dec.mime, nowIso(), rec.id);
  return { ok: true, id: rec.id };
}

function audioAbs(dataDir, rec) {
  if (!rec || !rec.audio_rel) return "";
  var rel = String(rec.audio_rel).replace(/\\/g, "/");
  if (rel.indexOf("..") >= 0 || rel.charAt(0) === "/" || rel.indexOf(":") >= 0) return "";
  return path.join(dataDir, "toefl-audio", rel);
}

function mountStudentRoutes(app, deps) {
  var db = deps.db;
  var dataDir = deps.dataDir;
  ensureSchema(db);

  app.post("/api/toefl/records", deps.authMiddleware, function (req, res) {
    if (req.user && req.user.role === "teacher") {
      return res.status(403).json({ error: "教师账号不上传做题记录" });
    }
    var list = (req.body && req.body.records) || [];
    var saved = upsertRecords(db, req.user.sub, list);
    if (saved.error) return res.status(400).json({ error: saved.error });
    var audio = (req.body && req.body.audio) || [];
    var audioOut = [];
    if (Array.isArray(audio)) {
      audio.slice(0, MAX_BATCH).forEach(function (a) {
        if (!a || !a.clientKey) return;
        var r = saveAudio(db, dataDir, req.user.sub, a.clientKey, a.mime, a.data);
        audioOut.push({ clientKey: a.clientKey, ok: !r.error, error: r.error || "" });
      });
    }
    res.json({ ok: true, records: saved.records, audio: audioOut });
  });
}

function selfCheck() {
  var Database = require("better-sqlite3");
  var os = require("os");
  var db = new Database(":memory:");
  ensureSchema(db);
  var eq = function (got, want, what) {
    if (got !== want) throw new Error("toefl-records selfCheck: " + what + " got " + JSON.stringify(got) + " want " + JSON.stringify(want));
  };
  var a = upsertRecords(db, 1, [{
    kind: "practice", skill: "reading", paperId: "set-1", taskType: "complete_words",
    taskIndex: 2, sid: "s1", title: "填词", stem: "The bird ___",
    items: [{ no: 1, ok: true, ua: "flew", expect: "flew", stem: "The bird ___" }],
    score: 1, total: 1, submittedAt: "2026-10-20T08:00:00.000Z"
  }]);
  if (!a.ok) throw new Error("upsert " + a.error);
  eq(a.records.length, 1, "one row");
  var again = upsertRecords(db, 1, [{
    kind: "practice", skill: "reading", paperId: "set-1", taskType: "complete_words",
    taskIndex: 2, sid: "s1", title: "填词", items: [{ no: 1, ok: false, ua: "fly", expect: "flew" }],
    score: 0, total: 1, submittedAt: "2026-10-20T07:00:00.000Z"
  }]);
  if (!again.ok) throw new Error(again.error);
  var first = getRecord(db, a.records[0].id);
  eq(parsePayload(first.payload).score, 1, "older retry must not overwrite");
  upsertRecords(db, 1, [{
    kind: "practice", skill: "reading", paperId: "set-1", taskType: "complete_words",
    taskIndex: 2, sid: "s2", title: "填词", items: [{ no: 1, ok: false, ua: "fly", expect: "flew" }],
    score: 0, total: 1, submittedAt: "2026-10-21T08:00:00.000Z"
  }]);
  var listed = listStudentRecords(db, 1, { kind: "practice" });
  eq(listed.length, 2, "history kept");
  var grouped = latestByItem(listed);
  eq(grouped[listed[0].itemKey].length, 2, "same item two attempts");
  eq(grouped[listed[0].itemKey][0].sid, "s2", "latest first");
  upsertRecords(db, 1, [
    { kind: "mock", skill: "reading", packageId: "2025-07-16", paperId: "2025-07-16", sid: "m1", title: "7.16", score: 18, total: 20, submittedAt: "2026-10-22T08:00:00.000Z" },
    { kind: "mock", skill: "listening", packageId: "2025-07-16", paperId: "2025-07-16", sid: "m1", title: "7.16", score: 16, total: 20, submittedAt: "2026-10-22T08:20:00.000Z" }
  ]);
  var sessions = groupMockSessions(listStudentRecords(db, 1, { kind: "mock" }));
  eq(sessions.length, 1, "one mock session");
  eq(!!sessions[0].sections.reading && !!sessions[0].sections.listening, true, "two sections");
  var st = userStats(db, 1);
  eq(st.practiceCount, 1, "distinct practice items");
  eq(st.mockCount, 1, "distinct mock sessions");
  eq(pickDefaultKind(listStudentRecords(db, 1)), "mock", "default kind follows latest");
  var week = listStudentRecords(db, 1, { from: rangeFrom("7", Date.parse("2026-10-27T00:00:00.000Z")) });
  if (week.length < 2) throw new Error("range filter");
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "yysd-rec-"));
  var wav = Buffer.from("RIFF").toString("base64");
  var bad = saveAudio(db, tmp, 1, "nope", "audio/wav", wav);
  if (!bad.error) throw new Error("audio needs record");
  var key = a.records[0].clientKey;
  var okAudio = saveAudio(db, tmp, 1, key, "audio/wav", wav);
  if (!okAudio.ok) throw new Error("audio " + okAudio.error);
  var rec = getRecord(db, okAudio.id);
  if (!fs.existsSync(audioAbs(tmp, rec))) throw new Error("audio file");
  var deny = sanitizeRecord({ kind: "practice", skill: "math" });
  if (!deny.error) throw new Error("bad skill");
  db.close();
}

if (require.main === module) selfCheck();

module.exports = {
  KINDS: KINDS,
  ensureSchema: ensureSchema,
  itemKeyOf: itemKeyOf,
  clientKeyOf: clientKeyOf,
  sanitizeRecord: sanitizeRecord,
  upsertRecords: upsertRecords,
  listStudentRecords: listStudentRecords,
  getRecord: getRecord,
  userStats: userStats,
  attachStats: attachStats,
  rangeFrom: rangeFrom,
  pickDefaultKind: pickDefaultKind,
  latestByItem: latestByItem,
  groupMockSessions: groupMockSessions,
  saveAudio: saveAudio,
  audioAbs: audioAbs,
  rowView: rowView,
  mountStudentRoutes: mountStudentRoutes,
  selfCheck: selfCheck
};
