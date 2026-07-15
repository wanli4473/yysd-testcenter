/* =========================================================================
   teacher.js — 教师端学情看板
   ========================================================================= */
(function () {
  "use strict";

  var T = window.YYSD_TEACHER;
  var Y = window.YYSD;
  var zoneFilter = "";
  var searchQuery = "";
  var students = [];

  var welcomeEl = document.getElementById("teacher-welcome");
  var statsEl = document.getElementById("teacher-stats");
  var listEl = document.getElementById("teacher-students");
  var refreshBtn = document.getElementById("refresh-btn");
  var logoutBtn = document.getElementById("logout-btn");
  var yearEl = document.getElementById("year");

  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (logoutBtn) logoutBtn.addEventListener("click", function () { T.logout(); });

  document.querySelectorAll(".teacher-filter").forEach(function (btn) {
    btn.addEventListener("click", function () {
      zoneFilter = btn.getAttribute("data-zone") || "";
      document.querySelectorAll(".teacher-filter").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      render();
    });
  });
  if (refreshBtn) refreshBtn.addEventListener("click", load);
  var searchEl = document.getElementById("student-search");
  if (searchEl) {
    searchEl.addEventListener("input", function () {
      searchQuery = searchEl.value.trim().toLowerCase();
      render();
    });
  }

  function studentLabel(student) {
    if (student.displayName) return student.displayName;
    return student.phone || "未命名学生";
  }

  function avatarSrc(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url) || url.indexOf("data:") === 0) return url;
    return T.API_BASE + url;
  }

  function renderTeacherAvatar(url, phone) {
    var box = document.getElementById("teacher-avatar");
    if (!box) return;
    var src = avatarSrc(url);
    if (src) {
      box.innerHTML = '<img src="' + src.replace(/"/g, "") + '" alt="">';
      box.classList.add("has-img");
    } else {
      box.textContent = (phone || "").replace(/\D/g, "").slice(-4) || "师";
      box.classList.remove("has-img");
    }
  }

  function showAvatarMsg(text, ok) {
    var el = document.getElementById("teacher-avatar-msg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "auth-msg" + (ok ? " auth-msg--ok" : text ? " auth-msg--err" : "");
  }

  var avatarInput = document.getElementById("teacher-avatar-input");
  if (avatarInput) {
    avatarInput.addEventListener("change", function () {
      var file = this.files && this.files[0];
      this.value = "";
      if (!file || !window.YYSD_AUTH || !window.YYSD_AUTH.uploadAvatar) return;
      showAvatarMsg("上传中…");
      window.YYSD_AUTH.uploadAvatar(file)
        .then(function (d) {
          renderTeacherAvatar(d.avatarUrl, (T.getTeacher() || {}).phone);
          T.setTeacher({
            phone: (T.getTeacher() || {}).phone,
            name: (T.getTeacher() || {}).name || "",
            avatarUrl: d.avatarUrl || ""
          });
          showAvatarMsg("头像已更新", true);
        })
        .catch(function (e) { showAvatarMsg(e.message); });
    });
  }

  function matchesSearch(student) {
    if (!searchQuery) return true;
    var name = (student.displayName || "").toLowerCase();
    var phone = (student.phone || "").toLowerCase();
    return name.indexOf(searchQuery) >= 0 || phone.indexOf(searchQuery) >= 0;
  }

  function zoneLabel(zone) {
    return (Y.ZONE[zone] || {}).label || zone || "—";
  }

  function subjectLabel(subject) {
    return (Y.SUBJECT[subject] || {}).label || subject || "—";
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("zh-CN"); } catch (e) { return iso; }
  }

  function fmtScore(row) {
    if (row.score == null && row.writingWords == null) return "—";
    if (row.score != null) {
      var s = String(row.score);
      if (row.total != null) s += " / " + row.total;
      if (row.band != null) s += " · Band " + row.band;
      return s;
    }
    return row.writingWords ? row.writingWords + " 词" : "已完成";
  }

  function filteredScores(rows) {
    if (!zoneFilter) return rows || [];
    return (rows || []).filter(function (r) { return r.zone === zoneFilter; });
  }

  function renderStats(rows) {
    var totalStudents = rows.length;
    var withScores = rows.filter(function (s) { return s.scoreCount > 0; }).length;
    var totalRecords = rows.reduce(function (n, s) { return n + (s.scoreCount || 0); }, 0);
    var mockRecords = rows.reduce(function (n, s) { return n + (s.mockCount || 0); }, 0);
    statsEl.innerHTML =
      '<div class="teacher-stat"><b>' + totalStudents + '</b><span>注册学生</span></div>' +
      '<div class="teacher-stat"><b>' + withScores + '</b><span>有成绩记录</span></div>' +
      '<div class="teacher-stat"><b>' + totalRecords + '</b><span>成绩总条数</span></div>' +
      '<div class="teacher-stat"><b>' + mockRecords + '</b><span>模考记录</span></div>';
  }

  function renderStudentCard(student) {
    var scores = filteredScores(student.scores);
    var rowsHtml = scores.length
      ? scores.map(function (r) {
          var wrongN = (r.wrong && r.wrong.length) || 0;
          var btnLabel = wrongN ? ("查看错题 (" + wrongN + ")") : "查看详情";
          return '<tr>' +
            '<td><b>' + Y.esc(r.title || r.id) + '</b></td>' +
            '<td>' + Y.esc(zoneLabel(r.zone)) + '</td>' +
            '<td>' + Y.esc(subjectLabel(r.subject)) + '</td>' +
            '<td><span class="score-pill">' + Y.esc(fmtScore(r)) + '</span></td>' +
            '<td>' + fmtDate(r.date) + '</td>' +
            '<td><button type="button" class="btn btn--ghost btn--sm" data-attempt="' +
              Y.esc(String(r.attemptId || "")) + '" data-student="' + student.id + '">' +
              btnLabel + '</button></td>' +
          '</tr>';
        }).join("")
      : '<tr><td colspan="6" class="teacher-empty-row">暂无' + (zoneFilter ? zoneLabel(zoneFilter) : "") + '记录</td></tr>';

    return '<article class="teacher-card">' +
      '<header class="teacher-card__head">' +
        '<div><b>' + Y.esc(studentLabel(student)) + '</b>' +
        '<span class="teacher-card__meta">' + Y.esc(student.phone) +
        ' · 注册 ' + fmtDate(student.createdAt) +
        ' · 最近活跃 ' + fmtDate(student.lastScoreAt || student.lastLoginAt) + '</span></div>' +
        '<div class="teacher-card__badges">' +
          '<span class="teacher-badge">' + (student.scoreCount || 0) + ' 条成绩</span>' +
          '<span class="teacher-badge teacher-badge--mock">' + (student.mockCount || 0) + ' 次模考</span>' +
        '</div>' +
      '</header>' +
      '<div class="table-wrap"><table class="data teacher-table">' +
        '<thead><tr><th>内容</th><th>板块</th><th>科目</th><th>得分</th><th>完成时间</th><th>错题</th></tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody></table></div>' +
    '</article>';
  }

  function findAttempt(studentId, attemptId) {
    var sid = Number(studentId);
    var aid = Number(attemptId);
    for (var i = 0; i < students.length; i++) {
      if (students[i].id !== sid) continue;
      var scores = students[i].scores || [];
      for (var j = 0; j < scores.length; j++) {
        if (Number(scores[j].attemptId) === aid) return { student: students[i], attempt: scores[j] };
      }
    }
    return null;
  }

  function openAttemptDetail(studentId, attemptId) {
    var hit = findAttempt(studentId, attemptId);
    var modal = document.getElementById("attempt-modal");
    var body = document.getElementById("attempt-body");
    var title = document.getElementById("attempt-modal-title");
    if (!modal || !body || !hit) return;
    var r = hit.attempt;
    var wrong = r.wrong || [];
    title.textContent = (r.title || r.id) + " · " + fmtScore(r);
    var head =
      '<p class="teacher-attempt-meta">' + Y.esc(studentLabel(hit.student)) +
      ' · ' + fmtDate(r.date) +
      (r.band != null ? ' · Band ' + r.band : '') + '</p>';
    var list;
    if (!wrong.length) {
      list = '<p class="teacher-empty-row">本题次无错题明细' +
        (r.score != null && r.total != null && r.score === r.total ? '（全对）' : '（历史记录或该题型未上报）') +
        '</p>';
    } else {
      list = '<ul class="teacher-wrong-list">' + wrong.map(function (w) {
        return '<li><b>第 ' + Y.esc(String(w.no)) + ' 题</b>' +
          '<span>学生作答：' + Y.esc(w.ua || "未作答") + '</span>' +
          '<span>正确答案：' + Y.esc(w.ans || "—") + '</span></li>';
      }).join("") + '</ul>';
    }
    body.innerHTML = head + list;
    modal.hidden = false;
  }

  function closeAttemptDetail() {
    var modal = document.getElementById("attempt-modal");
    if (modal) modal.hidden = true;
  }

  function render() {
    var visible = students.filter(function (s) {
      if (!matchesSearch(s)) return false;
      return !zoneFilter || filteredScores(s.scores).length > 0;
    });
    renderStats(students);
    if (!visible.length) {
      listEl.innerHTML = '<div class="state state--brand teacher-empty">' +
        '<h3>' + (searchQuery ? "未找到匹配的学生" : "暂无学生记录") + '</h3>' +
        '<p>' + (searchQuery ? "请尝试其他用户名或手机号。" : "学生登录并完成练习或模考后，成绩会自动同步到这里。") + '</p></div>';
      return;
    }
    listEl.innerHTML = visible.map(renderStudentCard).join("");
  }

  function load() {
    listEl.innerHTML = '<div class="state state--brand"><div class="spinner spinner--brand"></div></div>';
    Promise.all([
      T.api("/api/teacher/me"),
      T.api("/api/teacher/students")
    ]).then(function (res) {
      var me = res[0].teacher || {};
      var label = me.name ? me.name + "（" + me.phone + "）" : me.phone;
      welcomeEl.textContent = "欢迎，" + label + "。以下为全部学生的云端成绩与模考记录。";
      renderTeacherAvatar(me.avatarUrl, me.phone);
      T.setTeacher({
        phone: me.phone,
        name: me.name || "",
        avatarUrl: me.avatarUrl || "",
        isAdmin: !!me.isAdmin
      });
      try {
        localStorage.setItem("yysd:auth:user", JSON.stringify({
          phone: me.phone || "",
          role: "teacher",
          displayName: me.name || "",
          avatarUrl: me.avatarUrl || "",
          isAdmin: !!me.isAdmin
        }));
      } catch (e) {}
      document.querySelectorAll("[data-admin-only]").forEach(function (el) {
        el.hidden = !me.isAdmin;
      });
      students = res[1].students || [];
      render();
    }).catch(function (e) {
      if (String(e.message).indexOf("登录") >= 0 || String(e.message).indexOf("教师") >= 0) {
        T.logout();
        return;
      }
      listEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + Y.esc(e.message) + '</p></div>';
    });
  }

  load();

  if (listEl) {
    listEl.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-attempt]");
      if (!btn) return;
      openAttemptDetail(btn.getAttribute("data-student"), btn.getAttribute("data-attempt"));
    });
  }
  var attemptModal = document.getElementById("attempt-modal");
  if (attemptModal) {
    attemptModal.addEventListener("click", function (e) {
      if (e.target.getAttribute("data-close-attempt")) closeAttemptDetail();
    });
  }
})();
