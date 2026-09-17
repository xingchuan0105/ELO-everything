import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import {
  competitorRatings,
  pairingProposals,
  pairingRules,
  pairingSessions,
  type Db,
} from "@elo/db";
import {
  DEFAULT_PAIRING_PRESET,
  PAIRING_PRESETS,
  PairingError,
  solveCSP,
  type PairingPolicy,
  type PairingPresetId,
  type PairingRule,
  type PoolPlayer,
} from "@elo/pairing-engine";
import type { RatingConfig } from "@elo/rating-engine";
import { DB } from "../common/db.module.js";
import { LadderService } from "../ladder/ladder.service.js";
import { MatchService } from "../match/match.service.js";
import { WorkspaceService } from "../workspace/workspace.service.js";

@Injectable()
export class PairingService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(LadderService) private readonly ladders: LadderService,
    @Inject(WorkspaceService) private readonly workspaces: WorkspaceService,
    @Inject(MatchService) private readonly matches: MatchService,
  ) {}

  async createSession(
    ladderId: string,
    accountId: string,
    input: {
      name?: string;
      format: "1v1" | "2v2" | "nvn";
      teamSize: number;
      pool: string[];
      policyPreset?: PairingPresetId;
      policy?: Partial<PairingPolicy>;
      matchesToEmit?: number;
      rules?: Array<{
        ruleType: PairingRule["ruleType"];
        hardness?: "hard" | "soft";
        accountIds: string[];
        weight?: number;
      }>;
    },
  ) {
    const ladder = await this.ladders.get(ladderId, accountId);
    await this.workspaces.requireRole(ladder.workspaceId, accountId, [
      "owner",
      "admin",
      "member",
      "recorder",
    ]);

    const preset = input.policyPreset ?? DEFAULT_PAIRING_PRESET;
    const policy: PairingPolicy = {
      ...PAIRING_PRESETS[preset],
      ...(input.policy ?? {}),
    };

    const [session] = await this.db
      .insert(pairingSessions)
      .values({
        ladderId,
        workspaceId: ladder.workspaceId,
        createdBy: accountId,
        name: input.name,
        format: input.format,
        teamSize: input.teamSize,
        pool: input.pool,
        policy,
        policyPreset: preset,
        status: "draft",
        matchesToEmit: input.matchesToEmit ?? Math.floor(input.pool.length / (2 * input.teamSize)),
      })
      .returning();

    if (input.rules?.length) {
      for (const r of input.rules) {
        await this.db.insert(pairingRules).values({
          sessionId: session!.id,
          ruleType: r.ruleType,
          hardness: r.hardness ?? "hard",
          accountIds: r.accountIds,
          weight: r.weight != null ? String(r.weight) : null,
        });
      }
    }

    return this.getSession(session!.id, accountId);
  }

  async getSession(sessionId: string, accountId: string) {
    const rows = await this.db
      .select()
      .from(pairingSessions)
      .where(eq(pairingSessions.id, sessionId))
      .limit(1);
    const session = rows[0];
    if (!session) throw new NotFoundException();
    await this.ladders.get(session.ladderId, accountId);
    const rules = await this.db
      .select()
      .from(pairingRules)
      .where(eq(pairingRules.sessionId, sessionId));
    const proposals = await this.db
      .select()
      .from(pairingProposals)
      .where(eq(pairingProposals.sessionId, sessionId));
    return { session, rules, proposals };
  }

  async generate(sessionId: string, accountId: string, seed?: number) {
    const { session, rules } = await this.getSession(sessionId, accountId);
    const ladder = await this.ladders.getRaw(session.ladderId);
    const config = ladder.config as RatingConfig;
    const poolIds = session.pool as string[];
    const policy = session.policy as PairingPolicy;

    const pool: PoolPlayer[] = [];
    for (const id of poolIds) {
      const [pr] = await this.db
        .select()
        .from(competitorRatings)
        .where(
          and(
            eq(competitorRatings.ladderId, session.ladderId),
            eq(competitorRatings.competitorId, id),
          ),
        )
        .limit(1);
      if (!pr) continue;
      pool.push({
        accountId: id,
        rating: Number(pr.rating),
        gamesPlayed: pr.gamesPlayed,
        isProvisional: pr.provisional,
      });
    }
    if (pool.length < 2) {
      throw new BadRequestException("请先添加至少 2 名选手");
    }

    const pairingRulesInput: PairingRule[] = rules.map((r) => ({
      id: r.id,
      ruleType: r.ruleType as PairingRule["ruleType"],
      hardness: r.hardness as "hard" | "soft",
      accountIds: r.accountIds as string[],
      weight: r.weight != null ? Number(r.weight) : undefined,
    }));

    const useSeed = seed ?? (Math.floor(Math.random() * 1e9) >>> 0);

    try {
      const result = solveCSP({
        format: session.format as "1v1" | "2v2" | "nvn",
        teamSize: session.teamSize,
        pool,
        rules: pairingRulesInput,
        policy,
        history: { recentMatches: [], h2h: {}, partnerCounts: {} },
        seed: useSeed,
        matchesToEmit: session.matchesToEmit,
        scale: config.scale,
      });

      // clear old proposals for simplicity on regenerate
      await this.db.delete(pairingProposals).where(eq(pairingProposals.sessionId, sessionId));

      const saved = [];
      let rank = 1;
      for (const p of result.proposals) {
        const [row] = await this.db
          .insert(pairingProposals)
          .values({
            sessionId,
            seed: useSeed,
            rank: rank++,
            totalCost: String(p.totalCost),
            body: p,
            engineVersion: "csp-1",
          })
          .returning();
        saved.push(row);
      }

      await this.db
        .update(pairingSessions)
        .set({ status: "generated", seed: useSeed, updatedAt: new Date() })
        .where(eq(pairingSessions.id, sessionId));

      return {
        session_id: sessionId,
        seed: useSeed,
        proposals: saved.map((s) => ({ id: s!.id, rank: s!.rank, ...(s!.body as object) })),
        diagnostics: result.diagnostics,
      };
    } catch (e) {
      if (e instanceof PairingError) {
        if (e.code === "PAIRING_INFEASIBLE" || e.code === "PAIRING_NO_FEASIBLE_MATCH") {
          throw new UnprocessableEntityException({
            code: e.code,
            message: e.message,
            details: { conflicts: e.conflicts ?? [] },
          });
        }
        if (e.code === "PAIRING_POOL_TOO_LARGE") {
          throw new HttpException({ code: e.code, message: e.message }, 413);
        }
        throw new BadRequestException({ code: e.code, message: e.message });
      }
      throw e;
    }
  }

  async confirm(sessionId: string, proposalId: string, accountId: string) {
    const { session } = await this.getSession(sessionId, accountId);
    const [proposal] = await this.db
      .select()
      .from(pairingProposals)
      .where(
        and(eq(pairingProposals.id, proposalId), eq(pairingProposals.sessionId, sessionId)),
      )
      .limit(1);
    if (!proposal) throw new NotFoundException();

    const body = proposal.body as {
      matches: Array<{ sideA: string[]; sideB: string[] }>;
    };

    // Confirm creates ready match shells? Design: ready matches - we create as pending by recording with winner unknown.
    // For MVP: return drafts for client to score; optionally create placeholder is not in match schema.
    // Design OQ11: ready and can score immediately — we only create matches when results known.
    // So confirm returns match drafts bound to proposal for subsequent POST /matches with pairing ids.

    await this.db
      .update(pairingSessions)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(pairingSessions.id, sessionId));

    return {
      session_id: sessionId,
      proposal_id: proposalId,
      format: session.format,
      drafts: body.matches.map((m) => ({
        sideA: m.sideA,
        sideB: m.sideB,
        pairingSessionId: sessionId,
        pairingProposalId: proposalId,
      })),
      note: "Submit each draft via POST /ladders/:id/matches with winnerSide when the match finishes.",
    };
  }
}
