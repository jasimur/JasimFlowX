# JasimFlow — personal accounts

A private, Bengali personal finance app for Jasim. Currency: BDT. Accounting dates and displayed timestamps use Bangladesh time (Asia/Dhaka). Weeks run Saturday–Friday.

## Product

- Quick cash entry with category tiles, favourite categories, numeric input, amount presets, optional notes and default account.
- Durable cash, income, expense, loan, receivable, credit purchase, opening balance and own-account transfer records.
- Person-level loan lists, separate debt records, partial settlement, history and paid status.
- Dashboard, period reports, category spending, monthly budget, search and CSV/JSON exports.
- Private Bin with restore, explicit permanent deletion, password change, lockout and session revocation.
- Responsive desktop/mobile navigation; no fabricated transactions or starting balances.

## Accounting invariants

`entries.amount` is an integer number of poisha. Only income is income. Borrowing and receivable collection increase cash but not income. Principal repayment and lending decrease cash but not ordinary expenses. Credit purchases increase expenses and debt without changing cash. Old debt/payables do not change cash. Opening balances affect cash, not income. Transfers move value between accounts without changing total cash, income or expenses.

A loan and its original cash effect are one record. Its repayment is one record linked with `parent_id`, so there is no duplicate cash entry to get out of sync. Atomic SQL guards reject overpayment, including concurrent requests. Root edits cannot reduce principal below active payments or move its date after them. Debt deletion soft-deletes its active settlements as one group; restoring the root restores that group. Independently deleted settlements stay deleted. Restoring a settlement cannot overpay an active loan. Deleting a loan permanently removes its deleted settlements too.

## Security and storage

Cloudflare Access protects the Worker. `worker.ts` obtains the authenticated email from `ctx.access`, deletes browser-supplied owner headers, and injects the verified owner internally before the application runs. All application queries enforce that owner key. No production fallback user exists. D1 stores the synchronized ledger. IndexedDB stores an owner-bound snapshot and durable outbox for the explicitly requested offline workflow. The Bin is checked by the server, and normal state/export endpoints exclude deleted entries and password data. Bin passwords use PBKDF2-SHA256 (100,000 iterations), random salt, rate limiting (five failures / five-minute lockout), constant-time digest comparison, and random expiring sessions. Session tokens are stored as hashes; the cookie is HttpOnly, Secure, SameSite=Strict and scoped to the API. Sessions expire after ten minutes and are revoked when leaving the Bin or changing its password. The app hides Bin data on tab visibility loss. There is no forgotten-password reset in this version. Passwords are configured by the user, never bundled in the source.

Database schema: `db/schema.ts`. Generated schema-only migrations: `drizzle/`. Prepared D1 queries and business rules: `lib/service.ts`. Pure arithmetic: `lib/ledger.ts`. API: `app/api/hisab/route.ts`.

## Verification

TypeScript check and production build pass. `tests/accounting.cjs` exercises exact money, ledger totals, transfers, old/credit debt, partial payments, idempotency, concurrent overpayment, linked edits, delete/restore/purge, owner isolation, secret exclusion, passwords, session revocation, brute-force lockout, calendar periods and index usage against SQLite using the production service functions.

To run the accounting checks, compile `lib/service.ts` and `lib/ledger.ts` as CommonJS into a scratch directory with TypeScript, then set `HISAB_TEST_BUILD` to that directory and run `node tests/accounting.cjs`. Use Node 22+ with `node:sqlite`.

Browser/visual QA and live WebMCP validation were not performed: this environment requires an explicit request for browser QA. A feature-detected `start_hisab_entry` WebMCP tool opens the same visible entry form without saving a record.

## Current limits

- Private app protected by Cloudflare Access; production access policy should allow only the owner.
- Exports contain active records and preferences. Bin content and secrets are excluded. JSON export is a backup file; import is not implemented.
- Monthly overall budget; category-specific budgets are not implemented.
- No automatic bank imports or notifications. Bin operations and preference changes require connectivity; ledger creation and editing work offline.
- All active records are loaded for this personal-size ledger; introduce server pagination/aggregation if the dataset becomes large.

For the standalone deployment, keep the D1 binding name `DB`, protect the Worker with Cloudflare Access, and preserve the existing offline/accounting contracts. The old ChatGPT Site remains only as a migration fallback until verification is complete.


## Offline update

The app is branded JasimFlow. Bin navigation is inside Settings only, with no Bin item in desktop or mobile navigation.

`public/jf-offline.js` is the shared page/worker synchronization engine. A successful IndexedDB transaction is required before acknowledging a local entry. A persistent outbox, stable entry/operation IDs, a cross-context lease and atomic server receipts make retries safe after response loss. The page renders the local snapshot immediately, then refreshes in the background. Read, create and edit workflows work offline after the authenticated first visit and successful app-shell installation. Pending rows and totals are marked. Bin/password/sign-in responses are never cached, and passwords are never queued. Bin operations, deletion and preference updates require online sync to finish first.

Edits send the precise version they were based on. The server checks that version in the atomic write. A receipt preserves the original acknowledged timestamp, so dependent offline edits cannot silently adopt another device's newer change after a lost response. Conflicts remain in the local outbox and stop later operations; the UI offers an explicit reviewed correction or local-discard confirmation and a device backup download. Sign-out refuses to clear an unsynchronized outbox. An expired or changed authenticated owner locks the local display and preserves pending work.

`public/sw.js` caches the data-free root shell plus built assets. `scripts/finalize-offline.mjs` generates an exact precache manifest after each build. Installation fails if any required asset is unavailable; an offline-ready indicator is shown only after successful installation. Old caches are retained for an already-open previous version. Workers never reload an open form for an update. Foreground sync runs after saves, reconnect, foregrounding and on a 30-second interval. Background Sync is registered where supported; otherwise a closed app syncs when next opened online. Browser storage can still be cleared by the device/user: a persistent-storage request and device backup export are provided, and the UI states this limit.

Verification: 39 original accounting/security checks plus 58 offline/sync checks, using production server and engine functions with SQLite and a transactional local-store double. Worker handlers are exercised with Cache/Fetch doubles for offline shell and API/auth exclusion. This is automated logic/runtime verification, not physical-phone or browser UI testing. Those remain unperformed under the environment's browser-QA restriction.

New schema-only migrations 0001 and 0002 add replay receipts; existing migration 0000 is unchanged. API responses now include the authenticated owner key for local-store isolation. Original entry and Site IDs are preserved.

Installation behavior references: https://web.dev/learn/pwa/installation and https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API .
