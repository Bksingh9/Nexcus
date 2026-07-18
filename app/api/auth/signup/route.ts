import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import {
  createSessionToken,
  makeId,
  rateLimit,
  readJsonObject,
  routeError,
  sessionCookieHeader,
  textValue,
  workspaceIdForEmail,
} from "../../_lib";
import { hashPassword, normalizeEmail } from "../_lib";

export async function POST(request: Request) {
  const limit = rateLimit(request, "auth-signup", 5);
  if (!limit.allowed) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });

  try {
    const payload = await readJsonObject(request, 16 * 1024);
    const email = normalizeEmail(payload.email);
    const password = typeof payload.password === "string" ? payload.password : "";
    const displayName = textValue(payload.displayName, email.split("@")[0]).slice(0, 120);
    if (!email || password.length < 12 || password.length > 200 || !displayName) {
      return Response.json({ error: "invalid_signup", message: "Use a valid email, a 12-200 character password, and a display name." }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.email, email)).limit(1);
    if (existing.length) return Response.json({ error: "account_exists" }, { status: 409 });

    const workspaceId = await workspaceIdForEmail(email);
    try {
      await db.insert(accounts).values({
        id: makeId("account"),
        workspaceId,
        email,
        displayName,
        passwordHash: await hashPassword(password),
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return Response.json({ error: "account_exists" }, { status: 409 });
      }
      throw error;
    }

    const token = await createSessionToken({ email, displayName });
    return Response.json(
      { user: { email, displayName }, workspaceId },
      { status: 201, headers: { "set-cookie": sessionCookieHeader(request, token) } },
    );
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
