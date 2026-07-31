/* =========================================================================
   cambridge.js — volume page: pick Test → jump into paper (mode picker / CDT)
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var params = new URLSearchParams(location.search);
  var vol = (params.get("vol") || "").trim();
  var skillQ = (params.get("skill") || "").trim().toLowerCase();
  var contentEl = document.getElementById("content");

  document.title = "剑桥雅思 " + vol + " · 优益思达国际课程中心";
  var navLink = document.querySelector('#nav a[data-zone="mock"]');
  if (navLink) navLink.classList.add("is-active");
  document.getElementById("year").textContent = new Date().getFullYear();

  var SKILLS = [
    { subject: "cambridge-listening", key: "listening", name: "听力" },
    { subject: "cambridge-reading", key: "reading", name: "阅读" },
    { subject: "cambridge-writing", key: "writing", name: "写作" }
  ];

  var skillFilter = SKILLS.filter(function (s) { return s.key === skillQ; })[0] || null;
  var accent = skillFilter ? skillFilter.key : "mock";
  document.body.classList.add("cam-page", "cam-page--" + accent, "cam-page--pick-test");

  var backHref = skillFilter
    ? "zone.html?zone=mock&s=" + encodeURIComponent(skillFilter.key)
    : "zone.html?zone=mock&s=mock";
  var backLabel = skillFilter ? skillFilter.name + "顺序练习" : "套题模考";

  var backLink = document.querySelector(".minimal-back__link");
  if (backLink) {
    backLink.href = backHref;
    backLink.textContent = "← 返回" + backLabel;
  }

  function testDone(papers) {
    var res = Y.results();
    if (skillFilter) {
      var it = papers[skillFilter.subject];
      return !!(it && res[it.id]);
    }
    var list = SKILLS.filter(function (s) { return papers[s.subject]; });
    var done = list.filter(function (s) { return res[papers[s.subject].id]; }).length;
    return { done: done, total: list.length, complete: list.length && done >= list.length };
  }

  function hrefForTest(papers) {
    if (skillFilter) {
      var item = papers[skillFilter.subject];
      if (!item) return "";
      // B1: skill practice enters CDT; pack chosen at gate (drill vs exam)
      return Y.fileHref(item, "") + "&cdt=1";
    }
    var listen = papers["cambridge-listening"];
    if (!listen) return "";
    return Y.fileHref(listen, "") + "&cdt=1&pack=exam&suite=1";
  }

  Y.load().then(function (items) {
    var cam = items.filter(function (it) {
      return Y.isCambridge(it.subject) && Y.camVolume(it) === vol;
    });
    if (skillFilter) {
      cam = cam.filter(function (it) { return it.subject === skillFilter.subject; });
    }

    if (!cam.length) {
      contentEl.innerHTML = '<div class="state state--brand"><h3>未找到该册内容</h3>' +
        '<p>请从<a href="' + backHref + '">' + Y.esc(backLabel) + "</a>重新进入。</p></div>";
      return;
    }

    var byTest = {};
    cam.forEach(function (it) {
      var t = Y.camTestNo(it) || "1";
      (byTest[t] = byTest[t] || {})[it.subject] = it;
    });

    var tests = Object.keys(byTest).sort(function (a, b) { return Number(a) - Number(b); });
    if (!skillFilter) {
      tests = tests.filter(function (t) { return !!byTest[t]["cambridge-listening"]; });
    }

    var volProg = Y.camVolumeProgress(items, vol);

    var crumb = '<div class="minimal-crumb cam-crumb">' +
      '<a href="index.html">首页</a> <span class="crumb-sep" aria-hidden="true">★</span> ' +
      '<a href="zone.html?zone=mock">雅思</a> <span class="crumb-sep" aria-hidden="true">★</span> ' +
      '<a href="' + backHref + '">' + Y.esc(backLabel) + '</a> <span class="crumb-sep" aria-hidden="true">★</span> ' +
      "剑桥雅思 " + Y.esc(vol) + "</div>";

    var metaLine = skillFilter
      ? "单项顺序练习 · 仅" + skillFilter.name
      : "官方真题套卷 · 选择 Test 开始套题模考";
    var hint = skillFilter
      ? "选择一套 Test，进入机考界面后选择「练习」或「模考」（界面相同，仅规则不同）。"
      : "选择一套 Test，按听力 → 阅读 → 写作顺序完成套题全真模考。";

    var hero = '<div class="cam-hero cam-hero--' + accent + '">' +
      '<div class="cam-hero__badge"><div class="lbl">CAMBRIDGE IELTS</div><div class="num">' + Y.esc(vol) + "</div></div>" +
      "<div><h1>剑桥雅思 " + Y.esc(vol) + "</h1>" +
      '<div class="meta">' + metaLine +
      (!skillFilter && volProg.total ? " · 已完成 " + volProg.done + "/" + volProg.total + " 份" : "") +
      "</div></div></div>";

    var tabs = tests.map(function (t) {
      var papers = byTest[t];
      var href = hrefForTest(papers);
      if (!href) return "";
      var prog = testDone(papers);
      var complete = skillFilter ? prog === true : prog.complete;
      var status = complete
        ? '<span class="test-tab__done" aria-label="已完成">✓</span>'
        : (!skillFilter && prog.done
          ? '<span class="test-tab__part">' + prog.done + "/" + prog.total + "</span>"
          : '<span class="test-tab__go" aria-hidden="true">开始</span>');
      return '<a class="test-tab' + (complete ? " test-tab--complete" : "") +
        '" href="' + Y.esc(href) + '" data-test="' + Y.esc(t) + '">' +
        '<span class="test-tab__kicker">TEST</span>' +
        '<span class="test-tab__num">' + Y.esc(t) + "</span>" +
        '<span class="test-tab__status">' + status + "</span></a>";
    }).join("");

    contentEl.innerHTML = crumb + hero +
      '<p class="cam-pick-hint">' + Y.esc(hint) + "</p>" +
      '<div class="test-tabs test-tabs--pick" role="navigation" aria-label="选择 Test">' + tabs + "</div>";

    contentEl.querySelector(".test-tabs").addEventListener("click", function (e) {
      var a = e.target.closest("a.test-tab");
      if (!a || !a.getAttribute("href")) return;
      e.preventDefault();
      (window.YYSD_GO || function (h) { location.href = h; })(a.href);
    });
  }).catch(function (err) {
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : err.message;
    contentEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + Y.esc(msg) + "</p></div>";
  });
})();
