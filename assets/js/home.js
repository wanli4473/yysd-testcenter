/* =========================================================================
   home.js — landing page: 学习区 / 练习区 / 模考区 portals (as a course tree),
   recent items, stats. Mirrors the 优益思达国际课程中心 structure.
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var portalsEl = document.getElementById("zone-portals");
  var recentEl = document.getElementById("recent");

  function leafHTML(leaf, counts, zone) {
    var n = counts[leaf.subject] || 0;
    var inner = '<span class="nl-label">' + Y.esc(leaf.label) + '</span>' +
      (n > 0 ? '<b class="nl-n">' + n + '</b>' : '<span class="nl-soon">即将上线</span>');
    return n > 0
      ? '<a class="navleaf" href="zone.html?zone=' + zone + '&s=' + encodeURIComponent(leaf.subject) + '">' + inner + '</a>'
      : '<span class="navleaf is-empty">' + inner + '</span>';
  }

  function catHTML(cat, counts, zone) {
    if (!cat.children) {
      return '<div class="navcat navcat--leaf">' + leafHTML(cat, counts, zone) + '</div>';
    }
    var leaves = [];
    if (cat.subject && (counts[cat.subject] || 0) > 0) {
      leaves.push(leafHTML({ label: "全真模考", subject: cat.subject }, counts, zone));
    }
    cat.children.forEach(function (ch) { leaves.push(leafHTML(ch, counts, zone)); });
    return '<div class="navcat">' +
      '<div class="navcat__title">' + Y.esc(cat.label) + '</div>' +
      '<div class="navcat__leaves">' + leaves.join("") + '</div>' +
      '</div>';
  }

  function panelHTML(zone, items) {
    var z = Y.ZONE[zone];
    var counts = Y.countsBySubject(items, zone);
    var cats = Y.navOf(zone).map(function (c) { return catHTML(c, counts, zone); }).join("");
    return '' +
      '<section class="zpanel zpanel--' + zone + '">' +
        '<div class="zpanel__head">' +
          '<span class="zpanel__ico">' + z.icon + '</span>' +
          '<div class="zpanel__title">' +
            '<h3>' + Y.esc(z.label) + ' <span class="zpanel__en">' + Y.esc(z.en) + '</span></h3>' +
            '<p>' + Y.esc(z.desc) + '</p>' +
          '</div>' +
          '<a class="zpanel__enter" href="zone.html?zone=' + zone + '">进入 ' + Y.esc(z.label) + ' →</a>' +
        '</div>' +
        '<div class="zpanel__cats">' + cats + '</div>' +
      '</section>';
  }

  Y.load().then(function (items) {
    var st = document.getElementById("stat-total");
    if (st) st.textContent = items.length;
    var sd = document.getElementById("stat-done");
    if (sd) sd.textContent = Object.keys(Y.results()).length;

    portalsEl.innerHTML = Y.ZONES.map(function (zone) {
      return panelHTML(zone, items.filter(function (it) { return it.zone === zone; }));
    }).join("");

    var recent = items.slice(0, 6);
    recentEl.innerHTML = recent.length
      ? '<div class="exam-grid">' + recent.map(function (it) { return Y.cardHTML(it, ""); }).join("") + '</div>'
      : '<div class="state"><h3>还没有内容</h3><p>老师上传后会显示在这里。</p></div>';
  }).catch(function (err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : err.message;
    portalsEl.innerHTML = '<div class="state"><h3>加载失败</h3><p>' + Y.esc(msg) + '</p></div>';
  });

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
