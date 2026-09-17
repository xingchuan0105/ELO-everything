"use client";

import { useEffect } from "react";

const NAV = [
  { href: "/help", label: "目录" },
  { href: "/help/elo", label: "什么是 ELO" },
  { href: "/help/guide", label: "如何使用" },
  { href: "/help/params", label: "参数说明" },
  { href: "/help/faq", label: "常见问题" },
];

export function HelpNav({ active }: { active?: string }) {
  return (
    <nav className="help-subnav" aria-label="帮助导航">
      {NAV.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={
            active === item.href || (active && item.href !== "/help" && active.startsWith(item.href))
              ? "help-subnav-link active"
              : "help-subnav-link"
          }
        >
          {item.label}
        </a>
      ))}
      <a href="/app" className="help-subnav-link help-subnav-work">
        工作台
      </a>
    </nav>
  );
}

/** 打开带 hash 的页面时，滚动并高亮目标章节；支持 hashchange 再次跳转 */
export function HashHighlight() {
  useEffect(() => {
    let clearTimer: number | undefined;

    function flashTarget() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const el = document.getElementById(hash);
      if (!el) return;
      // 若目标在 <details> 内或本身是 details，先展开
      if (el instanceof HTMLDetailsElement) el.open = true;
      const parentDetails = el.closest("details");
      if (parentDetails) parentDetails.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.remove("help-anchor-flash");
      // 强制重启动画，便于同页二次点同一锚点
      void el.offsetWidth;
      el.classList.add("help-anchor-flash");
      if (clearTimer) window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(() => el.classList.remove("help-anchor-flash"), 2400);
    }

    // 等布局稳定后再滚（避免 sticky 顶栏遮挡）
    const ready = window.requestAnimationFrame(() => {
      window.setTimeout(flashTarget, 40);
    });
    window.addEventListener("hashchange", flashTarget);
    return () => {
      window.cancelAnimationFrame(ready);
      window.removeEventListener("hashchange", flashTarget);
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, []);
  return null;
}

export function HelpFooterNav({
  prev,
  next,
}: {
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
}) {
  return (
    <div className="help-footer-nav">
      {prev ? (
        <a href={prev.href} className="btn btn-secondary">
          ← {prev.label}
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a href={next.href} className="btn btn-primary">
          {next.label} →
        </a>
      ) : (
        <a href="/app" className="btn btn-primary">
          进入工作台
        </a>
      )}
    </div>
  );
}
