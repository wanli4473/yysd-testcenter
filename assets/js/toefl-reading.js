/* TOEFL reading — scorer + render. Shared by toefl-reading.html */
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
    if (v === norm(blank.answer) || v === norm(blank.word) || v === norm((blank.prefix || "") + blank.answer)) {
      return true;
    }
    var alts = blank.alts || [];
    for (var i = 0; i < alts.length; i++) if (v === norm(alts[i])) return true;
    return false;
  }

  function expectBlank(blank) {
    return blank.word || ((blank.prefix || "") + blank.answer);
  }

  function rawTo30(score, total) {
    if (!total) return 0;
    return Math.round(score / total * 30);
  }

  // ponytail: ETS 不公开原始分表；用官网 0–30 → 1–6 对照，标预估
  function bandFrom30(n) {
    if (n >= 29) return 6;
    if (n >= 27) return 5.5;
    if (n >= 24) return 5;
    if (n >= 22) return 4.5;
    if (n >= 18) return 4;
    if (n >= 12) return 3.5;
    if (n >= 6) return 3;
    if (n >= 4) return 2.5;
    if (n >= 3) return 2;
    if (n >= 2) return 1.5;
    return 1;
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
        explain = it.blank.explain || "";
      } else {
        ans = it.q.answer;
        hit = norm(ua) === norm(ans);
        stem = it.q.stem || "";
        explain = it.q.explain || "";
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
      detail.push({ id: it.no, ok: hit, expect: ans, ua: ua, stem: stem, explain: explain });
    });
    var scaled = rawTo30(ok, items.length);
    return {
      score: ok,
      total: items.length,
      detail: detail,
      wrong: wrong,
      scaled30: scaled,
      band: bandFrom30(scaled)
    };
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function hl(s) {
    return '<span class="hl-body">' + esc(s) + "</span>";
  }

  function renderBlanks(task, host, saved) {
    host.innerHTML = "";
    if (task.title) {
      var h = document.createElement("h2");
      h.textContent = task.title;
      host.appendChild(h);
    }
    (task.passage || []).forEach(function (part) {
      if (part.t && !part.id) {
        var text = document.createElement("span");
        text.className = "hl-body";
        text.textContent = part.t;
        host.appendChild(text);
        return;
      }
      var wrap = document.createElement("span");
      wrap.className = "blank" + ((part.answer || "").length > 5 ? " is-long" : "");
      wrap.dataset.id = String(part.id);
      var pre = document.createElement("span");
      pre.className = "blank-pre";
      pre.textContent = part.prefix || "";
      var inp = document.createElement("input");
      inp.type = "text";
      inp.autocomplete = "off";
      inp.spellcheck = false;
      inp.maxLength = Math.max(12, (part.answer || "").length + 4);
      inp.setAttribute("aria-label", "blank " + part.id);
      if (saved && saved[part.id] != null) inp.value = saved[part.id];
      wrap.appendChild(pre);
      wrap.appendChild(inp);
      host.appendChild(wrap);
    });
  }

  function collectBlanks(host) {
    var out = {};
    host.querySelectorAll(".blank").forEach(function (el) {
      var inp = el.querySelector("input");
      out[el.dataset.id] = inp ? inp.value : "";
    });
    return out;
  }

  function paraHTML(p, showInsert) {
    if (typeof p === "string") return "<p>" + hl(p) + "</p>";
    var mark = "";
    if (showInsert && p.insert) {
      mark = '<button type="button" class="insert" data-insert="' + esc(p.insert) +
        '" aria-label="insert ' + esc(p.insert) + '">' + esc(p.insert) + "</button> ";
    }
    if (!p.t) return mark ? "<p>" + mark + "</p>" : "";
    return "<p>" + mark + hl(p.t) + "</p>";
  }

  function dailyHTML(task) {
    var L = task.layout || {};
    var kind = L.kind || "card";
    var out = '<div class="dl-card dl-card--' + esc(kind) + '">';
    if (L.kicker) out += '<p class="dl-kicker">' + hl(L.kicker) + "</p>";
    if (L.title) out += "<h2>" + hl(L.title) + "</h2>";
    if (L.subtitle) out += '<p class="dl-sub">' + hl(L.subtitle) + "</p>";
    if (L.body) out += "<p>" + hl(L.body) + "</p>";
    if (kind === "steps" && L.steps) {
      out += '<ol class="dl-steps">';
      L.steps.forEach(function (s, i) {
        out += '<li><span class="dl-n">' + (i + 1) + "</span>" + hl(s) + "</li>";
      });
      out += "</ol>";
    }
    if ((kind === "course" || kind === "poster") && L.fields) {
      out += '<div class="dl-fields dl-fields--' + L.fields.length + '">';
      L.fields.forEach(function (f) {
        out += '<div class="dl-field"><b>' + hl(f.label) + "</b><p>" + hl(f.value) + "</p></div>";
      });
      out += "</div>";
    }
    if (kind === "schedule" && L.columns) {
      out += '<div class="dl-cols">';
      L.columns.forEach(function (c) {
        out += '<div class="dl-col"><h3>' + hl(c.title) + "</h3><ul>";
        (c.lines || []).forEach(function (line) { out += "<li>" + hl(line) + "</li>"; });
        out += "</ul></div>";
      });
      out += "</div>";
    }
    (L.notes || []).forEach(function (n) { out += '<p class="dl-note">' + hl(n) + "</p>"; });
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

  function selectionRange(root) {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !root) return null;
    var range = sel.getRangeAt(0);
    var node = range.commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;
    var body = node && node.closest ? node.closest(".hl-body") : null;
    if (!body || !root.contains(body)) return null;
    if (!body.contains(range.startContainer) || !body.contains(range.endContainer)) return null;
    return range;
  }

  function selectionHitsHighlight(root) {
    var range = selectionRange(root);
    if (!range) return false;
    var marks = root.querySelectorAll("mark.hl");
    for (var i = 0; i < marks.length; i++) {
      try { if (range.intersectsNode(marks[i])) return true; } catch (e) {}
    }
    return false;
  }

  function applySelectionHighlight(root) {
    var range = selectionRange(root);
    if (!range || selectionHitsHighlight(root)) return false;
    var mark = document.createElement("mark");
    mark.className = "hl";
    try {
      range.surroundContents(mark);
    } catch (e) {
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    }
    window.getSelection().removeAllRanges();
    return true;
  }

  function removeSelectionHighlight(root) {
    var range = selectionRange(root);
    if (!range) return false;
    var hit = [];
    var marks = root.querySelectorAll("mark.hl");
    var i;
    for (i = 0; i < marks.length; i++) {
      try { if (range.intersectsNode(marks[i])) hit.push(marks[i]); } catch (e) {}
    }
    if (!hit.length) return false;
    for (i = 0; i < hit.length; i++) {
      var mark = hit[i];
      var p = mark.parentNode;
      if (!p) continue;
      while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
      p.removeChild(mark);
      p.normalize();
    }
    window.getSelection().removeAllRanges();
    return true;
  }

  function isInsertQ(q) {
    return !!(q && (q.insert || q.kind === "insert"));
  }

  // standing rule: conversation / announcement / lecture = audio first, then questions
  // Choose a Response keeps options on screen with the clip
  function hideQsUntilHeard(task) {
    var t = (task && task.type) || "";
    return t === "conversation" || t === "announcement" || t === "lecture";
  }

  function renderPassage(task, host, showInsert) {
    if (task.layout) {
      host.innerHTML = dailyHTML(task);
      return;
    }
    var html = "";
    if (task.title) html += "<h2>" + esc(task.title) + "</h2>";
    (task.paras || []).forEach(function (p) { html += paraHTML(p, showInsert); });
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

  function paperOf(id) {
    var list = (w.YYSD && w.YYSD.TOEFL_READING) || [];
    return list.filter(function (p) { return p.id === id; })[0] || list[0] || null;
  }

  w.YYSD_TOEFL = {
    norm: norm,
    blanksOf: blanksOf,
    allItems: allItems,
    screensOf: screensOf,
    matchBlank: matchBlank,
    scorePaper: scorePaper,
    rawTo30: rawTo30,
    bandFrom30: bandFrom30,
    renderBlanks: renderBlanks,
    collectBlanks: collectBlanks,
    renderPassage: renderPassage,
    renderOptions: renderOptions,
    saveHighlights: saveHighlights,
    restoreHighlights: restoreHighlights,
    applySelectionHighlight: applySelectionHighlight,
    removeSelectionHighlight: removeSelectionHighlight,
    selectionHitsHighlight: selectionHitsHighlight,
    isInsertQ: isInsertQ,
    hideQsUntilHeard: hideQsUntilHeard,
    paperOf: paperOf,
    taskKey: taskKey,
    esc: esc
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = w.YYSD_TOEFL;
  }
})(typeof window !== "undefined" ? window : global);
