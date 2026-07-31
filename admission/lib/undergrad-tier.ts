/**
 * Undergrad strength 1–5 (5 = strongest). Used for selectivity gap + peer case filter.
 * Sources: common counselor heuristics / US News-ish peer groups — not official ranks.
 */

export type UndergradBand = {
  score: number; // 1-5
  label: string;
  source: string;
};

const EXACT: Array<{ re: RegExp; score: number; label: string }> = [
  { re: /\b(mit|stanford|harvard|princeton|yale|caltech)\b/i, score: 5, label: "美本顶校/HYPSM级" },
  { re: /\b(berkeley|ucla|michigan|cmu|carnegie mellon|columbia|upenn|u penn|cornell|chicago|northwestern|duke|johns hopkins)\b/i, score: 5, label: "美本顶尖私立/公立" },
  { re: /\b(penn state|pennsylvania state|psu)\b/i, score: 3, label: "美本州立旗舰（中上）" },
  { re: /\b(virginia tech|vt|asu|arizona state|northeastern|purdue|ohio state|wisconsin|minnesota|maryland|uc davis|uc irvine|ucsb|ucsc)\b/i, score: 3, label: "美本较强州立/私立" },
  { re: /\b(oxford|cambridge|imperial|ucl|lse)\b/i, score: 5, label: "英本 G5" },
  { re: /\b(toronto|ubc|mcgill|waterloo)\b/i, score: 4, label: "加本顶尖" },
  { re: /\b(melbourne|sydney|anu|unsw|monash)\b/i, score: 4, label: "澳本八大前列" },
  { re: /清华|北大|复旦|上交|浙大|中科大|南大|人大/, score: 5, label: "内地顶尖（清北华五等）" },
  { re: /某985|985高校/, score: 4, label: "内地 985（合成案例档）" },
  { re: /某211|211高校|双一流/, score: 3, label: "内地 211/双一流（合成案例档）" },
  { re: /某海外本科/, score: 3, label: "海外本科（合成案例档）" },
  { re: /某地方重点|中外合作/, score: 2, label: "内地普通/中外合作（合成案例档）" },
  // GradCafe anonymized buckets — treat as mid peer band for filtering
  { re: /GradCafe|国际本科|美国本科|未标注本科/, score: 3, label: "GradCafe 自报本科（中等档假设）" },
];

export function classifyUndergrad(schoolName: string): UndergradBand {
  const name = (schoolName || "").trim();
  if (!name) {
    return { score: 2, label: "未识别本科", source: "default" };
  }
  for (const row of EXACT) {
    if (row.re.test(name)) {
      return {
        score: row.score,
        label: row.label,
        source: "undergrad_tier_table_v1",
      };
    }
  }
  // Chinese generic
  if (/大学|学院/.test(name)) {
    return { score: 2, label: "内地普通本科（未匹配名录）", source: "undergrad_tier_table_v1" };
  }
  return { score: 3, label: "未名录院校（按中等假设）", source: "undergrad_tier_table_v1" };
}

/** Map synthetic case undergrad labels → score for peer filtering */
export function caseUndergradScore(undergradSchool: string): number {
  return classifyUndergrad(undergradSchool).score;
}
