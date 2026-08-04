/* =========================================================================
   daily-word/stages.js — 四步学习 UI：image / speaking / spelling / detail
   ========================================================================= */
(function (global) {
  "use strict";

  var DW = global.YYSD_DAILY_WORD;

  function placeholderSvg(word) {
    var letter = String(word || "?").charAt(0).toUpperCase();
    return "data:image/svg+xml," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#dbeafe"/><stop offset="100%" stop-color="#bfdbfe"/></linearGradient></defs>' +
      '<rect width="100%" height="100%" fill="url(#g)"/>' +
      '<text x="50%" y="52%" text-anchor="middle" font-size="180" font-family="Georgia,serif" fill="#1e3a5f">' +
      letter + "</text></svg>"
    );
  }

  function imgSrc(wordObj, bookId) {
    var key = DW.imageKey(bookId, wordObj.word);
    var cached = DW.getImages()[key];
    return cached || wordObj.imageUrl || placeholderSvg(wordObj.word);
  }

  function renderImage(host, ctx) {
    var w = ctx.word;
    var showZh = !!ctx.showHint;
    var canNext = !!ctx.canNext;
    host.innerHTML =
      '<div class="dw-stage dw-stage--image">' +
        '<div class="dw-card">' +
          '<div class="dw-card__img-wrap"><img class="dw-card__img" alt="" src="' + DW.esc(imgSrc(w, ctx.bookId)) + '"></div>' +
          '<div class="dw-card__body">' +
            '<button type="button" class="dw-def-play" data-act="play">Definition 点击即可播放</button>' +
            '<div class="dw-word">' + DW.esc(w.word) + "</div>" +
            (w.ipa ? '<div class="dw-ipa">' + DW.esc(w.ipa) + "</div>" : "") +
            (showZh ? '<div class="dw-zh">' + DW.esc(w.meaning) + "</div>" : "") +
          "</div>" +
        "</div>" +
        '<p class="dw-hint">' + (showZh ? "已显示中文提示" : "中文提示 请按 Space") + "</p>" +
        '<button type="button" class="dw-btn dw-btn--primary" data-act="to-speak"' +
          (canNext ? "" : " disabled") + ">开始跟读 Enter ↵</button>" +
      "</div>";
  }

  function renderSpeaking(host, ctx) {
    var w = ctx.word;
    var rec = ctx.recording;
    var status = ctx.speakStatus || "";
    var tries = ctx.speakTries || 0;
    var canSkip = tries >= 3;
    host.innerHTML =
      '<div class="dw-stage dw-stage--speak">' +
        '<div class="dw-card dw-card--speak">' +
          '<div class="dw-card__img-wrap"><img class="dw-card__img" alt="" src="' + DW.esc(imgSrc(w, ctx.bookId)) + '"></div>' +
        "</div>" +
        '<button type="button" class="dw-mic' + (rec ? " is-rec" : "") + '" data-act="mic" aria-label="录音">' +
          (rec ? "●" : "🎤") +
        "</button>" +
        '<p class="dw-hint">' +
          (rec ? "松开结束录音" : (status || "长按录音跟读，松开结束")) +
        "</p>" +
        (canSkip
          ? '<button type="button" class="dw-btn dw-btn--ghost" data-act="skip-speak">跳过并标记薄弱</button>'
          : "") +
        (tries > 0 && !canSkip
          ? '<button type="button" class="dw-btn dw-btn--ghost" data-act="retry-speak">再试一次 (R)</button>'
          : "") +
      "</div>";
  }

  function renderSpelling(host, ctx) {
    var w = ctx.word;
    var feedback = ctx.spellFeedback || "";
    var reveal = ctx.spellReveal;
    host.innerHTML =
      '<div class="dw-stage dw-stage--spell">' +
        '<div class="dw-spell-head">' +
          '<img class="dw-spell-thumb" alt="" src="' + DW.esc(imgSrc(w, ctx.bookId)) + '">' +
          '<div class="dw-zh dw-zh--lg">' + DW.esc(w.meaning) + "</div>" +
        "</div>" +
        '<label class="dw-spell-label">拼写这个单词' +
          '<input class="dw-spell-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ' +
            'data-act="spell-input" value="' + DW.esc(ctx.spellValue || "") + '"' +
            (reveal ? " disabled" : "") + ">" +
        "</label>" +
        (feedback ? '<p class="dw-feedback">' + feedback + "</p>" : "") +
        (reveal
          ? '<p class="dw-answer">正确答案：<strong>' + DW.esc(w.word) + "</strong></p>"
          : '<button type="button" class="dw-btn dw-btn--primary" data-act="submit-spell">提交 Enter</button>') +
      "</div>";
  }

  function renderDetail(host, ctx) {
    var w = ctx.word;
    var isLast = ctx.isLast;
    var phrases = String(w.phrases || "").trim();
    var example = String(w.example || "").trim();
    host.innerHTML =
      '<div class="dw-stage dw-stage--detail">' +
        '<div class="dw-detail">' +
          '<div class="dw-word">' + DW.esc(w.word) + "</div>" +
          (w.ipa ? '<div class="dw-ipa">' + DW.esc(w.ipa) + "</div>" : "") +
          (w.pos ? '<span class="dw-pos">' + DW.esc(w.pos) + "</span>" : "") +
          '<p class="dw-zh dw-zh--lg">' + DW.esc(w.meaning) + "</p>" +
          (phrases ? '<div class="dw-block"><h3>搭配</h3><p>' + DW.esc(phrases) + "</p></div>" : "") +
          (example ? '<div class="dw-block"><h3>例句</h3><p>' + DW.esc(example) +
            '</p><button type="button" class="dw-btn dw-btn--ghost dw-btn--sm" data-act="play-ex">播放例句</button></div>' : "") +
        "</div>" +
        '<button type="button" class="dw-btn dw-btn--primary" data-act="next-word">' +
          (isLast ? "查看今日报告" : "下一个单词") +
        "</button>" +
      "</div>";
  }

  function render(host, stage, ctx) {
    if (stage === "image") return renderImage(host, ctx);
    if (stage === "speaking") return renderSpeaking(host, ctx);
    if (stage === "spelling") return renderSpelling(host, ctx);
    if (stage === "detail") return renderDetail(host, ctx);
    host.innerHTML = '<p class="dw-fail">未知阶段</p>';
  }

  global.YYSD_DAILY_WORD_STAGES = {
    render: render,
    placeholderSvg: placeholderSvg,
    imgSrc: imgSrc
  };
})(typeof window !== "undefined" ? window : global);
