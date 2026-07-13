import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, respondents, responses, surveys } from "@/db/schema";
import {
  makeId,
  parseJson,
  readJsonObject,
  requireWorkspaceScope,
  routeError,
  stringifyJson,
  textValue,
} from "../_lib";

function toResponse(row: typeof responses.$inferSelect) {
  return {
    id: row.id,
    surveyId: row.surveyId,
    respondentId: row.respondentId,
    status: row.status,
    score: row.score,
    answers: parseJson(row.answersJson, {}),
    hiddenFields: parseJson(row.hiddenFieldsJson, {}),
    tags: parseJson(row.tagsJson, []),
    source: row.source,
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
      .from(responses)
      .where(eq(responses.workspaceId, scope.workspaceId))
      .orderBy(desc(responses.createdAt))
      .limit(250);
    return Response.json({ responses: rows.map(toResponse) });
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
    const surveyId = textValue(payload.surveyId);
    if (!surveyId) {
      return Response.json({ error: "survey_id_required" }, { status: 400 });
    }

    const db = await getDb();
    const [survey] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.workspaceId, scope.workspaceId)))
      .limit(1);
    if (!survey) {
      return Response.json({ error: "survey_not_found" }, { status: 404 });
    }

    const respondentPayload =
      payload.respondent && typeof payload.respondent === "object"
        ? (payload.respondent as Record<string, unknown>)
        : {};
    const respondentId = textValue(respondentPayload.id, makeId("respondent"));
    const [existingRespondent] = await db
      .select()
      .from(respondents)
      .where(and(eq(respondents.id, respondentId), eq(respondents.workspaceId, scope.workspaceId)))
      .limit(1);

    if (!existingRespondent) {
      await db.insert(respondents).values({
        id: respondentId,
        workspaceId: scope.workspaceId,
        email: textValue(respondentPayload.email),
        name: textValue(respondentPayload.name, "Anonymous"),
        attributesJson: stringifyJson(respondentPayload.attributes ?? {}),
      });
    }

    const score = typeof payload.score === "number" && Number.isFinite(payload.score) ? payload.score : null;
    const tags = score !== null && score <= 6 ? ["low-score", "needs-review"] : ["captured"];
    const [response] = await db
      .insert(responses)
      .values({
        id: makeId("response"),
        workspaceId: scope.workspaceId,
        surveyId,
        respondentId,
        status: textValue(payload.status, "completed"),
        score,
        answersJson: stringifyJson(payload.answers ?? {}),
        hiddenFieldsJson: stringifyJson(payload.hiddenFields ?? {}),
        tagsJson: stringifyJson(payload.tags ?? tags),
        source: textValue(payload.source, "api"),
      })
      .returning();

    await db.insert(auditLogs).values({
      id: makeId("audit"),
      workspaceId: scope.workspaceId,
      action: "response.created",
      actor: respondentId,
      detail: `${survey.name} response ${response.id}`,
    });

    return Response.json({ response: toResponse(response) }, { status: 201 });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
