#!/usr/bin/env node
"use strict";
/**
 * Koolearn 新托福（reform26）题库 → YYSD 免费题库
 *
 * 用法：
 *   node scripts/koolearn-crawl.js                # 全量 12 类（约 1389 题）
 *   node scripts/koolearn-crawl.js --limit=3      # 每类前 3 题（小样验证）
 *   node scripts/koolearn-crawl.js --labels=1322,1326
 *   node scripts/koolearn-crawl.js --no-media     # 不下载音频/图片
 *
 * 输出：
 *   app/library/toefl/free-<qid>-<skill>.json     # 每母题一卷（play.js 零改动复用）
 *   app/library/toefl/free/audio|img/<name>       # 媒体镜像
 *   app/library/toefl/free/index.json             # 免费题库索引（列表页用，仅全量跑写）
 *   app/library/toefl/free/report.json            # 爬取报告（错误汇总）
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "app", "library", "toefl");
const FREE_DIR = path.join(OUT_DIR, "free");
const INDEX_PATH = path.join(FREE_DIR, "index.json");
const REPORT_PATH = path.join(FREE_DIR, "report.json");

const SALT = "DFGHJKDJAGHHJFFKBJKBFAFAFAFAFBJBJfbhabvfa";
const HOST = "https://liuxue.koolearn.com";
const CDN = "https://daxue-cos.koocdn.com";
const FFMPEG = path.join(ROOT, "tools", "bin", "ffmpeg");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const LABELS = [
  { id: 1319, skill: "reading", type: "complete_words", en: "Complete the Words", zh: "阅读填空" },
  { id: 1320, skill: "reading", type: "daily_life", en: "Daily Life Reading", zh: "日常生活阅读" },
  { id: 1321, skill: "reading", type: "academic", en: "Academic Passage", zh: "学术阅读" },
  { id: 1322, skill: "listening", type: "choose_response", en: "Choose a Response", zh: "听答" },
  { id: 1323, skill: "listening", type: "conversation", en: "Conversation", zh: "对话" },
  { id: 1324, skill: "listening", type: "announcement", en: "Announcement", zh: "公告" },
  { id: 1325, skill: "listening", type: "lecture", en: "Lecture", zh: "学术讲座" },
  { id: 1326, skill: "writing", type: "sentence", en: "Build a Sentence", zh: "造句" },
  { id: 1329, skill: "writing", type: "email", en: "Write an Email", zh: "邮件" },
  { id: 1330, skill: "writing", type: "discussion", en: "Academic Discussion", zh: "学术讨论" },
  { id: 1331, skill: "speaking", type: "repeat", en: "Listen and Repeat", zh: "听与复述" },
  { id: 1332, skill: "speaking", type: "interview", en: "Interview", zh: "虚拟面试" },
];

// ---------- args ----------
function parseArgs() {
  const out = { labels: null, limit: 0, media: true };
  for (const a of process.argv.slice(2)) {
    let m;
    if ((m = a.match(/^--labels=(.+)$/))) out.labels = m[1].split(",").map((x) => Number(x.trim())).filter(Boolean);
    else if ((m = a.match(/^--limit=(\d+)$/))) out.limit = Number(m[1]);
    else if (a === "--no-media") out.media = false;
    else { console.error("unknown arg: " + a); process.exit(2); }
  }
  return out;
}

// ---------- koolearn api（签名算法复现自 kl-app.js asciiSort + chuguoapiParmasFormat）----------
function md5(s) { return crypto.createHash("md5").update(s).digest("hex").toUpperCase(); }

function validation(params, ts) {
  let s = "";
  for (const k of Object.keys(params).sort()) {
    const v = params[k];
    if (v == null) s += k + "=&";
    else s += k + "=" + v + "&";
  }
  s += "key=" + SALT + ts;
  return md5(s);
}

async function api(pathname, params = {}) {
  const ts = Date.now();
  const qs = new URLSearchParams({ ...params, validation: validation(params, ts) }).toString();
  const url = HOST + pathname + "?" + qs;
  const res = await fetch(url, {
    headers: { websiteCheckTime: String(ts), "user-agent": UA, accept: "application/json, text/plain, */*", referer: "https://liuxue.koolearn.com/toefl/new/read/" },
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { throw new Error("bad json: " + text.slice(0, 120)); }
  if (!res.ok || body.status !== 0) throw new Error("api " + res.status + " " + (body.message || ""));
  return body.data;
}

async function apiRetry(pathname, params, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await api(pathname, params); } catch (e) {
      last = e;
      await sleep(800 * (i + 1));
    }
  }
  throw last;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ---------- html helpers ----------
const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", bull: "•",
  ldquo: "\u201c", rdquo: "\u201d", lsquo: "\u2018", rsquo: "\u2019",
  mdash: "\u2014", ndash: "\u2013", hellip: "\u2026", rarr: "\u2192",
  middot: "\u00b7", times: "\u00d7", laquo: "\u00ab", raquo: "\u00bb",
};

function decodeEntities(s) {
  return String(s || "").replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return isNaN(cp) ? m : String.fromCodePoint(cp);
    }
    const hit = ENTITIES[e.toLowerCase()];
    return hit == null ? m : hit;
  });
}

// HTML → 纯文本，块级标签与 <br> 转 \n
function textOf(html) {
  let s = String(html || "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|table|section|article)>/gi, "\n");
  s = s.replace(/<(p|div|h[1-6]|li|tr|table|section|article)[^>]*>/gi, "\n");
  s = s.replace(/<[^>]*>/g, "");
  return decodeEntities(s);
}

// 单行压缩（选项 / 题干）
function oneLine(html) { return textOf(html).replace(/\s+/g, " ").trim(); }

// 段落化：非空行数组
function linesOf(html) {
  return textOf(html).split("\n").map((l) => l.replace(/[ \t\u00a0]+/g, " ").trim()).filter((l) => l !== "");
}

// 去 [#highlightN]...[/highlightN] 标记，保留内文
function stripHighlights(s) { return String(s || "").replace(/\[#highlight\d*\]/g, "").replace(/\[\/highlight\d*\]/g, ""); }

function mediaOf(html) {
  const s = String(html || "");
  const audios = [...s.matchAll(/<audio[^>]*?\ssrc=(["'])([^"']+)\1/gi)].map((m) => m[2]);
  const imgs = [...s.matchAll(/<img[^>]*?\ssrc=(["'])([^"']+)\1/gi)].map((m) => m[2]);
  const videos = [...s.matchAll(/<video[^>]*?\ssrc=(["'])([^"']+)\1/gi)].map((m) => m[2]);
  return { audios, imgs, videos };
}

function optionsOf(list) {
  const options = {};
  const byVal = {};
  for (const o of list || []) {
    const v = String(o.value || "").trim();
    const label = oneLine(o.label);
    options[v] = label;
    byVal[v] = label;
  }
  return { options, byVal };
}

function answerOf(qti) {
  const v = qti && qti.validation && qti.validation.valid_response && qti.validation.valid_response.value;
  return Array.isArray(v) ? v : [];
}

function numOf(name) {
  const m = String(name || "").match(/#\s*(\d+)/);
  return m ? Number(m[1]) : 0;
}

// ---------- media mirror plan ----------
const MEDIA = new Map(); // remote src -> { rel, remote, kind }

function planMedia(src, kind) {
  const s = String(src || "");
  if (!s.startsWith("/upload/")) return null;
  if (MEDIA.has(s)) return MEDIA.get(s);
  const ext = (path.basename(s).match(/\.(mp3|m4a|wav|png|jpe?g|gif|webp|mp4|webm)$/i) || [])[0];
  if (!ext) return null;
  const e = ext.toLowerCase();
  const base = path.basename(s, ext);
  let entry;
  if (e === ".mp3" || e === ".m4a" || e === ".wav") entry = { rel: "library/toefl/free/audio/" + path.basename(s), remote: s, kind: "audio" };
  else if (e === ".mp4" || e === ".webm") entry = { rel: "library/toefl/free/audio/" + base + ".mp3", remote: s, kind: "video" }; // 面试提问在 mp4 里，抽音轨
  else entry = { rel: "library/toefl/free/img/" + path.basename(s), remote: s, kind: "img" };
  MEDIA.set(s, entry);
  return entry;
}

function runFFmpeg(args) {
  const { spawnSync } = require("child_process");
  const r = spawnSync(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"], timeout: 120000 });
  return r.status === 0;
}

async function downloadMedia(entries, errors) {
  const jobs = entries.slice();
  let done = 0, failed = 0;
  const queue = jobs.slice();
  async function fetchTo(remote, dest) {
    let last;
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(CDN + remote, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60000) });
        if (!res.ok) throw new Error("http " + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length) throw new Error("empty");
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, buf);
        return;
      } catch (err) { last = err; await sleep(500 * (i + 1)); }
    }
    throw last;
  }
  async function worker() {
    while (queue.length) {
      const e = queue.shift();
      const dest = path.join(ROOT, "app", e.rel);
      try {
        if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { done++; continue; }
        if (e.kind === "video") {
          const tmp = path.join(require("os").tmpdir(), "kool-" + path.basename(e.remote));
          await fetchTo(e.remote, tmp);
          if (!runFFmpeg(["-y", "-loglevel", "error", "-i", tmp, "-vn", "-acodec", "libmp3lame", "-q:a", "4", dest])) {
            throw new Error("ffmpeg extract failed");
          }
          try { fs.unlinkSync(tmp); } catch {}
        } else {
          await fetchTo(e.remote, dest);
        }
        done++;
      } catch (err) {
        failed++;
        errors.push({ kind: "media", remote: e.remote, reason: String(err && err.message || err) });
      }
      if ((done + failed) % 100 === 0) process.stdout.write("  media " + (done + failed) + "/" + jobs.length + "\n");
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  return { done, failed };
}

// ---------- per-type builders ----------
function shell(meta, d, n) {
  return {
    id: "free-" + d.questionId,
    title: meta.en + " #" + n,
    set: "free",
    skill: meta.skill,
    titleZh: meta.zh + " #" + n,
    source: { site: "liuxue.koolearn.com", qid: d.questionId, labelId: meta.id, code: d.questionCode },
    modules: [{ n: 1, timeSec: 0, from: 1, to: 1 }],
    tasks: [],
  };
}

function buildCompleteWords(meta, d, errors) {
  const q = d.qtiObj;
  const n = numOf(d.questionName);
  const paper = shell(meta, d, n);
  const raw = textOf(q.stem);
  const letters = answerOf(q).map(String);
  let li = 0;
  const passage = [];
  const re = /\[#blank\]([\s\S]*?)\[\/blank\]/g;
  let last = 0, m, id = 0, ok = true;
  function pushText(t) {
    const s = t.replace(/\n+/g, " ").replace(/\s+/g, " ");
    if (s !== "") passage.push({ t: s });
  }
  while ((m = re.exec(raw))) {
    pushText(raw.slice(last, m.index));
    const content = m[1];
    const slots = (content.match(/\{\{response\}\}/g) || []).length;
    const prefix = content.replace(/\{\{response\}\}/g, "").replace(/\s+/g, " ").trim();
    if (!slots || !prefix) { ok = false; break; }
    const answer = letters.slice(li, li + slots).join("");
    li += slots;
    id += 1;
    passage.push({ id, prefix, answer, word: prefix + answer });
    last = m.index + m[0].length;
  }
  pushText(raw.slice(last));
  if (!ok || li !== letters.length || id < 1) {
    errors.push({ qid: d.questionId, kind: "complete_words", reason: "blank/letters mismatch: consumed " + li + "/" + letters.length + " blanks=" + id });
    return null;
  }
  const T = { type: "complete_words", module: 1, title: "Complete the Words", instruction: "Fill in the missing letters in the paragraph.", passage, analysis: oneLine(q.analysis), titleZh: meta.zh };
  paper.tasks.push(T);
  return paper;
}

function buildDailyLife(meta, d, errors) {
  const q = d.qtiObj;
  const n = numOf(d.questionName);
  const paper = shell(meta, d, n);
  const lines = linesOf(q.stem);
  let instruction = "Read the passage.";
  if (lines.length && /^read/i.test(lines[0]) && lines[0].length <= 90) { instruction = lines[0]; lines.shift(); }
  const km = instruction.match(/read (?:an?|the following)\s+([a-z ]+?)\.?$/i);
  let kicker = km ? km[1].trim() : "";
  if (kicker) kicker = kicker.charAt(0).toUpperCase() + kicker.slice(1);
  if (kicker.length > 24) kicker = "";
  const questions = [];
  for (const [i, c] of (d.childrenQuestionList || []).entries()) {
    const cq = c.qtiObj;
    const { options } = optionsOf(cq.options);
    const ans = answerOf(cq).map(String);
    if (!options[ans[0]]) { errors.push({ qid: d.questionId, kind: "daily_life", reason: "answer " + ans[0] + " not in options (child " + (i + 1) + ")" }); continue; }
    questions.push({ id: i + 1, stem: oneLine(cq.stem), options, answer: ans[0], analysis: oneLine(cq.analysis) });
  }
  if (!questions.length) { errors.push({ qid: d.questionId, kind: "daily_life", reason: "no questions" }); return null; }
  paper.tasks.push({
    type: "daily_life", module: 1, title: "Daily Life", instruction,
    layout: { kind: "card", kicker, title: "", body: lines.join("\n") },
    questions,
  });
  return paper;
}

function buildAcademic(meta, d, errors) {
  const q = d.qtiObj;
  const n = numOf(d.questionName);
  const paper = shell(meta, d, n);
  const html = stripHighlights(q.stem);
  const tm = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const title = tm ? oneLine(tm[1]) : "Academic Passage #" + n;
  const paras = [];
  for (const pm of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = oneLine(pm[1]);
    if (t) paras.push(t);
  }
  if (!paras.length) {
    const rest = oneLine(html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, ""));
    if (rest) paras.push(rest);
  }
  const questions = [];
  for (const [i, c] of (d.childrenQuestionList || []).entries()) {
    const cq = c.qtiObj;
    const { options } = optionsOf(cq.options);
    const ans = answerOf(cq).map(String);
    if (!options[ans[0]]) { errors.push({ qid: d.questionId, kind: "academic", reason: "answer " + ans[0] + " not in options (child " + (i + 1) + ")" }); continue; }
    questions.push({ id: i + 1, stem: oneLine(cq.stem), options, answer: ans[0], analysis: oneLine(cq.analysis) });
  }
  if (!paras.length || !questions.length) { errors.push({ qid: d.questionId, kind: "academic", reason: "paras=" + paras.length + " questions=" + questions.length }); return null; }
  paper.tasks.push({ type: "academic", module: 1, title, instruction: "Read the passage.", paras, questions });
  return paper;
}

function buildChooseResponse(meta, d, errors) {
  const q = d.qtiObj;
  const n = numOf(d.questionName);
  const paper = shell(meta, d, n);
  const stemText = linesOf(q.stem);
  const audioSrc = mediaOf(q.stem).audios[0];
  const audio = audioSrc ? planMedia(audioSrc, "audio") : null;
  const { options } = optionsOf(q.options);
  const ans = answerOf(q).map(String)[0];
  if (!options[ans]) { errors.push({ qid: d.questionId, kind: "choose_response", reason: "answer " + ans + " not in options" }); return null; }
  if (!audio) errors.push({ qid: d.questionId, kind: "choose_response", reason: "no audio" });
  paper.tasks.push({
    type: "choose_response", module: 1, title: meta.en + " #" + n,
    instruction: "Choose the best response.",
    audio: audio ? audio.rel : "",
    questions: [{
      id: 1, stem: "Choose the best response.", options, answer: ans,
      transcript: stemText.join(" "),
      stemZh: oneLine(q.listen_text),
      analysis: oneLine(q.analysis),
    }],
  });
  return paper;
}

function buildListenGroup(meta, d, errors) {
  const q = d.qtiObj;
  const n = numOf(d.questionName);
  const paper = shell(meta, d, n);
  const meta2 = meta.type === "conversation" ? "Listen to a conversation."
    : meta.type === "announcement" ? oneLine(q.stem)
      : oneLine(q.stem);
  const audioSrc = mediaOf(q.stem).audios[0];
  const audio = audioSrc ? planMedia(audioSrc, "audio") : null;
  if (!audio) errors.push({ qid: d.questionId, kind: meta.type, reason: "no audio" });
  let tLines = linesOf(q.listen_text);
  if (tLines.length && /^listen/i.test(tLines[0])) tLines = tLines.slice(1);
  const questions = [];
  for (const [i, c] of (d.childrenQuestionList || []).entries()) {
    const cq = c.qtiObj;
    const { options } = optionsOf(cq.options);
    const ans = answerOf(cq).map(String)[0];
    if (!options[ans]) { errors.push({ qid: d.questionId, kind: meta.type, reason: "answer " + ans + " not in options (child " + (i + 1) + ")" }); continue; }
    questions.push({ id: i + 1, stem: oneLine(cq.stem), options, answer: ans, analysis: oneLine(cq.analysis) });
  }
  if (!questions.length) { errors.push({ qid: d.questionId, kind: meta.type, reason: "no questions" }); return null; }
  paper.tasks.push({
    type: meta.type, module: 1, title: meta.en + " #" + n,
    instruction: meta2,
    audio: audio ? audio.rel : "",
    transcript: tLines.join("\n"),
    questions,
  });
  return paper;
}

function buildSentence(meta, d, errors) {
  const q = d.qtiObj;
  const n = numOf(d.questionName);
  const paper = shell(meta, d, n);
  const raw = textOf(q.stem).replace(/\s+/g, " ").trim();
  const first = raw.indexOf("[#blank]");
  if (first < 0) { errors.push({ qid: d.questionId, kind: "sentence", reason: "no blanks" }); return null; }
  const context = raw.slice(0, first).trim();
  const rest = raw.slice(first);
  const parts = [];
  const re = /\[#blank\]\s*(\d+)\s*\[\/blank\]/g;
  let last = 0, m;
  const seq = [];
  while ((m = re.exec(rest))) {
    const t = rest.slice(last, m.index).replace(/\s+/g, " ");
    if (t !== "") parts.push({ t });
    parts.push({ slot: true });
    seq.push(Number(m[1]));
    last = m.index + m[0].length;
  }
  const tail = rest.slice(last).replace(/\s+/g, " ");
  if (tail !== "") parts.push({ t: tail });
  const { byVal } = optionsOf(q.options);
  const groups = answerOf(q);
  const answer = groups.map((g) => byVal[String(g[0])]).filter((x) => x != null);
  const bank = Object.keys(byVal).sort().map((k) => byVal[k]);
  const slots = parts.filter((p) => p.slot).length;
  if (!context || slots !== answer.length || !answer.length) {
    errors.push({ qid: d.questionId, kind: "sentence", reason: "slots=" + slots + " answers=" + answer.length + " ctx=" + !!context });
    return null;
  }
  paper.tasks.push({
    type: "sentence", module: 1, id: 1, context, parts, bank, answer,
    analysis: oneLine(q.analysis), title: "Build a Sentence", titleZh: meta.zh,
  });
  return paper;
}

function bulletsAndPrompt(stemHtml) {
  const lines = linesOf(stemHtml);
  let cut = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^•/.test(lines[i])) cut = i;
    else if (cut >= 0) break;
  }
  const bullets = [];
  const promptLines = [];
  lines.forEach((l, i) => {
    if (cut >= 0 && i >= cut && /^•/.test(l)) bullets.push(l.replace(/^•\s*/, ""));
    else if (/^•/.test(l)) promptLines.push("- " + l.replace(/^•\s*/, ""));
    else promptLines.push(l);
  });
  return { prompt: promptLines.join("\n"), bullets };
}

function buildEmail(meta, d, errors) {
  const q = d.qtiObj;
  const n = numOf(d.questionName);
  const paper = shell(meta, d, n);
  const { prompt, bullets } = bulletsAndPrompt(q.stem);
  const stander = textOf(q.stander || "").replace(/\s+/g, " ").trim();
  const to = (stander.match(/To:\s*(.+?)(?:\.\s*Subject:|\.$|$)/i) || [])[1];
  const subject = (stander.match(/Subject:\s*(.+?)\.?\s*$/i) || [])[1];
  if (!to || !subject) errors.push({ qid: d.questionId, kind: "email", reason: "stander parse: to=" + !!to + " subject=" + !!subject });
  paper.tasks.push({
    type: "email", module: 2, id: 1,
    instruction: bullets.length ? "Write an email. In your email, do the following:" : "Write an email.",
    prompt, bullets,
    to: (to || "").trim(), subject: (subject || "").trim(),
    sample: textOf(q.reference || "").trim(),
    analysis: oneLine(q.analysis),
    title: "Write an Email", titleZh: meta.zh,
  });
  return paper;
}

function buildDiscussion(meta, d, errors) {
  const q = d.qtiObj;
  const n = numOf(d.questionName);
  const paper = shell(meta, d, n);
  const html = String(q.stem || "");
  const cm = textOf(html).match(/teaching a class on ([^.]+)\./i);
  const cls = cm ? cm[1].trim().replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  const names = [];
  const re = /<strong[^>]*>([\s\S]*?)<\/strong>/gi;
  let m;
  while ((m = re.exec(html))) {
    const name = oneLine(m[1]);
    if (!name || /[:：]/.test(name) || /following|response|should/i.test(name)) continue;
    names.push({ name, start: m.index + m[0].length });
  }
  if (!names.length) { errors.push({ qid: d.questionId, kind: "discussion", reason: "no speaker strong tags" }); return null; }
  const blocks = names.map((nm, i) => {
    const end = i + 1 < names.length ? html.indexOf("<strong", nm.start) : html.length;
    const body = oneLine(html.slice(nm.start, end < 0 ? html.length : end));
    return { name: nm.name, text: body };
  });
  const professor = blocks[0];
  const posts = blocks.slice(1).filter((b) => b.text);
  if (!professor.text || !posts.length) { errors.push({ qid: d.questionId, kind: "discussion", reason: "prof=" + !!professor.text + " posts=" + posts.length }); return null; }
  paper.tasks.push({
    type: "discussion", module: 3, id: 1,
    class: cls,
    instruction: "Write a discussion response. An effective response contains at least 100 words.",
    professor: { name: professor.name, text: professor.text },
    posts,
    sample: textOf(q.reference || "").trim(),
    analysis: oneLine(q.analysis),
    title: "Academic Discussion", titleZh: meta.zh,
  });
  return paper;
}

// child stem 尾部英文句（repeat 的 sample）
function tailSentence(stemHtml) {
  const lines = linesOf(stemHtml);
  return lines.length ? lines[lines.length - 1] : "";
}

function buildRepeat(meta, d, errors) {
  const q = d.qtiObj;
  const n = numOf(d.questionName);
  const paper = shell(meta, d, n);
  const instrLines = linesOf(q.stem);
  const instruction = instrLines.join(" ").replace(/\s+/g, " ");
  const tasks = [];
  for (const [i, c] of (d.childrenQuestionList || []).entries()) {
    const cq = c.qtiObj;
    const mm = mediaOf(cq.stem);
    const audioSrc = mm.audios[0] || mm.videos[0];
    const imgSrc = mm.imgs.find((s) => !/\.(mp4|webm)$/i.test(s));
    const audio = audioSrc ? planMedia(audioSrc, "audio") : null;
    const img = imgSrc ? planMedia(imgSrc, "img") : null;
    if (!audio) errors.push({ qid: d.questionId, kind: "repeat", reason: "no audio (child " + (i + 1) + ")" });
    const sample = tailSentence(cq.stem);
    const prep = Number(cq.reading_time && cq.reading_time.time) || 0;
    const recSec = Number(cq.recording_time && cq.recording_time.time) || 0;
    const zh = oneLine(cq.pre_stem || "");
    tasks.push({
      type: "repeat", module: 1, id: i + 1,
      speakSec: recSec || 8, repeatSec: recSec || 8, prepSec: prep || 3,
      instruction,
      audio: audio ? audio.rel : "",
      sample,
      image: img ? img.rel : "",
      analysis: zh ? "中文：" + zh + "\n复述：" + sample : "复述：" + sample,
      title: "Listen and Repeat", titleZh: meta.zh,
    });
  }
  if (!tasks.length) { errors.push({ qid: d.questionId, kind: "repeat", reason: "no children" }); return null; }
  paper.modules = [{ n: 1, timeSec: 0, from: 1, to: tasks.length }];
  paper.tasks = tasks;
  return paper;
}

function buildInterview(meta, d, errors) {
  const q = d.qtiObj;
  const n = numOf(d.questionName);
  const paper = shell(meta, d, n);
  const tasks = [];
  for (const [i, c] of (d.childrenQuestionList || []).entries()) {
    const cq = c.qtiObj;
    const mm = mediaOf(cq.stem);
    const audioSrc = mm.audios[0] || mm.videos[0];
    const imgSrc = mm.imgs.find((s) => !/\.(mp4|webm)$/i.test(s));
    const audio = audioSrc ? planMedia(audioSrc, "audio") : null;
    const img = imgSrc ? planMedia(imgSrc, "img") : null;
    if (!audio) errors.push({ qid: d.questionId, kind: "interview", reason: "no audio (child " + (i + 1) + ")" });
    const stem = linesOf(cq.stem).join(" ").replace(/\s+/g, " ");
    const prep = Number(cq.reading_time && cq.reading_time.time) || 0;
    const recSec = Number(cq.recording_time && cq.recording_time.time) || 0;
    const zh = oneLine(cq.pre_stem || "");
    tasks.push({
      type: "interview", module: 2, id: i + 1,
      speakSec: recSec || 45, prepSec: prep || 0,
      instruction: "Listen to the question, then respond.",
      audio: audio ? audio.rel : "",
      stem, sample: oneLine(cq.reference || ""),
      image: img ? img.rel : "",
      analysis: zh ? "中文：" + zh : "",
      title: "Interview", titleZh: meta.zh,
    });
  }
  if (!tasks.length) { errors.push({ qid: d.questionId, kind: "interview", reason: "no children" }); return null; }
  paper.modules = [{ n: 2, timeSec: 0, from: 1, to: tasks.length }];
  paper.tasks = tasks;
  return paper;
}

const BUILDERS = {
  complete_words: buildCompleteWords,
  daily_life: buildDailyLife,
  academic: buildAcademic,
  choose_response: buildChooseResponse,
  conversation: buildListenGroup,
  announcement: buildListenGroup,
  lecture: buildListenGroup,
  sentence: buildSentence,
  email: buildEmail,
  discussion: buildDiscussion,
  repeat: buildRepeat,
  interview: buildInterview,
};

// ---------- run ----------
async function main() {
  const args = parseArgs();
  const labels = LABELS.filter((l) => !args.labels || args.labels.includes(l.id));
  if (!labels.length) { console.error("no labels selected"); process.exit(2); }
  fs.mkdirSync(FREE_DIR, { recursive: true });

  const errors = [];
  const index = { generated: new Date().toISOString().slice(0, 10), source: "liuxue.koolearn.com", sections: [] };
  const skills = { reading: "阅读", listening: "听力", writing: "写作", speaking: "口语" };
  let okCount = 0, failCount = 0;

  for (const meta of labels) {
    const list = await apiRetry("/chuguoapi/toefl/reform26/question/getQuestionList", { labelId: meta.id });
    let items = list || [];
    if (args.limit) items = items.slice(0, args.limit);
    console.log("\n== " + meta.id + " " + meta.zh + " (" + items.length + "/" + (list || []).length + ")");
    const group = { labelId: meta.id, name: meta.zh, en: meta.en, skill: meta.skill, count: 0, items: [] };
    let i = 0;
    for (const it of items) {
      i++;
      let d;
      try {
        d = await apiRetry("/chuguoapi/toefl/reform26/question/info", { questionId: it.questionId });
      } catch (e) {
        failCount++;
        errors.push({ qid: it.questionId, kind: meta.type, reason: "detail: " + e.message });
        continue;
      }
      let paper = null;
      try {
        paper = BUILDERS[meta.type](meta, d, errors);
      } catch (e) {
        errors.push({ qid: it.questionId, kind: meta.type, reason: "convert: " + e.message });
      }
      if (!paper) { failCount++; continue; }
      const file = path.join(OUT_DIR, paper.id + "-" + meta.skill + ".json");
      fs.writeFileSync(file, JSON.stringify(paper, null, 1));
      okCount++;
      group.count++;
      group.items.push({ id: paper.id, qid: it.questionId, n: numOf(d.questionName), difficulty: it.difficultyKlbName || "", topic: it.topicKlbName || "" });
      if (i % 20 === 0) process.stdout.write("  " + i + "/" + items.length + "\n");
      await sleep(120);
    }
    let sec = index.sections.find((s) => s.skill === meta.skill);
    if (!sec) { sec = { skill: meta.skill, name: skills[meta.skill], groups: [] }; index.sections.push(sec); }
    sec.groups.push(group);
  }

  if (!args.labels && !args.limit) {
    fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 1));
    console.log("\nindex → " + path.relative(ROOT, INDEX_PATH));
  }

  if (args.media && MEDIA.size) {
    console.log("\nmedia: " + MEDIA.size + " unique files");
    const r = await downloadMedia([...MEDIA.values()], errors);
    console.log("media done=" + r.done + " failed=" + r.failed);
  }

  const report = { at: new Date().toISOString(), papers: okCount, failed: failCount + errors.filter((e) => e.kind !== "media").length, errors };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 1));
  console.log("\nDONE papers=" + okCount + " fail=" + failCount + " errors=" + errors.length + " report → " + path.relative(ROOT, REPORT_PATH));
  if (errors.length) {
    console.log("first errors:");
    errors.slice(0, 12).forEach((e) => console.log("  " + JSON.stringify(e)));
  }
  process.exit(errors.some((e) => e.kind !== "media") ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
