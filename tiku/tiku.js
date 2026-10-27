/* 题库中心教师站 - 题目审阅 / 已有试卷 / 学生做题记录 / 开通（管理员） */
(function (w) {
  "use strict";
  var API = (w.location.hostname === "localhost" || w.location.hostname === "127.0.0.1")
    ? (w.location.protocol + "//" + w.location.hostname + ":3000")
    : "https://api.youyisida.com";
  var TK = "yysd:teacher:token";
  var SKILL_ZH = { reading: "阅读", listening: "听力", writing: "写作", speaking: "口语" };
  var SKILL_ORDER = ["reading", "listening", "writing", "speaking"];
  var SKILL_DOT = { reading: "var(--sk-reading)", listening: "var(--sk-listening)", writing: "var(--sk-writing)", speaking: "var(--sk-speaking)" };
  var TYPE_ZH = {
    complete_words: "单词填空", daily_life: "生活阅读", academic: "学术文章",
    choose_response: "听句选回应", conversation: "对话", announcement: "通知", lecture: "学术讲座",
    sentence: "句子构建", email: "邮件写作", discussion: "学术讨论",
    repeat: "听力复述", interview: "模拟面试"
  };
  var TYPES = {
    reading: ["complete_words", "daily_life", "academic"],
    listening: ["choose_response", "conversation", "announcement", "lecture"],
    writing: ["sentence", "email", "discussion"],
    speaking: ["repeat", "interview"]
  };
  var KIND_ZH = { practice: "练习", full: "完整模考", single: "单项模考" };
  var ST_ZH = { draft: "草稿", pending: "待审", live: "已上架", unpublished: "已下架" };

  var me = null;
  var pool = [];
  var predictionSummary = null;
  var papers = [];
  var tab = "pool";
  var F = { skill: "", typ: "", set: "", src: "", q: "" };
  var reviewId = "";
  var reviewSeq = 0;
  var reviewData = null;
  var reviewBlobs = [];
  var reviewRequests = [];
  var pkgs = null;
  var stuList = null;
  var grantSel = { practice: true };
  var stuSel = {};
  var stuQ = "";
  var gwStart = "";
  var gwExp = "";
  var ledger = [];
  var recStudents = null;
  var recStudent = null;
  var recRows = [];
  var recQ = "";
  var recRange = "all";
  var recKind = "";
  var recSkill = "reading";
  var recType = "";
  var recOpenKey = "";
  var recHistId = 0;
  var recAudioUrl = "";
  var REC_SKILLS = ["reading", "listening", "speaking", "writing"];
  var isDemo = false;
  var toastTimer = 0;

  function token() {
    try { return localStorage.getItem(TK) || ""; } catch (e) { return ""; }
  }
  function api(path, opts) {
    opts = opts || {};
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Slug": "yysd",
        Authorization: token() ? "Bearer " + token() : ""
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      signal: opts.signal
    }).then(function (r) {
      return r.text().then(function (text) {
        var d = {};
        if (text) { try { d = JSON.parse(text); } catch (e) { throw new Error("服务器异常"); } }
        if (!r.ok) throw new Error((d && d.error) || "请求失败");
        return d;
      });
    });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function msg(t, ok) {
    var el = document.getElementById("msg");
    if (!el) return;
    el.textContent = t || "";
    el.className = "msg show" + (ok ? " ok" : "");
    clearTimeout(toastTimer);
    if (t) toastTimer = setTimeout(function () { el.classList.remove("show"); }, 3200);
  }
  function show(id) {
    if (id !== "app") clearReview();
    ["gate", "login", "app"].forEach(function (k) {
      document.getElementById(k).classList.toggle("hidden", k !== id);
    });
  }
  function blockOf(id) {
    for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    return null;
  }
  function bankSetParts(s) {
    var m = /^(R-CW|R-RDL|R-RAP|L-CR|L-LCN|L-ANO|L-AT|W-BS|W-WE|W-AD|S-LRP|S-INT)(\d+)(?:-Q(\d+))?$/i.exec(String(s || ""));

    return m ? [m[1].toUpperCase(), Number(m[2]), m[3] ? Number(m[3]) : 0] : null;
  }
  function isBankSet(s) {
    return !!bankSetParts(s);
  }
  function setLabel(s) {
    var m = /^prediction-(\d{4}-\d{2}-\d{2})$/.exec(String(s || ""));
    return m ? m[1] + " 预测包" : isBankSet(s) ? String(s) : "Set " + s;
  }
  function isPrediction(b) {
    return (b.sources || [b.source]).indexOf("prediction") >= 0 || /^prediction-/.test(String(b.set || ""));
  }
  function blockLine(b) {
    var set = b.set ? setLabel(b.set) : "";
    return (TYPE_ZH[b.type] || SKILL_ZH[b.skill] || "") +
      (set ? " · " + set : "") +
      (b.paperId && !isBankSet(b.set) && !isPrediction(b) ? " · " + b.paperId : "") +
      (b.n > 1 ? " · " + b.n + " 题" : "");
  }
  function dotStyle(b) {
    return " style=\"--sk:" + (SKILL_DOT[b.skill] || "var(--faint)") + "\"";
  }
  function ts(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 16).replace("T", " ");
    function p(n) { return n < 10 ? "0" + n : String(n); }
    return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* ——— 筛选与题池 ——— */
  function typeOptions() {
    var keys = F.skill && TYPES[F.skill]
      ? TYPES[F.skill]
      : ["complete_words", "daily_life", "academic", "choose_response", "conversation", "announcement", "lecture", "sentence", "email", "discussion", "repeat", "interview"];
    return '<option value="">全部题型</option>' + keys.map(function (k) {
      return '<option value="' + k + '"' + (F.typ === k ? " selected" : "") + ">" + TYPE_ZH[k] + "</option>";
    }).join("");
  }
  function blockMatches(b, skip) {
    skip = skip || {};
    if (!skip.skill && F.skill && b.skill !== F.skill) return false;
    if (!skip.typ && F.typ && !F.q && b.type !== F.typ) return false;
    if (!skip.set && F.set && String(b.set) !== String(F.set)) return false;
    if (!skip.src && F.src && (b.sources || [b.source]).indexOf(F.src) < 0) return false;
    if (!skip.q && F.q) {
      var blob = (b.hay || "") + " " + (b.title || "") + " " + (b.titleZh || "") + " " + (TYPE_ZH[b.type] || "") + " " + (b.paperId || "") + " " + (b.set || "");
      if (blob.toLowerCase().indexOf(F.q) < 0) return false;
    }
    return true;
  }
  function cmpSet(a, b) {
    var ra = bankSetParts(a);
    var rb = bankSetParts(b);
    if (ra && rb) {
      var fam = { "R-CW": 1, "R-RDL": 2, "R-RAP": 3, "L-CR": 4, "L-LCN": 5, "L-ANO": 6, "L-AT": 7, "W-BS": 8, "W-WE": 9, "W-AD": 10, "S-LRP": 11, "S-INT": 12 };

      var fa = fam[ra[0]] || 11;
      var fb = fam[rb[0]] || 11;
      return fa !== fb ? fa - fb : (ra[1] !== rb[1] ? ra[1] - rb[1] : (ra[2] || 0) - (rb[2] || 0));
    }
    if (ra) return 1;
    if (rb) return -1;
    var na = Number(a), nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a || "").localeCompare(String(b || ""));
  }
  function filtered() {
    return pool.filter(function (b) { return blockMatches(b, {}); }).sort(function (a, b) {
      var c = cmpSet(a.set, b.set);
      return c || String(a.title || "").localeCompare(String(b.title || ""));
    });
  }
  function setKeys() {
    var seen = {};
    pool.forEach(function (b) {
      if (!blockMatches(b, { set: 1, q: 1 })) return;
      if (b.set != null && b.set !== "") seen[String(b.set)] = 1;
    });
    return Object.keys(seen).sort(cmpSet);
  }
  function dropGoneSet() {
    if (F.set && setKeys().indexOf(String(F.set)) < 0) F.set = "";
  }
  function setOptions() {
    dropGoneSet();
    var keys = setKeys();
    return '<option value="">全部套号 / 日期</option>' + keys.map(function (k) {
      return '<option value="' + esc(k) + '"' + (String(F.set) === String(k) ? " selected" : "") + ">" + esc(setLabel(k)) + "</option>";
    }).join("");
  }
  function paintFilters() {
    var setOpts = setOptions();
    return '<input id="f-q" class="q" aria-label="搜索文章、题干、选项或解析" value="' + esc(F.q) + '" placeholder="搜文章 / 题干 / 选项 / 解析">' +
      '<select id="f-skill" aria-label="科目"><option value="">全部科目</option>' +
      SKILL_ORDER.map(function (s) {
        return '<option value="' + s + '"' + (F.skill === s ? " selected" : "") + ">" + SKILL_ZH[s] + "</option>";
      }).join("") + "</select>" +
      '<select id="f-type" aria-label="题型">' + typeOptions() + "</select>" +
      '<select id="f-set" aria-label="套号或日期">' + setOpts + "</select>" +
      '<select id="f-src" aria-label="来源"><option value="">全部来源</option>' +
      '<option value="set"' + (F.src === "set" ? " selected" : "") + ">官方套题</option>" +
      '<option value="date"' + (F.src === "date" ? " selected" : "") + ">模考卷</option>" +
      '<option value="bank"' + (F.src === "bank" ? " selected" : "") + ">题库</option>" +
      '<option value="prediction"' + (F.src === "prediction" ? " selected" : "") + ">预测包</option></select>";
  }
  function blockPreviewHref(b) {
    if (isPrediction(b)) return "";
    var local = w.location.hostname === "localhost" || w.location.hostname === "127.0.0.1";
    var app = local ? "/app/" : "https://app.youyisida.com/";
    var skill = b.skill || "reading";
    var q = "mode=practice&preview=1&from=app&task=" + encodeURIComponent(b.task) +
      "&end=" + encodeURIComponent(b.end == null ? b.task : b.end);
    if ((b.source === "bank" || b.source === "date") && b.paperId) {
      return app + "toefl-" + skill + ".html?id=" + encodeURIComponent(b.paperId) + "&" + q;
    }
    return app + "toefl-" + skill + ".html?set=" + encodeURIComponent(b.set || 1) + "&" + q;
  }
  function updatePoolList() {
    var el = document.getElementById("pool-list");
    if (!el) return;
    var list = filtered();
    document.getElementById("pool-count").textContent = "筛到 " + list.length + " 个题块";
    el.innerHTML = list.length
      ? list.map(function (b) {
        var href = blockPreviewHref(b);
        return '<article class="block' + (reviewId === b.id ? " is-on" : "") + '"' + dotStyle(b) + '>' +
          '<button type="button" class="block-review" data-inspect="' + esc(b.id) + '" aria-pressed="' + (reviewId === b.id) + '" aria-controls="review-body">' +
          '<b>' + esc(b.title || b.titleZh) + "</b>" +
          (b.titleZh && b.title && b.titleZh !== b.title ? '<span class="sub">' + esc(b.titleZh) + "</span>" : "") +
          '<span class="meta">' + esc(blockLine(b)) + '</span><span class="review-label">审阅</span></button>' +
          (href ? '<a class="block-pv" data-bpv="' + esc(b.id) + '" href="' + esc(href) + '" target="yysd-preview">外部预览</a>' : "") + '</article>';
      }).join("")
      : '<div class="empty"><b>没有符合条件的题块</b><p>换个筛选条件试试</p></div>';
  }

  /* 教师只读审阅：复用阅读显示，不接入学生计时、评分或录音。 */
  function clearReview() {
    reviewSeq += 1;
    reviewData = null;
    document.querySelectorAll("#review-body audio,#review-body video").forEach(function (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    });
    reviewRequests.forEach(function (c) { c.abort(); });
    reviewRequests = [];
    reviewBlobs.forEach(function (url) { URL.revokeObjectURL(url); });
    reviewBlobs = [];
  }
  function reviewCurrent(seq, host) {
    return seq === reviewSeq && tab === "pool" && host === document.getElementById("review-body");
  }
  function mediaPath(path) {
    if (typeof path !== "string") return "";
    if (/^\/api\/tiku\/prediction\/media\/[a-f0-9]{24}\.[a-z0-9]{1,8}$/.test(path)) return path;
    var decoded;
    try { decoded = decodeURIComponent(path); } catch (e) { return ""; }
    if (/[\\:%?#\x00-\x1f\x7f]/.test(decoded) || /\/\//.test(decoded) || /(^|\/)\.{1,2}(\/|$)/.test(decoded.replace(/^\.\//, ""))) return "";
    decoded = decoded.replace(/^\.\//, "").replace(/^\//, "");
    if (!/^library\/toefl\/.+/.test(decoded)) return "";
    var local = w.location.hostname === "localhost" || w.location.hostname === "127.0.0.1";
    return new URL(decoded, local ? new URL("/app/", w.location.href) : "https://app.youyisida.com/").href;
  }
  function reviewText(value) {
    if (value == null) return "";
    if (Array.isArray(value)) return value.map(reviewText).filter(Boolean).join("\n\n");
    if (typeof value === "object") return Object.keys(value).map(function (k) { return k + ": " + reviewText(value[k]); }).join("\n");
    return String(value);
  }
  function reviewNote(host, label, value) {
    var text = reviewText(value);
    if (!text) return;
    var box = document.createElement("div");
    box.className = "review-note";
    var heading = document.createElement("h4");
    heading.textContent = label;
    var content = document.createElement("div");
    content.className = "review-text";
    content.textContent = text;
    box.appendChild(heading);
    box.appendChild(content);
    host.appendChild(box);
  }
  function reviewDetails(host, label) {
    var details = document.createElement("details");
    details.className = "review-details";
    var summary = document.createElement("summary");
    summary.textContent = label;
    details.appendChild(summary);
    host.appendChild(details);
    return details;
  }
  function mediaKind(path, kind) {
    if (/\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(path)) return "audio";
    if (/\.(mp4|webm|mov|m4v)$/i.test(path)) return kind === "audio" ? "audio" : "video";
    if (/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(path)) return "image";
    return /^(audio|video|image)$/.test(kind) ? kind : "attachment";
  }
  function reviewMedia(host, item, seq, body) {
    if (!item || !item.path) return;
    var box = document.createElement("figure");
    box.className = "review-media";
    var caption = document.createElement("figcaption");
    caption.textContent = item.label || "媒体附件";
    var slot = document.createElement("div");
    box.appendChild(caption);
    box.appendChild(slot);
    host.appendChild(box);
    var metadata = reviewData && (reviewData.media || []).filter(function (m) { return m.path === item.path; })[0];
    if (item.available === false || (metadata && metadata.available === false)) {
      slot.textContent = "原站拒绝访问，未取得此资源；题目与文字资料仍可审阅。";
      slot.className = "review-error";
      return;
    }
    var path = mediaPath(item.path);
    if (!path) { slot.textContent = "不支持的媒体路径"; return; }
    var kind = mediaKind(item.path, item.kind);
    function mount(url) {
      if (!reviewCurrent(seq, body)) return;
      slot.innerHTML = "";
      var el = document.createElement(kind === "image" ? "img" : kind === "attachment" ? "a" : kind);
      if (kind === "attachment") {
        el.href = url;
        el.download = String(item.path).split("/").pop();
        el.className = "link-btn";
        el.textContent = "下载附件";
      } else {
        if (kind === "image") el.alt = caption.textContent;
        else { el.controls = true; el.preload = "none"; el.setAttribute("aria-label", caption.textContent); }
        el.src = url;
        el.addEventListener("error", function () { if (reviewCurrent(seq, body)) fail("媒体无法播放或显示，请重试"); });
      }
      slot.appendChild(el);
    }
    function fail(text) {
      slot.innerHTML = '<p class="review-error" role="status"></p><button type="button" class="sm">重试媒体</button>';
      slot.querySelector("p").textContent = text;
      slot.querySelector("button").onclick = load;
    }
    function load() {
      if (!reviewCurrent(seq, body)) return;
      slot.textContent = "加载媒体…";
      if (path.indexOf("/api/") !== 0) { mount(path); return; }
      var controller = new AbortController();
      reviewRequests.push(controller);
      fetch(API + path, {
        headers: { "X-Tenant-Slug": "yysd", Authorization: token() ? "Bearer " + token() : "" },
        cache: "no-store", signal: controller.signal, redirect: "error"
      }).then(function (r) {
        if (!r.ok) throw new Error("媒体加载失败（" + r.status + "），请重试");
        return r.blob();
      }).then(function (blob) {
        if (!reviewCurrent(seq, body)) return;
        // 附件只下载，不让原包 HTML 等文件在教师页执行。
        if (kind === "attachment") blob = new Blob([blob], { type: "application/octet-stream" });
        var url = URL.createObjectURL(blob);
        reviewBlobs.push(url);
        mount(url);
      }).catch(function (e) {
        if (reviewCurrent(seq, body) && e.name !== "AbortError") fail(e.message || "媒体加载失败，请重试");
      });
    }
    load();
  }
  var readingLoad = null;
  function ensureReading() {
    if (w.YYSD_TOEFL) return Promise.resolve(w.YYSD_TOEFL);
    if (readingLoad) return readingLoad;
    readingLoad = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://app.youyisida.com/assets/js/reading.js?v=20261016prediction1";
      script.onload = function () { script.remove(); if (w.YYSD_TOEFL) resolve(w.YYSD_TOEFL); else reject(new Error("阅读显示组件加载失败")); };
      script.onerror = function () { script.remove(); reject(new Error("阅读显示组件加载失败，请重试")); };
      document.head.appendChild(script);
    }).catch(function (e) { readingLoad = null; throw e; });
    return readingLoad;
  }
  function renderReview(data, body, seq, T) {
    var b = data.block || blockOf(reviewId) || {};
    body.innerHTML = '<div class="pane-title"><h3></h3><button type="button" class="sm" id="review-export">导出原包数据</button></div><p class="muted review-meta"></p>';
    body.querySelector("h3").textContent = b.titleZh || b.title || "题目内容";
    body.querySelector(".review-meta").textContent = blockLine(b) + " · 教师只读";
    body.querySelector("#review-export").disabled = !(data.sourceItems || []).length;
    var no = 0;
    (data.tasks || []).forEach(function (task, ti) {
      var section = document.createElement("article");
      section.className = "review-task";
      body.appendChild(section);
      reviewNote(section, "题块 " + (ti + 1), task.title || task.titleZh || TYPE_ZH[task.type]);
      reviewNote(section, "说明", task.instruction);
      var passage = document.createElement("div");
      passage.className = "review-passage";
      if (task.type === "complete_words") {
        var saved = {};
        (task.passage || []).forEach(function (p) { if (p.id) saved[p.id] = p.answer; });
        T.renderBlanksReview(task, passage, saved);
        section.appendChild(passage);
      } else if (task.paras || task.layout || task.image) {
        var insertion = (task.questions || []).filter(T.isInsertQ)[0];
        T.renderPassage(Object.assign({}, task, { image: "" }), passage, !!insertion);
        if (insertion) T.markInsertReview(passage, insertion, "", T.insertSentence(task, insertion));
        section.appendChild(passage);
      }
      reviewNote(section, "待插入句子", task.insertSentence);
      reviewMedia(section, { path: task.audio, label: "题目音频", kind: "audio" }, seq, body);
      reviewMedia(section, { path: task.image, label: "题目配图", kind: "image" }, seq, body);
      reviewNote(section, "听力原文", task.transcript);
      reviewNote(section, "情境", task.context);
      reviewNote(section, "题目", task.stem);
      reviewNote(section, "写作任务", task.prompt);
      reviewNote(section, "写作要点", task.bullets);
      reviewNote(section, "收件人", task.to);
      reviewNote(section, "主题", task.subject);
      reviewNote(section, "教授问题", task.professor);
      reviewNote(section, "讨论帖", task.posts);
      if (task.type === "sentence") {
        reviewNote(section, "句子结构", (task.parts || []).map(function (p) { return p.slot ? "____" : p.t || ""; }).join(" "));
        reviewNote(section, "词块", (task.bank || []).join(" / "));
        reviewNote(section, "正确顺序", (task.answer || []).join(" "));
      }
      reviewNote(section, task.type === "repeat" ? "应复述" : "参考范文 / 示例", task.sample);
      reviewNote(section, "其他范文", task.samples);
      reviewNote(section, "解析", task.analysis || task.explain);
      (task.questions || []).forEach(function (q, qi) {
        var question = document.createElement("section");
        question.className = "review-question";
        section.appendChild(question);
        reviewNote(question, "问题 " + (qi + 1), q.stem);
        var options = document.createElement("div");
        options.className = "review-options";
        // renderOptions 把 id 拼进属性；只传内部数值，绝不传原包 id。
        T.renderOptions(Object.assign({}, q, { id: ++no }), options, q.answer);
        options.querySelectorAll("input").forEach(function (input) {
          input.disabled = true;
          var correct = (Array.isArray(q.answer) ? q.answer : [q.answer]).indexOf(input.value) >= 0;
          input.checked = correct;
          if (correct) {
            input.parentNode.classList.add("is-key");
            var key = document.createElement("span");
            key.className = "review-key";
            key.textContent = "正确答案";
            input.parentNode.appendChild(key);
          }
        });
        question.appendChild(options);
        reviewNote(question, "正确答案", q.answer);
        reviewNote(question, "解析", q.analysis || q.explain);
        reviewNote(question, "听力原文", q.transcript);
        reviewMedia(question, { path: q.audio, label: "问题音频", kind: "audio" }, seq, body);
        reviewMedia(question, { path: q.image, label: "问题配图", kind: "image" }, seq, body);
      });
    });
    if (!(data.tasks || []).length) reviewNote(body, "内容提示", "暂无转换后的题目，请查看下方原包补充内容。");
    (data.sourceItems || []).forEach(function (item, i) {
      var extra = reviewDetails(body, "原包补充 " + (i + 1) + (item.labelZh ? " · " + item.labelZh : ""));
      [
        ["原文全文", "full"], ["补词与答案", "slots"], ["中文译文", "stimulusTextZh"],
        ["段落译文", "paragraphsZh"], ["标题译文", "labelZh"], ["题干译文", "stemZh"],
        ["听力译文", "transcriptZh"], ["写作任务", "prompt"], ["原包范文", "essay"],
        ["范文译文", "translation"], ["口语情境", "scenario"]
      ].forEach(function (field) { reviewNote(extra, field[0], item[field[1]]); });
      if ((item.questions || []).length) {
        var analyses = reviewDetails(extra, "全部问题译文与选项解析");
        item.questions.forEach(function (q, qi) {
          reviewNote(analyses, "问题 " + (qi + 1), q.stemZh || q.stem);
          reviewNote(analyses, "问题标签", q.labelZh);
          (q.choices || []).slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (choice, ci) {
            reviewNote(analyses, String.fromCharCode(65 + ci) + " 选项译文", choice.labelZh);
          });
          reviewNote(analyses, "全部选项解析", q.explanations || q.analysis || q.explain);
          reviewNote(analyses, "原包题目段落 / 插入位置", q.questionParagraphs);
        });
      }
      if ((item.transcriptSentences || []).length) {
        var transcript = reviewDetails(extra, "逐句听力原文与译文");
        item.transcriptSentences.forEach(function (sentence, si) {
          var timing = sentence.startTime != null ? "（" + sentence.startTime + " - " + (sentence.endTime == null ? "" : sentence.endTime) + "）" : "";
          reviewNote(transcript, "句 " + (si + 1) + timing, sentence.text);
          reviewNote(transcript, "译文", sentence.translationZh);
        });
      }
      (item.qs || []).forEach(function (q, qi) {
        reviewNote(extra, "口语问题 / 应复述 " + (qi + 1), q.sentence);
        reviewNote(extra, "口语示范答案 " + (qi + 1), q.modelAnswerText);
      });
    });
    var media = data.media || [];
    if (media.length) {
      var group = reviewDetails(body, "原包全部媒体与附件（" + media.length + "）");
      group.open = true;
      media.forEach(function (item) { reviewMedia(group, item, seq, body); });
    }
  }
  function loadReview(id, focus) {
    clearReview();
    reviewId = id;
    var seq = reviewSeq;
    var body = document.getElementById("review-body");
    if (!body) return;
    updatePoolList();
    body.innerHTML = '<p role="status">加载题目内容…</p><div class="skel skel-row"></div><div class="skel skel-row"></div>';
    if (focus) body.focus();
    if (w.YYSD_TIKU_GATE && w.YYSD_TIKU_GATE.local && /(?:\?|&)demo=1(?:&|$)/.test(w.location.search || "")) {
      body.textContent = "这里只演示布局；真实题目与预测包需通过教师认证后审阅。";
      return;
    }
    var controller = new AbortController();
    reviewRequests.push(controller);
    Promise.all([api("/api/tiku/blocks/" + encodeURIComponent(id), { signal: controller.signal }), ensureReading()]).then(function (xs) {
      if (!reviewCurrent(seq, body)) return;
      var data = xs[0];
      if (!data.ok) throw new Error("题目加载失败");
      reviewData = data;
      renderReview(data, body, seq, xs[1]);
    }).catch(function (e) {
      if (!reviewCurrent(seq, body)) return;
      clearReview();
      body.innerHTML = '<p class="review-error" role="status"></p><button type="button" class="btn" id="review-retry">重试审阅</button>';
      body.querySelector("p").textContent = e.message || "题目加载失败，请重试";
    });
  }
  function exportReview() {
    if (!reviewData || !(reviewData.sourceItems || []).length) return;
    var url = URL.createObjectURL(new Blob([JSON.stringify(reviewData.sourceItems, null, 2)], { type: "application/json" }));
    reviewBlobs.push(url);
    var link = document.createElement("a");
    link.href = url;
    link.download = "prediction-" + reviewId.replace(/[^a-z0-9_-]/gi, "_") + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  function paintPool() {
    var summary = predictionSummary ? "预测包：" + predictionSummary.groups + " 组 / " + predictionSummary.questions + " 子题；" +
      (predictionSummary.media - predictionSummary.unavailableMedia) + "/" + predictionSummary.media + " 个媒体已取得。" +
      (predictionSummary.unavailableMedia ? predictionSummary.unavailableMedia + " 个资源原站拒绝访问，已标注缺失。" : "") : "";
    document.getElementById("main").innerHTML =
      '<div class="bench review-bench"><section class="card pool-pane">' +
        '<div class="pane-title"><h2>题目审阅</h2><span class="n" id="pool-count" role="status"></span></div>' +
        '<div class="filters">' + paintFilters() + '</div><p class="pool-meta">点击「审阅」查看正文、答案与解析；预测包仅教师可见。' + esc(summary) + '</p>' +
        '<div class="pool" id="pool-list"></div></section>' +
        '<section class="card review-pane" aria-labelledby="review-heading"><div class="pane-title"><h2 id="review-heading">只读内容</h2></div>' +
        '<div id="review-body" tabindex="-1"><div class="empty"><b>选择一个题块审阅</b><p>不会作答、计时、评分或录音。</p></div></div></section></div>';
    updatePoolList();
    if (reviewId && blockOf(reviewId)) loadReview(reviewId, false);
  }

  /* ——— 我的卷 ——— */
  function totalMins(p) {
    var m = p.skillMinutes || {};
    return SKILL_ORDER.reduce(function (a, s) { return a + (Number(m[s]) || 0); }, 0);
  }
  function paintList(rows, review) {
    var main = document.getElementById("main");
    var list = (rows || []).slice();
    if (review) list = list.filter(function (p) { return p.status === "pending"; });
    if (!list.length) {
      main.innerHTML = '<div class="empty"><b>' +
        (review ? "没有待审的卷" : "还没有已有试卷") + "</b><p>" +
        (review ? "当前没有需要审核的试卷。" : "已有试卷会保留在这里；本轮不新增人工组卷。") +
        '</p><button type="button" class="btn" data-tab="pool">去审阅题目</button></div>';
      return;
    }
    main.innerHTML = '<div class="paper-list">' + list.map(function (p) {
      var acts = [];
      if (review) {
        acts.push('<button type="button" class="sm" data-ok="' + esc(p.id) + '">通过</button>');
        acts.push('<button type="button" class="sm danger" data-no="' + esc(p.id) + '">退回</button>');
      } else {
        if (p.status === "draft" || p.status === "pending") acts.push('<button type="button" class="sm primary" data-sub="' + esc(p.id) + '">上架</button>');
        if (p.status === "live" || (p.status === "pending" && p.live)) acts.push('<button type="button" class="sm danger" data-off="' + esc(p.id) + '">下架</button>');
      }
      acts.push('<button type="button" class="sm" data-pv="' + esc(p.id) + '">预览</button>');
      var blocks = p.blocks || [];
      return '<article class="card paper-row">' +
        '<div class="r1"><span class="pt">' + esc(p.title) + '</span>' +
          '<span class="pill kind">' + esc(KIND_ZH[p.kind] || p.kind) + '</span>' +
          '<span class="pill ' + esc(p.status) + '">' + esc(ST_ZH[p.status] || p.status) + "</span></div>" +
        '<div class="r2"><span>' + blocks.length + ' 个题块</span><span class="sep">·</span>' +
          '<span>' + (totalMins(p) ? "时长合计 " + totalMins(p) + " 分钟" : "不限时") + '</span><span class="sep">·</span>' +
          "<span>更新于 " + esc(ts(p.updatedAt)) + "</span>" +
          (p.owner === "hq" ? '<span class="sep">·</span><span>总部</span>' : "") +
          (p.makerName && p.owner !== "hq" && me && me.isAdmin ? '<span class="sep">·</span><span>' + esc(p.makerName) + " " + esc(p.makerPhone || "") + "</span>" : "") +
          (p.rejectNote ? '<span class="sep">·</span><span style="color:var(--accent)">退回：' + esc(p.rejectNote) + "</span>" : "") + "</div>" +
        (blocks.length ? '<div class="r2">' + blocks.slice(0, 6).map(function (b) { return esc(b.titleZh || b.title); }).join("、") + (blocks.length > 6 ? " …" : "") + "</div>" : "") +
        '<div class="acts">' + acts.join("") + "</div></article>";
    }).join("") + "</div>";
  }

  /* ——— 开通（管理员）：学生多选 × 对象多选（练习区 + 考前冲刺包）批量 ——— */
  function grantStateText(st) {
    if (!st) return "";
    if (st.on && st.grace) return "宽限中";
    if (st.on) return st.expireAt ? "已开通 · 至 " + ts(st.expireAt) : "已开通";
    if (st.reason === "scheduled") return "定时 " + ts(st.startAt);
    if (st.reason === "expired") return "已到期";
    if (st.reason === "off") return "已停用";
    return "";
  }
  function checkedScopes() {
    return Object.keys(grantSel).filter(function (k) { return grantSel[k]; });
  }
  function scopeTitle(scope) {
    if (scope === "practice") return "真题题库";
    var id = scope.slice("package:".length);
    var p = (pkgs || []).filter(function (x) { return x.id === id; })[0];
    return p ? p.title : id;
  }
  function stuFiltered() {
    var q = stuQ.toLowerCase();
    return (stuList || []).filter(function (s) {
      return !q || ((s.displayName || "") + " " + s.phone).toLowerCase().indexOf(q) >= 0;
    });
  }
  function paintGrant() {
    var main = document.getElementById("main");
    if (!pkgs) {
      main.innerHTML = '<div class="card pool-pane"><div class="skel skel-row"></div><div class="skel skel-row"></div><div class="skel skel-row"></div></div>';
      return;
    }
    var m = checkedScopes().length;
    var byUser = {};
    ledger.forEach(function (r) {
      var u = byUser[r.userId] || (byUser[r.userId] = { name: r.name, phone: r.phone, items: [] });
      u.items.push(r);
    });
    var students = stuFiltered();
    main.innerHTML =
      '<div class="bench">' +
        '<section class="card pool-pane">' +
          '<div class="pane-title"><h2>学生</h2><span class="n">共 ' + (stuList || []).length + " 人 · 已选对象 " + m + ' 个</span></div>' +
          '<div class="filters">' +
            '<input id="g-q" class="q" value="' + esc(stuQ) + '" placeholder="搜姓名 / 手机号">' +
            '<button type="button" class="sm" id="g-all">全选当前</button>' +
            '<button type="button" class="sm" id="g-none">清空</button>' +
          "</div>" +
          (students.length
            ? '<div class="g-list">' + students.map(function (s) {
              var items = (byUser[s.id] || { items: [] }).items;
              var n = items.filter(function (it) { return it.state && it.state.on; }).length;
              return '<label class="g-row">' +
                '<input type="checkbox" data-gsel="' + esc(s.id) + '"' + (stuSel[s.id] ? " checked" : "") + ">" +
                '<span class="g-who">' + esc(s.displayName || "（未命名）") + "<i>" + esc(s.phone) + "</i></span>" +
                (m ? '<span class="pill ' + (n === m ? "live" : "unpublished") + '">已开 ' + n + "/" + m + "</span>" : "") +
              "</label>";
            }).join("") + "</div>"
            : '<div class="empty"><b>没有符合的学生</b></div>') +
        "</section>" +
        '<section class="card sheet">' +
          '<div class="pane-title"><h2>开通对象</h2><span class="n">勾几个，一次就开通几个</span></div>' +
          '<div class="g-list scope-list">' +
            '<label class="g-row">' +
              '<input type="checkbox" data-gscope="practice"' + (grantSel.practice ? " checked" : "") + ">" +
              '<span class="g-who">真题题库<i>整个练习区</i></span>' +
            "</label>" +
            pkgs.map(function (p) {
              var sc = "package:" + p.id;
              return '<label class="g-row">' +
                '<input type="checkbox" data-gscope="' + esc(sc) + '"' + (grantSel[sc] ? " checked" : "") + ">" +
                '<span class="g-who">' + esc(p.title) + "<i>" + (p.kind === "single" ? "单科包" : "整套包") + "</i></span>" +
              "</label>";
            }).join("") +
          "</div>" +
          '<div class="minis" style="margin-top:.8rem">' +
            '<label class="f"><span>开始（可空 = 立即）</span><input type="datetime-local" id="g-start" value="' + esc(gwStart) + '"></label>' +
            '<label class="f"><span>到期（可空 = 不过期）</span><input type="datetime-local" id="g-exp" value="' + esc(gwExp) + '"></label>' +
          "</div>" +
          '<div class="actions" style="margin-top:.6rem">' +
            '<button type="button" class="btn primary" id="g-on">开通 / 更新选中</button>' +
            '<button type="button" class="btn danger" id="g-off">停用选中</button>' +
          "</div>" +
          '<p class="hint">批量规则：每位勾选的学生 × 每个勾选的对象，一次全部生效（共用上面的开始/到期时间）。模考关停或到期时，已开考的学生 24 小时内可考完本场；练习区停用后立即拦截。</p>' +
          '<div class="ledger">' +
            '<div class="picked-head"><span>授权台账（所选对象）</span><span>' + ledger.length + " 条</span></div>" +
            (Object.keys(byUser).length
              ? Object.keys(byUser).map(function (uid) {
                var u = byUser[uid];
                return '<div class="row2"><span class="who2">' + esc(u.name || u.phone || ("#" + uid)) +
                  (u.name && u.phone ? ' <span class="muted">' + esc(u.phone) + "</span>" : "") + "</span>" +
                  '<span class="lg-chips">' + u.items.map(function (it) {
                    var on = it.state && it.state.on;
                    return '<span class="lg-item"><span class="pill ' + (on ? "live" : "unpublished") + '">' +
                      esc(scopeTitle(it.scope)) + " · " + esc(grantStateText(it.state)) + "</span>" +
                      (on ? '<button type="button" class="sm danger" data-grev="' + esc(it.userId) + "|" + esc(it.scope) + '">收回</button>' : "") +
                      "</span>";
                  }).join("") + "</span></div>";
              }).join("")
              : '<p class="muted" style="margin:.4rem 0 0">所选对象还没给任何人开过。</p>') +
          "</div>" +
        "</section></div>";
  }

  function refreshLedger() {
    var scopes = checkedScopes();
    if (!scopes.length) { ledger = []; paint(); return Promise.resolve(); }
    return api("/api/admin/grants?scopes=" + encodeURIComponent(scopes.join(",")))
      .then(function (d) { ledger = d.grants || []; paint(); })
      .catch(function (e) { msg(e.message); ledger = []; paint(); });
  }
  function ensureGrant() {
    // 每次进开通都重拉包列表，刚上架的完整/单项模考才会出现
    var jobs = [api("/api/toefl/packages").then(function (d) { pkgs = d.packages || []; })];
    if (!stuList) jobs.push(api("/api/admin/students").then(function (d) { stuList = d.students || []; }));
    return Promise.all(jobs).then(function () {
      return refreshLedger();
    }).catch(function (e) { msg(e.message); });
  }
  function submitGrants(action, ids, onlyScope) {
    var scopes = onlyScope ? [onlyScope] : checkedScopes();
    if (!scopes.length) { msg("先勾选右边的开通对象"); return; }
    var body = { scopes: scopes, studentIds: ids, action: action };
    if (action !== "off") {
      body.startAt = gwStart ? new Date(gwStart).toISOString() : "";
      body.expireAt = gwExp ? new Date(gwExp).toISOString() : "";
    }
    api("/api/admin/grants", { method: "POST", body: body }).then(function (d) {
      msg((action === "on" ? "已开通 " : "已停用 ") + (d.count || ids.length * scopes.length) + " 个组合", true);
      return refreshLedger();
    }).catch(function (e) { msg(e.message); });
  }

  /* 已有试卷预览与上下架保留。 */
  function previewHref(paper) {
    var id = paper && paper.id;
    if (!id) return "";
    var host = (w.location.hostname === "localhost" || w.location.hostname === "127.0.0.1")
      ? "/app/bank.html"
      : "https://app.youyisida.com/bank.html";
    return host + "?id=" + encodeURIComponent(id) + "&preview=1";
  }
  function openPreview(url) {
    if (!url) return;
    var prev = w.open(url, "yysd-preview");
    if (prev) try { prev.focus(); } catch (e) {}
  }

  function recFmt(iso) {
    if (!iso) return "还没练过";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso).slice(0, 16);
      var m = d.getMonth() + 1;
      var day = d.getDate();
      var hh = d.getHours();
      var mm = d.getMinutes();
      return (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day + " " +
        (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
    } catch (e) { return String(iso).slice(0, 16); }
  }
  function recMeta(s) {
    var last = s.lastAt ? recFmt(s.lastAt) : "还没练过";
    return last + " · 已练 " + (s.practiceCount || 0) + " 题 · 模考 " + (s.mockCount || 0) + " 场";
  }
  function recFilterRange(rows, range) {
    if (!range || range === "all") return rows || [];
    var days = range === "7" ? 7 : 30;
    var cut = new Date(Date.now() - days * 86400000).toISOString();
    return (rows || []).filter(function (r) { return String(r.submittedAt || "") >= cut; });
  }
  function recLatestMap(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      var k = r.itemKey;
      if (!map[k]) map[k] = [];
      map[k].push(r);
    });
    Object.keys(map).forEach(function (k) {
      map[k].sort(function (a, b) {
        return String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")) || ((b.id || 0) - (a.id || 0));
      });
    });
    return map;
  }
  function recMockSessions(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      var k = String(r.packageId || "") + "|" + String(r.sid || "");
      if (!map[k]) map[k] = { key: k, packageId: r.packageId, sid: r.sid, title: r.title || r.packageId, submittedAt: r.submittedAt, sections: {} };
      if (!map[k].sections[r.skill]) map[k].sections[r.skill] = [];
      map[k].sections[r.skill].push(r);
      if (r.submittedAt > map[k].submittedAt) {
        map[k].submittedAt = r.submittedAt;
        if (r.title) map[k].title = r.title;
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
      return String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""));
    });
  }
  function recScoreText(r) {
    if (!r) return "—";
    if (r.skill === "speaking") return r.recorded || r.hasAudio ? "已录音" : "未录";
    if (r.score != null && r.total != null) return r.score + " / " + r.total;
    if (r.ok || r.wrong) return (r.ok || 0) + " 对 / " + ((r.ok || 0) + (r.wrong || 0));
    return "已交卷";
  }
  function recRevokeAudio() {
    if (recAudioUrl) {
      try { URL.revokeObjectURL(recAudioUrl); } catch (e) {}
      recAudioUrl = "";
    }
  }
  function recFindOpen(rows) {
    var list = rows || [];
    if (recHistId) {
      for (var i = 0; i < list.length; i++) if (Number(list[i].id) === Number(recHistId)) return list[i];
    }
    return list[0] || null;
  }
  function recPaintSheet(hist) {
    var host = document.getElementById("rec-sheet");
    if (!host) return;
    recRevokeAudio();
    var open = recFindOpen(hist);
    if (!open) {
      host.innerHTML = '<div class="pane-title"><h2>作答</h2></div><div class="empty"><b>选择一条记录</b><p>先看对错，点开再看作答。</p></div>';
      return;
    }
    var older = (hist || []).map(function (r) {
      return '<option value="' + r.id + '"' + (Number(r.id) === Number(open.id) ? " selected" : "") + ">" +
        esc(recFmt(r.submittedAt)) + (r === hist[0] ? " · 最近" : "") + "</option>";
    }).join("");
    var items = open.items || [];
    var itemHtml = items.length ? items.map(function (it) {
      var mark = it.ok === true ? "对" : it.ok === false ? "错" : "—";
      return '<li><b>第 ' + esc(String(it.no == null ? "" : it.no)) + " 题 · " + mark + "</b>" +
        (it.stem ? "<p class=\"rec-stem\">" + esc(it.stem) + "</p>" : "") +
        "<p>学生作答：" + esc(it.ua || "未作答") + "</p>" +
        (it.expect ? "<p>正确答案：" + esc(it.expect) + "</p>" : "") +
        (it.words != null ? "<p class=\"muted\">" + esc(String(it.words)) + " 词</p>" : "") +
        "</li>";
    }).join("") : "<p class=\"teacher-empty-row\">没有小题明细</p>";
    var img = open.image ? mediaPath(open.image) : "";
    host.innerHTML =
      '<div class="pane-title"><h2>' + esc(open.title || "作答") + "</h2><span class=\"n\">" + esc(recScoreText(open)) + "</span></div>" +
      (hist.length > 1 ? '<label class="rec-hist">历史<select id="rec-hist" aria-label="历史次数">' + older + "</select></label>" : "") +
      '<p class="rec-when">' + esc(recFmt(open.submittedAt)) + " · " + esc(SKILL_ZH[open.skill] || open.skill) +
        (open.taskType ? " · " + esc(TYPE_ZH[open.taskType] || open.taskType) : "") + "</p>" +
      (open.stem ? '<p class="rec-stem">' + esc(open.stem) + "</p>" : "") +
      (img ? '<p class="rec-fig"><img src="' + esc(img) + '" alt=""></p>' : "") +
      (open.skill === "speaking"
        ? '<audio data-rec-audio controls hidden></audio><p class="muted" data-rec-audio-miss hidden>已录，音频未传到云。</p>' +
          (open.hasAudio || open.recorded ? "" : "<p class=\"muted\">这题没有录音。</p>")
        : "") +
      "<ul class=\"rec-items\">" + itemHtml + "</ul>";
    if (open.skill === "speaking" && open.hasAudio && open.id && !isDemo) recLoadAudio(open.id, host);
  }
  function recLoadAudio(id, host) {
    fetch(API + "/api/tiku/records/" + id + "/audio", {
      headers: { Authorization: token() ? "Bearer " + token() : "", "X-Tenant-Slug": "yysd" },
      cache: "no-store"
    }).then(function (r) {
      if (!r.ok) throw new Error("没有录音");
      return r.blob();
    }).then(function (blob) {
      recAudioUrl = URL.createObjectURL(blob);
      var a = host.querySelector("[data-rec-audio]");
      if (a) { a.src = recAudioUrl; a.hidden = false; }
    }).catch(function () {
      var miss = host.querySelector("[data-rec-audio-miss]");
      if (miss) miss.hidden = false;
    });
  }
  function recPracticeRows(rows) {
    var map = recLatestMap(rows.filter(function (r) { return r.kind === "practice"; }));
    var wantType = recType && recType !== "all" ? recType : "";
    var keys = Object.keys(map).filter(function (k) {
      var r = map[k][0];
      if (r.skill !== recSkill) return false;
      if (!wantType) return true;
      return r.taskType === wantType || !r.taskType;
    });
    keys.sort(function (a, b) {
      return String(map[b][0].submittedAt || "").localeCompare(String(map[a][0].submittedAt || ""));
    });
    return keys.map(function (k) { return { key: k, hist: map[k] }; });
  }
  function paintRecRoster() {
    var list = (recStudents || []).slice().sort(function (a, b) {
      var ta = a.lastAt || "";
      var tb = b.lastAt || "";
      if (ta !== tb) return tb.localeCompare(ta);
      return String(a.displayName || a.phone || "").localeCompare(String(b.displayName || b.phone || ""), "zh");
    });
    var q = recQ.toLowerCase();
    var rows = list.map(function (s) {
      return '<button type="button" class="g-row rec-stu" data-rec-stu="' + s.id + '">' +
        '<span class="g-who">' + esc(s.displayName || "未命名") +
          (s.phone ? "<i>" + esc(s.phone) + "</i>" : "") + "</span>" +
        '<span class="rec-meta">' + esc(recMeta(s)) + "</span></button>";
    }).join("");
    document.getElementById("main").innerHTML =
      '<div class="records-page"><section class="card pool-pane">' +
        '<div class="pane-title"><h2>学生做题记录</h2><span class="n">共 ' + list.length + " 人</span></div>" +
        '<div class="filters"><input class="q" id="rec-q" type="search" placeholder="搜索姓名或手机号" value="' + esc(recQ) + '"></div>' +
        '<p class="pool-meta">点进一个人看真题题库和考前冲刺包。没练过的也会出现。</p>' +
        '<div class="g-list rec-list" id="rec-list">' +
          (rows || '<div class="empty"><b>名下还没有学生</b></div>') +
        "</div></section></div>";
    if (q) filterRecRows();
  }
  function filterRecRows() {
    var q = recQ.toLowerCase();
    document.querySelectorAll("#rec-list .rec-stu").forEach(function (row) {
      var hit = !q || (row.textContent || "").toLowerCase().indexOf(q) >= 0;
      row.classList.toggle("hidden", !hit);
    });
  }
  function paintRecStudent() {
    var s = recStudent || {};
    var rows = recFilterRange(recRows, recRange);
    var kind = recKind || "practice";
    var skillBtns = REC_SKILLS.map(function (sk) {
      return '<button type="button" class="' + (recSkill === sk ? "is-on" : "") + '" data-rec-skill="' + sk + '">' +
        esc(SKILL_ZH[sk]) + "</button>";
    }).join("");
    var types = TYPES[recSkill] || [];
    if (!recType) recType = "all";
    var typeBtns = ['<button type="button" class="' + (recType === "all" ? "is-on" : "") + '" data-rec-type="all">全部</button>']
      .concat(types.map(function (tp) {
        return '<button type="button" class="' + (recType === tp ? "is-on" : "") + '" data-rec-type="' + tp + '">' +
          esc(TYPE_ZH[tp] || tp) + "</button>";
      })).join("");
    var listHtml;
    var openHist = [];
    if (kind === "mock") {
      var sessions = recMockSessions(rows.filter(function (r) { return r.kind === "mock"; }));
      if (!sessions.length) {
        listHtml = '<div class="empty"><b>这段时间没有模考</b><p>交卷后马上出现。</p></div>';
      } else {
        listHtml = sessions.map(function (sess) {
          var secs = REC_SKILLS.map(function (sk) {
            var pack = sess.sections[sk] || [];
            var top = pack[0];
            var on = recOpenKey === (sess.key + "|" + sk);
            if (on) openHist = pack;
            return '<button type="button" class="rec-sec' + (on ? " is-on" : "") + '" data-rec-open="' +
              esc(sess.key + "|" + sk) + '"' + (top ? "" : " disabled") + ">" +
              esc(SKILL_ZH[sk]) + "<small>" + esc(top ? recScoreText(top) : "未考") + "</small></button>";
          }).join("");
          return '<article class="rec-sess"><header><b>' + esc(sess.title || sess.packageId) +
            "</b><span>" + esc(recFmt(sess.submittedAt)) + "</span></header><div class=\"rec-secs\">" + secs + "</div></article>";
        }).join("");
      }
    } else {
      var items = recPracticeRows(rows);
      if (!items.length) {
        listHtml = '<div class="empty"><b>这科这题型还没有记录</b><p>换一科或放宽时间再看。</p></div>';
      } else {
        listHtml = items.map(function (it) {
          var r = it.hist[0];
          var on = recOpenKey === it.key;
          if (on) openHist = it.hist;
          return '<button type="button" class="g-row rec-item' + (on ? " is-on" : "") + '" data-rec-open="' + esc(it.key) + '">' +
            "<span class=\"g-who\">" + esc(r.title || r.paperId) +
              (it.hist.length > 1 ? "<i>" + it.hist.length + " 次</i>" : "") + "</span>" +
            '<span class="rec-meta">' + esc(recScoreText(r)) + " · " + esc(recFmt(r.submittedAt)) + "</span></button>";
        }).join("");
      }
    }
    document.getElementById("main").innerHTML =
      '<div class="records-page">' +
        '<div class="pane-title"><button type="button" class="link-btn" data-rec-back="1">返回名单</button>' +
          "<h2>" + esc(s.displayName || "学生") + "</h2><span class=\"n\">" + esc(recMeta(s)) + "</span></div>" +
        '<div class="filters"><label class="rec-range">时间 <select id="rec-range" aria-label="时间范围">' +
          '<option value="all"' + (recRange === "all" ? " selected" : "") + ">全部</option>" +
          '<option value="7"' + (recRange === "7" ? " selected" : "") + ">近 7 天</option>" +
          '<option value="30"' + (recRange === "30" ? " selected" : "") + ">近 30 天</option>" +
        "</select></label></div>" +
        '<div class="tabs grant-boards" role="tablist">' +
          '<button type="button" class="' + (kind === "practice" ? "is-on" : "") + '" data-rec-kind="practice">真题题库</button>' +
          '<button type="button" class="' + (kind === "mock" ? "is-on" : "") + '" data-rec-kind="mock">考前冲刺包</button>' +
        "</div>" +
        '<div class="bench rec-bench"><section class="card pool-pane">' +
          (kind === "practice" ? '<div class="rec-chips" role="tablist" aria-label="科目">' + skillBtns + "</div>" +
            '<div class="rec-chips rec-types" role="tablist" aria-label="题型">' + typeBtns + "</div>" : "") +
          '<div class="g-list rec-list">' + listHtml + "</div></section>" +
          '<section class="card sheet" id="rec-sheet"></section></div></div>';
    if (!recOpenKey && kind === "practice") {
      var first = recPracticeRows(rows)[0];
      if (first) recOpenKey = first.key;
      openHist = first ? first.hist : [];
    }
    recPaintSheet(openHist);
  }
  function paintRecords() {
    if (!recStudent) paintRecRoster();
    else paintRecStudent();
  }
  function loadRecRoster() {
    if (isDemo) {
      recStudents = recStudents || [
        { id: 1, displayName: "李四", phone: "138****0001", lastAt: "2026-10-26T08:12:00.000Z", practiceCount: 2, mockCount: 1 },
        { id: 2, displayName: "王五", phone: "138****0002", lastAt: "", practiceCount: 0, mockCount: 0 }
      ];
      return Promise.resolve();
    }
    return api("/api/tiku/records/students").then(function (d) {
      recStudents = d.students || [];
    });
  }
  function demoRecRows() {
    return [
      { id: 11, kind: "practice", itemKey: "practice|reading|set-1|0", skill: "reading", paperId: "set-1", taskType: "complete_words", taskIndex: 0, sid: "s2", title: "Set 1 · 单词填空", stem: "The archaeopteryx ___", submittedAt: "2026-10-26T08:12:00.000Z", score: 8, total: 10, ok: 8, wrong: 2, items: [{ no: 1, ok: true, ua: "flew", expect: "flew", stem: "The bird ___" }, { no: 2, ok: false, ua: "swim", expect: "swam", stem: "It ___ across" }] },
      { id: 10, kind: "practice", itemKey: "practice|reading|set-1|0", skill: "reading", paperId: "set-1", taskType: "complete_words", taskIndex: 0, sid: "s1", title: "Set 1 · 单词填空", stem: "The archaeopteryx ___", submittedAt: "2026-10-20T08:00:00.000Z", score: 6, total: 10, ok: 6, wrong: 4, items: [{ no: 1, ok: false, ua: "fly", expect: "flew", stem: "The bird ___" }] },
      { id: 12, kind: "practice", itemKey: "practice|speaking|set-1|0", skill: "speaking", paperId: "set-1", taskType: "repeat", taskIndex: 0, sid: "s3", title: "Set 1 · 听力复述", stem: "Listen and repeat.", submittedAt: "2026-10-25T09:00:00.000Z", recorded: true, hasAudio: false, items: [{ no: 1, ok: true, ua: "recorded", expect: "recorded" }] },
      { id: 13, kind: "practice", itemKey: "practice|writing|bank-we|0", skill: "writing", paperId: "bank-we", taskType: "email", taskIndex: 0, sid: "s4", title: "给教授写邮件", stem: "Write an email to your professor.", submittedAt: "2026-10-24T10:00:00.000Z", items: [{ no: 1, ok: null, ua: "Dear Professor, I would like to ask for an extension.", expect: "", words: 11 }] },
      { id: 21, kind: "mock", itemKey: "mock|2025-07-16|reading|0", skill: "reading", packageId: "2025-07-16", paperId: "2025-07-16", taskType: "academic", taskIndex: 0, sid: "m1", title: "2025-07-16", stem: "Academic passage", submittedAt: "2026-10-26T07:00:00.000Z", score: 18, total: 20, items: [{ no: 1, ok: true, ua: "B", expect: "B", stem: "The author mentions X in order to" }] },
      { id: 22, kind: "mock", itemKey: "mock|2025-07-16|listening|0", skill: "listening", packageId: "2025-07-16", paperId: "2025-07-16", taskType: "lecture", taskIndex: 0, sid: "m1", title: "2025-07-16", submittedAt: "2026-10-26T07:40:00.000Z", score: 15, total: 20, items: [{ no: 1, ok: false, ua: "A", expect: "C", stem: "Why does the professor mention glaciers?" }] }
    ];
  }
  function loadRecStudent(id) {
    if (isDemo) {
      recStudent = (recStudents || []).filter(function (s) { return Number(s.id) === Number(id); })[0] || { id: id, displayName: "学生" };
      recRows = Number(id) === 1 ? demoRecRows() : [];
      if (!recKind) recKind = recRows.length ? (recRows[0].kind === "mock" && recRows[0].submittedAt >= (recRows[1] && recRows[1].submittedAt || "") ? "practice" : "practice") : "practice";
      if (!recKind) recKind = "practice";
      var latest = recRows[0];
      recRows.forEach(function (r) { if (!latest || r.submittedAt > latest.submittedAt) latest = r; });
      if (latest) recKind = latest.kind;
      return Promise.resolve();
    }
    var q = recRange && recRange !== "all" ? "?range=" + encodeURIComponent(recRange) : "";
    return api("/api/tiku/records/students/" + id + q).then(function (d) {
      recStudent = d.student || { id: id };
      recRows = d.records || [];
      if (!recKind) recKind = d.defaultKind || "practice";
    });
  }
  function ensureRecords() {
    if (recStudent) return loadRecStudent(recStudent.id).then(paintRecords);
    return loadRecRoster().then(paintRecords);
  }

  function paintTabs() {
    var tabs = [["pool", "题目审阅"], ["mine", "已有试卷"], ["records", "学生做题记录"]];
    if (me && me.canGrant) tabs.push(["grant", "开通"]);
    if (me && me.isAdmin) tabs.push(["review", "审核"]);
    document.getElementById("tabs").innerHTML = tabs.map(function (t) {
      return '<button type="button" class="' + (tab === t[0] ? "is-on" : "") + '" data-tab="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + '<button type="button" class="tab-refresh" data-refresh="1">刷新</button>';
  }
  function paint() {
    clearReview();
    paintTabs();
    var who = document.getElementById("who");
    if (who) who.textContent = (me.name || me.phone || "") + (me.isAdmin ? " · 总部" : me.canGrant ? " · 管理员" : "");
    if (tab === "pool") paintPool();
    else if (tab === "grant") paintGrant();
    else if (tab === "records") paintRecords();
    else if (tab === "review") paintList(papers, true);
    else paintList(papers, false);
  }
  function reload() {
    if (tab === "records") {
      paintTabs();
      return ensureRecords();
    }
    return Promise.all([api("/api/tiku/pool"), api("/api/tiku/papers")]).then(function (xs) {
      pool = xs[0].blocks || [];
      predictionSummary = xs[0].prediction;
      papers = xs[1].papers || [];
      if (tab === "grant") return ensureGrant();
      paint();
    });
  }
  function refreshNow() {
    clearReview();
    var btns = document.querySelectorAll("#refresh,[data-refresh]");
    btns.forEach(function (b) { b.disabled = true; });
    return reload().then(function () {
      msg(tab === "records" ? "已刷新做题记录" : ("已刷新 · " + pool.length + " 个题块"), true);
    }).catch(function (e) {
      msg(e.message || "刷新失败");
    }).then(function () {
      btns.forEach(function (b) { b.disabled = false; });
    });
  }
  function bootApp() {
    show("app");
    api("/api/tiku/me").then(function (d) {
      me = d.teacher;
      if ((tab === "grant" && !me.canGrant) || (tab === "review" && !me.isAdmin)) tab = "pool";
      return reload();
    }).catch(function (e) {
      show("login");
      document.getElementById("login-msg").textContent = e.message || "请重新登录";
    });
  }

  // 最小可运行检查：node tiku/tiku.js；不访问 API、不读取登录凭据。
  if (typeof window === "undefined") {
    var assert = require("assert");
    var privatePath = "/api/tiku/prediction/media/0123456789abcdef01234567.mp3";
    assert.strictEqual(mediaPath(privatePath), privatePath);
    assert.ok(mediaPath("library/toefl/audio/Question 1.mp3").indexOf("/app/library/toefl/") >= 0);
    ["javascript:alert(1)", "data:audio/mp3;base64,AA", "https://evil.example/a.mp3", "//evil.example/a.mp3", "library/toefl/../../secret", "library/toefl/%2e%2e/secret", "library/toefl/%252e%252e/secret", "library/toefl/a.mp3?token=secret", privatePath + "?token=secret"].forEach(function (path) {
      assert.strictEqual(mediaPath(path), "");
    });
    assert.strictEqual(setLabel("prediction-2026-10-17"), "2026-10-17 预测包");
    assert.strictEqual(setLabel("R-CW12"), "R-CW12");
    assert.strictEqual(setLabel("W-BS1-Q1"), "W-BS1-Q1");
    F.src = "prediction";
    assert.strictEqual(blockMatches({ source: "set", sources: ["set", "prediction"] }), true);
    assert.strictEqual(blockMatches({ source: "bank" }), false);
    F.src = "";
    assert.strictEqual(blockPreviewHref({ sources: ["prediction"] }), "");
    var T = require("../app/assets/js/reading.js"), host = { innerHTML: "" };
    T.renderBlanksReview({ passage: [{ t: "<script>" }, { id: 1, prefix: "test", answer: "ing" }] }, host, { 1: "ing" });
    assert.ok(host.innerHTML.indexOf("&lt;script&gt;") >= 0 && host.innerHTML.indexOf("is-ok") >= 0);
    T.renderOptions({ id: 1, options: { A: "<img onerror=alert(1)>" } }, host, "A");
    assert.ok(host.innerHTML.indexOf("&lt;img") >= 0);
    var paused = 0, revoked = 0, aborted = 0, currentBody = {};
    var revoke = URL.revokeObjectURL;
    global.document = {
      getElementById: function () { return currentBody; },
      querySelectorAll: function () { return [{ pause: function () { paused += 1; }, removeAttribute: function () {}, load: function () {} }]; }
    };
    URL.revokeObjectURL = function () { revoked += 1; };
    reviewBlobs = ["blob:check"];
    reviewRequests = [{ abort: function () { aborted += 1; } }];
    var oldSeq = reviewSeq;
    assert.strictEqual(reviewCurrent(oldSeq, currentBody), true);
    clearReview();
    assert.strictEqual(reviewCurrent(oldSeq, currentBody), false);
    assert.strictEqual(paused + revoked + aborted, 3);
    URL.revokeObjectURL = revoke;
    delete global.document;
    assert.ok(recMeta({ practiceCount: 2, mockCount: 1, lastAt: "2026-10-26T08:12:00.000Z" }).indexOf("已练 2 题") >= 0);
    assert.ok(recMeta({ practiceCount: 0, mockCount: 0 }).indexOf("还没练过") >= 0);
    var recs = demoRecRows();
    assert.strictEqual(recLatestMap(recs)["practice|reading|set-1|0"].length, 2);
    assert.strictEqual(recLatestMap(recs)["practice|reading|set-1|0"][0].id, 11);
    recType = "complete_words";
    recSkill = "reading";
    assert.strictEqual(recPracticeRows(recs).length, 1);
    recType = "all";
    assert.ok(recPracticeRows(recs).length >= 1);
    assert.strictEqual(recMockSessions(recs.filter(function (r) { return r.kind === "mock"; })).length, 1);
    assert.strictEqual(recFilterRange(recs, "all").length, recs.length);
    var Rec = require("../server/toefl-records");
    Rec.selfCheck();
    console.log("ok prediction-ui-review-check");
    return;
  }

  /* ——— 事件 ——— */
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-tab],[data-bpv],[data-inspect],[data-sub],[data-off],[data-ok],[data-no],[data-pv],[data-grev],[data-refresh],#review-retry,#review-export,#g-on,#g-off,#g-all,#g-none,#refresh,#out");
    if (!t) return;
    if (t.id === "refresh" || t.getAttribute("data-refresh")) { refreshNow(); return; }
    if (t.id === "out") {
      clearReview();
      reviewId = "";
      localStorage.removeItem(TK);
      show("login");
      return;
    }
    var tabBtn = t.getAttribute("data-tab");
    if (tabBtn) {
      if (tabBtn === "grant" && !(me && me.canGrant)) { msg("开通服务需要管理员账号"); return; }
      clearReview();
      tab = tabBtn;
      paint();
      if (tab === "grant") ensureGrant();
      if (tab === "records") ensureRecords();
      return;
    }
    if (t.getAttribute("data-bpv")) {
      ev.preventDefault();
      var previewBlock = blockOf(t.getAttribute("data-bpv"));
      if (previewBlock && !isPrediction(previewBlock)) openPreview(blockPreviewHref(previewBlock));
      return;
    }
    var inspect = t.getAttribute("data-inspect");
    if (inspect) { loadReview(inspect, true); return; }
    if (t.id === "review-retry") { loadReview(reviewId, true); return; }
    if (t.id === "review-export") { exportReview(); return; }
    var sub = t.getAttribute("data-sub");
    if (sub) {
      api("/api/tiku/papers/" + sub + "/submit", { method: "POST", body: {} })
        .then(function () { msg("已上架", true); return reload(); })
        .catch(function (e) { msg(e.message); });
      return;
    }
    if (t.id === "g-all") { stuFiltered().forEach(function (s) { stuSel[s.id] = 1; }); paintGrant(); return; }
    if (t.id === "g-none") { stuSel = {}; paintGrant(); return; }
    var grev = t.getAttribute("data-grev");
    if (grev) {
      var gp = String(grev).split("|");
      if (confirm("收回「" + scopeTitle(gp[1]) + "」的开通？正在考的可考完本场。")) submitGrants("off", [Number(gp[0])], gp[1]);
      return;
    }
    if (t.id === "g-on" || t.id === "g-off") {
      var gids = Object.keys(stuSel).map(Number).filter(Boolean);
      if (!gids.length) { msg("先在左边勾选学生"); return; }
      var gsc = checkedScopes();
      if (!gsc.length) { msg("先勾选右边的开通对象"); return; }
      if (t.id === "g-off") {
        if (!confirm("停用这 " + gids.length + " 名学生 × " + gsc.length + " 个对象的开通？进行中的模考 24 小时内可考完本场，练习区立即拦截。")) return;
        submitGrants("off", gids);
      } else {
        submitGrants("on", gids);
      }
      return;
    }
    var off = t.getAttribute("data-off");
    if (off && confirm("下架后不能再挂回去，确定？")) {
      api("/api/tiku/papers/" + off + "/unpublish", { method: "POST", body: {} })
        .then(function () { msg("已下架", true); return reload(); })
        .catch(function (e) { msg(e.message); });
      return;
    }
    var okid = t.getAttribute("data-ok");
    if (okid) {
      api("/api/tiku/papers/" + okid + "/approve", { method: "POST", body: {} })
        .then(function () { msg("已通过", true); return reload(); })
        .catch(function (e) { msg(e.message); });
      return;
    }
    var noid = t.getAttribute("data-no");
    if (noid) {
      var note = prompt("退回原因（可空）") || "";
      api("/api/tiku/papers/" + noid + "/reject", { method: "POST", body: { note: note } })
        .then(function () { msg("已退回", true); return reload(); })
        .catch(function (e) { msg(e.message); });
      return;
    }
    var pv = t.getAttribute("data-pv");
    if (pv) {
      var paper = papers.filter(function (x) { return x.id === pv; })[0];
      if (paper) openPreview(previewHref(paper));
    }
  });

  document.addEventListener("change", function (ev) {
    var id = ev.target.id;
    if (id === "f-skill") { F.skill = ev.target.value; F.typ = ""; syncFilterDom(); updatePoolList(); }
    else if (id === "f-type") { F.typ = ev.target.value; syncFilterDom(); updatePoolList(); }
    else if (id === "f-set") { F.set = ev.target.value; updatePoolList(); }
    else if (id === "f-src") { F.src = ev.target.value; syncFilterDom(); updatePoolList(); }
    else if (ev.target.getAttribute && ev.target.getAttribute("data-gscope") != null) {
      var gsc2 = ev.target.getAttribute("data-gscope");
      if (ev.target.checked) grantSel[gsc2] = 1; else delete grantSel[gsc2];
      refreshLedger(); return;
    }
    else if (id === "g-start") { gwStart = ev.target.value; return; }
    else if (id === "g-exp") { gwExp = ev.target.value; return; }
    else if (id === "rec-range") {
      recRange = ev.target.value || "all";
      recOpenKey = "";
      recHistId = 0;
      if (recStudent) loadRecStudent(recStudent.id).then(paintRecStudent);
      return;
    }
    else if (id === "rec-hist") {
      recHistId = Number(ev.target.value) || 0;
      var hist = [];
      if (recKind === "mock" && recOpenKey.indexOf("|") >= 0) {
        var parts = recOpenKey.split("|");
        var sk = parts.pop();
        var sessKey = parts.join("|");
        recMockSessions(recFilterRange(recRows, recRange).filter(function (r) { return r.kind === "mock"; })).forEach(function (sess) {
          if (sess.key === sessKey) hist = sess.sections[sk] || [];
        });
      } else {
        var map = recLatestMap(recFilterRange(recRows, recRange).filter(function (r) { return r.kind === "practice"; }));
        hist = map[recOpenKey] || [];
      }
      recPaintSheet(hist);
      return;
    }
    else {
      var gsel = ev.target.getAttribute && ev.target.getAttribute("data-gsel");
      if (gsel) {
        var gid = Number(gsel);
        if (ev.target.checked) stuSel[gid] = 1; else delete stuSel[gid];
      }
    }
  });
  function syncFilterDom() {
    var typ = document.getElementById("f-type");
    if (typ) typ.outerHTML = '<select id="f-type" aria-label="题型">' + typeOptions() + "</select>";
    var set = document.getElementById("f-set");
    if (set) set.outerHTML = '<select id="f-set" aria-label="套号或日期">' + setOptions() + "</select>";
  }
  document.addEventListener("input", function (ev) {
    if (ev.target.id === "f-q") { F.q = ev.target.value.toLowerCase(); updatePoolList(); }
    else if (ev.target.id === "g-q") { stuQ = ev.target.value; filterStuRows(); }
    else if (ev.target.id === "rec-q") { recQ = ev.target.value; filterRecRows(); }
  });

  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-rec-stu],[data-rec-back],[data-rec-kind],[data-rec-skill],[data-rec-type],[data-rec-open]");
    if (!t) return;
    var sid = t.getAttribute("data-rec-stu");
    if (sid) {
      recKind = "";
      recOpenKey = "";
      recHistId = 0;
      recType = "";
      recSkill = "reading";
      loadRecStudent(sid).then(paintRecStudent).catch(function (e) { msg(e.message); });
      return;
    }
    if (t.getAttribute("data-rec-back")) {
      recStudent = null;
      recRows = [];
      recKind = "";
      recOpenKey = "";
      recHistId = 0;
      recRevokeAudio();
      paintRecRoster();
      return;
    }
    var kind = t.getAttribute("data-rec-kind");
    if (kind) {
      recKind = kind;
      recOpenKey = "";
      recHistId = 0;
      paintRecStudent();
      return;
    }
    var skill = t.getAttribute("data-rec-skill");
    if (skill) {
      recSkill = skill;
      recType = "";
      recOpenKey = "";
      recHistId = 0;
      paintRecStudent();
      return;
    }
    var typ = t.getAttribute("data-rec-type");
    if (typ) {
      recType = typ;
      recOpenKey = "";
      recHistId = 0;
      paintRecStudent();
      return;
    }
    var open = t.getAttribute("data-rec-open");
    if (open) {
      recOpenKey = open;
      recHistId = 0;
      paintRecStudent();
    }
  });

  w.addEventListener("pagehide", function () {
    clearReview();
    recRevokeAudio();
  });

  function filterStuRows() {
    var q = stuQ.toLowerCase();
    document.querySelectorAll(".g-row").forEach(function (row) {
      var who = row.querySelector(".g-who");
      var hit = !q || (who ? who.textContent : "").toLowerCase().indexOf(q) >= 0;
      row.classList.toggle("hidden", !hit);
    });
  }

  document.getElementById("login-form").onsubmit = function (ev) {
    ev.preventDefault();
    document.getElementById("login-msg").textContent = "";
    api("/api/teacher/login", {
      method: "POST",
      body: {
        phone: document.getElementById("phone").value.trim(),
        password: document.getElementById("password").value,
        activationCode: (document.getElementById("activationCode") || {}).value || ""
      }
    }).then(function (d) {
      localStorage.setItem(TK, d.token);
      bootApp();
    }).catch(function (e) {
      document.getElementById("login-msg").textContent = e.message || "登录失败";
    });
  };

  if (!w.YYSD_TIKU_GATE || !w.YYSD_TIKU_GATE.ok) {
    show("gate");
    return;
  }
  // ponytail: localhost ?demo=1 无 API 预览界面
  if (w.YYSD_TIKU_GATE.local && /(?:\?|&)demo=1(?:&|$)/.test(w.location.search || "")) {
    me = { name: "演示老师", phone: "13800000000", isAdmin: true, canGrant: true };
    pool = [
      { id: "d1", skill: "reading", type: "complete_words", title: "Archaeopteryx", titleZh: "始祖鸟填空", set: 2, n: 10, source: "set" },
      { id: "d2", skill: "reading", type: "daily_life", title: "Campus Notice", titleZh: "校园通知", set: 1, n: 5, source: "set" },
      { id: "d3", skill: "reading", type: "academic", title: "Hollywood", titleZh: "好莱坞黄金时代", set: 1, n: 10, source: "set" },
      { id: "d4", skill: "reading", type: "academic", title: "Coral Reefs", titleZh: "珊瑚礁生态", set: 3, n: 10, source: "set" },
      { id: "d5", skill: "listening", type: "lecture", title: "Art History", titleZh: "艺术史讲座", set: 3, n: 6, source: "set" },
      { id: "d6", skill: "listening", type: "conversation", title: "Library", titleZh: "图书馆借书", set: 2, n: 5, source: "set" },
      { id: "d7", skill: "listening", type: "choose_response", title: "Quick Response", titleZh: "听句选回应", set: 1, n: 8, source: "set" },
      { id: "d8", skill: "writing", type: "email", title: "Email to Prof", titleZh: "给教授写邮件", paperId: "2025-09-02", n: 1, source: "date" },
      { id: "d9", skill: "writing", type: "discussion", title: "Urban Planning", titleZh: "学术讨论", set: 4, n: 1, source: "set" },
      { id: "d10", skill: "writing", type: "sentence", title: "Build a Sentence", titleZh: "句子构建", set: 2, n: 5, source: "set" },
      { id: "d11", skill: "speaking", type: "repeat", title: "Listen & Repeat", titleZh: "听力复述", set: 1, n: 8, source: "set" },
      { id: "d12", skill: "speaking", type: "interview", title: "Interview", titleZh: "模拟面试", set: 2, n: 5, source: "set" }
    ];
    papers = [
      { id: "tp_demo1", title: "十月冲刺模考 A 卷", kind: "full", status: "live", owner: "teacher", skillMinutes: { reading: 35, listening: 36, writing: 29, speaking: 16 }, blocks: [pool[0], pool[4], pool[7], pool[10]], updatedAt: "2026-10-13T10:24:00" },
      { id: "tp_demo2", title: "阅读专项 · 学术文章", kind: "single", status: "draft", owner: "teacher", skillMinutes: {}, blocks: [pool[2], pool[3]], updatedAt: "2026-10-12T18:02:00" }
    ];
    isDemo = true;
    var dt = (w.location.search.match(/(?:\?|&)tab=(pool|mine|grant|records)(?:&|$)/) || [])[1];
    if (dt) tab = dt;
    show("app");
    paint();
    if (tab === "records") ensureRecords();
    return;
  }
  if (token()) bootApp();
  else show("login");
})(typeof window !== "undefined" ? window : { location: { hostname: "localhost", protocol: "http:", href: "http://localhost:8000/tiku/" } });
