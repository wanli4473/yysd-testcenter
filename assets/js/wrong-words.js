/* wrong-words.js — unified wrong book: date + book + lists sessions */
(function () {
  "use strict";
  var Y = window.YYSD;
  var A = window.YYSD_AUTH;
  var contentEl = document.getElementById("content");
  var params = new URLSearchParams(location.search);
  var sessionId = Number(params.get("session") || 0);

  var navLink = document.querySelector('#nav a[data-zone="study"]');
  if (navLink) navLink.classList.add("is-active");
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function esc(s) {
    return Y && Y.esc ? Y.esc(String(s == null ? "" : s)) : String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function needAuth() {
    if (!A || !A.getToken || !A.getToken()) {
      location.href = "login.html?next=" + encodeURIComponent(location.pathname + location.search);
      return false;
    }
    return true;
  }

  function fail(msg) {
    contentEl.innerHTML = '<div class="state"><h3>无法打开</h3><p>' + esc(msg) +
      '</p><p><a href="zone.html?zone=study&s=vocab">返回单词区</a></p></div>';
  }

  function importLocalOnce() {
    if (!Y || !Y.wrongWords) return Promise.resolve();
    try {
      if (localStorage.getItem("yysd:wrongbook:local-imported") === "1") {
        return Promise.resolve();
      }
    } catch (e) {}
    var books = [];
    ["gaozhong", "cet4", "special"].forEach(function (k) {
      var words = Y.wrongWords(k) || [];
      if (!words.length) return;
      books.push({
        bookId: k,
        words: words.map(function (w) {
          return { word: w.word, ipa: w.ipa, meaning: w.meaning };
        })
      });
    });
    if (!books.length) {
      try { localStorage.setItem("yysd:wrongbook:local-imported", "1"); } catch (e2) {}
      return Promise.resolve();
    }
    return A.api("/api/vocab-shelf/wrongbook/import-local", {
      method: "POST",
      body: { books: books }
    }).then(function () {
      try { localStorage.setItem("yysd:wrongbook:local-imported", "1"); } catch (e3) {}
    }).catch(function () {});
  }

  function renderList(data) {
    var sessions = data.sessions || [];
    var total = data.totalMistakes || 0;
    document.title = "错题本 · 优益思达国际课程中心";
    var rows = sessions.length
      ? sessions.map(function (s) {
          return '<a class="vs-list-row" href="wrong-words.html?session=' + s.id + '">' +
            "<div><b>" + esc(s.title) + "</b>" +
            '<span class="vs-row__meta">错词 ' + (s.wrongCount || 0) +
            (s.passed ? " · 当时已通关" : "") + "</span></div>" +
            '<span class="vs-go">查看 ›</span></a>';
        }).join("")
      : '<div class="soon-box premium-empty">还没有错题记录。去「单词检测」完成一场后，错词会按日期 + 词书 + List 出现在这里。</div>';

    contentEl.innerHTML =
      '<div class="cam-hero vocab-hero wrong-words-hero bento-panel">' +
        '<div class="cam-hero__badge"><div class="lbl">错题</div><div class="num">' + total + "</div></div>" +
        "<div><h1>错题本</h1>" +
        '<div class="meta">按检测场次：日期 + 词书 + List · 答对不自动删除，可手动删除整场</div>' +
        '<div class="vocab-hero__actions">' +
          '<a class="btn btn--primary btn--sm" href="vocab-quiz.html">去检测</a>' +
          '<a class="btn btn--ghost btn--sm" href="zone.html?zone=study&s=vocab">← 单词区</a>' +
        "</div></div></div>" +
      '<div class="vs-list" style="margin-top:14px">' + rows + "</div>";
  }

  function renderSession(data) {
    var s = data.session;
    var mistakes = data.mistakes || [];
    document.title = s.title + " · 错题本 · 优益思达";
    var cards = mistakes.length
      ? '<div class="wrong-words-list">' + mistakes.map(function (w) {
          return '<article class="wrong-word-card">' +
            '<div class="wrong-word-card__main">' +
              '<div class="wrong-word-card__head"><h3>' + esc(w.word) +
                ' <span class="wrong-word-card__ipa">' + esc(w.ipa || "") + "</span></h3></div>" +
              '<p class="wrong-word-card__meaning">' + esc(w.meaning || "") + "</p>" +
              (w.userAnswer
                ? '<p class="wrong-word-card__attempt">作答：' + esc(w.userAnswer) + "</p>"
                : "") +
            "</div>" +
            '<div class="wrong-word-card__actions">' +
              '<button type="button" class="btn btn--ghost btn--sm btn-speak" data-word="' +
                esc(w.word) + '">🔊 发音</button>' +
            "</div></article>";
        }).join("") + "</div>"
      : '<div class="soon-box premium-empty">这场目前没有错词（重测已清空列表）。记录仍保留，可手动删除。</div>';

    contentEl.innerHTML =
      '<div class="cam-hero vocab-hero wrong-words-hero bento-panel">' +
        '<div class="cam-hero__badge"><div class="lbl">场次</div><div class="num">' +
          mistakes.length + "</div></div>" +
        "<div><h1>" + esc(s.title) + "</h1>" +
        '<div class="meta">' + esc(s.bookLabel) + " · 错词重测会更新本场列表</div>" +
        '<div class="vocab-hero__actions">' +
          '<a class="btn btn--ghost btn--sm" href="wrong-words.html">← 全部场次</a>' +
          (mistakes.length
            ? '<a class="btn btn--primary btn--sm" href="vocab-quiz.html?session=' + s.id +
              '">错词重测</a>'
            : "") +
          '<button type="button" class="btn btn--ghost btn--sm" id="btn-del-session">删除本场</button>' +
        "</div></div></div>" +
      cards;

    contentEl.querySelectorAll(".btn-speak").forEach(function (btn) {
      btn.onclick = function () {
        var word = btn.getAttribute("data-word");
        if (!window.speechSynthesis || !word) return;
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(word);
        u.lang = "en-GB";
        window.speechSynthesis.speak(u);
      };
    });
    document.getElementById("btn-del-session").onclick = function () {
      if (!confirm("删除后不可恢复，确定删除这场错题记录？")) return;
      A.api("/api/vocab-shelf/wrongbook/session/remove", {
        method: "POST",
        body: { sessionId: s.id }
      }).then(function () {
        location.href = "wrong-words.html";
      }).catch(function (e) {
        alert((e && e.message) || "删除失败");
      });
    };
  }

  function boot() {
    if (!needAuth()) return;
    contentEl.innerHTML = '<div class="state state--brand"><div class="spinner spinner--brand"></div>正在加载…</div>';
    importLocalOnce().then(function () {
      if (sessionId) {
        return A.api("/api/vocab-shelf/wrongbook/session?id=" + encodeURIComponent(sessionId))
          .then(renderSession);
      }
      return A.api("/api/vocab-shelf/wrongbook").then(renderList);
    }).catch(function (e) {
      fail((e && e.message) || "加载失败");
    });
  }

  boot();
})();
