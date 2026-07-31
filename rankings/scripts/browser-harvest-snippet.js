/**
 * Eval on TopUniversities ranking page AFTER load with ?items_per_page=150
 * Captures endpoint JSON via XHR hook + DOM page0; paginates to top 500.
 * Result: window.__qsExport
 */
(function harvestQsTop500(meta) {
  const TOP_N = 500;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  if (!window.__qsNativeOpen) {
    window.__qsNativeOpen = XMLHttpRequest.prototype.open;
    window.__qsNativeSend = XMLHttpRequest.prototype.send;
  }
  window.__qsPages = {};
  XMLHttpRequest.prototype.open = function (m, u, ...r) {
    this.__u = u;
    return window.__qsNativeOpen.call(this, m, u, ...r);
  };
  XMLHttpRequest.prototype.send = function (...a) {
    this.addEventListener("load", function () {
      if (!String(this.__u || "").includes("/rankings/endpoint")) return;
      try {
        const data = JSON.parse(this.responseText);
        window.__qsPages[data.current_page] = data;
      } catch (_) {}
    });
    return window.__qsNativeSend.apply(this, a);
  };

  window.__qsHarvestDone = false;
  window.__qsHarvestError = null;
  window.__qsExport = null;

  const extractDom = () =>
    [...document.querySelectorAll("#ranking-data-load .new-ranking-cards")].map((c) => {
      const rankDisplay = (c.querySelector(".rank-no")?.textContent || "").replace(/\s+/g, " ").trim();
      const scoreRaw = (c.querySelector(".rank-score")?.textContent || "").trim();
      const a = c.querySelector("a.uni-link");
      const rankNum = (() => {
        const range = rankDisplay.match(/^(\d+)\s*-\s*\d+$/);
        if (range) return Number(range[1]);
        return Number(rankDisplay.replace(/^=/, "").replace(/[^\d].*$/, "")) || 0;
      })();
      const lines = (c.textContent || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const location =
        lines.find(
          (l) =>
            /,/.test(l) &&
            !/Score|Reputation|Shortlist|Compare|Employ|Research|Global|More Info|Rank|Citations|Learning|Sustainability|Create/i.test(
              l
            )
        ) || "";
      return {
        rankDisplay,
        rank: rankNum,
        score: scoreRaw ? Number(scoreRaw) : null,
        name: (a?.textContent || "").trim(),
        href: a?.getAttribute("href") || "",
        location,
      };
    });

  const fromNodes = (nodes) => {
    const out = [];
    for (const n of nodes || []) {
      const rankDisplay = String(n.rank_display || n.rank || "").trim();
      const rankNum = (() => {
        const range = rankDisplay.match(/^(\d+)\s*-\s*\d+$/);
        if (range) return Number(range[1]);
        return Number(rankDisplay.replace(/^=/, "").replace(/[^\d].*$/, "")) || 0;
      })();
      if (!rankNum || rankNum > TOP_N) continue;
      const metrics = {};
      for (const group of Object.values(n.scores || {})) {
        if (!Array.isArray(group)) continue;
        for (const ind of group) {
          if (ind?.indicator_name && ind.score != null && ind.score !== "") {
            metrics[ind.indicator_name] = Number(ind.score);
          }
        }
      }
      out.push({
        rankDisplay,
        rank: rankNum,
        score: n.overall_score != null && n.overall_score !== "" ? Number(n.overall_score) : null,
        name: String(n.title || "").trim(),
        href: String(n.path || "").trim(),
        location: [n.city, n.country].filter(Boolean).join(", "),
        country: n.country || "",
        city: n.city || "",
        metrics: Object.keys(metrics).length ? metrics : undefined,
      });
    }
    return out;
  };

  (async () => {
    try {
      await sleep(400);
      let all = extractDom();
      for (let p = 1; p < 6; p++) {
        if (all.filter((e) => e.rank > 0).length >= TOP_N) break;
        const next = document.querySelector("#alt-style-pagination a.page-link.next");
        if (!next) break;
        const beforeRank = document.querySelector(".rank-no")?.textContent;
        next.click();
        let ok = false;
        for (let w = 0; w < 45; w++) {
          await sleep(220);
          if (window.__qsPages[p]) {
            all = all.concat(fromNodes(window.__qsPages[p].score_nodes));
            ok = true;
            break;
          }
          const nowRank = document.querySelector(".rank-no")?.textContent;
          if (nowRank && nowRank !== beforeRank) {
            all = all.concat(extractDom());
            ok = true;
            break;
          }
        }
        if (!ok) break;
      }
      const seen = new Set();
      const uniq = [];
      for (const e of all.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))) {
        const k = e.rank + "|" + e.name;
        if (!e.name || !e.rank || e.rank > TOP_N || seen.has(k)) continue;
        seen.add(k);
        uniq.push(e);
        if (uniq.length >= TOP_N) break;
      }
      window.__qsExport = {
        fetchedAt: new Date().toISOString(),
        source: location.href.split("?")[0],
        ...meta,
        count: uniq.length,
        entries: uniq,
      };
      window.__qsHarvestDone = true;
    } catch (e) {
      window.__qsHarvestError = String(e);
      window.__qsHarvestDone = true;
    }
  })();
  return { started: true };
})
