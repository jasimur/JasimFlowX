# JasimFlowX — developer handoff

Current migration target: private GitHub `jasimur/JasimFlowX` → Cloudflare Workers + D1 + Cloudflare Access.

## Preserve
- Exact poisha accounting and existing ledger rules.
- Loans, partial payments, transfers, opening balances, reports and Bin semantics.
- Classic forest/ivory/gold UI.
- IndexedDB outbox, idempotent sync receipts, conflict behavior, PWA/offline shell.

## Standalone Cloudflare changes already prepared
- `worker.ts`: Cloudflare Access JWT gateway; validates `Cf-Access-Jwt-Assertion` with Cloudflare JWKS + issuer + AUD, strips untrusted owner headers, then sets internal owner/email headers from the verified email. This intentionally avoids `ctx.access` because Vinext/Vite uses Static Assets.
- `app/api/hisab/route.ts`: uses internal `x-jasimflow-owner` + `x-jasimflow-email` instead of ChatGPT Sites headers.
- `components/hisab-app.tsx`: logout uses `/cdn-cgi/access/logout`; re-authentication uses `/login`.
- `app/login/route.ts`: uncached route that Access can intercept, then redirects to `/` after login.
- `vite.config.ts`: removed Sites-specific plugin/config and uses standard Cloudflare Vite config resolution.
- `wrangler.jsonc`: Worker `jasimflow`, D1 binding `DB` already points at `jasimflow-db` ID `051db5a1-d93e-40b9-8d47-ee06df2e7aeb`, migration directory `drizzle`. Production also requires Worker variables `TEAM_DOMAIN` and `POLICY_AUD` after Access is created.
- Old Sites docs are retained as `LEGACY_*` for migration reference only.

## Deployment rule
Protect the Worker with Cloudflare Access **All traffic**. The application intentionally returns 403 when `ctx.access` is absent. Do not weaken this to a browser-provided owner ID.

## Database
Existing ordered migrations in `drizzle/` are unchanged. Apply once, in order, to a fresh D1. Do not replay on a populated DB.

## Legacy production
The old ChatGPT Sites deployment is the rollback/safety copy until the new Worker is fully verified. Data does not automatically transfer from the Sites-managed D1 to the new D1.
