/* =========================================================================
   word-realm-vn.js — Visual novel player (EN dialogue + ZH subtitles)
   Script node types: line | cutscene | choice | end
   ========================================================================= */
window.YYSD_WORD_REALM_VN = (function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function indexNodes(nodes) {
    var map = {};
    (nodes || []).forEach(function (n, i) {
      if (n && n.id) map[n.id] = i;
    });
    return map;
  }

  /**
   * @param {HTMLElement} mount
   * @param {{ nodes: Array }} script
   * @param {{ onDone: Function, onSkip?: Function, portraits?: Object, flags?: Object }} opts
   */
  function play(mount, script, opts) {
    opts = opts || {};
    var nodes = (script && script.nodes) || [];
    if (!nodes.length) {
      if (opts.onDone) opts.onDone(opts.flags || {});
      return;
    }
    var byId = indexNodes(nodes);
    var i = 0;
    var flags = opts.flags || {};
    var portraits = opts.portraits || {};
    var autoTimer = null;
    var autoOn = false;
    var panelI = 0;
    var lastSceneSrc = ""; // keep last landscape behind character lines

    function clearAuto() {
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    }

    function gotoId(id) {
      if (id == null || id === "") {
        finish();
        return;
      }
      if (byId[id] != null) i = byId[id];
      else finish();
      panelI = 0;
      render();
    }

    function finish() {
      clearAuto();
      if (opts.onDone) opts.onDone(flags);
    }

    function skip() {
      clearAuto();
      if (opts.onSkip) opts.onSkip(flags);
      else finish();
    }

    function portraitSrc(key) {
      if (!key) return "";
      if (portraits[key]) return portraits[key];
      return key.indexOf("/") >= 0 ? key : "";
    }

    // Landscape maps/cuts are cinematic scenes — not postage-stamp portraits
    function isSceneKey(key) {
      var k = String(key || "");
      return k.indexOf("map-") === 0 || k.indexOf("cut-") === 0;
    }

    function dialogueBoxHTML(optsBox) {
      optsBox = optsBox || {};
      return '<div class="wr-vn__box' + (optsBox.cut ? " wr-vn__box--cut" : "") + '">' +
        (optsBox.kicker ? '<p class="wr-vn__kicker">' + esc(optsBox.kicker) + "</p>" : "") +
        (optsBox.speaker ? '<p class="wr-vn__speaker">' + esc(optsBox.speaker) + "</p>" : "") +
        '<p class="wr-vn__en">' + esc(optsBox.en || "") + "</p>" +
        '<p class="wr-vn__zh">' + esc(optsBox.zh || "") + "</p>" +
        (optsBox.extra || "") +
        '<div class="wr-vn__bar">' +
          (optsBox.auto
            ? ('<button type="button" class="wr-vn__btn" id="wr-vn-auto">' +
              (autoOn ? "Auto · On" : "Auto") + "</button>")
            : "") +
          '<button type="button" class="wr-vn__btn" id="wr-vn-skip">Skip</button>' +
          (optsBox.next !== false
            ? '<button type="button" class="wr-vn__btn wr-vn__btn--go" id="wr-vn-next">▶</button>'
            : "") +
        "</div></div>";
    }

    function sceneStageHTML(src) {
      return '<div class="wr-vn__scene-stage">' +
        (src
          ? '<img class="wr-vn__scene-art" src="' + esc(src) + '" alt="">'
          : '<div class="wr-vn__scene-art wr-vn__scene-art--empty"></div>') +
        '<div class="wr-vn__scene-veil"></div></div>';
    }

    function charStageHTML(src) {
      var bg = lastSceneSrc
        ? '<img class="wr-vn__bg" src="' + esc(lastSceneSrc) + '" alt="" aria-hidden="true">'
        : "";
      return '<div class="wr-vn__stage wr-vn__stage--char">' + bg +
        '<div class="wr-vn__frame">' +
        (src
          ? '<img class="wr-vn__portrait" src="' + esc(src) + '" alt="">'
          : '<div class="wr-vn__portrait wr-vn__portrait--empty" aria-hidden="true"></div>') +
        "</div></div>";
    }

    function renderLine(n) {
      var key = n.portrait || "";
      var src = portraitSrc(key);
      var scene = isSceneKey(key);
      if (scene && src) lastSceneSrc = src;
      var rootCls = "wr-vn" + (scene ? " wr-vn--scene" : " wr-vn--char");
      mount.innerHTML =
        '<div class="' + rootCls + '" data-mode="line">' +
          (scene ? sceneStageHTML(src) : charStageHTML(src)) +
          dialogueBoxHTML({
            speaker: n.speaker || "",
            en: n.en, zh: n.zh, auto: true
          }) +
        "</div>";
      bindChrome(function () {
        if (n.next) gotoId(n.next);
        else { i += 1; panelI = 0; render(); }
      });
      if (autoOn) {
        clearAuto();
        autoTimer = setTimeout(function () {
          document.getElementById("wr-vn-next") && document.getElementById("wr-vn-next").click();
        }, Math.max(2200, String(n.en || "").length * 45));
      }
    }

    function renderCutscene(n) {
      var panels = n.panels || [];
      if (!panels.length) {
        i += 1;
        render();
        return;
      }
      var p = panels[Math.min(panelI, panels.length - 1)];
      var artKey = p.art || "";
      var art = portraitSrc(artKey) || artKey || "";
      if (art) lastSceneSrc = art;
      mount.innerHTML =
        '<div class="wr-vn wr-vn--cut wr-vn--scene" data-mode="cutscene">' +
          sceneStageHTML(art) +
          dialogueBoxHTML({
            kicker: "Cutscene",
            en: p.en, zh: p.zh, cut: true
          }) +
        "</div>";
      bindChrome(function () {
        if (panelI < panels.length - 1) {
          panelI += 1;
          render();
        } else if (n.next) {
          gotoId(n.next);
        } else {
          i += 1;
          panelI = 0;
          render();
        }
      });
      if (autoOn) {
        clearAuto();
        autoTimer = setTimeout(function () {
          document.getElementById("wr-vn-next") && document.getElementById("wr-vn-next").click();
        }, 2800);
      }
    }

    function renderChoice(n) {
      var optsHtml = '<div class="wr-vn__choices">' + (n.options || []).map(function (o, idx) {
        return '<button type="button" class="wr-vn__choice" data-i="' + idx + '">' +
          '<span class="wr-vn__en">' + esc(o.en || "") + "</span>" +
          '<span class="wr-vn__zh">' + esc(o.zh || "") + "</span></button>";
      }).join("") + "</div>";
      var key = n.portrait || "";
      var src = portraitSrc(key);
      var scene = isSceneKey(key);
      if (scene && src) lastSceneSrc = src;
      var rootCls = "wr-vn" + (scene ? " wr-vn--scene" : " wr-vn--char");
      mount.innerHTML =
        '<div class="' + rootCls + '" data-mode="choice">' +
          (scene ? sceneStageHTML(src) : charStageHTML(src)) +
          dialogueBoxHTML({
            en: n.en, zh: n.zh, extra: optsHtml, next: false
          }) +
        "</div>";
      var skipBtn = document.getElementById("wr-vn-skip");
      if (skipBtn) skipBtn.onclick = skip;
      Array.prototype.forEach.call(mount.querySelectorAll(".wr-vn__choice"), function (btn) {
        btn.onclick = function () {
          var o = n.options[Number(btn.getAttribute("data-i"))];
          if (!o) return;
          if (o.flag) flags[o.flag] = true;
          if (o.next) gotoId(o.next);
          else { i += 1; render(); }
        };
      });
    }

    function bindChrome(onNext) {
      var next = document.getElementById("wr-vn-next");
      var skipBtn = document.getElementById("wr-vn-skip");
      var autoBtn = document.getElementById("wr-vn-auto");
      if (next) next.onclick = function () { clearAuto(); onNext(); };
      if (skipBtn) skipBtn.onclick = skip;
      if (autoBtn) {
        autoBtn.onclick = function () {
          autoOn = !autoOn;
          autoBtn.textContent = autoOn ? "Auto · On" : "Auto";
          if (autoOn) onNext();
          else clearAuto();
        };
      }
      mount.onclick = function (e) {
        if (e.target.closest("button")) return;
        if (document.getElementById("wr-vn-next")) {
          clearAuto();
          onNext();
        }
      };
    }

    function render() {
      clearAuto();
      if (i >= nodes.length) {
        finish();
        return;
      }
      var n = nodes[i];
      if (!n || n.type === "end") {
        finish();
        return;
      }
      if (n.type === "cutscene") return renderCutscene(n);
      if (n.type === "choice") return renderChoice(n);
      return renderLine(n);
    }

    render();
    return { stop: clearAuto };
  }

  return { play: play };
})();
