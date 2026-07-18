import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

function databaseUrl() {
  const value = typeof process !== "undefined" ? process.env.DATABASE_URL?.trim() : "";
  if (!value) {
    throw new Error("DATABASE_URL is not configured. Nexcus production requires PostgreSQL.");
  }
  return value;
}

export function getDb() {
  if (!database) {
    client ??= postgres(databaseUrl(), {
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
    database = drizzle(client, { schema });
  }
  return database;
}
