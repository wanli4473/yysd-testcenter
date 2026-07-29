import { prisma } from "@/lib/db";
import type { SystemKey } from "@/lib/systems";
import { SYSTEMS } from "@/lib/systems";

export async function getEdition(system: SystemKey, categorySlug: string, year: number) {
  return prisma.rankingEdition.findUnique({
    where: { system_categorySlug_year: { system, categorySlug, year } },
  });
}

export async function listYears(system: SystemKey, categorySlug = "world") {
  const rows = await prisma.rankingEdition.findMany({
    where: { system, categorySlug },
    select: { year: true },
    orderBy: { year: "desc" },
  });
  return rows.map((r) => r.year);
}

export async function latestYear(system: SystemKey, categorySlug = "world") {
  const years = await listYears(system, categorySlug);
  return years[0] ?? SYSTEMS[system].latestYear;
}

export async function getLeaders() {
  const out: { system: SystemKey; year: number; nameZh: string; nameEn: string; slug: string; country: string }[] = [];
  for (const key of Object.keys(SYSTEMS) as SystemKey[]) {
    const year = await latestYear(key);
    const edition = await getEdition(key, "world", year);
    if (!edition) continue;
    const top = await prisma.rankingEntry.findFirst({
      where: { editionId: edition.id },
      orderBy: { rank: "asc" },
      include: { university: true },
    });
    if (!top) continue;
    out.push({
      system: key,
      year,
      nameZh: top.university.nameZh,
      nameEn: top.university.nameEn,
      slug: top.university.slug,
      country: top.university.country,
    });
  }
  return out;
}

export type EntryFilters = {
  q?: string;
  country?: string;
  page?: number;
  pageSize?: number;
  sort?: "rank" | "score";
};

export async function listEntries(editionId: string, filters: EntryFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50));
  const where: {
    editionId: string;
    university?: { OR?: { nameEn?: { contains: string }; nameZh?: { contains: string }; aliases?: { contains: string } }[]; country?: string };
  } = { editionId };

  if (filters.country) {
    where.university = { ...(where.university || {}), country: filters.country };
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.university = {
      ...(where.university || {}),
      OR: [
        { nameEn: { contains: q } },
        { nameZh: { contains: q } },
        { aliases: { contains: q } },
      ],
    };
  }

  const [total, rows] = await Promise.all([
    prisma.rankingEntry.count({ where }),
    prisma.rankingEntry.findMany({
      where,
      include: { university: true },
      orderBy: filters.sort === "score" ? { score: "desc" } : { rank: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, rows };
}

export async function universityHistory(universityId: string) {
  return prisma.rankingEntry.findMany({
    where: { universityId, edition: { categorySlug: "world" } },
    include: { edition: true },
    orderBy: [{ edition: { system: "asc" } }, { edition: { year: "desc" } }],
  });
}
