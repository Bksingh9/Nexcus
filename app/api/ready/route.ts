import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export async function GET() {
  try {
    await getDb().execute(sql`SELECT 1`);
    return Response.json({ status: "ready", database: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const diagnostic =
      typeof process !== "undefined" && process.env.NEXCUS_DIAGNOSTICS === "1"
        ? {
            hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
            errorName: error instanceof Error ? error.name : "unknown",
            errorCode:
              typeof error === "object" && error !== null && "code" in error
                ? String(error.code).slice(0, 40)
                : "unknown",
            category: message.includes("DATABASE_URL is not configured")
              ? "database_url_missing"
              : /ECONNREFUSED|ENOTFOUND|connection/i.test(message)
                ? "database_connection"
                : "database_query",
          }
        : undefined;
    return Response.json(
      { status: "not_ready", database: "unavailable", ...(diagnostic ? { diagnostic } : {}) },
      { status: 503 },
    );
  }
}
