const productionUrl = process.env.FEEDBACKOS_PRODUCTION_URL;
if (!productionUrl) {
  throw new Error("Set FEEDBACKOS_PRODUCTION_URL to the deployed FeedbackOS URL before running this check.");
}

const requiredSnippets = [
  "<title>FeedbackOS</title>",
  "Clean-room Formbricks-style MVP",
  "Build surveys",
  "Submit a real demo response",
  "Response inbox",
  "Airtable",
  "Google Sheets",
  "Notion",
  "Activepieces",
  "Workspace state",
  "GET /api/v2/client/{environmentId}/environment",
  "Pricing",
  "Launch",
];

const forbiddenPatterns = [
  /Ava Chen/i,
  /Rahul Mehta/i,
  /Marta Silva/i,
  /ava@/i,
  /rahul@/i,
  /marta@/i,
];

const response = await fetch(productionUrl, {
  headers: {
    "cache-control": "no-cache",
  },
});

if (!response.ok) {
  throw new Error(
    `Production URL returned ${response.status} ${response.statusText}: ${productionUrl}`,
  );
}

const html = await response.text();

const missing = requiredSnippets.filter((snippet) => !html.includes(snippet));
if (missing.length) {
  throw new Error(
    `Production page is missing expected live app markers: ${missing.join(", ")}`,
  );
}

const forbidden = forbiddenPatterns
  .filter((pattern) => pattern.test(html))
  .map((pattern) => pattern.source);

if (forbidden.length) {
  throw new Error(
    `Production page still contains seeded/dummy data markers: ${forbidden.join(", ")}`,
  );
}

console.log(`Production deployment verified at ${productionUrl}`);
