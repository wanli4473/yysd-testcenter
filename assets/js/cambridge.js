/* =========================================================================
   cambridge.js — one Cambridge volume's tests (剑15 听力 + 阅读)
   Opened from the 模考区 series card: cambridge.html?vol=15
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var vol = (new URLSearchParams(location.search).get("vol") || "").trim();
  var contentEl = document.getElementById("content");

  // header / breadcrumb
  var label = "剑桥雅思 " + (vol || "");
  document.title = label + " · 优益思达学习中心";
  document.getElementById("vol-title").textContent = label;
  document.getElementById("crumb-vol").textContent = label;
  var navLink = document.querySelector('#nav a[data-zone="mock"]');
  if (navLink) navLink.classList.add("is-active");
  document.getElementById("year").textContent = new Date().getFullYear();

  var GROUPS = [
    { subject: "cambridge-listening" },
    { subject: "cambridge-reading" }
  ];

  Y.load().then(function (items) {
    var cam = items.filter(function (it) {
      return Y.isCambridge(it.subject) && Y.camVolume(it) === vol;
    });

    if (!cam.length) {
      contentEl.innerHTML = '<div class="state"><h3>未找到该册内容</h3>' +
        '<p>请从<a href="zone.html?zone=mock">模考区</a>重新进入。</p></div>';
      return;
    }

    var html = "";
    GROUPS.forEach(function (g) {
      var its = cam.filter(function (it) { return it.subject === g.subject; })
        .sort(function (a, b) {
          return String(a.title).localeCompare(String(b.title), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
        });
      var sub = Y.SUBJECT[g.subject];
      html += '<div class="subject-group">' +
        '<div class="subject-group__head">' +
          '<span class="subject-dot" style="background:' + sub.color + '"></span>' +
          '<h2>' + Y.esc(sub.label) + '</h2>' +
          '<span class="cnt">' + its.length + ' 份</span>' +
        '</div>';
      html += its.length
        ? '<div class="exam-grid">' + its.map(function (it) { return Y.cardHTML(it, ""); }).join("") + '</div>'
        : '<div class="state" style="padding:38px 20px"><p>本册该科目暂无内容。</p></div>';
      html += '</div>';
    });
    contentEl.innerHTML = html;
  }).catch(function (err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : err.message;
    contentEl.innerHTML = '<div class="state"><h3>加载失败</h3><p>' + Y.esc(msg) + '</p></div>';
  });
})();
