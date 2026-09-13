# JasimFlowX — Pulse Ledger UI update

ভিত্তি: GitHub `main` commit `88e1538c11211b593ab029ae56de68f4d2eaef8b`।
লক্ষ্য: বারবার হিসাব রাখার কাজ আরও আনন্দদায়ক করা, দ্রুত এন্ট্রি বজায় রাখা।

## যা বদলেছে

- পুরো অ্যাপের dark navy theme, gold action, teal Cash In, coral Cash Out, পরিষ্কার border ও monospace টাকার সংখ্যা।
- Dashboard-এ বড় balance/status panel, বাস্তব হিসাব থেকে গত ৭ দিনের balance sparkline, Cash In / Cash Out / ঋণের সরাসরি বাটন।
- Cash flow chart ও category অনুযায়ী spending bars; খালি হিসাবের জন্য সৎ empty state।
- Quick Entry-তে selected category highlight, amount presets, account selector এবং পরের এন্ট্রির জন্য category/account ধরে রাখা।
- IndexedDB/server save acknowledgment-এর পর checkmark, compact success toast, ৪৫০ms pulse ও supported device-এ optional haptic। ফোনে সেভ হলে toast-এ Sync বাকি স্পষ্ট থাকে।
- Synchronous submit guard: দ্রুত দুবার চাপলেও একই form থেকে দ্বিতীয় save শুরু হয় না। Animation-এর জন্য কোনো অপেক্ষা রাখা হয়নি।
- Balance বদলালে digit transition; logo draw, ছোট page transition ও candlestick loader।
- Settings → শান্ত মোড: decoration বন্ধ করার device-local preference। OS reduced-motion preference-ও মানে। কোনো sound নেই।
- Transactions, debts, reports, Settings, Bin, dialogs ও mobile navigation-এ একই theme। Bin এখনও শুধু Settings-এর ভেতরে।
- PWA launch/background theme color মিলিয়ে দেওয়া হয়েছে; বিদ্যমান icon files রাখা হয়েছে।

## কোন ফাইলে কাজ করবে

| ফাইল | কাজ |
|---|---|
| `app/pulse-ledger.css` | নতুন theme, responsive layout ও animation; পুরোনো CSS-এর পরে load হয় |
| `components/pulse-ledger.tsx` | BalancePanel, RollingMoney, entryFeedback, CandleLoader, motion preference |
| `components/hisab-app.tsx` | Dashboard composition, category bars, chart colors, page direction, Settings integration |
| `components/quick-entry.tsx` | Save feedback, category feedback, submit guard |
| `app/layout.tsx` | নতুন stylesheet import, PWA theme color |
| `public/manifest.webmanifest` | PWA background/theme color |

## যা অপরিবর্তিত

`worker.ts`, `wrangler.jsonc`, authentication API, ledger/service arithmetic, D1 schema ও migrations, offline client/outbox, Service Worker, dependencies এবং lockfile। কোনো production financial record যোগ/বদল/মুছে দেওয়া হয়নি। Existing deploy command `--keep-vars` সহ ব্যবহার করতে হবে।

## যাচাই

- Production Vinext build + offline precache generation: PASS (17 assets)।
- Existing accounting/security checks: **39 PASS**।
- Existing offline/sync checks: **58 PASS**।
- UI/library/build-support TypeScript check: PASS।
- Full `tsc --noEmit`: আগের `worker.ts:84`-এর `Uint8Array<ArrayBufferLike>` বনাম `BufferSource` typing error এখনও আছে। এটি এই UI update-এর পরিবর্তন নয়; Worker code বদলানো হয়নি। Production build সফল হয়।
- Body/muted/income/expense/primary text token contrast: সবগুলোর ratio 4.5:1-এর বেশি (মূল token pairs যাচাই; সম্পূর্ণ accessibility audit নয়)।
- Browser screenshot ও interactive visual acceptance: এই environment-এর Cloud browser localhost ও local file preview খুলতে দেয়নি, তাই সম্পন্ন হয়নি। Android/iPhone hardware, vibration, keyboard, install ও production Access login নতুন করে যাচাই করা হয়নি।
- আগের >500 kB client chunk warning এখনও আছে; নতুন dependency যোগ করা হয়নি।

## Brief-এর যে অংশগুলো আলাদা রাখা হয়েছে

- Streak/milestone tracking আগে নেই, তাই বানানো streak/level-up badge দেখানো হয়নি।
- S/A/B/C/D budget grade-এর বদলে বিদ্যমান বাস্তব budget amount/progress রাখা হয়েছে; কোনো অঘোষিত grading formula যোগ করা হয়নি।
- Classic/Pulse theme switch ঐচ্ছিক ছিল; এই সংস্করণে Pulse default, সঙ্গে Quiet Mode। পুরোনো theme Git history-তে আছে।
- Blocking splash ও ক্রমাগত moving background যোগ করা হয়নি; logo/page motion দ্রুত ও non-blocking।
- Font stack-এ Space Grotesk, Hind Siliguri/Noto Sans Bengali এবং JetBrains Mono preference আছে, কিন্তু font files bundle/download করা হয়নি। Device-এর available font থেকে fallback নেয়। Offline চলার জন্য font CDN নির্ভরতা নেই।

## প্রকাশের পর ব্যবহার

একবার অনলাইনে app খোলো। সব pending entry sync শেষ হতে দাও। নতুন PWA assets install হলে পুরোনো app-এর সব tab/window বন্ধ করে আবার খোলো। Draft/pending data থাকা অবস্থায় browser storage clear করবে না।

এই update-এর জন্য database migration, নতুন environment variable বা Access configuration পরিবর্তন লাগবে না।
