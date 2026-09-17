export type PairingRuleType =
  | "must_team"
  | "cannot_team"
  | "cannot_oppose"
  | "must_oppose"
  | "prefer_team"
  | "prefer_oppose"
  | "locked_side";

export interface PairingRule {
  id: string;
  ruleType: PairingRuleType;
  hardness: "hard" | "soft";
  accountIds: string[];
  weight?: number;
  /** for locked_side: 'A' | 'B' */
  lockedSide?: "A" | "B";
}

export interface PairingPolicy {
  w_balance: number;
  w_rating_gap: number;
  w_team_spread: number;
  w_rematch: number;
  w_farm: number;
  w_stomp: number;
  w_partner_repeat: number;
  temperature: number;
  max_imbalance: number;
  max_team_rating_gap: number;
  max_cross_player_gap: number | null;
  rematch_window_matches: number;
  farm_window_days: number;
  farm_max_meetings: number;
  farm_winrate_threshold: number;
  provisional_isolation: boolean;
  candidate_samples: number;
  max_pool_size: number;
  top_k_proposals: number;
}

export type PairingPresetId = "fair" | "strict_anti_farm" | "party_fun" | "swiss_like";

export interface PoolPlayer {
  accountId: string;
  rating: number;
  gamesPlayed: number;
  isProvisional: boolean;
}

export interface RecentMatch {
  sideA: string[];
  sideB: string[];
  playedAt: string;
}

export interface H2HStat {
  meetings: number;
  winsA: number;
  winsB: number;
  lastPlayedAt: string;
}

export interface PairingHistory {
  recentMatches: RecentMatch[];
  /** unordered pair key "id1|id2" with id1 < id2 for 1v1-style; for teams also used for cross pairs */
  h2h: Record<string, H2HStat>;
  partnerCounts: Record<string, number>;
}

export interface PairingSolveInput {
  format: "1v1" | "2v2" | "nvn";
  teamSize: number;
  pool: PoolPlayer[];
  rules: PairingRule[];
  policy: PairingPolicy;
  history: PairingHistory;
  seed: number;
  matchesToEmit: number;
  scale: number;
}

export type RiskTag =
  | "balanced"
  | "stomp"
  | "rematch"
  | "farm"
  | "stack"
  | "provisional_mix";

export interface MatchDraft {
  sideA: string[];
  sideB: string[];
  expectedScoreA: number;
  costBreakdown: Record<string, number>;
  riskTags: RiskTag[];
  cost: number;
}

export interface PairingProposal {
  seed: number;
  totalCost: number;
  matches: MatchDraft[];
  sitOut: string[];
  explanations: string[];
}

export interface PairingSolveResult {
  proposals: PairingProposal[];
  diagnostics: {
    candidatesEvaluated: number;
    hardFiltered: number;
    wallMs: number;
  };
}

export interface PairingConflict {
  ruleIds: string[];
  reason: string;
}

export class PairingError extends Error {
  constructor(
    message: string,
    readonly code: "PAIRING_INFEASIBLE" | "PAIRING_NO_FEASIBLE_MATCH" | "PAIRING_POOL_TOO_LARGE" | "PAIRING_INVALID",
    readonly conflicts?: PairingConflict[],
  ) {
    super(message);
    this.name = "PairingError";
  }
}
