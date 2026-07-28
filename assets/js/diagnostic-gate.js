/* diagnostic-gate.js — first-time vocab placement redirect */
(function (global) {
  "use strict";

  var GATE_HREF = "diagnostic.html?gate=1";

  function isStudentLoggedIn() {
    var A = global.YYSD_AUTH;
    if (!A || !A.getToken || !A.getToken()) return false;
    if (A.isTeacher && A.isTeacher()) return false;
    return true;
  }

  /** @returns {Promise<boolean>} true = may stay on page; false = redirected */
  function ensurePlacement(opts) {
    opts = opts || {};
    var A = global.YYSD_AUTH;
    if (!isStudentLoggedIn()) {
      if (opts.requireLogin) {
        location.replace(
          "login.html?next=" + encodeURIComponent(GATE_HREF)
        );
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    }
    return A.api("/api/diagnostic/status")
      .then(function (d) {
        if (d && d.placement_done) return true;
        location.replace(GATE_HREF);
        return false;
      })
      .catch(function () {
        // API down — don't soft-lock the whole vocab area
        return true;
      });
  }

  function bookForLevel(level) {
    if (level === "cet4") return "cet4";
    if (level === "ielts") return "special";
    return "gaozhong";
  }

  global.YYSD_DIAG_GATE = {
    HREF: GATE_HREF,
    ensure: ensurePlacement,
    isStudentLoggedIn: isStudentLoggedIn,
    bookForLevel: bookForLevel
  };
})(typeof window !== "undefined" ? window : this);
