# JasimFlowX

Private Bengali personal-accounting web app, migrated from the original JasimFlow ChatGPT Sites deployment to the owner's Cloudflare account.

## Production target

- **Hosting/API:** Cloudflare Workers
- **Database:** Cloudflare D1 (`DB` → `jasimflow-db`)
- **Authentication:** Cloudflare Access, owner-only
- **Source:** private GitHub repository `jasimur/JasimFlowX`
- **Offline/PWA:** IndexedDB outbox + Service Worker retained

## Security

The Worker does not trust owner identity supplied by the browser. In production it validates Cloudflare Access's signed `Cf-Access-Jwt-Assertion` against the team's JWKS, issuer and Access application AUD, then injects the verified email internally for API ownership. The Worker fails closed when Access configuration or the signed token is missing/invalid.

Required production Worker variables after creating the Access application:

- `TEAM_DOMAIN=https://<your-team>.cloudflareaccess.com`
- `POLICY_AUD=<Access application Audience tag>`

Protect the Worker production URL and previews with Cloudflare Access and allow only the owner's email/account.

## Database

D1 binding in `wrangler.jsonc`:

- binding: `DB`
- database: `jasimflow-db`
- database ID: `051db5a1-d93e-40b9-8d47-ee06df2e7aeb`

Apply existing migrations once to a fresh D1:

```sh
npx pnpm@11.25.0 install --frozen-lockfile
npx pnpm@11.25.0 run db:migrate:remote
```

Do not replay old migrations on a populated database.

## Build and deploy

```sh
npx pnpm@11.25.0 install --frozen-lockfile
npx pnpm@11.25.0 run build
npx pnpm@11.25.0 run deploy
```

For Cloudflare Git builds, connect the private GitHub repository and use `main` as production branch. See `CLOUDFLARE_SETUP.md` and `START_HERE_BN.md`.

## Important migration rule

Keep the old ChatGPT Sites JasimFlow deployment/database as a safety copy until Cloudflare login, totals, loans, Bin, offline behavior, reconnect sync and data migration are fully verified. Source code backup is not a financial-data backup.
