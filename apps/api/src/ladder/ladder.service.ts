import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { ladders, type Db } from "@elo/db";
import {
  CONFIG_PRESETS,
  type ConfigPresetId,
  type RatingConfig,
  validateRatingConfig,
  DEFAULT_CONFIG,
} from "@elo/rating-engine";
import { DB } from "../common/db.module.js";
import { WorkspaceService } from "../workspace/workspace.service.js";

export type CreateLadderInput = {
  name: string;
  slug?: string;
  preset?: ConfigPresetId;
  formatDefault?: string;
  /** 默认每队人数 1–5；同时写入 config.default_team_size */
  defaultTeamSize?: number;
  /** 用户可自设的规则（覆盖 preset） */
  rules?: {
    k_factor?: number;
    start_rating?: number;
    allow_draw?: boolean;
    k_provisional?: number;
    provisional_games?: number;
    rating_floor?: number | null;
    rating_ceiling?: number | null;
  };
};

function formatFromTeamSize(n: number): "1v1" | "2v2" | "nvn" {
  if (n <= 1) return "1v1";
  if (n === 2) return "2v2";
  return "nvn";
}

@Injectable()
export class LadderService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(WorkspaceService) private readonly workspaces: WorkspaceService,
  ) {}

  async create(workspaceId: string, accountId: string, input: CreateLadderInput) {
    await this.workspaces.requireRole(workspaceId, accountId, ["owner", "admin"]);
    const base = input.preset ? { ...CONFIG_PRESETS[input.preset] } : { ...DEFAULT_CONFIG };
    const teamSize = Math.min(5, Math.max(1, input.defaultTeamSize ?? 1));
    const formatDefault =
      input.formatDefault ?? formatFromTeamSize(teamSize);
    const config: RatingConfig & { default_team_size?: number } = {
      ...base,
      ...(input.rules?.k_factor != null ? { k_factor: input.rules.k_factor } : {}),
      ...(input.rules?.start_rating != null ? { start_rating: input.rules.start_rating } : {}),
      ...(input.rules?.allow_draw != null ? { allow_draw: input.rules.allow_draw } : {}),
      ...(input.rules?.k_provisional != null ? { k_provisional: input.rules.k_provisional } : {}),
      ...(input.rules?.provisional_games != null
        ? { provisional_games: input.rules.provisional_games }
        : {}),
      ...(input.rules && "rating_floor" in input.rules
        ? { rating_floor: input.rules.rating_floor ?? null }
        : {}),
      ...(input.rules && "rating_ceiling" in input.rules
        ? { rating_ceiling: input.rules.rating_ceiling ?? null }
        : {}),
      default_team_size: teamSize,
    };
    // keep provisional >= k
    if (config.k_provisional < config.k_factor) {
      config.k_provisional = config.k_factor;
    }

    const v = validateRatingConfig(config);
    if (!v.ok) {
      throw new BadRequestException(v.errors.map((e) => e.message).join("；") || "规则不合法");
    }

    const slug = this.normalizeSlug(input.slug, input.name);

    const [ladder] = await this.db
      .insert(ladders)
      .values({
        workspaceId,
        name: input.name.trim(),
        slug,
        formatDefault,
        maxTeamSize: 5, // 产品上限 N≤5
        config,
      })
      .returning();
    return ladder;
  }

  private normalizeSlug(raw: string | undefined, name: string): string {
    const fromClient = (raw ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (fromClient.length >= 2) {
      return `${fromClient.slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const asciiHint = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20);
    const base = asciiHint.length >= 2 ? asciiHint : "event";
    return `${base}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async list(workspaceId: string, accountId: string) {
    await this.workspaces.requireMember(workspaceId, accountId);
    return this.db.select().from(ladders).where(eq(ladders.workspaceId, workspaceId));
  }

  async get(ladderId: string, accountId: string) {
    const ladder = await this.getRaw(ladderId);
    await this.workspaces.requireMember(ladder.workspaceId, accountId);
    return ladder;
  }

  async getRaw(ladderId: string) {
    const rows = await this.db.select().from(ladders).where(eq(ladders.id, ladderId)).limit(1);
    if (!rows[0]) throw new NotFoundException();
    return rows[0];
  }

  async patchConfig(
    ladderId: string,
    accountId: string,
    body: { config: RatingConfig; accept_soft_warnings?: boolean },
  ) {
    const ladder = await this.get(ladderId, accountId);
    await this.workspaces.requireRole(ladder.workspaceId, accountId, ["owner", "admin"]);
    const v = validateRatingConfig(body.config);
    if (!v.ok) throw new BadRequestException({ errors: v.errors });
    if (v.warnings.length && !body.accept_soft_warnings) {
      throw new BadRequestException({
        code: "SOFT_WARNINGS",
        warnings: v.warnings,
        message: "请确认规则警告后重试",
      });
    }
    const [updated] = await this.db
      .update(ladders)
      .set({
        config: body.config,
        configVersion: ladder.configVersion + 1,
      })
      .where(eq(ladders.id, ladderId))
      .returning();
    return { ladder: updated, warnings: v.warnings };
  }
}
