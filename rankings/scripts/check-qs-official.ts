/** Assert QS official top-500 editions match known TopUniversities gold samples. */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CS_TOP = [
  "Massachusetts Institute of Technology",
  "Stanford University",
  "Carnegie Mellon University",
];

async function main() {
  const qsWorld = await prisma.rankingEdition.findFirst({
    where: { system: "qs", categorySlug: "world", year: 2027 },
    include: {
      entries: {
        orderBy: { rank: "asc" },
        take: 10,
        include: { university: true },
      },
    },
  });
  if (!qsWorld) throw new Error("missing QS world 2027");
  if (qsWorld.entries.length < 10) throw new Error("QS world top10 incomplete");
  if (!/Massachusetts Institute of Technology/i.test(qsWorld.entries[0].university.nameEn)) {
    throw new Error(`QS world #1 expected MIT, got ${qsWorld.entries[0].university.nameEn}`);
  }
  const worldCount = await prisma.rankingEntry.count({ where: { editionId: qsWorld.id } });
  if (worldCount < 400) throw new Error(`QS world expected ~top 500 entries, got ${worldCount}`);

  const subjects = await prisma.rankingEdition.findMany({
    where: { system: "qs", isSubject: true, year: 2026 },
  });
  if (subjects.length < 12) throw new Error(`expected 12 QS subjects, got ${subjects.length}`);
  for (const s of subjects) {
    const n = await prisma.rankingEntry.count({ where: { editionId: s.id } });
    if (n < 100) throw new Error(`QS subject ${s.categorySlug} too thin: ${n}`);
  }

  const cs = await prisma.rankingEdition.findFirst({
    where: { system: "qs", categorySlug: "computer-science", year: 2026 },
    include: {
      entries: { orderBy: { rank: "asc" }, take: 5, include: { university: true } },
    },
  });
  if (!cs) throw new Error("missing QS CS 2026");
  for (let i = 0; i < 3; i++) {
    if (!new RegExp(CS_TOP[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(cs.entries[i].university.nameEn)) {
      throw new Error(`CS #${i + 1} expected ~${CS_TOP[i]}, got ${cs.entries[i].university.nameEn}`);
    }
  }

  console.log({
    qsWorldEntries: await prisma.rankingEntry.count({ where: { editionId: qsWorld.id } }),
    subjectEditions: subjects.length,
    csTop: cs.entries.map((e) => `${e.rankDisplay} ${e.university.nameEn}`),
  });
  console.log("check-qs-official OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
