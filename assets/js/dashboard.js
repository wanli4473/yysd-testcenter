/* =========================================================================
   dashboard.js — 待办事项（今日焦点 + 近期待办；日历由 student-calendar.js）
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var A = window.YYSD_AUTH;
  var root = document.getElementById("dash-root");
  var focusEl = document.getElementById("dash-focus");
  var hello = document.getElementById("dash-hello");
  var SEEN_KEY = "yysd:cal-seen-ids";

  document.getElementById("year").textContent = new Date().getFullYear();

  if (!A || !A.requireLogin || !A.requireLogin()) return;
  if (A.isTeacher && A.isTeacher()) {
    location.replace("teacher.html");
    return;
  }

  var user = A.getUser ? A.getUser() : {};
  var name = (user.displayName || "").trim();
  if (hello) hello.textContent = name ? (name + "，你好") : "任务中心";

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

  function readSeen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); }
    catch (e) { return []; }
  }

  function markSeen(id) {
    var n = Number(id);
    if (!n) return;
    var s = readSeen();
    if (s.indexOf(n) >= 0) return;
    s.push(n);
    if (s.length > 200) s = s.slice(-200);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function isNew(ev) {
    if (!ev || (ev.status !== "PENDING" && ev.status !== "OVERDUE")) return false;
    return readSeen().indexOf(Number(ev.id)) < 0;
  }

  function isDueToday(iso) {
    if (!iso) return false;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    var n = new Date();
    return d.getFullYear() === n.getFullYear() &&
      d.getMonth() === n.getMonth() &&
      d.getDate() === n.getDate();
  }

  // ponytail: 最新布置(未见) > 今日截止 > 逾期 > 其余未完成
  function pickFocus(events) {
    var open = (events || []).filter(function (ev) {
      return ev.status === "PENDING" || ev.status === "OVERDUE";
    });
    if (!open.length) return null;

    function byCreatedDesc(a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    }
    function byDueAsc(a, b) {
      return String(a.dueTime || a.startTime || "").localeCompare(String(b.dueTime || b.startTime || ""));
    }

    var fresh = open.filter(isNew).sort(byCreatedDesc);
    if (fresh.length) return { ev: fresh[0], reason: "new" };

    var today = open.filter(function (ev) { return isDueToday(ev.dueTime); }).sort(byDueAsc);
    if (today.length) return { ev: today[0], reason: "today" };

    var overdue = open.filter(function (ev) { return ev.status === "OVERDUE"; }).sort(byDueAsc);
    if (overdue.length) return { ev: overdue[0], reason: "overdue" };

    open.sort(byDueAsc);
    return { ev: open[0], reason: "pending" };
  }

  function focusCta(ev) {
    var ids = ev.linkedExerciseIds || [];
    if (ev.status !== "COMPLETED" && ids.length) {
      var listen = null;
      for (var i = 0; i < ids.length; i++) {
        if (/^cambridge-\d+-test-\d+$/.test(ids[i])) { listen = ids[i]; break; }
      }
      if (listen && ids.indexOf(listen + "-reading") >= 0 && ids.indexOf(listen + "-writing") >= 0) {
        return {
          href: "exam.html?id=" + encodeURIComponent(listen) +
            "&event=" + encodeURIComponent(ev.id) + "&cdt=1",
          label: "开始全套模考"
        };
      }
      if (ids.length === 1) {
        return {
          href: "exam.html?id=" + encodeURIComponent(ids[0]) +
            "&event=" + encodeURIComponent(ev.id),
          label: "开始这项"
        };
      }
    }
    return { href: "#event-" + ev.id, label: ev.status === "COMPLETED" ? "查看" : "查看详情" };
  }

  function reasonLabel(reason, ev) {
    if (reason === "new") return "老师刚布置";
    if (reason === "today") return "今日截止";
    if (reason === "overdue") return "已逾期";
    if (ev.dueTime) return "截止 " + fmtDate(ev.dueTime);
    return TYPE_LABEL[ev.eventType] || "待办";
  }

  function renderFocus(events) {
    if (!focusEl) return;
    var openN = (events || []).filter(function (ev) {
      return ev.status === "PENDING" || ev.status === "OVERDUE";
    }).length;
    var hit = pickFocus(events);

    if (!hit) {
      focusEl.hidden = false;
      focusEl.innerHTML =
        '<div class="dash-focus dash-focus--clear">' +
          '<div class="dash-focus__text">' +
            "<b>今日任务已清</b>" +
            "<span>去真题区加练，或等老师布置新任务</span>" +
          "</div>" +
          '<a class="btn btn--primary btn--sm" href="zone.html?zone=mock">去真题区</a>' +
        "</div>";
      return;
    }

    var ev = hit.ev;
    var cta = focusCta(ev);
    var neu = isNew(ev);
    focusEl.hidden = false;
    focusEl.innerHTML =
      '<div class="dash-focus' + (neu ? " is-new" : "") + '" data-focus-id="' + esc(String(ev.id)) + '">' +
        '<div class="dash-focus__text">' +
          '<p class="dash-focus__eyebrow">' +
            (neu ? '<span class="dash-focus__dot" aria-hidden="true"></span>' : "") +
            esc(reasonLabel(hit.reason, ev)) +
            (openN > 1 ? " · 另有 " + (openN - 1) + " 项" : "") +
          "</p>" +
          "<b>" + esc(ev.title) + "</b>" +
          '<span>' +
            (ev.dueTime ? "截止 " + esc(fmtDate(ev.dueTime)) : (ev.startTime ? "开始 " + esc(fmtDate(ev.startTime)) : "")) +
          "</span>" +
        "</div>" +
        '<div class="dash-focus__acts">' +
          '<a class="btn btn--primary btn--sm" href="' + esc(cta.href) + '" data-focus-cta="1">' +
            esc(cta.label) + "</a>" +
          '<a class="btn btn--ghost btn--sm" href="#dash-calendar">全部任务</a>' +
        "</div>" +
      "</div>";

    focusEl.onclick = function (e) {
      var a = e.target.closest("[data-focus-cta], a[href^='#event-']");
      if (!a) return;
      markSeen(ev.id);
    };
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
            (isNew(ev) ? ' <span class="dash-todo__new">新</span>' : "") +
            "<b>" + esc(ev.title) + "</b>" +
            '<span class="dash-todo__meta">' +
              (ev.dueTime ? "截止 " + esc(fmtDate(ev.dueTime)) : (ev.startTime ? "开始 " + esc(fmtDate(ev.startTime)) : "")) +
            "</span></div>" +
          '<a class="btn btn--primary btn--sm" href="#event-' + esc(String(ev.id)) + '">查看</a></li>';
      }).join("") + "</ul>" +
        '<a class="dash-more" href="#dash-calendar">全部任务 →</a>';
    }

    return '<div class="dash-section__head"><h2 class="bento-panel__title">近期待办</h2><p class="bento-panel__desc">本周作业与截止</p></div>' + body;
  }

  function fail(msg) {
    root.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + esc(msg) + "</p></div>";
    if (focusEl) focusEl.hidden = true;
  }

  A.api("/api/student/calendar").then(function (res) {
    var events = (res && res.events) || [];
    renderFocus(events);
    root.innerHTML = todosHTML(events);
  }).catch(function (e) {
    fail(e.message || "请刷新重试");
  });
})();
