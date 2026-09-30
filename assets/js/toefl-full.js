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
    var pack = { id: id, mode: mode, sections: {}, voided: false };
    save(pack);
    return pack;
  }

  function nextSkill(skill) {
    var i = ORDER.indexOf(skill);
    return i < 0 || i >= ORDER.length - 1 ? "" : ORDER[i + 1];
  }

  function label(skill) { return LABELS[skill] || skill; }

  function skillHref(id, mode, skill) {
    return PAGES[skill] + "?id=" + encodeURIComponent(id) + "&mode=" + encodeURIComponent(mode) + "&full=1";
  }

  function introHref(id, mode) {
    var q = "toefl-full.html?id=" + encodeURIComponent(id);
    return mode ? q + "&mode=" + encodeURIComponent(mode) : q;
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
      if (typeof location !== "undefined") location.replace(introHref(id, mode));
      return false;
    }
    if (pack.voided) {
      if (typeof location !== "undefined") location.replace(introHref(id, mode));
      return false;
    }
    var need = firstIncomplete(pack);
    if (!need) {
      if (typeof location !== "undefined") location.replace(resultsHref(id, mode));
      return false;
    }
    if (need !== skill) {
      if (typeof location !== "undefined") location.replace(skillHref(id, mode, need));
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
    if (mode === "mock") {
      if (typeof location !== "undefined") location.replace(nextHref(id, mode, skill));
      return "go";
    }
    return "rest";
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
    if (p) p.textContent = restCopy(skill);
    if (go) {
      go.textContent = "Continue";
      go.onclick = function () { location.replace(nextHref(id, mode, skill)); };
    }
  }

  function dressVoidUI() {
    var box = document.getElementById("void-lock");
    if (!box) return;
    var h = box.querySelector("h2");
    var p = box.querySelector("p");
    var exit = box.querySelector("a");
    if (h) h.textContent = "This complete test has been stopped";
    if (p) p.textContent = "Leaving the test window voids this mock test. No section is scored.";
    if (exit) exit.setAttribute("href", "zone.html?zone=toefl&s=full");
  }

  function markVoid(id) {
    var pack = load(id);
    if (pack) { pack.voided = true; pack.sections = {}; save(pack); }
  }

  function voidRestartHref(id) {
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
    load: load,
    startPack: startPack,
    nextSkill: nextSkill,
    label: label,
    skillHref: skillHref,
    introHref: introHref,
    resultsHref: resultsHref,
    nextHref: nextHref,
    firstIncomplete: firstIncomplete,
    enterSkill: enterSkill,
    afterSection: afterSection,
    restCopy: restCopy,
    fillRest: fillRest,
    dressVoidUI: dressVoidUI,
    markVoid: markVoid,
    voidRestartHref: voidRestartHref,
    compactScore: compactScore,
    compactWriting: compactWriting
  };

  w.YYSD_TOEFL_FULL = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : global);
