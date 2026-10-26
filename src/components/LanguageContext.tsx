"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createTranslator, isLanguage, LANGUAGE_LOCALES, type MessageCatalog } from "@/lib/i18n/runtime";
import {
  DICTIONARY,
  LANGUAGES,
  LanguageCode,
  LanguageMeta,
  Translations,
} from "@/lib/i18n/translations";

export type { LanguageCode, LanguageMeta, Translations };
export { LANGUAGES };

interface LanguageContextType {
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  t: Translations;
  languages: LanguageMeta[];
  currentMeta: LanguageMeta;
  locale: string;
  translate: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "tr",
  setLang: () => {},
  t: DICTIONARY.tr,
  languages: LANGUAGES,
  currentMeta: LANGUAGES[0],
  locale: "tr-TR",
  translate: text => text,
});

const catalogs = new Map<LanguageCode, Promise<MessageCatalog>>();
function loadCatalog(lang: LanguageCode): Promise<MessageCatalog> {
  if (lang === "tr") return Promise.resolve({});
  if (!catalogs.has(lang)) catalogs.set(lang, fetch(`/i18n/${lang}.json?v=20261024-1`)
    .then(async response => {
      if (!response.ok) throw new Error("Language catalog unavailable");
      const value: unknown = await response.json();
      if (!value || Array.isArray(value) || typeof value !== "object"
        || Object.values(value).some(item => typeof item !== "string")) throw new Error("Invalid language catalog");
      return value as MessageCatalog;
    }).catch(error => { catalogs.delete(lang); throw error; }));
  return catalogs.get(lang)!;
}

export function LanguageProvider({ children, initialLanguage = "tr", initialCatalog = {} }: {
  children: ReactNode; initialLanguage?: LanguageCode; initialCatalog?: MessageCatalog;
}) {
  const pathname = usePathname();
  const [lang, setLangState] = useState<LanguageCode>(initialLanguage);
  const [catalog, setCatalog] = useState<MessageCatalog>(initialCatalog);
  const selection = useRef(0);

  const setLang = (next: LanguageCode) => {
    if (!isLanguage(next)) return;
    const request = ++selection.current;
    void loadCatalog(next).then(messages => {
      if (request !== selection.current) return;
      setCatalog(messages);
      setLangState(next);
      try { localStorage.setItem("rotazur_lang", next); } catch {}
    }).catch(() => { /* Keep the current complete language if its replacement cannot load. */ });
  };

  useEffect(() => {
    if (Object.keys(initialCatalog).length) catalogs.set(initialLanguage, Promise.resolve(initialCatalog));
    try {
      const saved = localStorage.getItem("rotazur_lang");
      if (isLanguage(saved) && saved !== initialLanguage) setLang(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    try { document.cookie = `rotazur_lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`; } catch {}
  }, [lang]);

  const currentMeta = LANGUAGES.find((m) => m.code === lang) || LANGUAGES[0];
  const translate = useMemo(() => createTranslator(catalog, lang), [catalog, lang]);
  const t = useMemo(() => Object.fromEntries(Object.entries(DICTIONARY.tr).map(([key, source]) =>
    [key, lang === "tr" ? source : catalog[source] || DICTIONARY[lang][key as keyof Translations]])) as unknown as Translations,
  [catalog, lang]);
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Rotazur — Bütçene Göre Akıllı Gezi & Rota Rehberi", "/plan": "Günlük Rota", "/discover": "Keşfet",
      "/offline": "Kayıtlı Rotalarım", "/about": "Hakkımızda & Misyonumuz — Rotazur",
      "/privacy": "Gizlilik & KVKK Politikası — Rotazur", "/terms": "Kullanım Şartları — Rotazur",
      "/contact": "İletişim & Destek", "/image-credits": "Şehir Görselleri ve Kaynaklar | Rotazur",
    };
    const source = titles[pathname] || titles["/"];
    document.title = translate(source) + (source.includes("Rotazur") ? "" : " | Rotazur");
  }, [pathname, translate]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages: LANGUAGES, currentMeta, locale: LANGUAGE_LOCALES[lang], translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
