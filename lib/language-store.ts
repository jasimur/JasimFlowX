import { LANGUAGE_KEY, translate, kindName, type Language } from "./i18n";
let current: Language = "en";
let initialized = false;
const listeners = new Set<() => void>();
export const getLanguage = (): Language => typeof window === "undefined" ? "en" : current;
export const getServerLanguage = (): Language => "en";
function notify() { for (const listener of listeners) listener(); }
function storageChanged(event: StorageEvent) {
  if (event.key !== LANGUAGE_KEY && event.key !== null) return;
  current = event.newValue === "bn" ? "bn" : "en";
  notify();
}
export function subscribeLanguage(listener: () => void) {
  if (listeners.size === 0 && typeof window !== "undefined") window.addEventListener("storage", storageChanged);
  listeners.add(listener);
  return () => { listeners.delete(listener); if (!listeners.size && typeof window !== "undefined") window.removeEventListener("storage", storageChanged); };
}
export function initializeLanguage() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try { current = window.localStorage.getItem(LANGUAGE_KEY) === "bn" ? "bn" : "en"; } catch { current = "en"; }
  notify();
}
export function setLanguage(language: Language): boolean {
  current = language;
  let remembered = false;
  try { window.localStorage.setItem(LANGUAGE_KEY, language); remembered = true; } catch { /* The selection still works for this session. */ }
  notify();
  return remembered;
}
// Event handlers such as exports/toasts read the latest choice, without stale closures.
export const tCurrent = (text: string, values?: readonly (string | number)[]) => translate(text, getLanguage(), values);
export const kindLabelCurrent = (kind: Parameters<typeof kindName>[0]) => kindName(kind, getLanguage());
