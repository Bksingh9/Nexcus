import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, surveys } from "@/db/schema";
import {
  makeId,
  readJsonObject,
  requireWorkspaceScope,
  routeError,
  stringifyJson,
  textValue,
} from "../_lib";

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

export async function GET(request: Request) {
  const scope = await requireWorkspaceScope(request);
  if ("response" in scope) return scope.response;

  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(surveys)
      .where(eq(surveys.workspaceId, scope.workspaceId))
      .orderBy(desc(surveys.createdAt))
      .limit(100);
    return Response.json({ surveys: rows.map(toSurvey) });
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
    const name = textValue(payload.name, "Untitled survey");
    const slug = textValue(payload.slug, name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
    const channel = textValue(payload.channel, "link");
    const questions = Array.isArray(payload.questions)
      ? payload.questions
      : [
          {
            id: makeId("question"),
            type: "Open Text",
            title: "What feedback do you have?",
            required: true,
          },
        ];

    if (!name) {
      return Response.json({ error: "name_required" }, { status: 400 });
    }

    const db = await getDb();
    const id = makeId("survey");
    const [survey] = await db
      .insert(surveys)
      .values({
        id,
        workspaceId: scope.workspaceId,
        name,
        slug: slug || id,
        channel,
        status: textValue(payload.status, "draft"),
        audience: textValue(payload.audience, "All users"),
        trigger: textValue(payload.trigger, "Manual link share"),
        completion: textValue(payload.completion, "Thanks for the feedback."),
        questionsJson: stringifyJson(questions),
        hiddenFieldsJson: stringifyJson(payload.hiddenFields ?? {}),
        stylingJson: stringifyJson(payload.styling ?? {}),
      })
      .returning();

    await db.insert(auditLogs).values({
      id: makeId("audit"),
      workspaceId: scope.workspaceId,
      action: "survey.created",
      actor: "api",
      detail: `${name} (${channel})`,
    });

    return Response.json({ survey: toSurvey(survey) }, { status: 201 });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
