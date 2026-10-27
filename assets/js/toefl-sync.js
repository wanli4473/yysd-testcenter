/* 新托福交卷同步：马上上传；失败写入队列，下次登录补传。录音只在当场传。 */
(function (w) {
  "use strict";
  var Q_KEY = "yysd:toefl-record-queue";
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

  function flush() {
    var q = loadQ();
    if (!q.length || !token()) return Promise.resolve({ ok: true, empty: true });
    return post({ records: q }).then(function () {
      saveQ([]);
      return { ok: true };
    }).catch(function () { return { ok: false }; });
  }

  function send(records, audio) {
    if (!records || !records.length) return Promise.resolve({ ok: true });
    var body = { records: records };
    if (audio && audio.length) body.audio = audio;
    return post(body).then(function () { return { ok: true }; }).catch(function () {
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

  w.YYSD_TOEFL_SYNC = {
    flush: flush,
    fromScore: fromScore,
    fromSpeaking: fromSpeaking,
    recordsFromDetail: recordsFromDetail,
    enqueue: enqueue
  };
  if (token()) flush();
})(typeof window !== "undefined" ? window : { location: { hostname: "localhost", protocol: "http:", search: "" }, localStorage: null });
