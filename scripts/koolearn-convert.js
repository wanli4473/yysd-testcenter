/* 新东方 26托福官方套题 view JSON → 引擎 schema 四科 JSON + 媒体下载清单。
   输入: /tmp/kl-out/kl-set-N-view.json (页内爬虫落盘)
   输出: library/toefl/kl-set-N-{reading,listening,writing,speaking}.json
        /tmp/kl-out/media-download.json [{url,dest}] */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const IN_DIR = "/tmp/kl-out";
const OUT_DIR = path.join(ROOT, "library", "toefl");
const AUDIO_DIR = "library/toefl/audio/kl";
const IMG_DIR = "library/toefl/img/kl";

const downloads = [];
const audioNames = new Set();
const imgNames = new Set();

function stripHtml(s, keepEdge) {
  const r = String(s || "")
    .replace(/<\/p>\s*<p[^>]*>/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n");
  // ponytail: keepEdge 保段间空格——CW 按 <a> 切段后各 chunk 的首尾空格是渲染所依赖的
  return keepEdge ? r : r.trim();
}

function oneLine(s) {
  return stripHtml(s).replace(/\s*\n\s*/g, " ").trim();
}

function localize(url, kind) {
  if (!url) return "";
  const base = url.split("/").pop().split("?")[0];
  const dir = kind === "audio" ? AUDIO_DIR : IMG_DIR;
  const seen = kind === "audio" ? audioNames : imgNames;
  if (!seen.has(base)) {
    seen.add(base);
    downloads.push({ url, dest: dir + "/" + base });
  }
  return dir + "/" + base;
}

function firstImg(html) {
  const m = String(html || "").match(/<img[^>]+src="([^"]+)"/i);
  return m ? m[1] : "";
}

function parasOf(article) {
  const html = String(article || "");
  const blocks = html.split(/<\/p>\s*/i).map(stripHtml).filter(Boolean);
  return blocks;
}

/* ---------- reading ---------- */
function convertReading(view, setNo) {
  const sec = view.list[0];
  const modules = [];
  const tasks = [];
  let qid = 0;

  sec.questionList.forEach((part, pi) => {
    const modNo = pi + 1;
    const timeSec = (part.channelList[0].examTime || 0) * (part.channelList[0].examTime > 90 ? 1 : 60);
    const from = qid + 1;

    part.channelList.forEach((ch) => {
      if (ch.qtype === 37) {
        ch.questionList.forEach((q) => {
          const segs = [];
          const re = /<a [^>]*>(.*?)<\/a>/i;
          let html = String(q.name || "");
          let m, prevEnd = 0, bi = 0;
          while ((m = html.slice(prevEnd).match(re))) {
            const abs = prevEnd + m.index;
            const before = stripHtml(html.slice(prevEnd, abs), true);
            if (before) segs.push({ t: before });
            bi += 1;
            const rv = (q.rightValue || [])[bi - 1] || {};
            const word = String(rv.optionName || "").trim();
            const mask = String(rv.optionValue || "");
            const star = mask.indexOf("*");
            const prefix = star >= 0 ? mask.slice(0, star) : "";
            const answer = star >= 0 ? mask.slice(star).replace(/\*/g, "") : word;
            segs.push({ id: qid + bi, prefix: prefix, answer: answer, word: word });
            prevEnd = abs + m[0].length;
          }
          const tail = stripHtml(html.slice(prevEnd), true);
          if (tail) segs.push({ t: tail });
          if (!segs.some((s) => s.id)) return;
          const n = segs.filter((s) => s.id).length;
          qid += n;
          tasks.push({
            type: "complete_words",
            module: modNo,
            instruction: oneLine(q.subTitle) || "Fill in the missing letters in the paragraph.",
            passage: segs
          });
        });
        return;
      }
      // qtype 11 choice channel
      const article = String((ch.questionBase || {}).article || "");
      const textLen = article.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim().length;
      const img = firstImg(article);
      const questions = ch.questionList.map((q) => {
        qid += 1;
        const opts = {};
        (q.optionList || []).forEach((o) => { opts[o.name] = oneLine(o.value); });
        const rv = (q.rightValue || [])[0] || {};
        return { id: qid, stem: oneLine(q.name), options: opts, answer: rv.optionName || "", explain: oneLine(q.textAnalysis) || "" };
      });
      const task = {
        type: "academic",
        module: modNo,
        instruction: oneLine((ch.questionBase || {}).subTitle) || "Read the passage.",
        questions: questions
      };
      if (textLen > 60) {
        task.title = oneLine((ch.questionBase || {}).subTitle) || "";
        task.paras = parasOf(article);
      } else if (img) {
        task.image = localize(img, "img");
      }
      tasks.push(task);
    });

    modules.push({ n: modNo, timeSec: timeSec, from: from, to: qid });
  });

  return {
    id: "kl-set-" + setNo,
    title: "托福官方套题 " + String(setNo).padStart(2, "0") + " · 阅读",
    set: "kl-" + String(setNo).padStart(2, "0"),
    skill: "reading",
    modules: modules,
    tasks: tasks
  };
}

/* ---------- listening ---------- */
function convertListening(view, setNo) {
  const sec = view.list[1];
  const modules = [];
  const tasks = [];
  let qid = 0;

  sec.questionList.forEach((part, pi) => {
    const modNo = pi + 1;
    const timeSec = (part.channelList[0].examTime || 20) * 60;
    const from = qid + 1;

    part.channelList.forEach((ch) => {
      const name = String(ch.channelName || "").trim();
      const isLR = /_LR_/.test(name);
      const instruction = oneLine((ch.questionBase || {}).subTitle) ||
        (isLR ? "Listen to a statement or question. Choose the best response." : "Listen to the recording.");

      const mp3Of = (q) => {
        const a = ((q && q.affixList) || []).filter((x) => /\.mp3$/i.test(x.affixUrl || ""))[0];
        return a ? a.affixUrl : "";
      };

      if (isLR) {
        ch.questionList.forEach((q) => {
          qid += 1;
          const opts = {};
          (q.optionList || []).forEach((o) => { opts[o.name] = oneLine(o.value); });
          const rv = (q.rightValue || [])[0] || {};
          tasks.push({
            type: "lecture",
            module: modNo,
            instruction: instruction,
            audio: localize(mp3Of(q), "audio"),
            questions: [{ id: qid, stem: oneLine(q.name), options: opts, answer: rv.optionName || "", explain: oneLine(q.textAnalysis) || "" }]
          });
        });
        return;
      }

      const audio = localize(mp3Of(ch.questionList[0]), "audio");
      const questions = ch.questionList.map((q) => {
        qid += 1;
        const opts = {};
        (q.optionList || []).forEach((o) => { opts[o.name] = oneLine(o.value); });
        const rv = (q.rightValue || [])[0] || {};
        return { id: qid, stem: oneLine(q.name), options: opts, answer: rv.optionName || "", explain: oneLine(q.textAnalysis) || "" };
      });
      tasks.push({ type: "lecture", module: modNo, instruction: instruction, audio: audio, questions: questions });
    });

    modules.push({ n: modNo, timeSec: timeSec, from: from, to: qid });
  });

  return {
    id: "kl-set-" + setNo,
    title: "托福官方套题 " + String(setNo).padStart(2, "0") + " · 听力",
    set: "kl-" + String(setNo).padStart(2, "0"),
    skill: "listening",
    modules: modules,
    tasks: tasks
  };
}

/* ---------- writing ---------- */
function convertWriting(view, setNo) {
  const sec = view.list[2];
  const tasks = [];
  let qid = 0;

  sec.questionList.forEach((part) => {
    part.channelList.forEach((ch) => {
      if (ch.qtype === 38) {
        ch.questionList.forEach((q) => {
          qid += 1;
          // name: table[context(img+text), response(img + ▩…template)]
          const cells = String(q.name || "").match(/<td>([\s\S]*?)<\/td>/gi) || [];
          const context = cells.length ? oneLine(cells[0]) : "";
          const respHtml = cells.length > 1 ? cells[1] : "";
          const respText = stripHtml(respHtml).replace(/\s+/g, " ").trim();
          const m = respText.match(/(▩+)\s*(.*)/);
          const slotN = m ? m[1].length : 0;
          const tail = m ? m[2] : respText;
          const parts = [];
          for (let i = 0; i < slotN; i++) parts.push({ slot: true });
          if (tail) parts.push({ t: tail.startsWith(" ") ? tail : " " + tail });
          const answer = (q.rightValue || []).slice().sort((a, b) => a.blockNo - b.blockNo).map((r) => String(r.optionValue || "").trim());
          const bank = (q.optionList || []).slice().sort((a, b) => a.rankNo - b.rankNo).map((o) => String(o.value || "").trim());
          tasks.push({ type: "sentence", module: 1, id: qid, context: context, parts: parts, bank: bank, answer: answer });
        });
        return;
      }
      // qtype 19: email / academic discussion
      ch.questionList.forEach((q) => {
        qid += 1;
        const article = String((ch.questionBase || {}).article || "");
        const name = String(q.name || "");
        if (/_Email|W_Email/i.test(ch.channelName) || /To:/i.test(name)) {
          const blocks = String(article).split(/<\/p>\s*/i).map(stripHtml).filter(Boolean);
          const prompt = blocks[0] || "";
          const bullets = blocks.filter((b) => /^\u25CF|^●/.test(b.trim())).map((b) => b.replace(/^\u25CF\s*|^●\s*/, "").trim());
          const to = (name.match(/To:\s*([^<]+)/i) || [])[1] || "";
          const subject = (name.match(/Subject:\s*([^<]+)/i) || [])[1] || "";
          tasks.push({
            type: "email", module: 2, id: qid,
            instruction: oneLine(q.subTitle) || "Write an email.",
            prompt: prompt,
            bullets: bullets,
            to: oneLine(to),
            subject: oneLine(subject),
            sample: ""
          });
          return;
        }
        // Academic Discussion
        const classM = article.match(/teaching a class on ([^.<]+)/i);
        const profFig = article.match(/<figure[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<figcaption>[\s\S]*?<strong>([^<]+)<\/strong>/i);
        const profText = (() => {
          const after = article.slice(article.lastIndexOf("</figure>") + 9);
          return oneLine(after);
        })();
        const posts = [];
        const rows = String(q.name || "").match(/<tr>([\s\S]*?)<\/tr>/gi) || [];
        rows.forEach((row) => {
          const imgM = row.match(/<img[^>]+src="([^"]+)"/i);
          const nameM = row.match(/<figcaption>[\s\S]*?<strong>([^<]+)<\/strong>/i);
          const tds = row.match(/<td>([\s\S]*?)<\/td>/gi) || [];
          const text = tds.length > 1 ? oneLine(tds[1]) : "";
          if (imgM && nameM) posts.push({ name: oneLine(nameM[1]), photo: localize(imgM[1], "img"), text: text });
        });
        const instrBlocks = String(article).split(/<\/p>\s*/i).map(stripHtml).filter(Boolean);
        const instruction = instrBlocks.filter((b) => /response| Express|contribution|100 words/i.test(b)).join("\n");
        tasks.push({
          type: "discussion", module: 3, id: qid,
          instruction: instruction || "Write for an Academic Discussion.",
          "class": classM ? classM[1].trim() : "Class Discussion",
          professor: profFig ? { name: oneLine(profFig[2]), photo: localize(profFig[1], "img"), text: profText } : { name: "", photo: "", text: profText },
          posts: posts,
          samples: []
        });
      });
    });
  });

  const sentenceCount = tasks.filter((t) => t.type === "sentence").length;
  return {
    id: "kl-set-" + setNo,
    title: "托福官方套题 " + String(setNo).padStart(2, "0") + " · 写作",
    set: "kl-" + String(setNo).padStart(2, "0"),
    skill: "writing",
    modules: [
      { n: 1, timeSec: 410, from: 1, to: sentenceCount, label: "Build a Sentence" },
      { n: 2, timeSec: 420, from: sentenceCount + 1, to: sentenceCount + 1, label: "Email" },
      { n: 3, timeSec: 420, from: sentenceCount + 2, to: sentenceCount + 2, label: "Academic Discussion" }
    ],
    tasks: tasks
  };
}

/* ---------- speaking ---------- */
function convertSpeaking(view, setNo) {
  const sec = view.list[3];
  const tasks = [];
  let qid = 0;

  sec.questionList.forEach((part) => {
    const isRepeat = /Repeat/i.test(part.partName || "");
    const modNo = isRepeat ? 1 : 2;
    part.channelList.forEach((ch) => {
      ch.questionList.forEach((q) => {
        qid += 1;
        const mp3 = ((q.affixList || []).filter((a) => /\.mp3$/i.test(a.affixUrl || ""))[0] || {}).affixUrl || "";
        const png = ((q.affixList || []).filter((a) => /\.(png|jpe?g)$/i.test(a.affixUrl || ""))[0] || {}).affixUrl || "";
        if (isRepeat) {
          tasks.push({
            type: "repeat", module: modNo, id: qid,
            instruction: oneLine(q.subTitle) || "Listen and repeat what the speaker says.",
            audio: localize(mp3, "audio"),
            sample: oneLine(q.name),
            image: localize(png, "img")
          });
        } else {
          tasks.push({
            type: "interview", module: modNo, id: qid,
            instruction: oneLine(q.subTitle) || "Please answer the interviewer's questions.",
            stem: oneLine(q.name),
            audio: localize(mp3, "audio"),
            sample: ""
          });
        }
      });
    });
  });

  const rep = tasks.filter((t) => t.type === "repeat").length;
  return {
    id: "kl-set-" + setNo,
    title: "托福官方套题 " + String(setNo).padStart(2, "0") + " · 口语",
    set: "kl-" + String(setNo).padStart(2, "0"),
    skill: "speaking",
    modules: [
      { n: 1, timeSec: 300, from: 1, to: rep, label: "Listen and Repeat" },
      { n: 2, timeSec: 360, from: rep + 1, to: tasks.length, label: "Take an Interview" }
    ],
    tasks: tasks
  };
}

/* ---------- main ---------- */
const summary = [];
for (let n = 1; n <= 15; n++) {
  const file = path.join(IN_DIR, "kl-set-" + n + "-view.json");
  if (!fs.existsSync(file)) { summary.push({ set: n, err: "missing view json" }); continue; }
  const view = JSON.parse(fs.readFileSync(file, "utf8"));
  const outs = {
    reading: convertReading(view, n),
    listening: convertListening(view, n),
    writing: convertWriting(view, n),
    speaking: convertSpeaking(view, n)
  };
  Object.entries(outs).forEach(([skill, paper]) => {
    fs.writeFileSync(path.join(OUT_DIR, "kl-set-" + n + "-" + skill + ".json"), JSON.stringify(paper));
  });
  const rv = (o) => JSON.stringify(o).length;
  summary.push({
    set: n,
    reading: { tasks: outs.reading.tasks.length, mods: outs.reading.modules.map((m) => m.timeSec) },
    listening: { tasks: outs.listening.tasks.length, mods: outs.listening.modules.map((m) => m.timeSec) },
    writing: { tasks: outs.writing.tasks.map((t) => t.type).join("/") },
    speaking: { tasks: outs.speaking.tasks.map((t) => t.type).join("/") },
    bytes: Object.values(outs).map(rv)
  });
}
fs.writeFileSync(path.join(IN_DIR, "media-download.json"), JSON.stringify(downloads, null, 1));
console.log(JSON.stringify(summary, null, 1));
console.log("downloads:", downloads.length, "audio:", audioNames.size, "img:", imgNames.size);
