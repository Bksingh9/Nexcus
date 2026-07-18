import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required to run Nexcus migrations.");

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

try {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`
    CREATE TABLE IF NOT EXISTS nexcus_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const directory = new URL("../db/migrations/", import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const [applied] = await sql`SELECT id FROM nexcus_migrations WHERE id = ${file}`;
    if (applied) continue;
    const migration = await readFile(fileURLToPath(new URL(file, directory)), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`INSERT INTO nexcus_migrations (id) VALUES (${file})`;
    });
    console.log(`Applied ${file}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
