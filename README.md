# FeedbackOS MVP

FeedbackOS is a clean-room, Formbricks-style product feedback platform. It provides a survey dashboard, authenticated server-backed CRUD, public link surveys, a browser SDK, response analytics, CSV protection, and integration event contracts.

## What Works Now

- Product command center with metrics and launch path.
- Survey builder with official-style question blocks, status, channel, targeting, hidden fields, and runtime preview.
- Live collection flow that sends responses to the authenticated API and updates analytics from server data.
- Response inbox with tag filtering and CSV export protection.
- Insight readiness that stays empty until real response text exists.
- Integration setup contracts for Webhooks, Airtable, Google Sheets, HubSpot, Notion, Slack, Zapier, Make, n8n, Activepieces, and WordPress.
- SDK methods for identify, attributes, hidden fields, event tracking, workspace state, survey display, dismissal, and reset.
- Security/admin view with audit log, retention control, consent rules, and governance checklist.
- Pricing page with selectable Free, Launch, Team, Business, and Enterprise plans.
- Browser SDK at `/feedbackos-sdk.js`.
- Integration manifest at `/integration-manifest.json`.
- CircleCI and CodeRabbit starter configs.

The browser dashboard starts empty. It does not ship seeded surveys, contacts, responses, leads, or fake integration connections.

## Local Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

## Build

```bash
pnpm build
```

## API Tenant Scope

Workspace APIs require a signed session created by `GET /api/session`. In the ChatGPT-hosted runtime the session is derived from the authenticated user header; for local development set `FEEDBACKOS_DEV_USER_EMAIL` and a 32-character `FEEDBACKOS_SESSION_SECRET`. A request may include a workspace header as a consistency check, but it cannot choose another tenant:

```http
x-feedbackos-workspace-id: your-workspace-id
```

The public SDK uses an opaque `environmentId` for published survey configuration and may submit events or responses through `/api/v1/client/events` and `/api/v1/client/responses`. Public collection is rate-limited and bounded; it does not grant access to workspace reads. Link surveys are available at `/s/{slug}` after publication.

## Environment Variables

Copy `.env.example` to `.env` for local work. For a real deployment, use [`.env.production.example`](.env.production.example) and a secret manager. Never put provider tokens or database credentials in a `NEXT_PUBLIC_*` value.

## Production Notes

Production uses PostgreSQL and Redis/Valkey. Run `pnpm db:migrate` before serving traffic, then use `/api/health` and `/api/ready` as deployment checks. The supported container path is documented in [`docs/deployment.md`](docs/deployment.md) and [`render.yaml`](render.yaml). The old Cloudflare D1 worker schema remains only as a compatibility path; it is not the production default.

GitHub Pages is limited to the public landing/source surface at [bksingh9.github.io/Nexcus](https://bksingh9.github.io/Nexcus/). It is not the multi-user SaaS runtime.
