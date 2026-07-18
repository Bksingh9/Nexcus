# Nexcus Deployment

Nexcus has two intentionally separate surfaces:

- GitHub Pages at `https://bksingh9.github.io/Nexcus/` is the public landing and source surface.
- The Docker/Render service is the multi-user runtime and owns authentication, PostgreSQL data, Redis, migrations, and server-side integrations.

## Render

1. Create a Render Blueprint from this repository and select `render.yaml`.
2. Set `WEBAPP_URL` and `NEXTAUTH_URL` to the deployed application URL.
3. Set `HUB_API_KEY`, `HUB_API_URL`, `CUBEJS_API_SECRET`, and `CUBEJS_API_URL` only after the Hub/Cube services are provisioned. They are not browser variables.
4. Add provider credentials in Render secret storage, never in GitHub Pages or `NEXT_PUBLIC_*` variables.
5. Run `pnpm db:migrate` as the release migration command before serving traffic.
6. Validate `/api/health`, `/api/ready`, signup/session creation, a published survey, a real response, analytics, export, and deletion.

Render credentials, managed-service creation, DNS, backups, and production secret values must be supplied in the Render account. This repository does not contain those secrets.

## Docker

Copy `.env.production.example` to `.env.production`, replace every placeholder, set `POSTGRES_PASSWORD`, and run:

```bash
docker compose -f docker-compose.production.yml up --build
```

The compose stack starts pgvector PostgreSQL, Valkey, an idempotent migration job, and the Nexcus app. PostgreSQL volumes must be backed up before upgrades. Restore validation belongs in the staging checklist before production traffic.

## Open-source boundary

The current Nexcus application is a clean-room implementation informed by the public Formbricks product and deployment documentation. Enterprise-only Formbricks modules are not included. If upstream AGPL source is imported in a future fork, keep its license, attribution, and corresponding source offer with the distribution.
