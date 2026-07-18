# Nexcus Security Review

Review date: 2026-07-18

This review covers the server-backed dashboard, account authentication, PostgreSQL migration path, public survey links, browser SDK ingestion, CSV export behavior, and the GitHub Pages landing surface. Survey answers, respondent attributes, and integration payloads are treated as sensitive tenant data.

## Controls Verified

- Workspace APIs require an HMAC-signed, HttpOnly session cookie. Caller-supplied workspace IDs are consistency checks only and cannot select a different tenant.
- Public signup/login stores only PBKDF2 password verifiers and issues the same signed, HttpOnly session cookie; no plaintext password is persisted.
- Production tables use PostgreSQL with an idempotent migration ledger and workspace indexes.
- Public SDK reads and writes require a workspace-derived publishable client key. The key is returned only by the authenticated workspace endpoint and is not an integration secret.
- Public survey links resolve only published surveys by slug. Response answers are limited to question IDs and bounded in size.
- JSON request bodies are bounded, public ingestion is rate limited, and malformed session cookies fail closed.
- SDK widget rendering uses DOM APIs and `textContent`; respondent payloads are not placed in browser storage.
- CSV export values neutralize spreadsheet formulas. The static Pages artifact is restricted to `./outputs`.
- Audit rows are written for survey creation, survey updates, and public response creation.

## Verification Evidence

- `pnpm test`: 4 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm audit --audit-level high`: passed; full audit reports no known vulnerabilities after the workspace overrides.
- `pnpm build`: passed.
- Built-server smoke test: passed.
- Local production-server smoke: health 200, home 200, readiness correctly fails without a database, and the API smoke suite passed.
- PostgreSQL-backed signup, survey creation, publish, response persistence, analytics, export, and deletion require a reachable staging database and remain launch gates.

## Review Limits

- CodeRabbit was not executed because the Windows workspace has no `coderabbit` executable and WSL is not installed. This is an environment limitation, not a CodeRabbit approval.
- Codex Security's repository-wide preflight returned `incomplete` because delegated review workers are unavailable in this session. The local security gate and targeted tests are not an exhaustive Codex Security scan and must not be represented as one.
- ChatGPT identity is an optional trusted-ingress path. Standalone Render deployments use the Nexcus email/password account flow; production email verification, password reset, and abuse monitoring still need provider configuration before broad public launch.
- OAuth integrations, billing, Twilio delivery, outbound webhooks, and retention jobs are contracts/UI surfaces until provider credentials and server-side delivery workers are configured. No integration secret is stored in the browser.
- A durable public deployment still requires Render service creation, managed PostgreSQL/Redis provisioning, real secret values, backup/restore validation, Hub/Cube wiring, and staging acceptance.
