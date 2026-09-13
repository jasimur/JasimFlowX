# JasimFlow — ব্যবহার, Hosting ও পরের Chat-এ কাজ চালানোর সম্পূর্ণ Guide

প্রস্তুত: ১৩ সেপ্টেম্বর ২০২৬। Source snapshot: classic premium theme-সহ প্রকাশিত version 3।

## ১. সবচেয়ে আগে যেটা জানা দরকার

**JasimFlow ইতিমধ্যেই অনলাইনে প্রকাশ করা আছে। এখন ব্যবহার শুরু করতে Firebase, Supabase বা Netlify-তে কিছু upload করতে হবে না।**

অ্যাপ: [JasimFlow খুলুন](https://jasim-hisab.crypto-jasim.chatgpt.site)

বর্তমান ব্যবস্থা:

| অংশ | এখন কোথায় আছে | তোমার করণীয় |
| --- | --- | --- |
| Website, API ও hosting | ChatGPT Sites; Cloudflare Worker runtime | উপরের link খুলবে |
| অনলাইনে sync হওয়া হিসাব | Sites-managed Cloudflare D1 database | একই ChatGPT account দিয়ে sign in করবে |
| ফোনের offline হিসাব | সেই browser/app-এর IndexedDB | একবার online প্রস্তুতি সম্পন্ন করবে |
| Offline app-এর HTML/CSS/JS | ফোনের Service Worker cache | Settings-এ ready দেখাবে |
| Source code | বর্তমান Site-এর Git repository; সঙ্গে ZIP copy দেওয়া হয়েছে | ZIP নিজের কাছে রাখবে / পরের chat-এ দেবে |
| Bin | Database-এ soft-deleted records; password দিয়ে server যাচাই করে | Settings → ব্যক্তিগত → Bin |

এই অ্যাপে এখন Firebase, Supabase বা Netlify account/API key ব্যবহার করা হচ্ছে না। D1 database নিজের Cloudflare dashboard-এ দেখা যাবে—এমন অনুমান করবে না; বর্তমান resource Sites পরিচালনা করে।

**Code backup এবং হিসাবের data backup আলাদা। Source ZIP-এ তোমার আসল cash, loan, payment, Bin records বা password নেই।**

## ২. এখনই ব্যবহার শুরু করার ধাপ

1. উপরের link অনলাইনে খোলো।
2. যে ChatGPT account দিয়ে এই Site তৈরি হয়েছে, সেই account দিয়ে sign in করো। Site বর্তমানে owner-private।
3. Settings খোলো। ফোনে JasimFlow অংশে **“Offline ব্যবহারের জন্য প্রস্তুত”** দেখানো পর্যন্ত অপেক্ষা করো। প্রয়োজন হলে “Offline প্রস্তুত করো” চাপো।
4. প্রথমবার নতুন খাতা হলে Settings থেকে প্রতিটি account-এর **শুরুর ব্যালেন্স** দাও। আগেই দেওয়া থাকলে আবার দেবে না।
5. Default account, পছন্দের category এবং চাইলে মাসিক budget সেট করো।
6. Bin-এর password আগে সেট করা থাকলে সেটিই ব্যবহার করবে। সেট করা না থাকলে Settings-এ অন্তত ৮ অক্ষরের password দাও।
7. Cash In / Cash Out / ঋণ বেছে amount ও category দিয়ে হিসাব যোগ করো।

ঋণ নিয়ে টাকা পেলে ঋণ entry ব্যবহার করবে। একই টাকা আবার income হিসেবে দিলে হিসাব দ্বিগুণ হবে। পরিশোধের জন্য সংশ্লিষ্ট ব্যক্তির ঋণ খুলে payment দেবে।

## ৩. মোবাইলে app হিসেবে রাখা

### Android

1. Browser-এ অনলাইনে JasimFlow খোলো এবং sign in করো।
2. Settings-এ offline ready নিশ্চিত করো।
3. অ্যাপের Install button পাওয়া গেলে চাপো। না পেলে browser menu থেকে **Install app / Add to Home screen** বেছে নাও।
4. Home screen-এর JasimFlow icon দিয়ে পরেরবার খোলো।

### iPhone

1. Safari-তে JasimFlow খোলো।
2. Sign in করে Settings-এ offline প্রস্তুতি সম্পন্ন করো।
3. Safari-এর Share menu → **Add to Home Screen** → Add।
4. Home screen icon থেকে খুলে একই খাতা ও offline-ready অবস্থা যাচাই করো; আবার sign in চাইলে করো।

Browser/OS অনুযায়ী install menu ও সমর্থন ভিন্ন হয়। এটি একটি PWA; এই ZIP কোনো Android APK বা iPhone IPA নয়। [PWA installation documentation](https://web.dev/learn/pwa/installation)

### Offline ও backup কীভাবে কাজ করে

- নতুন entry ও edit আগে ফোনে সেভ হয়; online হলে server-এ sync হয়।
- Dashboard ও report সেভ করা local data থেকে দেখা যায়। Pending entry থাকলে তার চিহ্ন ও সংখ্যা দেখা যায়।
- অ্যাপ খোলা থাকলে internet reconnect, app foreground হওয়া এবং interval-এ sync চেষ্টা হয়।
- বন্ধ app-এর background sync browser support-এর ওপর নির্ভরশীল; পরেরবার online খুললেও sync চেষ্টা হয়।
- Bin, delete, restore, permanent delete, password ও preferences-এর পরিবর্তনে internet প্রয়োজন।
- অন্য device-এ একই entry বদলালে conflict দেখায়; জোর করে silently overwrite করে না।
- এক ফোনের pending হিসাব অন্য ফোনে দেখাবে server-এ sync হওয়ার পরে।
- **Sync মানে server-এর বর্তমান হিসাব আপডেট করা; এটি আলাদা historical backup/version archive নয়।**
- Pending থাকা অবস্থায় browser data clear, app uninstall বা device reset করবে না।

## ৪. নিজের হিসাবের backup নেওয়া

Hosting পরিবর্তন বা অন্য chat-এ migration শুরু করার আগে:

1. ব্যবহৃত প্রতিটি device অনলাইনে খোলো।
2. Pending count 0 ও Synced দেখাও। Conflict থাকলে আগে যাচাই করে ঠিক করো।
3. Settings → হিসাব ডাউনলোড → **JSON ব্যাকআপ** এবং চাইলে CSV ডাউনলোড করো।
4. Settings → ফোনে JasimFlow → **ফোনের হিসাবসহ ব্যাকআপ** নাও; এতে local pending কাজও অন্তর্ভুক্ত হতে পারে।
5. ফাইলগুলো private জায়গায় রাখো। Coding ZIP-এর সঙ্গে নিজের ব্যক্তিগত হিসাব public repository-তে দেবে না।

| Export | কী কাজে লাগে | সীমা |
| --- | --- | --- |
| সাধারণ JSON (`HISAB_V1`) | Active entries ও preferences-এর structured copy | Bin ও secrets নেই; amount poisha-তে |
| CSV | Spreadsheet-এ দেখা | সম্পূর্ণ database restore format নয় |
| Device backup | ওই device-এর active হিসাব ও pending outbox সংরক্ষণ | Pending আর synced entry আলাদা করে বুঝে import করতে হবে |
| Source ZIP | Software-এর code অন্য chat-এ চালানো | আসল ব্যক্তিগত data নেই |

**বর্তমান app-এ JSON Import/Restore feature নেই।** Backup file থাকলেই upload করে আগের খাতা ফেরানো যাবে না; পরের agent-কে validated importer তৈরি করতে হবে। Bin-সহ পূর্ণ migration চাইলে অনুমোদিত database export আলাদাভাবে লাগবে। এই কাজের সঙ্গে database export করা হয়নি।

## ৫. এই package-এ কী আছে

`JasimFlow_Source_and_Handoff.zip` extract করলে `JasimFlow/` folder পাবে। তার মধ্যে:

- **START_HERE_BN.md** — এই পূর্ণ guide।
- **AGENT_HANDOFF.md** — পরের developer/AI-এর technical handoff।
- **SOURCE_MANIFEST.json** — exact source commit ও প্রতিটি source file-এর SHA-256।
- সম্পূর্ণ tracked application source, dependency lockfile, icons, server code, offline engine, tests ও database migrations।

`node_modules`, generated `dist`, local database, `.git` history, browser cache, tokens ও credentials দেওয়া হয়নি। Dependencies install এবং build করলে generated files আবার তৈরি হবে। `.openai/hosting.json` ZIP-এর ভেতরে আছে; কিছু file explorer-এ dot-prefixed folder লুকানো থাকতে পারে।

পুরোনো `README.md` starter-এর সাধারণ বিবরণ; সেখানে npm বা empty schema-এর পুরোনো reference আছে। এই project-এর জন্য START_HERE_BN.md, AGENT_HANDOFF.md, HISAB.md এবং বর্তমান package.json/schema-কে অগ্রাধিকার দেবে।

## ৬. অন্য Chat-এ কাজ চালানোর সবচেয়ে সহজ উপায়

1. একই ChatGPT account-এ একটি নতুন chat খোলো।
2. এই `.md` ও `JasimFlow_Source_and_Handoff.zip` upload করো। ZIP-এর ভেতরেও guide আছে।
3. Live app link দাও।
4. নিচের prompt copy করে দাও।
5. যে feature বা সমস্যা নিয়ে কাজ করতে চাও, শেষ লাইনে লিখে দাও।

### Copy-paste prompt

```text
We are continuing my existing Bengali personal accounting app JasimFlow.
Read START_HERE_BN.md, AGENT_HANDOFF.md, HISAB.md and the existing source first.
Do not restart, replace the architecture or redesign the accepted classic premium theme.

Live app: https://jasim-hisab.crypto-jasim.chatgpt.site
Existing Sites project_id: appgprj_6aa6501a4fbc819187d99dd524667a0e
Source snapshot commit: 5f7f468fc8dbd4cbbf54f40eb60ec5ef585c0acc
Published snapshot: version 3.

If Sites capabilities are available, resolve this exact existing Site and use its latest
source repository state. Reuse its project_id, private audience and database. The ZIP is
a point-in-time source backup; check for newer commits before editing. Never create a
replacement Site merely to update this app. Use fresh authorized source credentials;
no credentials are included in the ZIP.

If Sites access is unavailable, work from the ZIP and provide reviewable source changes.
Do not claim you deployed or connected to the existing production database.
Do not upload this unchanged code to Firebase/Netlify as if it were a static app.
An external-host migration needs an explicit target, authenticated backend adaptation,
data migration and owner-ID mapping.

Preserve fast entry, exact poisha accounting, loans and partial payments, password Bin
inside Settings, offline persistence, outbox retries, conflict checks and PWA behavior.
Never clear pending offline changes or replay old production migrations.
Current JSON export has no importer. The code ZIP does not include my financial data.

Explain in Bangla. Continue the existing project and finish the task I give below.
My next task: [এখানে পরের কাজ লিখব]
```

## ৭. একই Sites-এ পরের update প্রকাশ করার প্রক্রিয়া

এটি connected Sites tools থাকা agent-এর কাজ; তোমাকে আলাদা hosting account খুলতে হবে না।

1. Existing Site resolve করে owner/private audience ও latest version যাচাই করবে।
2. Existing checkout থাকলে সেটি ব্যবহার করবে। না থাকলে একই project-এর authorized Git credential নিয়ে source clone করবে।
3. `.openai/hosting.json`-এর project ID অপরিবর্তিত রাখবে। New Site তৈরি করবে না।
4. Project-এর execution profile configure করবে; existing pnpm lockfile রেখে প্রয়োজন হলে dependencies install করবে।
5. Requested change করবে। হিসাব/database না বদলালে migration বানানোর প্রয়োজন নেই।
6. Production build করবে। Build wrapper শেষে offline precache manifest তৈরি হওয়া জরুরি।
7. Schema বদলালে নতুন migration generate ও inspect করবে; আগের migrations edit/replay করবে না।
8. Exact source commit করে existing Site source branch-এ push করবে। Successful push-এর পরে full HEAD SHA নেবে।
9. সেই source-এর সফল build output package করবে; source ZIP deployment artifact নয়।
10. Native Sites save-version ও private-deploy flow ব্যবহার করবে। Server নতুন pending migrations প্রয়োগ করবে।
11. Deployment status **succeeded** এবং returned URL পাওয়ার পরে update complete বলবে।
12. Phone-এ online খুলে update download হতে দেবে। পুরোনো theme থাকলে কিছুক্ষণ পরে app বন্ধ করে আবার খোলো; unsynced data clear করবে না।

বর্তমান authentication ও database wiring Sites করে। `.openai/hosting.json`-এ বাস্তব database credentials বসানো লাগবে না।

## ৮. নিজের PC-তে source চালানো — developer-এর জন্য

এই অংশ **local development**; এর commands production-এ data upload করে না। নতুন PC-তে পুরো flow পরীক্ষা করা হয়নি।

### প্রয়োজন

- Project অনুযায়ী Node.js **22.13.0 বা বেশি**; `node:sqlite`-সহ compatible Node দরকার tests-এর জন্য।
- Project-pinned **pnpm 11.25.0**; `pnpm-lock.yaml` রাখবে।
- Internet: প্রথম dependency install-এর জন্য।
- ZIP extract করে terminal-এর current folder হবে `JasimFlow`।

### Install ও build

```sh
node --version
npx pnpm@11.25.0 install --frozen-lockfile
npx pnpm@11.25.0 run build
```

Dependency error হলে error অনুযায়ী fix করতে হবে; অকারণে lockfile delete বা সব package latest-এ upgrade করবে না। Existing `install:ci` script managed Linux-এর Bash tools ব্যবহার করে; native Windows-এ উপরের pnpm install পথ ব্যবহার করবে। Clean source copy profile file ছাড়া portable mode নেয়।

### নতুন local database তৈরি

প্রথম build `dist/server/wrangler.json` তৈরি করে। সম্পূর্ণ নতুন local database-এ নিচের **তিনটি migration ক্রমানুসারে একবার** চালাবে:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_young_drax.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_brave_bullseye.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_vengeful_harpoon.sql
```

আগেই apply করা থাকলে repeat করবে না। এখানে `--remote` ব্যবহার করবে না। Local DB-তে নিজের online খাতা থাকবে না; সেটি আলাদা test database। Wrangler-এর `--local` ও `--remote`-এর পার্থক্য [official D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/)-এ আছে।

### Development server

```sh
npx pnpm@11.25.0 run dev
```

সাধারণ portable mode-এ terminal-এ দেখানো localhost URL খোলো, সাধারণত `http://localhost:5173`। প্রয়োজন হলে `/signin-with-chatgpt?return_to=/` খোলো। Development plugin loopback-এ `local_seedy` test identity দেয়। এটি তোমার real ChatGPT account বা production authentication নয়; UI-তে Jasim লেখা থাকলেও local data আলাদা।

`pnpm start` built Worker চালায়, কিন্তু local mock sign-in দেয় না। তাই সেটি দিয়ে একা complete auth/offline acceptance test হবে—এমন ধরে নেবে না। Dev server-এ generated precache file নাও থাকতে পারে; PWA acceptance test secure production-like environment-এ করবে। ফোন থেকে PC-এর LAN IP ব্যবহার করলে loopback-only mock login কাজ করবে না।

### Automated tests

Project root থেকে compile করো:

```sh
node node_modules/typescript/bin/tsc lib/service.ts lib/ledger.ts --outDir .sites-runtime/hisab-tests --module commonjs --target ES2022 --skipLibCheck --types @cloudflare/workers-types,node --esModuleInterop --incremental false
node -e "require('node:fs').writeFileSync('.sites-runtime/hisab-tests/package.json', JSON.stringify({type:'commonjs'}))"
```

Windows PowerShell:

```powershell
$env:HISAB_TEST_BUILD = (Resolve-Path .sites-runtime/hisab-tests).Path
node tests/accounting.cjs
node tests/offline.cjs
node node_modules/typescript/bin/tsc --noEmit
```

macOS/Linux shell:

```sh
HISAB_TEST_BUILD="$PWD/.sites-runtime/hisab-tests" node tests/accounting.cjs
HISAB_TEST_BUILD="$PWD/.sites-runtime/hisab-tests" node tests/offline.cjs
node node_modules/typescript/bin/tsc --noEmit
```

রেকর্ড করা ফল: 39 accounting/security checks + 58 offline/sync checks পাস। Classic-theme update-এর production build-ও পাস। Browser UI, physical phone ও নতুন PC setup সরাসরি পরীক্ষা করা হয়নি। এই handoff তৈরির সময় পুরোনো পরীক্ষাগুলো নতুন করে চালানো হয়নি।

## ৯. নিজের Firebase / Supabase / Netlify account ব্যবহার করতে চাইলে

এটি আলাদা **hosting migration task**। বর্তমান source drag-and-drop করলেই সম্পূর্ণ app চলবে না। Code inspection অনুযায়ী backend সরাসরি `cloudflare:workers`-এর D1 binding ও Sites-supplied identity headers ব্যবহার করে।

| পথ | কী কোথায় থাকবে | এই source-এর কী বদলাতে হবে |
| --- | --- | --- |
| বর্তমান Sites | UI + API + managed D1 + Sites sign-in | এখনই প্রস্তুত; migration দরকার নেই |
| নিজের Cloudflare Workers + D1 | Worker-এ UI/API, D1-তে হিসাব | নিজের deployment config, verified login, owner mapping, data migration |
| Netlify + Supabase | Netlify-তে frontend/API runtime; Supabase-এ Postgres/Auth | Runtime port, D1 queries/atomic writes-কে Postgres-এ রূপান্তর, verified auth, policies, data importer |
| Firebase | Hosting-এর সঙ্গে উপযুক্ত server runtime ও Auth/database | Runtime/auth/database adapter; শুধু Hosting-এ frontend upload যথেষ্ট নয় |

Netlify Functions server-side কাজ চালাতে পারে; Supabase database Postgres ব্যবহার করে। Firebase Hosting dynamic requests Functions বা Cloud Run-এ পাঠাতে পারে। এগুলো platform capability; JasimFlow-তে এই integrations এখনো তৈরি হয়নি। [Netlify Functions](https://docs.netlify.com/build/functions/overview/), [Supabase database](https://supabase.com/docs/guides/database/overview), [Firebase Hosting rewrites](https://firebase.google.com/docs/hosting/full-config)

### অন্য hosting-এ নেওয়ার সঠিক কাজের ক্রম

1. **Target নির্বাচন:** বর্তমান runtime-এর সঙ্গে মিল দেখে নিজের Cloudflare Workers+D1 পথে backend পরিবর্তন তুলনামূলক কম হতে পারে—এটি code inspection-ভিত্তিক মূল্যায়ন। আগে থেকেই থাকা accounts ব্যবহার করতে চাইলে Netlify+Supabase বা Firebase পথও সম্ভব, তবে backend adaptation বেশি।
2. **আসল data backup:** প্রতিটি device sync করো; JSON/device backup নাও। Bin-সহ পূর্ণ data লাগলে authorized database export-এর ব্যবস্থা করো।
3. **আলাদা migration branch/copy:** Live working Site অক্ষত রেখে port করবে। GitHub চাইলে private source repository হিসেবে ব্যবহার করবে; GitHub একা app database নয়।
4. **নতুন environment:** নির্বাচিত provider-এ app, database ও authentication configure করবে। Auth redirect URL এবং owner-only access নির্ধারণ করবে।
5. **Server authentication port:** Sites-এর `oai-authenticated-user-*` headers বাইরের caller-এর পাঠানো অবস্থায় বিশ্বাস করবে না। নতুন provider-এর signed session/token server-এ verify করে owner বের করবে। Browser থেকে owner ID পাঠিয়ে authorization করা যাবে না।
6. **Database/API port:** `/api/hisab` contract ও poisha amount অক্ষত রাখবে। PostgreSQL/Firestore নিলে SQLite `changes()`-ভিত্তিক atomic guards সরাসরি copy না করে transaction/concurrency rules নতুন করে implement করবে।
7. **Data importer:** Existing entry IDs, parent-child loan relationships, soft-delete groups, date, preferences ও old-owner → new-owner mapping সংরক্ষণ করবে। Active JSON-এ Bin নেই। সব session cookie/token invalidate করে প্রয়োজন হলে Bin password পুনরায় সেট করবে।
8. **Offline identity transition:** পুরোনো origin-এর IndexedDB নতুন domain-এ চলে আসে না। পুরোনো pending outbox sync/resolve করে তারপর নতুন app প্রস্তুত করবে। Already-synced data ও pending operations দুবার import করবে না।
9. **নতুন host-এ deploy:** Provider-specific config/commands agent তৈরি করবে, build করবে, DB migration দেবে, auth secrets provider environment-এ বসাবে, তারপর deploy করবে। এই package-এ ready-made Firebase/Netlify production config নেই।
10. **Verify:** Login/access restriction, totals, loan payments, Bin restore, offline/reconnect, duplicate prevention এবং exported/imported row counts মিলিয়ে দেখবে।
11. **Switch:** পুরোনো ও নতুন totals মেলার পরে নতুন URL ব্যবহার করবে। নতুন origin-এ PWA আবার install/prepare করবে।
12. **পুরোনো Site:** Verified migration ও data recovery নিশ্চিত হওয়ার আগে পুরোনো Site/database মুছবে না।

Existing Sites database-এ নিজের Cloudflare login দিয়ে সরাসরি `wrangler --remote` চালিয়ে data পাওয়া যাবে—এমন ধরে নেবে না। Resource access আলাদাভাবে নিশ্চিত করতে হবে। সাধারণ JSON export-এর সীমা মাথায় রেখে পূর্ণ migration পরিকল্পনা করবে।

## ১০. বর্তমান feature status ও বাকি কাজ

### সম্পন্ন

- Cash In / Cash Out; category tiles, amount presets, favourites, default account।
- Borrow/lend/credit/old debt, partial repayment/collection ও ব্যক্তি-ভিত্তিক বাকি।
- Opening balance, own-account transfer, dashboard, weekly/monthly/yearly/custom reports।
- Budget, search/filter, CSV/JSON export।
- Settings-এর ভেতর password-protected Bin; restore ও permanent delete।
- Offline read/create/edit, durable outbox, reconnect sync, conflict correction ও PWA shell।
- JasimFlow branding এবং accepted classic forest/ivory/gold theme।

### এখনো করা হয়নি / পরের কাজ হিসেবে নেওয়া যায়

- বাস্তব Android/iPhone-এ offline, reinstall, reconnect ও update-এর acceptance test।
- JSON import/restore এবং Bin-সহ সম্পূর্ণ migration/export flow।
- Forgotten Bin password recovery।
- External hosting/auth/database port।
- Scheduled historical backups, bank auto-import, push notification।

মূল app ব্যবহার করার জন্য external hosting migration বাধ্যতামূলক নয়। পরের practical কাজ হতে পারে নিজের ফোনে acceptance test এবং validated backup-restore feature।

## ১১. পরের agent-এর জন্য exact identity

```text
App: JasimFlow
Live URL: https://jasim-hisab.crypto-jasim.chatgpt.site
Project ID: appgprj_6aa6501a4fbc819187d99dd524667a0e
Published version: 3
Version ID: appgprj_6aa6501a4fbc819187d99dd524667a0e~appgver_cb1e8054b4548191b02835bdff756981
Deployment ID: appgdep_6aa68e83f6288191a2db04135d3b2726
Last verified deployment status: succeeded
Source commit: 5f7f468fc8dbd4cbbf54f40eb60ec5ef585c0acc
Source branch: main
Original checkout: /workspace/sites/jasim-hisab
```

এই path নতুন chat-এ থাকবে—এমন নিশ্চয়তা নেই। ZIP অথবা authorized source clone ব্যবহার করবে। IDs opaque; এগুলো বদলে অন্য Site বানাবে না। Account token, source write credential বা database secret এই document-এ নেই।
