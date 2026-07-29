import Link from "next/link";
import { prisma } from "@/lib/db";
import { getLeaders, getTapeTops } from "@/lib/queries";
import { SYSTEM_ORDER, SYSTEMS, SYSTEM_TRACK, countryLabel, type SystemKey } from "@/lib/systems";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [leaders, tapes, uniCount, editionCount] = await Promise.all([
    getLeaders(),
    getTapeTops(10),
    prisma.university.count(),
    prisma.rankingEdition.count({ where: { isSubject: false } }),
  ]);

  const tickerItems = leaders.flatMap((l) => [
    { system: l.system, text: `${SYSTEMS[l.system].shortName} ${l.year} #1 ${l.nameZh}` },
  ]);

  return (
    <div className="space-y-8">
      {/* live ticker */}
      <div className="panel-deep overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/10 px-3 py-1.5">
          <span className="mono text-[10px] font-semibold tracking-[0.2em] text-[var(--gold)]">LIVE</span>
          <div className="ticker flex-1 py-1.5 text-[12px]">
            <div className="ticker-track">
              {[...tickerItems, ...tickerItems].map((t, i) => (
                <span key={`${t.system}-${i}`} className="inline-flex items-center gap-2 text-[rgba(232,237,242,0.85)]">
                  <span className="track-dot" style={{ background: SYSTEM_TRACK[t.system] }} />
                  <span className="mono">{t.text}</span>
                </span>
              ))}
            </div>
          </div>
          <span className="mono hidden text-[10px] text-white/40 sm:inline">
            {uniCount} UNI · {editionCount} ED
          </span>
        </div>
      </div>

      {/* desk: search + rails */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)]">
        <div className="panel flex flex-col">
          <div className="panel-head">
            <span>选校检索</span>
            <span className="mono text-[var(--gold)]">DESK</span>
          </div>
          <div className="flex flex-1 flex-col justify-between gap-6 p-5">
            <div>
              <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-[2rem]">
                这所学校，
                <br />
                在四大榜站哪？
              </h1>
              <p className="mt-3 text-sm text-[var(--muted)]">
                把 QS / THE / ARWU / US News 当成四条行情轨。查名次、比差距，再决定要不要估录取。
              </p>
            </div>
            <form action="/rankings/universities" method="get" className="space-y-3">
              <input name="q" placeholder="输入校名 / 别名，回车检索" className="input-desk" autoComplete="off" />
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-ink">
                  查行情
                </button>
                <Link href="/compare" className="btn-ghost inline-flex items-center">
                  开对比盘
                </Link>
              </div>
            </form>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--muted)]">
              {leaders.slice(0, 3).map((l) => (
                <Link key={l.system} href={`/universities/${l.slug}`} className="hover:text-[var(--ink)]">
                  <span className="mono text-[var(--gold)]">#{1}</span> {l.nameZh}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {tapes.map((tape) => (
            <div key={tape.system} className="panel overflow-hidden">
              <div className="panel-head">
                <span className="inline-flex items-center gap-2 normal-case tracking-normal text-[var(--ink)]">
                  <span className="track-dot" style={{ background: SYSTEM_TRACK[tape.system] }} />
                  <span className="font-semibold">{SYSTEMS[tape.system].shortName}</span>
                  <span className="mono text-[var(--muted)]">{tape.year}</span>
                </span>
                <Link href={`/${tape.system}/world/${tape.year}`} className="mono text-[10px] text-[var(--muted)] hover:text-[var(--ink)]">
                  FULL →
                </Link>
              </div>
              <div>
                {tape.rows.map((r) => (
                  <Link key={r.slug} href={`/universities/${r.slug}`} className="tape-row">
                    <span className="mono text-[var(--gold)]">{String(r.rank).padStart(2, "0")}</span>
                    <span className="truncate font-medium">{r.nameZh}</span>
                    <span className="mono text-[10px] text-[var(--muted)]">{countryLabel(r.country)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* three asks as rail, not cards */}
      <section>
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-sm font-semibold tracking-wide">下一步</h2>
          <span className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Action rail</span>
        </div>
        <div className="ask-rail">
          <Link href="/compare">
            <p className="mono text-[10px] text-[var(--gold)]">01</p>
            <p className="mt-2 text-base font-semibold">四大榜差多少？</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">开对比盘，并排看同一所学校的轨位。</p>
          </Link>
          <a href="/admission">
            <p className="mono text-[10px] text-[var(--gold)]">02</p>
            <p className="mt-2 text-base font-semibold">背景够不够？</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">跳转 AI 升学顾问，估项目录取区间。</p>
          </a>
          <a href="/">
            <p className="mono text-[10px] text-[var(--gold)]">03</p>
            <p className="mt-2 text-base font-semibold">语言分还差多少？</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">回主站练雅思 / 国际课程。</p>
          </a>
        </div>
      </section>

      {/* destinations — large type cells */}
      <section>
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-sm font-semibold tracking-wide">目的地</h2>
          <Link href="/universities" className="mono text-[10px] text-[var(--muted)] hover:text-[var(--ink)]">
            ALL MARKETS →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["US", "美国", "US"],
            ["UK", "英国", "UK"],
            ["CA", "加拿大", "CA"],
            ["AU", "澳大利亚", "AU"],
            ["CN", "中国", "CN"],
            ["HK", "中国香港", "HK"],
          ].map(([code, label, tag]) => (
            <Link key={code} href={`/universities?country=${code}`} className="dest-cell">
              <span className="mono text-[10px] text-[var(--muted)]">{tag}</span>
              <span className="text-lg font-bold tracking-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* track legend — one row, not essays */}
      <section className="panel">
        <div className="panel-head">
          <span>四条行情轨</span>
          <Link href="/systems" className="mono text-[10px] hover:text-[var(--ink)]">
            方法论 →
          </Link>
        </div>
        <div className="grid sm:grid-cols-4">
          {SYSTEM_ORDER.map((key, i) => {
            const s = SYSTEMS[key as SystemKey];
            return (
              <Link
                key={key}
                href={`/systems/${key}`}
                className={`flex flex-col gap-2 p-4 transition hover:bg-white ${i < 3 ? "sm:border-r sm:border-[var(--line)]" : ""}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="track-dot" style={{ background: SYSTEM_TRACK[key as SystemKey] }} />
                  <span className="font-semibold">{s.shortName}</span>
                </span>
                <span className="mono text-[11px] text-[var(--muted)]">最新 {s.latestYear}</span>
                <span className="line-clamp-2 text-[12px] text-[var(--muted)]">{s.blurb}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
