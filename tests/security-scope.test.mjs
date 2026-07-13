import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeFiles = [
  "app/api/surveys/route.ts",
  "app/api/responses/route.ts",
  "app/api/workspace/route.ts",
  "app/api/integrations/payloads/route.ts",
  "app/api/v1/client/events/route.ts",
  "app/api/v2/client/[environmentId]/environment/route.ts",
];

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("sensitive tables carry workspace scope", async () => {
  const schema = await read("db/schema.ts");
  const migration = await read("drizzle/0001_workspace_scope.sql");

  for (const table of [
    "surveys",
    "respondents",
    "responses",
    "integrationEvents",
    "sdkEvents",
    "auditLogs",
  ]) {
    assert.match(schema, new RegExp(`export const ${table}`));
  }

  assert.equal(schema.match(/workspaceId: text\("workspace_id"\)/g)?.length, 6);
  assert.equal(migration.match(/ADD `workspace_id`/g)?.length, 6);
});

test("workspace-scoped APIs require and apply tenant scope", async () => {
  const helper = await read("app/api/_lib.ts");
  assert.match(helper, /requireWorkspaceScope/);
  assert.match(helper, /x-feedbackos-workspace-id/);
  assert.match(helper, /authentication_required/);
  assert.match(helper, /workspace_forbidden/);
  assert.match(helper, /FEEDBACKOS_SESSION_SECRET/);

  for (const file of routeFiles) {
    const source = await read(file);
    assert.match(source, /workspaceId/);
    assert.doesNotMatch(source, /\.from\((surveys|responses|respondents|integrationEvents|auditLogs|sdkEvents)\)\s*\.orderBy/s);
  }
});

test("client environment route uses environment id as workspace scope", async () => {
  const source = await read("app/api/v2/client/[environmentId]/environment/route.ts");

  assert.match(source, /sanitizeScopeValue\(environmentId\)/);
  assert.match(source, /environment_id_invalid/);
  assert.match(source, /eq\(surveys\.workspaceId, workspaceId\)/);
});

test("public collection is bounded and the SDK does not interpolate HTML", async () => {
  const helper = await read("app/api/_lib.ts");
  const publicResponse = await read("app/api/v1/client/responses/route.ts");
  const publicEvents = await read("app/api/v1/client/events/route.ts");
  const clientEnvironment = await read("app/api/v2/client/[environmentId]/environment/route.ts");
  const sdk = await read("public/feedbackos-sdk.js");

  assert.match(helper, /MAX_JSON_BODY_BYTES/);
  assert.match(helper, /payload_too_large/);
  assert.match(publicResponse, /rateLimit/);
  assert.match(publicResponse, /survey\.status !== "published"/);
  assert.match(helper, /publicApiKeyForWorkspace/);
  assert.match(publicResponse, /requirePublicClientKey/);
  assert.match(publicEvents, /requirePublicClientKey/);
  assert.match(clientEnvironment, /requirePublicClientKey/);
  assert.doesNotMatch(sdk, /shell\.innerHTML/);
  assert.match(sdk, /textContent/);
});
