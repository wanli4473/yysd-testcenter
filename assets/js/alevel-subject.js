/* =========================================================================
   alevel-subject.js — CAIE papers: one table, grouped by P1 / S1 / M …
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var A = window.YYSD_ALEVEL;
  var P = window.YYSD_ALEVEL_PAPERS;
  var params = new URLSearchParams(location.search);
  var board = (params.get("board") || "caie").trim();
  var code = (params.get("code") || "").trim();
  var contentEl = document.getElementById("content");

  var activeYear = params.get("year") || "2025";
  var activeSeason = "all";
  var activeComponent = "all";

  document.getElementById("year").textContent = new Date().getFullYear();
  var navLink = document.querySelector('#nav a[data-zone="mock"]');
  if (navLink) navLink.classList.add("is-active");

  var subject, allItems, boardMeta;
  var isCaie = board === "caie" && !!P.schema(code);

  function filteredItems() {
    return allItems.filter(function (it) {
      if (activeYear !== "all" && String(it.year) !== activeYear) return false;
      if (activeSeason !== "all" && it.season !== activeSeason) return false;
      if (activeComponent !== "all" && String(P.paperDigit(it.paper)) !== activeComponent) return false;
      return true;
    });
  }

  function linkAnswer(item, prefix) {
    if (!item) return '<span class="alevel-paper-missing">—</span>';
    return '<a class="alevel-see-answers" href="' + A.viewHref(item, prefix) + '">查看答案</a>';
  }

  function linkQuestion(row, prefix) {
    var title = P.rowTitle(row.code, row.paper, row.year, row.season);
    var meta = P.rowMeta(row.paper);
    if (!row.qp) {
      return '<span class="alevel-paper-title">' + Y.esc(title) + "</span>" +
        '<span class="alevel-paper-meta">' + Y.esc(meta) + "</span>";
    }
    return '<a class="alevel-paper-title" href="' + A.viewHref(row.qp, prefix) + '">' + Y.esc(title) + "</a>" +
      '<span class="alevel-paper-meta">' + Y.esc(meta) +
        ' · <a href="' + A.fileHref(row.qp, prefix) + '" download target="_blank" rel="noopener">下载真题</a>' +
        (row.ms ? ' · <a href="' + A.fileHref(row.ms, prefix) + '" download target="_blank" rel="noopener">下载答案</a>' : "") +
        "</span>";
  }

  function renderComponentChips(components) {
    if (!components.length) return "";
    var chips = '<button type="button" class="chip' + (activeComponent === "all" ? " is-active" : "") +
      '" data-component="all">全部</button>';
    chips += components.map(function (c) {
      return '<button type="button" class="chip chip--paper' +
        (activeComponent === String(c.d) ? " is-active" : "") +
        '" data-component="' + c.d + '" title="' + Y.esc(c.nameZh) + '">' +
        Y.esc(c.short) + "</button>";
    }).join("");
    return '<div class="alevel-component-filters filters">' + chips + "</div>";
  }

  function renderCaieTable(items) {
    if (!items.length) {
      return '<div class="soon-box">暂无试卷，请调整筛选。</div>';
    }
    var groups = P.groupByComponent(code, items);
    var components = P.componentsPresent(code, items);
    var order = components.length
      ? components.map(function (c) { return c.d; })
      : Object.keys(groups).map(Number).sort(function (a, b) { return a - b; });

    var rows = "";
    order.forEach(function (digit) {
      var list = groups[digit];
      if (!list || !list.length) return;
      if (activeComponent !== "all" && String(digit) !== activeComponent) return;
      var comp = components.find(function (c) { return c.d === digit; }) ||
        P.componentMeta(code, digit + "1");
      rows += '<tr class="alevel-paper-section"><td colspan="2">' +
        '<div class="alevel-paper-section__title">' +
        '<span class="alevel-paper-section__tag">' + Y.esc(comp.short) + "</span>" +
        "<strong>" + Y.esc(P.sectionHeading(comp)) + "</strong>" +
        (comp.level ? '<span class="alevel-paper-section__lvl">(' + Y.esc(comp.level) + ")</span>" : "") +
        "</div>" +
        (comp.desc ? '<p class="alevel-paper-section__desc">' + Y.esc(comp.desc) + "</p>" : "") +
        "</td></tr>";
      list.forEach(function (row) {
        rows += '<tr class="alevel-paper-row">' +
          '<td class="alevel-paper-cell-q">' + linkQuestion(row, "") + "</td>" +
          '<td class="alevel-paper-cell-a">' + linkAnswer(row.ms, "") + "</td></tr>";
      });
    });

    if (!rows) {
      return '<div class="soon-box">暂无试卷，请调整筛选。</div>';
    }
    return '<div class="alevel-paper-list-wrap alevel-paper-list-wrap--disi">' +
      '<table class="alevel-paper-list alevel-paper-list--disi">' +
      "<thead><tr><th>真题 Question Paper</th><th>答案 Answers</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  function renderFlatTable(items) {
    if (!items.length) {
      return '<div class="soon-box">暂无试卷，请调整筛选。</div>';
    }
    var rows = A.sortItems(items.filter(function (it) { return it.type === "qp"; }))
      .map(function (qp) {
        var ms = items.find(function (it) {
          return it.type === "ms" && it.year === qp.year &&
            it.season === qp.season && it.paper === qp.paper;
        });
        return '<tr class="alevel-paper-row">' +
          "<td>" + qp.year + "</td>" +
          '<td><span class="alevel-season-badge alevel-season-badge--' + Y.esc(qp.season) + '">' +
            Y.esc(A.seasonBadge(qp.season)) + "</span></td>" +
          "<td>Paper " + Y.esc(qp.paper) + "</td>" +
          '<td class="alevel-paper-links">' +
            (qp ? '<a href="' + A.viewHref(qp, "") + '">预览</a>' : "—") + "</td>" +
          '<td class="alevel-paper-links">' + linkAnswer(ms, "") + "</td></tr>";
      }).join("");
    return '<div class="alevel-paper-list-wrap"><table class="alevel-paper-list">' +
      "<thead><tr><th>年份</th><th>考季</th><th>Paper</th><th>真题</th><th>答案</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  function renderFilters(components) {
    var years = A.yearsFor(allItems, null);
    var yearOpts = '<option value="all"' + (activeYear === "all" ? " selected" : "") + ">全部</option>" +
      years.map(function (y) {
        return '<option value="' + y + '"' + (activeYear === String(y) ? " selected" : "") + ">" + y + "</option>";
      }).join("");

    var seasons = [
      { id: "all", label: "全部考季" },
      { id: "s", label: "夏季" },
      { id: "w", label: "冬季" },
      { id: "m", label: "春季" }
    ];
    var seasonChips = seasons.map(function (s) {
      return '<button type="button" class="chip' + (activeSeason === s.id ? " is-active" : "") +
        '" data-season="' + s.id + '">' + s.label + "</button>";
    }).join("");

    var hint = isCaie && P.hintFor(code);
    return '<div class="alevel-filters">' +
      '<div class="alevel-filter-row">' +
        '<label class="alevel-year-select">年份<select id="alevel-year">' + yearOpts + "</select></label>" +
        '<div class="filters alevel-season-filters">' + seasonChips + "</div></div>" +
      (isCaie ? '<div class="alevel-filter-row alevel-filter-row--paper">' +
        '<span class="alevel-filter-label">卷别</span>' + renderComponentChips(components) + "</div>" : "") +
      (hint ? '<p class="alevel-paper-hint">' + Y.esc(hint) + "</p>" : "") +
      "</div>";
  }

  function paint() {
    var items = filteredItems();
    var pairs = P.pairRows(items);
    var updated = subject.updatedYear ? "更新至 " + subject.updatedYear : "";
    var qpN = allItems.filter(function (it) { return it.type === "qp"; }).length;
    var components = isCaie ? P.componentsPresent(code, allItems) : [];

    var label = boardMeta ? (boardMeta.label || boardMeta.id) : board;
    document.title = label + " " + code + " " + subject.nameZh + " · A-Level · 优益思达";

    var crumb = '<div class="minimal-crumb cam-crumb">' +
      '<a href="index.html">首页</a> <span class="crumb-sep" aria-hidden="true">★</span> ' +
      '<a href="zone.html?zone=mock&s=alevel">模考区</a> <span class="crumb-sep" aria-hidden="true">★</span> ' +
      '<a href="alevel.html?board=' + encodeURIComponent(board) + '">A-Level</a> <span class="crumb-sep" aria-hidden="true">★</span> ' +
      Y.esc(subject.nameZh) + "</div>";

    var hero = '<div class="cam-hero alevel-hero">' +
      '<div class="cam-hero__badge alevel-hero__badge"><div class="lbl">' + Y.esc(label) + '</div><div class="num">' +
        Y.esc(code) + "</div></div>" +
      "<div><h1>" + Y.esc(subject.nameZh) + ' <span class="alevel-hero__en">' + Y.esc(subject.name) + "</span></h1>" +
      '<div class="meta">' + Y.esc(updated) + (updated && qpN ? " · " : "") +
        (qpN ? qpN + " 套真题" : "") + "</div></div></div>";

    contentEl.innerHTML = crumb + hero + renderFilters(components) +
      '<div class="alevel-results-meta">共 ' + pairs.length + " 套</div>" +
      (isCaie ? renderCaieTable(items) : renderFlatTable(items));

    var yearSel = document.getElementById("alevel-year");
    if (yearSel) {
      yearSel.addEventListener("change", function () {
        activeYear = yearSel.value;
        paint();
      });
    }
  }

  contentEl.addEventListener("click", function (e) {
    var compChip = e.target.closest(".alevel-component-filters .chip");
    if (compChip) {
      activeComponent = compChip.getAttribute("data-component");
      paint();
      return;
    }
    var chip = e.target.closest(".alevel-season-filters .chip");
    if (chip) {
      activeSeason = chip.getAttribute("data-season");
      paint();
    }
  });

  A.loadCatalog().then(function (catalog) {
    boardMeta = A.boardOf(catalog, board);
    subject = A.subjectOf(catalog, board, code);
    if (!subject) {
      contentEl.innerHTML = '<div class="state state--brand"><h3>未找到该科目</h3>' +
        '<p><a href="alevel.html">返回 A-Level 首页</a></p></div>';
      return;
    }
    allItems = A.itemsForSubject(catalog, board, code);
    isCaie = board === "caie" && !!P.schema(code);
    paint();
  }).catch(function (err) {
    contentEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + Y.esc(err.message) + "</p></div>";
  });
})();
