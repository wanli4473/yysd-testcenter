/* =========================================================================
   daily-word/setup.js — 任务设置页：选词书 + 每日数量
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var DW = window.YYSD_DAILY_WORD;
  var root = document.getElementById("dw-root");

  var state = {
    bookId: "",
    count: DW.DEFAULT_COUNT,
    books: []
  };

  function persist() {
    if (!state.bookId) return;
    DW.savePlan({
      bookId: state.bookId,
      targetCount: DW.clampCount(state.count),
      updatedAt: Date.now()
    });
  }

  function render() {
    var booksHtml = state.books.map(function (b) {
      var on = b.key === state.bookId ? " is-on" : "";
      return '<button type="button" class="dw-book' + on + '" data-book="' + DW.esc(b.key) + '">' +
        '<span class="dw-book__check">✓</span>' +
        '<p class="dw-book__name">' + DW.esc(b.label) + "</p>" +
        '<p class="dw-book__meta">' + b.total + " 个单元 · " + DW.esc(b.tag || "") + "</p>" +
        "</button>";
    }).join("");

    var chips = DW.PRESETS.map(function (n) {
      var on = n === state.count ? " is-on" : "";
      return '<button type="button" class="dw-chip' + on + '" data-count="' + n + '">' +
        n + ' <small>≈' + DW.estimateMinutes(n) + "分</small></button>";
    }).join("");

    root.innerHTML =
      '<div class="dw-shell">' +
        '<header class="dw-top">' +
          '<a class="dw-back" href="zone.html?zone=study&s=vocab" aria-label="返回">←</a>' +
          '<div class="dw-top__title">设置今日任务</div>' +
        "</header>" +
        '<section class="dw-setup-sec">' +
          "<h2>选择单词册</h2>" +
          '<div class="dw-books">' + booksHtml + "</div>" +
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
            (state.bookId ? "" : " disabled") + ">开始学习</button>" +
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
        var hint = root.querySelector(".dw-setup-sec .dw-hint");
        if (hint) hint.textContent = "预计约 " + DW.estimateMinutes(state.count) + " 分钟";
        root.querySelectorAll(".dw-chip").forEach(function (c) {
          c.classList.toggle("is-on", Number(c.getAttribute("data-count")) === state.count);
        });
      });
    }
    var start = document.getElementById("dw-start");
    if (start) {
      start.addEventListener("click", function () {
        if (!state.bookId) return;
        persist();
        start.disabled = true;
        start.textContent = "抽词中…";
        // load full book pool so daily pick is random across all units
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
          DW.saveTask(task);
          location.href = "daily-word-learn.html";
        }).catch(function (e) {
          start.disabled = false;
          start.textContent = "开始学习";
          alert(e.message || "抽词失败");
        });
      });
    }
  }

  function boot() {
    var plan = DW.getPlan();
    if (plan) {
      state.bookId = plan.bookId || "";
      state.count = DW.clampCount(plan.targetCount || DW.DEFAULT_COUNT);
    }
    Y.load().then(function (items) {
      state.books = Y.vocabBooksForZone(items).map(function (s) {
        return {
          key: s.book.key,
          label: s.book.label,
          tag: s.book.tag || "",
          total: s.total
        };
      });
      if (!state.bookId && state.books[0]) state.bookId = state.books[0].key;
      render();
    }).catch(function (e) {
      root.innerHTML = '<div class="dw-fail"><p>无法加载词书</p><p>' +
        DW.esc(e.message) + '</p><p><a href="zone.html?zone=study&s=vocab">返回单词区</a></p></div>';
    });
  }

  boot();
})();
