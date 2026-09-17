import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, CurrentUser, type AuthUser } from "../common/auth.guard.js";
import { CompetitorService } from "./competitor.service.js";

@Controller()
@UseGuards(AuthGuard)
export class CompetitorController {
  constructor(@Inject(CompetitorService) private readonly competitors: CompetitorService) {}

  @Get("ladders/:id/players")
  list(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.competitors.listForLadder(id, user.accountId);
  }

  @Post("ladders/:id/players")
  add(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = z
      .object({
        names: z.array(z.string().min(1)).min(1).max(50),
      })
      .parse(body);
    return this.competitors.addToLadder(id, user.accountId, input.names);
  }
}
