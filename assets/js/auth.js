/* =========================================================================
   auth.js — 登录态、导航、API 调用、成绩云端同步（优益思达国际课程中心）
   ========================================================================= */
window.YYSD_AUTH = (function () {
  "use strict";

  var API_BASE = (typeof location !== "undefined" &&
    (location.hostname === "localhost" || location.hostname === "127.0.0.1"))
    ? (location.protocol + "//" + location.hostname + ":3000")
    : "https://api.youyisida.com";
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
          avatarUrl: teacher.avatarUrl || "",
          isAdmin: !!teacher.isAdmin
        }));
        setUser({
          phone: teacher.phone || "",
          role: "teacher",
          displayName: teacher.name || "",
          avatarUrl: teacher.avatarUrl || "",
          isAdmin: !!teacher.isAdmin
        });
      } else {
        localStorage.removeItem(TEACHER_TOKEN_KEY);
        localStorage.removeItem(TEACHER_USER_KEY);
        var stu = d.user || {};
        setUser({
          phone: stu.phone || "",
          role: "student",
          displayName: stu.displayName || "",
          avatarUrl: stu.avatarUrl || "",
          isAdmin: !!stu.isAdmin
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
          avatarUrl: u.avatarUrl || "",
          isAdmin: !!u.isAdmin
        }));
      } else localStorage.removeItem(USER_KEY);
    } catch (e) {}
    bindNav();
  }

  function isAdmin() {
    try {
      if (getUser().isAdmin) return true;
      var t = JSON.parse(localStorage.getItem(TEACHER_USER_KEY) || "{}");
      return !!t.isAdmin;
    } catch (e) { return false; }
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
        avatarUrl: d.avatarUrl || u.avatarUrl || "",
        isAdmin: u.isAdmin != null ? !!u.isAdmin : !!getUser().isAdmin
      };
      setUser(next);
      if (next.role === "teacher") {
        try {
          localStorage.setItem(TEACHER_USER_KEY, JSON.stringify({
            phone: next.phone,
            name: next.displayName || "",
            avatarUrl: next.avatarUrl || "",
            isAdmin: !!next.isAdmin
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
      return r.text().then(function (text) {
        var d = null;
        try { d = text ? JSON.parse(text) : {}; } catch (e) {
          throw new Error(r.status === 502 || r.status === 504
            ? "服务器暂时不可用，请稍后重试"
            : "服务器返回异常（" + r.status + "），请确认已部署最新版本");
        }
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

  function ensureLogoutBtn(nav) {
    if (!nav || document.getElementById("logout-btn") || document.getElementById("nav-logout")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--ghost btn--sm nav-persist";
    btn.id = "nav-logout";
    btn.textContent = "退出";
    btn.addEventListener("click", function () { logout(); });
    nav.appendChild(btn);
  }

  function applyCompactShell() {
    if (!getToken()) return;
    var name = pageName();
    if (PUBLIC_PAGES[name] || name === "exam.html") return;
    // Teacher pages own their nav (sidebar / explicit shell-compact-nav).
    if (name.indexOf("teacher") === 0 || name === "admin-assign.html") return;
    if (document.body.classList.contains("viewer")) return;
    document.body.classList.add("shell-compact-nav");
    var nav = document.querySelector(".minimal-nav");
    if (nav) ensureLogoutBtn(nav);
  }

  function bindNav() {
    var el = document.getElementById("nav-auth");
    if (!el) {
      applyCompactShell();
      return;
    }
    if (getToken()) {
      el.href = "profile.html";
      el.classList.add("nav-persist");
      var user = getUser();
      var phone = (user.phone || "").trim();
      var label = (user.displayName || "").trim() || "个人中心";
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
        el.textContent = "个人中心";
        el.removeAttribute("aria-label");
      }
      applyCompactShell();
    } else {
      el.href = "login.html";
      el.classList.remove("is-logged-in");
      el.classList.remove("nav-persist");
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

  function studentHome() {
    return "dashboard.html";
  }

  function postLoginPath(next) {
    var n = String(next || "").trim() || studentHome();
    if (isTeacher()) return "teacher.html";
    if (!n || n === "/" || n === "index.html" || n.indexOf("login") >= 0 || n.indexOf("register") >= 0) {
      return studentHome();
    }
    return n;
  }

  function redirectLoggedInAwayFromMarketing() {
    if (!getToken()) return false;
    if (pageName() !== "index.html") return false;
    location.replace(isTeacher() ? "teacher.html" : studentHome());
    return true;
  }

  function mountStudentShell() {
    if (!getToken() || isTeacher()) return;
    if (document.body.classList.contains("viewer")) return;
    var name = pageName();
    if (PUBLIC_PAGES[name]) return;
    if (name === "exam.html" || name === "admin-assign.html" || name.indexOf("teacher") === 0) return;
    if (document.querySelector(".student-shell")) return;
    var header = document.querySelector(".minimal-topbar");
    if (!header) return;

    document.body.classList.add("student-layout", "shell-compact-nav");

    var brand = header.querySelector(".minimal-brand");
    if (brand) brand.setAttribute("href", "dashboard.html");
    var nav = header.querySelector(".minimal-nav");
    if (nav) ensureLogoutBtn(nav);

    var shell = document.createElement("div");
    shell.className = "student-shell";

    var side = document.createElement("aside");
    side.className = "student-side";
    side.setAttribute("aria-label", "课程导航");

    var links = [
      { href: "dashboard.html", label: "工作台", key: "dashboard" },
      { href: "zone.html?zone=study", label: "学习区", key: "study" },
      { href: "zone.html?zone=practice", label: "练习区", key: "practice" },
      { href: "zone.html?zone=mock", label: "模考区", key: "mock" },
      { href: "calendar.html", label: "任务日历", key: "calendar" },
      { href: "results.html", label: "我的成绩", key: "results" },
      { href: "profile.html", label: "个人中心", key: "profile" }
    ];
    if (isAdmin()) {
      links.push({ href: "admin-assign.html", label: "学生分配", key: "admin" });
    }

    var path = location.pathname + location.search;
    var label = document.createElement("p");
    label.className = "student-side__label";
    label.textContent = "优益思达备考";
    side.appendChild(label);

    links.forEach(function (L) {
      var a = document.createElement("a");
      a.className = "student-side__link";
      a.href = L.href;
      a.textContent = L.label;
      var active = false;
      if (L.key === "dashboard" && name === "dashboard.html") active = true;
      else if (L.key === "study" && /zone=study/.test(path)) active = true;
      else if (L.key === "practice" && /zone=practice/.test(path)) active = true;
      else if (L.key === "mock" && (/zone=mock/.test(path) || name === "cambridge.html" || name.indexOf("alevel") === 0)) active = true;
      else if (L.key === "calendar" && name === "calendar.html") active = true;
      else if (L.key === "results" && (name === "results.html" || name === "wrong-words.html")) active = true;
      else if (L.key === "profile" && name === "profile.html") active = true;
      else if (L.key === "admin" && name === "admin-assign.html") active = true;
      else if (L.key === "study" && (name === "vocab.html" || name.indexOf("vocab") >= 0)) active = true;
      else if (L.key === "practice" && name.indexOf("speaking") === 0) active = true;
      if (active) a.classList.add("is-active");
      side.appendChild(a);
    });

    var content = document.createElement("div");
    content.className = "student-content";

    var node = header.nextSibling;
    var footer = document.querySelector(".minimal-footer, footer.site-footer");
    while (node && node !== footer) {
      var next = node.nextSibling;
      if (node.nodeType === 1 || (node.nodeType === 3 && String(node.textContent).trim())) {
        content.appendChild(node);
      }
      node = next;
    }

    shell.appendChild(side);
    shell.appendChild(content);
    if (footer) header.parentNode.insertBefore(shell, footer);
    else header.parentNode.appendChild(shell);
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
    if (redirectLoggedInAwayFromMarketing()) return;
    if (!guardPage()) return;
    bindNav();
    bindIcp();
    mountStudentShell();
    if (getToken() && !isPublicPage() && !isTeacher()) syncScoresFromCloud();
  });

  return {
    API_BASE: API_BASE,
    ICP_TEXT: ICP_TEXT,
    getToken: getToken,
    setToken: setToken,
    applyLogin: applyLogin,
    isTeacher: isTeacher,
    isAdmin: isAdmin,
    getUser: getUser,
    setUser: setUser,
    api: api,
    bindNav: bindNav,
    requireLogin: requireLogin,
    logout: logout,
    studentHome: studentHome,
    postLoginPath: postLoginPath,
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
