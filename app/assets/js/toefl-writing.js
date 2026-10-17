/* TOEFL writing — sentence chips + essay screens */
(function (w) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function slotCount(task) {
    return (task.parts || []).filter(function (p) { return p.slot; }).length;
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

  function chipLabel(w) {
    var s = String(w || "");
    if (/^I('|$|\s)/.test(s) || /^[A-Z]{2,}$/.test(s)) return s;
    return s.replace(/^[A-Z]/, function (c) { return c.toLowerCase(); });
  }

  function foldWord(w) {
    return String(w || "").toLowerCase();
  }

  function sameSeq(got, want) {
    if (!got || got.length !== want.length) return false;
    for (var i = 0; i < want.length; i++) {
      if (foldWord(got[i]) !== foldWord(want[i])) return false;
    }
    return true;
  }

  function filledSlots(arr) {
    if (!arr || !arr.length) return false;
    for (var i = 0; i < arr.length; i++) if (!String(arr[i] || "").trim()) return false;
    return true;
  }

  function wordCount(s) {
    return String(s || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function scorePaper(paper, answers) {
    var detail = [];
    var ok = 0;
    var sentenceN = 0;
    (paper.tasks || []).forEach(function (task) {
      if (task.type === "sentence") {
        sentenceN += 1;
        var ua = answers[task.id] || [];
        var hit = sameSeq(ua, task.answer);
        if (hit) ok += 1;
        detail.push({
          id: task.id,
          type: "sentence",
          ok: hit,
          ua: (ua || []).filter(Boolean).join(" "),
          expect: (task.answer || []).join(" ")
        });
      } else {
        var text = String(answers[task.id] || "");
        detail.push({
          id: task.id,
          type: task.type,
          ok: null,
          ua: text,
          expect: "",
          words: wordCount(text),
          sample: task.sample || "",
          samples: task.samples || []
        });
      }
    });
    return { score: ok, total: sentenceN, detail: detail };
  }

  function shownBank(task) {
    if (task._shownBank) return task._shownBank;
    var src = (task.bank || []).slice();
    for (var i = src.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = src[i];
      src[i] = src[j];
      src[j] = tmp;
    }
    task._shownBank = src;
    return src;
  }

  function unusedBank(task, filled) {
    var used = {};
    (filled || []).forEach(function (w) {
      if (!w) return;
      var k = foldWord(w);
      used[k] = (used[k] || 0) + 1;
    });
    var leftover = [];
    shownBank(task).forEach(function (w) {
      var k = foldWord(w);
      if (used[k]) used[k] -= 1;
      else leftover.push(w);
    });
    return leftover;
  }

  function renderSentence(task, host, saved) {
    var filled = (saved && saved.slice) ? saved.slice() : [];
    var n = slotCount(task);
    while (filled.length < n) filled.push("");
    var html = '<p class="sc-context"><b>Context:</b> ' + esc(task.context || "") + "</p>";
    html += '<p class="sc-response">';
    var si = 0;
    (task.parts || []).forEach(function (p) {
      if (p.slot) {
        var v = filled[si] || "";
        html += '<button type="button" class="sc-slot' + (v ? " is-on" : "") + '" data-i="' + si + '">' +
          (v ? esc(chipLabel(v)) : "______") + "</button>";
        si += 1;
      } else html += esc(p.t || "");
    });
    html += "</p><div class=\"sc-bank\">";
    unusedBank(task, filled).forEach(function (w) {
      html += '<button type="button" class="sc-chip" data-w="' + esc(w) + '">' + esc(chipLabel(w)) + "</button>";
    });
    html += "</div>";
    host.innerHTML = html;
    return filled;
  }

  function collectSentence(host, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var el = host.querySelector('.sc-slot[data-i="' + i + '"]');
      var on = el && el.classList.contains("is-on");
      out.push(on ? String(el.textContent || "").trim() : "");
    }
    return out;
  }

  w.YYSD_TOEFL_WRITE = {
    esc: esc,
    screensOf: screensOf,
    slotCount: slotCount,
    chipLabel: chipLabel,
    sameSeq: sameSeq,
    filledSlots: filledSlots,
    wordCount: wordCount,
    scorePaper: scorePaper,
    unusedBank: unusedBank,
    renderSentence: renderSentence,
    collectSentence: collectSentence
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = w.YYSD_TOEFL_WRITE;
  }
})(typeof window !== "undefined" ? window : global);
