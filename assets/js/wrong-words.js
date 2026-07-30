/* =========================================================================
   wrong-words.js — vocabulary wrong-word notebook (per book)
   wrong-words.html?book=gaozhong | cet4 | special | themes
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;

  var params = new URLSearchParams(location.search);
  var bookKey = (params.get("book") || "gaozhong").trim();
  var book = Y.VOCAB_BOOKS[bookKey];
  var contentEl = document.getElementById("content");
  var searchQuery = "";
  var viewMode = "list"; // list | retest

  var navLink = document.querySelector('#nav a[data-zone="study"]');
  if (navLink) navLink.classList.add("is-active");
  document.getElementById("year").textContent = new Date().getFullYear();

  var ACTIVE_BOOKS = { gaozhong: true, cet4: true, special: true };

  function bootWrongWords() {

  function fail(msg) {
    contentEl.innerHTML = '<div class="state"><h3>无法打开</h3><p>' + Y.esc(msg) +
      '</p><p><a href="zone.html?zone=study&s=vocab">返回单词区</a></p></div>';
  }

  if (!book) { fail("无效的错题本类型。"); return; }
  if (!ACTIVE_BOOKS[bookKey]) {
    contentEl.innerHTML = '<div class="state"><h3>即将上线</h3><p>' + Y.esc(book.label) +
      ' 错题本正在制作中，请先使用高中或四级词汇错题本。</p>' +
      '<p><a class="btn btn--primary btn--sm" href="wrong-words.html?book=gaozhong">前往高中错题本</a> ' +
      '<a class="btn btn--ghost btn--sm" href="wrong-words.html?book=cet4">四级错题本</a> ' +
      '<a class="btn btn--ghost btn--sm" href="zone.html?zone=study&s=vocab">返回单词区</a></p></div>';
    document.title = "单词错题本 · 优益思达国际课程中心";
    return;
  }

  document.title = book.label + " · 错题本 · 优益思达国际课程中心";

  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("zh-CN", { hour12: false, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function sourceLabel(src) {
    if (!src) return "";
    var t = src.title || "";
    var m = t.match(/LIST\s*0*(\d+)/i);
    if (m) return "LIST " + m[1];
    m = t.match(/第\s*0*(\d+)\s*篇/);
    if (m) return "第" + m[1] + "篇";
    m = t.match(/单元\s*0*(\d+)/);
    if (m) return "单元" + m[1];
    return t;
  }

  function meaningCorrect(userMeaning, w) {
    var userCN = String(userMeaning || "").replace(/\s+/g, "");
    if (!userCN) return false;
    var accepts = w.acceptCN || [];
    for (var i = 0; i < accepts.length; i++) {
      if (userCN.includes(accepts[i]) || accepts[i].includes(userCN)) return true;
    }
    var meaningClean = String(w.meaning || "").replace(/[；;，,、\s]/g, "");
    return userCN.includes(meaningClean.substring(0, Math.min(3, meaningClean.length))) ||
      meaningClean.includes(userCN);
  }

  function filteredWords() {
    var words = Y.wrongWords(bookKey);
    var q = searchQuery.toLowerCase().trim();
    if (!q) return words;
    return words.filter(function (w) {
      var hay = (w.word + " " + w.meaning + " " + (w.ipa || "")).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function heroHTML(count) {
    return '<div class="cam-hero vocab-hero wrong-words-hero bento-panel">' +
      '<div class="cam-hero__badge"><div class="lbl">错题</div><div class="num">' + count + '</div></div>' +
      '<div><h1>' + Y.esc(book.label) + ' · 错题本</h1>' +
      '<div class="meta">' + (count
        ? count + ' 个错词 · 拼写和释义须全对才算掌握'
        : '暂无错词 · 完成单词检测后会自动收录') + '</div>' +
      '<div class="vocab-hero__actions">' +
        (count ? '<button type="button" class="btn btn--primary btn--sm" id="btn-retest">错题重测</button>' : '') +
        '<a class="btn btn--ghost btn--sm" href="vocab.html?book=' + encodeURIComponent(bookKey) + '">去背单词</a>' +
        (count ? '<button type="button" class="btn btn--ghost btn--sm" id="btn-clear">清空错题本</button>' : '') +
      '</div></div></div>';
  }

  function listHTML(words) {
    if (!words.length) {
      return '<div class="soon-box premium-empty">还没有错词。去做一次单词检测，拼写或释义没全对的词会自动出现在这里。</div>';
    }
    return '<div class="wrong-words-list">' + words.map(function (w) {
      var key = String(w.word).toLowerCase();
      var src = (w.sources && w.sources[0]) || null;
      var attempt = w.lastAttempt || {};
      var attemptTxt = "";
      if (attempt.userSpelling != null || attempt.userMeaning != null) {
        var parts = [];
        if (!attempt.spellingCorrect) parts.push("拼写：" + (attempt.userSpelling || "未填"));
        if (!attempt.meaningCorrect) parts.push("释义：" + (attempt.userMeaning || "未填"));
        attemptTxt = parts.join(" · ");
      }
      return '<article class="wrong-word-card" data-key="' + Y.esc(key) + '">' +
        '<div class="wrong-word-card__main">' +
          '<div class="wrong-word-card__head">' +
            '<h3>' + Y.esc(w.word) + ' <span class="wrong-word-card__ipa">' + Y.esc(w.ipa || "") + '</span></h3>' +
            '<span class="wrong-word-card__count">错 ' + (w.wrongCount || 1) + ' 次</span>' +
          '</div>' +
          '<p class="wrong-word-card__meaning">' + Y.esc(w.meaning || "") + '</p>' +
          (attemptTxt ? '<p class="wrong-word-card__attempt">上次作答：' + Y.esc(attemptTxt) + '</p>' : '') +
          '<div class="wrong-word-card__meta">' +
            (src ? '<a class="wrong-word-card__src" href="exam.html?id=' + encodeURIComponent(src.id) + '">来自 ' + Y.esc(sourceLabel(src)) + '</a>' : '') +
            '<span class="wrong-word-card__date">' + Y.esc(formatDate(w.lastWrongAt)) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="wrong-word-card__actions">' +
          '<button type="button" class="btn btn--ghost btn--sm btn-speak" data-word="' + Y.esc(w.word) + '">🔊 发音</button>' +
          '<button type="button" class="btn btn--ghost btn--sm btn-remove" data-key="' + Y.esc(key) + '">移出</button>' +
        '</div>' +
      '</article>';
    }).join("") + '</div>';
  }

  function retestHTML(words) {
    return '<section class="wrong-retest" id="retest-panel">' +
      '<div class="wrong-retest__head">' +
        '<h2>错题重测</h2>' +
        '<p>共 ' + words.length + ' 题 · 拼写和释义都正确才算通过</p>' +
        '<button type="button" class="btn btn--ghost btn--sm" id="btn-exit-retest">返回列表</button>' +
      '</div>' +
      '<div class="wrong-retest__progress" id="retest-progress"></div>' +
      '<div class="wrong-retest__card" id="retest-card"></div>' +
    '</section>';
  }

  function toolbarHTML() {
    return '<div class="wrong-words-toolbar">' +
      '<label class="catalog-search wrong-words-search">' +
        '<span class="catalog-search__ico" aria-hidden="true">⌕</span>' +
        '<input type="search" id="word-search" placeholder="搜索单词或释义…" autocomplete="off" spellcheck="false">' +
      '</label></div>';
  }

  function render() {
    var words = filteredWords();
    var html = heroHTML(Y.wrongWordCount(bookKey)) + toolbarHTML();
    if (viewMode === "retest" && words.length) {
      html += retestHTML(words);
    } else {
      html += listHTML(words);
    }
    contentEl.innerHTML = html;
    bindEvents(words);
    if (viewMode === "retest" && words.length) startRetest(words);
  }

  var synth = window.speechSynthesis;
  function speak(word) {
    if (!synth || !word) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(word);
    u.lang = "en-GB";
    u.rate = 0.9;
    synth.speak(u);
  }

  // ---- Retest state ----
  var retestWords = [], retestIndex = 0, retestScore = 0, retestSubmitted = false;

  function startRetest(words) {
    retestWords = shuffle(words.slice());
    retestIndex = 0;
    retestScore = 0;
    retestSubmitted = false;
    showRetestQuestion();
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function showRetestQuestion() {
    var panel = document.getElementById("retest-card");
    var prog = document.getElementById("retest-progress");
    if (!panel) return;

    if (retestIndex >= retestWords.length) {
      var pct = Math.round((retestScore / retestWords.length) * 100);
      panel.innerHTML = '<div class="wrong-retest__done">' +
        '<h3>重测完成</h3>' +
        '<p class="wrong-retest__score">' + retestScore + ' / ' + retestWords.length + '（' + pct + '%）</p>' +
        '<p>做对的词仍保留在错题本，掌握后可手动移出。</p>' +
        '<button type="button" class="btn btn--primary btn--sm" id="btn-retest-again">再测一次</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" id="btn-exit-retest">返回列表</button>' +
      '</div>';
      if (prog) prog.textContent = "已完成";
      panel.querySelector("#btn-retest-again").addEventListener("click", function () {
        startRetest(filteredWords());
      });
      panel.querySelector("#btn-exit-retest").addEventListener("click", function () {
        viewMode = "list";
        render();
      });
      return;
    }

    var w = retestWords[retestIndex];
    if (prog) prog.textContent = "第 " + (retestIndex + 1) + " / " + retestWords.length + " 题 · 得分 " + retestScore;

    panel.innerHTML = '<div class="wrong-retest__q">' +
      '<button type="button" class="btn btn--ghost btn--sm" id="btn-play-word">🔊 播放发音</button>' +
      '<label class="wrong-retest__field"><span>拼写</span>' +
        '<input type="text" id="retest-spelling" autocomplete="off" spellcheck="false" placeholder="输入英文拼写"></label>' +
      '<label class="wrong-retest__field"><span>释义</span>' +
        '<input type="text" id="retest-meaning" autocomplete="off" placeholder="输入中文释义"></label>' +
      '<div class="wrong-retest__feedback" id="retest-feedback" hidden></div>' +
      '<div class="wrong-retest__btns">' +
        '<button type="button" class="btn btn--primary btn--sm" id="btn-retest-submit">提交</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" id="btn-retest-next" hidden>下一题</button>' +
      '</div></div>';

    retestSubmitted = false;
    panel.querySelector("#btn-play-word").addEventListener("click", function () { speak(w.word); });
    panel.querySelector("#btn-retest-submit").addEventListener("click", function () { submitRetest(w); });
    panel.querySelector("#btn-retest-next").addEventListener("click", function () {
      retestIndex++;
      showRetestQuestion();
    });
    var spellEl = panel.querySelector("#retest-spelling");
    var meanEl = panel.querySelector("#retest-meaning");
    meanEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !retestSubmitted) submitRetest(w);
    });
    spellEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !retestSubmitted) meanEl.focus();
    });
    setTimeout(function () { speak(w.word); spellEl.focus(); }, 300);
  }

  function submitRetest(w) {
    if (retestSubmitted) return;
    retestSubmitted = true;
    var panel = document.getElementById("retest-card");
    var spellEl = panel.querySelector("#retest-spelling");
    var meanEl = panel.querySelector("#retest-meaning");
    var fb = panel.querySelector("#retest-feedback");
    var userSpelling = spellEl.value.trim();
    var userMeaning = meanEl.value.trim();
    var spellingOk = userSpelling.toLowerCase() === String(w.word).toLowerCase();
    var meaningOk = meaningCorrect(userMeaning, w);
    var earned = spellingOk && meaningOk;

    if (earned) retestScore++;

    fb.hidden = false;
    fb.className = "wrong-retest__feedback " + (earned ? "is-correct" : "is-wrong");
    if (earned) {
      fb.innerHTML = "✅ 完全正确！" + Y.esc(w.word) + " — " + Y.esc(w.meaning);
    } else {
      fb.innerHTML = "❌ 未全对<br>正确拼写：<strong>" + Y.esc(w.word) + "</strong> · 释义：<strong>" + Y.esc(w.meaning) + "</strong>";
      Y.mergeWrongWords(bookKey, [{
        word: w.word, ipa: w.ipa, meaning: w.meaning, acceptCN: w.acceptCN,
        userSpelling: userSpelling, userMeaning: userMeaning,
        spellingCorrect: spellingOk, meaningCorrect: meaningOk
      }], (w.sources && w.sources[0]) || null);
    }

    panel.querySelector("#btn-retest-submit").hidden = true;
    panel.querySelector("#btn-retest-next").hidden = false;
  }

  function bindEvents(words) {
    var searchEl = document.getElementById("word-search");
    if (searchEl) {
      searchEl.value = searchQuery;
      searchEl.addEventListener("input", function () {
        searchQuery = searchEl.value;
        if (viewMode === "list") render();
      });
    }

    var retestBtn = document.getElementById("btn-retest");
    if (retestBtn) {
      retestBtn.addEventListener("click", function () {
        viewMode = "retest";
        render();
      });
    }

    var clearBtn = document.getElementById("btn-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (!confirm("确定清空「" + book.label + "」错题本吗？此操作不可恢复。")) return;
        Y.clearWrongWords(bookKey);
        viewMode = "list";
        render();
      });
    }

    var exitBtn = document.getElementById("btn-exit-retest");
    if (exitBtn) {
      exitBtn.addEventListener("click", function () {
        viewMode = "list";
        render();
      });
    }

    contentEl.querySelectorAll(".btn-speak").forEach(function (btn) {
      btn.addEventListener("click", function () {
        speak(btn.getAttribute("data-word"));
      });
    });

    contentEl.querySelectorAll(".btn-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-key");
        if (!confirm("确定将「" + key + "」移出错题本吗？")) return;
        Y.removeWrongWord(bookKey, key);
        render();
      });
    });
  }

  render();
  } // end bootWrongWords

  if (window.YYSD_DIAG_GATE) {
    window.YYSD_DIAG_GATE.ensure({ requireLogin: true }).then(function (ok) {
      if (ok) bootWrongWords();
    });
  } else {
    bootWrongWords();
  }
})();
