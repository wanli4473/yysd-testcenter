#!/usr/bin/env node
"use strict";
var Database = require("../server/node_modules/better-sqlite3");
var seatMod = require("../server/seat");
var db = new Database(":memory:");
var seats = seatMod.init(db);
var devA = { hw: "HW-11111111", file: "FILE-11111111" };
var devB = { hw: "HW-22222222", file: "FILE-22222222" };

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exit(1);
  }
}

assert(seats.switchOn() === false, "switch starts off");
var blank = seats.create("student", "");
assert(blank.seat && blank.seat.code, "blank code");
var auth = seats.authorize({
  role: "student", phone: "13800000000", device: devA,
  code: blank.seat.code, purpose: "register", isAdmin: false
});
assert(auth.ok && auth.bindId, "register binds only after authorize ok");
seats.commitBind(auth);
var again = seats.authorize({
  role: "student", phone: "13800000000", device: devA, purpose: "login", isAdmin: false
});
assert(again.ok && !again.bindId, "same mac logs in without code");
var other = seats.authorize({
  role: "student", phone: "13800000000", device: devB, purpose: "login", isAdmin: false
});
assert(other.error, "other mac blocked");
var badPw = seats.authorize({
  role: "student", phone: "13900000000", device: devB,
  code: "NOPE-NOPE", purpose: "login", isAdmin: false
});
assert(badPw.error, "bad code does not bind");
assert(!seats.list().some(function (s) { return s.phone === "13900000000"; }), "failed login did not occupy");
seats.setSwitch(true);
var browser = seats.authorize({
  role: "student", phone: "13800000000", purpose: "login", isAdmin: false
});
assert(browser.code === "seat_required", "browser blocked when switch on");
assert(seats.rejectToken({ role: "student", phone: "13800000000", device: seats.deviceKey(devA) }) === null, "app token ok");
assert(seats.rejectToken({ role: "student", phone: "13800000000" }), "browser token killed");
var row = seats.list()[0];
seats.setDisabled(row.id, true);
assert(seats.authorize({
  role: "student", phone: "13800000000", device: devA, purpose: "login", isAdmin: false
}).error === "账号已停用", "disable blocks");
seats.setDisabled(row.id, false);
seats.unbind(row.id);
var rebound = seats.authorize({
  role: "student", phone: "13800000000", device: devB,
  code: blank.seat.code, purpose: "login", isAdmin: false
});
assert(rebound.ok && rebound.bindId, "same code rebinds after unbind");
console.log("ok");
