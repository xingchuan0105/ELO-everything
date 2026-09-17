import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { competitorRatings, competitors, type Db } from "@elo/db";
import type { RatingConfig } from "@elo/rating-engine";
import { DB } from "../common/db.module.js";
import { LadderService } from "../ladder/ladder.service.js";
import { WorkspaceService } from "../workspace/workspace.service.js";

@Injectable()
export class CompetitorService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(LadderService) private readonly ladders: LadderService,
    @Inject(WorkspaceService) private readonly workspaces: WorkspaceService,
  ) {}

  async listForLadder(ladderId: string, accountId: string) {
    const ladder = await this.ladders.get(ladderId, accountId);
    const rows = await this.db
      .select({
        id: competitors.id,
        name: competitors.name,
        teamName: competitors.teamName,
        rating: competitorRatings.rating,
        peakRating: competitorRatings.peakRating,
        gamesPlayed: competitorRatings.gamesPlayed,
        wins: competitorRatings.wins,
        losses: competitorRatings.losses,
        draws: competitorRatings.draws,
        provisional: competitorRatings.provisional,
      })
      .from(competitors)
      .innerJoin(
        competitorRatings,
        and(
          eq(competitorRatings.competitorId, competitors.id),
          eq(competitorRatings.ladderId, ladderId),
        ),
      )
      .where(eq(competitors.workspaceId, ladder.workspaceId));

    // sort by rating desc in JS (numeric as string)
    return rows.sort((a, b) => Number(b.rating) - Number(a.rating));
  }

  /** 解析「张三」或「张三@火箭队」/「张三|火箭队」 */
  parsePlayerLine(raw: string): { name: string; teamName: string | null } {
    const s = raw.trim();
    if (!s) return { name: "", teamName: null };
    const m = s.match(/^(.+?)\s*[@|｜]\s*(.+)$/);
    if (m) {
      return {
        name: m[1]!.trim(),
        teamName: m[2]!.trim().slice(0, 40) || null,
      };
    }
    return { name: s, teamName: null };
  }

  async addToLadder(
    ladderId: string,
    accountId: string,
    names: string[],
  ) {
    const ladder = await this.ladders.get(ladderId, accountId);
    await this.workspaces.requireRole(ladder.workspaceId, accountId, [
      "owner",
      "admin",
      "member",
      "recorder",
    ]);
    const config = ladder.config as RatingConfig;
    const created = [];
    for (const raw of names) {
      const { name, teamName } = this.parsePlayerLine(raw);
      if (!name) continue;
      if (name.length > 40) throw new BadRequestException("选手姓名过长");
      if (teamName && teamName.length > 40) throw new BadRequestException("队伍名过长");
      const [c] = await this.db
        .insert(competitors)
        .values({
          workspaceId: ladder.workspaceId,
          name,
          teamName,
          createdBy: accountId,
        })
        .returning();
      await this.db.insert(competitorRatings).values({
        ladderId,
        competitorId: c!.id,
        rating: String(config.start_rating),
        peakRating: String(config.start_rating),
        gamesPlayed: 0,
        provisional: true,
      });
      created.push(c);
    }
    return { created };
  }

  async ensureRating(ladderId: string, competitorId: string, start: number) {
    const existing = await this.db
      .select()
      .from(competitorRatings)
      .where(
        and(
          eq(competitorRatings.ladderId, ladderId),
          eq(competitorRatings.competitorId, competitorId),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];
    const [row] = await this.db
      .insert(competitorRatings)
      .values({
        ladderId,
        competitorId,
        rating: String(start),
        peakRating: String(start),
      })
      .returning();
    return row!;
  }

  async getCompetitor(id: string) {
    const rows = await this.db.select().from(competitors).where(eq(competitors.id, id)).limit(1);
    if (!rows[0]) throw new NotFoundException("选手不存在");
    return rows[0];
  }
}
