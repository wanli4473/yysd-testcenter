/* =========================================================================
   nav.js — mobile drawer + bottom tabs (P0 shell navigation)
   ========================================================================= */
(function () {
  "use strict";

  var topbar = document.querySelector(".minimal-topbar__inner");
  var nav = document.getElementById("nav");
  if (!topbar || !nav) return;

  var adminLink = nav.querySelector('a[href*="admin"]');
  if (adminLink) adminLink.remove();

  if (!nav.querySelector('a[href*="results"]')) {
    var authEl = document.getElementById("nav-auth");
    var results = document.createElement("a");
    results.href = "results.html";
    results.setAttribute("data-nav", "results");
    results.textContent = "我的成绩";
    if (authEl) nav.insertBefore(results, authEl);
    else nav.appendChild(results);
  }

  var menuBtn = document.createElement("button");
  menuBtn.type = "button";
  menuBtn.className = "nav-menu-btn";
  menuBtn.setAttribute("aria-label", "打开菜单");
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.innerHTML =
    '<span class="nav-menu-btn__bar" aria-hidden="true"></span>' +
    '<span class="nav-menu-btn__bar" aria-hidden="true"></span>' +
    '<span class="nav-menu-btn__bar" aria-hidden="true"></span>';
  topbar.appendChild(menuBtn);

  var overlay = document.createElement("div");
  overlay.className = "nav-drawer-overlay";
  overlay.hidden = true;

  var drawer = document.createElement("aside");
  drawer.className = "nav-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-label", "站点菜单");
  drawer.hidden = true;

  var drawerHead = document.createElement("div");
  drawerHead.className = "nav-drawer__head";
  drawerHead.innerHTML = "<b>菜单</b>";
  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "nav-drawer__close";
  closeBtn.setAttribute("aria-label", "关闭菜单");
  closeBtn.textContent = "×";
  drawerHead.appendChild(closeBtn);

  var drawerNav = document.createElement("nav");
  drawerNav.className = "nav-drawer__links";
  drawerNav.setAttribute("aria-label", "页面导航");

  function rebuildDrawer() {
    drawerNav.innerHTML = "";
    nav.querySelectorAll("a").forEach(function (a) {
      drawerNav.appendChild(a.cloneNode(true));
    });
  }
  rebuildDrawer();

  drawer.appendChild(drawerHead);
  drawer.appendChild(drawerNav);

  if (adminLink) {
    var drawerFoot = document.createElement("div");
    drawerFoot.className = "nav-drawer__foot";
    drawerFoot.appendChild(adminLink.cloneNode(true));
    drawer.appendChild(drawerFoot);
  }

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  function meHref() {
    var A = window.YYSD_AUTH;
    if (A && A.getToken && A.getToken()) return "profile.html";
    return "results.html";
  }

  var tabs = document.createElement("nav");
  tabs.className = "mobile-tabs";
  tabs.setAttribute("aria-label", "快捷导航");
  [
    { href: "dashboard.html", label: "待办", key: "dash" },
    { href: "zone.html?zone=study", label: "单词", key: "study" },
    { href: "zone.html?zone=practice", label: "练习", key: "practice" },
    { href: "zone.html?zone=mock", label: "真题", key: "mock" },
    { href: meHref(), label: "我的", key: "me", dynamic: true }
  ].forEach(function (t) {
    var a = document.createElement("a");
    a.href = t.dynamic ? meHref() : t.href;
    a.className = "mobile-tabs__item";
    a.dataset.tab = t.key;
    a.innerHTML =
      '<span class="mobile-tabs__ico" aria-hidden="true">' + t.label.charAt(0) + "</span>" +
      "<span>" + t.label + "</span>";
    tabs.appendChild(a);
  });
  document.body.appendChild(tabs);
  document.body.classList.add("has-mobile-tabs");

  function setDrawer(open) {
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    overlay.hidden = !open;
    drawer.hidden = !open;
    document.body.classList.toggle("nav-drawer-open", open);
    if (open) closeBtn.focus();
    else menuBtn.focus();
  }

  menuBtn.addEventListener("click", function () {
    rebuildDrawer();
    setDrawer(drawer.hidden);
  });
  closeBtn.addEventListener("click", function () { setDrawer(false); });
  overlay.addEventListener("click", function () { setDrawer(false); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !drawer.hidden) setDrawer(false);
  });

  function markActive() {
    var path = location.pathname.split("/").pop() || "index.html";
    var zone = new URLSearchParams(location.search).get("zone");

    nav.querySelectorAll("a").forEach(function (a) {
      a.classList.remove("is-active");
    });
    drawerNav.querySelectorAll("a").forEach(function (a) {
      a.classList.remove("is-active");
    });
    tabs.querySelectorAll("a").forEach(function (a) {
      a.classList.remove("is-active");
    });

    function activate(linkList, predicate) {
      linkList.forEach(function (a) {
        if (predicate(a)) a.classList.add("is-active");
      });
    }

    if (path === "dashboard.html" || path === "calendar.html") {
      activate(nav.querySelectorAll("a"), function (a) {
        return a.getAttribute("data-nav") === "dashboard" || (a.getAttribute("href") || "").indexOf("dashboard") >= 0;
      });
      activate(drawerNav.querySelectorAll("a"), function (a) {
        return (a.getAttribute("href") || "").indexOf("dashboard") >= 0;
      });
      activate(tabs.querySelectorAll("a"), function (a) {
        return a.dataset.tab === "dash";
      });
      return;
    }
    if (path === "index.html" || path === "") {
      return;
    }
    if (path === "zone.html" && zone) {
      activate(nav.querySelectorAll("a"), function (a) {
        return a.getAttribute("data-zone") === zone;
      });
      activate(drawerNav.querySelectorAll("a"), function (a) {
        return a.getAttribute("data-zone") === zone;
      });
      activate(tabs.querySelectorAll("a"), function (a) {
        return a.dataset.tab === zone;
      });
      return;
    }
    if (path === "cambridge.html" || path.indexOf("alevel") === 0) {
      activate(nav.querySelectorAll("a"), function (a) {
        return a.getAttribute("data-zone") === "mock";
      });
      activate(tabs.querySelectorAll("a"), function (a) {
        return a.dataset.tab === "mock";
      });
      return;
    }
    if (path === "vocab.html" || path === "wrong-words.html" || path === "saved-words.html") {
      activate(nav.querySelectorAll("a"), function (a) {
        return a.getAttribute("data-zone") === "study";
      });
      activate(tabs.querySelectorAll("a"), function (a) {
        return a.dataset.tab === "study";
      });
      return;
    }
    if (path === "results.html" || path === "profile.html" || path === "login.html") {
      activate(nav.querySelectorAll("a"), function (a) {
        return a.getAttribute("data-nav") === "results" || a.id === "nav-auth";
      });
      activate(tabs.querySelectorAll("a"), function (a) {
        return a.dataset.tab === "me";
      });
    }
  }

  markActive();
  document.addEventListener("DOMContentLoaded", function () {
    rebuildDrawer();
    markActive();
  });

  try {
    if (localStorage.getItem("yysd:mascot-off") === "1") {
      var foot = document.querySelector(".minimal-footer__copy");
      if (foot && !foot.querySelector(".mascot-restore-link")) {
        foot.appendChild(document.createTextNode(" · "));
        var link = document.createElement("a");
        link.href = "#";
        link.className = "mascot-restore-link";
        link.textContent = "启用思达助手";
        link.addEventListener("click", function (e) {
          e.preventDefault();
          localStorage.removeItem("yysd:mascot-off");
          location.reload();
        });
        foot.appendChild(link);
      }
    }
  } catch (e) { /* ponytail: storage edge */ }
})();
