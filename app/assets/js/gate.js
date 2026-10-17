/* app-only: production requires Electron preload. localhost stays open for checks. */
(function (w) {
  "use strict";
  function isLocal() {
    var h = (w.location && w.location.hostname) || "";
    return h === "localhost" || h === "127.0.0.1";
  }
  function isDesktop() {
    return !!(w.yysdDesktop && w.yysdDesktop.device);
  }
  function tikuHome() {
    var h = (w.location && w.location.hostname) || "";
    return (h === "localhost" || h === "127.0.0.1") ? "/tiku/" : "https://tiku.youyisida.com/";
  }
  function allowed() {
    try { if (new URLSearchParams(w.location.search).get("preview") === "1") return true; } catch (e) {}
    return isDesktop() || isLocal();
  }
  function block() {
    if (allowed()) return true;
    w.location.replace("https://youyisida.com/download.html");
    return false;
  }
  w.YYSD_APP_GATE = { isLocal: isLocal, isDesktop: isDesktop, allowed: allowed, block: block, tikuHome: tikuHome };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { w.YYSD_APP_GATE.block(); });
  } else {
    w.YYSD_APP_GATE.block();
  }
})(window);
