/* TOEFL speaking — recorder + download helpers */
(function (w) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function recMime() {
    if (typeof MediaRecorder === "undefined") return "";
    var types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return "";
  }

  function extOf(mime) {
    return (mime || "").indexOf("mp4") >= 0 ? "m4a" : "webm";
  }

  function screensOf(paper) {
    return (paper.tasks || []).map(function (task) {
      return {
        type: task.type,
        task: task,
        module: task.module,
        from: task.id,
        to: task.id,
        nos: [task.id]
      };
    });
  }

  function saveBlob(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function prepSecs(task) {
    if (task && task.prepSec != null) return Number(task.prepSec);
    return task && task.type === "repeat" ? 3 : 0;
  }

  function recSecs(task) {
    if (task && task.type === "repeat") {
      return task.repeatSec != null ? Number(task.repeatSec) : 8;
    }
    return Number((task && task.speakSec) || 45);
  }

  function examPrompt(task) {
    // official: LR hides sample; interview hides the question. instruction stays on screen.
    return "";
  }

  function sceneOf(task) {
    return (task && task.image) || "";
  }

  function moduleIntro(paper, task) {
    if (!paper || !task) return null;
    var mods = paper.modules || [];
    for (var i = 0; i < mods.length; i++) {
      if (mods[i].n === task.module && mods[i].intro && mods[i].intro.audio) return mods[i].intro;
    }
    return null;
  }

  function playBeep() {
    var Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    var ctx = new Ctx();
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.frequency.value = 880;
    g.gain.value = 0.18;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    osc.onended = function () { try { ctx.close(); } catch (e) {} };
  }

  function playClip(clip, task, onEnded) {
    var done = false;
    var poll = null;
    function finish(fire) {
      if (done) return;
      done = true;
      try { clip.pause(); } catch (e) {}
      clip.onended = null;
      clip.onerror = null;
      clip.ontimeupdate = null;
      clip.onloadedmetadata = null;
      clip.onseeked = null;
      if (poll) { clearInterval(poll); poll = null; }
      if (fire) onEnded();
    }
    var from = task.fromSec != null ? Number(task.fromSec) : 0;
    var to = task.toSec != null ? Number(task.toSec) : null;
    clip.onended = function () { finish(true); };
    clip.onerror = function () { finish(true); };
    function armEnd() {
      if (to == null) return;
      function hitEnd() { return clip.currentTime + 0.05 >= from && clip.currentTime >= to; }
      clip.ontimeupdate = function () { if (hitEnd()) finish(true); };
      poll = setInterval(function () { if (hitEnd()) finish(true); }, 50);
    }
    function go() {
      function playNow() {
        armEnd();
        clip.play().catch(function () { finish(true); });
      }
      if (clip.readyState < 1) {
        clip.onloadedmetadata = go;
        return;
      }
      if (Math.abs((clip.currentTime || 0) - from) < 0.08) {
        playNow();
        return;
      }
      var armed = false;
      function afterSeek() {
        if (armed || done) return;
        armed = true;
        clip.onseeked = null;
        playNow();
      }
      clip.onseeked = afterSeek;
      try { clip.currentTime = from; } catch (e) { afterSeek(); }
      setTimeout(afterSeek, 400);
    }
    var src = task.audio || "";
    if (clip.getAttribute("data-src") !== src) {
      clip.removeAttribute("data-src");
      clip.src = encodeURI(src);
      clip.setAttribute("data-src", src);
      clip.onloadedmetadata = go;
    } else {
      go();
    }
    return function cancel() { finish(false); };
  }

  function fmtClock(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
  }

  var REC_KEY = "yysd:app-speak-recs";

  function blobOf(rec) {
    if (!rec) return null;
    if (typeof Blob !== "undefined" && rec instanceof Blob) return rec;
    return rec.blob || null;
  }

  function hasAudio(rec) {
    return !!(blobOf(rec) || (rec && rec.data));
  }

  function recFile(paper, id, mime) {
    return (paper && paper.id ? paper.id : "speaking") + "-q" + String(id).padStart(2, "0") + "." + extOf(mime);
  }

  function notesText(paper, recs) {
    var lines = [(paper.title || "TOEFL Speaking"), ""];
    (paper.tasks || []).forEach(function (t) {
      var rec = recs[t.id];
      lines.push("Q" + t.id + " · " + (t.type === "repeat" ? "Listen and Repeat" : "Interview"));
      if (t.stem) lines.push("Question: " + t.stem);
      if (t.sample) lines.push("Sample: " + t.sample);
      lines.push(hasAudio(rec) ? "Your audio: recorded" : "Your audio: (none)");
      lines.push("");
    });
    return lines.join("\n");
  }

  function readRecs() {
    try { return JSON.parse(sessionStorage.getItem(REC_KEY) || "{}") || {}; } catch (e) { return {}; }
  }

  function stashRecs(recs, done) {
    var ids = Object.keys(recs || {});
    var out = {};
    var i = 0;
    function next() {
      if (i >= ids.length) {
        try { sessionStorage.setItem(REC_KEY, JSON.stringify(out)); } catch (e) { /* ponytail: sessionStorage ~5MB; drop extras if a long interview pack overflows */ }
        if (done) done();
        return;
      }
      var id = ids[i++];
      var blob = blobOf(recs[id]);
      if (!blob || typeof FileReader === "undefined") { next(); return; }
      var r = new FileReader();
      r.onload = function () {
        out[id] = { data: r.result, mime: blob.type || (recs[id] && recs[id].mime) || "" };
        next();
      };
      r.onerror = next;
      r.readAsDataURL(blob);
    }
    next();
  }

  function exportRec(paper, id, rec) {
    if (!hasAudio(rec)) return;
    var name = recFile(paper, id, rec.mime);
    if (rec.data) {
      var a = document.createElement("a");
      a.href = rec.data;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    saveBlob(blobOf(rec), name);
  }

  function exportAll(paper, recs) {
    recs = recs || readRecs();
    saveBlob(new Blob([notesText(paper, recs)], { type: "text/plain" }), (paper && paper.id ? paper.id : "speaking") + "-speaking-notes.txt");
    var n = 0;
    (paper.tasks || []).forEach(function (t) {
      if (!hasAudio(recs[t.id])) return;
      n += 1;
      setTimeout(function () { exportRec(paper, t.id, recs[t.id]); }, 400 * n);
    });
  }

  w.YYSD_TOEFL_SPEAK = {
    esc: esc,
    recMime: recMime,
    extOf: extOf,
    screensOf: screensOf,
    saveBlob: saveBlob,
    notesText: notesText,
    readRecs: readRecs,
    stashRecs: stashRecs,
    exportRec: exportRec,
    exportAll: exportAll,
    prepSecs: prepSecs,
    recSecs: recSecs,
    examPrompt: examPrompt,
    sceneOf: sceneOf,
    moduleIntro: moduleIntro,
    playBeep: playBeep,
    playClip: playClip,
    fmtClock: fmtClock
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = w.YYSD_TOEFL_SPEAK;
    if (require.main === module) {
      var assert = require("assert");
      assert.strictEqual(prepSecs({ type: "repeat" }), 3);
      assert.strictEqual(prepSecs({ type: "interview" }), 0);
      assert.strictEqual(recSecs({ type: "repeat", speakSec: 15 }), 8);
      assert.strictEqual(recSecs({ type: "repeat", repeatSec: 10 }), 10);
      assert.strictEqual(recSecs({ type: "interview" }), 45);
      assert.strictEqual(examPrompt({ type: "repeat", sample: "Hi" }), "");
      assert.strictEqual(examPrompt({ type: "interview", stem: "Q?" }), "");
      assert.strictEqual(recFile({ id: "set-1" }, 3, "audio/webm"), "set-1-q03.webm");
      assert.ok(hasAudio({ data: "x" }));
      assert.ok(notesText({ title: "T", tasks: [{ id: 1, type: "repeat" }] }, { 1: { data: "x" } }).indexOf("recorded") >= 0);
      assert.ok(moduleIntro({ modules: [{ n: 1, intro: { audio: "a.mp3", fromSec: 0, toSec: 7 } }] }, { module: 1 }));
      assert.ok(!moduleIntro({ modules: [{ n: 1 }] }, { module: 1 }));
      console.log("toefl-speaking ok");
    }
  }
})(typeof window !== "undefined" ? window : global);
