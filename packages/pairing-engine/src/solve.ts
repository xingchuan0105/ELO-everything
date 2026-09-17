import { expectedScore } from "@elo/rating-engine";
import { pickWeightedIndex, mulberry32, shuffleInPlace } from "./rng.js";
import {
  buildMustTeamGroups,
  pairKey,
  sidesViolateHardRules,
  validateHardRules,
} from "./rules.js";
import type {
  MatchDraft,
  PairingHistory,
  PairingPolicy,
  PairingProposal,
  PairingRule,
  PairingSolveInput,
  PairingSolveResult,
  PoolPlayer,
  RiskTag,
} from "./types.js";
// PairingRule used by randomPartition
import { PairingError } from "./types.js";

function playerMap(pool: PoolPlayer[]): Map<string, PoolPlayer> {
  return new Map(pool.map((p) => [p.accountId, p]));
}

function teamAvg(ids: string[], pm: Map<string, PoolPlayer>): number {
  return ids.reduce((s, id) => s + pm.get(id)!.rating, 0) / ids.length;
}

function teamSpread(ids: string[], pm: Map<string, PoolPlayer>): number {
  const rs = ids.map((id) => pm.get(id)!.rating);
  return Math.max(...rs) - Math.min(...rs);
}

function oppositionKey(sideA: string[], sideB: string[]): string {
  const a = [...sideA].sort().join(",");
  const b = [...sideB].sort().join(",");
  return a < b ? `${a}||${b}` : `${b}||${a}`;
}

function rematchScore(
  sideA: string[],
  sideB: string[],
  history: PairingHistory,
  window: number,
): number {
  const recent = history.recentMatches.slice(0, window);
  const key = oppositionKey(sideA, sideB);
  let hits = 0;
  for (const m of recent) {
    if (oppositionKey(m.sideA, m.sideB) === key) hits += 1;
  }
  return hits; // 0+ 
}

function farmScore(
  sideA: string[],
  sideB: string[],
  history: PairingHistory,
  policy: PairingPolicy,
): { soft: number; hardReject: boolean } {
  const now = Date.now();
  const windowMs = policy.farm_window_days * 86400000;
  let soft = 0;
  let hardReject = false;

  for (const a of sideA) {
    for (const b of sideB) {
      const key = pairKey(a, b);
      const h = history.h2h[key];
      if (!h) continue;
      const age = now - Date.parse(h.lastPlayedAt);
      if (age > windowMs) continue;
      if (h.meetings > policy.farm_max_meetings) {
        const wrA = h.meetings ? h.winsA / h.meetings : 0.5;
        const wrB = h.meetings ? h.winsB / h.meetings : 0.5;
        const tilted = wrA >= policy.farm_winrate_threshold || wrB >= policy.farm_winrate_threshold;
        if (tilted) hardReject = true;
        soft += h.meetings / policy.farm_max_meetings;
      } else if (h.meetings >= 2) {
        soft += 0.3 * (h.meetings / policy.farm_max_meetings);
      }
    }
  }
  return { soft, hardReject };
}

function partnerRepeat(side: string[], history: PairingHistory): number {
  let s = 0;
  for (let i = 0; i < side.length; i++) {
    for (let j = i + 1; j < side.length; j++) {
      s += history.partnerCounts[pairKey(side[i]!, side[j]!)] ?? 0;
    }
  }
  return s;
}

function softRulePenalty(sideA: string[], sideB: string[], rules: PairingRule[]): number {
  let p = 0;
  const setA = new Set(sideA);
  const setB = new Set(sideB);
  for (const r of rules) {
    if (r.hardness !== "soft" || r.accountIds.length < 2) continue;
    const w = r.weight ?? 1;
    const [a, b] = r.accountIds;
    if (r.ruleType === "prefer_team") {
      const same =
        (setA.has(a!) && setA.has(b!)) || (setB.has(a!) && setB.has(b!));
      if (!same) p += w;
    }
    if (r.ruleType === "prefer_oppose") {
      const opp =
        (setA.has(a!) && setB.has(b!)) || (setA.has(b!) && setB.has(a!));
      if (!opp) p += w;
    }
  }
  return p;
}

function evaluateMatch(
  sideA: string[],
  sideB: string[],
  input: PairingSolveInput,
  pm: Map<string, PoolPlayer>,
): MatchDraft | null {
  const { policy, rules, history, scale } = input;
  if (sidesViolateHardRules(sideA, sideB, rules)) return null;

  const ra = teamAvg(sideA, pm);
  const rb = teamAvg(sideB, pm);
  const eA = expectedScore(ra, rb, scale);
  const balance = 2 * Math.abs(eA - 0.5);
  if (balance / 2 > policy.max_imbalance) return null;
  if (Math.abs(ra - rb) > policy.max_team_rating_gap) return null;

  if (policy.max_cross_player_gap != null) {
    for (const a of sideA) {
      for (const b of sideB) {
        if (Math.abs(pm.get(a)!.rating - pm.get(b)!.rating) > policy.max_cross_player_gap) {
          return null;
        }
      }
    }
  }

  const rematch = rematchScore(sideA, sideB, history, policy.rematch_window_matches);
  if (rematch > 0 && rematch >= 1) {
    // hard: exact rematch in window (any hit of identical opposition)
    // treat first hit as hard filter when window > 0
    return null;
  }

  const farm = farmScore(sideA, sideB, history, policy);
  if (farm.hardReject) return null;

  if (policy.provisional_isolation) {
    const provA = sideA.filter((id) => pm.get(id)!.isProvisional).length;
    const provB = sideB.filter((id) => pm.get(id)!.isProvisional).length;
    const estA = sideA.length - provA;
    const estB = sideB.length - provB;
    // avoid all-provisional vs all-established when both sides non-empty mix extremes
    if ((provA === sideA.length && estB === sideB.length) || (provB === sideB.length && estA === sideA.length)) {
      // soft reject via high cost later — still allow but tag
    }
  }

  const spread =
    (teamSpread(sideA, pm) + teamSpread(sideB, pm)) / 2 / scale;
  const ratingGap = Math.abs(ra - rb) / scale;
  const stomp =
    balance > 0.5 || ratingGap > 1
      ? Math.max(balance, ratingGap)
      : 0;
  const partner =
    (partnerRepeat(sideA, history) + partnerRepeat(sideB, history)) / 10;
  const softRules = softRulePenalty(sideA, sideB, rules);

  const costBreakdown: Record<string, number> = {
    balance: policy.w_balance * balance,
    rating_gap: policy.w_rating_gap * ratingGap,
    team_spread: policy.w_team_spread * spread,
    stomp: policy.w_stomp * stomp,
    rematch: policy.w_rematch * rematch,
    farm: policy.w_farm * farm.soft,
    partner_repeat: policy.w_partner_repeat * partner,
    soft_rules: softRules,
  };
  const cost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);

  const riskTags: RiskTag[] = [];
  if (balance < 0.15) riskTags.push("balanced");
  if (stomp > 0.4) riskTags.push("stomp");
  if (farm.soft > 0.5) riskTags.push("farm");
  if (spread > 0.5) riskTags.push("stack");
  const anyProv = [...sideA, ...sideB].some((id) => pm.get(id)!.isProvisional);
  const anyEst = [...sideA, ...sideB].some((id) => !pm.get(id)!.isProvisional);
  if (anyProv && anyEst) riskTags.push("provisional_mix");

  return {
    sideA: [...sideA],
    sideB: [...sideB],
    expectedScoreA: eA,
    costBreakdown,
    riskTags,
    cost,
  };
}

function randomPartition(
  ids: string[],
  n: number,
  rand: () => number,
  rules: PairingRule[],
): { sideA: string[]; sideB: string[] } | null {
  if (ids.length < 2 * n) return null;
  const available = new Set(ids);
  const sideA: string[] = [];
  const sideB: string[] = [];

  // Place hard must_team groups first (if fully present in remaining ids)
  const groups = buildMustTeamGroups(rules.filter((r) => r.hardness === "hard"));
  const placed = new Set<string>();
  for (const [, members] of groups) {
    const present = members.filter((id) => available.has(id));
    if (present.length === 0) continue;
    if (present.length !== members.length) continue; // incomplete group this round
    if (present.length > n) return null;
    // assign to side with room
    const target = sideA.length + present.length <= n ? sideA : sideB.length + present.length <= n ? sideB : null;
    if (!target) continue;
    for (const id of present) {
      target.push(id);
      available.delete(id);
      placed.add(id);
    }
  }

  const rest = [...available];
  shuffleInPlace(rest, rand);
  for (const id of rest) {
    if (sideA.length < n) sideA.push(id);
    else if (sideB.length < n) sideB.push(id);
  }
  if (sideA.length !== n || sideB.length !== n) return null;
  return { sideA, sideB };
}

function sampleRound(
  input: PairingSolveInput,
  rand: () => number,
  pm: Map<string, PoolPlayer>,
): { matches: MatchDraft[]; sitOut: string[]; cost: number } | null {
  const n = input.teamSize;
  let remaining = input.pool.map((p) => p.accountId);
  const matches: MatchDraft[] = [];
  let totalCost = 0;
  const emit = Math.min(input.matchesToEmit, Math.floor(remaining.length / (2 * n)));

  for (let m = 0; m < emit; m++) {
    let best: MatchDraft | null = null;
    // local sample among remaining
    for (let s = 0; s < Math.max(20, Math.floor(input.policy.candidate_samples / Math.max(1, emit))); s++) {
      const part = randomPartition(remaining, n, rand, input.rules);
      if (!part) break;
      const draft = evaluateMatch(part.sideA, part.sideB, input, pm);
      if (!draft) continue;
      if (!best || draft.cost < best.cost) best = draft;
      // temperature accept worse occasionally while searching
      else if (rand() < Math.exp(-(draft.cost - best.cost) / Math.max(0.01, input.policy.temperature))) {
        best = draft;
      }
    }
    if (!best) return null;
    matches.push(best);
    totalCost += best.cost;
    const used = new Set([...best.sideA, ...best.sideB]);
    remaining = remaining.filter((id) => !used.has(id));
  }

  return { matches, sitOut: remaining, cost: totalCost };
}

function explain(proposal: PairingProposal): string[] {
  const lines: string[] = [];
  for (const m of proposal.matches) {
    lines.push(
      `期望胜率 E_A≈${m.expectedScoreA.toFixed(2)}（越接近 0.5 越均衡）`,
    );
    if (m.riskTags.includes("balanced")) lines.push("对阵实力接近");
    if (m.riskTags.includes("stomp")) lines.push("存在实力差距风险（炸鱼倾向）");
    if (m.riskTags.includes("farm")) lines.push("历史交手偏多，关注刷分风险");
  }
  if (proposal.sitOut.length) {
    lines.push(`本轮轮空：${proposal.sitOut.length} 人`);
  }
  return lines;
}

export function solveCSP(input: PairingSolveInput): PairingSolveResult {
  const t0 = Date.now();
  const { policy, pool } = input;

  if (pool.length > policy.max_pool_size) {
    throw new PairingError(
      `pool size ${pool.length} exceeds max_pool_size ${policy.max_pool_size}`,
      "PAIRING_POOL_TOO_LARGE",
    );
  }
  if (pool.length < 2 * input.teamSize) {
    throw new PairingError("pool too small for one match", "PAIRING_INVALID");
  }
  if (input.teamSize < 1 || input.teamSize > 8) {
    throw new PairingError("teamSize must be 1..8", "PAIRING_INVALID");
  }

  const poolIds = new Set(pool.map((p) => p.accountId));
  validateHardRules(input.rules, poolIds, input.teamSize);

  const pm = playerMap(pool);
  const rand = mulberry32(input.seed >>> 0);

  const candidates: PairingProposal[] = [];
  let evaluated = 0;
  let hardFiltered = 0;

  for (let i = 0; i < policy.candidate_samples; i++) {
    evaluated++;
    const round = sampleRound(input, rand, pm);
    if (!round) {
      hardFiltered++;
      continue;
    }
    const proposal: PairingProposal = {
      seed: input.seed,
      totalCost: round.cost,
      matches: round.matches,
      sitOut: round.sitOut,
      explanations: [],
    };
    proposal.explanations = explain(proposal);
    candidates.push(proposal);
  }

  if (candidates.length === 0) {
    throw new PairingError(
      "No feasible pairing under hard filters; relax policy or rules",
      "PAIRING_NO_FEASIBLE_MATCH",
    );
  }

  // temperature sample top diversity: sort by cost, take unique-ish, weighted pick top_k
  candidates.sort((a, b) => a.totalCost - b.totalCost);
  const T = Math.max(0.01, policy.temperature);
  const weights = candidates.map((c) => Math.exp(-c.totalCost / T));
  const picked: PairingProposal[] = [];
  const used = new Set<number>();

  while (picked.length < Math.min(policy.top_k_proposals, candidates.length)) {
    const idxs = candidates.map((_, i) => i).filter((i) => !used.has(i));
    const w = idxs.map((i) => weights[i]!);
    const local = pickWeightedIndex(w, rand);
    const idx = idxs[local]!;
    used.add(idx);
    picked.push(candidates[idx]!);
  }

  // re-rank by cost for presentation
  picked.sort((a, b) => a.totalCost - b.totalCost);

  return {
    proposals: picked,
    diagnostics: {
      candidatesEvaluated: evaluated,
      hardFiltered,
      wallMs: Date.now() - t0,
    },
  };
}
