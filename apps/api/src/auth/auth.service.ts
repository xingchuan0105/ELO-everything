import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { accounts, sessions, users, workspaceMembers, workspaces, type Db } from "@elo/db";
import { DB } from "../common/db.module.js";

@Injectable()
export class AuthService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** 产品用户注册：仅邮箱+密码。自动建账号与默认工作台。 */
  async register(input: { email: string; password: string; displayName?: string }) {
    const email = input.email.toLowerCase().trim();
    const existing = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) throw new ConflictException("该邮箱已注册");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const displayName =
      input.displayName?.trim() || email.split("@")[0] || "记录员";
    // internal handle never shown in UI
    const handle = `u_${randomBytes(8).toString("hex")}`;

    const [user] = await this.db
      .insert(users)
      .values({ email, passwordHash, displayName })
      .returning();
    const [account] = await this.db
      .insert(accounts)
      .values({ userId: user!.id, handle })
      .returning();

    const slug = `ws-${randomBytes(4).toString("hex")}`;
    const [ws] = await this.db
      .insert(workspaces)
      .values({ name: "我的赛事", slug })
      .returning();
    await this.db.insert(workspaceMembers).values({
      workspaceId: ws!.id,
      accountId: account!.id,
      role: "owner",
    });

    const token = await this.createSession(user!.id);
    return {
      token,
      user: {
        userId: user!.id,
        accountId: account!.id,
        email: user!.email,
        displayName: user!.displayName,
        workspaceId: ws!.id,
      },
    };
  }

  async login(email: string, password: string) {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    const user = rows[0];
    if (!user) throw new UnauthorizedException("邮箱或密码不正确");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("邮箱或密码不正确");
    const acc = await this.db.select().from(accounts).where(eq(accounts.userId, user.id)).limit(1);
    const token = await this.createSession(user.id);
    return {
      token,
      user: {
        userId: user.id,
        accountId: acc[0]!.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  async logout(token: string | undefined) {
    if (!token) return;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await this.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  private async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 86400000);
    await this.db.insert(sessions).values({ userId, tokenHash, expiresAt });
    return token;
  }
}
