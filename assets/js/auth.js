/* =========================================================================
   auth.js — 登录态、导航、API 调用（优益思达国际课程中心）
   ========================================================================= */
window.YYSD_AUTH = (function () {
  "use strict";

  var API_BASE = "https://api.youyisida.com";
  var TOKEN_KEY = "yysd:auth:token";
  // 备案通过后把下面改成真实备案号，例如：皖ICP备XXXXXXXX号-1
  var ICP_TEXT = "";

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
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

  function bindNav() {
    var el = document.getElementById("nav-auth");
    if (!el) return;
    if (getToken()) {
      el.href = "profile.html";
      el.textContent = "个人中心";
    } else {
      el.href = "login.html";
      el.textContent = "登录";
    }
  }

  function bindIcp() {
    if (!ICP_TEXT) return;
    document.querySelectorAll("[data-icp]").forEach(function (el) {
      el.textContent = ICP_TEXT;
      if (el.tagName === "A") el.href = "https://beian.miit.gov.cn/";
    });
  }

  function requireLogin() {
    if (!getToken()) {
      location.href = "login.html?next=" + encodeURIComponent(location.pathname + location.search);
      return false;
    }
    return true;
  }

  function logout() {
    setToken("");
    location.href = "index.html";
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindNav();
    bindIcp();
  });

  return {
    API_BASE: API_BASE,
    ICP_TEXT: ICP_TEXT,
    getToken: getToken,
    setToken: setToken,
    api: api,
    bindNav: bindNav,
    requireLogin: requireLogin,
    logout: logout
  };
})();
