"use strict";
/* Gate for TOEFL JSON before upload. Run: node scripts/check_toefl_paper.js [files...] */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

function same(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (String(a[i]) !== String(b[i])) return false;
  return true;
}

function audioOk(rel) {
  if (!rel) return false;
  if (fs.existsSync(path.join(root, rel)) || fs.existsSync(path.join(root, "app", rel))) return true;
  var dir = path.dirname(rel);
  // ponytail: mp3s often live only on the server; skip if the audio folder is not in this checkout
  return !fs.existsSync(path.join(root, dir)) && !fs.existsSync(path.join(root, "app", dir));
}

function passageText(task) {
  var parts = [];
  function add(s) { if (s) parts.push(String(s)); }
  add(task.transcript);
  (task.paras || []).forEach(function (p) { add(typeof p === "string" ? p : (p && p.t)); });
  (task.passage || []).forEach(function (p) {
    if (!p) return;
    add(p.t);
    add(p.word);
    add((p.prefix || "") + (p.answer || ""));
  });
  var L = task.layout || {};
  add(L.body);
  add(L.title);
  add(L.subtitle);
  (L.notes || []).forEach(add);
  (L.steps || []).forEach(add);
  (L.fields || []).forEach(function (f) { add(f.label); add(f.value); });
  (L.columns || []).forEach(function (c) {
    add(c.title);
    (c.lines || []).forEach(add);
  });
  return parts.join(" ");
}

function vocabWord(stem) {
  var m = String(stem || "").match(/the (?:word|phrase)\s+["“”‘’']([^"“”‘’']+)["“”‘’']/i);
  return m ? m[1].trim() : "";
}

function dailyNeedsBreaks(task) {
  var hint = String((task.instruction || "") + " " + ((task.layout || {}).kicker || "")).toLowerCase();
  return /email|notice|schedule|sign|flyer|poster|announcement|event/.test(hint);
}

function dailyStructured(task) {
  var L = task.layout || {};
  return (L.columns && L.columns.length) || (L.fields && L.fields.length) || (L.steps && L.steps.length) ||
    (L.body && /\n/.test(L.body));
}

function introAudios(paper) {
  var out = {};
  (paper.modules || []).forEach(function (m) {
    if (m && m.intro && m.intro.audio) out[m.intro.audio] = 1;
  });
  return out;
}

function sampleIsDirections(s) {
  s = String(s || "");
  return /repeat only once/i.test(s) || /listen to the \w+ and repeat/i.test(s);
}

function clipIsSceneReel(rel) {
  return /s-lr-intro|Set1-S-LR1 \(Gym\)|Set2-S-LR2\.mp3/i.test(rel || "");
}

function isBankFile(file) {
  return /^bank-/.test(path.basename(file));
}

function titlecaseChip(w) {
  var s = String(w || "");
  if (/^I('|$|\s)/.test(s) || /^[A-Z]{2,}$/.test(s)) return false;
  return /^[A-Z]/.test(s);
}

function writingBlob(t) {
  var parts = [];
  function add(s) { if (s) parts.push(String(s)); }
  add(t.context);
  add(t.prompt);
  add(t.instruction);
  add(t.to);
  add(t.subject);
  add(t.class);
  (t.parts || []).forEach(function (p) { add(p && p.t); });
  (t.bank || []).forEach(add);
  (t.answer || []).forEach(add);
  (t.bullets || []).forEach(add);
  if (t.professor) {
    add(t.professor.name);
    add(t.professor.text);
  }
  (t.posts || []).forEach(function (p) {
    if (!p) return;
    add(p.name);
    add(p.text);
  });
  return parts.join(" ");
}

var WRITE_HUD = /Question\s+\d+\s+of\s+\d+|WORD BANK|正确答案|BUILD A SENTENCE|Save Draft|Clear Draft|收藏|AI批改|Your Response:/i;
var WRITE_JUNK = /[▩▒�]/;
var WRITE_CJK = /[\u4e00-\u9fff]/;

function checkPhoto(rel, tag, errs) {
  if (!rel) return;
  if (!audioOk(rel)) errs.push(tag + " missing image " + rel);
}

function checkFile(file) {
  var abs = path.isAbsolute(file) ? file : path.join(root, file);
  var paper = JSON.parse(fs.readFileSync(abs, "utf8"));
  var errs = [];
  var seenClip = {};
  var seenSet = {};
  var intros = introAudios(paper);
  var bankPaper = isBankFile(abs);
  (paper.tasks || []).forEach(function (t, ti) {
    var tag = path.basename(abs) + " task[" + ti + "] id=" + (t.id || "?");
    if (t.type === "complete_words") {
      (t.passage || []).forEach(function (p) {
        if (!p || !p.id) return;
        if (!p.answer || !/^[A-Za-z]+$/.test(p.answer)) {
          errs.push(tag + " blank " + p.id + " needs letter answer (one slot per letter)");
        }
      });
    }
    if (t.type === "daily_life" && dailyNeedsBreaks(t) && !dailyStructured(t)) {
      errs.push(tag + " daily_life is one block — break email/notice/schedule with newlines or fields");
    }
    if (t.type === "sentence") {
      var slots = (t.parts || []).filter(function (p) { return p && p.slot; }).length;
      if (!t.context) errs.push(tag + " empty context");
      if (!t.answer || !t.answer.length) errs.push(tag + " no answer");
      if (!t.bank || !t.bank.length) errs.push(tag + " no bank");
      if (t.answer && slots !== t.answer.length) errs.push(tag + " slots " + slots + " != answer " + t.answer.length);
      if (t.answer && t.bank) {
        t.answer.forEach(function (w) {
          if (t.bank.indexOf(w) < 0) errs.push(tag + " answer missing from bank: " + w);
        });
        if (same(t.bank, t.answer)) errs.push(tag + " bank is answer order — scramble before upload");
      }
      if (bankPaper) {
        (t.bank || []).concat(t.answer || []).forEach(function (w) {
          if (titlecaseChip(w)) errs.push(tag + " titlecase chip " + w);
        });
      }
    }
    if (t.type === "email") {
      if (!t.prompt) errs.push(tag + " email missing prompt");
      if (!t.bullets || !t.bullets.length) errs.push(tag + " email missing bullets");
      if (!t.to) errs.push(tag + " email missing to");
      if (!t.subject) errs.push(tag + " email missing subject");
    }
    if (t.type === "discussion") {
      if (!t.professor || !t.professor.name || !t.professor.text) {
        errs.push(tag + " discussion missing professor name/text");
      }
      if (!t.posts || t.posts.length !== 2) errs.push(tag + " discussion needs 2 student posts");
      (t.posts || []).forEach(function (p, pi) {
        if (!p || !p.name || !p.text) errs.push(tag + " post[" + pi + "] missing name/text");
        checkPhoto(p && p.photo, tag + " post[" + pi + "]", errs);
      });
      checkPhoto(t.professor && t.professor.photo, tag + " professor", errs);
    }
    if (/^(sentence|email|discussion)$/.test(t.type || "")) {
      var blob = writingBlob(t);
      if (WRITE_HUD.test(blob)) errs.push(tag + " HUD/chrome leaked into writing text");
      if (WRITE_JUNK.test(blob)) errs.push(tag + " OCR junk in writing text");
      if (WRITE_CJK.test(blob)) errs.push(tag + " CJK in English writing fields");
    }
    if (t.set && /^(sentence|email|discussion)$/.test(t.type || "")) {
      if (seenSet[t.set]) errs.push(tag + " duplicate set id " + t.set);
      seenSet[t.set] = 1;
    }
    if (t.audio) {
      if (!audioOk(t.audio)) errs.push(tag + " missing audio " + t.audio);
    } else if (/^(choose_response|conversation|announcement|lecture|repeat|interview)$/.test(t.type || "")) {
      errs.push(tag + " missing audio");
    }
    if (t.type === "repeat") {
      var akey = (t.audio || "") + "\0" + (t.fromSec != null ? t.fromSec : "") + "\0" + (t.toSec != null ? t.toSec : "");
      if (seenClip[akey]) errs.push(tag + " Listen and Repeat shares this clip — one file or fromSec/toSec per sentence");
      seenClip[akey] = 1;
      if (t.audio && intros[t.audio]) errs.push(tag + " scene intro audio is a numbered question");
      if (clipIsSceneReel(t.audio)) errs.push(tag + " full scene reel or intro file used as a question");
      if (sampleIsDirections(t.sample)) errs.push(tag + " sample is directions text, not the sentence to repeat");
    }
    if (t.image && !audioOk(t.image)) errs.push(tag + " missing image " + t.image);
    (t.questions || []).forEach(function (q) {
      if (!q.answer) errs.push(tag + " Q" + q.id + " no answer");
      var opts = q.options || [];
      if (opts.length && opts[0] && opts[0].key && opts.map(function (o) { return o.key; }).indexOf(q.answer) < 0) {
        errs.push(tag + " Q" + q.id + " answer " + q.answer + " not in options");
      }
      var word = vocabWord(q.stem);
      if (word) {
        var re = new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
        if (!re.test(passageText(t))) {
          errs.push(tag + " Q" + q.id + " vocab \"" + word + "\" not in passage");
        }
      }
    });
  });
  if (errs.length) throw new Error(errs.join("\n"));
}

function speakingFiles() {
  var out = [];
  ["app/library/toefl", "library/toefl"].forEach(function (dir) {
    var abs = path.join(root, dir);
    if (!fs.existsSync(abs)) return;
    fs.readdirSync(abs).forEach(function (n) {
      if (/-speaking.*\.json$/.test(n)) out.push(path.join(dir, n));
    });
  });
  return out.sort();
}

function liveFiles() {
  var out = [];
  ["set-1", "set-2", "set-3", "set-4", "set-5", "set-6", "set-7", "set-8", "set-9", "set-10"].forEach(function (id) {
    ["reading", "listening", "writing", "speaking"].forEach(function (sk) {
      var rel = path.join("app/library/toefl", id + "-" + sk + ".json");
      if (fs.existsSync(path.join(root, rel))) out.push(rel);
    });
  });
  ["2025-07-16", "2025-09-02", "2025-09-19"].forEach(function (id) {
    ["reading", "listening", "writing", "speaking"].forEach(function (sk) {
      out.push(path.join("library/toefl", id + "-" + sk + ".json"));
    });
  });
  return out;
}

function bankFiles() {
  var dir = path.join(root, "app/library/toefl");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(function (n) {
    return /^bank-.*\.json$/.test(n);
  }).sort().map(function (n) {
    return path.join("app/library/toefl", n);
  });
}

function checkLive() {
  liveFiles().forEach(checkFile);
  bankFiles().forEach(checkFile);
}

function assertIntroGate() {
  var tmp = path.join(require("os").tmpdir(), "yysd-speak-intro-check.json");
  fs.writeFileSync(tmp, JSON.stringify({
    modules: [{ n: 1, intro: { audio: "library/toefl/audio/set-1-s-lr-intro.m4a" } }],
    tasks: [{ type: "repeat", id: 1, audio: "library/toefl/audio/set-1-s-lr-intro.m4a", sample: "Listen to the manager and repeat. Repeat only once." }]
  }));
  var threw = false;
  try { checkFile(tmp); } catch (e) { threw = /intro|directions/i.test(String(e.message)); }
  fs.unlinkSync(tmp);
  if (!threw) throw new Error("intro-as-question gate silent");
}

function assertMustFail(paper, re, label) {
  var tmp = path.join(require("os").tmpdir(), "bank-gate-check.json");
  fs.writeFileSync(tmp, JSON.stringify(paper));
  var threw = false;
  try { checkFile(tmp); } catch (e) { threw = re.test(String(e.message)); }
  fs.unlinkSync(tmp);
  if (!threw) throw new Error("writing gate silent: " + label);
}

function assertWritingGate() {
  var okSent = {
    type: "sentence", id: 1, set: "W-BS1-Q1", context: "A job posting is up.",
    parts: [{ slot: true }, { slot: true }, { t: " yet?" }],
    bank: ["for", "you"], answer: ["you", "for"]
  };
  assertMustFail({ tasks: [Object.assign({}, okSent, { bank: ["you", "Have"], answer: ["Have", "you"] })] }, /titlecase/, "titlecase");
  assertMustFail({ tasks: [Object.assign({}, okSent, { context: "WORD BANK" })] }, /HUD/, "hud");
  assertMustFail({ tasks: [Object.assign({}, okSent, { parts: [{ slot: true }, { t: " whether▩." }], bank: ["you"], answer: ["you"] })] }, /junk|slots/, "junk");
  assertMustFail({ tasks: [{ type: "email", id: 1, prompt: "Write.", bullets: ["Ask."] }] }, /missing to|missing subject/, "email");
  assertMustFail({
    tasks: [{ type: "discussion", id: 1, professor: { name: "Dr. Diaz", text: "What drives history?" }, posts: [{ name: "Andrew", text: "People." }] }]
  }, /2 student posts/, "discussion");
  assertMustFail({
    tasks: [
      Object.assign({}, okSent, { set: "W-AD73" }),
      Object.assign({}, okSent, { id: 2, set: "W-AD73", bank: ["it", "you"], answer: ["you", "it"] })
    ]
  }, /duplicate set/, "dup set");
  var ok = path.join(require("os").tmpdir(), "bank-gate-ok.json");
  fs.writeFileSync(ok, JSON.stringify({ tasks: [okSent] }));
  checkFile(ok);
  fs.unlinkSync(ok);
}

if (require.main === module) {
  var args = process.argv.slice(2);
  if (args.length) args.forEach(checkFile);
  else {
    checkLive();
    speakingFiles().forEach(checkFile);
  }
  assertIntroGate();
  assertWritingGate();
  console.log("ok toefl papers");
}

module.exports = { checkFile: checkFile, checkLive: checkLive, speakingFiles: speakingFiles, bankFiles: bankFiles };
