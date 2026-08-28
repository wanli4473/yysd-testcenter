/* =========================================================================
   teacher-auth.js — 教师端登录态与 API
   ========================================================================= */
window.YYSD_TEACHER = (function () {
  "use strict";

  var API_BASE = (typeof location !== "undefined" &&
    (location.hostname === "localhost" || location.hostname === "127.0.0.1"))
    ? (location.protocol + "//" + location.hostname + ":3000")
    : "https://api.youyisida.com";
  var TOKEN_KEY = "yysd:teacher:token";
  var TEACHER_KEY = "yysd:teacher:user";
  var STUDENT_TOKEN_KEY = "yysd:auth:token";
  var AUTH_COOKIE = "yysd_auth";
  var PUBLIC_PAGES = { "teacher-login.html": 1, "teacher-register.html": 1 };
  var MODE_KEY = "yysd:teacher:mode";

  function pageName() {
    var parts = location.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "index.html";
  }

  function isPublicPage() {
    return !!PUBLIC_PAGES[pageName()];
  }

  function isModePickerPage() {
    return pageName() === "teacher-mode-picker.html";
  }

  function getTeacherMode() {
    try {
      return localStorage.getItem(MODE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function hasChosenMode() {
    var m = getTeacherMode();
    return m === "admin" || m === "site";
  }

  function isTeacherPage() {
    var n = pageName();
    return n === "teacher.html" || n === "teacher-calendar.html" ||
      n === "teacher-diagnostic.html" ||
      n === "teacher-student-diagnostic.html" ||
      n === "teacher-student-report.html" ||
      n === "teacher-vocab-challenge.html" ||
      n === "teacher-mode-picker.html" ||
      n === "admin-assign.html" || n === "platform.html" || isPublicPage();
  }

  function setAuthCookie(on) {
    var secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = AUTH_COOKIE + "=" + (on ? "1" : "") +
      "; path=/; max-age=" + (on ? 2592000 : 0) + "; SameSite=Lax" + secure;
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TEACHER_KEY);
      localStorage.removeItem(STUDENT_TOKEN_KEY);
      localStorage.removeItem("yysd:auth:user");
      localStorage.removeItem("yysd:teacher:mode");
    } catch (e) {}
    setAuthCookie(false);
  }

  function getToken() {
    try {
      // ponytail: student JWT must not count as teacher login (opens picker)
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (e) { return ""; }
  }

  function setToken(t) {
    if (!t) {
      clearSession();
      return;
    }
    try {
      localStorage.setItem(TOKEN_KEY, t);
      // ponytail: never mirror teacher JWT into yysd:auth:token — site-mode uses a shadow student
    } catch (e) {}
    setAuthCookie(true);
  }

  function getTeacher() {
    try { return JSON.parse(localStorage.getItem(TEACHER_KEY) || "{}"); } catch (e) { return {}; }
  }

  function setTeacher(t) {
    try {
      if (t && t.phone) {
        localStorage.setItem(TEACHER_KEY, JSON.stringify({
          phone: t.phone,
          name: t.name || "",
          avatarUrl: t.avatarUrl || "",
          isAdmin: !!t.isAdmin,
          isPlatformAdmin: !!t.isPlatformAdmin
        }));
      } else localStorage.removeItem(TEACHER_KEY);
    } catch (e) {}
  }

  function isAdmin() {
    return !!(getTeacher().isAdmin);
  }

  function revealAdminNav() {
    var show = isAdmin();
    document.querySelectorAll("[data-admin-only]").forEach(function (el) {
      el.hidden = !show;
    });
    var onHq = true;
    try {
      onHq = !(window.YYSD_AUTH && YYSD_AUTH.isHqSite) || YYSD_AUTH.isHqSite();
    } catch (e) {}
    var plat = !!(getTeacher().isPlatformAdmin) && onHq;
    document.querySelectorAll("[data-platform-only]").forEach(function (el) {
      el.hidden = !plat;
    });
  }

  function authHeaders() {
    var h = { "Content-Type": "application/json" };
    var slug = "yysd";
    try {
      if (window.YYSD_AUTH && YYSD_AUTH.tenantSlug) slug = YYSD_AUTH.tenantSlug();
      else {
        var host = (location.hostname || "").toLowerCase();
        var m = host.match(/^([a-z0-9-]+)\.youyisida\.com$/);
        if (m && !/^(www|api)$/.test(m[1])) slug = m[1];
      }
    } catch (e) {}
    h["X-Tenant-Slug"] = slug;
    var t = getToken();
    if (t) h.Authorization = "Bearer " + t;
    return h;
  }

  function api(path, opts) {
    opts = opts || {};
    return fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: authHeaders(),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.text().then(function (raw) {
        var d = null;
        try { d = raw ? JSON.parse(raw) : null; } catch (e) { d = null; }
        if (!r.ok) {
          throw new Error((d && d.error) || (r.status === 502 ? "服务暂不可用，请重试" : "请求失败"));
        }
        return d || {};
      });
    });
  }

  function logout() {
    clearSession();
    location.href = "index.html";
  }

  function guardPage() {
    if (!isTeacherPage()) return true;
    if (isPublicPage()) return true;
    if (pageName() === "platform.html") {
      if (getToken()) {
        setAuthCookie(true);
        return true;
      }
      try {
        if (localStorage.getItem(STUDENT_TOKEN_KEY)) return true;
      } catch (e) {}
      location.replace("teacher-login.html?next=" + encodeURIComponent(location.pathname + location.search));
      return false;
    }
    if (!getToken()) {
      location.replace("teacher-login.html?next=" + encodeURIComponent(location.pathname + location.search));
      return false;
    }
    setAuthCookie(true);
    if (isModePickerPage()) return true;
    if (!hasChosenMode()) {
      location.replace("teacher-mode-picker.html");
      return false;
    }
    if (getTeacherMode() === "site") {
      location.replace("index.html");
      return false;
    }
    return true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!isTeacherPage()) return;
    // ponytail: teacher-mode.js is loaded synchronously on admin teacher pages
    try {
      var m = location.search.match(/[?&]impersonate=([^&]+)/);
      if (m) {
        var tok = decodeURIComponent(m[1]);
        if (tok) {
          setToken(tok);
          setTeacher({ phone: "客服", name: "平台客服", isAdmin: true, isPlatformAdmin: true });
          if (window.YYSD_AUTH && YYSD_AUTH.applyLogin) {
            YYSD_AUTH.applyLogin({
              token: tok,
              role: "teacher",
              teacher: { phone: "客服", name: "平台客服", isAdmin: true, isPlatformAdmin: true }
            });
          }
          history.replaceState({}, "", location.pathname);
        }
      }
    } catch (e) {}
    if (!guardPage()) return;
    revealAdminNav();
    if (!getToken() || isPublicPage()) return;
    var mePath = pageName() === "admin-assign.html" ? "/api/auth/me" : "/api/teacher/me";
    api(mePath).then(function (d) {
      var me = d.teacher || d.user || {};
      setTeacher({
        phone: me.phone,
        name: me.name || me.displayName || "",
        avatarUrl: me.avatarUrl || "",
        isAdmin: !!me.isAdmin,
        isPlatformAdmin: !!me.isPlatformAdmin
      });
      revealAdminNav();
    }).catch(function () {
      // 学生超管 token 也可进教师页看主控台入口：再试 /api/auth/me
      if (window.YYSD_AUTH && YYSD_AUTH.api) {
        YYSD_AUTH.api("/api/auth/me").then(function (d) {
          var me = d.user || {};
          if (!me.isPlatformAdmin) return;
          setTeacher({
            phone: me.phone,
            name: me.displayName || "",
            avatarUrl: me.avatarUrl || "",
            isAdmin: true,
            isPlatformAdmin: true
          });
          revealAdminNav();
        }).catch(function () {});
      }
    });
  });

  return {
    API_BASE: API_BASE,
    getToken: getToken,
    setToken: setToken,
    getTeacher: getTeacher,
    setTeacher: setTeacher,
    isAdmin: isAdmin,
    api: api,
    logout: logout
  };
})();
