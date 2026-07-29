import Link from "next/link";

const LINKS = [
  { href: "/", label: "行情" },
  { href: "/systems", label: "体系" },
  { href: "/universities", label: "院校" },
  { href: "/compare", label: "对比" },
  { href: "/subjects", label: "学科" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--line-strong)] bg-[var(--panel-deep)] text-[var(--panel-deep-ink)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-sm font-bold tracking-wide text-white">优益思达</span>
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--gold)]">Rank Desk</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-[13px]">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-2.5 py-1 text-[rgba(232,237,242,0.72)] hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="/admission"
            className="ml-1 border border-[var(--gold)] px-2.5 py-1 text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--ink)]"
          >
            估录取
          </a>
          <a href="/" className="px-2.5 py-1 text-[rgba(232,237,242,0.45)] hover:text-white">
            主站
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-[var(--line)] py-8 text-center text-[11px] leading-relaxed text-[var(--muted)]">
      <p>数据聚合自公开排名信息，仅供选校参考 · 与 QS / THE / 软科 / U.S. News 无关联</p>
      <p className="mono mt-2 text-[10px] tracking-wider">YYSD RANK DESK · {new Date().getFullYear()}</p>
    </footer>
  );
}
