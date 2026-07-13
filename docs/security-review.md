# FeedbackOS Security Review

Review date: 2026-07-13

This review covers the server-backed dashboard, public survey links, browser SDK ingestion, CSV export behavior, and Cloudflare Worker deployment surface. Survey answers, respondent attributes, and integration payloads are treated as sensitive tenant data.

## Controls Verified

- Workspace APIs require an HMAC-signed, HttpOnly session cookie. Caller-supplied workspace IDs are consistency checks only and cannot select a different tenant.
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
- `pnpm build`: passed.
- Built-server smoke test: passed.
- D1-backed Worker workflow: session, survey creation, publish, public config, SDK response, public-link GET/POST, and dashboard read-back all passed; two responses were persisted.

## Review Limits

- CodeRabbit was not executed because the Windows workspace has no `coderabbit` executable and WSL is not installed. This is an environment limitation, not a CodeRabbit approval.
- The ChatGPT platform identity header is trusted only when the deployment ingress supplies it. A standalone public deployment must keep the app behind that trusted ingress or replace it with a real production identity provider before selling access.
- OAuth integrations, billing, Twilio delivery, outbound webhooks, and retention jobs are contracts/UI surfaces until provider credentials and server-side delivery workers are configured. No integration secret is stored in the browser.
- A durable public deployment still requires a provisioned D1 binding, `FEEDBACKOS_SESSION_SECRET`, a chosen public repository/remote, and an enabled hosting target.
