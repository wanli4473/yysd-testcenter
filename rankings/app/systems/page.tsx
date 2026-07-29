import Link from "next/link";
import type { Metadata } from "next";
import { SYSTEM_ORDER, SYSTEMS } from "@/lib/systems";
import { latestYear } from "@/lib/queries";

export const metadata: Metadata = { title: "排名体系" };
export const dynamic = "force-dynamic";

export default async function SystemsPage() {
  const years = await Promise.all(SYSTEM_ORDER.map((k) => latestYear(k)));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">浏览所有排名体系</h1>
        <p className="sans mt-3 text-[var(--muted)]">方法论决定结论。每个体系用不同视角定义「优秀」。</p>
      </div>
      <div className="grid gap-4">
        {SYSTEM_ORDER.map((key, i) => {
          const s = SYSTEMS[key];
          const y = years[i];
          return (
            <div key={key} className="surface rounded-xl p-6">
              <h2 className="text-2xl">{s.name}</h2>
              <p className="sans mt-1 text-xs text-[var(--muted)]">来源 · {s.sourceHost}</p>
              <p className="sans mt-3 text-sm text-[var(--muted)]">{s.blurb}</p>
              <p className="sans mt-2 text-sm text-[var(--muted)]">{s.method}</p>
              <div className="sans mt-4 flex flex-wrap gap-3 text-sm">
                <Link href={`/systems/${key}`} className="text-[var(--accent)] hover:underline">
                  体系详情
                </Link>
                <Link href={`/${key}/world/${y}`} className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-white">
                  查看 {y} 排名
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
