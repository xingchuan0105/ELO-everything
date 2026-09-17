import { describe, expect, it } from "vitest";
import { PAIRING_PRESETS } from "./policy.js";
import { solveCSP } from "./solve.js";
import { PairingError, type PairingSolveInput, type PoolPlayer } from "./types.js";

function players(n: number, base = 1500): PoolPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    accountId: `p${i}`,
    rating: base + (i % 5) * 20,
    gamesPlayed: 30,
    isProvisional: false,
  }));
}

function baseInput(over: Partial<PairingSolveInput> = {}): PairingSolveInput {
  return {
    format: "1v1",
    teamSize: 1,
    pool: players(8),
    rules: [],
    policy: { ...PAIRING_PRESETS.fair },
    history: { recentMatches: [], h2h: {}, partnerCounts: {} },
    seed: 42,
    matchesToEmit: 4,
    scale: 400,
    ...over,
  };
}

describe("solveCSP", () => {
  it("produces balanced 1v1 proposals with fair preset", () => {
    const r = solveCSP(baseInput());
    expect(r.proposals.length).toBeGreaterThan(0);
    expect(r.proposals[0]!.matches.length).toBe(4);
    for (const m of r.proposals[0]!.matches) {
      expect(m.sideA).toHaveLength(1);
      expect(m.sideB).toHaveLength(1);
      expect(m.expectedScoreA).toBeGreaterThan(0.15);
      expect(m.expectedScoreA).toBeLessThan(0.85);
    }
  });

  it("is seed-deterministic for first proposal structure size", () => {
    const a = solveCSP(baseInput({ seed: 7 }));
    const b = solveCSP(baseInput({ seed: 7 }));
    expect(a.proposals[0]!.matches.length).toBe(b.proposals[0]!.matches.length);
    expect(JSON.stringify(a.proposals[0]!.matches)).toBe(JSON.stringify(b.proposals[0]!.matches));
  });

  it("rejects conflicting must_team and cannot_team", () => {
    expect(() =>
      solveCSP(
        baseInput({
          rules: [
            {
              id: "r1",
              ruleType: "must_team",
              hardness: "hard",
              accountIds: ["p0", "p1"],
            },
            {
              id: "r2",
              ruleType: "cannot_team",
              hardness: "hard",
              accountIds: ["p0", "p1"],
            },
          ],
          format: "2v2",
          teamSize: 2,
          matchesToEmit: 2,
          pool: players(8),
        }),
      ),
    ).toThrow(PairingError);
  });

  it("respects max_pool_size", () => {
    expect(() =>
      solveCSP(
        baseInput({
          pool: players(40),
          policy: { ...PAIRING_PRESETS.fair, max_pool_size: 32 },
        }),
      ),
    ).toThrowError(/max_pool_size/);
  });

  it("2v2 with must_team keeps pair together", () => {
    const r = solveCSP(
      baseInput({
        format: "2v2",
        teamSize: 2,
        matchesToEmit: 2,
        pool: players(8),
        rules: [
          {
            id: "mt",
            ruleType: "must_team",
            hardness: "hard",
            accountIds: ["p0", "p1"],
          },
        ],
      }),
    );
    const all = r.proposals[0]!.matches;
    const together = all.some(
      (m) =>
        (m.sideA.includes("p0") && m.sideA.includes("p1")) ||
        (m.sideB.includes("p0") && m.sideB.includes("p1")),
    );
    expect(together).toBe(true);
  });
});
