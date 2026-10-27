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

  function load(id) {
    if (typeof sessionStorage === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem(storeKey(id)) || "null"); }
    catch (e) { return null; }
  }

  function save(pack) {
    if (typeof sessionStorage === "undefined" || !pack) return;
    sessionStorage.setItem(storeKey(pack.id), JSON.stringify(pack));
  }

  function startPack(id, mode) {
    var pack = { id: id, mode: mode, sections: {}, voided: false, sid: Date.now() };
    save(pack);
    useSid(pack.sid);
    try { sessionStorage.removeItem("yysd:toefl-hw:" + id); } catch (e) {}
    return pack;
  }

  // 一场模考四科共用一个 sid，成绩单才把四科算作同一场
  function useSid(sid) {
    try { sessionStorage.setItem("yysd:toefl-sid", String(sid)); } catch (e) {}
  }

  function currentSid() {
    if (!isFull()) return 0;
    try { return Number(sessionStorage.getItem("yysd:toefl-sid")) || 0; } catch (e) { return 0; }
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

  function skillHref(id, mode, skill) {
    return withFrom(PAGES[skill] + "?id=" + encodeURIComponent(id) + "&mode=" + encodeURIComponent(mode) + "&full=1");
  }

  function introHref(id, mode) {
    var q = "toefl-full.html?id=" + encodeURIComponent(id);
    return withFrom(mode ? q + "&mode=" + encodeURIComponent(mode) : q);
  }

  function resultsHref(id, mode) {
    return introHref(id, mode) + "&view=done";
  }

  function nextHref(id, mode, skill) {
    var n = nextSkill(skill);
    return n ? skillHref(id, mode, n) : resultsHref(id, mode);
  }

  function firstIncomplete(pack) {
    if (!pack || pack.voided) return "";
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
    if (pack.voided) {
      go(introHref(id, mode));
      return false;
    }
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

  /* 线上 /library/toefl 卷 JSON 曾整批 404；本仓是公开的，回源 GitHub raw 先让考场能开。 */
  var PAPER_RAW = "https://raw.githubusercontent.com/wanli4473/yysd-testcenter/main/";

  function paperRel(file) {
    var s = String(file || "").replace(/^\.\//, "");
    if (!s) return "";
    try {
      if (/^https?:\/\//i.test(s)) {
        var base = typeof location !== "undefined" ? location.href : "https://youyisida.com/";
        s = new URL(s, base).pathname.replace(/^\//, "");
      }
    } catch (e) {}
    return s.replace(/^\//, "");
  }

  function getPaperJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      var ct = "";
      try { ct = ((r.headers && r.headers.get && r.headers.get("content-type")) || "").toLowerCase(); }
      catch (e0) {}
      if (!r.ok || ct.indexOf("html") >= 0) throw new Error("Unable to load this test");
      return r.json();
    });
  }

  function fetchPaper(file) {
    var rel = paperRel(file);
    if (!rel) return Promise.reject(new Error("Unable to load this test"));
    return getPaperJSON(rel).catch(function () {
      return getPaperJSON(PAPER_RAW + rel);
    }).catch(function () {
      if (rel.indexOf("app/") === 0) throw new Error("Unable to load this test");
      return getPaperJSON(PAPER_RAW + "app/" + rel);
    });
  }

  function stashReview(skill, paper, payload) {
    payload = payload || {};
    payload.skill = skill;
    payload.paper = paper;
    payload.set = (paper && paper.id) || payload.set || "";
    if (!payload.sid) payload.sid = currentSid();
    try { sessionStorage.setItem("yysd:app-review", JSON.stringify(payload)); } catch (e) {}
    return payload;
  }

  function reviewHref(skill) {
    var preview = false;
    try {
      preview = typeof location !== "undefined" && new URLSearchParams(location.search).get("preview") === "1";
    } catch (e0) {}
    var href = (onAppHost() ? "" : "app/") + "review.html?skill=" + encodeURIComponent(skill);
    if (preview) href += "&preview=1";
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
    var go = document.getElementById("rest-go");
    if (h) h.textContent = "End of " + label(skill) + " Section";
    var copy = rest.querySelector("#rest-copy") || p;
    if (copy) copy.textContent = restCopy(skill);
    var acts = rest.querySelector("#rest-acts");
    if (acts) acts.textContent = "";
    var goNext = function () { go(nextHref(id, mode, skill)); };
    if (go) {
      go.textContent = "Continue";
      go.onclick = goNext;
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

  function dressVoidUI() {
    var box = document.getElementById("void-lock");
    if (!box) return;
    var h = box.querySelector("h2");
    var p = box.querySelector("p");
    var exit = box.querySelector("a");
    if (h) h.textContent = "This complete test has been stopped";
    if (p) p.textContent = "Leaving the test window voids this mock test. No section is scored.";
    if (exit) exit.setAttribute("href", listBack());
  }

  /* 作废/退出 = 本场结束：上报完成，宽限不再允许续考（best-effort，失败不影响流程） */
  function examDone(id) {
    try {
      var A = w.YYSD_AUTH;
      if (!A || !A.api || !id) return;
      A.api("/api/toefl/exam-done", { method: "POST", body: { packageId: id } }).catch(function () {});
    } catch (e) {}
  }

  function markVoid(id) {
    var pack = load(id);
    if (pack) { pack.voided = true; pack.sections = {}; save(pack); }
    examDone(id);
  }

  function quitPack(id) {
    examDone(id);
    if (typeof sessionStorage === "undefined") return;
    try { sessionStorage.removeItem(storeKey(id)); } catch (e) {}
    try { sessionStorage.removeItem("yysd:toefl-hw:" + id); } catch (e) {}
  }

  function voidRestartHref(id, skill) {
    if (isFull() || fromApp()) {
      var kind = isFull() ? "full" : "single";
      var href = mockHubHref(kind) + "&id=" + encodeURIComponent(id);
      if (kind === "single" && skill) href += "&skill=" + encodeURIComponent(skill);
      return href;
    }
    return introHref(id, "mock");
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
    fetchPaper: fetchPaper,
    handoffApp: handoffApp,
    reviewGo: reviewGo,
    reviewHref: reviewHref,
    stashReview: stashReview,
    restCopy: restCopy,
    fillRest: fillRest,
    dressVoidUI: dressVoidUI,
    markVoid: markVoid,
    quitPack: quitPack,
    voidRestartHref: voidRestartHref,
    compactScore: compactScore,
    compactWriting: compactWriting
  };

  w.YYSD_TOEFL_FULL = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : global);
