# JasimFlowX — Firebase Email/Password Auth Migration

## Goal

Trade Journal-এর মতো Email + Password login JasimFlowX-এ আনা, কিন্তু accounting data Cloudflare D1-এই রাখা।

## Source auth project

Existing Trade Journal Firebase project reuse করা হচ্ছে:

- Project ID: `trade-journal-26`
- Auth domain: `trade-journal-26.firebaseapp.com`
- Email/Password sign-in flow already used by Trade Journal

Firebase Web API key public client configuration; কোনো Firebase Admin private key repository-তে যোগ করা হয়নি।

## Target architecture

```text
Login page
  -> Firebase Email/Password verification
  -> Firebase ID token
  -> /api/auth/session
  -> Worker verifies Firebase signature/project claims
  -> signed HttpOnly JasimFlowX session cookie
  -> Worker maps account to owner key firebase:<uid>
  -> existing JasimFlowX API
  -> Cloudflare D1
```

## Why owner uses Firebase UID

Email নয়, Firebase UID D1 owner identity হবে। ফলে পরে Firebase account email পরিবর্তন করলেও existing হিসাব একই থাকবে।

Example:

```text
firebase:abc123...
```

## Security model

- Password browser থেকে সরাসরি Firebase Authentication API-তে যায়.
- JasimFlowX password store করে না.
- Firebase ID token server-side signature, issuer, audience, expiry দিয়ে verify হয়.
- JasimFlowX তারপর 7-day signed `HttpOnly`, `Secure`, `SameSite=Strict` session cookie দেয়.
- Cookie signing secret: Cloudflare runtime secret `AUTH_SESSION_SECRET`.
- Secret GitHub-এ রাখা যাবে না.

## Migration safety

Cloudflare Access fallback migration সময় রেখে দেওয়া হয়েছে। Firebase session না থাকলে existing Cloudflare Access identity এখনও কাজ করবে। তাই production cutover এক ধাপে করা হবে না।

## New files

- `lib/firebase-config.ts`
- `lib/firebase-server-auth.ts`
- `app/api/auth/session/route.ts`
- `components/firebase-login.tsx`
- `app/auth/page.tsx`
- `app/auth/auth.css`

## Modified files

- `worker.ts` — Firebase session first, Cloudflare Access fallback second
- `cloudflare-env.d.ts` — `AUTH_SESSION_SECRET`

## User action required before Firebase login test

1. Firebase Console খুলতে হবে — project `trade-journal-26`.
2. Authentication -> Sign-in method-এ Email/Password enabled আছে কিনা confirm করতে হবে.
3. Authentication -> Users-এ JasimFlowX ব্যবহারকারীর account থাকতে হবে. Target email: `freefirejr101@gmail.com`.
4. Account না থাকলে Firebase Console থেকে Add user করে user নিজের password set করবে. Password chat/GitHub-এ দেওয়া যাবে না.
5. Cloudflare Worker runtime secret হিসেবে `AUTH_SESSION_SECRET` add করতে হবে — minimum 32 random characters, preferably 48-64+ random characters.

## Data cutover

Firebase login test সফল হলে `/api/auth/session` account-এর UID / `ownerKey` দেখাতে পারবে। তারপর existing D1 owner (বর্তমানে যে Gmail owner-এ records আছে) থেকে `firebase:<uid>`-এ one-time owner transfer হবে.

Transfer-এর আগে:

- JasimFlowX Settings backup/export
- D1 Time Travel bookmark
- existing owner/new Firebase owner row check

Transfer-এর পরে:

- Dashboard balance
- all entries
- Due/loan
- preferences/categories
- Bin
- logout/relogin
- offline sync

সব verify না হওয়া পর্যন্ত Cloudflare Access disable/remove করা যাবে না.

## Final cutover

Firebase + D1 owner transfer verified হওয়ার পর:

1. Cloudflare Access gate retire/disable.
2. Unauthenticated `/` -> `/auth`.
3. Firebase session-protected app becomes primary production login.
4. Friend/new users Firebase Auth-এ separate UID পাবে; D1 data automatically owner-separated থাকবে.

## Current status

Implementation branch: `firebase-auth-migration`

Production `main` এখনও Cloudflare Access-based authentication ব্যবহার করছে। Firebase migration verified না হওয়া পর্যন্ত production auth intentionally unchanged থাকবে.
