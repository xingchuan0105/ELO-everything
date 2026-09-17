import { Controller, Get, Param, UseGuards, Inject} from "@nestjs/common";
import { AuthGuard, CurrentUser, type AuthUser } from "../common/auth.guard.js";
import { LeaderboardService } from "./leaderboard.service.js";

@Controller()
@UseGuards(AuthGuard)
export class LeaderboardController {
  constructor(@Inject(LeaderboardService) private readonly lb: LeaderboardService) {}

  @Get("ladders/:id/leaderboard")
  list(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.lb.list(id, user.accountId);
  }
}
