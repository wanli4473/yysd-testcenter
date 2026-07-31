import type { Case, School } from "@prisma/client";
import type { EvaluateInput } from "./validate";
import { classifyUndergrad, caseUndergradScore } from "./undergrad-tier";
import { majorFit, programDifficulty } from "./selectivity";

export type EvidenceItem = {
  type: string;
  title: string;
  detail: string;
  weight?: string;
};

export type CalibratedResult = {
  /** point estimate for ring display */
  probability: number;
  range: { low: number; high: number };
  category: "冲刺" | "匹配" | "保底";
  evidence: EvidenceItem[];
  undergrad: ReturnType<typeof classifyUndergrad>;
  difficulty: ReturnType<typeof programDifficulty>;
  major: ReturnType<typeof majorFit>;
  gap: number;
  peerCaseStats: { n: number; admitRate: number | null; source: string; realN: number };
};

type CaseLite = Pick<
  Case,
  "admissionResult" | "gpa" | "undergradSchool" | "source"
>;

type ResumeSignals = {
  research?: string[];
  internships?: string[];
  papers?: string[];
  contests?: string[];
  tags?: string[];
} | null;

function isReal(c: CaseLite) {
  return c.source === "gradcafe" || c.source === "manual";
}

export function calibrateAdmission(opts: {
  school: School;
  input: EvaluateInput;
  cases: CaseLite[];
  resume?: ResumeSignals;
}): CalibratedResult {
  const { school, input, cases, resume } = opts;
  const undergrad = classifyUndergrad(input.undergradSchool);
  const difficulty = programDifficulty(school);
  const major = majorFit(input.undergradMajor, school.field);
  const gap = difficulty.score - undergrad.score; // >0 = reach

  const realAll = cases.filter(isReal);
  const synthAll = cases.filter((c) => !isReal(c));

  const peerReal = realAll.filter((c) => {
    const s = caseUndergradScore(c.undergradSchool);
    return Math.abs(s - undergrad.score) <= 1;
  });
  const peerSynth = synthAll.filter((c) => {
    const s = caseUndergradScore(c.undergradSchool);
    return Math.abs(s - undergrad.score) <= 1;
  });

  // Prefer real GradCafe samples; fall back to synthetic only if needed
  let useCases: CaseLite[];
  let caseSource: string;
  if (peerReal.length >= 5) {
    useCases = peerReal;
    caseSource = `GradCafe 真实自报（同档 n=${peerReal.length}）`;
  } else if (realAll.length >= 5) {
    useCases = realAll;
    caseSource = `GradCafe 真实自报（跨档混入，同档仅 ${peerReal.length}）`;
  } else if (peerReal.length + peerSynth.length >= 5) {
    useCases = [...peerReal, ...peerSynth];
    caseSource = `真实 ${peerReal.length} + 合成同档 ${peerSynth.length}（真实样本不足）`;
  } else {
    useCases = cases.length ? cases : [];
    caseSource = useCases.length
      ? "案例不足，混用全库样本（可信度低）"
      : "无可用案例，仅用选择性模型";
  }

  let admitRate: number | null = null;
  if (useCases.length >= 5) {
    admitRate =
      useCases.filter((c) => c.admissionResult).length / useCases.length;
  }

  // --- score in 0-100 ---
  let p = 50;

  if (gap >= 3) p = 8;
  else if (gap === 2) p = 14;
  else if (gap === 1) p = 28;
  else if (gap === 0) p = 48;
  else if (gap === -1) p = 62;
  else p = 72;

  const gpaDelta = input.gpa - school.avgGpa;
  p += gpaDelta * 28;

  if (school.minToefl != null && input.toefl != null) {
    p += Math.min(8, Math.max(-12, (input.toefl - school.minToefl - 5) * 0.4));
  }
  if (school.minIelts != null && input.ielts != null) {
    p += Math.min(8, Math.max(-12, (input.ielts - school.minIelts - 0.5) * 6));
  }

  p += (major.score - 0.6) * 22;

  const researchN = resume?.research?.length ?? 0;
  const paperN = resume?.papers?.length ?? 0;
  const internN = resume?.internships?.length ?? 0;
  if (paperN > 0) p += 6;
  if (researchN > 0) p += Math.min(5, researchN * 2);
  if (internN > 0) p += Math.min(4, internN);
  if (difficulty.score >= 5 && researchN === 0 && paperN === 0) p -= 8;

  // Soft blend: real peer rate > official rate > synthetic rate
  if (admitRate != null && (peerReal.length >= 5 || realAll.length >= 5)) {
    p = p * 0.65 + admitRate * 100 * 0.35;
  } else if (admitRate != null && peerSynth.length >= 5) {
    p = p * 0.75 + admitRate * 100 * 0.25;
  }
  if (school.admitRateOfficial != null) {
    p = p * 0.9 + school.admitRateOfficial * 100 * 0.1;
  }

  if (gap >= 3) p = Math.min(p, 12);
  else if (gap === 2) p = Math.min(p, 22);
  else if (gap === 1) p = Math.min(p, 40);
  if (gap <= -1) p = Math.max(p, 45);

  p = clamp(p, 3, 92);

  const realN = realAll.length;
  const spread =
    peerReal.length >= 8 ? 5 : peerReal.length >= 5 ? 7 : realN >= 5 ? 9 : 12;
  const low = clamp(Math.round(p - spread), 2, 90);
  const high = clamp(Math.round(p + spread), low + 2, 95);
  const mid = Math.round((low + high) / 2);

  let category: CalibratedResult["category"];
  if (gap >= 1 || mid < 35) category = "冲刺";
  else if (mid >= 60 && gap <= 0) category = "保底";
  else category = "匹配";
  if (mid < 30) category = "冲刺";
  if (mid >= 65 && gap <= 0) category = "保底";

  const evidence: EvidenceItem[] = [
    {
      type: "official_threshold",
      title: "项目门槛（库内近似/公开口径）",
      detail: `${school.name} ${school.program}：minGPA ${school.minGpa}，均分约 ${school.avgGpa}，TOEFL≥${school.minToefl ?? "—"}，IELTS≥${school.minIelts ?? "—"}。备注：${school.admissionRequirements.slice(0, 160)}`,
      weight: "硬约束",
    },
  ];

  if (school.admitRateOfficial != null) {
    evidence.push({
      type: "official_admit_rate",
      title: "公开/近似录取率（可引用）",
      detail: `约 ${(school.admitRateOfficial * 100).toFixed(0)}%（${school.admitRateYear ?? "年份未标"}）。${school.admitRateSource ?? ""}。注意：多为项目/学院口径近似，非个人保证。`,
      weight: "参考",
    });
  }

  if (school.admitRateGradcafe != null && school.gradcafeSampleSize) {
    evidence.push({
      type: "gradcafe_rate",
      title: "GradCafe 自报样本录取率",
      detail: `本项目库内 GradCafe 样本 n=${school.gradcafeSampleSize}，自报录取率约 ${(school.admitRateGradcafe * 100).toFixed(0)}%。自报有幸存者偏差，仅作旁证。`,
      weight: "旁证",
    });
  }

  evidence.push(
    {
      type: "selectivity",
      title: "选择性与本科档次差",
      detail: `本科「${undergrad.label}」(${undergrad.score}/5) vs 项目「${difficulty.label}」(${difficulty.score}/5)，档次差 gap=${gap}（>0 为冲刺）。依据：${undergrad.source} + ${difficulty.source}`,
      weight: "主权重",
    },
    {
      type: "major_fit",
      title: "专业匹配",
      detail: `${major.label}（fit=${major.score}）。申请人专业：${input.undergradMajor} → 目标 field=${school.field}`,
      weight: "中",
    },
    {
      type: "peer_cases",
      title: "案例样本",
      detail: `${caseSource}。使用 n=${useCases.length}${admitRate != null ? `，同池录取率约 ${(admitRate * 100).toFixed(0)}%` : ""}。真实案例优先于合成脱敏样本。`,
      weight: peerReal.length >= 5 ? "中高" : realN >= 5 ? "中" : "低",
    },
    {
      type: "profile",
      title: "成绩与材料信号",
      detail: `GPA ${input.gpa}（相对均分 ${gpaDelta >= 0 ? "+" : ""}${gpaDelta.toFixed(2)}）；语言 TOEFL ${input.toefl ?? "—"} / IELTS ${input.ielts ?? "—"}；简历信号 research=${researchN}, papers=${paperN}, internships=${internN}`,
      weight: "中",
    },
    {
      type: "disclaimer",
      title: "非官方声明",
      detail:
        "本结果为顾问口径估算（冲刺/匹配/保底 + 区间），不是院校官方个人录取决定。GradCafe 为申请人自报；公开录取率为历史/近似统计。录取还取决于推荐信、文书、套磁、名额与当年竞争池。",
      weight: "必读",
    }
  );

  return {
    probability: mid,
    range: { low, high },
    category,
    evidence,
    undergrad,
    difficulty,
    major,
    gap,
    peerCaseStats: {
      n: useCases.length,
      admitRate,
      source: caseSource,
      realN,
    },
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
