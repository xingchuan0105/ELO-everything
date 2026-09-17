"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { HelpTip } from "@/components/HelpTip";
import { EmptyHelp } from "@/components/help/EmptyHelp";

const MAX_TEAM = 5;
const DEFAULT_ROWS = 8;

type League = {
  id: string;
  name: string;
  formatDefault?: string;
  maxTeamSize?: number;
  config?: {
    k_factor: number;
    start_rating: number;
    allow_draw: boolean;
    default_team_size?: number;
  };
};
type Player = {
  id: string;
  name: string;
  teamName?: string | null;
  rating: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  provisional: boolean;
};
type HistoryRow = {
  match: {
    id: string;
    status: string;
    winnerSide: string | null;
    sequenceNo: number | null;
    playedAt: string;
    format?: string;
  };
  participants: Array<{
    competitorId: string | null;
    side: string;
    delta: string | null;
    name: string | null;
    teamName?: string | null;
  }>;
};

type Tab = "score" | "players" | "rank" | "pair" | "history";
type Result = "A" | "B" | "draw" | "";
type MatchFormat = "1v1" | "2v2" | "nvn";

type MemberPreview = {
  id: string;
  delta: number;
  before: number;
  after: number;
};

type ScoreRow = {
  key: string;
  /** 本行每队人数 1–5（可覆盖赛事默认） */
  teamSize: number;
  homeIds: string[];
  awayIds: string[];
  result: Result;
  scoreHome: string;
  scoreAway: string;
  playedAt: string;
  preview?: {
    homeDelta: number;
    awayDelta: number;
    home: MemberPreview[];
    away: MemberPreview[];
  } | null;
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  if (!local) return new Date().toISOString();
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function formatFromSize(n: number): MatchFormat {
  if (n <= 1) return "1v1";
  if (n === 2) return "2v2";
  return "nvn";
}

function formatLabel(n: number): string {
  if (n <= 1) return "1v1";
  return `${n}v${n}`;
}

function resolveDefaultTeamSize(lg: League | null): number {
  if (!lg) return 1;
  const fromConfig = lg.config?.default_team_size;
  if (fromConfig != null && fromConfig >= 1 && fromConfig <= MAX_TEAM) return fromConfig;
  if (lg.formatDefault === "2v2") return 2;
  if (lg.formatDefault === "nvn") return Math.min(MAX_TEAM, Math.max(3, lg.maxTeamSize ?? 3));
  return 1;
}

function padIds(ids: string[], size: number): string[] {
  const next = ids.slice(0, size);
  while (next.length < size) next.push("");
  return next;
}

function emptyRow(teamSize: number, offsetMin = 0): ScoreRow {
  const d = new Date(Date.now() + offsetMin * 60_000);
  const size = Math.min(MAX_TEAM, Math.max(1, teamSize));
  return {
    key: Math.random().toString(36).slice(2),
    teamSize: size,
    homeIds: Array.from({ length: size }, () => ""),
    awayIds: Array.from({ length: size }, () => ""),
    result: "",
    scoreHome: "",
    scoreAway: "",
    playedAt: toLocalInputValue(d),
    preview: null,
  };
}

function emptyRows(n: number, teamSize: number): ScoreRow[] {
  return Array.from({ length: n }, (_, i) => emptyRow(teamSize, i * 10));
}

function sideFilled(ids: string[], size: number): boolean {
  const slice = ids.slice(0, size);
  return slice.length === size && slice.every(Boolean) && new Set(slice).size === size;
}

function rowComplete(r: ScoreRow): boolean {
  if (!r.result) return false;
  if (!sideFilled(r.homeIds, r.teamSize) || !sideFilled(r.awayIds, r.teamSize)) return false;
  const home = r.homeIds.slice(0, r.teamSize);
  const away = r.awayIds.slice(0, r.teamSize);
  if (home.some((id) => away.includes(id))) return false;
  return true;
}

function rowToItem(r: ScoreRow) {
  const sideA = r.homeIds.slice(0, r.teamSize);
  const sideB = r.awayIds.slice(0, r.teamSize);
  return {
    format: formatFromSize(r.teamSize),
    winnerSide: r.result as "A" | "B" | "draw",
    sideA,
    sideB,
    scoreA: r.scoreHome === "" ? null : Number(r.scoreHome),
    scoreB: r.scoreAway === "" ? null : Number(r.scoreAway),
    playedAt: localToIso(r.playedAt),
  };
}

function itemSig(it: {
  sideA: string[];
  sideB: string[];
  winnerSide: string;
  playedAt?: string | null;
}): string {
  return `${[...it.sideA].sort().join(",")}|${[...it.sideB].sort().join(",")}|${it.winnerSide}|${it.playedAt}`;
}

function participantLabel(p: { name: string | null; teamName?: string | null }): string {
  const n = p.name ?? "—";
  return p.teamName ? `${n}（${p.teamName}）` : n;
}

function namesJoin(
  participants: HistoryRow["participants"],
  side: string,
): string {
  return participants
    .filter((p) => p.side === side)
    .map(participantLabel)
    .join("+");
}

/** 一侧多选：每队 N 个下拉槽 */
function TeamSlots({
  size,
  value,
  onChange,
  players,
  exclude,
}: {
  size: number;
  value: string[];
  onChange: (ids: string[]) => void;
  players: Player[];
  exclude: string[];
}) {
  const slots = padIds(value, size);
  const takenInSide = new Set(slots.filter(Boolean));

  return (
    <div className="team-slots">
      {slots.map((id, i) => (
        <select
          key={i}
          value={id}
          aria-label={`队员 ${i + 1}`}
          onChange={(e) => {
            const next = [...slots];
            next[i] = e.target.value;
            onChange(next);
          }}
        >
          <option value="">{size === 1 ? "选择" : `队员${i + 1}`}</option>
          {players.map((p) => {
            const blocked =
              (exclude.includes(p.id) || (takenInSide.has(p.id) && p.id !== id)) && p.id !== id;
            const label = p.teamName
              ? `${p.name}·${p.teamName}（${Number(p.rating).toFixed(0)}）`
              : `${p.name}（${Number(p.rating).toFixed(0)}）`;
            return (
              <option key={p.id} value={p.id} disabled={blocked && p.id !== id}>
                {label}
              </option>
            );
          })}
        </select>
      ))}
    </div>
  );
}

export default function EventScorePage() {
  const params = useParams();
  const leagueId = String(params?.id ?? "");

  const [league, setLeague] = useState<League | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [drafts, setDrafts] = useState<HistoryRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [tab, setTab] = useState<Tab>("score");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [defaultTeamSize, setDefaultTeamSize] = useState(1);
  const [rows, setRows] = useState<ScoreRow[]>(() => emptyRows(DEFAULT_ROWS, 1));
  const [rowsSeeded, setRowsSeeded] = useState(false);
  const [playerNames, setPlayerNames] = useState("");
  const [pairText, setPairText] = useState("");
  const [pairTeamSize, setPairTeamSize] = useState(1);

  const labelOf = useCallback(
    (id: string) => {
      const p = players.find((x) => x.id === id);
      if (!p) return "—";
      return p.teamName ? `${p.name}（${p.teamName}）` : p.name;
    },
    [players],
  );

  const nameOf = labelOf;

  const allowDraw = league?.config?.allow_draw ?? true;

  const refreshAll = useCallback(async () => {
    if (!leagueId) return;
    const [lg, pl, dr, hi] = await Promise.all([
      api<League>(`/ladders/${leagueId}`),
      api<Player[]>(`/ladders/${leagueId}/players`),
      api<HistoryRow[]>(`/ladders/${leagueId}/matches?status=draft`),
      api<HistoryRow[]>(`/ladders/${leagueId}/matches?status=rated`),
    ]);
    setLeague(lg);
    setPlayers(pl);
    setDrafts(dr);
    setHistory(hi);
    const size = resolveDefaultTeamSize(lg);
    setDefaultTeamSize(size);
    setPairTeamSize(size);
    return size;
  }, [leagueId]);

  useEffect(() => {
    (async () => {
      setBooting(true);
      try {
        await api("/auth/me");
        const size = await refreshAll();
        if (size != null && !rowsSeeded) {
          setRows(emptyRows(DEFAULT_ROWS, size));
          setRowsSeeded(true);
        }
      } catch (e) {
        setErr(String((e as Error).message || e));
      } finally {
        setBooting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshAll]);

  const rowsKey = rows
    .map((r) =>
      [r.teamSize, r.homeIds.join(","), r.awayIds.join(","), r.result, r.scoreHome, r.scoreAway, r.playedAt].join(
        "|",
      ),
    )
    .join(";");

  // Chained preview by playedAt
  useEffect(() => {
    if (!leagueId) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const complete = rows.filter(rowComplete);
      if (!complete.length) {
        if (!cancelled) {
          setRows((prev) => prev.map((r) => (r.preview ? { ...r, preview: null } : r)));
        }
        return;
      }
      try {
        const items = complete.map(rowToItem);
        const res = await api<{
          results: Array<{
            deltas: Array<{
              competitor_id: string;
              delta: number;
              rating_after: number;
              rating_before: number;
            }>;
          }>;
        }>(`/ladders/${leagueId}/matches/preview-batch`, {
          method: "POST",
          body: JSON.stringify({ items }),
        });

        const bySig = new Map<string, (typeof res.results)[0]>();
        const orderedItems = [...items].sort((a, b) => {
          const ta = Date.parse(a.playedAt!);
          const tb = Date.parse(b.playedAt!);
          return ta - tb;
        });
        orderedItems.forEach((it, i) => {
          bySig.set(itemSig(it), res.results[i]!);
        });

        if (cancelled) return;
        setRows((prev) =>
          prev.map((r) => {
            if (!rowComplete(r)) return { ...r, preview: null };
            const it = rowToItem(r);
            const pr = bySig.get(itemSig(it));
            if (!pr) return { ...r, preview: null };
            const home = it.sideA.map((id) => {
              const d = pr.deltas.find((x) => x.competitor_id === id);
              return {
                id,
                delta: d?.delta ?? 0,
                before: d?.rating_before ?? 0,
                after: d?.rating_after ?? 0,
              };
            });
            const away = it.sideB.map((id) => {
              const d = pr.deltas.find((x) => x.competitor_id === id);
              return {
                id,
                delta: d?.delta ?? 0,
                before: d?.rating_before ?? 0,
                after: d?.rating_after ?? 0,
              };
            });
            return {
              ...r,
              preview: {
                homeDelta: home[0]?.delta ?? 0,
                awayDelta: away[0]?.delta ?? 0,
                home,
                away,
              },
            };
          }),
        );
      } catch {
        if (!cancelled) {
          setRows((prev) => prev.map((r) => ({ ...r, preview: null })));
        }
      }
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsKey, leagueId]);

  const sortedRank = useMemo(
    () => [...players].sort((a, b) => Number(b.rating) - Number(a.rating)),
    [players],
  );

  function updateRow(key: string, patch: Partial<ScoreRow>) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.teamSize != null && patch.teamSize !== r.teamSize) {
          const size = Math.min(MAX_TEAM, Math.max(1, patch.teamSize));
          next.teamSize = size;
          next.homeIds = padIds(r.homeIds, size);
          next.awayIds = padIds(r.awayIds, size);
          next.preview = null;
        }
        return next;
      }),
    );
  }

  function completeItems() {
    return rows.filter(rowComplete).map(rowToItem);
  }

  async function addPlayers(e: React.FormEvent) {
    e.preventDefault();
    const names = playerNames
      .split(/[\n,，、;；]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) return;
    try {
      setBusy(true);
      await api(`/ladders/${leagueId}/players`, {
        method: "POST",
        body: JSON.stringify({ names }),
      });
      setPlayerNames("");
      setMsg(`已添加 ${names.length} 名选手`);
      await refreshAll();
      setTab("score");
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function saveDrafts() {
    const items = completeItems();
    if (!items.length) {
      setErr("请至少完整填写一行：人数、主客双方、结果、对局时间（两侧人数须相等且无人重复）");
      return;
    }
    try {
      setBusy(true);
      setErr("");
      const res = await api<{ saved: number; note?: string }>(`/ladders/${leagueId}/matches/drafts`, {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      setMsg(`已保存 ${res.saved} 场草稿（未计分）。${res.note ?? ""}`);
      setRows(emptyRows(DEFAULT_ROWS, defaultTeamSize));
      await refreshAll();
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function publishAll() {
    try {
      setBusy(true);
      setErr("");
      const items = completeItems();
      if (items.length) {
        await api(`/ladders/${leagueId}/matches/drafts`, {
          method: "POST",
          body: JSON.stringify({ items }),
        });
        setRows(emptyRows(DEFAULT_ROWS, defaultTeamSize));
      }
      const res = await api<{ published: number }>(`/ladders/${leagueId}/matches/publish`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMsg(`已按对局时间顺序发布 ${res.published} 场，排名已更新`);
      await refreshAll();
      setTab("rank");
    } catch (e) {
      setErr(String((e as Error).message) + "（失败则整批回滚）");
      await refreshAll();
    } finally {
      setBusy(false);
    }
  }

  async function publishDraftsOnly() {
    try {
      setBusy(true);
      const res = await api<{ published: number }>(`/ladders/${leagueId}/matches/publish`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMsg(`已发布 ${res.published} 场，排名已更新`);
      await refreshAll();
      setTab("rank");
    } catch (e) {
      setErr(String((e as Error).message) + "（整批已回滚）");
    } finally {
      setBusy(false);
    }
  }

  async function voidMatch(id: string) {
    if (!confirm("确定撤销？将按剩余已发布场次重算排名。")) return;
    try {
      setBusy(true);
      await api(`/matches/${id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: "记录员撤销" }),
      });
      setMsg("已撤销并重算");
      await refreshAll();
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft(id: string) {
    try {
      setBusy(true);
      await api(`/matches/${id}`, { method: "DELETE" });
      await refreshAll();
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function runPairing() {
    const teamSize = Math.min(MAX_TEAM, Math.max(1, pairTeamSize));
    const need = teamSize * 2;
    if (players.length < need) {
      setErr(`${formatLabel(teamSize)} 至少需要 ${need} 名选手`);
      return;
    }
    try {
      setBusy(true);
      const pool = players.map((p) => p.id).slice(0, 32);
      const session = await api<{ session: { id: string } }>(`/ladders/${leagueId}/pairing-sessions`, {
        method: "POST",
        body: JSON.stringify({
          format: formatFromSize(teamSize),
          teamSize,
          pool,
          policyPreset: "fair",
          matchesToEmit: Math.floor(pool.length / need),
        }),
      });
      const gen = await api<{
        proposals: Array<{ matches: Array<{ sideA: string[]; sideB: string[] }> }>;
      }>(`/pairing-sessions/${session.session.id}/generate`, {
        method: "POST",
        body: "{}",
      });
      const best = gen.proposals[0];
      if (!best) throw new Error("没有合适的对阵");
      setPairText(
        best.matches
          .map((m, i) => {
            const a = m.sideA.map(nameOf).join("+");
            const b = m.sideB.map(nameOf).join("+");
            return `${i + 1}. 主 ${a} vs 客 ${b}`;
          })
          .join("\n"),
      );
      const filled = best.matches.map((m, i) => ({
        ...emptyRow(teamSize, i * 10),
        homeIds: padIds(m.sideA, teamSize),
        awayIds: padIds(m.sideB, teamSize),
      }));
      while (filled.length < DEFAULT_ROWS) filled.push(emptyRow(teamSize, filled.length * 10));
      setRows(filled);
      setTab("score");
      setMsg("已生成对阵并填入表；请按实际时间调整「对局时间」并选择结果");
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  if (booting) return <p className="muted">加载赛事…</p>;
  if (!league) {
    return (
      <div className="card">
        <p className="flash-err">{err || "赛事不存在或无权访问"}</p>
        <div className="toolbar" style={{ marginTop: "0.75rem" }}>
          <a className="btn btn-secondary" href="/app">
            返回赛事列表
          </a>
          <a className="btn btn-ghost" href="/help/faq">
            常见问题
          </a>
        </div>
        <EmptyHelp href="/help/guide#create-event" linkLabel="如何创建赛事">
          若链接失效，可回工作台重新进入，或新建一场赛事。
        </EmptyHelp>
      </div>
    );
  }

  const minPlayersHint = defaultTeamSize * 2;

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: "0.75rem" }}>
        <a className="btn btn-ghost" href="/app">
          ← 全部赛事
        </a>
      </div>
      <h1>{league.name}</h1>
      <p className="lead">
        K={league.config?.k_factor ?? "—"} · 起始 {league.config?.start_rating ?? "—"}
        {allowDraw ? " · 可平局" : " · 不可平局"}
        {" · "}
        默认 {formatLabel(defaultTeamSize)}
        {" · "}
        每队最多 {MAX_TEAM} 人
      </p>
      {msg && <p className="flash-ok">{msg}</p>}
      {err && <p className="flash-err">{err}</p>}

      <div className="tabs">
        {(
          [
            ["score", "记分"],
            ["players", "选手"],
            ["rank", "排名"],
            ["pair", "辅助配对"],
            ["history", "历史 / 撤销"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tab${tab === id ? " active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "players" && (
        <section className="card">
          <h2>选手</h2>
          <p className="subtle" style={{ marginTop: 0 }}>
            选手不用注册账号，写名字即可。可选填队伍名（仅展示，计分仍按个人）。组队赛建议至少{" "}
            {minPlayersHint} 人。 <a href="/help/guide#add-players">添加说明</a>
          </p>
          <form onSubmit={addPlayers}>
            <textarea
              rows={5}
              value={playerNames}
              onChange={(e) => setPlayerNames(e.target.value)}
              placeholder={"张三\n李四@火箭队\n王五|蓝翼"}
            />
            <p className="subtle" style={{ marginTop: "0.35rem" }}>
              每行一人；队伍名用 <code>名字@队名</code> 或 <code>名字|队名</code>（可选）。
            </p>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              添加选手
            </button>
          </form>
          {!players.length ? (
            <EmptyHelp href="/help/guide#add-players" linkLabel="如何添加选手" title="还没有选手">
              每行一个名字；需要标注队伍时写「张三@队名」。提交后即可到「记分」登记对局。
            </EmptyHelp>
          ) : (
            <div className="player-grid" style={{ marginTop: "1rem" }}>
              {players.map((p) => (
                <span key={p.id} className="player-chip">
                  {p.name}
                  {p.teamName ? <span className="badge" style={{ marginLeft: 6 }}>{p.teamName}</span> : null}
                  <span className="subtle"> · {Number(p.rating).toFixed(0)}</span>
                  {p.provisional ? (
                    <span className="badge" style={{ marginLeft: 6 }}>
                      新面孔
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "score" && (
        <section className="card">
          <h2>登记对局</h2>
          <div className="card-muted time-hint">
            <strong>
              时序规则（必读） <HelpTip id="played-at" />
            </strong>
            <p className="muted" style={{ margin: "0.4rem 0 0" }}>
              若同一人打了多场，请按<strong>实际对阵先后</strong>填写「对局时间」。系统按时间顺序链式计分。{" "}
              <a href="/help/guide#timing">为什么要按时间录？</a>
            </p>
          </div>
          <div className="card-muted" style={{ marginTop: "0.65rem" }}>
            <strong>
              组队规则 <HelpTip id="home-away" />
            </strong>
            <p className="muted" style={{ margin: "0.4rem 0 0" }}>
              主客两侧<strong>人数须相等</strong>（1–{MAX_TEAM}）。队分 = 成员积分平均；同侧每人获得相同完整 Δ。默认{" "}
              {formatLabel(defaultTeamSize)}，每一行可单独改「人数」。
            </p>
          </div>

          {players.length < 2 ? (
            <EmptyHelp href="/help/guide#add-players" linkLabel="查看添加步骤" title="还不能记分">
              <p style={{ margin: "0 0 0.65rem" }}>请先添加至少两名选手，再登记主客对局。</p>
              <button type="button" className="btn btn-secondary" onClick={() => setTab("players")}>
                去添加选手
              </button>
            </EmptyHelp>
          ) : (
            <>
              <div className="score-table-wrap">
                <table className="table score-table score-table-team">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>人数</th>
                      <th>
                        对局时间 <HelpTip id="played-at" />
                      </th>
                      <th>
                        主 <HelpTip id="home-away" />
                      </th>
                      <th>客</th>
                      <th>结果</th>
                      <th>比分</th>
                      <th>预计变化（链式）</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={r.key}>
                        <td className="rank-num">{idx + 1}</td>
                        <td>
                          <select
                            className="team-size-select"
                            value={r.teamSize}
                            title="本行每队人数（覆盖赛事默认）"
                            onChange={(e) => updateRow(r.key, { teamSize: Number(e.target.value) })}
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {formatLabel(n)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="datetime-local"
                            value={r.playedAt}
                            onChange={(e) => updateRow(r.key, { playedAt: e.target.value })}
                          />
                        </td>
                        <td>
                          <TeamSlots
                            size={r.teamSize}
                            value={r.homeIds}
                            exclude={r.awayIds.filter(Boolean)}
                            players={players}
                            onChange={(homeIds) => updateRow(r.key, { homeIds })}
                          />
                        </td>
                        <td>
                          <TeamSlots
                            size={r.teamSize}
                            value={r.awayIds}
                            exclude={r.homeIds.filter(Boolean)}
                            players={players}
                            onChange={(awayIds) => updateRow(r.key, { awayIds })}
                          />
                        </td>
                        <td>
                          <div className="result-btns">
                            <button
                              type="button"
                              className={`chip-btn${r.result === "A" ? " win" : ""}`}
                              onClick={() => updateRow(r.key, { result: "A" })}
                            >
                              主胜
                            </button>
                            {allowDraw && (
                              <button
                                type="button"
                                className={`chip-btn${r.result === "draw" ? " draw" : ""}`}
                                onClick={() => updateRow(r.key, { result: "draw" })}
                              >
                                平局
                              </button>
                            )}
                            <button
                              type="button"
                              className={`chip-btn${r.result === "B" ? " win" : ""}`}
                              onClick={() => updateRow(r.key, { result: "B" })}
                            >
                              客胜
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="score-mini">
                            <input
                              value={r.scoreHome}
                              onChange={(e) => updateRow(r.key, { scoreHome: e.target.value })}
                              placeholder="主"
                            />
                            <span>:</span>
                            <input
                              value={r.scoreAway}
                              onChange={(e) => updateRow(r.key, { scoreAway: e.target.value })}
                              placeholder="客"
                            />
                          </div>
                        </td>
                        <td className="preview-cell">
                          {r.preview ? (
                            <>
                              <div>
                                主队{" "}
                                <span className={r.preview.homeDelta >= 0 ? "delta-up" : "delta-down"}>
                                  {r.preview.homeDelta >= 0 ? "+" : ""}
                                  {r.preview.homeDelta.toFixed(1)}
                                </span>
                                <span className="subtle"> /人</span>
                              </div>
                              <div>
                                客队{" "}
                                <span className={r.preview.awayDelta >= 0 ? "delta-up" : "delta-down"}>
                                  {r.preview.awayDelta >= 0 ? "+" : ""}
                                  {r.preview.awayDelta.toFixed(1)}
                                </span>
                                <span className="subtle"> /人</span>
                              </div>
                              {r.teamSize > 1 && (
                                <details className="preview-members">
                                  <summary>每人</summary>
                                  {r.preview.home.map((m) => (
                                    <div key={m.id} className="subtle">
                                      主 {nameOf(m.id)} {m.before.toFixed(0)}
                                      {m.delta >= 0 ? "+" : ""}
                                      {m.delta.toFixed(1)}→{m.after.toFixed(0)}
                                    </div>
                                  ))}
                                  {r.preview.away.map((m) => (
                                    <div key={m.id} className="subtle">
                                      客 {nameOf(m.id)} {m.before.toFixed(0)}
                                      {m.delta >= 0 ? "+" : ""}
                                      {m.delta.toFixed(1)}→{m.after.toFixed(0)}
                                    </div>
                                  ))}
                                </details>
                              )}
                            </>
                          ) : (
                            <span className="subtle">—</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                          >
                            删
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="toolbar">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRows((rs) => [...rs, emptyRow(defaultTeamSize, rs.length * 10)])}
                >
                  添加一行
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRows(emptyRows(DEFAULT_ROWS, defaultTeamSize))}
                >
                  清空表格
                </button>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={saveDrafts}>
                  保存草稿
                </button>
                <HelpTip id="draft" />
                <button type="button" className="btn btn-primary" disabled={busy} onClick={publishAll}>
                  发布更新排名
                </button>
                <HelpTip id="publish" />
              </div>
              <p className="subtle">
                发布会按对局时间链式计分；失败则整批回滚。{" "}
                <a href="/help/guide#draft-publish">说明</a>
                {" · "}
                <a href="/help/guide#score">组队记分</a>
              </p>

              {!!drafts.length && (
                <div className="card-muted" style={{ marginTop: "1rem" }}>
                  <h2>待发布草稿（{drafts.length}）</h2>
                  <p className="subtle">发布时按对局时间从早到晚链式计分。</p>
                  {drafts.map((d) => {
                    const res =
                      d.match.winnerSide === "A"
                        ? "主胜"
                        : d.match.winnerSide === "B"
                          ? "客胜"
                          : "平局";
                    return (
                      <div key={d.match.id} className="history-item">
                        <div>
                          {new Date(d.match.playedAt).toLocaleString()} · 主{" "}
                          {namesJoin(d.participants, "A")} vs 客 {namesJoin(d.participants, "B")} ·{" "}
                          {res}
                        </div>
                        <button type="button" className="btn btn-ghost" onClick={() => deleteDraft(d.match.id)}>
                          删除
                        </button>
                      </div>
                    );
                  })}
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={publishDraftsOnly}>
                    仅发布以上草稿
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {tab === "rank" && (
        <section className="card">
          <h2>
            排名 <HelpTip id="ranking" />
          </h2>
          <p className="subtle" style={{ marginTop: 0 }}>
            只反映<strong>已发布</strong>的对局；草稿不影响这里。{" "}
            <a href="/help/guide#rank">说明</a>
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => refreshAll()}>
            刷新
          </button>
          {!players.length ? (
            <EmptyHelp href="/help/guide#add-players" linkLabel="先添加选手" title="暂无排名">
              添加选手并发布对局后，这里会按积分从高到低排列。
            </EmptyHelp>
          ) : !history.length && players.every((p) => p.gamesPlayed === 0) ? (
            <EmptyHelp href="/help/guide#draft-publish" linkLabel="如何发布更新排名" title="还没有已发布对局">
              选手已就位，但积分仍是起始分。在「记分」填好时间与结果后，点「发布更新排名」。
            </EmptyHelp>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>选手</th>
                  <th>
                    积分 <HelpTip id="rating" />
                  </th>
                  <th>胜-负</th>
                  <th>场次</th>
                </tr>
              </thead>
              <tbody>
                {sortedRank.map((p, i) => (
                  <tr key={p.id}>
                    <td className="rank-num">{i + 1}</td>
                    <td>
                      {p.name}
                      {p.teamName ? (
                        <span className="badge" style={{ marginLeft: 6 }}>
                          {p.teamName}
                        </span>
                      ) : null}{" "}
                      {p.provisional && (
                        <>
                          <span className="badge" title="新手保护期内，积分变动可能较大">
                            新面孔
                          </span>
                          <HelpTip id="provisional-games" />
                        </>
                      )}
                    </td>
                    <td>{Number(p.rating).toFixed(0)}</td>
                    <td>
                      {p.wins}-{p.losses}
                    </td>
                    <td>{p.gamesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "pair" && (
        <section className="card">
          <h2>辅助配对</h2>
          <p className="muted">
            生成主客对阵并填入记分表；请再按实际时间调整并选结果。{" "}
            <a href="/help/guide#pair">说明</a>
          </p>
          {players.length < 2 ? (
            <EmptyHelp href="/help/guide#add-players" linkLabel="先添加选手" title="还不能配对">
              至少需要两名选手才能生成对阵。
            </EmptyHelp>
          ) : (
            <>
              <label className="field-label">
                <span className="field-label-text">配对赛制</span>
              </label>
              <select
                value={pairTeamSize}
                onChange={(e) => setPairTeamSize(Number(e.target.value))}
                style={{ maxWidth: "12rem" }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {formatLabel(n)}（需 ≥{n * 2} 人）
                  </option>
                ))}
              </select>
              <div className="toolbar" style={{ marginTop: "0.75rem" }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={runPairing}>
                  生成对阵并填入记分表
                </button>
              </div>
              {pairText && (
                <pre className="card-muted" style={{ whiteSpace: "pre-wrap", marginTop: "0.75rem" }}>
                  {pairText}
                </pre>
              )}
            </>
          )}
        </section>
      )}

      {tab === "history" && (
        <section className="card">
          <h2>
            已发布 · 按时间 <HelpTip id="void" />
          </h2>
          <p className="subtle" style={{ marginTop: 0 }}>
            录错已发布对局可撤销并重算。草稿请在记分页删除。{" "}
            <a href="/help/guide#void">录错了怎么办</a>
          </p>
          {history.map((h) => {
            const res =
              h.match.winnerSide === "A" ? "主胜" : h.match.winnerSide === "B" ? "客胜" : "平局";
            const nHome = h.participants.filter((p) => p.side === "A").length;
            return (
              <div key={h.match.id} className="history-item">
                <div>
                  <div>
                    {new Date(h.match.playedAt).toLocaleString()} · {formatLabel(nHome || 1)} · 主{" "}
                    {namesJoin(h.participants, "A")} vs 客 {namesJoin(h.participants, "B")} · {res}
                  </div>
                  <div className="subtle">序号 {h.match.sequenceNo}</div>
                </div>
                <button type="button" className="btn btn-danger" onClick={() => voidMatch(h.match.id)}>
                  撤销
                </button>
              </div>
            );
          })}
          {!history.length && (
            <EmptyHelp href="/help/guide#draft-publish" linkLabel="如何发布对局" title="暂无已发布对局">
              发布成功后会出现在这里，并按对局时间排列。
            </EmptyHelp>
          )}
        </section>
      )}
    </div>
  );
}
