# FeedbackOS Security Threat Model

## Overview

FeedbackOS is a multi-tenant feedback and survey service. An organization creates
surveys, embeds the public SDK or shares survey links, collects respondent
profiles and answers, reviews analytics, exports responses, and sends events to
downstream integrations. The primary runtime surfaces are the browser dashboard
in `app/page.tsx`, the server API routes under `app/api`, the public survey and
SDK assets under `public`, and the Cloudflare Worker entry point in `worker`.

The most important assets are respondent answers and contact data, workspace
configuration, survey definitions, integration credentials and payloads, billing
state, audit records, and the availability and integrity of the public SDK.

## Threat Model, Trust Boundaries, and Assumptions

### Actors and boundaries

- **Workspace operators** use the dashboard to create surveys, inspect responses,
  export data, change plans, and configure integrations. They are trusted only
  for workspaces and roles explicitly granted to them.
- **Respondents** interact with public survey links and embedded widgets. They
  control answer text, contact fields, hidden-field values supplied by their
  browser, and request volume. They must never be able to read another
  respondent, operator, or workspace's data.
- **Host applications** load the SDK and supply environment identifiers,
  user identifiers, attributes, and product events. These values are
  attacker-controlled unless authenticated or integrity-protected by the host
  application's server.
- **Integration providers** receive outbound events and may send webhooks back.
  Provider payloads and delivery metadata are untrusted until signatures and
  replay rules are verified.
- **The hosting control plane** supplies D1/R2 bindings and runtime secrets.
  Operator secrets must remain server-side and must not be included in browser
  bundles, public manifests, logs, or exported response data.

### Security invariants

- Every workspace-owned read, write, export, delete, audit, and billing action
  must be authorized from an authenticated principal, not from an arbitrary
  browser-supplied workspace ID.
- Public collection endpoints may accept only the minimum survey and response
  data required for collection, and must validate survey status, question shape,
  payload size, consent, and rate limits.
- Respondent-controlled text must be escaped or sanitized before it is rendered
  in admin views, emails, exports, integration payloads, or AI prompts.
- Webhook signatures, timestamps, and replay protection must be checked before
  changing application state.
- Integration, OAuth, billing, messaging, and AI secrets must be held in
  server-side secret storage and redacted from errors and logs.
- CSV and spreadsheet exports must neutralize formula prefixes and must be
  authorized for the requesting workspace.
- SMS and WhatsApp follow-up requires explicit consent and must honor STOP, HELP,
  and unsubscribe state before sending any message.

### Assumptions and out of scope

The Cloudflare D1 binding is the source of durable application state in
production. A local process without that binding is not a production data store.
Compromise of the hosting provider or an authenticated workspace operator is out
of scope, but auditability and least privilege still matter. Availability attacks
against the hosting provider are out of scope; application-level abuse such as
unbounded public submissions and expensive exports is in scope.

## Attack Surface, Mitigations, and Attacker Stories

### Dashboard and admin APIs

The dashboard and routes in `app/api` handle the highest-value data. Authorization,
role checks, CSRF protection where cookies are used, object-level access checks,
pagination, and audit events are required. A malicious operator or unauthenticated
caller might alter a survey ID, respondent ID, or workspace ID to read or mutate
another tenant. The current code has explicit workspace predicates in several
queries, but a scope header alone is not an identity or authorization proof.

### Public survey, SDK, and ingestion paths

`public/feedbackos-sdk.js` and client ingestion routes are intentionally reachable
from customer sites. They must treat all configuration and event fields as
untrusted, avoid DOM XSS, cap event size and queue growth, and avoid accepting a
secret API key in browser code. A hostile host page or respondent may submit
oversized, malformed, cross-tenant, or high-volume events.

### Integrations and webhooks

Integration events may contain sensitive response text and contact information.
Outbound destinations must be validated against an allowed configuration and
protected against SSRF. Inbound webhooks must verify provider-specific signatures,
timestamps, and event IDs before state changes. OAuth refresh tokens and signing
secrets must never be returned by API routes or stored in client state.

### Exports, rendering, and AI

Response text is attacker-controlled and may contain HTML, formulas, prompt
injection, or sensitive data. React's default escaping helps ordinary JSX, but
string-built HTML, CSV exports, email templates, and AI summaries need their own
controls. Exports must be paginated and audited; AI prompts must be scoped to one
authorized workspace and must not include tokens or unrelated respondents.

### Billing, messaging, and deletion

Plan changes, quota enforcement, retention, data deletion, and follow-up messaging
are state-changing privileged operations. Billing webhooks must be signed and
idempotent. Messaging must be consent-gated and suppression-aware. Deletion and
retention jobs must not cross workspace boundaries and should leave a minimal
audit record without retaining deleted respondent content.

## Severity Calibration (Critical, High, Medium, Low)

### Critical

Cross-tenant access to response/contact data, browser exposure of a production
integration or billing secret, or an unsigned privileged webhook that lets an
attacker change plan, ownership, or deletion state is critical.

### High

Unauthenticated admin mutation, stored or DOM XSS in an operator view, SSRF to
internal services through integration configuration, or a public ingestion path
that permits practical cross-tenant writes or unbounded resource exhaustion is
high.

### Medium

Missing replay protection, incomplete audit coverage, export formula injection,
weak rate limiting, consent bypass for follow-up messages, or prompt injection
that can leak authorized-but-sensitive content is medium unless it combines with
another boundary failure.

### Low

Metadata leakage, overly detailed non-sensitive errors, cosmetic hardening gaps,
or a client-only convenience control with no server-side impact is low. A low
severity issue becomes more serious when it provides a stepping stone to a
workspace or secret boundary.

Repository: C:\\Users\\Dell\\Documents\\Codex\\2026-07-08\\formbricks-github
Version: 694940d
