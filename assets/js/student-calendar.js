/* =========================================================================
   student-calendar.js — 学生端任务日历
   ========================================================================= */
(function () {
  "use strict";

  var A = window.YYSD_AUTH;
  var Y = window.YYSD;
  var view = "month";
  var events = [];
  var catalogById = {};
  var catalogItems = [];
  var cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  var activeEvent = null;

  var viewEl = document.getElementById("stu-cal-view");
  var statsEl = document.getElementById("stu-cal-stats");
  var modal = document.getElementById("stu-detail-modal");
  var detailBody = document.getElementById("stu-detail-body");
  var detailActions = document.getElementById("stu-detail-actions");

  document.getElementById("year").textContent = new Date().getFullYear();

  if (!A.requireLogin()) return;
  if (A.isTeacher && A.isTeacher()) {
    document.getElementById("cal-desc").textContent =
      "教师账号请前往「教师端 → 任务日历」发布与管理任务。";
    viewEl.innerHTML =
      '<div class="state state--brand teacher-empty"><h3>教师请使用发布台</h3>' +
      '<p><a class="btn btn--primary btn--sm" href="teacher-calendar.html">打开任务发布台</a></p></div>';
    return;
  }

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

  function catalogTitle(xid, uploadName) {
    if (String(xid).indexOf("upload-") === 0) return uploadName || "老师上传的练习";
    var it = catalogById[xid] || (Y.resolveItem ? Y.resolveItem(catalogItems, xid) : null);
    return it ? Y.displayTitle(it) : xid;
  }

  function examHref(itemId, eventId) {
    return "exam.html?id=" + encodeURIComponent(itemId) +
      "&event=" + encodeURIComponent(eventId);
  }

  function typeClass(t) {
    if (t === "ASSIGNMENT") return "cal-tag--assignment";
    if (t === "LESSON") return "cal-tag--lesson";
    return "cal-tag--announce";
  }

  function statusClass(st) {
    if (st === "COMPLETED") return "cal-status--done";
    if (st === "OVERDUE") return "cal-status--overdue";
    return "cal-status--pending";
  }

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function dayKeyOf(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("zh-CN", {
        hour12: false, month: "numeric", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return iso; }
  }

  function eventDayKeys(ev) {
    var keys = {};
    var a = dayKeyOf(ev.startTime);
    var b = dayKeyOf(ev.dueTime);
    if (a) keys[a] = 1;
    if (b) keys[b] = 1;
    if (!a && !b && ev.createdAt) keys[dayKeyOf(ev.createdAt)] = 1;
    return keys;
  }

  function eventsOnDay(dayKey) {
    return events.filter(function (ev) { return eventDayKeys(ev)[dayKey]; });
  }

  function startOfWeek(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay());
    return x;
  }

  function renderStats() {
    var pending = 0, done = 0, overdue = 0;
    events.forEach(function (ev) {
      if (ev.status === "COMPLETED") done++;
      else if (ev.status === "OVERDUE") overdue++;
      else pending++;
    });
    statsEl.innerHTML =
      '<div class="teacher-stat"><b>' + events.length + "</b><span>全部任务</span></div>" +
      '<div class="teacher-stat"><b>' + pending + "</b><span>待完成</span></div>" +
      '<div class="teacher-stat"><b>' + done + "</b><span>已完成</span></div>" +
      '<div class="teacher-stat"><b>' + overdue + "</b><span>已逾期</span></div>";
  }

  function chipHtml(ev) {
    var cls = typeClass(ev.eventType);
    if (ev.status === "OVERDUE") cls += " is-overdue";
    if (ev.status === "COMPLETED") cls += " is-done";
    return '<button type="button" class="cal-month__chip ' + cls + '" data-open="' + ev.id + '">' +
      esc(ev.title) + "</button>";
  }

  function renderMonth() {
    var y = cursor.getFullYear();
    var m = cursor.getMonth();
    var todayKey = dayKeyOf(new Date().toISOString());
    var firstDow = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var cells = [];
    var i;
    for (i = 0; i < firstDow; i++) cells.push('<div class="cal-month__cell is-empty"></div>');
    for (i = 1; i <= daysInMonth; i++) {
      var dayKey = y + "-" + pad(m + 1) + "-" + pad(i);
      var dayEvents = eventsOnDay(dayKey);
      var chips = dayEvents.slice(0, 3).map(chipHtml).join("");
      if (dayEvents.length > 3) {
        chips += '<span class="cal-month__more">+' + (dayEvents.length - 3) + "</span>";
      }
      var cellCls = "cal-month__cell";
      if (dayKey === todayKey) cellCls += " is-today";
      if (dayEvents.length) cellCls += " has-events";
      cells.push(
        '<div class="' + cellCls + '" style="--cell-i:' + (i % 7) + '">' +
          '<div class="cal-month__day">' + i + "</div>" +
          '<div class="cal-month__chips">' + chips + "</div></div>"
      );
    }
    viewEl.innerHTML =
      '<div class="cal-month">' +
        '<div class="cal-month__nav">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-nav-dir="-1">‹</button>' +
          "<strong>" + y + " 年 " + (m + 1) + " 月</strong>" +
          '<button type="button" class="btn btn--ghost btn--sm" data-nav-dir="1">›</button>' +
        "</div>" +
        '<div class="cal-month__weekdays">' +
          "<span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>" +
        "</div>" +
        '<div class="cal-month__grid">' + cells.join("") + "</div></div>";
  }

  function renderWeek() {
    var start = startOfWeek(cursor);
    var todayKey = dayKeyOf(new Date().toISOString());
    var days = [];
    var i;
    for (i = 0; i < 7; i++) {
      var d = new Date(start);
      d.setDate(start.getDate() + i);
      var dayKey = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
      var dayEvents = eventsOnDay(dayKey);
      var dayCls = "cal-week__day" + (dayKey === todayKey ? " is-today" : "");
      days.push(
        '<div class="' + dayCls + '">' +
          '<div class="cal-week__head">' +
            "<b>" + (d.getMonth() + 1) + "/" + d.getDate() + "</b>" +
            "<span>" + "日一二三四五六".charAt(d.getDay()) + "</span>" +
          "</div>" +
          '<div class="cal-week__list">' +
            (dayEvents.length ? dayEvents.map(chipHtml).join("") : '<p class="profile-hint">无安排</p>') +
          "</div></div>"
      );
    }
    var end = new Date(start);
    end.setDate(start.getDate() + 6);
    viewEl.innerHTML =
      '<div class="cal-week">' +
        '<div class="cal-month__nav">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-nav-dir="-7">‹</button>' +
          "<strong>" + (start.getMonth() + 1) + "/" + start.getDate() +
            " – " + (end.getMonth() + 1) + "/" + end.getDate() + "</strong>" +
          '<button type="button" class="btn btn--ghost btn--sm" data-nav-dir="7">›</button>' +
        "</div>" +
        '<div class="cal-week__grid">' + days.join("") + "</div></div>";
  }

  function renderAgenda() {
    if (!events.length) {
      viewEl.innerHTML =
        '<div class="state state--brand teacher-empty"><h3>暂无任务</h3>' +
        "<p>老师布置作业或课程后，会出现在这里。</p></div>";
      return;
    }
    var sorted = events.slice().sort(function (a, b) {
      var oa = a.status === "OVERDUE" ? 0 : (a.status === "PENDING" ? 1 : 2);
      var ob = b.status === "OVERDUE" ? 0 : (b.status === "PENDING" ? 1 : 2);
      if (oa !== ob) return oa - ob;
      return String(a.dueTime || a.startTime || "").localeCompare(String(b.dueTime || b.startTime || ""));
    });
    var rows = sorted.map(function (ev) {
      var ids = ev.linkedExerciseIds || [];
      var doneN = ev.exerciseDone || 0;
      var totalN = ev.exerciseTotal != null ? ev.exerciseTotal : ids.length;
      var prog = totalN
        ? '<span class="cal-progress__txt">' + doneN + "/" + totalN + " 练习</span>"
        : "";
      var cta = ev.status === "COMPLETED"
        ? '<button type="button" class="btn btn--ghost btn--sm" data-open="' + ev.id + '">查看</button>'
        : (ids.length === 1
          ? '<a class="btn btn--primary btn--sm" href="' + examHref(ids[0], ev.id) + '">去做</a>'
          : '<button type="button" class="btn btn--primary btn--sm" data-open="' + ev.id + '">去做</button>');
      return '<article class="cal-todo-row ' + statusClass(ev.status) + '">' +
        '<div class="cal-todo-row__main">' +
          '<div class="cal-todo-row__tags">' +
            '<span class="cal-tag ' + typeClass(ev.eventType) + '">' + esc(TYPE_LABEL[ev.eventType] || "") + "</span>" +
            '<span class="cal-status-pill ' + statusClass(ev.status) + '">' +
              esc(STATUS_LABEL[ev.status] || ev.status) + "</span>" +
          "</div>" +
          "<h3>" + esc(ev.title) + "</h3>" +
          '<p class="cal-card__meta">' +
            (ev.dueTime ? "截止 " + esc(fmtDate(ev.dueTime)) : "") +
            (ev.startTime ? (ev.dueTime ? " · " : "") + "开始 " + esc(fmtDate(ev.startTime)) : "") +
            (prog ? " · " + prog : "") +
          "</p>" +
        "</div>" +
        '<div class="cal-todo-row__act">' + cta + "</div>" +
      "</article>";
    }).join("");
    viewEl.innerHTML = '<div class="cal-todo-list">' + rows + "</div>";
  }

  function render() {
    renderStats();
    if (view === "week") renderWeek();
    else if (view === "agenda") renderAgenda();
    else renderMonth();
  }

  function canManualComplete(ev) {
    if (!ev || ev.status === "COMPLETED") return false;
    if (ev.eventType === "ASSIGNMENT" && (ev.linkedExerciseIds || []).length) return false;
    return true;
  }

  function markCalSeen(id) {
    // ponytail: shared with dashboard.js 今日焦点「新」标记
    var key = "yysd:cal-seen-ids";
    var n = Number(id);
    if (!n) return;
    try {
      var s = JSON.parse(localStorage.getItem(key) || "[]");
      if (s.indexOf(n) >= 0) return;
      s.push(n);
      if (s.length > 200) s = s.slice(-200);
      localStorage.setItem(key, JSON.stringify(s));
    } catch (e) {}
  }

  function openDetail(id) {
    var ev = null;
    events.forEach(function (e) { if (e.id === id) ev = e; });
    if (!ev) return;
    markCalSeen(ev.id);
    activeEvent = ev;
    document.getElementById("stu-detail-title").textContent = ev.title;
    var doneSet = {};
    (ev.doneExerciseIds || []).forEach(function (xid) { doneSet[xid] = 1; });
    var exList = (ev.linkedExerciseIds || []).map(function (xid) {
      var title = catalogTitle(xid, ev.attachmentName);
      var done = !!doneSet[xid];
      var href = examHref(xid, ev.id);
      return '<li class="cal-ex-row' + (done ? " is-done" : "") + '">' +
        "<span><b>" + esc(title) + "</b>" +
          (done ? '<small class="cal-ex-done">已完成</small>' : "") +
        "</span>" +
        (done
          ? '<a class="btn btn--ghost btn--sm" href="' + href + '">再看一次</a>'
          : '<a class="btn btn--primary btn--sm" href="' + href + '">立即去做</a>') +
        "</li>";
    }).join("");

    var totalN = ev.exerciseTotal != null ? ev.exerciseTotal : (ev.linkedExerciseIds || []).length;
    var doneN = ev.exerciseDone || 0;
    detailBody.innerHTML =
      '<p><span class="cal-tag ' + typeClass(ev.eventType) + '">' +
        esc(TYPE_LABEL[ev.eventType] || "") + "</span> " +
        '<span class="cal-status-pill ' + statusClass(ev.status) + '">' +
        esc(STATUS_LABEL[ev.status] || ev.status) + "</span></p>" +
      "<p>" + esc(ev.description || "老师未填写额外说明。") + "</p>" +
      '<p class="cal-card__meta">开始：' + esc(fmtDate(ev.startTime)) +
        " · 截止：" + esc(fmtDate(ev.dueTime)) +
        (totalN ? " · 练习进度 " + doneN + "/" + totalN : "") + "</p>" +
      (exList
        ? "<h3>关联练习</h3><ul class=\"cal-ex-list\">" + exList + "</ul>" +
          (ev.status !== "COMPLETED" && totalN
            ? '<p class="profile-hint">完成全部 ' + totalN + " 份练习后，任务将自动标记为已完成。</p>"
            : "")
        : (ev.eventType === "ASSIGNMENT"
          ? "<p class=\"profile-hint\">未关联具体练习，可按说明完成并手动勾选。</p>"
          : ""));

    var acts = '<button type="button" class="btn btn--ghost" data-close="1">关闭</button>';
    if (canManualComplete(ev)) {
      acts += '<button type="button" class="btn btn--primary" id="mark-done-btn">标记完成</button>';
    } else if (ev.status === "COMPLETED") {
      acts += '<span class="profile-hint">已完成' +
        (ev.completedAt ? " · " + esc(fmtDate(ev.completedAt)) : "") + "</span>";
    } else if ((ev.linkedExerciseIds || []).length === 1) {
      acts += '<a class="btn btn--primary" href="' +
        examHref(ev.linkedExerciseIds[0], ev.id) + '">立即去做</a>';
    }
    detailActions.innerHTML = acts;
    modal.hidden = false;
  }

  function closeDetail() {
    modal.hidden = true;
    activeEvent = null;
  }

  function load() {
    viewEl.innerHTML = '<div class="state state--brand"><div class="spinner spinner--brand"></div></div>';
    Promise.all([
      A.api("/api/student/calendar"),
      Y.load()
    ]).then(function (res) {
      events = res[0].events || [];
      catalogById = {};
      catalogItems = res[1] || [];
      catalogItems.forEach(function (it) { catalogById[it.id] = it; });
      render();
      openFromHash();
    }).catch(function (e) {
      if (String(e.message).indexOf("登录") >= 0) {
        A.setToken("");
        location.href = "login.html?next=" + encodeURIComponent("dashboard.html");
        return;
      }
      viewEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + esc(e.message) + "</p></div>";
    });
  }

  function openFromHash() {
    var m = /^#event-(\d+)$/.exec(location.hash || "");
    if (m) openDetail(Number(m[1]));
  }

  document.querySelectorAll("[data-view]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      view = btn.getAttribute("data-view") || "month";
      document.querySelectorAll("[data-view]").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      render();
    });
  });

  document.getElementById("refresh-btn").addEventListener("click", load);

  viewEl.addEventListener("click", function (e) {
    var open = e.target.closest("[data-open]");
    if (open) openDetail(Number(open.getAttribute("data-open")));
    var navBtn = e.target.closest("[data-nav-dir]");
    if (navBtn) {
      var delta = Number(navBtn.getAttribute("data-nav-dir")) || 0;
      if (view === "week") cursor.setDate(cursor.getDate() + delta);
      else cursor.setMonth(cursor.getMonth() + delta);
      render();
    }
  });

  modal.addEventListener("click", function (e) {
    if (e.target.getAttribute("data-close")) closeDetail();
    if (e.target.id === "mark-done-btn" && activeEvent) {
      e.target.disabled = true;
      A.api("/api/student/calendar/" + activeEvent.id + "/status", {
        method: "PATCH",
        body: { status: "COMPLETED" }
      }).then(function () {
        closeDetail();
        load();
      }).catch(function (err) {
        e.target.disabled = false;
        alert(err.message);
      });
    }
  });

  window.addEventListener("hashchange", openFromHash);

  load();
})();
