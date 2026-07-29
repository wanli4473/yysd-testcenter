import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SYSTEMS, countryLabel, type SystemKey } from "@/lib/systems";
import { getEdition, listEntries, listYears } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = {
  params: { system: string; slug: string; year: string };
  searchParams: { q?: string; country?: string; page?: string; sort?: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = SYSTEMS[params.system as SystemKey];
  return { title: `${s?.shortName || params.system} ${params.slug} ${params.year}` };
}

export default async function RankingTablePage({ params, searchParams }: Props) {
  const system = params.system as SystemKey;
  if (!SYSTEMS[system]) notFound();
  const year = Number(params.year);
  if (!Number.isFinite(year)) notFound();

  const edition = await getEdition(system, params.slug, year);
  if (!edition) notFound();

  const years = await listYears(system, params.slug);
  const page = Number(searchParams.page || 1) || 1;
  const { total, pageSize, rows } = await listEntries(edition.id, {
    q: searchParams.q,
    country: searchParams.country,
    page,
    sort: searchParams.sort === "score" ? "score" : "rank",
  });
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      q: searchParams.q,
      country: searchParams.country,
      sort: searchParams.sort,
      page: undefined as string | undefined,
      ...extra,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="sans text-xs text-[var(--muted)]">
          <Link href="/systems" className="hover:underline">
            排名
          </Link>{" "}
          /{" "}
          <Link href={`/systems/${system}`} className="hover:underline">
            {SYSTEMS[system].shortName}
          </Link>{" "}
          / {edition.categoryName}
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl">{edition.title}</h1>
        <p className="sans mt-2 text-sm text-[var(--muted)]">共 {total} 所大学</p>
      </div>

      <div className="flex flex-wrap gap-2 sans text-sm">
        {years.map((y) => (
          <Link
            key={y}
            href={`/${system}/${params.slug}/${y}`}
            className={`rounded-md border px-3 py-1 ${y === year ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"}`}
          >
            {y}
          </Link>
        ))}
      </div>

      <form className="sans flex flex-wrap gap-2 text-sm" method="get">
        <input
          name="q"
          defaultValue={searchParams.q || ""}
          placeholder="按大学名称搜索…"
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
        />
        <select name="country" defaultValue={searchParams.country || ""} className="rounded-md border border-[var(--line)] bg-white px-3 py-2">
          <option value="">所有国家/地区</option>
          {["US", "UK", "CA", "AU", "CN", "HK", "SG", "JP", "KR", "DE", "FR", "CH", "NL", "SE", "OTHER"].map((c) => (
            <option key={c} value={c}>
              {countryLabel(c)}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={searchParams.sort || "rank"} className="rounded-md border border-[var(--line)] bg-white px-3 py-2">
          <option value="rank">按排名</option>
          <option value="score">按总分</option>
        </select>
        <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">
          筛选
        </button>
      </form>

      <div className="surface overflow-x-auto rounded-xl">
        <table className="sans w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">排名</th>
              <th className="px-4 py-3 font-medium">大学</th>
              <th className="px-4 py-3 font-medium">国家/地区</th>
              <th className="px-4 py-3 font-medium">总分</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)]/70 last:border-0">
                <td className="rank-num px-4 py-3">{r.rankDisplay}</td>
                <td className="px-4 py-3">
                  <Link href={`/universities/${r.university.slug}`} className="hover:text-[var(--accent)]">
                    <span className="font-medium">{r.university.nameZh}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">{r.university.nameEn}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{countryLabel(r.university.country)}</td>
                <td className="px-4 py-3 tabular-nums">{r.score?.toFixed(1) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="sans flex flex-wrap items-center gap-2 text-sm">
          {page > 1 && (
            <Link href={`/${system}/${params.slug}/${year}${qs({ page: String(page - 1) })}`} className="rounded border border-[var(--line)] px-3 py-1">
              上一页
            </Link>
          )}
          <span className="text-[var(--muted)]">
            第 {page} / {pages} 页
          </span>
          {page < pages && (
            <Link href={`/${system}/${params.slug}/${year}${qs({ page: String(page + 1) })}`} className="rounded border border-[var(--line)] px-3 py-1">
              下一页
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
