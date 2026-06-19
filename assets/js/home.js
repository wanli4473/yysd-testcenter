/* =========================================================================
   home.js — landing page: zone portals, recent items, stats
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var portalsEl = document.getElementById("zone-portals");
  var recentEl = document.getElementById("recent");

  function portalHTML(zone, items) {
    var z = Y.ZONE[zone];
    var subjects = Y.subjectsOf(zone);
    var bySubject = {};
    items.forEach(function (it) { bySubject[it.subject] = (bySubject[it.subject] || 0) + 1; });

    var chips = subjects.map(function (s) {
      var sub = Y.SUBJECT[s];
      return '<span class="zp-subject">' + Y.esc(sub.label) +
             '<b>' + (bySubject[s] || 0) + '</b></span>';
    }).join("");

    return '' +
      '<a class="zone-portal zone-portal--' + zone + '" href="zone.html?zone=' + zone + '">' +
        '<div class="zp-ico">' + z.icon + '</div>' +
        '<h3>' + Y.esc(z.label) + '</h3>' +
        '<div class="zp-en">' + Y.esc(z.en) + '</div>' +
        '<p>' + Y.esc(z.desc) + '</p>' +
        '<div class="zp-subjects">' + chips + '</div>' +
        '<div class="zp-foot">' +
          '<span class="zp-count"><b>' + items.length + '</b> 份内容</span>' +
          '<span class="zp-go">进入 →</span>' +
        '</div>' +
      '</a>';
  }

  Y.load().then(function (items) {
    // stats
    var st = document.getElementById("stat-total");
    if (st) st.textContent = items.length;
    var sd = document.getElementById("stat-done");
    if (sd) sd.textContent = Object.keys(Y.results()).length;

    // portals
    portalsEl.innerHTML = Y.ZONES.map(function (zone) {
      var inZone = items.filter(function (it) { return it.zone === zone; });
      return portalHTML(zone, inZone);
    }).join("");

    // recent (top 6)
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
