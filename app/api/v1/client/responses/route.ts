import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, integrationEvents, respondents, responses, surveys } from "@/db/schema";
import {
  makeId,
  rateLimit,
  readJsonObject,
  requirePublicClientKey,
  routeError,
  sanitizeScopeValue,
  stringifyJson,
  textValue,
} from "../../../_lib";

const MAX_ANSWER_LENGTH = 4_000;

function boundedText(value: unknown, fallback = "") {
  const text = textValue(value, fallback);
  return text.length <= MAX_ANSWER_LENGTH ? text : text.slice(0, MAX_ANSWER_LENGTH);
}

function answerMap(value: unknown, questions: Array<{ id?: unknown; type?: unknown }>) {
  const questionIds = new Set(questions.map((question) => (typeof question.id === "string" ? question.id : "")));
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!questionIds.has(key)) continue;
    if (typeof rawValue === "string") result[key] = boundedText(rawValue);
    else if (typeof rawValue === "number" || typeof rawValue === "boolean") result[key] = String(rawValue);
  }
  const comment = (value as Record<string, unknown>).comment;
  if (typeof comment === "string" && !result.comment) {
    const openQuestion = questions.find(
      (question) => typeof question.id === "string" && ["short", "long"].includes(String(question.type)),
    );
    const openQuestionId = typeof openQuestion?.id === "string" ? openQuestion.id : "";
    if (openQuestionId && !result[openQuestionId]) result[openQuestionId] = boundedText(comment);
  }
  return result;
}

export async function POST(request: Request) {
  const limit = rateLimit(request, "public-responses", 30);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate_limited", message: "Too many responses. Retry later." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  try {
    const payload = await readJsonObject(request, 128 * 1024);
    const context = payload.context && typeof payload.context === "object" && !Array.isArray(payload.context)
      ? (payload.context as Record<string, unknown>)
      : {};
    const workspaceId = sanitizeScopeValue(
      context.environmentId ?? request.headers.get("x-feedbackos-environment-id"),
    );
    const surveyId = textValue(payload.surveyId);
    if (!workspaceId) return Response.json({ error: "environment_id_required" }, { status: 400 });
    if (!surveyId) return Response.json({ error: "survey_id_required" }, { status: 400 });
    const publicKeyError = await requirePublicClientKey(request, workspaceId);
    if (publicKeyError) return publicKeyError;

    const db = await getDb();
    const [survey] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.workspaceId, workspaceId)))
      .limit(1);
    if (!survey || survey.status !== "published") {
      return Response.json({ error: "survey_unavailable" }, { status: 404 });
    }

    const questions = JSON.parse(survey.questionsJson) as Array<{ id?: unknown }>;
    const answers = answerMap(payload.answers, questions);
    const respondentPayload = payload.respondent && typeof payload.respondent === "object" && !Array.isArray(payload.respondent)
      ? (payload.respondent as Record<string, unknown>)
      : {};
    const respondentId = makeId("respondent");
    const email = boundedText(respondentPayload.email).slice(0, 320);
    const name = boundedText(respondentPayload.name, "Anonymous").slice(0, 200);
    const attributes = respondentPayload.attributes && typeof respondentPayload.attributes === "object"
      ? respondentPayload.attributes
      : {};

    await db.insert(respondents).values({
      id: respondentId,
      workspaceId,
      email,
      name,
      attributesJson: stringifyJson(attributes),
    });

    const rawScore = payload.score;
    const score = typeof rawScore === "number" && Number.isFinite(rawScore) && rawScore >= 0 && rawScore <= 10 ? rawScore : null;
    const responseId = makeId("response");
    await db.insert(responses).values({
      id: responseId,
      workspaceId,
      surveyId,
      respondentId,
      status: "completed",
      score,
      answersJson: stringifyJson(answers),
      hiddenFieldsJson: stringifyJson(payload.hiddenFields ?? {}),
      tagsJson: stringifyJson(score !== null && score <= 6 ? ["low-score"] : ["captured"]),
      source: textValue(payload.source, "public-sdk"),
    });

    await db.insert(integrationEvents).values({
      id: makeId("integration-event"),
      workspaceId,
      integration: "webhooks",
      eventType: "response.created",
      status: "prepared",
      responseId,
      payloadJson: stringifyJson({ surveyId, responseId, respondentId, score, answers }),
    });
    await db.insert(auditLogs).values({
      id: makeId("audit"),
      workspaceId,
      action: "response.created",
      actor: "public-respondent",
      detail: `Response ${responseId} submitted to survey ${surveyId}`,
    });

    return Response.json({ responseId, status: "completed" }, { status: 201 });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
