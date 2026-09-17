export const ENGINE_VERSION = "elo-team-avg-1" as const;

export interface RatingConfig {
  engine: "elo";
  scale: number;
  start_rating: number;
  k_factor: number;
  k_provisional: number;
  provisional_games: number;
  rating_floor: number | null;
  rating_ceiling: number | null;
  allow_draw: boolean;
  zero_sum_mode: "strict" | "soft";
  asymmetric_k_policy: "min" | "avg" | "max";
  team_k_aggregation: "avg_member_k" | "min_member_k" | "fixed";
  margin_of_victory: {
    enabled: boolean;
    alpha: number;
    beta: number;
    m_min: number;
    m_max: number;
  };
}

export interface TierBand {
  id: string;
  name: string;
  min_rating: number;
  max_rating: number | null;
  color?: string;
  sort_order: number;
}

export interface PlayerRatingState {
  accountId: string;
  rating: number;
  gamesPlayed: number;
  provisional: boolean;
}

export interface MatchSideInput {
  side: "A" | "B";
  participantAccountIds: string[];
  score?: number | null;
}

export interface MatchResultInput {
  matchId: string;
  ladderId: string;
  format: "1v1" | "2v2" | "nvn";
  sides: [MatchSideInput, MatchSideInput];
  winnerSide: "A" | "B" | "draw";
  playedAt: string;
  config: RatingConfig;
  preStates: Map<string, PlayerRatingState>;
}

export interface PlayerRatingDelta {
  accountId: string;
  side: "A" | "B";
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  kEffective: number;
  expectedScore: number;
  actualScore: number;
}

export interface RatingComputationResult {
  matchId: string;
  engine: "elo";
  engine_version: typeof ENGINE_VERSION;
  zeroSum: boolean;
  teamRatingA: number;
  teamRatingB: number;
  expectedA: number;
  movMultiplier: number;
  deltas: PlayerRatingDelta[];
  computationHash: string;
}

export interface ConfigValidationIssue {
  code: string;
  severity: "error" | "warn";
  message: string;
  field?: string;
}

export interface ConfigValidationResult {
  ok: boolean;
  errors: ConfigValidationIssue[];
  warnings: ConfigValidationIssue[];
}
