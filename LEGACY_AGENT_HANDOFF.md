# JasimFlow — developer continuation handoff

Snapshot date: 2026-09-13. Read START_HERE_BN.md for the user-facing Bengali process.
This is a continuation of a working, deployed app. Preserve existing behavior and accepted theme.

## Canonical project and source

- Live: https://jasim-hisab.crypto-jasim.chatgpt.site
- Project: `appgprj_6aa6501a4fbc819187d99dd524667a0e`
- Snapshot version: 3
- Source SHA: `5f7f468fc8dbd4cbbf54f40eb60ec5ef585c0acc`
- Branch: `main`
- Source remote: `https://git.chatgpt-team.site/aa54766f-4673-43b6-8848-2ead0af53b78/appgprj_6aa6501a4fbc819187d99dd524667a0e.git`
- Original checkout: `/workspace/sites/jasim-hisab` (may not exist in the next environment).
- Verified owner-private. No shared viewers/groups at last inspection.
- Version ID: `appgprj_6aa6501a4fbc819187d99dd524667a0e~appgver_cb1e8054b4548191b02835bdff756981`
- Successful deployment: `appgdep_6aa68e83f6288191a2db04135d3b2726`

The archive contains byte-for-byte tracked files from the SHA above, plus three export-only
handoff files: START_HERE_BN.md, AGENT_HANDOFF.md and SOURCE_MANIFEST.json. It has no Git history,
node_modules, build outputs, real ledger database, secrets or browser data. The manifest hashes
cover tracked source only. No source changes or redeployment were made just to generate this handoff.
Obtain a fresh authorized credential through Sites to clone/push. Do not assume this ZIP is newer
than the canonical remote: inspect the latest Site/repository before modifying it.

## User intent

Jasim wants a personal Bengali daily ledger, BDT, Bangladesh time, very fast selectable entries,
loans with partial payments, useful reports and a password Bin. Bin is only inside Settings.
Accepted theme: forest-green navigation, ivory working surface, gold details, serif Latin wordmark.
Offline mobile use and automatic online sync are essential. Explain progress and use instructions in Bangla.

## Stack and file map

Node >=22.13.0; pnpm 11.25.0 with pnpm-lock.yaml; Vinext 1.0.0-beta.5, React 19.2.6,
Vite 8.0.13, Tailwind 4, existing Shadcn/Radix primitives, Recharts, D1 and Drizzle.
Keep the actual package.json/lockfile; do not install latest dependencies indiscriminately.

| File | Responsibility |
| --- | --- |
| `components/hisab-app.tsx` | Main working surface, dashboard, reports, debts, Settings/Bin, sync feedback, dialogs |
| `components/quick-entry.tsx` | Selectable quick forms, amount presets, categories, payments |
| `app/globals.css` | Shared tokens, responsive styles; final classic-ledger section is the accepted theme |
| `app/layout.tsx`, `public/manifest.webmanifest` | Branding, viewport, install metadata |
| `lib/ledger.ts` | Types, exact poisha arithmetic, categories, totals, periods |
| `lib/service.ts` | D1 business rules, owner scopes, Bin security, atomic payments and sync receipts |
| `app/api/hisab/route.ts` | Same-origin JSON API, trusted Sites auth, Bin cookie, action dispatch |
| `lib/database.ts` | `cloudflare:workers` env.DB access |
| `db/schema.ts`, `drizzle/` | Schema and ordered migrations |
| `lib/client-api.ts` | Cached reads, durable queued saves, network-only Bin/preferences operations |
| `public/jf-offline.js` | Shared page/SW IndexedDB engine, leases, outbox, retries, conflicts |
| `lib/offline-client.ts` | Typed engine wrapper, SW registration/readiness, install/backup/logout helpers |
| `public/sw.js` | Authenticated data-free app shell and built asset precache, background sync |
| `scripts/build-jasimflow.mjs` | Original framework build followed by offline finalization |
| `scripts/finalize-offline.mjs` | Hashes assets, writes `dist/client/sw-precache.js` |
| `build/sites-vite-plugin.ts` | Vendored Sites build support and portable-loopback mock auth |
| `tests/accounting.cjs`, `tests/offline.cjs` | Production-service/engine checks with SQLite and local-store doubles |
| `HISAB.md` | Detailed existing product/security/accounting notes |

## Accounting contracts — do not regress

Amounts are integer poisha. Never sum binary floating-point taka values or relabel stored units.
Only income entries count as income. Borrowing/collection increase cash but are not income.
Lending/principal repayment decrease cash but are not ordinary expenses. Credit purchase increases
expenses/payables without reducing cash. Old debts do not alter cash; opening balances are not income.
Transfers only move account balances. Dates use Asia/Dhaka; weeks are Saturday through Friday.

A loan's cash effect is on its root entry. Settlements reference parent_id and each affect cash once.
Atomic SQL guards reject concurrent overpayment. Principal edits cannot go below active payments;
root dates cannot follow existing settlements. Group trash/restore distinguishes linked deletions from
independently deleted settlements. Preserve IDs and the existing soft-delete/restore grouping semantics.

## Auth, database and Bin

Production route requires BOTH trusted Sites `oai-authenticated-user-id` and email headers. Every
query is owner-scoped. There is no anonymous/fallback production owner. Header trust is safe only behind
the existing trusted gateway, not on a naked external-host endpoint accepting arbitrary request headers.

Bin is server-password protected; PBKDF2-SHA256, salted hashes, five-failure/five-minute lockout,
short-lived hashed sessions and HttpOnly/Secure/SameSite Strict API cookie. Normal reads/exports never
include deleted data or password fields. Bin locks on leaving, tab hiding and timeout. Offline cache does
not contain Bin responses. Password reset for a forgotten password is not implemented.

Ordered existing migrations:
1. `0000_young_drax.sql` — original ledger/security schema.
2. `0001_brave_bullseye.sql` — sync_receipts.
3. `0002_vengeful_harpoon.sql` — original acknowledged entry timestamp in receipts.

All belong to the published source. Do not edit/replay them on an existing DB. Schema changes require new
reviewed migrations. Local first-time setup is documented separately and must keep `--local`.

## Offline guarantees and limits

- A completed IndexedDB transaction precedes save acknowledgment. Owner snapshot + outbox persist.
- Initial display reads local data immediately; queue projection marks pending rows and totals.
- Stable operation ID + immutable payload hash + atomic receipt prevent duplicate retries after response loss.
- Cross-context lease coordinates page, tabs and SW. Concurrently added queue work survives acknowledgment.
- Sequential dependent edits use the ORIGINAL server receipt timestamp, never a newer third-device timestamp.
- Version conflicts stop the queue and require reviewed correction or explicit local pending discard.
- Session expiry/account mismatch locks display without clearing pending work. Unsynced logout is refused.
- An acknowledged trash/preferences action updates local snapshot before refresh, so response-after-commit
  connection loss cannot leave deleted rows visible in cached data/backup.
- Worker install requires root plus every precached asset. No API, Bin, auth redirect or POST caching.
- Build wrapper must emit sw-precache.js; preserve the wrapper when changing hosting/build commands.
- Updates retain previous bundle for open tabs and never force-reload a draft.
- Foreground reconnect/visibility/30-second interval sync; background sync only if the browser supports it.
- Offline read/create/edit are supported; Bin/delete/preferences need network and a drained outbox.
- Storage persistence is requested, not guaranteed. Device/browser clearing can remove local data.
- Source ZIP != database export. Active JSON export != full DB/Bin backup. JSON IMPORT IS NOT IMPLEMENTED.

## Verification status

Before theme change: full TypeScript check, production build, 39 accounting/security checks and 58
offline/sync checks passed. The classic-theme change touched only CSS, chart styling and PWA theme colors;
its production build passed. Tests were not unnecessarily rerun for theme styling or this handoff.

Tests use real service functions against in-memory SQLite, production JS engine with a transactional
store double, and Worker handlers with Cache/Fetch doubles. They are NOT physical-phone or browser UI QA.
The managed environment permits browser QA only on explicit request; none was performed. No fresh Windows
install or external-provider deployment was performed. Build emits an existing >500 kB chunk warning.

## Next work

No mandatory migration is needed to use the current Site. Follow the next explicit user task.
Useful unresolved work: physical-device acceptance, validated JSON importer/restore, full export with
protected Bin handling, password recovery. External hosting is a separate port, not an upload-only task.

Before provider migration: sync all devices, obtain backups, plan ID and owner mapping, replace trusted
Sites auth with verified server sessions, port D1 SQL/atomic writes as needed, preserve outbox contracts,
validate totals/row counts/relationships. Never expose browser-supplied owner IDs as authorization.
The old origin's local database and pending queue do not magically move to the new domain.

## Delivery rules for the next agent

If continuing on Sites: read current Sites skills, select the original project, preserve private audience,
build, push exact commit, read full HEAD SHA after successful push, package build output, save/deploy and
poll terminal success. Do not use the source ZIP as a deployment artifact. No new project merely to update.
If Sites access is missing, say so and deliver reviewable code; do not claim production was changed.
If user chooses another host, adapt code in a separate migration branch and ship its provider config and
verified deployment steps. This archive has no ready-to-run Netlify/Firebase production configuration.
