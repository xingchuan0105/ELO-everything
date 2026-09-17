import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { BRAND_HOME, BRAND_NAME } from "@/lib/brand";

const SITE_URL = "https://elo.contextlm.top";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ELO-everything",
    template: "%s · ELO-everything",
  },
  description: "线下比赛记分与排名 · 记录员工具 · Context-OS 工具家族",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/logo-mark.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/brand/logo-mark.svg" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // GEO：WebApplication 实体标注
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "ELO-everything",
    url: SITE_URL,
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    inLanguage: "zh-CN",
    description:
      "线下比赛记分与排名工具：ELO 评分制的比赛记录、选手排名与历史战绩管理。ContextLM 旗下工具，2026 年起持续维护。",
    isPartOf: { "@type": "Organization", name: "ContextLM", url: "https://contextlm.top/" },
  };

  return (
    <html lang="zh-CN">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />
        <header className="topbar">
          <div className="brand-lockup">
            <a
              href={BRAND_HOME}
              className="brand-hub"
              title={`${BRAND_NAME} 官网`}
              aria-label={`返回 ${BRAND_NAME} 品牌官网`}
            >
              {BRAND_NAME}
            </a>
            <span className="brand-sep" aria-hidden>
              /
            </span>
            <a href="/" className="brand" aria-label="ELO-everything 首页">
              <img
                className="brand-logo"
                src="/brand/logo-mark.svg"
                width={28}
                height={28}
                alt=""
              />
              <span className="brand-text">
                <span className="brand-title">ELO-everything</span>
              </span>
            </a>
          </div>
          <TopNav />
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
