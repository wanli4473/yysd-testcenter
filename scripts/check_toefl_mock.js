"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var F = require("../assets/js/toefl-full.js");

// 日期卷清单不硬编码：服务端按 library/toefl 四科齐全派生
var TIKU = require("../server/tiku.js");
var repo = path.join(__dirname, "..");
var diskMocks = TIKU.stockMocks(repo);
assert.ok(diskMocks.length >= 22, "date packs on disk: " + diskMocks.length);
assert.strictEqual(diskMocks.indexOf("2025-07-16") >= 0, true);
["reading", "listening", "writing", "speaking"].forEach(function (s) {
  assert.ok(fs.existsSync(path.join(repo, "library/toefl", diskMocks[0] + "-" + s + ".json")), "missing " + s);
});

// 完整模考 = 四科同 id 齐全的派生表，config.js 里不再抄日期清单
global.window = global;
global.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
global.document = {
  addEventListener: function () {}, getElementById: function () { return null; },
  querySelector: function () { return null; }, querySelectorAll: function () { return []; }
};
require("../assets/js/config.js");
var Y = global.window.YYSD;
var full = Y.TOEFL_FULL;
assert.ok(full.length >= 22, "TOEFL_FULL derived: " + full.length);
assert.strictEqual(fs.readFileSync(path.join(__dirname, "../assets/js/config.js"), "utf8").indexOf('var TOEFL_FULL = ['), -1,
  "TOEFL_FULL 必须由四科表派生，不许硬编码日期卷");
full.forEach(function (p) {
  ["TOEFL_READING", "TOEFL_LISTENING", "TOEFL_WRITING", "TOEFL_SPEAKING"].forEach(function (L) {
    assert.ok(Y[L].some(function (x) { return x.id === p.id; }), p.id + " 缺 " + L);
  });
  assert.ok(/· 完整模考$/.test(p.title), p.id + " 标题: " + p.title);
  assert.ok(p.duration > 0, p.id + " 没有时长，卡面按钮文案会缺数字");
});

// 一屏卡片：真跑 paint 看渲出来的 HTML
var mockSrc = fs.readFileSync(path.join(__dirname, "../app/assets/js/mock.js"), "utf8");
function mockSandbox(api) {
  var sb = { URLSearchParams: URLSearchParams, encodeURIComponent: encodeURIComponent, Promise: Promise, console: console };
  sb.window = sb;
  sb.YYSD = Y;
  sb.location = { pathname: "/app/mock.html", search: "", href: "" };
  sb.document = global.document;
  if (api) sb.YYSD_APP = { api: api };
  vm.runInNewContext(mockSrc, sb);
  return sb;
}
var host = { innerHTML: "", onclick: null };
mockSandbox().YYSD_HIT_MOCK.paint(host);
var html = host.innerHTML;
assert.strictEqual((html.match(/class="hit-mock-card"/g) || []).length, 10, "每页 10 张卡");
assert.ok(html.indexOf(">TOEFL Mock 1<") >= 0, "卡面只有 TOEFL Mock 编号");
assert.ok(html.indexOf("真题模考 · 自动评分") >= 0, "副行照 wofo");
assert.strictEqual((html.match(/只考[阅读听力口语写作]/g) || []).length, 40, "每卡四格只考X");
assert.strictEqual((html.match(/>全科模考</g) || []).length, 10, "中间一格是全科模考");
assert.strictEqual((html.match(/kind=single/g) || []).length, 40, "单科入口");
assert.ok(/href="mock\.html\?kind=single&amp;id=2025-07-16&amp;skill=speaking"/.test(html), "口语单科入口");
assert.ok(html.indexOf("kind=full&amp;id=2025-07-16") >= 0, "整套入口");
assert.ok(html.indexOf("国内线下") < 0 && html.indexOf("分钟") < 0, "卡面不出现日期和时长");
assert.ok(html.indexOf("hit-mock-pager") >= 0 && html.indexOf('data-page="3"') >= 0, "每页 10 套 + 底部分页");
assert.ok(html.indexOf("doorHTML") < 0 && html.indexOf("整套包") < 0, "两层选择屏已经合并");
assert.strictEqual((html.match(/hit-mode-badge/g) || []).length, 0, "无 access 时不给锁章");

// 翻页走真实 click handler
host.onclick({ target: { closest: function () { return { disabled: false, getAttribute: function () { return "3"; } }; } } });
assert.strictEqual((host.innerHTML.match(/class="hit-mock-card"/g) || []).length, full.length - 20, "末页只剩两套");
assert.ok(host.innerHTML.indexOf(">TOEFL Mock 21<") >= 0, "固定卷号：第三页从 Mock 21 起");

// 未开通：整张卡不渲染（学生只看得到自己那批）
var lockHost = { innerHTML: "", onclick: null };
mockSandbox(function (url) {
  return Promise.resolve(url.indexOf("access") >= 0 ? { access: { packages: {} } } : {});
}).YYSD_HIT_MOCK.paint(lockHost);
var locked = new Promise(function (r) { setTimeout(r, 5); }).then(function () {
  var h = lockHost.innerHTML;
  assert.strictEqual(h.indexOf('class="hit-mock-card"'), -1, "未开通的卷不渲染");
  assert.ok(h.indexOf("hit-empty") >= 0, "一套都没开通时给空态");
});

// 老师组卷并入同一个便当盒：编号接在日期卷之后，入口走 bank.html，只渲染这套卷真有的科
var packHost = { innerHTML: "", onclick: null };
mockSandbox(function (url) {
  if (url.indexOf("catalog") >= 0) {
    return Promise.resolve({ catalog: { papers: [{ id: "pk-9", kind: "full", blocks: [{ skill: "reading" }, { skill: "speaking" }] }] } });
  }
  return Promise.resolve({ access: { staff: true } });
}).YYSD_HIT_MOCK.paint(packHost);
var mixed = new Promise(function (r) { setTimeout(r, 5); }).then(function () {
  packHost.onclick({ target: { closest: function () { return { disabled: false, getAttribute: function () { return "3"; } }; } } });
  var h = packHost.innerHTML;
  assert.ok(h.indexOf(">TOEFL Mock 23<") >= 0, "老师组卷接在日期卷编号后面");
  assert.ok(h.indexOf("bank.html?id=pk-9") >= 0, "老师组卷主按钮走组考核场");
  assert.ok(h.indexOf("bank.html?id=pk-9&amp;skill=speaking") >= 0, "老师组卷单科入口带 skill");
  var pkCard = h.split('class="hit-mock-card"').filter(function (x) { return x.indexOf("bank.html?id=pk-9") >= 0; })[0];
  assert.ok(pkCard, "老师组卷卡片");
  assert.strictEqual((pkCard.match(/只考/g) || []).length, 2, "这套卷只有阅读和口语两格");
  assert.strictEqual(pkCard.indexOf("只考听力"), -1, "没有听力的卷不给只考听力");
});

// 老师组卷只考一科：从该科第一个题块开始，做完这一科就交卷
var trSrc = fs.readFileSync(path.join(__dirname, "../app/assets/js/tiku-run.js"), "utf8");
var store = {};
var jumps = [];
var trSb = {
  sessionStorage: {
    getItem: function (k) { return store[k] || null; },
    setItem: function (k, v) { store[k] = v; },
    removeItem: function (k) { delete store[k]; }
  },
  location: { pathname: "/app/bank.html", replace: function (u) { jumps.push(u); } },
  encodeURIComponent: encodeURIComponent
};
trSb.window = trSb;
vm.runInNewContext(trSrc, trSb);
var run = trSb.YYSD_TIKU_RUN.start({
  id: "pk-9", title: "t", kind: "mock",
  blocks: [{ skill: "reading" }, { skill: "reading" }, { skill: "listening" }],
  only: "listening"
});
assert.strictEqual(run.i, 2, "只考听力：从听力第一个题块开始");
assert.strictEqual(trSb.YYSD_TIKU_RUN.advance("listening", null), false, "最后一块交给成绩单，不回列表");
assert.strictEqual(trSb.YYSD_TIKU_RUN.load(), null, "结束后清掉组卷");

assert.strictEqual(F.mockHubHref("full"), "app/mock.html?kind=full");
assert.ok(F.skillHref("2025-07-04", "mock", "reading").indexOf("full=1") >= 0);
assert.ok(F.listBack("reading").indexOf("zone.html") >= 0);

var ngx = fs.readFileSync(path.join(__dirname, "../server/deploy/nginx-app.conf"), "utf8");
assert.ok(ngx.indexOf("try_files $uri @web_toefl") >= 0, "app set library must win before web dated papers");
assert.ok(ngx.indexOf("location @web_toefl") >= 0);
assert.ok(fs.readFileSync(path.join(__dirname, "../app/assets/js/toefl-speaking.js"), "utf8").indexOf("encodeURI(") >= 0);
assert.ok(fs.readFileSync(path.join(__dirname, "../toefl-listening.html"), "utf8").indexOf("clip.src = task.audio") >= 0,
  "听力音频由考卷页直接取路径（810 条 audio 全 ASCII，无需 encodeURI）");
var play = fs.readFileSync(path.join(__dirname, "../app/assets/js/play.js"), "utf8");
assert.ok(play.indexOf("showLoadError(") >= 0 && play.indexOf("Unable to load this set") >= 0, "load failure must surface a visible panel");

["reading", "listening", "writing", "speaking"].forEach(function (skill) {
  var page = fs.readFileSync(path.join(__dirname, "../app/" + skill + ".html"), "utf8");
  assert.ok(page.indexOf("toefl-" + skill + ".html?") >= 0, "app/" + skill + ".html 只做跳转，考场仍在根域");
});
assert.ok(/assets\/js\/play\.js\?v=/.test(fs.readFileSync(path.join(__dirname, "../app/review.html"), "utf8")),
  "play.js 必须带版本号（旧缓存 = dead Submit buttons）");

// 版式：wofo 式双列便当盒 + 圆角卡皮肤；退成整行列表或瑞士直角皮肤算回归
var libCss = fs.readFileSync(path.join(__dirname, "../app/assets/css/hit.css"), "utf8");
assert.ok(/\.hit-mock-cards\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/.test(libCss),
  "冲刺包必须是双列网格");
assert.ok(/\.hit-mock-skill\s*\{[^}]*repeat\(2,/.test(libCss), "单科入口 2×2");
assert.ok(/\.hit-mock-card\s*\{[^}]*border-radius:\s*12px/.test(libCss), "卡片圆角照 wofo");
assert.ok(/\.hit-mock-pager/.test(libCss), "分页条有样式");

require("./check_toefl_paper").checkLive();
Promise.all([locked, mixed]).then(function () { console.log("ok toefl mock picker"); });
