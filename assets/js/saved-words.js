/* saved-words.js — AI 生词本列表 */
(function () {
  "use strict";
  var Y = window.YYSD;
  var contentEl = document.getElementById("content");
  var searchQuery = "";

  var navLink = document.querySelector('#nav a[data-zone="study"]');
  if (navLink) navLink.classList.add("is-active");
  document.getElementById("year").textContent = new Date().getFullYear();
  document.title = "生词本 · 优益思达国际课程中心";

  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("zh-CN", { hour12: false, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function filtered() {
    var words = Y.savedWords();
    var q = searchQuery.toLowerCase().trim();
    if (!q) return words;
    return words.filter(function (w) {
      return (w.word + " " + w.meaning + " " + (w.ipa || "")).toLowerCase().indexOf(q) >= 0;
    });
  }

  function render() {
    var words = filtered();
    var n = Y.savedWordCount();
    var html = '<div class="cam-hero vocab-hero wrong-words-hero bento-panel">' +
      '<div class="cam-hero__badge"><div class="lbl">生词</div><div class="num">' + n + "</div></div>" +
      "<div><h1>AI 生词本</h1>" +
      '<div class="meta">' + (n ? n + " 个收藏生词" : "暂无生词 · 在单词区用 AI 查词后可加入") + "</div>" +
      '<div class="vocab-hero__actions">' +
        '<a class="btn btn--primary btn--sm" href="zone.html?zone=study&s=vocab">去 AI 查词</a>' +
        (n ? '<button type="button" class="btn btn--ghost btn--sm" id="btn-clear">清空生词本</button>' : "") +
      "</div></div></div>" +
      '<div class="wrong-words-toolbar">' +
        '<label class="catalog-search wrong-words-search">' +
          '<span class="catalog-search__ico" aria-hidden="true">⌕</span>' +
          '<input type="search" id="word-search" placeholder="搜索生词…" autocomplete="off" spellcheck="false" value="' +
            Y.esc(searchQuery) + '">' +
        "</label></div>";

    if (!words.length) {
      html += '<div class="soon-box premium-empty">' + (n ? "没有匹配的生词。" : "还没有生词。回到单词区用 AI 查词，再点「加入生词本」。") + "</div>";
    } else {
      html += '<div class="wrong-words-list">' + words.map(function (w) {
        var key = String(w.word).toLowerCase();
        return '<article class="wrong-word-card" data-key="' + Y.esc(key) + '">' +
          '<div class="wrong-word-card__main">' +
            '<div class="wrong-word-card__head">' +
              "<h3>" + Y.esc(w.word) + ' <span class="wrong-word-card__ipa">' + Y.esc(w.ipa || "") + "</span></h3>" +
            "</div>" +
            '<p class="wrong-word-card__meaning">' + Y.esc(w.meaning || "") + "</p>" +
            '<div class="wrong-word-card__meta">' +
              '<span class="wrong-word-card__date">' + Y.esc(formatDate(w.savedAt)) + "</span>" +
            "</div>" +
          "</div>" +
          '<div class="wrong-word-card__actions">' +
            '<button type="button" class="btn btn--ghost btn--sm btn-speak" data-word="' + Y.esc(w.word) + '">🔊 发音</button>' +
            '<button type="button" class="btn btn--ghost btn--sm btn-remove" data-key="' + Y.esc(key) + '">移出</button>' +
          "</div></article>";
      }).join("") + "</div>";
    }

    contentEl.innerHTML = html;

    var search = document.getElementById("word-search");
    if (search) {
      search.addEventListener("input", function () {
        searchQuery = search.value;
        render();
        var again = document.getElementById("word-search");
        if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
      });
    }
    var clearBtn = document.getElementById("btn-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (!confirm("确定清空生词本？")) return;
        Y.clearSavedWords();
        render();
      });
    }
    contentEl.querySelectorAll(".btn-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        Y.removeSavedWord(btn.getAttribute("data-key"));
        render();
      });
    });
    var synth = window.speechSynthesis;
    contentEl.querySelectorAll(".btn-speak").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!synth) return;
        synth.cancel();
        var u = new SpeechSynthesisUtterance(btn.getAttribute("data-word") || "");
        u.lang = "en-GB";
        u.rate = 0.9;
        synth.speak(u);
      });
    });
  }

  render();
})();
