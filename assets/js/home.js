/* =========================================================================
   home.js — landing: skeleton preview, continue strip, stats
   ========================================================================= */
(function () {
  "use strict";

  var Y = window.YYSD;
  var A = window.YYSD_ALEVEL;
  var HOME_PREVIEW = 4;
  var volumesEl = document.getElementById("home-cambridge-volumes");
  var continueEl = document.getElementById("home-continue");
  var journeyEl = document.getElementById("home-journey");
  var alevelPreviewEl = document.getElementById("home-alevel-preview");
  var alevelCountEl = document.getElementById("home-alevel-count");

  function skeletonCards(n) {
    var html = "";
    var i;
    for (i = 0; i < n; i++) {
      html += '<div class="vol-card vol-card--skeleton" aria-hidden="true">' +
        '<div class="vol-card__top"><span class="sk sk--vol"></span><span class="sk sk--tag"></span></div>' +
        '<div class="vol-card__body"><span class="sk sk--ico"></span><div class="sk-col">' +
        '<span class="sk sk--title"></span><span class="sk sk--sub"></span></div></div>' +
        '<div class="vol-card__foot"><span class="sk sk--foot"></span></div></div>';
    }
    return html;
  }

  function setStat(id, n) {
    var el = document.getElementById(id);
    if (!el) return;
    el.setAttribute("data-count", String(n));
    if (window.YYSD_UI_COUNTUP) window.YYSD_UI_COUNTUP(el);
    else el.textContent = String(n);
  }

  function bindReveal(root) {
    if (!root || !window.YYSD_UI_REVEAL) return;
    root.querySelectorAll(".reveal").forEach(function (el, i) {
      el.style.setProperty("--reveal-delay", String((i % 8) * 60) + "ms");
    });
    window.YYSD_UI_REVEAL(root.querySelectorAll(".reveal"));
  }

  function renderError(err) {
    if (!volumesEl) return;
    volumesEl.classList.remove("is-loading");
    volumesEl.removeAttribute("aria-busy");
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : (err && err.message) || "内容加载失败。";
    volumesEl.innerHTML = '<div class="state state--brand"><h3>加载失败</h3><p>' + Y.esc(msg) + '</p></div>';
  }

  if (volumesEl) volumesEl.innerHTML = skeletonCards(HOME_PREVIEW);

  Promise.all([Y.load(), A.loadCatalog().catch(function () { return null; })]).then(function (res) {
    var items = res[0];
    var catalog = res[1];
    var volumes = Y.camVolumes(items);
    setStat("stat-vols", volumes.length);
    setStat("stat-tests", volumes.reduce(function (s, v) { return s + v.tests; }, 0));
    var volCountEl = document.getElementById("home-vol-count");
    if (volCountEl) volCountEl.textContent = String(volumes.length);

    if (journeyEl) {
      journeyEl.innerHTML = Y.homeJourneyHTML(items, "");
      bindReveal(journeyEl);
    }

    if (continueEl) {
      var recent = Y.recentActivity(items, 3);
      continueEl.innerHTML = Y.homeDashboardHTML(items, recent, "");
      bindReveal(continueEl);
    }

    if (!volumesEl) return;
    var preview = volumes.slice(0, HOME_PREVIEW);
    volumesEl.innerHTML = preview.length
      ? preview.map(function (v) { return Y.camVolumeCardHTML(v, "", items); }).join("")
      : '<div class="state state--brand"><h3>暂无模考内容</h3><p>老师上传后会显示在这里。</p></div>';

    volumesEl.classList.remove("is-loading");
    volumesEl.removeAttribute("aria-busy");
    volumesEl.classList.add("is-loaded");

    preview.forEach(function (_, i) {
      var card = volumesEl.children[i];
      if (!card) return;
      card.style.setProperty("--reveal-delay", String(i * 70) + "ms");
    });

    if (alevelPreviewEl && catalog && A.hasContent(catalog)) {
      var qp = A.qpCount(catalog);
      if (alevelCountEl) alevelCountEl.textContent = String(qp);
      alevelPreviewEl.innerHTML = A.catalogPreviewHTML(catalog, "", 3);
    } else if (alevelPreviewEl) {
      if (alevelCountEl) alevelCountEl.textContent = "0";
      alevelPreviewEl.innerHTML = '<div class="soon-box">A-Level 真题筹备中，敬请期待。</div>';
    }
  }).catch(renderError);

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
