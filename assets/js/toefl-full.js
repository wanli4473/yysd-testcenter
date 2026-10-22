/* TOEFL full test — ETS Enhanced order, no scheduled break */
(function (w) {
  "use strict";

  var ORDER = ["reading", "listening", "writing", "speaking"];
  var PAGES = {
    reading: "toefl-reading.html",
    listening: "toefl-listening.html",
    writing: "toefl-writing.html",
    speaking: "toefl-speaking.html"
  };
  var LABELS = {
    reading: "Reading",
    listening: "Listening",
    writing: "Writing",
    speaking: "Speaking"
  };

  function isFull() {
    if (typeof location === "undefined") return false;
    try { return new URLSearchParams(location.search).get("full") === "1"; }
    catch (e) { return false; }
  }

  function storeKey(id) { return "yysd:toefl-full:" + id; }
  function runKey(id, skill) { return "yysd:toefl-run:" + id + ":" + skill; }
  function sidKey() { return "yysd:toefl-sid"; }

  function readStore(store, key) {
    if (!store || typeof store.getItem !== "function") return null;
    try { return store.getItem(key); } catch (e) { return null; }
  }

  function writeStore(store, key, val) {
    if (!store || typeof store.setItem !== "function") return;
    try { store.setItem(key, val); } catch (e) {}
  }

  function dropStore(store, key) {
    if (!store || typeof store.removeItem !== "function") return;
    try { store.removeItem(key); } catch (e) {}
  }

  function parsePack(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /* localStorage 跨刷新、关页再进；sessionStorage 留给同一标签。两边都写，读较新的一份。 */
  function storageGet(key) {
    var local = parsePack(readStore(typeof localStorage !== "undefined" ? localStorage : null, key));
    var sess = parsePack(readStore(typeof sessionStorage !== "undefined" ? sessionStorage : null, key));
    if (!local) return sess;
    if (!sess) return local;
    var ta = Number(local.savedAt || local.sid) || 0;
    var tb = Number(sess.savedAt || sess.sid) || 0;
    return tb > ta ? sess : local;
  }

  function storageSet(key, obj) {
    var raw = JSON.stringify(obj);
    writeStore(typeof localStorage !== "undefined" ? localStorage : null, key, raw);
    writeStore(typeof sessionStorage !== "undefined" ? sessionStorage : null, key, raw);
  }

  function storageDel(key) {
    dropStore(typeof localStorage !== "undefined" ? localStorage : null, key);
    dropStore(typeof sessionStorage !== "undefined" ? sessionStorage : null, key);
  }

  function load(id) {
    var pack = storageGet(storeKey(id));
    if (!pack) return null;
    /* 旧版离开窗口会把整场标作废并清空。自习不再作废：清掉标记，已保存的科目留下。 */
    if (pack.voided) {
      pack.voided = false;
      save(pack);
    }
    return pack;
  }

  function save(pack) {
    if (!pack) return;
    pack.savedAt = Date.now();
    storageSet(storeKey(pack.id), pack);
  }

  function clearRun(id, skill) {
    if (!id) return;
    if (skill) { storageDel(runKey(id, skill)); return; }
    ORDER.forEach(function (s) { storageDel(runKey(id, s)); });
  }

  function saveRun(id, skill, snap) {
    if (!id || !skill || !snap) return;
    snap.savedAt = Date.now();
    storageSet(runKey(id, skill), snap);
  }

  function loadRun(id, skill) {
    if (!id || !skill) return null;
    return storageGet(runKey(id, skill));
  }

  function startPack(id, mode) {
    var pack = { id: id, mode: mode, sections: {}, sid: Date.now() };
    clearRun(id);
    save(pack);
    useSid(pack.sid);
    try { sessionStorage.removeItem("yysd:toefl-hw:" + id); } catch (e) {}
    try { if (typeof localStorage !== "undefined") localStorage.removeItem("yysd:toefl-hw:" + id); } catch (e2) {}
    return pack;
  }

  // 一场模考四科共用一个 sid，成绩单才把四科算作同一场
  function useSid(sid) {
    var raw = JSON.stringify({ sid: sid, savedAt: Date.now() });
    writeStore(typeof localStorage !== "undefined" ? localStorage : null, sidKey(), raw);
    writeStore(typeof sessionStorage !== "undefined" ? sessionStorage : null, sidKey(), raw);
  }

  function currentSid() {
    if (!isFull()) return 0;
    var row = storageGet(sidKey());
    if (row && typeof row === "object") return Number(row.sid) || 0;
    return Number(row) || 0;
  }

  function nextSkill(skill) {
    var i = ORDER.indexOf(skill);
    return i < 0 || i >= ORDER.length - 1 ? "" : ORDER[i + 1];
  }

  function label(skill) { return LABELS[skill] || skill; }

  function fromApp() {
    if (typeof location === "undefined") return false;
    try { return new URLSearchParams(location.search).get("from") === "app"; }
    catch (e) { return false; }
  }

  function mockHubHref(kind) {
    var q = "mock.html?kind=" + encodeURIComponent(kind || "full");
    if (typeof location !== "undefined" && location.hostname === "app.youyisida.com") return q;
    return "app/" + q;
  }

  /* 全真模考从套题列表进，返回列表而非冲刺包 */
  function homeHubHref() {
    if (typeof location !== "undefined" && location.hostname === "app.youyisida.com") return "home.html";
    return "app/home.html";
  }

  function fromKl() {
    if (typeof location === "undefined") return false;
    try { return new URLSearchParams(location.search).get("from") === "kl"; }
    catch (e) { return false; }
  }

  function klListHref() {
    if (typeof location !== "undefined" && location.hostname === "app.youyisida.com") return "official.html";
    return "app/official.html";
  }

  function onAppHost() {
    if (typeof location === "undefined") return false;
    var host = location.hostname || "";
    var path = location.pathname || "";
    return host.indexOf("app.") === 0 || path.indexOf("/app/") >= 0;
  }

  function labHref(skill) {
    return ["reading", "listening", "writing", "speaking"].indexOf(skill) >= 0
      ? "practice.html?skill=" + skill : "home.html";
  }

  function listBack(skill, opts) {
    skill = skill || "reading";
    opts = opts || {};
    if (fromKl()) return klListHref();
    // app.youyisida.com has no zone.html; sending Exit or a failed preview there is a nginx 404
    if (onAppHost()) {
      if (isFull() || opts.mock) return mockHubHref(isFull() ? "full" : "single");
      return labHref(skill);
    }
    if (isFull() || fromApp()) return mockHubHref(isFull() ? "full" : "single");
    if (opts.lab) return "zone.html?zone=toefl&s=lab&skill=" + encodeURIComponent(skill);
    return "zone.html?zone=toefl&s=" + encodeURIComponent(skill);
  }

  function markLeave() {
    var S = w.YYSD_TOEFL_SHELL;
    if (S && S.markLeaving) S.markLeaving();
  }

  function go(href) {
    markLeave();
    if (typeof location !== "undefined") location.replace(href);
  }

  function withFrom(href) {
    if (href.indexOf("from=") >= 0) return href;
    if (fromApp()) return href + "&from=app";
    if (fromKl()) return href + "&from=kl";
    return href;
  }

  function withContext(href) {
    href = withFrom(href);
    try {
      if (typeof location !== "undefined" && new URLSearchParams(location.search).get("preview") === "1" && href.indexOf("preview=") < 0) {
        href += "&preview=1";
      }
    } catch (e) {}
    return href;
  }

  function skillHref(id, mode, skill) {
    return withContext(PAGES[skill] + "?id=" + encodeURIComponent(id) + "&mode=" + encodeURIComponent(mode) + "&full=1");
  }

  function introHref(id, mode) {
    var q = "toefl-full.html?id=" + encodeURIComponent(id);
    return withContext(mode ? q + "&mode=" + encodeURIComponent(mode) : q);
  }

  function resultsHref(id, mode) {
    return introHref(id, mode) + "&view=done";
  }

  function nextHref(id, mode, skill) {
    var n = nextSkill(skill);
    return n ? skillHref(id, mode, n) : resultsHref(id, mode);
  }

  function firstIncomplete(pack) {
    if (!pack) return "";
    var i;
    for (i = 0; i < ORDER.length; i++) {
      if (!pack.sections || !pack.sections[ORDER[i]]) return ORDER[i];
    }
    return "";
  }

  function enterSkill(id, mode, skill) {
    var pack = load(id);
    if (!pack) {
      if (skill === "reading") { startPack(id, mode); return true; }
      go(introHref(id, mode));
      return false;
    }
    if (!pack.sid) { pack.sid = Date.now(); save(pack); }
    useSid(pack.sid);
    var need = firstIncomplete(pack);
    if (!need) {
      go(resultsHref(id, mode));
      return false;
    }
    if (need !== skill) {
      go(skillHref(id, mode, need));
      return false;
    }
    return true;
  }

  function afterSection(skill, id, mode, payload) {
    var pack = load(id) || startPack(id, mode);
    pack.sections = pack.sections || {};
    pack.sections[skill] = payload || {};
    save(pack);
    if (skill === "speaking") return "done";
    return "rest";
  }

  function paperFile(skill, id) {
    var stem = String(id || "");
    var underApp = /^set-\d+$/.test(stem) || stem.indexOf("bank-") === 0;
    var prefix = (!onAppHost() && underApp) ? "app/" : "";
    return prefix + "library/toefl/" + stem + "-" + skill + ".json";
  }

  function paperURL(skill, setN) {
    return paperFile(skill, "set-" + setN);
  }

  function stashReview(skill, paper, payload) {
    payload = payload || {};
    payload.skill = skill;
    payload.paper = paper;
    payload.set = (paper && paper.id) || payload.set || "";
    if (!payload.sid) payload.sid = currentSid();
    var raw = "";
    try { raw = JSON.stringify(payload); } catch (e) { raw = ""; }
    if (raw) {
      writeStore(typeof sessionStorage !== "undefined" ? sessionStorage : null, "yysd:app-review", raw);
      writeStore(typeof localStorage !== "undefined" ? localStorage : null, "yysd:app-review", raw);
    }
    return payload;
  }

  function reviewHref(skill) {
    var href = (onAppHost() ? "" : "app/") + "review.html?skill=" + encodeURIComponent(skill);
    try {
      var qs = new URLSearchParams(location.search);
      ["preview", "bank", "bi", "from"].forEach(function (k) {
        var v = qs.get(k);
        if (v && href.indexOf(k + "=") < 0) href += "&" + k + "=" + encodeURIComponent(v);
      });
    } catch (e0) {}
    return href;
  }

  /* 复盘页只有 sessionStorage 里这一份答卷，整场其余科目由页面自己按 sid 从模考历史重建 */
  function reviewGo(skill, paper, payload) {
    stashReview(skill, paper, payload);
    go(reviewHref(skill));
  }

  function handoffApp(skill, paper, payload) {
    if (!fromApp() || isFull()) return false;
    reviewGo(skill, paper, payload);
    return true;
  }

  function restCopy(skill) {
    return "You have finished the " + label(skill) + " section. You cannot return. The next section is " +
      label(nextSkill(skill)) + ". Select Continue when you are ready.";
  }

  function fillRest(skill, id, mode) {
    var rest = document.getElementById("rest");
    if (!rest) return;
    var h = rest.querySelector("h1, h2");
    var p = rest.querySelector("p");
    var cont = document.getElementById("rest-go");
    if (h) h.textContent = "End of " + label(skill) + " Section";
    var copy = rest.querySelector("#rest-copy") || p;
    if (copy) copy.textContent = restCopy(skill);
    var acts = rest.querySelector("#rest-acts");
    if (acts) acts.textContent = "";
    var goNext = function () { go(nextHref(id, mode, skill)); };
    if (cont) {
      cont.classList.remove("hidden");
      cont.disabled = false;
      cont.textContent = "Continue";
      cont.onclick = goNext;
    }
    var next = document.getElementById("next-btn");
    if (next) {
      next.classList.remove("hidden");
      next.disabled = false;
      next.textContent = "Continue";
      next.onclick = goNext;
    }
    var back = document.getElementById("back-btn");
    if (back) back.classList.add("hidden");
  }

  /* 交卷/主动退出 = 本场结束：上报完成，宽限不再允许续考（best-effort，失败不影响流程） */
  function examDone(id) {
    try {
      var A = w.YYSD_AUTH;
      if (!A || !A.api || !id) return;
      A.api("/api/toefl/exam-done", { method: "POST", body: { packageId: id } }).catch(function () {});
    } catch (e) {}
  }

  function quitPack(id) {
    examDone(id);
    clearRun(id);
    storageDel(storeKey(id));
    try { sessionStorage.removeItem("yysd:toefl-hw:" + id); } catch (e) {}
    try { if (typeof localStorage !== "undefined") localStorage.removeItem("yysd:toefl-hw:" + id); } catch (e2) {}
  }

  /* 同一套未做完就接着考，不覆盖进度。做完或没有记录才新开一场。 */
  function resumeOrStart(id, mode) {
    var pack = load(id);
    var skill = "";
    if (pack && (!pack.mode || pack.mode === mode)) skill = firstIncomplete(pack);
    if (!skill) {
      startPack(id, mode);
      skill = "reading";
    } else {
      if (!pack.sid) { pack.sid = Date.now(); save(pack); }
      useSid(pack.sid);
    }
    return skillHref(id, mode, skill);
  }

  function compactScore(r) {
    if (!r) return {};
    return { score: r.score, total: r.total, band: r.band, scaled30: r.scaled30 };
  }

  function compactWriting(r) {
    if (!r) return {};
    return {
      score: r.score,
      total: r.total,
      essays: (r.detail || []).filter(function (d) { return d.type !== "sentence"; }).map(function (d) {
        return { type: d.type, words: d.words || 0, ua: d.ua || "" };
      })
    };
  }

  var api = {
    ORDER: ORDER,
    isFull: isFull,
    currentSid: currentSid,
    load: load,
    startPack: startPack,
    nextSkill: nextSkill,
    label: label,
    fromApp: fromApp,
    mockHubHref: mockHubHref,
    listBack: listBack,
    skillHref: skillHref,
    introHref: introHref,
    resultsHref: resultsHref,
    nextHref: nextHref,
    firstIncomplete: firstIncomplete,
    enterSkill: enterSkill,
    afterSection: afterSection,
    paperURL: paperURL,
    paperFile: paperFile,
    handoffApp: handoffApp,
    reviewGo: reviewGo,
    reviewHref: reviewHref,
    stashReview: stashReview,
    restCopy: restCopy,
    fillRest: fillRest,
    quitPack: quitPack,
    resumeOrStart: resumeOrStart,
    saveRun: saveRun,
    loadRun: loadRun,
    clearRun: clearRun,
    compactScore: compactScore,
    compactWriting: compactWriting
  };

  w.YYSD_TOEFL_FULL = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : global);
