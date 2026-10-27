/* 题库组卷：练习回列表，模考按题块连做 */
(function (w) {
  "use strict";
  var KEY = "yysd:tiku-run";
  var PAGES = { reading: "reading.html", listening: "listening.html", writing: "writing.html", speaking: "speaking.html" };

  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function save(run) {
    sessionStorage.setItem(KEY, JSON.stringify(run));
  }
  function examRoot() {
    return (typeof location !== "undefined" && location.pathname.indexOf("/app/") >= 0) ? "../" : "";
  }
  /* 考场页在根域，题块入口页只在 app 下：离开 app 域做题块链接要带 app/ 前缀，否则 404 */
  function appPrefix() {
    if (typeof location === "undefined") return "";
    var host = location.hostname || "";
    var path = location.pathname || "";
    return host.indexOf("app.") === 0 || path.indexOf("/app/") >= 0 ? "" : "app/";
  }
  function hrefOf(block, mode, extra) {
    if (block.source === "bank" && block.paperId) {
      var page = PAGES[block.skill] || "reading.html";
      var u = appPrefix() + page + "?id=" + encodeURIComponent(block.paperId) +
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
    return appPrefix() + page + "?" + q;
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
      var n = Number(mins[s]);
      if (n > 0) run.skillEnds[s] = now + n * 60000;
    });
    save(run);
    return run;
  }
  function leftSec(skill) {
    var run = load();
    if (!run || run.skillEnds[skill] == null) return null;
    var now = run.clockHold != null ? run.clockHold : Date.now();
    return Math.max(0, Math.ceil((run.skillEnds[skill] - now) / 1000));
  }
  /* 官方 Pause 冻墙钟：记下暂停时刻，leftSec 用它当 now；解开时把耗掉的毫秒加回所有科 */
  function holdClock(on) {
    var run = load();
    if (!run) return;
    if (on) {
      if (run.clockHold == null) {
        run.clockHold = Date.now();
        save(run);
      }
      return;
    }
    if (run.clockHold == null) return;
    var dt = Date.now() - run.clockHold;
    Object.keys(run.skillEnds || {}).forEach(function (s) {
      run.skillEnds[s] += dt;
    });
    delete run.clockHold;
    save(run);
  }
  /* 模考钟：同科剩余秒，否则官方整科秒。卷面 timeSec 不参与（日期卷各写各的，不合官方） */
  function clockSec(skill) {
    var left = leftSec(skill);
    if (left != null) return left;
    var min = { reading: 30, listening: 29, writing: 23, speaking: 8 }[skill];
    return min ? min * 60 : 0;
  }
  function href(i, run) {
    run = run || load();
    if (!run || !run.blocks[i]) return "practice.html";
    var extra = "&bank=" + encodeURIComponent(run.id) + "&bi=" + i;
    if (run.preview) extra += "&preview=1";
    return hrefOf(run.blocks[i], run.kind === "practice" ? "practice" : "mock", extra);
  }
  function doneHref(run) {
    var u = appPrefix() + "bank.html?id=" + encodeURIComponent(run.id) + "&done=1";
    if (run.preview) u += "&preview=1";
    return u;
  }
  /* 考场页在根域只有 YYSD_AUTH.pushScoreRecord，YYSD_APP.pushScore 只在 app 壳页存在 */
  function pushBlock(run, rec, skill) {
    var push = (w.YYSD_APP && w.YYSD_APP.pushScore) || (w.YYSD_AUTH && w.YYSD_AUTH.pushScoreRecord);
    var block = run.blocks[run.i];
    if (!push || run.preview || !rec || rec.total == null || !block) return;
    var wrong = rec.wrong || [];
    if (Number(rec.total) > 0 && !(Number(rec.score) > 0) &&
        !wrong.some(function (x) {
          var ua = String(x.ua == null ? "" : x.ua).trim();
          return ua && ua !== "（未作答）";
        })) return;
    var title = run.title;
    var ts = [];
    wrong.forEach(function (x) { if (x.t && ts.indexOf(x.t) < 0) ts.push(x.t); });
    if (ts.length === 1) title = ts[0];
    push({
      id: "tiku:" + run.id + ":" + (block.id || skill),
      title: title,
      zone: "toefl",
      kind: run.kind,
      subject: skill,
      score: rec.score,
      total: rec.total,
      wrong: wrong,
      attemptAt: new Date().toISOString(),
      date: new Date().toISOString()
    });
  }
  function nextIndex(run) {
    var i = run.spanEnd != null ? run.spanEnd + 1 : run.i + 1;
    if (run.only) while (i < run.blocks.length && run.blocks[i].skill !== run.only) i += 1;
    return i;
  }
  // 当前科还没做完的题块（听力一整科拼成一张卷，避免每题重进说明页）
  function skillSpan(expect) {
    var run = load();
    if (!run || !run.blocks.length) return null;
    if (expect && run.id !== expect) return null;
    if (run.kind === "practice") return null;
    var start = run.i;
    var skill = run.blocks[start] && run.blocks[start].skill;
    if (!skill) return null;
    var end = start;
    while (end + 1 < run.blocks.length && run.blocks[end + 1].skill === skill) end += 1;
    return { skill: skill, start: start, end: end, blocks: run.blocks.slice(start, end + 1) };
  }
  function stitchPaper(blocks, byId, title) {
    var tasks = [];
    var qn = 1;
    var mod = 1;
    var leftCR = false;
    (blocks || []).forEach(function (b) {
      var p = byId[b.paperId];
      if (!p) return;
      var a = Number(b.task);
      var z = b.end == null || b.end === "" ? a : Number(b.end);
      (p.tasks || []).forEach(function (t, i) {
        if (i < a || i > z) return;
        var copy = {};
        Object.keys(t).forEach(function (k) { copy[k] = t[k]; });
        if (b.module === 1 || b.module === 2) {
          copy.module = b.module;
        } else if (copy.type === "sentence" || copy.type === "repeat") {
          copy.module = 1;
        } else if (copy.type === "email" || copy.type === "interview") {
          copy.module = 2;
        } else if (copy.type === "discussion") {
          copy.module = 3;
        } else {
          if (copy.type === "choose_response" && leftCR) mod = 2;
          if (copy.type && copy.type !== "choose_response") leftCR = true;
          copy.module = mod;
        }
        copy.questions = (t.questions || []).map(function (q) {
          var nq = {};
          Object.keys(q).forEach(function (k) { nq[k] = q[k]; });
          nq.id = qn;
          qn += 1;
          return nq;
        });
        if (t.type === "complete_words" && t.passage) {
          copy.passage = t.passage.map(function (x) {
            if (!x || x.id == null) return x;
            var n = {};
            Object.keys(x).forEach(function (k) { n[k] = x[k]; });
            n.id = qn;
            qn += 1;
            return n;
          });
        } else if (!(t.questions || []).length && t.id != null) {
          copy.id = qn;
          qn += 1;
        }
        tasks.push(copy);
      });
    });
    if (!tasks.length) return null;
    var last1 = 0;
    tasks.forEach(function (t) {
      if (t.module !== 1) return;
      if (t.type === "complete_words") {
        var blanks = 0;
        (t.passage || []).forEach(function (x) { if (x && x.id != null) blanks += 1; });
        last1 += blanks || (t.questions || []).length || 1;
        return;
      }
      last1 += (t.questions || []).length || 1;
    });
    var mods = [{ n: 1, from: 1, to: last1 || 1 }];
    if (tasks.some(function (t) { return t.module === 2; })) {
      mods.push({ n: 2, from: last1 + 1, to: qn - 1 });
    }
    return { id: "span", title: title || "", skill: (blocks[0] && blocks[0].skill) || "", tasks: tasks, modules: mods };
  }
  function fillAnswers(blocks, byId, uaMapFor) {
    var answers = {};
    var qn = 1;
    (blocks || []).forEach(function (b) {
      var p = byId[b.paperId];
      if (!p) return;
      var a = Number(b.task);
      var z = b.end == null || b.end === "" ? a : Number(b.end);
      (p.tasks || []).forEach(function (t, i) {
        if (i < a || i > z) return;
        var raw = (uaMapFor && uaMapFor(b, i)) || {};
        var qs = t.questions || [];
        if (qs.length) {
          qs.forEach(function (q) {
            if (raw[q.id] != null && raw[q.id] !== "") answers[qn] = raw[q.id];
            qn += 1;
          });
        } else if (t.type === "complete_words") {
          (t.passage || []).forEach(function (x) {
            if (!x || x.id == null) return;
            if (raw[x.id] != null && raw[x.id] !== "") answers[qn] = raw[x.id];
            qn += 1;
          });
        } else if (t.id != null) {
          if (raw[t.id] != null && raw[t.id] !== "") answers[qn] = raw[t.id];
          qn += 1;
        } else {
          Object.keys(raw).forEach(function (k) { answers[k] = raw[k]; });
        }
      });
    });
    return answers;
  }
  function stitch(expect, loadPaper) {
    var span = skillSpan(expect);
    var run = load();
    if (!span || !loadPaper) return Promise.resolve(null);
    var ids = [];
    span.blocks.forEach(function (b) {
      if (b.paperId && ids.indexOf(b.paperId) < 0) ids.push(b.paperId);
    });
    if (!ids.length) return Promise.resolve(null);
    return Promise.all(ids.map(function (id) {
      return Promise.resolve(loadPaper(id)).then(function (p) { return [id, p]; });
    })).then(function (pairs) {
      var byId = {};
      pairs.forEach(function (x) { byId[x[0]] = x[1]; });
      var paper = stitchPaper(span.blocks, byId, run && run.title);
      if (!paper) return null;
      paper.id = (run && run.id) || paper.id;
      run.spanEnd = span.end;
      save(run);
      return paper;
    });
  }
  /* 整场结束才记完成。全科记这卷里的每一科，只考一科只记这一科。做到一半不记。 */
  function reportDone(run) {
    if (!run || run.preview) return;
    var ok = { reading: 1, listening: 1, speaking: 1, writing: 1 };
    var skills = [];
    if (run.only) skills = [run.only];
    else (run.blocks || []).forEach(function (b) {
      if (b.skill && skills.indexOf(b.skill) < 0) skills.push(b.skill);
    });
    skills = skills.filter(function (s) { return ok[s]; });
    if (!skills.length) return;
    var A = (w.YYSD_APP && w.YYSD_APP.api && w.YYSD_APP) ||
      (w.YYSD_AUTH && w.YYSD_AUTH.api && w.YYSD_AUTH);
    if (!A) return;
    A.api("/api/toefl/exam-done", { method: "POST", body: { packageId: run.id, skills: skills } }).catch(function () {});
  }
  // 交卷前先看下一块：同科连做、换科休息屏、整场结束才出成绩单
  function peek(expect) {
    var run = load();
    if (!run || !run.blocks.length) return null;
    if (expect && run.id !== expect) return null;
    if (run.kind === "practice") return { end: true };
    var i = nextIndex(run);
    if (i >= run.blocks.length) return { end: true };
    return { end: false, i: i, block: run.blocks[i] };
  }
  function advance(skill, rec, expect) {
    var run = load();
    if (!run || !run.blocks.length) return false;
    // expect = 当前 URL 的 bank 参数：只有这张组卷的考试才许被推进，日期卷全真模考不受影响
    if (expect && run.id !== expect) return false;
    if (run.kind === "practice") {
      pushBlock(run, rec, skill);
      return false;
    }
    pushBlock(run, rec, skill);
    run.i = nextIndex(run);
    delete run.spanEnd;
    save(run);
    if (run.i >= run.blocks.length) {
      reportDone(run);
      sessionStorage.removeItem(KEY);
      // 最后一块不回列表：调用方进成绩单+解析
      return false;
    }
    location.replace(href(run.i, run));
    return true;
  }
  function expireSkill() {
    var run = load();
    if (!run || run.kind === "practice") return false;
    var block = run.blocks[run.i];
    if (!block) return false;
    var next = run.i + 1;
    while (next < run.blocks.length && run.blocks[next].skill === block.skill) next++;
    run.i = next;
    save(run);
    if (run.i >= run.blocks.length) {
      reportDone(run);
      sessionStorage.removeItem(KEY);
      // 最后一块不回列表：调用方进成绩单+解析
      return false;
    }
    location.replace(href(run.i, run));
    return true;
  }
  function armTimer() {
    var run = load();
    if (!run || run.kind === "practice") return;
    var block = run.blocks[run.i];
    if (!block || run.skillEnds[block.skill] == null) return;
    var left = leftSec(block.skill);
    if (left == null) return;
    if (left <= 0) { expireSkill(); return; }
    setTimeout(armTimer, 1000);
  }
  function paperNames(blocks, only) {
    var seen = {};
    var out = [];
    (blocks || []).forEach(function (b) {
      if (only && b.skill !== only) return;
      if (!b.paperId || !b.skill) return;
      var n = b.paperId + "-" + b.skill + ".json";
      if (!seen[n]) { seen[n] = 1; out.push(n); }
    });
    return out;
  }
  function isSprint(id) {
    return /^hq-sprint-/.test(String(id || ""));
  }
  function sprintReadSec(n) {
    return Number(n) === 2 ? 540 : 1230;
  }
  function warm(paperFn, blocks, only) {
    if (!paperFn) return Promise.resolve();
    return Promise.all(paperNames(blocks, only).map(function (n) { return paperFn(n); }));
  }
  w.YYSD_TIKU_RUN = {
    load: load, start: start, href: href, hrefOf: hrefOf, peek: peek, advance: advance,
    skillSpan: skillSpan, stitchPaper: stitchPaper, stitch: stitch, fillAnswers: fillAnswers,
    paperNames: paperNames, warm: warm, isSprint: isSprint, sprintReadSec: sprintReadSec,
    leftSec: leftSec, clockSec: clockSec, holdClock: holdClock, expireSkill: expireSkill, armTimer: armTimer
  };
})(window);
