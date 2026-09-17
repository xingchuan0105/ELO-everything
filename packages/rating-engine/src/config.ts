import type {
  ConfigValidationIssue,
  ConfigValidationResult,
  RatingConfig,
  TierBand,
} from "./types.js";

export const DEFAULT_CONFIG: RatingConfig = {
  engine: "elo",
  scale: 400,
  start_rating: 1500,
  k_factor: 32,
  k_provisional: 40,
  provisional_games: 20,
  rating_floor: null,
  rating_ceiling: null,
  allow_draw: true,
  zero_sum_mode: "strict",
  asymmetric_k_policy: "min",
  team_k_aggregation: "avg_member_k",
  margin_of_victory: {
    enabled: false,
    alpha: 0.5,
    beta: 0.1,
    m_min: 1.0,
    m_max: 1.5,
  },
};

export type ConfigPresetId =
  | "chess_like"
  | "stable"
  | "volatile_party"
  | "foosball_2v2";

export const CONFIG_PRESETS: Record<ConfigPresetId, RatingConfig> = {
  chess_like: { ...DEFAULT_CONFIG },
  stable: {
    ...DEFAULT_CONFIG,
    k_factor: 16,
    k_provisional: 32,
  },
  volatile_party: {
    ...DEFAULT_CONFIG,
    k_factor: 40,
    k_provisional: 50,
    provisional_games: 15,
  },
  foosball_2v2: {
    ...DEFAULT_CONFIG,
    allow_draw: false,
  },
};

export function effectiveK(cfg: RatingConfig, gamesPlayed: number): number {
  return gamesPlayed < cfg.provisional_games ? cfg.k_provisional : cfg.k_factor;
}

export function validateRatingConfig(
  config: RatingConfig,
  tierBands: TierBand[] = [],
): ConfigValidationResult {
  const errors: ConfigValidationIssue[] = [];
  const warnings: ConfigValidationIssue[] = [];

  const err = (code: string, message: string, field?: string) =>
    errors.push({ code, severity: "error", message, field });
  const warn = (code: string, message: string, field?: string) =>
    warnings.push({ code, severity: "warn", message, field });

  if (config.engine !== "elo") {
    err("ENGINE", "engine must be 'elo'", "engine");
  }
  if (config.scale < 100 || config.scale > 1000) {
    err("SCALE", "scale must be in [100, 1000]", "scale");
  }
  if (config.start_rating < 0 || config.start_rating > 5000) {
    err("START", "start_rating must be in [0, 5000]", "start_rating");
  }
  if (config.k_factor < 1 || config.k_factor > 64) {
    err("K", "k_factor must be in [1, 64]", "k_factor");
  }
  if (config.k_provisional < 1 || config.k_provisional > 128) {
    err("K_PROV", "k_provisional must be in [1, 128]", "k_provisional");
  }
  if (config.k_provisional < config.k_factor) {
    err("K_PROV_GE", "k_provisional must be >= k_factor", "k_provisional");
  }
  if (config.provisional_games < 0 || config.provisional_games > 100) {
    err("PROV_GAMES", "provisional_games must be in [0, 100]", "provisional_games");
  }
  if (config.rating_floor != null) {
    if (config.rating_floor < 0 || config.rating_floor > config.start_rating) {
      err("FLOOR", "rating_floor must be in [0, start_rating]", "rating_floor");
    }
  }
  if (config.rating_ceiling != null) {
    if (config.rating_ceiling < config.start_rating) {
      err("CEILING", "rating_ceiling must be >= start_rating", "rating_ceiling");
    }
  }
  const mov = config.margin_of_victory;
  if (mov.m_min < 1.0 || mov.m_max > 2.0 || mov.m_max < mov.m_min) {
    err("MOV", "margin_of_victory bounds invalid (1 <= m_min <= m_max <= 2)", "margin_of_victory");
  }

  if (tierBands.length > 0) {
    const sorted = [...tierBands].sort((a, b) => a.sort_order - b.sort_order);
    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i]!;
      if (b.max_rating != null && b.max_rating <= b.min_rating) {
        err("TIER_RANGE", `tier ${b.name}: max must be > min`, "tier_bands");
      }
      if (i > 0) {
        const prev = sorted[i - 1]!;
        if (b.min_rating < (prev.max_rating ?? Infinity)) {
          // allow contiguous: prev.max === b.min is ok if half-open semantics
          if (prev.max_rating != null && b.min_rating < prev.max_rating) {
            err("TIER_OVERLAP", `tier ${b.name} overlaps previous`, "tier_bands");
          }
        }
      }
    }
    const inBand = sorted.some(
      (b) =>
        config.start_rating >= b.min_rating &&
        (b.max_rating == null || config.start_rating < b.max_rating),
    );
    if (!inBand) {
      err("START_TIER", "start_rating must fall within a tier band when tiers exist", "start_rating");
    }
    for (const b of sorted) {
      if (b.max_rating != null && b.max_rating - b.min_rating < 50) {
        warn("TIER_NARROW", `tier ${b.name} width < 50`, "tier_bands");
      }
    }
  }

  if (config.k_factor > 40) warn("K_HIGH", "k_factor > 40 is volatile for established players", "k_factor");
  if (config.k_factor < 8) warn("K_LOW", "k_factor < 8 converges slowly", "k_factor");
  if (config.k_provisional > 64) warn("K_PROV_HIGH", "k_provisional > 64 is aggressive", "k_provisional");
  if (config.start_rating < 1000 || config.start_rating > 2000) {
    warn("START_RANGE", "start_rating outside [1000, 2000] may hurt readability", "start_rating");
  }
  if (config.provisional_games < 5 && config.k_provisional >= 40) {
    warn("PROV_UNSTABLE", "short provisional with high K is unstable", "provisional_games");
  }

  return { ok: errors.length === 0, errors, warnings };
}
