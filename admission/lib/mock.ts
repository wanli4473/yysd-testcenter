import type { SimilarCase } from "./similar";

export const MOCK_EVAL = {
  probability: 16,
  range: { low: 8, high: 24 },
  category: "冲刺" as const,
  calibrated: true,
  analysis: {
    strengths: ["已过最低硬门槛", "具备实习与数据分析经历"],
    weaknesses: ["本科档次与顶尖 DS 项目差距大", "科研/论文深度不足"],
    suggestions: ["降低冲刺校占比", "补强量化科研产出"],
  },
  comparison: "同档背景在顶尖项目录取率显著偏低。",
  evidence: [
    {
      type: "selectivity",
      title: "选择性与本科档次差",
      detail: "美本州立旗舰 vs 顶尖极难项目，gap≥2",
      weight: "主权重",
    },
    {
      type: "disclaimer",
      title: "非官方声明",
      detail: "顾问口径估算，非院校官方录取率。",
      weight: "必读",
    },
  ],
  similar_cases: [
    {
      id: "mock-1",
      gpa: 3.5,
      toefl: 105,
      ielts: null,
      gre: null,
      undergradSchool: "某211高校",
      undergradMajor: "Data Science",
      backgroundTags: ["internship"],
      admissionResult: false,
      year: 2025,
      description: "脱敏案例：同档背景申请顶尖 DS，多数被拒。",
      similarity: 0.7,
      peerBand: true,
    },
  ] satisfies SimilarCase[],
};
