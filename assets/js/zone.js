/* =========================================================================
   zone.js — a single zone (模考区 / 学习区 / 练习区) with subject sub-filters
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var zone = new URLSearchParams(location.search).get("zone");
  if (!Y.ZONE[zone]) zone = "mock";
  var z = Y.ZONE[zone];
  var subjects = Y.subjectsOf(zone);
  var activeSubject = "all";

  // header
  document.title = z.label + " · 优益思达学习中心";
  document.getElementById("crumb-zone").textContent = z.label;
  document.getElementById("zone-ico").textContent = z.icon;
  document.getElementById("zone-title").textContent = z.label;
  document.getElementById("zone-desc").textContent = z.desc;

  // highlight active nav
  var navLink = document.querySelector('#nav a[data-zone="' + zone + '"]');
  if (navLink) navLink.classList.add("is-active");

  var filtersEl = document.getElementById("filters");
  var contentEl = document.getElementById("content");
  var allItems = [];

  // Collapse the two cambridge subjects into a single "cambridge" series filter.
  function displaySubjects() {
    var out = [];
    subjects.forEach(function (s) {
      var key = Y.isCambridge(s) ? "cambridge" : s;
      if (out.indexOf(key) < 0) out.push(key);
    });
    return out;
  }

  function buildFilters() {
    var chips = ['<button class="chip is-active" data-s="all">全部</button>'];
    displaySubjects().forEach(function (s) {
      chips.push('<button class="chip" data-s="' + s + '">' + Y.esc(Y.SUBJECT[s].label) + '</button>');
    });
    filtersEl.innerHTML = chips.join("");
    filtersEl.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      filtersEl.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
      b.classList.add("is-active");
      activeSubject = b.getAttribute("data-s");
      render();
    });
  }

  function groupHTML(headLabel, color, count, unit, bodyHTML, emptyMsg) {
    return '<div class="subject-group">' +
      '<div class="subject-group__head">' +
        '<span class="subject-dot" style="background:' + color + '"></span>' +
        '<h2>' + Y.esc(headLabel) + '</h2>' +
        '<span class="cnt">' + count + ' ' + unit + '</span>' +
      '</div>' +
      (count ? bodyHTML : '<div class="state" style="padding:38px 20px"><p>' + emptyMsg + '</p></div>') +
      '</div>';
  }

  // 剑桥真题 collapses to one "series" card per volume → opens cambridge.html
  function cambridgeGroupHTML() {
    var vols = Y.camVolumes(allItems);
    var grid = '<div class="exam-grid">' + vols.map(function (v) { return Y.camVolumeCardHTML(v, ""); }).join("") + '</div>';
    return groupHTML(Y.SUBJECT.cambridge.label, Y.SUBJECT.cambridge.color, vols.length, "册",
      grid, "暂无剑桥真题，老师上传后会显示在这里。");
  }

  function render() {
    var groups = activeSubject === "all" ? displaySubjects() : [activeSubject];
    var html = "";

    groups.forEach(function (s) {
      if (s === "cambridge") { html += cambridgeGroupHTML(); return; }

      var items = allItems.filter(function (it) { return it.subject === s; })
        .sort(function (a, b) {
          return String(a.title).localeCompare(String(b.title), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
        });
      var sub = Y.SUBJECT[s];
      var grid = '<div class="exam-grid">' + items.map(function (it) { return Y.cardHTML(it, ""); }).join("") + '</div>';
      html += groupHTML(sub.label, sub.color, items.length, "份", grid, "该科目暂无内容，老师上传后会显示在这里。");
    });
    contentEl.innerHTML = html;
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
