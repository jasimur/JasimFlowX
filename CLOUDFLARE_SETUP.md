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
