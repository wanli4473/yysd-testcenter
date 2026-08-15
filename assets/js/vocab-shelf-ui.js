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

  // ponytail: id→emoji map; theme ids arrive as "theme:chem"
  var BOOK_EMOJI = {
    gaozhong: "📚",
    cet4: "📗",
    special: "🎯",
    cet6: "📘",
    tem: "🎓",
    kaoyan: "📖",
    gaokao: "🏫",
    bec: "💼",
    gmat: "📊",
    gre: "🧠",
    sat: "✏️",
    toeic: "🪪",
    toefl: "✈️",
    ielts: "🌏",
    primary: "🌱",
    junior: "🚌",
    senior: "🎒",
    nce: "📕",
    oxford3000: "📙",
    collins: "⭐",
    phrases: "💬",
    chem: "🧪",
    geo: "🗺️",
    math: "🔢",
    phys: "⚛️",
    animals: "🐾",
    plants: "🌿",
    food: "🍜",
    urban: "🏙️",
    travel: "🚗",
    edu: "🔬",
    work: "💼",
    festivals: "🎉",
    literature: "🎨",
    sports: "⚽",
    game: "🎮",
    film: "🎬",
    music: "🎵"
  };
  var TAG_EMOJI = {
    exam: "📗",
    abroad: "✈️",
    k12: "🎒",
    learning: "📖",
    subject: "📐",
    nature: "🌿",
    life: "🏠",
    arts: "🎭",
    media: "📺"
  };

  function bookEmoji(b) {
    var raw = String((b && b.id) || "");
    var id = raw.indexOf("theme:") === 0 ? raw.slice(6) : raw;
    id = id.toLowerCase();
    if (BOOK_EMOJI[id]) return BOOK_EMOJI[id];
    var label = String((b && b.label) || "");
    var hay = id + " " + label;
    if (/高中/.test(label) && (b && b.kind) === "main") return "📚";
    if (/专项/.test(label)) return "🎯";
    if (/六级|cet-?6/i.test(hay)) return "📘";
    if (/四级|cet-?4/i.test(hay)) return "📗";
    if (/专四|专八/i.test(hay)) return "🎓";
    if (/考研/i.test(hay)) return "📖";
    if (/托福|toefl/i.test(hay)) return "✈️";
    if (/雅思|ielts/i.test(hay)) return "🌏";
    if (/托业|toeic/i.test(hay)) return "🪪";
    if (/化学/.test(label)) return "🧪";
    if (/地理/.test(label)) return "🗺️";
    if (/数学/.test(label)) return "🔢";
    if (/物理/.test(label)) return "⚛️";
    if (/动物/.test(label)) return "🐾";
    if (/植物/.test(label)) return "🌿";
    if (/吃喝|美食|食物/.test(label)) return "🍜";
    if (/城市/.test(label)) return "🏙️";
    if (/出行|旅行|交通/.test(label)) return "🚗";
    if (/科教|教育/.test(label)) return "🔬";
    if (/职业|职场/.test(label)) return "💼";
    if (/节日/.test(label)) return "🎉";
    if (/文学|艺术/.test(label)) return "🎨";
    if (/体育/.test(label)) return "⚽";
    if (/游戏/.test(label)) return "🎮";
    if (/影视|电影/.test(label)) return "🎬";
    if (/音乐|广播/.test(label)) return "🎵";
    if (/短语/.test(label)) return "💬";
    if (/柯林斯/.test(label)) return "⭐";
    var tag = String((b && b.tag) || "").toLowerCase();
    if (TAG_EMOJI[tag]) return TAG_EMOJI[tag];
    return "📗";
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
      var tiles = books.map(function (b) {
        var added = !!onShelf[b.id];
        var wc = b.wordCount != null ? (b.wordCount + " 词 · ") : "";
        return '<div class="vs-bento-tile' + (added ? " is-on-shelf" : "") +
          '" data-id="' + esc(b.id) + '">' +
          '<span class="vs-bento-emoji" aria-hidden="true">' + bookEmoji(b) + "</span>" +
          "<b class=\"vs-bento-title\">" + esc(b.label) + "</b>" +
          '<span class="vs-bento-meta">' + esc(wc + b.listCount + " List · " + (b.tag || b.kind)) +
          "</span>" +
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
        '<div class="vs-bento" id="vs-list">' +
          (tiles || '<p class="vs-empty">没有匹配的词书</p>') +
        "</div>";

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
        var row = btn.closest("[data-id]");
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
          '<a class="btn btn--ghost btn--sm" href="vocab-quiz.html?book=' +
            encodeURIComponent(book.id) + '">单词检测</a>' +
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
