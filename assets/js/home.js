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

  function renderGuestGate() {
    var next = encodeURIComponent(location.pathname + location.search);
    var html =
      '<section class="home-gate reveal" aria-label="登录提示">' +
        '<div class="home-gate__inner">' +
          '<span class="home-gate__eyebrow">MEMBERS ONLY</span>' +
          "<h2>登录后查看全部内容</h2>" +
          "<p>学习区、练习区、模考区与 A-Level 真题资料需登录后使用。注册只需验证手机号并设置密码。</p>" +
          '<div class="home-gate__actions">' +
            '<a class="btn btn--primary pressable" href="login.html?next=' + next + '">登录</a>' +
            '<a class="btn btn--ghost pressable" href="register.html">注册账号</a>' +
          "</div>" +
        "</div>" +
      "</section>";
    if (ieltsEl) ieltsEl.innerHTML = html;
    if (showcaseEl) showcaseEl.innerHTML = "";
    bindReveal(ieltsEl);
  }

  var auth = window.YYSD_AUTH;
  if (!auth || !auth.getToken || !auth.getToken()) {
    renderGuestGate();
    var yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();
    return;
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
