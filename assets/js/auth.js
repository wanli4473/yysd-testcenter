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
  var WRONG_WORDS_KEY = "yysd:wrong-words";
  // ponytail: shared-PC students were cross-uploading each other's yysd:results on login sync
  var LOCAL_OWNER_KEY = "yysd:local-owner";
  var AUTH_COOKIE = "yysd_auth";
  var ICP_TEXT = "皖ICP备2026021555号-1";
  var ICP_URL = "https://beian.miit.gov.cn/";
  var MPS_TEXT = "皖公网安备34010402705009号";
  var MPS_URL = "https://beian.mps.gov.cn/#/query/webSearch?code=34010402705009";
  var MPS_ICON = "assets/img/gongan.png";
  var PUBLIC_PAGES = {
    "index.html": 1, "login.html": 1, "register.html": 1, "forgot-password.html": 1,
    "agreement.html": 1, "privacy.html": 1, "report.html": 1, "teacher-login.html": 1, "teacher-register.html": 1,
    "suspended.html": 1, "platform.html": 1, "ielts-upgrade.html": 1
  };
  var ORG_KEY = "yysd:org";

  function tenantSlug() {
    try {
      var q = new URLSearchParams(location.search).get("tenant");
      if (q && /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(q)) return q.toLowerCase();
    } catch (e) {}
    var h = (location.hostname || "").toLowerCase();
    if (!h || h === "localhost" || h === "127.0.0.1") return "yysd";
    if (h === "youyisida.com" || h === "www.youyisida.com") return "yysd";
    var m = h.match(/^([a-z0-9-]+)\.youyisida\.com$/);
    if (!m) return "yysd";
    var s = m[1];
    if (/^(www|api|admin|platform|mail|static|cdn|test|dev|staging)$/.test(s)) return "yysd";
    return s;
  }

  function getOrg() {
    try { return JSON.parse(localStorage.getItem(ORG_KEY) || "null"); } catch (e) { return null; }
  }

  function setOrg(org) {
    try {
      if (org) localStorage.setItem(ORG_KEY, JSON.stringify(org));
      else localStorage.removeItem(ORG_KEY);
    } catch (e) {}
  }

  function isHqSite() {
    return tenantSlug() === "yysd";
  }

  /** 词境远征：暂时全站下线（入口与深链一并关掉） */
  function canWordRealm() {
    // ponytail: was HQ-only; flip back to isHqSite() when reopening
    return false;
  }

  /** AI升学顾问：暂时仅优益思达总部站开放，其他租户子域隐藏且不可进 */
  function canAiAdmit() {
    return isHqSite();
  }

  /** 雅思区域：已对全体师生开放（仍需登录） */
  function canIeltsArea() {
    return true;
  }

  function guardIeltsArea() {
    return true;
  }

  function logoSrc(url) {
    if (!url) return "assets/img/logo.svg?v=20260702-logo";
    if (/^https?:\/\//i.test(url) || url.indexOf("data:") === 0) return url;
    return API_BASE + url;
  }

  function brandName(org) {
    return (org && org.name) || "优益思达国际课程中心";
  }

  /** 客户站白标：去掉可见的优益思达/YYSD（备案号除外） */
  function scrubTenantBrandText(orgName) {
    if (isHqSite()) return;
    var replacers = [
      [/优益思达国际课程中心/g, orgName],
      [/优益思达备考/g, orgName],
      [/优益思达学习中心/g, orgName],
      [/优益思达/g, orgName],
      [/YYSD International Course Center/gi, orgName],
      [/YYSD\s*·\s*IELTS/gi, orgName],
      [/YYSD\s*·\s*TEACHER/gi, orgName + " · 教师端"],
      [/\bYYSD\b/g, orgName]
    ];
    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walk.nextNode())) {
      var p = node.parentElement;
      if (!p) continue;
      var tag = p.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") continue;
      if (p.getAttribute && (p.getAttribute("data-icp") != null || p.getAttribute("data-report") != null || p.getAttribute("data-mps") != null)) continue;
      if (p.closest && (p.closest("[data-icp]") || p.closest("[data-report]") || p.closest("[data-mps]"))) continue;
      var t = node.nodeValue;
      if (!t || (t.indexOf("优益思达") < 0 && t.indexOf("YYSD") < 0 && t.indexOf("Yysd") < 0)) continue;
      var next = t;
      replacers.forEach(function (pair) {
        next = next.replace(pair[0], pair[1]);
      });
      if (next !== t) node.nodeValue = next;
    }
    document.querySelectorAll(".auth-aside__eyebrow").forEach(function (el) {
      el.textContent = orgName;
    });
    document.querySelectorAll(".minimal-brand__text span").forEach(function (el) {
      el.textContent = "";
      el.hidden = true;
    });
    document.querySelectorAll(".minimal-footer__copy").forEach(function (el) {
      var year = el.querySelector("#year");
      var yearText = year ? year.textContent : String(new Date().getFullYear());
      var icp = el.querySelector("[data-icp]");
      var report = el.querySelector("[data-report]");
      var mps = el.querySelector("[data-mps]");
      el.innerHTML = "© <span id=\"year\">" + yearText + "</span> ";
      if (report) el.appendChild(report);
      if (icp) el.appendChild(icp);
      else {
        var span = document.createElement("span");
        span.className = "site-icp";
        span.setAttribute("data-icp", "");
        el.appendChild(span);
      }
      if (mps) el.appendChild(mps);
    });
  }

  function applyOrgBrand(org) {
    if (!org) return;
    setOrg(org);
    var name = brandName(org);
    var tenant = !isHqSite();

    document.querySelectorAll(".minimal-brand").forEach(function (a) {
      a.setAttribute("aria-label", name + "首页");
    });
    document.querySelectorAll(".minimal-brand__text b, .minimal-brand b, .minimal-footer__brand b").forEach(function (el) {
      el.textContent = name;
    });
    document.querySelectorAll(".minimal-footer__brand span").forEach(function (el) {
      if (tenant) {
        el.textContent = "";
        el.hidden = true;
      }
    });
    document.querySelectorAll(".minimal-brand__logo, .minimal-footer__logo, .auth-aside__logo img, .viewer-bar__logo").forEach(function (img) {
      if (tenant && org.logoUrl) {
        img.src = logoSrc(org.logoUrl);
      } else if (org.logoUrl) {
        img.src = logoSrc(org.logoUrl);
      }
      img.alt = name;
    });
    if (tenant && org.logoUrl) {
      var href = logoSrc(org.logoUrl);
      var icon = document.querySelector('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement("link");
        icon.rel = "icon";
        document.head.appendChild(icon);
      }
      icon.href = href;
      icon.type = "image/png";
    }
    var sideLabel = document.querySelector(".student-side__label");
    if (sideLabel) sideLabel.textContent = name;

    if (document.title) {
      if (document.title.indexOf("·") >= 0) {
        document.title = document.title.replace(/^[^·]+·/, name + " ·");
      } else if (tenant) {
        document.title = name;
      }
    }

    if (tenant) scrubTenantBrandText(name);
  }

  function bootstrapTenant() {
    if (!isHqSite()) {
      var cached = getOrg();
      if (cached && cached.slug === tenantSlug()) applyOrgBrand(cached);
    }
    return fetch(API_BASE + "/api/tenant/bootstrap", {
      headers: { "X-Tenant-Slug": tenantSlug() }
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || "机构加载失败");
        return d.org;
      });
    }).then(function (org) {
      applyOrgBrand(org);
      if (!org.usable && pageName() !== "suspended.html" && pageName() !== "platform.html") {
        location.replace("suspended.html");
        return null;
      }
      return org;
    }).catch(function () {
      var fallback = getOrg();
      if (fallback) applyOrgBrand(fallback);
      return fallback;
    }).finally(function () {
      if (!isHqSite()) {
        document.documentElement.classList.remove("tenant-brand-pending");
        document.documentElement.classList.add("tenant-brand-ready");
      }
    });
  }

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

  function hasAnySession() {
    try {
      return !!(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TEACHER_TOKEN_KEY));
    } catch (e) { return false; }
  }

  function clearLocalLearningStores() {
    try {
      localStorage.removeItem(RESULTS_KEY);
      localStorage.removeItem(WRONG_WORDS_KEY);
      localStorage.removeItem(LOCAL_OWNER_KEY);
    } catch (e) {}
  }

  /** Drop prior student's local scores/错词 before another account syncs them up. */
  function adoptLocalStores(phone) {
    phone = String(phone || "").trim();
    if (!phone) return;
    var prev = "";
    try { prev = localStorage.getItem(LOCAL_OWNER_KEY) || ""; } catch (e) {}
    // legacy unscoped store has no owner — treat as foreign on shared PCs
    if (!prev || prev !== phone) clearLocalLearningStores();
    try { localStorage.setItem(LOCAL_OWNER_KEY, phone); } catch (e) {}
  }

  function clearSession() {
    // ponytail: student logout keeps teacher session in the same browser
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {}
    clearLocalLearningStores();
    setAuthCookie(hasAnySession());
  }

  function getToken() {
    try {
      var student = localStorage.getItem(TOKEN_KEY);
      if (student) return student;
      // ponytail: site-mode student APIs must not fall back to teacher JWT
      if (localStorage.getItem("yysd:teacher:mode") === "site") return "";
      return localStorage.getItem(TEACHER_TOKEN_KEY) || "";
    } catch (e) { return ""; }
  }

  function isTeacherPage() {
    var n = pageName();
    return n === "teacher.html" || n === "teacher-calendar.html" ||
      n === "admin-assign.html" || n === "teacher-login.html" ||
      n === "teacher-register.html" || n === "platform.html" ||
      n === "teacher-diagnostic.html" || n === "teacher-student-diagnostic.html" ||
      n === "teacher-vocab-challenge.html" || n === "teacher-mode-picker.html";
  }

  function isTeacherSiteMode() {
    try {
      return localStorage.getItem("yysd:teacher:mode") === "site" &&
        !!localStorage.getItem(TOKEN_KEY) &&
        !!localStorage.getItem(TEACHER_TOKEN_KEY);
    } catch (e) {
      return false;
    }
  }

  function isTeacher() {
    try {
      if (isTeacherSiteMode()) return false;
      // student session wins on student-facing pages (avoids dashboard bounce)
      if (localStorage.getItem(TOKEN_KEY)) return false;
      return !!localStorage.getItem(TEACHER_TOKEN_KEY);
    } catch (e) { return false; }
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
      if (d.role === "teacher" || d.teacher) {
        // teacher session only — do not overwrite student token/profile
        localStorage.setItem(TEACHER_TOKEN_KEY, t);
        var teacher = d.teacher || {};
        localStorage.setItem(TEACHER_USER_KEY, JSON.stringify({
          phone: teacher.phone || "",
          name: teacher.name || "",
          avatarUrl: teacher.avatarUrl || "",
          isAdmin: !!teacher.isAdmin,
          isPlatformAdmin: !!teacher.isPlatformAdmin
        }));
      } else {
        // student session only — keep teacher keys so both can coexist
        localStorage.setItem(TOKEN_KEY, t);
        var stu = d.user || {};
        adoptLocalStores(stu.phone || "");
        setUser({
          phone: stu.phone || "",
          role: "student",
          displayName: stu.displayName || "",
          avatarUrl: stu.avatarUrl || "",
          isAdmin: !!stu.isAdmin,
          isPlatformAdmin: !!stu.isPlatformAdmin
        });
      }
      if (d.org) applyOrgBrand(d.org);
    } catch (e) {}
    setAuthCookie(true);
    bindNav();
  }

  function getUser() {
    try {
      var student = JSON.parse(localStorage.getItem(USER_KEY) || "{}");
      var teacher = JSON.parse(localStorage.getItem(TEACHER_USER_KEY) || "{}");
      var hasTeacherTok = !!localStorage.getItem(TEACHER_TOKEN_KEY);
      // teacher portal always shows teacher; elsewhere student profile wins if present
      if (hasTeacherTok && teacher.phone && (isTeacherPage() || !student.phone)) {
        return {
          phone: teacher.phone,
          role: "teacher",
          displayName: teacher.name || "",
          avatarUrl: teacher.avatarUrl || "",
          isAdmin: !!teacher.isAdmin,
          isPlatformAdmin: !!teacher.isPlatformAdmin
        };
      }
      return student;
    } catch (e) { return {}; }
  }

  function setUser(u) {
    try {
      if (u && u.phone) {
        localStorage.setItem(USER_KEY, JSON.stringify({
          phone: u.phone,
          role: u.role || "",
          displayName: u.displayName || "",
          avatarUrl: u.avatarUrl || "",
          isAdmin: !!u.isAdmin,
          isPlatformAdmin: !!u.isPlatformAdmin
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

  function isPlatformAdmin() {
    try {
      if (getUser().isPlatformAdmin) return true;
      var t = JSON.parse(localStorage.getItem(TEACHER_USER_KEY) || "{}");
      return !!t.isPlatformAdmin;
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

  function teacherSiteModeNeedsRestore() {
    try {
      if (!localStorage.getItem(TEACHER_TOKEN_KEY)) return false;
      if (isTeacherPage()) return false;
      if (localStorage.getItem("yysd:teacher:mode") !== "site") return false;
      var stu = localStorage.getItem(TOKEN_KEY);
      var tea = localStorage.getItem(TEACHER_TOKEN_KEY);
      if (stu && stu !== tea) return false;
      return !stu || stu === tea;
    } catch (e) {
      return false;
    }
  }

  var siteRestoreP = null;

  /** Re-issue shadow-student JWT when teacher re-login polluted yysd:auth:token. */
  function ensureTeacherSiteStudentToken() {
    if (!teacherSiteModeNeedsRestore()) return Promise.resolve();
    if (siteRestoreP) return siteRestoreP;
    var tea = localStorage.getItem(TEACHER_TOKEN_KEY);
    siteRestoreP = fetch(API_BASE + "/api/teacher/site-mode/enter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Slug": tenantSlug(),
        Authorization: "Bearer " + tea
      }
    }).then(function (r) {
      return r.text().then(function (text) {
        var d = null;
        try { d = text ? JSON.parse(text) : null; } catch (e) { d = null; }
        if (!r.ok) throw new Error((d && d.error) || "无法恢复体验模式");
        applyLogin({ token: d.token, user: d.user, role: "student" });
        return d;
      });
    }).catch(function () {
      try { localStorage.setItem("yysd:teacher:mode", "admin"); } catch (e) {}
      return null;
    }).finally(function () {
      siteRestoreP = null;
    });
    return siteRestoreP;
  }

  function authHeaders() {
    var h = { "Content-Type": "application/json", "X-Tenant-Slug": tenantSlug() };
    var t = getToken();
    if (t) h.Authorization = "Bearer " + t;
    return h;
  }

  function api(path, opts) {
    opts = opts || {};
    return ensureTeacherSiteStudentToken().then(function () {
      return fetch(API_BASE + path, {
        method: opts.method || "GET",
        headers: authHeaders(),
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        cache: "no-store"
      }).then(function (r) {
        return r.text().then(function (text) {
          var d = null;
          // ponytail: 304/empty used to parse as {} and wipe yysd:results on sync
          if (!text) {
            throw new Error(r.status === 304
              ? "成绩同步失败，请强刷后重试"
              : "服务器返回空响应（" + r.status + "）");
          }
          try { d = JSON.parse(text); } catch (e) {
            throw new Error(r.status === 502 || r.status === 504
              ? "服务器暂时不可用，请稍后重试"
              : "服务器返回异常（" + r.status + "），请确认已部署最新版本");
          }
          if (!r.ok) throw new Error((d && d.error) || "请求失败");
          return d;
        });
      });
    });
  }

  // HTML responses (uploaded assignments) — do not JSON.parse
  function apiHtml(path) {
    var h = { "X-Tenant-Slug": tenantSlug() };
    var t = getToken();
    if (t) h.Authorization = "Bearer " + t;
    return fetch(API_BASE + path, { method: "GET", headers: h }).then(function (r) {
      return r.text().then(function (text) {
        if (!r.ok) {
          try {
            var d = JSON.parse(text);
            throw new Error((d && d.error) || "请求失败");
          } catch (e) {
            if (e.message && e.message !== "请求失败" && e.name !== "SyntaxError") throw e;
            throw new Error("加载练习失败（" + r.status + "）");
          }
        }
        return text;
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
    var aNewer = String(a.date || "") >= String(b.date || "");
    var pick = Object.assign({}, aNewer ? a : b);
    var other = aNewer ? b : a;
    // cloud latest score historically omitted wrong — keep local/attempt wrong if pick lacks it
    if ((!pick.wrong || !pick.wrong.length) && other && other.wrong && other.wrong.length) {
      pick.wrong = other.wrong;
    }
    if (!pick.cdt && other && other.cdt) pick.cdt = true;
    if (!pick.assignmentEventId && other && other.assignmentEventId) {
      pick.assignmentEventId = other.assignmentEventId;
    }
    return pick;
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
    var phone = (getUser().phone || "").trim();
    if (phone) adoptLocalStores(phone);
    var local = readLocalResults();
    return api("/api/scores").then(function (d) {
      var cloud = d.scores || {};
      // ponytail: merge not overwrite — pull-only wiped local recovery after Aug12 DB restore
      writeLocalResults(mergeScoreStores(local, cloud));
      // ponytail: push local-newer only (owner-guarded); full login push polluted shared PCs
      var pushes = [];
      Object.keys(local).forEach(function (id) {
        var L = local[id];
        var C = cloud[id];
        if (!L || !L.date) return;
        if (C && String(C.date || "") >= String(L.date || "")) return;
        var attemptAt = L.attemptAt || L.date;
        if (!attemptAt || !isFinite(Date.parse(attemptAt))) return;
        pushes.push(pushScoreRecord(Object.assign({}, L, { id: id, attemptAt: attemptAt })));
      });
      return Promise.all(pushes);
    }).catch(function () {});
  }

  function pushScoreRecord(record) {
    if (!getToken() || isTeacher() || !record || !record.id) return Promise.resolve(false);
    return api("/api/scores/" + encodeURIComponent(record.id), { method: "PUT", body: record })
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  function fetchScoreAttempts(opts) {
    opts = opts || {};
    if (!getToken() || isTeacher()) return Promise.resolve({ ok: true, attempts: [] });
    var q = [];
    if (opts.assignmentOnly) q.push("assignmentOnly=1");
    if (opts.subject) q.push("subject=" + encodeURIComponent(opts.subject));
    if (opts.itemId) q.push("itemId=" + encodeURIComponent(opts.itemId));
    if (opts.eventId) q.push("eventId=" + encodeURIComponent(opts.eventId));
    if (opts.limit) q.push("limit=" + encodeURIComponent(String(opts.limit)));
    return api("/api/student/score-attempts" + (q.length ? "?" + q.join("&") : ""));
  }

  function fetchScoreAttempt(attemptId) {
    if (!getToken() || isTeacher()) return Promise.reject(new Error("请先登录学生账号"));
    return api("/api/student/score-attempts/" + encodeURIComponent(String(attemptId)));
  }

  function analyzeWrongItem(body) {
    if (!getToken() || isTeacher()) return Promise.reject(new Error("请先登录学生账号"));
    return api("/api/exam/wrong-analyze", { method: "POST", body: body || {} });
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
    if (document.querySelector(".reme-topbar")) return;
    if (!getToken()) return;
    var name = pageName();
    if (PUBLIC_PAGES[name] || name === "exam.html") return;
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
      el.href = (isTeacherPage() && !isTeacherSiteMode()) ? "teacher.html" : "profile.html";
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
        link.className = el.className || "site-icp";
        el.replaceWith(link);
      }
      link.href = ICP_URL;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("data-icp", "");
      link.textContent = ICP_TEXT;
    });
    bindMps();
  }

  // ponytail: 公安备案号跟 ICP 一样注入页脚，不改每一页 HTML
  function bindMps() {
    if (!MPS_TEXT) return;
    document.querySelectorAll(".minimal-footer__copy").forEach(function (el) {
      if (el.querySelector("[data-mps]")) return;
      var a = document.createElement("a");
      a.href = MPS_URL;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.className = "site-mps";
      a.setAttribute("data-mps", "");
      var img = document.createElement("img");
      img.src = MPS_ICON;
      img.alt = "";
      img.width = 14;
      img.height = 14;
      a.appendChild(img);
      a.appendChild(document.createTextNode(MPS_TEXT));
      el.appendChild(a);
    });
  }

  // ponytail: footer 公示投诉渠道，满足公安备案安全评估勾选
  function bindReport() {
    document.querySelectorAll(".minimal-footer__copy").forEach(function (el) {
      if (el.querySelector("[data-report], a[href$='report.html']")) return;
      var a = document.createElement("a");
      a.href = "report.html";
      a.className = "site-report";
      a.setAttribute("data-report", "");
      a.textContent = "投诉举报";
      var icp = el.querySelector("[data-icp]");
      if (icp) el.insertBefore(a, icp);
      else el.appendChild(a);
    });
  }

  function requireLogin() {
    if (!getToken()) {
      (window.YYSD_GO || function (h) { location.href = h; })("login.html?next=" + encodeURIComponent(location.pathname + location.search), "scene");
      return false;
    }
    return true;
  }

  function logout() {
    clearSession();
    (window.YYSD_GO || function (h) { location.href = h; })("index.html", "scene");
  }

  function studentHome() {
    return "index.html";
  }

  function postLoginPath(next) {
    var n = String(next || "").trim() || studentHome();
    // 主控台仅总部站可进；客户站即使带 next=platform 也回首页
    if (n.indexOf("platform") >= 0) {
      return isHqSite() ? "platform.html" : studentHome();
    }
    if (isTeacher()) return "teacher.html";
    if (!n || n === "/" || n.indexOf("login") >= 0 || n.indexOf("register") >= 0) {
      return studentHome();
    }
    return n;
  }

  function redirectLoggedInAwayFromMarketing() {
    if (!getToken()) return false;
    if (pageName() !== "index.html") return false;
    // 学生登录后留在主页自行点板块；仅教师跳工作台
    if (isTeacher()) {
      location.replace("teacher.html");
      return true;
    }
    return false;
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
    if (brand) brand.setAttribute("href", "index.html");
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
    if (isPlatformAdmin() && isHqSite()) {
      links.push({ href: "platform.html", label: "平台主控台", key: "platform" });
    }

    var path = location.pathname + location.search;
    var label = document.createElement("p");
    label.className = "student-side__label";
    label.textContent = (getOrg() && getOrg().name) || (isHqSite() ? "优益思达备考" : "学习中心");
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
      else if (L.key === "platform" && name === "platform.html") active = true;
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

  function refreshSessionFlags() {
    if (!getToken()) return Promise.resolve();
    return api("/api/auth/me").then(function (d) {
      var u = d.user || {};
      setUser({
        phone: u.phone || getUser().phone,
        role: u.role || getUser().role || "",
        displayName: u.displayName || u.name || getUser().displayName || "",
        avatarUrl: u.avatarUrl || getUser().avatarUrl || "",
        isAdmin: !!u.isAdmin,
        isPlatformAdmin: !!u.isPlatformAdmin
      });
      if (u.role === "teacher" || isTeacher()) {
        try {
          localStorage.setItem(TEACHER_USER_KEY, JSON.stringify({
            phone: u.phone || "",
            name: u.displayName || u.name || "",
            avatarUrl: u.avatarUrl || "",
            isAdmin: !!u.isAdmin,
            isPlatformAdmin: !!u.isPlatformAdmin
          }));
        } catch (e) {}
      }
      return u;
    }).catch(function () { return null; });
  }

  function loadTeacherModeScript() {
    try {
      if (!localStorage.getItem(TEACHER_TOKEN_KEY)) return;
      if (document.querySelector("script[data-teacher-mode]")) return;
      var s = document.createElement("script");
      s.src = "assets/js/teacher-mode.js?v=20260821gate1";
      s.setAttribute("data-teacher-mode", "1");
      document.body.appendChild(s);
    } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    bootstrapTenant().then(function () {
      loadTeacherModeScript();
      if (redirectLoggedInAwayFromMarketing()) return;
      if (!guardPage()) return;
      return refreshSessionFlags().then(function () {
        if (!guardIeltsArea()) return;
        bindNav();
        bindIcp();
        bindReport();
        if (getToken() && !isPublicPage() && !isTeacher()) syncScoresFromCloud();
      });
    });
  });

  /* Sync brand from cache before paint (auth.js is at body end; body was hidden by tenant-boot.js) */
  if (!isHqSite()) {
    var bootOrg = getOrg();
    if (bootOrg && bootOrg.slug === tenantSlug()) {
      applyOrgBrand(bootOrg);
      document.documentElement.classList.remove("tenant-brand-pending");
      document.documentElement.classList.add("tenant-brand-ready");
    }
  }

  return {
    API_BASE: API_BASE,
    ICP_TEXT: ICP_TEXT,
    getToken: getToken,
    setToken: setToken,
    applyLogin: applyLogin,
    isTeacher: isTeacher,
    isTeacherSiteMode: isTeacherSiteMode,
    teacherSiteModeNeedsRestore: teacherSiteModeNeedsRestore,
    ensureTeacherSiteStudentToken: ensureTeacherSiteStudentToken,
    isAdmin: isAdmin,
    isPlatformAdmin: isPlatformAdmin,
    getUser: getUser,
    setUser: setUser,
    getOrg: getOrg,
    tenantSlug: tenantSlug,
    isHqSite: isHqSite,
    canWordRealm: canWordRealm,
    canAiAdmit: canAiAdmit,
    canIeltsArea: canIeltsArea,
    applyOrgBrand: applyOrgBrand,
    brandName: brandName,
    api: api,
    apiHtml: apiHtml,
    bindNav: bindNav,
    requireLogin: requireLogin,
    logout: logout,
    studentHome: studentHome,
    postLoginPath: postLoginPath,
    syncScoresFromCloud: syncScoresFromCloud,
    pushScoreRecord: pushScoreRecord,
    fetchScoreAttempts: fetchScoreAttempts,
    fetchScoreAttempt: fetchScoreAttempt,
    analyzeWrongItem: analyzeWrongItem,
    uploadAvatar: uploadAvatar,
    avatarSrc: avatarSrc,
    logoSrc: logoSrc
  };
})();

(function () {
  "use strict";
  var PUBLIC = {
    "index.html": 1, "login.html": 1, "register.html": 1, "forgot-password.html": 1,
    "agreement.html": 1, "privacy.html": 1, "report.html": 1, "teacher-login.html": 1, "teacher-register.html": 1,
    "suspended.html": 1, "platform.html": 1, "ielts-upgrade.html": 1
  };
  var name = location.pathname.split("/").filter(Boolean).pop() || "index.html";
  if (PUBLIC[name]) return;
  try {
    if (!localStorage.getItem("yysd:auth:token") && !localStorage.getItem("yysd:teacher:token")) {
      location.replace("login.html?next=" + encodeURIComponent(location.pathname + location.search));
    }
  } catch (e) {}
})();
