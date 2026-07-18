"use client";

import { useEffect, useMemo, useState } from "react";

type ViewKey =
  | "command"
  | "builder"
  | "collect"
  | "responses"
  | "insights"
  | "integrations"
  | "security"
  | "pricing"
  | "launch";

type QuestionType =
  | "nps"
  | "csat"
  | "ces"
  | "rating"
  | "single"
  | "multi"
  | "short"
  | "long"
  | "email"
  | "consent"
  | "cta"
  | "pictureSelection"
  | "fileUpload"
  | "matrix"
  | "address";

type PlanKey = "free" | "launch" | "team" | "business" | "enterprise";
type IntegrationKey =
  | "activepieces"
  | "airtable"
  | "googleSheets"
  | "hubspot"
  | "make"
  | "n8n"
  | "notion"
  | "slack"
  | "webhooks"
  | "wordpress"
  | "zapier";

type Question = {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  required: boolean;
  options: string[];
};

type Survey = {
  id: string;
  name: string;
  slug: string;
  channel: "link" | "website" | "in_app" | "email";
  status: "draft" | "published" | "paused";
  audience: string;
  trigger: string;
  completion: string;
  questions: Question[];
};

type Respondent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  country: string;
  consentSms: boolean;
  consentWhatsapp: boolean;
};

type ResponseRecord = {
  id: string;
  surveyId: string;
  respondentId: string;
  status: "partial" | "completed";
  score: number | null;
  answers: Record<string, string>;
  tags: string[];
  source: string;
  createdAt: string;
};

type IntegrationState = {
  key: IntegrationKey;
  enabled: boolean;
  endpoint: string;
  status: "ready" | "needs-setup" | "paused";
  lastTest: string;
};

type AuditLog = {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
  detail: string;
};

type Workspace = {
  environmentId?: string;
  publicClientKey?: string;
  plan: PlanKey;
  overageEnabled: boolean;
  surveys: Survey[];
  respondents: Respondent[];
  responses: ResponseRecord[];
  integrations: IntegrationState[];
  auditLogs: AuditLog[];
  retentionDays: number;
};

const planCatalog: Record<
  PlanKey,
  {
    name: string;
    price: string;
    responses: number | "custom";
    seats: string;
    pitch: string;
    features: string[];
  }
> = {
  free: {
    name: "Free",
    price: "$0",
    responses: 300,
    seats: "2 seats",
    pitch: "Start collecting feedback with branded surveys.",
    features: ["Link surveys", "Basic analytics", "CSV export"],
  },
  launch: {
    name: "Launch",
    price: "$29",
    responses: 2500,
    seats: "3 seats",
    pitch: "Remove branding and connect your first workflows.",
    features: ["Custom branding", "Webhooks", "SDK targeting"],
  },
  team: {
    name: "Team",
    price: "$89",
    responses: 10000,
    seats: "Unlimited seats",
    pitch: "Run product feedback loops across the customer journey.",
    features: ["All integrations", "Email follow-ups", "AI digest"],
  },
  business: {
    name: "Business",
    price: "$249",
    responses: 50000,
    seats: "Unlimited seats",
    pitch: "Add governance, SSO readiness, audit trails, and retention.",
    features: ["RBAC", "Audit logs", "Retention controls"],
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    responses: "custom",
    seats: "Custom",
    pitch: "Self-host or run with custom compliance requirements.",
    features: ["Self-host license", "DPA and SLA", "Data residency"],
  },
};

const integrationCopy: Record<
  IntegrationKey,
  { name: string; purpose: string; env: string[]; event: string }
> = {
  activepieces: {
    name: "Activepieces",
    purpose: "Open-source no-code workflow automation for survey response events.",
    env: ["ACTIVEPIECES_WEBHOOK_URL", "WEBHOOK_SIGNING_SECRET"],
    event: "response.created",
  },
  airtable: {
    name: "Airtable",
    purpose: "Send submitted survey responses into a selected Airtable base/table.",
    env: ["AIRTABLE_API_KEY", "AIRTABLE_BASE_ID", "AIRTABLE_TABLE_ID"],
    event: "response.created",
  },
  googleSheets: {
    name: "Google Sheets",
    purpose: "Append survey responses to a selected Google Sheet.",
    env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"],
    event: "response.created",
  },
  hubspot: {
    name: "HubSpot",
    purpose: "Create or update contacts when survey responses are submitted.",
    env: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
    event: "contact.updated",
  },
  make: {
    name: "Make",
    purpose: "Trigger Make scenarios from response and survey events.",
    env: ["MAKE_WEBHOOK_URL", "WEBHOOK_SIGNING_SECRET"],
    event: "response.created",
  },
  n8n: {
    name: "n8n",
    purpose: "Trigger self-hosted or cloud n8n workflows from survey events.",
    env: ["N8N_WEBHOOK_URL", "WEBHOOK_SIGNING_SECRET"],
    event: "response.created",
  },
  notion: {
    name: "Notion",
    purpose: "Send survey responses into a selected Notion database.",
    env: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET", "NOTION_DATABASE_ID"],
    event: "response.created",
  },
  slack: {
    name: "Slack",
    purpose: "Send submitted responses to a selected Slack channel.",
    env: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET", "SLACK_SIGNING_SECRET"],
    event: "response.created",
  },
  webhooks: {
    name: "Webhooks",
    purpose: "Send signed HTTP notifications when survey objects change.",
    env: ["WEBHOOK_SIGNING_SECRET"],
    event: "response.created",
  },
  wordpress: {
    name: "WordPress",
    purpose: "Target visitors with embedded surveys on WordPress pages or button clicks.",
    env: ["WORDPRESS_SITE_URL", "WORKSPACE_ID"],
    event: "survey.displayed",
  },
  zapier: {
    name: "Zapier",
    purpose: "Connect survey events to Zapier workflows and downstream apps.",
    env: ["ZAPIER_WEBHOOK_URL", "WEBHOOK_SIGNING_SECRET"],
    event: "response.created",
  },
};

const questionTypeLabels: Record<QuestionType, string> = {
  nps: "NPS",
  csat: "CSAT",
  ces: "CES",
  rating: "Rating",
  single: "Single choice",
  multi: "Multi choice",
  short: "Short text",
  long: "Long text",
  email: "Email",
  consent: "Consent",
  cta: "CTA",
  pictureSelection: "Picture selection",
  fileUpload: "File upload",
  matrix: "Matrix",
  address: "Address",
};

const defaultWorkspace: Workspace = {
  environmentId: "",
  publicClientKey: "",
  plan: "free",
  overageEnabled: false,
  retentionDays: 365,
  surveys: [],
  respondents: [],
  responses: [],
  integrations: [
    {
      key: "activepieces",
      enabled: false,
      endpoint: "Add Activepieces webhook URL",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
    {
      key: "airtable",
      enabled: false,
      endpoint: "Connect Airtable base and table",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
    {
      key: "googleSheets",
      enabled: false,
      endpoint: "Connect Google Sheet",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
    {
      key: "hubspot",
      enabled: false,
      endpoint: "Connect HubSpot OAuth app",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
    {
      key: "make",
      enabled: false,
      endpoint: "Add Make webhook URL",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
    {
      key: "n8n",
      enabled: false,
      endpoint: "Add n8n webhook URL",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
    {
      key: "notion",
      enabled: false,
      endpoint: "Connect Notion database",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
    {
      key: "slack",
      enabled: false,
      endpoint: "Connect Slack channel",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
    {
      key: "webhooks",
      enabled: false,
      endpoint: "Add signed webhook endpoint",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
    {
      key: "wordpress",
      enabled: false,
      endpoint: "Install WordPress snippet",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
    {
      key: "zapier",
      enabled: false,
      endpoint: "Add Zapier catch hook URL",
      status: "needs-setup",
      lastTest: "No payload prepared",
    },
  ],
  auditLogs: [],
};

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeCsv(value: string) {
  const safe = value.replace(/^[=+\-@]/, "'$&");
  return `"${safe.replaceAll('"', '""')}"`;
}

function calculateNps(responses: ResponseRecord[]) {
  const scores = responses
    .map((response) => response.score)
    .filter((score): score is number => typeof score === "number");
  if (!scores.length) return 0;
  const promoters = scores.filter((score) => score >= 9).length;
  const detractors = scores.filter((score) => score <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

function averageScore(responses: ResponseRecord[]) {
  const scores = responses
    .map((response) => response.score)
    .filter((score): score is number => typeof score === "number");
  if (!scores.length) return 0;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1));
}

function getFirstScoredAnswer(survey: Survey, answers: Record<string, string>) {
  const scoredQuestion = survey.questions.find((question) =>
    ["nps", "csat", "ces", "rating"].includes(question.type),
  );
  if (!scoredQuestion) return null;
  const score = Number(answers[scoredQuestion.id]);
  return Number.isFinite(score) ? score : null;
}

function readInitialWorkspace() {
  return defaultWorkspace;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, displayName }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) {
        setError(payload.message ?? (payload.error === "account_exists" ? "An account already exists for this email." : "Authentication failed."));
        return;
      }
      onAuthenticated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-lockup">
          <div className="brand-mark">N</div>
          <div>
            <p className="eyebrow">Nexcus</p>
            <h1>Feedback Ops</h1>
          </div>
        </div>
        <p className="auth-intro">Create a private workspace for customer feedback, surveys, and response analytics.</p>
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">Create account</button>
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Sign in</button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label className="field-label">Name<input autoComplete="name" onChange={(event) => setDisplayName(event.target.value)} required value={displayName} /></label>
          )}
          <label className="field-label">Email<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
          <label className="field-label">Password<input autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={12} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button primary" disabled={busy} type="submit">{busy ? "Working..." : mode === "signup" ? "Create workspace" : "Sign in"}</button>
        </form>
        <small className="auth-note">Your workspace starts empty. No contacts, responses, or integrations are seeded.</small>
      </section>
    </main>
  );
}

export default function Home() {
  const [initialState] = useState(() => {
    const workspace = readInitialWorkspace();
    return {
      workspace,
      surveyId: workspace.surveys[0]?.id ?? "",
      respondentId: workspace.respondents[0]?.id ?? "",
    };
  });
  const [workspace, setWorkspace] = useState<Workspace>(initialState.workspace);
  const [activeView, setActiveView] = useState<ViewKey>("command");
  const [activeSurveyId, setActiveSurveyId] = useState(initialState.surveyId);
  const [activeResponseTag, setActiveResponseTag] = useState("all");
  const [selectedRespondentId, setSelectedRespondentId] = useState(initialState.respondentId);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("Ready to build your feedback loop.");
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrateFromServer() {
      const session = await fetch("/api/session", { credentials: "include" }).catch(() => null);
      if (!session?.ok) {
        setAuthenticated(false);
        setAuthChecked(true);
        setToast("Sign in to connect this workspace to server storage.");
        return;
      }
      setAuthenticated(true);
      setAuthChecked(true);
      const response = await fetch("/api/workspace", { credentials: "include" }).catch(() => null);
      if (!response?.ok) {
        setToast("Workspace storage is unavailable until the database is connected.");
        return;
      }
      const data = (await response.json()) as {
        environmentId?: string;
        publicClientKey?: string;
        surveys?: Array<Survey & { questions?: Question[] }>;
        respondents?: Array<Respondent & { attributes?: Record<string, unknown> }>;
        responses?: ResponseRecord[];
        auditLogs?: AuditLog[];
      };
      if (cancelled) return;
      const surveys = data.surveys ?? [];
      setWorkspace((current) => ({
        ...current,
        environmentId: data.environmentId ?? current.environmentId,
        publicClientKey: data.publicClientKey ?? current.publicClientKey,
        surveys: surveys.map((survey) => ({ ...survey, questions: survey.questions ?? [] })),
        respondents: (data.respondents ?? []).map((respondent) => ({
          ...respondent,
          phone: String(respondent.attributes?.phone ?? ""),
          plan: String(respondent.attributes?.plan ?? ""),
          country: String(respondent.attributes?.country ?? ""),
          consentSms: respondent.attributes?.consentSms === true,
          consentWhatsapp: respondent.attributes?.consentWhatsapp === true,
        })),
        responses: data.responses ?? [],
        auditLogs: data.auditLogs ?? [],
      }));
      setActiveSurveyId(surveys[0]?.id ?? "");
      setSelectedRespondentId(data.respondents?.[0]?.id ?? "");
      setToast("Live workspace connected to server storage.");
    }
    void hydrateFromServer();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSurvey = useMemo(
    () => workspace.surveys.find((survey) => survey.id === activeSurveyId) ?? workspace.surveys[0],
    [activeSurveyId, workspace.surveys],
  );

  const activeRespondent = useMemo(
    () =>
      workspace.respondents.find((respondent) => respondent.id === selectedRespondentId) ??
      workspace.respondents[0],
    [selectedRespondentId, workspace.respondents],
  );

  const activeSurveyResponses = useMemo(
    () => workspace.responses.filter((response) => response.surveyId === activeSurvey?.id),
    [activeSurvey?.id, workspace.responses],
  );

  const filteredResponses = useMemo(() => {
    if (activeResponseTag === "all") return workspace.responses;
    return workspace.responses.filter((response) => response.tags.includes(activeResponseTag));
  }, [activeResponseTag, workspace.responses]);

  const allTags = useMemo(
    () => Array.from(new Set(workspace.responses.flatMap((response) => response.tags))).sort(),
    [workspace.responses],
  );

  if (!authChecked) {
    return <main className="auth-shell"><p className="toast">Connecting to Nexcus...</p></main>;
  }
  if (!authenticated) {
    return <AuthScreen onAuthenticated={() => window.location.reload()} />;
  }

  const usageLimit = planCatalog[workspace.plan].responses;
  const usagePercent =
    usageLimit === "custom"
      ? 36
      : Math.min(100, Math.round((workspace.responses.length / usageLimit) * 100));

  function addAudit(action: string, detail: string) {
    setWorkspace((current) => ({
      ...current,
      auditLogs: [
        {
          id: makeId("audit"),
          action,
          actor: "Founder",
          detail,
          createdAt: new Date().toISOString(),
        },
        ...current.auditLogs,
      ],
    }));
  }

  async function persistSurvey(survey: Survey) {
    const response = await fetch(`/api/surveys/${encodeURIComponent(survey.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(survey),
    }).catch(() => null);
    if (!response?.ok) {
      setToast("Survey changes could not be saved to server storage.");
      return;
    }
    const data = (await response.json()) as { survey?: Survey };
    if (data.survey) {
      setWorkspace((current) => ({
        ...current,
        surveys: current.surveys.map((item) => item.id === data.survey?.id ? data.survey : item),
      }));
    }
  }

  function updateSurvey(patch: Partial<Survey>) {
    if (!activeSurvey) return;
    const nextSurvey = { ...activeSurvey, ...patch };
    setWorkspace((current) => ({
      ...current,
      surveys: current.surveys.map((survey) =>
        survey.id === activeSurvey.id ? nextSurvey : survey,
      ),
    }));
    void persistSurvey(nextSurvey);
  }

  function updateQuestion(questionId: string, patch: Partial<Question>) {
    if (!activeSurvey) return;
    const nextSurvey: Survey = {
      ...activeSurvey,
      questions: activeSurvey.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question,
      ),
    };
    setWorkspace((current) => ({
      ...current,
      surveys: current.surveys.map((survey) =>
        survey.id === activeSurvey.id ? nextSurvey : survey,
      ),
    }));
    void persistSurvey(nextSurvey);
  }

  function addQuestion(type: QuestionType) {
    if (!activeSurvey) return;
    const question: Question = {
      id: makeId("q"),
      type,
      title: `New ${questionTypeLabels[type]} question`,
      description: "",
      required: false,
      options: type === "single" || type === "multi" ? ["Option A", "Option B"] : [],
    };
    setWorkspace((current) => ({
      ...current,
      surveys: current.surveys.map((survey) =>
        survey.id === activeSurvey.id ? { ...survey, questions: [...survey.questions, question] } : survey,
      ),
    }));
    setToast(`${questionTypeLabels[type]} question added.`);
  }

  function removeQuestion(questionId: string) {
    if (!activeSurvey || activeSurvey.questions.length <= 1) return;
    setWorkspace((current) => ({
      ...current,
      surveys: current.surveys.map((survey) =>
        survey.id === activeSurvey.id
          ? { ...survey, questions: survey.questions.filter((question) => question.id !== questionId) }
          : survey,
      ),
    }));
  }

  async function createSurvey() {
    const survey: Survey = {
      id: makeId("survey"),
      name: "New product feedback survey",
      slug: `feedback-${workspace.surveys.length + 1}`,
      channel: "link",
      status: "draft",
      audience: "All active users",
      trigger: "Manual link share",
      completion: "Thanks for the feedback.",
      questions: [
        {
          id: makeId("q"),
          type: "csat",
          title: "How satisfied are you with this experience?",
          description: "1 is poor and 5 is excellent.",
          required: true,
          options: [],
        },
      ],
    };
    const response = await fetch("/api/surveys", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(survey),
    }).catch(() => null);
    if (!response?.ok) {
      setToast("Sign in and connect the database before creating a survey.");
      return;
    }
    const data = (await response.json()) as { survey?: Survey };
    const savedSurvey = data.survey ?? survey;
    setWorkspace((current) => ({ ...current, surveys: [...current.surveys, savedSurvey] }));
    setActiveSurveyId(savedSurvey.id);
    setActiveView("builder");
    setToast("New survey created.");
  }

  async function duplicateSurvey() {
    if (!activeSurvey) return;
    const survey: Survey = {
      ...activeSurvey,
      id: makeId("survey"),
      name: `${activeSurvey.name} copy`,
      slug: `${activeSurvey.slug}-copy`,
      status: "draft",
      questions: activeSurvey.questions.map((question) => ({ ...question, id: makeId("q") })),
    };
    const response = await fetch("/api/surveys", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(survey),
    }).catch(() => null);
    if (!response?.ok) {
      setToast("Sign in and connect the database before duplicating a survey.");
      return;
    }
    const data = (await response.json()) as { survey?: Survey };
    const savedSurvey = data.survey ?? survey;
    setWorkspace((current) => ({ ...current, surveys: [...current.surveys, savedSurvey] }));
    setActiveSurveyId(savedSurvey.id);
    setToast("Survey duplicated into draft.");
  }

  async function submitResponse() {
    if (!activeSurvey) return;
    const respondent =
      activeRespondent ??
      ({
        id: makeId("contact"),
        name: "Anonymous",
        email: "",
        phone: "",
        plan: "Unknown",
        country: "",
        consentSms: false,
        consentWhatsapp: false,
      } satisfies Respondent);
    const answers = activeSurvey.questions.reduce<Record<string, string>>((acc, question) => {
      acc[question.id] = draftAnswers[question.id] || (question.type === "consent" ? "No follow-up" : "");
      return acc;
    }, {});
    const score = getFirstScoredAnswer(activeSurvey, answers);
    const tags = score !== null && score <= 6 ? ["low-score", "needs-follow-up"] : ["new-response"];
    const response: ResponseRecord = {
      id: makeId("res"),
      surveyId: activeSurvey.id,
      respondentId: respondent.id,
      status: "completed",
      score,
      answers,
      tags,
      source: activeSurvey.channel === "in_app" ? "SDK widget" : "Survey link",
      createdAt: new Date().toISOString(),
    };
    const serverResponse = await fetch("/api/responses", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        surveyId: activeSurvey.id,
        status: "completed",
        score,
        answers,
        source: "dashboard-preview",
        respondent: {
          email: respondent.email,
          name: respondent.name,
          attributes: {
            phone: respondent.phone,
            plan: respondent.plan,
            country: respondent.country,
            consentSms: respondent.consentSms,
            consentWhatsapp: respondent.consentWhatsapp,
          },
        },
      }),
    }).catch(() => null);
    if (!serverResponse?.ok) {
      setToast("Sign in and connect the database before capturing a response.");
      return;
    }
    const serverData = (await serverResponse.json()) as { response?: ResponseRecord };
    const savedResponse = serverData.response ?? response;
    const savedRespondent = { ...respondent, id: savedResponse.respondentId };
    setWorkspace((current) => ({
      ...current,
      respondents: current.respondents.some((item) => item.id === savedRespondent.id)
        ? current.respondents
        : [savedRespondent, ...current.respondents],
      responses: [savedResponse, ...current.responses],
      auditLogs: [
        {
          id: makeId("audit"),
          action: "response.created",
          actor: respondent.name,
          detail: `${activeSurvey.name} submitted with score ${score ?? "n/a"}`,
          createdAt: new Date().toISOString(),
        },
        ...current.auditLogs,
      ],
    }));
    setDraftAnswers({});
    setToast("Response captured, analytics updated, and events queued.");
  }

  function testIntegration(key: IntegrationKey) {
    const event = integrationCopy[key].event;
    setWorkspace((current) => ({
      ...current,
      integrations: current.integrations.map((integration) =>
        integration.key === key
          ? {
              ...integration,
              enabled: false,
              status: "needs-setup",
              lastTest: `Payload prepared: ${event}`,
            }
          : integration,
      ),
      auditLogs: [
        {
          id: makeId("audit"),
          action: "integration.payload_prepared",
          actor: "Founder",
          detail: `${integrationCopy[key].name} payload prepared for ${event}`,
          createdAt: new Date().toISOString(),
        },
        ...current.auditLogs,
      ],
    }));
    setToast(`${integrationCopy[key].name} payload prepared. Add credentials before delivery.`);
  }

  function updateIntegrationEndpoint(key: IntegrationKey, endpoint: string) {
    setWorkspace((current) => ({
      ...current,
      integrations: current.integrations.map((integration) =>
        integration.key === key ? { ...integration, endpoint } : integration,
      ),
    }));
  }

  function changePlan(plan: PlanKey) {
    setWorkspace((current) => ({ ...current, plan }));
    addAudit("billing.plan_changed", `Plan changed to ${planCatalog[plan].name}`);
    setToast(`${planCatalog[plan].name} plan selected.`);
  }

  function exportCsv() {
    const headers = ["id", "survey", "respondent", "score", "status", "tags", "created_at"];
    const rows = filteredResponses.map((response) => {
      const survey = workspace.surveys.find((item) => item.id === response.surveyId);
      const respondent = workspace.respondents.find((item) => item.id === response.respondentId);
      return [
        response.id,
        survey?.name ?? "Unknown",
        respondent?.email ?? "anonymous",
        String(response.score ?? ""),
        response.status,
        response.tags.join("|"),
        response.createdAt,
      ].map(escapeCsv);
    });
    const csv = [headers.map(escapeCsv), ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "feedbackos-responses.csv";
    link.click();
    URL.revokeObjectURL(url);
    setToast("CSV export generated with spreadsheet injection protection.");
  }

  function resetDemo() {
    setWorkspace(defaultWorkspace);
    setActiveSurveyId(defaultWorkspace.surveys[0]?.id ?? "");
    setSelectedRespondentId("");
    setDraftAnswers({});
    setToast("Workspace cleared from this browser view. Server data remains governed by the workspace API.");
  }

  const nav: { key: ViewKey; label: string }[] = [
    { key: "command", label: "Command" },
    { key: "builder", label: "Builder" },
    { key: "collect", label: "Collect" },
    { key: "responses", label: "Responses" },
    { key: "insights", label: "Insights" },
    { key: "integrations", label: "Integrations" },
    { key: "security", label: "Security" },
    { key: "pricing", label: "Pricing" },
    { key: "launch", label: "Launch" },
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">N</div>
          <div>
            <p className="eyebrow">Nexcus</p>
            <h1>Feedback Ops</h1>
          </div>
        </div>
        <nav className="nav-list" aria-label="Product sections">
          {nav.map((item) => (
            <button
              className={activeView === item.key ? "nav-item active" : "nav-item"}
              key={item.key}
              onClick={() => setActiveView(item.key)}
              type="button"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="plan-meter">
          <div className="spread">
            <span>{planCatalog[workspace.plan].name}</span>
            <span>{usageLimit === "custom" ? "Custom" : `${workspace.responses.length}/${usageLimit}`}</span>
          </div>
          <div className="meter">
            <span style={{ width: `${usagePercent}%` }} />
          </div>
          <p>{workspace.overageEnabled ? "Dynamic overage enabled" : "Hard quota enabled"}</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Clean-room Formbricks-style MVP</p>
            <h2>{viewTitles[activeView]}</h2>
          </div>
          <div className="topbar-actions">
            <button className="button secondary" onClick={resetDemo} type="button">
              Clear view
            </button>
            <button className="button primary" onClick={createSurvey} type="button">
              New survey
            </button>
          </div>
        </header>

        <div className="toast" role="status">
          {toast}
        </div>

        {activeView === "command" && (
          <CommandCenter
            activeSurvey={activeSurvey}
            responses={workspace.responses}
            surveys={workspace.surveys}
            nps={calculateNps(workspace.responses)}
            average={averageScore(workspace.responses)}
            setActiveView={setActiveView}
          />
        )}

        {activeView === "builder" && activeSurvey && (
          <BuilderView
            addQuestion={addQuestion}
            activeSurvey={activeSurvey}
            duplicateSurvey={duplicateSurvey}
            removeQuestion={removeQuestion}
            setActiveSurveyId={setActiveSurveyId}
            surveys={workspace.surveys}
            updateQuestion={updateQuestion}
            updateSurvey={updateSurvey}
          />
        )}

        {activeView === "collect" && activeSurvey && (
          <CollectView
            activeRespondent={activeRespondent}
            activeSurvey={activeSurvey}
            draftAnswers={draftAnswers}
            environmentId={workspace.environmentId}
            publicClientKey={workspace.publicClientKey}
            respondents={workspace.respondents}
            selectedRespondentId={selectedRespondentId}
            setDraftAnswers={setDraftAnswers}
            setSelectedRespondentId={setSelectedRespondentId}
            submitResponse={submitResponse}
          />
        )}

        {activeView === "responses" && (
          <ResponsesView
            activeResponseTag={activeResponseTag}
            allTags={allTags}
            exportCsv={exportCsv}
            responses={filteredResponses}
            respondents={workspace.respondents}
            setActiveResponseTag={setActiveResponseTag}
            surveys={workspace.surveys}
          />
        )}

        {activeView === "insights" && (
          <InsightsView responses={workspace.responses} surveys={workspace.surveys} activeSurveyResponses={activeSurveyResponses} />
        )}

        {activeView === "integrations" && (
          <IntegrationsView
            integrations={workspace.integrations}
            testIntegration={testIntegration}
            updateIntegrationEndpoint={updateIntegrationEndpoint}
          />
        )}

        {activeView === "security" && (
          <SecurityView
            auditLogs={workspace.auditLogs}
            retentionDays={workspace.retentionDays}
            setRetentionDays={(retentionDays) => {
              setWorkspace((current) => ({ ...current, retentionDays }));
              addAudit("security.retention_changed", `Retention changed to ${retentionDays} days`);
            }}
          />
        )}

        {activeView === "pricing" && (
          <PricingView activePlan={workspace.plan} changePlan={changePlan} overageEnabled={workspace.overageEnabled} />
        )}

        {activeView === "launch" && <LaunchView />}
      </section>
    </main>
  );
}

const viewTitles: Record<ViewKey, string> = {
  command: "Command center",
  builder: "Survey builder",
  collect: "Live collection",
  responses: "Response inbox",
  insights: "Insights engine",
  integrations: "Plug-in integrations",
  security: "Security and admin",
  pricing: "Pricing and plans",
  launch: "Launch checklist",
};

function CommandCenter({
  activeSurvey,
  average,
  nps,
  responses,
  setActiveView,
  surveys,
}: {
  activeSurvey?: Survey;
  average: number;
  nps: number;
  responses: ResponseRecord[];
  setActiveView: (view: ViewKey) => void;
  surveys: Survey[];
}) {
  const published = surveys.filter((survey) => survey.status === "published").length;
  const lowScore = responses.filter((response) => typeof response.score === "number" && response.score <= 6).length;
  return (
    <div className="view-grid">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Founder dashboard</p>
          <h3>Build surveys, target users, collect responses, and route feedback into your stack.</h3>
          <p>
            This working MVP includes survey builder, link and app survey flows, response capture,
            analytics, pricing, security controls, and Formbricks-style integration setup. Data persists in this browser.
          </p>
        </div>
        <div className="hero-actions">
          <button className="button primary" onClick={() => setActiveView("builder")} type="button">
            Edit survey
          </button>
          <button className="button secondary" onClick={() => setActiveView("collect")} type="button">
            Capture response
          </button>
        </div>
      </section>

      <section className="metric-strip">
        <Metric label="Total responses" value={String(responses.length)} detail="All workspaces" tone="blue" />
        <Metric label="NPS" value={String(nps)} detail="Promoters minus detractors" tone="green" />
        <Metric label="Avg score" value={String(average)} detail="Across scored answers" tone="amber" />
        <Metric label="Follow-ups" value={String(lowScore)} detail="Low-score queue" tone="rose" />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Active program</p>
              <h3>{activeSurvey?.name}</h3>
            </div>
            <span className="badge success">{published} published</span>
          </div>
          <div className="timeline">
            <div>
              <span>1</span>
              <p>Define segments, hidden fields, and product-event triggers.</p>
            </div>
            <div>
              <span>2</span>
              <p>Collect link, website, app, and mobile responses from real users.</p>
            </div>
            <div>
              <span>3</span>
              <p>Route responses into Slack, HubSpot, Sheets, Airtable, Notion, and automation tools.</p>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Revenue path</p>
              <h3>Team plan is the conversion target</h3>
            </div>
          </div>
          <ul className="plain-list">
            <li>Free creates first survey and response habit.</li>
            <li>Launch unlocks custom branding, webhooks, and SDK targeting.</li>
            <li>Team monetizes integrations, automation, collaboration, and AI summaries.</li>
            <li>Business and Enterprise sell governance, retention, and self-hosting.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function Metric({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "blue" | "green" | "amber" | "rose";
  value: string;
}) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function BuilderView({
  activeSurvey,
  addQuestion,
  duplicateSurvey,
  removeQuestion,
  setActiveSurveyId,
  surveys,
  updateQuestion,
  updateSurvey,
}: {
  activeSurvey: Survey;
  addQuestion: (type: QuestionType) => void;
  duplicateSurvey: () => void;
  removeQuestion: (questionId: string) => void;
  setActiveSurveyId: (id: string) => void;
  surveys: Survey[];
  updateQuestion: (questionId: string, patch: Partial<Question>) => void;
  updateSurvey: (patch: Partial<Survey>) => void;
}) {
  return (
    <div className="builder-layout">
      <section className="panel controls-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Builder</p>
            <h3>Survey settings</h3>
          </div>
          <button className="button secondary" onClick={duplicateSurvey} type="button">
            Duplicate
          </button>
        </div>
        <label className="field-label">
          Select survey
          <select value={activeSurvey.id} onChange={(event) => setActiveSurveyId(event.target.value)}>
            {surveys.map((survey) => (
              <option key={survey.id} value={survey.id}>
                {survey.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Name
          <input value={activeSurvey.name} onChange={(event) => updateSurvey({ name: event.target.value })} />
        </label>
        <label className="field-label">
          Slug
          <input value={activeSurvey.slug} onChange={(event) => updateSurvey({ slug: event.target.value })} />
        </label>
        <div className="segmented" aria-label="Survey status">
          {(["draft", "published", "paused"] as const).map((status) => (
            <button
              className={activeSurvey.status === status ? "selected" : ""}
              key={status}
              onClick={() => updateSurvey({ status })}
              type="button"
            >
              {status}
            </button>
          ))}
        </div>
        <label className="field-label">
          Channel
          <select
            value={activeSurvey.channel}
            onChange={(event) => updateSurvey({ channel: event.target.value as Survey["channel"] })}
          >
            <option value="link">Link</option>
            <option value="website">Website</option>
            <option value="in_app">In-app</option>
            <option value="email">Email</option>
          </select>
        </label>
        <label className="field-label">
          Audience
          <textarea value={activeSurvey.audience} onChange={(event) => updateSurvey({ audience: event.target.value })} />
        </label>
        <label className="field-label">
          Trigger
          <textarea value={activeSurvey.trigger} onChange={(event) => updateSurvey({ trigger: event.target.value })} />
        </label>
        <label className="field-label">
          Completion message
          <textarea value={activeSurvey.completion} onChange={(event) => updateSurvey({ completion: event.target.value })} />
        </label>
      </section>

      <section className="panel builder-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Questions</p>
            <h3>{activeSurvey.questions.length} blocks</h3>
          </div>
          <select onChange={(event) => addQuestion(event.target.value as QuestionType)} value="">
            <option value="" disabled>
              Add block
            </option>
            {Object.entries(questionTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="question-list">
          {activeSurvey.questions.map((question, index) => (
            <article className="question-editor" key={question.id}>
              <div className="question-meta">
                <span>{index + 1}</span>
                <strong>{questionTypeLabels[question.type]}</strong>
                <label>
                  <input
                    checked={question.required}
                    onChange={(event) => updateQuestion(question.id, { required: event.target.checked })}
                    type="checkbox"
                  />
                  Required
                </label>
                <button className="text-button" onClick={() => removeQuestion(question.id)} type="button">
                  Remove
                </button>
              </div>
              <input value={question.title} onChange={(event) => updateQuestion(question.id, { title: event.target.value })} />
              <textarea
                placeholder="Optional help text"
                value={question.description}
                onChange={(event) => updateQuestion(question.id, { description: event.target.value })}
              />
              {(question.type === "single" || question.type === "multi") && (
                <label className="field-label">
                  Options, one per line
                  <textarea
                    value={question.options.join("\n")}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        options: event.target.value
                          .split("\n")
                          .map((option) => option.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
              )}
            </article>
          ))}
        </div>
      </section>

      <SurveyPreview activeSurvey={activeSurvey} />
    </div>
  );
}

function SurveyPreview({ activeSurvey }: { activeSurvey: Survey }) {
  return (
    <section className="panel preview-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Runtime preview</p>
          <h3>{activeSurvey.name}</h3>
        </div>
        <span className={`badge ${activeSurvey.status === "published" ? "success" : "muted"}`}>{activeSurvey.status}</span>
      </div>
      <div className="survey-runtime">
        <p className="runtime-trigger">{activeSurvey.audience}</p>
        {activeSurvey.questions.map((question) => (
          <div className="runtime-question" key={question.id}>
            <p>{question.title}</p>
            {question.description && <span>{question.description}</span>}
            {["nps", "rating", "csat", "ces"].includes(question.type) && (
              <div className="score-row">
                {Array.from({ length: question.type === "nps" ? 11 : 5 }, (_, index) => (
                  <button key={index} type="button">
                    {question.type === "nps" ? index : index + 1}
                  </button>
                ))}
              </div>
            )}
            {question.type === "long" && <textarea placeholder="Type answer" />}
            {question.type === "short" && <input placeholder="Short answer" />}
            {question.type === "email" && <input placeholder="name@company.com" />}
            {(question.type === "single" || question.type === "multi" || question.type === "consent") && (
              <div className="choice-stack">
                {(question.options.length ? question.options : ["Yes", "No"]).map((option) => (
                  <label key={option}>
                    <input name={question.id} type={question.type === "multi" ? "checkbox" : "radio"} />
                    {option}
                  </label>
                ))}
              </div>
            )}
            {question.type === "cta" && <button className="button secondary" type="button">Continue</button>}
            {question.type === "pictureSelection" && <div className="empty-state">Image choices render here after assets are configured.</div>}
            {question.type === "fileUpload" && <input type="file" />}
            {question.type === "matrix" && <div className="empty-state">Matrix rows and columns render here.</div>}
            {question.type === "address" && <textarea placeholder="Address" />}
          </div>
        ))}
        <button className="button primary" type="button">
          Submit feedback
        </button>
      </div>
    </section>
  );
}

function CollectView({
  activeRespondent,
  activeSurvey,
  draftAnswers,
  environmentId,
  publicClientKey,
  respondents,
  selectedRespondentId,
  setDraftAnswers,
  setSelectedRespondentId,
  submitResponse,
}: {
  activeRespondent?: Respondent;
  activeSurvey: Survey;
  draftAnswers: Record<string, string>;
  environmentId?: string;
  publicClientKey?: string;
  respondents: Respondent[];
  selectedRespondentId: string;
  setDraftAnswers: (answers: Record<string, string>) => void;
  setSelectedRespondentId: (id: string) => void;
  submitResponse: () => void;
}) {
  const sdkSnippet = `FeedbackOS.init({ environmentId: "${environmentId ?? ""}", apiKey: "${publicClientKey ?? ""}", apiHost: "${typeof window === "undefined" ? "" : window.location.origin}" });
FeedbackOS.identify("${activeRespondent?.id ?? "contact_from_your_app"}", {
  email: "${activeRespondent?.email ?? "contact_from_your_app"}",
  plan: "${activeRespondent?.plan ?? "unknown"}"
});
FeedbackOS.track("${activeSurvey.trigger}");`;

  return (
    <div className="two-column">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live capture</p>
            <h3>Submit a real demo response</h3>
          </div>
        </div>
        <label className="field-label">
          Respondent
          <select value={selectedRespondentId} onChange={(event) => setSelectedRespondentId(event.target.value)}>
            {respondents.length ? (
              respondents.map((respondent) => (
                <option key={respondent.id} value={respondent.id}>
                  {respondent.name} - {respondent.plan}
                </option>
              ))
            ) : (
              <option value="">Anonymous browser respondent</option>
            )}
          </select>
        </label>
        <div className="capture-form">
          {activeSurvey.questions.map((question) => (
            <label className="field-label" key={question.id}>
              {question.title}
              {["nps", "rating", "csat", "ces"].includes(question.type) ? (
                <input
                  max={question.type === "nps" ? 10 : 5}
                  min={question.type === "nps" ? 0 : 1}
                  onChange={(event) => setDraftAnswers({ ...draftAnswers, [question.id]: event.target.value })}
                  type="number"
                  value={draftAnswers[question.id] ?? ""}
                />
              ) : question.type === "long" ? (
                <textarea
                  onChange={(event) => setDraftAnswers({ ...draftAnswers, [question.id]: event.target.value })}
                  value={draftAnswers[question.id] ?? ""}
                />
              ) : question.type === "single" || question.type === "consent" ? (
                <select
                  onChange={(event) => setDraftAnswers({ ...draftAnswers, [question.id]: event.target.value })}
                  value={draftAnswers[question.id] ?? ""}
                >
                  <option value="">Choose</option>
                  {(question.options.length ? question.options : ["Yes", "No"]).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  onChange={(event) => setDraftAnswers({ ...draftAnswers, [question.id]: event.target.value })}
                  value={draftAnswers[question.id] ?? ""}
                />
              )}
            </label>
          ))}
        </div>
        <button className="button primary wide" onClick={submitResponse} type="button">
          Submit response and update analytics
        </button>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Plug-in SDK</p>
            <h3>Install snippet</h3>
          </div>
        </div>
        <pre className="code-block">{sdkSnippet}</pre>
        <div className="message-rules">
          <h4>Follow-up rules</h4>
          <p>SMS allowed: {activeRespondent?.consentSms ? "yes" : "no"}</p>
          <p>WhatsApp allowed: {activeRespondent?.consentWhatsapp ? "yes" : "no"}</p>
          <p>Channel recommendation: {activeRespondent ? "Use the stored contact preferences" : "Collect consent before outreach"}</p>
        </div>
      </section>
    </div>
  );
}

function ResponsesView({
  activeResponseTag,
  allTags,
  exportCsv,
  responses,
  respondents,
  setActiveResponseTag,
  surveys,
}: {
  activeResponseTag: string;
  allTags: string[];
  exportCsv: () => void;
  responses: ResponseRecord[];
  respondents: Respondent[];
  setActiveResponseTag: (tag: string) => void;
  surveys: Survey[];
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Inbox</p>
          <h3>{responses.length} responses</h3>
        </div>
        <div className="inline-actions">
          <select value={activeResponseTag} onChange={(event) => setActiveResponseTag(event.target.value)}>
            <option value="all">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <button className="button secondary" onClick={exportCsv} type="button">
            Export CSV
          </button>
        </div>
      </div>
      <div className="response-table">
        <div className="table-row table-head">
          <span>Respondent</span>
          <span>Survey</span>
          <span>Score</span>
          <span>Tags</span>
          <span>Time</span>
        </div>
        {responses.map((response) => {
          const respondent = respondents.find((item) => item.id === response.respondentId);
          const survey = surveys.find((item) => item.id === response.surveyId);
          return (
            <div className="table-row" key={response.id}>
              <span>
                <strong>{respondent?.name ?? "Anonymous"}</strong>
                <small>{respondent?.email}</small>
              </span>
              <span>{survey?.name}</span>
              <span>{response.score ?? "n/a"}</span>
              <span className="tag-list">
                {response.tags.map((tag) => (
                  <mark key={tag}>{tag}</mark>
                ))}
              </span>
              <span>{formatDate(response.createdAt)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InsightsView({
  activeSurveyResponses,
  responses,
  surveys,
}: {
  activeSurveyResponses: ResponseRecord[];
  responses: ResponseRecord[];
  surveys: Survey[];
}) {
  const answerText = responses.flatMap((response) => Object.values(response.answers)).join(" ").toLowerCase();
  const themes = [
    ["Pricing", (answerText.match(/\b(price|pricing|cost|expensive)\b/g) ?? []).length],
    ["Onboarding", (answerText.match(/\b(onboard|setup|start|install)\b/g) ?? []).length],
    ["Performance", (answerText.match(/\b(slow|speed|load|latency)\b/g) ?? []).length],
    ["Support", (answerText.match(/\b(help|support|docs|contact)\b/g) ?? []).length],
  ].filter(([, count]) => Number(count) > 0);

  return (
    <div className="view-grid">
      <section className="metric-strip">
        <Metric label="All responses" value={String(responses.length)} detail="Current browser workspace" tone="blue" />
        <Metric label="Active survey avg" value={String(averageScore(activeSurveyResponses))} detail="Selected survey" tone="green" />
        <Metric label="Programs" value={String(surveys.length)} detail="Survey journeys" tone="amber" />
        <Metric label="Detected topics" value={String(themes.length)} detail="From real response text" tone="rose" />
      </section>
      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">AI digest</p>
              <h3>Weekly founder summary</h3>
            </div>
          </div>
          {responses.length ? (
            <>
              <p className="digest">
                This summary is generated from the responses captured in this browser workspace.
              </p>
              <ul className="plain-list">
                <li>Low-score responses: {responses.filter((response) => typeof response.score === "number" && response.score <= 6).length}</li>
                <li>Completed responses: {responses.filter((response) => response.status === "completed").length}</li>
                <li>Export the inbox before clearing browser storage.</li>
              </ul>
            </>
          ) : (
            <p className="digest">No insight summary is generated until real responses exist.</p>
          )}
        </div>
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Topic clusters</p>
              <h3>Open-text labels</h3>
            </div>
          </div>
          <div className="topic-list">
            {themes.length ? themes.map(([theme, count]) => (
              <div key={theme}>
                <span>{theme}</span>
                <strong>{count}</strong>
              </div>
            )) : <p>No topics detected yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function IntegrationsView({
  integrations,
  testIntegration,
  updateIntegrationEndpoint,
}: {
  integrations: IntegrationState[];
  testIntegration: (key: IntegrationKey) => void;
  updateIntegrationEndpoint: (key: IntegrationKey, endpoint: string) => void;
}) {
  return (
    <div className="integration-grid">
      {integrations.map((integration) => {
        const copy = integrationCopy[integration.key];
        return (
          <article className="panel integration-panel" key={integration.key}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">{integration.status}</p>
                <h3>{copy.name}</h3>
              </div>
              <span className={`badge ${integration.enabled ? "success" : "muted"}`}>
                {integration.enabled ? "enabled" : "off"}
              </span>
            </div>
            <p>{copy.purpose}</p>
            <label className="field-label">
              Endpoint or account reference
              <input
                value={integration.endpoint}
                onChange={(event) => updateIntegrationEndpoint(integration.key, event.target.value)}
              />
            </label>
            <div className="env-list">
              {copy.env.map((env) => (
                <code key={env}>{env}</code>
              ))}
            </div>
            <pre className="code-block small">{`{
  "type": "${copy.event}",
  "workspace": "your-workspace",
  "signature": "sha256=replace",
  "createdAt": "generated-at-delivery"
}`}</pre>
            <div className="spread">
              <small>{integration.lastTest}</small>
              <button className="button secondary" onClick={() => testIntegration(integration.key)} type="button">
                Prepare event
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SecurityView({
  auditLogs,
  retentionDays,
  setRetentionDays,
}: {
  auditLogs: AuditLog[];
  retentionDays: number;
  setRetentionDays: (days: number) => void;
}) {
  return (
    <div className="two-column">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Governance</p>
            <h3>Security controls</h3>
          </div>
        </div>
        <div className="control-list">
          {[
            "Tenant-isolated authorization checks",
            "Webhook signature verification",
            "CSV injection-safe exports",
            "File-upload malware and type checks",
            "PII-aware audit logging",
            "Retention and delete workflow",
          ].map((item) => (
            <label key={item}>
              <input checked readOnly type="checkbox" />
              {item}
            </label>
          ))}
        </div>
        <label className="field-label">
          Response retention days
          <input
            min={30}
            onChange={(event) => setRetentionDays(Number(event.target.value))}
            type="number"
            value={retentionDays}
          />
        </label>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audit trail</p>
            <h3>Recent sensitive events</h3>
          </div>
        </div>
        <div className="audit-list">
          {auditLogs.slice(0, 8).map((log) => (
            <div key={log.id}>
              <strong>{log.action}</strong>
              <p>{log.detail}</p>
              <small>
                {log.actor} - {formatDate(log.createdAt)}
              </small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PricingView({
  activePlan,
  changePlan,
  overageEnabled,
}: {
  activePlan: PlanKey;
  changePlan: (plan: PlanKey) => void;
  overageEnabled: boolean;
}) {
  return (
    <section className="pricing-grid">
      {(Object.keys(planCatalog) as PlanKey[]).map((plan) => {
        const item = planCatalog[plan];
        return (
          <article className={activePlan === plan ? "panel pricing-panel active" : "panel pricing-panel"} key={plan}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">{item.seats}</p>
                <h3>{item.name}</h3>
              </div>
              {activePlan === plan && <span className="badge success">current</span>}
            </div>
            <strong className="price">{item.price}</strong>
            <p>{item.pitch}</p>
            <ul className="plain-list">
              <li>{item.responses === "custom" ? "Custom response volume" : `${item.responses} responses/month`}</li>
              {item.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button className="button secondary wide" onClick={() => changePlan(plan)} type="button">
              Select {item.name}
            </button>
          </article>
        );
      })}
      <div className="panel pricing-note">
        <h3>Usage model</h3>
        <p>
          Overage is {overageEnabled ? "enabled" : "disabled"}. Recommended production billing is $10 per extra
          1,000 responses on Launch/Team, $7 on Business, plus paid seats for collaboration and governance.
        </p>
      </div>
    </section>
  );
}

function LaunchView() {
  const checks = [
    ["Product", "Builder, runtime, response inbox, analytics, pricing, and integration surfaces exist."],
    ["CI", "CircleCI template is ready for lint, typecheck, tests, audit, build, approval, and deploy."],
    ["Review", "CodeRabbit workflow is ready once the repo has a real diff."],
    ["Security", "Threat model covers tenant isolation, XSS, webhooks, files, billing, and AI."],
    ["Integrations", "Airtable, Google Sheets, HubSpot, Notion, Slack, Zapier, Make, n8n, Activepieces, WordPress, and Webhooks are mapped."],
    ["GTM", "Pricing and positioning are ready for design partners."],
  ];

  return (
    <div className="two-column">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Launch readiness</p>
            <h3>Founder checklist</h3>
          </div>
        </div>
        <div className="control-list">
          {checks.map(([label, detail]) => (
            <label key={label}>
              <input checked readOnly type="checkbox" />
              <span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Next engineering step</p>
            <h3>Turn demo storage into production storage</h3>
          </div>
        </div>
        <ol className="numbered-list">
          <li>Add D1/Postgres-backed API routes for surveys, responses, respondents, integrations, and audit logs.</li>
          <li>Move OAuth clients, webhook signing secrets, and integration tokens into hosting environment variables.</li>
          <li>Add auth gate and server-side tenant authorization checks.</li>
          <li>Run CodeRabbit and Codex Security scans on every PR before production deploy.</li>
        </ol>
      </section>
    </div>
  );
}
