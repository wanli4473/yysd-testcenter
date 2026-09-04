/* platform.js — platform super-admin console */
(function () {
  "use strict";

  var A = window.YYSD_AUTH;
  if (!A) return;

  function msg(t, ok) {
    var el = document.getElementById("plat-msg");
    if (!el) return;
    el.style.color = ok ? "#2e7d32" : "#c62828";
    el.textContent = t || "";
  }

  function badge(org) {
    if (org.status === "suspended" || !org.usable) {
      return '<span class="plat-badge plat-badge--bad">已停用</span>';
    }
    if (org.expiringSoon) {
      return '<span class="plat-badge plat-badge--warn">即将到期</span>';
    }
    if (org.status === "trial") {
      return '<span class="plat-badge plat-badge--warn">试用</span>';
    }
    return '<span class="plat-badge plat-badge--ok">正常</span>';
  }

  function hostBase() {
    var h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return h + (location.port ? ":" + location.port : "");
    return h.replace(/^[^.]+\./, "") === "youyisida.com" || h.indexOf("youyisida.com") >= 0
      ? "youyisida.com"
      : h;
  }

  function orgUrl(slug) {
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      return location.origin + "/?tenant=" + encodeURIComponent(slug);
    }
    return "https://" + slug + "." + hostBase().replace(/^www\./, "");
  }

  function renderList(orgs) {
    var box = document.getElementById("plat-list");
    var warn = document.getElementById("plat-expiring");
    var soon = (orgs || []).filter(function (o) { return o.expiringSoon; });
    if (soon.length) {
      warn.hidden = false;
      warn.textContent = "即将到期（14 天内）：" + soon.map(function (o) {
        return o.name + "（剩 " + o.expiresInDays + " 天）";
      }).join("、");
    } else {
      warn.hidden = true;
    }

    box.innerHTML = (orgs || []).map(function (o) {
      return (
        '<article class="plat-card" data-id="' + o.id + '">' +
          '<div class="plat-card__top">' +
            '<div><span class="plat-card__name">' + escapeHtml(o.name) + "</span> " + badge(o) +
            '<div class="plat-card__meta">' + escapeHtml(o.slug) + ".… · 管理员 " +
            escapeHtml(o.adminPhone || "未设") +
            (o.expiresAt ? " · 到期 " + String(o.expiresAt).slice(0, 10) : " · 不限期") +
            "</div></div>" +
            (o.logoUrl ? '<img src="' + A.logoSrc(o.logoUrl) + '" alt="" width="40" height="40" style="border-radius:6px;object-fit:cover">' : "") +
          "</div>" +
          '<div class="plat-card__stats">' +
            "<span>学生 " + o.studentCount + "</span>" +
            "<span>老师 " + o.teacherCount + "</span>" +
            "<span>7 日活跃 " + o.active7d + "</span>" +
            "<span>30 日活跃 " + o.active30d + "</span>" +
          "</div>" +
          '<div class="plat-card__actions">' +
            '<a class="btn btn--ghost btn--sm" href="' + orgUrl(o.slug) + '" target="_blank" rel="noopener">打开站点</a>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-act="edit">编辑</button>' +
            (o.status === "suspended"
              ? '<button type="button" class="btn btn--primary btn--sm" data-act="activate">恢复开通</button>'
              : '<button type="button" class="btn btn--ghost btn--sm" data-act="suspend">关停</button>') +
            (o.slug !== "yysd"
              ? '<button type="button" class="btn btn--ghost btn--sm" data-act="keys">注册密钥</button>'
              : "") +
            '<button type="button" class="btn btn--primary btn--sm" data-act="impersonate">客服进入</button>' +
          "</div>" +
        "</article>"
      );
    }).join("") || "<p>暂无机构</p>";
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function load() {
    return A.api("/api/platform/orgs").then(function (d) {
      renderList(d.orgs || []);
      return d;
    }).then(function () {
      return A.api("/api/platform/audit");
    }).then(function (d) {
      var ul = document.getElementById("plat-audit-list");
      ul.innerHTML = (d.logs || []).slice(0, 30).map(function (l) {
        return "<li>" + escapeHtml(l.createdAt) + " · " + escapeHtml(l.actorPhone) +
          " · " + escapeHtml(l.action) + " · " + escapeHtml(l.detail) + "</li>";
      }).join("") || "<li>暂无</li>";
    });
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve("");
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result || "")); };
      r.onerror = function () { reject(new Error("读取图片失败")); };
      r.readAsDataURL(file);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // 主控台仅允许总部站 youyisida.com（slug=yysd）
    if (A.isHqSite && !A.isHqSite()) {
      msg("平台主控台仅可在优益思达总部网站使用。");
      return;
    }
    if (!A.getToken()) {
      location.replace((window.YYSD_TEACHER ? "teacher-login.html" : "login.html") +
        "?next=" + encodeURIComponent("platform.html"));
      return;
    }
    var logoutBtn = document.getElementById("logout-btn") || document.getElementById("plat-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        if (window.YYSD_TEACHER && YYSD_TEACHER.getToken && YYSD_TEACHER.getToken()) YYSD_TEACHER.logout();
        else A.logout();
      });
    }

    function gateThenLoad() {
      return A.api("/api/auth/me").then(function (d) {
        var u = d.user || {};
        if (!u.isPlatformAdmin) {
          msg("当前账号无法进入平台主控台。");
          return null;
        }
        A.setUser({
          phone: u.phone || "",
          role: u.role || "",
          displayName: u.displayName || u.name || "",
          avatarUrl: u.avatarUrl || "",
          isAdmin: !!u.isAdmin,
          isPlatformAdmin: true
        });
        return load();
      });
    }

    document.getElementById("c-submit").addEventListener("click", function () {
      var body = {
        name: document.getElementById("c-name").value.trim(),
        slug: document.getElementById("c-slug").value.trim().toLowerCase(),
        adminPhone: document.getElementById("c-admin").value.trim(),
        expiresAt: document.getElementById("c-expires").value
          ? new Date(document.getElementById("c-expires").value + "T23:59:59").toISOString()
          : null,
        contractNote: document.getElementById("c-note").value.trim(),
        status: "trial"
      };
      A.api("/api/platform/orgs", { method: "POST", body: body }).then(function () {
        msg("已创建", true);
        document.getElementById("c-name").value = "";
        document.getElementById("c-slug").value = "";
        return load();
      }).catch(function (e) { msg(e.message || "创建失败"); });
    });

    var dlg = document.getElementById("plat-edit");
    var editing = null;
    var keysDlg = document.getElementById("plat-keys");
    var keysOrgId = 0;

    function randKey(prefix) {
      var s = Math.random().toString(36).slice(2, 6).toUpperCase() +
        Math.random().toString(36).slice(2, 6).toUpperCase();
      return prefix + "-" + s;
    }

    function fillKeysForm(keys) {
      ["student", "teacher", "org_admin"].forEach(function (role) {
        var row = (keys || []).filter(function (k) { return k.role === role; })[0] || {};
        document.getElementById("k-" + role + "-key").value = row.keyValue || "";
        document.getElementById("k-" + role + "-max").value = row.maxUses != null ? row.maxUses : 0;
        document.getElementById("k-" + role + "-used").textContent =
          "已用 " + (row.usedCount || 0) + " / " + (row.maxUses || 0);
      });
    }

    function openKeysDialog(id) {
      keysOrgId = id;
      A.api("/api/platform/orgs/" + id + "/reg-keys")
        .then(function (d) {
          document.getElementById("k-org-name").textContent = (d.name || "") + " · " + (d.slug || "");
          fillKeysForm(d.keys || []);
          keysDlg.showModal();
        })
        .catch(function (e) { msg(e.message); });
    }

    document.getElementById("plat-keys").addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-k-act]");
      if (!btn) return;
      var act = btn.getAttribute("data-k-act");
      var role = btn.getAttribute("data-role");
      if (act === "gen" && role) {
        var prefix = role === "student" ? "STU" : role === "teacher" ? "TCH" : "ADM";
        document.getElementById("k-" + role + "-key").value = randKey(prefix);
        document.getElementById("k-" + role + "-reset").checked = true;
        return;
      }
      if (act === "add" && role) {
        var maxEl = document.getElementById("k-" + role + "-max");
        var n = Math.max(0, Math.floor(Number(maxEl.value) || 0));
        maxEl.value = n + 10;
        return;
      }
    });

    document.getElementById("plat-keys-form").addEventListener("submit", function (ev) {
      var val = ev.submitter && ev.submitter.value;
      if (val === "cancel") return;
      ev.preventDefault();
      if (!keysOrgId) return;
      var keys = ["student", "teacher", "org_admin"].map(function (role) {
        return {
          role: role,
          keyValue: document.getElementById("k-" + role + "-key").value.trim(),
          maxUses: Math.max(0, Math.floor(Number(document.getElementById("k-" + role + "-max").value) || 0)),
          resetUsed: !!document.getElementById("k-" + role + "-reset").checked
        };
      });
      A.api("/api/platform/orgs/" + keysOrgId + "/reg-keys", {
        method: "PUT",
        body: { keys: keys }
      }).then(function (d) {
        fillKeysForm(d.keys || []);
        ["student", "teacher", "org_admin"].forEach(function (role) {
          document.getElementById("k-" + role + "-reset").checked = false;
        });
        msg("注册密钥已保存", true);
        keysDlg.close();
      }).catch(function (e) { msg(e.message || "保存失败"); });
    });

    document.getElementById("plat-list").addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-act]");
      if (!btn) return;
      var card = btn.closest(".plat-card");
      var id = Number(card && card.getAttribute("data-id"));
      if (!id) return;
      var act = btn.getAttribute("data-act");

      if (act === "suspend") {
        if (!confirm("确认关停该机构？对方将无法登录。")) return;
        A.api("/api/platform/orgs/" + id + "/suspend", { method: "POST", body: {} })
          .then(load).catch(function (e) { msg(e.message); });
        return;
      }
      if (act === "activate") {
        A.api("/api/platform/orgs/" + id + "/activate", { method: "POST", body: {} })
          .then(load).catch(function (e) { msg(e.message); });
        return;
      }
      if (act === "keys") {
        openKeysDialog(id);
        return;
      }
      if (act === "impersonate") {
        A.api("/api/platform/orgs/" + id + "/impersonate", { method: "POST", body: {} })
          .then(function (d) {
            if (d.entryUrl) {
              window.open(d.entryUrl, "_blank", "noopener");
              msg("已打开客服会话（2 小时内有效）", true);
            }
          }).catch(function (e) { msg(e.message); });
        return;
      }
      if (act === "edit") {
        A.api("/api/platform/orgs").then(function (d) {
          editing = (d.orgs || []).filter(function (o) { return o.id === id; })[0];
          if (!editing) return;
          document.getElementById("e-id").value = editing.id;
          document.getElementById("e-name").value = editing.name || "";
          document.getElementById("e-slug").value = editing.slug || "";
          document.getElementById("e-admin").value = editing.adminPhone || "";
          document.getElementById("e-expires").value = editing.expiresAt
            ? String(editing.expiresAt).slice(0, 10) : "";
          document.getElementById("e-status").value = editing.status || "active";
          document.getElementById("e-note").value = editing.contractNote || "";
          document.getElementById("e-logo").value = "";
          dlg.showModal();
        });
      }
    });

    document.getElementById("plat-edit-form").addEventListener("submit", function (ev) {
      var val = ev.submitter && ev.submitter.value;
      if (val === "cancel") return;
      ev.preventDefault();
      var id = Number(document.getElementById("e-id").value);
      var file = document.getElementById("e-logo").files[0];
      fileToDataUrl(file).then(function (dataUrl) {
        var body = {
          name: document.getElementById("e-name").value.trim(),
          slug: document.getElementById("e-slug").value.trim().toLowerCase(),
          adminPhone: document.getElementById("e-admin").value.trim() || null,
          status: document.getElementById("e-status").value,
          expiresAt: document.getElementById("e-expires").value
            ? new Date(document.getElementById("e-expires").value + "T23:59:59").toISOString()
            : null,
          contractNote: document.getElementById("e-note").value.trim()
        };
        if (dataUrl) body.logoDataUrl = dataUrl;
        return A.api("/api/platform/orgs/" + id, { method: "PATCH", body: body });
      }).then(function () {
        dlg.close();
        msg("已保存", true);
        return load();
      }).catch(function (e) { msg(e.message || "保存失败"); });
    });

    function ensureMaintBox() {
      if (document.getElementById("maint-toggle")) return;
      var create = document.getElementById("plat-create");
      if (!create) return;
      var box = document.createElement("section");
      box.className = "plat-form";
      box.id = "plat-maint";
      box.innerHTML = "<h2>全站维护</h2>" +
        "<p class=\"minimal-page-desc\">打开后，只有 15901754473、18956023079 能进网站，其他人只看到更新中页面。改完记得关掉。</p>" +
        "<button type=\"button\" class=\"btn btn--primary\" id=\"maint-toggle\">打开维护</button>";
      create.parentNode.insertBefore(box, create);
    }
    function loadMaint() {
      ensureMaintBox();
      return A.api("/api/maintenance").then(function (d) {
        var btn = document.getElementById("maint-toggle");
        if (!btn) return;
        btn.setAttribute("data-on", d.on ? "1" : "0");
        btn.textContent = d.on ? "关闭维护（恢复大家访问）" : "打开维护（只留自己能进）";
      });
    }
    function bindMaint() {
      ensureMaintBox();
      var maintBtn = document.getElementById("maint-toggle");
      if (!maintBtn || maintBtn.getAttribute("data-bound") === "1") return;
      maintBtn.setAttribute("data-bound", "1");
      maintBtn.addEventListener("click", function () {
        var on = maintBtn.getAttribute("data-on") !== "1";
        A.api("/api/maintenance", { method: "POST", body: { on: on } })
          .then(function () {
            msg(on ? "维护已打开，其他人暂时进不来" : "维护已关闭，网站恢复访问", true);
            return loadMaint();
          })
          .catch(function (e) { msg(e.message || "切换失败"); });
      });
    }
    bindMaint();

    gateThenLoad().then(loadMaint).catch(function (e) {
      msg((e && e.message) || "无法进入平台主控台");
    });
  });
})();
