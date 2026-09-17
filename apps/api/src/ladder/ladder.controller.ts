import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, CurrentUser, type AuthUser } from "../common/auth.guard.js";
import { LadderService } from "./ladder.service.js";

@Controller()
@UseGuards(AuthGuard)
export class LadderController {
  constructor(@Inject(LadderService) private readonly ladders: LadderService) {}

  @Post("workspaces/:ws/ladders")
  create(@Param("ws") ws: string, @CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = z
      .object({
        name: z.string().min(1, "请填写名称"),
        slug: z.string().optional(),
        preset: z.enum(["chess_like", "stable", "volatile_party", "foosball_2v2"]).optional(),
        formatDefault: z.enum(["1v1", "2v2", "nvn"]).optional(),
        /** 默认每队人数 1–5（产品上限 5；行级可覆盖） */
        defaultTeamSize: z.number().int().min(1).max(5).optional(),
        rules: z
          .object({
            k_factor: z.number().min(1).max(64).optional(),
            start_rating: z.number().min(0).max(5000).optional(),
            allow_draw: z.boolean().optional(),
            k_provisional: z.number().min(1).max(128).optional(),
            provisional_games: z.number().min(0).max(100).optional(),
            rating_floor: z.number().min(0).nullable().optional(),
            rating_ceiling: z.number().min(0).nullable().optional(),
          })
          .optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("；") || "参数不正确";
      throw new BadRequestException(msg);
    }
    return this.ladders.create(ws, user.accountId, parsed.data);
  }

  @Get("workspaces/:ws/ladders")
  list(@Param("ws") ws: string, @CurrentUser() user: AuthUser) {
    return this.ladders.list(ws, user.accountId);
  }

  @Get("ladders/:id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ladders.get(id, user.accountId);
  }

  @Patch("ladders/:id/config")
  patchConfig(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = z
      .object({
        config: z.record(z.any()),
        accept_soft_warnings: z.boolean().optional(),
      })
      .parse(body);
    return this.ladders.patchConfig(id, user.accountId, input as never);
  }
}
