"use strict";
var fs = require("fs");
var path = require("path");
var F = require("../assets/js/toefl-full.js");
var root = path.join(__dirname, "..");

if (F.ORDER.join(",") !== "reading,listening,writing,speaking") throw new Error("ETS order");
if (F.nextSkill("reading") !== "listening") throw new Error("after reading");
if (F.nextSkill("listening") !== "writing") throw new Error("after listening");
if (F.nextSkill("writing") !== "speaking") throw new Error("after writing");
if (F.nextSkill("speaking") !== "") throw new Error("speaking is last");
if (F.nextHref("2025-09-02", "mock", "reading").indexOf("toefl-listening.html") < 0) throw new Error("next listening");
if (F.nextHref("2025-09-02", "mock", "writing").indexOf("toefl-speaking.html") < 0) throw new Error("next speaking");
if (F.nextHref("2025-09-02", "mock", "speaking").indexOf("view=done") < 0) throw new Error("after speaking → results");
global.location = global.location || {};
global.location.search = "?id=2025-09-02&mode=mock&full=1&preview=1";
if (F.nextHref("2025-09-02", "mock", "reading").indexOf("preview=1") < 0) throw new Error("section change drops preview");
global.location.search = "?id=2025-09-02&mode=mock&full=1";
if (F.skillHref("2025-09-02", "practice", "reading").indexOf("full=1") < 0) throw new Error("full flag");
if (F.compactScore({ score: 40, total: 50, band: 4.5, scaled30: 22 }).band !== 4.5) throw new Error("compact");
if (F.restCopy("reading").indexOf("Listening") < 0) throw new Error("rest copy");

["2025-09-02", "2025-09-05", "2025-09-13"].forEach(function (id) {
  ["reading", "listening", "writing", "speaking"].forEach(function (skill) {
    var p = path.join(root, "library/toefl/" + id + "-" + skill + ".json");
    if (!fs.existsSync(p)) throw new Error("missing " + skill + " " + id);
  });
});
var html = fs.readFileSync(path.join(root, "toefl-full.html"), "utf8");
if (html.indexOf("无安排休息") < 0) throw new Error("break rule");
if (html.indexOf("离开窗口则整场作废") >= 0) throw new Error("intro still voids the test");

var fullSrc = fs.readFileSync(path.join(root, "assets/js/toefl-full.js"), "utf8");
if (/var go = document\.getElementById\("rest-go"\)/.test(fullSrc)) throw new Error("rest-go shadows go()");
if (fullSrc.indexOf("localStorage") < 0) throw new Error("progress must leave the tab");

["reading", "listening", "writing", "speaking"].forEach(function (skill) {
  var page = fs.readFileSync(path.join(root, "toefl-" + skill + ".html"), "utf8");
  if (page.indexOf("triggerVoid") >= 0 || page.indexOf("has been stopped") >= 0) throw new Error(skill + " still stops the test");
  if (page.indexOf("visibilitychange") >= 0 || page.indexOf("void-lock") >= 0) throw new Error(skill + " still watches the window");
  if (page.indexOf('id="rest-go"') < 0) throw new Error(skill + " has no Continue");
});
var listen = fs.readFileSync(path.join(root, "toefl-listening.html"), "utf8");
if (listen.indexOf("clip.src = task.audio") < 0) throw new Error("listening audio path");
if (listen.indexOf("listen-retry") < 0 || listen.indexOf("audioPlaying") < 0) throw new Error("listening can still die silently");
if (listen.indexOf("YYSD_TOEFL_SHELL.directing()") < 0) throw new Error("listening clock still runs through the directions");
if (fs.readFileSync(path.join(root, "app/assets/js/access.js"), "utf8").indexOf('next.reason !== "error"') < 0) {
  throw new Error("a failed access check still cuts an open paper");
}

function mem() {
  var map = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
    setItem: function (k, v) { map[k] = String(v); },
    removeItem: function (k) { delete map[k]; },
    map: map
  };
}
global.localStorage = mem();
global.sessionStorage = mem();
var jumped = [];
var title = { textContent: "" };
var copy = { textContent: "" };
var acts = { textContent: "keep" };
var cont = { textContent: "", disabled: true, classList: { remove: function () {}, add: function () {} }, onclick: null };
var nextBtn = { textContent: "", disabled: true, classList: { remove: function () {}, add: function () {} }, onclick: null };
var backBtn = { classList: { add: function () {}, remove: function () {} } };
var rest = {
  querySelector: function (sel) {
    if (sel === "h1, h2") return title;
    if (sel === "#rest-copy" || sel === "p") return copy;
    if (sel === "#rest-acts") return acts;
    return null;
  }
};
global.document = {
  getElementById: function (id) {
    if (id === "rest") return rest;
    if (id === "rest-go") return cont;
    if (id === "next-btn") return nextBtn;
    if (id === "back-btn") return backBtn;
    return null;
  }
};
global.location = {
  search: "?id=2025-09-02&mode=mock&full=1",
  hostname: "localhost",
  pathname: "/toefl-reading.html",
  replace: function (href) { jumped.push(href); }
};
F.fillRest("reading", "2025-09-02", "mock");
if (title.textContent !== "End of Reading Section") throw new Error("rest title " + title.textContent);
if (cont.disabled) throw new Error("Continue stayed disabled");
cont.onclick();
nextBtn.onclick();
if (jumped.length !== 2 || jumped[0].indexOf("toefl-listening.html") < 0) throw new Error("Continue did not advance " + jumped.join(" | "));

F.startPack("2025-09-02", "mock");
F.afterSection("reading", "2025-09-02", "mock", { score: 1, total: 2 });
F.saveRun("2025-09-02", "reading", { scope: "mock||", si: 4, answers: { 1: "A" } });
global.sessionStorage.map = {};
if (!F.load("2025-09-02").sections.reading) throw new Error("pack died without sessionStorage");
if (F.loadRun("2025-09-02", "reading").si !== 4) throw new Error("section progress died without sessionStorage");
var resume = F.resumeOrStart("2025-09-02", "mock");
if (resume.indexOf("toefl-listening.html") < 0) throw new Error("resume restarted instead of continuing " + resume);
if (!F.loadRun("2025-09-02", "reading")) throw new Error("resume wiped answers");

global.localStorage.setItem("yysd:toefl-full:old-void", JSON.stringify({
  id: "old-void", mode: "mock", sections: { reading: { score: 3 } }, voided: true, sid: 9
}));
var revived = F.load("old-void");
if (!revived || revived.voided || !revived.sections.reading) throw new Error("old void still blocks re-entry");

global.window = global;
require("../assets/js/toefl-lab.js");
var Lab = global.YYSD_TOEFL_LAB;
var freshPaper = { tasks: [{ questions: [{ id: 1 }] }] };
Lab.markSessionDone("reading", "zz", freshPaper, "", "");
Lab.saveScore("reading", "zz", freshPaper, [{ id: 1, ok: true, ua: "A", expect: "A" }]);
var saved = Lab.state()[Lab.canon("reading", "zz", 0)];
if (!saved || !saved.items || saved.items.length !== 1 || !saved.items[0].ok) {
  throw new Error("first submit must score even when the task was only marked done");
}
["reading", "listening", "writing", "speaking"].forEach(function (skill) {
  var page = fs.readFileSync(path.join(root, "toefl-" + skill + ".html"), "utf8");
  if (page.indexOf("if (!started || submitted") < 0) throw new Error(skill + " persists before the section starts");
});

console.log("ok toefl-full R→L→W→S no break");
