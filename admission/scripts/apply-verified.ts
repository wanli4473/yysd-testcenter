/**
 * Upsert hand-verified Top-school programs and stamp verifiedAt.
 * Usage: npx tsx scripts/apply-verified.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { VERIFIED_PROGRAMS, VERIFIED_SCHOOL_NAMES } from "../data/verified-programs";

const prisma = new PrismaClient();

async function upsertOne(
  p: (typeof VERIFIED_PROGRAMS)[number],
  attempt = 1
): Promise<void> {
  const verifiedAt = new Date(p.verifiedDate);
  const data = {
    name: p.name,
    program: p.program,
    programZh: p.programZh ?? null,
    degree: p.degree,
    country: p.country,
    field: p.field,
    city: p.city ?? null,
    avgGpa: p.avgGpa,
    minGpa: p.minGpa,
    minToefl: p.minToefl,
    minIelts: p.minIelts,
    gpaScale: p.gpaScale ?? 4.0,
    website: p.website,
    officialUrl: p.officialUrl ?? p.website,
    admissionRequirements: p.admissionRequirements,
    tier: p.tier,
    duration: p.duration ?? null,
    tuitionNote: p.tuitionNote ?? null,
    isStem: p.isStem ?? null,
    greRequired: p.greRequired === undefined ? null : p.greRequired,
    applicationDeadline: p.applicationDeadline ?? null,
    blurb: p.blurb ?? null,
    summaryOfficial: p.summaryOfficial ?? null,
    verifiedAt,
  };
  try {
    await prisma.school.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    });
  } catch (e) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 300 * attempt));
      return upsertOne(p, attempt + 1);
    }
    throw e;
  }
}

async function main() {
  console.log(`Verified programs: ${VERIFIED_PROGRAMS.length}`);
  console.log(`Schools: ${VERIFIED_SCHOOL_NAMES.join(", ")}`);
  for (let i = 0; i < VERIFIED_PROGRAMS.length; i++) {
    await upsertOne(VERIFIED_PROGRAMS[i]);
    if ((i + 1) % 10 === 0 || i + 1 === VERIFIED_PROGRAMS.length) {
      console.log(`upserted ${i + 1}/${VERIFIED_PROGRAMS.length}`);
    }
  }
  const stamped = await prisma.school.count({ where: { verifiedAt: { not: null } } });
  console.log(`DB verifiedAt count: ${stamped}`);
  console.log("apply-verified OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
