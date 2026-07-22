"use strict";
/** ponytail: cd server && node ../scripts/check_tenant_isolation.js */
var path = require("path");
var fs = require("fs");
module.paths.unshift(path.join(__dirname, "..", "server", "node_modules"));
var Database = require("better-sqlite3");
var tenant = require("../server/tenant");

var tmp = path.join(__dirname, "..", "server", "data", "_iso_check.db");
try { fs.unlinkSync(tmp); } catch (e) {}
var db = new Database(tmp);
db.exec(
  "CREATE TABLE users (id INTEGER PRIMARY KEY, phone TEXT, password_hash TEXT, display_name TEXT, created_at TEXT, last_login_at TEXT, org_id INTEGER);" +
  "CREATE TABLE teachers (id INTEGER PRIMARY KEY, phone TEXT, name TEXT, created_at TEXT, last_login_at TEXT, org_id INTEGER);" +
  "CREATE TABLE user_score_attempts (id INTEGER PRIMARY KEY, user_id INTEGER, item_id TEXT, payload TEXT, created_at TEXT);"
);
var init = tenant.initTenant(db);
var a = init.defaultOrg;
var info = init.stmts.insertOrg.run("acme", "Acme", null, "active", null, null, null, new Date().toISOString());
var b = init.stmts.findOrgById.get(info.lastInsertRowid);
db.prepare("INSERT INTO users (phone, password_hash, org_id, created_at) VALUES (?,?,?,?)")
  .run("13800000001", "x", a.id, new Date().toISOString());
db.prepare("INSERT INTO users (phone, password_hash, org_id, created_at) VALUES (?,?,?,?)")
  .run("13800000002", "x", b.id, new Date().toISOString());
console.assert(init.stmts.listStudentsByOrg.all(a.id).length === 1);
console.assert(init.stmts.listStudentsByOrg.all(b.id).length === 1);
console.assert(init.stmts.listStudentsByOrg.all(a.id)[0].phone === "13800000001");
console.assert(!tenant.orgUsable({ status: "suspended" }));
console.assert(tenant.normalizeSlug("www") === null);
db.close();
fs.unlinkSync(tmp);
console.log("check_tenant_isolation: ok");
