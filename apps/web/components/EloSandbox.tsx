"use client";

import { useState } from "react";

type Player = {
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  lastDelta: number;
};

type MatchLog = {
  id: number;
  winner: string;
  loser: string;
  delta: number;
  expectedWinPct: number;
};

type PresetKey = "pingpong" | "boardgame";

const PRESETS: Record<PresetKey, { label: string; k: number; players: Player[] }> = {
  pingpong: {
    label: "办公室乒乓球局（K=32）",
    k: 32,
    players: [
      { id: "p1", name: "林凯（上月冠军）", rating: 1310, wins: 5, losses: 1, lastDelta: 12 },
      { id: "p2", name: "陈雪", rating: 1245, wins: 3, losses: 2, lastDelta: 15 },
      { id: "p3", name: "赵磊", rating: 1180, wins: 2, losses: 3, lastDelta: -11 },
      { id: "p4", name: "周宁（新加入）", rating: 1120, wins: 1, losses: 4, lastDelta: -16 },
    ],
  },
  boardgame: {
    label: "周末双人桌游局（K=24）",
    k: 24,
    players: [
      { id: "b1", name: "阿哲", rating: 1280, wins: 4, losses: 1, lastDelta: 9 },
      { id: "b2", name: "小满", rating: 1220, wins: 3, losses: 2, lastDelta: 11 },
      { id: "b3", name: "南希", rating: 1190, wins: 2, losses: 2, lastDelta: -9 },
      { id: "b4", name: "老唐", rating: 1150, wins: 1, losses: 5, lastDelta: -11 },
    ],
  },
};

export function EloSandbox() {
  const [preset, setPreset] = useState<PresetKey>("pingpong");
  const [players, setPlayers] = useState<Player[]>(() => PRESETS.pingpong.players.map((p) => ({ ...p })));
  const [winnerId, setWinnerId] = useState<string>(PRESETS.pingpong.players[3].id);
  const [loserId, setLoserId] = useState<string>(PRESETS.pingpong.players[0].id);
  const [logs, setLogs] = useState<MatchLog[]>([]);

  const kFactor = PRESETS[preset].k;

  function switchPreset(next: PresetKey) {
    setPreset(next);
    const list = PRESETS[next].players.map((p) => ({ ...p }));
    setPlayers(list);
    setWinnerId(list[3].id);
    setLoserId(list[0].id);
    setLogs([]);
  }

  function recordMatch(wId: string, lId: string) {
    if (wId === lId) return;
    const w = players.find((p) => p.id === wId);
    const l = players.find((p) => p.id === lId);
    if (!w || !l) return;

    const expectedW = 1 / (1 + Math.pow(10, (l.rating - w.rating) / 400));
    const delta = Math.max(1, Math.round(kFactor * (1 - expectedW)));

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === wId) return { ...p, rating: p.rating + delta, wins: p.wins + 1, lastDelta: delta };
        if (p.id === lId) return { ...p, rating: p.rating - delta, losses: p.losses + 1, lastDelta: -delta };
        return p;
      })
    );
    setLogs((prev) => [
      { id: prev.length + 1, winner: w.name, loser: l.name, delta, expectedWinPct: Math.round(expectedW * 100) },
      ...prev.slice(0, 4),
    ]);
  }

  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const topPlayer = sorted[0];
  const underPlayer = sorted[sorted.length - 1];

  return (
    <section
      className="card"
      style={{
        marginTop: "1.75rem",
        padding: "1.25rem",
        border: "1px solid hsl(var(--border))",
        borderRadius: "var(--radius-card)",
        background: "hsl(var(--surface-muted))",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <span className="subtle" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
            免登录交互沙盒 · 示例数据
          </span>
          <h2 style={{ margin: "0.2rem 0 0" }}>10 秒试算一次 ELO 排名变化</h2>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => switchPreset(key)}
              className={preset === key ? "btn btn-primary" : "btn btn-ghost"}
              style={{ padding: "0.35rem 0.65rem", fontSize: "0.82rem" }}
            >
              {PRESETS[key].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto", marginTop: "0.9rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", background: "#fff", borderRadius: "0.5rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid hsl(var(--border))", textAlign: "left" }}>
              <th style={{ padding: "0.55rem 0.7rem" }}>排名</th>
              <th style={{ padding: "0.55rem 0.7rem" }}>选手（示例）</th>
              <th style={{ padding: "0.55rem 0.7rem" }}>当前积分</th>
              <th style={{ padding: "0.55rem 0.7rem" }}>胜 / 负</th>
              <th style={{ padding: "0.55rem 0.7rem" }}>最近变动</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: "1px solid hsl(var(--border-whisper))" }}>
                <td style={{ padding: "0.5rem 0.7rem", fontWeight: 650 }}>#{idx + 1}</td>
                <td style={{ padding: "0.5rem 0.7rem" }}>{p.name}</td>
                <td style={{ padding: "0.5rem 0.7rem", fontVariantNumeric: "tabular-nums", fontWeight: 650 }}>{p.rating}</td>
                <td style={{ padding: "0.5rem 0.7rem", color: "hsl(var(--muted-foreground))" }}>{p.wins} / {p.losses}</td>
                <td
                  style={{
                    padding: "0.5rem 0.7rem",
                    fontVariantNumeric: "tabular-nums",
                    color: p.lastDelta >= 0 ? "hsl(var(--win))" : "hsl(var(--lose))",
                    fontWeight: 600,
                  }}
                >
                  {p.lastDelta >= 0 ? `+${p.lastDelta}` : p.lastDelta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.9rem" }}>
        <select
          aria-label="胜方选手"
          value={winnerId}
          onChange={(e) => setWinnerId(e.target.value)}
          style={{ padding: "0.42rem 0.6rem", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", background: "#fff" }}
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              胜方：{p.name} ({p.rating})
            </option>
          ))}
        </select>
        <span className="muted">击败</span>
        <select
          aria-label="负方选手"
          value={loserId}
          onChange={(e) => setLoserId(e.target.value)}
          style={{ padding: "0.42rem 0.6rem", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", background: "#fff" }}
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              负方：{p.name} ({p.rating})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary"
          disabled={winnerId === loserId}
          onClick={() => recordMatch(winnerId, loserId)}
          style={{ padding: "0.45rem 0.85rem", fontSize: "0.88rem" }}
        >
          登记一局并算分
        </button>
        {topPlayer && underPlayer && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => recordMatch(underPlayer.id, topPlayer.id)}
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem" }}
          >
            试看冷门：{underPlayer.name.split("（")[0]} 击败榜首
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => switchPreset(preset)}
          style={{ padding: "0.45rem 0.7rem", fontSize: "0.85rem" }}
        >
          重置
        </button>
      </div>

      {logs.length > 0 && (
        <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.1rem", fontSize: "0.85rem", color: "hsl(var(--muted-foreground))" }}>
          {logs.map((m) => (
            <li key={m.id}>
              {m.winner} 胜 {m.loser}（赛前预期胜率 {m.expectedWinPct}%）→ 双方积分 <strong>±{m.delta}</strong>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <a className="btn btn-primary" href="/app">
          用这套机制创建我的真实赛事 →
        </a>
        <span className="subtle">以上为前端沙盒演练，不会写入真实账号；登录后可保存赛事与历史回溯。</span>
      </div>
    </section>
  );
}
