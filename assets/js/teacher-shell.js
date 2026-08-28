/* ponytail: fixed-sidebar drawer + collapse for .teacher-layout only */
(function () {
  "use strict";
  var body = document.body;
  if (!body || !body.classList.contains("teacher-layout")) return;

  var KEY = "yysd:teacher:nav-collapsed";
  var mq = window.matchMedia("(max-width: 1023px)");

  function overlay() { return document.querySelector(".teacher-nav-overlay"); }

  function setOpen(on) {
    body.classList.toggle("teacher-nav-open", !!on);
    document.querySelectorAll("[data-teacher-nav-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-expanded", on ? "true" : "false");
    });
    var ov = overlay();
    if (ov) ov.hidden = !on;
  }

  function setCollapsed(on) {
    body.classList.toggle("teacher-nav-collapsed", !!on);
    document.querySelectorAll("[data-teacher-nav-collapse]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "展开侧栏" : "收起侧栏");
    });
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
  }

  try { if (localStorage.getItem(KEY) === "1") setCollapsed(true); } catch (e) {}

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-teacher-nav-toggle]")) {
      setOpen(!body.classList.contains("teacher-nav-open"));
      return;
    }
    if (e.target.closest("[data-teacher-nav-close]")) {
      setOpen(false);
      return;
    }
    if (e.target.closest("[data-teacher-nav-collapse]")) {
      setCollapsed(!body.classList.contains("teacher-nav-collapsed"));
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });

  function onMq() { if (!mq.matches) setOpen(false); }
  if (mq.addEventListener) mq.addEventListener("change", onMq);
  else mq.addListener(onMq);
})();
