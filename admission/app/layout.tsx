import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI升学顾问 · 优益思达",
  description: "科技蓝单页步进：选校 → 学历 → 科目 → 录取评估",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <header className="border-b border-sky-500/15 bg-slate-950/40 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="tech-title text-base tracking-wide">
              AI升学顾问
            </Link>
            <nav className="flex gap-4 text-sm text-slate-400">
              <Link href="/" className="hover:text-sky-300">
                开始评估
              </Link>
              <a href="/rankings" className="hover:text-sky-300">
                大学排名
              </a>
              <a href="/" className="hover:text-sky-300">
                返回主站
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
