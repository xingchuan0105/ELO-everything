import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL ?? "postgresql://elo:elo@localhost:5432/elo_everything";
  const sql = postgres(url, { max: 1 });
  const dir = join(__dirname, "..", "drizzle");
  let files: string[] = [];
  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    console.error("No drizzle migrations found. Run: pnpm --filter @elo/db generate");
    process.exit(1);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS _elo_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  for (const file of files) {
    const applied = await sql`SELECT 1 FROM _elo_migrations WHERE id = ${file}`;
    if (applied.length) {
      console.log("skip", file);
      continue;
    }
    const body = readFileSync(join(dir, file), "utf8");
    console.log("apply", file);
    await sql.unsafe(body);
    await sql`INSERT INTO _elo_migrations (id) VALUES (${file})`;
  }

  await sql.end();
  console.log("migrations done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
