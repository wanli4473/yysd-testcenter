/* =========================================================================
   vocab-lesson.js — YYSD「单词小课」引擎（中国版多邻国机制，站内升级）

   SCOPE（计划默认，已对齐）:
   - 主战场：机构站内单词区，沉浸壳，不是独立 App
   - 设备：手机优先，桌面可用
   - LIST HTML 退居「词卡指南」(exam.html)；主 CTA 进本播放器

   MECHANISM SPEC（8 层 → 可开发）:
   1. Path     → zone/vocab CTA 指向本页「开始 +N 经验」
   2. Lesson   → 每课 8 词 / ~12–16 题 / 一题一屏 / 顶栏进度
   3. Mix      → meaning_to_word | collocation | listen_meaning | example_cloze | scramble | type_spell
   4. Feedback → 口语化夸奖 / 温柔纠错 +「继续」；连对 N 题
   5. Learn    → 作业小课不扣心；错题收录 + 当堂可重练
   6. Retry    → 错词换题型当堂重练（标签「错题重练」）
   7. Celebrate→ 轻结算：经验 + 正确率 + 轻连胜 + 雅思一句提示
   8. Habit    → localStorage 轻连胜（不恐吓归零）

   DATA BRIDGE:
   - fetch library/{item.file} → 抽取 wordData 数组字面量 → Function 求值
   - 字段：word, meaning, ipa?, acceptCN?, example?, phrases?

   URL:
   - 作业: vocab-lesson.html?id=<manifestId> | ?book=gaozhong|cet4|special
   - 远征祠: ?from=realm&shrine=shrine-01
   - 训练营: ?from=realm&mode=camp
   ========================================================================= */
(function () {
  "use strict";
  var Y = window.YYSD;
  var CORE = window.YYSD_WORD_REALM;
  var STORY = window.YYSD_WORD_REALM_STORY;
  var SFX = window.YYSD_WORD_REALM_SFX;
  var params = new URLSearchParams(location.search);
  var idParam = (params.get("id") || "").trim();
  var bookParam = (params.get("book") || "").trim();
  var fromRealm = (params.get("from") || "") === "realm";
  var shrineParam = (params.get("shrine") || "").trim();
  var campMode = fromRealm && (params.get("mode") || "") === "camp";
  var realmEntry = !!(fromRealm || shrineParam || campMode);
  // 远征战斗仅总部站；作业小课不受影响
  if (realmEntry) {
    var A0 = window.YYSD_AUTH;
    if (!A0 || !A0.canWordRealm || !A0.canWordRealm()) {
      location.replace("zone.html?zone=study&s=vocab");
      return;
    }
  }

  var WORDS_PER_LESSON = 8;
  var CAMP_WORDS = 18;
  var REALM_WORDS_MIN = 20; // shrine pad + denser queue
  var HEARTS_MAX = 5; // homework
  var REALM_HEARTS = 4; // 远征更脆：容错更少
  var XP_PER_LESSON = 10;
  var XP_CAMP = 6;
  var ANSWER_SEC = 9;
  var ANSWER_SEC_SPELL = 14;
  var weekly = (CORE && CORE.weeklyTheme) ? CORE.weeklyTheme() : null;
  var STREAK_KEY = "yysd:vocab-lesson-streak";
  var PRAISE = ["太棒了！", "真棒！", "好棒！", "不错哦！", "漂亮！", "泰裤辣！"];
  var answerTimer = null;

  var root = document.getElementById("vl-root");
  var state = {
    item: null,
    book: null,
    shrineId: null,
    camp: false,
    title: "",
    words: [],
    queue: [],
    idx: 0,
    hearts: HEARTS_MAX,
    refilled: false,
    combo: 0,
    correct: 0,
    answered: 0,
    wrongBank: [],
    everWrong: [],
    startedAt: null,
    phase: "load", // load | play | feedback | celebrate | command
    selected: null,
    scramblePicked: [],
    freeRefillShown: false,
    battle: null, // realm 战斗皮状态；作业小课为 null
    timedOut: false
  };

  function battleMode() {
    return !!(state.battle && (state.shrineId || state.camp));
  }

  function esc(s) { return Y.esc(String(s == null ? "" : s)); }

  function libraryUrl(file) {
    var base = location.pathname.replace(/\/[^/]*$/, "/");
    return base + "library/" + String(file || "").replace(/^\//, "");
  }

  // ponytail: trusted local LIST HTML only — Function beats a half-baked JSON rewriter
  function parseWordData(html) {
    var m = html.match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
    if (!m) return [];
    try {
      var arr = Function('"use strict"; return (' + m[1] + ");")();
      if (!Array.isArray(arr)) return [];
      return arr.map(function (w) {
        var word = String(w.word || "").trim();
        var meaning = String(w.meaning || "").trim();
        if (!word || !meaning) return null;
        return {
          word: word,
          meaning: meaning,
          ipa: String(w.ipa || "").trim(),
          acceptCN: Array.isArray(w.acceptCN) ? w.acceptCN : [],
          example: String(w.example || "").trim(),
          phrases: String(w.phrases || w.collocations || "").trim(),
          collocations: String(w.collocations || w.phrases || "").trim(),
          mnemonic: String(w.mnemonic || "").trim(),
          derivatives: String(w.derivatives || "").trim(),
          distinguish: String(w.distinguish || "").trim(),
          pos: String(w.pos || "").trim()
        };
      }).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickDistractors(pool, target, key, n) {
    var others = pool.filter(function (w) {
      return String(w[key]).toLowerCase() !== String(target[key]).toLowerCase();
    });
    return shuffle(others).slice(0, n);
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Split "en（zh）, en(zh)" → [{en, zh}, ...] */
  function parsePhrasePairs(phrases) {
    var raw = String(phrases || "").trim();
    if (!raw) return [];
    return raw.split(/[,，]/).map(function (part) {
      part = part.trim();
      if (!part) return null;
      var m = part.match(/^(.+?)\s*[（(]\s*(.+?)\s*[）)]\s*$/);
      if (!m) return null;
      return { en: m[1].trim(), zh: m[2].trim() };
    }).filter(Boolean);
  }

  function englishOnly(example) {
    var s = String(example || "").trim();
    if (!s) return "";
    var cut = s.search(/[（(]/);
    if (cut >= 0) s = s.slice(0, cut);
    return s.trim();
  }

  /** Blank first occurrence of word (multi-word ok). null if not found. */
  function blankWord(text, word) {
    word = String(word || "").trim();
    text = String(text || "");
    if (!word || !text) return null;
    var parts = word.split(/\s+/).map(escapeRe);
    var re = new RegExp("\\b" + parts.join("\\s+") + "\\b", "i");
    if (!re.test(text)) return null;
    return text.replace(re, "____");
  }

  function wordChoiceOptions(word, pool) {
    var opts = shuffle([word].concat(pickDistractors(pool, word, "word", 3))).slice(0, 4);
    while (opts.length < 4 && pool.length) {
      var extra = pool[Math.floor(Math.random() * pool.length)];
      if (!opts.some(function (o) { return o.word === extra.word; })) opts.push(extra);
    }
    return opts.map(function (o) { return { key: o.word, label: o.word }; });
  }

  function attachCloze(ex, blank, hintZh, pool) {
    ex.blank = blank;
    ex.hintZh = hintZh || "";
    ex.options = wordChoiceOptions(ex.word, pool);
    return ex;
  }

  function tryCollocation(ex, pool) {
    var raw = ex.word.collocations || ex.word.phrases;
    var pairs = shuffle(parsePhrasePairs(raw));
    for (var i = 0; i < pairs.length; i++) {
      var blank = blankWord(pairs[i].en, ex.word.word);
      if (blank) return attachCloze(ex, blank, pairs[i].zh, pool);
    }
    return null;
  }

  function tryExampleCloze(ex, pool) {
    var blank = blankWord(englishOnly(ex.word.example), ex.word.word);
    if (!blank) return null;
    return attachCloze(ex, blank, "", pool);
  }

  /** 记/派/辨：展示提示文本，选出对应单词 */
  function tryHintPick(ex, pool, field) {
    var hint = String(ex.word[field] || "").trim();
    if (!hint || hint.length < 4) return null;
    ex.hintZh = hint;
    ex.options = wordChoiceOptions(ex.word, pool);
    return ex;
  }

  function speak(word) {
    if (window.YysdWordAudio) {
      window.YysdWordAudio.speak(word);
      return;
    }
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(word);
      u.lang = "en-GB";
      u.rate = 0.92;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function lessonHref(item) {
    return "vocab-lesson.html?id=" + encodeURIComponent(item.id);
  }

  function guideHref(item) {
    return Y.fileHref(item, "");
  }

  function buildExercises(words, allPool, retry) {
    var types = [
      "meaning_to_word", "collocation", "listen_meaning", "example_cloze",
      "scramble", "mnemonic_pick", "derivative_pick", "distinguish_pick"
    ];
    var queue = [];
    words.forEach(function (w, i) {
      var type = retry
        ? (i % 2 === 0 ? "type_spell" : "meaning_to_word")
        : types[i % types.length];
      queue.push(makeExercise(type, w, allPool, retry));
      if (!retry && i % 3 === 2) {
        queue.push(makeExercise("type_spell", w, allPool, false));
      }
    });
    return shuffle(queue);
  }

  /** 训练营：听写 + 听义为主，不推进主线 */
  function buildCampExercises(words, allPool) {
    var queue = [];
    words.forEach(function (w, i) {
      queue.push(makeExercise(i % 2 === 0 ? "type_spell" : "listen_meaning", w, allPool, false));
      queue.push(makeExercise(i % 2 === 0 ? "collocation" : "scramble", w, allPool, false));
    });
    return shuffle(queue);
  }

  /** 远征祠：每词三斩，题量拉高 */
  function buildRealmExercises(words, allPool) {
    var types = ["meaning_to_word", "collocation", "listen_meaning", "example_cloze", "scramble", "type_spell"];
    var queue = [];
    words.forEach(function (w, i) {
      queue.push(makeExercise(types[i % types.length], w, allPool, false));
      queue.push(makeExercise(types[(i + 2) % types.length], w, allPool, false));
      queue.push(makeExercise(types[(i + 4) % types.length], w, allPool, false));
    });
    return shuffle(queue);
  }

  function padRealmWords(lex, words, minN) {
    var seen = {};
    var out = [];
    (words || []).forEach(function (w) {
      var k = String(w.word || "").toLowerCase();
      if (!k || seen[k]) return;
      seen[k] = true;
      out.push(w);
    });
    // 补词优先中高难，不够再回落全库
    var hard = (lex.words || []).filter(function (w) { return (w.tier || 1) >= 2; });
    var pool = shuffle(hard.length >= minN ? hard : (lex.words || []).slice());
    for (var i = 0; i < pool.length && out.length < minN; i++) {
      var k2 = String(pool[i].word || "").toLowerCase();
      if (!k2 || seen[k2]) continue;
      seen[k2] = true;
      out.push(pool[i]);
    }
    return out;
  }

  function makeExercise(type, word, pool, retry) {
    var ex = { type: type, word: word, retry: !!retry, options: null, letters: null, blank: "", hintZh: "" };
    if (type === "collocation") {
      if (tryCollocation(ex, pool)) return ex;
      return makeExercise("meaning_to_word", word, pool, retry);
    }
    if (type === "example_cloze") {
      if (tryExampleCloze(ex, pool)) return ex;
      return makeExercise("meaning_to_word", word, pool, retry);
    }
    if (type === "mnemonic_pick") {
      if (tryHintPick(ex, pool, "mnemonic")) return ex;
      return makeExercise("meaning_to_word", word, pool, retry);
    }
    if (type === "derivative_pick") {
      if (tryHintPick(ex, pool, "derivatives")) return ex;
      return makeExercise("collocation", word, pool, retry);
    }
    if (type === "distinguish_pick") {
      if (tryHintPick(ex, pool, "distinguish")) return ex;
      return makeExercise("example_cloze", word, pool, retry);
    }
    if (type === "meaning_to_word" || type === "listen_meaning") {
      ex.options = wordChoiceOptions(word, pool);
    } else if (type === "word_to_meaning") {
      var mopts = shuffle([word].concat(pickDistractors(pool, word, "meaning", 3))).slice(0, 4);
      ex.options = mopts.map(function (o) { return { key: o.word, label: o.meaning }; });
    } else if (type === "scramble") {
      var letters = word.word.replace(/\s+/g, "").toLowerCase().split("");
      if (letters.length > 12) letters = letters.slice(0, 12);
      ex.letters = shuffle(letters);
      if (ex.letters.join("") === word.word.replace(/\s+/g, "").toLowerCase()) {
        ex.letters = shuffle(ex.letters);
      }
    }
    return ex;
  }

  function promptFor(ex) {
    if (ex.retry) {
      if (ex.type === "type_spell") return "错题重练 · 听音写单词";
      return "错题重练 · 选出正确单词";
    }
    if (ex.type === "meaning_to_word") return "选出对应的英文单词";
    if (ex.type === "word_to_meaning") return "选出正确的中文释义";
    if (ex.type === "listen_meaning") return "听音，选出正确的单词";
    if (ex.type === "collocation") return "补全常见搭配";
    if (ex.type === "example_cloze") return "根据例句选出挖空的单词";
    if (ex.type === "mnemonic_pick") return "根据记忆提示选出单词";
    if (ex.type === "derivative_pick") return "根据派生词选出原词";
    if (ex.type === "distinguish_pick") return "根据辨析说明选出单词";
    if (ex.type === "scramble") return "把字母排成正确的单词";
    if (ex.type === "type_spell") return "听音，写出英文拼写";
    return "选择正确答案";
  }

  function ieltsHint(word) {
    var m = word.meaning || "";
    if (/气候|环境|污染/.test(m)) return "这类词常出现在听力 Section 3/4 与阅读环境主题。";
    if (/证据|研究|数据|科学/.test(m)) return "学术词：阅读判断题与听力讲座高频。";
    if (/压力|活动|饮食|健康/.test(m)) return "生活场景词：听力 Section 1–2 与口语 Part 1 常用。";
    return "记搭配比记孤词更稳——写作同义替换时能直接用上。";
  }

  /** Mythic combat tip for Word Realm (no exam framing). */
  function realmHint() {
    var lines = [
      "字母是剑锋。记准音节，噬词者就会后退。",
      "连击使剑光暴涨——记忆之力只回应勇敢的重复。",
      "短词是短剑，长词是重刃。今天你又多修一座桥。",
      "替别人记住一个词，星屑就会在掌心多停一秒。"
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function renderShell() {
    var battle = battleMode();
    var hud = battle
      ? ('<header class="vl-battle-hud">' +
          '<a class="vl-x" id="vl-exit" href="#" aria-label="退出">×</a>' +
          '<div class="vl-hp vl-hp--hero" id="vl-hp-hero">' +
            '<span class="vl-hp__label">勇者</span>' +
            '<div class="vl-hp__track"><i id="vl-hp-hero-bar"></i></div>' +
            '<span class="vl-hp__n" id="vl-hp-hero-n"></span></div>' +
          '<div class="vl-hp vl-hp--enemy" id="vl-hp-enemy">' +
            '<span class="vl-hp__label" id="vl-enemy-name"></span>' +
            '<div class="vl-hp__track"><i id="vl-hp-enemy-bar"></i></div>' +
            '<span class="vl-hp__n" id="vl-hp-enemy-n"></span></div>' +
        "</header>" +
        '<div class="vl-arena" id="vl-arena" aria-hidden="true">' +
          '<div class="vl-enemy" id="vl-enemy"><span class="vl-enemy__glyph" id="vl-enemy-glyph"></span></div>' +
          '<div class="vl-float" id="vl-float" hidden></div>' +
        "</div>")
      : ('<header class="vl-top">' +
          '<a class="vl-x" id="vl-exit" href="#" aria-label="退出">×</a>' +
          '<div class="vl-progress" aria-hidden="true"><div class="vl-progress__bar" id="vl-bar"></div></div>' +
          // ponytail: homework is learn+record, not hearts — realm keeps HP via battleMode
          '<div class="vl-top__meta" id="vl-top-meta" aria-live="polite"></div>' +
        "</header>");
    root.innerHTML =
      '<div class="vl' + (battle ? " vl--battle" : "") + '">' + hud +
        '<div class="vl-combo" id="vl-combo" hidden></div>' +
        '<main class="vl-main" id="vl-main"></main>' +
        '<footer class="vl-foot" id="vl-foot"></footer>' +
        '<div class="vl-modal" id="vl-modal" hidden></div>' +
      "</div>";
    if (battle) paintBattleHud(true);
    document.getElementById("vl-exit").addEventListener("click", function (e) {
      e.preventDefault();
      var back = exitHref();
      if (state.phase === "play" || state.phase === "feedback") {
        if (!confirm(battle ? "战斗还没结束，确定撤退？" : "小课还没结束，确定离开？")) return;
      }
      location.href = back;
    });
  }

  function paintBattleHud(init) {
    if (!battleMode()) return;
    var b = state.battle;
    var heroPct = Math.max(0, Math.round((b.heroHp / b.heroMaxHp) * 100));
    var enemyPct = Math.max(0, Math.round((b.enemyHp / b.enemyMaxHp) * 100));
    var hb = document.getElementById("vl-hp-hero-bar");
    var eb = document.getElementById("vl-hp-enemy-bar");
    var hn = document.getElementById("vl-hp-hero-n");
    var en = document.getElementById("vl-hp-enemy-n");
    if (hb) hb.style.width = heroPct + "%";
    if (eb) eb.style.width = enemyPct + "%";
    if (hn) hn.textContent = b.heroHp + "/" + b.heroMaxHp;
    if (en) en.textContent = b.enemyHp + "/" + b.enemyMaxHp;
    if (init) {
      var name = document.getElementById("vl-enemy-name");
      var glyph = document.getElementById("vl-enemy-glyph");
      var foe = document.getElementById("vl-enemy");
      if (name) name.textContent = b.enemy.name;
      if (foe) {
        foe.className = "vl-enemy vl-enemy--" + (b.enemy.skin || "mist") +
          (b.enemy.portrait ? " vl-enemy--portrait" : "");
        if (b.enemy.portrait) {
          foe.innerHTML = '<img class="vl-enemy__art" src="' + esc(b.enemy.portrait) +
            '" alt="" onerror="this.remove();var g=this.parentNode&&this.parentNode.querySelector(\'.vl-enemy__glyph\');">';
          if (glyph) glyph.textContent = "";
        } else if (glyph) {
          glyph.textContent = b.enemy.glyph || "◆";
        }
      } else if (glyph) {
        glyph.textContent = b.enemy.glyph || "◆";
      }
    }
  }

  function enemyVisualHTML(enemy) {
    if (!enemy) return '<div class="vl-mascot vl-mascot--lg" aria-hidden="true">✦</div>';
    if (enemy.portrait) {
      return '<div class="vl-enemy vl-enemy--' + esc(enemy.skin || "mist") +
        ' vl-enemy--idle vl-enemy--portrait" aria-hidden="true">' +
        '<img class="vl-enemy__art" src="' + esc(enemy.portrait) + '" alt=""></div>' +
        '<p class="vl-enemy__title">' + esc(enemy.title || "") + " · " + esc(enemy.name) + "</p>" +
        (enemy.intro ? '<p class="vl-enemy__intro">' + esc(enemy.intro) + "</p>" : "");
    }
    return '<div class="vl-enemy vl-enemy--' + esc(enemy.skin || "mist") +
      ' vl-enemy--idle" aria-hidden="true"><span class="vl-enemy__glyph">' +
      esc(enemy.glyph || "◆") + "</span></div>" +
      '<p class="vl-enemy__title">' + esc(enemy.title || "") + " · " + esc(enemy.name) + "</p>" +
      (enemy.intro ? '<p class="vl-enemy__intro">' + esc(enemy.intro) + "</p>" : "");
  }

  function battleFloat(text, kind) {
    var el = document.getElementById("vl-float");
    var arena = document.getElementById("vl-arena");
    var foe = document.getElementById("vl-enemy");
    if (!el) return;
    el.hidden = false;
    el.className = "vl-float vl-float--" + (kind || "hit");
    el.textContent = text;
    if (foe) {
      foe.classList.remove("is-hit", "is-strike", "is-slash");
      void foe.offsetWidth;
      foe.classList.add(kind === "hurt" ? "is-strike" : "is-hit");
    }
    if (arena && kind === "hurt") {
      arena.classList.remove("is-shake");
      void arena.offsetWidth;
      arena.classList.add("is-shake");
    }
    clearTimeout(battleFloat._t);
    battleFloat._t = setTimeout(function () { el.hidden = true; }, 700);
  }

  /** Letter-blade slash across the foe on a successful answer */
  function playSlashFx(crit) {
    var arena = document.getElementById("vl-arena");
    var foe = document.getElementById("vl-enemy");
    if (!arena) return;
    var old = arena.querySelector(".vl-slash");
    if (old) old.remove();
    var el = document.createElement("div");
    el.className = "vl-slash" + (crit ? " is-crit" : "");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "<i></i><b></b>";
    arena.appendChild(el);
    if (foe) {
      foe.classList.remove("is-slash");
      void foe.offsetWidth;
      foe.classList.add("is-slash");
    }
    clearTimeout(playSlashFx._t);
    playSlashFx._t = setTimeout(function () {
      el.remove();
      if (foe) foe.classList.remove("is-slash");
    }, 520);
  }

  function isBossFight() {
    return !!(state.shrineId && STORY && STORY.isBossShrine && STORY.isBossShrine(state.shrineId));
  }

  function clearAnswerTimer() {
    if (answerTimer) {
      clearInterval(answerTimer);
      answerTimer = null;
    }
  }

  function startAnswerTimer(ex) {
    clearAnswerTimer();
    if (!battleMode()) return;
    var sec = (ex.type === "type_spell" || ex.type === "scramble") ? ANSWER_SEC_SPELL : ANSWER_SEC;
    var left = sec;
    var foot = document.getElementById("vl-foot");
    if (foot && !document.getElementById("vl-timer")) {
      foot.insertAdjacentHTML("afterbegin",
        '<div class="vl-timer" id="vl-timer" aria-live="polite">' +
          '<div class="vl-timer__track"><i id="vl-timer-bar" style="width:100%"></i></div>' +
          '<span class="vl-timer__n" id="vl-timer-n">' + sec + "s</span></div>");
    }
    function tick() {
      var bar = document.getElementById("vl-timer-bar");
      var n = document.getElementById("vl-timer-n");
      if (bar) bar.style.width = Math.max(0, Math.round((left / sec) * 100)) + "%";
      if (n) n.textContent = left + "s";
      if (left <= 0) {
        clearAnswerTimer();
        state.timedOut = true;
        grade(ex, null, true);
        return;
      }
      left -= 1;
    }
    tick();
    answerTimer = setInterval(tick, 1000);
  }

  /** 答错/超时：怪物噬咬扣血（远征无免费补心） */
  function applyEnemyAttack() {
    if (!battleMode() || !state.battle) return false;
    var dmg = CORE.enemyAttackDamage
      ? CORE.enemyAttackDamage(isBossFight())
      : (isBossFight() ? 2 : 1);
    state.hearts = Math.max(0, state.hearts - dmg);
    state.battle.heroHp = state.hearts;
    state.battle.lastHit = dmg;
    state.battle.crit = false;
    battleFloat("噬咬 -" + dmg, "hurt");
    if (SFX) SFX.hurt();
    if (state.battle.heroHp <= 0) state.battle.lost = true;
    paintHearts();
    return true;
  }

  function fleeHref() {
    var r = (state.shrineRegion || params.get("region") || "").trim();
    if (state.camp) return "word-realm.html?view=hub";
    return r
      ? ("word-realm.html?view=map&region=" + encodeURIComponent(r))
      : "word-realm.html?view=hub";
  }

  function mistAfterScript(shrineId) {
    var m = String(shrineId || "").match(/^shrine-0([1-7])$/);
    if (!m) return "";
    return "mist_after_0" + m[1];
  }

  function vnAlreadySeen(id) {
    if (!id) return true;
    try {
      var s = JSON.parse(localStorage.getItem("yysd:word-realm-vn-seen") || "{}");
      return !!s[id];
    } catch (e) { return false; }
  }

  function exitHref() {
    if (state.camp || state.shrineId || fromRealm) {
      // After mist shrine clear → story beat VN (once, before dream)
      if (state.shrineId && state.battle && state.battle.won && !state.camp) {
        var boss = STORY && STORY.bossOf ? STORY.bossOf(state.shrineId) : null;
        if (boss && boss.vnPost && !vnAlreadySeen(boss.vnPost)) {
          return "word-realm.html?view=vn&script=" + encodeURIComponent(boss.vnPost) +
            "&next=clear&region=" + encodeURIComponent(state.shrineRegion || "mist");
        }
        var after = mistAfterScript(state.shrineId);
        if (after && !vnAlreadySeen(after)) {
          return "word-realm.html?view=vn&script=" + encodeURIComponent(after) +
            "&next=map&region=mist";
        }
      }
      if (CORE && CORE.pendingDream && CORE.pendingDream()) {
        return "word-realm.html?view=dream";
      }
      var r = (state.shrineRegion || params.get("region") || "").trim();
      return r
        ? ("word-realm.html?view=map&region=" + encodeURIComponent(r))
        : "word-realm.html?view=hub";
    }
    if (state.book) return "vocab.html?book=" + encodeURIComponent(state.book);
    return "zone.html?zone=study&s=vocab";
  }

  function showCutscene(opts, done) {
    opts = opts || {};
    var lines = opts.lines || [];
    var i = 0;
    function paint() {
      var line = lines[i] || "";
      document.getElementById("vl-main").innerHTML =
        '<div class="vl-cut">' +
          '<p class="vl-cut__kicker">' + esc(opts.kicker || "剧情") + "</p>" +
          "<h2>" + esc(opts.title || "") + "</h2>" +
          '<p class="vl-cut__line">' + esc(line) + "</p>" +
          '<p class="vl-cut__step">' + (i + 1) + " / " + lines.length + "</p>" +
        "</div>";
      document.getElementById("vl-foot").innerHTML =
        '<button type="button" class="vl-btn vl-btn--ghost" id="vl-cut-skip">跳过</button>' +
        '<button type="button" class="vl-btn vl-btn--primary" id="vl-cut-next">' +
          (i >= lines.length - 1 ? (opts.doneLabel || "继续") : "下一句") + "</button>";
      document.getElementById("vl-cut-skip").onclick = function () { done(); };
      document.getElementById("vl-cut-next").onclick = function () {
        if (i >= lines.length - 1) done();
        else { i++; paint(); }
      };
    }
    if (!lines.length) { done(); return; }
    paint();
  }

  function paintHearts() {
    if (battleMode()) {
      state.battle.heroHp = state.hearts;
      paintBattleHud(false);
      return;
    }
    // 作业小课：顶栏显示错词收录数，不扣心
    var el = document.getElementById("vl-top-meta");
    if (!el) return;
    var n = state.everWrong.length;
    el.textContent = n ? ("待记 " + n) : "学习中";
  }

  function paintProgress() {
    if (!battleMode()) {
      var bar = document.getElementById("vl-bar");
      if (bar) {
        var total = Math.max(state.queue.length, 1);
        var pct = Math.min(100, Math.round((state.idx / total) * 100));
        bar.style.width = pct + "%";
      }
    } else {
      paintBattleHud(false);
    }
    var combo = document.getElementById("vl-combo");
    if (!combo) return;
    if (state.combo >= 2 && state.phase === "feedback") {
      combo.hidden = false;
      combo.textContent = (battleMode() && state.combo >= 4 ? "连击暴击！×" : "连对 ") +
        state.combo + (battleMode() && state.combo >= 4 ? "" : " 题");
    } else {
      combo.hidden = true;
    }
  }

  function showModal(html) {
    var m = document.getElementById("vl-modal");
    m.hidden = false;
    m.innerHTML = '<div class="vl-modal__card">' + html + "</div>";
  }

  function hideModal() {
    var m = document.getElementById("vl-modal");
    m.hidden = true;
    m.innerHTML = "";
  }

  function renderQuestion() {
    clearAnswerTimer();
    state.phase = "play";
    state.selected = null;
    state.scramblePicked = [];
    state.timedOut = false;
    hideModal();
    var ex = state.queue[state.idx];
    if (!ex) {
      maybeRetryOrCelebrate();
      return;
    }
    paintHearts();
    paintProgress();
    var main = document.getElementById("vl-main");
    var foot = document.getElementById("vl-foot");
    var badge = ex.retry
      ? '<span class="vl-badge vl-badge--retry">错题重练</span>'
      : (ex.type === "collocation"
        ? '<span class="vl-badge">考</span>'
        : (ex.type === "example_cloze"
          ? '<span class="vl-badge">例</span>'
          : (ex.type === "mnemonic_pick"
            ? '<span class="vl-badge">记</span>'
            : (ex.type === "derivative_pick"
              ? '<span class="vl-badge">派</span>'
              : (ex.type === "distinguish_pick"
                ? '<span class="vl-badge">辨</span>'
                : (ex.type.indexOf("listen") === 0 || ex.type === "type_spell"
                  ? '<span class="vl-badge">听力</span>'
                  : '<span class="vl-badge">新练</span>'))))));

    var body = "";
    if (ex.type === "meaning_to_word") {
      body = '<p class="vl-prompt-cn">' + esc(ex.word.meaning) + "</p>" + optionsHTML(ex);
    } else if (ex.type === "word_to_meaning") {
      body = '<p class="vl-prompt-en">' + esc(ex.word.word) + "</p>" +
        (ex.word.ipa ? '<p class="vl-ipa">' + esc(ex.word.ipa) + "</p>" : "") +
        optionsHTML(ex);
    } else if (ex.type === "listen_meaning") {
      body = '<button type="button" class="vl-play" id="vl-play" aria-label="播放发音">▶</button>' +
        '<p class="vl-hint">点击播放，再选单词</p>' + optionsHTML(ex);
    } else if (ex.type === "mnemonic_pick" || ex.type === "derivative_pick" || ex.type === "distinguish_pick") {
      body = '<p class="vl-prompt-cn">' + esc(ex.hintZh || "") + "</p>" + optionsHTML(ex);
    } else if (ex.type === "collocation" || ex.type === "example_cloze") {
      body = '<p class="vl-cloze">' + esc(ex.blank || "____") + "</p>" +
        (ex.hintZh ? '<p class="vl-hint">' + esc(ex.hintZh) + "</p>" : "") +
        optionsHTML(ex);
    } else if (ex.type === "scramble") {
      body = '<p class="vl-prompt-cn">' + esc(ex.word.meaning) + "</p>" +
        '<div class="vl-scramble-out" id="vl-scramble-out"></div>' +
        '<div class="vl-scramble-pool" id="vl-scramble-pool"></div>';
    } else if (ex.type === "type_spell") {
      body = '<button type="button" class="vl-play" id="vl-play" aria-label="播放发音">▶</button>' +
        '<p class="vl-hint">听音拼写（可不区分大小写）</p>' +
        '<label class="vl-input-wrap">英文拼写' +
        '<input type="text" id="vl-input" class="vl-input" autocomplete="off" autocapitalize="off" spellcheck="false"></label>';
    }

    main.innerHTML =
      '<div class="vl-q">' + badge +
        '<h1 class="vl-title">' + esc(promptFor(ex)) + "</h1>" + body +
      "</div>";

    foot.innerHTML =
      '<button type="button" class="vl-btn vl-btn--ghost" id="vl-skip">跳过</button>' +
      '<button type="button" class="vl-btn vl-btn--primary" id="vl-check" disabled>检查</button>';

    bindQuestion(ex);
    if (ex.type === "listen_meaning" || ex.type === "type_spell") {
      speak(ex.word.word);
      var play = document.getElementById("vl-play");
      if (play) play.addEventListener("click", function () { speak(ex.word.word); });
    }
    if (ex.type === "type_spell") {
      var inp = document.getElementById("vl-input");
      inp.focus();
      inp.addEventListener("input", function () {
        document.getElementById("vl-check").disabled = !inp.value.trim();
      });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter") document.getElementById("vl-check").click();
      });
    }
    startAnswerTimer(ex);
  }

  function optionsHTML(ex) {
    return '<div class="vl-options" role="listbox">' + ex.options.map(function (o, i) {
      return '<button type="button" class="vl-opt" role="option" data-key="' + esc(o.key) + '" data-i="' + i + '">' +
        '<span class="vl-opt__n">' + (i + 1) + "</span>" +
        '<span class="vl-opt__t">' + esc(o.label) + "</span></button>";
    }).join("") + "</div>";
  }

  function bindQuestion(ex) {
    var check = document.getElementById("vl-check");
    document.getElementById("vl-skip").onclick = function () { grade(ex, null, true); };
    check.onclick = function () { submit(ex); };

    if (ex.options) {
      root.querySelectorAll(".vl-opt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          root.querySelectorAll(".vl-opt").forEach(function (b) { b.classList.remove("is-on"); });
          btn.classList.add("is-on");
          state.selected = btn.getAttribute("data-key");
          check.disabled = false;
        });
      });
      window.onkeydown = function (e) {
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= (ex.options.length || 0)) {
          var btn = root.querySelector('.vl-opt[data-i="' + (n - 1) + '"]');
          if (btn) btn.click();
        } else if (e.key === "Enter" && !check.disabled) check.click();
      };
    }

    if (ex.type === "scramble") {
      var pool = document.getElementById("vl-scramble-pool");
      var out = document.getElementById("vl-scramble-out");
      var poolLeft = ex.letters.slice();
      function paintScramble() {
        out.innerHTML = state.scramblePicked.map(function (ch, i) {
          return '<button type="button" class="vl-chip" data-from="out" data-i="' + i + '">' + esc(ch) + "</button>";
        }).join("") || '<span class="vl-scramble-ph">点选字母</span>';
        pool.innerHTML = poolLeft.map(function (ch, i) {
          return '<button type="button" class="vl-chip" data-from="pool" data-i="' + i + '">' + esc(ch) + "</button>";
        }).join("");
        check.disabled = !state.scramblePicked.length;
        out.querySelectorAll('[data-from="out"]').forEach(function (b) {
          b.onclick = function () {
            var i = +b.getAttribute("data-i");
            poolLeft.push(state.scramblePicked.splice(i, 1)[0]);
            paintScramble();
          };
        });
        pool.querySelectorAll('[data-from="pool"]').forEach(function (b) {
          b.onclick = function () {
            var i = +b.getAttribute("data-i");
            state.scramblePicked.push(poolLeft.splice(i, 1)[0]);
            paintScramble();
          };
        });
      }
      paintScramble();
    }
  }

  function submit(ex) {
    if (ex.type === "scramble") {
      grade(ex, state.scramblePicked.join(""), false);
      return;
    }
    if (ex.type === "type_spell") {
      var v = (document.getElementById("vl-input").value || "").trim();
      grade(ex, v, false);
      return;
    }
    grade(ex, state.selected, false);
  }

  function normWord(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function isCorrect(ex, answer) {
    var w = normWord(ex.word.word);
    if (ex.type === "word_to_meaning") return normWord(answer) === w;
    if (ex.type === "scramble" || ex.type === "type_spell") {
      return normWord(answer).replace(/\s+/g, "") === w.replace(/\s+/g, "");
    }
    return normWord(answer) === w;
  }

  function grade(ex, answer, skipped) {
    clearAnswerTimer();
    window.onkeydown = null;
    var ok = !skipped && isCorrect(ex, answer);
    var timedOut = !!state.timedOut;
    state.timedOut = false;
    state.answered++;
    state.phase = "feedback";
    if (ok) {
      state.correct++;
      state.combo++;
      if (battleMode()) {
        var dmg = CORE.battleDamage(state.combo);
        state.battle.lastHit = dmg;
        state.battle.crit = dmg >= 2;
        state.battle.enemyHp = Math.max(0, state.battle.enemyHp - dmg);
        if (state.battle.enemyHp <= 0) state.battle.won = true;
        battleFloat((state.battle.crit ? "暴击斩 -" : "斩击 -") + dmg, "hit");
        playSlashFx(state.battle.crit);
        if (SFX) SFX.hit(state.battle.crit);
      }
    } else {
      state.combo = 0;
      if (battleMode()) {
        applyEnemyAttack();
      }
      // ponytail: homework — no hearts; wrong → wrongBank for retry/notebook
      if (!ex.retry) {
        var exists = state.wrongBank.some(function (w) {
          return normWord(w.word) === normWord(ex.word.word);
        });
        if (!exists) state.wrongBank.push(ex.word);
        var seen = state.everWrong.some(function (w) {
          return normWord(w.word) === normWord(ex.word.word);
        });
        if (!seen) state.everWrong.push(ex.word);
      }
    }
    paintHearts();
    paintProgress();
    showFeedback(ex, ok, skipped, timedOut);
  }

  function showFeedback(ex, ok, skipped, timedOut) {
    var foot = document.getElementById("vl-foot");
    var praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    var badTitle = timedOut
      ? "时间到 · 噬词者发动攻击"
      : (skipped ? "已跳过 · 噬词者发动攻击" : "答错 · 噬词者发动攻击");
    if (!battleMode()) {
      badTitle = skipped ? "已跳过" : "再记一次就好";
    }
    var msg = ok
      ? '<div class="vl-fb vl-fb--ok"><strong>' + esc(praise) + "</strong>" +
        (ex.word.example ? '<p class="vl-fb__ex">' + esc(ex.word.example) + "</p>" : "") +
        "</div>"
      : '<div class="vl-fb vl-fb--bad"><strong>' + esc(badTitle) + "</strong>" +
        "<p>正确答案：<b>" + esc(ex.word.word) + "</b> · " + esc(ex.word.meaning) + "</p></div>";

    // inject feedback above foot
    var main = document.getElementById("vl-main");
    var old = main.querySelector(".vl-fb");
    if (old) old.remove();
    main.insertAdjacentHTML("beforeend", msg);
    root.querySelectorAll(".vl-opt").forEach(function (b) {
      b.disabled = true;
      if (normWord(b.getAttribute("data-key")) === normWord(ex.word.word)) b.classList.add("is-right");
      else if (b.classList.contains("is-on")) b.classList.add("is-wrong");
    });

    var nextLabel = "继续";
    if (battleMode() && state.battle.won) nextLabel = "击破！";
    else if (battleMode() && state.battle.lost) nextLabel = "溃败…";
    foot.innerHTML = '<button type="button" class="vl-btn vl-btn--primary vl-btn--wide" id="vl-next">' +
      nextLabel + "</button>";
    document.getElementById("vl-next").onclick = function () {
      if (battleMode() && state.battle.won) {
        celebrate();
        return;
      }
      if (battleMode() && state.battle.lost) {
        showDefeat();
        return;
      }
      advance();
    };
  }

  function offerRefill() {
    // 仅远征战斗皮仍可能走到补心；作业小课不再触发
    if (!battleMode()) {
      advance();
      return;
    }
    state.freeRefillShown = true;
    showModal(
      '<div class="vl-refill">' +
        '<div class="vl-mascot" aria-hidden="true">✦</div>' +
        "<h2>记忆之力将散</h2>" +
        "<p>神明借你一次重新凝聚——再倒下便要撤退。</p>" +
        '<button type="button" class="vl-btn vl-btn--primary vl-btn--wide" id="vl-refill">免费重新凝聚</button>' +
      "</div>"
    );
    document.getElementById("vl-refill").onclick = function () {
      state.hearts = HEARTS_MAX;
      state.refilled = true;
      state.battle.heroHp = HEARTS_MAX;
      state.battle.lost = false;
      paintHearts();
      hideModal();
      advance();
    };
  }

  function advance() {
    state.idx++;
    window.onkeydown = null;
    if (battleMode() && state.battle.won) {
      celebrate();
      return;
    }
    if (state.idx >= state.queue.length) maybeRetryOrCelebrate();
    else renderQuestion();
  }

  function maybeRetryOrCelebrate() {
    if (battleMode()) {
      // 题尽：必须击破才算胜；敌仍存活 = 体力耗尽战败（不再自动通关）
      if (state.battle.enemyHp <= 0) {
        state.battle.won = true;
        celebrate();
        return;
      }
      state.battle.lost = true;
      showDefeat();
      return;
    }
    if (state.wrongBank.length && state.phase !== "retrying") {
      var retryWords = state.wrongBank.slice(0, 6);
      state.wrongBank = [];
      state.phase = "retrying";
      var bridge = document.getElementById("vl-main");
      document.getElementById("vl-foot").innerHTML = "";
      bridge.innerHTML =
        '<div class="vl-bridge">' +
          '<div class="vl-mascot" aria-hidden="true">✦</div>' +
          "<h2>一起来复习不太熟练的部分吧</h2>" +
          "<p>换种题型再练一遍，轻轻的。</p>" +
          '<button type="button" class="vl-btn vl-btn--primary" id="vl-retry-go">开始重练</button>' +
        "</div>";
      document.getElementById("vl-retry-go").onclick = function () {
        state.queue = buildExercises(retryWords, state.words, true);
        state.idx = 0;
        renderQuestion();
      };
      return;
    }
    celebrate();
  }

  function showDefeat() {
    state.phase = "defeat";
    window.onkeydown = null;
    hideModal();
    if (SFX) SFX.lose();
    var back = exitHref();
    var retry = state.shrineId
      ? ("vocab-lesson.html?from=realm&shrine=" + encodeURIComponent(state.shrineId))
      : campHrefSafe();
    var enemyName = (state.battle && state.battle.enemy && state.battle.enemy.name) || "噬词者";
    var isBoss = isBossFight();
    var exhausted = state.battle && state.battle.enemyHp > 0 && state.idx >= state.queue.length;
    var soft = exhausted
      ? (enemyName + "仍未倒下，你的斩击耗尽。祠未点亮。")
      : (isBoss
        ? (enemyName + "低语着 Forget… 祠未点亮。艾拉：「还没写完。回修炼场淬剑，再来。」")
        : (enemyName + "仍在。祠未点亮，残页未掉落。"));
    var hint = isBoss
      ? "Boss 战败不推进剧情。限时答题，答对斩击，答错/超时挨噬咬。"
      : "答错与超时都会挨噬咬。左上角 × 可撤退（祠不点亮）。";
    document.getElementById("vl-main").innerHTML =
      '<div class="vl-celebrate vl-defeat' + (isBoss ? " vl-defeat--boss" : "") + '">' +
        '<div class="vl-enemy vl-enemy--down" aria-hidden="true">☠</div>' +
        "<h2>" + (isBoss ? "Boss 撤退" : (exhausted ? "斩击耗尽" : "撤退")) + "</h2>" +
        '<p class="vl-celebrate__soft">' + esc(soft) + "</p>" +
        '<p class="vl-celebrate__hint">' + esc(hint) + "</p>" +
      "</div>";
    document.getElementById("vl-foot").innerHTML =
      '<a class="vl-btn vl-btn--primary vl-btn--wide" href="' + esc(retry) + '">再次挑战</a>' +
      '<a class="vl-btn vl-btn--ghost" href="' + esc(campHrefSafe()) + '">去修炼场</a>' +
      '<a class="vl-btn vl-btn--ghost" href="' + esc(fleeHref()) + '">回远征地图</a>';
  }

  function campHrefSafe() {
    return "vocab-lesson.html?from=realm&mode=camp";
  }

  function readStreak() {
    try { return JSON.parse(localStorage.getItem(STREAK_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function writeStreak(n, lastDay) {
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify({ n: n, lastDay: lastDay }));
    } catch (e) {}
  }

  function bumpStreak() {
    var day = new Date().toISOString().slice(0, 10);
    var s = readStreak();
    if (s.lastDay === day) return s.n || 1;
    var y = new Date();
    y.setDate(y.getDate() - 1);
    var yday = y.toISOString().slice(0, 10);
    var n = (s.lastDay === yday) ? (s.n || 0) + 1 : 1;
    writeStreak(n, day);
    return n;
  }

  function saveLessonResult() {
    var item = state.item;
    if (!item) return;
    var total = Math.max(state.answered, 1);
    var score = state.correct;
    var store = {};
    try { store = JSON.parse(localStorage.getItem("yysd:results") || "{}"); } catch (e) {}
    var attemptAt = new Date().toISOString();
    var record = {
      id: item.id,
      title: item.title,
      zone: item.zone,
      subject: item.subject,
      score: score,
      total: total,
      band: null,
      date: attemptAt,
      startedAt: state.startedAt,
      durationSec: state.startedAt
        ? Math.round((Date.now() - Date.parse(state.startedAt)) / 1000)
        : null,
      wrong: state.everWrong.map(function (w) { return w.word; }),
      lesson: true
    };
    store[item.id] = record;
    try { localStorage.setItem("yysd:results", JSON.stringify(store)); } catch (e) {}
    if (window.YYSD_AUTH && YYSD_AUTH.pushScoreRecord) {
      YYSD_AUTH.pushScoreRecord(Object.assign({}, record, { attemptAt: attemptAt, wrong: [] }));
    }

    if (state.everWrong.length && state.book) {
      Y.mergeWrongWords(state.book, state.everWrong.map(function (w) {
        return {
          word: w.word, ipa: w.ipa, meaning: w.meaning, acceptCN: w.acceptCN,
          userSpelling: "", userMeaning: "", spellingCorrect: false, meaningCorrect: false
        };
      }), { id: item.id, title: item.title, subject: item.subject });
    }
  }

  function celebrate() {
    state.phase = "celebrate";
    window.onkeydown = null;
    if (state.battle) {
      state.battle.won = true;
      state.battle.enemyHp = 0;
      state.battle.lost = false;
    }
    if (!state.camp && !state.shrineId) saveLessonResult();
    // 仅主线击破写祠进度；训练营 / 战败绝不写
    if (state.shrineId && CORE && !state.camp) CORE.markCleared(state.shrineId);

    var postBoss = state.shrineId && STORY && STORY.bossOf
      ? STORY.bossOf(state.shrineId) : null;

    function paintCelebrate() {
      if (SFX) SFX.win();
      var streak = bumpStreak();
      var baseXp = state.camp ? XP_CAMP : XP_PER_LESSON;
      var xp = baseXp + Math.min(state.camp ? 3 : 5, Math.floor(state.correct / 3));
      if (streak >= 2) xp += 2;
      if (postBoss) xp += 5;
      if (state.camp && weekly && weekly.bonusXp) xp += weekly.bonusXp;
      var rpgGain = null;
      if (window.YYSD_VOCAB_RPG) {
        rpgGain = window.YYSD_VOCAB_RPG.addXp(xp, state.camp ? "camp" : (state.shrineId ? "shrine" : "lesson"));
      }
      var rate = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
      var sample = state.words[0] || { meaning: "", word: "" };
      var back = exitHref();
      var nextLesson = "";
      if (state.item && !state.shrineId && !state.camp) {
        nextLesson = '<a class="vl-btn vl-btn--ghost" href="' + esc(guideHref(state.item)) + '">查看词卡指南</a>';
      }
      var hasDream = !!(CORE && CORE.pendingDream && CORE.pendingDream());
      var continueLabel = hasDream
        ? "进入梦境 ›"
        : ((state.camp || state.shrineId || fromRealm) ? "回到远征地图" : "回单词区");
      var softLine;
      var enemyName = state.battle && state.battle.enemy ? state.battle.enemy.name : "";
      if (state.camp) {
        softLine = "修炼木桩倒下。未推进剧情、未掉落残页——记忆之力增长。" +
          (weekly ? (" 本周主题「" + weekly.name + "」额外 +" + (weekly.bonusXp || 0) + "。") : "");
      } else if (state.shrineId) {
        var clearLine = "";
        if (STORY && state.shrineMeta) {
          clearLine = STORY.shrineBeat(state.shrineMeta.region, state.shrineMeta.index).clear;
        }
        softLine = (clearLine ? clearLine + " " : "") +
          (enemyName ? ("击破「" + enemyName + "」。") : "") + "祠已点亮。" +
          (hasDream ? " 星屑震颤——有梦境待看。" : "");
      } else {
        softLine = "本课完成。回单词区继续作业，或去「词境」冒险。";
      }
      var headline = battleMode()
        ? ((postBoss ? "Boss 击破 · " : "击破 · ") + (enemyName || "噬词者"))
        : (state.camp ? "训练完成！" : "本关完成！");
      var mascot;
      if (battleMode() && state.battle.enemy && state.battle.enemy.portrait) {
        mascot = '<div class="vl-enemy vl-enemy--down vl-enemy--portrait vl-enemy--' +
          esc(state.battle.enemy.skin || "mist") +
          '" aria-hidden="true"><img class="vl-enemy__art" src="' +
          esc(state.battle.enemy.portrait) + '" alt=""></div>';
      } else if (battleMode()) {
        mascot = '<div class="vl-enemy vl-enemy--down vl-enemy--' +
          esc((state.battle.enemy && state.battle.enemy.skin) || "mist") +
          '" aria-hidden="true">' + esc((state.battle.enemy && state.battle.enemy.glyph) || "◆") + "</div>";
      } else {
        mascot = '<div class="vl-mascot vl-mascot--lg" aria-hidden="true">✦</div>';
      }

      var levelLine = "";
      var levelBanner = "";
      if (rpgGain) {
        levelLine = '<p class="vl-celebrate__lv">Lv.' + rpgGain.after.level + " · " +
          esc(rpgGain.after.title) +
          (rpgGain.leveledUp ? ' <span class="vl-celebrate__up">LEVEL UP!</span>' : "") +
          "</p>";
        if (rpgGain.leveledUp) {
          levelBanner =
            '<div class="vl-levelup" role="status">' +
              '<p class="vl-levelup__kicker">Memory Power surges</p>' +
              "<h3>Lv." + rpgGain.before.level + " → Lv." + rpgGain.after.level + "</h3>" +
              '<p class="vl-levelup__en">Title: ' + esc(rpgGain.after.title) + "</p>" +
              '<p class="vl-levelup__zh">称号更新：' + esc(rpgGain.after.title) + " · 记忆之力回应了你的重复。</p>" +
            "</div>";
        }
      }

      var bar = document.getElementById("vl-bar");
      if (bar) bar.style.width = "100%";
      if (battleMode()) paintBattleHud(false);
      var combo = document.getElementById("vl-combo");
      if (combo) combo.hidden = true;
      document.getElementById("vl-main").innerHTML =
        '<div class="vl-celebrate' + (rpgGain && rpgGain.leveledUp ? " is-levelup" : "") + '">' + mascot +
          levelBanner +
          "<h2>" + esc(headline) + "</h2>" +
          '<p class="vl-celebrate__xp">+' + xp +
            (battleMode() ? " 记忆之力" : " 经验") + "</p>" +
          levelLine +
          '<div class="vl-celebrate__stats">' +
            "<div><span>正确率</span><b>" + rate + "%</b></div>" +
            "<div><span>轻连胜</span><b>" + streak + " 天</b></div>" +
          "</div>" +
          '<p class="vl-celebrate__hint">' +
            esc(battleMode() ? realmHint() : ieltsHint(sample)) + "</p>" +
          '<p class="vl-celebrate__soft">' + esc(softLine) + "</p>" +
        "</div>";
      document.getElementById("vl-foot").innerHTML =
        '<a class="vl-btn vl-btn--primary vl-btn--wide" href="' + esc(back) + '">' + esc(continueLabel) + "</a>" +
        nextLesson;
    }

    // vnPost plays on word-realm after celebrate exit — skip legacy Chinese post when present
    if (postBoss && postBoss.post && postBoss.post.length && !postBoss.vnPost) {
      showCutscene({
        kicker: "Boss 战后",
        title: postBoss.name,
        lines: postBoss.post,
        doneLabel: "领取战果"
      }, paintCelebrate);
    } else {
      paintCelebrate();
    }
  }

  function fail(msg) {
    var back = fromRealm || campMode || shrineParam
      ? '<a href="word-realm.html">返回词境远征</a>'
      : '<a href="zone.html?zone=study&s=vocab">返回单词区</a>';
    root.innerHTML = '<div class="vl-fail"><h2>打不开这关</h2><p>' + esc(msg) +
      "</p><p>" + back + "</p></div>";
  }

  function resetPlayState(words, pool, title, opts) {
    opts = opts || {};
    clearAnswerTimer();
    state.title = title;
    state.words = words;
    state.queue = opts.camp
      ? buildCampExercises(words, pool)
      : (state.shrineId
        ? buildRealmExercises(words, pool)
        : buildExercises(words, pool, false));
    state.idx = 0;
    var realmFight = !!(opts.camp || state.shrineId);
    var heroMax = realmFight ? REALM_HEARTS : HEARTS_MAX;
    state.hearts = heroMax;
    state.refilled = false;
    state.freeRefillShown = false;
    state.combo = 0;
    state.correct = 0;
    state.answered = 0;
    state.wrongBank = [];
    state.everWrong = [];
    state.timedOut = false;
    state.startedAt = new Date().toISOString();

    if (realmFight && CORE) {
      var qLen = state.queue.length;
      // 敌更厚：多数答对才能击破；Boss 接近题数；题尽未击破 = 败
      var enemyMax = isBossFight()
        ? Math.max(20, Math.ceil(qLen * 0.9))
        : Math.max(18, Math.ceil(qLen * 0.78));
      state.battle = CORE.createBattle({
        queueLen: qLen,
        enemyMaxHp: enemyMax,
        heroMaxHp: heroMax,
        camp: !!opts.camp,
        region: opts.camp ? "camp" : (state.shrineRegion || "mist")
      });
      var bossMeta = state.shrineId && STORY && STORY.bossOf
        ? STORY.bossOf(state.shrineId) : null;
      if (bossMeta && state.battle.enemy) {
        state.battle.enemy = {
          id: bossMeta.id,
          name: bossMeta.name,
          title: "地区 Boss",
          skin: state.shrineRegion || "mist",
          glyph: state.battle.enemy.glyph,
          portrait: bossMeta.portrait || state.battle.enemy.portrait || "",
          intro: bossMeta.pre && bossMeta.pre[0] ? bossMeta.pre[0] : state.battle.enemy.intro
        };
      }
    } else {
      state.battle = null;
    }

    document.title = title + (opts.camp ? " · 星屑修炼场" : (realmFight ? " · 噬词战" : " · 单词小课"));
    var sub = document.getElementById("vl-sub");
    if (sub) sub.textContent = title + " · 约 " + state.queue.length + " 题";
    renderShell();

    function showStartGate() {
      var xpShow = opts.camp ? XP_CAMP : XP_PER_LESSON;
      var enemy = state.battle && state.battle.enemy;
      var isBoss = !!(state.shrineId && STORY && STORY.isBossShrine && STORY.isBossShrine(state.shrineId));
      var blurb = opts.camp
        ? ("星屑修炼 · " + words.length + " 词 · " + state.queue.length + " 斩 · 限时 · 不推进剧情")
        : (realmFight
          ? ((isBoss ? "Boss 战 · " : "噬词战 · ") + words.length + " 词 · " +
            state.queue.length + " 斩 · 限时 " + ANSWER_SEC + "/" + ANSWER_SEC_SPELL +
            "s · 敌 HP " + (state.battle ? state.battle.enemyMaxHp : "—"))
          : ("今日一小关 · " + words.length + " 个词 · 约 5–8 分钟"));
      var guide = opts.guideHref
        ? '<a class="vl-start__guide" href="' + esc(opts.guideHref) + '">先看词卡指南</a>'
        : (opts.enterLine
          ? '<p class="vl-start__guide">' + esc(opts.enterLine) + "</p>"
          : "");
      var startVisual = enemyVisualHTML(enemy);
      var cta = realmFight ? ("开始挑战 +" + xpShow + " 记忆之力") : ("开始 +" + xpShow + " 经验");
      document.getElementById("vl-main").innerHTML =
        '<div class="vl-start">' + startVisual +
          "<h1>" + esc(title) + "</h1>" +
          "<p>" + esc(blurb) + "</p>" +
          '<button type="button" class="vl-btn vl-btn--primary vl-btn--wide" id="vl-go">' +
            esc(cta) + "</button>" +
          guide +
        "</div>";
      document.getElementById("vl-foot").innerHTML = "";
      var go = document.getElementById("vl-go");
      if (go) go.onclick = function () { renderQuestion(); };
    }

    // Boss VN plays on word-realm before lesson (?bossVn=1); skip legacy Chinese cutscene
    var skipBossCut = params.get("bossVn") === "1" || (params.get("bossVn") || "") === "1";
    var preBoss = state.shrineId && STORY && STORY.bossOf
      ? STORY.bossOf(state.shrineId) : null;
    if (preBoss && preBoss.pre && preBoss.pre.length && !preBoss.vnPre && !skipBossCut) {
      showCutscene({
        kicker: "Boss 战前",
        title: preBoss.name,
        lines: preBoss.pre,
        doneLabel: "进入战场"
      }, showStartGate);
    } else {
      showStartGate();
    }
  }

  function startWithItem(item, allWords) {
    state.item = item;
    state.book = Y.vocabBookOfSubject(item.subject);
    state.shrineId = null;
    state.camp = false;
    var words = shuffle(allWords).slice(0, Math.min(WORDS_PER_LESSON, allWords.length));
    if (words.length < 4) {
      fail("这个单元词太少，换一单元试试。");
      return;
    }
    resetPlayState(words, allWords, Y.displayTitle(item), { guideHref: guideHref(item) });
  }

  function startShrine(lex, shrine) {
    var words = padRealmWords(lex, CORE.shrineWords(lex, shrine.id), REALM_WORDS_MIN);
    if (words.length < 4) {
      fail("这座祠的词表不完整。");
      return;
    }
    state.item = null;
    state.book = null;
    state.camp = false;
    state.shrineId = shrine.id;
    state.shrineMeta = shrine;
    state.shrineRegion = shrine.region;
    var beat = STORY
      ? STORY.shrineBeat(shrine.region, shrine.index)
      : { shrineName: shrine.id, enter: "" };
    resetPlayState(words, words.concat(lex.words.slice(0, 80)), beat.shrineName, {
      enterLine: beat.enter
    });
  }

  function startCamp(lex) {
    var theme = weekly || ((CORE && CORE.weeklyTheme) ? CORE.weeklyTheme() : null);
    var words = CORE.randomCampWords(lex, CAMP_WORDS, theme ? { tiers: theme.tiers } : null);
    if (words.length < 4) {
      fail("词库太小，无法开训。");
      return;
    }
    state.item = null;
    state.book = null;
    state.shrineId = null;
    state.camp = true;
    state.shrineRegion = "";
    var title = theme ? ("星屑修炼场 · " + theme.name) : "星屑修炼场";
    resetPlayState(words, lex.words, title, {
      camp: true,
      enterLine: theme ? theme.blurb : ""
    });
  }

  function resolveItem(items) {
    if (idParam) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === idParam) return items[i];
      }
      return null;
    }
    var book = bookParam || "gaozhong";
    var stats = Y.vocabBookStats(items, book);
    if (!stats || !stats.lists.length) return null;
    var prog = Y.vocabProgress(stats.lists);
    return prog.next || stats.lists[0];
  }

  // expose for smoke / reuse
  Y.parseVocabWordData = parseWordData;
  Y.vocabLessonHref = lessonHref;

  function bootHomework() {
    return Y.load().then(function (items) {
      var item = resolveItem(items);
      if (!item) {
        fail("找不到对应单元。请从单词区重新进入。");
        return;
      }
      if (!item.file) {
        fail("该内容没有词表文件。");
        return;
      }
      root.innerHTML = '<div class="vl-loading">正在准备小课…</div>';
      return fetch(libraryUrl(item.file)).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      }).then(function (html) {
        var words = parseWordData(html);
        if (words.length < 4) throw new Error("未能解析词表（需要 wordData）");
        startWithItem(item, words);
      });
    });
  }

  function bootRealm() {
    if (!CORE) {
      fail("词境核心未加载。请从词境远征重新进入。");
      return Promise.resolve();
    }
    root.innerHTML = '<div class="vl-loading">正在展开' + (campMode ? "修炼场" : "祠庙") + "…</div>";
    return CORE.loadLexicon().then(function (lex) {
      if (campMode) {
        startCamp(lex);
        return;
      }
      var shrine = CORE.shrineById(lex, shrineParam);
      if (!shrine) {
        fail("找不到这座祠。请从远征地图重新进入。");
        return;
      }
      // pilot：仅雾原章节可战
      if (shrine.region && shrine.region !== "mist") {
        fail("后续章节尚未开放，请先完成晨雾平原。");
        return;
      }
      startShrine(lex, shrine);
    });
  }

  function startLessonBoot() {
    var boot;
    if (campMode || shrineParam) boot = bootRealm();
    else if (fromRealm) {
      fail("请从远征地图进入祠庙，或打开星屑修炼场。");
      boot = Promise.resolve();
    } else boot = bootHomework();

    boot.catch(function (err) {
      fail(err.message || String(err));
    });
  }

  if (window.YYSD_DIAG_GATE) {
    window.YYSD_DIAG_GATE.ensure({ requireLogin: true }).then(function (ok) {
      if (ok) startLessonBoot();
    });
  } else {
    startLessonBoot();
  }
})();
