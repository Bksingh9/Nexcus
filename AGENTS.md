# FeedbackOS Engineering Instructions

This product handles customer feedback, respondent contact data, billing state, and integration tokens. Treat all survey responses and respondent profiles as sensitive.

Security rules:

- Preserve tenant isolation on every workspace-scoped query and mutation.
- Never expose Twilio, Stripe, Slack, HubSpot, email, OAuth, AI, or webhook secrets to the browser.
- Verify webhook signatures before changing state.
- Sanitize all respondent-controlled text before rendering it in admin views, emails, exports, and AI summaries.
- Do not log raw phone numbers, API keys, tokens, response text, or integration secrets.
- Require consent before SMS or WhatsApp follow-up and honor STOP/HELP/unsubscribe behavior.
- Keep CSV exports spreadsheet-injection safe.
- Audit auth, role, export, delete, billing, integration, and messaging changes.

Review focus:

- Auth, RBAC, session handling, survey runtime, SDK ingestion, file uploads, webhooks, billing, Twilio, AI prompts, exports, and data deletion.
