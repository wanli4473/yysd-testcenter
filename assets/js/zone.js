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

  // If deep-linked to a subject, open its top-level filter category.
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

  // Render a nav node: leaf subject block, or a grouped parent with nested leaves.
  function nodeBlockHTML(node) {
    if (node.children) {
      var inner = node.children.map(function (ch) {
        return leafBlockHTML(ch.label, ch.subject);
      }).join("");
      return '<div class="leaf-block leaf-block--group">' +
        '<div class="leaf-block__head"><h4>' + Y.esc(node.label) + '</h4></div>' +
        '<div class="leaf-nest">' + inner + '</div></div>';
    }
    return leafBlockHTML(node.label, node.subject);
  }

  function categoryHTML(cat) {
    var sub = Y.SUBJECT[cat.subject] || { color: "var(--c-cambridge)" };
    var head = '<div class="subject-group__head">' +
      '<span class="subject-dot" style="background:' + sub.color + '"></span>' +
      '<h2>' + Y.esc(cat.label) + '</h2></div>';

    var body;
    if (cat.key === "ielts") {
      // 雅思真题 = clean Cambridge volume-card grid (听力/阅读/写作 live inside each volume)
      var vols = Y.camVolumes(allItems);
      body = vols.length
        ? '<div class="vol-grid">' + vols.map(function (v) { return Y.camVolumeCardHTML(v, ""); }).join("") + '</div>'
        : '<div class="soon-box">暂无剑桥真题，老师上传后会显示在这里。</div>';
    } else if (cat.key === "vocab") {
      var vbooks = Y.vocabBooksForZone(allItems);
      body = vbooks.length
        ? '<div class="vol-grid">' + vbooks.map(function (s) { return Y.vocabBookCardHTML(s, ""); }).join("") + '</div>'
        : '<div class="soon-box">暂无单词内容，上传后会显示在这里。</div>';
    } else if (cat.children) {
      var blocks = [];
      cat.children.forEach(function (ch) { blocks.push(nodeBlockHTML(ch)); });
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
