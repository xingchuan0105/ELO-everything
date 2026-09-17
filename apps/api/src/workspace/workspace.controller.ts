import { Body, Controller, Get, Post, UseGuards, Inject} from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, CurrentUser, type AuthUser } from "../common/auth.guard.js";
import { WorkspaceService } from "./workspace.service.js";

@Controller("workspaces")
@UseGuards(AuthGuard)
export class WorkspaceController {
  constructor(@Inject(WorkspaceService) private readonly workspaces: WorkspaceService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.workspaces.listForAccount(user.accountId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = z
      .object({
        name: z.string().min(1),
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      })
      .parse(body);
    return this.workspaces.create(user.accountId, input.name, input.slug);
  }
}
