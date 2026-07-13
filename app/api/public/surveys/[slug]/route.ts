import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { surveys } from "@/db/schema";
import { publicApiKeyForWorkspace, readJsonObject, routeError } from "../../../_lib";
import { POST as savePublicResponse } from "../../../v1/client/responses/route";

async function findPublishedSurvey(slug: string) {
  const db = await getDb();
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.slug, slug), eq(surveys.status, "published")))
    .limit(1);
  return survey;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const survey = await findPublishedSurvey(slug);
    if (!survey) return Response.json({ error: "survey_not_found" }, { status: 404 });
    return Response.json({
      survey: {
        id: survey.id,
        name: survey.name,
        questions: JSON.parse(survey.questionsJson),
        styling: JSON.parse(survey.stylingJson),
        completion: survey.completion,
      },
    });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const survey = await findPublishedSurvey(slug);
    if (!survey) return Response.json({ error: "survey_not_found" }, { status: 404 });
    const payload = await readJsonObject(request, 128 * 1024);
    const context = payload.context && typeof payload.context === "object" && !Array.isArray(payload.context)
      ? (payload.context as Record<string, unknown>)
      : {};
    const forwarded = new Request(request.url, {
      method: "POST",
        headers: new Headers({
          "content-type": "application/json",
          "cf-connecting-ip": request.headers.get("cf-connecting-ip") ?? "unknown",
          "x-api-key": await publicApiKeyForWorkspace(survey.workspaceId),
        }),
      body: JSON.stringify({
        ...payload,
        surveyId: survey.id,
        context: { ...context, environmentId: survey.workspaceId },
      }),
    });
    return savePublicResponse(forwarded);
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
