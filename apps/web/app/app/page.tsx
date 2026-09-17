"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { FieldLabel, HelpTip } from "@/components/HelpTip";
import { EmptyHelp } from "@/components/help/EmptyHelp";

type User = { displayName: string; accountId: string; email: string };
type Workspace = { id: string; name: string; slug: string; role: string };
type League = {
  id: string;
  name: string;
  slug: string;
  formatDefault: string;
  createdAt?: string;
  config?: {
    k_factor: number;
    start_rating: number;
    allow_draw: boolean;
    k_provisional?: number;
    provisional_games?: number;
  };
};

export default function ManagePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [wsId, setWsId] = useState("");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState("");
  const [kFactor, setKFactor] = useState(32);
  const [startRating, setStartRating] = useState(1500);
  const [allowDraw, setAllowDraw] = useState(true);
  const [kProv, setKProv] = useState(40);
  const [provGames, setProvGames] = useState(20);
  const [showAdvanced, setShowAdvanced] = useState(false);
  /** 默认每队人数 1–5；记分页可按行覆盖 */
  const [defaultTeamSize, setDefaultTeamSize] = useState(1);

  const refreshLeagues = useCallback(async (wid: string) => {
    const ls = await api<League[]>(`/workspaces/${wid}/ladders`);
    setLeagues(ls);
    return ls;
  }, []);

  useEffect(() => {
    (async () => {
      setBooting(true);
      try {
        const me = await api<{ user: User }>("/auth/me");
        setUser(me.user);
        const ws = await api<Workspace[]>("/workspaces");
        if (ws[0]?.id) {
          setWsId(ws[0].id);
          await refreshLeagues(ws[0].id);
        }
      } catch (e) {
        setUser(null);
        setErr(String((e as Error).message || e));
      } finally {
        setBooting(false);
      }
    })();
  }, [refreshLeagues]);

  async function createLeague(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    if (!wsId) {
      setErr("工作区未就绪，请刷新或重新登录");
      return;
    }
    const name = newName.trim();
    if (!name) {
      setErr("请填写赛事名称");
      return;
    }
    try {
      setBusy(true);
      const teamSize = Math.min(5, Math.max(1, defaultTeamSize));
      const formatDefault = teamSize <= 1 ? "1v1" : teamSize === 2 ? "2v2" : "nvn";
      const league = await api<League>(`/workspaces/${wsId}/ladders`, {
        method: "POST",
        body: JSON.stringify({
          name,
          preset: "chess_like",
          formatDefault,
          defaultTeamSize: teamSize,
          rules: {
            k_factor: kFactor,
            start_rating: startRating,
            allow_draw: allowDraw,
            k_provisional: Math.max(kProv, kFactor),
            provisional_games: provGames,
          },
        }),
      });
      setMsg(`已创建「${league.name}」`);
      setNewName("");
      await refreshLeagues(wsId);
      router.push(`/app/events/${league.id}`);
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  if (booting) return <p className="muted">正在进入…</p>;
  if (!user) {
    return (
      <div className="card">
        <p className="flash-err">{err || "请先登录"}</p>
        <div className="toolbar" style={{ marginTop: "0.75rem" }}>
          <a className="btn btn-primary" href="/login">
            去登录
          </a>
          <a className="btn btn-secondary" href="/register">
            注册记录员账号
          </a>
        </div>
        <EmptyHelp href="/help/guide#login" linkLabel="注册与登录说明" title="需要记录员账号">
          选手不用注册。只有记分、管赛事的人需要邮箱登录。
        </EmptyHelp>
      </div>
    );
  }

  return (
    <div>
      <h1>我的赛事</h1>
      <p className="lead">
        你好，{user.displayName}。在此创建与管理赛事；点进某一场后，再添加选手、登记对局与发布排名。
      </p>
      {msg && <p className="flash-ok">{msg}</p>}
      {err && <p className="flash-err">{err}</p>}

      <section className="card">
        <h2>赛事列表</h2>
        <div className="league-grid" style={{ marginTop: "0.75rem" }}>
          {leagues.map((l) => {
            const ts =
              (l.config as { default_team_size?: number } | undefined)?.default_team_size ??
              (l.formatDefault === "2v2" ? 2 : l.formatDefault === "nvn" ? 3 : 1);
            const fmt = ts <= 1 ? "1v1" : `${ts}v${ts}`;
            return (
              <a key={l.id} href={`/app/events/${l.id}`} className="league-tile">
                <strong>{l.name}</strong>
                <span className="subtle">
                  {fmt} · K={l.config?.k_factor ?? "—"} · 起始 {l.config?.start_rating ?? "—"}
                  {l.config?.allow_draw === false ? " · 不可平局" : " · 可平局"}
                </span>
                <span className="subtle" style={{ display: "block", marginTop: 6 }}>
                  进入记分 →
                </span>
              </a>
            );
          })}
          {!leagues.length && (
            <EmptyHelp href="/help/guide#create-event" linkLabel="如何创建赛事" title="还没有赛事">
              在下方填写名称与积分设置，创建第一场赛事（例如「周五桌球局」），再进去添加选手、记分。
            </EmptyHelp>
          )}
        </div>
      </section>

      <section className="card">
        <h2>创建新赛事</h2>
        <form onSubmit={createLeague}>
          <FieldLabel>赛事名称</FieldLabel>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例如：周五桌球局"
            required
            disabled={!wsId || busy}
          />
          <FieldLabel>默认赛制（每队人数）</FieldLabel>
          <select
            value={defaultTeamSize}
            onChange={(e) => setDefaultTeamSize(Number(e.target.value))}
            disabled={busy}
          >
            <option value={1}>1v1 — 单打</option>
            <option value={2}>2v2 — 双人组队</option>
            <option value={3}>3v3 — 三人组队</option>
            <option value={4}>4v4 — 四人组队</option>
            <option value={5}>5v5 — 五人组队</option>
          </select>
          <p className="subtle" style={{ marginTop: "0.35rem" }}>
            记分页每一行可单独改人数（1–5）。两侧人数须相等；队分取成员平均，同侧每人同一完整 Δ（equal
            full-Δ）。选手可填可选队伍名（展示用，不计「队分实体」）。
          </p>
          <div className="row" style={{ marginTop: "0.5rem" }}>
            <div>
              <FieldLabel tip="k-factor">积分步长 K</FieldLabel>
              <input
                type="number"
                min={1}
                max={64}
                value={kFactor}
                onChange={(e) => setKFactor(Number(e.target.value))}
              />
            </div>
            <div>
              <FieldLabel tip="start-rating">起始分</FieldLabel>
              <input
                type="number"
                min={0}
                max={5000}
                value={startRating}
                onChange={(e) => setStartRating(Number(e.target.value))}
              />
            </div>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={allowDraw} onChange={(e) => setAllowDraw(e.target.checked)} />
            <span>
              允许平局 <HelpTip id="allow-draw" />
            </span>
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: "0.5rem" }}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "收起高级设置" : "高级设置"}
          </button>
          {showAdvanced && (
            <div className="row">
              <div>
                <FieldLabel tip="k-provisional">新手步长</FieldLabel>
                <input
                  type="number"
                  min={1}
                  max={128}
                  value={kProv}
                  onChange={(e) => setKProv(Number(e.target.value))}
                />
              </div>
              <div>
                <FieldLabel tip="provisional-games">新手保护场次</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={provGames}
                  onChange={(e) => setProvGames(Number(e.target.value))}
                />
              </div>
            </div>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={!wsId || busy}>
            {busy ? "创建中…" : "创建并进入记分"}
          </button>
          <p className="subtle" style={{ marginTop: "0.75rem" }}>
            <a href="/help/guide#create-event">如何创建赛事？</a>
            {" · "}
            <a href="/help/params">参数详解</a>
          </p>
        </form>
      </section>
    </div>
  );
}
