/* 听力精听 lyric player — full / line + LightPeek */
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
    mode: "full", // full | line
    i: 0,
    showEn: false,
    showZh: false,
    loop: false,
    rate: 1,
    playing: false,
    clipMode: false, // playing [start,end] then pause (line)
    glossCache: {}
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

  function linkWords(en) {
    var SKIP = /^(WOMAN|MAN|NARRATOR|SPEAKER|CHILD)$/i;
    return esc(en).replace(/\b([A-Za-z][A-Za-z']{1,})\b/g, function (w) {
      if (SKIP.test(w)) return w;
      return '<span class="jt-w" data-w="' + w.replace(/"/g, "") + '">' + w + "</span>";
    });
  }

  function hideGloss() {
    var el = $("jtGloss");
    if (el) el.classList.add("is-hidden");
  }

  function showGloss(word, x, y) {
    var el = $("jtGloss"), wEl = $("jtGlossW"), mEl = $("jtGlossM");
    if (!el) return;
    wEl.textContent = word;
    mEl.textContent = "查询中…";
    el.classList.remove("is-hidden");
    var left = Math.min(x + 8, window.innerWidth - 280);
    var top = Math.min(y + 12, window.innerHeight - 80);
    el.style.left = left + "px";
    el.style.top = top + "px";
    var key = word.toLowerCase();
    if (state.glossCache[key]) {
      mEl.textContent = state.glossCache[key];
      return;
    }
    fetch(API_BASE + "/api/jingting/gloss", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ word: word })
    }).then(function (r) {
      if (r.status === 401) throw new Error("登录后可查词");
      if (!r.ok) throw new Error("查词失败");
      return r.json();
    }).then(function (d) {
      var g = (d && d.gloss) || "暂无释义";
      state.glossCache[key] = g;
      if (wEl.textContent === word) mEl.textContent = g;
    }).catch(function (err) {
      if (wEl.textContent === word) mEl.textContent = (err && err.message) || "查词失败";
    });
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
      var cls = i === state.i ? " is-active" : "";
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
      var en = state.showEn ? '<span class="jt-full-en">' + linkWords(s.en) + "</span>" : '<span class="jt-full-en">· · ·</span>';
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
    $("jtLineEn").innerHTML = linkWords(s.en);
    $("jtLineZh").textContent = s.zh || "";
    var reveal = $("jtReveal");
    var showAny = state.showEn || state.showZh;
    reveal.classList.toggle("is-hidden", showAny);
    $("jtLineEn").classList.toggle("is-hidden", !state.showEn);
    $("jtLineZh").classList.toggle("is-hidden", !state.showZh);
  }

  function renderStage() {
    $("jtStageFull").classList.toggle("is-hidden", state.mode !== "full");
    $("jtStageLine").classList.toggle("is-hidden", state.mode !== "line");
    document.querySelectorAll(".jt-mode").forEach(function (btn) {
      btn.classList.toggle("is-on", btn.getAttribute("data-mode") === state.mode);
    });
    $("jtShowEn").classList.toggle("is-on", state.showEn);
    $("jtShowZh").classList.toggle("is-on", state.showZh);
    if (state.mode === "full") renderFull();
    else renderLineCard();
  }

  function setMode(mode) {
    if (mode !== "full" && mode !== "line") mode = "full";
    state.mode = mode;
    state.clipMode = mode === "line";
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

  function bind() {
    document.querySelectorAll(".jt-mode").forEach(function (btn) {
      btn.addEventListener("click", function () { setMode(btn.getAttribute("data-mode")); });
    });

    $("jtSentList").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-i]");
      if (!b) return;
      setIndex(Number(b.getAttribute("data-i")));
      if (state.mode === "line") playFromCurrent();
    });

    $("jtFullBody").addEventListener("click", function (e) {
      var w = e.target.closest(".jt-w");
      if (w) {
        e.stopPropagation();
        showGloss(w.getAttribute("data-w"), e.clientX, e.clientY);
        return;
      }
      var b = e.target.closest(".jt-full-line");
      if (!b) return;
      hideGloss();
      setIndex(Number(b.getAttribute("data-i")));
      playFromCurrent();
    });
    $("jtLineEn").addEventListener("click", function (e) {
      var w = e.target.closest(".jt-w");
      if (!w) return;
      e.stopPropagation();
      showGloss(w.getAttribute("data-w"), e.clientX, e.clientY);
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".jt-w") && !e.target.closest("#jtGloss")) hideGloss();
    });

    $("jtPrev").onclick = $("jtBarPrev").onclick = function () {
      setIndex(state.i - 1);
      if (state.clipMode) playFromCurrent();
    };
    $("jtNext").onclick = $("jtBarNext").onclick = function () {
      setIndex(state.i + 1);
      if (state.clipMode) playFromCurrent();
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
