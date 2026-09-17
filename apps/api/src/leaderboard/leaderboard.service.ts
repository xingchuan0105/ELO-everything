import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { competitorRatings, competitors, type Db } from "@elo/db";
import { DB } from "../common/db.module.js";
import { LadderService } from "../ladder/ladder.service.js";

@Injectable()
export class LeaderboardService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(LadderService) private readonly ladders: LadderService,
  ) {}

  async list(ladderId: string, accountId: string) {
    const ladder = await this.ladders.get(ladderId, accountId);
    const rows = await this.db
      .select({
        competitorId: competitorRatings.competitorId,
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
      .from(competitorRatings)
      .innerJoin(competitors, eq(competitors.id, competitorRatings.competitorId))
      .where(eq(competitorRatings.ladderId, ladderId))
      .orderBy(desc(competitorRatings.rating));

    return {
      ladder_id: ladderId,
      leaderboard_version: ladder.leaderboardVersion,
      items: rows,
    };
  }
}
