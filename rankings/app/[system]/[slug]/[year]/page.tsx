import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SYSTEMS, SYSTEM_TRACK, countryLabel, type SystemKey } from "@/lib/systems";
import { getEdition, listEntries, listYears } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = {
  params: { system: string; slug: string; year: string };
  searchParams: { q?: string; country?: string; page?: string; sort?: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = SYSTEMS[params.system as SystemKey];
  return { title: `${s?.shortName || params.system} ${params.year}` };
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
    <div className="space-y-4">
      <div className="panel overflow-hidden">
        <div className="flex items-stretch">
          <div className="w-1.5 shrink-0" style={{ background: SYSTEM_TRACK[system] }} />
          <div className="flex-1 p-4">
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <Link href="/systems" className="hover:text-[var(--ink)]">
                Tracks
              </Link>{" "}
              /{" "}
              <Link href={`/systems/${system}`} className="hover:text-[var(--ink)]">
                {SYSTEMS[system].shortName}
              </Link>
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{edition.title}</h1>
            <p className="mono mt-1 text-[11px] text-[var(--muted)]">{total} rows</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {years.map((y) => (
          <Link
            key={y}
            href={`/${system}/${params.slug}/${y}`}
            className={`mono border px-2.5 py-1 text-xs ${
              y === year ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] hover:border-[var(--ink)]"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      <form className="panel flex flex-wrap gap-2 p-3 text-sm" method="get">
        <input name="q" defaultValue={searchParams.q || ""} placeholder="筛校名…" className="input-desk max-w-xs py-2" />
        <select name="country" defaultValue={searchParams.country || ""} className="input-desk w-auto py-2">
          <option value="">全部地区</option>
          {["US", "UK", "CA", "AU", "CN", "HK", "SG", "JP", "KR", "DE", "FR", "CH", "NL", "SE", "OTHER"].map((c) => (
            <option key={c} value={c}>
              {countryLabel(c)}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={searchParams.sort || "rank"} className="input-desk w-auto py-2">
          <option value="rank">按排名</option>
          <option value="score">按总分</option>
        </select>
        <button type="submit" className="btn-ink py-2">
          筛选
        </button>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--line-strong)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">University</th>
              <th className="px-4 py-3 font-medium">Market</th>
              <th className="px-4 py-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)]/80 last:border-0 hover:bg-white">
                <td className="rank-num px-4 py-2.5">{r.rankDisplay}</td>
                <td className="px-4 py-2.5">
                  <Link href={`/universities/${r.university.slug}`} className="hover:underline">
                    <span className="font-semibold">{r.university.nameZh}</span>
                    <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{r.university.nameEn}</span>
                  </Link>
                </td>
                <td className="mono px-4 py-2.5 text-[11px] text-[var(--muted)]">{countryLabel(r.university.country)}</td>
                <td className="mono px-4 py-2.5">{r.score?.toFixed(1) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {page > 1 && (
            <Link href={`/${system}/${params.slug}/${year}${qs({ page: String(page - 1) })}`} className="btn-ghost py-1.5">
              上一页
            </Link>
          )}
          <span className="mono text-[var(--muted)]">
            {page}/{pages}
          </span>
          {page < pages && (
            <Link href={`/${system}/${params.slug}/${year}${qs({ page: String(page + 1) })}`} className="btn-ghost py-1.5">
              下一页
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
