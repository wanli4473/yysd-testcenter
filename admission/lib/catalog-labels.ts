export const COUNTRIES = ["US", "UK", "CA", "AU"] as const;
export type Country = (typeof COUNTRIES)[number];

export const FIELDS = [
  "cs",
  "engineering",
  "data_ai",
  "business",
  "finance",
  "science",
  "life_health",
  "arts_design",
  "social",
  "education",
  "law",
  "other",
] as const;
export type Field = (typeof FIELDS)[number];

export const COUNTRY_LABELS: Record<Country, string> = {
  US: "美国",
  UK: "英国",
  CA: "加拿大",
  AU: "澳大利亚",
};

export const FIELD_LABELS: Record<Field, string> = {
  cs: "计算机",
  engineering: "工程",
  data_ai: "数据/AI",
  business: "商科",
  finance: "金融",
  science: "理科",
  life_health: "生命健康",
  arts_design: "艺术设计",
  social: "社科",
  education: "教育",
  law: "法学",
  other: "其他",
};
