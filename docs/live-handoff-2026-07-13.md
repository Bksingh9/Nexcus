# FeedbackOS Live Handoff - 2026-07-13

## Current Public Preview

- Production server: `vinext start --port 3001 --hostname 0.0.0.0`
- Public tunnel: `https://cruel-wasps-open.loca.lt`
- Automated tunnel checks should send `bypass-tunnel-reminder: true`.

## Verified

- `pnpm test`: passed, 3 tests.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm smoke` against `http://127.0.0.1:3001`: passed.
- Public tunnel root `/`: 200.
- Public tunnel SDK `/feedbackos-sdk.js`: 200.
- Public tunnel manifest `/integration-manifest.json`: 200.
- Unscoped public API call `/api/surveys`: 400 with `workspace_scope_required`.

## Production Blocker

Sites deployment is blocked because Sites is not enabled for this workspace. The local/tunnel production server is public and user-facing, but it is not durable production hosting.

The server API is ready to use a Cloudflare D1 binding named `DB`, as configured in `.openai/hosting.json`. Until that binding is attached, scoped API calls fail closed with `database_unavailable`.

## Security Notes

- Workspace-owned tables now carry `workspace_id`.
- Workspace API reads and writes require `x-feedbackos-workspace-id` or `?workspaceId=`.
- SDK environment routes use `[environmentId]` as the tenant scope.
- No Twilio, Stripe, Slack, HubSpot, email, OAuth, AI, or webhook secret values are committed.
