import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export async function GET() {
  try {
    await getDb().execute(sql`SELECT 1`);
    return Response.json({ status: "ready", database: "ok" });
  } catch (error) {
    const diagnostic =
      typeof process !== "undefined" && process.env.NEXCUS_DIAGNOSTICS === "1"
        ? {
            errorName: error instanceof Error ? error.name : "unknown",
            errorCode:
              typeof error === "object" && error !== null && "code" in error
                ? String(error.code).slice(0, 40)
                : "unknown",
          }
        : undefined;
    return Response.json(
      { status: "not_ready", database: "unavailable", ...(diagnostic ? { diagnostic } : {}) },
      { status: 503 },
    );
  }
}
