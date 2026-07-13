import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { surveys } from "@/db/schema";
import { parseJson, requirePublicClientKey, routeError, sanitizeScopeValue } from "../../../../_lib";

function toClientSurvey(row: typeof surveys.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    type: row.channel,
    questions: parseJson(row.questionsJson, []),
    hiddenFields: parseJson(row.hiddenFieldsJson, {}),
    styling: parseJson(row.stylingJson, {}),
    trigger: row.trigger,
    audience: row.audience,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ environmentId: string }> },
) {
  try {
    const { environmentId } = await params;
    const workspaceId = sanitizeScopeValue(environmentId);
    if (!workspaceId) {
      return Response.json({ error: "environment_id_invalid" }, { status: 400 });
    }
    const publicKeyError = await requirePublicClientKey(_request, workspaceId);
    if (publicKeyError) return publicKeyError;

    const db = await getDb();
    const surveyRows = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.workspaceId, workspaceId), eq(surveys.status, "published")))
      .orderBy(desc(surveys.createdAt))
      .limit(100);

    return Response.json({
      actionClasses: surveyRows.map((survey) => ({
        id: `action-${survey.id}`,
        name: survey.trigger,
        type: "code",
      })),
      displays: [],
      segments: surveyRows.map((survey) => ({
        id: `segment-${survey.id}`,
        title: survey.audience,
      })),
      surveys: surveyRows.map(toClientSurvey),
      project: {
        id: environmentId,
        mode: "feedbackos-production-api",
      },
      recaptchaSiteKey: null,
    });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
