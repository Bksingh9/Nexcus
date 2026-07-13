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

Copy `.env.example` to `.env` and fill in production values when wiring real integrations.

## Production Notes

Production requires a Cloudflare D1 binding named `DB`, the migrations in `drizzle/`, and `FEEDBACKOS_SESSION_SECRET`. Integration credentials and webhook signing secrets belong in server-side environment bindings. The current integration API prepares signed-event payloads; provider-specific OAuth, billing, Twilio consent workflows, and outbound delivery still need their provider credentials and callback configuration before they can be enabled.
