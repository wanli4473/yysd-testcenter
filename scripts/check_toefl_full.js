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
console.log("ok toefl-full R→L→W→S no break");
