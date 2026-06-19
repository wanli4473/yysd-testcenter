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

  function buildFilters() {
    var chips = ['<button class="chip is-active" data-s="all">全部</button>'];
    subjects.forEach(function (s) {
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

  function render() {
    var groups = activeSubject === "all" ? subjects : [activeSubject];
    var html = "";

    groups.forEach(function (s) {
      var items = allItems.filter(function (it) { return it.subject === s; })
        .sort(function (a, b) {
          return String(a.title).localeCompare(String(b.title), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
        });
      var sub = Y.SUBJECT[s];
      html += '<div class="subject-group">' +
        '<div class="subject-group__head">' +
          '<span class="subject-dot" style="background:' + sub.color + '"></span>' +
          '<h2>' + Y.esc(sub.label) + '</h2>' +
          '<span class="cnt">' + items.length + ' 份</span>' +
        '</div>';
      if (items.length) {
        html += '<div class="exam-grid">' + items.map(function (it) { return Y.cardHTML(it, ""); }).join("") + '</div>';
      } else {
        html += '<div class="state" style="padding:38px 20px"><p>该科目暂无内容，老师上传后会显示在这里。</p></div>';
      }
      html += '</div>';
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
