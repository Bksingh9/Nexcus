import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sdkEvents } from "@/db/schema";
import {
  makeId,
  parseJson,
  readJsonObject,
  requirePublicClientKey,
  requireWorkspaceScope,
  routeError,
  rateLimit,
  sanitizeScopeValue,
  stringifyJson,
  textValue,
} from "../../../_lib";

function toSdkEvent(row: typeof sdkEvents.$inferSelect) {
  return {
    id: row.id,
    eventType: row.eventType,
    environmentId: row.environmentId,
    userId: row.userId,
    payload: parseJson(row.payloadJson, {}),
    createdAt: row.createdAt,
  };
}

export async function GET(request: Request) {
  const scope = await requireWorkspaceScope(request);
  if ("response" in scope) return scope.response;

  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(sdkEvents)
      .where(eq(sdkEvents.workspaceId, scope.workspaceId))
      .orderBy(desc(sdkEvents.createdAt))
      .limit(100);
    return Response.json({ events: rows.map(toSdkEvent) });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(request, "sdk-events", 120);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate_limited", message: "Too many SDK events. Retry later." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  try {
    const payload = await readJsonObject(request);
    const context =
      payload.context && typeof payload.context === "object"
        ? (payload.context as Record<string, unknown>)
        : {};
    const eventType = textValue(payload.type, "sdk.event");
    const contextEnvironmentId = sanitizeScopeValue(context.environmentId);
    const headerEnvironmentId = sanitizeScopeValue(request.headers.get("x-feedbackos-environment-id"));
    if (contextEnvironmentId && headerEnvironmentId && contextEnvironmentId !== headerEnvironmentId) {
      return Response.json({ error: "environment_id_mismatch" }, { status: 403 });
    }
    const workspaceId = contextEnvironmentId || headerEnvironmentId;
    if (!workspaceId) {
      return Response.json({ error: "environment_id_required" }, { status: 400 });
    }
    const publicKeyError = await requirePublicClientKey(request, workspaceId);
    if (publicKeyError) return publicKeyError;

    const db = await getDb();
    const [event] = await db
      .insert(sdkEvents)
      .values({
        id: textValue(payload.id, makeId("sdk-event")),
        workspaceId,
        eventType,
        environmentId: textValue(context.environmentId),
        userId: textValue(context.userId),
        payloadJson: stringifyJson(payload),
      })
      .returning();

    return Response.json({ event: toSdkEvent(event) }, { status: 201 });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
