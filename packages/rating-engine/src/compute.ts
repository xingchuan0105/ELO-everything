import { effectiveK } from "./config.js";
import { expectedScore, mean } from "./expected.js";
import { buildComputationHash } from "./hash.js";
import { quantize4 } from "./quantize.js";
import {
  ENGINE_VERSION,
  type MatchResultInput,
  type PlayerRatingDelta,
  type RatingComputationResult,
  type RatingConfig,
} from "./types.js";

function aggregateTeamK(
  mode: RatingConfig["team_k_aggregation"],
  memberKs: number[],
  fixedK: number,
): number {
  if (mode === "fixed") return fixedK;
  if (mode === "min_member_k") return Math.min(...memberKs);
  return mean(memberKs);
}

function asymmetricPolicy(
  policy: RatingConfig["asymmetric_k_policy"],
  kA: number,
  kB: number,
): number {
  if (policy === "max") return Math.max(kA, kB);
  if (policy === "avg") return (kA + kB) / 2;
  return Math.min(kA, kB);
}

function marginMultiplier(
  config: RatingConfig,
  scoreA: number | null | undefined,
  scoreB: number | null | undefined,
  winnerSide: "A" | "B" | "draw",
): number {
  const mov = config.margin_of_victory;
  if (!mov.enabled) return 1;
  if (scoreA == null || scoreB == null) return 1;
  if (winnerSide === "draw") return 1;
  const raw = 1 + mov.alpha * Math.tanh(mov.beta * Math.abs(scoreA - scoreB));
  return Math.min(mov.m_max, Math.max(mov.m_min, raw));
}

function applyFloorCeiling(rating: number, config: RatingConfig): number {
  let r = rating;
  if (config.rating_floor != null && r < config.rating_floor) r = config.rating_floor;
  if (config.rating_ceiling != null && r > config.rating_ceiling) r = config.rating_ceiling;
  return r;
}

export class EloEngineError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "EloEngineError";
  }
}

export function computeEloUpdate(input: MatchResultInput): RatingComputationResult {
  const { config, sides, winnerSide, preStates, format } = input;

  if (config.engine !== "elo") {
    throw new EloEngineError("only engine=elo is supported", "ENGINE");
  }
  if (!["1v1", "2v2", "nvn"].includes(format)) {
    throw new EloEngineError(`unsupported format: ${format}`, "FORMAT");
  }
  if (winnerSide === "draw" && !config.allow_draw) {
    throw new EloEngineError("draws not allowed for this ladder", "DRAW");
  }

  const sideA = sides.find((s) => s.side === "A");
  const sideB = sides.find((s) => s.side === "B");
  if (!sideA || !sideB) {
    throw new EloEngineError("both sides A and B required", "SIDES");
  }

  const idsA = sideA.participantAccountIds;
  const idsB = sideB.participantAccountIds;
  const n = idsA.length;
  if (n < 1 || n !== idsB.length) {
    throw new EloEngineError("equal team sizes required, n>=1", "TEAM_SIZE");
  }
  if (n > 8) {
    throw new EloEngineError("max team size is 8", "TEAM_SIZE");
  }
  if (format === "1v1" && n !== 1) {
    throw new EloEngineError("1v1 requires n=1", "FORMAT");
  }
  if (format === "2v2" && n !== 2) {
    throw new EloEngineError("2v2 requires n=2", "FORMAT");
  }

  const allIds = [...idsA, ...idsB];
  if (new Set(allIds).size !== allIds.length) {
    throw new EloEngineError("duplicate participants", "DUP");
  }
  for (const id of allIds) {
    if (!preStates.has(id)) {
      throw new EloEngineError(`missing preState for ${id}`, "PRESTATE");
    }
  }

  const ratingsA = idsA.map((id) => preStates.get(id)!.rating);
  const ratingsB = idsB.map((id) => preStates.get(id)!.rating);
  const teamA = mean(ratingsA);
  const teamB = mean(ratingsB);
  const expectedA = expectedScore(teamA, teamB, config.scale);
  const actualA = winnerSide === "draw" ? 0.5 : winnerSide === "A" ? 1 : 0;
  const actualB = 1 - actualA;

  const kMembersA = idsA.map((id) => effectiveK(config, preStates.get(id)!.gamesPlayed));
  const kMembersB = idsB.map((id) => effectiveK(config, preStates.get(id)!.gamesPlayed));
  const kTeamA = aggregateTeamK(config.team_k_aggregation, kMembersA, config.k_factor);
  const kTeamB = aggregateTeamK(config.team_k_aggregation, kMembersB, config.k_factor);

  const movM = marginMultiplier(config, sideA.score, sideB.score, winnerSide);

  let deltaA: number;
  let deltaB: number;
  let kEffA: number;
  let kEffB: number;

  if (config.zero_sum_mode === "strict") {
    const kEff = asymmetricPolicy(config.asymmetric_k_policy, kTeamA, kTeamB);
    kEffA = kEff;
    kEffB = kEff;
    const rawA = kEff * (actualA - expectedA) * movM;
    deltaA = quantize4(rawA);
    deltaB = quantize4(-deltaA);
  } else {
    kEffA = kTeamA;
    kEffB = kTeamB;
    deltaA = quantize4(kTeamA * (actualA - expectedA) * movM);
    deltaB = quantize4(kTeamB * (actualB - (1 - expectedA)) * movM);
  }

  const deltas: PlayerRatingDelta[] = [];
  let anyClamp = false;

  for (const id of idsA) {
    const pre = preStates.get(id)!;
    let after = pre.rating + deltaA;
    let d = deltaA;
    const clamped = applyFloorCeiling(after, config);
    if (clamped !== after) {
      anyClamp = true;
      d = quantize4(clamped - pre.rating);
      after = clamped;
    }
    deltas.push({
      accountId: id,
      side: "A",
      ratingBefore: pre.rating,
      ratingAfter: quantize4(after),
      delta: d,
      kEffective: kEffA,
      expectedScore: expectedA,
      actualScore: actualA,
    });
  }

  for (const id of idsB) {
    const pre = preStates.get(id)!;
    let after = pre.rating + deltaB;
    let d = deltaB;
    const clamped = applyFloorCeiling(after, config);
    if (clamped !== after) {
      anyClamp = true;
      d = quantize4(clamped - pre.rating);
      after = clamped;
    }
    deltas.push({
      accountId: id,
      side: "B",
      ratingBefore: pre.rating,
      ratingAfter: quantize4(after),
      delta: d,
      kEffective: kEffB,
      expectedScore: 1 - expectedA,
      actualScore: actualB,
    });
  }

  const sumDelta = deltas.reduce((s, x) => s + x.delta, 0);
  const zeroSum =
    config.zero_sum_mode === "strict" && !anyClamp && quantize4(sumDelta) === 0;

  const partial: Omit<RatingComputationResult, "computationHash"> = {
    matchId: input.matchId,
    engine: "elo",
    engine_version: ENGINE_VERSION,
    zeroSum,
    teamRatingA: teamA,
    teamRatingB: teamB,
    expectedA,
    movMultiplier: movM,
    deltas,
  };

  const computationHash = buildComputationHash({
    matchId: input.matchId,
    ladderId: input.ladderId,
    format: input.format,
    winnerSide: input.winnerSide,
    config: input.config,
    preStates: input.preStates,
    result: partial,
  });

  return { ...partial, computationHash };
}
