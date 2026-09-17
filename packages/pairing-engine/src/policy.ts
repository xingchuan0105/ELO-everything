import type { PairingPolicy, PairingPresetId } from "./types.js";

export const FAIR_POLICY: PairingPolicy = {
  w_balance: 1.0,
  w_rating_gap: 0.8,
  w_team_spread: 0.4,
  w_rematch: 0.7,
  w_farm: 0.9,
  w_stomp: 1.0,
  w_partner_repeat: 0.3,
  temperature: 0.15,
  max_imbalance: 0.35,
  max_team_rating_gap: 800,
  max_cross_player_gap: 400,
  rematch_window_matches: 3,
  farm_window_days: 14,
  farm_max_meetings: 3,
  farm_winrate_threshold: 0.75,
  provisional_isolation: true,
  candidate_samples: 200,
  max_pool_size: 32,
  top_k_proposals: 5,
};

export const PAIRING_PRESETS: Record<PairingPresetId, PairingPolicy> = {
  fair: { ...FAIR_POLICY },
  strict_anti_farm: {
    ...FAIR_POLICY,
    w_farm: 1.4,
    w_rematch: 1.2,
    farm_max_meetings: 2,
    temperature: 0.08,
    rematch_window_matches: 5,
  },
  party_fun: {
    ...FAIR_POLICY,
    temperature: 0.6,
    max_imbalance: 0.45,
    w_stomp: 0.5,
    w_balance: 0.6,
  },
  swiss_like: {
    ...FAIR_POLICY,
    w_rematch: 1.5,
    rematch_window_matches: 8,
    w_balance: 1.1,
  },
};

/** Default product preset (KD31). */
export const DEFAULT_PAIRING_PRESET: PairingPresetId = "fair";
