import { prisma } from "@/lib/db";
import { qwenChat } from "@/lib/qwen";
import { FIELD_LABELS, type Field } from "@/lib/catalog-labels";
import {
  type AdvisorBackground,
  fitNotes,
  fitPenalty,
} from "@/lib/advisor-bg";

export type AdvisorProgramHit = {
  id: string;
  program: string;
  programZh: string | null;
  degree: string;
  field: string;
  fieldLabel: string;
  blurb: string | null;
  duration: string | null;
  isStem: boolean | null;
  why: string;
  fitNotes?: string[];
};

function scoreProgram(
  query: string,
  p: {
    program: string;
    programZh: string | null;
    field: string;
    blurb: string | null;
    summaryOfficial: string | null;
    admissionRequirements: string;
  }
): number {
  const q = query.toLowerCase();
  const bag = [
    p.program,
    p.programZh || "",
    p.field,
    FIELD_LABELS[p.field as Field] || "",
    p.blurb || "",
    p.summaryOfficial || "",
    p.admissionRequirements,
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const tokens = q
    .split(/[\s,，、/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  for (const t of tokens) {
    if (bag.includes(t)) score += 3;
  }

  const aliases: Array<[RegExp, string[]]> = [
    [/数据|分析|analytics|data/i, ["data", "analytics", "统计", "data science", "business analytics"]],
    [/人工.?智能|机器学习|ai\b|machine learning/i, ["artificial intelligence", "machine learning", "ai", "数据"]],
    [/计算机|软件|编程|cs\b|coding|software/i, ["computer science", "software", "cyber"]],
    [/金融|量化|finance|quant/i, ["finance", "financial engineering", "金融"]],
    [/商科|管理|mba|business/i, ["business", "management", "analytics"]],
    [/电气|电子|工程|ee\b|engineering/i, ["electrical", "mechanical", "engineering"]],
    [/设计|艺术|design|media/i, ["design", "media"]],
    [/法律|llm|law/i, ["law", "llm"]],
    [/教育|education/i, ["education"]],
    [/公共.?卫生|生物|健康|health|bio/i, ["public health", "biotech", "biology"]],
    [/数学|物理|理科|math|physics/i, ["mathematics", "physics"]],
    [/国际.?关系|社科|社会/i, ["international relations", "sociology"]],
  ];
  for (const [re, keys] of aliases) {
    if (re.test(query)) {
      for (const k of keys) {
        if (bag.includes(k.toLowerCase())) score += 4;
      }
    }
  }
  return score;
}

export async function matchProgramsForSchool(
  schoolName: string,
  userMessage: string,
  limit = 8,
  background?: AdvisorBackground | null
): Promise<{ reply: string; programs: AdvisorProgramHit[]; needClarify: boolean }> {
  const programs = await prisma.school.findMany({
    where: { name: schoolName },
    orderBy: [{ tier: "asc" }, { program: "asc" }],
  });

  const verified = programs.filter((p) => p.verifiedAt != null);
  // ponytail: Top schools hide template filler once any verified row exists
  const pool = verified.length ? verified : programs;

  if (!pool.length) {
    return {
      reply: `库中暂无 ${schoolName} 的研究生项目，请换一所学校或稍后重试。`,
      programs: [],
      needClarify: false,
    };
  }

  function toHit(p: (typeof pool)[number], why: string): AdvisorProgramHit {
    const notes = fitNotes(p, background);
    return {
      id: p.id,
      program: p.program,
      programZh: p.programZh,
      degree: p.degree,
      field: p.field,
      fieldLabel: FIELD_LABELS[p.field as Field] || p.field,
      blurb: p.blurb,
      duration: p.duration,
      isStem: p.isStem,
      why: notes.length ? `${why}；${notes[0]}` : why,
      fitNotes: notes,
    };
  }

  const scored = pool
    .map((p) => {
      const interest = scoreProgram(userMessage, p);
      const notes = fitNotes(p, background);
      return { p, score: interest, penalty: fitPenalty(notes) };
    })
    .sort((a, b) => b.score - a.score || a.penalty - b.penalty);

  const topScore = scored[0]?.score ?? 0;
  const needClarify = topScore < 3 || userMessage.trim().length < 4;

  if (needClarify) {
    if (verified.length) {
      return {
        reply:
          "可以再说具体一点吗？例如：数据科学 / 人工智能 / 商业分析 / 工程管理。下面先列出该校已核验的研究生项目，供你浏览（该校未必有传统「计算机 MS」开放项目）。",
        programs: verified.slice(0, limit).map((p) => toHit(p, "该校已核验项目")),
        needClarify: true,
      };
    }
    return {
      reply:
        "可以再说具体一点吗？例如：数据科学 / 人工智能 / 计算机 / 金融工程 / 商业分析 / 电气工程。也可以用一句话描述兴趣方向（偏量化、偏软件开发、偏公共政策等）。",
      programs: [],
      needClarify: true,
    };
  }

  const hits = scored.filter((s) => s.score > 0).slice(0, limit);
  const use = hits.length ? hits : scored.slice(0, Math.min(5, scored.length));
  const mapped = use.map(({ p, score }) =>
    toHit(p, score > 0 ? "与你的兴趣描述匹配" : "该校热门研究生项目（相关度一般，供浏览）")
  );

  let reply = `根据你的兴趣${background ? "与背景" : ""}，我在「${schoolName}」项目库中筛选了以下相关专业。请结合适配提示查看详情，合适可直接申请评估。`;

  try {
    const raw = await qwenChat(
      [
        {
          role: "system",
          content:
            "你是留学选校顾问助手。只能基于给定的项目列表做推荐解释，禁止编造列表外的专业。若提供了申请背景，可简要提及 GPA/语言与门槛的匹配关系，但不要编造未给出的分数。用简体中文，2–4 句，语气专业简洁。",
        },
        {
          role: "user",
          content: JSON.stringify({
            school: schoolName,
            interest: userMessage,
            background: background
              ? {
                  gpa: background.gpa,
                  toefl: background.toefl,
                  ielts: background.ielts,
                  undergradSchool: background.undergradSchool,
                  undergradMajor: background.undergradMajor,
                }
              : null,
            programs: mapped.map((m) => ({
              zh: m.programZh,
              en: m.program,
              degree: m.degree,
              field: m.fieldLabel,
              fit: m.fitNotes,
            })),
          }),
        },
      ],
      { temperature: 0.3, maxTokens: 400 }
    );
    if (raw.trim()) reply = raw.trim();
  } catch {
    /* keep template reply */
  }

  return { reply, programs: mapped, needClarify: false };
}
