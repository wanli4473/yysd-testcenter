/* =========================================================================
   results-wrongs.js — 我的成绩 · 错题行动区
   ========================================================================= */
(function () {
  "use strict";

  var Y = window.YYSD;
  var AUTH = window.YYSD_AUTH;
  var root = document.getElementById("results-wrongs");
  if (!root || !Y) return;

  var FILTER_KEY = "yysd:wrongs-filter";
  var qs = new URLSearchParams(location.search);
  var assignmentOnly = true;
  try {
    var saved = sessionStorage.getItem(FILTER_KEY);
    if (saved === "all") assignmentOnly = false;
    if (saved === "hw") assignmentOnly = true;
  } catch (e) {}
  if (qs.get("wrongs") === "all" || qs.get("assignmentOnly") === "0") assignmentOnly = false;
  if (qs.get("assignmentOnly") === "1") assignmentOnly = true;
  var focusEvent = (qs.get("event") || "").replace(/\D/g, "") || "";
  if (focusEvent) assignmentOnly = true;
  var activePanel = "listening";

  function esc(s) {
    return Y.esc ? Y.esc(s) : String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function suiteBase(itemId) {
    return String(itemId || "").replace(/-reading$/, "").replace(/-writing$/, "");
  }

  function isLR(subject) {
    return subject === "cambridge-listening" || subject === "cambridge-reading";
  }

  function wrongCount(a) {
    return (a && a.wrong && a.wrong.length) || 0;
  }

  function fmtDate(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("zh-CN", { hour12: false }); } catch (e) { return String(d); }
  }

  function mockKeys(attempts) {
    var byEventSuite = {};
    attempts.forEach(function (a) {
      if (!isLR(a.subject)) return;
      if (a.cdt) {
        var k = "cdt|" + suiteBase(a.id) + "|" + (a.assignmentEventId || "") + "|" + String(a.date || "").slice(0, 10);
        byEventSuite[k] = byEventSuite[k] || { listening: false, reading: false, cdt: true };
        if (a.subject === "cambridge-listening") byEventSuite[k].listening = true;
        if (a.subject === "cambridge-reading") byEventSuite[k].reading = true;
        return;
      }
      if (!a.assignmentEventId) return;
      var k2 = "ev|" + a.assignmentEventId + "|" + suiteBase(a.id);
      byEventSuite[k2] = byEventSuite[k2] || { listening: false, reading: false, cdt: false };
      if (a.subject === "cambridge-listening") byEventSuite[k2].listening = true;
      if (a.subject === "cambridge-reading") byEventSuite[k2].reading = true;
    });
    var out = {};
    Object.keys(byEventSuite).forEach(function (k) {
      var g = byEventSuite[k];
      if (g.cdt || (g.listening && g.reading)) out[k] = 1;
    });
    return out;
  }

  function attemptMockKey(a, keys) {
    if (!isLR(a.subject)) return "";
    if (a.cdt) {
      var k = "cdt|" + suiteBase(a.id) + "|" + (a.assignmentEventId || "") + "|" + String(a.date || "").slice(0, 10);
      return keys[k] ? k : "";
    }
    if (!a.assignmentEventId) return "";
    var k2 = "ev|" + a.assignmentEventId + "|" + suiteBase(a.id);
    return keys[k2] ? k2 : "";
  }

  function localAttempts() {
    var store = Y.results() || {};
    return Object.keys(store).map(function (id) {
      var r = store[id] || {};
      return {
        id: r.id || id,
        attemptId: null,
        title: r.title || id,
        zone: r.zone || "",
        subject: r.subject || "",
        score: r.score,
        total: r.total,
        band: r.band,
        date: r.date,
        assignmentEventId: r.assignmentEventId || null,
        cdt: !!r.cdt,
        wrong: Array.isArray(r.wrong) ? r.wrong : [],
        _local: true
      };
    }).filter(function (a) {
      return wrongCount(a) > 0 && isLR(a.subject);
    });
  }

  function bucket(attempts) {
    var keys = mockKeys(attempts);
    var listening = [];
    var reading = [];
    var mockMap = {};
    attempts.forEach(function (a) {
      if (wrongCount(a) <= 0) return;
      if (!isLR(a.subject)) return;
      var mk = attemptMockKey(a, keys);
      if (mk) {
        if (!mockMap[mk]) {
          mockMap[mk] = {
            key: mk,
            title: "",
            date: a.date,
            assignmentEventId: a.assignmentEventId || null,
            attempts: [],
            wrongN: 0
          };
        }
        mockMap[mk].attempts.push(a);
        mockMap[mk].wrongN += wrongCount(a);
        if (!mockMap[mk].date || String(a.date) > String(mockMap[mk].date)) mockMap[mk].date = a.date;
        var base = suiteBase(a.id);
        mockMap[mk].title = (a.title || base).replace(/（听力）|（阅读）|（写作）/g, "").trim() || base;
        return;
      }
      if (a.subject === "cambridge-listening") listening.push(a);
      else if (a.subject === "cambridge-reading") reading.push(a);
    });
    var mock = Object.keys(mockMap).map(function (k) { return mockMap[k]; })
      .sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    listening.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    reading.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    return { listening: listening, reading: reading, mock: mock };
  }

  function detailHref(a) {
    if (a.attemptId) return "wrong-record.html?attempt=" + encodeURIComponent(String(a.attemptId));
    return "wrong-record.html?item=" + encodeURIComponent(a.id) + "&local=1";
  }

  function mockHref(g) {
    var ids = g.attempts.map(function (a) { return a.attemptId; }).filter(Boolean);
    if (ids.length) return "wrong-record.html?attempts=" + encodeURIComponent(ids.join(","));
    var items = g.attempts.map(function (a) { return a.id; }).filter(Boolean);
    return "wrong-record.html?items=" + encodeURIComponent(items.join(",")) + "&local=1";
  }

  function rowHTML(a) {
    var n = wrongCount(a);
    return '<a class="wrong-hub-row" href="' + esc(detailHref(a)) + '">' +
      '<span class="wrong-hub-row__main">' +
        "<b>" + esc(a.title || a.id) + "</b>" +
        '<span class="wrong-hub-row__meta">' + esc(fmtDate(a.date)) +
          (a.assignmentEventId ? " · 作业" : "") +
        "</span>" +
      "</span>" +
      '<span class="wrong-hub-row__stat">错 ' + n + " 题</span>" +
      '<span class="wrong-hub-row__go" aria-hidden="true">›</span>' +
    "</a>";
  }

  function mockRowHTML(g) {
    return '<a class="wrong-hub-row" href="' + esc(mockHref(g)) + '">' +
      '<span class="wrong-hub-row__main">' +
        "<b>" + esc(g.title || "雅思模考") + "</b>" +
        '<span class="wrong-hub-row__meta">' + esc(fmtDate(g.date)) +
          (g.assignmentEventId ? " · 作业" : "") +
          " · 听+读" +
        "</span>" +
      "</span>" +
      '<span class="wrong-hub-row__stat">错 ' + g.wrongN + " 题</span>" +
      '<span class="wrong-hub-row__go" aria-hidden="true">›</span>' +
    "</a>";
  }

  function totalWrongItems(list, isMock) {
    if (isMock) {
      return list.reduce(function (n, g) { return n + (g.wrongN || 0); }, 0);
    }
    return list.reduce(function (n, a) { return n + wrongCount(a); }, 0);
  }

  function pickDefaultPanel(b) {
    var scores = [
      { k: "listening", n: b.listening.length },
      { k: "reading", n: b.reading.length },
      { k: "mock", n: b.mock.length }
    ].sort(function (a, c) { return c.n - a.n; });
    return scores[0].n > 0 ? scores[0].k : "listening";
  }

  function setTabBadge(total) {
    var badge = document.getElementById("wrong-tab-badge");
    if (!badge) return;
    if (total > 0) {
      badge.hidden = false;
      badge.textContent = String(total > 99 ? "99+" : total);
    } else {
      badge.hidden = true;
    }
  }

  function enrichLocalFromAttempts(attempts) {
    var store = {};
    try { store = JSON.parse(localStorage.getItem("yysd:results") || "{}"); } catch (e) { store = {}; }
    var changed = false;
    var latestByItem = {};
    attempts.forEach(function (a) {
      if (!a || !a.id || wrongCount(a) <= 0) return;
      var prev = latestByItem[a.id];
      if (!prev || String(a.date || "") > String(prev.date || "")) latestByItem[a.id] = a;
    });
    Object.keys(latestByItem).forEach(function (id) {
      var a = latestByItem[id];
      var cur = store[id] || { id: id, title: a.title, subject: a.subject, zone: a.zone };
      if (!cur.wrong || !cur.wrong.length) {
        cur.wrong = a.wrong;
        changed = true;
      }
      if (a.cdt && !cur.cdt) { cur.cdt = true; changed = true; }
      if (a.assignmentEventId && !cur.assignmentEventId) {
        cur.assignmentEventId = a.assignmentEventId;
        changed = true;
      }
      store[id] = cur;
    });
    if (changed) {
      try { localStorage.setItem("yysd:results", JSON.stringify(store)); } catch (e) {}
    }
    return latestByItem;
  }

  function patchResultsLinks(latestByItem) {
    var area = document.getElementById("results-area");
    if (!area) return;
    area.querySelectorAll(".results-row[data-item-id]").forEach(function (row) {
      var id = row.getAttribute("data-item-id");
      if (!id || !latestByItem[id]) return;
      var disabled = row.querySelector("[data-wrong-disabled]");
      if (!disabled) return;
      var a = document.createElement("a");
      a.className = "btn btn--ghost btn--sm";
      a.setAttribute("data-wrong-link", "");
      a.href = "wrong-record.html?item=" + encodeURIComponent(id);
      a.textContent = "错题";
      disabled.replaceWith(a);
    });
  }

  function panelListHTML(key, b, empty) {
    var cta = '<p class="wrong-hub-empty">' + esc(empty) +
      ' <a href="zone.html?zone=mock">去练一套</a></p>';
    if (key === "listening") {
      return b.listening.length ? b.listening.map(rowHTML).join("") : cta;
    }
    if (key === "reading") {
      return b.reading.length ? b.reading.map(rowHTML).join("") : cta;
    }
    return b.mock.length ? b.mock.map(mockRowHTML).join("") : cta;
  }

  function bindUI(b, empty) {
    root.querySelectorAll("[data-seg]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        assignmentOnly = btn.getAttribute("data-seg") === "hw";
        try { sessionStorage.setItem(FILTER_KEY, assignmentOnly ? "hw" : "all"); } catch (e) {}
        load();
      });
    });
    root.querySelectorAll("[data-panel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activePanel = btn.getAttribute("data-panel") || "listening";
        root.querySelectorAll("[data-panel]").forEach(function (b2) {
          b2.classList.toggle("is-active", b2.getAttribute("data-panel") === activePanel);
        });
        var body = root.querySelector("[data-panel-body]");
        if (body) body.innerHTML = panelListHTML(activePanel, b, empty);
      });
    });
  }

  function render(attempts) {
    if (focusEvent) {
      attempts = attempts.filter(function (a) {
        return String(a.assignmentEventId || "") === focusEvent;
      });
    }
    var forEnrich = attempts.slice();
    var filtered = assignmentOnly
      ? attempts.filter(function (a) { return !!a.assignmentEventId; })
      : attempts;
    var b = bucket(filtered);
    var emptyHw = "还没有作业错题。完成老师布置的听力/阅读后会出现在这里。";
    var emptyAll = "还没有练习错题记录。交卷后错题会自动收录。";
    var empty = assignmentOnly ? emptyHw : emptyAll;

    var lN = totalWrongItems(b.listening, false);
    var rN = totalWrongItems(b.reading, false);
    var mN = totalWrongItems(b.mock, true);
    var totalQ = lN + rN + mN;
    setTabBadge(totalQ);

    activePanel = pickDefaultPanel(b);

    root.innerHTML =
      '<div class="wrong-hub results-panel premium-enter" aria-label="错题记录">' +
        '<div class="wrong-hub__head">' +
          "<div>" +
            '<span class="wrong-hub__eyebrow">WRONG ANSWERS</span>' +
            "<h2>错题记录</h2>" +
          "</div>" +
          '<div class="results-seg" role="group" aria-label="错题范围">' +
            '<button type="button" class="results-seg__btn' + (assignmentOnly ? " is-active" : "") + '" data-seg="hw">作业</button>' +
            '<button type="button" class="results-seg__btn' + (!assignmentOnly ? " is-active" : "") + '" data-seg="all">全部</button>' +
          "</div>" +
        "</div>" +
        '<div class="wrong-stats">' +
          '<button type="button" class="wrong-stat' + (activePanel === "listening" ? " is-active" : "") + '" data-panel="listening">' +
            "<b>" + lN + "</b><span>听力</span></button>" +
          '<button type="button" class="wrong-stat' + (activePanel === "reading" ? " is-active" : "") + '" data-panel="reading">' +
            "<b>" + rN + "</b><span>阅读</span></button>" +
          '<button type="button" class="wrong-stat' + (activePanel === "mock" ? " is-active" : "") + '" data-panel="mock">' +
            "<b>" + mN + "</b><span>模考</span></button>" +
        "</div>" +
        '<div class="wrong-hub-list" data-panel-body>' + panelListHTML(activePanel, b, empty) + "</div>" +
      "</div>";

    bindUI(b, empty);
    var latest = enrichLocalFromAttempts(forEnrich);
    patchResultsLinks(latest);
  }

  function load() {
    root.innerHTML = '<div class="state state--brand"><div class="spinner spinner--brand"></div>加载错题记录…</div>';
    var local = localAttempts();
    var p = AUTH && AUTH.fetchScoreAttempts
      ? AUTH.fetchScoreAttempts({ assignmentOnly: false, limit: 150 })
      : Promise.resolve({ attempts: [] });
    p.then(function (d) {
      var cloud = (d && d.attempts) || [];
      var byKey = {};
      cloud.forEach(function (a) {
        if (wrongCount(a) <= 0) return;
        var k = (a.attemptId != null ? "a:" + a.attemptId : "i:" + a.id + ":" + a.date);
        byKey[k] = a;
      });
      local.forEach(function (a) {
        var hit = cloud.some(function (c) {
          return c.id === a.id && String(c.date || "").slice(0, 19) === String(a.date || "").slice(0, 19);
        });
        if (!hit) byKey["local:" + a.id] = a;
      });
      render(Object.keys(byKey).map(function (k) { return byKey[k]; }));
    }).catch(function () {
      render(local);
    });
  }

  window.YYSD_WRONG_HUB = {
    suiteBase: suiteBase,
    mockKeys: mockKeys,
    attemptMockKey: attemptMockKey,
    bucket: bucket,
    reload: load
  };

  load();
})();
