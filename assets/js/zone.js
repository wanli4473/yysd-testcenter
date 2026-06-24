/* =========================================================================
   zone.js — a single zone (学习区 / 练习区 / 模考区) rendered as a category tree.
   Categories may have children (sub-skills); leaves map to a manifest subject.
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var params = new URLSearchParams(location.search);
  var zone = params.get("zone");
  if (!Y.ZONE[zone]) zone = "mock";
  var focusSubject = params.get("s") || "";        // deep-link from homepage
  var z = Y.ZONE[zone];
  var nav = Y.navOf(zone);
  var activeCat = "all";

  // header
  document.title = z.label + " · 优益思达国际课程中心";
  document.getElementById("crumb-zone").textContent = z.label;
  document.getElementById("zone-ico").textContent = z.icon;
  document.getElementById("zone-title").textContent = z.label;
  document.getElementById("zone-desc").textContent = z.desc;

  var navLink = document.querySelector('#nav a[data-zone="' + zone + '"]');
  if (navLink) navLink.classList.add("is-active");

  var filtersEl = document.getElementById("filters");
  var contentEl = document.getElementById("content");
  var allItems = [];

  // If deep-linked to a subject, open its parent category.
  function catOfSubject(s) {
    for (var i = 0; i < nav.length; i++) {
      var c = nav[i];
      if (c.subject === s) return c;
      if (c.children) for (var j = 0; j < c.children.length; j++) {
        if (c.children[j].subject === s) return c;
      }
    }
    return null;
  }
  if (focusSubject) { var fc = catOfSubject(focusSubject); if (fc) activeCat = fc.key; }

  function buildFilters() {
    var chips = ['<button class="chip' + (activeCat === "all" ? " is-active" : "") + '" data-s="all">全部</button>'];
    nav.forEach(function (c) {
      chips.push('<button class="chip' + (activeCat === c.key ? " is-active" : "") +
        '" data-s="' + c.key + '">' + Y.esc(c.label) + '</button>');
    });
    filtersEl.innerHTML = chips.join("");
    filtersEl.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      filtersEl.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
      b.classList.add("is-active");
      activeCat = b.getAttribute("data-s");
      render();
    });
  }

  function itemsOf(subject) {
    return allItems.filter(function (it) { return it.subject === subject; })
      .sort(function (a, b) {
        return String(a.title).localeCompare(String(b.title), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
      });
  }

  // Body for one leaf subject: cambridge → series cards; else cards / placeholder.
  function leafBody(subject) {
    if (Y.isCambridge(subject)) {
      var vols = Y.camVolumes(allItems.filter(function (it) { return it.subject === subject; }));
      if (vols.length) {
        return '<div class="exam-grid">' + vols.map(function (v) { return Y.camVolumeCardHTML(v, ""); }).join("") + '</div>';
      }
    } else {
      var its = itemsOf(subject);
      if (its.length) {
        return '<div class="exam-grid">' + its.map(function (it) { return Y.cardHTML(it, ""); }).join("") + '</div>';
      }
    }
    return '<div class="soon-box">该板块即将上线，敬请期待。</div>';
  }

  function countOf(subject) {
    if (Y.isCambridge(subject)) return Y.camVolumes(allItems.filter(function (it) { return it.subject === subject; })).length;
    return itemsOf(subject).length;
  }
  function unitOf(subject) { return Y.isCambridge(subject) ? " 册" : " 份"; }

  function leafBlockHTML(label, subject) {
    return '<div class="leaf-block">' +
      '<div class="leaf-block__head"><h4>' + Y.esc(label) + '</h4>' +
        '<span class="cnt">' + countOf(subject) + unitOf(subject) + '</span></div>' +
      leafBody(subject) +
      '</div>';
  }

  function categoryHTML(cat) {
    var sub = Y.SUBJECT[cat.subject] || { color: "var(--c-cambridge)" };
    var head = '<div class="subject-group__head">' +
      '<span class="subject-dot" style="background:' + sub.color + '"></span>' +
      '<h2>' + Y.esc(cat.label) + '</h2></div>';

    var body;
    if (cat.children) {
      var blocks = [];
      if (cat.subject && countOf(cat.subject) > 0) blocks.push(leafBlockHTML("全真模考", cat.subject));
      cat.children.forEach(function (ch) { blocks.push(leafBlockHTML(ch.label, ch.subject)); });
      body = '<div class="leaf-wrap">' + blocks.join("") + '</div>';
    } else {
      body = leafBody(cat.subject);
    }
    return '<div class="subject-group">' + head + body + '</div>';
  }

  function render() {
    var cats = activeCat === "all" ? nav : nav.filter(function (c) { return c.key === activeCat; });
    contentEl.innerHTML = cats.map(categoryHTML).join("");
  }

  buildFilters();

  Y.load().then(function (items) {
    allItems = items.filter(function (it) { return it.zone === zone; });
    render();
  }).catch(function (err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : err.message;
    contentEl.innerHTML = '<div class="state"><h3>加载失败</h3><p>' + Y.esc(msg) + '</p></div>';
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
