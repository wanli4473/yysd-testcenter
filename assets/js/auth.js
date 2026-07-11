/* =========================================================================
   auth.js — 登录态、导航、API 调用、成绩云端同步（优益思达国际课程中心）
   ========================================================================= */
window.YYSD_AUTH = (function () {
  "use strict";

  var API_BASE = "https://api.youyisida.com";
  var TOKEN_KEY = "yysd:auth:token";
  var USER_KEY = "yysd:auth:user";
  var TEACHER_TOKEN_KEY = "yysd:teacher:token";
  var TEACHER_USER_KEY = "yysd:teacher:user";
  var RESULTS_KEY = "yysd:results";
  var AUTH_COOKIE = "yysd_auth";
  var ICP_TEXT = "皖ICP备2026021555号-1";
  var ICP_URL = "https://beian.miit.gov.cn/";
  var PUBLIC_PAGES = { "index.html": 1, "login.html": 1, "register.html": 1, "forgot-password.html": 1, "agreement.html": 1, "privacy.html": 1, "teacher-login.html": 1, "teacher-register.html": 1 };

  function pageName() {
    var parts = location.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "index.html";
  }

  function isPublicPage() {
    return !!PUBLIC_PAGES[pageName()];
  }

  function setAuthCookie(on) {
    var secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = AUTH_COOKIE + "=" + (on ? "1" : "") +
      "; path=/; max-age=" + (on ? 2592000 : 0) + "; SameSite=Lax" + secure;
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TEACHER_TOKEN_KEY);
      localStorage.removeItem(TEACHER_USER_KEY);
    } catch (e) {}
    setAuthCookie(false);
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TEACHER_TOKEN_KEY) || "";
    } catch (e) { return ""; }
  }

  function isTeacher() {
    try { return !!localStorage.getItem(TEACHER_TOKEN_KEY); } catch (e) { return false; }
  }

  function setToken(t) {
    if (!t) {
      clearSession();
      bindNav();
      return;
    }
    try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
    setAuthCookie(true);
  }

  function applyLogin(d) {
    var t = (d && d.token) || "";
    if (!t) { clearSession(); bindNav(); return; }
    try {
      localStorage.setItem(TOKEN_KEY, t);
      if (d.role === "teacher" || d.teacher) {
        localStorage.setItem(TEACHER_TOKEN_KEY, t);
        var teacher = d.teacher || {};
        localStorage.setItem(TEACHER_USER_KEY, JSON.stringify({
          phone: teacher.phone || "",
          name: teacher.name || "",
          avatarUrl: teacher.avatarUrl || ""
        }));
        setUser({
          phone: teacher.phone || "",
          role: "teacher",
          displayName: teacher.name || "",
          avatarUrl: teacher.avatarUrl || ""
        });
      } else {
        localStorage.removeItem(TEACHER_TOKEN_KEY);
        localStorage.removeItem(TEACHER_USER_KEY);
        var stu = d.user || {};
        setUser({
          phone: stu.phone || "",
          role: "student",
          displayName: stu.displayName || "",
          avatarUrl: stu.avatarUrl || ""
        });
      }
    } catch (e) {}
    setAuthCookie(true);
    bindNav();
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "{}"); } catch (e) { return {}; }
  }

  function setUser(u) {
    try {
      if (u && u.phone) {
        localStorage.setItem(USER_KEY, JSON.stringify({
          phone: u.phone,
          role: u.role || "",
          displayName: u.displayName || "",
          avatarUrl: u.avatarUrl || ""
        }));
      } else localStorage.removeItem(USER_KEY);
    } catch (e) {}
    bindNav();
  }

  function avatarSrc(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url) || url.indexOf("data:") === 0) return url;
    return API_BASE + url;
  }

  // ponytail: canvas resize to 256px JPEG; skip crop UI
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
        var size = 256;
        var canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext("2d");
        var s = Math.min(img.width, img.height);
        var sx = (img.width - s) / 2;
        var sy = (img.height - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
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
      var next = {
        phone: u.phone || getUser().phone,
        role: u.role || getUser().role || "",
        displayName: u.displayName || u.name || getUser().displayName || "",
        avatarUrl: d.avatarUrl || u.avatarUrl || ""
      };
      setUser(next);
      if (next.role === "teacher") {
        try {
          localStorage.setItem(TEACHER_USER_KEY, JSON.stringify({
            phone: next.phone,
            name: next.displayName || "",
            avatarUrl: next.avatarUrl || ""
          }));
        } catch (e) {}
      }
      return d;
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

  function readLocalResults() {
    try { return JSON.parse(localStorage.getItem(RESULTS_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function writeLocalResults(store) {
    try { localStorage.setItem(RESULTS_KEY, JSON.stringify(store)); } catch (e) {}
  }

  function newerScore(a, b) {
    if (!b) return a;
    if (!a) return b;
    return String(a.date || "") >= String(b.date || "") ? a : b;
  }

  function mergeScoreStores(local, cloud) {
    var out = {}, ids = {};
    Object.keys(local || {}).forEach(function (k) { ids[k] = 1; });
    Object.keys(cloud || {}).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (id) {
      out[id] = newerScore(local[id], cloud[id]);
    });
    return out;
  }

  function syncScoresFromCloud() {
    if (!getToken() || isTeacher()) return Promise.resolve();
    return api("/api/scores").then(function (d) {
      var cloud = d.scores || {};
      var local = readLocalResults();
      var merged = mergeScoreStores(local, cloud);
      writeLocalResults(merged);
      var pushes = [];
      Object.keys(local).forEach(function (id) {
        var l = local[id], c = cloud[id];
        if (l && (!c || String(l.date || "") > String(c.date || ""))) pushes.push(l);
      });
      return Promise.all(pushes.map(function (r) {
        return api("/api/scores/" + encodeURIComponent(r.id), { method: "PUT", body: r }).catch(function () {});
      }));
    }).catch(function () {});
  }

  function pushScoreRecord(record) {
    if (!getToken() || isTeacher() || !record || !record.id) return Promise.resolve();
    return api("/api/scores/" + encodeURIComponent(record.id), { method: "PUT", body: record }).catch(function () {});
  }

  function bindNav() {
    var el = document.getElementById("nav-auth");
    if (!el) return;
    if (getToken()) {
      el.href = isTeacher() ? "teacher.html" : "profile.html";
      var user = getUser();
      var phone = (user.phone || "").trim();
      var label = isTeacher() ? "教师" : ((user.displayName || "").trim() || "我的");
      var src = avatarSrc(user.avatarUrl);
      if (phone.length >= 4 || src) {
        el.classList.add("is-logged-in");
        var avatarHtml = src
          ? '<img class="nav-auth__avatar nav-auth__avatar--img" src="' + src.replace(/"/g, "") + '" alt="">'
          : '<span class="nav-auth__avatar" aria-hidden="true">' + (phone.slice(-4) || "·") + "</span>";
        el.innerHTML = avatarHtml + '<span class="nav-auth__label">' + label + "</span>";
        el.setAttribute("aria-label", label + (phone.length >= 4 ? "，尾号 " + phone.slice(-4) : ""));
      } else {
        el.classList.remove("is-logged-in");
        el.textContent = isTeacher() ? "教师端" : "个人中心";
        el.removeAttribute("aria-label");
      }
    } else {
      el.href = "login.html";
      el.classList.remove("is-logged-in");
      el.textContent = "登录";
      el.removeAttribute("aria-label");
    }
  }

  function bindIcp() {
    if (!ICP_TEXT) return;
    document.querySelectorAll("[data-icp]").forEach(function (el) {
      var link = el.tagName === "A" ? el : document.createElement("a");
      if (link !== el) {
        link.className = el.className;
        el.replaceWith(link);
      }
      link.href = ICP_URL;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = ICP_TEXT;
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
    clearSession();
    location.href = "index.html";
  }

  function guardPage() {
    if (isPublicPage()) return true;
    if (!getToken()) {
      location.replace("login.html?next=" + encodeURIComponent(location.pathname + location.search));
      return false;
    }
    setAuthCookie(true);
    return true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!guardPage()) return;
    bindNav();
    bindIcp();
    if (getToken() && !isPublicPage() && !isTeacher()) syncScoresFromCloud();
  });

  return {
    API_BASE: API_BASE,
    ICP_TEXT: ICP_TEXT,
    getToken: getToken,
    setToken: setToken,
    applyLogin: applyLogin,
    isTeacher: isTeacher,
    getUser: getUser,
    setUser: setUser,
    api: api,
    bindNav: bindNav,
    requireLogin: requireLogin,
    logout: logout,
    syncScoresFromCloud: syncScoresFromCloud,
    pushScoreRecord: pushScoreRecord,
    uploadAvatar: uploadAvatar,
    avatarSrc: avatarSrc
  };
})();

(function () {
  "use strict";
  var PUBLIC = { "index.html": 1, "login.html": 1, "register.html": 1, "forgot-password.html": 1, "agreement.html": 1, "privacy.html": 1, "teacher-login.html": 1, "teacher-register.html": 1 };
  var name = location.pathname.split("/").filter(Boolean).pop() || "index.html";
  if (PUBLIC[name]) return;
  try {
    if (!localStorage.getItem("yysd:auth:token") && !localStorage.getItem("yysd:teacher:token")) {
      location.replace("login.html?next=" + encodeURIComponent(location.pathname + location.search));
    }
  } catch (e) {}
})();
