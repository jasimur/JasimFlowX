import english from "./translations.json";
import { CATEGORY_BN, KIND_LABEL, type Kind } from "./ledger";

export type Language = "en" | "bn";
export const LANGUAGE_KEY = "jasimflow:language";
export const englishMessages: Readonly<Record<string, string>> = english;
export const banglaMessages: Readonly<Record<string, string>> = {
  "Language": "ভাষা", "App language": "অ্যাপের ভাষা",
  "Choose English or Bangla. Changes apply immediately and are remembered on this device, including offline.": "English বা বাংলা বেছে নাও। সঙ্গে সঙ্গে বদলাবে এবং এই ডিভাইসে মনে থাকবে, offline-এও।",
  "Language changed for this session. Your browser could not remember it for next time.": "এই সেশনে ভাষা বদলেছে। পরেরবারের জন্য ব্রাউজারে সেভ করা যায়নি।",
  "Dashboard": "এক নজরে", "MY WORKSPACE": "আমার কাজের জায়গা", "MAKE EVERY ENTRY COUNT.": "প্রতিটি হিসাব থাকুক যত্নে।",
  "Personal account": "ব্যক্তিগত অ্যাকাউন্ট", "Sign out": "সাইন আউট", "Offline": "অফলাইন", "Synced": "সিঙ্ক হয়েছে", "Private": "ব্যক্তিগত",
  "JASIMFLOW / PERSONAL": "JASIMFLOW / ব্যক্তিগত", "Cash In": "টাকা আসা", "Cash Out": "টাকা যাওয়া", "Export": "ডাউনলোড", "Restore": "ফেরাও",
  "PERIOD SUMMARY": "নির্বাচিত সময়ের সারাংশ", "PRIVATE BIN": "ব্যক্তিগত Bin", "Bin password": "Bin-এর password", "Transfer": "টাকা স্থানান্তর",
  "SPENDING MAP": "খরচের চিত্র", "QUICK ENTRY": "দ্রুত এন্ট্রি", "YOUR RHYTHM": "তোমার ছন্দ", "PERSONAL LEDGER": "ব্যক্তিগত খাতা", "KEEP YOUR FLOW": "নিজের ছন্দে থাকো",
  "Close": "বন্ধ করো", "Toggle Sidebar": "মেনু খোলো / বন্ধ করো", "More": "আরও", "Notifications": "বার্তা",
  "Favourite {0}": "{0} পছন্দের তালিকায়", "Saved: {0}": "{0} সেভ হয়েছে",
  "iPhone: Safari → Share → Add to Home Screen.": "iPhone: Safari → Share → Add to Home Screen।",
  "Invalid request": "অনুরোধ সঠিক নয়।", "Invalid origin": "অনুরোধের উৎস সঠিক নয়।", "Request too large": "অনুরোধটি অতিরিক্ত বড়।", "Unknown action": "কাজটি চেনা যায়নি।",
};

/** Exact UI messages only. Never use this on user names, notes or custom categories. */
export function translate(text: string, language: Language, values: readonly (string | number)[] = []): string {
  const template = language === "en" ? (englishMessages[text] ?? text) : (banglaMessages[text] ?? text);
  return template.replace(/\{(\d+)\}/g, (match, index) => values[Number(index)] === undefined ? match : String(values[Number(index)]));
}
export function localeFor(language: Language) { return language === "bn" ? "bn-BD" : "en-GB"; }
export function categoryName(value: string, language: Language) { return language === "bn" ? CATEGORY_BN[value] || value : value; }
export function kindName(kind: Kind, language: Language) { return translate(KIND_LABEL[kind] || kind, language); }
export function localizedDate(date: string, language: Language) { return new Intl.DateTimeFormat(localeFor(language), { day: "numeric", month: "short", timeZone: "Asia/Dhaka" }).format(new Date(date + "T12:00:00+06:00")); }
