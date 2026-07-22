"use strict";

/** Multi-tenant helpers + schema. Used by server.js */

var RESERVED_SLUGS = {
  www: 1, api: 1, admin: 1, platform: 1, mail: 1, static: 1, cdn: 1, test: 1, dev: 1, staging: 1
};
var DEFAULT_SLUG = "yysd";
var DEFAULT_NAME = "优益思达";

function normalizeSlug(raw) {
  var s = String(raw || "").toLowerCase().trim();
  if (!/^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(s)) return null;
  if (RESERVED_SLUGS[s]) return null;
  return s;
}

function initTenant(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS orgs (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "slug TEXT NOT NULL UNIQUE," +
    "name TEXT NOT NULL," +
    "logo_url TEXT," +
    "status TEXT NOT NULL DEFAULT 'active'," +
    "expires_at TEXT," +
    "admin_phone TEXT," +
    "contract_note TEXT," +
    "created_at TEXT NOT NULL" +
    ");" +
    "CREATE TABLE IF NOT EXISTS platform_audit_log (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "actor_phone TEXT NOT NULL," +
    "action TEXT NOT NULL," +
    "org_id INTEGER," +
    "detail TEXT," +
    "created_at TEXT NOT NULL" +
    ");" +
    "CREATE TABLE IF NOT EXISTS org_invites (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "token TEXT NOT NULL UNIQUE," +
    "org_id INTEGER NOT NULL," +
    "phone TEXT," +
    "role TEXT NOT NULL DEFAULT 'org_admin'," +
    "expires_at TEXT NOT NULL," +
    "used_at TEXT," +
    "created_at TEXT NOT NULL," +
    "created_by TEXT" +
    ");" +
    "CREATE TABLE IF NOT EXISTS org_reg_keys (" +
    "org_id INTEGER NOT NULL," +
    "role TEXT NOT NULL," +
    "key_value TEXT NOT NULL DEFAULT ''," +
    "max_uses INTEGER NOT NULL DEFAULT 0," +
    "used_count INTEGER NOT NULL DEFAULT 0," +
    "updated_at TEXT NOT NULL," +
    "PRIMARY KEY (org_id, role)" +
    ");"
  );

  try { db.exec("ALTER TABLE users ADD COLUMN org_id INTEGER"); } catch (e) { /* exists */ }
  try { db.exec("ALTER TABLE teachers ADD COLUMN org_id INTEGER"); } catch (e) { /* exists */ }

  var findBySlug = db.prepare("SELECT * FROM orgs WHERE slug = ?");
  var defaultOrg = findBySlug.get(DEFAULT_SLUG);
  if (!defaultOrg) {
    var now = new Date().toISOString();
    db.prepare(
      "INSERT INTO orgs (slug, name, status, created_at) VALUES (?, ?, 'active', ?)"
    ).run(DEFAULT_SLUG, DEFAULT_NAME, now);
    defaultOrg = findBySlug.get(DEFAULT_SLUG);
  }

  db.prepare("UPDATE users SET org_id = ? WHERE org_id IS NULL").run(defaultOrg.id);
  db.prepare("UPDATE teachers SET org_id = ? WHERE org_id IS NULL").run(defaultOrg.id);

  var stmts = {
    findOrgBySlug: findBySlug,
    findOrgById: db.prepare("SELECT * FROM orgs WHERE id = ?"),
    listOrgs: db.prepare("SELECT * FROM orgs ORDER BY id ASC"),
    insertOrg: db.prepare(
      "INSERT INTO orgs (slug, name, logo_url, status, expires_at, admin_phone, contract_note, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ),
    updateOrg: db.prepare(
      "UPDATE orgs SET slug = ?, name = ?, logo_url = ?, status = ?, expires_at = ?, " +
      "admin_phone = ?, contract_note = ? WHERE id = ?"
    ),
    setOrgLogo: db.prepare("UPDATE orgs SET logo_url = ? WHERE id = ?"),
    insertAudit: db.prepare(
      "INSERT INTO platform_audit_log (actor_phone, action, org_id, detail, created_at) VALUES (?, ?, ?, ?, ?)"
    ),
    listAudit: db.prepare(
      "SELECT * FROM platform_audit_log ORDER BY id DESC LIMIT 100"
    ),
    countUsersByOrg: db.prepare(
      "SELECT COUNT(*) AS n FROM users WHERE org_id = ? AND password_hash IS NOT NULL"
    ),
    countTeachersByOrg: db.prepare("SELECT COUNT(*) AS n FROM teachers WHERE org_id = ?"),
    countActiveUsers7d: db.prepare(
      "SELECT COUNT(*) AS n FROM users WHERE org_id = ? AND last_login_at IS NOT NULL AND last_login_at >= ?"
    ),
    countActiveUsers30d: db.prepare(
      "SELECT COUNT(*) AS n FROM users WHERE org_id = ? AND last_login_at IS NOT NULL AND last_login_at >= ?"
    ),
    listStudentsByOrg: db.prepare(
      "SELECT u.id, u.phone, u.display_name, u.created_at, u.last_login_at, " +
      "COUNT(a.id) AS score_count, MAX(a.created_at) AS last_score_at " +
      "FROM users u LEFT JOIN user_score_attempts a ON a.user_id = u.id " +
      "WHERE u.org_id = ? " +
      "GROUP BY u.id ORDER BY COALESCE(MAX(a.created_at), u.last_login_at, u.created_at) DESC"
    ),
    listTeachersByOrg: db.prepare(
      "SELECT id, phone, name, created_at, last_login_at, org_id FROM teachers WHERE org_id = ? ORDER BY id ASC"
    ),
    insertInvite: db.prepare(
      "INSERT INTO org_invites (token, org_id, phone, role, expires_at, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ),
    findInviteByToken: db.prepare("SELECT * FROM org_invites WHERE token = ?"),
    markInviteUsed: db.prepare("UPDATE org_invites SET used_at = ? WHERE id = ?"),
    setOrgAdminPhone: db.prepare("UPDATE orgs SET admin_phone = ? WHERE id = ?"),
    findRegKey: db.prepare("SELECT * FROM org_reg_keys WHERE org_id = ? AND role = ?"),
    listRegKeys: db.prepare("SELECT * FROM org_reg_keys WHERE org_id = ?"),
    upsertRegKey: db.prepare(
      "INSERT INTO org_reg_keys (org_id, role, key_value, max_uses, used_count, updated_at) VALUES (?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(org_id, role) DO UPDATE SET " +
      "key_value = excluded.key_value, max_uses = excluded.max_uses, " +
      "used_count = excluded.used_count, updated_at = excluded.updated_at"
    ),
    bumpRegKeyUsed: db.prepare(
      "UPDATE org_reg_keys SET used_count = used_count + 1, updated_at = ? " +
      "WHERE org_id = ? AND role = ? AND used_count < max_uses AND key_value = ?"
    )
  };

  return { defaultOrg: defaultOrg, stmts: stmts };
}

function orgExpired(org) {
  if (!org || !org.expires_at) return false;
  var t = Date.parse(org.expires_at);
  if (!isFinite(t)) return false;
  return t < Date.now();
}

function orgUsable(org) {
  if (!org) return false;
  if (org.status === "suspended") return false;
  if (orgExpired(org)) return false;
  return org.status === "active" || org.status === "trial";
}

function ensureOrgStatus(db, org) {
  if (!org) return org;
  if (org.status !== "suspended" && orgExpired(org)) {
    db.prepare("UPDATE orgs SET status = 'suspended' WHERE id = ?").run(org.id);
    org.status = "suspended";
  }
  return org;
}

function orgPublicPayload(org) {
  if (!org) return null;
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    logoUrl: org.logo_url || "",
    status: org.status,
    expiresAt: org.expires_at || null,
    usable: orgUsable(org)
  };
}

function orgAdminPayload(org) {
  var p = orgPublicPayload(org);
  if (!p) return null;
  p.adminPhone = org.admin_phone || "";
  p.contractNote = org.contract_note || "";
  return p;
}

function slugFromHost(host) {
  var h = String(host || "").toLowerCase().split(":")[0];
  if (!h || h === "localhost" || h === "127.0.0.1") return DEFAULT_SLUG;
  if (h === "youyisida.com" || h === "www.youyisida.com") return DEFAULT_SLUG;
  var m = h.match(/^([a-z0-9-]+)\.youyisida\.com$/);
  if (!m) return DEFAULT_SLUG;
  var s = m[1];
  if (RESERVED_SLUGS[s]) return DEFAULT_SLUG;
  return s;
}

function corsOriginAllowed(origin, staticOrigins) {
  if (!origin) return true;
  if (staticOrigins.indexOf(origin) !== -1) return true;
  if (/^https:\/\/([a-z0-9-]+\.)*youyisida\.com$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

module.exports = {
  RESERVED_SLUGS: RESERVED_SLUGS,
  DEFAULT_SLUG: DEFAULT_SLUG,
  DEFAULT_NAME: DEFAULT_NAME,
  normalizeSlug: normalizeSlug,
  initTenant: initTenant,
  orgExpired: orgExpired,
  orgUsable: orgUsable,
  ensureOrgStatus: ensureOrgStatus,
  orgPublicPayload: orgPublicPayload,
  orgAdminPayload: orgAdminPayload,
  slugFromHost: slugFromHost,
  corsOriginAllowed: corsOriginAllowed
};
