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
    resume: null // unfinished task, if any
  };

  function activeResume() {
    var t = DW.getTask();
    if (t && t.wordList && t.wordList.length && !t.completed) return t;
    return null;
  }

  function persist() {
    if (!state.bookId) return;
    DW.savePlan({
      bookId: state.bookId,
      targetCount: DW.clampCount(state.count),
      updatedAt: Date.now()
    });
  }

  function bookBtn(b) {
    var on = b.key === state.bookId ? " is-on" : "";
    return '<button type="button" class="dw-book' + on + '" data-book="' + DW.esc(b.key) + '">' +
      '<span class="dw-book__check">✓</span>' +
      '<p class="dw-book__name">' + DW.esc(b.label) + "</p>" +
      '<p class="dw-book__meta">' + DW.esc(b.meta || "") + "</p>" +
      "</button>";
  }

  function render() {
    var unitHtml = state.books.map(bookBtn).join("") ||
      '<p class="dw-hint">暂无单元词书</p>';
    var themeHtml = state.themes.map(bookBtn).join("") ||
      '<p class="dw-hint">暂无分类词库</p>';

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
          '<p><strong>进行中</strong> ' +
            ((resume.currentIndex || 0) + 1) + "/" + resume.wordList.length +
            " · " + DW.esc(resume.bookLabel || "今日任务") + "</p>" +
          '<p class="dw-hint">可在下方改词书或数量后重新开始；当前进度将被清除。</p>' +
          '<div class="dw-resume-banner__acts">' +
            '<a class="dw-btn dw-btn--ghost" href="daily-word-learn.html">继续当前进度</a>' +
          "</div>" +
        "</div>";
    }

    root.innerHTML =
      '<div class="dw-shell">' +
        '<header class="dw-top">' +
          '<a class="dw-back" href="zone.html?zone=study&s=vocab" aria-label="返回">←</a>' +
          '<div class="dw-top__title">' + (resume ? "重新设置任务" : "设置今日任务") + "</div>" +
        "</header>" +
        banner +
        '<section class="dw-setup-sec">' +
          "<h2>单元词书</h2>" +
          '<div class="dw-books">' + unitHtml + "</div>" +
        "</section>" +
        '<section class="dw-setup-sec">' +
          "<h2>分类词库</h2>" +
          '<p class="dw-hint">与「分类词库」页同源，共 ' + state.themes.length + " 本</p>" +
          '<div class="dw-books dw-books--themes">' + themeHtml + "</div>" +
        "</section>" +
        '<section class="dw-setup-sec">' +
          "<h2>每日学习数量</h2>" +
          '<div class="dw-presets">' + chips + "</div>" +
          '<div class="dw-count-line"><span>当前</span><strong>' + state.count + "</strong><span>词</span></div>" +
          '<div class="dw-slider-row">' +
            '<input class="dw-slider" type="range" min="' + DW.COUNT_MIN + '" max="' + DW.COUNT_MAX +
              '" step="' + DW.COUNT_STEP + '" value="' + state.count + '" id="dw-count-slider">' +
          "</div>" +
          '<p class="dw-hint">预计约 ' + DW.estimateMinutes(state.count) + " 分钟</p>" +
        "</section>" +
        '<div class="dw-setup-foot">' +
          '<button type="button" class="dw-btn dw-btn--primary" id="dw-start"' +
            (state.bookId ? "" : " disabled") + ">" +
            (resume ? "重新开始" : "开始学习") + "</button>" +
        "</div>" +
      "</div>";

    root.querySelectorAll("[data-book]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.bookId = btn.getAttribute("data-book");
        persist();
        render();
      });
    });
    root.querySelectorAll("[data-count]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.count = DW.clampCount(btn.getAttribute("data-count"));
        persist();
        render();
      });
    });
    var slider = document.getElementById("dw-count-slider");
    if (slider) {
      slider.addEventListener("input", function () {
        state.count = DW.clampCount(slider.value);
        persist();
        var strong = root.querySelector(".dw-count-line strong");
        if (strong) strong.textContent = String(state.count);
        var hint = root.querySelectorAll(".dw-setup-sec .dw-hint");
        var lastHint = hint.length ? hint[hint.length - 1] : null;
        if (lastHint) lastHint.textContent = "预计约 " + DW.estimateMinutes(state.count) + " 分钟";
        root.querySelectorAll(".dw-chip").forEach(function (c) {
          c.classList.toggle("is-on", Number(c.getAttribute("data-count")) === state.count);
        });
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
            studentName: (user && (user.displayName || user.name)) || "",
            studentPhone: (user && user.phone) || ""
          };
          // overwrite only after new pool is ready
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
  }

  function boot() {
    state.resume = activeResume();
    var plan = DW.getPlan();
    if (plan) {
      state.bookId = plan.bookId || "";
      state.count = DW.clampCount(plan.targetCount || DW.DEFAULT_COUNT);
    }
    // prefer current task's book/count when resetting mid-run
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
      (cat.categories || []).forEach(function (c) { catLabel[c.id] = c.label; });

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
