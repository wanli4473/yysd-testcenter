/* =========================================================================
   home.js — Apple keynote landing; logged-in students get product CTAs
   ========================================================================= */
(function () {
  "use strict";
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  var nextBtn = document.querySelector("[data-ha-next]");
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      var panels = document.querySelectorAll(".ha-panel");
      if (panels[1]) panels[1].scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  var A = window.YYSD_AUTH;
  if (!A || !A.getToken || !A.getToken()) return;
  if (A.isTeacher && A.isTeacher()) return;

  document.querySelectorAll(".home-market__cta").forEach(function (cta) {
    cta.innerHTML =
      '<a class="home-btn home-btn--primary" href="zone.html?zone=study&s=vocab">去背单词</a>' +
      '<a class="home-btn home-btn--ghost" href="zone.html?zone=mock&s=ielts">练雅思真题</a>';
  });
})();
