/* =========================================================================
   nav.js — product-line topbar + white/orange IELTS mega menu (Phase 0)
   ========================================================================= */
(function () {
  "use strict";

  var topbar = document.querySelector(".minimal-topbar");
  if (!topbar) return;

  var nav = document.getElementById("nav");
  var mega = null;
  var megaTimer = null;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function canAiAdmit() {
    var A = window.YYSD_AUTH;
    if (A && typeof A.canAiAdmit === "function") return !!A.canAiAdmit();
    // fallback when auth.js cache lacks helper — HQ host only
    var h = (location.hostname || "").toLowerCase();
    return (
      !h ||
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "youyisida.com" ||
      h === "www.youyisida.com"
    );
  }

  // ponytail: 词境只从单词区 banner 进，不占顶栏
  var TOP_LINKS = [
    { href: "index.html", key: "home", label: "首页" },
    { href: "zone.html?zone=study&s=vocab", key: "words", label: "单词", zone: "study" },
    { href: "zone.html?zone=mock", key: "ielts", label: "雅思", mega: true },
    { href: "alevel.html", key: "intl", label: "国际课程" },
    { href: "/rankings", key: "rankings", label: "全球大学排行榜", special: "nav-rankings", rankings: true },
    { href: "/admission", key: "ai-admit", label: "AI升学顾问", special: "nav-ai-admit", aiAdmit: true },
    { href: "dashboard.html", key: "tasks", label: "任务中心" }
  ].filter(function (l) {
    if ((l.aiAdmit || l.rankings) && !canAiAdmit()) return false;
    return true;
  });

  var MEGA_COLS = [
    {
      key: "listening",
      title: "听力",
      href: "zone.html?zone=mock&s=listening",
      links: [
        { href: "zone.html?zone=mock&s=listening", label: "听力真题顺序练习" },
        { href: "zone.html?zone=mock&s=jingting", label: "听力真题精听" }
      ]
    },
    {
      key: "reading",
      title: "阅读",
      href: "zone.html?zone=mock&s=reading",
      links: [{ href: "zone.html?zone=mock&s=reading", label: "阅读真题顺序练习" }]
    },
    {
      key: "speaking",
      title: "口语",
      href: "speaking.html",
      links: [{ href: "speaking.html", label: "AI口语练习/模考" }]
    },
    {
      key: "writing",
      title: "写作",
      href: "zone.html?zone=mock&s=writing",
      links: [
        { href: "zone.html?zone=mock&s=writing", label: "写作真题顺序练习" },
        { href: "ai-tutor.html?track=writing", label: "AI写作批改" }
      ]
    },
    {
      key: "mock",
      title: "模考",
      href: "zone.html?zone=mock&s=mock",
      links: [{ href: "zone.html?zone=mock&s=mock", label: "剑桥套题模考" }]
    }
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function orgName() {
    var A = window.YYSD_AUTH;
    var org = A && A.getOrg && A.getOrg();
    return (org && org.name) || "学习中心";
  }

  function renderUser() {
    var A = window.YYSD_AUTH;
    var logged = !!(A && A.getToken && A.getToken());
    var user = logged && A.getUser ? A.getUser() : {};
    var phone = (user.phone || "").trim();
    var label = (user.displayName || "").trim() || "个人中心";
    var src = logged && A.avatarSrc ? A.avatarSrc(user.avatarUrl) : "";
    var avatar = src
      ? '<img class="nav-auth__avatar nav-auth__avatar--img" src="' + esc(src) + '" alt="">'
      : '<span class="nav-auth__avatar" aria-hidden="true">' + esc(phone.slice(-4) || "·") + "</span>";
    return '<div class="reme-user" id="nav-user">' +
      '<a href="' + (logged ? "profile.html" : "login.html") + '" id="nav-auth" class="reme-avatar' + (logged ? " is-logged-in" : "") + '">' +
        avatar + '<span class="nav-auth__label">' + (logged ? esc(label) : "登录") + "</span>" +
      "</a>" +
      '<div class="reme-dropdown" id="nav-dropdown" hidden>' +
        (logged
          ? '<a href="profile.html">个人中心</a><a href="results.html">我的成绩</a><button type="button" id="nav-logout">退出登录</button>'
          : '<a href="login.html">登录</a><a href="register.html">注册</a>') +
      "</div>" +
    "</div>";
  }

  function megaHTML() {
    return '<div class="mega-panel__inner">' +
      MEGA_COLS.map(function (col) {
        return '<div class="mega-col mega-col--' + esc(col.key || "") + '">' +
          '<a class="mega-col__head" href="' + esc(col.href) + '">' +
            '<span>' + esc(col.title) + '</span><span class="mega-col__arrow" aria-hidden="true">→</span>' +
          "</a>" +
          '<ul class="mega-col__list">' +
            col.links.map(function (l) {
              return '<li><a href="' + esc(l.href) + '">' + esc(l.label) + "</a></li>";
            }).join("") +
          "</ul></div>";
      }).join("") +
      "</div>";
  }

  function setMega(open) {
    if (!mega) return;
    mega.classList.toggle("is-open", open);
    mega.setAttribute("aria-hidden", open ? "false" : "true");
    topbar.classList.toggle("is-mega-open", open);
    var trigger = nav && nav.querySelector('[data-key="ielts"]');
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function openMegaSoon() {
    clearTimeout(megaTimer);
    setMega(true);
  }

  function closeMegaSoon() {
    clearTimeout(megaTimer);
    megaTimer = setTimeout(function () { setMega(false); }, 160);
  }

  function upgradeTopbar() {
    var inner = topbar.querySelector(".minimal-topbar__inner");
    if (!inner) {
      inner = document.createElement("div");
      inner.className = "minimal-shell minimal-topbar__inner";
      topbar.appendChild(inner);
    }
    topbar.classList.add("reme-topbar");
    document.body.classList.remove("shell-compact-nav", "student-layout");

    var brand = inner.querySelector(".minimal-brand");
    if (!brand) {
      brand = document.createElement("a");
      brand.href = "index.html";
      brand.className = "minimal-brand";
      brand.setAttribute("aria-label", orgName() + "首页");
      brand.innerHTML = '<img src="assets/img/logo.svg?v=20260702-logo" alt="" class="minimal-brand__logo">' +
        '<span class="minimal-brand__text"><b>' + esc(orgName()) + '</b><span>Learning Center</span></span>';
    }

    var newNav = document.createElement("nav");
    newNav.className = "reme-nav";
    newNav.id = "nav";
    newNav.setAttribute("aria-label", "主导航");
    newNav.innerHTML = TOP_LINKS.map(function (l) {
      var cls = [];
      if (l.mega) cls.push("reme-nav__ielts");
      if (l.special) cls.push(l.special);
      var extra = (l.zone ? ' data-zone="' + l.zone + '"' : "") +
        (l.mega ? ' aria-haspopup="true" aria-expanded="false"' : "") +
        (cls.length ? ' class="' + cls.join(" ") + '"' : "");
      var label = l.special
        ? '<span class="' + l.special + '__text">' + esc(l.label) + "</span>"
        : esc(l.label);
      return '<a href="' + l.href + '" data-key="' + l.key + '"' + extra + ">" + label + "</a>";
    }).join("");

    var tools = document.createElement("div");
    tools.className = "reme-tools";
    tools.innerHTML =
      '<button type="button" class="reme-tool" id="nav-bell" aria-label="通知">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
      "</button>" +
      '<span class="reme-badge" id="nav-sub">Pro</span>' +
      renderUser();

    var menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "nav-menu-btn";
    menuBtn.setAttribute("aria-label", "打开菜单");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.innerHTML =
      '<span class="nav-menu-btn__bar" aria-hidden="true"></span>' +
      '<span class="nav-menu-btn__bar" aria-hidden="true"></span>' +
      '<span class="nav-menu-btn__bar" aria-hidden="true"></span>';

    inner.innerHTML = "";
    inner.appendChild(brand);
    inner.appendChild(newNav);
    inner.appendChild(tools);
    inner.appendChild(menuBtn);

    nav = document.getElementById("nav");

    mega = document.getElementById("nav-mega");
    if (!mega) {
      mega = document.createElement("div");
      mega.id = "nav-mega";
      mega.className = "mega-panel";
      mega.setAttribute("aria-hidden", "true");
      topbar.appendChild(mega);
    }
    mega.innerHTML = megaHTML();
    mega.classList.remove("is-open");
    mega.setAttribute("aria-hidden", "true");

    var ieltsLink = nav.querySelector('[data-key="ielts"]');
    if (ieltsLink) {
      if (canHover) {
        ieltsLink.addEventListener("mouseenter", openMegaSoon);
        ieltsLink.addEventListener("mouseleave", closeMegaSoon);
        mega.addEventListener("mouseenter", openMegaSoon);
        mega.addEventListener("mouseleave", closeMegaSoon);
      }
      ieltsLink.addEventListener("click", function (e) {
        if (canHover) return;
        e.preventDefault();
        setMega(!mega.classList.contains("is-open"));
      });
    }

    document.addEventListener("click", function (e) {
      if (!mega || !mega.classList.contains("is-open")) return;
      if (topbar.contains(e.target)) return;
      setMega(false);
    });

    var userToggle = document.getElementById("nav-auth");
    var dropdown = document.getElementById("nav-dropdown");
    if (userToggle && dropdown) {
      userToggle.addEventListener("click", function (e) {
        var A = window.YYSD_AUTH;
        if (A && A.getToken && A.getToken()) {
          e.preventDefault();
          dropdown.hidden = !dropdown.hidden;
        }
      });
      var logout = document.getElementById("nav-logout");
      if (logout) {
        logout.addEventListener("click", function () {
          var A = window.YYSD_AUTH;
          if (A && A.logout) A.logout();
        });
      }
      document.addEventListener("click", function (e) {
        if (!dropdown.hidden && !userToggle.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.hidden = true;
        }
      });
    }

    var A = window.YYSD_AUTH;
    if (A && A.applyOrgBrand) A.applyOrgBrand(A.getOrg && A.getOrg());
    if (A && A.bindNav) A.bindNav();
  }

  upgradeTopbar();

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
    TOP_LINKS.forEach(function (l) {
      var a = document.createElement("a");
      a.href = l.href;
      a.dataset.key = l.key;
      if (l.special) {
        a.className = l.special;
        a.innerHTML = '<span class="' + l.special + '__text">' + esc(l.label) + "</span>";
      } else {
        a.textContent = l.label;
      }
      drawerNav.appendChild(a);
      if (l.mega) {
        MEGA_COLS.forEach(function (col) {
          col.links.forEach(function (link) {
            var sub = document.createElement("a");
            sub.href = link.href;
            sub.className = "nav-drawer__sub";
            sub.dataset.key = "ielts";
            sub.textContent = col.title + " · " + link.label;
            drawerNav.appendChild(sub);
          });
        });
      }
    });
  }
  rebuildDrawer();

  drawer.appendChild(drawerHead);
  drawer.appendChild(drawerNav);
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  var menuBtn = document.querySelector(".nav-menu-btn");
  function setDrawer(open) {
    if (menuBtn) menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    overlay.hidden = !open;
    drawer.hidden = !open;
    document.body.classList.toggle("nav-drawer-open", open);
    if (open) {
      setMega(false);
      closeBtn.focus();
    } else if (menuBtn) menuBtn.focus();
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      rebuildDrawer();
      setDrawer(drawer.hidden);
    });
  }
  closeBtn.addEventListener("click", function () { setDrawer(false); });
  overlay.addEventListener("click", function () { setDrawer(false); });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!drawer.hidden) setDrawer(false);
    if (mega && mega.classList.contains("is-open")) setMega(false);
  });

  function meHref() {
    var A = window.YYSD_AUTH;
    if (A && A.getToken && A.getToken()) return "profile.html";
    return "login.html";
  }

  var tabs = document.createElement("nav");
  tabs.className = "mobile-tabs";
  tabs.setAttribute("aria-label", "快捷导航");
  [
    { href: "index.html", label: "首页", key: "home" },
    { href: "zone.html?zone=study&s=vocab", label: "单词", key: "words" },
    { href: "zone.html?zone=mock", label: "雅思", key: "ielts" },
    { href: "dashboard.html", label: "任务", key: "tasks" },
    { href: meHref(), label: "我的", key: "me", dynamic: true }
  ].forEach(function (t) {
    var a = document.createElement("a");
    a.href = t.dynamic ? meHref() : t.href;
    a.className = "mobile-tabs__item";
    a.dataset.key = t.key;
    a.innerHTML =
      '<span class="mobile-tabs__ico" aria-hidden="true">' + t.label.charAt(0) + "</span>" +
      "<span>" + t.label + "</span>";
    tabs.appendChild(a);
  });
  document.body.appendChild(tabs);
  document.body.classList.add("has-mobile-tabs");

  function markActive() {
    var path = location.pathname.split("/").pop() || "index.html";
    var zone = new URLSearchParams(location.search).get("zone");
    var subject = new URLSearchParams(location.search).get("s");

    function clear(list) {
      list.forEach(function (a) { a.classList.remove("is-active"); });
    }
    var navLinks = nav.querySelectorAll("a");
    clear(navLinks);
    clear(drawerNav.querySelectorAll("a"));
    clear(tabs.querySelectorAll("a"));

    function activate(key) {
      navLinks.forEach(function (a) { if (a.dataset.key === key) a.classList.add("is-active"); });
      drawerNav.querySelectorAll("a").forEach(function (a) { if (a.dataset.key === key) a.classList.add("is-active"); });
      tabs.querySelectorAll("a").forEach(function (a) { if (a.dataset.key === key) a.classList.add("is-active"); });
    }

    if (path === "index.html" || path === "") { activate("home"); return; }
    if (location.pathname.indexOf("/rankings") === 0) { activate("rankings"); return; }
    if (location.pathname.indexOf("/admission") === 0) { activate("ai-admit"); return; }
    if (path === "dashboard.html" || path === "calendar.html") { activate("tasks"); return; }
    if (path === "alevel.html" || path.indexOf("alevel") === 0) { activate("intl"); return; }
    if (path === "zone.html" && zone === "study") { activate("words"); return; }
    if (path === "vocab.html" || path === "wrong-words.html" || path === "saved-words.html" ||
        path === "vocab-shelf.html" || path === "vocab-learn.html" || path === "vocab-quiz.html" ||
        path === "vocab-themes.html" || path === "hs-vocab.html" || path === "word-realm.html" ||
        path === "vocab-lesson.html") {
      activate("words");
      return;
    }
    if (path === "speaking.html" || path === "speaking-select.html" || path === "speaking-session.html") { activate("ielts"); return; }
    if (path === "ai-tutor.html" || path === "jingting-player.html") { activate("ielts"); return; }
    if (path === "cambridge.html" || (path === "zone.html" && zone === "mock") || (path === "zone.html" && subject === "ielts")) {
      activate("ielts");
      return;
    }
    if (path === "zone.html" && zone === "practice") { activate("ielts"); return; }
    if (path === "results.html" || path === "profile.html" || path === "login.html" || path === "register.html" || path === "forgot-password.html") {
      activate("me");
    }
  }

  markActive();
  document.addEventListener("DOMContentLoaded", function () {
    rebuildDrawer();
    markActive();
  });

})();
