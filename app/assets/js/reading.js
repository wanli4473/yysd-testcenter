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
      detail.push({ id: it.no, ok: hit, expect: ans, ua: ua });
    });
    return { score: ok, total: items.length, detail: detail, wrong: wrong };
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
    if (typeof p === "string") return "<p><span class=\"hl-body\">" + esc(p) + "</span></p>";
    var mark = "";
    if (showInsert && p.insert) {
      mark = '<button type="button" class="insert" data-insert="' + esc(p.insert) +
        '" aria-label="insert ' + esc(p.insert) + '">■ ' + esc(p.insert) + "</button> ";
    }
    if (!p.t) return mark ? "<p>" + mark + "</p>" : "";
    return "<p>" + mark + '<span class="hl-body">' + esc(p.t) + "</span></p>";
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

  function renderPassage(task, host, showInsert) {
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
})(typeof window !== "undefined" ? window : global);
