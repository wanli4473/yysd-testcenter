/* =========================================================================
   home.js — landing: IELTS + A-Level dual sections
   ========================================================================= */
(function () {
  "use strict";

  var Y = window.YYSD;
  var A = window.YYSD_ALEVEL;
  var ieltsEl = document.getElementById("home-ielts");
  var showcaseEl = document.getElementById("home-alevel-showcase");

  function bindReveal(root) {
    if (!root || !window.YYSD_UI_REVEAL) return;
    root.querySelectorAll(".reveal").forEach(function (el, i) {
      el.style.setProperty("--reveal-delay", String((i % 8) * 60) + "ms");
    });
    window.YYSD_UI_REVEAL(root.querySelectorAll(".reveal"));
  }

  function countupMetrics(root) {
    if (!root || !window.YYSD_UI_COUNTUP) return;
    root.querySelectorAll("[data-count]").forEach(function (el) {
      window.YYSD_UI_COUNTUP(el);
    });
  }

  function renderError(err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : (err && err.message) || "内容加载失败。";
    var html = '<div class="state state--brand"><h3>加载失败</h3><p>' + Y.esc(msg) + "</p></div>";
    if (ieltsEl) ieltsEl.innerHTML = html;
    if (showcaseEl) showcaseEl.innerHTML = html;
  }

  Promise.all([Y.load(), A.loadCatalog().catch(function () { return null; })]).then(function (res) {
    if (ieltsEl) {
      ieltsEl.innerHTML = Y.homeIeltsHTML(res[0], "");
      bindReveal(ieltsEl);
    }
    if (showcaseEl) {
      showcaseEl.innerHTML = A.homeShowcaseHTML(res[1], "");
      bindReveal(showcaseEl);
      countupMetrics(showcaseEl);
    }
  }).catch(renderError);

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
