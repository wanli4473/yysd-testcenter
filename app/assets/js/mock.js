/* ponytail: 考前冲刺包 picker — exam engine stays on toefl-*.html */
(function (w) {
  "use strict";

  var SKILLS = [
    { key: "reading", label: "阅读", page: "toefl-reading.html", list: "TOEFL_READING" },
    { key: "listening", label: "听力", page: "toefl-listening.html", list: "TOEFL_LISTENING" },
    { key: "writing", label: "写作", page: "toefl-writing.html", list: "TOEFL_WRITING" }
  ];

  function yysd() { return w.YYSD || {}; }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function examRoot() {
    return (location.pathname.indexOf("/app/") >= 0) ? "../" : "";
  }

  function packOf(id) {
    return (yysd().TOEFL_FULL || []).filter(function (p) { return p.id === id; })[0] || null;
  }

  function skillPaper(listName, id) {
    return (yysd()[listName] || []).filter(function (p) { return p.id === id; })[0] || null;
  }

  /* ---- 包锁态：/api/toefl/access 是唯一事实来源；取不到时只当未知（开始前服务端再兜底） ---- */
  var access = null;
  function fetchAccess() {
    if (access) return Promise.resolve(access);
    var A = w.YYSD_APP;
    if (!A || !A.api) return Promise.resolve(null);
    return A.api("/api/toefl/access").then(function (d) {
      access = (d && d.access) || null;
      return access;
    }).catch(function () { return null; });
  }

  function lockInfoOf(id) {
    if (!access || access.staff) return { locked: false };
    var st = (access.packages || {})[id];
    if (st && st.on) return { locked: false };
    var reason = st ? st.reason : "none";
    var text = reason === "scheduled" ? "定时开启" :
      reason === "expired" ? "已到期" :
      reason === "off" ? "已停用" : "未开通";
    return { locked: true, reason: reason, text: text };
  }

  function lockChipHTML(lock) {
    return lock.locked ? ' <span class="hit-mode-badge">' + lock.text + "</span>" : "";
  }

  function lockMsg(lock, title) {
    // 统一口径：学生不需要区分原因，动作都是找老师开通
    return "未开通考前冲刺包服务，请联系老师开通";
  }

  function onListClick(ev) {
    var el = ev.target.closest("[data-lock]");
    if (!el) return;
    ev.preventDefault();
    var note = document.getElementById("mock-note");
    if (note) {
      var lock = lockInfoOf(el.getAttribute("data-pkg"));
      note.textContent = lock.locked ? lockMsg(lock, el.getAttribute("data-lock")) :
        "「" + el.getAttribute("data-lock") + "」暂时不能进入。";
    }
  }

  function formLabel(p, packId) {
    var m = /Form\s*(\d+)/i.exec(p.title || "");
    if (m) return "Form " + m[1];
    if (p.id === packId) return "Form 1";
    var n = /-s(\d+)$/.exec(p.id);
    return n ? "Form " + n[1] : "口语";
  }

  function speakingForms(packId, list) {
    list = list || yysd().TOEFL_SPEAKING || [];
    return list.filter(function (p) {
      return p.id === packId || p.id.indexOf(packId + "-s") === 0;
    }).slice().sort(function (a, b) {
      if (a.id === packId) return -1;
      if (b.id === packId) return 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  function confirmHref(kind, id, skill) {
    var href = "mock.html?kind=" + encodeURIComponent(kind) + "&id=" + encodeURIComponent(id);
    return skill ? href + "&skill=" + encodeURIComponent(skill) : href;
  }

  function startFull(id) {
    try {
      sessionStorage.setItem("yysd:toefl-full:" + id, JSON.stringify({
        id: id, mode: "mock", sections: {}, voided: false
      }));
      sessionStorage.removeItem("yysd:toefl-hw:" + id);
    } catch (e) {}
    location.href = examRoot() + "toefl-reading.html?id=" + encodeURIComponent(id) + "&mode=mock&full=1&from=app";
  }

  function startSingle(id, skill) {
    var spec = SKILLS.filter(function (s) { return s.key === skill; })[0];
    var page = spec ? spec.page : "toefl-speaking.html";
    location.href = examRoot() + page + "?id=" + encodeURIComponent(id) + "&mode=mock&from=app";
  }

  /* 开始前服务端硬校验（锁态 UI 只是引导；被绕过后这里仍会拦） */
  function startGuard(packageId, go) {
    var A = w.YYSD_APP;
    if (!A || !A.api) { go(); return; }
    A.api("/api/toefl/exam-start", { method: "POST", body: { packageId: packageId } }).then(function () {
      go();
    }).catch(function (e) {
      var err = document.getElementById("mock-err");
      if (err) err.textContent = (e && e.message) || "暂时不能开始";
      var btn = document.getElementById("mock-go");
      if (btn) btn.disabled = false;
    });
  }

  function doorHTML() {
    return '<h1>考前冲刺包</h1>' +
      '<p class="hit-lead">按包开通。整套四科连考，或只考一科。考场仍是 ETS 界面。</p>' +
      '<div class="hit-mode-grid">' +
        '<a class="hit-mode practice" href="mock.html?kind=full">' +
          '<span class="hit-kick">Full Pack</span><h3>整套包</h3>' +
          "<p>阅读、听力、写作、口语，中途无休息。</p>" +
          '<span class="hit-cta">选整套<span class="arr">→</span></span></a>' +
        '<a class="hit-mode mock" href="mock.html?kind=single">' +
          '<span class="hit-kick">Single Skill</span><h3>单科包</h3>' +
          "<p>只考日期套卷里的一科。</p>" +
          '<span class="hit-cta">选单科<span class="arr">→</span></span></a>' +
      "</div>";
  }

  function mockRow(p, href) {
    var lock = lockInfoOf(p.id);
    return '<a class="hit-mock-row' + (lock.locked ? " is-locked" : "") + '" href="' + href + '"' +
      (lock.locked ? ' data-lock="' + esc(p.title || p.id) + '" data-pkg="' + esc(p.id || "") + '"' : "") + ">" +
      '<div class="hit-mock-info"><h4>' + (p.title || p.id) + lockChipHTML(lock) + "</h4>" +
      "<p>" + (p.desc || "阅读 + 听力 + 口语 + 写作") + "</p>" +
      '<div class="hit-chips"><span class="hit-chip">' + (p.id || "") + "</span>" +
      '<span class="hit-chip">' + (p.duration || "-") + " 分钟</span></div></div>" +
      '<span class="btn-start' + (lock.locked ? " is-lock" : "") + '">' + (lock.locked ? "未开通" : "开始") + "</span></a>";
  }

  function listHead(title, en, leadText) {
    return "<h1>" + title + "</h1>" +
      '<p class="hit-lead">' + leadText + "</p>" +
      '<p class="hit-status is-warn" id="mock-note"></p>' +
      '<a class="hit-back" href="mock.html">← 返回考前冲刺包</a>';
  }

  function fullListHTML(extra, stock) {
    var papers = (yysd().TOEFL_FULL || []).filter(function (p) {
      if (!stock || !stock.mocks || !stock.mocks.length) return true;
      return stock.mocks.indexOf(p.id) >= 0;
    });
    extra = extra || [];
    var rows = papers.map(function (p) {
      return mockRow(p, confirmHref("full", p.id));
    }).concat(extra.map(function (p) {
      return mockRow(p, "bank.html?id=" + encodeURIComponent(p.id));
    })).join("");
    return listHead("整套包", "Full mock", "按包开通。阅读 → 听力 → 写作 → 口语。") +
      '<div class="hit-mock-list">' + rows + "</div>";
  }

  function singleListHTML(extra, stock) {
    var papers = (yysd().TOEFL_FULL || []).filter(function (p) {
      if (!stock || !stock.mocks || !stock.mocks.length) return true;
      return stock.mocks.indexOf(p.id) >= 0;
    });
    extra = extra || [];
    var rows = papers.map(function (p, pi) {
      var lock = lockInfoOf(p.id);
      var skills = SKILLS.map(function (s) {
        var meta = skillPaper(s.list, p.id);
        if (!meta) return "";
        return '<a href="' + confirmHref("single", p.id, s.key) + '">' + s.label + "</a>";
      }).join("");
      var forms = speakingForms(p.id).map(function (sp) {
        return '<a href="' + confirmHref("single", sp.id, "speaking") + '">口语 ' + formLabel(sp, p.id) + "</a>";
      }).join("");
      return '<div class="hit-mock-row' + (lock.locked ? " is-locked" : "") + '"' +
        (lock.locked ? ' data-lock="' + esc(p.title || p.id) + '" data-pkg="' + esc(p.id || "") + '"' : "") + ">" +
        '<div class="hit-mock-thumb" aria-hidden="true">' + String(pi + 1).padStart(2, "0") + "</div>" +
        '<div class="hit-mock-info"><h4>' + (p.title || p.id) + lockChipHTML(lock) + "</h4>" +
        '<p>' + (p.id || "") + "</p>" +
        '<div class="hit-skills">' + skills + forms + "</div></div></div>";
    }).concat(extra.map(function (p) {
      var lock = lockInfoOf(p.id);
      return '<a class="hit-mock-row' + (lock.locked ? " is-locked" : "") + '" href="bank.html?id=' + encodeURIComponent(p.id) + '"' +
        (lock.locked ? ' data-lock="' + esc(p.title || p.id) + '" data-pkg="' + esc(p.id || "") + '"' : "") + ">" +
        '<div class="hit-mock-thumb" aria-hidden="true">1</div>' +
        '<div class="hit-mock-info"><h4>' + (p.title || p.id) + lockChipHTML(lock) + "</h4>" +
        "<p>单项 · " + (p.makerName || "") + "</p></div></a>";
    })).join("");
    return listHead("单科包", "Single skill", "按包开通。先选套卷，再选科目。") +
      '<div class="hit-mock-list">' + rows + "</div>";
  }

  function confirmHTML(kind, id, skill) {
    var pack = packOf(id);
    var speak = skill === "speaking" ? skillPaper("TOEFL_SPEAKING", id) : null;
    var spec = SKILLS.filter(function (s) { return s.key === skill; })[0];
    var single = spec ? skillPaper(spec.list, id) : speak;
    var title = (kind === "full" ? pack : single) ? ((kind === "full" ? pack : single).title) : id;
    var mins = kind === "full" ? (pack && pack.duration) : (single && single.duration);
    var back = "mock.html?kind=" + encodeURIComponent(kind);
    var rules = kind === "full"
      ? "<li>阅读 → 听力 → 写作 → 口语，无安排休息，科与科之间不能返回。</li>" +
        "<li>按各科官方时限连考，约 " + (mins || "—") + " 分钟。</li>" +
        "<li>切换页面或离开窗口则整场作废，四科均不记分。</li>"
      : "<li>只考 " + (spec ? spec.label : "口语") + " 一科，时限约 " + (mins || "—") + " 分钟。</li>" +
        "<li>切换页面或离开窗口则本场作废，不记分。</li>" +
        "<li>开始后不能返回题目列表。</li>";
    if (!pack && kind === "full") return '<p class="hit-status">找不到这套题。</p><a class="hit-back" href="mock.html">← 返回</a>';
    if (kind === "single" && !single) return '<p class="hit-status">找不到这一科。</p><a class="hit-back" href="' + back + '">← 返回</a>';
    return '<h1>开始前确认</h1>' +
      '<a class="hit-back" href="' + back + '">← 返回列表</a>' +
      '<div class="hit-confirm"><h2>' + title + "</h2><ul>" + rules + "</ul>" +
      '<p class="hit-status is-warn" id="mock-err"></p>' +
      '<button type="button" class="hit-go" id="mock-go">开始模考</button></div>';
  }

  function bindConfirm(kind, id, skill) {
    var btn = document.getElementById("mock-go");
    if (!btn) return;
    btn.onclick = function () {
      btn.disabled = true;
      startGuard(id, function () {
        if (kind === "full") startFull(id);
        else startSingle(id, skill);
      });
    };
  }

  function paint(host) {
    var qs = new URLSearchParams(location.search);
    var kind = qs.get("kind") || "";
    var id = qs.get("id") || "";
    var skill = qs.get("skill") || "";
    if (id && (kind === "full" || kind === "single")) {
      host.innerHTML = confirmHTML(kind, id, skill);
      bindConfirm(kind, id, skill);
      fetchAccess();
      return "mock";
    }
    if (kind === "full" || kind === "single") {
      var paintList = function (extra, stock) {
        host.innerHTML = kind === "full" ? fullListHTML(extra, stock) : singleListHTML(extra, stock);
      };
      paintList();
      host.onclick = onListClick;
      var catP = (w.YYSD_APP && w.YYSD_APP.api)
        ? w.YYSD_APP.api("/api/tiku/catalog?kind=" + encodeURIComponent(kind))
          .then(function (d) { return (d && d.catalog) || {}; })
          .catch(function () { return {}; })
        : Promise.resolve({});
      Promise.all([fetchAccess(), catP]).then(function (xs) {
        var cat = xs[1] || {};
        paintList(cat.papers, cat.stock);
      });
      return "mock";
    }
    host.innerHTML = doorHTML();
    return "mock";
  }

  var api = {
    speakingForms: speakingForms,
    formLabel: formLabel,
    paint: paint
  };
  w.YYSD_HIT_MOCK = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : global);
