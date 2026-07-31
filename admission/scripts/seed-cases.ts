/**
 * Upsert catalog schools + ensure ~4 synthetic cases per school.
 * Usage: npm run seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { allSchoolSeeds, type Field } from "./catalog";

const prisma = new PrismaClient();
const CASES_PER_SCHOOL = 4;

const UNDERGRADS = [
  "某985高校",
  "某211高校",
  "某双一流高校",
  "某海外本科院校",
  "某地方重点大学",
  "某中外合作办学院校",
];

const MAJORS_BY_FIELD: Record<Field, string[]> = {
  cs: ["Computer Science", "Software Engineering", "Information Systems"],
  engineering: ["Electrical Engineering", "Mechanical Engineering", "Civil Engineering"],
  data_ai: ["Data Science", "Artificial Intelligence", "Statistics"],
  business: ["Business Administration", "Management", "Marketing"],
  finance: ["Finance", "Accounting", "Economics"],
  science: ["Physics", "Chemistry", "Mathematics"],
  life_health: ["Biology", "Public Health", "Biotechnology"],
  arts_design: ["Design", "Fine Arts", "Media Studies"],
  social: ["International Relations", "Sociology", "Political Science"],
  education: ["Education", "Applied Linguistics", "Psychology"],
  law: ["Law", "International Law", "Political Science"],
  other: ["Interdisciplinary Studies", "Liberal Arts"],
};

const TAGS_BY_FIELD: Record<Field, string[]> = {
  cs: ["research", "internship", "open-source", "competition", "publication"],
  engineering: ["research", "internship", "competition", "lab"],
  data_ai: ["research", "internship", "publication", "kaggle"],
  business: ["internship", "leadership", "case-competition", "consulting"],
  finance: ["internship", "cfa", "leadership", "quant"],
  science: ["research", "publication", "lab", "teaching-assistant"],
  life_health: ["research", "clinical", "publication", "internship"],
  arts_design: ["portfolio", "internship", "exhibition", "freelance"],
  social: ["research", "internship", "policy", "volunteering"],
  education: ["teaching", "internship", "curriculum", "volunteering"],
  law: ["internship", "moot-court", "research", "publication"],
  other: ["internship", "research", "leadership"],
};

function gauss(mean: number, std: number) {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function sampleTags(field: Field): string[] {
  const pool = TAGS_BY_FIELD[field];
  const n = 1 + Math.floor(Math.random() * 3);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
}
function admitProb(
  schoolAvg: number,
  gpa: number,
  toefl: number | null,
  ielts: number | null,
  tags: string[]
) {
  let p = 0.35 + (gpa - schoolAvg) * 0.55;
  if (toefl != null) p += (toefl - 100) / 80;
  if (ielts != null) p += (ielts - 7) / 4;
  if (tags.includes("publication")) p += 0.1;
  if (tags.includes("research")) p += 0.08;
  if (tags.includes("internship") || tags.includes("cfa")) p += 0.05;
  return clamp(p, 0.08, 0.92);
}

function keyOf(name: string, program: string, degree: string) {
  return `${name}::${program}::${degree}`.toLowerCase();
}

async function main() {
  const seeds = allSchoolSeeds();
  console.log(`Catalog programs: ${seeds.length}`);

  const existing = await prisma.school.findMany();
  const bySlug = new Map(existing.map((s) => [s.slug, s]));
  const byKey = new Map(
    existing.map((s) => [keyOf(s.name, s.program, s.degree), s])
  );

  // Remap legacy slug → catalog slug in one pass
  for (const s of seeds) {
    if (bySlug.has(s.slug)) continue;
    const legacy = byKey.get(keyOf(s.name, s.program, s.degree));
    if (!legacy || legacy.slug === s.slug) continue;
    if (bySlug.has(s.slug)) continue;
    try {
      const updated = await prisma.school.update({
        where: { id: legacy.id },
        data: { slug: s.slug },
      });
      bySlug.delete(legacy.slug);
      bySlug.set(s.slug, updated);
      byKey.set(keyOf(s.name, s.program, s.degree), updated);
    } catch {
      /* slug collision — upsert path will create/update */
    }
  }

  type SeedRow = {
    slug: string;
    name: string;
    program: string;
    programZh: string | null;
    degree: string;
    country: string;
    field: string;
    city: string | null;
    avgGpa: number;
    minGpa: number;
    minToefl: number | null;
    minIelts: number | null;
    gpaScale: number;
    website: string | null;
    officialUrl: string | null;
    admissionRequirements: string;
    tier: number;
    duration: string | null;
    tuitionNote: string | null;
    isStem: boolean | null;
    greRequired: boolean | null;
    applicationDeadline: string | null;
    blurb: string | null;
    summaryOfficial: string | null;
  };
  const toCreate: SeedRow[] = [];
  const toUpdate: SeedRow[] = [];
  for (const s of seeds) {
    const row: SeedRow = {
      slug: s.slug,
      name: s.name,
      program: s.program,
      programZh: s.programZh ?? null,
      degree: s.degree,
      country: s.country,
      field: s.field,
      city: s.city ?? null,
      avgGpa: s.avgGpa,
      minGpa: s.minGpa,
      minToefl: s.minToefl,
      minIelts: s.minIelts,
      gpaScale: s.gpaScale ?? 4.0,
      website: s.website,
      officialUrl: s.officialUrl ?? s.website,
      admissionRequirements: s.admissionRequirements,
      tier: s.tier,
      duration: s.duration ?? null,
      tuitionNote: s.tuitionNote ?? null,
      isStem: s.isStem ?? null,
      greRequired: s.greRequired === undefined ? null : s.greRequired,
      applicationDeadline: s.applicationDeadline ?? null,
      blurb: s.blurb ?? null,
      summaryOfficial: s.summaryOfficial ?? null,
    };
    if (bySlug.has(s.slug)) toUpdate.push(row);
    else toCreate.push(row);
  }

  if (toCreate.length) {
    // batch create
    const chunk = 50;
    for (let i = 0; i < toCreate.length; i += chunk) {
      await prisma.school.createMany({
        data: toCreate.slice(i, i + chunk),
        skipDuplicates: true,
      });
      console.log(`created ${Math.min(i + chunk, toCreate.length)}/${toCreate.length}`);
    }
  }

  // sequential updates — pooler drops parallel bursts (P1017)
  async function updateOne(row: (typeof toUpdate)[number], attempt = 1): Promise<void> {
    try {
      await prisma.school.update({
        where: { slug: row.slug },
        data: {
          name: row.name,
          program: row.program,
          programZh: row.programZh,
          degree: row.degree,
          country: row.country,
          field: row.field,
          city: row.city,
          avgGpa: row.avgGpa,
          minGpa: row.minGpa,
          minToefl: row.minToefl,
          minIelts: row.minIelts,
          gpaScale: row.gpaScale,
          website: row.website,
          officialUrl: row.officialUrl,
          admissionRequirements: row.admissionRequirements,
          tier: row.tier,
          duration: row.duration,
          tuitionNote: row.tuitionNote,
          isStem: row.isStem,
          greRequired: row.greRequired,
          applicationDeadline: row.applicationDeadline,
          blurb: row.blurb,
          summaryOfficial: row.summaryOfficial,
        },
      });
    } catch (e) {
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        return updateOne(row, attempt + 1);
      }
      throw e;
    }
  }
  for (let i = 0; i < toUpdate.length; i++) {
    await updateOne(toUpdate[i]);
    if ((i + 1) % 50 === 0 || i + 1 === toUpdate.length) {
      console.log(`updated ${i + 1}/${toUpdate.length}`);
    }
  }
  console.log(`Schools create=${toCreate.length} update=${toUpdate.length}`);

  const schools = await prisma.school.findMany({
    include: { _count: { select: { cases: true } } },
  });
  const nowYear = new Date().getFullYear();
  let created = 0;
  const caseRows: Array<{
    schoolId: string;
    gpa: number;
    toefl: number | null;
    ielts: number | null;
    gre: number | null;
    undergradSchool: string;
    undergradMajor: string;
    backgroundTags: string[];
    admissionResult: boolean;
    year: number;
    description: string;
    source: string;
  }> = [];

  for (const school of schools) {
    const need = Math.max(0, CASES_PER_SCHOOL - school._count.cases);
    if (need === 0) continue;
    const field = (school.field as Field) || "other";
    const majors = MAJORS_BY_FIELD[field] || MAJORS_BY_FIELD.other;
    const preferIelts = school.country === "UK" || school.country === "AU";

    for (let i = 0; i < need; i++) {
      const gpa = clamp(
        Math.round(gauss(school.avgGpa - 0.05, 0.22) * 100) / 100,
        2.8,
        4.0
      );
      const useIelts = preferIelts ? Math.random() < 0.85 : Math.random() < 0.25;
      const toefl = useIelts
        ? null
        : Math.round(clamp(gauss((school.minToefl ?? 90) + 8, 8), 70, 120));
      const ielts = useIelts
        ? Math.round(clamp(gauss((school.minIelts ?? 6.5) + 0.35, 0.35), 5.5, 9) * 2) / 2
        : null;
      const gre =
        school.country === "US" && Math.random() < 0.45
          ? Math.round(clamp(gauss(322, 8), 300, 340))
          : null;
      const undergradSchool = pick(UNDERGRADS);
      const undergradMajor = pick(majors);
      const tags = sampleTags(field);
      const year =
        nowYear - (Math.random() < 0.55 ? 0 : Math.random() < 0.7 ? 1 : 2);
      const p = admitProb(school.avgGpa, gpa, toefl, ielts, tags);
      const admissionResult = Math.random() < p;
      const lang = toefl != null ? `TOEFL ${toefl}` : `IELTS ${ielts}`;
      const grePart = gre != null ? `，GRE ${gre}` : "";
      const resultCn = admissionResult ? "获录取" : "被拒";
      caseRows.push({
        schoolId: school.id,
        gpa,
        toefl,
        ielts,
        gre,
        undergradSchool,
        undergradMajor,
        backgroundTags: tags,
        admissionResult,
        year,
        description: `脱敏案例：${undergradSchool}${undergradMajor}背景，GPA ${gpa.toFixed(2)}，${lang}${grePart}，标签 ${tags.join("/")}，${year} 年申请 ${school.country} ${school.name} ${school.program}，${resultCn}。`,
        source: "synthetic",
      });
    }
  }

  for (let i = 0; i < caseRows.length; i += 100) {
    const slice = caseRows.slice(i, i + 100);
    await prisma.case.createMany({ data: slice });
    created += slice.length;
    console.log(`cases ${created}/${caseRows.length}`);
  }

  const schoolCount = await prisma.school.count();
  const caseCount = await prisma.case.count();
  console.log(`Totals → schools=${schoolCount} cases=${caseCount} newCases=${created}`);
  if (schoolCount < 200) throw new Error(`expected ~300 schools, got ${schoolCount}`);
  console.log("Seed OK.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
