import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "选校行情台 · 优益思达",
    template: "%s · 优益思达行情台",
  },
  description: "优益思达选校行情台：QS / THE / ARWU / US News 四大榜对照、院校检索与跨体系对比。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
