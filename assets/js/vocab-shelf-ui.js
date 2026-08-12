/* vocab-shelf-ui.js — bookshelf hub + book list picker */
(function () {
  "use strict";
  var Y = window.YYSD;
  var A = window.YYSD_AUTH;
  var content = document.getElementById("content");
  var params = new URLSearchParams(location.search);
  var bookParam = (params.get("book") || "").trim();
  var view = (params.get("view") || "").trim(); // "" | catalog

  function esc(s) {
    return Y && Y.esc ? Y.esc(String(s == null ? "" : s)) : String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function needAuth() {
    if (!A || !A.getToken || !A.getToken()) {
      location.href = "login.html?next=" + encodeURIComponent(location.pathname + location.search);
      return false;
    }
    return true;
  }

  function api(path, opts) {
    return A.api(path, opts || {});
  }

  function renderShelf(shelf) {
    var books = (shelf && shelf.books) || [];
    var cards = books.length
      ? books.map(function (b) {
          var meta = b.book || {};
          var done = b.doneLists || 0;
          var total = meta.listCount || 0;
          return '<a class="vs-card" href="vocab-shelf.html?book=' + encodeURIComponent(b.bookId) + '">' +
            '<span class="vs-card__tag">' + esc(meta.tag || meta.kind || "") + "</span>" +
            '<b class="vs-card__title">' + esc(meta.label || b.bookId) + "</b>" +
            '<span class="vs-card__meta">进度 ' + done + " / " + total + " List</span>" +
            "</a>";
        }).join("")
      : '<p class="vs-empty">书架还是空的。先去添加一本词书吧。</p>';

    content.innerHTML =
      '<div class="vs-hero bento-panel">' +
        '<h1 class="bento-panel__title">我的词库书架</h1>' +
        '<p class="bento-panel__desc">加入词书后才能学习与检测。可随时移除（学习进度会清零）。</p>' +
        '<div class="vs-actions">' +
          '<a class="btn btn--primary btn--sm" href="vocab-shelf.html?view=catalog">添加词书</a>' +
          '<a class="btn btn--ghost btn--sm" href="zone.html?zone=study&s=vocab">← 单词区</a>' +
        "</div>" +
      "</div>" +
      '<div class="vs-grid">' + cards + "</div>";
  }

  function renderCatalog(catalog, shelf) {
    var onShelf = {};
    ((shelf && shelf.books) || []).forEach(function (b) { onShelf[b.bookId] = true; });
    var q = "";
    function paint(filter) {
      var books = (catalog.books || []).filter(function (b) {
        if (!filter) return true;
        var hay = (b.label + " " + b.id + " " + (b.tag || "")).toLowerCase();
        return hay.indexOf(filter.toLowerCase()) >= 0;
      });
      var rows = books.map(function (b) {
        var added = !!onShelf[b.id];
        var wc = b.wordCount != null ? (b.wordCount + " 词 · ") : "";
        return '<div class="vs-row" data-id="' + esc(b.id) + '">' +
          '<div><b>' + esc(b.label) + '</b>' +
          '<span class="vs-row__meta">' + esc(wc + b.listCount + " List · " + (b.tag || b.kind)) +
          "</span></div>" +
          (added
            ? '<button type="button" class="btn btn--ghost btn--sm" data-act="remove">移出书架</button>'
            : '<button type="button" class="btn btn--primary btn--sm" data-act="add">加入书架</button>') +
          "</div>";
      }).join("");
      content.innerHTML =
        '<div class="vs-hero bento-panel">' +
          '<h1 class="bento-panel__title">添加词书</h1>' +
          '<p class="bento-panel__desc">高中 / 四级 / 雅思专项与分类主题词书平铺可选。</p>' +
          '<div class="vs-actions">' +
            '<a class="btn btn--ghost btn--sm" href="vocab-shelf.html">← 我的书架</a>' +
            '<label class="catalog-search vs-search"><input type="search" id="vs-q" placeholder="搜索词书" value="' +
              esc(q) + '"></label>' +
          "</div>" +
        "</div>" +
        '<div class="vs-list" id="vs-list">' + (rows || '<p class="vs-empty">没有匹配的词书</p>') + "</div>";

      var input = document.getElementById("vs-q");
      if (input) {
        input.oninput = function () {
          q = input.value || "";
          paint(q);
          var el = document.getElementById("vs-q");
          if (el) { el.focus(); el.setSelectionRange(q.length, q.length); }
        };
      }
      document.getElementById("vs-list").onclick = function (e) {
        var btn = e.target.closest("button[data-act]");
        if (!btn) return;
        var row = btn.closest(".vs-row");
        var id = row && row.getAttribute("data-id");
        if (!id) return;
        var act = btn.getAttribute("data-act");
        btn.disabled = true;
        api("/api/vocab-shelf/" + act, { method: "POST", body: { bookId: id } })
          .then(function () {
            if (act === "add") onShelf[id] = true;
            else delete onShelf[id];
            paint(q);
          })
          .catch(function (err) {
            alert((err && err.message) || "操作失败");
            btn.disabled = false;
          });
      };
    }
    paint("");
  }

  function renderBook(detail) {
    var book = detail.book || {};
    var lists = detail.lists || [];
    var rows = lists.map(function (l) {
      var hint = l.done
        ? "已学完"
        : (l.wordIdx > 0 ? ("学到第 " + (l.wordIdx + 1) + " 词") : "未开始");
      var wc = l.wordCount != null ? l.wordCount + " 词 · " : "";
      return '<a class="vs-list-row" href="vocab-learn.html?book=' + encodeURIComponent(book.id) +
        "&list=" + encodeURIComponent(l.id) + '">' +
        "<div><b>" + esc(l.label) + "</b>" +
        '<span class="vs-row__meta">' + esc(wc + hint) + "</span></div>" +
        '<span class="vs-go">' + (l.done ? "复习 ›" : "学习 ›") + "</span></a>";
    }).join("");

    content.innerHTML =
      '<div class="vs-hero bento-panel">' +
        '<h1 class="bento-panel__title">' + esc(book.label || book.id) + "</h1>" +
        '<p class="bento-panel__desc">' + esc((book.listCount || 0) + " 个 List · 点开开始学习") + "</p>" +
        '<div class="vs-actions">' +
          '<a class="btn btn--ghost btn--sm" href="vocab-shelf.html">← 书架</a>' +
          '<button type="button" class="btn btn--ghost btn--sm" id="vs-remove">移出书架</button>' +
        "</div>" +
      "</div>" +
      '<div class="vs-list">' + rows + "</div>";

    document.getElementById("vs-remove").onclick = function () {
      if (!confirm("移出后学习进度将清零，确定？")) return;
      api("/api/vocab-shelf/remove", { method: "POST", body: { bookId: book.id } })
        .then(function () { location.href = "vocab-shelf.html"; })
        .catch(function (e) { alert((e && e.message) || "移除失败"); });
    };
  }

  function boot() {
    if (!needAuth()) return;
    content.innerHTML = '<div class="state state--brand"><div class="spinner spinner--brand"></div>正在加载…</div>';

    if (bookParam) {
      api("/api/vocab-shelf/book?bookId=" + encodeURIComponent(bookParam))
        .then(renderBook)
        .catch(function (e) {
          content.innerHTML = '<div class="state"><p>' + esc((e && e.message) || "加载失败") +
            '</p><p><a class="btn btn--primary btn--sm" href="vocab-shelf.html">回书架</a></p></div>';
        });
      return;
    }

    Promise.all([
      api("/api/vocab-shelf/bookshelf"),
      view === "catalog" ? api("/api/vocab-shelf/catalog") : Promise.resolve(null)
    ]).then(function (pair) {
      if (view === "catalog") renderCatalog(pair[1], pair[0]);
      else renderShelf(pair[0]);
    }).catch(function (e) {
      content.innerHTML = '<div class="state"><p>' + esc((e && e.message) || "加载失败") + "</p></div>";
    });
  }

  if (window.YYSD_DIAG_GATE) {
    window.YYSD_DIAG_GATE.ensure({ requireLogin: true }).then(function (ok) {
      if (ok) boot();
    });
  } else {
    boot();
  }
})();
