/* =========================================================================
   vocab.js — vocabulary book hub (Plan A)
   Opened from 学习区: vocab.html?book=gaozhong | cet4 | special
   Optional: &range=11-20 for initial LIST tab
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var params = new URLSearchParams(location.search);
  var bookKey = (params.get("book") || "").trim();
  var rangeParam = (params.get("range") || "").trim();
  var contentEl = document.getElementById("content");

  var navLink = document.querySelector('#nav a[data-zone="study"]');
  if (navLink) navLink.classList.add("is-active");
  document.getElementById("year").textContent = new Date().getFullYear();

  var SPECIAL_SECTIONS = [
    { subject: "vocab-special-listening", label: "听力专项词汇", short: "听力", badge: "第", suffix: "篇" },
    { subject: "vocab-special-reading", label: "阅读专项词汇", short: "阅读", badge: "单元", suffix: "" },
    { subject: "vocab-special-writing", label: "写作专项词汇", short: "写作", badge: "单元", suffix: "" }
  ];

  function fail(msg) {
    contentEl.innerHTML = '<div class="state"><h3>无法打开</h3><p>' + Y.esc(msg) +
      '</p><p><a href="zone.html?zone=study&s=vocab">返回学习区</a></p></div>';
  }

  function listBadge(item) {
    var n = Y.vocabListNo(item);
    return n ? ("单元 " + n) : "#";
  }

  function heroHTML(book, stats, prog) {
    var badge = book.key === "gaozhong" ? "GZ" : (book.key === "cet4" ? "CET4" : "IELTS");
    var sub = stats.total + " 个单元";
    var progLine = prog.done
      ? "已学 " + prog.done + " / " + stats.total +
        (prog.last ? " · 上次 " + Y.displayTitle(prog.last) : "")
      : "边学边测 · 点击单元进入";

    var actions = "";
    if (prog.next) {
      var nextLabel = Y.displayTitle(prog.next);
      var first = stats.lists[0];
      actions = '<div class="vocab-hero__actions">' +
        '<a class="btn btn--primary btn--sm" href="' + Y.fileHref(prog.next, "") + '">继续学习 · ' +
        Y.esc(nextLabel) + '</a>';
      if (first) {
        actions += '<a class="btn btn--ghost btn--sm" href="' + Y.fileHref(first, "") + '">从单元 1 开始</a>';
      }
      actions += '</div>';
    }

    return '<div class="cam-hero vocab-hero">' +
      '<div class="cam-hero__badge"><div class="lbl">VOCAB</div><div class="num">' + Y.esc(badge) + '</div></div>' +
      '<div><h1>' + Y.esc(book.label) + '</h1>' +
      '<div class="meta">' + Y.esc(sub) + ' · ' + Y.esc(progLine) + '</div>' +
      '<label class="vocab-search">搜索单元' +
      '<input type="search" id="vocab-q" placeholder="如：' +
      Y.esc(book.key === "cet4" ? "四级词汇单元1" : (book.key === "special" ? "听力词汇单元1" : "高中词汇单元1")) +
      '" autocomplete="off"></label>' +
      actions +
      '</div></div>';
  }

  function listRowHTML(item) {
    var done = Y.results()[item.id];
    var topic = Y.vocabTopic(item);
    return '<a class="vocab-list-row' + (done ? " is-done" : "") + '" href="' + Y.fileHref(item, "") +
      '" data-title="' + Y.esc(Y.displayTitle(item).toLowerCase()) +
      '" data-raw="' + Y.esc(String(item.title || "").toLowerCase()) + '">' +
      '<span class="vocab-list-row__no">' + Y.esc(listBadge(item)) + '</span>' +
      '<span class="vocab-list-row__main">' +
        '<span class="vocab-list-row__title">' + Y.esc(Y.displayTitle(item)) + '</span>' +
        (topic ? '<span class="vocab-list-row__topic">' + Y.esc(topic) + '</span>' : '') +
      '</span>' +
      (done
        ? '<span class="vocab-list-row__badge">已学</span>'
        : '<span class="vocab-list-row__go">进入 ›</span>') +
      '</a>';
  }

  function specialTabs(lists) {
    var tabs = [];
    var chunk = 10;
    SPECIAL_SECTIONS.forEach(function (sec) {
      var its = lists.filter(function (it) { return it.subject === sec.subject; });
      its.sort(function (a, b) {
        return Y.vocabListNo(a) - Y.vocabListNo(b) ||
          String(a.title).localeCompare(String(b.title), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
      });
      if (!its.length) {
        tabs.push({ id: sec.subject, label: sec.short + " · 即将上线", empty: true, items: [] });
        return;
      }
      var max = Math.max.apply(null, its.map(Y.vocabListNo));
      for (var start = 1; start <= max; start += chunk) {
        var end = Math.min(start + chunk - 1, max);
        tabs.push({
          id: sec.subject + "-" + start + "-" + end,
          label: sec.short + " " + start + "–" + end,
          items: its.filter(function (it) {
            var n = Y.vocabListNo(it);
            return n >= start && n <= end;
          })
        });
      }
    });
    return tabs;
  }

  function buildTabs(stats) {
    if (bookKey === "special") return specialTabs(stats.lists);
    return Y.vocabListRanges(stats.lists, stats.book.chunk || 10).map(function (t) {
      return {
        id: t.id,
        label: t.label,
        items: stats.lists.filter(function (it) {
          var n = Y.vocabListNo(it);
          return n >= t.start && n <= t.end;
        })
      };
    });
  }

  function renderRangedBook(stats) {
    var book = stats.book;
    var tabs = buildTabs(stats);
    var activeId = rangeParam;
    if (!activeId || !tabs.some(function (t) { return t.id === activeId; })) {
      activeId = tabs.length ? tabs[0].id : "";
    }
    rangeParam = activeId;

    document.title = book.label + " · 优益思达国际课程中心";

    var prog = Y.vocabProgress(stats.lists);
    var chips = tabs.map(function (t) {
      return '<button type="button" class="chip vocab-range-chip' + (t.id === activeId ? " is-active" : "") +
        '" data-range="' + Y.esc(t.id) + '">' + Y.esc(t.label) + '</button>';
    }).join("");

    var panels = tabs.map(function (t) {
      var body = t.empty
        ? '<div class="soon-box">该板块即将上线，敬请期待。</div>'
        : '<div class="vocab-list-grid">' + t.items.map(listRowHTML).join("") + '</div>';
      return '<div class="vocab-range-panel' + (t.id === activeId ? " is-active" : "") +
        '" data-range="' + Y.esc(t.id) + '">' + body + '</div>';
    }).join("");

    contentEl.innerHTML = heroHTML(book, stats, prog) +
      '<div class="vocab-range-wrap">' +
      '<div class="vocab-range-chips">' + chips + '</div>' +
      '<div class="vocab-range-panels">' + panels + '</div>' +
      '</div>';

    contentEl.querySelector(".vocab-range-chips").addEventListener("click", function (e) {
      var btn = e.target.closest(".vocab-range-chip");
      if (!btn) return;
      switchRange(btn.getAttribute("data-range"));
    });

    var qEl = document.getElementById("vocab-q");
    if (qEl) {
      qEl.addEventListener("input", function () {
        var q = qEl.value.trim().toLowerCase();
        contentEl.querySelectorAll(".vocab-list-row").forEach(function (row) {
          var hay = (row.getAttribute("data-title") || "") + " " + (row.getAttribute("data-raw") || "");
          row.hidden = !!(q && hay.indexOf(q) < 0);
        });
      });
    }

    animateListRows(contentEl.querySelector(".vocab-range-panel.is-active"));
  }

  function switchRange(id) {
    if (!id || id === rangeParam) return;
    rangeParam = id;
    var panelsWrap = contentEl.querySelector(".vocab-range-panels");
    if (panelsWrap) panelsWrap.classList.add("is-swapping");

    setTimeout(function () {
      contentEl.querySelectorAll(".vocab-range-chip").forEach(function (c) {
        c.classList.toggle("is-active", c.getAttribute("data-range") === id);
      });
      contentEl.querySelectorAll(".vocab-range-panel").forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-range") === id);
      });
      if (panelsWrap) panelsWrap.classList.remove("is-swapping");
      animateListRows(contentEl.querySelector(".vocab-range-panel.is-active"));
      history.replaceState(null, "", "vocab.html?book=" + encodeURIComponent(bookKey) + "&range=" + encodeURIComponent(id));
    }, 150);
  }

  function animateListRows(panel) {
    if (!panel) return;
    panel.classList.remove("is-entering");
    void panel.offsetWidth;
    panel.classList.add("is-entering");
    panel.querySelectorAll(".vocab-list-row").forEach(function (row, i) {
      row.style.setProperty("--row-i", String(i));
    });
  }

  Y.load().then(function (items) {
    var study = items.filter(function (it) { return it.zone === "study"; });
    var stats = Y.vocabBookStats(study, bookKey);

    if (!stats || !stats.total) {
      fail("未找到该单词书内容，请从<a href=\"zone.html?zone=study&s=vocab\">学习区</a>重新进入。");
      return;
    }

    renderRangedBook(stats);
  }).catch(function (err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : err.message;
    fail(msg);
  });
})();
