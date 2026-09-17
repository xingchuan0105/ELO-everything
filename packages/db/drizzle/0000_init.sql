CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'member', 'recorder', 'viewer');

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "display_name" text NOT NULL,
  "avatar_url" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id"),
  "handle" text NOT NULL UNIQUE,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "settings" jsonb DEFAULT '{"members_can_record":true}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspace_members" (
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "role" "workspace_role" DEFAULT 'member' NOT NULL,
  "joined_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("workspace_id", "account_id")
);

CREATE TABLE IF NOT EXISTS "ladders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "format_default" text DEFAULT '1v1' NOT NULL,
  "max_team_size" integer DEFAULT 8 NOT NULL,
  "config" jsonb NOT NULL,
  "config_version" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "rebuild_started_at" timestamptz,
  "rebuild_max_matches" integer DEFAULT 5000 NOT NULL,
  "leaderboard_version" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ladders_ws_slug" ON "ladders" ("workspace_id", "slug");

CREATE TABLE IF NOT EXISTS "tier_bands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ladder_id" uuid NOT NULL REFERENCES "ladders"("id"),
  "name" text NOT NULL,
  "min_rating" numeric(12, 4) NOT NULL,
  "max_rating" numeric(12, 4),
  "color" text,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "player_ratings" (
  "ladder_id" uuid NOT NULL REFERENCES "ladders"("id"),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "rating" numeric(12, 4) NOT NULL,
  "peak_rating" numeric(12, 4) NOT NULL,
  "games_played" integer DEFAULT 0 NOT NULL,
  "wins" integer DEFAULT 0 NOT NULL,
  "losses" integer DEFAULT 0 NOT NULL,
  "draws" integer DEFAULT 0 NOT NULL,
  "provisional" boolean DEFAULT true NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("ladder_id", "account_id")
);

CREATE TABLE IF NOT EXISTS "matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ladder_id" uuid NOT NULL REFERENCES "ladders"("id"),
  "format" text NOT NULL,
  "status" text DEFAULT 'rated' NOT NULL,
  "winner_side" text,
  "played_at" timestamptz NOT NULL,
  "sequence_no" bigint NOT NULL,
  "config_snapshot" jsonb NOT NULL,
  "computation_hash" text,
  "zero_sum" boolean,
  "created_by" uuid REFERENCES "accounts"("id"),
  "title" text,
  "pairing_proposal_id" uuid,
  "pairing_session_id" uuid,
  "void_reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "matches_ladder_causal" ON "matches" ("ladder_id", "played_at", "sequence_no");
CREATE UNIQUE INDEX IF NOT EXISTS "matches_ladder_seq" ON "matches" ("ladder_id", "sequence_no");

CREATE TABLE IF NOT EXISTS "match_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL REFERENCES "matches"("id"),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "side" text NOT NULL,
  "score" integer,
  "rating_before" numeric(12, 4),
  "rating_after" numeric(12, 4),
  "delta" numeric(12, 4),
  "k_effective" numeric(12, 4),
  "expected_score" numeric(12, 8),
  "actual_score" numeric(12, 8)
);
CREATE INDEX IF NOT EXISTS "match_participants_match" ON "match_participants" ("match_id");

CREATE TABLE IF NOT EXISTS "rating_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ladder_id" uuid NOT NULL REFERENCES "ladders"("id"),
  "match_id" uuid REFERENCES "matches"("id"),
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "rating_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ladder_id" uuid NOT NULL REFERENCES "ladders"("id"),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "match_id" uuid REFERENCES "matches"("id"),
  "rating" numeric(12, 4) NOT NULL,
  "delta" numeric(12, 4) NOT NULL,
  "recorded_at" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "rating_history_account" ON "rating_history" ("ladder_id", "account_id", "recorded_at");

CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "key" text NOT NULL,
  "request_hash" text NOT NULL,
  "response_status" integer NOT NULL,
  "response_body" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_ws_key" ON "idempotency_keys" ("workspace_id", "key");

CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "name" text NOT NULL,
  "color" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "tags_ws_name" ON "tags" ("workspace_id", "name");

CREATE TABLE IF NOT EXISTS "taggings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id"),
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "taggings_entity" ON "taggings" ("entity_type", "entity_id");

CREATE TABLE IF NOT EXISTS "notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_by" uuid REFERENCES "accounts"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "pairing_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ladder_id" uuid NOT NULL REFERENCES "ladders"("id"),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "created_by" uuid NOT NULL REFERENCES "accounts"("id"),
  "name" text,
  "format" text NOT NULL,
  "team_size" integer NOT NULL,
  "pool" jsonb NOT NULL,
  "policy" jsonb NOT NULL,
  "policy_preset" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "seed" bigint,
  "matches_to_emit" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "pairing_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "pairing_sessions"("id") ON DELETE CASCADE,
  "rule_type" text NOT NULL,
  "hardness" text DEFAULT 'hard' NOT NULL,
  "account_ids" jsonb NOT NULL,
  "weight" numeric(8, 4),
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "pairing_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "pairing_sessions"("id") ON DELETE CASCADE,
  "seed" bigint NOT NULL,
  "rank" integer NOT NULL,
  "total_cost" numeric(12, 6) NOT NULL,
  "body" jsonb NOT NULL,
  "engine_version" text DEFAULT 'csp-1' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
