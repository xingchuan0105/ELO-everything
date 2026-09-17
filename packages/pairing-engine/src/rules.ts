import type { PairingConflict, PairingRule } from "./types.js";
import { PairingError } from "./types.js";

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Union-find for must_team groups. */
export function buildMustTeamGroups(rules: PairingRule[]): Map<string, string[]> {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const r of rules) {
    if (r.ruleType !== "must_team" || r.hardness !== "hard") continue;
    if (r.accountIds.length < 2) continue;
    for (let i = 1; i < r.accountIds.length; i++) {
      union(r.accountIds[0]!, r.accountIds[i]!);
    }
  }

  const groups = new Map<string, string[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(id);
  }
  return groups;
}

export function validateHardRules(
  rules: PairingRule[],
  poolIds: Set<string>,
  teamSize: number,
): void {
  const conflicts: PairingConflict[] = [];
  const hard = rules.filter((r) => r.hardness === "hard");

  for (const r of hard) {
    for (const id of r.accountIds) {
      if (!poolIds.has(id)) {
        conflicts.push({
          ruleIds: [r.id],
          reason: `account ${id} not in pool`,
        });
      }
    }
  }

  const mustGroups = buildMustTeamGroups(hard);
  for (const [, members] of mustGroups) {
    if (members.length > teamSize) {
      const related = hard
        .filter((r) => r.ruleType === "must_team" && r.accountIds.some((id) => members.includes(id)))
        .map((r) => r.id);
      conflicts.push({
        ruleIds: related,
        reason: `must_team group size ${members.length} > teamSize ${teamSize}`,
      });
    }
  }

  // cannot_team vs must_team
  for (const r of hard) {
    if (r.ruleType !== "cannot_team" || r.accountIds.length < 2) continue;
    const [a, b] = r.accountIds;
    for (const [, members] of mustGroups) {
      if (members.includes(a!) && members.includes(b!)) {
        const mustIds = hard
          .filter((x) => x.ruleType === "must_team")
          .map((x) => x.id);
        conflicts.push({
          ruleIds: [r.id, ...mustIds],
          reason: `must_team conflicts with cannot_team(${a},${b})`,
        });
      }
    }
  }

  // cannot_oppose + must_oppose on same pair
  const cannotOppose = new Set<string>();
  const mustOppose = new Set<string>();
  for (const r of hard) {
    if (r.accountIds.length < 2) continue;
    const key = pairKey(r.accountIds[0]!, r.accountIds[1]!);
    if (r.ruleType === "cannot_oppose") cannotOppose.add(key);
    if (r.ruleType === "must_oppose") mustOppose.add(key);
  }
  for (const key of cannotOppose) {
    if (mustOppose.has(key)) {
      conflicts.push({
        ruleIds: hard.filter((r) => r.ruleType.includes("oppose")).map((r) => r.id),
        reason: `cannot_oppose conflicts with must_oppose for ${key}`,
      });
    }
  }

  if (conflicts.length > 0) {
    throw new PairingError("Hard rules cannot be satisfied", "PAIRING_INFEASIBLE", conflicts);
  }
}

export function sidesViolateHardRules(
  sideA: string[],
  sideB: string[],
  rules: PairingRule[],
): boolean {
  const hard = rules.filter((r) => r.hardness === "hard");
  const setA = new Set(sideA);
  const setB = new Set(sideB);

  for (const r of hard) {
    if (r.ruleType === "must_team") {
      const present = r.accountIds.filter((id) => setA.has(id) || setB.has(id));
      // Rule applies only when group appears; partial presence is illegal,
      // full absence in this particular match is fine (they may sit or play elsewhere).
      if (present.length === 0) {
        // ok for this match
      } else if (present.length !== r.accountIds.length) {
        return true;
      } else {
        const sideOf = (id: string) => (setA.has(id) ? "A" : "B");
        const sides = new Set(r.accountIds.map(sideOf));
        if (sides.size > 1) return true;
      }
    }
    if (r.ruleType === "cannot_team" && r.accountIds.length >= 2) {
      const [a, b] = r.accountIds;
      if ((setA.has(a!) && setA.has(b!)) || (setB.has(a!) && setB.has(b!))) return true;
    }
    if (r.ruleType === "cannot_oppose" && r.accountIds.length >= 2) {
      const [a, b] = r.accountIds;
      if ((setA.has(a!) && setB.has(b!)) || (setA.has(b!) && setB.has(a!))) return true;
    }
    if (r.ruleType === "must_oppose" && r.accountIds.length >= 2) {
      const [a, b] = r.accountIds;
      const ok =
        (setA.has(a!) && setB.has(b!)) || (setA.has(b!) && setB.has(a!));
      // only enforce if both present in this match
      const both = (setA.has(a!) || setB.has(a!)) && (setA.has(b!) || setB.has(b!));
      if (both && !ok) return true;
    }
    if (r.ruleType === "locked_side" && r.lockedSide && r.accountIds[0]) {
      const id = r.accountIds[0];
      if (r.lockedSide === "A" && setB.has(id)) return true;
      if (r.lockedSide === "B" && setA.has(id)) return true;
    }
  }
  return false;
}
