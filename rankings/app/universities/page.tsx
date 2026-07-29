import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { countryLabel } from "@/lib/systems";

export const metadata: Metadata = { title: "院校库" };
export const dynamic = "force-dynamic";

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: { q?: string; country?: string; page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page || 1) || 1);
  const pageSize = 40;
  const where: {
    country?: string;
    OR?: { nameEn?: { contains: string }; nameZh?: { contains: string }; aliases?: { contains: string } }[];
  } = {};
  if (searchParams.country) where.country = searchParams.country;
  if (searchParams.q?.trim()) {
    const q = searchParams.q.trim();
    where.OR = [{ nameEn: { contains: q } }, { nameZh: { contains: q } }, { aliases: { contains: q } }];
  }

  const [total, rows] = await Promise.all([
    prisma.university.count({ where }),
    prisma.university.findMany({
      where,
      orderBy: { nameEn: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl">大学院校库</h1>
        <p className="sans mt-2 text-[var(--muted)]">搜索和浏览全球高校 · 共 {total} 所</p>
      </div>

      <form method="get" className="sans flex flex-wrap gap-2 text-sm" action="/rankings/universities">
        <input
          name="q"
          defaultValue={searchParams.q || ""}
          placeholder="搜索大学…"
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
        />
        <select name="country" defaultValue={searchParams.country || ""} className="rounded-md border border-[var(--line)] bg-white px-3 py-2">
          <option value="">全部国家/地区</option>
          {["US", "UK", "CA", "AU", "CN", "HK", "SG", "JP", "KR", "DE", "FR", "CH", "NL", "SE"].map((c) => (
            <option key={c} value={c}>
              {countryLabel(c)}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">
          筛选
        </button>
      </form>

      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map((u) => (
          <li key={u.id}>
            <Link href={`/universities/${u.slug}`} className="surface block rounded-xl px-4 py-3 hover:border-[var(--accent)]">
              <p className="text-lg">{u.nameZh}</p>
              <p className="sans text-xs text-[var(--muted)]">
                {u.nameEn} · {countryLabel(u.country)}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav className="sans flex gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/universities?${new URLSearchParams({
                ...(searchParams.q ? { q: searchParams.q } : {}),
                ...(searchParams.country ? { country: searchParams.country } : {}),
                page: String(page - 1),
              }).toString()}`}
              className="rounded border border-[var(--line)] px-3 py-1"
            >
              上一页
            </Link>
          )}
          <span className="text-[var(--muted)]">
            {page}/{pages}
          </span>
          {page < pages && (
            <Link
              href={`/universities?${new URLSearchParams({
                ...(searchParams.q ? { q: searchParams.q } : {}),
                ...(searchParams.country ? { country: searchParams.country } : {}),
                page: String(page + 1),
              }).toString()}`}
              className="rounded border border-[var(--line)] px-3 py-1"
            >
              下一页
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
