import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, surveys } from "@/db/schema";
import {
  readJsonObject,
  makeId,
  requireWorkspaceScope,
  routeError,
  stringifyJson,
  textValue,
} from "../../_lib";

function toSurvey(row: typeof surveys.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    channel: row.channel,
    status: row.status,
    audience: row.audience,
    trigger: row.trigger,
    completion: row.completion,
    questions: JSON.parse(row.questionsJson) as unknown[],
    hiddenFields: JSON.parse(row.hiddenFieldsJson) as Record<string, unknown>,
    styling: JSON.parse(row.stylingJson) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> },
) {
  const scope = await requireWorkspaceScope(request);
  if ("response" in scope) return scope.response;

  try {
    const { surveyId } = await params;
    const payload = await readJsonObject(request);
    const db = await getDb();
    const [existing] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.workspaceId, scope.workspaceId)))
      .limit(1);
    if (!existing) return Response.json({ error: "survey_not_found" }, { status: 404 });

    const nextStatus = textValue(payload.status, existing.status);
    if (!["draft", "published", "paused"].includes(nextStatus)) {
      return Response.json({ error: "invalid_status" }, { status: 400 });
    }
    const nextName = textValue(payload.name, existing.name);
    if (!nextName) return Response.json({ error: "name_required" }, { status: 400 });
    const nextSlug = textValue(payload.slug, existing.slug).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!nextSlug) return Response.json({ error: "slug_required" }, { status: 400 });

    const [updated] = await db
      .update(surveys)
      .set({
        name: nextName,
        slug: nextSlug,
        channel: textValue(payload.channel, existing.channel),
        status: nextStatus,
        audience: textValue(payload.audience, existing.audience),
        trigger: textValue(payload.trigger, existing.trigger),
        completion: textValue(payload.completion, existing.completion),
        questionsJson: payload.questions === undefined ? existing.questionsJson : stringifyJson(payload.questions),
        hiddenFieldsJson: payload.hiddenFields === undefined ? existing.hiddenFieldsJson : stringifyJson(payload.hiddenFields),
        stylingJson: payload.styling === undefined ? existing.stylingJson : stringifyJson(payload.styling),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(surveys.id, surveyId), eq(surveys.workspaceId, scope.workspaceId)))
      .returning();

    await db.insert(auditLogs).values({
      id: makeId("audit"),
      workspaceId: scope.workspaceId,
      action: "survey.updated",
      actor: scope.principal.email,
      detail: `${surveyId} changed`,
    });
    return Response.json({ survey: toSurvey(updated) });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
