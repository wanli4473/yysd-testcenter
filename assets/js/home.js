/* =========================================================================
   home.js — marketing landing; logged-in students stay here and pick a section
   ========================================================================= */
(function () {
  "use strict";
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  var A = window.YYSD_AUTH;
  if (!A || !A.getToken || !A.getToken()) return;
  if (A.isTeacher && A.isTeacher()) return;

  var cta = document.querySelector(".home-market__cta");
  if (!cta) return;
  cta.innerHTML =
    '<a class="home-btn home-btn--primary" href="zone.html?zone=study&s=vocab">去背单词</a>' +
    '<a class="home-btn home-btn--ghost" href="zone.html?zone=mock&s=ielts">练雅思真题</a>';
})();
