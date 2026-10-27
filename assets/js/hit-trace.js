/* 机考路径埋点：进页 / 每分钟停留 / 离页；音频 error；交卷失败由 auth 调用 fail() */
(function (w) {
  "use strict";
  var DWELL_MS = 60 * 1000;
  var page = "";
  var timer = null;
  var lastSent = 0;

  function api() {
    if (w.YYSD_APP && w.YYSD_APP.api) return w.YYSD_APP.api;
    if (w.YYSD_AUTH && w.YYSD_AUTH.api) return w.YYSD_AUTH.api;
    return null;
  }

  function here() {
    try { return (location.pathname || "") + (location.search || ""); }
    catch (e) { return ""; }
  }

  function send(kind, detail) {
    var fn = api();
    if (!fn) return;
    var now = Date.now();
    if (kind === "page_dwell" && now - lastSent < DWELL_MS - 2000) return;
    lastSent = now;
    fn("/api/student/hit-events", {
      method: "POST",
      body: { kind: kind, page: page || here(), detail: detail || "" }
    }).catch(function () {});
  }

  function fail(kind, detail) {
    send(kind, String(detail || "").slice(0, 400));
  }

  function tick() {
    if (w.document && w.document.visibilityState === "hidden") return;
    send("page_dwell", "60");
  }

  function start() {
    page = here();
    send("page_enter", "");
    if (timer) clearInterval(timer);
    timer = setInterval(tick, DWELL_MS);
  }

  function stop() {
    send("page_leave", "");
    if (timer) { clearInterval(timer); timer = null; }
  }

  w.YYSD_HIT_TRACE = { fail: fail, send: send };

  if (w.document) {
    w.document.addEventListener("error", function (e) {
      var t = e.target;
      if (!t || String(t.tagName || "").toUpperCase() !== "AUDIO") return;
      fail("audio_fail", t.currentSrc || t.src || page);
    }, true);
    if (w.document.readyState === "loading") {
      w.document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }
  w.addEventListener("pagehide", stop);
  w.addEventListener("visibilitychange", function () {
    if (w.document.visibilityState === "hidden") send("page_leave", "");
    else send("page_enter", "resume");
  });
})(window);
