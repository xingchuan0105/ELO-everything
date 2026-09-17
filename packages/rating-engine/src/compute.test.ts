import { describe, expect, it } from "vitest";
import { computeEloUpdate } from "./compute.js";
import { DEFAULT_CONFIG } from "./config.js";
import { expectedScore } from "./expected.js";
import { quantize4 } from "./quantize.js";
import type { MatchResultInput, PlayerRatingState, RatingConfig } from "./types.js";

function state(id: string, rating: number, games = 50): PlayerRatingState {
  return {
    accountId: id,
    rating,
    gamesPlayed: games,
    provisional: games < 20,
  };
}

function baseInput(over: Partial<MatchResultInput> = {}): MatchResultInput {
  const preStates = new Map([
    ["p1", state("p1", 1500)],
    ["p2", state("p2", 1500)],
  ]);
  return {
    matchId: "m1",
    ladderId: "l1",
    format: "1v1",
    sides: [
      { side: "A", participantAccountIds: ["p1"] },
      { side: "B", participantAccountIds: ["p2"] },
    ],
    winnerSide: "A",
    playedAt: "2026-07-14T00:00:00.000Z",
    config: { ...DEFAULT_CONFIG },
    preStates,
    ...over,
  };
}

describe("computeEloUpdate 1v1", () => {
  it("equal ratings: winner gets +K/2", () => {
    const r = computeEloUpdate(baseInput());
    expect(r.expectedA).toBeCloseTo(0.5, 10);
    expect(r.deltas.find((d) => d.accountId === "p1")!.delta).toBe(16);
    expect(r.deltas.find((d) => d.accountId === "p2")!.delta).toBe(-16);
    expect(r.zeroSum).toBe(true);
  });

  it("matches design appendix 400-pt underdog |Δ| ≈ 29.0909", () => {
    // lower rated wins by 400: underdog at 1100 vs 1500
    const preStates = new Map([
      ["low", state("low", 1100)],
      ["high", state("high", 1500)],
    ]);
    const r = computeEloUpdate(
      baseInput({
        sides: [
          { side: "A", participantAccountIds: ["low"] },
          { side: "B", participantAccountIds: ["high"] },
        ],
        winnerSide: "A",
        preStates,
      }),
    );
    const eA = expectedScore(1100, 1500, 400);
    expect(eA).toBeCloseTo(1 / 11, 10);
    const expectedDelta = quantize4(32 * (1 - eA));
    expect(expectedDelta).toBe(29.0909);
    expect(r.deltas.find((d) => d.accountId === "low")!.delta).toBe(29.0909);
    expect(r.zeroSum).toBe(true);
  });
});

describe("computeEloUpdate 2v2 equal full-Δ", () => {
  it("matches design Appendix A (Δ = 13.7132)", () => {
    const preStates = new Map([
      ["p1", state("p1", 1500)],
      ["p2", state("p2", 1600)],
      ["p3", state("p3", 1550)],
      ["p4", state("p4", 1450)],
    ]);
    const r = computeEloUpdate(
      baseInput({
        format: "2v2",
        sides: [
          { side: "A", participantAccountIds: ["p1", "p2"] },
          { side: "B", participantAccountIds: ["p3", "p4"] },
        ],
        winnerSide: "A",
        preStates,
      }),
    );

    expect(r.teamRatingA).toBe(1550);
    expect(r.teamRatingB).toBe(1500);
    const eA = expectedScore(1550, 1500, 400);
    expect(r.expectedA).toBeCloseTo(eA, 12);
    expect(quantize4(32 * (1 - eA))).toBe(13.7132);

    for (const id of ["p1", "p2"]) {
      expect(r.deltas.find((d) => d.accountId === id)!.delta).toBe(13.7132);
    }
    for (const id of ["p3", "p4"]) {
      expect(r.deltas.find((d) => d.accountId === id)!.delta).toBe(-13.7132);
    }
    expect(r.zeroSum).toBe(true);
  });

  it("8v8 full-Δ invariant: per-player |delta| equals 1v1 scale", () => {
    const idsA = Array.from({ length: 8 }, (_, i) => `a${i}`);
    const idsB = Array.from({ length: 8 }, (_, i) => `b${i}`);
    const preStates = new Map<string, PlayerRatingState>();
    for (const id of idsA) preStates.set(id, state(id, 1500));
    for (const id of idsB) preStates.set(id, state(id, 1500));

    const r = computeEloUpdate(
      baseInput({
        format: "nvn",
        sides: [
          { side: "A", participantAccountIds: idsA },
          { side: "B", participantAccountIds: idsB },
        ],
        winnerSide: "A",
        preStates,
      }),
    );
    for (const d of r.deltas) {
      expect(Math.abs(d.delta)).toBe(16);
    }
    expect(r.zeroSum).toBe(true);
  });
});

describe("provisional asymmetric team K", () => {
  it("uses min of team Ks in strict mode", () => {
    const preStates = new Map([
      ["p1", state("p1", 1500, 5)],
      ["p2", state("p2", 1600, 50)],
      ["p3", state("p3", 1550, 30)],
      ["p4", state("p4", 1450, 30)],
    ]);
    const r = computeEloUpdate(
      baseInput({
        format: "2v2",
        sides: [
          { side: "A", participantAccountIds: ["p1", "p2"] },
          { side: "B", participantAccountIds: ["p3", "p4"] },
        ],
        winnerSide: "A",
        preStates,
      }),
    );
    // K_team A = (40+32)/2=36, B=32, min=32 → same as equal-K example
    expect(r.deltas[0]!.kEffective).toBe(32);
    expect(r.deltas.find((d) => d.accountId === "p1")!.delta).toBe(13.7132);
  });
});

describe("floor clamp breaks zeroSum", () => {
  it("marks zeroSum false when floor clamps loser", () => {
    const cfg: RatingConfig = {
      ...DEFAULT_CONFIG,
      rating_floor: 100,
    };
    const preStates = new Map([
      ["p1", state("p1", 1500)],
      ["p2", state("p2", 100)],
    ]);
    const r = computeEloUpdate(
      baseInput({
        config: cfg,
        winnerSide: "A",
        preStates,
      }),
    );
    const d2 = r.deltas.find((d) => d.accountId === "p2")!;
    expect(d2.ratingAfter).toBe(100);
    expect(r.zeroSum).toBe(false);
  });
});

describe("hash stability", () => {
  it("is deterministic for same input", () => {
    const a = computeEloUpdate(baseInput());
    const b = computeEloUpdate(baseInput());
    expect(a.computationHash).toBe(b.computationHash);
    expect(a.computationHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
