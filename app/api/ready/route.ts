import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export async function GET() {
  try {
    await getDb().execute(sql`SELECT 1`);
    return Response.json({ status: "ready", database: "ok" });
  } catch {
    return Response.json({ status: "not_ready", database: "unavailable" }, { status: 503 });
  }
}
