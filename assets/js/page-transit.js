/* page-transit.js — tiered motion: light hub hops, scene for exam/auth */
(function () {
  "use strict";

  /* ponytail: two tiers only; add 'panel' later if in-page swaps need a shared helper */
  var MS = { light: 160, scene: 280 };
  var SCENE = {
    "cdt-report.html": 1,
    "speaking-session.html": 1,
    "jingting-player.html": 1
  };
  var AUTH = {
    "login.html": 1,
    "register.html": 1,
    "forgot-password.html": 1,
    "teacher-login.html": 1,
    "teacher-register.html": 1
  };

  var reduced = false;
  try {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var css = document.createElement("style");
  css.setAttribute("data-yysd-silk", "1");
  css.textContent =
    "@keyframes yysdFadeOut{to{opacity:0}}" +
    "@keyframes yysdFadeIn{from{opacity:0}to{opacity:1}}" +
    "@keyframes yysdSilkIn{from{opacity:0;transform:translateY(14px) scale(.988);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}" +
    "@keyframes yysdSilkOut{from{opacity:1;transform:none;filter:none}to{opacity:0;transform:translateY(-8px) scale(.992);filter:blur(2px)}}" +
    "html.yysd-page-leave--light body{animation:yysdFadeOut .16s cubic-bezier(.4,0,.2,1) both;pointer-events:none}" +
    "html.yysd-page-enter--light body{animation:yysdFadeIn .2s cubic-bezier(.22,1,.36,1) both}" +
    "html.yysd-page-leave--scene body{animation:yysdSilkOut .28s cubic-bezier(.4,0,.2,1) both;pointer-events:none}" +
    "html.yysd-page-enter--scene body{animation:yysdSilkIn .42s cubic-bezier(.22,1,.36,1) both}" +
    "@media (prefers-reduced-motion:reduce){html[class*=yysd-page-] body{animation:none!important}}";
  (document.head || document.documentElement).appendChild(css);

  function fileOf(url) {
    try {
      var p = new URL(url, location.href).pathname.replace(/\/+$/, "");
      var i = p.lastIndexOf("/");
      return (i >= 0 ? p.slice(i + 1) : p).toLowerCase() || "index.html";
    } catch (e) {
      return "";
    }
  }

  function resolveTier(toHref, explicit) {
    if (explicit === "none") return "none";
    if (explicit === "scene" || explicit === "light") return explicit;
    var to = fileOf(toHref);
    var from = fileOf(location.href);
    if (SCENE[to] || SCENE[from]) return "scene";
    if ((AUTH[from] && !AUTH[to]) || (!AUTH[from] && AUTH[to])) return "scene";
    return "light";
  }

  function clearLeave() {
    document.documentElement.classList.remove(
      "yysd-page-leave",
      "yysd-page-leave--light",
      "yysd-page-leave--scene"
    );
  }

  function go(href, opts) {
    if (!href) return;
    var explicit = typeof opts === "string" ? opts : opts && opts.tier;
    var tier = resolveTier(href, explicit);
    if (reduced || tier === "none" || document.documentElement.classList.contains("yysd-page-leave")) {
      location.href = href;
      return;
    }
    try {
      sessionStorage.setItem("yysd:silk", tier);
    } catch (e) {}
    document.documentElement.classList.add("yysd-page-leave", "yysd-page-leave--" + tier);
    window.setTimeout(function () {
      location.href = href;
    }, MS[tier] || MS.light);
  }
  window.YYSD_GO = go;
  window.YYSD_GO_TIER = resolveTier;

  try {
    var arrive = sessionStorage.getItem("yysd:silk");
    if (arrive === "light" || arrive === "scene") {
      sessionStorage.removeItem("yysd:silk");
      if (!reduced) {
        document.documentElement.classList.add("yysd-page-enter", "yysd-page-enter--" + arrive);
      }
    } else if (arrive === "1") {
      /* ponytail: migrate old flag → light */
      sessionStorage.removeItem("yysd:silk");
      if (!reduced) {
        document.documentElement.classList.add("yysd-page-enter", "yysd-page-enter--light");
      }
    }
  } catch (e) {}

  window.addEventListener("pageshow", function (ev) {
    clearLeave();
    if (ev.persisted) {
      try {
        sessionStorage.removeItem("yysd:silk");
      } catch (e) {}
    }
  });

  function sameDoc(url) {
    try {
      var u = new URL(url, location.href);
      return u.origin === location.origin && u.pathname === location.pathname && u.search === location.search;
    } catch (e) {
      return false;
    }
  }

  function shouldSkip(a, e) {
    if (!a || e.defaultPrevented) return true;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return true;
    if (a.target && a.target !== "_self") return true;
    if (a.hasAttribute("download")) return true;
    if (a.getAttribute("data-no-silk") != null) return true;
    if (a.getAttribute("data-silk") === "none") return true;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#") return true;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return true;
    try {
      if (new URL(a.href, location.href).origin !== location.origin) return true;
    } catch (err) {
      return true;
    }
    if (sameDoc(a.href)) return true;
    return false;
  }

  document.addEventListener(
    "click",
    function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (shouldSkip(a, e)) return;
      e.preventDefault();
      go(a.href, a.getAttribute("data-silk") || undefined);
    },
    false
  );
})();
