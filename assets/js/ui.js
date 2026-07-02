/* =========================================================================
   ui.js — premium motion: hero stagger, reveal, count-up, parallax, swap
   ========================================================================= */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (document.querySelector(".stagger-in") && !reduced) {
    requestAnimationFrame(function () {
      document.body.classList.add("is-motion-ready");
    });
  } else {
    document.body.classList.add("is-motion-ready");
  }

  var topbar = document.querySelector(".minimal-topbar");
  if (topbar) {
    function onScroll() {
      topbar.classList.toggle("is-scrolled", window.scrollY > 48);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var revealIO;
  function bindReveal(els) {
    if (!("IntersectionObserver" in window) || !els || !els.length) return;
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-visible");
          revealIO.unobserve(e.target);
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -32px 0px" });
    }
    els.forEach(function (el, i) {
      if (el.classList.contains("is-visible")) return;
      if (!el.style.getPropertyValue("--reveal-delay")) {
        el.style.setProperty("--reveal-delay", String((i % 8) * 70) + "ms");
      }
      revealIO.observe(el);
    });
  }
  window.YYSD_UI_REVEAL = bindReveal;
  bindReveal(document.querySelectorAll(".reveal"));

  if ("IntersectionObserver" in window) {
    function countUp(el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      if (!target || isNaN(target)) { el.textContent = "0"; return; }
      var suffix = el.getAttribute("data-suffix") || "";
      var start = performance.now();
      function tick(now) {
        var p = Math.min((now - start) / 900, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      el.textContent = "0";
      requestAnimationFrame(tick);
    }
    window.YYSD_UI_COUNTUP = countUp;

    document.querySelectorAll("[data-count]").forEach(function (el) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          countUp(e.target);
          sio.unobserve(e.target);
        });
      }, { threshold: 0.4 });
      sio.observe(el);
    });
  }

  var wm = document.querySelector(".hero-motifs");
  if (wm && !reduced) {
    window.addEventListener("scroll", function () {
      wm.style.transform = "translateY(" + (window.scrollY * 0.08) + "px)";
    }, { passive: true });
  }

  window.YYSD_UI_SWAP = function (el, html) {
    if (!el) return;
    if (reduced) { el.innerHTML = html; return; }
    el.classList.add("is-swapping");
    setTimeout(function () {
      el.innerHTML = html;
      el.classList.remove("is-swapping");
      bindReveal(el.querySelectorAll(".reveal"));
    }, 160);
  };

  window.YYSD_DEBOUNCE = function (fn, ms) {
    var t;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 200);
    };
  };

  document.addEventListener("keydown", function (e) {
    var wrap = null;
    var sel = "";
    if (document.querySelector(".test-tabs") && document.querySelector(".test-tabs").contains(document.activeElement)) {
      wrap = document.querySelector(".test-tabs");
      sel = ".test-tab";
    } else if (document.querySelector(".vocab-range-chips") && document.querySelector(".vocab-range-chips").contains(document.activeElement)) {
      wrap = document.querySelector(".vocab-range-chips");
      sel = ".vocab-range-chip";
    }
    if (!wrap || !sel) return;
    var btns = [].slice.call(wrap.querySelectorAll(sel));
    var idx = btns.indexOf(document.activeElement);
    if (idx < 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      btns[(idx + 1) % btns.length].click();
      btns[(idx + 1) % btns.length].focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      btns[(idx - 1 + btns.length) % btns.length].click();
      btns[(idx - 1 + btns.length) % btns.length].focus();
    }
  });
})();
