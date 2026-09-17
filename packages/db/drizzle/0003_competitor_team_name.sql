-- Optional display-only team name on competitor (not a rated entity)
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "team_name" text;
