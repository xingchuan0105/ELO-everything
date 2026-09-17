import { Body, Controller, Get, Param, Post, UseGuards, Inject} from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, CurrentUser, type AuthUser } from "../common/auth.guard.js";
import { PairingService } from "./pairing.service.js";

@Controller()
@UseGuards(AuthGuard)
export class PairingController {
  constructor(@Inject(PairingService) private readonly pairing: PairingService) {}

  @Post("ladders/:id/pairing-sessions")
  create(@Param("id") ladderId: string, @CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = z
      .object({
        name: z.string().optional(),
        format: z.enum(["1v1", "2v2", "nvn"]),
        teamSize: z.number().int().min(1).max(8),
        pool: z.array(z.string().uuid()).min(2),
        policyPreset: z.enum(["fair", "strict_anti_farm", "party_fun", "swiss_like"]).optional(),
        matchesToEmit: z.number().int().positive().optional(),
        rules: z
          .array(
            z.object({
              ruleType: z.enum([
                "must_team",
                "cannot_team",
                "cannot_oppose",
                "must_oppose",
                "prefer_team",
                "prefer_oppose",
                "locked_side",
              ]),
              hardness: z.enum(["hard", "soft"]).optional(),
              accountIds: z.array(z.string().uuid()).min(1),
              weight: z.number().optional(),
            }),
          )
          .optional(),
      })
      .parse(body);
    return this.pairing.createSession(ladderId, user.accountId, input);
  }

  @Get("pairing-sessions/:id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.pairing.getSession(id, user.accountId);
  }

  @Post("pairing-sessions/:id/generate")
  generate(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = z.object({ seed: z.number().int().optional() }).parse(body ?? {});
    return this.pairing.generate(id, user.accountId, input.seed);
  }

  @Post("pairing-sessions/:id/proposals/:pid/confirm")
  confirm(
    @Param("id") id: string,
    @Param("pid") pid: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pairing.confirm(id, pid, user.accountId);
  }
}
