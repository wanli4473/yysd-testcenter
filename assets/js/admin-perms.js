/* =========================================================================
   admin-perms.js — batch grant/revoke access (admin only)
   scope=practice 整个练习区；scope=package:<卷id> 单个考前冲刺包
   ========================================================================= */
(function () {
  "use strict";
  var A = window.YYSD_AUTH;
  var API_BASE = (A && A.API_BASE) || "https://api.youyisida.com";
  var scope = "practice";
  var scopeSel = document.getElementById("scope-select");
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var studentList = document.getElementById("student-list");
  var studentQ = document.getElementById("student-q");
  var pickedHint = document.getElementById("picked-hint");
  var grantBtn = document.getElementById("grant-btn");
  var revokeBtn = document.getElementById("revoke-btn");
  var startAt = document.getElementById("start-at");
  var expireAt = document.getElementById("expire-at");
  var grantList = document.getElementById("grant-list");
  var msgEl = document.getElementById("msg");
  var logoutBtn = document.getElementById("logout-btn");

  var students = [];
  var grants = {};
  var grantRows = [];
  var selected = {};

  function token() {
    try {
      return localStorage.getItem("yysd:teacher:token") ||
        localStorage.getItem("yysd:auth:token") || "";
    } catch (e) { return ""; }
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function showMsg(text, ok) {
    msgEl.textContent = text || "";
    msgEl.className = "auth-msg" + (ok ? " auth-msg--ok" : text ? " auth-msg--err" : "");
  }

  function api(path, opts) {
    opts = opts || {};
    var h = { "Content-Type": "application/json" };
    var t = token();
    if (t) h.Authorization = "Bearer " + t;
    return fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: h,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || "请求失败");
        return d;
      });
    });
  }

  if (!token()) {
    location.replace("login.html?next=" + encodeURIComponent("admin-perms.html"));
    return;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      if (A && A.logout) A.logout();
      else {
        try {
          localStorage.removeItem("yysd:teacher:token");
          localStorage.removeItem("yysd:auth:token");
        } catch (e) {}
        location.href = "index.html";
      }
    });
  }

  function studentLabel(s) {
    return (s.displayName ? s.displayName + " · " : "") + (s.phone || ("#" + s.id));
  }

  function fmtWhen(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return (d.getMonth() + 1) + "月" + d.getDate() + "日 " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* st = 服务端算好的 state（{on,reason,startAt,expireAt}） */
  function stateInfo(st) {
    if (!st) return { cls: "cal-status--none", text: "未开通", when: "" };
    if (st.on) return { cls: "cal-status--done", text: "已开通", when: st.expireAt ? fmtWhen(st.expireAt) + " 到期" : "长期有效" };
    if (st.reason === "scheduled") return { cls: "cal-status--pending", text: "定时开启", when: fmtWhen(st.startAt) + " 开启" };
    if (st.reason === "expired") return { cls: "cal-status--overdue", text: "已到期", when: "到期于 " + fmtWhen(st.expireAt) };
    return { cls: "cal-status--off", text: "已停用", when: "" };
  }

  function stateChip(st) {
    var i = stateInfo(st);
    return '<span class="cal-status-pill ' + i.cls + '"' +
      (i.when ? ' title="' + esc(i.when) + '"' : "") + ">" + i.text + "</span>";
  }

  function stateOf(id) {
    return grants[id] ? grants[id].state : null;
  }

  function scopeName() {
    var o = scopeSel && scopeSel.options[scopeSel.selectedIndex];
    return o ? o.textContent : "练习区";
  }
  function isPkg() { return scope.indexOf("package:") === 0; }
  /* 考前冲刺包关停是宽限（考完本场）；练习区停用是立即交卷 */
  function offHint() {
    return isPkg() ? "正在考的可以考完本场，未开始的不能再进。" : "进行中的作答会立即交卷。";
  }

  function loadPackages() {
    if (!scopeSel) return Promise.resolve();
    return api("/api/toefl/packages").then(function (d) {
      (d.packages || []).forEach(function (p) {
        var opt = document.createElement("option");
        opt.value = "package:" + p.id;
        opt.textContent = "考前冲刺包 · " + p.title + (p.kind === "single" ? "（单科）" : "");
        scopeSel.appendChild(opt);
      });
    }).catch(function () { /* 取不到就只显示练习区 */ });
  }

  function updateFoot() {
    var n = Object.keys(selected).length;
    pickedHint.textContent = n ? ("已选 " + n + " 名学生") : "勾选学生，设置时间后开通";
    grantBtn.disabled = !n;
    revokeBtn.disabled = !n;
  }

  function renderStudents() {
    var q = (studentQ.value || "").trim().toLowerCase();
    var visible = students.filter(function (s) {
      if (!q) return true;
      return studentLabel(s).toLowerCase().indexOf(q) >= 0;
    });
    studentList.innerHTML = visible.map(function (s) {
      return '<label class="cal-check">' +
        '<input type="checkbox" data-sid="' + s.id + '"' + (selected[s.id] ? " checked" : "") + ">" +
        "<span><b>" + esc(s.displayName || "未命名") + "</b><small>" + esc(s.phone || "") + "</small></span>" +
        stateChip(stateOf(s.id)) + "</label>";
    }).join("") || '<p class="profile-hint">没有匹配的学生</p>';
    updateFoot();
  }

  function renderLedger() {
    if (!grantRows.length) {
      grantList.innerHTML = '<p class="profile-hint">暂无授权记录</p>';
      return;
    }
    grantList.innerHTML = grantRows.map(function (g) {
      var i = stateInfo(g.state);
      var meta = [g.phone || "", i.when, g.updatedByName ? g.updatedByName + " 操作" : ""]
        .filter(Boolean).join(" · ");
      return '<div class="perm-row">' +
        '<div class="perm-row__main"><b>' + esc(g.name || ("#" + g.userId)) + "</b>" +
        "<small>" + esc(meta) + "</small></div>" +
        stateChip(g.state) +
        '<button type="button" class="btn btn--ghost btn--sm" data-revoke="' + g.userId + '">收回</button>' +
        "</div>";
    }).join("");
  }

  function loadGrants() {
    return api("/api/admin/grants?scope=" + encodeURIComponent(scope)).then(function (d) {
      grantRows = d.grants || [];
      grants = {};
      grantRows.forEach(function (g) { grants[g.userId] = g; });
      renderLedger();
      renderStudents();
    });
  }

  function post(body) {
    showMsg("保存中…", true);
    grantBtn.disabled = true;
    revokeBtn.disabled = true;
    return api("/api/admin/grants", { method: "POST", body: body }).then(function (d) {
      selected = {};
      return loadGrants().then(function () {
        showMsg(body.action === "off" ? ("已停用 " + d.count + " 人") : ("已开通 " + d.count + " 人"), true);
      });
    }).catch(function (e) {
      showMsg(e.message);
    }).then(function () {
      updateFoot();
    });
  }

  function batch(action) {
    var ids = Object.keys(selected).map(Number);
    if (!ids.length) return;
    if (action === "off" && !window.confirm("停用这 " + ids.length + " 名学生的「" + scopeName() + "」权限？" + offHint())) return;
    var body = { studentIds: ids, scope: scope, action: action };
    if (action !== "off") {
      body.startAt = startAt.value ? new Date(startAt.value).toISOString() : "";
      body.expireAt = expireAt.value ? new Date(expireAt.value).toISOString() : "";
    }
    post(body);
  }

  studentQ.addEventListener("input", renderStudents);

  studentList.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute("data-sid")) return;
    var id = Number(t.getAttribute("data-sid"));
    if (t.checked) selected[id] = true;
    else delete selected[id];
    updateFoot();
  });

  document.getElementById("select-all").addEventListener("click", function () {
    var q = (studentQ.value || "").trim().toLowerCase();
    students.forEach(function (s) {
      if (q && studentLabel(s).toLowerCase().indexOf(q) < 0) return;
      selected[s.id] = true;
    });
    renderStudents();
  });

  document.getElementById("clear-all").addEventListener("click", function () {
    selected = {};
    renderStudents();
  });

  grantBtn.addEventListener("click", function () { batch("on"); });
  revokeBtn.addEventListener("click", function () { batch("off"); });

  grantList.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-revoke]");
    if (!btn) return;
    var id = Number(btn.getAttribute("data-revoke"));
    var g = grants[id];
    if (!g) return;
    if (!window.confirm("收回「" + (g.name || "#" + id) + "」的「" + scopeName() + "」权限？" + offHint())) return;
    post({ studentIds: [id], scope: scope, action: "off" });
  });

  if (scopeSel) {
    scopeSel.addEventListener("change", function () {
      scope = scopeSel.value;
      selected = {};
      renderStudents();
      showMsg("");
      loadGrants().catch(function (e) { showMsg(e.message); });
    });
  }

  loadPackages();
  api("/api/admin/students").then(function (d) {
    students = d.students || [];
    renderStudents();
    return loadGrants();
  }).catch(function (e) {
    showMsg(e.message || "无管理员权限，请使用管理员账号登录");
    studentList.innerHTML = '<p class="profile-hint">无法加载</p>';
    grantList.innerHTML = '<p class="profile-hint">无法加载</p>';
    // ponytail: 已登录但角色不对时留在原地看提示；去 login 会被已登录会话原样弹回，来回跳
    if (String(e.message).indexOf("管理员") < 0) {
      setTimeout(function () {
        location.href = "login.html?next=" + encodeURIComponent("admin-perms.html");
      }, 1200);
    }
  });
})();
