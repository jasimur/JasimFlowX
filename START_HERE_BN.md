# JasimFlowX — GitHub + Cloudflare Migration Guide

Status: migration build prepared from the original JasimFlow source. The old ChatGPT Sites app remains the safety copy until the Cloudflare version is verified.

## Target
- Source: private GitHub repo `jasimur/JasimFlowX`
- Hosting/API: Cloudflare Workers
- Database: Cloudflare D1 binding `DB`
- Login: Cloudflare Access, protect **All traffic**
- Offline/PWA: preserve existing IndexedDB + Service Worker behavior

## One-time Cloudflare setup
1. Cloudflare Dashboard → Workers & Pages.
2. Configure your `workers.dev` account subdomain if Cloudflare asks.
3. Go to D1 / Storage & databases → D1 → Create database.
4. Database name: `jasimflow-db`.
5. Copy the Database ID.
6. D1 binding is already configured for database ID `051db5a1-d93e-40b9-8d47-ee06df2e7aeb`.
7. Apply `drizzle/0000_young_drax.sql`, `0001_brave_bullseye.sql`, and `0002_vengeful_harpoon.sql` in order (or use `pnpm run db:migrate:remote`).
8. In Workers & Pages → Create application → Import a repository → select `jasimur/JasimFlowX`.
9. Production branch: `main`.
10. Build command: `npx pnpm@11.25.0 install --frozen-lockfile && npx pnpm@11.25.0 run build`.
11. Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`.
12. After first successful deployment, open the Worker → Access → protect **production + previews / All traffic** and allow only the owner's email/account.
13. Copy the Access application **Audience (AUD) tag** and your Zero Trust team domain (`https://<team>.cloudflareaccess.com`).
14. Worker → Settings → Variables and Secrets: add `POLICY_AUD` and `TEAM_DOMAIN` as plain environment variables. They are identifiers, not passwords. Redeploy if Cloudflare asks.
15. Open the generated `*.workers.dev` URL and verify login, dashboard, add/edit entry, loans, Bin, reports, offline ready and reconnect sync.

## Security change
The old ChatGPT-specific `oai-authenticated-user-*` headers are no longer used. A custom Worker entry validates Cloudflare Access's signed `Cf-Access-Jwt-Assertion` JWT against the team JWKS, issuer and application AUD; it then removes any browser-supplied owner headers, injects the verified owner email internally, and only then delegates to Vinext. This avoids the Static Assets limitation where `ctx.access` is unavailable to the user Worker. `/api/hisab` scopes all data to that server-injected owner key.

Logout: `/cdn-cgi/access/logout`.

## Important
Do not delete the old ChatGPT Sites app/database until the new version and data migration are verified. The source ZIP is code only. The normal JSON backup excludes Bin/deleted records and no complete historical restore is implemented yet.
