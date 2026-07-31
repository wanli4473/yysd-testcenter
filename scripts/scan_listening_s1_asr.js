#!/usr/bin/env node
/* Scan Section-1 dialogue-start ASR clips; flag likely truncated openings. */
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const key = process.env.DASHSCOPE_API_KEY;
const model = process.env.DASHSCOPE_ASR_MODEL || "qwen3-asr-flash";
const dir = process.argv[2] || "/tmp/asr_s1";
if (!key) {
  console.error("no DASHSCOPE_API_KEY");
  process.exit(1);
}

function looksTruncated(text) {
  var t = (text || "").trim();
  if (!t || t.length < 12) return { bad: true, reason: "too-short" };
  // still in exam instructions — dialogue not reached yet in this window
  if (/now listen carefully|look at questions|you will hear|answer questions|transfer your answers|this is the ielts/i.test(t) &&
      !/\b(hello|hi[, ]|good morning|excuse me)\b/i.test(t)) {
    return { bad: false, reason: "still-instructions", retry: true };
  }
  if (/^(hello|hi[, ]|good (morning|afternoon|evening)|excuse me|now listen|now turn|you will hear|it('?s| is) (great|nice)|welcome|right[,.]|okay?[,.]|for my|today|well[, ]|thanks|thank you|yes[,.]|oh (hello|hi)|my name|this is|ladies|can I|could I|I'd like|I want|I need|I've got|I have|we're|we are|um |uh )/i.test(t)) {
    return { bad: false };
  }
  if (/^(and |but |so |or |of |to |the |a |an |two |three |four |five |that |which |who |when |where |because |as well|also |just |really |very |I('?ve| have) been meaning)/i.test(t)) {
    return { bad: true, reason: "mid-sentence" };
  }
  return { bad: false };
}

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
  console.log("files", files.length);
  var bad = [];
  var ok = [];
  var empty = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var t = await asr(path.join(dir, f));
    var verdict = looksTruncated(t);
    var row = { file: f, text: (t || "").slice(0, 180), verdict: verdict };
    if (!t) empty.push(row);
    else if (verdict.bad) bad.push(row);
    else ok.push(row);
    process.stdout.write(".");
  }
  console.log("\n\nOK", ok.length, "BAD", bad.length, "EMPTY", empty.length);
  console.log("\n=== BAD ===");
  bad.forEach(function (r) {
    console.log(r.file + " [" + r.verdict.reason + "]\n  " + r.text + "\n");
  });
  console.log("=== EMPTY ===");
  empty.forEach(function (r) { console.log(r.file); });
  fs.writeFileSync("/tmp/asr_s1_report.json", JSON.stringify({ ok: ok, bad: bad, empty: empty }, null, 2));
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
