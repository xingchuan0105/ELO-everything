import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "帮助",
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <div className="help-shell">{children}</div>;
}
