#!/usr/bin/env node
// ponytail: bridge scrape + sanitizeWrong — fails if wrong capture regresses
"use strict";

function clipText(v, n) {
  var s = v == null ? "" : String(v);
  if (s.length > n) s = s.slice(0, n);
  return s.trim();
}

function sanitizeWrong(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 80).map(function (w) {
    if (!w || typeof w !== "object") return null;
    var out = {
      no: clipText(w.no != null ? String(w.no) : "", 20),
      ua: clipText(w.ua, 200),
      ans: clipText(w.ans, 200)
    };
    var explain = clipText(w.explain, 800);
    if (explain) out.explain = explain;
    return out;
  }).filter(Boolean);
}

// mirrors SCORE_BRIDGE scrapeWrong (DOM-free: split on .ritem blocks)
function scrapeWrongFromHtml(html) {
  var out = [];
  // ponytail: ceiling = nested-div papers; upgrade to jsdom if samples get complex
  String(html || "").split(/(?=<div[^>]*class="[^"]*\britem\b)/i).forEach(function (block) {
    if (out.length >= 80) return;
    var cls = (block.match(/^<div[^>]*class="([^"]*)"/i) || [])[1] || "";
    if (!/\britem\b/i.test(cls) || !/\bwrong\b/i.test(cls)) return;
    var rq = (block.match(/class="rq"[^>]*>([\s\S]*?)<\//i) || [])[1] || "";
    rq = rq.replace(/<[^>]+>/g, "").trim();
    var m = rq.match(/第\s*([^\s题]+)\s*题/);
    var yours = (block.match(/class="yours"[^>]*>([\s\S]*?)<\//i) || [])[1] || "";
    var ans = (block.match(/class="correctv"[^>]*>([\s\S]*?)<\//i) || [])[1] || "";
    yours = yours.replace(/<[^>]+>/g, "").trim();
    ans = ans.replace(/<[^>]+>/g, "").trim();
    if (yours === "未作答") yours = "";
    out.push({
      no: m ? m[1] : rq.replace(/^[✘✔✗]\s*/, ""),
      ua: yours,
      ans: ans
    });
  });
  return out;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

var sample =
  '<div id="summary"><div class="item"><span class="num">8 / 10</span></div></div>' +
  '<div class="ritem wrong"><div class="rq">✘ 第 3 题</div>' +
  '<div class="yours">apple</div><div class="correctv">orange</div></div>' +
  '<div class="ritem wrong"><div class="rq">✘ 第 7 题</div>' +
  '<div class="yours">未作答</div><div class="correctv">blue</div></div>' +
  '<div class="ritem correct"><div class="rq">✔ 第 1 题</div>' +
  '<div class="yours">yes</div><div class="correctv">yes</div></div>';

var scraped = scrapeWrongFromHtml(sample);
assert(scraped.length === 2, "sample should yield 2 wrongs, got " + scraped.length);
assert(scraped[0].no === "3" && scraped[0].ua === "apple" && scraped[0].ans === "orange", "wrong #3 fields");
assert(scraped[1].no === "7" && scraped[1].ua === "" && scraped[1].ans === "blue", "wrong #7 blank ua");

var many = [];
for (var i = 0; i < 100; i++) many.push({ no: String(i), ua: "a", ans: "b" });
var capped = sanitizeWrong(many);
assert(capped.length === 80, "sanitizeWrong must cap at 80, got " + capped.length);

assert(sanitizeWrong(null).length === 0, "null → []");
assert(sanitizeWrong([{ no: "1", ua: "x", ans: "y", explain: "because" }])[0].explain === "because", "explain kept");

// wrongCapture classification (mirrors exam.js)
function wrongCaptureOf(score, total, wrong) {
  if (wrong && wrong.length) return "ok";
  var s = Number(score), t = Number(total);
  if (isFinite(s) && isFinite(t) && t > 0 && s >= t) return "empty_perfect";
  if (isFinite(s) && isFinite(t) && t > 0 && s < t) return "empty_missed";
  return "empty_missed";
}
assert(wrongCaptureOf(10, 10, []) === "empty_perfect", "perfect");
assert(wrongCaptureOf(8, 10, []) === "empty_missed", "missed");
assert(wrongCaptureOf(8, 10, [{ no: "1" }]) === "ok", "ok");

// inject upgrade marker
var fs = require("fs");
var path = require("path");
var serverPath = path.join(__dirname, "..", "server", "server.js");
var src = fs.readFileSync(serverPath, "utf8");
assert(src.indexOf("__yysdScoreBridgeV2") >= 0, "V2 bridge marker missing");
assert(src.indexOf("fromResCorrect") >= 0, "bridge must parse #resCorrect (Cambridge upload HTML)");
assert(src.indexOf("upload-\" + evId") >= 0, "autoComplete must fallback via assignmentEventId for uploads");
assert(/wrong:wrong/.test(src) || /wrong: wrong/.test(src) || src.indexOf("wrong:wrong") >= 0 || src.indexOf(",wrong:wrong") >= 0, "bridge should post wrong");
assert(src.indexOf("getAttemptByStamp") >= 0, "attempt upsert helper missing");
assert(/out\.wrong = wrong/.test(src) || src.indexOf("if (wrong.length) out.wrong = wrong") >= 0, "sanitizeScore must keep wrong[]");

var examJs = fs.readFileSync(path.join(__dirname, "..", "assets/js/exam.js"), "utf8");
assert(examJs.indexOf("function persistWrongUpgrade") >= 0, "exam.js must upgrade empty→wrong after scrape race");
assert(examJs.indexOf("lastScorePushKey === pushKey") >= 0 && examJs.indexOf("persistWrongUpgrade(incomingWrong)") >= 0, "duplicate score post must still accept later wrong[]");
assert(examJs.indexOf("wrongCaptureOf") >= 0, "exam.js must classify wrongCapture");

var resultsHtml = fs.readFileSync(path.join(__dirname, "..", "results.html"), "utf8");
assert(resultsHtml.indexOf("AI 错题讲解即将上线") < 0, "results.html must not stub-disable 查看错题");
assert(resultsHtml.indexOf("results-wrongs.js") >= 0, "results.html must load wrongs hub");
assert(resultsHtml.indexOf('id="results-wrongs"') >= 0, "results.html must have #results-wrongs");
assert(resultsHtml.indexOf("wrong-record.html?item=") >= 0, "results rows must link to wrong-record");
assert(resultsHtml.indexOf("hashchange") >= 0, "results must listen to hashchange");
assert(resultsHtml.indexOf('qs.get("event") ? "wrongs"') >= 0, "results ?event= opens wrongs tab");

var teacherJs = fs.readFileSync(path.join(__dirname, "..", "assets/js/teacher.js"), "utf8");
assert(teacherJs.indexOf("data-item") >= 0, "teacher 查看错题 must keep item fallback");
assert(teacherJs.indexOf("data-copy-wrong") >= 0, "teacher wrong list must be copyable");

console.log("ok: wrong capture");
console.log("");
console.log("冒烟要点（手工）:");
console.log("1. 上传 HTML 作业交卷 → 教师端「上传作业」查看错题有列表");
console.log("2. 真题阅读交卷（故意做错）→ 「查看错题」有题号/作答/正解，可复制");
console.log("3. 日历布置的 practice 交卷 → 「练习/全部」可见且带错题（非管理员老师）");
