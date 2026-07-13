import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { surveys } from "@/db/schema";
import { PublicSurveyForm } from "./PublicSurveyForm";

export default async function PublicSurveyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let survey:
    | {
        id: string;
        name: string;
        completion: string;
        questionsJson: string;
      }
    | undefined;
  try {
    const db = await getDb();
    [survey] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.slug, slug), eq(surveys.status, "published")))
      .limit(1);
  } catch {
    return <main className="public-survey-shell"><section className="public-survey-panel"><h1>Survey unavailable</h1><p>Connect the database before accepting responses.</p></section></main>;
  }

  if (!survey) return <main className="public-survey-shell"><section className="public-survey-panel"><h1>Survey unavailable</h1><p>This survey is not published.</p></section></main>;

  let questions: Array<{ id: string; type?: string; title: string; description?: string; required?: boolean; options?: string[] }>;
  try {
    questions = JSON.parse(survey.questionsJson) as Array<{ id: string; type?: string; title: string; description?: string; required?: boolean; options?: string[] }>;
  } catch {
    return <main className="public-survey-shell"><section className="public-survey-panel"><h1>Survey unavailable</h1><p>This survey configuration is invalid.</p></section></main>;
  }

  return <PublicSurveyForm slug={slug} name={survey.name} completion={survey.completion} questions={questions} />;
}
