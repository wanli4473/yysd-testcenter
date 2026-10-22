/* 真题题库区门禁：能不能进以后端 /api/toefl/access 为准。取不到=锁（fail-safe）。
   免费卷(id=)/考前冲刺包(bank + 非 practice)/老师预览(preview=1) 不锁。 */
(function (w) {
  "use strict";

  var LOCKED = { on: false, reason: "error" };
  var REASONS = {
    none: { t: "练习区还没开通", d: "真题题库需要老师开通后才能进入。免费题库不用开通，登录即做。" },
    scheduled: { t: "练习区尚未开启", d: "老师已为你安排开通，时间到了就能进去练习。" },
    expired: { t: "练习权限已到期", d: "已做完的记录仍可在个人页查看。想继续练习，请联系老师续期。" },
    off: { t: "练习区已停用", d: "老师已停用你的练习权限。如需继续，请联系老师重新开通。" },
    error: { t: "暂时无法确认权限", d: "网络或服务异常，为安全起见先锁住。请稍后重新检查。" }
  };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtWhen(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return (d.getMonth() + 1) + "月" + d.getDate() + "日 " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function fmtLeft(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var day = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    if (day > 0) return day + " 天 " + pad(h) + ":" + pad(m) + ":" + pad(s % 60);
    if (h > 0) return h + ":" + pad(m) + ":" + pad(s % 60);
    return m + ":" + pad(s % 60);
  }

  function fetchAccess() {
    var A = w.YYSD_APP;
    if (!A || !A.api) return Promise.resolve(LOCKED);
    return A.api("/api/toefl/access").then(function (d) {
      var ac = d && d.access;
      if (ac && ac.staff) return { on: true, staff: true };
      return (ac && ac.practice) || LOCKED;
    }).catch(function (e) {
      var m = (e && e.message) || "";
      if (m.indexOf("登录") >= 0) {
        w.location.replace("login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search));
        return new Promise(function () {});
      }
      return LOCKED;
    });
  }

  // 免费卷 / 考前冲刺包 / 老师预览直接放行；其余（含状态不明）都要过锁
  function exemptOf(search, run) {
    var qs = new URLSearchParams(search);
    if (qs.get("preview") === "1") return true;
    if (qs.get("id")) return true;
    if (qs.get("bank")) return !!(run && run.kind && run.kind !== "practice");
    return false;
  }
  function exempt() {
    var run = null;
    try { run = w.YYSD_TIKU_RUN && w.YYSD_TIKU_RUN.load ? w.YYSD_TIKU_RUN.load() : null; } catch (e) {}
    return exemptOf(location.search, run);
  }

  function showLock(st) {
    var old = document.getElementById("yysd-lock");
    if (old) old.remove();
    var meta = REASONS[st.reason] || REASONS.none;
    var box = document.createElement("div");
    box.id = "yysd-lock";
    box.className = "yysd-lock";
    box.innerHTML = '<div class="yysd-lock-card">' +
      '<span class="yysd-lock-icon" aria-hidden="true">🔒</span>' +
      "<h2>" + meta.t + "</h2><p>" + meta.d + "</p>" +
      '<p class="yysd-lock-count" id="yysd-lock-count"></p>' +
      '<div class="yysd-lock-acts">' +
        '<button type="button" id="yysd-lock-retry">重新检查</button>' +
        '<a href="free.html">去免费题库</a>' +
        '<a href="home.html">返回首页</a>' +
      "</div></div>";
    document.body.appendChild(box);

    var countEl = box.querySelector("#yysd-lock-count");
    if (st.reason === "scheduled" && st.startAt) {
      var tick = function () {
        var left = Date.parse(st.startAt) - Date.now();
        if (left <= 0) {
          fetchAccess().then(function (next) {
            if (next.on) location.reload();
            else showLock(next);
          });
          return;
        }
        countEl.textContent = "距开启还有 " + fmtLeft(left);
        setTimeout(tick, 1000);
      };
      tick();
    } else if (st.reason === "expired" && st.expireAt) {
      countEl.textContent = "到期时间：" + fmtWhen(st.expireAt);
    }

    box.querySelector("#yysd-lock-retry").onclick = function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = "检查中…";
      fetchAccess().then(function (next) {
        if (next.on) location.reload();
        else showLock(next);
      });
    };
  }

  // 自动交卷：题做一半被到期/收回时用
  function cut(reason, onCut) {
    if (w.__yysdCut) return;
    w.__yysdCut = true;
    var box = document.createElement("div");
    box.className = "yysd-cut";
    box.innerHTML = "<div><b>" + (reason === "expired" ? "练习时间已到" : "练习权限已被收回") + "</b><p>" +
      (reason === "expired" ? "已为你自动交卷，正在跳转…" : "老师收回了练习权限，已为你自动交卷。") + "</p></div>";
    document.body.appendChild(box);
    setTimeout(function () {
      if (onCut) onCut();
      else location.reload();
    }, 1200);
  }

  function armWatch(st, onCut) {
    var bar = document.querySelector(".ets-bar-right");
    var chip = null;
    if (bar && st.expireAt) {
      chip = document.createElement("span");
      chip.className = "ets-expire-chip";
      bar.insertBefore(chip, bar.firstChild);
    }
    var tick = function () {
      if (w.__yysdCut) return;
      if (!st.expireAt) return;
      var left = Date.parse(st.expireAt) - Date.now();
      if (left <= 5000) { cut("expired", onCut); return; }
      if (chip) {
        chip.textContent = "剩余 " + fmtLeft(left);
        if (left < 60000) chip.classList.add("is-soon");
      }
      setTimeout(tick, 1000);
    };
    if (st.expireAt) tick();

    var poll = function () {
      if (w.__yysdCut) return;
      fetchAccess().then(function (next) {
        if (w.__yysdCut) return;
        if (!next.on && next.reason !== "error") {
          cut(next.reason === "expired" ? "expired" : "off", onCut);
          return;
        }
        st = next;
        setTimeout(poll, 300000);
      });
    };
    setTimeout(poll, 300000);

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible" || w.__yysdCut) return;
      fetchAccess().then(function (next) {
        if (!next.on && next.reason !== "error" && !w.__yysdCut) {
          cut(next.reason === "expired" ? "expired" : "off", onCut);
        }
      });
    });
  }

  function gate() {
    if (exempt()) return Promise.resolve({ on: true, staff: true });
    return fetchAccess();
  }

  // 入口页（practice / 四个 lab / bank）：锁住就铺锁卡，返回 false
  function boot() {
    return gate().then(function (st) {
      if (st.on) return true;
      showLock(st);
      return false;
    });
  }

  // 做题页：放行后挂倒计时 chip + 轮询；到期/被收回调 onCut 自动交卷
  function paper(onCut) {
    return gate().then(function (st) {
      if (!st.on) {
        showLock(st);
        return false;
      }
      armWatch(st, onCut);
      return true;
    });
  }

  w.YYSD_ACCESS = { fetch: fetchAccess, boot: boot, paper: paper, showLock: showLock, _exemptOf: exemptOf };
})(window);
