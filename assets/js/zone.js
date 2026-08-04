/* =========================================================================
   zone.js — zone catalog with search, tier filters, collapsible groups
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var params = new URLSearchParams(location.search);
  var zone = params.get("zone");
  if (!Y.ZONE[zone]) zone = "mock";
  var focusSubject = params.get("s") || "";
  var z = Y.ZONE[zone];
  var nav = Y.navOf(zone);
  var activeCat = "all";
  var searchQuery = "";
  var camTier = "all";

  document.body.classList.add("zone-page", "zone-page--" + zone);

  document.title = z.label + " · 优益思达国际课程中心";
  document.getElementById("crumb-zone").textContent = z.label;
  document.getElementById("zone-en").textContent = z.en || z.label;
  document.getElementById("zone-title").textContent = z.label;
  document.getElementById("zone-desc").textContent = z.desc;

  var navLink = document.querySelector('#nav a[data-zone="' + zone + '"]');
  if (navLink) navLink.classList.add("is-active");

  var filtersEl = document.getElementById("filters");
  var subFiltersEl = document.getElementById("sub-filters");
  var searchInput = document.getElementById("catalog-search");
  var contentEl = document.getElementById("content");
  var toolbarEl = document.querySelector(".catalog-toolbar");
  var allItems = [];
  var alevelCatalog = null;

  function catOfSubject(s) {
    function walk(nodes, top) {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.subject === s) return top;
        if (n.children) {
          var hit = walk(n.children, top);
          if (hit) return hit;
        }
      }
      return null;
    }
    for (var i = 0; i < nav.length; i++) {
      var c = nav[i];
      if (c.subject === s) return c;
      if (c.children) {
        var hit = walk(c.children, c);
        if (hit) return hit;
      }
    }
    return null;
  }
  // ponytail: legacy s=ielts → hub; subject keys map to flat NAV.mock
  if (focusSubject === "ielts") activeCat = "all";
  else if (focusSubject === "cambridge-listening") activeCat = "listening";
  else if (focusSubject === "cambridge-reading") activeCat = "reading";
  else if (focusSubject === "cambridge-writing") activeCat = "writing";
  else if (focusSubject) {
    var byKey = nav.filter(function (c) { return c.key === focusSubject; })[0];
    if (byKey) activeCat = byKey.key;
    else {
      var fc = catOfSubject(focusSubject);
      if (fc) activeCat = fc.key;
    }
  }
  // External IELTS hubs: deep-link chips skip zone catalog
  if (zone === "mock") {
    var landCat = nav.filter(function (c) { return c.key === activeCat; })[0];
    if (landCat && landCat.href) {
      location.replace(landCat.href);
      return;
    }
  }

  function showCambridgeSubFilters() {
    return zone === "mock" &&
      (activeCat === "listening" || activeCat === "reading" || activeCat === "writing" || activeCat === "mock") &&
      !searchQuery;
  }

  function buildSubFilters() {
    if (!subFiltersEl) return;
    if (!showCambridgeSubFilters()) {
      subFiltersEl.innerHTML = "";
      subFiltersEl.hidden = true;
      return;
    }
    subFiltersEl.hidden = false;
    var tiers = [
      { id: "all", label: "全部册" },
      { id: "new", label: "最新 Vol.19+" },
      { id: "mid", label: "进阶 Vol.13–18" },
      { id: "base", label: "基础 Vol.7–12" }
    ];
    subFiltersEl.innerHTML = tiers.map(function (t) {
      return '<button type="button" class="chip chip--sub' + (camTier === t.id ? " is-active" : "") +
        '" data-tier="' + t.id + '">' + t.label + "</button>";
    }).join("");
  }

  function catHasContent(cat) {
    if (cat.key === "alevel") {
      return window.YYSD_ALEVEL && alevelCatalog && window.YYSD_ALEVEL.hasContent(alevelCatalog);
    }
    if (cat.key === "mock" || cat.key === "ielts") return Y.camVolumes(allItems).length > 0;
    if (cat.key === "speaking") return true;
    if (cat.key === "writing") {
      return Y.camVolumes(allItems.filter(function (it) { return it.subject === "cambridge-writing"; })).length > 0;
    }
    if (cat.key === "vocab") return Y.vocabBooksForZone(allItems).length > 0;
    if (cat.href) return true;
    if (cat.children) {
      return cat.children.some(function (ch) {
        if (Y.isCambridge(ch.subject)) {
          return Y.camVolumes(allItems.filter(function (it) { return it.subject === ch.subject; })).length > 0;
        }
        return itemsOf(ch.subject).length > 0;
      });
    }
    if (Y.isCambridge(cat.subject)) {
      return Y.camVolumes(allItems.filter(function (it) { return it.subject === cat.subject; })).length > 0;
    }
    return countOf(cat.subject) > 0;
  }

  function visibleNav() {
    var list = zone === "mock" ? nav.filter(catHasContent) : nav;
    // ponytail: 精听挂在听力 links 下，不占独立 chip / hub 列
    if (zone === "mock") list = list.filter(function (c) { return c.key !== "jingting"; });
    return list;
  }

  function navCat(key) {
    return nav.filter(function (c) { return c.key === key; })[0];
  }

  function buildFilters() {
    var chips = ['<button type="button" class="chip' + (activeCat === "all" ? " is-active" : "") + '" data-s="all">全部</button>'];
    visibleNav().forEach(function (c) {
      chips.push('<button type="button" class="chip' + (activeCat === c.key ? " is-active" : "") +
        '" data-s="' + c.key + '">' + Y.esc(c.label) + "</button>");
    });
    // 精听从听力入口进入时，顶栏补一枚当前 chip
    if (activeCat === "jingting") {
      chips.push('<button type="button" class="chip is-active" data-s="jingting">听力精听</button>');
    }
    filtersEl.innerHTML = chips.join("");
    // ponytail: only reset after items load; early empty nav was wiping s=ielts → all
    if (zone === "mock" && activeCat !== "all" && activeCat !== "jingting" && allItems.length &&
        !visibleNav().some(function (c) { return c.key === activeCat; })) {
      activeCat = "all";
      filtersEl.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("is-active", c.getAttribute("data-s") === "all");
      });
      syncZoneQuery();
    }
    buildSubFilters();
  }

  filtersEl.addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b || b.closest("#sub-filters")) return;
    var next = b.getAttribute("data-s");
    var cat = nav.filter(function (c) { return c.key === next; })[0];
    if (cat && cat.href) {
      (window.YYSD_GO || function (h) { location.href = h; })(cat.href);
      return;
    }
    filtersEl.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
    b.classList.add("is-active");
    activeCat = next;
    syncZoneQuery();
    buildSubFilters();
    if (zone === "study" && next === "vocab" && window.YYSD_DIAG_GATE) {
      window.YYSD_DIAG_GATE.ensure({ requireLogin: true }).then(function (ok) {
        if (ok) render();
      });
      return;
    }
    render();
  });

  if (subFiltersEl) {
    subFiltersEl.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      subFiltersEl.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
      b.classList.add("is-active");
      camTier = b.getAttribute("data-tier");
      render();
    });
  }

  if (searchInput) {
    searchInput.placeholder = zone === "mock" ? "搜索模考、册数、Test…" : "搜索内容名称…";
    var onSearch = window.YYSD_DEBOUNCE ? window.YYSD_DEBOUNCE(function () {
      searchQuery = searchInput.value.trim();
      buildSubFilters();
      render();
    }, 200) : function () {
      searchQuery = searchInput.value.trim();
      buildSubFilters();
      render();
    };
    searchInput.addEventListener("input", onSearch);
  }

  function itemsOf(subject) {
    return allItems.filter(function (it) { return it.subject === subject; })
      .sort(function (a, b) {
        return String(a.title).localeCompare(String(b.title), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
      });
  }

  function emptyBox(title, desc, href, cta) {
    return '<div class="soon-box soon-box--rich">' +
      "<h3>" + Y.esc(title) + "</h3>" +
      "<p>" + Y.esc(desc) + "</p>" +
      (href
        ? '<a class="btn btn--ghost btn--sm" href="' + Y.esc(href) + '">' + Y.esc(cta || "返回雅思") + "</a>"
        : "") +
      "</div>";
  }

  function leafBody(subject, skill) {
    if (subject === "ielts-speaking") {
      return '<div class="spk-cta-grid bento-grid bento-grid--3">' +
        '<a class="bento-cta" href="speaking.html">' +
          '<span class="bento-cta__badge">Part 1</span>' +
          '<div><p class="bento-cta__title">口语模考</p>' +
          '<p class="bento-cta__desc">录音作答 · AI 四维评分</p></div>' +
          '<span class="spk-cta-go">进入 ›</span></a>' +
        '<a class="bento-cta bento-cta--teal" href="speaking-select.html">' +
          '<span class="bento-cta__badge">专项</span>' +
          '<div><p class="bento-cta__title">专项选题</p>' +
          '<p class="bento-cta__desc">勾选话题，组一套 Part 1</p></div>' +
          '<span class="spk-cta-go">选题 ›</span></a>' +
        '<a class="bento-cta bento-cta--orange" href="ai-tutor.html">' +
          '<span class="bento-cta__badge">AI</span>' +
          '<div><p class="bento-cta__title">AI 雅思老师</p>' +
          '<p class="bento-cta__desc">口语机经 / 写作批改</p></div>' +
          '<span class="spk-cta-go">进入 ›</span></a></div>';
    }
    if (Y.isCambridge(subject)) {
      var vols = Y.camVolumes(allItems.filter(function (it) { return it.subject === subject; }));
      if (vols.length) {
        return '<div class="vol-grid">' + vols.map(function (v) {
          return Y.camVolumeCardHTML(v, "", allItems, { skill: skill || "" });
        }).join("") + "</div>";
      }
    } else if (subject === "jingting") {
      var jt = itemsOf(subject);
      if (jt.length && Y.jingtingCatalogHTML) return Y.jingtingCatalogHTML(jt, "");
      if (jt.length) {
        return '<div class="exam-grid">' + jt.map(function (it) { return Y.cardHTML(it, ""); }).join("") + "</div>";
      }
    } else {
      var its = itemsOf(subject);
      if (its.length) {
        if (its.length > 8 && Y.isVocabListSubject(subject)) {
          return '<div class="catalog-rows">' + its.map(function (it) { return Y.compactItemRowHTML(it, ""); }).join("") + "</div>";
        }
        return '<div class="exam-grid">' + its.map(function (it) { return Y.cardHTML(it, ""); }).join("") + "</div>";
      }
    }
    return emptyBox("该板块即将上线", "内容准备中，先去其他科目练习，或从雅思总览重新选择。", "zone.html?zone=mock", "返回雅思总览");
  }

  function countOf(subject) {
    if (subject === "ielts-speaking") return 1;
    if (Y.isCambridge(subject)) return Y.camVolumes(allItems.filter(function (it) { return it.subject === subject; })).length;
    return itemsOf(subject).length;
  }
  function unitOf(subject) { return Y.isCambridge(subject) ? " 册" : " 份"; }

  // Vocab hub — 作业模式（老师布置 / 系统学习）；游戏见 word-realm.html
  function vocabBentoHTML(vbooks) {
    var total = 0;
    var done = 0;
    var nextItem = null;
    var nextBook = null;
    var entryTint = { gaozhong: "navy", cet4: "gold", special: "teal" };
    var picks = [];

    vbooks.forEach(function (s) {
      var prog = Y.vocabProgress(s.lists);
      total += s.total;
      done += prog.done || 0;
      if (!nextItem && prog.next) {
        nextItem = prog.next;
        nextBook = s.book;
      }
      if (prog.next) {
        picks.push({ item: prog.next, book: s.book, done: prog.done, total: s.total });
      }
    });

    var pct = total ? Math.round((done / total) * 100) : 0;
    var wrongN = ["gaozhong", "cet4", "special"].reduce(function (n, k) {
      return n + (Y.wrongWordCount(k) || 0);
    }, 0);
    var savedN = Y.savedWordCount ? Y.savedWordCount() : 0;

    var entries = vbooks.slice(0, 3).map(function (s) {
      var prog = Y.vocabProgress(s.lists);
      var hint = prog.done
        ? ("已学 " + prog.done + "/" + s.total)
        : (s.total + " 个单元");
      var tint = entryTint[s.book.key] || "navy";
      return '<a class="vocab-entry vocab-entry--' + tint + '" href="vocab.html?book=' +
        encodeURIComponent(s.book.key) + '">' +
        '<span class="vocab-entry__kicker">词书 · 作业</span>' +
        '<p class="vocab-entry__title">' + Y.esc(s.book.label) + "</p>" +
        '<p class="vocab-entry__desc">' + Y.esc(hint) + "</p>" +
        '<span class="vocab-entry__go">进入 ›</span></a>';
    }).join("");

    // ponytail: browse-only lexicon hub for now
    entries += '<a class="vocab-entry vocab-entry--gold" href="vocab-themes.html">' +
      '<span class="vocab-entry__kicker">词书 · 分类</span>' +
      '<p class="vocab-entry__title">分类词库</p>' +
      '<p class="vocab-entry__desc">按话题浏览 · 暂不测试</p>' +
      '<span class="vocab-entry__go">浏览 ›</span></a>';

    entries += '<a class="vocab-entry vocab-entry--wrong" href="wrong-words.html">' +
      '<span class="vocab-entry__kicker">复习</span>' +
      '<p class="vocab-entry__title">错题本</p>' +
      '<p class="vocab-entry__desc">' +
        (wrongN ? wrongN + " 个错词待复习" : "测试错词自动收录") +
      "</p>" +
      '<span class="vocab-entry__go">复习 ›</span></a>';

    entries += '<a class="vocab-entry vocab-entry--navy" href="diagnostic.html">' +
      '<span class="vocab-entry__kicker">测评</span>' +
      '<p class="vocab-entry__title">能力诊断</p>' +
      '<p class="vocab-entry__desc">硬门槛进阶 · 推荐起始词库</p>' +
      '<span class="vocab-entry__go">开始 ›</span></a>';

    var lessonOf = function (item) {
      return (Y.vocabLessonHref ? Y.vocabLessonHref(item, "") : Y.fileHref(item, ""));
    };

    var picksHTML;
    if (!picks.length) {
      picksHTML = '<p class="bento-panel__desc">词书都学完了，去错题本巩固，或换一本继续。</p>';
    } else {
      picksHTML = '<ul class="vocab-bento__picks">' + picks.slice(0, 4).map(function (p) {
        return '<li><a href="' + lessonOf(p.item) + '">' +
          '<span>' + Y.esc(Y.displayTitle(p.item)) + "</span>" +
          '<em>' + Y.esc(p.book.label) + "</em></a></li>";
      }).join("") + "</ul>";
    }

    var ctaHref = nextItem ? lessonOf(nextItem) : "vocab.html?book=gaozhong";
    var ctaTitle = nextItem ? ("继续小课 · " + Y.displayTitle(nextItem)) : "开始背单词";
    var ctaDesc = nextBook
      ? (nextBook.label + (done ? " · 已学 " + done + "/" + total : " · 适合老师布置作业"))
      : "选择词书，边学边测";

    var aiWord = (window.YYSD_AI_WORD && window.YYSD_AI_WORD.shellHTML)
      ? window.YYSD_AI_WORD.shellHTML() : "";

    // ponytail: 词境远征入口先下线，恢复时改回 canWordRealm() 判断
    var realmBanner = "";

    // 每日单词入口（独立模块；进度读 localStorage）
    var dwPlan = null;
    var dwTask = null;
    try {
      dwPlan = JSON.parse(localStorage.getItem("yysd:daily-word:plan") || "null");
      dwTask = JSON.parse(localStorage.getItem("yysd:daily-word:task") || "null");
    } catch (e) {}
    var dwBookLabel = "";
    if (dwTask && dwTask.bookLabel) {
      dwBookLabel = dwTask.bookLabel;
    } else if (dwPlan && dwPlan.bookLabel) {
      dwBookLabel = dwPlan.bookLabel;
    } else if (dwPlan && dwPlan.bookId) {
      var dwBook = (Y.VOCAB_BOOKS && Y.VOCAB_BOOKS[dwPlan.bookId]) || null;
      if (dwBook) dwBookLabel = dwBook.label;
      else if (String(dwPlan.bookId).indexOf("theme:") === 0) dwBookLabel = "分类词库";
    }
    var dwResume = !!(dwTask && dwTask.wordList && dwTask.wordList.length && !dwTask.completed);
    var dwHref = dwResume ? "daily-word-learn.html" : "daily-word-setup.html";
    var dwCount = dwPlan && dwPlan.targetCount ? dwPlan.targetCount : 50;
    var dwDesc = dwResume
      ? ("继续 " + ((dwTask.currentIndex || 0) + 1) + "/" + dwTask.wordList.length + " · " + (dwBookLabel || "今日任务"))
      : (dwBookLabel
        ? (dwBookLabel + " · 每日 " + dwCount + " 词")
        : "图片 · 跟读 · 拼写 · 释义 · 详解");
    var dailyCard =
      '<div class="vocab-daily-card">' +
        '<div class="vocab-daily-card__top">' +
          '<span class="vocab-daily-card__kicker">今日任务</span>' +
          (dwResume ? '<span class="vocab-daily-card__badge">进行中</span>' : "") +
        "</div>" +
        '<p class="vocab-daily-card__title">' +
          (dwResume ? "继续每日单词" : (dwCount + " 个新词")) +
        "</p>" +
        '<p class="vocab-daily-card__desc">' + Y.esc(dwDesc) + "</p>" +
        '<div class="vocab-daily-card__actions">' +
          '<a class="vocab-daily-card__go" href="' + dwHref + '">' +
            (dwResume ? "继续学习 ›" : "开始学习 ›") + "</a>" +
          (dwResume
            ? '<a class="vocab-daily-card__reset" href="daily-word-setup.html?reset=1">重新设置 ›</a>'
            : '<a class="vocab-daily-card__reset" href="daily-word-setup.html">更改词书 / 数量 ›</a>') +
        "</div>" +
      "</div>";

    return '<div class="vocab-bento">' +
      realmBanner +
      dailyCard +
      '<div class="vocab-entry-grid" role="navigation" aria-label="词书入口">' + entries + "</div>" +
      '<div class="vocab-bento__body bento-grid bento-grid--main-side">' +
      '<div class="vocab-bento__main">' +
        '<div class="bento-panel bento-panel--md vocab-bento__progress">' +
          '<p class="bento-panel__title">作业进度</p>' +
          '<p class="bento-panel__desc">词书单元完成情况（老师布置走这里）</p>' +
          '<div class="vocab-bento__stat-row">' +
            '<div class="bento-stat">' +
              '<span class="bento-stat__label">已学单元</span>' +
              '<span class="bento-stat__value">' + done + '<small>/' + total + '</small></span>' +
              '<span class="bento-stat__hint">' + pct + '% 完成</span>' +
            '</div>' +
            '<div class="bento-stat">' +
              '<span class="bento-stat__label">错词 / 生词</span>' +
              '<span class="bento-stat__value">' + wrongN + '<small>/' + savedN + '</small></span>' +
              '<span class="bento-stat__hint">待复习收藏</span>' +
            '</div>' +
          '</div>' +
          '<div class="bento-progress" aria-hidden="true"><div class="bento-progress__bar" style="width:' + pct + '%"></div></div>' +
        '</div>' +
        '<div class="bento-panel bento-panel--md">' +
          '<p class="bento-panel__title">今日精选</p>' +
          '<p class="bento-panel__desc">各词书下一站，点开即学</p>' +
          picksHTML +
        '</div>' +
      '</div>' +
      '<aside class="vocab-bento__side">' +
        '<a class="bento-cta bento-cta--orange" href="' + ctaHref + '">' +
          '<span class="bento-cta__badge">作业任务</span>' +
          '<div><p class="bento-cta__title">' + Y.esc(ctaTitle) + '</p>' +
          '<p class="bento-cta__desc">' + Y.esc(ctaDesc) + '</p></div>' +
          '<span class="vocab-bento__cta-go">开始 ›</span></a>' +
        '<a class="bento-panel bento-panel--sm vocab-bento__link" href="saved-words.html">' +
          '<p class="bento-panel__title">生词本</p>' +
          '<p class="bento-panel__desc">' +
            (savedN ? savedN + ' 个生词待复习' : 'AI 查词后可一键收藏') +
          '</p></a>' +
        '<div class="bento-panel bento-panel--md vocab-bento__ai">' + aiWord + '</div>' +
      '</aside></div></div>';
  }

  function leafBlockHTML(label, subject) {
    return '<div class="leaf-block">' +
      '<div class="leaf-block__head"><h4>' + Y.esc(label) + "</h4>" +
        '<span class="cnt">' + countOf(subject) + unitOf(subject) + "</span></div>" +
      leafBody(subject) +
      "</div>";
  }

  function nodeBlockHTML(node) {
    if (node.children) {
      var inner = node.children.map(function (ch) {
        return leafBlockHTML(ch.label, ch.subject);
      }).join("");
      return '<div class="leaf-block leaf-block--group">' +
        '<div class="leaf-block__head"><h4>' + Y.esc(node.label) + "</h4></div>" +
        '<div class="leaf-nest">' + inner + "</div></div>";
    }
    return leafBlockHTML(node.label, node.subject);
  }

  function ieltsHubHTML() {
    // hub 只保留听力/阅读/口语/写作/模考五列；精听在听力 links 里
    var hubKeys = { listening: 1, reading: 1, speaking: 1, writing: 1, mock: 1 };
    var en = {
      listening: "Listening",
      reading: "Reading",
      speaking: "Speaking",
      writing: "Writing",
      mock: "Full Mock"
    };
    /* ponytail: shared glyphs from config.js */
    var cols = visibleNav().filter(function (c) { return hubKeys[c.key]; });
    var cards = cols.map(function (cat) {
      var headHref = cat.href || ("zone.html?zone=mock&s=" + encodeURIComponent(cat.key));
      var links = cat.links && cat.links.length
        ? cat.links
        : cat.key === "speaking"
          ? [
              { href: "speaking.html", label: "口语模考" },
              { href: "speaking-select.html", label: "专项选题" },
              { href: "ai-tutor.html", label: "AI 雅思老师" }
            ]
          : [{ href: headHref, label: cat.desc || cat.label }];
      return '<article class="ielts-hub__card ielts-hub__card--' + Y.esc(cat.key) + '">' +
        '<a class="ielts-hub__hit" href="' + Y.esc(headHref) + '">' +
          '<span class="ielts-hub__ico" aria-hidden="true">' + (Y.skillGlyph ? Y.skillGlyph(cat.key) : "") + "</span>" +
          '<span class="ielts-hub__eyebrow">' + Y.esc(en[cat.key] || "") + "</span>" +
          "<h3>" + Y.esc(cat.label) + "</h3>" +
          '<p class="ielts-hub__desc">' + Y.esc(cat.desc || "") + "</p>" +
        "</a>" +
        '<ul class="ielts-hub__links">' +
          links.map(function (l) {
            return '<li><a href="' + Y.esc(l.href) + '">' + Y.esc(l.label) + "</a></li>";
          }).join("") +
        "</ul>" +
        '<a class="ielts-hub__go" href="' + Y.esc(headHref) + '">进入' + Y.esc(cat.label) + " <span aria-hidden=\"true\">›</span></a>" +
      "</article>";
    }).join("");

    return '<section class="ielts-hub" aria-label="雅思入口">' +
      '<header class="ielts-hub__intro">' +
        '<p class="ielts-hub__kicker">Cambridge IELTS</p>' +
        "<h2>选择你的训练路径</h2>" +
        "<p>单项精练打基础，套题模考练临场。四科口音分明，点进去就是对应题库。</p>" +
      "</header>" +
      '<div class="ielts-hub__grid">' + cards + "</div>" +
    "</section>";
  }

  function categoryHTML(cat) {
    var sub = Y.SUBJECT[cat.subject] || { color: "var(--c-cambridge)" };
    var head = '<div class="subject-group__head">' +
      '<span class="subject-dot" style="background:' + sub.color + '"></span>' +
      "<h2>" + Y.esc(cat.label) + '</h2><span class="cnt">' +
      (cat.key === "mock" || cat.key === "ielts" ? Y.camVolumes(allItems).length + " 册"
        : cat.key === "vocab" ? Y.vocabBooksForZone(allItems).length + " 本"
        : cat.key === "alevel" && alevelCatalog && window.YYSD_ALEVEL
          ? window.YYSD_ALEVEL.qpCount(alevelCatalog) + " 套"
        : countOf(cat.subject) + unitOf(cat.subject || "")) +
      "</span></div>";

    var body;
    if (cat.key === "mock" || cat.key === "ielts") {
      var vols = Y.camVolumes(allItems);
      body = vols.length
        ? Y.cambridgeCatalogHTML(vols, allItems, "", { tier: camTier, query: searchQuery, collapseLegacy: true })
        : emptyBox("暂无剑桥真题", "老师上传套题后会出现在这里。也可以先做单项听力或阅读练习。", "zone.html?zone=mock&s=listening", "去练听力");
    } else if (cat.key === "listening" || cat.key === "reading" || cat.key === "writing") {
      var skillVols = Y.camVolumes(allItems.filter(function (it) { return it.subject === cat.subject; }));
      body = skillVols.length
        ? Y.cambridgeCatalogHTML(skillVols, allItems, "", {
            tier: camTier,
            query: searchQuery,
            collapseLegacy: true,
            skill: cat.skill || ""
          })
        : emptyBox("该科目暂无内容", "先试试其他科目，或稍后再来。", "zone.html?zone=mock", "返回雅思总览");
    } else if (cat.href) {
      body = '<a class="bento-cta" href="' + Y.esc(cat.href) + '">' +
        '<div><p class="bento-cta__title">' + Y.esc(cat.label) + "</p>" +
        '<p class="bento-cta__desc">' + Y.esc(cat.desc || "") + "</p></div>" +
        '<span class="spk-cta-go">进入 ›</span></a>';
    } else if (cat.key === "alevel") {
      var A = window.YYSD_ALEVEL;
      var qp = alevelCatalog ? A.qpCount(alevelCatalog) : 0;
      body = alevelCatalog && A.hasContent(alevelCatalog)
        ? '<p class="alevel-zone-intro">CAIE 热门科目真题 · 在线预览 · 免费下载 · 已收录 ' + qp + " 套</p>" +
          A.catalogPreviewHTML(alevelCatalog, "", 6) +
          '<div class="alevel-zone-more"><a class="btn btn--primary pressable" href="alevel.html">进入 A-Level 题库 →</a></div>'
        : '<div class="soon-box">A-Level 真题筹备中，敬请期待。</div>';
    } else if (cat.key === "vocab") {
      var vbooks = Y.vocabBooksForZone(allItems);
      body = vbooks.length
        ? vocabBentoHTML(vbooks)
        : '<div class="soon-box">暂无单词内容，上传后会显示在这里。</div>';
    } else if (cat.children) {
      body = '<div class="leaf-wrap">' + cat.children.map(nodeBlockHTML).join("") + "</div>";
    } else {
      body = leafBody(cat.subject, cat.skill);
    }
    var accent = cat.skill || (cat.key === "mock" || cat.key === "ielts" ? "mock" : cat.key);
    return '<div class="subject-group subject-group--' + Y.esc(accent) + '">' + head + body + "</div>";
  }

  function syncZoneQuery() {
    if (zone !== "mock") return;
    try {
      var u = new URL(location.href);
      var cur = u.searchParams.get("s") || "";
      var want = activeCat === "all" ? "" : activeCat;
      if (!want) {
        if (!cur) return;
        u.searchParams.delete("s");
      } else if (cur === want) {
        return;
      } else {
        u.searchParams.set("s", want);
      }
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch (e) { /* ignore */ }
  }

  function syncToolbar() {
    if (!toolbarEl) return;
    /* ponytail: IELTS hub / vocab hub are portals — hide search (vocab always) */
    var isIeltsHub = zone === "mock" && activeCat === "all" && !searchQuery;
    var isVocabHub = zone === "study" && activeCat === "vocab";
    var hub = isIeltsHub || isVocabHub;
    document.body.classList.toggle("is-ielts-hub", isIeltsHub);
    document.body.classList.toggle("is-vocab-hub", isVocabHub);
    toolbarEl.hidden = hub;
    toolbarEl.setAttribute("aria-hidden", hub ? "true" : "false");
    // ponytail: .catalog-toolbar { display:flex } overrides [hidden]
    toolbarEl.style.display = hub ? "none" : "";
    if (hub) syncZoneQuery();
  }

  syncToolbar();

  function render() {
    syncToolbar();
    var html;
    if (searchQuery) {
      var matched = Y.searchItems(allItems, searchQuery);
      html = '<div class="catalog-search-meta">找到 ' + matched.length + " 条结果</div>" +
        Y.searchResultsHTML(matched, "");
    } else if (zone === "mock" && activeCat === "all") {
      html = ieltsHubHTML();
    } else {
      var aiTutorHTML = zone === "practice"
        ? '<a class="ai-tutor-entry pressable" href="ai-tutor.html">' +
            '<span class="ai-tutor-entry__badge" aria-hidden="true">AI</span>' +
            '<span class="ai-tutor-entry__body">' +
              '<span class="ai-tutor-entry__kicker">Featured</span>' +
              "<b>AI 雅思老师</b>" +
              "<span>口语机经练习 / 全真模考 · 写作批改 · 随时开练</span>" +
            "</span>" +
            '<span class="ai-tutor-entry__cta">立即开始 <span aria-hidden="true">→</span></span>' +
          "</a>"
        : "";
      var cats = activeCat === "all" ? visibleNav()
        : activeCat === "jingting" && navCat("jingting") ? [navCat("jingting")]
        : visibleNav().filter(function (c) { return c.key === activeCat; });
      html = aiTutorHTML + cats.map(categoryHTML).join("");
      if (activeCat === "jingting" && !cats.length) {
        html = emptyBox("暂无精听内容", "精听材料上传后会出现在这里。", "zone.html?zone=mock&s=listening", "返回听力");
      }
    }
    function bindJtFolds(root) {
      if (!root) return;
      root.querySelectorAll("details.catalog-collapse--jt").forEach(function (d) {
        if (d.dataset.jtBound) return;
        d.dataset.jtBound = "1";
        var body = d.querySelector(":scope > .catalog-collapse__body");
        var summary = d.querySelector(":scope > summary");
        if (!body || !summary) return;
        // init height
        if (d.open) {
          body.style.height = "auto";
        } else {
          body.style.height = "0px";
        }
        summary.addEventListener("click", function (e) {
          e.preventDefault();
          if (d.classList.contains("is-animating")) return;
          d.classList.add("is-animating");
          if (d.open) {
            // close
            d.classList.add("is-closing");
            body.style.height = body.scrollHeight + "px";
            body.offsetHeight;
            body.style.height = "0px";
            window.setTimeout(function () {
              d.open = false;
              d.classList.remove("is-closing", "is-animating");
            }, 340);
          } else {
            d.open = true;
            d.classList.add("is-opening");
            body.style.height = "0px";
            body.offsetHeight;
            body.style.height = body.scrollHeight + "px";
            window.setTimeout(function () {
              body.style.height = "auto";
              d.classList.remove("is-opening", "is-animating");
            }, 340);
          }
        });
      });
    }

    function afterRender() {
      if (window.YYSD_AI_WORD && window.YYSD_AI_WORD.bind) window.YYSD_AI_WORD.bind(contentEl);
      bindJtFolds(contentEl);
    }
    if (window.YYSD_UI_SWAP && contentEl.innerHTML && !contentEl.querySelector(".spinner--brand")) {
      window.YYSD_UI_SWAP(contentEl, html);
      // ponytail: UI_SWAP writes DOM after 160ms; bind must wait
      setTimeout(afterRender, 180);
    } else {
      contentEl.innerHTML = html;
      if (window.YYSD_UI_REVEAL) window.YYSD_UI_REVEAL(contentEl.querySelectorAll(".reveal"));
      afterRender();
    }
  }

  buildFilters();

  function finishZoneLoad(items) {
    var allow = (Y.ZONE_SUBJECTS && Y.ZONE_SUBJECTS[zone]) || null;
    allItems = items.filter(function (it) {
      if (it.zone !== zone) return false;
      if (zone === "study" && it.subject === "grammar") return false;
      if (zone === "mock" && it.subject === "ielts") return false;
      // 雅思区（mock）只保留雅思科目；A-Level 走国际课程 alevel.html
      if (allow && allow.indexOf(it.subject) < 0) return false;
      return true;
    });
    buildFilters();
    render();
  }

  var manifestP = Y.load();
  // A-Level catalog only on 国际课程 pages — not in 雅思/mock zone
  var catalogP = Promise.resolve(null);

  Promise.all([manifestP, catalogP]).then(function (res) {
    var go = function () { finishZoneLoad(res[0]); };
    // First-time student must finish vocab placement before using 单词区
    if (zone === "study" && activeCat === "vocab" && window.YYSD_DIAG_GATE) {
      window.YYSD_DIAG_GATE.ensure({ requireLogin: true }).then(function (ok) {
        if (ok) go();
      });
      return;
    }
    go();
  }).catch(function (err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : err.message;
    contentEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + Y.esc(msg) + '</p></div>';
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
