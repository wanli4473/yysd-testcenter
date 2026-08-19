"use strict";
/**
 * Teacher site-mode: shadow student user per teacher for full-site preview + gaozhong 闯关.
 */
var crypto = require("crypto");

var PILOT_BOOK = "gaozhong";

function previewPhone(teacherId) {
  var id = Math.max(1, Math.floor(Number(teacherId) || 0));
  return "199" + String(id).padStart(8, "0").slice(-8);
}

function ensureSchema(db) {
  try {
    db.exec("ALTER TABLE teachers ADD COLUMN preview_user_id INTEGER");
  } catch (e) {
    /* already exists */
  }
}

function getTeacher(db, teacherId) {
  return db
    .prepare("SELECT * FROM teachers WHERE id = ?")
    .get(Math.floor(Number(teacherId) || 0));
}

function ensurePreviewUser(db, stmts, teacher) {
  if (!teacher || !teacher.id) return null;
  if (teacher.preview_user_id) {
    var cached = stmts.findUserById.get(teacher.preview_user_id);
    if (cached) return cached;
  }
  var phone = previewPhone(teacher.id);
  var user = stmts.findUser.get(phone);
  var now = new Date().toISOString();
  if (!user) {
    var unusable = crypto.randomBytes(16).toString("hex") + ":" + crypto.randomBytes(64).toString("hex");
    stmts.insertUser.run(phone, unusable, now, now, teacher.org_id || null);
    user = stmts.findUser.get(phone);
    var label = String(teacher.name || "教师").trim().slice(0, 16) + "（体验）";
    if (user && label.length >= 2) {
      stmts.setDisplayName.run(label, phone);
      user = stmts.findUser.get(phone);
    }
  }
  if (user) {
    db.prepare("UPDATE teachers SET preview_user_id = ? WHERE id = ?").run(user.id, teacher.id);
  }
  return user;
}

function ensureGaozhongChallenge(db, vocabChallenge, studentId, teacherId) {
  if (!vocabChallenge || typeof vocabChallenge.assignBook !== "function") return;
  vocabChallenge.assignBook(db, {
    studentId: studentId,
    bookId: PILOT_BOOK,
    teacherId: teacherId
  });
}

/** Idempotent: preview user + 高中闯关布置（登录/注册/进入体验模式时调用） */
function provisionTeacher(db, stmts, vocabChallenge, teacher) {
  var t = teacher && teacher.id ? teacher : getTeacher(db, teacher);
  if (!t) return null;
  var user = ensurePreviewUser(db, stmts, t);
  if (user) ensureGaozhongChallenge(db, vocabChallenge, user.id, t.id);
  return user;
}

function mountRoutes(app, opts) {
  var db = opts.db;
  var stmts = opts.stmts;
  var teacherAuth = opts.teacherAuthMiddleware;
  var issueToken = opts.issueToken;
  var authUserPayload = opts.authUserPayload;
  var vocabChallenge = opts.vocabChallenge;
  ensureSchema(db);

  app.post("/api/teacher/site-mode/enter", teacherAuth, function (req, res) {
    var teacher = getTeacher(db, req.user.sub);
    if (!teacher) return res.status(404).json({ error: "教师不存在" });
    var user = provisionTeacher(db, stmts, vocabChallenge, teacher);
    if (!user) return res.status(500).json({ error: "无法创建体验账号" });
    var token = issueToken(user, user.phone);
    if (!token) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
    res.json({
      ok: true,
      token: token,
      user: authUserPayload(user),
      preview: true,
      bookId: PILOT_BOOK,
      redirect: "index.html"
    });
  });

  app.get("/api/teacher/site-mode/status", teacherAuth, function (req, res) {
    var teacher = getTeacher(db, req.user.sub);
    res.json({
      ok: true,
      hasPreview: !!(teacher && teacher.preview_user_id),
      bookId: PILOT_BOOK
    });
  });
}

function selfCheck(db, stmts, vocabChallenge) {
  ensureSchema(db);
  if (previewPhone(1) !== "19900000001" || previewPhone(26) !== "19900000026") {
    throw new Error("previewPhone format");
  }
  db.exec("DELETE FROM users WHERE phone LIKE '199%'");
  db.exec("DELETE FROM teachers WHERE phone = '19900000099'");
  db.prepare(
    "INSERT INTO teachers (phone, password_hash, name, created_at, last_login_at, org_id) " +
      "VALUES ('19900000099', 'x', 'Test', ?, ?, NULL)"
  ).run(new Date().toISOString(), new Date().toISOString());
  var teacher = db.prepare("SELECT * FROM teachers WHERE phone = '19900000099'").get();
  var user = provisionTeacher(db, stmts, vocabChallenge, teacher);
  if (!user || !user.id) throw new Error("provisionTeacher user");
  teacher = getTeacher(db, teacher.id);
  if (teacher.preview_user_id !== user.id) throw new Error("preview_user_id link");
  if (vocabChallenge && vocabChallenge.getAssignment) {
    var asg = vocabChallenge.getAssignment(db, user.id);
    if (!asg || asg.book_id !== PILOT_BOOK) throw new Error("gaozhong assign");
  }
  db.exec("DELETE FROM users WHERE id = " + user.id);
  db.exec("DELETE FROM teachers WHERE id = " + teacher.id);
}

module.exports = {
  PILOT_BOOK: PILOT_BOOK,
  previewPhone: previewPhone,
  ensureSchema: ensureSchema,
  provisionTeacher: provisionTeacher,
  mountRoutes: mountRoutes,
  selfCheck: selfCheck
};
