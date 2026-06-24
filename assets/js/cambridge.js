/* =========================================================================
   cambridge.js — one Cambridge volume's tests, grouped by Test number, each
   offering 听力 / 阅读 / 写作 panels. Opened from 模考区: cambridge.html?vol=20
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var vol = (new URLSearchParams(location.search).get("vol") || "").trim();
  var contentEl = document.getElementById("content");

  document.title = "剑桥雅思 " + vol + " · 优益思达国际课程中心";
  var navLink = document.querySelector('#nav a[data-zone="mock"]');
  if (navLink) navLink.classList.add("is-active");
  document.getElementById("year").textContent = new Date().getFullYear();

  // listening blue, reading green, writing purple — order matters for display
  var SKILLS = [
    { subject: "cambridge-listening", cls: "listening", ico: "🎧", name: "听力", meta: "4 个部分 · 共 40 题" },
    { subject: "cambridge-reading",   cls: "reading",   ico: "📖", name: "阅读", meta: "3 篇文章 · 共 40 题" },
    { subject: "cambridge-writing",   cls: "writing",   ico: "✍️", name: "写作", meta: "Task 1 + Task 2 · 限时 60 分钟" }
  ];

  function skillPanel(skill, item) {
    return '<div class="skill-panel skill-panel--' + skill.cls + '">' +
      '<div class="skill-panel__ico">' + skill.ico + '</div>' +
      '<div class="skill-panel__name">' + skill.name + '</div>' +
      '<div class="skill-panel__meta">' + skill.meta + '</div>' +
      '<button class="skill-panel__btn" onclick="location.href=\'' + Y.fileHref(item, "") + '\'">开始测试</button>' +
      '</div>';
  }

  Y.load().then(function (items) {
    var cam = items.filter(function (it) {
      return Y.isCambridge(it.subject) && Y.camVolume(it) === vol;
    });

    if (!cam.length) {
      contentEl.innerHTML = '<div class="state"><h3>未找到该册内容</h3>' +
        '<p>请从<a href="zone.html?zone=mock">模考区</a>重新进入。</p></div>';
      return;
    }

    // group by test number
    var byTest = {};
    cam.forEach(function (it) {
      var t = Y.camTestNo(it) || "1";
      (byTest[t] = byTest[t] || {})[it.subject] = it;
    });

    var hero = '<div class="cam-hero">' +
      '<div class="cam-hero__badge"><div class="lbl">CAMBRIDGE IELTS</div><div class="num">' + Y.esc(vol) + '</div></div>' +
      '<div><h1>剑桥雅思 ' + Y.esc(vol) + '</h1>' +
      '<div class="meta">官方真题套卷 · 选择某一套的听力 / 阅读 / 写作开始测试</div></div>' +
      '</div>';

    var tests = Object.keys(byTest).sort(function (a, b) { return Number(a) - Number(b); });
    var blocks = tests.map(function (t) {
      var papers = byTest[t];
      var panels = SKILLS.filter(function (s) { return papers[s.subject]; })
        .map(function (s) { return skillPanel(s, papers[s.subject]); }).join("");
      return '<div class="test-block"><h2>剑桥雅思' + Y.esc(vol) + ' · Test ' + Y.esc(t) + '</h2>' +
        '<div class="skill-grid">' + panels + '</div></div>';
    }).join("");

    contentEl.innerHTML = hero + blocks;
  }).catch(function (err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : err.message;
    contentEl.innerHTML = '<div class="state"><h3>加载失败</h3><p>' + Y.esc(msg) + '</p></div>';
  });
})();
