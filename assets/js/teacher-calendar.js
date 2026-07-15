/* =========================================================================
   teacher-calendar.js — 教师端任务发布台
   ========================================================================= */
(function () {
  "use strict";

  var T = window.YYSD_TEACHER;
  var Y = window.YYSD;
  var view = "list";
  var events = [];
  var students = [];
  var catalog = [];
  var monthCursor = new Date();
  monthCursor.setDate(1);
  monthCursor.setHours(0, 0, 0, 0);
  var selectedStudents = {};
  var selectedExercises = {};
  var detailEventId = null;

  var viewEl = document.getElementById("cal-view");
  var statsEl = document.getElementById("cal-stats");
  var createModal = document.getElementById("create-modal");
  var detailModal = document.getElementById("detail-modal");
  var createMsg = document.getElementById("create-msg");

  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("logout-btn").addEventListener("click", function () { T.logout(); });

  var TYPE_LABEL = {
    ASSIGNMENT: "练习作业",
    LESSON: "课程日程",
    ANNOUNCEMENT: "提醒事项"
  };

  function esc(s) { return Y.esc(s); }

  function showMsg(text, ok) {
    createMsg.textContent = text || "";
    createMsg.className = "auth-msg" + (ok ? " auth-msg--ok" : text ? " auth-msg--err" : "");
  }

  function fromLocalInput(v) {
    if (!v) return null;
    var d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("zh-CN", { hour12: false, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return iso; }
  }

  function openCreate() {
    showMsg("");
    document.getElementById("create-form").reset();
    selectedStudents = {};
    selectedExercises = {};
    var hint = document.getElementById("html-file-hint");
    if (hint) hint.textContent = "上传后优先生效；学生将在站内打开做题。也可下方勾选网站现有练习。";
    document.getElementById("f-type").value = "ASSIGNMENT";
    syncTypeUi();
    renderStudentList();
    renderExerciseList();
    createModal.hidden = false;
  }

  function closeCreate() { createModal.hidden = true; }
  function closeDetail() { detailModal.hidden = true; detailEventId = null; }

  function syncTypeUi() {
    var type = document.getElementById("f-type").value;
    var ex = document.getElementById("exercise-fieldset");
    var dueWrap = document.getElementById("f-due-wrap");
    ex.hidden = type !== "ASSIGNMENT";
    dueWrap.hidden = type === "LESSON";
    document.getElementById("f-start-label").textContent =
      type === "LESSON" ? "上课时间" : "开始时间（可选）";
  }

  function studentLabel(s) {
    return s.displayName ? s.displayName + "（" + s.phone + "）" : s.phone;
  }

  function renderStudentList() {
    var q = (document.getElementById("student-q").value || "").trim().toLowerCase();
    var html = students.filter(function (s) {
      if (!q) return true;
      return studentLabel(s).toLowerCase().indexOf(q) >= 0;
    }).map(function (s) {
      var checked = selectedStudents[s.id] ? " checked" : "";
      return '<label class="cal-check">' +
        '<input type="checkbox" data-student="' + s.id + '"' + checked + ">" +
        '<span>' + esc(studentLabel(s)) + "</span></label>";
    }).join("");
    document.getElementById("student-list").innerHTML = html || '<p class="profile-hint">暂无学生</p>';
    document.getElementById("student-picked").textContent =
      "已选 " + Object.keys(selectedStudents).length + " 人";
  }

  function renderExerciseList() {
    var q = (document.getElementById("exercise-q").value || "").trim().toLowerCase();
    var zone = document.getElementById("exercise-zone").value;
    var items = catalog.filter(function (it) {
      if (zone && it.zone !== zone) return false;
      if (!q) return true;
      var hay = (Y.displayTitle(it) + " " + it.title + " " + it.id + " " + (it.subject || "")).toLowerCase();
      return hay.indexOf(q) >= 0;
    }).slice(0, 80);
    var html = items.map(function (it) {
      var checked = selectedExercises[it.id] ? " checked" : "";
      var zoneLbl = (Y.ZONE[it.zone] || {}).label || it.zone;
      return '<label class="cal-check">' +
        '<input type="checkbox" data-exercise="' + esc(it.id) + '"' + checked + ">" +
        "<span><b>" + esc(Y.displayTitle(it)) + "</b><small>" + esc(zoneLbl) + "</small></span></label>";
    }).join("");
    document.getElementById("exercise-list").innerHTML =
      html || '<p class="profile-hint">没有匹配的练习</p>';
    document.getElementById("exercise-picked").textContent =
      "已选 " + Object.keys(selectedExercises).length + " 份练习";
  }

  function renderStats() {
    var total = events.length;
    var a = 0, l = 0, n = 0, overdue = 0;
    events.forEach(function (ev) {
      if (ev.eventType === "ASSIGNMENT") a++;
      else if (ev.eventType === "LESSON") l++;
      else n++;
      if (ev.statusSummary && ev.statusSummary.overdue) overdue += ev.statusSummary.overdue;
    });
    statsEl.innerHTML =
      '<div class="teacher-stat"><b>' + total + "</b><span>全部任务</span></div>" +
      '<div class="teacher-stat"><b>' + a + "</b><span>练习作业</span></div>" +
      '<div class="teacher-stat"><b>' + l + "</b><span>课程日程</span></div>" +
      '<div class="teacher-stat"><b>' + overdue + "</b><span>逾期人次</span></div>";
  }

  var STATUS_LABEL = {
    PENDING: "未完成",
    COMPLETED: "已完成",
    OVERDUE: "已逾期"
  };

  function statusClass(st) {
    if (st === "COMPLETED") return "cal-status--done";
    if (st === "OVERDUE") return "cal-status--overdue";
    return "cal-status--pending";
  }

  function progressBar(done, total) {
    if (!total) return '<span class="cal-progress__txt">无关联练习</span>';
    var pct = Math.round((done / total) * 100);
    return '<div class="cal-progress" title="' + done + "/" + total + '">' +
      '<div class="cal-progress__track"><span class="cal-progress__fill" style="width:' + pct + '%"></span></div>' +
      '<span class="cal-progress__txt">' + done + "/" + total + " 练习</span></div>";
  }

  function typeClass(t) {
    if (t === "ASSIGNMENT") return "cal-tag--assignment";
    if (t === "LESSON") return "cal-tag--lesson";
    return "cal-tag--announce";
  }

  function renderList() {
    if (!events.length) {
      viewEl.innerHTML = '<div class="state state--brand teacher-empty"><h3>还没有任务</h3><p>点击「新建任务」布置练习或课程日程。</p></div>';
      return;
    }
    var rows = events.map(function (ev) {
      var sum = ev.statusSummary || {};
      var done = sum.completed || 0;
      var total = sum.total || 0;
      return '<article class="cal-todo-row" data-id="' + ev.id + '">' +
        '<div class="cal-todo-row__main">' +
          '<div class="cal-todo-row__tags">' +
            '<span class="cal-tag ' + typeClass(ev.eventType) + '">' + esc(TYPE_LABEL[ev.eventType] || ev.eventType) + "</span>" +
          "</div>" +
          "<h3>" + esc(ev.title) + "</h3>" +
          '<p class="cal-card__meta">' +
            (ev.dueTime ? "截止 " + esc(fmtDate(ev.dueTime)) : "") +
            (ev.startTime ? (ev.dueTime ? " · " : "") + "开始 " + esc(fmtDate(ev.startTime)) : "") +
            " · 学生完成 " + done + "/" + total +
            (sum.overdue ? " · 逾期 " + sum.overdue : "") +
          "</p>" +
        "</div>" +
        '<div class="cal-todo-row__act">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-detail="' + ev.id + '">查看完成情况</button>' +
        "</div>" +
      "</article>";
    }).join("");
    viewEl.innerHTML = '<div class="cal-todo-list">' + rows + "</div>";
  }

  function dayKeyOf(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function renderMonth() {
    var y = monthCursor.getFullYear();
    var m = monthCursor.getMonth();
    var firstDow = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var cells = [];
    var i;
    for (i = 0; i < firstDow; i++) cells.push('<div class="cal-month__cell is-empty"></div>');
    for (i = 1; i <= daysInMonth; i++) {
      var dayKey = y + "-" + (m + 1 < 10 ? "0" : "") + (m + 1) + "-" + (i < 10 ? "0" : "") + i;
      var dayEvents = events.filter(function (ev) {
        return dayKeyOf(ev.dueTime) === dayKey || dayKeyOf(ev.startTime) === dayKey;
      });
      var chips = dayEvents.slice(0, 3).map(function (ev) {
        return '<button type="button" class="cal-month__chip ' + typeClass(ev.eventType) +
          '" data-detail="' + ev.id + '">' + esc(ev.title) + "</button>";
      }).join("");
      if (dayEvents.length > 3) {
        chips += '<span class="cal-month__more">+' + (dayEvents.length - 3) + "</span>";
      }
      cells.push(
        '<div class="cal-month__cell">' +
          '<div class="cal-month__day">' + i + "</div>" +
          '<div class="cal-month__chips">' + chips + "</div>" +
        "</div>"
      );
    }
    viewEl.innerHTML =
      '<div class="cal-month">' +
        '<div class="cal-month__nav">' +
          '<button type="button" class="btn btn--ghost btn--sm" id="month-prev">‹</button>' +
          "<strong>" + y + " 年 " + (m + 1) + " 月</strong>" +
          '<button type="button" class="btn btn--ghost btn--sm" id="month-next">›</button>' +
        "</div>" +
        '<div class="cal-month__weekdays">' +
          "<span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>" +
        "</div>" +
        '<div class="cal-month__grid">' + cells.join("") + "</div>" +
      "</div>";
  }

  function render() {
    renderStats();
    if (view === "month") renderMonth();
    else renderList();
  }

  function openDetail(id) {
    detailEventId = id;
    document.getElementById("detail-body").innerHTML =
      '<div class="state state--brand"><div class="spinner spinner--brand"></div></div>';
    detailModal.hidden = false;
    T.api("/api/calendar/events/" + id).then(function (d) {
      var ev = d.event || {};
      document.getElementById("detail-modal-title").textContent = ev.title || "任务详情";
      var studentsHtml = (ev.students || []).map(function (s) {
        var st = s.status || "PENDING";
        var prog = (s.exerciseTotal
          ? (s.exerciseDone || 0) + "/" + s.exerciseTotal + " 练习已完成"
          : "—");
        return "<tr class=\"" + statusClass(st) + "\">" +
          "<td><b>" + esc(s.displayName || s.phone) + "</b>" +
            (s.displayName ? "<small class=\"cal-phone\">" + esc(s.phone) + "</small>" : "") +
          "</td>" +
          '<td><span class="cal-status-pill ' + statusClass(st) + '">' +
            esc(STATUS_LABEL[st] || st) + "</span></td>" +
          "<td>" + esc(prog) + "</td>" +
          "<td>" + esc(fmtDate(s.completedAt)) + "</td></tr>";
      }).join("");
      var exHtml = (ev.linkedExerciseIds || []).map(function (xid) {
        if (String(xid).indexOf("upload-") === 0) {
          return "<li>上传练习：" + esc(ev.attachmentName || xid) + "</li>";
        }
        var it = catalog.filter(function (c) { return c.id === xid; })[0];
        return "<li>" + esc(it ? Y.displayTitle(it) : xid) + "</li>";
      }).join("");
      var doneN = (ev.students || []).filter(function (s) { return s.status === "COMPLETED"; }).length;
      var totalN = (ev.students || []).length;
      document.getElementById("detail-body").innerHTML =
        '<p><span class="cal-tag ' + typeClass(ev.eventType) + '">' +
          esc(TYPE_LABEL[ev.eventType] || ev.eventType) + "</span></p>" +
        "<p>" + esc(ev.description || "无额外说明") + "</p>" +
        "<p class=\"cal-card__meta\">开始：" + esc(fmtDate(ev.startTime)) +
          " · 截止：" + esc(fmtDate(ev.dueTime)) + "</p>" +
        (ev.attachmentName
          ? "<p class=\"profile-hint\">附件：" + esc(ev.attachmentName) + "</p>"
          : "") +
        (exHtml ? "<h3>关联练习</h3><ul>" + exHtml + "</ul>" +
          "<p class=\"profile-hint\">学生须完成以上全部练习后，任务才会自动变为「已完成」。</p>" : "") +
        "<h3>学生完成情况 <span class=\"cal-detail__count\">" + doneN + "/" + totalN + " 人已完成</span></h3>" +
        '<table class="teacher-table cal-status-table"><thead><tr>' +
          "<th>学生</th><th>状态</th><th>练习进度</th><th>完成时间</th></tr></thead>" +
        "<tbody>" + (studentsHtml || '<tr><td colspan="4" class="teacher-empty-row">暂无</td></tr>') +
        "</tbody></table>";
    }).catch(function (e) {
      document.getElementById("detail-body").innerHTML = "<p class=\"auth-msg auth-msg--err\">" + esc(e.message) + "</p>";
    });
  }

  function load() {
    viewEl.innerHTML = '<div class="state state--brand"><div class="spinner spinner--brand"></div></div>';
    Promise.all([
      T.api("/api/calendar/events"),
      T.api("/api/teacher/students"),
      Y.load()
    ]).then(function (res) {
      events = res[0].events || [];
      students = (res[1].students || []).map(function (s) {
        return { id: s.id, phone: s.phone, displayName: s.displayName || "" };
      });
      catalog = res[2] || [];
      render();
    }).catch(function (e) {
      if (String(e.message).indexOf("登录") >= 0 || String(e.message).indexOf("教师") >= 0) {
        T.logout();
        return;
      }
      viewEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + esc(e.message) + "</p></div>";
    });
  }

  document.querySelectorAll("[data-view]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      view = btn.getAttribute("data-view") || "list";
      document.querySelectorAll("[data-view]").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      render();
    });
  });

  document.getElementById("refresh-btn").addEventListener("click", load);
  document.getElementById("create-btn").addEventListener("click", openCreate);
  document.getElementById("f-type").addEventListener("change", syncTypeUi);

  createModal.addEventListener("click", function (e) {
    if (e.target.getAttribute("data-close")) closeCreate();
  });
  detailModal.addEventListener("click", function (e) {
    if (e.target.getAttribute("data-close-detail")) closeDetail();
  });

  document.getElementById("student-q").addEventListener("input", renderStudentList);
  document.getElementById("exercise-q").addEventListener("input", renderExerciseList);
  document.getElementById("exercise-zone").addEventListener("change", renderExerciseList);

  document.getElementById("select-all-students").addEventListener("click", function () {
    students.forEach(function (s) { selectedStudents[s.id] = true; });
    renderStudentList();
  });
  document.getElementById("clear-students").addEventListener("click", function () {
    selectedStudents = {};
    renderStudentList();
  });

  document.getElementById("student-list").addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute("data-student")) return;
    var id = Number(t.getAttribute("data-student"));
    if (t.checked) selectedStudents[id] = true;
    else delete selectedStudents[id];
    document.getElementById("student-picked").textContent =
      "已选 " + Object.keys(selectedStudents).length + " 人";
  });

  document.getElementById("exercise-list").addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute("data-exercise")) return;
    var id = t.getAttribute("data-exercise");
    if (t.checked) selectedExercises[id] = true;
    else delete selectedExercises[id];
    document.getElementById("exercise-picked").textContent =
      "已选 " + Object.keys(selectedExercises).length + " 份练习";
  });

  viewEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-detail]");
    if (btn) openDetail(Number(btn.getAttribute("data-detail")));
    if (e.target.id === "month-prev") {
      monthCursor.setMonth(monthCursor.getMonth() - 1);
      renderMonth();
    }
    if (e.target.id === "month-next") {
      monthCursor.setMonth(monthCursor.getMonth() + 1);
      renderMonth();
    }
  });

  document.getElementById("delete-event-btn").addEventListener("click", function () {
    if (!detailEventId) return;
    if (!confirm("确认删除该任务？学生端将同步消失。")) return;
    T.api("/api/calendar/events/" + detailEventId, { method: "DELETE" })
      .then(function () {
        closeDetail();
        load();
      })
      .catch(function (e) { alert(e.message); });
  });

  document.getElementById("create-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    showMsg("");
    var type = document.getElementById("f-type").value;
    var targetStudentIds = Object.keys(selectedStudents).map(Number);
    if (!targetStudentIds.length) {
      showMsg("请至少选择一名学生");
      return;
    }
    var fileInput = document.getElementById("f-html");
    var file = fileInput && fileInput.files && fileInput.files[0];
    if (file && type !== "ASSIGNMENT") {
      showMsg("只有练习作业可以上传 HTML");
      return;
    }
    if (file && !/\.html?$/i.test(file.name)) {
      showMsg("仅支持 .html 文件");
      return;
    }
    if (file && file.size > 2 * 1024 * 1024) {
      showMsg("HTML 不能超过 2MB");
      return;
    }

    function post(body) {
      showMsg("发布中…");
      return T.api("/api/calendar/events", { method: "POST", body: body })
        .then(function () {
          showMsg("已发布", true);
          closeCreate();
          load();
        })
        .catch(function (e) { showMsg(e.message); });
    }

    var body = {
      title: document.getElementById("f-title").value.trim(),
      description: document.getElementById("f-desc").value.trim(),
      eventType: type,
      startTime: fromLocalInput(document.getElementById("f-start").value),
      dueTime: fromLocalInput(document.getElementById("f-due").value),
      targetStudentIds: targetStudentIds,
      linkedExerciseIds: type === "ASSIGNMENT" && !file ? Object.keys(selectedExercises) : []
    };

    if (file) {
      var reader = new FileReader();
      reader.onload = function () {
        body.htmlContent = String(reader.result || "");
        body.htmlFileName = file.name;
        post(body);
      };
      reader.onerror = function () { showMsg("读取文件失败"); };
      reader.readAsText(file);
      return;
    }
    post(body);
  });

  var htmlInput = document.getElementById("f-html");
  if (htmlInput) {
    htmlInput.addEventListener("change", function () {
      var f = this.files && this.files[0];
      var hint = document.getElementById("html-file-hint");
      if (!hint) return;
      if (!f) {
        hint.textContent = "上传后优先生效；学生将在站内打开做题。也可下方勾选网站现有练习。";
        return;
      }
      hint.textContent = "已选择：" + f.name + "（" + Math.round(f.size / 1024) + " KB）· 将优先生效，下方勾选将被忽略";
    });
  }

  load();
})();
