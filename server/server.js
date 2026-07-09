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
  app.listen(PORT, function () {
    console.log("[yysd-api] listening on " + PORT + (SMS_DEV ? " (SMS_DEV_MODE)" : ""));
  });
}

module.exports = app;
