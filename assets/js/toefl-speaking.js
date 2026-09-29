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

  function notesText(paper, recs) {
    var lines = [(paper.title || "TOEFL Speaking"), ""];
    (paper.tasks || []).forEach(function (t) {
      var rec = recs[t.id];
      lines.push("Q" + t.id + " · " + (t.type === "repeat" ? "Listen and Repeat" : "Interview"));
      if (t.stem) lines.push("Question: " + t.stem);
      if (t.sample) lines.push("Sample: " + t.sample);
      lines.push(rec && rec.blob ? "Your audio: recorded" : "Your audio: (none)");
      lines.push("");
    });
    return lines.join("\n");
  }

  w.YYSD_TOEFL_SPEAK = {
    esc: esc,
    recMime: recMime,
    extOf: extOf,
    screensOf: screensOf,
    saveBlob: saveBlob,
    notesText: notesText
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = w.YYSD_TOEFL_SPEAK;
  }
})(typeof window !== "undefined" ? window : global);
