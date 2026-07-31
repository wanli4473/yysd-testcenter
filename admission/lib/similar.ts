import { prisma } from "./db";
import { qwenEmbed } from "./qwen";
import type { EvaluateInput } from "./validate";
import { caseUndergradScore } from "./undergrad-tier";

export type SimilarCase = {
  id: string;
  gpa: number;
  toefl: number | null;
  ielts: number | null;
  gre: number | null;
  undergradSchool: string;
  undergradMajor: string;
  backgroundTags: unknown;
  admissionResult: boolean;
  year: number;
  description: string;
  similarity: number;
  peerBand?: boolean;
  source?: string;
  caseProgram?: string;
  caseDegree?: string;
  sameProgram?: boolean;
};

export type SimilarScope = "program" | "field" | "school" | "none";

/**
 * B: same school only. Prefer exact program → same field → any program at that university.
 * Never expands to other universities.
 */
export async function resolveSameSchoolCaseIds(school: {
  id: string;
  name: string;
  field: string;
}): Promise<{ ids: string[]; scope: SimilarScope }> {
  const realHere = await prisma.case.count({
    where: { schoolId: school.id, source: { in: ["gradcafe", "manual"] } },
  });
  if (realHere >= 3) return { ids: [school.id], scope: "program" };

  const fieldRows = await prisma.school.findMany({
    where: { name: school.name, field: school.field },
    select: { id: true },
  });
  const fieldIds = fieldRows.map((r) => r.id);
  const realField = await prisma.case.count({
    where: { schoolId: { in: fieldIds }, source: { in: ["gradcafe", "manual"] } },
  });
  if (realField >= 1) return { ids: fieldIds, scope: "field" };

  const schoolRows = await prisma.school.findMany({
    where: { name: school.name },
    select: { id: true },
  });
  const ids = schoolRows.map((r) => r.id);
  const realSchool = await prisma.case.count({
    where: { schoolId: { in: ids }, source: { in: ["gradcafe", "manual"] } },
  });
  if (realSchool >= 1) return { ids, scope: "school" };
  return { ids: [school.id], scope: "none" };
}

export function buildProfileText(
  input: EvaluateInput,
  tags: string[],
  resumeFeatures?: Record<string, unknown> | null
): string {
  const parts = [
    `Undergrad: ${input.undergradSchool}, ${input.undergradMajor}`,
    `GPA ${input.gpa}`,
    input.toefl != null ? `TOEFL ${input.toefl}` : "",
    input.ielts != null ? `IELTS ${input.ielts}` : "",
    input.gre != null ? `GRE ${input.gre}` : "",
    tags.length ? `Tags: ${tags.join(", ")}` : "",
  ];
  if (resumeFeatures) {
    parts.push(`Resume features: ${JSON.stringify(resumeFeatures)}`);
  }
  return parts.filter(Boolean).join(". ");
}

/** Display similar cases: real GradCafe/manual only, never synthetic. */
export async function findSimilarCases(
  schoolIds: string[],
  profileText: string,
  tags: string[],
  gpa: number,
  applicantUndergradScore: number,
  limit = 5,
  targetSchoolId?: string
): Promise<SimilarCase[]> {
  const ids = schoolIds.length ? schoolIds : [];
  if (!ids.length) return [];

  try {
    const emb = await qwenEmbed(profileText);
    const vec = `[${emb.join(",")}]`;
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        gpa: number;
        toefl: number | null;
        ielts: number | null;
        gre: number | null;
        undergrad_school: string;
        undergrad_major: string;
        background_tags: unknown;
        admission_result: boolean;
        year: number;
        description: string;
        source: string;
        school_id: string;
        program: string;
        degree: string;
        distance: number;
      }>
    >(
      `SELECT c.id, c.gpa, c.toefl, c.ielts, c.gre, c.undergrad_school, c.undergrad_major,
              c.background_tags, c.admission_result, c.year, c.description, c.source,
              c.school_id, s.program, s.degree,
              (c.embedding <=> $1::vector) AS distance
       FROM cases c
       JOIN schools s ON s.id = c.school_id
       WHERE c.school_id = ANY($2::text[])
         AND c.embedding IS NOT NULL
         AND c.source IN ('gradcafe', 'manual')
       ORDER BY
         CASE WHEN c.school_id = $4 THEN 0 ELSE 1 END,
         c.embedding <=> $1::vector
       LIMIT $3`,
      vec,
      ids,
      Math.max(limit * 4, 20),
      targetSchoolId || ids[0]
    );
    if (rows.length) {
      return rows.slice(0, limit).map((r) => {
        const base = Math.max(0, Math.min(1, 1 - Number(r.distance)));
        return {
          id: r.id,
          gpa: r.gpa,
          toefl: r.toefl,
          ielts: r.ielts,
          gre: r.gre,
          undergradSchool: r.undergrad_school,
          undergradMajor: r.undergrad_major,
          backgroundTags: r.background_tags,
          admissionResult: r.admission_result,
          year: r.year,
          description: r.description,
          source: r.source,
          similarity: Math.min(1, base + 0.08),
          peerBand:
            Math.abs(
              caseUndergradScore(r.undergrad_school) - applicantUndergradScore
            ) <= 1,
          caseProgram: r.program,
          caseDegree: r.degree,
          sameProgram: targetSchoolId ? r.school_id === targetSchoolId : true,
        };
      });
    }
  } catch {
    /* fall through */
  }
  return tagFallback(ids, tags, gpa, applicantUndergradScore, limit, targetSchoolId);
}

async function tagFallback(
  schoolIds: string[],
  tags: string[],
  gpa: number,
  applicantUndergradScore: number,
  limit: number,
  targetSchoolId?: string
): Promise<SimilarCase[]> {
  const cases = await prisma.case.findMany({
    where: {
      schoolId: { in: schoolIds },
      source: { in: ["gradcafe", "manual"] },
    },
    include: { school: { select: { program: true, degree: true } } },
    take: 220,
    orderBy: { year: "desc" },
  });
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const scored = cases.map((c) => {
    const ct = Array.isArray(c.backgroundTags)
      ? (c.backgroundTags as string[]).map((t) => String(t).toLowerCase())
      : [];
    const inter = ct.filter((t) => tagSet.has(t)).length;
    const union = new Set([...tagSet, ...ct]).size || 1;
    const jaccard = inter / union;
    const gpaSim = 1 - Math.min(1, Math.abs(c.gpa - gpa) / 1.5);
    const band =
      Math.abs(caseUndergradScore(c.undergradSchool) - applicantUndergradScore) <=
      1;
    let similarity = tagSet.size ? jaccard * 0.5 + gpaSim * 0.3 : gpaSim;
    if (band) similarity += 0.2;
    else similarity -= 0.15;
    similarity += 0.25;
    if (targetSchoolId && c.schoolId === targetSchoolId) similarity += 0.1;
    return { c, similarity, peerBand: band };
  });
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit).map(({ c, similarity, peerBand }) => ({
    id: c.id,
    gpa: c.gpa,
    toefl: c.toefl,
    ielts: c.ielts,
    gre: c.gre,
    undergradSchool: c.undergradSchool,
    undergradMajor: c.undergradMajor,
    backgroundTags: c.backgroundTags,
    admissionResult: c.admissionResult,
    year: c.year,
    description: c.description,
    source: c.source,
    similarity: Math.round(Math.max(0, similarity) * 100) / 100,
    peerBand,
    caseProgram: c.school.program,
    caseDegree: c.school.degree,
    sameProgram: targetSchoolId ? c.schoolId === targetSchoolId : true,
  }));
}
