/**
 * Imports data/raw/*.json into SQLite via Prisma.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const RAW = path.join(__dirname, "..", "data", "raw");

type UniRow = {
  slug: string;
  nameEn: string;
  nameZh: string;
  country: string;
  aliases: string[];
};

type EntryRow = {
  nameEn: string;
  rank: number;
  rankDisplay: string;
  score?: number;
  metrics?: Record<string, number>;
};

type EditionRow = {
  system: string;
  categorySlug: string;
  categoryName: string;
  year: number;
  title: string;
  isSubject: boolean;
  sourceUrl: string;
  entries: EntryRow[];
};

async function main() {
  const unisPath = path.join(RAW, "universities.json");
  const edsPath = path.join(RAW, "editions.json");
  if (!fs.existsSync(unisPath) || !fs.existsSync(edsPath)) {
    throw new Error("Missing data/raw/*.json — run: npx tsx scripts/seed-raw.ts");
  }

  const universities = JSON.parse(fs.readFileSync(unisPath, "utf8")) as UniRow[];
  const editions = JSON.parse(fs.readFileSync(edsPath, "utf8")) as EditionRow[];

  await prisma.rankingEntry.deleteMany();
  await prisma.rankingEdition.deleteMany();
  await prisma.university.deleteMany();

  const byName = new Map<string, string>(); // nameEn -> id

  for (const u of universities) {
    const row = await prisma.university.create({
      data: {
        slug: u.slug,
        nameEn: u.nameEn,
        nameZh: u.nameZh,
        country: u.country,
        aliases: JSON.stringify(u.aliases || []),
      },
    });
    byName.set(u.nameEn, row.id);
    for (const a of u.aliases || []) byName.set(a, row.id);
  }

  let entryCount = 0;
  let skipped = 0;
  for (const ed of editions) {
    const edition = await prisma.rankingEdition.create({
      data: {
        system: ed.system,
        categorySlug: ed.categorySlug,
        categoryName: ed.categoryName,
        year: ed.year,
        title: ed.title,
        isSubject: ed.isSubject,
        sourceUrl: ed.sourceUrl,
      },
    });

    for (const e of ed.entries) {
      const universityId = byName.get(e.nameEn);
      if (!universityId) {
        skipped++;
        continue;
      }
      await prisma.rankingEntry.create({
        data: {
          editionId: edition.id,
          universityId,
          rank: e.rank,
          rankDisplay: e.rankDisplay,
          score: e.score ?? null,
          metrics: e.metrics ? JSON.stringify(e.metrics) : null,
        },
      });
      entryCount++;
    }
  }

  console.log(`Imported ${universities.length} universities, ${editions.length} editions, ${entryCount} entries (skipped ${skipped})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
