import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { workspaceMembers, workspaces, type Db } from "@elo/db";
import { DB } from "../common/db.module.js";

@Injectable()
export class WorkspaceService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(accountId: string, name: string, slug: string) {
    const [ws] = await this.db
      .insert(workspaces)
      .values({ name, slug: slug.toLowerCase() })
      .returning();
    await this.db.insert(workspaceMembers).values({
      workspaceId: ws!.id,
      accountId,
      role: "owner",
    });
    return ws;
  }

  async listForAccount(accountId: string) {
    const rows = await this.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.accountId, accountId));

    // Auto-provision default workspace for older accounts / empty membership
    if (rows.length === 0) {
      const slug = `ws-${Math.random().toString(36).slice(2, 10)}`;
      const created = await this.create(accountId, "我的赛事", slug);
      return [
        {
          id: created!.id,
          name: created!.name,
          slug: created!.slug,
          role: "owner" as const,
        },
      ];
    }
    return rows;
  }

  async requireMember(workspaceId: string, accountId: string) {
    const rows = await this.db
      .select()
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.accountId, accountId)),
      )
      .limit(1);
    if (!rows[0]) throw new NotFoundException();
    return rows[0];
  }

  async requireRole(
    workspaceId: string,
    accountId: string,
    roles: Array<"owner" | "admin" | "member" | "recorder" | "viewer">,
  ) {
    const m = await this.requireMember(workspaceId, accountId);
    if (!roles.includes(m.role as (typeof roles)[number])) {
      throw new ForbiddenException();
    }
    return m;
  }
}
