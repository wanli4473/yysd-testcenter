/* =========================================================================
   word-realm.js — Hub / 钉点地图 / 图鉴（第 2 期）
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var RPG = window.YYSD_VOCAB_RPG;
  var STORY = window.YYSD_WORD_REALM_STORY;
  var CORE = window.YYSD_WORD_REALM;
  var SFX = window.YYSD_WORD_REALM_SFX;
  var A = window.YYSD_AUTH;
  // 仅优益思达总部站可见；租户深链直接打回单词区
  if (!A || !A.canWordRealm || !A.canWordRealm()) {
    location.replace("zone.html?zone=study&s=vocab");
    return;
  }
  var params = new URLSearchParams(location.search);
  var root = document.getElementById("wr-root");
  // bumped: Phase 0 VN prologue
  var PROLOGUE_KEY = "yysd:word-realm-prologue-v3";
  var VN_MIST3_KEY = "yysd:word-realm-vn-mist3";
  var VN_FLAGS_KEY = "yysd:word-realm-vn-flags";
  var VN_SEEN_KEY = "yysd:word-realm-vn-seen";
  var REGION_ORDER = ["mist", "stone", "tide", "ash", "archive", "throne"];
  var lexCache = null;
  var VN = window.YYSD_WORD_REALM_VN;
  var VN_SCRIPT = window.YYSD_WORD_REALM_VN_SCRIPT;

  function esc(s) { return Y.esc(String(s == null ? "" : s)); }

  function viewParam() {
    var v = (params.get("view") || "").trim();
    if (v === "map" || v === "codex" || v === "hub" || v === "dream" || v === "lore" ||
        v === "vn" || v === "clear") return v;
    // 从战斗返回常带 region=：直接落地图
    if ((params.get("region") || "").trim()) return "map";
    return "hub";
  }

  var CH1_SETTLE_KEY = "yysd:word-realm-ch1-settle";
  var MIST_MID = { "shrine-04": "mist_event_04", "shrine-06": "mist_event_06" };

  function mistChapterCleared() {
    return CORE.isCleared("shrine-08");
  }

  function seenCh1Settle() {
    try { return localStorage.getItem(CH1_SETTLE_KEY) === "1"; } catch (e) { return false; }
  }

  function markCh1Settle() {
    try { localStorage.setItem(CH1_SETTLE_KEY, "1"); } catch (e) {}
  }

  function loadVnSeen() {
    try { return JSON.parse(localStorage.getItem(VN_SEEN_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }

  function vnSeen(id) {
    return !!loadVnSeen()[id];
  }

  function markVnSeen(id) {
    if (!id) return;
    var s = loadVnSeen();
    s[id] = 1;
    try { localStorage.setItem(VN_SEEN_KEY, JSON.stringify(s)); } catch (e) {}
    if (id === "mist_after_03" || id === "mist_clear3") {
      try { localStorage.setItem(VN_MIST3_KEY, "1"); } catch (e2) {}
    }
  }

  /** Preserve paragraph breaks from story novel strings. */
  function proseHTML(text) {
    return String(text || "")
      .split(/\n\n+/)
      .map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; })
      .join("");
  }

  function portraitHTML(src, fallback, cls) {
    if (!src) return '<div class="' + cls + '" aria-hidden="true"><span>' + esc(fallback) + "</span></div>";
    return '<div class="' + cls + ' ' + cls + '--img" aria-hidden="true">' +
      '<img src="' + esc(src) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';var s=this.nextElementSibling;if(s)s.hidden=false">' +
      '<span hidden>' + esc(fallback) + "</span></div>";
  }

  function regionParam() {
    var r = (params.get("region") || "").trim();
    if (!STORY.regions[r]) {
      try { r = localStorage.getItem("yysd:word-realm-region") || "mist"; }
      catch (e) { r = "mist"; }
    }
    // pilot：非雾原章节一律回落 mist
    if (!CORE.regionUnlocked(r)) r = "mist";
    return r;
  }

  function setQuery(view, region, pin) {
    if (region) {
      try { localStorage.setItem("yysd:word-realm-region", region); } catch (e) {}
    }
    var u = new URL(location.href);
    var keepPin = pin || u.searchParams.get("pin") || "";
    u.searchParams.set("view", view || "hub");
    if (region) u.searchParams.set("region", region);
    else u.searchParams.delete("region");
    if (view === "map" && keepPin) u.searchParams.set("pin", keepPin);
    else u.searchParams.delete("pin");
    u.searchParams.delete("book");
    history.replaceState(null, "", u.pathname + u.search);
    params = new URLSearchParams(location.search);
  }

  function hrefView(view, region) {
    var q = "?view=" + encodeURIComponent(view);
    if (region) q += "&region=" + encodeURIComponent(region);
    return "word-realm.html" + q;
  }

  function lessonHref(shrineId) {
    var base = "vocab-lesson.html?from=realm&shrine=" + encodeURIComponent(shrineId);
    var mid = MIST_MID[shrineId];
    if (mid && !vnSeen(mid)) {
      return "word-realm.html?view=vn&script=" + encodeURIComponent(mid) +
        "&next=lesson&shrine=" + encodeURIComponent(shrineId);
    }
    var boss = STORY.bossOf && STORY.bossOf(shrineId);
    if (boss && boss.vnPre && !vnSeen(boss.vnPre)) {
      return "word-realm.html?view=vn&script=" + encodeURIComponent(boss.vnPre) +
        "&next=lesson&shrine=" + encodeURIComponent(shrineId);
    }
    return base;
  }

  function resolveVnNext() {
    var next = (params.get("next") || "hub").trim();
    var shrine = (params.get("shrine") || "").trim();
    var region = (params.get("region") || "").trim();
    if (next === "lesson" && shrine) {
      location.href = "vocab-lesson.html?from=realm&shrine=" + encodeURIComponent(shrine) + "&bossVn=1";
      return;
    }
    if (next === "clear") {
      setQuery("clear", region || "mist");
      boot();
      return;
    }
    if (next === "map") {
      setQuery("map", region || "mist");
      boot();
      return;
    }
    setQuery("hub");
    boot();
  }

  function campHref() {
    return "vocab-lesson.html?from=realm&mode=camp";
  }

  function seenPrologue() {
    try { return localStorage.getItem(PROLOGUE_KEY) === "1"; } catch (e) { return false; }
  }

  function markPrologue() {
    try { localStorage.setItem(PROLOGUE_KEY, "1"); } catch (e) {}
  }

  function shrineBeat(shrine) {
    return STORY.shrineBeat(shrine.region, shrine.index, "远征祠 " + shrine.index);
  }

  function unlockedFragments(doneCount) {
    return (STORY.fragments || []).filter(function (f) {
      return doneCount >= f.afterShrine;
    });
  }

  function isRegionUnlocked(regionId) {
    if (CORE.regionUnlocked) return CORE.regionUnlocked(regionId);
    if (STORY.regionUnlocked) return STORY.regionUnlocked(regionId, CORE.isCleared);
    return true;
  }

  /** Hub: six-chapter saga progress (replaces grey Ch2 teaser). */
  function sagaProgressHTML(doneCount) {
    var chapters = STORY.chapters || [];
    if (!chapters.length) return "";
    var cards = chapters.map(function (ch) {
      var open = isRegionUnlocked(ch.region);
      var range = CORE.regionRange(ch.region);
      var cleared = 0;
      for (var i = range.start; i <= range.end; i++) {
        var id = "shrine-" + String(i).padStart(2, "0");
        if (CORE.isCleared(id)) cleared++;
      }
      var total = range.end - range.start + 1;
      var done = cleared >= total;
      var cls = "wr-saga__ch" + (open ? " is-open" : " is-locked") + (done ? " is-done" : "");
      return '<article class="' + cls + '">' +
        '<p class="wr-kicker">' + (open ? (done ? "已通关" : "进行中") : "未解锁") + "</p>" +
        "<h3>" + esc(ch.title) + "</h3>" +
        "<p>" + esc(open ? ch.summary : "击败前一章 Boss 后开启。") + "</p>" +
        (open
          ? ('<span class="wr-saga__prog">' + cleared + "/" + total + "</span>")
          : '<span class="wr-saga__lock">锁定</span>') +
        "</article>";
    }).join("");
    return '<section class="wr-saga" aria-label="史诗六章">' +
      '<p class="wr-kicker">词境史诗 · 六章</p>' +
      "<h2>远征卷宗</h2>" +
      '<p class="wr-saga__lead">从晨雾到遗忘王座——点亮 ' + doneCount + "/" +
        (CORE.shrineTotal ? CORE.shrineTotal() : 48) + " 座祠。</p>" +
      '<div class="wr-saga__grid">' + cards + "</div></section>";
  }

  function allFragments() {
    return STORY.fragments || [];
  }

  function topChrome(snap, active) {
    var muteOn = SFX && SFX.muted();
    return '<header class="wr-top">' +
      '<a class="wr-back" href="zone.html?zone=study&s=vocab">← 离开词境</a>' +
      '<div class="wr-brand"><span>词境远征</span><em>Hub · Map · Codex</em></div>' +
      '<div class="wr-top__right">' +
        '<button type="button" class="wr-mute" id="wr-mute" aria-pressed="' + (muteOn ? "true" : "false") + '">' +
          (muteOn ? "声音：关" : "声音：开") + "</button>" +
        '<div class="wr-lv">Lv.' + snap.level + " · " + esc(snap.title) + "</div>" +
      "</div>" +
    "</header>" +
    '<nav class="wr-tabs" aria-label="远征导航">' +
      '<a class="wr-tab' + (active === "hub" ? " is-on" : "") + '" href="' + hrefView("hub") + '">营地</a>' +
      '<a class="wr-tab' + (active === "map" ? " is-on" : "") + '" href="' + hrefView("map", regionParam()) + '">地图</a>' +
      '<a class="wr-tab' + (active === "codex" ? " is-on" : "") + '" href="' + hrefView("codex") + '">图鉴</a>' +
    "</nav>";
  }

  function bindMute() {
    var btn = document.getElementById("wr-mute");
    if (!btn || !SFX) return;
    btn.onclick = function () {
      SFX.setMuted(!SFX.muted());
      if (SFX) SFX.ui();
      btn.textContent = SFX.muted() ? "声音：关" : "声音：开";
      btn.setAttribute("aria-pressed", SFX.muted() ? "true" : "false");
    };
  }

  function boardHTML(snap) {
    // ponytail: 本地周榜占位——用本周 XP 生成稳定伪对手，不接服务器
    var me = snap.weekXp || 0;
    var ghosts = [
      { name: "雾原学徒", xp: Math.max(0, me - 12) },
      { name: "石语行者", xp: Math.max(8, Math.round(me * 0.7) + 5) },
      { name: "潮声书记", xp: Math.max(0, me - 3) }
    ];
    var rows = [{ name: "我（勇者）", xp: me, me: true }].concat(ghosts);
    rows.sort(function (a, b) { return b.xp - a.xp; });
    return '<ol class="wr-board">' + rows.map(function (r, i) {
      return '<li class="' + (r.me ? "is-me" : "") + '">' +
        '<span><em>' + (i + 1) + "</em> " + esc(r.name) + "</span><b>" + r.xp + " XP</b></li>";
    }).join("") +
      '<li class="wr-board__soon"><span>同机构实时榜</span><em>即将开放</em></li></ol>';
  }

  function saveVnFlags(flags) {
    try { localStorage.setItem(VN_FLAGS_KEY, JSON.stringify(flags || {})); } catch (e) {}
  }

  function finishPrologue(flags) {
    saveVnFlags(flags);
    markPrologue();
    setQuery("hub");
    boot();
  }

  function playVnScript(scriptKey, done) {
    var pack = VN_SCRIPT && VN_SCRIPT[scriptKey];
    if (!VN || !pack) {
      if (done) done({});
      return;
    }
    var portraits = Object.assign({}, (VN_SCRIPT && VN_SCRIPT.portraits) || {}, {
      hero: (STORY.cast && STORY.cast.hero && STORY.cast.hero.portrait) || "",
      ella: (STORY.cast && STORY.cast.ella && STORY.cast.ella.portrait) || ""
    });
    root.innerHTML = "";
    VN.play(root, pack, {
      portraits: portraits,
      onDone: function (flags) {
        markVnSeen(scriptKey);
        if (done) done(flags);
      },
      onSkip: function (flags) {
        markVnSeen(scriptKey);
        if (done) done(flags);
      }
    });
  }

  function renderPrologue() {
    playVnScript("prologue", finishPrologue);
  }

  function renderVnRoute() {
    var key = (params.get("script") || "").trim();
    if (!key || !VN_SCRIPT || !VN_SCRIPT[key]) {
      resolveVnNext();
      return;
    }
    playVnScript(key, function () { resolveVnNext(); });
  }

  function maybePlayMist3Vn(then) {
    if (vnSeen("mist_after_03") || vnSeen("mist_clear3")) { then(); return; }
    try {
      if (localStorage.getItem(VN_MIST3_KEY) === "1") { then(); return; }
    } catch (e) {}
    if (CORE.clearedCount() < 3) { then(); return; }
    playVnScript("mist_after_03", then);
  }

  function maybePlayMistEnter(then) {
    if (vnSeen("mist_enter")) { then(); return; }
    playVnScript("mist_enter", then);
  }

  function maybePlayMistRevisit(then) {
    if (!mistChapterCleared() || vnSeen("mist_revisit")) { then(); return; }
    playVnScript("mist_revisit", then);
  }

  function renderChapterClear() {
    setQuery("clear", "mist");
    markCh1Settle();
    var snap = RPG.snapshot();
    var ch = STORY.chapterOfRegion ? STORY.chapterOfRegion("mist") : (STORY.chapters && STORY.chapters[0]);
    var ella = (STORY.cast && STORY.cast.ella) || { name: "艾拉" };
    root.innerHTML =
      topChrome(snap, "hub") +
      '<section class="wr-clear" aria-label="第一章通关">' +
        '<p class="wr-kicker">Chapter I · Cleared</p>' +
        "<h1>" + esc(ch ? ch.title : "第一章") + "</h1>" +
        '<p class="wr-clear__en">Those Who Remember Names</p>' +
        '<div class="wr-clear__stats">' +
          '<div class="wr-stat"><span>等级</span><b>Lv.' + snap.level + "</b></div>" +
          '<div class="wr-stat"><span>称号</span><b>' + esc(snap.title) + "</b></div>" +
          '<div class="wr-stat"><span>记忆之力</span><b>' + snap.totalXp + "</b></div>" +
          '<div class="wr-stat"><span>点亮祠</span><b>' + CORE.clearedCount() + "/" +
            (CORE.shrineTotal ? CORE.shrineTotal() : 48) + "</b></div>" +
        "</div>" +
        '<div class="wr-clear__ella">' +
          portraitHTML(ella.portrait, "✎", "wr-ella__face") +
          '<div><p class="wr-kicker">书吏艾拉 · 记事</p>' +
          "<p>「第一章完。雾原记得你们的名字了。东边的路还在雾里——先回营地休整，下一章开放时我会叫醒你。」</p></div>" +
        "</div>" +
        '<p class="wr-clear__lead">第一章通关 · 雾原试玩</p>' +
        '<div class="wr-clear__actions">' +
          '<a class="wr-btn wr-btn--gold" href="' + hrefView("hub") + '">回营地 ›</a>' +
          '<a class="wr-btn wr-btn--ghost" href="' + hrefView("map", "mist") + '">再巡雾原</a>' +
          '<button type="button" class="wr-btn wr-btn--ghost" id="wr-clear-replay">重看通关演出</button>' +
        "</div>" +
      "</section>";
    bindMute();
    var replay = document.getElementById("wr-clear-replay");
    if (replay) {
      replay.onclick = function () {
        location.href = "word-realm.html?view=vn&script=mist_boss_post&next=clear&region=mist";
      };
    }
  }

  function renderLore() {
    setQuery("lore");
    var snap = RPG.snapshot();
    var vols = (STORY.chronicle && STORY.chronicle.volumes) || [];
    var pitch = (STORY.chronicle && STORY.chronicle.pitch) || "";
    var volHTML = vols.map(function (v) {
      return '<article class="wr-lore-card">' +
        '<p class="wr-kicker">编年</p>' +
        "<h2>" + esc(v.title) + "</h2>" +
        proseHTML(v.body) +
        "</article>";
    }).join("");
    root.innerHTML =
      topChrome(snap, "codex") +
      '<section class="wr-lore">' +
        '<header class="wr-codex__head">' +
          "<h1>" + esc(STORY.sagaTitle || "词境编年") + "</h1>" +
          "<p>" + esc(pitch) + "</p>" +
          '<p><a class="wr-btn wr-btn--ghost" href="' + hrefView("codex") + '">← 回图鉴</a> ' +
          '<button type="button" class="wr-btn wr-btn--gold" id="wr-replay-pro">重看序章演出</button></p>' +
        "</header>" +
        volHTML +
      "</section>";
    var replay = document.getElementById("wr-replay-pro");
    if (replay) {
      replay.onclick = function () {
        try { localStorage.removeItem(PROLOGUE_KEY); } catch (e) {}
        renderPrologue();
      };
    }
    bindMute();
  }

  function currentShrineNode(nodes) {
    return nodes.find(function (n) { return !n.isChest && n.state === "current"; }) || null;
  }

  function renderHub(lex) {
    setQuery("hub");
    var snap = RPG.snapshot();
    var nodes = CORE.pathNodes(lex);
    var cur = currentShrineNode(nodes);
    var doneCount = CORE.clearedCount();
    var frags = unlockedFragments(doneCount);
    var mentor = STORY.mentorLines[doneCount % STORY.mentorLines.length];
    var hero = (STORY.cast && STORY.cast.hero) || { name: "词之勇者", role: "宿主", blurb: "" };
    var ella = (STORY.cast && STORY.cast.ella) || null;
    var stats = lex.stats || {};
    var nextHref = cur ? lessonHref(cur.shrine.id) : hrefView("map", "mist");
    var nextBeat = cur ? shrineBeat(cur.shrine) : null;
    var nextRegion = cur ? (STORY.regions[cur.shrine.region] || STORY.regions.mist) : null;
    var chapter = cur && STORY.chapterOfRegion
      ? STORY.chapterOfRegion(cur.shrine.region)
      : (STORY.chapters && STORY.chapters[0]) || null;
    var isBossNext = !!(cur && STORY.isBossShrine && STORY.isBossShrine(cur.shrine.id));
    var boss = isBossNext && STORY.bossOf ? STORY.bossOf(cur.shrine.id) : null;
    var theme = CORE.weeklyTheme ? CORE.weeklyTheme() : null;
    var totalShrines = CORE.shrineTotal ? CORE.shrineTotal() : 48;
    var mistDone = mistChapterCleared();
    var mistRange = CORE.regionRange("mist");
    var mistLit = 0;
    for (var mi = mistRange.start; mi <= mistRange.end; mi++) {
      if (CORE.isCleared("shrine-" + String(mi).padStart(2, "0"))) mistLit++;
    }
    var questMeta = chapter
      ? ("Quest · " + (chapter.questLine || chapter.summary) +
        " · " + (chapter.recLevel || "—") +
        (chapter.region === "mist" && !mistDone
          ? (" · 进度 " + mistLit + "/8")
          : ""))
      : "";
    var settleBanner = mistDone
      ? ('<section class="wr-clear-banner">' +
          '<p class="wr-kicker">Chapter I · Cleared</p>' +
          "<h2>第一章通关 · 雾原试玩</h2>" +
          "<p>晨雾已肃清。后续章节尚未开放——先在修炼场保持剑感，或重巡雾原。</p>" +
          '<a class="wr-btn wr-btn--gold" href="' + hrefView("map", "mist") + '">再巡雾原 ›</a>' +
          (seenCh1Settle()
            ? (' <a class="wr-btn wr-btn--ghost" href="' + hrefView("clear") + '">重看结算</a>')
            : (' <a class="wr-btn wr-btn--ghost" href="' + hrefView("clear") + '">领取通关结算 ›</a>')) +
        "</section>")
      : "";

    root.innerHTML =
      topChrome(snap, "hub") +
      '<section class="wr-hub">' +
        '<div class="wr-hero-card">' +
          portraitHTML(hero.portrait, "✦", "wr-hero-art") +
          '<div class="wr-hero-body">' +
            '<p class="wr-kicker">' + esc(hero.role) + " · 营地</p>" +
            "<h1>" + esc(hero.name) + "</h1>" +
            "<p>" + esc(hero.blurb) + "</p>" +
            '<div class="wr-stat-row">' +
              '<div class="wr-stat"><span>等级</span><b>Lv.' + snap.level + "</b></div>" +
              '<div class="wr-stat"><span>称号</span><b>' + esc(snap.title) + "</b></div>" +
              '<div class="wr-stat"><span>记忆之力</span><b>' + snap.totalXp + "</b></div>" +
              '<div class="wr-stat"><span>点亮祠</span><b>' + doneCount + "/" +
                (CORE.shrineTotal ? CORE.shrineTotal() : 48) + "</b></div>" +
            "</div>" +
            '<div class="wr-xp"><i style="width:' + snap.pct + '%"></i></div>' +
            '<p class="wr-xp__txt">' + snap.into + " / " + snap.need + " · 本周 " + snap.weekXp + " XP</p>" +
          "</div>" +
        "</div>" +
        settleBanner +
        '<nav class="wr-camp-menu" aria-label="营地指令">' +
          '<p class="wr-camp-menu__label">COMMAND</p>' +
          '<div class="wr-camp-menu__grid">' +
            '<a class="wr-camp-menu__btn" href="' + hrefView("map", cur ? cur.shrine.region : regionParam()) +
              '">远征<span>地图 · 点亮祠庙</span></a>' +
            '<a class="wr-camp-menu__btn" href="' + campHref() +
              '">修炼<span>星屑修炼场 · 仅记忆之力</span></a>' +
            '<a class="wr-camp-menu__btn" href="' + hrefView("codex") +
              '">图鉴<span>残页 ' + frags.length + "/" + allFragments().length + "</span></a>" +
            '<a class="wr-camp-menu__btn" href="' + hrefView("lore") +
              '">编年<span>序章与史诗全文</span></a>' +
            '<button type="button" class="wr-camp-menu__btn" id="wr-hub-replay-pro">序章<span>重看开场演出</span></button>' +
            (mistDone
              ? ('<a class="wr-camp-menu__btn" href="' + hrefView("clear") +
                '">结算<span>第一章通关回顾</span></a>')
              : "") +
          "</div>" +
        "</nav>" +
        (theme
          ? ('<section class="wr-weekly">' +
              '<p class="wr-kicker">本周周常</p>' +
              "<h2>" + esc(theme.name) + "</h2>" +
              "<p>" + esc(theme.blurb) + "</p>" +
              '<a class="wr-btn wr-btn--gold" href="' + campHref() + '">进入周常训练 +' +
                (theme.bonusXp || 0) + " ›</a></section>")
          : "") +
        '<section class="wr-ella">' +
          portraitHTML(ella && ella.portrait, "✎", "wr-ella__face") +
          '<div class="wr-ella__body">' +
            '<p class="wr-kicker">书吏艾拉 · 任务板</p>' +
            (chapter
              ? ("<h2>" + esc(chapter.title) + "</h2>" +
                (questMeta ? '<p class="wr-ella__quest">' + esc(questMeta) + "</p>" : "") +
                '<div class="wr-ella__novel">' + proseHTML(chapter.novel || chapter.summary) + "</div>" +
                '<p class="wr-ella__tip">「' + esc(chapter.ellaTip) + "」</p>")
              : "<h2>记事册摊开</h2><p>先去地图点亮一座祠。</p>") +
          "</div>" +
        "</section>" +
        '<section class="wr-quest' + (isBossNext ? " wr-quest--boss" : "") +
          (mistDone && !cur ? " wr-quest--clear" : "") + '">' +
          '<p class="wr-kicker">' +
            (mistDone && (!cur || cur.shrine.region !== "mist")
              ? "下一章"
              : (isBossNext ? "地区 Boss" : "今日目标")) + "</p>" +
          (nextBeat
            ? ("<h2>" + esc(nextBeat.shrineName) + " · " + esc(nextRegion.name) +
              (boss ? (" · " + esc(boss.name)) : "") + "</h2>" +
              "<p>" + esc(nextBeat.enter) + "</p>" +
              (chapter && chapter.recLevel
                ? ('<p class="wr-quest__rec">推荐 ' + esc(chapter.recLevel) +
                  (nextBeat.shrineName ? (" · 下一祠：" + esc(nextBeat.shrineName)) : "") + "</p>")
                : "") +
              '<a class="wr-btn wr-btn--gold" href="' + nextHref + '">' +
                (isBossNext ? "挑战 Boss ›" : "出战 ›") + "</a>" +
              '<a class="wr-btn wr-btn--ghost" href="' + hrefView("map", cur.shrine.region) + '">在地图上查看</a>')
            : (mistDone
              ? ("<h2>雾原已通关</h2>" +
                "<p>后续章节尚未开放。去修炼场保持剑感，或重巡雾原复习词律。</p>" +
                '<a class="wr-btn wr-btn--gold" href="' + campHref() + '">星屑修炼场 ›</a>' +
                '<a class="wr-btn wr-btn--ghost" href="' + hrefView("map", "mist") + '">再巡雾原</a>')
              : ("<h2>远征暂无下一祠</h2><p>去图鉴重读残页，或进修炼场保持剑感。</p>"))) +
          '<p class="wr-mentor">「' + esc(mentor) + "」" +
            (ella ? " —— " + esc(ella.name) : "") + "</p>" +
          '<p class="wr-lex-meta">混合词库 ' + (stats.total || "—") +
            " · 高难 " + ((stats.byTier && stats.byTier[4]) || 0) +
            " · 史诗 " + doneCount + "/" + totalShrines + "</p>" +
        "</section>" +
        sagaProgressHTML(doneCount) +
        '<section class="wr-panel wr-panel--board">' +
          "<h2>本周词境榜</h2>" +
          "<p>按本周记忆之力排序。幽灵对手仅供对照，机构实时榜稍后上线。</p>" +
          boardHTML(snap) +
        "</section>" +
      "</section>";
    bindMute();
    var hubReplay = document.getElementById("wr-hub-replay-pro");
    if (hubReplay) {
      hubReplay.onclick = function () {
        try { localStorage.removeItem(PROLOGUE_KEY); } catch (e) {}
        renderPrologue();
      };
    }
  }

  function renderDream() {
    var id = CORE.pendingDream() || (params.get("dream") || "").trim();
    var dream = id ? CORE.peekDream(id) : null;
    if (!dream) {
      setQuery("hub");
      boot();
      return;
    }
    var snap = RPG.snapshot();
    var i = 0;
    function paint() {
      setQuery("dream");
      root.innerHTML =
        topChrome(snap, "hub") +
        '<section class="wr-dream">' +
          '<p class="wr-kicker">王子残影</p>' +
          "<h1>" + esc(dream.title) + "</h1>" +
          '<p class="wr-dream__line">' + esc(dream.lines[i] || "") + "</p>" +
          '<p class="wr-dream__step">' + (i + 1) + " / " + dream.lines.length + "</p>" +
          '<div class="wr-dream__actions">' +
            '<button type="button" class="wr-btn wr-btn--ghost" id="wr-dream-skip">跳过梦境</button>' +
            '<button type="button" class="wr-btn wr-btn--gold" id="wr-dream-next">' +
              (i >= dream.lines.length - 1 ? "醒来 · 回营地" : "下一句") + "</button>" +
          "</div>" +
        "</section>";
      function finish() {
        CORE.consumeDream(dream.id);
        location.href = hrefView("hub");
      }
      bindMute();
      document.getElementById("wr-dream-skip").onclick = finish;
      document.getElementById("wr-dream-next").onclick = function () {
        if (i >= dream.lines.length - 1) finish();
        else { i++; paint(); }
      };
    }
    paint();
  }

  function pinNodesForRegion(nodes, regionId) {
    var range = CORE.regionRange(regionId);
    return nodes.filter(function (n) {
      return !n.isChest && n.shrine.index >= range.start && n.shrine.index <= range.end;
    });
  }

  function chestNear(nodes, shrineId) {
    var ck = "chest-" + shrineId;
    return nodes.find(function (n) { return n.isChest && n.chestId === ck; }) || null;
  }

  function renderMap(lex) {
    var regionId = regionParam();
    if (!STORY.regions[regionId]) regionId = "mist";
    if (!isRegionUnlocked(regionId)) {
      // Fall back to the furthest unlocked region
      for (var ri = REGION_ORDER.length - 1; ri >= 0; ri--) {
        if (isRegionUnlocked(REGION_ORDER[ri])) { regionId = REGION_ORDER[ri]; break; }
      }
    }
    var region = STORY.regions[regionId];
    var snap = RPG.snapshot();
    var nodes = CORE.pathNodes(lex);
    var pins = pinNodesForRegion(nodes, regionId);
    var layout = STORY.pinLayout || [];
    var cur = currentShrineNode(nodes);
    var doneCount = CORE.clearedCount();
    var selectedId = (params.get("pin") || "").trim();
    if (!selectedId && cur && cur.shrine.region === regionId) selectedId = cur.shrine.id;
    if (!selectedId && pins[0]) selectedId = pins[0].shrine.id;
    setQuery("map", regionId, selectedId);

    var segs = REGION_ORDER.map(function (id) {
      var reg = STORY.regions[id];
      var on = id === regionId;
      var open = isRegionUnlocked(id);
      if (!open) {
        return '<span class="wr-seg is-locked" title="击败前一章 Boss 后解锁" aria-disabled="true">' +
          esc(reg.name) + "</span>";
      }
      return '<a class="wr-seg' + (on ? " is-on" : "") + '" href="' + hrefView("map", id) + '">' +
        esc(reg.name) + "</a>";
    }).join("");

    var clearHTML = "";
    var regionDone = 0;
    var pinsHTML = pins.map(function (n, i) {
      var pos = layout[i] || { left: 20 + i * 8, top: 40 };
      var beat = shrineBeat(n.shrine);
      var isBoss = (i + 1) === pins.length;
      var cls = "wr-pin is-" + n.state + (n.shrine.id === selectedId ? " is-selected" : "") +
        (isBoss ? " is-boss" : "");
      var label = isBoss ? "Boss" : String(i + 1);
      var tag = n.state === "current" ? "目标" : (n.state === "done" ? "已点亮" : "未启");
      if (n.state === "done" || n.state === "current") {
        regionDone += n.state === "done" ? 1 : 0;
        clearHTML += '<span class="wr-fog-clear' + (n.state === "current" ? " is-current" : "") +
          '" style="left:' + pos.left + "%;top:" + pos.top + '%" aria-hidden="true"></span>';
      }
      if (n.state === "current" || n.state === "done") {
        return '<a class="' + cls + '" style="left:' + pos.left + "%;top:" + pos.top + '%" href="' +
          hrefView("map", regionId) + "&pin=" + encodeURIComponent(n.shrine.id) +
          '" data-pin="' + esc(n.shrine.id) + '" title="' + esc(beat.shrineName) + '">' +
          '<span class="wr-pin__dot">' + (n.state === "done" ? "✓" : "✦") + "</span>" +
          '<span class="wr-pin__tag">' + tag + (isBoss ? " · Boss" : "") + "</span></a>";
      }
      return '<div class="' + cls + '" style="left:' + pos.left + "%;top:" + pos.top +
        '%" title="' + esc(beat.shrineName) + '" aria-disabled="true">' +
        '<span class="wr-pin__dot">' + label + "</span>" +
        '<span class="wr-pin__tag">' + tag + "</span></div>";
    }).join("");
    var fogOpacity = Math.max(0.18, 0.72 - regionDone * 0.07);

    var selected = pins.find(function (n) { return n.shrine.id === selectedId; }) || pins[0];
    var detail = "";
    if (selected) {
      var beat = shrineBeat(selected.shrine);
      var chest = chestNear(nodes, selected.shrine.id);
      var enemy = CORE.enemyFor(selected.shrine.region);
      var actions = "";
      if (selected.state === "current" || selected.state === "done") {
        actions += '<a class="wr-btn wr-btn--gold" href="' + lessonHref(selected.shrine.id) + '">' +
          (selected.state === "done" ? "再次挑战" : "进入噬词战") + "</a>";
      } else {
        actions += '<span class="wr-btn wr-btn--ghost" aria-disabled="true">尚未解锁</span>';
      }
      if (chest && chest.state === "chest") {
        actions += '<button type="button" class="wr-btn wr-btn--ghost" data-chest="' +
          esc(chest.chestId) + '">收取残页 +5</button>';
      } else if (chest && chest.state === "claimed") {
        actions += '<span class="wr-detail__meta">残页已收</span>';
      }
      detail =
        '<div class="wr-detail" id="wr-detail">' +
          '<p class="wr-kicker">' + esc(enemy.name) + " · " + esc(enemy.title) + "</p>" +
          "<h2>" + esc(beat.shrineName) + (pins.indexOf(selected) === pins.length - 1 ? " · 地区关底" : "") + "</h2>" +
          "<p>" + esc(selected.state === "done" ? beat.clear : beat.enter) + "</p>" +
          '<div class="wr-detail__actions">' + actions + "</div>" +
        "</div>";
    }

    var jumpHint = "";
    if (cur && cur.shrine.region !== regionId) {
      var cr = STORY.regions[cur.shrine.region];
      jumpHint = '<p class="wr-map__jump">当前目标在「' + esc(cr.name) +
        '」· <a href="' + hrefView("map", cur.shrine.region) + '">前往 ›</a></p>';
    }

    root.innerHTML =
      topChrome(snap, "map") +
      '<nav class="wr-segs" aria-label="地区">' + segs + "</nav>" +
      '<p class="wr-transit">' + esc(region.transit || region.blurb) + "</p>" +
      jumpHint +
      '<div class="wr-layout wr-layout--map">' +
        '<main class="wr-map-board wr-map-board--' + esc(region.mapTone || regionId) + '">' +
          '<div class="wr-map-board__head">' +
            "<h1>" + esc(region.name) + "</h1>" +
            "<p>" + esc(region.blurb) + "</p>" +
            '<p class="wr-map__hint">点选亮起的钉点 · 已点亮 ' + doneCount + "/" +
              (CORE.shrineTotal ? CORE.shrineTotal() : 48) + "</p>" +
          "</div>" +
          '<div class="wr-map-stage' + (region.mapImage ? " has-art" : "") +
            '" id="wr-map-stage">' +
            (region.mapImage
              ? ('<img class="wr-map-art" src="' + esc(region.mapImage) +
                '" alt="" decoding="async" fetchpriority="low">')
              : "") +
            '<div class="wr-map-wash" aria-hidden="true"></div>' +
            '<div class="wr-map-fog" style="opacity:' + fogOpacity + '" aria-hidden="true"></div>' +
            '<div class="wr-fog-clears" aria-hidden="true">' + clearHTML + "</div>" +
            pinsHTML +
          "</div>" +
          detail +
        "</main>" +
        '<aside class="wr-side">' +
          '<section class="wr-panel">' +
            "<h2>出征提示</h2>" +
            "<p>答对砍血，连对暴击。雾随点亮散开。撤退不点亮祠。</p>" +
            '<a class="wr-panel wr-panel--link" href="' + hrefView("hub") + '">← 回营地</a>' +
          "</section>" +
          '<section class="wr-panel">' +
            "<h2>本周词境榜</h2>" +
            "<p>本周记忆之力对照。</p>" +
            boardHTML(snap) +
          "</section>" +
        "</aside>" +
      "</div>";

    bindMute();
    var chestBtn = root.querySelector("[data-chest]");
    if (chestBtn) {
      chestBtn.addEventListener("click", function () {
        var gain = CORE.claimChest(chestBtn.getAttribute("data-chest"), 5);
        if (!gain) return;
        if (SFX) SFX.ui();
        boot();
      });
    }
  }

  function renderCodex(lex) {
    setQuery("codex");
    var snap = RPG.snapshot();
    var doneCount = CORE.clearedCount();
    var frags = allFragments();
    var unlocked = unlockedFragments(doneCount);
    var unlockedIds = {};
    unlocked.forEach(function (f) { unlockedIds[f.id] = true; });
    var enemies = STORY.enemies || {};
    var beatenRegions = {};
    REGION_ORDER.forEach(function (id) {
      var range = CORE.regionRange(id);
      var allDone = true;
      for (var i = range.start; i <= range.end; i++) {
        var sid = "shrine-" + String(i).padStart(2, "0");
        if (!CORE.isCleared(sid)) { allDone = false; break; }
      }
      // 遇见即登记：该区至少点亮 1 祠则「遭遇」
      var met = false;
      for (var j = range.start; j <= range.end; j++) {
        var s2 = "shrine-" + String(j).padStart(2, "0");
        if (CORE.isCleared(s2)) { met = true; break; }
      }
      beatenRegions[id] = { met: met, cleared: allDone };
    });

    var fragHTML = frags.map(function (f) {
      var open = !!unlockedIds[f.id];
      return '<article class="wr-codex-card' + (open ? " is-open" : " is-locked") + '">' +
        '<p class="wr-kicker">' + (open ? "已收集" : ("点亮 " + f.afterShrine + " 祠后解锁")) + "</p>" +
        "<h3>" + esc(open ? f.title : "残页 · ？？？") + "</h3>" +
        "<p>" + esc(open ? f.body : "雾气封住了字迹。继续远征，才能读到王子留下的句子。") + "</p>" +
      "</article>";
    }).join("");

    var foeHTML = REGION_ORDER.map(function (id) {
      var e = enemies[id];
      if (!e) return "";
      var st = beatenRegions[id];
      var open = st.met;
      return '<article class="wr-codex-card wr-codex-card--foe' + (open ? " is-open" : " is-locked") + '">' +
        '<div class="wr-foe-glyph wr-foe-glyph--' + esc(e.skin) + '" aria-hidden="true">' +
          esc(open ? e.glyph : "?") + "</div>" +
        '<div><p class="wr-kicker">' + (st.cleared ? "地区肃清" : (open ? "已遭遇" : "未遭遇")) + "</p>" +
        "<h3>" + esc(open ? e.name : "？？？") + "</h3>" +
        "<p>" + esc(open ? e.intro : "尚无足迹。") + "</p></div></article>";
    }).join("");

    var cast = STORY.cast || {};
    var castKeys = [
      { k: "hero", need: 0 },
      { k: "ella", need: 0 },
      { k: "prince", need: 0 },
      { k: "deity", need: 32 },
      { k: "eaterKing", need: 40 }
    ];
    var castHTML = castKeys.map(function (row) {
      var c = cast[row.k];
      if (!c) return "";
      var open = doneCount >= row.need;
      return '<article class="wr-codex-card' + (open ? " is-open" : " is-locked") + '">' +
        '<p class="wr-kicker">' + esc(open ? c.role : "未揭示") + "</p>" +
        "<h3>" + esc(open ? c.name : "？？？") + "</h3>" +
        "<p>" + esc(open ? c.blurb : ("点亮 " + row.need + " 祠后，卷宗才会写出这个名字。")) + "</p></article>";
    }).join("");

    var sagaHTML = (STORY.chapters || []).map(function (ch) {
      var open = isRegionUnlocked(ch.region);
      return '<article class="wr-codex-card' + (open ? " is-open" : " is-locked") + '">' +
        '<p class="wr-kicker">' + (open ? ("第 " + ch.chapter + " 章") : "未解锁") + "</p>" +
        "<h3>" + esc(open ? ch.title : "卷 · ？？？") + "</h3>" +
        (open
          ? ('<div class="wr-codex-prose">' + proseHTML(ch.novel) + "</div>")
          : "<p>击败前一章 Boss，才能翻开这一卷。</p>") +
        "</article>";
    }).join("");

    root.innerHTML =
      topChrome(snap, "codex") +
      '<section class="wr-codex">' +
        '<header class="wr-codex__head">' +
          "<h1>图鉴</h1>" +
          "<p>序章与编年随时可读。残页随主线解锁；修炼场不掉落。</p>" +
          '<p><a class="wr-btn wr-btn--gold" href="' + hrefView("lore") + '">翻开词境编年 · 序章全文 ›</a></p>' +
        "</header>" +
        "<h2>史诗六章</h2>" +
        '<div class="wr-codex-grid">' + sagaHTML + "</div>" +
        "<h2>王子残页 · " + unlocked.length + "/" + frags.length + "</h2>" +
        '<div class="wr-codex-grid">' + fragHTML + "</div>" +
        "<h2>噬词图录</h2>" +
        '<div class="wr-codex-grid wr-codex-grid--foe">' + foeHTML + "</div>" +
        "<h2>旅伴与宿敌</h2>" +
        '<div class="wr-codex-grid">' + castHTML + "</div>" +
      "</section>";
    bindMute();
  }

  function render(lex) {
    lexCache = lex;
    var view = viewParam();
    if (view === "vn") renderVnRoute();
    else if (view === "dream") renderDream();
    else if (view === "clear") renderChapterClear();
    else if (view === "map") {
      if (regionParam() === "mist" && !vnSeen("mist_enter")) {
        maybePlayMistEnter(function () { renderMap(lex); });
      } else if (regionParam() === "mist" && mistChapterCleared() && !vnSeen("mist_revisit")) {
        maybePlayMistRevisit(function () { renderMap(lex); });
      } else {
        renderMap(lex);
      }
    }
    else if (view === "codex") renderCodex(lex);
    else if (view === "lore") renderLore();
    else renderHub(lex);
  }

  function boot() {
    root.innerHTML = '<div class="wr-loading">正在展开词境…</div>';
    if (viewParam() === "vn") {
      renderVnRoute();
      return;
    }
    var ready = lexCache ? Promise.resolve(lexCache) : CORE.loadLexicon();
    ready.then(function (lex) {
      if (!lex.shrines || !lex.shrines.length) {
        root.innerHTML = '<div class="wr-empty">词境词库尚未生成。</div>';
        return;
      }
      if (params.get("pin") && viewParam() !== "map" && viewParam() !== "vn") setQuery("map", regionParam());
      // 战斗结算带回的梦境，或营地有待播梦境
      if (viewParam() === "dream" || (CORE.pendingDream() && viewParam() === "hub" && !params.get("region"))) {
        renderDream();
        return;
      }
      render(lex);
    }).catch(function (err) {
      root.innerHTML = '<div class="wr-empty">加载失败：' + esc(err.message) + "</div>";
    });
  }

  // fix hrefView pin append when already has query — used above with string concat
  // pin links use hrefView("map", regionId) + "&pin=" which is correct

  if (!seenPrologue()) renderPrologue();
  else {
    maybePlayMist3Vn(function () { boot(); });
  }
})();
