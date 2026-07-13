"use client";

import { FormEvent, useMemo, useState } from "react";

type Question = {
  id: string;
  type?: string;
  title: string;
  description?: string;
  required?: boolean;
  options?: string[];
};

export function PublicSurveyForm({
  slug,
  name,
  completion,
  questions,
}: {
  slug: string;
  name: string;
  completion: string;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"ready" | "saving" | "success" | "error">("ready");
  const scoredQuestion = useMemo(
    () => questions.find((question) => ["nps", "csat", "ces", "rating"].includes(question.type ?? "")),
    [questions],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const response = await fetch(`/api/public/surveys/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        answers,
        score: scoredQuestion ? Number(answers[scoredQuestion.id]) : null,
        respondent: { email },
        source: "public-link",
      }),
    }).catch(() => null);

    setStatus(response?.ok ? "success" : "error");
  }

  if (status === "success") {
    return (
      <main className="public-survey-shell">
        <section className="public-survey-panel" aria-live="polite">
          <p className="eyebrow">FeedbackOS</p>
          <h1>{completion}</h1>
          <p>Your response was recorded.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="public-survey-shell">
      <section className="public-survey-panel">
        <p className="eyebrow">FeedbackOS survey</p>
        <h1>{name}</h1>
        <form onSubmit={submit}>
          {questions.map((question) => {
            const isScore = ["nps", "csat", "ces", "rating"].includes(question.type ?? "");
            return (
              <label className="public-survey-question" key={question.id}>
                <span>{question.title}</span>
                {question.description ? <small>{question.description}</small> : null}
                {question.options?.length ? (
                  <select
                    required={question.required}
                    value={answers[question.id] ?? ""}
                    onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                  >
                    <option value="">Choose one</option>
                    {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : isScore ? (
                  <input
                    type="number"
                    min="0"
                    max="10"
                    required={question.required}
                    value={answers[question.id] ?? ""}
                    onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                  />
                ) : (
                  <textarea
                    required={question.required}
                    maxLength={4000}
                    value={answers[question.id] ?? ""}
                    onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                  />
                )}
              </label>
            );
          })}
          <label className="public-survey-question">
            <span>Email (optional)</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button className="button primary" disabled={status === "saving"} type="submit">
            {status === "saving" ? "Saving..." : "Submit response"}
          </button>
          {status === "error" ? <p role="alert">This response could not be saved. Please try again.</p> : null}
        </form>
      </section>
    </main>
  );
}
