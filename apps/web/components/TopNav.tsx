"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { BRAND_HOME, BRAND_NAME } from "@/lib/brand";

type User = { displayName: string; email: string; accountId: string };

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ user: User }>("/auth/me");
        if (!cancelled) setUser(res.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function logout() {
    setBusy(true);
    try {
      await api("/auth/logout", { method: "POST", body: "{}" });
    } catch {
      /* ignore */
    } finally {
      setUser(null);
      setBusy(false);
      router.push("/login");
      router.refresh();
    }
  }

  if (!ready) {
    return <nav className="topnav topnav-skeleton" aria-hidden />;
  }

  const helpActive = pathname?.startsWith("/help");

  if (user) {
    return (
      <nav className="topnav topnav-auth">
        <a href={BRAND_HOME} className="topnav-link topnav-hub" title={`${BRAND_NAME} 官网`}>
          官网
        </a>
        <a href="/help" className={helpActive ? "topnav-link active" : "topnav-link"}>
          帮助
        </a>
        <span className="topnav-user" title={user.email}>
          <span className="topnav-user-label">已登录</span>
          <span className="topnav-user-name">{user.displayName || user.email}</span>
        </span>
        <a href="/app" className={pathname?.startsWith("/app") ? "topnav-link active" : "topnav-link"}>
          工作台
        </a>
        <button type="button" className="topnav-logout" onClick={logout} disabled={busy}>
          {busy ? "退出中…" : "退出"}
        </button>
      </nav>
    );
  }

  return (
    <nav className="topnav">
      <a href={BRAND_HOME} className="topnav-link topnav-hub" title={`${BRAND_NAME} 官网`}>
        官网
      </a>
      <a href="/help" className={helpActive ? "topnav-link active" : "topnav-link"}>
        帮助
      </a>
      <a href="/login" className={pathname === "/login" ? "topnav-link active" : "topnav-link"}>
        登录
      </a>
      <a href="/register" className={pathname === "/register" ? "topnav-link active" : "topnav-link"}>
        注册
      </a>
    </nav>
  );
}
