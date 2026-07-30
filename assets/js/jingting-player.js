/* 听力精听 lyric player — full / line / AI shadow */
(function () {
  "use strict";

  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? (location.port === "8080" ? "http://127.0.0.1:3000" : location.protocol + "//" + location.hostname + ":3000")
    : "https://api.youyisida.com";

  var params = new URLSearchParams(location.search);
  var partId = params.get("id") || "cam21-t1-p1";
  var DATA_URL = "library/practice/jingting/data/" + encodeURIComponent(partId) + ".json";

  var state = {
    data: null,
    mode: "full", // full | line | shadow
    i: 0,
    showEn: false,
    showZh: false,
    loop: false,
    rate: 1,
    playing: false,
    clipMode: false, // playing [start,end] then pause (line/shadow)
    passed: {}
  };

  var audio = document.getElementById("jtAudio");
  var $ = function (id) { return document.getElementById(id); };

  function fmt(t) {
    t = Math.max(0, Math.floor(t || 0));
    var m = Math.floor(t / 60), s = t % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function apiHeaders() {
    var h = { "Content-Type": "application/json" };
    try {
      var t = localStorage.getItem("yysd:auth:token") || localStorage.getItem("yysd:teacher:token") || "";
      if (t) h.Authorization = "Bearer " + t;
    } catch (e) {}
    return h;
  }

  function loadPassed() {
    try {
      state.passed = JSON.parse(localStorage.getItem("yysd:jt:pass:" + partId) || "{}") || {};
    } catch (e) { state.passed = {}; }
  }
  function savePassed() {
    try { localStorage.setItem("yysd:jt:pass:" + partId, JSON.stringify(state.passed)); } catch (e) {}
  }
  function passCount() {
    var n = 0, k;
    for (k in state.passed) if (state.passed[k]) n++;
    return n;
  }

  function curSent() {
    return state.data && state.data.sentences[state.i];
  }

  function setIndex(i, seek) {
    if (!state.data) return;
    var n = state.data.sentences.length;
    state.i = Math.max(0, Math.min(n - 1, i));
    renderList();
    renderStage();
    if (seek !== false) {
      var s = curSent();
      if (s) {
        try { audio.currentTime = s.start; } catch (e) {}
        paintTime();
      }
    }
    highlightFull();
  }

  function renderList() {
    var ol = $("jtSentList");
    if (!ol || !state.data) return;
    ol.innerHTML = state.data.sentences.map(function (s, i) {
      var cls = (i === state.i ? " is-active" : "") + (state.passed[i] ? " is-pass" : "");
      return '<li><button type="button" data-i="' + i + '" class="' + cls.trim() + '">第 ' + (i + 1) + " 句</button></li>";
    }).join("");
    var active = ol.querySelector(".is-active");
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  function renderFull() {
    var body = $("jtFullBody");
    if (!body || !state.data) return;
    body.classList.toggle("is-blind", !state.showEn && !state.showZh);
    body.innerHTML = state.data.sentences.map(function (s, i) {
      var en = state.showEn ? '<span class="jt-full-en">' + esc(s.en) + "</span>" : '<span class="jt-full-en">· · ·</span>';
      var zh = state.showZh ? '<span class="jt-full-zh">' + esc(s.zh || "") + "</span>" : "";
      return '<button type="button" class="jt-full-line' + (i === state.i ? " is-active" : "") +
        '" data-i="' + i + '" data-start="' + s.start + '">' + en + zh + "</button>";
    }).join("");
  }

  function highlightFull() {
    if (state.mode !== "full") return;
    var body = $("jtFullBody");
    if (!body) return;
    var prev = body.querySelector(".is-active");
    if (prev) prev.classList.remove("is-active");
    var el = body.querySelector('.jt-full-line[data-i="' + state.i + '"]');
    if (el) {
      el.classList.add("is-active");
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function renderLineCard() {
    var s = curSent();
    if (!s) return;
    $("jtIdx").textContent = String(state.i + 1);
    $("jtTotal").textContent = String(state.data.sentences.length);
    $("jtLineEn").textContent = s.en;
    $("jtLineZh").textContent = s.zh || "";
    var reveal = $("jtReveal");
    var showAny = state.showEn || state.showZh;
    reveal.classList.toggle("is-hidden", showAny);
    $("jtLineEn").classList.toggle("is-hidden", !state.showEn);
    $("jtLineZh").classList.toggle("is-hidden", !state.showZh);
  }

  function renderShadow() {
    var s = curSent();
    if (!s) return;
    $("jtShadowIdx").textContent = String(state.i + 1);
    $("jtShadowTotal").textContent = String(state.data.sentences.length);
    $("jtPassCount").textContent = String(passCount());
    var blind = $("jtBlind");
    if (state.showEn) {
      blind.classList.add("is-show");
      blind.textContent = s.en + (state.showZh && s.zh ? "\n" + s.zh : "");
    } else {
      blind.classList.remove("is-show");
      blind.textContent = "🔒 测试期间不显示原文 · 先听再复述";
    }
  }

  function renderStage() {
    $("jtStageFull").classList.toggle("is-hidden", state.mode !== "full");
    $("jtStageLine").classList.toggle("is-hidden", state.mode !== "line");
    $("jtStageShadow").classList.toggle("is-hidden", state.mode !== "shadow");
    document.querySelectorAll(".jt-mode").forEach(function (btn) {
      btn.classList.toggle("is-on", btn.getAttribute("data-mode") === state.mode);
    });
    $("jtShowEn").classList.toggle("is-on", state.showEn);
    $("jtShowZh").classList.toggle("is-on", state.showZh);
    if (state.mode === "full") renderFull();
    else if (state.mode === "line") renderLineCard();
    else renderShadow();
  }

  function setMode(mode) {
    state.mode = mode;
    state.clipMode = mode === "line" || mode === "shadow";
    audio.pause();
    state.playing = false;
    syncPlayBtn();
    renderStage();
    renderList();
  }

  function syncPlayBtn() {
    $("jtPlay").textContent = state.playing ? "❚❚" : "▶";
  }

  function paintTime() {
    var d = audio.duration || 0, c = audio.currentTime || 0;
    $("jtCur").textContent = fmt(c);
    $("jtDur").textContent = fmt(d);
    $("jtFill").style.width = (d ? (c / d) * 100 : 0) + "%";
  }

  function indexAtTime(t) {
    var sents = state.data.sentences, i, best = 0;
    for (i = 0; i < sents.length; i++) {
      if (t >= sents[i].start - 0.05) best = i;
      if (t < sents[i].end) return i;
    }
    return best;
  }

  function onTimeUpdate() {
    paintTime();
    if (!state.data) return;
    var s = curSent();
    var t = audio.currentTime || 0;

    // 单句循环：任何模式到句末都回跳；逐句/跟读未开循环则停在句末
    if (s && t >= s.end - 0.05) {
      if (state.loop) {
        try { audio.currentTime = s.start; } catch (e) {}
        return;
      }
      if (state.clipMode) {
        audio.pause();
        state.playing = false;
        syncPlayBtn();
        try { audio.currentTime = s.end; } catch (e) {}
        return;
      }
    }

    if (state.mode === "full" && !state.clipMode) {
      var ni = indexAtTime(t);
      if (ni !== state.i) {
        state.i = ni;
        renderList();
        highlightFull();
      }
    }
  }

  function playFromCurrent() {
    var s = curSent();
    if (!s) return;
    function go() {
      if (state.clipMode || state.loop) {
        try { audio.currentTime = s.start; } catch (e) {}
      }
      // if full mode and somehow before first sentence, jump in
      if (!state.clipMode && !state.loop && audio.currentTime < s.start - 1) {
        try { audio.currentTime = s.start; } catch (e) {}
      }
      audio.playbackRate = state.rate;
      audio.play().then(function () {
        state.playing = true;
        syncPlayBtn();
      }).catch(function () {
        state.playing = false;
        syncPlayBtn();
      });
    }
    if (audio.readyState >= 1) go();
    else audio.addEventListener("loadedmetadata", go, { once: true });
  }

  function togglePlay() {
    if (state.playing) {
      audio.pause();
      state.playing = false;
      syncPlayBtn();
      return;
    }
    playFromCurrent();
  }

  function seekProg(e) {
    if (!audio.duration) return;
    var r = $("jtProg").getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    audio.currentTime = ratio * audio.duration;
    if (state.mode === "full") {
      state.i = indexAtTime(audio.currentTime);
      renderList();
      highlightFull();
    }
    paintTime();
  }

  /* ---- AI shadow ---- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recog = null, wantRec = false, lastHeard = "";

  function setRecUi(on) {
    $("jtRec").classList.toggle("on", on);
    $("jtRec").disabled = on;
    $("jtStopRec").disabled = !on;
  }

  function localShadow(heard, target) {
    // ponytail: offline fallback; server shadow is source of truth
    var tw = target.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
    var hw = heard.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
    var words = [], hi = 0, ok = 0;
    tw.forEach(function (w) {
      if (hi < hw.length && hw[hi] === w) { words.push({ target: w, heard: w, status: "ok" }); ok++; hi++; }
      else words.push({ target: w, heard: "", status: "miss" });
    });
    var acc = tw.length ? ok / tw.length : 0;
    return { words: words, extras: [], accuracy: acc, pass: acc >= (tw.length <= 5 ? 0.9 : 0.85), comment: "" };
  }

  function paintVerdict(d) {
    var html = (d.words || []).map(function (w) {
      var cls = w.status === "ok" ? "w-ok" : (w.status === "bad" ? "w-bad" : "w-miss");
      return '<span class="' + cls + '">' + esc(w.target) + "</span>";
    }).join(" ");
    var pct = Math.round((d.accuracy || 0) * 100);
    html += '<div class="' + (d.pass ? "ok" : "bad") + '" style="margin-top:8px">' +
      (d.pass ? "过关" : "未过关") + " · " + pct + "%" +
      (d.comment ? " · " + esc(d.comment) : "") + "</div>";
    $("jtVerdict").innerHTML = html;
    $("jtShadowNext").classList.toggle("is-hidden", !d.pass);
    if (d.pass) {
      state.passed[state.i] = true;
      savePassed();
      $("jtPassCount").textContent = String(passCount());
      renderList();
    }
  }

  function gradeShadow() {
    var s = curSent();
    if (!s || !lastHeard) {
      $("jtSrNote").textContent = "没有识别到内容，请再试一次。";
      return;
    }
    $("jtHeard").textContent = lastHeard;
    $("jtSrNote").textContent = "评分中…";
    fetch(API_BASE + "/api/jingting/shadow", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ heard: lastHeard, target: s.en })
    }).then(function (r) {
      if (r.status === 401) throw new Error("请先登录后再使用 AI 跟读");
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      $("jtSrNote").textContent = "";
      paintVerdict(d);
    }).catch(function (err) {
      $("jtSrNote").textContent = (err && err.message) || "评分失败，已用本地比对";
      paintVerdict(localShadow(lastHeard, s.en));
    });
  }

  function startRec() {
    if (!SR || wantRec) return;
    audio.pause();
    state.playing = false;
    syncPlayBtn();
    lastHeard = "";
    wantRec = true;
    $("jtHeard").innerHTML = '<span class="ph">🎙 正在听… 说完整句后点「说完停止」</span>';
    $("jtVerdict").innerHTML = "";
    $("jtShadowNext").classList.add("is-hidden");
    $("jtSrNote").textContent = "";
    setRecUi(true);
    recog = new SR();
    recog.lang = "en-GB";
    recog.continuous = true;
    recog.interimResults = true;
    recog.onresult = function (ev) {
      var txt = "", i;
      for (i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      lastHeard = txt.trim();
      $("jtHeard").textContent = lastHeard || "…";
    };
    recog.onerror = function (ev) {
      if (ev.error === "no-speech" || ev.error === "aborted") return;
      wantRec = false;
      setRecUi(false);
      var msg = { "not-allowed": "请允许麦克风权限", network: "网络错误" };
      $("jtSrNote").textContent = "识别出错：" + (msg[ev.error] || ev.error);
    };
    recog.onend = function () {
      if (wantRec) {
        try { recog.start(); } catch (e) {}
        return;
      }
      setRecUi(false);
      gradeShadow();
    };
    try { recog.start(); } catch (e) {
      wantRec = false;
      setRecUi(false);
      $("jtSrNote").textContent = "无法启动语音识别，请用 Chrome。";
    }
  }

  function stopRec() {
    wantRec = false;
    if (recog) try { recog.stop(); } catch (e) {}
  }

  function bind() {
    document.querySelectorAll(".jt-mode").forEach(function (btn) {
      btn.addEventListener("click", function () { setMode(btn.getAttribute("data-mode")); });
    });

    $("jtSentList").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-i]");
      if (!b) return;
      setIndex(Number(b.getAttribute("data-i")));
      if (state.mode === "line" || state.mode === "shadow") playFromCurrent();
    });

    $("jtFullBody").addEventListener("click", function (e) {
      var b = e.target.closest(".jt-full-line");
      if (!b) return;
      setIndex(Number(b.getAttribute("data-i")));
      playFromCurrent();
    });

    $("jtPrev").onclick = $("jtBarPrev").onclick = function () {
      setIndex(state.i - 1);
      if (state.clipMode) playFromCurrent();
    };
    $("jtNext").onclick = $("jtBarNext").onclick = function () {
      setIndex(state.i + 1);
      if (state.clipMode) playFromCurrent();
    };
    $("jtShadowNext").onclick = function () {
      if (state.i < state.data.sentences.length - 1) {
        setIndex(state.i + 1);
        $("jtHeard").innerHTML = '<span class="ph">你复述的内容会显示在这里…</span>';
        $("jtVerdict").innerHTML = "";
        $("jtShadowNext").classList.add("is-hidden");
      }
    };

    $("jtReveal").onclick = function () {
      state.showEn = true;
      renderStage();
    };
    $("jtShowEn").onclick = function () {
      state.showEn = !state.showEn;
      renderStage();
    };
    $("jtShowZh").onclick = function () {
      state.showZh = !state.showZh;
      if (state.showZh && state.mode === "line") state.showEn = true;
      renderStage();
    };

    $("jtPlay").onclick = togglePlay;
    $("jtLoop").onclick = function () {
      state.loop = !state.loop;
      $("jtLoop").classList.toggle("is-on", state.loop);
      $("jtLoop").setAttribute("aria-pressed", state.loop ? "true" : "false");
    };
    $("jtRateBtn").onclick = function (e) {
      e.stopPropagation();
      $("jtRateMenu").classList.toggle("is-hidden");
    };
    $("jtRateMenu").onclick = function (e) {
      var li = e.target.closest("li[data-r]");
      if (!li) return;
      state.rate = Number(li.getAttribute("data-r"));
      audio.playbackRate = state.rate;
      $("jtRateBtn").textContent = "倍速 " + state.rate.toFixed(2).replace(/\.?0+$/, "") + "x";
      if (state.rate === 1) $("jtRateBtn").textContent = "倍速 1.0x";
      $("jtRateMenu").classList.add("is-hidden");
    };
    document.addEventListener("click", function () {
      $("jtRateMenu").classList.add("is-hidden");
    });

    $("jtProg").onclick = seekProg;
    $("jtVol").oninput = function () { audio.volume = Number($("jtVol").value); };

    $("jtPlayClip").onclick = function () {
      state.clipMode = true;
      playFromCurrent();
    };
    $("jtRec").onclick = startRec;
    $("jtStopRec").onclick = stopRec;

    if (!SR) {
      $("jtSrNote").textContent = "请用电脑版 Chrome 打开以使用语音识别。";
      $("jtRec").disabled = true;
    }

    $("jtHotkeys").onclick = function () { $("jtHotkeyModal").classList.remove("is-hidden"); };
    $("jtHkClose").onclick = function () { $("jtHotkeyModal").classList.add("is-hidden"); };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", function () { state.playing = true; syncPlayBtn(); });
    audio.addEventListener("pause", function () { state.playing = false; syncPlayBtn(); });
    audio.addEventListener("ended", function () {
      state.playing = false;
      syncPlayBtn();
    });

    document.addEventListener("keydown", function (e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex(state.i - 1);
        if (state.clipMode) playFromCurrent();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex(state.i + 1);
        if (state.clipMode) playFromCurrent();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        state.showEn = !state.showEn;
        renderStage();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        state.showZh = !state.showZh;
        renderStage();
      } else if (e.key === "Shift") {
        // ponytail: Shift alone toggles loop (matches 新东方 tip); ignore chord keys
        if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
          state.loop = !state.loop;
          $("jtLoop").classList.toggle("is-on", state.loop);
          $("jtLoop").setAttribute("aria-pressed", state.loop ? "true" : "false");
        }
      }
    });
  }

  function boot() {
    loadPassed();
    bind();
    fetch(DATA_URL).then(function (r) {
      if (!r.ok) throw new Error("找不到精听数据：" + partId);
      return r.json();
    }).then(function (data) {
      state.data = data;
      document.title = data.title + " · 听力精听 · 优益思达";
      $("jtTitle").textContent = data.title;
      $("jtExam").href = data.examHref || "cambridge.html";
      audio.src = data.audioUrl;
      audio.volume = 1;
      function seekFirst() {
        var s0 = data.sentences[0];
        if (s0) {
          try { audio.currentTime = s0.start; } catch (e) {}
        }
        paintTime();
      }
      audio.addEventListener("loadedmetadata", seekFirst, { once: true });
      // skip IELTS preamble: start at first sentence
      setIndex(0, true);
      setMode("full");
      seekFirst();
    }).catch(function (err) {
      $("jtTitle").textContent = "加载失败";
      $("jtFullBody").textContent = (err && err.message) || "加载失败";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
