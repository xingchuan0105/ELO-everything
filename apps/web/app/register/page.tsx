"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ user: unknown }>("/auth/me")
      .then(() => router.replace("/app"))
      .catch(() => {});
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: fd.get("email"),
          password: fd.get("password"),
        }),
      });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>注册记录员账号</h1>
        <p className="auth-hint">
          这里是<strong>赛事记录员 / 管理员</strong>的登录账号，不是选手。选手稍后在赛事里用姓名添加即可。
        </p>
        <form onSubmit={onSubmit}>
          <label>邮箱（登录账号）</label>
          <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          <label>密码（至少 8 位）</label>
          <input name="password" type="password" autoComplete="new-password" minLength={8} required />
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "创建中…" : "创建账号"}
          </button>
        </form>
        {error && (
          <p className="flash-err" style={{ marginTop: "0.75rem" }}>
            {error}
          </p>
        )}
        <p className="subtle" style={{ marginTop: "1rem" }}>
          已有账号？<a href="/login">去登录</a>
          {" · "}
          <a href="/help/guide#roles">你是记录员</a>
          {" · "}
          <a href="/help/faq#who-registers">选手要注册吗？</a>
        </p>
      </div>
    </div>
  );
}
