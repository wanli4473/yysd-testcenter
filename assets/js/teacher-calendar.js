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
  var taxonomy = { types: [], scenes: [], diffs: ["易", "中", "难"], groups: [], parts: [] };
  var shelfBooks = []; // /api/vocab-shelf/catalog — same books as student 词库
  var monthCursor = new Date();
  monthCursor.setDate(1);
  monthCursor.setHours(0, 0, 0, 0);
  var selectedStudents = {};
  var selectedExercises = {};
  var exerciseCat = "vocab";
  var exerciseSkill = "listening";
  var pickVol = "";
  var pickTest = "";
  var pickVocabGroup = "core"; // core | theme
  var pickVocabBook = "";
  var pickVocabRange = "";
  var pickQType = "";
  var pickScene = "";
  var pickDiff = "";
  var detailEventId = null;

  var CAT_HINT = {
    vocab: "单词检测：可跨词书勾选多个 List；学生逐个 List 闯关，全部通过才算完成。",
    part: "补弱：先选册与 Test，再勾 Section / Passage（练习规则，可续做）。",
    qtype: "题型练习：选题型与册，再勾题组（只出该组题，音频仍是整段 Part）。",
    scene: "场景练习：选场景与册，再勾 Part（整段练习规则）。",
    skill: "单项模考：先选册与 Test，再勾单科整卷（机考模考规则）。",
    suite: "全套模考：先选册，再勾某套 Test 的听力+阅读+写作。"
  };

  function cdtPackForCat(cat) {
    if (cat === "part" || cat === "qtype" || cat === "scene") return "drill";
    if (cat === "skill" || cat === "suite") return "exam";
    if (cat === "vocab") return "vocab-quiz";
    return "";
  }

  // ponytail: bookId||listId so theme books don't collide on list "1"
  function vocabRef(bookId, listId) {
    return String(bookId || "") + "||" + String(listId || "");
  }

  function parseVocabRef(raw) {
    var s = String(raw || "");
    var i = s.indexOf("||");
    if (i <= 0) return null;
    var bookId = s.slice(0, i);
    var listId = s.slice(i + 2);
    if (!bookId || !listId) return null;
    return { bookId: bookId, listId: listId };
  }

  function shelfBookById(id) {
    for (var i = 0; i < shelfBooks.length; i++) {
      if (shelfBooks[i].id === id) return shelfBooks[i];
    }
    return null;
  }

  function vocabAssignLabel(xid) {
    var p = parseVocabRef(xid);
    if (!p) return "";
    var book = shelfBookById(p.bookId);
    var listLabel = p.listId;
    if (book && book.lists) {
      for (var i = 0; i < book.lists.length; i++) {
        if (String(book.lists[i].id) === String(p.listId)) {
          listLabel = book.lists[i].label || listLabel;
          break;
        }
      }
      return (book.label || p.bookId) + " · " + listLabel;
    }
    return p.bookId + " · " + p.listId;
  }

  function isCambridgeBrowse() {
    return exerciseCat === "part" || exerciseCat === "skill" || exerciseCat === "suite"
      || exerciseCat === "qtype" || exerciseCat === "scene";
  }

  function isTaxonomyBrowse() {
    return exerciseCat === "qtype" || exerciseCat === "scene";
  }

  function isVocabBrowse() {
    return exerciseCat === "vocab";
  }

  function isBrowseMode() {
    return isCambridgeBrowse() || isVocabBrowse();
  }

  function isVocabSubject(subject) {
    return /^vocab/.test(subject || "");
  }

  function vocabBooksInGroup() {
    return shelfBooks.filter(function (b) {
      if (pickVocabGroup === "theme") return b.kind === "theme";
      return b.kind !== "theme";
    });
  }

  function vocabListsForBook(bookId) {
    var b = shelfBookById(bookId);
    return (b && b.lists) || [];
  }

  function vocabRangesForBook(bookId) {
    var lists = vocabListsForBook(bookId);
    var chunk = 10;
    if (!lists.length) return [{ id: "all", label: "全部", startIdx: 0, endIdx: -1 }];
    var ranges = [];
    for (var i = 0; i < lists.length; i += chunk) {
      var slice = lists.slice(i, i + chunk);
      var a = slice[0];
      var z = slice[slice.length - 1];
      var start = a.listNo != null ? a.listNo : i + 1;
      var end = z.listNo != null ? z.listNo : i + slice.length;
      ranges.push({
        id: "r" + i,
        label: "List " + start + (start === end ? "" : ("–" + end)),
        startIdx: i,
        endIdx: i + slice.length - 1
      });
    }
    return ranges;
  }

  function ensureVocabBrowseDefaults() {
    if (pickVocabGroup !== "theme") pickVocabGroup = "core";
    var books = vocabBooksInGroup();
    var ids = books.map(function (b) { return b.id; });
    if (!pickVocabBook || ids.indexOf(pickVocabBook) < 0) {
      pickVocabBook = ids[0] || "";
    }
    var ranges = pickVocabBook ? vocabRangesForBook(pickVocabBook) : [];
    var rids = ranges.map(function (r) { return r.id; });
    if (!pickVocabRange || rids.indexOf(pickVocabRange) < 0) {
      pickVocabRange = rids[0] || "";
    }
  }

  function listsInVocabRange(bookId) {
    var lists = vocabListsForBook(bookId);
    var ranges = vocabRangesForBook(bookId);
    var range = null;
    for (var i = 0; i < ranges.length; i++) {
      if (ranges[i].id === pickVocabRange) { range = ranges[i]; break; }
    }
    if (!range || range.endIdx < 0) return lists;
    return lists.slice(range.startIdx, range.endIdx + 1);
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
    if (cat === "part") {
      if (!it.partNum) return false;
      if (exerciseSkill === "listening") return it.subject === "cambridge-listening";
      if (exerciseSkill === "reading") return it.subject === "cambridge-reading";
      return it.subject === "cambridge-listening" || it.subject === "cambridge-reading";
    }
    if (cat === "skill") {
      if (it.partNum) return false;
      if (exerciseSkill === "listening") return it.subject === "cambridge-listening";
      if (exerciseSkill === "reading") return it.subject === "cambridge-reading";
      if (exerciseSkill === "writing") return it.subject === "cambridge-writing";
      return it.subject === "cambridge-listening" ||
        it.subject === "cambridge-reading" ||
        it.subject === "cambridge-writing";
    }
    if (cat === "suite") return false;
    return true;
  }

  function itemCatLabel(it) {
    if (it.partNum) {
      return it.partKind === "s" ? ("Section " + it.partNum) : ("Passage " + it.partNum);
    }
    if (isVocabSubject(it.subject)) {
      if (Y.vocabBookOfSubject) {
        var bk = Y.vocabBookOfSubject(it.subject);
        if (bk === "gaozhong") return "高中词汇";
        if (bk === "cet4") return "四级词汇";
        if (bk === "special") return "雅思专项词汇";
      }
      return "单词";
    }
    if (it.subject === "cambridge-listening") return "听力整卷";
    if (it.subject === "cambridge-reading") return "阅读整卷";
    if (it.subject === "cambridge-writing") return "写作整卷";
    if (it.subject === "ielts") return "模考";
    return (Y.ZONE[it.zone] || {}).label || it.zone || "";
  }

  function cambridgeVolumes() {
    var seen = {};
    var out = [];
    catalog.forEach(function (it) {
      if (!Y.isCambridge || !Y.isCambridge(it.subject)) return;
      if (it.partNum) return;
      var v = Y.camVolume ? String(Y.camVolume(it) || "") : "";
      if (!v || seen[v]) return;
      seen[v] = 1;
      out.push(v);
    });
    return out.sort(function (a, b) {
      return Number(b) - Number(a);
    });
  }

  function testsForVolume(vol) {
    var seen = {};
    var out = [];
    catalog.forEach(function (it) {
      if (!Y.isCambridge || !Y.isCambridge(it.subject)) return;
      if (it.partNum) return;
      if (vol && String(Y.camVolume(it) || "") !== String(vol)) return;
      var t = String(Y.camTestNo(it) || "");
      if (!t || seen[t]) return;
      seen[t] = 1;
      out.push(t);
    });
    return out.sort(function (a, b) { return Number(a) - Number(b); });
  }

  function taxRows() {
    return exerciseCat === "scene" ? (taxonomy.parts || []) : (taxonomy.groups || []);
  }

  function taxonomyVolumes() {
    var seen = {};
    var out = [];
    taxRows().forEach(function (row) {
      var v = String(row.volume || "");
      if (!v || seen[v]) return;
      seen[v] = 1;
      out.push(v);
    });
    return out.sort(function (a, b) { return Number(b) - Number(a); });
  }

  function taxonomyTests(vol) {
    var seen = {};
    var out = [];
    (taxonomy.groups || []).forEach(function (g) {
      if (vol && String(g.volume) !== String(vol)) return;
      if (pickQType && g.qType !== pickQType) return;
      if (pickDiff && g.diff !== pickDiff) return;
      var t = String(g.test || "");
      if (!t || seen[t]) return;
      seen[t] = 1;
      out.push(t);
    });
    return out.sort(function (a, b) { return Number(a) - Number(b); });
  }

  function groupLabel(g) {
    var bits = ["剑" + g.volume, "Test " + g.test, "Part " + g.part, "Q" + g.qFrom + "-" + g.qTo];
    var extra = [g.qType, g.scene, g.diff].filter(Boolean);
    return bits.join(" ") + (extra.length ? " · " + extra.join(" · ") : "");
  }

  function partSceneLabel(p) {
    return "剑" + p.volume + " Test " + p.test + " Part " + p.part + (p.scene ? (" · " + p.scene) : "");
  }

  function ensureBrowseDefaults() {
    if (!isCambridgeBrowse()) return;
    if (isTaxonomyBrowse()) {
      var tvols = taxonomyVolumes();
      if (pickVol && tvols.indexOf(pickVol) < 0) pickVol = tvols[0] || "";
      if (exerciseCat === "qtype") {
        var types = taxonomy.types || [];
        if (!pickQType || types.indexOf(pickQType) < 0) pickQType = types[0] || "";
        var tests = taxonomyTests(pickVol);
        if (!pickTest || tests.indexOf(pickTest) < 0) pickTest = tests[0] || "";
      } else {
        var scenes = taxonomy.scenes || [];
        if (!pickScene || scenes.indexOf(pickScene) < 0) pickScene = scenes[0] || "";
      }
      return;
    }
    var vols = cambridgeVolumes();
    if (pickVol && vols.indexOf(pickVol) < 0) pickVol = vols[0] || "";
    var tests = testsForVolume(pickVol);
    if (!pickTest || tests.indexOf(pickTest) < 0) pickTest = tests[0] || "";
    if (exerciseCat === "part") {
      if (exerciseSkill !== "listening" && exerciseSkill !== "reading") exerciseSkill = "listening";
    } else if (exerciseCat === "skill") {
      if (["listening", "reading", "writing", "all"].indexOf(exerciseSkill) < 0) {
        exerciseSkill = "listening";
      }
    }
  }

  function matchVolTest(it) {
    if (!pickTest) return false;
    if (pickVol && String(Y.camVolume(it) || "") !== String(pickVol)) return false;
    return String(Y.camTestNo(it) || "") === String(pickTest);
  }

  function renderChipRow(host, items, attr, active, prefix) {
    if (!host) return;
    host.innerHTML = items.map(function (v) {
      var on = String(v) === String(active);
      var label = v ? ((prefix || "") + v) : (attr === "ex-vol" ? "全部册" : "全部");
      return '<button type="button" class="chip chip--sub' + (on ? " is-active" : "") +
        '" data-' + attr + '="' + esc(v) + '">' + esc(label) + "</button>";
    }).join("");
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
    // ok===null → neutral (发布中…); true→ok; false/omit with text→err
    var cls = "auth-msg";
    if (ok === true) cls += " auth-msg--ok";
    else if (ok === false || (text && ok !== null)) cls += " auth-msg--err";
    createMsg.className = cls;
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
    exerciseSkill = "listening";
    pickVol = "";
    pickTest = "";
    pickVocabBook = "";
    pickVocabRange = "";
    pickQType = "";
    pickScene = "";
    pickDiff = "";
    var hint = document.getElementById("html-file-hint");
    if (hint) hint.textContent = "上传后优先生效；学生将在站内打开做题。";
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
    var form = document.getElementById("create-form");
    ex.hidden = type !== "ASSIGNMENT";
    dueWrap.hidden = type === "LESSON";
    if (form) form.classList.toggle("assign-desk--meta-only", type !== "ASSIGNMENT");
    document.getElementById("f-start-label").textContent =
      type === "LESSON" ? "上课时间" : "开始时间（可选）";
  }

  function stampBrowseLabels() {
    ["exercise-vol-filter", "exercise-book-filter", "exercise-test-filter", "exercise-skill-filter"].forEach(function (id) {
      var el = document.getElementById(id);
      var lab = el && el.previousElementSibling;
      if (!lab || !lab.classList.contains("assign-filter-label")) return;
      lab.textContent = el.getAttribute("aria-label") || lab.textContent;
    });
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
    document.getElementById("student-list").innerHTML = html ||
      ('<p class="profile-hint">' +
        ((T.isAdmin && T.isAdmin())
          ? '暂无学生。请先到<a href="admin-assign.html">学生分配</a>绑定。'
          : "暂无学生。请联系管理员把学生分配给你。") +
      "</p>");
    document.getElementById("student-picked").textContent =
      "已选 " + Object.keys(selectedStudents).length + " 人";
  }

  function syncExerciseCatUi() {
    document.querySelectorAll("#exercise-cats [data-ex-cat]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-ex-cat") === exerciseCat);
    });
    var browse = document.getElementById("exercise-browse");
    var q = (document.getElementById("exercise-q").value || "").trim();
    var showBrowse = isBrowseMode() && !q;
    if (browse) browse.hidden = !showBrowse;
    var hint = document.getElementById("exercise-cat-hint");
    if (hint) {
      hint.textContent = q && isBrowseMode()
        ? (isVocabBrowse()
          ? "正在搜索全部词库本与 List（与学生词库相同）；清空可回到分组下钻。"
          : "正在搜索全部匹配项；清空搜索可回到「册 → Test」下钻。")
        : (CAT_HINT[exerciseCat] || "先选作业类型，再勾选内容。");
    }
    if (!showBrowse) return;

    var volHost = document.getElementById("exercise-vol-filter");
    var bookHost = document.getElementById("exercise-book-filter");
    var testHost = document.getElementById("exercise-test-filter");
    var skillBar = document.getElementById("exercise-skill-filter");

    if (isVocabBrowse()) {
      ensureVocabBrowseDefaults();
      var books = vocabBooksInGroup();
      if (volHost) {
        volHost.setAttribute("aria-label", "词书大类");
        volHost.innerHTML =
          '<button type="button" class="chip chip--sub' + (pickVocabGroup === "core" ? " is-active" : "") +
            '" data-ex-vgroup="core">核心词书</button>' +
          '<button type="button" class="chip chip--sub' + (pickVocabGroup === "theme" ? " is-active" : "") +
            '" data-ex-vgroup="theme">主题词书</button>';
      }
      if (bookHost) {
        bookHost.hidden = false;
        bookHost.setAttribute("aria-label", pickVocabGroup === "theme" ? "主题词本" : "核心词本");
        bookHost.innerHTML = books.map(function (b) {
          var on = b.id === pickVocabBook;
          var meta = b.listCount != null ? (" · " + b.listCount + " List") : "";
          return '<button type="button" class="chip chip--sub' + (on ? " is-active" : "") +
            '" data-ex-vbook="' + esc(b.id) + '" title="' + esc((b.tag || "") + meta) + '">' +
            esc(b.label) + "</button>";
        }).join("") || '<span class="profile-hint">该分组暂无词本</span>';
      }
      var ranges = pickVocabBook ? vocabRangesForBook(pickVocabBook) : [];
      if (testHost) {
        testHost.hidden = false;
        testHost.setAttribute("aria-label", "List 分段");
        testHost.innerHTML = ranges.map(function (r) {
          var on = r.id === pickVocabRange;
          return '<button type="button" class="chip chip--sub' + (on ? " is-active" : "") +
            '" data-ex-vrange="' + esc(r.id) + '">' + esc(r.label) + "</button>";
        }).join("");
      }
      if (skillBar) {
        // ponytail: vocab assign is quiz-only — no mode toggle
        skillBar.hidden = true;
        skillBar.innerHTML = "";
      }
      stampBrowseLabels();
      return;
    }

    if (bookHost) {
      bookHost.hidden = true;
      bookHost.innerHTML = "";
    }

    ensureBrowseDefaults();
    if (volHost) volHost.setAttribute("aria-label", "剑桥册");
    var vols = isTaxonomyBrowse() ? taxonomyVolumes() : cambridgeVolumes();
    renderChipRow(volHost, [""].concat(vols), "ex-vol", pickVol, "Cam ");

    if (exerciseCat === "qtype") {
      if (testHost) {
        testHost.hidden = false;
        testHost.setAttribute("aria-label", "Test");
        renderChipRow(testHost, taxonomyTests(pickVol), "ex-test", pickTest, "Test ");
      }
      if (skillBar) {
        skillBar.hidden = false;
        skillBar.setAttribute("aria-label", "题型");
        skillBar.innerHTML = (taxonomy.types || []).map(function (t) {
          var on = t === pickQType;
          return '<button type="button" class="chip chip--sub' + (on ? " is-active" : "") +
            '" data-ex-qtype="' + esc(t) + '">' + esc(t) + "</button>";
        }).join("");
      }
      if (bookHost) {
        bookHost.hidden = false;
        bookHost.setAttribute("aria-label", "难度");
        var diffs = [""].concat(taxonomy.diffs || ["易", "中", "难"]);
        bookHost.innerHTML = diffs.map(function (d) {
          var on = String(pickDiff || "") === String(d);
          return '<button type="button" class="chip chip--sub' + (on ? " is-active" : "") +
            '" data-ex-diff="' + esc(d) + '">' + esc(d || "全部难度") + "</button>";
        }).join("");
      }
      stampBrowseLabels();
      return;
    }

    if (exerciseCat === "scene") {
      if (testHost) {
        testHost.hidden = true;
        testHost.innerHTML = "";
      }
      if (bookHost) {
        bookHost.hidden = true;
        bookHost.innerHTML = "";
      }
      if (skillBar) {
        skillBar.hidden = false;
        skillBar.setAttribute("aria-label", "场景");
        skillBar.innerHTML = (taxonomy.scenes || []).map(function (s) {
          var on = s === pickScene;
          return '<button type="button" class="chip chip--sub' + (on ? " is-active" : "") +
            '" data-ex-scene="' + esc(s) + '">' + esc(s) + "</button>";
        }).join("");
      }
      stampBrowseLabels();
      return;
    }

    if (testHost) {
      testHost.hidden = false;
      testHost.setAttribute("aria-label", "Test");
    }
    var tests = testsForVolume(pickVol);
    renderChipRow(testHost, tests, "ex-test", pickTest, "Test ");

    if (skillBar) {
      skillBar.setAttribute("aria-label", "技能");
      if (exerciseCat === "suite") {
        skillBar.hidden = true;
        skillBar.innerHTML = "";
      } else if (exerciseCat === "part") {
        skillBar.hidden = false;
        skillBar.innerHTML =
          '<button type="button" class="chip chip--sub' + (exerciseSkill === "listening" ? " is-active" : "") +
          '" data-ex-skill="listening">听力 Section</button>' +
          '<button type="button" class="chip chip--sub' + (exerciseSkill === "reading" ? " is-active" : "") +
          '" data-ex-skill="reading">阅读 Passage</button>';
      } else {
        skillBar.hidden = false;
        skillBar.innerHTML =
          '<button type="button" class="chip chip--sub' + (exerciseSkill === "listening" ? " is-active" : "") +
          '" data-ex-skill="listening">听力</button>' +
          '<button type="button" class="chip chip--sub' + (exerciseSkill === "reading" ? " is-active" : "") +
          '" data-ex-skill="reading">阅读</button>' +
          '<button type="button" class="chip chip--sub' + (exerciseSkill === "writing" ? " is-active" : "") +
          '" data-ex-skill="writing">写作</button>' +
          '<button type="button" class="chip chip--sub' + (exerciseSkill === "all" ? " is-active" : "") +
          '" data-ex-skill="all">全部</button>';
      }
    }
    stampBrowseLabels();
  }

  function renderExerciseList() {
    syncExerciseCatUi();
    var q = (document.getElementById("exercise-q").value || "").trim().toLowerCase();
    var html = "";
    var searching = !!q;

    if (exerciseCat === "suite") {
      var suites = buildSuites().filter(function (s) {
        if (searching) {
          var hay = (s.base + " " + Y.displayTitle(s.listening)).toLowerCase();
          return hay.indexOf(q) >= 0;
        }
        return (!pickVol || String(Y.camVolume(s.listening) || "") === String(pickVol)) &&
          String(Y.camTestNo(s.listening) || "") === String(pickTest);
      }).slice(0, searching ? 80 : 8);
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
    } else if (isVocabBrowse()) {
      var shelfRows = [];
      if (searching) {
        shelfBooks.forEach(function (b) {
          (b.lists || []).forEach(function (list) {
            var hay = (b.label + " " + b.id + " " + (list.label || "") + " " + list.id).toLowerCase();
            if (hay.indexOf(q) >= 0) {
              shelfRows.push({ book: b, list: list });
            }
          });
        });
        shelfRows = shelfRows.slice(0, 120);
      } else {
        ensureVocabBrowseDefaults();
        var book = shelfBookById(pickVocabBook);
        listsInVocabRange(pickVocabBook).forEach(function (list) {
          shelfRows.push({ book: book || { id: pickVocabBook, label: pickVocabBook }, list: list });
        });
      }
      html = shelfRows.map(function (row) {
        var key = vocabRef(row.book.id, row.list.id);
        var checked = selectedExercises[key] ? " checked" : "";
        var wc = row.list.wordCount != null ? (row.list.wordCount + " 词") : "词库 List";
        return '<label class="cal-check">' +
          '<input type="checkbox" data-exercise="' + esc(key) + '"' + checked + ">" +
          "<span><b>" + esc(row.list.label || ("List " + row.list.id)) + "</b>" +
          "<small>" + esc(row.book.label || row.book.id) + " · " + esc(wc) + "</small></span></label>";
      }).join("");
    } else if (isTaxonomyBrowse()) {
      ensureBrowseDefaults();
      var rows = [];
      if (exerciseCat === "qtype") {
        rows = (taxonomy.groups || []).filter(function (g) {
          if (searching) {
            return (groupLabel(g) + " " + g.id).toLowerCase().indexOf(q) >= 0;
          }
          if (pickQType && g.qType !== pickQType) return false;
          if (pickVol && String(g.volume) !== String(pickVol)) return false;
          if (pickTest && String(g.test) !== String(pickTest)) return false;
          if (pickDiff && g.diff !== pickDiff) return false;
          return true;
        });
      } else {
        rows = (taxonomy.parts || []).filter(function (p) {
          if (searching) {
            return (partSceneLabel(p) + " " + p.id).toLowerCase().indexOf(q) >= 0;
          }
          if (pickScene && p.scene !== pickScene) return false;
          if (pickVol && String(p.volume) !== String(pickVol)) return false;
          return true;
        });
      }
      rows = rows.slice(0, searching ? 120 : 80);
      html = rows.map(function (row) {
        var checked = selectedExercises[row.id] ? " checked" : "";
        var title = exerciseCat === "qtype" ? groupLabel(row) : partSceneLabel(row);
        var small = exerciseCat === "qtype"
          ? (row.qType + (row.scene ? (" · " + row.scene) : "") + (row.diff ? (" · " + row.diff) : ""))
          : (row.scene || "场景 Part");
        return '<label class="cal-check">' +
          '<input type="checkbox" data-exercise="' + esc(row.id) + '"' + checked + ">" +
          "<span><b>" + esc(title) + "</b><small>" + esc(small) + "</small></span></label>";
      }).join("");
    } else {
      var items = catalog.filter(function (it) {
        if (!itemInCat(it, exerciseCat)) return false;
        if (searching) {
          var hay = (Y.displayTitle(it) + " " + it.title + " " + it.id + " " +
            (it.subject || "") + " " + (Y.partSearchText ? Y.partSearchText(it) : "")).toLowerCase();
          return hay.indexOf(q) >= 0;
        }
        if (isCambridgeBrowse() && !matchVolTest(it)) return false;
        return true;
      });
      items = items.slice(0, searching ? 120 : 40);
      html = items.map(function (it) {
        var checked = selectedExercises[it.id] ? " checked" : "";
        var label = exerciseCat === "skill"
          ? ("单项模考 · " + itemCatLabel(it))
          : itemCatLabel(it);
        return '<label class="cal-check">' +
          '<input type="checkbox" data-exercise="' + esc(it.id) + '"' + checked + ">" +
          "<span><b>" + esc(Y.displayTitle(it)) + "</b><small>" + esc(label) + "</small></span></label>";
      }).join("");
    }

    var emptyMsg = searching
      ? "没有匹配的练习"
      : (isVocabBrowse()
        ? (shelfBooks.length ? "该词书 / 分段暂无 List，换一本试试" : "词库加载中或为空")
        : (isTaxonomyBrowse()
          ? "该筛选下暂无题目，换题型 / 场景或换一册试试"
          : (isCambridgeBrowse() ? "该册 / Test 下暂无内容，换一册试试" : "没有匹配的练习")));
    document.getElementById("exercise-list").innerHTML =
      html || '<p class="profile-hint">' + emptyMsg + "</p>";
    updateExercisePicked();
  }

  function updateExercisePicked() {
    var nPick = Object.keys(selectedExercises).length;
    var el = document.getElementById("exercise-picked");
    if (!el) return;
    if (isVocabBrowse() && nPick) {
      el.textContent = "已选 " + nPick + " 个 List · 学生将逐个闯关";
      return;
    }
    el.textContent = "已选 " + nPick + " 份练习";
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
      var isVq = String(ev.cdtPack || "").toLowerCase() === "vocab-quiz";
      var studentsHtml = (ev.students || []).map(function (s) {
        var st = s.status || "PENDING";
        var prog;
        if (isVq) {
          if (st === "COMPLETED" && s.quizResult) {
            var qr = s.quizResult;
            if (qr.passedLists && (ev.linkedExerciseIds || []).length > 1) {
              var n = Object.keys(qr.passedLists).length;
              prog = "全部通过 " + n + "/" + (ev.linkedExerciseIds || []).length +
                " List（最近 " + (qr.correct || 0) + "/" + (qr.total || 0) + "）";
            } else {
              prog = "通过 " + (qr.correct || 0) + "/" + (qr.total || 0) +
                "（错 " + (qr.wrong || 0) + "）";
            }
          } else if (s.quizResult && s.quizResult.passedLists) {
            var pl = Object.keys(s.quizResult.passedLists).length;
            var tot = Math.max(1, (ev.linkedExerciseIds || []).length);
            prog = "进度 " + pl + "/" + tot + " List";
          } else {
            prog = "未通过 / 未完成";
          }
        } else {
          prog = s.exerciseTotal
            ? (s.exerciseDone || 0) + "/" + s.exerciseTotal + " 练习已完成"
            : "—";
        }
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
        var vLabel = vocabAssignLabel(xid);
        if (vLabel) return "<li>" + esc(vLabel) + "</li>";
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
          "<p class=\"profile-hint\">" +
            (isVq
              ? "学生须在单词检测中闯关通过（错不超过 5 题）后，任务才算完成；未通过须重测。"
              : "学生须完成以上全部练习后，任务才会自动变为「已完成」。") +
          "</p>" : "") +
        "<h3>学生完成情况 <span class=\"cal-detail__count\">" + doneN + "/" + totalN + " 人已完成</span></h3>" +
        '<table class="teacher-table cal-status-table"><thead><tr>' +
          "<th>学生</th><th>状态</th><th>" + (isVq ? "检测结果" : "练习进度") + "</th><th>完成时间</th></tr></thead>" +
        "<tbody>" + (studentsHtml || '<tr><td colspan="4" class="teacher-empty-row">暂无</td></tr>') +
        "</tbody></table>";
    }).catch(function (e) {
      document.getElementById("detail-body").innerHTML = "<p class=\"auth-msg auth-msg--err\">" + esc(e.message) + "</p>";
    });
  }

  function load() {
    viewEl.innerHTML = '<div class="state state--brand"><div class="spinner spinner--brand"></div></div>';
    // ponytail: soft-fail catalog/Y — publish already saved; don't paint whole page as fail
    Promise.all([
      T.api("/api/calendar/events"),
      T.api("/api/teacher/students"),
      Y.load().catch(function () { return []; }),
      T.api("/api/vocab-shelf/catalog").catch(function () { return { books: shelfBooks }; }),
      (Y.loadListeningTaxonomy
        ? Y.loadListeningTaxonomy().catch(function () { return { types: [], scenes: [], diffs: ["易", "中", "难"], groups: [], parts: [] }; })
        : Promise.resolve({ types: [], scenes: [], diffs: ["易", "中", "难"], groups: [], parts: [] }))
    ]).then(function (res) {
      events = res[0].events || [];
      students = (res[1].students || []).map(function (s) {
        return { id: s.id, phone: s.phone, displayName: s.displayName || "" };
      });
      catalog = Y.expandAssignableParts ? Y.expandAssignableParts(res[2] || []) : (res[2] || []);
      shelfBooks = (res[3] && res[3].books) || shelfBooks || [];
      taxonomy = res[4] || taxonomy;
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
    if (exerciseCat === "part") exerciseSkill = "listening";
    else if (exerciseCat === "skill") exerciseSkill = "listening";
    pickVol = "";
    pickTest = "";
    pickVocabGroup = "core";
    pickVocabBook = "";
    pickVocabRange = "";
    pickQType = "";
    pickScene = "";
    pickDiff = "";
    renderExerciseList();
  });

  var browseEl = document.getElementById("exercise-browse");
  if (browseEl) {
    browseEl.addEventListener("click", function (e) {
      var vgroup = e.target.closest("[data-ex-vgroup]");
      if (vgroup) {
        pickVocabGroup = vgroup.getAttribute("data-ex-vgroup") === "theme" ? "theme" : "core";
        pickVocabBook = "";
        pickVocabRange = "";
        // ponytail: keep checks — cross-book multi-select
        renderExerciseList();
        return;
      }
      var vbook = e.target.closest("[data-ex-vbook]");
      if (vbook) {
        pickVocabBook = vbook.getAttribute("data-ex-vbook") || "";
        pickVocabRange = "";
        renderExerciseList();
        return;
      }
      var vrange = e.target.closest("[data-ex-vrange]");
      if (vrange) {
        pickVocabRange = vrange.getAttribute("data-ex-vrange") || "";
        renderExerciseList();
        return;
      }
      var volBtn = e.target.closest("[data-ex-vol]");
      if (volBtn) {
        pickVol = volBtn.getAttribute("data-ex-vol") || "";
        pickTest = "";
        renderExerciseList();
        return;
      }
      var testBtn = e.target.closest("[data-ex-test]");
      if (testBtn) {
        pickTest = testBtn.getAttribute("data-ex-test") || "";
        renderExerciseList();
        return;
      }
      var skillBtn = e.target.closest("[data-ex-skill]");
      if (skillBtn) {
        exerciseSkill = skillBtn.getAttribute("data-ex-skill") || "listening";
        renderExerciseList();
        return;
      }
      var qtypeBtn = e.target.closest("[data-ex-qtype]");
      if (qtypeBtn) {
        pickQType = qtypeBtn.getAttribute("data-ex-qtype") || "";
        pickTest = "";
        renderExerciseList();
        return;
      }
      var sceneBtn = e.target.closest("[data-ex-scene]");
      if (sceneBtn) {
        pickScene = sceneBtn.getAttribute("data-ex-scene") || "";
        renderExerciseList();
        return;
      }
      var diffBtn = e.target.closest("[data-ex-diff]");
      if (diffBtn) {
        pickDiff = diffBtn.getAttribute("data-ex-diff") || "";
        pickTest = "";
        renderExerciseList();
      }
    });
  }

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
      if (isVocabBrowse()) updateExercisePicked();
    } else {
      return;
    }
    updateExercisePicked();
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
      showMsg("发布中…", null);
      return T.api("/api/calendar/events", { method: "POST", body: body })
        .then(function () {
          var n = targetStudentIds.length;
          showMsg("已发给 " + n + " 名学生 · 他们打开待办即可看到", true);
          closeCreate();
          load();
        })
        .catch(function (e) { showMsg(e.message, false); });
    }

    var linkedIds = type === "ASSIGNMENT" && !file ? Object.keys(selectedExercises) : [];
    var pack = type === "ASSIGNMENT" && !file ? cdtPackForCat(exerciseCat) : "";
    if (pack === "vocab-quiz") {
      if (!linkedIds.length) {
        showMsg("请至少勾选 1 个 List", false);
        return;
      }
      for (var vi = 0; vi < linkedIds.length; vi++) {
        if (!parseVocabRef(linkedIds[vi])) {
          showMsg("词库选择无效，请重新勾选 List", false);
          return;
        }
      }
    }

    var startTime = fromLocalInput(document.getElementById("f-start").value);
    var dueTime = fromLocalInput(document.getElementById("f-due").value);
    if (type === "ASSIGNMENT" && !startTime && !dueTime) {
      showMsg("请设置开始时间或截止时间", false);
      return;
    }

    var body = {
      title: document.getElementById("f-title").value.trim(),
      description: "",
      eventType: type,
      startTime: startTime,
      dueTime: dueTime,
      targetStudentIds: targetStudentIds,
      linkedExerciseIds: linkedIds,
      cdtPack: pack
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
