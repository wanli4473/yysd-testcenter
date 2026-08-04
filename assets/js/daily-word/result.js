/* =========================================================================
   daily-word/result.js — 结算页
   ========================================================================= */
(function () {
  "use strict";
  var DW = window.YYSD_DAILY_WORD;
  var root = document.getElementById("dw-root");

  function loadResult() {
    try {
      return JSON.parse(localStorage.getItem(DW.KEYS.result) || "null");
    } catch (e) {
      return null;
    }
  }

  function boot() {
    var r = loadResult();
    var task = DW.getTask();
    if (!r && task && task.completed) {
      r = {
        total: task.wordList.length,
        mastered: task.wordList.length,
        weakSpeak: task.weakSpeak || [],
        weakSpell: task.weakSpell || [],
        bookLabel: task.bookLabel || "",
        elapsedSec: 0
      };
    }
    if (!r) {
      root.innerHTML = '<div class="dw-fail"><p>暂无今日报告</p>' +
        '<p><a href="daily-word-setup.html">开始今日任务</a></p></div>';
      return;
    }

    var total = r.total || 0;
    var mastered = r.mastered != null ? r.mastered : total;
    var rate = total ? Math.round((mastered / total) * 100) : 0;
    var speakN = (r.weakSpeak || []).length;
    var spellN = (r.weakSpell || []).length;
    var mins = r.elapsedSec ? Math.max(1, Math.round(r.elapsedSec / 60)) : "—";

    function listHtml(arr) {
      if (!arr || !arr.length) return "<li>无</li>";
      return arr.map(function (w) { return "<li>" + DW.esc(w) + "</li>"; }).join("");
    }

    root.innerHTML =
      '<div class="dw-shell">' +
        '<header class="dw-top">' +
          '<a class="dw-back" href="zone.html?zone=study&s=vocab" aria-label="返回">←</a>' +
          '<div class="dw-top__title">今日学习报告</div>' +
        "</header>" +
        '<p class="dw-hint">' + DW.esc(r.bookLabel || "每日单词") + " · 用时 " + mins + " 分钟</p>" +
        '<div class="dw-stats">' +
          '<div class="dw-stat"><div class="dw-stat__n">' + total + '</div><div class="dw-stat__l">今日学习</div></div>' +
          '<div class="dw-stat"><div class="dw-stat__n">' + rate + '%</div><div class="dw-stat__l">掌握率</div></div>' +
          '<div class="dw-stat"><div class="dw-stat__n">' + speakN + '</div><div class="dw-stat__l">发音薄弱</div></div>' +
          '<div class="dw-stat"><div class="dw-stat__n">' + spellN + '</div><div class="dw-stat__l">拼写易错</div></div>' +
        "</div>" +
        '<div class="dw-weak"><h3>发音薄弱词</h3><ul>' + listHtml(r.weakSpeak) + "</ul></div>" +
        '<div class="dw-weak"><h3>拼写易错词</h3><ul>' + listHtml(r.weakSpell) + "</ul></div>" +
        '<div class="dw-result-actions">' +
          '<a class="dw-btn dw-btn--primary" href="zone.html?zone=study&s=vocab">返回单词中心</a>' +
          '<a class="dw-btn dw-btn--ghost" href="daily-word-setup.html">再学一组</a>' +
        "</div>" +
      "</div>";

    // clear active task so zone card shows setup again
    if (task && task.completed) DW.clearTask();
  }

  boot();
})();
