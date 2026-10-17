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
      displayName: src.displayName || src.name || "",
      avatarUrl: src.avatarUrl || ""
    }));
  }

  function setUser(next) {
    var cur = user();
    var u = {
      phone: next.phone || cur.phone || "",
      role: next.role || cur.role || "student",
      displayName: next.displayName != null ? next.displayName : (cur.displayName || ""),
      avatarUrl: next.avatarUrl != null ? next.avatarUrl : (cur.avatarUrl || "")
    };
    try { localStorage.setItem(USER, JSON.stringify(u)); } catch (e) {}
    return u;
  }

  function avatarSrc(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url) || url.indexOf("data:") === 0) return url;
    return API + url;
  }

  function compressAvatar(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.type)) {
        return reject(new Error("请选择 JPG / PNG / WebP 图片"));
      }
      if (file.size > 5 * 1024 * 1024) return reject(new Error("图片不能超过 5MB"));
      var img = new Image();
      var objectUrl = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(objectUrl);
        var canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        var ctx = canvas.getContext("2d");
        var s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("图片读取失败"));
      };
      img.src = objectUrl;
    });
  }

  function uploadAvatar(file) {
    return compressAvatar(file).then(function (dataUrl) {
      return api("/api/auth/avatar", { method: "POST", body: { image: dataUrl } });
    }).then(function (d) {
      var u = d.user || {};
      setUser({
        displayName: u.displayName || u.name || user().displayName || "",
        avatarUrl: d.avatarUrl || u.avatarUrl || ""
      });
      return d;
    });
  }

  function logout() {
    try {
      localStorage.removeItem(TOKEN);
      localStorage.removeItem(USER);
    } catch (e) {}
  }

  function requireLogin(next) {
    if (token()) return true;
    try {
      if (new URLSearchParams(w.location.search).get("preview") === "1") return true;
    } catch (e) {}
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
    setUser: setUser,
    avatarSrc: avatarSrc,
    uploadAvatar: uploadAvatar,
    bindReload: function (el) {
      if (!el) return;
      el.onclick = function () {
        if (w.yysdDesktop && typeof w.yysdDesktop.reload === "function") {
          w.yysdDesktop.reload();
          return;
        }
        var u = new URL(location.href);
        u.searchParams.set("_r", String(Date.now()));
        location.replace(u.pathname + u.search + u.hash);
      };
    },
    applyLogin: applyLogin,
    logout: logout,
    requireLogin: requireLogin,
    pushScore: pushScore
  };
  // ponytail: exam pages on this host load this auth.js; they call YYSD_AUTH
  w.YYSD_AUTH = w.YYSD_AUTH || {
    requireLogin: function () {
      return requireLogin((location.pathname.split("/").pop() || "home.html") + location.search);
    }
  };
})(window);
