/* =========================================================================
   cdt-qux.js — B3 CDT question UX: DnD match/map/wbank + multi letter pick
   Injected into Cambridge L/R iframes under exam.html?cdt=1.
   Keeps <select> as answer source of truth for existing paper scoring.
   ========================================================================= */
(function () {
  "use strict";
  if (window.YYSD_CDT_QUX) return;

  var CSS =
    ".yysd-qux-pool{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px;padding:10px 12px;" +
    "background:#eef3f9;border:1px solid #b0bccb;border-radius:2px;min-height:44px}" +
    ".yysd-qux-pool__lbl{width:100%;font-size:12px;font-weight:700;color:#334;margin:0 0 4px}" +
    ".yysd-qux-chip{display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:34px;" +
    "padding:0 10px;background:#fff;border:1px solid #4a7aa8;border-radius:2px;font:700 14px/1 Arial,sans-serif;" +
    "color:#123;cursor:grab;user-select:none;touch-action:none}" +
    ".yysd-qux-chip:active{cursor:grabbing}" +
    ".yysd-qux-chip.is-used{opacity:.35;cursor:default}" +
    ".yysd-qux-chip.is-on{background:#1a6fb5;color:#fff;border-color:#155a94}" +
    ".yysd-qux-slot{display:inline-flex;align-items:center;justify-content:center;min-width:52px;min-height:34px;" +
    "margin-left:8px;padding:2px 8px;border:1.5px dashed #6a7f99;border-radius:2px;background:#f7fafc;" +
    "vertical-align:middle;font:700 14px/1 Arial,sans-serif;color:#123}" +
    ".yysd-qux-slot.is-over{border-color:#1a6fb5;background:#e8f2fb}" +
    ".yysd-qux-slot.is-filled{border-style:solid;border-color:#4a7aa8;background:#fff;cursor:pointer}" +
    ".yysd-qux-slot .yysd-qux-chip{cursor:grab;margin:0;min-width:32px;height:28px}" +
    ".yysd-qux-multi{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}" +
    ".yysd-qux-multi .yysd-qux-chip{cursor:pointer}" +
    ".yysd-qux-hide-sel{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;" +
    "pointer-events:none!important;overflow:hidden!important}" +
    ".match-q.yysd-qux-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:8px 0}" +
    ".match-q.yysd-qux-row .mq-txt{flex:1;min-width:120px}";

  function injectCss() {
    if (document.getElementById("yysd-cdt-qux-css")) return;
    var s = document.createElement("style");
    s.id = "yysd-cdt-qux-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function isCdt() {
    var b = document.body;
    return !!(b && (b.classList.contains("yysd-cdt-listening") || b.classList.contains("yysd-cdt-reading")));
  }

  function optionLetters(sel) {
    var out = [];
    for (var i = 0; i < sel.options.length; i++) {
      var v = String(sel.options[i].value || "").trim();
      if (v) out.push(v);
    }
    return out;
  }

  function sameOptions(a, b) {
    var la = optionLetters(a), lb = optionLetters(b);
    if (la.length !== lb.length) return false;
    for (var i = 0; i < la.length; i++) if (la[i] !== lb[i]) return false;
    return true;
  }

  function allowsReuse(group, letterCount, slotCount) {
    var el = group.querySelector(".instruction");
    var t = (el && el.textContent) || "";
    if (/more than once|一次以上|可重复|任意.*多次/i.test(t)) return true;
    if (/only once|each (letter|answer) only once|仅.*一次|每个字母.*一次/i.test(t)) return false;
    // pigeonhole: more gaps than letters ⇒ must reuse
    if (slotCount && letterCount && slotCount > letterCount) return true;
    // exclusive list/heading/map when enough distinct options
    var enough = letterCount && slotCount && letterCount >= slotCount;
    if (enough && /heading|标题|from the box and write/i.test(t)) return false;
    if (enough && group.querySelector && group.querySelector(".map-wrap")) return false;
    // ponytail: default reusable — exclusive-by-default broke paragraph/classify matches
    return true;
  }

  function isMultiHint(text) {
    return /选择一项|两题合计|两项|本组合计|选出正确|Choose TWO|choose two|TWO letters|two letters/i.test(text || "");
  }

  function isMultiGroup(group, pairs) {
    if (pairs.length < 2) return false;
    var base = pairs[0].sel;
    for (var i = 1; i < pairs.length; i++) {
      if (!sameOptions(base, pairs[i].sel)) return false;
    }
    var hints = 0;
    pairs.forEach(function (p) {
      var mq = p.row.querySelector(".mq-txt");
      if (mq && isMultiHint(mq.textContent)) hints++;
    });
    var instr = ((group.querySelector(".instruction") || {}).textContent) || "";
    var instrMulti = /Choose TWO letters|Choose TWO\b|选出.*两项|两题合计/i.test(instr);
    // ponytail: never infer multi from row count alone — match also shares one letter box
    return hints > 0 || instrMulti;
  }

  function hideSelect(sel) {
    sel.classList.add("yysd-qux-hide-sel");
    sel.tabIndex = -1;
    sel.setAttribute("aria-hidden", "true");
  }

  function setSelectValue(sel, val) {
    sel.value = val || "";
    try {
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      sel.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (e) { /* ignore */ }
  }

  function makeChip(letter) {
    var chip = document.createElement("span");
    chip.className = "yysd-qux-chip";
    chip.textContent = letter;
    chip.draggable = true;
    chip.dataset.letter = letter;
    chip.setAttribute("role", "button");
    chip.tabIndex = 0;
    return chip;
  }

  function enhanceMulti(group, pairs) {
    if (group.dataset.yysdQuxMulti) return;
    group.dataset.yysdQuxMulti = "1";
    var letters = optionLetters(pairs[0].sel);
    var max = pairs.length;
    var chosen = [];

    var nums = [];
    pairs.forEach(function (p) {
      p.row.dataset.yysdQux = "multi";
      hideSelect(p.sel);
      p.row.style.display = "none";
      var badge = p.row.querySelector(".qnum-badge");
      if (badge) nums.push(badge.textContent.trim());
    });

    var host = document.createElement("div");
    host.className = "yysd-qux-multi";
    host.setAttribute("data-max", String(max));
    var lead = document.createElement("div");
    lead.className = "yysd-qux-pool__lbl";
    var qLabel = nums.length ? ("Questions " + nums.join(" & ") + ". ") : "";
    lead.textContent = qLabel + (max === 2
      ? "Click TWO letters (order does not matter)."
      : ("Click " + max + " letters (order does not matter)."));
    host.appendChild(lead);

    function syncToSelects() {
      var sorted = chosen.slice().sort();
      pairs.forEach(function (p, i) {
        setSelectValue(p.sel, sorted[i] || "");
      });
      host.querySelectorAll(".yysd-qux-chip").forEach(function (chip) {
        chip.classList.toggle("is-on", chosen.indexOf(chip.dataset.letter) >= 0);
      });
    }

    // seed from existing select values (draft restore)
    pairs.forEach(function (p) {
      var v = String(p.sel.value || "").trim();
      if (v && chosen.indexOf(v) < 0 && chosen.length < max) chosen.push(v);
    });

    letters.forEach(function (L) {
      var chip = makeChip(L);
      chip.draggable = false;
      chip.addEventListener("click", function () {
        var i = chosen.indexOf(L);
        if (i >= 0) chosen.splice(i, 1);
        else {
          if (chosen.length >= max) return;
          chosen.push(L);
        }
        syncToSelects();
      });
      host.appendChild(chip);
    });

    var box = group.querySelector(".match-box");
    if (box && box.nextSibling) group.insertBefore(host, box.nextSibling);
    else group.appendChild(host);
    syncToSelects();
  }

  function enhanceMatchDnd(group, pairs) {
    if (group.dataset.yysdQuxDnd) return;
    group.dataset.yysdQuxDnd = "1";
    var letters = optionLetters(pairs[0].sel);
    var reuse = allowsReuse(group, letters.length, pairs.length);

    var pool = document.createElement("div");
    pool.className = "yysd-qux-pool";
    var lbl = document.createElement("div");
    lbl.className = "yysd-qux-pool__lbl";
    lbl.textContent = reuse
      ? "Drag a letter into each gap (letters may be used more than once)."
      : "Drag a letter into each gap. Drag a filled gap back here to clear.";
    pool.appendChild(lbl);

    var chipByLetter = {};
    letters.forEach(function (L) {
      var chip = makeChip(L);
      chipByLetter[L] = chip;
      pool.appendChild(chip);
      chip.addEventListener("dragstart", function (e) {
        if (chip.classList.contains("is-used") && !reuse) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", L);
        e.dataTransfer.effectAllowed = "move";
      });
    });

    function refreshUsed() {
      if (reuse) return;
      var used = {};
      pairs.forEach(function (p) {
        var v = String(p.sel.value || "").trim();
        if (v) used[v] = true;
      });
      letters.forEach(function (L) {
        var chip = chipByLetter[L];
        if (!chip) return;
        var taken = !!used[L];
        chip.classList.toggle("is-used", taken);
        chip.draggable = !taken;
        if (taken && chip.parentNode === pool) {
          /* stay in pool visually muted */
        } else if (!taken && chip.parentNode !== pool) {
          pool.appendChild(chip);
        }
      });
    }

    function fillSlot(slot, sel, letter) {
      slot.innerHTML = "";
      slot.classList.add("is-filled");
      if (!letter) {
        slot.classList.remove("is-filled");
        slot.textContent = "";
        setSelectValue(sel, "");
        refreshUsed();
        return;
      }
      var chip = makeChip(letter);
      chip.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", letter);
        e.dataTransfer.setData("text/yysd-from-slot", sel.id);
        e.dataTransfer.effectAllowed = "move";
      });
      slot.appendChild(chip);
      setSelectValue(sel, letter);
      refreshUsed();
    }

    pairs.forEach(function (p) {
      if (p.row.dataset.yysdQux) return;
      p.row.dataset.yysdQux = "dnd";
      p.row.classList.add("yysd-qux-row");
      hideSelect(p.sel);
      var slot = document.createElement("div");
      slot.className = "yysd-qux-slot";
      slot.dataset.for = p.sel.id;
      slot.setAttribute("tabindex", "0");
      slot.setAttribute("aria-label", "Answer drop zone");
      p.row.appendChild(slot);

      slot.addEventListener("dragover", function (e) {
        e.preventDefault();
        slot.classList.add("is-over");
      });
      slot.addEventListener("dragleave", function () {
        slot.classList.remove("is-over");
      });
      slot.addEventListener("drop", function (e) {
        e.preventDefault();
        slot.classList.remove("is-over");
        var letter = e.dataTransfer.getData("text/plain");
        if (!letter || letters.indexOf(letter) < 0) return;
        var fromId = e.dataTransfer.getData("text/yysd-from-slot");
        if (fromId && fromId !== p.sel.id) {
          var other = document.getElementById(fromId);
          if (other) {
            var otherSlot = group.querySelector('.yysd-qux-slot[data-for="' + fromId + '"]');
            if (otherSlot) fillSlot(otherSlot, other, "");
          }
        }
        // swap if exclusive and letter already used elsewhere
        if (!reuse) {
          pairs.forEach(function (op) {
            if (op.sel === p.sel) return;
            if (String(op.sel.value) === letter) {
              var os = group.querySelector('.yysd-qux-slot[data-for="' + op.sel.id + '"]');
              if (os) fillSlot(os, op.sel, "");
            }
          });
        }
        fillSlot(slot, p.sel, letter);
      });
      // click filled slot to clear
      slot.addEventListener("click", function () {
        if (!p.sel.value) return;
        fillSlot(slot, p.sel, "");
      });

      if (p.sel.value) fillSlot(slot, p.sel, p.sel.value);
    });

    pool.addEventListener("dragover", function (e) { e.preventDefault(); });
    pool.addEventListener("drop", function (e) {
      e.preventDefault();
      var fromId = e.dataTransfer.getData("text/yysd-from-slot");
      if (!fromId) return;
      var sel = document.getElementById(fromId);
      var slot = group.querySelector('.yysd-qux-slot[data-for="' + fromId + '"]');
      if (sel && slot) fillSlot(slot, sel, "");
    });

    var box = group.querySelector(".match-box");
    var map = group.querySelector(".map-wrap");
    var anchor = map || box;
    if (anchor && anchor.nextSibling) group.insertBefore(pool, anchor.nextSibling);
    else if (anchor) anchor.after(pool);
    else group.insertBefore(pool, group.querySelector(".match-q"));

    refreshUsed();
  }

  function enhanceInlineSelects(root) {
    // wbank / note completion dropdowns inside passage text
    var sels = root.querySelectorAll(".note-box select, .note-li select, .wbank-box ~ .note-box select");
    var byGroup = {};
    sels.forEach(function (sel) {
      if (sel.dataset.yysdQux) return;
      if (sel.closest(".match-q")) return;
      var group = sel.closest(".qgroup") || root;
      var gid = group.getAttribute("data-yysd-gid");
      if (!gid) {
        gid = "g" + Math.random().toString(36).slice(2, 8);
        group.setAttribute("data-yysd-gid", gid);
      }
      (byGroup[gid] = byGroup[gid] || { group: group, sels: [] }).sels.push(sel);
    });
    Object.keys(byGroup).forEach(function (gid) {
      var pack = byGroup[gid];
      if (pack.group.dataset.yysdQuxInline) return;
      if (!pack.sels.length) return;
      // only if looks like letter bank
      var letters = optionLetters(pack.sels[0]);
      if (letters.length < 2 || letters.length > 16) return;
      var allSame = pack.sels.every(function (s) { return sameOptions(pack.sels[0], s); });
      if (!allSame) return;
      pack.group.dataset.yysdQuxInline = "1";

      var pairs = pack.sels.map(function (sel) {
        var wrap = document.createElement("span");
        wrap.className = "match-q yysd-qux-row";
        wrap.style.display = "inline-flex";
        sel.parentNode.insertBefore(wrap, sel);
        wrap.appendChild(sel);
        return { row: wrap, sel: sel };
      });
      enhanceMatchDnd(pack.group, pairs);
    });
  }

  function enhanceGroup(group) {
    var rows = group.querySelectorAll(".match-q");
    var pairs = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.dataset.yysdQux) continue;
      var sel = row.querySelector("select");
      if (!sel || !sel.id) continue;
      if (sel.closest(".qgroup") !== group) continue;
      pairs.push({ row: row, sel: sel });
    }
    if (!pairs.length) return;
    if (isMultiGroup(group, pairs)) enhanceMulti(group, pairs);
    else enhanceMatchDnd(group, pairs);
  }

  function enhance() {
    if (!isCdt()) return;
    injectCss();
    var root = document.getElementById("questionsHolder") ||
      document.getElementById("testArea") ||
      document.body;
    root.querySelectorAll(".qgroup").forEach(enhanceGroup);
    enhanceInlineSelects(root);
  }

  window.YYSD_CDT_QUX = {
    enhance: enhance,
    isMultiHint: isMultiHint,
    allowsReuse: allowsReuse
  };

  // ponytail: smallest check — fails loud if multi detection regresses
  console.assert(isMultiHint("选择一项（两题合计选出正确的两项，顺序不限）"), "cdt-qux: multi hint");
  console.assert(!isMultiHint("Which gallery has the best collection of ceramics?"), "cdt-qux: not multi");
  console.assert(allowsReuse({ querySelector: function () { return { textContent: "You may use any letter more than once." }; } }), "cdt-qux: reuse");
  console.assert(allowsReuse({ querySelector: function () { return { textContent: "Write the correct letter, A, B or C." }; } }, 3, 6), "cdt-qux: pigeonhole reuse");
  console.assert(allowsReuse({ querySelector: function (s) { return s === ".instruction" ? { textContent: "Which paragraph contains the following information?" } : null; } }, 7, 5), "cdt-qux: paragraph reuse");
  console.assert(!allowsReuse({ querySelector: function () { return { textContent: "Choose FIVE answers from the box and write the correct letter." }; } }, 7, 5), "cdt-qux: exclusive match");
  console.assert(!allowsReuse({ querySelector: function () { return { textContent: "Choose the correct heading for each section." }; } }, 8, 4), "cdt-qux: heading exclusive");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (isCdt()) setTimeout(enhance, 0);
    });
  } else if (isCdt()) {
    setTimeout(enhance, 0);
  }
})();
