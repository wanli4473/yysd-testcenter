/* =========================================================================
   home.js — keynote landing + ~60s product tour in hero MacBook
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

  /* —— Product tour —— */
  var root = document.getElementById("ha-product-tour");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (root && !reduced) {
    var cursor = root.querySelector(".ha-demo__cursor");
    var caption = root.querySelector(".ha-demo__caption");
    var ripple = root.querySelector(".ha-demo__ripple");
    var cx = 72;
    var cy = 74;
    var running = false;
    var gen = 0;

    function wait(ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function showScene(name) {
      root.querySelectorAll(".ha-demo__scene").forEach(function (sc) {
        sc.classList.toggle("is-active", sc.getAttribute("data-scene") === name);
      });
      root.querySelectorAll(".is-hot").forEach(function (el) { el.classList.remove("is-hot"); });
      root.querySelectorAll(".is-picked").forEach(function (el) { el.classList.remove("is-picked"); });
      var daily1 = root.querySelector('.ha-daily__card[data-step="1"]');
      var daily2 = root.querySelector('.ha-daily__card[data-step="2"]');
      if (daily1) daily1.hidden = false;
      if (daily2) daily2.hidden = true;
    }

    function setCaption(text) {
      caption.textContent = text || "";
      caption.classList.toggle("is-on", !!text);
    }

    function hitPoint(name) {
      var el = root.querySelector('[data-hit="' + name + '"]');
      if (!el) return { x: 50, y: 50, el: null };
      var box = root.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      return {
        el: el,
        x: ((r.left + r.width * 0.55) - box.left) / box.width * 100,
        y: ((r.top + r.height * 0.55) - box.top) / box.height * 100
      };
    }

    function moveCursor(x, y, ms) {
      cx = x;
      cy = y;
      root.style.setProperty("--cx", x + "%");
      root.style.setProperty("--cy", y + "%");
      var dur = (ms || 700) + "ms";
      cursor.style.transitionDuration = dur;
      cursor.style.left = x + "%";
      cursor.style.top = y + "%";
      return wait(ms || 700);
    }

    function clickPulse() {
      root.style.setProperty("--rx", cx + "%");
      root.style.setProperty("--ry", cy + "%");
      root.classList.add("is-clicking", "is-ripping");
      return wait(160).then(function () {
        root.classList.remove("is-clicking");
        return wait(300);
      }).then(function () {
        root.classList.remove("is-ripping");
      });
    }

    function hot(name, on) {
      var el = root.querySelector('[data-hit="' + name + '"]');
      if (el) el.classList.toggle("is-hot", !!on);
    }

    function scanItem(hit, text, dwell) {
      var p = hitPoint(hit);
      hot(hit, true);
      setCaption(text);
      return moveCursor(p.x, p.y, 780).then(function () {
        return wait(dwell || 1600);
      }).then(function () {
        hot(hit, false);
      });
    }

    function tourOnce(token) {
      showScene("hub");
      setCaption("");
      root.classList.add("is-ready");
      return moveCursor(78, 76, 0)
        .then(function () { return wait(900); })
        .then(function () {
          if (token !== gen) return;
          setCaption("剑桥雅思真题");
          var p = hitPoint("ielts");
          hot("ielts", true);
          return moveCursor(p.x, p.y, 900);
        })
        .then(function () {
          if (token !== gen) return;
          return clickPulse();
        })
        .then(function () {
          if (token !== gen) return;
          hot("ielts", false);
          showScene("ielts-menu");
          setCaption("雅思备考 · 完整技能路径");
          return wait(700);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("listen", "听力真题 · 顺序练习，熟悉题型", 1500);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("read", "阅读真题 · 高亮与笔记", 1500);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("write", "写作真题 · 按官方任务练习", 1500);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("speak", "口语练习 · AI 陪练与模考", 1500);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("full", "全套模考 · 还原雅思机考节奏", 2200);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("aiw", "AI 写作批改 · 即时反馈", 1400);
        })
        .then(function () {
          if (token !== gen) return;
          setCaption("进入全套模考 · 机考体验");
          hot("full", true);
          var p = hitPoint("full");
          return moveCursor(p.x, p.y, 600).then(clickPulse);
        })
        .then(function () {
          if (token !== gen) return;
          hot("full", false);
          showScene("cdt");
          setCaption("雅思机考模拟 · 计时作答");
          return wait(900);
        })
        .then(function () {
          if (token !== gen) return;
          var p = hitPoint("optB");
          return moveCursor(p.x, p.y, 900);
        })
        .then(function () {
          if (token !== gen) return;
          return clickPulse().then(function () {
            var opt = root.querySelector('[data-hit="optB"]');
            if (opt) opt.classList.add("is-picked");
            setCaption("选定答案 · 继续下一题");
          });
        })
        .then(function () { return wait(2800); })
        .then(function () {
          if (token !== gen) return;
          showScene("hub");
          setCaption("回到学习中心");
          return moveCursor(78, 76, 500).then(function () { return wait(700); });
        })
        .then(function () {
          if (token !== gen) return;
          setCaption("今日单词 · 稳扎稳打");
          hot("vocab", true);
          var p = hitPoint("vocab");
          return moveCursor(p.x, p.y, 900);
        })
        .then(function () {
          if (token !== gen) return;
          return clickPulse();
        })
        .then(function () {
          if (token !== gen) return;
          hot("vocab", false);
          showScene("vocab-menu");
          setCaption("系统背词 · 完整学习路径");
          return wait(700);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("daily", "每日背词 · 今日计划可完成", 1700);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("books", "系统词书 · 高中 / 四级 / 雅思", 1500);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("themes", "分类词库 · 按话题拓展", 1500);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("wrong", "错题本 · 错词自动收录", 1500);
        })
        .then(function () {
          if (token !== gen) return;
          return scanItem("diag", "能力诊断 · 推荐起始词库", 1500);
        })
        .then(function () {
          if (token !== gen) return;
          setCaption("开始今日背词");
          hot("daily", true);
          var p = hitPoint("daily");
          return moveCursor(p.x, p.y, 600).then(clickPulse);
        })
        .then(function () {
          if (token !== gen) return;
          hot("daily", false);
          showScene("daily");
          setCaption("认词选义");
          return wait(800);
        })
        .then(function () {
          if (token !== gen) return;
          var p = hitPoint("meanA");
          return moveCursor(p.x, p.y, 850);
        })
        .then(function () {
          if (token !== gen) return;
          return clickPulse().then(function () {
            var btn = root.querySelector('[data-hit="meanA"]');
            if (btn) btn.classList.add("is-picked");
            setCaption("回答正确");
          });
        })
        .then(function () { return wait(1400); })
        .then(function () {
          if (token !== gen) return;
          var s1 = root.querySelector('.ha-daily__card[data-step="1"]');
          var s2 = root.querySelector('.ha-daily__card[data-step="2"]');
          if (s1) s1.hidden = true;
          if (s2) s2.hidden = false;
          setCaption("下一词 · 保持节奏");
          return wait(500);
        })
        .then(function () {
          if (token !== gen) return;
          var p = hitPoint("next");
          return moveCursor(p.x, p.y, 700);
        })
        .then(function () {
          if (token !== gen) return;
          return clickPulse().then(function () {
            setCaption("稳扎稳打，继续提分");
          });
        })
        .then(function () { return wait(2200); })
        .then(function () {
          if (token !== gen) return;
          setCaption("");
          showScene("hub");
          return moveCursor(78, 76, 500).then(function () { return wait(800); });
        });
    }

    function loop() {
      if (!running) return;
      var token = ++gen;
      tourOnce(token).then(function () {
        if (running && token === gen) loop();
      });
    }

    function start() {
      if (running) return;
      running = true;
      loop();
    }

    function stop() {
      running = false;
      gen++;
      setCaption("");
      root.classList.remove("is-ready", "is-clicking", "is-ripping");
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && e.intersectionRatio > 0.35) start();
          else stop();
        });
      }, { threshold: [0, 0.35, 0.6] });
      io.observe(root);
    } else {
      start();
    }
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
