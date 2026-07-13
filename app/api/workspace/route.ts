import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, integrationEvents, respondents, responses, surveys } from "@/db/schema";
import { parseJson, publicApiKeyForWorkspace, requireWorkspaceScope, routeError } from "../_lib";

export async function GET(request: Request) {
  const scope = await requireWorkspaceScope(request);
  if ("response" in scope) return scope.response;

  try {
    const db = await getDb();
    const [surveyRows, respondentRows, responseRows, integrationRows, auditRows] = await Promise.all([
      db
        .select()
        .from(surveys)
        .where(eq(surveys.workspaceId, scope.workspaceId))
        .orderBy(desc(surveys.createdAt))
        .limit(100),
      db
        .select()
        .from(respondents)
        .where(eq(respondents.workspaceId, scope.workspaceId))
        .orderBy(desc(respondents.createdAt))
        .limit(250),
      db
        .select()
        .from(responses)
        .where(eq(responses.workspaceId, scope.workspaceId))
        .orderBy(desc(responses.createdAt))
        .limit(250),
      db
        .select()
        .from(integrationEvents)
        .where(eq(integrationEvents.workspaceId, scope.workspaceId))
        .orderBy(desc(integrationEvents.createdAt))
        .limit(100),
      db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.workspaceId, scope.workspaceId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(100),
    ]);

    return Response.json({
      environmentId: scope.workspaceId,
      publicClientKey: await publicApiKeyForWorkspace(scope.workspaceId),
      surveys: surveyRows.map((survey) => ({
        ...survey,
        questions: parseJson(survey.questionsJson, []),
        hiddenFields: parseJson(survey.hiddenFieldsJson, {}),
        styling: parseJson(survey.stylingJson, {}),
      })),
      respondents: respondentRows.map((respondent) => ({
        ...respondent,
        attributes: parseJson(respondent.attributesJson, {}),
      })),
      responses: responseRows.map((response) => ({
        ...response,
        answers: parseJson(response.answersJson, {}),
        hiddenFields: parseJson(response.hiddenFieldsJson, {}),
        tags: parseJson(response.tagsJson, []),
      })),
      integrationPayloads: integrationRows.map((event) => ({
        ...event,
        payload: parseJson(event.payloadJson, {}),
      })),
      auditLogs: auditRows,
    });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
