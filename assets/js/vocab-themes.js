/* =========================================================================
   vocab-themes.js — browse-only thematic lexicon (no lesson / test yet)
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var root = document.getElementById("vt-root");
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var navLink = document.querySelector('#nav a[data-zone="study"]');
  if (navLink) navLink.classList.add("is-active");

  var params = new URLSearchParams(location.search);
  var state = {
    cat: (params.get("cat") || "all").trim() || "all",
    theme: (params.get("theme") || "").trim(),
    q: (params.get("q") || "").trim().toLowerCase(),
    wq: (params.get("wq") || "").trim().toLowerCase(),
    catalog: null,
    page: Math.max(1, parseInt(params.get("p") || "1", 10) || 1)
  };
  var PAGE_SIZE = 120;

  function fail(msg) {
    root.innerHTML = '<div class="vt-empty"><p>' + Y.esc(msg) +
      '</p><p><a href="zone.html?zone=study&s=vocab">返回单词区</a></p></div>';
  }

  function setUrl() {
    var u = new URL(location.href);
    u.searchParams.set("cat", state.cat || "all");
    if (state.theme) u.searchParams.set("theme", state.theme);
    else u.searchParams.delete("theme");
    if (state.q) u.searchParams.set("q", state.q);
    else u.searchParams.delete("q");
    if (state.wq) u.searchParams.set("wq", state.wq);
    else u.searchParams.delete("wq");
    if (state.theme && state.page > 1) u.searchParams.set("p", String(state.page));
    else u.searchParams.delete("p");
    history.replaceState(null, "", u.pathname + u.search);
  }

  function filteredThemes() {
    var list = (state.catalog.themes || []).slice();
    if (state.cat && state.cat !== "all") {
      list = list.filter(function (t) { return t.category === state.cat; });
    }
    if (state.q) {
      list = list.filter(function (t) {
        var hay = (t.title + " " + t.desc + " " + (t.preview || []).join(" ")).toLowerCase();
        return hay.indexOf(state.q) >= 0;
      });
    }
    return list.sort(function (a, b) { return a.no - b.no; });
  }

  function sideHTML() {
    return '<aside class="vt-side" aria-label="词库分类">' +
      '<div class="vt-side__label">分类</div>' +
      (state.catalog.categories || []).map(function (c) {
        return '<button type="button" class="vt-side__btn' +
          (state.cat === c.id ? " is-active" : "") +
          '" data-cat="' + Y.esc(c.id) + '">' + Y.esc(c.label) + "</button>";
      }).join("") +
      "</aside>";
  }

  function blockHTML(t) {
    var chips = (t.preview || []).map(function (w) {
      return '<a class="vt-chip" href="?cat=' + encodeURIComponent(state.cat) +
        "&theme=" + encodeURIComponent(t.id) + '">' + Y.esc(w) + "</a>";
    }).join("");
    return '<article class="vt-block">' +
      '<div class="vt-block__head">' +
        '<h2 class="vt-block__title">' + Y.esc(t.title) + "</h2>" +
        '<span class="vt-block__count">' + (t.count || 0) + " 词</span>" +
      "</div>" +
      '<p class="vt-block__desc">' + Y.esc(t.desc || "") + "</p>" +
      '<div class="vt-chips">' + chips + "</div>" +
      '<div class="vt-block__actions">' +
        '<a class="btn btn--primary btn--sm" href="?cat=' + encodeURIComponent(state.cat) +
          "&theme=" + encodeURIComponent(t.id) + '">查看词表 ›</a>' +
      "</div></article>";
  }

  function detailHTML(t, detail) {
    var all = (detail && detail.words) || [];
    var filtered = all;
    if (state.wq) {
      filtered = all.filter(function (w) {
        return String(w.word || "").toLowerCase().indexOf(state.wq) >= 0 ||
          String(w.meaning || "").indexOf(state.wq) >= 0;
      });
    }
    var pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    var start = (state.page - 1) * PAGE_SIZE;
    var slice = filtered.slice(start, start + PAGE_SIZE);
    var grid = slice.map(function (w) {
      return '<div class="vt-word">' +
        '<div class="vt-word__en">' + Y.esc(w.word) + "</div>" +
        (w.ipa ? '<span class="vt-word__ipa">' + Y.esc(w.ipa) + "</span>" : "") +
        '<div class="vt-word__zh">' + Y.esc(w.meaning || "—") + "</div>" +
        (w.pos ? '<span class="vt-word__pos">' + Y.esc(w.pos) + "</span>" : "") +
        "</div>";
    }).join("") || '<div class="vt-empty">没有匹配的单词。</div>';

    var pager = "";
    if (pages > 1) {
      pager = '<div class="vt-block__actions" style="margin-top:14px">' +
        (state.page > 1
          ? '<button type="button" class="btn btn--ghost btn--sm" data-page="' + (state.page - 1) + '">上一页</button>'
          : "") +
        '<span class="vt-toolbar__meta">第 ' + state.page + " / " + pages + " 页 · 共 " + filtered.length + " 词</span>" +
        (state.page < pages
          ? '<button type="button" class="btn btn--ghost btn--sm" data-page="' + (state.page + 1) + '">下一页</button>'
          : "") +
        "</div>";
    }

    return '<div class="vt-detail">' +
      '<a class="vt-detail__back" href="?cat=' + encodeURIComponent(state.cat) + '">← 返回分类列表</a>' +
      '<div class="vt-block__head">' +
        '<h2 class="vt-block__title">' + Y.esc(t.title) + "</h2>" +
        '<span class="vt-block__count">' + all.length + " 词</span>" +
      "</div>" +
      '<p class="vt-block__desc">' + Y.esc(t.desc || "") + "</p>" +
      '<label class="vt-search" style="max-width:360px;margin:8px 0 14px;display:block">在本词库搜索' +
        '<input type="search" id="vt-wq" placeholder="英文或中文" value="' +
        Y.esc(state.wq) + '" autocomplete="off"></label>' +
      '<div class="vt-wordgrid">' + grid + "</div>" + pager +
      "</div>";
  }

  function bindChrome(detail) {
    root.querySelectorAll("[data-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.cat = btn.getAttribute("data-cat") || "all";
        state.theme = "";
        state.page = 1;
        state.wq = "";
        setUrl();
        renderList();
      });
    });
    var qEl = document.getElementById("vt-q");
    if (qEl) {
      var timer = null;
      qEl.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.q = String(qEl.value || "").trim().toLowerCase();
          setUrl();
          renderList();
          var again = document.getElementById("vt-q");
          if (again) {
            again.focus();
            var len = again.value.length;
            again.setSelectionRange(len, len);
          }
        }, 180);
      });
    }
    var wqEl = document.getElementById("vt-wq");
    if (wqEl && detail) {
      var t2 = null;
      wqEl.addEventListener("input", function () {
        clearTimeout(t2);
        t2 = setTimeout(function () {
          state.wq = String(wqEl.value || "").trim().toLowerCase();
          state.page = 1;
          setUrl();
          root.querySelector(".vt-main").innerHTML = detailHTML(detail.theme, detail.data);
          bindChrome(detail);
          var again = document.getElementById("vt-wq");
          if (again) {
            again.focus();
            var len = again.value.length;
            again.setSelectionRange(len, len);
          }
        }, 180);
      });
    }
    root.querySelectorAll("[data-page]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.page = Number(btn.getAttribute("data-page")) || 1;
        setUrl();
        if (detail) {
          root.querySelector(".vt-main").innerHTML = detailHTML(detail.theme, detail.data);
          bindChrome(detail);
          window.scrollTo(0, 0);
        }
      });
    });
  }

  function renderList() {
    var themes = filteredThemes();
    var main = '<div class="vt-toolbar">' +
      '<div class="vt-toolbar__meta">共 ' + themes.length + " 个词库 · 仅浏览</div>" +
      '<label class="vt-search">搜索词库' +
        '<input type="search" id="vt-q" placeholder="如：雅思 / GRE / 动物" value="' +
        Y.esc(state.q) + '" autocomplete="off"></label>' +
      "</div>" +
      (themes.length ? themes.map(blockHTML).join("") : '<div class="vt-empty">没有匹配的词库。</div>');
    root.innerHTML = sideHTML() + '<div class="vt-main">' + main + "</div>";
    bindChrome(null);
  }

  function renderDetail(t) {
    root.innerHTML = sideHTML() + '<div class="vt-main"><div class="state state--brand">' +
      '<div class="spinner spinner--brand"></div>加载词表…</div></div>';
    bindChrome(null);
    var url = "library/" + t.dataFile;
    fetch(url).then(function (r) {
      if (!r.ok) throw new Error("词表加载失败");
      return r.json();
    }).then(function (data) {
      setUrl();
      root.innerHTML = sideHTML() + '<div class="vt-main">' + detailHTML(t, data) + "</div>";
      bindChrome({ theme: t, data: data });
    }).catch(function (e) {
      fail((e && e.message) || "加载失败");
    });
  }

  function render() {
    if (state.theme) {
      var hit = (state.catalog.themes || []).filter(function (x) { return x.id === state.theme; })[0];
      if (!hit) { state.theme = ""; renderList(); return; }
      renderDetail(hit);
      return;
    }
    setUrl();
    renderList();
  }

  function boot() {
    fetch("library/study/vocab-themes/themes.json").then(function (r) {
      if (!r.ok) throw new Error("词库目录加载失败");
      return r.json();
    }).then(function (cat) {
      state.catalog = cat;
      if (!(state.catalog.themes || []).length) {
        fail("分类词库还是空的。");
        return;
      }
      render();
    }).catch(function (e) {
      fail((e && e.message) || "加载失败");
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
