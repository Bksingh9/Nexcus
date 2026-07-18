import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { createSessionToken, rateLimit, readJsonObject, routeError, sessionCookieHeader } from "../../_lib";
import { normalizeEmail, verifyPassword } from "../_lib";

export async function POST(request: Request) {
  const limit = rateLimit(request, "auth-login", 10);
  if (!limit.allowed) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });

  try {
    const payload = await readJsonObject(request, 16 * 1024);
    const email = normalizeEmail(payload.email);
    const password = typeof payload.password === "string" ? payload.password : "";
    const [account] = email ? await getDb().select().from(accounts).where(eq(accounts.email, email)).limit(1) : [];
    if (!account || !(await verifyPassword(password, account.passwordHash))) {
      return Response.json({ error: "invalid_credentials", message: "Email or password is incorrect." }, { status: 401 });
    }

    const token = await createSessionToken({ email: account.email, displayName: account.displayName });
    return Response.json(
      { user: { email: account.email, displayName: account.displayName }, workspaceId: account.workspaceId },
      { status: 200, headers: { "set-cookie": sessionCookieHeader(request, token) } },
    );
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
