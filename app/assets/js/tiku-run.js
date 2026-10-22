/* 题库组卷：练习回列表，模考按题块连做 */
(function (w) {
  "use strict";
  var KEY = "yysd:tiku-run";
  var PAGES = { reading: "reading.html", listening: "listening.html", writing: "writing.html", speaking: "speaking.html" };

  function readStore(store) {
    if (!store || typeof store.getItem !== "function") return null;
    try { return store.getItem(KEY); } catch (e) { return null; }
  }
  function writeStore(store, raw) {
    if (!store || typeof store.setItem !== "function") return;
    try { store.setItem(KEY, raw); } catch (e) {}
  }
  function dropStore(store) {
    if (!store || typeof store.removeItem !== "function") return;
    try { store.removeItem(KEY); } catch (e) {}
  }
  function load() {
    var raw = readStore(typeof localStorage !== "undefined" ? localStorage : null);
    if (!raw) raw = readStore(typeof sessionStorage !== "undefined" ? sessionStorage : null);
    try { return JSON.parse(raw || "null"); } catch (e) { return null; }
  }
  function save(run) {
    if (run) run.savedAt = Date.now();
    var raw = JSON.stringify(run);
    writeStore(typeof localStorage !== "undefined" ? localStorage : null, raw);
    writeStore(typeof sessionStorage !== "undefined" ? sessionStorage : null, raw);
  }
  function clearRun() {
    dropStore(typeof localStorage !== "undefined" ? localStorage : null);
    dropStore(typeof sessionStorage !== "undefined" ? sessionStorage : null);
  }
  function examRoot() {
    return (typeof location !== "undefined" && location.pathname.indexOf("/app/") >= 0) ? "../" : "";
  }
  function hrefOf(block, mode, extra) {
    if (block.source === "bank" && block.paperId) {
      var page = PAGES[block.skill] || "reading.html";
      var u = page + "?id=" + encodeURIComponent(block.paperId) +
        "&mode=" + encodeURIComponent(mode || "practice") +
        "&task=" + encodeURIComponent(block.task) +
        "&end=" + encodeURIComponent(block.end);
      if (extra) u += extra;
      return u;
    }
    if (block.source === "date" && block.paperId) {
      // ponytail: 日期卷只在官网根有数据；app 播放器读不到，交考场引擎单科页
      var u = examRoot() + "toefl-" + block.skill + ".html?id=" + encodeURIComponent(block.paperId) +
        "&mode=" + encodeURIComponent(mode === "practice" ? "practice" : "mock") +
        "&task=" + encodeURIComponent(block.task) +
        "&taskEnd=" + encodeURIComponent(block.end);
      if (extra) u += extra;
      if (location.pathname.indexOf("/app/") >= 0 && u.indexOf("from=") < 0) u += "&from=app";
      return u;
    }
    var page = PAGES[block.skill] || "reading.html";
    var q = "mode=" + encodeURIComponent(mode || "practice") +
      "&task=" + encodeURIComponent(block.task) +
      "&end=" + encodeURIComponent(block.end);
    q += "&set=" + encodeURIComponent(block.set || 1);
    if (extra) q += extra;
    return page + "?" + q;
  }
  function start(paper) {
    var run = {
      id: paper.id,
      title: paper.title,
      kind: paper.kind,
      blocks: paper.blocks || [],
      i: 0,
      skillEnds: {},
      preview: !!paper.preview
    };
    // 只考一科：从这一科第一个题块开始
    if (paper.only) {
      run.only = paper.only;
      for (var k = 0; k < run.blocks.length; k++) {
        if (run.blocks[k].skill === paper.only) { run.i = k; break; }
      }
    }
    var mins = paper.skillMinutes || {};
    var now = Date.now();
    Object.keys(mins).forEach(function (s) {
      if (mins[s] > 0) run.skillEnds[s] = now + mins[s] * 60000;
    });
    save(run);
    return run;
  }
  function href(i, run) {
    run = run || load();
    if (!run || !run.blocks[i]) return "practice.html";
    var extra = "&bank=" + encodeURIComponent(run.id) + "&bi=" + i;
    if (run.preview) extra += "&preview=1";
    return hrefOf(run.blocks[i], run.kind === "practice" ? "practice" : "mock", extra);
  }
  function doneHref(run) {
    var u = "bank.html?id=" + encodeURIComponent(run.id) + "&done=1";
    if (run.preview) u += "&preview=1";
    return u;
  }
  function advance(skill, rec) {
    var run = load();
    if (!run || !run.blocks.length) return false;
    if (run.kind === "practice") {
      if (w.YYSD_APP && w.YYSD_APP.pushScore && !run.preview && rec && rec.total != null) {
        w.YYSD_APP.pushScore({
          id: "tiku:" + run.id + ":" + (run.blocks[run.i] && run.blocks[run.i].id || skill),
          title: run.title,
          zone: "toefl",
          subject: skill,
          score: rec.score,
          total: rec.total,
          attemptAt: new Date().toISOString(),
          date: new Date().toISOString()
        });
      }
      return false;
    }
    run.i += 1;
    // 只考一科时跳过其它科题块，做完这一科就到终点
    if (run.only) while (run.i < run.blocks.length && run.blocks[run.i].skill !== run.only) run.i += 1;
    save(run);
    if (run.i >= run.blocks.length) {
      clearRun();
      location.replace(doneHref(run));
      return true;
    }
    location.replace(href(run.i, run));
    return true;
  }
  function armTimer() {
    var run = load();
    if (!run || run.kind === "practice") return;
    var block = run.blocks[run.i];
    if (!block || !run.skillEnds[block.skill]) return;
    var left = run.skillEnds[block.skill] - Date.now();
    if (left <= 0) {
      var next = run.i + 1;
      while (next < run.blocks.length && run.blocks[next].skill === block.skill) next++;
      run.i = next;
      save(run);
      if (run.i >= run.blocks.length) {
        clearRun();
        location.replace(doneHref(run));
        return;
      }
      location.replace(href(run.i, run));
      return;
    }
    setTimeout(armTimer, Math.min(left, 1000));
  }
  w.YYSD_TIKU_RUN = { load: load, start: start, href: href, hrefOf: hrefOf, advance: advance, armTimer: armTimer };
})(window);
