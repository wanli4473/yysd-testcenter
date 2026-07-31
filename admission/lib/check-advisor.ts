/**
 * Self-check for advisor keyword matching (no DB / no LLM).
 * Usage: npx tsx lib/check-advisor.ts
 */

function scoreProgram(
  query: string,
  bagParts: string[]
): number {
  const q = query.toLowerCase();
  const bag = bagParts.join(" ").toLowerCase();
  let score = 0;
  const tokens = q.split(/[\s,，、/|]+/).filter((t) => t.length >= 2);
  for (const t of tokens) if (bag.includes(t)) score += 3;
  if (/数据|data/i.test(query) && /data science|analytics/.test(bag)) score += 4;
  if (/人工.?智能|ai\b/i.test(query) && /artificial intelligence|machine learning/.test(bag))
    score += 4;
  return score;
}

const ds = scoreProgram("我对数据科学感兴趣", [
  "Data Science",
  "数据科学",
  "data_ai",
  "统计、机器学习",
]);
const cs = scoreProgram("我对数据科学感兴趣", [
  "Computer Science",
  "计算机科学",
  "cs",
]);
console.assert(ds > cs, `data should beat cs: ${ds} vs ${cs}`);
console.assert(ds >= 3, "should not need clarify");
console.log("check-advisor OK", { ds, cs });
