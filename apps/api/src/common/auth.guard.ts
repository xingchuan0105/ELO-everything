import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { accounts, sessions, users } from "@elo/db";
import type { Db } from "@elo/db";
import { Inject } from "@nestjs/common";
import { DB } from "./db.module.js";

export type AuthUser = {
  userId: string;
  accountId: string;
  email: string;
  displayName: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: Db) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.cookies?.elo_session as string | undefined;
    if (!token) throw new UnauthorizedException();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const rows = await this.db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        accountId: accounts.id,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .innerJoin(accounts, eq(accounts.userId, users.id))
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1);
    const row = rows[0];
    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException();
    }
    req.authUser = {
      userId: row.userId,
      accountId: row.accountId,
      email: row.email,
      displayName: row.displayName,
    } satisfies AuthUser;
    return true;
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.authUser as AuthUser;
});
