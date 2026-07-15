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

  function pageName() {
    var parts = location.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "index.html";
  }

  function isPublicPage() {
    return !!PUBLIC_PAGES[pageName()];
  }

  function isTeacherPage() {
    var n = pageName();
    return n === "teacher.html" || n === "teacher-calendar.html" ||
      n === "admin-assign.html" || isPublicPage();
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
    } catch (e) {}
    setAuthCookie(false);
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(STUDENT_TOKEN_KEY) || "";
    } catch (e) { return ""; }
  }

  function setToken(t) {
    if (!t) {
      clearSession();
      return;
    }
    try {
      localStorage.setItem(TOKEN_KEY, t);
      localStorage.setItem(STUDENT_TOKEN_KEY, t);
    } catch (e) {}
    setAuthCookie(true);
    if (!t) setTeacher(null);
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
          isAdmin: !!t.isAdmin
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
  }

  function authHeaders() {
    var h = { "Content-Type": "application/json" };
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
      return r.json().then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || "请求失败");
        return d;
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
    if (!getToken()) {
      location.replace("teacher-login.html?next=" + encodeURIComponent(location.pathname + location.search));
      return false;
    }
    setAuthCookie(true);
    return true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!isTeacherPage()) return;
    if (!guardPage()) return;
    revealAdminNav();
    if (getToken() && !isPublicPage() && pageName() !== "admin-assign.html") {
      api("/api/teacher/me").then(function (d) {
        var me = d.teacher || {};
        setTeacher({
          phone: me.phone,
          name: me.name || "",
          avatarUrl: me.avatarUrl || "",
          isAdmin: !!me.isAdmin
        });
        revealAdminNav();
      }).catch(function () {});
    }
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
