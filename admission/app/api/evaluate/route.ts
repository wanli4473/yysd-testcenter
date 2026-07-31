import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { evaluateSchema } from "@/lib/validate";
import { checkHardGate } from "@/lib/hard-gate";
import { calibrateAdmission } from "@/lib/calibrate";
import { buildProfileText, findSimilarCases, resolveSameSchoolCaseIds } from "@/lib/similar";
import { parseResumeFeatures } from "@/lib/resume";
import { extractResumeText, hintFromResume } from "@/lib/resume-file";
import { parseJsonFromLLM, qwenChat } from "@/lib/qwen";
import { classifyUndergrad } from "@/lib/undergrad-tier";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnalysisShape = {
  analysis: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  comparison: string;
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, unknown>;

    if (contentType.includes("multipart/form-data")) {
      body = await parseMultipart(req);
    } else {
      body = await req.json();
    }

    // Resume hints can override empty/generic form fields
    if (typeof body.resumeText === "string" && body.resumeText.trim()) {
      const hint = hintFromResume(body.resumeText);
      if (hint.gpa != null && (body.gpa == null || body.gpa === "")) {
        body.gpa = hint.gpa;
      }
      if (hint.undergradSchool) body.undergradSchool = hint.undergradSchool;
      if (hint.undergradMajor) body.undergradMajor = hint.undergradMajor;
    }

    const parsed = evaluateSchema.safeParse({
      ...body,
      gpa: num(body.gpa),
      toefl: body.toefl == null || body.toefl === "" ? null : num(body.toefl),
      ielts: body.ielts == null || body.ielts === "" ? null : num(body.ielts),
      gre: body.gre == null || body.gre === "" ? null : num(body.gre),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数校验失败", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const school = await prisma.school.findUnique({
      where: { id: input.targetSchoolId },
    });
    if (!school) {
      return NextResponse.json({ error: "学校不存在" }, { status: 404 });
    }

    let resumeFeatures = null;
    if (input.resumeText?.trim()) {
      try {
        resumeFeatures = await parseResumeFeatures(input.resumeText);
      } catch {
        resumeFeatures = null;
      }
    }

    const gate = checkHardGate(school, input);
    if (!gate.ok) {
      const analysis = {
        strengths: [] as string[],
        weaknesses: gate.reasons,
        suggestions: ["先满足该校硬性最低要求后再评估匹配度"],
      };
      const ug = classifyUndergrad(input.undergradSchool);
      await prisma.userQuery.create({
        data: {
          targetSchoolId: school.id,
          userBackground: sanitizeBackground(input, resumeFeatures),
          resultProbability: 0,
          analysisText: JSON.stringify({ analysis, comparison: gate.reasons.join("；") }),
        },
      });
      return NextResponse.json({
        probability: 0,
        range: { low: 0, high: 0 },
        category: "冲刺",
        analysis,
        comparison: gate.reasons.join("；"),
        similar_cases: [],
        evidence: [
          {
            type: "hard_gate",
            title: "未过硬门槛",
            detail: gate.reasons.join("；"),
            weight: "一票否决",
          },
          {
            type: "undergrad",
            title: "本科档次",
            detail: `${ug.label} (${ug.score}/5)`,
          },
        ],
        rejected: true,
        calibrated: true,
      });
    }

    const tags = [
      ...(input.backgroundTags || []),
      ...(resumeFeatures?.tags || []),
    ];
    const profileText = buildProfileText(input, tags, resumeFeatures);
    const ugScore = classifyUndergrad(input.undergradSchool).score;

    const yearFrom = new Date().getFullYear() - 2;
    // Calibration may use peer schools internally; similar-cases UI never does.
    let cases = await prisma.case.findMany({
      where: {
        schoolId: school.id,
        OR: [{ source: { in: ["gradcafe", "manual"] } }, { year: { gte: yearFrom } }],
      },
      take: 200,
      orderBy: { year: "desc" },
    });
    const realN = cases.filter((c) => c.source === "gradcafe" || c.source === "manual").length;
    if (cases.length < 8 || realN < 5) {
      const peers = await prisma.school.findMany({
        where: {
          country: school.country,
          field: school.field,
          tier: school.tier,
        },
        select: { id: true },
        take: 40,
      });
      cases = await prisma.case.findMany({
        where: {
          schoolId: { in: peers.map((p) => p.id) },
          OR: [{ source: { in: ["gradcafe", "manual"] } }, { year: { gte: yearFrom } }],
        },
        take: 200,
        orderBy: { year: "desc" },
      });
    }

    const calibrated = calibrateAdmission({
      school,
      input,
      cases,
      resume: resumeFeatures,
    });

    const { ids: similarIds, scope: similarScope } = await resolveSameSchoolCaseIds(school);
    const similar =
      similarScope === "none"
        ? []
        : await findSimilarCases(
            similarIds,
            profileText,
            tags,
            input.gpa,
            ugScore,
            5,
            school.id
          );

    let analysis: AnalysisShape["analysis"] = {
      strengths: [],
      weaknesses: [],
      suggestions: [],
    };
    let comparison = "";

    try {
      const prompt = [
        `目标：${school.country} ${school.name} / ${school.program} (${school.degree}) field=${school.field}`,
        `【已由校准引擎锁定，禁止你修改数字】category=${calibrated.category}，probability≈${calibrated.probability}%，区间 ${calibrated.range.low}-${calibrated.range.high}%`,
        `档次：本科 ${calibrated.undergrad.label} vs 项目 ${calibrated.difficulty.label}，gap=${calibrated.gap}`,
        `专业匹配：${calibrated.major.label}`,
        `门槛：minGPA=${school.minGpa} avgGPA=${school.avgGpa} TOEFL>=${school.minToefl ?? "-"} IELTS>=${school.minIelts ?? "-"}`,
        `申请人：${profileText}`,
        `相似案例（优先真实 GradCafe）：${JSON.stringify(
          similar.map((c) => ({
            year: c.year,
            gpa: c.gpa,
            result: c.admissionResult ? "admit" : "reject",
            undergrad: c.undergradSchool,
            peerBand: c.peerBand,
            source: c.source,
            desc: c.description,
          }))
        )}`,
        `只返回 JSON：{"analysis":{"strengths":[],"weaknesses":[],"suggestions":[]},"comparison":"..."}`,
        `要求：解释为何是${calibrated.category}；勿给出与锁定概率矛盾的成功预期；点名本科档次与专业匹配问题。`,
      ].join("\n");

      const raw = await qwenChat(
        [
          {
            role: "system",
            content:
              "你是资深留学顾问。概率与冲刺/匹配/保底已由规则引擎锁定，你只写分析与对比，禁止输出 probability 字段，禁止暗示更高把握。",
          },
          { role: "user", content: prompt },
        ],
        { temperature: 0.25, maxTokens: 1200 }
      );
      const ai = parseJsonFromLLM<AnalysisShape>(raw);
      analysis = ai.analysis || analysis;
      comparison = ai.comparison || comparison;
    } catch {
      comparison = `校准结果：${calibrated.category}，估算区间 ${calibrated.range.low}–${calibrated.range.high}%（点估计 ${calibrated.probability}%）。依据见 evidence。`;
      analysis = {
        strengths:
          calibrated.gap <= 0
            ? ["成绩已过该校硬门槛，与项目选择性差距不大"]
            : ["已通过最低硬性门槛，具备提交申请的基本资格"],
        weaknesses:
          calibrated.gap >= 2
            ? [
                "本科档次与目标项目选择性差距较大，竞争池中同档背景占比更高",
                calibrated.major.score < 0.7
                  ? "专业匹配一般，相对强 CS/统计背景申请人处于劣势"
                  : "科研/论文深度可能不足以支撑顶尖项目",
              ]
            : ["需用文书与推荐信证明相对同类申请人的区分度"],
        suggestions: [
          "优先补强与目标项目对齐的量化/科研成果",
          "按冲刺/匹配/保底组合学校，避免全申同一档",
        ],
      };
    }

    await prisma.userQuery.create({
      data: {
        targetSchoolId: school.id,
        userBackground: sanitizeBackground(input, resumeFeatures),
        resultProbability: calibrated.probability,
        analysisText: JSON.stringify({
          analysis,
          comparison,
          range: calibrated.range,
          category: calibrated.category,
          evidence: calibrated.evidence,
        }),
      },
    });

    return NextResponse.json({
      probability: calibrated.probability,
      range: calibrated.range,
      category: calibrated.category,
      analysis,
      comparison,
      similar_cases: similar,
      similar_scope: similarScope,
      evidence: calibrated.evidence,
      meta: {
        undergrad: calibrated.undergrad,
        difficulty: calibrated.difficulty,
        major: calibrated.major,
        gap: calibrated.gap,
        peerCaseStats: calibrated.peerCaseStats,
        similarScope,
      },
      rejected: false,
      calibrated: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) throw new Error("数值字段无效");
  return n;
}

function sanitizeBackground(
  input: {
    gpa: number;
    toefl?: number | null;
    ielts?: number | null;
    gre?: number | null;
    undergradSchool: string;
    undergradMajor: string;
  },
  resumeFeatures: unknown
) {
  return {
    gpa: input.gpa,
    toefl: input.toefl ?? null,
    ielts: input.ielts ?? null,
    gre: input.gre ?? null,
    undergradSchool: input.undergradSchool,
    undergradMajor: input.undergradMajor,
    resumeFeatures: resumeFeatures ?? null,
  };
}

async function parseMultipart(req: NextRequest) {
  const form = await req.formData();
  const body: Record<string, unknown> = {};
  for (const [k, v] of Array.from(form.entries())) {
    if (k === "resume" && v instanceof File) {
      if (v.size > 5 * 1024 * 1024) throw new Error("简历请小于 5MB");
      const buf = Buffer.from(await v.arrayBuffer());
      body.resumeText = await extractResumeText(buf, v.name);
      continue;
    }
    body[k] = typeof v === "string" ? v : String(v);
  }
  return body;
}
