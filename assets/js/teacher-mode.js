/* teacher-mode.js — 教师端 ⇄ 网站功能区 切换 */
(function () {
  "use strict";

  var MODE_KEY = "yysd:teacher:mode";
  var T = window.YYSD_TEACHER;
  var A = window.YYSD_AUTH;

  function getMode() {
    try {
      return localStorage.getItem(MODE_KEY) || "admin";
    } catch (e) {
      return "admin";
    }
  }

  function setMode(mode) {
    try {
      localStorage.setItem(MODE_KEY, mode === "site" ? "site" : "admin");
    } catch (e) {}
  }

  function isSiteMode() {
    try {
      return getMode() === "site" &&
        !!localStorage.getItem("yysd:teacher:token") &&
        !!localStorage.getItem("yysd:auth:token");
    } catch (e) {
      return false;
    }
  }

  function applySiteModeLogin(d) {
    setMode("site");
    if (A && A.applyLogin) {
      A.applyLogin({ token: d.token, user: d.user, role: "student" });
    } else if (A && A.setToken) {
      A.setToken(d.token);
    }
  }

  /** Site mode flag set but student JWT missing or polluted with teacher JWT. */
  function siteModeNeedsRestore() {
    return !!(A && A.teacherSiteModeNeedsRestore && A.teacherSiteModeNeedsRestore());
  }

  function restoreSiteModeToken() {
    if (!T || !T.api) return Promise.reject(new Error("请先登录教师账号"));
    if (A && A.ensureTeacherSiteStudentToken) {
      return A.ensureTeacherSiteStudentToken();
    }
    return T.api("/api/teacher/site-mode/enter", { method: "POST" }).then(function (d) {
      applySiteModeLogin(d);
      return d;
    });
  }

  function enterSiteMode() {
    if (!T || !T.api) return Promise.reject(new Error("请先登录教师账号"));
    return restoreSiteModeToken().then(function (d) {
      location.href = d.redirect || "index.html";
    });
  }

  function exitSiteMode() {
    setMode("admin");
    if (A && A.clearSession) A.clearSession();
    location.href = "teacher.html";
  }

  function switchHtml(active) {
    return (
      '<div class="teacher-mode-switch" role="tablist" aria-label="教师端模式">' +
        '<button type="button" class="teacher-mode-switch__btn' +
          (active === "admin" ? " is-active" : "") +
          '" data-mode="admin">教师管理区</button>' +
        '<button type="button" class="teacher-mode-switch__btn' +
          (active === "site" ? " is-active" : "") +
          '" data-mode="site">网站功能区</button>' +
      "</div>"
    );
  }

  function bindSwitch(root) {
    if (!root || root.__modeBound) return;
    root.__modeBound = true;
    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-mode]");
      if (!btn) return;
      var mode = btn.getAttribute("data-mode");
      if (mode === "site") {
        if (isSiteMode()) {
          location.href = "index.html";
          return;
        }
        btn.disabled = true;
        enterSiteMode().catch(function (err) {
          alert((err && err.message) || "无法进入网站功能区");
          btn.disabled = false;
        });
        return;
      }
      if (mode === "admin") {
        if (isSiteMode()) exitSiteMode();
        else if (location.pathname.indexOf("teacher") < 0) location.href = "teacher.html";
      }
    });
  }

  function mountAdminSwitch() {
    var side = document.querySelector(".teacher-side");
    if (!side || side.querySelector(".teacher-mode-switch")) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = switchHtml("admin");
    side.insertBefore(wrap.firstChild, side.firstChild);
    bindSwitch(side);
  }

  function mountSiteBanner() {
    if (!isSiteMode()) return;
    if (document.getElementById("teacher-site-banner")) return;
    var bar = document.createElement("div");
    bar.id = "teacher-site-banner";
    bar.className = "teacher-site-banner";
    bar.innerHTML =
      switchHtml("site") +
      '<span class="teacher-site-banner__hint">体验模式：与学生相同的功能与闯关进度</span>';
    document.body.insertBefore(bar, document.body.firstChild);
    bindSwitch(bar);
    document.body.classList.add("has-teacher-site-banner");
  }

  function boot() {
    if (document.body.classList.contains("teacher-page")) {
      mountAdminSwitch();
      return;
    }
    if (siteModeNeedsRestore()) {
      restoreSiteModeToken()
        .then(function () { mountSiteBanner(); })
        .catch(function () {
          setMode("admin");
        });
      return;
    }
    mountSiteBanner();
  }

  window.YYSD_TEACHER_MODE = {
    getMode: getMode,
    setMode: setMode,
    isSiteMode: isSiteMode,
    siteModeNeedsRestore: siteModeNeedsRestore,
    restoreSiteModeToken: restoreSiteModeToken,
    enterSiteMode: enterSiteMode,
    exitSiteMode: exitSiteMode
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
