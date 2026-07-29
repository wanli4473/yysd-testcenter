import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { latestYear, getEdition } from "@/lib/queries";
import { SYSTEMS, SYSTEM_ORDER, countryLabel, type SystemKey } from "@/lib/systems";

export const metadata: Metadata = { title: "院校对比" };
export const dynamic = "force-dynamic";

export default async function ComparePage({ searchParams }: { searchParams: { ids?: string } }) {
  const slugs = (searchParams.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const selected = slugs.length
    ? await prisma.university.findMany({ where: { slug: { in: slugs } } })
    : [];

  // preserve order of ids
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
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">跨体系院校对比</h1>
        <p className="sans mt-2 text-[var(--muted)]">选择 2–4 所大学，查看四大综合榜最新名次。</p>
      </div>

      <form method="get" action="/rankings/compare" className="surface sans rounded-xl p-4 text-sm">
        <p className="mb-2 text-[var(--muted)]">勾选院校后提交（最多 4 所）</p>
        <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
          {suggestions.map((u) => (
            <label key={u.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 hover:bg-[var(--accent-soft)]">
              <input type="checkbox" name="pick" value={u.slug} defaultChecked={slugs.includes(u.slug)} className="mt-1" />
              <span>
                {u.nameZh}
                <span className="block text-xs text-[var(--muted)]">
                  {u.nameEn} · {countryLabel(u.country)}
                </span>
              </span>
            </label>
          ))}
        </div>
        {/* HTML forms don't join checkboxes as comma ids — use client-less redirect via pick[] handled below with note */}
        <CompareSubmit />
      </form>

      {ordered.length >= 1 && (
        <div className="surface overflow-x-auto rounded-xl">
          <table className="sans w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">体系</th>
                {ordered.map((u) => (
                  <th key={u.id} className="px-4 py-3">
                    <Link href={`/universities/${u.slug}`} className="hover:text-[var(--accent)]">
                      {u.nameZh}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SYSTEM_ORDER.map((system) => (
                <tr key={system} className="border-b border-[var(--line)]/70">
                  <td className="px-4 py-3 font-medium">{SYSTEMS[system].shortName}</td>
                  {ordered.map((u) => (
                    <td key={u.id} className="rank-num px-4 py-3">
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

/** Tiny client-less helper: builds ?ids= from checkbox name=pick via progressive enhancement script */
function CompareSubmit() {
  return (
    <>
      <button type="submit" className="mt-4 rounded-md bg-[var(--accent)] px-4 py-2 text-white">
        开始对比
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
    </>
  );
}
