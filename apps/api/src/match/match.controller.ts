import { Body, Controller, Delete, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, CurrentUser, type AuthUser } from "../common/auth.guard.js";
import { MatchService } from "./match.service.js";

const matchBody = z.object({
  format: z.enum(["1v1", "2v2", "nvn"]).default("1v1"),
  winnerSide: z.enum(["A", "B", "draw"]),
  playedAt: z.string().datetime().optional(),
  sideA: z.array(z.string().uuid()).min(1),
  sideB: z.array(z.string().uuid()).min(1),
  scoreA: z.number().int().optional().nullable(),
  scoreB: z.number().int().optional().nullable(),
  title: z.string().optional(),
  pairingProposalId: z.string().uuid().optional(),
  pairingSessionId: z.string().uuid().optional(),
});

@Controller()
@UseGuards(AuthGuard)
export class MatchController {
  constructor(@Inject(MatchService) private readonly matches: MatchService) {}

  @Post("ladders/:id/matches/preview")
  preview(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.matches.preview(id, user.accountId, matchBody.parse(body));
  }

  /** 批量预览：按对局时间链式计分 */
  @Post("ladders/:id/matches/preview-batch")
  previewBatch(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = z.object({ items: z.array(matchBody).min(1).max(50) }).parse(body);
    return this.matches.previewBatch(id, user.accountId, input.items);
  }

  /** 保存草稿（确认=保存，不算分） */
  @Post("ladders/:id/matches/drafts")
  saveDrafts(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = z.object({ items: z.array(matchBody).min(1).max(50) }).parse(body);
    return this.matches.saveDrafts(id, user.accountId, input.items);
  }

  /** 发布草稿 → 更新排名（整批事务，失败全回滚） */
  @Post("ladders/:id/matches/publish")
  publish(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = z
      .object({ matchIds: z.array(z.string().uuid()).optional() })
      .parse(body ?? {});
    return this.matches.publishDrafts(id, user.accountId, input.matchIds);
  }

  @Get("ladders/:id/matches")
  list(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Query("status") status?: string,
  ) {
    if (status === "draft") return this.matches.listByStatus(id, user.accountId, "draft");
    return this.matches.listRecent(id, user.accountId);
  }

  @Get("matches/:id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.matches.get(id, user.accountId);
  }

  @Delete("matches/:id")
  deleteDraft(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.matches.deleteDraft(id, user.accountId);
  }

  @Post("matches/:id/void")
  voidMatch(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: unknown) {
    const { reason } = z.object({ reason: z.string().min(1).default("撤销") }).parse(body ?? {});
    return this.matches.voidMatch(id, user.accountId, reason);
  }

  @Post("ladders/:id/rebuild")
  async rebuild(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.matches.rebuild(id, user.accountId);
  }
}
