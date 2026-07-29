import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SYSTEMS, type SystemKey } from "@/lib/systems";
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
    <div className="space-y-8">
      <div>
        <p className="sans text-xs text-[var(--muted)]">
          <Link href="/systems" className="hover:underline">
            排名体系
          </Link>{" "}
          / {s.shortName}
        </p>
        <h1 className="mt-2 text-4xl">{s.name}</h1>
        <p className="sans mt-3 max-w-3xl text-[var(--muted)]">{s.blurb}</p>
        <p className="sans mt-2 max-w-3xl text-sm text-[var(--muted)]">{s.method}</p>
        <p className="sans mt-3 text-xs">
          官方来源：{" "}
          <a href={s.sourceUrl} className="text-[var(--accent)] hover:underline" target="_blank" rel="noreferrer">
            {s.sourceHost}
          </a>
        </p>
      </div>

      <section>
        <h2 className="text-2xl">综合榜 · 历年版本</h2>
        <div className="mt-3 flex flex-wrap gap-2 sans text-sm">
          {years.map((year) => (
            <Link
              key={year}
              href={`/${key}/world/${year}`}
              className={`rounded-md border px-3 py-1.5 ${year === y ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"}`}
            >
              {year}
              {year === y ? " 最新" : ""}
            </Link>
          ))}
        </div>
      </section>

      {subjects.length > 0 && (
        <section>
          <h2 className="text-2xl">学科榜（示例）</h2>
          <ul className="sans mt-3 space-y-2 text-sm">
            {subjects.map((sub) => (
              <li key={sub.id}>
                <Link href={`/${key}/${sub.categorySlug}/${sub.year}`} className="text-[var(--accent)] hover:underline">
                  {sub.categoryName} {sub.year}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
