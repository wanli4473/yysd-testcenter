/* slim HQ login + score PUT — same API as the website, own origin storage */
(function (w) {
  "use strict";
  var API = (w.location.hostname === "localhost" || w.location.hostname === "127.0.0.1")
    ? (w.location.protocol + "//" + w.location.hostname + ":3000")
    : "https://api.youyisida.com";
  var TOKEN = "yysd:auth:token";
  var USER = "yysd:auth:user";

  function device() {
    var d = w.yysdDesktop && w.yysdDesktop.device;
    if (!d || !d.hw || !d.file) return null;
    return { hw: String(d.hw), file: String(d.file) };
  }

  function token() {
    try { return localStorage.getItem(TOKEN) || ""; } catch (e) { return ""; }
  }

  function user() {
    try { return JSON.parse(localStorage.getItem(USER) || "null") || {}; } catch (e) { return {}; }
  }

  function headers() {
    var h = { "Content-Type": "application/json", "X-Tenant-Slug": "yysd" };
    var t = token();
    if (t) h.Authorization = "Bearer " + t;
    return h;
  }

  function api(path, opts) {
    opts = opts || {};
    var body = opts.body;
    if (body && typeof body === "object" && device()) body.device = device();
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    }).then(function (r) {
      return r.text().then(function (text) {
        var d = {};
        if (text) {
          try { d = JSON.parse(text); } catch (e) {
            throw new Error("服务器返回异常（" + r.status + "）");
          }
        }
        if (!r.ok) throw new Error((d && d.error) || "请求失败");
        return d;
      });
    });
  }

  function applyLogin(d) {
    var t = (d && d.token) || "";
    if (!t) throw new Error("登录失败");
    localStorage.setItem(TOKEN, t);
    var src = d.user || d.teacher || {};
    localStorage.setItem(USER, JSON.stringify({
      phone: src.phone || "",
      role: d.role || "student",
      displayName: src.displayName || src.name || ""
    }));
  }

  function logout() {
    try {
      localStorage.removeItem(TOKEN);
      localStorage.removeItem(USER);
    } catch (e) {}
  }

  function requireLogin(next) {
    if (token()) return true;
    w.location.replace("login.html?next=" + encodeURIComponent(next || "home.html"));
    return false;
  }

  function pushScore(rec) {
    if (!token() || !rec || !rec.id) return Promise.resolve(false);
    return api("/api/scores/" + encodeURIComponent(rec.id), { method: "PUT", body: rec })
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  w.YYSD_APP = {
    api: api,
    token: token,
    user: user,
    applyLogin: applyLogin,
    logout: logout,
    requireLogin: requireLogin,
    pushScore: pushScore
  };
})(window);
