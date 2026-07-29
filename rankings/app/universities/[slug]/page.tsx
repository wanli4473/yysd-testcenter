import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { universityHistory } from "@/lib/queries";
import { SYSTEMS, SYSTEM_ORDER, countryLabel, type SystemKey } from "@/lib/systems";

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

  // Weak link to admission: match short alias / English name against catalog-style paths
  const admitHint = aliases[0] || u.nameEn;

  return (
    <div className="space-y-8">
      <div>
        <p className="sans text-xs text-[var(--muted)]">
          <Link href="/universities" className="hover:underline">
            院校库
          </Link>{" "}
          / {countryLabel(u.country)}
        </p>
        <h1 className="mt-2 text-4xl">{u.nameZh}</h1>
        <p className="sans mt-2 text-[var(--muted)]">{u.nameEn}</p>
        {aliases.length > 0 && (
          <p className="sans mt-2 text-xs text-[var(--muted)]">别名：{aliases.join(" · ")}</p>
        )}
        <div className="sans mt-4 flex flex-wrap gap-3 text-sm">
          <Link href={`/compare?ids=${u.slug}`} className="rounded-md border border-[var(--line)] px-3 py-1.5 hover:border-[var(--accent)]">
            加入对比
          </Link>
          <a href="/admission" className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-white">
            去 AI 升学顾问评估
          </a>
        </div>
        <p className="sans mt-2 text-xs text-[var(--muted)]">录取评估按项目匹配；可在顾问中搜索「{admitHint}」相关项目。</p>
      </div>

      <section>
        <h2 className="text-2xl">综合榜历年表现</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SYSTEM_ORDER.map((key) => {
            const rows = bySystem[key] || [];
            return (
              <div key={key} className="surface rounded-xl p-4">
                <h3 className="text-lg">{SYSTEMS[key as SystemKey].shortName}</h3>
                {rows.length === 0 ? (
                  <p className="sans mt-3 text-sm text-[var(--muted)]">暂无数据</p>
                ) : (
                  <ul className="sans mt-3 space-y-1 text-sm">
                    {rows.map((r) => (
                      <li key={r.year} className="flex justify-between">
                        <Link href={r.href} className="text-[var(--muted)] hover:text-[var(--accent)]">
                          {r.year}
                        </Link>
                        <span className="rank-num">#{r.rankDisplay}</span>
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
