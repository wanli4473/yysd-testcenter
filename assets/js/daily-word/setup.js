/* =========================================================================
   daily-word/setup.js — 任务设置页：选词书（单元 + 分类词库）+ 每日数量
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var DW = window.YYSD_DAILY_WORD;
  var root = document.getElementById("dw-root");

  var state = {
    bookId: "",
    count: DW.DEFAULT_COUNT,
    books: [],
    themes: [],
    categories: [],
    themeCat: "all",
    resume: null
  };

  function activeResume() {
    var t = DW.getTask();
    if (t && t.wordList && t.wordList.length && !t.completed) return t;
    return null;
  }

  function bookLabelOf(id) {
    var i, b;
    for (i = 0; i < state.books.length; i++) {
      if (state.books[i].key === id) return state.books[i].label;
    }
    for (i = 0; i < state.themes.length; i++) {
      if (state.themes[i].key === id) return state.themes[i].label;
    }
    return "";
  }

  function persist() {
    if (!state.bookId) return;
    DW.savePlan({
      bookId: state.bookId,
      bookLabel: bookLabelOf(state.bookId),
      targetCount: DW.clampCount(state.count),
      updatedAt: Date.now()
    });
  }

  function filteredThemes() {
    if (state.themeCat === "all") return state.themes;
    return state.themes.filter(function (t) { return t.category === state.themeCat; });
  }

  function bookBtn(b) {
    var on = b.key === state.bookId ? " is-on" : "";
    return '<button type="button" class="dw-book' + on + '" data-book="' + DW.esc(b.key) + '">' +
      '<span class="dw-book__check" aria-hidden="true">✓</span>' +
      '<p class="dw-book__name">' + DW.esc(b.label) + "</p>" +
      '<p class="dw-book__meta">' + DW.esc(b.meta || "") + "</p>" +
      "</button>";
  }

  function syncBookSelection() {
    root.querySelectorAll("[data-book]").forEach(function (btn) {
      btn.classList.toggle("is-on", btn.getAttribute("data-book") === state.bookId);
    });
    var start = document.getElementById("dw-start");
    if (start) start.disabled = !state.bookId;
    var pick = document.getElementById("dw-pick-label");
    if (pick) {
      pick.textContent = state.bookId
        ? ("已选：" + (bookLabelOf(state.bookId) || state.bookId))
        : "请选择词书";
    }
    var note = document.getElementById("dw-resume-note");
    if (note && state.resume) {
      var cur = state.resume.bookLabel || "今日任务";
      var next = bookLabelOf(state.bookId);
      if (next && state.bookId !== state.resume.bookId) {
        note.textContent = "重新开始将改为「" + next + "」，当前「" + cur + "」进度会清除。";
      } else {
        note.textContent = "可改词书或数量后重新开始；点重新开始将清除当前进度。";
      }
    }
  }

  function syncCountUi() {
    var strong = root.querySelector(".dw-count-line strong");
    if (strong) strong.textContent = String(state.count);
    var eta = document.getElementById("dw-count-eta");
    if (eta) eta.textContent = "预计约 " + DW.estimateMinutes(state.count) + " 分钟";
    root.querySelectorAll(".dw-chip").forEach(function (c) {
      c.classList.toggle("is-on", Number(c.getAttribute("data-count")) === state.count);
    });
    var slider = document.getElementById("dw-count-slider");
    if (slider && Number(slider.value) !== state.count) slider.value = String(state.count);
  }

  function renderThemeList() {
    var host = document.getElementById("dw-theme-list");
    if (!host) return;
    var list = filteredThemes();
    host.innerHTML = list.map(bookBtn).join("") ||
      '<p class="dw-hint">该分类下暂无词库</p>';
    host.querySelectorAll("[data-book]").forEach(function (btn) {
      btn.addEventListener("click", onBookClick);
    });
    // keep selected card visible inside the scroller
    var on = host.querySelector(".dw-book.is-on");
    if (on && on.scrollIntoView) {
      try { on.scrollIntoView({ block: "nearest" }); } catch (e) { on.scrollIntoView(false); }
    }
  }

  function onBookClick(e) {
    var btn = e.currentTarget;
    var id = btn.getAttribute("data-book");
    if (!id || id === state.bookId) return;
    state.bookId = id;
    persist();
    // ponytail: toggle class only — full render resets theme scroller
    syncBookSelection();
  }

  function render() {
    var unitHtml = state.books.map(bookBtn).join("") ||
      '<p class="dw-hint">暂无单元词书</p>';

    var catChips = [{ id: "all", label: "全部" }].concat(state.categories).map(function (c) {
      var on = c.id === state.themeCat ? " is-on" : "";
      return '<button type="button" class="dw-cat' + on + '" data-cat="' + DW.esc(c.id) + '">' +
        DW.esc(c.label) + "</button>";
    }).join("");

    var chips = DW.PRESETS.map(function (n) {
      var on = n === state.count ? " is-on" : "";
      return '<button type="button" class="dw-chip' + on + '" data-count="' + n + '">' +
        n + ' <small>≈' + DW.estimateMinutes(n) + "分</small></button>";
    }).join("");

    var resume = state.resume;
    var banner = "";
    if (resume) {
      banner =
        '<div class="dw-resume-banner">' +
          '<div class="dw-resume-banner__row">' +
            '<p class="dw-resume-banner__status"><strong>进行中</strong> ' +
              ((resume.currentIndex || 0) + 1) + "/" + resume.wordList.length +
              " · " + DW.esc(resume.bookLabel || "今日任务") + "</p>" +
            '<a class="dw-resume-banner__link" href="daily-word-learn.html">继续 ›</a>' +
          "</div>" +
          '<p class="dw-hint" id="dw-resume-note">可改词书或数量后重新开始；点重新开始将清除当前进度。</p>' +
        "</div>";
    }

    root.innerHTML =
      '<div class="dw-shell dw-shell--setup">' +
        '<header class="dw-top">' +
          '<a class="dw-back" href="zone.html?zone=study&s=vocab" aria-label="返回">←</a>' +
          '<div class="dw-top__title">' + (resume ? "重新设置任务" : "设置今日任务") + "</div>" +
        "</header>" +
        banner +
        '<p class="dw-pick" id="dw-pick-label"></p>' +
        '<section class="dw-setup-sec">' +
          "<h2>单元词书</h2>" +
          '<div class="dw-books" id="dw-unit-list">' + unitHtml + "</div>" +
        "</section>" +
        '<section class="dw-setup-sec">' +
          '<h2>分类词库 <span class="dw-setup-sec__n">' + state.themes.length + " 本</span></h2>" +
          '<div class="dw-cats" id="dw-cats">' + catChips + "</div>" +
          '<div class="dw-books dw-books--themes" id="dw-theme-list"></div>' +
        "</section>" +
        '<section class="dw-setup-sec">' +
          "<h2>每日学习数量</h2>" +
          '<div class="dw-presets">' + chips + "</div>" +
          '<div class="dw-count-line"><span>当前</span><strong>' + state.count + "</strong><span>词</span></div>" +
          '<div class="dw-slider-row">' +
            '<input class="dw-slider" type="range" min="' + DW.COUNT_MIN + '" max="' + DW.COUNT_MAX +
              '" step="' + DW.COUNT_STEP + '" value="' + state.count + '" id="dw-count-slider">' +
          "</div>" +
          '<p class="dw-hint" id="dw-count-eta">预计约 ' + DW.estimateMinutes(state.count) + " 分钟</p>" +
        "</section>" +
        '<div class="dw-setup-foot">' +
          '<button type="button" class="dw-btn dw-btn--primary" id="dw-start"' +
            (state.bookId ? "" : " disabled") + ">" +
            (resume ? "重新开始" : "开始学习") + "</button>" +
        "</div>" +
      "</div>";

    document.getElementById("dw-unit-list").querySelectorAll("[data-book]").forEach(function (btn) {
      btn.addEventListener("click", onBookClick);
    });

    root.querySelectorAll("[data-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-cat") || "all";
        if (id === state.themeCat) return;
        state.themeCat = id;
        root.querySelectorAll("[data-cat]").forEach(function (c) {
          c.classList.toggle("is-on", c.getAttribute("data-cat") === state.themeCat);
        });
        renderThemeList();
        syncBookSelection();
      });
    });

    root.querySelectorAll("[data-count]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.count = DW.clampCount(btn.getAttribute("data-count"));
        persist();
        syncCountUi();
      });
    });

    var slider = document.getElementById("dw-count-slider");
    if (slider) {
      slider.addEventListener("input", function () {
        state.count = DW.clampCount(slider.value);
        persist();
        syncCountUi();
      });
    }

    var start = document.getElementById("dw-start");
    if (start) {
      start.addEventListener("click", function () {
        if (!state.bookId) return;
        if (state.resume && !window.confirm("重新开始将清除当前进度，确定吗？")) return;
        persist();
        start.disabled = true;
        start.textContent = "抽词中…";
        DW.fetchBookPool(state.bookId, 0).then(function (data) {
          var picked = DW.pickDaily(data.pool, state.bookId, state.count, DW.getRecords());
          if (!picked.length) throw new Error("词库暂无可用单词");
          var A = window.YYSD_AUTH;
          var user = (A && A.getUser) ? A.getUser() : {};
          var task = {
            date: DW.todayStr(),
            bookId: state.bookId,
            bookLabel: data.book.label,
            targetCount: picked.length,
            wordList: picked,
            currentIndex: 0,
            stage: "image",
            startTime: Date.now(),
            completed: false,
            speakingFails: {},
            spellingFails: {},
            speakTries: {},
            weakSpeak: [],
            weakSpell: [],
            weakMeaning: [],
            studentName: (user && (user.displayName || user.name)) || "",
            studentPhone: (user && user.phone) || ""
          };
          DW.saveTask(task);
          state.resume = null;
          location.href = "daily-word-learn.html";
        }).catch(function (e) {
          start.disabled = false;
          start.textContent = state.resume ? "重新开始" : "开始学习";
          alert(e.message || "抽词失败");
        });
      });
    }

    // if current book is a theme, open its category
    if (DW.isThemeBook(state.bookId)) {
      var tid = state.bookId.slice(DW.THEME_PREFIX.length);
      for (var i = 0; i < state.themes.length; i++) {
        if (state.themes[i].id === tid) {
          state.themeCat = state.themes[i].category || "all";
          root.querySelectorAll("[data-cat]").forEach(function (c) {
            c.classList.toggle("is-on", c.getAttribute("data-cat") === state.themeCat);
          });
          break;
        }
      }
    }

    renderThemeList();
    syncBookSelection();
  }

  function boot() {
    state.resume = activeResume();
    var plan = DW.getPlan();
    if (plan) {
      state.bookId = plan.bookId || "";
      state.count = DW.clampCount(plan.targetCount || DW.DEFAULT_COUNT);
    }
    if (state.resume) {
      if (state.resume.bookId) state.bookId = state.resume.bookId;
      if (state.resume.targetCount) state.count = DW.clampCount(state.resume.targetCount);
    }
    Promise.all([
      Y.load(),
      DW.fetchThemesCatalog().catch(function () { return { themes: [], categories: [] }; })
    ]).then(function (pair) {
      var items = pair[0];
      var cat = pair[1] || {};
      var catLabel = {};
      state.categories = (cat.categories || []).filter(function (c) { return c.id && c.id !== "all"; });
      state.categories.forEach(function (c) { catLabel[c.id] = c.label; });

      state.books = Y.vocabBooksForZone(items).map(function (s) {
        return {
          key: s.book.key,
          label: s.book.label,
          meta: s.total + " 个单元 · " + (s.book.tag || "")
        };
      });
      state.themes = (cat.themes || []).slice().sort(function (a, b) {
        return (a.no || 0) - (b.no || 0);
      }).map(function (t) {
        return {
          key: DW.THEME_PREFIX + t.id,
          id: t.id,
          category: t.category || "",
          label: t.title,
          meta: (t.count || 0) + " 词 · " + (catLabel[t.category] || "分类词库")
        };
      });

      var known = {};
      state.books.concat(state.themes).forEach(function (b) { known[b.key] = true; });
      if (!state.bookId || !known[state.bookId]) {
        state.bookId = (state.books[0] && state.books[0].key) ||
          (state.themes[0] && state.themes[0].key) || "";
      }
      render();
    }).catch(function (e) {
      root.innerHTML = '<div class="dw-fail"><p>无法加载词书</p><p>' +
        DW.esc(e.message) + '</p><p><a href="zone.html?zone=study&s=vocab">返回单词区</a></p></div>';
    });
  }

  boot();
})();
