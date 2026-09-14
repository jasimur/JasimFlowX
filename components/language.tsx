"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Languages } from "lucide-react";
import { categoryName, kindName, localeFor, localizedDate, translate, type Language } from "@/lib/i18n";
import { getLanguage, getServerLanguage, initializeLanguage, setLanguage, subscribeLanguage } from "@/lib/language-store";

export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, getServerLanguage);
  useEffect(initializeLanguage, []);
  return useMemo(() => ({
    language, locale: localeFor(language), setLanguage,
    t: (text: string, values?: readonly (string | number)[]) => translate(text, language, values),
    dateLabel: (date: string) => localizedDate(date, language),
    kindLabel: (kind: Parameters<typeof kindName>[0]) => kindName(kind, language),
    categoryLabel: (value: string) => categoryName(value, language),
  }), [language]);
}
export function LanguageDocument() {
  const { language } = useLanguage();
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "bn" ? "JasimFlow — আমার হিসাব" : "JasimFlow — My ledger";
  }, [language]);
  return null;
}
export function LanguageSetting() {
  const { language, t, setLanguage } = useLanguage();
  const [notRemembered, setNotRemembered] = useState(false);
  return <section className="panel language-settings">
    <div className="section-heading"><h2><Languages size={20}/> {t("App language")}</h2></div>
    <p className="field-hint">{t("Choose English or Bangla. Changes apply immediately and are remembered on this device, including offline.")}</p>
    <fieldset className="language-options"><legend className="sr-only">{t("Language")}</legend>
      {([{value:"en",label:"English"},{value:"bn",label:"বাংলা"}] as const).map(option => <label key={option.value} className={language === option.value ? "selected" : ""}>
        <input type="radio" name="app-language" value={option.value} checked={language === option.value} onChange={() => setNotRemembered(!setLanguage(option.value as Language))}/>
        <span lang={option.value}>{option.label}</span>
      </label>)}
    </fieldset>
    {notRemembered && <p role="status" className="field-hint">{t("Language changed for this session. Your browser could not remember it for next time.")}</p>}
  </section>;
}
