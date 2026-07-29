/** Assert seed DB has four world systems + subject skeleton. */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const uni = await prisma.university.count();
  const eds = await prisma.rankingEdition.count();
  const entries = await prisma.rankingEntry.count();
  const systems = await prisma.rankingEdition.groupBy({ by: ["system"], _count: true });
  const subjects = await prisma.rankingEdition.count({ where: { isSubject: true } });

  console.log({ uni, eds, entries, systems, subjects });
  if (uni < 50) throw new Error("expected >=50 universities");
  if (systems.length < 4) throw new Error("expected 4 ranking systems");
  if (subjects < 1) throw new Error("expected subject skeleton");
  if (entries < 500) throw new Error("expected multi-year entries");
  console.log("check-rankings OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
