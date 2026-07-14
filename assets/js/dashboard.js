/* =========================================================================
   dashboard.js — Canvas-style student workbench
   Order: zones → todos → continue → scores → announcements
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
  if (hello) hello.textContent = name ? (name + "，你好") : "你好";

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

  function zonesHTML() {
    var zones = [
      { key: "study", label: "学习区", en: "Study", desc: "词汇 · 语法 · 系统精讲", href: "zone.html?zone=study" },
      { key: "practice", label: "练习区", en: "Practice", desc: "长难句 · 数字听写 · 精听 · 口语", href: "zone.html?zone=practice" },
      { key: "mock", label: "模考区", en: "Mock", desc: "剑桥雅思 · A-Level", href: "zone.html?zone=mock" }
    ];
    return '<section class="dash-section" aria-label="课程模块">' +
      '<div class="dash-section__head"><h2>课程模块</h2><p>选择区域开始学习</p></div>' +
      '<div class="dash-modules">' +
      zones.map(function (z) {
        return '<a class="dash-module pressable" href="' + z.href + '" data-zone="' + z.key + '">' +
          '<span class="dash-module__en">' + esc(z.en) + "</span>" +
          "<b>" + esc(z.label) + "</b>" +
          "<span>" + esc(z.desc) + "</span>" +
          '<span class="dash-module__go">进入 ›</span></a>';
      }).join("") +
      "</div></section>";
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
        '<a class="btn btn--ghost btn--sm" href="calendar.html">打开任务日历</a>';
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
          '<a class="btn btn--primary btn--sm" href="calendar.html">查看</a></li>';
      }).join("") + "</ul>" +
        '<a class="dash-more" href="calendar.html">全部任务 →</a>';
    }

    return '<section class="dash-section" aria-label="待办">' +
      '<div class="dash-section__head"><h2>待办</h2><p>本周作业与截止</p></div>' +
      body + "</section>";
  }

  function continueHTML(items) {
    var acts = Y.recentActivity(items, 4);
    var body;
    if (!acts.length) {
      body = '<p class="dash-empty">还没有学习记录。从上方课程模块开始吧。</p>';
    } else {
      body = '<ul class="dash-continue">' + acts.map(function (a) {
        return '<li><a href="' + Y.fileHref(a.item, "") + '">' +
          "<b>" + esc(Y.displayTitle(a.item)) + "</b>" +
          '<span>' + esc((Y.ZONE[a.item.zone] || {}).label || "") + " · 继续 ›</span></a></li>";
      }).join("") + "</ul>";
    }
    return '<section class="dash-section" aria-label="继续学习">' +
      '<div class="dash-section__head"><h2>继续学习</h2><p>从上次停下的地方接着</p></div>' +
      body + "</section>";
  }

  function scoresHTML(items) {
    var c = Y.journeyStats(items);
    return '<section class="dash-section" aria-label="成绩摘要">' +
      '<div class="dash-section__head"><h2>成绩摘要</h2><p>本浏览器与已同步的云端记录</p></div>' +
      '<div class="dash-metrics">' +
        '<div class="dash-metric"><b>' + c.total + "</b><span>已完成</span></div>" +
        '<div class="dash-metric"><b>' + c.study + "</b><span>学习</span></div>" +
        '<div class="dash-metric"><b>' + c.practice + "</b><span>练习</span></div>" +
        '<div class="dash-metric"><b>' + c.mock + "</b><span>模考</span></div>" +
      "</div>" +
      '<a class="dash-more" href="results.html">查看全部成绩 →</a></section>';
  }

  function announceHTML(events) {
    var notes = (events || []).filter(function (ev) {
      return ev.eventType === "ANNOUNCEMENT";
    }).slice(0, 4);
    var body;
    if (!notes.length) {
      body = '<p class="dash-empty">暂无公告。</p>';
    } else {
      body = '<ul class="dash-announce">' + notes.map(function (ev) {
        return "<li><b>" + esc(ev.title) + "</b>" +
          (ev.description ? "<p>" + esc(ev.description) + "</p>" : "") +
          "</li>";
      }).join("") + "</ul>";
    }
    return '<section class="dash-section" aria-label="课程公告">' +
      '<div class="dash-section__head"><h2>课程公告</h2><p>老师发布的提醒</p></div>' +
      body + "</section>";
  }

  function fail(msg) {
    root.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + esc(msg) + "</p></div>";
  }

  Promise.all([
    Y.load(),
    A.api("/api/student/calendar").catch(function () { return { events: [] }; })
  ]).then(function (res) {
    var items = res[0] || [];
    var events = (res[1] && res[1].events) || [];
    root.innerHTML =
      zonesHTML() +
      todosHTML(events) +
      '<div class="dash-grid-2">' +
        continueHTML(items) +
        scoresHTML(items) +
      "</div>" +
      announceHTML(events);
  }).catch(function (e) {
    fail(e.message || "请刷新重试");
  });
})();
