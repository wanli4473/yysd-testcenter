import Link from "next/link";
import type { Metadata } from "next";
import { SYSTEM_ORDER, SYSTEMS, SYSTEM_TRACK, type SystemKey } from "@/lib/systems";
import { latestYear } from "@/lib/queries";

export const metadata: Metadata = { title: "排名体系" };
export const dynamic = "force-dynamic";

export default async function SystemsPage() {
  const years = await Promise.all(SYSTEM_ORDER.map((k) => latestYear(k)));

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Tracks</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">四条行情轨</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">方法论不同，结论不同。先认轨，再读数。</p>
      </div>
      <div className="grid gap-3">
        {SYSTEM_ORDER.map((key, i) => {
          const s = SYSTEMS[key];
          const y = years[i];
          return (
            <div key={key} className="panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-1.5" style={{ background: SYSTEM_TRACK[key as SystemKey] }} />
                  <div>
                    <h2 className="text-lg font-semibold">{s.name}</h2>
                    <p className="mono text-[11px] text-[var(--muted)]">{s.sourceHost}</p>
                  </div>
                </div>
                <Link href={`/${key}/world/${y}`} className="btn-ink">
                  {y} 全表
                </Link>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <p className="text-sm text-[var(--muted)]">{s.blurb}</p>
                <p className="text-sm text-[var(--muted)]">{s.method}</p>
              </div>
              <div className="border-t border-[var(--line)] px-4 py-2">
                <Link href={`/systems/${key}`} className="mono text-[11px] text-[var(--muted)] hover:text-[var(--ink)]">
                  体系详情与历年 →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
