-- Draft matches: sequence only unique among rated
DROP INDEX IF EXISTS "matches_ladder_seq";
ALTER TABLE "matches" ALTER COLUMN "sequence_no" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "matches_ladder_seq_rated"
  ON "matches" ("ladder_id", "sequence_no")
  WHERE status = 'rated';
