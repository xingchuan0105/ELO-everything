import { createHash } from "node:crypto";
import type { RatingComputationResult, RatingConfig, PlayerRatingState } from "./types.js";
import { toFixed4String } from "./quantize.js";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      out[k] = sortKeys(obj[k]);
    }
    return out;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

export function sha256Hex(utf8: string): string {
  return createHash("sha256").update(utf8, "utf8").digest("hex");
}

export function buildComputationHash(args: {
  matchId: string;
  ladderId: string;
  format: string;
  winnerSide: string;
  config: RatingConfig;
  preStates: Map<string, PlayerRatingState>;
  result: Omit<RatingComputationResult, "computationHash">;
}): string {
  const participants = [...args.preStates.values()]
    .map((p) => ({
      accountId: p.accountId,
      side: args.result.deltas.find((d) => d.accountId === p.accountId)?.side,
      ratingBefore: toFixed4String(p.rating),
      gamesPlayed: p.gamesPlayed,
    }))
    .sort((a, b) => a.accountId.localeCompare(b.accountId));

  const deltas = [...args.result.deltas]
    .sort((a, b) => a.accountId.localeCompare(b.accountId))
    .map((d) => ({
      accountId: d.accountId,
      side: d.side,
      ratingBefore: toFixed4String(d.ratingBefore),
      ratingAfter: toFixed4String(d.ratingAfter),
      delta: toFixed4String(d.delta),
      kEffective: toFixed4String(d.kEffective),
      expectedScore: d.expectedScore,
      actualScore: d.actualScore,
    }));

  const payload = {
    engine_version: args.result.engine_version,
    matchId: args.matchId,
    ladderId: args.ladderId,
    format: args.format,
    winnerSide: args.winnerSide,
    config: args.config,
    participants,
    result: {
      teamRatingA: toFixed4String(args.result.teamRatingA),
      teamRatingB: toFixed4String(args.result.teamRatingB),
      expectedA: args.result.expectedA,
      movMultiplier: args.result.movMultiplier,
      zeroSum: args.result.zeroSum,
      deltas,
    },
  };

  return sha256Hex(stableStringify(payload));
}
