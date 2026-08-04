/* =========================================================================
   daily-word/learn.js — 学习主页面：四步状态机、录音、续学、配图预取
   ========================================================================= */
(function () {
  "use strict";
  var DW = window.YYSD_DAILY_WORD;
  var ST = window.YYSD_DAILY_WORD_STAGES;
  var root = document.getElementById("dw-root");
  var exitModal = document.getElementById("dw-exit-modal");

  var task = null;
  var ui = {
    showHint: false,
    canNext: false,
    recording: false,
    speakStatus: "",
    speakTries: 0,
    spellValue: "",
    spellFeedback: "",
    spellReveal: false,
    spellTries: 0,
    // ponytail: block Enter briefly after stage change — spelling Enter was bubbling into detail→nextWord
    enterArmedAt: 0
  };
  var imageTimer = null;
  var mediaRec = null;
  var mediaChunks = [];
  var pressTimer = null;

  function word() {
    return task.wordList[task.currentIndex];
  }

  function persist() {
    DW.saveTask(task);
  }

  function progressPct() {
    var n = task.wordList.length || 1;
    return Math.round((task.currentIndex / n) * 100);
  }

  function shell(inner) {
    var w = word();
    var n = task.currentIndex + 1;
    var total = task.wordList.length;
    return '<div class="dw-shell">' +
      '<header class="dw-top">' +
        '<button type="button" class="dw-icon-btn" data-act="exit" aria-label="退出">✕</button>' +
        '<span class="dw-badge">学习阶段</span>' +
        '<div class="dw-progress-wrap">' +
          '<div class="dw-progress" aria-hidden="true"><div class="dw-progress__bar" style="width:' +
            progressPct() + '%"></div></div>' +
          '<span class="dw-progress__n">' + n + "/" + total + " 词</span>" +
        "</div>" +
      "</header>" +
      '<div class="dw-main" id="dw-stage">' + inner + "</div>" +
    "</div>";
  }

  function stageCtx() {
    return {
      word: word(),
      bookId: task.bookId,
      showHint: ui.showHint,
      canNext: ui.canNext,
      recording: ui.recording,
      speakStatus: ui.speakStatus,
      speakTries: ui.speakTries,
      spellValue: ui.spellValue,
      spellFeedback: ui.spellFeedback,
      spellReveal: ui.spellReveal,
      isLast: task.currentIndex >= task.wordList.length - 1
    };
  }

  function paint() {
    root.innerHTML = shell("");
    var host = document.getElementById("dw-stage");
    ST.render(host, task.stage, stageCtx());
    bindStage(host);
  }

  function enterImage() {
    task.stage = "image";
    ui.showHint = false;
    ui.canNext = false;
    ui.speakTries = task.speakTries[word().word] || 0;
    ui.spellTries = 0;
    ui.spellValue = "";
    ui.spellFeedback = "";
    ui.spellReveal = false;
    ui.speakStatus = "";
    persist();
    paint();
    DW.speakWord(word().word);
    clearTimeout(imageTimer);
    imageTimer = setTimeout(function () {
      ui.canNext = true;
      paint();
    }, 2000);
    prefetchImages();
  }

  function enterSpeaking() {
    task.stage = "speaking";
    ui.recording = false;
    ui.speakStatus = "";
    ui.speakTries = task.speakTries[word().word] || 0;
    persist();
    paint();
  }

  function enterSpelling() {
    task.stage = "spelling";
    ui.spellValue = "";
    ui.spellFeedback = "";
    ui.spellReveal = false;
    ui.spellTries = 0;
    persist();
    paint();
    setTimeout(function () {
      var inp = root.querySelector(".dw-spell-input");
      if (inp) inp.focus();
    }, 50);
  }

  function armEnter(ms) {
    ui.enterArmedAt = Date.now() + (ms || 500);
  }

  function enterReady() {
    return Date.now() >= (ui.enterArmedAt || 0);
  }

  function enterDetail() {
    task.stage = "detail";
    armEnter(600);
    persist();
    paint();
  }

  function markSpeakFail() {
    var w = word().word;
    if (task.weakSpeak.indexOf(w) < 0) task.weakSpeak.push(w);
    var prev = DW.getRecords()[DW.wordKey(task.bookId, w)] || {};
    DW.upsertRecord(task.bookId, w, {
      speakingWrong: true,
      wrongCount: (prev.wrongCount || 0) + 1,
      status: "learning"
    });
  }

  function markSpellFail() {
    var w = word().word;
    if (task.weakSpell.indexOf(w) < 0) task.weakSpell.push(w);
    var prev = DW.getRecords()[DW.wordKey(task.bookId, w)] || {};
    DW.upsertRecord(task.bookId, w, {
      spellingWrong: true,
      wrongCount: (prev.wrongCount || 0) + 1,
      status: "learning"
    });
  }

  function markWordOk() {
    var w = word().word;
    var prev = DW.getRecords()[DW.wordKey(task.bookId, w)] || {};
    var weak = task.weakSpeak.indexOf(w) >= 0 || task.weakSpell.indexOf(w) >= 0;
    DW.upsertRecord(task.bookId, w, {
      correctCount: (prev.correctCount || 0) + (weak ? 0 : 1),
      status: "learning",
      speakingWrong: task.weakSpeak.indexOf(w) >= 0,
      spellingWrong: task.weakSpell.indexOf(w) >= 0
    });
  }

  function finishTask() {
    var elapsed = Math.max(1, Math.round((Date.now() - task.startTime) / 1000));
    var total = task.wordList.length;
    var weakSpeak = task.weakSpeak || [];
    var weakSpell = task.weakSpell || [];
    var weakSet = {};
    weakSpeak.concat(weakSpell).forEach(function (x) { weakSet[x] = true; });
    var weakN = Object.keys(weakSet).length;
    var mastered = Math.max(0, total - weakN);
    var result = {
      date: task.date,
      bookId: task.bookId,
      bookLabel: task.bookLabel,
      total: total,
      mastered: Math.max(0, mastered),
      weakSpeak: weakSpeak,
      weakSpell: weakSpell,
      elapsedSec: elapsed,
      finishedAt: Date.now()
    };
    try {
      localStorage.setItem(DW.KEYS.result, JSON.stringify(result));
    } catch (e) {}
    task.completed = true;
    persist();
    location.href = "daily-word-result.html";
  }

  function nextWord() {
    markWordOk();
    if (task.currentIndex >= task.wordList.length - 1) {
      finishTask();
      return;
    }
    task.currentIndex += 1;
    enterImage();
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  function startRec() {
    if (ui.recording || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      ui.speakStatus = "当前环境不支持录音";
      paint();
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      mediaChunks = [];
      var mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      mediaRec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRec.ondataavailable = function (e) {
        if (e.data && e.data.size) mediaChunks.push(e.data);
      };
      mediaRec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        var blob = new Blob(mediaChunks, { type: mediaRec.mimeType || "audio/webm" });
        scoreSpeak(blob);
      };
      mediaRec.start();
      ui.recording = true;
      ui.speakStatus = "松开结束录音";
      paint();
    }).catch(function () {
      ui.speakStatus = "无法使用麦克风，请检查权限";
      paint();
    });
  }

  function stopRec() {
    if (!mediaRec || mediaRec.state === "inactive") {
      ui.recording = false;
      paint();
      return;
    }
    ui.recording = false;
    ui.speakStatus = "评测中…";
    paint();
    try { mediaRec.stop(); } catch (e) {
      ui.speakStatus = "录音失败";
      paint();
    }
  }

  function scoreSpeak(blob) {
    var w = word().word;
    blobToDataUrl(blob).then(function (dataUrl) {
      return DW.api("/api/daily-word/speak", {
        audio: dataUrl,
        target: w,
        audioSec: Math.min(15, Math.max(1, blob.size / 16000))
      });
    }).then(function (d) {
      task.speakTries[w] = (task.speakTries[w] || 0) + 1;
      ui.speakTries = task.speakTries[w];
      persist();
      if (d && d.pass) {
        ui.speakStatus = "通过 ✓";
        paint();
        setTimeout(enterSpelling, 450);
      } else {
        ui.speakStatus = "未通过" + (d && d.heard ? "（识别：" + d.heard + "）" : "") + "，请重试";
        if (ui.speakTries >= 3) markSpeakFail();
        paint();
      }
    }).catch(function (e) {
      task.speakTries[w] = (task.speakTries[w] || 0) + 1;
      ui.speakTries = task.speakTries[w];
      ui.speakStatus = (e && e.message) || "评测失败";
      if (ui.speakTries >= 3) markSpeakFail();
      persist();
      paint();
    });
  }

  function submitSpell() {
    if (ui.spellReveal) return;
    var w = word();
    var res = DW.spellCheck(ui.spellValue, w.word);
    if (res.ok) {
      enterDetail();
      return;
    }
    ui.spellTries += 1;
    if (ui.spellTries >= 2) {
      ui.spellReveal = true;
      ui.spellFeedback = "两次错误，已显示答案";
      markSpellFail();
      paint();
      setTimeout(enterDetail, 2000);
      return;
    }
    ui.spellFeedback = "拼写不正确，再试一次";
    paint();
    setTimeout(function () {
      var inp = root.querySelector(".dw-spell-input");
      if (inp) { inp.focus(); inp.select(); }
    }, 30);
  }

  function prefetchImages() {
    var list = task.wordList;
    var idx = task.currentIndex;
    [idx, idx + 1].forEach(function (i) {
      if (i < 0 || i >= list.length) return;
      var w = list[i];
      var key = DW.imageKey(task.bookId, w.word);
      if (DW.getImages()[key] || w.imageUrl) return;
      DW.api("/api/daily-word/image", { word: w.word, meaning: w.meaning }).then(function (d) {
        if (d && d.url) {
          DW.saveImage(key, d.url);
          w.imageUrl = d.url;
          if (i === task.currentIndex && (task.stage === "image" || task.stage === "speaking")) paint();
        }
      }).catch(function () { /* ponytail: placeholder ok */ });
    });
  }

  function bindStage(host) {
    host.addEventListener("click", onClick);
    var mic = host.querySelector('[data-act="mic"]');
    if (mic) {
      mic.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        startRec();
      });
      mic.addEventListener("pointerup", function (e) {
        e.preventDefault();
        stopRec();
      });
      mic.addEventListener("pointerleave", function () {
        if (ui.recording) stopRec();
      });
    }
    var inp = host.querySelector(".dw-spell-input");
    if (inp) {
      inp.addEventListener("input", function () { ui.spellValue = inp.value; });
      inp.addEventListener("paste", function (e) { e.preventDefault(); });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          submitSpell();
        }
      });
    }
  }

  function onClick(e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var act = btn.getAttribute("data-act");
    if (act === "exit") {
      exitModal.hidden = false;
      return;
    }
    if (act === "play") {
      DW.speakWord(word().word);
      return;
    }
    if (act === "to-speak") {
      if (!ui.canNext) return;
      enterSpeaking();
      return;
    }
    if (act === "retry-speak") {
      ui.speakStatus = "";
      paint();
      return;
    }
    if (act === "skip-speak") {
      markSpeakFail();
      enterSpelling();
      return;
    }
    if (act === "submit-spell") {
      submitSpell();
      return;
    }
    if (act === "play-ex") {
      var ex = String(word().example || "").replace(/[（(].*$/, "").trim();
      DW.speakWord(ex || word().word);
      return;
    }
    if (act === "next-word") {
      nextWord();
    }
  }

  root.addEventListener("click", function (e) {
    var btn = e.target.closest('[data-act="exit"]');
    if (btn) exitModal.hidden = false;
  });

  document.getElementById("dw-exit-cancel").addEventListener("click", function () {
    exitModal.hidden = true;
  });
  document.getElementById("dw-exit-confirm").addEventListener("click", function () {
    location.href = "zone.html?zone=study&s=vocab";
  });

  document.addEventListener("keydown", function (e) {
    if (exitModal && !exitModal.hidden) return;
    if (!task || task.completed) return;
    if (e.key === " " || e.code === "Space") {
      if (task.stage === "image") {
        e.preventDefault();
        ui.showHint = true;
        paint();
      } else if (task.stage === "speaking") {
        e.preventDefault();
        if (!ui.recording) startRec();
      }
      return;
    }
    if (e.key === " " && task.stage === "speaking" && ui.recording) {
      // handled on keyup
    }
    if (e.key === "Enter") {
      if (!enterReady()) {
        e.preventDefault();
        return;
      }
      if (task.stage === "image" && ui.canNext) {
        e.preventDefault();
        enterSpeaking();
      } else if (task.stage === "spelling") {
        // input handler already covers focused field; this is for button/global Enter
        if (e.target && e.target.classList && e.target.classList.contains("dw-spell-input")) return;
        e.preventDefault();
        submitSpell();
      } else if (task.stage === "detail") {
        e.preventDefault();
        nextWord();
      } else if (task.stage === "speaking" && ui.speakTries >= 3) {
        e.preventDefault();
        markSpeakFail();
        enterSpelling();
      }
      return;
    }
    if ((e.key === "r" || e.key === "R") && task.stage === "speaking") {
      ui.speakStatus = "";
      paint();
    }
  });

  document.addEventListener("keyup", function (e) {
    if ((e.key === " " || e.code === "Space") && task && task.stage === "speaking" && ui.recording) {
      e.preventDefault();
      stopRec();
    }
  });

  function boot() {
    task = DW.getTask();
    if (!task || !task.wordList || !task.wordList.length) {
      root.innerHTML = '<div class="dw-fail"><p>没有进行中的任务</p>' +
        '<p><a href="daily-word-setup.html">去设置今日任务</a></p></div>';
      return;
    }
    if (task.completed) {
      location.replace("daily-word-result.html");
      return;
    }
    ui.speakTries = task.speakTries[word().word] || 0;
    if (task.stage === "speaking") enterSpeaking();
    else if (task.stage === "spelling") enterSpelling();
    else if (task.stage === "detail") enterDetail();
    else enterImage();
  }

  boot();
})();
