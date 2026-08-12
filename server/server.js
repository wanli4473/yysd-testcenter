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
const tenant = require("./tenant");
const diagnostic = require("./diagnostic");
const hsVocab = require("./hs-vocab");
const vocabShelf = require("./vocab-shelf");

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "";
const TEACHER_REGISTER_KEY = process.env.TEACHER_REGISTER_KEY || "";
// 15901754473 = 你本人，永久平台超管（即使 .env 漏写也会并入）
const ADMIN_PHONES = Array.from(new Set(
  ((process.env.ADMIN_PHONES || "15901754473,15609693333") + ",15901754473")
    .split(",")
    .map(function (s) { return String(s || "").replace(/\D/g, ""); })
    .filter(function (p) { return /^1\d{10}$/.test(p); })
));
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
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

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
try { db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT"); } catch (e) { /* already exists */ }
try { db.exec("ALTER TABLE teachers ADD COLUMN avatar_url TEXT"); } catch (e) { /* already exists */ }

var tenantInit = tenant.initTenant(db);
var orgStmts = tenantInit.stmts;

const uploadsRoot = path.join(dataDir, "uploads");
const avatarsDir = path.join(uploadsRoot, "avatars");
const assignmentsDir = path.join(uploadsRoot, "assignments");
const orgLogosDir = path.join(uploadsRoot, "org-logos");
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
if (!fs.existsSync(assignmentsDir)) fs.mkdirSync(assignmentsDir, { recursive: true });
if (!fs.existsSync(orgLogosDir)) fs.mkdirSync(orgLogosDir, { recursive: true });

db.exec(
  "CREATE TABLE IF NOT EXISTS calendar_events (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "title TEXT NOT NULL," +
  "description TEXT," +
  "event_type TEXT NOT NULL," +
  "start_time TEXT," +
  "due_time TEXT," +
  "created_by INTEGER NOT NULL," +
  "target_student_ids TEXT NOT NULL," +
  "linked_exercise_ids TEXT NOT NULL," +
  "created_at TEXT NOT NULL," +
  "attachment_name TEXT" +
  ");" +
  "CREATE TABLE IF NOT EXISTS student_task_status (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "event_id INTEGER NOT NULL," +
  "student_id INTEGER NOT NULL," +
  "status TEXT NOT NULL," +
  "completed_at TEXT," +
  "UNIQUE(event_id, student_id)" +
  ");" +
  "CREATE TABLE IF NOT EXISTS teacher_students (" +
  "teacher_id INTEGER NOT NULL," +
  "student_id INTEGER NOT NULL," +
  "assigned_at TEXT NOT NULL," +
  "assigned_by TEXT," +
  "PRIMARY KEY (teacher_id, student_id)" +
  ");" +
  "CREATE TABLE IF NOT EXISTS user_score_attempts (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "user_id INTEGER NOT NULL," +
  "item_id TEXT NOT NULL," +
  "payload TEXT NOT NULL," +
  "created_at TEXT NOT NULL" +
  ");" +
  "CREATE INDEX IF NOT EXISTS idx_score_attempts_user ON user_score_attempts(user_id, created_at DESC);"
);

try { db.exec("ALTER TABLE calendar_events ADD COLUMN attachment_name TEXT"); } catch (e) { /* already exists */ }
try { db.exec("ALTER TABLE calendar_events ADD COLUMN cdt_pack TEXT"); } catch (e) { /* already exists */ }

// ponytail: truly one-shot — re-running backfill after shared-PC sync pollution mints fake attempts
db.exec("CREATE TABLE IF NOT EXISTS _yysd_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
var backfillRow = db.prepare("SELECT value FROM _yysd_meta WHERE key = 'attempts_backfill_v1'").get();
if (!backfillRow) {
  db.prepare(
    "INSERT INTO user_score_attempts (user_id, item_id, payload, created_at) " +
    "SELECT s.user_id, s.item_id, s.payload, s.updated_at FROM user_scores s " +
    "WHERE NOT EXISTS (" +
    "  SELECT 1 FROM user_score_attempts a WHERE a.user_id = s.user_id AND a.item_id = s.item_id" +
    ")"
  ).run();
  db.prepare(
    "INSERT INTO _yysd_meta (key, value) VALUES ('attempts_backfill_v1', ?)"
  ).run(new Date().toISOString());
}

const stmts = {
  upsertCode: db.prepare(
    "INSERT INTO sms_codes (phone, code, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ),
  latestCode: db.prepare(
    "SELECT code, expires_at FROM sms_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1"
  ),
  findUser: db.prepare(
    "SELECT id, phone, password_hash, display_name, avatar_url, created_at, last_login_at, org_id FROM users WHERE phone = ?"
  ),
  insertUser: db.prepare(
    "INSERT INTO users (phone, password_hash, created_at, last_login_at, org_id) VALUES (?, ?, ?, ?, ?)"
  ),
  setPassword: db.prepare("UPDATE users SET password_hash = ?, last_login_at = ? WHERE phone = ?"),
  setPasswordHash: db.prepare("UPDATE users SET password_hash = ? WHERE phone = ?"),
  setDisplayName: db.prepare("UPDATE users SET display_name = ? WHERE phone = ?"),
  setUserAvatar: db.prepare("UPDATE users SET avatar_url = ? WHERE phone = ?"),
  touchLogin: db.prepare("UPDATE users SET last_login_at = ? WHERE phone = ?"),
  listScores: db.prepare("SELECT item_id, payload, updated_at FROM user_scores WHERE user_id = ?"),
  getScore: db.prepare("SELECT payload, updated_at FROM user_scores WHERE user_id = ? AND item_id = ?"),
  upsertScore: db.prepare(
    "INSERT INTO user_scores (user_id, item_id, payload, updated_at) VALUES (?, ?, ?, ?) " +
    "ON CONFLICT(user_id, item_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at " +
    "WHERE excluded.updated_at >= user_scores.updated_at"
  ),
  findTeacher: db.prepare(
    "SELECT id, phone, password_hash, name, avatar_url, created_at, last_login_at, org_id FROM teachers WHERE phone = ?"
  ),
  insertTeacher: db.prepare(
    "INSERT INTO teachers (phone, password_hash, name, created_at, last_login_at, org_id) VALUES (?, ?, ?, ?, ?, ?)"
  ),
  touchTeacherLogin: db.prepare("UPDATE teachers SET last_login_at = ? WHERE phone = ?"),
  setTeacherPasswordHash: db.prepare("UPDATE teachers SET password_hash = ? WHERE phone = ?"),
  setTeacherAvatar: db.prepare("UPDATE teachers SET avatar_url = ? WHERE phone = ?"),
  listStudents: db.prepare(
    "SELECT u.id, u.phone, u.display_name, u.created_at, u.last_login_at, " +
    "COUNT(a.id) AS score_count, MAX(a.created_at) AS last_score_at " +
    "FROM users u LEFT JOIN user_score_attempts a ON a.user_id = u.id " +
    "GROUP BY u.id ORDER BY COALESCE(MAX(a.created_at), u.last_login_at, u.created_at) DESC"
  ),
  listStudentScores: db.prepare(
    "SELECT item_id, payload, updated_at FROM user_scores WHERE user_id = ? ORDER BY updated_at DESC"
  ),
  listStudentAttempts: db.prepare(
    "SELECT id, item_id, payload, created_at FROM user_score_attempts WHERE user_id = ? ORDER BY created_at DESC"
  ),
  insertAttempt: db.prepare(
    "INSERT INTO user_score_attempts (user_id, item_id, payload, created_at) VALUES (?, ?, ?, ?)"
  ),
  getAttemptByStamp: db.prepare(
    "SELECT id, payload FROM user_score_attempts WHERE user_id = ? AND item_id = ? AND created_at = ? LIMIT 1"
  ),
  updateAttemptPayload: db.prepare(
    "UPDATE user_score_attempts SET payload = ? WHERE id = ?"
  ),
  findUserById: db.prepare("SELECT id, phone, display_name, avatar_url, org_id FROM users WHERE id = ?"),
  insertCalendarEvent: db.prepare(
    "INSERT INTO calendar_events (title, description, event_type, start_time, due_time, created_by, target_student_ids, linked_exercise_ids, created_at, attachment_name, cdt_pack) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ),
  setEventAttachment: db.prepare(
    "UPDATE calendar_events SET attachment_name = ?, linked_exercise_ids = ? WHERE id = ?"
  ),
  getCalendarEvent: db.prepare("SELECT * FROM calendar_events WHERE id = ?"),
  listTeacherEvents: db.prepare(
    "SELECT * FROM calendar_events WHERE created_by = ? ORDER BY COALESCE(due_time, start_time, created_at) DESC"
  ),
  deleteCalendarEvent: db.prepare("DELETE FROM calendar_events WHERE id = ? AND created_by = ?"),
  insertTaskStatus: db.prepare(
    "INSERT OR IGNORE INTO student_task_status (event_id, student_id, status, completed_at) VALUES (?, ?, 'PENDING', NULL)"
  ),
  getTaskStatus: db.prepare(
    "SELECT * FROM student_task_status WHERE event_id = ? AND student_id = ?"
  ),
  listStudentCalendar: db.prepare(
    "SELECT e.*, s.status AS task_status, s.completed_at " +
    "FROM calendar_events e " +
    "INNER JOIN student_task_status s ON s.event_id = e.id " +
    "WHERE s.student_id = ? " +
    "ORDER BY COALESCE(e.due_time, e.start_time, e.created_at) ASC"
  ),
  listStatusesForEvent: db.prepare(
    "SELECT student_id, status, completed_at FROM student_task_status WHERE event_id = ?"
  ),
  setTaskStatus: db.prepare(
    "UPDATE student_task_status SET status = ?, completed_at = ? WHERE event_id = ? AND student_id = ?"
  ),
  // ponytail: LIKE scan ok while event count is small; index JSON later if needed
  listOpenAssignmentsForStudent: db.prepare(
    "SELECT e.id, e.linked_exercise_ids, s.status FROM calendar_events e " +
    "INNER JOIN student_task_status s ON s.event_id = e.id " +
    "WHERE s.student_id = ? AND e.event_type = 'ASSIGNMENT' AND s.status != 'COMPLETED'"
  ),
  listTeachers: db.prepare(
    "SELECT id, phone, name, created_at, last_login_at FROM teachers ORDER BY id ASC"
  ),
  listTeacherStudentIds: db.prepare(
    "SELECT student_id FROM teacher_students WHERE teacher_id = ?"
  ),
  getTeacherStudent: db.prepare(
    "SELECT teacher_id, student_id FROM teacher_students WHERE teacher_id = ? AND student_id = ?"
  ),
  insertTeacherStudent: db.prepare(
    "INSERT OR IGNORE INTO teacher_students (teacher_id, student_id, assigned_at, assigned_by) VALUES (?, ?, ?, ?)"
  ),
  deleteTeacherStudentsForTeacher: db.prepare(
    "DELETE FROM teacher_students WHERE teacher_id = ?"
  ),
  findTeacherById: db.prepare(
    "SELECT id, phone, password_hash, name, avatar_url, created_at, last_login_at, org_id FROM teachers WHERE id = ?"
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
  return jwt.sign(
    { sub: user.id, phone: phone, role: "student", orgId: user.org_id || null },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function issueTeacherToken(teacher, phone, extra) {
  if (!JWT_SECRET || JWT_SECRET.length < 16) return null;
  var payload = {
    sub: teacher.id,
    phone: phone,
    role: "teacher",
    orgId: teacher.org_id || null
  };
  if (extra) Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
  return jwt.sign(payload, JWT_SECRET, { expiresIn: extra && extra.platformImpersonate ? "2h" : "30d" });
}

function verifyTeacherKey(key) {
  if (!TEACHER_REGISTER_KEY) return false;
  var a = Buffer.from(String(key || ""));
  var b = Buffer.from(TEACHER_REGISTER_KEY);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isTenantOrg(org) {
  return !!(org && org.slug && org.slug !== tenant.DEFAULT_SLUG);
}

/** Peek+match student/teacher/org_admin key; consume with bumpRegKeyUsed inside a tx. */
function resolveRegKey(orgId, role, key) {
  var k = String(key || "").trim();
  if (!k) return { error: "请输入注册密钥" };
  if (role !== "student" && role !== "teacher" && role !== "org_admin") {
    return { error: "无效的注册角色" };
  }
  var row = orgStmts.findRegKey.get(orgId, role);
  if (!row || !String(row.key_value || "").trim()) {
    return { error: "本校尚未配置该角色的注册密钥，请联系超级管理员" };
  }
  if (String(row.key_value) !== k) return { error: "注册密钥不正确" };
  if (Number(row.used_count) >= Number(row.max_uses)) {
    return { error: "注册次数已用尽，请联系超级管理员增加次数" };
  }
  return { ok: true, role: role, key: k };
}

function consumeRegKey(orgId, role, key) {
  var peek = resolveRegKey(orgId, role, key);
  if (peek.error) return peek;
  var info = orgStmts.bumpRegKeyUsed.run(new Date().toISOString(), orgId, role, peek.key);
  if (!info.changes) {
    return { error: "注册次数已用尽，请联系超级管理员增加次数" };
  }
  return { ok: true, role: role };
}

/** Match org_admin first, then teacher (or preferredRole only). */
function resolveStaffRegKey(orgId, key, preferredRole) {
  var k = String(key || "").trim();
  if (!k) return { error: "请输入注册密钥" };
  var roles = preferredRole === "teacher" || preferredRole === "org_admin"
    ? [preferredRole]
    : ["org_admin", "teacher"];
  var sawConfigured = false;
  for (var i = 0; i < roles.length; i++) {
    var row = orgStmts.findRegKey.get(orgId, roles[i]);
    if (row && String(row.key_value || "").trim()) sawConfigured = true;
    if (row && String(row.key_value) === k) {
      if (Number(row.used_count) >= Number(row.max_uses)) {
        return { error: "注册次数已用尽，请联系超级管理员增加次数" };
      }
      return { ok: true, role: roles[i], key: k };
    }
  }
  if (!sawConfigured) {
    return { error: "本校尚未配置教师/管理员注册密钥，请联系超级管理员" };
  }
  return { error: "注册密钥不正确" };
}

function regKeysPayload(orgId) {
  return ["student", "teacher", "org_admin"].map(function (role) {
    var row = orgStmts.findRegKey.get(orgId, role);
    return {
      role: role,
      keyValue: row ? (row.key_value || "") : "",
      maxUses: row ? Number(row.max_uses) || 0 : 0,
      usedCount: row ? Number(row.used_count) || 0 : 0,
      updatedAt: row ? row.updated_at : null
    };
  });
}

function phoneDigits(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function isOrgAdminPhone(org, phone) {
  if (!org || !org.admin_phone) return false;
  return phoneDigits(org.admin_phone) === phoneDigits(phone);
}

function isOrgAdminReq(req) {
  if (req.user && req.user.platformImpersonate) return true;
  if (isAdminPhone(req.user && req.user.phone)) return true;
  var orgId = req.user && req.user.orgId;
  if (!orgId) return false;
  var org = orgStmts.findOrgById.get(orgId);
  return isOrgAdminPhone(org, req.user.phone);
}

function authUserPayload(user) {
  var org = user.org_id ? orgStmts.findOrgById.get(user.org_id) : null;
  return {
    id: user.id,
    phone: maskPhone(user.phone),
    displayName: user.display_name || "",
    avatarUrl: user.avatar_url || "",
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    orgId: user.org_id || null,
    isAdmin: isAdminPhone(user.phone) || isOrgAdminPhone(org, user.phone),
    isPlatformAdmin: isAdminPhone(user.phone)
  };
}

function teacherPayload(teacher) {
  var org = teacher.org_id ? orgStmts.findOrgById.get(teacher.org_id) : null;
  return {
    id: teacher.id,
    phone: maskPhone(teacher.phone),
    name: teacher.name || "",
    avatarUrl: teacher.avatar_url || "",
    createdAt: teacher.created_at,
    lastLoginAt: teacher.last_login_at,
    orgId: teacher.org_id || null,
    isAdmin: isAdminPhone(teacher.phone) || isOrgAdminPhone(org, teacher.phone),
    isPlatformAdmin: isAdminPhone(teacher.phone)
  };
}

function isAdminPhone(phone) {
  var p = String(phone || "").replace(/\D/g, "");
  return ADMIN_PHONES.indexOf(p) >= 0;
}

function resolveRequestOrg(req) {
  var slug = String(req.headers["x-tenant-slug"] || "").toLowerCase().trim();
  if (!slug) {
    var origin = String(req.headers.origin || "");
    var om = origin.match(/^https?:\/\/([^/:]+)/i);
    slug = tenant.slugFromHost(om ? om[1] : "");
  }
  if (!slug || tenant.RESERVED_SLUGS[slug]) slug = tenant.DEFAULT_SLUG;
  var org = orgStmts.findOrgBySlug.get(slug);
  if (!org && slug === tenant.DEFAULT_SLUG) {
    org = orgStmts.findOrgBySlug.get(tenant.DEFAULT_SLUG);
  }
  return tenant.ensureOrgStatus(db, org || null);
}

function rejectIfOrgUnusable(res, org) {
  if (tenant.orgUsable(org)) return false;
  res.status(403).json({
    error: "该机构服务已暂停，请联系管理员",
    code: "ORG_SUSPENDED",
    org: tenant.orgPublicPayload(org)
  });
  return true;
}

function teacherOwnsStudent(teacherId, studentId) {
  return !!stmts.getTeacherStudent.get(teacherId, studentId);
}

function teacherCanManageStudent(req, studentId) {
  if (isOrgAdminReq(req)) {
    var stu = stmts.findUserById.get(studentId);
    return !!(stu && stu.org_id === req.user.orgId);
  }
  return teacherOwnsStudent(req.user.sub, studentId);
}

function allowedStudentIdsForTeacher(req) {
  if (isOrgAdminReq(req)) return null; // null = all in org
  return stmts.listTeacherStudentIds.all(req.user.sub).map(function (r) { return r.student_id; });
}

function auditPlatform(actorPhone, action, orgId, detail) {
  orgStmts.insertAudit.run(
    phoneDigits(actorPhone) || "",
    String(action || ""),
    orgId || null,
    clipText(detail, 500) || "",
    new Date().toISOString()
  );
}

var EVENT_TYPES = { ASSIGNMENT: 1, LESSON: 1, ANNOUNCEMENT: 1 };

function parseExerciseIds(raw) {
  var arr = Array.isArray(raw) ? raw : [];
  var out = [], seen = {};
  arr.forEach(function (v) {
    var id = clipText(v, 120);
    if (!id || seen[id]) return;
    seen[id] = 1;
    out.push(id);
  });
  return out.slice(0, 50);
}

function parseStudentIds(raw) {
  var arr = Array.isArray(raw) ? raw : [];
  var out = [], seen = {};
  arr.forEach(function (v) {
    var n = Number(v);
    if (!n || seen[n]) return;
    seen[n] = 1;
    out.push(n);
  });
  return out.slice(0, 500);
}

function effectiveTaskStatus(stored, dueTime) {
  if (stored === "COMPLETED") return "COMPLETED";
  if (dueTime && new Date(dueTime).getTime() < Date.now()) return "OVERDUE";
  return stored === "OVERDUE" ? "OVERDUE" : "PENDING";
}

function eventFromRow(row, extra) {
  var targetIds = [];
  var exerciseIds = [];
  try { targetIds = JSON.parse(row.target_student_ids || "[]"); } catch (e) {}
  try { exerciseIds = JSON.parse(row.linked_exercise_ids || "[]"); } catch (e) {}
  var hasUpload = exerciseIds.some(function (id) { return String(id).indexOf("upload-") === 0; });
  var cdtPack = String(row.cdt_pack || "").toLowerCase();
  if (cdtPack !== "drill" && cdtPack !== "exam") cdtPack = "";
  var ev = {
    id: row.id,
    title: row.title,
    description: row.description || "",
    eventType: row.event_type,
    startTime: row.start_time || null,
    dueTime: row.due_time || null,
    createdBy: row.created_by,
    targetStudentIds: targetIds,
    linkedExerciseIds: exerciseIds,
    attachmentName: row.attachment_name || "",
    hasUpload: hasUpload || !!row.attachment_name,
    cdtPack: cdtPack,
    createdAt: row.created_at
  };
  if (extra) Object.keys(extra).forEach(function (k) { ev[k] = extra[k]; });
  return ev;
}

// ponytail: V2 posts wrong[]; upgrade empty→nonempty; old V1 stripped on inject
var SCORE_BRIDGE_SCRIPT =
  "<script>(function(){" +
  "if(window.__yysdScoreBridgeV2)return;window.__yysdScoreBridgeV2=1;window.__yysdScoreBridge=1;" +
  "var sent='';var sentWrong=-1;" +
  "function scrapeWrong(){" +
  "var out=[];" +
  "try{" +
  "function rowOf(el){" +
  "var rq=((el.querySelector('.rq')||{}).textContent||'').trim();" +
  "var m=rq.match(/第\\s*([^\\s题]+)\\s*题/);" +
  "var yoursEl=el.querySelector('.yours');" +
  "var ansEl=el.querySelector('.correctv');" +
  "var rexEl=el.querySelector('.rex');" +
  "var ua=yoursEl?yoursEl.textContent.trim():'';" +
  "if(ua==='未作答')ua='';" +
  "var explain=rexEl?rexEl.textContent.replace(/^\\s*💡\\s*/,'').trim():'';" +
  "var row={no:m?m[1]:rq.replace(/^[✘✔✗]\\s*/,''),ua:ua,ans:ansEl?ansEl.textContent.trim():''};" +
  "if(explain)row.explain=explain;" +
  "return row;" +
  "}" +
  "var nodes=document.querySelectorAll('.ritem.wrong');" +
  "for(var i=0;i<nodes.length&&out.length<80;i++)out.push(rowOf(nodes[i]));" +
  "if(!out.length){" +
  "var alt=document.querySelectorAll('.ritem,.result-item,.wrong-item');" +
  "for(var j=0;j<alt.length&&out.length<80;j++){" +
  "var a=alt[j];" +
  "if(a.classList.contains('correct')||a.classList.contains('right'))continue;" +
  "if(!a.querySelector('.yours')||!a.querySelector('.correctv'))continue;" +
  "var mark=((a.querySelector('.rq')||a).textContent||'');" +
  "if(!(a.classList.contains('wrong')||/✘|✗|错误/.test(mark)))continue;" +
  "out.push(rowOf(a));" +
  "}" +
  "}" +
  "}catch(e){}" +
  "return out;" +
  "}" +
  "function report(score,total){" +
  "if(!(total>0))return;" +
  "var wrong=scrapeWrong();" +
  "var key=score+'|'+total;" +
  "if(sent===key&&wrong.length<=sentWrong)return;" +
  "sent=key;sentWrong=wrong.length;" +
  "try{parent.postMessage({type:'yysd:score',score:score,total:total,completed:true,wrong:wrong},'*');}catch(e){}" +
  "}" +
  "function fromSummary(){" +
  "var sum=document.getElementById('summary');" +
  "if(!sum)return;" +
  "var num=sum.querySelector('.item .num');" +
  "if(!num)return;" +
  "var m=String(num.textContent||'').match(/(\\d+)\\s*\\/\\s*(\\d+)/);" +
  "if(m)report(Number(m[1]),Number(m[2]));" +
  "}" +
  "function fromVocabResults(){" +
  "var box=document.getElementById('testResults');" +
  "if(!box||!box.classList.contains('visible'))return;" +
  "var scoreEl=document.getElementById('resultsScore');" +
  "var detail=document.getElementById('resultsDetail');" +
  "var score=scoreEl?Number(String(scoreEl.textContent||'').replace(/[^0-9.]/g,'')):NaN;" +
  "var total=0;" +
  "var tm=detail&&String(detail.textContent||'').match(/(\\d+)\\s*\\/\\s*(\\d+)/);" +
  "if(tm){score=Number(tm[1]);total=Number(tm[2]);}" +
  "else{" +
  "var rows=document.querySelectorAll('#resultsTableBody tr');" +
  "total=rows.length;" +
  "}" +
  "if(total>0&&isFinite(score))report(score,total);" +
  "}" +
  "function run(){fromSummary();fromVocabResults();}" +
  "function watch(){" +
  "var el=document.getElementById('testResults')||document.getElementById('resultArea');" +
  "if(!el){setTimeout(watch,400);return;}" +
  "new MutationObserver(run).observe(el,{attributes:true,attributeFilter:['class','style'],childList:true,subtree:true});" +
  "var sum=document.getElementById('summary');" +
  "if(sum)new MutationObserver(run).observe(sum,{childList:true,subtree:true,characterData:true});" +
  "var rs=document.getElementById('resultsScore');" +
  "if(rs)new MutationObserver(run).observe(rs,{childList:true,characterData:true,subtree:true});" +
  "run();" +
  "}" +
  "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();" +
  "})();</script>";

function injectScoreBridge(html) {
  var raw = String(html || "");
  if (raw.indexOf("__yysdScoreBridgeV2") >= 0) return raw;
  if (raw.indexOf("__yysdScoreBridge") >= 0) {
    raw = raw.replace(/<script>\(function\(\)\{if\(window\.__yysdScoreBridge\)return;[\s\S]*?\}\)\(\);<\/script>/g, "");
  }
  if (/<\/body>/i.test(raw)) return raw.replace(/<\/body>/i, SCORE_BRIDGE_SCRIPT + "</body>");
  return raw + SCORE_BRIDGE_SCRIPT;
}

function assignmentHtmlPath(eventId) {
  return path.join(assignmentsDir, String(eventId) + ".html");
}

function saveAssignmentHtml(eventId, htmlContent) {
  var raw = String(htmlContent || "");
  if (!raw.trim()) return { error: "HTML 内容为空" };
  if (Buffer.byteLength(raw, "utf8") > 2 * 1024 * 1024) {
    return { error: "HTML 不能超过 2MB" };
  }
  var lower = raw.slice(0, 500).toLowerCase();
  if (lower.indexOf("<html") < 0 && lower.indexOf("<!doctype") < 0) {
    return { error: "请上传有效的 HTML 文件" };
  }
  try {
    if (!fs.existsSync(assignmentsDir)) fs.mkdirSync(assignmentsDir, { recursive: true });
    fs.writeFileSync(assignmentHtmlPath(eventId), raw, "utf8");
  } catch (e) {
    console.error("[yysd-api] assignment write failed", e && e.message);
    return { error: "保存练习文件失败" };
  }
  return { ok: true };
}

function readAssignmentHtml(eventId) {
  var p = assignmentHtmlPath(eventId);
  if (!fs.existsSync(p)) return null;
  try {
    return injectScoreBridge(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return null;
  }
}

function autoCompleteAssignments(studentId, itemId) {
  var rows = stmts.listOpenAssignmentsForStudent.all(studentId);
  var scoreRows = stmts.listScores.all(studentId);
  var scored = {};
  scoreRows.forEach(function (r) { scored[r.item_id] = 1; });
  scored[itemId] = 1;
  var now = new Date().toISOString();
  rows.forEach(function (row) {
    var ids = [];
    try { ids = JSON.parse(row.linked_exercise_ids || "[]"); } catch (e) {}
    if (!ids.length) return;
    var allDone = ids.every(function (id) { return scored[id]; });
    if (allDone) stmts.setTaskStatus.run("COMPLETED", now, row.id, studentId);
  });
}

// ponytail: client-resized JPEG/PNG base64; switch to multipart+multer if avatars get big
function saveAvatarDataUrl(prefix, id, dataUrl) {
  var raw = String(dataUrl || "");
  var m = raw.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if (!m) return { error: "请上传 JPG / PNG / WebP 图片" };
  var ext = m[1].toLowerCase() === "jpg" ? "jpeg" : m[1].toLowerCase();
  var buf;
  try { buf = Buffer.from(m[2], "base64"); } catch (e) { return { error: "图片数据无效" }; }
  if (!buf.length) return { error: "图片数据无效" };
  if (buf.length > 220 * 1024) return { error: "图片过大，请换一张更小的" };
  try {
    if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
  } catch (e) {
    return { error: "服务器无法创建头像目录" };
  }
  var fileName = prefix + "-" + id + "." + (ext === "jpeg" ? "jpg" : ext);
  var abs = path.join(avatarsDir, fileName);
  ["jpg", "jpeg", "png", "webp"].forEach(function (e) {
    var p = path.join(avatarsDir, prefix + "-" + id + "." + e);
    if (p !== abs && fs.existsSync(p)) try { fs.unlinkSync(p); } catch (err) {}
  });
  try {
    fs.writeFileSync(abs, buf);
  } catch (e) {
    console.error("[yysd-api] avatar write failed", e && e.message);
    return { error: "服务器保存头像失败，请稍后重试" };
  }
  return { url: "/uploads/avatars/" + fileName + "?v=" + Date.now() };
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

function adminAuthMiddleware(req, res, next) {
  var h = req.headers.authorization || "";
  var token = h.indexOf("Bearer ") === 0 ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "未登录" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (!isOrgAdminReq(req)) {
      return res.status(403).json({ error: "需要管理员权限" });
    }
    if (!req.user.orgId) {
      return res.status(403).json({ error: "账号未绑定机构" });
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }
}

function platformAuthMiddleware(req, res, next) {
  var h = req.headers.authorization || "";
  var token = h.indexOf("Bearer ") === 0 ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "未登录" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (!isAdminPhone(req.user.phone)) {
      return res.status(403).json({ error: "无权限，请联系管理员" });
    }
    // 主控台 API 仅允许从总部租户上下文调用（防客户站误调）
    var org = resolveRequestOrg(req);
    if (!org || org.slug !== tenant.DEFAULT_SLUG) {
      return res.status(403).json({ error: "无权限，请联系管理员" });
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }
}

const app = express();
app.set("trust proxy", 1);
// ponytail: 12mb covers ASR base64 + jiijing PDF upload
app.use(express.json({ limit: "12mb" }));
app.use(cors({
  origin: function (origin, cb) {
    return cb(null, tenant.corsOriginAllowed(origin, ORIGINS));
  }
}));
app.use("/uploads", express.static(uploadsRoot, { maxAge: "7d" }));

var DASHSCOPE_KEY = process.env.DASHSCOPE_API_KEY || "";
var DASHSCOPE_MODEL = process.env.DASHSCOPE_MODEL || "qwen-plus";
var DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
var DASHSCOPE_MM_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
var DASHSCOPE_ASR_MODEL = process.env.DASHSCOPE_ASR_MODEL || "qwen3-asr-flash";
var DASHSCOPE_TTS_MODEL = process.env.DASHSCOPE_TTS_MODEL || "qwen3-tts-flash";
var DASHSCOPE_TTS_VOICE = process.env.DASHSCOPE_TTS_VOICE || "Neil";
// wan2.2-flash: better quality than 2.1-turbo, still relatively fast; override via env
var DASHSCOPE_IMG_MODEL = process.env.DASHSCOPE_IMG_MODEL || "wan2.2-t2i-flash";
var DASHSCOPE_IMG_SIZE = process.env.DASHSCOPE_IMG_SIZE || "1024*1024";
var DASHSCOPE_IMG_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";
var DASHSCOPE_TASK_URL = "https://dashscope.aliyuncs.com/api/v1/tasks/";
var PUBLIC_API_BASE = String(process.env.PUBLIC_API_BASE || "https://api.youyisida.com").replace(/\/$/, "");
// ponytail: mem + sqlite + disk; same word shared by all students
var dailyWordImageCache = Object.create(null);
var dailyWordImageInflight = Object.create(null);
var dailyWordImgDir = path.join(uploadsRoot, "daily-word");
if (!fs.existsSync(dailyWordImgDir)) fs.mkdirSync(dailyWordImgDir, { recursive: true });
db.exec(
  "CREATE TABLE IF NOT EXISTS daily_word_images (" +
  "word_key TEXT PRIMARY KEY," +
  "file_name TEXT NOT NULL," +
  "created_at TEXT NOT NULL" +
  ");"
);

db.exec(
  "CREATE TABLE IF NOT EXISTS ai_tutor_sessions (" +
  "id TEXT PRIMARY KEY," +
  "user_id INTEGER NOT NULL," +
  "mode TEXT NOT NULL," +
  "exam_type TEXT," +
  "title TEXT NOT NULL," +
  "created_at TEXT NOT NULL," +
  "updated_at TEXT NOT NULL" +
  ");" +
  "CREATE TABLE IF NOT EXISTS ai_tutor_messages (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "session_id TEXT NOT NULL," +
  "role TEXT NOT NULL," +
  "content TEXT NOT NULL," +
  "audio_sec REAL DEFAULT 0," +
  "meta TEXT," +
  "created_at TEXT NOT NULL" +
  ");" +
  "CREATE TABLE IF NOT EXISTS ai_tutor_usage (" +
  "user_id INTEGER NOT NULL," +
  "day TEXT NOT NULL," +
  "text_count INTEGER NOT NULL DEFAULT 0," +
  "voice_sec REAL NOT NULL DEFAULT 0," +
  "full_mocks INTEGER NOT NULL DEFAULT 0," +
  "PRIMARY KEY (user_id, day)" +
  ");"
);
try { db.exec("ALTER TABLE ai_tutor_sessions ADD COLUMN exam_mode TEXT"); } catch (e) { /* exists */ }
try { db.exec("ALTER TABLE ai_tutor_sessions ADD COLUMN exam_pack TEXT"); } catch (e) { /* exists */ }
try { db.exec("ALTER TABLE ai_tutor_sessions ADD COLUMN status TEXT"); } catch (e) { /* exists */ }

var AI_QUOTA = { text: 30, voiceSec: 15 * 60, fullMocks: 2 };
var AI_WORD_QUOTA = 20;

db.exec(
  "CREATE TABLE IF NOT EXISTS ai_word_usage (" +
  "user_id INTEGER NOT NULL," +
  "day TEXT NOT NULL," +
  "query_count INTEGER NOT NULL DEFAULT 0," +
  "PRIMARY KEY (user_id, day)" +
  ");"
);

var SPEAKING_DATA_DIRS = [
  path.join(__dirname, "data", "speaking"),
  path.join(__dirname, "..", "data", "speaking"),
  "/opt/yysd/repo/data/speaking",
  "/opt/yysd/web/data/speaking"
];
var JIIJING_UPLOAD_DIR = path.join(dataDir, "uploads", "jiijing");
if (!fs.existsSync(JIIJING_UPLOAD_DIR)) fs.mkdirSync(JIIJING_UPLOAD_DIR, { recursive: true });

function speakingDataDir() {
  for (var i = 0; i < SPEAKING_DATA_DIRS.length; i++) {
    if (fs.existsSync(path.join(SPEAKING_DATA_DIRS[i], "jiijing-active.json"))) return SPEAKING_DATA_DIRS[i];
  }
  return SPEAKING_DATA_DIRS[0];
}

function readJsonFile(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadActiveBank() {
  var root = speakingDataDir();
  var activePath = path.join(root, "jiijing-active.json");
  if (!fs.existsSync(activePath)) throw new Error("机经题库未配置");
  var active = readJsonFile(activePath);
  var bankId = String(active.bankId || "").trim();
  if (!bankId) throw new Error("机经题库未配置");
  var bankPath = path.join(root, "jiijing-banks", bankId + ".json");
  if (!fs.existsSync(bankPath)) throw new Error("机经题库文件不存在: " + bankId);
  return readJsonFile(bankPath);
}

function bankSummary(bank) {
  return {
    id: bank.id,
    title: bank.title || bank.id,
    source: bank.source || "",
    part1: (bank.part1 || []).map(function (t) {
      return { id: t.id, topic: t.topic, questionCount: (t.questions || []).length };
    }),
    part2: (bank.part2 || []).map(function (t) {
      return { id: t.id, title: t.title, bulletCount: (t.bullets || []).length, part3Count: (t.part3 || []).length };
    })
  };
}

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function pickPart1Questions(topic, maxN) {
  var qs = (topic.questions || []).slice();
  if (qs.length <= maxN) return qs;
  return shuffle(qs).slice(0, maxN);
}

function buildExamPack(examMode, part1Ids, part2Id) {
  var bank = loadActiveBank();
  var p1map = {};
  (bank.part1 || []).forEach(function (t) { p1map[t.id] = t; });
  var p2map = {};
  (bank.part2 || []).forEach(function (t) { p2map[t.id] = t; });

  var part1Topics = [];
  var part2 = null;

  if (examMode === "practice") {
    var ids = Array.isArray(part1Ids) ? part1Ids : [];
    if (!ids.length) throw new Error("练习模式请至少选择 1 个 Part 1 话题");
    if (!part2Id) throw new Error("练习模式请选择 1 个 Part 2 话题");
    ids.slice(0, 4).forEach(function (id) {
      var t = p1map[clipText(id, 80)];
      if (t) part1Topics.push({
        id: t.id, topic: t.topic,
        questions: pickPart1Questions(t, 4)
      });
    });
    part2 = p2map[clipText(part2Id, 80)];
    if (!part1Topics.length) throw new Error("所选 Part 1 话题无效");
    if (!part2) throw new Error("所选 Part 2 话题无效");
  } else {
    // mock: 2–3 random part1 topics, 1 random part2
    var n = 2 + Math.floor(Math.random() * 2);
    part1Topics = shuffle(bank.part1 || []).slice(0, Math.min(n, (bank.part1 || []).length)).map(function (t) {
      return { id: t.id, topic: t.topic, questions: pickPart1Questions(t, 3 + Math.floor(Math.random() * 2)) };
    });
    var cards = bank.part2 || [];
    if (!cards.length || !part1Topics.length) throw new Error("机经题库为空");
    part2 = cards[Math.floor(Math.random() * cards.length)];
  }

  return {
    bankId: bank.id,
    bankTitle: bank.title || bank.id,
    examMode: examMode,
    part1: part1Topics,
    part2: {
      id: part2.id,
      title: part2.title,
      bullets: part2.bullets || [],
      part3: part2.part3 || []
    }
  };
}

function loadWritingBank() {
  var root = speakingDataDir();
  var p = path.join(root, "writing-prompts.json");
  if (!fs.existsSync(p)) p = path.join(__dirname, "..", "data", "speaking", "writing-prompts.json");
  if (!fs.existsSync(p)) throw new Error("写作题库未配置");
  return readJsonFile(p);
}

function findWritingPrompt(taskType, promptId) {
  var bank = loadWritingBank();
  var list = taskType === "task1" ? (bank.task1 || []) : (bank.task2 || []);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === promptId) return list[i];
  }
  return null;
}

function buildTutorSystem(mode, examType, examPack) {
  if (mode === "examiner" && examPack) {
    var packJson = JSON.stringify(examPack);
    var isMock = examPack.examMode === "mock";
    return (
      "You are a professional IELTS Speaking examiner at YYSD. Speak ONLY in English. " +
      "Conduct the test STRICTLY using this exam pack — do NOT invent topics or questions outside it:\n" +
      packJson + "\n" +
      "Rules: Ask ONE question at a time and wait. Never list multiple questions in one turn. " +
      "If a candidate message starts with [ANSWER_INVALID], their previous answer is VOID (silence timeout). " +
      "Acknowledge briefly, do NOT invite them to retry that question, and move to the NEXT question. " +
      "Factor invalid / empty answers into a lower Fluency and overall band. " +
      "Flow: (1) Brief intro + ask name. (2) Part 1: ask pack part1 questions one by one. " +
      "(3) Part 2: read the FULL cue card title and ALL bullets, say they have one minute to prepare. " +
      "When they are ready, listen to their long turn (up to 2 minutes), then optionally one rounding-off question. " +
      "(4) Part 3: ask pack part3 questions one at a time. " +
      "(5) End and output on its own line: " +
      "SCORE_JSON:{\"overall\":6.0,\"fluency\":6.0,\"lexical\":6.0,\"grammar\":6.0,\"pronunciation\":6.0,\"comment\":\"2-4 sentences\",\"improvements\":[\"tip1\",\"tip2\",\"tip3\"]} " +
      "Bands 0–9 in 0.5 steps; be conservative (typical 4.5–6.5). Treat STT typos leniently. No Chinese." +
      (isMock ? " This is a FORMAL mock — stay strictly exam-like." : " This is practice — still exam-like but you may briefly clarify a misheard word once.")
    );
  }
  if (mode === "examiner") {
    var scope =
      examType === "part1" ? "Only Part 1 (familiar topics, short answers). Do not move to Part 2/3." :
      examType === "part2" ? "Only Part 2: give one cue card, 1 minute prep reminder, then 1–2 minutes speaking, then 1–2 follow-ups. Do not do Part 1/3." :
      examType === "part3" ? "Only Part 3 discussion questions on an abstract theme. Do not do Part 1/2." :
      "Run a full IELTS Speaking test: Part 1 → Part 2 (cue card + 1 min prep + long turn) → Part 3, then score.";
    return (
      "You are a professional IELTS Speaking examiner at YYSD International Course Center. " +
      "Speak ONLY in English. Be concise, formal, and exam-like — do not tutor or translate. " +
      scope + " " +
      "Ask one question (or give the cue card) at a time and wait for the candidate. " +
      "When finished, end with: " +
      "SCORE_JSON:{\"overall\":6.0,\"fluency\":6.0,\"lexical\":6.0,\"grammar\":6.0,\"pronunciation\":6.0,\"comment\":\"2-4 sentences\",\"improvements\":[\"tip1\",\"tip2\"]} " +
      "Bands 0–9 in 0.5 steps. Be conservative (typical 4.5–6.5). Treat STT typos leniently. No Chinese."
    );
  }
  return (
    "你是优益思达国际课程中心（YYSD）的雅思辅导老师，辅导口语与写作。 " +
    "讲解优先用中文，示范句子/范文用英文。帮助学生练口语思路、词汇语法。 " +
    "系统写作批改在写作模块完成；此处可答写作方法问题。 " +
    "不要编造网站没有的功能。若学生要模拟口语考试，提醒切换到「机经模考」。"
  );
}

function clampBand(n) {
  var x = Number(n);
  if (!isFinite(x)) return null;
  if (x < 0) x = 0;
  if (x > 9) x = 9;
  return Math.round(x * 2) / 2;
}

// Official IELTS Writing: overall = mean of 4 criteria, then nearest 0.5
function overallFromCriteria(task, coherence, lexical, grammar) {
  var parts = [task, coherence, lexical, grammar].map(Number).filter(isFinite);
  if (parts.length !== 4) return null;
  var avg = (parts[0] + parts[1] + parts[2] + parts[3]) / 4;
  return Math.round(avg * 2) / 2;
}

function extractWritingJsonObject(raw) {
  var s = String(raw || "").trim();
  var marked = s.match(/WRITING_JSON:\s*(\{[\s\S]*\})/);
  if (marked) s = marked[1];
  else {
    var fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) s = fenced[1].trim();
    var start = s.indexOf("{");
    var end = s.lastIndexOf("}");
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
  }
  try {
    return JSON.parse(s);
  } catch (e1) {
    // ponytail: modelEssay often breaks JSON with raw newlines — salvage scores/text fields
    try {
      var loose = s
        .replace(/\r\n/g, "\n")
        .replace(/[\u0000-\u001f]/g, function (ch) {
          return ch === "\n" || ch === "\t" ? ch : "";
        });
      return JSON.parse(loose);
    } catch (e2) {
      return null;
    }
  }
}

function parseWritingGrade(raw) {
  var o = extractWritingJsonObject(raw);
  if (!o || typeof o !== "object") return null;
  var task = clampBand(o.task);
  var coherence = clampBand(o.coherence);
  var lexical = clampBand(o.lexical);
  var grammar = clampBand(o.grammar);
  if (task == null || coherence == null || lexical == null || grammar == null) return null;
  var overall = overallFromCriteria(task, coherence, lexical, grammar);
  var criteriaNotes = o.criteriaNotes && typeof o.criteriaNotes === "object" ? o.criteriaNotes : {};
  return {
    overall: overall,
    task: task,
    coherence: coherence,
    lexical: lexical,
    grammar: grammar,
    criteriaNotes: {
      task: String(criteriaNotes.task || "").trim(),
      coherence: String(criteriaNotes.coherence || "").trim(),
      lexical: String(criteriaNotes.lexical || "").trim(),
      grammar: String(criteriaNotes.grammar || "").trim()
    },
    paragraphNotes: Array.isArray(o.paragraphNotes) ? o.paragraphNotes.map(function (n) { return String(n || "").trim(); }).filter(Boolean) : [],
    corrections: Array.isArray(o.corrections) ? o.corrections.map(function (c) {
      return {
        bad: String((c && c.bad) || "").trim(),
        good: String((c && c.good) || "").trim(),
        why: String((c && c.why) || "").trim()
      };
    }).filter(function (c) { return c.bad && c.good; }) : [],
    modelEssay: String(o.modelEssay || "").trim(),
    comment: String(o.comment || "").trim(),
    nextSteps: Array.isArray(o.nextSteps) ? o.nextSteps.map(function (n) { return String(n || "").trim(); }).filter(Boolean) : []
  };
}

function buildWritingGradeSystem(taskType, promptBody, chartBlock) {
  var isT1 = taskType === "task1";
  var taskName = isT1 ? "Task 1 (Academic)" : "Task 2";
  var taskRubric = isT1
    ? (
      "Task Achievement (TA):\n" +
      "- 5: addresses task only partially; limited overview; details may be irrelevant/inaccurate; may not cover key features.\n" +
      "- 6: addresses requirements; presents overview; selects main features but may be mechanical; details may be inaccurate/irrelevant at times.\n" +
      "- 7: covers requirements; clear overview; clearly presents & highlights key features; may under/over-generalise occasionally.\n" +
      "- 8: covers all requirements sufficiently; clear well-selected key features; well-developed with accurate details.\n" +
      "- 9: fully satisfies; insightful overview; key features clearly highlighted & fully extended.\n"
    )
    : (
      "Task Response (TR):\n" +
      "- 5: partially addresses; position unclear/repetitive; ideas limited; may lack focus; format may be inappropriate.\n" +
      "- 6: addresses all parts though some more fully; relevant position; conclusions may be unclear/repetitive; ideas relevant but unevenly developed.\n" +
      "- 7: addresses all parts; clear position throughout; presents/extends/supports main ideas but may over-generalise or lack focus at times.\n" +
      "- 8: sufficiently addresses all parts; well-developed response; well-supported & extended ideas.\n" +
      "- 9: fully addresses; fully developed position; relevant, fully extended & well-supported ideas.\n"
    );
  return (
    "You are a certified IELTS Writing examiner for YYSD. Grade " + taskName + " using PUBLIC IELTS band descriptors only.\n" +
    "Explanations/advice in Chinese; quote student English & write modelEssay in English.\n\n" +
    "Rubric anchors (use these; do NOT default everything to 6.0):\n" +
    taskRubric +
    "Coherence & Cohesion (CC):\n" +
    "- 5: organisation inadequate; limited progression; cohesive devices faulty/repetitive; paragraphing may be inadequate.\n" +
    "- 6: arranges info coherently; clear overall progression; cohesive devices used but faulty/mechanical; referencing may be unclear; paragraphing may not always be logical.\n" +
    "- 7: logically organised; clear progression; range of cohesive devices used well with occasional under/over-use; clear central topic per paragraph.\n" +
    "- 8: sequences information skilfully; managed cohesion; paragraphing sufficient & appropriate.\n" +
    "- 9: cohesion subtle; paragraphing skillful.\n" +
    "Lexical Resource (LR):\n" +
    "- 5: limited range; noticeable errors in word choice/formation that may cause difficulty; may be repetitive.\n" +
    "- 6: adequate range for task; attempts less common vocab with some inaccuracy; some errors in spelling/word formation do not impede communication.\n" +
    "- 7: sufficient range & flexibility; less common items with some awareness of style/collocation; occasional errors in word choice/spelling/formation.\n" +
    "- 8: wide range fluently & flexibly; skilful uncommon items; rare errors only as 'slips'.\n" +
    "- 9: full flexibility & precise use; natural & sophisticated control.\n" +
    "Grammatical Range & Accuracy (GRA):\n" +
    "- 5: limited range; frequent errors that may cause difficulty; complex sentences attempted but usually faulty.\n" +
    "- 6: mix of simple & complex; errors occur but rarely impede communication; complex structures may lack flexibility.\n" +
    "- 7: variety of complex structures; frequent error-free sentences; good control with occasional errors.\n" +
    "- 8: wide range; majority error-free; rare slips.\n" +
    "- 9: full flexibility & accuracy; rare minor errors as slips.\n\n" +
    "Scoring rules:\n" +
    "- Each criterion 0–9 in 0.5 steps. Differ scores when evidence differs; do not copy sample numbers.\n" +
    "- Under-length (<150 T1 / <250 T2) must lower TA/TR.\n" +
    "- Off-topic or memorised material: lower TA/TR sharply.\n" +
    "- overall MUST equal the mean of the four criteria, rounded to nearest 0.5 (official method).\n" +
    "- Be fair like an examiner: neither flattering nor stuck at 6.0.\n" +
    (chartBlock
      ? "- Task 1 chart image is NOT visible; use captions only and be conservative on TA data accuracy.\n"
      : "") +
    "\nQuestion prompt:\n" + promptBody + "\n" + chartBlock +
    "\nReturn ONLY one line starting with WRITING_JSON: then a single JSON object (no markdown, no prose outside JSON). " +
    "Escape newlines inside strings as \\n. Schema:\n" +
    "WRITING_JSON:{" +
    "\"overall\":6.5,\"task\":6.5,\"coherence\":6.0,\"lexical\":7.0,\"grammar\":6.5," +
    "\"comment\":\"中文总评（对照四项，说明为何是这个总分）\"," +
    "\"criteriaNotes\":{\"task\":\"中文：对照TA/TR描述语说明为何给该分\"," +
    "\"coherence\":\"中文：对照CC\",\"lexical\":\"中文：对照LR\",\"grammar\":\"中文：对照GRA\"}," +
    "\"paragraphNotes\":[\"段1：中文具体优缺点\",\"段2：...\"]," +
    "\"corrections\":[{\"bad\":\"exact student phrase\",\"good\":\"improved English\",\"why\":\"中文原因（语法/词汇/连贯）\"}]," +
    "\"nextSteps\":[\"中文可执行改进建议1\",\"建议2\",\"建议3\"]," +
    "\"modelEssay\":\"Band 8-ish model answer for THIS prompt only, English, use \\\\n between paragraphs\"}"
  );
}

app.get("/api/health", function (req, res) {
  res.json({ ok: true, service: "yysd-api", ai: !!DASHSCOPE_KEY });
});

app.get("/api/tenant/bootstrap", function (req, res) {
  var org = resolveRequestOrg(req);
  if (!org) return res.status(404).json({ error: "机构不存在" });
  res.json({ ok: true, org: tenant.orgPublicPayload(org) });
});

// ngrok 内测：网页与 API 同端口，别人通过一个链接即可测试 AI 精听
app.get("/test/jingting", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "library", "practice", "jingting", "cam20-test1-section1.html"));
});

app.get("/test/speaking", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "speaking-select.html"));
});

app.post("/api/auth/send-code", async function (req, res) {
  var org = resolveRequestOrg(req);
  if (rejectIfOrgUnusable(res, org)) return;
  var phone = normalizePhone(req.body && req.body.phone);
  var purpose = String((req.body && req.body.purpose) || "register").trim();
  if (!phone) return res.status(400).json({ error: "请输入正确的手机号" });
  if (isTenantOrg(org) && (purpose === "register" || purpose === "reset")) {
    return res.status(403).json({ error: "本站不支持短信验证，请联系学校管理员" });
  }
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
  var org = resolveRequestOrg(req);
  if (rejectIfOrgUnusable(res, org)) return;
  var phone = normalizePhone(req.body && req.body.phone);
  var code = String((req.body && req.body.code) || "").trim();
  var password = String((req.body && req.body.password) || "");
  var confirm = String((req.body && req.body.confirm) || "");
  var regKey = String((req.body && (req.body.regKey || req.body.registerKey)) || "").trim();
  var tenantSite = isTenantOrg(org);

  if (!phone) return res.status(400).json({ error: "请输入正确的手机号" });
  var pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  if (password !== confirm) return res.status(400).json({ error: "两次密码不一致" });

  if (tenantSite) {
    var peek = resolveRegKey(org.id, "student", regKey);
    if (peek.error) return res.status(400).json({ error: peek.error });
  } else {
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "手机号或验证码格式不正确" });
    }
    if (!verifySmsCode(phone, code)) {
      return res.status(400).json({ error: "验证码错误或已过期" });
    }
  }

  var existing = stmts.findUser.get(phone);
  if (existing && existing.password_hash) {
    return res.status(400).json({ error: "该手机号已注册，请直接登录" });
  }

  var nowIso = new Date().toISOString();
  var hash = hashPassword(password);
  try {
    var txReg = db.transaction(function () {
      if (tenantSite) {
        var consumed = consumeRegKey(org.id, "student", regKey);
        if (consumed.error) throw Object.assign(new Error(consumed.error), { httpStatus: 400 });
      }
      if (existing) {
        stmts.setPassword.run(hash, nowIso, phone);
        db.prepare("UPDATE users SET org_id = ? WHERE phone = ?").run(org.id, phone);
      } else {
        stmts.insertUser.run(phone, hash, nowIso, nowIso, org.id);
      }
    });
    txReg();
  } catch (e) {
    return res.status(e.httpStatus || 400).json({ error: e.message || "注册失败" });
  }
  var user = stmts.findUser.get(phone);
  var token = issueToken(user, phone);
  if (!token) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });

  res.json({ ok: true, token: token, user: authUserPayload(user), org: tenant.orgPublicPayload(org) });
});

app.post("/api/auth/login", function (req, res) {
  var org = resolveRequestOrg(req);
  if (rejectIfOrgUnusable(res, org)) return;
  var phone = normalizePhone(req.body && req.body.phone);
  var password = String((req.body && req.body.password) || "");
  if (!phone) return res.status(400).json({ error: "请输入正确的手机号" });
  var pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  var loginKey = phone + "|" + (req.ip || "unknown");
  var gate = canLogin(loginKey);
  if (!gate.ok) return res.status(429).json({ error: gate.msg });

  var user = stmts.findUser.get(phone);
  if (user && user.password_hash) {
    if (user.org_id && user.org_id !== org.id) {
      noteLoginFail(loginKey);
      return res.status(400).json({ error: "该账号不属于当前机构，请从正确的网址登录" });
    }
    if (!verifyPassword(password, user.password_hash)) {
      noteLoginFail(loginKey);
      return res.status(400).json({ error: "手机号或密码错误" });
    }
    clearLoginFail(loginKey);
    var nowIso = new Date().toISOString();
    stmts.touchLogin.run(nowIso, phone);
    user.last_login_at = nowIso;
    if (!user.org_id) {
      db.prepare("UPDATE users SET org_id = ? WHERE phone = ?").run(org.id, phone);
      user.org_id = org.id;
    }
    var studentToken = issueToken(user, phone);
    if (!studentToken) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
    return res.json({
      ok: true,
      token: studentToken,
      role: "student",
      user: authUserPayload(user),
      org: tenant.orgPublicPayload(org)
    });
  }

  var teacher = stmts.findTeacher.get(phone);
  if (teacher && teacher.password_hash && verifyPassword(password, teacher.password_hash)) {
    if (teacher.org_id && teacher.org_id !== org.id && !isAdminPhone(phone)) {
      noteLoginFail(loginKey);
      return res.status(400).json({ error: "该账号不属于当前机构，请从正确的网址登录" });
    }
    clearLoginFail(loginKey);
    var tNow = new Date().toISOString();
    stmts.touchTeacherLogin.run(tNow, phone);
    teacher.last_login_at = tNow;
    if (!teacher.org_id) {
      db.prepare("UPDATE teachers SET org_id = ? WHERE phone = ?").run(org.id, phone);
      teacher.org_id = org.id;
    }
    // Platform admin may open any usable org from that subdomain (JWT only; DB org unchanged)
    var tokenTeacher = isAdminPhone(phone)
      ? Object.assign({}, teacher, { org_id: org.id })
      : teacher;
    var teacherToken = issueTeacherToken(tokenTeacher, phone);
    if (!teacherToken) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
    return res.json({
      ok: true,
      token: teacherToken,
      role: "teacher",
      teacher: teacherPayload(tokenTeacher),
      org: tenant.orgPublicPayload(org)
    });
  }

  noteLoginFail(loginKey);
  return res.status(400).json({ error: "手机号或密码错误" });
});

app.post("/api/auth/reset-password", function (req, res) {
  var org = resolveRequestOrg(req);
  if (rejectIfOrgUnusable(res, org)) return;
  if (isTenantOrg(org)) {
    return res.status(403).json({ error: "本站不支持短信重置密码，请联系学校管理员或超级管理员" });
  }
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
    if (req.user.platformImpersonate) {
      return res.json({
        ok: true,
        user: {
          id: req.user.sub || 0,
          phone: maskPhone(req.user.phone),
          displayName: "平台客服",
          role: "teacher",
          orgId: req.user.orgId || null,
          isAdmin: true,
          isPlatformAdmin: isAdminPhone(req.user.phone),
          impersonating: true
        }
      });
    }
    var teacher = stmts.findTeacher.get(req.user.phone);
    if (!teacher) return res.status(404).json({ error: "用户不存在" });
    var tPay = teacherPayload(Object.assign({}, teacher, {
      org_id: req.user.orgId || teacher.org_id
    }));
    return res.json({
      ok: true,
      user: Object.assign(tPay, { role: "teacher" })
    });
  }
  var user = stmts.findUser.get(req.user.phone);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  res.json({
    ok: true,
    user: Object.assign(authUserPayload(user), { role: "student" })
  });
});

app.post("/api/auth/avatar", authMiddleware, function (req, res) {
  try {
    var image = (req.body && req.body.image) || "";
    if (req.user.role === "teacher") {
      var teacher = stmts.findTeacher.get(req.user.phone);
      if (!teacher) return res.status(404).json({ error: "账号不存在" });
      var tSaved = saveAvatarDataUrl("t", teacher.id, image);
      if (tSaved.error) return res.status(400).json({ error: tSaved.error });
      stmts.setTeacherAvatar.run(tSaved.url.split("?")[0], req.user.phone);
      teacher.avatar_url = tSaved.url;
      return res.json({ ok: true, avatarUrl: tSaved.url, user: Object.assign(teacherPayload(teacher), { role: "teacher" }) });
    }
    var user = stmts.findUser.get(req.user.phone);
    if (!user) return res.status(404).json({ error: "账号不存在" });
    var saved = saveAvatarDataUrl("u", user.id, image);
    if (saved.error) return res.status(400).json({ error: saved.error });
    stmts.setUserAvatar.run(saved.url.split("?")[0], req.user.phone);
    user.avatar_url = saved.url;
    res.json({ ok: true, avatarUrl: saved.url, user: Object.assign(authUserPayload(user), { role: "student" }) });
  } catch (e) {
    console.error("[yysd-api] avatar upload error", e && e.message);
    res.status(500).json({ error: "头像上传失败，请稍后重试" });
  }
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
  var inviteToken = String((req.body && req.body.inviteToken) || "").trim();
  var invite = null;
  var org = resolveRequestOrg(req);
  var tenantSite = isTenantOrg(org);
  var staffKey = null;
  var becomeOrgAdmin = false;

  if (tenantSite && inviteToken) {
    return res.status(403).json({ error: "本站不支持邀请链接注册，请使用管理员发放的注册密钥" });
  }

  if (inviteToken) {
    invite = orgStmts.findInviteByToken.get(inviteToken);
    if (!invite || invite.used_at) {
      return res.status(400).json({ error: "邀请链接无效或已使用" });
    }
    if (Date.parse(invite.expires_at) < Date.now()) {
      return res.status(400).json({ error: "邀请链接已过期，请联系优益思达重新发送" });
    }
    org = tenant.ensureOrgStatus(db, orgStmts.findOrgById.get(invite.org_id));
    if (!org || !tenant.orgUsable(org)) {
      return res.status(403).json({ error: "机构服务已暂停，请联系管理员" });
    }
    tenantSite = isTenantOrg(org);
  } else {
    if (rejectIfOrgUnusable(res, org)) return;
  }

  var phone = normalizePhone(req.body && req.body.phone);
  var password = String((req.body && req.body.password) || "");
  var confirm = String((req.body && req.body.confirm) || "");
  var teacherKey = String((req.body && req.body.teacherKey) || (req.body && req.body.regKey) || "");
  var roleHint = String((req.body && req.body.role) || "").trim();
  var name = String((req.body && req.body.name) || "").trim().slice(0, 40);
  if (!phone) return res.status(400).json({ error: "请输入正确的手机号" });

  if (invite) {
    if (invite.phone && phoneDigits(invite.phone) !== phone) {
      return res.status(400).json({ error: "请使用邀请指定的手机号注册：" + maskPhone(invite.phone) });
    }
    becomeOrgAdmin = invite.role === "org_admin";
  } else if (tenantSite) {
    staffKey = resolveStaffRegKey(org.id, teacherKey, roleHint);
    if (staffKey.error) return res.status(403).json({ error: staffKey.error });
    becomeOrgAdmin = staffKey.role === "org_admin";
  } else if (!verifyTeacherKey(teacherKey)) {
    return res.status(403).json({ error: "教师注册密钥不正确。公司管理员请使用邀请链接注册。" });
  }

  var pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  if (password !== confirm) return res.status(400).json({ error: "两次密码不一致" });
  if (stmts.findTeacher.get(phone)) {
    if (becomeOrgAdmin && (invite || staffKey)) {
      var existing = stmts.findTeacher.get(phone);
      if (existing.org_id && existing.org_id !== org.id) {
        return res.status(400).json({ error: "该手机号已在其他机构注册" });
      }
      var nowBind = new Date().toISOString();
      try {
        var txBind = db.transaction(function () {
          if (staffKey) {
            var c = consumeRegKey(org.id, staffKey.role, staffKey.key);
            if (c.error) throw Object.assign(new Error(c.error), { httpStatus: 403 });
          }
          if (!existing.org_id) {
            db.prepare("UPDATE teachers SET org_id = ? WHERE phone = ?").run(org.id, phone);
          }
          orgStmts.setOrgAdminPhone.run(phone, org.id);
          if (invite) orgStmts.markInviteUsed.run(nowBind, invite.id);
        });
        txBind();
      } catch (e) {
        return res.status(e.httpStatus || 400).json({ error: e.message || "绑定失败" });
      }
      return res.json({
        ok: true,
        alreadyRegistered: true,
        message: "已设为该公司管理员，请使用原密码登录",
        org: tenant.orgPublicPayload(org)
      });
    }
    return res.status(400).json({ error: "该手机号已注册教师账号，请直接登录" });
  }
  if (stmts.findUser.get(phone) && stmts.findUser.get(phone).password_hash) {
    return res.status(400).json({ error: "该手机号已注册为学生账号，请使用其他手机号" });
  }

  var nowIso = new Date().toISOString();
  var hash = hashPassword(password);
  try {
    var tx = db.transaction(function () {
      if (staffKey) {
        var consumed = consumeRegKey(org.id, staffKey.role, staffKey.key);
        if (consumed.error) throw Object.assign(new Error(consumed.error), { httpStatus: 403 });
      }
      stmts.insertTeacher.run(phone, hash, name || null, nowIso, nowIso, org.id);
      if (becomeOrgAdmin) {
        orgStmts.setOrgAdminPhone.run(phone, org.id);
      }
      if (invite) {
        orgStmts.markInviteUsed.run(nowIso, invite.id);
      }
    });
    tx();
  } catch (e) {
    return res.status(e.httpStatus || 400).json({ error: e.message || "注册失败" });
  }

  var teacher = stmts.findTeacher.get(phone);
  var token = issueTeacherToken(teacher, phone);
  if (!token) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
  if (becomeOrgAdmin) {
    auditPlatform(phone, "org.admin_register", org.id, org.slug + (staffKey ? " key" : " invite"));
  }
  res.json({
    ok: true,
    token: token,
    teacher: teacherPayload(teacher),
    org: tenant.orgPublicPayload(org)
  });
});

app.get("/api/tenant/invite/:token", function (req, res) {
  var token = String(req.params.token || "").trim();
  var invite = orgStmts.findInviteByToken.get(token);
  if (!invite || invite.used_at) {
    return res.status(400).json({ error: "邀请链接无效或已使用" });
  }
  if (Date.parse(invite.expires_at) < Date.now()) {
    return res.status(400).json({ error: "邀请链接已过期" });
  }
  var org = tenant.ensureOrgStatus(db, orgStmts.findOrgById.get(invite.org_id));
  if (!org) return res.status(404).json({ error: "机构不存在" });
  res.json({
    ok: true,
    invite: {
      role: invite.role,
      phone: invite.phone ? maskPhone(invite.phone) : "",
      phoneFull: invite.phone || "",
      expiresAt: invite.expires_at
    },
    org: tenant.orgPublicPayload(org)
  });
});

app.post("/api/teacher/login", function (req, res) {
  var org = resolveRequestOrg(req);
  if (rejectIfOrgUnusable(res, org)) return;
  var phone = normalizePhone(req.body && req.body.phone);
  var password = String((req.body && req.body.password) || "");
  if (!phone) return res.status(400).json({ error: "请输入正确的手机号" });
  var pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  var loginKey = "t|" + phone + "|" + (req.ip || "unknown");
  var gate = canLogin(loginKey);
  if (!gate.ok) return res.status(429).json({ error: gate.msg });

  var teacher = stmts.findTeacher.get(phone);
  if (!teacher || !teacher.password_hash) {
    noteLoginFail(loginKey);
    return res.status(400).json({ error: "教师账号未注册" });
  }
  if (!verifyPassword(password, teacher.password_hash)) {
    noteLoginFail(loginKey);
    return res.status(400).json({ error: "手机号或密码错误" });
  }
  if (teacher.org_id && teacher.org_id !== org.id && !isAdminPhone(phone)) {
    noteLoginFail(loginKey);
    return res.status(400).json({ error: "该账号不属于当前机构，请从正确的网址登录" });
  }

  clearLoginFail(loginKey);
  var nowIso = new Date().toISOString();
  stmts.touchTeacherLogin.run(nowIso, phone);
  teacher.last_login_at = nowIso;
  if (!teacher.org_id) {
    db.prepare("UPDATE teachers SET org_id = ? WHERE phone = ?").run(org.id, phone);
    teacher.org_id = org.id;
  }
  var tokenTeacher = isAdminPhone(phone)
    ? Object.assign({}, teacher, { org_id: org.id })
    : teacher;

  var token = issueTeacherToken(tokenTeacher, phone);
  if (!token) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
  res.json({
    ok: true,
    token: token,
    teacher: teacherPayload(tokenTeacher),
    org: tenant.orgPublicPayload(org)
  });
});

app.get("/api/teacher/me", teacherAuthMiddleware, function (req, res) {
  if (req.user.platformImpersonate) {
    var org = orgStmts.findOrgById.get(req.user.orgId);
    return res.json({
      ok: true,
      teacher: {
        id: req.user.sub || 0,
        phone: maskPhone(req.user.phone),
        name: "平台客服",
        avatarUrl: "",
        orgId: req.user.orgId || null,
        isAdmin: true,
        isPlatformAdmin: isAdminPhone(req.user.phone),
        impersonating: true
      },
      org: tenant.orgPublicPayload(org)
    });
  }
  var teacher = stmts.findTeacher.get(req.user.phone);
  if (!teacher) return res.status(404).json({ error: "教师不存在" });
  res.json({
    ok: true,
    teacher: teacherPayload(teacher)
  });
});

function parseScorePayload(row) {
  var rec = null;
  try { rec = JSON.parse(row.payload); } catch (e) { rec = null; }
  if (!rec || typeof rec !== "object") rec = {};
  var wrong = [];
  if (Array.isArray(rec.wrong)) {
    wrong = sanitizeWrong(rec.wrong);
  }
  var durationSec = rec.durationSec != null ? Number(rec.durationSec) : null;
  if (!isFinite(durationSec) || durationSec < 0) durationSec = null;
  else durationSec = Math.round(durationSec);
  var startedAt = clipText(rec.startedAt, 40) || null;
  var date = clipText(rec.date, 40) || row.created_at || row.updated_at;
  if (durationSec == null && startedAt && date) {
    var a = Date.parse(startedAt), b = Date.parse(date);
    if (isFinite(a) && isFinite(b) && b >= a) durationSec = Math.round((b - a) / 1000);
  }
  return {
    id: row.item_id,
    attemptId: row.id != null ? row.id : null,
    title: clipText(rec.title, 200),
    zone: clipText(rec.zone, 40),
    subject: clipText(rec.subject, 60),
    score: rec.score != null ? rec.score : null,
    total: rec.total != null ? rec.total : null,
    band: rec.band != null ? rec.band : null,
    writingWords: rec.writingWords != null ? rec.writingWords : null,
    writingTask1: clipText(rec.writingTask1, 8000) || null,
    writingTask2: clipText(rec.writingTask2, 8000) || null,
    date: date,
    startedAt: startedAt,
    durationSec: durationSec,
    assignmentEventId: clipText(rec.assignmentEventId != null ? String(rec.assignmentEventId) : "", 40) || null,
    cdt: !!rec.cdt,
    wrongCapture: clipText(rec.wrongCapture, 40) || null,
    updatedAt: row.created_at || row.updated_at,
    wrong: wrong
  };
}

function teacherAssignmentIndex(teacherId) {
  var events = stmts.listTeacherEvents.all(teacherId);
  var byEventId = {};
  var itemToStudents = {};
  events.forEach(function (row) {
    if (row.event_type !== "ASSIGNMENT") return;
    var eventId = String(row.id);
    var targets = [];
    try { targets = JSON.parse(row.target_student_ids || "[]"); } catch (e) { targets = []; }
    var targetSet = {};
    targets.forEach(function (sid) {
      var n = Number(sid);
      if (n > 0) targetSet[n] = 1;
    });
    var ids = [];
    try { ids = JSON.parse(row.linked_exercise_ids || "[]"); } catch (e) { ids = []; }
    byEventId[eventId] = { targetSet: targetSet, itemIds: ids };
    ids.forEach(function (itemId) {
      var key = String(itemId);
      if (!itemToStudents[key]) itemToStudents[key] = {};
      Object.keys(targetSet).forEach(function (sid) { itemToStudents[key][sid] = 1; });
    });
  });
  return { byEventId: byEventId, itemToStudents: itemToStudents };
}

function isTeacherAssignmentAttempt(score, studentId, index) {
  if (!score || !index) return false;
  var sid = String(studentId);
  if (score.assignmentEventId) {
    var ev = index.byEventId[String(score.assignmentEventId)];
    return !!(ev && ev.targetSet[sid]);
  }
  // ponytail: legacy rows without event id — same paper self-practice may match
  var itemMap = index.itemToStudents[String(score.id)];
  return !!(itemMap && itemMap[sid]);
}

// Teacher board: admin sees all; others see 真题 + 上传作业 + 自己布置任务完成的练习
function isVisibleTeacherScore(score, studentId, index, isAdmin) {
  if (!score) return false;
  if (isAdmin) return true;
  if (score.zone === "mock" || score.zone === "assignment") return true;
  return isTeacherAssignmentAttempt(score, studentId, index);
}

app.get("/api/teacher/students", teacherAuthMiddleware, function (req, res) {
  var zone = clipText(req.query.zone, 40);
  var allowed = allowedStudentIdsForTeacher(req);
  var allowedSet = null;
  if (allowed) {
    allowedSet = {};
    allowed.forEach(function (id) { allowedSet[id] = 1; });
  }
  var isAdmin = isOrgAdminReq(req);
  var assignIndex = teacherAssignmentIndex(req.user.sub);
  var orgId = req.user.orgId;
  var rows = (orgId ? orgStmts.listStudentsByOrg.all(orgId) : []).filter(function (row) {
    return !allowedSet || allowedSet[row.id];
  });
  var students = rows.map(function (row) {
    var scores = stmts.listStudentAttempts.all(row.id).map(parseScorePayload)
      .filter(function (s) { return isVisibleTeacherScore(s, row.id, assignIndex, isAdmin); });
    var filtered = zone ? scores.filter(function (s) { return s.zone === zone; }) : scores;
    var mockCount = scores.filter(function (s) { return s.zone === "mock"; }).length;
    var homeworkCount = scores.filter(function (s) {
      return s.zone === "assignment" || s.assignmentEventId ||
        (s.zone !== "mock" && isTeacherAssignmentAttempt(s, row.id, assignIndex));
    }).length;
    return {
      id: row.id,
      phone: maskPhone(row.phone),
      displayName: row.display_name || "",
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      scoreCount: scores.length,
      mockCount: mockCount,
      homeworkCount: homeworkCount,
      lastScoreAt: scores.length ? (scores[0].date || row.last_score_at || null) : null,
      scores: filtered
    };
  });
  if (zone) {
    students = students.filter(function (s) { return s.scores.length > 0; });
  }
  res.json({ ok: true, students: students, isAdmin: isAdmin });
});

app.get("/api/teacher/students/:userId/scores", teacherAuthMiddleware, function (req, res) {
  var userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: "无效的学生 ID" });
  if (!teacherCanManageStudent(req, userId)) {
    return res.status(403).json({ error: "该学生未分配给你" });
  }
  var user = stmts.findUserById.get(userId);
  if (!user || (req.user.orgId && user.org_id !== req.user.orgId)) {
    return res.status(404).json({ error: "学生不存在" });
  }
  var zone = clipText(req.query.zone, 40);
  var isAdmin = isOrgAdminReq(req);
  var assignIndex = teacherAssignmentIndex(req.user.sub);
  var scores = stmts.listStudentAttempts.all(userId).map(parseScorePayload)
    .filter(function (s) { return isVisibleTeacherScore(s, userId, assignIndex, isAdmin); });
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

// ---- Calendar / Assignments (Step 1 APIs) ----

app.post("/api/calendar/events", teacherAuthMiddleware, function (req, res) {
  var body = req.body || {};
  var title = clipText(body.title, 80);
  var description = clipText(body.description, 2000);
  var eventType = clipText(body.eventType || body.event_type, 20).toUpperCase();
  var startTime = clipText(body.startTime || body.start_time, 40) || null;
  var dueTime = clipText(body.dueTime || body.due_time, 40) || null;
  var targetStudentIds = parseStudentIds(body.targetStudentIds || body.target_student_ids);
  var linkedExerciseIds = parseExerciseIds(body.linkedExerciseIds || body.linked_exercise_ids);
  var htmlContent = body.htmlContent != null ? String(body.htmlContent) : "";
  var htmlFileName = clipText(body.htmlFileName || body.html_file_name, 120);
  var cdtPack = String(body.cdtPack || body.cdt_pack || "").toLowerCase();
  if (cdtPack !== "drill" && cdtPack !== "exam") cdtPack = "";

  if (!title) return res.status(400).json({ error: "请填写标题" });
  if (!EVENT_TYPES[eventType]) {
    return res.status(400).json({ error: "类型须为 ASSIGNMENT / LESSON / ANNOUNCEMENT" });
  }
  if (!targetStudentIds.length) return res.status(400).json({ error: "请至少选择一名学生" });
  if (eventType === "ASSIGNMENT" && !dueTime && !startTime) {
    return res.status(400).json({ error: "练习作业请设置截止时间或开始时间" });
  }
  if (eventType === "LESSON" && !startTime) {
    return res.status(400).json({ error: "课程日程请设置上课时间" });
  }
  if (htmlContent && eventType !== "ASSIGNMENT") {
    return res.status(400).json({ error: "只有练习作业可以上传 HTML" });
  }
  if (htmlFileName && !/\.html?$/i.test(htmlFileName)) {
    return res.status(400).json({ error: "仅支持 .html 文件" });
  }

  for (var i = 0; i < targetStudentIds.length; i++) {
    var calStu = stmts.findUserById.get(targetStudentIds[i]);
    if (!calStu || (req.user.orgId && calStu.org_id !== req.user.orgId)) {
      return res.status(400).json({ error: "学生 ID 无效：" + targetStudentIds[i] });
    }
    if (!teacherCanManageStudent(req, targetStudentIds[i])) {
      return res.status(403).json({ error: "只能给已分配给你的学生布置任务" });
    }
  }

  var now = new Date().toISOString();
  var exerciseJson = JSON.stringify(eventType === "ASSIGNMENT" ? linkedExerciseIds : []);
  var packToStore = eventType === "ASSIGNMENT" && !htmlContent ? cdtPack : "";
  var info = stmts.insertCalendarEvent.run(
    title,
    description || "",
    eventType,
    startTime,
    dueTime,
    req.user.sub,
    JSON.stringify(targetStudentIds),
    exerciseJson,
    now,
    null,
    packToStore || null
  );
  var eventId = info.lastInsertRowid;

  if (htmlContent) {
    var saved = saveAssignmentHtml(eventId, htmlContent);
    if (saved.error) {
      db.prepare("DELETE FROM calendar_events WHERE id = ?").run(eventId);
      return res.status(400).json({ error: saved.error });
    }
    var uploadId = "upload-" + eventId;
    stmts.setEventAttachment.run(
      htmlFileName || ("练习-" + eventId + ".html"),
      JSON.stringify([uploadId]),
      eventId
    );
  }

  var insertMany = db.transaction(function (ids) {
    ids.forEach(function (sid) { stmts.insertTaskStatus.run(eventId, sid); });
  });
  insertMany(targetStudentIds);

  var row = stmts.getCalendarEvent.get(eventId);
  res.json({ ok: true, event: eventFromRow(row) });
});

app.get("/api/calendar/events", teacherAuthMiddleware, function (req, res) {
  var rows = stmts.listTeacherEvents.all(req.user.sub);
  var events = rows.map(function (row) {
    var statuses = stmts.listStatusesForEvent.all(row.id);
    var summary = { total: statuses.length, pending: 0, completed: 0, overdue: 0 };
    statuses.forEach(function (s) {
      var st = effectiveTaskStatus(s.status, row.due_time);
      if (st === "COMPLETED") summary.completed++;
      else if (st === "OVERDUE") summary.overdue++;
      else summary.pending++;
    });
    return eventFromRow(row, { statusSummary: summary });
  });
  res.json({ ok: true, events: events });
});

app.get("/api/calendar/events/:id", teacherAuthMiddleware, function (req, res) {
  var id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "无效 ID" });
  var row = stmts.getCalendarEvent.get(id);
  if (!row || row.created_by !== req.user.sub) return res.status(404).json({ error: "任务不存在" });
  var exerciseIds = [];
  try { exerciseIds = JSON.parse(row.linked_exercise_ids || "[]"); } catch (e) {}
  var statuses = stmts.listStatusesForEvent.all(id).map(function (s) {
    var stu = stmts.findUserById.get(s.student_id);
    var scored = {};
    stmts.listScores.all(s.student_id).forEach(function (r) { scored[r.item_id] = 1; });
    var doneIds = exerciseIds.filter(function (xid) { return scored[xid]; });
    return {
      studentId: s.student_id,
      displayName: (stu && stu.display_name) || "",
      phone: stu ? maskPhone(stu.phone) : "",
      status: effectiveTaskStatus(s.status, row.due_time),
      completedAt: s.completed_at || null,
      doneExerciseIds: doneIds,
      exerciseDone: doneIds.length,
      exerciseTotal: exerciseIds.length
    };
  });
  res.json({
    ok: true,
    event: eventFromRow(row, { students: statuses, linkedExerciseIds: exerciseIds })
  });
});

app.delete("/api/calendar/events/:id", teacherAuthMiddleware, function (req, res) {
  var id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "无效 ID" });
  var row = stmts.getCalendarEvent.get(id);
  if (!row || row.created_by !== req.user.sub) return res.status(404).json({ error: "任务不存在" });
  db.prepare("DELETE FROM student_task_status WHERE event_id = ?").run(id);
  stmts.deleteCalendarEvent.run(id, req.user.sub);
  try {
    var hp = assignmentHtmlPath(id);
    if (fs.existsSync(hp)) fs.unlinkSync(hp);
  } catch (e) {}
  res.json({ ok: true });
});

app.get("/api/calendar/events/:id/html", teacherAuthMiddleware, function (req, res) {
  var id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "无效 ID" });
  var row = stmts.getCalendarEvent.get(id);
  if (!row || row.created_by !== req.user.sub) return res.status(404).json({ error: "任务不存在" });
  var html = readAssignmentHtml(id);
  if (!html) return res.status(404).json({ error: "未找到上传的练习文件" });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.send(html);
});

app.get("/api/student/assignments/:eventId/html", authMiddleware, function (req, res) {
  if (req.user.role === "teacher") {
    return res.status(403).json({ error: "请使用教师预览接口" });
  }
  var eventId = Number(req.params.eventId);
  if (!eventId) return res.status(400).json({ error: "无效 ID" });
  var row = stmts.getCalendarEvent.get(eventId);
  if (!row) return res.status(404).json({ error: "任务不存在" });
  var task = stmts.getTaskStatus.get(eventId, req.user.sub);
  if (!task) return res.status(403).json({ error: "你不在此任务名单中" });
  var html = readAssignmentHtml(eventId);
  if (!html) return res.status(404).json({ error: "未找到练习文件" });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.send(html);
});

app.get("/api/student/assignments/:eventId/meta", authMiddleware, function (req, res) {
  if (req.user.role === "teacher") {
    return res.status(403).json({ error: "教师请使用教师端" });
  }
  var eventId = Number(req.params.eventId);
  if (!eventId) return res.status(400).json({ error: "无效 ID" });
  var row = stmts.getCalendarEvent.get(eventId);
  if (!row) return res.status(404).json({ error: "任务不存在" });
  var task = stmts.getTaskStatus.get(eventId, req.user.sub);
  if (!task) return res.status(403).json({ error: "你不在此任务名单中" });
  res.json({
    ok: true,
    event: eventFromRow(row, {
      status: effectiveTaskStatus(task.status, row.due_time),
      completedAt: task.completed_at || null
    })
  });
});

// ---- Admin: assign students to teachers (org-scoped) ----

app.get("/api/admin/teachers", adminAuthMiddleware, function (req, res) {
  var teachers = orgStmts.listTeachersByOrg.all(req.user.orgId).map(function (t) {
    var n = stmts.listTeacherStudentIds.all(t.id).length;
    return {
      id: t.id,
      phone: maskPhone(t.phone),
      name: t.name || "",
      studentCount: n,
      lastLoginAt: t.last_login_at || null
    };
  });
  res.json({ ok: true, teachers: teachers });
});

app.get("/api/admin/students", adminAuthMiddleware, function (req, res) {
  var students = orgStmts.listStudentsByOrg.all(req.user.orgId).map(function (row) {
    return {
      id: row.id,
      phone: maskPhone(row.phone),
      displayName: row.display_name || "",
      lastLoginAt: row.last_login_at || null,
      scoreCount: row.score_count || 0
    };
  });
  res.json({ ok: true, students: students });
});

app.get("/api/admin/assignments", adminAuthMiddleware, function (req, res) {
  var teacherId = Number(req.query.teacherId);
  if (!teacherId) return res.status(400).json({ error: "请指定 teacherId" });
  var teacher = stmts.findTeacherById.get(teacherId);
  if (!teacher || teacher.org_id !== req.user.orgId) {
    return res.status(404).json({ error: "教师不存在" });
  }
  var studentIds = stmts.listTeacherStudentIds.all(teacherId).map(function (r) { return r.student_id; });
  res.json({
    ok: true,
    teacherId: teacherId,
    studentIds: studentIds
  });
});

app.put("/api/admin/assignments", adminAuthMiddleware, function (req, res) {
  var teacherId = Number(req.body && req.body.teacherId);
  var studentIds = parseStudentIds(req.body && req.body.studentIds);
  if (!teacherId) return res.status(400).json({ error: "请指定 teacherId" });
  var teacher = stmts.findTeacherById.get(teacherId);
  if (!teacher || teacher.org_id !== req.user.orgId) {
    return res.status(404).json({ error: "教师不存在" });
  }
  for (var i = 0; i < studentIds.length; i++) {
    var stu = stmts.findUserById.get(studentIds[i]);
    if (!stu || stu.org_id !== req.user.orgId) {
      return res.status(400).json({ error: "学生 ID 无效：" + studentIds[i] });
    }
  }
  var now = new Date().toISOString();
  var by = String(req.user.phone || "");
  var tx = db.transaction(function () {
    stmts.deleteTeacherStudentsForTeacher.run(teacherId);
    studentIds.forEach(function (sid) {
      stmts.insertTeacherStudent.run(teacherId, sid, now, by);
    });
  });
  tx();
  res.json({ ok: true, teacherId: teacherId, studentIds: studentIds });
});

app.get("/api/student/calendar", authMiddleware, function (req, res) {
  if (req.user.role === "teacher") return res.json({ ok: true, events: [] });
  var scored = {};
  stmts.listScores.all(req.user.sub).forEach(function (r) { scored[r.item_id] = 1; });
  var rows = stmts.listStudentCalendar.all(req.user.sub);
  var events = rows.map(function (row) {
    var exerciseIds = [];
    try { exerciseIds = JSON.parse(row.linked_exercise_ids || "[]"); } catch (e) {}
    var doneIds = exerciseIds.filter(function (xid) { return scored[xid]; });
    return eventFromRow(row, {
      status: effectiveTaskStatus(row.task_status, row.due_time),
      completedAt: row.completed_at || null,
      doneExerciseIds: doneIds,
      exerciseDone: doneIds.length,
      exerciseTotal: exerciseIds.length
    });
  });
  res.json({ ok: true, events: events });
});

app.patch("/api/student/calendar/:eventId/status", authMiddleware, function (req, res) {
  if (req.user.role === "teacher") return res.status(403).json({ error: "教师请使用教师端" });
  var eventId = Number(req.params.eventId);
  if (!eventId) return res.status(400).json({ error: "无效 ID" });
  var status = clipText((req.body && req.body.status) || "", 20).toUpperCase();
  if (status !== "COMPLETED" && status !== "PENDING") {
    return res.status(400).json({ error: "status 仅支持 COMPLETED 或 PENDING" });
  }
  var row = stmts.getCalendarEvent.get(eventId);
  if (!row) return res.status(404).json({ error: "任务不存在" });
  var task = stmts.getTaskStatus.get(eventId, req.user.sub);
  if (!task) return res.status(404).json({ error: "你不在此任务名单中" });

  var exerciseIds = [];
  try { exerciseIds = JSON.parse(row.linked_exercise_ids || "[]"); } catch (e) {}
  if (row.event_type === "ASSIGNMENT" && exerciseIds.length && status === "COMPLETED") {
    return res.status(400).json({ error: "请完成关联练习后自动标记完成" });
  }

  var completedAt = status === "COMPLETED" ? new Date().toISOString() : null;
  stmts.setTaskStatus.run(status, completedAt, eventId, req.user.sub);
  res.json({
    ok: true,
    eventId: eventId,
    status: effectiveTaskStatus(status, row.due_time),
    completedAt: completedAt
  });
});

function maskPhone(phone) {
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

function sanitizeWrong(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 80).map(function (w) {
    if (!w || typeof w !== "object") return null;
    var out = {
      no: clipText(w.no != null ? String(w.no) : "", 20),
      ua: clipText(w.ua, 200),
      ans: clipText(w.ans, 200)
    };
    var explain = clipText(w.explain, 800);
    var stem = clipText(w.stem, 400);
    if (explain) out.explain = explain;
    if (stem) out.stem = stem;
    return out;
  }).filter(Boolean);
}

function isJunkCdtOverwrite(incoming, existing) {
  // ponytail: mirrors scripts/check_cdt_score_guard.js — tiny abort must not wipe a real CDT run
  if (!incoming || !existing || !existing.cdt) return false;
  var inDur = Number(incoming.durationSec);
  var exDur = Number(existing.durationSec);
  if (!isFinite(inDur)) inDur = 0;
  if (!isFinite(exDur)) exDur = 0;
  var inScore = incoming.score != null && isFinite(Number(incoming.score)) ? Number(incoming.score) : 0;
  var exScore = existing.score != null && isFinite(Number(existing.score)) ? Number(existing.score) : 0;
  var exHasEssay = !!(existing.writingTask1 || existing.writingTask2);
  var inHasEssay = !!(incoming.writingTask1 || incoming.writingTask2);
  if (exHasEssay && !inHasEssay && inDur < 60) return true;
  return inDur < 60 && inScore === 0 && exScore > 0 && exDur >= 600;
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
  var startedAt = clipText(body.startedAt, 40) || null;
  if (startedAt && !isFinite(Date.parse(startedAt))) startedAt = null;
  var durationSec = numOrNull(body.durationSec);
  if (durationSec != null) durationSec = Math.max(0, Math.round(durationSec));
  var assignmentEventId = clipText(body.assignmentEventId != null ? String(body.assignmentEventId) : "", 40) || null;
  if (assignmentEventId && !/^\d+$/.test(assignmentEventId)) assignmentEventId = null;
  var out = {
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
  var task1 = clipText(body.writingTask1, 8000);
  var task2 = clipText(body.writingTask2, 8000);
  if (task1) out.writingTask1 = task1;
  if (task2) out.writingTask2 = task2;
  var prompt1 = clipText(body.writingPrompt1, 4000);
  var prompt2 = clipText(body.writingPrompt2, 4000);
  var chartNote = clipText(body.writingChartNote, 2000);
  if (prompt1) out.writingPrompt1 = prompt1;
  if (prompt2) out.writingPrompt2 = prompt2;
  if (chartNote) out.writingChartNote = chartNote;
  if (startedAt) out.startedAt = startedAt;
  if (durationSec != null) out.durationSec = durationSec;
  if (assignmentEventId) out.assignmentEventId = assignmentEventId;
  if (body.cdt) out.cdt = true;
  if (body.completed) out.completed = true;
  var wrongCapture = clipText(body.wrongCapture, 40);
  if (wrongCapture === "ok" || wrongCapture === "empty_perfect" || wrongCapture === "empty_missed") {
    out.wrongCapture = wrongCapture;
  }
  return out;
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
  var body = req.body || {};
  // ponytail: require attemptAt — old login-sync PUTs re-uploaded shared-PC leftovers
  var attemptAt = clipText(body.attemptAt, 40);
  if (!attemptAt || !isFinite(Date.parse(attemptAt))) {
    return res.json({ ok: true, skipped: true, reason: "attempt-required" });
  }
  var rec = sanitizeScore(Object.assign({}, body, { id: itemId, date: body.date || attemptAt }));
  if (!rec) return res.status(400).json({ error: "成绩数据无效" });
  var existing = null;
  try {
    var prev = stmts.getScore.get(req.user.sub, itemId);
    if (prev && prev.payload) existing = JSON.parse(prev.payload);
  } catch (e) { existing = null; }
  if (isJunkCdtOverwrite(rec, existing)) {
    return res.json({ ok: true, skipped: true, reason: "junk-cdt-overwrite", score: existing });
  }
  stmts.upsertScore.run(req.user.sub, itemId, JSON.stringify(rec), rec.date);
  var attempt = Object.assign({}, rec, { wrong: sanitizeWrong(body.wrong) });
  var prevAttempt = stmts.getAttemptByStamp.get(req.user.sub, itemId, attemptAt);
  if (prevAttempt) {
    var oldAtt = {};
    try { oldAtt = JSON.parse(prevAttempt.payload) || {}; } catch (e) { oldAtt = {}; }
    var oldWrong = Array.isArray(oldAtt.wrong) ? oldAtt.wrong : [];
    if ((!attempt.wrong || !attempt.wrong.length) && oldWrong.length) {
      attempt.wrong = sanitizeWrong(oldWrong);
      if (!attempt.wrongCapture || attempt.wrongCapture === "empty_missed") attempt.wrongCapture = "ok";
    }
    stmts.updateAttemptPayload.run(JSON.stringify(attempt), prevAttempt.id);
  } else {
    stmts.insertAttempt.run(req.user.sub, itemId, JSON.stringify(attempt), attemptAt);
  }
  try { autoCompleteAssignments(req.user.sub, itemId); } catch (e) {
    console.error("[yysd-api] calendar auto-complete", e && e.message);
  }
  res.json({ ok: true, score: rec });
});

app.get("/api/student/score-attempts", authMiddleware, function (req, res) {
  if (req.user.role === "teacher") return res.status(403).json({ error: "请使用学生账号登录" });
  var subject = clipText(req.query.subject, 60);
  var itemId = clipText(req.query.itemId, 120);
  var assignmentOnly = req.query.assignmentOnly === "1" || req.query.assignmentOnly === "true";
  var eventId = clipText(req.query.eventId, 40);
  var limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 100));
  var rows = stmts.listStudentAttempts.all(req.user.sub);
  var attempts = [];
  for (var i = 0; i < rows.length && attempts.length < limit; i++) {
    var a = parseScorePayload(rows[i]);
    if (subject && a.subject !== subject) continue;
    if (itemId && a.id !== itemId) continue;
    if (assignmentOnly && !a.assignmentEventId) continue;
    if (eventId && String(a.assignmentEventId || "") !== eventId) continue;
    attempts.push(a);
  }
  res.json({ ok: true, attempts: attempts });
});

app.get("/api/student/score-attempts/:attemptId", authMiddleware, function (req, res) {
  if (req.user.role === "teacher") return res.status(403).json({ error: "请使用学生账号登录" });
  var attemptId = parseInt(req.params.attemptId, 10);
  if (!isFinite(attemptId) || attemptId <= 0) return res.status(400).json({ error: "无效的记录 ID" });
  var row = db.prepare(
    "SELECT id, item_id, payload, created_at FROM user_score_attempts WHERE id = ? AND user_id = ?"
  ).get(attemptId, req.user.sub);
  if (!row) return res.status(404).json({ error: "找不到该错题记录" });
  res.json({ ok: true, attempt: parseScorePayload(row) });
});

var WRONG_ANALYZE_SYSTEM =
  "你是雅思老师。根据学生错题（题号、作答、正解、卷面讲解）用简洁中文分析。" +
  "只输出 JSON 对象，字段：whyWrong（错因）、evidence（考点或原文依据）、strategy（下次怎么做）、keyVocab（可选，相关词组，可空字符串）。" +
  "若有学生追问，在上述结构里用 whyWrong 直接回答追问，其余字段可简短补充。不要输出 Markdown。";

app.post("/api/exam/wrong-analyze", authMiddleware, async function (req, res) {
  if (req.user.role === "teacher") {
    return res.status(403).json({ error: "请使用学生账号登录" });
  }
  var u = getUsage(req.user.sub);
  if (!isAdminPhone(req.user.phone) && u.textCount >= AI_QUOTA.text) {
    return res.status(429).json({
      error: "今日文字消息已达上限（" + AI_QUOTA.text + " 条），明日再来",
      quota: aiTutorQuota(req)
    });
  }
  var body = req.body || {};
  var no = clipText(body.no, 20);
  var ua = clipText(body.ua, 200);
  var ans = clipText(body.ans, 200);
  var explain = clipText(body.explain, 800);
  var stem = clipText(body.stem, 400);
  var subject = clipText(body.subject, 60);
  var itemId = clipText(body.itemId, 120);
  var title = clipText(body.title, 200);
  var followUp = clipText(body.followUp, 500);
  if (!ans && !explain && !followUp) {
    return res.status(400).json({ error: "缺少题目信息" });
  }
  var hist = Array.isArray(body.history) ? body.history.slice(-6) : [];
  var histLines = hist.map(function (h) {
    if (!h || typeof h !== "object") return "";
    var role = h.role === "assistant" ? "老师" : "学生";
    return role + "：" + clipText(h.content, 600);
  }).filter(Boolean).join("\n");
  var userPrompt =
    "科目：" + (subject || "—") +
    "\n试卷：" + (title || itemId || "—") +
    "\n题号：" + (no || "—") +
    "\n题干：" + (stem || "—") +
    "\n学生作答：" + (ua || "未作答") +
    "\n正确答案：" + (ans || "—") +
    "\n卷面讲解：" + (explain || "无") +
    (histLines ? "\n\n对话历史：\n" + histLines : "") +
    (followUp ? "\n\n学生追问：" + followUp : "\n\n请分析这道错题。");
  try {
    var d = parseJsonFromLLM(await qwenChat(WRONG_ANALYZE_SYSTEM, userPrompt));
    if (!isAdminPhone(req.user.phone)) bumpUsage(req.user.sub, { text: 1 });
    res.json({
      ok: true,
      analysis: {
        whyWrong: clipText(d.whyWrong, 800) || "",
        evidence: clipText(d.evidence, 800) || "",
        strategy: clipText(d.strategy, 800) || "",
        keyVocab: clipText(d.keyVocab, 400) || ""
      },
      quota: aiTutorQuota(req)
    });
  } catch (e) {
    console.error("[yysd-api] exam/wrong-analyze", e && e.message);
    res.status(e.message && e.message.indexOf("未配置") >= 0 ? 503 : 502)
      .json({ error: "AI 分析失败，请稍后再试" });
  }
});

async function qwenChatMessages(messages, temperature, maxTokens) {
  if (!DASHSCOPE_KEY) throw new Error("DASHSCOPE_API_KEY 未配置");
  var body = {
    model: DASHSCOPE_MODEL,
    messages: messages,
    temperature: temperature == null ? 0.2 : temperature
  };
  if (maxTokens) body.max_tokens = maxTokens;
  var res = await fetch(DASHSCOPE_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + DASHSCOPE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  var data = await res.json();
  if (!res.ok) throw new Error((data && data.error && data.error.message) || "DashScope 请求失败");
  var content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : null;
  if (content == null || content === "") throw new Error("AI 返回为空");
  return content;
}

async function qwenChat(system, user) {
  return qwenChatMessages(
    [{ role: "system", content: system }, { role: "user", content: user }],
    0.2
  );
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
  if (now - row.last < 3000) return { ok: false, msg: "请稍后再试" };
  if (row.count >= 40) return { ok: false, msg: "今日 AI 调用次数已达上限" };
  row.last = now; row.count += 1; aiLog[ip] = row;
  return { ok: true };
}

// ponytail: in-memory login throttle; single ECS process only
var loginLog = {};
function canLogin(key) {
  var now = Date.now();
  var row = loginLog[key] || { last: 0, fails: 0, window: 0 };
  if (row.lock && now < row.lock) {
    return { ok: false, msg: "尝试过多，请稍后再试" };
  }
  if (row.lock && now >= row.lock) { row.fails = 0; row.lock = 0; }
  if (now - row.last < 1000) return { ok: false, msg: "请稍后再试" };
  row.last = now;
  loginLog[key] = row;
  return { ok: true };
}
function noteLoginFail(key) {
  var row = loginLog[key] || { last: 0, fails: 0, lock: 0 };
  row.fails += 1;
  if (row.fails >= 8) {
    row.lock = Date.now() + 15 * 60 * 1000;
    row.fails = 0;
  }
  loginLog[key] = row;
}
function clearLoginFail(key) {
  delete loginLog[key];
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

function studentOnly(req, res) {
  if (req.user.role === "teacher") {
    res.status(403).json({ error: "请使用学生账号登录" });
    return false;
  }
  return true;
}

// AI 雅思老师：登录即可（学生 / 教师都可测）；管理员手机号额度不限
function aiTutorAllowed(req, res) {
  return true;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getUsage(userId) {
  var day = todayKey();
  var row = db.prepare("SELECT text_count, voice_sec, full_mocks FROM ai_tutor_usage WHERE user_id = ? AND day = ?").get(userId, day);
  return {
    day: day,
    textCount: row ? row.text_count : 0,
    voiceSec: row ? row.voice_sec : 0,
    fullMocks: row ? row.full_mocks : 0
  };
}

function bumpUsage(userId, fields) {
  var day = todayKey();
  db.prepare(
    "INSERT INTO ai_tutor_usage (user_id, day, text_count, voice_sec, full_mocks) VALUES (?, ?, ?, ?, ?) " +
    "ON CONFLICT(user_id, day) DO UPDATE SET " +
    "text_count = text_count + excluded.text_count, " +
    "voice_sec = voice_sec + excluded.voice_sec, " +
    "full_mocks = full_mocks + excluded.full_mocks"
  ).run(userId, day, fields.text || 0, fields.voiceSec || 0, fields.fullMocks || 0);
}

function quotaPayload(u, unlimited) {
  if (unlimited) {
    return {
      unlimited: true,
      textLimit: null,
      textUsed: u.textCount,
      textLeft: 999999,
      voiceSecLimit: null,
      voiceSecUsed: Math.round(u.voiceSec),
      voiceSecLeft: 999999,
      fullMockLimit: null,
      fullMockUsed: u.fullMocks,
      fullMockLeft: 999999
    };
  }
  return {
    textLimit: AI_QUOTA.text,
    textUsed: u.textCount,
    textLeft: Math.max(0, AI_QUOTA.text - u.textCount),
    voiceSecLimit: AI_QUOTA.voiceSec,
    voiceSecUsed: Math.round(u.voiceSec),
    voiceSecLeft: Math.max(0, Math.round(AI_QUOTA.voiceSec - u.voiceSec)),
    fullMockLimit: AI_QUOTA.fullMocks,
    fullMockUsed: u.fullMocks,
    fullMockLeft: Math.max(0, AI_QUOTA.fullMocks - u.fullMocks)
  };
}

function aiTutorQuota(req) {
  return quotaPayload(getUsage(req.user.sub), isAdminPhone(req.user.phone));
}

function newSessionId() {
  return "ait-" + Date.now().toString(36) + "-" + crypto.randomBytes(4).toString("hex");
}

function examTypeLabel(t) {
  return ({ full: "完整模拟考", part1: "Part 1", part2: "Part 2", part3: "Part 3", practice: "机经练习", mock: "机经模考" })[t] || t || "";
}

function parseScoreFromReply(text) {
  var m = String(text || "").match(/SCORE_JSON:\s*(\{[\s\S]*?\})/);
  if (!m) return null;
  try {
    var d = JSON.parse(m[1]);
    function band(v) {
      var n = Number(v);
      if (!isFinite(n)) return null;
      return Math.round(Math.min(9, Math.max(0, n)) * 2) / 2;
    }
    return {
      overall: band(d.overall),
      fluency: band(d.fluency),
      lexical: band(d.lexical),
      grammar: band(d.grammar),
      pronunciation: band(d.pronunciation),
      comment: clipText(d.comment, 800),
      improvements: Array.isArray(d.improvements)
        ? d.improvements.map(function (t) { return clipText(t, 200); }).filter(Boolean).slice(0, 8)
        : []
    };
  } catch (e) {
    return null;
  }
}

function stripScoreMarker(text) {
  return String(text || "").replace(/\n?SCORE_JSON:\s*\{[\s\S]*?\}\s*$/, "").trim();
}

var tutorListSessions = db.prepare(
  "SELECT id, mode, exam_type, exam_mode, status, title, created_at, updated_at FROM ai_tutor_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50"
);
var tutorGetSession = db.prepare("SELECT * FROM ai_tutor_sessions WHERE id = ? AND user_id = ?");
var tutorInsertSession = db.prepare(
  "INSERT INTO ai_tutor_sessions (id, user_id, mode, exam_type, exam_mode, exam_pack, title, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
var tutorTouchSession = db.prepare("UPDATE ai_tutor_sessions SET updated_at = ?, title = COALESCE(?, title) WHERE id = ?");
var tutorSetStatus = db.prepare("UPDATE ai_tutor_sessions SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?");
var tutorListMessages = db.prepare(
  "SELECT id, role, content, audio_sec, meta, created_at FROM ai_tutor_messages WHERE session_id = ? ORDER BY id ASC"
);
var tutorInsertMessage = db.prepare(
  "INSERT INTO ai_tutor_messages (session_id, role, content, audio_sec, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)"
);

function staffAuthMiddleware(req, res, next) {
  var h = req.headers.authorization || "";
  var token = h.indexOf("Bearer ") === 0 ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "未登录" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (req.user.role === "teacher" || isAdminPhone(req.user.phone)) return next();
    return res.status(403).json({ error: "需要教师或管理员权限" });
  } catch (e) {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }
}

app.get("/api/ai-tutor/quota", authMiddleware, function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  res.json({ ok: true, quota: aiTutorQuota(req) });
});

app.get("/api/ai-tutor/bank", authMiddleware, function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  try {
    res.json({ ok: true, bank: bankSummary(loadActiveBank()) });
  } catch (e) {
    res.status(503).json({ error: e.message || "机经题库不可用" });
  }
});

app.get("/api/ai-tutor/writing-bank", authMiddleware, function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  try {
    var bank = loadWritingBank();
    res.json({
      ok: true,
      bank: {
        task1: (bank.task1 || []).map(function (p) { return { id: p.id, title: p.title, prompt: p.prompt }; }),
        task2: (bank.task2 || []).map(function (p) { return { id: p.id, title: p.title, prompt: p.prompt }; })
      }
    });
  } catch (e) {
    res.status(503).json({ error: e.message || "写作题库不可用" });
  }
});

app.post("/api/ai-tutor/writing-grade", authMiddleware, async function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  var taskType = clipText(req.body && req.body.taskType, 10);
  var promptId = clipText(req.body && req.body.promptId, 80);
  var promptText = clipText(req.body && req.body.prompt, 4000);
  var chartNote = clipText(req.body && req.body.chartNote, 1000);
  var essay = clipText(req.body && req.body.essay, 8000);
  if (taskType !== "task1" && taskType !== "task2") {
    return res.status(400).json({ error: "请选择 Task 1 或 Task 2" });
  }
  if (!essay) return res.status(400).json({ error: "缺少作文" });
  if (essay.length < 80) return res.status(400).json({ error: "作文过短，请粘贴完整作答" });
  var promptMeta = null;
  var promptBody = "";
  if (promptId) {
    promptMeta = findWritingPrompt(taskType, promptId);
    if (!promptMeta) return res.status(400).json({ error: "题干不存在" });
    promptBody = promptMeta.prompt;
  } else if (promptText) {
    promptBody = promptText;
    promptMeta = { id: "custom", title: "模考题干", prompt: promptText };
  } else {
    return res.status(400).json({ error: "缺少题干或作文" });
  }
  var u = getUsage(req.user.sub);
  if (!isAdminPhone(req.user.phone) && u.textCount >= AI_QUOTA.text) {
    return res.status(429).json({ error: "今日文字消息已达上限（" + AI_QUOTA.text + " 条），明日再来", quota: aiTutorQuota(req) });
  }
  var chartBlock = "";
  if (chartNote) {
    chartBlock =
      "Chart / figure captions (image not visible — grade TA data accuracy conservatively from captions only):\n" +
      chartNote + "\n";
  }
  var system = buildWritingGradeSystem(taskType, promptBody, chartBlock);
  var userMsg =
    "Student essay to grade (do not invent missing sentences):\n\n" + essay +
    "\n\nRespond with WRITING_JSON: only.";
  try {
    var raw = await qwenChatMessages([
      { role: "system", content: system },
      { role: "user", content: userMsg }
    ], 0.25, 4500);
    if (!isAdminPhone(req.user.phone)) bumpUsage(req.user.sub, { text: 1 });
    var grade = parseWritingGrade(raw);
    if (!grade) {
      console.error("[yysd-api] writing-grade parse fail", String(raw || "").slice(0, 400));
      return res.status(502).json({ error: "批改结果解析失败，请重试" });
    }
    res.json({
      ok: true,
      feedback: "",
      grade: grade,
      prompt: { id: promptMeta.id, title: promptMeta.title, taskType: taskType },
      quota: aiTutorQuota(req)
    });
  } catch (e) {
    console.error("[yysd-api] writing-grade", e.message);
    res.status(502).json({ error: "写作批改失败，请稍后再试" });
  }
});

app.post("/api/ai-tutor/sessions/:id/abandon", authMiddleware, function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  var id = clipText(req.params.id, 64);
  var s = tutorGetSession.get(id, req.user.sub);
  if (!s) return res.status(404).json({ error: "会话不存在" });
  if (s.status === "complete") return res.json({ ok: true, status: "complete" });
  var now = new Date().toISOString();
  tutorSetStatus.run("incomplete", now, id, req.user.sub);
  tutorInsertMessage.run(id, "assistant", "This mock test was abandoned and marked incomplete. Please start a new mock if you wish to continue.", 0, JSON.stringify({ abandoned: true }), now);
  res.json({ ok: true, status: "incomplete" });
});

app.get("/api/ai-tutor/sessions", authMiddleware, function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  res.json({ ok: true, sessions: tutorListSessions.all(req.user.sub) });
});

app.post("/api/ai-tutor/sessions", authMiddleware, function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  var mode = clipText(req.body && req.body.mode, 20) || "teacher";
  if (mode !== "examiner" && mode !== "teacher") mode = "teacher";
  var examMode = clipText(req.body && req.body.examMode, 20) || "";
  var examType = clipText(req.body && req.body.examType, 20) || "";
  var examPack = null;
  var packStr = null;

  if (mode === "examiner" && (examMode === "practice" || examMode === "mock")) {
    try {
      examPack = buildExamPack(examMode, req.body && req.body.part1Ids, req.body && req.body.part2Id);
      packStr = JSON.stringify(examPack);
      examType = examMode;
    } catch (e) {
      return res.status(400).json({ error: e.message || "无法生成考题包" });
    }
    if (examMode === "mock" && !isAdminPhone(req.user.phone)) {
      var uMock = getUsage(req.user.sub);
      if (uMock.fullMocks >= AI_QUOTA.fullMocks) {
        return res.status(429).json({ error: "今日完整模拟考次数已用完（" + AI_QUOTA.fullMocks + " 场），明日再来", quota: aiTutorQuota(req) });
      }
    }
  } else if (mode === "examiner") {
    if (["full", "part1", "part2", "part3"].indexOf(examType) < 0) examType = "full";
    if (examType === "full" && !isAdminPhone(req.user.phone)) {
      var u = getUsage(req.user.sub);
      if (u.fullMocks >= AI_QUOTA.fullMocks) {
        return res.status(429).json({ error: "今日完整模拟考次数已用完（" + AI_QUOTA.fullMocks + " 场），明日再来", quota: aiTutorQuota(req) });
      }
    }
  } else {
    examType = "";
    examMode = "";
  }

  var now = new Date().toISOString();
  var id = newSessionId();
  var title = mode === "examiner"
    ? "考官 · " + examTypeLabel(examMode || examType)
    : "老师辅导";
  tutorInsertSession.run(id, req.user.sub, mode, examType || null, examMode || null, packStr, title, now, now, "active");
  if (mode === "examiner" && (examMode === "mock" || examType === "full") && !isAdminPhone(req.user.phone)) {
    bumpUsage(req.user.sub, { fullMocks: 1 });
  }

  var opener;
  if (mode === "examiner" && examPack) {
    opener = examMode === "practice"
      ? "Good afternoon. This is a practice speaking session based on your selected topics. Could you tell me your full name, please?"
      : "Good afternoon. My name is Alex. This is a full IELTS Speaking mock test. Could you tell me your full name, please?";
  } else if (mode === "examiner") {
    opener = examType === "part2"
      ? "Good afternoon. This is Part 2. I will give you a topic card. You will have one minute to prepare, then I'd like you to speak for one to two minutes."
      : examType === "part3"
        ? "Good afternoon. Let's move on to Part 3. I'd like to discuss some more general questions related to your topic."
        : examType === "part1"
          ? "Good afternoon. My name is Alex. Could you tell me your full name, please?"
          : "Good afternoon. My name is Alex. This is the IELTS Speaking test. Could you tell me your full name, please?";
  } else {
    opener = "你好，我是优益思达的 AI 雅思老师。可以帮你练口语思路，或批改写作（直接粘贴作文即可）。想先从哪方面开始？";
  }
  tutorInsertMessage.run(id, "assistant", opener, 0, null, now);
  res.json({
    ok: true,
    session: {
      id: id, mode: mode, exam_type: examType || null, exam_mode: examMode || null,
      title: title, created_at: now, updated_at: now, examPack: examPack
    },
    opener: opener,
    examPack: examPack,
    quota: aiTutorQuota(req)
  });
});

app.get("/api/ai-tutor/sessions/:id", authMiddleware, function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  var s = tutorGetSession.get(clipText(req.params.id, 64), req.user.sub);
  if (!s) return res.status(404).json({ error: "会话不存在" });
  var pack = null;
  try { pack = s.exam_pack ? JSON.parse(s.exam_pack) : null; } catch (e) {}
  var msgs = tutorListMessages.all(s.id).map(function (m) {
    var meta = null;
    try { meta = m.meta ? JSON.parse(m.meta) : null; } catch (e) {}
    return { id: m.id, role: m.role, content: m.content, audioSec: m.audio_sec, meta: meta, createdAt: m.created_at };
  });
  res.json({ ok: true, session: s, examPack: pack, messages: msgs });
});

app.post("/api/ai-tutor/chat", authMiddleware, async function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  var sessionId = clipText(req.body && req.body.sessionId, 64);
  var content = clipText(req.body && req.body.content, 8000);
  var audioSec = Math.max(0, Math.min(600, Number(req.body && req.body.audioSec) || 0));
  var answerInvalid = !!(req.body && req.body.answerInvalid);
  if (!sessionId || (!content && !answerInvalid)) return res.status(400).json({ error: "缺少 sessionId 或 content" });
  var s = tutorGetSession.get(sessionId, req.user.sub);
  if (!s) return res.status(404).json({ error: "会话不存在" });
  if (s.status === "incomplete") {
    return res.status(400).json({ error: "该模考已标记未完成，请重新开一场" });
  }
  if (s.status === "complete") {
    return res.status(400).json({ error: "该场次已结束" });
  }
  if (answerInvalid) {
    content = "[ANSWER_INVALID] Candidate remained silent for 5 seconds. Treat this answer as invalid and move to the next question.";
  }
  var u = getUsage(req.user.sub);
  if (!isAdminPhone(req.user.phone) && u.textCount >= AI_QUOTA.text) {
    return res.status(429).json({ error: "今日文字消息已达上限（" + AI_QUOTA.text + " 条），明日再来", quota: aiTutorQuota(req) });
  }
  if (!isAdminPhone(req.user.phone) && audioSec > 0 && u.voiceSec + audioSec > AI_QUOTA.voiceSec) {
    return res.status(429).json({ error: "今日语音时长已达上限（15 分钟），明日再来", quota: aiTutorQuota(req) });
  }
  var now = new Date().toISOString();
  var userMeta = answerInvalid ? JSON.stringify({ answerInvalid: true }) : null;
  tutorInsertMessage.run(sessionId, "user", content, audioSec, userMeta, now);
  if (!isAdminPhone(req.user.phone)) {
    bumpUsage(req.user.sub, { text: 1, voiceSec: audioSec });
  }
  if (s.title === "老师辅导" || String(s.title || "").indexOf("考官 ·") === 0) {
    var short = content.slice(0, 24).replace(/\s+/g, " ");
    if (short && !answerInvalid) tutorTouchSession.run(now, short + (content.length > 24 ? "…" : ""), sessionId);
    else tutorTouchSession.run(now, null, sessionId);
  } else {
    tutorTouchSession.run(now, null, sessionId);
  }
  var history = tutorListMessages.all(sessionId).map(function (m) {
    return { role: m.role === "assistant" ? "assistant" : "user", content: m.content };
  });
  if (history.length > 24) history = history.slice(history.length - 24);
  var pack = null;
  try { pack = s.exam_pack ? JSON.parse(s.exam_pack) : null; } catch (e) {}
  var messages = [{ role: "system", content: buildTutorSystem(s.mode, s.exam_type, pack) }].concat(history);
  try {
    var raw = await qwenChatMessages(messages, s.mode === "examiner" ? 0.35 : 0.5);
    var score = s.mode === "examiner" ? parseScoreFromReply(raw) : null;
    var reply = score ? stripScoreMarker(raw) : String(raw || "").trim();
    if (!reply && score) reply = "That concludes the test. Please review your band scores below.";
    var meta = score ? JSON.stringify({ score: score }) : null;
    var at = new Date().toISOString();
    tutorInsertMessage.run(sessionId, "assistant", reply, 0, meta, at);
    if (score) tutorSetStatus.run("complete", at, sessionId, req.user.sub);
    else tutorTouchSession.run(at, null, sessionId);
    res.json({
      ok: true,
      reply: reply,
      score: score,
      status: score ? "complete" : "active",
      quota: aiTutorQuota(req)
    });
  } catch (e) {
    console.error("[yysd-api] ai-tutor/chat", e.message);
    res.status(e.message.indexOf("未配置") >= 0 ? 503 : 502).json({ error: "AI 回复失败，请稍后再试" });
  }
});

app.post("/api/admin/jiijing/upload", staffAuthMiddleware, async function (req, res) {
  var b64 = String((req.body && req.body.pdfBase64) || "").trim();
  var title = clipText(req.body && req.body.title, 120) || ("机经题库 " + new Date().toISOString().slice(0, 10));
  if (!b64) return res.status(400).json({ error: "缺少 pdfBase64" });
  var m = b64.match(/^data:application\/pdf;base64,(.+)$/i) || b64.match(/^data:.*base64,(.+)$/i);
  var raw = m ? m[1] : b64;
  var buf;
  try { buf = Buffer.from(raw, "base64"); } catch (e) {
    return res.status(400).json({ error: "PDF 数据无效" });
  }
  if (buf.length < 1000 || buf.length > 10 * 1024 * 1024) {
    return res.status(400).json({ error: "PDF 大小需在 1KB–10MB" });
  }
  var bankId = "bank-" + Date.now().toString(36);
  var pdfPath = path.join(JIIJING_UPLOAD_DIR, bankId + ".pdf");
  var scriptCandidates = [
    path.join(__dirname, "..", "scripts", "parse_jiijing_pdf.py"),
    path.join(__dirname, "scripts", "parse_jiijing_pdf.py")
  ];
  var script = scriptCandidates.find(function (p) { return fs.existsSync(p); });
  var outRoot = speakingDataDir();
  var outDir = path.join(outRoot, "jiijing-banks");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  if (!script) {
    return res.status(503).json({ error: "服务器缺少 parse_jiijing_pdf.py，无法解析 PDF" });
  }
  try {
    fs.writeFileSync(pdfPath, buf);
    var { spawn } = require("child_process");
    var py = await new Promise(function (resolve, reject) {
      var stdout = "";
      var stderr = "";
      var child = spawn("python3", [script, pdfPath, "--bank-id", bankId, "--title", title, "--out-dir", outDir], {
        stdio: ["ignore", "pipe", "pipe"]
      });
      var timer = setTimeout(function () {
        try { child.kill("SIGKILL"); } catch (e) {}
        reject(new Error("PDF 解析超时"));
      }, 120000);
      child.stdout.on("data", function (d) { stdout += d; });
      child.stderr.on("data", function (d) { stderr += d; });
      child.on("error", function (err) {
        clearTimeout(timer);
        reject(err);
      });
      child.on("close", function (code) {
        clearTimeout(timer);
        resolve({ status: code, stdout: stdout, stderr: stderr });
      });
    });
    if (py.status !== 0) {
      console.error("[yysd-api] jiijing parse", py.stderr || py.stdout);
      try { fs.unlinkSync(pdfPath); } catch (e) {}
      return res.status(502).json({ error: "PDF 解析失败：" + clipText(py.stderr || py.stdout || "unknown", 300) });
    }
    var bankPath = path.join(outDir, bankId + ".json");
    if (!fs.existsSync(bankPath)) {
      try { fs.unlinkSync(pdfPath); } catch (e) {}
      return res.status(502).json({ error: "解析完成但未生成题库文件" });
    }
    var bank = readJsonFile(bankPath);
    if (!(bank.part1 && bank.part1.length) || !(bank.part2 && bank.part2.length)) {
      try { fs.unlinkSync(pdfPath); } catch (e) {}
      return res.status(502).json({ error: "解析结果为空，请确认 PDF 为机经纯题目版格式" });
    }
    fs.writeFileSync(path.join(outRoot, "jiijing-active.json"), JSON.stringify({ bankId: bankId }, null, 2));
    // mirror to sibling data dir if present
    SPEAKING_DATA_DIRS.forEach(function (root) {
      try {
        if (root === outRoot) return;
        var bdir = path.join(root, "jiijing-banks");
        if (!fs.existsSync(bdir)) fs.mkdirSync(bdir, { recursive: true });
        fs.copyFileSync(bankPath, path.join(bdir, bankId + ".json"));
        fs.writeFileSync(path.join(root, "jiijing-active.json"), JSON.stringify({ bankId: bankId }, null, 2));
      } catch (e) {}
    });
    res.json({ ok: true, bank: bankSummary(bank) });
  } catch (e) {
    console.error("[yysd-api] jiijing upload", e.message);
    try { fs.unlinkSync(pdfPath); } catch (e2) {}
    res.status(502).json({ error: "PDF 解析异常：" + e.message });
  }
});

function getWordUsage(userId) {
  var day = todayKey();
  var row = db.prepare("SELECT query_count FROM ai_word_usage WHERE user_id = ? AND day = ?").get(userId, day);
  return { day: day, queryCount: row ? row.query_count : 0 };
}

function bumpWordUsage(userId) {
  var day = todayKey();
  db.prepare(
    "INSERT INTO ai_word_usage (user_id, day, query_count) VALUES (?, ?, 1) " +
    "ON CONFLICT(user_id, day) DO UPDATE SET query_count = query_count + 1"
  ).run(userId, day);
}

function wordQuotaPayload(u) {
  return {
    limit: AI_WORD_QUOTA,
    used: u.queryCount,
    left: Math.max(0, AI_WORD_QUOTA - u.queryCount)
  };
}

function buildWordLookupSystem() {
  return (
    "你是优益思达（YYSD）的英语词汇助教。用中文为主讲解，关键术语可保留英文。" +
    "学生可能输入：单个英文单词、短语、整句，或中文（反查英文）。" +
    "首次详尽解答时，按下列小节用纯文本输出（不要用 Markdown 代码块）：\n" +
    "1) 词条（英文）\n2) 音标\n3) 词性与中文释义\n4) 英文释义\n5) 例句（2–3 句，附中文翻译）\n" +
    "6) 近义词 / 反义词\n7) 常见搭配\n8) 易混词\n9) 记忆提示\n" +
    "追问时针对问题简洁回答，不必重复全部小节。" +
    "每次回复末尾单独一行：WORD_JSON:{\"word\":\"英文词条\",\"ipa\":\"音标\",\"meaning\":\"中文释义摘要\"}" +
    "中文反查时 word 填最贴切的英文；短语/句子时 word 填核心英文表达。"
  );
}

function parseWordFromReply(text) {
  var m = String(text || "").match(/WORD_JSON:\s*(\{[\s\S]*?\})/);
  if (!m) return null;
  try {
    var d = JSON.parse(m[1]);
    return {
      word: clipText(d.word, 80),
      ipa: clipText(d.ipa, 80),
      meaning: clipText(d.meaning, 200)
    };
  } catch (e) {
    return null;
  }
}

function stripWordMarker(text) {
  return String(text || "").replace(/\n?WORD_JSON:\s*\{[\s\S]*?\}\s*$/, "").trim();
}

app.get("/api/ai-word/quota", authMiddleware, function (req, res) {
  // ponytail: teachers browse 单词区 — allow quota read (usage keyed by jwt sub)
  res.json({ ok: true, quota: wordQuotaPayload(getWordUsage(req.user.sub)) });
});

app.post("/api/ai-word/ask", authMiddleware, async function (req, res) {
  // ponytail: teachers may look up words while previewing 单词区
  var content = clipText(req.body && req.body.content, 500);
  if (!content) return res.status(400).json({ error: "请输入要查询的内容" });
  var history = Array.isArray(req.body && req.body.history) ? req.body.history : [];
  var u = getWordUsage(req.user.sub);
  if (u.queryCount >= AI_WORD_QUOTA) {
    return res.status(429).json({
      error: "今日 AI 查词已达上限（" + AI_WORD_QUOTA + " 次）",
      quota: wordQuotaPayload(u)
    });
  }
  var msgs = [{ role: "system", content: buildWordLookupSystem() }];
  history.slice(-12).forEach(function (m) {
    var role = m && m.role === "assistant" ? "assistant" : "user";
    var c = clipText(m && m.content, 4000);
    if (c) msgs.push({ role: role, content: c });
  });
  msgs.push({ role: "user", content: content });
  bumpWordUsage(req.user.sub);
  try {
    var raw = await qwenChatMessages(msgs, 0.3);
    var meta = parseWordFromReply(raw);
    var reply = stripWordMarker(raw);
    if (!reply) reply = "暂时无法生成解释，请换个词再试。";
    res.json({
      ok: true,
      reply: reply,
      meta: meta,
      quota: wordQuotaPayload(getWordUsage(req.user.sub))
    });
  } catch (e) {
    console.error("[yysd-api] ai-word/ask", e.message);
    res.status(e.message.indexOf("未配置") >= 0 ? 503 : 502).json({ error: "AI 查词失败，请稍后再试" });
  }
});

app.post("/api/ai-tutor/asr", authMiddleware, async function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  if (!DASHSCOPE_KEY) return res.status(503).json({ error: "DASHSCOPE_API_KEY 未配置" });
  var audio = clipText(req.body && req.body.audio, 12 * 1024 * 1024);
  var audioSec = Math.max(0, Math.min(600, Number(req.body && req.body.audioSec) || 0));
  if (!audio || audio.indexOf("data:") !== 0) return res.status(400).json({ error: "缺少 audio（data URL）" });
  var u = getUsage(req.user.sub);
  if (!isAdminPhone(req.user.phone) && audioSec > 0 && u.voiceSec + audioSec > AI_QUOTA.voiceSec) {
    return res.status(429).json({ error: "今日语音时长已达上限（15 分钟），明日再来", quota: aiTutorQuota(req) });
  }
  try {
    var r = await fetch(DASHSCOPE_MM_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + DASHSCOPE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: DASHSCOPE_ASR_MODEL,
        input: {
          messages: [
            { role: "system", content: [{ text: "Transcribe the learner's IELTS speaking English accurately." }] },
            { role: "user", content: [{ audio: audio }] }
          ]
        },
        parameters: { asr_options: { language: "en", enable_itn: true } }
      })
    });
    var data = await r.json();
    if (!r.ok) {
      throw new Error((data && (data.message || (data.error && data.error.message))) || "ASR 失败");
    }
    var text = "";
    try {
      var choices = data.output && data.output.choices;
      if (choices && choices[0] && choices[0].message) {
        var c = choices[0].message.content;
        if (typeof c === "string") text = c;
        else if (Array.isArray(c)) {
          text = c.map(function (p) { return p.text || p; }).filter(Boolean).join(" ");
        }
      }
      if (!text && data.output && data.output.text) text = data.output.text;
    } catch (e) {}
    text = clipText(text, 4000);
    if (!text) return res.status(502).json({ error: "未能识别出语音内容，请重试或改用文字输入" });
    // ponytail: voice_sec counted on /chat when client sends audioSec
    res.json({ ok: true, text: text, quota: aiTutorQuota(req) });
  } catch (e) {
    console.error("[yysd-api] ai-tutor/asr", e.message);
    res.status(502).json({ error: "语音识别失败，请稍后再试或改用文字" });
  }
});

app.post("/api/ai-tutor/tts", authMiddleware, async function (req, res) {
  if (!aiTutorAllowed(req, res)) return;
  if (!DASHSCOPE_KEY) return res.status(503).json({ error: "DASHSCOPE_API_KEY 未配置" });
  var text = clipText(req.body && req.body.text, 600);
  if (!text) return res.status(400).json({ error: "缺少 text" });
  var lang = /[\u4e00-\u9fff]/.test(text) ? "Chinese" : "English";
  try {
    var r = await fetch(DASHSCOPE_MM_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + DASHSCOPE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: DASHSCOPE_TTS_MODEL,
        input: { text: text, voice: DASHSCOPE_TTS_VOICE, language_type: lang }
      })
    });
    var data = await r.json();
    if (!r.ok) {
      throw new Error((data && (data.message || (data.error && data.error.message))) || "TTS 失败");
    }
    var url = data.output && data.output.audio && data.output.audio.url;
    if (!url) return res.status(502).json({ error: "语音合成无音频返回" });
    res.json({ ok: true, url: url });
  } catch (e) {
    console.error("[yysd-api] ai-tutor/tts", e.message);
    res.status(502).json({ error: "语音合成失败" });
  }
});

// ---- Daily word (跟读 pass/fail + 配图) ----

function dailyWordNorm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z']/g, "").trim();
}

function dailyWordLev(a, b) {
  a = String(a); b = String(b);
  var m = a.length, n = b.length, i, j;
  if (!m) return n;
  if (!n) return m;
  var dp = [];
  for (i = 0; i <= m; i++) {
    dp[i] = [i];
    for (j = 1; j <= n; j++) dp[i][j] = i === 0 ? j : 0;
  }
  for (i = 1; i <= m; i++) {
    for (j = 1; j <= n; j++) {
      var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function dailyWordSpeakPass(heard, target) {
  var h = dailyWordNorm(heard);
  var t = dailyWordNorm(target);
  if (!h || !t) return false;
  if (h === t || h.indexOf(t) >= 0 || t.indexOf(h) >= 0) return true;
  return dailyWordLev(h, t) <= (t.length <= 4 ? 1 : 2);
}

// ponytail: map DashScope codes so students don't see opaque 502
function dashscopeAsrUserError(errOrData, fallback) {
  var code = "";
  var msg = "";
  if (errOrData && typeof errOrData === "object") {
    code = String(errOrData.code || (errOrData.error && errOrData.error.code) || "");
    msg = String(errOrData.message || (errOrData.error && errOrData.error.message) || errOrData.msg || "");
  } else {
    msg = String(errOrData || "");
  }
  var blob = (code + " " + msg).toLowerCase();
  if (code === "Arrearage" || /overdue|arrear|欠费|good standing/.test(blob)) {
    return "语音服务账户欠费，请管理员在阿里云百炼充值后重试";
  }
  if (code === "InvalidApiKey" || /invalid.*api.?key|unauthorized|鉴权/.test(blob)) {
    return "语音服务密钥无效，请联系管理员";
  }
  if (/throttl|rate.?limit|限流|quota/.test(blob)) {
    return "语音识别繁忙，请稍后再试";
  }
  if (/format|unsupported.*audio|audio.*invalid|解码/.test(blob)) {
    return "录音格式不被识别，请换 Chrome 重试或说得稍长一点";
  }
  return fallback || "跟读评测失败，请稍后再试";
}

async function dashscopeAsrDataUrl(audio) {
  var r = await fetch(DASHSCOPE_MM_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + DASHSCOPE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DASHSCOPE_ASR_MODEL,
      input: {
        messages: [
          { role: "system", content: [{ text: "Transcribe the single English word or short phrase accurately." }] },
          { role: "user", content: [{ audio: audio }] }
        ]
      },
      parameters: { asr_options: { language: "en", enable_itn: true } }
    })
  });
  var data = null;
  try { data = await r.json(); } catch (e) { data = null; }
  if (!r.ok) {
    var err = new Error(dashscopeAsrUserError(data, "ASR 失败"));
    err.code = data && data.code;
    throw err;
  }
  var text = "";
  try {
    var choices = data.output && data.output.choices;
    if (choices && choices[0] && choices[0].message) {
      var c = choices[0].message.content;
      if (typeof c === "string") text = c;
      else if (Array.isArray(c)) text = c.map(function (p) { return p.text || p; }).filter(Boolean).join(" ");
    }
    if (!text && data.output && data.output.text) text = data.output.text;
  } catch (e) {}
  return clipText(text, 200);
}

function sleepMs(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function dailyWordImagePublicUrl(fileName) {
  return PUBLIC_API_BASE + "/uploads/daily-word/" + fileName;
}

function lookupDailyWordImage(wordKey) {
  if (!wordKey) return null;
  if (dailyWordImageCache[wordKey]) return dailyWordImageCache[wordKey];
  var row = db.prepare("SELECT file_name FROM daily_word_images WHERE word_key = ?").get(wordKey);
  if (!row) return null;
  var abs = path.join(dailyWordImgDir, row.file_name);
  if (!fs.existsSync(abs) || fs.statSync(abs).size < 200) {
    try { db.prepare("DELETE FROM daily_word_images WHERE word_key = ?").run(wordKey); } catch (e) {}
    return null;
  }
  var url = dailyWordImagePublicUrl(row.file_name);
  dailyWordImageCache[wordKey] = url;
  return url;
}

async function persistDailyWordImage(remoteUrl, wordKey) {
  var r = await fetch(remoteUrl);
  if (!r.ok) throw new Error("配图下载失败");
  var buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 200) throw new Error("配图文件过小");
  var ct = String(r.headers.get("content-type") || "").toLowerCase();
  var ext = ".jpg";
  if (ct.indexOf("png") >= 0) ext = ".png";
  else if (ct.indexOf("webp") >= 0) ext = ".webp";
  var fileName = crypto.createHash("sha1").update(wordKey).digest("hex") + ext;
  fs.writeFileSync(path.join(dailyWordImgDir, fileName), buf);
  db.prepare(
    "INSERT OR REPLACE INTO daily_word_images (word_key, file_name, created_at) VALUES (?, ?, ?)"
  ).run(wordKey, fileName, new Date().toISOString());
  var url = dailyWordImagePublicUrl(fileName);
  dailyWordImageCache[wordKey] = url;
  return url;
}

function dailyWordImagePrompt(word, meaning) {
  // ReMe-like: soft cinematic educational art, not flat stickers
  return [
    "Premium language-learning vocabulary image for the English word \"" + word + "\"",
    meaning ? ("visualizing the meaning: " + String(meaning).slice(0, 80)) : "",
    "style: refined editorial illustration, cinematic soft light, subtle depth,",
    "muted blue and warm cream palette, clean uncluttered composition, high-end app aesthetic,",
    "photoreal-meets-illustration quality, emotionally clear subject,",
    "absolutely no text, no letters, no watermark, no logo, square 1:1"
  ].filter(Boolean).join(" ");
}

async function dashscopeImageForWord(word, meaning, model) {
  model = model || DASHSCOPE_IMG_MODEL;
  var prompt = dailyWordImagePrompt(word, meaning);
  var body = {
    model: model,
    input: {
      prompt: prompt,
      negative_prompt: "text, letters, words, watermark, logo, lowres, blurry, cluttered, ugly, deformed, sticker border"
    },
    parameters: {
      size: DASHSCOPE_IMG_SIZE,
      n: 1,
      prompt_extend: true
    }
  };
  var r = await fetch(DASHSCOPE_IMG_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + DASHSCOPE_KEY,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable"
    },
    body: JSON.stringify(body)
  });
  var data = await r.json();
  if (!r.ok) {
    throw new Error((data && (data.message || (data.error && data.error.message))) || "文生图失败");
  }
  var taskId = data.output && data.output.task_id;
  if (!taskId) throw new Error("文生图未返回 task_id");
  var i;
  for (i = 0; i < 30; i++) {
    await sleepMs(700);
    var tr = await fetch(DASHSCOPE_TASK_URL + encodeURIComponent(taskId), {
      headers: { Authorization: "Bearer " + DASHSCOPE_KEY }
    });
    var td = await tr.json();
    var st = (td.output && td.output.task_status) || "";
    if (st === "SUCCEEDED") {
      var results = td.output.results || [];
      var url = results[0] && (results[0].url || results[0].orig_url);
      if (!url) throw new Error("文生图无图片地址");
      return url;
    }
    if (st === "FAILED" || st === "CANCELED") {
      throw new Error((td.output && td.output.message) || "文生图任务失败");
    }
  }
  throw new Error("文生图超时");
}

async function ensureDailyWordImage(word, meaning) {
  var cacheKey = dailyWordNorm(word);
  if (!cacheKey) throw new Error("无效单词");
  var hit = lookupDailyWordImage(cacheKey);
  if (hit) return { url: hit, cached: true };
  if (dailyWordImageInflight[cacheKey]) return dailyWordImageInflight[cacheKey];

  dailyWordImageInflight[cacheKey] = (async function () {
    try {
      var remote;
      try {
        remote = await dashscopeImageForWord(word, meaning, DASHSCOPE_IMG_MODEL);
      } catch (e1) {
        // fallback if newer model unavailable on the account
        if (DASHSCOPE_IMG_MODEL !== "wanx2.1-t2i-turbo") {
          console.warn("[yysd-api] img model fallback", DASHSCOPE_IMG_MODEL, "-> wanx2.1-t2i-turbo", e1.message);
          remote = await dashscopeImageForWord(word, meaning, "wanx2.1-t2i-turbo");
        } else {
          throw e1;
        }
      }
      var local = await persistDailyWordImage(remote, cacheKey);
      return { url: local, cached: false };
    } finally {
      delete dailyWordImageInflight[cacheKey];
    }
  })();

  return dailyWordImageInflight[cacheKey];
}

app.post("/api/daily-word/speak", authMiddleware, async function (req, res) {
  if (!DASHSCOPE_KEY) return res.status(503).json({ error: "DASHSCOPE_API_KEY 未配置" });
  var audio = clipText(req.body && req.body.audio, 12 * 1024 * 1024);
  var target = clipText(req.body && req.body.target, 80);
  var audioSec = Math.max(0, Math.min(60, Number(req.body && req.body.audioSec) || 0));
  if (!audio || audio.indexOf("data:") !== 0) return res.status(400).json({ error: "缺少 audio（data URL）" });
  if (!target) return res.status(400).json({ error: "缺少 target" });
  var u = getUsage(req.user.sub);
  if (!isAdminPhone(req.user.phone) && audioSec > 0 && u.voiceSec + audioSec > AI_QUOTA.voiceSec) {
    return res.status(429).json({ error: "今日语音时长已达上限（15 分钟），明日再来" });
  }
  try {
    var heard = await dashscopeAsrDataUrl(audio);
    if (!heard) return res.status(502).json({ error: "未能识别出语音内容，请重试" });
    if (audioSec > 0) bumpUsage(req.user.sub, { voiceSec: audioSec });
    res.json({ ok: true, pass: dailyWordSpeakPass(heard, target), heard: heard });
  } catch (e) {
    console.error("[yysd-api] daily-word/speak", e && e.code, e && e.message);
    res.status(502).json({
      error: dashscopeAsrUserError(
        { code: e && e.code, message: e && e.message },
        "跟读评测失败，请稍后再试"
      )
    });
  }
});

app.post("/api/daily-word/image", authMiddleware, async function (req, res) {
  if (!DASHSCOPE_KEY) return res.status(503).json({ error: "DASHSCOPE_API_KEY 未配置" });
  var word = clipText(req.body && req.body.word, 80);
  var meaning = clipText(req.body && req.body.meaning, 120);
  if (!word) return res.status(400).json({ error: "缺少 word" });
  try {
    var out = await ensureDailyWordImage(word, meaning);
    res.json({ ok: true, url: out.url, cached: !!out.cached });
  } catch (e) {
    console.error("[yysd-api] daily-word/image", e.message);
    res.status(502).json({ error: "配图生成失败" });
  }
});

// ---- Platform console (super-admin) ----

function daysUntil(iso) {
  if (!iso) return null;
  var t = Date.parse(iso);
  if (!isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

function orgStatsRow(org) {
  var id = org.id;
  var d7 = new Date(Date.now() - 7 * 86400000).toISOString();
  var d30 = new Date(Date.now() - 30 * 86400000).toISOString();
  var expDays = daysUntil(org.expires_at);
  return Object.assign(tenant.orgAdminPayload(org), {
    studentCount: orgStmts.countUsersByOrg.get(id).n,
    teacherCount: orgStmts.countTeachersByOrg.get(id).n,
    active7d: orgStmts.countActiveUsers7d.get(id, d7).n,
    active30d: orgStmts.countActiveUsers30d.get(id, d30).n,
    expiresInDays: expDays,
    expiringSoon: expDays != null && expDays >= 0 && expDays <= 14
  });
}

function saveOrgLogoDataUrl(orgId, dataUrl) {
  var raw = String(dataUrl || "");
  var m = raw.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if (!m) return { error: "请上传 JPG / PNG / WebP 图片" };
  var ext = m[1].toLowerCase() === "jpg" ? "jpg" : m[1].toLowerCase();
  var buf;
  try { buf = Buffer.from(m[2], "base64"); } catch (e) { return { error: "图片数据无效" }; }
  if (!buf.length || buf.length > 400 * 1024) return { error: "Logo 过大（请小于 400KB）" };
  var fileName = "org-" + orgId + "." + (ext === "jpeg" ? "jpg" : ext);
  var abs = path.join(orgLogosDir, fileName);
  try {
    fs.writeFileSync(abs, buf);
  } catch (e) {
    return { error: "保存 Logo 失败" };
  }
  return { url: "/uploads/org-logos/" + fileName + "?v=" + Date.now() };
}

app.get("/api/platform/orgs", platformAuthMiddleware, function (req, res) {
  var rows = orgStmts.listOrgs.all().map(function (o) {
    return orgStatsRow(tenant.ensureOrgStatus(db, o));
  });
  res.json({ ok: true, orgs: rows });
});

app.post("/api/platform/orgs", platformAuthMiddleware, function (req, res) {
  var body = req.body || {};
  var slug = tenant.normalizeSlug(body.slug);
  var name = clipText(body.name, 80);
  if (!slug) return res.status(400).json({ error: "小网址不合法（2–32 位小写字母数字连字符，且不能用保留字）" });
  if (!name) return res.status(400).json({ error: "请填写公司名称" });
  if (orgStmts.findOrgBySlug.get(slug)) {
    return res.status(400).json({ error: "该小网址已被占用" });
  }
  var status = clipText(body.status || "trial", 20) || "trial";
  if (status !== "trial" && status !== "active" && status !== "suspended") status = "trial";
  var expiresAt = clipText(body.expiresAt || body.expires_at, 40) || null;
  var adminPhone = normalizePhone(body.adminPhone || body.admin_phone) || null;
  var note = clipText(body.contractNote || body.contract_note, 200) || null;
  var now = new Date().toISOString();
  var info = orgStmts.insertOrg.run(slug, name, null, status, expiresAt, adminPhone, note, now);
  var org = orgStmts.findOrgById.get(info.lastInsertRowid);
  auditPlatform(req.user.phone, "org.create", org.id, slug + " " + name);
  res.json({ ok: true, org: orgStatsRow(org) });
});

app.patch("/api/platform/orgs/:id", platformAuthMiddleware, function (req, res) {
  var id = Number(req.params.id);
  var org = orgStmts.findOrgById.get(id);
  if (!org) return res.status(404).json({ error: "机构不存在" });
  var body = req.body || {};
  var slug = body.slug != null ? tenant.normalizeSlug(body.slug) : org.slug;
  if (!slug) return res.status(400).json({ error: "小网址不合法" });
  if (slug !== org.slug && orgStmts.findOrgBySlug.get(slug)) {
    return res.status(400).json({ error: "该小网址已被占用" });
  }
  var name = body.name != null ? clipText(body.name, 80) : org.name;
  if (!name) return res.status(400).json({ error: "请填写公司名称" });
  var status = body.status != null ? clipText(body.status, 20) : org.status;
  if (status !== "trial" && status !== "active" && status !== "suspended") {
    return res.status(400).json({ error: "status 须为 trial / active / suspended" });
  }
  var expiresAt = body.expiresAt !== undefined || body.expires_at !== undefined
    ? (clipText(body.expiresAt || body.expires_at, 40) || null)
    : org.expires_at;
  var adminPhone = body.adminPhone !== undefined || body.admin_phone !== undefined
    ? (normalizePhone(body.adminPhone || body.admin_phone) || null)
    : org.admin_phone;
  var note = body.contractNote !== undefined || body.contract_note !== undefined
    ? (clipText(body.contractNote || body.contract_note, 200) || null)
    : org.contract_note;
  var logoUrl = org.logo_url;
  if (body.logoDataUrl) {
    var saved = saveOrgLogoDataUrl(id, body.logoDataUrl);
    if (saved.error) return res.status(400).json({ error: saved.error });
    logoUrl = saved.url.split("?")[0];
  }
  orgStmts.updateOrg.run(slug, name, logoUrl, status, expiresAt, adminPhone, note, id);
  org = orgStmts.findOrgById.get(id);
  auditPlatform(req.user.phone, "org.update", id, JSON.stringify({ slug: slug, status: status, expiresAt: expiresAt }));
  res.json({ ok: true, org: orgStatsRow(org) });
});

app.post("/api/platform/orgs/:id/suspend", platformAuthMiddleware, function (req, res) {
  var id = Number(req.params.id);
  var org = orgStmts.findOrgById.get(id);
  if (!org) return res.status(404).json({ error: "机构不存在" });
  orgStmts.updateOrg.run(
    org.slug, org.name, org.logo_url, "suspended", org.expires_at, org.admin_phone, org.contract_note, id
  );
  auditPlatform(req.user.phone, "org.suspend", id, org.slug);
  res.json({ ok: true, org: orgStatsRow(orgStmts.findOrgById.get(id)) });
});

app.post("/api/platform/orgs/:id/activate", platformAuthMiddleware, function (req, res) {
  var id = Number(req.params.id);
  var org = orgStmts.findOrgById.get(id);
  if (!org) return res.status(404).json({ error: "机构不存在" });
  var body = req.body || {};
  var expiresAt = body.expiresAt !== undefined
    ? (clipText(body.expiresAt, 40) || null)
    : org.expires_at;
  if (expiresAt && Date.parse(expiresAt) < Date.now()) {
    return res.status(400).json({ error: "请先把到期日改到未来，再恢复开通" });
  }
  orgStmts.updateOrg.run(
    org.slug, org.name, org.logo_url, "active", expiresAt, org.admin_phone, org.contract_note, id
  );
  auditPlatform(req.user.phone, "org.activate", id, org.slug);
  res.json({ ok: true, org: orgStatsRow(orgStmts.findOrgById.get(id)) });
});

app.post("/api/platform/orgs/:id/impersonate", platformAuthMiddleware, function (req, res) {
  var id = Number(req.params.id);
  var org = tenant.ensureOrgStatus(db, orgStmts.findOrgById.get(id));
  if (!org) return res.status(404).json({ error: "机构不存在" });
  if (!tenant.orgUsable(org)) {
    return res.status(400).json({ error: "机构已停用，无法进入；请先恢复开通" });
  }
  var adminTeacher = org.admin_phone ? stmts.findTeacher.get(org.admin_phone) : null;
  var ghost = adminTeacher
    ? Object.assign({}, adminTeacher, { org_id: org.id })
    : {
      id: 0,
      phone: phoneDigits(req.user.phone),
      name: "平台客服",
      avatar_url: "",
      created_at: new Date().toISOString(),
      last_login_at: null,
      org_id: org.id
    };
  var token = issueTeacherToken(ghost, ghost.phone, {
    platformImpersonate: true,
    orgId: org.id
  });
  if (!token) return res.status(503).json({ error: "服务未配置 JWT_SECRET" });
  auditPlatform(req.user.phone, "org.impersonate", id, org.slug);
  var entryHost = (process.env.SITE_HOST || "youyisida.com").replace(/^www\./, "");
  res.json({
    ok: true,
    token: token,
    teacher: Object.assign(teacherPayload(ghost), { isAdmin: true, impersonating: true }),
    org: tenant.orgPublicPayload(org),
    entryUrl: "https://" + org.slug + "." + entryHost + "/teacher.html?impersonate=" + encodeURIComponent(token)
  });
});

app.post("/api/platform/orgs/:id/invite-admin", platformAuthMiddleware, function (req, res) {
  var id = Number(req.params.id);
  var org = orgStmts.findOrgById.get(id);
  if (!org) return res.status(404).json({ error: "机构不存在" });
  if (org.slug === tenant.DEFAULT_SLUG) {
    return res.status(400).json({ error: "总部账号请直接使用超管登录，无需邀请" });
  }
  var body = req.body || {};
  var phone = normalizePhone(body.phone || org.admin_phone) || null;
  var days = Number(body.days);
  if (!isFinite(days) || days < 1 || days > 30) days = 7;
  var inviteToken = crypto.randomBytes(24).toString("hex");
  var now = new Date();
  var expires = new Date(now.getTime() + days * 86400000).toISOString();
  orgStmts.insertInvite.run(
    inviteToken,
    org.id,
    phone,
    "org_admin",
    expires,
    now.toISOString(),
    phoneDigits(req.user.phone)
  );
  if (phone) orgStmts.setOrgAdminPhone.run(phone, org.id);
  auditPlatform(req.user.phone, "org.invite_admin", id, org.slug + " " + (phone || ""));
  var entryHost = (process.env.SITE_HOST || "youyisida.com").replace(/^www\./, "");
  var inviteUrl = "https://" + org.slug + "." + entryHost +
    "/teacher-register.html?invite=" + encodeURIComponent(inviteToken);
  res.json({
    ok: true,
    inviteUrl: inviteUrl,
    expiresAt: expires,
    phone: phone ? maskPhone(phone) : "",
    org: orgStatsRow(orgStmts.findOrgById.get(id))
  });
});

app.get("/api/platform/orgs/:id/reg-keys", platformAuthMiddleware, function (req, res) {
  var id = Number(req.params.id);
  var org = orgStmts.findOrgById.get(id);
  if (!org) return res.status(404).json({ error: "机构不存在" });
  if (org.slug === tenant.DEFAULT_SLUG) {
    return res.status(400).json({ error: "总部不使用分站注册密钥" });
  }
  res.json({ ok: true, orgId: id, slug: org.slug, name: org.name, keys: regKeysPayload(id) });
});

app.put("/api/platform/orgs/:id/reg-keys", platformAuthMiddleware, function (req, res) {
  var id = Number(req.params.id);
  var org = orgStmts.findOrgById.get(id);
  if (!org) return res.status(404).json({ error: "机构不存在" });
  if (org.slug === tenant.DEFAULT_SLUG) {
    return res.status(400).json({ error: "总部不使用分站注册密钥" });
  }
  var items = (req.body && req.body.keys) || [];
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "请提交密钥配置" });
  }
  var allowed = { student: 1, teacher: 1, org_admin: 1 };
  var now = new Date().toISOString();
  try {
    var txKeys = db.transaction(function () {
      items.forEach(function (item) {
        var role = String((item && item.role) || "");
        if (!allowed[role]) return;
        var existing = orgStmts.findRegKey.get(id, role);
        var keyValue = item.keyValue != null
          ? String(item.keyValue).trim().slice(0, 120)
          : (existing ? existing.key_value : "");
        var maxUses = item.maxUses != null
          ? Math.max(0, Math.floor(Number(item.maxUses) || 0))
          : (existing ? Number(existing.max_uses) || 0 : 0);
        var usedCount = existing ? Number(existing.used_count) || 0 : 0;
        if (item.resetUsed) usedCount = 0;
        if (item.usedCount != null && isFinite(Number(item.usedCount))) {
          usedCount = Math.max(0, Math.floor(Number(item.usedCount)));
        }
        orgStmts.upsertRegKey.run(id, role, keyValue, maxUses, usedCount, now);
      });
    });
    txKeys();
  } catch (e) {
    return res.status(400).json({ error: e.message || "保存失败" });
  }
  auditPlatform(req.user.phone, "org.reg_keys", id, org.slug);
  res.json({ ok: true, orgId: id, keys: regKeysPayload(id) });
});

app.get("/api/platform/audit", platformAuthMiddleware, function (req, res) {
  var rows = orgStmts.listAudit.all().map(function (r) {
    return {
      id: r.id,
      actorPhone: maskPhone(r.actor_phone),
      action: r.action,
      orgId: r.org_id,
      detail: r.detail || "",
      createdAt: r.created_at
    };
  });
  res.json({ ok: true, logs: rows });
});

app.use(function (err, req, res, next) {
  console.error("[yysd-api] unhandled", err && err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "服务器内部错误" });
});

process.on("unhandledRejection", function (err) {
  console.error("[yysd-api] unhandledRejection", err && err.message ? err.message : err);
});

process.on("SIGTERM", function () {
  try { db.close(); } catch (e) {}
  process.exit(0);
});

// Vocab diagnostic (adaptive placement + mistake book)
diagnostic.mountRoutes(app, {
  db: db,
  authMiddleware: authMiddleware,
  teacherAuthMiddleware: teacherAuthMiddleware,
  allowedStudentIdsForTeacher: allowedStudentIdsForTeacher,
  isOrgAdminReq: isOrgAdminReq,
  teacherCanManageStudent: teacherCanManageStudent,
  findUserById: function (id) { return stmts.findUserById.get(id); },
  listStudentsByOrg: function (orgId) {
    return orgStmts.listStudentsByOrg.all(orgId);
  },
  repoRoot: path.join(__dirname, "..")
});

// High-school vocab dual-mode (unit / custom / mistakes)
hsVocab.mountRoutes(app, {
  db: db,
  authMiddleware: authMiddleware
});

// Unified vocab catalog + bookshelf (learn/quiz later phases)
vocabShelf.mountRoutes(app, {
  db: db,
  authMiddleware: authMiddleware,
  repoRoot: path.join(__dirname, "..")
});

// ponytail: runnable self-check
if (require.main === module) {
  console.assert(normalizePhone("13800138000") === "13800138000");
  console.assert(normalizePhone("23800138000") === null);
  var hp = hashPassword("test1234");
  console.assert(verifyPassword("test1234", hp));
  console.assert(!verifyPassword("wrong", hp));
  console.assert(EVENT_TYPES.ASSIGNMENT && EVENT_TYPES.LESSON && EVENT_TYPES.ANNOUNCEMENT);
  console.assert(effectiveTaskStatus("PENDING", "2000-01-01T00:00:00.000Z") === "OVERDUE");
  console.assert(effectiveTaskStatus("COMPLETED", "2000-01-01T00:00:00.000Z") === "COMPLETED");
  console.assert(parseExerciseIds(["a", "a", "b"]).join(",") === "a,b");
  console.assert(parseStudentIds([1, "2", 1, 0]).join(",") === "1,2");
  console.assert(isAdminPhone("15901754473") === true);
  console.assert(isAdminPhone("15609693333") === true);
  console.assert(isAdminPhone("13800138000") === false);
  console.assert(tenant.normalizeSlug("acme-edu") === "acme-edu");
  console.assert(tenant.normalizeSlug("www") === null);
  console.assert(tenant.slugFromHost("acme.youyisida.com") === "acme");
  console.assert(tenant.slugFromHost("youyisida.com") === "yysd");
  console.assert(!!orgStmts.findOrgBySlug.get("yysd"), "default org missing");
  console.assert(quotaPayload({ textCount: 99, voiceSec: 9999, fullMocks: 99 }, true).unlimited === true);
  console.assert(quotaPayload({ textCount: 99, voiceSec: 9999, fullMocks: 99 }, true).fullMockLeft > 0);
  console.assert(examTypeLabel("full") === "完整模拟考");
  console.assert(buildTutorSystem("teacher", "", null).indexOf("口语") >= 0);
  console.assert(parseWordFromReply('x\nWORD_JSON:{"word":"cat","ipa":"/kæt/","meaning":"猫"}').word === "cat");
  console.assert(stripWordMarker("hello\nWORD_JSON:{\"word\":\"a\"}") === "hello");
  try {
    console.assert(loadActiveBank().part1.length > 0);
    console.assert(buildExamPack("mock").part2.title.indexOf("Describe") === 0);
    console.assert(loadWritingBank().task1.length > 0);
  } catch (e) {
    console.error("[yysd-api] speaking/writing bank unavailable at boot:", e.message);
  }
  app.listen(PORT, function () {
    console.log("[yysd-api] listening on " + PORT + (SMS_DEV ? " (SMS_DEV_MODE)" : "") +
      " admins=" + ADMIN_PHONES.join(",") + " defaultOrg=yysd");
  });
}

module.exports = app;
