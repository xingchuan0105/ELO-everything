import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { DbModule } from "./common/db.module.js";
import { WorkspaceModule } from "./workspace/workspace.module.js";
import { LadderModule } from "./ladder/ladder.module.js";
import { MatchModule } from "./match/match.module.js";
import { PairingModule } from "./pairing/pairing.module.js";
import { LeaderboardModule } from "./leaderboard/leaderboard.module.js";
import { CompetitorModule } from "./competitor/competitor.module.js";

@Module({
  imports: [
    DbModule,
    AuthModule,
    WorkspaceModule,
    LadderModule,
    CompetitorModule,
    MatchModule,
    PairingModule,
    LeaderboardModule,
  ],
})
export class AppModule {}
