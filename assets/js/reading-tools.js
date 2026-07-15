/* =========================================================================
   reading-tools.js — IELTS-style highlight + notes on passages & questions
   Injected by exam.js into reading/listening exam iframes.
   ========================================================================= */
(function () {
  "use strict";

  var PANE_SEL = ".passage-pane, .col.passage, .reading-text, .qcol, #questionsHolder";
  var HL = "yysd-hl";
  var script = document.currentScript;
  var examId = (script && script.dataset.examId) || "local";
  var store = (script && script.dataset.persist) === "local" ? localStorage : sessionStorage;

  var ctxMenu = null;
  var notePanel = null;
  var activePane = null;
  var pendingRange = null;
  var bound = new WeakSet();

  function storageKey(paneId) {
    return "yysd:rh:" + examId + ":" + paneId;
  }

  function paneId(pane) {
    if (pane.dataset.yysdPassage) return pane.dataset.yysdPassage;
    if (pane.id) return pane.id;
    return "p" + Array.prototype.indexOf.call(document.querySelectorAll(PANE_SEL), pane);
  }

  function savePane(pane) {
    var items = Array.prototype.map.call(
      pane.querySelectorAll("." + HL),
      function (m) { return markToOffset(pane, m); }
    );
    try { store.setItem(storageKey(paneId(pane)), JSON.stringify(items)); } catch (e) {}
  }

  function markToOffset(pane, mark) {
    var pre = document.createRange();
    pre.selectNodeContents(pane);
    pre.setEndBefore(mark);
    var start = pre.toString().length;
    return { start: start, end: start + mark.textContent.length, note: mark.dataset.note || "" };
  }

  function rangeFromOffsets(root, start, end) {
    if (start >= end) return null;
    var cur = 0, sNode, sOff, eNode, eOff, node;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while ((node = w.nextNode())) {
      var len = node.length;
      if (!sNode && cur + len > start) { sNode = node; sOff = start - cur; }
      if (!eNode && cur + len >= end) { eNode = node; eOff = end - cur; break; }
      cur += len;
    }
    if (!sNode || !eNode) return null;
    var r = document.createRange();
    r.setStart(sNode, sOff);
    r.setEnd(eNode, eOff);
    return r;
  }

  function textSegmentsInRange(range) {
    var out = [];
    var w = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (n) {
          if (!n.nodeValue || !n.nodeValue.length) return NodeFilter.FILTER_REJECT;
          var nr = document.createRange();
          nr.selectNodeContents(n);
          if (range.compareBoundaryPoints(Range.END_TO_START, nr) <= 0 ||
              range.compareBoundaryPoints(Range.START_TO_END, nr) >= 0) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    var n;
    while ((n = w.nextNode())) {
      var s = n === range.startContainer ? range.startOffset : 0;
      var e = n === range.endContainer ? range.endOffset : n.length;
      if (s < e) out.push({ node: n, start: s, end: e });
    }
    return out;
  }

  function highlightRange(range) {
    if (range.collapsed) return null;
    var mark = document.createElement("mark");
    mark.className = HL;
    try {
      range.surroundContents(mark);
      return mark;
    } catch (e) {
      var first = null;
      textSegmentsInRange(range).forEach(function (seg) {
        var r = document.createRange();
        r.setStart(seg.node, seg.start);
        r.setEnd(seg.node, seg.end);
        var m = document.createElement("mark");
        m.className = HL;
        try {
          r.surroundContents(m);
          if (!first) first = m;
        } catch (_) {}
      });
      return first;
    }
  }

  function restorePane(pane) {
    var raw = store.getItem(storageKey(paneId(pane)));
    if (!raw) return;
    var items;
    try { items = JSON.parse(raw); } catch (e) { return; }
    if (!items.length) return;
    items.sort(function (a, b) { return b.start - a.start; });
    items.forEach(function (it) {
      var r = rangeFromOffsets(pane, it.start, it.end);
      if (!r) return;
      var m = highlightRange(r);
      if (m && it.note) {
        m.dataset.note = it.note;
        m.classList.add(HL + "--note");
      }
    });
  }

  function selectionInPane(pane) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
    var r = sel.getRangeAt(0);
    if (!pane.contains(r.commonAncestorContainer)) return null;
    return r;
  }

  function marksInRange(pane, range) {
    return Array.prototype.filter.call(
      pane.querySelectorAll("." + HL),
      function (m) { return range.intersectsNode(m); }
    );
  }

  function unwrapMark(m) {
    var p = m.parentNode;
    while (m.firstChild) p.insertBefore(m.firstChild, m);
    p.removeChild(m);
    p.normalize();
  }

  function hideUI() {
    if (ctxMenu) ctxMenu.hidden = true;
    if (notePanel) notePanel.hidden = true;
  }

  function ensureCtx() {
    if (ctxMenu) return ctxMenu;
    ctxMenu = document.createElement("div");
    ctxMenu.className = "yysd-ctx";
    ctxMenu.hidden = true;
    ctxMenu.setAttribute("role", "menu");
    ctxMenu.innerHTML =
      '<button type="button" data-act="highlight"><span class="ico ico--hl">🖍</span>高亮 Highlight</button>' +
      '<button type="button" data-act="notes"><span class="ico ico--note">📝</span>笔记 Notes</button>' +
      '<button type="button" data-act="clear"><span class="ico ico--clear">⌫</span>清除 Clear</button>' +
      '<button type="button" data-act="clear-all"><span class="ico ico--clear-all">⊖</span>全部清除 Clear all</button>';
    document.body.appendChild(ctxMenu);

    ctxMenu.addEventListener("mousedown", function (e) { e.preventDefault(); });

    ctxMenu.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn || btn.disabled || !activePane) return;
      var act = btn.dataset.act;
      var range = pendingRange;
      hideUI();
      if (act === "highlight" && range) doHighlight(activePane, range, "");
      else if (act === "notes") doNotes(activePane, range);
      else if (act === "clear" && range) doClear(activePane, range);
      else if (act === "clear-all") doClearAll(activePane);
      pendingRange = null;
      window.getSelection().removeAllRanges();
    });
    return ctxMenu;
  }

  function showCtx(x, y, pane, range) {
    activePane = pane;
    pendingRange = range.cloneRange();
    var menu = ensureCtx();
    var marks = marksInRange(pane, range);
    var hasHl = pane.querySelector("." + HL);
    menu.querySelector('[data-act="clear"]').disabled = !marks.length;
    menu.querySelector('[data-act="clear-all"]').disabled = !hasHl;
    menu.hidden = false;
    var mw = menu.offsetWidth || 160;
    var mh = menu.offsetHeight || 140;
    menu.style.left = Math.min(x, window.innerWidth - mw - 8) + "px";
    menu.style.top = Math.min(y, window.innerHeight - mh - 8) + "px";
  }

  function doHighlight(pane, range, note) {
    var m = highlightRange(range);
    if (!m) return;
    if (note) {
      m.dataset.note = note;
      m.classList.add(HL + "--note");
    }
    savePane(pane);
  }

  function doClear(pane, range) {
    marksInRange(pane, range).forEach(unwrapMark);
    savePane(pane);
  }

  function doClearAll(pane) {
    Array.prototype.slice.call(pane.querySelectorAll("." + HL)).forEach(unwrapMark);
    savePane(pane);
  }

  function ensureNotePanel() {
    if (notePanel) return notePanel;
    notePanel = document.createElement("div");
    notePanel.className = "yysd-note";
    notePanel.hidden = true;
    notePanel.innerHTML =
      '<textarea placeholder="Type your note here…"></textarea>' +
      '<div class="yysd-note__bar">' +
        '<button type="button" class="yysd-note__cancel">Cancel</button>' +
        '<button type="button" class="yysd-note__save">Save</button>' +
      '</div>';
    document.body.appendChild(notePanel);
    notePanel.querySelector(".yysd-note__cancel").addEventListener("click", hideUI);
    return notePanel;
  }

  function doNotes(pane, range) {
    if (!range) return;
    var marks = marksInRange(pane, range);
    var mark = marks[0];
    var panel = ensureNotePanel();
    var ta = panel.querySelector("textarea");
    ta.value = mark ? (mark.dataset.note || "") : "";

    panel.hidden = false;
    var rect = range.getBoundingClientRect();
    panel.style.left = Math.min(rect.left, window.innerWidth - 340) + "px";
    panel.style.top = (rect.bottom + 8) + "px";

    var saveBtn = panel.querySelector(".yysd-note__save");
    var onSave = function () {
      saveBtn.removeEventListener("click", onSave);
      var note = ta.value.trim();
      if (mark) {
        if (note) { mark.dataset.note = note; mark.classList.add(HL + "--note"); }
        else { delete mark.dataset.note; mark.classList.remove(HL + "--note"); }
      } else {
        doHighlight(pane, range, note);
      }
      savePane(pane);
      hideUI();
    };
    saveBtn.addEventListener("click", onSave);
    ta.focus();
  }

  function bindPane(pane) {
    if (bound.has(pane)) return;
    bound.add(pane);
    pane.dataset.yysdPassage = paneId(pane);
    restorePane(pane);

    pane.addEventListener("contextmenu", function (e) {
      var range = selectionInPane(pane);
      if (!range) return;
      e.preventDefault();
      hideUI();
      showCtx(e.clientX, e.clientY, pane, range);
    });

    /* 选中文字松手后也弹出菜单（Mac 无右键时更友好） */
    pane.addEventListener("mouseup", function (e) {
      if (e.button === 2) return;
      setTimeout(function () {
        var range = selectionInPane(pane);
        if (!range) return;
        var rect = range.getBoundingClientRect();
        showCtx(rect.left + rect.width / 2, rect.bottom + 6, pane, range);
      }, 10);
    });
  }

  function scan() {
    document.querySelectorAll(PANE_SEL).forEach(bindPane);
  }

  function observe() {
    var obs = new MutationObserver(function () { scan(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("mousedown", function (e) {
    if (ctxMenu && !ctxMenu.contains(e.target) && (!notePanel || !notePanel.contains(e.target))) {
      hideUI();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hideUI();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  function boot() {
    /* ponytail: one-shot offset sanity check on a detached node */
    var host = document.createElement("div");
    host.textContent = "Hello world";
    var r = rangeFromOffsets(host, 6, 11);
    if (!r || r.toString() !== "world") console.warn("yysd reading-tools: offset check failed");
    scan();
    observe();
  }
})();
