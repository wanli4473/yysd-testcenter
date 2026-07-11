"use strict";

require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const Dysmsapi20170525 = require("@alicloud/dysmsapi20170525");
const { SendSmsRequest } = Dysmsapi20170525;
const OpenApi = require("@alicloud/openapi-client");

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "";
const TEACHER_REGISTER_KEY = process.env.TEACHER_REGISTER_KEY || "";
const SMS_DEV = process.env.SMS_DEV_MODE === "1";
const ORIGINS = (process.env.CORS_ORIGINS ||
  "https://youyisida.com,https://www.youyisida.com,http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:8765,http://localhost:8765")
  .split(",")
  .map(function (s) { return s.trim(); })
  .filter(Boolean);

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.warn("[yysd-api] JWT_SECRET 未设置或过短，请在 .env 中配置。");
}

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "yysd.db"));

db.exec(
  "CREATE TABLE IF NOT EXISTS users (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "phone TEXT NOT NULL UNIQUE," +
  "created_at TEXT NOT NULL," +
  "last_login_at TEXT" +
  ");" +
  "CREATE TABLE IF NOT EXISTS sms_codes (" +
  "phone TEXT NOT NULL," +
  "code TEXT NOT NULL," +
  "expires_at INTEGER NOT NULL," +
  "created_at INTEGER NOT NULL" +
  ");" +
  "CREATE TABLE IF NOT EXISTS user_scores (" +
  "user_id INTEGER NOT NULL," +
  "item_id TEXT NOT NULL," +
  "payload TEXT NOT NULL," +
  "updated_at TEXT NOT NULL," +
  "PRIMARY KEY (user_id, item_id)" +
  ");" +
  "CREATE TABLE IF NOT EXISTS teachers (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "phone TEXT NOT NULL UNIQUE," +
  "password_hash TEXT NOT NULL," +
  "name TEXT," +
  "created_at TEXT NOT NULL," +
  "last_login_at TEXT" +
  ");"
);

try { db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT"); } catch (e) { /* already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN display_name TEXT"); } catch (e) { /* already exists */ }

const stmts = {
  upsertCode: db.prepare(
    "INSERT INTO sms_codes (phone, code, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ),
  latestCode: db.prepare(
    "SELECT code, expires_at FROM sms_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1"
  ),
  findUser: db.prepare("SELECT id, phone, password_hash, display_name, created_at, last_login_at FROM users WHERE phone = ?"),
  insertUser: db.prepare(
    "INSERT INTO users (phone, password_hash, created_at, last_login_at) VALUES (?, ?, ?, ?)"
  ),
  setPassword: db.prepare("UPDATE users SET password_hash = ?, last_login_at = ? WHERE phone = ?"),
  setPasswordHash: db.prepare("UPDATE users SET password_hash = ? WHERE phone = ?"),
  setDisplayName: db.prepare("UPDATE users SET display_name = ? WHERE phone = ?"),
  touchLogin: db.prepare("UPDATE users SET last_login_at = ? WHERE phone = ?"),
  listScores: db.prepare("SELECT item_id, payload, updated_at FROM user_scores WHERE user_id = ?"),
  upsertScore: db.prepare(
    "INSERT INTO user_scores (user_id, item_id, payload, updated_at) VALUES (?, ?, ?, ?) " +
    "ON CONFLICT(user_id, item_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at " +
    "WHERE excluded.updated_at >= user_scores.updated_at"
  ),
  findTeacher: db.prepare("SELECT id, phone, password_hash, name, created_at, last_login_at FROM teachers WHERE phone = ?"),
  insertTeacher: db.prepare(
    "INSERT INTO teachers (phone, password_hash, name, created_at, last_login_at) VALUES (?, ?, ?, ?, ?)"
  ),
  touchTeacherLogin: db.prepare("UPDATE teachers SET last_login_at = ? WHERE phone = ?"),
  setTeacherPasswordHash: db.prepare("UPDATE teachers SET password_hash = ? WHERE phone = ?"),
  listStudents: db.prepare(
    "SELECT u.id, u.phone, u.display_name, u.created_at, u.last_login_at, " +
    "COUNT(s.item_id) AS score_count, MAX(s.updated_at) AS last_score_at " +
    "FROM users u LEFT JOIN user_scores s ON s.user_id = u.id " +
    "GROUP BY u.id ORDER BY COALESCE(MAX(s.updated_at), u.last_login_at, u.created_at) DESC"
  ),
  listStudentScores: db.prepare(
    "SELECT item_id, payload, updated_at FROM user_scores WHERE user_id = ? ORDER BY updated_at DESC"
  )
};

function normalizePhone(raw) {
  var p = String(raw || "").replace(/\D/g, "");
  if (!/^1\d{10}$/.test(p)) return null;
  return p;
}

function genCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashPassword(password) {
  var salt = crypto.randomBytes(16);
  var hash = crypto.scryptSync(password, salt, 64);
  return salt.toString("hex") + ":" + hash.toString("hex");
}

function verifyPassword(password, stored) {
  if (!stored || stored.indexOf(":") < 0) return false;
  var parts = stored.split(":");
  var salt = Buffer.from(parts[0], "hex");
  var expect = Buffer.from(parts[1], "hex");
  var hash = crypto.scryptSync(password, salt, 64);
  if (hash.length !== expect.length) return false;
  return crypto.timingSafeEqual(hash, expect);
}

function validatePassword(password) {
  var p = String(password || "");
  if (p.length < 6) return "密码至少 6 位";
  if (p.length > 64) return "密码过长";
  return "";
}

function validateDisplayName(name) {
  var n = String(name || "").trim();
  if (n.length < 2) return "用户名至少 2 个字符";
  if (n.length > 20) return "用户名不能超过 20 个字符";
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9·._-]+$/.test(n)) return "用户名仅支持中英文、数字及 ·._-";
  return "";
}

function verifySmsCode(phone, code) {
  var row = stmts.latestCode.get(phone);
  if (!row || row.code !== code || row.expires_at < Date.now()) return false;
  return true;
}

function issueToken(user, phone) {
  if (!JWT_SECRET || JWT_SECRET.length < 16) return null;
  return jwt.sign({ sub: user.id, phone: phone, role: "student" }, JWT_SECRET, { expiresIn: "30d" });
}

function issueTeacherToken(teacher, phone) {
  if (!JWT_SECRET || JWT_SECRET.length < 16) return null;
  return jwt.sign({ sub: teacher.id, phone: phone, role: "teacher" }, JWT_SECRET, { expiresIn: "30d" });
}

function verifyTeacherKey(key) {
  if (!TEACHER_REGISTER_KEY) return false;
  var a = Buffer.from(String(key || ""));
  var b = Buffer.from(TEACHER_REGISTER_KEY);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function authUserPayload(user) {
  return {
    id: user.id,
    phone: maskPhone(user.phone),
    displayName: user.display_name || "",
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at
  };
}

function smsClient() {
  if (!process.env.ALIYUN_ACCESS_KEY_ID || !process.env.ALIYUN_ACCESS_KEY_SECRET) return null;
  var cfg = new OpenApi.Config({
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    endpoint: "dysmsapi.aliyuncs.com"
  });
  return new Dysmsapi20170525.default(cfg);
}

async function sendSms(phone, code) {
  if (SMS_DEV) {
    console.log("[yysd-api] SMS_DEV_MODE 验证码 " + phone + " -> " + code);
    return;
  }
  var client = smsClient();
  if (!client) throw new Error("短信未配置 AccessKey");
  var sign = process.env.SMS_SIGN_NAME;
  var tpl = process.env.SMS_TEMPLATE_CODE;
  if (!sign || !tpl) throw new Error("短信签名或模板未配置");
  await client.sendSms(new SendSmsRequest({
    phoneNumbers: phone,
    signName: sign,
    templateCode: tpl,
    templateParam: JSON.stringify({ code: code })
  }));
}

// ponytail: in-memory rate limit; single ECS process only
var sendLog = {};
function canSend(phone) {
  var now = Date.now();
  var row = sendLog[phone] || { last: 0, day: "", count: 0 };
  var today = new Date().toISOString().slice(0, 10);
  if (row.day !== today) { row.day = today; row.count = 0; }
  if (now - row.last < 60000) return { ok: false, msg: "请 60 秒后再试" };
  if (row.count >= 10) return { ok: false, msg: "今日验证码次数已达上限" };
  row.last = now;
  row.count += 1;
  sendLog[phone] = row;
  return { ok: true };
}

function authMiddleware(req, res, next) {
  var h = req.headers.authorization || "";
  var token = h.indexOf("Bearer ") === 0 ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "未登录" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }
}

function teacherAuthMiddleware(req, res, next) {
  var h = req.headers.authorization || "";
  var token = h.indexOf("Bearer ") === 0 ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "未登录" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (req.user.role !== "teacher") return res.status(403).json({ error: "请使用教师账号登录" });
    next();
  } catch (e) {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }
}

const app = express();
app.use(express.json({ limit: "32kb" }));
app.use(cors({
  origin: function (origin, cb) {
    if (!origin || ORIGINS.indexOf(origin) !== -1) return cb(null, true);
    return cb(null, false);
  }
}));

var DASHSCOPE_KEY = process.env.DASHSCOPE_API_KEY || "";
var DASHSCOPE_MODEL = process.env.DASHSCOPE_MODEL || "qwen-turbo";
var DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

app.get("/api/health", function (req, res) {
  res.json({ ok: true, service: "yysd-api", ai: !!DASHSCOPE_KEY });
});

// ngrok 内测：网页与 API 同端口，别人通过一个链接即可测试 AI 精听
app.get("/test/jingting", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "library", "practice", "jingting", "cam20-test1-section1.html"));
});

app.get("/test/speaking", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "speaking-select.html"));
});

app.post("/api/auth/send-code", async function (req, res) {
  var phone = normalizePhone(req.body && req.body.phone);
  var purpose = String((req.body && req.body.purpose) || "register").trim();
  if (!phone) return res.status(400).json({ error: "请输入正确的手机号" });
  if (purpose === "register") {
    var existing = stmts.findUser.get(phone);
    if (existing && existing.password_hash) {
      return res.status(400).json({ error: "该手机号已注册，请直接登录" });
    }
  }
  if (purpose === "reset") {
    var userForReset = stmts.findUser.get(phone);
    var teacherForReset = stmts.findTeacher.get(phone);
    var hasAccount = (userForReset && userForReset.password_hash) ||
      (teacherForReset && teacherForReset.password_hash);
    if (!hasAccount) {
      return res.status(400).json({ error: "该手机号未注册" });
    }
  }
  var gate = canSend(phone);
  if (!gate.ok) return res.status(429).json({ error: gate.msg });

  var code = genCode();
  var now = Date.now();
  stmts.upsertCode.run(phone, code, now + 5 * 60 * 1000, now);

  try {
    await sendSms(phone, code);
    res.json({ ok: true, message: "验证码已发送" });
  } catch (e) {
    console.error("[yysd-api] sendSms", e.message);
    res.status(502).json({ error: "短信发送失败，请稍后再试" });
  }
});

app.post("/api/auth/register", function (req, res) {
  var phone = normalizePhone(req.body && req.body.phone);
  var code = String((req.body && req.body.code) || "").trim();
  var password = String((req.body && req.body.password) || "");
  var confirm = String((req.body && req.body.confirm) || "");
  if (!phone || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "手机号或验证码格式不正确" });
  }
  var pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  if (password !== confirm) return res.status(400).json({ error: "两次密码不一致" });
  if (!verifySmsCode(phone, code)) {
    return res.status(400).json({ error: "验证码错误或已过期" });
  }

  var existing = stmts.findUser.get(phone);
  if (existing && existing.password_hash) {
    return res.status(400).json({ error: "该手机号已注册，请直接登录" });
  }

  var nowIso = new Date().toISOString();
  var hash = hashPassword(password);
  if (existing) {
    stmts.setPassword.run(hash, nowIso, phone);
  } else {
    stmts.insertUser.run(phone, hash, nowIso, nowIso);
  }
  var user = stmts.findUser.get(phone);
  var token = issueToken(user, phone);
  if (!token) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });

  res.json({ ok: true, token: token, user: authUserPayload(user) });
});

app.post("/api/auth/login", function (req, res) {
  var phone = normalizePhone(req.body && req.body.phone);
  var password = String((req.body && req.body.password) || "");
  if (!phone) return res.status(400).json({ error: "请输入正确的手机号" });
  var pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  var user = stmts.findUser.get(phone);
  if (user && user.password_hash) {
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(400).json({ error: "手机号或密码错误" });
    }
    var nowIso = new Date().toISOString();
    stmts.touchLogin.run(nowIso, phone);
    user.last_login_at = nowIso;
    var studentToken = issueToken(user, phone);
    if (!studentToken) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
    return res.json({ ok: true, token: studentToken, role: "student", user: authUserPayload(user) });
  }

  var teacher = stmts.findTeacher.get(phone);
  if (teacher && teacher.password_hash && verifyPassword(password, teacher.password_hash)) {
    var tNow = new Date().toISOString();
    stmts.touchTeacherLogin.run(tNow, phone);
    teacher.last_login_at = tNow;
    var teacherToken = issueTeacherToken(teacher, phone);
    if (!teacherToken) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
    return res.json({
      ok: true,
      token: teacherToken,
      role: "teacher",
      teacher: { id: teacher.id, phone: maskPhone(phone), name: teacher.name || "" }
    });
  }

  return res.status(400).json({ error: "手机号或密码错误" });
});

app.post("/api/auth/reset-password", function (req, res) {
  var phone = normalizePhone(req.body && req.body.phone);
  var code = String((req.body && req.body.code) || "").trim();
  var password = String((req.body && req.body.password) || "");
  var confirm = String((req.body && req.body.confirm) || "");
  if (!phone || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "手机号或验证码格式不正确" });
  }
  var pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  if (password !== confirm) return res.status(400).json({ error: "两次密码不一致" });
  if (!verifySmsCode(phone, code)) {
    return res.status(400).json({ error: "验证码错误或已过期" });
  }

  var user = stmts.findUser.get(phone);
  var teacher = stmts.findTeacher.get(phone);
  var hasAccount = (user && user.password_hash) || (teacher && teacher.password_hash);
  if (!hasAccount) return res.status(400).json({ error: "该手机号未注册" });

  var hash = hashPassword(password);
  if (user && user.password_hash) stmts.setPasswordHash.run(hash, phone);
  if (teacher && teacher.password_hash) stmts.setTeacherPasswordHash.run(hash, phone);
  res.json({ ok: true, message: "密码已重置，请使用新密码登录" });
});

app.post("/api/auth/change-password", authMiddleware, function (req, res) {
  var oldPassword = String((req.body && req.body.oldPassword) || "");
  var password = String((req.body && req.body.password) || "");
  var confirm = String((req.body && req.body.confirm) || "");
  var oldErr = validatePassword(oldPassword);
  if (oldErr) return res.status(400).json({ error: "请输入当前密码" });
  var pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  if (password !== confirm) return res.status(400).json({ error: "两次新密码不一致" });
  if (oldPassword === password) {
    return res.status(400).json({ error: "新密码不能与当前密码相同" });
  }

  if (req.user.role === "teacher") {
    var teacher = stmts.findTeacher.get(req.user.phone);
    if (!teacher || !teacher.password_hash) {
      return res.status(404).json({ error: "账号不存在" });
    }
    if (!verifyPassword(oldPassword, teacher.password_hash)) {
      return res.status(400).json({ error: "当前密码不正确" });
    }
    stmts.setTeacherPasswordHash.run(hashPassword(password), req.user.phone);
    return res.json({ ok: true, message: "密码已修改" });
  }

  var user = stmts.findUser.get(req.user.phone);
  if (!user || !user.password_hash) {
    return res.status(404).json({ error: "账号不存在" });
  }
  if (!verifyPassword(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: "当前密码不正确" });
  }
  stmts.setPasswordHash.run(hashPassword(password), req.user.phone);
  res.json({ ok: true, message: "密码已修改" });
});

app.get("/api/auth/me", authMiddleware, function (req, res) {
  if (req.user.role === "teacher") {
    var teacher = stmts.findTeacher.get(req.user.phone);
    if (!teacher) return res.status(404).json({ error: "用户不存在" });
    return res.json({
      ok: true,
      user: {
        id: teacher.id,
        phone: maskPhone(teacher.phone),
        name: teacher.name || "",
        role: "teacher",
        createdAt: teacher.created_at,
        lastLoginAt: teacher.last_login_at
      }
    });
  }
  var user = stmts.findUser.get(req.user.phone);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  res.json({
    ok: true,
    user: {
      id: user.id,
      phone: maskPhone(user.phone),
      displayName: user.display_name || "",
      role: "student",
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    }
  });
});

app.patch("/api/auth/profile", authMiddleware, function (req, res) {
  if (req.user.role === "teacher") {
    return res.status(403).json({ error: "教师请使用教师端注册时的姓名" });
  }
  var displayName = String((req.body && req.body.displayName) || "").trim();
  var nameErr = validateDisplayName(displayName);
  if (nameErr) return res.status(400).json({ error: nameErr });
  stmts.setDisplayName.run(displayName, req.user.phone);
  var user = stmts.findUser.get(req.user.phone);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  res.json({ ok: true, user: authUserPayload(user) });
});

app.post("/api/teacher/register", function (req, res) {
  var phone = normalizePhone(req.body && req.body.phone);
  var password = String((req.body && req.body.password) || "");
  var confirm = String((req.body && req.body.confirm) || "");
  var teacherKey = String((req.body && req.body.teacherKey) || "");
  var name = String((req.body && req.body.name) || "").trim().slice(0, 40);
  if (!phone) return res.status(400).json({ error: "请输入正确的手机号" });
  if (!verifyTeacherKey(teacherKey)) {
    return res.status(403).json({ error: "教师注册密钥不正确" });
  }
  var pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  if (password !== confirm) return res.status(400).json({ error: "两次密码不一致" });
  if (stmts.findTeacher.get(phone)) {
    return res.status(400).json({ error: "该手机号已注册教师账号，请直接登录" });
  }
  if (stmts.findUser.get(phone) && stmts.findUser.get(phone).password_hash) {
    return res.status(400).json({ error: "该手机号已注册为学生账号，请使用其他手机号" });
  }

  var nowIso = new Date().toISOString();
  var hash = hashPassword(password);
  stmts.insertTeacher.run(phone, hash, name || null, nowIso, nowIso);
  var teacher = stmts.findTeacher.get(phone);
  var token = issueTeacherToken(teacher, phone);
  if (!token) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
  res.json({
    ok: true,
    token: token,
    teacher: { id: teacher.id, phone: maskPhone(phone), name: teacher.name || "" }
  });
});

app.post("/api/teacher/login", function (req, res) {
  var phone = normalizePhone(req.body && req.body.phone);
  var password = String((req.body && req.body.password) || "");
  if (!phone) return res.status(400).json({ error: "请输入正确的手机号" });
  var pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  var teacher = stmts.findTeacher.get(phone);
  if (!teacher || !teacher.password_hash) {
    return res.status(400).json({ error: "教师账号未注册" });
  }
  if (!verifyPassword(password, teacher.password_hash)) {
    return res.status(400).json({ error: "手机号或密码错误" });
  }

  var nowIso = new Date().toISOString();
  stmts.touchTeacherLogin.run(nowIso, phone);
  teacher.last_login_at = nowIso;

  var token = issueTeacherToken(teacher, phone);
  if (!token) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
  res.json({
    ok: true,
    token: token,
    teacher: { id: teacher.id, phone: maskPhone(phone), name: teacher.name || "" }
  });
});

app.get("/api/teacher/me", teacherAuthMiddleware, function (req, res) {
  var teacher = stmts.findTeacher.get(req.user.phone);
  if (!teacher) return res.status(404).json({ error: "教师不存在" });
  res.json({
    ok: true,
    teacher: {
      id: teacher.id,
      phone: maskPhone(teacher.phone),
      name: teacher.name || "",
      createdAt: teacher.created_at,
      lastLoginAt: teacher.last_login_at
    }
  });
});

function parseScorePayload(row) {
  var rec = null;
  try { rec = JSON.parse(row.payload); } catch (e) { rec = null; }
  if (!rec || typeof rec !== "object") rec = {};
  return {
    id: row.item_id,
    title: clipText(rec.title, 200),
    zone: clipText(rec.zone, 40),
    subject: clipText(rec.subject, 60),
    score: rec.score != null ? rec.score : null,
    total: rec.total != null ? rec.total : null,
    band: rec.band != null ? rec.band : null,
    writingWords: rec.writingWords != null ? rec.writingWords : null,
    date: clipText(rec.date, 40) || row.updated_at,
    updatedAt: row.updated_at
  };
}

app.get("/api/teacher/students", teacherAuthMiddleware, function (req, res) {
  var zone = clipText(req.query.zone, 40);
  var rows = stmts.listStudents.all();
  var students = rows.map(function (row) {
    var scores = stmts.listStudentScores.all(row.id).map(parseScorePayload);
    var filtered = zone ? scores.filter(function (s) { return s.zone === zone; }) : scores;
    var mockCount = scores.filter(function (s) { return s.zone === "mock"; }).length;
    return {
      id: row.id,
      phone: maskPhone(row.phone),
      displayName: row.display_name || "",
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      scoreCount: scores.length,
      mockCount: mockCount,
      lastScoreAt: row.last_score_at || null,
      scores: filtered
    };
  });
  if (zone) {
    students = students.filter(function (s) { return s.scores.length > 0; });
  }
  res.json({ ok: true, students: students });
});

app.get("/api/teacher/students/:userId/scores", teacherAuthMiddleware, function (req, res) {
  var userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: "无效的学生 ID" });
  var user = db.prepare("SELECT id, phone, display_name, created_at, last_login_at FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "学生不存在" });
  var zone = clipText(req.query.zone, 40);
  var scores = stmts.listStudentScores.all(userId).map(parseScorePayload);
  if (zone) scores = scores.filter(function (s) { return s.zone === zone; });
  res.json({
    ok: true,
    student: {
      id: user.id,
      phone: maskPhone(user.phone),
      displayName: user.display_name || "",
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    },
    scores: scores
  });
});

function maskPhone(phone) {
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

function sanitizeScore(body) {
  if (!body || typeof body !== "object") return null;
  var id = clipText(body.id, 120);
  if (!id) return null;
  function numOrNull(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  return {
    id: id,
    title: clipText(body.title, 200),
    zone: clipText(body.zone, 40),
    subject: clipText(body.subject, 60),
    score: numOrNull(body.score),
    total: numOrNull(body.total),
    band: numOrNull(body.band),
    writingWords: numOrNull(body.writingWords),
    date: clipText(body.date, 40) || new Date().toISOString(),
    _scoreKey: clipText(body._scoreKey, 80)
  };
}

app.get("/api/scores", authMiddleware, function (req, res) {
  if (req.user.role === "teacher") return res.json({ ok: true, scores: {} });
  var rows = stmts.listScores.all(req.user.sub);
  var scores = {};
  rows.forEach(function (row) {
    try { scores[row.item_id] = JSON.parse(row.payload); } catch (e) {}
  });
  res.json({ ok: true, scores: scores });
});

app.put("/api/scores/:itemId", authMiddleware, function (req, res) {
  if (req.user.role === "teacher") return res.json({ ok: true, skipped: true });
  var itemId = clipText(req.params.itemId, 120);
  var rec = sanitizeScore(Object.assign({}, req.body || {}, { id: itemId }));
  if (!rec) return res.status(400).json({ error: "成绩数据无效" });
  stmts.upsertScore.run(req.user.sub, itemId, JSON.stringify(rec), rec.date);
  res.json({ ok: true, score: rec });
});

async function qwenChat(system, user) {
  if (!DASHSCOPE_KEY) throw new Error("DASHSCOPE_API_KEY 未配置");
  var res = await fetch(DASHSCOPE_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + DASHSCOPE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DASHSCOPE_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.2
    })
  });
  var data = await res.json();
  if (!res.ok) throw new Error((data && data.error && data.error.message) || "DashScope 请求失败");
  return data.choices[0].message.content;
}

function parseJsonFromLLM(text) {
  var raw = String(text || "").trim();
  var fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) raw = fenced[1].trim();
  try { return JSON.parse(raw); } catch (e1) {
    var start = raw.indexOf("{"), end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error("AI 返回格式无效");
  }
}

function asBool(v) { return v === true || v === "true" || v === 1; }
function clipText(s, max) { return String(s || "").trim().slice(0, max); }

var aiLog = {};
function canUseAi(ip) {
  var now = Date.now(), row = aiLog[ip] || { last: 0, day: "", count: 0 };
  var today = new Date().toISOString().slice(0, 10);
  if (row.day !== today) { row.day = today; row.count = 0; }
  if (now - row.last < 2000) return { ok: false, msg: "请稍后再试" };
  if (row.count >= 100) return { ok: false, msg: "今日 AI 调用次数已达上限" };
  row.last = now; row.count += 1; aiLog[ip] = row;
  return { ok: true };
}

var JUDGE_SYSTEM =
  "You are an IELTS listening tutor at YYSD. Judge if the student captured subject, verb, object and grammar vs the target. Lenient on STT typos. " +
  "Also identify the subject, verb and object phrases in the TARGET sentence (exact substrings from target; use empty string if none). " +
  'Reply ONLY JSON: {"subject":bool,"verb":bool,"object":bool,"grammar":bool,"pass":bool,"comment":"2-3 sentences in Chinese",' +
  '"subjectText":"","verbText":"","objectText":""}';
var TRANSLATE_SYSTEM =
  "You are an IELTS listening tutor at YYSD. Grade Chinese translation for meaning. " +
  'Reply ONLY JSON: {"pass":bool,"comment":"2-3 sentences in Chinese"}';
var SHADOW_SYSTEM =
  "You are an IELTS listening shadowing tutor. Compare TARGET with student speech-to-text HEARD word-by-word in order. " +
  "For each TARGET word (tokenize punctuation attached), status: correct|wrong|missing. " +
  "correct=lenient match (I'd=I would, can't=cannot, minor STT spelling). wrong=different word. missing=not said. " +
  "heard=what student said for that slot (empty if missing). extras=words student said not matching target. " +
  "accuracy=correct count/target word count (0-1). comment=1-2 sentences Chinese coaching. " +
  'Reply ONLY JSON: {"words":[{"target":"","heard":"","status":"correct|wrong|missing"}],"extras":[],"accuracy":0.0,"comment":""}';

function shadowPass(accuracy, wordCount) {
  var thresh = wordCount <= 5 ? 0.9 : 0.85;
  return accuracy >= thresh;
}

app.post("/api/jingting/shadow", async function (req, res) {
  var gate = canUseAi(req.ip || "unknown");
  if (!gate.ok) return res.status(429).json({ error: gate.msg });
  var heard = clipText(req.body && req.body.heard, 500);
  var target = clipText(req.body && req.body.target, 500);
  if (!heard || !target) return res.status(400).json({ error: "缺少 heard 或 target" });
  try {
    var d = parseJsonFromLLM(await qwenChat(SHADOW_SYSTEM, "TARGET:\n" + target + "\n\nHEARD (STT):\n" + heard));
    var words = Array.isArray(d.words) ? d.words.map(function (w) {
      var st = String(w.status || "").toLowerCase();
      if (st !== "correct" && st !== "wrong" && st !== "missing") st = "wrong";
      return { target: clipText(w.target, 80), heard: clipText(w.heard, 80), status: st };
    }) : [];
    var correct = words.filter(function (w) { return w.status === "correct"; }).length;
    var accuracy = words.length ? correct / words.length : (typeof d.accuracy === "number" ? d.accuracy : 0);
    accuracy = Math.round(accuracy * 1000) / 1000;
    res.json({
      words: words,
      extras: Array.isArray(d.extras) ? d.extras.map(function (e) { return clipText(e, 40); }).filter(Boolean) : [],
      accuracy: accuracy,
      pass: shadowPass(accuracy, words.length),
      comment: clipText(d.comment, 500) || ""
    });
  } catch (e) {
    console.error("[yysd-api] jingting/shadow", e.message);
    res.status(e.message.indexOf("未配置") >= 0 ? 503 : 502).json({ error: "AI 跟读分析失败，请稍后再试" });
  }
});

app.post("/api/jingting/judge", async function (req, res) {
  var gate = canUseAi(req.ip || "unknown");
  if (!gate.ok) return res.status(429).json({ error: gate.msg });
  var heard = clipText(req.body && req.body.heard, 500);
  var target = clipText(req.body && req.body.target, 500);
  if (!heard || !target) return res.status(400).json({ error: "缺少 heard 或 target" });
  try {
    var d = parseJsonFromLLM(await qwenChat(JUDGE_SYSTEM, "Target:\n" + target + "\n\nStudent (STT):\n" + heard));
    res.json({ subject: asBool(d.subject), verb: asBool(d.verb), object: asBool(d.object),
      grammar: asBool(d.grammar), pass: asBool(d.pass), comment: clipText(d.comment, 500) || "",
      subjectText: clipText(d.subjectText, 120), verbText: clipText(d.verbText, 120),
      objectText: clipText(d.objectText, 120) });
  } catch (e) {
    console.error("[yysd-api] jingting/judge", e.message);
    res.status(e.message.indexOf("未配置") >= 0 ? 503 : 502).json({ error: "AI 判断失败，请稍后再试" });
  }
});

var SPEAKING_GRADE_SYSTEM =
  "You are an IELTS speaking examiner at YYSD. Grade student Part 1 answers using official IELTS criteria. " +
  "Be conservative with bands (most learners score 4.5-6). STT transcripts may have errors — judge intent, not spelling. " +
  "Reply ONLY valid JSON with this shape: " +
  '{"overallBand":5.0,"detailedScores":{"fluencyAndCoherence":5,"lexicalResource":5,"grammaticalRangeAndAccuracy":5,"pronunciation":5},' +
  '"strengths":["3 short bullets in Chinese"],"weaknesses":["3 short bullets in Chinese"],' +
  '"generalAdvice":["3 short bullets in Chinese"],' +
  '"questionFeedbacks":[{"question":"","answer":"","fixed":"","feedback":"","keyPoints":["",""]}]}. ' +
  "overallBand and each detailedScores field: number 0-9 in 0.5 steps. questionFeedbacks: one per answer provided.";

app.post("/api/speaking/grade", async function (req, res) {
  var gate = canUseAi(req.ip || "unknown");
  if (!gate.ok) return res.status(429).json({ error: gate.msg });
  var part = clipText(req.body && req.body.part, 20) || "part1";
  var topics = req.body && req.body.topics;
  var answers = req.body && req.body.answers;
  if (!Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ error: "缺少 answers" });
  }
  var lines = answers.map(function (a, i) {
    return (i + 1) + ". Q: " + clipText(a.question, 300) + "\n   A: " + clipText(a.transcript, 800);
  }).join("\n");
  var topicLine = Array.isArray(topics) ? topics.join(", ") : "";
  try {
    var d = parseJsonFromLLM(await qwenChat(SPEAKING_GRADE_SYSTEM,
      "Part: " + part + "\nTopics: " + topicLine + "\n\nStudent answers:\n" + lines));
    var ds = d.detailedScores || {};
    function bandNum(v) {
      var n = Number(v);
      if (!isFinite(n)) return 5;
      return Math.round(Math.min(9, Math.max(0, n)) * 2) / 2;
    }
    var report = {
      overallBand: bandNum(d.overallBand),
      detailedScores: {
        fluencyAndCoherence: bandNum(ds.fluencyAndCoherence),
        lexicalResource: bandNum(ds.lexicalResource),
        grammaticalRangeAndAccuracy: bandNum(ds.grammaticalRangeAndAccuracy),
        pronunciation: bandNum(ds.pronunciation)
      },
      strengths: Array.isArray(d.strengths) ? d.strengths.map(function (s) { return clipText(s, 200); }).filter(Boolean).slice(0, 5) : [],
      weaknesses: Array.isArray(d.weaknesses) ? d.weaknesses.map(function (s) { return clipText(s, 200); }).filter(Boolean).slice(0, 5) : [],
      generalAdvice: Array.isArray(d.generalAdvice) ? d.generalAdvice.map(function (s) { return clipText(s, 200); }).filter(Boolean).slice(0, 5) : [],
      questionFeedbacks: Array.isArray(d.questionFeedbacks) ? d.questionFeedbacks.map(function (q) {
        return {
          question: clipText(q.question, 300),
          answer: clipText(q.answer, 500),
          fixed: clipText(q.fixed, 500),
          feedback: clipText(q.feedback, 500),
          keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints.map(function (k) { return clipText(k, 120); }).filter(Boolean).slice(0, 4) : []
        };
      }).slice(0, 30) : []
    };
    res.json({ ok: true, report: report });
  } catch (e) {
    console.error("[yysd-api] speaking/grade", e.message);
    res.status(e.message.indexOf("未配置") >= 0 ? 503 : 502).json({ error: "AI 口语评分失败，请稍后再试" });
  }
});

app.post("/api/jingting/translate", async function (req, res) {
  var gate = canUseAi(req.ip || "unknown");
  if (!gate.ok) return res.status(429).json({ error: gate.msg });
  var en = clipText(req.body && req.body.en, 500);
  var zh = clipText(req.body && req.body.zh, 500);
  var reference = clipText(req.body && req.body.reference, 500);
  if (!en || !zh) return res.status(400).json({ error: "缺少 en 或 zh" });
  try {
    var d = parseJsonFromLLM(await qwenChat(TRANSLATE_SYSTEM,
      "English:\n" + en + "\n\nReference:\n" + (reference || "") + "\n\nStudent:\n" + zh));
    res.json({ pass: asBool(d.pass), comment: clipText(d.comment, 500) || "" });
  } catch (e) {
    console.error("[yysd-api] jingting/translate", e.message);
    res.status(e.message.indexOf("未配置") >= 0 ? 503 : 502).json({ error: "AI 批改失败，请稍后再试" });
  }
});

// ponytail: runnable self-check
if (require.main === module) {
  console.assert(normalizePhone("13800138000") === "13800138000");
  console.assert(normalizePhone("23800138000") === null);
  var hp = hashPassword("test1234");
  console.assert(verifyPassword("test1234", hp));
  console.assert(!verifyPassword("wrong", hp));
  app.listen(PORT, function () {
    console.log("[yysd-api] listening on " + PORT + (SMS_DEV ? " (SMS_DEV_MODE)" : ""));
  });
}

module.exports = app;
