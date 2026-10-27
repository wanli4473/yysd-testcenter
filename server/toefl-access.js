"use strict";
/**
 * TOEFL 授权 — 练习区（scope=practice）+ 考前冲刺包（scope=package:<卷id>）。
 * 管理员批量开/关；老师限自己名下的学员开考前冲刺包。
 * 前端只负责显示锁态；能不能进以本模块的 /api/toefl/access 与 /api/toefl/exam-start 为准。
 * 宽限语义：模考关停/到期时，已开考未完成的场次 24h 内可回来考完，不打断进行中的作答。
 */
var PKG_PREFIX = "package:";
var GRACE_MS = 24 * 3600 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function ensureSchema(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS toefl_grants (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "user_id INTEGER NOT NULL," +
      "scope TEXT NOT NULL," +
      "status TEXT NOT NULL DEFAULT 'on'," +
      "start_at TEXT," +
      "expire_at TEXT," +
      "created_by INTEGER," +
      "created_by_name TEXT," +
      "created_at TEXT NOT NULL," +
      "updated_at TEXT NOT NULL" +
    ");" +
    "CREATE UNIQUE INDEX IF NOT EXISTS toefl_grants_user_scope ON toefl_grants (user_id, scope);" +
    "CREATE TABLE IF NOT EXISTS toefl_exam_starts (" +
      "user_id INTEGER NOT NULL," +
      "package_id TEXT NOT NULL," +
      "started_at TEXT NOT NULL," +
      "finished_at TEXT," +
      "PRIMARY KEY (user_id, package_id)" +
    ");"
  );
}

function parseTime(v, what) {
  if (v == null || v === "") return { v: null };
  var ms = Date.parse(v);
  if (isNaN(ms)) return { error: what + "格式不对" };
  return { v: new Date(ms).toISOString() };
}

/** 授权状态机：none/off/scheduled/expired/on。nowMs 由调用方传入，方便测试。 */
function grantState(row, nowMs) {
  if (!row) return { on: false, reason: "none" };
  if (row.status !== "on") return { on: false, reason: "off" };
  if (row.start_at && nowMs < Date.parse(row.start_at)) {
    return { on: false, reason: "scheduled", startAt: row.start_at, expireAt: row.expire_at || null };
  }
  if (row.expire_at && nowMs >= Date.parse(row.expire_at)) {
    return { on: false, reason: "expired", startAt: row.start_at || null, expireAt: row.expire_at };
  }
  return { on: true, startAt: row.start_at || null, expireAt: row.expire_at || null };
}

/** 考前冲刺包状态 = 授权状态 + 开考宽限。
 *  ponytail: 宽限窗 24h —— 关停后开考未完成的卷可在窗内考完本场；窗外的未完成记录视作弃考。 */
function packageState(grant, start, nowMs) {
  var st = grantState(grant, nowMs);
  if (st.on) return st;
  if (start && !start.finished_at && nowMs - Date.parse(start.started_at) < GRACE_MS) {
    return { on: true, grace: true, reason: "grace", expireAt: st.expireAt || null };
  }
  return st;
}

function loadGrantRows(db, scopes, orgId) {
  var sql = "SELECT g.*, u.display_name, u.phone FROM toefl_grants g JOIN users u ON u.id = g.user_id WHERE ";
  if (!scopes || !scopes.length) {
    return db.prepare(sql + "u.org_id = ? ORDER BY g.updated_at DESC").all(orgId);
  }
  var marks = scopes.map(function () { return "?"; }).join(",");
  var stmt = db.prepare(sql + "g.scope IN (" + marks + ") AND u.org_id = ? ORDER BY g.updated_at DESC");
  return stmt.all.apply(stmt, scopes.concat([orgId]));
}

function validateGrantWindow(body) {
  var on = body.action !== "off";
  var start = parseTime(body.startAt, "开始时间");
  if (start.error) return { error: start.error };
  var expire = parseTime(body.expireAt, "到期时间");
  if (expire.error) return { error: expire.error };
  if (on && expire.v && Date.parse(expire.v) <= Date.now()) {
    return { error: "到期时间已过，请选未来的时间" };
  }
  if (on && start.v && expire.v && Date.parse(start.v) >= Date.parse(expire.v)) {
    return { error: "到期时间需晚于开始时间" };
  }
  return { on: on, start: start.v, expire: expire.v };
}

// 批量对象解析：逗号分隔 + 去重 + 上限（防一次写爆）。纯函数，selfCheck 覆盖。
function splitScopes(raw) {
  var list = String(raw == null || raw === "" ? "practice" : raw).split(",")
    .map(function (x) { return x.trim(); })
    .filter(Boolean)
    .filter(function (v, i, a) { return a.indexOf(v) === i; })
    .slice(0, 20);
  return list.length ? list : ["practice"];
}

function adminNameOf(db, req) {
  if (!req.user.phone) return "总部";
  var t = db.prepare("SELECT name FROM teachers WHERE phone = ?").get(req.user.phone);
  return (t && t.name) || "管理员";
}

function mountRoutes(app, deps) {
  var db = deps.db;
  ensureSchema(db);

  // practice 或 package:<已上架 full/single 卷>；包 id 统一去 hq- 前缀
  function scopeInfo(scope) {
    scope = String(scope || "practice").trim();
    if (scope === "practice") return { scope: "practice" };
    if (scope.indexOf(PKG_PREFIX) === 0) {
      var p = deps.tiku.resolvePackage(db, scope.slice(PKG_PREFIX.length));
      if (!p) return { error: "找不到这个考前冲刺包（可能还没上架）" };
      return { scope: PKG_PREFIX + p.id, packageId: p.id };
    }
    return { error: "未知范围" };
  }

  function resolveScopes(raw) {
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var info = scopeInfo(raw[i]);
      if (info.error) return { error: info.error };
      if (out.indexOf(info.scope) < 0) out.push(info.scope);
    }
    return { scopes: out };
  }

  function grantLedger(req, scopes) {
    var rows = loadGrantRows(db, scopes, req.user.orgId);
    return rows.map(function (r) {
      return {
        userId: r.user_id,
        name: r.display_name || "",
        phone: deps.maskPhone ? deps.maskPhone(r.phone) : "",
        scope: r.scope,
        state: grantState(r, Date.now()),
        updatedByName: r.created_by_name || "",
        updatedAt: r.updated_at
      };
    });
  }

  function applyGrants(req, scopes, okIds, win) {
    var actorName = adminNameOf(db, req);
    var now = nowIso();
    var upsert = db.prepare(
      "INSERT INTO toefl_grants (user_id, scope, status, start_at, expire_at, created_by, created_by_name, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(user_id, scope) DO UPDATE SET status = excluded.status, start_at = excluded.start_at, " +
      "expire_at = excluded.expire_at, created_by_name = excluded.created_by_name, updated_at = excluded.updated_at"
    );
    db.transaction(function () {
      scopes.forEach(function (scope) {
        okIds.forEach(function (id) {
          upsert.run(id, scope, win.on ? "on" : "off", win.on ? win.start : null, win.on ? win.expire : null,
            req.user.sub || null, actorName, now, now);
        });
      });
    })();
  }

  // 学生端：入口校验的唯一事实来源（practice + 该学生的 packages 状态表）
  app.get("/api/toefl/access", deps.authMiddleware, function (req, res) {
    var staff = req.user.role === "teacher" || deps.isOrgAdminReq(req);
    if (staff) {
      return res.json({ ok: true, access: { staff: true, practice: { on: true }, packages: {} } });
    }
    var now = Date.now();
    var practice = grantState(
      db.prepare("SELECT * FROM toefl_grants WHERE user_id = ? AND scope = 'practice'").get(req.user.sub), now);
    var starts = Object.create(null);
    db.prepare("SELECT * FROM toefl_exam_starts WHERE user_id = ?").all(req.user.sub).forEach(function (s) {
      starts[s.package_id] = s;
    });
    var packages = {};
    db.prepare("SELECT * FROM toefl_grants WHERE user_id = ? AND scope LIKE 'package:%'").all(req.user.sub)
      .forEach(function (g) {
        var pid = g.scope.slice(PKG_PREFIX.length);
        packages[pid] = packageState(g, starts[pid] || null, now);
      });
    res.json({ ok: true, access: { staff: false, practice: practice, packages: packages } });
  });

  // 学生端：开考 —— 正规入口（mock 确认页 / bank 播放页）开始前调用。
  // 已开考未完成的复用原 started_at（防宽限无限滚）；完成过的重新计时。
  app.post("/api/toefl/exam-start", deps.authMiddleware, function (req, res) {
    var info = scopeInfo(PKG_PREFIX + String((req.body && req.body.packageId) || ""));
    if (info.error || !info.packageId) return res.status(404).json({ error: "这套模考还没上架" });
    if (req.user.role === "teacher" || deps.isOrgAdminReq(req)) return res.json({ ok: true, staff: true });
    var now = Date.now();
    var grant = db.prepare("SELECT * FROM toefl_grants WHERE user_id = ? AND scope = ?").get(req.user.sub, info.scope);
    var start = db.prepare("SELECT * FROM toefl_exam_starts WHERE user_id = ? AND package_id = ?")
      .get(req.user.sub, info.packageId);
    var st = packageState(grant, start, now);
    if (!st.on) {
      var TEXT = {
        none: "这一包还没开通，请联系老师",
        scheduled: "还没到开启时间",
        expired: "这一包已到期",
        off: "这一包已被停用"
      };
      return res.status(403).json({ error: TEXT[st.reason] || "暂时不能开始", reason: st.reason });
    }
    var startedAt = start && !start.finished_at ? start.started_at : new Date(now).toISOString();
    if (!start || start.finished_at) {
      db.prepare(
        "INSERT INTO toefl_exam_starts (user_id, package_id, started_at, finished_at) VALUES (?, ?, ?, NULL) " +
        "ON CONFLICT(user_id, package_id) DO UPDATE SET started_at = excluded.started_at, finished_at = NULL"
      ).run(req.user.sub, info.packageId, startedAt);
    }
    res.json({ ok: true, startedAt: startedAt, grace: !!st.grace });
  });

  // 学生端：完成上报（交卷页 best-effort 调用，只用于关闭宽限）
  app.post("/api/toefl/exam-done", deps.authMiddleware, function (req, res) {
    var pid = deps.tiku.normPackageId(String((req.body && req.body.packageId) || "").trim().slice(0, 64));
    if (!pid) return res.status(400).json({ error: "缺少 packageId" });
    db.prepare("UPDATE toefl_exam_starts SET finished_at = ? WHERE user_id = ? AND package_id = ? AND finished_at IS NULL")
      .run(nowIso(), req.user.sub, pid);
    res.json({ ok: true });
  });

  // 后台（老师/管理员）：可开锁的包列表
  app.get("/api/toefl/packages", deps.authMiddleware, function (req, res) {
    if (req.user.role !== "teacher" && !deps.isOrgAdminReq(req)) {
      return res.status(403).json({ error: "无权限" });
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, packages: deps.tiku.listPackages(db) });
  });

  // 管理员端：当前授权台账（含状态，前端不用自己算时间）。scope= 或 scopes= 逗号批量；* / all = 本机构全部
  app.get("/api/admin/grants", deps.adminAuthMiddleware, function (req, res) {
    var raw = req.query.scopes != null ? req.query.scopes : req.query.scope;
    if (raw === "*" || raw === "all") {
      return res.json({ ok: true, grants: grantLedger(req, []) });
    }
    var rs = resolveScopes(splitScopes(raw));
    if (rs.error) return res.status(400).json({ error: rs.error });
    res.json({ ok: true, grants: grantLedger(req, rs.scopes) });
  });

  // 管理员端：批量开/关。scope 或 scopes（批量对象）× studentIds 叉乘；开 = 覆盖式写入开始/到期；关 = status off
  app.post("/api/admin/grants", deps.adminAuthMiddleware, function (req, res) {
    var body = req.body || {};
    var rawScopes = Array.isArray(body.scopes) && body.scopes.length
      ? body.scopes.map(function (s) { return String(s); })
      : splitScopes(body.scope);
    var rs = resolveScopes(rawScopes);
    if (rs.error) return res.status(400).json({ error: rs.error });
    var ids = (Array.isArray(body.studentIds) ? body.studentIds : []).map(Number).filter(Boolean);
    if (!ids.length) return res.status(400).json({ error: "请先勾选学生" });
    if (ids.length > 500) return res.status(400).json({ error: "一次最多 500 人" });
    var win = validateGrantWindow(body);
    if (win.error) return res.status(400).json({ error: win.error });
    var marks = ids.map(function () { return "?"; }).join(",");
    var stmt = db.prepare("SELECT id FROM users WHERE org_id = ? AND id IN (" + marks + ")");
    var okIds = stmt.all.apply(stmt, [req.user.orgId].concat(ids)).map(function (r) { return r.id; });
    if (!okIds.length) return res.status(400).json({ error: "没有找到这些学生" });
    applyGrants(req, rs.scopes, okIds, win);
    res.json({ ok: true, count: okIds.length * rs.scopes.length, students: okIds.length, scopes: rs.scopes.length, action: win.on ? "on" : "off" });
  });
}

function selfCheck() {
  var Database = require("better-sqlite3");
  var db = new Database(":memory:");
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, phone TEXT, org_id INTEGER, display_name TEXT)");
  ensureSchema(db);
  var t0 = Date.parse("2026-10-13T08:00:00.000Z");
  var iso = function (ms) { return new Date(ms).toISOString(); };
  var eq = function (got, want, what) {
    if (got !== want) throw new Error("toefl-access selfCheck: " + what + " got " + got + " want " + want);
  };

  eq(grantState(null, t0).on, false, "no row must be locked");
  eq(grantState({ status: "off" }, t0).reason, "off", "off row");
  eq(grantState({ status: "on" }, t0).on, true, "on row without window");
  var future = { status: "on", start_at: iso(t0 + 3600000) };
  eq(grantState(future, t0).reason, "scheduled", "future start is scheduled");
  eq(grantState(future, t0 + 3600001).on, true, "start passes -> on");
  var past = { status: "on", expire_at: iso(t0 - 1) };
  eq(grantState(past, t0).reason, "expired", "past expire is expired");
  var win = { status: "on", start_at: iso(t0 - 10), expire_at: iso(t0 + 10) };
  eq(grantState(win, t0).on, true, "inside window is on");
  eq(grantState(win, t0 + 10).reason, "expired", "expire bound inclusive");

  // 宽限：关停/到期后已开考未完成的场次 24h 内放行
  var open = { started_at: iso(t0 - 3600000), finished_at: null };
  var done = { started_at: iso(t0 - 3600000), finished_at: iso(t0 - 1800000) };
  var stale = { started_at: iso(t0 - 25 * 3600000), finished_at: null };
  eq(packageState({ status: "on" }, null, t0).on, true, "on passthrough");
  eq(packageState({ status: "off" }, open, t0).grace, true, "grace while exam open");
  eq(packageState({ status: "off" }, done, t0).on, false, "finished exam no grace");
  eq(packageState({ status: "off" }, null, t0).reason, "off", "no start no grace");
  eq(packageState({ status: "off" }, stale, t0).on, false, "stale start no grace");
  eq(packageState({ status: "on", expire_at: iso(t0 - 1) }, open, t0).grace, true, "expired still graces open exam");
  eq(packageState({ status: "on", expire_at: iso(t0 + 3600000) }, open, t0).on, true, "on ignores grace");

  db.prepare("INSERT INTO users (id, phone, org_id, display_name) VALUES (1,'13800000001',1,'甲')").run();
  db.prepare("INSERT INTO toefl_grants (user_id, scope, status, start_at, expire_at, created_by, created_by_name, created_at, updated_at) " +
    "VALUES (1,'practice','on',NULL,NULL,9,'总部','x','x')").run();
  db.prepare("INSERT INTO toefl_grants (user_id, scope, status, created_at, updated_at) VALUES (1,'practice','off','y','y') " +
    "ON CONFLICT(user_id, scope) DO UPDATE SET status = excluded.status").run();
  var row = db.prepare("SELECT * FROM toefl_grants WHERE user_id = 1 AND scope = 'practice'").get();
  eq(row.status, "off", "upsert switches status");
  eq(db.prepare("SELECT COUNT(*) c FROM toefl_grants").get().c, 1, "one row per user×scope");
  eq(loadGrantRows(db, ["practice"], 1).length, 1, "ledger query keeps stmt this");
  db.prepare("INSERT INTO toefl_grants (user_id, scope, status, created_at, updated_at) VALUES (1,'package:a','on','z','z')").run();
  eq(loadGrantRows(db, [], 1).length, 2, "empty scopes loads all org grants");
  eq(loadGrantRows(db, null, 1).length, 2, "null scopes loads all org grants");
  eq(loadGrantRows(db, ["package:a"], 1).length, 1, "scoped ledger still filters");

  db.prepare("INSERT INTO toefl_exam_starts (user_id, package_id, started_at, finished_at) VALUES (1,'pkg-a','x',NULL)").run();
  db.prepare("INSERT INTO toefl_exam_starts (user_id, package_id, started_at, finished_at) VALUES (1,'pkg-a','y',NULL) " +
    "ON CONFLICT(user_id, package_id) DO UPDATE SET started_at = excluded.started_at").run();
  var ex = db.prepare("SELECT * FROM toefl_exam_starts WHERE user_id = 1 AND package_id = 'pkg-a'").get();
  eq(ex.started_at, "y", "exam start upsert");
  eq(db.prepare("SELECT COUNT(*) c FROM toefl_exam_starts").get().c, 1, "one start per user×package");

  // splitScopes：默认 practice、去重、去空白、上限 20
  eq(splitScopes(null).join(), "practice", "default practice");
  eq(splitScopes("").join(), "practice", "empty practice");
  eq(splitScopes(" practice , package:a ,practice, package:a ").join(), "practice,package:a", "dedupe+trim");
  eq(splitScopes(Array.apply(null, { length: 25 }).map(function (_, i) { return "s" + i; }).join(",")).length, 20, "cap 20");
}

module.exports = { ensureSchema: ensureSchema, grantState: grantState, packageState: packageState, loadGrantRows: loadGrantRows, mountRoutes: mountRoutes, selfCheck: selfCheck };
