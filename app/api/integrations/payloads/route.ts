import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { integrationEvents } from "@/db/schema";
import {
  makeId,
  parseJson,
  readJsonObject,
  requireWorkspaceScope,
  routeError,
  stringifyJson,
  textValue,
} from "../../_lib";

function toIntegrationEvent(row: typeof integrationEvents.$inferSelect) {
  return {
    id: row.id,
    integration: row.integration,
    eventType: row.eventType,
    status: row.status,
    responseId: row.responseId,
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
      .from(integrationEvents)
      .where(eq(integrationEvents.workspaceId, scope.workspaceId))
      .orderBy(desc(integrationEvents.createdAt))
      .limit(100);
    return Response.json({ payloads: rows.map(toIntegrationEvent) });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}

export async function POST(request: Request) {
  const scope = await requireWorkspaceScope(request);
  if ("response" in scope) return scope.response;

  try {
    const payload = await readJsonObject(request);
    const integration = textValue(payload.integration);
    const eventType = textValue(payload.eventType, "response.created");
    if (!integration) {
      return Response.json({ error: "integration_required" }, { status: 400 });
    }

    const db = await getDb();
    const [event] = await db
      .insert(integrationEvents)
      .values({
        id: makeId("integration-event"),
        workspaceId: scope.workspaceId,
        integration,
        eventType,
        status: "prepared",
        responseId: textValue(payload.responseId) || null,
        payloadJson: stringifyJson(payload.payload ?? {}),
      })
      .returning();

    return Response.json({ payload: toIntegrationEvent(event) }, { status: 201 });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
