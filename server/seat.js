"use strict";

/** One Mac, one student or teacher. Admins are not seated.
 *  device_key = hardware UUID + file id. File lives outside the app so
 *  reinstall/OS upgrade keep it; disk erase deletes it. */

var crypto = require("crypto");
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function init(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS seat_meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);" +
    "CREATE TABLE IF NOT EXISTS seats (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "code TEXT NOT NULL UNIQUE," +
    "role TEXT NOT NULL," +
    "phone TEXT," +
    "device_key TEXT," +
    "disabled INTEGER NOT NULL DEFAULT 0," +
    "created_at TEXT NOT NULL" +
    ");"
  );
  var stmts = {
    metaGet: db.prepare("SELECT v FROM seat_meta WHERE k = ?"),
    metaSet: db.prepare(
      "INSERT INTO seat_meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v"
    ),
    byCode: db.prepare("SELECT * FROM seats WHERE code = ?"),
    byPhoneRole: db.prepare("SELECT * FROM seats WHERE phone = ? AND role = ?"),
    byDevice: db.prepare("SELECT * FROM seats WHERE device_key = ?"),
    bound: db.prepare("SELECT * FROM seats WHERE phone = ? AND role = ? AND device_key = ?"),
    insert: db.prepare(
      "INSERT INTO seats (code, role, phone, device_key, disabled, created_at) VALUES (?, ?, ?, NULL, 0, ?)"
    ),
    bind: db.prepare("UPDATE seats SET phone = ?, device_key = ? WHERE id = ?"),
    clearDevice: db.prepare("UPDATE seats SET device_key = NULL WHERE id = ?"),
    setDisabled: db.prepare("UPDATE seats SET disabled = ? WHERE id = ?"),
    list: db.prepare("SELECT * FROM seats ORDER BY id DESC")
  };

  function switchOn() {
    var row = stmts.metaGet.get("switch");
    return !!(row && row.v === "1");
  }

  function setSwitch(on) {
    stmts.metaSet.run("switch", on ? "1" : "0");
  }

  function deviceKey(device) {
    if (!device) return "";
    var hw = String(device.hw || "").trim();
    var file = String(device.file || "").trim();
    if (!/^[A-Za-z0-9-]{8,80}$/.test(hw) || !/^[A-Za-z0-9-]{8,80}$/.test(file)) return "";
    return hw + ":" + file;
  }

  function normalizeCode(raw) {
    var s = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (s.length !== 8) return "";
    return s.slice(0, 4) + "-" + s.slice(4);
  }

  function genCode() {
    for (var n = 0; n < 8; n++) {
      var buf = crypto.randomBytes(8);
      var s = "";
      for (var i = 0; i < 8; i++) s += ALPHABET[buf[i] % ALPHABET.length];
      var code = s.slice(0, 4) + "-" + s.slice(4);
      if (!stmts.byCode.get(code)) return code;
    }
    throw new Error("生成激活码失败");
  }

  function create(role, phone) {
    if (role !== "student" && role !== "teacher") return { error: "请选择学生或老师" };
    phone = phone ? String(phone) : "";
    if (phone && stmts.byPhoneRole.get(phone, role)) return { error: "这个人已经有激活码" };
    var code = genCode();
    var info = stmts.insert.run(code, role, phone || null, new Date().toISOString());
    return { seat: stmts.byCode.get(code) || { id: info.lastInsertRowid, code: code, role: role, phone: phone || null } };
  }

  /** Call only after password or registration has succeeded. */
  function authorize(opts) {
    if (opts.isAdmin) return { ok: true };
    var key = deviceKey(opts.device);
    var on = switchOn();
    if (!key) {
      if (on && (opts.purpose === "login" || opts.purpose === "register" || opts.purpose === "reset")) {
        return { error: "请下载 Mac 程序后继续", status: 403, code: "seat_required" };
      }
      return { ok: true };
    }
    if (opts.purpose === "reset") return { ok: true, claim: key };

    var role = opts.role;
    var phone = opts.phone;
    var held = phone ? stmts.byPhoneRole.get(phone, role) : null;
    if (held && held.disabled) return { error: "账号已停用", status: 403 };

    if (held && held.device_key && held.device_key === key) {
      return { ok: true, claim: key };
    }
    if (held && held.device_key && held.device_key !== key && !opts.code) {
      return { error: "这张激活码已绑定另一台 Mac，请联系管理员解除", status: 403 };
    }

    var code = normalizeCode(opts.code);
    if (!code) return { error: "这台 Mac 尚未激活，请填写激活码", status: 403 };
    var row = stmts.byCode.get(code);
    if (!row || row.role !== role) return { error: "激活码无效", status: 400 };
    if (row.disabled) return { error: "账号已停用", status: 403 };
    if (row.phone && row.phone !== phone) return { error: "这张激活码不属于该手机号", status: 400 };
    if (!row.phone && opts.purpose === "login") {
      return { error: "这是一张新用户激活码，请先注册", status: 400 };
    }
    if (row.device_key && row.device_key !== key) {
      return { error: "这张激活码已绑定另一台 Mac，请联系管理员解除", status: 403 };
    }
    var taken = stmts.byDevice.get(key);
    if (taken && taken.id !== row.id) return { error: "这台 Mac 已绑定其他账号", status: 400 };
    return { ok: true, claim: key, bindId: row.id, bindPhone: phone };
  }

  function commitBind(auth) {
    if (!auth || !auth.bindId) return;
    stmts.bind.run(auth.bindPhone, auth.claim, auth.bindId);
  }

  function rejectToken(user) {
    if (!user || user.platformImpersonate || user.adminSeat) return null;
    if (user.role !== "student" && user.role !== "teacher") return null;
    if (!switchOn()) return null;
    if (!user.device) return "请下载 Mac 程序后登录";
    var row = stmts.bound.get(user.phone, user.role, user.device);
    if (!row) return "这台 Mac 未绑定该账号";
    if (row.disabled) return "账号已停用";
    return null;
  }

  return {
    switchOn: switchOn,
    setSwitch: setSwitch,
    deviceKey: deviceKey,
    normalizeCode: normalizeCode,
    create: create,
    authorize: authorize,
    commitBind: commitBind,
    rejectToken: rejectToken,
    list: function () { return stmts.list.all(); },
    get: function (id) { return db.prepare("SELECT * FROM seats WHERE id = ?").get(id); },
    unbind: function (id) { stmts.clearDevice.run(id); },
    setDisabled: function (id, disabled) { stmts.setDisabled.run(disabled ? 1 : 0, id); }
  };
}

module.exports = { init: init };
