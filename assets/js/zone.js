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

  // Vocab hub — 学习台：左进度轨 + 右主模块；诊断/每日单词为 chips
  function dailyWordChipMeta() {
    var dwTask = null;
    var dwResult = null;
    try {
      dwTask = JSON.parse(localStorage.getItem("yysd:daily-word:task") || "null");
      dwResult = JSON.parse(localStorage.getItem("yysd:daily-word:result") || "null");
    } catch (e) {}
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var today = (function (d) {
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    })(new Date());
    var resume = !!(dwTask && dwTask.wordList && dwTask.wordList.length && !dwTask.completed);
    var done = !resume && !!(dwResult && dwResult.date === today);
    if (resume) {
      return { href: "daily-word-learn.html", label: "每日单词 · 继续", state: "is-resume" };
    }
    if (done) {
      return { href: "daily-word-result.html", label: "每日单词 · 已完成", state: "is-done" };
    }
    return { href: "daily-word-setup.html", label: "每日单词", state: "is-idle" };
  }

  function vocabBentoHTML() {
    var dw = dailyWordChipMeta();
    var bookSvg =
      '<svg class="vocab-desk__book" viewBox="0 0 160 110" aria-hidden="true">' +
        '<path fill="#f7f3ea" stroke="#102a4c" stroke-width="2.2" d="M80 18c-18-10-46-12-62-8v72c18-5 44-2 62 10 18-12 44-15 62-10V10c-16-4-44-2-62 8z"/>' +
        '<path fill="none" stroke="#c7a45d" stroke-width="1.6" d="M80 20v70"/>' +
        '<path fill="none" stroke="#d8cbb5" stroke-width="1.2" d="M34 36h30M34 48h28M34 60h26M96 36h30M96 48h28M96 60h26"/>' +
      "</svg>";

    function mod(cls, href, kicker, title, m1k, m1v, m2k, m2v, cta, ctaHref) {
      return '<article class="vocab-desk__mod vocab-desk__mod--' + cls + '">' +
        '<a class="vocab-desk__mod-hit" href="' + Y.esc(href) + '">' +
          '<span class="vocab-desk__mod-kicker">' + kicker + "</span>" +
          "<h3>" + title + "</h3>" +
          '<dl class="vocab-desk__metrics">' +
            "<div><dt>" + m1k + "</dt><dd data-desk=\"" + cls + "-m1\">" + m1v + "</dd></div>" +
            "<div><dt>" + m2k + "</dt><dd data-desk=\"" + cls + "-m2\">" + m2v + "</dd></div>" +
          "</dl>" +
        "</a>" +
        '<a class="vocab-desk__continue" data-desk="' + cls + '-cta" href="' + Y.esc(ctaHref || href) + '">' +
          Y.esc(cta) + " <span aria-hidden=\"true\">›</span></a>" +
      "</article>";
    }

    return '<section class="vocab-desk" data-vocab-desk aria-label="单词学习台">' +
      '<aside class="vocab-desk__rail" aria-label="学习进度">' +
        '<p class="vocab-desk__rail-kicker">学习进度</p>' +
        '<ul class="vocab-desk__stats">' +
          '<li><span>书架本数</span><b data-desk="shelfBooks">—</b></li>' +
          '<li><span>词书学习</span><b data-desk="activeLists">—</b></li>' +
          '<li><span>今日已学</span><b data-desk="todayWords">—</b></li>' +
          '<li><span>本周已学</span><b data-desk="weekWords">—</b></li>' +
        "</ul>" +
        '<div class="vocab-desk__chips">' +
          '<a class="vocab-desk__chip" href="diagnostic.html">能力诊断</a>' +
          '<a class="vocab-desk__chip vocab-desk__chip--' + dw.state + '" href="' + Y.esc(dw.href) + '">' +
            Y.esc(dw.label) + "</a>" +
        "</div>" +
      "</aside>" +
      '<div class="vocab-desk__main">' +
        '<header class="vocab-desk__head">' +
          '<div class="vocab-desk__head-copy">' +
            '<p class="vocab-desk__brand">优益思达 · 单词</p>' +
            "<h2>学习台</h2>" +
            "<p>词库学习 · 闯关解锁 · 检测巩固 · 错题回炉。</p>" +
          "</div>" +
          bookSvg +
        "</header>" +
        '<div class="vocab-desk__mods" role="navigation" aria-label="单词主模块">' +
          mod("shelf", "vocab-shelf.html", "01", "词库", "书架本数", "—", "续学", "—", "进入书架", "vocab-shelf.html") +
          mod("challenge", "vocab-challenge.html", "02", "单词闯关", "当前关", "—", "抽测池", "—", "开始闯关", "vocab-challenge.html") +
          mod("quiz", "vocab-quiz.html", "03", "单词检测", "本周次数", "—", "最近正确率", "—", "开始检测", "vocab-quiz.html") +
          mod("wrong", "wrong-words.html", "04", "错题本", "待复习场次", "—", "错词数", "—", "去复习", "wrong-words.html") +
        "</div>" +
      "</div>" +
    "</section>";
  }

  function bindVocabDesk(root) {
    var desk = root && root.querySelector("[data-vocab-desk]");
    if (!desk) return;
    var A = window.YYSD_AUTH;
    function set(key, val) {
      var el = desk.querySelector('[data-desk="' + key + '"]');
      if (el) el.textContent = val;
    }
    function setCta(key, href, label) {
      var el = desk.querySelector('[data-desk="' + key + '"]');
      if (!el) return;
      if (href) el.setAttribute("href", href);
      if (label) el.innerHTML = Y.esc(label) + ' <span aria-hidden="true">›</span>';
    }
    function paintGuest() {
      set("shelfBooks", "0");
      set("activeLists", "0");
      set("todayWords", "0");
      set("weekWords", "0");
      set("shelf-m1", "0 本");
      set("shelf-m2", "0");
      set("quiz-m1", "0");
      set("quiz-m2", "—");
      set("wrong-m1", "0");
      set("wrong-m2", "0");
      set("challenge-m1", "—");
      set("challenge-m2", "—");
    }
    if (!A || !A.getToken || !A.getToken() || !A.api) {
      paintGuest();
      return;
    }
    Promise.all([
      A.api("/api/vocab-shelf/desk"),
      A.api("/api/vocab-challenge/me").catch(function () { return null; })
    ]).then(function (pair) {
      var d = pair[0];
      var ch = pair[1];
      if (!d || !d.ok) { paintGuest(); return; }
      set("shelfBooks", String(d.shelfBooks || 0));
      set("activeLists", d.continueLearn && d.continueLearn.listLabel
        ? String(d.continueLearn.listLabel)
        : String(d.activeLists || 0));
      set("todayWords", String(d.todayWords || 0));
      set("weekWords", String(d.weekWords || 0));
      set("shelf-m1", (d.shelfBooks || 0) + " 本");
      set("shelf-m2", d.continueLearn && d.continueLearn.listLabel
        ? String(d.continueLearn.listLabel)
        : String(d.activeLists || 0));
      set("quiz-m1", String(d.weekQuizzes || 0));
      set("quiz-m2", d.lastAccuracy != null ? d.lastAccuracy + "%" : "—");
      set("wrong-m1", String(d.pendingSessions || 0));
      set("wrong-m2", String(d.mistakeWords || 0));
      if (ch && ch.assigned && ch.progress) {
        if (ch.programComplete) {
          set("challenge-m1", "已完成");
          setCta("challenge-cta", "vocab-challenge.html", "查看进度");
        } else if (ch.progressDay) {
          set("challenge-m1", "第 " + Math.min(ch.progressDay, 78) + " 关");
          setCta("challenge-cta", "vocab-challenge.html", ch.activeAttemptId ? "继续闯关" : "去闯关");
        } else {
          set("challenge-m1", "L" + (ch.progress.nextListNo || 1));
          setCta("challenge-cta", "vocab-challenge.html", "去闯关");
        }
        set("challenge-m2", String((ch.pool && ch.pool.active) || 0));
      } else {
        set("challenge-m1", "待布置");
        set("challenge-m2", "—");
        setCta("challenge-cta", "vocab-challenge.html", "查看闯关");
      }
      if (d.continueLearn) {
        setCta("shelf-cta", d.continueLearn.href, "续学 · " + (d.continueLearn.listLabel || "List"));
      } else if ((d.shelfBooks || 0) > 0) {
        setCta("shelf-cta", "vocab-shelf.html", "继续学习");
      } else {
        setCta("shelf-cta", "vocab-shelf.html", "添加词书");
      }
      if (d.continueQuiz) {
        setCta("quiz-cta", d.continueQuiz.href, "续测 · " + (d.continueQuiz.label || "检测"));
      }
      if (d.continueWrong) {
        setCta("wrong-cta", d.continueWrong.href, "续复习 · " + (d.continueWrong.wrongCount || "") + " 词");
      }
    }).catch(function () { paintGuest(); });
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
    // ponytail: vocab desk owns its own title — skip generic subject head
    var head = cat.key === "vocab" ? "" : ('<div class="subject-group__head">' +
      '<span class="subject-dot" style="background:' + sub.color + '"></span>' +
      "<h2>" + Y.esc(cat.label) + '</h2><span class="cnt">' +
      (cat.key === "mock" || cat.key === "ielts" ? Y.camVolumes(allItems).length + " 册"
        : cat.key === "alevel" && alevelCatalog && window.YYSD_ALEVEL
          ? window.YYSD_ALEVEL.qpCount(alevelCatalog) + " 套"
        : countOf(cat.subject) + unitOf(cat.subject || "")) +
      "</span></div>");

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
      body = vocabBentoHTML();
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
      bindVocabDesk(contentEl);
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
