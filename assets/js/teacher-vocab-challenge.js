/* teacher-vocab-challenge.js */
(function () {
  "use strict";
  var T = window.YYSD_TEACHER;
  var Y = window.YYSD;
  var root = document.getElementById("tvc-root");
  if (!T || !root) return;

  var ASSIGNABLE = [
    { id: "gaozhong", label: "布置高中词库" },
    { id: "cet4-lite", label: "布置四级精简" }
  ];

  function esc(s) {
    return Y && Y.esc ? Y.esc(String(s == null ? "" : s)) : String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function label(s) {
    return (s && (s.displayName || s.name || s.phone)) || ("学生 #" + (s && s.id));
  }

  function formatProgress(b) {
    var prog = b && b.progress;
    if (!prog) return "—";
    var total = prog.totalDays || 78;
    if (prog.progressDay) {
      if (b.programComplete) return "已完成 " + total + " 关";
      return "第 " + Math.min(prog.progressDay, total) + " 关";
    }
    return "已通 L" + prog.clearedListNo;
  }

  function paint(students) {
    if (!students.length) {
      root.innerHTML = '<div class="state state--brand teacher-empty"><h3>暂无学生</h3><p>' +
        "当前机构还没有学生账号。</p></div>";
      return;
    }
    root.innerHTML =
      '<div class="table-wrap"><table class="data teacher-table">' +
        "<thead><tr><th>学生</th><th>已布置词册</th><th>操作</th></tr></thead>" +
        "<tbody>" +
        students.map(function (s) {
          var books = s.assignments && s.assignments.length
            ? s.assignments
            : (s.assignment ? [{
                bookId: s.assignment.bookId,
                bookLabel: s.assignment.bookLabel || s.assignment.bookId,
                progress: s.progress,
                todayTasks: s.todayTasks,
                programComplete: s.programComplete,
                pool: s.pool
              }] : []);
          var assigned = {};
          books.forEach(function (b) { assigned[b.bookId] = true; });
          var bookHtml = books.length
            ? books.map(function (b) {
                return '<div style="margin-bottom:8px">' +
                  "<b>" + esc(b.bookLabel || b.bookId) + "</b><br>" +
                  '<span class="teacher-card__meta">' + esc(formatProgress(b)) + "</span><br>" +
                  '<button type="button" class="btn btn--ghost btn--sm" data-unassign="' +
                    s.studentId + '" data-book="' + esc(b.bookId) + '">取消布置</button>' +
                  "</div>";
              }).join("")
            : "未布置";
          var btns = ASSIGNABLE.map(function (a) {
            if (assigned[a.id]) return "";
            return '<button type="button" class="btn btn--ghost btn--sm" data-assign="' +
              s.studentId + '" data-book="' + a.id + '">' + esc(a.label) + "</button> ";
          }).join("") +
            '<button type="button" class="btn btn--ghost btn--sm" data-refresh="' +
              s.studentId + '">刷新</button>';
          return "<tr data-id=\"" + s.studentId + "\">" +
            "<td><b>" + esc(label(s)) + "</b><br><span class=\"teacher-card__meta\">" +
              esc(s.phone || "") + "</span></td>" +
            "<td>" + bookHtml + "</td>" +
            "<td>" + btns + "</td>" +
            "</tr>";
        }).join("") +
        "</tbody></table></div>";

    root.onclick = function (e) {
      var t = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement);
      if (!t || !t.closest) return;
      var assignBtn = t.closest("[data-assign]");
      var unassignBtn = t.closest("[data-unassign]");
      var refreshBtn = t.closest("[data-refresh]");
      if (assignBtn) {
        doAssign(Number(assignBtn.getAttribute("data-assign")), assignBtn.getAttribute("data-book"));
      } else if (unassignBtn) {
        doUnassign(Number(unassignBtn.getAttribute("data-unassign")), unassignBtn.getAttribute("data-book"));
      } else if (refreshBtn) {
        loadOne(Number(refreshBtn.getAttribute("data-refresh")));
      }
    };
  }

  function msg(text, ok) {
    var el = document.getElementById("tvc-msg");
    if (!el) return;
    el.textContent = text || "";
    el.style.color = ok ? "#1f553f" : "#8a3b2a";
  }

  function doAssign(studentId, bookId) {
    msg("布置中…", true);
    T.api("/api/vocab-challenge/teacher/assign", {
      method: "POST",
      body: { studentId: studentId, bookId: bookId }
    }).then(function (d) {
      if (!d || !d.ok) {
        msg((d && d.error) || "布置失败", false);
        return;
      }
      msg(d.unchanged ? "已是该词册" : "布置成功", true);
      load();
    }).catch(function (e) {
      msg((e && e.message) || "布置失败", false);
    });
  }

  function doUnassign(studentId, bookId) {
    msg("取消中…", true);
    T.api("/api/vocab-challenge/teacher/unassign", {
      method: "POST",
      body: { studentId: studentId, bookId: bookId }
    }).then(function (d) {
      if (!d || !d.ok) {
        msg((d && d.error) || "取消失败", false);
        return;
      }
      msg("已取消布置（进度保留）", true);
      load();
    }).catch(function (e) {
      msg((e && e.message) || "取消失败", false);
    });
  }

  function loadOne(studentId) {
    T.api("/api/vocab-challenge/teacher/student?studentId=" + encodeURIComponent(studentId))
      .then(function () { load(); })
      .catch(function () { msg("刷新失败", false); });
  }

  function load() {
    T.api("/api/vocab-challenge/teacher/roster")
      .then(function (roster) {
        paint((roster && roster.students) || []);
      })
      .catch(function () {
        root.innerHTML = '<p class="vs-empty">加载失败，请确认已登录教师账号。</p>';
      });
  }

  load();
})();
