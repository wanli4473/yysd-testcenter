/* teacher-vocab-challenge.js */
(function () {
  "use strict";
  var T = window.YYSD_TEACHER;
  var Y = window.YYSD;
  var root = document.getElementById("tvc-root");
  if (!T || !root) return;

  function esc(s) {
    return Y && Y.esc ? Y.esc(String(s == null ? "" : s)) : String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function label(s) {
    return (s && (s.displayName || s.name || s.phone)) || ("学生 #" + (s && s.id));
  }

  function formatProgress(s) {
    var prog = s.progress;
    if (!prog) return "—";
    if (prog.progressDay) {
      var tasks = s.todayTasks || [];
      var done = tasks.filter(function (t) { return t.status === "completed"; }).length;
      var total = tasks.length;
      var line = "第 " + Math.min(prog.progressDay, 78) + " 关";
      if (s.programComplete) line = "已完成 78 关";
      else if (total) line += " · 本关 " + done + "/" + total;
      return line;
    }
    return "已通 L" + prog.clearedListNo + " · 下一 L" + prog.nextListNo;
  }

  function formatTodayTasks(s) {
    var tasks = s.todayTasks || [];
    if (!tasks.length) return "—";
    return tasks.map(function (t) {
      var mark = t.status === "completed" ? "✓" : t.status === "failed" ? "!" : "○";
      return mark + " L" + t.listNo + (t.taskType === "review" ? "复" : "新");
    }).join(" ");
  }

  function paint(students) {
    if (!students.length) {
      var hint = (T.isAdmin && T.isAdmin())
        ? '请先在<a href="admin-assign.html">学生分配</a>中把学生绑到教师账号。'
        : "还没有分配给你的学生。请联系管理员绑定后再布置闯关。";
      root.innerHTML = '<div class="state state--brand teacher-empty"><h3>暂无学生</h3><p>' +
        hint + "</p></div>";
      return;
    }
    root.innerHTML =
      '<div class="table-wrap"><table class="data teacher-table">' +
        "<thead><tr><th>学生</th><th>当前词册</th><th>进度</th><th>本关任务</th><th>抽测池 / 错题本</th><th>操作</th></tr></thead>" +
        "<tbody>" +
        students.map(function (s) {
          var asg = s.assignment;
          var pool = s.pool;
          return "<tr data-id=\"" + s.studentId + "\">" +
            "<td><b>" + esc(label(s)) + "</b><br><span class=\"teacher-card__meta\">" +
              esc(s.phone || "") + "</span></td>" +
            "<td>" + (asg ? esc(asg.bookId) : "未布置") + "</td>" +
            "<td>" + esc(formatProgress(s)) + "</td>" +
            "<td><span class=\"teacher-card__meta\">" + esc(formatTodayTasks(s)) + "</span></td>" +
            "<td>" + (pool
              ? ("池 " + pool.active + " · 顽固 " + pool.stubborn + " · 本 " + pool.notebook)
              : "—") + "</td>" +
            "<td><button type=\"button\" class=\"btn btn--ghost btn--sm\" data-assign=\"" +
              s.studentId + "\">布置高中词库</button> " +
              "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-refresh=\"" +
              s.studentId + "\">刷新</button></td>" +
            "</tr>";
        }).join("") +
        "</tbody></table></div>" +
        '<p class="auth-msg" id="tvc-msg" role="status"></p>';

    root.onclick = function (e) {
      var assignBtn = e.target.closest("[data-assign]");
      var refreshBtn = e.target.closest("[data-refresh]");
      if (assignBtn) {
        doAssign(Number(assignBtn.getAttribute("data-assign")));
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

  function doAssign(studentId) {
    msg("布置中…", true);
    T.api("/api/vocab-challenge/teacher/assign", {
      method: "POST",
      body: { studentId: studentId, bookId: "gaozhong" }
    }).then(function (d) {
      if (!d || !d.ok) {
        msg((d && d.error) || "布置失败", false);
        return;
      }
      msg(d.unchanged ? "已是该词册" : (d.switched ? "已换书并归档旧进度" : "布置成功"), true);
      load();
    }).catch(function (e) {
      msg((e && e.message) || "布置失败", false);
    });
  }

  function loadOne(studentId) {
    T.api("/api/vocab-challenge/teacher/student?studentId=" + encodeURIComponent(studentId))
      .then(function () { load(); })
      .catch(function () { msg("刷新失败", false); });
  }

  function load() {
    T.api("/api/teacher/students")
      .then(function (d) {
        var list = (d && d.students) || d || [];
        if (!Array.isArray(list)) list = [];
        var ids = list.map(function (s) { return s.id; }).filter(Boolean);
        if (!ids.length) {
          paint([]);
          return;
        }
        return T.api(
          "/api/vocab-challenge/teacher/roster?studentIds=" + encodeURIComponent(ids.join(","))
        ).then(function (roster) {
          // roster uses managed ids; merge names from students list
          var byId = {};
          list.forEach(function (s) { byId[s.id] = s; });
          var rows = (roster && roster.students) || [];
          rows.forEach(function (r) {
            var src = byId[r.studentId];
            if (src) {
              r.phone = r.phone || src.phone;
              r.displayName = r.displayName || src.displayName || src.name;
            }
          });
          paint(rows);
        });
      })
      .catch(function () {
        root.innerHTML = '<p class="vs-empty">加载失败，请确认已登录教师账号。</p>';
      });
  }

  load();
})();
