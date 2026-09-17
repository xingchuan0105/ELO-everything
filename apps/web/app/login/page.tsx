"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
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
      await api("/auth/login", {
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
        <h1>记录员登录</h1>
        <p className="auth-hint">使用注册时的邮箱和密码进入工作台。</p>
        <form onSubmit={onSubmit}>
          <label>邮箱</label>
          <input name="email" type="email" autoComplete="email" required />
          <label>密码</label>
          <input name="password" type="password" autoComplete="current-password" required />
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "登录中…" : "进入工作台"}
          </button>
        </form>
        {error && (
          <p className="flash-err" style={{ marginTop: "0.75rem" }}>
            {error}
          </p>
        )}
        <p className="subtle" style={{ marginTop: "1rem" }}>
          还没有账号？<a href="/register">注册</a>
          {" · "}
          <a href="/help/guide#login">登录说明</a>
          {" · "}
          <a href="/help/faq#who-registers">选手要注册吗？</a>
        </p>
      </div>
    </div>
  );
}
