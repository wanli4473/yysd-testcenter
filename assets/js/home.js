/* =========================================================================
   home.js — minimal landing page
   Renders only the Cambridge volume cards on the homepage.
   ========================================================================= */
(function () {
  "use strict";

  var Y = window.YYSD;
  var volumesEl = document.getElementById("home-cambridge-volumes");

  function renderError(err) {
    if (!volumesEl) return;
    var msg = location.protocol === "file:"
      ? "请通过网址（http://）访问本站，本地双击打开会被浏览器拦截。"
      : (err && err.message) || "内容加载失败。";
    volumesEl.innerHTML = '<div class="state"><h3>加载失败</h3><p>' + Y.esc(msg) + '</p></div>';
  }

  Y.load().then(function (items) {
    if (!volumesEl) return;

    var volumes = Y.camVolumes(items);
    volumesEl.innerHTML = volumes.length
      ? volumes.map(function (v) { return Y.camVolumeCardHTML(v, ""); }).join("")
      : '<div class="state"><h3>暂无模考内容</h3><p>老师上传后会显示在这里。</p></div>';
  }).catch(renderError);

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
