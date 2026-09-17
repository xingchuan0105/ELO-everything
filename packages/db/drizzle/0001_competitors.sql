-- Competitors (players in a league) are NOT login users.
CREATE TABLE IF NOT EXISTS "competitors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "name" text NOT NULL,
  "created_by" uuid REFERENCES "accounts"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "competitors_ws_name" ON "competitors" ("workspace_id", "name");

-- New rating table keyed by competitor
CREATE TABLE IF NOT EXISTS "competitor_ratings" (
  "ladder_id" uuid NOT NULL REFERENCES "ladders"("id"),
  "competitor_id" uuid NOT NULL REFERENCES "competitors"("id"),
  "rating" numeric(12, 4) NOT NULL,
  "peak_rating" numeric(12, 4) NOT NULL,
  "games_played" integer DEFAULT 0 NOT NULL,
  "wins" integer DEFAULT 0 NOT NULL,
  "losses" integer DEFAULT 0 NOT NULL,
  "draws" integer DEFAULT 0 NOT NULL,
  "provisional" boolean DEFAULT true NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("ladder_id", "competitor_id")
);

-- Match participants: prefer competitor_id; account_id becomes optional
ALTER TABLE "match_participants" ALTER COLUMN "account_id" DROP NOT NULL;
ALTER TABLE "match_participants" ADD COLUMN IF NOT EXISTS "competitor_id" uuid REFERENCES "competitors"("id");
CREATE INDEX IF NOT EXISTS "match_participants_competitor" ON "match_participants" ("competitor_id");

ALTER TABLE "rating_history" ALTER COLUMN "account_id" DROP NOT NULL;
ALTER TABLE "rating_history" ADD COLUMN IF NOT EXISTS "competitor_id" uuid REFERENCES "competitors"("id");
