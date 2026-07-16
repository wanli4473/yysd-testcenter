/* =========================================================================
   dashboard.js — 待办事项（待办列表；日历由 student-calendar.js 渲染）
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var A = window.YYSD_AUTH;
  var root = document.getElementById("dash-root");
  var hello = document.getElementById("dash-hello");

  document.getElementById("year").textContent = new Date().getFullYear();

  if (!A || !A.requireLogin || !A.requireLogin()) return;
  if (A.isTeacher && A.isTeacher()) {
    location.replace("teacher.html");
    return;
  }

  var user = A.getUser ? A.getUser() : {};
  var name = (user.displayName || "").trim();
  if (hello) hello.textContent = name ? (name + "，你好") : "待办事项";

  var TYPE_LABEL = {
    ASSIGNMENT: "练习作业",
    LESSON: "课程日程",
    ANNOUNCEMENT: "提醒事项"
  };
  var STATUS_LABEL = {
    PENDING: "未完成",
    COMPLETED: "已完成",
    OVERDUE: "已逾期"
  };

  function esc(s) { return Y.esc(s); }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("zh-CN", {
        hour12: false, month: "numeric", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return ""; }
  }

  function todosHTML(events) {
    var open = (events || []).filter(function (ev) {
      return ev.status === "PENDING" || ev.status === "OVERDUE";
    }).sort(function (a, b) {
      if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1;
      if (b.status === "OVERDUE" && a.status !== "OVERDUE") return 1;
      return String(a.dueTime || a.startTime || "").localeCompare(String(b.dueTime || b.startTime || ""));
    }).slice(0, 6);

    var body;
    if (!open.length) {
      body = '<p class="dash-empty">暂无待办。老师布置作业后会出现在这里。</p>' +
        '<a class="btn btn--ghost btn--sm" href="#dash-calendar">查看任务日历</a>';
    } else {
      body = '<ul class="dash-todo-list">' + open.map(function (ev) {
        var st = ev.status || "PENDING";
        return '<li class="dash-todo">' +
          '<div class="dash-todo__main">' +
            '<span class="cal-tag cal-tag--' +
              (ev.eventType === "ASSIGNMENT" ? "assignment" : ev.eventType === "LESSON" ? "lesson" : "announce") +
              '">' + esc(TYPE_LABEL[ev.eventType] || "") + "</span> " +
            '<span class="cal-status-pill cal-status--' +
              (st === "COMPLETED" ? "done" : st === "OVERDUE" ? "overdue" : "pending") +
              '">' + esc(STATUS_LABEL[st] || st) + "</span>" +
            "<b>" + esc(ev.title) + "</b>" +
            '<span class="dash-todo__meta">' +
              (ev.dueTime ? "截止 " + esc(fmtDate(ev.dueTime)) : (ev.startTime ? "开始 " + esc(fmtDate(ev.startTime)) : "")) +
            "</span></div>" +
          '<a class="btn btn--primary btn--sm" href="#event-' + esc(String(ev.id)) + '">查看</a></li>';
      }).join("") + "</ul>" +
        '<a class="dash-more" href="#dash-calendar">全部任务 →</a>';
    }

    return '<section class="dash-section" aria-label="待办">' +
      '<div class="dash-section__head"><h2>待办</h2><p>本周作业与截止</p></div>' +
      body + "</section>";
  }

  function fail(msg) {
    root.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + esc(msg) + "</p></div>";
  }

  A.api("/api/student/calendar").then(function (res) {
    var events = (res && res.events) || [];
    root.innerHTML = todosHTML(events);
  }).catch(function (e) {
    fail(e.message || "请刷新重试");
  });
})();
