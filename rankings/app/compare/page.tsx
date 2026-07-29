import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { latestYear, getEdition } from "@/lib/queries";
import { SYSTEMS, SYSTEM_ORDER, SYSTEM_TRACK, countryLabel, type SystemKey } from "@/lib/systems";

export const metadata: Metadata = { title: "院校对比" };
export const dynamic = "force-dynamic";

const PRESETS: { label: string; ids: string[] }[] = [
  {
    label: "G5 样本",
    ids: [
      "university-of-oxford",
      "university-of-cambridge",
      "imperial-college-london",
      "university-college-london",
    ],
  },
  {
    label: "美前五样本",
    ids: [
      "massachusetts-institute-of-technology",
      "harvard-university",
      "stanford-university",
      "california-institute-of-technology",
    ],
  },
  {
    label: "港三",
    ids: ["the-university-of-hong-kong", "chinese-university-of-hong-kong", "hong-kong-university-of-science-and-technology"],
  },
];

export default async function ComparePage({ searchParams }: { searchParams: { ids?: string } }) {
  const slugs = (searchParams.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const selected = slugs.length
    ? await prisma.university.findMany({ where: { slug: { in: slugs } } })
    : [];

  const ordered = slugs
    .map((s) => selected.find((u) => u.slug === s))
    .filter(Boolean) as typeof selected;

  const ranks: Record<string, Record<SystemKey, string>> = {};
  for (const u of ordered) {
    ranks[u.slug] = { qs: "—", the: "—", arwu: "—", usnews: "—" };
    for (const system of SYSTEM_ORDER) {
      const year = await latestYear(system);
      const edition = await getEdition(system, "world", year);
      if (!edition) continue;
      const entry = await prisma.rankingEntry.findUnique({
        where: { editionId_universityId: { editionId: edition.id, universityId: u.id } },
      });
      if (entry) ranks[u.slug][system] = `#${entry.rankDisplay}`;
    }
  }

  const suggestions = await prisma.university.findMany({
    where: { country: { in: ["US", "UK", "CA", "AU", "CN", "HK", "SG"] } },
    orderBy: { nameEn: "asc" },
    take: 80,
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Compare board</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">对比盘</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">选 2–4 所，看四轨最新名次并排。</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Link
            key={p.label}
            href={`/compare?ids=${encodeURIComponent(p.ids.join(","))}`}
            className="btn-ghost py-1.5 text-xs"
          >
            {p.label}
          </Link>
        ))}
      </div>

      <form method="get" action="/rankings/compare" className="panel text-sm">
        <div className="panel-head">
          <span>勾选标的（最多 4）</span>
        </div>
        <div className="grid max-h-64 grid-cols-1 gap-0 overflow-y-auto sm:grid-cols-2">
          {suggestions.map((u) => (
            <label key={u.id} className="flex cursor-pointer items-start gap-2 border-b border-[var(--line)] px-3 py-2 hover:bg-white">
              <input type="checkbox" name="pick" value={u.slug} defaultChecked={slugs.includes(u.slug)} className="mt-1" />
              <span>
                <span className="font-medium">{u.nameZh}</span>
                <span className="block text-[11px] text-[var(--muted)]">
                  {u.nameEn} · {countryLabel(u.country)}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="border-t border-[var(--line)] p-3">
          <button type="submit" className="btn-ink">
            刷新对比盘
          </button>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(){
                  var f=document.currentScript&&document.currentScript.closest('form');
                  if(!f) return;
                  f.addEventListener('submit', function(e){
                    e.preventDefault();
                    var boxes=[].slice.call(f.querySelectorAll('input[name=pick]:checked')).slice(0,4);
                    var ids=boxes.map(function(b){return b.value}).join(',');
                    location.href='/rankings/compare'+(ids?('?ids='+encodeURIComponent(ids)):'');
                  });
                })();
              `,
            }}
          />
        </div>
      </form>

      {ordered.length >= 1 && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-[var(--line-strong)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Track</th>
                {ordered.map((u) => (
                  <th key={u.id} className="px-4 py-3">
                    <Link href={`/universities/${u.slug}`} className="font-semibold normal-case tracking-normal text-[var(--ink)] hover:underline">
                      {u.nameZh}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SYSTEM_ORDER.map((system) => (
                <tr key={system} className="border-b border-[var(--line)]/80">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <span className="track-dot" style={{ background: SYSTEM_TRACK[system] }} />
                      {SYSTEMS[system].shortName}
                    </span>
                  </td>
                  {ordered.map((u) => (
                    <td key={u.id} className="rank-num px-4 py-3 text-base">
                      {ranks[u.slug][system]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
