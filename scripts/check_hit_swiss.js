#!/usr/bin/env node
"use strict";
// 真题题库一屏列表引擎：链接形态、进度判定、筛选、版式选择、XSS 转义、单次解析
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const sourcePath = path.join(ROOT, "app/assets/js/hit-shell.js");
const source = fs.readFileSync(sourcePath, "utf8");
const exportMarker = "  w.YYSD_HIT = {";
assert.equal(source.split(exportMarker).length, 2, "unique VM injection point");
const storage = {};
let reads = 0;
const window = {
  localStorage: {
    getItem: key => { reads++; return storage[key] || null; },
    setItem: (key, value) => { storage[key] = String(value); }
  },
  URLSearchParams: URLSearchParams
};
const ctx = { window, URLSearchParams };
// 进度键的真实来源：先跑 toefl-lab.js，再用它给 hit-shell.js
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/js/toefl-lab.js"), "utf8"), ctx,
  { filename: "assets/js/toefl-lab.js", timeout: 1000 });
assert.ok(window.YYSD_TOEFL_LAB, "item-state store loaded");
vm.runInNewContext(source.replace(exportMarker,
  "  w.__lib = { cardHTML: cardHTML, rowHTML: rowHTML, panelHTML: panelHTML, itemHref: itemHref," +
  " libSearchHTML: libSearchHTML, cat: libCatalog," +
  " libStateOf: libStateOf, doneInSpan: doneInSpan, libView: libView, LIB: LIB };\n" + exportMarker),
  ctx, { filename: sourcePath, timeout: 1000 });
const { cardHTML, rowHTML, panelHTML, itemHref, libSearchHTML, cat, libStateOf, doneInSpan, libView, LIB } = window.__lib;
const hit = window.YYSD_HIT;

function params(href, skill) {
  const url = new URL(href, "https://example.test/app/");
  assert.equal(url.pathname, "/app/" + skill + ".html");
  return Object.fromEntries(url.searchParams);
}
assert.equal(itemHref("reading", "bank-rap", 4, 4), "reading.html?id=bank-rap&mode=practice&task=4");
assert.equal(params(itemHref("listening", "bank-cr", 7, 12), "listening").taskEnd, "12");
assert.deepEqual(params(itemHref("writing", 'b"a&nk', 0, 9), "writing"),
  { id: 'b"a&nk', mode: "practice", task: "0", taskEnd: "9" });

const card = { type: "academic", paperId: "bank-rap", code: "R-RAP1", sort: 3, task: 2, end: 2, n: 5, title: "Tigers", zh: "老虎" };
const row = { type: "conversation", paperId: "bank-lcn", code: "L-CV1", task: 0, end: 2, n: 6,
  cells: [{ task: 0, end: 0, label: "C01" }, { task: 1, end: 1, label: "C02" }, { task: 2, end: 2, label: "C03" }] };
const meta = { type: "academic", en: "Academic Passage", head: "Read an Academic Passage", zh: "学术文章", idx: "set" };
const dailyMeta = { type: "daily_life", en: "Read in Daily Life", zh: "生活阅读", idx: "set", count: 1 };
const rowMeta = { type: "conversation", en: "Conversation", zh: "对话", idx: "set", prog: 1 };
const speakingMeta = LIB.speaking[0];

// 进度：按 task..end 全算才算已完成，跨界不串科
assert.equal(doneInSpan("reading", card.paperId, card.task, card.end, {}), 0);
assert.equal(libStateOf("reading", card, {}).cls, "todo");
const one = {};
one["reading|bank-rap|2"] = { at: 1 };
assert.equal(libStateOf("reading", Object.assign({}, card, { end: 4 }), one).cls, "mid");
assert.equal(libStateOf("reading", card, one).cls, "done");
assert.equal(libStateOf("listening", card, one).cls, "todo", "same task number, other skill");

// 卡面照它：序号 + 标题 + 状态；阅读不显题数也不显中文行
const c0 = cardHTML("reading", meta, card, 0, {});
assert.match(c0, /hit-lib-card is-todo/);
assert.ok(c0.includes("未开始") && c0.includes("<span class=\"hit-lib-idx\">Set 3</span>"), "idx 取数据里的编号，不是渲染位次");
assert.doesNotMatch(c0, /hit-lib-n|hit-lib-sub|题|老虎/, "阅读卡只英文标题，无题数无中文行");
assert.ok(c0.includes('href="reading.html?id=bank-rap&mode=practice&task=2"'), "card link");
assert.equal(cardHTML("reading", meta, card, 41, {}).includes("Set 3"), true, "filtered position must not renumber");
assert.ok(cardHTML("reading", dailyMeta, Object.assign({}, card, { n: 2 }), 0, {}).includes('<span class="hit-lib-n" lang="en">2 questions</span>'));
assert.ok(cardHTML("reading", dailyMeta, Object.assign({}, card, { n: 1 }), 0, {}).includes("1 question<"));
const s0 = cardHTML("speaking", speakingMeta, { type: "repeat", paperId: "bank-lr", code: "S-LRP7", sort: 7, task: 0, end: 6, n: 7, title: "Gym", zh: "听后跟读" }, 0, {});
assert.ok(s0.includes('<span class="hit-lib-idx">#7</span>') && s0.includes('lang="en">Gym</h3>') && s0.includes('<p class="hit-lib-sub">听后跟读</p>'), "口语 #N + 英文标题 + 第三行题型中文名");
assert.ok(cardHTML("speaking", speakingMeta, { type: "repeat", paperId: "bank-lr", sort: 7, task: 0, end: 0, n: 1, title: "" }, 0, {}).includes("Listen and Repeat"), "缺标题兜底用题型英文名");

const r0 = rowHTML("listening", rowMeta, row, 3, one);
assert.match(r0, /hit-lib-row is-todo/);
assert.ok(r0.includes("完成 0/3") && r0.includes("Set 4"));
assert.doesNotMatch(r0, /hit-lib-title/, "行式不显标题");
assert.equal((r0.match(/hit-lib-num\b/g) || []).length, 3, "one cell per question");
assert.ok(r0.includes('class="hit-lib-start"') && r0.includes(">开始做题</a>"), "整套入口在套题行右侧");
assert.ok(r0.includes('href="listening.html?id=bank-lcn&mode=practice&task=0&taskEnd=2"'), "开始做题覆盖 task..end，不是单题");
const rDone = rowHTML("listening", rowMeta, row, 0, {
  "listening|bank-lcn|0": { at: 1 }, "listening|bank-lcn|1": { at: 1 }, "listening|bank-lcn|2": { at: 1 } });
assert.match(rDone, /hit-lib-row is-done/);
assert.ok(rDone.includes("完成 3/3"));
// 写作组句行显状态而不是完成数（照它）
const bsMeta = { type: "sentence", en: "Build a Sentence", zh: "句子构建", idx: "set" };
assert.ok(rowHTML("writing", bsMeta, { type: "sentence", paperId: "bank-bs", sort: 1, task: 0, end: 1,
  cells: [{ task: 0, end: 0, label: "1" }, { task: 1, end: 1, label: "2" }] }, 0, one).includes("未开始"));

// 筛选：todo 去掉已完成；高频按钮只在该题型真有打标时出现；版式由数据定（cells → 行式）
libView.filter = "all";
const all = panelHTML("reading", meta, [card, Object.assign({}, card, { code: "R-RAP4", sort: 4, task: 3, end: 3 })], {});
assert.match(all, /hit-lib-grid/, "cards without cells");
assert.ok(all.includes('<h2 lang="en">Read an Academic Passage</h2>'), "面板标题用它的 head 文案");
assert.doesNotMatch(all, /组 · 共|已筛出|高频/, "没有统计行，也没打标时不给高频按钮");
assert.match(panelHTML("listening", rowMeta, [row], {}), /hit-lib-rows/, "rows with cells");
assert.match(panelHTML("reading", meta, [Object.assign({}, card, { hot: 2 })], {}), /高频/);
libView.filter = "hot";
assert.match(panelHTML("reading", meta, [card], one), /这个筛选下没有题目/);
libView.filter = "todo";
assert.equal(panelHTML("reading", meta, [Object.assign({}, card, { end: 2 })], one).includes("is-todo"), false, "todo 隐藏已完成");
libView.filter = "all";

// 搜索：跨该科目全部题型，英文标题 / 中文标题 / 题号都能命中，且与筛选叠加
cat.reading = [card, Object.assign({}, card, { code: "R-RAP4", sort: 4, task: 3, end: 3, title: "好莱坞黄金时代" }),
  { type: "complete_words", paperId: "bank-cw", code: "R-CW9", sort: 9, task: 40, end: 41, n: 2, title: "Career Fair" }];
cat.listening = [row];
const sEn = libSearchHTML("reading", "tigers", {});
assert.match(sEn, /hit-lib-searchtype/, "命中结果按题型分节");
assert.equal((sEn.match(/hit-lib-card/g) || []).length, 1, "只渲染命中的那组");
assert.ok(sEn.includes("命中 1 组") && sEn.includes('href="reading.html?id=bank-rap&mode=practice&task=2"'), "英文标题命中");
assert.doesNotMatch(sEn, /高频|组 · 共/, "搜索头不给统计行，也没打标时不给高频");
assert.ok(libSearchHTML("reading", "好莱坞", {}).includes("Set 4"), "中文标题也命中，序号仍取目录 sort");
assert.ok(libSearchHTML("reading", "r-cw9", {}).includes("Career Fair"), "题号也命中");
const sRow = libSearchHTML("listening", "l-cv1", {});
assert.match(sRow, /hit-lib-rows/, "行式题型命中后仍是行式");
assert.ok(sRow.includes("C02"), "题号格渲染");
libView.filter = "todo";
const sDone = libSearchHTML("reading", "r-rap1", one);
assert.ok(sDone.includes("命中 0 组") && sDone.includes("data-clear"), "未做筛选叠在搜索上，空结果给清空按钮");
libView.filter = "all";
const sNone = libSearchHTML("reading", "  <b>zz ", {});
assert.ok(sNone.includes("题库里没有「&lt;b&gt;zz」") && sNone.includes("搜索「&lt;b&gt;zz」"), "关键词回显也转义");
assert.doesNotMatch(sNone, /「<b>/, "关键词里的标签不会漏成真 DOM");
cat.reading = []; cat.listening = [];

// XSS：标题、中文行、cells 标签、高频火苗全部转义
const hostile = { type: "x", paperId: 'p"><svg>', task: 0, end: 0, n: 1, title: '<img src=x onerror="boom">&', hot: 1 };
const hostileCard = Object.assign({}, hostile, { zh: '<b>中</b>' });
const html = cardHTML("reading", { type: "x", en: '<i>E</i>', zh: '<b>中</b>', idx: "set" }, hostile, 0, {}) +
  cardHTML("speaking", speakingMeta, hostileCard, 0, {}) +
  rowHTML("reading", { type: "x", en: "x", zh: '<b>中</b>', idx: "set" },
    { type: "x", paperId: "ok", task: 0, end: 0, n: 1, title: "<script>bad</script>", cells: [{ task: 0, end: 0, label: '"><svg>' }] }, 0, {});
assert.ok(html.includes("&lt;img src=x onerror=&quot;boom&quot;&gt;&amp;"));
assert.ok(html.includes("<p class=\"hit-lib-sub\">&lt;b&gt;中&lt;/b&gt;</p>"), "中文行也转义");
assert.ok(html.includes('title="&quot;&gt;&lt;svg&gt;"'));
assert.doesNotMatch(html, /<(?:img|svg|b|i|script)>/);
assert.ok(html.includes('role="img" title="高频题">🔥</span>'), "hot chip 一行一火");
assert.doesNotMatch(html, /开始做题/, "只有跨越多题的套才给整套入口");
assert.ok(cardHTML("reading", meta, Object.assign({}, hostile, { hot: 3 }), 0, {}).includes('title="超高频题">🔥🔥</span>'), "两级高频");

// 一次面板只解析一遍进度表
storage["yysd:toefl-item-state"] = JSON.stringify(Object.fromEntries(
  Array.from({ length: 1000 }, (_, i) => ["reading|bank-x|" + i, { at: 1 }])));
const catalog = Array.from({ length: 60 }, (_, i) => ({ type: "academic", paperId: "bank-x", code: "X" + i, task: i, end: i, n: 1, title: "X" + i }));
reads = 0;
panelHTML("reading", meta, catalog, hit.doneMap());
assert.equal(reads, 1, "one completion-record parse per paint");

// 四科题型表与目录里的 type 必须对得上，否则 segmented 点了是空的
const catDir = path.join(ROOT, "app/library/toefl");
Object.keys(LIB).forEach(skill => {
  const groups = JSON.parse(fs.readFileSync(path.join(catDir, "bank-catalog-" + skill + ".json"), "utf8")).groups;
  const declared = LIB[skill].map(m => m.type);
  const actual = Array.from(new Set(groups.map(g => g.type))).sort();
  assert.equal(declared.slice().sort().join(","), actual.join(","), skill + " 题型表 = 目录 type");
  declared.forEach(t => assert.ok(groups.some(g => g.type === t), skill + "/" + t + " 有题"));
  if (skill !== "listening") groups.forEach(g => {
    assert.ok(g.sort > 0, skill + "/" + g.type + " 有序号，卡面不能靠渲染位次");
    assert.ok(!g.cells || g.cells.length > 1, skill + "/" + g.type + " 行式必是多题组");
    if (!g.cells) assert.ok(g.title && g.title !== LIB[skill].find(m => m.type === g.type).en, skill + "/" + g.type + " 卡面有真标题（不是题型名）");
    // 只有画第三行的题型，目录 zh 才是题型名；阅读/听力的 zh 是文章中文标题，不参与比对
    if (g.zh && LIB[skill].find(m => m.type === g.type).sub) assert.equal(g.zh, LIB[skill].find(m => m.type === g.type).zh, skill + "/" + g.type + " 卡面中文行 = segmented 标签，同一屏不能两个名字");
  });
});
["practice.html", "home.html", "profile.html", "review.html", "free.html"].forEach(function (name) {
  var html = fs.readFileSync(path.join(ROOT, "app", name), "utf8");
  assert.match(html, /toefl-lab\.js\?v=20261027exam2/, name + " 与考场共用同一份 lab");
});
var exam = fs.readFileSync(path.join(ROOT, "toefl-listening.html"), "utf8");
assert.match(exam, /toefl-lab\.js\?v=20261027exam2/, "听力考场 lab 版本");
assert.match(exam, /armQuestionClock/, "听力考场是现在的新托福系统");
console.log("ok hit-lib-check: links/span-state/filters/search/layout/escaping/one-parse; 4 skills match bank-catalog");
