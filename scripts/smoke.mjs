const baseUrl = process.env.FEEDBACKOS_SMOKE_URL || "http://127.0.0.1:3001";
const base = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

async function fetchText(path) {
  const url = new URL(path.replace(/^\//, ""), base);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.text();
}

async function fetchJson(path, init) {
  const url = new URL(path.replace(/^\//, ""), base);
  const response = await fetch(url, init);
  return {
    body: await response.json(),
    status: response.status,
  };
}

function assertIncludes(label, value, expected) {
  if (!value.includes(expected)) {
    throw new Error(`${label} did not include ${expected}`);
  }
}

const home = await fetchText("/");
assertIncludes("home", home, "FeedbackOS");
assertIncludes("home", home, "Build surveys");
assertIncludes("home", home, "Clean-room Formbricks-style MVP");

const sdk = await fetchText("/feedbackos-sdk.js");
assertIncludes("sdk", sdk, "FeedbackOS");
assertIncludes("sdk", sdk, "showSurvey");
assertIncludes("sdk", sdk, "getWorkspaceState");
assertIncludes("sdk", sdk, "setHiddenFields");

const manifestText = await fetchText("/integration-manifest.json");
const manifest = JSON.parse(manifestText);
for (const key of ["airtable", "googleSheets", "hubspot", "notion", "slack", "zapier", "make", "n8n", "activepieces", "webhooks", "wordpress"]) {
  if (!manifest.integrations?.[key]) {
    throw new Error(`manifest is missing ${key} integration contract`);
  }
}
if (!manifest.events?.includes("response.created")) {
  throw new Error("manifest is missing response.created event");
}
if (!manifest.questionTypes?.includes("Matrix")) {
  throw new Error("manifest is missing advanced question types");
}

const unscopedSurveys = await fetchJson("/api/surveys");
if (unscopedSurveys.status !== 401 || unscopedSurveys.body?.error !== "authentication_required") {
  throw new Error("unscoped survey API request should require authentication");
}

console.log(`FeedbackOS smoke passed at ${baseUrl}`);
