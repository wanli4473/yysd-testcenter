/**
 * Apply curated official/public admit-rate citations onto School rows.
 * Usage: npx tsx scripts/apply-official-stats.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Entry = {
  match: { name: string; field: string };
  admitRateOfficial: number;
  admitRateYear: number;
  admitRateSource: string;
};

async function main() {
  const file = path.join(__dirname, "../data/official-stats.json");
  const json = JSON.parse(readFileSync(file, "utf8")) as { entries: Entry[] };
  let n = 0;
  for (const e of json.entries) {
    const res = await prisma.school.updateMany({
      where: { name: e.match.name, field: e.match.field },
      data: {
        admitRateOfficial: e.admitRateOfficial,
        admitRateYear: e.admitRateYear,
        admitRateSource: e.admitRateSource,
      },
    });
    n += res.count;
    console.log(`${e.match.name}/${e.match.field} → ${res.count} row(s)`);
  }
  console.log(`Updated ${n} school program rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
