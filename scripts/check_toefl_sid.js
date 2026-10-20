/* one check: 一场完整模考四科共用一个 sid，单科练习各算一场 */
var path = require("path");
var FULL = path.join(__dirname, "..", "assets", "js", "toefl-full.js");

function load(search) {
  global.location = { search: search, hostname: "app.youyisida.com", pathname: "/x.html", replace: function () {} };
  delete require.cache[FULL];
  return require(FULL);
}
function ok(c, m) { if (!c) throw new Error(m); }

global.sessionStorage = {
  map: {},
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(this.map, k) ? this.map[k] : null; },
  setItem: function (k, v) { this.map[k] = String(v); },
  removeItem: function (k) { delete this.map[k]; }
};

var single = load("?id=bank-cw&mode=practice");
ok(single.currentSid() === 0, "单科练习不该有整场 sid");

var first = load("?id=set-9&mode=mock&full=1");
var pack = first.startPack("set-9", "mock");
ok(first.currentSid() === pack.sid && pack.sid > 0, "整场 sid 应来自 pack.sid");

var reload = load("?id=set-9&mode=mock&full=1");
ok(reload.enterSkill("set-9", "mock", "reading") === true, "reading 该进考试");
ok(reload.currentSid() === pack.sid, "换页后 sid 必须还是同一场");

var key = "yysd:toefl-full:set-9";
var old = JSON.parse(global.sessionStorage.getItem(key));
delete old.sid;
global.sessionStorage.setItem(key, JSON.stringify(old));
var legacy = load("?id=set-9&mode=mock&full=1");
legacy.enterSkill("set-9", "mock", "reading");
ok(legacy.currentSid() > 0 && legacy.load("set-9").sid === legacy.currentSid(), "旧卷包没有 sid 要补一个");

console.log("ok toefl sid");
