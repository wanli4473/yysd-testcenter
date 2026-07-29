import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { universityHistory } from "@/lib/queries";
import { SYSTEMS, SYSTEM_ORDER, SYSTEM_TRACK, countryLabel, type SystemKey } from "@/lib/systems";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const u = await prisma.university.findUnique({ where: { slug: params.slug } });
  return { title: u ? u.nameZh : "院校" };
}

export default async function UniversityPage({ params }: { params: { slug: string } }) {
  const u = await prisma.university.findUnique({ where: { slug: params.slug } });
  if (!u) notFound();

  const history = await universityHistory(u.id);
  const aliases = JSON.parse(u.aliases || "[]") as string[];

  const bySystem: Record<string, { year: number; rankDisplay: string; href: string }[]> = {};
  for (const h of history) {
    const key = h.edition.system;
    if (!bySystem[key]) bySystem[key] = [];
    bySystem[key].push({
      year: h.edition.year,
      rankDisplay: h.rankDisplay,
      href: `/${h.edition.system}/${h.edition.categorySlug}/${h.edition.year}`,
    });
  }

  const admitHint = aliases[0] || u.nameEn;

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <p className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          <Link href="/universities" className="hover:text-[var(--ink)]">
            Universe
          </Link>{" "}
          / {countryLabel(u.country)}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{u.nameZh}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{u.nameEn}</p>
        {aliases.length > 0 && <p className="mono mt-2 text-[11px] text-[var(--muted)]">AKA {aliases.join(" · ")}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/compare?ids=${u.slug}`} className="btn-ghost py-2">
            加入对比盘
          </Link>
          <a href="/admission" className="btn-ink py-2">
            估录取
          </a>
        </div>
        <p className="mt-2 text-[11px] text-[var(--muted)]">顾问侧按项目匹配，可搜「{admitHint}」。</p>
      </div>

      <section>
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-sm font-semibold">四轨历年</h2>
          <span className="mono text-[10px] text-[var(--muted)]">HISTORY</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SYSTEM_ORDER.map((key) => {
            const rows = bySystem[key] || [];
            return (
              <div key={key} className="panel overflow-hidden">
                <div className="panel-head">
                  <span className="inline-flex items-center gap-2 normal-case tracking-normal text-[var(--ink)]">
                    <span className="track-dot" style={{ background: SYSTEM_TRACK[key as SystemKey] }} />
                    {SYSTEMS[key as SystemKey].shortName}
                  </span>
                </div>
                {rows.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[var(--muted)]">暂无数据</p>
                ) : (
                  <ul>
                    {rows.map((r) => (
                      <li key={r.year}>
                        <Link href={r.href} className="tape-row">
                          <span className="mono text-[var(--muted)]">{r.year}</span>
                          <span className="text-[var(--muted)]">名次</span>
                          <span className="rank-num">#{r.rankDisplay}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
