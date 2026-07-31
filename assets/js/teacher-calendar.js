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
  var exerciseCat = "vocab";
  var detailEventId = null;

  var CAT_HINT = {
    vocab: "单词区词书单元，适合布置背单词作业。",
    listening: "剑桥听力整套 Test（含四个 Section）。",
    reading: "剑桥阅读整套 Test（含三个 Passage）。",
    writing: "剑桥写作整套 Test（Task 1 + Task 2）。",
    part: "只练某一个 Section / Passage，适合单项补弱。",
    suite: "一键勾选听力+阅读+写作三科，学生端按全套模考流程作答。"
  };

  function isVocabSubject(subject) {
    return /^vocab/.test(subject || "");
  }

  function suiteBaseId(id) {
    return String(id || "").replace(/-reading$/, "").replace(/-writing$/, "");
  }

  function suiteIdsOf(base) {
    return [base, base + "-reading", base + "-writing"];
  }

  function buildSuites() {
    var map = {};
    catalog.forEach(function (it) {
      if (it.partNum) return;
      var base = suiteBaseId(it.id);
      if (!/^cambridge-\d+-test-\d+$/.test(base)) return;
      if (!map[base]) map[base] = { base: base, listening: null, reading: null, writing: null };
      if (it.subject === "cambridge-listening") map[base].listening = it;
      else if (it.subject === "cambridge-reading") map[base].reading = it;
      else if (it.subject === "cambridge-writing") map[base].writing = it;
    });
    return Object.keys(map).sort(function (a, b) {
      return b.localeCompare(a, undefined, { numeric: true });
    }).map(function (k) { return map[k]; }).filter(function (s) {
      return s.listening && s.reading && s.writing;
    });
  }

  function itemInCat(it, cat) {
    if (!cat) return true;
    if (cat === "vocab") return isVocabSubject(it.subject);
    if (cat === "listening") {
      return it.subject === "cambridge-listening" && !it.partNum;
    }
    if (cat === "reading") {
      return it.subject === "cambridge-reading" && !it.partNum;
    }
    if (cat === "writing") {
      return it.subject === "cambridge-writing" && !it.partNum;
    }
    if (cat === "part") return !!it.partNum;
    if (cat === "suite") return false;
    return true;
  }

  function itemCatLabel(it) {
    if (it.partNum) {
      return it.partKind === "s" ? ("Section " + it.partNum) : ("Passage " + it.partNum);
    }
    if (isVocabSubject(it.subject)) return "单词";
    if (it.subject === "cambridge-listening") return "听力练习";
    if (it.subject === "cambridge-reading") return "阅读练习";
    if (it.subject === "cambridge-writing") return "写作练习";
    if (it.subject === "ielts") return "模考";
    return (Y.ZONE[it.zone] || {}).label || it.zone || "";
  }

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
    exerciseCat = "vocab";
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

  function syncExerciseCatUi() {
    document.querySelectorAll("#exercise-cats [data-ex-cat]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-ex-cat") === exerciseCat);
    });
    var hint = document.getElementById("exercise-cat-hint");
    if (hint) hint.textContent = CAT_HINT[exerciseCat] || "先点上方分类，再勾选要布置的内容。";
  }

  function renderExerciseList() {
    syncExerciseCatUi();
    var q = (document.getElementById("exercise-q").value || "").trim().toLowerCase();
    var html = "";

    if (exerciseCat === "suite") {
      var suites = buildSuites().filter(function (s) {
        if (!q) return true;
        var hay = (s.base + " " + Y.displayTitle(s.listening)).toLowerCase();
        return hay.indexOf(q) >= 0;
      }).slice(0, 80);
      html = suites.map(function (s) {
        var ids = suiteIdsOf(s.base);
        var allOn = ids.every(function (id) { return selectedExercises[id]; });
        var vol = Y.camVolume ? Y.camVolume(s.listening) : "";
        var testNo = Y.camTestNo ? Y.camTestNo(s.listening) : "";
        var title = (vol && testNo)
          ? ("剑桥雅思 " + vol + " · Test " + testNo + " 全套模考")
          : (Y.displayTitle(s.listening) + " · 全套");
        return '<label class="cal-check cal-suite-li">' +
          '<input type="checkbox" data-suite="' + esc(s.base) + '"' + (allOn ? " checked" : "") + ">" +
          "<span><b>" + esc(title) + "</b><small>听力 + 阅读 + 写作 · 机考流程</small></span></label>";
      }).join("");
    } else {
      var items = catalog.filter(function (it) {
        if (!itemInCat(it, exerciseCat)) return false;
        if (!q) return true;
        var hay = (Y.displayTitle(it) + " " + it.title + " " + it.id + " " +
          (it.subject || "") + " " + (Y.partSearchText ? Y.partSearchText(it) : "")).toLowerCase();
        return hay.indexOf(q) >= 0;
      }).slice(0, 120);
      html = items.map(function (it) {
        var checked = selectedExercises[it.id] ? " checked" : "";
        return '<label class="cal-check">' +
          '<input type="checkbox" data-exercise="' + esc(it.id) + '"' + checked + ">" +
          "<span><b>" + esc(Y.displayTitle(it)) + "</b><small>" + esc(itemCatLabel(it)) + "</small></span></label>";
      }).join("");
    }

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
        var it = catalog.filter(function (c) { return c.id === xid; })[0]
          || (Y.resolveItem ? Y.resolveItem(catalog, xid) : null);
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
      catalog = Y.expandAssignableParts ? Y.expandAssignableParts(res[2] || []) : (res[2] || []);
      render();
    }).catch(function (e) {
      // ponytail: stay put — same as teacher.js
      viewEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + esc(e.message) +
        '</p><p><a class="btn btn--ghost btn--sm" href="teacher-login.html">重新登录</a></p></div>';
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
  document.getElementById("exercise-cats").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-ex-cat]");
    if (!btn) return;
    exerciseCat = btn.getAttribute("data-ex-cat") || "vocab";
    renderExerciseList();
  });

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
    if (!t) return;
    var suite = t.getAttribute("data-suite");
    if (suite) {
      suiteIdsOf(suite).forEach(function (id) {
        if (t.checked) selectedExercises[id] = true;
        else delete selectedExercises[id];
      });
    } else if (t.getAttribute("data-exercise")) {
      var id = t.getAttribute("data-exercise");
      if (t.checked) selectedExercises[id] = true;
      else delete selectedExercises[id];
    } else {
      return;
    }
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
          showMsg("已发给 " + targetStudentIds.length + " 名学生 · 他们打开待办即可看到", true);
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
