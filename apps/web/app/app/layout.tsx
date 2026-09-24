import type { Metadata } from "next";

// 记录员工作台（登录后使用）：不进索引，链接可跟随
export const metadata: Metadata = {
  title: "工作台",
  robots: { index: false, follow: true },
  alternates: { canonical: "/app" },
};

export default function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
