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
const OpenApi = require("@alicloud/openapi-client");

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "";
const SMS_DEV = process.env.SMS_DEV_MODE === "1";
const ORIGINS = (process.env.CORS_ORIGINS || "https://youyisida.com,https://www.youyisida.com")
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
  ");"
);

const stmts = {
  upsertCode: db.prepare(
    "INSERT INTO sms_codes (phone, code, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ),
  latestCode: db.prepare(
    "SELECT code, expires_at FROM sms_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1"
  ),
  findUser: db.prepare("SELECT id, phone, created_at, last_login_at FROM users WHERE phone = ?"),
  insertUser: db.prepare("INSERT INTO users (phone, created_at, last_login_at) VALUES (?, ?, ?)"),
  touchLogin: db.prepare("UPDATE users SET last_login_at = ? WHERE phone = ?")
};

function normalizePhone(raw) {
  var p = String(raw || "").replace(/\D/g, "");
  if (!/^1\d{10}$/.test(p)) return null;
  return p;
}

function genCode() {
  return String(crypto.randomInt(100000, 1000000));
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
  await client.sendSms({
    phoneNumbers: phone,
    signName: sign,
    templateCode: tpl,
    templateParam: JSON.stringify({ code: code })
  });
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

const app = express();
app.use(express.json({ limit: "32kb" }));
app.use(cors({
  origin: function (origin, cb) {
    if (!origin || ORIGINS.indexOf(origin) !== -1) return cb(null, true);
    return cb(null, false);
  }
}));

app.get("/api/health", function (req, res) {
  res.json({ ok: true, service: "yysd-api" });
});

app.post("/api/auth/send-code", async function (req, res) {
  var phone = normalizePhone(req.body && req.body.phone);
  if (!phone) return res.status(400).json({ error: "请输入正确的手机号" });
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

app.post("/api/auth/login", function (req, res) {
  var phone = normalizePhone(req.body && req.body.phone);
  var code = String((req.body && req.body.code) || "").trim();
  if (!phone || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "手机号或验证码格式不正确" });
  }
  var row = stmts.latestCode.get(phone);
  if (!row || row.code !== code || row.expires_at < Date.now()) {
    return res.status(400).json({ error: "验证码错误或已过期" });
  }

  var nowIso = new Date().toISOString();
  var user = stmts.findUser.get(phone);
  if (!user) {
    stmts.insertUser.run(phone, nowIso, nowIso);
    user = stmts.findUser.get(phone);
  } else {
    stmts.touchLogin.run(nowIso, phone);
    user.last_login_at = nowIso;
  }

  if (!JWT_SECRET || JWT_SECRET.length < 16) {
    return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
  }

  var token = jwt.sign({ sub: user.id, phone: phone }, JWT_SECRET, { expiresIn: "30d" });
  res.json({
    ok: true,
    token: token,
    user: { id: user.id, phone: maskPhone(phone), lastLoginAt: user.last_login_at }
  });
});

app.get("/api/auth/me", authMiddleware, function (req, res) {
  var user = stmts.findUser.get(req.user.phone);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  res.json({
    ok: true,
    user: {
      id: user.id,
      phone: maskPhone(user.phone),
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    }
  });
});

function maskPhone(phone) {
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

// ponytail: runnable self-check
if (require.main === module) {
  console.assert(normalizePhone("13800138000") === "13800138000");
  console.assert(normalizePhone("23800138000") === null);
  app.listen(PORT, function () {
    console.log("[yysd-api] listening on " + PORT + (SMS_DEV ? " (SMS_DEV_MODE)" : ""));
  });
}

module.exports = app;
