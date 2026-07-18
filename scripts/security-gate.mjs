import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const requiredEnv = [
  "WEBAPP_URL",
  "NEXTAUTH_URL",
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "ENCRYPTION_KEY",
  "CRON_SECRET",
  "REDIS_URL",
  "HUB_API_KEY",
  "CUBEJS_API_SECRET",
];

const files = await readdir(root, { recursive: true, withFileTypes: true });
const paths = files
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath ?? root, entry.name))
  .filter((file) => !/(^|[\\/])(node_modules|\.git|\.next|dist|build|outputs)([\\/]|$)/.test(relative(root, file)));

const failures = [];
const envExample = await readFile(join(root, ".env.production.example"), "utf8");
for (const key of requiredEnv) {
  if (!new RegExp(`^${key}=`, "m").test(envExample)) failures.push(`missing production env contract: ${key}`);
}

const publicFiles = paths.filter((file) => /[\\/]public[\\/]|[\\/]outputs[\\/]/.test(file));
for (const file of publicFiles) {
  const source = await readFile(file, "utf8");
  if (/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PRIVATE|AUTH)/i.test(source)) {
    failures.push(`browser secret-like variable in ${relative(root, file)}`);
  }
  if (/sk_(?:live|test)_[A-Za-z0-9]+|xox[baprs]-[A-Za-z0-9-]+|-----BEGIN (?:RSA|OPENSSH|PRIVATE) KEY-----/.test(source)) {
    failures.push(`credential-shaped value in ${relative(root, file)}`);
  }
}

const schema = await readFile(join(root, "db", "schema.ts"), "utf8");
if (!schema.includes("pgTable")) failures.push("production schema is not PostgreSQL");
for (const table of ["accounts", "surveys", "respondents", "responses", "integrationEvents", "sdkEvents", "auditLogs"]) {
  if (!new RegExp(`export const ${table}`).test(schema)) failures.push(`missing production table: ${table}`);
}

const migration = await readFile(join(root, "db", "migrations", "001_initial.sql"), "utf8");
if ((migration.match(/workspace_id TEXT NOT NULL/g) ?? []).length !== 7) {
  failures.push("production migration does not scope all sensitive tables");
}

const productTextFiles = paths
  .filter((candidate) => !/[\\/](?:scripts|tests)[\\/]/.test(candidate))
  .filter((candidate) => /\.(?:ts|tsx|mjs|json|yaml|yml|md)$/.test(candidate));
const productText = [];
for (const file of productTextFiles) productText.push(await readFile(file, "utf8"));
const joined = productText.join("\n");
for (const marker of ["Ava Chen", "Rahul Mehta", "Marta Silva", "ava@example.com", "rahul@example.com", "marta@example.com"]) {
  if (joined.includes(marker)) failures.push(`seeded-data marker found: ${marker}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Repository security gate passed without printing secret values.");
