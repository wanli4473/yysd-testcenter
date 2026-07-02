/* =========================================================================
   cambridge.js — one volume: Test tabs + skill panels per test
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

  var SKILLS = [
    { subject: "cambridge-listening", cls: "listening", ico: "🎧", name: "听力", meta: "4 个部分 · 共 40 题" },
    { subject: "cambridge-reading",   cls: "reading",   ico: "📖", name: "阅读", meta: "3 篇文章 · 共 40 题" },
    { subject: "cambridge-writing",   cls: "writing",   ico: "✍️", name: "写作", meta: "Task 1 + Task 2 · 限时 60 分钟" }
  ];

  function skillPanel(skill, item) {
    var done = Y.results()[item.id];
    return '<div class="skill-panel skill-panel--' + skill.cls + (done ? " is-done" : "") + '">' +
      '<div class="skill-panel__ico">' + skill.ico + "</div>" +
      '<div class="skill-panel__name">' + skill.name + "</div>" +
      '<div class="skill-panel__meta">' + skill.meta + "</div>" +
      '<button class="skill-panel__btn" onclick="location.href=\'' + Y.fileHref(item, "") + '\'">' +
      (done ? "再做一次" : "开始测试") + "</button></div>";
  }

  function testProgress(papers) {
    var res = Y.results();
    var done = SKILLS.filter(function (s) { return papers[s.subject] && res[papers[s.subject].id]; }).length;
    var total = SKILLS.filter(function (s) { return papers[s.subject]; }).length;
    return { done: done, total: total };
  }

  Y.load().then(function (items) {
    var cam = items.filter(function (it) {
      return Y.isCambridge(it.subject) && Y.camVolume(it) === vol;
    });

    if (!cam.length) {
      contentEl.innerHTML = '<div class="state state--brand"><h3>未找到该册内容</h3>' +
        '<p>请从<a href="zone.html?zone=mock&s=ielts">模考区</a>重新进入。</p></div>';
      return;
    }

    var byTest = {};
    cam.forEach(function (it) {
      var t = Y.camTestNo(it) || "1";
      (byTest[t] = byTest[t] || {})[it.subject] = it;
    });

    var tests = Object.keys(byTest).sort(function (a, b) { return Number(a) - Number(b); });
    var volProg = Y.camVolumeProgress(items, vol);

    var crumb = '<div class="minimal-crumb cam-crumb">' +
      '<a href="index.html">首页</a> <span class="crumb-sep" aria-hidden="true">★</span> ' +
      '<a href="zone.html?zone=mock&s=ielts">模考区</a> <span class="crumb-sep" aria-hidden="true">★</span> ' +
      "剑桥雅思 " + Y.esc(vol) + "</div>";

    var hero = '<div class="cam-hero">' +
      '<div class="cam-hero__badge"><div class="lbl">CAMBRIDGE IELTS</div><div class="num">' + Y.esc(vol) + "</div></div>" +
      "<div><h1>剑桥雅思 " + Y.esc(vol) + "</h1>" +
      '<div class="meta">官方真题套卷 · 选择 Test 与科目开始模考' +
      (volProg.total ? " · 已完成 " + volProg.done + "/" + volProg.total + " 份" : "") +
      "</div></div></div>";

    var tabs = tests.map(function (t, i) {
      var prog = testProgress(byTest[t]);
      var badge = prog.total && prog.done >= prog.total
        ? '<span class="test-tab__done">✓</span>'
        : (prog.done ? '<span class="test-tab__part">' + prog.done + "/" + prog.total + "</span>" : "");
      return '<button type="button" class="test-tab' + (i === 0 ? " is-active" : "") + '" data-test="' + Y.esc(t) + '">' +
        "Test " + Y.esc(t) + badge + "</button>";
    }).join("");

    var panels = tests.map(function (t, i) {
      var papers = byTest[t];
      var panels = SKILLS.filter(function (s) { return papers[s.subject]; })
        .map(function (s) { return skillPanel(s, papers[s.subject]); }).join("");
      return '<div class="test-panel' + (i === 0 ? " is-active" : "") + '" data-test="' + Y.esc(t) + '">' +
        '<div class="skill-grid">' + panels + "</div></div>";
    }).join("");

    contentEl.innerHTML = crumb + hero +
      '<div class="test-tabs" role="tablist">' + tabs + "</div>" +
      '<div class="test-panels">' + panels + "</div>";

    contentEl.querySelector(".test-tabs").addEventListener("click", function (e) {
      var btn = e.target.closest(".test-tab");
      if (!btn) return;
      var t = btn.getAttribute("data-test");
      contentEl.querySelectorAll(".test-tab").forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-test") === t);
      });
      contentEl.querySelectorAll(".test-panel").forEach(function (p) {
        var on = p.getAttribute("data-test") === t;
        p.classList.toggle("is-active", on);
        if (on) {
          p.classList.remove("is-entering");
          void p.offsetWidth;
          p.classList.add("is-entering");
        }
      });
    });

    contentEl.querySelectorAll(".test-tab").forEach(function (b) { b.setAttribute("tabindex", "0"); });
  }).catch(function (err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : err.message;
    contentEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + Y.esc(msg) + "</p></div>";
  });
})();
