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
    <div className="space-y-4">
      <div>
        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Universe</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">院校库</h1>
        <p className="mono mt-1 text-[11px] text-[var(--muted)]">{total} instruments</p>
      </div>

      <form method="get" action="/rankings/universities" className="panel flex flex-wrap gap-2 p-3 text-sm">
        <input name="q" defaultValue={searchParams.q || ""} placeholder="搜校名…" className="input-desk max-w-xs py-2" />
        <select name="country" defaultValue={searchParams.country || ""} className="input-desk w-auto py-2">
          <option value="">全部市场</option>
          {["US", "UK", "CA", "AU", "CN", "HK", "SG", "JP", "KR", "DE", "FR", "CH", "NL", "SE"].map((c) => (
            <option key={c} value={c}>
              {countryLabel(c)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-ink py-2">
          筛选
        </button>
      </form>

      <ul className="panel divide-y divide-[var(--line)]">
        {rows.map((u) => (
          <li key={u.id}>
            <Link href={`/universities/${u.slug}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white">
              <div>
                <p className="font-semibold">{u.nameZh}</p>
                <p className="text-[11px] text-[var(--muted)]">{u.nameEn}</p>
              </div>
              <span className="mono text-[10px] text-[var(--muted)]">{countryLabel(u.country)}</span>
            </Link>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav className="flex gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/universities?${new URLSearchParams({
                ...(searchParams.q ? { q: searchParams.q } : {}),
                ...(searchParams.country ? { country: searchParams.country } : {}),
                page: String(page - 1),
              }).toString()}`}
              className="btn-ghost py-1.5"
            >
              上一页
            </Link>
          )}
          <span className="mono text-[var(--muted)]">
            {page}/{pages}
          </span>
          {page < pages && (
            <Link
              href={`/universities?${new URLSearchParams({
                ...(searchParams.q ? { q: searchParams.q } : {}),
                ...(searchParams.country ? { country: searchParams.country } : {}),
                page: String(page + 1),
              }).toString()}`}
              className="btn-ghost py-1.5"
            >
              下一页
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
