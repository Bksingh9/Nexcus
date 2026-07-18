# Open-source source map

This project is a clean-room, Formbricks-style implementation. The links below are reference sources for product behavior, deployment, and integration patterns; Formbricks source code is not copied into this repository.

## Primary reference

- [Formbricks](https://github.com/formbricks/formbricks) - open-source survey and experience-management product.
- [Formbricks license](https://github.com/formbricks/formbricks/blob/main/LICENSE) - the core project is AGPLv3; the repository also documents separate enterprise-licensed areas.
- [Formbricks self-hosting deployment](https://formbricks.com/docs/self-hosting/deployment) - official Docker-based self-hosting path.
- [Formbricks security policy](https://github.com/formbricks/formbricks/blob/main/SECURITY.md) - security disclosure and operational reference.

## Official ecosystem references

- [Formbricks design system](https://github.com/formbricks/design)
- [Formbricks React Native SDK](https://github.com/formbricks/react-native)
- [Formbricks iOS SDK](https://github.com/formbricks/ios)
- [Formbricks Android SDK](https://github.com/formbricks/android)
- [Formbricks WordPress integration](https://github.com/formbricks/wordpress)
- [Formbricks n8n node](https://github.com/formbricks/n8n-node)

## Infrastructure references used by FeedbackOS

- [Next.js documentation](https://nextjs.org/docs)
- [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview)
- [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)
- [GitHub Pages documentation](https://docs.github.com/en/pages)
- [GitHub Pages deployment action](https://github.com/actions/deploy-pages)

## Implementation boundary

Nexcus currently publishes a public static FeedbackOS browser build through GitHub Pages. The server-backed routes, tenant-scoped database, authentication, billing, and provider integrations are present as source contracts but require a server host, a D1 binding, migrations, and server-side secrets before they can be enabled for public multi-user production use.

Do not put Twilio, Stripe, OAuth, webhook, email, or AI secrets in the GitHub Pages bundle. Keep respondent data and integration credentials on the server.
