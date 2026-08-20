/* english-spell-input.js — block Chinese IME English autocomplete on spell fields */
(function () {
  "use strict";

  function asciiSpell(s) {
    return String(s || "").replace(/[^a-zA-Z'-]/g, "");
  }

  var BLOCK_TYPES = {
    insertCompositionText: 1,
    insertFromComposition: 1,
    insertReplacementText: 1,
    insertFromPaste: 1,
    insertFromDrop: 1,
    insertFromYank: 1
  };

  /**
   * @param {HTMLInputElement} el
   * @param {{ onWarn?: function(string), onImeViolation?: function(), isLocked?: function(): boolean }} opts
   */
  function bind(el, opts) {
    opts = opts || {};
    if (!el || el.__yysdEnSpell) return;
    el.__yysdEnSpell = true;
    el.classList.add("yysd-en-spell");
    el.setAttribute("lang", "en");
    el.setAttribute("inputmode", "latin");
    el.setAttribute("autocomplete", "off");
    el.setAttribute("autocorrect", "off");
    el.setAttribute("autocapitalize", "off");
    el.setAttribute("spellcheck", "false");
    try { el.style.imeMode = "disabled"; } catch (e) { /* ignore */ }

    var composing = false;
    var composeBase = "";

    function locked() {
      return !!(opts.isLocked && opts.isLocked());
    }

    function warn(msg) {
      if (locked()) return;
      if (opts.onWarn) opts.onWarn(msg || "请切换到英文输入法后再拼写");
    }

    function imeViolation() {
      if (locked()) return;
      if (opts.onImeViolation) opts.onImeViolation();
    }

    el.addEventListener("compositionstart", function () {
      composing = true;
      composeBase = el.value;
      imeViolation();
    });

    el.addEventListener("compositionend", function () {
      composing = false;
      // ponytail: Chinese IME English联想 commits here — discard whole composition
      if (el.value !== composeBase) {
        el.value = composeBase;
        warn();
      }
    });

    el.addEventListener("beforeinput", function (e) {
      if (locked()) return;
      var t = e.inputType || "";
      if (t.indexOf("delete") === 0) return;
      if (BLOCK_TYPES[t]) {
        e.preventDefault();
        warn(t.indexOf("Paste") >= 0 ? "拼写题不支持粘贴" : undefined);
        if (t.indexOf("Composition") >= 0 || t === "insertCompositionText" || t === "insertFromComposition") {
          imeViolation();
        }
        return;
      }
      if (composing) {
        e.preventDefault();
        return;
      }
      if (t === "insertText" && e.data != null) {
        if (e.data.length !== 1 || /[^a-zA-Z'-]/.test(e.data)) {
          e.preventDefault();
          if (/[\u4e00-\u9fff]/.test(e.data)) warn();
        }
      }
    });

    el.addEventListener("paste", function (e) {
      e.preventDefault();
      warn("拼写题不支持粘贴");
    });

    el.addEventListener("input", function () {
      if (composing) return;
      var next = asciiSpell(el.value);
      if (next !== el.value) {
        el.value = next;
        warn();
      }
    });
  }

  window.YYSD_EN_SPELL = { bind: bind, asciiSpell: asciiSpell };
})();
