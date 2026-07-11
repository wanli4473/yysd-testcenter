/* =========================================================================
   alevel-common.js — A-Level catalog loader + shared render helpers
   ========================================================================= */
window.YYSD_ALEVEL = (function () {
  "use strict";
  var Y = window.YYSD;

  var SEASON_ORDER = { w: 1, s: 2, m: 3 };
  var _catalogPromise = null;

  function catalogUrl() {
    var base = location.pathname.replace(/\/[^/]*$/, "/");
    return (base.endsWith("/admin/") ? "../" : "") + "library/alevel-catalog.json";
  }

  function loadCatalog() {
    if (_catalogPromise) return _catalogPromise;
    _catalogPromise = fetch(catalogUrl()).then(function (r) {
      if (!r.ok) throw new Error("alevel-catalog.json HTTP " + r.status);
      return r.json();
    }).catch(function (err) {
      _catalogPromise = null;
      throw err;
    });
    return _catalogPromise;
  }

  function hasContent(catalog) {
    return !!(catalog && catalog.items && catalog.items.length);
  }

  function boardOf(catalog, boardId) {
    return (catalog.boards || []).find(function (b) { return b.id === boardId; }) || null;
  }

  function subjectOf(catalog, boardId, code) {
    var board = boardOf(catalog, boardId);
    if (!board) return null;
    var key = String(code).toUpperCase();
    return (board.subjects || []).find(function (s) {
      return String(s.code).toUpperCase() === key;
    }) || null;
  }

  function itemsForSubject(catalog, boardId, code) {
    var key = String(code).toUpperCase();
    return (catalog.items || []).filter(function (it) {
      return it.board === boardId && String(it.code).toUpperCase() === key;
    });
  }

  function itemById(catalog, id) {
    return (catalog.items || []).find(function (it) { return it.id === id; }) || null;
  }

  function qpCount(catalog) {
    return (catalog.items || []).filter(function (it) { return it.type === "qp"; }).length;
  }

  function yearsFor(items, type) {
    var set = {};
    items.forEach(function (it) {
      if (type && it.type !== type) return;
      set[it.year] = true;
    });
    return Object.keys(set).map(Number).sort(function (a, b) { return b - a; });
  }

  function sortItems(items) {
    return items.slice().sort(function (a, b) {
      if (b.year !== a.year) return b.year - a.year;
      var sa = SEASON_ORDER[a.season] || 9;
      var sb = SEASON_ORDER[b.season] || 9;
      if (sa !== sb) return sa - sb;
      var P = window.YYSD_ALEVEL_PAPERS;
      if (P && P.comparePaper) {
        var cmp = P.comparePaper(a.code, a.paper, b.paper);
        if (cmp !== 0) return cmp;
      } else if (a.paper !== b.paper) {
        return String(a.paper).localeCompare(String(b.paper), undefined, { numeric: true });
      }
      return a.type === "qp" ? -1 : 1;
    });
  }

  function viewHref(item, prefix) {
    return (prefix || "") + "alevel-view.html?id=" + encodeURIComponent(item.id);
  }

  function subjectHref(boardId, code, prefix) {
    return (prefix || "") + "alevel-subject.html?board=" + encodeURIComponent(boardId) +
      "&code=" + encodeURIComponent(code);
  }

  function hubHref(prefix) {
    return (prefix || "") + "alevel.html";
  }

  function fileHref(item, prefix) {
    return (prefix || "") + "library/" + item.file;
  }

  function seasonBadge(season) {
    var map = { m: "春", s: "夏", w: "冬" };
    return map[season] || season;
  }

  function subjectCardHTML(sub, prefix, boardLabel) {
    var updated = sub.updatedYear ? "已更新至 " + sub.updatedYear + " 年" : "持续更新中";
    var count = sub.paperCount ? sub.paperCount + " 套真题" : "即将上线";
    var tag = boardLabel || sub.board || "";
    return '<a class="alevel-subject-card pressable" href="' + subjectHref(sub.board, sub.code, prefix) + '">' +
      '<span class="alevel-subject-card__ico" aria-hidden="true">' + (sub.icon || "📘") + "</span>" +
      "<div><b>" + Y.esc(tag) + " " + Y.esc(sub.code) + " " + Y.esc(sub.nameZh) + "</b>" +
      '<span class="alevel-subject-card__en">' + Y.esc(sub.name) + "</span></div>" +
      '<span class="alevel-subject-card__meta">' + Y.esc(updated) + " · " + Y.esc(count) + "</span>" +
      '<span class="alevel-subject-card__go" aria-hidden="true">→</span></a>';
  }

  function hubBoardHTML(catalog, boardId, prefix) {
    var board = boardOf(catalog, boardId);
    if (!board || !board.subjects.length) {
      return '<div class="soon-box">该考试局内容筹备中，敬请期待。</div>';
    }
    return '<div class="alevel-subject-grid">' +
      board.subjects.map(function (s) {
        return subjectCardHTML(s, prefix, board.label);
      }).join("") +
      "</div>";
  }

  function paperRowHTML(item, prefix) {
    return '<tr class="alevel-paper-row">' +
      "<td>" + item.year + "</td>" +
      '<td><span class="alevel-season-badge alevel-season-badge--' + Y.esc(item.season) + '">' +
        Y.esc(seasonBadge(item.season)) + "</span></td>" +
      "<td>Paper " + Y.esc(item.paper) + "</td>" +
      "<td>" + Y.esc(item.typeLabelZh || item.type) + "</td>" +
      '<td class="alevel-paper-row__actions">' +
        '<a class="btn btn--ghost btn--sm" href="' + viewHref(item, prefix) + '">预览</a>' +
        '<a class="btn btn--ghost btn--sm" href="' + fileHref(item, prefix) +
          '" download target="_blank" rel="noopener">下载</a>' +
      "</td></tr>";
  }

  function catalogPreviewHTML(catalog, prefix, limitPerBoard) {
    var n = limitPerBoard || 3;
    return (catalog.boards || []).map(function (board) {
      if (!board.subjects || !board.subjects.length) return "";
      var subs = board.subjects.slice(0, n);
      return '<div class="alevel-preview-board">' +
        '<div class="alevel-preview-board__head">' +
          "<h3>" + Y.esc(board.labelZh || board.label) + "</h3>" +
          '<a class="section-link" href="' + (prefix || "") + "alevel.html?board=" +
            encodeURIComponent(board.id) + '">查看全部 →</a></div>' +
        '<div class="alevel-subject-grid alevel-subject-grid--compact">' +
          subs.map(function (s) { return subjectCardHTML(s, prefix, board.label); }).join("") +
        "</div></div>";
    }).join("");
  }

  function boardStats(board) {
    var subs = board.subjects || [];
    var active = subs.filter(function (s) { return s.paperCount > 0; });
    var papers = active.reduce(function (n, s) { return n + s.paperCount; }, 0);
    return { subjects: active.length, papers: papers };
  }

  function showcaseSubjectHTML(sub, prefix) {
    var count = sub.paperCount ? sub.paperCount + " 套" : "即将上线";
    return '<a class="home-alevel__subject pressable" href="' + subjectHref(sub.board, sub.code, prefix) + '">' +
      '<span class="home-alevel__subject-ico" aria-hidden="true">' + (sub.icon || "📘") + "</span>" +
      '<span class="home-alevel__subject-body">' +
        "<b>" + Y.esc(sub.code) + " " + Y.esc(sub.nameZh) + "</b>" +
        '<span class="home-alevel__subject-en">' + Y.esc(sub.name) + "</span>" +
      "</span>" +
      '<span class="home-alevel__subject-meta">' + Y.esc(count) + "</span>" +
      '<span class="home-alevel__subject-go" aria-hidden="true">→</span></a>';
  }

  function homeShowcaseHTML(catalog, prefix) {
    var p = prefix || "";
    if (!hasContent(catalog)) {
      return '<section class="home-alevel home-alevel--empty reveal" aria-label="A-Level 真题库">' +
        '<div class="home-alevel__inner">' +
          '<span class="home-alevel__eyebrow">A-LEVEL PAST PAPERS</span>' +
          "<h2>A-Level 真题库</h2>" +
          "<p>CAIE · Edexcel · Oxford AQA 真题筹备中，敬请期待。</p>" +
          '<a class="btn btn--ghost-dark pressable" href="' + hubHref(p) + '">了解更多 →</a>' +
        "</div></section>";
    }

    var boards = catalog.boards || [];
    var qp = qpCount(catalog);
    var subjectTotal = 0;
    var featured = [];

    boards.forEach(function (board) {
      (board.subjects || []).forEach(function (sub) {
        if (sub.paperCount > 0) {
          subjectTotal += 1;
          featured.push(sub);
        }
      });
    });

    featured.sort(function (a, b) { return b.paperCount - a.paperCount; });
    var topSubjects = featured.slice(0, 6);

    var boardCards = boards.map(function (board) {
      var stats = boardStats(board);
      var active = stats.subjects > 0;
      var cls = "home-alevel__board pressable" + (active ? "" : " is-soon");
      var href = active
        ? p + "alevel.html?board=" + encodeURIComponent(board.id)
        : p + "alevel.html?board=" + encodeURIComponent(board.id);
      var meta = active
        ? stats.subjects + " 科目 · " + stats.papers + " 套"
        : "筹备中";
      return '<a class="' + cls + '" href="' + href + '">' +
        '<span class="home-alevel__board-label">' + Y.esc(board.label) + "</span>" +
        '<span class="home-alevel__board-zh">' + Y.esc(board.labelZh || board.label) + "</span>" +
        '<span class="home-alevel__board-meta">' + Y.esc(meta) + "</span>" +
        (active ? '<span class="home-alevel__board-go" aria-hidden="true">→</span>' : "") +
        "</a>";
    }).join("");

    var subjectCards = topSubjects.map(function (sub) {
      return showcaseSubjectHTML(sub, p);
    }).join("");

    return '<section class="home-alevel reveal" aria-label="A-Level 真题库">' +
      '<div class="home-alevel__inner">' +
        '<div class="home-alevel__head">' +
          "<div>" +
            '<span class="home-alevel__eyebrow">A-LEVEL PAST PAPERS</span>' +
            "<h2>A-Level 真题库</h2>" +
            "<p>三大考试局真题试卷与 Mark Scheme · 在线预览 · 免费下载</p>" +
          "</div>" +
          '<a class="btn btn--gold pressable home-alevel__cta" href="' + hubHref(p) + '">进入题库 →</a>' +
        "</div>" +
        '<div class="home-alevel__metrics">' +
          '<div class="home-alevel__metric"><b data-count="' + boards.length + '">' + boards.length + "</b><span>考试局</span></div>" +
          '<div class="home-alevel__metric"><b data-count="' + qp + '">' + qp + "</b><span>真题套数</span></div>" +
          '<div class="home-alevel__metric"><b data-count="' + subjectTotal + '">' + subjectTotal + "</b><span>热门科目</span></div>" +
        "</div>" +
        '<div class="home-alevel__boards" role="list">' + boardCards + "</div>" +
        (subjectCards
          ? '<div class="home-alevel__subjects-head"><h3>热门科目</h3><a class="section-link section-link--light" href="' +
              hubHref(p) + '">查看全部 →</a></div>' +
            '<div class="home-alevel__subjects">' + subjectCards + "</div>"
          : "") +
      "</div></section>";
  }

  return {
    loadCatalog: loadCatalog,
    hasContent: hasContent,
    boardOf: boardOf,
    subjectOf: subjectOf,
    itemsForSubject: itemsForSubject,
    itemById: itemById,
    qpCount: qpCount,
    yearsFor: yearsFor,
    sortItems: sortItems,
    viewHref: viewHref,
    subjectHref: subjectHref,
    hubHref: hubHref,
    fileHref: fileHref,
    seasonBadge: seasonBadge,
    subjectCardHTML: subjectCardHTML,
    hubBoardHTML: hubBoardHTML,
    paperRowHTML: paperRowHTML,
    catalogPreviewHTML: catalogPreviewHTML,
    homeShowcaseHTML: homeShowcaseHTML
  };
})();
