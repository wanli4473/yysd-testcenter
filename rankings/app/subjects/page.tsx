import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SYSTEMS, type SystemKey } from "@/lib/systems";

export const metadata: Metadata = { title: "学科排名" };
export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const subjects = await prisma.rankingEdition.findMany({
    where: { isSubject: true },
    orderBy: [{ system: "asc" }, { categoryName: "asc" }, { year: "desc" }],
  });

  // latest per system+category
  const seen = new Set<string>();
  const latest = subjects.filter((s) => {
    const k = `${s.system}:${s.categorySlug}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">学科排名</h1>
        <p className="sans mt-2 text-[var(--muted)]">
          一期仅提供示例学科榜骨架；更多科目将陆续上线。
        </p>
      </div>

      {latest.length === 0 ? (
        <p className="sans text-[var(--muted)]">暂无学科数据</p>
      ) : (
        <ul className="grid gap-3">
          {latest.map((s) => (
            <li key={`${s.system}-${s.categorySlug}`}>
              <Link
                href={`/${s.system}/${s.categorySlug}/${s.year}`}
                className="surface block rounded-xl p-5 hover:border-[var(--accent)]"
              >
                <p className="sans text-xs text-[var(--muted)]">
                  {SYSTEMS[s.system as SystemKey]?.shortName || s.system} · {s.year}
                </p>
                <h2 className="mt-1 text-xl">{s.categoryName}</h2>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="surface rounded-xl p-5 sans text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--ink)]">即将上线</p>
        <p className="mt-2">QS / THE / 软科等更多学科与地区榜单。</p>
      </div>
    </div>
  );
}
