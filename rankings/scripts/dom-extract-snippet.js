/** Eval after ?items_per_page=150 load. Returns {started} and fills window.__qsExport from current DOM only (page 0). */
(function (meta) {
  const cards = [...document.querySelectorAll("#ranking-data-load .new-ranking-cards")];
  const entries = cards.map((c) => {
    const rankDisplay = (c.querySelector(".rank-no")?.textContent || "").replace(/\s+/g, " ").trim();
    const scoreRaw = (c.querySelector(".rank-score")?.textContent || "").trim();
    const a = c.querySelector("a.uni-link");
    const rankNum = (() => {
      const range = rankDisplay.match(/^(\d+)\s*-\s*\d+$/);
      if (range) return Number(range[1]);
      return Number(rankDisplay.replace(/^=/, "").replace(/[^\d].*$/, "")) || 0;
    })();
    const lines = (c.textContent || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const location =
      lines.find(
        (l) =>
          /,/.test(l) &&
          !/Score|Reputation|Shortlist|Compare|Employ|Research|Global|More Info|Rank|Citations|Learning|Sustainability|Create/i.test(l)
      ) || "";
    return {
      rankDisplay,
      rank: rankNum,
      score: scoreRaw ? Number(scoreRaw) : null,
      name: (a?.textContent || "").trim(),
      href: a?.getAttribute("href") || "",
      location,
    };
  }).filter((e) => e.name && e.rank);
  window.__qsExport = {
    fetchedAt: new Date().toISOString(),
    source: location.href.split("?")[0],
    ...meta,
    count: entries.length,
    entries,
  };
  return { count: entries.length, first: entries[0]?.name, last: entries[entries.length - 1]?.name };
})
