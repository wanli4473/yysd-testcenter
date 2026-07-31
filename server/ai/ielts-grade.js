/**
 * IELTS grade channel helpers (DashScope / Bailian).
 * ponytail: keep grading logic out of the giant server.js switchboard.
 */
"use strict";

var fs = require("fs");
var path = require("path");

var PROMPT_VERSION = process.env.AI_PROMPT_VERSION || "ielts-v1";
var DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

var RUBRIC_DIR = path.join(__dirname, "rubrics");
var rubricCache = {};

function loadRubric(kind) {
  if (rubricCache[kind]) return rubricCache[kind];
  var file = path.join(RUBRIC_DIR, kind === "speaking" ? "speaking.md" : "writing.md");
  try {
    rubricCache[kind] = fs.readFileSync(file, "utf8");
  } catch (e) {
    rubricCache[kind] = "";
  }
  return rubricCache[kind];
}

function apiKey() {
  return process.env.DASHSCOPE_API_KEY || "";
}

function chatModel() {
  return process.env.DASHSCOPE_MODEL || "qwen-plus";
}

function gradeModel() {
  return process.env.DASHSCOPE_GRADE_MODEL || "qwen-max";
}

function vlModel() {
  return process.env.DASHSCOPE_VL_MODEL || "qwen-vl-max";
}

function omniModel() {
  return process.env.DASHSCOPE_OMNI_MODEL || "qwen-omni-turbo";
}

function omniVoice() {
  return process.env.DASHSCOPE_OMNI_VOICE || "Ethan";
}

async function dashscopeChat(messages, opts) {
  opts = opts || {};
  var key = apiKey();
  if (!key) throw new Error("DASHSCOPE_API_KEY 未配置");
  var body = {
    model: opts.model || chatModel(),
    messages: messages,
    temperature: opts.temperature == null ? 0.2 : opts.temperature
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.modalities) body.modalities = opts.modalities;
  if (opts.audio) body.audio = opts.audio;
  if (opts.stream) {
    body.stream = true;
    body.stream_options = { include_usage: true };
    return streamChat(key, body);
  }
  var res = await fetch(DASHSCOPE_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  var data = await res.json();
  if (!res.ok) throw new Error((data && data.error && data.error.message) || "DashScope 请求失败");
  var content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : null;
  if (content == null || content === "") throw new Error("AI 返回为空");
  return { text: typeof content === "string" ? content : JSON.stringify(content), raw: data };
}

async function streamChat(key, body) {
  var res = await fetch(DASHSCOPE_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    var errBody = await res.text();
    var msg = "DashScope 流式请求失败";
    try {
      var j = JSON.parse(errBody);
      msg = (j.error && j.error.message) || j.message || msg;
    } catch (e) {}
    throw new Error(msg);
  }
  var text = "";
  var audioB64 = "";
  var buf = "";
  var reader = res.body.getReader();
  var dec = new TextDecoder();
  while (true) {
    var chunk = await reader.read();
    if (chunk.done) break;
    buf += dec.decode(chunk.value, { stream: true });
    var parts = buf.split("\n");
    buf = parts.pop() || "";
    for (var i = 0; i < parts.length; i++) {
      var line = parts[i].trim();
      if (!line || line === "data: [DONE]") continue;
      if (line.indexOf("data: ") === 0) line = line.slice(6);
      try {
        var ev = JSON.parse(line);
        var delta = ev.choices && ev.choices[0] && ev.choices[0].delta;
        if (!delta) continue;
        if (typeof delta.content === "string") text += delta.content;
        if (delta.audio && delta.audio.data) audioB64 += delta.audio.data;
      } catch (e) { /* skip partial */ }
    }
  }
  if (!text && !audioB64) throw new Error("AI 流式返回为空");
  return { text: text, audioBase64: audioB64 || null };
}

function evidenceWritingAddon() {
  return (
    "\nEvidence-first (mandatory):\n" +
    "- Each criteriaNotes.* must quote a short student phrase as evidence.\n" +
    "- Avoid vague praise like 「词汇丰富」without a quote.\n" +
    "- promptVersion=" + PROMPT_VERSION + "\n"
  );
}

function evidenceSpeakingAddon() {
  return (
    "\nEvidence-first (mandatory):\n" +
    "- For each of FC/LR/GRA/PR cite a short transcript quote or audio observation.\n" +
    "- Pronunciation: if audio is attached, judge from audio (stress, linking, sound clarity); " +
    "do NOT treat STT typos as pronunciation errors.\n" +
    "- promptVersion=" + PROMPT_VERSION + "\n"
  );
}

function wrapWritingSystem(baseSystem) {
  var rubric = loadRubric("writing");
  return baseSystem + "\n\n--- RUBRIC FILE ---\n" + rubric + evidenceWritingAddon();
}

function wrapSpeakingSystem(baseSystem) {
  var rubric = loadRubric("speaking");
  return baseSystem + "\n\n--- RUBRIC FILE ---\n" + rubric + evidenceSpeakingAddon();
}

/** Multimodal VL chat for Task 1 chart grading */
async function gradeWritingWithVision(system, essay, chartImageDataUrl) {
  var userContent = [
    { type: "text", text: "Student essay to grade (do not invent missing sentences):\n\n" + essay + "\n\nRespond with WRITING_JSON: only." }
  ];
  if (chartImageDataUrl && String(chartImageDataUrl).indexOf("data:image") === 0) {
    userContent.unshift({
      type: "image_url",
      image_url: { url: chartImageDataUrl }
    });
    userContent.unshift({
      type: "text",
      text: "Task 1 chart image is attached. Use it for TA data accuracy. Do not invent numbers not visible in the image."
    });
  }
  return dashscopeChat(
    [
      { role: "system", content: wrapWritingSystem(system) },
      { role: "user", content: userContent }
    ],
    { model: chartImageDataUrl ? vlModel() : gradeModel(), temperature: 0.25, maxTokens: 4500 }
  );
}

async function gradeText(system, user, opts) {
  opts = opts || {};
  return dashscopeChat(
    [
      { role: "system", content: opts.speaking ? wrapSpeakingSystem(system) : wrapWritingSystem(system) },
      { role: "user", content: user }
    ],
    { model: gradeModel(), temperature: opts.temperature == null ? 0.25 : opts.temperature, maxTokens: opts.maxTokens || 4000 }
  );
}

/** Speaking grade with optional audio (Omni/VL-audio path via multimodal content) */
async function gradeSpeaking(system, textUser, audioDataUrl) {
  if (audioDataUrl && String(audioDataUrl).indexOf("data:") === 0) {
    var fmt = "wav";
    if (/data:audio\/webm/i.test(audioDataUrl)) fmt = "webm";
    else if (/data:audio\/mpeg|data:audio\/mp3/i.test(audioDataUrl)) fmt = "mp3";
    else if (/data:audio\/ogg/i.test(audioDataUrl)) fmt = "ogg";
    var content = [
      { type: "input_audio", input_audio: { data: audioDataUrl, format: fmt } },
      { type: "text", text: textUser }
    ];
    try {
      return await dashscopeChat(
        [
          { role: "system", content: wrapSpeakingSystem(system) },
          { role: "user", content: content }
        ],
        {
          model: omniModel(),
          temperature: 0.2,
          maxTokens: 4000,
          modalities: ["text"],
          stream: true
        }
      );
    } catch (e) {
      // ponytail: fall back to text-only grade model if Omni rejects format
      console.error("[ielts-grade] omni speaking grade fallback", e.message);
    }
  }
  return gradeText(system, textUser, { speaking: true, temperature: 0.2 });
}

/** Omni live turn: audio in → text (+ optional audio) out */
async function omniTurn(system, history, audioDataUrl, textFallback) {
  var messages = [{ role: "system", content: system }];
  (history || []).slice(-16).forEach(function (m) {
    messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
  });
  if (audioDataUrl && String(audioDataUrl).indexOf("data:") === 0) {
    var fmt = "webm";
    if (/data:audio\/wav/i.test(audioDataUrl)) fmt = "wav";
    else if (/data:audio\/mpeg|data:audio\/mp3/i.test(audioDataUrl)) fmt = "mp3";
    messages.push({
      role: "user",
      content: [
        { type: "input_audio", input_audio: { data: audioDataUrl, format: fmt } },
        { type: "text", text: textFallback || "Continue the IELTS speaking interaction. Respond as your role requires." }
      ]
    });
  } else {
    messages.push({ role: "user", content: textFallback || "..." });
  }
  return dashscopeChat(messages, {
    model: omniModel(),
    temperature: 0.4,
    modalities: ["text", "audio"],
    audio: { voice: omniVoice(), format: "wav" },
    stream: true
  });
}

function maeBands(pairs) {
  // pairs: [{human, ai}]
  if (!pairs.length) return { mae: null, n: 0 };
  var sum = 0;
  var n = 0;
  pairs.forEach(function (p) {
    var h = Number(p.human);
    var a = Number(p.ai);
    if (!isFinite(h) || !isFinite(a)) return;
    sum += Math.abs(h - a);
    n += 1;
  });
  return { mae: n ? Math.round((sum / n) * 100) / 100 : null, n: n };
}

module.exports = {
  PROMPT_VERSION: PROMPT_VERSION,
  loadRubric: loadRubric,
  chatModel: chatModel,
  gradeModel: gradeModel,
  vlModel: vlModel,
  omniModel: omniModel,
  dashscopeChat: dashscopeChat,
  wrapWritingSystem: wrapWritingSystem,
  wrapSpeakingSystem: wrapSpeakingSystem,
  gradeWritingWithVision: gradeWritingWithVision,
  gradeText: gradeText,
  gradeSpeaking: gradeSpeaking,
  omniTurn: omniTurn,
  maeBands: maeBands
};
