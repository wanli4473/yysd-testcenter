/* tenant-boot.js — run in <head> on tenant sites: hide body until brand applied */
(function () {
  "use strict";

  function tenantSlug() {
    try {
      var q = new URLSearchParams(location.search).get("tenant");
      if (q && /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(q)) return q.toLowerCase();
    } catch (e) {}
    var h = (location.hostname || "").toLowerCase();
    if (!h || h === "localhost" || h === "127.0.0.1") return "yysd";
    if (h === "youyisida.com" || h === "www.youyisida.com") return "yysd";
    var m = h.match(/^([a-z0-9-]+)\.youyisida\.com$/);
    if (!m) return "yysd";
    var s = m[1];
    if (/^(www|api|admin|platform|mail|static|cdn|test|dev|staging)$/.test(s)) return "yysd";
    return s;
  }

  var slug = tenantSlug();
  if (slug === "yysd") return;

  var el = document.documentElement;
  el.classList.add("tenant-brand-pending");

  var st = document.createElement("style");
  st.textContent = "html.tenant-brand-pending body{visibility:hidden}";
  document.head.appendChild(st);

  try {
    var org = JSON.parse(localStorage.getItem("yysd:org") || "null");
    if (org && org.slug === slug && org.name && document.title) {
      if (document.title.indexOf("·") >= 0) {
        document.title = document.title.replace(/^[^·]+·/, org.name + " ·");
      } else if (document.title.indexOf("优益思达") >= 0 || document.title.indexOf("YYSD") >= 0) {
        document.title = org.name;
      }
    }
  } catch (e) {}
})();
