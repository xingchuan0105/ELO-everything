import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "member",
  "recorder",
  "viewer",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  /** Internal stable id; not shown in product UI */
  handle: text("handle").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: jsonb("settings").notNull().default({ members_can_record: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    role: workspaceRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.accountId] })],
);

export const ladders = pgTable(
  "ladders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    formatDefault: text("format_default").notNull().default("1v1"),
    maxTeamSize: integer("max_team_size").notNull().default(8),
    config: jsonb("config").notNull(),
    configVersion: integer("config_version").notNull().default(1),
    status: text("status").notNull().default("active"),
    rebuildStartedAt: timestamp("rebuild_started_at", { withTimezone: true }),
    rebuildMaxMatches: integer("rebuild_max_matches").notNull().default(5000),
    leaderboardVersion: integer("leaderboard_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("ladders_ws_slug").on(t.workspaceId, t.slug)],
);

/** 选手：积分赛参与者，不是登录账号 */
export const competitors = pgTable(
  "competitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: text("name").notNull(),
    /** 展示用队伍名（可选）；计分单元仍是选手本人 */
    teamName: text("team_name"),
    createdBy: uuid("created_by").references(() => accounts.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("competitors_ws_name").on(t.workspaceId, t.name)],
);

export const competitorRatings = pgTable(
  "competitor_ratings",
  {
    ladderId: uuid("ladder_id")
      .notNull()
      .references(() => ladders.id),
    competitorId: uuid("competitor_id")
      .notNull()
      .references(() => competitors.id),
    rating: numeric("rating", { precision: 12, scale: 4 }).notNull(),
    peakRating: numeric("peak_rating", { precision: 12, scale: 4 }).notNull(),
    gamesPlayed: integer("games_played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    provisional: boolean("provisional").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.ladderId, t.competitorId] })],
);

export const tierBands = pgTable("tier_bands", {
  id: uuid("id").defaultRandom().primaryKey(),
  ladderId: uuid("ladder_id")
    .notNull()
    .references(() => ladders.id),
  name: text("name").notNull(),
  minRating: numeric("min_rating", { precision: 12, scale: 4 }).notNull(),
  maxRating: numeric("max_rating", { precision: 12, scale: 4 }),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const playerRatings = pgTable(
  "player_ratings",
  {
    ladderId: uuid("ladder_id")
      .notNull()
      .references(() => ladders.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    rating: numeric("rating", { precision: 12, scale: 4 }).notNull(),
    peakRating: numeric("peak_rating", { precision: 12, scale: 4 }).notNull(),
    gamesPlayed: integer("games_played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    provisional: boolean("provisional").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.ladderId, t.accountId] })],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ladderId: uuid("ladder_id")
      .notNull()
      .references(() => ladders.id),
    format: text("format").notNull(),
    status: text("status").notNull().default("rated"),
    winnerSide: text("winner_side"),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull(),
    /** null for draft; assigned on publish (rated only) */
    sequenceNo: bigint("sequence_no", { mode: "number" }),
    configSnapshot: jsonb("config_snapshot").notNull(),
    computationHash: text("computation_hash"),
    zeroSum: boolean("zero_sum"),
    createdBy: uuid("created_by").references(() => accounts.id),
    title: text("title"),
    pairingProposalId: uuid("pairing_proposal_id"),
    pairingSessionId: uuid("pairing_session_id"),
    voidReason: text("void_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("matches_ladder_causal").on(t.ladderId, t.playedAt, t.sequenceNo),
    // unique rated sequence enforced in SQL migration 0002 (partial index)
  ],
);

export const matchParticipants = pgTable(
  "match_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id),
    accountId: uuid("account_id").references(() => accounts.id),
    competitorId: uuid("competitor_id").references(() => competitors.id),
    side: text("side").notNull(),
    score: integer("score"),
    ratingBefore: numeric("rating_before", { precision: 12, scale: 4 }),
    ratingAfter: numeric("rating_after", { precision: 12, scale: 4 }),
    delta: numeric("delta", { precision: 12, scale: 4 }),
    kEffective: numeric("k_effective", { precision: 12, scale: 4 }),
    expectedScore: numeric("expected_score", { precision: 12, scale: 8 }),
    actualScore: numeric("actual_score", { precision: 12, scale: 8 }),
  },
  (t) => [index("match_participants_match").on(t.matchId)],
);

export const ratingEvents = pgTable("rating_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  ladderId: uuid("ladder_id")
    .notNull()
    .references(() => ladders.id),
  matchId: uuid("match_id").references(() => matches.id),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ratingHistory = pgTable(
  "rating_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ladderId: uuid("ladder_id")
      .notNull()
      .references(() => ladders.id),
    accountId: uuid("account_id").references(() => accounts.id),
    competitorId: uuid("competitor_id").references(() => competitors.id),
    matchId: uuid("match_id").references(() => matches.id),
    rating: numeric("rating", { precision: 12, scale: 4 }).notNull(),
    delta: numeric("delta", { precision: 12, scale: 4 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rating_history_account").on(t.ladderId, t.accountId, t.recordedAt)],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseStatus: integer("response_status").notNull(),
    responseBody: jsonb("response_body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("idempotency_ws_key").on(t.workspaceId, t.key)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("tags_ws_name").on(t.workspaceId, t.name)],
);

export const taggings = pgTable(
  "taggings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("taggings_entity").on(t.entityType, t.entityId)],
);

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  body: text("body").notNull(),
  createdBy: uuid("created_by").references(() => accounts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pairingSessions = pgTable("pairing_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  ladderId: uuid("ladder_id")
    .notNull()
    .references(() => ladders.id),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => accounts.id),
  name: text("name"),
  format: text("format").notNull(),
  teamSize: integer("team_size").notNull(),
  pool: jsonb("pool").notNull(),
  policy: jsonb("policy").notNull(),
  policyPreset: text("policy_preset"),
  status: text("status").notNull().default("draft"),
  seed: bigint("seed", { mode: "number" }),
  matchesToEmit: integer("matches_to_emit").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pairingRules = pgTable("pairing_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => pairingSessions.id, { onDelete: "cascade" }),
  ruleType: text("rule_type").notNull(),
  hardness: text("hardness").notNull().default("hard"),
  accountIds: jsonb("account_ids").notNull(),
  weight: numeric("weight", { precision: 8, scale: 4 }),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pairingProposals = pgTable("pairing_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => pairingSessions.id, { onDelete: "cascade" }),
  seed: bigint("seed", { mode: "number" }).notNull(),
  rank: integer("rank").notNull(),
  totalCost: numeric("total_cost", { precision: 12, scale: 6 }).notNull(),
  body: jsonb("body").notNull(),
  engineVersion: text("engine_version").notNull().default("csp-1"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
