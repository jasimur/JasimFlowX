# JasimFlowX — Cloudflare deployment notes

This branch is the standalone Cloudflare Workers + D1 version of JasimFlow.

## Security model

- Protect the entire Worker with **Cloudflare Access → All traffic**.
- The Worker validates the signed `Cf-Access-Jwt-Assertion` using your Access team JWKS, issuer and application AUD, then reads the verified email claim.
- Browser-supplied owner headers are deleted and replaced by the Worker before Vinext/Next.js handles the request.
- `/api/hisab` uses that server-injected identity as the database owner key.
- Logout uses `/cdn-cgi/access/logout`.

## One-time setup

1. Create a D1 database named `jasimflow-db`.
2. D1 database `jasimflow-db` is already bound in `wrangler.jsonc` using database ID `051db5a1-d93e-40b9-8d47-ee06df2e7aeb`.
3. Install dependencies: `npx pnpm@11.25.0 install --frozen-lockfile`.
4. Apply database migrations once: `npx pnpm@11.25.0 run db:migrate:remote`.
5. Build: `npx pnpm@11.25.0 run build`.
6. Deploy: `npx pnpm@11.25.0 run deploy`.
7. In the Worker dashboard, open **Access** and protect production + previews / **All traffic** with a policy that allows only the owner's account/email.
8. Copy the Access **Audience (AUD) tag** and Zero Trust team domain. In Worker Settings → Variables and Secrets add `POLICY_AUD=<aud>` and `TEAM_DOMAIN=https://<team>.cloudflareaccess.com`.
9. Re-open the app and verify the Access login succeeds.

Do not delete the old ChatGPT Sites deployment until the new Worker, D1 data, login, offline sync, Bin and totals have all been verified.

## Preserve dashboard runtime variables

The production Worker is `flow` and the existing D1 is `jasimflow` (binding `DB`).
`TEAM_DOMAIN` and `POLICY_AUD` must be set in Worker **Settings → Variables and Secrets**,
not only in Builds environment variables. The verified team domain is
`https://jasim-access.cloudflareaccess.com`. Use the existing Access application's
exact **Application Audience (AUD) Tag** for `POLICY_AUD`.

Keep `keep_vars: true` in `wrangler.jsonc`; the build must carry this into
`dist/server/wrangler.json`. The package deploy script also supplies `--keep-vars`.
Workers Builds should use:

```text
Build: pnpm run build
Deploy: npx wrangler deploy --config dist/server/wrangler.json --keep-vars
```

`JasimFlow Access configuration is incomplete` means at least one of these two
runtime values is absent or empty. Preservation does not recover an already
missing value: restore it in Worker Settings, then select Deploy. Do not change
the Access application, audience, owner policy or database to fix this error.

Successful build/deploy status alone does not verify application availability.
After restoring the values, verify that the owner can authenticate and load the
dashboard. Reference: https://developers.cloudflare.com/workers/wrangler/configuration/#source-of-truth
