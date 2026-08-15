/* vocab-learn.js — template learn UI (card + list); progress synced to bookshelf API */

// ponytail: list = short gloss; card keeps full meaning 详解
function yysdMeaningForList(raw, accept) {
  if (accept && accept.length) return accept.join("；");
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return "";
  if (!/[A-Za-z]/.test(s) && !/(?:该词高中|须熟记|反义|同义|不规则|源自|易混|高考)/.test(s)) return s;

  s = s.replace(/[（(]([^）)]*)[）)]/g, function (_, inner) {
    return /[A-Za-z]/.test(inner) ? "" : "（" + inner + "）";
  });
  s = s.split(/(?:该词高中|须熟记|注意词性|阅读完形|写作中准确|商业阅读|宗教用语已|核心义项为|源自|易混|高考|较正式|相当于)/)[0];
  s = s.replace(/[。；;]?\s*(?:反义|同义|不规则)[:：]?[\s\S]*$/, "");

  var POS = /^(?:interj\.|modal(?:\s+v\.?)?|adj\.|adv\.|prep\.|conj\.|pron\.|num\.|art\.|int\.|det\.|aux\.|phr\.|pref\.|abbr\.|pl\.|vt\.|vi\.|n\.|v\.)/i;
  var out = "";
  var i = 0;
  while (i < s.length) {
    var prev = i === 0 ? " " : s.charAt(i - 1);
    if (/[\s.、，；。/／]/.test(prev)) {
      var m = s.slice(i).match(POS);
      if (m) {
        out += m[0];
        i += m[0].length;
        continue;
      }
    }
    var ch = s.charAt(i);
    if (/[A-Za-z]/.test(ch)) {
      i += 1;
      while (i < s.length && /[A-Za-z0-9'\u2019\-]/.test(s.charAt(i))) i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }

  out = out.replace(/[ \t]+/g, " ");
  out = out.replace(/（[^）]*）/g, function (full, off, str) {
    var j = off - 1;
    while (j >= 0 && str.charAt(j) === " ") j -= 1;
    if (j >= 0 && /[\u4e00-\u9fff]/.test(str.charAt(j))) return full;
    return "";
  });
  out = out.replace(/\s+([。；;，、])/g, "$1");
  out = out.replace(/([。；;，、]) +/g, "$1");
  out = out.replace(/(^|[^.\u4e00-\u9fff])\s*\/\s*(?=[^.\u4e00-\u9fff]|$)/g, "$1");
  out = out.replace(/[。；;，、]{2,}/g, function (x) { return /。/.test(x) ? "。" : x.charAt(0); });
  out = out.replace(/(?:名词|动词|形容词|副词|介词)[。；;\s]*$/g, "");
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/^\s*[。；;，、]+|[。；;，、\s]+$/g, "");
  out = out.replace(/([a-z])\.\s+/gi, "$1. ");
  out = out.trim();
  if (out && !/[。！？；]$/.test(out)) out += "。";

  var cjk = (out.match(/[\u4e00-\u9fff]/g) || []).length;
  if (cjk < 2) return accept && accept.length ? accept.join("；") : s;
  return out;
}

(function () {
  "use strict";
  var A = window.YYSD_AUTH;
  var params = new URLSearchParams(location.search);
  var bookId = (params.get("book") || "").trim();
  var listId = (params.get("list") || "").trim();
  var assignEventId = Number(params.get("event") || 0) || 0;
  var app = document.getElementById("vl-app");
  var backEl = document.getElementById("vl-back");

  var meta = { title: "", stageLabel: "" };
  var words = [];
  var state = {
    learnView: "card",
    learnIdx: 0,
    blurAllOff: false, // card view only
    blurOne: true, // card view: meaning blur per word
    blurWordList: false,
    blurMeaningList: true,
    saving: false
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function speak(word, accent) {
    var WA = window.YysdWordAudio;
    if (WA && WA.speak) {
      WA.speak(word, accent || WA.UK);
      return;
    }
    if (!window.speechSynthesis || !word) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(word);
    u.lang = accent === 2 ? "en-US" : "en-GB";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function saveProgress(done) {
    if (!A || !A.api || !bookId || !listId) return Promise.resolve();
    var wordIdx = state.learnIdx;
    // shelf progress may mark done at last card; assignment only on explicit finish
    var isDone = !!done || wordIdx >= Math.max(0, words.length - 1);
    var body = { bookId: bookId, listId: listId, wordIdx: wordIdx, done: isDone };
    if (done && assignEventId) body.assignmentEventId = assignEventId;
    return A.api("/api/vocab-shelf/progress", {
      method: "POST",
      body: body
    });
  }

  function learnViewToggleHtml() {
    return '<div class="vl-view-tabs" id="learnViewTabs">' +
      '<button type="button" class="vl-view-tab' + (state.learnView === "card" ? " active" : "") +
        '" data-v="card">卡片</button>' +
      '<button type="button" class="vl-view-tab' + (state.learnView === "list" ? " active" : "") +
        '" data-v="list">列表</button>' +
      "</div>";
  }

  function bindLearnChrome() {
    var tabs = document.getElementById("learnViewTabs");
    if (tabs) {
      tabs.onclick = function (e) {
        var b = e.target.closest(".vl-view-tab");
        if (!b) return;
        state.learnView = b.getAttribute("data-v");
        renderLearn();
      };
    }
    var blurBtn = document.getElementById("btnBlurAll");
    if (blurBtn) {
      blurBtn.onclick = function () {
        state.blurAllOff = !state.blurAllOff;
        state.blurOne = true;
        renderLearn();
      };
    }
    var blurWordBtn = document.getElementById("btnBlurWord");
    if (blurWordBtn) {
      blurWordBtn.onclick = function () {
        state.blurWordList = !state.blurWordList;
        renderLearn();
      };
    }
    var blurMeaningBtn = document.getElementById("btnBlurMeaning");
    if (blurMeaningBtn) {
      blurMeaningBtn.onclick = function () {
        state.blurMeaningList = !state.blurMeaningList;
        renderLearn();
      };
    }
  }

  function quizHrefForList() {
    return "vocab-quiz.html?book=" + encodeURIComponent(bookId) +
      "&lists=" + encodeURIComponent(listId);
  }

  function askStartListQuiz() {
    var existing = document.getElementById("vl-quiz-overlay");
    if (existing) existing.remove();
    var ov = document.createElement("div");
    ov.id = "vl-quiz-overlay";
    ov.className = "vl-overlay show";
    ov.innerHTML =
      '<div class="vl-result-box" role="dialog" aria-modal="true">' +
        "<h2>单词检测</h2>" +
        '<div style="color:#4d625b;font-size:14px;margin-top:6px">确定开始本 List 的单词检测吗？</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:16px">' +
          '<button type="button" class="vl-btn" id="vl-quiz-cancel">退出</button>' +
          '<button type="button" class="vl-btn vl-btn-primary" id="vl-quiz-ok">确定</button>' +
        "</div></div>";
    document.body.appendChild(ov);
    document.getElementById("vl-quiz-cancel").onclick = function () { ov.remove(); };
    document.getElementById("vl-quiz-ok").onclick = function () {
      location.href = quizHrefForList();
    };
  }

  function bindQuizEntry() {
    var btn = document.getElementById("btnQuizList");
    if (btn) btn.onclick = askStartListQuiz;
  }

  function shell(inner) {
    app.innerHTML =
      '<div class="vl-top-bar">' +
        '<div class="vl-brand">优益思达 · <span>词库学习</span></div>' +
        '<div class="vl-list-badge">' + esc(meta.stageLabel || "") + "</div>" +
      "</div>" +
      '<div class="vl-info-row"><div id="counter"></div></div>' +
      '<div id="panel">' + inner + "</div>";
  }

  function renderLearnList() {
    var blurWord = state.blurWordList;
    var blurMeaning = state.blurMeaningList;
    shell("");
    document.getElementById("counter").innerHTML =
      esc(meta.title || "") + " · 列表总览 <strong>" + words.length + "</strong> 词 · 点击一行进入卡片";
    var rows = words.map(function (w, i) {
      return '<tr class="word-row" data-i="' + i + '">' +
        '<td class="w-no">' + (i + 1) + "</td>" +
        '<td><div class="w-en' + (blurWord ? " blurred" : "") + '" title="' +
          (blurWord ? "点击暂时显示单词" : "") + '">' + esc(w.word) + "</div></td>" +
        '<td class="col-ipa"><span class="w-ipa">' + esc(w.ipa || "") + "</span></td>" +
        '<td class="col-pos"><span class="w-pos">' + esc(w.pos || "") + "</span></td>" +
        '<td><span class="w-meaning' + (blurMeaning ? " blurred" : "") + '" title="' +
          (blurMeaning ? "点击暂时显示释义" : "") + '">' +
          esc(yysdMeaningForList(w.meaning, w.acceptCN)) + "</span></td>" +
        '<td class="col-speak">' +
          '<button type="button" class="vl-btn btn-speak-row" data-w="' + esc(w.word) +
            '" data-accent="1" style="padding:6px 8px;font-size:12px" title="英音">英</button> ' +
          '<button type="button" class="vl-btn btn-speak-row" data-w="' + esc(w.word) +
            '" data-accent="2" style="padding:6px 8px;font-size:12px" title="美音">美</button></td>' +
        "</tr>";
    }).join("");
    document.getElementById("panel").innerHTML =
      '<div class="vl-toolbar">' +
        learnViewToggleHtml() +
        '<button type="button" class="vl-btn' + (blurWord ? " is-on" : "") + '" id="btnBlurWord">' +
          (blurWord ? "显示单词" : "模糊单词") + "</button>" +
        '<button type="button" class="vl-btn' + (blurMeaning ? " is-on" : "") + '" id="btnBlurMeaning">' +
          (blurMeaning ? "显示释义" : "模糊释义") + "</button>" +
      "</div>" +
      '<div style="overflow-x:auto">' +
        '<table class="vl-word-table">' +
          "<thead><tr><th>#</th><th>单词</th><th class=\"col-ipa\">音标</th>" +
          "<th class=\"col-pos\">词性</th><th>释义</th><th>发音</th></tr></thead>" +
          "<tbody>" + rows + "</tbody></table></div>";
    bindLearnChrome();
    app.querySelectorAll(".word-row").forEach(function (tr) {
      tr.onclick = function (e) {
        if (e.target.closest(".btn-speak-row")) return;
        // peek one blurred cell without leaving list
        var peek = e.target.closest(".w-en.blurred, .w-meaning.blurred");
        if (peek) {
          e.stopPropagation();
          peek.classList.remove("blurred");
          return;
        }
        state.learnIdx = Number(tr.getAttribute("data-i")) || 0;
        state.learnView = "card";
        state.blurOne = true;
        saveProgress(false);
        renderLearn();
      };
    });
    app.querySelectorAll(".btn-speak-row").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        speak(b.getAttribute("data-w"), Number(b.getAttribute("data-accent")) || 1);
      };
    });
  }

  function renderLearnCard() {
    var w = words[state.learnIdx];
    if (!w) return;
    var blur = state.blurAllOff ? false : state.blurOne;
    shell("");
    document.getElementById("counter").innerHTML =
      esc(meta.title || "") + " · 第 <strong>" + (state.learnIdx + 1) + "</strong> / " + words.length + " 词";

    var coll = "";
    if (w.collocations && w.collocations.length) {
      coll = '<div class="vl-section"><div class="vl-section-title">搭配</div><div class="vl-collocs">' +
        w.collocations.map(function (c) {
          return '<span class="vl-coloc">' + esc(c.phrase) +
            (c.meaning ? ' <span style="color:#6b7e78">→ ' + esc(c.meaning) + "</span>" : "") + "</span>";
        }).join("") + "</div></div>";
    }
    var exam = "";
    if (w.examTag) {
      exam = '<div class="vl-section"><div class="vl-exam">' +
        '<span><span class="lbl">来源 </span>' + esc(w.examTag.source || "") + "</span>" +
        '<span><span class="lbl">话题 </span>' + esc(w.examTag.topic || "") + "</span>" +
        '<span><span class="lbl">用法 </span>' + esc(w.examTag.commonUsage || "") + "</span>" +
        "</div></div>";
    }
    var root = w.root
      ? '<div class="vl-section"><div class="vl-section-title">词根拆解</div><div class="vl-root-text">' +
        esc(w.root) + "</div></div>"
      : "";
    var ex = "";
    if (w.exampleEn) {
      var en = esc(w.exampleEn);
      try {
        en = en.replace(
          new RegExp("\\b" + w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi"),
          function (m) { return '<span class="vl-hl">' + m + "</span>"; }
        );
      } catch (e) {}
      ex = '<div class="vl-section"><div class="vl-section-title">例句</div><div class="vl-ex-en">' + en +
        "</div>" + (w.exampleZh ? '<div class="vl-ex-zh">' + esc(w.exampleZh) + "</div>" : "") + "</div>";
    }
    var syn = "";
    if ((w.synonyms && w.synonyms.length) || (w.antonyms && w.antonyms.length)) {
      syn = '<div class="vl-section">' +
        (w.synonyms && w.synonyms.length ? '<div class="vl-syn">同义：' + esc(w.synonyms.join(" · ")) + "</div>" : "") +
        (w.antonyms && w.antonyms.length ? '<div class="vl-syn">反义：' + esc(w.antonyms.join(" · ")) + "</div>" : "") +
        "</div>";
    }

    var atEnd = state.learnIdx >= words.length - 1;
    document.getElementById("panel").innerHTML =
      '<div class="vl-toolbar">' +
        learnViewToggleHtml() +
        '<button type="button" class="vl-btn" id="btnBlurAll">' +
          (state.blurAllOff ? "恢复默认模糊" : "本课全部明文") + "</button>" +
        '<button type="button" class="vl-btn" id="btnSpeakUk">🔊 英音</button>' +
        '<button type="button" class="vl-btn" id="btnSpeakUs">🔊 美音</button>' +
        '<button type="button" class="vl-btn" id="btnQuizList">单词检测</button>' +
      "</div>" +
      '<div class="vl-word">' + esc(w.word) + "</div>" +
      '<div class="vl-ipa">' + esc(w.ipa || "") + "</div>" +
      (w.pos ? '<div class="vl-pos">' + esc(w.pos) + "</div>" : "") +
      '<div class="vl-meaning' + (blur ? " blurred" : "") + '" id="meaning">' +
        esc(w.meaning) + '<span class="vl-hint">点击显示/隐藏</span></div>' +
      exam + coll + ex + root + syn +
      '<div class="vl-nav-row">' +
        '<button type="button" class="vl-btn" id="prev">← 上一个</button>' +
        '<button type="button" class="vl-btn vl-btn-primary" id="next">' +
          (atEnd ? "完成本 List" : "下一个 →") + "</button>" +
      "</div>";

    bindLearnChrome();
    bindQuizEntry();
    document.getElementById("btnSpeakUk").onclick = function () { speak(w.word, 1); };
    document.getElementById("btnSpeakUs").onclick = function () { speak(w.word, 2); };
    document.getElementById("meaning").onclick = function () {
      if (state.blurAllOff) return;
      state.blurOne = !state.blurOne;
      renderLearn();
    };
    document.getElementById("prev").onclick = function () {
      if (state.learnIdx > 0) {
        state.learnIdx--;
        state.blurOne = true;
        saveProgress(false);
        renderLearn();
      }
    };
    document.getElementById("next").onclick = function () {
      if (atEnd) {
        saveProgress(true).then(function () {
          location.href = assignEventId
            ? "dashboard.html"
            : ("vocab-shelf.html?book=" + encodeURIComponent(bookId));
        }).catch(function (e) {
          alert((e && e.message) || "保存失败，请重试");
        });
        return;
      }
      state.learnIdx++;
      state.blurOne = true;
      saveProgress(false).catch(function () {});
      renderLearn();
    };
  }

  function renderLearn() {
    if (state.learnView === "list") renderLearnList();
    else renderLearnCard();
  }

  function fail(msg, href) {
    app.innerHTML = '<div class="vl-state"><p>' + esc(msg) + '</p>' +
      (href ? '<p style="margin-top:12px"><a class="vl-btn vl-btn-primary" href="' + href +
        '" style="display:inline-block;text-decoration:none">返回</a></p>' : "") +
      "</div>";
  }

  function boot() {
    if (!bookId || !listId) {
      fail("缺少词书或 List 参数", "vocab-shelf.html");
      return;
    }
    if (!A || !A.getToken || !A.getToken()) {
      location.href = "login.html?next=" + encodeURIComponent(location.pathname + location.search);
      return;
    }
    app.innerHTML = '<div class="vl-state">正在加载…</div>';
    // ponytail: same as quiz — homework deep-link must not require prior shelf add
    A.api("/api/vocab-shelf/add", { method: "POST", body: { bookId: bookId } })
      .catch(function () {})
      .then(function () {
        return A.api("/api/vocab-shelf/lesson?bookId=" + encodeURIComponent(bookId) +
          "&listId=" + encodeURIComponent(listId));
      })
      .then(function (d) {
        if (!d.words || !d.words.length) {
          fail("该 List 没有单词", "vocab-shelf.html?book=" + encodeURIComponent(bookId));
          return;
        }
        words = d.words;
        meta.title = (d.book && d.book.label) || bookId;
        meta.stageLabel = (d.list && d.list.label) || listId;
        state.learnIdx = Math.max(0, Math.min(d.progress && d.progress.wordIdx || 0, words.length - 1));
        if (backEl) {
          backEl.innerHTML = '<a href="vocab-shelf.html?book=' + encodeURIComponent(bookId) +
            '">← 返回 ' + esc(meta.title) + "</a>";
        }
        document.title = meta.stageLabel + " · " + meta.title + " · 优益思达";
        renderLearn();
      })
      .catch(function (e) {
        fail((e && e.message) || "加载失败", "vocab-shelf.html");
      });
  }

  boot();
})();
