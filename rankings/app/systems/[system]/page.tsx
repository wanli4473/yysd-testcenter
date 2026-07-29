import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SYSTEMS, SYSTEM_TRACK, type SystemKey } from "@/lib/systems";
import { listYears, latestYear } from "@/lib/queries";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { system: string } }): Promise<Metadata> {
  const s = SYSTEMS[params.system as SystemKey];
  return { title: s?.name || "排名体系" };
}

export default async function SystemDetailPage({ params }: { params: { system: string } }) {
  const key = params.system as SystemKey;
  const s = SYSTEMS[key];
  if (!s) notFound();

  const years = await listYears(key, "world");
  const y = years[0] ?? (await latestYear(key));
  const subjects = await prisma.rankingEdition.findMany({
    where: { system: key, isSubject: true },
    distinct: ["categorySlug"],
    orderBy: { categoryName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="panel overflow-hidden">
        <div className="flex items-stretch">
          <div className="w-1.5 shrink-0" style={{ background: SYSTEM_TRACK[key] }} />
          <div className="flex-1 p-5">
            <p className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              <Link href="/systems" className="hover:text-[var(--ink)]">
                Tracks
              </Link>{" "}
              / {s.shortName}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{s.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-[var(--muted)]">{s.blurb}</p>
            <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{s.method}</p>
            <p className="mono mt-3 text-[11px]">
              SRC{" "}
              <a href={s.sourceUrl} className="text-[var(--gold)] hover:underline" target="_blank" rel="noreferrer">
                {s.sourceHost}
              </a>
            </p>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <span>综合榜 · 历年</span>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          {years.map((year) => (
            <Link
              key={year}
              href={`/${key}/world/${year}`}
              className={`mono border px-3 py-1.5 text-sm ${
                year === y ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] hover:border-[var(--ink)]"
              }`}
            >
              {year}
            </Link>
          ))}
        </div>
      </section>

      {subjects.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <span>学科轨（示例）</span>
          </div>
          <ul className="divide-y divide-[var(--line)]">
            {subjects.map((sub) => (
              <li key={sub.id}>
                <Link href={`/${key}/${sub.categorySlug}/${sub.year}`} className="flex justify-between px-4 py-3 text-sm hover:bg-white">
                  <span>{sub.categoryName}</span>
                  <span className="mono text-[var(--muted)]">{sub.year}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
