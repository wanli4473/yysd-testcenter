import Link from "next/link";

const LINKS = [
  { href: "/", label: "首页" },
  { href: "/systems", label: "排名体系" },
  { href: "/universities", label: "院校库" },
  { href: "/compare", label: "院校对比" },
  { href: "/subjects", label: "学科排名" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--card)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="sans text-sm font-semibold tracking-wide text-[var(--accent)]">
          优益思达 · 全球大学排名
        </Link>
        <nav className="sans flex flex-wrap gap-4 text-sm text-[var(--muted)]">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-[var(--accent)]">
              {l.label}
            </Link>
          ))}
          <a href="/admission" className="hover:text-[var(--accent)]">
            AI升学顾问
          </a>
          <a href="/" className="hover:text-[var(--accent)]">
            返回主站
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="sans mt-16 border-t border-[var(--line)] py-10 text-center text-xs leading-relaxed text-[var(--muted)]">
      <p>排名数据来源于各官方排名网站的公开信息聚合，仅供选校参考。</p>
      <p className="mt-1">本站与 QS、THE、软科、U.S. News 等机构无关联关系，不代表官方立场。</p>
      <p className="mt-3">© {new Date().getFullYear()} 优益思达</p>
    </footer>
  );
}
