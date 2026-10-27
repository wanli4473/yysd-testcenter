/* 新托福交卷同步：马上上传；失败写入队列，下次登录补传。录音只在当场传。 */
(function (w) {
  "use strict";
  var Q_KEY = "yysd:toefl-record-queue";
  var SYNCED_KEY = "yysd:toefl-record-synced";
  var STATE_KEY = "yysd:toefl-item-state";
  var ATT_KEY = "yysd:toefl-attempts";
  var BATCH = 40;
  var PAPER_TYPE = {
    "bank-cw": "complete_words",
    "bank-rdl": "daily_life",
    "bank-rap": "academic",
    "bank-cr": "choose_response",
    "bank-lcn": "conversation",
    "bank-ano": "announcement",
    "bank-at": "lecture",
    "bank-bs": "sentence",
    "bank-we": "email",
    "bank-ad": "discussion",
    "bank-lr": "repeat",
    "bank-iv": "interview"
  };
  var SKILLS = { reading: 1, listening: 1, writing: 1, speaking: 1 };
  var API = (w.location && (w.location.hostname === "localhost" || w.location.hostname === "127.0.0.1"))
    ? ((w.location.protocol || "http:") + "//" + w.location.hostname + ":3000")
    : "https://api.youyisida.com";

  function parse(raw, fallback) {
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function token() {
    try { return localStorage.getItem("yysd:auth:token") || ""; } catch (e) { return ""; }
  }
  function loadQ() {
    var list = parse((w.localStorage && w.localStorage.getItem(Q_KEY)) || "[]", []) || [];
    return Array.isArray(list) ? list : [];
  }
  function saveQ(list) {
    try { w.localStorage.setItem(Q_KEY, JSON.stringify((list || []).slice(-80))); } catch (e) {}
  }
  function qs() {
    try { return new URLSearchParams(w.location.search); } catch (e) { return { get: function () { return ""; } }; }
  }
  function modeOf() { return qs().get("mode") || ""; }
  function paperIdOf() { return qs().get("id") || ""; }
  function isMock() {
    var F = w.YYSD_TOEFL_FULL;
    return !!(F && F.isFull && F.isFull() && modeOf() === "mock");
  }
  function sidOf() {
    var F = w.YYSD_TOEFL_FULL;
    if (F && F.currentSid) {
      var s = F.currentSid();
      if (s) return String(s);
    }
    return String(Date.now());
  }
  function taskOf(paper, no) {
    var Lab = w.YYSD_TOEFL_LAB;
    var tasks = (paper && paper.tasks) || [];
    if (Lab && Lab.findTaskIndex) {
      var i = Lab.findTaskIndex(paper, no);
      return i >= 0 ? { task: tasks[i], index: i } : null;
    }
    for (var j = 0; j < tasks.length; j++) {
      if (tasks[j] && tasks[j].id != null && String(tasks[j].id) === String(no)) return { task: tasks[j], index: j };
    }
    return null;
  }
  function stemOf(task, items) {
    if (task && (task.instruction || task.prompt || task.context || task.titleZh || task.title)) {
      return String(task.instruction || task.prompt || task.context || task.titleZh || task.title || "").slice(0, 800);
    }
    var first = (items || [])[0];
    return first && first.stem ? String(first.stem).slice(0, 800) : "";
  }
  function imageOf(task) {
    if (!task) return "";
    return task.image || task.promptImg || task.photo || task.figure || "";
  }
  function titleOf(paper, paperId, task) {
    var paperTitle = (paper && (paper.titleZh || paper.title)) || paperId || "";
    var t = task && (task.titleZh || task.title || task.set) || "";
    if (paperTitle && t && t !== paperTitle) return paperTitle + " · " + t;
    return t || paperTitle;
  }

  function post(body) {
    if (!token()) return Promise.reject(new Error("未登录"));
    return fetch(API + "/api/toefl/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Slug": "yysd",
        Authorization: "Bearer " + token()
      },
      body: JSON.stringify(body),
      cache: "no-store"
    }).then(function (r) {
      return r.text().then(function (text) {
        var d = {};
        if (text) { try { d = JSON.parse(text); } catch (e) { throw new Error("服务器异常"); } }
        if (!r.ok) throw new Error((d && d.error) || "同步失败");
        return d;
      });
    });
  }

  function enqueue(records) {
    if (!records || !records.length) return;
    var q = loadQ();
    var seen = {};
    q.forEach(function (r) { if (r && r.clientKey) seen[r.clientKey] = 1; });
    records.forEach(function (r) {
      if (!r || !r.clientKey || seen[r.clientKey]) return;
      seen[r.clientKey] = 1;
      q.push(r);
    });
    saveQ(q);
  }

  function loadSynced() {
    return parse((w.localStorage && w.localStorage.getItem(SYNCED_KEY)) || "{}", {}) || {};
  }
  function saveSynced(map) {
    try { w.localStorage.setItem(SYNCED_KEY, JSON.stringify(map || {})); } catch (e) {}
  }
  function markSynced(keys) {
    var map = loadSynced();
    (keys || []).forEach(function (k) { if (k) map[k] = 1; });
    saveSynced(map);
  }
  function paperType(paperId) {
    return PAPER_TYPE[String(paperId || "")] || "";
  }
  function isDatePaper(id) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(id || "")) || /^hq-\d{4}-\d{2}-\d{2}$/.test(String(id || ""));
  }
  function isoAt(at) {
    var n = Number(at);
    if (!n || n < 1) return "";
    try { return new Date(n).toISOString(); } catch (e) { return ""; }
  }
  function recordsFromLocalState(state) {
    var out = [];
    Object.keys(state || {}).forEach(function (k) {
      var p = String(k).split("|");
      if (p.length < 3 || !SKILLS[p[0]]) return;
      var rec = state[k] || {};
      var items = Array.isArray(rec.items) ? rec.items : [];
      var at = Number(rec.at) || 0;
      if (!items.length && !at) return;
      var skill = p[0];
      var paperId = p[1];
      var idx = Number(p[2]);
      if (!isFinite(idx)) idx = 0;
      var kind = isDatePaper(paperId) ? "mock" : "practice";
      var sid = "L" + (at || 0);
      var scored = items.filter(function (x) { return x && (x.ok === true || x.ok === false); });
      var ok = scored.filter(function (x) { return x.ok === true; }).length;
      out.push({
        kind: kind,
        skill: skill,
        paperId: paperId,
        packageId: kind === "mock" ? paperId : "",
        taskType: paperType(paperId),
        taskIndex: idx,
        sid: sid,
        title: paperId + " · " + (idx + 1),
        stem: items[0] && items[0].stem ? String(items[0].stem) : "",
        items: items.map(function (it) {
          it = it || {};
          return {
            no: it.no,
            ok: it.ok === true || it.ok === false ? it.ok : null,
            ua: it.ua == null ? "" : String(it.ua),
            expect: it.expect == null ? "" : String(it.expect),
            stem: it.stem || ""
          };
        }),
        recorded: skill === "speaking" && items.some(function (x) { return x && (x.ua === "recorded" || x.ok); }),
        score: scored.length ? ok : null,
        total: scored.length || null,
        submittedAt: isoAt(at) || new Date().toISOString(),
        clientKey: (kind === "mock"
          ? "mock|" + paperId + "|" + skill + "|" + idx
          : "practice|" + skill + "|" + paperId + "|" + idx) + "|" + sid
      });
    });
    return out;
  }
  function recordsFromAttempts(list) {
    var out = [];
    (list || []).forEach(function (a) {
      if (!a || !SKILLS[a.skill] || !a.paperId) return;
      if (!isDatePaper(a.paperId)) return;
      var sid = String(a.sid || ("L" + (a.at || 0)));
      var at = Number(a.at) || 0;
      out.push({
        kind: "mock",
        skill: a.skill,
        paperId: a.paperId,
        packageId: a.paperId,
        taskType: paperType(a.paperId),
        taskIndex: 0,
        sid: sid,
        title: a.title || a.paperId,
        items: [],
        score: a.correct != null ? Number(a.correct) : null,
        total: a.total != null ? Number(a.total) : null,
        band: a.band,
        submittedAt: isoAt(at) || new Date().toISOString(),
        clientKey: "mock|" + a.paperId + "|" + a.skill + "|0|" + sid
      });
    });
    return out;
  }
  function localState() {
    var Lab = w.YYSD_TOEFL_LAB;
    if (Lab && Lab.state) return Lab.state() || {};
    return parse((w.localStorage && w.localStorage.getItem(STATE_KEY)) || "{}", {}) || {};
  }
  function localAttempts() {
    var Lab = w.YYSD_TOEFL_LAB;
    if (Lab && Lab.attempts) return Lab.attempts() || [];
    var list = parse((w.localStorage && w.localStorage.getItem(ATT_KEY)) || "[]", []) || [];
    return Array.isArray(list) ? list : [];
  }
  function sendChunks(records) {
    var i = 0;
    function next() {
      if (i >= records.length) return Promise.resolve({ ok: true });
      var chunk = records.slice(i, i + BATCH);
      i += BATCH;
      return send(chunk).then(function (r) {
        if (r && r.ok) markSynced(chunk.map(function (x) { return x.clientKey; }));
        return next();
      });
    }
    return next();
  }
  function backfill() {
    if (!token()) return Promise.resolve({ ok: true, empty: true });
    var synced = loadSynced();
    var recs = recordsFromLocalState(localState()).concat(recordsFromAttempts(localAttempts()));
    recs = recs.filter(function (r) { return r && r.clientKey && !synced[r.clientKey]; });
    if (!recs.length) return Promise.resolve({ ok: true, empty: true });
    return sendChunks(recs);
  }
  function flush() {
    var q = loadQ();
    var queued = (!q.length || !token())
      ? Promise.resolve({ ok: true, empty: true })
      : post({ records: q }).then(function () {
        saveQ([]);
        markSynced(q.map(function (r) { return r && r.clientKey; }));
        return { ok: true };
      }).catch(function () { return { ok: false }; });
    return queued.then(function () { return backfill(); });
  }

  function send(records, audio) {
    if (!records || !records.length) return Promise.resolve({ ok: true });
    var body = { records: records };
    if (audio && audio.length) body.audio = audio;
    return post(body).then(function () {
      markSynced((records || []).map(function (r) { return r && r.clientKey; }));
      return { ok: true };
    }).catch(function () {
      enqueue(records);
      return { ok: false };
    });
  }

  function recordsFromDetail(skill, paperId, paper, detail, extra) {
    extra = extra || {};
    var by = {};
    (detail || []).forEach(function (d) {
      var found = taskOf(paper, d.id);
      if (!found) return;
      var k = found.index;
      if (!by[k]) by[k] = { task: found.task, index: found.index, items: [] };
      by[k].items.push({
        no: d.id,
        ok: d.ok === true || d.ok === false ? d.ok : null,
        ua: d.ua == null ? "" : String(d.ua),
        expect: d.expect == null ? "" : String(d.expect),
        stem: d.stem || "",
        words: d.words
      });
    });
    var kind = extra.kind || (isMock() ? "mock" : "practice");
    var sid = extra.sid || sidOf();
    var pkg = extra.packageId || (kind === "mock" ? paperId : "");
    return Object.keys(by).map(function (k) {
      var g = by[k];
      var task = g.task || {};
      return {
        kind: kind,
        skill: skill,
        paperId: paperId,
        packageId: pkg,
        taskType: task.type || extra.taskType || "",
        taskIndex: g.index,
        sid: sid,
        title: titleOf(paper, paperId, task),
        titleZh: task.titleZh || "",
        stem: stemOf(task, g.items),
        image: imageOf(task),
        items: g.items,
        score: g.items.filter(function (x) { return x.ok === true; }).length,
        total: g.items.filter(function (x) { return x.ok === true || x.ok === false; }).length,
        band: extra.band,
        submittedAt: extra.submittedAt || new Date().toISOString(),
        clientKey: (kind === "mock" ? "mock|" + pkg + "|" + skill : "practice|" + skill + "|" + paperId + "|" + g.index) + "|" + sid
      };
    });
  }

  function fromScore(skill, paperId, paper, detail, extra) {
    var records = recordsFromDetail(skill, paperId, paper, detail, extra);
    return send(records);
  }

  function blobToData(blob) {
    return new Promise(function (resolve, reject) {
      if (!blob) { resolve(""); return; }
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result || ""); };
      fr.onerror = function () { reject(new Error("录音读取失败")); };
      fr.readAsDataURL(blob);
    });
  }

  function fromSpeaking(paperId, paper, screens, recs, extra) {
    extra = extra || {};
    var kind = extra.kind || (isMock() ? "mock" : "practice");
    var sid = extra.sid || sidOf();
    var pkg = extra.packageId || (kind === "mock" ? paperId : "");
    var records = [];
    var jobs = [];
    (screens || []).forEach(function (s) {
      var task = s.task || {};
      var rec = recs && recs[task.id];
      var idx = ((paper && paper.tasks) || []).indexOf(task);
      if (idx < 0) idx = Number(s.index) || 0;
      var clientKey = (kind === "mock" ? "mock|" + pkg + "|speaking|" + idx : "practice|speaking|" + paperId + "|" + idx) + "|" + sid;
      records.push({
        kind: kind,
        skill: "speaking",
        paperId: paperId,
        packageId: pkg,
        taskType: task.type || "",
        taskIndex: idx,
        sid: sid,
        title: titleOf(paper, paperId, task),
        stem: stemOf(task, []),
        image: imageOf(task),
        items: [{ no: task.id, ok: !!(rec && rec.blob), ua: rec && rec.blob ? "recorded" : "", expect: "recorded" }],
        recorded: !!(rec && rec.blob),
        score: rec && rec.blob ? 1 : 0,
        total: 1,
        submittedAt: extra.submittedAt || new Date().toISOString(),
        clientKey: clientKey
      });
      if (rec && rec.blob) {
        jobs.push(blobToData(rec.blob).then(function (data) {
          return { clientKey: clientKey, mime: rec.mime || "audio/webm", data: data };
        }).catch(function () { return null; }));
      }
    });
    return Promise.all(jobs).then(function (audio) {
      return send(records, audio.filter(Boolean));
    });
  }

  var api = {
    flush: flush,
    backfill: backfill,
    fromScore: fromScore,
    fromSpeaking: fromSpeaking,
    recordsFromDetail: recordsFromDetail,
    recordsFromLocalState: recordsFromLocalState,
    recordsFromAttempts: recordsFromAttempts,
    enqueue: enqueue
  };
  w.YYSD_TOEFL_SYNC = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (token()) flush();
})(typeof window !== "undefined" ? window : { location: { hostname: "localhost", protocol: "http:", search: "" }, localStorage: null });

if (typeof window === "undefined") {
  var assert = require("assert");
  var S = module.exports;
  var recs = S.recordsFromLocalState({
    "reading|bank-cw|2": {
      at: Date.parse("2026-10-01T08:00:00.000Z"),
      items: [{ no: 1, ok: true, ua: "flew", expect: "flew" }]
    },
    "reading|set-1|0": { at: 0 },
    "listening|2025-07-16|1": {
      at: Date.parse("2026-10-02T08:00:00.000Z"),
      items: [{ no: 3, ok: false, ua: "A", expect: "C" }]
    }
  });
  assert.strictEqual(recs.length, 2);
  var byPaper = {};
  recs.forEach(function (r) { byPaper[r.paperId] = r; });
  assert.strictEqual(byPaper["bank-cw"].taskType, "complete_words");
  assert.strictEqual(byPaper["bank-cw"].kind, "practice");
  assert.strictEqual(byPaper["2025-07-16"].kind, "mock");
  assert.strictEqual(byPaper["2025-07-16"].packageId, "2025-07-16");
  var atts = S.recordsFromAttempts([
    { sid: 99, at: Date.parse("2026-10-03T08:00:00.000Z"), skill: "reading", paperId: "2025-07-16", title: "7.16", correct: 18, total: 20, band: 24 }
  ]);
  assert.strictEqual(atts.length, 1);
  assert.strictEqual(atts[0].kind, "mock");
  assert.strictEqual(atts[0].score, 18);
  console.log("ok toefl-sync-backfill");
}
