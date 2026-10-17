#!/usr/bin/env node
"use strict";
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
const window = { localStorage: {
  getItem: key => { reads++; return storage[key] || null; },
  setItem: (key, value) => { storage[key] = String(value); }
} };
vm.runInNewContext(source.replace(exportMarker,
  "  w.__hitSwiss = { filterLabItems: filterLabItems, rowHTML: rowHTML, groupsFromPapers: groupsFromPapers };\n" + exportMarker),
  { window }, { filename: sourcePath, timeout: 1000 });
const { filterLabItems, rowHTML, groupsFromPapers } = window.__hitSwiss;
const hit = window.YYSD_HIT;
const keys = {
  reading: ["complete_words", "daily_life", "academic"],
  listening: ["choose_response", "conversation", "announcement", "lecture"],
  speaking: ["repeat", "interview"],
  writing: ["sentence", "email", "discussion"]
};
const papersBySkill = {};
const groupsBySkill = {};
function checkLink(skill, item) {
  const html = rowHTML(skill, skill + ".html", item);
  const href = html.match(/ href="([^"]+)"/);
  assert.ok(href, "row link exists");
  const url = new URL(href[1], "https://example.test/app/");
  assert.equal(url.pathname, "/app/" + skill + ".html");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    set: String(item.set || 1), task: String(item.task == null ? 0 : Number(item.task)),
    mode: "practice", end: String(item.end == null ? (item.task == null ? 0 : Number(item.task)) : Number(item.end))
  });
  return html;
}
let paperCount = 0;
Object.entries(keys).forEach(([skill, types]) => {
  const papers = Array.from({ length: 10 }, (_, i) => JSON.parse(fs.readFileSync(
    path.join(ROOT, "app/library/toefl/set-" + (i + 1) + "-" + skill + ".json"), "utf8")));
  paperCount += papers.length;
  const groups = groupsFromPapers(skill, papers);
  papersBySkill[skill] = papers;
  groupsBySkill[skill] = groups;
  assert.deepEqual(Array.from(groups, g => g.key), types, skill + " real groups");
  groups.forEach(group => {
    const matching = papers.filter(p => p.tasks.some(t => t.type === group.key));
    assert.equal(group.items.length, matching.length, skill + "/" + group.key);
    group.items.forEach((item, i) => {
      const paper = matching[i];
      const indices = paper.tasks.flatMap((t, ti) => t.type === group.key ? [ti] : []);
      assert.equal(item.set, Number(paper.set));
      assert.equal(item.task, indices[0]);
      assert.equal(item.end, indices[indices.length - 1]);
      const grouped = ["choose_response", "conversation", "announcement", "sentence"].includes(group.key);
      assert.equal(item.title, grouped ? "Set " + item.set : (paper.tasks[item.task].title || group.en));
      assert.equal(item.titleZh, grouped ? "第 " + item.set + " 套" : (paper.tasks[item.task].titleZh || group.zh));
      checkLink(skill, item);
    });
  });
  assert.equal(groupsFromPapers(skill, [null, {}, { tasks: [] }]).length, 0);
});
assert.equal(groupsFromPapers("unknown", papersBySkill.reading).length, 0);
const repeat = groupsBySkill.speaking.find(g => g.key === "repeat");
const interview = groupsBySkill.speaking.find(g => g.key === "interview");
assert.deepEqual([repeat.items[0].task, repeat.items[0].end], [0, 6]);
assert.deepEqual([interview.items[0].task, interview.items[0].end], [7, 10]);
const items = Array.from(repeat.items.slice(0, 3), it => ({ ...it, groupZh: repeat.zh }));
hit.markDone("speaking", items[1].task + 1, { set: items[1].set });
for (let task = items[2].task; task <= items[2].end; task++) hit.markDone("speaking", task, { set: items[2].set });
// Records outside the span or in another skill must not change its status.
hit.markDone("speaking", items[0].end + 1, { set: items[0].set });
hit.markDone("reading", items[0].task, { set: items[0].set });
Object.entries({ all: items, todo: [items[0]], progress: [items[1]], done: [items[2]] }).forEach(([status, expected]) => {
  assert.deepEqual(Array.from(filterLabItems(items, "speaking", status, "")), expected, status);
});
const first = items[0];
[first.title.toUpperCase(), "  " + first.title.toLowerCase() + "  ", first.titleZh, repeat.zh].forEach(query => {
  assert.deepEqual(Array.from(filterLabItems([first], "speaking", "todo", query)), [first], query);
});
assert.equal(filterLabItems(items, "speaking", "all", "不存在的题目 / no such title").length, 0);
assert.equal(filterLabItems([first], "speaking", "done", first.titleZh).length, 0);
const iv = { ...interview.items[0], groupZh: interview.zh };
assert.deepEqual(Array.from(filterLabItems([iv], "speaking", "progress", " TIME MANAGEMENT ")), [iv]);
assert.deepEqual(Array.from(filterLabItems([iv], "speaking", "progress", "模拟面试")), [iv]);
["未开始", "进行中 1/7", "已完成"].forEach((status, i) => {
  assert.ok(checkLink("speaking", items[i]).includes('<span class="hit-set-st">' + status + '</span>'));
});
assert.match(rowHTML("speaking", "speaking.html", items[1]), /hit-set-row is-mid/);
assert.match(rowHTML("speaking", "speaking.html", items[2]), /hit-set-row is-done/);
assert.ok(checkLink("speaking", iv).includes("进行中 1/4"));
for (let task = iv.task; task <= iv.end; task++) hit.markDone("speaking", task, { set: iv.set });
assert.deepEqual(Array.from(filterLabItems([iv], "speaking", "done", "时间管理")), [iv]);
const single = groupsBySkill.reading[0].items[1];
assert.deepEqual(Array.from(filterLabItems([single], "reading", "todo", "")), [single]);
hit.markDone("reading", single.task, { set: single.set });
assert.equal(filterLabItems([single], "reading", "progress", "").length, 0);
assert.deepEqual(Array.from(filterLabItems([single], "reading", "done", "")), [single]);
const hostile = {
  set: '\"><svg>&', task: 0, end: 0, title: '<img src=x onerror="boom">&',
  titleZh: '中文"<&>', groupZh: '<svg>"&', meta: '<b>&"'
};
const escaped = checkLink("reading", hostile);
assert.ok(escaped.includes('<h4>&lt;img src=x onerror=&quot;boom&quot;&gt;&amp;</h4>'));
assert.ok(escaped.includes('<p>中文&quot;&lt;&amp;&gt; / &lt;svg&gt;&quot;&amp; / &lt;b&gt;&amp;&quot;</p>'));
assert.ok(escaped.includes('<span class="hit-set-num">&quot;&gt;&lt;svg&gt;&amp;</span>'));
assert.doesNotMatch(escaped, /<(?:img|svg|b)>?/);
assert.ok(checkLink("reading", { task: 0 }).includes('<h4>第 1 套</h4><p>1 题</p>'));
assert.equal(hit.examHref("reading.html", { task: 0 }), "reading.html?set=1&task=0&mode=practice");

// Execute the actual stock-filter block, not a second implementation or a DOM mock.
const stockStart = source.indexOf("        var filtered = papers.slice();");
const stockEnd = source.indexOf("        var live = groupsFromPapers(skill, filtered);", stockStart);
assert.ok(stockStart >= 0 && stockEnd > stockStart, "stock filter source boundaries");
const stockFilter = vm.runInNewContext("(function (papers, stockSets) {\n" +
  source.slice(stockStart, stockEnd) + "\nreturn filtered;\n})", {}, { timeout: 1000 });
Object.keys(keys).forEach(skill => {
  const papers = papersBySkill[skill];
  const filtered = stockFilter(papers, [2, 5]);
  assert.deepEqual(Array.from(filtered, p => p ? Number(p.set) : null), [null, 2, null, null, 5, null, null, null, null, null]);
  groupsFromPapers(skill, filtered).forEach(g => assert.deepEqual(Array.from(g.items, it => it.set), [2, 5]));
  [null, []].forEach(stock => assert.deepEqual(Array.from(stockFilter(papers, stock)), papers));
  assert.equal(groupsFromPapers(skill, stockFilter(papers, [99])).length, 0);
});
const reordered = [papersBySkill.speaking[4], null, papersBySkill.speaking[1]];
assert.deepEqual(Array.from(stockFilter(reordered, [2]), p => p ? Number(p.set) : null), [null, null, 2]);
const noSet = { ...papersBySkill.speaking[1] };
delete noSet.set;
const indexed = stockFilter([null, noSet], [2]);
assert.equal(indexed[1], noSet, "stock fallback preserves original paper index");
groupsFromPapers("speaking", indexed).forEach(g => assert.equal(g.items[0].set, 2));

// ponytail: source-only focus invariants; actual async focus/keyboard checks belong in a browser.
const paintStart = source.indexOf("    function paint() {");
const paintEnd = source.indexOf('    host.addEventListener("click"', paintStart);
assert.ok(paintStart >= 0 && paintEnd > paintStart);
const paint = source.slice(paintStart, paintEnd);
assert.match(source, /var paintedGroups = null;/);
const rebuild = paint.match(/if \(paintedGroups !== groups\) \{([\s\S]*?)\n      \}/);
assert.ok(rebuild, "tabs rebuild only when groups identity changes");
assert.equal((paint.match(/tabHost\.innerHTML\s*=/g) || []).length, 1);
assert.match(rebuild[1], /tabHost\.innerHTML = tabs\.map/);
assert.match(rebuild[1], /var focused = tabHost\.contains\(document\.activeElement\) \? document\.activeElement\.getAttribute\("data-tab"\) : null;/);
assert.match(rebuild[1], /paintedGroups = groups;/);
assert.ok(rebuild[1].includes(`if (focused) (tabHost.querySelector('[data-tab="' + focused + '"]') || tabHost.querySelector("button")).focus();`));
assert.match(paint, /\}\s*tabHost\.querySelectorAll\("\[data-tab\]"\)\.forEach\(function \(button\) \{/);
assert.match(paint, /var active = button\.getAttribute\("data-tab"\) === tab;/);
assert.match(paint, /button\.classList\.toggle\("is-on", active\);/);
assert.match(paint, /button\.setAttribute\("aria-pressed", String\(active\)\);/);
assert.match(source, /A\.api\("\/api\/tiku\/catalog"\)\.then\(function \(d\) \{\s*apply\(d\.catalog && d\.catalog\.stock && d\.catalog\.stock\.sets\);/);
assert.match(source, /var live = groupsFromPapers\(skill, filtered\);[\s\S]*?groups = live;[\s\S]*?\n        paint\(\);/);
storage["yysd:app-toefl-done"] = JSON.stringify(Object.fromEntries(
  Array.from({ length: 1000 }, (_, i) => ["reading|benchmark-" + i + "|0", { at: 1 }])));
reads = 0;
const snapshot = hit.doneMap();
const allItems = groupsBySkill.speaking.flatMap(g => Array.from(g.items, it => ({ ...it, groupZh: g.zh })));
const filteredItems = filterLabItems(allItems, "speaking", "all", "", snapshot);
filteredItems.forEach(it => rowHTML("speaking", "speaking.html", it, snapshot));
assert.equal(reads, 1, "one completion-record parse per list paint");
reads = 0;
filterLabItems(allItems, "speaking", "all", "");
assert.equal(reads, 1, "filter alone reads once, not per task");
console.log("ok hit-swiss-check: status/search/escaping/links; " + paperCount + " real papers; stock filtering; focus invariants source-only; one snapshot with 1000 records");
