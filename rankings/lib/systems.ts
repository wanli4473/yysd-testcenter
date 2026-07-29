export type SystemKey = "qs" | "the" | "arwu" | "usnews";

export type SystemMeta = {
  key: SystemKey;
  name: string;
  shortName: string;
  sourceUrl: string;
  sourceHost: string;
  started: number;
  latestYear: number;
  blurb: string;
  method: string;
};

export const SYSTEMS: Record<SystemKey, SystemMeta> = {
  qs: {
    key: "qs",
    name: "QS 世界大学排名",
    shortName: "QS",
    sourceUrl: "https://www.topuniversities.com",
    sourceHost: "www.topuniversities.com",
    started: 2004,
    latestYear: 2027,
    blurb:
      "由 Quacquarelli Symonds 发布，从学术声誉、雇主声誉、师生比、引用率、国际教员与国际学生比例等维度评估全球大学。",
    method:
      "学术声誉与雇主声誉合计权重较高；另含师生比、单位教员引用、国际教师/学生比例及可持续发展等指标。",
  },
  the: {
    key: "the",
    name: "泰晤士高等教育世界大学排名",
    shortName: "THE",
    sourceUrl: "https://www.timeshighereducation.com",
    sourceHost: "www.timeshighereducation.com",
    started: 2004,
    latestYear: 2026,
    blurb:
      "由《泰晤士高等教育》发布，从教学、研究环境、研究质量、产业与国际展望等维度评估研究型大学。",
    method:
      "教学、研究环境、研究质量、产业收入、国际展望共 13 项绩效指标；引文数据常与 Scopus 合作。",
  },
  arwu: {
    key: "arwu",
    name: "软科世界大学学术排名",
    shortName: "ARWU",
    sourceUrl: "https://www.shanghairanking.com",
    sourceHost: "www.shanghairanking.com",
    started: 2003,
    latestYear: 2025,
    blurb:
      "由上海软科发布，侧重诺奖/菲尔兹奖、高被引学者、Nature/Science 与 SCI/SSCI 等客观学术产出。",
    method:
      "获奖校友与教员、高被引学者、Nature & Science、论文数量与生均学术表现等可核验指标。",
  },
  usnews: {
    key: "usnews",
    name: "U.S. News 全球最佳大学排名",
    shortName: "US News",
    sourceUrl: "https://www.usnews.com",
    sourceHost: "www.usnews.com",
    started: 2014,
    latestYear: 2027,
    blurb:
      "由《美国新闻与世界报道》发布，聚焦全球研究声誉、发表、引用与国际合作等研究表现。",
    method:
      "全球/区域研究声誉、发表与会议、归一化引用、高被引论文、国际合作等约 13 项指标。",
  },
};

export const SYSTEM_ORDER: SystemKey[] = ["qs", "the", "arwu", "usnews"];

export const COUNTRY_LABELS: Record<string, string> = {
  US: "美国",
  UK: "英国",
  CA: "加拿大",
  AU: "澳大利亚",
  CN: "中国",
  HK: "中国香港",
  SG: "新加坡",
  JP: "日本",
  KR: "韩国",
  DE: "德国",
  FR: "法国",
  CH: "瑞士",
  NL: "荷兰",
  SE: "瑞典",
  OTHER: "其他",
};

export function countryLabel(code: string): string {
  return COUNTRY_LABELS[code] || code;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
