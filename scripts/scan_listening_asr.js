#!/usr/bin/env node
/* ASR scan listening clips; flag truncated openings. */
require("dotenv").config({ path: process.argv[3] || require("path").join(__dirname, "../server/.env") });
const fs = require("fs");
const path = require("path");

const key = process.env.DASHSCOPE_API_KEY;
const model = process.env.DASHSCOPE_ASR_MODEL || "qwen3-asr-flash";
const dir = process.argv[2] || "/tmp/listening_audit_clips";
const mode = process.argv[4] || "start";
if (!key) {
  console.error("no DASHSCOPE_API_KEY");
  process.exit(1);
}

function looksBadStart(text) {
  var t = (text || "").trim();
  if (!t || t.length < 8) return { bad: true, reason: "too-short" };
  if (/section\s*\d|now turn to section|you will hear (a|an)|this is the ielts listening|first you have some time to look|listen carefully and answer/i.test(t)) {
    return { bad: false, reason: "instructions" };
  }
  if (/^(hello|hi[, ]|good (morning|afternoon|evening)|excuse me|welcome|right[,.]|okay?[,.]|my name|this is|ladies and gentlemen|can i help|how can i help)/i.test(t)) {
    return { bad: false, reason: "dialogue-open" };
  }
  if (/^(and |but |so |or |of |to |the |a |an |two |three |the cycle camp|that has been done|but you must|to ask your advice|so what)/i.test(t)) {
    return { bad: true, reason: "mid-sentence" };
  }
  return { bad: false, reason: "unclear" };
}

function looksBadDialogue(text) {
  var t = (text || "").trim();
  if (!t || t.length < 12) return { bad: true, reason: "too-short" };
  if (/\b(good morning|good afternoon|hello|hi[, ]|how can i help|can i help you)\b/i.test(t)) {
    return { bad: false, reason: "has-greeting" };
  }
  if (/now listen carefully|look at questions|you will hear|answer questions/i.test(t) &&
      !/\b(hello|hi[, ]|good morning|excuse me)\b/i.test(t)) {
    return { bad: false, reason: "still-instructions" };
  }
  if (/^(hello|hi[, ]|good (morning|afternoon|evening)|excuse me|can i help|how can i help|my name|this is)/i.test(t)) {
    return { bad: false };
  }
  if (/^(and |but |so |or |of |to |the |a |an |two |three |the cycle camp|to ask your advice|so what)/i.test(t)) {
    return { bad: true, reason: "mid-sentence" };
  }
  return { bad: false };
}

const looks = mode === "dialogue" ? looksBadDialogue : looksBadStart;

async function asr(file) {
  var audio = "data:audio/mpeg;base64," + fs.readFileSync(file).toString("base64");
  var r = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      input: { messages: [{ role: "user", content: [{ audio: audio }] }] },
      parameters: { asr_options: { language: "en", enable_itn: true } }
    })
  });
  var j = await r.json();
  try {
    return j.output.choices[0].message.content.map(function (p) { return p.text || ""; }).join(" ");
  } catch (e) {
    return "";
  }
}

(async function () {
  var files = fs.readdirSync(dir).filter(function (f) { return f.endsWith(".mp3"); }).sort();
  console.log("files", files.length, "mode", mode);
  var bad = [], ok = [], empty = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var t = await asr(path.join(dir, f));
    var verdict = looks(t);
    var row = { file: f, text: (t || "").slice(0, 200), verdict: verdict };
    if (!t) empty.push(row);
    else if (verdict.bad) bad.push(row);
    else ok.push(row);
    process.stdout.write(".");
  }
  console.log("\nOK", ok.length, "BAD", bad.length, "EMPTY", empty.length);
  bad.forEach(function (r) {
    console.log("BAD", r.file, r.verdict.reason || "", "\n ", r.text, "\n");
  });
  empty.forEach(function (r) { console.log("EMPTY", r.file); });
  var out = path.join(dir, "report_" + mode + ".json");
  fs.writeFileSync(out, JSON.stringify({ mode: mode, ok: ok, bad: bad, empty: empty }, null, 2));
  console.log("wrote", out);
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
