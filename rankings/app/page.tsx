import Link from "next/link";
import { prisma } from "@/lib/db";
import { getLeaders } from "@/lib/queries";
import { SYSTEM_ORDER, SYSTEMS, countryLabel } from "@/lib/systems";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const leaders = await getLeaders();
  const uniCount = await prisma.university.count();
  const editionCount = await prisma.rankingEdition.count({ where: { isSubject: false } });

  return (
    <div className="space-y-12">
      <section className="max-w-2xl">
        <p className="sans text-xs uppercase tracking-[0.2em] text-[var(--muted)]">University Rankings</p>
        <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">全球大学排名 一站聚合</h1>
        <p className="sans mt-4 text-base text-[var(--muted)]">
          整合 QS、THE、ARWU、US News 四大权威综合榜，助你对比院校、查看历年表现。
        </p>
        <form action="/rankings/universities" method="get" className="sans mt-6 flex gap-2">
          {/* native form needs absolute path including basePath */}
          <input
            name="q"
            placeholder="搜索大学…"
            className="w-full max-w-md rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm text-white">
            搜索
          </button>
        </form>
        <p className="sans mt-3 text-xs text-[var(--muted)]">
          已收录 {uniCount} 所院校 · {editionCount} 个综合榜版本
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/systems", title: "查看排名体系", desc: "方法论与最新榜单入口" },
          { href: "/universities", title: "直接查学校", desc: "院校档案与历年排名" },
          { href: "/compare", title: "跨体系对比", desc: "同一学校四大榜并排看" },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="surface rounded-xl p-5 transition hover:border-[var(--accent)]">
            <h2 className="text-xl">{c.title}</h2>
            <p className="sans mt-2 text-sm text-[var(--muted)]">{c.desc}</p>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="text-2xl">各体系当前榜首</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {leaders.map((l) => (
            <Link
              key={l.system}
              href={`/universities/${l.slug}`}
              className="surface flex items-center justify-between rounded-xl px-4 py-3"
            >
              <div>
                <p className="sans text-xs text-[var(--muted)]">
                  {SYSTEMS[l.system].shortName} · {l.year} · {countryLabel(l.country)}
                </p>
                <p className="mt-1 text-lg">{l.nameZh}</p>
                <p className="sans text-xs text-[var(--muted)]">{l.nameEn}</p>
              </div>
              <span className="rank-num text-2xl">#1</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl">按留学目的地浏览</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["US", "美国"],
            ["UK", "英国"],
            ["CA", "加拿大"],
            ["AU", "澳大利亚"],
            ["CN", "中国"],
            ["HK", "中国香港"],
          ].map(([code, label]) => (
            <Link
              key={code}
              href={`/universities?country=${code}`}
              className="surface rounded-xl px-4 py-4 sans text-sm hover:border-[var(--accent)]"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl">排名体系</h2>
        <div className="mt-4 grid gap-4">
          {SYSTEM_ORDER.map((key) => {
            const s = SYSTEMS[key];
            return (
              <Link key={key} href={`/systems/${key}`} className="surface block rounded-xl p-5 hover:border-[var(--accent)]">
                <h3 className="text-xl">{s.name}</h3>
                <p className="sans mt-2 text-sm text-[var(--muted)]">{s.blurb}</p>
                <p className="sans mt-3 text-xs text-[var(--accent)]">最新 {s.latestYear} →</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
