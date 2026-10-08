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
  function allowed() {
    return isDesktop() || isLocal();
  }
  function block() {
    if (allowed()) return true;
    w.location.replace("https://youyisida.com/download.html");
    return false;
  }
  w.YYSD_APP_GATE = { isLocal: isLocal, isDesktop: isDesktop, allowed: allowed, block: block };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { w.YYSD_APP_GATE.block(); });
  } else {
    w.YYSD_APP_GATE.block();
  }
})(window);
