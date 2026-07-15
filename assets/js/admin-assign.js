/* =========================================================================
   admin-assign.js — assign students to a teacher (admin only)
   ========================================================================= */
(function () {
  "use strict";
  var A = window.YYSD_AUTH;
  var API_BASE = (A && A.API_BASE) || "https://api.youyisida.com";
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var teacherSelect = document.getElementById("teacher-select");
  var studentList = document.getElementById("student-list");
  var studentQ = document.getElementById("student-q");
  var pickedHint = document.getElementById("picked-hint");
  var saveBtn = document.getElementById("save-btn");
  var msgEl = document.getElementById("msg");
  var logoutBtn = document.getElementById("logout-btn");

  var teachers = [];
  var students = [];
  var selected = {};
  var activeTeacherId = 0;

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
    location.replace("login.html?next=" + encodeURIComponent("admin-assign.html"));
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

  function renderStudents() {
    if (!activeTeacherId) {
      studentList.innerHTML = '<p class="profile-hint">请先选择教师</p>';
      pickedHint.textContent = "请先选择教师";
      saveBtn.disabled = true;
      return;
    }
    var q = (studentQ.value || "").trim().toLowerCase();
    var visible = students.filter(function (s) {
      if (!q) return true;
      return studentLabel(s).toLowerCase().indexOf(q) >= 0;
    });
    studentList.innerHTML = visible.map(function (s) {
      var checked = selected[s.id] ? " checked" : "";
      return '<label class="cal-check">' +
        '<input type="checkbox" data-sid="' + s.id + '"' + checked + ">" +
        "<span><b>" + esc(s.displayName || "未命名") + "</b>" +
        "<small>" + esc(s.phone) +
        (s.scoreCount ? " · " + s.scoreCount + " 条成绩" : "") +
        "</small></span></label>";
    }).join("") || '<p class="profile-hint">没有匹配的学生</p>';

    var n = Object.keys(selected).length;
    pickedHint.textContent = "已选 " + n + " 名学生（保存后将覆盖该教师当前名单）";
    saveBtn.disabled = false;
  }

  function loadAssignments(teacherId) {
    selected = {};
    return api("/api/admin/assignments?teacherId=" + teacherId).then(function (d) {
      (d.studentIds || []).forEach(function (id) { selected[id] = true; });
      renderStudents();
    });
  }

  teacherSelect.addEventListener("change", function () {
    activeTeacherId = Number(teacherSelect.value) || 0;
    showMsg("");
    if (!activeTeacherId) {
      selected = {};
      renderStudents();
      return;
    }
    loadAssignments(activeTeacherId).catch(function (e) { showMsg(e.message); });
  });

  studentQ.addEventListener("input", renderStudents);

  studentList.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute("data-sid")) return;
    var id = Number(t.getAttribute("data-sid"));
    if (t.checked) selected[id] = true;
    else delete selected[id];
    pickedHint.textContent = "已选 " + Object.keys(selected).length + " 名学生（保存后将覆盖该教师当前名单）";
  });

  document.getElementById("select-all").addEventListener("click", function () {
    if (!activeTeacherId) return;
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

  saveBtn.addEventListener("click", function () {
    if (!activeTeacherId) return;
    showMsg("保存中…");
    saveBtn.disabled = true;
    api("/api/admin/assignments", {
      method: "PUT",
      body: {
        teacherId: activeTeacherId,
        studentIds: Object.keys(selected).map(Number)
      }
    }).then(function (d) {
      showMsg("已保存：该教师现有 " + (d.studentIds || []).length + " 名学生", true);
      saveBtn.disabled = false;
    }).catch(function (e) {
      showMsg(e.message);
      saveBtn.disabled = false;
    });
  });

  Promise.all([
    api("/api/admin/teachers"),
    api("/api/admin/students")
  ]).then(function (res) {
    teachers = res[0].teachers || [];
    students = res[1].students || [];
    teacherSelect.innerHTML = '<option value="">请选择教师</option>' +
      teachers.map(function (t) {
        return '<option value="' + t.id + '">' +
          esc((t.name || "教师") + " · " + t.phone + "（已分配 " + t.studentCount + " 人）") +
          "</option>";
      }).join("");
    renderStudents();
  }).catch(function (e) {
    showMsg(e.message || "无管理员权限，请使用管理员账号登录");
    teacherSelect.innerHTML = '<option value="">无法加载</option>';
    if (String(e.message).indexOf("管理员") >= 0 || String(e.message).indexOf("登录") >= 0) {
      setTimeout(function () {
        location.href = "login.html?next=" + encodeURIComponent("admin-assign.html");
      }, 1200);
    }
  });
})();
