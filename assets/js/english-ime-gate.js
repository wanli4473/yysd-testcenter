/* english-ime-gate.js — block spell tests until English IME is confirmed */
(function () {
  "use strict";

  var PROBE = "test";
  var CHEAT_LIMIT = 3; // ponytail: 超过 3 次中途切中文 IME → 第 4 次判作弊
  var overlay = null;
  var pending = null;
  var probeIdx = 0;
  var composing = false;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function close() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    document.body.classList.remove("yysd-ime-gate-open");
    document.removeEventListener("keydown", trapTab, true);
    composing = false;
  }

  function trapTab(e) {
    if (!overlay || e.key !== "Tab") return;
    var input = overlay.querySelector(".ime-gate-input");
    if (input) {
      e.preventDefault();
      input.focus();
    }
  }

  function renderProgress() {
    var el = overlay && overlay.querySelector(".ime-gate-progress");
    if (!el) return;
    var html = "";
    for (var i = 0; i < PROBE.length; i++) {
      var cls = "ime-gate-char";
      if (i < probeIdx) cls += " done";
      else if (i === probeIdx) cls += " active";
      html += '<span class="' + cls + '">' + esc(PROBE[i]) + "</span>";
    }
    el.innerHTML = html;
  }

  function showError(msg) {
    var el = overlay && overlay.querySelector(".ime-gate-err");
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function resetProbe(input) {
    probeIdx = 0;
    composing = false;
    if (input) {
      input.value = "";
      input.disabled = false;
    }
    showError("");
    renderProgress();
  }

  function pass() {
    var p = pending;
    pending = null;
    close();
    if (p) p.resolve();
  }

  function buildOverlay(reason, meta) {
    meta = meta || {};
    var isViolation = reason === "violation";
    var strikes = meta.strikes || 0;
    var strikeHint = "";
    if (isViolation && strikes > 0) {
      strikeHint =
        '<p class="ime-gate-strikes">已切换中文输入法 <strong>' + strikes + "</strong> 次" +
        (strikes >= CHEAT_LIMIT
          ? "（再次切换将作废本次测试）"
          : "（超过 " + CHEAT_LIMIT + " 次将作废本次测试）") +
        "</p>";
    }
    overlay = document.createElement("div");
    overlay.className = "yysd-ime-gate";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ime-gate-title");
    overlay.innerHTML =
      '<div class="ime-gate-panel">' +
        '<h2 id="ime-gate-title">请调整成英文输入模式</h2>' +
        (isViolation
          ? '<p class="ime-gate-lead ime-gate-lead--warn">检测到中文输入法，请切换回英文后再继续测试。</p>'
          : '<p class="ime-gate-lead">单词检测要求使用英文输入法。中文输入法的英文联想会自动补全，无法用于拼写。</p>') +
        strikeHint +
        '<p class="ime-gate-tip">Mac：Caps Lock 或 Control+Space 切换到 ABC/英文<br>' +
        "Windows：Shift 或 Win+Space 切换到 ENG</p>" +
        '<p class="ime-gate-probe-label">请在下方<strong>逐字</strong>输入 <code>test</code> 以确认：</p>' +
        '<div class="ime-gate-progress"></div>' +
        '<input type="text" class="ime-gate-input yysd-en-spell" id="ime-gate-probe" ' +
          'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ' +
          'lang="en" inputmode="latin" aria-label="输入 test 确认英文输入法" />' +
        '<p class="ime-gate-err" hidden></p>' +
      "</div>";
    document.body.appendChild(overlay);
    document.body.classList.add("yysd-ime-gate-open");
    document.addEventListener("keydown", trapTab, true);

    var input = overlay.querySelector("#ime-gate-probe");
    resetProbe(input);

    input.addEventListener("compositionstart", function () {
      composing = true;
      showError("检测到中文输入法，请切换到英文输入法");
      resetProbe(input);
    });

    input.addEventListener("compositionend", function () {
      composing = false;
      if (input.value) {
        showError("检测到中文输入法，请切换到英文输入法");
        resetProbe(input);
      }
    });

    input.addEventListener("beforeinput", function (e) {
      var t = e.inputType || "";
      if (t.indexOf("delete") === 0) {
        e.preventDefault();
        resetProbe(input);
        return;
      }
      if (composing || t.indexOf("Composition") >= 0 || t === "insertReplacementText" ||
          t === "insertFromPaste" || t === "insertFromComposition" || t === "insertFromDrop") {
        e.preventDefault();
        showError("检测到中文输入法，请切换到英文输入法");
        resetProbe(input);
        return;
      }
      if (t === "insertText" && e.data != null) {
        if (e.data.length !== 1 || /[^a-zA-Z]/.test(e.data)) {
          e.preventDefault();
          if (/[\u4e00-\u9fff]/.test(e.data)) {
            showError("请使用英文输入法");
            resetProbe(input);
          }
          return;
        }
        if (e.data.toLowerCase() !== PROBE[probeIdx]) {
          e.preventDefault();
          showError("请按顺序逐字输入 test");
          resetProbe(input);
          return;
        }
        e.preventDefault();
        probeIdx++;
        input.value = PROBE.slice(0, probeIdx);
        renderProgress();
        showError("");
        if (probeIdx >= PROBE.length) {
          input.disabled = true;
          setTimeout(pass, 120);
        }
      }
    });

    input.addEventListener("paste", function (e) {
      e.preventDefault();
      showError("请手动逐字输入，不可粘贴");
      resetProbe(input);
    });

    setTimeout(function () { input.focus(); }, 50);
  }

  function require(opts) {
    opts = opts || {};
    if (pending) return pending.promise;
    var reason = opts.reason || "start";
    var resolve;
    var promise = new Promise(function (res) { resolve = res; });
    pending = { resolve: resolve, promise: promise };
    buildOverlay(reason, { strikes: opts.strikes || 0 });
    return promise;
  }

  function showCheat(opts) {
    opts = opts || {};
    reset();
    overlay = document.createElement("div");
    overlay.className = "yysd-ime-gate yysd-ime-gate--cheat";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ime-cheat-title");
    overlay.innerHTML =
      '<div class="ime-gate-panel ime-gate-panel--cheat">' +
        '<h2 id="ime-cheat-title">检测到作弊行为</h2>' +
        '<p class="ime-gate-lead ime-gate-lead--warn">测试中途多次切换到中文输入法（已超过 ' +
          CHEAT_LIMIT + " 次），本次作答无效。</p>" +
        '<p class="ime-gate-tip">请使用英文输入法完成拼写。可选择重新开始，或退出本次测试。</p>' +
        '<div class="ime-gate-actions">' +
          '<button type="button" class="vl-btn vl-btn-primary" id="ime-cheat-restart">重新开始</button>' +
          '<button type="button" class="vl-btn" id="ime-cheat-exit">退出测试</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(overlay);
    document.body.classList.add("yysd-ime-gate-open");
    overlay.querySelector("#ime-cheat-restart").onclick = function () {
      reset();
      if (opts.onRestart) opts.onRestart();
    };
    overlay.querySelector("#ime-cheat-exit").onclick = function () {
      reset();
      if (opts.onExit) opts.onExit();
    };
  }

  function isOpen() {
    return !!overlay;
  }

  function reset() {
    pending = null;
    close();
  }

  window.YYSD_IME_GATE = {
    require: require,
    isOpen: isOpen,
    reset: reset,
    showCheat: showCheat,
    CHEAT_LIMIT: CHEAT_LIMIT
  };
})();
