import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  competitorRatings,
  competitors,
  ladders,
  matchParticipants,
  matches,
  ratingEvents,
  ratingHistory,
  type Db,
} from "@elo/db";
import {
  computeEloUpdate,
  type MatchResultInput,
  type PlayerRatingState,
  type RatingConfig,
} from "@elo/rating-engine";
import { DB } from "../common/db.module.js";
import { LadderService } from "../ladder/ladder.service.js";
import { WorkspaceService } from "../workspace/workspace.service.js";

/** A=主方 B=客方 */
export type CreateMatchBody = {
  format: "1v1" | "2v2" | "nvn";
  winnerSide: "A" | "B" | "draw";
  playedAt?: string;
  sideA: string[];
  sideB: string[];
  scoreA?: number | null;
  scoreB?: number | null;
  title?: string;
  pairingProposalId?: string;
  pairingSessionId?: string;
};

@Injectable()
export class MatchService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(LadderService) private readonly laddersSvc: LadderService,
    @Inject(WorkspaceService) private readonly workspaces: WorkspaceService,
  ) {}

  async preview(ladderId: string, accountId: string, body: CreateMatchBody) {
    const ladder = await this.laddersSvc.get(ladderId, accountId);
    this.validateBody(ladder.config as RatingConfig, body);
    const input = await this.buildComputeInput(ladder, body, randomUUID());
    const computation = computeEloUpdate(input);
    return {
      ...computation,
      deltas: computation.deltas.map((d) => ({
        competitor_id: d.accountId,
        side: d.side,
        side_label: d.side === "A" ? "主" : "客",
        rating_before: d.ratingBefore,
        rating_after: d.ratingAfter,
        delta: d.delta,
      })),
    };
  }

  /**
   * 批量预览：按对局时间（再按传入顺序）链式模拟。
   * 同一人多场时，后一场基于前一场更新后的积分。
   */
  async previewBatch(ladderId: string, accountId: string, items: CreateMatchBody[]) {
    const ladder = await this.laddersSvc.get(ladderId, accountId);
    const config = ladder.config as RatingConfig;
    const ordered = this.sortByPlayedAt(items);
    const live = await this.loadLiveStates(ladderId);

    const results = [];
    for (let i = 0; i < ordered.length; i++) {
      const body = ordered[i]!;
      this.validateBody(config, body);
      const preStates = this.statesToMap(live, body, config.start_rating);
      const input: MatchResultInput = {
        matchId: `preview-${i}`,
        ladderId,
        format: body.format,
        sides: [
          { side: "A", participantAccountIds: body.sideA, score: body.scoreA },
          { side: "B", participantAccountIds: body.sideB, score: body.scoreB },
        ],
        winnerSide: body.winnerSide,
        playedAt: body.playedAt ?? new Date().toISOString(),
        config,
        preStates,
      };
      const computation = computeEloUpdate(input);
      // apply to live chain
      for (const d of computation.deltas) {
        const cur = live.get(d.accountId) ?? {
          rating: config.start_rating,
          gamesPlayed: 0,
          provisional: true,
        };
        live.set(d.accountId, {
          rating: d.ratingAfter,
          gamesPlayed: cur.gamesPlayed + 1,
          provisional: cur.gamesPlayed + 1 < config.provisional_games,
        });
      }
      results.push({
        index: i,
        playedAt: body.playedAt,
        deltas: computation.deltas.map((d) => ({
          competitor_id: d.accountId,
          side: d.side,
          side_label: d.side === "A" ? "主" : "客",
          rating_before: d.ratingBefore,
          rating_after: d.ratingAfter,
          delta: d.delta,
        })),
      });
    }
    return {
      ordered: true,
      note: "预览已按对局时间顺序链式计算；同一人多场时后场基于前场积分变化。",
      results,
    };
  }

  /** 保存草稿：不算分；预览分差按时间链计算后写入 */
  async saveDrafts(ladderId: string, accountId: string, items: CreateMatchBody[]) {
    const ladder = await this.laddersSvc.get(ladderId, accountId);
    await this.workspaces.requireRole(ladder.workspaceId, accountId, [
      "owner",
      "admin",
      "member",
      "recorder",
    ]);
    if (!items.length) throw new BadRequestException("没有可保存的对阵");
    const config = ladder.config as RatingConfig;
    const ordered = this.sortByPlayedAt(items);
    const live = await this.loadLiveStates(ladderId);

    const created = [];
    for (const body of ordered) {
      this.validateBody(config, body);
      const matchId = randomUUID();
      const playedAt = body.playedAt ? new Date(body.playedAt) : new Date();
      const preStates = this.statesToMap(live, body, config.start_rating);
      const input: MatchResultInput = {
        matchId,
        ladderId,
        format: body.format,
        sides: [
          { side: "A", participantAccountIds: body.sideA, score: body.scoreA },
          { side: "B", participantAccountIds: body.sideB, score: body.scoreB },
        ],
        winnerSide: body.winnerSide,
        playedAt: playedAt.toISOString(),
        config,
        preStates,
      };
      const computation = computeEloUpdate(input);

      // chain for subsequent drafts in same batch (not committed to live ratings)
      for (const d of computation.deltas) {
        const cur = live.get(d.accountId) ?? {
          rating: config.start_rating,
          gamesPlayed: 0,
          provisional: true,
        };
        live.set(d.accountId, {
          rating: d.ratingAfter,
          gamesPlayed: cur.gamesPlayed + 1,
          provisional: cur.gamesPlayed + 1 < config.provisional_games,
        });
      }

      await this.db.insert(matches).values({
        id: matchId,
        ladderId,
        format: body.format,
        status: "draft",
        winnerSide: body.winnerSide,
        playedAt,
        sequenceNo: null,
        configSnapshot: config,
        computationHash: computation.computationHash,
        zeroSum: computation.zeroSum,
        createdBy: accountId,
        title: body.title,
        pairingProposalId: body.pairingProposalId,
        pairingSessionId: body.pairingSessionId,
      });

      for (const side of [
        { side: "A" as const, ids: body.sideA, score: body.scoreA },
        { side: "B" as const, ids: body.sideB, score: body.scoreB },
      ]) {
        for (const pid of side.ids) {
          const d = computation.deltas.find((x) => x.accountId === pid)!;
          await this.db.insert(matchParticipants).values({
            matchId,
            competitorId: pid,
            side: side.side,
            score: side.score ?? null,
            ratingBefore: String(d.ratingBefore),
            ratingAfter: String(d.ratingAfter),
            delta: String(d.delta),
            kEffective: String(d.kEffective),
            expectedScore: String(d.expectedScore),
            actualScore: String(d.actualScore),
          });
        }
      }
      created.push({
        id: matchId,
        status: "draft" as const,
        winnerSide: body.winnerSide,
        playedAt: playedAt.toISOString(),
      });
    }
    return {
      saved: created.length,
      matches: created,
      note: "已按对局时间顺序保存草稿；发布时亦按此时间顺序计分。",
    };
  }

  /**
   * 发布：整批同一事务。任一场失败 → 全部回滚。
   * 严格按 played_at ASC, created_at ASC 链式计分。
   */
  async publishDrafts(ladderId: string, accountId: string, matchIds?: string[]) {
    const ladder = await this.laddersSvc.get(ladderId, accountId);
    await this.workspaces.requireRole(ladder.workspaceId, accountId, [
      "owner",
      "admin",
      "member",
      "recorder",
    ]);
    if (ladder.status === "rebuilding") {
      throw new ConflictException({ code: "REBUILDING", message: "排名重算中，请稍后再试" });
    }

    const drafts = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.ladderId, ladderId),
          eq(matches.status, "draft"),
          ...(matchIds?.length ? [inArray(matches.id, matchIds)] : []),
        ),
      )
      .orderBy(asc(matches.playedAt), asc(matches.createdAt));

    if (!drafts.length) {
      throw new BadRequestException("没有待发布的草稿");
    }

    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM ladders WHERE id = ${ladderId} FOR UPDATE`);

      const results = [];
      for (const draft of drafts) {
        const parts = await tx
          .select()
          .from(matchParticipants)
          .where(eq(matchParticipants.matchId, draft.id));
        const sideA = parts.filter((p) => p.side === "A").map((p) => p.competitorId!).filter(Boolean);
        const sideB = parts.filter((p) => p.side === "B").map((p) => p.competitorId!).filter(Boolean);
        if (!sideA.length || sideA.length !== sideB.length) {
          throw new BadRequestException(`草稿 ${draft.id} 参赛人员不完整`);
        }

        const allIds = [...sideA, ...sideB].sort();
        for (const id of allIds) {
          await tx.execute(
            sql`SELECT rating FROM competitor_ratings WHERE ladder_id = ${ladderId} AND competitor_id = ${id} FOR UPDATE`,
          );
        }

        const seqRows = await tx
          .select({ max: sql<number>`coalesce(max(${matches.sequenceNo}), 0)` })
          .from(matches)
          .where(and(eq(matches.ladderId, ladderId), eq(matches.status, "rated")));
        const sequenceNo = Number(seqRows[0]?.max ?? 0) + 1;

        const body: CreateMatchBody = {
          format: draft.format as "1v1" | "2v2" | "nvn",
          winnerSide: draft.winnerSide as "A" | "B" | "draw",
          sideA,
          sideB,
          scoreA: parts.find((p) => p.side === "A")?.score ?? null,
          scoreB: parts.find((p) => p.side === "B")?.score ?? null,
          playedAt: draft.playedAt.toISOString(),
        };

        const snap = draft.configSnapshot as RatingConfig;
        const ladderSnap = { ...ladder, config: snap };
        const input = await this.buildComputeInput(ladderSnap, body, draft.id, tx as unknown as Db);
        const computation = computeEloUpdate(input);

        for (const d of computation.deltas) {
          const pre = input.preStates.get(d.accountId)!;
          const side = d.side;
          const wins = body.winnerSide === "draw" ? 0 : body.winnerSide === side ? 1 : 0;
          const losses = body.winnerSide === "draw" ? 0 : body.winnerSide === side ? 0 : 1;
          const draws = body.winnerSide === "draw" ? 1 : 0;
          const gamesPlayed = pre.gamesPlayed + 1;
          const provisional = gamesPlayed < snap.provisional_games;
          const peak = Math.max(pre.rating, d.ratingAfter);

          await tx
            .update(competitorRatings)
            .set({
              rating: String(d.ratingAfter),
              peakRating: String(peak),
              gamesPlayed,
              wins: sql`${competitorRatings.wins} + ${wins}`,
              losses: sql`${competitorRatings.losses} + ${losses}`,
              draws: sql`${competitorRatings.draws} + ${draws}`,
              provisional,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(competitorRatings.ladderId, ladderId),
                eq(competitorRatings.competitorId, d.accountId),
              ),
            );

          await tx
            .update(matchParticipants)
            .set({
              ratingBefore: String(d.ratingBefore),
              ratingAfter: String(d.ratingAfter),
              delta: String(d.delta),
              kEffective: String(d.kEffective),
              expectedScore: String(d.expectedScore),
              actualScore: String(d.actualScore),
            })
            .where(
              and(
                eq(matchParticipants.matchId, draft.id),
                eq(matchParticipants.competitorId, d.accountId),
              ),
            );

          await tx.insert(ratingHistory).values({
            ladderId,
            competitorId: d.accountId,
            matchId: draft.id,
            rating: String(d.ratingAfter),
            delta: String(d.delta),
            recordedAt: draft.playedAt,
          });
        }

        await tx
          .update(matches)
          .set({
            status: "rated",
            sequenceNo,
            computationHash: computation.computationHash,
            zeroSum: computation.zeroSum,
          })
          .where(eq(matches.id, draft.id));

        await tx.insert(ratingEvents).values({
          ladderId,
          matchId: draft.id,
          eventType: "match_published",
          payload: computation,
        });

        results.push({ id: draft.id, sequence_no: sequenceNo });
      }

      await tx
        .update(ladders)
        .set({ leaderboardVersion: sql`${ladders.leaderboardVersion} + 1` })
        .where(eq(ladders.id, ladderId));

      return { published: results.length, matches: results };
    });
  }

  async deleteDraft(matchId: string, accountId: string) {
    const rows = await this.db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    const m = rows[0];
    if (!m) throw new NotFoundException();
    await this.laddersSvc.get(m.ladderId, accountId);
    if (m.status !== "draft") throw new BadRequestException("只能删除草稿");
    await this.db.delete(matchParticipants).where(eq(matchParticipants.matchId, matchId));
    await this.db.delete(matches).where(eq(matches.id, matchId));
    return { ok: true };
  }

  async listByStatus(ladderId: string, accountId: string, status: "draft" | "rated") {
    await this.laddersSvc.get(ladderId, accountId);
    const rows = await this.db
      .select()
      .from(matches)
      .where(and(eq(matches.ladderId, ladderId), eq(matches.status, status)))
      .orderBy(status === "draft" ? asc(matches.createdAt) : desc(matches.sequenceNo))
      .limit(100);

    const out = [];
    for (const m of rows) {
      const parts = await this.db
        .select({
          competitorId: matchParticipants.competitorId,
          side: matchParticipants.side,
          delta: matchParticipants.delta,
          ratingBefore: matchParticipants.ratingBefore,
          ratingAfter: matchParticipants.ratingAfter,
          score: matchParticipants.score,
          name: competitors.name,
          teamName: competitors.teamName,
        })
        .from(matchParticipants)
        .leftJoin(competitors, eq(competitors.id, matchParticipants.competitorId))
        .where(eq(matchParticipants.matchId, m.id));
      out.push({ match: m, participants: parts });
    }
    return out;
  }

  async listRecent(ladderId: string, accountId: string, limit = 30) {
    return this.listByStatus(ladderId, accountId, "rated").then((rows) => rows.slice(0, limit));
  }

  async get(matchId: string, accountId: string) {
    const rows = await this.db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    const m = rows[0];
    if (!m) throw new NotFoundException();
    await this.laddersSvc.get(m.ladderId, accountId);
    const parts = await this.db
      .select()
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, matchId));
    return { match: m, participants: parts };
  }

  async voidMatch(matchId: string, accountId: string, reason: string) {
    const rows = await this.db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    const m = rows[0];
    if (!m) throw new NotFoundException();
    const ladder = await this.laddersSvc.get(m.ladderId, accountId);
    await this.workspaces.requireRole(ladder.workspaceId, accountId, [
      "owner",
      "admin",
      "member",
      "recorder",
    ]);
    if (m.status === "void") return { ok: true, already: true };
    if (m.status === "draft") {
      await this.deleteDraft(matchId, accountId);
      return { ok: true, message: "已删除草稿" };
    }

    await this.db
      .update(matches)
      .set({ status: "void", voidReason: reason })
      .where(eq(matches.id, matchId));

    await this.fullLadderReplay(m.ladderId);
    return { ok: true, message: "已撤销并重算排名" };
  }

  async rebuild(ladderId: string, accountId: string) {
    await this.laddersSvc.get(ladderId, accountId);
    return this.fullLadderReplay(ladderId);
  }

  async fullLadderReplay(ladderId: string) {
    const ladderRows = await this.db.select().from(ladders).where(eq(ladders.id, ladderId)).limit(1);
    const ladder = ladderRows[0];
    if (!ladder) throw new NotFoundException();
    const config = ladder.config as RatingConfig;

    await this.db.transaction(async (tx) => {
      await tx
        .update(ladders)
        .set({ status: "rebuilding", rebuildStartedAt: new Date() })
        .where(eq(ladders.id, ladderId));
      await tx.execute(sql`SELECT id FROM ladders WHERE id = ${ladderId} FOR UPDATE`);

      const ratingRows = await tx
        .select()
        .from(competitorRatings)
        .where(eq(competitorRatings.ladderId, ladderId));

      for (const r of ratingRows) {
        await tx
          .update(competitorRatings)
          .set({
            rating: String(config.start_rating),
            peakRating: String(config.start_rating),
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            provisional: true,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(competitorRatings.ladderId, ladderId),
              eq(competitorRatings.competitorId, r.competitorId),
            ),
          );
      }

      await tx.delete(ratingHistory).where(eq(ratingHistory.ladderId, ladderId));

      const rated = await tx
        .select()
        .from(matches)
        .where(and(eq(matches.ladderId, ladderId), eq(matches.status, "rated")))
        .orderBy(asc(matches.playedAt), asc(matches.sequenceNo));

      for (const m of rated) {
        const parts = await tx
          .select()
          .from(matchParticipants)
          .where(eq(matchParticipants.matchId, m.id));
        const sideA = parts.filter((p) => p.side === "A").map((p) => p.competitorId!).filter(Boolean);
        const sideB = parts.filter((p) => p.side === "B").map((p) => p.competitorId!).filter(Boolean);
        if (!sideA.length || sideA.length !== sideB.length) continue;
        const snap = m.configSnapshot as RatingConfig;

        const preStates = new Map<string, PlayerRatingState>();
        for (const id of [...sideA, ...sideB]) {
          const [pr] = await tx
            .select()
            .from(competitorRatings)
            .where(
              and(eq(competitorRatings.ladderId, ladderId), eq(competitorRatings.competitorId, id)),
            )
            .limit(1);
          if (!pr) continue;
          preStates.set(id, {
            accountId: id,
            rating: Number(pr.rating),
            gamesPlayed: pr.gamesPlayed,
            provisional: pr.provisional,
          });
        }

        const input: MatchResultInput = {
          matchId: m.id,
          ladderId,
          format: m.format as "1v1" | "2v2" | "nvn",
          sides: [
            { side: "A", participantAccountIds: sideA },
            { side: "B", participantAccountIds: sideB },
          ],
          winnerSide: m.winnerSide as "A" | "B" | "draw",
          playedAt: m.playedAt.toISOString(),
          config: snap,
          preStates,
        };
        const computation = computeEloUpdate(input);

        for (const d of computation.deltas) {
          const pre = preStates.get(d.accountId)!;
          const side = d.side;
          const wins = m.winnerSide === "draw" ? 0 : m.winnerSide === side ? 1 : 0;
          const losses = m.winnerSide === "draw" ? 0 : m.winnerSide === side ? 0 : 1;
          const draws = m.winnerSide === "draw" ? 1 : 0;
          const gamesPlayed = pre.gamesPlayed + 1;
          const [cur] = await tx
            .select()
            .from(competitorRatings)
            .where(
              and(
                eq(competitorRatings.ladderId, ladderId),
                eq(competitorRatings.competitorId, d.accountId),
              ),
            )
            .limit(1);
          const peak = Math.max(Number(cur?.peakRating ?? pre.rating), d.ratingAfter);

          await tx
            .update(competitorRatings)
            .set({
              rating: String(d.ratingAfter),
              peakRating: String(peak),
              gamesPlayed,
              wins: sql`${competitorRatings.wins} + ${wins}`,
              losses: sql`${competitorRatings.losses} + ${losses}`,
              draws: sql`${competitorRatings.draws} + ${draws}`,
              provisional: gamesPlayed < snap.provisional_games,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(competitorRatings.ladderId, ladderId),
                eq(competitorRatings.competitorId, d.accountId),
              ),
            );

          await tx.insert(ratingHistory).values({
            ladderId,
            competitorId: d.accountId,
            matchId: m.id,
            rating: String(d.ratingAfter),
            delta: String(d.delta),
            recordedAt: m.playedAt,
          });

          await tx
            .update(matchParticipants)
            .set({
              ratingBefore: String(d.ratingBefore),
              ratingAfter: String(d.ratingAfter),
              delta: String(d.delta),
              kEffective: String(d.kEffective),
              expectedScore: String(d.expectedScore),
              actualScore: String(d.actualScore),
            })
            .where(
              and(
                eq(matchParticipants.matchId, m.id),
                eq(matchParticipants.competitorId, d.accountId),
              ),
            );
        }

        await tx
          .update(matches)
          .set({
            computationHash: computation.computationHash,
            zeroSum: computation.zeroSum,
          })
          .where(eq(matches.id, m.id));
      }

      await tx
        .update(ladders)
        .set({ status: "active", rebuildStartedAt: null })
        .where(eq(ladders.id, ladderId));
    });

    return { ok: true };
  }

  private validateBody(config: RatingConfig, body: CreateMatchBody) {
    if (body.winnerSide === "draw" && !config.allow_draw) {
      throw new BadRequestException("本赛事不允许平局");
    }
    if (body.sideA.length !== body.sideB.length || body.sideA.length < 1) {
      throw new BadRequestException("主客双方人数须一致");
    }
    if (body.sideA.length > 5) {
      throw new BadRequestException("每队最多 5 人");
    }
    if (new Set(body.sideA).size !== body.sideA.length || new Set(body.sideB).size !== body.sideB.length) {
      throw new BadRequestException("同一侧不能重复选择同一人");
    }
    if (body.sideA.some((id) => body.sideB.includes(id))) {
      throw new BadRequestException("同一人不能同时在主客双方");
    }
    const n = body.sideA.length;
    if (body.format === "1v1" && n !== 1) {
      throw new BadRequestException("1v1 每队须 1 人");
    }
    if (body.format === "2v2" && n !== 2) {
      throw new BadRequestException("2v2 每队须 2 人");
    }
    if (body.format === "nvn" && n < 3) {
      throw new BadRequestException("NvN 每队至少 3 人");
    }
  }

  /** 对局时间升序；时间相同保持原相对顺序 */
  private sortByPlayedAt(items: CreateMatchBody[]): CreateMatchBody[] {
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const ta = a.item.playedAt ? Date.parse(a.item.playedAt) : Date.now();
        const tb = b.item.playedAt ? Date.parse(b.item.playedAt) : Date.now();
        if (ta !== tb) return ta - tb;
        return a.index - b.index;
      })
      .map((x) => x.item);
  }

  private async loadLiveStates(
    ladderId: string,
  ): Promise<Map<string, { rating: number; gamesPlayed: number; provisional: boolean }>> {
    const rows = await this.db
      .select()
      .from(competitorRatings)
      .where(eq(competitorRatings.ladderId, ladderId));
    const map = new Map<string, { rating: number; gamesPlayed: number; provisional: boolean }>();
    for (const r of rows) {
      map.set(r.competitorId, {
        rating: Number(r.rating),
        gamesPlayed: r.gamesPlayed,
        provisional: r.provisional,
      });
    }
    return map;
  }

  private statesToMap(
    live: Map<string, { rating: number; gamesPlayed: number; provisional: boolean }>,
    body: CreateMatchBody,
    startRating: number,
  ): Map<string, PlayerRatingState> {
    const pre = new Map<string, PlayerRatingState>();
    for (const id of [...body.sideA, ...body.sideB]) {
      const cur = live.get(id);
      pre.set(id, {
        accountId: id,
        rating: cur?.rating ?? startRating,
        gamesPlayed: cur?.gamesPlayed ?? 0,
        provisional: cur?.provisional ?? true,
      });
    }
    return pre;
  }

  private async buildComputeInput(
    ladder: typeof ladders.$inferSelect,
    body: CreateMatchBody,
    matchId: string,
    tx?: Db,
  ): Promise<MatchResultInput> {
    const db = tx ?? this.db;
    const config = ladder.config as RatingConfig;
    this.validateBody(config, body);

    const preStates = new Map<string, PlayerRatingState>();
    for (const id of [...body.sideA, ...body.sideB]) {
      const rows = await db
        .select()
        .from(competitorRatings)
        .where(
          and(eq(competitorRatings.ladderId, ladder.id), eq(competitorRatings.competitorId, id)),
        )
        .limit(1);
      const pr = rows[0];
      if (!pr) {
        preStates.set(id, {
          accountId: id,
          rating: config.start_rating,
          gamesPlayed: 0,
          provisional: true,
        });
      } else {
        preStates.set(id, {
          accountId: id,
          rating: Number(pr.rating),
          gamesPlayed: pr.gamesPlayed,
          provisional: pr.provisional,
        });
      }
    }

    return {
      matchId,
      ladderId: ladder.id,
      format: body.format,
      sides: [
        { side: "A", participantAccountIds: body.sideA, score: body.scoreA },
        { side: "B", participantAccountIds: body.sideB, score: body.scoreB },
      ],
      winnerSide: body.winnerSide,
      playedAt: body.playedAt ?? new Date().toISOString(),
      config,
      preStates,
    };
  }
}
