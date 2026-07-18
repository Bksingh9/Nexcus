# Open-source source map

Nexcus is currently a clean-room, Formbricks-style implementation. Formbricks is used as a public product, SDK, integration, and deployment reference; upstream source code and enterprise modules are not included in this checkout.

## Primary references

- [Formbricks](https://github.com/formbricks/formbricks) - open-source survey and experience-management product.
- [Formbricks license](https://github.com/formbricks/formbricks/blob/main/LICENSE) - the core project is AGPLv3; the upstream repository documents separate enterprise-licensed areas.
- [Official Docker/Postgres stack](https://github.com/formbricks/formbricks/blob/main/docker/docker-compose.yml) - pgvector PostgreSQL, Valkey, migrations, Hub, and Cube reference services.
- [Self-hosting deployment](https://formbricks.com/docs/self-hosting/deployment) - official deployment guidance.

## Nexcus boundary

- GitHub Pages is only the public landing/source surface.
- The multi-user runtime is Docker/Render with PostgreSQL, Redis/Valkey, server-side sessions, migrations, and provider secrets.
- Enterprise-only upstream modules are excluded.
- If AGPL upstream source is imported in a future fork, preserve its license, attribution, source offer, and network-source obligations.

Do not put Twilio, Stripe, OAuth, webhook, email, or AI secrets in the Pages bundle. Keep respondent data and integration credentials on the server.
