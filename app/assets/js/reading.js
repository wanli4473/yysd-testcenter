/* TOEFL Set 58 reading — scorer + render helpers */
(function (w) {
  "use strict";

  function norm(s) {
    return String(s || "").replace(/\s+/g, "").toLowerCase();
  }

  function blanksOf(task) {
    return ((task && task.passage) || []).filter(function (x) { return x && x.id; });
  }

  function allItems(paper) {
    var out = [];
    (paper.tasks || []).forEach(function (task) {
      if (task.type === "complete_words") {
        blanksOf(task).forEach(function (b) {
          out.push({ no: b.id, type: "complete_words", task: task, blank: b });
        });
      } else {
        (task.questions || []).forEach(function (q) {
          out.push({ no: q.id, type: task.type, task: task, q: q });
        });
      }
    });
    return out.sort(function (a, b) { return a.no - b.no; });
  }

  function screensOf(paper) {
    var out = [];
    (paper.tasks || []).forEach(function (task) {
      if (task.type === "complete_words") {
        var blanks = blanksOf(task);
        out.push({
          type: "complete_words",
          task: task,
          module: task.module,
          from: blanks[0].id,
          to: blanks[blanks.length - 1].id,
          nos: blanks.map(function (b) { return b.id; })
        });
        return;
      }
      (task.questions || []).forEach(function (q) {
        out.push({
          type: task.type,
          task: task,
          q: q,
          module: task.module,
          from: q.id,
          to: q.id,
          nos: [q.id]
        });
      });
    });
    return out;
  }

  function matchBlank(blank, raw) {
    var v = norm(raw);
    if (!v) return false;
    return v === norm(blank.answer) || v === norm(blank.word) || v === norm((blank.prefix || "") + blank.answer);
  }

  function expectBlank(blank) {
    return blank.word || ((blank.prefix || "") + blank.answer);
  }

  function scorePaper(paper, answers) {
    var items = allItems(paper);
    var detail = [];
    var ok = 0;
    var wrong = [];
    items.forEach(function (it) {
      var ua = answers[it.no] == null ? "" : String(answers[it.no]);
      var hit = false;
      var ans = "";
      var stem = "";
      var explain = "";
      if (it.type === "complete_words") {
        hit = matchBlank(it.blank, ua);
        ans = expectBlank(it.blank);
        stem = "Complete the words: " + (it.blank.prefix || "") + "____";
        explain = (it.blank.prefix || "") + " + " + it.blank.answer + " → " + ans;
      } else {
        ans = it.q.answer;
        hit = norm(ua) === norm(ans);
        stem = it.q.stem || "";
        explain = it.q.explain || it.q.analysis || "";
      }
      if (hit) ok += 1;
      else {
        wrong.push({
          no: String(it.no),
          ua: ua || "（未作答）",
          ans: ans,
          stem: stem,
          explain: explain
        });
      }
      detail.push({ id: it.no, ok: hit, expect: ans, ua: ua });
    });
    return { score: ok, total: items.length, detail: detail, wrong: wrong };
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function vocabWord(q) {
    var m = String((q && q.stem) || "").match(/the (?:word|phrase)\s+["“”‘’']([^"“”‘’']+)["“”‘’']/i);
    return m ? m[1].trim() : "";
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function markFirst(escaped, word) {
    if (!word) return escaped;
    var hit = false;
    return escaped.replace(new RegExp("\\b(" + escapeRe(word) + ")\\b", "i"), function (m) {
      if (hit) return m;
      hit = true;
      return '<mark class="vocab-hl">' + m + "</mark>";
    });
  }

  function hl(s, word) {
    return '<span class="hl-body">' + markFirst(esc(s), word) + "</span>";
  }

  function savedSuffix(part, raw) {
    var v = String(raw == null ? "" : raw);
    var pre = part.prefix || "";
    if (pre && v.toLowerCase().indexOf(pre.toLowerCase()) === 0) return v.slice(pre.length);
    return v;
  }

  function bindLetterNav(host) {
    if (!host || !host.querySelectorAll) return;
    host.querySelectorAll(".blank").forEach(function (wrap) {
      var inputs = wrap.querySelectorAll(".blank-ch");
      Array.prototype.forEach.call(inputs, function (inp, i) {
        inp.addEventListener("input", function () {
          inp.value = String(inp.value || "").replace(/\s/g, "").slice(-1);
          if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
        });
        inp.addEventListener("keydown", function (ev) {
          if (ev.key === "Backspace" && !inp.value && i > 0) {
            ev.preventDefault();
            inputs[i - 1].value = "";
            inputs[i - 1].focus();
          } else if (ev.key === "ArrowLeft" && i > 0) {
            inputs[i - 1].focus();
          } else if (ev.key === "ArrowRight" && i < inputs.length - 1) {
            inputs[i + 1].focus();
          }
        });
        inp.addEventListener("paste", function (ev) {
          var text = ((ev.clipboardData || window.clipboardData).getData("text") || "").replace(/\s/g, "");
          if (!text) return;
          ev.preventDefault();
          for (var j = 0; j < text.length && i + j < inputs.length; j++) {
            inputs[i + j].value = text.charAt(j);
          }
          inputs[Math.min(i + text.length, inputs.length) - 1].focus();
        });
      });
    });
  }

  function renderBlanks(task, host, saved) {
    host.innerHTML = "";
    (task.passage || []).forEach(function (part) {
      if (part.t && !part.id) {
        var text = document.createElement("span");
        text.className = "hl-body";
        text.textContent = part.t;
        host.appendChild(text);
        return;
      }
      var wrap = document.createElement("span");
      var n = Math.max(1, (part.answer || "").length);
      wrap.className = "blank blank--letters";
      wrap.dataset.id = String(part.id);
      var pre = document.createElement("span");
      pre.className = "blank-pre";
      pre.textContent = part.prefix || "";
      wrap.appendChild(pre);
      var got = saved && saved[part.id] != null ? savedSuffix(part, saved[part.id]) : "";
      for (var i = 0; i < n; i++) {
        var inp = document.createElement("input");
        inp.type = "text";
        inp.className = "blank-ch";
        inp.maxLength = 1;
        inp.autocomplete = "off";
        inp.spellcheck = false;
        inp.setAttribute("aria-label", "blank " + part.id + " letter " + (i + 1));
        if (got.charAt(i)) inp.value = got.charAt(i);
        wrap.appendChild(inp);
      }
      host.appendChild(wrap);
    });
    bindLetterNav(host);
  }

  function collectBlanks(host) {
    var out = {};
    host.querySelectorAll(".blank").forEach(function (el) {
      var letters = el.querySelectorAll(".blank-ch");
      if (letters.length) {
        out[el.dataset.id] = Array.prototype.map.call(letters, function (i) { return i.value; }).join("");
      } else {
        var inp = el.querySelector("input");
        out[el.dataset.id] = inp ? inp.value : "";
      }
    });
    return out;
  }

  function paraHTML(p, showInsert, word) {
    if (typeof p === "string") return "<p>" + hl(p, word) + "</p>";
    var mark = "";
    if (showInsert && p.insert) {
      mark = '<button type="button" class="insert" data-insert="' + esc(p.insert) +
        '" aria-label="insert ' + esc(p.insert) + '">■ ' + esc(p.insert) + "</button> ";
    }
    if (!p.t) return mark ? "<p>" + mark + "</p>" : "";
    return "<p>" + mark + hl(p.t, word) + "</p>";
  }

  function dailyKind(task) {
    var L = task.layout || {};
    var kind = L.kind || "card";
    if (kind !== "card") return kind;
    var hint = String((L.kicker || "") + " " + (task.instruction || "")).toLowerCase();
    if (hint.indexOf("email") >= 0) return "email";
    if (/notice|announcement|flyer|poster|sign|schedule|event/.test(hint)) return "notice";
    if (hint.indexOf("course") >= 0) return "course";
    return "card";
  }

  function dailyHTML(task, word) {
    var L = task.layout || {};
    var kind = dailyKind(task);
    var out = '<div class="dl-card dl-card--' + esc(kind) + '">';
    if (L.kicker) out += '<p class="dl-kicker">' + hl(L.kicker, word) + "</p>";
    if (L.title) out += "<h2>" + hl(L.title, word) + "</h2>";
    if (L.subtitle) out += '<p class="dl-sub">' + hl(L.subtitle, word) + "</p>";
    if (L.body) out += '<p class="dl-body">' + hl(L.body, word) + "</p>";
    if (kind === "steps" && L.steps) {
      out += '<ol class="dl-steps">';
      L.steps.forEach(function (s, i) {
        out += '<li><span class="dl-n">' + (i + 1) + "</span>" + hl(s, word) + "</li>";
      });
      out += "</ol>";
    }
    if ((kind === "course" || kind === "poster") && L.fields) {
      out += '<div class="dl-fields dl-fields--' + L.fields.length + '">';
      L.fields.forEach(function (f) {
        out += '<div class="dl-field"><b>' + hl(f.label, word) + "</b><p>" + hl(f.value, word) + "</p></div>";
      });
      out += "</div>";
    }
    if (kind === "schedule" && L.columns) {
      out += '<div class="dl-cols">';
      L.columns.forEach(function (c) {
        out += '<div class="dl-col"><h3>' + hl(c.title, word) + "</h3><ul>";
        (c.lines || []).forEach(function (line) { out += "<li>" + hl(line, word) + "</li>"; });
        out += "</ul></div>";
      });
      out += "</div>";
    }
    (L.notes || []).forEach(function (n) { out += '<p class="dl-note">' + hl(n, word) + "</p>"; });
    out += "</div>";
    return out;
  }

  function taskKey(task) {
    return String((task && task.module) || "") + "|" + ((task && (task.title || task.type)) || "");
  }

  function highlightBodies(host) {
    return host ? host.querySelectorAll(".hl-body") : [];
  }

  function saveHighlights(task, host, store) {
    if (!store || !host) return;
    store[taskKey(task)] = Array.prototype.map.call(highlightBodies(host), function (el) {
      return el.innerHTML;
    });
  }

  function restoreHighlights(task, host, store) {
    if (!store || !host) return;
    var saved = store[taskKey(task)];
    if (!saved) return;
    var bodies = highlightBodies(host);
    for (var i = 0; i < bodies.length && i < saved.length; i++) bodies[i].innerHTML = saved[i];
  }

  function applySelectionHighlight(root) {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
    var range = sel.getRangeAt(0);
    var node = range.commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;
    var body = node && node.closest ? node.closest(".hl-body") : null;
    if (!body || !root.contains(body)) return false;
    if (!body.contains(range.startContainer) || !body.contains(range.endContainer)) return false;
    var mark = document.createElement("mark");
    mark.className = "hl";
    try {
      range.surroundContents(mark);
    } catch (e) {
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    }
    sel.removeAllRanges();
    return true;
  }

  function isInsertQ(q) {
    if (!q) return false;
    if (q.insert || q.kind === "insert") return true;
    return /four locations|where would the (?:following )?sentence best fit|could be added/i.test(q.stem || "");
  }

  function insertSentence(task, q) {
    if (task && task.insertSentence) return String(task.insertSentence);
    var lines = String((q && q.stem) || "").split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var skip = /four locations|best fit|could be added|select the best|following sentence/i;
    for (var i = 0; i < lines.length; i++) {
      if (!skip.test(lines[i])) return lines[i];
    }
    return "";
  }

  function blankReviewHTML(part, raw) {
    var ok = matchBlank(part, raw);
    var got = savedSuffix(part, raw);
    var key = part.answer || "";
    var inner = '<span class="blank-pre">' + esc(part.prefix || "") + "</span>";
    if (ok) {
      inner += '<span class="rev-blank-got">' + esc(got || key) + "</span>";
    } else if (!norm(raw)) {
      inner += '<span class="rev-blank-empty">' + Array(Math.max(1, key.length) + 1).join("·") + "</span>";
      inner += '<span class="rev-blank-key">' + esc(key) + "</span>";
    } else {
      inner += '<s class="rev-blank-got">' + esc(got) + "</s>";
      inner += '<span class="rev-blank-key">' + esc(key) + "</span>";
    }
    return '<span class="rev-blank ' + (ok ? "is-ok" : "is-bad") + '">' + inner + "</span>";
  }

  function renderBlanksReview(task, host, saved) {
    var html = "";
    (task.passage || []).forEach(function (part) {
      if (part.t && !part.id) {
        html += '<span class="hl-body">' + esc(part.t) + "</span>";
        return;
      }
      if (!part.id) return;
      html += blankReviewHTML(part, saved && saved[part.id]);
    });
    host.innerHTML = html;
  }

  function markInsertReview(host, q, ua, sentence) {
    if (!host || !q) return;
    var key = String(q.answer || "");
    var mine = String(ua || "");
    host.querySelectorAll(".insert").forEach(function (btn) {
      var k = btn.getAttribute("data-insert") || "";
      btn.disabled = true;
      if (k === key) btn.classList.add("is-key");
      if (mine && k === mine && mine !== key) btn.classList.add("is-mine");
    });
    var keyBtn = key && host.querySelector('.insert[data-insert="' + key + '"]');
    if (keyBtn && sentence) {
      var mark = document.createElement("mark");
      mark.className = "rev-insert-sent";
      mark.textContent = sentence;
      keyBtn.after(mark);
    }
  }

  function renderPassage(task, host, showInsert, q) {
    var word = vocabWord(q);
    if (task.image && !task.layout && !(task.paras || []).length) {
      host.innerHTML = '<img class="passage-img" src="' + esc(task.image) + '" alt="">';
      return;
    }
    if (task.layout) {
      host.innerHTML = dailyHTML(task, word);
      return;
    }
    var html = "";
    if (task.title) html += "<h2>" + esc(task.title) + "</h2>";
    (task.paras || []).forEach(function (p) { html += paraHTML(p, showInsert, word); });
    host.innerHTML = html;
  }

  function renderOptions(q, host, saved) {
    var keys = Object.keys(q.options || {});
    host.innerHTML = keys.map(function (k) {
      var checked = saved === k ? " checked" : "";
      return '<label class="opt"><input type="radio" name="q' + q.id + '" value="' +
        esc(k) + '"' + checked + "> <b>" + esc(k) + "</b> " + esc(q.options[k]) + "</label>";
    }).join("");
  }

  w.YYSD_TOEFL = {
    norm: norm,
    blanksOf: blanksOf,
    allItems: allItems,
    screensOf: screensOf,
    matchBlank: matchBlank,
    scorePaper: scorePaper,
    renderBlanks: renderBlanks,
    collectBlanks: collectBlanks,
    renderPassage: renderPassage,
    vocabWord: vocabWord,
    isInsertQ: isInsertQ,
    insertSentence: insertSentence,
    blankReviewHTML: blankReviewHTML,
    renderBlanksReview: renderBlanksReview,
    markInsertReview: markInsertReview,
    renderOptions: renderOptions,
    saveHighlights: saveHighlights,
    restoreHighlights: restoreHighlights,
    applySelectionHighlight: applySelectionHighlight,
    taskKey: taskKey,
    esc: esc
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = w.YYSD_TOEFL;
  }

  if (typeof require !== "undefined" && require.main === module) {
    var assert = require("assert");
    assert.strictEqual(isInsertQ({ kind: "insert" }), true);
    assert.strictEqual(isInsertQ({ insert: true }), true);
    assert.strictEqual(isInsertQ({ stem: "There are four locations [A]–[D] in the passage." }), true);
    assert.strictEqual(isInsertQ({ stem: 'The word "invaluable" in the passage is closest in meaning to' }), false);
    assert.strictEqual(insertSentence({ insertSentence: "Hello." }, {}), "Hello.");
    assert.strictEqual(insertSentence({}, {
      stem: "There are four locations.\nApplications are not limited.\nWhere would the sentence best fit?"
    }), "Applications are not limited.");
    var okHtml = blankReviewHTML({ prefix: "popul", answer: "ations", word: "populations" }, "ations");
    assert.ok(okHtml.indexOf("is-ok") >= 0);
    var badHtml = blankReviewHTML({ prefix: "popul", answer: "ations" }, "xxxx");
    assert.ok(badHtml.indexOf("is-bad") >= 0 && badHtml.indexOf("<s") >= 0);
    var emptyHtml = blankReviewHTML({ prefix: "popul", answer: "ations" }, "");
    assert.ok(emptyHtml.indexOf("rev-blank-empty") >= 0);
    console.log("ok reading-review-helpers");
  }
})(typeof window !== "undefined" ? window : global);
