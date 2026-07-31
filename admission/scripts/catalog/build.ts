import {
  type Country,
  type Field,
  type SchoolSeed,
  slugify,
} from "./fields";
import { isVerifiedSchool } from "../../data/verified-programs";

export type Institution = {
  name: string;
  country: Country;
  city: string;
  tier: number;
  website: string;
  fields: Field[];
};

type ProgMeta = {
  program: string;
  programZh: string;
  degreeUS: string;
  degreeUK: string;
  isStem: boolean;
  durationUS: string;
  durationUK: string;
  blurb: string;
};

/** Multiple graduate programs per field — curated catalog approximating common official offerings */
const PROGRAMS_BY_FIELD: Record<Field, ProgMeta[]> = {
  cs: [
    {
      program: "Computer Science",
      programZh: "计算机科学",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1.5–2 years",
      durationUK: "1 year",
      blurb: "系统、算法、软件与计算理论方向的研究生课程。",
    },
    {
      program: "Software Engineering",
      programZh: "软件工程",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "面向软件设计、工程实践与大型系统交付的专业学位。",
    },
    {
      program: "Cybersecurity",
      programZh: "网络安全",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "安全体系、攻防与隐私保护相关研究生项目。",
    },
  ],
  engineering: [
    {
      program: "Electrical Engineering",
      programZh: "电气工程",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1.5–2 years",
      durationUK: "1 year",
      blurb: "电子、通信、电力与控制系统等方向。",
    },
    {
      program: "Mechanical Engineering",
      programZh: "机械工程",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1.5–2 years",
      durationUK: "1 year",
      blurb: "力学、制造、热流与机电一体化方向。",
    },
  ],
  data_ai: [
    {
      program: "Data Science",
      programZh: "数据科学",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "统计、机器学习与数据工程交叉的应用型研究生项目。",
    },
    {
      program: "Artificial Intelligence",
      programZh: "人工智能",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "机器学习、深度学习与智能系统方向。",
    },
    {
      program: "Business Analytics",
      programZh: "商业分析",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1–1.5 years",
      durationUK: "1 year",
      blurb: "数据分析驱动商业决策的跨学科项目（偏应用）。",
    },
  ],
  business: [
    {
      program: "Business Analytics",
      programZh: "商业分析",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: false,
      durationUS: "1–1.5 years",
      durationUK: "1 year",
      blurb: "数据与管理结合的商科研究生项目。",
    },
    {
      program: "Management",
      programZh: "管理学",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: false,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "组织管理、战略与领导力方向。",
    },
  ],
  finance: [
    {
      program: "Finance",
      programZh: "金融",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: false,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "公司金融、资产定价与金融市场方向。",
    },
    {
      program: "Financial Engineering",
      programZh: "金融工程",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1–1.5 years",
      durationUK: "1 year",
      blurb: "量化金融、衍生品与风险管理方向。",
    },
  ],
  science: [
    {
      program: "Physics",
      programZh: "物理学",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1.5–2 years",
      durationUK: "1 year",
      blurb: "物理学研究型或授课型研究生项目。",
    },
    {
      program: "Mathematics",
      programZh: "数学",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1.5–2 years",
      durationUK: "1 year",
      blurb: "纯数/应用数学方向研究生课程。",
    },
  ],
  life_health: [
    {
      program: "Public Health",
      programZh: "公共卫生",
      degreeUS: "MPH",
      degreeUK: "MSc",
      isStem: false,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "流行病学、健康政策与公共卫生实践。",
    },
    {
      program: "Biotechnology",
      programZh: "生物技术",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: true,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "生物技术研发与产业应用方向。",
    },
  ],
  arts_design: [
    {
      program: "Design",
      programZh: "设计",
      degreeUS: "MDes",
      degreeUK: "MA",
      isStem: false,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "产品/交互/视觉等设计类研究生项目。",
    },
    {
      program: "Media Studies",
      programZh: "媒体研究",
      degreeUS: "MA",
      degreeUK: "MA",
      isStem: false,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "媒体、传播与数字文化方向。",
    },
  ],
  social: [
    {
      program: "International Relations",
      programZh: "国际关系",
      degreeUS: "MA",
      degreeUK: "MSc",
      isStem: false,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "国际政治、外交与全球治理方向。",
    },
    {
      program: "Sociology",
      programZh: "社会学",
      degreeUS: "MA",
      degreeUK: "MSc",
      isStem: false,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "社会理论与实证研究方法方向。",
    },
  ],
  education: [
    {
      program: "Education",
      programZh: "教育学",
      degreeUS: "MEd",
      degreeUK: "MA",
      isStem: false,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "教育理论、课程与教学实践方向。",
    },
  ],
  law: [
    {
      program: "Law",
      programZh: "法学（LLM）",
      degreeUS: "LLM",
      degreeUK: "LLM",
      isStem: false,
      durationUS: "1 year",
      durationUK: "1 year",
      blurb: "法学硕士，常见于国际法/商法等细分方向。",
    },
  ],
  other: [
    {
      program: "Interdisciplinary Studies",
      programZh: "跨学科研究",
      degreeUS: "MS",
      degreeUK: "MSc",
      isStem: false,
      durationUS: "1–2 years",
      durationUK: "1 year",
      blurb: "跨学科定制型研究生项目。",
    },
  ],
};

function thresholds(country: Country, tier: number, field: Field) {
  const baseAvg = tier === 1 ? 3.75 : tier === 2 ? 3.55 : 3.35;
  const fieldBump =
    field === "cs" || field === "data_ai" || field === "finance" ? 0.08 : 0;
  const avgGpa = Math.min(3.95, baseAvg + fieldBump);
  const minGpa = Math.max(2.8, avgGpa - 0.45);

  if (country === "UK" || country === "AU") {
    return {
      avgGpa,
      minGpa,
      minToefl: null as number | null,
      minIelts: tier === 1 ? 7.0 : tier === 2 ? 6.5 : 6.0,
    };
  }
  return {
    avgGpa,
    minGpa,
    minToefl: tier === 1 ? 100 : tier === 2 ? 90 : 80,
    minIelts: tier === 1 ? 7.0 : 6.5,
  };
}

function tuitionNote(country: Country, tier: number): string {
  if (country === "US") {
    return tier === 1
      ? "约 USD 50,000–80,000 / 年（学费，因项目而异；以官网为准）"
      : tier === 2
        ? "约 USD 35,000–60,000 / 年（学费，因项目而异；以官网为准）"
        : "约 USD 25,000–45,000 / 年（学费，因项目而异；以官网为准）";
  }
  if (country === "UK") {
    return tier === 1
      ? "约 GBP 28,000–45,000 / 年（国际生学费，以官网为准）"
      : "约 GBP 20,000–35,000 / 年（国际生学费，以官网为准）";
  }
  if (country === "CA") {
    return "约 CAD 25,000–55,000 / 年（国际生学费，以官网为准）";
  }
  return "约 AUD 35,000–55,000 / 年（国际生学费，以官网为准）";
}

function greRequired(country: Country, field: Field, tier: number): boolean | null {
  if (country !== "US") return false;
  if (field === "arts_design" || field === "education") return false;
  if (tier === 1 && (field === "cs" || field === "data_ai" || field === "finance"))
    return null; // often optional now
  return null;
}

function deadline(country: Country): string {
  if (country === "US") return "常见轮次：12/15、1/15、2/1、3/15（以项目页为准）";
  if (country === "UK") return "常见：滚动录取或 1–3 月截止（以项目页为准）";
  if (country === "CA") return "常见：12–2 月截止（以项目页为准）";
  return "常见：10–12 月优先轮 / 次年 2 月（以项目页为准）";
}

export function expandInstitutions(list: Institution[]): SchoolSeed[] {
  const out: SchoolSeed[] = [];
  const seen = new Set<string>();

  for (const inst of list) {
    // Top schools use hand-verified catalog only (scripts/apply-verified.ts)
    if (isVerifiedSchool(inst.name)) continue;
    // All fields the school offers × up to 2 flagship programs each
    for (const field of inst.fields) {
      const progs = PROGRAMS_BY_FIELD[field] || PROGRAMS_BY_FIELD.other;
      for (const meta of progs.slice(0, 2)) {
        const ukish = inst.country === "UK" || inst.country === "AU";
        const degree = ukish ? meta.degreeUK : meta.degreeUS;
        const slug = slugify([inst.name, meta.program, degree, inst.country]);
        if (seen.has(slug)) continue;
        seen.add(slug);
        const t = thresholds(inst.country, inst.tier, field);
        const duration = ukish ? meta.durationUK : meta.durationUS;
        const lang =
          t.minToefl != null
            ? `TOEFL ≥ ${t.minToefl} 或同等 IELTS`
            : `IELTS ≥ ${t.minIelts}`;
        out.push({
          slug,
          name: inst.name,
          program: meta.program,
          programZh: meta.programZh,
          degree,
          country: inst.country,
          field,
          city: inst.city,
          avgGpa: t.avgGpa,
          minGpa: t.minGpa,
          minToefl: t.minToefl,
          minIelts: t.minIelts,
          gpaScale: 4.0,
          website: inst.website,
          officialUrl: inst.website,
          admissionRequirements: `${inst.name} ${meta.program}（${degree}）。建议 GPA ≥ ${t.minGpa.toFixed(1)}（4.0 制近似），均分参考约 ${t.avgGpa.toFixed(2)}；语言 ${lang}。细则以官网为准。`,
          tier: inst.tier,
          duration,
          tuitionNote: tuitionNote(inst.country, inst.tier),
          isStem: meta.isStem,
          greRequired: greRequired(inst.country, field, inst.tier),
          applicationDeadline: deadline(inst.country),
          blurb: meta.blurb,
          summaryOfficial: `${meta.programZh}（${meta.program}）是 ${inst.name} 常见的研究生授课/专业型项目之一，学制约 ${duration}。${meta.blurb}申请门槛与材料清单请以学校官方项目页为准；本站摘要用于顾问检索与对比，不替代官方通知。官方入口：${inst.website}`,
        });
      }
    }
  }
  return out;
}
